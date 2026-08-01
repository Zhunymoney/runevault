import { NextResponse } from "next/server";
import { serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export async function GET() {
  try {
    const headers = serviceHeaders();
    const [settingsResponse, schedulesResponse, tiersResponse] =
      await Promise.all([
        fetch(
          `${supabaseUrl()}/rest/v1/settings?id=eq.1&select=id,buy_rate,sell_rate,inventory_m,minimum_order_m,maximum_order_m,maintenance_mode,buy_enabled,sell_enabled,estimated_delivery_minutes,pause_message,updated_at&limit=1`,
          { headers, cache: "no-store" },
        ),
        fetch(
          `${supabaseUrl()}/rest/v1/scheduled_prices?active=eq.true&select=id,buy_rate,sell_rate,starts_at,ends_at,active&order=starts_at.desc&limit=100`,
          { headers, cache: "no-store" },
        ),
        fetch(
          `${supabaseUrl()}/rest/v1/bulk_price_tiers?active=eq.true&select=id,order_type,minimum_amount_m,rate_adjustment,active&order=minimum_amount_m.desc&limit=100`,
          { headers, cache: "no-store" },
        ),
      ]);
    const rows = settingsResponse.ok
      ? ((await settingsResponse.json().catch(() => [])) as Array<
          Record<string, unknown>
        >)
      : [];
    if (!rows[0])
      return NextResponse.json(
        { error: "Marketplace pricing is unavailable." },
        { status: 503 },
      );
    const schedules = schedulesResponse.ok
      ? await schedulesResponse.json().catch(() => [])
      : [];
    const tiers = tiersResponse.ok
      ? await tiersResponse.json().catch(() => [])
      : [];
    return NextResponse.json(
      {
        settings: {
          ...rows[0],
          scheduled_prices: Array.isArray(schedules) ? schedules : [],
          bulk_price_tiers: Array.isArray(tiers) ? tiers : [],
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Marketplace pricing is unavailable." },
      { status: 503 },
    );
  }
}
