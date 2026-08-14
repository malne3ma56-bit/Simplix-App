/*
# Real-Time Notification & Audio Alert System

1. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user — the notification recipient)
  - `title` (text, not null)
  - `message` (text, not null)
  - `type` (text, not null: 'order' | 'system' | 'dispute')
  - `read_status` (boolean, default false)
  - `related_order_id` (uuid, nullable — links notification to an order if applicable)
  - `created_at` (timestamptz, default now())

2. Modified Tables
- `profiles`
  - Added `sound_alerts_enabled` (boolean, default true) — controls whether the user hears audio chimes for incoming events.

3. Security
- Enable RLS on `notifications`.
- Owner-scoped CRUD: each authenticated user can only SELECT, INSERT, UPDATE, DELETE their own notifications.

4. Important Notes
- The `user_id` column defaults to `auth.uid()` so client-side inserts that omit it still satisfy RLS.
- The `sound_alerts_enabled` column on profiles defaults to `true` so all existing and new users hear alerts until they opt out.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('order', 'system', 'dispute')),
  read_status boolean NOT NULL DEFAULT false,
  related_order_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications"
ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sound_alerts_enabled') THEN
    ALTER TABLE profiles ADD COLUMN sound_alerts_enabled boolean NOT NULL DEFAULT true;
  END IF;
END $$;
