import assert from "node:assert/strict";
import test from "node:test";
import { buildCryptoSubmission } from "../lib/payment-submission.ts";
import { parseApiResponse } from "../lib/client-api.ts";
import {
  combatLevel,
  levelForXp,
  xpForLevel,
} from "../lib/osrs-calculators.ts";
import { sellerTransitionError } from "../lib/order-lifecycle.ts";
import { browserFamily } from "../lib/security-fingerprint.ts";
import { resolveEffectivePrice } from "../lib/pricing.ts";
import { normalizeCart } from "../lib/cart.ts";

test("BTC selection produces the exact API payment method", () => {
  assert.deepEqual(
    buildCryptoSubmission(
      "rv-test123",
      { id: "btc", quoteToken: "signed-btc" },
      " tx-btc-123 ",
    ),
    {
      reference: "RV-TEST123",
      paymentMethod: "btc",
      quoteToken: "signed-btc",
      txid: "tx-btc-123",
    },
  );
});

test("USDC selection produces the exact API payment method", () => {
  assert.deepEqual(
    buildCryptoSubmission(
      "RV-TEST456",
      { id: "usdc", quoteToken: "signed-usdc" },
      "tx-usdc-456",
    ),
    {
      reference: "RV-TEST456",
      paymentMethod: "usdc",
      quoteToken: "signed-usdc",
      txid: "tx-usdc-456",
    },
  );
});

test("unsupported crypto assets cannot reach the API payload", () => {
  assert.throws(
    () =>
      buildCryptoSubmission(
        "RV-TEST789",
        { id: "eth", quoteToken: "bad" },
        "tx-eth",
      ),
    /Select BTC or USDC/,
  );
});

test("API parser accepts valid JSON", async () => {
  assert.deepEqual(
    await parseApiResponse(new Response('{"ok":true}', { status: 200 })),
    { ok: true },
  );
});

test("API parser reports structured and non-JSON errors cleanly", async () => {
  await assert.rejects(
    parseApiResponse(new Response('{"error":"Order denied"}', { status: 403 })),
    /Order denied/,
  );
  await assert.rejects(
    parseApiResponse(new Response("gateway unavailable", { status: 502 })),
    /gateway unavailable/,
  );
  await assert.rejects(
    parseApiResponse(new Response("", { status: 500 })),
    /Request failed \(500\)/,
  );
});

test("OSRS XP thresholds match canonical level values", () => {
  assert.equal(xpForLevel(2), 83);
  assert.equal(xpForLevel(99), 13_034_431);
  assert.equal(levelForXp(13_034_430), 98);
  assert.equal(levelForXp(13_034_431), 99);
});

test("OSRS combat formula handles starter and maxed combat stats", () => {
  assert.equal(
    combatLevel({
      attack: 1,
      strength: 1,
      defence: 1,
      hitpoints: 10,
      prayer: 1,
      ranged: 1,
      magic: 1,
    }),
    3,
  );
  assert.equal(
    combatLevel({
      attack: 99,
      strength: 99,
      defence: 99,
      hitpoints: 99,
      prayer: 99,
      ranged: 99,
      magic: 99,
    }),
    126,
  );
});

test("seller payout lifecycle allows forward operational transitions", () => {
  assert.equal(
    sellerTransitionError("awaiting_meetup", "gold_received", "fulfillment"),
    null,
  );
  assert.equal(
    sellerTransitionError("verification", "payout_pending", "manager"),
    null,
  );
});

test("seller payout lifecycle rejects backward and post-receipt rejection", () => {
  assert.match(
    sellerTransitionError("verification", "gold_received", "manager"),
    /backward/i,
  );
  assert.match(
    sellerTransitionError("gold_received", "rejected", "manager"),
    /cannot be rejected/i,
  );
});

test("fulfillment cannot authorize seller payouts", () => {
  assert.match(
    sellerTransitionError("verification", "payout_pending", "fulfillment"),
    /cannot authorize/i,
  );
});

test("login history stores coarse browser and platform labels", () => {
  assert.equal(
    browserFamily("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0"),
    "Chrome on Windows",
  );
  assert.equal(
    browserFamily("Mozilla/5.0 (iPhone) Version/17.0 Safari/605.1"),
    "Safari on iOS",
  );
});

test("pricing selects newest active schedule and highest qualifying tier", () => {
  const price = resolveEffectivePrice({
    orderType: "buy",
    amountM: 500,
    baseRate: 0.2,
    now: new Date("2026-08-01T12:00:00Z"),
    schedules: [
      {
        id: "old",
        buy_rate: 0.19,
        sell_rate: null,
        starts_at: "2026-07-01T00:00:00Z",
        ends_at: null,
        active: true,
      },
      {
        id: "current",
        buy_rate: 0.18,
        sell_rate: null,
        starts_at: "2026-08-01T00:00:00Z",
        ends_at: "2026-08-02T00:00:00Z",
        active: true,
      },
    ],
    tiers: [
      {
        id: "small",
        order_type: "buy",
        minimum_amount_m: 100,
        rate_adjustment: -0.005,
        active: true,
      },
      {
        id: "large",
        order_type: "buy",
        minimum_amount_m: 500,
        rate_adjustment: -0.01,
        active: true,
      },
    ],
  });
  assert.deepEqual(price, {
    rate: 0.17,
    scheduleId: "current",
    tierId: "large",
    adjustment: -0.01,
  });
});

test("pricing ignores expired schedules and non-qualifying tiers", () => {
  const price = resolveEffectivePrice({
    orderType: "sell",
    amountM: 50,
    baseRate: 0.15,
    now: new Date("2026-08-01T12:00:00Z"),
    schedules: [
      {
        id: "expired",
        buy_rate: null,
        sell_rate: 0.2,
        starts_at: "2026-07-01T00:00:00Z",
        ends_at: "2026-07-02T00:00:00Z",
        active: true,
      },
    ],
    tiers: [
      {
        id: "large",
        order_type: "sell",
        minimum_amount_m: 100,
        rate_adjustment: 0.01,
        active: true,
      },
    ],
  });
  assert.deepEqual(price, {
    rate: 0.15,
    scheduleId: null,
    tierId: null,
    adjustment: 0,
  });
});

test("cart keeps valid items and rejects corrupted persisted data", () => {
  const items = normalizeCart([
    {
      id: "123e4567-e89b-42d3-a456-426614174000",
      orderType: "buy",
      amountM: 250.9,
      deliveryName: " Valid Name ",
      createdAt: "2026-08-01T00:00:00Z",
    },
    { id: "bad", orderType: "buy", amountM: -1 },
    {
      id: "123e4567-e89b-42d3-a456-426614174001",
      orderType: "rs3",
      amountM: 100,
    },
  ]);
  assert.deepEqual(items, [
    {
      id: "123e4567-e89b-42d3-a456-426614174000",
      orderType: "buy",
      amountM: 250,
      deliveryName: "Valid Name",
      createdAt: "2026-08-01T00:00:00Z",
    },
  ]);
});
