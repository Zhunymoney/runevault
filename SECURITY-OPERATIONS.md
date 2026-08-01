# RuneVault security operations

## Secrets and access

- Keep the Supabase service-role key, Stripe secret/webhook keys, quote secret, cron secret, email key, Discord webhook, and CAPTCHA secret in Vercel encrypted environment variables. Never prefix server secrets with `NEXT_PUBLIC_`.
- Receiving wallet addresses are intentionally public on authenticated payment pages. Private keys and seed phrases must never enter this repository, Supabase, Vercel, logs, tickets, or support chat.
- Grant staff the least-privileged RuneVault role. Remove access immediately when responsibilities change and review `audit_logs`, `security_events`, and open `fraud_reviews` regularly.

## Database backups

1. Confirm Supabase automated backups and point-in-time recovery are enabled for the production plan and record the retention window with the owner.
2. Before a destructive migration, create a dated logical backup with the Supabase CLI or `pg_dump` over a protected connection. Encrypt it, store it outside the deployment account, and never commit it.
3. Quarterly, restore the latest backup into an isolated project, apply migrations, run integrity counts for profiles/orders/payments/inventory, and record the result.

## Recovery

1. Freeze writes by enabling maintenance mode; preserve logs and note the incident time.
2. Identify the last known-good Vercel deployment and database recovery point. Do not roll back the app across an incompatible schema migration.
3. Restore into an isolated Supabase project first, validate order/payment/inventory totals, RLS, admin access, and critical flows, then promote through documented DNS/environment changes.
4. Rotate potentially exposed credentials, revoke sessions, redeploy, monitor errors, and retain an audit-safe incident summary without secrets or unnecessary personal data.

## Abuse controls

- Mutation APIs validate authenticated ownership or staff roles, constrain inputs, use same-site browser requests, and return safe errors. Payment submission also verifies signed expiring quotes and duplicate transaction IDs.
- Current server-instance throttles provide immediate protection. Apply `202608011100_section11_security.sql` and wire high-abuse endpoints to `claim_rate_limit` for durable multi-instance enforcement.
- Configure a CAPTCHA provider only with both a public site key and server secret; never treat a client token as verified until the provider's server endpoint confirms it.
