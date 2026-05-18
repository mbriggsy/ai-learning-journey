---
title: "Origin Trailer — Phase 0: Gate Resolution"
type: feat
phase: 0
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-16
reviewed: 2026-05-17
status: active
---

# Phase 0 — Gate Resolution

## Overview

Phase 0 absorbs the brainstorm's five Resolve-Before-Planning gates as
the trailer's first buildable phase. Beat-sheet structure (Phase 1)
cannot lock until all five gates resolve. The two P0 gates — **R4
Dash TTS authenticity** and **R14 cold-open agentic-SDLC decode** — are
the trailer's largest individual risks; both must clear before
production-quality work begins.

Phase 0 produces:

- A working isolated Remotion 4.0.438 trailer project at
  `projects/burned/videos/trailer/`
- Five gate evaluations under `videos/trailer/sample-eval/` with
  documented outcomes (cleared / restructured / cut)
- A locked voice cast for Phase 1 beat-sheet structure
- A composite-viability-validated foundation for Phase 4 scene build
- A locked R14 cold-open line, locked R5 scream disposition, locked
  Archer-grammar transition primary

Phase 0 exits when every gate has a documented **disposition** and
the **five dispositions** (voice-cast / tone / composite-viability /
cold-open line / scream outcome) are recorded in
`videos/trailer/PHASE-0-EXIT.md`, whose template is locked at plan
time (see §**PHASE-0-EXIT.md template** at the tail of this document).

"Documented disposition" means one of three states:
- **cleared** — original gate intent landed, acceptance threshold cleared
- **restructured** — fail-action redirected to a documented alternative (Path B instead of A, non-Dash briefer instead of Dash, etc.)
- **cut** — gate intent abandoned, downstream phases re-scope around the absence

Phase 1 reads `PHASE-0-EXIT.md` to know which of the three each
disposition is — "all cleared" and "all dispositioned" are different
states and Phase 1's beat-sheet scaffolding branches on which.

**Exit semantics when Sub-phase 0a (Path D) is active:** voice-cast
disposition cannot finalize until Path D actor delivers (1-3 weeks) +
Unit 0.3 decode-eval runs on the actor recording (Unit 0.3 depends on
locked voice). During Sub-phase 0a, Phase 0 stays open; Phase 1
**voice-agnostic** structural work (scene count, scene order, cascade
composition, R15 chrome design) may proceed in parallel BUT Phase 1's
beat-sheet does NOT lock until PHASE-0-EXIT.md is complete. This
extends elapsed Phase 0 duration by 1-4 weeks when Sub-phase 0a fires.
Voice lock under Sub-phase 0a remains **provisional until Phase 6
N=6 cold-decode panel re-validates** — see Phase 6 ADR #21 + the
"Ceiling-band rollback" subsection in §4 Acceptance below.

**Unit ordering** (refined during deepening — supersedes naive
"parallel after 0.1" framing):

1. **Unit 0.1** — scaffold (entry point).
2. **Unit 0.2 Steps 0 / 0a / 0.5** — cadence-spec.md + account
   readiness + spec sanity check (no full engine matrix spend; Step
   0.5 uses one cheap Gemini-free-tier clip — see Step 0.5 below).
3. **Unit 0.5** — composite spike. **No TTS-engine-API dependency**
   (uses placeholder audio for crossfade test). May run in parallel
   with Steps 0/0a/0.5 once Step 0 cadence-spec **research** completes,
   but BEFORE Step 1.5 engine-adapter translation. Step 0.5's audio
   pre-flight is engine-light enough that 0.5 ∥ 0.5 doesn't block.
4. **Unit 0.2 Steps 1.5 / 2 / 3a / 3 / 4 / 5** — engine-adapter
   translation + engine matrix + hosting + MUSHRA + acceptance + fail
   ladder.
5. **Unit 0.6** — R5 scream eval (consumes Unit 0.2's Dash-voiced
   scream from Step 1 paragraph #3; outcome filters Unit 0.3's
   candidate pool).
6. **Unit 0.4** — tone gate (consumes the locked briefer voice from
   Unit 0.2).
7. **Unit 0.3** — R14 cold-open decode (consumes Unit 0.6's outcome to
   filter Vera from the candidate speaker pool if R5 is cut; consumes
   Unit 0.2's locked engine + voice).

Unit 0.6 lands BEFORE Unit 0.3. This is the brainstorm's stated
resolution order ("R5 evaluated first; if cut, Vera is removed from
R14's candidate set") carried forward into Phase 0 sequencing.

---

## Problem Frame

The brainstorm explicitly demands gates resolve before `/ce:plan` locks
structure. The brainstorm's Next Steps section reads: *"Resolve the
five 'Resolve Before Planning' gates first... These are gates, not
parallel work — they block beat-sheet structure. The two P0 gates are
the trailer's largest individual risks; both must clear before
production-quality work begins. Then `/ce:plan` for structured
implementation planning."*

This plan respects that constraint by making Phase 0 the gate
resolution phase rather than waiting for gates to resolve externally.
Each gate produces evidence under `videos/trailer/sample-eval/`. Each
gate has a documented fail-action ladder. The phase exits when all five
gates have a documented outcome.

---

## Critical Constraints Surfaced by Research

These constraints were not visible in the brainstorm but reshape Phase 0
work materially. Cross-reference: roadmap §5.

### Sterling-CODED, not Sterling-cloned (ADR #13, locked 2026-05-16)

**Design principle.** BURNED's visuals scream Archer without being
Archer (spec §3.6 names Bass, Ditko, Mad Men, OSS 117 etc. as
influences, never literal reproductions). **The voice follows the same
rule.** Mimicry of *style* (deadpan mid-Atlantic clip, sardonic lift,
deliberate pace, declarative falling intonation on punchlines); never
replication of *identity*.

This is the design choice. Unit 0.2's new **Step 0** characterizes
Benjamin's distinctive Sterling cadence as teachable specs and applies
those specs as TTS steering on ANY voice — preset, owned-clone, or
voice-actor. Acceptance is character-archetype recognition, not
actor recognition.

**Legal floor that aligns with this:**

- **ElevenLabs Prohibited Use Policy** (updated Sept 3 2025): forbids
  unauthorized impersonation including voice replication of any
  identifiable person without consent.
- **Tennessee ELVIS Act 2024**, **proposed federal NO FAKES Act**, **EU
  AI Act (Aug 2025 phased)**: classify unconsented voice clones of
  public figures as actionable / high-risk / illegal.
- **Right-of-publicity claims survive "satire" framing** for commercial
  content (a non-monetized trailer is still commercial-promotional).

**Operative rule:** No engine is asked to produce a recognizable
Benjamin / Sterling Archer voice. Engines steer to the cadence spec on
non-identifying voices.

### TTS budget envelope

Brainstorm says "$10 across both jobs" (R5-research-gate). Real-pricing-corrected
(May 2026 docs):

- **Real engine ceiling: ~$24** — ElevenLabs Creator $22/mo (100K
  chars; full eval burns ~30–40K chars including scream), Gemini 3.1
  Flash TTS ~$0.50–$1 for ~3 min audio across iteration (free tier
  covers initial experiments), OpenAI gpt-4o-mini-tts ~$0.45 for ~3
  min across iteration. **Pricing claims of $10 Gemini + $5 OpenAI in
  the brainstorm were ~10× over.**
- **$50 envelope retained as safety margin** for re-runs across all
  three paths, WebMUSHRA hosting overhead, and Voice Changer minute
  spend (Unit 0.6 Path B ≈ 25 chars per scream — negligible).
- **WebMUSHRA hosting:** $0 self-hosted (laptop + PHP + ngrok) OR $0
  via Cloudflare Pages subpath on existing `burned-cxa.pages.dev`
  plan (recommended — survives laptop-asleep) OR $4–6/mo VPS as
  fallback. See Unit 0.2 Step 3a.
- **$0–500 separate line item** for hybrid **Path D** voice-actor VO
  if Paths A/B/C fail (Path D is the hybrid path; the previous
  "Path C hybrid" naming was an artifact — Path C is the
  Gemini/OpenAI engine variant in the current ladder).

### Blind-tester protocol

Brainstorm says "≥2 testers, blind protocol." Research says MUSHRA
(ITU-R BS.1534-3) is the right shape; **6–8 listeners minimum** for an
informal voice-authenticity research pass.

### Design Locks Made at Phase 0 (Beyond Gate Resolution)

Phase 0's stated charter is gate resolution. In practice, the deepening
pass landed several **design locks** that exceed gate-clearing — they
are pre-locked so Unit 0.5's spike validates production-grade values
(not placeholders) and so downstream phases inherit a stable contract.
Surfacing them explicitly so the scope expansion is visible, not buried:

| Lock | What's locked | Why at Phase 0 (vs later) | Roadmap ADR |
|------|---------------|---------------------------|-------------|
| **BurnedDisplay = Clash Display variable woff2** | Existing BURNED face at `public/fonts/ClashDisplay-Variable.woff2`, weight 200–700 axis | Unit 0.5(c) spike validates the rendering pipeline against the *actual* production face. Using a placeholder would defeat the spike. | (inherits BURNED product spec; no trailer-specific ADR) |
| **Archer-grammar transition vocabulary** | Stamp-slap PRIMARY (scene-to-scene); iris-wipe FALLBACK (cold-open→Act-1 only); kinetic-typography CONSTRAINED to R11 goofy-stat overlays | Unit 0.5(e) spike validates all three render in pure Remotion; Phase 4 inherits the vocabulary set, doesn't re-decide | ADR #4 (revised — TransitionSeries removed; bare `<Series>` + scene-internal overlays) |
| **R15 chrome stamp minimum-spec** | Bottom-third placement; BURNED orange/teal (`--paper-signal-orange` / `--paper-ink`); Clash Display | Unit 0.3 cold-open spike uses production R15 specs so decode-eval tests structural design, not placeholder design | (Phase 3 owns final SVGs; Phase 0 locks the shape) |
| **VOICE_DIRECTION per-engine guard variants** | ElevenLabs bracket-tag-only / Gemini section-marker / OpenAI separate-parameter — codified at API call sites in `generate-tts-eval.ts` | Generalizes UMB's Gemini-only guard; mistake-prevention has been hit TWICE per `feedback-narrator-voice-direction.md` | (Unit 0.2 Test Scenarios — assertion tests, not just comments) |
| **Sterling-CODED, not Sterling-cloned** | Voice analog of Archer-CODED visual rule; mimicry of style, never replication of identity | Locked during deepening 2026-05-16; aligns design choice with ElevenLabs ToS + ELVIS Act + NO FAKES + EU AI Act legal floor | ADR #13 |
| **Unit ordering** | 0.1 → (0.2 Steps 0/0a/0.5 ∥ 0.5 spike post-Step-0-research) → 0.2 Steps 1.5/2/3a/3/4/5 → 0.6 → 0.4 → 0.3 | Unit 0.6 outcome filters Unit 0.3 candidate pool; Unit 0.4 consumes locked briefer voice; brainstorm-stated resolution order operationally enforced | (preface above) |

If a later-phase finding requires revisiting one of these locks, the
amendment route is: file a Phase 0 ADR-revision proposal in the
roadmap, re-validate the spike's affected integration point, update
PHASE-0-EXIT.md disposition entry. Locks are not silently editable.

### ADR Dependency Manifest

This plan was deepened 2026-05-16. ADRs landed **after** that date in
later-phase deepening (Phase 6 #19-23 + Phase 7 #24-29) may invalidate
references in this plan. Plan-time dependencies:

| ADR | Version source | Phase 0 consumer |
|-----|----------------|------------------|
| #4 | revised 2026-05-17 (Phase 1 deepening — TransitionSeries removed, bare `<Series>` + scene-internal overlays) | Unit 0.5(e) — vocabulary lock + spike rendering pattern |
| #6 | refined 2026-05-16 (Lottie on-demand, NOT pre-installed) | Unit 0.1 — package.json deps; Unit 0.5(e) — fallback only |
| #8 | 2026-05-16 (`setPublicDir('../../public')` for cross-package staticFile resolution) | Unit 0.1 — `remotion.config.ts`; Unit 0.5(c)+(d) — static asset paths |
| #11 | revised 2026-05-17 (matches #4 revision) | Unit 0.5(e) — composition pattern |
| #13 | locked 2026-05-16 (Sterling-CODED) | Unit 0.2 — entire R4 acceptance shape; Unit 0.3 — R14 line acceptance; Unit 0.6 — scream Path B framing |
| #15 | 2026-05-17 (Phase 3 deepening — `public/trailer/` subdirectory architecture) | Phase 3 dependency only; no Phase 0 consumer |

**Cross-phase consistency rule:** any later-phase ADR revision that
touches voice / audio / cadence / composite-spike vocabulary triggers
Phase 0 re-review before Phase 0 execution begins. New ADRs landing
after Phase 0 execution starts surface as a Phase-0-amendment proposal,
not a silent absorb. Specifically watch:
- ADR #21 (Phase 6 keyword-precision rule for R14 decode) — already
  propagated into Unit 0.3 Step 3 below.
- ADR #22 (sign-off ceremony with `.signoff` sentinels) — applies to
  PHASE-0-EXIT.md sign-off; codified in §PHASE-0-EXIT.md template.

---

## Requirements Trace

- **R3** (stacked-climax visual + audio reveal): Unit 0.5 (spike).
- **R4** (Dash sustained narration ~90% runtime): Unit 0.2 (gate).
- **R5** (Vera scream cameo, authentic or cut): Unit 0.6 (gate).
- **R6** (Pendleton vocabulary discipline): Unit 0.4 (tone gate
  validates whether played-straight thesis survives in
  Pendleton-vocabulary register).
- **R10** (HTP dossier hero in cascade): Unit 0.5 (spike validates
  Playwright capture pattern).
- **R14** (compressed-Archer cold-open + repeatability declaration):
  Unit 0.3 (gate).
- **R15** (on-screen text signal layer): Unit 0.5 (spike validates
  custom-font rendering in MP4 export).

---

## Key Technical Decisions

- **Trailer scaffold uses UMB v3's structure** as the precedent
  (`projects/undercover-mob-boss/videos/trailer/`) — same `package.json`
  shape, same `remotion.config.ts`, same `src/index.ts → Root.tsx →
  Composition` chain. Diff vs UMB: add `@remotion/media` for the new
  `<Audio>` API (per Phase 0 ADR #5). `@remotion/transitions` and
  `@remotion/lottie` are **NOT pre-installed** — Unit 0.5 spike
  validates the production patterns (bare `<Series>` + scene-internal
  overlays per ADR #4 revised) and installs only on-demand if a
  specific helper is needed (per roadmap ADR #4 + ADR #6).
- **`@remotion/skills` is a Claude Code skills artifact, NOT an npm
  dependency.** It's a GitHub repo (`github.com/remotion-dev/skills`)
  cloned into `~/.claude/skills/remotion/`. The npm registry returns
  404 for `@remotion/skills`. Install is a one-time global setup
  (operational preamble), not a per-project scaffold step. See
  Documentation / Operational Notes.
- **Phase 0 lives in `videos/trailer/sample-eval/` for evaluation
  artifacts, not in the main scenes directory.** The spike compositions
  (`SpikeComposition.tsx`, `SpikeS01.tsx`, `SpikeS02.tsx`) are throwaway
  — they exist to validate integration points, not to ship.
- **Sample-script discipline:** test paragraphs drawn from existing
  Dash copy (`ActRoster.tsx`, `ActArsenal.tsx`, `ActMission.tsx`), NOT
  invented in isolation. Tests character voice, not engine capability.
  Sources cited in Unit 0.2.
- **VOICE_DIRECTION anti-pattern guard — per-engine variants.** The
  generalized "send script text only" rule from UMB v3
  (`generate-narrator.ts:195–198`, which targeted Gemini) is correct
  in *spirit* across all engines but the *mechanism* is engine-specific
  in 2026. Codify three guard variants at the API call sites in
  `videos/trailer/scripts/generate-tts-eval.ts` (and later
  `generate-dash-tts.ts`):
  ```ts
  // ELEVENLABS: text payload may contain ONLY the script + sparse
  //   [bracket] audio tags interpreted by v3 (e.g., [shouts], [whispers]).
  //   Free prose mixed into the text gets read aloud verbatim.
  //   Cadence-spec maps to voice_settings numbers + sparse inline
  //   bracket tags + an (optional) Voice Design prompt to mint the
  //   voice — NEVER to free prose appended to the script payload.
  //
  // GEMINI 3.1 FLASH TTS: cadence-spec lives in the Director's Chair
  //   "Director's Notes" section of the prompt, ABOVE the Transcript
  //   section marker. The section markers (## DIRECTOR'S NOTES,
  //   ### TRANSCRIPT) are load-bearing — without them, the
  //   cadence-spec will be spoken aloud as part of the audio.
  //
  // OPENAI gpt-4o-mini-tts: cadence-spec goes in the `instructions`
  //   API parameter, NEVER in `input`. These are separate top-level
  //   fields and must stay that way. `input` is the script (≤4096 char
  //   limit). `instructions` has no published cap but observed
  //   steering prompts in OpenAI demos run 150–500 words; test
  //   cadence-spec at ~500 words first.
  ```
- **Cadence-spec-first.** Unit 0.2 begins with Step 0 — Benjamin
  Sterling cadence characterization. `cadence-spec.md` is the human-
  readable source of truth. Step 1.5 translates it into three
  engine-specific adapter files (`cadence-spec-elevenlabs.json`,
  `cadence-spec-gemini.md`, `cadence-spec-openai.md`) because each
  engine's steering surface accepts a different shape. Engines work
  on non-identifying voices (preset, owned-clone, voice-actor) —
  never on Benjamin audio.

---

## Implementation Units

### Unit 0.1 — Trailer Project Scaffold

- [x] **Unit 0.1: Trailer Project Scaffold**

**Goal:** Create the isolated Remotion 4.0.438 trailer package at
`projects/burned/videos/trailer/` so Phase 0 units 0.2–0.6 have a home.
Mirror UMB v3 structure exactly; the only Remotion-package diff is
`@remotion/media` for new `<Audio>` per Phase 0 ADR #5.
`@remotion/transitions` + `@remotion/lottie` are deliberately
on-demand (ADR #4 revised + ADR #6 refined — see Approach below).

**Requirements:** Foundation for all subsequent Phase 0 units.

**Dependencies:** None — this is the entry point.

**Files:**

- Create: `videos/trailer/package.json`
- Create: `videos/trailer/remotion.config.ts`
- Create: `videos/trailer/tsconfig.json`
- Create: `videos/trailer/.npmrc` — `ignore-workspace=true`. **Required**
  because BURNED's repo root carries `pnpm-workspace.yaml` (for the
  `onlyBuiltDependencies: sharp` allowlist). Without this `.npmrc`,
  `pnpm install` from `videos/trailer` is a silent no-op (pnpm walks up
  to the workspace root and finds no `packages:` entry covering this
  dir). Adding `videos/trailer` to the workspace `packages:` would
  break ADR #2's isolation invariant — `.npmrc` is the right knob.
  (Discovered during Unit 0.1 execution 2026-05-17; see
  `videos/trailer/sample-eval/scaffold-verification.md`.)
- Create: `videos/trailer/.gitignore` — **specific content required**:
  ```gitignore
  node_modules/
  out/
  # Sample-eval audio binaries — NEVER commit (privacy + repo bloat)
  sample-eval/**/*.wav
  sample-eval/**/*.mp3
  sample-eval/**/*.ogg
  sample-eval/**/*.m4a
  # Owned-voice source recording (Path B; security-sensitive)
  sample-eval/r5-scream/path-b-source-recording.*
  sample-eval/r4-dash/voice-clone-source.*
  # Rendered MP4 clips for listener-panel stimuli (pre-launch audio leak risk)
  sample-eval/**/clips/*.mp4
  # Allow markdown / JSON / yaml (eval protocols + adapter files + results)
  !sample-eval/**/*.md
  !sample-eval/**/*.json
  !sample-eval/**/*.yaml
  ```
  Rationale: WAV outputs (with Briggsy's processed voice on Path B
  and engine cadence-steering content) + rendered MP4 stimuli must not
  land in git history. Eval protocol/results files (markdown, JSON,
  YAML) stay tracked. See P1.21 / security-lens finding 2026-05-17.
- Create: `videos/trailer/src/index.ts` — registerRoot call
- Create: `videos/trailer/src/Root.tsx` — single placeholder `<Composition>`
- Create: `videos/trailer/src/hooks/useFonts.ts` — stubbed `useFonts()` (no fonts loaded yet)
- Create: `videos/trailer/sample-eval/.gitkeep` — directory placeholder
- Test: none — pure scaffolding unit, **Test expectation: none — scaffolding-only unit, no behavioral surface.**

**Approach:**

- `package.json` mirrors UMB but with BURNED-specific name and a
  trimmed dependency set. Two packages **deliberately excluded** per
  ADR #4 (revised 2026-05-17) and ADR #6 (refined 2026-05-16):
  - **`@remotion/lottie`** — install on-demand only if Unit 0.5(e)
    spike's stamp-slap OR iris-wipe fails in pure Remotion. ADR #6.
  - **`@remotion/transitions`** — install on-demand only if Unit
    0.5(e) needs `iris()` / `addSound()` primitives as overlay-
    component helpers. Phase 4 deepening REMOVED `TransitionSeries`
    across 15+ sections (R3 is a HARD CUT, not cross-dissolve);
    composition uses bare `<Series>` + scene-internal overlays. ADR #4.

  `render:final` is **NOT** added in Unit 0.1 — production encode flags (CRF 18 +
  `--x264-preset slow` + audio-bitrate 128K, per Phase 6 ADR #19 canonical lock) are
  a Phase 6 artifact that serves no Phase 0 gate. Phase 6's plan adds it when
  production encoding actually needs the configuration. (Phase 0 originally cited
  CRF 16; reconciled to CRF 18 per Phase 6 doc-review cross-phase amendment #1.)

  ```jsonc
  {
    "name": "burned-trailer",
    "version": "1.0.0",
    "description": "Origin trailer for BURNED — Remotion video project",
    "type": "module",
    "scripts": {
      "studio": "npx remotion studio src/index.ts",
      "render": "npx remotion render src/index.ts BurnedTrailer out/trailer-landscape.mp4 --codec h264 --crf 18",
      "render:thumbnail": "npx remotion still src/index.ts BurnedTrailer out/thumbnail.png --frame 450",
      "typecheck": "tsc --noEmit",
      "test": "vitest run",
      "check:tts": "tsx scripts/check-tts-readiness.ts"
    },
    "dependencies": {
      "remotion":             "4.0.438",
      "@remotion/cli":        "4.0.438",
      "@remotion/fonts":      "4.0.438",
      "@remotion/media":      "4.0.438",
      "react":     "^19.1.0",
      "react-dom": "^19.1.0"
    },
    "devDependencies": {
      "@types/react": "^19.1.0",
      "typescript":   "^5.9.3",
      "tsx":          "^4.20.0",
      "dotenv":       "^17.0.0",
      "vitest":       "^4.0.0"
    }
  }
  ```
  `tsx` runs the Step 0a `check-tts-readiness.ts` + the Step 2
  `generate-tts-eval.ts` scripts in a shell-agnostic way (no
  ts-node dependency, works on Windows + Unix). `dotenv` loads `.env`
  inside Node so we don't depend on bash `set -a && source .env`.
  `vitest` runs the VOICE_DIRECTION assertion tests + the
  `sample-script-dash.test.ts` line-range citation test.
  Encoder default math: Remotion 4.0.x already defaults
  `pixel-format=yuv420p` + `audio-codec=aac` + `x264-preset=medium`.
  Plan's `--codec h264 --crf 18` is functionally identical to the
  pure-default invocation; explicit flags document intent. All
  defaults are X/Twitter-mobile-decoder safe out of the box.
- `remotion.config.ts` is one import + one call:
  ```ts
  import { Config } from '@remotion/cli/config';
  Config.setPublicDir('../../public');
  ```
  Import is from `@remotion/cli/config` specifically — not from
  `@remotion/cli` or `remotion`. The `--public-dir` CLI flag would
  take precedence if passed; not used here.
- `tsconfig.json`: target ES2022, module ESNext, moduleResolution
  bundler, jsx react-jsx, strict, isolatedModules, noEmit.
- `src/Root.tsx` exports a single `<Composition id="BurnedTrailer"
  component={Placeholder} durationInFrames={150} fps={30} width={1920}
  height={1080} defaultProps={{}} />` so `pnpm studio` boots. (Adding
  `defaultProps={{}}` mirrors UMB and silences TS warnings when
  scenes start passing props.)
- **`@remotion/skills` install is operational preamble, NOT part of
  this unit.** It's a Claude Code skills artifact (GitHub repo,
  not npm). Documented in §Documentation / Operational Notes at
  the tail of this plan as a one-time setup. Unit 0.1 verification
  does NOT depend on skills install.

**Patterns to follow:**

- UMB v3 trailer scaffold — `projects/undercover-mob-boss/videos/trailer/`
- Briggsy CLAUDE.md "Autonomy" rule — load `.env` with `set -a && source
  .env && set +a` before any TTS script run.

**Verification:**

- `pnpm install` completes without errors. If `@remotion/cli` ffmpeg
  postinstall fails on Windows, rerun with `pnpm install --shamefully-hoist`
  (Remotion's bundled ffmpeg binary discovery occasionally needs flat
  node_modules on Windows). UMB v3 already ships on the same host so
  this is a low-risk known-resolution-path issue.
- `pnpm typecheck` (= `tsc --noEmit`) clean.
- `pnpm studio` boots, browser opens to studio preview, placeholder
  Composition renders blank 1920×1080 black.
- Directory tree matches UMB structure (visual inspection or `tree`
  command output captured to `sample-eval/scaffold-verification.md`).

---

### Unit 0.2 — R4 Dash TTS Cadence-Match Gate (P0)

- [ ] **Unit 0.2: R4 Dash TTS Cadence-Match Gate**

**Goal:** Determine whether a TTS path produces Sterling-CODED Dash
narration — deadpan mid-Atlantic clip, sardonic lift on terminal
syllables, deliberate pace, declarative falling intonation on punchlines
— that 6+ blind MUSHRA listeners parse as Archer-coded register
without it being a Benjamin clone. **Mimicry of style, not replication
of identity.** Mirrors BURNED's visual rule (Archer w/o being Archer).
This is the trailer's single largest risk; fail-action ladder routes
through four legal Paths A–D.

**Requirements:** R4 (Dash sustained narration ~90% runtime).

**Dependencies:** Unit 0.1 (scaffold).

**Pre-Execution Prerequisites (HARD BLOCK — verify BEFORE Step 0a).**

Current `.env` at BURNED project root contains only `GEMINI_API_KEY`,
`PLAYTEST_MODE`, `PLAYTEST_TOKEN`. Two additional engine accounts must
be set up + keys written to `.env` BEFORE Unit 0.2 can advance past
Step 0a. Step 0a's curl probes will return 401 on missing keys — this
is the documented failure mode, not a silent skip.

| Prerequisite | Owner | Verification |
|---|---|---|
| ElevenLabs **Creator** subscription active ($22/mo, 100K char allowance) — Paths A + B require this tier specifically (Voice Library commercial rights + Instant Voice Cloning). Free / Starter tier passes Step 0a auth probe but silently fails at Path A generation. | Briggsy | Step 0a's enhanced probe asserts `subscription.tier == "creator"` |
| `ELEVENLABS_API_KEY=<...>` written to `.env` at BURNED project root | Briggsy | Probe returns 200 + correct tier |
| OpenAI API key with billing enabled AND `gpt-4o-mini-tts` model access enabled (this is a separate enablement gate on some accounts) | Briggsy | Step 0a probe asserts `.data[] \| select(.id == "gpt-4o-mini-tts")` returns the model row, not empty |
| `OPENAI_API_KEY=<...>` written to `.env` | Briggsy | Probe returns 200 + model accessible |
| Gemini API key (already present in current `.env`) — verify still valid | Existing | Probe returns 200 |

If any prerequisite is missing when Unit 0.2 starts, the executor halts
at Step 0a with a Brief Memo to Briggsy listing the missing accounts +
expected setup time (ElevenLabs Creator activation ~10 min including
billing; OpenAI billing setup ~10 min; total prerequisite-setup window
~30 min). Unit 0.2 does not proceed to Step 1 with unsatisfied prereqs.

**Files:**

- Create: `videos/trailer/sample-eval/r4-dash/cadence-spec.md` —
  Benjamin Sterling cadence characterization as teachable specs
  (Step 0 output). Human-readable source-of-truth for the whole unit.
  Includes the three-band spectrum (Floor / Target Band / Ceiling).
- Create: `videos/trailer/sample-eval/r4-dash/account-readiness.md` —
  Step 0a output: per-engine API key + billing-tier verification.
- Create: `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json` —
  Step 1.5 output: voice_settings numbers + per-paragraph
  bracket-tag annotations + Voice Design prompt (if minting a new
  voice).
- Create: `videos/trailer/sample-eval/r4-dash/cadence-spec-gemini.md` —
  Step 1.5 output: Director's Chair structured prompt (Audio Profile
  + Scene + Director's Notes + Transcript) with section markers.
- Create: `videos/trailer/sample-eval/r4-dash/cadence-spec-openai.md` —
  Step 1.5 output: ~500-word instruction string for the
  `instructions` API parameter.
- Create: `videos/trailer/scripts/sample-script-dash.ts` — exports the
  three sample paragraphs (deadpan exposition + monologue ending in
  exasperation + isolated scream clip). Each paragraph is drawn from
  existing Dash copy in `src/client/howtoplay/`.
- Create: `videos/trailer/scripts/generate-tts-eval.ts` — engine
  comparison generator. Loads `.env`, walks the engine matrix, reads
  the engine-specific adapter file for steering, writes WAVs to
  `videos/trailer/sample-eval/r4-dash/{elevenlabs,gemini,openai}/`.
- Create: `videos/trailer/sample-eval/r4-dash/MUSHRA-protocol.md` — the
  listening protocol document tester receives. Includes anchor
  calibration step + practice trial + paragraph selection + session
  length budget.
- Create: `videos/trailer/sample-eval/r4-dash/hosting-decision.md` —
  Step 3a output: which hosting path chosen + setup notes.
- Create: `videos/trailer/sample-eval/r4-dash/results.md` — outcome
  documentation (which path cleared / which restructured / fail-action
  triggered).
- Test: `videos/trailer/scripts/sample-script-dash.test.ts` — verifies
  sample paragraphs are sourced from existing files (regex match against
  `src/client/howtoplay/acts/ActMission.tsx` + `ActRoster.tsx` content).
- Test: `videos/trailer/scripts/generate-tts-eval.test.ts` — verifies
  the three adapter files exist before any engine API call; verifies
  VOICE_DIRECTION guard comment block is present per-engine in source.

**Approach:**

**Step 0 — Benjamin Sterling Cadence Characterization Research.**
*Before any TTS work.* The goal is to convert Benjamin's distinctive
Sterling delivery into teachable specs an engine (or a voice actor)
can execute on a non-identifying voice. No Benjamin audio is uploaded
to any cloning engine; the research produces written cadence
specifications only.

Sources to consult (verify via primary materials, do not rely on
working memory):

- Voice-acting analyses of Benjamin's Sterling Archer delivery
  (YouTube essays, voice-coaching channels with linguistic breakdown)
- Wikipedia voice-acting profile (cadence/register notes — primary
  characterization)
- Fan-community deep-dive breakdowns (Reddit r/ArcherFX, r/voiceacting)
- Direct listening to publicly available primary audio (Archer cold-opens,
  interviews where Benjamin discusses his Sterling delivery)
- Phonetics literature on mid-Atlantic register (the deliberate
  non-regional American accent Sterling uses)
- Comparison points: sardonic-detective register in noir-narrator
  tradition (Rod Serling, Raymond Chandler audiobooks)

Specs to extract and document:

| Characteristic | What to capture |
|----------------|-----------------|
| **Pitch / register** | Mid-baritone, narrow range, doesn't break under emotional pressure (Sterling almost never raises pitch even when screaming) |
| **Pace** | Slightly slower than American conversational; deliberate, with measured pauses around key words |
| **Articulation** | Mid-Atlantic — clipped consonants, lengthened vowels on emphasis, slight nasal resonance |
| **Intonation contours** | Declarative falling intonation on punchlines (not the rising "valley girl" pattern); sardonic micro-lift on terminal syllables of dry observations |
| **Mannerisms** | Barely-audible exhale before / after lines reading as "I am exhausted by you specifically"; the dry-amused "hmm" beat; the comic-pause-then-deadpan-payoff timing |
| **Volume dynamics** | Compressed dynamic range in conversational reads; sudden hard volume jumps on screams (the "LANA!" mechanic) — Sterling-CODED screaming is volume-discontinuous, not pitch-discontinuous |
| **What NOT to encode** | Anything that would identify Benjamin specifically — a recognizable laugh signature, exact vowel placement on "Lana," etc. The spec is style abstraction, not impression mimicry. |

**Three-band spectrum shape (template, refined during Step 0 research).**

The plan REQUIRES the cadence-spec to use a three-band shape:
**Floor** (insufficient) / **Target Band** (success) / **Ceiling** (too
close). The content of each band is the deliverable of Step 0 research
— filled in once the cadence characterization completes against
primary sources. Use the table below as the **starting hypothesis**;
Step 0 may refine the band descriptions if the research surfaces
adjacent-register vocabulary the working hypothesis missed.

| Band | Starting-hypothesis listener descriptions | Disposition |
|------|------------------------------------|-------------|
| **Floor** (insufficient) | "generic narrator," "doesn't sound like anything in particular," "could be any audiobook" | Re-steer (the spec is too generic — tighten genre-anchor mannerisms) |
| **Target Band** (success) | "deadpan briefing voice," "spy register," "film-noir," "sardonic detective," "Archer-coded register," "briefing-room" | Pass |
| **Ceiling** (too close) | "this is impersonating Jon Benjamin," "this IS Sterling Archer," "trying to BE Archer" | Re-spec (strip identity-suggesting characteristics; re-run engine matrix) |

The Target Band is intentionally broad — Sterling-CODED register is a
cluster of adjacent registers (noir narrator, deadpan spy briefer,
sardonic detective) that all read as "Archer-coded" without being
"Archer impression." The Ceiling is the bound; listener-volunteered
actor recognition is the diagnostic signal (Step 4 bonus-signal +
disambiguation question).

**Step 0's deliverable refines or confirms this table.** If research
reveals additional Target-Band descriptors not in the starting
hypothesis, ADD them. If a starting-hypothesis descriptor turns out to
NOT be Sterling-coded, REMOVE it. The plan describes the shape (three
bands required, broad Target, listener-volunteered Ceiling); the
content is filled by the research.

Output: `cadence-spec.md`. Source document for every engine in Step
2 via the per-engine adapters built in Step 1.5. Cite every claim
against the source consulted; this is the proof-of-shape that
style-mimicry is the goal, not impression.

**Step 0a — Engine account readiness check.** Implemented as
`videos/trailer/scripts/check-tts-readiness.ts` (Node + dotenv +
fetch — **shell-agnostic by design**, works identically on Windows
PowerShell and Unix bash; auth headers never enter shell history).

```ts
// scripts/check-tts-readiness.ts (full source — execute via `pnpm tsx`)
import 'dotenv/config';
import { writeFileSync } from 'node:fs';

type Probe = { engine: string; ok: boolean; detail: string };

async function probeElevenLabs(): Promise<Probe> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { engine: 'elevenlabs', ok: false, detail: 'ELEVENLABS_API_KEY missing from .env' };
  // Auth + subscription_tier check
  const u = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } });
  if (!u.ok) return { engine: 'elevenlabs', ok: false, detail: `auth probe ${u.status}` };
  const body = await u.json();
  const tier = body?.subscription?.tier;
  if (tier !== 'creator') return { engine: 'elevenlabs', ok: false, detail: `tier=${tier} (need 'creator')` };
  // Real TTS endpoint probe (not just auth) — generate 10 chars on a default voice
  // Voice ID 21m00Tcm4TlvDq8ikWAM = 'Rachel', always available in Voice Library
  const tts = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello', model_id: 'eleven_v3' }),
  });
  if (!tts.ok) return { engine: 'elevenlabs', ok: false, detail: `tts endpoint ${tts.status}` };
  const bytes = await tts.arrayBuffer();
  if (bytes.byteLength < 1000) return { engine: 'elevenlabs', ok: false, detail: 'tts returned <1KB' };
  return { engine: 'elevenlabs', ok: true, detail: `tier=creator, tts ok (${bytes.byteLength} bytes)` };
}

async function probeOpenAI(): Promise<Probe> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { engine: 'openai', ok: false, detail: 'OPENAI_API_KEY missing from .env' };
  // Auth + model scope check
  const m = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  if (!m.ok) return { engine: 'openai', ok: false, detail: `auth probe ${m.status}` };
  const body = await m.json();
  const hasTTS = body?.data?.some((row: { id: string }) => row.id === 'gpt-4o-mini-tts');
  if (!hasTTS) return { engine: 'openai', ok: false, detail: 'gpt-4o-mini-tts not in model list (account scope missing)' };
  // Real TTS endpoint probe
  const tts = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', input: 'hello', voice: 'alloy' }),
  });
  if (!tts.ok) return { engine: 'openai', ok: false, detail: `tts endpoint ${tts.status}` };
  const bytes = await tts.arrayBuffer();
  if (bytes.byteLength < 1000) return { engine: 'openai', ok: false, detail: 'tts returned <1KB' };
  return { engine: 'openai', ok: true, detail: `model scope ok, tts ok (${bytes.byteLength} bytes)` };
}

async function probeGemini(): Promise<Probe> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { engine: 'gemini', ok: false, detail: 'GEMINI_API_KEY missing from .env' };
  // Verify the TTS-specific model is accessible
  const model = 'gemini-2.5-flash-preview-tts';
  const m = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`);
  if (!m.ok) return { engine: 'gemini', ok: false, detail: `model probe ${m.status} for ${model}` };
  // Real TTS endpoint probe — generateContent with TTS audio output requested
  const tts = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'hello' }] }],
      generationConfig: { responseModalities: ['AUDIO'] },
    }),
  });
  if (!tts.ok) return { engine: 'gemini', ok: false, detail: `tts endpoint ${tts.status}` };
  return { engine: 'gemini', ok: true, detail: `model ${model} ok, tts endpoint ok` };
}

