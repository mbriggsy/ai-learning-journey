---
title: "Origin Trailer — Phase 2: Voice Pipeline"
type: feat
phase: 2
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
---

# Phase 2 — Voice Pipeline

## Overview

Phase 2 produces the trailer's audio narration assets: every Dash line,
the cold-open speaker line, and (if R5 kept) the Dash-screams-Vera
beat. Output lands as WAV files at `videos/trailer/public/audio/` ready
for Phase 4 Remotion scene composition.

Phase 2 absorbs:

- The line set from BEAT-SHEET.md (Phase 1 Unit 1.2)
- The voice cast lock (Phase 1 Unit 1.3) — which engine + voice path
  per voice cell
- The cadence-spec from Phase 0 Unit 0.2 — steering input fed to the
  engine
- The Phase 0 Unit 0.2 winning path (A/B/C/D)
- The Phase 0 Unit 0.3 cold-open line lock
- The Phase 0 Unit 0.6 scream-outcome (kept-via-A / kept-via-B / cut)

Phase 2 produces:

- `videos/trailer/scripts/generate-dash-tts.ts` — the production TTS
  generator (descendant of Phase 0's `generate-tts-eval.ts`)
- `videos/trailer/scripts/script-lines.ts` — exports every line of
  narration as typed objects keyed by frame-cue
- `videos/trailer/public/audio/lines/` — one WAV per cue (per-line
  granularity, NOT one-monolithic-VO)
- `videos/trailer/sample-eval/voice-pipeline/` — duration validation,
  word-count reconciliation against BEAT-SHEET.md, signoff log
- The VOICE_DIRECTION anti-pattern guard codified inline at the API
  call site
- Audio post-processing applied (normalization, leading/trailing
  silence trim) so Phase 4 imports WAVs at predictable level + duration

Phase 2 exits when every BEAT-SHEET.md cue has a corresponding WAV
in `public/audio/lines/`, every WAV passes duration tolerance (±5%
vs Phase 1 budget), and Briggsy signs off on a full-runtime audio-
only playback (lines + intra-line beats stitched, no music, no video).

---

## Problem Frame

Phase 0 Unit 0.2 produced TTS evaluation WAVs for ~3 sample paragraphs
across multiple engine candidates. That run validated **whether a
path clears the cadence-match bar**. It did NOT produce trailer-ready
WAVs.

Phase 2 produces the trailer's actual audio. Differences from Phase 0
Unit 0.2:

- **Scale**: ~15 distinct line cues across 6 scenes (~216 words) vs
  Phase 0's 3 paragraph samples.
- **Engine + voice path locked**: Phase 2 generates against the single
  winning path from Phase 0 Unit 0.2, not the engine matrix.
- **Per-line granularity**: each cue produces its own WAV (not one
  monolithic VO). Phase 4 places each WAV at its assigned frame via
  `<Audio from={frame}>` or `<Sequence>` placement.
- **Post-processing**: normalization + silence-trim applied so WAVs
  land at predictable level + duration. The cadence-spec STEERING
  produces the *performance*; the post-processing produces the
  *technical* uniformity Phase 4 needs.
- **Anti-pattern hardening**: VOICE_DIRECTION guard codified
  permanently in source (inline comment) at the API call site;
  Phase 0 Unit 0.2 had the guard in eval-script, Phase 2 lifts it to
  production-script.

The largest risk Phase 2 manages: **drift between Phase 1's word-
count-pacing estimate and Phase 2's actual WAV duration.** Phase 1
estimates Dash speech at ~2.5 wps (deadpan pace). Phase 2 generates
the WAV; the actual duration may be ±10% off. If line durations drift,
Phase 4's frame-accurate scene composition breaks — either VO runs
past the scene boundary, or scene visuals run over silence. Phase 2
includes a reconciliation step: any line whose WAV duration deviates
>5% from Phase 1's budget triggers either (a) regeneration with
pacing-adjusted steering, (b) line-trim in Phase 1 (reopening the
beat sheet), or (c) frame-budget adjustment in Phase 1's `timing.ts`
(reopening scene boundaries — last resort).

---

## Critical Constraints Surfaced by Research

Cross-reference: roadmap §5, Phase 0 §Critical Constraints.

### Per-line WAV granularity, not monolithic VO

UMB v3 generated one WAV per narrator scene (~9 WAVs for 9 scenes).
BURNED's cascade alone has 8+ distinct cues with frame-accurate timing
requirements. **Per-line granularity** lets Phase 4 place each cue at
its exact frame via `<Audio from={frame}>` without depending on
total-WAV-duration alignment.

Trade-off: more WAV files (~15 vs UMB's 9). Mitigation: file naming
convention encodes scene + cue-frame (`s04-cue-1290.wav`) so Phase 4
imports are mechanical.

### VOICE_DIRECTION anti-pattern is a code-level guard, not a process

Per `feedback-narrator-voice-direction.md` (made twice): Gemini and
ElevenLabs and similar TTS engines READ ALL TEXT VERBATIM. A line
that includes "Dash, deadpan: ..." in the script body produces a WAV
where the voice literally says "Dash deadpan colon" before delivering
the line.

Phase 0 Unit 0.2 codified the inline guard at `generate-tts-eval.ts`.
Phase 2 reinforces:

- Same inline guard at `generate-dash-tts.ts` API call site
- Cadence-spec.md fed as the **steering payload** (engine-specific API
  surface — voice-settings for ElevenLabs, instruction-field for
  OpenAI, system-style for Gemini), NEVER prepended to the script
  text payload
- Code review of the API payload pattern: `parts.text` contains ONLY
  the line; cadence-spec lives in a separate API field

### Shell-injection safety rule for shell-out scripts

Node's `child_process.exec` / `execSync` interpolates strings through
the system shell — a known injection-vector class. Phase 2 scripts
shell out to FFmpeg + FFprobe. Project security rule: **use
`execFileSync` (synchronous variant of `execFile`)** with argv arrays,
NOT `execSync` with shell strings. This is the project-wide standard
per the security_reminder_hook guidance.

```ts
// ❌ WRONG — shell expansion + injection risk
import { execSync } from 'node:child_process';
execSync(`ffprobe -v error -show_entries format=duration "${file}"`);

// ✅ CORRECT — argv array, no shell
import { execFileSync } from 'node:child_process';
execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', file]);
```

All Phase 2 scripts use this pattern. Filenames in Phase 2 are
internally-generated (per SCRIPT_CUES) so injection risk is low even
under shell, but the pattern discipline matters — agents working on
the trailer should not learn `execSync` as the project style.

### Engine billing matters at production scale

Phase 0 Unit 0.2 capped engine-eval spend at $50. Phase 2 budget:

- **ElevenLabs**: ~216 words at $0.30/1000-chars (Creator tier) = ~$3
  per full run. With ~5 production runs (initial + 4 regen iterations
  for tolerance failures) = **~$15**.
- **Gemini 3.1 Flash TTS**: ~$0.075/1M-output-tokens, ~216 words ≈
  300 output tokens per line, ~15 lines ≈ **<$0.01** per run.
  Negligible at any iteration count.
- **OpenAI gpt-4o-mini-tts**: ~$15/1M-chars ≈ **$0.02 per run**.

Phase 2 budget: **$30 ceiling** for all production TTS generation +
regen iterations. (Cumulative with Phase 0 Unit 0.2's $50 cap = $80
across both phases — well within budget.)

If Path D (voice actor) won Phase 0 Unit 0.2, Phase 2 budget rolls
to whatever the actor's per-revision rate allows. Documented in the
fail-action ladder.

### Audio post-processing has a quality bar

Raw TTS output is rarely Phase-4-ready. Issues:

- **Volume inconsistency** across WAVs (some lines louder)
- **Leading/trailing silence** (engines often include 200–500ms of
  silence at clip boundaries)
- **Intra-line cadence** — natural pause points sometimes need to be
  TIGHTENED or EXTENDED to fit the cue frame

Phase 2 includes post-processing via FFmpeg (already in UMB workflow):

- `loudnorm` filter for loudness normalization (-23 LUFS target, per
  EBU R128 broadcast standard)
- `silenceremove` to trim leading/trailing silence to ≤50ms
- `afade` for 30ms fade-in / fade-out at boundaries (avoids click on
  cut-in)

### Brainstorm cut-handling for R5 propagates

If R5 was cut in Phase 0 Unit 0.6, Phase 2 does NOT generate the scream
WAV. Phase 1 Unit 1.3 outcome-matrix Row 4/5 documented this; Phase 2
reads the outcome and skips the generation. The S05 cue at frame 2400
becomes silent or hosts a chuckle SFX from the gameplay capture (Phase 5
deliverable).

---

## Requirements Trace

- **R4** (Dash sustained narration ~90% runtime): Unit 2.4 (Dash
  generation run); Unit 2.7 (verification — Phase 1 Unit 1.3 Step 4
  arithmetic re-validated against actual WAV durations).
- **R5** (Vera scream cameo, authentic or cut): Unit 2.6 (scream
  generation, conditional on Phase 0 Unit 0.6 outcome) — see Step 5
  inside Unit 2.4 + the intra-line beat note in Unit 2.6.
- **R6** (Pendleton vocabulary discipline): Unit 2.1 (line-set
  ingestion) re-runs the R6 grep before any API call; Phase 1 Unit
  1.2 grep is the upstream check, Phase 2 is the redundant audit.
- **R14** (cold-open speaker): Unit 2.4 cold-open cue.
- **R15** (on-screen text signal layer): not directly Phase 2 — but
  R15 stamps DO sometimes coincide with VO cues; Phase 2's cue
  timings inform Phase 3's R15 chrome animation timing.

---

## Key Technical Decisions

- **`generate-dash-tts.ts` is per-line, per-engine, idempotent.**
  Skips lines whose WAV exists (`--force` flag to overwrite).
  Mirrors UMB's `generate-narrator.ts` skip-if-exists default.
- **`script-lines.ts` is the single source of truth for line content
  + frame placement.** BEAT-SHEET.md is human-readable; `script-lines.ts`
  is machine-readable. The TTS generator reads from `script-lines.ts`.
  A `script-lines.test.ts` asserts the script lines match BEAT-SHEET.md
  body content (regex match) to prevent drift.
- **Per-line WAV naming convention**: `s{NN}-cue-{frame}-{voice}.wav`.
  Examples: `s01-cue-60-coldopen.wav`, `s04-cue-1950-dash.wav`. Phase 4
  scene files import by this exact name.
- **VOICE_DIRECTION inline guard codified at API call site**, identical
  to Phase 0 Unit 0.2 pattern, identical to UMB precedent:
  ```ts
  // CRITICAL: Send script text ONLY. The TTS engine reads ALL text verbatim.
  // NEVER prepend style/voice direction here — it will be spoken aloud.
  // Voice character comes from the engine's voice preset + steering payload,
  // NEVER from text injected at this call site.
  ```
- **Cadence-spec lives in the engine's steering API surface, never
  in script text.** Engine-specific routing:
  - ElevenLabs: `voice_settings` object + style controls (stability,
    similarity_boost, style, use_speaker_boost) + `previous_text` /
    `next_text` context-priming fields if available
  - Gemini 3.1 Flash TTS: `system_instruction` field with cadence-spec
    as natural-language style direction
  - OpenAI gpt-4o-mini-tts: `instructions` parameter with cadence-spec
  - Voice actor (Path D): cadence-spec is the casting brief; no API
- **All shell-outs use `execFileSync` with argv arrays**, never
  `execSync` with shell strings. Project-wide security convention
  enforced by `security_reminder_hook`.
- **Phase 2 reconciliation against Phase 1 is mandatory.** If any WAV
  duration drifts >5% from Phase 1's budget, the workflow STOPS and
  routes to one of (a) regenerate with pacing-adjusted steering, (b)
  Phase 1 line-trim, (c) Phase 1 frame-budget adjustment. **No silent
  drift accepted.**
- **Audio post-processing in FFmpeg via `loudnorm` filter**, target
  -23 LUFS (EBU R128 broadcast standard). Same default as
  professional film production.
- **All TTS API keys loaded via `.env`** before script execution.
  Per Briggsy autonomy rule (CLAUDE.md): script auto-loads `.env` via
  `import 'dotenv/config'` — does NOT ask Briggsy to run any shell
  preamble.

---

## Implementation Units

### Unit 2.1 — `script-lines.ts` Source of Truth

- [ ] **Unit 2.1: `script-lines.ts` Source of Truth**

**Goal:** Convert BEAT-SHEET.md's narration script into a typed
machine-readable module. Becomes the input contract for
`generate-dash-tts.ts` (Unit 2.2) and the placement contract for
Phase 4 scene files.

**Requirements:** R4, R5, R6, R14.

**Dependencies:** Phase 1 BEAT-SHEET.md signed off.

**Files:**

- Create: `videos/trailer/src/lib/script-lines.ts` — typed line array.
- Create: `videos/trailer/src/lib/script-lines.test.ts` — verifies
  line content matches BEAT-SHEET.md body.

**Approach:**

**Step 1 — Type definition.**

```ts
// videos/trailer/src/lib/script-lines.ts
export type Voice = 'dash' | 'cold-open-speaker' | 'dash-scream';

export interface ScriptCue {
  /** Scene number, 1–6. */
  scene: number;
  /** Frame at which the line begins (matches BEAT-SHEET.md cue frame). */
  startFrame: number;
  /** Voice cell for this cue. */
  voice: Voice;
  /** Verbatim line text. ZERO style direction. */
  text: string;
  /** Optional inline pause markers as frame counts. */
  beats?: Array<{ afterWord: number; frames: number }>;
  /** Filename token for the generated WAV. */
  filename: string; // e.g., 's04-cue-1950-dash.wav'
  /** Expected duration from Phase 1 Unit 1.2 estimate, in frames. */
  expectedFrames: number;
  /** Source citation for the line (BEAT-SHEET.md, Phase 1 Unit). */
  source: string;
}

export const SCRIPT_CUES: readonly ScriptCue[] = [
  // S01 — Cold Open
  {
    scene: 1,
    startFrame: 60,
    voice: 'cold-open-speaker',
    text: "He's a machine, this kid. Honestly at this point I'm just impressed.",
    filename: 's01-cue-60-coldopen.wav',
    expectedFrames: 132, // ~4.4s at 30fps
    source: 'BEAT-SHEET.md S01 / Phase 1 Unit 1.2 Step 2',
  },

  // S02 — Briefing Setup
  {
    scene: 2,
    startFrame: 240,
    voice: 'dash',
    text:
      "Good morning. The agency has decided you can be trusted with " +
      "Operation Pendleton. Code-name in the field: BURNED. Pull up a " +
      "chair. Try not to embarrass me.",
    filename: 's02-cue-240-dash.wav',
    expectedFrames: 351, // ~11.7s at 30fps
    source: 'BEAT-SHEET.md S02 / Phase 1 Unit 1.2 Step 3',
  },

  // S03 — Mission Background
  {
    scene: 3,
    startFrame: 600,
    voice: 'dash',
    text:
      "Our autonomous field assets infiltrated the contract last quarter. " +
      "Seven operatives in the active roster. Six expense reports, all " +
      "classified. One field agent who insists on being called 'Agent X' " +
      "and refuses to file any paperwork whatsoever.",
    filename: 's03-cue-600-dash.wav',
    expectedFrames: 240,
    source: 'BEAT-SHEET.md S03 / Phase 1 Unit 1.2 Step 4 (first line)',
  },
  {
    scene: 3,
    startFrame: 870,
    voice: 'dash',
    text:
      "Mission: a deck of one hundred and twenty operations. One of them " +
      "ends your career instantly. The rest exist to help you survive it. " +
      "Or to ensure your colleagues don't.",
    filename: 's03-cue-870-dash.wav',
    expectedFrames: 150,
    source: 'BEAT-SHEET.md S03 / Phase 1 Unit 1.2 Step 4 (second line)',
  },

  // S04 — Receipts Cascade
  {
    scene: 4,
    startFrame: 1080,
    voice: 'dash',
    text: 'Operational planning.',
    filename: 's04-cue-1080-dash.wav',
    expectedFrames: 18,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.5 Step 2',
  },
  {
    scene: 4,
    startFrame: 1110,
    voice: 'dash',
    text:
      "Fourteen thousand pages of forensic dossiers. Drafted on weekends. " +
      "By a field asset who, for compliance reasons, is not named in this briefing.",
    filename: 's04-cue-1110-dash.wav',
    expectedFrames: 174,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.5 Step 2',
  },
  {
    scene: 4,
    startFrame: 1290,
    voice: 'dash',
    text: 'Mission rehearsal: fourteen hundred and seven contingencies war-gamed.',
    filename: 's04-cue-1290-dash.wav',
    expectedFrames: 96,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.5 + Unit 1.6 finalist Stat 2',
  },
  {
    scene: 4,
    startFrame: 1410,
    voice: 'dash',
    text:
      "Six of them, deliberately unrehearsed. The agency calls those " +
      "the 'memorable ones.'",
    filename: 's04-cue-1410-dash.wav',
    expectedFrames: 120,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.6 Stat 2 companion',
  },
  {
    scene: 4,
    startFrame: 1560,
    voice: 'dash',
    text: 'Asset profile illustrations commissioned: seventeen. Two of them with hats.',
    filename: 's04-cue-1560-dash.wav',
    expectedFrames: 102,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.6 Stat 3',
  },
  {
    scene: 4,
    startFrame: 1680,
    voice: 'dash',
    text:
      "Operatives in the active roster: seven. Plus one who is, " +
      "technically, all of them. Don't ask.",
    filename: 's04-cue-1680-dash.wav',
    expectedFrames: 150,
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.6 Stat 4',
  },
  {
    scene: 4,
    startFrame: 1950,
    voice: 'dash',
    text:
      "The autonomous field assets, the forensic dossiers, the mission " +
      "rehearsal artifacts — they weren't preparing for the operation. " +
      "They WERE the operation.",
    beats: [
      // 0.6s beat after "operation" (first occurrence, word index 17)
      { afterWord: 17, frames: 18 },
    ],
    filename: 's04-cue-1950-dash.wav',
    expectedFrames: 108,  // ~3.0s line + 0.6s beat = ~3.6s
    source: 'BEAT-SHEET.md S04 / Phase 1 Unit 1.5 Step 2 (R3 stacked payoff)',
  },

  // S05 — Gameplay Dissolve
  {
    scene: 5,
    startFrame: 2280,
    voice: 'dash',
    text: "And — between you and me — they appear to be enjoying it.",
    filename: 's05-cue-2280-dash.wav',
    expectedFrames: 132,
    source: 'BEAT-SHEET.md S05 / Phase 1 Unit 1.2 Step 6',
  },
  {
    scene: 5,
    startFrame: 2400,
    voice: 'dash-scream',
    text: 'VERAAA!!!',
    filename: 's05-cue-2400-dash-scream.wav',
    expectedFrames: 45,
    source: 'BEAT-SHEET.md S05 / Phase 1 Unit 1.2 Step 6 (R5 contingent)',
  },

  // S06 — Closing Directive
  {
    scene: 6,
    startFrame: 2610,
    voice: 'dash',
    text:
      "That's the briefing. Operation Pendleton is now in your hands. " +
      "Try not to embarrass me.",
    filename: 's06-cue-2610-dash.wav',
    expectedFrames: 234,
    source: 'BEAT-SHEET.md S06 / Phase 1 Unit 1.2 Step 7',
  },
  {
    scene: 6,
    startFrame: 2790,
    voice: 'dash',
    text: '…Phrasing.',
    filename: 's06-cue-2790-dash.wav',
    expectedFrames: 12,
    source: 'BEAT-SHEET.md S06 / Phase 1 Unit 1.2 Step 7',
  },
] as const;
```

**Step 2 — Test scaffold.**

```ts
// videos/trailer/src/lib/script-lines.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCRIPT_CUES } from './script-lines';

describe('script-lines', () => {
  it('every cue text appears verbatim in BEAT-SHEET.md', () => {
    const beatSheet = readFileSync('BEAT-SHEET.md', 'utf-8');
    for (const cue of SCRIPT_CUES) {
      const normalized = cue.text.replace(/\s+/g, ' ').trim();
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped.split(' ').join('\\s+'));
      expect(pattern.test(beatSheet),
        `cue at frame ${cue.startFrame} text not found in BEAT-SHEET.md: "${normalized}"`)
        .toBe(true);
    }
  });

  it('no cue contains raw SDLC vocabulary (R6 check)', () => {
    const sdlcVocab = /\b(code|tests?|deploy|commits?|spec(s|ification)?|LLM|Claude|AI|prompt|chat|github|repo|build|stack|API|database)\b/i;
    for (const cue of SCRIPT_CUES) {
      // "Agent X" is permitted (in-character); strip before checking.
      const cleaned = cue.text.replace(/Agent X/g, '<EXEMPT>');
      const match = cleaned.match(sdlcVocab);
      expect(match,
        `cue at frame ${cue.startFrame} contains SDLC vocab "${match?.[0]}": "${cue.text}"`)
        .toBeNull();
    }
  });

  it('filenames are unique', () => {
    const names = SCRIPT_CUES.map((c) => c.filename);
    expect(new Set(names).size).toBe(names.length);
  });

  it('expectedFrames totals match Phase 1 Unit 1.3 Step 4 arithmetic', () => {
    const dashTotal = SCRIPT_CUES
      .filter((c) => c.voice === 'dash' || c.voice === 'dash-scream')
      .reduce((sum, c) => sum + c.expectedFrames, 0);
    const coldOpenTotal = SCRIPT_CUES
      .filter((c) => c.voice === 'cold-open-speaker')
      .reduce((sum, c) => sum + c.expectedFrames, 0);
    expect(dashTotal).toBeGreaterThan(2000);
    expect(coldOpenTotal).toBeGreaterThan(100);
  });
});
```

**Patterns to follow:**

- UMB v3 narrator-prompts.ts structure: cue objects + frame placement
- TypeScript `as const` for compile-time literal type narrowing

**Test scenarios:**

- **Happy path:** `pnpm test script-lines.test.ts` passes.
- **Happy path:** SCRIPT_CUES iterable + every cue has a unique filename.
- **R6 guard:** Test fails if any cue contains raw SDLC vocab.
- **Drift guard:** Test fails if a cue's text is edited without
  also updating BEAT-SHEET.md.

**Verification:**

- `script-lines.ts` typechecks clean.
- Test suite passes with 0 failures.
- `script-lines.ts` imported successfully by `generate-dash-tts.ts`
  (Unit 2.2).

---

### Unit 2.2 — `generate-dash-tts.ts` Production Script

- [ ] **Unit 2.2: `generate-dash-tts.ts` Production Script**

**Goal:** Build the production TTS generator that reads
`SCRIPT_CUES` from `script-lines.ts`, generates per-line WAVs via the
Phase-0-locked engine path, applies the cadence-spec as steering
payload (NEVER as prepended script text), writes to
`public/audio/lines/`, and skips lines whose WAV already exists.

**Requirements:** R4, R5 (conditional), R14, plus the
VOICE_DIRECTION anti-pattern guard (cross-cutting).

**Dependencies:** Unit 2.1 (`script-lines.ts`), Phase 0 Unit 0.2
results (engine + voice path), Phase 0 Unit 0.2 `cadence-spec.md`.

**Files:**

- Create: `videos/trailer/scripts/generate-dash-tts.ts` — the script.
- Create: `videos/trailer/scripts/tts-clients/elevenlabs.ts` (if R4
  winning path is ElevenLabs)
- Create: `videos/trailer/scripts/tts-clients/gemini.ts` (if Gemini)
- Create: `videos/trailer/scripts/tts-clients/openai.ts` (if OpenAI)
- Create: `videos/trailer/public/audio/lines/.gitkeep`
- Create: `videos/trailer/sample-eval/voice-pipeline/generation-log.md` —
  per-run log: which cues generated, which skipped (file existed),
  WAV durations, retry counts.

**Approach:**

**Step 1 — Skeleton (engine-agnostic loop).**

```ts
// videos/trailer/scripts/generate-dash-tts.ts
import 'dotenv/config'; // auto-load .env, per Briggsy autonomy rule
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';
import { generateForCue } from './tts-clients';

interface Args {
  force: boolean;
  dryRun: boolean;
  scene?: number;
  cueFrame?: number;
}

function parseArgs(): Args {
  // Minimal argparse — no external dep
  const args: Args = { force: false, dryRun: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--scene') args.scene = Number(process.argv[++i]);
    else if (a === '--cueFrame') args.cueFrame = Number(process.argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const outDir = 'videos/trailer/public/audio/lines';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const cadenceSpec = readFileSync(
    'videos/trailer/sample-eval/r4-dash/cadence-spec.md',
    'utf-8',
  );

  for (const cue of SCRIPT_CUES) {
    if (args.scene !== undefined && cue.scene !== args.scene) continue;
    if (args.cueFrame !== undefined && cue.startFrame !== args.cueFrame) continue;

    const outPath = join(outDir, cue.filename);
    if (existsSync(outPath) && !args.force) {
      console.log(`SKIP ${cue.filename} (exists; use --force to overwrite)`);
      continue;
    }

    if (args.dryRun) {
      console.log(`DRY-RUN would generate ${cue.filename}: "${cue.text}"`);
      continue;
    }

    console.log(`GEN  ${cue.filename}...`);
    // ─── CRITICAL: VOICE_DIRECTION ANTI-PATTERN GUARD ─────────────
    //
    // The Gemini / ElevenLabs / OpenAI TTS engines read ALL text in
    // the script-text payload verbatim. Style direction must NEVER be
    // prepended to cue.text. The cadenceSpec is the STEERING input,
    // delivered via the engine's voice-control / system-instruction /
    // instructions API surface — NEVER in the script-text payload.
    //
    // Violations of this guard cost UMB two production runs to detect
    // (per feedback-narrator-voice-direction.md, made TWICE before
    // codified). DO NOT remove this comment when editing this loop.
    // ──────────────────────────────────────────────────────────────
    const wavBuf = await generateForCue({
      text: cue.text,                 // raw text, NO direction prefix
      voice: cue.voice,
      cadenceSpec,                    // steering payload
      beats: cue.beats,               // Unit 2.6 may use this
    });
    writeFileSync(outPath, wavBuf);
    console.log(`OK   ${cue.filename} (${wavBuf.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step 2 — Per-engine client (ElevenLabs example, Path A or B).**

```ts
// videos/trailer/scripts/tts-clients/elevenlabs.ts
import { Buffer } from 'node:buffer';

const VOICE_IDS = {
  // Lock these from Phase 0 Unit 0.2 results
  dash: process.env.ELEVENLABS_DASH_VOICE_ID!,
  'cold-open-speaker': process.env.ELEVENLABS_COLD_OPEN_VOICE_ID!,
  'dash-scream': process.env.ELEVENLABS_DASH_VOICE_ID!, // same voice, expression tag
};

export async function generateElevenLabs(args: {
  text: string;
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  cadenceSpec: string;
  beats?: ReadonlyArray<{ afterWord: number; frames: number }>;
}): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set in .env');

  const voiceId = VOICE_IDS[args.voice];
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  // Apply scream expression tag for dash-scream voice
  // (this is engine-native, NOT prepended text direction)
  let scriptText = args.voice === 'dash-scream'
    ? `[scream]${args.text}[/scream]`
    : args.text;

  // Inline beat tags for intra-line pauses (engine-native; per Unit 2.6)
  if (args.beats && args.beats.length > 0) {
    const words = scriptText.split(/\s+/);
    for (const b of [...args.beats].sort((a, b) => b.afterWord - a.afterWord)) {
      const ms = Math.round((b.frames * 1000) / 30);
      words.splice(b.afterWord, 0, `[pause:${ms}ms]`);
    }
    scriptText = words.join(' ');
  }

  const body = {
    text: scriptText,
    // CADENCE-SPEC STEERING via voice_settings + style — NEVER in text
    voice_settings: {
      stability: 0.5,       // tuned per Phase 0 Unit 0.2
      similarity_boost: 0.75,
      style: 0.6,
      use_speaker_boost: true,
    },
    model_id: 'eleven_multilingual_v2',
  };

  // Retry with exponential backoff: 3 attempts, 1s/2s/4s
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth failure ${res.status}: ${await res.text()}`);
    }

    if (res.status === 429 || res.status >= 500) {
      console.warn(`ElevenLabs ${res.status}, retry ${attempt}/3 in ${2 ** (attempt - 1)}s`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      continue;
    }

    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  throw new Error('ElevenLabs retries exhausted');
}
```

**Gemini example (Path C engine):**

```ts
// videos/trailer/scripts/tts-clients/gemini.ts
import { GoogleGenAI } from '@google/genai';

const VOICE_PRESETS = {
  dash: 'Algenib',          // Phase 0 Unit 0.2 winning preset (placeholder)
  'cold-open-speaker': 'Alnilam',
  'dash-scream': 'Algenib',
};

export async function generateGemini(args: {
  text: string;
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  cadenceSpec: string;
}): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const ai = new GoogleGenAI({ apiKey });
  const voicePreset = VOICE_PRESETS[args.voice];

  // CADENCE-SPEC STEERING via system_instruction — NEVER in user text
  const systemInstruction = `
You are a TTS voice. Apply the following cadence specification when
delivering the user's text. Do NOT speak the specification itself —
deliver only the user's text in the specified cadence.

CADENCE SPECIFICATION:
${args.cadenceSpec}
  `.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-tts',
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voicePreset },
        },
      },
      systemInstruction,
    },
    contents: [{ role: 'user', parts: [{ text: args.text }] }],
  });

  const audioPart = response.candidates?.[0]?.content?.parts?.[0];
  if (!audioPart?.inlineData?.data) {
    throw new Error('Gemini returned no audio data');
  }

  return Buffer.from(audioPart.inlineData.data, 'base64');
}
```

**OpenAI example (Path C variant):**

```ts
// videos/trailer/scripts/tts-clients/openai.ts
import OpenAI from 'openai';

