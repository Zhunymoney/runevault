const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL", "PAYMENT_QUOTE_SECRET", "CRYPTO_BTC_ADDRESS", "CRYPTO_USDC_ADDRESS", "CRYPTO_USDC_NETWORK"];
const failures = [];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) failures.push(`Missing required variables: ${missing.join(", ")}`);
if (process.env.CRYPTO_USDC_NETWORK && process.env.CRYPTO_USDC_NETWORK.toLowerCase() !== "base") failures.push("CRYPTO_USDC_NETWORK must be Base.");
if (process.env.PAYMENT_QUOTE_SECRET && process.env.PAYMENT_QUOTE_SECRET.length < 32) failures.push("PAYMENT_QUOTE_SECRET must be at least 32 characters.");
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) failures.push("NEXT_PUBLIC_SUPABASE_URL is not a Supabase HTTPS project URL.");
for (const name of Object.keys(process.env)) if (name.startsWith("NEXT_PUBLIC_") && /(SECRET|SERVICE_ROLE|PRIVATE|WEBHOOK)/i.test(name)) failures.push(`${name} appears to expose a server secret to the browser.`);
const groups = [{ name: "Stripe", keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, { name: "Email", keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "ADMIN_NOTIFICATION_EMAIL"] }];
for (const group of groups) { const count = group.keys.filter(key => process.env[key]?.trim()).length; if (count > 0 && count < group.keys.length) failures.push(`${group.name} is partially configured; set all of: ${group.keys.join(", ")}`); }
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("RuneVault environment validation passed.");
