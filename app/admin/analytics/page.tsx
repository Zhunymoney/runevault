"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  Coins,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { getAdminOrders, getCurrentProfile } from "@/lib/marketplace";
import type { Order, Profile } from "@/lib/types";

type ExtendedOrder = Order & {
  risk_score?: number | null;
  risk_level?: string | null;
  payment_provider?: string | null;
  payment_status?: string | null;
};

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [message, setMessage] = useState("Loading analytics…");

  useEffect(() => {
    void Promise.all([getCurrentProfile(), getAdminOrders()])
      .then(([currentProfile, currentOrders]) => {
        setProfile(currentProfile);
        setOrders(currentOrders as ExtendedOrder[]);
        setMessage("");
      })
      .catch((reason) =>
        setMessage(reason instanceof Error ? reason.message : "Could not load analytics."),
      );
  }, []);

  const data = useMemo(() => {
    const paidStatuses = new Set(["paid", "assigned", "delivering", "completed"]);
    const paid = orders.filter((order) => paidStatuses.has(order.status));
    const completed = orders.filter((order) => order.status === "completed");
    const flagged = orders.filter(
      (order) => (order.risk_score ?? 0) >= 30 || order.risk_level === "high",
    );

    const byDay = new Map<string, number>();
    for (const order of orders) {
      const day = new Date(order.created_at).toLocaleDateString();
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    return {
      total: orders.length,
      paid: paid.length,
      completed: completed.length,
      revenue: paid
        .filter((order) => order.order_type === "buy")
        .reduce((sum, order) => sum + Number(order.total_price), 0),
      volume: orders.reduce((sum, order) => sum + Number(order.amount_m), 0),
      flagged,
      days: Array.from(byDay.entries()).slice(-14),
      conversion: orders.length ? Math.round((paid.length / orders.length) * 100) : 0,
    };
  }, [orders]);

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return (
      <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 p-8">
          <h1 className="text-4xl font-black">Admin analytics</h1>
          <p className="mt-4 text-white/45">{message || "Admin access required."}</p>
        </div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...data.days.map(([, count]) => count));

  return (
    <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-16">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
        Operations analytics
      </p>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">RuneVault performance.</h1>

      <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Orders", data.total, ShoppingCart],
          ["Paid", data.paid, CircleDollarSign],
          ["Completed", data.completed, TrendingUp],
          ["Gold volume", `${data.volume}M`, Coins],
          ["Paid value", `$${data.revenue.toFixed(2)}`, BarChart3],
          ["Conversion", `${data.conversion}%`, TrendingUp],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <Icon className="text-amber-300" size={20} />
            <p className="mt-4 text-sm text-white/35">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
          <h2 className="text-2xl font-black">Orders by day</h2>
          <div className="mt-7 flex min-h-64 items-end gap-3">
            {data.days.length === 0 ? (
              <p className="self-center text-white/35">No order data yet.</p>
            ) : (
              data.days.map(([day, count]) => (
                <div key={day} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                  <b>{count}</b>
                  <div
                    className="w-full rounded-t-lg bg-amber-400"
                    style={{ height: `${Math.max(12, (count / maxDay) * 180)}px` }}
                  />
                  <span className="w-full truncate text-center text-[10px] text-white/30">
                    {day}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-amber-300" size={24} />
            <h2 className="text-2xl font-black">Risk review</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/40">
            Heuristic flags help prioritize manual review. They do not replace a payment provider’s fraud tools.
          </p>

          <div className="mt-6 space-y-3">
            {data.flagged.length === 0 ? (
              <p className="rounded-xl border border-white/10 p-4 text-sm text-white/35">
                No orders are currently flagged.
              </p>
            ) : (
              data.flagged.slice(0, 8).map((order) => (
                <div key={order.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <b>{order.reference}</b>
                    <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">
                      {order.risk_score ?? 0}/100
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/35">
                    {order.amount_m}M · ${Number(order.total_price).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
