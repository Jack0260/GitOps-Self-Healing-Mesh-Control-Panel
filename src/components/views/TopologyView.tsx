import { useState, useMemo } from 'react';
import { useSim } from '@/context/SimContext';
import { Card, HealthDot, Badge } from '@/components/ui/Primitives';
import { healthColor, healthLabel } from '@/lib/format';
import { Network, Server, Box, X, Cpu, MemoryStick, Clock, AlertTriangle, Zap, RotateCcw } from 'lucide-react';
import type { ClusterInfo, NodeInfo, PodInfo } from '@/types';

export function TopologyView() {
  const { clusters, selectedClusterId, setSelectedClusterId, injectFault, triggerRollback, deployments, anomalies } = useSim();
  const [selectedPod, setSelectedPod] = useState<PodInfo | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);

  const cluster = clusters.find((c) => c.id === selectedClusterId) ?? clusters[0];

  const clusterAnomalies = useMemo(
    () => anomalies.filter((a) => a.clusterId === cluster?.id && !a.resolved),
    [anomalies, cluster?.id],
  );

  if (!cluster) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cluster Topology</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Interactive health visualization across nodes and pods</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {clusters.map((c) => {
            const hc = healthColor(c.health);
            const active = c.id === cluster.id;
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedClusterId(c.id); setSelectedPod(null); setSelectedNode(null); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? `${hc.border} ${hc.bg} ${hc.text}`
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <HealthDot status={c.health} />
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster info bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{cluster.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{cluster.provider} · {cluster.region} · k8s {cluster.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-white text-lg">{cluster.nodes.length}</p>
              <p className="text-slate-400 dark:text-slate-500">Nodes</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-white text-lg">{cluster.nodes.reduce((s, n) => s + n.pods.length, 0)}</p>
              <p className="text-slate-400 dark:text-slate-500">Pods</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-white text-lg">{clusterAnomalies.length}</p>
              <p className="text-slate-400 dark:text-slate-500">Anomalies</p>
            </div>
            <Badge className={`${healthColor(cluster.health).border} ${healthColor(cluster.health).bg} ${healthColor(cluster.health).text}`}>
              <HealthDot status={cluster.health} />
              {healthLabel(cluster.health)}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topology graph */}
        <Card className="lg:col-span-2 p-5 min-h-[500px] relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-50" />
          <div className="relative">
            <TopologyGraph
              cluster={cluster}
              onPodClick={(pod) => { setSelectedPod(pod); setSelectedNode(null); }}
              onNodeClick={(node) => { setSelectedNode(node); setSelectedPod(null); }}
              selectedPod={selectedPod}
              selectedNode={selectedNode}
            />
          </div>
        </Card>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedPod ? (
            <PodDetailPanel pod={selectedPod} cluster={cluster} onClose={() => setSelectedPod(null)} />
          ) : selectedNode ? (
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} onPodClick={(p) => { setSelectedPod(p); setSelectedNode(null); }} />
          ) : (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Topology Legend</h3>
              <div className="space-y-2">
                <LegendItem color="bg-emerald-500" label="Healthy" desc="All metrics within normal range" />
                <LegendItem color="bg-amber-500" label="Degraded" desc="Metrics above warning threshold" />
                <LegendItem color="bg-red-500" label="Failing" desc="Critical threshold exceeded" />
                <LegendItem color="bg-sky-500" label="Pending" desc="Pod not yet running" />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Actions</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">Click any node or pod to view detailed metrics. Use the fault injection button to simulate a failure.</p>
                <button
                  onClick={() => injectFault(cluster.id)}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-2 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Inject Fault
                </button>
              </div>
            </Card>
          )}

          {/* Cluster anomalies */}
          {clusterAnomalies.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Active Anomalies ({clusterAnomalies.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {clusterAnomalies.slice(0, 6).map((a) => (
                  <div key={a.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{a.podName}</span>
                      <Badge className={anomalySeverityColorClass(a.severity)}>{a.severity}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{a.metric}: {a.value.toFixed(1)} &gt; {a.threshold}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function anomalySeverityColorClass(s: 'critical' | 'warning' | 'info'): string {
  return s === 'critical' ? 'border-red-500/30 bg-red-500/10 text-red-400' : s === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-sky-500/30 bg-sky-500/10 text-sky-400';
}

function LegendItem({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-1 w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
      <div>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

// ===== Topology Graph =====

function TopologyGraph({
  cluster, onPodClick, onNodeClick, selectedPod, selectedNode,
}: {
  cluster: ClusterInfo;
  onPodClick: (p: PodInfo) => void;
  onNodeClick: (n: NodeInfo) => void;
  selectedPod: PodInfo | null;
  selectedNode: NodeInfo | null;
}) {
  // Layout: cluster center node, nodes arranged in circle, pods around each node
  const width = 600;
  const height = 460;
  const cx = width / 2;
  const cy = height / 2;
  const nodeCount = cluster.nodes.length;
  const nodeRadius = 150;
  const podRadius = 55;

  const nodePositions = cluster.nodes.map((node, i) => {
    const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2;
    return {
      node,
      x: cx + Math.cos(angle) * nodeRadius,
      y: cy + Math.sin(angle) * nodeRadius,
      angle,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ minHeight: 460 }}>
      {/* Connection lines from cluster to nodes */}
      {nodePositions.map(({ x, y, node }) => {
        const hc = healthColor(node.health);
        const stroke = hc.dot.replace('bg-', '');
        return (
          <line
            key={`line-${node.id}`}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke="currentColor"
            strokeWidth={1.5}
            className={node.health === 'healthy' ? 'text-emerald-500/30' : node.health === 'degraded' ? 'text-amber-500/40' : 'text-red-500/40'}
            strokeDasharray="4 4"
          />
        );
      })}

      {/* Cluster center */}
      <g>
        <circle cx={cx} cy={cy} r="32" fill="currentColor" className="text-sky-500/10" stroke="currentColor" strokeWidth="2" strokeDasharray="0" />
        <circle cx={cx} cy={cy} r="32" fill="none" stroke="currentColor" strokeWidth="2" className={healthColor(cluster.health).text} />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-bold">{cluster.name}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[8px]">{cluster.region}</text>
      </g>

      {/* Nodes and their pods */}
      {nodePositions.map(({ node, x, y, angle }) => {
        const nhc = healthColor(node.health);
        const nodeSelected = selectedNode?.id === node.id;
        const podPositions = node.pods.map((pod, pi) => {
          const pAngle = angle + (pi / node.pods.length) * Math.PI * 1.4 - Math.PI * 0.7;
          return {
            pod,
            px: x + Math.cos(pAngle) * podRadius,
            py: y + Math.sin(pAngle) * podRadius,
          };
        });

        return (
          <g key={node.id}>
            {/* Lines from node to pods */}
            {podPositions.map(({ pod, px, py }) => (
              <line
                key={`pl-${pod.id}`}
                x1={x} y1={y} x2={px} y2={py}
                stroke="currentColor"
                strokeWidth={0.8}
                className={pod.health === 'healthy' ? 'text-slate-300 dark:text-slate-600' : pod.health === 'degraded' ? 'text-amber-500/40' : 'text-red-500/40'}
              />
            ))}

            {/* Pods */}
            {podPositions.map(({ pod, px, py }) => {
              const phc = healthColor(pod.health);
              const isSelected = selectedPod?.id === pod.id;
              return (
                <g key={pod.id} className="cursor-pointer" onClick={() => onPodClick(pod)}>
                  <circle
                    cx={px} cy={py} r={isSelected ? 13 : 10}
                    className={`${phc.text} transition-all`}
                    fill="currentColor" opacity={isSelected ? 0.3 : 0.15}
                  />
                  <circle
                    cx={px} cy={py} r={isSelected ? 13 : 10}
                    className={`${phc.text} transition-all`}
                    fill="none" strokeWidth="1.5"
                  />
                  {pod.health !== 'healthy' && (
                    <circle cx={px} cy={py} r={isSelected ? 13 : 10} fill="none" strokeWidth="1" className={phc.text} opacity="0.3">
                      <animate attributeName="r" values={`${isSelected ? 13 : 10};${isSelected ? 18 : 15};${isSelected ? 13 : 10}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <text x={px} y={py + 22} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[6px]">
                    {pod.name.length > 14 ? pod.name.slice(0, 12) + '..' : pod.name}
                  </text>
                </g>
              );
            })}

            {/* Node circle */}
            <g className="cursor-pointer" onClick={() => onNodeClick(node)}>
              <circle
                cx={x} cy={y} r={nodeSelected ? 24 : 20}
                className={`${nhc.text} transition-all`}
                fill="currentColor" opacity={nodeSelected ? 0.25 : 0.12}
              />
              <circle
                cx={x} cy={y} r={nodeSelected ? 24 : 20}
                className={`${nhc.text} transition-all`}
                fill="none" strokeWidth="2"
              />
              <text x={x} y={y - 3} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px] font-bold">{node.name}</text>
              <text x={x} y={y + 8} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 text-[6px]">{node.role}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Detail panels =====

function PodDetailPanel({ pod, cluster, onClose }: { pod: PodInfo; cluster: ClusterInfo; onClose: () => void }) {
  const { anomalies, deployments, triggerRollback } = useSim();
  const podAnomalies = anomalies.filter((a) => a.podName === pod.name && a.clusterId === cluster.id);
  const hc = healthColor(pod.health);

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{pod.name}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${hc.border} ${hc.bg} ${hc.text}`}><HealthDot status={pod.health} />{healthLabel(pod.health)}</Badge>
          <Badge className="border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{pod.phase}</Badge>
          <Badge className="border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">ns: {pod.namespace}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricBox icon={Cpu} label="CPU" value={`${pod.cpu.toFixed(1)}%`} color={pod.cpu > 88 ? 'text-red-500' : pod.cpu > 75 ? 'text-amber-500' : 'text-emerald-500'} />
          <MetricBox icon={MemoryStick} label="Memory" value={`${pod.memory.toFixed(1)}%`} color={pod.memory > 90 ? 'text-red-500' : pod.memory > 78 ? 'text-amber-500' : 'text-emerald-500'} />
          <MetricBox icon={Clock} label="Latency" value={`${pod.latency.toFixed(0)}ms`} color={pod.latency > 500 ? 'text-red-500' : pod.latency > 200 ? 'text-amber-500' : 'text-emerald-500'} />
          <MetricBox icon={AlertTriangle} label="Error Rate" value={`${pod.errorRate.toFixed(2)}%`} color={pod.errorRate > 5 ? 'text-red-500' : pod.errorRate > 1 ? 'text-amber-500' : 'text-emerald-500'} />
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Restarts: <span className="font-semibold text-slate-700 dark:text-slate-200">{pod.restarts}</span></span>
          <span className="text-slate-500 dark:text-slate-400">Age: <span className="font-semibold text-slate-700 dark:text-slate-200">{pod.age}</span></span>
        </div>

        {podAnomalies.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Related Anomalies ({podAnomalies.length})</p>
            <div className="space-y-1.5">
              {podAnomalies.slice(0, 4).map((a) => (
                <div key={a.id} className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-200">{a.metric}</span>: <span className="font-mono text-amber-600 dark:text-amber-400">{a.value.toFixed(1)} &gt; {a.threshold}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pod.health !== 'healthy' && (
          <button
            onClick={() => {
              const prevDep = deployments.find((d) => d.id.startsWith(`dep-${cluster.id}`) && !d.isCurrent);
              if (prevDep) triggerRollback(cluster.id, prevDep.version, 'manual');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-3 py-2 text-xs font-medium hover:bg-sky-500/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rollback to heal
          </button>
        )}
      </div>
    </Card>
  );
}

function NodeDetailPanel({ node, onClose, onPodClick }: { node: NodeInfo; onClose: () => void; onPodClick: (p: PodInfo) => void }) {
  const hc = healthColor(node.health);
  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{node.name}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${hc.border} ${hc.bg} ${hc.text}`}><HealthDot status={node.health} />{healthLabel(node.health)}</Badge>
          <Badge className="border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{node.role}</Badge>
          <Badge className="border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{node.region}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricBox icon={Cpu} label="Node CPU" value={`${node.cpu.toFixed(1)}%`} color={node.cpu > 88 ? 'text-red-500' : node.cpu > 75 ? 'text-amber-500' : 'text-emerald-500'} />
          <MetricBox icon={MemoryStick} label="Node Memory" value={`${node.memory.toFixed(1)}%`} color={node.memory > 90 ? 'text-red-500' : node.memory > 78 ? 'text-amber-500' : 'text-emerald-500'} />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Pods ({node.pods.length})</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {node.pods.map((pod) => {
              const phc = healthColor(pod.health);
              return (
                <div
                  key={pod.id}
                  onClick={() => onPodClick(pod)}
                  className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700/60 p-2 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HealthDot status={pod.health} />
                    <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{pod.name}</span>
                  </div>
                  <span className={`text-[10px] ${phc.text}`}>{pod.phase}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricBox({ icon: Icon, label, value, color }: { icon: typeof Cpu; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
