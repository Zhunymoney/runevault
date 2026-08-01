const base = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) { console.error("Usage: npm run verify:deployment -- https://your-domain.example"); process.exit(1); }
const checks = [];
for (const path of ["/", "/quote", "/support", "/health", "/pay"]) {
  const response = await fetch(`${base}${path}`, { redirect: "follow" });
  checks.push({ name: path, ok: response.ok, detail: `${response.status}` });
  if (path === "/") for (const header of ["content-security-policy", "strict-transport-security", "x-content-type-options"]) checks.push({ name: header, ok: Boolean(response.headers.get(header)), detail: response.headers.get(header) ? "present" : "missing" });
}
const api = await fetch(`${base}/api/payments/crypto/config?reference=RV-INVALID`, { headers: { Accept: "application/json" } });
let apiJson = false; try { await api.json(); apiJson = true; } catch {}
checks.push({ name: "crypto API JSON errors", ok: apiJson && !api.ok, detail: `${api.status}` });
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
if (checks.some(check => !check.ok)) process.exit(1);
