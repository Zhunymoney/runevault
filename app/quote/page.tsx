import { CheckCircle2, LockKeyhole, Radio } from "lucide-react";
import { QuoteCard } from "@/components/quote-card";

export default function QuotePage() {
  return (
    <main className="mx-auto min-h-[700px] max-w-6xl px-6 py-14 sm:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <section>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">Live OSRS quote</p>
          <h1 className="mt-5 text-5xl font-black tracking-[-.045em]">Know the price before you order.</h1>
          <p className="mt-5 max-w-xl leading-8 text-white/50">
            Choose whether you’re buying or selling, enter the amount, and review the current estimate. You won’t send payment or gold from this screen.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              [Radio, "Real-time pricing", "Rates come from RuneVault’s live pricing configuration."],
              [LockKeyhole, "Review before checkout", "See the amount, rate, and total before creating an order."],
              [CheckCircle2, "Track every order", "Created orders receive a private reference and status timeline."],
            ].map(([Icon, title, text]) => {
              const FeatureIcon = Icon as typeof Radio;
              return <article key={String(title)} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/[.08] text-amber-300"><FeatureIcon size={19} /></span>
                <div><h2 className="font-black">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-white/40">{String(text)}</p></div>
              </article>;
            })}
          </div>
        </section>
        <QuoteCard />
      </div>
    </main>
  );
}
