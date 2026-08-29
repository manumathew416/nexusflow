import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import { Cpu, Flame, Activity, Gauge, Snowflake, Radio, CheckCircle, Wifi } from 'lucide-react';
import { fetchDevices } from '../../services/api';

const iconMap = {
  turbine: Flame,
  reactor: Gauge,
  chiller: Snowflake,
  power_meter: Activity,
  sensor: Radio
};

export default function DeviceGrid() {
  const { latestTelemetry } = useWebSocket();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    fetchDevices().then(data => {
      if (data && data.length > 0) {
        setDevices(data);
      } else {
        // Default initial device set
        setDevices([
          { deviceId: 'turbine-01', name: 'Main Gas Turbine 01', type: 'turbine', location: 'Turbine Hall Bay 3', metrics: [{ name: 'temperature', unit: '°C' }, { name: 'vibration', unit: 'mm/s' }] },
          { deviceId: 'reactor-alpha', name: 'Catalytic Reactor Alpha', type: 'reactor', location: 'Synthesis Wing', metrics: [{ name: 'pressure', unit: 'bar' }, { name: 'temperature', unit: '°C' }] },
          { deviceId: 'chiller-unit-3', name: 'Cryogenic Chiller 03', type: 'chiller', location: 'Refrigeration Bay', metrics: [{ name: 'temperature', unit: '°C' }, { name: 'humidity', unit: '%' }] },
          { deviceId: 'power-grid-4', name: 'HV Substation Transformer', type: 'power_meter', location: 'Substation Yard', metrics: [{ name: 'voltage', unit: 'V' }, { name: 'current', unit: 'A' }] }
        ]);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md p-5 shadow-2xl flex flex-col h-full select-none">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Connected IoT Device Fleet</h3>
            <p className="text-xs text-slate-400 font-mono">Real-time status & high-frequency sensor readings</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
          <Wifi className="w-3.5 h-3.5" />
          <span>{devices.length} Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 overflow-y-auto pr-1">
        {devices.map(device => {
          const Icon = iconMap[device.type] || Radio;

          return (
            <div
              key={device.deviceId}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{device.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">{device.location}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  ACTIVE
                </span>
              </div>

              {/* Metrics Values */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80">
                {(device.metrics || []).map(m => {
                  const key = `${device.deviceId}_${m.name}`;
                  const point = latestTelemetry[key];
                  const val = point ? point.value : '--';
                  const unit = m.unit || (point ? point.unit : '');

                  return (
                    <div key={m.name} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] font-mono text-slate-400 uppercase capitalize truncate">{m.name}</div>
                      <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                        {val} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}