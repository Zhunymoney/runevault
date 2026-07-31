import { NextResponse } from "next/server";
import { rateLimit, requestIp } from "@/lib/launch-server";

export async function POST(request: Request) {
  const limit = rateLimit(`crypto-config:${requestIp(request)}`, 10);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    reference?: string;
  };

  const reference = body.reference?.trim().toUpperCase();

  if (!reference) {
    return NextResponse.json(
      { error: "Reference required." },
      { status: 400 },
    );
  }

  const btcAddress = process.env.CRYPTO_BTC_ADDRESS?.trim();
  const usdcAddress = process.env.CRYPTO_USDC_ADDRESS?.trim();
  const usdcNetwork =
    process.env.CRYPTO_USDC_NETWORK?.trim() || "Base";

  const methods = [
    btcAddress
      ? {
          id: "btc",
          name: "Bitcoin",
          network: "Bitcoin",
          address: btcAddress,
        }
      : null,
    usdcAddress
      ? {
          id: "usdc",
          name: "USDC",
          network: usdcNetwork,
          address: usdcAddress,
        }
      : null,
  ].filter(Boolean);

  return NextResponse.json({
    reference,
    methods,
    warning:
      "Send only the selected asset on the stated network. Crypto orders remain under manual review until receipt is verified.",
  });
}