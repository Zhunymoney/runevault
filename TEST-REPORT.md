# RuneVault test report — 2026-08-01

## Realtime support presence and typing

- Added a shared Supabase Realtime channel for privacy-minimized staff/customer presence and per-conversation typing state.
- Customer and staff clients refresh their already-authorized API views on new `chat_messages`; the existing polling path remains as a fallback.
- Local validation: TypeScript passed with incremental output disabled (OneDrive locked the generated cache), ESLint passed, and all 11 critical tests passed.
- Live authenticated verification remains pending the production support migration and usable test identities.

## Scheduled and bulk pricing

- Added permission-protected, audited admin controls for rate schedules and buy/sell bulk tiers, plus price-history visibility.
- Quote, checkout, and order creation use the same deterministic resolver: newest active applicable schedule, then highest qualifying type-specific tier.
- Resolver tests cover precedence, expiry, thresholds, and fallback; the critical suite now passes 13/13 with TypeScript and ESLint clean.
- Production migration history is aligned through `202608011610`; authenticated order creation, signed BTC quote issuance, manual-review submission persistence, and test-data cleanup passed against production.
- Production owner access passed across orders, inventory, support, customers, audit, automation, content, announcements, fraud, pricing, marketing, and settings APIs. Customer profile/saved-cart/order/ticket/referral flows, cross-user order isolation, owner cancellation, and customer admin denial passed with exact-ID cleanup.

## Persistent shopping cart

- Added a real local multi-item OSRS buy/sell cart with quantity edits, removal, clear, combined estimates, and navigation into independent secure order/payment references.
- Cart estimates use the same scheduled/tier resolver as quote, checkout, and order creation; corrupted persisted entries are rejected and storage is capped at 25 items.
- TypeScript, ESLint, the 71-route production build, and all 14 critical tests pass locally; live responsive verification is recorded separately after deployment.
- Live production browser verification: a signed-in sell item persisted from `/quote` to `/cart`, editing 250M to 300M updated the checkout URL and checkout fields, and a 390×844 viewport rendered the cart at 375px document width with no horizontal overflow.

## Authoritative pricing and cancellation regression

- A live authenticated 10M buy test created `RV-673A7160` and exposed a real mismatch: the fallback checkout preview showed $1.80 while the server correctly stored $2.50.
- Replaced direct browser Supabase settings reads with a safe allowlisted server JSON endpoint backed by the same settings and optional schedule/tier tables used by order creation; production currently returns clean 503 JSON until its read grants are migrated.
- The same test exposed production owner-cancellation RLS denial. Added a narrowly scoped security-definer `cancel_own_order` migration and API fallback without granting customers arbitrary order updates.
- The test order remains open because the production migration is not applied; it is clearly marked in its notes as an automated production verification order. Authoritative public pricing and post-fix cancellation both require Supabase migration access.

## Passed

- `npm run test:critical`: 14 passed, 0 failed; BTC and USDC payload mapping, unsupported-asset rejection, valid/structured/non-JSON/empty API response handling, canonical OSRS XP thresholds, starter/maxed combat formulas, seller-payout transition/role invariants, privacy-safe browser labels, deterministic pricing resolution, and corrupted-cart recovery are executable assertions.
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
- Local login-history verification: only a Supabase-verified successful bearer session can create a login record; token/IP values are keyed fingerprints, browser information is coarse, repeated known devices are distinguished from unfamiliar devices, and new devices create customer-visible security events. Email alert delivery and live authenticated history remain provider/migration dependent.
- Local password-change history verification: a successful Supabase password update records a bearer-verified high-severity security event and login-history entry using only keyed IP/coarse browser context; failures do not emit a false success event. Live recovery-link testing remains email-provider/test-account dependent.
- Local fraud-operations verification: medium/high server-calculated order risk transactionally creates one review per order; the permission-protected queue supports prioritization, assignment, cleared/blocked outcomes, notes, durable limits, and audit writes. Live queue tests remain migration/test-identity dependent.
- Local seller-payout verification: server-authorized seller lifecycle updates reject buy orders and backward transitions, prevent fulfillment staff from authorizing payouts, synchronize completed payouts to completed orders, and write audit records; customer tracking already displays the resulting status. Live authenticated transitions remain migration/test-identity dependent.
- Local saved-draft verification: authenticated customers can persist, resume, and delete owner-isolated buy/sell checkout drafts under RLS without storing terms acceptance or creating an order; lint, TypeScript, and build verification cover the UI/data contract, while live CRUD remains migration/test-account dependent.
- Individual-order routing verification: account history, confirmation, payment, receipt, Stripe return, and order-email links use stable encoded `/orders/[reference]` URLs; a live browser test of `/orders/RV-INVALID` rendered the prefilled reference and the safe “No accessible order matched” state without order details. Positive owner/cross-account tests remain test-identity dependent.
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