async function main() {
  const results = await Promise.all([probeElevenLabs(), probeOpenAI(), probeGemini()]);
  // Initialize char-budget tracker at first successful probe
  const budget = { month: new Date().toISOString().slice(0, 7), elevenlabs_chars_used: 0, elevenlabs_chars_cap: 100_000, tripwire_50pct: false, tripwire_80pct: false };
  writeFileSync('sample-eval/r4-dash/char-budget.json', JSON.stringify(budget, null, 2));
  // Write readiness report
  const md = ['# Engine Account Readiness\n', `Probed: ${new Date().toISOString()}\n`,
    ...results.map(r => `- **${r.engine}**: ${r.ok ? 'OK' : 'FAIL'} — ${r.detail}`)].join('\n');
  writeFileSync('sample-eval/r4-dash/account-readiness.md', md);
  const failed = results.filter(r => !r.ok);
  if (failed.length) { console.error('FAIL:', failed); process.exit(1); }
  console.log('All engines ready. Char-budget tracker initialized.');
}
main();
```

**Key behaviors:**
- **Subscription/scope verification, not just auth.** ElevenLabs probe
  asserts `subscription.tier === 'creator'`; OpenAI probe asserts the
  `gpt-4o-mini-tts` model is in the account's model list.
- **Real TTS endpoint probes (P1.11).** Each engine generates 10 chars
  on a default voice and verifies actual audio bytes return. Auth + model
  listing don't catch service outages, voice-access gating, or regional
  restrictions. A 200 on `/v1/user` with broken TTS slips through; the
  full probe doesn't.
- **Char-budget tracker initialized (P1.12).** Writes
  `sample-eval/r4-dash/char-budget.json` with month + elevenlabs char
  count + tripwire flags. `generate-tts-eval.ts` (Step 2) reads this
  file before every API call and FAILS-FAST at the 80% threshold
  (80,000 chars) unless `ELEVENLABS_BUDGET_OVERRIDE=1` is set. At
  50,000 chars, the script writes a tripwire warning to
  `account-readiness.md` but does not halt. At 80,000 chars, it halts
  with a Brief Memo to Briggsy requiring explicit approval before more
  spend (typical scenario: adversarial re-spec iteration burning the
  monthly cap before a Path locks).
- **Shell-agnostic (P2.7).** Node + dotenv reads `.env` from BURNED
  project root regardless of Windows PowerShell or Unix bash. No
  `set -a && source .env` idiom; no `jq` dependency; no curl `-H` flag
  that puts keys in PSReadLine history (P2.10 —
  `%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`).
- **Invocation:** `pnpm tsx scripts/check-tts-readiness.ts` from
  `videos/trailer/` directory. Add `tsx` + `dotenv` to trailer's
  `devDependencies` (both are tiny, no runtime impact).

**Char-budget tripwire contract (referenced from Step 2 + Step 5):**
- ≤50,000 chars: green. Continue.
- 50,001–80,000: yellow. `account-readiness.md` flags the threshold;
  Step 2 keeps running but every adversarial re-spec round adds an
  explicit "Are we sure?" log line.
- 80,001+: red. `generate-tts-eval.ts` halts. Brief Memo to Briggsy:
  "ElevenLabs Creator monthly char cap at 80K; further spend may
  exhaust the 100K allowance before Step 5 fail-action escalations.
  Approve override OR wait for billing-cycle reset." Override mechanism:
  `ELEVENLABS_BUDGET_OVERRIDE=1 pnpm tsx scripts/generate-tts-eval.ts`.
- Hard cap: 100,000 chars (ElevenLabs Creator monthly). Auto-halt with
  no override — exhaustion would burn out billing cycle.

If any engine returns FAIL in the readiness probe, the executor halts
and routes to Pre-Execution Prerequisites above (account setup +
billing + .env writes). Step 0a only passes when all three engines
return OK with their FULL probes (auth + scope + endpoint reality).

**Step 0.5 — Audio pre-flight (BEFORE full engine matrix spend).**
The cadence-spec is the load-bearing input to every engine. If the
spec is bad, all three Paths fail because the steering is bad, not
because the engines are bad. The gate is a cheap **audio** validation,
not a markdown review — per `feedback-briggsy-reviews-output-not-process.md`,
Briggsy reviews output (a listenable WAV), not intermediate process
artifacts (a cadence-spec markdown). Hand-spec markdown review is
also susceptible to Archer-fan halo bias (two fans share cultural
memory and fill in spec gaps from priors).

**Procedure:**

1. **Generate one cheap audio clip from the spec.** Translate the
   working cadence-spec into the Gemini adapter shape (Director's
   Chair structured prompt — same shape Step 1.5 will produce, just
   one-off rather than the full three-engine matrix). Generate ONE
   15-second clip via Gemini 3.1 Flash TTS (free tier covers this —
   ~$0 cost) on a non-identifying mid-baritone male preset voice
   reading Sample Paragraph 1 (the 20s deadpan exposition trimmed to
   15s for the pre-flight). Output: `sample-eval/r4-dash/preflight/gemini-spec-test.wav`.
2. **Hand the WAV to two engineering peers — one Archer-fan, one cold.**
   - Reader A: Briggsy OR Harry (Archer-fan; validates Sterling-coded
     register is reachable from the spec).
   - Reader B: **one engineering-peer non-Archer-fan** (Discord
     contact who has NOT watched the show). Validates the spec
     produces an intelligible, in-genre delivery without Archer
     priors. **Do NOT use two Archer-fans** — correlated halo bias
     guarantees Yes votes even on thin specs (P1.2).
3. **Question (asked of each reader independently):** *"Listen to
   this clip. Does it land in the deadpan-spy / noir-narrator /
   sardonic-detective cluster? Does it sound like a Benjamin
   impression? Answer in your own words (~30 seconds)."*
4. **Acceptance:** Both readers must independently say *Yes,
   Target-Band cluster* AND *No, not a Benjamin impression* before
   Step 1.5 (the full three-engine adapter translation) begins.
5. **Tiebreaker / fail loop:**
   - **Split vote (one Yes, one No):** the No vote wins (P1.4 —
     thin-spec failure is the cheaper diagnostic; spend the 15-min
     spec revision rather than the full engine-matrix run). Claude
     revises the cadence-spec based on the No-vote reader's specific
     feedback (typically: tighten Target Band cluster vocabulary, add
     genre-anchor mannerisms, clarify Ceiling distinction). Re-run
     Step 0.5 with same readers OR fresh readers if the same readers
     are unavailable.
   - **Both No:** spec is too generic. Revise as above, re-run.
   - **Revision cap: 3 rounds.** After three Step-0.5 failures, the
     cadence-spec is treated as fundamentally unachievable in current
     form; surface to Briggsy as a **brainstorm-level question** (the
     played-straight Sterling-CODED thesis may need restructuring
     before Phase 1 — e.g., abandon Sterling-CODED for noir-narrator,
     OR accept synthetic-tinged register as a stylistic choice).
6. **SLA + interaction model (P1.1):**
   - **Reader A (Briggsy):** synchronous or async — Briggsy's call.
     Typical turn: same session.
   - **Reader B (Discord contact):** **async Discord thread**, 48-hour
     SLA from message-sent. Recruiter: Briggsy (his network).
     Fallback if no Discord cold-reader available within 48h: Harry
     can substitute as Reader A and Briggsy substitutes as Reader B
     (Briggsy's own engineering-peer perspective even though he's an
     Archer-fan), with explicit note in `account-readiness.md` that
     "Reader B was a degraded substitute; reduced confidence on
     cold-reader vector."
   - If neither cold-reader option is reachable within 48h: Step 0.5
     proceeds with Reader A only + explicit "single-reader fallback"
     flag in `results.md`. Step 1.5 is **gated on Step 0.5 sign-off**
     OR an explicit Briggsy override (`STEP_0_5_OVERRIDE=1` documented
     in `results.md`).

Output: `sample-eval/r4-dash/preflight/preflight-decision.md` (file
existence + contents are the sentinel Step 1.5 reads).

Cost: ~$0 (Gemini free tier) + 15-30 min × 2 readers. Saves: a full
engine-matrix re-run ($24 + 2-3 days) if the spec is the problem.

**Step 1.5 — Engine-adapter translation.** The cadence-spec.md is a
single human-readable artifact; each engine's steering surface
accepts a different shape. Translate the spec into three derivative
files before any engine generation:

| Engine | Adapter file | What it contains |
|--------|--------------|------------------|
| **ElevenLabs v3** | `cadence-spec-elevenlabs.json` | `voice_settings` numeric values (`stability`, `similarity_boost`, `style`, `use_speaker_boost`); v3 mode (`Creative` / `Natural` / `Robust`); per-paragraph bracket-tag annotations (`[deadpan]`, `[sarcastic]`, `[shouts]` etc.); optional Voice Design prompt for minting a new voice. ElevenLabs v3 does NOT accept long-form natural-language cadence-spec; it accepts numbers + sparse tags + one-shot Voice Design prompt. |
| **Gemini 3.1 Flash TTS** | `cadence-spec-gemini.md` | Director's Chair structured prompt with load-bearing section markers: `## AUDIO PROFILE`, `## SCENE`, `## DIRECTOR'S NOTES` (cadence-spec content lives here), `### TRANSCRIPT` (script lives here). 8K context window fits the full spec. |
| **OpenAI gpt-4o-mini-tts** | `cadence-spec-openai.md` | ~500-word instruction string distilled from cadence-spec.md, formatted for the `instructions` API parameter. Demonstrated steering prompts in OpenAI examples run 150–500 words; test cadence-spec at 500 first, chunk to 250-word focused-aspect prompts if longer prompts degrade. |

