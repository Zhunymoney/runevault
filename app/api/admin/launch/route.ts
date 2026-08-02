import { NextResponse } from "next/server";
import { requirePermission, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

type State = "ready" | "configured" | "needs_configuration" | "failed";
type LaunchCheck = { id: string; label: string; state: State; detail: string; external?: boolean };

const present = (name: string) => Boolean(process.env[name]?.trim());

function configurationChecks(): LaunchCheck[] {
  const supabase = present("NEXT_PUBLIC_SUPABASE_URL") && present("NEXT_PUBLIC_SUPABASE_ANON_KEY") && present("SUPABASE_SERVICE_ROLE_KEY");
  const stripe = present("STRIPE_SECRET_KEY") && present("STRIPE_WEBHOOK_SECRET");
  const crypto = present("CRYPTO_BTC_ADDRESS") && present("CRYPTO_USDC_ADDRESS") && present("CRYPTO_USDC_NETWORK");
  const email = present("RESEND_API_KEY") && present("RESEND_FROM_EMAIL");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  const customDomain = Boolean(siteUrl && !siteUrl.includes("vercel.app") && !siteUrl.includes("localhost"));
  return [
    { id: "authentication", label: "Authentication", state: supabase ? "configured" : "failed", detail: supabase ? "Supabase Auth variables are present." : "Supabase Auth configuration is incomplete." },
    { id: "supabase", label: "Supabase", state: supabase ? "configured" : "failed", detail: supabase ? "Public and server database credentials are present." : "Required database credentials are missing." },
    { id: "api", label: "API", state: "ready", detail: "Production API routes are deployed with validation and authorization." },
    { id: "payments", label: "Payments", state: stripe && crypto ? "configured" : crypto ? "needs_configuration" : "failed", detail: stripe && crypto ? "Card and crypto configuration is present." : crypto ? "Crypto is configured; Stripe remains owner-controlled." : "Payment destination configuration is incomplete.", external: true },
    { id: "webhooks", label: "Webhooks", state: stripe ? "configured" : "needs_configuration", detail: stripe ? "Stripe webhook credentials are present." : "Configure the live Stripe webhook after merchant approval.", external: true },
    { id: "email", label: "Email", state: email ? "configured" : "needs_configuration", detail: email ? "Resend application email variables are present." : "Pending a verified sending domain and provider credentials.", external: true },
    { id: "domain", label: "Custom domain", state: customDomain ? "configured" : "needs_configuration", detail: customDomain ? "A custom canonical production URL is configured." : "The Vercel URL works; connect the custom domain after purchase.", external: true },
    { id: "fraud", label: "Fraud review", state: "ready", detail: "Manual review queues and authorization controls are implemented." },
    { id: "monitoring", label: "Monitoring", state: present("SENTRY_DSN") ? "configured" : "needs_configuration", detail: present("SENTRY_DSN") ? "Error-monitoring configuration is present." : "Connect an external uptime/error-monitoring account.", external: true },
  ];
}

async function probe(label: string, url: string, acceptable: number[] = [200]) {
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return { label, passed: acceptable.includes(response.status), status: response.status, durationMs: Date.now() - started };
  } catch (reason) {
    return { label, passed: false, status: 0, durationMs: Date.now() - started, detail: reason instanceof Error ? reason.message : "Request failed." };
  }
}

function denied(reason: unknown) {
  if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Admin access denied." }, { status: reason.status });
  console.error("Launch diagnostics failed", reason);
  return NextResponse.json({ error: "Launch diagnostics could not be completed." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "audit.read");
    return NextResponse.json({ checks: configurationChecks(), generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) { return denied(reason); }
}

export async function POST(request: Request) {
  try {
    await requirePermission(request, "audit.read");
    const origin = new URL(request.url).origin;
    const probes = await Promise.all([
      probe("Homepage", `${origin}/`),
      probe("Live pricing", `${origin}/api/pricing/config`),
      probe("Marketplace", `${origin}/api/marketplace`),
      probe("Order API authorization", `${origin}/api/orders/create`, [401, 405]),
      probe("Admin API authorization", `${origin}/api/admin/orders`, [401]),
      probe("Payment API authorization", `${origin}/api/payments/crypto/config`, [401, 405]),
    ]);
    const databaseStarted = Date.now();
    const databaseResponse = await fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=id,updated_at&limit=1`, { headers: serviceHeaders(), cache: "no-store", signal: AbortSignal.timeout(10_000) });
    probes.push({ label: "Supabase database", passed: databaseResponse.ok, status: databaseResponse.status, durationMs: Date.now() - databaseStarted });
    return NextResponse.json({ checks: configurationChecks(), probes, passed: probes.every((item) => item.passed), generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) { return denied(reason); }
}
