# Maningo Method — Environment Setup Guide

**Generated:** 2026-04-12 (from live VPS audit, not documentation)
**Target:** Deploy Maningo Method (Pilates class booking platform) on the same Hetzner VPS as Host Hampton, as a fully isolated Docker Compose stack.

---

## Section 1: VPS Access & Credentials

### Server Details

| Property | Value |
|----------|-------|
| **IP Address** | 5.161.88.134 |
| **Provider** | Hetzner |
| **OS** | Ubuntu 24.04.3 LTS (Noble Numbat) |
| **Kernel** | 6.8.0-90-generic x86_64 |
| **CPU Cores** | 3 |
| **Total RAM** | 3.7 GiB |
| **Swap** | 2.0 GiB |
| **Disk** | 75 GB total, 11 GB free (85% used) |

### SSH Access

```bash
ssh root@5.161.88.134 -i ~/.ssh/id_ed25519_headless
```

Or via `~/.ssh/config`:

```
Host hampton-vps
  HostName 5.161.88.134
  User root
  IdentityFile ~/.ssh/id_ed25519_headless
```

- **SSH Port:** 22 (default)
- **Auth:** Key-based (no `PasswordAuthentication` or `PubkeyAuthentication` directives found in sshd_config — Ubuntu 24.04 defaults apply: PubkeyAuthentication yes, PasswordAuthentication yes)

> **Security note:** Password authentication may still be enabled. Consider adding `PasswordAuthentication no` to `/etc/ssh/sshd_config` and restarting sshd.

### Resource Headroom

| Resource | Used | Available | Can Maningo Fit? |
|----------|------|-----------|------------------|
| **RAM** | 2.4 GiB (+ 650 MiB swap used) | ~1.3 GiB available | Yes — a Next.js container uses ~200-300 MiB |
| **CPU** | Low utilization (<7% total across all containers) | 3 cores, mostly idle | Yes |
| **Disk** | 61 GB of 75 GB used (85%) | 11 GB free | **Tight.** Run `docker builder prune` first — 41 GB of build cache is reclaimable |

**Critical:** Before deploying, reclaim disk space:

```bash
docker builder prune -f    # Frees ~41 GB of build cache
docker image prune -a -f   # Frees unused images (~43 GB reclaimable)
```

### Current Tenants on This VPS

| Project | Docker Containers | Port(s) |
|---------|-------------------|---------|
| Host Hampton | nginx, redis, orchestrator, 6 agents, website, frontend | 80, 443 (nginx), internal 3000/3002 |
| EasternLM | prod, staging | 3100, 3101 |
| EasternLM Marketing | orchestrator + 4 agents | 3200 |
| HappyHome | app, nginx | 3001, 8080, 8443 |
| MyGravelGuy | app | internal only (behind nginx) |

---

## Section 2: GitHub Repository Setup

### Current HH Setup

- **Repo:** `https://github.com/afintech510/host-hampton-ops.git`
- **Branch:** `main` (single-branch strategy)
- **VPS auth:** PAT embedded in git remote URL

> **Security note:** The HH repo on VPS uses a GitHub PAT directly in the remote URL. This PAT (`ghp_geJa...`) is visible in `git remote -v`. Consider switching to deploy keys.

### Steps for Maningo Method

1. **Create the repo:**
   ```bash
   # On GitHub: create afintech510/maningo-method (private)
   ```

2. **Clone to VPS:**
   ```bash
   ssh hampton-vps
   mkdir -p /opt/maningo-method
   git clone https://github.com/afintech510/maningo-method.git /opt/maningo-method
   ```

3. **Authentication — two options:**

   **Option A: PAT in URL (matches HH pattern, less secure):**
   ```bash
   git remote set-url origin https://ghp_YOUR_PAT@github.com/afintech510/maningo-method.git
   ```

   **Option B: Deploy key (recommended):**
   ```bash
   ssh-keygen -t ed25519 -f /root/.ssh/maningo_deploy_key -N ""
   cat /root/.ssh/maningo_deploy_key.pub
   # Add this as a deploy key in GitHub repo settings
   # Then configure git to use it:
   cat >> /root/.ssh/config <<EOF
   Host github-maningo
     HostName github.com
     IdentityFile /root/.ssh/maningo_deploy_key
     IdentitiesOnly yes
   EOF
   git remote set-url origin git@github-maningo:afintech510/maningo-method.git
   ```