**Step 1 — Sample script.** Three paragraphs in `sample-script-dash.ts`,
each drawn from existing Dash copy (the brainstorm requires this — test
character voice, not engine). **All three voiced by Dash** — including
the scream (the screamer is Dash, the addressee is Vera, per Sterling
lore — corrects the "Vera target timbre" coherence bug that previously
appeared in Unit 0.6):

1. **20s deadpan exposition.** Adapted from `ActMission.tsx:30-34` +
   `ActMission.tsx:52-57` (M's voice rewritten in first-person Dash —
   lede + Beat II merged):
   > *"Good morning. You are reading this because somebody with my
   > clearance level — fine, **me** — decided you could be trusted with
   > a card game. The deck is a series of operations. One of them ends
   > your career instantly. The rest exist to help you survive it, or
   > to make sure your colleagues don't. Try not to make me look
   > foolish."*

2. **10s monologue ending in mild exasperation.** Adapted from
   `ActRoster.tsx:18-28` (the Dash entry — blurb at line 26, flourish
   at line 27, recast as first-person):
   > *"Pendleton's top-rated field operative. By which we mean I have
   > the highest expense report and survive most of it. Fluent in seven
   > languages, three of which are martini orders. Tell anyone you read
   > my file. I've been waiting. …Phrasing."*

3. **Isolated scream clip.** Single CAPS line, ~1.5 seconds, **Dash
   voice** (the screamer):
   > *"VERAAA!!!"*
   (Doubles as R5 scream candidate; see Unit 0.6 — Path A consumes
   this clip directly across all three engines.)

**Step 2 — Engine matrix.** Generate identical script across the three
engine candidates, **each engine reading its Step 1.5 adapter file**
(not cadence-spec.md verbatim — only Gemini + OpenAI accept natural-
language steering; ElevenLabs needs the JSON adapter). No engine
receives Benjamin audio; every engine works on a non-identifying
voice.

| Engine | Voice path | Cost estimate |
|--------|------------|---------------|
| **ElevenLabs v3** | **Path A** — pre-existing preset voice (mid-baritone male, deadpan-spy register) from ElevenLabs **Voice Library** (the generic catalog with commercial rights baked into the Creator plan). Steering via `cadence-spec-elevenlabs.json` (voice_settings numbers + inline bracket-tag annotations on the sample paragraphs + optional Voice Design prompt). The **Iconic Voice Marketplace** is for per-individual identity licensing (Michael Caine, John Wayne, etc., gated on rights-holder review) — NOT relevant for this generic-cadence use case. | ~$22 (Creator month, 100K char allowance) |
| **ElevenLabs v3** | **Path B** — Briggsy's owned voice cloned via **Instant Voice Cloning** (10s sample, full legal license since he owns it). Same steering via `cadence-spec-elevenlabs.json`. Recording conditions: cardioid mic, kill room reflections (closet / fabric-draped corner), peak around -12 dBFS, 15s neutral-text read trimmed to cleanest 10s. **Professional Voice Cloning eliminated** (would need 30-min recording session — schedule dependency removed; if Instant fails, Path B fails and ladder proceeds to Path C). **Path B IVC profile lifecycle** — see Step 2 §"Path B clone lifecycle" below. | (same Creator month, no extra cost) |
| **Gemini 3.1 Flash TTS** | **Path C-Gemini** — Steerable preset + **Director's Chair workflow** (Google AI Studio paradigm; the real surface name) with `cadence-spec-gemini.md` providing the structured prompt (Audio Profile + Scene + Director's Notes + Transcript). 8K context window fits the full spec. | ~$0.50–$1 (output tokens, ~3 min audio across iteration). Free tier covers initial experiments. |
| **OpenAI gpt-4o-mini-tts** | **Path C-OpenAI** — Steerable preset; `cadence-spec-openai.md` (~500 words) goes in the `instructions` API parameter; script goes in the separate `input` parameter (≤4096 char limit, comfortable for our paragraphs). | ~$0.45 (output audio tokens, ~3 min across iteration) |

**Path C invocation order** (resolves the previous "Path C engine
variant" ambiguity): Path C-Gemini runs first (free tier covers
initial experiments — cheapest cost). If Path C-Gemini fails, Path
C-OpenAI runs second. "Path C fail" in Step 5 means **BOTH** C-Gemini
AND C-OpenAI failed acceptance. Phase 2 voice-engine pipeline reads
the engine + voice ID + Path label from `PHASE-0-EXIT.md` and invokes
the single winning engine; Path C is never a runtime ambiguity, only
a Step 5 ladder label.

**Path B clone lifecycle (P2.25 + P2.28).** ElevenLabs Instant Voice
Clones persist on ElevenLabs' infrastructure indefinitely under the
Creator plan's default terms — ownership of source audio (Briggsy
owns his recording) does NOT auto-grant deletable-on-demand
retention. Before submitting the 10s Path B sample:
1. **Document IVC deletion-on-request procedure** under Creator tier.
   Verify the deletion UI works (test with a throwaway voice clone
   first) AND that ElevenLabs honors deletion as an API contract
   (not just a UI affordance). Record findings in
   `sample-eval/r4-dash/account-readiness.md`.
2. **If non-verifiably-deletable:** Path B requires explicit Briggsy
   acknowledgment of indefinite ElevenLabs retention before clone
   creation. Skip Path B if Briggsy declines the indefinite-retention
   risk. Ladder proceeds Path A → (skip B) → Path C.
3. **Post-Phase-0 cleanup:** If Path B is NOT selected as the winning
   path, delete the Briggsy voice clone from ElevenLabs within 7 days
   of Phase 0 exit. Verify deletion by API or UI. Record verification
   in `sample-eval/r4-dash/post-eval-cleanup.md`. If Path B IS selected,
   retention is documented as expected-behavior for the trailer's
   lifecycle; delete when the trailer is retired from active
   distribution.

**VOICE_DIRECTION anti-pattern guard codified at each engine's API
call site** with per-engine inline comments — see Key Technical
Decisions §VOICE_DIRECTION anti-pattern guard for the three guard
variants. Critical because the engines' steering boundary is
engine-specific: ElevenLabs interprets bracket tags inside the text
payload (free prose gets spoken aloud); Gemini deliberately mixes
steering + script in one prompt with section-marker discipline;
OpenAI cleanly separates `instructions` + `input` top-level fields.
The guards catch future agent edits.

**Step 3a — Hosting decision (BEFORE Step 2 generation begins).** The
WAV URLs in the WebMUSHRA YAML config are stable per-deployment; pick
the host first so URLs don't have to move. **The pre-deepening
"Cloudflare Pages subpath recommended" framing was wrong** — WebMUSHRA
submits results via PHP, and Cloudflare Pages is static-only with no
PHP runtime (P0.2). The corrected ranking:

1. **Cloudflare Tunnel from laptop** ($0, ~5min setup). **NEW DEFAULT.**
   Free `cloudflared` tunnel exposes `localhost:8000` (`php -S`) at a
   stable subdomain. PHP runs natively on Briggsy's local machine;
   `cloudflared` exposes it at an external URL listeners can reach
   from their browser. Result submission works end-to-end without
   extra plumbing. Trade-off: laptop must stay awake during the
   listening window. Mitigation: schedule listener sessions in
   batches (e.g., one 4-hour window where 4 listeners hit the panel
   consecutively); Briggsy is at the keyboard anyway for recruitment
   acks.
2. **Cloudflare Pages subpath + Worker results-bridge** ($0, ~30min
   setup). BURNED already deploys to `burned-cxa.pages.dev`. Add
   `/trailer-eval/` subpath serving the WebMUSHRA static assets +
   WAVs. WebMUSHRA's "send results to PHP" endpoint is replaced with
   a Cloudflare Worker that receives the form-POST and persists to
   Cloudflare D1 (free tier covers 25M reads / 50K writes per day,
   trivially over-provisioned for a 6-listener panel). Worker code is
   ~50 lines. Use this option if the laptop-awake constraint is
   unworkable for the listener pool's schedule. Survives laptop-
   asleep, permanent URL, supports mid-session-resume next day.
3. **VPS with PHP** ($4–6/mo, second fallback). DigitalOcean / Linode /
   Hetzner droplet running `php -S` behind nginx. Use if both above
   options fail for unforeseen reasons (Cloudflare account issues,
   tunnel restrictions on Briggsy's network).

**The pre-deepening "Cloudflare Pages subpath recommended" framing
silently lost listener data** — the recommended path served WebMUSHRA
static assets but had no PHP runtime, so the WebMUSHRA results-POST
would 404 and each listener's responses would be lost between session
end and Briggsy realizing the data wasn't captured. The corrected
ranking treats this failure mode as the load-bearing risk it actually
was.

**Access control (P1.22 — MANDATORY regardless of host choice).** The
WebMUSHRA panel must NOT be openly addressable at a guessable URL.
Whoever discovers the URL can vote-stuff rating data OR pull pre-launch
audio samples (Path B Briggsy-voice-clone + cold-open candidate lines).
Hardening:
1. **Non-guessable subpath:** generate a random 32-char token; URL
   becomes e.g. `/trailer-eval/<token>/` not `/trailer-eval/`.
2. **Per-listener token in WebMUSHRA URL.** Each listener gets a
   distinct token (e.g., `?listener=<8-char-token>`) recorded in
   `listener-roster.md`. Submitted results carry the token; any
   submission with an unrecognized token is discarded with an
   alert.
3. **Cloudflare Access (Option 2 only):** free-tier supports
   email-based one-time-PIN. Add an Access policy restricting
   `/trailer-eval/<token>/*` to specific listener emails. For
   Option 1 (tunnel), `cloudflared`'s Access integration provides
   the same control.
4. **Pollution recovery procedure:** if any rating submission with an
   unrecognized listener token appears in results — OR if listener
   responses spike beyond the roster's 6-8 expected sessions — the
   entire panel is discarded, the random token rotates, the URL
   re-distributes to the roster, and listeners re-run. Budget for
   one pollution-recovery cycle = $0 (no extra spend, just elapsed
   time).

**CSP path-override (P2.12 — MANDATORY for Option 2).** BURNED ships
`public/_headers` with `default-src 'self'; script-src 'self'; ...` —
strict policy that may reject WebMUSHRA's bundled JS (some WebMUSHRA
builds use inline event handlers). Add path-scoped override:
```
/trailer-eval/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self'; img-src 'self' data:
```
The `_headers` file is processed top-to-bottom with path-pattern
matches; the `/trailer-eval/*` block must precede the global `/*`
block. Test the WebMUSHRA static bundle under this policy before
listener panel begins — load the panel in a private window with
DevTools open and verify no CSP violations log. If WebMUSHRA needs
additional sources (e.g., a CDN audio path), add them to the
override list. The override is REMOVED from `_headers` after Phase
0 exits (or kept if other phases need it — Phase 7 may revisit).

**Hosting-decision deliverable:**
Document chosen option + setup steps + access-control + CSP-override
status in `hosting-decision.md`. If Option 1 (tunnel) is chosen, also
document the scheduled listener-session windows so the keyboard-
awake-during-windows constraint is operationally clear.

**Step 3 — MUSHRA listening protocol.** Document in `MUSHRA-protocol.md`.
The protocol is **register-recognition testing**, not actor-identity
testing, per ADR #13 (Sterling-CODED, not Sterling-cloned):

- **Stimuli:** 3–4 TTS candidates (one per engine path) + 1 low-quality
  anchor (band-limited TTS) + 1 baseline reference (a **NON-Benjamin
  Sterling-coded delivery**) used as the **cadence target**, NOT as
  an identity reference. The reference anchors the MUSHRA scale (rate
  it ~100); it's not what candidates are trying to clone.
- **Reference clip selection criteria (LOCKED at plan time per P1.20).**
  The ±10-point pass-band depends on this reference; selection cannot
  be deferred to implementation without leaving the gate's anchor
  unconstrained. Selection rules:
  1. Source: voices.com top-100-rated mid-baritone-male voice-actor
     portfolio reel OR voice123.com equivalent, with explicit
     "deadpan / spy / noir narrator / film-noir / sardonic detective"
     demo tagging in the actor's profile.
  2. Reel must be rated by ≥3 industry sources (voices.com reviews,
     Backstage profile, or actor's own portfolio testimonials) as
     standard-of-genre delivery — NOT a vanity recording or hobbyist
     reel.
  3. Independent of Briggsy's network — selected via marketplace
     search by Claude, candidate list of 3 reels reviewed by Briggsy
     AND by the Step 0.5 cold-reader (the non-Archer-fan engineering
     peer who validated the cadence-spec). Both must agree the
     finalist represents the Target Band cluster before lock.
  4. Documented in `MUSHRA-protocol.md` with: source URL, actor name
     + license/attribution, why this reel anchors the cluster, plus
     the 2 alternates considered.
  5. Lock the reference at Step 3a-equivalent timing — BEFORE
     stimulus order is finalized and listener panel begins.
- **Stimulus order — Latin-square design (P2.30).** "Randomized per
  listener" with N=6 covers <1% of possible orderings (6/720 = 0.83%);
  listener fatigue across slot-1 vs slot-6 creates systematic ordering
  bias. Replace with a 4×4 Latin square covering the 4 candidates +
  2 random orderings for the remaining 2 listeners. The low-quality
  anchor is presented FIRST for every listener (per ITU-R BS.1534-3
  calibration convention). Per-listener order assignment table is
  documented in `MUSHRA-protocol.md` and the WebMUSHRA YAML config is
  generated from that table (one YAML per listener if needed, or a
  pre-assigned token at session entry).
- **Listeners:** 6 minimum (8 target) for the FULL panel. Mix: 3+
  Archer fans (validates Sterling-coded register recognition) + 3+
  cold (validates that the voice works on engineering-peer baseline
  without Archer pre-loading). Briggsy's Discord network for
  recruitment (Harry et al.).
- **Sliding-ladder option (P1.14 — executor's call at Phase 0
  entry).** For a portfolio project where 3-week MUSHRA recruitment
  is the critical path blocking Phase 1, Briggsy may choose a
  sliding-ladder protocol instead of the N=6-floor default:
  - **Tier 1 (N=2):** Briggsy + Harry hear the candidates side-by-side
    in an ad-hoc session. If both agree the winner lands in Target
    Band cluster AND neither flags Ceiling (forced-choice probe still
    mandatory), the gate clears. Total elapsed: 1 hour.
  - **Tier 2 (N=4):** if Tier 1 produces split votes OR ambiguity,
    recruit 2 additional non-overlapping listeners (1 Archer-fan,
    1 cold). Re-run protocol. Threshold scales: ≥3 of 4 register
    cluster + ≥3 of 4 character-fit + no Ceiling triggers + joint-pass.
  - **Tier 3 (N=6, default):** if Tier 2 produces conflicting verdicts
    OR any Ceiling trigger, escalate to the full N=6 ITU-R BS.1534-3
    protocol with original thresholds (≥4/6 + ≥5/6 + joint-pass +
    ±10 MUSHRA naturalness).
  - **When to use sliding-ladder:** Briggsy's call at Phase 0 entry,
    documented in `MUSHRA-protocol.md` Section §"Listener count
    decision." Sliding-ladder trades research-grade rigor for
    execution velocity; appropriate for portfolio projects where
    calendar weeks dominate confidence-of-acceptance value. NOT
    appropriate if a downstream Phase 6 cold-decode panel would
    discover drift the sliding-ladder missed — in that case Phase 6
    re-spec cost dominates.
  - **Default is N=6.** Sliding-ladder is opt-in, not the default,
    because the portfolio-trailer-vs-research-paper trade-off is
    Briggsy's product decision and the manifesto's "time is the asset,
    not the constraint" rule favors rigor unless explicitly waived.
- **Recruitment flow (P2.16).** Specified before listener panel begins:
  1. **Recruitment message (Discord DM template):** Briggsy sends a
     templated message to each candidate listener with: session
     length (~25-30 min), what they'll hear (~6 short audio clips,
     ~15s each, in a deadpan-spy register), what they'll do (rate
     + describe each clip), scheduling window (Briggsy proposes 3
     candidate 30-min slots over the next 7 days), URL placeholder.
  2. **Listener confirmation:** Listener responds within 48h with
     selected slot. Briggsy records confirmation in `listener-roster.md`
     (per-listener: name, Archer-fan/cold flag, slot, URL token).
  3. **Pre-session reminder:** 1 hour before slot, Briggsy DMs the
     WebMUSHRA URL + token + reminder of session shape. Listener
     completes session in their browser within ~30 min.
  4. **Post-session ack:** Listener confirms completion via Discord
     ("done"); Briggsy verifies results landed in the WebMUSHRA
     backend (Cloudflare Worker D1 row OR localhost PHP results file
     per Step 3a hosting choice).
- **Consent + retention + privacy notice (P2.24).** Listeners are
  human subjects providing perception judgments — GDPR/CCPA-relevant
  personal data depending on listener jurisdiction. Required:
  1. **Consent form** (1-page) sent with the Discord recruitment DM:
     *"You'll listen to ~6 audio clips and provide ratings + open-
     text descriptions. Your responses (ratings, open text, optional
     name/handle for follow-up) will be retained for ~90 days after
     Phase 6 trailer release for evaluation analysis. You may
     withdraw consent and request deletion at any time. Responses
     are not published verbatim outside the BURNED development
     workspace."*
  2. Listener signals consent by clicking through an explicit
     "I agree" checkbox in the WebMUSHRA onboarding screen (NOT
     a buried ToS link).
  3. Retention: 90 days from Phase 6 trailer release date. After
     that, listener-identifying fields are stripped; ratings retained
     anonymized for institutional learning. Documented in
     `MUSHRA-protocol.md` and re-cited in PHASE-0-EXIT.md.
  4. Deletion request: any listener emailing/DMing Briggsy can request
     full removal; Briggsy deletes within 7 days and confirms.
