import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#06080c]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-black">R</span>
            <div>
              <b>RuneVault</b>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">OSRS marketplace platform</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/35">
            A database-backed OSRS marketplace for quotes, customer accounts, tracked orders, receipts, inventory, and administrative operations.
          </p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/30">Platform</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-white/55">
            <Link href="/quote">Create quote</Link>
            <Link href="/orders">Track order</Link>
            <Link href="/account">Customer account</Link>
            <Link href="/support">Support</Link>
            <Link href="/admin">Admin dashboard</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/30">Operations</p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-white/55">
            <Link href="/health">Health check</Link>
            <Link href="/admin/launch">Launch readiness</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refund policy</Link>
            <Link href="/delivery-policy">Delivery policy</Link>
            <Link href="/acceptable-use">Acceptable use</Link>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/8 px-3 py-2 text-xs font-black text-amber-300">
            <ShieldCheck size={14} /> SECURE ORDER TRACKING
          </div>
        </div>
      </div>

      <div className="border-t border-white/7">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 RuneVault.</span>
          <span>OSRS only. Never share account passwords or wallet private keys.</span>
        </div>
      </div>
    </footer>
  );
}
