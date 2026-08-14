import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, formatAed } from '@/components/ui';
import { ServiceImage } from '@/components/ServiceImage';
import { PriceCard } from '@/components/BookingModal';
import { BookingModal } from '@/components/BookingModal';
import {
  priceQuick, priceDeepDetailed, priceDeepAiVision, priceDeepVoiceText,
  pricePeriodicCorp, priceDeepCorp, priceFactory, type PriceBreakdown,
} from '@/lib/pricing';
import type { Service, Category } from '@/types';

export function CleaningBooking({ service, category, onClose }: { service: Service; category: Category | null; onClose: () => void }) {
  const { lang, dir } = useLang();
  const cfg = service.price_config;
  const [booking, setBooking] = useState<null | { breakdown: PriceBreakdown; details: Record<string, any>; summary: string }>(null);

  return (
    <div dir={dir} className="space-y-5">
      <Header service={service} onBack={onClose} />

      {service.slug === 'quick_home' && (
        <QuickClean cfg={cfg} lang={lang} onConfirm={setBooking} />
      )}
      {service.slug === 'deep_home' && (
        <DeepClean cfg={cfg} lang={lang} onConfirm={setBooking} />
      )}
      {service.slug === 'periodic_corp' && (
        <PeriodicCorp cfg={cfg} lang={lang} onConfirm={setBooking} />
      )}
      {service.slug === 'deep_corp' && (
        <DeepCorp cfg={cfg} lang={lang} onConfirm={setBooking} />
      )}
      {service.slug === 'factory' && (
        <FactoryClean cfg={cfg} lang={lang} onConfirm={setBooking} />
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

function Header({ service, onBack }: { service: Service; onBack: () => void }) {
  const { lang } = useLang();
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
        <Icon name="ArrowRight" className="h-5 w-5 rtl:rotate-180" />
      </button>
      <ServiceImage imageUrl={service.image_url} fallbackIcon={service.fallback_icon} bg="bg-emerald-50" text="text-emerald-600" size="sm" rounded="rounded-xl" />
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">{lang === 'ar' ? service.name_ar : service.name_en}</h1>
        <p className="text-xs text-slate-500">{lang === 'ar' ? service.description_ar : service.description_en}</p>
      </div>
    </div>
  );
}

// ===================== Quick Clean =====================
function QuickClean({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [workers, setWorkers] = useState(1);
  const [hours, setHours] = useState(2);
  const [gender, setGender] = useState<'any'|'male'|'female'>('any');
  const breakdown = priceQuick(cfg, workers, hours);
  const genders: [string, string][] = [['any', t('clean.gender.any', lang)], ['male', t('clean.gender.male', lang)], ['female', t('clean.gender.female', lang)]];

  return (
    <div className="space-y-4">
      <Stepper label={t('clean.workers', lang)} value={workers} min={cfg.min_workers ?? 1} max={cfg.max_workers ?? 6} onChange={setWorkers} />
      <Stepper label={t('clean.hours', lang)} value={hours} min={cfg.min_hours ?? 2} max={12} onChange={setHours} />
      <div>
        <label className="tj-label">{t('clean.gender', lang)}</label>
        <div className="flex gap-2">
          {genders.map(([k, label]) => (
            <button key={k} onClick={() => setGender(k as any)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${gender === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { workers, hours, gender }, summary: `تنظيف سريع - ${workers} عامل، ${hours} ساعة` })}>
          {t('booking.book', lang)}
        </Button>
      </PriceCard>
    </div>
  );
}

// ===================== Deep Clean (3 systems) =====================
function DeepClean({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [system, setSystem] = useState<'ai_vision'|'detailed'|'voice_text'>('detailed');
  const systems: [string, string, string, string][] = [
    ['ai_vision', t('clean.system.aiVision', lang), t('clean.system.aiVision.desc', lang), 'Camera'],
    ['detailed', t('clean.system.detailed', lang), t('clean.system.detailed.desc', lang), 'ClipboardList'],
    ['voice_text', t('clean.system.voiceText', lang), t('clean.system.voiceText.desc', lang), 'Mic'],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {systems.map(([k, label, desc, icon]) => (
          <button key={k} onClick={() => setSystem(k as any)}
            className={`rounded-2xl border p-4 text-start transition ${system === k ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${system === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Icon name={icon} className="h-4 w-4" />
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900">{label}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{desc}</p>
          </button>
        ))}
      </div>

      {system === 'ai_vision' && <AiVisionSystem cfg={cfg} lang={lang} onConfirm={onConfirm} />}
      {system === 'detailed' && <DetailedSystem cfg={cfg} lang={lang} onConfirm={onConfirm} />}
      {system === 'voice_text' && <VoiceTextSystem cfg={cfg} lang={lang} onConfirm={onConfirm} />}
    </div>
  );
}

function AiVisionSystem({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [estSqm, setEstSqm] = useState<number | null>(null);
  const breakdown = estSqm ? priceDeepAiVision(cfg, estSqm) : null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setUploaded(true);
      setAnalyzing(true);
      setEstSqm(null);
      setTimeout(() => {
        const fake = Math.floor(Math.random() * 80) + 80;
        setEstSqm(fake);
        setAnalyzing(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer transition hover:border-emerald-400">
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <Icon name={uploaded ? 'CheckCircle2' : 'Upload'} className="h-6 w-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">{uploaded ? (lang === 'ar' ? 'تم رفع الصورة' : 'Photo uploaded') : t('clean.upload', lang)}</p>
        <p className="text-xs text-slate-400">{lang === 'ar' ? 'ارفع صور المنشأة ليحللها الـ AI' : 'Upload property photos for AI analysis'}</p>
      </label>
      {analyzing && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
          <Icon name="Bot" className="h-4 w-4 animate-pulse" />
          {t('clean.analyzing', lang)}
        </div>
      )}
      {estSqm && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-emerald-700">{estSqm} {t('clean.estimated', lang)}</p>
        </div>
      )}
      {breakdown && (
        <PriceCard breakdown={breakdown}>
          <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { system: 'ai_vision', est_sqm: estSqm }, summary: `تنظيف عميق (رؤية AI) - ${estSqm} م² تقديري` })}>
            {t('booking.book', lang)}
          </Button>
        </PriceCard>
      )}
    </div>
  );
}

function DetailedSystem({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [sqm, setSqm] = useState(100);
  const [rooms, setRooms] = useState<string[]>([]);
  const [furniture, setFurniture] = useState<Record<string, number>>({ Sofa: 0, Carpet: 0, Curtains: 0, Mattresses: 0 });
  const roomOpts: [string, string][] = [['kitchen', lang === 'ar' ? 'مطبخ' : 'Kitchen'], ['bathroom', lang === 'ar' ? 'حمام' : 'Bathroom'], ['balcony', lang === 'ar' ? 'شرفة' : 'Balcony']];
  const furnLabels: Record<string, string> = { Sofa: t('clean.furniture', lang) + ' - ' + (lang === 'ar' ? 'كنب' : 'Sofa'), Carpet: lang === 'ar' ? 'سجاد' : 'Carpet', Curtains: lang === 'ar' ? 'ستائر' : 'Curtains', Mattresses: lang === 'ar' ? 'مراتب' : 'Mattresses' };
  const breakdown = priceDeepDetailed(cfg, sqm, rooms, furniture);

  const toggleRoom = (r: string) => setRooms((p) => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  return (
    <div className="space-y-4">
      <div>
        <label className="tj-label">{t('clean.area', lang)}: <span className="text-emerald-700 font-extrabold">{sqm} م²</span></label>
        <input type="range" min={50} max={500} step={10} value={sqm} onChange={(e) => setSqm(+e.target.value)} className="w-full accent-emerald-600" />
      </div>
      <div>
        <label className="tj-label">{t('clean.rooms', lang)}</label>
        <div className="flex flex-wrap gap-2">
          {roomOpts.map(([k, label]) => (
            <button key={k} onClick={() => toggleRoom(k)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${rooms.includes(k) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="tj-label">{t('clean.furniture', lang)}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(furniture).map((key) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="text-sm font-semibold text-slate-700">{furnLabels[key]}</span>
              <StepperInline value={furniture[key]} min={0} max={20} onChange={(v) => setFurniture((p) => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
      </div>
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { system: 'detailed', sqm, rooms, furniture }, summary: `تنظيف عميق (تفصيلي) - ${sqm} م²` })}>
          {t('booking.book', lang)}
        </Button>
      </PriceCard>
    </div>
  );
}

function VoiceTextSystem({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [estSqm, setEstSqm] = useState<number | null>(null);
  const breakdown = estSqm ? priceDeepVoiceText(cfg, estSqm) : null;

  const analyze = () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setEstSqm(null);
    setTimeout(() => {
      const fake = Math.floor(Math.random() * 80) + 80;
      setEstSqm(fake);
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setRecording((r) => !r)}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${recording ? 'bg-red-600 text-white tj-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
      >
        <Icon name="Mic" className="h-5 w-5" />
        {recording ? t('clean.recording', lang) : t('clean.record', lang)}
      </button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="tj-input min-h-[100px] resize-none" placeholder={t('clean.describe', lang)} />
      <Button variant="outline" className="w-full" onClick={analyze} disabled={!text.trim() || analyzing}>
        <Icon name="Bot" className="h-4 w-4" />
        {analyzing ? t('clean.analyzing', lang) : t('clean.analyze', lang)}
      </Button>
      {estSqm && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-sm font-bold text-emerald-700">{estSqm} {t('clean.estimated', lang)}</p>
        </div>
      )}
      {breakdown && (
        <PriceCard breakdown={breakdown}>
          <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { system: 'voice_text', est_sqm: estSqm, text }, summary: `تنظيف عميق (وصف) - ${estSqm} م² تقديري` })}>
            {t('booking.book', lang)}
          </Button>
        </PriceCard>
      )}
    </div>
  );
}

// ===================== Periodic / Deep Corporate / Factory =====================
function PeriodicCorp({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [sqm, setSqm] = useState(200);
  const [freq, setFreq] = useState<'weekly'|'biweekly'|'monthly'>('weekly');
  const freqs: [string, string][] = [['weekly', lang === 'ar' ? 'أسبوعي' : 'Weekly'], ['biweekly', lang === 'ar' ? 'كل أسبوعين' : 'Biweekly'], ['monthly', lang === 'ar' ? 'شهري' : 'Monthly']];
  const breakdown = pricePeriodicCorp(cfg, sqm, freq);
  return (
    <div className="space-y-4">
      <div>
        <label className="tj-label">{t('clean.area', lang)}: <span className="text-emerald-700 font-extrabold">{sqm} م²</span></label>
        <input type="range" min={100} max={2000} step={50} value={sqm} onChange={(e) => setSqm(+e.target.value)} className="w-full accent-emerald-600" />
      </div>
      <div>
        <label className="tj-label">{lang === 'ar' ? 'تكرار العقد' : 'Frequency'}</label>
        <div className="flex gap-2">
          {freqs.map(([k, label]) => (
            <button key={k} onClick={() => setFreq(k as any)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${freq === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</button>
          ))}
        </div>
      </div>
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { sqm, freq }, summary: `تنظيف شركات دوري - ${sqm} م² (${freq})` })}>{t('booking.book', lang)}</Button>
      </PriceCard>
    </div>
  );
}

function DeepCorp({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [sqm, setSqm] = useState(200);
  const [afterHours, setAfterHours] = useState(false);
  const breakdown = priceDeepCorp(cfg, sqm, afterHours);
  return (
    <div className="space-y-4">
      <div>
        <label className="tj-label">{t('clean.area', lang)}: <span className="text-emerald-700 font-extrabold">{sqm} م²</span></label>
        <input type="range" min={100} max={2000} step={50} value={sqm} onChange={(e) => setSqm(+e.target.value)} className="w-full accent-emerald-600" />
      </div>
      <Toggle label={lang === 'ar' ? 'بعد ساعات العمل / نهاية الأسبوع' : 'After hours / weekend'} on={afterHours} onToggle={() => setAfterHours((v) => !v)} />
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { sqm, after_hours: afterHours }, summary: `تنظيف شركات عميق - ${sqm} م²${afterHours ? ' (بعد الدوام)' : ''}` })}>{t('booking.book', lang)}</Button>
      </PriceCard>
    </div>
  );
}

function FactoryClean({ cfg, lang, onConfirm }: { cfg: any; lang: 'ar'|'en'; onConfirm: (b: any) => void }) {
  const [sqm, setSqm] = useState(500);
  const breakdown = priceFactory(cfg, sqm);
  return (
    <div className="space-y-4">
      <div>
        <label className="tj-label">{t('clean.area', lang)}: <span className="text-emerald-700 font-extrabold">{sqm} م²</span></label>
        <input type="range" min={200} max={5000} step={100} value={sqm} onChange={(e) => setSqm(+e.target.value)} className="w-full accent-emerald-600" />
      </div>
      <PriceCard breakdown={breakdown}>
        <Button className="mt-3 w-full" onClick={() => onConfirm({ breakdown, details: { sqm }, summary: `تنظيف مصنع - ${sqm} م²` })}>{t('booking.book', lang)}</Button>
      </PriceCard>
    </div>
  );
}

// ===================== shared =====================
function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="tj-label">{label}: <span className="text-emerald-700 font-extrabold">{value}</span></label>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-200">−</button>
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-emerald-600" />
        <button onClick={() => onChange(Math.min(max, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-200">+</button>
      </div>
    </div>
  );
}

function StepperInline({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">−</button>
      <span className="w-6 text-center text-sm font-bold">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">+</button>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-0.5' : 'start-5'}`} style={{ insetInlineStart: on ? '22px' : '2px' }} />
      </span>
    </button>
  );
}
