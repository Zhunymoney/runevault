import { Suspense } from "react";
import { OrdersClient } from "./orders-client";

function OrdersLoading() {
  return (
    <main className="mx-auto min-h-[760px] max-w-6xl px-6 py-16 sm:py-20">
      <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
        Loading order tracking…
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersClient />
    </Suspense>
  );
}
