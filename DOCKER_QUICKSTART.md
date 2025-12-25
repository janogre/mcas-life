# MCAS-Life Docker Quick Setup

Kom i gang med MCAS-Life i Docker på under 5 minutter!

## Forutsetninger

- Docker og Docker Compose installert
- Eksisterende `n8n-compose` directory med Traefik
- Git installert

## Quick Start for n8n-compose Setup

### 1. Klon MCAS-Life til n8n-compose directory

```bash
# Naviger til din n8n-compose mappe
cd /path/to/n8n-compose

# Klon MCAS-Life repository
git clone https://github.com/janogre/mcas-life.git
cd mcas-life
```

### 2. Opprett miljøvariabler

```bash
# Kopier environment eksempel
cp .env.production.example .env.production

# Rediger med dine verdier
nano .env.production
```

**Minimum konfigurasjon i `.env.production`:**

```bash
# Ditt domene (via Cloudflare tunnel)
DOMAIN=mcas.yourdomain.com

# Generer sikre passord (bruk: openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Airthings (valgfritt)
AIRTHINGS_CLIENT_ID=
AIRTHINGS_CLIENT_SECRET=
```

### 3. Start MCAS-Life med docker-compose

```bash
# Last inn environment variabler
export $(cat .env.production | xargs)

# Start services
docker-compose -f docker-compose.traefik.yml up -d
```

### 4. Initialiser database

```bash
# Vent til containere er oppe
docker-compose -f docker-compose.traefik.yml ps

# Kjør database migrasjoner
docker exec -it mcas-backend npm run db:push

# Importer SIGHI matvare-database (849 matvarer)
docker exec -it mcas-backend npm run import:sighi
```

### 5. Verifiser deployment

```bash
# Sjekk at alt kjører
docker-compose -f docker-compose.traefik.yml ps

# Test backend health
curl https://mcas.yourdomain.com/api/health

# Sjekk frontend
curl -I https://mcas.yourdomain.com
```

### 6. Åpne appen

Gå til `https://mcas.yourdomain.com` og registrer din første bruker!

## Din n8n-compose struktur

Etter setup ser mappene dine slik ut:

```
/path/to/n8n-compose/
├── docker-compose.yml          # Din eksisterende n8n setup
├── mcas-life/                  # Ny MCAS-Life installasjon
│   ├── docker-compose.traefik.yml
│   ├── .env.production
│   ├── backend/
│   ├── frontend/
│   └── ...
├── n8n/
├── traefik/
└── andre-apper/
```

## Integrasjon med Traefik

MCAS-Life `docker-compose.traefik.yml` er konfigurert til å bruke ditt eksisterende `n8n-compose_proxy` nettverk.

**Viktige Traefik labels:**

```yaml
# Frontend (hoveddomene)
traefik.http.routers.mcas-frontend.rule=Host(`mcas.yourdomain.com`)

# Backend API (samme domene, /api path)
traefik.http.routers.mcas-api.rule=Host(`mcas.yourdomain.com`) && PathPrefix(`/api`)
```

## Nyttige kommandoer

Fra `mcas-life/` mappen:

```bash
# Se logger
docker-compose -f docker-compose.traefik.yml logs -f

# Se spesifikk service
docker-compose -f docker-compose.traefik.yml logs -f mcas-backend

# Restart services
docker-compose -f docker-compose.traefik.yml restart

# Stopp alt
docker-compose -f docker-compose.traefik.yml stop

# Start igjen
docker-compose -f docker-compose.traefik.yml start

# Rebuild etter kodeendringer
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Fjern alt (SLETTER DATA!)
docker-compose -f docker-compose.traefik.yml down -v
```

## Sjekk status på alle services

Fra `n8n-compose/` root:

```bash
# Se alle containere
docker ps

# Filtrer på MCAS-Life
docker ps | grep mcas
```

## Database backup (viktig!)

