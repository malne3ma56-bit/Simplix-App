import type { Service } from '@/types';

export type PriceBreakdown = {
  total: number;
  lines: { label: string; amount: number }[];
  inspectionFee?: number;
};

const line = (label: string, amount: number) => ({ label, amount: Math.round(amount * 100) / 100 });

// Quick home cleaning: workers x hours
export function priceQuick(cfg: any, workers: number, hours: number): PriceBreakdown {
  const perWorker = cfg.per_worker ?? 45;
  const perHour = cfg.per_hour ?? 25;
  const minHours = cfg.min_hours ?? 2;
  const minWorkers = cfg.min_workers ?? 1;
  const w = Math.max(minWorkers, workers);
  const h = Math.max(minHours, hours);
  const labor = w * perWorker + h * perHour;
  return {
    total: labor,
    lines: [
      line(`${w} عامل × ${perWorker} د.إ`, w * perWorker),
      line(`${h} ساعة × ${perHour} د.إ`, h * perHour),
    ],
  };
}

// Deep home cleaning - detailed survey
export function priceDeepDetailed(cfg: any, sqm: number, rooms: string[], furniture: Record<string, number>): PriceBreakdown {
  const d = cfg.detailed ?? cfg;
  const perSqm = d.per_sqm ?? 10;
  const min = d.min ?? 200;
  const roomAddons = d.room_addons ?? {};
  const furnCfg = d.furniture ?? {};
  const lines: { label: string; amount: number }[] = [];
  let total = sqm * perSqm;
  lines.push(line(`${sqm} م² × ${perSqm} د.إ`, sqm * perSqm));
  for (const r of rooms) {
    const cost = roomAddons[r] ?? 0;
    if (cost > 0) {
      total += cost;
      const labels: Record<string, string> = { kitchen: 'مطبخ', bathroom: 'حمام', balcony: 'شرفة' };
      lines.push(line(`إضافة ${labels[r] ?? r}`, cost));
    }
  }
  for (const [key, qty] of Object.entries(furniture)) {
    const f = furnCfg[key];
    if (!f || qty <= 0) continue;
    const perKey = Object.keys(f)[0];
    const per = f[perKey] ?? 0;
    const amt = per * qty;
    total += amt;
    const labels: Record<string, string> = { Sofa: 'كنب', Carpet: 'سجاد', Curtains: 'ستائر', Mattresses: 'مراتب' };
    const unitLabel = perKey === 'per_seat' ? 'مقعد' : perKey === 'per_sqm' ? 'م²' : perKey === 'per_meter' ? 'متر' : 'وحدة';
    lines.push(line(`${labels[key] ?? key} × ${qty} ${unitLabel}`, amt));
  }
  if (total < min) {
    lines.push(line('حد أدنى للطلب', min - total));
    total = min;
  }
  return { total, lines };
}

// Deep home cleaning - AI Vision estimate (from uploaded image analysis)
export function priceDeepAiVision(cfg: any, estimatedSqm: number): PriceBreakdown {
  const v = cfg.ai_vision ?? cfg;
  const perSqm = v.per_sqm ?? 12;
  const min = v.min ?? 250;
  const total = Math.max(min, estimatedSqm * perSqm);
  return {
    total,
    lines: [line(`تحليل صورة: ${estimatedSqm} م² تقديري`, total)],
  };
}

// Deep home cleaning - voice/text description parse
export function priceDeepVoiceText(cfg: any, estimatedSqm: number): PriceBreakdown {
  const v = cfg.voice_text ?? cfg;
  const perSqm = v.per_sqm ?? 11;
  const min = v.min ?? 220;
  const total = Math.max(min, estimatedSqm * perSqm);
  return {
    total,
    lines: [line(`تحليل الوصف: ${estimatedSqm} م² تقديري`, total)],
  };
}

// Periodic corporate cleaning
export function pricePeriodicCorp(cfg: any, sqm: number, frequency: 'weekly' | 'biweekly' | 'monthly'): PriceBreakdown {
  const perSqm = cfg.per_sqm ?? 8;
  const min = cfg.min ?? 500;
  const disc = (cfg.frequency_discount ?? {})[frequency] ?? 1;
  const base = Math.max(min, sqm * perSqm);
  const total = base * disc;
  const freqLabel: Record<string, string> = { weekly: 'أسبوعي', biweekly: 'كل أسبوعين', monthly: 'شهري' };
  return {
    total,
    lines: [
      line(`${sqm} م² × ${perSqm} د.إ`, sqm * perSqm),
      ...(disc < 1 ? [line(`خصم تكرار (${freqLabel[frequency]})`, base * (disc - 1))] : []),
    ],
  };
}

