import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, Badge, formatAed } from '@/components/ui';
import { ServiceImage } from '@/components/ServiceImage';
import { PriceCard, BookingModal } from '@/components/BookingModal';
import { pricePeriodic, priceComplex, type PriceBreakdown } from '@/lib/pricing';
import type { Service, Category } from '@/types';

export function MaintenanceBooking({ service, category, onClose }: { service: Service; category: Category | null; onClose: () => void }) {
  const { lang, dir } = useLang();
  const cfg = service.price_config;
  const [mode, setMode] = useState<'periodic' | 'complex'>('periodic');
  const [booking, setBooking] = useState<null | { breakdown: PriceBreakdown; details: Record<string, any>; summary: string }>(null);

  const periodicOpts = cfg.periodic ? Object.keys(cfg.periodic).filter((k: string) => k !== 'complex_inspection_fee') : [];
  const optLabels: Record<string, string> = {
    ac_clean_unit: lang === 'ar' ? 'تنظيف وحدة تكييف' : 'AC unit cleaning',
    ac_clean_multi: lang === 'ar' ? 'تنظيف وحدات متعددة' : 'Multi-unit cleaning',
    ac_gas_refill: lang === 'ar' ? 'تعبئة غاز التكييف' : 'AC gas refill',
    tap_fix: lang === 'ar' ? 'إصلاح صنبور' : 'Tap repair',
    drain_clean: lang === 'ar' ? 'تنظيف بالوعة' : 'Drain cleaning',
    water_heater_check: lang === 'ar' ? 'فحص سخان' : 'Water heater check',
    socket_fix: lang === 'ar' ? 'إصلاح مقبس كهربائي' : 'Socket repair',
    panel_check: lang === 'ar' ? 'فحص لوحة كهربائية' : 'Panel check',
    light_install: lang === 'ar' ? 'تركيب إنارة' : 'Light installation',
    per_sqm: lang === 'ar' ? 'طلاء للمتر المربع' : 'Painting per sqm',
    room_small: lang === 'ar' ? 'طلاء غرفة صغيرة' : 'Small room painting',
    room_large: lang === 'ar' ? 'طلاء غرفة كبيرة' : 'Large room painting',
    roof_per_sqm: lang === 'ar' ? 'عزل سقف للمتر' : 'Roof insulation per sqm',
    wall_per_sqm: lang === 'ar' ? 'عزل جدار للمتر' : 'Wall insulation per sqm',
    lawn_per_sqm: lang === 'ar' ? 'صيانة عشب للمتر' : 'Lawn per sqm',
    irrigation_check: lang === 'ar' ? 'فحص نظام الري' : 'Irrigation check',
    tree_trim: lang === 'ar' ? 'تقليم أشجار' : 'Tree trimming',
  };

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <Icon name="ArrowRight" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <ServiceImage imageUrl={service.image_url} fallbackIcon={service.fallback_icon} bg="bg-sky-50" text="text-sky-600" size="sm" rounded="rounded-xl" />
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">{lang === 'ar' ? service.name_ar : service.name_en}</h1>
          <p className="text-xs text-slate-500">{lang === 'ar' ? service.description_ar : service.description_en}</p>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        <button onClick={() => setMode('periodic')} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === 'periodic' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
          {t('maint.periodic', lang)}
        </button>
        <button onClick={() => setMode('complex')} className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === 'complex' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>
          {t('maint.complex', lang)}
        </button>
      </div>

      {mode === 'periodic' ? (
        <PeriodicOptions opts={periodicOpts} cfg={cfg} labels={optLabels} lang={lang} onConfirm={setBooking} />
      ) : (
        <ComplexForm service={service} lang={lang} onConfirm={setBooking} />
      )}

      {booking && (
        <BookingModal
          open
          onClose={() => setBooking(null)}
          service={service}
          category={category}
          breakdown={booking.breakdown}
          details={booking.details}
          summaryAr={booking.summary}
        />
      )}
    </div>
  );
}

function PeriodicOptions({ opts, cfg, labels, lang, onConfirm }: { opts: string[]; cfg: any; labels: Record<string, string>; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const breakdown = selected ? pricePeriodic(cfg, selected, qty) : null;

  if (opts.length === 0) {
    return <div className="tj-card p-6 text-center text-sm text-slate-500">{lang === 'ar' ? 'لا توجد خدمات دورية محددة. يمكنك طلب فحص مشكلة معقدة.' : 'No periodic options. Request a complex inspection.'}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {opts.map((k) => (
          <button key={k} onClick={() => setSelected(k)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start transition ${selected === k ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <span className="text-sm font-bold text-slate-700">{labels[k] ?? k}</span>
            <span className="font-extrabold text-sky-700">{formatAed(cfg.periodic[k])}</span>
          </button>
        ))}
      </div>
      {selected && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-bold text-slate-700">{t('clean.qty', lang)}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600">−</button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(50, q + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600">+</button>
            </div>
          </div>
          {breakdown && (
            <PriceCard breakdown={breakdown}>
              <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { option: selected, qty }, summary: `صيانة دورية - ${labels[selected] ?? selected}${qty > 1 ? ` × ${qty}` : ''}` })}>
                {t('booking.book', lang)}
              </Button>
            </PriceCard>
          )}
        </>
      )}
    </div>
  );
}

function ComplexForm({ service, lang, onConfirm }: { service: Service; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [desc, setDesc] = useState('');
  const fee = service.inspection_fee ?? 50;
  const breakdown = priceComplex(fee);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
        <Icon name="Info" className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-800">{t('maint.inspectionFee', lang)}: {formatAed(fee)}</p>
          <p className="mt-0.5 text-xs text-amber-700">{t('maint.inspectionNote', lang)}</p>
        </div>
      </div>
      <div>
        <label className="tj-label">{lang === 'ar' ? 'صف المشكلة' : 'Describe the issue'}</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="tj-input min-h-[120px] resize-none" placeholder={lang === 'ar' ? 'اكتب تفاصيل المشكلة المعقدة...' : 'Describe the complex issue...'} />
      </div>
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { mode: 'complex', description: desc, inspection_fee: fee }, summary: `فحص مشكلة معقدة - ${lang === 'ar' ? service.name_ar : service.name_en}` })}>
          {t('booking.book', lang)}
        </Button>
      </PriceCard>
    </div>
  );
}
