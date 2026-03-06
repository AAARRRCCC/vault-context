---
id: WO-054
title: "NTS Plan B — Fix switch-aware VLAN routing bug"
status: pending
priority: high
plan: NTS-Plan-B
project: nts
repo: borumea/Network-Topology-Scanner
work_dir: ~/projects/network-topology-scanner
depends_on: WO-049
---

# WO-054 — Fix Switch-Aware VLAN Routing Bug

> **Plan B hotfix** — Worker execution task.
> **Branch:** `plan-b/connection-inference`

---

## Problem

`test_access_switches` and `test_vlan_matching` fail (WO-052 blocked, 18/20 pass).

Root cause: `_infer_from_switches()` in `connection_inference.py` passes **all** switches (including the core switch) to `_find_best_switch()`. The core switch carries every VLAN (e.g., `[1, 10, 20, 30]`), so it always ties or wins the VLAN overlap score against access switches. End devices connect to the core switch instead of their VLAN-matched access switch.

## Fix

**File:** `network-topology-mapper/backend/app/services/scanner/connection_inference.py`

In `_infer_from_switches()`, find this line inside the end device loop:

```python
best_switch = self._find_best_switch(device, switches)
```

Replace with:

```python
best_switch = self._find_best_switch(device, access_switches) or self._find_best_switch(device, switches)
```

This tries access switches first. Only if no access switch matches does it fall back to all switches (which includes core). Produces the correct hierarchy: end devices → access switch → core switch → gateway.

**That is the only change.** Do not modify any other file.

## Verification

```bash
cd ~/projects/network-topology-scanner/network-topology-mapper/backend
python -m pytest tests/test_connection_inference.py -v
```

Expected: **20/20 pass**, including `test_access_switches` and `test_vlan_matching`.

## Post-tag

```bash
git add network-topology-mapper/backend/app/services/scanner/connection_inference.py
git commit -m 'WO-054: Fix switch-aware VLAN routing — prefer access switches over core'
git tag post-WO-054
```
