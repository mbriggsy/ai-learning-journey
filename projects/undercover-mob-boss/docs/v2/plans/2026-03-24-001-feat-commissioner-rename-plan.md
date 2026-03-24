---
title: "feat: Commissioner Rename — Police Chief to Commissioner"
type: feat
status: completed
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-02)
deepened: 2026-03-24
---

# feat: Commissioner Rename — Police Chief to Commissioner

## Enhancement Summary

**Deepened on:** 2026-03-24
**Agents used:** 9 (TypeScript reviewer, pattern recognition, architecture strategist, best practices researcher, simplicity reviewer, security sentinel, SpecFlow analyzer, repo researcher, learnings researcher)

### Key Improvements
1. **Security fix added:** `chiefOnly` string array in `room.ts:303` is not type-safe — refactor to `ReadonlySet<GameAction['type']>` as pre-rename step to prevent privilege escalation
2. **`WinReason` typed union introduced** — not just shared constants, but a proper union type with exhaustive switch checking in narrator-bridge.ts (3 independent agents recommended this)
3. **5 missing source files added** to scope (top-bar.ts, overlays.ts, policy-track.ts, board.css, powers.ts)
4. **`public/how-to-play.html` added** — 11 player-facing occurrences were missing from original plan
5. **CSS class names corrected** — actual BEM names, not the abbreviated names in the original plan
6. **3 data-testId attributes added** — `chief-hand`, `chief-enact-btn`, `chief-veto-btn` + E2E cascade
7. **Audio regeneration dropped** — spec says batched with ADR-V2-03, no active users, WAVs get overwritten next phase
8. **V1 historical docs dropped** — editing archived V1 artifacts is revisionist; only shared/living docs updated
9. **Execution simplified** from 12 steps to 8 (pre-rename safety + types-first cascade + grep sweep)

### Scope Decision: Internal Identifiers

**Agents disagreed** on whether to rename code identifiers (`isChief` → `isCommissioner`) or only display text.

- *Against:* ~750 identifier occurrences across 45+ files, massive churn, zero user benefit
- *For:* spec says "entire application," cognitive consistency for developers, TypeScript makes it safe

**Decision: Full rename.** The spec says "across the entire application." TypeScript's cascade strategy makes it mechanically safe. Leaving `isChief` while the game says "Commissioner" creates permanent cognitive dissonance. The churn is real but one-time; the consistency is permanent.

---

## Overview

Rename **Police Chief** to **Commissioner** across the entire Undercover Mob Boss application. This is the first V2 implementation phase — smallest scope, touches every layer, and clears the path for narrator variant pool work (ADR-V2-03) where all audio is regenerated.

Commissioner carries more political weight, implies corruptibility, and better parallels the Chancellor role in the source game. Fits the Millbrook City power structure: **Mayor proposes, Commissioner executes.**

## Problem Statement

The V1 codebase uses "Police Chief" / `chief` in ~750+ locations across ~55+ files:

| Layer | Occurrences | Files |
|-------|-------------|-------|
| `src/` source code | ~154 | 27 |
| `tests/` | ~592 | 28 |
| CSS classes | 7 | 2 |
| `scripts/` narrator prompts | 7 | 1 |
| Active documentation | ~25 | 3 |
| **Total** | **~785** | **~61** |

Audio WAV filenames are unaffected — they use trigger IDs (`nomination.wav`, `veto-proposed.wav`), not role names. Spoken audio content still says "Police Chief" but is regenerated in ADR-V2-03 (narrator variant pool).

## Proposed Solution

### 0. Pre-Rename Safety Steps

Before any renaming, fix two architectural weaknesses that make partial renames dangerous:

**0a. Type-safe authorization arrays (`room.ts:302-303`)**

The `chiefOnly` and `mayorOnly` arrays use plain strings. If the GameAction type is renamed but these arrays are left stale, ANY player can bypass commissioner-only authorization — a privilege escalation.

```typescript
// BEFORE (unsafe — stale strings silently bypass auth)
const mayorOnly = ['nominate', 'mayor-discard', ...];
const chiefOnly = ['chief-discard', 'propose-veto'];

// AFTER (type-safe — compiler errors on stale strings)
const mayorOnly: ReadonlySet<GameAction['type']> = new Set([
  'nominate', 'mayor-discard', 'veto-response', 'investigate',
  'acknowledge-peek', 'special-nominate', 'execute',
] as const);
const commissionerOnly: ReadonlySet<GameAction['type']> = new Set([
  'commissioner-discard', 'propose-veto',
] as const);
```

Also update the `.includes()` calls to `.has()`.

