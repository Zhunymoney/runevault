# RuneVault Master Build

This document is the implementation checklist and evidence log for the complete RuneVault build. A checkbox is marked complete only after the corresponding implementation has been validated at the appropriate level. Features that require an external provider remain unchecked until the provider is configured and a real integration test succeeds.

## Baseline and recovery

- Recovery branch: `backup/pre-master-build-20260801`
- Recovery commit: `f03fd26ca48b6206fbdb407e1be151291bafd865`
- Baseline production deployment: `dpl_9fidgXw7TbpUetJnmUVBVGjPZ115`
- Baseline production URL: `https://runevault-bo9452ytq-rune-vault.vercel.app`
- Live alias: `https://runevault-beta.vercel.app`

## Section 0 — audit, backup, and plan

- [x] Inspect the tracked repository and route surface.
- [x] Identify framework, packages, database access, authentication, admin, checkout, payments, middleware/configuration, and deployment architecture.
- [x] Inspect checked-in Supabase tables, triggers, functions, and RLS policies.
- [x] Record production deployment and environment-variable requirements.
- [x] Create and push a recovery branch before major changes.
- [x] Locate unfinished, placeholder, duplicated, insecure, or incomplete features.
- [x] Create this section-by-section implementation checklist.

### Architecture baseline

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4.
- Supabase browser client provides authentication and RLS-scoped customer data access.
- Server payment endpoints use authenticated bearer sessions and server-only secrets.
- Vercel hosts the production application and supplies environment variables.
- Stripe uses server-side Checkout Session creation and a webhook route; provider credentials are not assumed configured.
- Crypto checkout uses server-provided BTC/USDC configuration, client QR generation, and an authenticated manual-verification endpoint.
- Admin, analytics, customer account, order tracking, receipts, health, legal, quote, checkout, payment, and support routes exist but are foundation-level implementations.
- No middleware file currently centralizes route authentication or request controls.
- No automated test runner, migration runner, email SDK, upload storage workflow, realtime chat, scheduled automation, distributed rate limiter, or monitoring SDK is currently installed.

### Confirmed gaps and risks

- Production schema drift: production orders use `crypto_asset` and `payment_id`; the original checked-in schema declares `payment_asset` and `transaction_id`. Migrations must support existing names and preserve rows.
- Production `service_role` lacks direct orders-table grants; customer payment writes currently succeed through the verified owner session and RLS.
- Existing in-memory rate limiting is not durable across serverless instances.
- Admin access is checked in client code and protected by existing RLS, but dedicated server-side admin route/API authorization is incomplete.
- Stripe readiness depends on external Stripe credentials, account approval, wallet-domain configuration, and webhook setup.
- Email, Discord, CAPTCHA, file storage, realtime support, monitoring, scheduled jobs, and analytics providers require implementation and/or external credentials.
- Terms and privacy pages explicitly contain owner-review placeholders; the remaining required legal pages do not exist.
- Checkout has no cart, discounts, rate locks, proof uploads, guest flow, cancellation endpoint, or idempotency ledger.
- Customer accounts lack password recovery/update, session management, saved characters, notification preferences, tickets, and detailed payment history.
- Marketplace operations lack normalized inventory ledgers, reservations, listings, price history/schedules, status history, notes, assignments, and payout records.
- Analytics are client-computed from loaded rows and lack efficient reporting queries, exports, and scheduled reports.
- Support is informational only; there are no ticket, chat, attachment, assignment, realtime, or transcript tables/workflows.
- No rewards, referrals, coupons, promotions, VIP tiers, content management, OSRS calculators, news, blog, or guide system exists.
- Build scripts include lint and production build only; critical-flow automation and deployment verification are absent.

## Section 1 — payments and checkout

- [ ] Stripe test/live configuration, intents/checkout, wallets, webhook outcomes, refunds, and idempotency.
- [x] BTC exact amount, exchange-rate lock/countdown, copy controls, and Bitcoin network warning implemented.
- [x] USDC Base exact amount, copy controls, countdown, and Base-only warning implemented.
- [x] BTC selection sends `paymentMethod: "btc"` and succeeds through the live customer flow.
- [x] USDC selection sends `paymentMethod: "usdc"` and succeeds through the live customer flow.
- [x] Non-JSON/empty API responses display cleanly.
- [ ] One-page checkout, cart, validation, discounts, terms, inventory/price verification, cancellation/retry, and mobile tests.
- [ ] Complete payment status model and secure proof upload. (Implementation and additive migration created; production migration and live proof test remain.)
- [ ] Required Section 1 live tests and deployment.

