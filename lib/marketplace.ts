import type { MarketplaceSettings, Order, OrderStatus, OrderType, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase-browser";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getSettings(): Promise<MarketplaceSettings> {
  const supabase = createClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return {
    ...data,
    buy_rate: Number(data.buy_rate),
    sell_rate: Number(data.sell_rate),
    inventory_m: Number(data.inventory_m),
    minimum_order_m: Number(data.minimum_order_m),
    maximum_order_m: Number(data.maximum_order_m),
  } as MarketplaceSettings;
}

export async function createOrder(input: {
  order_type: OrderType;
  amount_m: number;
  delivery_name?: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sign in before creating an order.");

  const settings = await getSettings();
  const rate = input.order_type === "buy" ? settings.buy_rate : settings.sell_rate;

  if (settings.maintenance_mode) throw new Error("Ordering is temporarily paused.");
  if (input.amount_m < settings.minimum_order_m || input.amount_m > settings.maximum_order_m) {
    throw new Error(`Orders must be between ${settings.minimum_order_m}M and ${settings.maximum_order_m}M.`);
  }
  if (input.order_type === "buy" && input.amount_m > settings.inventory_m) {
    throw new Error("That amount is currently above available test inventory.");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: userData.user.id,
      order_type: input.order_type,
      amount_m: input.amount_m,
      price_per_m: rate,
      total_price: Number((input.amount_m * rate).toFixed(2)),
      delivery_name: input.delivery_name?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Order;
}

export async function getMyOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

export async function findOrder(reference: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("reference", reference.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeOrder(data) : null;
}

export async function getAdminOrders(): Promise<Order[]> {
  return getMyOrders();
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateSettings(input: Partial<MarketplaceSettings>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .update({
      buy_rate: input.buy_rate,
      sell_rate: input.sell_rate,
      inventory_m: input.inventory_m,
      minimum_order_m: input.minimum_order_m,
      maximum_order_m: input.maximum_order_m,
      maintenance_mode: input.maintenance_mode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data as MarketplaceSettings;
}

function normalizeOrder(data: Record<string, unknown>): Order {
  return {
    ...(data as unknown as Order),
    amount_m: Number(data.amount_m),
    price_per_m: Number(data.price_per_m),
    total_price: Number(data.total_price),
    risk_score: Number(data.risk_score ?? 0),
    risk_reasons: Array.isArray(data.risk_reasons) ? data.risk_reasons as string[] : [],
  };
}
