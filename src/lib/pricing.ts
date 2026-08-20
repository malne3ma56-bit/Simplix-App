export type PriceBreakdown = {
  total: number;
  lines: { label: string; amount: number }[];
  estimatedMinutes?: number;
  inspectionFee?: number;
};

export type DynamicPriceResult = {
  total: number;
  baseAmount: number;
  surgeMultiplier: number;
  surgeInfo: { label: string; active: boolean };
};

export type FinancialSplit = {
  providerPayout: number;
  platformCommission: number;
  tax: number;
};

export function calculateDynamicPrice(baseAmount: number, hour: number = new Date().getHours()): DynamicPriceResult {
  const isPeak = hour >= 16 && hour < 20;
  const isNight = hour >= 22 || hour < 6;
  const surgeMultiplier = isPeak ? 1.25 : isNight ? 1.15 : 1.0;
  const label = isPeak ? 'Peak hours surcharge' : isNight ? 'Night service premium' : 'Standard rate';
  return {
    total: Math.round(baseAmount * surgeMultiplier * 100) / 100,
    baseAmount,
    surgeMultiplier,
    surgeInfo: { label, active: surgeMultiplier > 1.0 },
  };
}

export function computeFinancialSplit(amount: number, commissionRate: number = 0.15, taxRate: number = 0.05): FinancialSplit {
  const platformCommission = Math.round(amount * commissionRate * 100) / 100;
  const tax = Math.round(amount * taxRate * 100) / 100;
  const providerPayout = Math.round((amount - platformCommission - tax) * 100) / 100;
  return { providerPayout, platformCommission, tax };
}

const line = (label: string, amount: number) => ({ label, amount: Math.round(amount * 100) / 100 });

/**
 * 1. محرك تسعير النظافة (دقيقة العمل + مسافة GPS الخفية + بدل الزمن والتحرك)
 */
export function calculateCleaningPrice(
  baseRatePerMinute: number = 0.8,
  estimatedMinutes: number = 120,
  workersCount: number = 1,
  gpsDistanceKm: number = 0
): PriceBreakdown {
  // أ. تكلفة الجهد والوقت الأساسية
  const laborCost = baseRatePerMinute * estimatedMinutes * workersCount;

  // ب. رسوم التباعد المكاني (تُدمج بسلاسة إذا تجاوزت المسافة 5 كم)
  const distanceFee = gpsDistanceKm > 5 ? (gpsDistanceKm - 5) * 2.5 : 0;

  // ج. بدل الزمن الضائع والمخاطر التشغيلية للمزود
  const riskBuffer = gpsDistanceKm > 15 ? 15 : (gpsDistanceKm > 10 ? 10 : 5);

  const total = laborCost + distanceFee + riskBuffer;

  return {
    total: Math.round(total * 100) / 100,
    estimatedMinutes,
    lines: [
      line(`خدمة نظافة معيارية (${estimatedMinutes} دقيقة × ${workersCount} عمال)`, laborCost),
      ...(distanceFee > 0 ? [line('رسوم التغطية المكانية', distanceFee)] : []),
      line('رسوم التشغيل والتحرك السريع', riskBuffer),
    ],
  };
}

/**
 * 2. محرك تسعير الصيانة (سعر ثابت معيارى بالدقائق - بدون معاينة وهمية)
 */
export function calculateMaintenanceFixedPrice(
  serviceName: string,
  fixedBasePrice: number,
  includedMinutes: number = 45
): PriceBreakdown {
  return {
    total: fixedBasePrice,
    estimatedMinutes: includedMinutes,
    lines: [
      line(`${serviceName} (شامل الفحص وأول ${includedMinutes} دقيقة)`, fixedBasePrice),
    ],
  };
}

/**
 * 3. تسعير التعديل الفوري في الموقع (إذا اكتشف الفني عطلًا إضافياً غير مألوف)
 */
export type PromoResult = {
  valid: boolean;
  code: string;
  discountAmount: number;
  message: string;
};

const PROMO_CODES: Record<string, { type: 'percent' | 'fixed'; value: number; labelAr: string; labelEn: string }> = {
  TAJDEED10: { type: 'percent', value: 10, labelAr: 'خصم ترحيبي 10%', labelEn: 'Welcome 10% off' },
  WELCOME20: { type: 'percent', value: 20, labelAr: 'خصم newcomers 20%', labelEn: 'Newcomer 20% off' },
  FREESERVICE: { type: 'fixed', value: 25, labelAr: 'خصم ثابت 25 درهم', labelEn: 'Flat 25 AED off' },
  VIP30: { type: 'percent', value: 30, labelAr: 'خصم كبار الزوار 30%', labelEn: 'VIP 30% off' },
};

