const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

describe('Test 5: Server Logging Test', () => {
  let app;
  let testToken;
  let consoleLogSpy;

  beforeAll(async () => {
    // Load the server
    app = require('../index');
    
    // Generate a test token
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

    // Spy on console.log to capture server logs
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    console.errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    console.errorSpy.mockRestore();
  });

  test('5.1: Should capture environment variable loading logs', async () => {
    console.log('\n=== Testing Environment Variable Loading ===');
    
    // Make a simple request to trigger server startup logs
    await request(app)
      .get('/test')
      .expect(200);

    // Check if environment variables were logged
    const consoleCalls = consoleLogSpy.mock.calls;
    const envLogFound = consoleCalls.some(call => 
      call[0] && call[0].includes('SUPABASE_URL:')
    );

    console.log('Environment variable logging test:');
    console.log('- Environment variables logged:', envLogFound);
    console.log('- Console log calls:', consoleCalls.length);

    if (envLogFound) {
      console.log('✅ Environment variables are being logged during server startup');
    } else {
      console.log('❌ Environment variables are NOT being logged during server startup');
    }
  });

  test('5.2: Should capture authentication middleware logs', async () => {
    console.log('\n=== Testing Authentication Middleware Logging ===');
    
    // Test with no token
    await request(app)
      .get('/api/posts')
      .expect(401);

    // Test with invalid token
    await request(app)
      .get('/api/posts')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    // Test with valid token (mock)
    await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    // Check authentication logs
    const consoleCalls = consoleLogSpy.mock.calls;
    const authLogs = consoleCalls.filter(call => 
      call[0] && (
        call[0].includes('Auth middleware') ||
        call[0].includes('Authorization header') ||
        call[0].includes('Token verification') ||
        call[0].includes('Token length') ||
        call[0].includes('Token prefix')
      )
    );

    console.log('Authentication middleware logs found:', authLogs.length);
    authLogs.forEach((log, index) => {
      console.log(`Auth log ${index + 1}:`, log[0]);
    });

    if (authLogs.length > 0) {
      console.log('✅ Authentication middleware logs are being captured');
    } else {
      console.log('❌ Authentication middleware logs are NOT being captured');
    }
  });

  test('5.3: Should capture Supabase client creation logs', async () => {
    console.log('\n=== Testing Supabase Client Creation Logging ===');
    
    // Make a request that triggers Supabase client creation
    await request(app)
      .get('/api/posts')
      .expect(200);

    // Check Supabase client creation logs
    const consoleCalls = consoleLogSpy.mock.calls;
    const supabaseLogs = consoleCalls.filter(call => 
      call[0] && (
        call[0].includes('Supabase Client Creation Debug') ||
        call[0].includes('Supabase Service Client Creation Debug') ||
        call[0].includes('SUPABASE_URL:') ||
        call[0].includes('SUPABASE_KEY:') ||
        call[0].includes('SUPABASE_SERVICE_ROLE_KEY:')
      )
    );

    console.log('Supabase client creation logs found:', supabaseLogs.length);
    supabaseLogs.forEach((log, index) => {
      console.log(`Supabase log ${index + 1}:`, log[0]);
    });

    if (supabaseLogs.length > 0) {
      console.log('✅ Supabase client creation logs are being captured');
    } else {
      console.log('❌ Supabase client creation logs are NOT being captured');
    }
  });

  test('5.4: Should capture request/response logs', async () => {
    console.log('\n=== Testing Request/Response Logging ===');
    
    // Test various endpoints to capture logs
    const endpoints = [
      { method: 'get', path: '/test', expectedStatus: 200 },
      { method: 'get', path: '/api/posts', expectedStatus: 200 },
      { method: 'post', path: '/api/posts', expectedStatus: 401, data: { title: 'Test' } },
      { method: 'get', path: '/api/non-existent', expectedStatus: 404 }
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)[endpoint.method](endpoint.path)
        .send(endpoint.data || {})
        .expect(endpoint.expectedStatus);

      console.log(`${endpoint.method.toUpperCase()} ${endpoint.path} - Status: ${response.status}`);
    }

    // Check request/response logs
    const consoleCalls = consoleLogSpy.mock.calls;
    const requestLogs = consoleCalls.filter(call => 
      call[0] && (
        call[0].includes('Attempting to') ||
        call[0].includes('Successfully') ||
        call[0].includes('Error') ||
        call[0].includes('Server error') ||
        call[0].includes('Created post') ||
        call[0].includes('Fetching posts')
      )
    );

    console.log('Request/response logs found:', requestLogs.length);
    requestLogs.forEach((log, index) => {
      console.log(`Request log ${index + 1}:`, log[0]);
    });

    if (requestLogs.length > 0) {
      console.log('✅ Request/response logs are being captured');
    } else {
      console.log('❌ Request/response logs are NOT being captured');
    }
  });

  test('5.5: Should capture error logs', async () => {
    console.log('\n=== Testing Error Logging ===');
    
    // Test various error scenarios
    await request(app)
      .post('/api/posts')
      .send({}) // Missing required fields
      .expect(400);

    await request(app)
      .get('/api/posts/non-existent-id')
      .expect(404);

    await request(app)
      .post('/api/posts')
      .set('Authorization', 'Bearer invalid-token')
      .send({ title: 'Test', price: 10, category: 'test' })
      .expect(401);

    // Check error logs
    const consoleCalls = console.errorSpy.mock.calls;
    const errorLogs = consoleCalls.filter(call => 
      call[0] && (
        call[0].includes('Error') ||
        call[0].includes('Failed') ||
        call[0].includes('Invalid') ||
        call[0].includes('Token verification failed') ||
        call[0].includes('Supabase error')
      )
    );

    console.log('Error logs found:', errorLogs.length);
    errorLogs.forEach((log, index) => {
      console.log(`Error log ${index + 1}:`, log[0]);
    });

    if (errorLogs.length > 0) {
      console.log('✅ Error logs are being captured');
    } else {
      console.log('❌ Error logs are NOT being captured');
    }
  });

  test('5.6: Should capture detailed request information', async () => {
    console.log('\n=== Testing Detailed Request Logging ===');
    
    // Make a request with detailed headers
    await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${testToken}`)
      .set('User-Agent', 'Test-Agent')
      .set('X-Test-Header', 'test-value')
      .set('Content-Type', 'application/json')
      .expect(200);

    // Check for detailed request logs
    const consoleCalls = consoleLogSpy.mock.calls;
    const detailedLogs = consoleCalls.filter(call => 
      call[0] && (
        call[0].includes('Authorization header') ||
        call[0].includes('Token length') ||
        call[0].includes('Token prefix') ||
        call[0].includes('headers') ||
        call[0].includes('request')
      )
    );

    console.log('Detailed request logs found:', detailedLogs.length);
    detailedLogs.forEach((log, index) => {
      console.log(`Detailed log ${index + 1}:`, log[0]);
    });

    if (detailedLogs.length > 0) {
      console.log('✅ Detailed request information is being logged');
    } else {
      console.log('❌ Detailed request information is NOT being logged');
    }
  });

  test('5.7: Should analyze log patterns and identify issues', async () => {
    console.log('\n=== Log Pattern Analysis ===');
    
    // Make several requests to generate logs
    await request(app).get('/test').expect(200);
    await request(app).get('/api/posts').expect(200);
    await request(app).post('/api/posts').send({}).expect(400);
    await request(app).get('/api/non-existent').expect(404);

    // Analyze all console calls
    const allConsoleCalls = [...consoleLogSpy.mock.calls, ...consoleErrorSpy.mock.calls];
    
    const logAnalysis = {
      totalLogs: allConsoleCalls.length,
      authLogs: allConsoleCalls.filter(call => 
        call[0] && call[0].includes('Auth')
      ).length,
      supabaseLogs: allConsoleCalls.filter(call => 
        call[0] && call[0].includes('Supabase')
      ).length,
      errorLogs: allConsoleCalls.filter(call => 
        call[0] && call[0].includes('Error')
      ).length,
      requestLogs: allConsoleCalls.filter(call => 
        call[0] && (
          call[0].includes('GET') ||
          call[0].includes('POST') ||
          call[0].includes('PUT') ||
          call[0].includes('DELETE')
        )
      ).length
    };

    console.log('Log Analysis Results:');
    console.log('- Total logs:', logAnalysis.totalLogs);
    console.log('- Authentication logs:', logAnalysis.authLogs);
    console.log('- Supabase logs:', logAnalysis.supabaseLogs);
    console.log('- Error logs:', logAnalysis.errorLogs);
    console.log('- Request logs:', logAnalysis.requestLogs);

    // Provide recommendations based on log analysis
    console.log('\nRecommendations:');
    if (logAnalysis.authLogs === 0) {
      console.log('❌ No authentication logs found - check if auth middleware is properly configured');
    }
    if (logAnalysis.supabaseLogs === 0) {
      console.log('❌ No Supabase logs found - check if Supabase client is being created');
    }
    if (logAnalysis.errorLogs === 0) {
      console.log('⚠️  No error logs found - might indicate error handling is not working');
    }
    if (logAnalysis.requestLogs === 0) {
      console.log('❌ No request logs found - check if request logging is enabled');
    }

    // Check for specific error patterns that indicate the 400 Bad Request issue
    const badRequestLogs = allConsoleCalls.filter(call => 
      call[0] && (
        call[0].includes('400') ||
        call[0].includes('Bad Request') ||
        call[0].includes('Missing required fields') ||
        call[0].includes('Invalid token') ||
        call[0].includes('Token expired')
      )
    );

    if (badRequestLogs.length > 0) {
      console.log('\n🔍 400 Bad Request related logs found:');
      badRequestLogs.forEach((log, index) => {
        console.log(`  ${index + 1}.`, log[0]);
      });
    } else {
      console.log('\n🔍 No 400 Bad Request related logs found in current test runs');
    }
  });
});