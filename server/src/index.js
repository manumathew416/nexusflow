require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { WebSocketServer, WebSocket } = require('ws');

const { connectDB, getDatabaseStatus } = require('./config/db');
const { setWebSocketBroadcaster } = require('./engine/actions/actionDispatcher');
const { setCompilerWebSocketBroadcaster } = require('./engine/StreamCompiler');
const PipelineManager = require('./engine/PipelineManager');
const simulator = require('./simulator/sensorSimulator');

// Routes
const telemetryRouter = require('./routes/telemetry');
const pipelinesRouter = require('./routes/pipelines');
const alertsRouter = require('./routes/alerts');
const devicesRouter = require('./routes/devices');
const simulatorRouter = require('./routes/simulator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/telemetry', telemetryRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/simulator', simulatorRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    database: getDatabaseStatus(),
    activePipelines: PipelineManager.getActiveList().length,
    simulatorRunning: simulator.isRunning,
    timestamp: new Date()
  });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Connect WebSocket broadcaster to Action Dispatcher, Stream Compiler, and Simulator
setWebSocketBroadcaster(broadcast);
setCompilerWebSocketBroadcaster(broadcast);
simulator.setBroadcaster(broadcast);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] Client connected from ${clientIp}. Total active: ${wss.clients.size}`);

  // Send initial handshake state
  ws.send(JSON.stringify({
    type: 'system:handshake',
    message: 'Connected to NexusFlow Telemetry & Reactive Rule Engine',
    database: getDatabaseStatus(),
    activePipelines: PipelineManager.getActiveList(),
    simulator: simulator.getStatus(),
    timestamp: new Date()
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected. Total active: ${wss.clients.size}`);
  });
});

// Bootstrap Database, Reactive Engine, and HTTP Server
async function startServer() {
  try {
    // 1. Connect MongoDB / Memory store
    await connectDB();

    // 2. Load and compile all active pipelines into RxJS streams
    await PipelineManager.loadAndCompileAll();

    // 3. Start sensor simulator
    simulator.start(1000);

    // 4. Listen on PORT
    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  NEXUSFLOW — Reactive IoT Rule Engine Server`);
      console.log(`  HTTP API Server: http://localhost:${PORT}`);
      console.log(`  WebSocket Server: ws://localhost:${PORT}`);
      console.log(`  MongoDB Status:  ${getDatabaseStatus().mode}`);
      console.log(`  Simulator State: ACTIVE (Emitting every 1000ms)`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, broadcast };