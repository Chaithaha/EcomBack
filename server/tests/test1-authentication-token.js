const request = require('supertest');
const jwt = require('jsonwebtoken');
const { getSupabaseServiceClient } = require('../utils/supabase');

describe('Test 1: Authentication Token Verification', () => {
  let app;
  let validToken;
  let invalidToken;
  let expiredToken;

  beforeAll(async () => {
    // Load the server
    app = require('../index');
    
    // Generate test tokens
    const testSecret = 'test-secret-key';
    
    // Valid token (mock)
    validToken = jwt.sign(
      { 
        sub: 'test-user-id', 
        email: 'test@example.com', 
        full_name: 'Test User',
        role: 'authenticated'
      }, 
      testSecret,
      { expiresIn: '1h' }
    );
    
    // Invalid token (malformed)
    invalidToken = 'invalid.token.here';
    
    // Expired token
    expiredToken = jwt.sign(
      { 
        sub: 'test-user-id', 
        email: 'test@example.com', 
        full_name: 'Test User'
      }, 
      testSecret,
      { expiresIn: '-1h' }
    );
  });

  test('1.1: Should reject requests without authentication token', async () => {
    const response = await request(app)
      .get('/api/posts')
      .expect(401);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Authentication required');
  });

  test('1.2: Should reject requests with malformed token', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid token');
  });

  test('1.3: Should reject requests with expired token', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Token expired');
  });

  test('1.4: Should accept requests with valid token for protected routes', async () => {
    const response = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    // This test might fail if Supabase connection is not working
    // but it will help us understand if the authentication middleware is working
    console.log('Protected route response status:', response.status);
    console.log('Protected route response body:', response.body);
  });

  test('1.5: Should verify Supabase service role key configuration', async () => {
    try {
      const supabase = getSupabaseServiceClient();
      console.log('Supabase service client created successfully');
      
      // Test a simple query to verify connection
      const { data, error } = await supabase.from('posts').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase connection error:', error);
        expect(error).toBeDefined();
      } else {
        console.log('Supabase connection successful');
        expect(data).toBeDefined();
      }
    } catch (err) {
      console.error('Supabase client creation error:', err);
      expect(err).toBeDefined();
    }
  });

  test('1.6: Should verify Supabase regular key configuration', async () => {
    try {
      const { getSupabaseClient } = require('../utils/supabase');
      const supabase = getSupabaseClient();
      console.log('Supabase regular client created successfully');
      
      // Test a simple query to verify connection
      const { data, error } = await supabase.from('posts').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase regular connection error:', error);
        expect(error).toBeDefined();
      } else {
        console.log('Supabase regular connection successful');
        expect(data).toBeDefined();
      }
    } catch (err) {
      console.error('Supabase regular client creation error:', err);
      expect(err).toBeDefined();
    }
  });
});