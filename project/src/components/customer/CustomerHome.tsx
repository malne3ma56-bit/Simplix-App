import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { ServiceImage } from '@/components/ServiceImage';
import { Badge, formatAed } from '@/components/ui';
import { HeroCarousel } from '@/components/customer/HeroCarousel';
import { SubscriptionPackages } from '@/components/customer/SubscriptionPackages';
import { useMarketingData } from '@/hooks/useMarketing';
import type { Category, Service, Order } from '@/types';

const ICON_TINT: Record<string, string> = {
  emerald: 'bg-slate-100 text-navy-700',
  sky: 'bg-slate-100 text-navy-700',
  amber: 'bg-slate-100 text-navy-700',
  rose: 'bg-slate-100 text-navy-700',
  orange: 'bg-slate-100 text-navy-700',
  teal: 'bg-slate-100 text-navy-700',
};

export function colorOf(c: string) {
  return { bg: ICON_TINT[c] ?? ICON_TINT.emerald, text: 'text-navy-700', ring: 'ring-slate-200' };
}

export function CustomerHome({
  categories, services, activeOrders, onOpenCategory, onOpenService, onOpenAbout, onOpenOrders, onOpenProfile,
}: {
  categories: Category[];
  services: Service[];
  activeOrders: Order[];
  onOpenCategory: (cat: Category) => void;
  onOpenService: (s: Service) => void;
  onOpenAbout: () => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
}) {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const { banners, packages } = useMarketingData();

  const activeCats = categories.filter((c) => c.is_active && !c.is_coming_soon).sort((a, b) => a.sort_order - b.sort_order);
  const comingCats = categories.filter((c) => c.is_coming_soon).sort((a, b) => a.sort_order - b.sort_order);
  const featured = services.filter((s) => ['quick_home', 'car_wash', 'ac', 'domestic_helper'].includes(s.slug)).slice(0, 4);
  const greeting = profile?.full_name ? `${lang === 'ar' ? 'مرحباً' : 'Hi'}, ${profile.full_name}` : t('brand.name', lang);

  return (
    <div dir={dir} className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between tj-fade-up">
        <div>
          <p className="text-sm font-medium text-slate-500">{greeting}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">{t('home.greeting', lang)}</h1>
        </div>
        <button
          onClick={onOpenProfile}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-100 text-navy-700 transition hover:border-slate-300"
        >
          <Icon name="User" className="h-5 w-5" />
        </button>
      </div>

      {/* Hero Carousel */}
      <HeroCarousel banners={banners} />

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="tj-fade-up">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="tj-section-title">{t('home.activeOrders', lang)}</h2>
            <button onClick={onOpenOrders} className="text-sm font-bold text-navy-700 hover:text-navy-900">
              {t('home.tracking', lang)} →
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto tj-scroll-hide pb-1">
            {activeOrders.slice(0, 5).map((o) => (
              <button
                key={o.id}
                onClick={onOpenOrders}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-start transition hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                  <Icon name="Activity" className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900">{o.summary_ar || t(`order.status.${o.status}`, lang)}</p>
                  <p className="text-xs text-slate-500">{formatAed(o.price)} · {t(`order.status.${o.status}`, lang)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sections grid */}
      <div>
        <h2 className="tj-section-title mb-4">{t('home.explore', lang)}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {activeCats.map((cat) => {
            const c = colorOf(cat.color);
            return (
              <button
                key={cat.id}
                onClick={() => onOpenCategory(cat)}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-start transition hover:-translate-y-0.5 hover:shadow-md tj-fade-up"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                  <Icon name={cat.icon} className="h-6 w-6" />
                </div>
                <p className="mt-4 font-bold text-navy-900 leading-snug">{lang === 'ar' ? cat.name_ar : cat.name_en}</p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {services.filter((s) => s.category_id === cat.id).length} {lang === 'ar' ? 'خدمة' : 'services'}
                </p>
                <Icon name="ArrowUpRight" className="absolute end-4 top-4 h-4 w-4 text-slate-300 transition group-hover:text-navy-700" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div>
          <h2 className="tj-section-title mb-4">{t('home.featured', lang)}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((s) => {
              const cat = categories.find((c) => c.id === s.category_id);
              const c = colorOf(cat?.color ?? 'emerald');
              return (
                <button
                  key={s.id}
                  onClick={() => onOpenService(s)}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-5 text-start transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <ServiceImage imageUrl={s.image_url} fallbackIcon={s.fallback_icon} bg={c.bg} text={c.text} size="sm" />
                    <Icon name="ArrowLeft" className="h-4 w-4 text-slate-300 transition group-hover:text-navy-700 rtl:rotate-0" />
                  </div>
                  <p className="mt-3 font-bold text-navy-900 leading-snug">{lang === 'ar' ? s.name_ar : s.name_en}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{lang === 'ar' ? s.description_ar : s.description_en}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Packages & Subscriptions */}
      <SubscriptionPackages packages={packages} />

      {/* Coming soon */}
      {comingCats.length > 0 && (
        <div>
          <h2 className="tj-section-title mb-4">{t('home.comingSoon', lang)}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {comingCats.map((cat) => {
              const c = colorOf(cat.color);
              return (
                <button
                  key={cat.id}
                  onClick={() => onOpenCategory(cat)}
                  className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-start transition hover:border-navy-400"
                >
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${c.bg}`}>
                    <Icon name={cat.icon} className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-navy-900">{lang === 'ar' ? cat.name_ar : cat.name_en}</p>
                      <Badge color="slate">{t('home.comingSoon', lang)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{t('waitlist.desc', lang)}</p>
                  </div>
                  <Icon name="ArrowLeft" className="h-4 w-4 text-slate-300 rtl:rotate-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* About link */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onOpenAbout}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-navy-900"
        >
          <Icon name="Info" className="h-4 w-4" />
          {t('about.title', lang)}
        </button>
      </div>
    </div>
  );
}
