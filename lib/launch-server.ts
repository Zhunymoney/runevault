import { createHmac, timingSafeEqual } from "node:crypto";

type SupabaseOrder = {
  id: string;
  user_id: string;
  reference: string;
  order_type: "buy" | "sell";
  amount_m: number;
  total_price: number;
  delivery_name: string | null;
  status: string;
};

type SupabaseUser = { id: string; email?: string };

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ??
    "http://localhost:3000"
  );
}

export function serviceHeaders() {
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceKey,
    ...(serviceKey.startsWith("sb_secret_")
      ? {}
      : { Authorization: `Bearer ${serviceKey}` }),
    "Content-Type": "application/json",
  };
}

export async function requireOrderOwner(request: Request, order: SupabaseOrder) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Response("Authentication required.", { status: 401 });

  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Response("Invalid or expired session.", { status: 401 });
  const user = (await response.json()) as SupabaseUser;
  if (user.id !== order.user_id) throw new Response("Order access denied.", { status: 403 });
  return user;
}

export function supabaseUrl() {
  return required("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
}

export async function getOrderByReference(
  reference: string,
  authorization?: string | null,
) {
  const url = new URL(`${supabaseUrl()}/rest/v1/orders`);
  url.searchParams.set("reference", `eq.${reference}`);
  url.searchParams.set(
    "select",
    "id,user_id,reference,order_type,amount_m,total_price,delivery_name,status",
  );
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: authorization
      ? {
          apikey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
          Authorization: authorization,
          "Content-Type": "application/json",
        }
      : serviceHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Order lookup failed (${response.status}).`);
  }

  const rows = (await response.json()) as SupabaseOrder[];
  return rows[0] ?? null;
}

export async function updateOrder(
  id: string,
  values: Record<string, unknown>,
) {
  const url = new URL(`${supabaseUrl()}/rest/v1/orders`);
  url.searchParams.set("id", `eq.${id}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...serviceHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(`Order update failed (${response.status}).`);
  }
}

export async function getUserEmail(userId: string) {
  const response = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { headers: serviceHeaders(), cache: "no-store" },
  );

  if (!response.ok) return null;
  const user = (await response.json()) as { email?: string };
  return user.email ?? null;
}

export function riskScore(order: {
  amount_m: number;
  total_price: number;
  delivery_name: string | null;
}) {
  let score = 0;
  const reasons: string[] = [];

  if (order.total_price >= 500) {
    score += 45;
    reasons.push("high dollar value");
  } else if (order.total_price >= 200) {
    score += 25;
    reasons.push("elevated dollar value");
  }

  if (order.amount_m >= 2500) {
    score += 30;
    reasons.push("large gold amount");
  } else if (order.amount_m >= 1000) {
    score += 15;
    reasons.push("elevated gold amount");
  }

  const name = order.delivery_name?.trim() ?? "";
  if (name.length < 1) {
    score += 20;
    reasons.push("missing OSRS name");
  } else if (name.length < 3) {
    score += 10;
    reasons.push("very short OSRS name");
  }

  return {
    score: Math.min(score, 100),
    level: score >= 60 ? "high" : score >= 30 ? "medium" : "low",
    reasons,
  };
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
) {
  const parts = signatureHeader.split(",");
  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return signatures.some((signature) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

export function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function sendDiscord(
  title: string,
  fields: Array<{ name: string; value: string; inline?: boolean }>,
) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "RuneVault Operations",
      embeds: [
        {
          title,
          color: 0xf6c344,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  });
}
