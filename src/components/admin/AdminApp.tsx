import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useCatalog } from '@/hooks/useCatalog';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { AppShell } from '@/components/AppShell';
import { Button, Badge, formatAed, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SupportDesk } from '@/components/admin/SupportDesk';
import { MarketingManager } from '@/components/admin/MarketingManager';
import { DisputesManager } from '@/components/admin/DisputesManager';
import { ImageUploader } from '@/components/ImageUploader';
import { fetchPayoutLogs } from '@/lib/orders';
import type { Profile, Service, Category, Order, HelperRequest, Rating, Settings, Banner, PayoutLog } from '@/types';

type Tab = 'overview' | 'services' | 'customers' | 'providers' | 'helpers' | 'ratings' | 'waitlist' | 'banners' | 'marketing' | 'disputes' | 'support' | 'payouts' | 'settings';

export function AdminApp() {
  const { lang, dir } = useLang();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'overview', icon: 'Activity', label: t('admin.overview', lang) },
    { key: 'services', icon: 'Package', label: t('admin.services', lang) },
    { key: 'customers', icon: 'Users', label: t('admin.customers', lang) },
    { key: 'providers', icon: 'Briefcase', label: t('admin.providers', lang) },
    { key: 'helpers', icon: 'HeartHandshake', label: t('admin.helpers', lang) },
    { key: 'ratings', icon: 'Star', label: t('admin.moderation', lang) },
    { key: 'waitlist', icon: 'Bell', label: t('admin.waitlist', lang) },
    { key: 'banners', icon: 'Image', label: t('admin.banners', lang) },
    { key: 'marketing', icon: 'Sparkle', label: t('admin.marketing', lang) },
    { key: 'disputes', icon: 'Shield', label: t('admin.disputes', lang) },
    { key: 'support', icon: 'Headphones', label: t('admin.support', lang) },
    { key: 'payouts', icon: 'Banknote', label: t('admin.payouts', lang) },
    { key: 'settings', icon: 'Settings', label: t('admin.settings', lang) },
  ];

  return (
    <AppShell title={t('admin.title', lang)} showCopilot={false}>
      <div dir={dir} className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex gap-2 overflow-x-auto tj-scroll-hide lg:flex-col">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === tb.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon name={tb.icon} className="h-4 w-4" />
                <span className="whitespace-nowrap">{tb.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div>
          {tab === 'overview' && <Overview />}
          {tab === 'services' && <ServicesManager />}
          {tab === 'customers' && <CustomerCrm />}
          {tab === 'providers' && <ProvidersManager />}
          {tab === 'helpers' && <HelpersManager />}
          {tab === 'ratings' && <RatingsModeration />}
          {tab === 'waitlist' && <WaitlistManager />}
          {tab === 'banners' && <BannersManager />}
          {tab === 'marketing' && <MarketingManager />}
          {tab === 'disputes' && <DisputesManager />}
          {tab === 'support' && <SupportDesk />}
          {tab === 'payouts' && <PayoutLogs />}
          {tab === 'settings' && <SettingsManager />}
        </div>
      </div>
    </AppShell>
  );
}

