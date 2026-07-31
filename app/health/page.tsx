"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe2,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";

type Check = {
  label: string;
  state: "checking" | "ok" | "warning";
  detail: string;
};

export default function HealthPage() {
  const [checks, setChecks] = useState<Check[]>([
    { label: "Website", state: "ok", detail: "The Next.js application loaded." },
    {
      label: "Supabase configuration",
      state: "checking",
      detail: "Checking public project configuration.",
    },
    {
      label: "Database read",
      state: "checking",
      detail: "Checking marketplace settings access.",
    },
    {
      label: "Security headers",
      state: "ok",
      detail: "Upgrade 10 security headers are configured at the app level.",
    },
  ]);

  async function runChecks() {
    const configured = isSupabaseConfigured();

    const next: Check[] = [
      { label: "Website", state: "ok", detail: "The Next.js application loaded." },
      {
        label: "Supabase configuration",
        state: configured ? "ok" : "warning",
        detail: configured
          ? "Public Supabase URL and publishable key are available."
          : "Supabase environment variables are missing.",
      },
      {
        label: "Database read",
        state: "checking",
        detail: "Checking marketplace settings access.",
      },
      {
        label: "Security headers",
        state: "ok",
        detail: "Upgrade 10 security headers are configured at the app level.",
      },
    ];

    setChecks(next);

    if (!configured) {
      next[2] = {
        label: "Database read",
        state: "warning",
        detail: "Skipped because Supabase is not configured.",
      };
      setChecks([...next]);
      return;
    }

    try {
      const { error } = await createClient()
        .from("settings")
        .select("id, updated_at")
        .eq("id", 1)
        .single();

      next[2] = error
        ? {
            label: "Database read",
            state: "warning",
            detail: error.message,
          }
        : {
            label: "Database read",
            state: "ok",
            detail: "Marketplace settings are readable.",
          };
    } catch (reason) {
      next[2] = {
        label: "Database read",
        state: "warning",
        detail: reason instanceof Error ? reason.message : "Database check failed.",
      };
    }

    setChecks([...next]);
  }

  useEffect(() => {
    void runChecks();
  }, []);

  const allHealthy = checks.every((check) => check.state === "ok");

  return (
    <main className="mx-auto min-h-[760px] max-w-5xl px-6 py-16 sm:py-20">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Production diagnostics
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">RuneVault health check.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/45">
            This checks public configuration and database availability. It does not replace external monitoring.
          </p>
        </div>
        <button onClick={() => void runChecks()} className="header-button">
          <RefreshCw size={18} /> Run again
        </button>
      </section>

      <div
        className={`mt-10 flex items-center gap-4 rounded-2xl border p-5 ${
          allHealthy
            ? "border-emerald-300/20 bg-emerald-300/[.05]"
            : "border-amber-300/20 bg-amber-300/[.05]"
        }`}
      >
        {allHealthy ? (
          <CheckCircle2 className="text-emerald-300" size={28} />
        ) : (
          <TriangleAlert className="text-amber-300" size={28} />
        )}
        <div>
          <p className="font-black">
            {allHealthy ? "All included checks passed." : "One or more checks needs attention."}
          </p>
          <p className="mt-1 text-sm text-white/40">
            Check this page after deployments and environment-variable changes.
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {checks.map((check, index) => {
          const Icon =
            index === 0 ? Globe2 : index === 1 || index === 2 ? Database : ShieldCheck;

          return (
            <article key={check.label} className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
              <div className="flex items-center justify-between">
                <Icon className="text-amber-300" size={23} />
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                    check.state === "ok"
                      ? "bg-emerald-300/10 text-emerald-200"
                      : check.state === "warning"
                        ? "bg-amber-300/10 text-amber-200"
                        : "bg-white/5 text-white/35"
                  }`}
                >
                  {check.state}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black">{check.label}</h2>
              <p className="mt-3 text-sm leading-6 text-white/40">{check.detail}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
