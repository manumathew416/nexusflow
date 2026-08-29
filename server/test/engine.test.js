const { connectDB } = require('../src/config/db');
const TelemetryBus = require('../src/engine/TelemetryBus');
const { StreamCompiler } = require('../src/engine/StreamCompiler');
const { Alert } = require('../src/models/Alert');

async function runTest() {
  console.log('--- Testing NexusFlow Reactive Stream Engine ---');
  await connectDB();

  // Test Pipeline: turbine-test -> Moving Avg (window: 3) -> Threshold (> 75) -> Action Alert
  const testPipeline = {
    pipelineId: 'test-pipe-01',
    name: 'Unit Test Pipeline',
    isActive: true,
    nodes: [
      {
        id: 'n1',
        type: 'sensorNode',
        data: { deviceId: 'test-device', metric: 'temperature', nodeCategory: 'source' }
      },
      {
        id: 'n2',
        type: 'filterNode',
        data: { nodeCategory: 'filter', operatorType: 'moving_average', windowSize: 3 }
      },
      {
        id: 'n3',
        type: 'filterNode',
        data: { nodeCategory: 'filter', operatorType: 'threshold', operator: '>', threshold: 75 }
      },
      {
        id: 'n4',
        type: 'actionNode',
        data: { nodeCategory: 'action', actionType: 'alert', severity: 'critical', messageTemplate: 'Alert for {deviceId} at {value}' }
      }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' }
    ]
  };

  // Compile
  const sub = StreamCompiler.compile(testPipeline);
  console.log('✓ Pipeline compiled successfully into RxJS Stream.');

  // Emit 3 readings below threshold
  TelemetryBus.emit({ deviceId: 'test-device', metric: 'temperature', value: 60 });
  TelemetryBus.emit({ deviceId: 'test-device', metric: 'temperature', value: 65 });
  TelemetryBus.emit({ deviceId: 'test-device', metric: 'temperature', value: 70 });

  await new Promise(r => setTimeout(r, 100));

  // Check alert count
  let alerts = await Alert.getAll({ deviceId: 'test-device' });
  console.log(`Normal readings emitted (avg ~65°C). Alerts recorded: ${alerts.length} (Expected: 0)`);
  if (alerts.length !== 0) throw new Error('Alert triggered unexpectedly!');

  // Emit high readings to push moving average over 75: [70, 85, 90] -> avg = 81.67 > 75
  TelemetryBus.emit({ deviceId: 'test-device', metric: 'temperature', value: 85 });
  TelemetryBus.emit({ deviceId: 'test-device', metric: 'temperature', value: 90 });

  await new Promise(r => setTimeout(r, 200));

  alerts = await Alert.getAll({ deviceId: 'test-device' });
  console.log(`Anomaly readings emitted. Alerts recorded: ${alerts.length} (Expected: >= 1)`);
  if (alerts.length >= 1) {
    console.log(`✓ Triggered Alert: "${alerts[0].message}" with calculated value ${alerts[0].value}`);
  } else {
    throw new Error('Expected alert was not triggered!');
  }

  sub.unsubscribe();
  console.log('✓ Unsubscribed cleanly.');
  console.log('ALL ENGINE UNIT TESTS PASSED!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});