- **Session UX (per ITU-R BS.1534-3 + WebMUSHRA conventions):**
  - **Onboarding screen** with consent checkbox + MUSHRA explanation
    + what "naturalness" means in this context (not "is it real" —
    "does it sound like a human deliberately recorded this, vs.
    synthetic / robotic").
  - **Practice trial** on a non-test script (use a generic
    voice-actor demo clip; not scored).
  - **Anchor calibration:** the low-quality anchor MUST be explicitly
    rated first; if listener rates it >40, prompt is shown again with
    "are you sure?" — anchor calibration grounds the scale.
  - **Paragraph selection:** use **only the 20s deadpan exposition
    clip** (Paragraph 1) for register-recognition + naturalness +
    character-fit questions. Reserve the scream clip for Unit 0.6's
    dedicated eval. Reserve the monologue clip for character-fit
    confirmation only (smaller question set). This prevents listener
    fatigue across 12+ judgments per stimulus.
  - **Session length budget:** target ≤25 minutes / listener, hard
    cap 35 minutes. Beyond that, fatigue degrades the open-text
    descriptions.
  - **Completion screen (P2.14).** End-of-session state: a confirmation
    screen reading *"Thank you — your responses have been recorded.
    You can close this tab now. Briggsy will follow up if any
    response needs clarification."* Triggers a final results-submit
    POST (idempotent — if listener refreshes, the submit fires once;
    duplicate submissions are deduplicated by listener token in the
    results backend). On submission failure (network glitch), the
    screen shows *"Your responses didn't save. Please retry, or
    message Briggsy in Discord if this persists"* with a Retry
    button. Responses persist locally in browser storage between
    stimuli until final submit (so closing the tab mid-session and
    re-entering with the same token resumes from last-rated stimulus).
- **Questions** (no actor-identity questions in the open form):
  - Per stimulus: *"Rate this clip's naturalness from 0–100."*
  - Per stimulus open: *"Describe this voice in your own words —
    register, tone, character archetype it suggests."* (Listening for
    Sterling-coded register cluster: *deadpan, dry, mid-Atlantic,
    sardonic, spy, detective, film-noir, Archer-coded, briefing-room*.
    NOT listening for actor names.)
  - Per stimulus character-fit: *"Does this voice match a fictional
    spy-agency briefer named Dash Barlowe, ~90% of trailer runtime?"*
    (Yes / No / Mixed)
  - Per stimulus uncanny-check: *"Does anything about this voice
    sound obviously synthetic or off?"* (Yes / No / free-text "if
    yes, what?")
  - **Forced-choice Ceiling probe (P1.15 — NEW, MANDATORY per
    stimulus, NOT conditional on volunteered recognition).** After
    the open-description + character-fit + uncanny-check questions,
    the protocol asks every listener directly per stimulus:
    *"Does this voice sound like any specific actor or character
    you can name? If yes, who, and how confident are you that it's
    them?"* with options: *No / Yes (low confidence) / Yes (med
    confidence) / Yes (high confidence)* + free-text "who?"
    - **Why mandatory:** engineering-peer listeners often don't
      volunteer "Jon Benjamin" / "Sterling Archer" in open
      description (politeness, vocabulary gap, no actor-name in
      working memory). Conditional follow-up depended on
      unprompted volunteering — Ceiling drift slipped through.
      Forced choice makes Ceiling detection a measurement, not a
      hope.
    - **Trigger:** ANY *Yes (med)* or *Yes (high)* response naming
      "Jon Benjamin" / "Sterling Archer" / "Archer" → **Ceiling
      band triggered** per Step 4 below.
    - **No / Yes (low):** does not trigger Ceiling. Low-confidence
      hits are noise — engineering peers may guess characters
      under prompt pressure even when the stimulus is non-specific.
  - **Bonus-signal disambiguation (conditional follow-up, RETAINED
    for open-form unprompted recognition):** if a listener invokes
    Archer/Sterling unprompted in any open response, the protocol
    shows a follow-up question:
    *"You mentioned Archer / Sterling — does this voice sound like
    the same ACTOR (you'd recognize the speaker), or the same
    STYLE (deadpan-spy register but a different voice)?"*
    *Same style* → register pass, target achieved. *Same actor* →
    flagged for Step 4 re-spec trigger.
- **Hosting:** WebMUSHRA on the platform chosen in Step 3a.

**Step 4 — Acceptance threshold.**

A candidate clears R4 IFF **all four individual gates pass AND the
joint-pass requirement is satisfied**:

- **Register cluster:** ≥4 of 6 listeners' open-description responses
  include ≥2 terms from the Sterling-coded register cluster (deadpan
  / dry / mid-Atlantic / sardonic / spy / detective / film-noir /
  Archer-coded / briefing-room).
- **Character-fit:** ≥5 of 6 listeners say *Yes* or *Mixed* on
  character-fit. (Tighter than the register-cluster gate because
  character-fit directly tests the trailer's brief; register-cluster
  tolerates phrasing variance, character-fit doesn't.)
- **Uncanny-check:** ≤1 of 6 listeners flag "obviously synthetic"
  with free-text capture of what sounded synthetic (engine artifact
  vs. cadence-spec problem vs. listener taste — triage at Step 5).
  Zero-of-6 is hair-trigger-brittle (any single false-positive kills
  a candidate); one-of-6 with diagnostic free-text is defensible.
- **MUSHRA naturalness:** within **±10 points** of the non-Benjamin
  Sterling-coded reference clip (reference-anchored, not an absolute
  threshold). Production TTS in 2024–2025 literature clusters
  65–85 MUSHRA against high-quality references — anchoring to our
  specific reference clip is the ITU-R BS.1534-3 convention and
  removes the floating-absolute problem.
- **Joint-pass:** ≥4 listeners must clear register-cluster AND
  character-fit AND not flag synthetic, **same listener across all
  three dimensions**. Without this, a candidate could pass each
  individual gate 4-of-6 with different 4s — meaning *no single
  listener* cleared all three for the same candidate. The joint
  pass ensures coherent endorsement.

**Bonus-signal disambiguation (Step 3's open-form unprompted recognition):**

- If 0 listeners volunteer Archer/Sterling unprompted → register
  pass, target achieved.
- If a listener volunteers Archer/Sterling AND the follow-up answer
  is *"same STYLE"* → register pass, target achieved (Sterling-coded
  cluster recognition is success).
- If a listener volunteers Archer/Sterling AND the follow-up answer
  is *"same ACTOR"* OR *"could be Jon Benjamin"* → **Ceiling band
  triggered** (see halt procedure below).

**Forced-choice Ceiling probe (Step 3's MANDATORY per-stimulus prompt):**

- ANY *Yes (med)* or *Yes (high)* response naming "Jon Benjamin" /
  "Sterling Archer" / "Archer" → **Ceiling band triggered**.
- *Yes (low)* OR *No* → no Ceiling trigger.

**Ceiling-band halt procedure (P1.16 — MANDATORY).**

When Ceiling band triggers (either via bonus-signal or forced-choice
probe), the candidate is DISQUALIFIED for voice-cast lock. Procedure:

1. **Do NOT lock this candidate** under any disposition (cleared /
   restructured / cut). The candidate is dead for Phase 0.
2. **Step 5 re-spec triggers** — strip identity-suggesting
   characteristics from `cadence-spec.md` (typically: remove any
   mannerism that recapitulates Benjamin's specific vowel placement,
   laugh signature, or rhythmic tic; tighten the "What NOT to encode"
   row of the cadence-spec table).
3. **Spec-revision cap: 3 rounds.** After three Step-4 Ceiling-trigger
   failures, the cadence-spec is treated as fundamentally unachievable
   at the Sterling-CODED bar with the legal floor intact. Surface
   to Briggsy as a **brainstorm-level question** routing to Step 5's
   Brainstorm-Restructure Memo (the played-straight Sterling-CODED
   thesis may need to ship synthetic-tinged OR pivot form factor —
   see Step 5 Options (i)/(iv)).
4. **PHASE-0-EXIT.md template records the Ceiling history.** New
   fields: `Ceiling-band triggered: [Y/N]`, `Re-spec iterations: [N]`,
   `Final disposition cleared after re-spec: [Y/N]`. See template
   below.
5. **Listener follow-up:** any listener whose response triggered
   Ceiling gets a personal Discord ack from Briggsy: "Thanks — you
   spotted what we were testing for. We're re-running with adjusted
   spec." No data is silently discarded.

**Voice lock is PROVISIONAL until Phase 6 (P0.3 — load-bearing).**

Even when Phase 0 Step 4 clears (all four individual gates + joint-pass
+ no Ceiling trigger), the locked voice is **not absolute** — Phase 6
runs a separate **N=6 cold-decode panel** (ADR #21) with fresh listeners
who have NOT participated in Phase 0. If Phase 6's panel volunteers
"that's Archer" / "this IS Sterling" (Ceiling drift slipping through
Phase 0's listener priors), the voice lock is invalidated mid-Phase-6.

**Rollback contract:**

- **Phase 0 disposition** records `Voice lock provisional: Y` —
  Phase 6 N=6 cold-decode panel must re-validate before disposition
  becomes final.
- **Phase 4-entry mini-cold-decode (NEW, optional but recommended).**
  Before Phase 4 commits scenes to rendering, run a 2-listener
  cold-decode mini-panel on a single ~20s rendered scene with the
  locked voice. Cheaper than waiting for Phase 6 to discover drift.
  If mini-panel volunteers Ceiling, halt scene commits and re-spec
  in Phase 0 (re-opens Phase 0 from current state). Mini-panel
  listeners are NOT the Phase 0 listener pool (independence rule).
- **Phase 6 re-spec budget.** If Phase 6 N=6 panel triggers Ceiling,
  the cost is: Phase 0 Step 5 re-spec (~$24 ElevenLabs re-run + 3-7
  days new listener panel) + Phase 4 re-render of every voiced scene
  (~12-24 hours render time at Phase 6 production CRF). Budget = 2-4
  weeks elapsed + ~$24 engine spend. This is documented expected-cost
  for a Ceiling drift; not a project-killer, just a real delay.
- **Phase 6 listener-pool independence.** ADR #21 requires Phase 6's
  N=6 panel to be FRESH listeners — zero overlap with Phase 0's pool.
  See Documentation / Operational Notes §"Listener pool independence
  rule" below for cross-phase enforcement.

If multiple engines clear, pick lowest-cost.

**Step 5 — Fail-action ladder.**

- **Path A fail** (ElevenLabs Voice Library preset + cadence-spec
  doesn't clear): try Path B (Briggsy clone + same cadence-spec).
- **Path B fail** (Briggsy Instant clone + cadence-spec doesn't
  clear): Path B is eliminated. Do **not** auto-escalate to
  Professional Voice Cloning — Professional requires a 30-min
  recording session and would create a hidden schedule dependency.
  Ladder proceeds to Path C (C-Gemini first, then C-OpenAI).
- **Path C fail** (BOTH Path C-Gemini AND Path C-OpenAI fail on
  the Step 1.5 adapter inputs): Phase 0 **exits with a Path D
  Sub-phase 0a deliverable** as the next Phase 0 work.

  The Sub-phase 0a deliverable contains:
  - 1-page Brief Memo to Briggsy listing: confirmed engine fail
    summary + Path D casting brief + actor-marketplace shortlist
    (Voices.com / Voice123 picks reading in Sterling-coded register)
    + budget request ($150–500 for 60–90s trailer read).
  - **Draft AI-disclosure-clause contract template (P2.26).** Path D
    engages a paid human voice actor for copyrightable creative
    content. Federal NO FAKES Act (proposed), state right-of-publicity
    law, and standard industry contracting require an AI-disclosure
    clause informing the actor their recording may be processed with
    AI tools (e.g., Voice Changer / speech-to-speech for Path B-style
    polish, OR pure-VO use). Contract template MUST include:
    1. Work-for-hire grant of recording rights to Briggsy.
    2. Explicit AI-disclosure clause: *"Buyer may apply AI audio
       processing (including but not limited to speech-to-speech
       voice conversion, denoising, equalization, time-stretching)
       to the delivered recording for the trailer use case. Buyer
       will NOT use the recording to train any voice-cloning model
       OR to generate new audio in your voice beyond the licensed
       trailer use."*
    3. Retention + re-release terms (e.g., 5 years from delivery, or
       indefinite for the trailer cut).
    4. Compensation + delivery schedule.
    Briggsy + actor sign before recording begins. Template draft is
    a Sub-phase 0a deliverable, NOT deferred to actor engagement
    time.
  - **Briggsy explicitly approves Path D spend AND contract template
    before any casting begins.** Phase 1 voice-AGNOSTIC structural
    decisions (scene count, scene order, cascade composition, R15
    chrome design) may proceed in parallel with actor casting. Phase 1
    voice-DEPENDENT decisions (beat-sheet line attribution, Unit 0.3
    cold-open line decode) cannot proceed until Path D voice lands.

  **Optional: Path D parallel-first hedge (P3.4).** The Step 5 ladder
  treats Path D as a fallback (only if A/B/C all fail). For a project
  where calendar weeks are the binding constraint (Briggsy's hourly
  rate dwarfs the $150-500 actor budget; 3-week Path D fail-then-cast
  recovery is expensive in elapsed time), Briggsy may choose to:
  - **Run Paths A/B/C engine eval in week 1** (Steps 1.5-2-3) AND
  - **Simultaneously post the Path D casting brief in week 1**
    (instead of waiting for A/B/C fail confirmation).
  - **Step 3 MUSHRA panel evaluates ALL FOUR paths side-by-side** —
    Paths A/B/C TTS candidates + Path D actor demo reels (1-3 demos
    from the actor shortlist) as stimuli.
  - **If A/B/C clear:** Path D casting brief is withdrawn (no spend);
    pocket the $150-500.
  - **If A/B/C fail:** actor is already cast; schedule preserved; no
    additional 2-3 weeks of casting-from-scratch on the critical path.

  Decision is Briggsy's at Phase 0 entry. If chosen, document in
  `account-readiness.md` + `MUSHRA-protocol.md` (Step 3 stimulus list
  expands to 4 candidates + anchor + reference = 6 total stimuli;
  Latin-square widens to 4×4 + 2 random).

- **Path D hard deadline (P1.18):** **21 calendar days from Briggsy's
  Brief-Memo approval.** Status checkpoints:
  - **Day 0:** Briggsy approves Brief Memo + contract template.
    Casting brief posted to Voices.com / Voice123.
  - **Day 7:** Status check. Auditions returned? If zero auditions,
    re-post brief OR widen marketplace (add ACX, MassiveVoices).
  - **Day 14:** Status check. If no shortlisted actor by day 14,
    surface to Briggsy as red-flag — likely Path D fail trajectory.
    Begin drafting the Brainstorm-Restructure Memo in parallel.
  - **Day 21:** Hard ceiling. If no delivered VO by day 21, auto-
    trigger Brainstorm-Restructure Memo (next section). Phase 1
    voice-agnostic work continues; beat-sheet does NOT lock until
    either VO lands OR restructure resolves. The 21-day budget
    matches typical Voices.com / Voice123 actor turnaround (1-2
    weeks delivery + 1 week buffer for retakes / contract round-trip).

- **Path D fail (delivery exceeded 21 days OR delivered VO fails
  MUSHRA acceptance) OR actor unavailable:** Phase 0 produces a
  **Brainstorm-Restructure Memo** to Briggsy with four explicit
  options laid out for decision:

  - **(i) Ship synthetic-tinged Dash** — accept that the voice has
    a TTS register; lean into it as a stylistic choice (the trailer
    owns the synthetic-ness rather than fighting it).
  - **(ii) Restructure to non-Dash briefer** — use established voice
    DNA for Janet-M (`ActMission.tsx`), Vera (`ActRoster.tsx:29-37`),
    or Sable (`ActRoster.tsx:38-47`). Whichever character's voice
    the available engines can match the cadence-spec best wins.
    R4 is recast to ~90% of the new briefer's voice. Beat sheet
    (Phase 1) restructures around new briefer.
    **Re-gating circular dep (P2.21):** Unit 0.4 (tone gate)
    consumes the **briefer voice locked by Unit 0.2**. If Option (ii)
    fires, Unit 0.4 MUST re-run with the new briefer voice before
    Phase 1's beat-sheet locks. The played-straight thesis is
    voice-specific (Sterling-coded gap-comedy works on Dash; Janet's
    Malory-coded dryness, Sable's Cheryl-coded chaos, Vera's
    Lana-coded exasperation each carry different played-straight
    registers). Re-running Unit 0.4 adds ~3-7 days to Phase 0 elapsed
    duration; flag as a known cost in the Brief Memo presenting
    Option (ii).
  - **(iii) Abandon the trailer concept** — surface this option
    honestly. The plan does NOT pretend Path A–D fail is
    auto-routable; if every legal path produces a register that
    misses the bar, the trailer concept may be wrong-shaped for
    this product and abandonment is a legitimate Briggsy decision.
  - **(iv) Re-frame to a shorter form factor (NEW per P3.6).** If
    the bar-clearing voice doesn't exist within budget+timeline, the
    trailer concept may need to **change form**, not be abandoned.
    Engineering-peer X consumption patterns favor short loops
    (15-30s), demo screen captures, side-by-side comparisons — NOT
    95s narrative trailers with sustained Dash narration. Option
    (iv) re-scopes to **30-45s gameplay-led** (no sustained
    narration; minimal voice; agentic-SDLC signal carried by R15
    chrome + visual cascade + a single hook line that any engine
    can deliver). This is a product-design pivot, not a
    capitulation — the same audience may decode "agent-built"
    faster from a shorter, more visually-led form.

This is the **brainstorm-level restructure** terminal. The previous
"design pivot, no abandon" framing softened the outcome; the honest
framing is: the cadence-match bar may be unachievable within the
allowed legal floor, and that's a real possible outcome that requires
a real Briggsy decision. Options (i)–(iv) preserve all real product
choices; abandonment is not the only off-ramp.

**Budget envelope:** $50 across Paths A/B/C + WebMUSHRA hosting
(real spend likely ~$24 per pricing-corrected estimates above; $50
retained as safety margin for re-runs). Path D ($150–500 hybrid) is
a separate line item gated on explicit Briggsy approval before
spend, per the Sub-phase 0a structure above.

**Patterns to follow:**

- UMB narrator script structure: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
- VOICE_DIRECTION guard placement: same script, lines 195–198 (UMB's
  original is Gemini-specific — *"Gemini TTS reads ALL text verbatim
  / Charon voice preset"*. Our generalization to per-engine variants
  is documented in §Key Technical Decisions above; intentional
  adaptation, not reference rot.)
- Dash voice DNA citations (verified line ranges):
  - `src/client/howtoplay/acts/ActMission.tsx:30-34, 52-57` — Mission
    brief lede + Beat II (Sample Paragraph 1 source).
  - `src/client/howtoplay/acts/ActMission.tsx:73-74` — M / briefer
    cadence signoff (`…Phrasing.` beat).
  - `src/client/howtoplay/acts/ActRoster.tsx:18-28` — Dash entry
    (blurb at line 26 + flourish at line 27 → Sample Paragraph 2).
  - `src/client/howtoplay/acts/ActRoster.tsx:29-37` — Vera entry.
  - `src/client/howtoplay/acts/ActRoster.tsx:38-47` — Sable entry.
  - `src/client/howtoplay/acts/ActRoster.tsx:47-56` — Janet (M) entry.
  - `src/client/howtoplay/acts/ActArsenal.tsx:49` — Phrasing! beat
    on `call-in-a-favor` tactic. (NOTE: previously cited line 76 is
    a Dash-voice tactic line but NOT a Phrasing! beat — it doesn't
    carry the `…Phrasing.` callout. Cite only line 49.)
  - `src/client/howtoplay/acts/ActIntercept.tsx:39-40` — counting-
    fingers Phrasing! beat in the Intercept lede.
- Spec §3.6 verified-influences pattern (style-mimicry, not literal
  reproduction): `docs/PRODUCT-SPECIFICATION.md` §3.6

**Test scenarios:**

- **Happy path:** `generate-tts-eval.ts --engine elevenlabs` produces
  3 valid WAV files (RIFF header + non-zero data section) at
  `sample-eval/r4-dash/elevenlabs/` matching the three sample paragraphs.
- **Happy path:** `--engine gemini` and `--engine openai` produce same
  3-file output structure for their respective engine subdirectories.
- **Happy path:** `generate-tts-eval.ts` reads the engine-specific
  adapter file (`cadence-spec-{engine}.{json|md}`) and passes the
  steering input through each engine's appropriate API surface:
  - ElevenLabs: `voice_settings` JSON + inline bracket tags from
    adapter JSON; NEVER mixed into the script text payload.
  - Gemini: structured prompt with `## DIRECTOR'S NOTES` /
    `### TRANSCRIPT` section markers from the adapter md.
  - OpenAI: `instructions` API parameter from the adapter md;
    script in separate `input` parameter.
- **Pre-flight gate:** `generate-tts-eval.ts` refuses to run if
  any of the three adapter files is missing — fail-fast with the
  message *"Run Step 1.5 adapter translation before invoking the
  engine matrix."* Prevents accidental cadence-spec.md being fed
  verbatim to ElevenLabs (which would produce a degraded read).
- **Edge case:** `--engine elevenlabs --force` overwrites existing WAVs
  (UMB precedent — skip-if-exists default, force flag for re-run).
- **Edge case:** `--engine elevenlabs --dry-run` lists what would be
  generated without making API calls.
- **Error path:** Missing API key produces fatal error with clear
  message naming which env var is required (mirrors Step 0a probe
  output for consistency).
- **Error path:** API 401/403 produces fatal exit (auth issue, no retry).
- **Error path:** API 429 / 5xx triggers exponential backoff retry
  (3 attempts max, mirroring UMB pattern).
- **Integration:** `sample-script-dash.test.ts` verifies the sample
  paragraphs are derived from existing copy AND that the cited line
  ranges in the plan + adapter files match the actual file lines.
  Two-layer assertion (P2.31):
  1. **Content match:** regex-locate the sample paragraph source
    substrings in `src/client/howtoplay/acts/ActMission.tsx` and
    `ActRoster.tsx`; fail if not found.
  2. **Line-range pin:** for each cited line range
    (`ActMission.tsx:30-34`, `ActMission.tsx:52-57`,
    `ActRoster.tsx:18-28`, etc.), read those exact lines from the
    file and assert the expected leading substring is present at
    that range. If an unrelated PR shifts line numbers, the test
    fails with a clear "line citation drift — update X to line N" —
    pointing the editor at the actual location.
  Test runs in CI on every commit touching `src/client/howtoplay/acts/`
  OR `videos/trailer/scripts/sample-script-dash.ts` (whichever side
  shifts).
- **Anti-pattern guard (P0.1 — executable assertions, not grep
  theater).** `generate-tts-eval.test.ts` mocks each engine's API
  client and asserts the ACTUAL outgoing payload separates steering
  from script per engine surface. The previous grep-of-comments
  pattern was theater — comments don't prevent edits, and Briggsy
  has hit the VOICE_DIRECTION-prose-in-script bug TWICE per
  `feedback-narrator-voice-direction.md`. Tests:
  ```ts
  // generate-tts-eval.test.ts
  import { describe, it, expect, vi } from 'vitest';
  import { generateTtsEval } from './generate-tts-eval.js';
  import { SAMPLE_PARAGRAPHS } from './sample-script-dash.js';

  describe('VOICE_DIRECTION anti-pattern guards', () => {
    it('ElevenLabs: text payload contains ONLY the sample paragraph, no cadence-spec prose', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(new ArrayBuffer(8000), { status: 200 }));
      global.fetch = fetchMock;
      await generateTtsEval({ engine: 'elevenlabs', dryRun: false });
      const elevenLabsCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('elevenlabs.io/v1/text-to-speech'));
      for (const [, init] of elevenLabsCalls) {
        const body = JSON.parse(init.body as string);
        // text MUST equal exactly one of the sample paragraphs — no extra prose
        expect(SAMPLE_PARAGRAPHS.map(p => p.text)).toContain(body.text);
        // No cadence-spec keywords leaked into the script payload
        const forbidden = ['cadence-spec', 'deadpan', 'mid-Atlantic', 'sardonic lift', 'Floor band', 'Target Band', 'Ceiling'];
        for (const word of forbidden) {
          expect(body.text.toLowerCase()).not.toContain(word.toLowerCase());
        }
      }
    });

    it('Gemini: structured prompt has DIRECTOR\'S NOTES + TRANSCRIPT markers; script ONLY below TRANSCRIPT', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
      global.fetch = fetchMock;
      await generateTtsEval({ engine: 'gemini', dryRun: false });
      const geminiCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis'));
      for (const [, init] of geminiCalls) {
        const body = JSON.parse(init.body as string);
        const promptText = body.contents[0].parts[0].text;
        expect(promptText).toContain('## DIRECTOR\'S NOTES');
        expect(promptText).toContain('### TRANSCRIPT');
        // Sample-script content must appear BELOW the TRANSCRIPT marker, not above
        const transcriptIdx = promptText.indexOf('### TRANSCRIPT');
        for (const p of SAMPLE_PARAGRAPHS) {
          const scriptIdx = promptText.indexOf(p.text.slice(0, 40)); // match first 40 chars
          if (scriptIdx >= 0) expect(scriptIdx).toBeGreaterThan(transcriptIdx);
        }
      }
    });

    it('OpenAI: input contains ONLY sample-script, instructions contains cadence-spec — never mixed', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(new ArrayBuffer(8000), { status: 200 }));
      global.fetch = fetchMock;
      await generateTtsEval({ engine: 'openai', dryRun: false });
      const openAiCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('api.openai.com/v1/audio/speech'));
      for (const [, init] of openAiCalls) {
        const body = JSON.parse(init.body as string);
        // input MUST be a sample paragraph verbatim
        expect(SAMPLE_PARAGRAPHS.map(p => p.text)).toContain(body.input);
        // input MUST NOT contain cadence-spec prose
        const forbidden = ['cadence-spec', 'deadpan briefing voice', 'Floor band', 'Target Band'];
        for (const word of forbidden) {
          expect(body.input.toLowerCase()).not.toContain(word.toLowerCase());
        }
        // instructions field MUST exist and contain cadence-spec keywords (the steering)
        expect(body.instructions).toBeDefined();
        expect(body.instructions.length).toBeGreaterThan(100);
      }
    });
  });
  ```
  These assertions catch the exact mistake a future agent edit would
  introduce — moving cadence-spec prose into the `text` / `input`
  field. The forbidden-keyword list pulls from cadence-spec.md
  vocabulary; update it if the spec adds new keywords. **CI runs
  these tests on every commit touching `videos/trailer/scripts/`** —
  see Unit 0.1 `package.json` `typecheck` script extension + Phase 0
  Verification §test commands below.

**Verification:**

- `videos/trailer/sample-eval/r4-dash/cadence-spec.md` exists with
  each characteristic documented + source citations + three-band
  spectrum (Floor / Target / Ceiling) explicit (band content
  research-validated, not template-copied).
- `videos/trailer/sample-eval/r4-dash/account-readiness.md` exists
  with per-engine full-probe confirmation (auth + subscription_tier /
  model.id scope + actual TTS endpoint reality) — output of
  `scripts/check-tts-readiness.ts` (Step 0a). Char-budget tracker
  initialized at `sample-eval/r4-dash/char-budget.json`.
- `videos/trailer/sample-eval/r4-dash/cadence-spec-{elevenlabs,gemini,openai}.{json,md,md}`
  all three exist (Step 1.5 outputs), each derived from cadence-spec.md.
- Step 0.5 audio pre-flight cleared: WAV at
  `sample-eval/r4-dash/preflight/gemini-spec-test.wav` exists; decision
  documented at `sample-eval/r4-dash/preflight/preflight-decision.md`
  with both reader (one Archer-fan + one non-Archer-fan engineering
  peer) Target-Band-Yes + No-Benjamin-impression signoffs.
- `videos/trailer/sample-eval/r4-dash/hosting-decision.md` exists
  with chosen WebMUSHRA host + setup steps (Step 3a — Tunnel default;
  Pages+Worker option 2; VPS fallback). Access control verified
  (non-guessable subpath + per-listener tokens). CSP path-override
  added to `_headers` if Option 2 chosen.
- `videos/trailer/sample-eval/r4-dash/{elevenlabs,gemini,openai}/`
  each contain three WAV files matching the sample paragraphs.
- `videos/trailer/sample-eval/r4-dash/MUSHRA-protocol.md` exists with
  WebMUSHRA setup instructions + question wording + listener tracking
  + anchor calibration step + practice trial + paragraph selection +
  session length budget + bonus-signal disambiguation follow-up +
  forced-choice Ceiling probe + Latin-square stimulus order table +
  consent form + retention policy + completion-state UX + recruitment
  message template + reference clip selection criteria + source URL +
  attribution.
- `videos/trailer/sample-eval/listener-roster.md` tracks pool
  membership (which listener participated in which unit + date) —
  pool independence rule enforcement artifact.
- `videos/trailer/sample-eval/r4-dash/results.md` documents listener
  responses + joint-pass verification + Ceiling-band history (any
  triggers + re-spec iterations + final disposition) + which path
  cleared (A/B/C-Gemini/C-OpenAI/Sub-phase 0a/Restructure). **Voice
  cast disposition** for Phase 1 recorded in results.md AND
  propagated to `PHASE-0-EXIT.md` Section 1 per the template (Y/N
  provisional-until-Phase-6 flag included).

---

### Unit 0.3 — R14 Cold-Open Decode Gate (P0)

- [ ] **Unit 0.3: R14 Cold-Open Decode Gate**

**Goal:** Validate that a no-context viewer decodes "AI / agent / autonomous / built
itself" from the 5-second cold-open hook (audio + visual + on-screen text). The
trailer's sole mechanism for telegraphing the agentic-SDLC origin to a viewer who has
not seen UMB v3.

**Scope** (clarified 2026-05-17 per Phase 6 doc-review cross-phase amendment #2): Unit
0.3 protocol applies ONLY to the 5-second cold-open binary-hook spike (does the cold-
open ALONE seed an autonomy hook?). It is NOT the Phase 6 full-trailer comprehension
decode (Phase 6 Unit 6.7 uses a separate between-subjects N=3+3 panel protocol per
Phase 6 deepening ADR #21 + doc-review CALL-3). Unit 0.3 small-N is acceptable for
binary cold-open hook detection; Phase 6's diagnostic uses larger N + UMB control for
full-trailer comprehension.

**Requirements:** R14 (compressed-Archer cold-open + repeatability
declaration), R15 (on-screen text signal layer — partial validation; full
in Unit 0.5).

**Dependencies:** Unit 0.1 (scaffold), Unit 0.2 (engine + voice cast
chosen — the cold-open speaker uses the engine that cleared R4 or the
nearest substitute if R4 is in Sub-phase-0a restructure), AND **Unit
0.6 outcome** (R5 cleared / cut). If R5 is cut, **Vera is removed
from the candidate speaker pool** before Step 3 tester protocol runs
— the brainstorm's resolution order ("R5 evaluated first; if cut,
Vera is removed from R14's candidate set") is operationally
enforced via this dependency.

**Files:**

- Create: `videos/trailer/src/scenes/SpikeColdOpen.tsx` — 5s standalone
  composition with operative card flashes + brass-hook placeholder +
  BURNED logo + TTS cold-open line.
- Create: `videos/trailer/src/SpikeColdOpenComposition.tsx` — wraps
  SpikeColdOpen in a Composition the studio can render.
- Create: `videos/trailer/sample-eval/r14-cold-open/candidates.md` — the
  five candidate lines (three brainstorm originals + two new) with
  machine-wordplay analysis.
- Create: `videos/trailer/sample-eval/r14-cold-open/decode-eval.md` —
  tester protocol + responses + decision.
- Create: `videos/trailer/sample-eval/r14-cold-open/clips/*.mp4` — 5s
  rendered clips per candidate line tested.

**Approach:**

**Step 1 — Document candidate lines.** In `candidates.md`, structured
as two sections — REJECTED candidates (documented for audit trail
only, not tested) and TESTED candidates (Step 3 stimuli):

**Section A — REJECTED (machine-wordplay missing per R14 brainstorm
requirement; documented but NOT tested):**

| # | Line | Speaker | Why rejected |
|---|------|---------|--------------|
| 1 | *"...the kid did it. Again. Show-off."* | Vera (Lana-coded exasperated-impressed) | Brainstorm original. Lacks "machine"/"autonomous"/"wrote itself" double-meaning. Fails R14's stated requirement. |
| 2 | *"He did it again! Twice! TWICE!"* | Sable (Cheryl-coded chaos enthusiasm) | Brainstorm original. Same gap as #1. |
| 3 | *"Well. Apparently the second one shipped."* | Janet (Malory-coded dismissive-exec dryness) | Brainstorm original. Same gap as #1. |

**Section B — TESTED (Step 3 stimuli):**

| # | Line | Speaker | Machine wordplay |
|---|------|---------|-------------------|
| 4 | *"He's a machine, this kid. Honestly at this point I'm just impressed."* | Sable / Janet (Vera if R5 cleared; if R5 cut, Vera drops from candidate pool per Unit 0.6 dependency) | "He's a machine" reads as colloquial admiration to a naive viewer AND literally as "the machine did it" to engineering audience. Clears R14's stated load. |
| 5 | *"Briggsy didn't write this one either. He's getting good at not writing them."* | Sable / Janet (Vera if R5 cleared) | Echoes UMB v3 cold-open hook ("Briggsy didn't write a single line of code... Not one." — `narrator-prompts.ts:650`). Direct callback for viewers who HAVE seen UMB v3; standalone-coherent for those who haven't. |

Speaker assignment per candidate happens AFTER Unit 0.2 lock + Unit
0.6 outcome land. The candidate-speaker pool is constrained by both:
(a) Unit 0.2 may have restructured to a non-Dash briefer (Path D
Sub-phase) — the cold-open speaker can be drawn from the same
non-Dash voice character without conflict; (b) Unit 0.6 cut-Vera
removes Vera from the pool. If both candidates 4 and 5 perform
acceptably, the lower-budget engine option wins.

**Step 2 — Cold-open spike composition.**

*Important framing correction:* UMB v3's `V3S01_ColdOpen.tsx` is a
**typewriter-text-on-black scene** (verified — a blinking cursor +
typewritten "Briggsy didn't write a single line of code. … Not
one."), NOT an operative-card-flash composition. The BURNED card-flash
cold-open is **net new visual vocabulary** for the BURNED trailer
specifically; UMB is precedent only for the structural shape ("5-second
standalone composition with cold-open line + minimal visual"), not for
the card-flash mechanic.

`SpikeColdOpen.tsx` renders a 6–8s composition (decode-eval question
asked on the first 5 seconds; the trailing 1–3s contains the
agentic-SDLC-thesis tag + landing logo). Frame timing references
30fps (180–240 frames total):

- **3 operative card flashes**, pacing rhythm-varied (NOT evenly
  spaced — Archer title sequences are typically *two fast cuts → one
  held card* rhythmically; even pacing reads as slideshow). Use
  existing artwork from `public/assets/cards/`:
  - Frame 0–30 (1s): cold-open speaker's portrait (Sable / Janet /
    Vera per Unit 0.2 + Unit 0.6 outcome) — fast cut in.
  - Frame 30–60 (1s): Dash portrait (the briefer) — `dash-barlowe.webp`,
    fast cut in.
  - Frame 60–150 (3s): held landing card — BURNED logo treatment +
    R15 chrome stamp + line-deliveryᶠ time. (Three-beat rhythm: cut /
    cut / hold.)
- **Transition between card flashes**: hard cut with ~2-frame
  brightness-pop on each cut (Archer convention — the title-sequence
  cuts have a subtle brightness pulse at the edit point). NOT
  cross-dissolve (slideshow vibe); NOT stamp-slap (reserved for
  scene-to-scene transitions in production trailer).
- **Chevron / target-reticle motifs** as background layer (placeholder
  SVG for spike; refined in Phase 3 — possibly Lottie if Unit 0.5's
  spike reveals pure-Remotion can't deliver). NOT pre-installing
  `@remotion/lottie` (per refined ADR #6).
- **BURNED logo treatment** as the landing card overlay (bold
  mid-century geometric, matching Archer title-sequence vocabulary;
  Bass / Ferro lineage). Lands frame ~60 with the held card, settles
  by frame ~90.
- **Brass-jazz hook** (royalty-free placeholder — full sourcing in
  Phase 3).
- **TTS cold-open line** dropped over the music hook at frame ~30
  (on the cut to Dash's portrait — audio-visual sync rhythm).
- **R15 chrome stamp** landing in the cold-open frame at frame ~75
  (during the held landing card): `"OPERATION PENDLETON / CASE FILE
  02 / METHOD: AUTONOMOUS"`. **Placement: bottom third** (Archer
  classification-stamp convention). **Color: BURNED orange/teal**
  (`--paper-signal-orange` / `--paper-ink` tokens from
  `semantic.css`). **Font: Clash Display** (matches production face
  per Unit 0.5 lock). Tests whether the visual signal layer
  reinforces the audio.

  **R15 chrome stamp inventory across the full trailer (P2.19).**
  Phase 0 spec locks only the cold-open instance content above. The
  full trailer surfaces ~4 R15 stamps (per Phase 1 deepening's
  R15 #1-#4 trace in `phase-1-beat-sheet-lock.md`). Phase 0 does
  NOT author stamp content for the non-cold-open instances — those
  belong to Phase 1's beat-sheet authoring (Unit 1.9). Phase 0 locks
  only:
  - Cold-open instance: `"OPERATION PENDLETON / CASE FILE 02 /
    METHOD: AUTONOMOUS"` at frame ~75 of the cold-open spike.
  - Visual specification (placement, color, font) inherited by all
    Phase 1 R15 stamps.
  - Split-layer architecture (frame.svg + text.svg per stamp, with
    `transform-origin: center` on the outer wrapper) — Phase 4 owns
    composition mechanics; Phase 3 produces final SVGs.
  Phase 1's beat-sheet specifies the remaining 3-4 stamp contents +
  landing frames; Phase 3 produces the SVG assets; Phase 4 composes
  with the stamp-slap motion grammar. Phase 0's role is to validate
  the cold-open instance reads correctly + lock the visual minimum-
  spec — NOT to inventory the full trailer's stamp set.

**Step 3 — Tester protocol.** Document in `decode-eval.md`:

- **Listeners: minimum n=4** engineering-peer testers (raised from
  the original "n=2 minimum" — n=2 is dangerously thin for the
  trailer's first-3-seconds make-or-break surface; n=4 lets the
  threshold scale meaningfully with sample size). 6 target. Briggsy's
  network + Discord + Harry recruitment.
- **UMB-v3 pre-screen battery (asked before any test stimulus).**
  Briggsy's network overlaps UMB v3's distribution — self-attestation
  alone is contamination risk:
  - *"Have you seen any trailer for an autonomously-built software
    project from Briggsy in the last six months?"*
  - *[Show UMB v3 cold-open thumbnail]* *"Do you recognize this image
    or remember seeing it before?"*

  If yes to either, branching:
  - **If a substitute non-primed tester is available** within 48h:
    DISQUALIFY. Tester sees a polite exit screen: *"Thank you — for
    this study we need testers who haven't seen prior trailers in
    this series. Briggsy will follow up if a different study fits."*
    Tester exits without proceeding to stimulus.
  - **If no substitute available** within 48h (recruitment-stalled
    state): tester is logged as **"primed"** and proceeds to a
    **shortened protocol** — open question only (no Tier scoring,
    no stimulus rating). Their open-response decode is captured as
    INFORMATIVE CONTEXT in `decode-eval.md` but does NOT count
    toward acceptance threshold. They see: *"You've seen the prior
    trailer — your decode here is helpful context but won't count
    toward the formal test. Listen and describe what you think
    this trailer is about (~30 seconds)."* — shortened to ~5 min
    from the ~25 min full protocol.
  - The pre-screen + branching is implemented in the WebMUSHRA
    onboarding screen flow (or as a brief intro form before the
    rendered MP4 stimulus loads).
- **Stimulus:** First 5s of the 6–8s rendered MP4 clip played cold —
  no setup beyond "watch this." (Acknowledged limitation: the framing
  meta-cues that it's a trailer; this is unavoidable in a recruited
  pool and noted in `decode-eval.md` as an external-validity caveat.)
- **Open question (asked first, after pre-screen):** *"What do you
  think this trailer is about?"* Tester narrates their reaction
  stream-of-consciousness for 30 seconds.
- **Two-tier decode acceptance — aligned with ADR #21 keyword
  precision (P1.17, updated 2026-05-17).** ADR #21 (locked in Phase 6
  deepening) explicitly distinguishes BUILD PROCESS / AGENT AUTHORSHIP
  keywords (which count) from RENDER TECHNOLOGY keywords (which do
  not). The pre-deepening Tier 2 framing accepted "AI alone" as a
  partial decode — but a listener saying "this looks like an AI-
  rendered trailer" (Midjourney / Sora interpretation) is reading
  the visuals, not the agentic-SDLC build process. Allowing that to
  pass Phase 0 would lock a line that Phase 6's full decode panel
  rejects per ADR #21 hard rule. Updated tiers:
  - **Tier 1 decode** (full thesis — BUILD PROCESS / AGENT
    AUTHORSHIP): tester unprompted surfaces *"agent," "autonomous,"
    "built itself," "wrote itself," "made itself," "the machine did
    it," "Claude wrote this," "autonomous development"* — keywords
    specifically about the BUILD PROCESS, not the visual rendering.
  - **Tier 2 decode** (partial — AI + AUTHORSHIP CONTEXT): tester
    unprompted surfaces *"AI"* coupled with explicit authorship
    framing (*"AI built it," "AI wrote the code," "AI made the
    game"*). The authorship verb is the diagnostic — *"AI"* alone
    is NOT Tier 2 anymore.
  - **Render-tech keywords DO NOT count** (per ADR #21 hard rule):
    *"AI-rendered visuals," "Midjourney-generated," "AI-generated
    images," "AI trailer animation," "looks AI-made"* (when "AI-made"
    refers to the trailer aesthetic, not the project). If a tester
    says one of these, it's a Failure Mode 2 signal (visual decodes
    as AI-rendered but audio+thesis don't decode as autonomous build).
  - **Acceptance threshold:** **≥50% of non-primed testers reach
    Tier 1**. Tier-2-only pass (no Tier 1 listeners) is NOT
    sufficient — the full thesis must land for at least half. With
    n=4 non-primed: ≥2 Tier 1. With n=6: ≥3 Tier 1. With n=8:
    ≥4 Tier 1.
  - **Non-primed N HARD FLOOR (P2.32):** Unit 0.3 cannot lock on
    fewer than **n=4 non-primed testers**. If pre-screen disqualifies
    the recruited pool below n=4, re-recruitment is MANDATORY before
    the decode threshold can evaluate. Proceeding with n=3 (50% = 1.5
    testers) is statistical noise; the floor prevents it.
  - **Three-band parity (P3.5).** Like cadence-spec, decode acceptance
    has an implicit Ceiling band: a line that **over-telegraphs the
    autonomous-build thesis** (e.g., "this is a trailer built by
    Claude Sonnet 4.6 to demonstrate autonomous software development")
    is too on-the-nose and reads as marketing rather than the Archer-
    grade aesthetic the trailer is going for. The Ceiling is detected
    if ≥2 testers volunteer "feels like an ad" / "marketing copy" /
    "too explicit" in open response. Ceiling triggers line rewrite
    (Failure Mode 1).
- **Failure mode 1 — line decodes but not as autonomous:** testers
  describe the trailer as "Archer parody" or "spy comedy" without
  mentioning autonomy/agent/machine. **Rewrite line** with more
  explicit phrasing (candidates: *"He wrote himself a sequel,"* *"The
  machine learned to ship."*). Run a second pass with NEW testers
  (preserve the pre-screen battery).
- **Failure mode 2 — visual decodes but audio doesn't:** R15 chrome
  stamp lands, but spoken line doesn't sell the autonomy hook. **Add
  visual signal density** — a Claude / agent log-entry stamp landing as
  the line drops (test with the new visual layer in a second pass).
- **Failure mode 3 — neither audio nor visual decodes after two
  rewrites:** R14 falls back to non-voice cold-open. Title-card
  structure remains (operative flashes + brass hook + BURNED logo +
  agentic-SDLC stamp); spoken line dropped. **Before locking the
  non-voice fallback, run a conditional R15-only fallback decode
  spike** — silent-cold-open variant (R15 chrome only, no TTS line)
  retested with new testers using the same Tier 1 / Tier 2 acceptance
  threshold. R15 carries full signal load only if it independently
  clears the decode test; otherwise this surfaces back to Briggsy as a
  brainstorm-level question (the cold-open hook isn't viable in the
  current shape).

**Patterns to follow:**

- UMB v3 cold-open: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S01_ColdOpen.tsx`.
  **Precedent for structural shape only** — UMB's cold-open is a
  typewriter-text-on-black scene (blinking cursor + typed line), NOT
  an operative-card-flash composition. BURNED's card-flash mechanic
  is net new visual vocabulary; UMB is only precedent for "5-second
  standalone composition with one TTS line + minimal visual chrome."
- UMB v3 cold-open line shape: *"Briggsy didn't write a single line
  of code... Not one."* (`projects/undercover-mob-boss/scripts/narrator-prompts.ts:650`,
  verified verbatim). BURNED candidate #5 is the explicit callback.

**Test scenarios:**

- **Happy path:** `SpikeColdOpen.tsx` renders to 5s MP4 at 1920×1080 @
  30fps when invoked via `npx remotion render src/SpikeColdOpenComposition.tsx`.
- **Happy path:** Each candidate line produces a distinct rendered MP4
  in `clips/` named by candidate number.
- **Edge case:** Title-sequence pacing — each operative card flash
  visible for ~1.5–2s (frame counts validated against the timing constant).
- **Integration:** TTS line audio aligns to operative card flash timing
  within ±5 frames (alignment is a manual visual check, not automated).

**Verification:**

- All tested candidate clips render successfully and play in Remotion
  studio at 30fps.
- `decode-eval.md` documents listener responses verbatim + decision
  (line locked / line rewritten / restructured to non-voice).
- **Cold-open line lock** for Phase 1 recorded in `decode-eval.md`.

---

### Unit 0.4 — Tone Prototype Gate (P1)

- [ ] **Unit 0.4: Tone Prototype Gate**

**Goal:** Validate that gap-comedy (deadpan briefing-vocabulary over
SDLC-reality subject matter) lands with engineering-peer test
listeners — both Archer-aware and Archer-unaware — articulating
unprompted that the gap is the joke. Fail-action re-opens the
played-straight Key Decision.

**Requirements:** R2 (deadpan, played straight), R6 (Pendleton
vocabulary discipline).

**Dependencies:** Unit 0.1 (scaffold), Unit 0.2 (engine chosen — TTS the
sample paragraph via the engine that cleared R4 or the nearest
substitute).

**Optional tone-first early-test (P3.3 — recommended hedge).** Tone
is the trailer's strategic differentiator vs UMB (deadpan-spy register
vs UMB's noir-Charon). If the played-straight thesis doesn't land,
the entire voice eval may be moot — Briggsy is spending $24 + 3 weeks
on voice when the underlying premise needs a redesign. A cheap early-
tone test can hedge this dependency-chain risk:

- **Mechanism:** Extend Step 0.5's Gemini-free-tier audio pre-flight
  (~$0, 15 min). Generate a SECOND clip from the Step 0.5 cadence
  pre-flight session — same engine, but read Unit 0.4 Step 1's
  20-second deadpan sample paragraph instead of Sample Paragraph 1.
  Same two readers (Briggsy + non-Archer-fan engineering peer) hear
  the clip and answer: *"What's the joke here? Describe it in your
  own words."*
- **Early signal:** If both readers articulate gap-comedy (Tier 1 or
  Tier 2 per Unit 0.4 rubric below), proceed with the full Unit 0.2
  + Unit 0.4 sequence with high confidence the thesis lands. If
  either says "I don't get the joke" or describes only one register,
  surface the thesis-fragility flag to Briggsy BEFORE engine-matrix
  spend begins — Step 5's brainstorm-restructure Option (i)/(iv) may
  trigger earlier than the formal Unit 0.4 fail-action.
- **Why optional:** the formal Unit 0.4 gate still runs on the locked
  briefer voice (which carries character-specific cadence the Gemini
  pre-flight doesn't fully capture). The early-test is a strategic
  hedge, not a replacement gate. Skipping it = accepting the standard
  sequential risk.
- **Cost:** ~$0 + 15 min added to Step 0.5. Saves: up to $24 + 3 weeks
  if the played-straight thesis is broken in current form.

**Files:**

- Create: `videos/trailer/scripts/tone-prototype.ts` — exports the
  20-second sample paragraph + TTS generation invocation.
- Create: `videos/trailer/sample-eval/tone/sample.wav` — generated audio.
- Create: `videos/trailer/sample-eval/tone/eval.md` — tester protocol +
  responses + decision.

**Approach:**

**Step 1 — Sample paragraph (20 seconds, Pendleton-vocab register,
deadpan, SDLC-as-subject):**

> *"The operation began with a forensic dossier. Fourteen thousand
> pages, drafted in a single weekend by a field asset who — for
> compliance reasons — we will not be naming. Every contingency
> war-gamed. Every cover story rehearsed. Every operative profiled
> before they were activated. The dossier's signature appears on every
> page. Try and find a human one. …Phrasing."*

Pendleton-vocab translation table applied:
- agents → autonomous field assets
- specs → forensic dossier
- tests → contingencies war-gamed
- code → operational tradecraft
- deploy → activation

Subject matter (autonomous SDLC) survives translation. The gag is the
gap between briefing-room vocabulary and software-engineering reality.

**Step 2 — TTS generation.** Voice via the **briefer voice locked by
Unit 0.2** — whether that's Dash (Paths A/B/C cleared), Dash via
voice-actor (Path D Sub-phase 0a cleared), OR substitute briefer
(brainstorm-restructure terminal landed at Option ii). If the briefer
changes from Dash to a non-Dash character with a meaningfully different
voice DNA (e.g., Sable's Cheryl-coded chaos register), the sample
paragraph **adapts the Phrasing! tag** — the *"…Phrasing"* callout is
Sterling-Dash-coded; Janet/Sable don't carry the same beat. Adapt the
paragraph's ending to the briefer's character register without
sacrificing the gap-comedy mechanic. Output:
`sample-eval/tone/sample.wav`. ~20 seconds.

**Step 3 — Tester protocol.** Document in `eval.md`:

- **Listeners: minimum n=4** engineering-peer testers (raised from
  n=2 because Played-Straight is a Key Decision — the original n=2
  was structurally weaker than R4's n=6, and the asymmetry wasn't
  justified by impact difference). Mix: 2 Archer-aware + 2
  Archer-unaware. 6 target.
- **Stimulus:** 20s WAV played cold, single listen.
- **Question:** *"What's the joke here?"*
- **Gap-articulation rubric** (two-reader coding):
  - **Tier 1 — full gap structure:** tester names the comedy
    mechanic ("contrast," "juxtaposition," "mismatch," "gap between
    the two registers"). Example phrasings: *"they're describing
    software in spy terms,"* *"calling code a forensic dossier is
    doing a lot of work,"* *"the contrast between spy-speak and
    nerd-stuff is the joke."*
  - **Tier 2 — partial:** tester names the register collision
    without explicitly tagging the mechanic. *"It's nerds in Bond
    movie cosplay,"* *"sounds like Tom Clancy doing software docs."*
  - **Insufficient:** tester describes only one register
    (*"it's just Archer humor,"* *"sounds like a serious documentary"*).
- **Acceptance threshold:** **all 4 testers reach Tier 1 OR Tier 2**
  AND **at least 1 of each mix-profile (Archer-aware / unaware)
  reaches Tier 1**. Two-reader transcript coding: Briggsy + Claude
  (or Briggsy + Harry) independently grade each response, reconcile
  disagreements before locking.

**Step 4 — Fail-action.** If the acceptance threshold doesn't clear,
the **played-straight Key Decision is RE-OPENED** as a brainstorm-
level question, not patched silently with a Vera-hedge or
wink-handoff. Either the played-straight thesis survives a real test
or it isn't a locked decision.

Fail-action outcomes:
- Re-write sample paragraph to lean harder into the SDLC subject
  matter (more dossiers, more rehearsals, more debriefs) and **retest
  with NEW listeners preserving the 2 Archer-aware + 2 Archer-unaware
  mix** (Archer-awareness is a known confound on gag-decode — a
  retest with an unbalanced mix measures a different thing).
- If second-pass still fails: brainstorm-level reopening. The trailer
  may need a hybrid tone (one wink-line) or a different opening frame.
  This bubbles back to Briggsy as a structural decision.

**Patterns to follow:**

- UMB v3 narrator script tone: `projects/undercover-mob-boss/scripts/narrator-prompts.ts`
  TRAILER_V3_PROMPTS for register reference (though UMB is noir-Charon,
  not deadpan-spy — BURNED's register is different).
- BURNED Phrasing! cadence rule: `CLAUDE.md` §3.5 + `docs/PRODUCT-SPECIFICATION.md` §3.5
- Brainstorm Key Decisions §"Played-straight tone chosen over hybrid
  wink for maximum rewatchability."

**Test scenarios:**

- **Happy path:** `tone-prototype.ts` generates valid WAV via the
  engine selected in Unit 0.2.
- **Test expectation: behavioral evaluation only** — this is a
  listener-judgment gate, not a code-correctness gate. No automated
  pass/fail.

**Verification:**

- `sample-eval/tone/sample.wav` exists and plays cleanly.
- `sample-eval/tone/eval.md` documents both listener responses verbatim.
- **Tone lock** for Phase 1 recorded in `eval.md` (played-straight
  cleared / played-straight reopened).

---

### Unit 0.5 — Composite Viability Spike (P1)

- [ ] **Unit 0.5: Composite Viability Spike**

**Goal:** De-risk the five riskiest Remotion integration points BEFORE
beat-sheet structure commits. Render a 5-second prototype proving each
point clears the quality bar in EXPORTED MP4 (not just studio preview).

**Requirements:** R3 (stacked-climax cross-dissolve), R10 (HTP dossier
hero), R15 (on-screen text signal layer — custom-font rendering
validation).

**Dependencies:** Unit 0.1 (scaffold).

**Files:**

- Create: `videos/trailer/src/scenes/SpikeS01_Cascade.tsx` — 2s cascade
  scene with HTP-placeholder + one stat overlay + transition sub-clip
  vocabulary block (renders all three Archer-grammar candidates as
  sub-clips per refined integration point (e) below).
- Create: `videos/trailer/src/scenes/SpikeS02_Gameplay.tsx` — 2s
  placeholder gameplay clip (any 1920×1080 silent MP4 works — UMB's
  HTP fullpage screenshot animated via translateY interpolation is
  the lightest precedent).
- Create: `videos/trailer/src/SpikeCompositionMain.tsx` — wraps
  SpikeS01 + scene-internal fade-to-black overlay + SpikeS02 in bare
  `<Series>` (matches ADR #4 revised production pattern).
- Create: `videos/trailer/scripts/capture-htp-scroll-burned.ts` — clone
  of UMB's `capture-htp-scroll.ts` pointed at BURNED's HTP page. **This
  script is NOT throwaway** — Phase 3 Unit 3.1 owns the production
  invocation (swap localhost URL → production `burned-cxa.pages.dev`
  URL). Phase 0 writes it; Phase 3 promotes it.
- Create: `videos/trailer/public/htp-fullpage.png` — captured BURNED HTP
  full page (output of capture script). Spike validates rendering
  pipeline only; Phase 3 / Phase 4 own the production scroll math
  (scrollHeight → cascade-time interpolation).
- **Use existing**: `public/fonts/ClashDisplay-Variable.woff2` from
  BURNED's public dir (the trailer's `Config.setPublicDir('../../public')`
  resolves to this). **DO NOT create `burned-display.woff2`** — that
  file doesn't exist; the spike validates the load-and-render pipeline
  against the production font face (Clash Display) used elsewhere in
  the product.
- Create: `videos/trailer/sample-eval/spike/spike-results.md` —
  pass/fail per integration point + remediation notes if any fail +
  transition-candidate ranking (chosen primary / runner-up / cut).
- Create: `videos/trailer/out/spike-frame-test.mp4` — rendered MP4 for
  inspection.
- Create (conditional, if combined render fails any point): isolated
  repro compositions named `SpikeAudio.tsx`, `SpikeFont.tsx`,
  `SpikeTransition.tsx`, etc. — single-concern compositions for
  root-cause debugging.

**Approach:**

**Integration point (a) — Scene boundary via bare `<Series>` (ADR #4
revised — TransitionSeries REMOVED).** Phase 4 deepening removed
`<TransitionSeries>` across 15+ sections (R3 is a HARD CUT per Phase
1 deepening, not cross-dissolve; ADR #11 also revised). Phase 0's
spike validates the production pattern: bare `<Series>` of
`<Series.Sequence>` with scene-internal fade overlays where needed.
The `@remotion/transitions` package is NOT pre-installed (see Unit
0.1 deps) — only installed on-demand if Unit 0.5(e)'s stamp-slap
needs `iris()` helper or similar primitives.

```tsx
import { Series, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// Scene-internal fade overlay component (per Phase 4 pattern)
function S01TailFadeToBlack({ startFrame, durationFrames }: { startFrame: number; durationFrames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ backgroundColor: 'black', opacity }} />;
}

<Series>
  <Series.Sequence durationInFrames={60}>
    <SpikeS01_Cascade />
    <S01TailFadeToBlack startFrame={50} durationFrames={10} />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <SpikeS02_Gameplay />
  </Series.Sequence>
</Series>
```
This is the Phase 4 production pattern at spike scale. Spike validates
the bare-`<Series>` + scene-internal-overlay approach works in MP4
export (no `TransitionSeries` cross-dissolve math). If the spike
reveals timing issues at the boundary (overlay opacity doesn't reach
1.0 at the cut, etc.), Phase 4 inherits the failure mode + remediation
documented here.

**Integration point (b) — Audio crossfade via `@remotion/media`.**
```tsx
import { Audio } from '@remotion/media';
import { Sequence, interpolate, staticFile } from 'remotion';

// Music bed fading under VO
<Audio
  src={staticFile('audio/spike-music-bed.mp3')}
  volume={(f) => interpolate(f, [0, 30, 90, 150], [0, 0.6, 0.2, 0.6], { extrapolateRight: 'clamp' })}
/>
// VO drops in at frame 30 — audio offset is done via <Sequence>, NOT
// a `from` prop on <Audio> (which doesn't exist).
<Sequence from={30}>
  <Audio src={staticFile('audio/spike-vo.wav')} />
</Sequence>
```
**API correction (would have failed at first render):** `<Audio>` from
`@remotion/media` has NO `from` prop. Offsets are done via the
parent `<Sequence from={N}>`. Plan previously used `<Audio src={...}
from={30} />` which silently no-ops the offset.

Also note: the `volume` callback's `f` is the **audio-local frame**
(starts at 0 when the clip begins), not the composition frame —
relevant for crossfade math. The interpolation keypoints above are
in audio-local frames.

Uses three audio sources: music bed (fades up), VO (drops in at frame
30 via Sequence), and (silent) gameplay capture for the closer (muted).

**Integration point (c) — Custom font in MP4 export.**

**Design lock at plan time:** `BurnedDisplay` is **Clash Display**
(variable woff2 already in BURNED at
`public/fonts/ClashDisplay-Variable.woff2`, weight 200–700). The
trailer inherits the product's existing display face — does not fork
a new one. Rationale: the spike validates the rendering pipeline
against the actual production face used elsewhere (HTP headlines,
board chrome), so the "validated" stamp transfers to Phase 4 without
re-validation. Using a placeholder font in the spike then switching
to Clash Display in Phase 4 would defeat the spike's purpose.

```ts
// useFonts.ts
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let loaded = false;
export function useFonts() {
  if (loaded) return;
  loaded = true;
  loadFont({
    family: 'Clash Display',
    url: staticFile('fonts/ClashDisplay-Variable.woff2'),
    weight: '200 700',  // variable font weight range — PHASE 0 SPIKE QUESTION
    format: 'woff2',
  });
}
```
`@remotion/fonts.loadFont()` auto-blocks the render until the font is
ready — no manual `delayRender` / `continueRender`. Used in
`Root.tsx` at top.

**Variable-axis multi-weight spike test (P1.10 — pulls Phase 4 Unit
4.0 spike into Phase 0).** Remotion 4.0.x docs do NOT document
`weight: '200 700'` range syntax with `@remotion/fonts.loadFont()`;
Phase 4 deepening had added a Unit 4.0 entry spike specifically to
resolve this question. Phase 0's Unit 0.5(c) is the FIRST place the
question can be answered — landing it here saves a Phase 4-entry
delay AND prevents a silent-pass failure mode.

Spike renders **3 text lines at weights 200 / 400 / 700** from the
SAME loaded variable woff2, each with the same word ("BURNED" — bold
all-caps mirrors the production logo treatment). Visual inspection
of the exported MP4:

- **PASS criterion:** all three weights are visually DISTINCT (200 is
  visibly lighter / hairline strokes; 400 is mid-body; 700 is bold
  with thick strokes). The variable-axis range syntax works.
- **FAIL criterion:** all three weights look identical (Remotion
  ignored the range; the rendering engine used a single weight
  default). Surface to Phase 3 escalation: regenerate static-weight
  woff2 subsets via `pyftsubset` for each used weight (200/400/700);
  Phase 4 imports 3 separate `loadFont()` calls with `weight: '200'`,
  `weight: '400'`, `weight: '700'`. Document the FAIL outcome in
  `spike-results.md` and add to Phase 3's deepening agenda.

**Why this matters:** the pre-deepening single-weight 700 test only
verified "Clash Display rendered" — Chromium-in-Remotion would
visually pass even if the range syntax failed silently, because it
falls back to whatever weight the loaded file defaults to. Testing
3 weights catches the silent fallback. Phase 4's Unit 4.0 spike is
now REDUNDANT and CAN be dropped from Phase 4 (Phase 4 deepening
should re-validate when this lock lands).

Multiple weight families later: use
`await Promise.all([loadFont(...), loadFont(...)])` if adding
secondary faces (General Sans, JetBrains Mono).

**Integration point (d) — HTP dossier placeholder via Playwright.**
`capture-htp-scroll-burned.ts` clones UMB's script. Diff:

- URL: `http://localhost:5173/howtoplay.html` (BURNED Vite dev) for
  Phase 0 spike. Production URL (`burned-cxa.pages.dev`) deferred to
  Phase 3 after deploy migration completes.
- Output: `videos/trailer/public/htp-fullpage.png`.
- 1920×1080 viewport, scroll-by-200px-then-wait-80ms loop (same UMB
  trick). **Compatibility verification REQUIRED at spike-start (P2.13)** —
  the pre-deepening claim "verified compatible with BURNED's
  useScrollReveal" was assertion-by-fiat, not measured. UMB's
  scroll-reveal differs from BURNED's. The actual verification step:
  Phase 0 executor runs the capture script against the local Vite dev
  HTP page with DevTools open + breakpoint on `useScrollReveal`
  internals; confirms all `[data-reveal]` elements transition to
  `opacity: 1` after the scroll-and-wait loop completes (NOT after a
  fixed timer). If incompatible (e.g., ScrollTrigger doesn't fire on
  Playwright's synthesized scroll events), the FAIL path triggers
  alternate capture: pre-render the HTP page in a real browser session,
  page-down through reveals manually, screenshot once all `[data-reveal]`
  elements are visible. Spike-results.md records which path succeeded.
  Real path: `src/client/howtoplay/hooks/useScrollReveal.ts` (NOT
  `scroll/` — pre-deepening typo). The file uses `start: 'top 85%',
  once: true` per reveal element.
- Reports `scrollHeight` so Phase 3 can compute the Remotion scroll
  distance. BURNED HTP's 10 acts produce ~8000–15000 px total height;
  spike's 800-px scroll over 60 frames is intentional — viability
  check only, not production scroll math.
- **Preflight:** before launching Playwright, the script does a
  `fetch` HEAD against `http://localhost:5173/howtoplay.html`. On
  `ECONNREFUSED`, exit with: *"Vite dev server not running. Open a
  separate terminal and run `pnpm dev` from the burned project root,
  then re-run this script."* Document in `spike-results.md` which
  terminal hosts Vite during capture.

`SpikeS01_Cascade.tsx` renders the captured PNG with a `translateY`
interpolation:
```tsx
<Img
  src={staticFile('htp-fullpage.png')}
  style={{ transform: `translateY(${interpolate(frame, [0, 60], [0, -800])}px)` }}
/>
```
*Production scroll math (full scrollHeight → trailer cascade-time
interpolation) is a Phase 4 decision; the spike validates the
rendering pipeline only.*

**Integration point (e) — Archer-grammar transition vocabulary
(RENDER-VALIDATE all three; Phase 4 picks final ranking).**

The spike's purpose is to validate that pure Remotion can render
all three Archer-grammar transition candidates without artifacts.
**The spike does NOT rank them or lock roles** (P2.3) — that's Phase
4 design work. Phase 0's role: prove each candidate is technically
achievable in pure Remotion + provide enough mechanical specification
that Phase 4 inherits a stable contract, not a re-research surface.

**Starting recommendation (Phase 4 may revisit during deepening):**

| Candidate | Recommended use | Rationale |
|-----------|-----------------|-----------|
| **Classification-stamp slap** | Scene-to-scene transitions | Maps to Pendleton briefing-room aesthetic; continuity with `DramaOverlay.tsx`'s existing stamp-reveal motion |
| **Iris wipe** | Cold-open → Act 1 boundary; fallback for stamp-slap | Genre-classical (60s spy films); achievable in pure Remotion with `<clipPath>` |
| **Kinetic typography** | Goofy-stat overlays (R11) — NOT scene-to-scene | Scene-to-scene kinetic-type reads as "another AI startup trailer" (Anthropic / Cursor launch cliché); constrained to stat overlays preserves novelty |

Phase 4's deepening pass may re-rank if implementation reveals
artifacts the spike didn't catch, OR if Phase 1 beat-sheet structure
makes one candidate's mechanical shape unworkable.

**Stamp-slap mechanical shape contract (P2.18 — for Phase 4 inheritance).**
Pre-deepening single-sentence spec was insufficient. Full mechanical
contract:

| Property | Value | Rationale |
|----------|-------|-----------|
| Source graphic | CLASSIFIED stamp SVG (Phase 3 produces; split-layer per ADR — frame.svg + text.svg) | Reuses BURNED's existing stamp vocabulary |
| Rotation range | Lands at **-3°** (slightly tilted left, Archer-style) from start angle of **-8°** | Phase 1 deepening locked the -3° tilt for visual chrome stamps |
| Scale envelope | `0.95 → 1.04 → 1.0` (overshoot + settle) per Phase 1 Unit 1.4 lock | NOT scale(0) → scale(1.4) → scale(1.0); pre-deepening had the direction inverted |
| Easing curve | `EASE_OUT (0.16, 1, 0.3, 1)` emil curve (registered in `src/lib/animations.ts` per Phase 4 ADR) | Emil-coded snap-then-settle, matches BURNED's existing motion grammar |
| Duration | 12 frames total — 6f scale-in (0.95→1.04), 4f settle (1.04→1.0), 2f hold | 0.4s total at 30fps reads as snap, not gradual |
| Transform origin | `center` (NOT `top-left` or default) | Ensures rotation + scale pivot around stamp center, not corner |
| Audio cue (Phase 4 layer) | Single "thunk" SFX at landing frame, ~30ms duration | Reinforces tactile feel; Phase 4 sources |
| Coverage | Stamp lands as overlay on the outgoing scene's final frame; full scene transition triggered after stamp settles | NOT full-screen wipe — stamp is a chrome layer over a hard cut |

This contract is **not a Phase 0 lock** — Phase 4 may amend during
deepening if implementation surfaces a constraint that changes the
shape. But Phase 4 inherits this as a starting point, not a blank
slate.

**The spike renders all three as sub-clips** (each is a 2-second
sub-clip inside the larger spike composition; spike validates RENDER,
not ranking):

```tsx
// SpikeS01_Cascade.tsx — transition vocabulary sub-clips (render-only validation)
<Series>
  <Series.Sequence durationInFrames={60}><SpikeStampSlap /></Series.Sequence>
  <Series.Sequence durationInFrames={60}><SpikeIrisWipe /></Series.Sequence>
  <Series.Sequence durationInFrames={60}><SpikeKineticType /></Series.Sequence>
</Series>
```

- **Classification-stamp slap.** Stamp graphic rotates from -8° to
  -3° + scales 0.95 → 1.04 → 1.0 over 12 frames with `transform-origin:
  center`. Pure Remotion (interpolation of rotation + scale with emil
  easing curve).
- **Iris wipe.** Circular SVG mask animating from full-screen to
  point. Achievable in pure Remotion with `<clipPath>` + interpolated
  radius.
- **Kinetic typography reveal.** Single-line text appears
  word-by-word with per-word interpolated `opacity + translateY`.
  Pure Remotion.

**Pass criterion.** All five points (a–e) clear in
`out/spike-frame-test.mp4`:

- (a) Bare `<Series>` of two `<Series.Sequence>` blocks renders with
  scene-internal fade overlay reaching opacity 1.0 by the boundary
  frame. No frame-skipping, no overlay-clipping at the cut.
- (b) Music bed audibly drops to 20% when VO drops, returns to 60%
  after VO ends.
- (c) Custom-font text overlay renders 3 weights (200/400/700) from
  the SAME variable woff2, each visually distinct. If all weights
  render identically, escalate to Phase 3 pyftsubset per integration
  point (c) FAIL contract above.
- (d) HTP dossier scrolls smoothly in the cascade window. Capture
  script's GSAP+ScrollTrigger compat path documented in
  `spike-results.md`.
- (e) **All three** Archer-grammar transition sub-clips land without
  visual artifacts. If stamp-slap render fails: Phase 4 may pick
  iris wipe as primary (or vice versa). If iris fails: surface the
  pure-Remotion-can't-deliver finding to Phase 4 deepening for
  decision. If kinetic typography fails: the goofy-stat overlay
  design needs a different motion grammar for Phase 4.

**Spike-results.md MUST document per-candidate render outcomes**
(rendered cleanly / had artifacts / failed entirely) with screenshots
or notes. Phase 4 reads this as the technical-feasibility input to
its ranking decision (Phase 4 ranking is design work, not Phase 0
work). Phase 0's spike doesn't pre-judge Phase 4's pick.

**Fail-mode isolation rule:** if the combined render fails any single
point, produce an isolated single-point repro composition
(`SpikeAudio.tsx`, `SpikeFont.tsx`, `SpikeTransition.tsx`) before
remediation. Bisecting a 5-concern combined render is more expensive
than rendering a 1-concern isolated repro.

**Patterns to follow:**

- UMB scene-boundary precedent: UMB uses bare `<Series>` with
  scene-internal overlay components, NOT `<TransitionSeries>` (verified
  via `projects/undercover-mob-boss/videos/trailer/src/TrailerV3.tsx:28-56`).
  ADR #4 revised matches the UMB pattern; BURNED inherits it.
- UMB audio precedent: `Html5Audio` placed at absolute `<Sequence from={frame}>`. New `<Audio>` from `@remotion/media` is the modernization.
- UMB font loading: `projects/undercover-mob-boss/videos/trailer/src/hooks/useFonts.ts`
- UMB HTP capture: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`

**Test scenarios:**

- **Happy path:** `pnpm render` (spike target) produces a valid 1920×1080 H264 MP4 at `out/spike-frame-test.mp4` in <5 minutes.
- **Happy path:** `capture-htp-scroll-burned.ts` produces a valid PNG at `public/htp-fullpage.png` with non-zero file size.
- **Integration:** Custom font multi-weight test passes in MP4 export — weights 200/400/700 visually distinct (verified by viewing the rendered file, NOT just studio preview). If all three render identically, variable-axis range syntax has failed silently — escalate to Phase 3 pyftsubset per Unit 0.5(c) FAIL contract.
- **Integration:** Audio crossfade audibly works in MP4 export (verified by listening to rendered file).
- **Edge case:** Playwright capture script handles BURNED's HTP `useScrollReveal` GSAP animations — the 200px-scroll-then-80ms-wait loop triggers every `[data-reveal]` element before screenshot.
- **Edge case:** Vite dev server is running before capture script invocation (script fails fast with clear error if not).
- **Error path:** Missing font file produces clear error (auto-tracked promise rejection from `@remotion/fonts.loadFont`).

**Verification:**

- `out/spike-frame-test.mp4` exists and plays cleanly.
- All five integration points (a–e) pass per inspection. Per-candidate
  render outcomes for (e) documented (Phase 4 inherits as feasibility
  input, not as ranking lock).
- `spike-results.md` documents per-point pass/fail with screenshots /
  notes. Remediation plan for any failures. Variable-woff2 multi-weight
  test result explicitly noted (PASS = ship variable file; FAIL =
  Phase 3 pyftsubset escalation).
- **Composite-viability disposition** for Phase 4 recorded in
  `spike-results.md` (cleared = all 5 points rendered cleanly;
  restructured = at least one point needs Phase 4 amendment;
  cut = trailer concept needs brainstorm-level reopen).

---

### Unit 0.6 — R5 Sterling-Screams-Lana Cameo Eval (P1)

- [ ] **Unit 0.6: R5 Sterling-Screams-Lana Cameo Eval**

**Goal:** Determine if a TTS-or-hybrid scream cameo ("VERA!!!") clears
Archer-grade authenticity, or if R5 must be cut entirely. Brainstorm
rule: flat scream is worse than no scream.

**Requirements:** R5 (Vera scream cameo, authentic or cut).

**Dependencies:** Unit 0.2 (engine + voice cast chosen — the
**screamer is Dash**, not Vera; in Sterling lore the screamer is the
agent character, the addressee is the named target). Path (a) **reuses
the isolated scream clip already generated in Unit 0.2 Step 1
Paragraph 3** ("VERAAA!!!") — this is the single clip both Unit 0.2
Step 4 acceptance and Unit 0.6 evaluate. Path (b) speech-to-speech
target is the **Dash voice from Unit 0.2 lock**, applied to Briggsy's
owned-voice source recording.

**Files:**

- Create: `videos/trailer/sample-eval/r5-scream/path-a-tts.wav` — Path
  A: pure-TTS scream (ElevenLabs v3 with `[shouts]` or `[shouting]`
  audio tag — these are documented v3 tags; `[scream]` is undocumented
  community-anecdotal and used only as fallback).
- Create: `videos/trailer/sample-eval/r5-scream/path-b-hybrid.wav` —
  Path B: real human scream + Voice Changer post-processing.
- Create: `videos/trailer/sample-eval/r5-scream/scream-eval.md` —
  protocol + listener responses + decision + post-eval cleanup
  verification.

**Approach:**

**Path (a) — TTS scream.** Generate via ElevenLabs v3 with documented
intensity tags on the locked Dash voice: **primary attempt `[shouts]`
or `[shouting]`**; if neither delivers the volume-discontinuous
Sterling-CODED scream characterized in cadence-spec.md (volume
dynamics §), **fallback to undocumented `[scream]` tag** as a test.
Single 1.5-second clip. CAPS letters in the script ("VERAAA!!!") for
additional intensity signal. Note: per TTS research, ElevenLabs v3's
documented audio tags do NOT officially list `[scream]` — `[shouts]`
is the safer documented surface. The Step 1 paragraph 3 of Unit 0.2
already generates this clip; Path (a) reuses it directly.

**Path (b) — Hybrid scream.** Process:
1. Real human scream recording: Briggsy (or volunteer) screams
   "VERAAA!!!" into phone or laptop mic. **Recording conditions**
   (specified to prevent clipping degradation that Voice Changer
   cannot repair):
   - Mic distance: **12–18 inches from mouth** (phone) or **6+ inches**
     (laptop) — too close clips the loud peaks.
   - Test take first: open Audacity, check waveform — flat-top
     clipping means re-take further from mic or lower input gain.
   - Multiple takes: 5–10 takes, select the one with peak around
     **-3 dBFS** (loud but unclipped). Brief delivery dynamics
     matter — Sterling-style scream is volume-discontinuous from
     baseline conversation, not a ramp.
   - Length: 1.5s total. The "VERAAA!!!" should pop instantly, not
     ramp up.
2. ElevenLabs **Voice Changer / Speech-to-Speech** applies the **Dash
   voice timbre** (the locked Unit 0.2 voice — Dash is the screamer)
   to the owned recording. API surface (verified):
   `POST /v1/speech-to-speech/{voice_id}` with recommended `model_id:
   eleven_multilingual_sts_v2`. Set `remove_background_noise=true` if
   recorded on phone in noisy environment. Cost: ~25 chars billed
   against Creator's 100K monthly allowance — negligible. Briggsy's
   own voice → Dash timbre keeps the legal path clean (owned source
   audio).
3. Output: `path-b-hybrid.wav`.

**Listener protocol.** Document in `scream-eval.md`:

- **Listeners:** 3 minimum Archer-fan testers (raised from 2 — P2.34;
  cut outcome permanently removes Vera, asymmetric to ≥4-of-6 used in
  Unit 0.2). 4 target for marginal-case disambiguation. Pool
  independence rule applies (see Documentation / Operational Notes) —
  Unit 0.6 listeners must NOT have been Step 0.5 readers or Step 3
  MUSHRA panelists.
- **Stimuli:** Three clips played in randomized order — (a) Path A
  TTS, (b) Path B hybrid, (c) a **non-Benjamin authentic-human scream
  in Sterling-coded register** (sourced from a voice-actor portfolio
  reel, stock library, or publicly-licensed scream clip in the
  Sterling/Archer cadence space) as the reference. **Benjamin's
  archival scream is NOT used** — this aligns with the ADR #13
  design principle (don't anchor candidates against the impression
  target), removes fair-use friction, and prevents anchoring bias
  where Path A/B lose to the original because they're not Benjamin.
- **Question:** *"Which of these would you ship in a comedy trailer
  where the joke depends on the scream being authentic? You can pick
  multiple. You can pick none."*
- **Acceptance:** ≥2 of 3 listeners select at least one of (a) or
  (b) AND no listener selects "none" exclusively across the panel.
  Raised from the pre-deepening "1 of 2 selects (a) or (b)" — that
  threshold cleared on a single listener's pick, which is too thin a
  basis for a character-removal decision. The ≥2-of-3 floor matches
  the impact (Vera permanently removed from trailer if cut). If "none"
  is the consensus OR fewer than 2 listeners pick (a) or (b), R5 is cut.

**Fail-action.** If neither (a) nor (b) is selected by any listener:

- R5 is cut entirely.
- Vera is removed from the trailer (no non-scream cameo substitute per
  brainstorm cut-handling rule).
- If Vera was Unit 0.2's selected cold-open speaker for R14, the
  cold-open speaker re-selects from {Sable, Janet} OR R14 falls back
  to non-voice cold-open per the R5-research-gate routing.

**Budget.** Included in Unit 0.2's $50 envelope (ElevenLabs v3 hour
allowance covers the scream clip generation in Path A; Path B uses
already-paid Voice Changer credits).

**Patterns to follow:**

- ElevenLabs v3 emotion tags: `[scream]`, `[laughs]`, `[whispers]`
- ElevenLabs Voice Changer speech-to-speech: documented in elevenlabs.io
- VOICE_DIRECTION anti-pattern: same guard applies — the `[scream]` tag
  is the engine API; do NOT prepend instructional text to the script
  parts.

**Test scenarios:**

- **Happy path:** Path A TTS generation produces valid WAV (RIFF header
  + non-zero data) via `generate-tts-eval.ts --engine elevenlabs
  --include-scream`.
- **Happy path:** Path B Voice Changer call produces valid WAV from the
  owned source recording.
- **Test expectation: listener-judgment evaluation** — no automated
  pass/fail on subjective scream quality.

**Verification:**

- Both WAV files exist and play cleanly.
- `scream-eval.md` documents listener responses verbatim + decision
  (scream kept via (a) / (b) / cut entirely).
- **Scream outcome lock** recorded in `scream-eval.md` AND
  propagated to `PHASE-0-EXIT.md` per template. If R5 is cut, the
  exit doc records "Vera removed from cold-open candidate pool" so
  Unit 0.3 (which depends on Unit 0.6 per refined ordering) picks
  this up.
- **Post-eval reference-clip cleanup**: confirm any non-Benjamin
  reference clip used during eval is documented (source +
  license/attribution) in `scream-eval.md`. If any Benjamin clip
  somehow got pulled into the eval workspace as informal reference
  (it shouldn't, per protocol above), delete it from
  `sample-eval/r5-scream/`, clear local browser/Playwright caches,
  and verify with `git ls-files sample-eval/r5-scream/` that no
  archival reference audio is tracked.

---

## System-Wide Impact

- **Interaction graph:** All five gate outcomes flow into Phase 1 (Beat
  Sheet Lock) via `PHASE-0-EXIT.md` (template specified below). Voice
  cast (R4 + R14 + R5) determines scene voice assignments — Unit 0.2
  locks briefer voice, Unit 0.6 outcome filters Unit 0.3 candidate
  pool, Unit 0.3 locks cold-open line + speaker, Unit 0.4 validates
  tone on the locked briefer voice. Spike outcome (Unit 0.5)
  determines Remotion package set + transition vocabulary scope
  (stamp-slap primary lock; iris fallback; kinetic typography
  constrained to goofy-stat overlays). R15 chrome stamp design
  (placement + color + font, locked at plan time in Unit 0.3 Step 2)
  validated through Unit 0.3 + 0.5.

- **Error propagation:** If Unit 0.2 Paths A/B/C all fail, Phase 0
  exits with **Sub-phase 0a deliverable** (Path D casting brief Brief
  Memo to Briggsy for explicit approval + budget). Phase 1
  structural decisions independent of voice identity may proceed in
  parallel. If Path D also fails, Phase 0 produces a
  **Brainstorm-Restructure Memo** with three explicit options for
  Briggsy (ship synthetic-tinged Dash / restructure to non-Dash
  briefer / abandon trailer concept). If Unit 0.3 fails both
  audio-line rewrites + R15-only fallback decode, R14 surfaces back
  to Briggsy as a brainstorm-level question. If Unit 0.4 fails twice,
  played-straight Key Decision re-opens — bubbles to Briggsy as a
  brainstorm-level question.

- **State lifecycle risks:** TTS engine API costs accrue per evaluation
  pass. Budget cap $50 = hard stop, not "we'll spend more if needed."
  Per `feedback-imagen-budget.md` — one test paragraph first, align,
  then batch. WebMUSHRA listener-pool exhaustion (no 6 listeners
  available within reasonable timeframe) falls back to fewer-listener
  evaluation with stated reduced confidence.

- **API surface parity:** None — Phase 0 produces eval artifacts, not
  user-facing surfaces.

- **Integration coverage:** Spike (Unit 0.5) is the explicit integration
  coverage for Phase 4 — five composite-integration points validated
  end-to-end before any beat-sheet locks.

- **Unchanged invariants:** BURNED game code untouched. BURNED's
  `pnpm-workspace.yaml` not added to packages: array (trailer is
  isolated). Phone bundle budget (<100 KB gz) unaffected. Production
  WebSocket / Durable Object / dispatch architecture unchanged. The
  brainstorm requirements R1–R15 are not amended — only gate outcomes
  resolve deferred questions.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cadence-spec characterization research thin (working-memory recall vs primary sources) | Medium | High (whole unit depends on a strong spec) | Step 0 explicitly cites every spec claim against a source; if a source can't be found, claim isn't load-bearing in the spec. Reread is cheap. |
| Sterling-CODED register too generic — listeners describe it as "noir narrator" without Archer / spy specificity | Medium | Medium | Cadence-spec adds genre-anchor mannerisms (sardonic micro-lift on terminals, the dry-amused "hmm" beat) that are Sterling-tradition-specific without being Benjamin-specific. |
| All four Paths A–D fail cadence-match | Low | High (last-resort design pivot bubbles to Briggsy) | Documented in Step 5 fail-action — design pivot, not abandon. Trailer ships with TTS-tinged register that owns its synthetic-ness, or with restructured non-Dash briefer. |
| Path D budget approval delays | Low | Medium | Path D is a separate **Sub-phase 0a** deliverable, not an in-flight ladder step. Phase 0 exits with the Sub-phase 0a Brief Memo when Paths A/B/C fail. Phase 1 structural decisions independent of voice identity may proceed in parallel during casting. |
| Path D actor delivery exceeds reasonable timeline | Medium | Medium | Sub-phase 0a Brief Memo includes explicit timeline expectations (1–2 weeks typical actor turnaround on Voices.com / Voice123). If exceeded, escalate to Brainstorm-Restructure Memo (three explicit options for Briggsy: synthetic-tinged Dash / non-Dash briefer / abandon). |
| Listener recognizes voice as Benjamin clone unprompted | Low (cadence-spec is style-only) | High (means engines drifted toward impression, not style) | Re-spec the cadence input — strip any identity-suggesting characteristic, re-run engine matrix. |
| MUSHRA tester recruitment delay (no 6 listeners within 1 week) | Medium | **Medium** (gate blocks Phase 1) | Reduce to 4-listener pass with stated reduced confidence; document gap explicitly in results.md. Recruitment flow specified in Step 3 §Recruitment flow. Pool independence rule enforced — cross-unit listener overlap surfaces as a Briggsy-decision Brief Memo, never silent acceptance. |
| WebMUSHRA hosting blocker (laptop not externally addressable + PHP runtime requirement) | Was implicit | Was implicit | Step 3a hosting ranking corrected 2026-05-17 (P0.2): Cloudflare Tunnel ($0, laptop-awake — DEFAULT, PHP runs locally) OR Cloudflare Pages + Worker results-bridge ($0, ~30min setup — PHP not available on Pages, Worker bridges results to D1) OR VPS ($4–6/mo fallback). The pre-deepening "Pages subpath recommended" framing would have silently lost listener data — Pages is static-only, no PHP. |
| Step 0a curl probes pass on auth/listing but real TTS endpoint is broken/rate-limited | Low | High (engines look ready but generate-tts-eval fails mid-Step-2 with billed retries) | Step 0a's `check-tts-readiness.ts` probes each engine's REAL TTS endpoint (10-char throwaway) — not just auth + model listing (P1.11 fix 2026-05-17). |
| ElevenLabs Creator 100K char allowance exhausted by adversarial re-spec iteration before Path locks | Medium | High (Phase 0 stalls until billing-cycle reset OR forces premature Path-D escalation) | Char-budget tripwire in `char-budget.json` — 50K yellow warning, 80K hard halt with override flag (P1.12 fix). Plan budgets ~76K for the worst-case Path A re-spin × 3 voices × 3 paragraphs scenario; tripwire surfaces overshoot before billing exhaustion. |
| Pool overlap across gates compounds priming bias (Harry signs Step 0.5 + sits Step 3 + Unit 0.3 + Unit 0.4) | Medium | Medium-High (joint-pass guarantees invalidated; Phase 6 may surface drift Phase 0 missed) | Listener pool independence rule (P1.13 fix) — hard exclusion of prior-unit listeners; pool tracked in `listener-roster.md`; cross-overlap conflicts surface to Briggsy as Brief Memos, never silent. Phase 6 N=6 panel is fresh listeners zero-overlap with Phase 0 (ADR #21 cross-phase). |
| Voice locked at Phase 0 but Phase 6 cold-decode discovers Ceiling drift | Low (multi-listener panel + forced-choice probe catches most) | High (re-spec adds 2-4 weeks + ~$24 + Phase 4 re-render of voiced scenes) | Voice lock is PROVISIONAL until Phase 6 N=6 (P0.3 fix). Optional Phase-4-entry mini-cold-decode panel (2 fresh listeners on 1 rendered scene) catches drift earlier. Phase 6 panel is the absolute backstop. |
| Path D contract missing AI-disclosure clause exposes Briggsy under NO FAKES / right-of-publicity law | Low | High (legal exposure on a portfolio project) | Sub-phase 0a deliverable now includes draft contract template with AI-disclosure clause as a hard requirement before casting begins (P2.26 fix). |
| Path B Briggsy-voice clone persists on ElevenLabs infrastructure indefinitely after Phase 0 | Medium | Medium (latent exposure if API key ever leaks) | Path B preconditions verify deletion-on-request procedure; post-Phase-0 cleanup deletes the IVC profile within 7 days if Path B not selected (P2.25 fix). |
| Spike reveals Remotion 4.0.438 incompatibility with `@remotion/media` `<Audio>` | Low | Medium | Pin to latest 4.0.x compatible release; fallback to UMB's `Html5Audio` pattern (audio crossfade becomes manual frame-math). Document downgrade in spike-results.md if triggered. `@remotion/transitions` is no longer pre-installed per ADR #4 revised; bare `<Series>` + scene-internal overlays is the validated production pattern. |
| Spike custom-font fallback in MP4 export | Low | Medium | `@remotion/fonts.loadFont()` auto-blocks; if it still falls back, the bug is in our config — debug session in Phase 0 (don't carry to Phase 4). |
| Vite dev server not running when capture-htp-scroll-burned.ts invoked | Low | Low | Script fails fast with clear error message naming the prerequisite. |
| Deploy migration completes mid-Phase-0 and BURNED HTP URL changes | Low | Low | Phase 0 spike uses local Vite dev URL (`http://localhost:5173/howtoplay.html`). Production URL deferred to Phase 3. |
| Path D restructure changes briefer voice DNA materially | Medium | High | Document the new briefer's voice DNA in Path D outcome notes. Phase 1 beat sheet rewrites around new briefer. R6 vocabulary discipline survives — only the speaker changes. |
| R5 scream Path (a) and (b) both fail listener test | Medium | Low | R5 cut. Vera removed from trailer per brainstorm cut-handling. Beat sheet restructures around scream absence. |

---

## Open Questions

### Resolved During Planning

- **Sterling-CODED, not Sterling-cloned (ADR #13):** Design principle
  locked 2026-05-16. Mimicry of style (deadpan mid-Atlantic clip,
  sardonic lift, deliberate pace) — never replication of Benjamin's
  identity. Mirrors BURNED's "Archer w/o being Archer" visual rule per
  spec §3.6. Legal floor (ElevenLabs ToS + Tennessee ELVIS Act + EU AI
  Act + proposed NO FAKES Act) aligns with the design choice as
  supporting context.
- **Blind-tester protocol:** MUSHRA (ITU-R BS.1534-3) with WebMUSHRA
  hosting, 6–8 listeners. Acceptance is **register-recognition
  testing**, not actor-identity testing — listeners describe the
  voice in their own words. Success = Sterling-coded register cluster
  terms + character-fit yes/no + uncanny check + **joint-pass** (≥4
  same-listener clear all three dimensions) + **MUSHRA ±10 points of
  non-Benjamin reference clip** (reference-anchored). Bonus-signal
  disambiguation: "same actor or same style?" follow-up if listener
  invokes Archer/Sterling.
- **Three-band spectrum SHAPE:** Floor / Target Band / Ceiling
  required in `cadence-spec.md` per Step 0. Sterling-CODED is a
  spectrum, acceptance is the Target Band, Ceiling triggers re-spec.
  Band CONTENT is filled by Step 0 research (the plan provides a
  starting hypothesis, not a finalized lock).
- **TTS budget envelope:** $50 retained as safety margin
  (research-corrected real ceiling ~$24); separate $0–500 line for
  Path D hybrid as Sub-phase 0a deliverable.
- **WebMUSHRA hosting:** Cloudflare Tunnel from laptop ($0, ~5min
  setup) recommended as DEFAULT — supports PHP runtime that WebMUSHRA
  needs for result submission. Cloudflare Pages subpath ($0) is
  option 2 BUT requires a Cloudflare Worker results-bridge (PHP not
  available on Pages). VPS ($4–6/mo) is fallback. Decision documented
  in Step 3a output. Access control mandatory regardless of host
  (non-guessable subpath + per-listener token + Cloudflare Access).
- **Twitter/X mobile crop:** 1:1 safe square within 16:9 frame. No
  separate vertical track.
- **R14 cold-open candidate lines:** Three brainstorm originals
  documented as REJECTED (machine-wordplay missing per R14
  requirement); two new candidates (#4, #5) carry forward to Step 3
  testing.
- **Path B Voice Cloning shape:** Instant Voice Cloning only.
  Professional Voice Cloning eliminated (30-min recording session was
  a hidden schedule dependency); if Instant fails, Path B fails and
  ladder proceeds to Path C.
- **`BurnedDisplay` font lock:** Clash Display (variable woff2 already
  in BURNED at `/public/fonts/ClashDisplay-Variable.woff2`, weight
  700 for display). Inherits product DNA, doesn't fork new face.
- **Archer-grammar transition vocabulary lock:** Classification-stamp
  slap PRIMARY (scene-to-scene transitions); iris wipe FALLBACK
  (cold-open → Act 1 boundary if stamp fails); kinetic typography
  CONSTRAINED to goofy-stat overlays (R11 surface only — explicitly
  NOT a scene-to-scene transition because it's the AI-trailer
  cliché). Locked at plan time; Unit 0.5 spike validates all three
  render in pure Remotion.
- **R15 chrome stamp placement / color / font minimum-spec:**
  Bottom-third placement (Archer classification-stamp convention) +
  BURNED orange/teal palette (`--paper-signal-orange` /
  `--paper-ink`) + Clash Display. Locked at plan time so decode-eval
  tests structural design, not placeholder design.
- **Unit ordering:** Refined to 0.1 → (0.2 Steps 0/0a/0.5 ∥ 0.5
  spike) → 0.2 Steps 1.5/2/3a/3/4/5 → 0.6 → 0.4 → 0.3. Unit 0.6
  lands BEFORE Unit 0.3 to filter Vera from candidate pool if cut.
- **Cadence-spec adapter shape:** Source-of-truth `cadence-spec.md`
  + three per-engine adapter files (`cadence-spec-elevenlabs.json`,
  `cadence-spec-gemini.md`, `cadence-spec-openai.md`) generated in
  Step 1.5. ElevenLabs v3 does NOT accept long-form natural-language
  steering — needs numeric voice_settings + sparse bracket tags +
  Voice Design prompt. Gemini + OpenAI accept the natural-language
  spec via their respective steering surfaces.
- **VOICE_DIRECTION anti-pattern guards:** Per-engine variants
  codified at API call sites (ElevenLabs bracket-tag-only / Gemini
  section-marker / OpenAI separate-parameter). Generalized from UMB's
  original Gemini-specific guard.

### Deferred to Implementation

- **Cadence-spec characterization completeness:** Step 0 output
  document quality determined by Unit 0.2 execution AND the Step 0.5
  audio pre-flight gate (one Archer-fan + one non-Archer-fan reader
  hear a Gemini-free-tier clip from the spec, both must agree
  Target-Band-Yes + No-Benjamin-impression). Re-spec triggered if
  Step 4 acceptance fails on "too generic" grounds OR if Step 0.5
  pre-flight readers flag spec inadequacy.
- **Which TTS engine + voice path clears R4 cadence-match:** answered
  by Unit 0.2 listener pass (Path A preset / Path B Briggsy
  Instant-clone / Path C Gemini or OpenAI / Sub-phase 0a hybrid VO /
  Brainstorm-Restructure).
- **Specific Voice Library voice ID selection (Path A):** answered by
  Step 2 — Briggsy + executor browse the ElevenLabs Voice Library for
  mid-baritone-male voices in the deadpan-spy register, shortlist 2-3,
  generate samples for the Step 3 listener pass to score.
- **Which candidate cold-open line decodes:** answered by Unit 0.3
  listener pass.
- **Cold-open speaker assignment (Sable / Janet / Vera):** answered
  by Unit 0.2 outcome + Unit 0.6 outcome (Vera dropped from pool if
  R5 cut). Specific assignment per candidate in Step 1 lands after
  both upstream units resolve.
- **Whether the played-straight thesis survives the tone gate:** answered
  by Unit 0.4 listener pass on the locked briefer voice.
- **Whether Lottie-inside-Remotion is needed for Archer transition
  vocabulary:** answered by Unit 0.5 (e) sub-clip render. If any of
  stamp-slap / iris / kinetic typography fails in pure Remotion,
  `@remotion/lottie` installs on-demand in Phase 4 for the specific
  failing transition.
- **Whether the R5 scream is kept via Path (a), Path (b), or cut:**
  answered by Unit 0.6 listener pass.
- **Specific brass-jazz hook for cold-open spike:** any royalty-free
  placeholder works for spike; full source decision in Phase 3.
- **Specific non-Benjamin Sterling-coded reference clip for Unit 0.6
  hidden reference:** sourced during Unit 0.6 setup from voice-actor
  portfolio reels (voices.com / voice123.com) or stock libraries.
  Documented with source + license/attribution in `scream-eval.md`.

- **MUSHRA non-Benjamin reference clip (Unit 0.2 Step 3 ±10
  anchor):** selection criteria are now LOCKED at plan time (Step 3
  §Reference clip selection criteria) — top-100-rated mid-baritone-male
  voices.com/voice123.com portfolio reel with deadpan/spy/noir tagging,
  ≥3 industry sources, reviewed by Briggsy + Step 0.5 cold-reader
  before lock. Implementation = identify the specific reel from the
  candidate list of 3.

---

## Documentation / Operational Notes

- All gate evaluation artifacts land in
  `projects/burned/videos/trailer/sample-eval/`.
- TTS API keys (Gemini, ElevenLabs, OpenAI) stored in `.env` at BURNED
  project root — loaded via `set -a && source .env && set +a` before
  any TTS script invocation (per Briggsy's autonomy rule). Step 0a
  enforces verification before any engine spend.
- VOICE_DIRECTION anti-pattern guard: **per-engine variants** at API
  call sites in `generate-tts-eval.ts` (Phase 0) and `generate-dash-tts.ts`
  (Phase 2 — when written). Three guard variants codified per Key
  Technical Decisions §VOICE_DIRECTION (ElevenLabs / Gemini /
  OpenAI). The generalized "send script text only" rule from UMB's
  Gemini-only guard is correct in spirit but mechanism is
  engine-specific in 2026.
- **`@remotion/skills` install (one-time, global, NOT per-project):**
  Clone or download from `https://github.com/remotion-dev/skills`
  into Claude Code's skills directory (typically `~/.claude/skills/remotion/`,
  matching the existing project-local pattern at `.claude/skills/`).
  Verify load on next Claude Code session start by checking that
  Remotion-specific skill rules surface in tool descriptions. **The
  npm registry returns 404 for `@remotion/skills`** — it's a Claude
  Code skills artifact, not an npm package. The previous "npx
  remotion add skills" instruction was an artifact of misreading the
  install path; the correct mechanism is GitHub clone. Run once
  before Phase 0 execution begins; not gating on Unit 0.1.
- **`capture-htp-scroll-burned.ts` ownership:** Phase 0 Unit 0.5
  WRITES the script (localhost URL pointing at Vite dev). Phase 3
  Unit 3.1 PROMOTES the script for production capture (production
  URL pointing at `burned-cxa.pages.dev`). Single script, two
  invocations — Phase 0 doesn't write a parallel script for Phase 3
  to throw away.
- Spike artifacts (`SpikeColdOpen.tsx`, `SpikeS01_Cascade.tsx`,
  `SpikeS02_Gameplay.tsx`, `SpikeCompositionMain.tsx`,
  spike-frame-test.mp4) are intentionally throwaway. Mark for removal
  in Phase 4 cleanup once real scenes ship. The
  `capture-htp-scroll-burned.ts` script is NOT throwaway (per
  ownership note above).
- Listener recruitment routing: Briggsy's Discord network + Harry
  (per `user_harry.md`) as the primary tester pool. Documented in
  each unit's protocol file with consent confirmation.
- **Listener pool independence rule (P1.13 — MANDATORY).** The
  pre-deepening "same individuals may appear in multiple unit pools;
  informally acceptable" wave-away invalidated joint-pass guarantees:
  the FIRST gate a listener participates in CALIBRATES their downstream
  judgments. If Harry signs off on Step 0.5 (cadence-spec pre-flight),
  then sits in the Step 3 MUSHRA panel, then takes Unit 0.3 cold-decode,
  then Unit 0.4 tone — his Unit-0.4 Yes vote is biased by 4 cumulative
  exposures to the cadence vocabulary + trailer thesis. The compounding
  effect breaks gate independence. Hard rule:
  - **Step 0.5 readers** are EXCLUDED from Step 3 MUSHRA, Unit 0.3
    decode-eval, Unit 0.4 tone gate, Unit 0.6 scream eval.
  - **Step 3 MUSHRA listeners** are EXCLUDED from Unit 0.3 decode-eval,
    Unit 0.4 tone gate, Unit 0.6 scream eval. (Same listener pool can
    take Step 3 multiple times for re-spec rounds, but their priors
    accumulate; flag re-pass priors in `results.md`.)
  - **Unit 0.3 decode-eval testers** are EXCLUDED from Unit 0.4 and
    Unit 0.6.
  - **Unit 0.4 tone testers** are EXCLUDED from Unit 0.6 (smaller
    pool; less critical).
  - **Phase 6 N=6 cold-decode panel** is EXCLUDED from ALL Phase 0
    units (ADR #21 cross-phase requirement; Phase 6 must surface
    drift Phase 0 missed).
  - Pool membership tracked per-listener in
    `sample-eval/listener-roster.md` with which unit they participated
    in + date. Each unit's protocol file references the roster and
    asserts zero overlap with prior units before lock. **Pool
    independence is a verifiable contract, not a vibe.**
  - **Recovery if pool exhaustion forces overlap:** if Briggsy's
    network genuinely can't supply non-overlapping listeners for
    every unit, the executor surfaces the conflict to Briggsy with
    a Brief Memo identifying which listener would overlap which
    units + estimated bias direction. Briggsy decides: accept the
    overlap (with stated reduced confidence in results.md) OR delay
    the affected unit until a fresh listener is recruited. Never
    silently overlap.

---

## PHASE-0-EXIT.md template

Phase 0 closes when this document is written and every section is
populated with a documented disposition. Phase 1 consumes it to
scaffold beat-sheet work without needing to back-read five per-unit
eval files.

A "documented disposition" is one of three states:
- **cleared** — original gate intent landed, acceptance threshold cleared
- **restructured** — fail-action redirected to a documented alternative
- **cut** — gate intent abandoned, downstream re-scopes around absence

Incomplete data (e.g., 3 of 6 MUSHRA listeners completed) without a
fail-action invocation is NOT a documented disposition; it's a failed
gate. The disposition must be explicit.

**Sign-off ceremony (ADR #22).** Phase 0 exit requires Briggsy
explicit sign-off via `.signoff` sentinel files:
- `sample-eval/PHASE-0-EXIT.signoff` — Briggsy signs off on full
  exit document. File contents: `signed-off-by: Briggsy /
  date: YYYY-MM-DD / sha256: <hash of PHASE-0-EXIT.md at sign-off>`.
- Per-unit sign-off sentinels:
  `sample-eval/r4-dash/briggsy-review-0.2.signoff`,
  `sample-eval/r14-cold-open/briggsy-review-0.3.signoff`,
  `sample-eval/tone/briggsy-review-0.4.signoff`,
  `sample-eval/spike/briggsy-review-0.5.signoff`,
  `sample-eval/r5-scream/briggsy-review-0.6.signoff`.
- A future automated `verify-briggsy-sentinels.ts` script (Phase 4
  introduces this pattern at scale) verifies git-author of the
  sentinel commit matches Briggsy's email — prevents Claude from
  fabricating sign-offs.

**Section ordering** (P2.15 — Phase 1 critical-path fields at top):

```markdown
# Phase 0 Exit Record

## Section 1 — Voice Cast Disposition (Unit 0.2) [PHASE 1 BLOCKER]

This section is the first thing Phase 1 reads. Phase 1's beat-sheet
authoring depends on the locked voice (line attribution, cadence
beats, scream cue placement).

- Disposition: [cleared | restructured-to-non-Dash | restructured-to-Sub-phase-0a | cut]
- **Voice lock provisional?: [Y/N]** — Y if Phase 6 N=6 cold-decode
  has not yet re-validated; voice cast may invalidate at Phase 6 and
  trigger Phase 0 re-spec (see Step 4 "Voice lock is PROVISIONAL"
  contract above).
- Cleared path: [A | B | C-Gemini | C-OpenAI | Sub-phase 0a (Path D) | Brainstorm-Restructure-(i)/(ii)/(iv)]
- Engine: [ElevenLabs Voice Library preset | ElevenLabs Briggsy
  Instant clone | Gemini 3.1 Flash TTS | OpenAI gpt-4o-mini-tts |
  voice-actor name from Voices.com/Voice123 | (if (iii) abandoned: N/A)]
- **Engine model version pin** (P2.20 — Phase 2 Unit 2.0 parser reads
  this): [e.g., `eleven_v3` | `gemini-2.5-flash-preview-tts` |
  `gpt-4o-mini-tts-2025-03-20`]. No `@latest` aliases — dated snapshot
  pin where engine supports.
- Voice ID / actor identifier: [string]
- Engine-adapter file path: [sample-eval/r4-dash/cadence-spec-{engine}.{json|md}]
- MUSHRA listener count: [N / 6 minimum — note any shortfall + confidence impact]
- Joint-pass verification: [N listeners cleared all three dimensions]
- **Ceiling-band history (P1.16):**
  - Ceiling-band triggered during eval?: [Y/N]
  - Re-spec iterations run: [0 / 1 / 2 / 3]
  - Final disposition cleared after re-spec: [Y/N]
  - Per-iteration cadence-spec.md diff summary: [bulleted, what was
    stripped/tightened]
- Cadence-spec.md path + Step 0.5 audio pre-flight sign-off:
  - Path: [sample-eval/r4-dash/cadence-spec.md]
  - Pre-flight reviewers: [Briggsy + <non-Archer-fan reader>]
  - Pre-flight WAV: [sample-eval/r4-dash/preflight/gemini-spec-test.wav]

## Section 2 — R14 Cold-Open Line Disposition (Unit 0.3) [PHASE 1 BLOCKER]

Phase 1 scene 1 (cold open) is shaped by this disposition. Without
the line + speaker locked, the cold open is unwritable.

- Disposition: [cleared | restructured-to-non-voice-fallback | cut]
- Line (verbatim): [string OR `N/A — non-voice fallback`]
- Speaker character: [Sable | Janet | Vera (if R5 cleared) | N/A]
- **Speaker voice ID** (P2.34 — Phase 2 Unit 2.0 parser reads this for
  the cold-open WAV generation): [engine-specific identifier — e.g.,
  ElevenLabs voice_id GUID, Gemini preset name like `Algenib`, OpenAI
  preset name like `nova` — or `N/A` if non-voice fallback]. Determined
  during Unit 0.3 cold-open spike when the candidate preset was chosen.
- Tester count: [N non-primed / 4 minimum — Unit 0.3 non-primed N
  hard floor is 4; document shortfall + recovery if applicable]
- Decode tier achieved: [Tier 1 only N | Tier 1 + Tier 2 (AI + authorship): N total | NEITHER (failed)]
- Pre-screen battery — UMB-v3 contamination check: [N primed (excluded or shortened) / N non-primed (counted)]
- ADR #21 keyword-precision check: [no render-tech keywords drove a Tier pass — verified Y/N]
- If non-voice fallback: [R15-only decode spike outcome documented + tester decode tier]

## Section 3 — Tone Disposition (Unit 0.4)

- Disposition: [played-straight-cleared | played-straight-reopened-to-brainstorm | restructured-with-non-Dash-briefer]
- Played-straight thesis: [SURVIVES | REOPENED]
- Tester count: [N / 4 minimum, Archer-aware/unaware mix preservation noted]
- Two-reader coding agreement: [Y/N — disagreements reconciled in eval.md]
- Listener decode citations: [2 verbatim Tier-1 or Tier-2 quotes]
- If REOPENED: [link to Brainstorm-Restructure Memo to Briggsy]
- If briefer changed via Option (ii) restructure: [Unit 0.4 was re-run on new briefer voice — date + outcome]

## Section 4 — Composite-Viability Disposition (Unit 0.5)

- (a) Bare `<Series>` + scene-internal overlay (per ADR #4 revised): [PASS | FAIL + remediation]
- (b) Audio crossfade via `@remotion/media` + `<Sequence>`: [PASS | FAIL + remediation]
- (c) Custom font multi-weight (Clash Display, 200/400/700 from variable woff2): [PASS | FAIL + escalation to Phase 3 pyftsubset]
- (d) HTP scroll via Playwright capture: [PASS | FAIL + remediation]
- (e) Archer-grammar transition vocabulary — render-validation per candidate:
  - Stamp-slap render: [PASS | FAIL + artifacts noted]
  - Iris wipe render: [PASS | FAIL + artifacts noted]
  - Kinetic typography render: [PASS | FAIL + artifacts noted]
- Phase 4 inherits the stamp-slap mechanical contract: [Y — see Unit 0.5(e) §"Stamp-slap mechanical shape contract" / N — Phase 4 must amend]
- `@remotion/lottie` install required: [Y/N — if Y, which transition needs it]
- `@remotion/transitions` install required for Phase 4: [N — bare `<Series>` confirmed sufficient | Y — for iris() helper specifically]

## Section 5 — R5 Scream Disposition (Unit 0.6)

- Disposition: [kept-A (TTS) | kept-B (hybrid) | cut]
- If cut: Vera removed from trailer cast (Y/N impact on R14 lock noted in Section 2)
- Listener count: [N / 3 minimum]
- Voice Changer source recording path: [if Path B]
- Reference clip source + license: [non-Benjamin clip provenance]
- Path B IVC profile lifecycle: [Created date / deletion-on-Phase-0-exit verified Y/N / OR retained-for-trailer-lifetime + deletion-date-target]

## Open carry-forwards to Phase 1
- [bulleted list of decisions deferred to Phase 1 — e.g., specific
  Voice Library voice ID not yet finalized, specific brass-jazz hook
  source, specific operative-card-flash artwork selection beyond
  Unit 0.3 spike, additional R15 chrome stamp content for Phase 1's
  R15 #2-#4 instances (Phase 0 locks #1 cold-open only)]

## Phase 0 budget reconciliation
- Engine eval actual spend: [$X across ElevenLabs Creator + Gemini +
  OpenAI vs $50 envelope]
- ElevenLabs Creator char count actual: [N / 100K monthly cap; tripwire status]
- Hosting actual spend: [$0 Cloudflare Tunnel (default) | $0 Cloudflare Pages + Worker | $X VPS]
- Sub-phase 0a actual spend (if Path D triggered): [$X actor +
  Voice Changer polish + contract drafting time]
- Total Phase 0 elapsed days (incl. Sub-phase 0a if triggered): [N days]

## Amendments (template-amendment log per P2.33)

Template fields are **add-only** after Phase 0 exit. If Phase 1+
deepening discovers a field this template missed, append the new
field here with date stamp + originating phase:

- (initial) — Template locked at Phase 0 deepening 2026-05-16
- 2026-05-17: P0.3 / P1.16 / P1.19 / P2.5 / P2.15 / P2.20 / P2.33 /
  P3.2 amendments absorbed during doc-review pass — see commit log.
- 2026-05-17 (Phase 2 doc-review pass): P2.34 — Section 2 gains
  "Speaker voice ID" field so Phase 2 can generate the cold-open WAV
  without a separate Phase 2-owned voice-id-overrides file. Single
  source of truth (PHASE-0-EXIT.md) for all locked voice identifiers.
  Add-only amendment per template policy.

Removing fields or changing field semantics requires a brainstorm-
level re-open routed through `/ce:plan` deepening, NOT a silent edit.
```

The PHASE-0-EXIT.md exits the phase. Phase 1's first task is to
read this document and scaffold the beat-sheet around the locked
dispositions — Sections 1 + 2 are read first, the remainder fills in
once the beat-sheet skeleton is in place.

---

## Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Roadmap: [`docs/plans/origin-trailer/roadmap.md`](./roadmap.md)

**UMB v3 precedents:**
- Trailer scaffold: `projects/undercover-mob-boss/videos/trailer/`
- Narrator pipeline (VOICE_DIRECTION guard at lines 195–198):
  `projects/undercover-mob-boss/scripts/generate-narrator.ts`
- HTP capture script: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Font loading hook: `projects/undercover-mob-boss/videos/trailer/src/hooks/useFonts.ts`
- Cold-open scene: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S01_ColdOpen.tsx`

**BURNED voice DNA citations** (verified line ranges, drift corrected
during 2026-05-16 deepening pass):
- Dash entry: `src/client/howtoplay/acts/ActRoster.tsx:18-28`
  (codename through flourish; blurb at line 26, flourish at line 27)
- Dash tactic lines: `src/client/howtoplay/acts/ActArsenal.tsx:49`
  (`call-in-a-favor` tactic, sole Phrasing! beat in the file —
  previously-cited line 76 is a Dash-voice tactic line but does NOT
  carry the `…Phrasing.` callout; correct to single citation)
- M / briefer cadence: `src/client/howtoplay/acts/ActMission.tsx:30-34, 52-57`
  (lede + Beat II — Sample Paragraph 1 source span; previously cited
  31-34 covered only the lede)
- M signoff Phrasing! beat: `src/client/howtoplay/acts/ActMission.tsx:73-74`
- Counting-fingers Phrasing! beat: `src/client/howtoplay/acts/ActIntercept.tsx:39-40`
- Vera entry: `src/client/howtoplay/acts/ActRoster.tsx:29-37`
  (object braces inclusive; previously cited 32-36 covered only the
  metadata header, missing the blurb body at line 36)
- Sable entry: `src/client/howtoplay/acts/ActRoster.tsx:38-47`
- Janet (M) entry: `src/client/howtoplay/acts/ActRoster.tsx:47-56`
- Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187-194`

**Remotion documentation:**
- TransitionSeries + fade: https://www.remotion.dev/docs/transitions/transitionseries
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font
- Audio (new): https://www.remotion.dev/docs/media/audio
- OffthreadVideo: https://www.remotion.dev/docs/offthreadvideo
- Quality: https://www.remotion.dev/docs/quality
- Remotion Agent Skills: https://github.com/remotion-dev/skills

**TTS engine landscape:**
- ElevenLabs v3 + Prohibited Use Policy (Sept 3 2025): https://elevenlabs.io/legal/usage-policy
- Gemini 3.1 Flash TTS (launched April 15 2026): blog.google
- OpenAI gpt-4o-mini-tts: https://platform.openai.com/docs/guides/text-to-speech

**Legal references for voice cloning:**
- Tennessee ELVIS Act 2024 (Ensuring Likeness Voice and Image Security Act)
- Proposed federal NO FAKES Act (Senate, 2026)
- EU AI Act (Aug 2025 phased)
- ElevenLabs traceability: biometricupdate.com + Sen. Hassan April 2026 inquiry on regulations.gov

**Audio evaluation:**
- MUSHRA: ITU-R BS.1534-3
- WebMUSHRA: https://github.com/audiolabs/webMUSHRA (Edinburgh / Audiolabs Erlangen)

**Voice actor marketplaces (Path C):**
- https://www.voices.com
- https://voice123.com

**Institutional learnings (memory):**
- `feedback-narrator-voice-direction.md` — VOICE_DIRECTION anti-pattern (critical, applies to every TTS call)
- `feedback-imagen-budget.md` — one-test-image-first / budget envelope discipline
- `feedback-wait-for-all-agents.md` — synthesis discipline (applied to research phase)
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after (corrected 2026-05-16)
- `user_harry.md` — Harry as tester recruitment routing
