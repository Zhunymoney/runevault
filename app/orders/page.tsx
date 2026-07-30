"use client";
import { Suspense,FormEvent,useEffect,useState } from "react";
import { useSearchParams } from "next/navigation";
import { findOrder,getMyOrders } from "@/lib/marketplace";
import type { Order } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";
function OrdersContent(){const params=useSearchParams();const [reference,setReference]=useState(params.get("reference")??"");const [orders,setOrders]=useState<Order[]>([]);const [message,setMessage]=useState("");useEffect(()=>{void getMyOrders().then(setOrders).catch(()=>undefined)},[]);async function search(e:FormEvent){e.preventDefault();setMessage("");try{const order=await findOrder(reference);setOrders(order?[order]:[]);if(!order)setMessage("No matching accessible order was found.");}catch(err){setMessage(err instanceof Error?err.message:"Could not search.")}}return <main className="mx-auto min-h-[760px] max-w-5xl px-6 py-16"><p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">Order tracking</p><h1 className="mt-3 text-4xl font-black">Track an order</h1><form onSubmit={search} className="mt-8 flex gap-3"><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="RV-XXXXXXXX" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"/><button className="rounded-xl bg-amber-400 px-5 font-black text-black">Search</button></form>{message&&<p className="mt-5 text-white/50">{message}</p>}<div className="mt-8 space-y-4">{orders.map(o=><article key={o.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center justify-between gap-4"><div><b>{o.reference}</b><p className="mt-1 text-sm text-white/40">{new Date(o.created_at).toLocaleString()}</p></div><StatusPill status={o.status}/></div><div className="mt-6 grid gap-4 text-sm sm:grid-cols-4"><span><small className="block text-white/35">Type</small><b className="capitalize">{o.order_type}</b></span><span><small className="block text-white/35">Amount</small><b>{o.amount_m}M</b></span><span><small className="block text-white/35">Rate</small><b>${o.price_per_m.toFixed(2)}/M</b></span><span><small className="block text-white/35">Total</small><b>${o.total_price.toFixed(2)}</b></span></div></article>)}</div></main>}
export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrdersContent />
    </Suspense>
  );
}