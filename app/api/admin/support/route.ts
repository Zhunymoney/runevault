import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  requirePermission,
  serviceHeaders,
  supabaseUrl,
} from "@/lib/launch-server";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error(
      `Support database returned an invalid response (${response.status}).`,
    );
  }
}
function error(reason: unknown) {
  if (reason instanceof Response)
    return NextResponse.json(
      {
        error:
          reason.status === 401
            ? "Authentication required."
            : "Admin access denied.",
      },
      { status: reason.status },
    );
  return NextResponse.json(
    { error: "Admin support request failed." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "support.manage");
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
    const status = (url.searchParams.get("status") ?? "all").trim();
    const headers = serviceHeaders();
    const [ticketResponse, chatResponse] = await Promise.all([
      fetch(
        `${supabaseUrl()}/rest/v1/support_tickets?select=*,ticket_messages(id,author_type,body,internal,created_at)&order=updated_at.desc&ticket_messages.order=created_at.asc&limit=200`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${supabaseUrl()}/rest/v1/chat_conversations?select=*,chat_messages(id,sender_type,body,internal,read_at,created_at)&order=updated_at.desc&chat_messages.order=created_at.asc&limit=200`,
        { headers, cache: "no-store" },
      ),
    ]);
    if (!ticketResponse.ok || !chatResponse.ok)
      return NextResponse.json(
        { error: "Support tables are not configured yet." },
        { status: 503 },
      );
    let tickets = (await json(ticketResponse)) as Array<
      Record<string, unknown>
    >;
    let chats = (await json(chatResponse)) as Array<Record<string, unknown>>;
    if (status !== "all") {
      tickets = tickets.filter((item) => item.status === status);
      chats = chats.filter((item) => item.status === status);
    }
    if (search) {
      const needle = search.toLowerCase();
      const matches = (item: Record<string, unknown>) =>
        [
          item.ticket_number,
          item.subject,
          item.guest_email,
          item.customer_name,
          item.email,
          item.runescape_name,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(needle),
        );
      tickets = tickets.filter(matches);
      chats = chats.filter(matches);
    }
    return NextResponse.json({ tickets, chats });
  } catch (reason) {
    return error(reason);
  }
}

export async function PATCH(request: Request) {
  const limit = await durableRateLimit(`admin-support:${requestIp(request)}`, 60, 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many support updates." },
      { status: 429 },
    );
  try {
    const admin = await requirePermission(request, "support.manage");
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const kind = body?.kind === "chat" ? "chat" : "ticket";
    const id = typeof body?.id === "string" ? body.id : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    const internal = body?.internal === true;
    const status = typeof body?.status === "string" ? body.status : "";
    const assignedTo =
      typeof body?.assignedTo === "string" && uuid.test(body.assignedTo)
        ? body.assignedTo
        : null;
    if (!uuid.test(id))
      return NextResponse.json(
        { error: "Valid support record required." },
        { status: 400 },
      );
    const allowed =
      kind === "chat"
        ? new Set(["open", "pending", "resolved", "blocked"])
        : new Set(["open", "pending", "resolved", "closed"]);
    if (status && !allowed.has(status))
      return NextResponse.json(
        { error: "Invalid support status." },
        { status: 400 },
      );
    const headers = serviceHeaders();
    const table = kind === "chat" ? "chat_conversations" : "support_tickets";
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status) updates.status = status;
    if (assignedTo) updates.assigned_to = assignedTo;
    if (message && message.length <= 10000) {
      const messageTable =
        kind === "chat" ? "chat_messages" : "ticket_messages";
      const values =
        kind === "chat"
          ? {
              conversation_id: id,
              sender_id: admin.id,
              sender_type: "staff",
              body: message,
              internal,
            }
          : {
              ticket_id: id,
              author_id: admin.id,
              author_type: "staff",
              body: message,
              internal,
            };
      const response = await fetch(`${supabaseUrl()}/rest/v1/${messageTable}`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(values),
      });
      if (!response.ok)
        return NextResponse.json(
          { error: "Staff reply could not be saved." },
          { status: 503 },
        );
      if (kind === "chat")
        updates.last_staff_message_at = new Date().toISOString();
    } else if (message.length > 10000)
      return NextResponse.json(
        { error: "Reply is too long." },
        { status: 400 },
      );
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/${table}?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(updates),
      },
    );
    const rows = (await json(response)) as Array<
      Record<string, unknown>
    > | null;
    if (!response.ok || !rows?.[0])
      return NextResponse.json(
        { error: "Support update could not be saved." },
        { status: 503 },
      );
    return NextResponse.json({ record: rows[0] });
  } catch (reason) {
    return error(reason);
  }
}