4. **Deploy workflow** (manual, matching HH pattern):
   ```bash
   cd /opt/maningo-method
   git pull origin main
   docker compose up -d --build
   ```

   No CI/CD is configured for any project on this VPS — all deployments are manual SSH + pull + rebuild.

---

## Section 3: Docker Setup

### Versions Installed

| Component | Version |
|-----------|---------|
| Docker Engine | 29.2.1 |
| Docker Compose | v5.0.2 (plugin) |
| Auto-start | Enabled (`systemctl is-enabled docker` = enabled) |

### Isolation Pattern

Maningo Method runs as a **completely separate Docker Compose stack** at `/opt/maningo-method/`, with its own network. Zero coupling to Host Hampton.

```
/opt/hosthampton/          ← HH stack (hampton_net)
/opt/maningo-method/       ← Maningo stack (maningo_net)
```

### Port Assignment

**Ports already in use:**

| Port | Project |
|------|---------|
| 22 | SSH |
| 80, 443 | hampton_nginx (reverse proxy for HH, ELM, HappyHome, MGG) |
| 3001 | HappyHome app |
| 3100 | EasternLM prod |
| 3101 | EasternLM staging |
| 3200 | EasternLM Marketing |
| 8080, 8443 | HappyHome nginx |

**Maningo Method assigned port: `3003`**

(Port 3001 is NOT available — HappyHome uses it.)

### Suggested docker-compose.yml

```yaml
services:
  maningo:
    build:
      context: .
      args:
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
        NEXT_PUBLIC_BASE_URL: ${NEXT_PUBLIC_BASE_URL:-https://maningo.hosthampton.com}
    container_name: maningo_app
    restart: unless-stopped
    ports:
      - "3003:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_SUBSCRIPTION_PRICE_ID=${STRIPE_SUBSCRIPTION_PRICE_ID}
      - STRIPE_DROPIN_PRICE_ID=${STRIPE_DROPIN_PRICE_ID}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - CRON_SECRET=${CRON_SECRET}
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - maningo_net

networks:
  maningo_net:
    driver: bridge
```

### Resource Limits

Given 3.7 GiB total RAM and ~2.4 GiB used, set a **512 MiB memory limit** on the Maningo container. HH's Next.js website container uses ~211 MiB, so 512 MiB provides comfortable headroom.

---

## Section 4: nginx Configuration

### Current Architecture

- **No system-level nginx.** All nginx runs inside Docker containers.
- Host Hampton's `hampton_nginx` container handles reverse proxying for:
  - `www.hosthampton.com` / `staging.hosthampton.com` → `website:3002`
  - `api.hosthampton.com` → `hampton:3000`
  - `app.hosthampton.com` → `frontend:80`
- HappyHome has its own separate `happyhome_nginx` on ports 8080/8443
- Config file: `/opt/hosthampton/nginx/nginx.conf` (bind-mounted into container)

### Adding Maningo Method

Since `hampton_nginx` already handles HTTPS termination for `*.hosthampton.com`, the simplest approach is to add a server block to **HH's nginx config** for `maningo.hosthampton.com`.

However, the Maningo container runs on its own Docker network (`maningo_net`), so `hampton_nginx` can't reach it by container name. It must proxy to the **host port** `3003`.

**Add this server block to `/opt/hosthampton/nginx/nginx.conf`:**

```nginx
  # ── HTTPS — Maningo Method (maningo.hosthampton.com) ────
  server {
    listen 443 ssl;
    server_name maningo.hosthampton.com;

    ssl_certificate     /etc/ssl/hosthampton/origin.pem;
    ssl_certificate_key /etc/ssl/hosthampton/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
      # Proxy to host port 3003 (Maningo container)
      # Use Docker host gateway IP since container is on a different network
      set $maningo_upstream http://host.docker.internal:3003;
      proxy_pass         $maningo_upstream;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
      proxy_set_header   X-Forwarded-Host $host;
      proxy_read_timeout 60s;
    }
  }
```

