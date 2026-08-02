import assert from "node:assert/strict";
import test from "node:test";
import { hasValidFileSignature } from "../lib/upload-validation.ts";

test("upload validation accepts supported file signatures", () => {
  assert.equal(hasValidFileSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(hasValidFileSignature(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf"), true);
  assert.equal(hasValidFileSignature(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), "image/webp"), true);
});

test("upload validation rejects spoofed MIME types", () => {
  assert.equal(hasValidFileSignature(new TextEncoder().encode("<script>alert(1)</script>"), "image/png"), false);
  assert.equal(hasValidFileSignature(Uint8Array.from([0x52, 0x49, 0x46, 0x46]), "image/webp"), false);
  assert.equal(hasValidFileSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "text/html"), false);
});
