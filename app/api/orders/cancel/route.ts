import { NextResponse } from "next/server";
import {
  durableRateLimit,
  getOrderByReference,
  requestIp,
  requireOrderOwner,
  supabaseUrl,
  updateOrder,
  userHeaders,
} from "@/lib/launch-server";
import { sendOrderEmail, siteUrl } from "@/lib/transactional-email";

export async function POST(request: Request) {
  const limit = await durableRateLimit(
    `order-cancel:${requestIp(request)}`,
    5,
    10 * 60_000,
  );
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many cancellation attempts." },
      { status: 429 },
    );
  try {
    const body = (await request.json().catch(() => null)) as {
      reference?: unknown;
    } | null;
    const reference =
      typeof body?.reference === "string"
        ? body.reference.trim().toUpperCase()
        : "";
    if (!/^RV-[A-Z0-9]{6,16}$/.test(reference))
      return NextResponse.json(
        { error: "Invalid order reference." },
        { status: 400 },
      );
    const authorization = request.headers.get("authorization");
    const order = await getOrderByReference(reference, authorization);
    if (!order)
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const user = await requireOrderOwner(request, order);
    if (!["pending", "awaiting_payment"].includes(order.status)) {
      return NextResponse.json(
        { error: "This order can no longer be cancelled online." },
        { status: 409 },
      );
    }
    const rpc = await fetch(`${supabaseUrl()}/rest/v1/rpc/cancel_own_order`, {
      method: "POST",
      headers: userHeaders(authorization ?? ""),
      body: JSON.stringify({ p_reference: reference }),
    });
    if (!rpc.ok) {
      try {
        await updateOrder(
          order.id,
          { status: "cancelled", payment_status: "cancelled" },
          authorization,
        );
      } catch {
        await updateOrder(order.id, { status: "cancelled" }, authorization);
      }
    }
    await sendOrderEmail({eventKey:`order_cancelled:${order.id}:${user.email ?? user.id}`,eventType:"order_cancelled",recipient:user.email,userId:user.id,orderId:order.id,payload:{template:"order_cancelled",input:{reference:order.reference,status:"Cancelled",detail:"Contact support from your account if you need help with this order.",actionUrl:siteUrl(`/orders/${encodeURIComponent(order.reference)}`),actionLabel:"View order"}}});
    return NextResponse.json({
      ok: true,
      reference,
      status: "cancelled",
      message: "Order cancelled.",
    });
  } catch (reason) {
    if (reason instanceof Response) return reason;
    return NextResponse.json(
      {
        error:
          reason instanceof Error ? reason.message : "Cancellation failed.",
      },
      { status: 500 },
    );
  }
}
