const mongoose = require('mongoose');
const { isUsingFallback, memoryStore } = require('../config/db');

const telemetrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    deviceId: { type: String, required: true, index: true },
    metric: { type: String, required: true, index: true },
    unit: { type: String, default: '' },
    location: { type: String, default: 'Floor-1' },
    deviceType: { type: String, default: 'sensor' }
  },
  value: {
    type: Number,
    required: true
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  },
  expireAfterSeconds: 86400 * 7 // Retain for 7 days
});

// Compound indices for fast range & device queries
telemetrySchema.index({ 'metadata.deviceId': 1, 'metadata.metric': 1, timestamp: -1 });

const MongooseTelemetry = mongoose.model('Telemetry', telemetrySchema, 'telemetries');

// Unified DAO supporting both MongoDB and In-Memory Time-Series ring buffer
const Telemetry = {
  async insert(data) {
    const record = {
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      metadata: {
        deviceId: data.deviceId || (data.metadata && data.metadata.deviceId) || 'unknown',
        metric: data.metric || (data.metadata && data.metadata.metric) || 'value',
        unit: data.unit || (data.metadata && data.metadata.unit) || '',
        location: data.location || (data.metadata && data.metadata.location) || 'Floor-1',
        deviceType: data.deviceType || (data.metadata && data.metadata.deviceType) || 'sensor'
      },
      value: Number(data.value),
      rawPayload: data.rawPayload || {}
    };

    if (!isUsingFallback()) {
      try {
        return await MongooseTelemetry.create(record);
      } catch (err) {
        // If native Mongo write fails, store in memory
        console.warn('Mongo insert failed, storing in buffer:', err.message);
      }
    }

    // Circular buffer: keep latest 5000 records in memory
    memoryStore.telemetries.push(record);
    if (memoryStore.telemetries.length > 5000) {
      memoryStore.telemetries.shift();
    }
    return record;
  },

  async insertBatch(batch) {
    if (!Array.isArray(batch)) return [];
    const results = [];
    for (const item of batch) {
      const res = await this.insert(item);
      results.push(res);
    }
    return results;
  },

  async queryHistory({ deviceId, metric, limit = 100, since }) {
    const queryLimit = Math.min(parseInt(limit, 10) || 100, 1000);
    const filter = {};

    if (deviceId) filter['metadata.deviceId'] = deviceId;
    if (metric) filter['metadata.metric'] = metric;
    if (since) filter.timestamp = { $gte: new Date(since) };

    if (!isUsingFallback()) {
      try {
        return await MongooseTelemetry.find(filter)
          .sort({ timestamp: -1 })
          .limit(queryLimit)
          .lean();
      } catch (err) {
        console.warn('Mongo query failed, using memory:', err.message);
      }
    }

    // Memory query
    let filtered = memoryStore.telemetries.filter(item => {
      if (deviceId && item.metadata.deviceId !== deviceId) return false;
      if (metric && item.metadata.metric !== metric) return false;
      if (since && item.timestamp < new Date(since)) return false;
      return true;
    });

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    return filtered.slice(0, queryLimit);
  },

  async getLatestByDevice() {
    if (!isUsingFallback()) {
      try {
        const latest = await MongooseTelemetry.aggregate([
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: { deviceId: '$metadata.deviceId', metric: '$metadata.metric' },
              latestValue: { $first: '$value' },
              unit: { $first: '$metadata.unit' },
              timestamp: { $first: '$timestamp' },
              metadata: { $first: '$metadata' }
            }
          }
        ]);
        return latest;
      } catch (err) {
        console.warn('Mongo aggregation failed, using memory fallback');
      }
    }

    const deviceMap = new Map();
    for (let i = memoryStore.telemetries.length - 1; i >= 0; i--) {
      const item = memoryStore.telemetries[i];
      const key = `${item.metadata.deviceId}_${item.metadata.metric}`;
      if (!deviceMap.has(key)) {
        deviceMap.set(key, {
          _id: { deviceId: item.metadata.deviceId, metric: item.metadata.metric },
          latestValue: item.value,
          unit: item.metadata.unit,
          timestamp: item.timestamp,
          metadata: item.metadata
        });
      }
    }
    return Array.from(deviceMap.values());
  }
};

module.exports = { Telemetry, MongooseTelemetry };