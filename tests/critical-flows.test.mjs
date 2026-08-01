import assert from "node:assert/strict";
import test from "node:test";
import { buildCryptoSubmission } from "../lib/payment-submission.ts";
import { parseApiResponse } from "../lib/client-api.ts";
import { combatLevel, levelForXp, xpForLevel } from "../lib/osrs-calculators.ts";
import { sellerTransitionError } from "../lib/order-lifecycle.ts";

test("BTC selection produces the exact API payment method", () => {
  assert.deepEqual(buildCryptoSubmission("rv-test123", { id: "btc", quoteToken: "signed-btc" }, " tx-btc-123 "), { reference: "RV-TEST123", paymentMethod: "btc", quoteToken: "signed-btc", txid: "tx-btc-123" });
});

test("USDC selection produces the exact API payment method", () => {
  assert.deepEqual(buildCryptoSubmission("RV-TEST456", { id: "usdc", quoteToken: "signed-usdc" }, "tx-usdc-456"), { reference: "RV-TEST456", paymentMethod: "usdc", quoteToken: "signed-usdc", txid: "tx-usdc-456" });
});

test("unsupported crypto assets cannot reach the API payload", () => {
  assert.throws(() => buildCryptoSubmission("RV-TEST789", { id: "eth", quoteToken: "bad" }, "tx-eth"), /Select BTC or USDC/);
});

test("API parser accepts valid JSON", async () => {
  assert.deepEqual(await parseApiResponse(new Response('{"ok":true}', { status: 200 })), { ok: true });
});

test("API parser reports structured and non-JSON errors cleanly", async () => {
  await assert.rejects(parseApiResponse(new Response('{"error":"Order denied"}', { status: 403 })), /Order denied/);
  await assert.rejects(parseApiResponse(new Response("gateway unavailable", { status: 502 })), /gateway unavailable/);
  await assert.rejects(parseApiResponse(new Response("", { status: 500 })), /Request failed \(500\)/);
});

test("OSRS XP thresholds match canonical level values", () => {
  assert.equal(xpForLevel(2), 83);
  assert.equal(xpForLevel(99), 13_034_431);
  assert.equal(levelForXp(13_034_430), 98);
  assert.equal(levelForXp(13_034_431), 99);
});

test("OSRS combat formula handles starter and maxed combat stats", () => {
  assert.equal(combatLevel({ attack:1,strength:1,defence:1,hitpoints:10,prayer:1,ranged:1,magic:1 }), 3);
  assert.equal(combatLevel({ attack:99,strength:99,defence:99,hitpoints:99,prayer:99,ranged:99,magic:99 }), 126);
});

test("seller payout lifecycle allows forward operational transitions",()=>{
  assert.equal(sellerTransitionError("awaiting_meetup","gold_received","fulfillment"),null);
  assert.equal(sellerTransitionError("verification","payout_pending","manager"),null);
});

test("seller payout lifecycle rejects backward and post-receipt rejection",()=>{
  assert.match(sellerTransitionError("verification","gold_received","manager"),/backward/i);
  assert.match(sellerTransitionError("gold_received","rejected","manager"),/cannot be rejected/i);
});

test("fulfillment cannot authorize seller payouts",()=>{
  assert.match(sellerTransitionError("verification","payout_pending","fulfillment"),/cannot authorize/i);
});
