---
id: WO-052
status: blocked
completed: 2026-03-06
worker: claude-code
---

# WO-052 Result — NTS Connection Inference Unit Tests

## Summary

Test file created and committed. 18/20 tests pass. 2 tests fail due to an engine bug in `connection_inference.py` — **not** a test bug. Awaiting Mayor decision on engine fix.

**Commit:** `6cc4136` on `plan-b/connection-inference`

---

## What Was Done

- Created `network-topology-mapper/backend/tests/__init__.py`
- Created `network-topology-mapper/backend/tests/test_connection_inference.py` (20 tests)
- Installed pytest via pip3 (system Python 3.9.6)
- Ran all tests; 18 passed, 2 failed

---

## Test Results

```
============================= test session starts ==============================
platform darwin -- Python 3.9.6, pytest-8.4.2, pluggy-1.6.0
collected 20 items

tests/test_connection_inference.py::TestGatewayInference::test_star_topology PASSED
tests/test_connection_inference.py::TestGatewayInference::test_gateway_detection_by_device_type PASSED
tests/test_connection_inference.py::TestGatewayInference::test_gateway_fallback_to_dot_one PASSED
tests/test_connection_inference.py::TestGatewayInference::test_no_gateway_found PASSED
tests/test_connection_inference.py::TestGatewayInference::test_device_outside_subnet_excluded PASSED
tests/test_connection_inference.py::TestGatewayInference::test_no_self_loop PASSED
tests/test_connection_inference.py::TestGatewayInference::test_connection_schema PASSED
tests/test_connection_inference.py::TestGatewayInference::test_ap_gets_wireless_connection_type PASSED
tests/test_connection_inference.py::TestSwitchAwareInference::test_basic_hierarchy PASSED
tests/test_connection_inference.py::TestSwitchAwareInference::test_access_switches FAILED
tests/test_connection_inference.py::TestSwitchAwareInference::test_vlan_matching FAILED
tests/test_connection_inference.py::TestSwitchAwareInference::test_firewall_connects_to_gateway PASSED
tests/test_connection_inference.py::TestSwitchAwareInference::test_no_vlan_data_falls_back_to_first_switch PASSED
tests/test_connection_inference.py::TestDeduplication::test_no_duplicate_edges PASSED
tests/test_connection_inference.py::TestDeduplication::test_unique_connection_ids PASSED
tests/test_connection_inference.py::TestEdgeCases::test_empty_device_cache PASSED
tests/test_connection_inference.py::TestEdgeCases::test_single_device PASSED
tests/test_connection_inference.py::TestEdgeCases::test_invalid_subnet PASSED
tests/test_connection_inference.py::TestEdgeCases::test_device_with_no_ip PASSED
tests/test_connection_inference.py::TestEdgeCases::test_lldp_stub_returns_empty PASSED

========================= 2 failed, 18 passed =================================
```

---

## Failures — Engine Bug Analysis

### test_access_switches

**Expected:** workstation with `vlan_ids=[10]` connects to access switch `sw-acc1` (which carries VLAN 10), not the core switch.

**Actual:** engine connects `ws-01` to `sw-core` instead of `sw-acc1`.

```
AssertionError: assert frozenset({'sw-acc1', 'ws-01'}) in
  {frozenset({'rtr', 'sw-core'}),
   frozenset({'sw-acc1', 'sw-core'}),
   frozenset({'sw-acc2', 'sw-core'}),
   frozenset({'sw-core', 'ws-01'})}   ← engine connected to core, not access
```

### test_vlan_matching

**Expected:** server with `vlan_ids=[20]` connects to `sw-20` (access switch carrying VLAN 20).

**Actual:** engine connects `srv` to `sw-core` instead.

```
AssertionError: assert frozenset({'srv', 'sw-20'}) in
  {frozenset({'rtr', 'sw-core'}),
   frozenset({'sw-20', 'sw-core'}),
   frozenset({'sw-10', 'sw-core'}),
   frozenset({'srv', 'sw-core'})}   ← engine connected to core, not access
```

---

## Root Cause

The switch-aware strategy in `connection_inference.py` correctly identifies core vs. access switches and builds the switch hierarchy, but end devices are being assigned to the core switch rather than routed down to the access switch matching their VLAN. The VLAN-based end-device assignment logic is either missing or matching against the core switch first (which carries all VLANs and thus always wins the match).

---

## Decision Needed from Mayor

Two options:
1. **Fix the engine** — update the access-switch assignment logic in `connection_inference.py` to prefer the most specific (fewest VLANs) switch that carries the device's VLAN, excluding the core switch.
2. **Relax the tests** — if the current behavior (all end devices → core switch) is acceptable for the prototype, update `test_access_switches` and `test_vlan_matching` to match actual behavior.

Option 1 is correct per the original spec. Option 2 may be acceptable if full hierarchical routing is deferred.
