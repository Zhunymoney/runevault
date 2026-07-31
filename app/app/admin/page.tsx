"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  RefreshCw,
  Save,
  Settings2,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import {
  getAdminOrders,
  getCurrentProfile,
  getSettings,
  updateOrderStatus,
  updateSettings,
} from "@/lib/marketplace";
import type {
  MarketplaceSettings,
  Order,
  OrderStatus,
  Profile,
} from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

const statuses: OrderStatus[] = [
  "pending",
  "awaiting_payment",
  "paid",
  "assigned",
  "delivering",
  "completed",
  "cancelled",
];

export default function AdminPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<MarketplaceSettings | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const currentProfile = await getCurrentProfile();
      setProfile(currentProfile);
      if (!currentProfile || !["admin", "staff"].includes(currentProfile.role)) return;
      const [currentOrders, currentSettings] = await Promise.all([
        getAdminOrders(),
        getSettings(),
      ]);
      setOrders(currentOrders);
      setSettings(currentSettings);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not load admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeStatus(id: string, status: OrderStatus) {
    try {
      await updateOrderStatus(id, status);
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, status } : order)),
      );
      setMessage("Order status updated.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Update failed.");
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await updateSettings(settings);
      setSettings({
        ...saved,
        buy_rate: Number(saved.buy_rate),
        sell_rate: Number(saved.sell_rate),
        inventory_m: Number(saved.inventory_m),
        minimum_order_m: Number(saved.minimum_order_m),
        maximum_order_m: Number(saved.maximum_order_m),
      });
      setMessage("Marketplace settings saved.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const metrics = useMemo(() => {
    const active = orders.filter(
      (order) => !["completed", "cancelled"].includes(order.status),
    );
    const buyOrders = orders.filter((order) => order.order_type === "buy");
    const sellOrders = orders.filter((order) => order.order_type === "sell");
    return {
      active: active.length,
      buyVolume: buyOrders.reduce((sum, order) => sum + order.amount_m, 0),
      sellVolume: sellOrders.reduce((sum, order) => sum + order.amount_m, 0),
      grossBuyValue: buyOrders.reduce((sum, order) => sum + order.total_price, 0),
    };
  }, [orders]);

  if (loading) {
    return (
      <main className="mx-auto min-h-[700px] max-w-7xl px-6 py-16">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/[.025] p-10 text-white/45">
          Loading operations dashboard…
        </div>
      </main>
    );
  }

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return (
      <main className="mx-auto min-h-[700px] max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8 sm:p-12">
          <AlertTriangle className="text-amber-300" size={34} />
          <h1 className="mt-5 text-4xl font-black">Admin access required</h1>
          <p className="mt-4 leading-7 text-white/45">
            Your profile must have the admin or staff role before this operations dashboard can be opened.
          </p>
          <Link
            href="/account"
            className="mt-7 inline-flex rounded-xl border border-white/10 px-5 py-3 font-bold"
          >
            Return to account
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[820px] max-w-7xl px-6 py-14 sm:py-20">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            RuneVault operations
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
            Admin command center
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/45">
            Control OSRS pricing, inventory, maintenance mode, and every customer order status.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-5 font-black"
        >
          <RefreshCw size={18} /> Refresh data
        </button>
      </section>

      {message && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/60">
          <CheckCircle2 size={18} className="text-emerald-300" /> {message}
        </div>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "All orders", value: orders.length, icon: ShoppingCart },
          { label: "Active queue", value: metrics.active, icon: Activity },
          { label: "Buy volume", value: `${metrics.buyVolume}M`, icon: Coins },
          { label: "Sell volume", value: `${metrics.sellVolume}M`, icon: TrendingUp },
          { label: "Gross buy value", value: `$${metrics.grossBuyValue.toFixed(2)}`, icon: CircleDollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/40">{label}</p>
              <Icon size={18} className="text-amber-300" />
            </div>
            <p className="mt-4 text-2xl font-black">{value}</p>
          </article>
        ))}
      </section>

      {settings && (
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <Settings2 className="text-amber-300" size={23} />
                <h2 className="text-2xl font-black">Pricing and inventory</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/40">
                These values power the public OSRS calculator.
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[.14em] ${
                settings.maintenance_mode
                  ? "border-red-400/20 bg-red-400/[.07] text-red-200"
                  : "border-emerald-400/20 bg-emerald-400/[.07] text-emerald-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${settings.maintenance_mode ? "bg-red-400" : "bg-emerald-400"}`} />
              {settings.maintenance_mode ? "Ordering paused" : "Ordering available"}
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Customer buy rate", "buy_rate", 0.001],
              ["Customer sell rate", "sell_rate", 0.001],
              ["Inventory (M)", "inventory_m", 1],
              ["Minimum order (M)", "minimum_order_m", 1],
              ["Maximum order (M)", "maximum_order_m", 1],
            ].map(([label, key, step]) => (
              <label key={String(key)} className="text-sm font-semibold text-white/45">
                {label}
                <input
                  type="number"
                  step={Number(step)}
                  value={Number(settings[key as keyof MarketplaceSettings])}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      [key]: Number(event.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none focus:border-amber-300/35"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 sm:flex-row sm:items-center">
            <label className="flex items-center gap-3 font-bold text-white/65">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(event) =>
                  setSettings({ ...settings, maintenance_mode: event.target.checked })
                }
                className="h-5 w-5 accent-amber-400"
              />
              Pause all new order creation
            </label>

            <button
              onClick={() => void saveSettings()}
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-black text-black disabled:opacity-50"
            >
              <Save size={18} /> {saving ? "Saving…" : "Save marketplace settings"}
            </button>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <Boxes className="text-amber-300" size={23} />
              <h2 className="text-2xl font-black">Order queue</h2>
            </div>
            <p className="mt-2 text-sm text-white/40">
              Change a status and the customer tracking page updates from Supabase.
            </p>
          </div>
          <p className="text-sm font-bold text-white/35">{orders.length} total orders</p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.02]">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-white/[.04] text-xs font-black uppercase tracking-[.12em] text-white/35">
              <tr>
                <th className="p-5">Reference</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Total</th>
                <th>Status</th>
                <th>OSRS name</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-white/8">
                  <td className="p-5 font-black">{order.reference}</td>
                  <td>
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                      order.order_type === "buy"
                        ? "bg-amber-300/10 text-amber-200"
                        : "bg-emerald-300/10 text-emerald-200"
                    }`}>
                      {order.order_type}
                    </span>
                  </td>
                  <td className="font-bold">{order.amount_m}M</td>
                  <td>${order.price_per_m.toFixed(3)}</td>
                  <td className="font-black">${order.total_price.toFixed(2)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <StatusPill status={order.status} />
                      <select
                        value={order.status}
                        onChange={(event) =>
                          void changeStatus(order.id, event.target.value as OrderStatus)
                        }
                        className="rounded-lg border border-white/10 bg-[#11151c] px-3 py-2"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>{order.delivery_name || "—"}</td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-white/35">
                    No customer orders are currently in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <BarChart3 className="text-amber-300" size={24} />
          <h3 className="mt-4 font-black">Admin-controlled prices</h3>
          <p className="mt-2 text-sm leading-6 text-white/40">
            Public estimates update when saved pricing changes are loaded from Supabase.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <Boxes className="text-emerald-300" size={24} />
          <h3 className="mt-4 font-black">Inventory protection</h3>
          <p className="mt-2 text-sm leading-6 text-white/40">
            Buy orders above available inventory are rejected by the current marketplace logic.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <AlertTriangle className="text-red-300" size={24} />
          <h3 className="mt-4 font-black">Still a preview system</h3>
          <p className="mt-2 text-sm leading-6 text-white/40">
            This package does not enable live payments, automated delivery, or production fraud controls.
          </p>
        </article>
      </section>
    </main>
  );
}
