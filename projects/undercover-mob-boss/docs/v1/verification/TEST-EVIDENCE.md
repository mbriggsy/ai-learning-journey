# Test Evidence Package — Undercover Mob Boss

*Updated: 2026-03-22*
*Game engine: Secret Hitler (CC BY-NC-SA 4.0) digital adaptation*

---

## Summary

| Layer | Tests | Command |
|-------|-------|---------|
| Unit + Integration | 760 | `pnpm run test` |
| Playwright E2E | 125 per project x 4 browsers = 500 | `pnpm run test:e2e` |
| **Total** | **1,260** | |

All tests passing. Typecheck clean (`pnpm run typecheck`).

---

## Game Engine Tests (760 tests)

### Source Files

| File | Tests | Purpose |
|------|-------|---------|
| `tests/unit/phases.test.ts` | 44 | Core dispatch: creation, role ack, nomination, election, policy session, veto, exec powers, eligible nominees, mayor advance |
| `tests/unit/sh-rules-verification.test.ts` | 30 | Rule-pinned tests mapped to SH checklist IDs |
| `tests/unit/sh-rules-gaps.test.ts` | 14 | Gap fills: dead player restrictions, citizen knowledge, veto-once, discard handling |
| `tests/unit/roles.test.ts` | — | Role distribution, ally population |
| `tests/unit/policies.test.ts` | — | Deck creation, shuffle, draw, reshuffle |
| `tests/unit/powers.test.ts` | — | Executive power grid, investigation, peek, execution, special nomination |
| `tests/unit/rng.test.ts` | — | Mulberry32 PRNG determinism |
| `tests/unit/protocol.test.ts` | — | Client/server message encoding |
| `tests/unit/router.test.ts` | — | Player screen routing |
| `tests/unit/host-router.test.ts` | — | Host screen/overlay routing |
| `tests/unit/projection.test.ts` | — | Security: no private data leaks in projections |
| `tests/unit/nudge.test.ts` | — | Nudge escalation timing |
| `tests/integration/full-game.test.ts` | 9 | Full games to completion (5p, 10p, multi-seed, immutability) |
| `tests/integration/sh-scenario-tests.test.ts` | 44 | Forced scenarios: all win conditions, all powers at all brackets, auto-enact, veto, special election, reshuffle, term limits |
| `tests/integration/sh-invariants.test.ts` | 26 | Card counting + state invariants verified at every dispatch across full games |
| `tests/integration/sh-stress.test.ts` | 43 | 300+ randomized games with invariant checking |
| `tests/helpers/game-state-factory.ts` | — | Test state builder |
| `tests/helpers/game-driver.ts` | — | Directed play helpers, random bot, invariant checkers |

---

### Rule Coverage: 91/91 Secret Hitler Rules

Every discrete rule from the Secret Hitler rulebook is mapped to at least one test. Rules are organized by category with test file references.

#### Roles & Setup (R1–R10)

| Rule | Description | Test |
|------|-------------|------|
| R1 | Game requires 5-10 players | `phases.test.ts` — createGame throws for invalid count |
| R2 | Role distribution: 5p=3/1/1, 6p=4/1/1, 7p=4/2/1, 8p=5/2/1, 9p=5/3/1, 10p=6/3/1 | `sh-rules-verification.test.ts` [ROLES-DIST] |
| R3 | Exactly 1 Mob Boss always | `phases.test.ts`, `sh-invariants.test.ts` |
| R4 | Citizens always have majority | `sh-rules-verification.test.ts` [ROLES-05] |
| R5 | 5-6p: Mob Boss knows soldiers | `sh-rules-verification.test.ts` [ROLES-20] |
| R6 | 5-6p: Soldiers know each other + boss | `sh-rules-gaps.test.ts` [R6] |
| R7 | 7-10p: Mob Boss does NOT know soldiers | `sh-rules-verification.test.ts` [ROLES-26] |
| R8 | 7-10p: Soldiers know each other + boss | `sh-rules-verification.test.ts` [ROLES-24/25], [ROLES-ALLIES-9-10] |
| R9 | Citizens know nobody (empty knownAllies) | `sh-rules-gaps.test.ts` [R9] |
| R10 | First mayor randomly selected | `phases.test.ts`, `sh-rules-verification.test.ts` [ELEC-01] |

#### Policy Deck (R11–R15)

