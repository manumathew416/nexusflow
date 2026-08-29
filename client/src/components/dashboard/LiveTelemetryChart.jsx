import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { useWebSocket } from '../../context/WebSocketContext';
import { Activity, Flame, Gauge, Zap, Pause, Play, RefreshCw } from 'lucide-react';

const DEVICE_OPTIONS = [
  { id: 'turbine-01', name: 'Main Turbine 01', metrics: ['temperature', 'vibration', 'rpm'] },
  { id: 'reactor-alpha', name: 'Reactor Alpha', metrics: ['pressure', 'temperature'] },
  { id: 'chiller-unit-3', name: 'Chiller Unit 03', metrics: ['temperature', 'humidity'] },
  { id: 'power-grid-4', name: 'Power Grid 04', metrics: ['voltage', 'current'] }
];

const METRIC_CONFIG = {
  temperature: { color: '#00f0ff', unit: '°C', threshold: 80, domain: [30, 130] },
  vibration: { color: '#ff007f', unit: 'mm/s', threshold: 4.0, domain: [0, 8] },
  pressure: { color: '#ffb703', unit: 'bar', threshold: 18, domain: [5, 30] },
  humidity: { color: '#38bdf8', unit: '%', threshold: 75, domain: [0, 100] },
  voltage: { color: '#b026ff', unit: 'V', threshold: 520, domain: [350, 600] },
  current: { color: '#10b981', unit: 'A', threshold: 200, domain: [40, 260] },
  rpm: { color: '#f43f5e', unit: 'RPM', threshold: 4200, domain: [2000, 5000] }
};

export default function LiveTelemetryChart() {
  const { telemetryHistory, latestTelemetry, connected } = useWebSocket();
  const [selectedDevice, setSelectedDevice] = useState('turbine-01');
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [isPaused, setIsPaused] = useState(false);

  const device = DEVICE_OPTIONS.find(d => d.id === selectedDevice) || DEVICE_OPTIONS[0];
  const metricCfg = METRIC_CONFIG[selectedMetric] || { color: '#00f0ff', unit: '', threshold: 80, domain: ['auto', 'auto'] };

  // Filter history points for selected device & metric
  const chartData = useMemo(() => {
    if (isPaused) return null;

    const filtered = telemetryHistory.filter(
      p => p.deviceId === selectedDevice && p.metric === selectedMetric
    );

    return filtered.slice(-40).map((p, idx) => {
      const timeStr = p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `t-${idx}`;
      return {
        time: timeStr,
        value: p.value,
        threshold: metricCfg.threshold
      };
    });
  }, [telemetryHistory, selectedDevice, selectedMetric, isPaused, metricCfg.threshold]);

  const currentKey = `${selectedDevice}_${selectedMetric}`;
  const latestPoint = latestTelemetry[currentKey];
  const currentVal = latestPoint ? latestPoint.value : '--';

  // Stats calculation
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) return { max: '--', min: '--', avg: '--' };
    const values = chartData.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    return { max, min, avg };
  }, [chartData]);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md p-5 shadow-2xl flex flex-col h-full select-none">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Live Telemetry Stream</span>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </h3>
            <p className="text-xs text-slate-400 font-mono">Real-time time-series ingest & rule observation</p>
          </div>
        </div>

        {/* Device & Metric Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Device Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {DEVICE_OPTIONS.map(d => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDevice(d.id);
                  if (!d.metrics.includes(selectedMetric)) {
                    setSelectedMetric(d.metrics[0]);
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedDevice === d.id
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
          >
            {device.metrics.map(m => (
              <option key={m} value={m}>
                {m.toUpperCase()} ({METRIC_CONFIG[m]?.unit})
              </option>
            ))}
          </select>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={isPaused ? 'Resume stream' : 'Pause stream view'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Bar */}
      <div className="grid grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Live Reading</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
            {currentVal} <span className="text-xs text-slate-400 font-normal">{metricCfg.unit}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Peak Max</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
            {stats.max} <span className="text-xs text-slate-400 font-normal">{metricCfg.unit}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Window Average</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
            {stats.avg} <span className="text-xs text-slate-400 font-normal">{metricCfg.unit}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Rule Threshold</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            &gt; {metricCfg.threshold} <span className="text-xs text-slate-400 font-normal">{metricCfg.unit}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              fontFamily="JetBrains Mono"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              fontFamily="JetBrains Mono"
              domain={metricCfg.domain}
              unit={metricCfg.unit}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}
              itemStyle={{ color: metricCfg.color }}
            />
            {/* Threshold reference line */}
            <ReferenceLine
              y={metricCfg.threshold}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              label={{
                value: `Alert Threshold (${metricCfg.threshold}${metricCfg.unit})`,
                fill: '#f43f5e',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={`${selectedMetric.toUpperCase()} (${metricCfg.unit})`}
              stroke={metricCfg.color}
              strokeWidth={2.5}
              dot={{ r: 2, fill: metricCfg.color }}
              activeDot={{ r: 6, fill: '#ffffff', stroke: metricCfg.color, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}