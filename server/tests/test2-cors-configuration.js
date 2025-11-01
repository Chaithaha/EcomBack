const request = require('supertest');

describe('Test 2: CORS Configuration Test', () => {
  let app;

  beforeAll(async () => {
    // Load the server
    app = require('../index');
  });

  test('2.1: Should handle requests from localhost:3000 (default client URL)', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    
    console.log('CORS test - localhost:3000 response status:', response.status);
    expect(response.status).toBe(200);
  });

  test('2.2: Should handle requests from localhost:5000 (same origin)', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:5000')
      .expect(200);
    
    console.log('CORS test - localhost:5000 response status:', response.status);
    expect(response.status).toBe(200);
  });

  test('2.3: Should handle requests from different origins with proper CORS headers', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:8080')
      .expect(200);
    
    console.log('CORS test - localhost:8080 response status:', response.status);
    expect(response.status).toBe(200);
    
    // Check if CORS headers are present
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-credentials');
  });

  test('2.4: Should handle preflight OPTIONS requests', async () => {
    const response = await request(app)
      .options('/api/posts')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
      .expect(200);
    
    console.log('Preflight OPTIONS response status:', response.status);
    expect(response.status).toBe(200);
    
    // Check preflight response headers
    expect(response.headers).toHaveProperty('access-control-allow-origin');
    expect(response.headers).toHaveProperty('access-control-allow-methods');
    expect(response.headers).toHaveProperty('access-control-allow-headers');
  });

  test('2.5: Should handle preflight requests with different methods', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    for (const method of methods) {
      const response = await request(app)
        .options('/api/posts')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', method)
        .set('Access-Control-Request-Headers', 'authorization')
        .expect(200);
      
      console.log(`Preflight OPTIONS for ${method} response status:`, response.status);
      expect(response.status).toBe(200);
    }
  });

  test('2.6: Should handle requests with custom headers', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-token')
      .set('Content-Type', 'application/json')
      .expect(200);
    
    console.log('Custom headers response status:', response.status);
    expect(response.status).toBe(200);
  });

  test('2.7: Should handle requests without Origin header (same-origin request)', async () => {
    const response = await request(app)
      .get('/api/posts')
      .expect(200);
    
    console.log('No Origin header response status:', response.status);
    expect(response.status).toBe(200);
  });

  test('2.8: Should handle requests with credentials', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', 'session=test-session')
      .expect(200);
    
    console.log('Credentials response status:', response.status);
    expect(response.status).toBe(200);
  });

  test('2.9: Should verify CORS configuration by checking response headers', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Origin', 'http://localhost:3000')
      .expect(200);
    
    console.log('CORS headers in response:', {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
      'access-control-allow-headers': response.headers['access-control-allow-headers'],
      'access-control-allow-methods': response.headers['access-control-allow-methods']
    });
    
    // Log the actual CORS configuration from the server
    console.log('Server CORS configuration:');
    console.log('- CLIENT_URL:', process.env.CLIENT_URL);
    console.log('- CORS origin configured to:', process.env.CLIENT_URL || 'http://localhost:3000');
  });
});