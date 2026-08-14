import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { useCatalog } from '@/hooks/useCatalog';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/AppShell';
import { CustomerHome, colorOf } from '@/components/customer/CustomerHome';
import { AboutTajdeed } from '@/components/customer/AboutTajdeed';
import { CategoryScreen } from '@/components/customer/CategoryScreen';
import { CleaningBooking } from '@/components/customer/CleaningBooking';
import { MaintenanceBooking } from '@/components/customer/MaintenanceBooking';
import { CarBooking } from '@/components/customer/CarBooking';
import { HelperQuestionnaire } from '@/components/customer/HelperQuestionnaire';
import { ComingSoonScreen } from '@/components/customer/ComingSoonScreen';
import { OrdersScreen } from '@/components/customer/OrdersScreen';
import { ProfileScreen } from '@/components/customer/ProfileScreen';
import { PackagesScreen } from '@/components/customer/PackagesScreen';
import { fetchCustomerOrders } from '@/lib/orders';
import type { Category, Service, Order } from '@/types';
import { useEffect, useState } from 'react';

type View =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'orders' }
  | { name: 'profile' }
  | { name: 'packages' }
  | { name: 'category'; cat: Category }
  | { name: 'service'; svc: Service; cat: Category | null }
  | { name: 'coming'; cat: Category };

export function CustomerApp() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const { categories, services, loading, error } = useCatalog();
  const [view, setView] = useState<View>({ name: 'home' });
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (profile) fetchCustomerOrders().then(setOrders);
  }, [profile]);

  const activeOrders = orders.filter((o) => !['completed', 'cancelled'].includes(o.status));

  const goHome = () => setView({ name: 'home' });

  const openService = (s: Service) => {
    const cat = categories.find((c) => c.id === s.category_id) ?? null;
    if (cat?.is_coming_soon) {
      setView({ name: 'coming', cat });
      return;
    }
    setView({ name: 'service', svc: s, cat });
  };

  const renderService = (svc: Service, cat: Category | null) => {
    if (svc.slug === 'domestic_helper') return <HelperQuestionnaire service={svc} onClose={goHome} />;
    if (svc.pricing_type === 'helper') return <HelperQuestionnaire service={svc} onClose={goHome} />;
    if (svc.category_id && categories.find((c) => c.id === svc.category_id)?.slug === 'cleaning')
      return <CleaningBooking service={svc} category={cat} onClose={goHome} />;
    if (svc.category_id && categories.find((c) => c.id === svc.category_id)?.slug === 'maintenance')
      return <MaintenanceBooking service={svc} category={cat} onClose={goHome} />;
    if (svc.category_id && categories.find((c) => c.id === svc.category_id)?.slug === 'cars')
      return <CarBooking service={svc} category={cat} onClose={goHome} />;
    return <ComingSoonScreen category={cat ?? categories[0]} services={services} onBack={goHome} />;
  };

  const titleMap: Record<string, string> = {
    home: t('nav.home', lang),
    about: t('about.title', lang),
    orders: t('nav.orders', lang),
    profile: t('nav.profile', lang),
    packages: t('home.packages', lang),
    category: '', service: '', coming: t('home.comingSoon', lang),
  };

  return (
    <AppShell title={titleMap[view.name]} onNav={(k) => { if (k === 'home') goHome(); if (k === 'profile') setView({ name: 'profile' }); if (k === 'orders') setView({ name: 'orders' }); if (k === 'packages') setView({ name: 'packages' }); }}>
      {loading && <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-900 border-t-transparent" /></div>}
      {error && <div className="tj-card p-6 text-center text-red-600">{t('common.error', lang)}</div>}
      {!loading && !error && view.name === 'home' && (
        <CustomerHome
          categories={categories}
          services={services}
          activeOrders={activeOrders}
          onOpenCategory={(cat) => cat.is_coming_soon ? setView({ name: 'coming', cat }) : setView({ name: 'category', cat })}
          onOpenService={openService}
          onOpenAbout={() => setView({ name: 'about' })}
          onOpenOrders={() => setView({ name: 'orders' })}
          onOpenProfile={() => setView({ name: 'profile' })}
        />
      )}
      {!loading && view.name === 'about' && <AboutTajdeed onBack={goHome} />}
      {!loading && view.name === 'orders' && <OrdersScreen orders={orders} onBack={goHome} />}
      {!loading && view.name === 'profile' && <ProfileScreen onBack={goHome} />}
      {!loading && view.name === 'packages' && <PackagesScreen onBack={goHome} />}
      {!loading && view.name === 'category' && (
        <CategoryScreen category={view.cat} services={services} onOpenService={openService} onBack={goHome} />
      )}
      {!loading && view.name === 'service' && renderService(view.svc, view.cat)}
      {!loading && view.name === 'coming' && <ComingSoonScreen category={view.cat} services={services} onBack={goHome} />}
    </AppShell>
  );
}
