"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { parseApiResponse } from "@/lib/client-api";

type Message = { id: string; author_type: string; body: string; created_at: string };
type Ticket = { id: string; ticket_number: string; subject: string; status: string; ticket_messages?: Message[] };

async function request(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Sign in to contact support and view your tickets.");
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } });
  return parseApiResponse(response);
}

export function SupportClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    try { const data = await request("/api/support/tickets"); setTickets(Array.isArray(data.tickets) ? data.tickets as Ticket[] : []); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Tickets could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setNotice("");
    const form = event.currentTarget;
    try {
      await request("/api/support/tickets", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      form.reset(); setNotice("Your ticket was created. RuneVault support will reply here."); await load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Ticket creation failed."); }
    finally { setSending(false); }
  }

  async function reply(ticketId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setNotice(""); const form = event.currentTarget;
    try { await request("/api/support/tickets", { method: "PATCH", body: JSON.stringify({ ticketId, message: new FormData(form).get("message") }) }); form.reset(); setNotice("Reply saved."); await load(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Reply failed."); }
    finally { setSending(false); }
  }

  return <section className="mt-12 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
      <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Open a support ticket</p>
      <div className="mt-6 grid gap-4">
        <label className="text-sm font-bold text-white/55">Category<select name="category" required className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0e14] p-3 text-white"><option value="payment">Payment</option><option value="delivery">Delivery</option><option value="marketplace">Marketplace</option><option value="refund">Refund</option><option value="account">Account</option><option value="other">Other</option></select></label>
        <label className="text-sm font-bold text-white/55">Subject<input name="subject" required minLength={3} maxLength={160} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-white/55">Order reference (optional)<input name="orderReference" placeholder="RV-..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white uppercase" /></label><label className="text-sm font-bold text-white/55">OSRS name (optional)<input name="runescapeName" maxLength={12} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label></div>
        <label className="text-sm font-bold text-white/55">How can we help?<textarea name="message" required minLength={10} maxLength={10000} rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label>
        <button disabled={sending} className="min-h-12 rounded-xl bg-amber-400 px-5 font-black text-black disabled:opacity-50">{sending ? "Sending..." : "Create ticket"}</button>
      </div>
    </form>
    <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
      <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Your tickets</p>
      {notice && <p role="status" className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-white/60">{notice}</p>}
      <div className="mt-5 space-y-3">{loading ? <p className="text-white/40">Loading tickets...</p> : tickets.length ? tickets.map(ticket => <details key={ticket.id} className="faq-card"><summary><span>{ticket.ticket_number} · {ticket.subject}</span><b className="text-xs uppercase text-amber-300">{ticket.status}</b></summary><div className="space-y-3 px-5 pb-5">{ticket.ticket_messages?.map(message => <div key={message.id} className="rounded-xl border border-white/10 p-3"><b className="text-xs uppercase text-white/35">{message.author_type}</b><p className="mt-1 whitespace-pre-wrap text-sm text-white/65">{message.body}</p></div>)}{!['resolved','closed'].includes(ticket.status)&&<form onSubmit={event=>void reply(ticket.id,event)} className="flex gap-2"><input required name="message" maxLength={10000} placeholder="Reply to support" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/15 p-3 text-sm"/><button disabled={sending} className="rounded-xl bg-amber-400 px-4 font-black text-black disabled:opacity-50">Reply</button></form>}</div></details>) : <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-white/40">No support tickets yet.</p>}</div>
    </div>
  </section>;
}
