import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge, Button, formatAed, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { fetchOrderEvents, updateOrderStatus } from '@/lib/orders';
import { useNotifications } from '@/context/NotificationContext';
import type { Order, OrderEvent, OrderStatus, Profile } from '@/types';

const STEP_FLOW: OrderStatus[] = ['pending', 'accepted', 'in_transit', 'in_progress', 'completed'];
const STEP_ICONS: Record<string, string> = {
  pending: 'Clock',
  accepted: 'CheckCircle2',
  in_transit: 'Navigation',
  in_progress: 'PlayCircle',
  completed: 'Flag',
};

// Legacy status -> canonical status mapping
const LEGACY_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  assigned: 'accepted',
  on_the_way: 'in_transit',
  started: 'in_progress',
};

function canonicalStatus(s: OrderStatus): OrderStatus {
  return LEGACY_MAP[s] ?? s;
}

function etaLabel(status: OrderStatus, lang: 'ar' | 'en'): string {
  const cs = canonicalStatus(status);
  if (status === 'cancelled') return t('order.eta.cancelled', lang);
  if (status === 'completed') return t('order.eta.done', lang);
  if (cs === 'in_progress') return t('order.eta.inProgress', lang);
  if (cs === 'in_transit') return t('order.eta.inTransit', lang);
  if (cs === 'accepted') return t('order.eta.waiting', lang);
  return t('order.eta.waiting', lang);
}

export function LiveOrderStepper({ order }: { order: Order }) {
  const { lang, dir } = useLang();
  const { pushNotification } = useNotifications();
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [prevStatus, setPrevStatus] = useState(order.status);

  useEffect(() => {
    setLoading(true);
    fetchOrderEvents(order.id).then((e) => {
      setEvents(e);
      setLoading(false);
    });
    const sub = supabase
      .channel(`live-stepper-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${order.id}` },
        (payload) => {
          setEvents((p) => [...p, payload.new as OrderEvent]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [order.id]);

  useEffect(() => {
    if (order.provider_id) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', order.provider_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProvider(data as Profile);
        });
    } else {
      setProvider(null);
    }
  }, [order.provider_id]);

  // Toast on status transition
  useEffect(() => {
    if (prevStatus !== order.status && order.status !== 'cancelled') {
      pushNotification({
        title: t('order.liveTracking', lang),
        message: t(`order.step.${canonicalStatus(order.status)}`, lang) + ' — #' + order.id.slice(0, 8),
        type: 'order',
        related_order_id: order.id,
      });
    }
    setPrevStatus(order.status);
  }, [order.status, prevStatus, lang, order.id, pushNotification]);

  const currentStatus = canonicalStatus(order.status);
  const currentIdx = STEP_FLOW.indexOf(currentStatus);
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';
  const canCancel = currentStatus === 'pending' || currentStatus === 'accepted';
  const canCall = !!provider?.phone && (currentStatus === 'accepted' || currentStatus === 'in_transit' || currentStatus === 'in_progress');

  const handleCancel = async () => {
    setCancelling(true);
    await updateOrderStatus(order.id, 'cancelled', lang === 'ar' ? 'ألغى العميل الطلب' : 'Customer cancelled the order');
    setCancelling(false);
  };

  const phoneHref = provider?.phone ? `tel:${provider.phone}` : undefined;

  return (
    <div dir={dir} className="space-y-4">
      {/* Main tracking card */}
      <div className="tj-card overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-600 to-emerald-600 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Icon name="Navigation" className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">{t('order.liveTracking', lang)}</p>
              <p className="text-xs text-white/70" dir="ltr">#{order.id.slice(0, 8)}</p>
            </div>
          </div>
          <Badge color={isCancelled ? 'red' : isCompleted ? 'emerald' : 'sky'}>
            {t(`order.status.${order.status}`, lang)}
          </Badge>
        </div>

        {/* Order summary */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{order.summary_ar}</p>
            <p className="mt-0.5 text-xs text-slate-400">{new Date(order.created_at).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-slate-400">{t('order.price', lang)}</p>
            <p className="text-lg font-extrabold text-emerald-600">{formatAed(order.price)}</p>
          </div>
        </div>

        {order.address_text && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Icon name="MapPin" className="h-4 w-4 shrink-0" />
            {order.address_text}
          </div>
        )}
      </div>

      {/* Stepper card */}
      <div className="tj-card p-5">
        {/* ETA banner */}
        <div
          className={`mb-4 flex items-center gap-2.5 rounded-xl px-4 py-3 ${
            isCancelled
              ? 'bg-red-50'
              : isCompleted
                ? 'bg-emerald-50'
                : 'bg-sky-50'
          }`}
        >
          <Icon
            name={isCancelled ? 'X' : isCompleted ? 'CheckCircle2' : 'Clock'}
            className={`h-5 w-5 shrink-0 ${
              isCancelled ? 'text-red-500' : isCompleted ? 'text-emerald-600' : 'text-sky-600'
            }`}
          />
          <div>
            <p className="text-xs font-bold text-slate-400">{t('order.eta', lang)}</p>
            <p
              className={`text-sm font-extrabold ${
                isCancelled ? 'text-red-600' : isCompleted ? 'text-emerald-700' : 'text-sky-700'
              }`}
            >
              {etaLabel(order.status, lang)}
            </p>
          </div>
        </div>

        {/* Stepper */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div
              className="absolute top-5 h-0.5 bg-slate-200"
              style={{ insetInlineStart: '6%', width: '88%' }}
            />
            <div
              className="absolute top-5 h-0.5 bg-emerald-400 transition-all duration-500"
              style={{
                insetInlineStart: '6%',
                width: isCancelled ? '0%' : `${(currentIdx / (STEP_FLOW.length - 1)) * 88}%`,
              }}
            />
            <div className="relative flex justify-between">
              {STEP_FLOW.map((s, i) => {
                const done = i < currentIdx && !isCancelled;
                const active = i === currentIdx && !isCancelled;
                const ev = events.find((e) => canonicalStatus(e.status as OrderStatus) === s);
                return (
                  <div key={s} className="flex flex-col items-center gap-2" style={{ width: '20%' }}>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : active
                            ? 'border-sky-500 bg-white text-sky-600 ring-4 ring-sky-200 tj-pulse'
                            : isCancelled
                              ? 'border-slate-200 bg-slate-50 text-slate-300'
                              : 'border-slate-200 bg-white text-slate-300'
                      }`}
                    >
                      <Icon
                        name={done ? 'CheckCircle2' : STEP_ICONS[s]}
                        className="h-5 w-5"
                      />
                    </div>
                    <p
                      className={`text-center text-[10px] font-bold leading-tight ${
                        done || active ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {t(`order.step.${s}`, lang)}
                    </p>
                    {ev && <p className="text-[9px] text-slate-400">{new Date(ev.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-AE' : 'en-AE')}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            <Icon name="X" className="h-5 w-5" />
            {t('order.status.cancelled', lang)}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        {canCall && (
          <a href={phoneHref} className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              <Icon name="Phone" className="h-5 w-5" />
              {t('order.callProvider', lang)}
            </Button>
          </a>
        )}
        {canCancel && (
          <Button
            variant="danger"
            size="lg"
            className={canCall ? 'flex-1' : 'w-full'}
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? <Spinner className="h-5 w-5" /> : <Icon name="X" className="h-5 w-5" />}
            {t('order.cancelOrder', lang)}
          </Button>
        )}
        {!canCall && !canCancel && !isCancelled && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">
            <Icon name="Clock" className="h-4 w-4" />
            {etaLabel(order.status, lang)}
          </div>
        )}
      </div>
    </div>
  );
}
