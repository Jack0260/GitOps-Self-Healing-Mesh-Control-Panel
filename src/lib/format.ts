import type { HealthStatus, LogSeverity, RollbackStatus, AnomalyRule } from '@/types';

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function healthColor(h: HealthStatus): { bg: string; text: string; border: string; dot: string; glow: string } {
  switch (h) {
    case 'healthy':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/30' };
    case 'degraded':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', glow: 'shadow-amber-500/30' };
    case 'failing':
      return { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', glow: 'shadow-red-500/30' };
    case 'pending':
      return { bg: 'bg-sky-500/10', text: 'text-sky-500 dark:text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-500', glow: 'shadow-sky-500/30' };
  }
}

export function healthLabel(h: HealthStatus): string {
  switch (h) {
    case 'healthy': return 'Healthy';
    case 'degraded': return 'Degraded';
    case 'failing': return 'Failing';
    case 'pending': return 'Pending';
  }
}

export function severityColor(s: LogSeverity): string {
  switch (s) {
    case 'error': return 'text-red-400';
    case 'warning': return 'text-amber-400';
    case 'info': return 'text-sky-400';
    case 'success': return 'text-emerald-400';
    case 'debug': return 'text-slate-400';
  }
}

export function severityBg(s: LogSeverity): string {
  switch (s) {
    case 'error': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'warning': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'info': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'success': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'debug': return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

export function rollbackStatusColor(s: RollbackStatus): string {
  switch (s) {
    case 'success': return 'text-emerald-400';
    case 'failed': return 'text-red-400';
    case 'executing': case 'preflight': case 'verifying': return 'text-sky-400';
    default: return 'text-slate-400';
  }
}

export function rollbackStatusLabel(s: RollbackStatus): string {
  switch (s) {
    case 'idle': return 'Idle';
    case 'preflight': return 'Pre-flight';
    case 'executing': return 'Executing';
    case 'verifying': return 'Verifying';
    case 'success': return 'Success';
    case 'failed': return 'Failed';
  }
}

export function anomalyRuleLabel(r: AnomalyRule): string {
  switch (r) {
    case 'error-rate': return 'Error Rate';
    case 'latency': return 'Latency';
    case 'memory': return 'Memory';
    case 'cpu': return 'CPU';
    case 'restart': return 'Restart Count';
  }
}

export function anomalySeverityColor(s: 'critical' | 'warning' | 'info'): string {
  switch (s) {
    case 'critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'warning': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'info': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  }
}
