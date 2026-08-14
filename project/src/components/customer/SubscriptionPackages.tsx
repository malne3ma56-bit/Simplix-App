import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge, formatAed } from '@/components/ui';
import type { SubscriptionPackage } from '@/types';

const CYCLE_KEY: Record<string, string> = {
  monthly: 'home.perMonth',
  quarterly: 'home.perQuarter',
  yearly: 'home.perYear',
  one_time: 'home.oneTime',
};

export function SubscriptionPackages({ packages }: { packages: SubscriptionPackage[] }) {
  const { lang, dir } = useLang();

  if (packages.length === 0) return null;

  return (
    <div dir={dir}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="tj-section-title">{t('home.packages', lang)}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{t('home.packagesDesc', lang)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          const popular = pkg.is_popular;
          return (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl border p-6 tj-fade-up transition hover:shadow-md ${
                popular ? 'border-navy-900 bg-white shadow-md' : 'border-slate-100 bg-white'
              }`}
            >
              {popular && (
                <div className="absolute -top-3 start-6">
                  <Badge color="navy" className="shadow-sm">
                    <Icon name="Crown" className="h-3 w-3" />
                    {t('home.popular', lang)}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${popular ? 'bg-navy-900 text-gold-400' : 'bg-slate-100 text-navy-700'}`}>
                  <Icon name={popular ? 'Crown' : 'Gem'} className="h-5 w-5" />
                </div>
              </div>

              <h3 className="mt-4 text-lg font-extrabold text-navy-900">
                {lang === 'ar' ? pkg.name_ar : pkg.name_en}
              </h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                {lang === 'ar' ? pkg.description_ar : pkg.description_en}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-navy-900 tabular-nums">{formatAed(pkg.price)}</span>
                <span className="text-sm font-medium text-slate-400">
                  {t(CYCLE_KEY[pkg.billing_cycle] ?? 'home.oneTime', lang)}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {(pkg.features ?? []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Icon name="Check" className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-[0.98] ${
                  popular
                    ? 'bg-navy-900 text-white hover:bg-navy-800'
                    : 'border border-slate-200 text-navy-900 hover:border-navy-900'
                }`}
              >
                {t('home.subscribe', lang)}
                <Icon name="ArrowLeft" className="h-4 w-4 rtl:rotate-0" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
