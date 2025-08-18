# Backend Dockerfile - Multi-stage for production optimization
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Install dev dependencies for build
FROM base AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/ ./shared/

# Install all dependencies including dev
RUN npm ci

# Copy source code
COPY backend/ ./backend/

# Build the application
WORKDIR /app/backend
RUN npm run build

# Production image
FROM base AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mcas

# Copy built application
COPY --from=build --chown=mcas:nodejs /app/backend/dist ./dist
COPY --from=build --chown=mcas:nodejs /app/shared ./shared
COPY --from=deps --chown=mcas:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=mcas:nodejs /app/backend/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER mcas

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]