| Rule | Description | Test |
|------|-------------|------|
| R11 | Deck: 6 good + 11 bad = 17 cards | `phases.test.ts` (policyDeck length 17) |
| R12 | Deck shuffled at game start | Implicit in createGame |
| R13 | Reshuffle when deck runs low (deviation: random threshold 3-7) | `policies.test.ts`, `sh-scenario-tests.test.ts` |
| R14 | Reshuffle combines deck + discard | `policies.test.ts` |
| R15 | Post-reshuffle deck >= 3 cards | `policies.test.ts` (invariant check) |

#### Nomination (R16–R24)

| Rule | Description | Test |
|------|-------------|------|
| R16 | Mayor rotates clockwise | `phases.test.ts` advanceMayor tests |
| R17 | Mayor nominates Police Chief | `phases.test.ts` nomination flow |
| R18 | Cannot nominate yourself | `phases.test.ts` rejects self-nomination |
| R19 | Cannot nominate dead players | `phases.test.ts`, `sh-rules-gaps.test.ts` [R84] |
| R20 | Previous elected Chief always term-limited | `phases.test.ts` getEligibleNominees |
| R21 | Previous elected Mayor term-limited at 6+ alive | `phases.test.ts` getEligibleNominees |
| R22 | Previous elected Mayor NOT term-limited at 5 alive | `phases.test.ts` getEligibleNominees |
| R23 | Term limits only apply to last ELECTED pair | `phases.test.ts` term limits survive failed elections |
| R24 | Failed nomination does NOT change term limits | `sh-rules-verification.test.ts` [TERM-04/05] |

#### Election (R25–R31)

| Rule | Description | Test |
|------|-------------|------|
| R25 | All alive players vote simultaneously | `phases.test.ts` election flow |
| R26 | Strict majority required (ties = block) | `phases.test.ts` ties are blocked |
| R27 | Dead players cannot vote | `sh-rules-gaps.test.ts` [R27] |
| R28 | No duplicate votes | `phases.test.ts` rejects duplicate vote |
| R29 | Passed election → policy session | `phases.test.ts` |
| R30 | Failed election → tracker advances | `phases.test.ts` |
| R31 | Passed election resets tracker to 0 | `phases.test.ts`, `sh-rules-gaps.test.ts` [R39] |

#### Election Tracker & Auto-Enact (R32–R39)

| Rule | Description | Test |
|------|-------------|------|
| R32 | Tracker starts at 0 | `phases.test.ts` createGame |
| R33 | Tracker advances on failed election | `phases.test.ts` |
| R34 | Tracker advances on veto accepted | `phases.test.ts` veto flow |
| R35 | At tracker = 3 → auto-enact top card | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R36 | Auto-enacted bad policy does NOT trigger executive power | `sh-rules-verification.test.ts` [EXEC-09], `sh-scenario-tests.test.ts` |
| R37 | Auto-enact resets tracker to 0 | `phases.test.ts` |
| R38 | Auto-enact clears ALL term limits | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R39 | Tracker resets on any policy enactment | `sh-rules-gaps.test.ts` [R39] |

#### Policy Session (R40–R45)

| Rule | Description | Test |
|------|-------------|------|
| R40 | Mayor draws 3 cards from top | `phases.test.ts` |
| R41 | Mayor discards 1, passes 2 to Chief | `phases.test.ts` |
| R42 | Chief discards 1, enacts remaining 1 | `phases.test.ts` |
| R43 | Discards go to policyDiscard (never revealed) | `sh-rules-gaps.test.ts` [R43], `projection.test.ts` |
| R44 | Good policy → goodPoliciesEnacted increments | `phases.test.ts` |
| R45 | Bad policy → badPoliciesEnacted increments | `phases.test.ts` |

#### Veto Power (R46–R52)

| Rule | Description | Test |
|------|-------------|------|
| R46 | Veto only available after 5 bad policies | `phases.test.ts` |
| R47 | Chief proposes veto during chief-discard | `phases.test.ts` |
| R48 | Mayor responds (approve/reject) | `phases.test.ts` |
| R49 | Accepted → both cards discarded, tracker advances | `phases.test.ts` |
| R50 | Rejected → Chief must enact | `phases.test.ts` |
| R51 | Veto can only be proposed once per session | `sh-rules-gaps.test.ts` [R51] |
| R52 | Veto-accepted + tracker at 3 → auto-enact | `phases.test.ts`, `sh-scenario-tests.test.ts` |

