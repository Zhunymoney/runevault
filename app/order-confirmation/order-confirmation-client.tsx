"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  CreditCard,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { findOrder } from "@/lib/marketplace";
import type { Order } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";
import { createClient } from "@/lib/supabase-browser";

export function OrderConfirmationClient() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) {
      setMessage("No order reference was supplied.");
      setLoading(false);
      return;
    }

    void findOrder(reference)
      .then((result) => {
        setOrder(result);
        if (!result) setMessage("The order was created, but it could not be loaded.");

        if (result) {
          void createClient().auth.getSession().then(({ data }) => fetch("/api/notifications/order", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
            body: JSON.stringify({ reference: result.reference }),
          })).catch(() => undefined);
        }
      })
      .catch((reason) =>
        setMessage(reason instanceof Error ? reason.message : "Could not load confirmation."),
      )
      .finally(() => setLoading(false));
  }, [reference]);

  async function copyReference() {
    if (!order) return;
    await navigator.clipboard.writeText(order.reference);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
          Loading confirmation…
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-[760px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8 sm:p-12">
          <h1 className="text-4xl font-black">Confirmation unavailable</h1>
          <p className="mt-4 text-white/45">{message}</p>
          <Link href="/account" className="primary-button mt-7">
            Open account <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[760px] max-w-5xl px-6 py-14 sm:py-20">
      <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/[.045] p-7 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300/12 text-emerald-300">
          <CheckCircle2 size={34} />
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-[.2em] text-emerald-300">
          Preview order confirmed
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
          Your order is now trackable.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/45">
          Save the reference below. Payment is a separate step and the order remains unpaid until a verified provider or staff confirms it.
        </p>

        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-black/15 p-5">
          <p className="text-xs font-black uppercase tracking-[.16em] text-white/30">
            RuneVault reference
          </p>
          <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <p className="text-2xl font-black">{order.reference}</p>
            <button onClick={() => void copyReference()} className="header-button">
              <Clipboard size={16} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Order", order.order_type === "buy" ? "Buy OSRS gold" : "Sell OSRS gold"],
          ["Amount", `${order.amount_m}M`],
          ["Rate", `$${order.price_per_m.toFixed(3)} / M`],
          [
            order.order_type === "buy" ? "Estimated total" : "Estimated payout",
            `$${order.total_price.toFixed(2)}`,
          ],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
            <p className="text-xs font-black uppercase tracking-[.14em] text-white/30">{label}</p>
            <p className="mt-3 font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[.15em] text-amber-300">
              Initial status
            </p>
            <div className="mt-3">
              <StatusPill status={order.status} />
            </div>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/40">
            Do not fulfill this order until its payment is independently verified.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          {order.order_type === "buy" && (
            <Link
              href={`/pay?reference=${order.reference}`}
              className="primary-button justify-center"
            >
              <CreditCard size={18} /> Choose payment
            </Link>
          )}
          <Link
            href={`/orders/${encodeURIComponent(order.reference)}`}
            className="header-button justify-center"
          >
            <ShieldCheck size={18} /> Track
          </Link>
          <Link
            href={`/receipt?reference=${order.reference}`}
            className="header-button justify-center"
          >
            <FileText size={18} /> Receipt
          </Link>
          <Link href="/account" className="header-button justify-center">
            <LayoutDashboard size={18} /> Account
          </Link>
        </div>
      </section>
    </main>
  );
}
