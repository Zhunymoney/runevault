"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, RefreshCw, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { parseApiResponse } from "@/lib/client-api";

type Schedule = {
  id: string;
  label: string | null;
  buy_rate: number | null;
  sell_rate: number | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
};
type Tier = {
  id: string;
  order_type: "buy" | "sell";
  minimum_amount_m: number;
  rate_adjustment: number;
  active: boolean;
};
type History = {
  id: string;
  buy_rate: number;
  sell_rate: number;
  effective_at: string;
  reason: string | null;
};
async function headers() {
  const { data } = await createClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Admin sign-in required.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

export default function PricingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]),
    [tiers, setTiers] = useState<Tier[]>([]),
    [history, setHistory] = useState<History[]>([]),
    [notice, setNotice] = useState("Loading pricing workflows...");
  async function load() {
    try {
      const data = await parseApiResponse(
        await fetch("/api/admin/pricing", {
          headers: await headers(),
          cache: "no-store",
        }),
      );
      setSchedules(
        Array.isArray(data.schedules) ? (data.schedules as Schedule[]) : [],
      );
      setTiers(Array.isArray(data.tiers) ? (data.tiers as Tier[]) : []);
      setHistory(
        Array.isArray(data.history) ? (data.history as History[]) : [],
      );
      setNotice("");
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "Pricing could not be loaded.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(action: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const formData = new FormData(form);
      const values = Object.fromEntries(formData.entries());
      if (action === "schedule") {
        if (typeof values.startsAt === "string" && values.startsAt) values.startsAt = new Date(values.startsAt).toISOString();
        if (typeof values.endsAt === "string" && values.endsAt) values.endsAt = new Date(values.endsAt).toISOString();
      }
      await parseApiResponse(
        await fetch("/api/admin/pricing", {
          method: "POST",
          headers: await headers(),
          body: JSON.stringify({
            action,
            ...values,
            active: formData.get("active") === "on",
          }),
        }),
      );
      form.reset();
      setNotice("Pricing workflow saved and audited.");
      await load();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Pricing update failed.",
      );
    }
  }
  async function toggle(table: string, id: string, active: boolean) {
    try {
      await parseApiResponse(
        await fetch("/api/admin/pricing", {
          method: "POST",
          headers: await headers(),
          body: JSON.stringify({ action: "toggle", table, id, active }),
        }),
      );
      setNotice("Pricing workflow updated and audited.");
      await load();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Pricing update failed.",
      );
    }
  }
  return (
    <main className="mx-auto min-h-[800px] max-w-7xl px-6 py-14">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Authoritative pricing
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Schedules and bulk tiers.
          </h1>
          <p className="mt-3 max-w-2xl text-white/40">
            Schedule temporary buy or sell rates and apply deterministic volume
            adjustments. The server chooses the newest active schedule and
            highest qualifying tier.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 px-5 py-3 font-black"
          >
            Admin
          </Link>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </section>
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-white/60"
        >
          {notice}
        </p>
      )}
      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={(event) => void submit("schedule", event)}
          className="rounded-3xl border border-white/10 bg-white/[.025] p-6"
        >
          <div className="flex items-center gap-3">
            <CalendarClock className="text-amber-300" />
            <h2 className="text-xl font-black">New rate schedule</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              name="label"
              maxLength={160}
              placeholder="Campaign label"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="buyRate"
              type="number"
              min="0.0001"
              max="100"
              step="0.0001"
              placeholder="Buy rate (optional)"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="sellRate"
              type="number"
              min="0.0001"
              max="100"
              step="0.0001"
              placeholder="Sell rate (optional)"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              required
              name="startsAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              name="endsAt"
              type="datetime-local"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <label className="flex items-center gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="accent-amber-400"
              />
              Active
            </label>
          </div>
          <button className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-black text-black">
            Save schedule
          </button>
        </form>
        <form
          onSubmit={(event) => void submit("tier", event)}
          className="rounded-3xl border border-white/10 bg-white/[.025] p-6"
        >
          <div className="flex items-center gap-3">
            <Tags className="text-amber-300" />
            <h2 className="text-xl font-black">New bulk tier</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select
              required
              name="orderType"
              className="rounded-xl border border-white/10 bg-[#0b0e14] p-3"
            >
              <option value="buy">Customer buys</option>
              <option value="sell">Customer sells</option>
            </select>
            <input
              required
              name="minimumAmountM"
              type="number"
              min="1"
              step="1"
              placeholder="Minimum M"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <input
              required
              name="rateAdjustment"
              type="number"
              min="-100"
              max="100"
              step="0.0001"
              placeholder="Rate adjustment, e.g. -0.005"
              className="rounded-xl border border-white/10 bg-black/15 p-3"
            />
            <label className="flex items-center gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="accent-amber-400"
              />
              Active
            </label>
          </div>
          <button className="mt-5 rounded-xl bg-amber-400 px-5 py-3 font-black text-black">
            Save tier
          </button>
        </form>
      </section>
      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black">Schedules</h2>
          <div className="mt-4 space-y-3">
            {schedules.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 p-5"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <b>{item.label || "Scheduled rate"}</b>
                    <p className="mt-1 text-sm text-white/40">
                      Buy {item.buy_rate ?? "unchanged"} · Sell{" "}
                      {item.sell_rate ?? "unchanged"}
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      {new Date(item.starts_at).toLocaleString()} –{" "}
                      {item.ends_at
                        ? new Date(item.ends_at).toLocaleString()
                        : "no end"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      void toggle("scheduled_prices", item.id, !item.active)
                    }
                    className="h-fit rounded-lg border border-white/10 px-3 py-2 text-sm font-bold"
                  >
                    {item.active ? "Pause" : "Activate"}
                  </button>
                </div>
              </article>
            ))}
            {!schedules.length && (
              <p className="text-white/35">No schedules configured.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black">Bulk tiers</h2>
          <div className="mt-4 space-y-3">
            {tiers.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 p-5"
              >
                <div>
                  <b className="capitalize">
                    {item.order_type} · {item.minimum_amount_m}M+
                  </b>
                  <p className="text-sm text-white/40">
                    {Number(item.rate_adjustment) >= 0 ? "+" : ""}
                    {item.rate_adjustment} per M
                  </p>
                </div>
                <button
                  onClick={() =>
                    void toggle("bulk_price_tiers", item.id, !item.active)
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold"
                >
                  {item.active ? "Pause" : "Activate"}
                </button>
              </article>
            ))}
            {!tiers.length && (
              <p className="text-white/35">No bulk tiers configured.</p>
            )}
          </div>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">Price history</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="text-white/35">
              <tr>
                <th className="p-4">Effective</th>
                <th>Buy</th>
                <th>Sell</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="p-4">
                    {new Date(item.effective_at).toLocaleString()}
                  </td>
                  <td>{item.buy_rate}</td>
                  <td>{item.sell_rate}</td>
                  <td>{item.reason || "Settings update"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
