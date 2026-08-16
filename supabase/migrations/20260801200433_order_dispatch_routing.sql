/*
# Automated Order Dispatch & Routing System

## Summary
Adds dispatch-routing columns to `orders` and updates the status CHECK constraint
and RLS policies to support the automated provider-dispatch flow:
  pending → pending_provider_approval → accepted/rejected → (forward) or unassigned_requires_admin

## Changes to `orders` table
- `current_provider_id` (uuid, nullable, FK → profiles): The provider currently
  being asked to approve the order. Distinct from `provider_id` which is only set
  once the provider formally accepts.
- `rejected_by` (uuid[], NOT NULL, default '{}'): Array of provider IDs who have
  ignored or rejected the order, so the dispatcher never loops back to them.
- `status` CHECK constraint replaced to include:
  'pending_provider_approval', 'accepted', 'unassigned_requires_admin'.

## RLS Policy Updates
- `provider_read_orders`: providers can now also read orders where
  `current_provider_id = auth.uid()` (so they see dispatch requests routed to them).
- `provider_update_assigned_orders`: providers can update orders where
  `current_provider_id = auth.uid()` (to accept or reject the dispatch).

## Index
- `idx_orders_current_provider` on `current_provider_id` for fast dispatch lookups.

## Important Notes
1. `provider_id` remains null until the provider formally accepts; `current_provider_id`
   tracks the pending-approval assignment.
2. `rejected_by` uses a native uuid[] so exclusion queries use `<> ALL(rejected_by)`.
3. All existing policies and triggers remain intact — only the two provider policies
   are dropped/recreated with the additional `current_provider_id` condition.
*/

-- ===================== 1. Add dispatch columns to orders =====================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'current_provider_id') THEN
    ALTER TABLE public.orders ADD COLUMN current_provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'rejected_by') THEN
    ALTER TABLE public.orders ADD COLUMN rejected_by uuid[] NOT NULL DEFAULT '{}'::uuid[];
  END IF;
END $$;

-- ===================== 2. Replace orders status CHECK constraint =====================
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = connamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'orders'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending','pending_provider_approval','accepted','assigned',
    'on_the_way','started','completed','cancelled','unassigned_requires_admin'
  ));

-- ===================== 3. Index for dispatch lookups =====================
CREATE INDEX IF NOT EXISTS idx_orders_current_provider ON orders(current_provider_id);

-- ===================== 4. Update RLS: provider can read dispatch-routed orders =====================
DROP POLICY IF EXISTS "provider_read_orders" ON orders;
CREATE POLICY "provider_read_orders" ON orders FOR SELECT
  TO authenticated USING (
    provider_id = auth.uid()
    OR current_provider_id = auth.uid()
    OR (provider_id IS NULL AND current_provider_id IS NULL AND public.current_role() = 'provider')
  );

-- ===================== 5. Update RLS: provider can accept/reject dispatch orders =====================
DROP POLICY IF EXISTS "provider_update_assigned_orders" ON orders;
CREATE POLICY "provider_update_assigned_orders" ON orders FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid() OR current_provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid() OR current_provider_id = auth.uid());
