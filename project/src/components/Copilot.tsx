import { useState, useRef, useEffect, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { generateResponse } from '@/lib/ai-brain';
import type { SupportTicket, SupportMessage, Order } from '@/types';

type Msg = {
  role: 'bot' | 'user' | 'admin';
  text: string;
  isComplex?: boolean;
  isEscalation?: boolean;
};

const COMPLEX_KEYWORDS = [
  'مشكلة', 'عطل', 'لا يعمل', 'معقد', 'طارئ', 'عاجل', 'تسريب', 'حرارة', 'دخان', 'كهرباء خطر',
  'broken', 'urgent', 'emergency', 'leak', 'smoke', 'complex', 'not working',
];

const QUICK_TOPICS = [
  { keys: ['نظافة', 'تنظيف', 'clean'], reply: { ar: 'لدينا 5 خدمات نظافة: تنظيف دوري سريع، تنظيف عميق للمنازل (3 أنظمة تسعير: رؤية AI، تفصيلي، صوتي/نصي)، تنظيف الشركات، تنظيف عميق للشركات، وتنظيف المصانع. أيها تريد؟', en: 'We have 5 cleaning services: quick home, deep home (3 pricing systems: AI Vision, detailed, voice/text), corporate, deep corporate, and factory. Which one?' } },
  { keys: ['تكييف', 'سباكة', 'كهرباء', 'طلاء', 'عزل', 'حدائق', 'صيانة', 'maintenance', 'ac', 'plumb'], reply: { ar: 'قسم صيانة المرافق يشمل 6 أقسام: التكييف، السباكة، الكهرباء، الطلاء، العزل، والحدائق. خدمات دورية بأسعار ثابتة، وللمشاكل المعقدة رسوم فحص 50 د.إ تخصم من الإجمالي عند التنفيذ.', en: 'Maintenance has 6 subcategories: AC, plumbing, electrical, painting, insulation, gardens. Periodic fixed prices; complex issues have a 50 AED inspection fee deducted from the total.' } },
  { keys: ['سيارة', 'غسيل', 'زيت', 'car', 'wash', 'oil'], reply: { ar: 'خدمات السيارات: غسيل دوري أو عميق (يشمل المقاعد وتنظيف المحرك بالبخار)، وتبديل الزيوت والفلاتر. تختار نوع سيارتك (صالون/إستيشن/بيكب/دراجة) ونوع الزيت والفلتر ونولّد لك السعر قبل الحجز.', en: 'Car services: periodic or deep wash (incl. seats + steam engine), oil & filter change. Pick your vehicle type, oil, and filter — we generate the price before booking.' } },
  { keys: ['عاملة', 'استقدام', 'helper', 'maid'], reply: { ar: 'استبيان توظيف عاملات مساعدة منزلية: تحدد العمر، الجنسية، الخبرة، والمهارات، ونحوّل الطلب إلى نموذج قابل للطباعة لمكاتب الاستقدام.', en: 'Helper recruitment survey: specify age, nationality, experience, skills — we turn it into a printable form for recruitment offices.' } },
  { keys: ['تسعير', 'سعر', 'كم', 'price', 'cost', 'how much'], reply: { ar: 'التسعير الذكي يولّد السعر أمامك قبل تأكيد الطلب بناءً على اختياراتك (المساحة، عدد العمال، نوع السيارة، إلخ). لا رسوم خفية.', en: 'Smart pricing generates the price before you confirm, based on your selections (area, workers, vehicle, etc.). No hidden fees.' } },
  { keys: ['تتبع', 'حالة', 'طلب', 'track', 'order', 'status'], reply: { ar: 'يمكنك تتبع كل طلب لحظة بلحظة من شاشة "طلباتي". تشمل الحالات: بانتظار التعيين، تم التعيين، في الطريق، بدأت الخدمة، مكتملة.', en: 'Track every order in real time from "My Orders". Statuses: pending, assigned, on the way, started, completed.' } },
  { keys: ['قريبا', 'اشتراك', 'خبز', 'ماء', 'غاز', 'تدوير', 'coming', 'subscription', 'recycle'], reply: { ar: 'قريباً: اشتراكات الخبز والماء والغاز، وإعادة التدوير ضمن رؤية تجديد البيئية. يمكنك الانضمام لقائمة الانتظار الآن!', en: 'Coming soon: bread/water/gas subscriptions and recycling. Join the waitlist now!' } },
];

function isComplex(text: string): boolean {
  const lower = text.toLowerCase();
  return COMPLEX_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

function answer(text: string, lang: 'ar' | 'en', orders?: Order[]): { text: string; isComplex: boolean; shouldEscalate: boolean; aiSummary: string; intent: string } {
  const res = generateResponse(text, lang, { orders });
  return {
    text: res.text[lang],
    isComplex: res.shouldEscalate,
    shouldEscalate: res.shouldEscalate,
    aiSummary: res.aiSummary,
    intent: res.intent,
  };
}

export function Copilot({ onClose }: { onClose: () => void }) {
  const { lang, dir } = useLang();
  const { profile } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: t('copilot.hello', lang) }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  // Load user's orders for context
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setOrders((data ?? []) as Order[]);
    })();
  }, [profile]);

  // Load or create ticket
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_id', profile.id)
        .in('status', ['open', 'waiting_human', 'in_chat'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setTicket(data as SupportTicket);
        setEscalated((data as SupportTicket).status === 'waiting_human' || (data as SupportTicket).status === 'in_chat');
        // Load existing messages
        const { data: existingMsgs } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', (data as SupportTicket).id)
          .order('created_at', { ascending: true });
        if (existingMsgs && existingMsgs.length > 0) {
          const mapped: Msg[] = existingMsgs.map((m: any) => ({
            role: m.sender === 'customer' ? 'user' : m.sender === 'ai' ? 'bot' : 'admin',
            text: m.body,
            isComplex: m.intent_detected && m.intent_detected !== 'faq' && m.intent_detected !== 'greeting' && m.intent_detected !== 'order_status',
          }));
          setMsgs(mapped);
        }
      }
    })();
  }, [profile]);

  // Subscribe to admin messages on this ticket
  useEffect(() => {
    if (!ticket) return;
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          if (newMsg.sender === 'admin') {
            setMsgs((m) => [...m, { role: 'admin', text: newMsg.body }]);
            setEscalated(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticket.id}` },
        (payload) => {
          const updated = payload.new as SupportTicket;
          setTicket(updated);
          if (updated.status === 'in_chat') setEscalated(true);
          if (updated.status === 'resolved') {
            setMsgs((m) => [...m, { role: 'bot', text: lang === 'ar' ? 'تم إغلاق تذكرة الدعم. إذا احتجت مساعدة أخرى، اسألني من جديد.' : 'Support ticket resolved. If you need more help, ask me again.' }]);
            setEscalated(false);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticket, lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  const ensureTicket = useCallback(async (firstMessage: string): Promise<SupportTicket> => {
    if (ticket) return ticket;
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        customer_id: profile!.id,
        subject: firstMessage.slice(0, 80),
        ai_summary: 'New conversation',
        status: 'open',
        ai_active: true,
        priority: 'normal',
      })
      .select()
      .single();
    if (error) throw error;
    setTicket(data as SupportTicket);
    return data as SupportTicket;
  }, [ticket, profile]);

  const saveMessage = useCallback(async (tk: SupportTicket, sender: 'customer' | 'ai', body: string, intent?: string) => {
    await supabase.from('support_messages').insert({
      ticket_id: tk.id,
      sender,
      body,
      intent_detected: intent ?? null,
    });
    await supabase.from('support_tickets').update({ last_message_at: new Date().toISOString() }).eq('id', tk.id);
  }, []);

  const escalate = useCallback(async (tk: SupportTicket, aiSummary: string) => {
    await supabase.from('support_tickets').update({
      status: 'waiting_human',
      ai_active: false,
      priority: 'urgent',
      ai_summary: aiSummary,
    }).eq('id', tk.id);
    setEscalated(true);
  }, []);

  const send = async () => {
    if (!input.trim() || !profile) return;
    const userText = input.trim();
    setMsgs((m) => [...m, { role: 'user', text: userText }]);
    setInput('');
    setTyping(true);

    // Save customer message
    let tk: SupportTicket;
    try {
      tk = await ensureTicket(userText);
      await saveMessage(tk, 'customer', userText);
    } catch {
      setTyping(false);
      return;
    }

    setTimeout(async () => {
      const res = answer(userText, lang, orders);
      setMsgs((m) => [...m, { role: 'bot', text: res.text, isComplex: res.shouldEscalate, isEscalation: res.shouldEscalate }]);

      // Save AI response
      await saveMessage(tk, 'ai', res.text, res.intent);

      // Escalate if needed
      if (res.shouldEscalate) {
        await escalate(tk, res.aiSummary);
      }
      setTyping(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div dir={dir} className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl tj-slide-in">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-l from-emerald-600 to-teal-600 px-4 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
            <Icon name="Bot" className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-extrabold">{t('copilot.title', lang)}</p>
            <p className="text-[11px] text-white/80">
              {escalated
                ? (lang === 'ar' ? 'متصل بالموظف' : 'Agent connected')
                : 'Tajdeed AI'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/20">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="tj-chat-scroll flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : m.role === 'admin'
                    ? 'bg-sky-500 text-white'
                    : m.isComplex || m.isEscalation
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {(m.isComplex || m.isEscalation) && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <Icon name="Phone" className="h-3.5 w-3.5" />
                    +971588095851
                  </div>
                )}
                {m.role === 'admin' && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-sky-100">
                    <Icon name="Headphones" className="h-3.5 w-3.5" />
                    {lang === 'ar' ? 'موظف الدعم' : 'Support Agent'}
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 border border-slate-200">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hint */}
        <div className="border-t border-slate-100 bg-white px-4 py-1.5 text-[11px] text-slate-400">
          {t('copilot.hint', lang)}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t('copilot.placeholder', lang)}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <Button variant="primary" onClick={send} className="!px-3 !py-2.5">
            <Icon name="Send" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
