import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  requirePermission,
  serviceHeaders,
  supabaseUrl,
} from "@/lib/launch-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const denied = (reason: unknown) =>
  reason instanceof Response
    ? NextResponse.json(
        {
          error:
            reason.status === 401
              ? "Authentication required."
              : "Admin access denied.",
        },
        { status: reason.status },
      )
    : NextResponse.json({ error: "Pricing request failed." }, { status: 500 });
const iso = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export async function GET(request: Request) {
  try {
    await requirePermission(request, "settings.manage");
    const headers = serviceHeaders();
    const responses = await Promise.all([
      fetch(
        `${supabaseUrl()}/rest/v1/price_history?select=*&order=effective_at.desc&limit=100`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${supabaseUrl()}/rest/v1/scheduled_prices?select=*&order=starts_at.desc&limit=100`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${supabaseUrl()}/rest/v1/bulk_price_tiers?select=*&order=order_type.asc,minimum_amount_m.asc&limit=100`,
        { headers, cache: "no-store" },
      ),
    ]);
    if (!responses.every((response) => response.ok))
      return NextResponse.json(
        { error: "Pricing workflow migration is required." },
        { status: 503 },
      );
    const [history, schedules, tiers] = await Promise.all(
      responses.map((response) => response.json()),
    );
    return NextResponse.json({ history, schedules, tiers });
  } catch (reason) {
    return denied(reason);
  }
}

export async function POST(request: Request) {
  const limit = await durableRateLimit(
    `admin-pricing:${requestIp(request)}`,
    30,
    60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many pricing updates." },
      { status: 429 },
    );
  try {
    const admin = await requirePermission(request, "settings.manage");
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body)
      return NextResponse.json(
        { error: "Pricing payload is required." },
        { status: 400 },
      );
    const action = String(body.action ?? ""),
      headers = serviceHeaders();
    let table = "",
      values: Record<string, unknown> = {};
    const id =
      typeof body.id === "string" && uuid.test(body.id) ? body.id : null;
    if (action === "schedule") {
      const buyRate =
          body.buyRate === "" || body.buyRate == null
            ? null
            : Number(body.buyRate),
        sellRate =
          body.sellRate === "" || body.sellRate == null
            ? null
            : Number(body.sellRate);
      const startsAt = iso(body.startsAt),
        endsAt = iso(body.endsAt),
        label =
          typeof body.label === "string" ? body.label.trim().slice(0, 160) : "";
      if (
        (buyRate == null && sellRate == null) ||
        (buyRate != null &&
          (!Number.isFinite(buyRate) || buyRate <= 0 || buyRate > 100)) ||
        (sellRate != null &&
          (!Number.isFinite(sellRate) || sellRate <= 0 || sellRate > 100)) ||
        !startsAt ||
        startsAt === undefined ||
        endsAt === undefined ||
        (endsAt && endsAt <= startsAt)
      )
        return NextResponse.json(
          { error: "Enter valid scheduled rates and dates." },
          { status: 400 },
        );
      table = "scheduled_prices";
      values = {
        buy_rate: buyRate,
        sell_rate: sellRate,
        starts_at: startsAt,
        ends_at: endsAt,
        label: label || null,
        active: body.active !== false,
        created_by: admin.id,
      };
    } else if (action === "tier") {
      const orderType =
          body.orderType === "sell"
            ? "sell"
            : body.orderType === "buy"
              ? "buy"
              : null,
        minimum = Math.trunc(Number(body.minimumAmountM)),
        adjustment = Number(body.rateAdjustment);
      if (
        !orderType ||
        !Number.isFinite(minimum) ||
        minimum < 1 ||
        minimum > 1_000_000_000 ||
        !Number.isFinite(adjustment) ||
        adjustment < -100 ||
        adjustment > 100
      )
        return NextResponse.json(
          { error: "Enter a valid order type, threshold, and adjustment." },
          { status: 400 },
        );
      table = "bulk_price_tiers";
      values = {
        order_type: orderType,
        minimum_amount_m: minimum,
        rate_adjustment: adjustment,
        active: body.active !== false,
      };
    } else if (
      action === "toggle" &&
      id &&
      ["scheduled_prices", "bulk_price_tiers"].includes(String(body.table))
    ) {
      table = String(body.table);
      values = { active: body.active === true };
    } else
      return NextResponse.json(
        { error: "Unsupported pricing action." },
        { status: 400 },
      );
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/${table}${id ? `?id=eq.${id}` : ""}`,
      {
        method: id ? "PATCH" : "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(values),
      },
    );
    const rows = (await response.json().catch(() => [])) as Array<{
      id: string;
    }>;
    if (!response.ok || !rows[0])
      return NextResponse.json(
        { error: "Pricing change could not be saved." },
        { status: 503 },
      );
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: admin.id,
        action: `pricing.${action}`,
        entity_type: table,
        entity_id: rows[0].id,
        details: values,
      }),
    });
    return NextResponse.json({ record: rows[0] }, { status: id ? 200 : 201 });
  } catch (reason) {
    return denied(reason);
  }
}
