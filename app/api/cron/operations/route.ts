import { NextResponse } from "next/server";
import { sendDiscord, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Automation access denied." }, { status: 401 });
  }
  const headers = serviceHeaders();
  let runId: string | null = null;
  try {
    const runResponse = await fetch(`${supabaseUrl()}/rest/v1/automation_runs`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ job_name: "operations_review", status: "running" }) });
    const runRows = await runResponse.json().catch(() => []); runId = runRows[0]?.id ?? null;
    const staleBefore = new Date(Date.now() - 30 * 60_000).toISOString();
    const [ordersResponse, settingsResponse, reservationsResponse] = await Promise.all([
      fetch(`${supabaseUrl()}/rest/v1/orders?status=in.(pending,awaiting_payment)&created_at=lt.${encodeURIComponent(staleBefore)}&select=id,reference,status,amount_m,total_price&limit=100`, { headers }),
      fetch(`${supabaseUrl()}/rest/v1/settings?id=eq.1&select=inventory_m`, { headers }),
      fetch(`${supabaseUrl()}/rest/v1/inventory_reservations?status=eq.active&select=id,amount_m,expires_at`, { headers }),
    ]);
    if (!ordersResponse.ok || !settingsResponse.ok || !reservationsResponse.ok) throw new Error("Operations data query failed.");
    const orders = await ordersResponse.json() as Array<{ reference: string; status: string; amount_m: number }>;
    const settings = await settingsResponse.json() as Array<{ inventory_m: number }>;
    const reservations = await reservationsResponse.json() as Array<{ id: string; amount_m: number; expires_at: string }>;
    const expired = reservations.filter((item) => new Date(item.expires_at).getTime() <= Date.now());
    if (expired.length) await fetch(`${supabaseUrl()}/rest/v1/inventory_reservations?id=in.(${expired.map((item) => item.id).join(",")})`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "expired", updated_at: new Date().toISOString() }) });
    const reserved = reservations.filter((item) => !expired.some((expiredItem) => expiredItem.id === item.id)).reduce((sum, item) => sum + Number(item.amount_m), 0);
    const available = Number(settings[0]?.inventory_m ?? 0) - reserved;
    if (orders.length || available < 100) await sendDiscord("RuneVault operations review", [
      { name: "Stale orders", value: String(orders.length), inline: true }, { name: "Expired reservations", value: String(expired.length), inline: true },
      { name: "Available inventory", value: `${available}M`, inline: true },
    ]);
    if (runId) await fetch(`${supabaseUrl()}/rest/v1/automation_runs?id=eq.${runId}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "completed", safe_details: { stale_orders: orders.length, expired_reservations: expired.length, available_inventory_m: available }, completed_at: new Date().toISOString() }) });
    return NextResponse.json({ ok: true, staleOrders: orders.length, expiredReservations: expired.length, availableInventoryM: available });
  } catch (reason) {
    if (runId) await fetch(`${supabaseUrl()}/rest/v1/automation_runs?id=eq.${runId}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "failed", error_message: reason instanceof Error ? reason.message.slice(0, 500) : "Automation failed", completed_at: new Date().toISOString() }) });
    return NextResponse.json({ error: "Operations automation failed." }, { status: 500 });
  }
}
