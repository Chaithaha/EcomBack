const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Test 4: API Endpoint Test', () => {
  let app;
  let testToken;

  beforeAll(async () => {
    // Load the server
    app = require('../index');
    
    // Generate a test token for authenticated requests
    testToken = jwt.sign(
      { 
        sub: 'test-user-id', 
        email: 'test@example.com', 
        full_name: 'Test User',
        role: 'authenticated'
      }, 
      'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/posts', () => {
    test('4.1: Should return 200 without authentication (optional auth)', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);
      
      console.log('GET /api/posts (no auth) - Status:', response.status);
      console.log('GET /api/posts (no auth) - Response:', response.body);
      
      expect(response.status).toBe(200);
    });

    test('4.2: Should return 200 with authentication', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);
      
      console.log('GET /api/posts (with auth) - Status:', response.status);
      console.log('GET /api/posts (with auth) - Response:', response.body);
      
      expect(response.status).toBe(200);
    });

    test('4.3: Should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', 'InvalidHeader')
        .expect(401);
      
      console.log('GET /api/posts (malformed header) - Status:', response.status);
      console.log('GET /api/posts (malformed header) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/posts', () => {
    test('4.4: Should reject POST without authentication', async () => {
      const postData = {
        title: 'Test Post',
        description: 'Test Description',
        price: 99.99,
        category: 'test'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);
      
      console.log('POST /api/posts (no auth) - Status:', response.status);
      console.log('POST /api/posts (no auth) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Authentication required');
    });

    test('4.5: Should reject POST with invalid authentication', async () => {
      const postData = {
        title: 'Test Post',
        description: 'Test Description',
        price: 99.99,
        category: 'test'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer invalid-token')
        .send(postData)
        .expect(401);
      
      console.log('POST /api/posts (invalid auth) - Status:', response.status);
      console.log('POST /api/posts (invalid auth) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
    });

    test('4.6: Should reject POST with missing required fields', async () => {
      const postData = {
        description: 'Test Description',
        price: 99.99
        // Missing title and category
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${testToken}`)
        .send(postData)
        .expect(400);
      
      console.log('POST /api/posts (missing fields) - Status:', response.status);
      console.log('POST /api/posts (missing fields) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });

    test('4.7: Should reject POST with invalid price', async () => {
      const postData = {
        title: 'Test Post',
        description: 'Test Description',
        price: 'invalid-price',
        category: 'test'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${testToken}`)
        .send(postData)
        .expect(400);
      
      console.log('POST /api/posts (invalid price) - Status:', response.status);
      console.log('POST /api/posts (invalid price) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Price must be a valid positive number');
    });

    test('4.8: Should accept POST with valid data', async () => {
      const postData = {
        title: 'Test Post',
        description: 'Test Description',
        price: 99.99,
        category: 'test'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${testToken}`)
        .send(postData)
        .expect(201);
      
      console.log('POST /api/posts (valid data) - Status:', response.status);
      console.log('POST /api/posts (valid data) - Response:', response.body);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Post');
      expect(response.body).toHaveProperty('price', 99.99);
      expect(response.body).toHaveProperty('category', 'test');
    });
  });

  describe('GET /api/posts/:id', () => {
    test('4.9: Should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/non-existent-id')
        .expect(404);
      
      console.log('GET /api/posts/:id (non-existent) - Status:', response.status);
      console.log('GET /api/posts/:id (non-existent) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Post not found');
    });
  });

  describe('PUT /api/posts/:id', () => {
    test('4.10: Should reject PUT without authentication', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/posts/test-id')
        .send(updateData)
        .expect(401);
      
      console.log('PUT /api/posts/:id (no auth) - Status:', response.status);
      console.log('PUT /api/posts/:id (no auth) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    test('4.11: Should reject DELETE without authentication', async () => {
      const response = await request(app)
        .delete('/api/posts/test-id')
        .expect(401);
      
      console.log('DELETE /api/posts/:id (no auth) - Status:', response.status);
      console.log('DELETE /api/posts/:id (no auth) - Response:', response.body);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Test server endpoints', () => {
    test('4.12: Should respond to /test endpoint', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      console.log('GET /test - Status:', response.status);
      console.log('GET /test - Response:', response.body);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Test endpoint working');
    });

    test('4.13: Should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);
      
      console.log('GET /api/non-existent-route - Status:', response.status);
      console.log('GET /api/non-existent-route - Response:', response.body);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });

  describe('CORS preflight tests', () => {
    test('4.14: Should handle OPTIONS preflight for /api/posts', async () => {
      const response = await request(app)
        .options('/api/posts')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(200);
      
      console.log('OPTIONS /api/posts - Status:', response.status);
      console.log('OPTIONS /api/posts - Headers:', {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers']
      });
      
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});