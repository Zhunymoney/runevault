import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Coins,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { QuoteCard } from "@/components/quote-card";

const benefits = [
  { icon: Clock3, title: "Fast order flow", text: "Create an OSRS gold quote in seconds and receive a trackable order reference." },
  { icon: ShieldCheck, title: "Clear, secure workflow", text: "Account-based order history and protected administrative controls." },
  { icon: TrendingUp, title: "Competitive rates", text: "Buy and sell prices are managed from the existing RuneVault admin dashboard." },
  { icon: Headphones, title: "Order support", text: "Customers can follow status updates without searching through scattered messages." },
];

const steps = [
  { number: "01", title: "Choose buy or sell", text: "Select whether you want to buy OSRS gold or sell your gold to RuneVault." },
  { number: "02", title: "Enter your amount", text: "Use the instant calculator to see your estimated total before creating the order." },
  { number: "03", title: "Track the order", text: "Sign in, create the order, and follow its status using your RuneVault reference." },
];

const reviews = [
  { quote: "The quote calculator is quick and the mobile layout is easy to understand.", name: "Marketplace tester" },
  { quote: "Everything from the rate to the order status is shown clearly in one place.", name: "Beta customer" },
  { quote: "The account and tracking pages make the whole process feel organized.", name: "Early user" },
];

const faqs = [
  ["Does RuneVault support RS3?", "No. RuneVault is being built exclusively for Old School RuneScape gold."],
  ["Can I buy and sell OSRS gold?", "Yes. Choose Buy Gold or Sell Gold in the calculator to receive an instant estimate."],
  ["Can I track an order?", "Yes. Created orders receive a RuneVault reference that can be viewed from the tracking page and your account."],
  ["Are live payments enabled?", "Not yet. The current deployment creates test database orders while payment, verification, and fulfillment systems are completed."],
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative">
        <div className="hero-grid absolute inset-0 opacity-50" />
        <div className="hero-glow absolute left-1/2 top-0 h-[560px] w-[960px] -translate-x-1/2 rounded-full" />

        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.04fr_.96fr] lg:py-24">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> OSRS Gold Marketplace
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Buy and sell
              <span className="gold-text block">OSRS gold.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58">
              Fast quotes, competitive rates, tracked orders, customer accounts, and a streamlined mobile experience built exclusively for Old School RuneScape.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote?type=buy" className="primary-button">
                Buy OSRS Gold <ArrowRight size={18} />
              </Link>
              <Link href="/quote?type=sell" className="sell-button">
                Sell OSRS Gold <TrendingUp size={18} />
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/45">
              <span className="inline-flex items-center gap-2"><Zap size={17} className="text-amber-300" /> Instant estimate</span>
              <span className="inline-flex items-center gap-2"><LockKeyhole size={17} className="text-amber-300" /> Tracked orders</span>
              <span className="inline-flex items-center gap-2"><Coins size={17} className="text-amber-300" /> OSRS only</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[40px] bg-amber-400/5 blur-3xl" />
            <div className="relative"><QuoteCard /></div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[.018]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-white/8 md:grid-cols-4">
          {[
            ["24/7", "Quote access"],
            ["OSRS", "Exclusive"],
            ["Fast", "Order creation"],
            ["Tracked", "Order status"],
          ].map(([value, label]) => (
            <div key={label} className="bg-[#090c12] px-6 py-8 text-center">
              <p className="text-2xl font-black text-amber-300">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[.16em] text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <p>Why RuneVault</p>
          <h2>A cleaner way to buy and sell OSRS gold.</h2>
          <span>Everything is organized around one simple quote, one account, and one trackable order.</span>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
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
        <div className="section-heading">
          <p>Early feedback</p>
          <h2>Simple on mobile. Clear from start to finish.</h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name} className="review-card">
              <div className="flex gap-1 text-amber-300">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <blockquote className="mt-6 text-lg font-semibold leading-8 text-white/80">“{review.quote}”</blockquote>
              <div className="mt-8 border-t border-white/8 pt-5"><b>{review.name}</b></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Questions answered</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">What to know before ordering.</h2>
            <p className="mt-5 leading-7 text-white/45">
              RuneVault is currently a marketplace preview with working quotes, accounts, and database order tracking.
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
