import { NextResponse } from "next/server";
import {
  getOrderByReference,
  rateLimit,
  requestIp,
  riskScore,
  sendDiscord,
  updateOrder,
} from "@/lib/launch-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CryptoSubmissionBody = {
  reference?: unknown;
  asset?: unknown;
  txid?: unknown;
};

export async function POST(request: Request) {
  const limit = rateLimit(
    `crypto-sent:${requestIp(request)}`,
    4,
    5 * 60_000,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "This payment was submitted recently. Wait a few minutes before trying again.",
      },
      { status: 429 },
    );
  }

  const body = (await request
    .json()
    .catch(() => null)) as CryptoSubmissionBody | null;

  const reference =
    typeof body?.reference === "string"
      ? body.reference.trim().toUpperCase()
      : "";

  const rawAsset =
    typeof body?.asset === "string"
      ? body.asset.trim().toLowerCase()
      : "";

  const txid =
    typeof body?.txid === "string"
      ? body.txid.trim()
      : "";

  const asset =
    rawAsset === "btc"
      ? "BTC"
      : rawAsset === "usdc"
        ? "USDC"
        : "";

  if (!reference) {
    return NextResponse.json(
      { error: "Order reference is required." },
      { status: 400 },
    );
  }

  if (!asset) {
    return NextResponse.json(
      { error: "Select Bitcoin or USDC." },
      { status: 400 },
    );
  }

  if (txid.length < 8 || txid.length > 160) {
    return NextResponse.json(
      { error: "Enter a valid transaction ID." },
      { status: 400 },
    );
  }

  const order = await getOrderByReference(reference);

  if (!order) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 },
    );
  }

  const risk = riskScore(order);

  await updateOrder(order.id, {
    status: "awaiting_payment",
    payment_provider: "crypto_manual",
    payment_status: "customer_marked_sent",
    payment_id: txid,
    crypto_asset: asset,
    risk_score: risk.score,
    risk_level: risk.level,
    risk_reasons: risk.reasons,
  });

  await sendDiscord("Crypto payment submitted for review", [
    {
      name: "Reference",
      value: order.reference,
      inline: true,
    },
    {
      name: "Asset",
      value: asset,
      inline: true,
    },
    {
      name: "Transaction ID",
      value: txid.slice(0, 100),
    },
    {
      name: "Status",
      value: "Customer marked sent",
      inline: true,
    },
    {
      name: "Risk",
      value: `${risk.level} (${risk.score}/100)`,
      inline: true,
    },
  ]);

  return NextResponse.json(
    {
      ok: true,
      reference: order.reference,
      payment_provider: "crypto_manual",
      payment_status: "customer_marked_sent",
      crypto_asset: asset,
      message: `${asset} payment submitted for manual verification.`,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}