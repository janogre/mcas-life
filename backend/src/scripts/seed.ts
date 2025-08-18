/**
 * Database Seeding Script
 * 
 * Seeds the database with initial data:
 * - SIGHI food database from MCAS-search
 * - Default user preferences
 * - System configuration data
 */

import { database, closeDatabaseConnection } from '../db/connection.js';
import { foods, users, mcasProfiles, userPreferences } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// SIGHI food data import (sample - full data will be imported from MCAS-search)
const sighiFoods = [
  {
    name_no: "Eggehvite",
    name_en: "egg white",
    category: "Animalske matvarer - Egg",
    compatibility: "1" as const, // MEDIUM risk
    triggers: ["L"], // Histamine liberator
    remarks_no: "Mastcelle-aktiverende spesielt rå, men også kokt",
    remarks_en: "Mast cell activating especially raw, but even cooked",
    verified: true,
    source: "sighi" as const
  },
  {
    name_no: "Eggeplomme",
    name_en: "egg yolk",
    category: "Animalske matvarer - Egg",
    compatibility: "0" as const, // SAFE
    triggers: [],
    remarks_no: "",
    remarks_en: "",
    verified: true,
    source: "sighi" as const
  },
  {
    name_no: "Linfrø",
    name_en: "flaxseed, linseed",
    category: "Vegetabilske matvarer - Stivelse",
    compatibility: "0" as const, // SAFE
    triggers: [],
    remarks_no: "",
    remarks_en: "",
    verified: true,
    source: "sighi" as const
  },
  {
    name_no: "Rødvin",
    name_en: "red wine",
    category: "Drikke - Alkohol",
    compatibility: "2" as const, // AVOID
    triggers: ["H", "A"], // High histamine + DAO inhibitor
    remarks_no: "Høyt histamininnhold og hemmer DAO-enzym",
    remarks_en: "High histamine content and inhibits DAO enzyme",
    verified: true,
    source: "sighi" as const
  }
];

// Default notification preferences
const defaultNotificationPreferences = {
  supplement_reminders: true,
  daily_check_in: true,
  symptom_followup: true,
  trigger_alerts: true,
  pattern_insights: true,
  community_updates: false,
  research_participation: false,
  push_notifications: true,
  email_notifications: true,
  sms_notifications: false
};

// Default privacy settings
const defaultPrivacySettings = {
  share_anonymous_data: false,
  share_improvement_data: false,
  public_profile: false,
  show_in_expert_network: false,
  allow_expert_contact: false,
  share_reports_with_doctors: true,
  auto_delete_old_data: false,
  data_retention_months: 24
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Check if foods already exist to avoid duplicate seeding
    const existingFoods = await database
      .select({ id: foods.id })
      .from(foods)
      .limit(1);
    
    if (existingFoods.length === 0) {
      console.log('📦 Seeding SIGHI food database...');
      
      await database.insert(foods).values(sighiFoods);
      
      console.log(`✅ Inserted ${sighiFoods.length} SIGHI foods`);
    } else {
      console.log('ℹ️  Foods already exist, skipping food seeding');
    }
    
    // Create a test user for development (only in development mode)
    if (process.env.NODE_ENV === 'development') {
      const existingUser = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, 'test@mcaslife.no'))
        .limit(1);
      
      if (existingUser.length === 0) {
        console.log('👤 Creating test user for development...');
        
        // Create test user
        const [testUser] = await database.insert(users).values({
          email: 'test@mcaslife.no',
          username: 'testuser',
          password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKd3DYOe7g8QO8W', // password: 'testpass123'
          first_name: 'Test',
          last_name: 'User',
          timezone: 'Europe/Oslo',
          language: 'no',
          email_verified: true,
          onboarding_completed: true
        }).returning({ id: users.id });
        
        // Create MCAS profile for test user
        await database.insert(mcasProfiles).values({
          user_id: testUser.id,
          severity: 'moderate',
          confirmed_by_doctor: true,
          comorbidities: {
            mastocytosis: false,
            histamine_intolerance: true,
            pots: false,
            eds: false,
            food_allergies: true,
            other: []
          },
          current_medications: ['Antihistamine H1', 'Antihistamine H2'],
          current_supplements: ['DAO supplement', 'Vitamin C'],
          known_food_triggers: [], // Will be populated as user uses app
          known_environmental_triggers: ['Stress', 'Heat'],
          known_stress_triggers: ['Work pressure', 'Lack of sleep'],
          histamine_tolerance_level: 'low',
          exercise_tolerance: 'moderate',
          stress_tolerance: 'low'
        });
        
        // Create default preferences for test user
        await database.insert(userPreferences).values({
          user_id: testUser.id,
          notification_preferences: defaultNotificationPreferences,
          privacy_settings: defaultPrivacySettings
        });
        
        console.log('✅ Test user created with email: test@mcaslife.no');
      } else {
        console.log('ℹ️  Test user already exists, skipping user seeding');
      }
    }
    
    console.log('🎉 Database seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// Function to import full SIGHI data from MCAS-search
export async function importSighiData(sighiDataPath: string) {
  console.log('📥 Importing full SIGHI data from MCAS-search...');
  
  try {
    // This function will be implemented to read the actual SIGHI data
    // from MCAS-search server.js and import all ~1370 foods
    
    // TODO: Implement full SIGHI data import
    console.log('⚠️  Full SIGHI import not yet implemented');
    console.log('📍 Will import from:', sighiDataPath);
    
  } catch (error) {
    console.error('❌ SIGHI import failed:', error);
    throw error;
  }
}

// Run seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}