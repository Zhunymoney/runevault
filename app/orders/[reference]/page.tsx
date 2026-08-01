import { Suspense } from "react";
import { OrdersClient } from "../orders-client";

export default async function OrderPage({params}:{params:Promise<{reference:string}>}){const{reference}=await params;return <Suspense fallback={<main className="mx-auto min-h-[760px] max-w-6xl px-6 py-16"><div className="animate-pulse rounded-3xl border border-white/10 p-10 text-white/45">Loading private order…</div></main>}><OrdersClient initialReference={reference.toUpperCase()}/></Suspense>;}
