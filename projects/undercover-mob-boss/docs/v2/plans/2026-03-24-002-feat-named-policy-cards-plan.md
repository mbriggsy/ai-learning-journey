---
title: "feat: Named Policy Cards — Virtuous and Corrupt Card Pools"
type: feat
status: active
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-01)
deepened: 2026-03-24
---

# feat: Named Policy Cards — Virtuous and Corrupt Card Pools

## Enhancement Summary

**Deepened on:** 2026-03-24
**Agents used:** 6 (TypeScript reviewer, architecture strategist, performance oracle, simplicity reviewer, best practices researcher, SpecFlow analyzer) + cross-plan learnings

### Key Improvements
1. **PolicyCard carries `name`** — `{ type, cardId, name }` eliminates lookup indirection at 6+ render sites (3 agents agreed)
2. **Card art downsized 384x512 + WebP** — 768x1024 PNG is 4x oversized for display. Per-card: 650KB → 120-150KB (5x reduction)
3. **Policy track per-card art REMOVED** — YAGNI: hidden scope (needs new state tracking), slots too small for distinguishable art
4. **Card pool split: interface in shared, data in server** — client only needs dealt cards, not the full pool
5. **Cumulative `policyHistory` in GameState** — server-authoritative history for Gazette, not fragile client-side accumulation
6. **`lastEnactedPolicy ?? 'good'` bug found** — silent fallback masks state machine invariant violation, should throw
7. **Preload 17 game cards at game start** — use lobby/role-reveal time to warm cache (2 agents agreed)
8. **SW cache expansion** — add dedicated `/assets/cards/` cache (100 entries), bump audio cache to 500
9. **`as const satisfies` for card pools** — literal type preservation + structural validation (2 agents agreed)
10. **Events: additive approach** — keep `policy: PolicyType` alongside new `card: PolicyCard` in policy-enacted event

### Scope Decisions
- **Policy track per-card art:** REMOVED — track keeps generic `policy-good.png` / `policy-bad.png` (YAGNI)
- **Pool size 15+:** CONFIRMED — C(15,11) = 1,365 Corrupt combinations; mathematically justified
- **Card names on card face:** YES — spec says "name and art, no flavor text" (names ≠ flavor text)
- **Art fallback:** KEEP but make loud (console.error) + add asset-existence test

---

## Overview

Replace abstract "Good Policy" / "Bad Policy" cards with **named, illustrated Virtuous and Corrupt policy cards** drawn from a randomized pool each game. Every card gets a noir-fictional name and unique illustration. Deck math is unchanged (6 Virtuous + 11 Corrupt = 17). Card names are pure flavor — zero mechanical impact.

**Why it matters:** Named cards create emotional moments. Players remember "the Casino License game" not "the game with 4 bad policies." Groans, laughs, accusations — the named card IS the moment.

## Problem Statement

V1 cards are anonymous typed tokens (`'good' | 'bad'`) with two generic images (`policy-good.png`, `policy-bad.png`). Every game looks and feels identical at the card level. There's no narrative hook for what policies are being enacted — just colored rectangles.

**Current card rendering locations** (all reference `policy-good.png` / `policy-bad.png` — 7 hardcoded paths across 6 files):

| File | Line(s) | Context |
|------|---------|---------|
| `src/client/views/commissioner-hand.ts` | 50 | Commissioner's 2-card hand |
| `src/client/views/mayor-hand.ts` | 42 | Mayor's 3-card hand |
| `src/client/views/power-peek.ts` | 33 | Policy peek power (3 cards) |
| `src/client/host/screens/policy-enacted.ts` | 57 | Policy flip reveal |
| `src/client/host/screens/auto-enact.ts` | 72 | Auto-enacted policy display |
| `src/client/host/components/policy-track.ts` | 41, 85 | Policy track board (stays generic) |

## Proposed Solution

### 1. Card Identity Data Model

**`PolicyCard` carries all data needed to render — no external lookups:**

```typescript
// src/shared/types.ts
export interface PolicyCard {
  readonly type: PolicyType;    // 'good' | 'bad' — game logic uses ONLY this
  readonly cardId: string;      // e.g. 'school-lunch-program' — asset filename
  readonly name: string;        // e.g. 'School Lunch Program' — display text
}
```

