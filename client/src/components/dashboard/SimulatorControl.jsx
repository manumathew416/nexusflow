import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  AlertOctagon,
  Flame,
  Gauge,
  Activity,
  Sliders,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  fetchSimulatorStatus,
  startSimulator,
  stopSimulator,
  setSimulatorFrequency,
  triggerAnomaly
} from '../../services/api';

export default function SimulatorControl({ onNotification }) {
  const [isRunning, setIsRunning] = useState(true);
  const [frequencyMs, setFrequency] = useState(1000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSimulatorStatus().then(status => {
      if (status) {
        setIsRunning(status.isRunning);
        setFrequency(status.frequencyMs || 1000);
      }
    }).catch(() => {});
  }, []);

  const handleToggleRunning = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await stopSimulator();
        setIsRunning(false);
        onNotification({ type: 'info', message: 'Sensor Simulator paused.' });
      } else {
        await startSimulator(frequencyMs);
        setIsRunning(true);
        onNotification({ type: 'success', message: 'Sensor Simulator running.' });
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleFrequencyChange = async (e) => {
    const val = Number(e.target.value);
    setFrequency(val);
    try {
      await setSimulatorFrequency(val);
    } catch (err) {}
  };

  const handleInjectAnomaly = async ({ deviceId, metric, magnitude, durationSec, label }) => {
    try {
      await triggerAnomaly({ deviceId, metric, magnitude, durationSec });
      onNotification({
        type: 'warning',
        message: `Injected Anomaly: +${magnitude} on [${deviceId} - ${metric}]. Rule engine will evaluate!`
      });
    } catch (err) {
      onNotification({ type: 'error', message: `Anomaly injection error: ${err.message}` });
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md p-5 shadow-2xl flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Telemetry Hardware Simulator</h3>
            <p className="text-xs text-slate-400 font-mono">Emits realistic physics waveforms & triggers rule anomalies</p>
          </div>
        </div>

        <button
          onClick={handleToggleRunning}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-200 border shadow-md ${
            isRunning
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400 font-bold'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'PAUSE STREAM' : 'START STREAM'}</span>
        </button>
      </div>

      {/* Ingestion Frequency Slider */}
      <div className="my-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Sampling Rate / Frequency
          </span>
          <span className="text-xs font-bold font-mono text-cyan-300">
            {frequencyMs} ms <span className="text-slate-500 text-[10px]">({Math.round(1000 / frequencyMs)} Hz)</span>
          </span>
        </div>
        <input
          type="range"
          min="200"
          max="3000"
          step="100"
          value={frequencyMs}
          onChange={handleFrequencyChange}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>Fast (200ms)</span>
          <span>Standard (1000ms)</span>
          <span>Slow (3000ms)</span>
        </div>
      </div>

      {/* Quick Anomaly Triggers for Demo */}
      <div>
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          <span>Interactive Anomaly Injections (Click to Test Rules)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Overheat */}
          <button
            onClick={() =>
              handleInjectAnomaly({
                deviceId: 'turbine-01',
                metric: 'temperature',
                magnitude: 35,
                durationSec: 10,
                label: 'Turbine Overheat'
              })
            }
            className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 hover:border-rose-500 hover:bg-rose-900/30 text-left transition-all duration-200 group shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
                Turbine Overheat
              </div>
            </div>
            <p className="text-[10px] font-mono text-rose-300/80 mt-1.5">
              +35°C Spike on Turbine-01 (Triggers SMS Overheat rule)
            </p>
          </button>

          {/* Pressure Surge */}
          <button
            onClick={() =>
              handleInjectAnomaly({
                deviceId: 'reactor-alpha',
                metric: 'pressure',
                magnitude: 9.0,
                durationSec: 8,
                label: 'Pressure Surge'
              })
            }
            className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 hover:border-amber-500 hover:bg-amber-900/30 text-left transition-all duration-200 group shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                Reactor Surge
              </div>
            </div>
            <p className="text-[10px] font-mono text-amber-300/80 mt-1.5">
              +9.0 bar on Reactor-Alpha (Triggers Rate-of-Change rule)
            </p>
          </button>

          {/* High Vibration */}
          <button
            onClick={() =>
              handleInjectAnomaly({
                deviceId: 'turbine-01',
                metric: 'vibration',
                magnitude: 4.5,
                durationSec: 8,
                label: 'Bearing Vibration'
              })
            }
            className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 hover:border-purple-500 hover:bg-purple-900/30 text-left transition-all duration-200 group shadow-md"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-purple-300">
                Vibration Trip
              </div>
            </div>
            <p className="text-[10px] font-mono text-purple-300/80 mt-1.5">
              +4.5 mm/s on Turbine-01 (Triggers Safety Relay Trip)
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}