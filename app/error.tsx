"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("RuneVault page error", { digest: error.digest }); }, [error]);
  return <main className="mx-auto flex min-h-[720px] max-w-4xl items-center px-6 py-20"><section className="w-full rounded-[2rem] border border-rose-300/15 bg-rose-300/[.035] p-8 text-center sm:p-14"><AlertTriangle className="mx-auto text-rose-300" size={42} /><p className="mt-6 text-sm font-black uppercase tracking-[.2em] text-rose-300">RuneVault could not load this view</p><h1 className="mt-4 text-4xl font-black">Your data was not changed.</h1><p className="mx-auto mt-5 max-w-xl leading-7 text-white/45">Try the request again. If it continues, contact support and include the page you were opening{error.digest ? ` and reference ${error.digest}` : ""}.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={reset} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-black"><RotateCcw size={18} />Try again</button><Link href="/support" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-5 font-black">Contact support</Link></div></section></main>;
}