**0b. Introduce `WinReason` typed union**

Add to `src/shared/types.ts`:
```typescript
export type WinReason =
  | '5 good policies enacted'
  | '6 bad policies enacted'
  | 'Mob Boss elected Commissioner after 3+ bad policies'
  | 'Mob Boss executed'
  | 'Game abandoned due to inactivity';
```

Change `GameState.winReason` and `HostState.winReason` from `string | null` to `WinReason | null`. Also apply to the `game-over` GameEvent's `reason` field. This gives exhaustive switch checking in `narrator-bridge.ts` — TypeScript flags unhandled cases. A small `winReasonDisplayText(reason: WinReason): string` helper handles human-readable rendering in the two game-over views.

Cost: ~15 lines of new type code. Payoff: permanent compiler guarantee — the plan's highest-severity risk becomes impossible. Three independent review agents recommended this approach.

**0c. Tighten narrator-bridge.ts state tracking types**

While editing `narrator-bridge.ts`, upgrade `prevSubPhase: string | null` to `SubPhase | null`, `prevPhase: string | null` to `Phase | null`, and `prevExecutivePower: string | null` to `ExecutivePower | null`. Pre-existing type weakness, low-cost fix while the file is open.

### 1. Code Identifiers (`chief` → `commissioner`)

**`src/shared/types.ts` — the root of the type graph:**

| Current | Renamed |
|---------|---------|
| `isChief` (Player) | `isCommissioner` |
| `wasLastChief` (Player) | `wasLastCommissioner` |
| `nominatedChiefId` (GameState) | `nominatedCommissionerId` |
| `chiefCards` (GameState) | `commissionerCards` |
| `'policy-chief-discard'` (SubPhase) | `'policy-commissioner-discard'` |
| `'chief-discard'` (GameAction) | `'commissioner-discard'` |
| `chiefId` (GameEvent: election-passed, chief-cleared) | `commissionerId` |
| `'chief-cleared'` (GameEvent type) | `'commissioner-cleared'` |

Once `types.ts` is updated, `pnpm run typecheck` cascades errors to every consumer — the compiler becomes the migration checklist.

### 2. Display Text ("Police Chief" → "Commissioner")

String literals in UI, narrator hooks, prompts, and docs. These are NOT caught by TypeScript — require grep verification. Known locations:

| File | Display Text |
|------|-------------|
| `src/client/views/mayor-nomination.ts:14` | "Nominate a Police Chief" |
| `src/client/views/vote.ts:22` | `${name} for Police Chief?` |
| `src/client/views/waiting.ts:9,12` | "A Police Chief must be chosen" / "The Police Chief holds..." |
| `src/client/views/veto-response.ts:35` | "The Chief wants to burn both policies" |
| `src/client/components/top-bar.ts:40` | `' — Chief'` badge |
| `src/client/components/mini-board.ts:98,145` | "Chief" / "Mob Boss as Chief = Game Over" |
| `src/client/host/components/overlays.ts:42` | "The Chief has proposed to veto..." |
| `src/client/host/components/policy-track.ts:60,101` | "Mob Boss elected as Chief = Game Over" |
| `src/client/host/screens/nomination.ts:29,71` | "Chief" / "Selecting a Chief..." |
| `src/client/host/screens/game-board.ts:23` | "Chief reviewing policies" |
| `src/server/room.ts:310` | "Only the Police Chief can do this" |

### 3. File Rename

`src/client/views/chief-hand.ts` → `src/client/views/commissioner-hand.ts`

All imports updated (`router.ts`, `app.ts`). ScreenId literal `'chief-hand'` → `'commissioner-hand'` in router.ts union type and `registerView` call in app.ts.

### 4. CSS Classes (2 files, 5 selectors)

**`src/client/styles/screens.css`:**
- `.mini-roster__player--chief` → `.mini-roster__player--commissioner`
- `.spectator-roster__player--chief` → `.spectator-roster__player--commissioner` (+ nested `.spectator-roster__role`)

**`src/client/host/styles/board.css`:**
- `.player-strip__item--chief` → `.player-strip__item--commissioner`
- `.player-strip__badge--chief` → `.player-strip__badge--commissioner`

Note: `.spectator-roster__player--chief` may be dead CSS (no JS found applying it). Rename anyway for consistency; flag for cleanup.

### 5. data-testId Attributes (3 IDs)

| Current | Renamed | E2E Files Using It |
|---------|---------|-------------------|
| `chief-hand` | `commissioner-hand` | game-flow, visual-audit, session-recovery, simultaneous-actions, full-game-to-completion, selector-health |
| `chief-enact-btn` | `commissioner-enact-btn` | game-flow, full-game-to-completion, session-recovery, selector-health |
| `chief-veto-btn` | `commissioner-veto-btn` | veto-flow, selector-health |

