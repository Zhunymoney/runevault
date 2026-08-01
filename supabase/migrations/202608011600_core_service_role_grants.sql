-- Server-side identity checks and owner-authorized role management need explicit
-- privileges even though service_role bypasses RLS. Keep this grant minimal.
grant select, update on public.profiles to service_role;
