import { NextResponse } from "next/server";
import { requirePermission, serviceHeaders, supabaseUrl } from "@/lib/launch-server";
import { retryEmailEvent } from "@/lib/transactional-email";

export async function GET(request: Request) {
  try {
    await requirePermission(request, "analytics.read");
    const headers = serviceHeaders();
    const [runsResponse, notificationsResponse] = await Promise.all([
      fetch(`${supabaseUrl()}/rest/v1/automation_runs?select=id,job_name,status,safe_details,error_message,started_at,completed_at&order=started_at.desc&limit=200`, { headers, cache: "no-store" }),
      fetch(`${supabaseUrl()}/rest/v1/notification_events?select=id,event_type,channel,recipient,status,attempts,provider_id,error_message,created_at,last_attempt_at,sent_at&order=created_at.desc&limit=300`, { headers, cache: "no-store" }),
    ]);
    if (!runsResponse.ok || !notificationsResponse.ok) return NextResponse.json({ error: "Automation migration is required." }, { status: 503 });
    return NextResponse.json({ runs: await runsResponse.json(), notifications: await notificationsResponse.json() });
  } catch (reason) {
    if (reason instanceof Response) return NextResponse.json({ error: reason.status === 401 ? "Authentication required." : "Automation access denied." }, { status: reason.status });
    return NextResponse.json({ error: "Automation history could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission(request, "analytics.read");
    const body=await request.json().catch(()=>null) as {id?:unknown}|null;
    const id=typeof body?.id==="string"?body.id:"";
    if(!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"Valid email event required."},{status:400});
    const result=await retryEmailEvent(id);
    if(!result.sent) return NextResponse.json({error:result.reason},{status:result.reason==="not_retryable"?409:502});
    return NextResponse.json({sent:true,id:result.id});
  } catch(reason) {
    if(reason instanceof Response) return NextResponse.json({error:reason.status===401?"Authentication required.":"Automation access denied."},{status:reason.status});
    return NextResponse.json({error:"Email retry failed."},{status:500});
  }
}
