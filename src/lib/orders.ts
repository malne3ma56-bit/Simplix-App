import { supabase } from '@/lib/supabase';
import type { Order, OrderEvent, OrderStatus, PayoutLog } from '@/types';

export async function createOrder(input: {
  serviceId: string | null;
  categoryId: string | null;
  pricingType: string;
  summaryAr: string;
  details: Record<string, any>;
  price: number;
  inspectionFeeApplied: boolean;
  paymentMethod: 'card' | 'cash';
  addressText?: string;
  latitude?: number | null;
  longitude?: number | null;
  surgeMultiplier?: number;
  discountAmount?: number;
  promoCode?: string;
}): Promise<{ order: Order | null; error: string | null }> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return { order: null, error: 'not authenticated' };

  const surgeMultiplier = input.surgeMultiplier ?? 1.0;
  const discountAmount = input.discountAmount ?? 0;

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: userId,
      service_id: input.serviceId,
      category_id: input.categoryId,
      pricing_type: input.pricingType,
      summary_ar: input.summaryAr,
      details: { ...input.details, promo_code: input.promoCode ?? null },
      price: input.price,
      inspection_fee_applied: input.inspectionFeeApplied,
      payment_method: input.paymentMethod,
      status: 'pending',
      address_text: input.addressText ?? '',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      surge_multiplier: surgeMultiplier,
      discount_amount: discountAmount,
    })
    .select('*')
    .single();

  if (error) return { order: null, error: error.message };

  // insert initial event
  await supabase.from('order_events').insert({
    order_id: data.id,
    status: 'pending',
    note: 'تم إنشاء الطلب',
    created_by: userId,
  });

  return { order: data as Order, error: null };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note: string,
  providerId?: string
): Promise<{ error: string | null }> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;

  const patch: Record<string, any> = { status };
  if (providerId && status === 'assigned') patch.provider_id = providerId;

  const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
  if (error) return { error: error.message };

  await supabase.from('order_events').insert({
    order_id: orderId,
    status,
    note,
    created_by: userId ?? null,
  });

  return { error: null };
}

export async function fetchOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const { data } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  return (data ?? []) as OrderEvent[];
}

/**
 * Local simulation of the database `process_financial_completion` trigger.
 * Mirrors the SQL logic: dynamic commission rate (custom rate, subscription
 * bypass, or default 15%), wallet debit (cash) or credit (card), and
 * auto-block when wallet drops below the negative credit limit.
 *
 * Use this in the frontend to preview the financial outcome of completing
 * an order without waiting for the round-trip to the database trigger.
 */
export function simulateFinancialCompletion(
  order: { price: number; payment_method: 'card' | 'cash'; provider_id: string | null },
  provider: {
    id: string;
    wallet_balance: number;
    negative_credit_limit: number;
    status: string;
    custom_commission_rate?: number | null;
    subscription_plan?: 'none' | 'monthly' | 'annual';
    is_subscription_active?: boolean;
  }
): {
  platformFee: number;
  providerEarnings: number;
  commissionRate: number;
  newWalletBalance: number;
  blocked: boolean;
} {
  // Determine active commission rate (priority: subscription bypass > custom rate > default 15%)
  let commissionRate = 0.15;
  if (
    (provider.subscription_plan === 'monthly' || provider.subscription_plan === 'annual') &&
    provider.is_subscription_active === true
  ) {
    commissionRate = 0;
  } else if (provider.custom_commission_rate !== null && provider.custom_commission_rate !== undefined) {
    commissionRate = provider.custom_commission_rate;
  }

  const platformFee = Math.round(order.price * commissionRate * 100) / 100;
  const providerEarnings = Math.round(order.price * (1 - commissionRate) * 100) / 100;

  let newWalletBalance = provider.wallet_balance;
  if (order.payment_method === 'card') {
    newWalletBalance = Math.round((newWalletBalance + providerEarnings) * 100) / 100;
  } else {
    newWalletBalance = Math.round((newWalletBalance - platformFee) * 100) / 100;
  }

  const blocked = newWalletBalance < provider.negative_credit_limit;

  return { platformFee, providerEarnings, commissionRate, newWalletBalance, blocked };
}

export async function fetchCustomerOrders(): Promise<Order[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', userRes.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as Order[];
}

// ===================== Quality Control & Dispute Resolution =====================

/**
 * Submit a customer rating for a completed order.
 * Updates the order's customer_rating, then recalculates the provider's
 * average_rating and total_reviews. Auto-blocks the provider if their
 * average drops below 3.5 with at least 3 reviews.
 */