// Deep corporate
export function priceDeepCorp(cfg: any, sqm: number, afterHours: boolean): PriceBreakdown {
  const perSqm = cfg.per_sqm ?? 15;
  const min = cfg.min ?? 800;
  const mult = afterHours ? (cfg.after_hours_multiplier ?? 1.2) : 1;
  const base = Math.max(min, sqm * perSqm);
  const total = base * mult;
  return {
    total,
    lines: [
      line(`${sqm} م² × ${perSqm} د.إ`, sqm * perSqm),
      ...(afterHours ? [line('زيادة بعد الدوام', base * (mult - 1))] : []),
    ],
  };
}

// Factory
export function priceFactory(cfg: any, sqm: number): PriceBreakdown {
  const perSqm = cfg.per_sqm ?? 18;
  const min = cfg.min ?? 1200;
  const safety = cfg.safety_surcharge ?? 200;
  const base = Math.max(min, sqm * perSqm);
  return {
    total: base + safety,
    lines: [line(`${sqm} م² × ${perSqm} د.إ`, sqm * perSqm), line('رسوم الصحة والسلامة', safety)],
  };
}

// Maintenance periodic (fixed option pricing)
export function pricePeriodic(cfg: any, optionKey: string, qty = 1): PriceBreakdown {
  const opts = cfg.periodic ?? {};
  const labels: Record<string, string> = {
    ac_clean_unit: 'تنظيف وحدة تكييف', ac_clean_multi: 'تنظيف وحدات متعددة', ac_gas_refill: 'تعبئة غاز التكييف',
    tap_fix: 'إصلاح صنبور', drain_clean: 'تنظيف بالوعة', water_heater_check: 'فحص سخان',
    socket_fix: 'إصلاح مقبس', panel_check: 'فحص لوحة كهربائية', light_install: 'تركيب إنارة',
    per_sqm: 'طلاء للمتر', room_small: 'طلاء غرفة صغيرة', room_large: 'طلاء غرفة كبيرة',
    roof_per_sqm: 'عزل سقف للمتر', wall_per_sqm: 'عزل جدار للمتر',
    lawn_per_sqm: 'صيانة عشب للمتر', irrigation_check: 'فحص الري', tree_trim: 'تقليم شجر',
  };
  const unit = opts[optionKey] ?? 0;
  const total = unit * qty;
  return { total, lines: [line(`${labels[optionKey] ?? optionKey}${qty > 1 ? ` × ${qty}` : ''}`, total)] };
}

// Complex maintenance - inspection fee only at booking; full price quoted on site
export function priceComplex(inspectionFee: number): PriceBreakdown {
  return { total: inspectionFee, inspectionFee, lines: [line('رسوم الفحص المبدئي (تخصم من الإجمالي عند التنفيذ)', inspectionFee)] };
}

// Car wash
export function priceCarWash(cfg: any, vehicleKey: string, mode: 'periodic' | 'deep', addons: string[]): PriceBreakdown {
  const vtypes = cfg.vehicle_types ?? [];
  const v = vtypes.find((x: any) => x.key === vehicleKey) ?? vtypes[0];
  const base = v?.base ?? 35;
  const modeCfg = cfg[mode] ?? { multiplier: 1 };
  const mult = modeCfg.multiplier ?? 1;
  const addonCfg = modeCfg.addons ?? {};
  const addonLabels: Record<string, string> = { seats: 'تنظيف المقاعد', engine_steam: 'تنظيف المحرك بالبخار', underbody: 'تنظيف الهيكل السفلي' };
  let total = base * mult;
  const lines = [line(`غسيل ${v?.name_ar ?? ''} (${mode === 'deep' ? 'عميق' : 'دوري'})`, total)];
  for (const a of addons) {
    const cost = addonCfg[a] ?? 0;
    total += cost;
    lines.push(line(addonLabels[a] ?? a, cost));
  }
  return { total, lines };
}

// Oil change
export function priceOilChange(cfg: any, brandKey: string, sizeKey: string, typeKey: string, filterKey: string): PriceBreakdown {
  const brand = (cfg.oil_brands ?? []).find((b: any) => b.key === brandKey);
  const size = (cfg.oil_sizes ?? []).find((s: any) => s.key === sizeKey);
  const type = (cfg.oil_types ?? []).find((t: any) => t.key === typeKey);
  const filter = (cfg.filter_options ?? []).find((f: any) => f.key === filterKey);
  const perL = brand?.price_per_liter ?? 40;
  const liters = size?.liters ?? 4;
  const mult = type?.multiplier ?? 1;
  const filterPrice = filter?.price ?? 35;
  const labor = cfg.labor_fee ?? 30;
  const oil = perL * liters * mult;
  const total = oil + filterPrice + labor;
  return {
    total,
    lines: [
      line(`${brand?.name_ar ?? ''} ${type?.name_ar ?? ''} (${liters} لتر)`, oil),
      line(`${filter?.name_ar ?? ''}`, filterPrice),
      line('أجرة العمالة', labor),
    ],
  };
}

