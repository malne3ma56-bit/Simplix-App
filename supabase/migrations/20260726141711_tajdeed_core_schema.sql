/*
# Tajdeed Core Schema — Profiles, Catalog, Settings

1. Overview
   Builds the foundation of the Tajdeed home & institutional services platform:
   - User profiles (customers, providers, admins) linked to Supabase Auth.
   - Service catalog: top-level categories + services with smart-pricing config.
   - Platform settings (automated vs manual mode, complaint contact, etc.).
   - Auto-creates a profile row whenever a new auth user signs up.

2. New Tables
   - `profiles`: extends auth.users. Fields: id (auth uid), role (customer|provider|admin),
     full_name, phone (UAE format), email, latitude, longitude, address_text,
     status (new|active|vip for customers; pending|approved|suspended for providers),
     provider_category_id (nullable; the category a provider specializes in),
     available (bool, provider instant-availability flag), created_at.
   - `categories`: top-level service sections. Fields: id, slug, name_ar, name_en,
     icon (lucide icon name), color (tailwind ramp key), sort_order, is_active, is_coming_soon.
   - `services`: services inside a category. Fields: id, category_id, slug, name_ar,
     name_en, description_ar, description_en, pricing_type (quick|deep_home|deep_corp|
     periodic_corp|factory|periodic|complex|car_wash|oil_change|helper|waitlist),
     base_price, inspection_fee (nullable), price_config (jsonb flexible rules),
     image_url (nullable), fallback_icon (lucide name used when no image), is_active,
     sort_order, created_at.
   - `settings`: single-row platform config. Fields: id (always 1), operation_mode
     (automated|manual), complaint_phone, support_email, maintenance_inspection_fee,
     created_at, updated_at.

3. Security
   - RLS enabled on all tables.
   - profiles: a user can read/update only their own row; providers/admins can read all
     profiles (so the CRM and provider views work) via a helper check on role.
   - categories, services, settings: readable by all authenticated users (shared catalog).
   - Writes to catalog/settings restricted to admin role.

4. Notes
   - A trigger `on_auth_user_created` inserts a default 'customer' profile for every new
     signup using metadata passed during signUp (full_name, phone, email, lat, lng, address).
   - `price_config` JSONB holds flexible smart-pricing rules (per-worker, per-hour, per-sqm,
     itemized furniture, vehicle multipliers, oil options) read by the frontend pricing engine.
*/

-- ===================== profiles =====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','admin')),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  address_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','active','vip','pending','approved','suspended')),
  provider_category_id uuid,
  available boolean NOT NULL DEFAULT false,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- A user can read & update their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Providers & admins can read all profiles (CRM + provider coordination)
DROP POLICY IF EXISTS "staff_read_all_profiles" ON profiles;
CREATE POLICY "staff_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('provider','admin'))
  );

-- ===================== categories =====================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT 'emerald',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_coming_soon boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_categories" ON categories;
CREATE POLICY "auth_read_categories" ON categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_categories" ON categories;
CREATE POLICY "admin_write_categories" ON categories FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== services =====================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN (
    'quick','deep_home','deep_corp','periodic_corp','factory',
    'periodic','complex','car_wash','oil_change','helper','waitlist','fixed'
  )),
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  inspection_fee numeric(10,2),
  price_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  fallback_icon text NOT NULL DEFAULT 'Sparkles',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_services" ON services;
CREATE POLICY "auth_read_services" ON services FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_services" ON services;
CREATE POLICY "admin_write_services" ON services FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== settings =====================
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  operation_mode text NOT NULL DEFAULT 'automated' CHECK (operation_mode IN ('automated','manual')),
  complaint_phone text NOT NULL DEFAULT '+971588095851',
  support_email text NOT NULL DEFAULT 'support@tajdeed.ae',
  maintenance_inspection_fee numeric(10,2) NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_read_settings" ON settings;
CREATE POLICY "auth_read_settings" ON settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_settings" ON settings;
CREATE POLICY "admin_update_settings" ON settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ===================== auto-profile trigger =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, email, latitude, longitude, address_text)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    (NEW.raw_user_meta_data->>'latitude')::double precision,
    (NEW.raw_user_meta_data->>'longitude')::double precision,
    COALESCE(NEW.raw_user_meta_data->>'address_text', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
