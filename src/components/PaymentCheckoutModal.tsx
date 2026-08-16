import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { Icon } from '@/components/Icon';
import { formatAed } from '@/components/ui';
import { applyPromoCode } from '@/lib/pricing';
import { t } from '@/lib/i18n';
import type { PriceBreakdown } from '@/lib/pricing';

export type PaymentMethod = 'card' | 'apple_pay' | 'cash';

export type CheckoutResult = {
  method: 'card' | 'cash';
  finalTotal: number;
  discountAmount: number;
  surgeMultiplier: number;
  promoCode: string | null;
};

export function PaymentCheckoutModal({
  open, onClose, breakdown, onConfirm, surgeMultiplier = 1.0, surgeLabel = '',
}: {
  open: boolean;
  onClose: () => void;
  breakdown: PriceBreakdown;
  onConfirm: (result: CheckoutResult) => Promise<void>;
  surgeMultiplier?: number;
  surgeLabel?: string;
}) {
  const { lang, dir } = useLang();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number; message: string; code: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const baseTotal = breakdown.total;
  const discountAmount = promoResult?.valid ? promoResult.discount : 0;
  const finalTotal = Math.round((baseTotal - discountAmount) * 100) / 100;
  const isSurge = surgeMultiplier > 1.0;

  const isCardValid =
    cardNumber.replace(/\s/g, '').length >= 15 &&
    expiry.length >= 4 &&
    cvv.length >= 3 &&
    cardName.trim().length >= 2;

  const canPay = method === 'cash' || method === 'apple_pay' || (method === 'card' && isCardValid);

  if (!open) return null;

  const formatCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    if (!canPay || processing) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    const payloadMethod: 'card' | 'cash' = method === 'cash' ? 'cash' : 'card';
    await onConfirm({
      method: payloadMethod,
      finalTotal,
      discountAmount,
      surgeMultiplier,
      promoCode: promoResult?.valid ? promoResult.code : null,
    });
    setProcessing(false);
  };

  const handleClose = () => {
    if (processing) return;
    onClose();
  };

  const opts: { key: PaymentMethod; labelAr: string; labelEn: string; icon: string; descAr: string; descEn: string }[] = [
    { key: 'card', labelAr: 'بطاقة ائتمان / خصم', labelEn: 'Credit / Debit Card', icon: 'CreditCard', descAr: 'فيزا، ماستركارد', descEn: 'Visa, Mastercard' },
    { key: 'apple_pay', labelAr: 'Apple Pay', labelEn: 'Apple Pay', icon: 'Apple', descAr: 'ادفع بنقرة واحدة', descEn: 'Pay with one tap' },
    { key: 'cash', labelAr: 'نقدي', labelEn: 'Cash', icon: 'Banknote', descAr: 'ادفع للمزود عند الاستلام', descEn: 'Pay the provider on arrival' },
  ];

  return (
    <div dir={dir} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl tj-slide-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
              <Icon name="Lock" className="h-4 w-4" />
            </div>
            <h3 className="text-base font-extrabold text-navy-900">
              {lang === 'ar' ? 'بوابة الدفع' : 'Payment Gateway'}
            </h3>
          </div>
          <button onClick={handleClose} disabled={processing} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        {processing ? (
          <div className="flex flex-col items-center justify-center gap-4 p-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-50">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy-900" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-navy-900">
                {lang === 'ar' ? 'جاري معالجة الدفع...' : 'Processing Payment...'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {lang === 'ar' ? 'يتم تأكيد الحجز والحجز المالي' : 'Authorizing hold and confirming booking'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Surge indicator badge */}
              {isSurge && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 tj-fade-in">
                  <Icon name="Zap" className="h-5 w-5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-amber-800">
                      {t('surge.peakHours', lang)}
                    </p>
                    <p className="text-xs text-amber-700">
                      {surgeLabel || t('surge.highDemand', lang)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-extrabold text-white">
                    x{surgeMultiplier}
                  </span>
                </div>
              )}

              {/* Amount due */}
              <div className="rounded-2xl bg-navy-900 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                  {lang === 'ar' ? 'المبلغ المستحق' : 'Amount Due'}
                </p>
                <div className="mt-1 flex items-baseline gap-3">
                  <p className="text-3xl font-extrabold tabular-nums">{formatAed(finalTotal)}</p>
                  {discountAmount > 0 && (
                    <p className="text-sm font-bold text-white/50 line-through tabular-nums">{formatAed(baseTotal)}</p>
                  )}
                </div>
                {breakdown.inspectionFee && (
                  <p className="mt-2 text-xs text-gold-400">
                    {lang === 'ar' ? 'يشمل رسوم الفحص المبدئي' : 'Includes inspection fee'}
                  </p>
                )}
                {discountAmount > 0 && (
                  <p className="mt-1 text-xs font-bold text-emerald-400">
                    {t('promo.discount', lang)}: -{formatAed(discountAmount)}
                  </p>
                )}
              </div>

              {/* Promo / Referral Code */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon name="Ticket" className="h-4 w-4 text-navy-700" />
                  <p className="text-sm font-extrabold text-navy-900">{t('promo.title', lang)}</p>
                </div>
                {promoResult?.valid ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon name="CheckCircle2" className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">{promoResult.code}</p>
                        <p className="text-xs text-emerald-600">{promoResult.message} · -{formatAed(promoResult.discount)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setPromoResult(null); setPromoInput(''); }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                    >
                      <Icon name="X" className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder={t('promo.placeholder', lang)}
                      className="tj-input flex-1 font-mono text-sm uppercase"
                      dir="ltr"
                    />
                    <button
                      onClick={() => {
                        if (!promoInput.trim()) return;
                        setPromoLoading(true);
                        const result = applyPromoCode(promoInput, baseTotal);
                        setPromoResult({ valid: result.valid, discount: result.discountAmount, message: result.message, code: result.code });
                        setPromoLoading(false);
                      }}
                      disabled={!promoInput.trim() || promoLoading}
                      className="shrink-0 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
                    >
                      {t('promo.apply', lang)}
                    </button>
                  </div>
                )}
                {promoResult && !promoResult.valid && (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                    <Icon name="XCircle" className="h-3.5 w-3.5" />
                    {t('promo.invalid', lang)}
                  </p>
                )}
              </div>

              {/* Payment method selection */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {lang === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}
                </p>
                <div className="space-y-2.5">
                  {opts.map((opt) => {
                    const selected = method === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setMethod(opt.key)}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${
                          selected ? 'border-navy-900 bg-navy-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Icon name={opt.icon} className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy-900">{lang === 'ar' ? opt.labelAr : opt.labelEn}</p>
                          <p className="text-xs text-slate-500">{lang === 'ar' ? opt.descAr : opt.descEn}</p>
                        </div>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-navy-900 bg-navy-900' : 'border-slate-300'}`}>
                          {selected && <Icon name="Check" className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card form */}
              {method === 'card' && (
                <div className="space-y-4 tj-fade-in">
                  <div>
                    <label className="tj-label">{lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}</label>
                    <div className="relative">
                      <input
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4242 4242 4242 4242"
                        className="tj-input pl-11 font-mono tracking-wide"
                      />
                      <Icon name="CreditCard" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="tj-label">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                      <input
                        inputMode="numeric"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="tj-input font-mono"
                      />
                    </div>
                    <div>
                      <label className="tj-label">CVV</label>
                      <input
                        inputMode="numeric"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        className="tj-input font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="tj-label">{lang === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}</label>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder={lang === 'ar' ? 'الاسم كما يظهر على البطاقة' : 'Name on card'}
                      className="tj-input"
                    />
                  </div>
                </div>
              )}

              {/* Apple Pay mock */}
              {method === 'apple_pay' && (
                <div className="tj-fade-in">
                  <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-4 text-base font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]">
                    <Icon name="Apple" className="h-6 w-6" />
                     Pay
                  </button>
                  <p className="mt-3 text-center text-xs text-slate-500">
                    {lang === 'ar' ? 'اضغط للتأكيد عبر Face ID أو Touch ID' : 'Confirm with Face ID or Touch ID'}
                  </p>
                </div>
              )}

              {/* Cash note */}
              {method === 'cash' && (
                <div className="tj-fade-in rounded-2xl bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <Icon name="Info" className="h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">
                      {lang === 'ar'
                        ? 'الدفع نقداً للمزود عند وصوله.'
                        : 'Pay cash to the provider on arrival.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pay & Confirm button */}
            <div className="border-t border-slate-100 p-4">
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-4 text-base font-extrabold text-white transition hover:bg-navy-800 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Icon name="Lock" className="h-5 w-5" />
                {lang === 'ar' ? `ادفع ${formatAed(finalTotal)} وأكد` : `Pay ${formatAed(finalTotal)} & Confirm`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
