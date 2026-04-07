const request = require('supertest');
const app = require('../src/app');

describe('Monitoring API', () => {
  let token;
  const AGENT_SECRET = process.env.AGENT_SECRET || 'isoft-agent-secret-2024-xK9mP3qR';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    token = res.body.data?.accessToken;
  });

  // ── Heatmap ──────────────────────────────────────────────────
  describe('GET /api/v1/monitoring/heatmap', () => {
    it('should return heatmap data for all assets', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/v1/monitoring/heatmap')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/v1/monitoring/heatmap');
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ── Push Agent ───────────────────────────────────────────────
  describe('POST /api/v1/monitoring/:assetId', () => {
    it('should accept valid push data with agent key', async () => {
      const res = await request(app)
        .post('/api/v1/monitoring/1')
        .set('X-Agent-Key', AGENT_SECRET)
        .send({
          cpuUsage: 45.2,
          ramUsage: 62.8,
          diskUsage: 31.0,
          temperature: 55.0,
          powerConsumption: 280,
          isOnline: true,
        });

      // 200 veya 404 (asset yoksa) kabul edilebilir — 401 kabul edilmez
      expect([200, 201, 404]).toContain(res.statusCode);
    });

    it('should reject push without agent key', async () => {
      const res = await request(app)
        .post('/api/v1/monitoring/1')
        .send({ cpuUsage: 45.2, isOnline: true });

      expect([401, 403]).toContain(res.statusCode);
    });

    it('should reject push with wrong agent key', async () => {
      const res = await request(app)
        .post('/api/v1/monitoring/1')
        .set('X-Agent-Key', 'wrong-key-here')
        .send({ cpuUsage: 45.2, isOnline: true });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ── History ──────────────────────────────────────────────────
  describe('GET /api/v1/monitoring/:assetId/history', () => {
    it('should return monitoring history', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/v1/monitoring/1/history')
        .set('Authorization', `Bearer ${token}`)
        .query({ hours: 24 });

      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });
  });

  // ── Swagger Docs ─────────────────────────────────────────────
  describe('GET /api/docs', () => {
    it('should serve Swagger UI', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('swagger');
    });
  });
});
