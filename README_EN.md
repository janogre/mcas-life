# MCAS-Life Developer Setup Guide

**Comprehensive Health and Food Diary App for MCAS Patients**

This is the English technical documentation for MCAS-Life, a sophisticated web application designed specifically for MCAS (Mast Cell Activation Syndrome) patients. For the comprehensive Norwegian documentation, see [README.md](./README.md).

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm 8+**
- **PostgreSQL 13+**
- **Git**

### 1. Clone and Install
```bash
git clone <repository-url>
cd MCAS-life

# Install all dependencies (root, backend, frontend)
npm run install:all
```

### 2. Environment Configuration

**Backend** (`backend/.env`):
```env
# Database
DATABASE_URL=postgresql://mcas_user:mcas_password@localhost:5432/mcas_life

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Optional: Email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@mcaslife.no
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb mcas_life
createuser mcas_user --pwprompt

# Run migrations and import SIGHI food data
cd backend
npm run db:migrate
npm run import:sighi
```

### 4. Start Development
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
# Backend: http://localhost:3001
cd backend && npm run dev

# Frontend: http://localhost:3000  
cd frontend && npm run dev
```

## 📁 Project Structure

```
MCAS-life/
├── frontend/                    # React PWA (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components and routing
│   │   ├── contexts/          # React contexts (Auth, API, etc.)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and API client
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── package.json
├── backend/                     # Node.js Express API with microservices
│   ├── src/
│   │   ├── services/          # Microservices architecture
│   │   │   ├── auth/          # JWT authentication, MCAS user profiles
│   │   │   ├── food/          # SIGHI database, nutrition data, search
│   │   │   ├── analytics/     # AI correlation, trigger patterns
│   │   │   ├── symptoms/      # Symptom tracking with context
│   │   │   └── health/        # Daily health metrics
│   │   ├── db/                # Database connection and schema
│   │   ├── middleware/        # Express middleware (auth, validation, etc.)
│   │   ├── routes/            # Legacy routes (being migrated to services)
│   │   └── __tests__/         # Vitest test suites
│   └── package.json
├── shared/                      # Common TypeScript types (future)
├── database/                    # SIGHI data and scripts
├── docker-compose.yml          # Local development environment
└── package.json               # Root workspace configuration
```

## 🛠️ Development Commands

### Root Level Commands
```bash
# Concurrent development (recommended)
npm run dev                     # Start both frontend and backend
npm run install:all            # Install all dependencies
npm run build                  # Build all services for production
npm run test                   # Run all test suites

# Environment-specific
npm run dev:backend            # Backend only (port 3001)
npm run dev:frontend           # Frontend only (port 3000)
npm run build:backend          # Build backend for production
npm run build:frontend         # Build frontend for production
```

### Backend Development
```bash
cd backend

# Development
npm run dev                    # Hot reload development server
npm run build                  # TypeScript compilation
npm start                     # Production server

# Database operations
npm run db:migrate             # Run Drizzle migrations
npm run db:studio             # Open Drizzle Studio GUI
npm run import:sighi          # Import/update SIGHI food data (849 foods)
npm run db:seed               # Seed database with test data

# Testing and quality
npm test                      # Vitest test suite
npm run test:coverage         # Coverage reports with v8
npm run test:watch           # Watch mode for development
npm run lint                 # ESLint TypeScript code
npm run lint:fix             # Auto-fix linting issues

# Demo scripts for development
npm run demo:auth            # Test authentication flows
npm run demo:food            # Test food database operations  
npm run demo:analytics       # Test AI correlation algorithms
```

### Frontend Development
```bash
cd frontend

# Development
npm run dev                   # Vite development server with HMR
npm run build                 # Production build
npm run preview              # Preview production build locally

# Testing and quality
npm test                     # Vitest + React Testing Library
npm run test:ui              # Interactive test UI
npm run test:coverage        # Test coverage reports
npm run typecheck           # TypeScript compilation check
npm run lint                # ESLint for React/TypeScript
npm run lint:fix            # Auto-fix linting issues

