import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, Badge, formatAed, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPackage, ComplementaryService, Service } from '@/types';

type SubTab = 'packages' | 'complementary';

export function MarketingManager() {
  const { lang, dir } = useLang();
  const [subTab, setSubTab] = useState<SubTab>('packages');

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
          <Icon name="Sparkle" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">{t('admin.marketing', lang)}</h2>
          <p className="text-sm text-slate-500">{lang === 'ar' ? 'إدارة الباقات والخدمات المكملة' : 'Manage packages and complementary services'}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setSubTab('packages')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${subTab === 'packages' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
        >
          {t('admin.packages', lang)}
        </button>
        <button
          onClick={() => setSubTab('complementary')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${subTab === 'complementary' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}
        >
          {t('admin.complementary', lang)}
        </button>
      </div>

      {subTab === 'packages' && <PackagesManager />}
      {subTab === 'complementary' && <ComplementaryManager />}
    </div>
  );
}

// ===================== Packages Manager =====================

function PackagesManager() {
  const { lang, dir } = useLang();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SubscriptionPackage | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('subscription_packages').select('*').order('sort_order', { ascending: true });
    setPackages((data ?? []) as SubscriptionPackage[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deletePkg(id: string) {
    await supabase.from('subscription_packages').delete().eq('id', id);
    load();
  }

  async function toggleActive(pkg: SubscriptionPackage) {
    await supabase.from('subscription_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-navy-900" /></div>;

  return (
    <div dir={dir} className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Icon name="Plus" className="h-4 w-4" />
          {lang === 'ar' ? 'إضافة باقة' : 'Add Package'}
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="tj-card p-12 text-center text-slate-500">{t('admin.noPackages', lang)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`relative rounded-2xl border p-5 ${pkg.is_popular ? 'border-navy-900 shadow-md' : 'border-slate-100'}`}>
              {pkg.is_popular && (
                <div className="absolute -top-2.5 start-4">
                  <Badge color="navy"><Icon name="Crown" className="h-3 w-3" />{t('home.popular', lang)}</Badge>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${pkg.is_popular ? 'bg-navy-900 text-gold-400' : 'bg-slate-100 text-navy-700'}`}>
                    <Icon name={pkg.is_popular ? 'Crown' : 'Gem'} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-navy-900">{lang === 'ar' ? pkg.name_ar : pkg.name_en}</p>
                    <p className="text-xs text-slate-500">{formatAed(pkg.price)} · {pkg.billing_cycle}</p>
                  </div>
                </div>
                <Badge color={pkg.is_active ? 'emerald' : 'slate'}>
                  {pkg.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'موقوف' : 'Paused')}
                </Badge>
              </div>

              <p className="mt-3 line-clamp-2 text-xs text-slate-500">{lang === 'ar' ? pkg.description_ar : pkg.description_en}</p>

              <ul className="mt-3 space-y-1">
                {(pkg.features ?? []).slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Icon name="Check" className="h-3 w-3 text-navy-700" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(pkg); setShowForm(true); }}>
                  <Icon name="Pencil" className="h-3.5 w-3.5" />{t('common.edit', lang)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(pkg)}>
                  <Icon name={pkg.is_active ? 'EyeOff' : 'Eye'} className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => deletePkg(pkg.id)}>
                  <Icon name="Trash2" className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PackageForm
          pkg={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function PackageForm({ pkg, onClose, onSaved }: { pkg: SubscriptionPackage | null; onClose: () => void; onSaved: () => void }) {
  const { lang, dir } = useLang();
  const [nameAr, setNameAr] = useState(pkg?.name_ar ?? '');
  const [nameEn, setNameEn] = useState(pkg?.name_en ?? '');
  const [descAr, setDescAr] = useState(pkg?.description_ar ?? '');
  const [descEn, setDescEn] = useState(pkg?.description_en ?? '');
  const [price, setPrice] = useState(pkg?.price ?? 199);
  const [cycle, setCycle] = useState<'monthly' | 'quarterly' | 'yearly' | 'one_time'>(pkg?.billing_cycle ?? 'monthly');
  const [features, setFeatures] = useState((pkg?.features ?? []).join('\n'));
  const [isPopular, setIsPopular] = useState(pkg?.is_popular ?? false);
  const [sortOrder, setSortOrder] = useState(pkg?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const cycles: [string, string][] = [
    ['monthly', t('admin.monthly', lang)],
    ['quarterly', t('admin.quarterly', lang)],
    ['yearly', t('admin.yearly', lang)],
    ['one_time', t('admin.oneTime', lang)],
  ];

  async function save() {
    setSaving(true);
    const slug = (nameEn || nameAr).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const payload = {
      slug,
      name_ar: nameAr,
      name_en: nameEn || nameAr,
      description_ar: descAr,
      description_en: descEn || descAr,
      price: Number(price),
      billing_cycle: cycle,
      features: features.split('\n').filter(Boolean),
      is_popular: isPopular,
      is_active: true,
      sort_order: Number(sortOrder),
      color: 'navy',
    };
    if (pkg) {
      await supabase.from('subscription_packages').update(payload).eq('id', pkg.id);
    } else {
      await supabase.from('subscription_packages').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div dir={dir} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl tj-slide-in max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-extrabold text-navy-900">{pkg ? t('common.edit', lang) : (lang === 'ar' ? 'إضافة باقة' : 'Add Package')}</h3>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="X" className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="tj-label">{t('admin.packageName', lang)} (AR)</label>
              <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="tj-input" />
            </div>
            <div>
              <label className="tj-label">{t('admin.packageName', lang)} (EN)</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="tj-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="tj-label">{lang === 'ar' ? 'الوصف' : 'Description'} (AR)</label>
              <textarea value={descAr} onChange={(e) => setDescAr(e.target.value)} className="tj-input min-h-[70px] resize-none" />
            </div>
            <div>
              <label className="tj-label">{lang === 'ar' ? 'الوصف' : 'Description'} (EN)</label>
              <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} className="tj-input min-h-[70px] resize-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="tj-label">{t('admin.packagePrice', lang)}</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="tj-input" />
            </div>
            <div>
              <label className="tj-label">{t('admin.packageCycle', lang)}</label>
              <select value={cycle} onChange={(e) => setCycle(e.target.value as any)} className="tj-input">
                {cycles.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="tj-label">{t('admin.packageFeatures', lang)}</label>
            <textarea value={features} onChange={(e) => setFeatures(e.target.value)} className="tj-input min-h-[100px] resize-none" placeholder={lang === 'ar' ? 'ميزة 1\nميزة 2' : 'Feature 1\nFeature 2'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3.5 cursor-pointer">
              <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="h-4 w-4 accent-navy-900" />
              <span className="text-sm font-bold text-navy-900">{t('admin.packagePopular', lang)}</span>
            </label>
            <div>
              <label className="tj-label">{lang === 'ar' ? 'الترتيب' : 'Sort Order'}</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="tj-input" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Button variant="ghost" onClick={onClose} className="flex-1">{t('booking.cancel', lang)}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !nameAr} className="flex-1">
            {saving ? <Spinner className="h-4 w-4" /> : t('common.save', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== Complementary Services Manager =====================

function ComplementaryManager() {
  const { lang, dir } = useLang();
  const [links, setLinks] = useState<ComplementaryService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryId, setPrimaryId] = useState('');
  const [compId, setCompId] = useState('');

  async function load() {
    setLoading(true);
    const [linkRes, svcRes] = await Promise.all([
      supabase.from('complementary_services').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('name_ar', { ascending: true }),
    ]);
    setLinks((linkRes.data ?? []) as ComplementaryService[]);
    setServices((svcRes.data ?? []) as Service[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addLink() {
    if (!primaryId || !compId || primaryId === compId) return;
    await supabase.from('complementary_services').insert({
      primary_service_id: primaryId,
      complementary_service_id: compId,
      sort_order: 0,
    });
    setPrimaryId(''); setCompId('');
    load();
  }

  async function removeLink(id: string) {
    await supabase.from('complementary_services').delete().eq('id', id);
    load();
  }

  const svcName = (id: string) => {
    const s = services.find((x) => x.id === id);
    return s ? (lang === 'ar' ? s.name_ar : s.name_en) : id;
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-navy-900" /></div>;

  return (
    <div dir={dir} className="space-y-5">
      {/* Add new link */}
      <div className="tj-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="Link2" className="h-4 w-4 text-navy-700" />
          <p className="text-sm font-extrabold text-navy-900">{t('admin.linkComplementary', lang)}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="tj-label">{t('admin.primaryService', lang)}</label>
            <select value={primaryId} onChange={(e) => setPrimaryId(e.target.value)} className="tj-input">
              <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
              {services.map((s) => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
            </select>
          </div>
          <div>
            <label className="tj-label">{t('admin.complementaryService', lang)}</label>
            <select value={compId} onChange={(e) => setCompId(e.target.value)} className="tj-input">
              <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
              {services.filter((s) => s.id !== primaryId).map((s) => <option key={s.id} value={s.id}>{lang === 'ar' ? s.name_ar : s.name_en}</option>)}
            </select>
          </div>
        </div>
        <Button size="sm" onClick={addLink} disabled={!primaryId || !compId}>
          <Icon name="Plus" className="h-4 w-4" />
          {t('admin.linkComplementary', lang)}
        </Button>
      </div>

      {/* Existing links */}
      {links.length === 0 ? (
        <div className="tj-card p-12 text-center text-slate-500">{t('admin.noComplementary', lang)}</div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-navy-700">
                  <Icon name="Package" className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-900">{svcName(link.primary_service_id)}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon name="ArrowLeft" className="h-3 w-3" />
                    <span className="truncate">{svcName(link.complementary_service_id)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeLink(link.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                <Icon name="Trash2" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
