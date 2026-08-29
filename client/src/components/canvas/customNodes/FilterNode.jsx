import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { SlidersHorizontal, TrendingUp, Zap, Maximize2, Clock } from 'lucide-react';
import { useWebSocket } from '../../../context/WebSocketContext';

const getOperatorDetails = (data) => {
  const type = data.operatorType || 'threshold';
  switch (type) {
    case 'moving_average':
      return {
        icon: TrendingUp,
        tag: 'Moving Avg',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        param: `Window: ${data.windowSize || 5}`
      };
    case 'rate_of_change':
      return {
        icon: Zap,
        tag: 'Rate of Change',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        param: `Δ > ${data.deltaThreshold || 2}`
      };
    case 'range_gate':
      return {
        icon: Maximize2,
        tag: 'Range Gate',
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        param: `${data.mode || 'outside'} [${data.min || 20}-${data.max || 80}]`
      };
    case 'debounce':
      return {
        icon: Clock,
        tag: 'Debounce',
        color: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        param: `Throttle: ${data.seconds || 5}s`
      };
    default:
      return {
        icon: SlidersHorizontal,
        tag: 'Threshold',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        param: `${data.operator || '>'} ${data.threshold !== undefined ? data.threshold : 80}`
      };
  }
};

const FilterNode = ({ id, data, selected }) => {
  const { nodePulses } = useWebSocket();
  const pulse = nodePulses[id];
  const isPulsing = pulse && (Date.now() - pulse.timestamp < 1200);

  const op = getOperatorDetails(data);
  const IconComponent = op.icon;

  return (
    <div
      className={`relative px-4 py-3 min-w-[210px] rounded-xl bg-slate-900/90 backdrop-blur-md border transition-all duration-300 shadow-xl ${
        selected ? 'border-purple-400 ring-2 ring-purple-400/40' : 'border-slate-700/80 hover:border-purple-500/50'
      } ${isPulsing ? 'shadow-[0_0_25px_rgba(176,38,255,0.6)] border-purple-400 scale-[1.02]' : ''}`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${op.bg} ${op.color} border ${op.border}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${op.color}`}>{op.tag}</div>
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">{data.label || 'Filter'}</div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${isPulsing ? 'bg-purple-400 animate-ping' : 'bg-slate-600'}`} />
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Config:</span>
          <span className="text-purple-300 font-medium">{op.param}</span>
        </div>
        {pulse && pulse.data && pulse.data.movingAverage !== undefined && (
          <div className="flex items-center justify-between text-slate-400">
            <span>Rolling Avg:</span>
            <span className="text-cyan-300 font-bold">{pulse.data.movingAverage}</span>
          </div>
        )}
        {pulse && pulse.data && pulse.data.rateOfChange !== undefined && (
          <div className="flex items-center justify-between text-slate-400">
            <span>Δ Rate:</span>
            <span className="text-amber-300 font-bold">{pulse.data.rateOfChange}/s</span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(FilterNode);