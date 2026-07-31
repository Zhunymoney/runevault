import Link from "next/link";
import { Coins, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#06080c]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="logo-mark">R</span>
            <div>
              <b className="text-lg">RuneVault</b>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-400">OSRS Gold Marketplace</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/35">
            A focused Old School RuneScape marketplace experience for instant quotes, customer accounts, and trackable orders.
          </p>
        </div>

        <div>
          <p className="footer-title">Marketplace</p>
          <div className="footer-links">
            <Link href="/quote?type=buy">Buy OSRS Gold</Link>
            <Link href="/quote?type=sell">Sell OSRS Gold</Link>
            <Link href="/orders">Track Order</Link>
            <Link href="/account">Account</Link>
          </div>
        </div>

        <div>
          <p className="footer-title">Platform</p>
          <div className="footer-links">
            <Link href="/auth">Sign In</Link>
            <Link href="/admin">Admin</Link>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={14} /> Protected accounts</span>
            <span className="inline-flex items-center gap-2"><Coins size={14} /> OSRS only</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs leading-5 text-white/28 md:flex-row md:items-center md:justify-between">
          <p>© 2026 RuneVault. Not affiliated with Jagex Ltd.</p>
          <p>Preview environment — no live payment or automated game transaction is processed.</p>
        </div>
      </div>
    </footer>
  );
}
