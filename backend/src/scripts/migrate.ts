/**
 * Database Migration Script
 * 
 * Applies pending database migrations to bring schema up to date
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { database, closeDatabaseConnection } from '../db/connection.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  console.log('🔄 Starting database migrations...');
  
  try {
    const migrationsFolder = join(__dirname, '../db/migrations');
    
    await migrate(database, { 
      migrationsFolder,
      migrationsTable: 'drizzle_migrations',
      migrationsSchema: 'public'
    });
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}