import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

function loadEnv(path) {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/);
    if (match) process.env[match[1]] ??= match[2].replace(/^['"]|['"]$/g, "");
  }
}
loadEnv(".env.supabase.local");
const ref = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !accessToken) throw new Error("Supabase project ref and access token are required.");
const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!keysResponse.ok) throw new Error(`Supabase API key lookup failed (${keysResponse.status}).`);
const keys = await keysResponse.json();
const anon = keys.find((key) => key.name === "anon")?.api_key;
const service = keys.find((key) => key.name === "service_role")?.api_key;
if (!anon || !service) throw new Error("Required Supabase API keys were not returned.");
const base = `https://${ref}.supabase.co`;
const suffix = randomUUID();
const password = `Rv!${randomUUID()}a9`;
const users = [];
const adminHeaders = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };

async function createUser(label) {
  const email = `codex-audit-${label}-${suffix}@example.invalid`;
  const response = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST", headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { audit_marker: suffix } }),
  });
  if (!response.ok) throw new Error(`Audit user creation failed (${response.status}).`);
  const user = await response.json();
  users.push(user.id);
  const tokenResponse = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenResponse.ok) throw new Error(`Audit sign-in failed (${tokenResponse.status}).`);
  return { id: user.id, token: (await tokenResponse.json()).access_token };
}

function userHeaders(token) {
  return { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
function assertDenied(response, label) {
  if (response.ok) throw new Error(`${label} unexpectedly succeeded (${response.status}).`);
}

try {
  const attacker = await createUser("attacker");
  const other = await createUser("other");
  const promotion = await fetch(`${base}/rest/v1/profiles?id=eq.${attacker.id}`, {
    method: "PATCH", headers: userHeaders(attacker.token),
    body: JSON.stringify({ role: "admin", admin_role: "owner" }),
  });
  assertDenied(promotion, "Profile privilege escalation");
  const forgedOrder = await fetch(`${base}/rest/v1/orders`, {
    method: "POST", headers: userHeaders(attacker.token),
    body: JSON.stringify({ user_id: attacker.id, order_type: "buy", amount_m: 10, price_per_m: 0, total_price: 0, status: "paid" }),
  });
  assertDenied(forgedOrder, "Direct forged order insert");
  const otherOrderResponse = await fetch(`${base}/rest/v1/orders`, {
    method: "POST", headers: { ...adminHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ user_id: other.id, order_type: "buy", amount_m: 10, price_per_m: 0.18, total_price: 1.8, status: "pending", delivery_name: "AuditOnly", notes: `audit:${suffix}` }),
  });
  if (!otherOrderResponse.ok) throw new Error(`Audit fixture order failed (${otherOrderResponse.status}).`);
  const otherOrder = (await otherOrderResponse.json())[0];
  const crossTicket = await fetch(`${base}/rest/v1/support_tickets`, {
    method: "POST", headers: userHeaders(attacker.token),
    body: JSON.stringify({ user_id: attacker.id, order_id: otherOrder.id, category: "other", subject: "Authorization audit" }),
  });
  assertDenied(crossTicket, "Cross-user support order link");
  const poison = await fetch(`${base}/rest/v1/rpc/claim_order_notification`, {
    method: "POST", headers: userHeaders(attacker.token),
    body: JSON.stringify({ p_order_id: otherOrder.id, p_event_key: `order-created:${otherOrder.id}`, p_event_type: "order_created", p_channel: "internal" }),
  });
  assertDenied(poison, "Customer notification claim");
  console.log("Production authorization checks passed: profile roles, order inserts, support links, and notification claims are server-controlled.");
} finally {
  for (const id of users.reverse()) {
    const response = await fetch(`${base}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: adminHeaders });
    if (!response.ok) console.error(`WARNING: audit user cleanup failed for ${id} (${response.status}).`);
  }
}
