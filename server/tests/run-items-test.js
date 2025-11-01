const { spawn } = require('child_process');
const axios = require('axios');
require('dotenv').config();

async function runItemsTest() {
  console.log('🚀 Starting Items API Test with Server Management\n');
  
  // Start server in background
  console.log('1. Starting server...');
  const serverProcess = spawn('node', ['index.js'], {
    stdio: 'pipe',
    cwd: __dirname
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check if server is running
  console.log('2. Checking server connectivity...');
  try {
    const testResponse = await axios.get('http://localhost:5000/test');
    console.log('✅ Server is running:', testResponse.data.message);
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    serverProcess.kill();
    return;
  }
  
  // Run authentication tests
  console.log('\n3. Running authentication tests...');
  try {
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin@123'
    });
    
    if (adminLogin.data.success && adminLogin.data.data.token) {
      console.log('✅ Admin login successful');
      console.log('   User:', adminLogin.data.data.user.email);
      console.log('   Role:', adminLogin.data.data.user.role);
      
      // Test items endpoint
      console.log('\n4. Testing items endpoint...');
      const itemsResponse = await axios.get('http://localhost:5000/api/items', {
        headers: {
          'Authorization': `Bearer ${adminLogin.data.data.token}`
        }
      });
      
      console.log('✅ Items endpoint working');
      console.log('   Items found:', itemsResponse.data.length || itemsResponse.data.data?.length || 0);
      
      // Test item creation
      console.log('\n5. Testing item creation...');
      const createResponse = await axios.post('http://localhost:5000/api/items', {
        title: 'Test Item from Run Test',
        description: 'This is a test item',
        price: 99.99,
        category: 'electronics'
      }, {
        headers: {
          'Authorization': `Bearer ${adminLogin.data.data.token}`
        }
      });
      
      if (createResponse.data.data) {
        console.log('✅ Item creation successful');
        console.log('   Item ID:', createResponse.data.data.id);
        console.log('   Status:', createResponse.data.data.status);
      } else {
        console.log('❌ Item creation failed');
        console.log('   Error:', createResponse.data.error);
      }
      
    } else {
      console.log('❌ Admin login failed');
      console.log('   Error:', adminLogin.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
  
  // Clean up
  console.log('\n6. Cleaning up...');
  serverProcess.kill();
  console.log('✅ Test completed');
}

// Run the test
runItemsTest().catch(console.error);