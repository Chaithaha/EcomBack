const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Helper function to print colored output
function print(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to print section headers
function printSection(title) {
  print('cyan', `\n${colors.bright}=== ${title} ===${colors.reset}`);
}

// Check if server environment variables are set
function checkServerEnvVariables() {
  printSection('Server Environment Variables Check');
  
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = [];
  const presentVars = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== '' && value !== 'your_supabase_project_url' && value !== 'your_supabase_api_key') {
      presentVars.push(varName);
      print('green', `✓ ${varName}: ***SET***`);
    } else {
      missingVars.push(varName);
      print('red', `✗ ${varName}: NOT SET or using placeholder value`);
    }
  });
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    print('green', `✓ .env file exists at: ${envPath}`);
  } else {
    print('red', `✗ .env file not found at: ${envPath}`);
  }
  
  return { missingVars, presentVars };
}

// Check if client environment variables are set
function checkClientEnvVariables() {
  printSection('Client Environment Variables Check');
  
  const clientEnvPath = path.join(__dirname, '..', 'client', '.env');
  const clientEnvExamplePath = path.join(__dirname, '..', 'client', '.env.example');
  
  // Check if client .env file exists
  if (fs.existsSync(clientEnvPath)) {
    print('green', `✓ Client .env file exists at: ${clientEnvPath}`);
    
    // Read client .env file
    const clientEnvContent = fs.readFileSync(clientEnvPath, 'utf8');
    const clientRequiredVars = ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_KEY'];
    const clientMissingVars = [];
    
    clientRequiredVars.forEach(varName => {
      const regex = new RegExp(`^${varName}=(.+)$`, 'm');
      const match = clientEnvContent.match(regex);
      
      if (match && match[1] && 
          match[1] !== '' && 
          match[1] !== 'https://your-project-ref.supabase.co' && 
          !match[1].includes('your-long-jwt-token')) {
        print('green', `✓ ${varName}: ***SET***`);
      } else {
        clientMissingVars.push(varName);
        print('red', `✗ ${varName}: NOT SET or using placeholder value`);
      }
    });
    
    return { clientMissingVars };
  } else {
    print('red', `✗ Client .env file not found at: ${clientEnvPath}`);
    
    if (fs.existsSync(clientEnvExamplePath)) {
      print('yellow', `✓ Client .env.example exists at: ${clientEnvExamplePath}`);
      print('yellow', '  You can create a .env file by copying .env.example and filling in your values:');
      print('cyan', '    cp client/.env.example client/.env');
    }
    
    return { clientMissingVars: ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_KEY'] };
  }
}

// Verify server Supabase client configuration
function verifyServerSupabaseConfig() {
  printSection('Server Supabase Configuration Verification');
  
  try {
    const { getSupabaseClient, getSupabaseServiceClient } = require('../utils/supabase');
    
    // Test regular client
    print('blue', 'Testing regular Supabase client...');
    try {
      const client = getSupabaseClient();
      print('green', '✓ Regular Supabase client created successfully');
    } catch (error) {
      print('red', `✗ Failed to create regular Supabase client: ${error.message}`);
      return false;
    }
    
    // Test service client
    print('blue', 'Testing service role Supabase client...');
    try {
      const serviceClient = getSupabaseServiceClient();
      print('green', '✓ Service role Supabase client created successfully');
    } catch (error) {
      print('red', `✗ Failed to create service role Supabase client: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    print('red', `✗ Error loading Supabase utility: ${error.message}`);
    return false;
  }
}

// Test Supabase connection
async function testSupabaseConnection() {
  printSection('Supabase Connection Test');
  
  try {
    const { getSupabaseClient, getSupabaseServiceClient } = require('../utils/supabase');
    const client = getSupabaseClient();
    
    print('blue', 'Testing basic connection to Supabase...');
    
    // Try to fetch the schema information
    const { data, error } = await client.from('pg_catalog.pg_tables').select('tablename').limit(1);
    
    if (error) {
      print('red', `✗ Connection test failed: ${error.message}`);
      print('yellow', '  This could be due to:');
      print('yellow', '  1. Incorrect SUPABASE_URL');
      print('yellow', '  2. Invalid SUPABASE_KEY');
      print('yellow', '  3. Network connectivity issues');
      print('yellow', '  4. Supabase service downtime');
      return false;
    }
    
    print('green', '✓ Successfully connected to Supabase');
    
    // Test service role connection
    print('blue', 'Testing service role connection...');
    const serviceClient = getSupabaseServiceClient();
    const { data: serviceData, error: serviceError } = await serviceClient.from('pg_catalog.pg_tables').select('tablename').limit(1);
    
    if (serviceError) {
      print('red', `✗ Service role connection test failed: ${serviceError.message}`);
      return false;
    }
    
    print('green', '✓ Service role connection successful');
    return true;
  } catch (error) {
    print('red', `✗ Connection test error: ${error.message}`);
    return false;
  }
}

// Print setup instructions for missing variables
function printSetupInstructions(missingVars, clientMissingVars) {
  if (missingVars.length === 0 && clientMissingVars.length === 0) {
    print('green', '\nAll environment variables are properly configured!');
    return;
  }
  
  printSection('Setup Instructions');
  
  if (missingVars.length > 0) {
    print('yellow', 'Missing server environment variables:');
    print('cyan', `  Create or update the .env file in the server directory (${path.join(__dirname, '.env')})`);
    print('cyan', '  with the following variables:');
    
    missingVars.forEach(varName => {
      print('magenta', `    ${varName}=your_${varName.toLowerCase()}_value`);
    });
    
    print('cyan', '\n  To get these values:');
    print('cyan', '  1. Go to your Supabase project dashboard');
    print('cyan', '  2. Navigate to Settings > API');
    print('cyan', '  3. Copy the Project URL and API keys');
    print('cyan', '  4. The SUPABASE_KEY is your "anon" public key');
    print('cyan', '  5. The SUPABASE_SERVICE_ROLE_KEY is your "service_role" secret key');
  }
  
  if (clientMissingVars.length > 0) {
    print('yellow', '\nMissing client environment variables:');
    print('cyan', `  Create or update the .env file in the client directory (${path.join(__dirname, '..', 'client', '.env')})`);
    print('cyan', '  with the following variables:');
    
    clientMissingVars.forEach(varName => {
      print('magenta', `    ${varName}=your_${varName.toLowerCase().replace('react_app_', '')}_value`);
    });
    
    print('cyan', '\n  To get these values:');
    print('cyan', '  1. Go to your Supabase project dashboard');
    print('cyan', '  2. Navigate to Settings > API');
    print('cyan', '  3. Copy the Project URL and anon public key');
    print('cyan', '  4. Use the same URL for REACT_APP_SUPABASE_URL');
    print('cyan', '  5. Use the anon public key for REACT_APP_SUPABASE_KEY');
  }
  
  print('blue', '\nAfter setting up the environment variables:');
  print('cyan', '1. Restart your server: npm run dev (in server directory)');
  print('cyan', '2. Restart your client: npm start (in client directory)');
  print('cyan', '3. Run this verification script again to confirm everything is working');
}

// Create a test endpoint for Supabase verification
function createTestEndpoint() {
  printSection('Creating Test Endpoint');
  
  const testEndpointCode = `
// Add this to your server/index.js file

// Test endpoint for Supabase configuration verification
app.get('/api/verify-supabase', async (req, res) => {
  try {
    const { getSupabaseClient, getSupabaseServiceClient } = require('./utils/supabase');
    
    // Check environment variables
    const envStatus = {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
    };
    
    // Test regular client
    let clientStatus = 'FAILED';
    let clientError = null;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.from('pg_catalog.pg_tables').select('tablename').limit(1);
      if (error) throw error;
      clientStatus = 'SUCCESS';
    } catch (error) {
      clientError = error.message;
    }
    
    // Test service client
    let serviceClientStatus = 'FAILED';
    let serviceClientError = null;
    try {
      const serviceClient = getSupabaseServiceClient();
      const { data, error } = await serviceClient.from('pg_catalog.pg_tables').select('tablename').limit(1);
      if (error) throw error;
      serviceClientStatus = 'SUCCESS';
    } catch (error) {
      serviceClientError = error.message;
    }
    
    res.json({
      success: true,
      environment: envStatus,
      clientConnection: {
        status: clientStatus,
        error: clientError
      },
      serviceClientConnection: {
        status: serviceClientStatus,
        error: serviceClientError
      },
      overall: clientStatus === 'SUCCESS' && serviceClientStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
`;

  print('cyan', 'Add the following test endpoint to your server/index.js file:');
  print('blue', testEndpointCode);
  
  print('yellow', '\nAfter adding the endpoint, you can test it by visiting:');
  print('cyan', '  http://localhost:5000/api/verify-supabase');
}

// Main verification function
async function verifySupabaseConfig() {
  print('magenta', `${colors.bright}Supabase Configuration Verification Script${colors.reset}`);
  print('blue', 'This script checks your Supabase environment variables and configuration');
  print('blue', 'to ensure they are properly set up for both server and client.\n');
  
  // Check server environment variables
  const { missingVars, presentVars } = checkServerEnvVariables();
  
  // Check client environment variables
  const { clientMissingVars } = checkClientEnvVariables();
  
  // Verify server Supabase configuration
  const configValid = verifyServerSupabaseConfig();
  
  // Test connection if configuration is valid
  let connectionValid = false;
  if (configValid && missingVars.length === 0) {
    connectionValid = await testSupabaseConnection();
  }
  
  // Print summary
  printSection('Summary');
  
  const allVarsPresent = missingVars.length === 0 && clientMissingVars.length === 0;
  const allChecksPassed = allVarsPresent && configValid && connectionValid;
  
  if (allChecksPassed) {
    print('green', `${colors.bright}✓ All checks passed! Your Supabase configuration is correct.${colors.reset}`);
  } else {
    print('red', `${colors.bright}✗ Some checks failed. Please review the issues above.${colors.reset}`);
  }
  
  // Print setup instructions if needed
  printSetupInstructions(missingVars, clientMissingVars);
  
  // Create test endpoint
  createTestEndpoint();
  
  printSection('Next Steps');
  
  if (allChecksPassed) {
    print('green', 'Your Supabase configuration is working correctly!');
    print('cyan', 'If you are still experiencing RLS permission issues, they may be related to:');
    print('yellow', '  1. Row Level Security (RLS) policies in your Supabase project');
    print('yellow', '  2. User authentication and session management');
    print('yellow', '  3. Database permissions and roles');
    print('cyan', '\nConsider checking your RLS policies in the Supabase dashboard:');
    print('cyan', '  1. Go to Authentication > Policies');
    print('cyan', '  2. Review policies for tables involved in your operations');
    print('cyan', '  3. Ensure policies allow the operations you need');
  } else {
    print('yellow', 'Please fix the issues identified above and run this script again.');
  }
  
  return allChecksPassed;
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifySupabaseConfig().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification script error:', error);
    process.exit(1);
  });
}

module.exports = { verifySupabaseConfig };