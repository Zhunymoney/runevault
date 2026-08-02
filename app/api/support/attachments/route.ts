import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  durableRateLimit,
  requestIp,
  requirePermission,
  serviceHeaders,
  supabaseUrl,
  userHeaders,
} from "@/lib/launch-server";
import { hasValidFileSignature } from "@/lib/upload-validation";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type User = { id: string };
type Chat = {
  id: string;
  user_id: string | null;
  guest_token_hash: string | null;
};
async function json(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}
async function user(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: userHeaders(authorization),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const current = (await response.json()) as User;
  return uuid.test(current.id ?? "") ? { authorization, current } : null;
}
function equal(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function authorize(
  request: Request,
  kind: "ticket" | "chat",
  id: string,
) {
  const current = await user(request);
  if (current) {
    try {
      await requirePermission(request, "support.manage");
      return current;
    } catch {}
  }
  if (kind === "ticket") {
    if (!current) return null;
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/support_tickets?id=eq.${id}&select=id&limit=1`,
      { headers: userHeaders(current.authorization), cache: "no-store" },
    );
    const rows = response.ok
      ? ((await json(response)) as Array<{ id: string }>)
      : [];
    return rows[0] ? current : null;
  }
  const response = await fetch(
    `${supabaseUrl()}/rest/v1/chat_conversations?id=eq.${id}&select=id,user_id,guest_token_hash&limit=1`,
    { headers: serviceHeaders(), cache: "no-store" },
  );
  const row = response.ok ? ((await json(response)) as Chat[])[0] : null;
  if (!row) return null;
  if (current?.current.id === row.user_id) return current;
  const token = request.headers.get("x-chat-token") ?? "";
  if (
    token.length >= 32 &&
    row.guest_token_hash &&
    equal(
      createHash("sha256").update(token).digest("hex"),
      row.guest_token_hash,
    )
  )
    return null;
  return undefined;
}

export async function POST(request: Request) {
  const limit = await durableRateLimit(
    `support-upload:${requestIp(request)}`,
    8,
    10 * 60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429 },
    );
  try {
    const form = await request.formData();
    const kind = form.get("kind") === "chat" ? "chat" : "ticket";
    const id = String(form.get("id") ?? "");
    const file = form.get("file");
    if (!uuid.test(id) || !(file instanceof File))
      return NextResponse.json(
        { error: "Support record and file are required." },
        { status: 400 },
      );
    const extension = allowed.get(file.type);
    if (!extension)
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, or PDF file." },
        { status: 400 },
      );
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      return NextResponse.json(
        { error: "File must be no larger than 5 MB." },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidFileSignature(bytes, file.type))
      return NextResponse.json(
        { error: "The file contents do not match the selected file type." },
        { status: 400 },
      );
    const owner = await authorize(request, kind, id);
    if (owner === undefined || (kind === "ticket" && !owner))
      return NextResponse.json(
        { error: "Attachment access denied." },
        { status: 403 },
      );
    const path = `${kind}/${id}/${randomUUID()}.${extension}`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key)
      return NextResponse.json(
        { error: "Attachment storage is not configured." },
        { status: 503 },
      );
    const upload = await fetch(
      `${supabaseUrl()}/storage/v1/object/support-attachments/${path}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": file.type,
          "x-upsert": "false",
        },
        body: Buffer.from(bytes),
      },
    );
    if (!upload.ok)
      return NextResponse.json(
        { error: "Attachment upload failed." },
        { status: 503 },
      );
    const record = await fetch(`${supabaseUrl()}/rest/v1/support_attachments`, {
      method: "POST",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        ticket_id: kind === "ticket" ? id : null,
        conversation_id: kind === "chat" ? id : null,
        uploader_id: owner?.current.id ?? null,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      }),
    });
    const rows = (await json(record)) as Array<Record<string, unknown>> | null;
    if (!record.ok || !rows?.[0])
      return NextResponse.json(
        { error: "Attachment metadata could not be saved." },
        { status: 503 },
      );
    return NextResponse.json({ attachment: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Attachment upload failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const attachmentId = new URL(request.url).searchParams.get("id") ?? "";
    if (!uuid.test(attachmentId))
      return NextResponse.json(
        { error: "Valid attachment required." },
        { status: 400 },
      );
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/support_attachments?id=eq.${attachmentId}&select=*&limit=1`,
      { headers: serviceHeaders(), cache: "no-store" },
    );
    const row = response.ok
      ? (
          (await json(response)) as Array<{
            ticket_id: string | null;
            conversation_id: string | null;
            storage_path: string;
          }>
        )[0]
      : null;
    if (!row)
      return NextResponse.json(
        { error: "Attachment not found." },
        { status: 404 },
      );
    const kind = row.ticket_id ? "ticket" : "chat",
      recordId = row.ticket_id ?? row.conversation_id ?? "";
    const owner = await authorize(request, kind, recordId);
    if (owner === undefined || (kind === "ticket" && !owner))
      return NextResponse.json(
        { error: "Attachment access denied." },
        { status: 403 },
      );
    const sign = await fetch(
      `${supabaseUrl()}/storage/v1/object/sign/support-attachments/${row.storage_path}`,
      {
        method: "POST",
        headers: serviceHeaders(),
        body: JSON.stringify({ expiresIn: 300 }),
      },
    );
    const signed = (await json(sign)) as { signedURL?: string } | null;
    if (!sign.ok || !signed?.signedURL)
      return NextResponse.json(
        { error: "Attachment link could not be created." },
        { status: 503 },
      );
    return NextResponse.json({
      url: `${supabaseUrl()}/storage/v1${signed.signedURL}`,
      expiresIn: 300,
    });
  } catch {
    return NextResponse.json(
      { error: "Attachment could not be opened." },
      { status: 500 },
    );
  }
}
