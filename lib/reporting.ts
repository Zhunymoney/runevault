import type { Order } from "@/lib/types";

const paidStatuses = new Set(["paid", "assigned", "delivering", "completed"]);

export function buildOrderReport(orders: Order[], from?: string, to?: string) {
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  const filtered = orders.filter((order) => {
    const time = new Date(order.created_at).getTime();
    return time >= fromTime && time <= toTime;
  });
  const paid = filtered.filter((order) => paidStatuses.has(order.status));
  const completed = filtered.filter((order) => order.status === "completed");
  const paidBuys = paid.filter((order) => order.order_type === "buy");
  const paidSells = paid.filter((order) => order.order_type === "sell");
  const customers = new Map<string, number>();
  for (const order of filtered) customers.set(order.user_id, (customers.get(order.user_id) ?? 0) + 1);
  const byDay = new Map<string, { orders: number; value: number }>();
  for (const order of filtered) {
    const day = order.created_at.slice(0, 10);
    const current = byDay.get(day) ?? { orders: 0, value: 0 };
    current.orders += 1;
    if (paidStatuses.has(order.status) && order.order_type === "buy") current.value += order.total_price;
    byDay.set(day, current);
  }
  const grossSales = paidBuys.reduce((sum, order) => sum + order.total_price, 0);
  const sellerPayouts = paidSells.reduce((sum, order) => sum + order.total_price, 0);
  const payment = { card: 0, crypto: 0, btc: 0, usdc: 0, unselected: 0 };
  for (const order of filtered) {
    if (order.payment_provider === "stripe") payment.card += 1;
    else if (order.payment_provider === "crypto_manual") payment.crypto += 1;
    else payment.unselected += 1;
    if (order.payment_asset === "BTC") payment.btc += 1;
    if (order.payment_asset === "USDC") payment.usdc += 1;
  }
  return {
    orders: filtered,
    totalOrders: filtered.length,
    paidOrders: paid.length,
    completedOrders: completed.length,
    cancelledOrders: filtered.filter((order) => order.status === "cancelled").length,
    rejectedOrders: filtered.filter((order) => order.payment_status === "rejected").length,
    refundedOrders: filtered.filter((order) => order.payment_status === "refunded" || order.payment_status === "partially_refunded").length,
    grossSales,
    estimatedProfit: grossSales - sellerPayouts,
    averageOrderValue: paid.length ? paid.reduce((sum, order) => sum + order.total_price, 0) / paid.length : 0,
    goldSoldM: completed.filter((order) => order.order_type === "buy").reduce((sum, order) => sum + order.amount_m, 0),
    goldBoughtM: completed.filter((order) => order.order_type === "sell").reduce((sum, order) => sum + order.amount_m, 0),
    conversion: filtered.length ? (paid.length / filtered.length) * 100 : 0,
    repeatCustomers: Array.from(customers.values()).filter((count) => count > 1).length,
    newCustomers: Array.from(customers.values()).filter((count) => count === 1).length,
    customerLifetimeValue: customers.size ? grossSales / customers.size : 0,
    payment,
    days: Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)),
    flagged: filtered.filter((order) => order.risk_score >= 30 || order.risk_level === "high"),
  };
}
