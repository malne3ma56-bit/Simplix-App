import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge, Button, formatAed, Spinner } from '@/components/ui';
import type { Order, OrderStatus } from '@/types';

const STEP_FLOW: OrderStatus[] = ['accepted', 'in_transit', 'in_progress', 'completed'];
const STEP_ICONS: Record<string, string> = {
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

export function ProviderOrderTracker({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (status: OrderStatus) => Promise<void>;
}) {
  const { lang, dir } = useLang();
  const [busy, setBusy] = useState(false);

  const currentStatus = canonicalStatus(order.status);
  const currentIdx = STEP_FLOW.indexOf(currentStatus);
  const isCancelled = order.status === 'cancelled';

  const handleAdvance = async (next: OrderStatus) => {
    setBusy(true);
    await onStatusChange(next);
    setBusy(false);
  };

  const actionButton = (() => {
    if (isCancelled || busy) return null;
    if (currentStatus === 'accepted') {
      return (
        <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={() => handleAdvance('in_transit')}>
          <Icon name="Navigation" className="h-5 w-5" />
          {t('provider.startJourney', lang)}
        </Button>
      );
    }
    if (currentStatus === 'in_transit') {
      return (
        <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={() => handleAdvance('in_progress')}>
          <Icon name="PlayCircle" className="h-5 w-5" />
          {t('provider.startService', lang)}
        </Button>
      );
    }
    if (currentStatus === 'in_progress') {
      return (
        <Button variant="accent" size="lg" className="w-full" disabled={busy} onClick={() => handleAdvance('completed')}>
          <Icon name="Flag" className="h-5 w-5" />
          {t('provider.completeService', lang)}
        </Button>
      );
    }
    return null;
  })();

  return (
    <div dir={dir} className="tj-card overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-navy-900 to-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Icon name="Briefcase" className="h-5 w-5 text-gold-400" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white">{t('provider.currentStep', lang)}</p>
            <p className="text-xs text-white/60" dir="ltr">#{order.id.slice(0, 8)}</p>
          </div>
        </div>
        <Badge color={isCancelled ? 'red' : 'emerald'}>
          {t(`order.status.${order.status}`, lang)}
        </Badge>
      </div>

      {/* Order summary */}
      <div className="space-y-3 px-5 py-4">
        <p className="font-bold text-slate-900">{order.summary_ar}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t('order.price', lang)}</span>
          <span className="font-extrabold text-emerald-600">{formatAed(order.price)}</span>
        </div>
        {order.address_text && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Icon name="MapPin" className="h-4 w-4 shrink-0" />
            {order.address_text}
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div className="border-t border-slate-100 px-5 py-4">
        <div className="relative flex items-start justify-between">
          {STEP_FLOW.map((s, i) => {
            const done = i < currentIdx && !isCancelled;
            const active = i === currentIdx && !isCancelled;
            return (
              <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-sky-500 text-white ring-4 ring-sky-200 tj-pulse'
                        : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  <Icon name={done ? 'CheckCircle2' : STEP_ICONS[s]} className="h-4 w-4" />
                </div>
                <p
                  className={`text-center text-[10px] font-bold leading-tight ${
                    done || active ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {t(`order.step.${s}`, lang)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action button */}
      {actionButton && (
        <div className="border-t border-slate-100 px-5 py-4">
          {busy ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner className="h-5 w-5 text-sky-500" />
              <span className="text-sm font-bold text-slate-500">{t('common.loading', lang)}</span>
            </div>
          ) : (
            actionButton
          )}
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4 text-sm font-bold text-red-600">
          <Icon name="X" className="h-4 w-4" />
          {t('order.status.cancelled', lang)}
        </div>
      )}
    </div>
  );
}
