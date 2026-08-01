import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  serviceHeaders,
  supabaseUrl,
  userHeaders,
} from "@/lib/launch-server";

type User = { id: string; email?: string };
type Conversation = {
  id: string;
  user_id: string | null;
  guest_token_hash: string | null;
  customer_name: string;
  email: string;
  status: string;
  rating?: number | null;
  rating_comment?: string | null;
  created_at: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function sameHash(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error(
      `Chat service returned an invalid response (${response.status}).`,
    );
  }
}

async function session(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: userHeaders(authorization),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = (await response.json()) as User;
  return uuid.test(user.id ?? "") ? { authorization, user } : null;
}
async function getConversation(id: string) {
  if (!uuid.test(id)) return null;
  const response = await fetch(
    `${supabaseUrl()}/rest/v1/chat_conversations?id=eq.${id}&select=*&limit=1`,
    { headers: serviceHeaders(), cache: "no-store" },
  );
  if (!response.ok) return null;
  return ((await json(response)) as Conversation[])[0] ?? null;
}
async function authorize(request: Request, row: Conversation) {
  const current = await session(request);
  if (current?.user.id === row.user_id) return current;
  const token = request.headers.get("x-chat-token") ?? "";
  if (
    token.length >= 32 &&
    row.guest_token_hash &&
    sameHash(hash(token), row.guest_token_hash)
  )
    return null;
  throw new Response("Conversation access denied.", { status: 403 });
}

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const row = await getConversation(id);
    if (!row)
      return NextResponse.json(
        { error: "Conversation not found or chat is not configured." },
        { status: 404 },
      );
    await authorize(request, row);
    const [response, attachmentsResponse] = await Promise.all([fetch(
      `${supabaseUrl()}/rest/v1/chat_messages?conversation_id=eq.${id}&internal=eq.false&select=id,sender_type,body,read_at,created_at&order=created_at.asc`,
      { headers: serviceHeaders(), cache: "no-store" },
    ), fetch(`${supabaseUrl()}/rest/v1/support_attachments?conversation_id=eq.${id}&select=id,mime_type,size_bytes,created_at&order=created_at.asc`, { headers: serviceHeaders(), cache: "no-store" })]);
    if (!response.ok)
      return NextResponse.json(
        { error: "Conversation messages could not be loaded." },
        { status: 503 },
      );
    return NextResponse.json({
      conversation: {
        id: row.id,
        customerName: row.customer_name,
        status: row.status,
        rating: row.rating ?? null,
        ratingComment: row.rating_comment ?? null,
        createdAt: row.created_at,
      },
      messages: await json(response),
      attachments: attachmentsResponse.ok ? await json(attachmentsResponse) : [],
      availability: process.env.SUPPORT_AVAILABILITY ?? "offline",
      responseTime:
        process.env.SUPPORT_RESPONSE_TIME ??
        "We usually reply within one business day.",
    });
  } catch (reason) {
    if (reason instanceof Response)
      return NextResponse.json(
        { error: (await reason.text()) || "Conversation access denied." },
        { status: reason.status },
      );
    return NextResponse.json(
      { error: "Chat could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const limit = await durableRateLimit(`chat-start:${requestIp(request)}`, 4, 10 * 60_000);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many chat requests. Try again later." },
      { status: 429 },
    );
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const runescapeName =
      typeof body?.runescapeName === "string" ? body.runescapeName.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    const orderReference =
      typeof body?.orderReference === "string"
        ? body.orderReference.trim().toUpperCase()
        : "";
    if (
      name.length < 2 ||
      name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      runescapeName.length > 12 ||
      message.length < 5 ||
      message.length > 10000
    )
      return NextResponse.json(
        { error: "Enter a valid name, email, and message." },
        { status: 400 },
      );
    const current = await session(request);
    let orderId: string | null = null;
    if (orderReference && current) {
      if (!/^RV-[A-Z0-9]{6,16}$/.test(orderReference))
        return NextResponse.json(
          { error: "Enter a valid RuneVault order reference." },
          { status: 400 },
        );
      const orderResponse = await fetch(
        `${supabaseUrl()}/rest/v1/orders?reference=eq.${encodeURIComponent(orderReference)}&select=id&limit=1`,
        { headers: userHeaders(current.authorization), cache: "no-store" },
      );
      const orders = orderResponse.ok
        ? ((await json(orderResponse)) as Array<{ id: string }>)
        : [];
      if (!orders[0])
        return NextResponse.json(
          { error: "That order was not found in your account." },
          { status: 404 },
        );
      orderId = orders[0].id;
    }
    const token = current ? "" : randomBytes(32).toString("base64url");
    const now = new Date().toISOString();
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/chat_conversations`,
      {
        method: "POST",
        headers: { ...serviceHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: current?.user.id ?? null,
          guest_token_hash: token ? hash(token) : null,
          customer_name: name,
          email: current?.user.email ?? email,
          runescape_name: runescapeName || null,
          order_id: orderId,
          last_customer_message_at: now,
          updated_at: now,
        }),
      },
    );
    const rows = (await json(response)) as Conversation[] | null;
    if (!response.ok || !rows?.[0])
      return NextResponse.json(
        { error: "Live chat is not configured yet." },
        { status: 503 },
      );
    const row = rows[0];
    const messageResponse = await fetch(
      `${supabaseUrl()}/rest/v1/chat_messages`,
      {
        method: "POST",
        headers: { ...serviceHeaders(), Prefer: "return=representation" },
        body: JSON.stringify({
          conversation_id: row.id,
          sender_id: current?.user.id ?? null,
          sender_type: "customer",
          body: message,
          internal: false,
        }),
      },
    );
    if (!messageResponse.ok)
      return NextResponse.json(
        {
          error:
            "Conversation opened, but the first message could not be saved.",
        },
        { status: 500 },
      );
    return NextResponse.json(
      {
        conversation: {
          id: row.id,
          status: row.status,
          createdAt: row.created_at,
        },
        token: token || undefined,
        availability: process.env.SUPPORT_AVAILABILITY ?? "offline",
        responseTime:
          process.env.SUPPORT_RESPONSE_TIME ??
          "We usually reply within one business day.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Chat could not be started." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const limit = await durableRateLimit(
    `chat-message:${requestIp(request)}`,
    30,
    10 * 60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many chat updates. Try again later." },
      { status: 429 },
    );
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const id =
      typeof body?.conversationId === "string" ? body.conversationId : "";
    const action = typeof body?.action === "string" ? body.action : "message";
    const row = await getConversation(id);
    if (!row)
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    const current = await authorize(request, row);
    if (row.status === "blocked")
      return NextResponse.json(
        { error: "This conversation is blocked." },
        { status: 403 },
      );
    if (action === "rate") {
      const rating = Number(body?.rating);
      const comment =
        typeof body?.comment === "string"
          ? body.comment.trim().slice(0, 1000)
          : null;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        return NextResponse.json(
          { error: "Choose a rating from 1 to 5." },
          { status: 400 },
        );
      const response = await fetch(
        `${supabaseUrl()}/rest/v1/chat_conversations?id=eq.${id}`,
        {
          method: "PATCH",
          headers: { ...serviceHeaders(), Prefer: "return=representation" },
          body: JSON.stringify({
            rating,
            rating_comment: comment,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!response.ok)
        return NextResponse.json(
          { error: "Rating could not be saved." },
          { status: 503 },
        );
      return NextResponse.json({ ok: true });
    }
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    if (message.length < 1 || message.length > 10000)
      return NextResponse.json(
        { error: "Enter a message up to 10,000 characters." },
        { status: 400 },
      );
    const response = await fetch(`${supabaseUrl()}/rest/v1/chat_messages`, {
      method: "POST",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        conversation_id: id,
        sender_id: current?.user.id ?? null,
        sender_type: "customer",
        body: message,
        internal: false,
      }),
    });
    const messages = (await json(response)) as Array<
      Record<string, unknown>
    > | null;
    if (!response.ok || !messages?.[0])
      return NextResponse.json(
        { error: "Message could not be saved." },
        { status: 503 },
      );
    await fetch(`${supabaseUrl()}/rest/v1/chat_conversations?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...serviceHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "open",
        last_customer_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return NextResponse.json({ message: messages[0] });
  } catch (reason) {
    if (reason instanceof Response)
      return NextResponse.json(
        { error: (await reason.text()) || "Conversation access denied." },
        { status: reason.status },
      );
    return NextResponse.json({ error: "Chat update failed." }, { status: 500 });
  }
}
