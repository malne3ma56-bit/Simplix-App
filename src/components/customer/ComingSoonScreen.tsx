import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colorOf } from './CustomerHome';
import type { Category, Service } from '@/types';

export function ComingSoonScreen({ category, services, onBack }: { category: Category; services: Service[]; onBack: () => void }) {
  const { lang, dir } = useLang();
  const { session, profile } = useAuth();
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!email) return;
    setLoading(true);
    await supabase.from('waitlist_entries').insert({
      customer_id: session?.user?.id ?? null,
      category_slug: category.slug,
      email, phone,
    });
    setLoading(false);
    setJoined(true);
  };

  const c = colorOf(category.color);

  return (
    <div dir={dir} className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
        <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" /> {t('common.back', lang)}
      </button>

      <div className={`relative overflow-hidden rounded-3xl ${c.bg} p-8 text-center`}>
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white ${c.text} shadow-md tj-pulse`}>
          <Icon name={category.icon} className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{lang === 'ar' ? category.name_ar : category.name_en}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{t('waitlist.comingSoon', lang)}</p>
      </div>

      {services.filter((s) => s.category_id === category.id).map((s) => (
        <div key={s.id} className="tj-card p-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
              <Icon name={s.fallback_icon} className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{lang === 'ar' ? s.name_ar : s.name_en}</p>
              <p className="mt-0.5 text-sm text-slate-500">{lang === 'ar' ? s.description_ar : s.description_en}</p>
            </div>
          </div>
        </div>
      ))}

      {joined ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="CheckCircle2" className="h-7 w-7" />
          </div>
          <p className="text-lg font-extrabold text-emerald-800">{t('waitlist.joined', lang)}</p>
          <p className="text-sm text-emerald-700">{t('waitlist.desc', lang)}</p>
        </div>
      ) : (
        <div className="tj-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Icon name="Bell" className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900">{t('waitlist.title', lang)}</h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">{t('waitlist.desc', lang)}</p>
          <div className="space-y-3">
            <div>
              <label className="tj-label">{t('auth.email', lang)}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="tj-input" dir="ltr" type="email" />
            </div>
            <div>
              <label className="tj-label">{t('auth.phone', lang)}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="tj-input" dir="ltr" placeholder="+9715X XXX XXXX" />
            </div>
            <Button className="w-full" size="lg" onClick={join} disabled={loading || !email}>
              {loading ? t('common.loading', lang) : t('waitlist.join', lang)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
