const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { isUsingFallback, memoryStore } = require('../config/db');

const alertSchema = new mongoose.Schema({
  alertId: { type: String, default: uuidv4, unique: true, index: true },
  pipelineId: { type: String, index: true },
  pipelineName: { type: String, default: 'Rule Engine Alert' },
  deviceId: { type: String, required: true, index: true },
  metric: { type: String, required: true },
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    default: 'warning',
    index: true
  },
  message: { type: String, required: true },
  value: { type: Number, required: true },
  threshold: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
    index: true
  },
  actionType: { type: String, default: 'alert' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const MongooseAlert = mongoose.model('Alert', alertSchema);

const Alert = {
  async create(data) {
    const alertObj = {
      alertId: data.alertId || uuidv4(),
      pipelineId: data.pipelineId || 'manual',
      pipelineName: data.pipelineName || 'NexusFlow Alert',
      deviceId: data.deviceId || 'unknown',
      metric: data.metric || 'sensor',
      severity: data.severity || 'warning',
      message: data.message || `Anomaly detected for ${data.deviceId}`,
      value: Number(data.value) || 0,
      threshold: data.threshold !== undefined ? data.threshold : null,
      status: data.status || 'active',
      actionType: data.actionType || 'dashboard',
      metadata: data.metadata || {},
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
    };

    if (!isUsingFallback()) {
      try {
        return await MongooseAlert.create(alertObj);
      } catch (err) {
        console.warn('Mongo create alert failed, using memory store');
      }
    }

    alertObj._id = alertObj.alertId;
    memoryStore.alerts.unshift(alertObj);
    if (memoryStore.alerts.length > 2000) {
      memoryStore.alerts.pop();
    }
    return alertObj;
  },

  async getAll({ limit = 50, status, severity, deviceId } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;

    if (!isUsingFallback()) {
      try {
        return await MongooseAlert.find(filter)
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();
      } catch (err) {
        console.warn('Mongo alert query failed, using memory store');
      }
    }

    return memoryStore.alerts
      .filter(a => {
        if (status && a.status !== status) return false;
        if (severity && a.severity !== severity) return false;
        if (deviceId && a.deviceId !== deviceId) return false;
        return true;
      })
      .slice(0, limit);
  },

  async acknowledge(id) {
    if (!isUsingFallback()) {
      try {
        return await MongooseAlert.findOneAndUpdate(
          { $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { alertId: id }] },
          { $set: { status: 'acknowledged' } },
          { new: true }
        ).lean();
      } catch (err) {
        console.warn('Mongo acknowledge failed');
      }
    }

    const alert = memoryStore.alerts.find(a => a.alertId === id || a._id === id);
    if (alert) {
      alert.status = 'acknowledged';
      return alert;
    }
    return null;
  },

  async clearAll() {
    if (!isUsingFallback()) {
      try {
        await MongooseAlert.deleteMany({});
      } catch (err) {}
    }
    memoryStore.alerts = [];
    return { success: true };
  },

  async getStats() {
    const alerts = await this.getAll({ limit: 1000 });
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length
    };
  }
};

module.exports = { Alert, MongooseAlert };