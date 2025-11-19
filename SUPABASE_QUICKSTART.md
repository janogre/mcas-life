# Supabase Quick Start Guide

Rask guide for å komme i gang med Supabase på 5 minutter.

## 1. Opprett Supabase Prosjekt (2 min)

1. Gå til https://supabase.com
2. Klikk "Start your project" → Logg inn med GitHub
3. Klikk "New Project"
4. Fyll ut:
   - **Name**: `mcas-life-dev`
   - **Database Password**: Klikk "Generate a password" (kopier og lagre!)
   - **Region**: `Europe (Frankfurt)`
   - **Plan**: Free
5. Klikk "Create new project"
6. Vent 2-3 minutter

## 2. Hent Connection String (1 min)

1. Når prosjektet er klart, gå til **Settings** (tannhjul-ikon nederst i sidebar)
2. Klikk **Database** i venstremenyen
3. Scroll ned til **Connection string**
4. Velg **URI** (IKKE Supavisor)
5. Kopier hele connection string

Den ser slik ut:
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

## 3. Oppdater Backend .env (30 sekunder)

Åpne `backend/.env` (eller opprett den fra `.env.example`):

```bash
# Erstatt DATABASE_URL med din Supabase connection string
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# Legg til SSL-krav for Supabase
DATABASE_SSL=require

# Reduser connections for cloud database
DATABASE_MAX_CONNECTIONS=5
```

## 4. Migrer Database (1 min)

```bash
cd backend

# Push schema til Supabase (raskere enn migrate)
npm run db:push

# ELLER kjør migrations (tradisjonell metode)
npm run db:migrate
```

Du skal se:
```
✅ Applying migration: 0000_pretty_zeigeist.sql
✅ Applying migration: 0001_mixed_whirlwind.sql
...
✅ All migrations applied successfully
```

## 5. Importer SIGHI Data (30 sekunder)

```bash
npm run import:sighi
```

Du skal se:
```
✅ Imported 849 foods successfully
```

## 6. Test Connection (30 sekunder)

```bash
npm run db:test
```

Du skal se:
```
✅ Database connection: HEALTHY
✅ Found 15 tables
✅ Supabase Connection Test: PASSED
```

## 7. Start Backend (30 sekunder)

```bash
npm run dev
```

Du skal se:
```
🔍 DATABASE_URL loaded: postgresql://postgres:****@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
✅ Database connection established
🚀 Server running on http://localhost:3001
```

## FERDIG! 🎉

Din MCAS-Life backend kjører nå mot Supabase cloud database!

---

## Neste Steg

### Verifiser i Supabase Dashboard
1. Gå tilbake til Supabase dashboard
2. Klikk **Table Editor** i sidebar
3. Du skal se alle tabeller: `users`, `foods`, `symptom_entries`, etc.
4. Klikk på `foods` → du skal se 849 rader

### Start Frontend
```bash
cd frontend
npm run dev
```

Åpne http://localhost:3000 og test full flow:
1. Registrer bruker
2. Logg inn
3. Søk etter mat
4. Legg til i trygg mat-liste

---

## One-liner Setup

Hvis du allerede har Supabase connection string i `.env`:

```bash
cd backend && npm run supabase:setup
```

Dette kjører automatisk:
1. `npm run db:push` - Push schema
2. `npm run import:sighi` - Import foods
3. `npm run db:test` - Test connection

---

## Troubleshooting

### Problem: "Connection refused"
**Fix**: Sjekk at DATABASE_URL er korrekt kopiert fra Supabase

### Problem: "SSL required"
**Fix**: Legg til `DATABASE_SSL=require` i `.env`

### Problem: "password authentication failed"
**Fix**: Passordet i connection string må matche det du lagde i Supabase

### Problem: Ser ingen tabeller i Supabase
**Fix**: Kjør `npm run db:push` eller `npm run db:migrate`

### Problem: Ingen foods i database
**Fix**: Kjør `npm run import:sighi`

---

## Koster det noe?

**Nei!** Free tier inkluderer:
- 500 MB database (nok for 10,000+ brukere)
- 2 GB storage
- 50,000 monthly active users

Mer enn nok for utvikling og MVP!

---

For detaljert guide, se **SUPABASE_MIGRATION.md**
