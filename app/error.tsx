"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("RuneVault page error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[700px] max-w-3xl items-center px-6 py-20">
      <section className="w-full rounded-3xl border border-red-300/15 bg-red-300/[.035] p-8 text-center sm:p-12">
        <AlertTriangle className="mx-auto text-red-300" size={42} />
        <h1 className="mt-6 text-4xl font-black">RuneVault hit an unexpected error.</h1>
        <p className="mt-4 leading-7 text-white/45">
          No order should be submitted again until you confirm whether the first attempt succeeded.
        </p>
        <button onClick={reset} className="primary-button mt-7">
          <RefreshCw size={18} /> Try this page again
        </button>
      </section>
    </main>
  );
}
