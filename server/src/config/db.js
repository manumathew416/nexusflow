const mongoose = require('mongoose');
const net = require('net');

let isConnected = false;
let usingFallback = false;
let memoryStore = {
  telemetries: [],
  pipelines: [],
  alerts: [],
  devices: []
};

function isPortOpen(host, port, timeout = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.once('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

async function connectDB() {
  const customUri = process.env.MONGODB_URI;

  if (customUri) {
    try {
      console.log(`[Database] Attempting configured MongoDB connection: ${customUri}...`);
      await mongoose.connect(customUri, { serverSelectionTimeoutMS: 2000 });
      isConnected = true;
      usingFallback = false;
      console.log('[Database] Connected to external MongoDB successfully.');
      await initTimeSeriesCollection();
      return;
    } catch (err) {
      console.warn(`[Database] MongoDB URI connection failed (${err.message}).`);
    }
  }

  // Quick probe local port 27017
  const localRunning = await isPortOpen('127.0.0.1', 27017, 400);
  if (localRunning) {
    try {
      console.log('[Database] Local MongoDB detected on 127.0.0.1:27017. Connecting...');
      await mongoose.connect('mongodb://127.0.0.1:27017/nexusflow', { serverSelectionTimeoutMS: 2000 });
      isConnected = true;
      usingFallback = false;
      console.log('[Database] Connected to local MongoDB.');
      await initTimeSeriesCollection();
      return;
    } catch (err) {
      console.warn('[Database] Local connection failed, using fallback.');
    }
  }

  // Fallback in-memory store
  console.log('[Database] Using high-performance In-Memory Time-Series datastore.');
  isConnected = true;
  usingFallback = true;
}

async function initTimeSeriesCollection() {
  if (usingFallback) return;
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    
    if (!names.includes('telemetries')) {
      console.log('[Database] Creating native Time-Series collection "telemetries"...');
      await db.createCollection('telemetries', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'seconds'
        }
      });
      console.log('[Database] Native MongoDB Time-Series collection initialized.');
    }
  } catch (err) {
    console.warn('[Database] Time-series collection init note:', err.message);
  }
}

function getDatabaseStatus() {
  return {
    connected: isConnected,
    mode: usingFallback ? 'Embedded Time-Series Store' : 'Native MongoDB 5.0+ (Time-Series)',
    host: usingFallback ? 'memory://internal' : (mongoose.connection ? mongoose.connection.host : 'localhost'),
    name: usingFallback ? 'nexusflow_memory' : (mongoose.connection ? mongoose.connection.name : 'nexusflow')
  };
}

function isUsingFallback() {
  return usingFallback || !mongoose.connection || mongoose.connection.readyState !== 1;
}

module.exports = {
  connectDB,
  getDatabaseStatus,
  isUsingFallback,
  memoryStore
};