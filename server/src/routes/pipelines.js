const express = require('express');
const router = express.Router();

const { Pipeline } = require('../models/Pipeline');
const PipelineManager = require('../engine/PipelineManager');

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function getNodeType(node) {
  return String(node?.type || '').toLowerCase();
}

function getNodeCategory(node) {
  return String(node?.data?.nodeCategory || '').toLowerCase();
}

function isSourceNode(node) {
  const type = getNodeType(node);
  const category = getNodeCategory(node);

  return (
    type.includes('sensor') ||
    type.includes('source') ||
    category === 'source'
  );
}

function isActionNode(node) {
  const type = getNodeType(node);
  const category = getNodeCategory(node);

  return (
    type.includes('action') ||
    type.includes('alert') ||
    type.includes('sms') ||
    type.includes('webhook') ||
    category === 'action'
  );
}

/**
 * Validate the complete pipeline graph.
 *
 * Checks:
 *  - nodes exist
 *  - every node has an ID
 *  - edge source/target nodes exist
 *  - no self-loops
 *  - no cycles
 *  - at least one source
 *  - at least one action
 *  - every action is reachable from a source
 */
function validatePipelineGraph(nodes = [], edges = []) {
  if (!Array.isArray(nodes)) {
    return {
      valid: false,
      error: 'Nodes must be an array.'
    };
  }

  if (!Array.isArray(edges)) {
    return {
      valid: false,
      error: 'Edges must be an array.'
    };
  }

  if (nodes.length === 0) {
    return {
      valid: false,
      error: 'Pipeline must contain at least one node.'
    };
  }

  const nodeIds = new Set();

  for (const node of nodes) {
    if (!node || !node.id) {
      return {
        valid: false,
        error: 'Every node must have a unique id.'
      };
    }

    if (nodeIds.has(node.id)) {
      return {
        valid: false,
        error: `Duplicate node id: ${node.id}`
      };
    }

    nodeIds.add(node.id);
  }

  const adjacency = new Map();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!edge?.source || !edge?.target) {
      return {
        valid: false,
        error: 'Every edge must have a source and target.'
      };
    }

    if (!nodeIds.has(edge.source)) {
      return {
        valid: false,
        error: `Edge references missing source node: ${edge.source}`
      };
    }

    if (!nodeIds.has(edge.target)) {
      return {
        valid: false,
        error: `Edge references missing target node: ${edge.target}`
      };
    }

    if (edge.source === edge.target) {
      return {
        valid: false,
        error: `Self-loop detected on node: ${edge.source}`
      };
    }

    adjacency.get(edge.source).push(edge.target);
  }

  const sourceNodes = nodes.filter(isSourceNode);
  const actionNodes = nodes.filter(isActionNode);

  if (sourceNodes.length === 0) {
    return {
      valid: false,
      error: 'Pipeline must have at least one Data Source node.'
    };
  }

  if (actionNodes.length === 0) {
    return {
      valid: false,
      error: 'Pipeline must have at least one Action/Trigger node.'
    };
  }

  // -------------------------------------------------------
  // Cycle detection using DFS
  // -------------------------------------------------------

  const visiting = new Set();
  const visited = new Set();

  function detectCycle(nodeId) {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    for (const nextNodeId of adjacency.get(nodeId) || []) {
      if (detectCycle(nextNodeId)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);

    return false;
  }

  for (const node of nodes) {
    if (detectCycle(node.id)) {
      return {
        valid: false,
        error: 'Pipeline contains a cycle. Cyclic pipelines are not supported.'
      };
    }
  }

  // -------------------------------------------------------
  // Check that every action is reachable from a source
  // -------------------------------------------------------

  const reachable = new Set();
  const queue = sourceNodes.map(node => node.id);

  while (queue.length > 0) {
    const current = queue.shift();

    if (reachable.has(current)) {
      continue;
    }

    reachable.add(current);

    for (const next of adjacency.get(current) || []) {
      if (!reachable.has(next)) {
        queue.push(next);
      }
    }
  }

  const unreachableActions = actionNodes.filter(
    node => !reachable.has(node.id)
  );

  if (unreachableActions.length > 0) {
    return {
      valid: false,
      error:
        `Action node(s) are not connected to a Data Source: ` +
        unreachableActions.map(node => node.id).join(', ')
    };
  }

  return {
    valid: true,
    sourceCount: sourceNodes.length,
    actionCount: actionNodes.length,
    nodeCount: nodes.length,
    edgeCount: edges.length
  };
}

// ---------------------------------------------------------
// List all pipelines
// ---------------------------------------------------------

