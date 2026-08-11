// Types for the booking + escrow payment flow (Phase 3).
// Mirrors api/openapi.yaml — regenerate from the contract when it changes.

export type OrderStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

export type OrderItem = {
  item_type: "COHORT" | "PRIVATE_PACKAGE" | "PRODUCT" | "FEE";
  reference_id: string;
  description?: string;
  quantity: number;
  total_price: number;
};

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  items: OrderItem[];
};

export type BookingResponse = {
  order: Order;
  enrollment_id?: string;
  package_id?: string;
  replayed?: boolean;
  payment_required: boolean;
};

export type PaymentProvider = "PAYSTACK" | "FLUTTERWAVE";

export type InitiatePaymentResponse = {
  payment_id: string;
  order_number: string;
  provider: PaymentProvider;
  provider_reference: string;
  amount: number;
  currency: string;
  payment_link: string;
  status: string;
};

export type WebhookResult = {
  processed: boolean;
  duplicate?: boolean;
  ignored?: boolean;
  reason?: string;
  payment_id?: string;
};
