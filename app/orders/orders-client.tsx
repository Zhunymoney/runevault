"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleEllipsis,
  Clipboard,
  Coins,
  FileText,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  TimerReset,
  UserCheck,
} from "lucide-react";
import { findOrder, getOrderTimeline, getSettings } from "@/lib/marketplace";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { Order, OrderStatusHistory } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

const progress = [
  "pending",
  "awaiting_payment",
  "paid",
  "assigned",
  "delivering",
  "completed",
];

const progressIcons = {
  pending: CircleEllipsis,
  awaiting_payment: TimerReset,
  paid: BadgeDollarSign,
  assigned: UserCheck,
  delivering: Truck,
  completed: CheckCircle2,
} as const;

const statusCopy: Record<string, { title: string; text: string }> = {
  pending: {
    title: "Order received",
    text: "RuneVault has created your order and it is waiting for staff review.",
  },
  awaiting_payment: {
    title: "Awaiting payment",
    text: "Payment instructions or confirmation are still required before processing.",
  },
  paid: {
    title: "Payment confirmed",
    text: "The order is ready to be assigned for fulfillment.",
  },
  assigned: {
    title: "Order assigned",
    text: "A staff member has accepted the order and is preparing the next step.",
  },
  delivering: {
    title: "Delivery in progress",
    text: "The order is actively being fulfilled. Keep your OSRS name available.",
  },
  completed: {
    title: "Order completed",
    text: "RuneVault marked this order as completed.",
  },
  cancelled: {
    title: "Order cancelled",
    text: "This order will not continue unless staff reopens it.",
  },
};

