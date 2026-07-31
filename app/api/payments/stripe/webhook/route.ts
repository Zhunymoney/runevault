import { NextResponse } from "next/server";
import {
  getUserEmail,
  sendDiscord,
  sendEmail,
  updateOrder,
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

  const event = JSON.parse(rawBody) as StripeEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const reference = session.metadata?.reference ?? "Unknown";

    if (orderId && session.payment_status === "paid") {
      await updateOrder(orderId, {
        status: "paid",
        payment_provider: "stripe",
        payment_status: "paid",
        payment_id: session.id,
        paid_at: new Date().toISOString(),
      });

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
