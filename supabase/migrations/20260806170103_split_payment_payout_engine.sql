/*
# Split Payment & Payout Engine — Marketplace Architecture

## Summary
Adds Stripe Connect-style payout fields to providers, a payment gateway
status to orders, and a payout_logs table to track every automated split.

## Changes to `profiles` table
- `connected_stripe_account_id` (text, nullable): Future Stripe Connect
  account ID for the provider. NULL until Stripe onboarding is completed.
- `bank_iban` (text, nullable): Provider's bank IBAN for payout transfers.
- `payout_schedule` (text, NOT NULL, default 'weekly'): How often the
  provider receives payouts — 'daily' or 'weekly'.

## Changes to `orders` table
- `payment_gateway_status` (text, NOT NULL, default 'held'): Tracks the
  split payment lifecycle — 'held' (funds captured but not split),
  'split_processed' (earnings sent to provider, platform fee retained),
  'refunded' (funds returned to customer).

## New table: `payout_logs`
Audit trail of every automated marketplace split. Each row records:
- order_id, provider_id, amount_sent_to_provider, platform_revenue_kept
- provider_iban, stripe_transfer_id (simulated), status, created_at

## Security
- RLS enabled on payout_logs: admins can read all, providers can read
  their own rows. Only the server-side split engine (SECURITY DEFINER)
  writes to this table in production; for MVP the admin/frontend writes
  via Supabase client with appropriate policies.
- All new columns are additive with safe defaults — no data loss.
*/

-- ===================== 1. Add payout fields to profiles =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'connected_stripe_account_id') THEN
    ALTER TABLE public.profiles ADD COLUMN connected_stripe_account_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bank_iban') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_iban text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'payout_schedule') THEN
    ALTER TABLE public.profiles ADD COLUMN payout_schedule text NOT NULL DEFAULT 'weekly' CHECK (payout_schedule IN ('daily', 'weekly'));
  END IF;
END $$;

-- ===================== 2. Add payment_gateway_status to orders =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_gateway_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_gateway_status text NOT NULL DEFAULT 'held' CHECK (payment_gateway_status IN ('held', 'split_processed', 'refunded'));
  END IF;
END $$;

-- ===================== 3. Create payout_logs table =====================
CREATE TABLE IF NOT EXISTS public.payout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_sent_to_provider numeric NOT NULL DEFAULT 0,
  platform_revenue_kept numeric NOT NULL DEFAULT 0,
  provider_iban text,
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all payout logs
DROP POLICY IF EXISTS "admin_read_all_payout_logs" ON public.payout_logs;
CREATE POLICY "admin_read_all_payout_logs" ON public.payout_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Providers can read their own payout logs
DROP POLICY IF EXISTS "provider_read_own_payout_logs" ON public.payout_logs;
CREATE POLICY "provider_read_own_payout_logs" ON public.payout_logs FOR SELECT
  TO authenticated USING (provider_id = auth.uid());

-- Authenticated users can insert payout logs (split engine writes)
DROP POLICY IF EXISTS "insert_payout_logs" ON public.payout_logs;
CREATE POLICY "insert_payout_logs" ON public.payout_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payout_logs_provider_id ON public.payout_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_order_id ON public.payout_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_created_at ON public.payout_logs(created_at DESC);
