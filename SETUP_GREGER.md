# MCAS-Life Setup for greger.cc

Komplett setup-guide for MCAS-Life på https://mcas-life.greger.cc

## Server: /home/janog/mcas-life

## 1. Generer sikre passord

```bash
cd /home/janog/mcas-life

# Generer alle secrets på en gang
echo "=== Kopier disse verdiene til .env.production ==="
echo ""
echo "DB_PASSWORD=$(openssl rand -base64 32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "================================================"
```

**Viktig:** Kopier disse verdiene - du trenger dem i neste steg!

## 2. Opprett .env.production

```bash
# Kopier template
cp .env.production.example .env.production

# Rediger filen
nano .env.production
```

### Lim inn denne konfigurasjonen:

```bash
# Domain
DOMAIN=mcas-life.greger.cc

# Database password (lim inn fra steg 1)
DB_PASSWORD=PASTE_YOUR_GENERATED_DB_PASSWORD_HERE

# Redis password (lim inn fra steg 1)
REDIS_PASSWORD=PASTE_YOUR_GENERATED_REDIS_PASSWORD_HERE

# JWT secrets (lim inn fra steg 1)
JWT_SECRET=PASTE_YOUR_GENERATED_JWT_SECRET_HERE
JWT_REFRESH_SECRET=PASTE_YOUR_GENERATED_JWT_REFRESH_SECRET_HERE

# Airthings (kan være tom hvis ikke brukt)
AIRTHINGS_CLIENT_ID=
AIRTHINGS_CLIENT_SECRET=
AIRTHINGS_REDIRECT_URI=
```

**Lagre:** Ctrl+O, Enter, Ctrl+X

## 3. Verifiser Docker nettverk

```bash
# Sjekk om n8n-compose_proxy nettverk finnes
docker network ls | grep n8n-compose_proxy

# Hvis det IKKE finnes (ingen output), opprett det:
docker network create n8n-compose_proxy
```

## 4. Start MCAS-Life

```bash
cd /home/janog/mcas-life

# Last inn environment variabler
export $(cat .env.production | xargs)

# Start alle Docker services
docker-compose -f docker-compose.traefik.yml up -d

# Følg logs for å se oppstart
docker-compose -f docker-compose.traefik.yml logs -f
```

**Vent:** Du skal se at containerne starter. Trykk Ctrl+C når du ser "Server started" fra backend.

## 5. Sjekk at containerne kjører

```bash
# Sjekk status
docker-compose -f docker-compose.traefik.yml ps

# Du skal se 4 containere som "Up":
# NAME            STATUS
# mcas-backend    Up (healthy)
# mcas-db         Up (healthy)
# mcas-frontend   Up
# mcas-redis      Up (healthy)
```

Hvis noen er "Restarting" eller "Unhealthy", sjekk logs:

```bash
docker-compose -f docker-compose.traefik.yml logs mcas-backend
```

## 6. Initialiser database

```bash
# Kjør database migrasjoner (oppretter tabeller)
docker exec -it mcas-backend npm run db:push

# Importer SIGHI matvare-database (849 matvarer)
docker exec -it mcas-backend npm run import:sighi
```

**Dette tar 1-2 minutter.** Du skal se output med alle matvarer som importeres.

## 7. Verifiser installasjon

```bash
# Test lokal backend
curl http://localhost:3001/api/health

# Skal returnere: {"status":"healthy"}

# Sjekk antall matvarer i database
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"

# Skal returnere: 849
```

## 8. Konfigurer Cloudflare Tunnel

Legg til i din Cloudflare Tunnel konfigurasjon:

```yaml
ingress:
  - hostname: mcas-life.greger.cc
    service: http://traefik:80
  # ... dine andre services (n8n, workout, etc)
  - service: http_status:404
```

**Restart Cloudflare Tunnel** etter endring:

```bash
# Finn din Cloudflare Tunnel container
docker ps | grep cloudflare

# Restart den (erstatt CONTAINER_ID med din ID)
docker restart CONTAINER_ID
```

## 9. Test fra internett

```bash
# Test backend via domene
curl https://mcas-life.greger.cc/api/health

# Skal returnere: {"status":"healthy"}

# Test frontend
curl -I https://mcas-life.greger.cc

# Skal returnere: HTTP/2 200
```

## 10. Åpne applikasjonen

1. Gå til: **https://mcas-life.greger.cc**
2. Klikk "Registrer deg"
3. Fyll ut:
   - Fornavn, Etternavn
   - E-post
   - Passord
