"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  FileText,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { createOrder, getSettings } from "@/lib/marketplace";
import type { MarketplaceSettings, OrderType } from "@/lib/types";

const fallback: MarketplaceSettings = {
  id: 1,
  buy_rate: 0.18,
  sell_rate: 0.14,
  inventory_m: 1000,
  minimum_order_m: 10,
  maximum_order_m: 5000,
  maintenance_mode: false,
  buy_enabled: true,
  sell_enabled: true,
  estimated_delivery_minutes: 15,
  pause_message: null,
  updated_at: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [type, setType] = useState<OrderType>("buy");
  const [amount, setAmount] = useState(100);
  const [deliveryName, setDeliveryName] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredWorld, setPreferredWorld] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [settings, setSettings] = useState(fallback);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type");
    const requestedAmount = Number(params.get("amount"));
    const requestedName = params.get("name");

    if (requestedType === "sell") {
      setType("sell");
    }

    if (Number.isFinite(requestedAmount) && requestedAmount > 0) {
      setAmount(requestedAmount);
    }

    if (requestedName) {
      setDeliveryName(requestedName);
    }
    const storedRequest = window.sessionStorage.getItem("runevault-checkout-request");
    const nextRequest = storedRequest || crypto.randomUUID();
    window.sessionStorage.setItem("runevault-checkout-request", nextRequest);
    setRequestId(nextRequest);

    void getSettings()
      .then(setSettings)
      .catch(() =>
        setMessage(
          "Could not load live settings. Preview values are shown.",
        ),
      );
  }, []);

  const rate =
    type === "buy" ? settings.buy_rate : settings.sell_rate;

  const total = useMemo(() => amount * rate, [amount, rate]);

  async function placeOrder() {
    setMessage("");

    if (!deliveryName.trim()) {
      setMessage("Enter your OSRS character name.");
      return;
    }

    if (!termsAccepted) {
      setMessage("Accept the RuneVault terms before continuing.");
      return;
    }

    if (!contactDetails.trim()) {
      setMessage("Enter a contact email or Discord username for order coordination.");
      return;
    }

    if (type === "sell" && (!payoutMethod || !payoutDetails.trim())) {
      setMessage("Choose a payout method and enter the payout destination.");
      return;
    }

    if ((type === "buy" && settings.buy_enabled === false) || (type === "sell" && settings.sell_enabled === false)) {
      setMessage(settings.pause_message || `${type === "buy" ? "Buying" : "Selling"} is temporarily paused.`);
      return;
    }

    if (
      amount < settings.minimum_order_m ||
      amount > settings.maximum_order_m
    ) {
      setMessage(
        `Order amount must be between ${settings.minimum_order_m}M and ${settings.maximum_order_m}M.`,
      );
      return;
    }

    setBusy(true);

    try {
      const order = await createOrder({
        order_type: type,
        amount_m: amount,
        delivery_name: deliveryName.trim(),
        notes: notes.trim(),
        preferred_world: Number(preferredWorld) || undefined,
        contact_details: contactDetails.trim(),
        payout_method: payoutMethod || undefined,
        payout_details: payoutDetails.trim() || undefined,
        coupon_code: couponCode.trim() || undefined,
        request_id: requestId || crypto.randomUUID(),
      });

window.sessionStorage.removeItem("runevault-checkout-request");

router.push(
  `/pay?reference=${encodeURIComponent(order.reference)}`,
);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Could not create the order.",
      );

      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-[800px] max-w-6xl px-6 py-14 sm:py-20">
      <Link
        href="/quote"
        className="inline-flex items-center gap-2 text-sm font-bold text-white/45 hover:text-amber-300"
      >
        <ArrowLeft size={17} />
        Return to calculator
      </Link>

      <section className="mt-7">
        <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
          Secure review
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
          Confirm your OSRS gold order.
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-white/45">
          Review the amount and rate, confirm your character name,
          and create a private tracking reference.
        </p>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setType("buy")}
              className={`quote-tab ${
                type === "buy" ? "active-buy" : ""
              }`}
            >
              Buy OSRS Gold
            </button>

            <button
              type="button"
              onClick={() => setType("sell")}
              className={`quote-tab ${
                type === "sell" ? "active-sell" : ""
              }`}
            >
              Sell OSRS Gold
            </button>
          </div>

          <label className="mt-7 block text-sm font-bold text-white/50">
            Gold amount

            <div className="mt-2 flex rounded-2xl border border-white/10 bg-black/15 px-5">
              <input
                type="number"
                min={settings.minimum_order_m}
                max={settings.maximum_order_m}
                value={amount}
                onChange={(event) => {
                  const nextAmount = Number(event.target.value);

                  setAmount(
                    Number.isFinite(nextAmount)
                      ? Math.max(1, nextAmount)
                      : 1,
                  );
                }}
                className="w-full bg-transparent py-5 text-3xl font-black outline-none"
              />

              <span className="self-center text-xl font-black text-white/35">
                M
              </span>
            </div>
          </label>

          <label className="mt-5 block text-sm font-bold text-white/50">
            OSRS character name

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4">
              <UserRound size={19} className="text-white/30" />

              <input
                value={deliveryName}
                onChange={(event) =>
                  setDeliveryName(event.target.value)
                }
                placeholder="Enter your in-game name"
                className="min-h-14 w-full bg-transparent outline-none placeholder:text-white/25"
              />
            </div>
          </label>

          <label className="mt-5 block text-sm font-bold text-white/50">
            Order notes{" "}
            <span className="font-normal text-white/25">
              (optional)
            </span>

            <div className="mt-2 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
              <FileText
                size={19}
                className="mt-1 text-white/30"
              />

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything staff should know about this preview order?"
                rows={4}
                className="w-full resize-none bg-transparent outline-none placeholder:text-white/25"
              />
            </div>
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-white/50">Preferred world <span className="font-normal text-white/25">(optional)</span><input type="number" min="301" max="999" value={preferredWorld} onChange={(event) => setPreferredWorld(event.target.value)} placeholder="World 330" className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-black/15 px-4 outline-none" /></label>
            <label className="block text-sm font-bold text-white/50">Contact details<input required value={contactDetails} onChange={(event) => setContactDetails(event.target.value)} placeholder="Email or Discord username" className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-black/15 px-4 outline-none" /></label>
          </div>

          {type === "sell" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-white/50">Payout method<select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-[#0b0e14] px-4 outline-none"><option value="">Choose payout</option><option value="btc">BTC</option><option value="usdc_base">USDC on Base</option><option value="paypal">PayPal</option></select></label>
              <label className="block text-sm font-bold text-white/50">Payout destination<input value={payoutDetails} onChange={(event) => setPayoutDetails(event.target.value)} placeholder="Wallet or account email" className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-black/15 px-4 outline-none" /></label>
            </div>
          )}

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-white/50">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) =>
                setTermsAccepted(event.target.checked)
              }
              className="mt-1 h-5 w-5 shrink-0 accent-amber-400"
            />

            I accept the RuneVault terms, cancellation, delivery, and refund policies and confirm these order details are accurate.
          </label>

          <label className="mt-5 block text-sm font-bold text-white/50">Coupon code <span className="font-normal text-white/25">(optional)</span><input value={couponCode} onChange={(event)=>setCouponCode(event.target.value.toUpperCase())} maxLength={40} placeholder="Enter code" className="mt-2 min-h-14 w-full rounded-2xl border border-white/10 bg-black/15 px-4 uppercase outline-none"/><span className="mt-2 block text-xs font-normal text-white/30">Eligibility and the final discounted total are verified securely when the order is created.</span></label>

          {message && (
            <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.055] p-4 text-sm text-white/65">
              {message}
            </p>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-amber-300/15 bg-amber-300/[.045] p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-amber-300">
                Final review
              </p>

              <h2 className="mt-2 text-2xl font-black capitalize">
                {type} OSRS gold
              </h2>
            </div>

            <Coins
              size={32}
              className={
                type === "buy"
                  ? "text-amber-300"
                  : "text-emerald-300"
              }
            />
          </div>

          <div className="mt-7 space-y-4 border-y border-white/10 py-6">
            <div className="flex justify-between gap-5">
              <span className="text-white/40">Gold amount</span>
              <b>{amount}M</b>
            </div>
            <div className="flex justify-between gap-5">
              <span className="text-white/40">Estimated next step</span>
              <b>Within {settings.estimated_delivery_minutes ?? 15} minutes</b>
            </div>

            <div className="flex justify-between gap-5">
              <span className="text-white/40">Current rate</span>
              <b>${rate.toFixed(3)} / M</b>
            </div>

            <div className="flex justify-between gap-5">
              <span className="text-white/40">
                {type === "buy"
                  ? "Estimated total"
                  : "Estimated payout"}
              </span>

              <b className="text-2xl">${total.toFixed(2)}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void placeOrder()}
            disabled={busy || settings.maintenance_mode || (type === "buy" ? settings.buy_enabled === false : settings.sell_enabled === false)}
            className={`quote-submit ${
              type === "sell" ? "sell-submit" : ""
            }`}
          >
            {busy ? "Creating order…" : "Continue to Payment"}

            {!busy && <ArrowRight size={18} />}
          </button>

          <div className="mt-6 space-y-3 text-sm text-white/40">
            <p className="flex items-center gap-3">
              <LockKeyhole
                size={17}
                className="text-amber-300"
              />
              Signed-in account required
            </p>

            <p className="flex items-center gap-3">
              <ShieldCheck
                size={17}
                className="text-emerald-300"
              />
              Private tracking reference
            </p>

            <p className="flex items-center gap-3">
              <CheckCircle2
                size={17}
                className="text-sky-300"
              />
              Payment selection included
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
