import { NextResponse } from "next/server";
import { rateLimit, requestIp, supabaseUrl, userHeaders } from "@/lib/launch-server";

type User = { id: string };

async function authenticated(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) throw new Response("Authentication required.", { status: 401 });
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, { headers: userHeaders(authorization), cache: "no-store" });
  if (!response.ok) throw new Response("Invalid or expired session.", { status: 401 });
  return { authorization, user: await response.json() as User };
}

async function json(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) as unknown : null; }
  catch { throw new Error(`Support service returned an invalid response (${response.status}).`); }
}

export async function GET(request: Request) {
  try {
    const { authorization } = await authenticated(request);
    const response = await fetch(`${supabaseUrl()}/rest/v1/support_tickets?select=*,ticket_messages(id,author_type,body,internal,created_at)&order=updated_at.desc&ticket_messages.order=created_at.asc`, { headers: userHeaders(authorization), cache: "no-store" });
    const data = await json(response);
    if (!response.ok) return NextResponse.json({ error: response.status === 404 ? "Support tickets are not configured yet." : "Tickets could not be loaded." }, { status: response.status === 404 ? 503 : response.status });
    return NextResponse.json({ tickets: data });
  } catch (reason) {
    if (reason instanceof Response) return reason;
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Tickets could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`support-ticket:${requestIp(request)}`, 5, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many support requests. Try again later." }, { status: 429 });
  try {
    const { authorization, user } = await authenticated(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const category = typeof body?.category === "string" ? body.category.trim().toLowerCase() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const orderReference = typeof body?.orderReference === "string" ? body.orderReference.trim().toUpperCase() : "";
    const runescapeName = typeof body?.runescapeName === "string" ? body.runescapeName.trim() : "";
    if (!new Set(["payment", "delivery", "marketplace", "account", "refund", "other"]).has(category) || subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 10000) return NextResponse.json({ error: "Choose a category and enter a subject and message." }, { status: 400 });
    let orderId: string | null = null;
    if (orderReference) {
      if (!/^RV-[A-Z0-9]{6,16}$/.test(orderReference)) return NextResponse.json({ error: "Enter a valid RuneVault order reference." }, { status: 400 });
      const orderResponse = await fetch(`${supabaseUrl()}/rest/v1/orders?reference=eq.${encodeURIComponent(orderReference)}&select=id&limit=1`, { headers: userHeaders(authorization), cache: "no-store" });
      const orders = orderResponse.ok ? await json(orderResponse) as Array<{ id: string }> : [];
      if (!orders[0]) return NextResponse.json({ error: "That order was not found in your account." }, { status: 404 });
      orderId = orders[0].id;
    }
    const ticketResponse = await fetch(`${supabaseUrl()}/rest/v1/support_tickets`, { method: "POST", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify({ user_id: user.id, order_id: orderId, runescape_name: runescapeName || null, category, subject }) });
    const tickets = await json(ticketResponse) as Array<Record<string, unknown>> | null;
    if (!ticketResponse.ok || !tickets?.[0]) return NextResponse.json({ error: ticketResponse.status === 404 ? "Support tickets are not configured yet." : "Ticket creation was not permitted." }, { status: ticketResponse.status === 404 ? 503 : ticketResponse.status });
    const ticket = tickets[0];
    const messageResponse = await fetch(`${supabaseUrl()}/rest/v1/ticket_messages`, { method: "POST", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify({ ticket_id: ticket.id, author_id: user.id, author_type: "customer", body: message, internal: false }) });
    if (!messageResponse.ok) return NextResponse.json({ error: "The ticket was opened, but the message could not be saved." }, { status: 500 });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (reason) {
    if (reason instanceof Response) return reason;
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Ticket creation failed." }, { status: 500 });
  }
}
