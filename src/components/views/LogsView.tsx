import { useState, useRef, useEffect, useMemo } from 'react';
import { useSim } from '@/context/SimContext';
import { Card, Badge } from '@/components/ui/Primitives';
import { severityColor, severityBg, formatTime } from '@/lib/format';
import { Terminal, Pause, Play, Trash2, Filter, Download, ChevronDown } from 'lucide-react';
import type { LogSeverity } from '@/types';

const SEVERITIES: LogSeverity[] = ['info', 'warning', 'error', 'success', 'debug'];

export function LogsView() {
  const { logs, clearLogs, running } = useSim();
  const [paused, setPaused] = useState(false);
  const [filters, setFilters] = useState<Set<LogSeverity>>(new Set(SEVERITIES));
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogCount = useRef(logs.length);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (!filters.has(l.severity)) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filters, search]);

  // Auto-scroll to bottom when new logs arrive (unless paused)
  useEffect(() => {
    if (paused) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLogCount.current = logs.length;
  }, [logs, paused]);

  const toggleFilter = (sev: LogSeverity) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const allEnabled = filters.size === SEVERITIES.length;

  const handleDownload = () => {
    const text = filteredLogs
      .map((l) => `[${formatTime(l.timestamp)}] [${l.severity.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agshm-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Logs Stream</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time event stream from the GitOps self-healing mesh</p>
        </div>
        <Badge className={running ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'}>
          <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          {running ? 'Streaming' : 'Paused'}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        {/* Log toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 p-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPaused(!paused)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                paused
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={clearLogs}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 w-40 sm:w-56"
          />
        </div>

        {/* Severity filters */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/60 px-3 py-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setFilters(allEnabled ? new Set() : new Set(SEVERITIES))}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {allEnabled ? 'Deselect all' : 'Select all'}
          </button>
          {SEVERITIES.map((sev) => {
            const active = filters.has(sev);
            return (
              <button
                key={sev}
                onClick={() => toggleFilter(sev)}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                  active ? severityBg(sev) : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-50'
                }`}
              >
                {sev}
              </button>
            );
          })}
          <div className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
            {filteredLogs.length} / {logs.length} entries
          </div>
        </div>

        {/* Log stream */}
        <div
          ref={scrollRef}
          className="h-[520px] overflow-y-auto scrollbar-thin bg-slate-50 dark:bg-slate-950/60 font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
              <Terminal className="w-10 h-10 mb-2" />
              <p>No log entries match the current filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-3 py-1.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors animate-slide-in"
                >
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={`shrink-0 font-bold uppercase w-14 ${severityColor(log.severity)}`}>
                    {log.severity}
                  </span>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400 w-28 truncate">
                    [{log.source}]
                  </span>
                  <span className="text-slate-700 dark:text-slate-200 break-all">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            <span>agshm-controller</span>
          </div>
          <span>{paused ? 'Stream paused' : 'Auto-scrolling'} · {filteredLogs.length} entries</span>
        </div>
      </Card>
    </div>
  );
}
