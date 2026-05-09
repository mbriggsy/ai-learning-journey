# Triage issue index



## Summary

- **Total issues:** 39
- **Status:** OPEN 11 · RESOLVED 18 · BLOCKED 1 · DUPLICATE 1 · KNOWN-PRODUCT-CALL 2 · LOW-SIGNAL 6
- **Severity:** P0 0 · P1 6 · P2 33
- **By seed kind:**
  - scripted-scenario: 23
  - free-play: 3
  - vibe-check: 8
  - ui-spec-divergence: 1
  - role-drift: 1
  - with-divergence-fire: 3
  - coverage-divergence: 0

## Scripted-scenario findings

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [005-falsify-intel-normal](005-falsify-intel-normal.md) | Falsify Intel rearrange UI is a tap-number form, not an espionage-weighted cinematic panel | P2 | OPEN | FALSIFY-INTEL-NORMAL (SCN-FALSIFY-INTEL-NORMAL-01) | — |
| [008-scn-back-channel-normal-01](008-scn-back-channel-normal-01.md) | Back Channel normal-play: scenario fires clean; OTHER observer phone view lacks post-resolution drama beat | P2 | RESOLVED | SCN-BACK-CHANNEL-NORMAL-01 | — |
| [011-scn-intercepted-single-at-depth-0-01](011-scn-intercepted-single-at-depth-0-01.md) | Interceptor sees no toast describing what combo is being played during nope window | P2 | RESOLVED | SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 | — |
| [014-back-channel-normal](014-back-channel-normal.md) | Back Channel scenario fires clean from ACTOR seat; low-severity presentation gap corroborates issue 012 | P2 | RESOLVED | BACK-CHANNEL-NORMAL | — |
| [017-scn-call-in-favor-normal-01](017-scn-call-in-favor-normal-01.md) | Favor-response gesture not surfaced to first-time TARGET | P2 | OPEN | SCN-CALL-IN-FAVOR-NORMAL-01 | — |
| [018-scn-call-in-favor-normal-01](018-scn-call-in-favor-normal-01.md) | Favor-response double-tap discoverability (duplicate of 017) | P2 | DUPLICATE | SCN-CALL-IN-FAVOR-NORMAL-01 | n/a (catalog tag; within-session duplicate → see issue 017) |
| [019-scn-falsify-intel-normal-01](019-scn-falsify-intel-normal-01.md) | Falsify Intel normal play: clean fire, privateData channel confirmed working | P2 | LOW-SIGNAL | SCN-FALSIFY-INTEL-NORMAL-01 | — |
| [020-pair-operatives-hit](020-pair-operatives-hit.md) | StealReport shows card name only; no card art rendered for either principal | P2 | OPEN | PAIR-OPERATIVES-HIT (SCN-PAIR-OPERATIVES-HIT-01) | — |
| [021-scn-pair-operatives-hit-01](021-scn-pair-operatives-hit-01.md) | Seat-3 self-reported SCN-PAIR-OPERATIVES-HIT-01 on an intercepted (cancelled) pair steal — false-positive fire | P2 | BLOCKED | SCN-PAIR-OPERATIVES-HIT-01 | — |
| [022-scn-intercepted-single-at-depth-0-01](022-scn-intercepted-single-at-depth-0-01.md) | Interceptor did not see what card was cancelled (pair-combo play, no toast) | P2 | RESOLVED | SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 | — |
| [023-scn-intercepted-single-01](023-scn-intercepted-single-01.md) | Connection Status modal blocks Intercept tap during nope window | P1 | RESOLVED | SCN-INTERCEPTED-SINGLE-01 | 001-unknown-unknown-freeplay (same root cause) |
| [024-scn-intel-briefing-normal-01](024-scn-intel-briefing-normal-01.md) | Intel Briefing normal play: clean fire, privateData not captured in god-event snapshot | P2 | LOW-SIGNAL | SCN-INTEL-BRIEFING-NORMAL-01 | — |
| [025-scn-back-channel-normal-01](025-scn-back-channel-normal-01.md) | Back Channel intercepted: ACTOR receives no phone feedback; FuturePeek re-displays after cancelled nope window | P1 | RESOLVED | SCN-BACK-CHANNEL-NORMAL-01 | — |
| [027-scn-intercepted-single-at-depth-0-01](027-scn-intercepted-single-at-depth-0-01.md) | Interceptor never sees what card they just cancelled (fast-click timing gap) | P2 | RESOLVED | SCN-INTERCEPTED-SINGLE-AT-DEPTH-0-01 | — |
| [029-scn-intel-briefing-normal-01](029-scn-intel-briefing-normal-01.md) | Disabled intercept button shows countdown when observer has no Intercepted cards (working as designed) | P2 | LOW-SIGNAL | SCN-INTEL-BRIEFING-NORMAL-01 | — |
| [030-scn-falsify-intel-actor](030-scn-falsify-intel-actor.md) | Falsify Intel nope window shows "Intel Briefing" dialog (stale pendingFuture bleed-through) | P2 | RESOLVED | SCN-FALSIFY-INTEL-ACTOR | — |
| [031-scn-direct-order-actor](031-scn-direct-order-actor.md) | Direct Order target-select dialog uses Reassign card vocabulary | P2 | RESOLVED | SCN-DIRECT-ORDER-ACTOR | 032-scn-direct-order-normal-01 (paired Direct Order finding) |
| [032-scn-direct-order-normal-01](032-scn-direct-order-normal-01.md) | Direct Order target not surfaced to observers during nope window; actor dialog title uses Reassign language | P2 | RESOLVED | SCN-DIRECT-ORDER-NORMAL-01 | 031-scn-direct-order-actor (paired Direct Order finding) |
| [034-scn-call-in-favor-info-vis-01](034-scn-call-in-favor-info-vis-01.md) | Favor info-visibility: OTHER vantage confirmed clean; gesture discoverability gap on TARGET vantage | P2 | OPEN | SCN-CALL-IN-FAVOR-INFO-VIS-01 | — |
| [035-scn-call-in-favor-normal-01](035-scn-call-in-favor-normal-01.md) | Call in a Favor fired clean (ACTOR + TARGET perspectives) | P2 | LOW-SIGNAL | SCN-CALL-IN-FAVOR-NORMAL-01 | — |
| [036-scn-burn-the-files-normal-01](036-scn-burn-the-files-normal-01.md) | Burn the Files has no kinetic payoff on ACTOR phone — shuffle is narratively silent | P2 | OPEN | SCN-BURN-THE-FILES-NORMAL-01 (catalog ID: SCN-BURN-FILES-NORMAL-01 — minor ID discrepancy between triage spec and catalog, content match is unambiguous) | — |
| [038-burn-files-invalidates-peek](038-burn-files-invalidates-peek.md) | Seat agent conflated falsify-intel with intel-briefing; actual ACTOR (Seat4) never self-reported | P2 | OPEN | BURN-FILES-INVALIDATES-PEEK | — |

