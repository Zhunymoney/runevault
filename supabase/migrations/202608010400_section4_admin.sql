-- Section 4: explicit admin roles, permissions, and write-audit support.
alter table public.profiles add column if not exists admin_role text check (admin_role in ('owner','manager','support','fulfillment','analytics'));
update public.profiles set admin_role = case when role = 'admin' then 'owner' when role = 'staff' then 'fulfillment' else null end where admin_role is null and role in ('admin','staff');

create table if not exists public.admin_permissions (
  admin_role text not null, permission text not null, created_at timestamptz not null default now(), primary key(admin_role, permission)
);
insert into public.admin_permissions(admin_role, permission) values
('owner','*'),('manager','orders.manage'),('manager','settings.manage'),('manager','customers.read'),
('support','orders.read'),('support','customers.read'),('support','support.manage'),
('fulfillment','orders.read'),('fulfillment','orders.fulfill'),('analytics','analytics.read'),
('manager','inventory.manage'),('manager','marketing.manage'),('manager','content.manage'),('manager','audit.read'),('manager','automation.read'),
('fulfillment','inventory.manage') on conflict do nothing;

alter table public.admin_permissions enable row level security;
create policy "admin permissions staff read" on public.admin_permissions for select to authenticated using (public.is_admin());
create policy "admin permissions owner write" on public.admin_permissions for all to authenticated
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.admin_role = 'owner'))
with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.admin_role = 'owner'));
grant select on public.admin_permissions to authenticated;
grant all on public.admin_permissions to service_role;

drop policy if exists "audit admin insert" on public.audit_logs;
create policy "audit admin insert" on public.audit_logs for insert to authenticated with check (public.is_admin() and actor_id = auth.uid());
grant insert on public.audit_logs to authenticated;
create index if not exists audit_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_actor_idx on public.audit_logs(actor_id, created_at desc);
