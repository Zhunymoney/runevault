import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[700px] max-w-3xl items-center px-6 py-20">
      <section className="w-full rounded-3xl border border-white/10 bg-white/[.025] p-8 text-center sm:p-12">
        <SearchX className="mx-auto text-amber-300" size={42} />
        <p className="mt-6 text-sm font-black uppercase tracking-[.18em] text-amber-400">
          404
        </p>
        <h1 className="mt-3 text-4xl font-black">That RuneVault page does not exist.</h1>
        <p className="mt-4 leading-7 text-white/45">
          Return home or use the order-tracking page to continue.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="primary-button">
            <ArrowLeft size={18} /> Return home
          </Link>
          <Link href="/orders" className="header-button">
            Track an order
          </Link>
        </div>
      </section>
    </main>
  );
}
