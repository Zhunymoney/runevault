"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CircleDollarSign, Coins, Download, ShieldAlert, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { getAdminOrders, getCurrentProfile } from "@/lib/marketplace";
import { buildOrderReport } from "@/lib/reporting";
import type { Order, Profile } from "@/lib/types";

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("Loading analytics…");
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void Promise.all([getCurrentProfile(), getAdminOrders()]).then(([currentProfile, currentOrders]) => {
      setProfile(currentProfile); setOrders(currentOrders); setMessage("");
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Could not load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const report = useMemo(() => buildOrderReport(orders, from || undefined, to || undefined), [orders, from, to]);
  const visibleDays = report.days.slice(-31);
  const maxDay = Math.max(1, ...visibleDays.map(([, value]) => value.orders));

  function exportReport() {
    const rows = [
      ["Metric", "Value"], ["Orders", report.totalOrders], ["Paid orders", report.paidOrders],
      ["Completed", report.completedOrders], ["Cancelled", report.cancelledOrders], ["Rejected", report.rejectedOrders],
      ["Refunded", report.refundedOrders], ["Gross sales", report.grossSales.toFixed(2)],
      ["Estimated operating margin", report.estimatedProfit.toFixed(2)], ["Average order value", report.averageOrderValue.toFixed(2)],
      ["Gold sold M", report.goldSoldM], ["Gold bought M", report.goldBoughtM], ["Conversion percent", report.conversion.toFixed(2)],
      ["Repeat customers", report.repeatCustomers], ["New customers", report.newCustomers], ["Customer lifetime value", report.customerLifetimeValue.toFixed(2)],
      ["Card orders", report.payment.card], ["Crypto orders", report.payment.crypto], ["BTC orders", report.payment.btc], ["USDC orders", report.payment.usdc],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `runevault-report-${from || "all"}-${to || "today"}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  function setPreset(days: number | null) {
    if (days === null) { setFrom(""); setTo(""); return; }
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
    setFrom(start.toISOString().slice(0, 10)); setTo(end.toISOString().slice(0, 10));
  }

  if (loading || !profile || !["admin", "staff"].includes(profile.role)) return <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20"><div className="rounded-3xl border border-white/10 p-8"><h1 className="text-4xl font-black">Admin analytics</h1><p className="mt-4 text-white/45">{message || "Admin access required."}</p></div></main>;

  const cards = [
    ["Orders", report.totalOrders, ShoppingCart], ["Gross sales", `$${report.grossSales.toFixed(2)}`, CircleDollarSign],
    ["Est. margin", `$${report.estimatedProfit.toFixed(2)}`, TrendingUp], ["Average order", `$${report.averageOrderValue.toFixed(2)}`, BarChart3],
    ["Gold sold", `${report.goldSoldM}M`, Coins], ["Conversion", `${report.conversion.toFixed(1)}%`, Users],
  ] as const;
  return (
    <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-16">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">Operations analytics</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">RuneVault performance.</h1><p className="mt-3 text-sm text-white/40">Every metric below is calculated from accessible production order records. Estimated margin is gross paid buy orders minus paid seller payouts; it is not accounting profit.</p></div><button type="button" onClick={exportReport} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 font-black"><Download size={18} />Export report CSV</button></div>
      <section className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-3"><label className="text-sm font-bold text-white/45">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#0b0e14] p-3" /></label><label className="text-sm font-bold text-white/45">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#0b0e14] p-3" /></label><label className="text-sm font-bold text-white/45">Report period<select defaultValue="all" onChange={(event) => setPreset(event.target.value === "all" ? null : Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/10 bg-[#0b0e14] p-3"><option value="1">Daily</option><option value="7">Weekly</option><option value="31">Monthly</option><option value="366">Yearly</option><option value="all">All time</option></select></label></section>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><Icon className="text-amber-300" size={20} /><p className="mt-4 text-sm text-white/35">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>)}</section>
      {report.totalOrders === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-white/15 p-10 text-center"><h2 className="text-2xl font-black">Insufficient data</h2><p className="mt-3 text-white/40">No orders exist in the selected date range, so no activity or payment conclusions are shown.</p></div> : (
        <>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><h2 className="text-2xl font-black">Orders by day</h2><div className="mt-7 flex min-h-64 items-end gap-2">{visibleDays.map(([day, value]) => <div key={day} className="flex min-w-0 flex-1 flex-col items-center gap-2"><b className="text-xs">{value.orders}</b><div className="w-full rounded-t bg-amber-400" style={{ height: `${Math.max(10, (value.orders / maxDay) * 180)}px` }} /><span className="w-full truncate text-center text-[9px] text-white/30">{day.slice(5)}</span></div>)}</div></article><article className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><h2 className="text-2xl font-black">Payment breakdown</h2><div className="mt-6 space-y-3">{Object.entries(report.payment).map(([label, value]) => <div key={label} className="flex justify-between rounded-xl border border-white/10 p-3"><span className="capitalize text-white/45">{label}</span><b>{value}</b></div>)}</div></article></section>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Completed",report.completedOrders],["Cancelled",report.cancelledOrders],["Rejected",report.rejectedOrders],["Refunded",report.refundedOrders],["Gold bought",`${report.goldBoughtM}M`],["Repeat customers",report.repeatCustomers],["New customers",report.newCustomers],["Customer LTV",`$${report.customerLifetimeValue.toFixed(2)}`]].map(([label,value]) => <article key={String(label)} className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-white/35">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>)}</section>
        </>
      )}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><ShieldAlert className="text-amber-300" /><h2 className="text-2xl font-black">Risk review</h2></div><p className="mt-3 text-sm text-white/40">Heuristic flags prioritize manual review and do not replace provider fraud tools.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{report.flagged.length ? report.flagged.slice(0, 10).map((order) => <div key={order.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between"><b>{order.reference}</b><span>{order.risk_score}/100</span></div><p className="mt-2 text-sm text-white/35">{order.amount_m}M · ${order.total_price.toFixed(2)}</p></div>) : <p className="text-sm text-white/35">No orders are flagged in this range.</p>}</div></section>
    </main>
  );
}
