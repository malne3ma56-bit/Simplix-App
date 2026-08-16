import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { ServiceImage } from '@/components/ServiceImage';
import { PriceCard, BookingModal } from '@/components/BookingModal';
import { priceCarWash, priceOilChange, type PriceBreakdown } from '@/lib/pricing';
import type { Service, Category } from '@/types';

export function CarBooking({ service, category, onClose }: { service: Service; category: Category | null; onClose: () => void }) {
  const { lang, dir } = useLang();
  const [booking, setBooking] = useState<null | { breakdown: PriceBreakdown; details: Record<string, any>; summary: string }>(null);

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <Icon name="ArrowRight" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <ServiceImage imageUrl={service.image_url} fallbackIcon={service.fallback_icon} bg="bg-amber-50" text="text-amber-600" size="sm" rounded="rounded-xl" />
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">{lang === 'ar' ? service.name_ar : service.name_en}</h1>
          <p className="text-xs text-slate-500">{lang === 'ar' ? service.description_ar : service.description_en}</p>
        </div>
      </div>

      {service.slug === 'car_wash' && <CarWashForm service={service} lang={lang} onConfirm={setBooking} />}
      {service.slug === 'oil_change' && <OilChangeForm service={service} lang={lang} onConfirm={setBooking} />}

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

function CarWashForm({ service, lang, onConfirm }: { service: Service; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const cfg = service.price_config;
  const vtypes = cfg.vehicle_types ?? [];
  const [vehicle, setVehicle] = useState<string>(vtypes[0]?.key ?? 'sedan');
  const [washMode, setWashMode] = useState<'periodic'|'deep'>('periodic');
  const [addons, setAddons] = useState<string[]>([]);
  const [engineCc, setEngineCc] = useState('');
  const [cylinders, setCylinders] = useState('');
  const addonList = cfg.deep?.addons ? Object.keys(cfg.deep.addons) : ['seats','engine_steam','underbody'];
  const addonLabels: Record<string, string> = { seats: t('car.oil.filter', lang).includes('فلتر') ? 'تنظيف المقاعد' : 'Seats', engine_steam: 'تنظيف المحرك بالبخار', underbody: 'تنظيف الهيكل السفلي' };
  const breakdown = priceCarWash(cfg, vehicle, washMode, addons);

  const toggleAddon = (a: string) => setAddons((p) => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  return (
    <div className="space-y-4">
      <div>
        <label className="tj-label">{t('car.type', lang)}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {vtypes.map((v: any) => (
            <button key={v.key} onClick={() => setVehicle(v.key)}
              className={`rounded-xl border p-3 text-center transition ${vehicle === v.key ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              <Icon name="Car" className="mx-auto h-5 w-5 mb-1" />
              <p className="text-xs font-bold">{v.name_ar}</p>
              <p className="text-[10px] text-slate-400">{formatAed(v.base)}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="tj-label">{t('car.engine', lang)}</label>
        <div className="grid grid-cols-2 gap-2">
          <input value={engineCc} onChange={(e) => setEngineCc(e.target.value)} className="tj-input" placeholder="CC (مثال: 1600)" dir="ltr" />
          <input value={cylinders} onChange={(e) => setCylinders(e.target.value)} className="tj-input" placeholder={lang === 'ar' ? 'سلندر (مثال: 4)' : 'Cylinders'} dir="ltr" />
        </div>
      </div>

      <div>
        <label className="tj-label">{lang === 'ar' ? 'نوع الغسيل' : 'Wash type'}</label>
        <div className="flex gap-2">
          <button onClick={() => { setWashMode('periodic'); setAddons([]); }} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${washMode === 'periodic' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {t('car.wash.periodic', lang)}
          </button>
          <button onClick={() => setWashMode('deep')} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${washMode === 'deep' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {t('car.wash.deep', lang)}
          </button>
        </div>
      </div>

      {washMode === 'deep' && addonList.length > 0 && (
        <div>
          <label className="tj-label">{t('car.addons', lang)}</label>
          <div className="flex flex-wrap gap-2">
            {addonList.map((a: string) => (
              <button key={a} onClick={() => toggleAddon(a)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${addons.includes(a) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                {addonLabels[a] ?? a} <span className="text-[10px] text-slate-400">+{formatAed(cfg.deep.addons[a])}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { vehicle, washMode, addons, engine_cc: engineCc, cylinders }, summary: `غسيل سيارة ${washMode === 'deep' ? 'عميق' : 'دوري'} - ${vtypes.find((v:any)=>v.key===vehicle)?.name_ar ?? vehicle}` })}>
          {t('booking.book', lang)}
        </Button>
      </PriceCard>
    </div>
  );
}

function OilChangeForm({ service, lang, onConfirm }: { service: Service; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const cfg = service.price_config;
  const brands = cfg.oil_brands ?? [];
  const sizes = cfg.oil_sizes ?? [];
  const types = cfg.oil_types ?? [];
  const filters = cfg.filter_options ?? [];
  const [brand, setBrand] = useState<string>(brands[0]?.key ?? '');
  const [size, setSize] = useState<string>(sizes[0]?.key ?? '');
  const [type, setType] = useState<string>(types[0]?.key ?? '');
  const [filter, setFilter] = useState<string>(filters[0]?.key ?? '');
  const breakdown = priceOilChange(cfg, brand, size, type, filter);

  return (
    <div className="space-y-4">
      <Select label={t('car.oil.brand', lang)} value={brand} onChange={setBrand} options={brands.map((b:any)=>({ key: b.key, label: b.name_ar }))} />
      <Select label={t('car.oil.size', lang)} value={size} onChange={setSize} options={sizes.map((s:any)=>({ key: s.key, label: s.name_ar }))} />
      <Select label={t('car.oil.type', lang)} value={type} onChange={setType} options={types.map((tp:any)=>({ key: tp.key, label: tp.name_ar }))} />
      <Select label={t('car.oil.filter', lang)} value={filter} onChange={setFilter} options={filters.map((f:any)=>({ key: f.key, label: f.name_ar }))} />
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { brand, size, type, filter }, summary: `تبديل زيت - ${brands.find((b:any)=>b.key===brand)?.name_ar} ${types.find((tp:any)=>tp.key===type)?.name_ar}` })}>
          {t('booking.book', lang)}
        </Button>
      </PriceCard>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div>
      <label className="tj-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.key} onClick={() => onChange(o.key)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${value === o.key ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatAed(n: number): string { return `${Math.round(n * 100) / 100} د.إ`; }
