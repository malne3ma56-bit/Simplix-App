import { useState, useEffect, type ReactNode } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, formatAed } from '@/components/ui';
import { ServiceImage } from '@/components/ServiceImage';
import { createOrder } from '@/lib/orders';
import { supabase } from '@/lib/supabase';
import { PaymentCheckoutModal, type CheckoutResult } from '@/components/PaymentCheckoutModal';
import { getComplementaryForService, useMarketingData } from '@/hooks/useMarketing';
import { calculateDynamicPrice, computeFinancialSplit } from '@/lib/pricing';
import type { Service, Category } from '@/types';
import type { PriceBreakdown } from '@/lib/pricing';

export function BookingModal({
  open, onClose, service, category, breakdown, details, summaryAr,
}: {
  open: boolean;
  onClose: () => void;
  service: Service;
  category: Category | null;
  breakdown: PriceBreakdown;
  details: Record<string, any>;
  summaryAr: string;
}) {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const { complementary, loading: mktLoading } = useMarketingData();
  const [note, setNote] = useState('');
  const [address, setAddress] = useState(profile?.address_text ?? '');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('cash');
  const [addons, setAddons] = useState<Service[]>([]);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  if (!open) return null;

  // Calculate surge pricing
  const baseTotal = breakdown.total + addons.reduce((s, a) => s + Number(a.base_price), 0);
  const { total: surgedTotal, surgeMultiplier, surgeInfo } = calculateDynamicPrice(baseTotal);

  // Final total after promo discount (from checkout result)
  const discountAmount = checkoutResult?.discountAmount ?? 0;
  const finalTotal = checkoutResult ? checkoutResult.finalTotal : surgedTotal;

  // Get complementary services for the current service
  const complementaryIds = getComplementaryForService(service.id, complementary);
  const [compServices, setCompServices] = useState<Service[]>([]);
  const [compLoaded, setCompLoaded] = useState(false);

  useEffect(() => {
    if (complementaryIds.length > 0 && !compLoaded) {
      supabase.from('services').select('*').in('id', complementaryIds.slice(0, 2)).then(({ data }) => {
        setCompServices((data ?? []) as Service[]);
        setCompLoaded(true);
      });
    }
  }, [complementaryIds, compLoaded]);

  const totalWithAddons = surgedTotal;

  const confirm = async () => {
    setLoading(true);
    const addonIds = addons.map((a) => a.id);
    const { error } = await createOrder({
      serviceId: service.id,
      categoryId: service.category_id,
      pricingType: service.pricing_type,
      summaryAr: addons.length > 0 ? `${summaryAr} + ${addons.length} ${lang === 'ar' ? 'خدمة مكملة' : 'add-on(s)'}` : summaryAr,
      details: { ...details, note, address, addon_service_ids: addonIds },
      price: finalTotal,
      inspectionFeeApplied: !!breakdown.inspectionFee,
      paymentMethod,
      addressText: address || profile?.address_text || '',
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
      surgeMultiplier,
      discountAmount,
      promoCode: checkoutResult?.promoCode ?? null,
    });
    setLoading(false);
    if (!error) {
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1800);
    }
  };

  const openPayment = () => {
    setShowPayment(true);
  };

  const handlePaymentConfirm = async (result: CheckoutResult) => {
    setPaymentMethod(result.method);
    setCheckoutResult(result);
    setShowPayment(false);
    await confirm();
  };

  const toggleAddon = (svc: Service) => {
    setAddons((prev) =>
      prev.some((a) => a.id === svc.id)
        ? prev.filter((a) => a.id !== svc.id)
        : [...prev, svc]
    );
  };

  return (
    <div dir={dir} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl tj-slide-in max-h-[92vh] flex flex-col">
        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-gold-400 tj-pulse">
              <Icon name="CheckCircle2" className="h-8 w-8" />
            </div>
            <p className="text-lg font-extrabold text-navy-900">{t('booking.success', lang)}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-extrabold text-navy-900">{t('booking.summary', lang)}</h3>
              <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="X" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-start gap-3">
                <ServiceImage imageUrl={service.image_url} fallbackIcon={service.fallback_icon} bg="bg-slate-100" text="text-navy-700" size="sm" rounded="rounded-xl" />
                <div>
                  <p className="font-bold text-navy-900">{lang === 'ar' ? service.name_ar : service.name_en}</p>
                  {category && <p className="text-xs font-semibold text-slate-500">{lang === 'ar' ? category.name_ar : category.name_en}</p>}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{t('booking.priceEstimate', lang)}</p>
                <div className="space-y-1.5">
                  {breakdown.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{l.label}</span>
                      <span className="font-bold text-slate-800">{formatAed(l.amount)}</span>
                    </div>
                  ))}
                  {/* Addon lines */}
                  {addons.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">+ {lang === 'ar' ? a.name_ar : a.name_en}</span>
                      <span className="font-bold text-slate-800">{formatAed(Number(a.base_price))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="font-extrabold text-navy-900">{t('booking.total', lang)}</span>
                  <div className="text-end">
                    {surgeMultiplier > 1.0 && (
                      <span className="mb-0.5 block text-xs font-bold text-amber-600">
                        {t('surge.peakHours', lang)} ×{surgeMultiplier}
                      </span>
                    )}
                    <span className="text-xl font-extrabold text-navy-900">{formatAed(totalWithAddons)}</span>
                  </div>
                </div>
                {breakdown.inspectionFee && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                    {t('maint.inspectionNote', lang)}
                  </p>
                )}
              </div>

              {/* Cross-selling: Frequently Added Together */}
              {compServices.length > 0 && (
                <div className="rounded-2xl border border-slate-100 p-4 tj-fade-in">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon name="Sparkle" className="h-4 w-4 text-gold-500" />
                    <p className="text-sm font-extrabold text-navy-900">{t('crosssell.title', lang)}</p>
                  </div>
                  <p className="mb-3 text-xs text-slate-500">{t('crosssell.desc', lang)}</p>
                  <div className="space-y-2">
                    {compServices.map((cs) => {
                      const added = addons.some((a) => a.id === cs.id);
                      return (
                        <div key={cs.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                          <ServiceImage imageUrl={cs.image_url} fallbackIcon={cs.fallback_icon} bg="bg-slate-100" text="text-navy-600" size="sm" rounded="rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold text-navy-900">{lang === 'ar' ? cs.name_ar : cs.name_en}</p>
                            <p className="text-xs font-semibold text-slate-500">{formatAed(Number(cs.base_price))}</p>
                          </div>
                          <button
                            onClick={() => toggleAddon(cs)}
                            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 ${
                              added
                                ? 'bg-navy-900 text-white'
                                : 'border border-navy-900 text-navy-900 hover:bg-navy-50'
                            }`}
                          >
                            {added ? t('crosssell.added', lang) : t('crosssell.add', lang)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Address & Note */}
              <div>
                <label className="tj-label">{t('booking.address', lang)}</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="tj-input" placeholder={t('booking.address', lang)} />
              </div>
              <div>
                <label className="tj-label">{t('booking.note', lang)} ({t('common.optional', lang)})</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="tj-input min-h-[80px] resize-none" />
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <Button variant="ghost" onClick={onClose} className="flex-1">{t('booking.cancel', lang)}</Button>
              <Button variant="primary" onClick={openPayment} disabled={loading} className="flex-1">
                {loading ? t('common.loading', lang) : t('booking.confirm', lang)}
              </Button>
            </div>
          </>
        )}
      </div>

      <PaymentCheckoutModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        breakdown={{ ...breakdown, total: totalWithAddons }}
        onConfirm={handlePaymentConfirm}
        surgeMultiplier={surgeMultiplier}
        surgeLabel={surgeInfo.label}
      />
    </div>
  );
}

export function PriceCard({ breakdown, children }: { breakdown: PriceBreakdown; children?: ReactNode }) {
  const { lang, dir } = useLang();
  return (
    <div dir={dir} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="space-y-1.5">
        {breakdown.lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{l.label}</span>
            <span className="font-bold text-slate-800">{formatAed(l.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="font-extrabold text-navy-900">{t('booking.total', lang)}</span>
        <span className="text-xl font-extrabold text-navy-900">{formatAed(breakdown.total)}</span>
      </div>
      {children}
    </div>
  );
}
