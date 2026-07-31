"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { getCurrentProfile, getMyOrders } from "@/lib/marketplace";
import type { Order, Profile } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getCurrentProfile(), getMyOrders()])
      .then(([currentProfile, currentOrders]) => {
        setProfile(currentProfile);
        setOrders(currentOrders);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not load account.");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const completed = orders.filter((order) => order.status === "completed");
    const active = orders.filter(
      (order) => !["completed", "cancelled"].includes(order.status),
    );
    return {
      completed: completed.length,
      active: active.length,
      volume: orders.reduce((sum, order) => sum + order.amount_m, 0),
      value: orders.reduce((sum, order) => sum + order.total_price, 0),
    };
  }, [orders]);

  if (loading) {
    return (
      <main className="mx-auto min-h-[700px] max-w-7xl px-6 py-16">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
          Loading your RuneVault dashboard…
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Customer account
          </p>
          <h1 className="mt-4 text-4xl font-black">Sign in to view your orders.</h1>
          <p className="mt-5 leading-7 text-white/45">
            {error || "Your RuneVault account is required to view private order history."}
          </p>
          <Link
            href="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black"
          >
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[760px] max-w-7xl px-6 py-14 sm:py-20">
      <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Customer dashboard
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
            {profile.full_name || "Your RuneVault account"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/45">
            Review your OSRS gold orders, totals, references, and current progress from one dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/quote?type=buy"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-black"
          >
            <ShoppingCart size={18} /> Buy gold
          </Link>
          <Link
            href="/quote?type=sell"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-[#03130d]"
          >
            <TrendingUp size={18} /> Sell gold
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "All orders", value: orders.length, icon: ReceiptText },
          { label: "Active orders", value: stats.active, icon: Clock3 },
          { label: "Completed", value: stats.completed, icon: PackageCheck },
          { label: "Total volume", value: `${stats.volume}M`, icon: Coins },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[.03] p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/40">{label}</p>
              <Icon size={19} className="text-amber-300" />
            </div>
            <p className="mt-4 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_.5fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">
                Order history
              </p>
              <h2 className="mt-2 text-2xl font-black">Recent OSRS orders</h2>
            </div>
            <Link href="/orders" className="text-sm font-bold text-white/45 hover:text-amber-300">
              Track an order
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {orders.slice(0, 8).map((order) => (
              <article
                key={order.id}
                className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 md:grid-cols-[1.2fr_.8fr_.8fr_auto] md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Reference
                  </p>
                  <b className="mt-1 block">{order.reference}</b>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Order
                  </p>
                  <p className="mt-1 capitalize">
                    {order.order_type} · {order.amount_m}M
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Total
                  </p>
                  <p className="mt-1 font-black">${order.total_price.toFixed(2)}</p>
                </div>
                <StatusPill status={order.status} />
              </article>
            ))}

            {orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
                <Coins className="mx-auto text-amber-300" size={30} />
                <h3 className="mt-4 text-xl font-black">No orders yet</h3>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  Create your first OSRS gold quote to start an order.
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black"
                >
                  Start quote <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-amber-300/15 bg-amber-300/[.055] p-6">
            <CircleDollarSign className="text-amber-300" size={28} />
            <p className="mt-5 text-sm text-white/40">Combined order value</p>
            <p className="mt-2 text-3xl font-black">${stats.value.toFixed(2)}</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
            <CheckCircle2 className="text-emerald-300" size={28} />
            <h3 className="mt-5 text-lg font-black">Private order history</h3>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Only the signed-in customer and authorized staff can access these database orders.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}
