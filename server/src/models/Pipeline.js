const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const {
  isUsingFallback,
  memoryStore
} = require('../config/db');

const pipelineSchema = new mongoose.Schema(
  {
    pipelineId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    nodes: {
      type: Array,
      default: () => []
    },

    edges: {
      type: Array,
      default: () => []
    },

    isActive: {
      type: Boolean,
      default: true
    },

    stats: {
      processedCount: {
        type: Number,
        default: 0
      },

      alertCount: {
        type: Number,
        default: 0
      },

      lastTriggered: {
        type: Date,
        default: null
      }
    },

    tags: {
      type: [String],
      default: () => []
    }
  },
  {
    timestamps: true
  }
);

const MongoosePipeline =
  mongoose.models.Pipeline ||
  mongoose.model(
    'Pipeline',
    pipelineSchema
  );

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function normalizePipeline(pipeline) {
  if (!pipeline) {
    return null;
  }

  const result =
    typeof pipeline.toObject === 'function'
      ? pipeline.toObject()
      : { ...pipeline };

  result.nodes = Array.isArray(result.nodes)
    ? result.nodes
    : [];

  result.edges = Array.isArray(result.edges)
    ? result.edges
    : [];

  result.tags = Array.isArray(result.tags)
    ? result.tags
    : [];

  result.stats = {
    processedCount:
      Number(result.stats?.processedCount) || 0,

    alertCount:
      Number(result.stats?.alertCount) || 0,

    lastTriggered:
      result.stats?.lastTriggered || null
  };

  return result;
}

function matchesPipelineId(pipeline, id) {
  if (!pipeline || !id) {
    return false;
  }

  return (
    String(pipeline.pipelineId) === String(id) ||
    String(pipeline._id) === String(id)
  );
}

function mongoIdFilter(id) {
  const conditions = [
    {
      pipelineId: String(id)
    }
  ];

  if (mongoose.isValidObjectId(id)) {
    conditions.push({
      _id: id
    });
  }

  return {
    $or: conditions
  };
}

// ---------------------------------------------------------
// Pipeline API
// ---------------------------------------------------------

