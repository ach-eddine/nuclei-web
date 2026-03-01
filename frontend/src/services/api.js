import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 30000,
});

// Health
export const getHealth = () => api.get('/health').then((r) => r.data);

// Scan
export const startScan = (formData) => api.post('/scan/start', formData).then((r) => r.data);
export const stopScan = () => api.post('/scan/stop').then((r) => r.data);
export const getScanStatus = () => api.get('/scan/status').then((r) => r.data);

// Results
export const getResults = (params) => api.get('/results', { params }).then((r) => r.data);
export const getResultsSummary = (params) => api.get('/results/summary', { params }).then((r) => r.data);
export const getResultById = (id) => api.get(`/results/${id}`).then((r) => r.data);

export default api;
