import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, Badge, formatAed, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { lang, dir } = useLang();
  const { profile, refreshProfile } = useAuth();
  const { soundEnabled, toggleSound } = useNotifications();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address_text ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', profile?.id)
        .order('created_at', { ascending: false });
      setOrders((data ?? []) as Order[]);
      setLoadingHistory(false);
    })();
  }, [profile?.id]);

  const save = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, address_text: address })
      .eq('id', profile?.id);
    setSaving(false);
    setSaved(true);
    refreshProfile();
    setTimeout(() => setSaved(false), 2500);
  };

  const completed = orders.filter((o) => o.status === 'completed');
  const totalSpent = completed.reduce((sum, o) => sum + Number(o.price), 0);

  return (
    <div dir={dir} className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
        <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" />
        {t('common.back', lang)}
      </button>

      <h1 className="text-xl font-extrabold text-slate-900">{t('profile.title', lang)}</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="tj-card p-4 text-center">
          <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon name="Package" className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{orders.length}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('profile.totalOrders', lang)}</p>
        </div>
        <div className="tj-card p-4 text-center">
          <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icon name="CheckCircle2" className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{completed.length}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('profile.completedJobs', lang)}</p>
        </div>
        <div className="tj-card p-4 text-center">
          <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Icon name="Wallet" className="h-4 w-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{formatAed(totalSpent)}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('profile.totalSpent', lang)}</p>
        </div>
      </div>

      {/* Personal info */}
      <div className="tj-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon name="User" className="h-5 w-5 text-emerald-600" />
          <h2 className="font-extrabold text-slate-900">{t('profile.info', lang)}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="tj-label">{t('profile.fullName', lang)}</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="tj-input" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="tj-label">{t('profile.phone', lang)}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="tj-input" dir="ltr" />
            </div>
            <div>
              <label className="tj-label">{t('profile.email', lang)}</label>
              <input value={profile?.email ?? ''} disabled className="tj-input opacity-60" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="tj-label">{t('profile.address', lang)}</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="tj-input" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Icon name="Save" className="h-4 w-4" />}
              {t('profile.saveChanges', lang)}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 tj-fade-up">
                <Icon name="CheckCircle2" className="h-4 w-4" />
                {t('profile.saved', lang)}
              </span>
            )}
          </div>
          {profile && (
            <p className="text-xs text-slate-400">
              {t('profile.memberSince', lang)}: {new Date(profile.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}
            </p>
          )}
        </div>
      </div>

      {/* Referral & Wallet */}
      <div className="tj-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon name="Gift" className="h-5 w-5 text-navy-700" />
          <h2 className="font-extrabold text-slate-900">{t('referral.title', lang)}</h2>
        </div>

        {/* Wallet balance */}
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-navy-900 px-4 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <Icon name="Wallet" className="h-5 w-5 text-gold-400" />
            <span className="text-sm font-bold">{t('referral.wallet', lang)}</span>
          </div>
          <span className="text-lg font-extrabold tabular-nums">{formatAed(profile?.customer_wallet ?? 0)}</span>
        </div>

        <p className="mb-3 text-sm text-slate-500">{t('referral.desc', lang)}</p>

        {/* Referral code display + share */}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/40 px-4 py-3">
            <p className="text-xs font-bold text-slate-400">{t('referral.title', lang)}</p>
            <p className="font-mono text-lg font-extrabold tracking-wider text-navy-900" dir="ltr">
              {profile?.referral_code ?? '—'}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              if (profile?.referral_code) {
                navigator.clipboard?.writeText(profile.referral_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              }
            }}
          >
            <Icon name="Share2" className="h-4 w-4" />
            {t('referral.share', lang)}
          </Button>
        </div>

        {copied && (
          <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-600 tj-fade-up">
            <Icon name="CheckCircle2" className="h-4 w-4" />
            {t('referral.copied', lang)}
          </div>
        )}
      </div>

      {/* Sound Alerts Toggle */}
      <div className="tj-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="Volume2" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">{t('notif.soundAlerts', lang)}</p>
              <p className="text-xs text-slate-500">{t('notif.soundAlertsDesc', lang)}</p>
            </div>
          </div>
          <button
            onClick={toggleSound}
            className={`relative h-7 w-12 rounded-full transition ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: soundEnabled ? '24px' : '2px' }} />
          </button>
        </div>
      </div>

      {/* Saved cards placeholder */}
      <div className="tj-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="CreditCard" className="h-5 w-5 text-sky-600" />
            <h2 className="font-extrabold text-slate-900">{t('profile.cards', lang)}</h2>
          </div>
          <Button size="sm" variant="outline" disabled>
            <Icon name="Plus" className="h-4 w-4" /> {t('profile.addCard', lang)}
          </Button>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
          <Icon name="CreditCard" className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-bold text-slate-400">{t('profile.noCards', lang)}</p>
          <p className="mt-1 text-xs text-slate-400">{t('profile.cardsDesc', lang)}</p>
        </div>
      </div>

      {/* Financial history */}
      <div className="tj-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon name="Receipt" className="h-5 w-5 text-amber-600" />
          <h2 className="font-extrabold text-slate-900">{t('profile.history', lang)}</h2>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('profile.noHistory', lang)}</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-700">{o.summary_ar}</p>
                  <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-600">{formatAed(o.price)}</span>
                  <Badge color={o.status === 'completed' ? 'emerald' : o.status === 'cancelled' ? 'slate' : 'amber'}>
                    {t(`order.status.${o.status}`, lang)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
