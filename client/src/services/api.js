import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Telemetry APIs
export const fetchTelemetryStats = () => client.get('/telemetry/stats').then(res => res.data);
export const fetchTelemetryHistory = (params) => client.get('/telemetry/history', { params }).then(res => res.data);
export const fetchLatestTelemetry = () => client.get('/telemetry/latest').then(res => res.data);
export const ingestTelemetryPoint = (data) => client.post('/telemetry', data).then(res => res.data);

// Pipeline APIs
export const fetchPipelines = () => client.get('/pipelines').then(res => res.data);
export const fetchPipelineById = (id) => client.get(`/pipelines/${id}`).then(res => res.data);
export const createPipeline = (data) => client.post('/pipelines', data).then(res => res.data);
export const updatePipeline = (id, data) => client.put(`/pipelines/${id}`, data).then(res => res.data);
export const deletePipeline = (id) => client.delete(`/pipelines/${id}`).then(res => res.data);
export const togglePipeline = (id) => client.post(`/pipelines/${id}/toggle`).then(res => res.data);
export const testPipelineStructure = (data) => client.post('/pipelines/test-run', data).then(res => res.data);

// Alert APIs
export const fetchAlerts = (params) => client.get('/alerts', { params }).then(res => res.data);
export const fetchAlertStats = () => client.get('/alerts/stats').then(res => res.data);
export const acknowledgeAlert = (id) => client.post(`/alerts/${id}/acknowledge`).then(res => res.data);
export const clearAllAlerts = () => client.delete('/alerts/clear').then(res => res.data);

// Device APIs
export const fetchDevices = () => client.get('/devices').then(res => res.data);
export const fetchDeviceById = (id) => client.get(`/devices/${id}`).then(res => res.data);

// Simulator APIs
export const fetchSimulatorStatus = () => client.get('/simulator/status').then(res => res.data);
export const startSimulator = (frequencyMs) => client.post('/simulator/start', { frequencyMs }).then(res => res.data);
export const stopSimulator = () => client.post('/simulator/stop').then(res => res.data);
export const setSimulatorFrequency = (frequencyMs) => client.post('/simulator/frequency', { frequencyMs }).then(res => res.data);
export const triggerAnomaly = (data) => client.post('/simulator/anomaly', data).then(res => res.data);

// Health Check
export const fetchHealth = () => client.get('/health').then(res => res.data);