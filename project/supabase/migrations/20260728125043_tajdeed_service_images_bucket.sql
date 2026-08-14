/*
# Create service-images Storage Bucket

1. Overview
   Creates a public Storage bucket named `service-images` for storing service and banner
   images. This is the dedicated bucket the admin image uploader writes to.

2. Storage
   - Public bucket `service-images` — readable by anyone (anon + authenticated).
   - Authenticated users can upload, update, and delete files.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_service_images" ON storage.objects;
CREATE POLICY "auth_upload_service_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "auth_update_service_images" ON storage.objects;
CREATE POLICY "auth_update_service_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "auth_delete_service_images" ON storage.objects;
CREATE POLICY "auth_delete_service_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "public_read_service_images" ON storage.objects;
CREATE POLICY "public_read_service_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');
