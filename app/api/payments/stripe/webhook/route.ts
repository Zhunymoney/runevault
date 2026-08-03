import { NextResponse } from "next/server";
import {
  sendDiscord,
  serviceHeaders,
  supabaseUrl,
  verifyStripeSignature,
} from "@/lib/launch-server";
import { adminRecipient, sendEmailEvent, sendOrderEmail, siteUrl } from "@/lib/transactional-email";

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
        `${supabaseUrl()}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,user_id,reference,total_price,status,payment_status,payment_id,order_type,amount_m&limit=1`,
        { headers: serviceHeaders(), cache: "no-store" },
      );
      const rows = lookup.ok
        ? ((await lookup.json()) as Array<{
            id: string;
            user_id: string;
            reference: string;
            total_price: number;
            status: string;
            payment_status: string | null;
            payment_id: string | null;
            order_type: "buy" | "sell";
            amount_m: number;
          }>)
        : [];
      const order = rows[0];
      if (!order)
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      const alertPaymentError=async(detail:string)=>{const recipient=adminRecipient();if(recipient)await sendEmailEvent({eventKey:`admin_payment_error:${event.id}:${order.id}:${recipient}`,eventType:"admin_payment_error",recipient,orderId:order.id,userId:order.user_id,payload:{template:"admin_payment_error",input:{reference:order.reference,status:"Manual intervention",detail,actionUrl:siteUrl("/admin"),actionLabel:"Review payment"}}})};
      if (order.payment_id === session.id && order.payment_status === "paid")
        return NextResponse.json({ received: true, duplicate: true });
      if (order.payment_id && order.payment_id !== session.id) {
        await alertPaymentError("The signed Stripe webhook referenced a different payment session than the order record.");
        return NextResponse.json({ error: "Payment session mismatch." }, { status: 409 });
      }
      if (["cancelled", "completed"].includes(order.status))
        return NextResponse.json({ error: "Order is already terminal." }, { status: 409 });
      const expectedCents = Math.round(Number(order.total_price) * 100);
      if (session.currency?.toLowerCase() !== "usd" || session.amount_total !== expectedCents) {
        await alertPaymentError("The signed Stripe webhook amount or currency did not match the stored order total.");
        return NextResponse.json({ error: "Payment amount or currency mismatch." }, { status: 409 });
      }
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
      const amount = `${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`;
      const notifications: Promise<unknown>[] = [sendOrderEmail({ eventKey: `payment_confirmed:${order.id}:${customerEmail ?? order.user_id}`, eventType: "payment_confirmed", recipient: customerEmail, userId: order.user_id, orderId: order.id, payload: { template: "card_confirmed", input: { reference, status: "Paid", summary: { "Amount paid": amount, "Payment method": "Card", "Next step": "Your order is ready for fulfillment." }, actionUrl: siteUrl(`/orders/${encodeURIComponent(reference)}`), actionLabel: "Track order" } } })];
      const adminEmail = adminRecipient();
      if (adminEmail) notifications.push(sendEmailEvent({ eventKey: `admin_payment_confirmed:${order.id}:stripe:${adminEmail}`, eventType: "admin_payment_confirmed", recipient: adminEmail, orderId: order.id, userId: order.user_id, payload: { template: "admin_payment_confirmed", input: { reference, status: "Paid", summary: { "Confirmed amount": amount, "Payment method": "Card", Source: "Verified Stripe webhook" }, actionUrl: siteUrl("/admin"), actionLabel: "Open admin" } } }));
      await Promise.allSettled(notifications);
    }
  }

  return NextResponse.json({ received: true });
}
