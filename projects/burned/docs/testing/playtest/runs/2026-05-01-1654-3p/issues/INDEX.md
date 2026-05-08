# Triage issue index



## Summary

- **Total issues:** 10
- **Status:** OPEN 0 · RESOLVED 3 · BLOCKED 0 · DUPLICATE 0 · KNOWN-PRODUCT-CALL 5 · LOW-SIGNAL 2
- **Severity:** P0 0 · P1 2 · P2 8
- **By seed kind:**
  - scripted-scenario: 8
  - free-play: 0
  - vibe-check: 1
  - ui-spec-divergence: 0
  - role-drift: 0
  - with-divergence-fire: 1
  - coverage-divergence: 0

## Scripted-scenario findings

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [002-scn-go-dark-normal-01](002-scn-go-dark-normal-01.md) | Go Dark normal play: scenario fired clean; clusterer candidate-duplicate is a false positive | P2 | LOW-SIGNAL | SCN-GO-DARK-NORMAL-01 | SCN-GO-DARK-NORMAL-01 / B-13 (clusterer-populated) — FALSE POSITIVE: catalog `known-product-call:` for SCN-GO-DARK-NORMAL-01 is `none`; the B-13 link does not appear in this scenario's catalog entry. See Diagnosis. |
| [003-scn-favor-normal-01](003-scn-favor-normal-01.md) | Card-played toast persists through full favor-pending sub-phase for observer | P2 | RESOLVED | SCN-FAVOR-NORMAL-01 (catalog ID: SCN-CALL-IN-FAVOR-NORMAL-01) | Root cause was aria-live region staleness in `announce()`, not React toast lifecycle; `announce()` now self-clears 5s after each message. See insight 045. |
| [004-scn-favor-normal-01](004-scn-favor-normal-01.md) | Normal favor exchange is clean; candidateDuplicate is a clusterer false-positive | P2 | LOW-SIGNAL | SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01) | SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 / B-05 — CATALOG MISMATCH (see Diagnosis) |
| [008-scn-burned-draw-axis11-01](008-scn-burned-draw-axis11-01.md) | ACTOR drama beat absent or imperceptible before DefusePlacement sheet | P2 | RESOLVED-NO-FIX | SCN-BURNED-DRAW-AXIS11-01 (catalog: SCN-BURNED-DRAW-AUTO-DEFUSE-01) | Briggsy real-device eyeball 2026-05-08: distinct moments, no blur — agent perception artifact, no code change |

## Free-play findings

Loose clustering — no fixed scenario IDs (D12 / R9). Phase 6 calibration tunes the 60s window if false positives appear.

_No findings of this kind this session._

## Vibe-check findings

Spec-level findings against `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) + §3 (Archer visual vocabulary). Not engine bugs (D11 / R8).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [007-vibe-scn-burn-the-files-normal-01](007-vibe-scn-burn-the-files-normal-01.md) | Phone gives zero feedback when burn-the-files shuffles the deck | P2 | RESOLVED | SCN-BURN-THE-FILES-NORMAL-01 (catalog ID: SCN-BURN-FILES-NORMAL-01 — see note) | resolved by `21c9e811` — DramaOverlay FILES BURNED beat |

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

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [001-withdiv-scn-favor-normal-01](001-withdiv-scn-favor-normal-01.md) | Favor target receives no pendingPrompt (known disconnect-wedge B-05) | P1 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-FAVOR-NORMAL-01 | SCN-FAVOR-NORMAL-01 (linked: B-05) |
| [005-scn-favor-normal-01](005-scn-favor-normal-01.md) | Normal Favor play — KNOWN-PRODUCT-CALL-CONFIRMED against B-05 (possible clusterer false positive — see diagnosis) | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-FAVOR-NORMAL-01 | SCN-FAVOR-NORMAL-01 (linked: B-05) |
| [006-scn-burn-the-files-normal-01](006-scn-burn-the-files-normal-01.md) | Burn the Files normal shuffle — clean fire; candidate duplicate is a clusterer false match | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-BURN-THE-FILES-NORMAL-01 | SCN-BURN-FILES-NORMAL-01 (catalog) + B-04 (E2E-ISSUE-LIST) — NOTE: clusterer false match; see Diagnosis |
| [009-scn-burned-draw-axis11-01](009-scn-burned-draw-axis11-01.md) | Drama beat absent on phone before DefusePlacement sheet (KNOWN-PRODUCT-CALL-CONFIRMED) | P1 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-BURNED-DRAW-AXIS11-01 | SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01 (linked: B-03) |
| [010-scn-burned-draw-axis11-01](010-scn-burned-draw-axis11-01.md) | Burned draw defuse-pending (axis-11 visibility) — known product call | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-BURNED-DRAW-AXIS11-01 | SCN-BURNED-DRAW-AXIS11-01 (linked: B-03) |
