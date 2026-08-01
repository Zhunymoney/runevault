# RuneVault deployment and provider setup

## Required environments

Configure each required variable in Vercel Production, Preview, and Development. Values are secrets unless explicitly public.

| Variable | Purpose | Public |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical production origin | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged database operations | No |
| `CRYPTO_BTC_ADDRESS` | Public BTC receiving address | Displayed only on authenticated payment flow |
| `CRYPTO_USDC_ADDRESS` | Public USDC receiving address | Displayed only on authenticated payment flow |
| `CRYPTO_USDC_NETWORK` | Must be `Base` | Yes |
| `PAYMENT_QUOTE_SECRET` | Signs expiring crypto quotes; minimum 32 random characters | No |
| `CRON_SECRET` | Authorizes scheduled operations endpoint | No |

Optional complete provider groups: Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY`), Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), Discord (`DISCORD_WEBHOOK_URL`), Google Analytics (`NEXT_PUBLIC_GA_MEASUREMENT_ID`), CAPTCHA (provider site key plus server secret), and external chat (provider ID only after selecting and reviewing a provider).

## Local setup and validation

1. Install the pinned lockfile with `npm ci`.
2. Copy `.env.example` to `.env.local` and supply authorized development values. Never commit it.
3. Run `npm run lint`, `npm run typecheck`, `npm run validate:env`, and `npm run build`.
4. Start with `npm run dev` and test authentication, both order types, payment selection, tracking, account isolation, and admin denial.

## Supabase migrations

Migrations in `supabase/migrations` are the canonical schema, beginning with `202608010000_initial_schema.sql`, and are additive and ordered. Before production: create/verify a backup, link the correct project with `supabase link --project-ref ...`, inspect `supabase db diff`, apply with `supabase db push`, and record the CLI output. Never run against production using an unverified project reference. Test RLS with separate customer, staff, and anonymous sessions after applying.

Production migration history is aligned with the canonical chain through `202608011500_sync_production_schema.sql`. Before future changes, confirm `supabase migration list --linked` is aligned and require a clean `supabase db push --linked --dry-run` after applying.

## Provider setup

- Stripe: activate the account, configure Apple Pay domain verification and eligible Google Pay/Payment Element behavior, add the production webhook endpoint `/api/payments/stripe/webhook`, subscribe to checkout completion/failure/refund events, and run Stripe test-mode plus live-readiness checks.
- Discord: create a private operations channel webhook, store it only as `DISCORD_WEBHOOK_URL`, send a test event, and rotate it if exposed.
- Email: verify the sending domain, configure SPF/DKIM, set a verified `RESEND_FROM_EMAIL`, and test HTML/plain-text templates on desktop and mobile.
- CAPTCHA: configure matching public/server keys and verify tokens server-side on high-abuse forms before enforcing it.
- Chat: native Supabase Realtime schema is prepared. If using Crisp, Tawk.to, or Intercom, store only the public provider identifier client-side and keep API secrets server-only; do not enable two chat systems simultaneously.

## Deploy, monitor, and roll back

Push reviewed commits to `main`; GitHub integration creates a production deployment. Confirm `Ready`, then run `npm run verify:deployment -- https://runevault-beta.vercel.app`. Review `/health`, Vercel function logs, automation failures, payment errors, and Supabase logs without logging secrets.

The Hobby-plan cron runs operations once daily at 09:15 UTC. Hourly stale-order and inventory checks require a Vercel Pro upgrade or an authorized external scheduler calling the same secret-protected endpoint.

For app-only rollback, promote the last known-good Vercel deployment after confirming it is schema-compatible. For database recovery, follow `SECURITY-OPERATIONS.md`: restore into isolation, validate counts/RLS/payment and inventory invariants, rotate affected secrets, then promote. Never delete or reverse production data to make an older app build appear compatible.
