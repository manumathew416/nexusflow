const express = require('express');
const router = express.Router();
const TelemetryBus = require('../engine/TelemetryBus');
const { Telemetry } = require('../models/Telemetry');
const { Device } = require('../models/Device');
const { getDatabaseStatus } = require('../config/db');

// Ingest single telemetry point
router.post('/', async (req, res) => {
  try {
    const { deviceId, metric, value, unit, timestamp, location, deviceType, rawPayload } = req.body;

    if (!deviceId || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields: deviceId and value are mandatory.' });
    }

    const point = {
      deviceId,
      metric: metric || 'value',
      value: Number(value),
      unit: unit || '',
      location: location || 'Floor-1',
      deviceType: deviceType || 'sensor',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      rawPayload
    };

    // 1. Emit to reactive RxJS bus immediately (non-blocking)
    TelemetryBus.emit(point);

    // 2. Persist to MongoDB Time-Series collection
    const saved = await Telemetry.insert(point);

    // 3. Update device lastSeen asynchronously
    Device.upsert({
      deviceId,
      name: `Device ${deviceId}`,
      type: deviceType || 'sensor'
    }).catch(() => {});

    res.status(201).json({ success: true, telemetry: saved });
  } catch (err) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: 'Internal ingestion error', details: err.message });
  }
});

// Ingest batch
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Body must contain non-empty "items" array.' });
    }

    for (const item of items) {
      if (item.deviceId && item.value !== undefined) {
        TelemetryBus.emit(item);
      }
    }

    const savedBatch = await Telemetry.insertBatch(items);
    res.status(201).json({ success: true, count: savedBatch.length });
  } catch (err) {
    res.status(500).json({ error: 'Batch ingestion error', details: err.message });
  }
});

// Query historical telemetry
router.get('/history', async (req, res) => {
  try {
    const { deviceId, metric, limit, since } = req.query;
    const history = await Telemetry.queryHistory({ deviceId, metric, limit, since });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'History query failed', details: err.message });
  }
});

// Query latest telemetry for all devices
router.get('/latest', async (req, res) => {
  try {
    const latest = await Telemetry.getLatestByDevice();
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: 'Latest query failed', details: err.message });
  }
});

// Engine throughput stats
router.get('/stats', (req, res) => {
  const busStats = TelemetryBus.getStats();
  const dbStatus = getDatabaseStatus();
  res.json({
    throughput: busStats.currentRateMsgPerSec,
    activeSubscribers: busStats.activeSubscribers,
    database: dbStatus,
    serverTime: new Date()
  });
});

module.exports = router;