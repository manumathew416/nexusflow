const { Subject } = require('rxjs');
const { filter } = require('rxjs/operators');

class TelemetryBus {
  constructor() {
    this.bus$ = new Subject();
    this.messageCount = 0;
    this.currentRate = 0;
    this.lastCountCheck = Date.now();

    // Calculate throughput rate (msg/sec) every second
    const rateInterval = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - this.lastCountCheck) / 1000;
      if (deltaSec > 0) {
        this.currentRate = Math.round((this.messageCount / deltaSec) * 10) / 10;
        this.messageCount = 0;
        this.lastCountCheck = now;
      }
    }, 1000);
    if (rateInterval.unref) rateInterval.unref();
  }

  emit(telemetryPoint) {
    this.messageCount++;
    const payload = {
      ...telemetryPoint,
      timestamp: telemetryPoint.timestamp ? new Date(telemetryPoint.timestamp) : new Date(),
      emittedAt: Date.now()
    };
    this.bus$.next(payload);
    return payload;
  }

  getStream() {
    return this.bus$.asObservable();
  }

  getDeviceStream(deviceId) {
    return this.bus$.pipe(
      filter(data => {
        const dId = data.deviceId || (data.metadata && data.metadata.deviceId);
        return !deviceId || dId === deviceId || deviceId === '*' || deviceId === 'all';
      })
    );
  }

  getMetricStream(deviceId, metric) {
    return this.getDeviceStream(deviceId).pipe(
      filter(data => {
        const m = data.metric || (data.metadata && data.metadata.metric);
        return !metric || m === metric || metric === '*' || metric === 'all';
      })
    );
  }

  getStats() {
    return {
      currentRateMsgPerSec: this.currentRate,
      activeSubscribers: this.bus$.observers ? this.bus$.observers.length : 0
    };
  }
}

const instance = new TelemetryBus();
module.exports = instance;