/**
 * MCAS-Life Database Connection
 * 
 * PostgreSQL connection setup with Drizzle ORM
 * Configured for HIPAA-compliant cloud deployment
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Environment variables for database configuration
const DATABASE_URL = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/mcas_life';
const DATABASE_SSL = process.env['NODE_ENV'] === 'production';
const DATABASE_MAX_CONNECTIONS = parseInt(process.env['DATABASE_MAX_CONNECTIONS'] || '10');
const DATABASE_IDLE_TIMEOUT = parseInt(process.env['DATABASE_IDLE_TIMEOUT'] || '30');

// Create PostgreSQL connection with optimizations for MCAS-Life workload
const postgresConnection = postgres(DATABASE_URL, {
  max: DATABASE_MAX_CONNECTIONS,
  idle_timeout: DATABASE_IDLE_TIMEOUT,
  ssl: DATABASE_SSL,
  
  // Connection pool optimizations for symptom correlation queries
  prepare: true,                    // Use prepared statements for performance
  transform: postgres.camel,        // Transform snake_case to camelCase
  
  // HIPAA-compliant logging configuration
  debug: process.env['NODE_ENV'] === 'development',
  
  // Error handling
  onnotice: (notice) => {
    if (process.env['NODE_ENV'] === 'development') {
      console.log('PostgreSQL notice:', notice);
    }
  }
});

// Create Drizzle instance with schema and connection
export const db = drizzle(postgresConnection, { 
  schema,
  logger: process.env['NODE_ENV'] === 'development'
});

// Database health check function
export async function checkDatabaseHealth(): Promise<{ 
  status: 'healthy' | 'unhealthy'; 
  latency: number; 
  error?: string 
}> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    await db.execute(sql`SELECT 1 as health_check`);
    
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      latency,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await postgresConnection.end();
    console.log('🔌 Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Database statistics for monitoring
export async function getDatabaseStats(): Promise<{
  active_connections: number;
  total_users: number;
  total_foods: number;
  total_symptoms_today: number;
  correlation_analyses_pending: number;
}> {
  try {
    // Get current active connections
    const connectionsResults = await db.execute(
      sql`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`
    );
    
    // Get basic table counts for dashboard
    const usersResults = await db.execute(sql`SELECT count(*) as total FROM users WHERE account_status = 'active'`);
    const foodsResults = await db.execute(sql`SELECT count(*) as total FROM foods`);
    const symptomsResults = await db.execute(
      sql`SELECT count(*) as total FROM symptom_entries WHERE DATE(started_at) = CURRENT_DATE`
    );
    const analysesResults = await db.execute(
      sql`SELECT count(*) as total FROM trigger_analyses WHERE analysis_confidence IS NULL`
    );
    
    const connectionsResult = connectionsResults[0];
    const usersResult = usersResults[0];
    const foodsResult = foodsResults[0];
    const symptomsResult = symptomsResults[0];
    const analysesResult = analysesResults[0];
    
    return {
      active_connections: Number(connectionsResult?.['active_connections'] || 0),
      total_users: Number(usersResult?.['total'] || 0),
      total_foods: Number(foodsResult?.['total'] || 0),
      total_symptoms_today: Number(symptomsResult?.['total'] || 0),
      correlation_analyses_pending: Number(analysesResult?.['total'] || 0)
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}

// Transaction helper for complex operations
export async function withTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return await db.transaction(callback);
}

// Import sql helper for raw queries
import { sql } from 'drizzle-orm';
export { sql };

// Export database connection and types
export { db as database };
export type Database = typeof db;