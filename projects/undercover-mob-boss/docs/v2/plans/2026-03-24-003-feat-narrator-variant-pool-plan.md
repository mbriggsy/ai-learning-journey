---
title: "feat: Narrator Variant Pool — Tiered Variants Per Trigger"
type: feat
status: code-complete
date: 2026-03-24
origin: docs/v2/ideation/BRAINSTORM.md
spec: docs/v2/spec/SPEC.md (ADR-V2-03)
---

## Enhancement Summary

**Deepened on:** 2026-03-24
**Agents used:** 9 (TypeScript reviewer, architecture strategist, code simplicity reviewer, performance oracle, pattern recognition specialist, spec flow analyzer, best-practices researcher, repo research analyst, framework docs researcher) + 3 web searches
**Codebase validated:** All 6 narrator module files read and cross-referenced against plan assumptions

### Key Improvements Discovered
1. **WAV to Opus compression** — 46MB → ~3.9MB (12x reduction). Changes caching, preloading, and git strategy entirely.
2. **Round-start naming collision** — `round-start-1.wav` is ambiguous (round 1 or variant 1?). Must exempt round-start from variant system explicitly.
3. **NarratorSelection API** — 5/9 agents flagged: no injection point, no lifecycle, no fallback. Fully specified below.
4. **Variant-1 fallback** — If selected variant fails to load, fall back to variant 1 (guaranteed to exist), not silence.
5. **Buffer cache memory leak** — Never cleared between games. After 5 games: ~73MB of AudioBuffers.
6. **Atomic commit constraint** — Steps 4-9 must ship as one commit or all narrator audio returns 404.
7. **Generation timeline correction** — Gemini TTS allows 250 RPD (not ~100). Single session possible (~27 min).

### New Considerations Discovered
- Gemini TTS `VOICE_DIRECTION` constant exists but is never passed to the API — new variants need this fixed
- Workbox `maxEntries: 100` in `vite.config.ts` cannot hold 230 files — increase to 300+
- `StaleWhileRevalidate` fires 23 unnecessary background requests per cached game — switch to `CacheFirst`
- Trigger count is 24 (not 23) — plan must clarify whether `intro` gets variants
- No narrator audio tests exist — zero baseline to build on
- Industry standard is shuffle bag (not naive random) for audio variant pools

---

# feat: Narrator Variant Pool — Tiered Variants Per Trigger

## Overview

Expand narrator audio from **1 line per trigger to 2-8 variants per trigger** (tiered by frequency), randomly selected each game. V1's narrator is memorable but repetitive — same 39 lines every game. V2 makes each game sound different while preserving the noir Charon voice aesthetic.

**Scale:** 24 event triggers (including intro) x 2-8 variants (tiered) = **~80-120 new audio files** (plus V1 lines preserved in pools). **Audio format: Opus** (~1.6-2.4MB total, committed as `.ogg`). Single generation session (~12-15 min at 250 RPD).

### Research Insights — Variant Count