**Also add `maningo.hosthampton.com` to the HTTP→HTTPS redirect block:**

Find this line:
```nginx
server_name api.hosthampton.com app.hosthampton.com staging.hosthampton.com www.hosthampton.com;
```

Change to:
```nginx
server_name api.hosthampton.com app.hosthampton.com staging.hosthampton.com www.hosthampton.com maningo.hosthampton.com;
```

**Enable `host.docker.internal` in docker-compose.yml:**

Add to the HH `nginx` service:
```yaml
  nginx:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Reload nginx:**

```bash
cd /opt/hosthampton
docker compose restart nginx
```

### Gotchas

- **Docker DNS resolver:** HH uses `resolver 127.0.0.11` in nginx for Docker container DNS. This only works for containers on the SAME Docker network. Since Maningo is on `maningo_net`, we use `host.docker.internal` instead.
- **File bind-mounts are inode-based.** After editing `nginx.conf`, you MUST restart the nginx container (not just `nginx -s reload` inside it).
- **CORS:** HH handles CORS in Express middleware, never in nginx. Maningo should follow the same pattern.

---

## Section 5: Cloudflare DNS

### Current Setup

- `hosthampton.com` is managed on Cloudflare
- SSL mode: **Full** (Cloudflare → origin with Cloudflare Origin Certificate)
- Origin certificates at `/etc/ssl/hosthampton/origin.pem` and `origin.key`
- These Cloudflare Origin Certificates are valid for `*.hosthampton.com` and `hosthampton.com`, so they cover `maningo.hosthampton.com` automatically.

### DNS Record to Add

| Field | Value |
|-------|-------|
| **Type** | A |
| **Name** | `maningo` |
| **Content** | `5.161.88.134` |
| **Proxy status** | Proxied (orange cloud) |
| **TTL** | Auto |

This creates `maningo.hosthampton.com` → VPS IP (via Cloudflare proxy).

### SSL

No additional certificate work needed. The existing Cloudflare Origin Certificate is a wildcard (`*.hosthampton.com`) and already covers the subdomain.

---

## Section 6: Supabase

### Current HH Setup

- **Hosted Supabase** (not self-hosted)
- **Project URL:** `https://ychnlroczjhwimouecxz.supabase.co`
- **Supabase CLI:** Not installed on VPS
- **MCP:** Configured in `.mcp.json` for Claude Code dev sessions (not runtime)

### Recommendation: NEW Supabase Project

Create a **separate Supabase project** for Maningo Method. Reasons:
- Full schema isolation (no table name conflicts)
- Independent RLS policies
- Separate API keys (if one is compromised, the other is safe)
- Supabase free tier supports multiple projects

### Steps

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project:
   - **Name:** `maningo-method`
   - **Region:** US East (same as HH for low latency)
   - **Database password:** Generate and save securely
3. From project Settings → API:
   - Copy `SUPABASE_URL`
   - Copy `anon` key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Section 7: Stripe

### Isolation

Maningo Method uses a **completely separate Stripe account** from Host Hampton. The instructor creates their own Stripe account.

### Products to Create

| Product | Price | Type |
|---------|-------|------|
| Drop-In Class | $35.00 | One-time |
| Unlimited Monthly | $95.00/month | Recurring (subscription) |

After creating prices in Stripe Dashboard, copy the Price IDs:
- `STRIPE_DROPIN_PRICE_ID=price_xxxxx`
- `STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx`

### Webhook

