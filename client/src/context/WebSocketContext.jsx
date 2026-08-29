import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [ingestRate, setIngestRate] = useState(0);
  const [activePipelines, setActivePipelines] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState({});
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [nodePulses, setNodePulses] = useState({}); // nodeId -> timestamp
  const [edgePulses, setEdgePulses] = useState({}); // edgeId -> timestamp
  const [systemStatus, setSystemStatus] = useState(null);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // If dev mode on port 5173, backend is on 5000, Vite proxies /ws or connect direct:
    const wsUrl = window.location.port === '5173'
      ? `${protocol}//${host}:5000`
      : `${protocol}//${window.location.host}`;

    console.log(`[WS Context] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Context] WebSocket Connected.');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const now = Date.now();

        switch (msg.type) {
          case 'system:handshake':
            setSystemStatus(msg);
            if (msg.activePipelines) setActivePipelines(msg.activePipelines);
            break;

          case 'telemetry:point': {
            const point = msg.telemetry;
            const key = `${point.deviceId}_${point.metric}`;

            setLatestTelemetry(prev => ({
              ...prev,
              [key]: point
            }));

            setTelemetryHistory(prev => {
              const updated = [...prev, point];
              if (updated.length > 200) {
                return updated.slice(updated.length - 200);
              }
              return updated;
            });
            break;
          }

          case 'pipeline:alert': {
            const alert = msg.alert;
            setAlerts(prev => [alert, ...prev.slice(0, 99)]);
            break;
          }

          case 'pipeline:node_pulse': {
            setNodePulses(prev => ({
              ...prev,
              [msg.nodeId]: {
                timestamp: now,
                status: msg.status,
                data: msg.data
              }
            }));
            break;
          }

          case 'pipeline:edge_pulse': {
            setEdgePulses(prev => ({
              ...prev,
              [msg.edgeId]: now
            }));
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.warn('WS Message parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS Context] WebSocket Disconnected. Retrying in 2s...');
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = (err) => {
      console.warn('[WS Context] WebSocket Error');
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  // Clean old pulses periodically
  useEffect(() => {
    const pulseCleanup = setInterval(() => {
      const threshold = Date.now() - 1500;
      setNodePulses(prev => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.timestamp > threshold) next[k] = v;
        }
        return next;
      });
      setEdgePulses(prev => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > threshold) next[k] = v;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(pulseCleanup);
  }, []);

  return (
    <WebSocketContext.Provider value={{
      connected,
      ingestRate,
      latestTelemetry,
      telemetryHistory,
      alerts,
      setAlerts,
      nodePulses,
      edgePulses,
      systemStatus,
      activePipelines,
      setActivePipelines
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};