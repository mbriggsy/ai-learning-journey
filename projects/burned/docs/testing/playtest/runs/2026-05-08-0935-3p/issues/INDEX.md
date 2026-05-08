# Triage issue index



## Summary

- **Total issues:** 0
- **Status:** OPEN 0 · RESOLVED 0 · BLOCKED 0 · DUPLICATE 0 · KNOWN-PRODUCT-CALL 0 · LOW-SIGNAL 0
- **Severity:** P0 0 · P1 0 · P2 0
- **By seed kind:**
  - scripted-scenario: 0
  - free-play: 0
  - vibe-check: 0
  - ui-spec-divergence: 0
  - role-drift: 0
  - with-divergence-fire: 0
  - coverage-divergence: 0

## Scripted-scenario findings

_No findings of this kind this session._

## Free-play findings

Loose clustering — no fixed scenario IDs (D12 / R9). Phase 6 calibration tunes the 60s window if false positives appear.

_No findings of this kind this session._

## Vibe-check findings

Spec-level findings against `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) + §3 (Archer visual vocabulary). Not engine bugs (D11 / R8).

_No findings of this kind this session._

## UI-spec-divergence findings

Phone view contradicts Column 2 prose for the seat's role (D13 / R10). The "Ruling A" column flags issues where Column 1 was redacted by the scrubber and triage emitted "cannot determine from scrubbed data" — Phase 6 sidecar work decides whether to restore automated Column-1 inference.

_No findings of this kind this session._

## Role-drift findings — low-signal

⚠️ **Low-signal — may reflect server viewer-gating rather than UI bugs; Phase 6 calibrates.** Default status is `LOW-SIGNAL` unless cross-corroborated by a same-window suspicion or vibe-check (D15 / Ruling B).

_No findings of this kind this session._

## With-divergence fires

Scenario fired but a tier-2 / tier-3 oracle caught a divergence (D17). Counted as fired toward the >=50 coverage threshold; the divergence is still a bug.

_No findings of this kind this session._

## Coverage divergences

Self-vs-detector mismatches from `coverage.md` (Phase 3 Unit 10). `column-1-vs-2` divergences appear in the UI-spec-divergence section above instead.

_No findings of this kind this session._

## Known-product-calls confirmed

Harness re-discovered scenarios already tagged as known product calls in the scenario catalog (phase-1 D4) — links back to the catalog entry + the cited E2E-ISSUE-LIST ID for human context (R11 / D5 / Ruling C).

_No findings of this kind this session._
