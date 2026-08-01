"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Coins, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/marketplace";
import type { MarketplaceSettings, OrderType } from "@/lib/types";
import { resolveEffectivePrice } from "@/lib/pricing";

const fallback: MarketplaceSettings = {
  id: 1,
  buy_rate: 0.18,
  sell_rate: 0.14,
  inventory_m: 1000,
  minimum_order_m: 10,
  maximum_order_m: 5000,
  maintenance_mode: false,
  updated_at: "",
};

export function QuoteCard() {
  const [type, setType] = useState<OrderType>("buy");
  const [amount, setAmount] = useState(100);
  const [deliveryName, setDeliveryName] = useState("");
  const [settings, setSettings] = useState(fallback);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void getSettings()
      .then(setSettings)
      .catch(() =>
        setMessage(
          "Database pricing is unavailable, so preview rates are shown.",
        ),
      );
  }, []);

  const rate = resolveEffectivePrice({
    orderType: type,
    amountM: amount,
    baseRate: type === "buy" ? settings.buy_rate : settings.sell_rate,
    schedules: settings.scheduled_prices,
    tiers: settings.bulk_price_tiers,
  }).rate;
  const total = useMemo(() => Math.max(amount, 0) * rate, [amount, rate]);

  function continueToCheckout() {
    setBusy(true);
    setMessage("");

    if (settings.maintenance_mode) {
      setMessage("Ordering is temporarily paused.");
      setBusy(false);
      return;
    }

    if (
      amount < settings.minimum_order_m ||
      amount > settings.maximum_order_m
    ) {
      setMessage(
        `Orders must be between ${settings.minimum_order_m}M and ${settings.maximum_order_m}M.`,
      );
      setBusy(false);
      return;
    }

    if (type === "buy" && amount > settings.inventory_m) {
      setMessage("That amount is currently above available inventory.");
      setBusy(false);
      return;
    }

    const params = new URLSearchParams({
      type,
      amount: String(amount),
    });

    if (deliveryName.trim()) params.set("name", deliveryName.trim());
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="quote-shell">
      <div className="quote-inner">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.14em] text-amber-300">
              OSRS Gold Calculator
            </p>
            <h2 className="mt-2 text-3xl font-black">Instant estimate</h2>
          </div>
          <span className="preview-pill">PREVIEW</span>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
          <button
            onClick={() => setType("buy")}
            className={`quote-tab ${type === "buy" ? "active-buy" : ""}`}
          >
            Buy Gold
          </button>
          <button
            onClick={() => setType("sell")}
            className={`quote-tab ${type === "sell" ? "active-sell" : ""}`}
          >
            Sell Gold
          </button>
        </div>

        <div className="mt-7 flex items-center justify-between text-sm">
          <span className="text-white/45">OSRS gold amount</span>
          <b className={type === "buy" ? "text-amber-300" : "text-emerald-300"}>
            ${rate.toFixed(3)} / M
          </b>
        </div>

        <div className="mt-3 flex rounded-2xl border border-white/10 bg-white/5 px-5">
          <input
            aria-label="OSRS gold amount in millions"
            className="w-full bg-transparent py-5 text-3xl font-black outline-none"
            type="number"
            min={settings.minimum_order_m}
            max={settings.maximum_order_m}
            value={amount}
            onChange={(event) =>
              setAmount(Math.max(1, Number(event.target.value)))
            }
          />
          <span className="self-center text-xl font-black text-white/35">
            M
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[50, 100, 250, 500].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className="amount-button"
            >
              {value}M
            </button>
          ))}
        </div>

        <input
          value={deliveryName}
          onChange={(event) => setDeliveryName(event.target.value)}
          placeholder="OSRS character name (optional)"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300/40"
        />

        <div className="my-7 h-px bg-white/10" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">
              {type === "buy" ? "Estimated price" : "Estimated payout"}
            </p>
            <p className="mt-1 text-4xl font-black">${total.toFixed(2)}</p>
          </div>
          <Coins
            className={type === "buy" ? "text-amber-300" : "text-emerald-300"}
            size={34}
          />
        </div>

        <button
          disabled={busy || settings.maintenance_mode}
          onClick={continueToCheckout}
          className={`quote-submit ${type === "sell" ? "sell-submit" : ""}`}
        >
          {busy
            ? "Opening checkout..."
            : type === "buy"
              ? "Review Buy Order"
              : "Review Sell Order"}
          {!busy && <ArrowRight size={18} />}
        </button>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-semibold text-white/35">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} /> Review first
          </span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={15} /> No payment yet
          </span>
        </div>

        {message && (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm text-white/60">
            {message}
          </p>
        )}
        <p className="mt-5 text-center text-xs leading-5 text-white/28">
          Preview environment: no live payment or automated in-game transaction
          is processed.
        </p>
      </div>
    </div>
  );
}
