import assert from "node:assert/strict";
import test from "node:test";
import { sendEmail } from "../lib/launch-server.ts";

test("transactional email reports missing production configuration", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalError = console.error;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  console.error = () => {};
  try {
    assert.deepEqual(
      await sendEmail({ to: "recipient@example.invalid", subject: "Test", html: "<p>Test</p>" }),
      { sent: false, reason: "not_configured" },
    );
  } finally {
    console.error = originalError;
    if (originalKey) process.env.RESEND_API_KEY = originalKey;
    if (originalFrom) process.env.RESEND_FROM_EMAIL = originalFrom;
  }
});

test("transactional email exposes provider rejection to server callers", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalTestRecipient = process.env.EMAIL_TEST_RECIPIENT;
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM_EMAIL = "RuneVault <orders@example.invalid>";
  process.env.EMAIL_TEST_RECIPIENT = "recipient@example.invalid";
  globalThis.fetch = async () => new Response(
    JSON.stringify({ name: "validation_error", message: "Domain is not verified" }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
  console.error = () => {};
  try {
    assert.deepEqual(
      await sendEmail({ to: "recipient@example.invalid", subject: "Test", html: "<p>Test</p>" }),
      { sent: false, reason: "provider_rejected" },
    );
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
    if (originalKey) process.env.RESEND_API_KEY = originalKey;
    else delete process.env.RESEND_API_KEY;
    if (originalFrom) process.env.RESEND_FROM_EMAIL = originalFrom;
    else delete process.env.RESEND_FROM_EMAIL;
    if (originalTestRecipient) process.env.EMAIL_TEST_RECIPIENT = originalTestRecipient;
    else delete process.env.EMAIL_TEST_RECIPIENT;
  }
});
