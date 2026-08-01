import { NextResponse } from "next/server";
import { requireAdmin, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

const safe = (value: string) => value.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 80);

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const action = safe(url.searchParams.get("action") ?? "");
    const entity = safe(url.searchParams.get("entity") ?? "");
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
    const filters = ["select=id,actor_id,action,entity_type,entity_id,details,created_at", "order=created_at.desc", `limit=${limit}`];
    if (action) filters.push(`action=ilike.*${encodeURIComponent(action)}*`);
    if (entity) filters.push(`entity_type=ilike.*${encodeURIComponent(entity)}*`);
    const response = await fetch(`${supabaseUrl()}/rest/v1/audit_logs?${filters.join("&")}`, { headers: serviceHeaders(), cache: "no-store" });
    const text = await response.text();
    let records: unknown = [];
    try { records = text ? JSON.parse(text) : []; } catch { records = []; }
    if (!response.ok) return NextResponse.json({ error: "Audit records could not be loaded. Apply the admin migration first." }, { status: 503 });
    return NextResponse.json({ records });
  } catch (reason) {
    if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Admin access denied." }, { status: reason.status });
    return NextResponse.json({ error: "Audit request failed." }, { status: 500 });
  }
}
