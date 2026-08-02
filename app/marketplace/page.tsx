"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Megaphone, PackageSearch, Search } from "lucide-react";
import { parseApiResponse } from "@/lib/client-api";
type Listing = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string | null;
  featured: boolean;
  available_stock_m: number | null;
  minimum_amount_m: number;
  maximum_amount_m: number;
  updated_at: string;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  starts_at: string;
  ends_at: string | null;
};
export default function Page() {
  const [listings, setListings] = useState<Listing[]>([]),
    [announcements, setAnnouncements] = useState<Announcement[]>([]),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState("Loading marketplace...");
  async function load() {
    setNotice("Loading marketplace...");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const data = await parseApiResponse(
        await fetch(`/api/marketplace?${params}`, { cache: "no-store" }),
      );
      setListings(
        Array.isArray(data.listings) ? (data.listings as Listing[]) : [],
      );
      setAnnouncements(
        Array.isArray(data.announcements)
          ? (data.announcements as Announcement[])
          : [],
      );
      setNotice("");
    } catch (reason) {
      setListings([]);
      setAnnouncements([]);
      setNotice(
        reason instanceof Error
          ? reason.message
          : "Marketplace could not be loaded.",
      );
    }
  } // Initial public fetch; searches are submitted explicitly.
  useEffect(() => {
    void load();
    // Initial public fetch; searches are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    void load();
  }
  return (
    <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-14">
      <section className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
          RuneVault marketplace
        </p>
        <h1 className="mt-3 text-4xl font-black sm:text-6xl">
          Browse available OSRS gold.
        </h1>
        <p className="mt-5 leading-7 text-white/45">
          Compare available order sizes and inventory, then open a live quote before deciding. Pricing is confirmed by RuneVault at checkout.
        </p>
      </section>
      {announcements.length > 0 && (
        <section className="mt-8 grid gap-3">
          {announcements.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-5 ${item.severity === "critical" ? "border-rose-300/25 bg-rose-300/[.05]" : item.severity === "warning" ? "border-amber-300/25 bg-amber-300/[.05]" : "border-white/10 bg-white/[.025]"}`}
            >
              <div className="flex items-center gap-3">
                <Megaphone size={18} className="text-amber-300" />
                <b>{item.title}</b>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/55">
                {item.body}
              </p>
            </article>
          ))}
        </section>
      )}
      <form onSubmit={submit} className="mt-8 flex gap-3">
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-white/10 px-4">
          <Search size={17} />
          <span className="sr-only">Search marketplace listings</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search listings"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <button className="rounded-xl bg-amber-400 px-6 font-black text-black">
          Search
        </button>
      </form>
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-white/10 p-4 text-white/55"
        >
          {notice}
        </p>
      )}
      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-white/10 bg-white/[.025] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <PackageSearch className="text-amber-300" />
              <div className="flex gap-2">
                {item.featured && (
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-black uppercase text-amber-200">
                    Featured
                  </span>
                )}
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/45">
                  {item.category}
                </span>
              </div>
            </div>
            <h2 className="mt-5 text-2xl font-black">{item.title}</h2>
            <p className="mt-3 min-h-12 text-sm leading-6 text-white/40">
              {item.description || "RuneVault OSRS marketplace listing."}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-black/20 p-3">
                <b className="block text-base text-white">
                  {item.minimum_amount_m}M
                </b>
                <span className="text-white/35">Minimum</span>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <b className="block text-base text-white">
                  {item.maximum_amount_m}M
                </b>
                <span className="text-white/35">Maximum</span>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <b className="block text-base text-white">
                  {item.available_stock_m == null
                    ? "Live"
                    : `${item.available_stock_m}M`}
                </b>
                <span className="text-white/35">Stock</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href={`/marketplace/${item.slug}`} className="inline-flex justify-center rounded-xl border border-white/10 px-5 py-3 font-black">View details</Link>
              <Link href="/quote" className="inline-flex justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-black">Check live price</Link>
            </div>
          </article>
        ))}
        {!listings.length && !notice && (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-white/35">
            No active listings match this search.
          </p>
        )}
      </section>
    </main>
  );
}
