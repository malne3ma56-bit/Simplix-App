import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification, NotificationType } from '@/types';

type Toast = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  toasts: Toast[];
  soundEnabled: boolean;
  toggleSound: () => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  playIncomingOrderSound: () => void;
  stopIncomingOrderSound: () => void;
  pushNotification: (n: { title: string; message: string; type: NotificationType; related_order_id?: string }) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ── Web Audio synthesizer for the incoming-order ringtone ──────────────────
let audioCtx: AudioContext | null = null;
let chimeTimer: ReturnType<typeof setInterval> | null = null;
let chimeOsc: OscillatorNode | null = null;
let chimeGain: GainNode | null = null;

function ensureAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playChimeOnce(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

function startChimeLoop() {
  stopChimeLoop();
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  playChimeOnce(ctx);
  chimeTimer = setInterval(() => playChimeOnce(ctx), 800);
}

function stopChimeLoop() {
  if (chimeTimer) {
    clearInterval(chimeTimer);
    chimeTimer = null;
  }
  if (chimeOsc) {
    try { chimeOsc.stop(); } catch {}
    chimeOsc = null;
  }
  if (chimeGain && audioCtx) {
    try { chimeGain.gain.cancelScheduledValues(audioCtx.currentTime); chimeGain.gain.setValueAtTime(0, audioCtx.currentTime); } catch {}
    chimeGain = null;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(profile?.sound_alerts_enabled ?? true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Load existing notifications
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setNotifications(data as AppNotification[]);
    })();
  }, [profile?.id]);

  // Sync soundEnabled when profile loads/changes
  useEffect(() => {
    setSoundEnabled(profile?.sound_alerts_enabled ?? true);
  }, [profile?.sound_alerts_enabled]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!profile?.id) return;
    const sub = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        const n = payload.new as AppNotification;
        setNotifications((prev) => [n, ...prev]);
        // Show toast
        setToasts((prev) => [...prev, { id: n.id, title: n.title, message: n.message, type: n.type }]);
        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== n.id));
        }, 6000);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [profile?.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => stopChimeLoop();
  }, []);

  const playIncomingOrderSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    startChimeLoop();
  }, []);

  const stopIncomingOrderSound = useCallback(() => {
    stopChimeLoop();
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSound = useCallback(async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (!next) stopChimeLoop();
    if (profile?.id) {
      await supabase.from('profiles').update({ sound_alerts_enabled: next }).eq('id', profile.id);
    }
  }, [profile?.id]);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read_status).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    if (profile?.id) {
      await supabase.from('notifications').update({ read_status: true }).in('id', unreadIds);
    }
  }, [notifications, profile?.id]);

  const pushNotification = useCallback(async (n: { title: string; message: string; type: NotificationType; related_order_id?: string }) => {
    if (!profile?.id) return;
    await supabase.from('notifications').insert({
      user_id: profile.id,
      title: n.title,
      message: n.message,
      type: n.type,
      related_order_id: n.related_order_id ?? null,
    });
  }, [profile?.id]);

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      toasts,
      soundEnabled,
      toggleSound,
      markAllRead,
      dismissToast,
      playIncomingOrderSound,
      stopIncomingOrderSound,
      pushNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
