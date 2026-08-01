import assert from "node:assert/strict";
import test from "node:test";
import { buildCryptoSubmission } from "../lib/payment-submission.ts";
import { parseApiResponse } from "../lib/client-api.ts";

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
