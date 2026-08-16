import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/types';

const NATIONALITIES = ['الفلبين', 'إندونيسيا', 'الهند', 'سريلانكا', 'إثيوبيا', 'كينيا', 'أوغندا', 'بنغلاديش'];
const SKILLS = ['تنظيف', 'طبخ', 'رعاية أطفال', 'رعاية مسنين', 'كي الملابس', 'حدائق', 'سائق', 'مربية أطفال'];

export function HelperQuestionnaire({ service, onClose }: { service: Service; onClose: () => void }) {
  const { lang, dir } = useLang();
  const { profile, session } = useAuth();
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(45);
  const [gender, setGender] = useState<'female'|'male'>('female');
  const [nationality, setNationality] = useState<string>('');
  const [experience, setExperience] = useState('2-5');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const toggleSkill = (s: string) => setSkills((p) => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const submit = async () => {
    if (!session?.user) return;
    setLoading(true);
    const printable = {
      customer_name: profile?.full_name,
      customer_phone: profile?.phone,
      customer_email: profile?.email,
      customer_address: profile?.address_text,
      date: new Date().toISOString(),
      requirements: { age_range: `${ageMin}-${ageMax}`, gender, nationality, experience, skills },
      service: lang === 'ar' ? service.name_ar : service.name_en,
    };
    const { data, error } = await supabase.from('helper_requests').insert({
      customer_id: session.user.id,
      age_min: ageMin, age_max: ageMax, gender, nationality, experience,
      skills, printable_payload: printable, status: 'new',
    }).select('id').single();
    setLoading(false);
    if (!error && data) {
      setRequestId(data.id);
      setDone(true);
    }
  };

  const print = () => {
    const payload = {
      customer_name: profile?.full_name, customer_phone: profile?.phone,
      customer_email: profile?.email, requirements: { age_range: `${ageMin}-${ageMax}`, gender, nationality, experience, skills },
      service: lang === 'ar' ? service.name_ar : service.name_en, date: new Date().toLocaleString('ar-AE'),
    };
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>طلب استقدام عاملة</title><style>
      body{font-family:Arial;padding:40px;color:#0f1722}
      h1{color:#059669;border-bottom:2px solid #10b981;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:8px 12px;border:1px solid #e2e8f0}
      td:first-child{font-weight:bold;background:#f1f5f9;width:35%}
    </style></head><body>
    <h1>طلب توظيف عاملة منزلية - تجديد</h1>
    <table>
      <tr><td>الاسم</td><td>${payload.customer_name ?? ''}</td></tr>
      <tr><td>الهاتف</td><td>${payload.customer_phone ?? ''}</td></tr>
      <tr><td>البريد</td><td>${payload.customer_email ?? ''}</td></tr>
      <tr><td>العمر المطلوب</td><td>${payload.requirements.age_range}</td></tr>
      <tr><td>الجنس</td><td>${payload.requirements.gender}</td></tr>
      <tr><td>الجنسية</td><td>${payload.requirements.nationality ?? '-'}</td></tr>
      <tr><td>الخبرة</td><td>${payload.requirements.experience}</td></tr>
      <tr><td>المهارات</td><td>${payload.requirements.skills.join('، ') || '-'}</td></tr>
      <tr><td>التاريخ</td><td>${payload.date}</td></tr>
    </table>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (done) {
    return (
      <div dir={dir} className="space-y-5">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
          <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" /> {t('common.back', lang)}
        </button>
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 tj-pulse">
            <Icon name="CheckCircle2" className="h-8 w-8" />
          </div>
          <p className="text-lg font-extrabold text-slate-900">{t('helper.success', lang)}</p>
          {requestId && <p className="text-xs text-slate-500" dir="ltr">#{requestId.slice(0, 8)}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={print}><Icon name="Printer" className="h-4 w-4" /> {t('helper.print', lang)}</Button>
            <Button variant="ghost" onClick={onClose}>{t('common.close', lang)}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <Icon name="ArrowRight" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <Icon name={service.fallback_icon} className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">{t('helper.title', lang)}</h1>
      </div>

      <div className="space-y-4 tj-card p-5">
        <div>
          <label className="tj-label">{t('helper.age', lang)}: <span className="text-emerald-700 font-extrabold">{ageMin} - {ageMax}</span></label>
          <div className="flex items-center gap-3">
            <input type="range" min={20} max={50} value={ageMin} onChange={(e) => setAgeMin(Math.min(+e.target.value, ageMax))} className="flex-1 accent-emerald-600" />
            <input type="range" min={20} max={60} value={ageMax} onChange={(e) => setAgeMax(Math.max(+e.target.value, ageMin))} className="flex-1 accent-emerald-600" />
          </div>
        </div>

        <div>
          <label className="tj-label">{t('helper.gender', lang)}</label>
          <div className="flex gap-2">
            {[['female', t('clean.gender.female', lang)], ['male', t('clean.gender.male', lang)]].map(([k, label]) => (
              <button key={k} onClick={() => setGender(k as any)} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${gender === k ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="tj-label">{t('helper.nationality', lang)}</label>
          <div className="flex flex-wrap gap-2">
            {NATIONALITIES.map((n) => (
              <button key={n} onClick={() => setNationality(n)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${nationality === n ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="tj-label">{t('helper.experience', lang)}</label>
          <div className="flex flex-wrap gap-2">
            {['0-2', '2-5', '5-10', '10+'].map((e) => (
              <button key={e} onClick={() => setExperience(e)} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${experience === e ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>{e} {lang === 'ar' ? 'سنوات' : 'yrs'}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="tj-label">{t('helper.skills', lang)}</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <button key={s} onClick={() => toggleSkill(s)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${skills.includes(s) ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}>{s}</button>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={submit} disabled={loading || !nationality}>
          {loading ? t('common.loading', lang) : t('helper.submit', lang)}
        </Button>
      </div>
    </div>
  );
}
