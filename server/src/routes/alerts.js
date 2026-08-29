const express = require('express');
const router = express.Router();
const { Alert } = require('../models/Alert');

// Query alerts
router.get('/', async (req, res) => {
  try {
    const { limit, status, severity, deviceId } = req.query;
    const alerts = await Alert.getAll({
      limit: parseInt(limit, 10) || 50,
      status,
      severity,
      deviceId
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

// Acknowledge alert
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const acked = await Alert.acknowledge(req.params.id);
    if (!acked) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ success: true, alert: acked });
  } catch (err) {
    res.status(500).json({ error: 'Acknowledge failed', details: err.message });
  }
});

// Clear all alerts
router.delete('/clear', async (req, res) => {
  try {
    await Alert.clearAll();
    res.json({ success: true, message: 'All alerts cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Clear alerts failed', details: err.message });
  }
});

// Alert statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Alert.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get alert stats', details: err.message });
  }
});

module.exports = router;