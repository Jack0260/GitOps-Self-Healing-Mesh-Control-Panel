// ===== Core domain types =====

export type ThemeMode = 'dark' | 'light' | 'system';

export type HealthStatus = 'healthy' | 'degraded' | 'failing' | 'pending';

export type PodPhase = 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'CrashLoopBackOff';

export type LogSeverity = 'info' | 'warning' | 'error' | 'success' | 'debug';

export type RollbackStatus = 'idle' | 'preflight' | 'executing' | 'verifying' | 'success' | 'failed';

export type PageId = 'overview' | 'topology' | 'telemetry' | 'rollback' | 'logs' | 'settings';

// ===== Cluster model =====

export interface PodInfo {
  id: string;
  name: string;
  namespace: string;
  phase: PodPhase;
  cpu: number;       // 0-100 percent
  memory: number;    // 0-100 percent
  latency: number;   // ms
  errorRate: number; // 0-100 percent
  restarts: number;
  age: string;
  health: HealthStatus;
}

export interface NodeInfo {
  id: string;
  name: string;
  region: string;
  role: 'worker' | 'control-plane';
  cpu: number;
  memory: number;
  pods: PodInfo[];
  health: HealthStatus;
}

export interface ClusterInfo {
  id: string;
  name: string;
  provider: string;
  region: string;
  version: string;
  nodes: NodeInfo[];
  health: HealthStatus;
  currentVersion: string;
  desiredVersion: string;
}

// ===== Telemetry =====

export interface MetricSample {
  t: number;       // timestamp
  cpu: number;
  memory: number;
  latency: number;
  errorRate: number;
}

export interface TelemetrySeries {
  clusterId: string;
  clusterName: string;
  history: MetricSample[];
}

// ===== Anomaly detection =====

export type AnomalyRule = 'error-rate' | 'latency' | 'memory' | 'cpu' | 'restart';

export interface AnomalyEvent {
  id: string;
  timestamp: number;
  rule: AnomalyRule;
  severity: 'critical' | 'warning' | 'info';
  clusterId: string;
  clusterName: string;
  nodeId: string;
  nodeName: string;
  podName: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
  triggeredRollback: boolean;
}

export interface DetectionRuleConfig {
  enabled: boolean;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
}

export type DetectionRules = Record<AnomalyRule, DetectionRuleConfig>;

// ===== Deployments & rollbacks =====

export interface DeploymentVersion {
  id: string;
  version: string;
  commitHash: string;
  author: string;
  message: string;
  timestamp: number;
  health: HealthStatus;
  isCurrent: boolean;
  rollbackCount: number;
}

export interface RollbackEvent {
  id: string;
  timestamp: number;
  fromVersion: string;
  toVersion: string;
  clusterName: string;
  triggeredBy: 'manual' | 'auto';
  anomalyId?: string;
  status: RollbackStatus;
  duration: number; // seconds
  steps: RollbackStep[];
}

export interface RollbackStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  detail: string;
}

// ===== Logs =====

export interface LogEntry {
  id: string;
  timestamp: number;
  severity: LogSeverity;
  source: string;
  message: string;
}

// ===== Settings =====

export interface AutoHealConfig {
  enabled: boolean;
  cooldownSeconds: number;
  maxRollbacksPerHour: number;
  autoTriggerOnCritical: boolean;
}

export interface DeploymentConfig {
  canaryPercentage: number;
  healthCheckWindowSeconds: number;
  autoPromote: boolean;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookEnabled: boolean;
  notifyOnAnomaly: boolean;
  notifyOnRollback: boolean;
}

export interface AppSettings {
  detectionRules: DetectionRules;
  autoHeal: AutoHealConfig;
  deployment: DeploymentConfig;
  notifications: NotificationConfig;
}

// ===== Simulation tick =====

export interface SimState {
  clusters: ClusterInfo[];
  telemetry: TelemetrySeries[];
  anomalies: AnomalyEvent[];
  deployments: DeploymentVersion[];
  rollbacks: RollbackEvent[];
  logs: LogEntry[];
  tick: number;
  running: boolean;
}
