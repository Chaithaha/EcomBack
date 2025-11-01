const fs = require('fs');
const path = require('path');

describe('Test 3: Environment Variable Validation Test', () => {
  let serverEnv;
  let clientEnv;

  beforeAll(() => {
    // Read server environment variables
    try {
      serverEnv = require('dotenv').config({ path: path.join(__dirname, '../.env') });
      console.log('Server .env loaded successfully');
    } catch (err) {
      console.error('Error loading server .env:', err);
    }

    // Read client environment variables
    try {
      clientEnv = require('dotenv').config({ path: path.join(__dirname, '../../client/.env') });
      console.log('Client .env loaded successfully');
    } catch (err) {
      console.error('Error loading client .env:', err);
    }
  });

  test('3.1: Should validate server environment variables', () => {
    console.log('\n=== Server Environment Variables ===');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '***SET***' : '***NOT SET***');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : '***NOT SET***');
    console.log('PORT:', process.env.PORT);
    console.log('CLIENT_URL:', process.env.CLIENT_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Check required server variables
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_KEY).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    expect(process.env.PORT).toBeDefined();
    expect(process.env.CLIENT_URL).toBeDefined();
    expect(process.env.NODE_ENV).toBeDefined();

    // Validate URL format
    expect(process.env.SUPABASE_URL).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/);
    expect(process.env.CLIENT_URL).toMatch(/^https?:\/\/localhost:\d+$/);
  });

  test('3.2: Should validate client environment variables', () => {
    console.log('\n=== Client Environment Variables ===');
    console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('REACT_APP_SUPABASE_KEY:', process.env.REACT_APP_SUPABASE_KEY ? '***SET***' : '***NOT SET***');
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Check required client variables
    expect(process.env.REACT_APP_SUPABASE_URL).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_KEY).toBeDefined();
    expect(process.env.REACT_APP_API_URL).toBeDefined();
    expect(process.env.NODE_ENV).toBeDefined();

    // Validate URL format
    expect(process.env.REACT_APP_SUPABASE_URL).toMatch(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/);
    expect(process.env.REACT_APP_API_URL).toMatch(/^https?:\/\/localhost:\d+$/);
  });

  test('3.3: Should compare server and client Supabase configurations', () => {
    console.log('\n=== Supabase Configuration Comparison ===');
    console.log('Server SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('Client REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
    console.log('Server SUPABASE_KEY prefix:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 20) + '...' : 'None');
    console.log('Client REACT_APP_SUPABASE_KEY prefix:', process.env.REACT_APP_SUPABASE_KEY ? process.env.REACT_APP_SUPABASE_KEY.substring(0, 20) + '...' : 'None');

    // Check if URLs match
    if (process.env.SUPABASE_URL === process.env.REACT_APP_SUPABASE_URL) {
      console.log('✅ Supabase URLs match between server and client');
    } else {
      console.log('❌ Supabase URLs do NOT match between server and client');
      console.log('   Server:', process.env.SUPABASE_URL);
      console.log('   Client:', process.env.REACT_APP_SUPABASE_URL);
    }

    // Check if keys match (first 20 characters for comparison)
    if (process.env.SUPABASE_KEY && process.env.REACT_APP_SUPABASE_KEY) {
      const serverKeyPrefix = process.env.SUPABASE_KEY.substring(0, 20);
      const clientKeyPrefix = process.env.REACT_APP_SUPABASE_KEY.substring(0, 20);
      
      if (serverKeyPrefix === clientKeyPrefix) {
        console.log('✅ Supabase keys match between server and client');
      } else {
        console.log('❌ Supabase keys do NOT match between server and client');
        console.log('   Server prefix:', serverKeyPrefix + '...');
        console.log('   Client prefix:', clientKeyPrefix + '...');
      }
    } else {
      console.log('❌ One or both Supabase keys are missing');
    }
  });

  test('3.4: Should validate API URL consistency', () => {
    console.log('\n=== API URL Configuration ===');
    console.log('Server PORT:', process.env.PORT);
    console.log('Client REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('Expected API URL:', `http://localhost:${process.env.PORT}`);

    const expectedApiUrl = `http://localhost:${process.env.PORT}`;
    
    if (process.env.REACT_APP_API_URL === expectedApiUrl) {
      console.log('✅ Client API URL matches server configuration');
    } else {
      console.log('❌ Client API URL does NOT match server configuration');
      console.log('   Expected:', expectedApiUrl);
      console.log('   Actual:', process.env.REACT_APP_API_URL);
    }
  });

  test('3.5: Should validate CORS configuration', () => {
    console.log('\n=== CORS Configuration ===');
    console.log('Server CLIENT_URL:', process.env.CLIENT_URL);
    console.log('Client REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

    // Check if client URL is properly configured for CORS
    if (process.env.CLIENT_URL) {
      console.log('✅ Server has CLIENT_URL configured for CORS');
      console.log('   CORS origin set to:', process.env.CLIENT_URL);
    } else {
      console.log('❌ Server CLIENT_URL is not configured');
      console.log('   CORS will default to: http://localhost:3000');
    }
  });

  test('3.6: Should validate Supabase service role key', () => {
    console.log('\n=== Supabase Service Role Key ===');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : '***NOT SET***');

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('✅ Supabase service role key is configured');
      
      // Check if it's a valid JWT format
      const jwtRegex = /^[A-Za-z0-9-]+\.[A-Za-z0-9-]+\.[A-Za-z0-9-]+$/;
      if (jwtRegex.test(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
        console.log('✅ Service role key appears to be in valid JWT format');
      } else {
        console.log('❌ Service role key does not appear to be in valid JWT format');
      }
    } else {
      console.log('❌ Supabase service role key is NOT configured');
      console.log('   This will cause authentication middleware to fail');
    }
  });

  test('3.7: Should validate environment variable completeness', () => {
    console.log('\n=== Environment Variable Completeness Check ===');
    
    const requiredServerVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'PORT',
      'CLIENT_URL',
      'NODE_ENV'
    ];

    const requiredClientVars = [
      'REACT_APP_SUPABASE_URL',
      'REACT_APP_SUPABASE_KEY',
      'REACT_APP_API_URL',
      'NODE_ENV'
    ];

    let missingServerVars = [];
    let missingClientVars = [];

    requiredServerVars.forEach(varName => {
      if (!process.env[varName]) {
        missingServerVars.push(varName);
      }
    });

    requiredClientVars.forEach(varName => {
      if (!process.env[varName]) {
        missingClientVars.push(varName);
      }
    });

    if (missingServerVars.length === 0) {
      console.log('✅ All required server environment variables are set');
    } else {
      console.log('❌ Missing server environment variables:', missingServerVars);
    }

    if (missingClientVars.length === 0) {
      console.log('✅ All required client environment variables are set');
    } else {
      console.log('❌ Missing client environment variables:', missingClientVars);
    }

    expect(missingServerVars.length).toBe(0);
    expect(missingClientVars.length).toBe(0);
  });
});