router.get('/', async (req, res) => {
  try {
    const pipelines = await Pipeline.getAll();

    const activeIds = new Set(
      PipelineManager.getActiveList()
    );

    const result = pipelines.map(pipeline => ({
      ...pipeline,
      isEngineRunning: activeIds.has(
        pipeline.pipelineId || pipeline._id
      )
    }));

    res.json(result);
  } catch (err) {
    console.error('Failed to fetch pipelines:', err);

    res.status(500).json({
      error: 'Failed to fetch pipelines',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Get single pipeline
// ---------------------------------------------------------

router.get('/:id', async (req, res) => {
  try {
    const pipeline = await Pipeline.getById(
      req.params.id
    );

    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found'
      });
    }

    res.json(pipeline);
  } catch (err) {
    console.error('Failed to fetch pipeline:', err);

    res.status(500).json({
      error: 'Failed to fetch pipeline',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Create pipeline
// ---------------------------------------------------------

router.post('/', async (req, res) => {
  try {
    const {
      pipelineId,
      name,
      description,
      nodes,
      edges,
      isActive,
      tags
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        error: 'Pipeline name is required.'
      });
    }

    const validation = validatePipelineGraph(
      nodes || [],
      edges || []
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        validation
      });
    }

    const created = await Pipeline.create({
      pipelineId,
      name: String(name).trim(),
      description: description || '',
      nodes: nodes || [],
      edges: edges || [],
      isActive:
        isActive !== undefined
          ? Boolean(isActive)
          : true,
      tags: Array.isArray(tags) ? tags : []
    });

    if (created.isActive) {
      PipelineManager.deployPipeline(created);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create pipeline:', err);

    res.status(500).json({
      error: 'Failed to create pipeline',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Update pipeline
// ---------------------------------------------------------

router.put('/:id', async (req, res) => {
  try {
    const existing = await Pipeline.getById(
      req.params.id
    );

    if (!existing) {
      return res.status(404).json({
        error: 'Pipeline not found'
      });
    }

    const data = {
      ...req.body
    };

    // Never accidentally change the pipeline's identity.
    delete data._id;

    data.pipelineId =
      existing.pipelineId || req.params.id;

    if (data.nodes || data.edges) {
      const validation = validatePipelineGraph(
        data.nodes || existing.nodes || [],
        data.edges || existing.edges || []
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          validation
        });
      }
    }

    const updated = await Pipeline.update(
      req.params.id,
      data
    );

    if (!updated) {
      return res.status(404).json({
        error: 'Pipeline not found'
      });
    }

    // Hot reload the running engine.
    PipelineManager.stopPipeline(
      updated.pipelineId || req.params.id
    );

    if (updated.isActive) {
      PipelineManager.deployPipeline(updated);
    }

    res.json(updated);
  } catch (err) {
    console.error('Failed to update pipeline:', err);

    res.status(500).json({
      error: 'Failed to update pipeline',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Delete pipeline
// ---------------------------------------------------------

router.delete('/:id', async (req, res) => {
  try {
    const pipeline = await Pipeline.getById(
      req.params.id
    );

    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found'
      });
    }

    PipelineManager.stopPipeline(
      pipeline.pipelineId || req.params.id
    );

    const deleted = await Pipeline.delete(
      req.params.id
    );

    res.json({
      success: deleted
    });
  } catch (err) {
    console.error('Failed to delete pipeline:', err);

    res.status(500).json({
      error: 'Failed to delete pipeline',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Toggle active state
// ---------------------------------------------------------

router.post('/:id/toggle', async (req, res) => {
  try {
    const pipeline = await Pipeline.getById(
      req.params.id
    );

    if (!pipeline) {
      return res.status(404).json({
        error: 'Pipeline not found'
      });
    }

    const newActiveState = !pipeline.isActive;

    const updated = await Pipeline.update(
      req.params.id,
      {
        isActive: newActiveState
      }
    );

    const pipelineId =
      updated.pipelineId || req.params.id;

    if (newActiveState) {
      PipelineManager.deployPipeline(updated);
    } else {
      PipelineManager.stopPipeline(pipelineId);
    }

    res.json({
      success: true,
      isActive: newActiveState
    });
  } catch (err) {
    console.error('Failed to toggle pipeline:', err);

    res.status(500).json({
      error: 'Failed to toggle pipeline',
      details: err.message
    });
  }
});

// ---------------------------------------------------------
// Test / Validate pipeline
// ---------------------------------------------------------

router.post('/test-run', (req, res) => {
  try {
    const {
      nodes = [],
      edges = [],
      mockData
    } = req.body;

    const validation =
      validatePipelineGraph(
        nodes,
        edges
      );

    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    res.json({
      ...validation,
      valid: true,
      status:
        'Pipeline structure is valid and ready to compile.',
      mockDataProvided:
        mockData !== undefined
    });
  } catch (err) {
    console.error(
      'Pipeline validation failed:',
      err
    );

    res.status(400).json({
      valid: false,
      error: err.message
    });
  }
});

module.exports = router;