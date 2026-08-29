import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Calculator } from 'lucide-react';
import { useWebSocket } from '../../../context/WebSocketContext';

const MathNode = ({ id, data, selected }) => {
  const { nodePulses } = useWebSocket();
  const pulse = nodePulses[id];
  const isPulsing = pulse && (Date.now() - pulse.timestamp < 1200);

  const transformType = data.transformType || 'c_to_f';
  let desc = '°C → °F';
  if (transformType === 'bar_to_psi') desc = 'Bar → PSI';
  if (transformType === 'scale') desc = `× ${data.factor || 1}`;

  return (
    <div
      className={`relative px-4 py-3 min-w-[190px] rounded-xl bg-slate-900/90 backdrop-blur-md border transition-all duration-300 shadow-xl ${
        selected ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-slate-700/80 hover:border-violet-500/50'
      } ${isPulsing ? 'shadow-[0_0_25px_rgba(139,92,246,0.6)] border-violet-400 scale-[1.02]' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">Transform</div>
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[110px]">{data.label || 'Math Node'}</div>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${isPulsing ? 'bg-violet-400 animate-ping' : 'bg-slate-600'}`} />
      </div>

      <div className="font-mono text-[11px] flex items-center justify-between text-slate-400">
        <span>Formula:</span>
        <span className="text-violet-300 font-medium">{desc}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

export default memo(MathNode);