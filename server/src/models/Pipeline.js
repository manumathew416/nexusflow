const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { isUsingFallback, memoryStore } = require('../config/db');

const pipelineSchema = new mongoose.Schema({
  pipelineId: { type: String, default: uuidv4, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  nodes: { type: Array, default: [] },
  edges: { type: Array, default: [] },
  isActive: { type: Boolean, default: true },
  stats: {
    processedCount: { type: Number, default: 0 },
    alertCount: { type: Number, default: 0 },
    lastTriggered: { type: Date }
  },
  tags: [String]
}, { timestamps: true });

const MongoosePipeline = mongoose.model('Pipeline', pipelineSchema);

const Pipeline = {
  async getAll() {
    if (!isUsingFallback()) {
      try {
        return await MongoosePipeline.find().sort({ updatedAt: -1 }).lean();
      } catch (err) {
        console.warn('Mongo pipeline query failed, using memory store');
      }
    }
    return memoryStore.pipelines;
  },

  async getById(id) {
    if (!isUsingFallback()) {
      try {
        const found = await MongoosePipeline.findOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { pipelineId: id }] }).lean();
        if (found) return found;
      } catch (err) {
        console.warn('Mongo findById error, using memory store');
      }
    }
    return memoryStore.pipelines.find(p => p.pipelineId === id || p._id === id);
  },

  async create(data) {
    const pipelineObj = {
      pipelineId: data.pipelineId || uuidv4(),
      name: data.name || 'Untitled Pipeline',
      description: data.description || '',
      nodes: data.nodes || [],
      edges: data.edges || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      stats: { processedCount: 0, alertCount: 0, lastTriggered: null },
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!isUsingFallback()) {
      try {
        return await MongoosePipeline.create(pipelineObj);
      } catch (err) {
        console.warn('Mongo create pipeline failed:', err.message);
      }
    }

    pipelineObj._id = pipelineObj.pipelineId;
    memoryStore.pipelines.push(pipelineObj);
    return pipelineObj;
  },

  async update(id, data) {
    data.updatedAt = new Date();

    if (!isUsingFallback()) {
      try {
        const updated = await MongoosePipeline.findOneAndUpdate(
          { $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { pipelineId: id }] },
          { $set: data },
          { new: true }
        ).lean();
        if (updated) return updated;
      } catch (err) {
        console.warn('Mongo update pipeline failed:', err.message);
      }
    }

    const index = memoryStore.pipelines.findIndex(p => p.pipelineId === id || p._id === id);
    if (index !== -1) {
      memoryStore.pipelines[index] = { ...memoryStore.pipelines[index], ...data };
      return memoryStore.pipelines[index];
    }
    return null;
  },

  async delete(id) {
    if (!isUsingFallback()) {
      try {
        await MongoosePipeline.deleteOne({ $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { pipelineId: id }] });
      } catch (err) {
        console.warn('Mongo delete pipeline failed:', err.message);
      }
    }

    const index = memoryStore.pipelines.findIndex(p => p.pipelineId === id || p._id === id);
    if (index !== -1) {
      memoryStore.pipelines.splice(index, 1);
      return true;
    }
    return false;
  },

  async incrementStats(id, { processed = 0, alerts = 0 }) {
    const update = {
      $inc: {
        'stats.processedCount': processed,
        'stats.alertCount': alerts
      }
    };
    if (alerts > 0) {
      update.$set = { 'stats.lastTriggered': new Date() };
    }

    if (!isUsingFallback()) {
      try {
        await MongoosePipeline.updateOne(
          { $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { pipelineId: id }] },
          update
        );
      } catch (err) {}
    }

    const p = memoryStore.pipelines.find(p => p.pipelineId === id || p._id === id);
    if (p) {
      p.stats = p.stats || { processedCount: 0, alertCount: 0 };
      p.stats.processedCount += processed;
      p.stats.alertCount += alerts;
      if (alerts > 0) p.stats.lastTriggered = new Date();
    }
  }
};

module.exports = { Pipeline, MongoosePipeline };