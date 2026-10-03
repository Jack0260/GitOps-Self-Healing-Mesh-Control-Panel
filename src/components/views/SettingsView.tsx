import { useSim } from '@/context/SimContext';
import { Card, Toggle, Badge } from '@/components/ui/Primitives';
import { anomalyRuleLabel } from '@/lib/format';
import {
  Settings as SettingsIcon, Zap, RotateCcw, Rocket, Bell,
  AlertTriangle, Clock, Gauge, Shield, Save, RotateCcw as Reset,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/lib/simulation';
import type { AppSettings, AnomalyRule } from '@/types';

export function SettingsView() {
  const { settings, setSettings } = useSim();

  const updateRule = (rule: AnomalyRule, field: 'enabled' | 'threshold' | 'severity', value: boolean | number | 'critical' | 'warning' | 'info') => {
    setSettings((prev) => ({
      ...prev,
      detectionRules: {
        ...prev.detectionRules,
        [rule]: { ...prev.detectionRules[rule], [field]: value },
      },
    }));
  };

  const updateAutoHeal = (field: keyof AppSettings['autoHeal'], value: boolean | number) => {
    setSettings((prev) => ({ ...prev, autoHeal: { ...prev.autoHeal, [field]: value } }));
  };

  const updateDeployment = (field: keyof AppSettings['deployment'], value: boolean | number) => {
    setSettings((prev) => ({ ...prev, deployment: { ...prev.deployment, [field]: value } }));
  };

  const updateNotifications = (field: keyof AppSettings['notifications'], value: boolean) => {
    setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, [field]: value } }));
  };

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure anomaly detection, auto-healing, and deployment behavior</p>
        </div>
        <button
          onClick={resetSettings}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Reset className="w-3.5 h-3.5" />
          Reset to defaults
        </button>
      </div>

      {/* Anomaly Detection Rules */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anomaly Detection Rules</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Configure thresholds for automated anomaly detection</p>
          </div>
        </div>

        <div className="space-y-3">
          {(Object.keys(settings.detectionRules) as AnomalyRule[]).map((rule) => {
            const cfg = settings.detectionRules[rule];
            return (
              <div key={rule} className="rounded-lg border border-slate-200 dark:border-slate-700/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{anomalyRuleLabel(rule)}</span>
                    <Badge className={cfg.enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'}>
                      {cfg.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <Toggle checked={cfg.enabled} onChange={(v) => updateRule(rule, 'enabled', v)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Threshold</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={cfg.threshold}
                        onChange={(e) => updateRule(rule, 'threshold', Math.max(0, Number(e.target.value)))}
                        disabled={!cfg.enabled}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 disabled:opacity-50"
                        min={0}
                        step={rule === 'restart' ? 1 : rule === 'latency' ? 10 : 0.5}
                      />
                      <span className="text-xs text-slate-400 shrink-0">
                        {rule === 'latency' ? 'ms' : rule === 'restart' ? 'count' : '%'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Severity</label>
                    <select
                      value={cfg.severity}
                      onChange={(e) => updateRule(rule, 'severity', e.target.value as 'critical' | 'warning' | 'info')}
                      disabled={!cfg.enabled}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 disabled:opacity-50"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Auto-Heal Configuration */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Auto-Heal Configuration</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Automated rollback triggers for critical anomalies</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable auto-heal</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Automatically trigger rollbacks on critical anomalies</p>
            </div>
            <Toggle checked={settings.autoHeal.enabled} onChange={(v) => updateAutoHeal('enabled', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-trigger on critical</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Only trigger for critical-severity anomalies</p>
            </div>
            <Toggle checked={settings.autoHeal.autoTriggerOnCritical} onChange={(v) => updateAutoHeal('autoTriggerOnCritical', v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Cooldown period (seconds)
              </label>
              <input
                type="number"
                value={settings.autoHeal.cooldownSeconds}
                onChange={(e) => updateAutoHeal('cooldownSeconds', Math.max(0, Number(e.target.value)))}
                disabled={!settings.autoHeal.enabled}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Max rollbacks per hour
              </label>
              <input
                type="number"
                value={settings.autoHeal.maxRollbacksPerHour}
                onChange={(e) => updateAutoHeal('maxRollbacksPerHour', Math.max(0, Number(e.target.value)))}
                disabled={!settings.autoHeal.enabled}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
                min={0}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Deployment Settings */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Deployment Settings</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Canary rollout and health check configuration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Canary percentage (%)</label>
            <input
              type="range"
              value={settings.deployment.canaryPercentage}
              onChange={(e) => updateDeployment('canaryPercentage', Number(e.target.value))}
              className="w-full accent-sky-500"
              min={0}
              max={100}
              step={5}
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0%</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{settings.deployment.canaryPercentage}%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Health check window (seconds)</label>
            <input
              type="number"
              value={settings.deployment.healthCheckWindowSeconds}
              onChange={(e) => updateDeployment('healthCheckWindowSeconds', Math.max(5, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              min={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-promote canary</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Automatically promote canary to full rollout when healthy</p>
            </div>
            <Toggle checked={settings.deployment.autoPromote} onChange={(v) => updateDeployment('autoPromote', v)} />
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notification Preferences</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Configure alert delivery channels</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email notifications</span>
            </div>
            <Toggle checked={settings.notifications.emailEnabled} onChange={(v) => updateNotifications('emailEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Slack notifications</span>
            </div>
            <Toggle checked={settings.notifications.slackEnabled} onChange={(v) => updateNotifications('slackEnabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Webhook notifications</span>
            </div>
            <Toggle checked={settings.notifications.webhookEnabled} onChange={(v) => updateNotifications('webhookEnabled', v)} />
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notify on anomaly</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Send alerts when anomalies are detected</p>
              </div>
              <Toggle checked={settings.notifications.notifyOnAnomaly} onChange={(v) => updateNotifications('notifyOnAnomaly', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Notify on rollback</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Send alerts when rollbacks are triggered</p>
              </div>
              <Toggle checked={settings.notifications.notifyOnRollback} onChange={(v) => updateNotifications('notifyOnRollback', v)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Persistence notice */}
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Save className="w-3.5 h-3.5" />
        All settings are automatically saved and restored on reload.
      </div>
    </div>
  );
}
