-- Section 11: durable defensive controls, session visibility, fraud review, and security events.
alter table public.orders add column if not exists risk_score integer not null default 0;
alter table public.orders add column if not exists risk_level text;
alter table public.orders add column if not exists risk_reasons text[] not null default '{}';
create table if not exists public.request_rate_limits (
  key_hash text primary key, request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(), blocked_until timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete set null,
  event_type text not null, severity text not null default 'info' check (severity in ('info','warning','high','critical')),
  ip_hash text, user_agent_family text, safe_details jsonb not null default '{}'::jsonb, reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  session_hash text not null unique, ip_hash text, user_agent_family text, last_seen_at timestamptz not null default now(),
  revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.fraud_reviews (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'open' check (status in ('open','reviewing','cleared','blocked')),
  risk_score integer not null check (risk_score between 0 and 100), reasons text[] not null default '{}',
  assigned_to uuid references public.profiles(id) on delete set null, resolution_note text,
  resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.request_rate_limits enable row level security; alter table public.security_events enable row level security;
alter table public.user_sessions enable row level security; alter table public.fraud_reviews enable row level security;
create policy "security events own read" on public.security_events for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "sessions own read" on public.user_sessions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "fraud reviews admin read" on public.fraud_reviews for select to authenticated using (public.is_admin());
create policy "fraud reviews admin update" on public.fraud_reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.security_events, public.user_sessions, public.fraud_reviews to authenticated; grant update on public.fraud_reviews to authenticated;
grant all on public.request_rate_limits, public.security_events, public.user_sessions, public.fraud_reviews to service_role;
create index if not exists security_events_user_idx on public.security_events(user_id, created_at desc);
create index if not exists security_events_review_idx on public.security_events(severity, reviewed_at, created_at desc);
create index if not exists user_sessions_owner_idx on public.user_sessions(user_id, last_seen_at desc);
create index if not exists fraud_reviews_queue_idx on public.fraud_reviews(status, risk_score desc, created_at);
create unique index if not exists fraud_reviews_order_idx on public.fraud_reviews(order_id);

create or replace function public.queue_order_fraud_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.risk_level in ('medium','high') then
    insert into public.fraud_reviews(order_id,risk_score,reasons)
    values(new.id,new.risk_score,coalesce(new.risk_reasons,'{}'::text[]))
    on conflict(order_id) do update set risk_score=excluded.risk_score,reasons=excluded.reasons,updated_at=now();
  end if;
  return new;
end $$;
drop trigger if exists orders_queue_fraud_review on public.orders;
create trigger orders_queue_fraud_review after insert or update of risk_score,risk_level,risk_reasons on public.orders for each row execute function public.queue_order_fraud_review();

create or replace function public.claim_rate_limit(p_key_hash text, p_limit integer, p_window_seconds integer)
returns table(allowed boolean, remaining integer, retry_after integer)
language plpgsql security definer set search_path = '' as $$
declare current_row public.request_rate_limits%rowtype; now_at timestamptz := now();
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_key_hash) < 32 then raise exception 'invalid rate limit parameters'; end if;
  insert into public.request_rate_limits(key_hash,request_count,window_started_at,updated_at) values(p_key_hash,0,now_at,now_at) on conflict(key_hash) do nothing;
  select * into current_row from public.request_rate_limits where key_hash=p_key_hash for update;
  if current_row.window_started_at + make_interval(secs => p_window_seconds) <= now_at then current_row.request_count:=0; current_row.window_started_at:=now_at; current_row.blocked_until:=null; end if;
  if current_row.blocked_until is not null and current_row.blocked_until > now_at then return query select false,0,greatest(1,ceil(extract(epoch from current_row.blocked_until-now_at))::integer); return; end if;
  current_row.request_count:=current_row.request_count+1;
  if current_row.request_count > p_limit then current_row.blocked_until:=current_row.window_started_at+make_interval(secs => p_window_seconds); end if;
  update public.request_rate_limits set request_count=current_row.request_count,window_started_at=current_row.window_started_at,blocked_until=current_row.blocked_until,updated_at=now_at where key_hash=p_key_hash;
  return query select current_row.request_count<=p_limit,greatest(0,p_limit-current_row.request_count),case when current_row.request_count>p_limit then greatest(1,ceil(extract(epoch from current_row.blocked_until-now_at))::integer) else 0 end;
end $$;
revoke all on function public.claim_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.claim_rate_limit(text,integer,integer) to service_role;
