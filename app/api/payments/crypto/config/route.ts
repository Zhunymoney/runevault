import { NextResponse } from "next/server";
import {
  getOrderByReference,
  rateLimit,
  requestIp,
} from "@/lib/launch-server";

export async function POST(request: Request) {
  const limit = rateLimit(`crypto-config:${requestIp(request)}`, 10);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = (await request.json()) as { reference?: string };
  const reference = body.reference?.trim().toUpperCase();

  if (!reference) {
    return NextResponse.json({ error: "Reference required." }, { status: 400 });
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
console.log("BTC:", process.env.CRYPTO_BTC_ADDRESS);
console.log("USDC:", process.env.CRYPTO_USDC_ADDRESS);
console.log("NETWORK:", process.env.CRYPTO_USDC_NETWORK);
  const methods = [
    process.env.CRYPTO_BTC_ADDRESS
      ? {
          id: "btc",
          name: "Bitcoin",
          network: "Bitcoin",
          address: process.env.CRYPTO_BTC_ADDRESS,
        }
      : null,
    process.env.CRYPTO_USDC_ADDRESS
      ? {
          id: "usdc",
          name: "USDC",
          network: process.env.CRYPTO_USDC_NETWORK ?? "Base",
          address: process.env.CRYPTO_USDC_ADDRESS,
        }
      : null,
  ].filter(Boolean);

  return NextResponse.json({
    reference: order.reference,
    usdAmount: Number(order.total_price),
    methods,
    warning:
      "Send only the selected asset on the stated network. Crypto orders remain under manual review until receipt is verified.",
  });
}
