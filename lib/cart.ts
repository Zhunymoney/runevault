import type { OrderType } from "@/lib/types";

export type CartItem = {
  id: string;
  orderType: OrderType;
  amountM: number;
  deliveryName: string;
  createdAt: string;
};
export const cartStorageKey = "runevault-cart-v1";

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>,
        amountM = Math.trunc(Number(item.amountM));
      if (
        typeof item.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(item.id) ||
        !["buy", "sell"].includes(String(item.orderType)) ||
        !Number.isFinite(amountM) ||
        amountM < 1 ||
        amountM > 1_000_000_000
      )
        return [];
      return [
        {
          id: item.id,
          orderType: item.orderType as OrderType,
          amountM,
          deliveryName:
            typeof item.deliveryName === "string"
              ? item.deliveryName.trim().slice(0, 12)
              : "",
          createdAt:
            typeof item.createdAt === "string"
              ? item.createdAt
              : new Date(0).toISOString(),
        },
      ];
    })
    .slice(0, 25);
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeCart(
      JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]"),
    );
  } catch {
    return [];
  }
}
export function writeCart(items: CartItem[]) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(
      cartStorageKey,
      JSON.stringify(normalizeCart(items)),
    );
}
export function addCartItem(input: {
  orderType: OrderType;
  amountM: number;
  deliveryName?: string;
}) {
  const item: CartItem = {
    id: crypto.randomUUID(),
    orderType: input.orderType,
    amountM: Math.trunc(input.amountM),
    deliveryName: input.deliveryName?.trim().slice(0, 12) ?? "",
    createdAt: new Date().toISOString(),
  };
  const items = normalizeCart([...readCart(), item]);
  writeCart(items);
  return items;
}
