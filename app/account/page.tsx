"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { addSavedCharacter, deleteSavedCharacter, getCurrentProfile, getMyOrders, getMyRewards, getSavedCharacters, requestAccountDeletion, updateMyProfile } from "@/lib/marketplace";
import type { LoyaltyAccount, LoyaltyTransaction, Order, Profile, SavedCharacter } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export default function AccountPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);
  const [fullName, setFullName] = useState("");
  const [runescapeName, setRunescapeName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [preferredPayment, setPreferredPayment] = useState<"" | "card" | "btc" | "usdc">("");
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [characterName, setCharacterName] = useState("");
  const [preferredWorld, setPreferredWorld] = useState("");
  const [saving, setSaving] = useState(false);
  const [rewards, setRewards] = useState<LoyaltyAccount | null>(null);
  const [rewardHistory, setRewardHistory] = useState<LoyaltyTransaction[]>([]);

  useEffect(() => {
    void Promise.all([getCurrentProfile(), getMyOrders()])
      .then(([currentProfile, currentOrders]) => {
        setProfile(currentProfile);
        setOrders(currentOrders);
        if (currentProfile) {
          setFullName(currentProfile.full_name ?? "");
          setRunescapeName(currentProfile.runescape_name ?? "");
          setContactEmail(currentProfile.contact_email ?? "");
          setPreferredPayment(currentProfile.preferred_payment_method ?? "");
          setEmailUpdates(currentProfile.notification_preferences?.email !== false);
        }
        void getSavedCharacters().then(setCharacters).catch(() => setMessage("Account profile migration is required before saved characters can load."));
        void getMyRewards().then(({account,history})=>{setRewards(account);setRewardHistory(history);}).catch(()=>setMessage("Rewards will appear after the rewards migration is applied."));
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Could not load account.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true); setMessage("");
    try {
      const updated = await updateMyProfile({
        full_name: fullName, runescape_name: runescapeName, contact_email: contactEmail,
        preferred_payment_method: preferredPayment || null,
        notification_preferences: { email: emailUpdates, order_updates: emailUpdates, security: true },
      });
      setProfile(updated); setMessage("Profile preferences saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Profile update failed."); }
    finally { setSaving(false); }
  }

  async function addCharacter() {
    setSaving(true); setMessage("");
    try {
      const character = await addSavedCharacter(characterName, Number(preferredWorld) || undefined);
      setCharacters((current) => [...current, character]); setCharacterName(""); setPreferredWorld(""); setMessage("OSRS character saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not save character."); }
    finally { setSaving(false); }
  }

  const stats = useMemo(() => {
    const completed = orders.filter((order) => order.status === "completed");
    const active = orders.filter(
      (order) => !["completed", "cancelled"].includes(order.status),
    );
    return {
      completed: completed.length,
      active: active.length,
      volume: orders.reduce((sum, order) => sum + order.amount_m, 0),
      value: orders.reduce((sum, order) => sum + order.total_price, 0),
    };
  }, [orders]);

  if (loading) {
    return (
      <main className="mx-auto min-h-[700px] max-w-7xl px-6 py-16">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
          Loading your RuneVault dashboard…
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Customer account
          </p>
          <h1 className="mt-4 text-4xl font-black">Sign in to view your orders.</h1>
          <p className="mt-5 leading-7 text-white/45">
            {error || "Your RuneVault account is required to view private order history."}
          </p>
          <Link
            href="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black"
          >
            Sign in <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[760px] max-w-7xl px-6 py-14 sm:py-20">
      <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Customer dashboard
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
            {profile.full_name || "Your RuneVault account"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/45">
            Review your OSRS gold orders, totals, references, and current progress from one dashboard.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/quote?type=buy"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-black"
          >
            <ShoppingCart size={18} /> Buy gold
          </Link>
          <Link
            href="/quote?type=sell"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 font-black text-[#03130d]"
          >
            <TrendingUp size={18} /> Sell gold
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "All orders", value: orders.length, icon: ReceiptText },
          { label: "Active orders", value: stats.active, icon: Clock3 },
          { label: "Completed", value: stats.completed, icon: PackageCheck },
          { label: "Total volume", value: `${stats.volume}M`, icon: Coins },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-white/10 bg-white/[.03] p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/40">{label}</p>
              <Icon size={19} className="text-amber-300" />
            </div>
            <p className="mt-4 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      {message && <p className="mt-6 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/60" role="status">{message}</p>}

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Profile and notifications</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-white/45">Name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label>
            <label className="text-sm font-bold text-white/45">Primary OSRS name<input value={runescapeName} maxLength={12} onChange={(event) => setRunescapeName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label>
            <label className="text-sm font-bold text-white/45">Contact email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white" /></label>
            <label className="text-sm font-bold text-white/45">Preferred payment<select value={preferredPayment} onChange={(event) => setPreferredPayment(event.target.value as typeof preferredPayment)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0e14] p-3 text-white"><option value="">No preference</option><option value="card">Card</option><option value="btc">BTC</option><option value="usdc">USDC on Base</option></select></label>
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm text-white/55"><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} className="h-5 w-5 accent-amber-400" />Email order and payment updates</label>
          <button type="button" disabled={saving} onClick={() => void saveProfile()} className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-50">Save profile</button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Saved OSRS characters</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={characterName} maxLength={12} onChange={(event) => setCharacterName(event.target.value)} placeholder="Character name" className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/15 px-4" />
            <input value={preferredWorld} onChange={(event) => setPreferredWorld(event.target.value)} type="number" min="301" max="999" placeholder="World" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/15 px-4 sm:w-28" />
            <button type="button" disabled={saving || !characterName.trim()} onClick={() => void addCharacter()} className="rounded-xl border border-amber-300/30 px-4 font-black text-amber-300 disabled:opacity-50">Add</button>
          </div>
          <div className="mt-4 space-y-2">{characters.map((character) => <div key={character.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span><b>{character.name}</b>{character.preferred_world ? <small className="ml-2 text-white/35">World {character.preferred_world}</small> : null}</span><button type="button" onClick={() => void deleteSavedCharacter(character.id).then(() => setCharacters((current) => current.filter((item) => item.id !== character.id))).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Delete failed."))} className="text-xs font-bold text-rose-300">Remove</button></div>)}</div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm"><Link href="/auth/update-password" className="font-bold text-amber-300">Update password</Link><button type="button" onClick={() => void requestAccountDeletion().then(() => setMessage("Account deletion request submitted for review.")).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Request failed."))} className="font-bold text-rose-300">Request account deletion</button></div>
        </article>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_.5fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">
                Order history
              </p>
              <h2 className="mt-2 text-2xl font-black">Recent OSRS orders</h2>
            </div>
            <Link href="/orders" className="text-sm font-bold text-white/45 hover:text-amber-300">
              Track an order
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {orders.slice(0, 8).map((order) => (
              <article
                key={order.id}
                className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 md:grid-cols-[1.2fr_.8fr_.8fr_auto] md:items-center"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Reference
                  </p>
                  <b className="mt-1 block">{order.reference}</b>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Order
                  </p>
                  <p className="mt-1 capitalize">
                    {order.order_type} · {order.amount_m}M
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-white/30">
                    Total
                  </p>
                  <p className="mt-1 font-black">${order.total_price.toFixed(2)}</p>
                </div>
                <StatusPill status={order.status} />
              </article>
            ))}

            {orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
                <Coins className="mx-auto text-amber-300" size={30} />
                <h3 className="mt-4 text-xl font-black">No orders yet</h3>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  Create your first OSRS gold quote to start an order.
                </p>
                <Link
                  href="/quote"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black"
                >
                  Start quote <ArrowRight size={17} />
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-amber-300/15 bg-amber-300/[.055] p-6">
            <CircleDollarSign className="text-amber-300" size={28} />
            <p className="mt-5 text-sm text-white/40">Combined order value</p>
            <p className="mt-2 text-3xl font-black">${stats.value.toFixed(2)}</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6">
            <CheckCircle2 className="text-emerald-300" size={28} />
            <h3 className="mt-5 text-lg font-black">Private order history</h3>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Only the signed-in customer and authorized staff can access these database orders.
            </p>
          </article>
        </aside>
      </section>
      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8"><p className="text-sm font-black uppercase tracking-[.16em] text-amber-400">Vault rewards</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-white/40">Available points</p><p className="mt-2 text-3xl font-black">{rewards?.points_balance??0}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-white/40">Lifetime points</p><p className="mt-2 text-3xl font-black">{rewards?.lifetime_points??0}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-white/40">VIP tier</p><p className="mt-2 text-3xl font-black capitalize">{rewards?.vip_tier??"standard"}</p></div></div><div className="mt-5 space-y-2">{rewardHistory.slice(0,10).map(item=><div key={item.id} className="flex justify-between rounded-xl border border-white/10 p-3 text-sm"><span>{item.reason.replaceAll("_"," ")}</span><b className={item.points>=0?"text-emerald-300":"text-rose-300"}>{item.points>0?"+":""}{item.points}</b></div>)}{!rewardHistory.length&&<p className="text-sm text-white/35">Points are awarded once eligible buy orders are completed.</p>}</div></section>
    </main>
  );
}
