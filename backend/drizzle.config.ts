/**
 * Drizzle Kit Configuration
 * 
 * Configuration for database migrations, introspection, and development tools
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcas_life'
  },
  
  // Development and debugging options
  verbose: true,
  strict: true
} satisfies Config;