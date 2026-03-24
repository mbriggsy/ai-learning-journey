---
title: "feat: Narrator Variant Pool — 8-10 Lines Per Trigger"
type: feat
status: active
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-03)
---

# feat: Narrator Variant Pool — 8-10 Lines Per Trigger

## Overview

Expand narrator audio from **1 line per trigger to 8-10 variants per trigger**, randomly selected each game. V1's narrator is memorable but repetitive — same 39 lines every game. V2 makes each game sound different while preserving the noir Charon voice aesthetic.

**Scale:** ~23 event triggers x 8-10 variants = **180-230 new audio files** (plus V1 lines preserved in pools). Built incrementally within Gemini API daily limits (~100 calls/day).

## Problem Statement

V1 has 38 narrator lines (15 round-start + 23 event triggers). After 2-3 games, players have heard every line. The narrator loses its surprise factor — "The votes are in. Democracy... has spoken" becomes background noise instead of a dramatic moment.

**Current architecture:**
- `scripts/narrator-prompts.ts` — 38 prompt definitions (id + script text)
- `scripts/generate-narrator.ts` — sequential TTS generation, outputs to `public/audio/{id}.wav`
- `src/client/audio/narrator-lines.ts` — maps trigger IDs to single WAV files
- `src/client/audio/narrator-bridge.ts` — enqueues trigger ID on state transitions
- `src/client/audio/narrator.ts` — plays audio from resolved WAV path

**One-to-one mapping:** trigger → WAV file. No concept of variant selection.

## Proposed Solution

### 1. Variant-Aware Prompt System

Expand `narrator-prompts.ts` to define multiple scripts per trigger:

```typescript
// scripts/narrator-prompts.ts (V2 structure)

export interface NarratorVariant {
  id: string;          // e.g. 'nomination-1', 'nomination-2'
  triggerId: string;   // e.g. 'nomination' — groups variants together
  variantNum: number;  // 1-10
  script: string;      // spoken text
}

export const NARRATOR_VARIANTS: NarratorVariant[] = [
  // nomination — 8-10 variants
  {
    id: 'nomination-1',
    triggerId: 'nomination',
    variantNum: 1,
    script: 'The gavel passes. A new Mayor takes the seat. Choose wisely...', // V1 original
  },
  {
    id: 'nomination-2',
    triggerId: 'nomination',
    variantNum: 2,
    script: 'Another round, another Mayor. The question is... who gets the badge?',
  },
  // ... 6-8 more per trigger
];
```

V1 lines are always variant #1 — preserved, never deleted (ADR-V2-05).

### 2. Audio File Naming Convention

```
public/audio/{triggerId}-{variantNum}.wav

Examples:
  public/audio/nomination-1.wav     (V1 original, renamed)
  public/audio/nomination-2.wav     (new variant)
  public/audio/nomination-3.wav     (new variant)
  ...
  public/audio/nomination-10.wav    (new variant)
```

**Migration:** V1 files like `nomination.wav` are renamed to `nomination-1.wav`. The old filenames are removed (V1 preserved in git history per ADR-V2-05).

### 3. Pool Selection Logic