## Free-play findings

Loose clustering — no fixed scenario IDs (D12 / R9). Phase 6 calibration tunes the 60s window if false positives appear.

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [001-unknown-unknown-freeplay](001-unknown-unknown-freeplay.md) | Connection Status modal blocks Intercept button during active nope windows | P1 | RESOLVED | — | 023-scn-intercepted-single-01 (same root cause) |
| [003-falsify-intel-card-played-freeplay](003-falsify-intel-card-played-freeplay.md) | Observer status strip silent during Falsify Intel rearrange phase | P2 | RESOLVED | — | — |
| [039-burn-the-files-card-played-freeplay](039-burn-the-files-card-played-freeplay.md) | StagingArea enlarge overlay not portalled to body (structural inconsistency with Hand.tsx) | P2 | RESOLVED | — | — |

## Vibe-check findings

Spec-level findings against `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) + §3 (Archer visual vocabulary). Not engine bugs (D11 / R8).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [004-vibe-falsify-intel-normal](004-vibe-falsify-intel-normal.md) | Falsify Intel rearrange feels like a form, not espionage | P2 | OPEN | FALSIFY-INTEL-NORMAL | — |
| [009-vibe-scn-back-channel-normal-01](009-vibe-scn-back-channel-normal-01.md) | Back Channel observer intercept-window lacks assessed dramatic weight (agent-polling artifact) | P2 | LOW-SIGNAL | SCN-BACK-CHANNEL-NORMAL-01 | — |
| [012-vibe-back-channel-normal](012-vibe-back-channel-normal.md) | Back Channel bottom-draw has no cinematic distinction from a top-draw | P1 | RESOLVED | BACK-CHANNEL-NORMAL | — |
| [013-vibe-game-moment-first-turn-back-channel](013-vibe-game-moment-first-turn-back-channel.md) | First-turn Back Channel landing flat: no opening-gambit framing, no bottom-draw visual distinction | P2 | RESOLVED | GAME-MOMENT-FIRST-TURN-BACK-CHANNEL | — |
| [016-vibe-scn-call-in-a-favor-normal-01](016-vibe-scn-call-in-a-favor-normal-01.md) | Observer gets no closing beat when favor resolves | P2 | OPEN | SCN-CALL-IN-A-FAVOR-NORMAL-01 | — |
| [028-vibe-scn-back-channel-normal-01](028-vibe-scn-back-channel-normal-01.md) | Actor receives zero narration when their card is intercepted | P1 | RESOLVED | SCN-BACK-CHANNEL-NORMAL-01 | — |
| [033-vibe-scn-burn-the-files-normal-01](033-vibe-scn-burn-the-files-normal-01.md) | Burn the Files shuffle has no kinetic payoff (silent shuffle) | P2 | OPEN | SCN-BURN-THE-FILES-NORMAL-01 | — |
| [037-vibe-burn-files-normal](037-vibe-burn-files-normal.md) | Phone drama beat lacks destruction weight for Burn the Files | P2 | OPEN | BURN-FILES-NORMAL | — |

## UI-spec-divergence findings

Phone view contradicts Column 2 prose for the seat's role (D13 / R10). The "Ruling A" column flags issues where Column 1 was redacted by the scrubber and triage emitted "cannot determine from scrubbed data" — Phase 6 sidecar work decides whether to restore automated Column-1 inference.

| ID | Title | Severity | Status | Linked | Candidate dup | Viewer role | Ruling A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [006-uispec-falsify-intel-normal](006-uispec-falsify-intel-normal.md) | Falsify Intel rearrange uses tap-to-order form, not drag/espionage UI | P2 | OPEN | FALSIFY-INTEL-NORMAL (catalog: SCN-FALSIFY-INTEL-NORMAL-01) | — | ACTOR | — |

## Role-drift findings — low-signal

⚠️ **Low-signal — may reflect server viewer-gating rather than UI bugs; Phase 6 calibrates.** Default status is `LOW-SIGNAL` unless cross-corroborated by a same-window suspicion or vibe-check (D15 / Ruling B).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [007-roledrift-seat-1-actor](007-roledrift-seat-1-actor.md) | Role-drift detector emits UNKNOWN for confirmed ACTOR (Falsify Intel) | P2 | LOW-SIGNAL | FALSIFY-INTEL-NORMAL | — |

## With-divergence fires

Scenario fired but a tier-2 / tier-3 oracle caught a divergence (D17). Counted as fired toward the >=50 coverage threshold; the divergence is still a bug.

| ID | Title | Severity | Status | Linked | Candidate dup | Failed tier |
| --- | --- | --- | --- | --- | --- | --- |
| [002-withdiv-scn-falsify-intel-normal-01](002-withdiv-scn-falsify-intel-normal-01.md) | Tier-2 oracle false alarm: pendingPrompt snapshot taken post-rearrange (null), expected pre-resolution value | P2 | RESOLVED | SCN-FALSIFY-INTEL-NORMAL-01 | — | — |
| [015-withdiv-scn-call-in-favor-normal-01](015-withdiv-scn-call-in-favor-normal-01.md) | Tier-2 oracle false-positive: pendingPrompt sampled at stateVersion pre-nope-resolution | P1 | RESOLVED | SCN-CALL-IN-FAVOR-NORMAL-01 | 002-withdiv-scn-falsify-intel-normal-01 (same root cause: oracle samples projection at terminal, transient-state assertion fails) | — |

## Coverage divergences

Self-vs-detector mismatches from `coverage.md` (Phase 3 Unit 10). `column-1-vs-2` divergences appear in the UI-spec-divergence section above instead.

_No findings of this kind this session._

## Known-product-calls confirmed

Harness re-discovered scenarios already tagged as known product calls in the scenario catalog (phase-1 D4) — links back to the catalog entry + the cited E2E-ISSUE-LIST ID for human context (R11 / D5 / Ruling C).

| ID | Title | Severity | Status | Linked | Candidate dup |
| --- | --- | --- | --- | --- | --- |
| [010-withdiv-scn-call-in-favor-target-disconnect-01](010-withdiv-scn-call-in-favor-target-disconnect-01.md) | Favor-pending target-disconnect oracle miss (known product call B-05) | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 | SCN-CALL-IN-FAVOR-TARGET-DISCONNECT-01 (linked: B-05) |
| [026-scn-intercepted-chain-0-to-1-01](026-scn-intercepted-chain-0-to-1-01.md) | Chain counter-intercept UI gap (seat-3 / OTHER view) | P2 | KNOWN-PRODUCT-CALL-CONFIRMED | SCN-INTERCEPTED-CHAIN-0-TO-1-01 | SCN-INTERCEPTED-CHAIN-0-TO-1-01 + D-16 |
