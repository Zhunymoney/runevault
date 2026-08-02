export const metadata = {
  title: "Terms",
  description: "RuneVault website terms and operational notices.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16 sm:py-20">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
        Terms of use
      </p>
      <h1 className="mt-3 text-4xl font-black">Website terms</h1>
      <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-white/[.025] p-7 leading-7 text-white/50 sm:p-10">
        <p>
          RuneVault provides OSRS marketplace quotes, order tracking, payment instructions, and customer support. An order is not complete until payment and fulfillment are independently confirmed through the applicable workflow.
        </p>
        <p>
          Users must not submit unlawful content, credentials, payment details, or information belonging to another person through order forms or notes.
        </p>
        <p>
          Eligibility, fulfillment, refunds, cancellations, disputes, prohibited activity, and payment-provider requirements are also governed by the policies linked from this site. These terms require owner and legal review before public commercial launch.
        </p>
      </div>
    </main>
  );
}
