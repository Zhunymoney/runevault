import { NextResponse } from "next/server";
import { durableRateLimit, requestIp, requirePermission, supabaseUrl, userHeaders } from "@/lib/launch-server";
import { sellerStatuses, sellerTransitionError, type SellerStatus } from "@/lib/order-lifecycle";
import { adminRecipient, sendEmailEvent, sendOrderEmail, siteUrl } from "@/lib/transactional-email";

type OrderRow={id:string;user_id:string;reference:string;status:string;order_type:"buy"|"sell";seller_status:string|null;amount_m:number;total_price:number;payment_provider:string|null;payment_status:string|null};

const statuses = new Set(["pending","awaiting_payment","paid","assigned","delivering","completed","cancelled"]);

export async function GET(request: Request) {
  try {
    await requirePermission(request, "orders.read");
    const authorization = request.headers.get("authorization") ?? "";
    const response = await fetch(`${supabaseUrl()}/rest/v1/orders?select=*&order=created_at.desc`, { headers: userHeaders(authorization), cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ error: "Admin orders could not be loaded." }, { status: response.status });
    return NextResponse.json({ orders: data });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Admin request failed." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const limit = await durableRateLimit(`admin-order:${requestIp(request)}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many admin updates." }, { status: 429 });
  try {
    const admin = await requirePermission(request, "orders.update");
    const body = (await request.json().catch(() => null)) as { id?: unknown; status?: unknown; sellerStatus?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const status = typeof body?.status === "string" ? body.status : "";
    const sellerStatus = typeof body?.sellerStatus === "string" && sellerStatuses.includes(body.sellerStatus as SellerStatus) ? body.sellerStatus as SellerStatus : null;
    if (!/^[0-9a-f-]{36}$/i.test(id) || (!sellerStatus && !statuses.has(status))) return NextResponse.json({ error: "Invalid admin order update." }, { status: 400 });
    if (admin.adminRole === "fulfillment" && !sellerStatus && !new Set(["assigned", "delivering", "completed"]).has(status)) return NextResponse.json({ error: "Fulfillment staff cannot authorize seller payouts or financial exceptions." }, { status: 403 });
    const authorization = request.headers.get("authorization") ?? "";
    const beforeResponse = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}&select=id,user_id,reference,status,order_type,seller_status,amount_m,total_price,payment_provider,payment_status`, { headers: userHeaders(authorization) });
    const before = (await beforeResponse.json().catch(() => [])) as OrderRow[];
    if (sellerStatus && before[0]?.order_type !== "sell") return NextResponse.json({ error: "Seller payout status only applies to sell orders." }, { status: 400 });
    const transitionError = sellerStatus ? sellerTransitionError((before[0]?.seller_status ?? "awaiting_meetup") as SellerStatus, sellerStatus, admin.adminRole) : null;
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 409 });
    const values = sellerStatus ? { seller_status: sellerStatus, ...(sellerStatus === "payout_completed" ? { status: "completed" } : {}) } : { status };
    const response = await fetch(`${supabaseUrl()}/rest/v1/orders?id=eq.${id}`, { method: "PATCH", headers: { ...userHeaders(authorization), Prefer: "return=representation" }, body: JSON.stringify(values) });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || rows.length !== 1) return NextResponse.json({ error: "Order update was not permitted." }, { status: response.ok ? 403 : response.status });
    await fetch(`${supabaseUrl()}/rest/v1/audit_logs`, { method: "POST", headers: { ...userHeaders(authorization), Prefer: "return=minimal" }, body: JSON.stringify({ actor_id: admin.id, action: sellerStatus ? "seller.payout_status_updated" : "order.status_updated", entity_type: "order", entity_id: id, details: sellerStatus ? { previous: before[0]?.seller_status ?? null, next: sellerStatus } : { previous: before[0]?.status ?? null, next: status } }) });
    const order = rows[0] as OrderRow, nextStatus = sellerStatus === "payout_completed" ? "completed" : status;
    if (nextStatus && nextStatus !== before[0]?.status) {
      const template = nextStatus === "paid" ? (order.payment_provider === "crypto_manual" ? "crypto_received" : "card_confirmed") : nextStatus === "completed" ? "order_completed" : nextStatus === "cancelled" ? "order_cancelled" : ["assigned","delivering"].includes(nextStatus) ? "delivery_started" : null;
      const eventType = nextStatus === "paid" ? "payment_confirmed" : nextStatus === "completed" ? "order_completed" : nextStatus === "cancelled" ? "order_cancelled" : template ? "order_processing" : null;
      const summary={"Order type":order.order_type==="buy"?"Buy Gold":"Sell Gold","Gold amount":`${order.amount_m}M OSRS GP`,"Transaction total":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(order.total_price),"Payment method":order.payment_provider??"Not recorded"};
      const notifications:Promise<unknown>[]=[];
      if(template&&eventType) notifications.push(sendOrderEmail({eventKey:`${eventType}:${order.id}:${nextStatus}:${order.user_id}`,eventType,userId:order.user_id,orderId:order.id,payload:{template,input:{reference:order.reference,status:nextStatus,summary,detail:nextStatus==="cancelled"?"Contact support from your account if you need help with this order.":undefined,actionUrl:siteUrl(`/orders/${encodeURIComponent(order.reference)}`),actionLabel:"View order"}}}));
      const adminEmail=adminRecipient();
      if(nextStatus==="paid"&&adminEmail) notifications.push(sendEmailEvent({eventKey:`admin_payment_confirmed:${order.id}:admin:${adminEmail}`,eventType:"admin_payment_confirmed",recipient:adminEmail,userId:order.user_id,orderId:order.id,payload:{template:"admin_payment_confirmed",input:{reference:order.reference,status:"Paid",summary:{...summary,Source:"Administrator confirmation"},actionUrl:siteUrl("/admin"),actionLabel:"Open admin"}}}));
      await Promise.allSettled(notifications);
    }
    return NextResponse.json({ order: rows[0] });
  } catch (reason) { if (reason instanceof Response) return reason; return NextResponse.json({ error: "Admin update failed." }, { status: 500 }); }
}
