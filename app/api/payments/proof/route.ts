import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { durableRateLimit, getOrderByReference, requestIp, requireOrderOwner, serviceHeaders, supabaseUrl } from "@/lib/launch-server";

export const runtime = "nodejs";
const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["application/pdf", "pdf"]]);

export async function POST(request: Request) {
  const limit = await durableRateLimit(`payment-proof:${requestIp(request)}`, 4, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many proof uploads. Try again later." }, { status: 429 });
  try {
    const form = await request.formData();
    const reference = String(form.get("reference") ?? "").trim().toUpperCase();
    const file = form.get("file");
    if (!reference || !(file instanceof File)) return NextResponse.json({ error: "Order reference and proof file are required." }, { status: 400 });
    const extension = allowedTypes.get(file.type);
    if (!extension) return NextResponse.json({ error: "Proof must be a JPEG, PNG, WebP, or PDF." }, { status: 400 });
    if (file.size < 1 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Proof must be no larger than 5 MB." }, { status: 400 });

    const authorization = request.headers.get("authorization");
    const order = await getOrderByReference(reference, authorization);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const user = await requireOrderOwner(request, order);
    const path = `${user.id}/${order.id}/${randomUUID()}.${extension}`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Proof storage is not configured.");
    const upload = await fetch(`${supabaseUrl()}/storage/v1/object/payment-proofs/${path}`, {
      method: "POST", headers: { apikey: key, "Content-Type": file.type, "x-upsert": "false" },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!upload.ok) throw new Error("Proof upload failed.");
    const record = await fetch(`${supabaseUrl()}/rest/v1/payment_proofs`, {
      method: "POST", headers: { ...serviceHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ order_id: order.id, user_id: user.id, storage_path: path, mime_type: file.type, size_bytes: file.size }),
    });
    if (!record.ok) throw new Error("Proof metadata could not be saved.");
    return NextResponse.json({ ok: true, message: "Payment proof uploaded securely." });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Proof upload failed." }, { status: 500 });
  }
}
