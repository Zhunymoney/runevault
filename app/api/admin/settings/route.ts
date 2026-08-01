import { NextResponse } from "next/server";
import { rateLimit, requestIp, requireAdmin, supabaseUrl, userHeaders } from "@/lib/launch-server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const authorization = request.headers.get("authorization") ?? "";
    const response = await fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=*`, { headers: userHeaders(authorization), cache: "no-store" });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Settings could not be loaded." }, { status: response.ok ? 404 : response.status });
    return NextResponse.json({ settings: rows[0] });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Admin request failed." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const limit = rateLimit(`admin-settings:${requestIp(request)}`, 12, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many settings updates." }, { status: 429 });
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Settings payload is required." }, { status: 400 });
    const numeric = (name: string, min: number, max: number) => { const value = Number(body[name]); if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name}.`); return value; };
    const values: Record<string, unknown> = {
      buy_rate: numeric("buy_rate", 0, 100), sell_rate: numeric("sell_rate", 0, 100),
      inventory_m: numeric("inventory_m", 0, 1_000_000_000), minimum_order_m: numeric("minimum_order_m", 1, 1_000_000),
      maximum_order_m: numeric("maximum_order_m", 1, 1_000_000_000), maintenance_mode: body.maintenance_mode === true,
      buy_enabled: body.buy_enabled !== false, sell_enabled: body.sell_enabled !== false,
      estimated_delivery_minutes: numeric("estimated_delivery_minutes", 1, 1440),
      pause_message: typeof body.pause_message === "string" ? body.pause_message.trim().slice(0, 500) || null : null,
      updated_at: new Date().toISOString(),
    };
    if (Number(values.minimum_order_m) > Number(values.maximum_order_m)) return NextResponse.json({ error: "Minimum order cannot exceed maximum order." }, { status: 400 });
    const authorization = request.headers.get("authorization") ?? "";
    const beforeResponse = await fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=*`, { headers: userHeaders(authorization) });
    const before = (await beforeResponse.json().catch(() => [])) as unknown[];
    let response = await fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1`, { method: "PATCH", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify(values) });
    if (response.status === 400) {
      const { buy_enabled, sell_enabled, estimated_delivery_minutes, pause_message, ...legacyValues } = values;
      void buy_enabled; void sell_enabled; void estimated_delivery_minutes; void pause_message;
      response = await fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1`, { method: "PATCH", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify(legacyValues) });
    }
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || rows.length !== 1) return NextResponse.json({ error: "Settings update was not permitted." }, { status: response.ok ? 403 : response.status });
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, { method: "POST", headers: { ...userHeaders(authorization), Prefer: "return=minimal" }, body: JSON.stringify({ actor_id: admin.id, action: "settings.updated", entity_type: "settings", entity_id: "1", details: { previous: before[0] ?? null, next: rows[0] } }) });
    return NextResponse.json({ settings: rows[0] });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: reason instanceof Error ? reason.message : "Admin update failed." }, { status: 400 }); }
}
