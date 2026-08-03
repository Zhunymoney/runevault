import assert from "node:assert/strict";
import test from "node:test";
import { authErrorMessage } from "../lib/auth-error.ts";

test("auth errors preserve Supabase confirmation-email failures", () => {
  assert.equal(authErrorMessage(new Error("Error sending confirmation email")), "Error sending confirmation email");
  assert.equal(authErrorMessage({ msg: "Error sending confirmation email" }), "Error sending confirmation email");
});

test("empty serialized auth errors never render as braces", () => {
  assert.equal(authErrorMessage({}), "Authentication failed. Please try again.");
  assert.equal(authErrorMessage({ message: "{}" }), "Authentication failed. Please try again.");
});
