import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  requirePermission,
  serviceHeaders,
  supabaseUrl,
} from "@/lib/launch-server";
const uuid = /^[0-9a-f-]{36}$/i;
function iso(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
export async function GET(request: Request) {
  try {
    await requirePermission(request, "marketing.manage");
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/marketplace_announcements?select=*&order=created_at.desc&limit=200`,
      { headers: serviceHeaders(), cache: "no-store" },
    );
    if (!response.ok)
      return NextResponse.json(
        { error: "Announcement migration is required." },
        { status: 503 },
      );
    return NextResponse.json({ announcements: await response.json() });
  } catch (reason) {
    if (reason instanceof Response)
      return NextResponse.json(
        { error: "Admin access denied." },
        { status: reason.status },
      );
    return NextResponse.json(
      { error: "Announcement request failed." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const limit = await durableRateLimit(
    `admin-announcement:${requestIp(request)}`,
    30,
    60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many announcement updates." },
      { status: 429 },
    );
  try {
    const admin = await requirePermission(request, "marketing.manage");
    const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null,
      id = typeof body?.id === "string" && uuid.test(body.id) ? body.id : null,
      title = typeof body?.title === "string" ? body.title.trim() : "",
      message = typeof body?.body === "string" ? body.body.trim() : "",
      severity = new Set(["info", "success", "warning", "critical"]).has(
        String(body?.severity),
      )
        ? String(body?.severity)
        : "info",
      starts = iso(body?.startsAt) ?? new Date().toISOString(),
      ends = iso(body?.endsAt);
    if (
      title.length < 3 ||
      title.length > 160 ||
      message.length < 3 ||
      message.length > 2000 ||
      starts === undefined ||
      ends === undefined ||
      (ends && ends <= starts)
    )
      return NextResponse.json(
        { error: "Enter valid announcement content and dates." },
        { status: 400 },
      );
    const values = {
      title,
      body: message,
      severity,
      active: body?.active !== false,
      starts_at: starts,
      ends_at: ends,
      created_by: admin.id,
      updated_at: new Date().toISOString(),
    };
    const response = await fetch(
        `${supabaseUrl()}/rest/v1/marketplace_announcements${id ? `?id=eq.${id}` : ""}`,
        {
          method: id ? "PATCH" : "POST",
          headers: { ...serviceHeaders(), Prefer: "return=representation" },
          body: JSON.stringify(values),
        },
      ),
      rows = (await response.json().catch(() => [])) as unknown[];
    if (!response.ok || !rows[0])
      return NextResponse.json(
        { error: "Announcement could not be saved." },
        { status: 503 },
      );
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, {
      method: "POST",
      headers: { ...serviceHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: admin.id,
        action: id ? "announcement.updated" : "announcement.created",
        entity_type: "announcement",
        entity_id: (rows[0] as { id: string }).id,
        details: { title, severity, active: values.active },
      }),
    });
    return NextResponse.json(
      { announcement: rows[0] },
      { status: id ? 200 : 201 },
    );
  } catch (reason) {
    if (reason instanceof Response)
      return NextResponse.json(
        { error: "Admin access denied." },
        { status: reason.status },
      );
    return NextResponse.json(
      { error: "Announcement update failed." },
      { status: 500 },
    );
  }
}
