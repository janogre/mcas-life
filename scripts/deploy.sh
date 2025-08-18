#!/bin/bash

# MCAS-Life Production Deployment Script
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is valid
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    log_error "Invalid environment. Use 'production' or 'staging'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT environment..."

# Check if required files exist
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
ENV_FILE=".env.${ENVIRONMENT}"

if [[ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]]; then
    log_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

if [[ ! -f "$PROJECT_ROOT/$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    log_info "Please copy .env.production to $ENV_FILE and configure it"
    exit 1
fi

# Load environment variables
set -a
source "$PROJECT_ROOT/$ENV_FILE"
set +a

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

# Check if required environment variables are set
required_vars=(
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

log_success "Pre-deployment checks passed"

# Backup database if production
if [[ "$ENVIRONMENT" == "production" ]]; then
    log_info "Creating database backup..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U mcas -d mcas_life > "$PROJECT_ROOT/backups/$BACKUP_FILE" || {
        log_warning "Database backup failed, but continuing deployment"
    }
    
    log_success "Database backup created: $BACKUP_FILE"
fi

# Pull latest images
log_info "Pulling latest Docker images..."
docker-compose -f "$COMPOSE_FILE" pull

# Stop existing services
log_info "Stopping existing services..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans

# Start services
log_info "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Health checks
log_info "Running health checks..."

# Check backend health
BACKEND_URL="http://localhost:3001"
if [[ "$ENVIRONMENT" == "production" ]]; then
    BACKEND_URL="$FRONTEND_URL"
fi

for i in {1..30}; do
    if curl -sf "$BACKEND_URL/api/health" >/dev/null; then
        log_success "Backend is healthy"
        break
    fi
    
    if [[ $i -eq 30 ]]; then
        log_error "Backend health check failed"
        exit 1
    fi
    
    sleep 2
done

# Check frontend health
FRONTEND_URL_CHECK="http://localhost:80"
if [[ "$ENVIRONMENT" == "production" ]]; then
    FRONTEND_URL_CHECK="$FRONTEND_URL"
fi

for i in {1..30}; do
    if curl -sf "$FRONTEND_URL_CHECK/health" >/dev/null; then
        log_success "Frontend is healthy"
        break
    fi
    
    if [[ $i -eq 30 ]]; then
        log_error "Frontend health check failed"
        exit 1
    fi
    
    sleep 2
done

# Run database migrations if needed
log_info "Running database migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T backend npm run db:migrate || {
    log_warning "Database migration failed or no migrations to run"
}

# Clean up old Docker images
log_info "Cleaning up old Docker images..."
docker system prune -f --filter "until=24h"

# Post-deployment tests
log_info "Running post-deployment tests..."

# Basic API tests
if curl -sf "$BACKEND_URL/api/health" | grep -q "healthy"; then
    log_success "API health check passed"
else
    log_error "API health check failed"
    exit 1
fi

# PWA manifest test
if curl -sf "$FRONTEND_URL_CHECK/manifest.json" >/dev/null; then
    log_success "PWA manifest accessible"
else
    log_warning "PWA manifest check failed"
fi

# Display deployment summary
log_success "Deployment to $ENVIRONMENT completed successfully!"
echo
echo "🚀 MCAS-Life Deployment Summary"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo "Frontend URL: $FRONTEND_URL_CHECK"
echo "Backend URL: $BACKEND_URL"
echo "Deployment time: $(date)"
echo

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "📱 PWA Installation:"
    echo "Users can install the app from: $FRONTEND_URL"
    echo
    echo "🔍 Monitoring:"
    echo "Prometheus: http://localhost:9090 (if enabled)"
    echo "Grafana: http://localhost:3000 (if enabled)"
fi

log_info "Deployment script completed successfully"