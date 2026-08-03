# RuneVault transactional email setup

RuneVault uses Resend for application emails and keeps Supabase Auth responsible for confirmation, password-reset, magic-link, and address-change messages. Application email failures are recorded but never roll back a successful order or payment transition.

## Resend and DNS

1. Create a Resend account and API key with sending access. Store the key only as `RESEND_API_KEY` in local `.env.local`/`.env.supabase.local and Vercel Production environment variables.
2. In Resend, add and verify `runevault.shop`. Copy the exact SPF and DKIM DNS records Resend displays into the domain DNS dashboard. Add the optional DMARC record recommended by the provider. Wait until Resend reports the domain verified.
3. Set `RESEND_FROM_EMAIL` to `RuneVault <noreply@runevault.shop>` and `ADMIN_NOTIFICATION_EMAIL` to the private operations inbox.
4. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS production origin. Optionally set `LARGE_ORDER_ALERT_USD` to a positive USD amount.
5. In development, set `EMAIL_TEST_RECIPIENT` to redirect every application email to one test inbox. Without it, non-production delivery is suppressed and logged as skipped.

Add all server variables in Vercel under Project Settings → Environment Variables, select Production (and Preview only when desired), save, and redeploy. Never prefix the API key or admin recipient with `NEXT_PUBLIC_`.

## Supabase Auth SMTP

In Supabase Dashboard → Authentication → Email/SMTP, enable Custom SMTP. Use the SMTP host, port, username, and password shown by Resend, set the sender address to `noreply@runevault.shop`, and sender name to `RuneVault`. These SMTP credentials are separate from `RESEND_API_KEY`. In Authentication → Email Templates, apply RuneVault wording/branding while preserving Supabase's `{{ .ConfirmationURL }}` or other secure link variables exactly. Test confirmation and password reset from a non-production account.

## Delivery, duplicates, and retries

Migration `202608020100_transactional_email_system.sql` makes `notification_events.event_key` the durable idempotency boundary. Resend receives that same key. Duplicate webhooks and status requests therefore return without another send. Failures retain a safe error, attempt count, recipient, provider ID, and timestamps. Admins with analytics permission can inspect and retry failures from `/admin/automation`; attempts stop at three.

## Test checklist

- Confirm a verified new account and check one welcome message.
- Create one buy and one sell order; verify customer and admin summaries.
- Open generated crypto instructions, submit BTC/USDC manual verification, then verify it as an admin.
- Complete a Stripe test checkout and replay its signed webhook; the replay must not send again.
- Move orders through assigned/delivering/completed/cancelled and issue a test refund.
- Temporarily use an invalid test API key, confirm the order still succeeds and the event becomes failed, then restore it and use the admin retry.
- Remove every temporary account, order, payment, and notification record after testing.

Production delivery cannot work until the domain is verified and the three required Resend/admin variables are present. No real secrets belong in source control.
