-- Run with a deliberately supplied email; no personal account belongs in source control.
-- psql example: \set admin_email 'owner@example.com'
update public.profiles
set role = 'admin', admin_role = 'owner'
where id = (select id from auth.users where email = :'admin_email');
