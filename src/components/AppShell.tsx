import { useState, type ReactNode } from 'react';
import { useLang } from '@/context/LangContext';
import { useAppMode } from '@/context/AppModeContext';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/i18n';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { Copilot } from '@/components/Copilot';
import { NotificationBell } from '@/components/NotificationBell';
import { ToastContainer } from '@/components/ToastContainer';
import type { AppMode } from '@/types';

const MODES: { key: AppMode; icon: string; color: string }[] = [
  { key: 'customer', icon: 'User', color: 'navy' },
  { key: 'provider', icon: 'Briefcase', color: 'navy' },
  { key: 'admin', icon: 'ShieldCheck', color: 'navy' },
];

export function AppShell({
  children, title, showCopilot = true, onNav,
}: {
  children: ReactNode;
  title?: string;
  showCopilot?: boolean;
  onNav?: (key: string) => void;
}) {
  const { lang, setLang, dir } = useLang();
  const { mode, setMode } = useAppMode();
  const { profile, signOut } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const modeLabel: Record<AppMode, string> = {
    customer: t('switcher.customer', lang),
    provider: t('switcher.provider', lang),
    admin: t('switcher.admin', lang),
  };

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 text-navy-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          {/* Brand */}
          <button
            onClick={() => onNav?.('home')}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-slate-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-gold-400 shadow-sm">
              <Icon name="Sparkles" className="h-5 w-5" />
            </div>
            <div className="text-start leading-tight">
              <div className="text-base font-extrabold text-navy-900">{t('brand.name', lang)}</div>
              <div className="hidden text-[10px] font-semibold text-slate-500 sm:block">{t('brand.tagline', lang)}</div>
            </div>
          </button>

          {/* App switcher */}
          <div className="relative mx-auto">
            <button
              onClick={() => setSwitcherOpen((s) => !s)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <Icon name={MODES.find((m) => m.key === mode)?.icon ?? 'User'} className="h-4 w-4" />
              <span>{modeLabel[mode]}</span>
              <Icon name="ChevronDown" className="h-4 w-4 text-slate-400" />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute start-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl tj-slide-in">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t('switcher.title', lang)}
                  </p>
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => { setMode(m.key); setSwitcherOpen(false); onNav?.('home'); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-bold transition ${
                        mode === m.key ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon name={m.icon} className="h-4 w-4" />
                      {modeLabel[m.key]}
                      {mode === m.key && <Icon name="CheckCircle2" className="ms-auto h-4 w-4 text-navy-700" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <NotificationBell />

            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              title="Language"
            >
              <Icon name="Globe" className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'ع'}</span>
            </button>

            {showCopilot && (
              <button
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-navy-50 px-2.5 py-2 text-sm font-bold text-navy-700 transition hover:bg-navy-100"
              >
                <Icon name="Bot" className="h-4 w-4" />
                <span className="hidden md:inline">{t('copilot.title', lang)}</span>
              </button>
            )}

            {profile && (
              <button
                onClick={() => onNav?.('profile')}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                title={t('nav.profile', lang)}
              >
                <Icon name="UserCircle2" className="h-4 w-4" />
              </button>
            )}

            {profile && (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                title={t('nav.signout', lang)}
              >
                <Icon name="LogOut" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Title strip */}
      {title && (
        <div className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <h1 className="text-lg font-extrabold text-slate-900">{title}</h1>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      {/* Floating copilot button */}
      {showCopilot && !copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 end-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-400 shadow-lg shadow-navy-900/30 transition hover:bg-navy-800 tj-pulse tj-fab"
          aria-label={t('copilot.title', lang)}
        >
          <Icon name="Bot" className="h-6 w-6" />
        </button>
      )}

      {showCopilot && copilotOpen && <Copilot onClose={() => setCopilotOpen(false)} />}

      <ToastContainer />
    </div>
  );
}
