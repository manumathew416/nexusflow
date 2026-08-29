const { Pipeline } = require('../models/Pipeline');
const { StreamCompiler } = require('./StreamCompiler');

class PipelineManager {
  constructor() {
    this.activePipelines = new Map(); // pipelineId -> { subscription, pipeline }
  }

  async loadAndCompileAll() {
    console.log('[PipelineManager] Loading pipelines from database...');
    let pipelines = await Pipeline.getAll();

    // If database is empty, seed default preset templates!
    if (!pipelines || pipelines.length === 0) {
      console.log('[PipelineManager] No pipelines found. Seeding industrial preset templates...');
      await this.seedPresetTemplates();
      pipelines = await Pipeline.getAll();
    }

    let activeCount = 0;
    for (const p of pipelines) {
      if (p.isActive) {
        this.deployPipeline(p);
        activeCount++;
      }
    }
    console.log(`[PipelineManager] ${activeCount} pipeline(s) compiled and active in reactive stream engine.`);
  }

  deployPipeline(pipeline) {
    const pipelineId = pipeline.pipelineId || pipeline._id;

    // Stop existing subscription if running
    this.stopPipeline(pipelineId, false);

    try {
      const subscription = StreamCompiler.compile(pipeline);
      this.activePipelines.set(pipelineId, {
        subscription,
        pipeline,
        deployedAt: new Date()
      });
      console.log(`[PipelineManager] Pipeline "${pipeline.name}" (${pipelineId}) successfully deployed.`);
      return { success: true, active: true };
    } catch (err) {
      console.error(`[PipelineManager] Failed to compile pipeline ${pipelineId}:`, err);
      return { success: false, error: err.message };
    }
  }

  stopPipeline(pipelineId, updateDb = false) {
    if (this.activePipelines.has(pipelineId)) {
      const entry = this.activePipelines.get(pipelineId);
      if (entry.subscription && typeof entry.subscription.unsubscribe === 'function') {
        entry.subscription.unsubscribe();
      }
      this.activePipelines.delete(pipelineId);
      console.log(`[PipelineManager] Pipeline ${pipelineId} stopped and unsubscribed.`);
    }

    if (updateDb) {
      Pipeline.update(pipelineId, { isActive: false }).catch(() => {});
    }
  }

  getActiveList() {
    return Array.from(this.activePipelines.keys());
  }

  isPipelineActive(pipelineId) {
    return this.activePipelines.has(pipelineId);
  }

  async seedPresetTemplates() {
    const presets = [
      {
        pipelineId: 'preset-turbine-overheat',
        name: 'Turbine Overheat Detection',
        description: 'Smooths temperature with a 5-reading rolling average and triggers an instant SMS alert if temp exceeds 80°C.',
        isActive: true,
        tags: ['Turbine', 'Temperature', 'Moving Average', 'SMS Alert'],
        nodes: [
          {
            id: 'node-source-1',
            type: 'sensorNode',
            position: { x: 50, y: 150 },
            data: {
              label: 'Turbine-01 Temp Sensor',
              nodeCategory: 'source',
              deviceId: 'turbine-01',
              metric: 'temperature',
              unit: '°C',
              nominal: 68
            }
          },
          {
            id: 'node-filter-1',
            type: 'filterNode',
            position: { x: 380, y: 150 },
            data: {
              label: 'Moving Average (Window: 5)',
              nodeCategory: 'filter',
              operatorType: 'moving_average',
              windowSize: 5
            }
          },
          {
            id: 'node-filter-2',
            type: 'filterNode',
            position: { x: 700, y: 150 },
            data: {
              label: 'Threshold Check (> 80°C)',
              nodeCategory: 'filter',
              operatorType: 'threshold',
              operator: '>',
              threshold: 80
            }
          },
          {
            id: 'node-action-1',
            type: 'actionNode',
            position: { x: 1020, y: 150 },
            data: {
              label: 'Critical SMS Alert',
              nodeCategory: 'action',
              actionType: 'sms',
              severity: 'critical',
              recipient: '+1 (555) 019-8234',
              messageTemplate: 'CRITICAL: {deviceId} overheat detected! Rolling average temperature reached {value}{unit}.'
            }
          }
        ],
        edges: [
          { id: 'edge-1-2', source: 'node-source-1', target: 'node-filter-1', animated: true },
          { id: 'edge-2-3', source: 'node-filter-1', target: 'node-filter-2', animated: true },
          { id: 'edge-3-4', source: 'node-filter-2', target: 'node-action-1', animated: true }
        ]
      },
      {
        pipelineId: 'preset-pressure-surge',
        name: 'Reactor Pressure Surge Protection',
        description: 'Monitors reactor core pressure rate of change. Triggers an automated safety webhook if pressure increases rapidly.',
        isActive: true,
        tags: ['Reactor', 'Pressure', 'Rate of Change', 'Webhook'],
        nodes: [
          {
            id: 'node-pres-1',
            type: 'sensorNode',
            position: { x: 50, y: 380 },
            data: {
              label: 'Reactor Core Pressure',
              nodeCategory: 'source',
              deviceId: 'reactor-alpha',
              metric: 'pressure',
              unit: 'bar',
              nominal: 12.5
            }
          },
          {
            id: 'node-pres-2',
            type: 'filterNode',
            position: { x: 380, y: 380 },
            data: {
              label: 'Rate of Change (Δ > 2.0 bar/s)',
              nodeCategory: 'filter',
              operatorType: 'rate_of_change',
              deltaThreshold: 2.0
            }
          },
          {
            id: 'node-pres-3',
            type: 'actionNode',
            position: { x: 740, y: 380 },
            data: {
              label: 'SCADA Webhook Alert',
              nodeCategory: 'action',
              actionType: 'webhook',
              severity: 'warning',
              webhookUrl: 'https://scada.internal/api/v2/pressure-surge',
              messageTemplate: 'WARNING: Reactor pressure rapid surge! ΔRate = {value} bar/s'
            }
          }
        ],
        edges: [
          { id: 'edge-p1-p2', source: 'node-pres-1', target: 'node-pres-2', animated: true },
          { id: 'edge-p2-p3', source: 'node-pres-2', target: 'node-pres-3', animated: true }
        ]
      }
    ];

    for (const preset of presets) {
      await Pipeline.create(preset);
    }
  }
}

const instance = new PipelineManager();
module.exports = instance;