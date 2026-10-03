import { useState, useMemo } from 'react';
import { useSim } from '@/context/SimContext';
import { Card, Badge, HealthDot } from '@/components/ui/Primitives';
import { healthColor, anomalySeverityColor, anomalyRuleLabel, formatTime, timeAgo } from '@/lib/format';
import { TrendingUp, Zap, RotateCcw, Cpu, MemoryStick, Clock, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import type { MetricSample, AnomalyRule } from '@/types';

type MetricType = 'cpu' | 'memory' | 'latency' | 'errorRate';

const METRIC_CONFIG: Record<MetricType, { label: string; unit: string; icon: typeof Cpu; color: string; max: number }> = {
  cpu: { label: 'CPU Usage', unit: '%', icon: Cpu, color: '#3b82f6', max: 100 },
  memory: { label: 'Memory Usage', unit: '%', icon: MemoryStick, color: '#14b8a6', max: 100 },
  latency: { label: 'Request Latency', unit: 'ms', icon: Clock, color: '#f59e0b', max: 800 },
  errorRate: { label: 'Error Rate', unit: '%', icon: AlertTriangle, color: '#ef4444', max: 20 },
};

function LineChart({ data, metric, color, max, threshold }: { data: MetricSample[]; metric: MetricType; color: string; max: number; threshold?: number }) {
  const width = 400;
  const height = 120;
  const padding = { top: 8, right: 8, bottom: 16, left: 32 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;

  if (data.length < 2) return <div className="h-[120px] flex items-center justify-center text-xs text-slate-400">Collecting data...</div>;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w + padding.left;
    const v = d[metric];
    const y = h + padding.top - (Math.min(v, max) / max) * h;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h + padding.top} L ${points[0].x.toFixed(1)} ${h + padding.top} Z`;

  const thresholdY = threshold ? h + padding.top - (Math.min(threshold, max) / max) * h : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = h + padding.top - t * h;
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end" className="fill-slate-400 dark:fill-slate-500 text-[7px]">
              {Math.round(t * max)}{METRIC_CONFIG[metric].unit}
            </text>
          </g>
        );
      })}

      {/* Threshold line */}
      {thresholdY && (
        <line
          x1={padding.left} y1={thresholdY} x2={width - padding.right} y2={thresholdY}
          stroke={color} strokeWidth="1" strokeDasharray="4 2" opacity="0.5"
        />
      )}

      {/* Area + line */}
      <path d={areaD} fill={`url(#grad-${metric})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Current value dot */}
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} className="animate-pulse-slow" />
      )}
    </svg>
  );
}

