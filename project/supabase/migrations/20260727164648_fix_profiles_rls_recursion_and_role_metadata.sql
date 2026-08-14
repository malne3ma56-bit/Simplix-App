-- # Fix: infinite RLS recursion on `profiles` + role-based policies
--
-- Root cause: the `staff_read_all_profiles` SELECT policy on `profiles`
-- runs `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN (...))`.
-- Evaluating that policy requires reading `profiles`, which is gated by the same
-- policy → infinite recursion → every profile query (including the one run right
-- after login) fails with "infinite recursion detected in policy for relation
-- profiles". Users could authenticate but never load a profile, so the app stayed
-- stuck on the auth screen.
--
-- Fix: stop reading role from the `profiles` row inside profiles' own RLS.
-- Instead store the role in auth.users raw_app_meta_data (available in the JWT as
-- `role`) at signup time, and read it via a SECURITY DEFINER helper that inspects
-- the JWT. This breaks the self-reference. Catalog/order policies on *other*
-- tables keep using the helper too for consistency.

-- ===================== 1. Helper: role from JWT app metadata =====================
-- `auth.jwt() ->> 'role'` reads raw_app_meta_data.role. Defaults to 'customer'.
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'customer');
$$;

-- ===================== 2. Trigger: write role into app metadata =====================
-- Replace handle_new_user so it sets raw_app_meta_data.role via a post-insert
-- update of auth.users. (Trigger runs AFTER INSERT on auth.users, so the row
-- exists.) This makes the role available in the JWT for RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Create the profile row
  INSERT INTO public.profiles (id, role, full_name, phone, email, latitude, longitude, address_text)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    (NEW.raw_user_meta_data->>'latitude')::double precision,
    (NEW.raw_user_meta_data->>'longitude')::double precision,
    COALESCE(NEW.raw_user_meta_data->>'address_text', '')
  );

  -- Promote role into app metadata so it lands in the JWT.
  -- (Merge into existing app metadata instead of overwriting other keys.)
  UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- (Trigger itself is unchanged; function body is replaced above.)

-- ===================== 3. Backfill existing users =====================
-- Set role in app metadata for users created before this migration.
UPDATE auth.users u
  SET raw_app_meta_data =
    COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
  FROM profiles p
  WHERE p.id = u.id
    AND (u.raw_app_meta_data ->> 'role') IS NULL;

-- ===================== 4. Replace the self-referencing profiles policy =====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_profiles" ON profiles;
CREATE POLICY "staff_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    public.current_role() IN ('provider', 'admin')
  );

-- ===================== 5. Replace role-checks on other tables (use helper) =====================
-- These didn't recurse (they're on other tables), but switching to the JWT-based
-- helper is more robust and consistent.

-- categories
DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories" ON categories FOR ALL
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- services
DROP POLICY IF EXISTS "admin_write_services" ON services;
CREATE POLICY "admin_write_services" ON services FOR ALL
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- settings
DROP POLICY IF EXISTS "admin_update_settings" ON settings;
CREATE POLICY "admin_update_settings" ON settings FOR UPDATE
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- orders
DROP POLICY IF EXISTS "provider_read_orders" ON orders;
CREATE POLICY "provider_read_orders" ON orders FOR SELECT
  TO authenticated USING (
    provider_id = auth.uid()
    OR (provider_id IS NULL AND public.current_role() = 'provider')
  );

DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders FOR SELECT
  TO authenticated USING (public.current_role() = 'admin');

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- order_events
DROP POLICY IF EXISTS "read_order_events" ON order_events;
CREATE POLICY "read_order_events" ON order_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_events.order_id AND (
      o.customer_id = auth.uid() OR o.provider_id = auth.uid() OR
      public.current_role() = 'admin'
    ))
  );

DROP POLICY IF EXISTS "insert_order_events" ON order_events;
CREATE POLICY "insert_order_events" ON order_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_events.order_id AND (
      o.customer_id = auth.uid() OR o.provider_id = auth.uid() OR
      public.current_role() = 'admin'
    ))
  );

-- helper_requests
DROP POLICY IF EXISTS "admin_read_helpers" ON helper_requests;
CREATE POLICY "admin_read_helpers" ON helper_requests FOR SELECT
  TO authenticated USING (public.current_role() = 'admin');

DROP POLICY IF EXISTS "admin_update_helpers" ON helper_requests;
CREATE POLICY "admin_update_helpers" ON helper_requests FOR UPDATE
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- waitlist_entries
DROP POLICY IF EXISTS "admin_read_waitlist" ON waitlist_entries;
CREATE POLICY "admin_read_waitlist" ON waitlist_entries FOR SELECT
  TO authenticated USING (public.current_role() = 'admin');

-- ratings
DROP POLICY IF EXISTS "admin_manage_ratings" ON ratings;
CREATE POLICY "admin_manage_ratings" ON ratings FOR ALL
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');
