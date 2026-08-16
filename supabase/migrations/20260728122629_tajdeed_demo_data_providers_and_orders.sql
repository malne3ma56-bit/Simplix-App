/*
# Tajdeed Demo Data — Providers & Sample Orders

1. Overview
   Seeds realistic demo data for the full preview experience:
   - 6 provider profiles (companies + technicians) across cleaning, maintenance,
     and car services with realistic ratings, completion rates, and specialties.
   - 5 sample orders tied to the existing customer account in various statuses
     so the customer orders screen, admin analytics, and provider app all have
     content to display.

2. Provider login credentials (for demo/preview)
   All providers share the password: Tajdeed@2026Provider
   - provider.cleaning@tajdeed.ae  (Cleaning, 4.8★)
   - provider.deep@tajdeed.ae      (Cleaning, 4.6★)
   - provider.maintenance@tajdeed.ae (Maintenance, 4.7★)
   - provider.ac@tajdeed.ae         (Maintenance, 4.9★)
   - provider.cars@tajdeed.ae       (Cars, 4.5★)
   - provider.oil@tajdeed.ae        (Cars, 4.3★)

3. Sample orders (all linked to customer de4270f8)
   - 2 completed (cleaning + AC) with full event timelines + ratings
   - 1 pending (car wash, awaiting provider)
   - 1 on_the_way (deep home cleaning)
   - 1 started (oil change in progress)

4. Idempotent: re-runnable. Existing providers/orders are preserved.
*/

-- ===================== Create provider auth users =====================
DO $$
DECLARE
  v_emails text[] := ARRAY[
    'provider.cleaning@tajdeed.ae',
    'provider.deep@tajdeed.ae',
    'provider.maintenance@tajdeed.ae',
    'provider.ac@tajdeed.ae',
    'provider.cars@tajdeed.ae',
    'provider.oil@tajdeed.ae'
  ];
  v_email text;
  v_user_id uuid;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        crypt('Tajdeed@2026Provider', gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', 'provider'),
        jsonb_build_object('role', 'provider'),
        now(), now(), now(),
        '', '', '', ''
      );
    END IF;
  END LOOP;
END $$;

-- ===================== Upsert provider profiles =====================
INSERT INTO profiles (id, role, full_name, phone, email, status, provider_category_id, available, rating_avg, rating_count, address_text)
SELECT
  u.id,
  'provider',
  x.full_name,
  x.phone,
  u.email,
  'approved',
  x.category_id::uuid,
  x.available,
  x.rating_avg::numeric,
  x.rating_count::integer,
  x.address
FROM auth.users u
JOIN (VALUES
  ('provider.cleaning@tajdeed.ae', 'شركة تجديد للنظافة', '0551234567', '7e234a8f-f9e3-4b32-b83d-eacb65ffed95', true, '4.80', '127', 'دبي - ديرة'),
  ('provider.deep@tajdeed.ae', 'بيور ديب للتنظيف العميق', '0552345678', '7e234a8f-f9e3-4b32-b83d-eacb65ffed95', true, '4.60', '89', 'الشارقة - النهدة'),
  ('provider.maintenance@tajdeed.ae', 'المنار لصيانة المرافق', '0553456789', '81eda62e-6561-4280-8fd3-5a8b746a60f1', true, '4.70', '203', 'دبي - القوز'),
  ('provider.ac@tajdeed.ae', 'فاست فيكس لتكييف', '0554567890', '81eda62e-6561-4280-8fd3-5a8b746a60f1', true, '4.90', '341', 'أبوظبي - المصفح'),
  ('provider.cars@tajdeed.ae', 'شاين أوتو لخدمات السيارات', '0555678901', 'a511144e-30f5-4633-9922-f7621719f4be', false, '4.50', '156', 'دبي - القوز'),
  ('provider.oil@tajdeed.ae', 'سبيدي لتبديل الزيوت', '0556789012', 'a511144e-30f5-4633-9922-f7621719f4be', true, '4.30', '78', 'الشارقة - الصناعية')
) AS x(email, full_name, phone, category_id, available, rating_avg, rating_count, address)
ON u.email = x.email
ON CONFLICT (id) DO UPDATE SET
  role = 'provider',
  full_name = EXCLUDED.full_name,
  status = 'approved',
  provider_category_id = EXCLUDED.provider_category_id,
  available = EXCLUDED.available,
  rating_avg = EXCLUDED.rating_avg,
  rating_count = EXCLUDED.rating_count,
  address_text = EXCLUDED.address_text;