```bash
# Manuell backup
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backups/mcas_$(date +%Y%m%d_%H%M%S).sql.gz

# Automatisk backup med cron
# Legg til i crontab: crontab -e
0 2 * * * cd /path/to/n8n-compose/mcas-life && docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backups/mcas_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

## Oppgradering

```bash
cd /path/to/n8n-compose/mcas-life

# Pull ny kode
git pull origin main

# Last inn environment
export $(cat .env.production | xargs)

# Rebuild og restart
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Sjekk logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## Cloudflare Tunnel konfigurasjon

Hvis du bruker Cloudflare Tunnel (som dine andre services), sørg for å legge til:

```yaml
# I din Cloudflare Tunnel config
ingress:
  - hostname: mcas.yourdomain.com
    service: http://traefik:80
  # ... andre services
```

Traefik vil så route trafikken videre til MCAS-Life basert på hostname.

## Feilsøking

### Container vil ikke starte

```bash
# Sjekk logs
docker-compose -f docker-compose.traefik.yml logs mcas-backend

# Verifiser environment variabler
docker exec mcas-backend env | grep DATABASE_URL
```

### Traefik routing problemer

```bash
# Sjekk at containere er på riktig nettverk
docker network inspect n8n-compose_proxy | grep mcas

# Verifiser Traefik labels
docker inspect mcas-frontend | grep traefik
```

### Database connection feil

```bash
# Test database tilkobling
docker exec mcas-backend npm run db:test

# Sjekk PostgreSQL logs
docker-compose -f docker-compose.traefik.yml logs mcas-db
```

### SIGHI data mangler

```bash
# Sjekk antall matvarer
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"

# Skal returnere: 849

# Re-importer hvis nødvendig
docker exec -it mcas-backend npm run import:sighi
```

## Ressursbruk

MCAS-Life bruker ca:
- **RAM:** 1-2 GB totalt (4 containere)
- **Disk:** ~500 MB + database data
- **CPU:** Minimal ved idle

## Integrasjon med andre n8n-compose services

MCAS-Life kjører isolert men deler Traefik proxy-nettverket:

```
[Cloudflare Tunnel] → [Traefik] → {
    n8n.domain.com → n8n container
    mcas.domain.com → mcas-frontend
    mcas.domain.com/api → mcas-backend
    workout.domain.com → workout-assistant
}
```

## Lokal utvikling (anbefalt for koding)

Hvis du jobber med koden lokalt:

```bash
# Terminal 1: Kjør kun database
docker-compose -f docker-compose.traefik.yml up -d mcas-db mcas-redis

# Terminal 2: Backend lokal
cd backend
npm install
npm run dev

# Terminal 3: Frontend lokal
cd frontend
npm install
npm run dev
```

Frontend vil da være på http://localhost:5173 med hot-reload.

## Sikkerhet

For produksjon, sørg for å:

1. ✅ Bruk sterke passord generert med `openssl rand -base64 32`
2. ✅ Aldri commit `.env.production` til Git
3. ✅ Aktiver automatisk backup
4. ✅ Overvåk logs for mistenkelig aktivitet
5. ✅ Hold Docker images oppdatert

## Support og dokumentasjon

- **Quick Start:** [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) (denne filen)
- **Produksjon:** [DEPLOYMENT_TRAEFIK.md](DEPLOYMENT_TRAEFIK.md) - Detaljert deployment guide
- **Database:** [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) - Migrasjon fra Supabase
- **Prosjekt:** [README.md](README.md) - Prosjektoversikt
- **Issues:** https://github.com/janogre/mcas-life/issues

## Quick Reference

```bash
# Fra mcas-life/ mappen:

# Start
docker-compose -f docker-compose.traefik.yml up -d

# Logs
docker-compose -f docker-compose.traefik.yml logs -f

# Restart
docker-compose -f docker-compose.traefik.yml restart

# Stop
docker-compose -f docker-compose.traefik.yml stop

# Backup database
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backup.sql.gz

# Health check
curl https://mcas.yourdomain.com/api/health
```