Three agents independently recommended including `name` directly on `PolicyCard` rather than requiring lookup by `cardId`. Every render site needs the name — carrying it eliminates 6+ import+lookup calls and makes card objects self-contained (same pattern as boardgame.io, Slay the Web).

**Pool definition type** (server-only, used for pool catalog):

```typescript
// src/server/game/card-pool.ts
export interface PolicyCardDef {
  readonly cardId: string;
  readonly name: string;
  readonly type: PolicyType;
}
```

### 2. Card Pool Definition

**Card pool lives in `src/server/game/card-pool.ts`** (server-only). The client never needs the full pool — it only sees dealt cards via `PrivateData`. Interface `PolicyCard` in `src/shared/types.ts` crosses the wire.

Uses `as const satisfies` for type safety:

```typescript
export const VIRTUOUS_POOL = [
  { cardId: 'school-lunch-program',     name: 'School Lunch Program',     type: 'good' },
  { cardId: 'public-library-expansion', name: 'Public Library Expansion', type: 'good' },
  // ... 13+ more
] as const satisfies readonly PolicyCardDef[];

export const CORRUPT_POOL = [
  { cardId: 'dockside-kickback-scheme',  name: 'Dockside Kickback Scheme',  type: 'bad' },
  { cardId: 'casino-license-fast-track', name: 'Casino License Fast-Track', type: 'bad' },
  // ... 13+ more
] as const satisfies readonly PolicyCardDef[];
```

This gives: compile-time validation (typo in `type` = error), literal type inference on `cardId`, deep immutability. Array form (not Record) because pools are shuffled and sliced.

**Pool sizes:** 15+ Virtuous, 15+ Corrupt. Mathematically justified: C(15,11) = 1,365 possible Corrupt combinations per game. Each game sees ~56% of the pool, ensuring variety.

### 3. Deck Creation Changes

Separate card pool selection from deck shuffle. Same RNG stream for deterministic testing:

```typescript
// src/server/game/policies.ts

export function selectCardPool(rng: () => number): PolicyCard[] {
  const virtuous = shuffle([...VIRTUOUS_POOL], rng).slice(0, 6);
  const corrupt = shuffle([...CORRUPT_POOL], rng).slice(0, 11);
  return [...virtuous, ...corrupt].map(def => ({
    type: def.type,
    cardId: def.cardId,
    name: def.name,
  }));
}

export function createDeck(cards: PolicyCard[], rng: () => number): PolicyCard[] {
  return shuffle(cards, rng);
}
```

Note: `shuffle([...POOL])` — spread before shuffle to avoid mutating the const pool.

Pool selection slots into `createGame()` before deck shuffle, using the same RNG stream that drives role assignment and mayor selection. Entire game reproducible from a single seed.

### 4. Type System Migration

| Field | Current Type | New Type |
|-------|-------------|----------|
| `GameState.policyDeck` | `PolicyType[]` | `PolicyCard[]` |
| `GameState.policyDiscard` | `PolicyType[]` | `PolicyCard[]` |
| `GameState.mayorCards` | `PolicyType[] \| null` | `PolicyCard[] \| null` |
| `GameState.commissionerCards` | `PolicyType[] \| null` | `PolicyCard[] \| null` |
| `GameState.lastEnactedPolicy` | `PolicyType \| null` | `PolicyCard \| null` |
| `PrivateData.mayorCards` | `PolicyType[]` | `PolicyCard[]` |
| `PrivateData.commissionerCards` | `PolicyType[]` | `PolicyCard[]` |
| `PrivateData.peekCards` | `PolicyType[]` | `PolicyCard[]` |

Migration is compiler-guided: `PolicyType` (string) is not assignable to `PolicyCard` (object), so TypeScript errors flag every site.

**Game logic changes** are mechanical: `card === 'good'` becomes `card.type === 'good'` everywhere. No behavioral change.

### 5. Event Changes (Additive)

Keep the existing `policy` field for mechanical consumers; add `card` for display:

```typescript
{ type: 'policy-enacted'; policy: PolicyType; card: PolicyCard; autoEnacted: boolean }
```

