export type Role = 'customer' | 'provider' | 'admin';
export type AppMode = 'customer' | 'provider' | 'admin';
export type Lang = 'ar' | 'en';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string;
  status: 'new' | 'active' | 'vip' | 'pending' | 'pending_approval' | 'approved' | 'suspended' | 'blocked';
  provider_category_id: string | null;
  available: boolean;
  rating_avg: number;
  rating_count: number;
  average_rating: number;
  total_reviews: number;
  wallet_balance: number;
  negative_credit_limit: number;
  referral_code: string | null;
  customer_wallet: number;
  custom_commission_rate: number | null;
  subscription_plan: 'none' | 'monthly' | 'annual';
  is_subscription_active: boolean;
  connected_stripe_account_id: string | null;
  bank_iban: string | null;
  payout_schedule: 'daily' | 'weekly';
  sound_alerts_enabled: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
};

export type PricingType =
  | 'quick' | 'deep_home' | 'deep_corp' | 'periodic_corp' | 'factory'
  | 'periodic' | 'complex' | 'car_wash' | 'oil_change' | 'helper' | 'waitlist' | 'fixed';

export type Service = {
  id: string;
  category_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  pricing_type: PricingType;
  base_price: number;
  inspection_fee: number | null;
  price_config: Record<string, any>;
  image_url: string | null;
  fallback_icon: string;
  is_active: boolean;
  sort_order: number;
};

export type OrderStatus =
  | 'pending'
  | 'pending_provider_approval'
  | 'accepted'
  | 'assigned'
  | 'on_the_way'
  | 'in_transit'
  | 'in_progress'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'unassigned_requires_admin';

export type Order = {
  id: string;
  customer_id: string;
  provider_id: string | null;
  current_provider_id: string | null;
  rejected_by: string[];
  service_id: string | null;
  category_id: string | null;
  pricing_type: PricingType;
  summary_ar: string;
  details: Record<string, any>;
  price: number;
  inspection_fee_applied: boolean;
  status: OrderStatus;
  payment_method: 'card' | 'cash';
  platform_fee: number;
  provider_earnings: number;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  customer_rating: number | null;
  dispute_status: 'none' | 'opened' | 'resolved';
  dispute_reason: string | null;
  surge_multiplier: number;
  discount_amount: number;
  payment_gateway_status: 'held' | 'split_processed' | 'refunded';
  created_at: string;
  updated_at: string;
};

export type PayoutLog = {
  id: string;
  order_id: string;
  provider_id: string;
  amount_sent_to_provider: number;
  platform_revenue_kept: number;
  provider_iban: string | null;
  stripe_transfer_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
};

export type NotificationType = 'order' | 'system' | 'dispute';

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read_status: boolean;
  related_order_id: string | null;
  created_at: string;
};

export type OrderEvent = {
  id: string;
  order_id: string;
  status: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type Settings = {
  id: number;
  operation_mode: 'automated' | 'manual';
  complaint_phone: string;
  support_email: string;
  maintenance_inspection_fee: number;
  updated_at: string;
};

export type HelperRequest = {
  id: string;
  customer_id: string;
  age_min: number | null;
  age_max: number | null;
  gender: string | null;
  nationality: string | null;
  experience: string | null;
  skills: string[];
  status: 'new' | 'processing' | 'fulfilled';
  printable_payload: Record<string, any>;
  created_at: string;
};

export type Rating = {
  id: string;
  order_id: string;
  customer_id: string;
  provider_id: string;
  stars: number;
  comment: string;
  hidden_by_admin: boolean;
  created_at: string;
};

export type TicketStatus = 'open' | 'waiting_human' | 'in_chat' | 'resolved';
export type TicketPriority = 'normal' | 'urgent';
export type MessageSender = 'customer' | 'ai' | 'admin';

export type SupportTicket = {
  id: string;
  customer_id: string;
  subject: string;
  ai_summary: string;
  status: TicketStatus;
  ai_active: boolean;
  priority: TicketPriority;
  related_order_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender: MessageSender;
  body: string;
  intent_detected: string | null;
  created_at: string;
};

export type Banner = {
  id: string;
  title_ar: string;
  title_en: string;
  image_url: string;
  link_target: string | null;
  sort_order: number;
  is_active: boolean;
  placement: string;
  created_at: string;
};

export type PaymentStatus = 'none' | 'authorized' | 'captured' | 'refunded' | 'failed';

export type Payment = {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  created_at: string;
};
