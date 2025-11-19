# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCAS-Life is a comprehensive health and food diary app for MCAS (Mast Cell Activation Syndrome) patients. It features a React PWA frontend, Node.js/Express backend with microservices architecture, PostgreSQL database, and AI-driven symptom correlation analysis.

**Key Domain Concepts:**
- **SIGHI Food Database**: 849+ foods with official 0-3 compatibility scale (0=Safe, 1=Medium, 2=Incompatible, 3=Severe)
- **Personal Food Ratings**: Independent 0-3 scale ratings separate from approved foods list
- **Norwegian Trigger Names**: Localized trigger display (Histamin, Histaminliberator, Andre aminer, etc.)
- **Safe Foods Management**: User-curated list separate from personal ratings system
- **72-hour Correlation Analysis**: AI-driven trigger detection across extended time windows
- **MCAS-specific Features**: Histamine tracking, biogenic amines, mast cell triggers
- **HIPAA-compliant**: Medical-grade data handling and security

## Architecture

### Monorepo Structure
```
MCAS-life/
├── frontend/          # React PWA (Vite + TypeScript + Tailwind)
├── backend/           # Node.js Express API with microservices
├── shared/            # Common TypeScript types (future)
└── docker-compose.yml # Local development environment
```

### Microservices Design
- **Auth Service** (`backend/src/services/auth/`): JWT authentication, MCAS user profiles
- **Food Service** (`backend/src/services/food/`): SIGHI database, nutrition data, search, personal ratings
  - `foodService.ts` - Core SIGHI food database operations
  - `personalRatingService.ts` - Personal rating management (independent from safe foods)
  - `foodRoutes.ts` - RESTful API endpoints with rate limiting
- **Analytics Service** (`backend/src/services/analytics/`): AI correlation, trigger patterns
- **Diary Service** (`backend/src/routes/diary.ts`): Meals, symptoms, supplements tracking

### Database Schema (PostgreSQL + Drizzle ORM)
- **Core Tables**: users, mcas_profiles, user_preferences, user_sessions
- **Food Data**: foods table with 849 SIGHI entries, JSONB for biogenic amines and triggers
- **Personal Ratings**: personal_food_ratings table (separate from approved_foods for independent rating)
- **Safe Foods**: approved_foods table for user-curated safe food lists
- **Diary Tables**: diary_entries (polymorphic: meals/symptoms/supplements/health_metrics)
- **Analytics**: Designed for temporal correlation queries across 72-hour windows

## Development Commands

### Root Level (Concurrent Development)
```bash
# Start both frontend and backend in development mode
npm run dev

# Install all dependencies (root, backend, frontend)
npm run install:all

# Build production bundles
npm run build

# Run all tests
npm run test
```

### Backend Development
```bash
cd backend

# Development server with hot reload
npm run dev

# Database operations
npm run db:migrate          # Run Drizzle migrations
npm run db:push            # Push schema to database (faster for Supabase)
npm run db:generate        # Generate new migration from schema changes
npm run db:studio          # Open Drizzle Studio GUI
npm run db:test            # Test database connection (especially for Supabase)
npm run import:sighi       # Import SIGHI food data (849 foods)
npm run supabase:setup     # Full Supabase setup (push + import + test)

# Testing and linting
npm run test               # Vitest test suite
npm run test:coverage      # Coverage reports
npm run lint               # ESLint TypeScript
npm run lint:fix           # Auto-fix linting issues

# Demo scripts (for development/testing)
npm run demo:auth          # Test authentication flows
npm run demo:food          # Test food database queries
npm run demo:analytics     # Test AI correlation algorithms
```

### Frontend Development
```bash
cd frontend

# Vite development server with HMR
npm run dev

# Type checking and testing
npm run typecheck          # TypeScript compilation check
npm run test               # Vitest + React Testing Library
npm run test:ui           # Interactive test UI

# Linting and building
npm run lint              # ESLint for React/TypeScript
npm run build             # Production build
npm run preview           # Preview production build
```

## Key Implementation Patterns

### Authentication Flow
- JWT access tokens (4h lifetime) + refresh tokens (7d)
- MCAS-specific user onboarding with severity assessment
- Session management in `user_sessions` table with automatic cleanup
- Frontend token refresh via Axios interceptors

### Database Patterns
- **Drizzle ORM**: Type-safe queries, migrations in `backend/src/db/`
- **JSONB Fields**: Biogenic amines, nutrition data, trigger arrays
- **Temporal Data**: Timestamps for correlation analysis
- **SIGHI Integration**: Official food compatibility scale (0-3)

### API Structure
- **RESTful endpoints**: `/api/auth`, `/api/foods`, `/api/diary`, `/api/analytics`
- **Food API endpoints**: 
  - `/api/foods/search` - SIGHI food database search with filtering
  - `/api/foods/approved` - User's safe foods list management
  - `/api/foods/ratings` - Personal food ratings (independent from safe list)
  - `/api/foods/:id`, `/api/foods/compatibility/:level`, `/api/foods/trigger/:trigger`