At the start of each game, randomly select one variant per trigger for the entire game session. This ensures consistency within a game (you don't hear different nomination styles in the same game) while providing freshness across games.

```typescript
// src/client/audio/narrator-pool.ts (new file)

export interface NarratorSelection {
  [triggerId: string]: number; // variant number selected for this game
}

export function selectNarratorPool(
  triggers: string[],
  variantCounts: Record<string, number>,
  rng: () => number = Math.random,
): NarratorSelection {
  const selection: NarratorSelection = {};
  for (const trigger of triggers) {
    const count = variantCounts[trigger] ?? 1;
    selection[trigger] = Math.floor(rng() * count) + 1;
  }
  return selection;
}
```

**Where selection happens:** On the host device when entering `role-reveal` phase. The selection is stored in client-side state (not server state — audio is a client concern).

### 4. Narrator Lines Update

`narrator-lines.ts` changes from single files to pool-aware lookups:

```typescript
// V1: static file per trigger
'nomination': { file: 'nomination.wav', ... }

// V2: template with variant substitution
'nomination': { fileTemplate: 'nomination-{V}.wav', variantCount: 10, ... }
```

### 5. Narrator Bridge Update

`narrator-bridge.ts` currently calls `narrator.enqueue('nomination')`. V2:
- The narrator bridge still calls `narrator.enqueue('nomination')`
- The narrator module resolves the variant internally using the game's `NarratorSelection`
- No changes to the bridge's trigger logic — only the audio resolution path changes

### 6. Generation Pipeline

`generate-narrator.ts` updated to:
- Accept `NarratorVariant[]` instead of flat prompts
- Generate files as `{triggerId}-{variantNum}.wav`
- Support `--only nomination` to generate all variants for a trigger
- Support `--only nomination-3` to generate a specific variant
- Incremental: skip existing files unless `--force`
- Rate-limited: 2s between calls, ~100/day budget

### Round-Start Lines Strategy

V1 already has 15 unique round-start lines (one per round). Two options:

**Option A: Keep round-start as-is.**
15 unique lines already provide variety. The "pool" for round-start is the round number itself. Focus variant budget on the 23 event triggers where repetition is most noticeable.

**Option B: Add 2-3 variants per round.**
Each round gets 2-3 different introductions. More variety, but 15 x 3 = 45 additional lines, consuming significant API budget for modest payoff.

**Recommendation:** Option A. The event triggers (nomination, vote-reveal, good-policy, bad-policy, etc.) are where repetition hurts most. Round-start lines are naturally varied. Revisit if players notice.

## Technical Considerations

### Preloading Strategy

V1 preloads audio by phase group (`PHASE_GROUPS` in `narrator-lines.ts`). V2 only needs to preload the **selected variant** for each trigger, not all variants. Memory footprint stays similar to V1.

```typescript
// Preload only the selected variants, not all 10
function getPreloadFiles(phase: string, selection: NarratorSelection): string[] {
  return PHASE_GROUPS[phase].map(triggerId =>
    `${triggerId}-${selection[triggerId]}.wav`
  );
}
```

### Audio File Size

V1: 39 game WAVs at ~24kHz 16-bit mono. Each is ~100-300KB. V2 total: ~230 files x ~200KB avg = ~46MB in `public/audio/`. This is acceptable for a PWA — audio loads lazily per phase.

### Generation Timeline

~230 new lines at ~100/day API limit = **~3 build sessions**. Each session generates ~100 lines (specific triggers), commits, and moves on. The `--only` flag enables targeted generation.

**Suggested batch order:**
1. Session 1: Election triggers (nomination, vote-open, vote-reveal, approved, blocked) + policy triggers (good-policy, bad-policy) — ~70 lines
2. Session 2: Executive powers (investigate, special-nomination, execution, executed, policy-peek) + game-over triggers — ~60 lines
3. Session 3: Remaining triggers (tracker-advance, auto-enact, deck-reshuffle, veto-proposed/approved/rejected, intro) — ~60 lines

### Script Writing Quality

The variant scripts must match the V1 tone: gravelly noir delivery, dramatic pauses (ellipsis), theatrical language. Each variant should feel like a different line from the same narrator, not a paraphrase. Bad example: "Votes are in" / "The votes are in." Good example: "The votes are in. Democracy... has spoken." / "Every hand's been played. Time to see who's bluffing."

**Quality gate:** Each script variant reviewed for:
- Noir tone consistency
- Length parity (similar duration to V1 line)
- No accidental information leaks (a "bad policy" line shouldn't hint at who chose it)
- Dramatic impact — each variant should stand on its own

### Commissioner Rename in Scripts

All variant scripts use "Commissioner" (not "Police Chief"). This plan assumes ADR-V2-02 (Commissioner Rename) is complete, including audio regen of V1 lines. The V1 originals (variant #1) already say "Commissioner" by the time this phase starts.

## System-Wide Impact

- **Interaction graph:** narrator-bridge.ts → narrator.ts → audio-engine.ts. Only the narrator module changes (variant resolution). Bridge and engine are unaffected.
- **State lifecycle:** No server state changes. Variant selection is client-side only.
- **Disk footprint:** ~46MB additional audio files in `public/audio/`. Acceptable for PWA with lazy loading.
- **API budget:** ~230 API calls over 3 sessions. $0 (Gemini TTS is free tier).

## Acceptance Criteria

### Prompt System
- [ ] `narrator-prompts.ts` restructured with `NarratorVariant[]` format
- [ ] 8-10 unique script variants per event trigger (23 triggers)
- [ ] V1 lines preserved as variant #1 in every pool
- [ ] All scripts use "Commissioner" (post-rename)
- [ ] All scripts reviewed for noir tone, length parity, and quality

### Audio Generation
- [ ] File naming: `{triggerId}-{variantNum}.wav`
- [ ] V1 files renamed from `{triggerId}.wav` to `{triggerId}-1.wav`
- [ ] Generation script updated for variant-aware output
- [ ] `--only {triggerId}` generates all variants for a trigger
- [ ] Incremental generation: skip existing files unless `--force`
- [ ] All audio files generated and committed to `public/audio/`

### Pool Selection
- [ ] `narrator-pool.ts` implements `selectNarratorPool()`
- [ ] Selection happens once per game (entering role-reveal)
- [ ] Selection stored in client state
- [ ] Same variant used for a trigger throughout the game
- [ ] Different variant selected in different games (randomized)

### Narrator Integration
- [ ] `narrator-lines.ts` updated with variant counts and file templates
- [ ] `narrator.ts` resolves variants using game's `NarratorSelection`
- [ ] `narrator-bridge.ts` trigger logic unchanged (still calls `enqueue('trigger-id')`)
- [ ] Phase preloading loads only selected variants (not all)

### Verification Gate
- [ ] `pnpm run typecheck` — zero errors
- [ ] `pnpm run test` — all tests pass
- [ ] Manual playtest: different narrator lines heard in consecutive games
- [ ] Manual spot-check: 3-5 random triggers, verify audio quality and tone
- [ ] All audio files validate as proper WAV format
- [ ] No V1 audio files deleted (only renamed to variant-1)

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Script quality inconsistency across variants | High | Review every script before generation. Quality gate per variant. |
| TTS voice consistency across sessions | Medium | Same model + voice + direction prefix. Spot-check across batches. |
| API rate limit during generation | Low | Incremental batches, 2s delay, 3 sessions. |
| Audio file size bloat | Low | Lazy loading by phase. ~46MB total is acceptable for PWA. |
| Preload timing mismatch | Low | Only preload selected variants. Same memory footprint as V1. |

## Execution Order

1. **Restructure prompts** — Convert `narrator-prompts.ts` to variant-aware format (V1 lines as variant #1)
2. **Write variant scripts** — 8-10 per event trigger, noir quality reviewed
3. **Update generation script** — Variant-aware file naming + `--only` support
4. **Rename V1 audio files** — `{id}.wav` → `{id}-1.wav` for all 39 game lines
5. **Update narrator-lines.ts** — Variant counts + file templates
6. **Create narrator-pool.ts** — Pool selection logic
7. **Update narrator.ts** — Variant resolution using NarratorSelection
8. **Update narrator-bridge.ts** — Wire pool selection at game start
9. **Update preloading** — Phase groups load only selected variants
10. **Generate audio** — Session 1: election + policy triggers (~70 lines)
11. **Generate audio** — Session 2: executive powers + game-over (~60 lines)
12. **Generate audio** — Session 3: remaining triggers (~60 lines)
13. **Tests** — Pool selection tests, variant resolution tests
14. **Verification gate** — typecheck, tests, manual playtest, audio spot-check

## Sources & References

### Origin
- **Brainstorm:** [docs/v2/ideation/BRAINSTORM.md](../ideation/BRAINSTORM.md) — Section 3a: Narrator Variant Pool
- **Spec:** [docs/v2/spec/SPEC.md](../spec/SPEC.md) — ADR-V2-03 (LOCKED)

### Internal References
- Narrator prompts: `scripts/narrator-prompts.ts` (38 lines, 23 unique triggers)
- Generation script: `scripts/generate-narrator.ts` (Gemini TTS, Charon voice)
- Audio mapping: `src/client/audio/narrator-lines.ts` (trigger → WAV)
- Bridge: `src/client/audio/narrator-bridge.ts` (state → trigger)
- Narrator module: `src/client/audio/narrator.ts` (queue + playback)
- Audio engine: `src/client/audio/audio-engine.ts` (Web Audio API)

### Dependencies
- **Requires:** Commissioner Rename (ADR-V2-02) completed first (all scripts use "Commissioner")
- **Independent of:** Named Policy Cards (ADR-V2-01) — no interaction
- **Independent of:** Millbrook City Gazette (ADR-V2-04) — no interaction
