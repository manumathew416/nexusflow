import React from 'react';
import {
  Workflow,
  LayoutDashboard,
  Bell,
  Cpu,
  Flame,
  Radio,
  Wifi,
  Sparkles,
  Zap
} from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';

export default function Navbar({ activeTab, setActiveTab, onTriggerQuickDemo }) {
  const { connected, activePipelines, systemStatus } = useWebSocket();

  const tabs = [
    { id: 'canvas', label: 'Visual Rule Builder', icon: Workflow },
    { id: 'dashboard', label: 'Live Telemetry Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alert Center', icon: Bell },
    { id: 'devices', label: 'IoT Fleet', icon: Cpu }
  ];

  return (
    <header className="h-16 px-6 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between select-none z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              NexusFlow
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              v1.0
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">Visual IoT Telemetry & Reactive Rule Engine</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Stats & Quick Anomaly Demo Action */}
      <div className="flex items-center gap-3">
        {/* Quick Anomaly Injector Button */}
        <button
          onClick={onTriggerQuickDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold font-mono transition-all border border-rose-500/30 hover:scale-105 shadow-sm shadow-rose-950/40"
          title="Injects instant spike to test rule compilation and alert trigger"
        >
          <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>SPIKE ANOMALY</span>
        </button>

        {/* WebSocket Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-slate-300 font-semibold">{connected ? 'STREAM LIVE' : 'CONNECTING'}</span>
        </div>
      </div>
    </header>
  );
}