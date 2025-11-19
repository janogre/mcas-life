# Migrering til Supabase - Steg-for-steg Guide

## Oversikt
Denne guiden hjelper deg med å migrere MCAS-Life database fra lokal Docker PostgreSQL til Supabase.

## Hvorfor Supabase?
- ✅ Managed PostgreSQL database (ingen vedlikehold)
- ✅ Automatisk backup og point-in-time recovery
- ✅ Row Level Security (RLS) for HIPAA compliance
- ✅ Real-time subscriptions (for fremtidige features)
- ✅ Gratis tier: 500 MB database, 2 GB storage
- ✅ Integrert autentisering (kan erstatte JWT senere)

---

## Steg 1: Opprett Supabase Prosjekt

### 1.1 Registrer deg på Supabase
1. Gå til [supabase.com](https://supabase.com)
2. Klikk "Start your project"
3. Logg inn med GitHub (anbefalt)

### 1.2 Opprett nytt prosjekt
1. Klikk "New Project"
2. Fyll ut:
   - **Name**: `mcas-life-production` (eller `mcas-life-dev` for testing)
   - **Database Password**: Generer et sterkt passord (lagre dette trygt!)
   - **Region**: `Europe (Frankfurt)` eller `Europe (London)` (nærmest Norge)
   - **Pricing Plan**: "Free" for testing, "Pro" for produksjon

3. Vent 2-3 minutter mens Supabase setter opp databasen

### 1.3 Hent Connection String
1. Når prosjektet er klart, gå til **Settings** → **Database**
2. Scroll ned til **Connection string**
3. Velg **URI** (ikke Supavisor)
4. Kopier connection string (ser slik ut):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

---

## Steg 2: Oppdater Backend Konfigurasjon

### 2.1 Oppdater `.env` fil
Opprett eller oppdater `backend/.env` med Supabase connection string:

```bash
# Supabase Database Configuration
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# SSL er påkrevd for Supabase
DATABASE_SSL=true

# Øk max connections for cloud database
DATABASE_MAX_CONNECTIONS=5
DATABASE_IDLE_TIMEOUT=20

# Resten forblir det samme
NODE_ENV=development
PORT=3001
JWT_SECRET=change-this-to-a-long-random-secret-in-production
# ... etc
```

**VIKTIG**: Erstatt `[YOUR-PASSWORD]` med det faktiske passordet fra Supabase.

### 2.2 Oppdater Connection SSL Settings
Ingen kodeendringer nødvendig! `connection.ts` håndterer allerede SSL automatisk:
```typescript
ssl: DATABASE_SSL  // ✅ Allerede implementert
```

Men for ekstra sikkerhet, oppdater `.env`:
```bash
DATABASE_SSL=require  # For produksjon
```

---

## Steg 3: Kjør Migrasjoner mot Supabase

### 3.1 Generer fresh migrations (anbefalt)
Siden du har eksisterende migrations, kan du enten:

**Alternativ A: Bruk eksisterende migrations**
```bash
cd backend

# Generer ny migration fra schema (anbefalt for Supabase)
npm run db:generate

# Dette oppretter en ny migration basert på schema.ts
```

**Alternativ B: Push direkt til Supabase (raskere for testing)**
```bash
cd backend

# Push schema direkte til Supabase uten migration filer
npx drizzle-kit push
```

### 3.2 Kjør migrations
```bash
cd backend

# Installer dependencies hvis ikke allerede gjort
npm install

# Kjør migrations mot Supabase
npm run db:migrate

# Du skal se:
# ✅ Applying migration: 0000_pretty_zeigeist.sql
# ✅ Applying migration: 0001_mixed_whirlwind.sql
# ... etc
```

### 3.3 Verifiser schema i Supabase
1. Gå til Supabase dashboard
2. Klikk **Table Editor** i sidebar
3. Du skal nå se alle tabeller:
   - users
   - mcas_profiles
   - foods
   - approved_foods
   - personal_food_ratings
   - food_diary_entries
   - symptom_entries
   - supplement_entries
   - health_metrics
   - trigger_analyses
   - ... osv

---

## Steg 4: Import SIGHI Food Data

### 4.1 Kjør food import script
```bash
cd backend

# Importer 849 SIGHI foods til Supabase
npm run import:sighi
```

Dette skal skrive ut:
```
✅ Imported 849 foods successfully
```

### 4.2 Verifiser i Supabase
I Table Editor, klikk på `foods` tabellen. Du skal se 849 rader.

---

## Steg 5: Test Database Connection

### 5.1 Test med backend server
```bash
cd backend

# Start backend server
npm run dev

# Du skal se:
# 🔍 DATABASE_URL loaded: postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres
# ✅ Database connection established
# 🚀 Server running on http://localhost:3001
```

### 5.2 Test med health check
Åpne i nettleser eller curl:
```bash
curl http://localhost:3001/health
```

Skal returnere:
```json
{
  "status": "healthy",
  "database": {
    "status": "healthy",
    "latency": 45
  }
}
```

### 5.3 Test med Drizzle Studio
```bash
cd backend

# Åpne Drizzle Studio mot Supabase
npm run db:studio
```

Åpne https://local.drizzle.studio i nettleser. Du skal kunne browse alle tabeller.

---

## Steg 6: Oppdater Frontend Configuration

Frontend trenger ingen endringer! Den kobler til backend API som nå bruker Supabase.

Men hvis du vil bruke Supabase Auth senere (erstatte JWT):

### 6.1 Installer Supabase client
```bash
cd frontend
npm install @supabase/supabase-js
```

### 6.2 Opprett Supabase client (fremtidig funksjonalitet)
`frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Men **IKKE implementer dette nå** - behold JWT auth som den er.

---

## Steg 7: Sikkerhet og Best Practices

### 7.1 Row Level Security (RLS) - VIKTIG for produksjon

Supabase anbefaler RLS for alle tabeller. Gå til Supabase:

1. Gå til **Authentication** → **Policies**
2. For hver tabell (users, symptom_entries, etc):

**Eksempel policy for `symptom_entries`:**
```sql
-- Enable RLS
ALTER TABLE symptom_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own symptoms
CREATE POLICY "Users can view own symptoms"
ON symptom_entries
FOR SELECT
USING (user_id = auth.uid()::integer);

-- Policy: Users can insert their own symptoms
CREATE POLICY "Users can insert own symptoms"
ON symptom_entries
FOR INSERT
WITH CHECK (user_id = auth.uid()::integer);

-- Policy: Users can update their own symptoms
CREATE POLICY "Users can update own symptoms"
ON symptom_entries
FOR UPDATE
USING (user_id = auth.uid()::integer);
```

**MEN**: Siden du bruker JWT (ikke Supabase Auth), må du **IKKE** aktivere RLS nå.
RLS fungerer best med Supabase Auth. Behold backend middleware for authorization.

### 7.2 Database Backup

Supabase Pro inkluderer:
- Point-in-time recovery (siste 7 dager)
- Daglige backups

For Free tier:
- Manuell backup anbefales ukentlig
- Gå til **Database** → **Backups** for å eksportere SQL dump

### 7.3 Connection Pooling

Supabase har innebygd connection pooling. Oppdater `.env`:

```bash
# For høy trafikk, bruk Supavisor (transaction mode)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true

# Standard (session mode) - anbefalt for Drizzle
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

---

## Steg 8: Verifiser Full Funksjonalitet

### 8.1 Test alle hovedfunksjoner

1. **Auth**: Registrer bruker → Logg inn
2. **Foods**: Søk i SIGHI database
3. **Diary**: Legg til måltid
4. **Symptoms**: Registrer symptom
5. **Analytics**: Kjør trigger correlation (når diary fungerer)

### 8.2 Test fra frontend
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Åpne http://localhost:3000
```

Test full brukerflyt:
1. Registrer ny bruker
2. Logg inn
3. Søk etter mat
4. Legg til i trygg mat-liste
5. Registrer måltid
6. Registrer symptom
7. Sjekk dashboard

---

## Steg 9: Miljøvariabler for Produksjon

### 9.1 Opprett production database
I Supabase, opprett **nytt prosjekt** for produksjon:
- Name: `mcas-life-production`
- Region: samme som dev
- Plan: Pro ($25/måned for HIPAA compliance)

### 9.2 Deployment environment variables
For Vercel/Railway/Render deployment:

```bash
# Production
DATABASE_URL=postgresql://postgres:[PROD-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DATABASE_SSL=require
NODE_ENV=production
JWT_SECRET=[LONG-RANDOM-SECRET-GENERATED-WITH-openssl-rand-base64-32]

# Staging
DATABASE_URL=postgresql://postgres:[STAGING-PASSWORD]@db.yyyyy.supabase.co:5432/postgres
DATABASE_SSL=require
NODE_ENV=staging
```

---

## Steg 10: Monitoring og Vedlikehold

### 10.1 Supabase Dashboard Monitoring
Gå til **Database** → **Monitoring**:
- Database size
- Active connections
- Query performance

### 10.2 Alerts (Pro plan)
Sett opp alerts for:
- Database size > 80%
- Connection pool exhausted
- Slow queries > 1s

### 10.3 Indexes for Performance
Supabase har automatisk indexes fra migrations, men verifiser:

```sql
-- Sjekk indexes i Supabase SQL Editor
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;
```

---

## Troubleshooting

### Problem: "Connection refused"
**Løsning**: Sjekk at DATABASE_URL er korrekt kopiert. Vanlig feil: glemt å erstatte `[YOUR-PASSWORD]`.

### Problem: "SSL required"
**Løsning**: Legg til i `.env`:
```bash
DATABASE_URL=postgresql://...?sslmode=require
```

### Problem: "Too many connections"
**Løsning**: Reduser `DATABASE_MAX_CONNECTIONS` i `.env` til 3-5.

### Problem: Migrations feiler
**Løsning**:
```bash
# Reset database (VÆR FORSIKTIG - sletter all data!)
npx drizzle-kit drop

# Deretter kjør migrations på nytt
npm run db:migrate
```

### Problem: "relation does not exist"
**Løsning**: Migrations ikke kjørt. Kjør `npm run db:migrate`.

---

## Kostnad og Limits

### Free Tier
- ✅ 500 MB database storage
- ✅ 2 GB file storage
- ✅ 50 MB file upload size
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ 500 MB Edge Functions invocations

**Perfekt for utvikling og MVP!**

### Pro Tier ($25/mnd)
- 8 GB database storage
- 100 GB file storage
- 5 GB file upload size
- 250 GB bandwidth
- 100,000 MAU
- Daily backups

### Enterprise (HIPAA Compliance)
For medisinsk godkjenning, kontakt Supabase for HIPAA Business Associate Agreement (BAA).

---

## Neste Steg

✅ **Umiddelbart**: Test at Supabase connection fungerer
✅ **Denne uken**: Implementer diary database persistence (erstatt in-memory array)
✅ **Neste uke**: Test full analytics correlation flow
⚠️ **Før produksjon**: Vurder Supabase Auth (erstatt JWT)
⚠️ **Før produksjon**: Sett opp backups og monitoring

---

## Kontakt og Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Drizzle Docs**: https://orm.drizzle.team/docs/overview

God migrasjon! 🚀
