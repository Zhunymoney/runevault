-- Admin settings mutations are authorized by the server before using the
-- service role. Keep browser clients read-only and grant the server only the
-- table privileges required by /api/admin/settings.
grant select, update on public.settings to service_role;
revoke update on public.settings from authenticated;
drop policy if exists "settings admin update" on public.settings;
