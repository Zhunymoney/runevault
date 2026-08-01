import { createHmac, timingSafeEqual } from "node:crypto";

export type CryptoAsset = "btc" | "usdc";

export type CryptoQuote = {
  reference: string;
  asset: CryptoAsset;
  cryptoAmount: string;
  usdRate: string;
  expiresAt: string;
  token: string;
};

type QuotePayload = Omit<CryptoQuote, "token" | "expiresAt"> & {
  expiresAt: number;
};

const LOCK_DURATION_MS = 15 * 60_000;

function signingKey() {
  const key = process.env.PAYMENT_QUOTE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Payment quote signing is not configured.");
  return key;
}

function sign(encoded: string) {
  return createHmac("sha256", signingKey()).update(encoded).digest("base64url");
}

function encode(payload: QuotePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

async function bitcoinUsdRate() {
  const response = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json" },
  });
  const result = (await response.json().catch(() => null)) as {
    data?: { amount?: string };
  } | null;
  const rate = Number(result?.data?.amount);
  if (!response.ok || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("The BTC exchange rate is temporarily unavailable.");
  }
  return rate;
}

export async function createCryptoQuote(
  reference: string,
  asset: CryptoAsset,
  usdTotal: number,
): Promise<CryptoQuote> {
  if (!Number.isFinite(usdTotal) || usdTotal <= 0) {
    throw new Error("This order does not have a payable total.");
  }

  const rate = asset === "btc" ? await bitcoinUsdRate() : 1;
  const cryptoAmount = asset === "btc"
    ? (usdTotal / rate).toFixed(8)
    : usdTotal.toFixed(2);
  const payload: QuotePayload = {
    reference,
    asset,
    cryptoAmount,
    usdRate: rate.toFixed(2),
    expiresAt: Date.now() + LOCK_DURATION_MS,
  };

  return {
    ...payload,
    expiresAt: new Date(payload.expiresAt).toISOString(),
    token: encode(payload),
  };
}

export function verifyCryptoQuote(
  token: string,
  reference: string,
  asset: CryptoAsset,
) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) throw new Error("Payment quote is invalid.");
  const expectedSignature = sign(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Payment quote is invalid.");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as QuotePayload;
  if (payload.reference !== reference || payload.asset !== asset) {
    throw new Error("Payment quote does not match the selected method.");
  }
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
    throw new Error("Payment quote expired. Refresh the page for a new rate.");
  }
  return payload;
}
