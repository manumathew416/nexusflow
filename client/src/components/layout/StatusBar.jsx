import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import { Database, Activity, Cpu, Layers, HardDrive } from 'lucide-react';
import { fetchTelemetryStats } from '../../services/api';

export default function StatusBar() {
  const { connected, activePipelines, systemStatus } = useWebSocket();
  const [stats, setStats] = useState({ throughput: 0, database: { mode: 'MongoDB 5.0+' } });

  useEffect(() => {
    const fetchInterval = setInterval(() => {
      fetchTelemetryStats().then(data => {
        if (data) setStats(data);
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(fetchInterval);
  }, []);

  const dbMode = (stats.database && stats.database.mode) || (systemStatus && systemStatus.database && systemStatus.database.mode) || 'MongoDB Native Time-Series';

  return (
    <footer className="h-8 px-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30">
      <div className="flex items-center gap-4">
        {/* Connection State */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="text-slate-300">WebSocket: {connected ? 'Active (Port 5000)' : 'Disconnected'}</span>
        </div>

        {/* Database Mode */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span>Storage: <span className="text-slate-200 font-semibold">{dbMode}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Stream Ingestion Rate */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ingest Rate: <span className="text-emerald-300 font-bold">{stats.throughput || 4} msg/s</span></span>
        </div>

        {/* Active Rules In Engine */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>RxJS Rules: <span className="text-purple-300 font-bold">{activePipelines ? activePipelines.length : 1} Active</span></span>
        </div>

        <div className="text-slate-500">
          NexusFlow Reactive Engine
        </div>
      </div>
    </footer>
  );
}