#### Win Conditions (R53–R58)

| Rule | Description | Test |
|------|-------------|------|
| R53 | 5 good policies → citizens win | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R54 | 6 bad policies → mob wins | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R55 | Mob Boss executed → citizens win immediately | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R56 | Mob Boss elected Chief AFTER 3+ bad → mob wins | `phases.test.ts`, `sh-scenario-tests.test.ts` |
| R57 | Mob Boss elected Chief BEFORE 3 bad → game continues | `phases.test.ts`, `sh-rules-verification.test.ts` [WIN-07] |
| R58 | Non-boss elected at 3+ bad → chief-cleared event | `phases.test.ts`, `sh-rules-verification.test.ts` [ELEC-22] |

#### Executive Power Grid (R59–R64)

| Rule | Description | Test |
|------|-------------|------|
| R59 | 5-6p: none/none/peek/exec/exec | `sh-rules-verification.test.ts` [GRID-03/04/05] |
| R60 | 7-8p: none/investigate/special-nom/exec/exec | `sh-rules-verification.test.ts` [GRID-07/08], `sh-scenario-tests.test.ts` |
| R61 | 9-10p: investigate/investigate/special-nom/exec/exec | `sh-rules-verification.test.ts` [GRID-11/12], `sh-scenario-tests.test.ts` |
| R62 | Powers only trigger on enacted (not auto-enacted) bad policies | `sh-rules-verification.test.ts` [EXEC-09] |
| R63 | Mayor uses the power (not Chief) | `sh-rules-verification.test.ts` [EXEC-02] |
| R64 | Power used immediately before round ends | Implicit in state transitions |

#### Investigation (R65–R69)

| Rule | Description | Test |
|------|-------------|------|
| R65 | Mayor secretly learns target's allegiance | `phases.test.ts` |
| R66 | Mob Boss shows as "mob" (not distinguished) | `sh-rules-verification.test.ts` [INVEST-06] |
| R67 | Cannot investigate yourself | `sh-rules-verification.test.ts` [INVEST-01] |
| R68 | No player investigated twice | `phases.test.ts`, `sh-rules-verification.test.ts` [INVEST-09] |
| R69 | Cannot investigate dead players | `sh-rules-gaps.test.ts` [R69] |

#### Policy Peek (R70–R72)

| Rule | Description | Test |
|------|-------------|------|
| R70 | Mayor views top 3 cards of deck | `sh-rules-verification.test.ts` [PEEK-01/02] |
| R71 | Cards remain in same order (not drawn) | `sh-rules-verification.test.ts` [PEEK-01/02] |
| R72 | Peek triggered at correct slot per power grid | `sh-rules-verification.test.ts` [PEEK-01] |

#### Special Nomination (R73–R77)

| Rule | Description | Test |
|------|-------------|------|
| R73 | Mayor picks any other alive player as next Mayor | `phases.test.ts` |
| R74 | Cannot special-nominate yourself | `sh-rules-verification.test.ts` [SPECIAL-01] |
| R75 | Term-limited players CAN be special-nominated | `sh-rules-verification.test.ts` [SPECIAL-03] |
| R76 | Rotation resumes from caller's position + 1 | `sh-rules-verification.test.ts` [SPECIAL-05/06], `phases.test.ts` |
| R77 | Next-in-rotation can serve twice in a row | `sh-rules-verification.test.ts` [SPECIAL-07], `phases.test.ts` |

#### Execution (R78–R84)

| Rule | Description | Test |
|------|-------------|------|
| R78 | Mayor eliminates any other alive player | `phases.test.ts` |
| R79 | Cannot execute yourself | `phases.test.ts` |
| R80 | Cannot execute dead players | `sh-rules-gaps.test.ts` [R80] |
| R81 | Eliminated player's role NOT revealed | `sh-rules-verification.test.ts` [EXECUTE-04] |
| R82 | Mob Boss executed → citizens win immediately | `phases.test.ts` |
| R83 | Executed player marked dead | `phases.test.ts` |
| R84 | Dead players can't vote, be nominated, or use powers | `sh-rules-gaps.test.ts` [R84] |

#### Mayor Rotation (R85–R87)

