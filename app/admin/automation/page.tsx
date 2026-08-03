"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellRing, RefreshCw, Workflow } from "lucide-react";
import { parseApiResponse } from "@/lib/client-api";
import { createClient } from "@/lib/supabase-browser";

type Run={id:string;job_name:string;status:string;safe_details:Record<string,unknown>;error_message:string|null;started_at:string;completed_at:string|null};
type Event={id:string;event_type:string;channel:string;recipient:string|null;status:string;attempts:number;provider_id:string|null;error_message:string|null;created_at:string;last_attempt_at:string|null;sent_at:string|null};

export default function Page(){
  const [runs,setRuns]=useState<Run[]>([]),[events,setEvents]=useState<Event[]>([]),[notice,setNotice]=useState("Loading automation history...");
  const accessToken=async()=>{const{data}=await createClient().auth.getSession();if(!data.session?.access_token)throw new Error("Admin sign-in required.");return data.session.access_token};
  const load=useCallback(async()=>{try{const result=await parseApiResponse(await fetch("/api/admin/automation",{headers:{Authorization:`Bearer ${await accessToken()}`},cache:"no-store"}));setRuns(Array.isArray(result.runs)?result.runs as Run[]:[]);setEvents(Array.isArray(result.notifications)?result.notifications as Event[]:[]);setNotice("")}catch(reason){setNotice(reason instanceof Error?reason.message:"Automation history failed.")}},[]);
  async function retry(id:string){try{setNotice("Retrying email...");await parseApiResponse(await fetch("/api/admin/automation",{method:"POST",headers:{Authorization:`Bearer ${await accessToken()}`,"Content-Type":"application/json"},body:JSON.stringify({id})}));await load()}catch(reason){setNotice(reason instanceof Error?reason.message:"Email retry failed.")}}
  useEffect(()=>{void load()},[load]);
  return <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-14">
    <section className="flex flex-wrap justify-between gap-5"><div><p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">Admin automation</p><h1 className="mt-3 text-4xl font-black">Jobs and notifications.</h1><p className="mt-3 text-white/40">Review execution details and retry failed transactional email safely.</p></div><div className="flex gap-3"><Link href="/admin" className="h-fit rounded-xl border border-white/10 px-5 py-3 font-black">Admin</Link><button aria-label="Refresh automation history" onClick={()=>void load()} className="h-fit rounded-xl bg-amber-400 p-3 text-black"><RefreshCw/></button></div></section>
    {notice&&<p role="status" className="mt-5 rounded-xl border border-white/10 p-4 text-white/55">{notice}</p>}
    <section className="mt-8 grid gap-8 xl:grid-cols-2">
      <div><div className="flex items-center gap-3"><Workflow className="text-amber-300"/><h2 className="text-2xl font-black">Scheduled runs</h2></div><div className="mt-4 space-y-3">{runs.map(run=><article key={run.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between gap-4"><b>{run.job_name}</b><span className={run.status==="failed"?"text-rose-200":"text-emerald-200"}>{run.status}</span></div><p className="mt-2 text-xs text-white/35">{new Date(run.started_at).toLocaleString()}</p>{run.error_message&&<p className="mt-3 text-sm text-rose-100">{run.error_message}</p>}<pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-black/20 p-3 text-xs text-white/45">{JSON.stringify(run.safe_details??{},null,2)}</pre></article>)}</div></div>
      <div><div className="flex items-center gap-3"><BellRing className="text-amber-300"/><h2 className="text-2xl font-black">Email delivery</h2></div><div className="mt-4 space-y-3">{events.map(event=><article key={event.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between gap-4"><b>{event.event_type}</b><span className={event.status==="failed"?"text-rose-200":"text-emerald-200"}>{event.status}</span></div><p className="mt-2 break-all text-xs text-white/45">{event.recipient??"No recipient"}</p><p className="mt-1 text-xs text-white/35">Attempts: {event.attempts} · Last: {new Date(event.last_attempt_at??event.created_at).toLocaleString()}</p>{event.provider_id&&<p className="mt-1 break-all text-xs text-white/35">Resend: {event.provider_id}</p>}{event.error_message&&<p className="mt-3 text-sm text-rose-100">{event.error_message}</p>}{event.status==="failed"&&event.attempts<3&&<button onClick={()=>void retry(event.id)} className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-black">Retry email</button>}</article>)}</div></div>
    </section>
  </main>;
}