const Pipeline = {

  // -------------------------------------------------------
  // Get all pipelines
  // -------------------------------------------------------

  async getAll() {
    if (!isUsingFallback()) {
      try {
        const pipelines =
          await MongoosePipeline
            .find({})
            .sort({ updatedAt: -1 })
            .lean();

        return pipelines.map(
          normalizePipeline
        );
      } catch (err) {
        console.warn(
          'Mongo pipeline query failed, using memory store:',
          err.message
        );
      }
    }

    return memoryStore.pipelines
      .map(normalizePipeline)
      .sort((a, b) => {
        const aTime =
          new Date(a.updatedAt || 0).getTime();

        const bTime =
          new Date(b.updatedAt || 0).getTime();

        return bTime - aTime;
      });
  },

  // -------------------------------------------------------
  // Get pipeline by Mongo _id OR pipelineId
  // -------------------------------------------------------

  async getById(id) {
    if (!id) {
      return null;
    }

    if (!isUsingFallback()) {
      try {
        const found =
          await MongoosePipeline
            .findOne(
              mongoIdFilter(id)
            )
            .lean();

        if (found) {
          return normalizePipeline(found);
        }
      } catch (err) {
        console.warn(
          'Mongo pipeline lookup failed, using memory store:',
          err.message
        );
      }
    }

    const found =
      memoryStore.pipelines.find(
        pipeline =>
          matchesPipelineId(pipeline, id)
      );

    return normalizePipeline(found);
  },

  // -------------------------------------------------------
  // Create pipeline
  // -------------------------------------------------------

  async create(data = {}) {
    const pipelineId =
      data.pipelineId ||
      uuidv4();

    const pipelineObj = {
      pipelineId,

      name:
        String(
          data.name ||
          'Untitled Pipeline'
        ).trim(),

      description:
        data.description || '',

      nodes:
        Array.isArray(data.nodes)
          ? data.nodes
          : [],

      edges:
        Array.isArray(data.edges)
          ? data.edges
          : [],

      isActive:
        data.isActive !== undefined
          ? Boolean(data.isActive)
          : true,

      stats: {
        processedCount: 0,
        alertCount: 0,
        lastTriggered: null
      },

      tags:
        Array.isArray(data.tags)
          ? data.tags
          : [],

      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!isUsingFallback()) {
      try {
        const created =
          await MongoosePipeline.create(
            pipelineObj
          );

        return normalizePipeline(created);
      } catch (err) {
        /*
         * IMPORTANT:
         * Do not silently create a duplicate pipeline
         * when MongoDB rejects creation because the
         * pipelineId already exists.
         */
        if (
          err.code === 11000
        ) {
          throw new Error(
            `A pipeline with ID "${pipelineId}" already exists.`
          );
        }

        console.warn(
          'Mongo create pipeline failed, using memory store:',
          err.message
        );
      }
    }

    // Prevent duplicate IDs in fallback storage.
    const duplicate =
      memoryStore.pipelines.find(
        pipeline =>
          String(pipeline.pipelineId) ===
          String(pipelineId)
      );

    if (duplicate) {
      throw new Error(
        `A pipeline with ID "${pipelineId}" already exists.`
      );
    }

    pipelineObj._id =
      pipelineObj.pipelineId;

    memoryStore.pipelines.push(
      pipelineObj
    );

    return normalizePipeline(
      pipelineObj
    );
  },

  // -------------------------------------------------------
  // Update pipeline
  // -------------------------------------------------------

  async update(id, data = {}) {
    if (!id) {
      return null;
    }

    /*
     * Never allow update data to replace:
     * - Mongo _id
     * - pipelineId
     *
     * The route already protects these, but keeping the
     * protection here prevents accidental corruption from
     * other callers.
     */
    const updateData = {
      ...data
    };

    delete updateData._id;
    delete updateData.createdAt;

    if (
      updateData.pipelineId &&
      String(updateData.pipelineId) !== String(id)
    ) {
      delete updateData.pipelineId;
    }

    updateData.updatedAt =
      new Date();

    // Normalize arrays
    if (
      updateData.nodes !== undefined &&
      !Array.isArray(updateData.nodes)
    ) {
      updateData.nodes = [];
    }

    if (
      updateData.edges !== undefined &&
      !Array.isArray(updateData.edges)
    ) {
      updateData.edges = [];
    }

    if (
      updateData.tags !== undefined &&
      !Array.isArray(updateData.tags)
    ) {
      updateData.tags = [];
    }

    if (
      updateData.isActive !== undefined
    ) {
      updateData.isActive =
        Boolean(updateData.isActive);
    }

    if (!isUsingFallback()) {
      try {
        const updated =
          await MongoosePipeline
            .findOneAndUpdate(
              mongoIdFilter(id),
              {
                $set: updateData
              },
              {
                new: true,
                runValidators: true
              }
            )
            .lean();

        if (updated) {
          return normalizePipeline(
            updated
          );
        }
      } catch (err) {
        console.warn(
          'Mongo update pipeline failed, using memory store:',
          err.message
        );
      }
    }

    const index =
      memoryStore.pipelines.findIndex(
        pipeline =>
          matchesPipelineId(
            pipeline,
            id
          )
      );

    if (index === -1) {
      return null;
    }

    memoryStore.pipelines[index] = {
      ...memoryStore.pipelines[index],
      ...updateData,

      pipelineId:
        memoryStore.pipelines[index]
          .pipelineId,

      _id:
        memoryStore.pipelines[index]
          ._id
    };

    return normalizePipeline(
      memoryStore.pipelines[index]
    );
  },

  // -------------------------------------------------------
  // Delete pipeline
  // -------------------------------------------------------

  async delete(id) {
    if (!id) {
      return false;
    }

    let deletedFromMongo = false;

    if (!isUsingFallback()) {
      try {
        const result =
          await MongoosePipeline.deleteOne(
            mongoIdFilter(id)
          );

        deletedFromMongo =
          result.deletedCount > 0;
      } catch (err) {
        console.warn(
          'Mongo delete pipeline failed:',
          err.message
        );
      }
    }

    const index =
      memoryStore.pipelines.findIndex(
        pipeline =>
          matchesPipelineId(
            pipeline,
            id
          )
      );

    if (index !== -1) {
      memoryStore.pipelines.splice(
        index,
        1
      );

      return true;
    }

    return deletedFromMongo;
  },

  // -------------------------------------------------------
  // Increment statistics
  // -------------------------------------------------------

  async incrementStats(
    id,
    {
      processed = 0,
      alerts = 0
    } = {}
  ) {
    const processedCount =
      Number(processed) || 0;

    const alertCount =
      Number(alerts) || 0;

    if (
      processedCount === 0 &&
      alertCount === 0
    ) {
      return;
    }

    const update = {
      $inc: {
        'stats.processedCount':
          processedCount,

        'stats.alertCount':
          alertCount
      }
    };

    if (alertCount > 0) {
      update.$set = {
        'stats.lastTriggered':
          new Date()
      };
    }

    if (!isUsingFallback()) {
      try {
        await MongoosePipeline.updateOne(
          mongoIdFilter(id),
          update
        );
      } catch (err) {
        console.warn(
          'Mongo incrementStats failed:',
          err.message
        );
      }
    }

    // Keep fallback memory store synchronized.
    const pipeline =
      memoryStore.pipelines.find(
        p =>
          matchesPipelineId(
            p,
            id
          )
      );

    if (pipeline) {
      pipeline.stats =
        pipeline.stats || {};

      pipeline.stats.processedCount =
        Number(
          pipeline.stats.processedCount
        ) + processedCount;

      pipeline.stats.alertCount =
        Number(
          pipeline.stats.alertCount
        ) + alertCount;

      if (alertCount > 0) {
        pipeline.stats.lastTriggered =
          new Date();
      }

      pipeline.updatedAt =
        new Date();
    }
  }
};

module.exports = {
  Pipeline,
  MongoosePipeline
};