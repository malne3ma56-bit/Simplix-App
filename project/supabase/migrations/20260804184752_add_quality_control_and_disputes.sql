/*
# Automated Quality Control & Dispute Resolution

1. Modified Tables
- `orders`: Added 3 new columns for customer rating and dispute tracking.
  - `customer_rating` (numeric, nullable, 1-5 scale) — stores the rating submitted by the customer after order completion.
  - `dispute_status` (text, NOT NULL, default 'none') — tracks dispute state: 'none', 'opened', 'resolved'.
  - `dispute_reason` (text, nullable) — stores the reason text when a customer opens a dispute.
- `profiles`: Added `average_rating` (numeric, default 5.0) and `total_reviews` (integer, default 0) as canonical
  quality-control fields. These mirror the existing `rating_avg` / `rating_count` columns; both sets are kept in
  sync by the application layer for backward compatibility.

2. Security
- No new tables — existing RLS policies on `orders` and `profiles` remain unchanged.
- The new columns inherit the access control already in place for their parent tables.

3. Important Notes
- All additions use `IF NOT EXISTS` via DO blocks so the migration is safe to re-run.
- No data is lost or transformed — columns are added with safe defaults.
- The `dispute_status` CHECK constraint enforces only valid values.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_rating') THEN
    ALTER TABLE orders ADD COLUMN customer_rating numeric CHECK (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'dispute_status') THEN
    ALTER TABLE orders ADD COLUMN dispute_status text NOT NULL DEFAULT 'none' CHECK (dispute_status IN ('none', 'opened', 'resolved'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'dispute_reason') THEN
    ALTER TABLE orders ADD COLUMN dispute_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'average_rating') THEN
    ALTER TABLE profiles ADD COLUMN average_rating numeric NOT NULL DEFAULT 5.0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_reviews') THEN
    ALTER TABLE profiles ADD COLUMN total_reviews integer NOT NULL DEFAULT 0;
  END IF;
END $$;
