import { NextResponse } from "next/server";
import { getOrderByReference, rateLimit, requestIp, requireOrderOwner } from "@/lib/launch-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(`crypto-config:${requestIp(request)}`, 10);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    reference?: unknown;
  } | null;

  const reference =
    typeof body?.reference === "string"
      ? body.reference.trim().toUpperCase()
      : "";

  if (!reference) {
    return NextResponse.json(
      { error: "Order reference required." },
      { status: 400 },
    );
  }

  const order = await getOrderByReference(reference);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    await requireOrderOwner(request, order);
  } catch (reason) {
    if (reason instanceof Response) return reason;
    throw reason;
  }

  const btcAddress = process.env.CRYPTO_BTC_ADDRESS?.trim() ?? "";
  const usdcAddress = process.env.CRYPTO_USDC_ADDRESS?.trim() ?? "";
  const usdcNetwork = process.env.CRYPTO_USDC_NETWORK?.trim() || "Base";

  const methods: Array<{
    id: "btc" | "usdc";
    name: string;
    network: string;
    address: string;
  }> = [];

  if (btcAddress) {
    methods.push({
      id: "btc",
      name: "Bitcoin",
      network: "Bitcoin",
      address: btcAddress,
    });
  }

  if (usdcAddress) {
    methods.push({
      id: "usdc",
      name: "USDC",
      network: usdcNetwork,
      address: usdcAddress,
    });
  }

  if (methods.length === 0) {
    console.error(
      "Crypto configuration missing: CRYPTO_BTC_ADDRESS and CRYPTO_USDC_ADDRESS are not available.",
    );

    return NextResponse.json(
      {
        error:
          "Crypto payment addresses are not configured on this deployment.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      reference,
      methods,
      warning:
        "Send only the selected asset on the stated network. Crypto orders remain under manual review until receipt is verified.",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
