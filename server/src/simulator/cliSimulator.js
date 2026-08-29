const http = require('http');

const PORT = process.env.PORT || 5000;
const HOST = 'localhost';

console.log('--- NexusFlow Hardware Telemetry CLI Simulator ---');
console.log(`Target: http://${HOST}:${PORT}/api/telemetry`);

let count = 0;
const interval = setInterval(() => {
  count++;
  const isSpike = Math.random() > 0.85;
  const temp = isSpike ? (85 + Math.random() * 15) : (68 + (Math.sin(count * 0.2) * 5) + (Math.random() * 2));

  const payload = JSON.stringify({
    deviceId: 'turbine-01',
    metric: 'temperature',
    value: Math.round(temp * 100) / 100,
    unit: '°C',
    location: 'Bay 3',
    timestamp: new Date().toISOString()
  });

  const req = http.request({
    hostname: HOST,
    port: PORT,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log(`[#${count}] Ingested: ${payload}`);
    }
  });

  req.on('error', (e) => {
    console.error(`Ingestion error: ${e.message} (Is NexusFlow server running?)`);
  });

  req.write(payload);
  req.end();
}, 1000);

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\nSimulator stopped.');
  process.exit(0);
});