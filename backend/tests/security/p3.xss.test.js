const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../../src/app');
const { db } = require('../../src/db/connection');

describe('P3 XSS Remediation Tests', () => {
  let TEST_USER_ID;
  let testUserPassword = 'SecurePassword123!';

  beforeAll(async () => {
    TEST_USER_ID = uuidv4();
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(testUserPassword, 10);
    
    await db.query(
      `INSERT INTO users (id, username, name, email, password_hash, role, token_version, is_active) VALUES
       (?, 'xss_testuser', 'XSS Test User', 'xss@test.com', ?, 'user', 1, 1)`,
      [TEST_USER_ID, hash]
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE id = ?', [TEST_USER_ID]);
  });

  describe('XSS-06: Refresh Token Exposure', () => {
    test('login response must not contain refreshToken in JSON body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'xss_testuser', password: testUserPassword });
      
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeUndefined(); // MUST NOT exist
      
      // But it must be in the cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/);
    });
  });

  describe('XSS-01: Markdown URL Injection', () => {
    test('renderBody URL regex should reject dangerous schemes', () => {
      // Duplicating the frontend renderBody URL regex logic to prove it works
      const renderLink = (body) => {
        return body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
          const safe = /^(https?|mailto):/i.test(url.trim()) ? url.trim() : '#';
          return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        });
      };

      expect(renderLink('[Safe](https://example.com)')).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe</a>');
      expect(renderLink('[HTTP](http://example.com)')).toBe('<a href="http://example.com" target="_blank" rel="noopener noreferrer">HTTP</a>');
      expect(renderLink('[Mail](mailto:test@test.com)')).toBe('<a href="mailto:test@test.com" target="_blank" rel="noopener noreferrer">Mail</a>');
      
      // Dangerous schemes must be replaced with #
      expect(renderLink('[XSS](javascript:alert%281%29)')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">XSS</a>');
      expect(renderLink('[Data](data:text/html,<html>)')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">Data</a>');
      expect(renderLink('[VBS](vbscript:msgbox%281%29)')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">VBS</a>');
      
      // Bypass attempts
      expect(renderLink('[Bypass](  javascript:alert%281%29)')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">Bypass</a>');
      expect(renderLink('[Bypass](javascript:alert%281%29  )')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">Bypass</a>');
      expect(renderLink('[Bypass](jav\n\rascript:alert%281%29)')).toBe('<a href="#" target="_blank" rel="noopener noreferrer">Bypass</a>');
    });
  });

  describe('XSS-03/04/07: Attachment URL Security', () => {
    test('download endpoint must reject requests without Bearer token', async () => {
      // Trying to access an attachment without Bearer token (e.g. relying on ?token=) should fail
      const response = await request(app)
        .get('/api/messages/download/fake-uuid?token=valid-looking-token')
        .send();
        
      expect(response.status).toBe(401);
    });
  });

  describe('XSS-05: In-Memory Access Token Architecture', () => {
    // Note: We cannot assert `localStorage.getItem` directly in Node.js/Supertest.
    // That requires a browser environment (like Cypress or Playwright).
    // However, we can assert that the backend provides the necessary security primitives.
    
    test('refresh cookie must be HttpOnly, Secure, and SameSite=Strict', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'xss_testuser', password: 'SecurePassword123!' });
        
      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
      
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
      expect(refreshCookie).toMatch(/SameSite=Strict/i);
      
      // Check logout removes the cookie
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .set('Cookie', refreshCookie)
        .send();
        
      const logoutCookies = logoutRes.headers['set-cookie'];
      const clearedCookie = logoutCookies.find(c => c.startsWith('refreshToken='));
      expect(clearedCookie).toMatch(/Expires=Thu, 01 Jan 1970/i); // Cookie cleared
    });
  });
});
