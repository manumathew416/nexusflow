export const NODE_CATEGORIES = {
  SOURCE: 'source',
  FILTER: 'filter',
  MATH: 'math',
  ACTION: 'action'
};

export const AVAILABLE_NODES = [
  // Data Sources
  {
    type: 'sensorNode',
    category: NODE_CATEGORIES.SOURCE,
    title: 'Turbine Temperature',
    description: 'Gas turbine exhaust temperature sensor',
    icon: 'Flame',
    color: 'from-amber-500 to-orange-600',
    defaultData: {
      label: 'Turbine-01 Temp Sensor',
      nodeCategory: 'source',
      deviceId: 'turbine-01',
      metric: 'temperature',
      unit: '°C',
      nominal: 68
    }
  },
  {
    type: 'sensorNode',
    category: NODE_CATEGORIES.SOURCE,
    title: 'Turbine Vibration',
    description: 'Bearing vibration accelerometer',
    icon: 'Activity',
    color: 'from-cyan-500 to-blue-600',
    defaultData: {
      label: 'Turbine Vibration Sensor',
      nodeCategory: 'source',
      deviceId: 'turbine-01',
      metric: 'vibration',
      unit: 'mm/s',
      nominal: 1.8
    }
  },
  {
    type: 'sensorNode',
    category: NODE_CATEGORIES.SOURCE,
    title: 'Reactor Pressure',
    description: 'Catalytic reactor chamber pressure',
    icon: 'Gauge',
    color: 'from-rose-500 to-red-600',
    defaultData: {
      label: 'Reactor Core Pressure',
      nodeCategory: 'source',
      deviceId: 'reactor-alpha',
      metric: 'pressure',
      unit: 'bar',
      nominal: 12.5
    }
  },
  {
    type: 'sensorNode',
    category: NODE_CATEGORIES.SOURCE,
    title: 'Cryogenic Chiller',
    description: 'Refrigerant temperature & humidity',
    icon: 'Snowflake',
    color: 'from-sky-400 to-indigo-600',
    defaultData: {
      label: 'Chiller-03 Temp Sensor',
      nodeCategory: 'source',
      deviceId: 'chiller-unit-3',
      metric: 'temperature',
      unit: '°C',
      nominal: 4.2
    }
  },
  {
    type: 'sensorNode',
    category: NODE_CATEGORIES.SOURCE,
    title: 'Custom Sensor',
    description: 'Any arbitrary device ID & metric stream',
    icon: 'Radio',
    color: 'from-emerald-500 to-teal-600',
    defaultData: {
      label: 'Custom IoT Node',
      nodeCategory: 'source',
      deviceId: 'custom-sensor-1',
      metric: 'telemetry',
      unit: '',
      nominal: 50
    }
  },

  // Math & Filters
  {
    type: 'filterNode',
    category: NODE_CATEGORIES.FILTER,
    title: 'Threshold Filter',
    description: 'Triggers when value > , < , == threshold',
    icon: 'SlidersHorizontal',
    color: 'from-purple-500 to-indigo-600',
    defaultData: {
      label: 'Threshold Gate (> 80)',
      nodeCategory: 'filter',
      operatorType: 'threshold',
      operator: '>',
      threshold: 80
    }
  },
  {
    type: 'filterNode',
    category: NODE_CATEGORIES.FILTER,
    title: 'Moving Average',
    description: 'Rolling window average filter',
    icon: 'TrendingUp',
    color: 'from-blue-500 to-cyan-600',
    defaultData: {
      label: 'Moving Avg (N=5)',
      nodeCategory: 'filter',
      operatorType: 'moving_average',
      windowSize: 5
    }
  },
  {
    type: 'filterNode',
    category: NODE_CATEGORIES.FILTER,
    title: 'Rate of Change',
    description: 'Calculates differential Δv / Δt',
    icon: 'Zap',
    color: 'from-yellow-500 to-amber-600',
    defaultData: {
      label: 'Rate of Change (Δ > 2)',
      nodeCategory: 'filter',
      operatorType: 'rate_of_change',
      deltaThreshold: 2.0
    }
  },
  {
    type: 'filterNode',
    category: NODE_CATEGORIES.FILTER,
    title: 'Range Gate',
    description: 'Passes if inside or outside [min, max]',
    icon: 'Maximize2',
    color: 'from-teal-500 to-emerald-600',
    defaultData: {
      label: 'Range Filter (20-80)',
      nodeCategory: 'filter',
      operatorType: 'range_gate',
      min: 20,
      max: 80,
      mode: 'outside'
    }
  },
  {
    type: 'mathNode',
    category: NODE_CATEGORIES.MATH,
    title: 'Math Transform',
    description: 'Unit conversion (°C to °F, scale, offset)',
    icon: 'Calculator',
    color: 'from-violet-500 to-fuchsia-600',
    defaultData: {
      label: 'Unit Transform (°C → °F)',
      nodeCategory: 'math',
      operatorType: 'math_transform',
      transformType: 'c_to_f',
      factor: 1,
      offset: 0
    }
  },
  {
    type: 'filterNode',
    category: NODE_CATEGORIES.FILTER,
    title: 'Debounce Gate',
    description: 'Prevents alert storms by throttling events',
    icon: 'Clock',
    color: 'from-slate-500 to-zinc-600',
    defaultData: {
      label: 'Debounce (10s)',
      nodeCategory: 'filter',
      operatorType: 'debounce',
      seconds: 10
    }
  },

  // Actions & Triggers
  {
    type: 'actionNode',
    category: NODE_CATEGORIES.ACTION,
    title: 'SMS Alert (Mock)',
    description: 'Dispatches emergency SMS notification',
    icon: 'MessageSquare',
    color: 'from-pink-500 to-rose-600',
    defaultData: {
      label: 'SMS Alert Dispatcher',
      nodeCategory: 'action',
      actionType: 'sms',
      severity: 'critical',
      recipient: '+1 (555) 019-8234',
      messageTemplate: 'CRITICAL: {deviceId} anomaly! {metric} reached {value}{unit}.'
    }
  },
  {
    type: 'actionNode',
    category: NODE_CATEGORIES.ACTION,
    title: 'Webhook Trigger',
    description: 'Sends real-time HTTP POST payload',
    icon: 'Webhook',
    color: 'from-amber-500 to-red-500',
    defaultData: {
      label: 'SCADA Webhook POST',
      nodeCategory: 'action',
      actionType: 'webhook',
      severity: 'warning',
      webhookUrl: 'https://scada-ops.internal/api/v1/trigger',
      messageTemplate: 'WARNING: SCADA alert for {deviceId} [{metric}={value}{unit}]'
    }
  },
  {
    type: 'actionNode',
    category: NODE_CATEGORIES.ACTION,
    title: 'Dashboard Alert',
    description: 'Real-time alert banner & audio alert',
    icon: 'BellRing',
    color: 'from-cyan-500 to-teal-500',
    defaultData: {
      label: 'Live Dashboard Alert',
      nodeCategory: 'action',
      actionType: 'alert',
      severity: 'warning',
      messageTemplate: 'Notice: {deviceId} {metric} alert condition triggered ({value}{unit})'
    }
  },
  {
    type: 'actionNode',
    category: NODE_CATEGORIES.ACTION,
    title: 'Actuator / Relay Trip',
    description: 'Sends safety shutdown control signal',
    icon: 'PowerOff',
    color: 'from-red-600 to-rose-700',
    defaultData: {
      label: 'Relay Safety Trip',
      nodeCategory: 'action',
      actionType: 'actuator',
      severity: 'critical',
      actuatorCommand: 'EMERGENCY_SHUTDOWN_VALVE_CLOSE',
      messageTemplate: 'ACTUATOR TRIP: Valve cutoff command triggered for {deviceId}'
    }
  }
];