- **Rate Limiting**: 100 search requests/min, 60 rating updates/min, 500 total requests/15min
- **Middleware chain**: CORS → Helmet → Compression → Rate Limiting → Auth → Routes
- **Error handling**: Centralized error middleware with MCAS-specific error types
- **Validation**: Zod schemas for request/response validation

### Frontend Patterns
- **React Query**: API state management, caching, optimistic updates
- **Tailwind + Custom Classes**: MCAS-specific color system (green=safe, red=severe)
- **PWA Features**: Service worker, offline support, installable app
- **Responsive Design**: Mobile-first with bottom navigation

### Food Rating System Architecture
- **Personal Ratings**: Stored in `personal_food_ratings` table, independent from safe foods
- **Safe Foods List**: Stored in `approved_foods` table, for user-curated safe foods
- **SIGHI vs Personal Comparison**: Side-by-side display showing both official and personal ratings
- **Visual Indicators**: Color-coded ratings with "Avvikende vurdering" badges when ratings differ
- **Trigger Display**: Norwegian localized trigger names with color-coded badges and tooltips
- **Quick Rating Interface**: 0-3 scale buttons for immediate rating without adding to safe list

## Environment Configuration

### Required Environment Variables

#### Option 1: Local PostgreSQL (Docker)
```bash
# Backend (.env)
DATABASE_URL=postgresql://mcas_user:mcas_password@localhost:5432/mcas_life
JWT_SECRET=your-production-jwt-secret
NODE_ENV=development
PORT=3001

# Frontend (.env)
VITE_API_URL=http://localhost:3001/api
```

#### Option 2: Supabase (Cloud) - RECOMMENDED
```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DATABASE_SSL=require
DATABASE_MAX_CONNECTIONS=5
JWT_SECRET=your-production-jwt-secret
NODE_ENV=development
PORT=3001

# Frontend (.env)
VITE_API_URL=http://localhost:3001/api
```

**See SUPABASE_QUICKSTART.md for 5-minute setup guide!**

### Database Setup

#### Local PostgreSQL Setup
```bash
# PostgreSQL setup
createdb mcas_life
createuser mcas_user --pwprompt

# Run migrations and import SIGHI data
cd backend
npm run db:migrate
npm run import:sighi
```

#### Supabase Setup (Recommended)
```bash
# 1. Create Supabase project at supabase.com
# 2. Copy connection string to .env
# 3. Run one-liner setup:
cd backend
npm run supabase:setup

# Or manual steps:
npm run db:push          # Push schema to Supabase
npm run import:sighi     # Import 849 SIGHI foods
npm run db:test          # Verify connection
```

## MCAS-Specific Domain Logic

### SIGHI Food Compatibility Scale
- **0 (Safe)**: Green - Generally well tolerated
- **1 (Medium)**: Yellow - Moderate histamine/triggers
- **2 (Incompatible)**: Orange - High histamine, avoid
- **3 (Severe)**: Red - Very high histamine, strictly avoid

### Correlation Analysis Algorithm
Located in `backend/src/services/analytics/` - implements 8-factor correlation:
1. **Temporal proximity** (food consumption → symptom onset)
2. **Histamine load** (cumulative biogenic amines)
3. **Personal tolerance** (user-specific reaction history)
4. **SIGHI compatibility** (official database ratings)
5. **Trigger patterns** (known individual triggers)
6. **Symptom severity** (weighted scoring)
7. **Environmental factors** (stress, sleep, activity)
8. **Statistical confidence** (sample size, pattern consistency)

### Diary Entry Types
All stored in polymorphic `diary_entries` table with `type` field:
- **meal**: Foods consumed with timestamp and quantities
- **symptom**: Symptom type, severity (1-10), duration, location
- **supplement**: Antihistamines, DAO, mast cell stabilizers
- **health_metric**: Sleep, energy, stress, mood (1-10 scales)

## Development Notes

### Common Debugging Steps
1. **Auth Issues**: Check JWT token format and expiration in browser DevTools
2. **Database Errors**: Verify PostgreSQL connection and run migrations
3. **SIGHI Data**: Ensure food import completed (should have 849 foods)
4. **CORS Issues**: Check frontend URL matches backend CORS_ORIGIN

### Testing Strategy
- **Backend**: Vitest for unit tests, demo scripts for integration
- **Frontend**: React Testing Library + Vitest for components
- **Database**: Migration tests and seed data validation
- **API**: Comprehensive endpoint testing with realistic MCAS scenarios

### Performance Considerations
- **Food Search**: Indexed queries on food names and compatibility
- **Correlation Analysis**: Optimized temporal queries with proper indexing
- **Frontend Caching**: React Query with 5-minute stale time
- **Database**: Connection pooling and query optimization for large datasets

### Security Implementation
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Zod schemas for all API endpoints
- **SQL Injection**: Drizzle ORM provides parameterized queries
- **XSS Protection**: Helmet middleware with CSP headers
- **HIPAA Compliance**: Secure session management, audit logging ready