- **Endpoint URL:** `https://maningo.hosthampton.com/api/webhooks/stripe`
- **Events to subscribe:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.paid`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

### Environment Variables

```
STRIPE_SECRET_KEY=sk_live_xxxxx           # From Stripe Dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # From webhook endpoint creation
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx  # Unlimited Monthly price ID
STRIPE_DROPIN_PRICE_ID=price_xxxxx        # Drop-In Class price ID
```

---

## Section 8: Resend (Email)

### Current HH Setup

- HH uses Resend with API key set in env vars
- Sender: configured via `RESEND_FROM_EMAIL` (e.g., `noReply@mail.hosthampton.com`)

### Maningo Method Options

**Option A: Share the Resend account (simplest)**

Use the same Resend API key but add a new sender identity:
- Sender: `hello@maningo.hosthampton.com` (or `noreply@mail.hosthampton.com`)
- In Resend dashboard: Settings → Domains → verify `maningo.hosthampton.com` as a sender domain
- Or send from the existing `mail.hosthampton.com` domain with a different "from name"

**Option B: Separate Resend account**

The instructor creates their own Resend account. Free tier = 3,000 emails/month.

### DNS Records for Email (if using subdomain sender)

If you want to send from `@maningo.hosthampton.com`, add these DNS records in Cloudflare (Resend will provide exact values during domain verification):

| Type | Name | Value |
|------|------|-------|
| TXT | `maningo._domainkey.hosthampton.com` | (DKIM key from Resend) |
| TXT | `maningo.hosthampton.com` | `v=spf1 include:amazonses.com ~all` |
| MX | `maningo.hosthampton.com` | (Resend MX value) |

> **Important:** Do NOT modify the root `hosthampton.com` SPF record. Subdomain SPF records are independent.

---

## Section 9: Environment Variables Template

Save as `/opt/maningo-method/.env.example`:

```env
# ── APP ───────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://maningo.hosthampton.com
STUDIO_TIMEZONE=America/New_York

# ── SUPABASE ──────────────────────────────
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...

# ── STRIPE (Instructor's own account) ────
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx
STRIPE_DROPIN_PRICE_ID=price_xxxxx

# ── RESEND ────────────────────────────────
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=hello@maningo.hosthampton.com

# ── CRON ──────────────────────────────────
CRON_SECRET=generate-a-random-32-char-string

# ── ADMIN ─────────────────────────────────
ADMIN_PASSWORD=generate-a-random-password
```

---

## Section 10: Complete Setup Checklist

```
PREREQUISITES
─────────────
□ 1.  Reclaim disk space on VPS:
        ssh hampton-vps
        docker builder prune -f
        docker image prune -f

□ 2.  Create GitHub repo: afintech510/maningo-method (private)

□ 3.  Create Supabase project "maningo-method" (US East region)
        Copy: URL, anon key, service_role key

□ 4.  Create Stripe account for instructor
        Create products: Drop-In ($35), Unlimited Monthly ($95/mo)
        Copy: secret key, publishable key, price IDs

DEPLOY
──────
□ 5.  Clone repo to VPS:
        ssh hampton-vps
        git clone https://github.com/afintech510/maningo-method.git /opt/maningo-method

□ 6.  Create env file:
        cd /opt/maningo-method
        cp .env.example .env
        nano .env   # Fill in all credentials

□ 7.  Build and start:
        cd /opt/maningo-method
        docker compose up -d --build

□ 8.  Verify container is running:
        docker ps | grep maningo
        curl http://localhost:3003

NETWORKING
──────────
□ 9.  Add nginx server block for maningo.hosthampton.com:
        nano /opt/hosthampton/nginx/nginx.conf
        (Add the server block from Section 4)

□ 10. Add host.docker.internal to HH nginx service:
        nano /opt/hosthampton/docker-compose.yml
        (Add extra_hosts under nginx service)

□ 11. Add maningo.hosthampton.com to HTTP→HTTPS redirect:
        (In the same nginx.conf edit from step 9)

□ 12. Restart nginx:
        cd /opt/hosthampton
        docker compose restart nginx

□ 13. Add Cloudflare DNS record:
        Type: A
        Name: maningo
        Content: 5.161.88.134
        Proxy: ON (orange cloud)

□ 14. Wait 1-2 minutes for DNS propagation, then test:
        curl -I https://maningo.hosthampton.com

STRIPE WEBHOOK
──────────────
□ 15. In Stripe Dashboard → Developers → Webhooks:
        Add endpoint: https://maningo.hosthampton.com/api/webhooks/stripe
        Events: checkout.session.completed, customer.subscription.*,
                invoice.payment_failed, invoice.paid
        Copy signing secret → update STRIPE_WEBHOOK_SECRET in .env

□ 16. Restart container to pick up webhook secret:
        cd /opt/maningo-method
        docker compose up -d

EMAIL
─────
□ 17. In Resend → add sender domain or identity for Maningo
        (See Section 8 for DNS records if using subdomain)

