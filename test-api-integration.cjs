#!/usr/bin/env node

/**
 * API Integration Test Script
 * Tests frontend-backend connectivity for MCAS-Life
 */

const API_BASE = 'http://localhost:3001/api';

async function testHealthEndpoint() {
  console.log('🔍 Testing Health Endpoint...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Health Check: PASSED');
      console.log(`   Status: ${data.status}, Uptime: ${Math.floor(data.uptime)}s`);
      return true;
    } else {
      console.log('❌ Health Check: FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Health Check: ERROR', error.message);
    return false;
  }
}

async function testFoodSearchEndpoint() {
  console.log('\n🥬 Testing Food Search Endpoint...');
  try {
    const response = await fetch(`${API_BASE}/sighi/foods?search=spinach&limit=3`);
    const data = await response.json();
    
    if (response.ok && data.success && data.data.foods) {
      console.log('✅ Food Search: PASSED');
      console.log(`   Found ${data.data.foods.length} foods`);
      console.log(`   Sample: ${data.data.foods[0]?.name_en || data.data.foods[0]?.name_no}`);
      return true;
    } else {
      console.log('❌ Food Search: FAILED');
      console.log('   Data:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Food Search: ERROR', error.message);
    return false;
  }
}

async function testAuthEndpoint() {
  console.log('\n🔐 Testing Auth Endpoint...');
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    });
    const data = await response.json();
    
    if (response.status === 401 || (data.success === false && data.error)) {
      console.log('✅ Auth Rejection: PASSED');
      console.log('   Correctly rejected invalid credentials');
      return true;
    } else {
      console.log('❌ Auth Rejection: FAILED');
      console.log('   Should have rejected invalid credentials');
      return false;
    }
  } catch (error) {
    console.log('❌ Auth Test: ERROR', error.message);
    return false;
  }
}

async function testFrontendConnectivity() {
  console.log('\n🌐 Testing Frontend Connectivity...');
  try {
    const response = await fetch('http://localhost:3002');
    if (response.ok) {
      console.log('✅ Frontend: PASSED');
      console.log('   Frontend is accessible on http://localhost:3002');
      return true;
    } else {
      console.log('❌ Frontend: FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend: ERROR', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 MCAS-Life API Integration Test\n');
  
  const results = {
    health: await testHealthEndpoint(),
    foods: await testFoodSearchEndpoint(), 
    auth: await testAuthEndpoint(),
    frontend: await testFrontendConnectivity()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✅ All tests passed! API integration is working correctly.');
    console.log('\n🎯 Ready for next phase: Complete user flow testing');
  } else {
    console.log('❌ Some tests failed. Please check the logs above.');
    console.log('\n🔧 Next: Fix failing endpoints and retry');
  }
  
  return passed === total;
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };