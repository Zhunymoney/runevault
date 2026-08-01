-- Section 8 completion: atomic coupon redemption and idempotent loyalty awards.
create or replace function public.apply_coupon_to_order(p_order_id uuid,p_code text)
returns table(code text,discount_amount numeric,total_price numeric) language plpgsql security definer set search_path='' as $$
declare coupon public.coupon_codes%rowtype; order_row public.orders%rowtype; used_total integer; used_customer integer; discount numeric(12,2);
begin
  select * into order_row from public.orders where id=p_order_id for update;
  if order_row.id is null then raise exception 'order not found'; end if;
  select * into coupon from public.coupon_codes where upper(code)=upper(trim(p_code)) for update;
  if coupon.id is null or not coupon.active or coupon.starts_at is not null and coupon.starts_at>now() or coupon.expires_at is not null and coupon.expires_at<=now() then raise exception 'coupon is not active'; end if;
  if order_row.total_price<coupon.minimum_spend then raise exception 'minimum spend not met'; end if;
  select count(*) into used_total from public.coupon_redemptions where coupon_id=coupon.id;
  select count(*) into used_customer from public.coupon_redemptions where coupon_id=coupon.id and user_id=order_row.user_id;
  if coupon.total_usage_limit is not null and used_total>=coupon.total_usage_limit then raise exception 'coupon usage limit reached'; end if;
  if used_customer>=coupon.per_customer_limit then raise exception 'customer usage limit reached'; end if;
  discount:=case when coupon.discount_type='percentage' then round(order_row.total_price*(coupon.discount_value/100),2) else coupon.discount_value end;
  if coupon.maximum_discount is not null then discount:=least(discount,coupon.maximum_discount); end if;
  discount:=greatest(0,least(discount,order_row.total_price));
  update public.orders set coupon_code=upper(coupon.code),discount_amount=discount,total_price=greatest(0,order_row.total_price-discount),updated_at=now() where id=p_order_id;
  insert into public.coupon_redemptions(coupon_id,user_id,order_id,discount_amount) values(coupon.id,order_row.user_id,p_order_id,discount);
  return query select upper(coupon.code),discount,greatest(0,order_row.total_price-discount);
end $$;
revoke all on function public.apply_coupon_to_order(uuid,text) from public,anon,authenticated;
grant execute on function public.apply_coupon_to_order(uuid,text) to service_role;

create or replace function public.award_completed_order_loyalty() returns trigger language plpgsql security definer set search_path='' as $$
declare earned bigint;
begin
  if new.status='completed' and old.status is distinct from new.status and new.order_type='buy' then
    earned:=greatest(1,floor(new.total_price)::bigint);
    insert into public.loyalty_accounts(user_id) values(new.user_id) on conflict(user_id) do nothing;
    insert into public.loyalty_transactions(user_id,order_id,points,reason) values(new.user_id,new.id,earned,'completed_order') on conflict(order_id,reason) do nothing;
    if found then update public.loyalty_accounts set points_balance=points_balance+earned,lifetime_points=lifetime_points+earned,
      vip_tier=case when lifetime_points+earned>=5000 then 'vault' when lifetime_points+earned>=2000 then 'gold' when lifetime_points+earned>=500 then 'silver' else 'standard' end,updated_at=now() where user_id=new.user_id; end if;
  end if; return new;
end $$;
drop trigger if exists orders_award_loyalty on public.orders;
create trigger orders_award_loyalty after update of status on public.orders for each row execute function public.award_completed_order_loyalty();
