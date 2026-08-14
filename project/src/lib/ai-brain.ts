import type { Order } from '@/types';

export type Intent =
  | 'faq'
  | 'order_status'
  | 'payment_issue'
  | 'refund_request'
  | 'double_charge'
  | 'human_request'
  | 'anger'
  | 'complex_issue'
  | 'greeting';

export type AiResponse = {
  text: { ar: string; en: string };
  intent: Intent;
  shouldEscalate: boolean;
  aiSummary: string;
};

const SENSITIVE_PATTERNS: { pattern: string[]; intent: Intent; aiSummary: { ar: string; en: string } }[] = [
  {
    pattern: ['دفع', 'مبلغ', 'خصم', 'payment', 'charged', 'paid', 'money'],
    intent: 'payment_issue',
    aiSummary: { ar: 'مشكلة في الدفع', en: 'Payment issue' },
  },
  {
    pattern: ['استرداد', 'رد المبلغ', 'استرجاع', 'refund', 'money back'],
    intent: 'refund_request',
    aiSummary: { ar: 'طلب استرداد أموال', en: 'Refund request' },
  },
  {
    pattern: ['مرتين', 'سحب مرتين', 'double', 'twice', 'charged twice'],
    intent: 'double_charge',
    aiSummary: { ar: 'سحب المبلغ مرتين', en: 'Double charge complaint' },
  },
  {
    pattern: ['موظف', 'بشر', 'تحدث مع', 'agent', 'human', 'representative', 'talk to someone'],
    intent: 'human_request',
    aiSummary: { ar: 'طلب التحدث مع موظف', en: 'Customer requested human agent' },
  },
  {
    pattern: ['غاضب', 'محتد', 'سيئة', 'أسوأ', 'احتيال', 'نصب', 'angry', 'furious', 'terrible', 'worst', 'scam', 'fraud'],
    intent: 'anger',
    aiSummary: { ar: 'عميل غاضب - يحتاج تدخل فوري', en: 'Angry customer - needs immediate attention' },
  },
  {
    pattern: ['مشكلة', 'عطل', 'لا يعمل', 'طارئ', 'عاجل', 'تسريب', 'دخان', 'كهرباء', 'broken', 'urgent', 'emergency', 'leak', 'smoke', 'not working'],
    intent: 'complex_issue',
    aiSummary: { ar: 'مشكلة فنية معقدة', en: 'Complex technical issue' },
  },
];

