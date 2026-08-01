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
    const expiryResponse = await fetch(`${supabaseUrl()}/rest/v1/rpc/expire_inventory_reservations`, { method: "POST", headers, body: "{}" });
    if (!expiryResponse.ok) throw new Error("Transactional reservation expiry is not configured.");
    const expired = Number(await expiryResponse.json());
    const [ordersResponse, balanceResponse] = await Promise.all([
      fetch(`${supabaseUrl()}/rest/v1/orders?status=in.(pending,awaiting_payment)&created_at=lt.${encodeURIComponent(staleBefore)}&select=id,reference,status,amount_m,total_price&limit=100`, { headers }),
      fetch(`${supabaseUrl()}/rest/v1/rpc/current_inventory_m`, { method: "POST", headers, body: "{}" }),
    ]);
    if (!ordersResponse.ok || !balanceResponse.ok) throw new Error("Operations data query failed.");
    const orders = await ordersResponse.json() as Array<{ reference: string; status: string; amount_m: number }>;
    const available = Number(await balanceResponse.json());
    if (orders.length || available < 100) await sendDiscord("RuneVault operations review", [
      { name: "Stale orders", value: String(orders.length), inline: true }, { name: "Expired reservations", value: String(expired), inline: true },
      { name: "Available inventory", value: `${available}M`, inline: true },
    ]);
    if (runId) await fetch(`${supabaseUrl()}/rest/v1/automation_runs?id=eq.${runId}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "completed", safe_details: { stale_orders: orders.length, expired_reservations: expired, available_inventory_m: available }, completed_at: new Date().toISOString() }) });
    return NextResponse.json({ ok: true, staleOrders: orders.length, expiredReservations: expired, availableInventoryM: available });
  } catch (reason) {
    if (runId) await fetch(`${supabaseUrl()}/rest/v1/automation_runs?id=eq.${runId}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ status: "failed", error_message: reason instanceof Error ? reason.message.slice(0, 500) : "Automation failed", completed_at: new Date().toISOString() }) });
    return NextResponse.json({ error: "Operations automation failed." }, { status: 500 });
  }
}
