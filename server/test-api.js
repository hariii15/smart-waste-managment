#!/usr/bin/env node

/**
 * Automated API Testing Script
 * Smart Waste Management System
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to make API calls
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data, success: response.ok };
  } catch (error) {
    return { status: 500, error: error.message, success: false };
  }
}

// Test function
async function runTest(testName, method, endpoint, expectedStatus = 200, body = null) {
  console.log(`Testing: ${testName}...`);
  testResults.total++;
  
  try {
    const result = await apiCall(method, endpoint, body);
    
    if (result.status === expectedStatus) {
      console.log(`✅ ${testName} - PASSED`);
      testResults.passed++;
      testResults.details.push({ test: testName, status: 'PASSED', response: result.data });
    } else {
      console.log(`❌ ${testName} - FAILED (Expected: ${expectedStatus}, Got: ${result.status})`);
      testResults.failed++;
      testResults.details.push({ test: testName, status: 'FAILED', expected: expectedStatus, actual: result.status });
    }
  } catch (error) {
    console.log(`❌ ${testName} - ERROR: ${error.message}`);
    testResults.failed++;
    testResults.details.push({ test: testName, status: 'ERROR', error: error.message });
  }
}

// Main testing function
async function runAllTests() {
  console.log('🚀 Starting API Tests for Smart Waste Management System\n');
  console.log('=' .repeat(60));
  
  // 1. Health Check
  console.log('\n📋 Health Check Tests');
  console.log('-'.repeat(30));
  await runTest('Server Health Check', 'GET', '/health');
  
  // 2. Bin Management Tests
  console.log('\n🗑️  Bin Management Tests');
  console.log('-'.repeat(30));
  
  // Test bin level update
  await runTest('Update Bin Level (Valid)', 'POST', '/api/bins/update-level', 200, {
    binID: 'BIN-001',
    fillLevel: 75,
    location: { latitude: 12.9716, longitude: 77.5946 }
  });
  
  // Test invalid fill level
  await runTest('Update Bin Level (Invalid)', 'POST', '/api/bins/update-level', 400, {
    binID: 'BIN-001',
    fillLevel: 150,
    location: { latitude: 12.9716, longitude: 77.5946 }
  });
  
  // Test missing fields
  await runTest('Update Bin Level (Missing Fields)', 'POST', '/api/bins/update-level', 400, {
    fillLevel: 50
  });
  
  // Get heatmap data
  await runTest('Get Heatmap Data', 'GET', '/api/bins/heatmap');
  
  // Get full bins
  await runTest('Get Full Bins', 'GET', '/api/bins/full');
  
  // Get bin statistics
  await runTest('Get Bin Statistics', 'GET', '/api/bins/statistics');
  
  // Bulk update
  await runTest('Bulk Update Bins', 'POST', '/api/bins/bulk-update', 200, {
    updates: [
      {
        binID: 'BIN-001',
        fillLevel: 45,
        location: { latitude: 12.9716, longitude: 77.5946 }
      },
      {
        binID: 'BIN-002',
        fillLevel: 90,
        location: { latitude: 12.9720, longitude: 77.5950 }
      }
    ]
  });
  
  // 3. Route Management Tests
  console.log('\n🚛 Route Management Tests');
  console.log('-'.repeat(30));
  
  // Generate route
  await runTest('Generate Optimized Route', 'POST', '/api/routes/generate', 200, {
    driverId: 'DRIVER_TEST_01',
    truckId: 'TRUCK_TEST_01'
  });
  
  // Get all routes
  await runTest('Get All Routes', 'GET', '/api/routes');
  
  // Get route statistics
  await runTest('Get Route Statistics', 'GET', '/api/routes/statistics');
  
  // Test missing driver ID
  await runTest('Generate Route (Missing Driver)', 'POST', '/api/routes/generate', 400, {
    truckId: 'TRUCK_TEST_01'
  });
  
  // 4. Report Management Tests
  console.log('\n📱 Report Management Tests');
  console.log('-'.repeat(30));
  
  // Submit valid report
  await runTest('Submit User Report (Valid)', 'POST', '/api/reports/submit', 200, {
    reporterName: 'Test User',
    location: { latitude: 12.9780, longitude: 77.6010 },
    imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
    description: 'Test report for automated testing'
  });
  
  // Submit anonymous report
  await runTest('Submit Anonymous Report', 'POST', '/api/reports/submit', 200, {
    location: { latitude: 12.9695, longitude: 77.5890 },
    imageUrl: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400',
    description: 'Anonymous test report'
  });
  
  // Invalid image URL
  await runTest('Submit Report (Invalid URL)', 'POST', '/api/reports/submit', 400, {
    location: { latitude: 12.9695, longitude: 77.5890 },
    imageUrl: 'not-a-valid-url',
    description: 'Test report with invalid URL'
  });
  
  // Get all reports
  await runTest('Get All Reports', 'GET', '/api/reports');
  
  // Get report statistics
  await runTest('Get Report Statistics', 'GET', '/api/reports/statistics');
  
  // Get nearby reports
  await runTest('Get Nearby Reports', 'GET', '/api/reports/nearby?lat=12.9716&lng=77.5946&radius=2');
  
  // 5. Analytics Tests
  console.log('\n📊 Analytics Tests');
  console.log('-'.repeat(30));
  
  // Get analytics summary
  await runTest('Get Analytics Summary', 'GET', '/api/analytics/summary');
  
  // Get real-time data
  await runTest('Get Real-time Dashboard', 'GET', '/api/analytics/realtime');
  
  // 6. Error Handling Tests
  console.log('\n❌ Error Handling Tests');
  console.log('-'.repeat(30));
  
  // Test 404
  await runTest('404 Error Test', 'GET', '/api/nonexistent', 404);
  
  // Print Results
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n📝 Failed Tests Details:');
    testResults.details
      .filter(test => test.status !== 'PASSED')
      .forEach(test => {
        console.log(`- ${test.test}: ${test.status}`);
      });
  }
  
  console.log('\n✨ Testing completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
