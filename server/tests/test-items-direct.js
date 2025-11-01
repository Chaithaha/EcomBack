const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test admin login directly
async function testDirectAuth() {
  console.log('🚀 Testing Direct Authentication\n');
  
  try {
    // Test admin login
    console.log('1. Testing admin login...');
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin@123'
    });
    
    if (adminResponse.data.success) {
      console.log('✅ Admin login successful');
      console.log('   Token:', adminResponse.data.data.token ? 'Received' : 'Missing');
      console.log('   Role:', adminResponse.data.data.user.role);
      
      // Test items endpoint with token
      console.log('\n2. Testing items endpoint...');
      const itemsResponse = await axios.get(`${API_BASE}/items`, {
        headers: {
          'Authorization': `Bearer ${adminResponse.data.data.token}`
        }
      });
      
      console.log('✅ Items endpoint accessible');
      console.log('   Items found:', itemsResponse.data.length || itemsResponse.data.data?.length || 0);
      
      // Test item creation
      console.log('\n3. Testing item creation...');
      const createResponse = await axios.post(`${API_BASE}/items`, {
        title: 'Test Item from Direct Test',
        description: 'This is a test item',
        price: 99.99,
        category: 'electronics'
      }, {
        headers: {
          'Authorization': `Bearer ${adminResponse.data.data.token}`
        }
      });
      
      if (createResponse.data.data) {
        console.log('✅ Item created successfully');
        console.log('   Item ID:', createResponse.data.data.id);
        console.log('   Status:', createResponse.data.data.status);
      } else {
        console.log('❌ Item creation failed');
        console.log('   Error:', createResponse.data.error);
      }
      
    } else {
      console.log('❌ Admin login failed');
      console.log('   Error:', adminResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Please start the server with:');
      console.log('   cd server && node index.js');
    }
  }
}

// Run the test
testDirectAuth();