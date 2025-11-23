# MCAS-Life Production Deployment with Traefik

This guide covers deploying MCAS-Life to a server with Docker and Traefik reverse proxy.

## Prerequisites

- Docker and Docker Compose installed on your server
- Traefik reverse proxy running with Let's Encrypt configured
- Domain name pointing to your server (or Cloudflare tunnel configured)
- Git installed on your server

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Traefik (Reverse Proxy)               │
│              https://mcas.yourdomain.com                 │
└─────────────────┬────────────────────┬──────────────────┘
                  │                    │
         ┌────────▼──────────┐   ┌─────▼──────────┐
         │  mcas-frontend    │   │  mcas-backend  │
         │  (Nginx + React)  │   │  (Node.js API) │
         │  Port: 80         │   │  Port: 3001    │
         └───────────────────┘   └────────┬───────┘
                                          │
                          ┌───────────────┴────────────────┐
                          │                                │
                  ┌───────▼────────┐            ┌──────────▼─────────┐
                  │  mcas-db       │            │  mcas-redis        │
                  │  (PostgreSQL)  │            │  (Session Store)   │
                  │  Port: 5432    │            │  Port: 6379        │
                  └────────────────┘            └────────────────────┘
```

## Step 1: Clone Repository on Server

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to your Docker projects directory
cd /path/to/docker/projects

# Clone the repository
git clone https://github.com/yourusername/MCAS-life.git
cd MCAS-life
```

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.production.example .env.production

# Edit the environment file
nano .env.production
```

### Required Configuration

Edit `.env.production` and set these values:

```bash
# Your domain (e.g., mcas.yourdomain.com)
DOMAIN=mcas.yourdomain.com

# Generate strong passwords (use: openssl rand -base64 32)
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password

# Generate JWT secrets (use: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# Optional: Airthings Integration
AIRTHINGS_CLIENT_ID=your_airthings_client_id
AIRTHINGS_CLIENT_SECRET=your_airthings_client_secret
```

### Generate Secure Secrets

Use these commands to generate secure random values:

```bash
# Generate database password
echo "DB_PASSWORD=$(openssl rand -base64 32)"

# Generate Redis password
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Generate JWT refresh secret
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

## Step 3: Configure Traefik Network

Ensure your Traefik setup has the `n8n-compose_proxy` network (or update the network name in `docker-compose.traefik.yml`):

```bash
# Check if network exists
docker network ls | grep n8n-compose_proxy

# If it doesn't exist, create it
docker network create n8n-compose_proxy
```

## Step 4: Build and Start Services

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build the Docker images
docker-compose -f docker-compose.traefik.yml build

# Start the services
docker-compose -f docker-compose.traefik.yml up -d

# Check logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## Step 5: Initialize Database

Wait for the database to be ready, then run migrations and import SIGHI data:

```bash
# Wait for database to be healthy
docker-compose -f docker-compose.traefik.yml ps

# Access the backend container
docker exec -it mcas-backend sh

# Inside the container, run migrations
npm run db:push

# Import SIGHI food database (849 foods)
npm run import:sighi

# Exit the container
exit
```

## Step 6: Verify Deployment

1. **Check all containers are running:**
   ```bash
   docker-compose -f docker-compose.traefik.yml ps
   ```

   You should see all services as "Up" and healthy.

2. **Test the frontend:**
   ```bash
   curl -I https://mcas.yourdomain.com
   ```
   Should return 200 OK.

3. **Test the backend API:**
   ```bash
   curl https://mcas.yourdomain.com/api/health
   ```
   Should return: `{"status":"healthy"}`

4. **Check database connection:**
   ```bash
   docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"
   ```
   Should return: `849` (SIGHI foods)

## Step 7: Create First User

Access the application at `https://mcas.yourdomain.com` and:

1. Click "Registrer deg" (Sign up)
2. Fill in user details
3. Complete MCAS profile questionnaire
4. Login and start using the app

## Updating the Application

To update to a newer version:

```bash
# Pull latest changes
cd /path/to/MCAS-life
git pull origin main

# Load environment
export $(cat .env.production | xargs)

# Rebuild and restart
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Check logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## Database Backup

### Manual Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backups/mcas_life_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Automated Backups with Cron

Add to crontab (`crontab -e`):

```bash
# Backup MCAS-Life database daily at 2 AM
0 2 * * * cd /path/to/MCAS-life && docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backups/mcas_life_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz

# Clean up backups older than 30 days
0 3 * * * find /path/to/MCAS-life/backups -name "*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Stop the application
docker-compose -f docker-compose.traefik.yml stop mcas-backend

# Restore database
gunzip -c backups/mcas_life_20250101_020000.sql.gz | docker exec -i mcas-db psql -U mcas_user -d mcas_life

