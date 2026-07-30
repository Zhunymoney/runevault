"use client";

import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";

const links = [
  ["Quote", "/quote"],
  ["Track order", "/orders"],
  ["Account", "/account"],
  ["Admin", "/admin"],
] as const;

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#07090d]/88 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-500 font-black text-black shadow-[0_10px_30px_rgba(245,158,11,.18)]">R<span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#07090d] bg-emerald-400" /></span>
          <span><b className="block text-[15px] tracking-tight">RuneVault</b><small className="flex items-center gap-1.5 font-black uppercase tracking-[.17em] text-amber-300"><ShieldCheck size={11} /> Test mode</small></span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-white/7 bg-white/[.025] p-1 text-sm md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="rounded-xl px-4 py-2.5 font-bold text-white/55 transition hover:bg-white/5 hover:text-white">{label}</Link>)}
        </nav>

        <div className="flex items-center gap-2">
          {email ? <button onClick={signOut} className="hidden rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black sm:block">Sign out</button> : <Link href="/auth" className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black sm:block">Sign in</Link>}
          <button aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)} className="rounded-xl border border-white/10 p-2.5 md:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>

      {menuOpen && <div className="border-t border-white/8 bg-[#090c12] px-5 py-4 md:hidden"><nav className="grid gap-2">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl border border-white/8 bg-white/[.025] px-4 py-3.5 font-bold text-white/70">{label}</Link>)}{email ? <button onClick={signOut} className="rounded-xl bg-white px-4 py-3.5 text-left font-black text-black">Sign out</button> : <Link href="/auth" onClick={() => setMenuOpen(false)} className="rounded-xl bg-white px-4 py-3.5 font-black text-black">Sign in</Link>}</nav></div>}
    </header>
  );
}
