import { NextResponse } from "next/server";
import {
  getOrderByReference,
  getUserEmail,
  rateLimit,
  requestIp,
  sendDiscord,
  sendEmail,
} from "@/lib/launch-server";

export async function POST(request: Request) {
  const limit = rateLimit(`notify:${requestIp(request)}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = (await request.json()) as { reference?: string };
  const reference = body.reference?.trim().toUpperCase();
  if (!reference) {
    return NextResponse.json({ error: "Reference required." }, { status: 400 });
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  await sendDiscord("New RuneVault order", [
    { name: "Reference", value: order.reference, inline: true },
    { name: "Type", value: order.order_type, inline: true },
    { name: "Gold", value: `${order.amount_m}M`, inline: true },
    { name: "Value", value: `$${Number(order.total_price).toFixed(2)}`, inline: true },
  ]);

  const email = await getUserEmail(order.user_id);
  if (email) {
    await sendEmail({
      to: email,
      subject: `RuneVault order created — ${order.reference}`,
      html: `
        <h1>Order created</h1>
        <p>Your RuneVault reference is <strong>${order.reference}</strong>.</p>
        <p>Order: ${order.order_type} ${order.amount_m}M.</p>
        <p>This is a preview order until a verified payment is completed.</p>
      `,
    });
  }

  return NextResponse.json({ ok: true });
}
