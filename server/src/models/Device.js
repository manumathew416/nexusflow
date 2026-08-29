const mongoose = require('mongoose');
const { isUsingFallback, memoryStore } = require('../config/db');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, default: 'sensor' },
  metrics: [{
    name: String,
    unit: String,
    min: Number,
    max: Number,
    nominal: Number
  }],
  status: { type: String, enum: ['online', 'offline', 'warning', 'error'], default: 'online' },
  location: { type: String, default: 'Facility Unit A' },
  lastSeen: { type: Date, default: Date.now },
  config: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const MongooseDevice = mongoose.model('Device', deviceSchema);

const Device = {
  async getAll() {
    if (!isUsingFallback()) {
      try {
        return await MongooseDevice.find().lean();
      } catch (err) {}
    }
    return memoryStore.devices;
  },

  async upsert(deviceData) {
    const data = {
      ...deviceData,
      lastSeen: new Date()
    };

    if (!isUsingFallback()) {
      try {
        return await MongooseDevice.findOneAndUpdate(
          { deviceId: data.deviceId },
          { $set: data },
          { upsert: true, new: true }
        ).lean();
      } catch (err) {}
    }

    const idx = memoryStore.devices.findIndex(d => d.deviceId === data.deviceId);
    if (idx >= 0) {
      memoryStore.devices[idx] = { ...memoryStore.devices[idx], ...data };
      return memoryStore.devices[idx];
    } else {
      memoryStore.devices.push(data);
      return data;
    }
  },

  async getById(deviceId) {
    if (!isUsingFallback()) {
      try {
        return await MongooseDevice.findOne({ deviceId }).lean();
      } catch (err) {}
    }
    return memoryStore.devices.find(d => d.deviceId === deviceId);
  }
};

module.exports = { Device, MongooseDevice };