# NexusFlow — Visual, No-Code IoT Telemetry & Reactive Rule Engine

NexusFlow is a full-stack MERN application that solves the IoT rule configuration bottleneck. Instead of requiring developers to write and deploy code changes every time business logic or thresholds change, NexusFlow allows domain operators to visually build real-time data pipelines on an interactive canvas. 

The backend dynamically compiles visual node graphs into **RxJS reactive stream pipelines**, executing continuously against high-frequency sensor telemetry ingested into native MongoDB Time-Series collections and broadcasting real-time data and alerts over WebSockets.

---

## Key Features

- **Visual Graph Builder**: Drag-and-drop node canvas powered by React Flow with customizable Data Source nodes, Math & Filter operators, Logic gates, and Action triggers.
- **RxJS Stream Compiler**: Dynamic backend engine that parses directed node graphs and compiles them into live, reactive RxJS Observable pipelines with hot-reloading.
- **MongoDB Native Time-Series**: High-throughput, append-only time-series storage (`timeseries: { timeField: 'timestamp', metaField: 'metadata', granularity: 'seconds' }`) with seamless embedded fallback.
- **Live Canvas Execution Visualizer**: Flowing animated edges and pulsing node indicators illuminate in real time when telemetry and rule evaluation events pass through the graph.
- **Hardware Telemetry Simulator**: Built-in industrial multi-device telemetry simulator with real-time waveform generation and interactive **1-Click Anomaly Injections** (Turbine Overheat, Reactor Pressure Surge, Vibration Spike).
- **Real-Time Dashboards**: High-frequency Recharts time-series visualization with auto-scrolling windows, metric selectors, threshold reference overlays, and live alert feeds.

---

## System Architecture

```
[ Mock Hardware / External Sensors ]
                 │
                 ▼  (HTTP POST /api/telemetry)
┌─────────────────────────────────────────────────────────┐
│                   NexusFlow Backend                     │
│                                                         │
│  ┌──────────────────┐       ┌────────────────────────┐  │
│  │ MongoDB Time-    │       │ TelemetryBus           │  │
│  │ Series Ingest    │       │ (RxJS Subject Broker)  │  │
│  └──────────────────┘       └───────────┬────────────┘  │
│                                         │               │
│                             ┌───────────▼────────────┐  │
│                             │ PipelineManager        │  │
│                             │ & RxJS Stream Compiler │  │
│                             └───────────┬────────────┘  │
│                                         │               │
│                             ┌───────────▼────────────┐  │
│                             │ Action Dispatcher      │  │
│                             └───────────┬────────────┘  │
│                                         │               │
│  ┌──────────────────────────────────────▼────────────┐  │
│  │ WebSocket Broadcaster (Port 5000)                 │  │
│  └──────────────────────────────────────┬────────────┘  │
└─────────────────────────────────────────┼───────────────┘
                                          │
                                          ▼  (WebSocket /ws)
┌─────────────────────────────────────────────────────────┐
│                   NexusFlow Frontend                    │
│                                                         │
│  ┌─────────────────────┐       ┌─────────────────────┐  │
│  │ React Flow Canvas   │       │ Recharts Live       │  │
│  │ (Glowing DAG Trace) │       │ Telemetry Dashboard │  │
│  └─────────────────────┘       └─────────────────────┘  │
│  ┌─────────────────────┐       ┌─────────────────────┐  │
│  │ Live Alert Center   │       │ Simulator Controls  │  │
│  └─────────────────────┘       └─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start & Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- (Optional) MongoDB 5.0+ — If MongoDB is not installed/running, NexusFlow automatically initializes an in-memory time-series datastore fallback.

### 1. Installation
Clone the repository and install all dependencies:

```bash
cd nexusflow
npm run install:all
```

### 2. Start Both Backend & Frontend Concurrently
From the root `nexusflow` directory:

```bash
npm run dev
```

- **Backend API & WebSockets**: `http://localhost:5000` (WebSocket at `ws://localhost:5000`)
- **Frontend Client**: `http://localhost:5173`

---

## Independent Service Commands

### Backend Server (`/server`)
```bash
cd server
npm install
npm run dev          # Runs server with nodemon live reload
npm run simulate     # Runs standalone CLI telemetry emitter script
npm test             # Executes RxJS stream engine compiler verification test
```

### Frontend Client (`/client`)
```bash
cd client
npm install
npm run dev          # Starts Vite development server at http://localhost:5173
npm run build        # Compiles production distribution build
```

---

## Preloaded Industrial Pipeline Presets

NexusFlow comes preloaded with ready-to-run industrial templates:

1. **Turbine Overheat Detection**:
   - `Turbine Temp Sensor (turbine-01)` $\rightarrow$ `Moving Average (N=5)` $\rightarrow$ `Threshold Filter (> 80°C)` $\rightarrow$ `Critical SMS Alert`
2. **Reactor Pressure Surge Protection**:
   - `Reactor Pressure Sensor (reactor-alpha)` $\rightarrow$ `Rate of Change (Δ > 2.0 bar/s)` $\rightarrow$ `SCADA Webhook Alert`
3. **Turbine Vibration Safety Cutoff**:
   - `Vibration Accelerometer (turbine-01)` $\rightarrow$ `Threshold Gate (> 4.0 mm/s)` $\rightarrow$ `Debounce Gate (5s)` $\rightarrow$ `Relay Actuator Trip`

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/telemetry` | Ingest single sensor point (`{ deviceId, metric, value, unit, timestamp }`) |
| `POST` | `/api/telemetry/batch` | Ingest batch array of telemetry points |
| `GET` | `/api/telemetry/history` | Query time-series telemetry with optional device/metric filters |
| `GET` | `/api/telemetry/stats` | Ingestion throughput (msg/s), active subscriber count, DB status |
| `GET` | `/api/pipelines` | List all saved visual rule pipelines with execution stats |
| `POST` | `/api/pipelines` | Create and dynamically compile a new pipeline |
| `PUT` | `/api/pipelines/:id` | Update and hot-reload a compiled pipeline |
| `POST` | `/api/pipelines/:id/toggle` | Activate / Deactivate pipeline in reactive engine |
| `GET` | `/api/alerts` | Query active and historical triggered alerts |
| `POST` | `/api/alerts/:id/acknowledge` | Acknowledge a triggered alert |
| `POST` | `/api/simulator/start` | Start hardware telemetry simulator |
| `POST` | `/api/simulator/stop` | Stop hardware telemetry simulator |
| `POST` | `/api/simulator/anomaly` | Inject simulated anomaly spike to test rules |