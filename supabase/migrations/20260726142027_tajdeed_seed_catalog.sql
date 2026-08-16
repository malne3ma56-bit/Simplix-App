/*
# Tajdeed Seed Catalog — Categories & Services with Smart-Pricing Config

1. Overview
   Seeds the platform with all service sections:
   - Cleaning (5 options), Maintenance (6 subcategories), Car services (wash, oil), Helpers, Coming-Soon.
   Each service carries a `price_config` JSONB consumed by the frontend pricing engine.
   Prices in AED. Admins can edit all from the dashboard.

2. Idempotent: re-runnable. ON CONFLICT preserves admin edits to names/descriptions/sort.
*/

-- ===================== categories =====================
INSERT INTO categories (slug, name_ar, name_en, icon, color, sort_order, is_active, is_coming_soon) VALUES
  ('cleaning', 'النظافة بجودة تجديد', 'Cleaning with Tajdeed Quality', 'Sparkles', 'emerald', 1, true, false),
  ('maintenance', 'صيانة المرافق', 'Facilities Maintenance', 'Wrench', 'sky', 2, true, false),
  ('cars', 'خدمات السيارات', 'Car Services', 'Car', 'amber', 3, true, false),
  ('helpers', 'توظيف عاملات مساعدة منزلية', 'Domestic Helper Recruitment', 'HeartHandshake', 'rose', 4, true, false),
  ('coming_soon_basics', 'الخبز والماء والغاز', 'Bread, Water & Gas', 'Wheat', 'orange', 5, false, true),
  ('coming_soon_recycle', 'إعادة التدوير', 'Recycling', 'Recycle', 'teal', 6, false, true)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon, color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order, is_coming_soon = EXCLUDED.is_coming_soon;

