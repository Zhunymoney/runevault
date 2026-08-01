# RuneVault All-in-One

A database-backed Next.js test-mode marketplace foundation.

## Included
- Supabase email authentication
- Customer profiles and role-based admin access
- Database orders created from the live quote calculator
- Customer account dashboard and order tracking
- Admin pricing, inventory, maintenance mode, and status controls
- Row Level Security policies
- Authenticated Stripe Checkout and manual BTC/USDC submission flows
- Payment provider, asset, status, transaction ID, risk, and paid-at tracking

## Install on Windows
1. Extract the ZIP and open the `runevault-all-in-one` folder in VS Code.
2. Open Terminal.
3. Run `npm.cmd install`.
4. Copy `.env.example` to `.env.local` and configure the required public and server-only values.
5. In Supabase SQL Editor, run all of `supabase/schema.sql`.
6. Restart with `npm.cmd run dev` and open `http://localhost:3000`.
7. Create/sign in to your account.
8. To make yourself admin, edit and run `supabase/make-first-admin.sql` using your login email.

## Existing Supabase project
If the project already has older `profiles`, `settings`, or `orders` tables, use a new Supabase project for the cleanest setup. Do not run destructive migrations without a backup.

## Security
- Never put a service-role or secret key in `.env.local` with a `NEXT_PUBLIC_` name.
- The publishable/anon key is intended for browser use when RLS is configured.
- `/admin` checks the profile role in the UI and all sensitive database writes are also protected by RLS.
- Payment routes verify the caller's Supabase access token and order ownership before returning addresses or mutating an order.
- Order pricing and protected fields are recalculated by a database trigger; clients cannot choose their own price or payment state.

## Payments

- Configure `CRYPTO_BTC_ADDRESS`, `CRYPTO_USDC_ADDRESS`, and `CRYPTO_USDC_NETWORK` to enable crypto choices and QR codes.
- Configure `PAYMENT_QUOTE_SECRET` with a long random server-only value. It signs the 15-minute BTC/USDC amount locks and must never use a `NEXT_PUBLIC_` prefix.
- Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; point Stripe's webhook at `/api/payments/stripe/webhook`.
- Apply `supabase/migrations/202608010100_section1_payments.sql` to an existing project before enabling proof uploads or Stripe webhooks. It is additive, preserves existing orders, creates the private proof bucket and payment event ledger, and restores the server-only grants required by webhook processing.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, notification credentials, and webhook URLs server-only.

BTC amounts use Coinbase's unauthenticated BTC-USD spot-price endpoint and are signed with an expiry. USDC is quoted at one USD per USDC. A customer must refresh an expired quote before submitting a transaction hash. Stripe Checkout requests use a stable per-order idempotency key; Apple Pay and Google Pay availability remains controlled by Stripe, the approved account, domain registration, and the customer's supported device/wallet.

## Production warning
Payment code is implemented, but real-money launch still requires approved provider accounts, reviewed legal policies, durable distributed rate limiting, monitoring, backups, and operational testing. See `PRODUCTION-CHECKLIST.txt`.
