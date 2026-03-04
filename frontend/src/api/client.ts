import axios from 'axios';

const BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — JWT token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401 gelirse token yenile veya logout
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// API FUNCTIONS — Hierarchy: Holding -> Channel -> AssetGroup -> Asset -> Component
// ============================================================

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Holdings (Broadcast Grubu)
export const holdingApi = {
  getAll: () => api.get('/holdings'),
  getById: (id: number) => api.get(`/holdings/${id}`),
  create: (data: object) => api.post('/holdings', data),
  update: (id: number, data: object) => api.put(`/holdings/${id}`, data),
  delete: (id: number) => api.delete(`/holdings/${id}`),
};

// Channels
export const channelApi = {
  getAll: () => api.get('/channels'),
  getById: (id: number) => api.get(`/channels/${id}`),
  create: (data: object) => api.post('/channels', data),
  update: (id: number, data: object) => api.put(`/channels/${id}`, data),
  delete: (id: number) => api.delete(`/channels/${id}`),
};

// Asset Groups (VarlıkGrubu)
export const assetGroupApi = {
  getByChannel: (channelId: number) => api.get(`/channels/${channelId}/groups`),
  getAll: (params?: object) => api.get('/assetgroups', { params }),
  getById: (id: number) => api.get(`/assetgroups/${id}`),
  create: (data: object) => api.post('/assetgroups', data),
  update: (id: number, data: object) => api.put(`/assetgroups/${id}`, data),
  delete: (id: number) => api.delete(`/assetgroups/${id}`),
};

// Assets
export const assetApi = {
  getAll: (params?: object) => api.get('/assets', { params }),
  getById: (id: number) => api.get(`/assets/${id}`),
  getTree: (id: number) => api.get(`/assets/${id}/tree`),
  create: (data: object) => api.post('/assets', data),
  bulkCreate: (assets: object[]) => api.post('/assets/bulk', { assets }),
  update: (id: number, data: object) => api.put(`/assets/${id}`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
};

// Asset Components (Eklentiler)
export const componentApi = {
  getByAsset: (assetId: number) => api.get(`/assets/${assetId}/components`),
  getById: (id: number) => api.get(`/components/${id}`),
  create: (data: object) => api.post('/components', data),
  update: (id: number, data: object) => api.put(`/components/${id}`, data),
  delete: (id: number) => api.delete(`/components/${id}`),
};

// Monitoring
export const monitoringApi = {
  getCurrent: (assetId: number) => api.get(`/monitoring/${assetId}/current`),
  getHistory: (assetId: number, params?: object) => api.get(`/monitoring/${assetId}/history`, { params }),
  getChannelStats: (channelId: number) => api.get(`/monitoring/stats/channel/${channelId}`),
  getHeatmap: (params?: object) => api.get('/monitoring/heatmap', { params }),
};

// Maintenance
export const maintenanceApi = {
  getByAsset: (assetId: number) => api.get(`/assets/${assetId}/maintenance`),
  getScheduled: (params?: object) => api.get('/maintenance/scheduled', { params }),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (data: object) => api.post('/maintenance', data),
  update: (id: number, data: object) => api.put(`/maintenance/${id}`, data),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
};

// Alerts
export const alertApi = {
  getAll: (params?: object) => api.get('/alerts', { params }),
  getDashboard: (params?: object) => api.get('/alerts/dashboard', { params }),
  create: (data: object) => api.post('/alerts', data),
  resolve: (id: number, notes?: string) => api.put(`/alerts/${id}/resolve`, { resolutionNotes: notes }),
  delete: (id: number) => api.delete(`/alerts/${id}`),
};

// Analytics
export const analyticsApi = {
  getDashboardKPI: (params?: object) => api.get('/analytics/dashboard-kpi', { params }),
  getPowerConsumption: (params?: object) => api.get('/analytics/power-consumption', { params }),
  getAssetHealth: (params?: object) => api.get('/analytics/asset-health', { params }),
  getBudget: (params?: object) => api.get('/analytics/budget', { params }),
  getMaintenanceForecast: (params?: object) => api.get('/analytics/maintenance-forecast', { params }),
};

// Users
export const userApi = {
  getAll: (params?: object) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  update: (id: number, data: object) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  changePassword: (id: number, data: object) => api.put(`/users/${id}/password`, data),
};

// Logs
export const logApi = {
  getActivity: (params?: object) => api.get('/logs/activity', { params }),
};

export default api;