const VOICES = {
  dash: 'onyx',                  // Phase 0 Unit 0.2 winning preset
  'cold-open-speaker': 'shimmer',
  'dash-scream': 'onyx',
};

export async function generateOpenAI(args: {
  text: string;
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  cadenceSpec: string;
}): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');

  const openai = new OpenAI({ apiKey });

  // CADENCE-SPEC STEERING via instructions field — NEVER in text payload
  const instructions = `
Apply the following cadence specification when delivering the input text.
Do NOT speak the specification — deliver only the input text.

${args.cadenceSpec}
  `.trim();

  const mp3 = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: VOICES[args.voice],
    input: args.text,         // raw text — NO direction prepend
    instructions,             // cadence-spec lives here
    response_format: 'wav',
  });

  return Buffer.from(await mp3.arrayBuffer());
}
```

**Step 3 — `tts-clients/index.ts` engine dispatch.**

```ts
// videos/trailer/scripts/tts-clients/index.ts
import { generateElevenLabs } from './elevenlabs';
import { generateGemini } from './gemini';
import { generateOpenAI } from './openai';

const ENGINE = process.env.TTS_ENGINE ?? 'elevenlabs';

export async function generateForCue(args: {
  text: string;
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  cadenceSpec: string;
  beats?: ReadonlyArray<{ afterWord: number; frames: number }>;
}) {
  switch (ENGINE) {
    case 'elevenlabs': return generateElevenLabs(args);
    case 'gemini':     return generateGemini(args);
    case 'openai':     return generateOpenAI(args);
    default:           throw new Error(`Unknown TTS_ENGINE: ${ENGINE}`);
  }
}
```

**Step 4 — CLI invocation.**

`package.json` script:
```jsonc
{
  "scripts": {
    "tts": "tsx scripts/generate-dash-tts.ts",
    "tts:force": "tsx scripts/generate-dash-tts.ts --force",
    "tts:dry-run": "tsx scripts/generate-dash-tts.ts --dry-run"
  }
}
```

Invocation examples:
- `pnpm tts` — generate all missing WAVs
- `pnpm tts:force` — regenerate all
- `pnpm tts -- --scene 4` — only S04 cues
- `pnpm tts -- --cueFrame 1950` — only the stacked-payoff cue
- `pnpm tts:dry-run` — list what would generate

**Step 5 — Generation log.**

After each run, append to `sample-eval/voice-pipeline/generation-log.md`:

```md
## Run 2026-MM-DD HH:MM (ELEVENLABS / cadence-spec sha-abc123)
- s01-cue-60-coldopen.wav   GEN  4.2s  (expected 4.4s, -4.5%)
- s02-cue-240-dash.wav      GEN  11.8s (expected 11.7s, +0.9%)
- s03-cue-600-dash.wav      GEN  8.4s  (expected 8.0s, +5.0% — at tolerance)
...
- s04-cue-1950-dash.wav     SKIP (exists)
TOTAL: 14 generated, 1 skipped, 0 retried. $14 estimated spend.
```

**Patterns to follow:**

- UMB precedent: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
  (especially the VOICE_DIRECTION guard at lines 195–198)
- `dotenv/config` import — auto-loads `.env` without requiring shell preload
- Idempotent script + `--force` flag default

**Test scenarios:**

- **Happy path:** First invocation generates ~15 WAVs across all
  scenes; second invocation skips all (already exist).
- **Happy path:** `--scene 4` filters to S04 cues only.
- **Happy path:** `--dry-run` lists target WAVs without API calls.
- **Edge case:** Missing API key → fatal error with clear "Set
  ELEVENLABS_API_KEY in .env" message.
- **Edge case:** API 429 → 3-attempt retry with exponential backoff.
- **Edge case:** API 401/403 → fatal exit, no retry.
- **Anti-pattern guard:** Grep for `voice_direction` or
  `style:.*dash` or `\\[deadpan\\]` patterns prepended to text
  payloads. None found.

**Verification:**

- `generate-dash-tts.ts` exists and typechecks.
- Per-engine clients exist (only the Phase-0-winning one is wired;
  others stubbed).
- All ~15 WAVs land in `public/audio/lines/`.
- VOICE_DIRECTION guard comment block intact in source.
- Generation log filed per run.

---

### Unit 2.3 — Cadence-Spec Steering Integration (Canary Pass)

- [ ] **Unit 2.3: Cadence-Spec Steering Integration**

**Goal:** Validate that the cadence-spec from Phase 0 Unit 0.2
correctly steers per-engine voice settings such that the generated
production WAVs land in the same Sterling-coded register as the Phase
0 evaluation WAVs. **Canary one cue per voice cell BEFORE the full
generation run.**

**Requirements:** R4 (cadence consistency between eval and production).

**Dependencies:** Unit 2.2 (`generate-dash-tts.ts` builds), Phase 0
Unit 0.2 cadence-spec.md.

**Files:**

- Create: `videos/trailer/sample-eval/voice-pipeline/cadence-consistency.md` —
  validates that one production WAV per voice cell sounds in the same
  register as Phase 0 Unit 0.2 evaluation WAVs.

**Approach:**

**Step 1 — Generate canaries.**

```
pnpm tts -- --cueFrame 1950        # Dash: stacked-payoff line (most load-bearing)
pnpm tts -- --cueFrame 60          # Cold-open speaker
pnpm tts -- --cueFrame 2400        # Dash scream (if R5 kept)
```

Produces 1–3 canary WAVs depending on R5 outcome.

The stacked-payoff line (cue 1950) is the trailer's load-bearing
emotional beat — it carries R3's stacked payoff. If cadence drifts
here, the whole trailer fails. It is the right canary.

**Step 2 — A/B compare against Phase 0 eval WAVs.**

For each canary, listen against the Phase 0 Unit 0.2 reference WAV
from the same voice cell:

- Dash canary vs `sample-eval/r4-dash/{winning-engine}/sample-2-monologue.wav`
- Cold-open canary vs `sample-eval/r14-cold-open/clips/candidate-4.wav`
  (or whichever candidate cleared)
- Scream canary vs `sample-eval/r5-scream/path-{a,b}.wav` (whichever
  cleared)

Listening criteria:

- Same Sterling-coded register? (deadpan, mid-Atlantic, sardonic-lift)
- Same speaking pace? (within ±10% wps)
- Same volume range? (no compression or expansion artifacts)
- Same articulation? (no engine-default neutral pace creeping in)

If A/B match: cadence-spec steering works in production. ✓
If drift: route to fail-action ladder (Step 3).

**Step 3 — Fail-action ladder.**

- **Engine drifted cadence in production-style generation:** check
  whether the steering payload is being applied. Most likely cause:
  voice_settings / system_instruction / instructions field not wired
  correctly in the per-engine client. Debug in Unit 2.2.
- **Engine model version changed since Phase 0 Unit 0.2 (rare but
  possible at 2026 platform velocity):** lock the model version in
  the API call (e.g., `model: 'gpt-4o-mini-tts-2026-04-15'`).
- **Engine character drift (engine update silently shifted voice
  cadence):** Phase 0 Unit 0.2 cadence-spec.md re-spec required. May
  trigger Phase 0 re-run for the canary line if drift is large.
- **All paths drift:** Path D (voice actor) fallback. Phase 0 fail-
  action ladder Step 5 re-engages.

**Step 4 — Sign-off + proceed to full generation.**

When all canaries clear, `cadence-consistency.md` records sign-off:

```md
## Cadence Consistency Sign-Off — YYYY-MM-DD
- Dash canary (s04-cue-1950-dash.wav): A/B verdict <accepted/regen>
- Cold-open canary (s01-cue-60-coldopen.wav): A/B verdict <accepted/regen>
- Scream canary (s05-cue-2400-dash-scream.wav): A/B verdict <accepted/regen/skipped-R5-cut>
- Engine version pinned at: <model id>
- Listener: Briggsy
- Proceed to full generation: YES / NO
```

**Patterns to follow:**

- Phase 0 Unit 0.2 register-recognition cluster (deadpan / dry /
  mid-Atlantic / sardonic).
- A/B-compare protocol from `feedback-eye-in-loop-beats-calibration-for-motion.md`
  (eye-in-loop applies to ear-in-loop here too).

**Test scenarios:**

- **Happy path:** Each voice cell's canary A/B-matches the Phase 0
  eval reference within Briggsy's listener tolerance.
- **Edge case:** Engine model version pin reduces re-run risk after
  platform changes.
- **Anti-pattern guard:** Drift not silently accepted — STOP the
  workflow, route to Step 3 fail-action.

**Verification:**

- `cadence-consistency.md` records A/B verdict per voice cell.
- All canaries land in `public/audio/lines/`.
- Full generation proceeds ONLY after canaries cleared.

---

### Unit 2.4 — Full Generation Run + Duration Audit

- [ ] **Unit 2.4: Full Generation Run + Duration Audit**

**Goal:** Generate all ~15 WAVs in `public/audio/lines/` using
`pnpm tts:force`. Validate per-WAV duration against Phase 1 expected
frames. Route any >5% drift to Unit 2.7 reconciliation.

**Requirements:** R4, R5 (conditional), R14.

**Dependencies:** Unit 2.3 (canaries cleared).

**Files:**

- `videos/trailer/public/audio/lines/*.wav` — full set, ~15 files.
- Create: `videos/trailer/scripts/audit-durations.ts` — the audit script.
- Create: `videos/trailer/sample-eval/voice-pipeline/duration-reconciliation.md` —
  per-cue actual vs expected frame counts; drift table.

**Approach:**

**Step 1 — Generation.**

```
pnpm tts:force                    # full regeneration after canary pass
```

(`--force` ensures we regenerate ALL, including canaries, so the
final WAVs come from one consistent session.)

**Step 2 — Duration audit (`execFileSync` pattern).**

```ts
// videos/trailer/scripts/audit-durations.ts
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;
const TOLERANCE = 0.05;     // 5% drift acceptable for paced lines
const SCREAM_TOLERANCE = 0.20; // 20% drift acceptable for scream cue

function probeDuration(wavPath: string): number {
  // SAFE: argv array, no shell interpolation
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

const linesDir = 'videos/trailer/public/audio/lines';
const report: Array<{ filename: string; actual: number; expected: number; drift: number; flag: string }> = [];

for (const cue of SCRIPT_CUES) {
  const wav = join(linesDir, cue.filename);
  if (!existsSync(wav)) {
    console.warn(`MISS ${cue.filename}`);
    continue;
  }
  const seconds = probeDuration(wav);
  const actualFrames = Math.round(seconds * FPS);
  const expected = cue.expectedFrames;
  const drift = (actualFrames - expected) / expected;
  const tolerance = cue.voice === 'dash-scream' ? SCREAM_TOLERANCE : TOLERANCE;
  const flag = Math.abs(drift) > tolerance ? '!!' : 'OK';
  report.push({ filename: cue.filename, actual: actualFrames, expected, drift, flag });
  console.log(`${flag} ${cue.filename}: ${actualFrames}f (expected ${expected}f, ${(drift * 100).toFixed(1)}%)`);
}

// Emit drift-reconciliation.md content
const tableRows = report.map((r) =>
  `| \`${r.filename}\` | ${r.expected} | ${r.actual} | ${(r.drift * 100).toFixed(1)}% | ${r.flag} |`
).join('\n');
console.log(`\n## Drift table\n\n| Cue | Expected | Actual | Drift | Verdict |\n|-----|----------|--------|-------|---------|\n${tableRows}`);
```

**Step 3 — Drift routing.**

- **All cues within ±5% (scream within ±20%):** proceed to Unit 2.5
  (post-processing).
- **One cue drifts beyond tolerance:** route to Unit 2.7
  reconciliation.
- **Multiple cues drift in same direction:** likely systemic engine
  pacing mismatch with Phase 1's wps assumption. Fix the cadence-spec
  pace direction globally; regen all.

**Step 4 — Scream-cue special handling.**

The scream WAV is an expressive outburst, not a paced line. The audit
accepts ±20% drift for the scream cue. If the scream lands at 1.2s or
1.8s, that's fine — Phase 4 places it at frame 2400 and lets it ring
out within the gameplay-audio bed.

**Patterns to follow:**

- `execFileSync` with argv array (NOT `execSync` with shell string).
  Project-wide security convention.
- FFprobe for duration measurement — already in UMB workflow.

**Test scenarios:**

- **Happy path:** All 15 WAVs generate; duration audit passes.
- **Edge case:** Single-cue drift triggers regen with pacing
  adjustment; second regen lands within tolerance.
- **Edge case:** Persistent systemic drift triggers Phase 1 reopen
  + roadmap status update.
- **Error path:** Missing WAV in `public/audio/lines/` → audit warns;
  unit does not exit clean.
- **Security:** No shell-string interpolation in any FFprobe call.

**Verification:**

- All 15 (or 14 if R5 cut) WAVs in `public/audio/lines/`.
- `duration-reconciliation.md` documents drift table + verdict.
- Any drift beyond tolerance routed to Unit 2.7 fix.

---

### Unit 2.5 — Audio Post-Processing

- [ ] **Unit 2.5: Audio Post-Processing**

**Goal:** Apply EBU R128 loudness normalization (-23 LUFS) + silence-
trim + fade-in/fade-out to every WAV in `public/audio/lines/`. Output
overwrites the raw WAVs in-place (raw versions preserved in
`public/audio/lines/raw/` for fallback).

**Requirements:** Cross-cutting — every WAV must reach Phase 4 at
predictable loudness + boundary state.

**Dependencies:** Unit 2.4 (raw WAVs generated, durations validated).

**Files:**

- Create: `videos/trailer/scripts/post-process-tts.ts` — the FFmpeg
  wrapper.
- Create: `videos/trailer/public/audio/lines/raw/` — raw WAVs
  preserved.

**Approach:**

**Step 1 — Loudness normalization.**

FFmpeg `loudnorm` filter, EBU R128 standard:

- `I=-23`: integrated loudness target (broadcast standard)
- `LRA=7`: loudness range (allows dynamic delivery)
- `TP=-2`: true-peak ceiling (prevents clipping)
- `-ar 48000`: sample rate locked to 48 kHz (matches Phase 4
  video frame rate)
- `-c:a pcm_s16le`: uncompressed 16-bit PCM (Remotion-compatible)

**Step 2 — Silence trim.**

FFmpeg `silenceremove` filter removes leading + trailing silence
> -50dB (or -30dB for the scream cue specifically — preserves attack).

**Step 3 — Fade-in / fade-out.**

30ms `afade` at each end prevents click on cut-in / cut-out when
Phase 4 places the WAV at `<Audio from={frame}>`.

**Step 4 — Wrapper script (using `execFileSync`).**

```ts
// videos/trailer/scripts/post-process-tts.ts
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const linesDir = 'videos/trailer/public/audio/lines';
const rawDir = join(linesDir, 'raw');
if (!existsSync(rawDir)) mkdirSync(rawDir);

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

for (const cue of SCRIPT_CUES) {
  const final = join(linesDir, cue.filename);
  const raw = join(rawDir, cue.filename);

  if (!existsSync(final) && !existsSync(raw)) continue;
  // Preserve raw before in-place overwrite
  if (!existsSync(raw) && existsSync(final)) renameSync(final, raw);

  // Scream-cue retains attack — wider silenceremove threshold
  const isScream = cue.voice === 'dash-scream';
  const trimThreshold = isScream ? '-30dB' : '-50dB';

  // Probe raw duration so we can compute END for fade-out
  const rawDuration = probeDuration(raw);
  const fadeOutStart = Math.max(0, rawDuration - 0.03);

  const filter = [
    'loudnorm=I=-23:LRA=7:TP=-2',
    `silenceremove=start_periods=1:start_duration=0:start_threshold=${trimThreshold}:` +
      `stop_periods=1:stop_duration=0:stop_threshold=${trimThreshold}`,
    `afade=t=in:st=0:d=0.03`,
    `afade=t=out:st=${fadeOutStart}:d=0.03`,
  ].join(',');

  // SAFE: argv array — no shell interpolation
  execFileSync('ffmpeg', [
    '-y',
    '-i', raw,
    '-af', filter,
    '-ar', '48000',
    '-c:a', 'pcm_s16le',
    final,
  ]);

  console.log(`POST ${cue.filename}`);
}
```

**Step 5 — Post-process audit.**

After post-processing, re-run `audit-durations.ts`. Silence-trim may
shorten WAVs by 200–500ms — verify the new durations remain within
Phase 1 tolerance. (Note: post-processed durations REPLACE raw
durations as the source of truth for Phase 4 placement; see Unit 2.8
manifest generation.)

**Patterns to follow:**

- UMB v3 audio processing pipeline (Briggsy's narrator-cleanup
  workflow — verify against repo history).
- FFmpeg `loudnorm` single-pass (two-pass available if quality
  insufficient; trailer scale single-pass suffices).
- `execFileSync` argv pattern.

**Test scenarios:**

- **Happy path:** Every WAV emerges at -23 LUFS ± 1 LU.
- **Happy path:** No WAV has >50ms of leading silence after trim.
- **Edge case:** Scream WAV retains its attack (silenceremove
  threshold widened to -30dB).
- **Error path:** Missing raw WAV → script warns + skips that cue.
- **Security:** No shell-string interpolation in FFmpeg calls.

**Verification:**

- All ~15 WAVs in `public/audio/lines/` are post-processed.
- Raw versions preserved in `raw/`.
- Post-process audit confirms loudness + duration within tolerance.

---

### Unit 2.6 — Intra-Line Beat Handling

- [ ] **Unit 2.6: Intra-Line Beat Handling**

**Goal:** For cues with `beats[]` markers in SCRIPT_CUES (currently
only S04 cue 1950 — the stacked-payoff line with the 0.6s mid-line
beat), ensure the beat lands at the right place. Engine-specific
routing.

**Requirements:** R3 (stacked-payoff inner beat).

**Dependencies:** Unit 2.5 (base WAVs post-processed) — but for
ElevenLabs/Gemini paths, Unit 2.2 already handled the beat inline.
This unit is the verification + OpenAI fallback stitch.

**Files:**

- Create (OpenAI path only): `videos/trailer/scripts/stitch-beats.ts`
  — fallback stitch for engines without inline pause syntax.

**Approach:**

**Step 1 — Engine-routed beat handling.**

| Engine | Inline syntax | Method |
|--------|---------------|--------|
| ElevenLabs v3 | `[pause:600ms]` tag | Unit 2.2 elevenlabs.ts already inserts via `beats[]` argument; single WAV |
| Gemini 3.1 Flash TTS | SSML `<break time="600ms"/>` | Unit 2.2 gemini.ts inserts; single WAV |
| OpenAI gpt-4o-mini-tts | None | This unit's fallback stitch (Step 2) |
| Voice actor (Path D) | N/A | Direction in casting brief |

**Step 2 — OpenAI fallback stitch.**

If the Phase 0 winning path is OpenAI, beat handling falls to a
two-WAV stitch:

```ts
// videos/trailer/scripts/stitch-beats.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const linesDir = 'videos/trailer/public/audio/lines';

function makeSilence(durSec: number, outPath: string) {
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=mono:sample_rate=48000`,
    '-t', String(durSec),
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

function concatWavs(parts: string[], outPath: string) {
  // Build concat-list file
  const listPath = join(linesDir, 'temp-concat-list.txt');
  writeFileSync(listPath, parts.map((p) => `file '${p}'`).join('\n'));
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    outPath,
  ]);
}

// For OpenAI path: process cues with beats
const cuesWithBeats = SCRIPT_CUES.filter((c) => c.beats && c.beats.length > 0);
for (const cue of cuesWithBeats) {
  // Strategy: generate two halves via a Unit 2.2 helper that splits
  // text at the beat word index. Each half lands in public/audio/lines/
  // as `${cue.filename}.before` and `.after`. Concat with silence in
  // between to produce the final WAV.
  //
  // Specific implementation deferred to Phase 2 execution — depends on
  // which engine actually won Phase 0 Unit 0.2.
  console.log(`STITCH ${cue.filename}: ${cue.beats!.length} beat(s)`);
}
```

**Step 3 — Beat-position verification.**

Post-stitched WAV audit:
- Total duration matches expected (e.g., S04 1950: ~108 frames).
- The pause lands at the right syntactic position (between
  "operation." and "They") — verified by listening.

**Step 4 — Cross-path verification.**

Whichever path was used (inline tag or stitch), the resulting WAV
must:
- Match `cue.expectedFrames` ± 5%.
- Have audible silence inside the line at the beat position.
- Have no audible artifact at the join (no click, no level
  discontinuity).

**Patterns to follow:**

- ElevenLabs `[pause]` tag documentation.
- FFmpeg `concat` demuxer pattern with file list.
- Project security rule: `execFileSync` over `execSync`.

**Test scenarios:**

- **Happy path:** S04 cue 1950 WAV contains the 600ms beat at the
  correct position.
- **Happy path:** Engine-routed handling works without artifacts at
  the join points.
- **Edge case:** OpenAI path's two-WAV stitch joins cleanly via
  `-c copy` (sample-rate / bit-depth matched).
- **Error path:** If beat position can't be hit precisely (within
  ±15ms), regen with adjusted text-position or split into two cues
  in SCRIPT_CUES.
- **Security:** No shell-string interpolation.

**Verification:**

- S04 cue 1950 WAV exists with the intra-line beat.
- Duration matches expected (~108 frames).
- Beat position verified by listening.

---

### Unit 2.7 — Phase 1 Reconciliation (Final Pass)

- [ ] **Unit 2.7: Phase 1 Reconciliation (Final Pass)**

**Goal:** Verify every WAV's actual duration against Phase 1 scene
boundaries. If reconciliation forces a Phase 1 line-trim or timing.ts
update, apply it and re-sign-off BEAT-SHEET.md.

**Requirements:** R7 (90–100s total runtime).

**Dependencies:** Units 2.4, 2.5, 2.6 (all WAVs generated + processed
+ stitched).

**Files:**

- Edit (potentially): `videos/trailer/BEAT-SHEET.md`,
  `videos/trailer/src/lib/timing.ts`, `videos/trailer/src/lib/script-lines.ts`.
- Create: `videos/trailer/sample-eval/voice-pipeline/phase-1-reconciliation.md` —
  final accepted state. If Phase 1 reopened, document what changed.
- Create: `videos/trailer/scripts/stitch-full-audio.ts` — concatenates
  all cues at scene-frame positions for sign-off listening.
- Create: `videos/trailer/sample-eval/voice-pipeline/full-audio.wav` —
  the sign-off file.

**Approach:**

**Step 1 — Aggregate runtime check.**

Sum all WAV durations + intra-scene silence (Phase 1 budgeted) +
scene-transition coverage. Compare to TOTAL_FRAMES = 2850.

| Voice band | Total frames | Phase 1 budget | Drift |
|------------|--------------|----------------|-------|
| Cold-open speech | <measured> | 132 | <%> |
| Dash speech (excluding scream) | <measured> | ~2200 (estimate) | <%> |
| Dash scream | <measured> | 45 | <%> |
| Intra-scene silence + transitions | derived | derived | derived |
| **Total** | <measured> | **2850** | **<should be 0%>** |

If drift on total is within ±2% (±60 frames ≈ ±2s), it's accepted.
Phase 4 has small intra-scene flex to absorb.

If drift exceeds ±2%: route to Step 2 reconciliation.

**Step 2 — Reconciliation options (ordered by preference).**

1. **Phase 1 line-trim (preferred).** If a specific cue overran, trim
   1–3 words from cue.text in `script-lines.ts` + BEAT-SHEET.md. Re-gen
   only that cue (low cost).
2. **Phase 1 timing.ts adjustment.** Expand or contract a scene's
   frame budget. Done in `timing.ts`. Cascade-aware: if S04 expands
   by 60 frames, S05 contracts by 60 (so TOTAL_FRAMES stays 2850).
3. **TOTAL_FRAMES adjustment.** Last resort. Move from 2850 to 2820
   or 2880. R7 allows 90–100s (2700–3000 frames). Document in
   roadmap status update.

**Step 3 — Full-audio stitch for sign-off.**

```ts
// videos/trailer/scripts/stitch-full-audio.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;
const linesDir = 'videos/trailer/public/audio/lines';
const evalDir = 'videos/trailer/sample-eval/voice-pipeline';
if (!existsSync(evalDir)) mkdirSync(evalDir, { recursive: true });

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

function makeSilence(durSec: number, outPath: string) {
  if (durSec <= 0) return;
  // SAFE: argv array
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=channel_layout=mono:sample_rate=48000`,
    '-t', String(durSec.toFixed(3)),
    '-c:a', 'pcm_s16le',
    outPath,
  ]);
}

const concatList: string[] = [];
const tmpDir = join(evalDir, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

// Leading silence to startFrame of first cue
const firstCue = SCRIPT_CUES[0];
if (firstCue.startFrame > 0) {
  const leadSilence = join(tmpDir, 'lead.wav');
  makeSilence(firstCue.startFrame / FPS, leadSilence);
  concatList.push(`file '${leadSilence}'`);
}

let cursorFrame = firstCue.startFrame;
for (let i = 0; i < SCRIPT_CUES.length; i++) {
  const cue = SCRIPT_CUES[i];
  const wav = join(linesDir, cue.filename);
  if (!existsSync(wav)) { console.warn(`MISS ${cue.filename}`); continue; }
  concatList.push(`file '${wav}'`);
  const actualSec = probeDuration(wav);
  const actualFrames = Math.round(actualSec * FPS);
  cursorFrame += actualFrames;
  if (i < SCRIPT_CUES.length - 1) {
    const next = SCRIPT_CUES[i + 1];
    const gapFrames = next.startFrame - cursorFrame;
    if (gapFrames > 0) {
      const silencePath = join(tmpDir, `gap-${i}.wav`);
      makeSilence(gapFrames / FPS, silencePath);
      concatList.push(`file '${silencePath}'`);
      cursorFrame += gapFrames;
    }
  }
}

const listPath = join(tmpDir, 'concat-list.txt');
writeFileSync(listPath, concatList.join('\n'));
// SAFE: argv array
execFileSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', listPath,
  '-c', 'copy',
  join(evalDir, 'full-audio.wav'),
]);
console.log('OK full-audio.wav generated');
```

Output: `videos/trailer/sample-eval/voice-pipeline/full-audio.wav`.
Briggsy listens; signs off in `phase-1-reconciliation.md`.

**Step 4 — Sign-off recording.**

```md
## Phase 2 → Phase 1 Reconciliation — SIGNED OFF
Date: 2026-MM-DD
Total runtime: <measured>s (target 95.0s, drift <%>)
Lines regenerated due to drift: <list or "none">
BEAT-SHEET.md edits: <list or "none">
timing.ts edits: <list or "none">
Audio playback verdict (Briggsy): <accepted / rejected>
```

**Patterns to follow:**

- `feedback-stats-single-source.md` discipline applied to WAV
  durations.
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — ear-in-loop
  on audio sign-off.
- `execFileSync` argv pattern across all FFmpeg / FFprobe calls.

**Test scenarios:**

- **Happy path:** Total runtime drift within ±2%; no Phase 1 reopen.
- **Edge case:** S04 cue overrun → 2-word trim → regen → reconciled.
- **Edge case:** Persistent drift forces TOTAL_FRAMES adjustment;
  roadmap status updated.
- **Anti-pattern guard:** Drift not silently accepted — workflow
  STOPS at >2% drift, routes to reconciliation.

**Verification:**

- `full-audio.wav` exists for sign-off listen.
- `phase-1-reconciliation.md` documents final state.
- Briggsy signs off on the audio-only playback.

---

### Unit 2.8 — Asset Inventory + Phase 4 Hand-Off

- [ ] **Unit 2.8: Asset Inventory + Phase 4 Hand-Off**

**Goal:** Final inventory of all Phase 2 deliverables; export a
machine-readable manifest Phase 4 imports.

**Requirements:** Cross-cutting — Phase 4 needs to load WAVs by
filename + frame placement + actual duration.

**Dependencies:** Unit 2.7 (reconciliation signed off).

**Files:**

- Create: `videos/trailer/src/lib/audio-manifest.ts` — typed manifest
  Phase 4 imports.
- Create: `videos/trailer/scripts/generate-audio-manifest.ts` —
  re-runnable codegen.
- Create: `videos/trailer/sample-eval/voice-pipeline/asset-inventory.md` —
  human-readable inventory.

**Approach:**

**Step 1 — Audio manifest type.**

```ts
// videos/trailer/src/lib/audio-manifest.ts
export interface AudioAsset {
  /** Cue filename in public/audio/lines/. */
  filename: string;
  /** Static-file path consumable by Remotion staticFile(). */
  staticPath: string;
  /** Frame at which this audio enters. */
  startFrame: number;
  /** Measured frame duration (post-processed actual). */
  actualFrames: number;
  /** Voice cell. */
  voice: 'dash' | 'cold-open-speaker' | 'dash-scream';
  /** Original Phase 1 expected duration. */
  expectedFrames: number;
}

