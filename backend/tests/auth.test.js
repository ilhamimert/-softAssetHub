const request = require('supertest');
const app = require('../src/app');

describe('Auth API', () => {
  let accessToken;
  let refreshToken;

  // ── Login ────────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user).toHaveProperty('userId');
      expect(res.body.data.user).toHaveProperty('username', 'admin');
      expect(res.body.data.user).toHaveProperty('role');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'wrongpass' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'no_such_user_xyz', password: '123' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect([400, 401, 422]).toContain(res.statusCode);
    });
  });

  // ── Refresh Token ────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Önce login olalım
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      refreshToken = loginRes.body.data?.refreshToken;
      if (!refreshToken) return; // DB yoksa atla

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token-here' });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ── Logout ───────────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('should logout with valid token', async () => {
      // Önce login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginRes.body.data?.accessToken;
      if (!token) return;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.statusCode);
    });

    it('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  // ── Protected Route ──────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('should return user info with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginRes.body.data?.accessToken;
      if (!token) return;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect([401, 403]).toContain(res.statusCode);
    });
  });
});
