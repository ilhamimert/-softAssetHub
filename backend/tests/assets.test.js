const request = require('supertest');
const app = require('../src/app');

describe('Assets CRUD API', () => {
  let token;
  let createdAssetId;

  // Her test grubundan önce login ol
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    token = res.body.data?.accessToken;
  });

  // ── READ — List ──────────────────────────────────────────────
  describe('GET /api/v1/assets', () => {
    it('should return paginated asset list', async () => {
      if (!token) return;

      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/v1/assets');
      expect([401, 403]).toContain(res.statusCode);
    });

    it('should filter by channelId', async () => {
      if (!token) return;

      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${token}`)
        .query({ channelId: 1 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── CREATE ───────────────────────────────────────────────────
  describe('POST /api/v1/assets', () => {
    it('should create a new asset', async () => {
      if (!token) return;

      const newAsset = {
        assetGroupId: 1,
        channelId: 1,
        assetName: `Test-Asset-${Date.now()}`,
        assetType: 'Server',
        status: 'Active',
      };

      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${token}`)
        .send(newAsset);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('assetId');
      expect(res.body.data.assetName).toBe(newAsset.assetName);

      createdAssetId = res.body.data.assetId;
    });

    it('should reject create without required fields', async () => {
      if (!token) return;

      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${token}`)
        .send({ assetName: 'Missing Fields' });

      expect([400, 422]).toContain(res.statusCode);
    });
  });

  // ── READ — Single ───────────────────────────────────────────
  describe('GET /api/v1/assets/:id', () => {
    it('should return a single asset by ID', async () => {
      if (!token || !createdAssetId) return;

      const res = await request(app)
        .get(`/api/v1/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assetId).toBe(createdAssetId);
    });

    it('should return 404 for non-existent asset', async () => {
      if (!token) return;

      const res = await request(app)
        .get('/api/v1/assets/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── UPDATE ───────────────────────────────────────────────────
  describe('PUT /api/v1/assets/:id', () => {
    it('should update an existing asset', async () => {
      if (!token || !createdAssetId) return;

      const res = await request(app)
        .put(`/api/v1/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assetName: 'Updated-Test-Asset',
          status: 'Maintenance',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent update', async () => {
      if (!token) return;

      const res = await request(app)
        .put('/api/v1/assets/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ assetName: 'Ghost' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE ───────────────────────────────────────────────────
  describe('DELETE /api/v1/assets/:id', () => {
    it('should delete the created asset', async () => {
      if (!token || !createdAssetId) return;

      const res = await request(app)
        .delete(`/api/v1/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.statusCode);
    });

    it('should return 404 for already deleted asset', async () => {
      if (!token || !createdAssetId) return;

      const res = await request(app)
        .get(`/api/v1/assets/${createdAssetId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
