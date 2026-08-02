import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coins,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
  Radio,
} from "lucide-react";
import { QuoteCard } from "@/components/quote-card";
import { JsonLd } from "@/components/structured-data";
import { LiveMarketStatus } from "@/components/live-market-status";

const benefits = [
  { icon: Clock3, title: "Fast order flow", text: "Create an OSRS gold quote in seconds and receive a trackable order reference." },
  { icon: ShieldCheck, title: "Secure checkout", text: "Review the live rate and final estimate before entering payment or payout details." },
  { icon: TrendingUp, title: "Competitive rates", text: "Buy and sell prices are managed from the existing RuneVault admin dashboard." },
  { icon: Headphones, title: "Professional support", text: "Order-linked chat and support tickets keep help attached to the right customer and order." },
  { icon: Radio, title: "Real-time tracking", text: "Follow database-backed status milestones and live order updates from one private page." },
  { icon: Coins, title: "OSRS only", text: "A focused quote, payment, delivery, and support workflow built specifically for Old School RuneScape." },
];

const steps = [
  { number: "01", title: "Choose buy or sell", text: "Select whether you want to buy OSRS gold or sell your gold to RuneVault." },
  { number: "02", title: "Enter your amount", text: "Use the instant calculator to see your estimated total before creating the order." },
  { number: "03", title: "Track the order", text: "Sign in, create the order, and follow its status using your RuneVault reference." },
];

const faqs = [
  ["Does RuneVault support RS3?", "No. RuneVault exclusively supports Old School RuneScape gold."],
  ["Can I buy and sell OSRS gold?", "Yes. Choose Buy Gold or Sell Gold in the calculator to receive an instant estimate."],
  ["Can I track an order?", "Yes. Created orders receive a RuneVault reference that can be viewed from the tracking page and your account."],
  ["How are payments handled?", "Supported buy orders can use configured card checkout or BTC and USDC on Base. Crypto submissions remain pending until staff verifies the on-chain transaction."],
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <JsonLd data={{"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(([question,answer])=>({"@type":"Question",name:question,acceptedAnswer:{"@type":"Answer",text:answer}}))}} />
      <section className="relative">
        <div className="hero-grid absolute inset-0 opacity-50" />
        <div className="hero-glow absolute left-1/2 top-0 h-[560px] w-[960px] -translate-x-1/2 rounded-full" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-[.92fr_1.08fr] lg:py-16">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> OSRS Gold Marketplace
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.92] tracking-[-.06em] sm:text-6xl lg:text-[5.25rem]">
              Buy and sell
              <span className="gold-text block">OSRS gold.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58">
              Review live rates, create a secure order, and follow every status update from one private account—built exclusively for Old School RuneScape.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote?type=buy" className="primary-button">
                Buy OSRS Gold <ArrowRight size={18} />
              </Link>
              <Link href="/quote?type=sell" className="sell-button">
                Sell OSRS Gold <TrendingUp size={18} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-white/55" aria-label="RuneVault order protections">
              <span className="trust-chip"><TrendingUp size={15} /> Live pricing</span>
              <span className="trust-chip"><LockKeyhole size={15} /> Secure checkout</span>
              <span className="trust-chip"><ShieldCheck size={15} /> Manual fraud review</span>
              <span className="trust-chip"><Radio size={15} /> Live tracking</span>
              <span className="trust-chip"><Headphones size={15} /> Professional support</span>
            </div>
          </div>

          <div className="relative lg:scale-[1.06] lg:pl-3">
            <div className="absolute -inset-6 rounded-[40px] bg-amber-400/5 blur-3xl" />
            <div className="relative"><QuoteCard /></div>
          </div>
        </div>
      </section>

      <LiveMarketStatus />

      <section className="section-shell">
        <div className="section-heading">
          <p>Why RuneVault</p>
          <h2>A cleaner way to buy and sell OSRS gold.</h2>
          <span>Everything is organized around one simple quote, one account, and one trackable order.</span>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title} className="benefit-card">
              <span className="icon-box"><Icon size={23} /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-heading">
          <p>How it works</p>
          <h2>From quote to tracked order in three steps.</h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="feature-card group">
              <div className="flex items-center justify-between">
                <b className="text-sm tracking-[.2em] text-amber-300">{step.number}</b>
                <ArrowRight className="text-white/18 transition group-hover:translate-x-1 group-hover:text-amber-300" size={22} />
              </div>
              <h3 className="mt-12 text-2xl font-black">{step.title}</h3>
              <p className="mt-4 leading-7 text-white/43">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="market-panel">
          <div>
            <div className="eyebrow"><Coins size={14} /> OSRS Only</div>
            <h2 className="mt-6 text-4xl font-black tracking-[-.04em] sm:text-5xl">
              One marketplace. One game. No RS3 clutter.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-white/45">
              RuneVault is focused entirely on Old School RuneScape so the pricing, order flow, support, and customer experience stay straightforward.
            </p>
            <Link href="/quote" className="secondary-button mt-8 inline-flex">
              Open quote calculator <ArrowRight size={17} />
            </Link>
          </div>

          <div className="market-checks">
            {[
              "Buy and sell OSRS gold",
              "Admin-controlled rates",
              "Customer order history",
              "Unique tracking references",
              "Responsive mobile layout",
              "Supabase-backed accounts",
            ].map((item) => (
              <div key={item}><CheckCircle2 size={19} /> {item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Questions answered</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">What to know before ordering.</h2>
            <p className="mt-5 leading-7 text-white/45">
              RuneVault provides live quotes, protected customer accounts, clear payment instructions, and database-backed order tracking.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="faq-card">
                <summary>{question}<span>+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="cta-panel">
          <div>
            <p className="section-kicker">Start your quote</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">
              Buy or sell OSRS gold in a few clicks.
            </h2>
          </div>
          <Link href="/quote" className="primary-button shrink-0">
            Get an instant estimate <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
