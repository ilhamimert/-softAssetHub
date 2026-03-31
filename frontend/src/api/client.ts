import axios from 'axios';

const BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s — backend timeout ile eşleştirildi
});

// Request interceptor — JWT token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401'de token yenile, sonra isteği tekrarla
let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return Promise.reject(error);

    if (isRefreshing) {
      if (failedQueue.length >= 20) return Promise.reject(error);
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefresh);
      // Zustand store'u da güncelle
      try {
        const mod = await import('@/store/authStore');
        mod.useAuthStore.getState().setTokens(accessToken, newRefresh);
      } catch { /* store update optional */ }
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      original.headers.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
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
  bulkResolve: (ids: number[], notes?: string) => api.post('/alerts/bulk-resolve', { ids, resolutionNotes: notes }),
  delete: (id: number) => api.delete(`/alerts/${id}`),
};

// Analytics
export const analyticsApi = {
  getDashboardKPI: (params?: object) => api.get('/analytics/dashboard-kpi', { params }),
  getPowerConsumption: (params?: object) => api.get('/analytics/power-consumption', { params }),
  getAssetHealth: (params?: object) => api.get('/analytics/asset-health', { params }),
  getBudget: (params?: object) => api.get('/analytics/budget', { params }),
  getMaintenanceForecast: (params?: object) => api.get('/analytics/maintenance-forecast', { params }),
  getPhysicalNodeDistribution: () => api.get('/analytics/physical-node-distribution'),
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

// Licenses
export const licenseApi = {
  getAll:     (params?: object) => api.get('/licenses', { params }),
  getByAsset: (assetId: number) => api.get(`/assets/${assetId}/licenses`),
  getById:    (id: number)      => api.get(`/licenses/${id}`),
  create:     (data: object)    => api.post('/licenses', data),
  update:     (id: number, data: object) => api.put(`/licenses/${id}`, data),
  delete:     (id: number)      => api.delete(`/licenses/${id}`),
};

// Buildings
export const buildingApi = {
  getByChannel: (channelId: number) => api.get(`/channels/${channelId}/buildings`),
  getById: (id: number) => api.get(`/buildings/${id}`),
  create: (data: object) => api.post('/buildings', data),
  update: (id: number, data: object) => api.put(`/buildings/${id}`, data),
  delete: (id: number) => api.delete(`/buildings/${id}`),
};

// Rooms
export const roomApi = {
  getByBuilding: (buildingId: number) => api.get(`/buildings/${buildingId}/rooms`),
  getById: (id: number) => api.get(`/rooms/${id}`),
  create: (data: object) => api.post('/rooms', data),
  update: (id: number, data: object) => api.put(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
};

// Reports
export const reportApi = {
  getAll: (params?: object) => api.get('/reports', { params }),
  getById: (id: number) => api.get(`/reports/${id}`),
  create: (data: object) => api.post('/reports', data),
  update: (id: number, data: object) => api.put(`/reports/${id}`, data),
  delete: (id: number) => api.delete(`/reports/${id}`),
};

// Logs
export const logApi = {
  getActivity: (params?: object) => api.get('/logs/activity', { params }),
};

export default api;