4. Fullfør MCAS-profil:
   - Kjønn, Alder
   - MCAS alvorlighetsgrad
5. Logg inn!

## Troubleshooting

### Problem: "502 Bad Gateway"

```bash
# Sjekk at backend kjører
docker ps | grep mcas-backend

# Sjekk backend logs
docker logs mcas-backend

# Sjekk at containeren er på riktig nettverk
docker network inspect n8n-compose_proxy | grep mcas
```

### Problem: "Cannot connect to database"

```bash
# Sjekk PostgreSQL
docker-compose -f docker-compose.traefik.yml logs mcas-db

# Verifiser DATABASE_URL
docker exec mcas-backend printenv DATABASE_URL

# Restart backend
docker-compose -f docker-compose.traefik.yml restart mcas-backend
```

### Problem: "SIGHI data mangler"

```bash
# Re-kjør import
docker exec -it mcas-backend npm run import:sighi

# Verifiser antall
docker exec mcas-db psql -U mcas_user -d mcas_life -c "SELECT COUNT(*) FROM foods;"
```

### Problem: "Port conflicts"

Hvis du får feilmelding om at porter er opptatt, er det ok - Traefik håndterer routing.
Containerne trenger ikke eksponere porter direkte.

## Database backup (anbefalt!)

```bash
# Opprett backup-mappe
mkdir -p /home/janog/mcas-life/backups

# Manuell backup
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > /home/janog/mcas-life/backups/mcas_$(date +%Y%m%d_%H%M%S).sql.gz

# Automatisk daglig backup (legg til i crontab)
crontab -e

# Legg til disse linjene:
0 2 * * * docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > /home/janog/mcas-life/backups/mcas_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
0 3 * * * find /home/janog/mcas-life/backups -name "*.sql.gz" -mtime +30 -delete
```

## Nyttige kommandoer

```bash
# Alltid fra /home/janog/mcas-life

# Se alle logs
docker-compose -f docker-compose.traefik.yml logs -f

# Se kun backend logs
docker-compose -f docker-compose.traefik.yml logs -f mcas-backend

# Restart alle services
docker-compose -f docker-compose.traefik.yml restart

# Stopp alle services
docker-compose -f docker-compose.traefik.yml stop

# Start alle services
docker-compose -f docker-compose.traefik.yml start

# Se status
docker-compose -f docker-compose.traefik.yml ps

# Se ressursbruk
docker stats mcas-backend mcas-frontend mcas-db mcas-redis
```

## Oppgradering (fremtidig)

```bash
cd /home/janog/mcas-life

# Pull ny kode fra GitHub
git pull origin main

# Last environment
export $(cat .env.production | xargs)

# Rebuild og restart
docker-compose -f docker-compose.traefik.yml build
docker-compose -f docker-compose.traefik.yml up -d

# Sjekk logs
docker-compose -f docker-compose.traefik.yml logs -f
```

## Quick Reference

```bash
# Start
docker-compose -f docker-compose.traefik.yml up -d

# Status
docker-compose -f docker-compose.traefik.yml ps

# Logs
docker-compose -f docker-compose.traefik.yml logs -f

# Restart
docker-compose -f docker-compose.traefik.yml restart

# Stop
docker-compose -f docker-compose.traefik.yml stop

# Health check
curl https://mcas-life.greger.cc/api/health

# Backup
docker exec mcas-db pg_dump -U mcas_user mcas_life | gzip > backups/backup_$(date +%Y%m%d).sql.gz
```

## Support

- Server setup: [SERVER_SETUP.md](SERVER_SETUP.md)
- Docker guide: [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
- Full deployment: [DEPLOYMENT_TRAEFIK.md](DEPLOYMENT_TRAEFIK.md)
- GitHub: https://github.com/janogre/mcas-life

## Din setup oversikt

```
Server: /home/janog/mcas-life
Domain: https://mcas-life.greger.cc
Network: n8n-compose_proxy (delt med andre tjenester)

Containere:
- mcas-frontend (Nginx + React PWA)
- mcas-backend (Node.js Express API)
- mcas-db (PostgreSQL 16)
- mcas-redis (Redis 7)

Routing:
Cloudflare Tunnel → Traefik → {
  mcas-life.greger.cc → mcas-frontend
  mcas-life.greger.cc/api → mcas-backend
}
```

Lykke til med setupet! 🚀
