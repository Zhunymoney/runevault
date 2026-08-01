import { NextResponse } from "next/server";
import { requireAdmin, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const staffRoles = new Set(["owner", "manager", "support"]);
const roles = new Set(["customer", "staff", "admin"]);
const adminRoles = new Set(["owner", "manager", "support", "fulfillment", "analytics"]);

function denied(reason: unknown) {
  if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Admin access denied." }, { status: reason.status });
  return NextResponse.json({ error: "Customer request failed." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!(admin.role === "admin" && !admin.adminRole) && !staffRoles.has(admin.adminRole ?? "")) throw new Response("Customer access denied.", { status: 403 });
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") ?? "").trim().replace(/[,*()]/g, "").slice(0, 100);
    const filters = ["select=id,full_name,runescape_name,contact_email,role,admin_role,deletion_requested_at,created_at,updated_at", "order=created_at.desc", "limit=500"];
    if (search) filters.push(`or=(full_name.ilike.*${encodeURIComponent(search)}*,runescape_name.ilike.*${encodeURIComponent(search)}*,contact_email.ilike.*${encodeURIComponent(search)}*)`);
    const profiles = await fetch(`${supabaseUrl()}/rest/v1/profiles?${filters.join("&")}`, { headers: serviceHeaders(), cache: "no-store" });
    const rows = await profiles.json().catch(() => []);
    if (!profiles.ok) return NextResponse.json({ error: "Customer profiles could not be loaded. Apply the account/admin migrations first." }, { status: 503 });
    return NextResponse.json({ customers: rows });
  } catch (reason) { return denied(reason); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (admin.adminRole !== "owner") throw new Response("Only the owner role may change customer access.", { status: 403 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    if (!uuid.test(id)) return NextResponse.json({ error: "Valid customer required." }, { status: 400 });
    if (id === admin.id && action === "setRole") return NextResponse.json({ error: "Use another owner account to change your own administrative role." }, { status: 409 });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (action === "resolveDeletion") updates.deletion_requested_at = null;
    else if (action === "setRole") {
      const role = typeof body?.role === "string" ? body.role : "";
      const adminRole = typeof body?.adminRole === "string" ? body.adminRole : "";
      if (!roles.has(role) || (role === "customer" && adminRole) || (role !== "customer" && !adminRoles.has(adminRole))) return NextResponse.json({ error: "Choose a valid account and administrative role." }, { status: 400 });
      updates.role = role;
      updates.admin_role = role === "customer" ? null : adminRole;
    } else return NextResponse.json({ error: "Unsupported customer action." }, { status: 400 });
    const response = await fetch(`${supabaseUrl()}/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", headers: { ...serviceHeaders(), Prefer: "return=representation" }, body: JSON.stringify(updates) });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Customer update could not be saved." }, { status: 503 });
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, { method: "POST", headers: { ...serviceHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ actor_id: admin.id, action: `customer.${action}`, entity_type: "profile", entity_id: id, details: updates }) });
    return NextResponse.json({ customer: rows[0] });
  } catch (reason) { return denied(reason); }
}
