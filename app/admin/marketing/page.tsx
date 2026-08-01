"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Gift, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { parseApiResponse } from "@/lib/client-api";
type Coupon = {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  terms: string;
};
type Promotion = {
  id: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
  starts_at: string;
  ends_at: string;
  terms: string;
};
type Referral = { id:string; code:string; status:string; referrer_id:string; referred_id:string|null; qualified_order_id:string|null; created_at:string; rewarded_at:string|null };
async function headers() {
  const { data } = await createClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Admin sign-in required.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}
export default function Page() {
  const [coupons, setCoupons] = useState<Coupon[]>([]),
    [promotions, setPromotions] = useState<Promotion[]>([]),
    [referrals, setReferrals] = useState<Referral[]>([]),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      const data = await parseApiResponse(
        await fetch("/api/admin/marketing", {
          headers: await headers(),
          cache: "no-store",
        }),
      );
      setCoupons(Array.isArray(data.coupons) ? (data.coupons as Coupon[]) : []);
      setPromotions(
        Array.isArray(data.promotions) ? (data.promotions as Promotion[]) : [],
      );
      setReferrals(Array.isArray(data.referrals) ? data.referrals as Referral[] : []);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Marketing failed.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(action: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await parseApiResponse(
        await fetch("/api/admin/marketing", {
          method: "POST",
          headers: await headers(),
          body: JSON.stringify({
            action,
            ...Object.fromEntries(new FormData(form).entries()),
            active: true,
          }),
        }),
      );
      form.reset();
      setNotice(`${action} created.`);
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Create failed.");
    }
  }
  return (
    <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-14">
      <section className="flex justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Rewards and marketing
          </p>
          <h1 className="mt-3 text-4xl font-black">Coupons and promotions.</h1>
          <p className="mt-3 text-white/40">
            Rules are validated server-side and redemptions enforce dates,
            spend, global, and per-customer limits atomically.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin"
            className="h-fit rounded-xl border border-white/10 px-5 py-3 font-black"
          >
            Admin
          </Link>
          <button
            onClick={() => void load()}
            className="h-fit rounded-xl bg-amber-400 p-3 text-black"
          >
            <RefreshCw />
          </button>
        </div>
      </section>
      {notice && (
        <p className="mt-5 rounded-xl border border-white/10 p-4 text-white/60">
          {notice}
        </p>
      )}
      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={(event) => void submit("coupon", event)}
          className="grid gap-3 rounded-3xl border border-white/10 bg-white/[.025] p-6"
        >
          <div className="flex items-center gap-3">
            <Gift className="text-amber-300" />
            <h2 className="text-2xl font-black">Create coupon</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              name="code"
              pattern="[A-Za-z0-9_-]{3,40}"
              placeholder="CODE"
              className="rounded-xl border border-white/10 bg-black/15 p-3 uppercase"
            />
            <input
              required
              name="description"
              minLength={3}
              placeholder="Customer description"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <select
              name="discountType"
              className="rounded-xl border border-white/10 bg-[#0b0e14] p-3"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed USD</option>
            </select>
            <input
              required
              name="discountValue"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Discount value"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="minimumSpend"
              type="number"
              min="0"
              step="0.01"
              placeholder="Minimum spend"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="maximumDiscount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Maximum discount"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="totalUsageLimit"
              type="number"
              min="1"
              placeholder="Total limit"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="perCustomerLimit"
              type="number"
              min="1"
              defaultValue="1"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="startsAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="expiresAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
          </div>
          <textarea
            required
            name="terms"
            minLength={3}
            maxLength={2000}
            placeholder="Promotion terms"
            className="rounded-xl border border-white/10 bg-black/15 p-3"
          />
          <button className="rounded-xl bg-amber-400 p-3 font-black text-black">
            Create coupon
          </button>
        </form>
        <form
          onSubmit={(event) => void submit("promotion", event)}
          className="grid gap-3 rounded-3xl border border-white/10 bg-white/[.025] p-6"
        >
          <h2 className="text-2xl font-black">Schedule promotion</h2>
          <input
            required
            name="name"
            minLength={3}
            placeholder="Promotion name"
            className="rounded-xl border border-white/10 bg-black/15 p-3"
          />
          <input
            required
            name="description"
            minLength={3}
            placeholder="Description"
            className="rounded-xl border border-white/10 bg-black/15 p-3"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="discountType"
              className="rounded-xl border border-white/10 bg-[#0b0e14] p-3"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed USD</option>
              <option value="rate_override">Rate override</option>
            </select>
            <input
              required
              name="discountValue"
              type="number"
              min="0.0001"
              step="0.0001"
              placeholder="Value"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="minimumAmountM"
              type="number"
              min="0"
              placeholder="Minimum M"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <span />
            <input
              required
              name="startsAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              required
              name="endsAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
          </div>
          <textarea
            required
            name="terms"
            minLength={3}
            placeholder="Promotion terms"
            className="rounded-xl border border-white/10 bg-black/15 p-3"
          />
          <button className="rounded-xl bg-amber-400 p-3 font-black text-black">
            Schedule promotion
          </button>
        </form>
      </section>
      <section className="mt-10 grid gap-6 xl:grid-cols-3">
        <div>
          <h2 className="text-2xl font-black">Coupons</h2>
          <div className="mt-4 space-y-3">
            {coupons.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 p-5"
              >
                <div className="flex justify-between">
                  <b>{item.code}</b>
                  <span
                    className={
                      item.active ? "text-emerald-300" : "text-white/30"
                    }
                  >
                    {item.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/45">
                  {item.description} · {item.discount_value}
                  {item.discount_type === "percentage" ? "%" : " USD"}
                </p>
                <p className="mt-2 text-xs text-white/30">{item.terms}</p>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black">Promotions</h2>
          <div className="mt-4 space-y-3">
            {promotions.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 p-5"
              >
                <div className="flex justify-between">
                  <b>{item.name}</b>
                  <span
                    className={
                      item.active ? "text-emerald-300" : "text-white/30"
                    }
                  >
                    {item.active ? "Scheduled" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/45">{item.description}</p>
                <p className="mt-2 text-xs text-white/30">
                  {new Date(item.starts_at).toLocaleString()} –{" "}
                  {new Date(item.ends_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black">Referrals</h2>
          <div className="mt-4 space-y-3">
            {referrals.map((item)=><article key={item.id} className="rounded-2xl border border-white/10 p-5"><div className="flex justify-between gap-3"><b>{item.code}</b><span className={item.status==="rewarded"?"text-emerald-300":"text-amber-200"}>{item.status}</span></div><p className="mt-2 truncate font-mono text-xs text-white/35" title={item.referrer_id}>Referrer: {item.referrer_id}</p><p className="mt-1 truncate font-mono text-xs text-white/35" title={item.referred_id??"Pending"}>Referred: {item.referred_id??"Not claimed"}</p><p className="mt-2 text-xs text-white/30">{new Date(item.created_at).toLocaleString()}</p></article>)}
            {!referrals.length&&<p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/35">No referral claims yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