// Populated by generate-audio-manifest.ts post-Unit-2.7 reconciliation
export const AUDIO_ASSETS: readonly AudioAsset[] = [
  // codegen output appears here — see generate-audio-manifest.ts
] as const;
```

**Step 2 — Codegen script.**

```ts
// videos/trailer/scripts/generate-audio-manifest.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { SCRIPT_CUES } from '../src/lib/script-lines';

const FPS = 30;

function probeDuration(wavPath: string): number {
  // SAFE: argv array
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    wavPath,
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

const entries = SCRIPT_CUES.map((cue) => {
  const wav = `videos/trailer/public/audio/lines/${cue.filename}`;
  const seconds = probeDuration(wav);
  return {
    filename: cue.filename,
    staticPath: `audio/lines/${cue.filename}`,
    startFrame: cue.startFrame,
    actualFrames: Math.round(seconds * FPS),
    voice: cue.voice,
    expectedFrames: cue.expectedFrames,
  };
});

const tsBody = `
// AUTOGENERATED by scripts/generate-audio-manifest.ts — do not edit by hand.
import type { AudioAsset } from './audio-manifest-types';

export const AUDIO_ASSETS: readonly AudioAsset[] = ${JSON.stringify(entries, null, 2)} as const;
`.trim();

writeFileSync('videos/trailer/src/lib/audio-manifest.ts', tsBody + '\n');
console.log(`OK audio-manifest.ts generated with ${entries.length} entries`);
```

**Step 3 — Inventory checklist.**

```md
# Phase 2 Asset Inventory

## WAV files in public/audio/lines/
- [x] s01-cue-60-coldopen.wav         (cold-open speaker)
- [x] s02-cue-240-dash.wav            (Dash)
- [x] s03-cue-600-dash.wav            (Dash)
- [x] s03-cue-870-dash.wav            (Dash)
- [x] s04-cue-1080-dash.wav           (Dash)
- [x] s04-cue-1110-dash.wav           (Dash)
- [x] s04-cue-1290-dash.wav           (Dash)
- [x] s04-cue-1410-dash.wav           (Dash)
- [x] s04-cue-1560-dash.wav           (Dash)
- [x] s04-cue-1680-dash.wav           (Dash)
- [x] s04-cue-1950-dash.wav           (Dash, with intra-line beat)
- [x] s05-cue-2280-dash.wav           (Dash, sparse over gameplay)
- [x] s05-cue-2400-dash-scream.wav    (Dash, scream) ← OR omitted if R5 cut
- [x] s06-cue-2610-dash.wav           (Dash)
- [x] s06-cue-2790-dash.wav           (Dash, "Phrasing")

## Manifest exports
- [x] src/lib/script-lines.ts         (SCRIPT_CUES — source of truth)
- [x] src/lib/audio-manifest.ts       (AUDIO_ASSETS — Phase 4 import)

## Verification artifacts
- [x] sample-eval/voice-pipeline/generation-log.md
- [x] sample-eval/voice-pipeline/cadence-consistency.md
- [x] sample-eval/voice-pipeline/duration-reconciliation.md
- [x] sample-eval/voice-pipeline/phase-1-reconciliation.md
- [x] sample-eval/voice-pipeline/full-audio.wav         (sign-off listen)
- [x] sample-eval/voice-pipeline/asset-inventory.md     (this doc)

## Phase 4 hand-off
- Phase 4 scenes import AUDIO_ASSETS from src/lib/audio-manifest.ts
- Per-scene Audio placement uses startFrame + actualFrames
- All audio is post-processed (-23 LUFS, silence-trimmed, faded)
- No further audio processing needed in Phase 4 (volume only)
```

**Patterns to follow:**

- TypeScript codegen via `JSON.stringify` + `as const`.
- UMB v3 manifest pattern — verify against UMB's `src/lib/`.
- `execFileSync` argv pattern.

**Test scenarios:**

- **Happy path:** `audio-manifest.ts` typechecks; all 15 entries
  present (14 if R5 cut).
- **Happy path:** Inventory checklist all green.
- **Edge case:** R5 cut → no scream entry in AUDIO_ASSETS; manifest
  still typechecks.
- **Security:** Codegen script uses argv arrays for FFprobe.

**Verification:**

- `audio-manifest.ts` exists and is consumable by Phase 4 imports.
- `asset-inventory.md` exists.
- Phase 2 fully prepared for Phase 4 hand-off.

---

## System-Wide Impact

- **Interaction graph:** Phase 2 ingests Phase 0 cadence-spec + Phase 0
  engine path + Phase 1 BEAT-SHEET.md line set; produces audio assets
  + machine-readable manifest. Phase 4 imports `audio-manifest.ts` and
  places each cue per `<Audio from={startFrame}>` in scene files.
- **Error propagation:** Drift between WAV durations and Phase 1
  budget propagates upstream — either Phase 1 reopens (line-trim or
  timing.ts adjustment) or roadmap status flags TOTAL_FRAMES change.
- **State lifecycle risks:** `.env` API keys must be present.
  Generation runs are idempotent (skip-if-exists default); accidental
  re-run does not cost money. `--force` flag costs ~$0.30 per ElevenLabs
  full regen — capped well below Phase 2 budget.
- **API surface parity:** None — Phase 2 produces audio assets, not
  user-facing surfaces. Manifest is internal to the trailer project.
- **Integration coverage:** Phase 0 Unit 0.5 spike validated the
  `<Audio>` import + cross-dissolve audio behavior; Phase 4 inherits.
- **Unchanged invariants:** BURNED game code untouched. Phone bundle
  budget unaffected. Trailer project remains isolated.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Engine cadence drifts in production vs Phase 0 eval | Medium | High | Unit 2.3 canary A/B compare; model version pinning; re-spec cadence-spec.md if drift large. |
| Per-line WAV duration drifts >5% from Phase 1 budget | Medium | Medium | Unit 2.4 audit; Unit 2.7 reconciliation routes to regen or Phase 1 reopen. |
| FFmpeg post-processing destroys scream cue's attack | Medium | High (scream goes flat) | Unit 2.5 widens silenceremove threshold to -30dB for scream cue specifically. |
| OpenAI path's two-WAV stitch has audible artifact at join | Low | Medium | Unit 2.6 sample-rate + bit-depth matched + `-c copy` concat; if artifact appears, switch to engine with native pause tag (ElevenLabs / Gemini). |
| ElevenLabs API price increase mid-production | Low | Low | Phase 2 budget ceiling $30; well below alert threshold. |
| Engine version updates between Phase 0 + Phase 2 (drift) | Medium | High | Pin model version in API call. If pin not available, regen entire set if drift detected. |
| R5 cut after Unit 2.4 began | Low | Low | Skip scream cue; AUDIO_ASSETS reflects absence; no orphan WAV. |
| Cadence-spec.md is too generic for steering one of three engines | Medium | Medium | Per-engine cadence-spec adaptation may be required; Unit 2.3 surfaces this; engine-specific steering doc lives in `sample-eval/voice-pipeline/`. |
| Phase 1 reopen due to large drift forces beat-sheet rewrite | Low | High | Documented as Unit 2.7 reconciliation option; expectation set in Phase 1 risk table. |
| VOICE_DIRECTION anti-pattern reintroduced by future agent | Low (codified guard) | Very high (corrupts every WAV) | Inline guard comment in Unit 2.2 source; lint-grep follow-up optional. |
| `.env` not present at script invocation | Low | Low | Script throws on missing API key with clear "Set X in .env" message. |
| Shell-injection regression in FFmpeg invocations | Low (project-wide rule) | High (security) | All Phase 2 scripts use `execFileSync` with argv arrays; `security_reminder_hook` enforces the convention. |

---

## Open Questions

### Resolved During Planning

- **Per-line WAV granularity** confirmed (not monolithic).
- **Engine + voice path** locked from Phase 0 Unit 0.2 results.
- **Cadence-spec is steering input, never script-text prefix.** Per-engine
  routing locked (voice_settings / system_instruction / instructions).
- **Audio post-processing** locked at EBU R128 -23 LUFS with silence-
  trim + fade-in/fade-out.
- **Intra-line beat handling** routed per engine (ElevenLabs/Gemini
  inline tag, OpenAI two-WAV stitch, voice-actor direction-in-brief).
- **Phase 1 reconciliation discipline** — drift not silently accepted,
  Phase 1 reopens if necessary.
- **Shell-out security pattern** — `execFileSync` argv arrays
  throughout.

### Deferred to Implementation

- **Specific ElevenLabs voice_settings tuning** (stability / similarity
  / style values): Phase 0 Unit 0.2 chose engine + path; specific
  numeric values per voice may need re-tuning in Unit 2.3 canary
  comparison.
- **Whether scream cue uses ElevenLabs `[scream]` tag vs Path B hybrid
  (Voice Changer)**: Phase 0 Unit 0.6 outcome dictates; Phase 2 reads.
- **Whether to use ElevenLabs's `previous_text` / `next_text` context-
  priming fields** to improve flow between adjacent cues in the same
  scene: planning-phase nice-to-have; defer to Phase 2 execution.
- **Engine model version pinning specifics** (which exact dated model
  string): set at Phase 2 execution time; recorded in
  `sample-eval/voice-pipeline/engine-version.md`.
- **Whether full-audio.wav sign-off requires a second listener** (Briggsy
  alone vs Briggsy + one outside reviewer): default Briggsy alone;
  upgrade to two-listener if cadence quality is uncertain.

---

## Documentation / Operational Notes

- All Phase 2 artifacts land in `videos/trailer/public/audio/`,
  `videos/trailer/scripts/`, `videos/trailer/src/lib/`, and
  `videos/trailer/sample-eval/voice-pipeline/`.
- TTS API keys (Gemini, ElevenLabs, OpenAI) loaded via `.env` at
  BURNED project root. Script auto-loads via `dotenv/config` import.
- VOICE_DIRECTION inline guard comment lives in `generate-dash-tts.ts`
  main loop. Lint-grep candidate for follow-up audit (see Phase 0
  risk table).
- Cadence-spec.md is the canonical steering input; Phase 0 produced it,
  Phase 2 reads it. Edits to cadence-spec.md after Phase 0 sign-off
  require re-running Phase 2 canaries.
- Engine billing tracked via per-run cost log in
  `sample-eval/voice-pipeline/generation-log.md`. Budget hard stop at
  $30 (Phase 2 budget).
- All shell-out invocations use `execFileSync` with argv arrays per
  `security_reminder_hook` guidance. No `execSync` with shell strings.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)
- Phase 0 plan: [`docs/plans/origin-trailer/phase-0-gate-resolution.md`](./phase-0-gate-resolution.md)
- Phase 1 plan: [`docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`](./phase-1-beat-sheet-lock.md)
- Phase 0 cadence-spec output: `videos/trailer/sample-eval/r4-dash/cadence-spec.md`
- Phase 1 BEAT-SHEET: `videos/trailer/BEAT-SHEET.md`

**UMB v3 precedents:**
- Narrator generation script: `projects/undercover-mob-boss/scripts/generate-narrator.ts` (VOICE_DIRECTION guard at lines 195–198)
- Narrator prompts (line set structure): `projects/undercover-mob-boss/scripts/narrator-prompts.ts`
- Audio post-processing patterns: UMB's existing FFmpeg workflow (verify against project history)

**Engine API documentation:**
- ElevenLabs Text-to-Speech API: https://elevenlabs.io/docs/api-reference/text-to-speech
- ElevenLabs voice_settings + style controls: https://elevenlabs.io/docs/voices/voice-design
- ElevenLabs `[pause]` and expression tags: https://elevenlabs.io/docs/voices/expressive-tags
- Gemini 3.1 Flash TTS: https://ai.google.dev/gemini-api/docs/text-to-speech (April 2026 release)
- OpenAI gpt-4o-mini-tts: https://platform.openai.com/docs/guides/text-to-speech

**FFmpeg references:**
- loudnorm filter (EBU R128): https://ffmpeg.org/ffmpeg-filters.html#loudnorm
- silenceremove filter: https://ffmpeg.org/ffmpeg-filters.html#silenceremove
- afade filter: https://ffmpeg.org/ffmpeg-filters.html#afade
- concat demuxer: https://ffmpeg.org/ffmpeg-formats.html#concat

**Security references:**
- Node `child_process.execFile` (safer than exec): https://nodejs.org/api/child_process.html#child_processexecfilesyncfile-args-options
- OWASP command injection: https://owasp.org/www-community/attacks/Command_Injection

**Institutional learnings (memory):**
- `feedback-narrator-voice-direction.md` — VOICE_DIRECTION anti-pattern (CRITICAL — made TWICE before codified)
- `feedback-stats-single-source.md` — duration audit discipline (single source verified, not multiple)
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — ear-in-loop on audio sign-off
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
