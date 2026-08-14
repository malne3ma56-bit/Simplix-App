/*
# Provider Onboarding — Pending Approval Status

## Summary
Adds 'pending_approval' to the profiles status CHECK constraint so providers
who register through the onboarding flow can be stored with that status until
an admin approves them. Also updates handle_new_user to pass through
provider_category_id from signup metadata.

## Changes
1. Drops the existing status CHECK constraint on profiles and recreates it
   with 'pending_approval' added to the allowed values.
2. Updates handle_new_user() to accept provider_category_id from
   raw_user_meta_data so provider registrations can set their category.

## Security
- No new tables. Existing RLS policies remain unchanged.
- The constraint change is purely additive — all existing status values
  remain valid.

## Important Notes
- Uses DROP + CREATE for the constraint since ALTER CONSTRAINT is not supported.
- The handle_new_user function is replaced (CREATE OR REPLACE) with the
  updated logic.
*/

-- ===================== 1. Update status CHECK constraint =====================
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = connamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'profiles'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status = ANY (ARRAY['new'::text, 'active'::text, 'vip'::text, 'pending'::text, 'pending_approval'::text, 'approved'::text, 'suspended'::text, 'blocked'::text]));

-- ===================== 2. Update handle_new_user for provider_category_id =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, email, latitude, longitude, address_text, provider_category_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
    (NEW.raw_user_meta_data->>'latitude')::double precision,
    (NEW.raw_user_meta_data->>'longitude')::double precision,
    COALESCE(NEW.raw_user_meta_data->>'address_text', ''),
    NULLIF(NEW.raw_user_meta_data->>'provider_category_id', '')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'status', 'new')
  );
  RETURN NEW;
END;
$$;