`selector-health.spec.ts` maintains a canonical testId list — must be updated.

## Technical Considerations

### Authorization String Safety (CRITICAL)

`room.ts:302-303` uses `chiefOnly.includes(action.type)` for authorization. The `action.type` arrives as an unsanitized string from WebSocket (unsafe `as GameAction` cast at line 257). If this array is stale after the rename, the authorization check silently passes for ALL players on commissioner-only actions. Pre-rename step 0a eliminates this risk permanently.

### winReason Type Safety (HIGH)

The `winReason` field is typed `string | null` — both producer (`phases.ts`) and consumer (`narrator-bridge.ts`) match by exact string equality with zero compiler assistance. Pre-rename step 0b extracts these to shared constants, making future renames compiler-safe. The mob-boss-elected win condition is the highest-drama moment — silence here is devastating.

### Audio Decision: Defer to ADR-V2-03

The spec explicitly says the rename is "batched with narrator variant pool work (ADR-V2-03) — all audio is regenerated anyway." There are no active users and no deployment between phases. Audio regenerated now would be immediately overwritten when the variant pool phase renames files to `{triggerId}-{variantNum}.wav` and regenerates everything.

**Action:** Update `scripts/narrator-prompts.ts` text (durable prep for variant pool). Do NOT regenerate WAVs in this phase.

### Vite Cache After File Rename

After renaming `chief-hand.ts` → `commissioner-hand.ts`:
- Delete `node_modules/.vite` (stale module graph)
- Restart dev server with `--force` flag
- Hard-refresh browser to clear HMR cache

## Acceptance Criteria

### Pre-Rename Safety
- [x] `room.ts` — `chiefOnly`/`mayorOnly` refactored to `ReadonlySet<GameAction['type']>` with `.has()` checks
- [x] `WinReason` typed union added to `types.ts`, applied to `GameState.winReason`, `HostState.winReason`, GameEvent `reason`
- [x] `narrator-bridge.ts` switch uses exhaustive `WinReason` checking
- [x] `narrator-bridge.ts` state tracking types tightened (prevSubPhase → `SubPhase | null`, etc.)
- [x] Typecheck passes after safety refactors (before any renaming)

### Type System & Game Engine
- [x] `src/shared/types.ts` — all 8 identifier groups renamed
- [x] `src/shared/protocol.ts` — PublicPlayer, HostState, PrivateData fields renamed
- [x] `src/server/game/phases.ts` — all references + `winReason` constant
- [x] `src/server/game/powers.ts:83` — `isChief: false` → `isCommissioner: false`
- [x] `src/server/room.ts` — authorization arrays, error message, all references
- [x] `src/server/projection.ts` — all projection fields
- [x] `src/server/test-scenarios.ts` — factory state

### Client Code
- [x] `chief-hand.ts` renamed to `commissioner-hand.ts` + all imports updated
- [x] `router.ts` — ScreenId `'chief-hand'` → `'commissioner-hand'`
- [x] `app.ts` — import path + registerView string
- [x] All display text strings updated (see table in Section 2)
- [x] `src/client/components/top-bar.ts:40` — "Chief" badge
- [x] `src/client/host/components/overlays.ts:42` — veto overlay text
- [x] `src/client/host/components/policy-track.ts:60,101` — warning text
- [x] data-testId: `chief-hand`, `chief-enact-btn`, `chief-veto-btn` renamed

### CSS (2 files, 5 selectors)
- [x] `src/client/styles/screens.css` — 3 selectors renamed
- [x] `src/client/host/styles/board.css` — 2 selectors + comments renamed
- [x] All JS/TS references to `--chief` CSS classes updated

### Narrator Text (no audio regen)
- [x] `src/client/audio/narrator-bridge.ts` — uses `WIN_REASONS` constant + subphase ref
- [x] `src/client/audio/narrator-lines.ts` — 3 hook descriptions updated
- [x] `scripts/narrator-prompts.ts` — 7 prompt text references updated (durable prep for ADR-V2-03)

### Tests
- [x] All test files updated (follow tsc errors + grep for string literals)
- [x] E2E tests updated for renamed data-testId attributes
- [x] `selector-health.spec.ts` canonical testId list updated

### Documentation (living docs only)
- [x] `docs/shared/user/HOW-TO-PLAY.md` — all "Police Chief" → "Commissioner"
- [x] `public/how-to-play.html` — 11 occurrences updated
- [x] `TODO.md` — update current references
- [x] `README.md` — role mapping table

