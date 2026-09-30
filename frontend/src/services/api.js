import axios from 'axios';

const BASE = 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// ── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboardSummary = ()            => api.get('/api/dashboard/summary');
export const getProjects         = (params = {}) => api.get('/api/projects', { params });
export const getProjectDetail    = (id)          => api.get(`/api/projects/${id}`);
export const getProjectHistory   = (id)          => api.get(`/api/projects/${id}/history`);

// ── Prediction & Explainability ───────────────────────────────────────────
export const getProjectPrediction = (id)         => api.get(`/api/projects/${id}/prediction`);

// ── Benchmark ─────────────────────────────────────────────────────────────
export const getProjectBenchmark  = (id)         => api.get(`/api/projects/${id}/benchmark`);

// ── What-If Simulator ─────────────────────────────────────────────────────
export const simulateProject = (id, body)        => api.post(`/api/projects/${id}/simulate`, body);

// ── Alerts ────────────────────────────────────────────────────────────────
export const getAlerts = (params = {})           => api.get('/api/alerts', { params });

// ── Filters ───────────────────────────────────────────────────────────────
export const getFilterStates  = ()               => api.get('/api/filters/states');
export const getFilterSectors = ()               => api.get('/api/filters/sectors');

// ── Upload ────────────────────────────────────────────────────────────────
export const uploadFile = (file, snapshotDate) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('snapshot_date', snapshotDate);
  return api.post('/api/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── ML ────────────────────────────────────────────────────────────────────
export const trainModels      = ()               => api.post('/api/ml/train/sync');
export const getModelMetrics  = ()               => api.get('/api/ml/metrics');
export const getModelStatus   = ()               => api.get('/api/ml/status');

// ── Data Sufficiency ──────────────────────────────────────────────────────
export const getDataSufficiency = ()             => api.get('/api/data-sufficiency');

export default api;