This is additive and backward-compatible. The narrator bridge and win condition checks use `goodPoliciesEnacted`/`badPoliciesEnacted` counts, not events.

### 6. Cumulative Policy History (Gazette Prep)

Add to `GameState`:
```typescript
policyHistory: PolicyHistoryEntry[];

interface PolicyHistoryEntry {
  card: PolicyCard;
  autoEnacted: boolean;
  round: number;
}
```

Populated in `enactPolicy()` alongside the existing event emission. Never cleared. The Gazette (ADR-V2-04) reads this directly at game-over — no fragile client-side event reconstruction needed.

Projected to `HostState` — all public information (everyone at the table sees which policies were enacted).

### 7. Card Rendering Updates

All 5 hand/enact rendering locations (NOT policy track) switch to per-card art:

```typescript
// Centralized utility: src/client/utils/card-assets.ts
export function getCardImageUrl(cardId: string): string {
  return `/assets/cards/${cardId}.webp`;
}

// At each render site:
img.src = getCardImageUrl(card.cardId);
img.onerror = () => {
  console.error(`Missing card art: ${card.cardId}`);
  img.src = card.type === 'good' ? '/assets/policy-good.png' : '/assets/policy-bad.png';
};
```

Each card also displays its name on the card face (below the illustration). The spec explicitly allows names during gameplay — "name and art, no flavor text."

**Policy track stays generic** — slots are 44-84px wide, too small for distinguishable card illustrations. Track continues using `policy-good.png` / `policy-bad.png`.

### 8. Art Asset Generation

**30+ unique card illustrations** via Imagen 4, same pipeline as V1:

- Extend `scripts/asset-prompts.ts` with card-specific prompts
- Virtuous cards: clean civic imagery (books, roads, clinics, parks)
- Corrupt cards: dark noir imagery (briefcases, back-room deals, cash, shadows)
- All use the existing `STYLE_PREFIX` for visual consistency
- **Target size: 384x512** (2x of largest display context at 200x267 CSS pixels) — NOT 768x1024
- **Output format: WebP** (quality 90, alpha quality 95) — 4-5x smaller than 768x1024 PNG
- Chroma-key at full generation resolution BEFORE resize (per existing convention)
- Output to `public/assets/cards/{cardId}.webp`

**Per-card size:** ~120-150KB (vs ~650KB for 768x1024 PNG)
**Total all cards:** ~4-5MB (vs ~20MB naive)
**Per-game download (17 cards):** ~2-2.5MB (vs ~11MB naive)
**Generation cost:** ~30 API calls x $0.04 = ~$1.20

### 9. Preloading Strategy

When the game transitions from lobby to role-reveal, preload all 17 selected card images:

```typescript
function preloadGameCards(deck: PolicyCard[]): void {
  const seen = new Set<string>();
  for (const card of deck) {
    if (seen.has(card.cardId)) continue;
    seen.add(card.cardId);
    const img = new Image();
    img.src = getCardImageUrl(card.cardId);
  }
}
```

By the time the first mayor-hand view appears (after role reveal + nomination), all card images are cached. Zero loading latency during gameplay.

### 10. Service Worker Cache Updates

In `vite.config.ts`:
- Add dedicated card cache: `card-cache` with `urlPattern: /\/assets\/cards\/.*/`, `maxEntries: 100`
- Bump `audio-cache` to 500 (prep for narrator variant pool)
- Keep `asset-cache` at 50 for non-card assets

## Technical Considerations

### Engine Changes Are Mechanical, Not Behavioral

The engine changes from `PolicyType` to `PolicyCard` — type widening, not behavioral change. All logic comparisons use `card.type` which remains `'good' | 'bad'`. No win conditions, no deck math, no rule logic is altered. The 209 verified V1 rules remain valid.

### lastEnactedPolicy Bug Fix

Current code in `phases.ts:488`:
```typescript
const policy = state.lastEnactedPolicy ?? 'good';  // BUG: silently defaults
```

A null `lastEnactedPolicy` at this point is a state machine invariant violation, not a recoverable condition. Fix during migration:
```typescript
const policy = state.lastEnactedPolicy;
if (!policy) throw new Error('lastEnactedPolicy is null in continueAfterPolicyEnact');
```

