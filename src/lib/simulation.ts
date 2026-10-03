import type {
  ClusterInfo,
  NodeInfo,
  PodInfo,
  HealthStatus,
  PodPhase,
  DeploymentVersion,
  AppSettings,
  MetricSample,
  AnomalyEvent,
  AnomalyRule,
  LogEntry,
  LogSeverity,
} from '@/types';

// ===== Helpers =====

let idCounter = 0;
export function uid(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

export function uidReset() {
  idCounter = 0;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function healthFromMetrics(cpu: number, memory: number, latency: number, errorRate: number, phase: PodPhase): HealthStatus {
  if (phase === 'Failed' || phase === 'CrashLoopBackOff') return 'failing';
  if (phase === 'Pending') return 'pending';
  if (errorRate > 5 || latency > 500 || cpu > 90 || memory > 92) return 'failing';
  if (errorRate > 1 || latency > 200 || cpu > 75 || memory > 78) return 'degraded';
  return 'healthy';
}

// ===== Default settings =====

export const DEFAULT_SETTINGS: AppSettings = {
  detectionRules: {
    'error-rate': { enabled: true, threshold: 5, severity: 'critical' },
    latency: { enabled: true, threshold: 500, severity: 'warning' },
    memory: { enabled: true, threshold: 90, severity: 'warning' },
    cpu: { enabled: true, threshold: 88, severity: 'warning' },
    restart: { enabled: true, threshold: 3, severity: 'critical' },
  },
  autoHeal: {
    enabled: true,
    cooldownSeconds: 60,
    maxRollbacksPerHour: 3,
    autoTriggerOnCritical: true,
  },
  deployment: {
    canaryPercentage: 20,
    healthCheckWindowSeconds: 30,
    autoPromote: false,
  },
  notifications: {
    emailEnabled: true,
    slackEnabled: false,
    webhookEnabled: false,
    notifyOnAnomaly: true,
    notifyOnRollback: true,
  },
};

// ===== Cluster generation =====

const PROVIDERS = ['AWS EKS', 'GCP GKE', 'Azure AKS', 'DigitalOcean DOKS'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];
const NAMESPACES = ['production', 'staging', 'monitoring', 'kube-system', 'argocd'];
const POD_PREFIXES = ['api-gateway', 'auth-svc', 'payment-svc', 'user-svc', 'order-svc', 'inventory-svc', 'notification-svc', 'search-svc', 'cache-proxy', 'web-frontend'];
const AUTHORS = ['sarah.chen', 'mike.rivera', 'alex.kim', 'jordan.patel', 'taylor.brooks'];
const COMMIT_MESSAGES = [
  'fix: memory leak in payment processor',
  'feat: add retry logic for downstream calls',
  'refactor: optimize db connection pool',
  'fix: resolve race condition in order queue',
  'feat: implement circuit breaker pattern',
  'chore: bump dependencies to latest',
  'fix: patch CVE-2024-45192 in grpc module',
  'feat: add health check endpoints for all services',
  'refactor: migrate to new config loader',
  'fix: correct timezone handling in scheduler',
];

function makePod(namespace: string, podName: string): PodInfo {
  const phase: PodPhase = pick(['Running', 'Running', 'Running', 'Running', 'Running', 'Pending', 'CrashLoopBackOff', 'Succeeded']);
  const cpu = phase === 'Running' ? rand(15, 70) : rand(0, 20);
  const memory = phase === 'Running' ? rand(20, 65) : rand(0, 15);
  const latency = phase === 'Running' ? rand(20, 120) : 0;
  const errorRate = phase === 'Running' ? rand(0, 0.8) : 0;
  const restarts = phase === 'CrashLoopBackOff' ? Math.floor(rand(3, 12)) : Math.floor(rand(0, 3));
  return {
    id: uid('pod'),
    name: `${podName}-${Math.floor(rand(1000, 9999))}`,
    namespace,
    phase,
    cpu: Math.round(cpu * 10) / 10,
    memory: Math.round(memory * 10) / 10,
    latency: Math.round(latency * 10) / 10,
    errorRate: Math.round(errorRate * 100) / 100,
    restarts,
    age: pick(['2d', '5d', '1w', '3w', '1m', '2m', '45d']),
    health: healthFromMetrics(cpu, memory, latency, errorRate, phase),
  };
}

function makeNode(nodeName: string, region: string, role: 'worker' | 'control-plane'): NodeInfo {
  const podCount = role === 'control-plane' ? 3 : Math.floor(rand(4, 9));
  const pods: PodInfo[] = [];
  for (let i = 0; i < podCount; i++) {
    pods.push(makePod(pick(NAMESPACES), pick(POD_PREFIXES)));
  }
  const cpu = pods.reduce((s, p) => s + p.cpu, 0) / pods.length;
  const memory = pods.reduce((s, p) => s + p.memory, 0) / pods.length;
  return {
    id: uid('node'),
    name: nodeName,
    region,
    role,
    cpu: Math.round(cpu * 10) / 10,
    memory: Math.round(memory * 10) / 10,
    pods,
    health: pods.some((p) => p.health === 'failing')
      ? 'failing'
      : pods.some((p) => p.health === 'degraded')
        ? 'degraded'
        : 'healthy',
  };
}

function makeCluster(idx: number): ClusterInfo {
  const nodeCount = Math.floor(rand(3, 6));
  const nodes: NodeInfo[] = [];
  const region = REGIONS[idx % REGIONS.length];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(makeNode(`node-${idx}-${i}`, region, i === 0 ? 'control-plane' : 'worker'));
  }
  const allPods = nodes.flatMap((n) => n.pods);
  return {
    id: `cluster-${idx}`,
    name: `mesh-cluster-${idx}`,
    provider: PROVIDERS[idx % PROVIDERS.length],
    region,
    version: `1.28.${rand(2, 7).toFixed(0)}`,
    nodes,
    health: allPods.some((p) => p.health === 'failing')
      ? 'failing'
      : allPods.some((p) => p.health === 'degraded')
        ? 'degraded'
        : 'healthy',
    currentVersion: `v2.${rand(3, 6).toFixed(0)}.${rand(0, 9).toFixed(0)}`,
    desiredVersion: `v2.${rand(3, 6).toFixed(0)}.${rand(0, 9).toFixed(0)}`,
  };
}

export function createInitialClusters(count = 4): ClusterInfo[] {
  uidReset();
  return Array.from({ length: count }, (_, i) => makeCluster(i + 1));
}

// ===== Deployment history =====

function makeCommitHash(): string {
  const chars = '0123456789abcdef';
  let h = '';
  for (let i = 0; i < 7; i++) h += chars[Math.floor(Math.random() * 16)];
  return h;
}

export function createDeployments(clusterName: string, clusterId: string): DeploymentVersion[] {
  const versions: DeploymentVersion[] = [];
  const baseMinor = 4;
  for (let i = 5; i >= 0; i--) {
    const isCurrent = i === 0;
    versions.push({
      id: `dep-${clusterId}-${i}`,
      version: `v2.${baseMinor}.${5 - i}`,
      commitHash: makeCommitHash(),
      author: pick(AUTHORS),
      message: pick(COMMIT_MESSAGES),
      timestamp: Date.now() - i * 3600_000 * Math.floor(rand(2, 12)),
      health: isCurrent ? 'healthy' : i % 4 === 0 ? 'degraded' : 'healthy',
      isCurrent,
      rollbackCount: i > 2 ? Math.floor(rand(1, 3)) : 0,
    });
  }
  return versions;
}

// ===== Telemetry tick — mutate metrics toward new values =====

export function tickClusterMetrics(cluster: ClusterInfo, tick: number): { anomalies: AnomalyEvent[]; logs: LogEntry[] } {
  const newAnomalies: AnomalyEvent[] = [];
  const newLogs: LogEntry[] = [];
  const anomalyThreshold = 0.12; // 12% chance of injecting a fault per tick per cluster

  // Occasionally inject a fault to make the sim interesting
  let injecting = Math.random() < anomalyThreshold;
  const targetPod = injecting ? pick(cluster.nodes.flatMap((n) => n.pods.filter((p) => p.phase === 'Running'))) : null;

  for (const node of cluster.nodes) {
    // Node-level metrics derive from pods
    for (const pod of node.pods) {
      if (pod.phase !== 'Running') continue;

      let dCpu = rand(-4, 4);
      let dMem = rand(-3, 3);
      let dLat = rand(-10, 10);
      let dErr = rand(-0.2, 0.2);

      if (targetPod && pod.id === targetPod.id) {
        // Inject a fault burst
        const faultType = pick(['error', 'latency', 'memory', 'cpu'] as const);
        if (faultType === 'error') dErr = rand(8, 18);
        if (faultType === 'latency') dLat = rand(300, 700);
        if (faultType === 'memory') dMem = rand(20, 35);
        if (faultType === 'cpu') dCpu = rand(15, 30);
      }

      pod.cpu = clamp(pod.cpu + dCpu, 0, 100);
      pod.memory = clamp(pod.memory + dMem, 0, 100);
      pod.latency = Math.max(0, pod.latency + dLat);
      pod.errorRate = clamp(pod.errorRate + dErr, 0, 100);
      pod.health = healthFromMetrics(pod.cpu, pod.memory, pod.latency, pod.errorRate, pod.phase);
    }
    node.cpu = node.pods.reduce((s, p) => s + p.cpu, 0) / node.pods.length;
    node.memory = node.pods.reduce((s, p) => s + p.memory, 0) / node.pods.length;
    node.health = node.pods.some((p) => p.health === 'failing')
      ? 'failing'
      : node.pods.some((p) => p.health === 'degraded')
        ? 'degraded'
        : 'healthy';
  }

  cluster.health = cluster.nodes.some((n) => n.health === 'failing')
    ? 'failing'
    : cluster.nodes.some((n) => n.health === 'degraded')
      ? 'degraded'
      : 'healthy';

  return { anomalies: newAnomalies, logs: newLogs };
}

// ===== Anomaly detection =====

export function detectAnomalies(
  cluster: ClusterInfo,
  settings: AppSettings,
  tick: number,
): AnomalyEvent[] {
  const detected: AnomalyEvent[] = [];
  const rules = settings.detectionRules;

  for (const node of cluster.nodes) {
    for (const pod of node.pods) {
      if (pod.phase !== 'Running') continue;

      // error rate
      if (rules['error-rate'].enabled && pod.errorRate > rules['error-rate'].threshold) {
        detected.push(makeAnomaly(cluster, node, pod, 'error-rate', pod.errorRate, rules['error-rate'].threshold, 'error rate %'));
      }
      // latency
      if (rules.latency.enabled && pod.latency > rules.latency.threshold) {
        detected.push(makeAnomaly(cluster, node, pod, 'latency', pod.latency, rules.latency.threshold, 'latency ms'));
      }
      // memory
      if (rules.memory.enabled && pod.memory > rules.memory.threshold) {
        detected.push(makeAnomaly(cluster, node, pod, 'memory', pod.memory, rules.memory.threshold, 'memory %'));
      }
      // cpu
      if (rules.cpu.enabled && pod.cpu > rules.cpu.threshold) {
        detected.push(makeAnomaly(cluster, node, pod, 'cpu', pod.cpu, rules.cpu.threshold, 'cpu %'));
      }
      // restart
      if (rules.restart.enabled && pod.restarts > rules.restart.threshold) {
        detected.push(makeAnomaly(cluster, node, pod, 'restart', pod.restarts, rules.restart.threshold, 'restart count'));
      }
    }
  }

  return detected;
}

function makeAnomaly(
  cluster: ClusterInfo,
  node: NodeInfo,
  pod: PodInfo,
  rule: AnomalyRule,
  value: number,
  threshold: number,
  metric: string,
): AnomalyEvent {
  const severity = value > threshold * 2 ? 'critical' : value > threshold * 1.4 ? 'warning' : 'info';
  return {
    id: uid('anomaly'),
    timestamp: Date.now(),
    rule,
    severity,
    clusterId: cluster.id,
    clusterName: cluster.name,
    nodeId: node.id,
    nodeName: node.name,
    podName: pod.name,
    metric,
    value: Math.round(value * 100) / 100,
    threshold,
    message: `${pod.name}: ${metric} exceeded threshold (${value.toFixed(1)} > ${threshold})`,
    resolved: false,
    triggeredRollback: false,
  };
}

// ===== Log generation =====

export function makeLog(severity: LogSeverity, source: string, message: string): LogEntry {
  return { id: uid('log'), timestamp: Date.now(), severity, source, message };
}

// ===== Telemetry history =====

export function makeInitialHistory(cluster: ClusterInfo, samples = 30): MetricSample[] {
  const history: MetricSample[] = [];
  for (let i = samples; i >= 0; i--) {
    const cpu = rand(30, 70);
    const memory = rand(30, 65);
    const latency = rand(30, 100);
    const errorRate = rand(0, 0.5);
    history.push({ t: Date.now() - i * 3000, cpu, memory, latency, errorRate });
  }
  return history;
}

export function pushSample(history: MetricSample[], cluster: ClusterInfo, maxSamples = 30): MetricSample[] {
  const allPods = cluster.nodes.flatMap((n) => n.pods.filter((p) => p.phase === 'Running'));
  if (allPods.length === 0) return history;
  const sample: MetricSample = {
    t: Date.now(),
    cpu: allPods.reduce((s, p) => s + p.cpu, 0) / allPods.length,
    memory: allPods.reduce((s, p) => s + p.memory, 0) / allPods.length,
    latency: allPods.reduce((s, p) => s + p.latency, 0) / allPods.length,
    errorRate: allPods.reduce((s, p) => s + p.errorRate, 0) / allPods.length,
  };
  const next = [...history, sample];
  if (next.length > maxSamples) next.shift();
  return next;
}

// ===== Rollback steps =====

export function makeRollbackSteps(fromVer: string, toVer: string): { label: string; detail: string }[] {
  return [
    { label: 'Pre-flight checks', detail: `Verifying target version ${toVer} compatibility` },
    { label: 'Cordon affected nodes', detail: 'Marking nodes as unschedulable for new pods' },
    { label: 'Drain workloads', detail: `Gracefully evacuating pods from version ${fromVer}` },
    { label: 'Apply GitOps manifest', detail: `Reverting deployment manifest to ${toVer}` },
    { label: 'Roll out pods', detail: 'Starting replacement pods with previous image' },
    { label: 'Health verification', detail: 'Running readiness probes on new pods' },
    { label: 'Uncordon nodes', detail: 'Re-enabling scheduling on affected nodes' },
  ];
}
