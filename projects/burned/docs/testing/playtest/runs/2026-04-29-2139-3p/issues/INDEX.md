# Triage issue index



## Summary

- **Total issues:** 22
- **Status:** OPEN 8 · RESOLVED 4 · BLOCKED 0 · DUPLICATE 0 · KNOWN-PRODUCT-CALL 8 · LOW-SIGNAL 2
- **Severity:** P0 0 · P1 6 · P2 15
- **By seed kind:**
  - scripted-scenario: 14
  - free-play: 2
  - vibe-check: 3
  - ui-spec-divergence: 1
  - role-drift: 1
  - with-divergence-fire: 1
  - coverage-divergence: 0

## Scripted-scenario findings

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [001-session-start](001-session-start.md) | Seat agent used `scenario-fire` with non-catalog scenario ID "SESSION-START" | P2 | OPEN | SESSION-START | — |
| [002-game-start-observation](002-game-start-observation.md) | Self-generated scenario ID not in catalog; lobby showed 2/3 players pre-start | P2 | OPEN | GAME-START-OBSERVATION | — |
| [003-session-start](003-session-start.md) | Uncatalogued scenario ID "SESSION-START" fired by seat-3; no catalog definition exists | P2 | OPEN | SESSION-START | — |
| [006-scn-favor-normal-01](006-scn-favor-normal-01.md) | Favor target single-tap path broken; dual-seat vibe-check "no"; B-05 stall did not fire | P1 | RESOLVED | SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01) | SCN-CALL-IN-FAVOR-NORMAL-01 / B-05 (known-product-call: favor-pending + target disconnects → room frozen) |
| [011-turn-transition-seat1-to-seat2](011-turn-transition-seat1-to-seat2.md) | Ghost scenario ID: uncataloged turn-advance fire from OTHER observer | P2 | OPEN | TURN-TRANSITION-SEAT1-TO-SEAT2 | — |
| [012-scn-go-dark-normal-01](012-scn-go-dark-normal-01.md) | Go Dark ACTOR phone missing drama beat — play feels mechanical, not cinematic | P2 | RESOLVED-BY-DESIGN | SCN-GO-DARK-NORMAL-01 | resolved by `65de88cf` — Briggsy locked Go Dark drama-silent by-design; toast on observer phones |
| [016-scn-go-dark-normal-01](016-scn-go-dark-normal-01.md) | Seat-1 agent mislabeled SCN-GO-DARK-NORMAL-01 to a Burn the Files (shuffle) action | P2 | LOW-SIGNAL | SCN-GO-DARK-NORMAL-01 | Clusterer proposed B-04 (defuse-pending disconnect); catalog entry for SCN-GO-DARK-NORMAL-01 says `known-product-call: none` — candidate duplicate is erroneous, not confirmed. |
| [018-intercept-window-observed-seat1-turn](018-intercept-window-observed-seat1-turn.md) | Uncatalogued scenario ID: nope/Intercept window observed as OTHER (alive) with disabled button | P2 | OPEN | INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN | — |

## Free-play findings

Loose clustering — no fixed scenario IDs (D12 / R9). Phase 6 calibration tunes the 60s window if false positives appear.

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [005-call-in-a-favor-card-played-freeplay](005-call-in-a-favor-card-played-freeplay.md) | StatusBar shows no feedback to OTHER (alive) during favor exchange | P1 | RESOLVED-BY-SIDE-EFFECT | — | resolved by `0cfd0963` (PlayerAlert persistUntil favor-given) |
| [022-direct-order-card-played-freeplay](022-direct-order-card-played-freeplay.md) | direct-order target sees silent double-draw — no "under attack" indicator | P2 | OPEN | — | — |

## Vibe-check findings

