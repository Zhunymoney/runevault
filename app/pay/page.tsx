import { Suspense } from "react";
import { PayClient } from "./pay-client";

export const metadata = {
  title: "Pay for order",
  description: "Choose an available RuneVault payment method.",
};

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-[760px] max-w-5xl px-6 py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
            Loading payment options…
          </div>
        </main>
      }
    >
      <PayClient />
    </Suspense>
  );
}
