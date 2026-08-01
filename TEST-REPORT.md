# RuneVault test report — 2026-08-01

## Passed

- `npm run test:critical`: 10 passed, 0 failed; BTC and USDC payload mapping, unsupported-asset rejection, valid/structured/non-JSON/empty API response handling, canonical OSRS XP thresholds, starter/maxed combat formulas, and seller-payout transition/role invariants are executable assertions.
- Local OSRS tools verification: level-to-XP, XP-to-virtual-level (through 200M), and combat-level calculators pass canonical threshold/formula tests, lint, TypeScript, and build.
- GitHub Actions runs critical tests, lint, TypeScript, and production build on `main` pushes and pull requests.

- `npm run lint`: passed with zero ESLint errors.
- `npm run typecheck`: passed with zero TypeScript errors.
- `npm run build`: passed locally; 39 routes generated.
- Vercel production build: passed on Node/Next.js 16.2.12; deployment reached Ready.
- Live alias smoke test: `/`, `/quote`, `/support`, `/health`, and `/pay` returned 200.
- Live security headers: Content Security Policy, HSTS, and `X-Content-Type-Options` present.
- Local security verification: database-backed rate limiting compiles on crypto configuration/submission, Stripe creation, payment proof upload, order cancellation, and customer ticket mutation routes; the production migration still requires Supabase access before distributed enforcement can be live-verified.
- Local session-security verification: authenticated session registration/listing and global revocation use keyed token/IP fingerprints, coarse browser labels, owner-scoped responses, durable mutation limits, and safe JSON errors; lint and TypeScript pass. Live multi-device revocation remains migration/test-account dependent.
- Local fraud-operations verification: medium/high server-calculated order risk transactionally creates one review per order; the permission-protected queue supports prioritization, assignment, cleared/blocked outcomes, notes, durable limits, and audit writes. Live queue tests remain migration/test-identity dependent.
- Local seller-payout verification: server-authorized seller lifecycle updates reject buy orders and backward transitions, prevent fulfillment staff from authorizing payouts, synchronize completed payouts to completed orders, and write audit records; customer tracking already displays the resulting status. Live authenticated transitions remain migration/test-identity dependent.
- Local saved-draft verification: authenticated customers can persist, resume, and delete owner-isolated buy/sell checkout drafts under RLS without storing terms acceptance or creating an order; lint, TypeScript, and build verification cover the UI/data contract, while live CRUD remains migration/test-account dependent.
- Local individual-order routing verification: account history, confirmation, payment, receipt, Stripe return, and order-email links use stable encoded `/orders/[reference]` URLs; the dynamic page reuses the customer-isolated order lookup and Realtime timeline. Live ownership tests remain test-account dependent.
- Local admin verification: the authenticated audit API and searchable audit viewer compile successfully; deployment verification asserts anonymous requests receive a JSON authorization error.
- Local customer-management verification: server-authorized search, deletion-request resolution, owner-only role changes, self-demotion protection, and audit writes pass lint/type/build; deployment verification asserts anonymous access is rejected as JSON.
- Local admin-permission verification: all admin APIs require explicit server-side permissions; owner wildcard access, manage-to-read implications, legacy-staff denial, fulfillment transition restrictions, and durable mutation throttles pass lint, TypeScript, and the production build. Authenticated production role-matrix testing remains blocked until the admin migration is applied and test identities exist.
- Local marketplace verification: public listing search, stock/limit cards, scheduled announcements, admin publishing, public/admin RLS migration, navigation, sitemap, and clean API errors pass lint, TypeScript, and the 60-route production build; live data remains migration-dependent.
- Local SEO verification: reusable escaped JSON-LD, Organization/WebSite search, FAQ, Article/HowTo, BreadcrumbList, dynamic article canonicals/Open Graph metadata, and accessible article breadcrumbs pass lint/type/build; deployment verification checks homepage schemas render.
- Local support-file verification: ticket and signed-in/token-isolated guest chat attachment upload, authorized metadata listing, five-minute signed download links, MIME/size controls, and durable upload/chat mutation limits pass critical tests, lint, TypeScript, and production build; live storage remains migration/bucket dependent.
- Local automation verification: secret-protected daily cron, transactional expiry, stale-order/stock checks, persistent run/failure details, and role-gated internal automation/notification dashboard compile successfully; deployment verification asserts anonymous dashboard API access is rejected as JSON.
- Local rewards verification: reusable referral codes, single claim per customer, self/late-claim rejection, $20 completed-buy qualification, idempotent 100-point two-party awards, VIP recalculation, account UI, admin oversight, safe marketing date validation, and durable limits pass lint/type/build; live database qualification remains migration-dependent.
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
