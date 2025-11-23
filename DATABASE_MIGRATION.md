# Database Migration Guide

This guide covers migrating your MCAS-Life database from Supabase (development) to a self-hosted PostgreSQL instance (production).

## Overview

MCAS-Life supports two database deployment options:

1. **Supabase (Cloud)** - Recommended for development and quick setup
2. **Self-hosted PostgreSQL** - Recommended for production with full control

This guide helps you migrate from Supabase to self-hosted PostgreSQL for production deployment.

## Migration Steps

### Step 1: Backup Supabase Data

First, create a complete backup of your Supabase database:

```bash
# Set your Supabase connection string
export SUPABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Create backup
pg_dump "$SUPABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=mcas_life_supabase_backup.dump

# Or create SQL backup (easier to inspect)
pg_dump "$SUPABASE_URL" \
  --no-owner \
  --no-acl \
  --file=mcas_life_supabase_backup.sql
```

### Step 2: Prepare Self-Hosted PostgreSQL

Deploy PostgreSQL using the provided Docker Compose file:

```bash
# Start only the database
docker-compose -f docker-compose.traefik.yml up -d mcas-db

# Wait for database to be healthy
docker-compose -f docker-compose.traefik.yml ps mcas-db
```

### Step 3: Initialize Schema

You have two options for initializing the schema:

#### Option A: Using Drizzle Push (Recommended)

```bash
# Temporarily update backend .env to point to new database
DATABASE_URL=postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life

# Push schema to new database
cd backend
npm run db:push

# Import SIGHI food data
npm run import:sighi
```

#### Option B: Using Drizzle Migrations

```bash
# Generate migration from current schema
cd backend
npm run db:generate

# Run migrations on new database
DATABASE_URL=postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life npm run db:migrate

# Import SIGHI food data
npm run import:sighi
```

### Step 4: Migrate User Data

Now migrate your user data from Supabase backup:

#### Option A: Restore Full Backup

```bash
# Restore from custom format backup
pg_restore \
  --dbname=postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  mcas_life_supabase_backup.dump

# Or restore from SQL backup
psql postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life \
  < mcas_life_supabase_backup.sql
```

#### Option B: Selective Data Migration

If you want to migrate only specific tables:

```bash
# Export specific tables from Supabase
pg_dump "$SUPABASE_URL" \
  --table=users \
  --table=mcas_profiles \
  --table=user_preferences \
  --table=diary_entries \
  --table=approved_foods \
  --table=personal_food_ratings \
  --data-only \
  --no-owner \
  --no-acl \
  --file=user_data.sql

# Import to self-hosted database
psql postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life \
  < user_data.sql
```

### Step 5: Verify Migration

Check that all data was migrated successfully:

```bash
# Connect to new database
docker exec -it mcas-db psql -U mcas_user -d mcas_life

# Inside PostgreSQL:

-- Check user count
SELECT COUNT(*) FROM users;

-- Check SIGHI foods count (should be 849)
SELECT COUNT(*) FROM foods;

-- Check diary entries
SELECT COUNT(*) FROM diary_entries;

-- Check approved foods
SELECT COUNT(*) FROM approved_foods;

-- Check personal ratings
SELECT COUNT(*) FROM personal_food_ratings;

-- Verify MCAS profiles
SELECT COUNT(*) FROM mcas_profiles;

-- Check sessions
SELECT COUNT(*) FROM user_sessions;

-- Exit
\q
```

### Step 6: Test Application

```bash
# Update backend .env with production database
DATABASE_URL=postgresql://mcas_user:[PASSWORD]@mcas-db:5432/mcas_life
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20

# Start all services
docker-compose -f docker-compose.traefik.yml up -d

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"yourpassword"}'

# Test food search
curl https://your-domain.com/api/foods/search?query=tomat

# Test diary entries (with auth token)
curl https://your-domain.com/api/diary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 7: Update Frontend Configuration

Update frontend environment to point to production API:

```bash
# frontend/.env.production
VITE_API_URL=https://your-domain.com/api
```

Rebuild frontend:

```bash
docker-compose -f docker-compose.traefik.yml build mcas-frontend
docker-compose -f docker-compose.traefik.yml up -d mcas-frontend
```

## Troubleshooting

### Issue: Password authentication failed

**Cause:** Password mismatch between .env and database

**Fix:**
```bash
# Reset database password
docker exec -it mcas-db psql -U postgres -c "ALTER USER mcas_user WITH PASSWORD 'new_password';"

