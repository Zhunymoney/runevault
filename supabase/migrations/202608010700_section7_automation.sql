-- Section 7: deduplicated notification and automation execution ledger.
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(), event_key text not null unique,
  order_id uuid references public.orders(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade,
  event_type text not null, channel text not null check (channel in ('email','discord','internal')),
  status text not null default 'claimed' check (status in ('claimed','sent','failed','skipped')),
  attempts integer not null default 0, provider_id text, error_message text, created_at timestamptz not null default now(), sent_at timestamptz
);
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(), job_name text not null, status text not null check (status in ('running','completed','failed')),
  safe_details jsonb not null default '{}'::jsonb, error_message text, started_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.notification_events enable row level security;
alter table public.automation_runs enable row level security;
create policy "notification events admin read" on public.notification_events for select to authenticated using (public.is_admin());
create policy "automation runs admin read" on public.automation_runs for select to authenticated using (public.is_admin());
grant all on public.notification_events, public.automation_runs to service_role;
create or replace function public.claim_order_notification(p_order_id uuid, p_event_key text, p_event_type text, p_channel text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.orders o where o.id = p_order_id and (o.user_id = auth.uid() or public.is_admin())) then raise exception 'Order access denied'; end if;
  insert into public.notification_events(event_key, order_id, user_id, event_type, channel, attempts)
  select p_event_key, o.id, o.user_id, p_event_type, p_channel, 1 from public.orders o where o.id = p_order_id on conflict(event_key) do nothing;
  return found;
end; $$;
grant execute on function public.claim_order_notification(uuid,text,text,text) to authenticated;
create index if not exists notification_events_status_idx on public.notification_events(status, created_at);
create index if not exists automation_runs_job_idx on public.automation_runs(job_name, started_at desc);
