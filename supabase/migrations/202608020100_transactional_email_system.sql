-- Durable, private transactional-email delivery ledger and retry metadata.
alter table public.notification_events add column if not exists recipient text;
alter table public.notification_events add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notification_events add column if not exists last_attempt_at timestamptz;
alter table public.notification_events add column if not exists updated_at timestamptz not null default now();

alter table public.notification_events drop constraint if exists notification_events_status_check;
alter table public.notification_events add constraint notification_events_status_check
  check (status in ('pending','claimed','sent','failed','skipped'));
alter table public.notification_events drop constraint if exists notification_events_attempts_check;
alter table public.notification_events add constraint notification_events_attempts_check
  check (attempts between 0 and 3);

create index if not exists notification_events_retry_idx
  on public.notification_events(status, attempts, last_attempt_at)
  where status = 'failed';

revoke all on table public.notification_events from anon, authenticated;
grant select on table public.notification_events to authenticated;
grant all on table public.notification_events to service_role;

drop policy if exists "notification events admin read" on public.notification_events;
create policy "notification events admin read" on public.notification_events
  for select to authenticated using (public.is_admin());

comment on table public.notification_events is
  'Server-written idempotency and retry ledger for private transactional notifications.';