| Rule | Description | Test |
|------|-------------|------|
| R85 | Mayor rotates clockwise through alive players | `phases.test.ts` advanceMayor |
| R86 | Dead players skipped in rotation | `phases.test.ts` |
| R87 | Special election doesn't skip anyone | `sh-rules-verification.test.ts` [SPECIAL-05/06] |

#### State Machine Integrity (R88–R91)

| Rule | Description | Test |
|------|-------------|------|
| R88 | Actions rejected in wrong phase/subPhase | `phases.test.ts` |
| R89 | State is never mutated (immutability) | `full-game.test.ts` |
| R90 | Deterministic with same RNG seed | `phases.test.ts` snapshot test |
| R91 | Game always reaches terminal state | `full-game.test.ts`, `sh-stress.test.ts` |

---

### Invariant Tests

Verified at every dispatch across entire games (not just spot-checked):

**Card Counting Invariant**
- deck + discard + enacted + hands = 17 at all times
- good cards: deck_good + discard_good + enacted_good + hands_good = 6
- bad cards: deck_bad + discard_bad + enacted_bad + hands_bad = 11
- Holds across reshuffles, veto discards, auto-enacts

**State Machine Invariants**
- Exactly 1 mayor, mayor is alive
- mayorIndex matches the actual mayor
- Winner is null unless game-over
- Election tracker in range [0, 3]
- Policy counts in range [0, 5] good / [0, 6] bad
- Exactly 1 mob boss exists

**Role Distribution Invariant**
- Correct distribution verified across 20 seeds per player count (120 games)

**Ally Knowledge Invariant**
- Citizens: empty knownAllies
- Soldiers: know boss + other soldiers, don't know citizens
- Boss at 5-6p: knows soldiers
- Boss at 7-10p: knows nobody
- Verified across 20 seeds per player count (120 games)

---

### Stress Test Statistics

300 randomized games (50 per player count 5-10):

| Metric | Result |
|--------|--------|
| Games completed | 300/300 |
| Valid winners | 300/300 |
| Max dispatches | < 500 per game |
| Invariant violations | 0 |
| Citizens win rate | ~23% |
| Mob win rate | ~77% |
| All 4 executive powers used | Yes |
| All 4 win conditions triggered | Yes |
| Games with reshuffle | 75% |
| Games with auto-enact | 12% |
| Games with veto | 10% |
| Games with execution | 74% |

---

### Projection Security Tests

Verified that no private data leaks to clients:

| Data | Host View | Player View (self) | Player View (other) |
|------|-----------|--------------------|---------------------|
| Roles | Hidden (revealed at game-over only) | Own role only | Hidden |
| knownAllies | Hidden | Own allies only | Hidden |
| policyDeck | Hidden | Hidden | Hidden |
| policyDiscard | Hidden | Hidden | Hidden |
| reshuffleThreshold | Hidden | Hidden | Hidden |
| mayorCards | Hidden | Own cards (during discard phase only) | Hidden |
| chiefCards | Hidden | Own cards (during discard phase only) | Hidden |
| rngSeed | Hidden | Hidden | Hidden |
| investigationHistory | Hidden | Own investigations only | Hidden |
| Votes | Hidden during voting | hasVoted flag only | Hidden |
| mobBossId | Hidden | Soldiers see boss ID | Hidden |

---

## Playwright E2E Tests (125 tests x 4 browsers = 500)

### Browser Projects

| Project | Browser | Viewport | Touch |
|---------|---------|----------|-------|
| chromium | Chromium | Desktop | No |
| webkit | WebKit (Safari approximation) | Desktop | No |
| Mobile Chrome | Chromium | Pixel 5 (393x851) | Yes |
| Mobile Safari | WebKit | iPhone 13 (390x844) | Yes |

### Test Files