// Dispatch helper
export function describePricingType(s: Service): string {
  const map: Record<string, string> = {
    quick: 'تسعير فوري',
    deep_home: 'تنظيف عميق - 3 أنظمة تسعير',
    periodic: 'تسعير ثابت + فحص معقد',
    car_wash: 'حسب نوع السيارة',
    oil_change: 'تسعير حسب الاختيار',
    helper: 'تحويل لمكاتب الاستقدام',
    waitlist: 'قريباً',
  };
  return map[s.pricing_type] ?? 'تسعير حسب الطلب';
}

// ===================== Smart Pricing Engine =====================

export type SurgeInfo = {
  multiplier: number;
  isPeak: boolean;
  isWeekend: boolean;
  label: string;
};

/**
 * Determine whether the current time falls within peak hours (17:00–22:00 local)
 * or is a weekend (Friday/Saturday in UAE week).
 */
export function getSurgeInfo(date: Date = new Date()): SurgeInfo {
  const hour = date.getHours();
  const day = date.getDay(); // 0=Sun, 5=Fri, 6=Sat

  const isPeak = hour >= 17 && hour < 22;
  const isWeekend = day === 5 || day === 6;
  const multiplier = isPeak || isWeekend ? 1.25 : 1.0;

  let label = '';
  if (isPeak && isWeekend) label = 'Peak Hours · Weekend';
  else if (isPeak) label = 'Peak Hours';
  else if (isWeekend) label = 'Weekend';

  return { multiplier, isPeak, isWeekend, label };
}

/**
 * Calculate the dynamic price based on surge conditions.
 * Returns the surged total plus the surge multiplier applied.
 */
export function calculateDynamicPrice(basePrice: number, date: Date = new Date()): {
  total: number;
  surgeMultiplier: number;
  surgeInfo: SurgeInfo;
} {
  const surgeInfo = getSurgeInfo(date);
  const total = Math.round(basePrice * surgeInfo.multiplier * 100) / 100;
  return { total, surgeMultiplier: surgeInfo.multiplier, surgeInfo };
}

// ===================== Promo Code Engine =====================

export type PromoResult = {
  valid: boolean;
  discountAmount: number;
  finalTotal: number;
  message: string;
  code: string;
};

type PromoCode = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  label: string;
};

const PROMO_CODES: PromoCode[] = [
  { code: 'TAJDEED20', type: 'percent', value: 20, label: '20% off' },
  { code: 'WELCOME10', type: 'percent', value: 10, label: '10% off' },
  { code: 'TJD50', type: 'fixed', value: 50, label: '50 AED off' },
];

/**
 * Apply a promo code to an order total.
 * Returns the discount amount and the final total after discount.
 * The 85/15 split is always calculated from the final (post-discount) total
 * by the caller — this function only computes the discount.
 */
export function applyPromoCode(code: string, orderTotal: number): PromoResult {
  const normalized = code.trim().toUpperCase();
  const promo = PROMO_CODES.find((p) => p.code === normalized);

  if (!promo) {
    return {
      valid: false,
      discountAmount: 0,
      finalTotal: orderTotal,
      message: 'Invalid code',
      code: normalized,
    };
  }

  let discount = 0;
  if (promo.type === 'percent') {
    discount = Math.round(orderTotal * (promo.value / 100) * 100) / 100;
  } else {
    discount = Math.min(promo.value, orderTotal);
  }

  const finalTotal = Math.round((orderTotal - discount) * 100) / 100;

  return {
    valid: true,
    discountAmount: discount,
    finalTotal,
    message: `${promo.label} applied`,
    code: normalized,
  };
}

/**
 * Compute the financial split from a final (post-discount) total.
 * Platform Fee = commission rate (default 15%), Provider Earnings = remainder.
 * Pass `commissionRate` to override the default (e.g. custom B2B rate or 0 for subscription).
 */
export function computeFinancialSplit(
  finalTotal: number,
  commissionRate: number = 0.15,
): {
  platformFee: number;
  providerEarnings: number;
} {
  const rate = Math.max(0, Math.min(1, commissionRate));
  return {
    platformFee: Math.round(finalTotal * rate * 100) / 100,
    providerEarnings: Math.round(finalTotal * (1 - rate) * 100) / 100,
  };
}

/**
 * Resolve the active commission rate for a provider based on their financial settings.
 * Priority: subscription bypass (0%) > custom_commission_rate > default 15%.
 */
export function resolveCommissionRate(provider: {
  custom_commission_rate?: number | null;
  subscription_plan?: 'none' | 'monthly' | 'annual';
  is_subscription_active?: boolean;
}): { rate: number; source: 'subscription' | 'custom' | 'default' } {
  if (
    (provider.subscription_plan === 'monthly' || provider.subscription_plan === 'annual') &&
    provider.is_subscription_active === true
  ) {
    return { rate: 0, source: 'subscription' };
  }
  if (provider.custom_commission_rate !== null && provider.custom_commission_rate !== undefined) {
    return { rate: provider.custom_commission_rate, source: 'custom' };
  }
  return { rate: 0.15, source: 'default' };
}
