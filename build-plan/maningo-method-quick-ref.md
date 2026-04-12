# Maningo Method — Quick Reference Card

## Access

| | |
|---|---|
| **VPS IP** | `5.161.88.134` |
| **SSH** | `ssh hampton-vps` (or `ssh root@5.161.88.134 -i ~/.ssh/id_ed25519_headless`) |
| **Project path** | `/opt/maningo-method/` |
| **Internal port** | `3003` (mapped from container port 3000) |
| **Public URL** | `https://maningo.hosthampton.com` |
| **GitHub repo** | `https://github.com/afintech510/maningo-method` |
| **Supabase project** | (TBD — create new project at supabase.com/dashboard) |

## Key Commands

```bash
# Deploy
cd /opt/maningo-method && git pull origin main && docker compose up -d --build

# View logs
docker logs maningo_app -f --tail 100

# Restart
docker compose -f /opt/maningo-method/docker-compose.yml restart

# Stop
docker compose -f /opt/maningo-method/docker-compose.yml down

# Health check
curl https://maningo.hosthampton.com/api/health

# Local health check (from VPS)
curl http://localhost:3003/api/health

# Check container status
docker ps | grep maningo

# Check resource usage
docker stats maningo_app --no-stream

# Reload nginx (after config change)
cd /opt/hosthampton && docker compose restart nginx

# Reclaim disk space
docker builder prune -f && docker image prune -f
```

## Port Map (Full VPS)

| Port | Project |
|------|---------|
| 80, 443 | hampton_nginx (shared reverse proxy) |
| 3001 | HappyHome |
| **3003** | **Maningo Method** |
| 3100 | EasternLM prod |
| 3101 | EasternLM staging |
| 3200 | ELM Marketing |
| 8080, 8443 | HappyHome nginx |

## Emergency

```bash
# If Maningo is down, check in order:
docker ps | grep maningo          # Is the container running?
docker logs maningo_app --tail 50 # What's the error?
curl http://localhost:3003        # Is the app responding?
docker compose -f /opt/maningo-method/docker-compose.yml up -d --build  # Rebuild
```
