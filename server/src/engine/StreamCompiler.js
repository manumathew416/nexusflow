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

    if (!nodes.length) {
      console.log(
        `[StreamCompiler] Pipeline ${pipelineId} has no nodes to compile.`
      );
      return rootSubscription;
    }

    const nodeMap = new Map();

    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    const outgoingEdges = new Map();

    edges.forEach((edge) => {
      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }

      outgoingEdges.get(edge.source).push(edge);
    });

    // Find source/sensor nodes
    const sourceNodes = nodes.filter((node) => {
      const type = String(node.type || '').toLowerCase();
      const category = String(
        node.data?.nodeCategory || ''
      ).toLowerCase();

      return (
        type.includes('sensor') ||
        type.includes('source') ||
        category === 'source'
      );
    });

    if (!sourceNodes.length) {
      console.warn(
        `[StreamCompiler] Pipeline "${pipeline.name}" (${pipelineId}) has no Data Source nodes.`
      );

      return rootSubscription;
    }

    console.log(
      `[StreamCompiler] Compiling pipeline "${pipeline.name}" (${pipelineId}) with ${sourceNodes.length} source(s) and ${nodes.length} total nodes...`
    );

    for (const sourceNode of sourceNodes) {
      const deviceId = sourceNode.data?.deviceId || '*';
      const metric = sourceNode.data?.metric || '*';

      const currentStream$ = TelemetryBus
        .getMetricStream(deviceId, metric)
        .pipe(
          tap((data) => {
            Pipeline.incrementStats(pipelineId, {
              processed: 1
            });

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

  static compileDownstream(
    pipeline,
    currentNodeId,
    inputStream$,
    nodeMap,
    outgoingEdges,
    rootSubscription,
    visitedNodes
  ) {
    const edgesFromCurrent =
      outgoingEdges.get(currentNodeId) || [];

    const pipelineId =
      pipeline.pipelineId || pipeline._id;

    for (const edge of edgesFromCurrent) {
      const targetNode = nodeMap.get(edge.target);

      if (!targetNode) {
        console.warn(
          `[StreamCompiler] Target node "${edge.target}" does not exist.`
        );
        continue;
      }

      // Prevent cycles
      if (visitedNodes.has(targetNode.id)) {
        console.warn(
          `[StreamCompiler] Cyclical edge detected between ${currentNodeId} and ${targetNode.id}.`
        );
        continue;
      }

      const branchVisited =
        new Set(visitedNodes);

      branchVisited.add(targetNode.id);

      // Edge animation
      const streamWithEdgePulse$ =
        inputStream$.pipe(
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

      const nodeType =
        String(targetNode.type || '').toLowerCase();

      const nodeCategory =
        String(
          targetNode.data?.nodeCategory || ''
        ).toLowerCase();

      const nodeData =
        targetNode.data || {};

      /*
       * IMPORTANT:
       *
       * filterNode can represent multiple operators:
       * - threshold
       * - moving_average
       * - rate_of_change
       * - range_gate
       * - debounce
       *
       * Therefore operatorType MUST be checked before
       * treating filterNode as a threshold operator.
       */
      const operatorType =
        String(
          nodeData.operatorType || ''
        ).toLowerCase();

      let transformedStream$ =
        streamWithEdgePulse$;

      // Moving Average
      if (
        operatorType === 'moving_average' ||
        nodeType.includes('movingaverage') ||
        nodeType.includes('moving-average') ||
        nodeType.includes('average')
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createMovingAverageOperator(nodeData)
          );
      }

      // Rate of Change
      else if (
        operatorType === 'rate_of_change' ||
        nodeType.includes('rateofchange') ||
        nodeType.includes('rate-of-change')
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createRateOfChangeOperator(nodeData)
          );
      }

      // Range Gate
      else if (
        operatorType === 'range_gate' ||
        nodeType.includes('rangegate') ||
        nodeType.includes('range-gate')
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createRangeGateOperator(nodeData)
          );
      }

      // Math Transform
      else if (
        operatorType === 'math_transform' ||
        nodeType.includes('mathtransform') ||
        nodeType.includes('math-transform') ||
        nodeType.includes('math')
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createMathTransformOperator(nodeData)
          );
      }

      // Debounce
      else if (
        operatorType === 'debounce' ||
        nodeType.includes('debounce')
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createDebounceOperator(nodeData)
          );
      }

      // Threshold
      else if (
        operatorType === 'threshold' ||
        nodeType.includes('threshold') ||
        (
          nodeCategory === 'filter' &&
          !operatorType
        )
      ) {
        transformedStream$ =
          transformedStream$.pipe(
            createThresholdOperator(nodeData)
          );
      }

      // Monitor node output
      const monitoredStream$ =
        transformedStream$.pipe(
          tap((data) => {
            if (wsBroadcaster) {
              wsBroadcaster({
                type: 'pipeline:node_pulse',
                pipelineId,
                nodeId: targetNode.id,
                status: 'passed',
                data: {
                  value: data.value,
                  movingAverage:
                    data.movingAverage,
                  rateOfChange:
                    data.rateOfChange,
                  timestamp: data.timestamp
                }
              });
            }
          })
        );

      // Action / terminal node
      const isActionNode =
        nodeType.includes('action') ||
        nodeType.includes('alert') ||
        nodeType.includes('sms') ||
        nodeType.includes('webhook') ||
        nodeCategory === 'action';

      if (isActionNode) {
        const actionSubscription =
          monitoredStream$.subscribe({
            next: async (data) => {
              try {
                await dispatchAction(
                  pipeline,
                  targetNode,
                  data
                );
              } catch (error) {
                console.error(
                  `[StreamCompiler] Error dispatching action for node ${targetNode.id}:`,
                  error
                );
              }
            },

            error: (error) => {
              console.error(
                `[StreamCompiler] Stream error in pipeline ${pipelineId}:`,
                error
              );
            }
          });

        rootSubscription.add(
          actionSubscription
        );
      }

      // Continue through the graph
      else {
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

module.exports = {
  StreamCompiler,
  setCompilerWebSocketBroadcaster
};