export async function submitOrderRating(
  orderId: string,
  rating: number,
): Promise<{ error: string | null }> {
  if (rating < 1 || rating > 5) return { error: 'rating must be between 1 and 5' };

  // 1. Fetch the order to find the provider
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('provider_id, customer_rating')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return { error: orderErr?.message ?? 'order not found' };
  if (!order.provider_id) return { error: 'no provider assigned to this order' };

  // Prevent double-rating
  if (order.customer_rating !== null) return { error: 'order already rated' };

  // 2. Update the order's rating
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ customer_rating: rating })
    .eq('id', orderId);
  if (updateErr) return { error: updateErr.message };

  // 3. Fetch the provider profile
  const { data: provider, error: provErr } = await supabase
    .from('profiles')
    .select('id, average_rating, total_reviews, rating_avg, rating_count, wallet_balance, negative_credit_limit, status')
    .eq('id', order.provider_id)
    .maybeSingle();

  if (provErr || !provider) return { error: null }; // order rating saved, but can't update provider

  // 4. Recalculate average rating mathematically
  const prevTotal = provider.total_reviews ?? provider.rating_count ?? 0;
  const prevAvg = provider.average_rating ?? provider.rating_avg ?? 5.0;
  const newTotal = prevTotal + 1;
  const newAvg = Math.round(((prevAvg * prevTotal) + rating) / newTotal * 100) / 100;

  // 5. Auto-block trigger: rating < 3.5 AND at least 3 reviews
  const shouldBlock = newAvg < 3.5 && newTotal >= 3;

  const providerPatch: Record<string, any> = {
    average_rating: newAvg,
    total_reviews: newTotal,
    rating_avg: newAvg,
    rating_count: newTotal,
  };
  if (shouldBlock && provider.status !== 'blocked') {
    providerPatch.status = 'blocked';
    providerPatch.available = false;
  }

  const { error: provUpdateErr } = await supabase
    .from('profiles')
    .update(providerPatch)
    .eq('id', provider.id);
  if (provUpdateErr) return { error: provUpdateErr.message };

  return { error: null };
}

/**
 * Open a dispute on an order. Sets dispute_status to 'opened' and logs the reason.
 * Financial Freeze: deducts the provider_earnings for this order from the provider's
 * wallet_balance until the dispute is resolved by admin.
 */
export async function openDispute(
  orderId: string,
  reason: string,
): Promise<{ error: string | null }> {
  if (!reason.trim()) return { error: 'reason is required' };

  // 1. Fetch the order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, provider_id, provider_earnings, dispute_status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return { error: orderErr?.message ?? 'order not found' };
  if (order.dispute_status === 'opened') return { error: 'dispute already opened' };

  // 2. Update the order's dispute fields
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ dispute_status: 'opened', dispute_reason: reason.trim() })
    .eq('id', orderId);
  if (updateErr) return { error: updateErr.message };

  // 3. Financial freeze: deduct provider_earnings from wallet_balance
  if (order.provider_id && order.provider_earnings > 0) {
    const { data: provider, error: provErr } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', order.provider_id)
      .maybeSingle();

    if (!provErr && provider) {
      const newBalance = Math.round((provider.wallet_balance - order.provider_earnings) * 100) / 100;
      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', provider.id);
    }
  }

  // 4. Log an order event
  const { data: userRes } = await supabase.auth.getUser();
  await supabase.from('order_events').insert({
    order_id: orderId,
    status: 'dispute_opened' as any,
    note: `Dispute opened: ${reason.trim()}`,
    created_by: userRes.user?.id ?? null,
  });

  // 5. Notify all admins about the dispute
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');
  if (admins && admins.length > 0) {
    await supabase.from('notifications').insert(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        title: 'Dispute Opened',
        message: `A dispute has been opened on order #${orderId.slice(0, 8)}`,
        type: 'dispute',
        related_order_id: orderId,
      })),
    );
  }

  return { error: null };
}

/**
 * Resolve a dispute (admin action). Sets dispute_status to 'resolved' and
 * optionally restores the frozen earnings to the provider's wallet.
 */
export async function resolveDispute(
  orderId: string,
  restoreEarnings: boolean,
): Promise<{ error: string | null }> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, provider_id, provider_earnings')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) return { error: orderErr?.message ?? 'order not found' };

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ dispute_status: 'resolved' })
    .eq('id', orderId);
  if (updateErr) return { error: updateErr.message };

  if (restoreEarnings && order.provider_id && order.provider_earnings > 0) {
    const { data: provider } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', order.provider_id)
      .maybeSingle();

    if (provider) {
      const restored = Math.round((provider.wallet_balance + order.provider_earnings) * 100) / 100;
      await supabase
        .from('profiles')
        .update({ wallet_balance: restored })
        .eq('id', provider.id);
    }
  }

  return { error: null };
}

