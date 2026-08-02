"use client";

import { useEffect, useState } from "react";
import { Coins, Headphones, ShieldCheck, Timer } from "lucide-react";

type Settings = { buy_rate?: number; sell_rate?: number; estimated_delivery_minutes?: number };

export function LiveMarketStatus() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    void fetch("/api/pricing/config", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Pricing unavailable");
        const data = await response.json() as { settings?: Settings };
        setSettings(data.settings ?? null);
      })
      .catch(() => setUnavailable(true))
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const items = [
    [Coins, settings?.buy_rate == null ? "—" : `$${Number(settings.buy_rate).toFixed(3)}/M`, "Live buy price"],
    [Coins, settings?.sell_rate == null ? "—" : `$${Number(settings.sell_rate).toFixed(3)}/M`, "Live sell price"],
    [Timer, settings?.estimated_delivery_minutes ? `~${settings.estimated_delivery_minutes} min` : "Tracked", "Estimated delivery"],
    [ShieldCheck, "Manual review", "Crypto verification"],
    [Headphones, "Order-linked", "Customer support"],
  ] as const;

  return (
    <section aria-label="Live marketplace status" className="border-y border-white/8 bg-white/[.018]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-white/8 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([Icon, value, label]) => (
          <div key={label} className="bg-[#090c12] px-4 py-7 text-center">
            <Icon aria-hidden="true" className="mx-auto mb-3 text-amber-300" size={20} />
            <p className="text-lg font-black text-amber-300" aria-live={label.includes("price") ? "polite" : undefined}>{unavailable && label.includes("price") ? "Unavailable" : value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