# Restart application
docker-compose -f docker-compose.traefik.yml start mcas-backend
```

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.traefik.yml logs -f

# Specific service
docker-compose -f docker-compose.traefik.yml logs -f mcas-backend
docker-compose -f docker-compose.traefik.yml logs -f mcas-frontend
docker-compose -f docker-compose.traefik.yml logs -f mcas-db
```

### Check Resource Usage

```bash
# Container stats
docker stats mcas-backend mcas-frontend mcas-db mcas-redis

# Disk usage
docker system df
```

### Health Checks

```bash
# Backend health
curl https://mcas.yourdomain.com/api/health

# Database connection
docker exec mcas-db pg_isready -U mcas_user -d mcas_life

# Redis connection
docker exec mcas-redis redis-cli -a $REDIS_PASSWORD ping
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.traefik.yml logs mcas-backend

# Check environment variables
docker exec mcas-backend env | grep DATABASE_URL
```

### Database connection issues

```bash
# Verify database is running
docker-compose -f docker-compose.traefik.yml ps mcas-db

# Check database logs
docker-compose -f docker-compose.traefik.yml logs mcas-db

# Test connection from backend
docker exec mcas-backend node -e "console.log(process.env.DATABASE_URL)"
```

### Traefik routing issues

```bash
# Check Traefik labels
docker inspect mcas-frontend | grep traefik

# Verify network connection
docker network inspect n8n-compose_proxy | grep mcas
```

### Frontend not loading

```bash
# Check Nginx config inside container
docker exec mcas-frontend cat /etc/nginx/conf.d/default.conf

# Check frontend logs
docker-compose -f docker-compose.traefik.yml logs mcas-frontend

# Verify build args were passed correctly
docker inspect mcas-frontend | grep VITE_API_URL
```

### API returns 401 Unauthorized

1. Check JWT_SECRET is set correctly
2. Verify CORS_ORIGIN matches your domain
3. Check browser console for CORS errors
4. Verify authentication token is being sent

### SIGHI data not imported

```bash
# Check if foods table has data
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"

# Re-run import
docker exec -it mcas-backend npm run import:sighi
```

## Security Considerations

1. **Change all default passwords** in `.env.production`
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Enable firewall** on your server
4. **Regular backups** of database
5. **Keep Docker images updated:**
   ```bash
   docker-compose -f docker-compose.traefik.yml pull
   docker-compose -f docker-compose.traefik.yml up -d
   ```
6. **Monitor logs** for suspicious activity
7. **Use SSL/TLS** via Traefik Let's Encrypt
8. **Restrict database access** to internal network only

## Performance Tuning

### PostgreSQL Optimization

Edit `docker-compose.traefik.yml` and add to `mcas-db` environment:

```yaml
POSTGRES_SHARED_BUFFERS: 256MB
POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
POSTGRES_MAINTENANCE_WORK_MEM: 64MB
POSTGRES_MAX_CONNECTIONS: 100
```

### Backend Scaling

To run multiple backend instances behind Traefik:

```bash
docker-compose -f docker-compose.traefik.yml up -d --scale mcas-backend=3
```

### Database Connection Pooling

Adjust `DATABASE_MAX_CONNECTIONS` in `.env.production`:

```bash
# For light usage
DATABASE_MAX_CONNECTIONS=10

# For medium usage
DATABASE_MAX_CONNECTIONS=20

# For heavy usage
DATABASE_MAX_CONNECTIONS=50
```

## Cloudflare Tunnel Integration

If using Cloudflare Tunnel instead of direct DNS:

1. Configure your Cloudflare Tunnel to point to your server
2. Update the tunnel configuration to route your domain to `http://localhost:80` (Traefik)
3. Traefik will handle routing to the correct service based on path
4. No changes needed to the MCAS-Life configuration

## Support

- **Documentation:** See [README.md](README.md) and [CLAUDE.md](CLAUDE.md)
- **Issues:** Report bugs on GitHub Issues
- **Updates:** Check for new releases and security updates regularly

## Quick Reference Commands

```bash
# Start services
docker-compose -f docker-compose.traefik.yml up -d

# Stop services
docker-compose -f docker-compose.traefik.yml stop

# Restart services
docker-compose -f docker-compose.traefik.yml restart

# View logs
docker-compose -f docker-compose.traefik.yml logs -f

# Update application
git pull && docker-compose -f docker-compose.traefik.yml build && docker-compose -f docker-compose.traefik.yml up -d

# Backup database
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backup_$(date +%Y%m%d).sql.gz

# Check status
docker-compose -f docker-compose.traefik.yml ps
curl https://mcas.yourdomain.com/api/health
```
