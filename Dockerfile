# ==================== STAGE 1: Build Frontend ====================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm install --omit=dev

# Copy frontend source and build
COPY frontend/ ./
ARG VITE_API_URL=https://mcas-life.greger.cc/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ==================== STAGE 2: Build Backend ====================
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./

# ==================== STAGE 3: Runtime ====================
FROM node:20-alpine

# Install nginx and supervisord for running both services
RUN apk add --no-cache nginx supervisor wget

# Create non-root user
RUN addgroup -g 1001 mcas && \
    adduser -D -u 1001 -G mcas mcas

WORKDIR /app

# Copy backend from build stage
COPY --from=backend-build --chown=mcas:mcas /app/backend ./backend

# Copy frontend build to nginx html dir
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create supervisor config
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisord.conf

# Expose ports
EXPOSE 3000 3001

# Health check (checks both services)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health && \
      wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start supervisor to run both nginx and backend
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
