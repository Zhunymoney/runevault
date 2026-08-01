export type UserRole = "customer" | "staff" | "admin";
export type OrderType = "buy" | "sell";
export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "assigned"
  | "delivering"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  runescape_name?: string | null;
  contact_email?: string | null;
  preferred_payment_method?: "card" | "btc" | "usdc" | null;
  notification_preferences?: { email?: boolean; order_updates?: boolean; security?: boolean };
  deletion_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedCharacter {
  id: string;
  user_id: string;
  name: string;
  preferred_world: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSettings {
  id: number;
  buy_rate: number;
  sell_rate: number;
  inventory_m: number;
  minimum_order_m: number;
  maximum_order_m: number;
  maintenance_mode: boolean;
  updated_at: string;
}

export interface Order {
  id: string;
  reference: string;
  user_id: string;
  order_type: OrderType;
  game: string;
  server: string;
  amount_m: number;
  price_per_m: number;
  total_price: number;
  status: OrderStatus;
  delivery_name: string | null;
  notes: string | null;
  assigned_to: string | null;
  payment_provider: "stripe" | "crypto_manual" | null;
  payment_asset: "BTC" | "USDC" | null;
  payment_status: string | null;
  transaction_id: string | null;
  paid_at: string | null;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | null;
  risk_reasons: string[];
  created_at: string;
  updated_at: string;
}
