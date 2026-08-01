"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { parseApiResponse } from "@/lib/client-api";

type Listing = { slug:string; title:string; category:string; description:string|null; available_stock_m:number|null; minimum_amount_m:number; maximum_amount_m:number };

export default function MarketplaceListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [notice, setNotice] = useState("Loading listing...");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await parseApiResponse(await fetch(`/api/marketplace?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }));
        const item = Array.isArray(data.listings) ? data.listings[0] as Listing | undefined : undefined;
        if (!item) throw new Error("This listing is not active.");
        if (active) { setListing(item); setNotice(""); }
      } catch (reason) {
        if (active) setNotice(reason instanceof Error ? reason.message : "Listing could not be loaded.");
      }
    })();
    return () => { active = false; };
  }, [slug]);
  return <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16"><Link href="/marketplace" className="font-black text-amber-300">← Marketplace</Link>{notice && <p role="status" className="mt-8 rounded-2xl border border-white/10 p-6 text-white/55">{notice}</p>}{listing && <article className="mt-8 rounded-3xl border border-white/10 bg-white/[.025] p-8"><p className="text-sm font-black uppercase tracking-[.2em] text-amber-300">{listing.category}</p><h1 className="mt-3 text-4xl font-black">{listing.title}</h1><p className="mt-5 leading-7 text-white/55">{listing.description || "RuneVault OSRS marketplace listing."}</p><dl className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-black/20 p-5"><dt className="text-xs text-white/35">Minimum</dt><dd className="mt-2 text-2xl font-black">{listing.minimum_amount_m}M</dd></div><div className="rounded-2xl bg-black/20 p-5"><dt className="text-xs text-white/35">Maximum</dt><dd className="mt-2 text-2xl font-black">{listing.maximum_amount_m}M</dd></div><div className="rounded-2xl bg-black/20 p-5"><dt className="text-xs text-white/35">Stock</dt><dd className="mt-2 text-2xl font-black">{listing.available_stock_m == null ? "Live" : `${listing.available_stock_m}M`}</dd></div></dl><Link href="/quote" className="mt-8 inline-flex rounded-xl bg-amber-400 px-6 py-3 font-black text-black">Get a quote</Link></article>}</main>;
}
