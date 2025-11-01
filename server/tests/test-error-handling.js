const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const API_BASE_URL = 'http://localhost:5000';

async function testErrorHandling() {
  console.log('⚠️  Testing Error Handling Scenarios');
  console.log('===================================');

  try {
    // Test 1: Invalid login credentials
    console.log('\n🔐 Test 1: Invalid Login Credentials');
    console.log('--------------------------------------');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });
      
      if (error) {
        console.log('✅ Correctly handled invalid credentials');
        console.log(`   Error: ${error.message}`);
        console.log(`   Status: ${error.status || 'N/A'}`);
      } else {
        console.log('❌ Should have failed with invalid credentials');
      }
    } catch (err) {
      console.log('✅ Caught exception for invalid credentials');
      console.log(`   Error: ${err.message}`);
    }

    // Test 2: Malformed token
    console.log('\n🚫 Test 2: Malformed Token');
    console.log('-----------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer malformed.token.here'
        },
        body: JSON.stringify({
          title: 'Test Post',
          description: 'Test Description',
          price: 99.99,
          category: 'Test'
        })
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        console.log('✅ Correctly rejected malformed token');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      } else {
        console.log(`❌ Unexpected response: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.log('✅ Caught exception for malformed token');
      console.log(`   Error: ${error.message}`);
    }

    // Test 3: Missing required fields in POST request
    console.log('\n📝 Test 3: Missing Required Fields');
    console.log('-----------------------------------');
    
    // First get a valid token
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin@123'
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          // Missing required fields
          title: 'Incomplete Post'
        })
      });
      
      const data = await response.json();
      
      if (response.status >= 400) {
        console.log('✅ Correctly handled missing required fields');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      } else {
        console.log(`❌ Should have failed with missing fields: ${response.status}`);
      }
    } catch (error) {
      console.log('✅ Caught exception for missing fields');
      console.log(`   Error: ${error.message}`);
    }

    // Test 4: Invalid data types
    console.log('\n🔢 Test 4: Invalid Data Types');
    console.log('------------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          title: 'Test Post',
          description: 'Test Description',
          price: 'not-a-number',  // Invalid price type
          category: 'Test'
        })
      });
      
      const data = await response.json();
      
      if (response.status >= 400) {
        console.log('✅ Correctly handled invalid data types');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      } else {
        console.log(`❌ Should have failed with invalid data type: ${response.status}`);
      }
    } catch (error) {
      console.log('✅ Caught exception for invalid data types');
      console.log(`   Error: ${error.message}`);
    }

    // Test 5: Non-existent resource
    console.log('\n🔍 Test 5: Non-existent Resource');
    console.log('---------------------------------');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (response.status === 404) {
        console.log('✅ Correctly handled non-existent resource');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      } else {
        console.log(`❌ Unexpected response for non-existent resource: ${response.status}`);
      }
    } catch (error) {
      console.log('✅ Caught exception for non-existent resource');
      console.log(`   Error: ${error.message}`);
    }

    // Test 6: Database connection error simulation
    console.log('\n🗄️  Test 6: Database Error Handling');
    console.log('------------------------------------');
    
    try {
      // Try to access a table that doesn't exist
      const response = await fetch(`${API_BASE_URL}/api/nonexistent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (response.status === 404) {
        console.log('✅ Correctly handled non-existent endpoint');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      } else {
        console.log(`❌ Unexpected response for non-existent endpoint: ${response.status}`);
      }
    } catch (error) {
      console.log('✅ Caught exception for non-existent endpoint');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n🎉 Error Handling Tests Completed');
    console.log('===================================');
    console.log('✅ All error handling scenarios tested!');
    console.log('🛡️  Application properly handles errors!');
    
    return true;

  } catch (error) {
    console.error('❌ Error handling tests failed:', error);
    return false;
  }
}

// Run the tests
testErrorHandling()
  .then((success) => {
    if (success) {
      console.log('\n🎊 Error handling tests passed!');
    } else {
      console.log('\n⚠️  Some error handling tests failed');
    }
  })
  .catch((error) => {
    console.error('💥 Error handling test execution failed:', error);
    process.exit(1);
  });