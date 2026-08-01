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

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: string | null;
  status: string;
  customer_message: string | null;
  created_at: string;
}

export interface MarketplaceSettings {
  id: number;
  buy_rate: number;
  sell_rate: number;
  inventory_m: number;
  minimum_order_m: number;
  maximum_order_m: number;
  maintenance_mode: boolean;
  buy_enabled?: boolean;
  sell_enabled?: boolean;
  estimated_delivery_minutes?: number;
  pause_message?: string | null;
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
  payment_id?: string | null;
  crypto_asset?: "BTC" | "USDC" | null;
  paid_at: string | null;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | null;
  risk_reasons: string[];
  preferred_world?: number | null;
  contact_details?: string | null;
  payout_method?: string | null;
  payout_details?: string | null;
  seller_status?: "awaiting_meetup" | "gold_received" | "verification" | "payout_pending" | "payout_completed" | "rejected" | null;
  seller_risk_notes?: string | null;
  created_at: string;
  updated_at: string;
}
