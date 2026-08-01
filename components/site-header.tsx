"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setEmail(session?.user.email ?? null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  const nav = [
    ["Buy Gold", "/quote?type=buy"],
    ["Sell Gold", "/quote?type=sell"],
    ["Marketplace", "/marketplace"],
    ["Cart", "/cart"],
    ["Track Order", "/orders"],
    ["Account", "/account"],
    ["Support", "/support"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090d]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="logo-mark">R</span>
          <span>
            <b className="block text-lg leading-none">RuneVault</b>
            <small className="mt-1 block font-bold uppercase tracking-[.18em] text-amber-400">
              OSRS Gold
            </small>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/58 lg:flex">
          {nav.map(([label, href]) => (
            <Link key={label} href={href} className="nav-link">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          {email ? (
            <button onClick={signOut} className="header-button">
              Sign out
            </button>
          ) : (
            <Link href="/auth" className="header-button">
              Sign in
            </Link>
          )}
        </div>

        <button
          aria-label="Open menu"
          onClick={() => setOpen((value) => !value)}
          className="mobile-menu-button lg:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/8 bg-[#090c12] px-6 py-5 lg:hidden">
          <nav className="grid gap-2">
            {nav.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="mobile-nav-link"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="mobile-nav-link"
            >
              Admin
            </Link>
            {email ? (
              <button onClick={signOut} className="mobile-nav-link text-left">
                Sign out
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="mobile-nav-link"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
