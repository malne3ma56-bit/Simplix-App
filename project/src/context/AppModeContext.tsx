import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AppMode } from '@/types';

type AppModeContextValue = {
  mode: AppMode;
  setMode: (m: AppMode) => void;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('tj_mode');
    if (saved === 'provider' || saved === 'admin') return saved;
    return 'customer';
  });

  const update = (m: AppMode) => {
    setMode(m);
    localStorage.setItem('tj_mode', m);
  };

  return <AppModeContext.Provider value={{ mode, setMode: update }}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
