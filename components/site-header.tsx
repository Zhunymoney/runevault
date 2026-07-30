"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090d]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-black">R</span>
          <span><b className="block">RuneVault</b><small className="font-bold uppercase tracking-[.2em] text-amber-400">Test mode</small></span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <Link href="/quote">Quote</Link><Link href="/orders">Track order</Link><Link href="/account">Account</Link><Link href="/admin">Admin</Link>
        </nav>
        {email ? (
          <button onClick={signOut} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold">Sign out</button>
        ) : (
          <Link href="/auth" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold">Sign in</Link>
        )}
      </div>
    </header>
  );
}