-- Set role=provider in app metadata for JWT-based RLS
UPDATE auth.users u
  SET raw_app_meta_data =
    COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'provider')
  WHERE u.email LIKE 'provider.%@tajdeed.ae';

-- ===================== Sample orders =====================
DO $$
DECLARE
  v_customer uuid := 'de4270f8-6217-4ee3-ad52-59825b554440';
  v_cleaning_svc uuid := '327e4630-0cf9-4807-b2bb-7490b2fc6d05';
  v_ac_svc uuid := '0d3af1de-ed4f-420f-933d-40d004ddbb13';
  v_carwash_svc uuid := 'd313fa33-cc00-43dd-b58a-bbcc96184a2b';
  v_deep_svc uuid := '37aebe94-e0b1-4656-b814-116aae552840';
  v_oil_svc uuid := '4171862c-b5a9-4527-af95-3946b1b1a645';
  v_cleaning_cat uuid := '7e234a8f-f9e3-4b32-b83d-eacb65ffed95';
  v_maint_cat uuid := '81eda62e-6561-4280-8fd3-5a8b746a60f1';
  v_cars_cat uuid := 'a511144e-30f5-4633-9922-f7621719f4be';
  v_provider_cleaning uuid;
  v_provider_ac uuid;
  v_provider_cars uuid;
  v_o1 uuid; v_o2 uuid; v_o3 uuid; v_o4 uuid; v_o5 uuid;
