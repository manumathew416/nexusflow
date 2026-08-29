const express = require('express');
const router = express.Router();
const simulator = require('../simulator/sensorSimulator');

router.get('/status', (req, res) => {
  res.json(simulator.getStatus());
});

router.post('/start', (req, res) => {
  const { frequencyMs } = req.body;
  simulator.start(frequencyMs || 1000);
  res.json({ success: true, message: 'Simulator started', status: simulator.getStatus() });
});

router.post('/stop', (req, res) => {
  simulator.stop();
  res.json({ success: true, message: 'Simulator stopped', status: simulator.getStatus() });
});

router.post('/frequency', (req, res) => {
  const { frequencyMs } = req.body;
  if (!frequencyMs) return res.status(400).json({ error: 'frequencyMs is required' });
  simulator.setFrequency(Number(frequencyMs));
  res.json({ success: true, frequencyMs: Number(frequencyMs) });
});

router.post('/anomaly', (req, res) => {
  const { deviceId, metric, magnitude, durationSec, type } = req.body;
  const result = simulator.injectAnomaly({
    deviceId: deviceId || 'turbine-01',
    metric: metric || 'temperature',
    magnitude: magnitude !== undefined ? Number(magnitude) : 30,
    durationSec: durationSec !== undefined ? Number(durationSec) : 8,
    type: type || 'spike'
  });
  res.json(result);
});

module.exports = router;