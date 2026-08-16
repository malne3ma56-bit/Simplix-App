import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';

export function AboutTajdeed({ onBack }: { onBack: () => void }) {
  const { lang, dir } = useLang();

  const pillars = [
    { icon: 'Sparkles', title_ar: 'جودة عالية', title_en: 'High Quality', desc_ar: 'مزودون مدققون وخدمات بمعايير صارمة', desc_en: 'Vetted providers with strict standards' },
    { icon: 'Zap', title_ar: 'تسعير ذكي', title_en: 'Smart Pricing', desc_ar: 'السعر يُولّد أمامك قبل الحجز بلا رسوم خفية', desc_en: 'Price generated before booking, no hidden fees' },
    { icon: 'Activity', title_ar: 'تتبع لحظي', title_en: 'Real-Time Tracking', desc_ar: 'تابع طلبك من الإنشاء حتى الاكتمال', desc_en: 'Track your order from creation to completion' },
    { icon: 'Bot', title_ar: 'مساعد ذكي', title_en: 'AI Copilot', desc_ar: 'إجابات فورية على استفساراتك في أي وقت', desc_en: 'Instant answers to your questions, anytime' },
    { icon: 'ShieldCheck', title_ar: 'شفافية وأمان', title_en: 'Transparency & Trust', desc_ar: 'نظام تقييم صارم ومراقبة مستمرة للجودة', desc_en: 'Strict ratings system with continuous quality control' },
    { icon: 'MapPin', title_ar: 'إماراتية', title_en: 'Emirati-Made', desc_ar: 'بنيت في الإمارات للإمارات', desc_en: 'Built in the UAE, for the UAE' },
  ];

  return (
    <div dir={dir} className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
        <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" />
        {t('common.back', lang)}
      </button>

      <div className="relative overflow-hidden rounded-3xl tj-grad-emerald p-8 text-white">
        <Icon name="Sparkles" className="absolute end-4 top-4 h-24 w-24 text-white/15" />
        <h1 className="text-3xl font-extrabold">{t('about.title', lang)}</h1>
        <p className="mt-2 text-lg font-bold text-white/90">{t('brand.name', lang)} — {t('brand.tagline', lang)}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="tj-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="Sparkles" className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{t('about.vision', lang)}</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{t('about.vision.text', lang)}</p>
        </div>
        <div className="tj-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="ThumbsUp" className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{t('about.mission', lang)}</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{t('about.mission.text', lang)}</p>
        </div>
      </div>

      <div>
        <h2 className="tj-section-title mb-3">{lang === 'ar' ? 'لماذا تجديد؟' : 'Why Tajdeed?'}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => (
            <div key={i} className="tj-card p-5 tj-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon name={p.icon} className="h-5 w-5" />
              </div>
              <p className="mt-3 font-bold text-slate-900">{lang === 'ar' ? p.title_ar : p.title_en}</p>
              <p className="mt-1 text-sm text-slate-500">{lang === 'ar' ? p.desc_ar : p.desc_en}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="tj-card flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon name="Phone" className="h-6 w-6" />
        </div>
        <p className="font-extrabold text-slate-900">{lang === 'ar' ? 'الدعم المباشر والشكاوى' : 'Direct Support & Complaints'}</p>
        <a href="tel:+971588095851" dir="ltr" className="text-2xl font-extrabold text-emerald-600 hover:underline">+971 58 809 5851</a>
        <p className="text-sm text-slate-500">{lang === 'ar' ? 'متاح للمشاكل المعقدة والتنسيق المباشر' : 'Available for complex issues and direct coordination'}</p>
      </div>
    </div>
  );
}
