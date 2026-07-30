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
  created_at: string;
  updated_at: string;
}
