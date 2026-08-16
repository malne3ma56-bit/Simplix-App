/*
# Tajdeed Orders, Helpers, Waitlist, Ratings

1. Overview
   Adds the operational tables that make Tajdeed real-time:
   - orders: every service request. Carries smart-pricing output, status, customer+provider.
   - order_events: append-only status timeline for live tracking.
   - helper_requests: domestic-helper recruitment requests (printable to recruitment offices).
   - waitlist_entries: customer interest in Coming-Soon sections.
   - ratings: customer ratings + reviews of providers; admin can hide abusive ones.

2. Security
   - Customers read/write only their own rows; providers read+update orders assigned to them
     and can see unassigned orders to claim; admins read/write everything via role EXISTS check.
   - Real-time: frontend subscribes to order_events inserts + orders updates for live tracking.
*/

-- ===================== orders =====================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  pricing_type text NOT NULL DEFAULT 'fixed',
  summary_ar text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  price numeric(10,2) NOT NULL DEFAULT 0,
  inspection_fee_applied boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','assigned','on_the_way','started','completed','cancelled'
  )),
  address_text text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_orders" ON orders;
CREATE POLICY "customer_read_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "provider_read_orders" ON orders;
CREATE POLICY "provider_read_orders" ON orders FOR SELECT
  TO authenticated USING (
    provider_id = auth.uid()
    OR (provider_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'provider'
    ))
  );

DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "customer_insert_own_orders" ON orders;
CREATE POLICY "customer_insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "provider_update_assigned_orders" ON orders;
CREATE POLICY "provider_update_assigned_orders" ON orders FOR UPDATE
  TO authenticated USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_orders" ON orders;
CREATE POLICY "admin_update_orders" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "customer_cancel_own_orders" ON orders;
CREATE POLICY "customer_cancel_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id AND status = 'pending')
  WITH CHECK (auth.uid() = customer_id);

-- ===================== order_events =====================
CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_order_events" ON order_events;
CREATE POLICY "read_order_events" ON order_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_events.order_id AND (
      o.customer_id = auth.uid() OR o.provider_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ))
  );

DROP POLICY IF EXISTS "insert_order_events" ON order_events;
CREATE POLICY "insert_order_events" ON order_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_events.order_id AND (
      o.customer_id = auth.uid() OR o.provider_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ))
  );

-- ===================== helper_requests =====================
CREATE TABLE IF NOT EXISTS helper_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  age_min integer,
  age_max integer,
  gender text,
  nationality text,
  experience text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','processing','fulfilled')),
  printable_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE helper_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_helpers" ON helper_requests;
CREATE POLICY "customer_read_own_helpers" ON helper_requests FOR SELECT
  TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "admin_read_helpers" ON helper_requests;
CREATE POLICY "admin_read_helpers" ON helper_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "customer_insert_helpers" ON helper_requests;
CREATE POLICY "customer_insert_helpers" ON helper_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "admin_update_helpers" ON helper_requests;
CREATE POLICY "admin_update_helpers" ON helper_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== waitlist_entries =====================
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category_slug text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_waitlist" ON waitlist_entries;
CREATE POLICY "customer_insert_waitlist" ON waitlist_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id OR customer_id IS NULL);

DROP POLICY IF EXISTS "admin_read_waitlist" ON waitlist_entries;
CREATE POLICY "admin_read_waitlist" ON waitlist_entries FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== ratings =====================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text NOT NULL DEFAULT '',
  hidden_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_own_rating" ON ratings;
CREATE POLICY "customer_insert_own_rating" ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "customer_read_own_rating" ON ratings;
CREATE POLICY "customer_read_own_rating" ON ratings FOR SELECT
  TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "provider_read_ratings" ON ratings;
CREATE POLICY "provider_read_ratings" ON ratings FOR SELECT
  TO authenticated USING (provider_id = auth.uid() AND hidden_by_admin = false);

DROP POLICY IF EXISTS "admin_manage_ratings" ON ratings;
CREATE POLICY "admin_manage_ratings" ON ratings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== updated_at trigger =====================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_touch_updated_at ON orders;
CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===================== indexes =====================
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
