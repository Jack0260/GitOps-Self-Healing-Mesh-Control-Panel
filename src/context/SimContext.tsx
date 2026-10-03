import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  ClusterInfo,
  TelemetrySeries,
  AnomalyEvent,
  DeploymentVersion,
  RollbackEvent,
  LogEntry,
  AppSettings,
  PageId,
  MetricSample,
  RollbackStep,
} from '@/types';
import {
  createInitialClusters,
  createDeployments,
  tickClusterMetrics,
  detectAnomalies,
  makeInitialHistory,
  pushSample,
  makeLog,
  DEFAULT_SETTINGS,
  makeRollbackSteps,
  uid,
} from '@/lib/simulation';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const MAX_LOGS = 200;
const MAX_ANOMALIES = 50;
const MAX_TELEMETRY = 30;
const TICK_MS = 3000;

interface SimContextValue {
  clusters: ClusterInfo[];
  telemetry: TelemetrySeries[];
  anomalies: AnomalyEvent[];
  deployments: DeploymentVersion[];
  rollbacks: RollbackEvent[];
  logs: LogEntry[];
  settings: AppSettings;
  running: boolean;
  tick: number;
  activePage: PageId;
  selectedClusterId: string | null;
  selectedAnomalyId: string | null;
  setActivePage: (p: PageId) => void;
  setSelectedClusterId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  setRunning: (r: boolean) => void;
  clearLogs: () => void;
  clearAnomalies: () => void;
  resolveAnomaly: (id: string) => void;
  triggerRollback: (clusterId: string, toVersion: string, triggeredBy: 'manual' | 'auto', anomalyId?: string) => void;
  injectFault: (clusterId: string) => void;
}