export function applyPromoCode(input: string, baseTotal: number): PromoResult {
  const code = input.trim().toUpperCase();
  const promo = PROMO_CODES[code];
  if (!promo) {
    return { valid: false, code, discountAmount: 0, message: 'Invalid code' };
  }
  const discountAmount =
    promo.type === 'percent'
      ? Math.round((baseTotal * promo.value) / 100 * 100) / 100
      : Math.min(promo.value, baseTotal);
  return { valid: true, code, discountAmount, message: promo.labelEn };
}

// ===================== Cleaning service pricing =====================

export function priceQuick(cfg: any, workers: number, hours: number): PriceBreakdown {
  const perWorker = cfg?.per_worker ?? 45;
  const perHour = cfg?.per_hour ?? 25;
  const labor = workers * perWorker + hours * perHour;
  const total = Math.max(labor, perWorker * (cfg?.min_workers ?? 1) + (cfg?.min_hours ?? 2) * perHour);
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`عمال (${workers}) × رسوم العامل`, workers * perWorker),
      line(`ساعات (${hours}) × رسوم الساعة`, hours * perHour),
    ],
  };
}

export function priceDeepAiVision(cfg: any, sqm: number): PriceBreakdown {
  const c = cfg?.ai_vision ?? { per_sqm: 12, min: 250 };
  const raw = sqm * (c.per_sqm ?? 12);
  const total = Math.max(raw, c.min ?? 250);
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`مساحة (${sqm} م²) × سعر المتر`, raw),
      ...(total > raw ? [line('حد أدنى للخدمة', total - raw)] : []),
    ],
  };
}

export function priceDeepDetailed(
  cfg: any,
  sqm: number,
  rooms: string[],
  furniture: Record<string, number>
): PriceBreakdown {
  const c = cfg?.detailed ?? { per_sqm: 10, min: 200 };
  const base = Math.max(sqm * (c.per_sqm ?? 10), c.min ?? 200);
  const roomAddons = c.room_addons ?? {};
  const furnConfig = c.furniture ?? {};
  const lines = [line(`مساحة (${sqm} م²) × سعر المتر`, base)];
  let extra = 0;
  for (const r of rooms) {
    const price = roomAddons[r] ?? 0;
    if (price > 0) { extra += price; lines.push(line(`غرفة إضافية: ${r}`, price)); }
  }
  for (const [key, qty] of Object.entries(furniture)) {
    const fc = furnConfig[key];
    if (!fc || qty <= 0) continue;
    const per = fc.per_seat ?? fc.per_sqm ?? fc.per_meter ?? fc.per_unit ?? 0;
    const price = per * qty;
    if (price > 0) { extra += price; lines.push(line(`${key} (${qty})`, price)); }
  }
  const total = base + extra;
  return { total: Math.round(total * 100) / 100, lines };
}

export function priceDeepVoiceText(cfg: any, sqm: number): PriceBreakdown {
  const c = cfg?.voice_text ?? { per_sqm: 11, min: 220 };
  const raw = sqm * (c.per_sqm ?? 11);
  const total = Math.max(raw, c.min ?? 220);
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`مساحة مقدرة (${sqm} م²) × سعر المتر`, raw),
      ...(total > raw ? [line('حد أدنى للخدمة', total - raw)] : []),
    ],
  };
}

export function pricePeriodicCorp(cfg: any, sqm: number, freq: 'weekly' | 'biweekly' | 'monthly'): PriceBreakdown {
  const perSqm = cfg?.per_sqm ?? 8;
  const min = cfg?.min ?? 500;
  const discountMap = cfg?.frequency_discount ?? { weekly: 1, biweekly: 0.95, monthly: 0.9 };
  const raw = Math.max(sqm * perSqm, min);
  const mult = discountMap[freq] ?? 1;
  const total = raw * mult;
  const freqLabel = freq === 'weekly' ? 'أسبوعي' : freq === 'biweekly' ? 'كل أسبوعين' : 'شهري';
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`مساحة (${sqm} م²) × سعر المتر`, raw),
      ...(mult < 1 ? [line(`خصم تكرار (${freqLabel})`, Math.round((raw - total) * 100) / 100)] : []),
    ],
  };
}

export function priceDeepCorp(cfg: any, sqm: number, afterHours: boolean): PriceBreakdown {
  const perSqm = cfg?.per_sqm ?? 15;
  const min = cfg?.min ?? 800;
  const mult = afterHours ? (cfg?.after_hours_multiplier ?? 1.2) : 1;
  const raw = Math.max(sqm * perSqm, min);
  const total = raw * mult;
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`مساحة (${sqm} م²) × سعر المتر`, raw),
      ...(afterHours ? [line('علاوة بعد الدوام', Math.round((total - raw) * 100) / 100)] : []),
    ],
  };
}

