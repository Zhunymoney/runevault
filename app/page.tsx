import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  Coins,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { QuoteCard } from "@/components/quote-card";

const trustStats = [
  { value: "24/7", label: "Order access", icon: Clock3 },
  { value: "Fast", label: "Quote creation", icon: Zap },
  { value: "Private", label: "Account workflow", icon: LockKeyhole },
  { value: "Tracked", label: "Order history", icon: BarChart3 },
];

const steps = [
  {
    number: "01",
    title: "Build your quote",
    text: "Choose whether you are buying or selling, enter the amount, and see the estimated total instantly.",
  },
  {
    number: "02",
    title: "Create your order",
    text: "Sign in and create a tracked database order with a unique RuneVault reference number.",
  },
  {
    number: "03",
    title: "Follow every update",
    text: "Open your account or tracking page to see the latest status without chasing messages.",
  },
];

const reviews = [
  {
    quote: "The layout is clean, the quote is immediate, and I can see exactly where my order stands.",
    name: "Early tester",
    detail: "Marketplace workflow",
  },
  {
    quote: "RuneVault feels more like a modern platform than a basic order form.",
    name: "Beta user",
    detail: "Customer dashboard",
  },
  {
    quote: "The admin controls make pricing and order management much easier to understand.",
    name: "Operations tester",
    detail: "Admin experience",
  },
];

const faqs = [
  ["Is RuneVault processing real payments yet?", "No. This deployment remains in test mode while the customer, order, and administrative workflows are being completed and verified."],
  ["Can customers track an order?", "Yes. Every created order receives a reference that can be viewed from the tracking page and the signed-in account dashboard."],
  ["Can pricing and inventory be changed?", "Yes. Authorized administrators can manage rates, inventory, maintenance mode, and order status from the admin area."],
  ["Does the site work on mobile?", "Yes. Upgrade One adds a responsive storefront, navigation, cards, spacing, and readable mobile layouts."],
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative">
        <div className="hero-grid absolute inset-0 opacity-40" />
        <div className="hero-glow absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full" />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <div className="eyebrow">
              <Sparkles size={14} /> RuneVault Upgrade One
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              A premium command center for your
              <span className="gold-text block">OSRS marketplace.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58">
              Quotes, customer accounts, persistent orders, inventory, pricing, and administrative control—unified in one polished experience.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className="primary-button">
                Create a test quote <ArrowRight size={18} />
              </Link>
              <Link href="/orders" className="secondary-button">
                Track an order
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/45">
              <span className="inline-flex items-center gap-2"><BadgeCheck size={17} className="text-amber-300" /> Database-backed orders</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-amber-300" /> Protected admin access</span>
              <span className="inline-flex items-center gap-2"><Coins size={17} className="text-amber-300" /> Dynamic rates</span>
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
          {trustStats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-[#090c12] px-6 py-8 text-center">
              <Icon className="mx-auto text-amber-300" size={22} />
              <p className="mt-3 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[.16em] text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <p>Simple by design</p>
          <h2>From quote to tracked order in three steps.</h2>
          <span>RuneVault removes the scattered messages and gives customers one clear workflow.</span>
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
        <div className="operations-panel">
          <div>
            <div className="eyebrow"><TrendingUp size={14} /> Built for operations</div>
            <h2 className="mt-6 text-4xl font-black tracking-[-.04em] sm:text-5xl">Run the storefront without editing code.</h2>
            <p className="mt-5 max-w-2xl leading-7 text-white/45">The existing admin system remains connected while the storefront receives a complete visual upgrade.</p>
            <Link href="/admin" className="secondary-button mt-8 inline-flex">Open admin dashboard <ArrowRight size={17} /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [Coins, "Pricing controls", "Update buy and sell rates from the dashboard."],
              [BarChart3, "Inventory visibility", "Keep current stock and marketplace limits organized."],
              [Users, "Customer accounts", "Give users a home for their active and past orders."],
              [Headphones, "Status management", "Move orders through a clear fulfillment workflow."],
            ].map(([Icon, title, text]) => {
              const CardIcon = Icon as typeof Coins;
              return <div key={title as string} className="mini-card"><CardIcon size={22} /><h3>{title as string}</h3><p>{text as string}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-heading">
          <p>Early feedback</p>
          <h2>A cleaner experience on both sides of the order.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.name + review.detail} className="review-card">
              <div className="flex gap-1 text-amber-300">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
              <blockquote className="mt-6 text-lg font-semibold leading-8 text-white/80">“{review.quote}”</blockquote>
              <div className="mt-8 border-t border-white/8 pt-5"><b>{review.name}</b><p className="mt-1 text-sm text-white/35">{review.detail}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Questions answered</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Everything customers need to know.</h2>
            <p className="mt-5 leading-7 text-white/45">The storefront now explains the current test-mode status clearly while keeping the path to a quote obvious.</p>
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
            <p className="section-kicker">RuneVault is live</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-5xl">See the upgraded workflow for yourself.</h2>
          </div>
          <Link href="/quote" className="primary-button shrink-0">Start a test quote <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}