const FAQ_TOPICS: { keys: string[]; reply: { ar: string; en: string } }[] = [
  { keys: ['نظافة', 'تنظيف', 'clean'], reply: { ar: 'لدينا 5 خدمات نظافة: تنظيف دوري سريع، تنظيف عميق للمنازل (3 أنظمة تسعير)، تنظيف الشركات، تنظيف عميق للشركات، وتنظيف المصانع. أيها تريد؟', en: 'We have 5 cleaning services: quick home, deep home (3 pricing systems), corporate, deep corporate, and factory. Which one?' } },
  { keys: ['تكييف', 'سباكة', 'كهرباء', 'طلاء', 'عزل', 'حدائق', 'صيانة', 'maintenance', 'ac', 'plumb'], reply: { ar: 'قسم صيانة المرافق يشمل 6 أقسام: التكييف، السباكة، الكهرباء، الطلاء، العزل، والحدائق. خدمات دورية بأسعار ثابتة، وللمشاكل المعقدة رسوم فحص 50 د.إ تخصم من الإجمالي عند التنفيذ.', en: 'Maintenance has 6 subcategories: AC, plumbing, electrical, painting, insulation, gardens. Periodic fixed prices; complex issues have a 50 AED inspection fee deducted from the total.' } },
  { keys: ['سيارة', 'غسيل', 'زيت', 'car', 'wash', 'oil'], reply: { ar: 'خدمات السيارات: غسيل دوري أو عميق (يشمل المقاعد وتنظيف المحرك بالبخار)، وتبديل الزيوت والفلاتر. تختار نوع سيارتك ونولّد لك السعر قبل الحجز.', en: 'Car services: periodic or deep wash (incl. seats + steam engine), oil & filter change. Pick your vehicle type — we generate the price before booking.' } },
  { keys: ['عاملة', 'استقدام', 'helper', 'maid'], reply: { ar: 'استبيان توظيف عاملات مساعدة منزلية: تحدد العمر، الجنسية، الخبرة، والمهارات، ونحوّل الطلب إلى نموذج قابل للطباعة لمكاتب الاستقدام.', en: 'Helper recruitment survey: specify age, nationality, experience, skills — we turn it into a printable form for recruitment offices.' } },
  { keys: ['تسعير', 'سعر', 'كم', 'price', 'cost', 'how much'], reply: { ar: 'التسعير الذكي يولّد السعر أمامك قبل تأكيد الطلب بناءً على اختياراتك. لا رسوم خفية.', en: 'Smart pricing generates the price before you confirm, based on your selections. No hidden fees.' } },
  { keys: ['تتبع', 'حالة', 'طلب', 'track', 'order', 'status'], reply: { ar: 'يمكنك تتبع كل طلب لحظة بلحظة من شاشة "طلباتي". الحالات: بانتظار التعيين، تم التعيين، في الطريق، بدأت الخدمة، مكتملة.', en: 'Track every order in real time from "My Orders". Statuses: pending, assigned, on the way, started, completed.' } },
  { keys: ['قريبا', 'اشتراك', 'خبز', 'ماء', 'غاز', 'تدوير', 'coming', 'subscription', 'recycle'], reply: { ar: 'قريباً: اشتراكات الخبز والماء والغاز، وإعادة التدوير ضمن رؤية تجديد البيئية. يمكنك الانضمام لقائمة الانتظار الآن!', en: 'Coming soon: bread/water/gas subscriptions and recycling. Join the waitlist now!' } },
];

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'بانتظار التعيين', en: 'Pending' },
  assigned: { ar: 'تم التعيين', en: 'Assigned' },
  on_the_way: { ar: 'في الطريق', en: 'On the way' },
  started: { ar: 'بدأت الخدمة', en: 'Started' },
  completed: { ar: 'مكتملة', en: 'Completed' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' },
};

function matchSensitive(text: string): { intent: Intent; aiSummary: { ar: string; en: string } } | null {
  const lower = text.toLowerCase();
  for (const s of SENSITIVE_PATTERNS) {
    if (s.pattern.some((p) => lower.includes(p.toLowerCase()))) {
      return { intent: s.intent, aiSummary: s.aiSummary };
    }
  }
  return null;
}

function matchFaq(text: string): { ar: string; en: string } | null {
  const lower = text.toLowerCase();
  const match = FAQ_TOPICS.find((tp) => tp.keys.some((k) => lower.includes(k.toLowerCase())));
  return match ? match.reply : null;
}

export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const sensitive = matchSensitive(text);
  if (sensitive) return sensitive.intent;
  if (lower.match(/^(مرحبا|السلام|هاي|hello|hi|hey|good morning|good evening)/)) return 'greeting';
  if (lower.includes('حالة') || lower.includes('طلب') || lower.includes('order') || lower.includes('status') || lower.includes('track')) return 'order_status';
  return 'faq';
}

