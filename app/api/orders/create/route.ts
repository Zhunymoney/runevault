import { NextResponse } from "next/server";
import {
  rateLimit,
  requestIp,
  riskScore,
  serviceHeaders,
  supabaseUrl,
  userHeaders,
} from "@/lib/launch-server";
import { adminRecipient, sendEmailEvent, sendOrderEmail, siteUrl } from "@/lib/transactional-email";
import {
  resolveEffectivePrice,
  type BulkPriceTier,
  type ScheduledPrice,
} from "@/lib/pricing";
type User = { id: string };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error(
      `Order service returned invalid JSON (${response.status}).`,
    );
  }
}
export async function POST(request: Request) {
  const limit = rateLimit(`order-create:${requestIp(request)}`, 6, 10 * 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many order attempts. Try again later." },
      { status: 429 },
    );
  try {
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer\s+\S+$/i.test(authorization))
      return NextResponse.json(
        { error: "Sign in before creating an order." },
        { status: 401 },
      );
    const authResponse = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: userHeaders(authorization),
      cache: "no-store",
    });
    if (!authResponse.ok)
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 },
      );
    const user = (await authResponse.json()) as User;
    if (!uuid.test(user.id ?? ""))
      return NextResponse.json(
        { error: "Invalid account session." },
        { status: 401 },
      );
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const type = body?.order_type === "sell" ? "sell" : "buy",
      amount = Number(body?.amount_m),
      deliveryName =
        typeof body?.delivery_name === "string"
          ? body.delivery_name.trim()
          : "",
      notes = typeof body?.notes === "string" ? body.notes.trim() : "",
      contact =
        typeof body?.contact_details === "string"
          ? body.contact_details.trim()
          : "",
      world = Math.trunc(Number(body?.preferred_world)) || null,
      payoutMethod =
        typeof body?.payout_method === "string"
          ? body.payout_method.trim()
          : "",
      payoutDetails =
        typeof body?.payout_details === "string"
          ? body.payout_details.trim()
          : "",
      couponCode =
        typeof body?.coupon_code === "string"
          ? body.coupon_code.trim().toUpperCase()
          : "",
      requestId = typeof body?.request_id === "string" ? body.request_id : "";
    if (
      !uuid.test(requestId) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      deliveryName.length < 1 ||
      deliveryName.length > 12 ||
      contact.length < 3 ||
      contact.length > 200 ||
      notes.length > 2000 ||
      (world !== null && (world < 301 || world > 999)) ||
      (type === "sell" && (!payoutMethod || !payoutDetails))
    )
      return NextResponse.json(
        { error: "Complete all required order fields with valid values." },
        { status: 400 },
      );
    const headers = userHeaders(authorization);
    const existingResponse = await fetch(
      `${supabaseUrl()}/rest/v1/orders?client_request_id=eq.${requestId}&select=*&limit=1`,
      { headers, cache: "no-store" },
    );
    if (existingResponse.ok) {
      const existing = (await json(existingResponse)) as Array<
        Record<string, unknown>
      >;
      if (existing[0])
        return NextResponse.json({ order: existing[0], duplicate: true });
    }
    const [settingsResponse, schedulesResponse, tiersResponse] =
      await Promise.all([
        fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=*&limit=1`, {
          headers,
          cache: "no-store",
        }),
        fetch(
          `${supabaseUrl()}/rest/v1/scheduled_prices?active=eq.true&select=id,buy_rate,sell_rate,starts_at,ends_at,active&order=starts_at.desc&limit=100`,
          { headers: serviceHeaders(), cache: "no-store" },
        ),
        fetch(
          `${supabaseUrl()}/rest/v1/bulk_price_tiers?active=eq.true&select=id,order_type,minimum_amount_m,rate_adjustment,active&order=minimum_amount_m.desc&limit=100`,
          { headers: serviceHeaders(), cache: "no-store" },
        ),
      ]);
    const settings = settingsResponse.ok
      ? ((await json(settingsResponse)) as Array<Record<string, unknown>>)[0]
      : null;
    if (!settings)
      return NextResponse.json(
        { error: "Marketplace settings are unavailable." },
        { status: 503 },
      );
    if (
      settings.maintenance_mode ||
      (type === "buy" && settings.buy_enabled === false) ||
      (type === "sell" && settings.sell_enabled === false)
    )
      return NextResponse.json(
        {
          error: String(
            settings.pause_message || "Ordering is temporarily paused.",
          ),
        },
        { status: 409 },
      );
    const minimum = Number(settings.minimum_order_m),
      maximum = Number(settings.maximum_order_m),
      available = Number(settings.inventory_m),
      baseRate = Number(
        type === "buy" ? settings.buy_rate : settings.sell_rate,
      );
    if (amount < minimum || amount > maximum)
      return NextResponse.json(
        { error: `Orders must be between ${minimum}M and ${maximum}M.` },
        { status: 400 },
      );
    if (type === "buy" && amount > available)
      return NextResponse.json(
        { error: "Requested amount exceeds available inventory." },
        { status: 409 },
      );
    const schedules = schedulesResponse.ok
      ? ((await json(schedulesResponse)) as ScheduledPrice[])
      : [];
    const tiers = tiersResponse.ok
      ? ((await json(tiersResponse)) as BulkPriceTier[])
      : [];
    const pricing = resolveEffectivePrice({
      orderType: type,
      amountM: amount,
      baseRate,
      schedules,
      tiers,
    });
    const rate = pricing.rate;
    const total = Number((amount * rate).toFixed(2)),
      risk = riskScore({
        amount_m: amount,
        total_price: total,
        delivery_name: deliveryName,
      });
    const base = {
      user_id: user.id,
      order_type: type,
      amount_m: amount,
      price_per_m: rate,
      total_price: total,
      delivery_name: deliveryName,
      notes: notes || null,
      status: "pending",
      client_request_id: requestId,
      terms_accepted_at: new Date().toISOString(),
      preferred_world: world,
      contact_details: contact,
      payout_method: type === "sell" ? payoutMethod : null,
      payout_details: type === "sell" ? payoutDetails : null,
      seller_status: type === "sell" ? "awaiting_meetup" : null,
      risk_score: risk.score,
      risk_level: risk.level,
      risk_reasons: risk.reasons,
    };
    let response = await fetch(`${supabaseUrl()}/rest/v1/orders`, {
      method: "POST",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(base),
    });
    if (!response.ok) {
      const legacyNotes = [
        notes,
        world ? `Preferred world: ${world}` : "",
        contact ? `Contact: ${contact}` : "",
        payoutMethod ? `Payout method: ${payoutMethod}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const legacy = {
        user_id: user.id,
        order_type: type,
        amount_m: amount,
        price_per_m: rate,
        total_price: total,
        delivery_name: deliveryName,
        notes: legacyNotes || null,
        status: "pending",
        risk_score: risk.score,
        risk_level: risk.level,
        risk_reasons: risk.reasons,
      };
      response = await fetch(`${supabaseUrl()}/rest/v1/orders`, {
        method: "POST",
        headers: { ...serviceHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(legacy),
      });
    }
    const rows = (await json(response)) as Array<
      Record<string, unknown>
    > | null;
    if (!response.ok || !rows?.[0])
      return NextResponse.json(
        { error: "Order could not be created." },
        { status: response.status || 500 },
      );
    const order = rows[0],
      warnings: string[] = [];
    if (couponCode) {
      const couponResponse = await fetch(
        `${supabaseUrl()}/rest/v1/rpc/apply_coupon_to_order`,
        {
          method: "POST",
          headers: serviceHeaders(),
          body: JSON.stringify({ p_order_id: order.id, p_code: couponCode }),
        },
      );
      if (!couponResponse.ok) {
        await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${order.id}`, {
          method: "PATCH",
          headers: { ...serviceHeaders(), Prefer: "return=minimal" },
          body: JSON.stringify({ status: "cancelled" }),
        });
        return NextResponse.json(
          {
            error:
              "Coupon is invalid, expired, over its limit, or the rewards migration is not configured.",
          },
          { status: 409 },
        );
      }
      const applied = (await json(couponResponse)) as Array<{
        code: string;
        discount_amount: number;
        total_price: number;
      }>;
      Object.assign(order, applied[0] ?? {});
    }
    if (type === "buy") {
      const reservation = await fetch(
        `${supabaseUrl()}/rest/v1/rpc/reserve_inventory`,
        {
          method: "POST",
          headers: serviceHeaders(),
          body: JSON.stringify({
            p_order_id: order.id,
            p_amount_m: Math.trunc(amount),
          }),
        },
      );
      if (!reservation.ok)
        warnings.push(
          "Inventory reservation migration is pending; staff must verify inventory manually.",
        );
    }
    const customerEmail = (await fetch(`${supabaseUrl()}/auth/v1/admin/users/${user.id}`, { headers: serviceHeaders(), cache: "no-store" })
      .then(async response => response.ok ? ((await response.json()) as { email?: string }).email : null).catch(() => null)) ?? null;
    const reference = String(order.reference);
    const summary = {
      "Order type": type === "buy" ? "Buy Gold" : "Sell Gold",
      "Gold amount": `${amount.toLocaleString()}M OSRS GP`,
      "Quoted total": new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(order.total_price ?? total)),
      "Payment method": type === "sell" ? payoutMethod : "Select during checkout",
      "RuneScape name": deliveryName,
    };
    const emails: Promise<unknown>[] = [sendOrderEmail({ eventKey: `order_received:${order.id}:${user.id}`, eventType: "order_received", recipient: customerEmail, userId: user.id, orderId: String(order.id), payload: { template: "order_confirmation", input: { reference, status: String(order.status), summary, actionUrl: siteUrl(`/orders/${encodeURIComponent(reference)}`), actionLabel: "Track order" } } })];
    const adminEmail = adminRecipient();
    if (adminEmail) {
      emails.push(sendEmailEvent({ eventKey: `admin_new_order:${order.id}:${adminEmail}`, eventType: "admin_new_order", recipient: adminEmail, orderId: String(order.id), userId: user.id, payload: { template: "admin_new_order", input: { reference, status: String(order.status), summary: { ...summary, "Customer email": customerEmail ?? "Unavailable", "Risk": `${risk.level} (${risk.score}/100)` }, actionUrl: siteUrl("/admin"), actionLabel: "Review order" } } }));
      const threshold = Number(process.env.LARGE_ORDER_ALERT_USD);
      if (Number.isFinite(threshold) && threshold > 0 && Number(order.total_price ?? total) >= threshold) emails.push(sendEmailEvent({ eventKey: `admin_large_order:${order.id}:${adminEmail}`, eventType: "admin_large_order", recipient: adminEmail, orderId: String(order.id), userId: user.id, payload: { template: "admin_large_order", input: { reference, status: "Review required", summary, actionUrl: siteUrl("/admin"), actionLabel: "Review order" } } }));
      if (risk.level === "high") emails.push(sendEmailEvent({ eventKey: `admin_high_risk:${order.id}:${adminEmail}`, eventType: "admin_high_risk", recipient: adminEmail, orderId: String(order.id), userId: user.id, payload: { template: "admin_high_risk", input: { reference, status: "High risk", summary: { Score: `${risk.score}/100`, Reasons: risk.reasons.join(", ") || "No reasons recorded" }, actionUrl: siteUrl("/admin"), actionLabel: "Review order" } } }));
    }
    await Promise.allSettled(emails);
    return NextResponse.json({ order, warnings }, { status: 201 });
  } catch (reason) {
    return NextResponse.json(
      {
        error:
          reason instanceof Error ? reason.message : "Order creation failed.",
      },
      { status: 500 },
    );
  }
}
