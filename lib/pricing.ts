export type OrderType = "buy" | "sell";

export type ScheduledPrice = {
  id: string;
  buy_rate: number | string | null;
  sell_rate: number | string | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
};

export type BulkPriceTier = {
  id: string;
  order_type: OrderType;
  minimum_amount_m: number | string;
  rate_adjustment: number | string;
  active: boolean;
};

export type EffectivePrice = {
  rate: number;
  scheduleId: string | null;
  tierId: string | null;
  adjustment: number;
};

export function resolveEffectivePrice(input: {
  orderType: OrderType;
  amountM: number;
  baseRate: number;
  now?: Date;
  schedules?: ScheduledPrice[];
  tiers?: BulkPriceTier[];
}): EffectivePrice {
  const now = (input.now ?? new Date()).getTime();
  const rateKey = input.orderType === "buy" ? "buy_rate" : "sell_rate";
  const schedule = (input.schedules ?? [])
    .filter(
      (item) =>
        item.active &&
        new Date(item.starts_at).getTime() <= now &&
        (!item.ends_at || new Date(item.ends_at).getTime() > now) &&
        Number(item[rateKey]) > 0,
    )
    .sort(
      (left, right) =>
        new Date(right.starts_at).getTime() -
        new Date(left.starts_at).getTime(),
    )[0];
  const tier = (input.tiers ?? [])
    .filter(
      (item) =>
        item.active &&
        item.order_type === input.orderType &&
        Number(item.minimum_amount_m) <= input.amountM,
    )
    .sort(
      (left, right) =>
        Number(right.minimum_amount_m) - Number(left.minimum_amount_m),
    )[0];
  const scheduledRate = schedule ? Number(schedule[rateKey]) : input.baseRate;
  const adjustment = tier ? Number(tier.rate_adjustment) : 0;
  const rate = Number((scheduledRate + adjustment).toFixed(4));
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Marketplace pricing is unavailable.");
  return {
    rate,
    scheduleId: schedule?.id ?? null,
    tierId: tier?.id ?? null,
    adjustment,
  };
}
