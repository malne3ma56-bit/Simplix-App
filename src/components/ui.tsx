import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

export function Button({
  children, onClick, variant = 'primary', className = '', disabled, type = 'button', size = 'md',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'accent' | 'warning';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm shadow-navy-900/10',
    ghost: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-navy-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    accent: 'bg-gold-500 text-white hover:bg-gold-600',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = 'slate', className = '' }: { children: ReactNode; color?: string; className?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    navy: 'bg-navy-100 text-navy-700',
    gold: 'bg-gold-100 text-gold-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
    red: 'bg-red-100 text-red-700',
    teal: 'bg-teal-100 text-teal-700',
    orange: 'bg-orange-100 text-orange-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${colors[color] ?? colors.slate} ${className}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon = 'Package', title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <span className="text-3xl">{icon === 'Package' ? '📦' : ''}</span>
      </div>
      <p className="text-base font-bold text-slate-700">{title}</p>
      {desc && <p className="mt-1 text-sm text-slate-500 max-w-sm">{desc}</p>}
    </div>
  );
}

export function formatAed(n: number): string {
  return `${Math.round(n * 100) / 100} د.إ`;
}
