import { useState } from 'react';
import { useSim } from '@/context/SimContext';
import { Card, Badge, HealthDot } from '@/components/ui/Primitives';
import { healthColor, healthLabel, timeAgo, formatDateTime, rollbackStatusColor, rollbackStatusLabel } from '@/lib/format';
import {
  RotateCcw, GitBranch, CheckCircle, XCircle, Loader, Clock,
  User, AlertTriangle, Zap, ArrowRight, History, X,
} from 'lucide-react';
import type { DeploymentVersion, ClusterInfo } from '@/types';

export function RollbackView() {
  const { clusters, deployments, rollbacks, triggerRollback } = useSim();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(clusters[0]?.id ?? null);
  const [confirmDep, setConfirmDep] = useState<DeploymentVersion | null>(null);
  const [confirmCluster, setConfirmCluster] = useState<ClusterInfo | null>(null);

  const cluster = clusters.find((c) => c.id === selectedClusterId) ?? clusters[0];
  const clusterDeps = deployments.filter((d) => d.id.startsWith(`dep-${cluster?.id}`));
  const clusterRollbacks = rollbacks.filter((r) => r.clusterName === cluster?.name);
  const activeRollback = clusterRollbacks.find((r) => r.status === 'preflight' || r.status === 'executing' || r.status === 'verifying');

  if (!cluster) return null;

  const handleConfirm = () => {
    if (confirmDep && confirmCluster) {
      triggerRollback(confirmCluster.id, confirmDep.version, 'manual');
      setConfirmDep(null);
      setConfirmCluster(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Rollback Simulation</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">One-click deployment rollback with automated health verification</p>
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

      {/* Active rollback progress */}
      {activeRollback && (
        <Card className="p-5 border-sky-500/30 bg-sky-500/5">
          <div className="flex items-center gap-3 mb-4">
            <Loader className="w-5 h-5 text-sky-500 animate-spin" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Rollback in progress: {activeRollback.fromVersion} → {activeRollback.toVersion}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeRollback.clusterName} · {rollbackStatusLabel(activeRollback.status)} · {activeRollback.duration}s elapsed
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {activeRollback.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="shrink-0">
                  {step.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {step.status === 'running' && <Loader className="w-4 h-4 text-sky-500 animate-spin" />}
                  {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                  {step.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${step.status === 'pending' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${(activeRollback.steps.filter((s) => s.status === 'done').length / activeRollback.steps.length) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deployment versions */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Deployment Versions</h3>
          <div className="space-y-2">
            {clusterDeps.map((dep) => {
              const hc = healthColor(dep.health);
              const isCurrent = dep.isCurrent;
              const canRollback = !isCurrent && !activeRollback;
              return (
                <div
                  key={dep.id}
                  className={`rounded-lg border p-4 transition-all ${isCurrent ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        <GitBranch className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{dep.version}</p>
                          {isCurrent && <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">Current</Badge>}
                          {dep.rollbackCount > 0 && <Badge className="border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{dep.rollbackCount} rollbacks</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{dep.message}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{dep.author}</span>
                          <span className="font-mono">#{dep.commitHash}</span>
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{timeAgo(dep.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${hc.border} ${hc.bg} ${hc.text}`}>
                        <HealthDot status={dep.health} />
                        {healthLabel(dep.health)}
                      </Badge>
                      {canRollback && (
                        <button
                          onClick={() => { setConfirmDep(dep); setConfirmCluster(cluster); }}
                          className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-3 py-1.5 text-xs font-medium hover:bg-sky-500/20 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Rollback history */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rollback History</h3>
          </div>
          {clusterRollbacks.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No rollbacks yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
              {clusterRollbacks.map((rb) => (
                <div key={rb.id} className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {rb.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      {rb.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      {(rb.status === 'preflight' || rb.status === 'executing' || rb.status === 'verifying') && <Loader className="w-4 h-4 text-sky-500 animate-spin" />}
                      <span className={`text-xs font-semibold ${rollbackStatusColor(rb.status)}`}>
                        {rollbackStatusLabel(rb.status)}
                      </span>
                    </div>
                    <Badge className={rb.triggeredBy === 'auto' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}>
                      {rb.triggeredBy === 'auto' ? <><Zap className="w-2.5 h-2.5" />Auto</> : 'Manual'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {rb.fromVersion} <ArrowRight className="w-3 h-3 inline" /> {rb.toVersion}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDateTime(rb.timestamp)} · {rb.duration}s
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation modal */}
      {confirmDep && confirmCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => { setConfirmDep(null); setConfirmCluster(null); }}>
          <Card className="max-w-md w-full mx-4 p-6" onClick={() => {}}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Rollback</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{confirmCluster.name}</p>
                </div>
              </div>
              <button onClick={() => { setConfirmDep(null); setConfirmCluster(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">From</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{clusterDeps.find((d) => d.isCurrent)?.version}</span>
              </div>
              <div className="flex items-center justify-center my-2">
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">To</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{confirmDep.version}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Pre-flight compatibility checks
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Graceful pod draining
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                GitOps manifest reversion
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Post-deploy health verification
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDep(null); setConfirmCluster(null); }}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-sky-500 text-white px-4 py-2 text-sm font-medium hover:bg-sky-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Execute Rollback
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
