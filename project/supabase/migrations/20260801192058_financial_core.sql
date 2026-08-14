/*
# Financial Core: Provider Wallets, Order Payment Splits, and Auto-Block

## Summary
Adds financial columns to `profiles` (provider wallet) and `orders` (payment split),
and creates a trigger that automatically processes financial settlements when an
order is marked 'completed'.

## Changes to `profiles` table
- `wallet_balance` (numeric, NOT NULL, default 0): The provider's current wallet balance.
  Can go negative (cash orders deduct platform fee upfront).
- `negative_credit_limit` (numeric, NOT NULL, default -200): The floor below which
  a provider is automatically blocked from receiving new orders.
- `status` CHECK constraint updated to include 'blocked'.

## Changes to `orders` table
- `payment_method` (text, NOT NULL, default 'cash'): How the customer pays — 'card' or 'cash'.
- `platform_fee` (numeric, NOT NULL, default 0): 15% of order price, the platform's cut.
- `provider_earnings` (numeric, NOT NULL, default 0): 85% of order price, the provider's cut.

## Trigger: `process_financial_completion()`
Fires AFTER UPDATE ON `orders` when status transitions to 'completed'.
- Calculates 15% platform_fee and 85% provider_earnings from the order price.
- Updates the order row with the calculated amounts.
- Cash: Deducts the 15% platform fee from the provider's wallet_balance
  (provider collected full amount from customer in cash, owes platform its cut).
- Card: Adds the 85% provider earnings to the provider's wallet_balance
  (platform already collected full payment, credits provider their share).
- Auto-Block: If provider's wallet_balance drops below negative_credit_limit,
  sets their status to 'blocked'.

## Security
- The trigger function is SECURITY DEFINER to bypass RLS when updating
  the provider's profile wallet_balance and status.
- No new RLS policies needed — existing policies on profiles and orders remain unchanged.

## Important Notes
1. Only fires on the first transition to 'completed' (checks OLD.status != 'completed').
2. Skips orders with no provider_id assigned.
3. Uses the order's `price` field as the base for calculations.
4. All monetary amounts use numeric type for precision.
*/

-- ===================== 1. Add wallet columns to profiles =====================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'wallet_balance') THEN
    ALTER TABLE public.profiles ADD COLUMN wallet_balance numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'negative_credit_limit') THEN
    ALTER TABLE public.profiles ADD COLUMN negative_credit_limit numeric NOT NULL DEFAULT -200;
  END IF;
END $$;

-- ===================== 2. Update status CHECK to include 'blocked' =====================
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = connamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status = ANY (ARRAY['new'::text, 'active'::text, 'vip'::text, 'pending'::text, 'approved'::text, 'suspended'::text, 'blocked'::text]));

-- ===================== 3. Add financial columns to orders =====================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE public.orders ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'platform_fee') THEN
    ALTER TABLE public.orders ADD COLUMN platform_fee numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'provider_earnings') THEN
    ALTER TABLE public.orders ADD COLUMN provider_earnings numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ===================== 4. Trigger function: process_financial_completion =====================
CREATE OR REPLACE FUNCTION public.process_financial_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_fee   numeric;
  v_provider_earn  numeric;
  v_payment_method text;
  v_provider_id    uuid;
BEGIN
  -- Only process on the first transition TO 'completed'
  IF OLD.status = 'completed' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Skip if no provider is assigned
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_platform_fee   := ROUND(NEW.price * 0.15, 2);
  v_provider_earn  := ROUND(NEW.price * 0.85, 2);
  v_payment_method := COALESCE(NEW.payment_method, 'cash');
  v_provider_id    := NEW.provider_id;

  -- Persist the split on the order row
  UPDATE public.orders
    SET platform_fee    = v_platform_fee,
        provider_earnings = v_provider_earn
    WHERE id = NEW.id;

  -- Settle the provider wallet based on payment method
  IF v_payment_method = 'card' THEN
    -- Card: platform collected full payment; credit provider their 85% share
    UPDATE public.profiles
      SET wallet_balance = wallet_balance + v_provider_earn
      WHERE id = v_provider_id;
  ELSE
    -- Cash: provider collected full amount; deduct platform's 15% cut
    UPDATE public.profiles
      SET wallet_balance = wallet_balance - v_platform_fee
      WHERE id = v_provider_id;
  END IF;

  -- Auto-block if wallet drops below the negative credit limit
  UPDATE public.profiles
    SET status = 'blocked'
    WHERE id = v_provider_id
      AND wallet_balance < negative_credit_limit;

  RETURN NEW;
END;
$$;

-- ===================== 5. Trigger: fire AFTER UPDATE on orders =====================
DROP TRIGGER IF EXISTS trigger_financial_completion ON public.orders;

CREATE TRIGGER trigger_financial_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.process_financial_completion();
