import { useSim } from '@/context/SimContext';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { HealthDot } from '@/components/ui/Primitives';
import { Activity, Play, Pause, GitBranch, Zap } from 'lucide-react';
import type { PageId } from '@/types';

const NAV_ITEMS: { id: PageId; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'topology', label: 'Topology', icon: GitBranch },
  { id: 'telemetry', label: 'Telemetry', icon: Zap },
  { id: 'rollback', label: 'Rollback', icon: GitBranch },
  { id: 'logs', label: 'Logs', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Activity },
];

// Import icons for nav
import { LayoutDashboard, Network, TrendingUp, RotateCcw, Terminal, Settings } from 'lucide-react';

const NAV_ICONS: Record<PageId, typeof Activity> = {
  overview: LayoutDashboard,
  topology: Network,
  telemetry: TrendingUp,
  rollback: RotateCcw,
  logs: Terminal,
  settings: Settings,
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { activePage, setActivePage, running, setRunning, clusters, anomalies } = useSim();

  const allPods = clusters.flatMap((c) => c.nodes).flatMap((n) => n.pods);
  const healthyCount = allPods.filter((p) => p.health === 'healthy').length;
  const totalCount = allPods.length;
  const overallHealth = allPods.every((p) => p.health === 'healthy')
    ? 'healthy'
    : allPods.some((p) => p.health === 'failing')
      ? 'failing'
      : 'degraded';

  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/20">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">
                Autonomous GitOps Self-Healing Mesh
              </h1>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight sm:hidden">AGSH Mesh</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">Infrastructure Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60">
              <HealthDot status={overallHealth as 'healthy' | 'degraded' | 'failing'} size="md" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden md:inline">
                {healthyCount}/{totalCount} pods healthy
              </span>
              {unresolvedAnomalies > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-500 dark:text-amber-400">
                  <Zap className="w-3 h-3" />
                  {unresolvedAnomalies}
                </span>
              )}
            </div>

            {/* Pause/resume sim */}
            <button
              onClick={() => setRunning(!running)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                running
                  ? 'border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
              title={running ? 'Pause simulation' : 'Resume simulation'}
            >
              {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{running ? 'Pause' : 'Resume'}</span>
            </button>

            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="sticky top-[57px] h-[calc(100vh-57px)] w-14 lg:w-52 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 glass p-2 lg:p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 mx-auto lg:mx-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/60 hidden lg:block">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 px-2.5 mb-2">Mesh Status</p>
            <div className="space-y-1.5 px-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Clusters</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{clusters.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Nodes</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{clusters.reduce((s, c) => s + c.nodes.length, 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Pods</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