// ===================== Split Payment & Payout Engine =====================

/**
 * Simulates a Stripe Connect transfer call. In production this would hit
 * the Stripe Transfers API to move funds to the provider's connected account.
 * Returns a mock transfer ID and logs the transaction details.
 */
async function mockStripeTransfer(
  amount: number,
  destinationIban: string | null,
): Promise<{ transferId: string; success: boolean }> {
  const transferId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await new Promise((r) => setTimeout(r, 600));

  console.log(`[StripeTransfer] Transferred ${amount} to IBAN ${destinationIban ?? 'N/A'} — Transfer ID: ${transferId}`);

  return { transferId, success: true };
}

/**
 * Execute the marketplace split for a completed card-paid order.
 *
 * Reads the final platform_fee and provider_earnings (already calculated
 * by the dynamic commission engine), simulates a payout transfer to the
 * provider's IBAN, records a payout_log entry, and updates the order's
 * payment_gateway_status to 'split_processed'.
 *
 * Only runs for card payments (cash orders settle via the provider wallet
 * debit in the SQL trigger). Skips orders already split_processed.
 */
export async function executeMarketplaceSplit(
  orderId: string,
): Promise<{ success: boolean; error: string | null; payoutLog: PayoutLog | null }> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, price, platform_fee, provider_earnings, payment_method, payment_gateway_status, provider_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { success: false, error: orderErr?.message ?? 'Order not found', payoutLog: null };
  }

  if (order.payment_method !== 'card') {
    return { success: false, error: 'Cash orders do not require gateway split', payoutLog: null };
  }

  if (order.payment_gateway_status === 'split_processed') {
    return { success: false, error: 'Split already processed for this order', payoutLog: null };
  }

  if (!order.provider_id) {
    return { success: false, error: 'No provider assigned to this order', payoutLog: null };
  }

  const { data: provider, error: providerErr } = await supabase
    .from('profiles')
    .select('id, bank_iban, connected_stripe_account_id, payout_schedule')
    .eq('id', order.provider_id)
    .maybeSingle();

  if (providerErr || !provider) {
    return { success: false, error: 'Provider not found', payoutLog: null };
  }

  const providerEarnings = Number(order.provider_earnings) || 0;
  const platformFee = Number(order.platform_fee) || 0;

  const { transferId, success: transferSuccess } = await mockStripeTransfer(
    providerEarnings,
    provider.bank_iban,
  );

  if (!transferSuccess) {
    const { data: failedLog } = await supabase
      .from('payout_logs')
      .insert({
        order_id: orderId,
        provider_id: order.provider_id,
        amount_sent_to_provider: providerEarnings,
        platform_revenue_kept: platformFee,
        provider_iban: provider.bank_iban,
        stripe_transfer_id: null,
        status: 'failed',
      })
      .select('*')
      .single();

    return { success: false, error: 'Transfer failed', payoutLog: (failedLog as PayoutLog) ?? null };
  }

  console.log(`[MarketplaceSplit] Retained ${platformFee} in Platform Main Account (Order #${orderId.slice(0, 8)})`);

  const { data: payoutLogRow, error: logErr } = await supabase
    .from('payout_logs')
    .insert({
      order_id: orderId,
      provider_id: order.provider_id,
      amount_sent_to_provider: providerEarnings,
      platform_revenue_kept: platformFee,
      provider_iban: provider.bank_iban,
      stripe_transfer_id: transferId,
      status: 'completed',
    })
    .select('*')
    .single();

  if (logErr) {
    return { success: false, error: logErr.message, payoutLog: null };
  }

  await supabase
    .from('orders')
    .update({ payment_gateway_status: 'split_processed' })
    .eq('id', orderId);

  return { success: true, error: null, payoutLog: payoutLogRow as PayoutLog };
}

/**
 * Fetch payout logs for the admin dashboard (all logs, most recent first).
 */
export async function fetchPayoutLogs(limit: number = 50): Promise<PayoutLog[]> {
  const { data, error } = await supabase
    .from('payout_logs')
    .select('*, order:orders(id, summary_ar), provider:profiles(id, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as PayoutLog[];
}

/**
 * Fetch payout logs for a specific provider.
 */
export async function fetchProviderPayouts(providerId: string): Promise<PayoutLog[]> {
  const { data, error } = await supabase
    .from('payout_logs')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as PayoutLog[];
}
