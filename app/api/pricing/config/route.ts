import { NextResponse } from "next/server";
import { supabaseUrl } from "@/lib/launch-server";

export async function GET() {
  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error("Public database key is unavailable.");
    const headers = {
      apikey: key,
      ...(key.startsWith("sb_publishable_")
        ? {}
        : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
    };
    const [settingsResponse, schedulesResponse, tiersResponse] =
      await Promise.all([
        fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=*&limit=1`, {
          headers,
          cache: "no-store",
        }),
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
    const row = rows[0];
    return NextResponse.json(
      {
        settings: {
          id: row.id,
          buy_rate: row.buy_rate,
          sell_rate: row.sell_rate,
          inventory_m: row.inventory_m,
          minimum_order_m: row.minimum_order_m,
          maximum_order_m: row.maximum_order_m,
          maintenance_mode: row.maintenance_mode,
          buy_enabled: row.buy_enabled,
          sell_enabled: row.sell_enabled,
          estimated_delivery_minutes: row.estimated_delivery_minutes,
          pause_message: row.pause_message,
          updated_at: row.updated_at,
          scheduled_prices: Array.isArray(schedules) ? schedules : [],
          bulk_price_tiers: Array.isArray(tiers) ? tiers : [],
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
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
