import { Suspense } from "react";
import { OrderConfirmationClient } from "./order-confirmation-client";

function ConfirmationLoading() {
  return (
    <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16">
      <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
        Loading order confirmation…
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