export function priceFactory(cfg: any, sqm: number): PriceBreakdown {
  const perSqm = cfg?.per_sqm ?? 18;
  const min = cfg?.min ?? 1200;
  const safety = cfg?.safety_surcharge ?? 200;
  const base = Math.max(sqm * perSqm, min);
  const total = base + safety;
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`مساحة (${sqm} م²) × سعر المتر`, base),
      line('رسوم السلامة الصناعية', safety),
    ],
  };
}

// ===================== Maintenance service pricing =====================

export function pricePeriodic(cfg: any, optionKey: string, qty: number = 1): PriceBreakdown {
  const price = cfg?.periodic?.[optionKey] ?? 0;
  const total = price * qty;
  return {
    total: Math.round(total * 100) / 100,
    lines: [line(`${optionKey} × ${qty}`, total)],
  };
}

export function priceComplex(inspectionFee: number): PriceBreakdown {
  return {
    total: inspectionFee,
    inspectionFee,
    lines: [line('فحص مبدئي للمشكلة المعقدة', inspectionFee)],
  };
}

// ===================== Car service pricing =====================

export function priceCarWash(cfg: any, vehicleKey: string, washMode: 'periodic' | 'deep', addons: string[]): PriceBreakdown {
  const vtypes = cfg?.vehicle_types ?? [];
  const vtype = vtypes.find((v: any) => v.key === vehicleKey) ?? vtypes[0];
  const base = vtype?.base ?? 35;
  const multiplier = washMode === 'deep' ? (cfg?.deep?.multiplier ?? 2.5) : (cfg?.periodic?.multiplier ?? 1);
  const washTotal = base * multiplier;
  const addonPrices = cfg?.deep?.addons ?? {};
  const lines = [line(`غسيل ${washMode === 'deep' ? 'عميق' : 'دوري'} (${vtype?.name_ar ?? vehicleKey})`, washTotal)];
  let addonTotal = 0;
  for (const a of addons) {
    const price = addonPrices[a] ?? 0;
    if (price > 0) { addonTotal += price; lines.push(line(`إضافة: ${a}`, price)); }
  }
  const total = washTotal + addonTotal;
  return { total: Math.round(total * 100) / 100, lines };
}

export function priceOilChange(cfg: any, brandKey: string, sizeKey: string, typeKey: string, filterKey: string): PriceBreakdown {
  const brands = cfg?.oil_brands ?? [];
  const sizes = cfg?.oil_sizes ?? [];
  const types = cfg?.oil_types ?? [];
  const filters = cfg?.filter_options ?? [];
  const brand = brands.find((b: any) => b.key === brandKey) ?? brands[0];
  const size = sizes.find((s: any) => s.key === sizeKey) ?? sizes[0];
  const type = types.find((tp: any) => tp.key === typeKey) ?? types[0];
  const filter = filters.find((f: any) => f.key === filterKey) ?? filters[0];
  const liters = size?.liters ?? 4;
  const perLiter = brand?.price_per_liter ?? 45;
  const typeMult = type?.multiplier ?? 1;
  const oilCost = liters * perLiter * typeMult;
  const filterPrice = filter?.price ?? 35;
  const labor = cfg?.labor_fee ?? 30;
  const total = oilCost + filterPrice + labor;
  return {
    total: Math.round(total * 100) / 100,
    lines: [
      line(`زيت (${liters}L × ${perLiter} × ${typeMult})`, oilCost),
      line(`فلتر (${filter?.name_ar ?? filterKey})`, filterPrice),
      line('رسوم العمالة', labor),
    ],
  };
}

export function calculateOnSiteAdjustmentPrice(
  extraMinutes: number,
  ratePerExtraMinute: number = 1.2,
  isDiscounted: boolean = true // خصم تشجيعي لتقليل الإلغاء
): PriceBreakdown {
  const rawCost = extraMinutes * ratePerExtraMinute;
  // تطبيق خصم تنافسي فوري بنسبة 15% لحماية وقت المزود وضمان رضا العميل
  const discountMultiplier = isDiscounted ? 0.85 : 1.0;
  const total = rawCost * discountMultiplier;

  return {
    total: Math.round(total * 100) / 100,
    estimatedMinutes: extraMinutes,
    lines: [
      line(`إصلاح إضافي فوري (${extraMinutes} دقيقة)`, Math.round(rawCost * 100) / 100),
      ...(isDiscounted ? [line('خصم إرضاء العميل السريع (15%)', -Math.round((rawCost - total) * 100) / 100)] : []),
    ],
  };
}