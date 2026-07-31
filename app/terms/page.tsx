export const metadata = {
  title: "Terms",
  description: "RuneVault preview terms.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16 sm:py-20">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
        Legal placeholder
      </p>
      <h1 className="mt-3 text-4xl font-black">Preview terms</h1>
      <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-white/[.025] p-7 leading-7 text-white/50 sm:p-10">
        <p>
          The current RuneVault deployment creates test-mode quotes, preview orders, receipts, and tracking records. It does not collect payment or guarantee an in-game transaction.
        </p>
        <p>
          Users must not submit unlawful content, credentials, payment details, or information belonging to another person through order forms or notes.
        </p>
        <p>
          Before accepting real orders, replace this placeholder with reviewed terms covering eligibility, fulfillment, refunds, cancellations, disputes, prohibited activity, liability, and applicable game and payment-provider rules.
        </p>
      </div>
    </main>
  );
}
