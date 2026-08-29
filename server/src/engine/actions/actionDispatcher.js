const { Alert } = require('../../models/Alert');
const { Pipeline } = require('../../models/Pipeline');

let wsBroadcaster = null;

function setWebSocketBroadcaster(broadcaster) {
  wsBroadcaster = broadcaster;
}

async function dispatchAction(pipeline, actionNode, telemetryData) {
  const nodeData = actionNode.data || {};
  const actionType = nodeData.actionType || actionNode.type || 'alert';
  const severity = nodeData.severity || 'warning';
  const pipelineId = pipeline.pipelineId || pipeline._id;
  const pipelineName = pipeline.name || 'NexusFlow Rule';

  const deviceId = telemetryData.deviceId || (telemetryData.metadata && telemetryData.metadata.deviceId) || 'Unknown Device';
  const metric = telemetryData.metric || (telemetryData.metadata && telemetryData.metadata.metric) || 'Sensor';
  const value = telemetryData.value !== undefined ? telemetryData.value : (telemetryData.originalValue || 0);
  const unit = telemetryData.unit || (telemetryData.metadata && telemetryData.metadata.unit) || '';

  // Custom or default template message
  let message = nodeData.messageTemplate || `Anomaly in ${deviceId}: ${metric} reached ${value}${unit}`;
  message = message
    .replace('{deviceId}', deviceId)
    .replace('{metric}', metric)
    .replace('{value}', value)
    .replace('{unit}', unit)
    .replace('{pipelineName}', pipelineName);

  // 1. Create Alert in DB
  const alertRecord = await Alert.create({
    pipelineId,
    pipelineName,
    deviceId,
    metric,
    severity,
    message,
    value,
    threshold: telemetryData.ruleCondition || nodeData.threshold || 'Triggered',
    actionType,
    metadata: {
      actionNodeId: actionNode.id,
      telemetry: telemetryData
    }
  });

  // 2. Increment pipeline stats
  await Pipeline.incrementStats(pipelineId, { alerts: 1 });

  // 3. Broadcast to WebSockets
  if (wsBroadcaster) {
    wsBroadcaster({
      type: 'pipeline:alert',
      alert: alertRecord
    });

    wsBroadcaster({
      type: 'pipeline:node_pulse',
      pipelineId,
      nodeId: actionNode.id,
      status: 'triggered',
      data: {
        value,
        metric,
        deviceId,
        timestamp: new Date()
      }
    });
  }

  // 4. Mock Action Integrations
  switch (actionType) {
    case 'sms':
      const phone = nodeData.recipient || '+1 (555) 019-2834';
      console.log(`[ACTION: SMS DISPATCH] \u2709\uFE0F To: ${phone} | [${severity.toUpperCase()}] ${message}`);
      break;

    case 'webhook':
      const targetUrl = nodeData.webhookUrl || 'https://api.factory-ops.internal/v1/alerts';
      console.log(`[ACTION: WEBHOOK POST] \uD83C\uDF10 Target: ${targetUrl} | Payload:`, JSON.stringify({
        event: 'telemetry_anomaly',
        pipelineId,
        deviceId,
        metric,
        value,
        timestamp: new Date().toISOString()
      }));
      // If user supplied an http URL, optionally fire fetch/axios
      if (nodeData.webhookUrl && nodeData.webhookUrl.startsWith('http')) {
        try {
          const http = nodeData.webhookUrl.startsWith('https') ? require('https') : require('http');
          const urlObj = new URL(nodeData.webhookUrl);
          const req = http.request(urlObj, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          req.on('error', (e) => console.warn('Webhook dispatch note:', e.message));
          req.write(JSON.stringify({ alert: alertRecord }));
          req.end();
        } catch (e) {}
      }
      break;

    case 'actuator':
    case 'relay':
      const command = nodeData.actuatorCommand || 'TRIP_SAFETY_SHUTDOWN';
      console.log(`[ACTION: ACTUATOR CONTROL] \u26A1 Command: ${command} issued to device [${deviceId}]`);
      break;

    case 'email':
      const email = nodeData.email || 'ops-team@nexusflow.io';
      console.log(`[ACTION: EMAIL NOTIFICATION] \uD83D\uDCE7 To: ${email} | Subject: [${severity.toUpperCase()}] NexusFlow Alert: ${deviceId}`);
      break;

    default:
      console.log(`[ACTION: ALERT DISPATCHED] [${severity.toUpperCase()}] ${message}`);
  }

  return alertRecord;
}

module.exports = { dispatchAction, setWebSocketBroadcaster };