const express = require('express');
const router = express.Router();
const { Device } = require('../models/Device');

router.get('/', async (req, res) => {
  try {
    const devices = await Device.getAll();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await Device.getById(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device', details: err.message });
  }
});

module.exports = router;