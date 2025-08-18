# Frontend Dockerfile - Multi-stage for PWA production build
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/ ./shared/

# Install all dependencies including dev
RUN npm ci

# Copy source code
COPY frontend/ ./frontend/

# Build the application
WORKDIR /app/frontend
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS runtime

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy PWA assets to proper locations
RUN mkdir -p /usr/share/nginx/html/.well-known

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]