-- ===================== cleaning services (5) =====================
INSERT INTO services (category_id, slug, name_ar, name_en, description_ar, description_en, pricing_type, base_price, price_config, fallback_icon, sort_order)
SELECT c.id, v.slug, v.name_ar, v.name_en, v.desc_ar, v.desc_en, v.ptype, v.base, v.cfg::jsonb, v.icon, v.sort
FROM (VALUES
  ('quick_home', 'تنظيف دوري سريع للمنازل', 'Quick Home Cleaning',
   'حجز في 5 ثوانٍ: عدد العمال، الجنس، وعدد الساعات وتوليد السعر.',
   'Book in 5 seconds: workers, gender, hours — instant price.',
   'quick', 0, '{"per_worker":45,"per_hour":25,"min_hours":2,"min_workers":1,"max_workers":6}', 'Zap', 1),
  ('deep_home', 'تنظيف عميق للمنازل', 'Deep Home Cleaning',
   '3 أنظمة تسعير: رؤية AI، استبيان تفصيلي، أو وصف صوتي/نصي.',
   'Three pricing systems: AI Vision, detailed survey, or voice/text description.',
   'deep_home', 0, '{"ai_vision":{"per_sqm":12,"min":250},"detailed":{"per_sqm":10,"min":200,"room_addons":{"kitchen":80,"bathroom":60,"balcony":40},"furniture":{"Sofa":{"per_seat":40},"Carpet":{"per_sqm":15},"Curtains":{"per_meter":25},"Mattresses":{"per_unit":50}}},"voice_text":{"per_sqm":11,"min":220}}', 'Sparkles', 2),
  ('periodic_corp', 'تنظيف دوري للشركات والمكاتب', 'Periodic Corporate Cleaning',
   'عقود دورية للشركات والمكاتب بأسعار ثابتة قابلة للتعديل.',
   'Periodic contracts for offices and companies.',
   'periodic_corp', 0, '{"per_sqm":8,"min":500,"frequency_discount":{"weekly":1,"biweekly":0.95,"monthly":0.9}}', 'Building2', 3),
  ('deep_corp', 'تنظيف عميق للشركات والمكاتب', 'Deep Corporate Cleaning',
   'تنظيف شامل للمكاتب والشركات بعد الساعات أو نهاية الأسبوع.',
   'Comprehensive deep cleaning for offices after hours/weekends.',
   'deep_corp', 0, '{"per_sqm":15,"min":800,"after_hours_multiplier":1.2}', 'Building2', 4),
  ('factory', 'تنظيف المصانع وسكنات العمال', 'Factory & Labor Camp Cleaning',
   'تنظيف صناعي للمصانع وسكنات العمال وفق معايير الصحة والسلامة.',
   'Industrial cleaning for factories and labor accommodations.',
   'factory', 0, '{"per_sqm":18,"min":1200,"safety_surcharge":200}', 'Factory', 5)
) AS v(slug, name_ar, name_en, desc_ar, desc_en, ptype, base, cfg, icon, sort)
JOIN categories c ON c.slug = 'cleaning'
ON CONFLICT (category_id, slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  pricing_type = EXCLUDED.pricing_type, price_config = EXCLUDED.price_config,
  fallback_icon = EXCLUDED.fallback_icon, sort_order = EXCLUDED.sort_order;

-- ===================== maintenance services (6 subcategories) =====================
INSERT INTO services (category_id, slug, name_ar, name_en, description_ar, description_en, pricing_type, base_price, inspection_fee, price_config, fallback_icon, sort_order)
SELECT c.id, v.slug, v.name_ar, v.name_en, v.desc_ar, v.desc_en, v.ptype, v.base, v.inspect, v.cfg::jsonb, v.icon, v.sort
FROM (VALUES
  ('ac', 'التكييف', 'Air Conditioning',
   'صيانة دورية ومشاكل معقدة للتكييف. فحص مبدئي 50 درهم للخدمات المعقدة.',
   'AC periodic and complex issues. 50 AED inspection fee for complex jobs.',
   'periodic', 120, 50, '{"periodic":{"ac_clean_unit":120,"ac_clean_multi":250,"ac_gas_refill":180},"complex_inspection_fee":50}', 'Wind', 1),
  ('plumbing', 'السباكة', 'Plumbing',
   'صيانة دورية ومشاكل معقدة للسباكة. فحص مبدئي 50 درهم.',
   'Plumbing periodic and complex issues. 50 AED inspection fee.',
   'periodic', 100, 50, '{"periodic":{"tap_fix":100,"drain_clean":150,"water_heater_check":200},"complex_inspection_fee":50}', 'Droplets', 2),
  ('electrical', 'الكهرباء', 'Electrical',
   'صيانة دورية ومشاكل معقدة للكهرباء. فحص مبدئي 50 درهم.',
   'Electrical periodic and complex issues. 50 AED inspection fee.',
   'periodic', 150, 50, '{"periodic":{"socket_fix":100,"panel_check":250,"light_install":120},"complex_inspection_fee":50}', 'Zap', 3),
  ('painting', 'الطلاء', 'Painting',
   'أعمال الطلاء الدورية والتجديد. فحص مبدئي 50 درهم للمشاكل المعقدة.',
   'Painting and renewal. 50 AED inspection fee for complex jobs.',
   'periodic', 200, 50, '{"periodic":{"per_sqm":15,"room_small":350,"room_large":600},"complex_inspection_fee":50}', 'PaintRoller', 4),
  ('insulation', 'العزل', 'Insulation',
   'عزل مائي وحراري وصوتي. فحص مبدئي 50 درهم.',
   'Water, thermal, and acoustic insulation. 50 AED inspection fee.',
   'periodic', 300, 50, '{"periodic":{"roof_per_sqm":45,"wall_per_sqm":35},"complex_inspection_fee":50}', 'Shield', 5),
  ('gardens', 'الحدائق', 'Gardens',
   'صيانة الحدائق والري والتنسيق. فحص مبدئي 50 درهم للمشاكل المعقدة.',
   'Garden maintenance, irrigation, landscaping. 50 AED inspection fee.',
   'periodic', 180, 50, '{"periodic":{"lawn_per_sqm":8,"irrigation_check":150,"tree_trim":120},"complex_inspection_fee":50}', 'Trees', 6)
) AS v(slug, name_ar, name_en, desc_ar, desc_en, ptype, base, inspect, cfg, icon, sort)
JOIN categories c ON c.slug = 'maintenance'
ON CONFLICT (category_id, slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  pricing_type = EXCLUDED.pricing_type, base_price = EXCLUDED.base_price,
  inspection_fee = EXCLUDED.inspection_fee, price_config = EXCLUDED.price_config,
  fallback_icon = EXCLUDED.fallback_icon, sort_order = EXCLUDED.sort_order;

-- ===================== car services (2) =====================
INSERT INTO services (category_id, slug, name_ar, name_en, description_ar, description_en, pricing_type, base_price, price_config, fallback_icon, sort_order)
SELECT c.id, v.slug, v.name_ar, v.name_en, v.desc_ar, v.desc_en, v.ptype, v.base, v.cfg::jsonb, v.icon, v.sort
FROM (VALUES
  ('car_wash', 'غسيل السيارات', 'Car Wash',
   'غسيل دوري أو عميق يشمل المقاعد وتنظيف المحرك بالبخار. فلترة حسب نوع السيارة.',
   'Periodic or deep wash including seats and steam engine cleaning. Filter by vehicle type.',
   'car_wash', 35, '{"vehicle_types":[{"key":"sedan","name_ar":"صالون","base":35},{"key":"station","name_ar":"إستيشن","base":45},{"key":"pickup","name_ar":"بيكب","base":50},{"key":"motorcycle","name_ar":"دراجة نارية","base":25}],"periodic":{"multiplier":1},"deep":{"multiplier":2.5,"addons":{"seats":60,"engine_steam":80,"underbody":40}},"engine_cc_note":"حجم المحرك بالـ CC والسلندر يُحسب للخدمات العميقة"}', 'Car', 1),
  ('oil_change', 'تبديل الزيوت والفلاتر', 'Oil & Filter Change',
   'اختيار نوع الزيت، حجمه، الشركة، والفلتر وتوليد السعر قبل الحجز.',
   'Choose oil type, size, brand, and filter — price generated before booking.',
   'oil_change', 0, '{"oil_brands":[{"key":"mobiloil","name_ar":"موبيل","price_per_liter":45},{"key":"castrol","name_ar":"كاسترول","price_per_liter":42},{"key":"shell","name_ar":"شل","price_per_liter":40},{"key":"total","name_ar":"توتال","price_per_liter":38}],"oil_sizes":[{"key":"4l","name_ar":"4 لتر","liters":4},{"key":"5l","name_ar":"5 لتر","liters":5},{"key":"1l_extra","name_ar":"لتر إضافي","liters":1}],"oil_types":[{"key":"synthetic","name_ar":"صناعي كامل","multiplier":1.3},{"key":"semi_synthetic","name_ar":"نصف صناعي","multiplier":1.1},{"key":"mineral","name_ar":"معدني","multiplier":1}],"filter_options":[{"key":"basic","name_ar":"فلتر أساسي","price":35},{"key":"premium","name_ar":"فلتر ممتاز","price":65}],"labor_fee":30}', 'Droplet', 2)
) AS v(slug, name_ar, name_en, desc_ar, desc_en, ptype, base, cfg, icon, sort)
JOIN categories c ON c.slug = 'cars'
ON CONFLICT (category_id, slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
  pricing_type = EXCLUDED.pricing_type, price_config = EXCLUDED.price_config,
  fallback_icon = EXCLUDED.fallback_icon, sort_order = EXCLUDED.sort_order;

-- ===================== helpers (1) =====================
INSERT INTO services (category_id, slug, name_ar, name_en, description_ar, description_en, pricing_type, base_price, price_config, fallback_icon, sort_order)
SELECT c.id, v.slug, v.name_ar, v.name_en, v.desc_ar, v.desc_en, v.ptype, v.base, v.cfg::jsonb, v.icon, v.sort
FROM (VALUES
  ('domestic_helper', 'استبيان توظيف عاملة منزلية', 'Domestic Helper Recruitment',
   'استبيان تفاعلي (العمر، الجنسية، الخبرة، المهارات) يتحول إلى طلب قابل للطباعة لمكاتب الاستقدام.',
   'Interactive survey (age, nationality, experience, skills) becomes a printable request for recruitment offices.',
   'helper', 0, '{}', 'HeartHandshake', 1)
) AS v(slug, name_ar, name_en, desc_ar, desc_en, ptype, base, cfg, icon, sort)
JOIN categories c ON c.slug = 'helpers'
ON CONFLICT (category_id, slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en;

-- ===================== coming soon (2) =====================
INSERT INTO services (category_id, slug, name_ar, name_en, description_ar, description_en, pricing_type, base_price, price_config, fallback_icon, sort_order)
SELECT c.id, v.slug, v.name_ar, v.name_en, v.desc_ar, v.desc_en, v.ptype, v.base, v.cfg::jsonb, v.icon, v.sort
FROM (VALUES
  ('basics_subscription', 'الخبز والماء والغاز بنظام الاشتراكات', 'Bread, Water & Gas Subscriptions',
   'قريباً: اشتراكات دورية لتوصيل الخبز والماء والغاز إلى باب منزلك.',
   'Coming soon: recurring subscriptions for bread, water, and gas delivery.',
   'waitlist', 0, '{}', 'Wheat', 1),
  ('recycling', 'إعادة التدوير - رؤية تجديد البيئية', 'Recycling - Tajdeed Environmental Vision',
   'قريباً: خدمة إعادة التدوير كجزء من رؤية تجديد البيئية المستدامة.',
   'Coming soon: recycling service as part of Tajdeed sustainable vision.',
   'waitlist', 0, '{}', 'Recycle', 1)
) AS v(slug, name_ar, name_en, desc_ar, desc_en, ptype, base, cfg, icon, sort)
JOIN categories c ON c.slug IN ('coming_soon_basics','coming_soon_recycle')
ON CONFLICT (category_id, slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en;
