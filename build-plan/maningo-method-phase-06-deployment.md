# Phase 06: Deployment & Hardening
**Project:** Maningo Method
**Spec:** maningo-method-spec-v2.md
**Build Plan:** maningo-method-buildplan.md
**Prerequisites:** Phase 05 complete
**Implements:** Production readiness
**Recommended:** `claude --max-turns 50`

---

## 1. Context

You are executing **Phase 06: Deployment & Hardening** of the Maningo Method build. All features are built and tested. Your job is production configuration, security hardening, and deployment verification.

**Spec File:** `maningo-method-spec-v2.md` — Sections 1.3 (Deployment), 7 (Security), 8 (Observability), 3.1 (Rate limiting).

### What Already Exists
Complete application (Phases 00-04) with tests passing (Phase 05). Docker Compose exists but may need production tuning. nginx config exists but needs hardening.

---

## 2. Deliverables

1. **Production Docker Compose** — memory limits, restart policy, health check — Spec Section 1.3
2. **nginx production config** — rate limiting, security headers, gzip, cache headers, SSL — Spec Section 1.3
3. **`GET /api/health`** — checks Supabase connection, returns status — Spec Section 8.3
4. **Input validation audit** — verify Zod on every endpoint — Spec Section 7.4
5. **Error handling audit** — all errors use spec Section 8.1 format
6. **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
7. **Rate limiting middleware** — public: 10 req/sec/IP, auth: 5 req/min/IP — Spec Section 3.1
8. **Deployment script** — `scripts/deploy.sh` per spec Section 1.3 (git pull → migrate → build → restart)
9. **UptimeRobot configuration notes** — monitoring /api/health + cron for cleanup
10. **Production environment checklist** — all env vars needed for go-live

---

## 3. Implementation Instructions

### Task 1: Production Docker Compose
**Modifies:** `docker-compose.yml`

Production additions:
- `restart: unless-stopped`
- `mem_limit: 512m`
- Health check: `test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]`, interval 30s, timeout 5s, retries 3
- Environment: `NODE_ENV=production`

### Task 2: Health Check Endpoint
**Creates:** `src/app/api/health/route.ts`

Returns JSON: `{ status: "ok", timestamp: ISO, db: "connected" | "error" }`. Performs a simple Supabase query (e.g., `SELECT 1`) to verify DB connectivity. Returns 200 if healthy, 503 if DB unreachable.

### Task 3: nginx Hardening
**Modifies:** `nginx/maningo.conf`

Add:
- gzip compression (text/html, application/json, text/css, application/javascript)
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`, basic CSP
- Cache headers for `/_next/static/` (immutable, 1 year)
- No cache for API routes
- Rate limiting zone: `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s` for general, `limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m` for auth endpoints
- Proxy timeout settings
- Block access to `.env`, `.git`, `supabase/` paths

### Task 4: Rate Limiting Middleware
**Creates:** `src/middleware.ts` or per-route rate limiting

Implement application-level rate limiting as a backup to nginx:
- Public API: 10 req/sec per IP
- Auth endpoints (login, register): 5 req/min per IP
- Use in-memory store (Map with TTL) for MVP. Redis in Phase 2.
- Return 429 with error format from spec Section 8.1: `{ error: { code: "RATE_LIMITED", message: "Too many requests. Please try again in a moment." } }`

### Task 5: Input Validation Audit
**Checks:** Every API route

Walk through every API route and verify:
- Request body validated with Zod before any DB operation
- Query parameters validated (date formats, booleans)
- Path parameters validated (UUIDs)
- No endpoint accepts raw input without validation

Document any gaps found and fix them.

### Task 6: Error Handling Audit
**Checks:** Every API route

Verify:
- All error responses use the format from spec Section 8.1
- No raw error messages leak to clients (Supabase errors, Stripe errors → mapped to user-friendly codes)
- All try/catch blocks log with pino before returning error response
- No empty catch blocks
- 500 errors include correlation_id in response for debugging

### Task 7: Deployment Script
**Creates:** `scripts/deploy.sh`

```bash
#!/bin/bash
set -e
cd /opt/maningo-method
echo "Pulling latest..."
git pull origin main
echo "Running migrations..."
npx supabase db push
echo "Building and restarting..."
docker compose up -d --build
echo "Waiting for health check..."
sleep 10
curl -f http://localhost:3001/api/health || (echo "HEALTH CHECK FAILED" && exit 1)
echo "Deploy complete."
docker compose logs --tail=20 maningo-method-app
```

### Task 8: Production Environment Checklist
**Creates:** `docs/go-live-checklist.md`

Document:
- [ ] All env vars set in `/opt/maningo-method/.env`
- [ ] Supabase project in production mode, migrations applied
- [ ] Stripe live mode: products/prices created, webhook endpoint registered, endpoint secret in env
- [ ] Resend: subdomain sender verified (hello@maningo.hosthampton.com), DKIM configured
- [ ] Cloudflare: DNS record active, SSL Full (strict)
- [ ] nginx: config loaded, SSL certs in place
- [ ] UptimeRobot: monitoring /api/health, also hitting /api/cron/cleanup-pending?key=CRON_SECRET every 5 min
- [ ] Admin user promoted (scripts/promote-admin.sql run)
- [ ] Test booking flow end-to-end with real Stripe

---

## 4. Acceptance Criteria

- [ ] `maningo.hosthampton.com` loads with valid SSL (or localhost equivalent for pre-DNS)
- [ ] `/api/health` returns 200 with `{ status: "ok", db: "connected" }`
- [ ] Rate limiting: 11th rapid request to /api/classes returns 429
- [ ] Security headers present (check with `curl -I`)
- [ ] gzip active on HTML/JSON responses
- [ ] Static assets return cache headers (immutable)
- [ ] `.env` path returns 403/404 from nginx
- [ ] Deploy script runs end-to-end successfully
- [ ] All env vars documented in go-live checklist
- [ ] No raw error messages leak to client (test with invalid inputs)
- [ ] Docker health check passes (`docker inspect --format='{{.State.Health.Status}}'`)

---

## 5. Constraints
- nginx rate limiting is primary; application-level is backup
- No new features — hardening and configuration only
- If fixing bugs discovered during audit, document each fix

## 6. Completion Protocol
[Standard report — include audit findings list]

## 7. Execution & Orchestration
**Recommended:** `claude --max-turns 50`
Read spec Sections 1.3, 3.1, 7, 8. Build: health check → Docker → nginx → rate limiting → audits → deploy script → checklist. Update `PHASE-06-PROGRESS.md`.