Spec-level findings against `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) + §3 (Archer visual vocabulary). Not engine bugs (D11 / R8).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [010-vibe-scn-favor-normal-01](010-vibe-scn-favor-normal-01.md) | Favor exchange reads as silent database transaction on both phones | P1 | RESOLVED | SCN-FAVOR-NORMAL-01 | — |
| [014-vibe-scn-go-dark-normal-01](014-vibe-scn-go-dark-normal-01.md) | Go Dark ACTOR phone has no drama beat; play reads as mechanical skip | P2 | OPEN | SCN-GO-DARK-NORMAL-01 | — |
| [015-vibe-scn-skip-normal-01](015-vibe-scn-skip-normal-01.md) | Observer phone shows no card-played announcement during Go Dark skip beat | P2 | OPEN | SCN-SKIP-NORMAL-01 | — |

## UI-spec-divergence findings

Phone view contradicts Column 2 prose for the seat's role (D13 / R10). The "Ruling A" column flags issues where Column 1 was redacted by the scrubber and triage emitted "cannot determine from scrubbed data" — Phase 6 sidecar work decides whether to restore automated Column-1 inference.

_No findings of this kind this session._

## Role-drift findings — low-signal

⚠️ **Low-signal — may reflect server viewer-gating rather than UI bugs; Phase 6 calibrates.** Default status is `LOW-SIGNAL` unless cross-corroborated by a same-window suspicion or vibe-check (D15 / Ruling B).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [008-roledrift-seat-2-target](008-roledrift-seat-2-target.md) | Role-drift detector timing gap: ROLE_DRIFT_WINDOW_MS too narrow for stuck-player scenarios | P2 | LOW-SIGNAL | SCN-FAVOR-NORMAL-01 | — |

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
| [004-scn-favor-normal-01](004-scn-favor-normal-01.md) | Favor-pending ACTOR information gap; scenario completed correctly but flagged as known product call (B-05) | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-FAVOR-NORMAL-01 | SCN-FAVOR-NORMAL-01 → B-05 |
| [007-uispec-scn-favor-normal-01](007-uispec-scn-favor-normal-01.md) | Favor TARGET single-tap staging broken; clusterer matched to B-05 (disconnect wedge) | P1 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-FAVOR-NORMAL-01 | SCN-FAVOR-NORMAL-01 (linked: B-05) |
| [009-scn-favor-normal-01](009-scn-favor-normal-01.md) | Favor normal play resolved cleanly; clusterer false-linked to B-05 disconnect wedge | ? | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-FAVOR-NORMAL-01 (catalog: SCN-CALL-IN-FAVOR-NORMAL-01) | SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 + SCN-CONN-FAVOR-PENDING-DISCONNECT-01 (linked: B-05) |
| [013-scn-skip-normal-01](013-scn-skip-normal-01.md) | SCN-SKIP-NORMAL-01 fire matched to B-13 disconnect-wedge known product call | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-SKIP-NORMAL-01 | SCN-SKIP-NORMAL-01 + linked E2E-ISSUE-LIST ID B-13 |
| [017-scn-skip-normal-01](017-scn-skip-normal-01.md) | Go Dark normal skip: clean fire; session-end disconnect adjacent to B-13 cluster | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-SKIP-NORMAL-01 (seat-agent-assigned ID, catalog equivalent is SCN-GO-DARK-NORMAL-01) | SCN-SKIP-NORMAL-01 (seat-agent ID, not in catalog) + B-13 (E2E-ISSUE-LIST disconnect-wedge cluster) |
| [019-withdiv-scn-burned-draw-axis11-01](019-withdiv-scn-burned-draw-axis11-01.md) | Burned-draw auto-defuse scenario: known product call, tier-2 oracle failures are harness false negatives | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-BURNED-DRAW-AXIS11-01 | SCN-BURNED-DRAW-AXIS11-01 (linked: B-03) |
| [020-scn-burned-draw-axis11-01](020-scn-burned-draw-axis11-01.md) | Burned-draw defuse (happy path) confirmed; disconnect-wedge latent risk known | P1 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-BURNED-DRAW-AXIS11-01 | SCN-BURNED-DRAW-AXIS11-01 (linked: B-03) |
| [021-scn-skip-normal-01](021-scn-skip-normal-01.md) | Direct Order skip-draw fires cleanly; B-13 disconnect-wedge adjacent | P1 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-SKIP-NORMAL-01 | SCN-SKIP-NORMAL-01 (linked: B-13) |

## Header parse warnings

These issue files were not parseable into a clean header set. They appear here AND in their best-guess section above; review and fix the issue file or the triage prompt.

| ID | Title | Warnings |
| --- | --- | --- |
| [009-scn-favor-normal-01](009-scn-favor-normal-01.md) | Favor normal play resolved cleanly; clusterer false-linked to B-05 disconnect wedge | severity unrecognized: "n/a (KNOWN-PRODUCT-CALL-CONFIRMED — no new finding)" |
