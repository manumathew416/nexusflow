const { Subscription } = require('rxjs');
const { tap } = require('rxjs/operators');
const TelemetryBus = require('./TelemetryBus');
const { createThresholdOperator } = require('./operators/thresholdOperator');
const { createMovingAverageOperator } = require('./operators/movingAverageOperator');
const { createRateOfChangeOperator } = require('./operators/rateOfChangeOperator');
const { createRangeGateOperator } = require('./operators/rangeGateOperator');
const { createMathTransformOperator } = require('./operators/mathTransformOperator');
const { createDebounceOperator } = require('./operators/debounceOperator');
const { dispatchAction } = require('./actions/actionDispatcher');
const { Pipeline } = require('../models/Pipeline');

let wsBroadcaster = null;

function setCompilerWebSocketBroadcaster(broadcaster) {
  wsBroadcaster = broadcaster;
}

class StreamCompiler {
  static compile(pipeline) {
    const rootSubscription = new Subscription();
    const { nodes = [], edges = [] } = pipeline;
    const pipelineId = pipeline.pipelineId || pipeline._id;

    if (!nodes || nodes.length === 0) {
      console.log(`[StreamCompiler] Pipeline ${pipelineId} has no nodes to compile.`);
      return rootSubscription;
    }

    // Build node lookup map & adjacency list
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const outgoingEdges = new Map();
    edges.forEach(e => {
      if (!outgoingEdges.has(e.source)) {
        outgoingEdges.set(e.source, []);
      }
      outgoingEdges.get(e.source).push(e);
    });

    // Find all Data Source nodes
    const sourceNodes = nodes.filter(n => {
      const type = (n.type || '').toLowerCase();
      const cat = (n.data && n.data.nodeCategory || '').toLowerCase();
      return type.includes('sensor') || type.includes('source') || cat === 'source';
    });

    if (sourceNodes.length === 0) {
      console.warn(`[StreamCompiler] Pipeline "${pipeline.name}" (${pipelineId}) has no Data Source nodes.`);
      return rootSubscription;
    }

    console.log(`[StreamCompiler] Compiling pipeline "${pipeline.name}" (${pipelineId}) with ${sourceNodes.length} source(s) and ${nodes.length} total nodes...`);

    // Compile from each data source node
    for (const sourceNode of sourceNodes) {
      const deviceId = (sourceNode.data && sourceNode.data.deviceId) || '*';
      const metric = (sourceNode.data && sourceNode.data.metric) || '*';

      // 1. Ingestion source stream
      let currentStream$ = TelemetryBus.getMetricStream(deviceId, metric).pipe(
        tap(data => {
          // Increment pipeline processed count
          Pipeline.incrementStats(pipelineId, { processed: 1 });

          // Send pulse event for source node
          if (wsBroadcaster) {
            wsBroadcaster({
              type: 'pipeline:node_pulse',
              pipelineId,
              nodeId: sourceNode.id,
              status: 'passed',
              data: {
                value: data.value,
                metric: data.metric || metric,
                deviceId: data.deviceId || deviceId,
                timestamp: data.timestamp
              }
            });
          }
        })
      );

      // 2. Traverse downstream nodes recursively or sequentially
      this.compileDownstream(
        pipeline,
        sourceNode.id,
        currentStream$,
        nodeMap,
        outgoingEdges,
        rootSubscription,
        new Set([sourceNode.id])
      );
    }

    return rootSubscription;
  }

  static compileDownstream(pipeline, currentNodeId, inputStream$, nodeMap, outgoingEdges, rootSubscription, visitedNodes) {
    const edgesFromCurrent = outgoingEdges.get(currentNodeId) || [];
    const pipelineId = pipeline.pipelineId || pipeline._id;

    for (const edge of edgesFromCurrent) {
      const targetNode = nodeMap.get(edge.target);
      if (!targetNode) continue;

      // Prevent infinite recursion in cyclical graphs
      if (visitedNodes.has(targetNode.id)) {
        console.warn(`[StreamCompiler] Cyclical edge detected between ${currentNodeId} and ${targetNode.id}. Halting branch.`);
        continue;
      }
      const branchVisited = new Set(visitedNodes).add(targetNode.id);

      // Emit edge animation pulse
      const streamWithEdgePulse$ = inputStream$.pipe(
        tap(() => {
          if (wsBroadcaster) {
            wsBroadcaster({
              type: 'pipeline:edge_pulse',
              pipelineId,
              edgeId: edge.id,
              source: edge.source,
              target: edge.target,
              timestamp: new Date()
            });
          }
        })
      );

      // Apply operator based on node type
      const nodeType = (targetNode.type || '').toLowerCase();
      const nodeCategory = (targetNode.data && targetNode.data.nodeCategory || '').toLowerCase();
      const nodeData = targetNode.data || {};

      let transformedStream$ = streamWithEdgePulse$;

      if (nodeType.includes('threshold') || nodeType.includes('filter') || nodeCategory === 'filter') {
        transformedStream$ = transformedStream$.pipe(
          createThresholdOperator(nodeData)
        );
      } else if (nodeType.includes('movingaverage') || nodeType.includes('average') || (nodeData.operatorType === 'moving_average')) {
        transformedStream$ = transformedStream$.pipe(
          createMovingAverageOperator(nodeData)
        );
      } else if (nodeType.includes('rateofchange') || nodeType.includes('rate') || (nodeData.operatorType === 'rate_of_change')) {
        transformedStream$ = transformedStream$.pipe(
          createRateOfChangeOperator(nodeData)
        );
      } else if (nodeType.includes('range') || (nodeData.operatorType === 'range_gate')) {
        transformedStream$ = transformedStream$.pipe(
          createRangeGateOperator(nodeData)
        );
      } else if (nodeType.includes('math') || (nodeData.operatorType === 'math_transform')) {
        transformedStream$ = transformedStream$.pipe(
          createMathTransformOperator(nodeData)
        );
      } else if (nodeType.includes('debounce') || (nodeData.operatorType === 'debounce')) {
        transformedStream$ = transformedStream$.pipe(
          createDebounceOperator(nodeData)
        );
      }

      // Add node pass pulse
      const monitoredStream$ = transformedStream$.pipe(
        tap(data => {
          if (wsBroadcaster) {
            wsBroadcaster({
              type: 'pipeline:node_pulse',
              pipelineId,
              nodeId: targetNode.id,
              status: 'passed',
              data: {
                value: data.value,
                movingAverage: data.movingAverage,
                rateOfChange: data.rateOfChange,
                timestamp: data.timestamp
              }
            });
          }
        })
      );

      // Check if target node is an Action / Terminal node
      if (nodeType.includes('action') || nodeType.includes('alert') || nodeType.includes('sms') || nodeType.includes('webhook') || nodeCategory === 'action') {
        const actionSub = monitoredStream$.subscribe({
          next: async (data) => {
            try {
              await dispatchAction(pipeline, targetNode, data);
            } catch (err) {
              console.error(`[StreamCompiler] Error dispatching action for node ${targetNode.id}:`, err);
            }
          },
          error: (err) => {
            console.error(`[StreamCompiler] Stream error in pipeline ${pipelineId}:`, err);
          }
        });

        rootSubscription.add(actionSub);
      } else {
        // Continue chaining downstream
        this.compileDownstream(
          pipeline,
          targetNode.id,
          monitoredStream$,
          nodeMap,
          outgoingEdges,
          rootSubscription,
          branchVisited
        );
      }
    }
  }
}

module.exports = { StreamCompiler, setCompilerWebSocketBroadcaster };