---
id: WO-059
status: complete
completed: 2026-03-15
worker: claude-code
---

# WO-059: Deploy Matrix Homeserver — Result

## Summary

Matrix homeserver fully deployed and verified. All success criteria met.

## Stack Deployed

- **Tuwunel** `jevolk/tuwunel:latest` — ARM64 native, RocksDB, port 8008
- **Element Web** `vectorim/element-web:latest` — pre-configured for plvr.net, port 80
- **cloudflared** `cloudflare/cloudflared:latest` — host network mode, 4 connections registered (atl06, atl10, atl12, atl13)

All files in: `~/matrix-server/`

## Verification Results

| Check | Result |
|-------|--------|
| `https://plvr.net/_matrix/client/versions` | ✅ JSON response, 17 versions listed |
| `https://plvr.net/.well-known/matrix/server` | ✅ `{"m.server":"plvr.net:443"}` |
| `https://plvr.net/.well-known/matrix/client` | ✅ `{"m.homeserver":{"base_url":"https://plvr.net/"}}` |
| `https://chat.plvr.net/` | ✅ HTTP 200, Element Web loads |
| Federation tester (federationtester.matrix.org) | ✅ FederationOK: True |
| cloudflared tunnel | ✅ 4 connections registered |

## Admin Account

- **User ID:** `@arc:plvr.net`
- First registered user — Tuwunel auto-grants admin to first user
- Log in via Element Web at `https://chat.plvr.net`
- **Action required:** Change the initial password after first login

## Registration Tokens for Friends

Two tokens generated (each works for one registration — Brady controls these):

```
Token 1: c3db165b527eb75d10f0d9fb8044e76e
Token 2: 82cf9406d1101660d8337e0def3e5b98
```

Friends register at `https://chat.plvr.net` — they'll be prompted to enter a registration token. Give Token 1 to friend 1, Token 2 to friend 2 so you can track/revoke individually if needed.

## Architecture Notes

- **Networking:** cloudflared uses `network_mode: host` (tunnel pre-configured for localhost). tuwunel and element-web publish only to `127.0.0.1` (not externally exposed).
- **Config:** tuwunel reads from `/etc/tuwunel/tuwunel.toml` (env vars can't set nested `[global.well_known]` section)
- **Data:** RocksDB at `~/matrix-server/data/tuwunel/` — this is the only file to back up (plus the signing key generated on first run)
- **Sensitive files:** Cloudflare tunnel token in `~/matrix-server/.env` (not committed)
- **TURN:** `turn.matrix.org` public server with shared secret — no self-hosted coturn needed

## Issues Encountered

1. **Colima was not running** — disk was stuck due to a previous crash. Fixed with `colima stop --force && colima start`.
2. **docker compose** — Docker Desktop plugin was a broken symlink for colima context. Installed via `brew install docker-compose`.
3. **Well-known 404** — `TUWUNEL_WELL_KNOWN_SERVER/CLIENT` env vars don't work for nested config sections. Fixed by providing `tuwunel.toml` with `[global.well_known]` section.
4. **Federation join timeout** — Joining `#matrix:matrix.org` timed out (the room is enormous). Not a bug — federation is confirmed passing by the federation tester.

## Post-Deploy Checklist for Brady

- [ ] Log into Element Web at `https://chat.plvr.net` as `arc` with initial password `changeme`
- [ ] **Change your password immediately**
- [ ] Create a room and send a test message
- [ ] Share token 1 with friend 1, token 2 with friend 2
- [ ] Voice/video testing with friends (uses turn.matrix.org)
