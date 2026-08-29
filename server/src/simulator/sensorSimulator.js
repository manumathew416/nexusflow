const TelemetryBus = require('../engine/TelemetryBus');
const { Telemetry } = require('../models/Telemetry');
const { Device } = require('../models/Device');

class SensorSimulator {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.frequencyMs = 1000; // 1 second
    this.step = 0;
    this.anomalies = new Map(); // key -> { magnitude, durationSec, remainingSec, type }
    this.wsBroadcaster = null;

    // Device Definitions
    this.devices = [
      {
        deviceId: 'turbine-01',
        name: 'Main Gas Turbine 01',
        type: 'turbine',
        location: 'Turbine Hall Bay 3',
        sensors: [
          { metric: 'temperature', unit: '°C', base: 68, amplitude: 4, noise: 1.5, min: 40, max: 120 },
          { metric: 'vibration', unit: 'mm/s', base: 1.8, amplitude: 0.3, noise: 0.2, min: 0, max: 10 },
          { metric: 'rpm', unit: 'RPM', base: 3600, amplitude: 50, noise: 15, min: 2000, max: 4500 }
        ]
      },
      {
        deviceId: 'reactor-alpha',
        name: 'Catalytic Reactor Alpha',
        type: 'reactor',
        location: 'Chemical Synthesis Wing',
        sensors: [
          { metric: 'pressure', unit: 'bar', base: 12.5, amplitude: 0.8, noise: 0.3, min: 5, max: 25 },
          { metric: 'temperature', unit: '°C', base: 310, amplitude: 8, noise: 3, min: 200, max: 450 }
        ]
      },
      {
        deviceId: 'chiller-unit-3',
        name: 'Cryogenic Chiller 03',
        type: 'chiller',
        location: 'Refrigeration Facility',
        sensors: [
          { metric: 'temperature', unit: '°C', base: 4.2, amplitude: 0.6, noise: 0.2, min: -20, max: 20 },
          { metric: 'humidity', unit: '%', base: 45, amplitude: 3, noise: 1.5, min: 10, max: 95 }
        ]
      },
      {
        deviceId: 'power-grid-4',
        name: 'HV Substation Transformer',
        type: 'power_meter',
        location: 'Substation Yard',
        sensors: [
          { metric: 'voltage', unit: 'V', base: 480, amplitude: 4, noise: 2, min: 380, max: 550 },
          { metric: 'current', unit: 'A', base: 125, amplitude: 10, noise: 3, min: 50, max: 250 }
        ]
      }
    ];
  }

  setBroadcaster(broadcaster) {
    this.wsBroadcaster = broadcaster;
  }

  async initDevicesInDb() {
    for (const dev of this.devices) {
      await Device.upsert({
        deviceId: dev.deviceId,
        name: dev.name,
        type: dev.type,
        location: dev.location,
        status: 'online',
        metrics: dev.sensors.map(s => ({
          name: s.metric,
          unit: s.unit,
          nominal: s.base,
          min: s.min,
          max: s.max
        }))
      });
    }
  }

  start(freqMs = 1000) {
    if (this.isRunning) return;
    this.frequencyMs = freqMs;
    this.isRunning = true;
    this.initDevicesInDb().catch(() => {});

    console.log(`[SensorSimulator] Simulator started. Emitting telemetry across ${this.devices.length} devices every ${this.frequencyMs}ms.`);

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.frequencyMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SensorSimulator] Simulator stopped.');
  }

  setFrequency(ms) {
    const newFreq = Math.max(200, Math.min(ms, 10000));
    if (this.isRunning) {
      this.stop();
      this.start(newFreq);
    } else {
      this.frequencyMs = newFreq;
    }
  }

  injectAnomaly({ deviceId = 'turbine-01', metric = 'temperature', magnitude = 25, durationSec = 8, type = 'spike' }) {
    const key = `${deviceId}_${metric}`;
    this.anomalies.set(key, {
      magnitude: Number(magnitude),
      durationSec: Number(durationSec),
      remainingTicks: Math.ceil((durationSec * 1000) / this.frequencyMs),
      type,
      startedAt: new Date()
    });

    console.log(`[SensorSimulator] \u26A0\uFE0F Injected Anomaly on [${key}]: +${magnitude} (${type}) for ${durationSec}s`);
    return { success: true, key, magnitude, durationSec };
  }

  tick() {
    this.step++;
    const now = new Date();

    for (const dev of this.devices) {
      for (const sensor of dev.sensors) {
        // Base sine wave modulation
        const sineComponent = Math.sin((this.step * 0.1) + (sensor.base * 0.05)) * sensor.amplitude;
        const noiseComponent = (Math.random() - 0.5) * 2 * sensor.noise;
        let calculatedValue = sensor.base + sineComponent + noiseComponent;

        // Check if anomaly active
        const anomalyKey = `${dev.deviceId}_${sensor.metric}`;
        if (this.anomalies.has(anomalyKey)) {
          const anom = this.anomalies.get(anomalyKey);
          calculatedValue += anom.magnitude;
          anom.remainingTicks--;
          if (anom.remainingTicks <= 0) {
            this.anomalies.delete(anomalyKey);
            console.log(`[SensorSimulator] Anomaly expired for [${anomalyKey}]`);
          }
        }

        // Clamp to min/max
        calculatedValue = Math.round(calculatedValue * 100) / 100;

        const telemetryPoint = {
          deviceId: dev.deviceId,
          metric: sensor.metric,
          value: calculatedValue,
          unit: sensor.unit,
          location: dev.location,
          deviceType: dev.type,
          timestamp: now
        };

        // 1. Emit to RxJS Stream Engine Bus
        TelemetryBus.emit(telemetryPoint);

        // 2. Insert into MongoDB Time-Series collection (async non-blocking)
        Telemetry.insert(telemetryPoint).catch(() => {});

        // 3. Broadcast to WebSockets for live UI charts
        if (this.wsBroadcaster) {
          this.wsBroadcaster({
            type: 'telemetry:point',
            telemetry: telemetryPoint
          });
        }
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      frequencyMs: this.frequencyMs,
      activeDevices: this.devices.map(d => ({
        deviceId: d.deviceId,
        name: d.name,
        type: d.type,
        sensors: d.sensors.map(s => s.metric)
      })),
      activeAnomalies: Array.from(this.anomalies.entries()).map(([k, v]) => ({
        target: k,
        magnitude: v.magnitude,
        remainingTicks: v.remainingTicks
      }))
    };
  }
}

const simulatorInstance = new SensorSimulator();
module.exports = simulatorInstance;