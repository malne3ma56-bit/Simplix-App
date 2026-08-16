import { useNotifications } from '@/context/NotificationContext';
import { useLang } from '@/context/LangContext';
import { Icon } from '@/components/Icon';
import type { NotificationType } from '@/types';

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  const { lang, dir } = useLang();

  if (toasts.length === 0) return null;

  const iconFor: Record<NotificationType, string> = {
    order: 'BellRing',
    system: 'Info',
    dispute: 'AlertCircle',
  };
  const colorFor: Record<NotificationType, string> = {
    order: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    system: 'bg-sky-50 border-sky-200 text-sky-800',
    dispute: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  const iconColorFor: Record<NotificationType, string> = {
    order: 'text-emerald-500',
    system: 'text-sky-500',
    dispute: 'text-amber-500',
  };

  return (
    <div dir={dir} className="fixed top-20 end-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-2xl border p-4 shadow-lg tj-slide-in ${colorFor[toast.type]}`}
        >
          <Icon name={iconFor[toast.type]} className={`mt-0.5 h-5 w-5 shrink-0 ${iconColorFor[toast.type]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{toast.title}</p>
            <p className="mt-0.5 text-xs text-slate-600">{toast.message}</p>
          </div>
          <button onClick={() => dismissToast(toast.id)} className="shrink-0 text-slate-400 transition hover:text-slate-600">
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
