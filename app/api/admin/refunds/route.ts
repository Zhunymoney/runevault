import { NextResponse } from "next/server";
import { durableRateLimit, requestIp, requirePermission, serviceHeaders, supabaseUrl } from "@/lib/launch-server";
import { sendOrderEmail, siteUrl } from "@/lib/transactional-email";

const uuid = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const limit = await durableRateLimit(`admin-refund:${requestIp(request)}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many refund attempts." }, { status: 429 });
  try {
    const admin = await requirePermission(request, "orders.update");
    if (admin.adminRole === "fulfillment") return NextResponse.json({ error: "Fulfillment staff cannot authorize refunds." }, { status: 403 });
    const body = await request.json().catch(() => null) as { id?: unknown; amount?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!uuid.test(id)) return NextResponse.json({ error: "Valid order required." }, { status: 400 });
    const rowsResponse = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}&select=id,user_id,reference,total_price,payment_provider,payment_id,payment_status,refunded_amount&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
    const rows = await rowsResponse.json().catch(() => []) as Array<{ id:string; user_id:string; reference:string; total_price:number; payment_provider:string|null; payment_id:string|null; payment_status:string|null; refunded_amount:number|null }>;
    const order = rows[0];
    if (!rowsResponse.ok || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_provider !== "stripe" || !order.payment_id) return NextResponse.json({ error: "Only captured Stripe payments can be refunded here." }, { status: 409 });
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Stripe refunds are not configured." }, { status: 503 });
    const session = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.payment_id)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    const sessionData = await session.json().catch(() => null) as { payment_intent?: string; error?: { message?: string } } | null;
    if (!session.ok || !sessionData?.payment_intent) return NextResponse.json({ error: sessionData?.error?.message ?? "Stripe payment could not be resolved." }, { status: 502 });
    const remaining = Math.max(0, Number(order.total_price) - Number(order.refunded_amount ?? 0));
    const requested = body?.amount === undefined ? remaining : Number(body.amount);
    if (!Number.isFinite(requested) || requested <= 0 || requested > remaining) return NextResponse.json({ error: "Refund amount exceeds the refundable balance." }, { status: 400 });
    const amountCents = Math.round(requested * 100);
    const form = new URLSearchParams({ payment_intent: sessionData.payment_intent, amount: String(amountCents), reason: "requested_by_customer" });
    const refundResponse = await fetch("https://api.stripe.com/v1/refunds", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `runevault-refund-${id}-${amountCents}-${Math.round(Number(order.refunded_amount ?? 0) * 100)}` }, body: form });
    const refund = await refundResponse.json().catch(() => null) as { id?: string; status?: string; error?: { message?: string } } | null;
    if (!refundResponse.ok || !refund?.id) return NextResponse.json({ error: refund?.error?.message ?? "Stripe refund failed." }, { status: 502 });
    const refundedAmount = Number((Number(order.refunded_amount ?? 0) + requested).toFixed(2));
    const full = refundedAmount >= Number(order.total_price);
    const updateResponse = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}`, { method: "PATCH", headers: { ...serviceHeaders(), Prefer: "return=representation" }, body: JSON.stringify({ refunded_amount: refundedAmount, payment_status: full ? "refunded" : "partially_refunded", ...(full ? { status: "cancelled" } : {}) }) });
    const updated = await updateResponse.json().catch(() => []) as unknown[];
    if (!updateResponse.ok || !updated[0]) return NextResponse.json({ error: "Refund succeeded at Stripe, but the order record requires reconciliation." }, { status: 502 });
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, { method: "POST", headers: { ...serviceHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ actor_id: admin.id, action: full ? "payment.refunded" : "payment.partially_refunded", entity_type: "order", entity_id: id, details: { reference: order.reference, stripe_refund_id: refund.id, amount: requested, status: refund.status ?? null } }) });
    await sendOrderEmail({eventKey:`order_refunded:${order.id}:${refund.id}:${order.user_id}`,eventType:"order_refunded",userId:order.user_id,orderId:order.id,payload:{template:"refund_issued",input:{reference:order.reference,status:refund.status??(full?"Refunded":"Partially refunded"),summary:{"Refund amount":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(requested),"Payment method":"Card","Refund date":new Date().toLocaleString("en-US",{timeZone:"UTC"})+" UTC"},actionUrl:siteUrl(`/orders/${encodeURIComponent(order.reference)}`),actionLabel:"View order"}}});
    return NextResponse.json({ order: updated[0], refund: { id: refund.id, status: refund.status, amount: requested } });
  } catch (reason) {
    if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Refund permission denied." }, { status: reason.status });
    return NextResponse.json({ error: "Refund request failed." }, { status: 500 });
  }
}
