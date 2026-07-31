"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Coins, Printer, ReceiptText, ShieldCheck } from "lucide-react";
import { findOrder } from "@/lib/marketplace";
import type { Order } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export function ReceiptClient() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) {
      setMessage("No RuneVault order reference was supplied.");
      setLoading(false);
      return;
    }

    void findOrder(reference)
      .then((result) => {
        setOrder(result);
        if (!result) setMessage("No accessible order matched that reference.");
      })
      .catch((reason) =>
        setMessage(reason instanceof Error ? reason.message : "Could not load receipt."),
      )
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) {
    return <main className="mx-auto min-h-[700px] max-w-4xl px-6 py-16">Loading receipt…</main>;
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8">
          <ReceiptText className="text-amber-300" size={34} />
          <h1 className="mt-5 text-4xl font-black">Receipt unavailable</h1>
          <p className="mt-4 text-white/45">{message}</p>
          <Link href="/orders" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black">
            <ArrowLeft size={18} /> Return to tracking
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-14 sm:py-20">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:hidden">
        <Link href={`/orders?reference=${order.reference}`} className="inline-flex items-center gap-2 text-sm font-bold text-white/45 hover:text-amber-300">
          <ArrowLeft size={17} /> Back to tracking
        </Link>
        <button onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 font-black text-black">
          <Printer size={17} /> Print / Save PDF
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f15] print:border-black print:bg-white print:text-black">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 p-7 sm:flex-row sm:p-10 print:border-black/15">
          <div>
            <div className="flex items-center gap-3">
              <span className="logo-mark print:border print:border-black">R</span>
              <div>
                <h1 className="text-2xl font-black">RuneVault</h1>
                <p className="text-xs font-black uppercase tracking-[.16em] text-amber-300 print:text-black">OSRS Gold Marketplace</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-white/40 print:text-black/60">Preview order receipt and transaction summary.</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-black uppercase tracking-[.16em] text-white/30 print:text-black/50">Reference</p>
            <p className="mt-2 text-xl font-black">{order.reference}</p>
            <div className="mt-3 sm:flex sm:justify-end"><StatusPill status={order.status} /></div>
          </div>
        </div>

        <div className="grid gap-px bg-white/10 print:bg-black/10 sm:grid-cols-2">
          {[
            ["Order type", order.order_type === "buy" ? "Buy OSRS gold" : "Sell OSRS gold"],
            ["Gold amount", `${order.amount_m}M`],
            ["Rate", `$${order.price_per_m.toFixed(3)} / M`],
            [order.order_type === "buy" ? "Estimated total" : "Estimated payout", `$${order.total_price.toFixed(2)}`],
            ["OSRS character", order.delivery_name || "Not supplied"],
            ["Created", new Date(order.created_at).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#0b0f15] p-6 print:bg-white">
              <p className="text-xs font-black uppercase tracking-[.14em] text-white/30 print:text-black/45">{label}</p>
              <p className="mt-3 font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 p-7 sm:grid-cols-2 sm:p-10">
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5 print:border-black/15 print:bg-white">
            <ShieldCheck className="text-emerald-300 print:text-black" size={23} />
            <h2 className="mt-4 font-black">Private order record</h2>
            <p className="mt-2 text-sm text-white/40 print:text-black/60">This receipt is linked to the signed-in customer account.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5 print:border-black/15 print:bg-white">
            <Coins className="text-amber-300 print:text-black" size={23} />
            <h2 className="mt-4 font-black">Preview receipt</h2>
            <p className="mt-2 text-sm text-white/40 print:text-black/60">This does not prove payment or in-game delivery occurred.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
