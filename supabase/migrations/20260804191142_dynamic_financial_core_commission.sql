/*
# Dynamic Financial Core — Custom Commission Rates & Subscription Plans

## Summary
Adds per-provider financial override fields to `profiles` and rewrites the
`process_financial_completion()` trigger to use a dynamic commission rate
instead of the hardcoded 15%.

## Changes to `profiles` table
- `custom_commission_rate` (numeric, nullable): When set (e.g. 0.05 for 5%),
  overrides the default 15% platform fee for this provider. NULL means use default.
- `subscription_plan` (text, NOT NULL, default 'none'): Subscription model —
  'none', 'monthly', or 'annual'.
- `is_subscription_active` (boolean, NOT NULL, default false): Whether the
  subscription is currently active. When true AND plan is monthly/annual,
  the platform fee is 0 and the provider keeps 100% of earnings.

## Changes to `process_financial_completion()` trigger
- Now fetches the provider's `custom_commission_rate`, `subscription_plan`,
  and `is_subscription_active` at completion time.
- Commission logic (in priority order):
  1. Subscription Bypass: If subscription_plan IN ('monthly','annual') AND
     is_subscription_active = true → platform_fee = 0, provider_earnings = 100%.
  2. Custom Rate: If custom_commission_rate IS NOT NULL → use that rate.
  3. Default: Fall back to 15% (0.15).
- All existing wallet settlement logic (cash debit, card credit, auto-block)
  remains unchanged — only the rate calculation is dynamic.

## Security
- No new tables. The trigger is already SECURITY DEFINER.
- Existing RLS policies on profiles and orders cover the new columns.
- The new columns are additive with safe defaults — no data loss.

## Important Notes
1. The trigger is re-created (DROP + CREATE) to update its logic.
2. The trigger remains idempotent — only fires on first transition to 'completed'.
3. All monetary amounts use numeric type for precision.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'custom_commission_rate') THEN
    ALTER TABLE public.profiles ADD COLUMN custom_commission_rate numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_plan') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_plan text NOT NULL DEFAULT 'none' CHECK (subscription_plan IN ('none', 'monthly', 'annual'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_subscription_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_subscription_active boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ===================== Rewrite process_financial_completion() =====================
CREATE OR REPLACE FUNCTION public.process_financial_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_fee     numeric;
  v_provider_earn    numeric;
  v_payment_method   text;
  v_provider_id      uuid;
  v_commission_rate  numeric;
  v_custom_rate      numeric;
  v_sub_plan         text;
  v_sub_active       boolean;
BEGIN
  -- Only process on the first transition TO 'completed'
  IF OLD.status = 'completed' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Skip if no provider is assigned
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_provider_id    := NEW.provider_id;
  v_payment_method := COALESCE(NEW.payment_method, 'cash');

  -- Fetch provider's financial settings
  SELECT custom_commission_rate, subscription_plan, is_subscription_active
    INTO v_custom_rate, v_sub_plan, v_sub_active
  FROM public.profiles WHERE id = v_provider_id;

  -- Determine the active commission rate (priority: subscription bypass > custom rate > default 15%)
  IF v_sub_plan IN ('monthly', 'annual') AND v_sub_active = true THEN
    -- Subscription Bypass: provider keeps 100%, platform takes 0%
    v_commission_rate := 0;
  ELSIF v_custom_rate IS NOT NULL THEN
    -- Custom B2B rate for this provider
    v_commission_rate := v_custom_rate;
  ELSE
    -- Default platform fee
    v_commission_rate := 0.15;
  END IF;

  v_platform_fee  := ROUND(NEW.price * v_commission_rate, 2);
  v_provider_earn := ROUND(NEW.price * (1 - v_commission_rate), 2);

  -- Persist the split on the order row
  UPDATE public.orders
    SET platform_fee    = v_platform_fee,
        provider_earnings = v_provider_earn
    WHERE id = NEW.id;

  -- Settle the provider wallet based on payment method
  IF v_payment_method = 'card' THEN
    -- Card: platform collected full payment; credit provider their earnings share
    UPDATE public.profiles
      SET wallet_balance = wallet_balance + v_provider_earn
      WHERE id = v_provider_id;
  ELSE
    -- Cash: provider collected full amount; deduct platform's fee
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