# PWA and deployment
npm run build:pwa           # Build with PWA optimizations
npm run analyze             # Bundle size analysis
```

## 🗄️ Database Schema

The application uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations:

### Core Tables
- **users**: User authentication and profiles
- **mcas_profiles**: MCAS-specific user health data  
- **user_preferences**: App settings and notification preferences
- **user_sessions**: JWT session management

### Food Database
- **foods**: 849 SIGHI foods with compatibility ratings (0-3 scale)
- **personal_food_ratings**: User's personal food ratings (independent system)
- **approved_foods**: User-curated safe foods list

### Health Tracking
- **diary_entries**: Polymorphic table (meals/symptoms/supplements/metrics)
- **symptom_entries**: Detailed symptom tracking with environmental context
- **health_metrics**: Daily health context (sleep, stress, energy, etc.)

### Analytics
- **trigger_analyses**: AI correlation analysis results
- **correlation_data**: Historical trigger patterns for ML

### Key Design Features
- **JSONB fields** for biogenic amines, nutrition data, and trigger arrays
- **Temporal indexing** for efficient 72-hour correlation queries
- **HIPAA-compliant** audit fields and data retention policies
- **Norwegian localization** for trigger names and food descriptions

## 🔒 Authentication & Security

### JWT Authentication Flow
```typescript
// Registration creates MCAS profile
POST /api/auth/register
{
  email, username, password,
  mcas_severity: 'mild' | 'moderate' | 'severe',
  confirmed_diagnosis: boolean,
  // ... other MCAS-specific fields
}

// Login returns access + refresh tokens
POST /api/auth/login
{
  access_token: string,      // 15 minutes
  refresh_token: string,     // 7 days
  user: { id, email, role }
}

// Token refresh
POST /api/auth/refresh
```

### Security Features
- **Secure password hashing** with bcrypt (12 rounds)
- **JWT tokens** with short expiration and refresh mechanism
- **Rate limiting** per endpoint type (analytics: 5/15min, search: 100/15min)
- **Input validation** with Zod schemas
- **CORS protection** with environment-specific origins
- **Helmet middleware** for security headers
- **Role-based access** (patient, expert, researcher, admin)

## 🤖 AI Analytics API

The analytics service provides sophisticated trigger correlation analysis:

### Core Endpoints
```bash
# Full 72-hour AI correlation analysis
POST /api/analytics/trigger-correlation
{
  "symptom_entry_id": 123,
  "analysis_window_hours": 72  # optional, default 72
}

# Real-time quick trigger check  
POST /api/analytics/quick-trigger-check
{
  "foods_consumed": [
    {
      "food_id": 456,
      "food_name": "Tomatoes", 
      "consumed_at": "2025-01-15T10:30:00Z",
      "sighi_compatibility": "2"
    }
  ],
  "current_symptoms": [
    {
      "type": "headache",
      "severity": 7,
      "started_at": "2025-01-15T14:00:00Z"
    }
  ]
}

# Preventive risk assessment
POST /api/analytics/real-time-risk
{
  "planned_food_ids": [789, 101],
  "risk_threshold": 0.3
}

# User's analysis history
GET /api/analytics/user-analyses?limit=10&confidence_threshold=0.5
```

### 8-Factor Correlation Algorithm
1. **Temporal proximity** (food consumption → symptom onset)
2. **Histamine load** (cumulative biogenic amines)
3. **Personal tolerance** (user-specific reaction history)
4. **SIGHI compatibility** (official database ratings)
5. **Trigger patterns** (known individual triggers)
6. **Symptom severity** (weighted scoring)
7. **Environmental factors** (stress, sleep, activity)
8. **Statistical confidence** (sample size, pattern consistency)

## 🍎 Food Database API

Comprehensive SIGHI food database with advanced filtering:

```bash
# Smart food search with filters
GET /api/foods/search?q=tomato&compatibility=0,1&category=vegetables&limit=20

# Get specific food with full details
GET /api/foods/123

# Personal food ratings (independent from safe list)
GET /api/foods/ratings
POST /api/foods/ratings
{
  "food_id": 123,
  "personal_rating": 2,        # 0-3 scale
  "notes": "Causes headaches"
}

# User's safe foods list
GET /api/foods/approved
POST /api/foods/approved
{
  "food_id": 123,
  "personal_notes": "Works well in small amounts"
}

# Norwegian trigger information
GET /api/foods/triggers/histamin    # Norwegian localized
```

### SIGHI Compatibility Scale
- **0 (Trygg)**: Green - Generally well tolerated
- **1 (Medium)**: Yellow - Moderate histamine/triggers  
- **2 (Unngå)**: Orange - High histamine, avoid
- **3 (Alvorlig)**: Red - Very high histamine, strictly avoid

## 📊 Health Tracking API

Extended symptom and health context tracking:

```bash
# Log detailed symptom with environmental context
POST /api/symptoms/log
{
  "type": "digestive",
  "symptoms": ["stomach_pain", "nausea"],
  "severity": 8,
  "location": "upper_abdomen",
  "dao_taken": true,
  "dao_timing": "30_min_before_meal",
  "compression_garments": true,
  "stress_level": 6,
  "sleep_hours": 5.5,
  "triggers": ["stress", "lack_of_sleep"]
}