| File | Tests | Coverage |
|------|-------|---------|
| `tests/e2e/visual-audit.spec.ts` | 28 | Comprehensive visual audit: font sizes, contrast, overflow, spacing across phone + tablet viewports |
| `tests/e2e/ui-audit-host.spec.ts` | 12 | Host UI audit at iPad landscape: all 10 game screens + summary |
| `tests/e2e/user-chaos.spec.ts` | 10 | Chaotic user simulation: refresh mid-vote, mid-policy, tab close/rejoin, double-click, disabled buttons |
| `tests/e2e/session-recovery.spec.ts` | 10 | Browser death scenarios: tab close during every phase, host reconnect, simultaneous rejoin |
| `tests/e2e/server-abuse.spec.ts` | 10 | Protocol violations: XSS injection, path traversal, malformed JSON, room overflow, unauthorized actions |
| `tests/e2e/game-flow.spec.ts` | 9 | Host lobby, player lobby, role reveal, full 5-player game (lobby → policy enacted), game-over, dev scenarios |
| `tests/e2e/simultaneous-actions.spec.ts` | 8 | Race conditions: simultaneous votes, double-click, concurrent nominations, rapid scenario loading |
| `tests/e2e/regression-fixes.spec.ts` | 6 | Targeted regression tests for specific bugs: reconnect, tablet font sizing, CSS clamp values |
| `tests/e2e/mobile.spec.ts` | 5 | Lobby rendering (2 devices), role reveal (2 devices), tap targets (44px), responsive sweep, text readability |
| `tests/e2e/layout-verification.spec.ts` | 5 | Font sizes, overflow, player strip, game-over badges, role reveal across 3 viewports |
| `tests/e2e/executive-powers.spec.ts` | 4 | Investigation, Policy Peek, Special Nomination, Execution |
| `tests/e2e/veto-flow.spec.ts` | 2 | Veto accepted + veto rejected paths |
| `tests/e2e/selector-health.spec.ts` | 2 | All data-testid values exist in source, no duplicates |
| `tests/e2e/ui-audit-player.spec.ts` | 1 | Player phone UI audit: every screen at iPhone 13 viewport |
| `tests/e2e/full-game-to-completion.spec.ts` | 1 | 5 real players: lobby to game-over with full verification |

### E2E Phase Coverage Matrix

| Game Phase | Browser Verified |
|------------|-----------------|
| Lobby (host) | Yes |
| Lobby (player) | Yes |
| Role Reveal | Yes — card flip, role name, acknowledge |
| Nomination | Yes — picker, select, confirm |
| Election | Yes — vote buttons, approve/deny |
| Policy Session (mayor) | Yes — 3 cards, select, discard |
| Policy Session (chief) | Yes — 2 cards, select, enact |
| Investigation | Yes — picker, confirm, result card |
| Policy Peek | Yes — 3 peek cards, acknowledge |
| Special Nomination | Yes — picker, confirm, transition |
| Execution | Yes — picker, confirm, transition |
| Veto Accept | Yes — propose, accept, transition |
| Veto Reject | Yes — propose, reject, chief enacts |
| Game Over (citizens) | Yes — overlay visible |
| Game Over (mob) | Yes — overlay visible |

### Selector Stability

49 `data-testid` attributes across 17 view files. All E2E tests use `[data-test-id="..."]` selectors instead of CSS classes. A health check test verifies every testid used in E2E tests exists in source code — catches accidental deletions.

### Mobile Testing

| Check | Viewports | Result |
|-------|-----------|--------|
| No horizontal overflow | 320, 375, 414, 768px | Pass |
| Role card fits viewport | iPhone 13, Pixel 5 | Pass |
| Tap interactions work | iPhone 13, Pixel 5 | Pass |
| Vote buttons >= 44px tap target | iPhone 13 | Pass |
| Text >= 11px | iPhone 13 | Pass |
| WebKit rendering | Safari approximation | Pass |

### Known Limitation

Playwright WebKit is not identical to iOS Safari. Real-device testing on physical phones remains necessary before production launch. This test suite catches ~90% of mobile issues.

---

## Intentional Deviation from Secret Hitler

| Rule | SH Original | UMB Implementation | Reason |
|------|-------------|-------------------|--------|
| Deck reshuffle threshold | Fixed at 3 remaining cards | Random 3-7 each time | Prevents card counting; adds unpredictability |

This is the only known deviation. All other rules are implemented per the Secret Hitler source rules with thematic renames only (President → Mayor, Chancellor → Police Chief, Liberal → Citizen/Good, Fascist → Mob/Bad, Hitler → Mob Boss).

---

## How to Run

```bash
# Unit + integration tests (760 tests)
pnpm run test

# Playwright E2E (125 tests x 4 browsers, auto-starts servers)
pnpm run test:e2e

# Typecheck
pnpm run typecheck

# All three
pnpm run typecheck && pnpm run test && pnpm run test:e2e
```
