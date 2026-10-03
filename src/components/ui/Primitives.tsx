import type { ReactNode } from 'react';
import { healthColor } from '@/lib/format';
import type { HealthStatus } from '@/types';

export function HealthDot({ status, size = 'sm' }: { status: HealthStatus; size?: 'sm' | 'md' | 'lg' }) {
  const c = healthColor(status);
  const sz = size === 'lg' ? 'w-3 h-3' : size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  return (
    <span className={`relative inline-flex ${sz} rounded-full ${c.dot} ${status !== 'healthy' ? 'animate-pulse-slow' : ''}`}>
      {status !== 'healthy' && (
        <span className={`absolute inset-0 rounded-full ${c.dot} opacity-60 animate-ping`} />
      )}
    </span>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 ${onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'emerald' }: { value: number; max?: number; color?: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorClass = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'red' ? 'bg-red-500' : 'bg-sky-500';
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center gap-2"
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
    </button>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <svg className={`animate-spin ${sz} text-sky-500`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
