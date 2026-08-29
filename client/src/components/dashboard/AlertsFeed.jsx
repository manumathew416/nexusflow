import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Filter,
  Clock,
  Radio,
  ExternalLink
} from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, clearAllAlerts } from '../../services/api';

export default function AlertsFeed({ onNotification }) {
  const { alerts: liveAlerts, setAlerts } = useWebSocket();
  const [allAlerts, setAllAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [loading, setLoading] = useState(false);

  // Load past alerts from DB
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts({ limit: 100 });
      setAllAlerts(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Merge live WebSocket alerts with historical list
  useEffect(() => {
    if (liveAlerts && liveAlerts.length > 0) {
      setAllAlerts(prev => {
        const liveIds = new Set(liveAlerts.map(a => a.alertId || a._id));
        const rest = prev.filter(a => !liveIds.has(a.alertId || a._id));
        return [...liveAlerts, ...rest];
      });
    }
  }, [liveAlerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId);
      setAllAlerts(prev =>
        prev.map(a => (a.alertId === alertId || a._id === alertId ? { ...a, status: 'acknowledged' } : a))
      );
      if (onNotification) onNotification({ type: 'success', message: 'Alert marked as acknowledged.' });
    } catch (err) {
      if (onNotification) onNotification({ type: 'error', message: 'Failed to acknowledge alert.' });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllAlerts();
      setAllAlerts([]);
      setAlerts([]);
      if (onNotification) onNotification({ type: 'info', message: 'All alert records cleared.' });
    } catch (err) {}
  };

  const filtered = allAlerts.filter(a => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'active') return a.status === 'active';
    if (filterSeverity === 'acknowledged') return a.status === 'acknowledged';
    return a.severity === filterSeverity;
  });

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          icon: AlertTriangle
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          icon: Bell
        };
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md p-5 shadow-2xl flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">Live Rule Engine Alerts</h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold border border-rose-500/30">
                {allAlerts.filter(a => a.status === 'active').length} ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Streamed instantly via compiled RxJS pipelines</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'active', 'critical', 'warning', 'acknowledged'].map(f => (
              <button
                key={f}
                onClick={() => setFilterSeverity(f)}
                className={`px-2 py-1 rounded-md capitalize font-medium transition-colors ${
                  filterSeverity === f
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-xs font-semibold transition-colors border border-slate-700/80"
            title="Clear all alerts"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 pr-1">
        {filtered.map(alert => {
          const style = getSeverityStyle(alert.severity);
          const Icon = style.icon;
          const isAcked = alert.status === 'acknowledged';
          const id = alert.alertId || alert._id;
          const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now';

          return (
            <div
              key={id}
              className={`p-3.5 rounded-xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                isAcked ? 'bg-slate-950/40 border-slate-800 opacity-60' : style.bg
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-lg border shrink-0 ${style.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                      {alert.severity || 'WARNING'}
                    </span>
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {alert.pipelineName || 'NexusFlow Rule'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeStr}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-slate-400">
                    <div>
                      Device: <span className="text-slate-200 font-semibold">{alert.deviceId}</span>
                    </div>
                    <div>
                      Metric: <span className="text-slate-200 font-semibold">{alert.metric}</span>
                    </div>
                    <div>
                      Trigger Value: <span className="text-rose-400 font-bold">{alert.value}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {!isAcked ? (
                  <button
                    onClick={() => handleAcknowledge(id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ack</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/40">
                    ✓ ACKED
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500/40 mb-2" />
            <p className="text-xs font-mono">No active alerts at this moment. System operating within normal thresholds.</p>
          </div>
        )}
      </div>
    </div>
  );
}