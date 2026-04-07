const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'İSOFT AssetHub API',
    version: '1.2.4',
    description: 'Broadcast varlık yönetim sistemi REST API dokümantasyonu.',
    contact: { name: 'İSOFT', url: 'https://ilhami.yesiloz.net' },
  },
  servers: [
    { url: '/api/v1', description: 'Production (Nginx proxy)' },
    { url: 'http://localhost:5000/api/v1', description: 'Local dev' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Auth ────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Kullanıcı girişi',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: '••••••••' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Giriş başarılı — accessToken + refreshToken döner' },
          401: { description: 'Hatalı kullanıcı adı veya şifre', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Access token yenile', security: [],
        responses: { 200: { description: 'Yeni accessToken' }, 401: { description: 'Geçersiz refresh token' } } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Oturumdaki kullanıcı bilgisi',
        responses: { 200: { description: 'User objesi' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Çıkış yap',
        responses: { 200: { description: 'Başarılı' } } },
    },

    // ── Assets ──────────────────────────────────────────────────
    '/assets': {
      get: { tags: ['Assets'], summary: 'Asset listesi (filtreli, sayfalı)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['Active', 'Inactive', 'Maintenance', 'Decommissioned'] } },
          { name: 'channelId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Asset listesi + pagination' } },
      },
      post: { tags: ['Assets'], summary: 'Yeni asset oluştur (Technician+)',
        responses: { 201: { description: 'Oluşturuldu' }, 400: { description: 'Validasyon hatası' } },
      },
    },
    '/assets/{id}': {
      get: { tags: ['Assets'], summary: 'Asset detayı',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Asset objesi' }, 404: { description: 'Bulunamadı' } },
      },
      put: { tags: ['Assets'], summary: 'Asset güncelle (Technician+)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Güncellendi' } },
      },
      delete: { tags: ['Assets'], summary: 'Asset sil (Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Silindi' } },
      },
    },
    '/assets/export': {
      get: { tags: ['Assets'], summary: 'Asset listesini CSV olarak dışa aktar',
        responses: { 200: { description: 'CSV dosyası', content: { 'text/csv': {} } } },
      },
    },
    '/assets/warranty-expiring': {
      get: { tags: ['Assets'], summary: 'Garantisi yakında dolacak asset\'ler',
        responses: { 200: { description: 'Asset listesi' } } },
    },

    // ── Monitoring ──────────────────────────────────────────────
    '/monitoring/heatmap': {
      get: { tags: ['Monitoring'], summary: 'Tüm asset\'lerin anlık monitoring özeti',
        responses: { 200: { description: 'HeatmapAsset[]' } } },
    },
    '/monitoring/{assetId}': {
      post: { tags: ['Monitoring'], summary: 'Push agent verisi gönder (X-Agent-Key auth)',
        security: [],
        parameters: [{ name: 'assetId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cpuUsage: { type: 'number', example: 45.2 },
                  ramUsage: { type: 'number', example: 62.8 },
                  diskUsage: { type: 'number', example: 31.0 },
                  temperature: { type: 'number', example: 55.0 },
                  powerConsumption: { type: 'number', example: 280 },
                  isOnline: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Veri alındı' }, 401: { description: 'Geçersiz agent key' } },
      },
    },
    '/monitoring/{assetId}/current': {
      get: { tags: ['Monitoring'], summary: 'Asset\'in son monitoring verisi',
        parameters: [{ name: 'assetId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'MonitoringData objesi' } },
      },
    },
    '/monitoring/{assetId}/history': {
      get: { tags: ['Monitoring'], summary: 'Asset monitoring geçmişi',
        parameters: [
          { name: 'assetId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'hours', in: 'query', schema: { type: 'integer', default: 24 } },
        ],
        responses: { 200: { description: 'MonitoringData[]' } },
      },
    },

    // ── Alerts ──────────────────────────────────────────────────
    '/alerts': {
      get: { tags: ['Alerts'], summary: 'Alert listesi',
        parameters: [
          { name: 'resolved', in: 'query', schema: { type: 'boolean' } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['Critical', 'Warning', 'Info'] } },
        ],
        responses: { 200: { description: 'Alert[]' } },
      },
      post: { tags: ['Alerts'], summary: 'Manuel alert oluştur',
        responses: { 201: { description: 'Oluşturuldu' } },
      },
    },
    '/alerts/dashboard': {
      get: { tags: ['Alerts'], summary: 'Dashboard için aktif alert özeti',
        responses: { 200: { description: 'Alert[] (çözülmemiş)' } } },
    },
    '/alerts/{id}/resolve': {
      put: { tags: ['Alerts'], summary: 'Alert\'i çözüldü olarak işaretle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Güncellendi' } },
      },
    },
    '/alerts/bulk-resolve': {
      post: { tags: ['Alerts'], summary: 'Toplu alert çözme',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'integer' } } } } } } },
        responses: { 200: { description: 'Güncellendi' } },
      },
    },

    // ── Licenses ────────────────────────────────────────────────
    '/licenses': {
      get: { tags: ['Licenses'], summary: 'Lisans listesi',
        responses: { 200: { description: 'License[]' } } },
      post: { tags: ['Licenses'], summary: 'Yeni lisans ekle (Technician+)',
        responses: { 201: { description: 'Oluşturuldu' } } },
    },
    '/license-requests': {
      get: { tags: ['Licenses'], summary: 'Lisans talepleri listesi',
        responses: { 200: { description: 'LicenseRequest[]' } } },
      post: { tags: ['Licenses'], summary: 'Yeni lisans talebi oluştur',
        responses: { 201: { description: 'Talep oluşturuldu' } } },
    },
    '/license-requests/{id}/review': {
      patch: { tags: ['Licenses'], summary: 'Lisans talebini onayla/reddet (Manager+)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['Approved', 'Rejected'] }, reviewNote: { type: 'string' } } } } } },
        responses: { 200: { description: 'Güncellendi' } },
      },
    },

    // ── Analytics ────────────────────────────────────────────────
    '/analytics/dashboard-kpi': {
      get: { tags: ['Analytics'], summary: 'Dashboard KPI istatistikleri',
        responses: { 200: { description: 'KPI objesi (asset sayıları, uptime, alert vb.)' } } },
    },
    '/analytics/power-consumption': {
      get: { tags: ['Analytics'], summary: 'Güç tüketimi zaman serisi',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', example: 'now-12h' } },
          { name: 'to', in: 'query', schema: { type: 'string', example: 'now' } },
          { name: 'groupBy', in: 'query', schema: { type: 'string', example: '3hour' } },
        ],
        responses: { 200: { description: 'Zaman serisi verisi' } },
      },
    },

    // ── Users ────────────────────────────────────────────────────
    '/users': {
      get: { tags: ['Users'], summary: 'Kullanıcı listesi (Admin)',
        responses: { 200: { description: 'User[]' } } },
      post: { tags: ['Users'], summary: 'Yeni kullanıcı oluştur (Admin)',
        responses: { 201: { description: 'Oluşturuldu' } } },
    },
    '/users/{id}/password': {
      put: { tags: ['Users'], summary: 'Şifre değiştir (kendi hesabı)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } } } } } },
        responses: { 200: { description: 'Şifre güncellendi' }, 400: { description: 'Mevcut şifre yanlış' } },
      },
    },
    '/users/{id}/reset-password': {
      post: { tags: ['Users'], summary: 'Admin: kullanıcı şifresini sıfırla',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Yeni geçici şifre döner' } },
      },
    },

    // ── Hierarchy ────────────────────────────────────────────────
    '/hierarchy': {
      get: { tags: ['Hierarchy'], summary: 'Fiziksel varlık ağacı (Holding > Kanal > Bina > Oda > Cihaz)',
        responses: { 200: { description: 'PhysicalNode[]' } } },
    },

    // ── Reports ──────────────────────────────────────────────────
    '/reports': {
      get: { tags: ['Reports'], summary: 'Rapor listesi',
        responses: { 200: { description: 'Report[]' } } },
      post: { tags: ['Reports'], summary: 'Yeni rapor oluştur (Manager+)',
        responses: { 201: { description: 'Oluşturuldu' } } },
    },

    // ── Logs ─────────────────────────────────────────────────────
    '/logs/activity': {
      get: { tags: ['Logs'], summary: 'Aktivite log\'ları (Admin)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { 200: { description: 'ActivityLog[]' } },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Kimlik doğrulama' },
    { name: 'Assets', description: 'Varlık (ekipman) yönetimi' },
    { name: 'Monitoring', description: 'Gerçek zamanlı cihaz izleme' },
    { name: 'Alerts', description: 'Uyarı ve alarm yönetimi' },
    { name: 'Licenses', description: 'Lisans ve lisans talepleri' },
    { name: 'Analytics', description: 'İstatistik ve raporlama' },
    { name: 'Users', description: 'Kullanıcı yönetimi' },
    { name: 'Hierarchy', description: 'Fiziksel varlık ağacı' },
    { name: 'Reports', description: 'Raporlar' },
    { name: 'Logs', description: 'Aktivite logları' },
  ],
};

module.exports = swaggerSpec;
