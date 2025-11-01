const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAuthentication() {
  console.log('🚀 Testing Authentication System Fix\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const testResponse = await axios.get(`${BASE_URL}/test`);
    console.log('✅ Server is running:', testResponse.data.message);

    // Test 2: Test base API endpoint
    console.log('\n2. Testing base API endpoint...');
    const apiResponse = await axios.get(`${BASE_URL}/api`);
    console.log('✅ Base API endpoint working:', apiResponse.data.message);

    // Test 3: Test admin login
    console.log('\n3. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin@123'
    });
    console.log('✅ Admin login successful');
    console.log('   User:', loginResponse.data.data.user.email);
    console.log('   Role:', loginResponse.data.data.user.role);
    console.log('   Token received:', loginResponse.data.data.token ? 'Yes' : 'No');

    // Test 4: Test protected endpoint with token
    console.log('\n4. Testing protected endpoint with token...');
    const token = loginResponse.data.data.token;
    const itemsResponse = await axios.get(`${BASE_URL}/api/items`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Protected items endpoint accessible');
    console.log('   Items found:', itemsResponse.data.length || itemsResponse.data.data?.length || 0);

    // Test 5: Test user info endpoint
    console.log('\n5. Testing user info endpoint...');
    const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ User info endpoint working');
    console.log('   User:', userResponse.data.data.email);
    console.log('   Role:', userResponse.data.data.role);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Server connectivity');
    console.log('   ✅ Base API endpoint');
    console.log('   ✅ Admin login');
    console.log('   ✅ Protected endpoints');
    console.log('   ✅ User info endpoint');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Please start the server with:');
      console.log('   cd server && node index.js');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Route not found. Check if routes are properly configured.');
    } else if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check admin user credentials.');
    }
  }
}

// Run the test
testAuthentication();