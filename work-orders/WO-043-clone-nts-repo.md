---
id: WO-043
title: Clone NTS repo to worker
status: pending
priority: high
plan: NTS Plan A (prereq)
created: 2026-03-06
---

# WO-043: Clone NTS Repo to Worker

## Context

The Network Topology Scanner project lives at `borumea/Network-Topology-Scanner`. All future NTS work orders will operate in `~/projects/network-topology-scanner`. This WO sets up the local clone.

## Tasks

1. Create the projects directory if it doesn't exist:
   ```bash
   mkdir -p ~/projects
   ```

2. Clone the repo:
   ```bash
   cd ~/projects
   git clone https://github.com/borumea/Network-Topology-Scanner.git network-topology-scanner
   ```

3. Verify the clone:
   ```bash
   cd ~/projects/network-topology-scanner
   git log --oneline -5
   ls network-topology-mapper/backend/app/main.py
   ```

4. Confirm working directory exists and report back the latest commit hash.

## Acceptance Criteria

- `~/projects/network-topology-scanner` exists and contains the full repo
- `git status` shows clean working tree on `main`

## Notes

- This is a public repo — no auth needed for clone.
- Future NTS WOs will specify `~/projects/network-topology-scanner` as the working directory. Do NOT work in the knowledge-base vault for NTS tasks.
