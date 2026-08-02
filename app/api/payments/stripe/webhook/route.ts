import { NextResponse } from "next/server";
import {
  sendDiscord,
  sendEmail,
  serviceHeaders,
  supabaseUrl,
  verifyStripeSignature,
} from "@/lib/launch-server";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      customer_details?: { email?: string };
      metadata?: { order_id?: string; reference?: string };
    };
  };
};

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is missing." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    if (orderId && session.payment_status === "paid") {
      const lookup = await fetch(
        `${supabaseUrl()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,reference,total_price,status,payment_status,payment_id&limit=1`,
        { headers: serviceHeaders(), cache: "no-store" },
      );
      const rows = lookup.ok
        ? ((await lookup.json()) as Array<{
            id: string;
            reference: string;
            total_price: number;
            status: string;
            payment_status: string | null;
            payment_id: string | null;
          }>)
        : [];
      const order = rows[0];
      if (!order)
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      if (order.payment_id === session.id && order.payment_status === "paid")
        return NextResponse.json({ received: true, duplicate: true });
      if (order.payment_id && order.payment_id !== session.id)
        return NextResponse.json({ error: "Payment session mismatch." }, { status: 409 });
      if (["cancelled", "completed"].includes(order.status))
        return NextResponse.json({ error: "Order is already terminal." }, { status: 409 });
      const expectedCents = Math.round(Number(order.total_price) * 100);
      if (session.currency?.toLowerCase() !== "usd" || session.amount_total !== expectedCents)
        return NextResponse.json({ error: "Payment amount or currency mismatch." }, { status: 409 });
      const transition = await fetch(
        `${supabaseUrl()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&payment_id=is.null&status=not.in.(cancelled,completed)`,
        {
          method: "PATCH",
          headers: { ...serviceHeaders(), Prefer: "return=representation" },
          body: JSON.stringify({
            status: "paid",
            payment_provider: "stripe",
            payment_status: "paid",
            payment_id: session.id,
            paid_at: new Date().toISOString(),
          }),
        },
      );
      const transitioned = transition.ok
        ? ((await transition.json()) as Array<{ id: string }>)
        : [];
      if (transitioned.length !== 1)
        return NextResponse.json({ received: true, duplicate: true });
      const reference = order.reference;

      await sendDiscord("Card payment confirmed", [
        { name: "Reference", value: reference, inline: true },
        {
          name: "Amount",
          value: `${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`,
          inline: true,
        },
      ]);

      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          subject: `RuneVault payment confirmed — ${reference}`,
          html: `
            <h1>Payment confirmed</h1>
            <p>Your RuneVault order <strong>${reference}</strong> has been marked paid.</p>
            <p>Track the order from your RuneVault account.</p>
          `,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
