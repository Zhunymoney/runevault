import assert from "node:assert/strict";
import test from "node:test";
import { isTawkAllowedPath } from "../lib/tawk-routes.ts";

test("Tawk loads on public customer-facing routes", () => {
  for (const path of ["/", "/quote", "/marketplace", "/orders", "/support", "/account"]) {
    assert.equal(isTawkAllowedPath(path), true, path);
  }
});

test("Tawk is excluded from sensitive operational and transaction routes", () => {
  for (const path of ["/admin", "/admin/orders", "/auth", "/auth/update-password", "/checkout", "/order-confirmation", "/pay", "/receipt"]) {
    assert.equal(isTawkAllowedPath(path), false, path);
  }
});
