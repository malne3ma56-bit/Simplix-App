/*
# Smart Pricing & Viral Marketing Engine — Schema

1. Modified Tables
- `profiles`: Added `referral_code` (text, unique, nullable) — each customer gets a unique referral code generated on creation.
  Added `customer_wallet` (numeric, default 0) — stores referral credits and promo wallet balance for customers.
- `orders`: Added `surge_multiplier` (numeric, default 1.0) — dynamic surge pricing multiplier applied at booking time.
  Added `discount_amount` (numeric, default 0) — discount deducted from the order total when a promo code is applied.

2. Auto-Generation
- A trigger auto-generates a unique referral_code (format: TJD-XXXXXX) for every new profile row on insert.

3. Financial Safety
- The new columns are purely additive with safe defaults.
- The existing 85/15 financial split logic remains untouched — the new fields only affect the `price` field stored on the order.
- `discount_amount` and `surge_multiplier` are informational columns; the actual `price` already reflects the final amount.

4. Security
- No new tables. Existing RLS policies on `profiles` and `orders` cover the new columns automatically.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'customer_wallet') THEN
    ALTER TABLE profiles ADD COLUMN customer_wallet numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'surge_multiplier') THEN
    ALTER TABLE orders ADD COLUMN surge_multiplier numeric NOT NULL DEFAULT 1.0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Unique constraint on referral_code (only where not null)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_referral_code_key') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Auto-generate referral code on insert
DROP FUNCTION IF EXISTS generate_referral_code();
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'TJD-' || UPPER(SUBSTRING(MD5(RANDOM()::text || NEW.id::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Backfill referral_code for existing profiles
UPDATE profiles
SET referral_code = 'TJD-' || UPPER(SUBSTRING(MD5(RANDOM()::text || id::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;
