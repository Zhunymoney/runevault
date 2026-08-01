"use client";

import { useEffect, useState } from "react";
import { Laptop, LogOut, ShieldCheck } from "lucide-react";
import { parseApiResponse } from "@/lib/client-api";
import { createClient } from "@/lib/supabase-browser";

type Session = { id:string; user_agent_family:string|null; last_seen_at:string; revoked_at:string|null; current:boolean };
type SecurityEvent = { id:string; event_type:string; severity:string; created_at:string };

async function authorization(){const{data}=await createClient().auth.getSession();if(!data.session?.access_token)throw new Error("Sign in again to review account security.");return{Authorization:`Bearer ${data.session.access_token}`};}

export function AccountSecurity(){
  const[sessions,setSessions]=useState<Session[]>([]),[events,setEvents]=useState<SecurityEvent[]>([]),[notice,setNotice]=useState("Loading account security…"),[busy,setBusy]=useState(false);
  async function load(){try{const headers=await authorization();await parseApiResponse(await fetch("/api/account/security",{method:"POST",headers}));const data=await parseApiResponse(await fetch("/api/account/security",{headers,cache:"no-store"}));setSessions(Array.isArray(data.sessions)?data.sessions as Session[]:[]);setEvents(Array.isArray(data.events)?data.events as SecurityEvent[]:[]);setNotice("");}catch(reason){setNotice(reason instanceof Error?reason.message:"Account security could not load.");}}
  useEffect(()=>{void load();},[]);
  async function revoke(){if(!window.confirm("Sign out every RuneVault session on every device?"))return;setBusy(true);try{await parseApiResponse(await fetch("/api/account/security",{method:"DELETE",headers:await authorization()}));await createClient().auth.signOut({scope:"local"});window.location.assign("/auth");}catch(reason){setNotice(reason instanceof Error?reason.message:"Sessions could not be revoked.");setBusy(false);}}
  return <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Account security</p><h2 className="mt-2 text-2xl font-black">Sessions and security activity</h2><p className="mt-2 text-sm text-white/40">RuneVault stores keyed fingerprints—not raw tokens or IP addresses—for session visibility.</p></div><button type="button" disabled={busy} onClick={()=>void revoke()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300/25 px-4 font-black text-rose-100 disabled:opacity-50"><LogOut size={17}/> Sign out all devices</button></div>
    {notice&&<p role="status" className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-white/55">{notice}</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><div><div className="flex items-center gap-2"><Laptop size={19} className="text-amber-300"/><h3 className="font-black">Tracked sessions</h3></div><div className="mt-3 space-y-2">{sessions.map(session=><article key={session.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-3"><b>{session.user_agent_family||"Unknown browser"}</b><span className={`text-xs font-black uppercase ${session.revoked_at?"text-white/30":session.current?"text-emerald-300":"text-amber-200"}`}>{session.revoked_at?"revoked":session.current?"this session":"active"}</span></div><p className="mt-1 text-xs text-white/35">Last seen {new Date(session.last_seen_at).toLocaleString()}</p></article>)}{!sessions.length&&!notice&&<p className="text-sm text-white/35">No tracked sessions yet.</p>}</div></div>
      <div><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-emerald-300"/><h3 className="font-black">Recent security events</h3></div><div className="mt-3 space-y-2">{events.map(event=><article key={event.id} className="flex justify-between gap-3 rounded-xl border border-white/10 p-4"><span className="capitalize">{event.event_type.replaceAll("_"," ")}</span><span className="text-xs text-white/35">{new Date(event.created_at).toLocaleString()}</span></article>)}{!events.length&&!notice&&<p className="text-sm text-white/35">No recent security alerts.</p>}</div></div></div>
  </section>;
}
