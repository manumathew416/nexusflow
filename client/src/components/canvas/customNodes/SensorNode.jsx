import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Radio, Flame, Activity, Gauge, Snowflake, Cpu } from 'lucide-react';
import { useWebSocket } from '../../../context/WebSocketContext';

const getIcon = (metric) => {
  switch (metric) {
    case 'temperature': return Flame;
    case 'vibration': return Activity;
    case 'pressure': return Gauge;
    case 'humidity': return Snowflake;
    default: return Radio;
  }
};

const SensorNode = ({ id, data, selected }) => {
  const { latestTelemetry, nodePulses } = useWebSocket();
  const pulse = nodePulses[id];
  const isPulsing = pulse && (Date.now() - pulse.timestamp < 1200);

  const deviceId = data.deviceId || 'turbine-01';
  const metric = data.metric || 'temperature';
  const key = `${deviceId}_${metric}`;
  const latest = latestTelemetry[key];
  const liveVal = latest ? latest.value : (data.nominal || '--');
  const unit = data.unit || (latest ? latest.unit : '');

  const IconComponent = getIcon(metric);

  return (
    <div
      className={`relative px-4 py-3 min-w-[210px] rounded-xl bg-slate-900/90 backdrop-blur-md border transition-all duration-300 shadow-xl ${
        selected ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-700/80 hover:border-cyan-500/50'
      } ${isPulsing ? 'shadow-[0_0_25px_rgba(0,240,255,0.6)] border-cyan-400 scale-[1.02]' : ''}`}
    >
      {/* Glow dot indicator */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">Data Source</div>
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">{data.label || 'Sensor Source'}</div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${isPulsing ? 'bg-cyan-400 animate-ping' : 'bg-emerald-500'}`} />
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Device:</span>
          <span className="text-slate-200 font-medium">{deviceId}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Metric:</span>
          <span className="text-slate-200 font-medium capitalize">{metric}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span className="text-slate-400">Live Reading:</span>
          <span className="text-xs font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40">
            {liveVal} {unit}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(SensorNode);