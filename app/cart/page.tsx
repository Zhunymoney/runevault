"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { readCart, writeCart, type CartItem } from "@/lib/cart";
import { getSettings } from "@/lib/marketplace";
import { resolveEffectivePrice } from "@/lib/pricing";
import type { MarketplaceSettings } from "@/lib/types";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]),
    [settings, setSettings] = useState<MarketplaceSettings | null>(null),
    [notice, setNotice] = useState("Loading cart...");
  useEffect(() => {
    setItems(readCart());
    void getSettings()
      .then((value) => {
        setSettings(value);
        setNotice("");
      })
      .catch(() =>
        setNotice(
          "Live pricing is unavailable. Checkout will verify the final rate.",
        ),
      );
  }, []);
  function save(next: CartItem[]) {
    setItems(next);
    writeCart(next);
  }
  function amount(item: CartItem, value: number) {
    save(
      items.map((current) =>
        current.id === item.id
          ? { ...current, amountM: Math.max(1, Math.trunc(value || 1)) }
          : current,
      ),
    );
  }
  const total = useMemo(
    () =>
      settings
        ? items.reduce(
            (sum, item) =>
              sum +
              item.amountM *
                resolveEffectivePrice({
                  orderType: item.orderType,
                  amountM: item.amountM,
                  baseRate:
                    item.orderType === "buy"
                      ? settings.buy_rate
                      : settings.sell_rate,
                  schedules: settings.scheduled_prices,
                  tiers: settings.bulk_price_tiers,
                }).rate,
            0,
          )
        : null,
    [items, settings],
  );
  return (
    <main className="mx-auto min-h-[760px] max-w-5xl px-6 py-14">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
            Saved locally
          </p>
          <h1 className="mt-3 text-4xl font-black">Your OSRS gold cart.</h1>
          <p className="mt-3 max-w-2xl text-white/40">
            Review multiple buy or sell estimates. Each line creates its own
            secure order reference and payment or payout workflow.
          </p>
        </div>
        <Link
          href="/quote"
          className="rounded-xl bg-amber-400 px-5 py-3 text-center font-black text-black"
        >
          Add another item
        </Link>
      </section>
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-white/55"
        >
          {notice}
        </p>
      )}
      <section className="mt-8 space-y-4">
        {items.map((item) => {
          const rate = settings
            ? resolveEffectivePrice({
                orderType: item.orderType,
                amountM: item.amountM,
                baseRate:
                  item.orderType === "buy"
                    ? settings.buy_rate
                    : settings.sell_rate,
                schedules: settings.scheduled_prices,
                tiers: settings.bulk_price_tiers,
              }).rate
            : null;
          const query = new URLSearchParams({
            type: item.orderType,
            amount: String(item.amountM),
            ...(item.deliveryName ? { name: item.deliveryName } : {}),
          });
          return (
            <article
              key={item.id}
              className="grid gap-4 rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:grid-cols-[1fr_150px_140px_auto] sm:items-center"
            >
              <div>
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-amber-300" size={19} />
                  <b className="capitalize">{item.orderType} OSRS gold</b>
                </div>
                <p className="mt-2 text-sm text-white/40">
                  {rate == null
                    ? "Final rate verified at checkout"
                    : `$${rate.toFixed(4)} per M · $${(rate * item.amountM).toFixed(2)}`}
                </p>
              </div>
              <label className="text-xs font-bold text-white/35">
                Amount (M)
                <input
                  type="number"
                  min="1"
                  max="1000000000"
                  value={item.amountM}
                  onChange={(event) => amount(item, Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/15 p-3 text-white"
                />
              </label>
              <Link
                href={`/checkout?${query.toString()}`}
                className="rounded-xl bg-amber-400 px-4 py-3 text-center font-black text-black"
              >
                Checkout item
              </Link>
              <button
                onClick={() =>
                  save(items.filter((current) => current.id !== item.id))
                }
                aria-label="Remove cart item"
                className="rounded-xl border border-rose-300/15 p-3 text-rose-200"
              >
                <Trash2 size={18} />
              </button>
            </article>
          );
        })}
        {!items.length && (
          <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center">
            <ShoppingCart className="mx-auto text-white/25" />
            <h2 className="mt-4 text-xl font-black">Your cart is empty.</h2>
            <Link
              href="/quote"
              className="mt-5 inline-flex text-amber-300 font-bold"
            >
              Create an estimate
            </Link>
          </div>
        )}
      </section>
      {!!items.length && (
        <aside className="mt-8 flex flex-col justify-between gap-4 rounded-3xl border border-amber-300/15 bg-amber-300/[.045] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-white/40">
              Combined estimate · {items.length} item
              {items.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-3xl font-black">
              {total == null ? "Pending live pricing" : `$${total.toFixed(2)}`}
            </p>
            <p className="mt-2 text-xs text-white/30">
              Orders are intentionally paid and tracked separately to preserve
              payment idempotency and inventory accuracy.
            </p>
          </div>
          <button
            onClick={() => save([])}
            className="rounded-xl border border-white/10 px-5 py-3 font-bold"
          >
            Clear cart
          </button>
        </aside>
      )}
    </main>
  );
}
