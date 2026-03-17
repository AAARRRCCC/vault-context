---
id: WO-065
title: Matrix Server Health Check & Auto-Recovery
status: blocked
priority: high
created: 2026-03-17
mayor: true
---

# WO-065: Matrix Server Health Check & Auto-Recovery

## Context

The Matrix homeserver at ~/matrix-server (deployed via WO-059) is currently down. Cloudflare Tunnel returns Error 1033 — cloudflared is not running. `ps aux | grep cloudflared` shows no process, and `launchctl list | grep cloudflared` returns nothing. The entire Docker Compose stack appears to be down.

## Tasks

1. **Diagnose current state**: `cd ~/matrix-server && docker compose ps` — document what's running vs stopped. Check `docker compose logs` for crash reasons. Check if Docker Desktop is running.

2. **Bring the stack back up**: `docker compose up -d` and verify all services are healthy (Tuwunel/Synapse, Element Web, cloudflared, any database).

3. **Verify endpoints**: Confirm matrix.plvr.net (or whatever the configured hostname is) resolves through Cloudflare Tunnel. Test `/_matrix/client/versions` and federation endpoint.

4. **Ensure auto-recovery on reboot**: The stack must survive Mac reboots without manual intervention. Options in order of preference:
   - Docker Desktop "Start Docker Desktop when you log in" + compose project restart policy (`restart: unless-stopped` on all services)
   - If not using Docker Desktop: a launchd plist that runs `docker compose up -d` in ~/matrix-server on boot
   - Verify the chosen approach actually works: `docker compose down && docker compose up -d` to confirm restart policies take effect

5. **Document**: Update SYSTEM_STATUS.md with the Matrix server's recovery configuration so future sessions know how it's set up.

## Acceptance Criteria

- [ ] All Matrix stack services running and healthy
- [ ] Cloudflare Tunnel serving plvr.net endpoints (no more Error 1033)
- [ ] `restart: unless-stopped` (or equivalent) on all compose services
- [ ] Verified that `docker compose up -d` is triggered automatically after reboot
- [ ] SYSTEM_STATUS.md updated with Matrix recovery details
