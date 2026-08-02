import { NextResponse } from "next/server";
import {
  getOrderByReference,
  durableRateLimit,
  requestIp,
  requireOrderOwner,
  riskScore,
  siteUrl,
  updateOrder,
} from "@/lib/launch-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = await durableRateLimit(`stripe-create:${requestIp(request)}`, 5);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many payment attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter ?? 60) },
      },
    );
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "Card checkout is not configured. Add approved Stripe credentials first.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { reference?: string };
    const reference = body.reference?.trim().toUpperCase();

    if (!reference || !/^RV-[A-Z0-9]{6,16}$/.test(reference)) {
      return NextResponse.json({ error: "Invalid order reference." }, { status: 400 });
    }

    const authorization = request.headers.get("authorization");
    const order = await getOrderByReference(reference, authorization);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    await requireOrderOwner(request, order);

    if (order.order_type !== "buy") {
      return NextResponse.json(
        { error: "Card checkout is only available for buy orders." },
        { status: 400 },
      );
    }

    if (["paid", "assigned", "delivering", "completed"].includes(order.status)) {
      return NextResponse.json(
        { error: "This order is already paid or completed." },
        { status: 409 },
      );
    }

    const risk = riskScore(order);
    if (risk.level === "high") {
      await updateOrder(order.id, {
        payment_provider: "stripe", payment_status: "manual_review",
        risk_score: risk.score, risk_level: risk.level, risk_reasons: risk.reasons,
      }, authorization);
      return NextResponse.json(
        {
          error:
            "This order requires manual review before card checkout can be opened.",
        },
        { status: 403 },
      );
    }

    await updateOrder(order.id, {
      payment_provider: "stripe", payment_status: "checkout_created",
      risk_score: risk.score, risk_level: risk.level, risk_reasons: risk.reasons,
    }, authorization);

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", `${siteUrl()}/orders/${encodeURIComponent(order.reference)}`);
    params.set(
      "cancel_url",
      `${siteUrl()}/pay?reference=${order.reference}&cancelled=1`,
    );
    params.set("client_reference_id", order.reference);
    params.set("metadata[order_id]", order.id);
    params.set("metadata[reference]", order.reference);
    params.set("line_items[0][quantity]", "1");
    params.set(
      "line_items[0][price_data][currency]",
      (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase(),
    );
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(Math.max(50, Math.round(Number(order.total_price) * 100))),
    );
    params.set(
      "line_items[0][price_data][product_data][name]",
      `${order.amount_m}M OSRS gold — ${order.reference}`,
    );
    params.set(
      "line_items[0][price_data][product_data][description]",
      "RuneVault order payment",
    );

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `runevault-checkout-${order.id}`,
      },
      body: params,
    });

    const result = (await response.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!response.ok || !result.url) {
      return NextResponse.json(
        { error: result.error?.message ?? "Stripe checkout could not be created." },
        { status: 502 },
      );
    }

    await updateOrder(order.id, { payment_id: result.id ?? null }, authorization);
    return NextResponse.json({ url: result.url });
  } catch (reason) {
    if (reason instanceof Response) return reason;
    return NextResponse.json(
      {
        error:
          reason instanceof Error ? reason.message : "Card checkout failed.",
      },
      { status: 500 },
    );
  }
}
