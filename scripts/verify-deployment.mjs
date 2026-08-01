const base = (
  process.argv[2] ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ""
).replace(/\/$/, "");
if (!/^https:\/\//.test(base)) {
  console.error(
    "Usage: npm run verify:deployment -- https://your-domain.example",
  );
  process.exit(1);
}
const checks = [];
for (const path of [
  "/",
  "/quote",
  "/cart",
  "/marketplace",
  "/osrs",
  "/support",
  "/health",
  "/pay",
]) {
  const response = await fetch(`${base}${path}`, { redirect: "follow" });
  checks.push({ name: path, ok: response.ok, detail: `${response.status}` });
  if (path === "/") {
    for (const header of [
      "content-security-policy",
      "strict-transport-security",
      "x-content-type-options",
    ])
      checks.push({
        name: header,
        ok: Boolean(response.headers.get(header)),
        detail: response.headers.get(header) ? "present" : "missing",
      });
    const html = await response.text();
    checks.push({
      name: "structured data",
      ok:
        html.includes("application/ld+json") &&
        html.includes("FAQPage") &&
        html.includes("Organization"),
      detail: "homepage schemas",
    });
  }
}
const api = await fetch(`${base}/api/payments/crypto/config`, {
  method: "POST",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ reference: "RV-INVALID" }),
});
let apiJson = false;
try {
  await api.json();
  apiJson = true;
} catch {}
checks.push({
  name: "crypto API JSON errors",
  ok: apiJson && !api.ok,
  detail: `${api.status}`,
});
for (const [name, path, init] of [
  [
    "chat validation JSON",
    "/api/support/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  ],
  [
    "ticket auth JSON",
    "/api/support/tickets",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin support auth JSON",
    "/api/admin/support",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin inventory auth JSON",
    "/api/admin/inventory",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin pricing auth JSON",
    "/api/admin/pricing",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin marketing auth JSON",
    "/api/admin/marketing",
    { headers: { Accept: "application/json" } },
  ],
  [
    "order create auth JSON",
    "/api/orders/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  ],
  [
    "admin content auth JSON",
    "/api/admin/content",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin audit auth JSON",
    "/api/admin/audit",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin customer auth JSON",
    "/api/admin/customers",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin announcement auth JSON",
    "/api/admin/announcements",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin automation auth JSON",
    "/api/admin/automation",
    { headers: { Accept: "application/json" } },
  ],
  [
    "admin fraud auth JSON",
    "/api/admin/fraud",
    { headers: { Accept: "application/json" } },
  ],
  [
    "referral auth JSON",
    "/api/rewards/referrals",
    { headers: { Accept: "application/json" } },
  ],
  [
    "account security auth JSON",
    "/api/account/security",
    { headers: { Accept: "application/json" } },
  ],
  [
    "login event auth JSON",
    "/api/account/login-event",
    { method: "POST", headers: { Accept: "application/json" } },
  ],
  [
    "password event auth JSON",
    "/api/account/password-event",
    { method: "POST", headers: { Accept: "application/json" } },
  ],
]) {
  const response = await fetch(`${base}${path}`, init);
  let valid = false;
  try {
    const data = await response.json();
    valid = Boolean(data && typeof data.error === "string");
  } catch {}
  checks.push({
    name,
    ok: valid && !response.ok,
    detail: `${response.status}`,
  });
}
const marketplace = await fetch(`${base}/api/marketplace`, {
  headers: { Accept: "application/json" },
});
let marketplaceJson = false;
try {
  const data = await marketplace.json();
  marketplaceJson = Boolean(
    data && (Array.isArray(data.listings) || typeof data.error === "string"),
  );
} catch {}
checks.push({
  name: "marketplace API JSON",
  ok: marketplaceJson,
  detail: `${marketplace.status}`,
});
const pricing = await fetch(`${base}/api/pricing/config`, {
  headers: { Accept: "application/json" },
});
let pricingJson = false;
try {
  const data = await pricing.json();
  pricingJson = Boolean(
    data &&
    data.settings &&
    Number(data.settings.buy_rate) > 0 &&
    Number(data.settings.sell_rate) > 0,
  );
} catch {}
checks.push({
  name: "public authoritative pricing JSON",
  ok: pricing.ok && pricingJson,
  detail: `${pricing.status}`,
});
for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
if (checks.some((check) => !check.ok)) process.exit(1);
