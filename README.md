# RuneVault All-in-One

A database-backed Next.js test-mode marketplace foundation.

## Included
- Supabase email authentication
- Customer profiles and role-based admin access
- Database orders created from the live quote calculator
- Customer account dashboard and order tracking
- Admin pricing, inventory, maintenance mode, and status controls
- Row Level Security policies
- Test checkout placeholder; no live payments

## Install on Windows
1. Extract the ZIP and open the `runevault-all-in-one` folder in VS Code.
2. Open Terminal.
3. Run `npm.cmd install`.
4. Copy `.env.example` to `.env.local` and add your Supabase Project URL and Publishable key on the same lines.
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

## Production warning
This package stays in test mode. It does not collect real payments or automate game transactions. Before production, complete legal and processor review, server-side rate limiting, webhook verification, fraud controls, monitoring, backups, and a security audit.
