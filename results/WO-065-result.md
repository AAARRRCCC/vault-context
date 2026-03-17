---
id: WO-065
status: blocked
completed: 2026-03-17
worker: claude-code
---

# WO-065 Result: Matrix Server Health Check & Auto-Recovery

## What Was Done

**Root cause diagnosed:** Two separate failures were stacked.

**Failure 1 — Colima not running (fixed):**
- Colima VM had a stale disk lock at `~/.colima/_lima/_disks/colima/in_use_by` (symlink pointing to the crashed instance directory)
- `colima start` failed with "failed to run attach disk, in use by instance colima"
- Fix: removed the stale symlink, Colima started cleanly

**Failure 2 — Cloudflare tunnel token invalid (BLOCKED):**
- With QUIC protocol (default), cloudflared fails with "control stream encountered a failure while serving" — QUIC was masking the real error
- With HTTP/2, the real error surfaced: **"Unauthorized: Invalid tunnel secret"**
- The token in `~/matrix-server/.env` is no longer valid — the tunnel was likely deleted or a new credential was generated in the Cloudflare dashboard

## What's Running Now

- Colima: running
- tuwunel: running and healthy (`localhost:8008/_matrix/client/versions` returns 200)
- element-web: running and healthy
- cloudflared: NOT running — token invalid

## Changes Made

1. `~/matrix-server/docker-compose.yml` — removed cloudflared service (noted reason: QUIC issues inside Colima VM + token invalid anyway). All remaining services have `restart: unless-stopped`.
2. `~/Library/LaunchAgents/net.cloudflare.cloudflared.plist` — created launchd agent for native cloudflared (better network stack than Colima VM). Will be used once token is fixed.
3. `vault-context/SYSTEM_STATUS.md` — updated Matrix section with Colima fix procedure, cloudflared native setup, token regeneration steps, and current status.
4. Installed cloudflared natively via Homebrew (`/opt/homebrew/bin/cloudflared`).

## Action Required from Brady

**Go to Cloudflare Zero Trust dashboard → Networks → Tunnels → find plvr.net tunnel.**

Options:
- If tunnel still exists: click "Configure" → copy the new token → update `~/matrix-server/.env` (`CLOUDFLARED_TOKEN=<new-token>`) and update the token in `~/Library/LaunchAgents/net.cloudflare.cloudflared.plist`, then `launchctl load` the plist.
- If tunnel was deleted: create a new tunnel, configure routes (plvr.net → localhost:8008 for Matrix, chat.plvr.net → localhost:80 for Element), copy token → same update steps.

After Brady updates the token, the worker (or Brady) can load the launchd service and verify:
```bash
launchctl load ~/Library/LaunchAgents/net.cloudflare.cloudflared.plist
sleep 10 && curl -s https://plvr.net/_matrix/client/versions
```

## Acceptance Criteria Status

- [x] All Matrix stack services running and healthy (tuwunel + element-web yes; cloudflared blocked)
- [ ] Cloudflare Tunnel serving plvr.net endpoints — BLOCKED (invalid token)
- [x] `restart: unless-stopped` on all compose services
- [ ] Verified auto-recovery after reboot — partially: Docker services will auto-restart; cloudflared launchd plist exists but not loaded until token is fixed
- [x] SYSTEM_STATUS.md updated
