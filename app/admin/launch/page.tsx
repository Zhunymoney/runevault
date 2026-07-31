import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Cloud,
  CreditCard,
  DatabaseBackup,
  FileCheck2,
  Mail,
  Radar,
  ShieldCheck,
} from "lucide-react";

const ready = [
  "Customer authentication and private profiles",
  "Quote, checkout, confirmation, receipt, and tracking flow",
  "Admin pricing, inventory, maintenance mode, and order statuses",
  "Supabase Row Level Security and Realtime status updates",
  "SEO metadata, sitemap, robots rules, health page, and security headers",
];

const external = [
  {
    icon: CreditCard,
    title: "Payment processor",
    text: "Requires an approved merchant account, server-side checkout, verified webhooks, refunds, and dispute handling.",
  },
  {
    icon: Mail,
    title: "Email and notifications",
    text: "Requires an email provider, verified sending domain, templates, unsubscribe handling, and delivery monitoring.",
  },
  {
    icon: Radar,
    title: "Fraud controls",
    text: "Requires provider signals, velocity limits, manual-review rules, device and payment risk data, and testing.",
  },
  {
    icon: Cloud,
    title: "Domain and edge protection",
    text: "Connect the final domain, HTTPS, DNS, Cloudflare or equivalent protection, and production allowlists.",
  },
  {
    icon: DatabaseBackup,
    title: "Backups and monitoring",
    text: "Configure scheduled database backups, uptime checks, error reporting, alerts, and restore tests.",
  },
  {
    icon: FileCheck2,
    title: "Legal and processor review",
    text: "Finalize terms, privacy, refunds, prohibited-use rules, taxes, business identity, and processor approval.",
  },
];

export default function LaunchPage() {
  return (
    <main className="mx-auto min-h-[800px] max-w-6xl px-6 py-16 sm:py-20">
      <section>
        <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
          Launch readiness
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
          Core site complete. External production work remains.
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/45">
          This page separates what is already built from the provider accounts, verification, legal work, and operational testing that cannot be safely installed as generic code.
        </p>
      </section>

      <section className="mt-10 rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-7 sm:p-9">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-emerald-300" size={28} />
          <h2 className="text-2xl font-black">Included production foundation</h2>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {ready.map((item) => (
            <p key={item} className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/10 p-4 text-sm leading-6 text-white/55">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} />
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <CircleAlert className="text-amber-300" size={27} />
          <h2 className="text-3xl font-black">Required before accepting real money</h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {external.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
              <Icon className="text-amber-300" size={24} />
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/40">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-white/[.025] p-7 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black">Run deployment diagnostics.</h2>
          <p className="mt-2 text-sm text-white/40">
            Confirm the public app and Supabase settings are responding.
          </p>
        </div>
        <Link href="/health" className="primary-button">
          Open health check <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
