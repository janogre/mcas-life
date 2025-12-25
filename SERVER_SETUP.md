# MCAS-Life Server Setup Guide

Du har nå klonet repository til `/home/janog/mcas-life`. Her er neste steg:

## 1. Opprett .env.production

```bash
cd /home/janog/mcas-life

# Kopier template
cp .env.production.example .env.production

# Rediger filen
nano .env.production
```

### Minimum konfigurasjon:

```bash
# Ditt domene
DOMAIN=mcas.yourdomain.com

# Generer sikre passord
DB_PASSWORD=your_secure_db_password_here
REDIS_PASSWORD=your_secure_redis_password_here
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Airthings (valgfritt - kan være tom)
AIRTHINGS_CLIENT_ID=
AIRTHINGS_CLIENT_SECRET=
```

### Generer sikre passord:

```bash
# Generer alle secrets på en gang:
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
```

Kopier disse verdiene inn i `.env.production`.

## 2. Verifiser Traefik nettverk

```bash
# Sjekk at n8n-compose_proxy nettverk eksisterer
docker network ls | grep n8n-compose_proxy

# Hvis det ikke finnes, opprett det:
docker network create n8n-compose_proxy
```

## 3. Start MCAS-Life

```bash
cd /home/janog/mcas-life

# Last inn environment variabler
export $(cat .env.production | xargs)

# Start alle services
docker-compose -f docker-compose.traefik.yml up -d

# Følg oppstart i logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## 4. Vent på at containerne starter

```bash
# Sjekk status (vent til alle er "Up (healthy)")
docker-compose -f docker-compose.traefik.yml ps

# Du skal se:
# mcas-backend    Up (healthy)
# mcas-frontend   Up
# mcas-db         Up (healthy)
# mcas-redis      Up (healthy)
```

## 5. Initialiser database

```bash
# Kjør database migrasjoner
docker exec -it mcas-backend npm run db:push

# Importer SIGHI matvare-database (849 matvarer)
docker exec -it mcas-backend npm run import:sighi
```

Dette tar ca 1-2 minutter.

## 6. Verifiser installasjon

```bash
# Sjekk at alle containere kjører
docker ps | grep mcas

# Test backend health
curl http://localhost:3001/api/health
# Skal returnere: {"status":"healthy"}

# Hvis du har satt opp domene, test via HTTPS:
curl https://mcas.yourdomain.com/api/health
```

## 7. Legg til Cloudflare Tunnel (hvis du bruker det)

Rediger din Cloudflare Tunnel config og legg til:

```yaml
ingress:
  - hostname: mcas.yourdomain.com
    service: http://traefik:80
  # ... dine andre services
  - service: http_status:404
```

Restart Cloudflare Tunnel etter endring.

## 8. Åpne applikasjonen

Gå til `https://mcas.yourdomain.com` og:
1. Klikk "Registrer deg"
2. Fyll ut brukerinfo
3. Fullfør MCAS-profil
4. Logg inn!

## Troubleshooting

### Containere starter ikke

```bash
# Sjekk logs for feil
docker-compose -f docker-compose.traefik.yml logs mcas-backend
docker-compose -f docker-compose.traefik.yml logs mcas-frontend
docker-compose -f docker-compose.traefik.yml logs mcas-db
```

### Port conflicts

Hvis porter er opptatt, rediger `docker-compose.traefik.yml` (men dette skal ikke være nødvendig med Traefik).

### Database connection feil

```bash
# Verifiser at PostgreSQL kjører
docker-compose -f docker-compose.traefik.yml ps mcas-db

# Test connection fra backend
docker exec mcas-backend node -e "console.log(process.env.DATABASE_URL)"
```

### Traefik routing fungerer ikke

```bash
# Sjekk at containere er på riktig nettverk
docker network inspect n8n-compose_proxy | grep mcas

# Verifiser Traefik labels
docker inspect mcas-frontend | grep traefik
docker inspect mcas-backend | grep traefik
```

### SIGHI import feilet

```bash
# Sjekk om matvarer ble importert
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"

# Skal returnere: 849

# Hvis 0 eller feil, re-kjør import:
docker exec -it mcas-backend npm run import:sighi
```

## Nyttige kommandoer

```bash
# Fra /home/janog/mcas-life:

# Se alle logs
docker-compose -f docker-compose.traefik.yml logs -f

# Restart services
docker-compose -f docker-compose.traefik.yml restart

# Stopp services
docker-compose -f docker-compose.traefik.yml stop

# Start services
docker-compose -f docker-compose.traefik.yml start

# Rebuild etter kodeendringer
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Se status
docker-compose -f docker-compose.traefik.yml ps
```

## Database backup

```bash
# Manuell backup
mkdir -p /home/janog/mcas-life/backups
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > /home/janog/mcas-life/backups/mcas_$(date +%Y%m%d_%H%M%S).sql.gz

# Automatisk backup (legg til i crontab)
crontab -e

# Legg til denne linjen:
0 2 * * * docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > /home/janog/mcas-life/backups/mcas_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz

# Cleanup gamle backups (slett eldre enn 30 dager)
0 3 * * * find /home/janog/mcas-life/backups -name "*.sql.gz" -mtime +30 -delete
```

## Oppgradering

```bash
cd /home/janog/mcas-life

# Pull ny kode
git pull origin main

# Last environment
export $(cat .env.production | xargs)

# Rebuild og restart
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Sjekk logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## Ressursbruk

Du kan sjekke ressursbruk med:

```bash
# Live stats
docker stats mcas-backend mcas-frontend mcas-db mcas-redis

# Disk usage
docker system df
```

MCAS-Life bruker typisk:
- **RAM:** 1-2 GB totalt
- **Disk:** ~500 MB + database data
- **CPU:** Minimal ved idle

## Neste steg

1. ✅ Test at alle sider fungerer
2. ✅ Registrer en testbruker
3. ✅ Legg til noen matvarer i "Trygge matvarer"
4. ✅ Registrer et symptom
5. ✅ Test Airthings-integrasjon (hvis konfigurert)
6. ✅ Sett opp automatisk backup

## Support

- **Quick Start:** [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
- **Deployment:** [DEPLOYMENT_TRAEFIK.md](DEPLOYMENT_TRAEFIK.md)
- **Database:** [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)
- **GitHub Issues:** https://github.com/janogre/mcas-life/issues
