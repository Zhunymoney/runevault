"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Cloud, CreditCard, Database, Globe2, KeyRound, LoaderCircle, Mail, Play, Radar, RefreshCw, Server, ShieldCheck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { parseApiResponse } from "@/lib/client-api";

type State = "ready" | "configured" | "needs_configuration" | "failed";
type Check = { id: string; label: string; state: State; detail: string; external?: boolean };
type Probe = { label: string; passed: boolean; status: number; durationMs: number; detail?: string };

const stateLabel: Record<State, string> = { ready: "Ready", configured: "Configured", needs_configuration: "Needs configuration", failed: "Failed" };
const checkIcons = { payments: CreditCard, email: Mail, authentication: KeyRound, supabase: Database, api: Server, webhooks: Activity, domain: Globe2, fraud: Radar, monitoring: Cloud } as const;

export default function LaunchPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");

  const headers = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    if (!data.session?.access_token) throw new Error("Sign in with an authorized admin account.");
    return { Authorization: `Bearer ${data.session.access_token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setNotice("");
    try {
      const data = await parseApiResponse(await fetch("/api/admin/launch", { headers: await headers(), cache: "no-store", signal: AbortSignal.timeout(15_000) }));
      setChecks(Array.isArray(data.checks) ? data.checks as Check[] : []);
      setGeneratedAt(typeof data.generatedAt === "string" ? data.generatedAt : "");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Launch readiness could not be loaded."); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  async function run() {
    setRunning(true); setNotice(""); setProbes([]);
    try {
      const data = await parseApiResponse(await fetch("/api/admin/launch", { method: "POST", headers: await headers(), signal: AbortSignal.timeout(30_000) }));
      setChecks(Array.isArray(data.checks) ? data.checks as Check[] : []);
      setProbes(Array.isArray(data.probes) ? data.probes as Probe[] : []);
      setGeneratedAt(typeof data.generatedAt === "string" ? data.generatedAt : "");
      setNotice(data.passed ? "Every automated production probe passed." : "One or more automated probes needs attention.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Launch test failed."); }
    finally { setRunning(false); }
  }

  const repositoryChecks = checks.filter((check) => !check.external);
  const hasReadiness = repositoryChecks.length > 0;
  const readiness = useMemo(() => repositoryChecks.length ? Math.round(repositoryChecks.filter((check) => ["ready", "configured"].includes(check.state)).length / repositoryChecks.length * 100) : 0, [repositoryChecks]);

  return (
    <main className="mx-auto min-h-[800px] max-w-6xl px-6 py-14 sm:py-20">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">Launch center</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">Production readiness, measured.</h1>
          <p className="mt-5 max-w-3xl leading-7 text-white/45">Read-only checks separate deployed application health from owner-controlled provider and domain setup.</p>
        </div>
        <button onClick={() => void run()} disabled={running || loading} className="primary-button shrink-0 disabled:opacity-50">
          {running ? <LoaderCircle className="animate-spin" size={18} /> : <Play size={18} />} {running ? "Testing production…" : "Run full launch test"}
        </button>
      </section>

      <section className="mt-9 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8" aria-busy={loading}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm font-black text-white/45">Repository-controlled readiness</p><p className="mt-1 text-4xl font-black text-emerald-300">{loading ? "—" : hasReadiness ? `${readiness}%` : "Unavailable"}</p></div>
          <button onClick={() => void load()} disabled={loading} className="header-button"><RefreshCw className={loading ? "animate-spin" : ""} size={17} /> Refresh</button>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label="Repository-controlled readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasReadiness ? readiness : undefined}>
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-300 transition-[width] duration-500" style={{ width: `${readiness}%` }} />
        </div>
        {generatedAt && <p className="mt-3 text-xs text-white/30">Last checked {new Date(generatedAt).toLocaleString()}</p>}
      </section>

      {notice && <p role="status" className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/60">{notice}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => {
          const good = ["ready", "configured"].includes(check.state);
          const StatusIcon = good ? CheckCircle2 : check.state === "failed" ? XCircle : CircleAlert;
          const CategoryIcon = checkIcons[check.id as keyof typeof checkIcons] ?? ShieldCheck;
          return <article key={check.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
            <div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/[.08] text-amber-300"><CategoryIcon size={21} /></span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${good ? "bg-emerald-300/10 text-emerald-200" : check.state === "failed" ? "bg-red-300/10 text-red-200" : "bg-amber-300/10 text-amber-200"}`}><StatusIcon size={12} />{stateLabel[check.state]}</span></div>
            <h2 className="mt-5 text-xl font-black">{check.label}</h2><p className="mt-3 text-sm leading-6 text-white/45">{check.detail}</p>
            {check.external && <p className="mt-4 text-xs font-bold uppercase tracking-wide text-white/25">Owner-controlled</p>}
          </article>;
        })}
      </section>

      {probes.length > 0 && <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
        <div className="flex items-center gap-3"><ShieldCheck className="text-amber-300" /><h2 className="text-2xl font-black">Automated production probes</h2></div>
        <div className="mt-6 divide-y divide-white/8">{probes.map((probe) => <div key={probe.label} className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3">{probe.passed ? <CheckCircle2 className="text-emerald-300" size={19} /> : <XCircle className="text-red-300" size={19} />}<span className="font-bold">{probe.label}</span></div><span className="text-sm text-white/40">HTTP {probe.status || "error"} · {probe.durationMs}ms</span></div>)}</div>
      </section>}

      <section className="mt-10 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-white/[.025] p-7 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-black">Public diagnostics</h2><p className="mt-2 text-sm text-white/40">The health page can be checked without admin access.</p></div><Link href="/health" className="secondary-button">Open health check</Link></section>
    </main>
  );
}
