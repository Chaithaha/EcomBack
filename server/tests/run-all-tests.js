#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const tests = [
  {
    name: 'Authentication Token Verification Test',
    file: 'test1-authentication-token.js',
    description: 'Tests authentication token verification, token format validation, and server-side token processing'
  },
  {
    name: 'CORS Configuration Test', 
    file: 'test2-cors-configuration.js',
    description: 'Tests server CORS configuration with different origins, preflight requests, and header handling'
  },
  {
    name: 'Environment Variable Validation Test',
    file: 'test3-environment-variables.js', 
    description: 'Compares client and server environment variables, validates Supabase configuration, and checks for consistency'
  },
  {
    name: 'API Endpoint Test',
    file: 'test4-api-endpoint.js',
    description: 'Tests the /api/posts endpoint directly with curl, with and without authentication tokens, and checks error responses'
  },
  {
    name: 'Server Logging Test',
    file: 'test5-server-logging.js',
    description: 'Adds enhanced logging to track requests, logs exact errors when 400 occurs, and includes request headers and body in logs'
  }
];

// Results storage
const results = [];
let testStartTime;

// Function to run a single test
function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`📁 File: ${test.file}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    
    // Run the test using Jest
    exec(`npx jest ${test.file} --verbose --testTimeout=30000`, (error, stdout, stderr) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        name: test.name,
        file: test.file,
        description: test.description,
        duration: duration,
        passed: !error,
        error: error ? error.message : null,
        stdout: stdout,
        stderr: stderr,
        timestamp: new Date().toISOString()
      };
      
      results.push(result);
      
      if (error) {
        console.log(`❌ ${test.name} FAILED (${duration}ms)`);
        console.log(`   Error: ${error.message}`);
        if (stderr) {
          console.log(`   Stderr: ${stderr}`);
        }
      } else {
        console.log(`✅ ${test.name} PASSED (${duration}ms)`);
      }
      
      resolve();
    });
  });
}

// Function to generate test report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(80));
  
  const passedTests = results.filter(r => r.passed);
  const failedTests = results.filter(r => !r.passed);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Passed: ${passedTests.length}`);
  console.log(`   Failed: ${failedTests.length}`);
  console.log(`   Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
  
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`\n${index + 1}. ${status} ${result.name}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   File: ${result.file}`);
    console.log(`   Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
    
    if (!result.passed) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Extract key information from test output
    const stdoutLines = result.stdout.split('\n');
    const relevantLines = stdoutLines.filter(line => 
      line.includes('✅') || 
      line.includes('❌') || 
      line.includes('🔍') ||
      line.includes('Recommendations:') ||
      line.includes('Error:') ||
      line.includes('Status:')
    );
    
    if (relevantLines.length > 0) {
      console.log(`   Key Findings:`);
      relevantLines.forEach(line => {
        if (line.trim()) {
          console.log(`      ${line.trim()}`);
        }
      });
    }
  });
  
  // Generate diagnosis recommendations
  console.log(`\n🔍 DIAGNOSIS RECOMMENDATIONS:`);
  
  if (failedTests.length === 0) {
    console.log('🎉 All tests passed! The 400 Bad Request issue might be intermittent or resolved.');
    console.log('   Consider running the tests again when the issue occurs.');
  } else {
    console.log('❌ Some tests failed. Here are the likely causes:');
    
    // Analyze failed tests for patterns
    const authFailures = failedTests.filter(t => t.file.includes('authentication'));
    const corsFailures = failedTests.filter(t => t.file.includes('cors'));
    const envFailures = failedTests.filter(t => t.file.includes('environment'));
    const apiFailures = failedTests.filter(t => t.file.includes('api'));
    const loggingFailures = failedTests.filter(t => t.file.includes('logging'));
    
    if (authFailures.length > 0) {
      console.log('\n🔐 AUTHENTICATION ISSUES DETECTED:');
      console.log('   - Token verification is failing');
      console.log('   - Check if Supabase JWT tokens are properly generated');
      console.log('   - Verify that the service role key is correctly configured');
      console.log('   - Ensure the client is sending valid Bearer tokens');
    }
    
    if (corsFailures.length > 0) {
      console.log('\n🌐 CORS ISSUES DETECTED:');
      console.log('   - Server is rejecting requests from the client origin');
      console.log('   - Check if CLIENT_URL environment variable matches the client URL');
      console.log('   - Verify that preflight requests are being handled correctly');
      console.log('   - Ensure proper CORS headers are being sent');
    }
    
    if (envFailures.length > 0) {
      console.log('\n🔧 ENVIRONMENT VARIABLE ISSUES DETECTED:');
      console.log('   - Environment variables are missing or inconsistent');
      console.log('   - Check if server and client Supabase URLs match');
      console.log('   - Verify that all required environment variables are set');
      console.log('   - Ensure API URLs are consistent between client and server');
    }
    
    if (apiFailures.length > 0) {
      console.log('\n📡 API ENDPOINT ISSUES DETECTED:');
      console.log('   - The /api/posts endpoint is returning 400 errors');
      console.log('   - Check if required fields are being sent in requests');
      console.log('   - Verify that the request body format is correct');
      console.log('   - Ensure authentication is properly configured for the endpoint');
    }
    
    if (loggingFailures.length > 0) {
      console.log('\n📝 LOGGING ISSUES DETECTED:');
      console.log('   - Server logging is not capturing the issue');
      console.log('   - Check if console logging is properly configured');
      console.log('   - Verify that error handling is working correctly');
      console.log('   - Ensure detailed request/response logging is enabled');
    }
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, `test-report-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Review the failed tests and their error messages');
  console.log('2. Check the specific recommendations for each failed test');
  console.log('3. Run individual tests for more detailed debugging');
  console.log('4. Check the server logs during test execution');
  console.log('5. Verify environment variables and configuration');
}

// Function to run curl tests separately
function runCurlTests() {
  console.log('\n🌐 Running curl-based API endpoint tests...');
  
  const curlTests = [
    {
      name: 'Test /api/posts without authentication',
      command: 'curl -X GET http://localhost:5000/api/posts -v'
    },
    {
      name: 'Test /api/posts with invalid token',
      command: 'curl -X GET http://localhost:5000/api/posts -H "Authorization: Bearer invalid-token" -v'
    },
    {
      name: 'Test /api/posts with valid token (mock)',
      command: 'curl -X GET http://localhost:5000/api/posts -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw" -v'
    },
    {
      name: 'Test /api/posts POST without authentication',
      command: 'curl -X POST http://localhost:5000/api/posts -H "Content-Type: application/json" -d \'{"title":"test","price":10,"category":"test"}\' -v'
    },
    {
      name: 'Test /api/posts POST with authentication',
      command: 'curl -X POST http://localhost:5000/api/posts -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrb3liZG9lbGxvbHl4cWprb2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQzNjcsImV4cCI6MjA3NTI4MDM2N30.T8S27COehsYT5v2GrqJNQe5HKL2dvjqIHUEhwWZLUtw" -d \'{"title":"test","price":10,"category":"test"}\' -v'
    },
    {
      name: 'Test CORS preflight request',
      command: 'curl -X OPTIONS http://localhost:5000/api/posts -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization" -v'
    }
  ];
  
  curlTests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Command: ${test.command}`);
    
    exec(test.command, (error, stdout, stderr) => {
      console.log(`   Status: ${error ? 'FAILED' : 'SUCCESS'}`);
      if (error) {
        console.log(`   Error: ${error.message}`);
      }
      
      // Extract HTTP status code from output
      const statusMatch = stdout.match(/HTTP\/\d\.\d (\d{3})/);
      if (statusMatch) {
        const statusCode = statusMatch[1];
        console.log(`   HTTP Status: ${statusCode}`);
        
        if (statusCode === '400') {
          console.log('   🔍 400 Bad Request detected! This is the issue we\'re debugging.');
        }
      }
      
      console.log('   Output:', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));
    });
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive debugging tests for 400 Bad Request error');
  console.log('🎯 Target: http://localhost:5000/api/posts');
  console.log('⏰ Test started at:', new Date().toISOString());
  
  testStartTime = Date.now();
  
  try {
    // Run all Jest tests
    for (const test of tests) {
      await runTest(test);
    }
    
    // Run curl tests
    await runCurlTests();
    
    // Generate final report
    generateReport();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Tests interrupted by user');
  generateReport();
  process.exit(0);
});

// Run the main function
main();