export const PRESET_PIPELINES = [
  {
    id: 'preset-turbine-overheat',
    name: 'Turbine Overheat Detection',
    description: 'Smooths temperature with a 5-reading rolling average and triggers an instant SMS alert if temp exceeds 80°C.',
    nodes: [
      {
        id: 'node-source-1',
        type: 'sensorNode',
        position: { x: 50, y: 150 },
        data: {
          label: 'Turbine-01 Temp Sensor',
          nodeCategory: 'source',
          deviceId: 'turbine-01',
          metric: 'temperature',
          unit: '°C',
          nominal: 68
        }
      },
      {
        id: 'node-filter-1',
        type: 'filterNode',
        position: { x: 380, y: 150 },
        data: {
          label: 'Moving Average (Window: 5)',
          nodeCategory: 'filter',
          operatorType: 'moving_average',
          windowSize: 5
        }
      },
      {
        id: 'node-filter-2',
        type: 'filterNode',
        position: { x: 700, y: 150 },
        data: {
          label: 'Threshold Check (> 80°C)',
          nodeCategory: 'filter',
          operatorType: 'threshold',
          operator: '>',
          threshold: 80
        }
      },
      {
        id: 'node-action-1',
        type: 'actionNode',
        position: { x: 1020, y: 150 },
        data: {
          label: 'Critical SMS Alert',
          nodeCategory: 'action',
          actionType: 'sms',
          severity: 'critical',
          recipient: '+1 (555) 019-8234',
          messageTemplate: 'CRITICAL: {deviceId} overheat detected! Rolling average temperature reached {value}{unit}.'
        }
      }
    ],
    edges: [
      { id: 'edge-1-2', source: 'node-source-1', target: 'node-filter-1', animated: true },
      { id: 'edge-2-3', source: 'node-filter-1', target: 'node-filter-2', animated: true },
      { id: 'edge-3-4', source: 'node-filter-2', target: 'node-action-1', animated: true }
    ]
  },
  {
    id: 'preset-pressure-surge',
    name: 'Reactor Pressure Surge Protection',
    description: 'Monitors reactor core pressure rate of change. Triggers an automated safety webhook if pressure increases rapidly.',
    nodes: [
      {
        id: 'node-pres-1',
        type: 'sensorNode',
        position: { x: 50, y: 200 },
        data: {
          label: 'Reactor Core Pressure',
          nodeCategory: 'source',
          deviceId: 'reactor-alpha',
          metric: 'pressure',
          unit: 'bar',
          nominal: 12.5
        }
      },
      {
        id: 'node-pres-2',
        type: 'filterNode',
        position: { x: 380, y: 200 },
        data: {
          label: 'Rate of Change (Δ > 2.0 bar/s)',
          nodeCategory: 'filter',
          operatorType: 'rate_of_change',
          deltaThreshold: 2.0
        }
      },
      {
        id: 'node-pres-3',
        type: 'actionNode',
        position: { x: 740, y: 200 },
        data: {
          label: 'SCADA Webhook Alert',
          nodeCategory: 'action',
          actionType: 'webhook',
          severity: 'warning',
          webhookUrl: 'https://scada.internal/api/v2/pressure-surge',
          messageTemplate: 'WARNING: Reactor pressure rapid surge! ΔRate = {value} bar/s'
        }
      }
    ],
    edges: [
      { id: 'edge-p1-p2', source: 'node-pres-1', target: 'node-pres-2', animated: true },
      { id: 'edge-p2-p3', source: 'node-pres-2', target: 'node-pres-3', animated: true }
    ]
  },
  {
    id: 'preset-vibration-cutoff',
    name: 'Turbine Vibration Emergency Cutoff',
    description: 'Checks for bearing vibration > 4.0 mm/s with debounce gate and triggers emergency relay trip.',
    nodes: [
      {
        id: 'node-vib-1',
        type: 'sensorNode',
        position: { x: 50, y: 200 },
        data: {
          label: 'Turbine Vibration Sensor',
          nodeCategory: 'source',
          deviceId: 'turbine-01',
          metric: 'vibration',
          unit: 'mm/s',
          nominal: 1.8
        }
      },
      {
        id: 'node-vib-2',
        type: 'filterNode',
        position: { x: 380, y: 200 },
        data: {
          label: 'Threshold Gate (> 4.0 mm/s)',
          nodeCategory: 'filter',
          operatorType: 'threshold',
          operator: '>',
          threshold: 4.0
        }
      },
      {
        id: 'node-vib-3',
        type: 'filterNode',
        position: { x: 700, y: 200 },
        data: {
          label: 'Debounce Gate (5s)',
          nodeCategory: 'filter',
          operatorType: 'debounce',
          seconds: 5
        }
      },
      {
        id: 'node-vib-4',
        type: 'actionNode',
        position: { x: 1020, y: 200 },
        data: {
          label: 'Relay Safety Trip',
          nodeCategory: 'action',
          actionType: 'actuator',
          severity: 'critical',
          actuatorCommand: 'EMERGENCY_SHUTDOWN_VALVE_CLOSE',
          messageTemplate: 'ACTUATOR TRIP: Valve cutoff command triggered for {deviceId}'
        }
      }
    ],
    edges: [
      { id: 'edge-v1-v2', source: 'node-vib-1', target: 'node-vib-2', animated: true },
      { id: 'edge-v2-v3', source: 'node-vib-2', target: 'node-vib-3', animated: true },
      { id: 'edge-v3-v4', source: 'node-vib-3', target: 'node-vib-4', animated: true }
    ]
  }
];