# Update .env.production
DB_PASSWORD=new_password
```

### Issue: Permission denied for table

**Cause:** User doesn't have proper permissions

**Fix:**
```bash
docker exec -it mcas-db psql -U postgres -d mcas_life

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mcas_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mcas_user;
GRANT ALL PRIVILEGES ON DATABASE mcas_life TO mcas_user;
```

### Issue: Duplicate key violations

**Cause:** Data already exists in target database

**Fix:**
```bash
# Use --clean flag with pg_restore to drop objects first
pg_restore --clean --if-exists ...

# Or manually truncate tables before restore
docker exec -it mcas-db psql -U mcas_user -d mcas_life -c "TRUNCATE TABLE users CASCADE;"
```

### Issue: Missing SIGHI food data

**Cause:** SIGHI import didn't run or failed

**Fix:**
```bash
# Re-run SIGHI import
docker exec -it mcas-backend npm run import:sighi

# Verify
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"
# Should return 849
```

### Issue: Connection pool exhausted

**Cause:** Too many concurrent connections

**Fix:**
```bash
# Increase max connections in docker-compose.traefik.yml
environment:
  DATABASE_MAX_CONNECTIONS: 50  # Increase from default 20

# Or adjust PostgreSQL max_connections
docker exec mcas-db psql -U postgres -c "ALTER SYSTEM SET max_connections = 100;"
docker-compose -f docker-compose.traefik.yml restart mcas-db
```

## Performance Optimization

After migration, optimize your PostgreSQL instance:

```sql
-- Connect to database
docker exec -it mcas-db psql -U mcas_user -d mcas_life

-- Analyze tables to update statistics
ANALYZE;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_approved_foods_user ON approved_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_ratings_user ON personal_food_ratings(user_id);

-- Update table statistics
ANALYZE users;
ANALYZE foods;
ANALYZE diary_entries;
ANALYZE approved_foods;
ANALYZE personal_food_ratings;
```

## Reverting to Supabase

If you need to revert back to Supabase:

```bash
# Update backend .env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
DATABASE_SSL=require
DATABASE_MAX_CONNECTIONS=5

# Restart backend
docker-compose -f docker-compose.traefik.yml restart mcas-backend
```

## Data Synchronization

If you need to keep Supabase and self-hosted in sync during transition:

### Option 1: Manual Sync Script

```bash
#!/bin/bash
# sync-databases.sh

SUPABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
SELFHOSTED_URL="postgresql://mcas_user:[PASSWORD]@localhost:5432/mcas_life"

# Dump from Supabase
pg_dump "$SUPABASE_URL" --data-only --table=users --table=diary_entries > temp_sync.sql

# Load to self-hosted (with conflict resolution)
psql "$SELFHOSTED_URL" < temp_sync.sql

# Cleanup
rm temp_sync.sql
```

### Option 2: Using Logical Replication

For continuous sync (advanced):

```sql
-- On Supabase (source)
CREATE PUBLICATION mcas_pub FOR ALL TABLES;

-- On self-hosted (target)
CREATE SUBSCRIPTION mcas_sub
CONNECTION 'postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres'
PUBLICATION mcas_pub;
```

**Note:** Supabase may have restrictions on logical replication. Check their documentation.

## Best Practices

1. **Always backup before migration**
   ```bash
   pg_dump ... > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migration on staging first**
   - Use a copy of production data
   - Verify all features work
   - Check performance

3. **Schedule during low traffic**
   - Plan migration during maintenance window
   - Notify users in advance

4. **Monitor after migration**
   - Watch logs: `docker-compose -f docker-compose.traefik.yml logs -f`
   - Monitor performance: `docker stats`
   - Check error rates

5. **Keep backups for 30 days**
   - Automated daily backups (see DEPLOYMENT_TRAEFIK.md)
   - Store backups offsite

## Support

For migration issues:
1. Check logs: `docker-compose -f docker-compose.traefik.yml logs mcas-db`
2. Verify schema: `npm run db:studio` (Drizzle Studio)
3. Test connections: `npm run db:test`
4. Review [DEPLOYMENT_TRAEFIK.md](DEPLOYMENT_TRAEFIK.md) for troubleshooting

## Related Documentation

- [DEPLOYMENT_TRAEFIK.md](DEPLOYMENT_TRAEFIK.md) - Full deployment guide
- [SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md) - Supabase setup
- [CLAUDE.md](CLAUDE.md) - Project architecture and database schema
