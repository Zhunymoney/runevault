-- Replace the email below with the email you used to sign up, then Run.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'Huntstattooing@outlook.com');
