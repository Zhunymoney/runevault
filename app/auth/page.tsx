"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-browser";

type Mode = "login" | "signup" | "reset";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured()) return setMessage("Supabase is not configured.");
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if(data.session?.access_token)await fetch("/api/account/login-event",{method:"POST",headers:{Authorization:`Bearer ${data.session.access_token}`}}).catch(()=>null);
        router.push("/account");
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
        setMessage(data.session ? "Account created and signed in." : "Account created. Check your email to verify the account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage("If that address belongs to an account, a password-reset email has been sent.");
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";
  return (
    <main className="mx-auto grid min-h-[720px] max-w-5xl place-items-center px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-8">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-2 text-white/40">Secure Supabase authentication.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" autoComplete="name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none" />
          )}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none" />
          {mode !== "reset" && (
            <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 outline-none" />
          )}
          <button disabled={busy} className="w-full rounded-xl bg-amber-400 py-4 font-black text-black disabled:opacity-60">
            {busy ? "Working…" : title}
          </button>
        </form>
        {message && <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-white/60" role="status">{message}</p>}
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-amber-300">
            {mode === "signup" ? "Already registered? Sign in" : "Need an account? Sign up"}
          </button>
          {mode === "login" ? <button type="button" onClick={() => setMode("reset")} className="text-white/45">Forgot password?</button> : null}
          {mode === "reset" ? <button type="button" onClick={() => setMode("login")} className="text-white/45">Return to sign in</button> : null}
        </div>
      </div>
    </main>
  );
}
