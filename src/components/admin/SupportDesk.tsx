import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button, Badge, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { SupportTicket, SupportMessage, Order, Profile } from '@/types';

type Filter = 'escalated' | 'active' | 'all';

export function SupportDesk() {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('escalated');
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const loadTickets = useCallback(async () => {
    let query = supabase.from('support_tickets').select('*').order('last_message_at', { ascending: false });
    if (filter === 'escalated') query = query.in('status', ['waiting_human']);
    else if (filter === 'active') query = query.in('status', ['in_chat', 'open']);
    const { data } = await query;
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Real-time: new tickets / status changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-desk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'escalated', label: t('support.escalated', lang) },
    { key: 'active', label: t('support.active', lang) },
    { key: 'all', label: t('support.all', lang) },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, { color: 'amber' | 'sky' | 'emerald' | 'slate'; key: string }> = {
      waiting_human: { color: 'amber', key: 'support.waiting' },
      in_chat: { color: 'sky', key: 'support.inChat' },
      open: { color: 'emerald', key: 'support.open' },
      resolved: { color: 'slate', key: 'support.resolved' },
    };
    const m = map[status] ?? map.open;
    return <Badge color={m.color}>{t(m.key, lang)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-slate-900">{t('support.title', lang)}</h3>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {f.label}
            {f.key === 'escalated' && tickets.filter((t2) => t2.status === 'waiting_human').length > 0 && (
              <span className="ms-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                {tickets.filter((t2) => t2.status === 'waiting_human').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : tickets.length === 0 ? (
        <div className="tj-card p-8 text-center text-sm text-slate-400">{t('support.noTickets', lang)}</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((tk) => (
            <button
              key={tk.id}
              onClick={() => setSelected(tk)}
              className="tj-card w-full p-4 text-start transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">{tk.subject || (lang === 'ar' ? 'محادثة دعم' : 'Support chat')}</p>
                    {tk.priority === 'urgent' && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 animate-pulse">
                        {t('support.urgent', lang)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400" dir="ltr">
                    #{tk.id.slice(0, 8)} · {new Date(tk.last_message_at).toLocaleString(lang === 'ar' ? 'ar-AE' : 'en-AE')}
                  </p>
                </div>
                {statusBadge(tk.status)}
              </div>
              {tk.ai_summary && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs text-violet-700">
                  <Icon name="Sparkles" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate"><b>{t('support.aiSummary', lang)}:</b> {tk.ai_summary}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ChatModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { loadTickets(); }}
        />
      )}
    </div>
  );
}

function ChatModal({ ticket, onClose, onUpdate }: { ticket: SupportTicket; onClose: () => void; onUpdate: () => void }) {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages + customer info
  useEffect(() => {
    (async () => {
      const [msgsRes, custRes] = await Promise.all([
        supabase.from('support_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('id', ticket.customer_id).maybeSingle(),
      ]);
      setMessages((msgsRes.data ?? []) as SupportMessage[]);
      setCustomer(custRes.data as Profile | null);
      if (ticket.related_order_id) {
        const { data: ord } = await supabase.from('orders').select('*').eq('id', ticket.related_order_id).maybeSingle();
        setOrder(ord as Order | null);
      }
      setLoadingMsgs(false);
    })();
  }, [ticket]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`admin-ticket-${ticket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => setMessages((m) => [...m, payload.new as SupportMessage]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  // Auto-pickup: if waiting_human, admin sees it, mark in_chat
  useEffect(() => {
    if (ticket.status === 'waiting_human') {
      supabase.from('support_tickets').update({ status: 'in_chat', ai_active: false }).eq('id', ticket.id).then(() => onUpdate());
    }
  }, [ticket.id, ticket.status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender: 'admin', body });
    await supabase.from('support_tickets').update({ last_message_at: new Date().toISOString() }).eq('id', ticket.id);
  };

  const resolveTicket = async () => {
    await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', ticket.id);
    onUpdate();
    onClose();
  };

  const cancelOrder = async () => {
    if (!ticket.related_order_id) return;
    if (!confirm(lang === 'ar' ? 'تأكيد إلغاء الطلب؟' : 'Confirm cancel order?')) return;
    setActionLoading(true);
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', ticket.related_order_id);
    setActionLoading(false);
    const sysMsg = lang === 'ar' ? '[إجراء] تم إلغاء الطلب بواسطة المشرف' : '[Action] Order cancelled by admin';
    await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender: 'admin', body: sysMsg });
  };

  const refund = async () => {
    if (!confirm(lang === 'ar' ? 'تأكيد رد الأموال؟ (يتطلب Stripe عند تفعيله)' : 'Confirm refund? (Requires Stripe when configured)')) return;
    setActionLoading(true);
    // Stripe refund will be wired here once Stripe is configured
    const sysMsg = lang === 'ar' ? '[إجراء] طلب رد الأموال - بانتظار تفعيل نظام الدفع' : '[Action] Refund requested - pending payment system activation';
    await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender: 'admin', body: sysMsg });
    setActionLoading(false);
  };

  const blockProvider = async () => {
    if (!order?.provider_id) {
      alert(lang === 'ar' ? 'لا يوجد مزود مرتبط بهذا الطلب' : 'No provider linked to this order');
      return;
    }
    if (!confirm(lang === 'ar' ? 'تأكيد حظر المزود؟' : 'Confirm block provider?')) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ status: 'suspended' }).eq('id', order.provider_id);
    const sysMsg = lang === 'ar' ? '[إجراء] تم حظر المزود المشكو في حقه' : '[Action] Provider blocked';
    await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender: 'admin', body: sysMsg });
    setActionLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div dir={dir} className="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl tj-slide-in">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 font-bold">
            {customer?.full_name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{customer?.full_name ?? '-'}</p>
            <p className="text-xs text-slate-400" dir="ltr">{customer?.phone} · {customer?.email}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><Icon name="X" className="h-5 w-5" /></button>
        </div>

        {/* AI Summary banner */}
        {ticket.ai_summary && (
          <div className="flex items-center gap-2 bg-violet-50 px-4 py-2 text-xs text-violet-700">
            <Icon name="Sparkles" className="h-3.5 w-3.5 shrink-0" />
            <span><b>{t('support.aiSummary', lang)}:</b> {ticket.ai_summary}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
          <Button size="sm" variant="danger" onClick={cancelOrder} disabled={actionLoading || !ticket.related_order_id}>
            <Icon name="XCircle" className="h-4 w-4" /> {t('support.cancelOrder', lang)}
          </Button>
          <Button size="sm" variant="warning" onClick={refund} disabled={actionLoading}>
            <Icon name="RotateCcw" className="h-4 w-4" /> {t('support.refund', lang)}
          </Button>
          <Button size="sm" variant="danger" onClick={blockProvider} disabled={actionLoading || !order?.provider_id}>
            <Icon name="Ban" className="h-4 w-4" /> {t('support.blockProvider', lang)}
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="primary" onClick={resolveTicket}>
            <Icon name="CheckCircle2" className="h-4 w-4" /> {t('support.resolve', lang)}
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="tj-chat-scroll flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loadingMsgs ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === 'admin' ? 'bg-sky-500 text-white'
                  : m.sender === 'ai' ? 'bg-violet-50 text-violet-900 border border-violet-200'
                  : 'bg-white text-slate-800 border border-slate-200'
                }`}>
                  {m.sender === 'ai' && <p className="mb-1 text-[10px] font-bold text-violet-500">AI</p>}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-slate-200 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t('support.reply', lang)}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          <Button variant="primary" onClick={send} className="!px-3 !py-2.5">
            <Icon name="Send" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
