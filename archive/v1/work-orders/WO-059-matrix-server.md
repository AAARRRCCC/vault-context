---
id: WO-059
title: Deploy Matrix Homeserver (Tuwunel + Element Web + Cloudflare Tunnel)
status: complete
priority: high
created: 2026-03-14
---

# WO-059: Deploy Matrix Homeserver

## Context

Brady wants a self-hosted Matrix chat server for himself and 2 friends. Stack has been fully planned out in conversation with Mayor. This is a greenfield deployment — no existing Matrix infrastructure.

## Stack Overview

- **Server:** Tuwunel (Rust Matrix homeserver, successor to Conduwuit)
- **Web Client:** Element Web (self-hosted)
- **Tunnel:** Cloudflare Tunnel via `cloudflared` Docker container
- **Voice/Video:** `turn.matrix.org` (public TURN server, no self-hosted coturn needed)
- **No Discord bridge.** No PostgreSQL. No Caddy/nginx (Cloudflare handles TLS).

3 Docker containers total: tuwunel, element-web, cloudflared.

## Domain Architecture

- **Server name (permanent):** `plvr.net`
- **User IDs:** `@arc:plvr.net` (Brady/admin), friends pick their own via invite tokens
- **Tuwunel API:** `https://plvr.net` (routes `/_matrix/*` traffic)
- **Element Web:** `https://chat.plvr.net`
- **Federation:** enabled, Tuwunel serves `.well-known` natively via `serve_server_wellknown: true`

## Cloudflare Tunnel

Tunnel already created in Cloudflare dashboard. Two public hostname routes already configured:
- `plvr.net` → `http://localhost:8008`
- `chat.plvr.net` → `http://localhost:80`

**Tunnel token:**
```
eyJhIjoiM2EzYTU1ZGM2ZDg5MDM0N2Q1NDczYjcwZWM3ZjU2NDQiLCJ0IjoiMDEyOWQxMWUtZWE2Yi00MmFkLTkwYTQtZTdiOTI5MzVhZjM5IiwicyI6IlltUmhNMlZtWVRJdE9EbGlOaTAwT0RZM0xUaGlNamt0TVdJNE5qbGpNREEyWmpGayJ9
```

## Checklist

### 1. Project Directory
- [ ] Create `~/matrix-server/` on Mac Mini as the project root
- [ ] Subdirectories: `data/tuwunel/`, `config/`

### 2. Tuwunel Configuration
- [ ] Create `tuwunel.toml` config file with:
  - `server_name = "plvr.net"`
  - `database_path = "/data/db"` (RocksDB, embedded)
  - `port = 8008`
  - `address = "0.0.0.0"`
  - `allow_registration = true`
  - `registration_token_required = true` (token-gated registration)
  - `serve_server_wellknown = true` (federation on port 443 via Cloudflare)
  - `allow_federation = true`
  - TURN config pointing at `turn.matrix.org` (check Tuwunel docs for exact TURN fields)
  - `allow_encryption = true`
  - `presence = true` (only 3 users, no performance concern)
- [ ] Verify config field names against Tuwunel's actual documentation — field names may differ from Synapse

### 3. Element Web Configuration
- [ ] Create `element-config.json`:
  ```json
  {
    "default_server_config": {
      "m.homeserver": {
        "base_url": "https://plvr.net",
        "server_name": "plvr.net"
      }
    }
  }
  ```

### 4. Docker Compose
- [ ] Create `docker-compose.yml` with 3 services:

**tuwunel:**
- Image: `ghcr.io/matrix-construct/tuwunel:main` (verify correct image path — check DockerHub/GHCR)
- Volumes: `./data/tuwunel:/data`, `./config/tuwunel.toml:/etc/tuwunel/tuwunel.toml` (verify mount path from docs)
- Port: 8008 (internal only, cloudflared routes to it)
- Restart: unless-stopped

**element-web:**
- Image: `vectorim/element-web:latest`
- Volumes: `./config/element-config.json:/app/config.json:ro`
- Port: 80 (internal only)
- Restart: unless-stopped

**cloudflared:**
- Image: `cloudflare/cloudflared:latest`
- Command: `tunnel --no-autoupdate run --token <TOKEN>`
- Network mode: `host` (needs to reach tuwunel on localhost:8008 and element on localhost:80)
- Restart: unless-stopped
- Note: if using Docker bridge networking instead of host mode, cloudflared needs to reference container names not localhost. Evaluate which approach is cleaner.

### 5. Startup & Verification
- [ ] `docker compose up -d`
- [ ] Verify Tuwunel is reachable: `curl https://plvr.net/_matrix/client/versions`
- [ ] Verify federation: `curl https://plvr.net/.well-known/matrix/server`
- [ ] Verify Element Web loads: `curl https://chat.plvr.net`
- [ ] Check federation tester: note URL `https://federationtester.matrix.org/api/report?server_name=plvr.net` (worker can curl this)

### 6. Account Setup
- [ ] Register admin account `arc` — Tuwunel may auto-admin first registered user, verify behavior
- [ ] If Tuwunel uses admin room commands: join the admin room and create the account there
- [ ] If CLI registration exists: use that instead
- [ ] Generate 2 registration tokens for Brady's friends
- [ ] Report the tokens back to Brady (via Discord bot message or signal)

### 7. Smoke Test
- [ ] Log into Element Web at `chat.plvr.net` as `@arc:plvr.net`
- [ ] Create a test room
- [ ] Verify federation by joining a public room on matrix.org (e.g., `#test:matrix.org` or similar)
- [ ] Note: voice/video call testing requires a second user — Brady will test manually with friends

## Important Notes

- **Tuwunel is NOT Synapse.** Config format, CLI commands, image paths, and admin workflows will differ. Read Tuwunel docs first: https://matrix-construct.github.io/tuwunel/
- **Do NOT use Synapse guides** for config — field names and structure are different.
- **ARM64 images required** — Mac Mini M4 is Apple Silicon. Verify the Tuwunel Docker image supports arm64.
- **The tunnel token is sensitive.** Don't commit it to vault-context. Use an env file or Docker secret.
- **cloudflared networking:** The tunnel routes `plvr.net` → `localhost:8008` and `chat.plvr.net` → `localhost:80`. If using Docker bridge networking, cloudflared must be on the same Docker network as the other containers and reference them by container name. If using host networking for cloudflared, the other containers must publish their ports to the host. Pick one approach and be consistent.
- **RocksDB data lives in `./data/tuwunel/`** — this is the only thing that needs backing up (plus the signing key generated on first run).

## Success Criteria

- `https://plvr.net/_matrix/client/versions` returns valid JSON
- `https://chat.plvr.net` loads Element Web with plvr.net pre-configured
- `@arc:plvr.net` account exists and can log in
- 2 registration tokens generated and reported back
- Federation test passes at `federationtester.matrix.org`