### Reshuffle Correctness

`checkReshuffle()` combines `policyDeck` + `policyDiscard` and re-shuffles. With `PolicyCard[]`, card identities survive correctly — same named cards re-enter the deck. `shuffle<T>` is already generic. No special handling needed.

### Card Name Security (Non-Issue)

Card names in `PrivateData` (mayor's hand, commissioner's hand, peek) are visible to the intended recipient. Names carry zero strategic information — all Virtuous cards are mechanically identical, all Corrupt cards are mechanically identical. The projection layer continues to exclude `policyDeck` and `policyDiscard`. No security model changes needed.

### GSAP Animation Timing

For card flip reveals (`policy-enacted.ts`, `auto-enact.ts`): call `img.decode()` during the 300ms pre-flip delay to ensure the card image is decoded before the back face is revealed. Prevents a flash of broken image during the flip animation.

## Acceptance Criteria

### Data Model
- [ ] `PolicyCard` interface in `src/shared/types.ts` with `type`, `cardId`, `name`
- [ ] `PolicyCardDef` interface for pool definitions
- [ ] Card pool in `src/server/game/card-pool.ts` using `as const satisfies`
- [ ] 15+ Virtuous and 15+ Corrupt named cards
- [ ] All card names are noir-fictional, Millbrook City-specific
- [ ] Card names reviewed for humor quality and tone consistency

### Type Migration
- [ ] All GameState policy fields → `PolicyCard[]` / `PolicyCard | null`
- [ ] All PrivateData policy fields → `PolicyCard[]`
- [ ] `GameEvent policy-enacted` carries both `PolicyType` and `PolicyCard` (additive)
- [ ] `GameState.policyHistory: PolicyHistoryEntry[]` added (cumulative, never cleared)
- [ ] `policyHistory` populated in `enactPolicy()` and projected to `HostState`
- [ ] All game logic uses `card.type` for comparisons
- [ ] `lastEnactedPolicy` fallback bug fixed (throw instead of silent default)

### Deck Creation
- [ ] `selectCardPool(rng)` selects 6 Virtuous + 11 Corrupt from pools
- [ ] `createDeck(cards, rng)` shuffles selected cards
- [ ] Pool selection uses same RNG stream as role assignment (deterministic)
- [ ] Spread before shuffle (`[...POOL]`) to avoid mutating const pools
- [ ] Different card names each game (randomized pool selection)

### Card Rendering
- [ ] `getCardImageUrl()` utility in `src/client/utils/card-assets.ts`
- [ ] Commissioner hand shows card name + unique art
- [ ] Mayor hand shows card name + unique art
- [ ] Policy peek shows card name + unique art
- [ ] Policy enacted screen shows card name + unique art
- [ ] Auto-enact screen shows card name + unique art
- [ ] Policy track stays generic (NOT per-card art)
- [ ] Art fallback: console.error + generic image (loud, not silent)
- [ ] GSAP flip animations gated on `img.decode()` to prevent flash

### Art Assets
- [ ] 15+ Virtuous + 15+ Corrupt card illustrations generated
- [ ] Art size: 384x512 (not 768x1024) — 2x of max display context
- [ ] Output format: WebP (quality 90, alpha quality 95)
- [ ] All art uses consistent noir style (same `STYLE_PREFIX`)
- [ ] Asset prompts added to `scripts/asset-prompts.ts`
- [ ] Assets committed to `public/assets/cards/`
- [ ] Asset-existence test: every `cardId` in pool has matching file

### Performance & Caching
- [ ] Preload 17 game cards at game start (lobby → role-reveal transition)
- [ ] SW config: add `card-cache` for `/assets/cards/` (maxEntries: 100)
- [ ] SW config: bump `audio-cache` to 500 (prep for narrator variants)

### Protocol & Projection
- [ ] `protocol.ts` PrivateData updated for `PolicyCard[]`
- [ ] `projection.ts` passes `PolicyCard` data + `policyHistory` through correctly
- [ ] Client receives card identity in all policy-related state updates