export function OrdersClient({initialReference:referenceFromPath}:{initialReference?:string}={}) {
  const params = useSearchParams();
  const initialReference = referenceFromPath ?? params.get("reference") ?? "";
  const [reference, setReference] = useState(initialReference);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<OrderStatusHistory[]>([]);
  const [deliveryMinutes, setDeliveryMinutes] = useState<number | null>(null);

  async function searchOrder(value = reference) {
    const cleaned = value.trim().toUpperCase();
    if (!cleaned) {
      setMessage("Enter your RuneVault order reference.");
      setOrder(null);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const result = await findOrder(cleaned);
      setOrder(result);
      setTimeline(result ? await getOrderTimeline(result) : []);
      if (!result) setMessage("No accessible order matched that reference.");
    } catch (reason) {
      setOrder(null);
      setMessage(reason instanceof Error ? reason.message : "Could not search for that order.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void getSettings().then((settings) => setDeliveryMinutes(settings.estimated_delivery_minutes ?? null)).catch(() => setDeliveryMinutes(null));
    if (initialReference) void searchOrder(initialReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReference]);

  const orderId = order?.id;

  useEffect(() => {
    if (!orderId || !isSupabaseConfigured()) {
      setLiveConnected(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`runevault-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          const normalizedOrder = { ...updatedOrder, payment_asset: updatedOrder.payment_asset ?? updatedOrder.crypto_asset ?? null, transaction_id: updatedOrder.transaction_id ?? updatedOrder.payment_id ?? null };
          setOrder(normalizedOrder);
          void getOrderTimeline(normalizedOrder).then(setTimeline);
          setLastLiveUpdate(new Date().toLocaleTimeString());
          setMessage("Order updated live.");
        },
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
      setLiveConnected(false);
    };
  }, [orderId]);

  const activeIndex = order
    ? order.status === "cancelled"
      ? -1
      : progress.indexOf(order.status)
    : -1;

  const statusInfo = order ? statusCopy[order.status] ?? statusCopy.pending : null;
  const nextStatus = order && order.status !== "cancelled" && activeIndex >= 0 && activeIndex < progress.length - 1
    ? progress[activeIndex + 1].replaceAll("_", " ")
    : order?.status === "completed" ? "No further action" : "Staff review";

  const progressPercent = useMemo(() => {
    if (!order || order.status === "cancelled") return 0;
    if (activeIndex < 0) return 0;
    return Math.round(((activeIndex + 1) / progress.length) * 100);
  }, [activeIndex, order]);

  return (
    <main className="mx-auto min-h-[760px] max-w-6xl px-6 py-16 sm:py-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
          Order tracking
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
          Track your OSRS gold order.
        </h1>
        <p className="mt-5 leading-7 text-white/45">
          Enter the reference supplied when your RuneVault order was created.
        </p>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl bg-black/20 px-4">
            <Search size={19} className="text-white/30" />
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") void searchOrder();
              }}
              placeholder="Example: RV-ABC123"
              className="min-h-12 w-full bg-transparent font-bold uppercase outline-none placeholder:normal-case placeholder:text-white/25"
            />
          </div>

          <button
            onClick={() => void searchOrder()}
            disabled={busy}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 font-black text-black shadow-[0_12px_30px_rgba(245,158,11,.16)] transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? "Searching…" : "Find order"} <ArrowRight size={18} />
          </button>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/55">
            {message}
          </p>
        )}
      </section>

      {order && statusInfo && (
        <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025]">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/30">
                RuneVault reference
              </p>

              <div className="mt-2 flex items-center gap-3">
                <h2 className="text-2xl font-black">{order.reference}</h2>
                <button
                  title="Copy reference"
                  onClick={() => void navigator.clipboard.writeText(order.reference)}
                  className="rounded-lg border border-white/10 p-2 text-white/40 hover:text-white"
                >
                  <Clipboard size={16} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
                    liveConnected
                      ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200"
                      : "border-white/10 bg-white/[.03] text-white/35"
                  }`}
                >
                  <Radio size={14} />
                  {liveConnected ? "Live updates connected" : "Live updates connecting"}
                </span>

                {lastLiveUpdate && (
                  <span className="text-xs font-bold text-white/30">
                    Last live update: {lastLiveUpdate}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <StatusPill status={order.status} />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void searchOrder(order.reference)}
                  className="inline-flex items-center gap-2 text-sm font-black text-white/45 hover:text-white"
                >
                  <RefreshCw size={16} /> Refresh
                </button>

                <Link
                  href={`/receipt?reference=${order.reference}`}
                  className="inline-flex items-center gap-2 text-sm font-black text-amber-300"
                >
                  <FileText size={16} /> View receipt
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Order type", order.order_type === "buy" ? "Buy OSRS gold" : "Sell OSRS gold"],
              ["Gold amount", `${order.amount_m}M`],
              ["Rate", `$${order.price_per_m.toFixed(3)} / M`],
              [order.order_type === "buy" ? "Total price" : "Estimated payout", `$${order.total_price.toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0a0d13] p-6">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">{label}</p>
                <p className="mt-3 font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.045] p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-amber-300">
                    Current stage
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{statusInfo.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                    {statusInfo.text}
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/20 text-2xl font-black text-amber-300">
                  {progressPercent}%
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {order.status === "cancelled" ? (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[.06] p-5">
                <p className="font-black text-red-200">This order was cancelled.</p>
                <p className="mt-2 text-sm text-white/40">
                  Contact support if you believe this status is incorrect.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-6">
                {progress.map((status, index) => {
                  const complete = index <= activeIndex;
                  const StageIcon = progressIcons[status as keyof typeof progressIcons];

                  return (
                    <div
                      key={status}
                      className={`rounded-2xl border p-4 ${
                        complete
                          ? "border-amber-300/25 bg-amber-300/[.07]"
                          : "border-white/8 bg-white/[.018]"
                      }`}
                    >
                      <StageIcon
                        size={19}
                        className={`${complete ? "text-amber-300" : "text-white/15"} transition duration-500 ${index === activeIndex ? "scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,.45)]" : ""}`}
                      />
                      <p
                        className={`mt-3 text-xs font-black capitalize ${
                          complete ? "text-white" : "text-white/25"
                        }`}
                      >
                        {status.replaceAll("_", " ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                <Coins className="text-amber-300" size={22} />
                <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-white/30">
                  OSRS name
                </p>
                <p className="mt-2 font-bold">{order.delivery_name || "Not supplied"}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                <ShieldCheck className="text-emerald-300" size={22} />
                <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-white/30">
                  Created
                </p>
                <p className="mt-2 font-bold">{new Date(order.created_at).toLocaleString()}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                <TimerReset className="text-sky-300" size={22} />
                <p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-white/30">
                  Last updated
                </p>
                <p className="mt-2 font-bold">{new Date(order.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-5">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-300">Estimated next step</p>
                <p className="mt-2 font-black capitalize">{nextStatus}</p>
                <p className="mt-2 text-sm text-white/40">The timeline updates when authorized staff advances the order.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">Configured delivery estimate</p>
                <p className="mt-2 font-black">{deliveryMinutes ? `About ${deliveryMinutes} minutes` : "Shown during checkout"}</p>
                <p className="mt-2 text-sm text-white/40">An estimate, not a guarantee; payment review or meetup coordination can affect timing.</p>
              </article>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-black/10 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">Payment</p><p className="mt-2 font-black capitalize">{order.payment_provider === "stripe" ? "Card" : order.payment_asset ? order.payment_asset : "Not selected"}</p><p className="mt-2 text-sm text-white/40">{order.payment_status?.replaceAll("_", " ") ?? "Awaiting selection"}</p></article>
              <article className="rounded-2xl border border-white/10 bg-black/10 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">Verification</p><p className="mt-2 font-black">{["paid","assigned","delivering","completed"].includes(order.status) ? "Verified" : order.payment_status === "customer_marked_sent" ? "Pending verification" : "Not submitted"}</p><p className="mt-2 text-sm text-white/40">Transaction details are visible only to you and authorized staff.</p></article>
              <article className="rounded-2xl border border-white/10 bg-black/10 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">{order.order_type === "sell" ? "Seller payout" : "Assignment / delivery"}</p><p className="mt-2 font-black capitalize">{order.order_type === "sell" ? order.seller_status?.replaceAll("_", " ") ?? "Awaiting meetup" : order.status === "assigned" ? "Assigned" : order.status === "delivering" ? "Delivery active" : order.status === "completed" ? "Completed" : "Not assigned"}</p></article>
            </div>

            <section className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5"><h3 className="text-xl font-black">Order timeline</h3><div className="mt-5 space-y-4">{timeline.map((event) => <div key={event.id} className="grid gap-2 border-l-2 border-amber-300/40 pl-4 sm:grid-cols-[180px_1fr]"><time className="text-xs font-bold text-white/35">{new Date(event.created_at).toLocaleString()}</time><div><b className="capitalize">{event.status.replaceAll("_", " ")}</b>{event.customer_message ? <p className="mt-1 text-sm text-white/40">{event.customer_message}</p> : null}</div></div>)}</div></section>

            <div className="mt-7 flex flex-wrap gap-3"><Link href={`/checkout?type=${order.order_type}&amount=${order.amount_m}&name=${encodeURIComponent(order.delivery_name ?? "")}`} className="primary-button">Reorder</Link><Link href={`/support?reference=${order.reference}`} className="header-button">Contact support about this order</Link>{order.order_type === "buy" && ["pending","awaiting_payment"].includes(order.status) ? <Link href={`/pay?reference=${order.reference}`} className="header-button">Retry payment</Link> : null}</div>
          </div>
        </section>
      )}

      <section className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl border border-white/10 bg-white/[.025] p-6 text-center sm:flex-row sm:text-left">
        <div>
          <h3 className="text-xl font-black">Need a new quote?</h3>
          <p className="mt-2 text-sm text-white/40">
            Use the OSRS calculator to create another buy or sell order.
          </p>
        </div>

        <Link
          href="/quote"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-black"
        >
          Open calculator <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
