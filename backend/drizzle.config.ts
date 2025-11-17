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
    url: process.env.DATABASE_URL || 'postgresql://mcas_user:mcas_password@localhost:5432/mcas_life'
  },
  
  // Development and debugging options
  verbose: true,
  strict: true
} satisfies Config;