### Tests
- [ ] All existing tests updated for `PolicyCard` type
- [ ] Test helper: `makeTestCard(type: PolicyType, cardId?: string): PolicyCard`
- [ ] New tests: card pool selection (correct counts, no duplicates within game)
- [ ] New tests: card identity preserved through reshuffle
- [ ] New tests: card identity in events matches enacted card
- [ ] New tests: policyHistory accumulates correctly across rounds
- [ ] Asset validation test: every pooled cardId has matching file in `public/assets/cards/`

### Verification Gate
- [ ] `pnpm run typecheck` — zero errors
- [ ] `pnpm run test` — all tests pass
- [ ] `pnpm run build` — production build succeeds
- [ ] All 30+ card art assets load correctly in browser (WebP)
- [ ] Card names display correctly in mayor/commissioner hands
- [ ] Different card names appear in consecutive games
- [ ] `grep -r "policy-good.png\|policy-bad.png" src/client/views/ src/client/host/screens/` — only policy-track.ts

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Art generation quality inconsistency | Medium | Review each image, regenerate with prompt tweaks |
| Card name tone misses noir mark | Medium | Iterative refinement — names are just strings |
| `PolicyType` → `PolicyCard` migration scope | Medium | Compiler-guided: string not assignable to object |
| Per-game download size (17 cards) | Medium | 384x512 WebP = ~2-2.5MB (acceptable for WiFi game) |
| SW cache thrashing | Medium | Dedicated card cache, preload only game's 17 cards |
| GSAP animation image flash | Low | `img.decode()` before flip reveal |
| API rate limits during generation | Low | Incremental, 7s delay, ~$1.20 total |

## Execution Order

1. **Card pool + types** — Create `card-pool.ts`, add `PolicyCard` to `types.ts`, update `protocol.ts`
2. **Engine update** — `policies.ts` (selectCardPool + createDeck), `phases.ts` (.type comparisons, lastEnactedPolicy fix, policyHistory)
3. **Projection** — `projection.ts` passes PolicyCard + policyHistory through
4. **Card rendering** — `getCardImageUrl()` utility, update 5 hand/enact rendering views
5. **Card name display** — Add name text to card UI elements
6. **Preloading** — Wire preloadGameCards() at role-reveal transition
7. **SW cache** — Update vite.config.ts cache configs
8. **Art generation** — Generate 30+ card illustrations (384x512 WebP) via Imagen 4
9. **Tests** — Update existing + add card pool/history/asset-existence tests
10. **Verification gate** — typecheck, tests, production build, visual spot-check

## Sources & References

### Origin
- **Brainstorm:** [docs/v2/ideation/BRAINSTORM.md](../ideation/BRAINSTORM.md) — Section 1: Thematic Identity
- **Spec:** [docs/v2/spec/SPEC.md](../spec/SPEC.md) — ADR-V2-01 (LOCKED)

### Internal References
- Policy engine: `src/server/game/policies.ts` (createDeck, shuffle, draw, reshuffle)
- Type definitions: `src/shared/types.ts` (PolicyType, GameState)
- Card rendering: `commissioner-hand.ts:50`, `mayor-hand.ts:42`, `power-peek.ts:33`, `policy-enacted.ts:57`, `auto-enact.ts:72`
- Policy track: `policy-track.ts:41,85` (stays generic)
- Asset pipeline: `scripts/generate-assets.ts`, `scripts/asset-prompts.ts`, `scripts/image-processing.ts`
- SW config: `vite.config.ts:46-52`

### Research References
- boardgame.io uses composite card objects in arrays, not card registries
- Slay the Web embeds all properties (including image path) on card objects
- TypeScript `as const satisfies` — [Kevin Q. Dam](https://kevinqdam.com/blog/as-const-satisfies-type/), [ClarityDev](https://claritydev.net/blog/typescript-as-const-satisfies-type-safe-config)
- C(15,11) = 1,365 combinations validates 15+ pool size for variety

### Dependencies
- **Requires:** Commissioner Rename (ADR-V2-02) completed first
- **Feeds into:** Millbrook City Gazette (ADR-V2-04) reads `policyHistory` for timeline
- **Prep for:** Narrator Variant Pool (ADR-V2-03) — SW cache bumped to 500
