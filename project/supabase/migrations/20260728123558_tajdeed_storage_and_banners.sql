/*
# Tajdeed Storage Bucket & Banners Table

1. Overview
   Adds Supabase Storage support for image uploads (services, banners, categories)
   and creates a `banners` table for managing promotional banners across the app.

2. Storage
   - Creates a public bucket `tajdeed-images` for storing uploaded images.
   - Files are accessible publicly via the Supabase Storage CDN URL.

3. New Table: banners
   - `id` (uuid, primary key)
   - `title_ar` / `title_en` (text, banner display name)
   - `image_url` (text, the image — either uploaded to Storage or an external URL)
   - `link_target` (text, optional: where the banner navigates when tapped)
   - `sort_order` (int, display ordering)
   - `is_active` (bool, whether the banner is currently shown)
   - `placement` (text, where the banner appears: home_top, category_top, etc.)
   - `created_at` (timestamptz)

4. Security
   - RLS enabled on `banners`.
   - All authenticated users can read banners (they appear across the customer app).
   - Only admins can insert/update/delete banners.
   - Storage bucket is public for reads; only authenticated users can upload.
*/

-- ===================== Create storage bucket =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('tajdeed-images', 'tajdeed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload, public can read
DROP POLICY IF EXISTS "auth_upload_tajdeed_images" ON storage.objects;
CREATE POLICY "auth_upload_tajdeed_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tajdeed-images');

DROP POLICY IF EXISTS "auth_update_tajdeed_images" ON storage.objects;
CREATE POLICY "auth_update_tajdeed_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'tajdeed-images');

DROP POLICY IF EXISTS "auth_delete_tajdeed_images" ON storage.objects;
CREATE POLICY "auth_delete_tajdeed_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tajdeed-images');

DROP POLICY IF EXISTS "public_read_tajdeed_images" ON storage.objects;
CREATE POLICY "public_read_tajdeed_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'tajdeed-images');

-- ===================== banners table =====================
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  link_target text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  placement text NOT NULL DEFAULT 'home_top',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_banners" ON banners;
CREATE POLICY "auth_read_banners" ON banners FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