export function TelemetryView() {
  const { clusters, telemetry, anomalies, resolveAnomaly, triggerRollback, deployments, settings } = useSim();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(clusters[0]?.id ?? null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const cluster = clusters.find((c) => c.id === selectedClusterId) ?? clusters[0];
  const clusterTelemetry = telemetry.find((t) => t.clusterId === cluster?.id);
  const clusterAnomalies = useMemo(
    () => anomalies.filter((a) => a.clusterId === cluster?.id && (severityFilter === 'all' || a.severity === severityFilter)),
    [anomalies, cluster?.id, severityFilter],
  );

  if (!cluster || !clusterTelemetry) return null;

  const runningPods = cluster.nodes.flatMap((n) => n.pods).filter((p) => p.phase === 'Running');
  const avgCpu = runningPods.reduce((s, p) => s + p.cpu, 0) / (runningPods.length || 1);
  const avgMem = runningPods.reduce((s, p) => s + p.memory, 0) / (runningPods.length || 1);
  const avgLat = runningPods.reduce((s, p) => s + p.latency, 0) / (runningPods.length || 1);
  const avgErr = runningPods.reduce((s, p) => s + p.errorRate, 0) / (runningPods.length || 1);

  const lastSample = clusterTelemetry.history[clusterTelemetry.history.length - 1];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Telemetry & Anomaly Detection</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Live metrics with automated anomaly detection</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {clusters.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClusterId(c.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                c.id === cluster.id
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <HealthDot status={c.health} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards with charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(['cpu', 'memory', 'latency', 'errorRate'] as MetricType[]).map((metric) => {
          const cfg = METRIC_CONFIG[metric];
          const Icon = cfg.icon;
          const currentValue = metric === 'cpu' ? avgCpu : metric === 'memory' ? avgMem : metric === 'latency' ? avgLat : avgErr;
          const threshold = settings.detectionRules[metric === 'errorRate' ? 'error-rate' : metric as AnomalyRule]?.threshold;
          const isOver = threshold && currentValue > threshold;

          return (
            <Card key={metric} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{cfg.label}</span>
                </div>
                {isOver && (
                  <Badge className="border-red-500/30 bg-red-500/10 text-red-400">
                    <Zap className="w-2.5 h-2.5" />
                    Over threshold
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {currentValue.toFixed(metric === 'errorRate' ? 2 : 1)}<span className="text-sm font-normal text-slate-400">{cfg.unit}</span>
              </p>
              <LineChart
                data={clusterTelemetry.history}
                metric={metric}
                color={cfg.color}
                max={cfg.max}
                threshold={threshold}
              />
              {threshold && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Threshold: {threshold}{cfg.unit} · {settings.detectionRules[metric === 'errorRate' ? 'error-rate' : metric as AnomalyRule]?.enabled ? 'Enabled' : 'Disabled'}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Anomaly feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anomaly Feed — {cluster.name}</h3>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    severityFilter === s
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {clusterAnomalies.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No anomalies detected for this cluster</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Detection engine monitoring {runningPods.length} pods</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {clusterAnomalies.map((a) => {
                const prevDep = deployments.find((d) => d.id.startsWith(`dep-${a.clusterId}`) && !d.isCurrent);
                return (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 animate-slide-in ${a.resolved ? 'opacity-50' : ''} ${anomalySeverityColor(a.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{anomalyRuleLabel(a.rule)}</span>
                          <Badge className={anomalySeverityColor(a.severity)}>{a.severity}</Badge>
                          {a.triggeredRollback && (
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              <RotateCcw className="w-2.5 h-2.5" />
                              Auto-healed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{a.podName} on {a.nodeName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {a.metric}: <span className="font-bold">{a.value.toFixed(1)}</span> &gt; {a.threshold}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatTime(a.timestamp)} · {timeAgo(a.timestamp)}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {!a.resolved && (
                          <button
                            onClick={() => resolveAnomaly(a.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {!a.resolved && !a.triggeredRollback && prevDep && a.severity === 'critical' && (
                          <button
                            onClick={() => triggerRollback(a.clusterId, prevDep.version, 'manual', a.id)}
                            className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
                          >
                            <RotateCcw className="w-2.5 h-2.5 inline mr-1" />
                            Rollback
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Detection rules status */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Detection Rules</h3>
          <div className="space-y-2">
            {(Object.keys(settings.detectionRules) as AnomalyRule[]).map((rule) => {
              const cfg = settings.detectionRules[rule];
              const ruleAnomalies = clusterAnomalies.filter((a) => a.rule === rule && !a.resolved);
              return (
                <div key={rule} className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{anomalyRuleLabel(rule)}</span>
                    <div className="flex items-center gap-2">
                      {ruleAnomalies.length > 0 && (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">{ruleAnomalies.length} active</Badge>
                      )}
                      <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Threshold: {cfg.threshold} · {cfg.severity}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auto-heal: <span className={settings.autoHeal.enabled ? 'text-emerald-500 font-medium' : 'text-slate-400'}>{settings.autoHeal.enabled ? 'Enabled' : 'Disabled'}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cooldown: {settings.autoHeal.cooldownSeconds}s · Max/hour: {settings.autoHeal.maxRollbacksPerHour}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
