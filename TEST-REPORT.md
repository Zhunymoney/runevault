# RuneVault test report — 2026-08-01

## Passed

- `npm run lint`: passed with zero ESLint errors.
- `npm run typecheck`: passed with zero TypeScript errors.
- `npm run build`: passed locally; 39 routes generated.
- Vercel production build: passed on Node/Next.js 16.2.12; deployment reached Ready.
- Live alias smoke test: `/`, `/quote`, `/support`, `/health`, and `/pay` returned 200.
- Live security headers: Content Security Policy, HSTS, and `X-Content-Type-Options` present.
- Local security verification: database-backed rate limiting compiles on crypto configuration/submission, Stripe creation, payment proof upload, order cancellation, and customer ticket mutation routes; the production migration still requires Supabase access before distributed enforcement can be live-verified.
- Local admin verification: the authenticated audit API and searchable audit viewer compile successfully; deployment verification asserts anonymous requests receive a JSON authorization error.
- Local customer-management verification: server-authorized search, deletion-request resolution, owner-only role changes, self-demotion protection, and audit writes pass lint/type/build; deployment verification asserts anonymous access is rejected as JSON.
- Local marketplace verification: public listing search, stock/limit cards, scheduled announcements, admin publishing, public/admin RLS migration, navigation, sitemap, and clean API errors pass lint, TypeScript, and the 60-route production build; live data remains migration-dependent.
- Live crypto API error contract: correct POST request with invalid context returns parseable JSON instead of an empty response.
- API protections: unauthenticated admin/support/payment routes inspected; customer/admin bearer and RLS checks are implemented server-side.
- Static responsive review: customer, payment, support, OSRS, policy, error, loading, and empty states compile at mobile/tablet/desktop breakpoints.
- Git: local `main` equals `origin/main`; generated TypeScript build info is ignored.

## Implemented but not live-testable in this environment

- BTC and USDC selection, signed quotes, QR generation, exact amounts, transaction submission, duplicate handling, proof upload, and persisted payment details require a real signed-in owner order plus the Section 1 migration/grants.
- Card success/failure/refund, Apple Pay, and Google Pay require activated Stripe test/live credentials, webhook configuration, and domain approval.
- Registration verification, password email, transactional email, Discord, and provider notifications require their external credentials/delivery targets.
- New account, workflow, inventory, reporting, automation, rewards, support, security, and content tables/RLS require applying migrations with Supabase CLI access or a database password.
- Inventory reservation/release, admin mutations, support replies/chat, fraud queue, analytics accuracy, and customer isolation cannot be honestly exercised live before those migrations and test identities exist.
- CAPTCHA is documented but not enforced because matching provider keys are not configured.

## Deployment

- Production alias: `https://runevault-beta.vercel.app`
- Verified immutable deployment: `https://runevault-arvmqyf8c-rune-vault.vercel.app`
- The Hobby plan runs operations once daily at 09:15 UTC; hourly execution requires Pro or an external scheduler.