BEGIN
  SELECT id INTO v_provider_cleaning FROM profiles WHERE email = 'provider.cleaning@tajdeed.ae';
  SELECT id INTO v_provider_ac FROM profiles WHERE email = 'provider.ac@tajdeed.ae';
  SELECT id INTO v_provider_cars FROM profiles WHERE email = 'provider.cars@tajdeed.ae';

  -- Order 1: Completed quick home cleaning
  v_o1 := gen_random_uuid();
  INSERT INTO orders (id, customer_id, provider_id, service_id, category_id, pricing_type, summary_ar, details, price, status, address_text, latitude, longitude, created_at, updated_at)
  VALUES (v_o1, v_customer, v_provider_cleaning, v_cleaning_svc, v_cleaning_cat, 'quick',
    'تنظيف دوري سريع - 2 عمال، 3 ساعات',
    '{"workers":2,"hours":3,"gender":"male"}'::jsonb, 165, 'completed',
    'دبي - ديرة، شارع 23A', 25.2960, 55.3320,
    now() - interval '5 days', now() - interval '4 days');
  INSERT INTO order_events (order_id, status, note, created_at) VALUES
    (v_o1, 'pending', 'تم إنشاء الطلب', now() - interval '5 days'),
    (v_o1, 'assigned', 'قبل المزود الطلب', now() - interval '5 days' + interval '15 minutes'),
    (v_o1, 'on_the_way', 'المزود في الطريق', now() - interval '4 days 6 hours'),
    (v_o1, 'started', 'بدأت الخدمة', now() - interval '4 days 5 hours'),
    (v_o1, 'completed', 'اكتملت الخدمة', now() - interval '4 days');

  -- Order 2: Completed AC maintenance
  v_o2 := gen_random_uuid();
  INSERT INTO orders (id, customer_id, provider_id, service_id, category_id, pricing_type, summary_ar, details, price, inspection_fee_applied, status, address_text, latitude, longitude, created_at, updated_at)
  VALUES (v_o2, v_customer, v_provider_ac, v_ac_svc, v_maint_cat, 'periodic',
    'صيانة تكييف - تنظيف وحدة + شحن غاز',
    '{"service":"ac_clean_unit","gas_refill":true}'::jsonb, 300, true, 'completed',
    'دبي - ديرة، شارع 23A', 25.2960, 55.3320,
    now() - interval '12 days', now() - interval '11 days');
  INSERT INTO order_events (order_id, status, note, created_at) VALUES
    (v_o2, 'pending', 'تم إنشاء الطلب', now() - interval '12 days'),
    (v_o2, 'assigned', 'قبل المزود الطلب', now() - interval '12 days' + interval '10 minutes'),
    (v_o2, 'on_the_way', 'المزود في الطريق', now() - interval '11 days 8 hours'),
    (v_o2, 'started', 'بدأت الخدمة', now() - interval '11 days 7 hours'),
    (v_o2, 'completed', 'اكتملت الخدمة', now() - interval '11 days');

  -- Order 3: Pending car wash
  v_o3 := gen_random_uuid();
  INSERT INTO orders (id, customer_id, service_id, category_id, pricing_type, summary_ar, details, price, status, address_text, latitude, longitude, created_at, updated_at)
  VALUES (v_o3, v_customer, v_carwash_svc, v_cars_cat, 'car_wash',
    'غسيل سيارة عميق - صالون + مقاعد + محرك بالبخار',
    '{"vehicle":"sedan","type":"deep","addons":["seats","engine_steam"]}'::jsonb, 175, 'pending',
    'دبي - ديرة، شارع 23A', 25.2960, 55.3320,
    now() - interval '2 hours', now() - interval '2 hours');
  INSERT INTO order_events (order_id, status, note, created_at) VALUES
    (v_o3, 'pending', 'تم إنشاء الطلب', now() - interval '2 hours');

  -- Order 4: On the way - deep home cleaning
  v_o4 := gen_random_uuid();
  INSERT INTO orders (id, customer_id, provider_id, service_id, category_id, pricing_type, summary_ar, details, price, status, address_text, latitude, longitude, created_at, updated_at)
  VALUES (v_o4, v_customer, v_provider_cleaning, v_deep_svc, v_cleaning_cat, 'deep_home',
    'تنظيف عميق للمنزل - 180 م² (نظام رؤية AI)',
    '{"system":"ai_vision","sqm":180}'::jsonb, 2160, 'on_the_way',
    'دبي - ديرة، شارع 23A', 25.2960, 55.3320,
    now() - interval '1 day', now() - interval '30 minutes');
  INSERT INTO order_events (order_id, status, note, created_at) VALUES
    (v_o4, 'pending', 'تم إنشاء الطلب', now() - interval '1 day'),
    (v_o4, 'assigned', 'قبل المزود الطلب', now() - interval '1 day' + interval '20 minutes'),
    (v_o4, 'on_the_way', 'المزود في الطريق', now() - interval '30 minutes');

  -- Order 5: Started - oil change
  v_o5 := gen_random_uuid();
  INSERT INTO orders (id, customer_id, provider_id, service_id, category_id, pricing_type, summary_ar, details, price, status, address_text, latitude, longitude, created_at, updated_at)
  VALUES (v_o5, v_customer, v_provider_cars, v_oil_svc, v_cars_cat, 'oil_change',
    'تبديل زيت - موبيل 5 لتر صناعي + فلتر ممتاز',
    '{"brand":"mobiloil","size":"5l","type":"synthetic","filter":"premium"}'::jsonb, 253.5, 'started',
    'دبي - ديرة، شارع 23A', 25.2960, 55.3320,
    now() - interval '3 hours', now() - interval '1 hour');
  INSERT INTO order_events (order_id, status, note, created_at) VALUES
    (v_o5, 'pending', 'تم إنشاء الطلب', now() - interval '3 hours'),
    (v_o5, 'assigned', 'قبل المزود الطلب', now() - interval '3 hours' + interval '5 minutes'),
    (v_o5, 'on_the_way', 'المزود في الطريق', now() - interval '2 hours'),
    (v_o5, 'started', 'بدأت الخدمة', now() - interval '1 hour');

  -- Ratings for completed orders
  INSERT INTO ratings (order_id, customer_id, provider_id, stars, comment, created_at)
  VALUES
    (v_o1, v_customer, v_provider_cleaning, 5, 'خدمة ممتازة وسريعة. العمال محترفون جداً.', now() - interval '4 days'),
    (v_o2, v_customer, v_provider_ac, 4, 'الصيانة كانت جيدة لكن التأخير في الوصول 15 دقيقة.', now() - interval '11 days')
  ON CONFLICT DO NOTHING;
END $$;
