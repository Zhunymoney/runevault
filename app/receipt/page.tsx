import { Suspense } from "react";
import { ReceiptClient } from "./receipt-client";

export default function ReceiptPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-[700px] max-w-4xl px-6 py-16">Loading receipt…</main>}>
      <ReceiptClient />
    </Suspense>
  );
}
