export type PriceBreakdown = {
  total: number;
  lines: { label: string; amount: number }[];
  estimatedMinutes?: number;
};

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