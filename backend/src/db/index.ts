/**
 * Database Module Exports
 * 
 * Central export point for all database-related functionality
 */

// Export connection and database instance
export { 
  database as db, 
  checkDatabaseHealth, 
  closeDatabaseConnection, 
  getDatabaseStats,
  withTransaction,
  sql 
} from './connection.js';

// Export all schema definitions
export * from './schema.js';

// Export database types for type safety
export type { Database } from './connection.js';