// ===================== Overview =====================
function Overview() {
  const { lang } = useLang();
  const [stats, setStats] = useState({ orders: 0, customers: 0, providers: 0, pending: 0, revenue: 0, helpers: 0, platformFees: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, c, p, h] = await Promise.all([
        supabase.from('orders').select('status, price'),
        supabase.from('profiles').select('role').eq('role', 'customer'),
        supabase.from('profiles').select('role').eq('role', 'provider'),
        supabase.from('helper_requests').select('id'),
      ]);
      const orders = (o.data ?? []) as any[];
      const pending = orders.filter((x) => x.status === 'pending').length;
      const revenue = orders.filter((x) => x.status === 'completed').reduce((s, x) => s + Number(x.price), 0);
      const platformFees = orders.filter((x) => x.status === 'completed').reduce((s, x) => s + Number(x.platform_fee ?? 0), 0);
      setStats({ orders: orders.length, customers: c.data?.length ?? 0, providers: p.data?.length ?? 0, pending, revenue, helpers: h.data?.length ?? 0, platformFees });
      const { data: recent } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8);
      setRecentOrders((recent ?? []) as Order[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const cards = [
    { label: lang === 'ar' ? 'إجمالي الطلبات' : 'Total Orders', value: stats.orders, icon: 'Package', color: 'emerald' },
    { label: lang === 'ar' ? 'بانتظار التعيين' : 'Pending', value: stats.pending, icon: 'Clock', color: 'amber' },
    { label: lang === 'ar' ? 'العملاء' : 'Customers', value: stats.customers, icon: 'Users', color: 'sky' },
    { label: lang === 'ar' ? 'المزودون' : 'Providers', value: stats.providers, icon: 'Briefcase', color: 'violet' },
    { label: lang === 'ar' ? 'الإيرادات المنجزة' : 'Completed Revenue', value: formatAed(stats.revenue), icon: 'TrendingUp', color: 'teal' },
    { label: lang === 'ar' ? 'طلبات التوظيف' : 'Helper Requests', value: stats.helpers, icon: 'HeartHandshake', color: 'rose' },
    { label: lang === 'ar' ? 'أرباح المنصة' : 'Platform Earnings', value: formatAed(stats.platformFees), icon: 'Banknote', color: 'emerald' },
  ];
  const colorMap: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600', teal: 'bg-teal-50 text-teal-600', rose: 'bg-rose-50 text-rose-600' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div key={i} className="tj-card p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[c.color]}`}>
              <Icon name={c.icon} className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{c.value}</p>
            <p className="text-xs font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="tj-card p-5">
        <h3 className="mb-3 font-extrabold text-slate-900">{lang === 'ar' ? 'أحدث الطلبات' : 'Recent Orders'}</h3>
        {recentOrders.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('order.noOrders', lang)}</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{o.summary_ar}</p>
                  <p className="text-xs text-slate-400" dir="ltr">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-600">{formatAed(o.price)}</span>
                  <Badge color={o.status === 'completed' ? 'emerald' : o.status === 'cancelled' ? 'red' : 'amber'}>{t(`order.status.${o.status}`, lang)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== Services Manager =====================
function ServicesManager() {
  const { lang } = useLang();
  const { categories, services, loading, reload } = useCatalog();
  const [editing, setEditing] = useState<Service | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900">{t('admin.services', lang)}</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}><Icon name="Plus" className="h-4 w-4" /> {t('admin.add', lang)}</Button>
      </div>

      {categories.map((cat) => (
        <div key={cat.id} className="tj-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name={cat.icon} className="h-4 w-4 text-slate-600" />
            <h4 className="font-bold text-slate-900">{lang === 'ar' ? cat.name_ar : cat.name_en}</h4>
            <Badge color={cat.is_coming_soon ? 'amber' : 'emerald'}>{cat.is_coming_soon ? t('home.comingSoon', lang) : (lang === 'ar' ? 'نشط' : 'Active')}</Badge>
          </div>
          <div className="space-y-2">
            {services.filter((s) => s.category_id === cat.id).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 overflow-hidden">
                    {s.image_url
                      ? <img src={s.image_url} alt="" className="h-full w-full object-cover" onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; const sib = t.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = 'flex'; }} />
                      : null}
                    <div className={s.image_url ? 'hidden h-full w-full items-center justify-center' : 'flex h-full w-full items-center justify-center'}>
                      <Icon name={s.fallback_icon || 'ImageOff'} className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{lang === 'ar' ? s.name_ar : s.name_en}</p>
                    <p className="text-xs text-slate-400">{formatAed(s.base_price)} {s.inspection_fee ? `· فحص ${formatAed(s.inspection_fee)}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(s)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <Icon name="Pencil" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {(editing || showAdd) && (
        <ServiceEditModal
          service={editing}
          categories={categories}
          onClose={() => { setEditing(null); setShowAdd(false); }}
          onSaved={() => { setEditing(null); setShowAdd(false); reload(); }}
        />
      )}
    </div>
  );
}

function ServiceEditModal({ service, categories, onClose, onSaved }: { service: Service | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const { lang, dir } = useLang();
  const [nameAr, setNameAr] = useState(service?.name_ar ?? '');
  const [nameEn, setNameEn] = useState(service?.name_en ?? '');
  const [descAr, setDescAr] = useState(service?.description_ar ?? '');
  const [basePrice, setBasePrice] = useState(service?.base_price ?? 0);
  const [inspectionFee, setInspectionFee] = useState(service?.inspection_fee ?? 0);
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? '');
  const [fallbackIcon, setFallbackIcon] = useState(service?.fallback_icon ?? 'Sparkles');
  const [catId, setCatId] = useState(service?.category_id ?? categories[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const payload = {
      category_id: catId,
      name_ar: nameAr, name_en: nameEn || nameAr,
      description_ar: descAr, description_en: descAr,
      base_price: basePrice, inspection_fee: inspectionFee || null,
      image_url: imageUrl || null, fallback_icon: fallbackIcon || 'Sparkles',
    };
    const { error } = service
      ? await supabase.from('services').update(payload).eq('id', service.id)
      : await supabase.from('services').insert({ ...payload, slug: `custom-${Date.now()}`, pricing_type: 'fixed', price_config: {} });
    if (error) {
      console.error('[ServiceEdit] save failed:', error.code, error.message, 'image_url length:', imageUrl.length);
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    console.log('[ServiceEdit] save OK, image_url length:', imageUrl.length);
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!service) return;
    if (!confirm(lang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
    await supabase.from('services').delete().eq('id', service.id);
    onSaved();
  };

  return (
    <div dir={dir} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl tj-slide-in space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">{service ? t('admin.edit', lang) : t('admin.add', lang)}</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="X" className="h-5 w-5" /></button>
        </div>
        {!service && (
          <div>
            <label className="tj-label">{lang === 'ar' ? 'القسم' : 'Category'}</label>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} className="tj-input">
              {categories.map((c) => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="tj-label">{lang === 'ar' ? 'الاسم (عربي)' : 'Name (AR)'}</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="tj-input" />
        </div>
        <div>
          <label className="tj-label">{lang === 'ar' ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="tj-input" dir="ltr" />
        </div>
        <div>
          <label className="tj-label">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
          <textarea value={descAr} onChange={(e) => setDescAr(e.target.value)} className="tj-input min-h-[70px] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="tj-label">{lang === 'ar' ? 'السعر الأساسي' : 'Base Price'}</label>
            <input type="number" value={basePrice} onChange={(e) => setBasePrice(+e.target.value)} className="tj-input" dir="ltr" />
          </div>
          <div>
            <label className="tj-label">{lang === 'ar' ? 'رسوم الفحص' : 'Inspection Fee'}</label>
            <input type="number" value={inspectionFee} onChange={(e) => setInspectionFee(+e.target.value)} className="tj-input" dir="ltr" />
          </div>
        </div>
        <div>
          <ImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            label={lang === 'ar' ? 'صورة الخدمة (اختياري)' : 'Service Image (optional)'}
          />
        </div>
        <div>
          <label className="tj-label">{lang === 'ar' ? 'الأيقونة البديلة' : 'Fallback Icon'}</label>
          <input value={fallbackIcon} onChange={(e) => setFallbackIcon(e.target.value)} className="tj-input" dir="ltr" placeholder="Sparkles" />
        </div>
        {saveError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{saveError}</div>
        )}
        <div className="flex gap-2 pt-2">
          {service && <Button variant="danger" onClick={remove}><Icon name="Trash2" className="h-4 w-4" /> {t('admin.delete', lang)}</Button>}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>{t('common.close', lang)}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !nameAr}>{saving ? t('common.loading', lang) : t('admin.save', lang)}</Button>
        </div>
      </div>
    </div>
  );
}

// ===================== Customer CRM =====================
function CustomerCrm() {
  const { lang, dir } = useLang();
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Record<string, Order[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
      setCustomers((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  const viewHistory = async (p: Profile) => {
    setSelected(p);
    const { data } = await supabase.from('orders').select('*').eq('customer_id', p.id).order('created_at', { ascending: false });
    setOrders((o) => ({ ...o, [p.id]: (data ?? []) as Order[] }));
  };

  const setTier = async (p: Profile, status: 'new'|'active'|'vip') => {
    await supabase.from('profiles').update({ status }).eq('id', p.id);
    setCustomers((cs) => cs.map((c) => c.id === p.id ? { ...c, status } : c));
    setSelected({ ...p, status });
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const tierColor: Record<string, string> = { new: 'slate', active: 'emerald', vip: 'amber' };

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('admin.customers', lang)}</h3>
      <div className="space-y-2">
        {customers.length === 0 ? (
          <div className="tj-card p-8 text-center text-sm text-slate-400">{lang === 'ar' ? 'لا يوجد عملاء بعد' : 'No customers yet'}</div>
        ) : customers.map((c) => (
          <div key={c.id} className="tj-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold">{c.full_name?.[0] ?? '?'}</div>
                <div>
                  <p className="font-bold text-slate-900">{c.full_name || (lang === 'ar' ? 'بدون اسم' : 'Unnamed')}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{c.phone} · {c.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={tierColor[c.status]}>{c.status.toUpperCase()}</Badge>
                <button onClick={() => viewHistory(c)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Icon name="Eye" className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div dir={dir} className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl tj-slide-in space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">{selected.full_name}</h3>
              <button onClick={() => setSelected(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="X" className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['new','active','vip'] as const).map((s) => (
                <button key={s} onClick={() => setTier(selected, s)} className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${selected.status === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{s.toUpperCase()}</button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-400">{t('nav.orders', lang)} ({orders[selected.id]?.length ?? 0})</p>
              <div className="space-y-2">
                {(orders[selected.id] ?? []).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700">{o.summary_ar}</p>
                      <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-600">{formatAed(o.price)}</span>
                      <Badge color={o.status === 'cancelled' ? 'red' : o.status === 'completed' ? 'emerald' : 'amber'}>{t(`order.status.${o.status}`, lang)}</Badge>
                    </div>
                  </div>
                ))}
                {(orders[selected.id] ?? []).length === 0 && <p className="py-4 text-center text-sm text-slate-400">{t('order.noOrders', lang)}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== Providers Manager =====================
function ProvidersManager() {
  const { lang, dir } = useLang();
  const { categories } = useCatalog();
  const [providers, setProviders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFinancial, setEditingFinancial] = useState<Profile | null>(null);
  const [generatingDummy, setGeneratingDummy] = useState(false);
  const [dummyNotice, setDummyNotice] = useState<string | null>(null);

  const loadProviders = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'provider').order('created_at', { ascending: false });
    setProviders((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { loadProviders(); }, []);

  const setProviderStatus = async (p: Profile, status: 'approved'|'suspended'|'pending'|'pending_approval') => {
    await supabase.from('profiles').update({ status }).eq('id', p.id);
    setProviders((ps) => ps.map((x) => x.id === p.id ? { ...x, status } : x));
  };

  const generateDummyProvider = async () => {
    setGeneratingDummy(true);
    const dummyNames = [
      'مؤسسة النور للخدمات', 'شركة الفرسان', 'مؤسسة الصفوة', 'شركة الإتقان',
      'Al-Noor Services', 'Al-Fursan Cleaning', 'Premium Home Care',
    ];
    const name = dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const dummyCat = categories[Math.floor(Math.random() * categories.length)];

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        role: 'provider',
        full_name: name,
        phone: '+9715' + Math.floor(1000000 + Math.random() * 8999999),
        email: `dummy_${Date.now()}@tajdeed.test`,
        status: 'active',
        provider_category_id: dummyCat?.id ?? null,
        available: true,
        wallet_balance: Math.round(Math.random() * 500 * 100) / 100,
        rating_avg: Math.round((3.5 + Math.random() * 1.5) * 100) / 100,
        rating_count: Math.floor(Math.random() * 50),
      })
      .select('*')
      .single();

    if (!error && data) {
      setProviders((ps) => [data as Profile, ...ps]);
      setDummyNotice('admin.dummyCreated');
      setTimeout(() => setDummyNotice(null), 3000);
    }
    setGeneratingDummy(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const pendingProviders = providers.filter((p) => p.status === 'pending_approval');
  const activeProviders = providers.filter((p) => p.status !== 'pending_approval');

  return (
    <div className="space-y-5">
      <h3 className="font-extrabold text-slate-900">{t('admin.providers', lang)}</h3>

      {/* Dummy provider generator */}
      {providers.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 text-center tj-fade-in">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon name="FlaskConical" className="h-6 w-6" />
          </div>
          <p className="mb-1 text-sm font-bold text-amber-800">{lang === 'ar' ? 'لا يوجد مزودون بعد' : 'No providers yet'}</p>
          <p className="mb-4 text-xs text-amber-600">{lang === 'ar' ? 'أنشئ مزوداً تجريبياً لاختبار الشروط المالية والاشتراكات' : 'Generate a dummy provider to test financial terms and subscriptions'}</p>
          <Button variant="primary" onClick={generateDummyProvider} disabled={generatingDummy}>
            {generatingDummy ? <Spinner className="h-4 w-4" /> : <><Icon name="Plus" className="h-4 w-4" /> {t('admin.generateDummy', lang)}</>}
          </Button>
        </div>
      )}

      {dummyNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 tj-fade-up">
          <Icon name="CheckCircle2" className="h-4 w-4" />
          {t(dummyNotice, lang)}
        </div>
      )}

      {/* Pending Approvals Section */}
      {pendingProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="Clock" className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-extrabold text-slate-900">{t('admin.pendingApprovals', lang)}</h4>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-700">{pendingProviders.length}</span>
          </div>
          {pendingProviders.map((p) => {
            const cat = categories.find((c) => c.id === p.provider_category_id);
            return (
              <div key={p.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold">
                      <Icon name="Briefcase" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {t('provider.category', lang)}: {cat ? (lang === 'ar' ? cat.name_ar : cat.name_en) : '-'}
                        {' · '}{p.phone}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                    {t('admin.pendingApprovals', lang)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-amber-200/50 pt-3">
                  <Button size="sm" variant="primary" onClick={() => setProviderStatus(p, 'approved')}>
                    <Icon name="CheckCircle2" className="h-4 w-4" /> {t('admin.approve', lang)}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setProviderStatus(p, 'suspended')}>
                    <Icon name="XCircle" className="h-4 w-4" /> {t('admin.reject', lang)}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active / All Providers */}
      {activeProviders.length > 0 && (
        <div className="space-y-3">
          {pendingProviders.length > 0 && (
            <div className="flex items-center gap-2">
              <Icon name="Users" className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-extrabold text-slate-900">{lang === 'ar' ? 'كل المزودين' : 'All Providers'}</h4>
            </div>
          )}
          {activeProviders.map((p) => {
            const cat = categories.find((c) => c.id === p.provider_category_id);
            const hasSub = (p.subscription_plan === 'monthly' || p.subscription_plan === 'annual') && p.is_subscription_active;
            const rateSource = hasSub ? 'subscription' : (p.custom_commission_rate !== null && p.custom_commission_rate !== undefined) ? 'custom' : 'default';
            const rateLabel = rateSource === 'subscription' ? '0%' : rateSource === 'custom' ? `${(p.custom_commission_rate! * 100).toFixed(1)}%` : '15%';
            return (
              <div key={p.id} className="tj-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 font-bold">{p.full_name?.[0] ?? '?'}</div>
                    <div>
                      <p className="font-bold text-slate-900">{p.full_name}</p>
                      <p className="text-xs text-slate-400">{t('provider.specialty', lang)}: {cat ? (lang === 'ar' ? cat.name_ar : cat.name_en) : '-'} · <Icon name="Star" className="inline h-3 w-3 text-amber-400" /> {p.rating_avg?.toFixed(1) ?? '0.0'} ({p.rating_count})</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`flex items-center gap-1 text-xs font-bold ${p.available ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`h-2 w-2 rounded-full ${p.available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {p.available ? t('provider.available', lang) : t('provider.offline', lang)}
                    </span>
                  </div>
                </div>

                {/* Financial terms summary */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className={`rounded-lg px-2 py-0.5 font-bold ${
                    rateSource === 'subscription' ? 'bg-emerald-100 text-emerald-700' :
                    rateSource === 'custom' ? 'bg-sky-100 text-sky-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {t('admin.currentRate', lang)}: {rateLabel}
                  </span>
                  {hasSub && <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">{t('admin.subscriptionActive', lang)}</span>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {p.status !== 'approved' && <Button size="sm" variant="primary" onClick={() => setProviderStatus(p, 'approved')}><Icon name="CheckCircle2" className="h-4 w-4" /> {lang === 'ar' ? 'اعتماد' : 'Approve'}</Button>}
                  {p.status !== 'suspended' && <Button size="sm" variant="danger" onClick={() => setProviderStatus(p, 'suspended')}><Icon name="Ban" className="h-4 w-4" /> {t('admin.blockProvider', lang)}</Button>}
                  {p.status === 'suspended' && <Button size="sm" variant="ghost" onClick={() => setProviderStatus(p, 'pending')}>{lang === 'ar' ? 'إعادة' : 'Restore'}</Button>}
                  <Button size="sm" variant="outline" onClick={() => setEditingFinancial(p)}>
                    <Icon name="Wallet" className="h-4 w-4" />
                    {t('admin.editFinancial', lang)}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingFinancial && (
        <FinancialTermsModal
          provider={editingFinancial}
          onClose={() => setEditingFinancial(null)}
          onSaved={(updated) => {
            setProviders((ps) => ps.map((x) => x.id === updated.id ? { ...x, ...updated } : x));
            setEditingFinancial(null);
          }}
        />
      )}
    </div>
  );
}

// ===================== Financial Terms Modal =====================
function FinancialTermsModal({
  provider,
  onClose,
  onSaved,
}: {
  provider: Profile;
  onClose: () => void;
  onSaved: (updated: { id: string; custom_commission_rate: number | null; subscription_plan: 'none' | 'monthly' | 'annual'; is_subscription_active: boolean }) => void;
}) {
  const { lang, dir } = useLang();
  const [customRate, setCustomRate] = useState<string>(
    provider.custom_commission_rate !== null && provider.custom_commission_rate !== undefined
      ? (provider.custom_commission_rate * 100).toString()
      : ''
  );
  const [subPlan, setSubPlan] = useState<'none' | 'monthly' | 'annual'>(provider.subscription_plan ?? 'none');
  const [subActive, setSubActive] = useState<boolean>(provider.is_subscription_active ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Preview split based on current inputs
  const previewRate = (subPlan !== 'none' && subActive) ? 0 : (customRate.trim() ? Math.max(0, Math.min(100, parseFloat(customRate) || 0)) / 100 : 0.15);
  const previewPlatform = Math.round(100 * previewRate * 100) / 100;
  const previewProvider = Math.round(100 * (1 - previewRate) * 100) / 100;

  const rateSource = (subPlan !== 'none' && subActive) ? 'subscription' : customRate.trim() ? 'custom' : 'default';

  const save = async () => {
    setSaving(true);
    const rateValue = customRate.trim() ? Math.max(0, Math.min(1, parseFloat(customRate) / 100)) : null;
    await supabase
      .from('profiles')
      .update({
        custom_commission_rate: rateValue,
        subscription_plan: subPlan,
        is_subscription_active: subPlan !== 'none' ? subActive : false,
      })
      .eq('id', provider.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onSaved({
        id: provider.id,
        custom_commission_rate: rateValue,
        subscription_plan: subPlan,
        is_subscription_active: subPlan !== 'none' ? subActive : false,
      });
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 tj-fade-in" onClick={onClose}>
      <div
        dir={dir}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl tj-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Icon name="Wallet" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">{t('admin.financialTerms', lang)}</h3>
              <p className="text-xs text-slate-400">{provider.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Custom Commission Rate */}
          <div>
            <label className="tj-label">{t('admin.commissionRate', lang)} (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              placeholder="15"
              className="tj-input"
              dir="ltr"
              disabled={subPlan !== 'none' && subActive}
            />
            <p className="mt-1 text-xs text-slate-400">{t('admin.commissionRateHint', lang)}</p>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="tj-label">{t('admin.subscriptionPlan', lang)}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'monthly', 'annual'] as const).map((plan) => (
                <button
                  key={plan}
                  onClick={() => { setSubPlan(plan); if (plan === 'none') setSubActive(false); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    subPlan === plan
                      ? plan === 'none'
                        ? 'border-slate-400 bg-slate-50 text-slate-700'
                        : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {plan === 'none' ? t('admin.subNone', lang) : plan === 'monthly' ? t('admin.subMonthly', lang) : t('admin.subAnnual', lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Subscription Active Toggle */}
          {subPlan !== 'none' && (
            <div className="rounded-xl border border-slate-200 p-3 tj-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">{t('admin.subscriptionActive', lang)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t('admin.subscriptionHint', lang)}</p>
                </div>
                <button
                  onClick={() => setSubActive(!subActive)}
                  className={`relative h-7 w-12 rounded-full transition ${subActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${subActive ? 'left-5.5' : 'left-0.5'}`} style={{ left: subActive ? '22px' : '2px' }} />
                </button>
              </div>
            </div>
          )}

          {/* Current Rate Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <Icon name="Percent" className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-600">{t('admin.currentRate', lang)}:</span>
            <span className={`rounded-lg px-2 py-0.5 text-xs font-extrabold ${
              rateSource === 'subscription' ? 'bg-emerald-100 text-emerald-700' :
              rateSource === 'custom' ? 'bg-sky-100 text-sky-700' :
              'bg-slate-200 text-slate-600'
            }`}>
              {rateSource === 'subscription' ? t('admin.subscription', lang) :
               rateSource === 'custom' ? `${(previewRate * 100).toFixed(1)}% (${t('admin.custom', lang)})` :
               t('admin.default15', lang)}
            </span>
          </div>

          {/* Split Preview */}
          <div className="rounded-2xl bg-navy-900 p-4 text-white">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">{t('admin.previewSplit', lang)}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
                <p className="text-xs text-white/50">{t('admin.platformGets', lang)}</p>
                <p className="text-lg font-extrabold text-gold-400">{previewPlatform.toFixed(2)}</p>
                <p className="text-xs text-white/40">{(previewRate * 100).toFixed(0)}%</p>
              </div>
              <div className="flex-1 rounded-xl bg-white/10 p-3 text-center">
                <p className="text-xs text-white/50">{t('admin.providerGets', lang)}</p>
                <p className="text-lg font-extrabold text-emerald-400">{previewProvider.toFixed(2)}</p>
                <p className="text-xs text-white/40">{((1 - previewRate) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>{t('booking.cancel', lang)}</Button>
          <Button variant="primary" className="flex-1" onClick={save} disabled={saving || saved}>
            {saved ? (
              <><Icon name="CheckCircle2" className="h-4 w-4" /> {t('admin.financialSaved', lang)}</>
            ) : saving ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <><Icon name="Save" className="h-4 w-4" /> {t('admin.saveFinancial', lang)}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== Helpers Manager =====================
function HelpersManager() {
  const { lang } = useLang();
  const [reqs, setReqs] = useState<HelperRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('helper_requests').select('*').order('created_at', { ascending: false });
      setReqs((data ?? []) as HelperRequest[]);
      setLoading(false);
    })();
  }, []);

  const setStatus = async (r: HelperRequest, status: 'new'|'processing'|'fulfilled') => {
    await supabase.from('helper_requests').update({ status }).eq('id', r.id);
    setReqs((rs) => rs.map((x) => x.id === r.id ? { ...x, status } : x));
  };

  const print = (r: HelperRequest) => {
    const p = r.printable_payload;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><title>طلب استقدام</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}td{padding:8px;border:1px solid #e2e8f0}td:first-child{font-weight:bold;background:#f1f5f9;width:35%}h1{color:#059669}</style></head><body>
      <h1>طلب توظيف عاملة منزلية - تجديد</h1>
      <table>
      <tr><td>الاسم</td><td>${p.customer_name ?? ''}</td></tr>
      <tr><td>الهاتف</td><td>${p.customer_phone ?? ''}</td></tr>
      <tr><td>العمر</td><td>${p.requirements?.age_range ?? ''}</td></tr>
      <tr><td>الجنس</td><td>${p.requirements?.gender ?? ''}</td></tr>
      <tr><td>الجنسية</td><td>${p.requirements?.nationality ?? ''}</td></tr>
      <tr><td>الخبرة</td><td>${p.requirements?.experience ?? ''}</td></tr>
      <tr><td>المهارات</td><td>${(p.requirements?.skills ?? []).join('، ')}</td></tr>
      <tr><td>التاريخ</td><td>${new Date(r.created_at).toLocaleString('ar-AE')}</td></tr>
      </table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('admin.printable', lang)}</h3>
      {reqs.length === 0 ? (
        <div className="tj-card p-8 text-center text-sm text-slate-400">{lang === 'ar' ? 'لا توجد طلبات توظيف' : 'No helper requests'}</div>
      ) : reqs.map((r) => {
        const p = r.printable_payload;
        return (
          <div key={r.id} className="tj-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-900">{p.customer_name ?? '-'}</p>
                <p className="text-xs text-slate-400" dir="ltr">{p.customer_phone} · {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge color="slate">{p.requirements?.gender}</Badge>
                  <Badge color="sky">{p.requirements?.nationality}</Badge>
                  <Badge color="violet">{p.requirements?.experience}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{(p.requirements?.skills ?? []).join(' · ')}</p>
              </div>
              <Badge color={r.status === 'fulfilled' ? 'emerald' : r.status === 'processing' ? 'amber' : 'slate'}>{r.status}</Badge>
            </div>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="ghost" onClick={() => print(r)}><Icon name="Printer" className="h-4 w-4" /> {t('admin.print', lang)}</Button>
              {r.status === 'new' && <Button size="sm" onClick={() => setStatus(r, 'processing')}>{lang === 'ar' ? 'بدء المعالجة' : 'Process'}</Button>}
              {r.status === 'processing' && <Button size="sm" variant="accent" onClick={() => setStatus(r, 'fulfilled')}><Icon name="CheckCircle2" className="h-4 w-4" /> {lang === 'ar' ? 'إتمام' : 'Fulfill'}</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===================== Ratings Moderation =====================
function RatingsModeration() {
  const { lang } = useLang();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ratings').select('*').order('created_at', { ascending: false });
      setRatings((data ?? []) as Rating[]);
      setLoading(false);
    })();
  }, []);

  const toggleHide = async (r: Rating) => {
    const next = !r.hidden_by_admin;
    await supabase.from('ratings').update({ hidden_by_admin: next }).eq('id', r.id);
    setRatings((rs) => rs.map((x) => x.id === r.id ? { ...x, hidden_by_admin: next } : x));
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('admin.moderation', lang)}</h3>
      {ratings.length === 0 ? (
        <div className="tj-card p-8 text-center text-sm text-slate-400">{lang === 'ar' ? 'لا توجد تقييمات' : 'No ratings'}</div>
      ) : ratings.map((r) => (
        <div key={r.id} className="tj-card p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => <Icon key={i} name="Star" className={`h-4 w-4 ${i <= r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
              </div>
              <p className="mt-2 text-sm text-slate-700">{r.comment || (lang === 'ar' ? 'بدون تعليق' : 'No comment')}</p>
              <p className="mt-1 text-xs text-slate-400" dir="ltr">{new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {r.hidden_by_admin && <Badge color="red">{lang === 'ar' ? 'مخفي' : 'Hidden'}</Badge>}
              <button onClick={() => toggleHide(r)} className={`rounded-lg p-2 ${r.hidden_by_admin ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icon name={r.hidden_by_admin ? 'Eye' : 'EyeOff'} className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== Waitlist Manager =====================
function WaitlistManager() {
  const { lang } = useLang();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('waitlist_entries').select('*').order('created_at', { ascending: false });
      setEntries(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('admin.waitlist', lang)} ({entries.length})</h3>
      {entries.length === 0 ? (
        <div className="tj-card p-8 text-center text-sm text-slate-400">{lang === 'ar' ? 'لا يوجد مسجلون' : 'No entries'}</div>
      ) : (
        <div className="tj-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr><th className="px-4 py-3 text-start">{lang === 'ar' ? 'القسم' : 'Category'}</th><th className="px-4 py-3 text-start">{t('auth.email', lang)}</th><th className="px-4 py-3 text-start">{t('auth.phone', lang)}</th><th className="px-4 py-3 text-start">{t('order.created', lang)}</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-slate-700">{e.category_slug}</td>
                  <td className="px-4 py-3 text-slate-600" dir="ltr">{e.email}</td>
                  <td className="px-4 py-3 text-slate-600" dir="ltr">{e.phone || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===================== Settings Manager =====================
function SettingsManager() {
  const { lang, dir } = useLang();
  const { settings, reload } = useCatalog();
  const [mode, setMode] = useState<'automated'|'manual'>(settings?.operation_mode ?? 'automated');
  const [phone, setPhone] = useState(settings?.complaint_phone ?? '+971588095851');
  const [email, setEmail] = useState(settings?.support_email ?? 'support@tajdeed.ae');
  const [fee, setFee] = useState(settings?.maintenance_inspection_fee ?? 50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) { setMode(settings.operation_mode); setPhone(settings.complaint_phone); setEmail(settings.support_email); setFee(settings.maintenance_inspection_fee); }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    await supabase.from('settings').update({ operation_mode: mode, complaint_phone: phone, support_email: email, maintenance_inspection_fee: fee }).eq('id', 1);
    setSaving(false);
    reload();
  };

  return (
    <div dir={dir} className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('admin.settings', lang)}</h3>
      <div className="tj-card p-5 space-y-4">
        <div>
          <p className="tj-label">{lang === 'ar' ? 'نمط التشغيل' : 'Operation Mode'}</p>
          <div className="flex gap-2">
            <button onClick={() => setMode('automated')} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${mode === 'automated' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
              <Icon name="Zap" className="mx-auto mb-1 h-5 w-5" />
              {t('admin.toggle.automated', lang)}
            </button>
            <button onClick={() => setMode('manual')} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition ${mode === 'manual' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}>
              <Icon name="Settings" className="mx-auto mb-1 h-5 w-5" />
              {t('admin.toggle.manual', lang)}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="tj-label">{lang === 'ar' ? 'هاتف الشكاوى' : 'Complaint Phone'}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="tj-input" dir="ltr" />
          </div>
          <div>
            <label className="tj-label">{lang === 'ar' ? 'بريد الدعم' : 'Support Email'}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="tj-input" dir="ltr" />
          </div>
        </div>
        <div>
          <label className="tj-label">{t('maint.inspectionFee', lang)}</label>
          <input type="number" value={fee} onChange={(e) => setFee(+e.target.value)} className="tj-input" dir="ltr" />
        </div>
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? t('common.loading', lang) : t('admin.save', lang)}</Button>
      </div>
    </div>
  );
}

// ===================== Banners Manager =====================
function BannersManager() {
  const { lang, dir } = useLang();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div dir={dir} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-900">{t('admin.banners', lang)}</h2>
        <Button size="sm" onClick={() => { setEditing(null); setShowAdd(true); }}>
          <Icon name="Plus" className="h-4 w-4" /> {t('admin.add', lang)}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : banners.length === 0 ? (
        <div className="tj-card p-8 text-center text-sm text-slate-500">{t('admin.noBanners', lang)}</div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="tj-card overflow-hidden">
              <div className="flex items-stretch gap-4">
                <div className="h-24 w-32 shrink-0 overflow-hidden bg-slate-100">
                  {b.image_url
                    ? <img src={b.image_url} alt="" className="h-full w-full object-cover" onError={(e) => { const t = e.currentTarget; t.style.display = 'none'; const sib = t.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = 'flex'; }} />
                    : null}
                  <div className={b.image_url ? 'hidden h-full w-full items-center justify-center' : 'flex h-full w-full items-center justify-center'}>
                    <Icon name="ImageOff" className="h-6 w-6 text-slate-300" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between py-2 pe-4">
                  <div>
                    <p className="font-bold text-slate-900">{lang === 'ar' ? b.title_ar : b.title_en}</p>
                    <p className="text-xs text-slate-400">{b.placement}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={b.is_active ? 'emerald' : 'slate'}>{b.is_active ? t('admin.bannerActive', lang) : t('admin.bannerInactive', lang)}</Badge>
                    <button onClick={() => { setEditing(b); setShowAdd(true); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Icon name="Pencil" className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <BannerEdit banner={editing} onClose={() => { setShowAdd(false); setEditing(null); }} onSaved={load} />}
    </div>
  );
}

function BannerEdit({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => void }) {
  const { lang, dir } = useLang();
  const [titleAr, setTitleAr] = useState(banner?.title_ar ?? '');
  const [titleEn, setTitleEn] = useState(banner?.title_en ?? '');
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '');
  const [placement, setPlacement] = useState(banner?.placement ?? 'home_top');
  const [sortOrder, setSortOrder] = useState(banner?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const payload = { title_ar: titleAr, title_en: titleEn, image_url: imageUrl, placement, sort_order: sortOrder, is_active: isActive };
    const { error } = banner
      ? await supabase.from('banners').update(payload).eq('id', banner.id)
      : await supabase.from('banners').insert(payload);
    if (error) {
      console.error('[BannerEdit] save failed:', error.code, error.message, 'image_url length:', imageUrl.length);
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    console.log('[BannerEdit] save OK, image_url length:', imageUrl.length);
    setSaving(false);
    onSaved();
    onClose();
  };

  const remove = async () => {
    if (!banner) return;
    await supabase.from('banners').delete().eq('id', banner.id);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div dir={dir} className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl tj-slide-in flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-extrabold text-slate-900">{t('admin.banners', lang)}</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="X" className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="tj-label">{lang === 'ar' ? 'العنوان (عربي)' : 'Title (AR)'}</label>
              <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="tj-input" />
            </div>
            <div>
              <label className="tj-label">{lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (EN)'}</label>
              <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="tj-input" />
            </div>
          </div>
          <ImageUploader value={imageUrl} onChange={setImageUrl} label={t('admin.bannerImage', lang)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="tj-label">{t('admin.bannerPlacement', lang)}</label>
              <select value={placement} onChange={(e) => setPlacement(e.target.value)} className="tj-input">
                <option value="home_top">{lang === 'ar' ? 'أعلى الصفحة الرئيسية' : 'Home Top'}</option>
                <option value="home_mid">{lang === 'ar' ? 'منتصف الصفحة الرئيسية' : 'Home Middle'}</option>
                <option value="category_top">{lang === 'ar' ? 'أعلى صفحة القسم' : 'Category Top'}</option>
              </select>
            </div>
            <div>
              <label className="tj-label">{lang === 'ar' ? 'الترتيب' : 'Sort Order'}</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(+e.target.value)} className="tj-input" dir="ltr" />
            </div>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${isActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}
          >
            <span className="text-sm font-bold text-slate-700">{isActive ? t('admin.bannerActive', lang) : t('admin.bannerInactive', lang)}</span>
            <span className={`relative h-6 w-11 rounded-full transition ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: isActive ? '22px' : '2px' }} />
            </span>
          </button>
        </div>
        {saveError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{saveError}</div>
        )}
        <div className="flex gap-2 border-t border-slate-200 p-4">
          {banner && <Button variant="danger" onClick={remove}><Icon name="Trash2" className="h-4 w-4" /> {t('admin.delete', lang)}</Button>}
          <Button variant="ghost" onClick={onClose} className="flex-1">{t('booking.cancel', lang)}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !titleAr} className="flex-1">{saving ? t('common.loading', lang) : t('admin.save', lang)}</Button>
        </div>
      </div>
    </div>
  );
}

function PayoutLogs() {
  const { lang } = useLang();
  const [logs, setLogs] = useState<PayoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayoutLogs(100).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const totalSent = logs.reduce((sum, l) => sum + (l.status === 'completed' ? l.amount_sent_to_provider : 0), 0);
  const totalKept = logs.reduce((sum, l) => sum + (l.status === 'completed' ? l.platform_revenue_kept : 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="tj-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {lang === 'ar' ? 'إجمالي المدفوع للمزودين' : 'Total Sent to Providers'}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="Banknote" className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-emerald-600">{formatAed(totalSent)}</p>
        </div>
        <div className="tj-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {lang === 'ar' ? 'إجمالي إيراد المنصة' : 'Total Platform Revenue'}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon name="TrendingUp" className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-sky-600">{formatAed(totalKept)}</p>
        </div>
      </div>

      <div className="tj-card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-700">{t('admin.payoutLogs', lang)}</h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">{t('admin.noPayoutLogs', lang)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 text-start">{t('payout.orderId', lang)}</th>
                  <th className="px-4 py-3 text-start">{t('payout.amountSent', lang)}</th>
                  <th className="px-4 py-3 text-start">{t('payout.platformKept', lang)}</th>
                  <th className="px-4 py-3 text-start">{t('payout.status', lang)}</th>
                  <th className="px-4 py-3 text-start">{t('payout.date', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">#{log.order_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{formatAed(log.amount_sent_to_provider)}</td>
                    <td className="px-4 py-3 font-bold text-sky-600">{formatAed(log.platform_revenue_kept)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        log.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        log.status === 'failed' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {log.status === 'completed' ? t('payout.completed', lang) :
                         log.status === 'failed' ? t('payout.failed', lang) :
                         t('payout.pending', lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
