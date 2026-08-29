import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { useWebSocket } from '../../../context/WebSocketContext';

export default function CustomGlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const { edgePulses } = useWebSocket();
  const pulseTimestamp = edgePulses[id];
  const isPulsing = pulseTimestamp && (Date.now() - pulseTimestamp < 1500);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isPulsing ? '#00f0ff' : '#475569',
          strokeWidth: isPulsing ? 3 : 2,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }}
      />
      {isPulsing && (
        <path
          d={edgePath}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={3.5}
          strokeDasharray="6 6"
          className="pulsing-edge pointer-events-none"
        />
      )}
    </>
  );
}