DATABASE
────────
□ 18. Run migrations against Supabase:
        (From local dev machine with Supabase CLI, or via SQL editor)

VERIFY
──────
□ 19. Full smoke test:
        curl https://maningo.hosthampton.com/api/health
        - Visit https://maningo.hosthampton.com in browser
        - Test Stripe checkout flow
        - Test email delivery

□ 20. Set up monitoring:
        - UptimeRobot: https://maningo.hosthampton.com/api/health
        - Interval: 5 min
```

---

## Section 11: Gotchas & Lessons from Host Hampton

### 1. Next.js Standalone: Lazy-Init Pattern

In Next.js standalone mode (Docker), environment variables are only available at runtime, not build time. **Lazy-initialize** Stripe and Supabase clients inside request handlers, not at module scope:

```typescript
// BAD — breaks in standalone Docker
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// GOOD — works in standalone Docker
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}
```

### 2. Docker DNS Resolver

If your nginx config references Docker container names as upstreams, add `resolver 127.0.0.11 valid=5s;` to the `http` block. This only works for containers on the same Docker network. Since Maningo is on a separate network from HH's nginx, we proxy to the host port instead.

### 3. CORS Handling

Handle CORS in your application code (Express middleware or Next.js API route headers), **never in nginx**. This is the pattern all projects on this VPS follow.

### 4. File Bind-Mounts Are Inode-Based

After editing bind-mounted files (like `nginx.conf`), you must **restart the container**, not just reload the service inside it. The container sees the old inode.

```bash
docker compose restart nginx   # Required after editing nginx.conf
```

### 5. `req.nextUrl.origin` in Docker

Inside a Docker container, `req.nextUrl.origin` resolves to the internal hostname (e.g., `http://localhost:3000`), not the public URL. Use `x-forwarded-host` or `host` header instead:

```typescript
const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'maningo.hosthampton.com'
```

### 6. SSL Certificate Renewal

The VPS uses **Cloudflare Origin Certificates** (not Let's Encrypt). These are long-lived (15-year default) and stored at `/etc/ssl/hosthampton/`. No auto-renewal process needed. The wildcard `*.hosthampton.com` cert covers `maningo.hosthampton.com` automatically.

### 7. Disk Space Pressure

The VPS disk is at **85% usage**. Docker build cache alone is 41 GB. Before deploying Maningo Method:

```bash
docker builder prune -f         # Reclaims ~41 GB
docker image prune -f           # Reclaims unused images
```

Run this periodically or add a cron job:

```bash
# Weekly Docker cleanup (Sunday 3 AM)
0 3 * * 0 docker builder prune -f --filter "until=168h" >> /var/log/docker-prune.log 2>&1
```

### 8. Port 3001 Is NOT Available

The HappyHome project already uses port 3001. Maningo Method uses **port 3003**.

### 9. No CI/CD

All projects on this VPS deploy manually via SSH. The deploy flow is:
```bash
ssh hampton-vps
cd /opt/maningo-method
git pull origin main
docker compose up -d --build
```

### 10. UFW Firewall Is Inactive

The VPS has **no firewall enabled** (`ufw status` = inactive). Docker manages its own iptables rules. This is functional but worth noting — consider enabling UFW with Docker-aware rules if security hardening is needed.

### 11. Environment Variable Reloads

Changing `.env` values requires a full container rebuild, not just a restart:
```bash
docker compose up -d --build    # Picks up new env vars
# NOT: docker compose restart   # This does NOT reload .env
```

### 12. Cron Jobs Are External

HH uses [cron-job.org](https://cron-job.org) for scheduled tasks (sequence processing, reminders, campaigns). Maningo Method should do the same — don't add cron jobs to the VPS crontab. The VPS crontab is reserved for EasternLM and MyGravelGuy.

### 13. Security Findings from This Audit

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| GitHub PAT exposed in git remote URL | Medium | Switch to deploy keys |
| SSH password auth may be enabled | Low | Add `PasswordAuthentication no` to sshd_config |
| UFW firewall inactive | Low | Enable with Docker-aware rules |
| Disk at 85% | Medium | Prune Docker build cache immediately |
