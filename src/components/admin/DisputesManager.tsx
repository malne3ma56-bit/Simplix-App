import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Badge, Button, Spinner, formatAed } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { resolveDispute } from '@/lib/orders';
import type { Profile, Order } from '@/types';

export function DisputesManager() {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const [blockedProviders, setBlockedProviders] = useState<Profile[]>([]);
  const [openDisputes, setOpenDisputes] = useState<(Order & { provider_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [blockedRes, disputeRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'provider').eq('status', 'blocked').order('updated_at', { ascending: false }),
      supabase.from('orders').select('*').eq('dispute_status', 'opened').order('updated_at', { ascending: false }),
    ]);

    const blocked = (blockedRes.data ?? []) as Profile[];
    setBlockedProviders(blocked);

    const disputes = (disputeRes.data ?? []) as Order[];
    // Enrich with provider names
    const providerIds = [...new Set(disputes.map((d) => d.provider_id).filter(Boolean))] as string[];
    let providerMap: Record<string, string> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase.from('profiles').select('id, full_name').in('id', providerIds);
      providerMap = Object.fromEntries((providers ?? []).map((p: any) => [p.id, p.full_name]));
    }
    setOpenDisputes(disputes.map((d) => ({ ...d, provider_name: d.provider_id ? providerMap[d.provider_id] ?? '—' : '—' })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleResolve(orderId: string, restoreEarnings: boolean) {
    setResolving(orderId);
    await resolveDispute(orderId, restoreEarnings);
    setResolving(null);
    load();
  }

  async function unblockProvider(id: string) {
    await supabase.from('profiles').update({ status: 'active', available: true }).eq('id', id);
    load();
  }

  if (loading) {
    return (
      <div dir={dir} className="flex justify-center py-12">
        <Spinner className="h-8 w-8 text-navy-900" />
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
          <Icon name="Shield" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">{t('admin.disputes', lang)}</h2>
          <p className="text-sm text-slate-500">{lang === 'ar' ? 'مراجعة المزودين المحظورين والنزاعات المفتوحة' : 'Review blocked providers and open disputes'}</p>
        </div>
      </div>

      {/* Section 1: Auto-Blocked Providers */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="Ban" className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-extrabold text-navy-900">{t('admin.blockedProviders', lang)}</h3>
          <Badge color="red">{blockedProviders.length}</Badge>
        </div>

        {blockedProviders.length === 0 ? (
          <div className="tj-card p-8 text-center text-sm text-slate-500">{t('admin.noBlocked', lang)}</div>
        ) : (
          <div className="space-y-2">
            {blockedProviders.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Icon name="Ban" className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-navy-900">{p.full_name}</p>
                    <Badge color="red">{t('admin.autoBlocked', lang)}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('admin.providerRating', lang)}: <span className="font-bold text-amber-600">{p.average_rating?.toFixed(2) ?? '5.00'}</span>
                    {' · '}
                    {p.total_reviews ?? 0} {t('admin.reviews', lang)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => unblockProvider(p.id)}>
                  <Icon name="CheckCircle2" className="h-3.5 w-3.5" />
                  {lang === 'ar' ? 'إلغاء الحظر' : 'Unblock'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Open Disputes */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="AlertCircle" className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-extrabold text-navy-900">{t('admin.openDisputes', lang)}</h3>
          <Badge color="amber">{openDisputes.length}</Badge>
        </div>

        {openDisputes.length === 0 ? (
          <div className="tj-card p-8 text-center text-sm text-slate-500">{t('admin.noDisputes', lang)}</div>
        ) : (
          <div className="space-y-3">
            {openDisputes.map((d) => (
              <div key={d.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-navy-900">{d.summary_ar}</p>
                      <Badge color="amber">{t('qc.disputeOpened', lang)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400" dir="ltr">#{d.id.slice(0, 8)}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span><span className="font-bold text-slate-600">{lang === 'ar' ? 'المزود' : 'Provider'}: </span>{d.provider_name}</span>
                      <span><span className="font-bold text-slate-600">{lang === 'ar' ? 'السعر' : 'Price'}: </span>{formatAed(d.price)}</span>
                      <span><span className="font-bold text-slate-600">{lang === 'ar' ? 'أرباح المزود' : 'Provider Earnings'}: </span>{formatAed(d.provider_earnings)}</span>
                    </div>
                    {d.dispute_reason && (
                      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2">
                        <p className="text-xs font-bold text-amber-700">{t('qc.disputeReason', lang)}</p>
                        <p className="mt-0.5 text-sm text-amber-800">{d.dispute_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving === d.id}
                    onClick={() => handleResolve(d.id, true)}
                  >
                    {resolving === d.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="Check" className="h-3.5 w-3.5" />}
                    {t('admin.resolvePay', lang)}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={resolving === d.id}
                    onClick={() => handleResolve(d.id, false)}
                  >
                    {resolving === d.id ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="X" className="h-3.5 w-3.5" />}
                    {t('admin.resolveRefund', lang)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
