"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 12) return setMessage("Use at least 12 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");
    setBusy(true);
    const supabase=createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if(!error){const{data}=await supabase.auth.getSession();if(data.session?.access_token)await fetch("/api/account/password-event",{method:"POST",headers:{Authorization:`Bearer ${data.session.access_token}`}}).catch(()=>null);}
    setBusy(false);
    setMessage(error ? error.message : "Password updated. You can return to your account.");
  }
  return (
    <main className="mx-auto grid min-h-[720px] max-w-5xl place-items-center px-6 py-16">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-8">
        <h1 className="text-3xl font-black">Choose a new password</h1>
        <p className="mt-2 text-white/40">This page requires the secure recovery link sent to your email.</p>
        <input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="mt-7 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none" />
        <input required minLength={12} type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm new password" className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none" />
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-amber-400 py-4 font-black text-black disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
        {message && <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-white/60" role="status">{message}</p>}
        <Link href="/account" className="mt-5 inline-block text-sm text-amber-300">Return to account</Link>
      </form>
    </main>
  );
}
