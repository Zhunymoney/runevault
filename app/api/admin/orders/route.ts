import { NextResponse } from "next/server";
import { durableRateLimit, requestIp, requirePermission, supabaseUrl, userHeaders } from "@/lib/launch-server";

const statuses = new Set(["pending","awaiting_payment","paid","assigned","delivering","completed","cancelled"]);

export async function GET(request: Request) {
  try {
    await requirePermission(request, "orders.read");
    const authorization = request.headers.get("authorization") ?? "";
    const response = await fetch(`${supabaseUrl()}/rest/v1/orders?select=*&order=created_at.desc`, { headers: userHeaders(authorization), cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ error: "Admin orders could not be loaded." }, { status: response.status });
    return NextResponse.json({ orders: data });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Admin request failed." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const limit = await durableRateLimit(`admin-order:${requestIp(request)}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many admin updates." }, { status: 429 });
  try {
    const admin = await requirePermission(request, "orders.update");
    const body = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const status = typeof body?.status === "string" ? body.status : "";
    if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.has(status)) return NextResponse.json({ error: "Invalid admin order update." }, { status: 400 });
    if (admin.adminRole === "fulfillment" && !new Set(["assigned", "delivering", "completed"]).has(status)) return NextResponse.json({ error: "Fulfillment staff may only advance assigned delivery statuses." }, { status: 403 });
    const authorization = request.headers.get("authorization") ?? "";
    const beforeResponse = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}&select=id,status`, { headers: userHeaders(authorization) });
    const before = (await beforeResponse.json().catch(() => [])) as Array<{ status?: string }>;
    const response = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}`, { method: "PATCH", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify({ status }) });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || rows.length !== 1) return NextResponse.json({ error: "Order update was not permitted." }, { status: response.ok ? 403 : response.status });
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, { method: "POST", headers: { ...userHeaders(authorization), Prefer: "return=minimal" }, body: JSON.stringify({ actor_id: admin.id, action: "order.status_updated", entity_type: "order", entity_id: id, details: { previous: before[0]?.status ?? null, next: status } }) });
    return NextResponse.json({ order: rows[0] });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Admin update failed." }, { status: 500 }); }
}
