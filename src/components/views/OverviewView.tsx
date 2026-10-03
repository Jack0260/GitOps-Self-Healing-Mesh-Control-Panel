import { useSim } from '@/context/SimContext';
import { Card, HealthDot, Badge, ProgressBar } from '@/components/ui/Primitives';
import { healthColor, healthLabel, timeAgo, formatTime, anomalySeverityColor, anomalyRuleLabel } from '@/lib/format';
import {
  Server, Box, AlertTriangle, Activity, GitBranch, Zap, RotateCcw,
  TrendingUp, TrendingDown, Cpu, MemoryStick, Clock, AlertCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

function KpiCard({
  icon: Icon, label, value, sub, trend, color,
}: {
  icon: typeof Server; label: string; value: string | number; sub?: string;
  trend?: 'up' | 'down' | 'neutral'; color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-xs">
          {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> : null}
        </div>
      )}
    </Card>
  );
}

export function OverviewView() {
  const { clusters, anomalies, rollbacks, telemetry, setActivePage, setSelectedClusterId } = useSim();

  const allNodes = clusters.flatMap((c) => c.nodes);
  const allPods = allNodes.flatMap((n) => n.pods);
  const healthyPods = allPods.filter((p) => p.health === 'healthy').length;
  const degradedPods = allPods.filter((p) => p.health === 'degraded').length;
  const failingPods = allPods.filter((p) => p.health === 'failing').length;
  const pendingPods = allPods.filter((p) => p.health === 'pending').length;
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);
  const activeRollbacks = rollbacks.filter((r) => r.status === 'preflight' || r.status === 'executing' || r.status === 'verifying');
  const completedRollbacks = rollbacks.filter((r) => r.status === 'success');
  const failedRollbacks = rollbacks.filter((r) => r.status === 'failed');

  const avgCpu = allPods.filter((p) => p.phase === 'Running').reduce((s, p) => s + p.cpu, 0) / (allPods.filter((p) => p.phase === 'Running').length || 1);
  const avgMem = allPods.filter((p) => p.phase === 'Running').reduce((s, p) => s + p.memory, 0) / (allPods.filter((p) => p.phase === 'Running').length || 1);
  const avgLat = allPods.filter((p) => p.phase === 'Running').reduce((s, p) => s + p.latency, 0) / (allPods.filter((p) => p.phase === 'Running').length || 1);
  const avgErr = allPods.filter((p) => p.phase === 'Running').reduce((s, p) => s + p.errorRate, 0) / (allPods.filter((p) => p.phase === 'Running').length || 1);

  const healthScore = Math.round((healthyPods / allPods.length) * 100);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mesh Overview</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time infrastructure health across all clusters</p>
        </div>
        <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Activity className="w-3 h-3" />
          Live
        </Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard icon={Server} label="Clusters" value={clusters.length} color="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
        <KpiCard icon={Box} label="Total Pods" value={allPods.length} sub={`${allNodes.length} nodes`} color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        <KpiCard icon={AlertCircle} label="Anomalies" value={unresolvedAnomalies.length} sub={`${anomalies.length} total detected`} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <KpiCard icon={RotateCcw} label="Rollbacks" value={completedRollbacks.length} sub={`${failedRollbacks.length} failed`} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <KpiCard icon={Cpu} label="Avg CPU" value={`${avgCpu.toFixed(1)}%`} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
        <KpiCard icon={MemoryStick} label="Avg Memory" value={`${avgMem.toFixed(1)}%`} color="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
      </div>

      {/* Health score + pod breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mesh Health Score</h3>
            <Badge className={`border-${healthColor(healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'failing').border} ${healthColor(healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'failing').bg} ${healthColor(healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'failing').text}`}>
              <HealthDot status={healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'failing'} />
              {healthScore > 80 ? 'Healthy' : healthScore > 50 ? 'Degraded' : 'Critical'}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                  className={healthScore > 80 ? 'text-emerald-500' : healthScore > 50 ? 'text-amber-500' : 'text-red-500'}
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{healthScore}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-emerald-600 dark:text-emerald-400">Healthy</span><span className="font-semibold text-slate-700 dark:text-slate-200">{healthyPods}</span></div>
                <ProgressBar value={healthyPods} max={allPods.length} color="emerald" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-amber-600 dark:text-amber-400">Degraded</span><span className="font-semibold text-slate-700 dark:text-slate-200">{degradedPods}</span></div>
                <ProgressBar value={degradedPods} max={allPods.length} color="amber" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-red-600 dark:text-red-400">Failing</span><span className="font-semibold text-slate-700 dark:text-slate-200">{failingPods}</span></div>
                <ProgressBar value={failingPods} max={allPods.length} color="red" />
              </div>
              {pendingPods > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-sky-600 dark:text-sky-400">Pending</span><span className="font-semibold text-slate-700 dark:text-slate-200">{pendingPods}</span></div>
                  <ProgressBar value={pendingPods} max={allPods.length} color="sky" />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Average metrics */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Average Metrics (Running Pods)</h3>
          <div className="space-y-4">
            <MetricRow icon={Cpu} label="CPU Usage" value={avgCpu} unit="%" max={100} warning={75} critical={90} />
            <MetricRow icon={MemoryStick} label="Memory Usage" value={avgMem} unit="%" max={100} warning={78} critical={92} />
            <MetricRow icon={Clock} label="Avg Latency" value={avgLat} unit="ms" max={500} warning={200} critical={500} fixed={1} />
            <MetricRow icon={AlertTriangle} label="Error Rate" value={avgErr} unit="%" max={10} warning={1} critical={5} fixed={2} />
          </div>
        </Card>

        {/* Active rollbacks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Active Rollbacks</h3>
            <button onClick={() => setActivePage('rollback')} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">View all</button>
          </div>
          {activeRollbacks.length === 0 ? (
            <div className="text-center py-6">
              <RotateCcw className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No active rollbacks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRollbacks.slice(0, 4).map((rb) => (
                <div key={rb.id} className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{rb.clusterName}</span>
                    <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <Activity className="w-3 h-3 animate-pulse" />
                      {rb.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{rb.fromVersion} → {rb.toVersion}</p>
                  <div className="mt-2">
                    <ProgressBar value={rb.steps.filter((s) => s.status === 'done').length} max={rb.steps.length} color="sky" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {completedRollbacks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Completed: {completedRollbacks.length}</span>
                <span className="text-red-500">Failed: {failedRollbacks.length}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Cluster summary + recent anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cluster cards */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cluster Status</h3>
            <button onClick={() => setActivePage('topology')} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">Topology</button>
          </div>
          <div className="space-y-2">
            {clusters.map((c) => {
              const cPods = c.nodes.flatMap((n) => n.pods);
              const cHealthy = cPods.filter((p) => p.health === 'healthy').length;
              const hc = healthColor(c.health);
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedClusterId(c.id); setActivePage('topology'); }}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700/60 p-3 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <HealthDot status={c.health} size="md" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{c.provider} · {c.region} · k8s {c.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cHealthy}/{cPods.length} pods</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{c.nodes.length} nodes</p>
                    </div>
                    <Badge className={`${hc.border} ${hc.bg} ${hc.text}`}>
                      {healthLabel(c.health)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent anomalies */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Anomalies</h3>
            <button onClick={() => setActivePage('telemetry')} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">Telemetry</button>
          </div>
          {anomalies.length === 0 ? (
            <div className="text-center py-6">
              <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No anomalies detected</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Detection engine is monitoring</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {anomalies.slice(0, 10).map((a) => (
                <div key={a.id} className={`rounded-lg border p-3 ${a.resolved ? 'opacity-50' : ''} ${anomalySeverityColor(a.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{anomalyRuleLabel(a.rule)}</span>
                        {a.triggeredRollback && <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"><RotateCcw className="w-2.5 h-2.5" />Auto-healed</Badge>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">{a.podName}: {a.metric} {a.value.toFixed(1)} &gt; {a.threshold}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{a.clusterName} · {formatTime(a.timestamp)}</p>
                    </div>
                    <Badge className={anomalySeverityColor(a.severity)}>{a.severity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, unit, max, warning, critical, fixed = 1 }: {
  icon: typeof Cpu; label: string; value: number; unit: string; max: number; warning: number; critical: number; fixed?: number;
}) {
  const color: 'emerald' | 'amber' | 'red' = value > critical ? 'red' : value > warning ? 'amber' : 'emerald';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        </div>
        <span className={`text-sm font-bold ${color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`}>
          {value.toFixed(fixed)}{unit}
        </span>
      </div>
      <ProgressBar value={value} max={max} color={color} />
    </div>
  );
}
