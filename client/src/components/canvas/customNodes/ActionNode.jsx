import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Webhook, BellRing, PowerOff, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../../../context/WebSocketContext';

const getActionDetails = (data) => {
  const type = data.actionType || 'alert';
  switch (type) {
    case 'sms':
      return {
        icon: MessageSquare,
        tag: 'SMS Dispatch',
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        target: data.recipient || '+1 (555) 019-8234'
      };
    case 'webhook':
      return {
        icon: Webhook,
        tag: 'Webhook POST',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        target: data.webhookUrl ? data.webhookUrl.replace('https://', '') : 'SCADA API'
      };
    case 'actuator':
      return {
        icon: PowerOff,
        tag: 'Safety Trip',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        target: data.actuatorCommand || 'TRIP_SHUTDOWN'
      };
    default:
      return {
        icon: BellRing,
        tag: 'Dashboard Alert',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        target: 'Real-time Feed'
      };
  }
};

const ActionNode = ({ id, data, selected }) => {
  const { nodePulses } = useWebSocket();
  const pulse = nodePulses[id];
  const isTriggered = pulse && pulse.status === 'triggered' && (Date.now() - pulse.timestamp < 1800);

  const act = getActionDetails(data);
  const IconComponent = act.icon;
  const severity = data.severity || 'warning';

  const severityBadgeColor = {
    critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }[severity] || 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <div
      className={`relative px-4 py-3 min-w-[220px] rounded-xl bg-slate-900/90 backdrop-blur-md border transition-all duration-300 shadow-xl ${
        selected ? 'border-pink-400 ring-2 ring-pink-400/40' : 'border-slate-700/80 hover:border-pink-500/50'
      } ${isTriggered ? 'shadow-[0_0_30px_rgba(255,0,127,0.8)] border-pink-500 scale-105 animate-bounce' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${act.bg} ${act.color} border ${act.border}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${act.color}`}>{act.tag}</div>
            <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">{data.label || 'Action'}</div>
          </div>
        </div>
        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${severityBadgeColor}`}>
          {severity}
        </span>
      </div>

      <div className="space-y-1 font-mono text-[11px]">
        <div className="flex items-center justify-between text-slate-400">
          <span>Target:</span>
          <span className="text-slate-200 font-medium truncate max-w-[130px]">{act.target}</span>
        </div>
        {isTriggered && (
          <div className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse pt-1 border-t border-rose-900/50">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>TRIGGER FIRED!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ActionNode);