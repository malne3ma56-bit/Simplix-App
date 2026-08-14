import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { Icon } from '@/components/Icon';
import { formatAed } from '@/components/ui';
import type { Order } from '@/types';

const TIMEOUT_SECONDS = 60;

export function IncomingOrderModal({
  order,
  onAccept,
  onReject,
}: {
  order: Order;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { lang, dir } = useLang();
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const expiredRef = useRef(false);

  useEffect(() => {
    const expiry = Date.now() + TIMEOUT_SECONDS * 1000;
    const interval = setInterval(() => {
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onReject();
        }
      } else {
        setSecondsLeft(remaining);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [order.id, onReject]);

  const pct = (secondsLeft / TIMEOUT_SECONDS) * 100;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - pct / 100);
  const isUrgent = secondsLeft <= 10;

  return (
    <div dir={dir} className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl tj-slide-in">
        {/* Header bar */}
        <div className={`px-6 py-4 ${isUrgent ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Icon name="BellRing" className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-extrabold text-white">
                {lang === 'ar' ? 'طلب جديد!' : 'New Order!'}
              </p>
              <p className="text-xs text-white/80">
                {lang === 'ar' ? 'لديك 60 ثانية للقبول' : 'You have 60 seconds to accept'}
              </p>
            </div>
          </div>
        </div>

        {/* Countdown ring */}
        <div className="flex flex-col items-center pt-6">
          <div className="relative h-32 w-32">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={isUrgent ? '#dc2626' : '#059669'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.25s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-extrabold tabular-nums ${isUrgent ? 'text-red-600' : 'text-slate-900'}`}>
                {secondsLeft}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {lang === 'ar' ? 'ثانية' : 'seconds'}
              </span>
            </div>
          </div>
        </div>

        {/* Order details */}
        <div className="space-y-3 px-6 py-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {lang === 'ar' ? 'الخدمة' : 'Service'}
            </p>
            <p className="mt-1 text-base font-extrabold text-slate-900">{order.summary_ar}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {lang === 'ar' ? 'السعر' : 'Price'}
              </p>
              <p className="mt-1 text-xl font-extrabold text-emerald-600">{formatAed(order.price)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {lang === 'ar' ? 'طريقة الدفع' : 'Payment'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Icon name={order.payment_method === 'card' ? 'CreditCard' : 'Banknote'} className="h-4 w-4 text-slate-500" />
                {order.payment_method === 'card'
                  ? (lang === 'ar' ? 'بطاقة' : 'Card')
                  : (lang === 'ar' ? 'نقدي' : 'Cash')}
              </p>
            </div>
          </div>

          {order.address_text && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {lang === 'ar' ? 'الموقع' : 'Location'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Icon name="MapPin" className="h-4 w-4 shrink-0 text-slate-500" />
                {order.address_text}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onReject}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-base font-extrabold text-white transition hover:bg-red-700 active:scale-[0.98]"
          >
            <Icon name="X" className="h-5 w-5" />
            {lang === 'ar' ? 'رفض' : 'Reject'}
          </button>
          <button
            onClick={onAccept}
            className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-extrabold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Icon name="CheckCircle2" className="h-5 w-5" />
            {lang === 'ar' ? 'قبول الطلب' : 'Accept Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