const SimContext = createContext<SimContextValue | null>(null);

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error('useSim must be used within SimProvider');
  return ctx;
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [clusters, setClusters] = useState<ClusterInfo[]>(() => createInitialClusters(4));
  const [telemetry, setTelemetry] = useState<TelemetrySeries[]>(() => {
    const cl = createInitialClusters(4);
    return cl.map((c) => ({ clusterId: c.id, clusterName: c.name, history: makeInitialHistory(c) }));
  });
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [deployments, setDeployments] = useState<DeploymentVersion[]>(() => {
    const cl = createInitialClusters(4);
    return cl.flatMap((c) => createDeployments(c.name, c.id));
  });
  const [rollbacks, setRollbacks] = useState<RollbackEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    makeLog('info', 'system', 'GitOps self-healing mesh initialized'),
    makeLog('info', 'system', 'Connected to 4 clusters across 4 regions'),
    makeLog('success', 'controller', 'All clusters reporting healthy status'),
    makeLog('info', 'argocd', 'Watching 24 application resources for drift'),
  ]);
  const [settings, setSettings] = useLocalStorage<AppSettings>('agshm-settings', DEFAULT_SETTINGS);
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const runningRef = useRef(running);
  runningRef.current = running;
  const lastRollbackTime = useRef<Record<string, number>>({});
  const rollbackCountThisHour = useRef<Record<string, number>>({});

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [...prev, entry];
      if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS);
      return next;
    });
  }, []);

  const addAnomalies = useCallback((newOnes: AnomalyEvent[]) => {
    if (newOnes.length === 0) return;
    setAnomalies((prev) => {
      const next = [...newOnes, ...prev];
      if (next.length > MAX_ANOMALIES) next.length = MAX_ANOMALIES;
      return next;
    });
    for (const a of newOnes) {
      addLog(makeLog(a.severity === 'critical' ? 'error' : 'warning', 'anomaly-detector', a.message));
    }
  }, [addLog]);

  // Main tick loop
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);

      setClusters((prevClusters) => {
        const updated = prevClusters.map((c) => ({ ...c, nodes: c.nodes.map((n) => ({ ...n, pods: n.pods.map((p) => ({ ...p })) })) }));
        const allNewAnomalies: AnomalyEvent[] = [];

        for (const cluster of updated) {
          tickClusterMetrics(cluster, 0);

          // Push telemetry sample
          setTelemetry((prevT) => {
            const existing = prevT.find((t) => t.clusterId === cluster.id);
            if (!existing) return prevT;
            const newHistory = pushSample(existing.history, cluster, MAX_TELEMETRY);
            return prevT.map((t) => (t.clusterId === cluster.id ? { ...t, history: newHistory } : t));
          });

          // Detect anomalies
          const detected = detectAnomalies(cluster, settingsRef.current, 0);
          allNewAnomalies.push(...detected);
        }

        if (allNewAnomalies.length > 0) {
          addAnomalies(allNewAnomalies);

          // Auto-heal: trigger rollback on critical anomalies if enabled
          const cfg = settingsRef.current.autoHeal;
          if (cfg.enabled && cfg.autoTriggerOnCritical) {
            const criticals = allNewAnomalies.filter((a) => a.severity === 'critical' && !a.triggeredRollback);
            for (const c of criticals) {
              const now = Date.now();
              const lastTime = lastRollbackTime.current[c.clusterId] ?? 0;
              const cooldownOk = (now - lastTime) / 1000 > cfg.cooldownSeconds;
              const count = rollbackCountThisHour.current[c.clusterId] ?? 0;
              const withinLimit = count < cfg.maxRollbacksPerHour;
              if (cooldownOk && withinLimit) {
                // Find the previous deployment version for this cluster
                const clusterDeps = deployments.filter((d) => d.id.startsWith(`dep-${c.clusterId}`));
                const prevDep = clusterDeps.find((d) => !d.isCurrent);
                if (prevDep) {
                  lastRollbackTime.current[c.clusterId] = now;
                  rollbackCountThisHour.current[c.clusterId] = count + 1;
                  triggerRollbackInternal(c.clusterId, prevDep.version, 'auto', c.id);
                }
              }
            }
          }
        }

        return updated;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, addAnomalies, addLog, deployments]);

  // Reset hourly rollback counts
  useEffect(() => {
    const interval = setInterval(() => {
      rollbackCountThisHour.current = {};
    }, 3600_000);
    return () => clearInterval(interval);
  }, []);

  const triggerRollbackInternal = useCallback(
    (clusterId: string, toVersion: string, triggeredBy: 'manual' | 'auto', anomalyId?: string) => {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (!cluster) return;

      const currentDep = deployments.find((d) => d.id.startsWith(`dep-${clusterId}`) && d.isCurrent);
      const fromVersion = currentDep?.version ?? 'unknown';

      const steps = makeRollbackSteps(fromVersion, toVersion).map((s) => ({
        label: s.label,
        detail: s.detail,
        status: 'pending' as const,
      }));

      const rbId = uid('rollback');
      const rbEvent: RollbackEvent = {
        id: rbId,
        timestamp: Date.now(),
        fromVersion,
        toVersion,
        clusterName: cluster.name,
        triggeredBy,
        anomalyId,
        status: 'preflight',
        duration: 0,
        steps,
      };

      setRollbacks((prev) => [rbEvent, ...prev].slice(0, 20));

      addLog(makeLog('info', 'rollback-controller', `Rollback initiated: ${cluster.name} ${fromVersion} → ${toVersion} (${triggeredBy})`));

      // Mark anomaly as triggered rollback
      if (anomalyId) {
        setAnomalies((prev) => prev.map((a) => (a.id === anomalyId ? { ...a, triggeredRollback: true } : a)));
      }

      // Simulate step-by-step progression
      let stepIdx = 0;
      const stepInterval = setInterval(() => {
        setRollbacks((prev) => {
          const rb = prev.find((r) => r.id === rbId);
          if (!rb) { clearInterval(stepInterval); return prev; }

          if (stepIdx < rb.steps.length) {
            const newSteps = rb.steps.map((s, i) => {
              if (i < stepIdx) return { ...s, status: 'done' as const };
              if (i === stepIdx) return { ...s, status: 'running' as const };
              return s;
            });

            const status = stepIdx === 0 ? 'preflight' : stepIdx < 4 ? 'executing' : stepIdx < rb.steps.length - 1 ? 'verifying' : rb.status;
            const updated = { ...rb, steps: newSteps, status: status as RollbackEvent['status'], duration: Math.round((Date.now() - rb.timestamp) / 1000) };
            return prev.map((r) => (r.id === rbId ? updated : r));
          }

          // All steps done
          clearInterval(stepInterval);
          const finalSteps = rb.steps.map((s) => ({ ...s, status: 'done' as const }));

          // 95% success rate
          const success = Math.random() > 0.05;
          const finalStatus = success ? 'success' : 'failed';

          if (success) {
            // Update deployments: mark new version as current
            setDeployments((prevD) =>
              prevD.map((d) => {
                if (d.id.startsWith(`dep-${clusterId}`)) {
                  if (d.version === toVersion) return { ...d, isCurrent: true, health: 'healthy' as const };
                  if (d.isCurrent) return { ...d, isCurrent: false };
                }
                return d;
              }),
            );
            addLog(makeLog('success', 'rollback-controller', `Rollback completed: ${cluster.name} now running ${toVersion} (${Math.round((Date.now() - rb.timestamp) / 1000)}s)`));
          } else {
            addLog(makeLog('error', 'rollback-controller', `Rollback FAILED: ${cluster.name} health verification failed for ${toVersion}`));
          }

          const final = { ...rb, steps: finalSteps, status: finalStatus as RollbackEvent['status'], duration: Math.round((Date.now() - rb.timestamp) / 1000) };
          return prev.map((r) => (r.id === rbId ? final : r));
        });

        stepIdx++;
      }, 800);
    },
    [clusters, deployments, addLog],
  );

  const triggerRollback = useCallback(
    (clusterId: string, toVersion: string, triggeredBy: 'manual' | 'auto', anomalyId?: string) => {
      triggerRollbackInternal(clusterId, toVersion, triggeredBy, anomalyId);
    },
    [triggerRollbackInternal],
  );

  const injectFault = useCallback(
    (clusterId: string) => {
      setClusters((prev) => {
        const updated = prev.map((c) => ({ ...c, nodes: c.nodes.map((n) => ({ ...n, pods: n.pods.map((p) => ({ ...p })) })) }));
        const cluster = updated.find((c) => c.id === clusterId);
        if (!cluster) return prev;

        const runningPods = cluster.nodes.flatMap((n) => n.pods.filter((p) => p.phase === 'Running'));
        if (runningPods.length === 0) return prev;
        const target = runningPods[Math.floor(Math.random() * runningPods.length)];
        const faultType = Math.random();
        if (faultType < 0.33) {
          target.errorRate = Math.round(Math.random() * 10 + 8) * 100 / 100;
          target.latency = target.latency + Math.random() * 200;
        } else if (faultType < 0.66) {
          target.latency = target.latency + Math.random() * 500 + 300;
          target.cpu = Math.min(100, target.cpu + 25);
        } else {
          target.memory = Math.min(100, target.memory + 30);
          target.cpu = Math.min(100, target.cpu + 20);
        }
        target.health = target.errorRate > 5 || target.latency > 500 ? 'failing' : 'degraded';

        addLog(makeLog('warning', 'fault-injector', `Injected fault into ${target.name} on ${cluster.name}`));
        return updated;
      });
    },
    [addLog],
  );

  const clearLogs = useCallback(() => setLogs([]), []);
  const clearAnomalies = useCallback(() => setAnomalies([]), []);

  const resolveAnomaly = useCallback((id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  }, []);

  const value: SimContextValue = {
    clusters,
    telemetry,
    anomalies,
    deployments,
    rollbacks,
    logs,
    settings,
    running,
    tick,
    activePage,
    selectedClusterId,
    selectedAnomalyId,
    setActivePage,
    setSelectedClusterId,
    setSelectedAnomalyId,
    setSettings,
    setRunning,
    clearLogs,
    clearAnomalies,
    resolveAnomaly,
    triggerRollback,
    injectFault,
  };

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
