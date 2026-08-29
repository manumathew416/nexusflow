const express = require('express');
const router = express.Router();
const { Pipeline } = require('../models/Pipeline');
const PipelineManager = require('../engine/PipelineManager');
const { StreamCompiler } = require('../engine/StreamCompiler');

// List all pipelines
router.get('/', async (req, res) => {
  try {
    const pipelines = await Pipeline.getAll();
    const activeIds = new Set(PipelineManager.getActiveList());

    const result = pipelines.map(p => ({
      ...p,
      isEngineRunning: activeIds.has(p.pipelineId || p._id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipelines', details: err.message });
  }
});

// Get single pipeline
router.get('/:id', async (req, res) => {
  try {
    const pipeline = await Pipeline.getById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(pipeline);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pipeline', details: err.message });
  }
});

// Create pipeline
router.post('/', async (req, res) => {
  try {
    const { name, description, nodes, edges, isActive, tags } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Pipeline name is required.' });
    }

    const created = await Pipeline.create({
      name,
      description,
      nodes: nodes || [],
      edges: edges || [],
      isActive: isActive !== undefined ? isActive : true,
      tags: tags || []
    });

    if (created.isActive) {
      PipelineManager.deployPipeline(created);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pipeline', details: err.message });
  }
});

// Update pipeline (hot reload)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Pipeline.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    if (updated.isActive) {
      PipelineManager.deployPipeline(updated);
    } else {
      PipelineManager.stopPipeline(req.params.id);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pipeline', details: err.message });
  }
});

// Delete pipeline
router.delete('/:id', async (req, res) => {
  try {
    PipelineManager.stopPipeline(req.params.id);
    const deleted = await Pipeline.delete(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete pipeline', details: err.message });
  }
});

// Toggle active state
router.post('/:id/toggle', async (req, res) => {
  try {
    const pipeline = await Pipeline.getById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    const newActiveState = !pipeline.isActive;
    const updated = await Pipeline.update(req.params.id, { isActive: newActiveState });

    if (newActiveState) {
      PipelineManager.deployPipeline(updated);
    } else {
      PipelineManager.stopPipeline(req.params.id);
    }

    res.json({ success: true, isActive: newActiveState });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle pipeline', details: err.message });
  }
});

// Test candidate pipeline with mock data point
router.post('/test-run', (req, res) => {
  try {
    const { nodes, edges, mockData } = req.body;
    // Basic topological validation
    const sourceCount = (nodes || []).filter(n => (n.type || '').includes('sensor') || (n.data && n.data.nodeCategory === 'source')).length;
    const actionCount = (nodes || []).filter(n => (n.type || '').includes('action') || (n.data && n.data.nodeCategory === 'action')).length;

    if (sourceCount === 0) {
      return res.status(400).json({ valid: false, error: 'Pipeline must have at least one Data Source node.' });
    }
    if (actionCount === 0) {
      return res.status(400).json({ valid: false, error: 'Pipeline must have at least one Action/Trigger node.' });
    }

    res.json({
      valid: true,
      sourceCount,
      actionCount,
      nodeCount: (nodes || []).length,
      edgeCount: (edges || []).length,
      status: 'Pipeline structure valid and ready to compile.'
    });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

module.exports = router;