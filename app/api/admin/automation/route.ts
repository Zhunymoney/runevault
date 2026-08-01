import { NextResponse } from "next/server";
import { requireAdmin, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!new Set(["owner", "manager", "analytics"]).has(admin.adminRole ?? "") && !(admin.role === "admin" && !admin.adminRole)) throw new Response("Automation access denied.", { status: 403 });
    const headers = serviceHeaders();
    const [runsResponse, notificationsResponse] = await Promise.all([
      fetch(`${supabaseUrl()}/rest/v1/automation_runs?select=id,job_name,status,safe_details,error_message,started_at,completed_at&order=started_at.desc&limit=200`, { headers, cache: "no-store" }),
      fetch(`${supabaseUrl()}/rest/v1/notification_events?select=id,event_type,channel,status,attempts,provider_id,error_message,created_at,sent_at&order=created_at.desc&limit=300`, { headers, cache: "no-store" }),
    ]);
    if (!runsResponse.ok || !notificationsResponse.ok) return NextResponse.json({ error: "Automation migration is required." }, { status: 503 });
    return NextResponse.json({ runs: await runsResponse.json(), notifications: await notificationsResponse.json() });
  } catch (reason) {
    if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Automation access denied." }, { status: reason.status });
    return NextResponse.json({ error: "Automation history could not be loaded." }, { status: 500 });
  }
}
