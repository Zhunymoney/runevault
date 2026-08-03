import { NextResponse } from "next/server";
import { durableRateLimit, requestIp, requireOrderOwner, safeGetOrderByReference, supabaseUrl, userHeaders } from "@/lib/launch-server";
import { createCryptoQuote } from "@/lib/crypto-quote";
import { sendOrderEmail, siteUrl } from "@/lib/transactional-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await durableRateLimit(`crypto-config:${requestIp(request)}`, 10);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    reference?: unknown;
  } | null;

  const reference =
    typeof body?.reference === "string"
      ? body.reference.trim().toUpperCase()
      : "";

  if (!reference) {
    return NextResponse.json(
      { error: "Order reference required." },
      { status: 400 },
    );
  }

  const order = await safeGetOrderByReference(
    reference,
    request.headers.get("authorization"),
  );
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    await requireOrderOwner(request, order);
  } catch (reason) {
    if (reason instanceof Response) return reason;
    throw reason;
  }

  const btcAddress = process.env.CRYPTO_BTC_ADDRESS?.trim() ?? "";
  const usdcAddress = process.env.CRYPTO_USDC_ADDRESS?.trim() ?? "";
  const usdcNetwork = process.env.CRYPTO_USDC_NETWORK?.trim() || "Base";

  const methods: Array<{
    id: "btc" | "usdc";
    name: string;
    network: string;
    address: string;
    amount: string;
    usdRate: string;
    expiresAt: string;
    quoteToken: string;
  }> = [];

  try {
    if (btcAddress) {
      const quote = await createCryptoQuote(reference, "btc", Number(order.total_price));
      methods.push({
        id: "btc",
        name: "Bitcoin",
        network: "Bitcoin",
        address: btcAddress,
        amount: quote.cryptoAmount,
        usdRate: quote.usdRate,
        expiresAt: quote.expiresAt,
        quoteToken: quote.token,
      });
    }

    if (usdcAddress) {
      const quote = await createCryptoQuote(reference, "usdc", Number(order.total_price));
      methods.push({
        id: "usdc",
        name: "USDC",
        network: usdcNetwork,
        address: usdcAddress,
        amount: quote.cryptoAmount,
        usdRate: quote.usdRate,
        expiresAt: quote.expiresAt,
        quoteToken: quote.token,
      });
    }
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : "Crypto pricing is temporarily unavailable." },
      { status: 502 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const sessionResponse = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: userHeaders(authorization), cache: "no-store" });
  if (!sessionResponse.ok) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  if (methods.length === 0) {
    console.error(
      "Crypto configuration missing: CRYPTO_BTC_ADDRESS and CRYPTO_USDC_ADDRESS are not available.",
    );

    return NextResponse.json(
      {
        error:
          "Crypto payment addresses are not configured on this deployment.",
      },
      { status: 503 },
    );
  }

  const session = await sessionResponse.json().catch(() => ({})) as { id?: string; email?: string };
  await sendOrderEmail({
    eventKey: `payment_instructions:${order.id}:${session.email ?? session.id ?? "unknown"}`,
    eventType: "payment_instructions", recipient: session.email, userId: session.id, orderId: order.id,
    payload: { template: "payment_instructions", input: { reference: order.reference, status: "Awaiting payment", summary: Object.fromEntries(methods.map(method => [method.name, `${method.amount} ${method.id.toUpperCase()} on ${method.network} to ${method.address} (expires ${new Date(method.expiresAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC)`])), actionUrl: siteUrl(`/pay/${encodeURIComponent(order.reference)}`), actionLabel: "View payment instructions" } },
  });

  return NextResponse.json(
    {
      reference,
      methods,
      warning:
        "Send only the selected asset on the stated network. Crypto orders remain under manual review until receipt is verified.",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
