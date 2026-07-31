export const metadata = {
  title: "Privacy",
  description: "RuneVault preview privacy notice.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16 sm:py-20">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
        Legal placeholder
      </p>
      <h1 className="mt-3 text-4xl font-black">Privacy notice</h1>
      <div className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-white/[.025] p-7 leading-7 text-white/50 sm:p-10">
        <p>
          RuneVault currently operates as a preview marketplace. It stores account identifiers, profile information, order references, OSRS character names, order details, notes, and status history through Supabase.
        </p>
        <p>
          Do not enter payment-card details, passwords, government identification, or other sensitive information into order notes.
        </p>
        <p>
          Before production launch, replace this placeholder with a policy reviewed for your actual business, providers, retention periods, cookies, analytics, customer rights, and jurisdiction.
        </p>
      </div>
    </main>
  );
}