**Industry Practice (game audio):**
Professional game audio uses 3-5 variants for frequent events, 1-2 for rare events ([A Sound Effect — Game Audio Immersion](https://www.asoundeffect.com/game-audio-immersion/)). The 8-10 target maximizes variety but increases generation time, quality review effort, and disk footprint. Consider a tiered approach:

| Event Frequency | Triggers | Variants | Rationale |
|---|---|---|---|
| High (every round) | nomination, vote-open, vote-reveal, approved, blocked | **5-8** | Heard 5-10x per game — maximum variety needed |
| Medium (most games) | good-policy, bad-policy, tracker-advance, auto-enact | **3-5** | Heard 1-3x per game — moderate variety |
| Low (once per game) | intro, game-over states (6), execution, executed | **2-3** | Heard once — even 2 variants doubles freshness |
| Rare (conditional) | veto-proposed, veto-approved, veto-rejected, deck-reshuffle, investigate, special-nomination, policy-peek | **2** | May not fire at all — minimal investment |

**DECIDED:** Tiered variant counts. Projects to **~80-120 total files**, concentrating variety where repetition hurts most.

---

## Problem Statement

V1 has 38 narrator lines (15 round-start + 23 event triggers). After 2-3 games, players have heard every line. The narrator loses its surprise factor — "The votes are in. Democracy... has spoken" becomes background noise instead of a dramatic moment.

**Current architecture:**
- `scripts/narrator-prompts.ts` — 38 prompt definitions (id + script text)
- `scripts/generate-narrator.ts` — sequential TTS generation, outputs to `public/audio/{id}.wav`
- `src/client/audio/narrator-lines.ts` — maps trigger IDs to single WAV files
- `src/client/audio/narrator-bridge.ts` — enqueues trigger ID on state transitions
- `src/client/audio/narrator.ts` — plays audio from resolved WAV path

**One-to-one mapping:** trigger → WAV file. No concept of variant selection.

### Research Insights — Within-Game Repetition

The plan solves **between-game** repetition (different variants each game) but not **within-game** repetition. A trigger like `nomination` fires every round — potentially 5-10 times per game. The player hears the same variant all 5-10 times.

This is a valid design trade-off: per-game selection is simpler (one variant preloaded per trigger, consistent tone within a game). But it should be acknowledged explicitly. A future iteration could add per-occurrence selection for high-frequency triggers, at the cost of preloading all variants for those triggers.

### Research Insights — Trigger Count Correction

The plan says "23 event triggers" but `narrator-lines.ts` contains **24 non-round-start entries** (confirmed by codebase audit):

> intro, nomination, vote-open, vote-reveal, approved, blocked, tracker-advance, auto-enact, good-policy, bad-policy, investigate, special-nomination, execution, executed, policy-peek, mob-boss-executed, citizens-win-policy, citizens-win-execution, mob-wins-policy, mob-wins-election, deck-reshuffle, veto-proposed, veto-approved, veto-rejected

**DECIDED:** `intro` IS included in the variant pool (24 triggers total). It plays once per game and is the most memorable line — high variety impact. Categorized as "Low frequency" (2-3 variants).

---

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

### Research Insights — Type Design

**Drop the `id` field (redundant).** It is always `${triggerId}-${variantNum}` — storing it as a separate field invites typo inconsistencies (e.g., `id: 'nomination-2'` with `variantNum: 3`). Compute it via a helper where needed:

```typescript
// Simplified interface — 3 fields, zero redundancy
export interface NarratorVariant {
  triggerId: string;
  variantNum: number;
  script: string;
}

const variantId = (v: NarratorVariant) => `${v.triggerId}-${v.variantNum}`;
```

**Resolve the parallel type hierarchy.** The existing `NarratorPrompt` type (in `scripts/types.ts`) has `{ id, trigger, script }`. The new `NarratorVariant` has `{ triggerId, variantNum, script }`. These are clearly related. The plan should specify: `NarratorPrompt` is deprecated and replaced by `NarratorVariant`. One type, one source of truth.

**Derive union types from source of truth.** The existing codebase already derives `NarratorId` as a union type from the prompts array. V2 should derive `NarratorTriggerId` from the narrator lines definition:

```typescript
export const NARRATOR_LINES = { ... } as const;
export type NarratorTriggerId = keyof typeof NARRATOR_LINES;
```

Then `NarratorSelection` becomes `Record<NarratorTriggerId, number>`, and typos in the bridge's 25+ call sites become compile errors.

**Dual data model.** Flat array is correct for the generation layer (iterate sequentially). But the runtime layer needs a **pre-grouped structure** for O(1) lookup — the current `NARRATOR_LINES` is `Record<string, NarratorLine>`. The plan should specify both representations: flat array in `narrator-prompts.ts`, pre-computed `Record<TriggerId, { variantCount, ... }>` in `narrator-lines.ts`.

**Prompt array scaling.** At 80-230 entries, the flat array gets unwieldy. Consider grouping by trigger ID in a structured object for navigability.

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

### Research Insights — Naming Collision & Exemptions

**CRITICAL: Round-start naming collision.** `round-start-1.wav` through `round-start-15.wav` already exist where the number means **round number** (deterministic, from game state). Under the variant scheme, `round-start-1.wav` would mean **variant 1** (random, from pool selection). These are completely different semantics sharing the same filename pattern.

**Resolution:** Round-start files are **explicitly exempt** from the variant naming system. They keep their current names (`round-start-{N}.wav` where N = round number). The variant resolver must exclude `round-start` from variant lookup. Add a code comment explaining the naming exception.

**Trailer line exemption.** The 13 `trailer-*` lines in `narrator-prompts.ts` are also exempt — they are not part of the game narrator system. Add a `category: 'game' | 'trailer'` field or separate them into a different export.

**Single-variant naming.** After migration, triggers with only 1 variant (e.g., `intro-1.wav` during incremental rollout) look like a missing file. This is intentional — **uniform naming** is simpler than conditional naming. Document this so future contributors don't file it as a bug.

### Research Insights — Audio Format (CRITICAL)

**Convert WAV to Opus.** This is the single highest-impact recommendation from the research.

| Metric | WAV (current plan) | Opus (recommended) |
|---|---|---|
| Per-file average | ~200KB | ~17KB |
| Total (230 files) | ~46MB | ~3.9MB |
| Total (100 files, tiered) | ~20MB | ~1.6MB |
| Per-game download (23 files) | ~4.6MB | ~391KB |
| Git repo impact | Severe binary bloat | Manageable |
| iOS Cache API (50MB limit) | 92% consumed | 8% consumed |
| Quality (mono voice at 32kbps) | Uncompressed | Imperceptible loss |

**Browser support:** Opus in OGG container is supported in Chrome, Firefox, Edge (all versions), and Safari 18.4+ (March 2025). By 2026, iOS 18.4+ represents 98%+ of the installed base. This is safe.

**Build pipeline addition:**
1. Generate WAV to `assets/raw/audio/` (gitignored)
2. Convert to Opus: `ffmpeg -i input.wav -c:a libopus -b:a 32k -vbr on -application audio output.ogg`
3. Commit only `.ogg` files to `public/audio/`
4. Update all file extensions from `.wav` to `.ogg`

**Cascading simplifications from Opus:**
- Caching: can **precache all** files in SW install event (~1.6-3.9MB trivial)
- Preloading: can **bulk preload** all buffers after audio unlock (~2 sec)
- Phase-based lazy loading: **becomes unnecessary** (keep PHASE_GROUPS for code organization, not performance)
- Offline: guaranteed from first visit (all audio precached)
- Git: manageable binary blobs instead of 46MB+

**DECIDED:** Adopt Opus conversion. WAV sources gitignored in `assets/raw/audio/`, only `.ogg` committed.

Sources:
- [Can I Use — Opus](https://caniuse.com/opus)
- [Opus Recommended Settings](https://wiki.xiph.org/Opus_Recommended_Settings)
- [MDN Audio Codecs Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)

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

### Research Insights — Selection API Contract (CRITICAL)

**5/9 agents flagged this gap.** The plan must define how the selection gets into the narrator module.

**Recommended API:**

```typescript
// On NarratorPlayer class:
setGameSelection(selection: NarratorSelection): void
// - Stores selection for the current game
// - Called by narrator-bridge at role-reveal transition
// - If called again (new game), replaces previous selection

clearGameSelection(): void
// - Called on game-over → lobby transition (alongside buffer cache clear)
```

**Fallback behavior:** If `enqueue()` is called before `setGameSelection()` (e.g., host reconnects mid-game and `prevPhase` starts as `null`), implement **lazy selection**: run `selectNarratorPool()` on the spot with the current trigger set. This prevents silent narration after reconnection.

**Lifecycle:**
1. Game starts → lobby → role-reveal transition
2. Bridge calls `narrator.setGameSelection(selection)`
3. Bridge calls `narrator.preloadPhase('role-reveal')` (uses selection for variant resolution)
4. Game plays — each `enqueue()` resolves using stored selection
5. Game ends → lobby transition
6. Bridge calls `narrator.clearGameSelection()` + `narrator.dispose()` (clears buffer cache)
7. New game → fresh selection at step 2

### Research Insights — Seeded PRNG

Use a seeded PRNG instead of `Math.random()` for reproducible variant selection. Inline Mulberry32 (8 lines, no dependency, passes BigCrush):

```typescript
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Why seeded:** Reproducible for debugging ("in session ABC, what line played for nomination?"), deterministic for testing, and consistent with the game engine's existing injectable RNG pattern (`shuffle()` in `policies.ts` uses `rng: () => number = Math.random`).

**Seed source:** Derive from game room session. Fallback to `Date.now()` for local play.

### Research Insights — Shuffle Bag Pattern

The industry standard for "play one of N sounds" is the **shuffle bag** (deal-from-a-deck), not naive random. Naive random can play the same variant in consecutive games (33% chance with 3 variants). A shuffle bag guarantees every variant plays before any repeats.

For UMB's per-game fixed selection, the shuffle bag applies to **cross-game** variant selection. Each trigger maintains a shuffle bag of its variant numbers. At game start, draw the next variant from each trigger's bag. When all variants have been drawn, reshuffle.

This is a future enhancement — the initial implementation can use simple random selection with the seeded PRNG, and the shuffle bag can be added when variant pools are stable.

### Research Insights — `variantCounts` Should Be Derived

`selectNarratorPool` takes `variantCounts: Record<string, number>` as a parameter. But this data already exists in the narrator lines definition (the `variantCount` field on each `NarratorLine`). The function should derive counts from `NARRATOR_LINES` directly, rather than having the caller manually construct a counts record.

### 4. Narrator Lines Update

`narrator-lines.ts` changes from single files to pool-aware lookups:

```typescript
// V1: static file per trigger
'nomination': { file: 'nomination.wav', ... }

// V2: template with variant substitution
'nomination': { fileTemplate: 'nomination-{V}.wav', variantCount: 10, ... }
```

### Research Insights — Drop `fileTemplate` (YAGNI)

The `fileTemplate` field is redundant. Every trigger follows the same pattern: `${triggerId}-${variantNum}.ogg`. No trigger deviates. The resolver can compute the filename in one line:

```typescript
// Instead of storing a template per trigger:
const file = `${triggerId}-${selection[triggerId]}.ogg`;

// V2 NarratorLine only needs:
'nomination': { variantCount: 10, hook: '...', durationMs: 4200, target: 'host' }
```

This eliminates the `{V}` substitution system entirely. Simpler data, simpler resolution.

### Research Insights — Naming Consistency

The `hook` field in `narrator-lines.ts` and the `trigger` field in `narrator-prompts.ts` describe the **same concept** (human-readable description of when a line plays) with **different names**. The plan introduces `triggerId` as the machine-readable key, which is dangerously close to the existing `trigger` field.

**Standardize during migration:**
- Machine-readable event key: `triggerId` (new, for variant grouping)
- Human-readable description: `description` (rename both `hook` and `trigger`)

### Research Insights — `NarratorLine` Breaking Change

Changing `file: string` to `variantCount: number` is a breaking change to every consumer. The `resolveLineAudio` method and `preloadPhase` method both read `line.file`. Consider a discriminated union for the transition:

```typescript
type NarratorLine =
  | { kind: 'single'; file: string; ... }       // round-start (keeps special handling)
  | { kind: 'variant'; variantCount: number; ... } // all other triggers
```

This leverages TypeScript's discriminated union to force exhaustive handling at every consumption site.

### 5. Narrator Bridge Update

`narrator-bridge.ts` currently calls `narrator.enqueue('nomination')`. V2:
- The narrator bridge still calls `narrator.enqueue('nomination')`
- The narrator module resolves the variant internally using the game's `NarratorSelection`
- No changes to the bridge's trigger logic — only the audio resolution path changes

### Research Insights — Bridge Responsibilities

The bridge gains **two new lifecycle responsibilities** (not per-event logic):

1. **Pool selection initialization** — at the lobby→role-reveal transition (line 59), after intro enqueue:
   ```typescript
   const selection = selectNarratorPool(triggers, variantCounts, seededRng);
   narrator.setGameSelection(selection);
   ```

2. **Cleanup on game reset** — when transitioning from game-over to lobby:
   ```typescript
   narrator.clearGameSelection();
   narrator.dispose(); // Clears buffer cache to prevent memory leak
   ```

**Initialization order matters:** Selection must complete BEFORE the first `preloadPhase()` call, or the preloader has no selection map to consult.

### Research Insights — Atomic Commit Constraint

Steps 4-9 in the execution order (file rename, narrator-lines update, pool creation, narrator.ts update, bridge wiring, preload update) **must ship as one commit**. Between the file rename (`nomination.wav` → `nomination-1.ogg`) and the code update, all narrator audio would return 404. The execution steps are fine as a work order, but the git boundary must be explicit.

### 6. Generation Pipeline

`generate-narrator.ts` updated to:
- Accept `NarratorVariant[]` instead of flat prompts
- Generate files as `{triggerId}-{variantNum}.wav`
- Support `--only nomination` to generate all variants for a trigger
- Support `--only nomination-3` to generate a specific variant
- Incremental: skip existing files unless `--force`
- Rate-limited: 2s between calls, ~100/day budget

### Research Insights — Generation Corrections

**Rate limit correction:** Gemini TTS free tier allows **250 RPD** (not ~100) and **10 RPM** ([Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)). At 10 RPM with 6-7s safety delays, all 230 files could generate in **~27 minutes in a single session**. The 3-session timeline is overly cautious.

**VOICE_DIRECTION is defined but never used.** The `generate-narrator.ts` defines a `VOICE_DIRECTION` constant (line 27) but never passes it to the Gemini API in `generateOne()`. V1 lines were generated with raw script text only — the noir tone comes entirely from the Charon voice preset and the script's natural language. New variant scripts either need the tone fully embedded in the text, or `VOICE_DIRECTION` must be wired into the API call. **Fix this before generating variants** to ensure tone consistency.

**`--only` flag parsing:** The plan describes two behaviors (`--only nomination` for all variants, `--only nomination-3` for one) but doesn't resolve the parsing ambiguity. Strategy: check if the argument matches a trigger ID first (prefix match). If no match, treat it as a variant ID (exact match). Document this precedence rule. Consider a separate `--trigger` flag for clarity.

**Opus conversion step:** Add a post-generation conversion step:
```bash
ffmpeg -i "assets/raw/audio/${id}.wav" -c:a libopus -b:a 32k -vbr on -application audio "public/audio/${id}.ogg"
```
Raw WAVs go to `assets/raw/audio/` (gitignored). Only `.ogg` files are committed.

### Research Insights — TTS Quality Assurance Pipeline

**Critical finding:** Gemini TTS preview models have known voice consistency issues across calls — including tone variations and timing differences ([Google AI Forum — Gemini TTS Voice Consistency](https://discuss.ai.google.dev/t/gemini-tts-voice-consistency/124172)). A QA pipeline is not optional.

**Recommended pipeline:**
1. **Generate in batches, same session** — all variants of one trigger in one run. Don't spread across days.
2. **Duration consistency check** — all variants of the same trigger should be within ±30% duration. Log in `generation-log.json`.
3. **Manual listening test** — compare each variant against V1 original (the tone reference). Reject variants that differ significantly in gravelliness, pacing, or energy. ~2-3 min per trigger, ~30 min total.
4. **Extended generation log:**
   ```typescript
   interface NarratorLogEntry {
     id: string;
     variantNumber: number;
     status: 'success' | 'failed' | 'rejected';
     durationMs: number | null;
     generatedAt: string;
     modelVersion: string;
   }
   ```

**Voice direction consistency:**
- Use the EXACT same voice direction prefix for all variants
- If Gemini TTS model version changes, regenerate ALL files (not just new variants)
- The Dec 2025 Gemini 2.5 TTS update added "role adherence" — style prompts now maintain consistent character voices across sessions ([Google — Gemini 2.5 TTS](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-2-5-text-to-speech/))

Sources:
- [Gemini TTS Speech Generation Docs](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini TTS Voice Consistency Forum](https://discuss.ai.google.dev/t/gemini-tts-voice-consistency/124172)

### Round-Start Lines Strategy

V1 already has 15 unique round-start lines (one per round). Two options:

**Option A: Keep round-start as-is.**
15 unique lines already provide variety. The "pool" for round-start is the round number itself. Focus variant budget on the 23 event triggers where repetition is most noticeable.

**Option B: Add 2-3 variants per round.**
Each round gets 2-3 different introductions. More variety, but 15 x 3 = 45 additional lines, consuming significant API budget for modest payoff.

**Recommendation:** Option A. The event triggers (nomination, vote-reveal, good-policy, bad-policy, etc.) are where repetition hurts most. Round-start lines are naturally varied. Revisit if players notice.

### Research Insights — Option A Confirmed

All reviewing agents confirmed Option A is the correct simplicity call. Round-start lines are heard once per round and are already unique. No repetition problem exists here. The variant budget is better spent on event triggers that fire repeatedly.

**Important:** This exemption must be explicit in the code. Round-start files keep their `round-start-{N}.wav` naming where N = round number. The variant resolver must explicitly exclude `round-start` from variant lookup. Add a code comment explaining the naming exception to prevent future confusion if round-start variants are ever considered.

---

## Technical Considerations

### Preloading Strategy

V1 preloads audio by phase group (`PHASE_GROUPS` in `narrator-lines.ts`). V2 only needs to preload the **selected variant** for each trigger, not all variants. Memory footprint stays similar to V1.

```typescript
// Preload only the selected variants, not all 10
function getPreloadFiles(phase: string, selection: NarratorSelection): string[] {
  return PHASE_GROUPS[phase].map(triggerId =>
    `${triggerId}-${selection[triggerId]}.ogg`
  );
}
```

### Research Insights — Preloading

**Round-start special case not handled.** The preload example would try to look up `selection['round-start']` and produce `round-start-undefined.ogg`. Round-start is NOT part of the variant pool — it uses round numbers, not variant numbers. The preloader must preserve the existing round-start special case (load all 15 files).

**With Opus, preloading strategy simplifies dramatically.** If audio is converted to Opus (~1.6-3.9MB total), the entire audio library can be **bulk preloaded** after audio unlock in ~2 seconds:

```typescript
async function preloadAllNarrator(): Promise<void> {
  const manifest = getAllAudioUrls(); // All ~100 audio URLs
  await Promise.all(manifest.map(url => audioEngine.loadBuffer(url)));
}
```

This eliminates phase-based preloading entirely. Keep `PHASE_GROUPS` for code organization and bridge logic, but all audio is already loaded. Zero playback latency, zero cache-miss fallback complexity.

**With WAV (if Opus not adopted), phase-based preloading stays.** But add a variant-1 fallback: if the selected variant fails to load, attempt variant 1 before skipping.

Sources:
- [web.dev — Fast Playback with Preload](https://web.dev/fast-playback-with-preload/)
- [MDN — Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)

### Audio File Size

V1: 39 game WAVs at ~24kHz 16-bit mono. Each is ~100-300KB. V2 total: ~230 files x ~200KB avg = ~46MB in `public/audio/`. This is acceptable for a PWA — audio loads lazily per phase.

### Research Insights — File Size (CRITICAL)

**46MB of uncompressed WAV is NOT acceptable for a PWA.** This was the most impactful finding.

| Metric | WAV (plan) | Opus (recommended) |
|---|---|---|
| Per-file average | ~200KB | ~17KB |
| 230 files total | ~46MB | ~3.9MB |
| 100 files (tiered) | ~20MB | ~1.6MB |
| Per-game (23 files) | ~4.6MB | ~391KB |
| Git binary bloat | Severe (no delta compression) | Manageable |
| iOS Cache API (50MB limit) | 92% consumed | 8% consumed |
| First-visit 3G download | ~4.6MB (slow) | ~391KB (fast) |
| First-visit WiFi | ~2 seconds | <1 second |

**Memory impact (AudioBuffer):** Regardless of source format, `decodeAudioData()` produces Float32 PCM. At 24kHz mono: `24000 * 4 bytes * duration`. A 3-second clip = 288KB decoded. 23 buffers at ~3s avg = ~6.6MB per game — acceptable on all devices.

**Workbox cache configuration must change:**
- `maxEntries`: 100 → 300 (current value in `vite.config.ts` line 43 cannot hold 230 files)
- `handler`: `StaleWhileRevalidate` → `CacheFirst` (immutable audio files don't need background revalidation — saves 23 unnecessary network requests per cached game)

Sources:
- [MDN — Web Audio API AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer)
- [Chrome Developers — Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)

### Generation Timeline

~230 new lines at ~100/day API limit = **~3 build sessions**. Each session generates ~100 lines (specific triggers), commits, and moves on. The `--only` flag enables targeted generation.

**Suggested batch order:**
1. Session 1: Election triggers (nomination, vote-open, vote-reveal, approved, blocked) + policy triggers (good-policy, bad-policy) — ~70 lines
2. Session 2: Executive powers (investigate, special-nomination, execution, executed, policy-peek) + game-over triggers — ~60 lines
3. Session 3: Remaining triggers (tracker-advance, auto-enact, deck-reshuffle, veto-proposed/approved/rejected, intro) — ~60 lines

### Research Insights — Timeline Correction

**Gemini TTS allows 250 RPD** (not ~100) at 10 RPM ([Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)). At 10 RPM with 6-7s safety delays:

| Scenario | Files | Time | Sessions |
|---|---|---|---|
| Plan (8-10 variants, WAV) | ~230 | ~27 min | **1 session** |
| Tiered (3-8 variants, Opus) | ~100 | ~12 min | **1 session** |

The 3-session plan was based on incorrect rate limit assumptions. All generation can happen in a single session. The 2s inter-call delay in `generate-narrator.ts` is sufficient (10 RPM = 6s minimum, 2s delay + processing time ≈ 4-5s per call is within budget).

**Batch API:** Gemini Batch API documentation lists TTS as supported, but community reports indicate it may not work for preview models as of early 2026. Plan for sequential generation.

### Script Writing Quality

The variant scripts must match the V1 tone: gravelly noir delivery, dramatic pauses (ellipsis), theatrical language. Each variant should feel like a different line from the same narrator, not a paraphrase. Bad example: "Votes are in" / "The votes are in." Good example: "The votes are in. Democracy... has spoken." / "Every hand's been played. Time to see who's bluffing."

**Quality gate:** Each script variant reviewed for:
- Noir tone consistency
- Length parity (similar duration to V1 line)
- No accidental information leaks (a "bad policy" line shouldn't hint at who chose it)
- Dramatic impact — each variant should stand on its own

### Commissioner Rename in Scripts

All variant scripts use "Commissioner" (not "Police Chief"). This plan assumes ADR-V2-02 (Commissioner Rename) is complete, including audio regen of V1 lines. The V1 originals (variant #1) already say "Commissioner" by the time this phase starts.

---

## System-Wide Impact

- **Interaction graph:** narrator-bridge.ts → narrator.ts → audio-engine.ts. Only the narrator module changes (variant resolution). Bridge and engine are unaffected.
- **State lifecycle:** No server state changes. Variant selection is client-side only.
- **Disk footprint:** ~46MB additional audio files in `public/audio/`. Acceptable for PWA with lazy loading.
- **API budget:** ~230 API calls over 3 sessions. $0 (Gemini TTS is free tier).

### Research Insights — System-Wide Additions

**Service worker cache strategy changes (must be in scope):**
- `maxEntries`: 100 → 300+ in `vite.config.ts`
- `handler`: `StaleWhileRevalidate` → `CacheFirst`
- If Opus adopted: add `.ogg` to glob patterns for precaching

**Buffer cache lifecycle (new):**
- Clear `NarratorPlayer.bufferCache` on game reset (game-over → lobby)
- `narrator.dispose()` already exists (line 201-204) — call it from bridge on game reset
- Without this: ~48MB memory growth over 10 games (each game caches different variant AudioBuffers)

**Opus conversion build step (if adopted):**
- New pipeline: WAV → Opus via ffmpeg in `generate-narrator.ts` or separate script
- Raw WAVs to `assets/raw/audio/` (gitignored)
- Only `.ogg` files committed to `public/audio/`

**`target: 'both'` verification needed:**
- `vote-open` line has `target: 'both'` — if player phones independently play narrator audio, they need the selection or a fixed fallback (always variant 1 on player devices).
- Current evidence: bridge only runs on host device. Verify during implementation.

**Spec deviation to document:**
- ADR-V2-03 says "Pool selection logic in `narrator-bridge.ts`"
- Plan correctly puts the algorithm in `narrator-pool.ts` with the bridge only calling it
- Document this as an intentional architectural improvement

---

## Acceptance Criteria

### Prompt System
- [x] `narrator-prompts.ts` restructured with `NarratorVariant[]` format
- [x] 2-6 unique script variants per event trigger (tiered, 24 triggers) — plan adjusted from 8-10 to tiered counts
- [x] V1 lines preserved as variant #1 in every pool
- [x] All scripts use "Commissioner" (post-rename)
- [x] All scripts reviewed for noir tone, length parity, and quality

### Audio Generation
- [x] File naming: `{triggerId}-{variantNum}.ogg` (Opus adopted instead of WAV)
- [x] V1 files renamed from `{triggerId}.wav` to `{triggerId}-1.ogg`
- [x] Generation script updated for variant-aware output
- [x] `--trigger {triggerId}` generates all variants for a trigger
- [x] Incremental generation: skip existing files unless `--force`
- [ ] All audio files generated and committed to `public/audio/` — **V1 variant-1 files committed as .ogg; new variant audio pending generation (requires API run)**

### Pool Selection
- [x] `narrator-pool.ts` implements `selectNarratorPool()`
- [x] Selection happens once per game (entering role-reveal)
- [x] Selection stored in client state
- [x] Same variant used for a trigger throughout the game
- [x] Different variant selected in different games (randomized via Mulberry32 seeded PRNG)

### Narrator Integration
- [x] `narrator-lines.ts` updated with variant counts (discriminated union: single vs variant)
- [x] `narrator.ts` resolves variants using game's `NarratorSelection`
- [x] `narrator-bridge.ts` trigger logic unchanged (still calls `enqueue('trigger-id')`)
- [x] Phase preloading loads only selected variants (not all)

### Verification Gate
- [x] `pnpm run typecheck` — zero errors
- [x] `pnpm run test` — 807 pass (18 known Plan 2 art failures)
- [ ] Manual playtest: different narrator lines heard in consecutive games — **pending: needs new variant audio generated**
- [ ] Manual spot-check: 3-5 random triggers, verify audio quality and tone — **pending: needs new variant audio**
- [x] All audio files validate as proper Opus/OGG format (12x compression: 9.4MB → 776KB)
- [x] No V1 audio files deleted (renamed to variant-1, backed up in assets/raw/)

### Research Insights — Additional Acceptance Criteria

The following criteria were identified by the research agents and should be added:

**Fault Tolerance:**
- [x] Variant load failure falls back to variant 1 (never goes silent)
- [x] Lazy pool selection if no selection exists when trigger fires (reconnection recovery)

**Infrastructure:**
- [x] Workbox `maxEntries` already 500 (Plan 2 fixed it) — no change needed
- [x] Workbox handler changed from `StaleWhileRevalidate` to `CacheFirst`
- [x] Buffer cache cleared on game-over → lobby transition (`narrator.dispose()`)

**Naming & Exemptions:**
- [x] Round-start files explicitly excluded from variant naming/resolution
- [x] Trailer lines explicitly excluded from variant system (separate export)
- [x] `intro` trigger: IN variant pool (3 variants), documented

**Type Safety:**
- [x] `NarratorTriggerId` union type derived from `NARRATOR_LINES`
- [x] `NarratorSelection` typed as `Record<string, number>` — keys match variant triggers

**Tests:**
- [x] Pool selection unit tests (seeded determinism, valid range, round-start exclusion)
- [x] Variant script integrity tests (V1 preservation, count consistency, sequential numbering, no duplicates)
- [x] Audio file existence tests (variant-1 .ogg for all triggers, round-start 1-15)
- [x] Phase group validation tests

**If Opus adopted:**
- [x] WAV → Opus conversion via ffmpeg (32kbps VBR, voip application profile)
- [x] All committed game audio files are `.ogg` (WAVs backed up in `assets/raw/audio/`, gitignored)
- [x] Audio file references updated from `.wav` to `.ogg`

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Script quality inconsistency across variants | High | Review every script before generation. Quality gate per variant. |
| TTS voice consistency across sessions | Medium | Same model + voice + direction prefix. Spot-check across batches. |
| API rate limit during generation | Low | Incremental batches, 2s delay, 3 sessions. |
| Audio file size bloat | Low | Lazy loading by phase. ~46MB total is acceptable for PWA. |
| Preload timing mismatch | Low | Only preload selected variants. Same memory footprint as V1. |

### Research Insights — Updated Risk Table

| Risk | Severity | Mitigation | Source |
|------|----------|------------|--------|
| Script quality inconsistency across variants | **High** | Review every script before generation. TTS QA pipeline: duration check, manual listen. | best-practices |
| **WAV file size bloat (46MB)** | **High** | Convert to Opus (~3.9MB). If not, at minimum increase SW cache limits. | perf, framework-docs |
| **Round-start naming collision** | **High** | Explicit exemption in code + documentation. Guard in resolver. | TS, pattern, spec-flow |
| **Partial deploy breaks all narrator audio** | **High** | Enforce atomic commit for steps 4-9 (rename + code changes). | arch, spec-flow |
| **Buffer cache memory leak across games** | **Medium** | Clear cache on game-over → lobby transition. Call `narrator.dispose()`. | perf, spec-flow |
| TTS voice consistency across sessions | **Medium** | Same model + voice + direction. Wire `VOICE_DIRECTION` into API call. Dec 2025 Gemini update added role adherence. | repo research, web search |
| **Host reconnection loses NarratorSelection** | **Medium** | Lazy selection fallback: if no selection when trigger fires, select on the spot. | spec-flow |
| **Partial generation state (variants 1-3 exist, pool selects 7)** | **Medium** | Variant-1 fallback on load failure. Never go silent. | spec-flow, arch |
| SW cache eviction (maxEntries: 100) | **Medium** | Increase to 300+. Switch to CacheFirst. | perf, spec-flow |
| API rate limit during generation | **Low** | 250 RPD allows single-session generation. 2s delay is sufficient. | framework-docs |
| Preload timing mismatch | **Low** | Selection must complete before first preloadPhase(). Document init order. | pattern, spec-flow |

---

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

### Research Insights — Updated Execution Order

**Atomic commit constraint:** Steps 4-9 must be ONE commit. Work them in order, but don't commit until all 6 are complete.

**Pre-implementation steps (add before step 1):**
- **Step 0a:** Update Workbox config — `maxEntries: 300`, `handler: 'CacheFirst'` in `vite.config.ts`
- **Step 0b:** Wire `VOICE_DIRECTION` into `generateOne()` in `generate-narrator.ts`
- **Step 0c:** (If Opus adopted) Add ffmpeg conversion step to generation pipeline

**Updated generation timeline:**
- Steps 10-12 collapse to a **single session** (~27 min at 250 RPD)
- If tiered variant counts adopted: ~12 min total

**Additional steps (add after step 9):**
- **Step 9a:** Add variant-1 fallback in `narrator.ts` `playNext()` — on load failure, retry with variant 1
- **Step 9b:** Add lazy selection in `narrator.ts` — if `enqueue()` called with no selection, auto-select
- **Step 9c:** Add buffer cache clearing in `narrator-bridge.ts` — call `narrator.dispose()` on game reset

---

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

### Research References (from deepening)
- [MDN — Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [MDN — Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)
- [MDN — PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [web.dev — Developing Game Audio with Web Audio API](https://web.dev/webaudio-games/)
- [Can I Use — Opus](https://caniuse.com/opus)
- [Opus Recommended Settings](https://wiki.xiph.org/Opus_Recommended_Settings)
- [Gemini TTS Speech Generation Docs](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini TTS Voice Consistency Forum](https://discuss.ai.google.dev/t/gemini-tts-voice-consistency/124172)
- [Gemini 2.5 TTS Improvements](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-2-5-text-to-speech/)
- [Chrome Developers — Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Vite PWA Plugin — Service Worker Precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [A Sound Effect — Game Audio Immersion & Anti-Repetition](https://www.asoundeffect.com/game-audio-immersion/)
