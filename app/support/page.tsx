import Link from "next/link";
import { ArrowRight, Headphones, ReceiptText, Search, ShieldCheck } from "lucide-react";
import { SupportClient } from "./support-client";

const faqs = [
  ["Why does my order say pending?", "Pending means the order exists but staff has not moved it to the next stage."],
  ["Where is my receipt?", "Open the receipt page using your RuneVault order reference."],
  ["Can I change my OSRS name?", "Contact RuneVault staff before the order reaches the delivering stage."],
  ["How do crypto payments work?", "Choose BTC or USDC on Base, send the exact quoted amount to the displayed wallet, then submit your transaction ID for manual verification."],
  ["What if I sent the wrong amount or network?", "Do not send another payment. Open a payment ticket with your order reference and transaction ID so staff can review it."],
  ["When is gold delivered?", "Delivery begins after payment verification and assignment. Keep your OSRS name and preferred world current on the order."],
  ["Can I request a refund?", "Open a refund ticket. Eligibility depends on payment status, delivery progress, and the published refund policy."],
];

export default function SupportPage() {
  return (
    <main className="mx-auto min-h-[760px] max-w-6xl px-6 py-16 sm:py-20">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <Headphones size={27} />
        </div>
        <p className="mt-6 text-sm font-black uppercase tracking-[.2em] text-amber-400">RuneVault support</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Help with your OSRS gold order.</h1>
        <p className="mt-5 leading-7 text-white/45">Get help with payment, delivery, account access, or an existing order. Include your reference for the fastest review.</p>
      </section>

      <SupportClient />

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <Search className="text-amber-300" size={25} />
          <h2 className="mt-6 text-xl font-black">Track an order</h2>
          <p className="mt-3 text-sm leading-6 text-white/40">Use your RuneVault reference to see the latest order status.</p>
          <Link href="/orders" className="mt-6 inline-flex items-center gap-2 font-black text-amber-300">Open tracking <ArrowRight size={17} /></Link>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <ReceiptText className="text-amber-300" size={25} />
          <h2 className="mt-6 text-xl font-black">Customer dashboard</h2>
          <p className="mt-3 text-sm leading-6 text-white/40">Review private order history, totals, and active orders.</p>
          <Link href="/account" className="mt-6 inline-flex items-center gap-2 font-black text-amber-300">Open account <ArrowRight size={17} /></Link>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <ShieldCheck className="text-emerald-300" size={25} />
          <h2 className="mt-6 text-xl font-black">Order status help</h2>
          <p className="mt-3 text-sm leading-6 text-white/40">Pending, paid, assigned, delivering, completed, and cancelled.</p>
          <Link href="/orders" className="mt-6 inline-flex items-center gap-2 font-black text-amber-300">View status <ArrowRight size={17} /></Link>
        </article>
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <h2 className="text-3xl font-black">Frequently asked questions</h2>
          <p className="mt-4 leading-7 text-white/40">Clear answers to common questions before and after placing an order.</p>
        </div>
        <div className="space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="faq-card">
              <summary>{question}<span>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