## Section 2 — customer accounts, dashboard, and email

- [ ] Registration, verification, login/logout, password recovery/update, sessions, security alerts, and deletion request. (Recovery/update and deletion-request implementation complete; live email and migration tests remain.)
- [ ] Profile, characters, contact and payment preferences, and notification preferences. (UI, data access, migration, and RLS implemented; live migration test remains.)
- [ ] Dashboard, order/payment history, invoices, timelines, reorders, saved carts, and linked support.
- [ ] Branded transactional email templates and provider integration. (All requested branded responsive HTML/plain-text template variants implemented; Resend credentials and event wiring tests remain.)
- [ ] Section 2 live tests and deployment.

## Section 3 — buy and sell workflows

- [ ] Complete OSRS buy workflow. (Contact, preferred world, availability, inventory, estimate, and checkout handling implemented; migration/live tests remain.)
- [ ] Complete OSRS sell and payout workflow. (Payout selection/details and seller lifecycle schema implemented; operational/admin live tests remain.)
- [ ] Price history, schedules, promotions, tiers, pause controls, and server-side totals. (Additive schema, history trigger, public reads, and admin pause controls implemented; scheduling/tier admin UI and live tests remain.)
- [ ] Section 3 live tests and deployment.

## Section 4 — admin system

- [ ] Server-protected roles and permissions. (Authenticated admin order/settings APIs, explicit role schema, validation, RLS, and audit writes implemented; production migration and role tests remain.)
- [ ] Complete operational queues, searches, actions, notes, refunds, inventory, customers, support, and chat.
- [ ] Complete editable settings and audit trail.
- [ ] Section 4 live tests and deployment.

## Section 5 — inventory, listings, and operations

- [ ] Transactional inventory ledger, reservations, reconciliation, thresholds, and alerts. (Ledger/reservation schema, lifecycle release/consume trigger, indexes, and RLS implemented; authoritative create RPC and live tests remain.)
- [ ] Listings, categories, stock, bulk ordering, search, and announcements. (Listing schema, safe active/public visibility, admin RLS, and indexes implemented; UI remains.)
- [ ] Assignments, queues, history, notes, and reconciliation. (Status history and internal/customer note schema with RLS implemented; operational UI remains.)
- [ ] Section 5 live tests and deployment.

## Section 6 — analytics and reporting

- [ ] Database-backed revenue, sales, estimated margin, gold, orders, customers, payment, conversion, and retention metrics. (Real-order calculation module and indexed schema implemented; production accuracy checks remain.)
- [ ] Date ranges, charts, activity, CSV, and downloadable reports without demonstration data. (Daily/weekly/monthly/yearly/custom filtering, real bar chart, empty states, payment breakdown, and CSV implemented; live admin verification remains.)
- [ ] Section 6 live tests and deployment.

## Section 7 — automation and notifications

- [ ] Deduplicated Discord notifications. (Authenticated persistent claim ledger and provider failure handling implemented for order notifications; remaining event wiring/live credentials remain.)
- [ ] Customer/admin email notifications. (Branded order notification wiring and provider failure handling implemented; credentials and remaining lifecycle events remain.)
- [ ] Scheduled reports, stale/expired orders, reconciliation, stock and failure alerts, and automation logs. (Execution ledger schema implemented; scheduled job endpoints remain.)
- [ ] Section 7 live tests and deployment.

## Section 8 — rewards and marketing

- [ ] Loyalty, referrals, coupons, promotions, tiers, limits, abuse controls, and admin management. (Normalized ledger/schema, limits, date windows, RLS, and indexes implemented; transaction RPC/admin UI/live tests remain.)
- [ ] Seasonal/flash scheduling and safe affiliate/gift-card foundations. (Scheduled promotions and affiliate attribution implemented; gift cards remain intentionally deferred pending a regulated stored-value design.)
- [ ] Section 8 live tests and deployment.

## Section 9 — order tracking and status

- [ ] Customer-isolated timelines, payment/verification/assignment/delivery/payout status, instructions, invoices, reorder, and linked support. (Timeline data/fallback, full status panels, printable receipt, reorder, retry-payment, and linked-support actions implemented; migration/live tests remain.)
- [ ] Section 9 live tests and deployment.

## Section 10 — live chat, tickets, and help center

