# MCAS-Life Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git
- Domain name (for production)
- SSL certificates (recommended)

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/mcas-life.git
cd mcas-life
```

### 2. Configure Environment
```bash
# Copy and configure production environment
cp .env.production .env.prod
nano .env.prod  # Edit with your secure values
```

### 3. Deploy
```bash
# Production deployment
./scripts/deploy.sh production

# Or staging deployment
./scripts/deploy.sh staging
```

## 📋 Detailed Deployment

### Environment Configuration

#### Required Environment Variables
```bash
# Database
POSTGRES_PASSWORD=your_secure_password_here

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret_32_chars

# Redis
REDIS_PASSWORD=your_redis_password

# Application
FRONTEND_URL=https://your-domain.com
APP_VERSION=1.0.0
```

#### Optional Variables
```bash
# Monitoring
GRAFANA_PASSWORD=your_grafana_password

# External Services
SMTP_HOST=smtp.example.com
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=your_smtp_password

# SSL (for Let's Encrypt)
LETSENCRYPT_EMAIL=admin@your-domain.com
DOMAIN_NAME=your-domain.com
```

### Docker Compose Profiles

#### Production Stack
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Includes:
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ Backend API
- ✅ Frontend PWA (nginx)

#### With Monitoring
```bash
docker-compose -f docker-compose.prod.yml --profile monitoring up -d
```

Additional services:
- 📊 Prometheus metrics
- 📈 Grafana dashboards

### SSL/TLS Setup

#### Option 1: Let's Encrypt (Recommended)
```bash
# Add to docker-compose.prod.yml
certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  command: certonly --webroot -w /var/www/certbot --email admin@your-domain.com -d your-domain.com --agree-tos
```

#### Option 2: Manual Certificates
Place your certificates in:
- `./ssl/cert.pem`
- `./ssl/private.key`

## 🔧 CI/CD Pipeline

### GitHub Actions Setup

1. **Repository Secrets**
   ```
   STAGING_HOST         # Staging server IP
   STAGING_USER         # SSH user
   STAGING_SSH_KEY      # SSH private key
   STAGING_URL          # https://staging.your-domain.com
   
   PRODUCTION_HOST      # Production server IP  
   PRODUCTION_USER      # SSH user
   PRODUCTION_SSH_KEY   # SSH private key
   PRODUCTION_URL       # https://your-domain.com
   
   SLACK_WEBHOOK_URL    # Notifications (optional)
   SNYK_TOKEN          # Security scanning (optional)
   ```

2. **Workflow Triggers**
   - `main` branch → Production deployment
   - `develop` branch → Staging deployment
   - Pull requests → Tests only

### Manual Deployment

#### Build Images Locally
```bash
# Backend
docker build -f backend/Dockerfile -t mcas-life/backend .

# Frontend  
docker build -f frontend/Dockerfile -t mcas-life/frontend .
```

#### Deploy to Registry
```bash
# Tag for registry
docker tag mcas-life/backend ghcr.io/your-org/mcas-life/backend:latest
docker tag mcas-life/frontend ghcr.io/your-org/mcas-life/frontend:latest

# Push to registry
docker push ghcr.io/your-org/mcas-life/backend:latest
docker push ghcr.io/your-org/mcas-life/frontend:latest
```

## 📊 Monitoring & Health Checks

### Service Endpoints
- **Frontend Health**: `GET /health`
- **Backend Health**: `GET /api/health`
- **Prometheus Metrics**: `GET /api/metrics`

### Monitoring Stack
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
  - Default login: admin/admin
  - Change password on first login

### Key Metrics to Monitor
- Response time (95th percentile < 2s)
- Error rate (< 1%)
- Database connections
- Memory usage (< 90%)
- CPU usage (< 80%)
- Disk space (> 10% free)

## 🛡️ Security Considerations

### Network Security
- All services run in isolated Docker network
- No direct database access from outside
- API rate limiting enabled

### Data Protection
- Passwords hashed with bcrypt
- JWT tokens with short expiration
- CORS properly configured
- HTTPS redirect enforced

### Regular Updates
```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update application code
git pull origin main
./scripts/deploy.sh production
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Manual backup
docker-compose exec postgres pg_dump -U mcas -d mcas_life > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U mcas -d mcas_life < backup_20240118.sql
```

### Automated Backups
```bash
# Add to crontab
0 2 * * * cd /opt/mcas-life && docker-compose exec postgres pg_dump -U mcas -d mcas_life > backups/backup_$(date +\%Y\%m\%d).sql
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs -f [service-name]

# Check health
docker-compose ps
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec backend npm run db:test
```

#### Frontend Not Loading
```bash
# Check nginx logs
docker-compose logs frontend

# Verify build
docker-compose exec frontend ls -la /usr/share/nginx/html
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Check application metrics
curl http://localhost:3001/api/metrics
```

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Review health checks: `curl http://localhost/health`
3. Consult monitoring dashboards
4. Create issue on GitHub with logs

## 🔗 Related Documentation
- [README.md](./README.md) - Project overview
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [API.md](./API.md) - API documentation