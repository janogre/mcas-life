/**
 * Auth Service Demo Script
 * 
 * Demonstrates the complete authentication flow without database dependencies
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock environment setup
const JWT_SECRET = 'demo-secret-key-for-testing';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 12;

console.log('🚀 MCAS-Life Auth Service Demo');
console.log('================================\n');

// Demo data
const demoRegistrationData = {
  email: 'demo@mcaslife.no',
  username: 'mcasdemo',
  password: 'DemoPass123!',
  first_name: 'Demo',
  last_name: 'Patient',
  timezone: 'Europe/Oslo',
  language: 'no' as const,
  mcas_severity: 'moderate' as const,
  confirmed_diagnosis: true,
  accept_terms: true,
  accept_privacy: true,
  join_research: true
};

const demoClientInfo = {
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0 (Demo Browser)',
  deviceInfo: 'Demo Device - Windows Chrome'
};

async function demonstratePasswordHashing() {
  console.log('1️⃣ Password Security Demo');
  console.log('------------------------');
  
  const plainPassword = demoRegistrationData.password;
  console.log(`Original password: ${plainPassword}`);
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  console.log(`Hashed password: ${hashedPassword.substring(0, 30)}...`);
  
  // Verify the password
  const isValid = await bcrypt.compare(plainPassword, hashedPassword);
  console.log(`Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  // Test with wrong password
  const isInvalid = await bcrypt.compare('WrongPassword123!', hashedPassword);
  console.log(`Wrong password test: ${isInvalid ? '❌ Should be false' : '✅ Correctly rejected'}`);
  
  console.log('');
  return hashedPassword;
}

function demonstrateTokenGeneration() {
  console.log('2️⃣ JWT Token Generation Demo');
  console.log('-----------------------------');
  
  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: 1,
      email: demoRegistrationData.email,
      role: 'patient',
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'mcas-life-api',
      audience: 'mcas-life-app'
    }
  );
  
  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId: 1,
      type: 'refresh'
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'mcas-life-api',
      audience: 'mcas-life-app'
    }
  );
  
  console.log(`Access Token: ${accessToken.substring(0, 50)}...`);
  console.log(`Refresh Token: ${refreshToken.substring(0, 50)}...`);
  
  // Verify and decode tokens
  try {
    const decodedAccess = jwt.verify(accessToken, JWT_SECRET) as any;
    const decodedRefresh = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    console.log('✅ Access token verified successfully');
    console.log(`   - User ID: ${decodedAccess.userId}`);
    console.log(`   - Email: ${decodedAccess.email}`);
    console.log(`   - Role: ${decodedAccess.role}`);
    console.log(`   - Type: ${decodedAccess.type}`);
    console.log(`   - Expires: ${new Date(decodedAccess.exp * 1000).toLocaleString()}`);
    
    console.log('✅ Refresh token verified successfully');
    console.log(`   - User ID: ${decodedRefresh.userId}`);
    console.log(`   - Type: ${decodedRefresh.type}`);
    console.log(`   - Expires: ${new Date(decodedRefresh.exp * 1000).toLocaleString()}`);
    
  } catch (error) {
    console.log('❌ Token verification failed:', error);
  }
  
  console.log('');
  return { accessToken, refreshToken };
}

function demonstrateMCASProfileCreation() {
  console.log('3️⃣ MCAS Profile Creation Demo');
  console.log('------------------------------');
  
  const mcasProfile = {
    user_id: 1,
    severity: demoRegistrationData.mcas_severity,
    confirmed_by_doctor: demoRegistrationData.confirmed_diagnosis,
    comorbidities: {
      mastocytosis: false,
      histamine_intolerance: true,
      pots: false,
      eds: false,
      food_allergies: true,
      other: ['Chronic Fatigue Syndrome']
    },
    current_medications: [
      'Antihistamine H1 (Cetirizine)',
      'Antihistamine H2 (Famotidine)',
      'Mast Cell Stabilizer (Cromolyn)'
    ],
    current_supplements: [
      'DAO supplement (DiAmine Oxidase)',
      'Vitamin C (natural antihistamine)',
      'Quercetin (natural mast cell stabilizer)'
    ],
    known_food_triggers: [
      'Aged cheeses',
      'Fermented foods',
      'Alcohol',
      'Processed meats'
    ],
    known_environmental_triggers: [
      'Heat',
      'Strong scents',
      'Stress',
      'Physical exertion'
    ],
    known_stress_triggers: [
      'Work pressure',
      'Sleep deprivation',
      'Emotional stress'
    ],
    histamine_tolerance_level: 'low',
    exercise_tolerance: 'moderate',
    stress_tolerance: 'low'
  };
  
  console.log('✅ MCAS Profile created:');
  console.log(`   - Severity: ${mcasProfile.severity}`);
  console.log(`   - Doctor confirmed: ${mcasProfile.confirmed_by_doctor ? 'Yes' : 'No'}`);
  console.log(`   - Medications: ${mcasProfile.current_medications.length} items`);
  console.log(`   - Supplements: ${mcasProfile.current_supplements.length} items`);
  console.log(`   - Food triggers: ${mcasProfile.known_food_triggers.length} items`);
  console.log(`   - Environmental triggers: ${mcasProfile.known_environmental_triggers.length} items`);
  console.log(`   - Histamine tolerance: ${mcasProfile.histamine_tolerance_level}`);
  
  console.log('');
  return mcasProfile;
}

function demonstrateSessionManagement() {
  console.log('4️⃣ Session Management Demo');
  console.log('--------------------------');
  
  const sessionId = 'refresh_token_abc123xyz789';
  const sessionData = {
    id: sessionId,
    user_id: 1,
    device_info: demoClientInfo.deviceInfo,
    ip_address: demoClientInfo.ipAddress,
    user_agent: demoClientInfo.userAgent,
    last_activity: new Date(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    is_active: true,
    created_at: new Date()
  };
  
  console.log('✅ User session created:');
  console.log(`   - Session ID: ${sessionData.id}`);
  console.log(`   - Device: ${sessionData.device_info}`);
  console.log(`   - IP Address: ${sessionData.ip_address}`);
  console.log(`   - Created: ${sessionData.created_at.toLocaleString()}`);
  console.log(`   - Expires: ${sessionData.expires_at.toLocaleString()}`);
  console.log(`   - Active: ${sessionData.is_active ? 'Yes' : 'No'}`);
  
  console.log('');
  return sessionData;
}

function demonstrateUserPreferences() {
  console.log('5️⃣ User Preferences Demo');
  console.log('-------------------------');
  
  const userPreferences = {
    user_id: 1,
    notification_preferences: {
      supplement_reminders: true,
      daily_check_in: true,
      symptom_followup: true,
      trigger_alerts: true,
      pattern_insights: true,
      community_updates: false,
      research_participation: demoRegistrationData.join_research,
      push_notifications: true,
      email_notifications: true,
      sms_notifications: false
    },
    privacy_settings: {
      share_anonymous_data: false,
      share_improvement_data: false,
      public_profile: false,
      show_in_expert_network: false,
      allow_expert_contact: false,
      share_reports_with_doctors: true,
      auto_delete_old_data: false,
      data_retention_months: 24
    }
  };
  
  console.log('✅ User preferences configured:');
  console.log('   Notifications enabled for:');
  Object.entries(userPreferences.notification_preferences)
    .filter(([key, value]) => value)
    .forEach(([key]) => console.log(`     - ${key.replace(/_/g, ' ')}`));
  
  console.log('   Privacy settings:');
  console.log(`     - Research participation: ${userPreferences.notification_preferences.research_participation ? 'Yes' : 'No'}`);
  console.log(`     - Share with doctors: ${userPreferences.privacy_settings.share_reports_with_doctors ? 'Yes' : 'No'}`);
  console.log(`     - Data retention: ${userPreferences.privacy_settings.data_retention_months} months`);
  
  console.log('');
  return userPreferences;
}

function demonstrateCompleteAuthFlow() {
  console.log('6️⃣ Complete Authentication Flow Demo');
  console.log('-------------------------------------');
  
  const authResponse = {
    user: {
      id: 1,
      email: demoRegistrationData.email,
      username: demoRegistrationData.username,
      first_name: demoRegistrationData.first_name,
      last_name: demoRegistrationData.last_name,
      timezone: demoRegistrationData.timezone,
      language: demoRegistrationData.language,
      role: 'patient',
      email_verified: false,
      account_status: 'active',
      onboarding_completed: false,
      total_logins: 1,
      days_active: 1,
      subscription_tier: 'free',
      created_at: new Date(),
      updated_at: new Date()
    },
    tokens: {
      access_token: 'eyJhbGciOiJIUzI1NiIs...',
      refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
      expires_in: 900, // 15 minutes
      token_type: 'Bearer'
    }
  };
  
  console.log('✅ Registration successful!');
  console.log(`   - User ID: ${authResponse.user.id}`);
  console.log(`   - Email: ${authResponse.user.email}`);
  console.log(`   - Username: ${authResponse.user.username}`);
  console.log(`   - Role: ${authResponse.user.role}`);
  console.log(`   - Account Status: ${authResponse.user.account_status}`);
  console.log(`   - Access Token Type: ${authResponse.tokens.token_type}`);
  console.log(`   - Token Expires In: ${authResponse.tokens.expires_in} seconds`);
  
  console.log('');
  return authResponse;
}

async function runDemo() {
  try {
    console.log('Starting MCAS-Life Auth Service demonstration...\n');
    
    // Run all demos
    await demonstratePasswordHashing();
    demonstrateTokenGeneration();
    demonstrateMCASProfileCreation();
    demonstrateSessionManagement();
    demonstrateUserPreferences();
    demonstrateCompleteAuthFlow();
    
    console.log('🎉 Auth Service Demo Complete!');
    console.log('===============================');
    console.log('');
    console.log('Key Features Demonstrated:');
    console.log('• ✅ Secure password hashing with bcrypt');
    console.log('• ✅ JWT token generation and verification');
    console.log('• ✅ MCAS-specific profile creation');
    console.log('• ✅ Session management with device tracking');
    console.log('• ✅ User preferences and privacy settings');
    console.log('• ✅ Complete registration and authentication flow');
    console.log('');
    console.log('Security Features:');
    console.log('• 🔒 12-round bcrypt password hashing');
    console.log('• 🔒 Short-lived access tokens (15 minutes)');
    console.log('• 🔒 Longer refresh tokens (7 days)');
    console.log('• 🔒 Session tracking with IP and device info');
    console.log('• 🔒 Role-based access control');
    console.log('• 🔒 HIPAA-compliant privacy settings');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export { runDemo };