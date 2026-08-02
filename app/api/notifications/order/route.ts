import { NextResponse } from "next/server";
import { emailTemplate } from "@/lib/email-templates";
import { getOrderByReference, getUserEmail, rateLimit, requestIp, requireOrderOwner, sendDiscord, sendEmail, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export async function POST(request: Request) {
  const limit = rateLimit(`notify:${requestIp(request)}`, 5, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ ok: true, skipped: true });
  try {
    const body = (await request.json().catch(() => null)) as { reference?: unknown } | null;
    const reference = typeof body?.reference === "string" ? body.reference.trim().toUpperCase() : "";
    if (!reference) return NextResponse.json({ error: "Reference required." }, { status: 400 });
    const authorization = request.headers.get("authorization");
    const order = await getOrderByReference(reference, authorization);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    await requireOrderOwner(request, order);
    const claim = await fetch(`${supabaseUrl()}/rest/v1/rpc/claim_order_notification`, {
      method: "POST", headers: serviceHeaders(),
      body: JSON.stringify({ p_order_id: order.id, p_event_key: `order-created:${order.id}`, p_event_type: "order_created", p_channel: "internal" }),
    });
    if (!claim.ok) return NextResponse.json({ error: "Notification ledger is not configured." }, { status: 503 });
    if (!(await claim.json() as boolean)) return NextResponse.json({ ok: true, skipped: true });
    await sendDiscord("New RuneVault order", [
      { name: "Reference", value: order.reference, inline: true }, { name: "Type", value: order.order_type, inline: true },
      { name: "Gold", value: `${order.amount_m}M`, inline: true }, { name: "Value", value: `$${Number(order.total_price).toFixed(2)}`, inline: true },
    ]);
    const email = await getUserEmail(order.user_id);
    if (email) {
      const template = emailTemplate("order_confirmation", { reference: order.reference, actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/orders/${encodeURIComponent(order.reference)}`, detail: `${order.order_type} ${order.amount_m}M OSRS gold.` });
      await sendEmail({ to: email, ...template });
    }
    return NextResponse.json({ ok: true });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Notification failed." }, { status: 500 }); }
}