# Daily health metrics for correlation analysis
POST /api/health/daily-context
{
  "sleep_quality": 7,
  "energy_level": 4,
  "stress_level": 8,
  "mood": 5,
  "dao_supplement": true,
  "antihistamine_taken": "loratadine",
  "weather_pressure": "falling"
}

# Get symptom patterns and analysis
GET /api/symptoms/patterns?days=30
GET /api/health/risk-analysis
```

## 🧪 Testing

### Test Infrastructure
- **Vitest** for fast unit testing
- **React Testing Library** for component testing
- **Comprehensive mocking** for database and external services
- **TypeScript** test support with proper type checking

### Run Tests
```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage with v8

# Frontend tests
cd frontend  
npm test                 # Vitest + React Testing Library
npm run test:ui          # Interactive test UI
npm run test:coverage    # Coverage reports

# All tests from root
npm test                 # Run backend + frontend tests
```

### Test Structure
```bash
backend/src/__tests__/
├── authService.test.ts           # Auth service integration tests
├── authService.unit.test.ts      # Auth service unit tests
├── food.demo.test.ts            # Food database demo tests
├── auth.demo.test.ts            # Auth demo tests  
├── testHelpers.ts               # Mock data and utilities
└── setup.ts                     # Global test configuration
```

## 🐳 Docker Development

### Development with Docker
```bash
# Start all services with Docker Compose
docker-compose up --build

# Individual services
docker-compose up database      # PostgreSQL only
docker-compose up backend       # Backend API
docker-compose up frontend      # Frontend dev server
```

### Production Docker Setup
```bash
# Production build and deployment
docker-compose -f docker-compose.prod.yml up -d

# Environment-specific configs
docker-compose -f docker-compose.staging.yml up -d
```

## 🚀 Production Deployment

### Build and Deploy
```bash
# Build all services for production
npm run build

# Start production server
npm start

# Environment checks
npm run typecheck         # TypeScript compilation
npm run lint             # Code quality
npm test                 # All tests
```

### Environment Variables (Production)
```env
# Backend production config
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/mcas_life
JWT_SECRET=production-secure-key-32-characters-minimum
CORS_ORIGIN=https://mcaslife.no,https://www.mcaslife.no
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Optional: Redis for session storage
REDIS_URL=redis://prod-redis:6379

# Email service (production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@mcaslife.no
SMTP_PASS=production-email-password
FROM_EMAIL=MCAS-Life <noreply@mcaslife.no>
```

### Health Monitoring
```bash
# Health check endpoints
GET /api/health                    # General health
GET /api/health/database           # Database connectivity
GET /api/analytics/health-check    # Analytics service status

# Performance metrics
GET /api/health/stats              # Database statistics
GET /api/health/performance        # API performance metrics
```

## 📱 PWA Features

The frontend is a full Progressive Web App with:

### Service Worker Features
- **Offline functionality** for critical features
- **Smart caching** strategies for SIGHI data
- **Background sync** for symptom entries
- **Push notifications** for medication reminders
- **Install prompts** for app-like experience

### Performance Optimizations
- **Code splitting** by route and feature
- **Lazy loading** for non-critical components  
- **Image optimization** with proper formats
- **Bundle analysis** and size monitoring
- **Lighthouse score** optimization (90+ target)

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** with comprehensive tests
4. **Run quality checks**: `npm run lint && npm test`
5. **Commit** with descriptive message
6. **Push** and create Pull Request

### Code Quality Standards
- **TypeScript strict mode** enabled
- **ESLint** configuration for consistent style
- **Prettier** integration for formatting
- **Comprehensive test coverage** (>80% target)
- **Type-safe database operations** with Drizzle
- **Security-first** development practices

### Commit Convention
```bash
feat: add real-time trigger analysis endpoints
fix: resolve correlation analysis edge case  
docs: update API documentation
test: add analytics service integration tests
perf: optimize SIGHI database query performance
security: add rate limiting to sensitive endpoints
```

## 📄 License

Private and proprietary. All rights reserved.

## 📞 Support

- **GitHub Issues**: Technical problems and feature requests
- **Email**: dev@mcaslife.no (development team)

---

**Built with ❤️ for the MCAS community**

*Empowering MCAS patients with AI-driven insights and comprehensive health tracking.*