-- Section 8: reusable referral codes, one-time claims, and idempotent qualification rewards.
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8,20}$'), active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
create policy "referral codes own read" on public.referral_codes for select to authenticated using (owner_id=auth.uid() or public.is_admin());
grant select on public.referral_codes to authenticated; grant all on public.referral_codes to service_role;
alter table public.referrals drop constraint if exists referrals_code_key;
create index if not exists referrals_code_idx on public.referrals(code,status,created_at desc);

create or replace function public.issue_referral_code() returns text language plpgsql security definer set search_path='' as $$
declare current_id uuid:=auth.uid(); issued text;
begin
  if current_id is null then raise exception 'authentication required'; end if;
  select code into issued from public.referral_codes where owner_id=current_id;
  if issued is null then
    issued:='RV'||upper(substr(md5(current_id::text||clock_timestamp()::text),1,10));
    insert into public.referral_codes(owner_id,code) values(current_id,issued) returning code into issued;
  end if;
  return issued;
end $$;
grant execute on function public.issue_referral_code() to authenticated;

create or replace function public.claim_referral_code(p_code text) returns text language plpgsql security definer set search_path='' as $$
declare current_id uuid:=auth.uid(); owner uuid; normalized text:=upper(trim(p_code));
begin
  if current_id is null then raise exception 'authentication required'; end if;
  select owner_id into owner from public.referral_codes where code=normalized and active for update;
  if owner is null then raise exception 'referral code is invalid'; end if;
  if owner=current_id then raise exception 'self referral is not allowed'; end if;
  if exists(select 1 from public.referrals where referred_id=current_id) then raise exception 'referral already claimed'; end if;
  if exists(select 1 from public.orders where user_id=current_id and status='completed') then raise exception 'referral must be claimed before the first completed order'; end if;
  insert into public.referrals(referrer_id,referred_id,code,status) values(owner,current_id,normalized,'pending');
  return 'pending';
end $$;
grant execute on function public.claim_referral_code(text) to authenticated;

create or replace function public.reward_qualified_referral() returns trigger language plpgsql security definer set search_path='' as $$
declare referral public.referrals%rowtype; reward bigint:=100;
begin
  if new.status='completed' and old.status is distinct from new.status and new.order_type='buy' and new.total_price>=20 then
    select * into referral from public.referrals where referred_id=new.user_id and status='pending' order by created_at limit 1 for update;
    if referral.id is not null then
      insert into public.loyalty_accounts(user_id) values(referral.referrer_id),(referral.referred_id) on conflict(user_id) do nothing;
      insert into public.loyalty_transactions(user_id,order_id,points,reason) values(referral.referrer_id,new.id,reward,'referral_referrer') on conflict(order_id,reason) do nothing;
      if found then update public.loyalty_accounts set points_balance=points_balance+reward,lifetime_points=lifetime_points+reward,vip_tier=case when lifetime_points+reward>=5000 then 'vault' when lifetime_points+reward>=2000 then 'gold' when lifetime_points+reward>=500 then 'silver' else 'standard' end,updated_at=now() where user_id=referral.referrer_id; end if;
      insert into public.loyalty_transactions(user_id,order_id,points,reason) values(referral.referred_id,new.id,reward,'referral_referred') on conflict(order_id,reason) do nothing;
      if found then update public.loyalty_accounts set points_balance=points_balance+reward,lifetime_points=lifetime_points+reward,vip_tier=case when lifetime_points+reward>=5000 then 'vault' when lifetime_points+reward>=2000 then 'gold' when lifetime_points+reward>=500 then 'silver' else 'standard' end,updated_at=now() where user_id=referral.referred_id; end if;
      update public.referrals set status='rewarded',qualified_order_id=new.id,rewarded_at=now() where id=referral.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_reward_referral on public.orders;
create trigger orders_reward_referral after update of status on public.orders for each row execute function public.reward_qualified_referral();
