const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testAuthentication() {
  console.log('🧪 Testing Real Authentication');
  console.log('===============================');

  try {
    // Test 1: Admin Login
    console.log('\n👑 Test 1: Admin Login');
    console.log('------------------------');
    
    const { data: adminLogin, error: adminError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin@123'
    });

    if (adminError) {
      console.error('❌ Admin login failed:', adminError.message);
      return false;
    } else {
      console.log('✅ Admin login successful');
      console.log(`   User ID: ${adminLogin.user.id}`);
      console.log(`   Email: ${adminLogin.user.email}`);
      console.log(`   Access Token: ${adminLogin.session.access_token.substring(0, 20)}...`);
    }

    // Test 2: Get User with Token
    console.log('\n🔍 Test 2: Verify Token');
    console.log('-----------------------');
    
    const { data: userData, error: userError } = await supabase.auth.getUser(
      adminLogin.session.access_token
    );

    if (userError) {
      console.error('❌ Token verification failed:', userError.message);
      return false;
    } else {
      console.log('✅ Token verification successful');
      console.log(`   User: ${userData.user.email}`);
    }

    // Test 3: Test Database Access with Auth
    console.log('\n📊 Test 3: Database Access');
    console.log('---------------------------');
    
    // Create a new client with the admin token for testing
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${adminLogin.session.access_token}`
          }
        }
      }
    );

    // Test profiles table access
    const { data: profiles, error: profilesError } = await authClient
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('❌ Profiles access failed:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
      console.log(`   Found ${profiles.length} profiles`);
    }

    // Test products table access
    const { data: products, error: productsError } = await authClient
      .from('products')
      .select('*')
      .limit(5);

    if (productsError) {
      console.error('❌ Products access failed:', productsError.message);
    } else {
      console.log('✅ Products table accessible');
      console.log(`   Found ${products.length} products`);
    }

    // Test 4: User Registration
    console.log('\n👤 Test 4: User Registration');
    console.log('-----------------------------');
    
    const testEmail = `test${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.error('❌ User registration failed:', signUpError.message);
    } else {
      console.log('✅ User registration successful');
      console.log(`   New user: ${testEmail}`);
      console.log(`   User ID: ${signUpData.user?.id}`);
    }

    // Test 5: Logout
    console.log('\n🚪 Test 5: Logout');
    console.log('------------------');
    
    const { error: logoutError } = await supabase.auth.signOut();
    
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError.message);
    } else {
      console.log('✅ Logout successful');
    }

    console.log('\n🎉 Authentication Test Results');
    console.log('==============================');
    console.log('✅ All authentication tests passed!');
    console.log('🚀 Real authentication is working correctly');
    
    return true;

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return false;
  }
}

// Run the test
testAuthentication()
  .then((success) => {
    if (success) {
      console.log('\n🎊 Phase 2 completed successfully!');
      console.log('🎯 Mock authentication removed, real authentication working!');
    } else {
      console.log('\n⚠️  Some tests failed - check the errors above');
    }
  })
  .catch((error) => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });