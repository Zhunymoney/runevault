"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Bitcoin,
  CheckCircle2,
  Clipboard,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import { findOrder } from "@/lib/marketplace";
import type { Order } from "@/lib/types";
import {generateBitcoinQR, generateUSDCQR} from "@/lib/qr";
type CryptoMethod = {
  id: string;
  name: string;
  network: string;
  address: string;
  qr: string;
};

export function PayClient() {
  const params = useSearchParams();
  const reference = params.get("reference")?.toUpperCase() ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [crypto, setCrypto] = useState<CryptoMethod[]>([]);
  const [selected, setSelected] = useState<CryptoMethod | null>(null);
  const [txid, setTxid] = useState("");

  useEffect(() => {
    if (!reference) {
      setMessage("No order reference supplied.");
      return;
    }

    void findOrder(reference)
      .then(setOrder)
      .catch((reason) =>
        setMessage(reason instanceof Error ? reason.message : "Could not load order."),
      );

    void fetch("/api/payments/crypto/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
const methods = (data.methods ?? []) as CryptoMethod[];

const methodsWithQR = await Promise.all(
  methods.map(async (method) => ({
    ...method,
    qr:
      method.id === "btc"
        ? await generateBitcoinQR(method.address)
        : await generateUSDCQR(method.address),
  })),
);

setCrypto(methodsWithQR);
setSelected(methodsWithQR[0] ?? null);
        }
      })
      .catch(() => undefined);
  }, [reference]);

  async function openCardCheckout() {
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/payments/stripe/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });

    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setMessage(data.error ?? "Card checkout is unavailable.");
      setBusy(false);
      return;
    }

    window.location.assign(data.url);
  }

  async function markCryptoSent() {
    if (!selected) {
      setMessage("No crypto address has been configured.");
      return;
    }

    setBusy(true);
    const response = await fetch("/api/payments/crypto/mark-sent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        asset: selected.id,
        txid,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? "Request finished.");
    setBusy(false);
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-[760px] max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-8">
          <h1 className="text-4xl font-black">Payment options</h1>
          <p className="mt-4 text-white/45">{message || "Loading order…"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[800px] max-w-6xl px-6 py-14 sm:py-20">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-400">
        Payment selection
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
        Choose card or crypto.
      </h1>
      <p className="mt-4 max-w-3xl leading-7 text-white/45">
        Order {order.reference} · {order.amount_m}M · ${Number(order.total_price).toFixed(2)}
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-5 text-sm leading-6 text-white/55">
        <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={20} />
        Card checkout remains disabled until Stripe approves the business and test credentials are configured. Crypto submissions require manual verification and are never marked paid by this page.
      </div>

      {message && (
        <p className="mt-5 rounded-xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/60">
          {message}
        </p>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <CreditCard className="text-amber-300" size={32} />
          <h2 className="mt-5 text-3xl font-black">Card</h2>
          <p className="mt-3 leading-7 text-white/45">
            Stripe-hosted checkout for eligible cards, Apple Pay, or Google Pay when available on the customer’s device and account.
          </p>

          <button
            onClick={() => void openCardCheckout()}
            disabled={busy}
            className="primary-button mt-7 w-full justify-center"
          >
            <LockKeyhole size={18} />
            {busy ? "Opening…" : "Open secure card checkout"}
            <ExternalLink size={17} />
          </button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-7">
          <Bitcoin className="text-amber-300" size={32} />
          <h2 className="mt-5 text-3xl font-black">Crypto</h2>
          <p className="mt-3 leading-7 text-white/45">
            Send only the configured asset on the exact network shown below.
          </p>

          {crypto.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 p-4 text-sm text-white/45">
              No crypto addresses are configured yet.
            </p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {crypto.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelected(method)}
                    className={`rounded-xl border p-4 text-left ${
                      selected?.id === method.id
                        ? "border-amber-300/35 bg-amber-300/[.07]"
                        : "border-white/10 bg-black/10"
                    }`}
                  >
                    <b>{method.name}</b>
                    <p className="mt-1 text-xs text-white/35">{method.network}</p>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-5">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-white/30">
                    {selected.name} address · {selected.network}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <code className="min-w-0 flex-1 break-all text-sm">
                      {selected.address}
                    </code>
                    <button
                      onClick={() =>
                        void navigator.clipboard.writeText(selected.address)
                      }
                      className="rounded-lg border border-white/10 p-2"
                    >
                      <Clipboard size={16} />
                    </button>
                  </div>
                </div>
              )}

{selected?.qr && (
  <div className="mt-6 flex justify-center">
    <div className="rounded-2xl border border-white/10 bg-white p-4">
      <Image
        src={selected?.qr ?? ""}
        alt={`${selected.name} QR Code`}
        width={260}
        height={260}
        unoptimized
      />
    </div>
  </div>
)}

<label className="mt-4 block text-sm font-bold text-white/45"></label>
              <label className="mt-4 block text-sm font-bold text-white/45">
                Transaction ID
                <input
                  value={txid}
                  onChange={(event) => setTxid(event.target.value)}
                  placeholder="Paste the on-chain transaction ID"
                  className="mt-2 min-h-13 w-full rounded-xl border border-white/10 bg-black/15 px-4 outline-none"
                />
              </label>

              <button
                onClick={() => void markCryptoSent()}
                disabled={busy || !selected}
                className="header-button mt-5 w-full justify-center"
              >
                <CheckCircle2 size={18} />
                Submit for manual verification
              </button>
            </>
          )}
        </article>
      </section>

      <Link
        href={`/orders?reference=${order.reference}`}
        className="mt-7 inline-flex text-sm font-black text-amber-300"
      >
        Return to order tracking
      </Link>
    </main>
  );
}
