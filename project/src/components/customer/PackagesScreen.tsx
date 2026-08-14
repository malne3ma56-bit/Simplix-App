import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { SubscriptionPackages } from '@/components/customer/SubscriptionPackages';
import { useMarketingData } from '@/hooks/useMarketing';

export function PackagesScreen({ onBack }: { onBack: () => void }) {
  const { lang, dir } = useLang();
  const { packages, loading } = useMarketingData();

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <Icon name="ArrowRight" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-navy-900">{t('home.packages', lang)}</h1>
          <p className="text-sm text-slate-500">{t('home.packagesDesc', lang)}</p>
        </div>
      </div>

      {/* Hero strip */}
      <div className="rounded-2xl bg-navy-900 p-6 text-white tj-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-gold-400">
            <Icon name="Crown" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-extrabold">{lang === 'ar' ? 'وفّر أكثر مع باقاتنا' : 'Save more with our plans'}</p>
            <p className="text-sm text-white/60">{lang === 'ar' ? 'أسعار ثابتة، أولوية قصوى، خصومات حصرية' : 'Fixed pricing, priority booking, exclusive discounts'}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" />
        </div>
      ) : packages.length === 0 ? (
        <div className="tj-card p-12 text-center text-slate-500">
          <p className="font-bold">{t('admin.noPackages', lang)}</p>
        </div>
      ) : (
        <SubscriptionPackages packages={packages} />
      )}
    </div>
  );
}
