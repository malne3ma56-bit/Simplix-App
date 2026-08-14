import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge, formatAed, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { submitOrderRating, openDispute } from '@/lib/orders';
import { LiveOrderStepper } from '@/components/customer/LiveOrderStepper';
import type { Order, OrderStatus } from '@/types';

export function OrdersScreen({ orders: initial, onBack }: { orders: Order[]; onBack: () => void }) {
  const { lang, dir } = useLang();
  const [orders, setOrders] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initial);
    if (!selectedId && initial.length > 0) setSelectedId(initial[0].id);
  }, [initial]);

  useEffect(() => {
    const sub = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        (async () => {
          const { data: u } = await supabase.auth.getUser();
          if (!u.user) return;
          const { data } = await supabase.from('orders').select('*').eq('customer_id', u.user.id).order('created_at', { ascending: false });
          if (data) setOrders(data as Order[]);
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const selected = orders.find((o) => o.id === selectedId) ?? orders[0];

  if (orders.length === 0) {
    return (
      <div dir={dir} className="space-y-5">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
          <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" /> {t('common.back', lang)}
        </button>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon name="Package" className="h-7 w-7" />
          </div>
          <p className="font-bold text-slate-700">{t('order.noOrders', lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700">
        <Icon name="ArrowRight" className="h-4 w-4 rtl:rotate-180" /> {t('common.back', lang)}
      </button>
      <h1 className="text-xl font-extrabold text-slate-900">{t('nav.orders', lang)}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="space-y-2 lg:col-span-1">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSelectedId(o.id)}
              className={`w-full rounded-2xl border p-4 text-start transition ${selected?.id === o.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-bold text-slate-900">{o.summary_ar}</p>
                <StatusBadge status={o.status} lang={lang} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{formatAed(o.price)}</span>
                <span dir="ltr">#{o.id.slice(0, 8)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        {selected && <OrderDetail key={selected.id} order={selected} lang={lang} dir={dir} />}
      </div>
    </div>
  );
}

function OrderDetail({ order, lang, dir }: { order: Order; lang: 'ar'|'en'; dir: 'rtl'|'ltr' }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingDone, setRatingDone] = useState(order.customer_rating !== null);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeDone, setDisputeDone] = useState(order.dispute_status === 'opened' || order.dispute_status === 'resolved');

  const canRate = order.status === 'completed' && !ratingDone;
  const canDispute = order.status === 'completed' && order.dispute_status === 'none';

  const handleRate = async (stars: number) => {
    setSubmittingRating(true);
    const { error } = await submitOrderRating(order.id, stars);
    setSubmittingRating(false);
    if (!error) setRatingDone(true);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setSubmittingDispute(true);
    const { error } = await openDispute(order.id, disputeReason);
    setSubmittingDispute(false);
    if (!error) {
      setDisputeDone(true);
      setShowDispute(false);
    }
  };

  return (
    <div dir={dir} className="lg:col-span-2 space-y-4">
      <LiveOrderStepper order={order} />

      {/* Quality Control: Star Rating + Dispute — only for completed orders */}
      {order.status === 'completed' && (
        <div className="tj-card p-5 space-y-4">
          {/* Star Rating */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="Star" className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-extrabold text-slate-900">{t('qc.rateService', lang)}</p>
            </div>
            {ratingDone ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Icon
                      key={i}
                      name="Star"
                      className={`h-6 w-6 ${(order.customer_rating ?? 0) >= i ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <Badge color="emerald">
                  <Icon name="CheckCircle2" className="h-3 w-3" />
                  {t('qc.alreadyRated', lang)}
                </Badge>
              </div>
            ) : (
              <>
                <p className="mb-2 text-xs text-slate-500">{t('qc.ratePrompt', lang)}</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      disabled={submittingRating}
                      onClick={() => handleRate(i)}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition active:scale-90 disabled:opacity-50"
                    >
                      <Icon
                        name="Star"
                        className={`h-8 w-8 ${(hoverRating || 0) >= i ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dispute Section */}
          {order.dispute_status !== 'none' && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <Icon name="AlertCircle" className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-bold text-slate-700">{t('qc.disputeStatus', lang)}</p>
                <Badge color={order.dispute_status === 'opened' ? 'amber' : 'emerald'}>
                  {t(`qc.dispute${order.dispute_status.charAt(0).toUpperCase()}${order.dispute_status.slice(1)}`, lang)}
                </Badge>
              </div>
              {order.dispute_reason && (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-bold">{t('qc.disputeReason', lang)}: </span>
                  {order.dispute_reason}
                </p>
              )}
            </div>
          )}

          {canDispute && !showDispute && (
            <button
              onClick={() => setShowDispute(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-500 transition hover:border-red-300 hover:text-red-600"
            >
              <Icon name="AlertCircle" className="h-4 w-4" />
              {t('qc.reportIssue', lang)}
            </button>
          )}

          {showDispute && !disputeDone && (
            <div className="space-y-3 tj-fade-in">
              <div>
                <label className="tj-label">{t('qc.reportDesc', lang)}</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="tj-input min-h-[80px] resize-none"
                  placeholder={t('qc.reasonPlaceholder', lang)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDispute(false)}>
                  {t('booking.cancel', lang)}
                </Button>
                <Button variant="danger" size="sm" onClick={handleDispute} disabled={submittingDispute || !disputeReason.trim()}>
                  {submittingDispute ? t('common.loading', lang) : t('qc.submitDispute', lang)}
                </Button>
              </div>
            </div>
          )}

          {disputeDone && order.dispute_status === 'opened' && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">
              <Icon name="CheckCircle2" className="h-4 w-4" />
              {t('qc.disputeOpenedMsg', lang)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, lang }: { status: OrderStatus; lang: 'ar'|'en' }) {
  const colors: Partial<Record<OrderStatus, string>> = {
    pending: 'amber', pending_provider_approval: 'sky', accepted: 'sky',
    assigned: 'sky', on_the_way: 'violet', started: 'emerald',
    completed: 'emerald', cancelled: 'red', unassigned_requires_admin: 'red',
  };
  return <Badge color={colors[status] ?? 'slate'}>{t(`order.status.${status}`, lang)}</Badge>;
}