export function generateResponse(
  text: string,
  lang: 'ar' | 'en',
  context?: { orders?: Order[] }
): AiResponse {
  const sensitive = matchSensitive(text);

  // Sensitive/escalation intents
  if (sensitive) {
    const shouldEscalate = sensitive.intent !== 'complex_issue';
    const isHumanRequest = sensitive.intent === 'human_request';

    let reply: { ar: string; en: string };
    if (isHumanRequest) {
      reply = {
        ar: 'حسناً، سأحوّلك إلى موظف الدعم البشري الآن. يرجى الانتظار...',
        en: 'Alright, I will transfer you to a human support agent now. Please wait...',
      };
    } else if (sensitive.intent === 'anger') {
      reply = {
        ar: 'أعتذر عن الإزعاج. تم تحويل محادثتك فوراً إلى موظف الدعم البشري للتعامل مع مشكلتك بأسرع وقت. للتواصل المباشر: +971588095851',
        en: 'I sincerely apologize. Your chat has been escalated immediately to a human support agent. For direct contact: +971588095851',
      };
    } else if (sensitive.intent === 'refund_request' || sensitive.intent === 'double_charge') {
      reply = {
        ar: 'فهمت. هذا يتعلق بمبلغ مالي وسأحوّلك إلى موظف الدعم البشري فوراً لمراجعة حسابك وحل المشكلة. للتواصل المباشر: +971588095851',
        en: 'I understand. This involves a financial matter and I will escalate you to a human support agent immediately to review your account. For direct contact: +971588095851',
      };
    } else {
      reply = {
        ar: 'تم تحويل محادثتك إلى موظف الدعم البشري. سيتواصل معك فوراً. للتواصل المباشر: +971588095851',
        en: 'Your chat has been escalated to a human support agent. They will respond shortly. For direct contact: +971588095851',
      };
    }

    return {
      text: reply,
      intent: sensitive.intent,
      shouldEscalate: true,
      aiSummary: sensitive.aiSummary[lang],
    };
  }

  // Order status lookup
  const lower = text.toLowerCase();
  if ((lower.includes('حالة') || lower.includes('طلب') || lower.includes('order') || lower.includes('status') || lower.includes('track')) && context?.orders) {
    const orders = context.orders;
    if (orders.length === 0) {
      return {
        text: { ar: 'لا توجد طلبات حالياً في حسابك. يمكنك تصفح الأقسام وإنشاء طلب جديد.', en: 'You have no orders yet. Browse sections and place a new order.' },
        intent: 'order_status',
        shouldEscalate: false,
        aiSummary: lang === 'ar' ? 'استعلام عن حالة الطلب - لا توجد طلبات' : 'Order status query - no orders',
      };
    }
    const latest = orders[0];
    const statusLabel = STATUS_LABELS[latest.status]?.[lang] ?? latest.status;
    return {
      text: {
        ar: `آخر طلب لديك: ${latest.summary_ar} — الحالة: ${statusLabel}. ${latest.status === 'pending' ? 'بانتظار تعيين مزود الخدمة.' : latest.status === 'completed' ? 'تم إكمال الطلب بنجاح.' : 'الطلب قيد التنفيذ.'}`,
        en: `Your latest order: ${latest.summary_ar} — Status: ${statusLabel}. ${latest.status === 'pending' ? 'Awaiting provider assignment.' : latest.status === 'completed' ? 'Order completed successfully.' : 'Order in progress.'}`,
      },
      intent: 'order_status',
      shouldEscalate: false,
      aiSummary: lang === 'ar' ? 'استعلام عن حالة الطلب' : 'Order status query',
    };
  }

  // FAQ match
  const faq = matchFaq(text);
  if (faq) {
    return {
      text: faq,
      intent: 'faq',
      shouldEscalate: false,
      aiSummary: lang === 'ar' ? 'استعلام عام' : 'FAQ query',
    };
  }

  // Greeting
  if (lower.match(/^(مرحبا|السلام|هاي|hello|hi|hey)/)) {
    return {
      text: {
        ar: 'مرحباً! أنا مساعد تجديد الذكي. يمكنني مساعدتك في: معرفة الخدمات والأسعار، تتبع حالة طلباتك، أو الإجابة على أي استفسار. كيف أساعدك؟',
        en: "Hello! I'm Tajdeed's AI assistant. I can help with: services & pricing, order tracking, or any questions. How can I help?",
      },
      intent: 'greeting',
      shouldEscalate: false,
      aiSummary: lang === 'ar' ? 'تحية' : 'Greeting',
    };
  }

  // Default fallback
  return {
    text: {
      ar: 'يسعدني مساعدتك! استكشف الأقسام من القائمة الرئيسية: النظافة، صيانة المرافق، خدمات السيارات، توظيف العاملات. اسألني عن أي خدمة أو سعر.',
      en: 'Happy to help! Explore sections from the home screen: Cleaning, Maintenance, Cars, Helpers. Ask me about any service or price.',
    },
    intent: 'faq',
    shouldEscalate: false,
    aiSummary: lang === 'ar' ? 'استعلام عام' : 'General query',
  };
}
