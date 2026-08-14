import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/hooks/useCatalog';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { AppShell } from '@/components/AppShell';
import { Button, Badge, formatAed, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { updateOrderStatus, executeMarketplaceSplit, fetchProviderPayouts } from '@/lib/orders';
import { IncomingOrderModal } from '@/components/provider/IncomingOrderModal';
import { ProviderOrderTracker } from '@/components/provider/ProviderOrderTracker';
import { useNotifications } from '@/context/NotificationContext';
import type { Order, OrderStatus, Category, PayoutLog } from '@/types';

export function ProviderApp() {
  const { lang, dir } = useLang();
  const { profile, refreshProfile } = useAuth();
  const { categories, services } = useCatalog();
  const { playIncomingOrderSound, stopIncomingOrderSound, pushNotification, soundEnabled, toggleSound } = useNotifications();
  const [available, setAvailable] = useState(profile?.available ?? false);
  const [incoming, setIncoming] = useState<Order[]>([]);
  const [myJobs, setMyJobs] = useState<Order[]>([]);
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [ibanInput, setIbanInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState<'daily' | 'weekly'>('weekly');
  const [savingIban, setSavingIban] = useState(false);
  const [ibanMsg, setIbanMsg] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutLog[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const specialty = categories.find((c) => c.id === profile?.provider_category_id) ?? null;

  async function loadOrders() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [inc, mine, disp] = await Promise.all([
      supabase.from('orders').select('*, service:services(*)').is('provider_id', null).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, service:services(*)').eq('provider_id', u.user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, service:services(*)').eq('current_provider_id', u.user.id).eq('status', 'pending_provider_approval').maybeSingle(),
    ]);
    let incList = (inc.data ?? []) as any[];
    if (specialty) incList = incList.filter((o) => o.category_id === specialty.id || o.service?.category_id === specialty.id);
    setIncoming(incList as unknown as Order[]);
    setMyJobs((mine.data ?? []) as unknown as Order[]);
    setDispatchOrder((disp.data ?? null) as unknown as Order | null);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    const sub = supabase
      .channel('provider-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [specialty?.id]);

  useEffect(() => {
    setIbanInput(profile?.bank_iban ?? '');
    setScheduleInput(profile?.payout_schedule ?? 'weekly');
  }, [profile?.bank_iban, profile?.payout_schedule]);

  useEffect(() => {
    if (!profile?.id) return;
    setLoadingPayouts(true);
    fetchProviderPayouts(profile.id).then((logs) => {
      setPayouts(logs);
      setLoadingPayouts(false);
    });
  }, [profile?.id, myJobs.length]);

  // Play/stop the incoming-order chime when a dispatch order arrives or leaves
  useEffect(() => {
    if (dispatchOrder) {
      playIncomingOrderSound();
    } else {
      stopIncomingOrderSound();
    }
    return () => stopIncomingOrderSound();
  }, [dispatchOrder?.id]);

  const toggleAvailable = async () => {
    setToggling(true);
    const next = !available;
    await supabase.from('profiles').update({ available: next }).eq('id', profile?.id);
    setAvailable(next);
    setToggling(false);
    refreshProfile();
  };

  const acceptDispatch = async (o: Order) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from('orders').update({
      provider_id: u.user.id,
      current_provider_id: null,
      status: 'assigned',
    }).eq('id', o.id);
    await supabase.from('order_events').insert({
      order_id: o.id, status: 'assigned', note: 'قبل المزود الطلب', created_by: u.user.id,
    });
    setDispatchOrder(null);
    stopIncomingOrderSound();
    loadOrders();
  };

  const rejectDispatch = async (o: Order) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: fresh } = await supabase.from('orders').select('rejected_by').eq('id', o.id).single();
    const rejectedBy = [...new Set([...(fresh?.rejected_by ?? []), u.user.id])];
    await supabase.from('orders').update({
      current_provider_id: null,
      rejected_by: rejectedBy,
      status: 'pending',
    }).eq('id', o.id);
    await supabase.from('order_events').insert({
      order_id: o.id, status: 'pending', note: 'رفض المزود الطلب - إعادة التوجيه', created_by: u.user.id,
    });
    setDispatchOrder(null);
    stopIncomingOrderSound();
    loadOrders();
  };

  const claim = async (o: Order) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await updateOrderStatus(o.id, 'assigned', 'قبل المزود الطلب', u.user.id);
    loadOrders();
  };

  const setStatus = async (o: Order, status: OrderStatus) => {
    const notes: Record<OrderStatus, string> = {
      pending: '', pending_provider_approval: '', accepted: 'تم قبول الطلب',
      assigned: '', on_the_way: 'المزود في الطريق', in_transit: 'المزود في الطريق',
      in_progress: 'بدأت الخدمة', started: 'بدأت الخدمة',
      completed: 'اكتملت الخدمة', cancelled: 'إلغاء', unassigned_requires_admin: 'لم يتم العثور على مزود',
    };
    await updateOrderStatus(o.id, status, notes[status]);
    if ((status === 'on_the_way' || status === 'in_transit') && o.customer_id) {
      await supabase.from('notifications').insert({
        user_id: o.customer_id,
        title: lang === 'ar' ? 'المزود في الطريق!' : 'Provider is on the way!',
        message: lang === 'ar' ? 'قبل المزود طلبك وسيصل قريباً' : 'Your provider accepted the order and is heading to you',
        type: 'order',
        related_order_id: o.id,
      });
    }
    if ((status === 'started' || status === 'in_progress') && o.customer_id) {
      await supabase.from('notifications').insert({
        user_id: o.customer_id,
        title: lang === 'ar' ? 'بدأت الخدمة!' : 'Service Started!',
        message: lang === 'ar' ? 'بدأ المزود في تنفيذ الخدمة' : 'Your provider has started the service',
        type: 'order',
        related_order_id: o.id,
      });
    }
    if (status === 'completed' && o.customer_id) {
      await supabase.from('notifications').insert({
        user_id: o.customer_id,
        title: lang === 'ar' ? 'اكتملت الخدمة!' : 'Service Completed!',
        message: lang === 'ar' ? 'يرجى تقييم مزود الخدمة' : 'Please rate your provider',
        type: 'order',
        related_order_id: o.id,
      });
    }
    loadOrders();
  };

  const activeJobs = myJobs.filter((o) => !['completed', 'cancelled'].includes(o.status));

  const walletBalance = profile?.wallet_balance ?? 0;
  const creditLimit = profile?.negative_credit_limit ?? -200;
  const isBlocked = profile?.status === 'blocked';
  const isNearLimit = !isBlocked && walletBalance <= creditLimit * 0.5;

  if (!specialty && profile?.role === 'provider') {
    return (
      <AppShell title={t('provider.title', lang)} showCopilot={false}>
        <div className="tj-card mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Icon name="AlertCircle" className="h-7 w-7" />
          </div>
          <p className="font-bold text-slate-900">{lang === 'ar' ? 'لم يتم تعيين تخصصك بعد' : 'No specialty assigned yet'}</p>
          <p className="mt-1 text-sm text-slate-500">{lang === 'ar' ? 'سيقوم المشرف بتعيين تخصصك قريباً.' : 'An admin will assign your specialty soon.'}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('provider.title', lang)} showCopilot={false}>
      <div dir={dir} className="space-y-5">
        {/* Wallet warning banner */}
        {(isBlocked || isNearLimit) && (
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isBlocked ? 'bg-red-600 text-white' : 'bg-amber-50 text-amber-800'}`}>
            <Icon name="AlertTriangle" className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold">
              {isBlocked
                ? (lang === 'ar' ? 'الحساب محظور - يرجى تسوية المستحقات' : 'Account Blocked - Please settle your dues')
                : (lang === 'ar' ? 'رصيد المحفظة يقترب من الحد الأدنى' : 'Wallet balance nearing the limit')}
            </p>
          </div>
        )}

        {/* Availability + stats + wallet */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="tj-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('provider.specialty', lang)}</p>
                <p className="text-lg font-extrabold text-slate-900">{specialty ? (lang === 'ar' ? specialty.name_ar : specialty.name_en) : '-'}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${available ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Icon name={available ? 'CheckCircle2' : 'Circle'} className="h-6 w-6" />
              </div>
            </div>
            <button
              onClick={toggleAvailable}
              disabled={toggling}
              className={`mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${available ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                {toggling ? <Spinner className="h-4 w-4" /> : <Icon name="Activity" className={`h-5 w-5 ${available ? 'text-emerald-600' : 'text-slate-400'}`} />}
                {available ? t('provider.available', lang) : t('provider.offline', lang)}
              </span>
              <span className={`relative h-6 w-11 rounded-full transition ${available ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: available ? '22px' : '2px' }} />
              </span>
            </button>
          </div>

          <div className="tj-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('provider.rating', lang)}</p>
            <div className="mt-2 flex items-center gap-2">
              <Icon name="Star" className="h-7 w-7 text-amber-400" />
              <span className="text-3xl font-extrabold text-slate-900">{profile?.rating_avg?.toFixed(1) ?? '0.0'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{profile?.rating_count ?? 0} {lang === 'ar' ? 'تقييم' : 'ratings'}</p>
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="tj-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {lang === 'ar' ? 'محفظتي' : 'My Wallet'}
            </p>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${walletBalance < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Icon name="Wallet" className="h-5 w-5" />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-extrabold tabular-nums ${walletBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatAed(walletBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {lang === 'ar' ? 'حد الائتمان' : 'Credit limit'}: {formatAed(creditLimit)}
          </p>
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

        {/* Bank Account (IBAN) Linking */}
        <div className="tj-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {t('provider.linkBank', lang)}
            </p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon name="Building2" className="h-5 w-5" />
            </div>
          </div>

          {profile?.bank_iban && !ibanMsg ? (
            <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <Icon name="CheckCircle2" className="h-4 w-4" />
                {t('provider.ibanLinked', lang)}
              </div>
              <p className="mt-1 font-mono text-xs text-emerald-600">{profile.bank_iban}</p>
              <p className="mt-1 text-xs text-emerald-500">
                {t('provider.payoutSchedule', lang)}: {profile.payout_schedule === 'daily' ? t('provider.daily', lang) : t('provider.weekly', lang)}
              </p>
              <button
                onClick={() => setIbanMsg('edit')}
                className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                {lang === 'ar' ? 'تعديل' : 'Edit'}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {ibanMsg && ibanMsg !== 'edit' && ibanMsg !== 'saved' && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  <Icon name="CheckCircle2" className="h-4 w-4" />
                  {ibanMsg}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{t('provider.iban', lang)}</label>
                <input
                  type="text"
                  value={ibanInput}
                  onChange={(e) => setIbanInput(e.target.value)}
                  placeholder={t('provider.ibanPlaceholder', lang)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{t('provider.payoutSchedule', lang)}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScheduleInput('daily')}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${scheduleInput === 'daily' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {t('provider.daily', lang)}
                  </button>
                  <button
                    onClick={() => setScheduleInput('weekly')}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${scheduleInput === 'weekly' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {t('provider.weekly', lang)}
                  </button>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={savingIban || !ibanInput.trim()}
                onClick={async () => {
                  setSavingIban(true);
                  setIbanMsg(null);
                  const { error } = await supabase
                    .from('profiles')
                    .update({ bank_iban: ibanInput.trim(), payout_schedule: scheduleInput })
                    .eq('id', profile?.id);
                  setSavingIban(false);
                  if (!error) {
                    setIbanMsg(t('provider.ibanSaved', lang));
                    refreshProfile();
                    setTimeout(() => setIbanMsg(null), 3000);
                  }
                }}
              >
                {savingIban ? <Spinner className="h-4 w-4" /> : <Icon name="Save" className="h-4 w-4" />}
                {t('provider.saveIban', lang)}
              </Button>
            </div>
          )}
        </div>

        {/* Incoming */}
        <div>
          <h2 className="tj-section-title mb-3 flex items-center gap-2">
            <Icon name="Bell" className="h-5 w-5 text-sky-500" />
            {t('provider.incoming', lang)}
            {incoming.length > 0 && <Badge color="sky">{incoming.length}</Badge>}
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : incoming.length === 0 ? (
            <div className="tj-card p-8 text-center text-sm text-slate-500">{t('provider.noJobs', lang)}</div>
          ) : (
            <div className="space-y-3">
              {incoming.map((o) => (
                <div key={o.id} className="tj-card p-4 tj-fade-up">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{o.summary_ar}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatAed(o.price)} · {new Date(o.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                      {o.address_text && <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Icon name="MapPin" className="h-3 w-3" /> {o.address_text}</p>}
                    </div>
                    <Button variant="primary" size="sm" onClick={() => claim(o)}>
                      <Icon name="CheckCircle2" className="h-4 w-4" /> {t('provider.claim', lang)}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My active jobs */}
        <div>
          <h2 className="tj-section-title mb-3 flex items-center gap-2">
            <Icon name="Briefcase" className="h-5 w-5 text-emerald-500" />
            {t('provider.myJobs', lang)}
          </h2>
          {activeJobs.length === 0 ? (
            <div className="tj-card p-8 text-center text-sm text-slate-500">{t('provider.noJobs', lang)}</div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((o) => (
                <ProviderOrderTracker key={o.id} order={o} onStatusChange={(s) => setStatus(o, s)} />
              ))}
            </div>
          )}
        </div>

        {/* History */}
        {myJobs.length > activeJobs.length && (
          <div>
            <h2 className="tj-section-title mb-3">{lang === 'ar' ? 'السجل' : 'History'}</h2>
            <div className="space-y-2">
              {myJobs.filter((o) => ['completed','cancelled'].includes(o.status)).slice(0, 10).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="truncate text-sm font-bold text-slate-700">{o.summary_ar}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatAed(o.price)}</span>
                    <StatusBadge status={o.status} lang={lang} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout History */}
        <div>
          <h2 className="tj-section-title mb-3 flex items-center gap-2">
            <Icon name="Banknote" className="h-5 w-5 text-emerald-500" />
            {t('provider.payoutHistory', lang)}
          </h2>
          {loadingPayouts ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : payouts.length === 0 ? (
            <div className="tj-card p-6 text-center text-sm text-slate-500">{t('provider.noPayouts', lang)}</div>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-700">
                      {t('payout.orderId', lang)}: #{p.order_id.slice(0, 8)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString(lang === 'ar' ? 'ar-AE' : 'en-AE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <p className="text-sm font-bold text-emerald-600">+{formatAed(p.amount_sent_to_provider)}</p>
                      <p className="text-xs text-slate-400">{t('payout.completed', lang)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incoming dispatch modal - 60 second timer */}
      {dispatchOrder && (
        <IncomingOrderModal
          order={dispatchOrder}
          onAccept={() => acceptDispatch(dispatchOrder)}
          onReject={() => rejectDispatch(dispatchOrder)}
        />
      )}
    </AppShell>
  );
}

function StatusBadge({ status, lang }: { status: OrderStatus; lang: 'ar'|'en' }) {
  const colors: Partial<Record<OrderStatus, string>> = {
    pending: 'amber', pending_provider_approval: 'sky', accepted: 'sky',
    assigned: 'sky', on_the_way: 'violet', in_transit: 'violet', in_progress: 'emerald',
    started: 'emerald', completed: 'emerald', cancelled: 'red', unassigned_requires_admin: 'red',
  };
  return <Badge color={colors[status] ?? 'slate'}>{t(`order.status.${status}`, lang)}</Badge>;
}
