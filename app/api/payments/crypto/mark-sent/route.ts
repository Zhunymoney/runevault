import { NextResponse } from "next/server";
import {
  getOrderByReference,
  rateLimit,
  requestIp,
  riskScore,
  sendDiscord,
  updateOrder,
} from "@/lib/launch-server";

export async function POST(request: Request) {
  const limit = rateLimit(`crypto-sent:${requestIp(request)}`, 4, 5 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "This request was already submitted recently." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    reference?: string;
    asset?: string;
    txid?: string;
  };

  const reference = body.reference?.trim().toUpperCase();
  const asset = body.asset?.trim().toUpperCase();
  const txid = body.txid?.trim();

  if (!reference || !asset || !txid || txid.length < 8 || txid.length > 160) {
    return NextResponse.json(
      { error: "Reference, asset, and a valid transaction ID are required." },
      { status: 400 },
    );
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
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
    { name: "Reference", value: order.reference, inline: true },
    { name: "Asset", value: asset, inline: true },
    { name: "Transaction ID", value: txid.slice(0, 100) },
    { name: "Risk", value: `${risk.level} (${risk.score}/100)`, inline: true },
  ]);

  return NextResponse.json({
    ok: true,
    message:
      "Submitted for manual review. This does not confirm payment.",
  });
}
