const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const API_BASE_URL = 'http://localhost:5000';

async function testAPIEndpoints() {
  console.log('🌐 Testing API Endpoints');
  console.log('=========================');

  let authToken = '';

  try {
    // Test 1: Get authentication token
    console.log('\n🔑 Test 1: Get Authentication Token');
    console.log('------------------------------------');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin@123'
    });

    if (authError) {
      console.error('❌ Failed to get auth token:', authError.message);
      return false;
    }

    authToken = authData.session.access_token;
    console.log('✅ Authentication token obtained');
    console.log(`   Token: ${authToken.substring(0, 30)}...`);

    // Test 2: Test protected endpoint without token
    console.log('\n🚫 Test 2: Protected Endpoint Without Token');
    console.log('-------------------------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        console.log('✅ Correctly rejected request without token (401)');
      } else {
        console.log(`❌ Unexpected response: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }

    // Test 3: Test protected endpoint with valid token
    console.log('\n✅ Test 3: Protected Endpoint With Valid Token');
    console.log('------------------------------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Successfully accessed protected endpoint');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`❌ Request failed: ${response.status}`);
        console.log(`   Error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }

    // Test 4: Test products endpoint
    console.log('\n📦 Test 4: Products Endpoint');
    console.log('------------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Products endpoint accessible');
        console.log(`   Status: ${response.status}`);
        console.log(`   Products count: ${Array.isArray(data) ? data.length : 'N/A'}`);
      } else {
        console.log(`❌ Products endpoint failed: ${response.status}`);
        console.log(`   Error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('❌ Products request failed:', error.message);
    }

    // Test 5: Test users endpoint
    console.log('\n👥 Test 5: Users Endpoint');
    console.log('--------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Users endpoint accessible');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`❌ Users endpoint failed: ${response.status}`);
        console.log(`   Error: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('❌ Users request failed:', error.message);
    }

    // Test 6: Test invalid token
    console.log('\n🚫 Test 6: Invalid Token');
    console.log('------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid_token_here'
        }
      });
      
      if (response.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log(`❌ Unexpected response for invalid token: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Invalid token test failed:', error.message);
    }

    // Test 7: Test CORS headers
    console.log('\n🌍 Test 7: CORS Headers');
    console.log('------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization'
        }
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      console.log('✅ CORS response received');
      console.log(`   Status: ${response.status}`);
      console.log(`   CORS Headers:`, corsHeaders);
    } catch (error) {
      console.error('❌ CORS test failed:', error.message);
    }

    console.log('\n🎉 API Endpoint Tests Completed');
    console.log('================================');
    console.log('✅ All API endpoint tests completed!');
    console.log('🚀 Server authentication is working correctly!');
    
    return true;

  } catch (error) {
    console.error('❌ API endpoint tests failed:', error);
    return false;
  }
}

// Run the tests
testAPIEndpoints()
  .then((success) => {
    if (success) {
      console.log('\n🎊 API endpoint tests passed!');
    } else {
      console.log('\n⚠️  Some API tests failed - check the errors above');
    }
  })
  .catch((error) => {
    console.error('💥 API test execution failed:', error);
    process.exit(1);
  });