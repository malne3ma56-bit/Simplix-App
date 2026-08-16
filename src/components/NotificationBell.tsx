import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import type { NotificationType } from '@/types';

function timeAgo(iso: string, lang: 'ar' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notif.justNow', lang);
  if (mins < 60) return `${mins} ${t('notif.minutesAgo', lang)}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${t('notif.hoursAgo', lang)}`;
  const days = Math.floor(hrs / 24);
  return `${days} ${t('notif.daysAgo', lang)}`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { lang, dir } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const iconFor: Record<NotificationType, string> = {
    order: 'BellRing',
    system: 'Info',
    dispute: 'AlertCircle',
  };
  const dotColorFor: Record<NotificationType, string> = {
    order: 'bg-emerald-500',
    system: 'bg-sky-500',
    dispute: 'bg-amber-500',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
        title={t('notif.title', lang)}
      >
        <Icon name="Bell" className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl tj-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-extrabold text-slate-900">{t('notif.title', lang)}</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-bold text-emerald-600 transition hover:text-emerald-700"
              >
                {t('notif.markAllRead', lang)}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Icon name="BellOff" className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-400">{t('notif.empty', lang)}</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${!n.read_status ? 'bg-emerald-50/40' : ''}`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Icon name={iconFor[n.type]} className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{n.title}</p>
                      {!n.read_status && <span className={`h-2 w-2 shrink-0 rounded-full ${dotColorFor[n.type]}`} />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.created_at, lang)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