- [ ] Realtime guest/customer chat, staff inbox, presence, assignments, history, files, moderation, notifications, and transcripts. (Conversation/message/presence/assignment/rating/moderation schema, idempotent Realtime publication, RLS, storage metadata, and indexes implemented; chat APIs/UI remain.)
- [ ] Ticket lifecycle, replies, files, assignments, notes, search, and email. (Owner-authenticated ticket list/create API, validated order linking, customer ticket UI, message history, clean JSON errors, schema, and RLS implemented; customer replies, staff queue, files, search, and email remain.)
- [ ] FAQ and complete payment, marketplace, delivery, refund, and account help center. (Payment, incorrect-network, delivery, refund, order tracking, and account guidance implemented; dedicated policy articles remain.)
- [ ] External chat provider configuration without hardcoding.
- [ ] Section 10 live tests and deployment.

## Section 11 — security, fraud, and audit logging

- [ ] Complete RLS and server authorization review. (Additive RLS, owner/admin API checks, server-only service credentials, audit records, security-event records, session records, and fraud-review schema implemented; live policy tests remain.)
- [ ] CAPTCHA/bot controls, durable rate limits, validation, CSRF posture, fraud queues, idempotency, upload controls, sessions, headers, CSP, and safe errors. (Durable atomic rate-limit RPC, fraud queue, existing payment idempotency/quote validation/upload allowlist, HSTS, production CSP without unsafe-eval, and safe API errors implemented; CAPTCHA provider wiring and live tests remain.)
- [ ] Backup/recovery and security operational documentation. (Backup, isolated restore, incident recovery, credential rotation, and abuse-control runbook added; owner must confirm Supabase backup retention.)
- [ ] Section 11 live tests and deployment.

## Section 12 — premium UI redesign

- [ ] Premium homepage and complete customer/admin/payment/order surfaces. (Existing branded responsive homepage, quote, checkout, payment, tracking, account, admin, analytics, and support surfaces preserved and extended; full visual QA remains.)
- [ ] Responsive, accessible, performant states, animations, navigation, 404, error, and loading experiences. (Branded 404, safe error recovery, accessible global skeleton loading, responsive layouts, labels, status/error/empty states, and restrained transitions implemented; cross-device live QA remains.)
- [ ] Section 12 live tests and deployment.

## Section 13 — performance and code quality

- [ ] Caching, query/index optimization, images, lazy loading, bundle/API optimization, SSR/code splitting, and duplicate/dead-code cleanup. (Indexed reporting/operational queries, server-rendered static surfaces, route-level bundles, and duplicate client JSON parser cleanup implemented; profiling and live cache validation remain.)
- [ ] Central API/errors/env validation, migrations, automated critical-flow tests, and deployment verifier. (Reusable safe client API parser, environment validation including secret-leak checks, strict typecheck script, and executable page/header/API-JSON deployment smoke test implemented; authenticated flow automation remains.)
- [ ] Zero TypeScript/build errors, broken links, dead controls, unsafe secrets, and unhandled failures. (Lint, TypeScript, and production build are enforced locally; deployment verifier covers primary links and invalid API JSON behavior; full live control audit remains.)
- [ ] Section 13 live tests and deployment.

## Section 14 — OSRS features and content

- [ ] RuneVault pricing/history and clearly separated external market references.
- [ ] XP/skill calculators, quest helpers, news, blog, guides, search, and admin content management.
- [ ] Section 14 live tests and deployment.

## Section 15 — SEO, business, and legal structure

- [ ] Complete metadata, canonicals, Open Graph, structured data, sitemap, robots, breadcrumbs, and analytics/search-console preparation.
- [ ] Editable terms, privacy, refund, cancellation, delivery, cookie, acceptable-use, fraud, prohibited-use, contact, and disclosure pages marked for legal review.
- [ ] Section 15 live tests and deployment.

## Section 16 — infrastructure, deployment, monitoring, and recovery

- [ ] Environment validation for production/preview/development.
- [ ] Vercel/Supabase migrations, health, structured logs, monitoring foundation, rollback, backup, recovery, and setup documentation.
- [ ] Provider setup documentation for Stripe, Discord, email, analytics, CAPTCHA, storage, and chat.
- [ ] Section 16 live tests and deployment.

## Section 17 — complete end-to-end testing

- [ ] Execute and record every available desktop, mobile, customer, admin, payment, inventory, analytics, notification, support, security, build, and production test.
- [ ] Clearly record tests blocked by unconfigured external providers without claiming success.

## Section 18 — completion report

- [ ] Commit and push all remaining work to `main`.
- [ ] Deploy and verify the final production build.
- [ ] Confirm the repository is clean and synchronized.
- [ ] Publish the complete implementation, migration, RLS, environment, provider, test, deployment, and remaining-action report.