### Optional / Fast-Follow
- [x] `videos/trailer/src/scenes/S10_TheBlueprint.tsx` — 5 occurrences (separate Remotion workspace)

### Verification Gate (MANDATORY)
- [x] `pnpm run typecheck` — zero errors
- [x] `pnpm run test` — all unit + integration tests pass
- [x] `pnpm run build` — production build succeeds
- [x] `grep -ri "chief" src/ tests/ scripts/ public/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.html"` — zero hits
- [x] `grep -ri "police.chief" docs/shared/ docs/v2/ README.md TODO.md` — zero hits (except v2 brainstorm/spec which discuss the rename itself)
- [x] Clear Vite cache: `rm -rf node_modules/.vite`

### Deploy Checklist
- [ ] Deploy PartyKit FIRST: `pnpm run partykit:deploy` (destroys all active games, brings server to new schema)
- [ ] Then push to Vercel: `git push origin main` (new clients connect to already-updated server)
- [ ] Version-skew window: ~30-60s during Vercel build (acceptable)

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `chiefOnly` stale string → privilege escalation | **Critical** | Pre-rename step 0a: type-safe ReadonlySet |
| `winReason` string mismatch → silent narrator failure | **High** | Pre-rename step 0b: shared constants |
| Display text missed (TypeScript won't catch) | Medium | Grep sweep on all string occurrences |
| CSS selector mismatch (styling breaks silently) | Medium | Grep + visual spot-check |
| E2E data-testId mismatch | Medium | selector-health.spec.ts catches immediately |
| PartyKit deploy destroys active games | Low | No persistent state (in-memory only). Deploy kills all rooms. Deploy PartyKit first. |
| Vite stale module cache | Low | Delete node_modules/.vite + --force restart |

## Execution Order

Simplified from 12 steps to 8, based on the insight that `tsc --noEmit` gives ALL errors simultaneously — no need for per-layer passes.

1. **Pre-rename safety** — Create `win-reasons.ts` shared constants. Refactor `chiefOnly`/`mayorOnly` to type-safe `ReadonlySet<GameAction['type']>`. Run typecheck to confirm safety refactors pass.
2. **Type cascade trigger** — Rename identifiers in `types.ts` + `protocol.ts`. This breaks everything downstream.
3. **Fix all TypeScript errors** — Run `tsc --noEmit`, fix every error across src/ and tests/ in a single pass. File rename `chief-hand.ts` → `commissioner-hand.ts` happens here too (fix the import errors).
4. **Grep sweep: string literals** — `grep -ri "chief" src/ tests/ scripts/ public/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.html"` — fix all remaining display text, CSS classes, data-testId attributes, narrator prompt text.
5. **Fix tests** — Follow remaining tsc errors + grep for string literals in test files.
6. **Update documentation** — `HOW-TO-PLAY.md`, `how-to-play.html`, `TODO.md`, `README.md`.
7. **Clear Vite cache** — `rm -rf node_modules/.vite`
8. **Verification gate** — Typecheck + test suite + production build + grep audit (zero "chief" in source). Single atomic commit.

## Sources & References

### Origin
- **Brainstorm:** [docs/v2/ideation/BRAINSTORM.md](../ideation/BRAINSTORM.md) — Section 2: Commissioner Rename
- **Spec:** [docs/v2/spec/SPEC.md](../spec/SPEC.md) — ADR-V2-02 (LOCKED)

### Internal References
- Type definitions: `src/shared/types.ts` (root of rename cascade)
- Game engine: `src/server/game/phases.ts` (30 refs, `winReason` atomicity)
- Authorization: `src/server/room.ts:302-303` (chiefOnly string array — security critical)
- Narrator bridge: `src/client/audio/narrator-bridge.ts:192` (`winReason` match)
- Narrator prompts: `scripts/narrator-prompts.ts` (7 prompt text refs)
- CSS selectors: `src/client/styles/screens.css:904,1296,1326` + `src/client/host/styles/board.css:371-413`
- Player-facing HTML: `public/how-to-play.html` (11 occurrences)

### Research References
- TypeScript Language Service cannot rename string literal values (TypeScript [#7611](https://github.com/Microsoft/TypeScript/issues/7611), [#15370](https://github.com/microsoft/TypeScript/issues/15370))
- Vite HMR cache invalidation after file renames requires `--force` + cache deletion

### Related Work
- ADR-V2-03 (Narrator Variant Pool) — all audio regenerated there; this phase updates text only
- ADR-V2-05 (Asset Preservation) — V1 audio preserved in git history
