import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui';
import { ServiceImage } from '@/components/ServiceImage';
import { colorOf } from './CustomerHome';
import type { Category, Service } from '@/types';

export function CategoryScreen({
  category, services, onOpenService, onBack,
}: {
  category: Category;
  services: Service[];
  onOpenService: (s: Service) => void;
  onBack: () => void;
}) {
  const { lang, dir } = useLang();
  const c = colorOf(category.color);
  const list = services.filter((s) => s.category_id === category.id && s.is_active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div dir={dir} className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
        <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" />
        {t('common.back', lang)}
      </button>

      <div className={`relative overflow-hidden rounded-3xl p-6 ${c.bg}`}>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white ${c.text} shadow-sm`}>
          <Icon name={category.icon} className="h-7 w-7" />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">{lang === 'ar' ? category.name_ar : category.name_en}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {list.length} {lang === 'ar' ? 'خدمة متاحة' : 'services available'}
        </p>
      </div>

      <div className="space-y-3">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpenService(s)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-start transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md tj-fade-up"
          >
            <ServiceImage imageUrl={s.image_url} fallbackIcon={s.fallback_icon} bg={c.bg} text={c.text} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">{lang === 'ar' ? s.name_ar : s.name_en}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{lang === 'ar' ? s.description_ar : s.description_en}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {s.base_price > 0 && <Badge color="emerald">{t('common.aed', lang)} {s.base_price}+</Badge>}
              <Icon name="ChevronLeft" className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 rtl:rotate-180" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
