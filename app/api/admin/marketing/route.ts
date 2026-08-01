import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  requirePermission,
  serviceHeaders,
  supabaseUrl,
} from "@/lib/launch-server";
async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error("Marketing database returned invalid JSON.");
  }
}
function failure(reason: unknown) {
  if (reason instanceof Response)
    return NextResponse.json(
      {
        error:
          reason.status === 401
            ? "Authentication required."
            : "Admin access denied.",
      },
      { status: reason.status },
    );
  return NextResponse.json(
    { error: "Marketing request failed." },
    { status: 500 },
  );
}
function optionalIso(value: unknown) { if (value == null || value === "") return null; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? undefined : date.toISOString(); }
export async function GET(request: Request) {
  try {
    await requirePermission(request, "marketing.manage");
    const headers = serviceHeaders();
    const [coupons, promotions, referrals] = await Promise.all([
      fetch(
        `${supabaseUrl()}/rest/v1/coupon_codes?select=*&order=created_at.desc`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${supabaseUrl()}/rest/v1/promotions?select=*&order=starts_at.desc`,
        { headers, cache: "no-store" },
      ),
      fetch(`${supabaseUrl()}/rest/v1/referrals?select=id,code,status,referrer_id,referred_id,qualified_order_id,created_at,rewarded_at&order=created_at.desc&limit=300`, { headers, cache: "no-store" }),
    ]);
    if (!coupons.ok || !promotions.ok || !referrals.ok)
      return NextResponse.json(
        { error: "Rewards migration is required." },
        { status: 503 },
      );
    return NextResponse.json({
      coupons: await json(coupons),
      promotions: await json(promotions),
      referrals: await json(referrals),
    });
  } catch (reason) {
    return failure(reason);
  }
}
export async function POST(request: Request) {
  const limit = await durableRateLimit(`admin-marketing:${requestIp(request)}`, 30, 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many marketing updates." },
      { status: 429 },
    );
  try {
    const admin = await requirePermission(request, "marketing.manage");
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const action = body?.action === "promotion" ? "promotion" : "coupon";
    const headers = serviceHeaders();
    if (action === "coupon") {
      const code =
          typeof body?.code === "string" ? body.code.trim().toUpperCase() : "",
        description =
          typeof body?.description === "string" ? body.description.trim() : "",
        terms = typeof body?.terms === "string" ? body.terms.trim() : "",
        type = body?.discountType === "fixed" ? "fixed" : "percentage",
        value = Number(body?.discountValue),
        minimum = Number(body?.minimumSpend || 0),
        maximum = body?.maximumDiscount ? Number(body.maximumDiscount) : null,
        totalLimit = body?.totalUsageLimit
          ? Math.trunc(Number(body.totalUsageLimit))
          : null,
        perLimit = Math.trunc(Number(body?.perCustomerLimit || 1)),
        starts = optionalIso(body?.startsAt),
        expires = optionalIso(body?.expiresAt);
      if (
        !/^[A-Z0-9_-]{3,40}$/.test(code) ||
        description.length < 3 ||
        terms.length < 3 ||
        !Number.isFinite(value) ||
        value <= 0 ||
        (type === "percentage" && value > 100) ||
        minimum < 0 ||
        (maximum !== null && maximum <= 0) ||
        (totalLimit !== null && totalLimit < 1) ||
        perLimit < 1 ||
        starts === undefined || expires === undefined ||
        (starts && expires && expires <= starts)
      )
        return NextResponse.json(
          { error: "Enter valid coupon terms, value, limits, and dates." },
          { status: 400 },
        );
      const response = await fetch(`${supabaseUrl()}/rest/v1/coupon_codes`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          code,
          description,
          discount_type: type,
          discount_value: value,
          minimum_spend: minimum,
          maximum_discount: maximum,
          total_usage_limit: totalLimit,
          per_customer_limit: perLimit,
          starts_at: starts,
          expires_at: expires,
          active: body?.active !== false,
          terms,
          created_by: admin.id,
        }),
      });
      const rows = (await json(response)) as Array<
        Record<string, unknown>
      > | null;
      if (!response.ok || !rows?.[0])
        return NextResponse.json(
          { error: "Coupon could not be created; the code may already exist." },
          { status: 409 },
        );
      return NextResponse.json({ coupon: rows[0] }, { status: 201 });
    }
    const name = typeof body?.name === "string" ? body.name.trim() : "",
      description =
        typeof body?.description === "string" ? body.description.trim() : "",
      terms = typeof body?.terms === "string" ? body.terms.trim() : "",
      type = new Set(["percentage", "fixed", "rate_override"]).has(
        String(body?.discountType),
      )
        ? String(body?.discountType)
        : "percentage",
      value = Number(body?.discountValue),
      minimum = Math.trunc(Number(body?.minimumAmountM || 0)),
      starts = optionalIso(body?.startsAt),
      ends = optionalIso(body?.endsAt);
    if (
      name.length < 3 ||
      description.length < 3 ||
      terms.length < 3 ||
      !Number.isFinite(value) ||
      value <= 0 ||
      minimum < 0 ||
      !starts || !ends ||
      ends <= starts
    )
      return NextResponse.json(
        { error: "Enter valid promotion details and dates." },
        { status: 400 },
      );
    const response = await fetch(`${supabaseUrl()}/rest/v1/promotions`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        description,
        starts_at: starts,
        ends_at: ends,
        discount_type: type,
        discount_value: value,
        minimum_amount_m: minimum,
        active: body?.active !== false,
        terms,
        created_by: admin.id,
      }),
    });
    const rows = (await json(response)) as Array<
      Record<string, unknown>
    > | null;
    if (!response.ok || !rows?.[0])
      return NextResponse.json(
        { error: "Promotion could not be created." },
        { status: 503 },
      );
    return NextResponse.json({ promotion: rows[0] }, { status: 201 });
  } catch (reason) {
    return failure(reason);
  }
}
