---
id: WO-054
status: complete
completed: 2026-03-06
worker: claude-code
---

# WO-054 Result — Fix Switch-Aware VLAN Routing

## What Was Done

Applied the one-line fix in `_infer_from_switches()` in `connection_inference.py`:

**Before:**
```python
best_switch = self._find_best_switch(device, switches)
```

**After:**
```python
best_switch = self._find_best_switch(device, access_switches) or self._find_best_switch(device, switches)
```

End devices now try access switches first before falling back to the full switch list (which includes the core switch). This prevents the core switch from winning VLAN overlap scoring against access switches.

## Changes Made

- `network-topology-mapper/backend/app/services/scanner/connection_inference.py` — line 193, single-line change

## Verification

```
20 passed in 0.01s
```

All 20 tests pass including the previously failing `test_access_switches` and `test_vlan_matching`.

## Commit

`00793d7` on branch `plan-b/connection-inference`, tagged `post-WO-054`.
