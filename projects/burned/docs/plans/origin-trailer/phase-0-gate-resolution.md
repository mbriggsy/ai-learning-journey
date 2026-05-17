---
title: "Origin Trailer — Phase 0: Gate Resolution"
type: feat
phase: 0
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: 2026-05-16
reviewed: pending
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

Phase 0 exits when every gate has a documented outcome and the
**five locks** (voice-cast / tone / composite-viability / cold-open
line / scream outcome) are recorded in
`videos/trailer/PHASE-0-EXIT.md`, whose template is locked at plan
time (see §**PHASE-0-EXIT.md template** at the tail of this document).

**Unit ordering** (refined during deepening — supersedes naive
"parallel after 0.1" framing):

1. **Unit 0.1** — scaffold (entry point).
2. **Unit 0.2 Steps 0 / 0a / 0.5** — cadence-spec.md + account
   readiness + spec sanity check (no engine spend).
3. **Unit 0.5** — composite spike (no TTS dependency; can run in
   parallel with Step 0/0a/0.5 above).
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
  Composition` chain. Diff vs UMB: add `@remotion/transitions` +
  `@remotion/media` packages. `@remotion/lottie` is **NOT pre-installed**
  — Unit 0.5 spike decides necessity; install only if a transition
  candidate fails pure-Remotion render (per roadmap ADR #6, refined).
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

- [ ] **Unit 0.1: Trailer Project Scaffold**

**Goal:** Create the isolated Remotion 4.0.438 trailer package at
`projects/burned/videos/trailer/` so Phase 0 units 0.2–0.6 have a home.
Mirror UMB v3 structure exactly; diff is only the additional Remotion
packages required for `TransitionSeries`, new `Audio`, and Lottie.

**Requirements:** Foundation for all subsequent Phase 0 units.

**Dependencies:** None — this is the entry point.

**Files:**

- Create: `videos/trailer/package.json`
- Create: `videos/trailer/remotion.config.ts`
- Create: `videos/trailer/tsconfig.json`
- Create: `videos/trailer/.gitignore`
- Create: `videos/trailer/src/index.ts` — registerRoot call
- Create: `videos/trailer/src/Root.tsx` — single placeholder `<Composition>`
- Create: `videos/trailer/src/hooks/useFonts.ts` — stubbed `useFonts()` (no fonts loaded yet)
- Create: `videos/trailer/sample-eval/.gitkeep` — directory placeholder
- Test: none — pure scaffolding unit, **Test expectation: none — scaffolding-only unit, no behavioral surface.**

**Approach:**

- `package.json` mirrors UMB but with BURNED-specific name and a
  trimmed dependency set (`@remotion/lottie` deliberately excluded
  per roadmap ADR #6 refined — install on-demand only if Unit 0.5
  spike requires it). `render:final` added for Phase 6 production
  encode:
  ```jsonc
  {
    "name": "burned-trailer",
    "version": "1.0.0",
    "description": "Origin trailer for BURNED — Remotion video project",
    "type": "module",
    "scripts": {
      "studio": "npx remotion studio src/index.ts",
      "render": "npx remotion render src/index.ts BurnedTrailer out/trailer-landscape.mp4 --codec h264 --crf 18",
      "render:final": "npx remotion render src/index.ts BurnedTrailer out/trailer-final.mp4 --codec h264 --crf 18 --x264-preset slow --pixel-format yuv420p --audio-codec aac --audio-bitrate 128K",
      "render:thumbnail": "npx remotion still src/index.ts BurnedTrailer out/thumbnail.png --frame 450",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "remotion":             "4.0.438",
      "@remotion/cli":        "4.0.438",
      "@remotion/fonts":      "4.0.438",
      "@remotion/transitions":"4.0.438",
      "@remotion/media":      "4.0.438",
      "react":     "^19.1.0",
      "react-dom": "^19.1.0"
    },
    "devDependencies": {
      "@types/react": "^19.1.0",
      "typescript":   "^5.9.3"
    }
  }
  ```
  Encoder default math: Remotion 4.0.x already defaults
  `pixel-format=yuv420p` + `audio-codec=aac` + `x264-preset=medium`.
  Plan's `--codec h264 --crf 18` is functionally identical to the
  pure-default invocation; explicit flags document intent.
  `render:final` drops CRF to 16 + uses `slow` preset for Phase 6
  near-lossless trailer-grade output (~5% quality bump at the cost
  of render time — appropriate for the one production render). All
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

**Three-band spectrum (locked at plan time per Adversarial Finding 19):**

| Band | Listener describes the voice as... | Disposition |
|------|------------------------------------|-------------|
| **Floor** (insufficient) | "generic narrator," "doesn't sound like anything in particular," "could be any audiobook" | Re-steer (the spec is too generic — tighten genre-anchor mannerisms) |
| **Target Band** (success) | "deadpan briefing voice," "spy register," "film-noir," "sardonic detective," "Archer-coded register," "briefing-room" | Pass |
| **Ceiling** (too close) | "this is impersonating Jon Benjamin," "this IS Sterling Archer," "trying to BE Archer" | Re-spec (strip identity-suggesting characteristics; re-run engine matrix) |

The Target Band is broad on purpose — Sterling-CODED register is a
cluster of adjacent registers (noir narrator, deadpan spy briefer,
sardonic detective) that all read as "Archer-coded" without being
"Archer impression." The Ceiling is the bound; listener-volunteered
actor recognition is the diagnostic signal (Step 4 bonus-signal +
disambiguation question).

Output: `cadence-spec.md`. Source document for every engine in Step
2 via the per-engine adapters built in Step 1.5. Cite every claim
against the source consulted; this is the proof-of-shape that
style-mimicry is the goal, not impression.

**Step 0a — Engine account readiness check.** Before Step 0.5 sanity
check (or while Step 0 research is underway), verify each engine API
key is present in `.env` and produces a valid 200 response from a
minimal probe:

```bash
set -a && source .env && set +a   # CLAUDE.md autonomy rule — always load .env

# ElevenLabs
curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user | jq .

# Gemini
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | jq '.models[0].name'

# OpenAI
curl -s -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models | jq '.data[0].id'
```

For any engine returning 401/403 or missing the env var, set up the
account + billing before proceeding. Paths A/B require ElevenLabs
**Creator** tier ($22/mo, 100K char allowance) — verify subscription
active before Step 2. Document each engine's readiness state in
`account-readiness.md`.

**Step 0.5 — Spec sanity check (BEFORE engine spend).** The
cadence-spec is the load-bearing input to every engine. If the spec
is bad, all three Paths fail not because the engines are bad but
because the steering is bad. Insert a cheap validation gate:

- Hand `cadence-spec.md` to **two engineering-peer Archer-fan readers**
  (Briggsy + Harry, or Briggsy + one Discord contact).
- Ask: *"If you handed this to a voice actor with no other context,
  could they deliver a read that lands in the Sterling-coded register
  (deadpan briefing voice, sardonic-spy register) without it being a
  Benjamin impression?"*
- Both readers must answer **Yes** before Step 1.5 begins.
- If either says No: revise the spec (typically the Target Band
  characterizations are too thin or the Ceiling distinctions
  unclear), re-run the check.

Cost: 15 minutes, two people. Saves: a full engine-matrix re-run if
the spec is the problem.

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
| **ElevenLabs v3** | **Path B** — Briggsy's owned voice cloned via **Instant Voice Cloning** (10s sample, full legal license since he owns it). Same steering via `cadence-spec-elevenlabs.json`. Recording conditions: cardioid mic, kill room reflections (closet / fabric-draped corner), peak around -12 dBFS, 15s neutral-text read trimmed to cleanest 10s. **Professional Voice Cloning eliminated** (would need 30-min recording session — schedule dependency removed; if Instant fails, Path B fails and ladder proceeds to Path C). | (same Creator month, no extra cost) |
| **Gemini 3.1 Flash TTS** | **Path C engine variant** — Steerable preset + **Director's Chair workflow** (Google AI Studio paradigm; the real surface name) with `cadence-spec-gemini.md` providing the structured prompt (Audio Profile + Scene + Director's Notes + Transcript). 8K context window fits the full spec. | ~$0.50–$1 (output tokens, ~3 min audio across iteration). Free tier covers initial experiments. |
| **OpenAI gpt-4o-mini-tts** | **Path C engine variant** — Steerable preset; `cadence-spec-openai.md` (~500 words) goes in the `instructions` API parameter; script goes in the separate `input` parameter (≤4096 char limit, comfortable for our paragraphs). | ~$0.45 (output audio tokens, ~3 min across iteration) |

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
the host first so URLs don't have to move. Three options:

1. **Cloudflare Pages subpath** (recommended). BURNED already deploys
   to `burned-cxa.pages.dev`. Add `/trailer-eval/` subpath serving the
   WebMUSHRA static assets + WAVs. Permanent URL, $0 cost, survives
   laptop-asleep, listener can resume mid-session next day.
2. **Cloudflare Tunnel from laptop** ($0, ~5min setup). Free `cloudflared`
   tunnel exposes `localhost:8000` (php -S) at a stable subdomain.
   Laptop must stay awake during the listening window.
3. **VPS** ($4–6/mo, fallback). DigitalOcean / Linode / Hetzner droplet
   with PHP. Only if the Pages subpath doesn't work for some
   deployment-config reason.

Document the chosen path + setup steps in `hosting-decision.md`.

**Step 3 — MUSHRA listening protocol.** Document in `MUSHRA-protocol.md`.
The protocol is **register-recognition testing**, not actor-identity
testing, per ADR #13 (Sterling-CODED, not Sterling-cloned):

- **Stimuli:** 3–4 TTS candidates (one per engine path) + 1 low-quality
  anchor (band-limited TTS) + 1 baseline reference (a **NON-Benjamin
  Sterling-coded delivery** — voice-actor portfolio sample doing a
  deadpan-spy-detective read, sourced from a publicly-listenable demo
  reel on voices.com or voice123.com with attribution noted) used as
  the **cadence target**, NOT as an identity reference. The reference
  anchors the MUSHRA scale (rate it ~100); it's not what candidates
  are trying to clone. Order randomized per listener.
- **Listeners:** 6 minimum (8 target). Mix: 3+ Archer fans (validates
  Sterling-coded register recognition) + 3+ cold (validates that the
  voice works on engineering-peer baseline without Archer pre-loading).
  Briggsy's Discord network for recruitment (Harry et al.).
- **Session UX (per ITU-R BS.1534-3 + WebMUSHRA conventions):**
  - **Onboarding screen** explaining MUSHRA + what "naturalness"
    means in this context (not "is it real" — "does it sound like a
    human deliberately recorded this, vs. synthetic / robotic").
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
- **Questions** (no actor-identity questions):
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
  - **Bonus-signal disambiguation (conditional follow-up):** if a
    listener invokes Archer/Sterling unprompted in any open
    response, the protocol shows a follow-up question:
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

**Bonus-signal disambiguation (Step 3's conditional follow-up):**

- If 0 listeners volunteer Archer/Sterling unprompted → register
  pass, target achieved.
- If a listener volunteers Archer/Sterling AND the follow-up answer
  is *"same STYLE"* → register pass, target achieved (Sterling-coded
  cluster recognition is success).
- If a listener volunteers Archer/Sterling AND the follow-up answer
  is *"same ACTOR"* OR *"could be Jon Benjamin"* → **Ceiling band
  triggered** (per Step 0 three-band spectrum). The engine drifted
  toward impression. Step 5 re-spec triggered: strip
  identity-suggesting characteristics from cadence-spec.md, re-run
  engine matrix. Do not lock this candidate.

If multiple engines clear, pick lowest-cost.

**Step 5 — Fail-action ladder.**

- **Path A fail** (ElevenLabs Voice Library preset + cadence-spec
  doesn't clear): try Path B (Briggsy clone + same cadence-spec).
- **Path B fail** (Briggsy Instant clone + cadence-spec doesn't
  clear): Path B is eliminated. Do **not** auto-escalate to
  Professional Voice Cloning — Professional requires a 30-min
  recording session and would create a hidden schedule dependency.
  Ladder proceeds to Path C.
- **Path C fail** (all three steerable engines on the Step 1.5
  adapter inputs fail): Phase 0 **exits with a Path D Sub-phase 0a
  deliverable** as the next Phase 0 work. The Sub-phase 0a deliverable
  is documented separately:
  - 1-page Brief Memo to Briggsy listing: confirmed engine fail
    summary + Path D casting brief + actor-marketplace shortlist
    (Voices.com / Voice123 picks reading in Sterling-coded register)
    + budget request ($150–500 for 60–90s trailer read).
  - Briggsy explicitly approves Path D spend before any casting
    begins. Phase 1 structural decisions that DON'T depend on voice
    identity (scene count, scene order, cascade composition) may
    proceed in parallel with actor casting, so Phase 0 doesn't
    hold Phase 1 entirely.
- **Path D fail or actor delivery exceeds reasonable timeline:**
  Phase 0 produces a **Brainstorm-Restructure Memo** to Briggsy
  with three explicit options laid out for decision:
  - **(i) Ship synthetic-tinged Dash** — accept that the voice has
    a TTS register; lean into it as a stylistic choice (the trailer
    owns the synthetic-ness rather than fighting it).
  - **(ii) Restructure to non-Dash briefer** — use established voice
    DNA for Janet-M (`ActMission.tsx`), Vera (`ActRoster.tsx:29-37`),
    or Sable (`ActRoster.tsx:38-47`). Whichever character's voice
    the available engines can match the cadence-spec best wins.
    R4 is recast to ~90% of the new briefer's voice. Beat sheet
    (Phase 1) restructures around new briefer.
  - **(iii) Abandon the trailer concept** — surface this option
    honestly. The plan does NOT pretend Path A–D fail is
    auto-routable; if every legal path produces a register that
    misses the bar, the trailer concept may be wrong-shaped for
    this product and abandonment is a legitimate Briggsy decision.

This is the **brainstorm-level restructure** terminal. The previous
"design pivot, no abandon" framing softened the outcome; the honest
framing is: the cadence-match bar may be unachievable within the
allowed legal floor, and that's a real possible outcome that requires
a real Briggsy decision.

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
- **Integration:** `sample-script-dash.test.ts` greps
  `src/client/howtoplay/acts/ActMission.tsx` AND `ActRoster.tsx` for
  the source lines — verifies the sample paragraphs are derived from
  existing copy, not invented.
- **Anti-pattern guard:** `generate-tts-eval.test.ts` greps the
  source for all three per-engine VOICE_DIRECTION guard variants
  (ElevenLabs / Gemini / OpenAI) at API call sites. Lint-grep
  candidate for follow-up.

**Verification:**

- `videos/trailer/sample-eval/r4-dash/cadence-spec.md` exists with
  each characteristic documented + source citations + three-band
  spectrum (Floor / Target / Ceiling) explicit.
- `videos/trailer/sample-eval/r4-dash/account-readiness.md` exists
  with per-engine 200-response confirmation (Step 0a).
- `videos/trailer/sample-eval/r4-dash/cadence-spec-{elevenlabs,gemini,openai}.{json,md,md}`
  all three exist (Step 1.5 outputs), each derived from cadence-spec.md.
- Two engineering-peer Archer-fan readers signed off on cadence-spec
  sanity check (Step 0.5) — note in results.md.
- `videos/trailer/sample-eval/r4-dash/hosting-decision.md` exists
  with chosen WebMUSHRA host + setup steps (Step 3a).
- `videos/trailer/sample-eval/r4-dash/{elevenlabs,gemini,openai}/`
  each contain three WAV files matching the sample paragraphs.
- `videos/trailer/sample-eval/r4-dash/MUSHRA-protocol.md` exists with
  WebMUSHRA setup instructions + question wording + listener tracking
  + anchor calibration step + practice trial + paragraph selection +
  session length budget + bonus-signal disambiguation follow-up.
- `videos/trailer/sample-eval/r4-dash/results.md` documents listener
  responses + joint-pass verification + which path cleared (A/B/C/D
  /Sub-phase 0a/Restructure). **Voice cast + cadence steering choice
  lock** for Phase 1 recorded in results.md AND propagated to
  `PHASE-0-EXIT.md` per the template.

---

### Unit 0.3 — R14 Cold-Open Decode Gate (P0)

- [ ] **Unit 0.3: R14 Cold-Open Decode Gate**

**Goal:** Validate that a no-context viewer decodes "AI / agent /
autonomous / built itself" from the 5-second cold-open hook (audio +
visual + on-screen text). The trailer's sole mechanism for telegraphing
the agentic-SDLC origin to a viewer who has not seen UMB v3.

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

  If yes to either, the tester is either **disqualified** (preferred,
  if substitute available) OR their response is logged as **"primed"**
  and not counted toward the acceptance threshold (used as informative
  context only).
- **Stimulus:** First 5s of the 6–8s rendered MP4 clip played cold —
  no setup beyond "watch this." (Acknowledged limitation: the framing
  meta-cues that it's a trailer; this is unavoidable in a recruited
  pool and noted in `decode-eval.md` as an external-validity caveat.)
- **Open question (asked first, after pre-screen):** *"What do you
  think this trailer is about?"* Tester narrates their reaction
  stream-of-consciousness for 30 seconds.
- **Two-tier decode acceptance** (replaces flat "AI/agent/autonomous"
  bag-of-words):
  - **Tier 1 decode** (full thesis): tester unprompted surfaces
    *"agent," "autonomous," "built itself," "wrote itself," "made
    itself," "the machine did it"* — i.e., the agentic-SDLC thesis.
  - **Tier 2 decode** (partial / surface signal): tester unprompted
    surfaces *"AI"* alone with no agentic specification.
  - **Acceptance threshold:** **≥50% of non-primed testers reach
    Tier 1** OR **≥75% of non-primed testers reach Tier 1 OR Tier 2
    combined**. With n=4 non-primed: 2 Tier 1 (50%) OR 3 of any tier
    (75%). The threshold scales with sample size — 3 of 6, 4 of 8, etc.
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
SDLC-reality subject matter) lands with two engineering-peer test
listeners — one Archer-aware, one Archer-unaware — both articulating
unprompted that the gap is the joke. Fail-action re-opens the
played-straight Key Decision.

**Requirements:** R2 (deadpan, played straight), R6 (Pendleton
vocabulary discipline).

**Dependencies:** Unit 0.1 (scaffold), Unit 0.2 (engine chosen — TTS the
sample paragraph via the engine that cleared R4 or the nearest
substitute).

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
  SpikeS01 + cross-dissolve transition + SpikeS02 in `<TransitionSeries>`.
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

**Integration point (a) — Cross-dissolve via `<TransitionSeries>`.**
```tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SpikeS01_Cascade />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 20 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SpikeS02_Gameplay />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

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
    weight: '200 700',  // variable font weight range
    format: 'woff2',
  });
}
```
`@remotion/fonts.loadFont()` auto-blocks the render until the font is
ready — no manual `delayRender` / `continueRender`. Used in
`Root.tsx` at top. Spike validates by rendering a text overlay using
`font-family: 'Clash Display'` at weight 700 and confirming the
EXPORTED MP4 shows the loaded font (not a fallback). If fallback
appears in MP4 but not studio preview, the bug is in our load
timing — not the package. Multiple weights later: use
`await Promise.all([loadFont(...), loadFont(...)])` if adding
secondary faces (General Sans, JetBrains Mono).

**Integration point (d) — HTP dossier placeholder via Playwright.**
`capture-htp-scroll-burned.ts` clones UMB's script. Diff:

- URL: `http://localhost:5173/howtoplay.html` (BURNED Vite dev) for
  Phase 0 spike. Production URL (`burned-cxa.pages.dev`) deferred to
  Phase 3 after deploy migration completes.
- Output: `videos/trailer/public/htp-fullpage.png`.
- 1920×1080 viewport, scroll-by-200px-then-wait-80ms loop (same UMB
  trick — verified compatible with BURNED's `useScrollReveal`
  GSAP+ScrollTrigger pattern at `src/client/howtoplay/scroll/useScrollReveal.ts`,
  which uses `start: 'top 85%', once: true` per reveal element).
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
(LOCK + VALIDATE all three).**

**Design lock at plan time (Emil lens applied):**

| Candidate | Primary use | Lock status |
|-----------|-------------|-------------|
| **Classification-stamp slap** | **PRIMARY scene-to-scene transition** in the trailer | LOCKED |
| **Iris wipe** | Cold-open → Act 1 boundary; documented FALLBACK if stamp-slap reveals rendering artifacts | LOCKED as secondary |
| **Kinetic typography reveal** | Goofy-stat overlays ONLY (cascade scene) — **NOT a scene-to-scene transition** | LOCKED as constrained |

Rationale for stamp-slap primary:
- Maps directly to Pendleton briefing-room aesthetic (CLASSIFIED stamps,
  redacted dossiers, bureaucratic-thriller register).
- Creates **continuity with BURNED's existing motion grammar** —
  `DramaOverlay.tsx` already uses stamp-reveal motion for the
  BURNED-draw cinematic beat. The trailer cribbing that motion
  grammar reads as product-of-piece, not generic transition library.
- Avoids the 2025–2026 AI-launch-trailer cliché (kinetic typography
  is the Anthropic-keynote / Cursor-launch / every-AI-trailer
  default; using it for scene-to-scene transitions reads as "another
  AI startup trailer" and fails the water-beads bar).

Kinetic typography is still validated in the spike because it has a
legitimate constrained role — Phase 4's goofy-stat overlays (R11)
will use word-by-word reveals at stat-card landing time. But it
doesn't get to be a scene-to-scene transition.

**The spike renders all three as sub-clips** (each is a 2-second
sub-clip inside the larger spike composition; Phase 4 inherits the
vocabulary set):

```tsx
// SpikeS01_Cascade.tsx — transition vocabulary sub-clips
<Series>
  <Series.Sequence durationInFrames={60}><SpikeStampSlap /></Series.Sequence>
  <Series.Sequence durationInFrames={60}><SpikeIrisWipe /></Series.Sequence>
  <Series.Sequence durationInFrames={60}><SpikeKineticType /></Series.Sequence>
</Series>
```

- **Classification-stamp slap.** Stamp graphic rotates in from
  upper-right + lands with a 1-frame scale-up + 1-frame settle.
  Pure Remotion (interpolation of rotation + scale).
- **Iris wipe.** Circular SVG mask animating from full-screen to
  point. Achievable in pure Remotion with `<clipPath>` + interpolated
  radius.
- **Kinetic typography reveal.** Single-line text appears
  word-by-word with per-word interpolated `opacity + translateY`.
  Pure Remotion.

**Pass criterion.** All five points (a–e) clear in
`out/spike-frame-test.mp4`:

- (a) Cross-dissolve visually completes over 20 frames (no hard cut).
- (b) Music bed audibly drops to 20% when VO drops, returns to 60%
  after VO ends.
- (c) Custom-font text overlay renders with `'Clash Display'` family
  at weight 700 (not the default sans-serif fallback).
- (d) HTP dossier scrolls smoothly in the cascade window.
- (e) **All three** Archer-grammar transition sub-clips land without
  visual artifacts. If stamp-slap fails: iris wipe steps up to primary.
  If iris fails: surface the pure-Remotion-can't-deliver finding back
  to a brainstorm-level decision (does the trailer concept survive
  without iris vocabulary?). If kinetic typography fails: the goofy-
  stat overlay design needs a different motion grammar for Phase 4.

**Spike-results.md MUST include the transition-candidate ranking**
(chosen primary, runner-up, anything cut) with one-sentence
rationale per choice. This is the lock document Phase 4 inherits.

**Fail-mode isolation rule:** if the combined render fails any single
point, produce an isolated single-point repro composition
(`SpikeAudio.tsx`, `SpikeFont.tsx`, `SpikeTransition.tsx`) before
remediation. Bisecting a 5-concern combined render is more expensive
than rendering a 1-concern isolated repro.

**Patterns to follow:**

- UMB cross-dissolve precedent: UMB doesn't use `<TransitionSeries>` —
  BURNED is breaking new ground here. Trust framework-docs research.
- UMB audio precedent: `Html5Audio` placed at absolute `<Sequence from={frame}>`. New `<Audio>` from `@remotion/media` is the modernization.
- UMB font loading: `projects/undercover-mob-boss/videos/trailer/src/hooks/useFonts.ts`
- UMB HTP capture: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`

**Test scenarios:**

- **Happy path:** `pnpm render` (spike target) produces a valid 1920×1080 H264 MP4 at `out/spike-frame-test.mp4` in <5 minutes.
- **Happy path:** `capture-htp-scroll-burned.ts` produces a valid PNG at `public/htp-fullpage.png` with non-zero file size.
- **Integration:** Custom font appears in MP4 export (verified by viewing the rendered file, NOT just studio preview).
- **Integration:** Audio crossfade audibly works in MP4 export (verified by listening to rendered file).
- **Edge case:** Playwright capture script handles BURNED's HTP `useScrollReveal` GSAP animations — the 200px-scroll-then-80ms-wait loop triggers every `[data-reveal]` element before screenshot.
- **Edge case:** Vite dev server is running before capture script invocation (script fails fast with clear error if not).
- **Error path:** Missing font file produces clear error (auto-tracked promise rejection from `@remotion/fonts.loadFont`).

**Verification:**

- `out/spike-frame-test.mp4` exists and plays cleanly.
- All five integration points (a–e) pass per inspection.
- `spike-results.md` documents per-point pass/fail with screenshots /
  notes. Remediation plan for any failures.
- **Composite-viability lock** for Phase 4 recorded in `spike-results.md`.

---

### Unit 0.6 — R5 Sterling-Screams-Lana Cameo Eval (P1)

- [ ] **Unit 0.6: R5 Sterling-Screams-Lana Cameo Eval**

**Goal:** Determine if a TTS-or-hybrid scream cameo ("VERA!!!") clears
Archer-grade authenticity, or if R5 must be cut entirely. Brainstorm
rule: flat scream is worse than no scream.

**Requirements:** R5 (Vera scream cameo, authentic or cut).

**Dependencies:** Unit 0.2 (engine + voice cast chosen — the
**screamer is Dash**, not Vera; corrects previous "Vera target
timbre" phrasing — in Sterling lore the screamer is the agent
character, the addressee is the named target. So Path (b) speech-to-
speech target is the **Dash voice from Unit 0.2 lock**, applied to
Briggsy's owned-voice source recording).

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

- **Listeners:** 2 minimum Archer-fan testers (same pool as Unit 0.2
  Archer-fan portion). 3 target for marginal-case disambiguation.
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
- **Acceptance:** At least one of (a) or (b) is selected by at least
  one listener AND no listener selects "none" exclusively. If "none"
  is the consensus, R5 is cut.

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
| MUSHRA tester recruitment delay (no 6 listeners within 1 week) | Medium | **Medium** (was: Low — re-rated up; this gate blocks Phase 1) | Reduce to 4-listener pass with stated reduced confidence; document gap explicitly in results.md. **Hosting decision (Step 3a) is now Cloudflare Pages subpath by default** — permanent URL, no laptop-online dependency, listeners can resume mid-session next day. |
| WebMUSHRA hosting blocker (laptop not externally addressable) | Was implicit | Was implicit | Resolved by Step 3a hosting decision: Cloudflare Pages subpath ($0, recommended) OR Cloudflare Tunnel ($0, laptop-must-stay-awake) OR VPS ($4–6/mo fallback). The original "share URL with listeners" hand-wave assumed external addressability that Briggsy's laptop doesn't have by default. |
| Spike reveals Remotion 4.0.438 incompatibility with `@remotion/transitions` or `@remotion/media` | Low | Medium | Pin to latest 4.0.x compatible release; fallback to UMB's `<Series>` + `Html5Audio` pattern (audio crossfade becomes manual frame-math). Document downgrade in spike-results.md if triggered. |
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
- **Three-band spectrum:** Floor / Target Band / Ceiling defined in
  `cadence-spec.md` per Step 0. Sterling-CODED is a spectrum,
  acceptance is the Target Band, Ceiling triggers re-spec.
- **TTS budget envelope:** $50 retained as safety margin
  (research-corrected real ceiling ~$24); separate $0–500 line for
  Path D hybrid as Sub-phase 0a deliverable.
- **WebMUSHRA hosting:** Cloudflare Pages subpath recommended ($0,
  permanent URL); Cloudflare Tunnel ($0, laptop-awake) or VPS ($4–6/mo)
  as alternatives. Decision documented in Step 3a output.
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
  two-reader sanity-check gate. Re-spec triggered if Step 4
  acceptance fails on "too generic" grounds OR if Step 0.5 reviewers
  flag spec inadequacy.
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
  each unit's protocol file with consent confirmation. Same individuals
  may appear in multiple unit pools (R4 / R14 / R5 / tone) — note this
  in `results.md` per pool; statistical-independence is informally
  acceptable for these gates given Briggsy's network size.

---

## PHASE-0-EXIT.md template

Phase 0 closes when this document is written and every section is
populated with a documented outcome. Phase 1 consumes it to scaffold
beat-sheet work without needing to back-read five per-unit eval files.

A "documented outcome" means: (i) the unit cleared its acceptance
threshold, OR (ii) the unit triggered a documented fail-action that
produced a different but locked decision (Path B instead of A, R5
cut instead of kept, Sub-phase 0a triggered, etc.). Incomplete data
(e.g., 3 of 6 MUSHRA listeners completed) without a fail-action
invocation is NOT a documented outcome; it's a failed gate.

```markdown
# Phase 0 Exit Record

## Voice Cast Lock (Unit 0.2)
- Cleared path: [A | B | C | Sub-phase 0a (Path D) | Brainstorm-Restructure]
- Engine: [ElevenLabs Voice Library preset | ElevenLabs Briggsy
  Instant clone | Gemini 3.1 Flash TTS | OpenAI gpt-4o-mini-tts |
  voice-actor name from Voices.com/Voice123]
- Voice ID / actor identifier: [string]
- Engine-adapter file path: [sample-eval/r4-dash/cadence-spec-{engine}.{json|md}]
- MUSHRA listener count: [N / 6 minimum — note any shortfall + confidence impact]
- Joint-pass verification: [N listeners cleared all three dimensions]
- Cadence-spec.md path + sanity-check sign-off:
  [sample-eval/r4-dash/cadence-spec.md, reviewers: Briggsy + <name>]

## Tone Lock (Unit 0.4)
- Played-straight thesis: [SURVIVES | REOPENED]
- Tester count: [N / 4 minimum, mix preservation noted]
- Two-reader coding agreement: [Y/N — disagreements reconciled in eval.md]
- Listener decode citations: [2 verbatim Tier-1 or Tier-2 quotes]
- If REOPENED: [link to Brainstorm-Restructure Memo to Briggsy]

## Composite-Viability Lock (Unit 0.5)
- (a) Cross-dissolve via `<TransitionSeries>`: [PASS | FAIL + remediation]
- (b) Audio crossfade via `@remotion/media` + `<Sequence>`: [PASS | FAIL + remediation]
- (c) Custom font (Clash Display, weight 700, woff2): [PASS | FAIL + remediation]
- (d) HTP scroll via Playwright capture: [PASS | FAIL + remediation]
- (e) Archer-grammar transition vocabulary:
  - Stamp-slap (primary): [PASS | FAIL + remediation]
  - Iris wipe (fallback): [PASS | FAIL + remediation]
  - Kinetic typography (constrained to stats): [PASS | FAIL + remediation]
- Transition primary lock: [stamp-slap | iris-wipe-promoted | brainstorm-restructure]
- `@remotion/lottie` install required: [Y/N — if Y, which transition needs it]

## R14 Cold-Open Line Lock (Unit 0.3)
- Line (verbatim): [string]
- Speaker character: [Sable | Janet | Vera (if R5 cleared)]
- Tester count: [N non-primed / 4 minimum]
- Decode tier achieved: [Tier 1 (full thesis) | Tier 2 (partial) | both]
- Pre-screen battery — UMB-v3 contamination check: [N primed / N non-primed]
- If non-voice fallback: [R15-only decode spike outcome]

## R5 Scream Outcome (Unit 0.6)
- Outcome: [kept-A (TTS) | kept-B (hybrid) | cut]
- If cut: Vera removed from trailer cast (yes/no impact on R14 lock noted)
- Voice Changer source recording path: [if Path B]
- Reference clip source + license: [non-Benjamin clip provenance]

## Open carry-forwards to Phase 1
- [bulleted list of decisions deferred to Phase 1 — e.g., specific
  Voice Library voice ID not yet finalized, specific brass-jazz hook
  source, specific operative-card-flash artwork selection beyond
  Unit 0.3 spike]

## Open carry-forwards to Phase 3
- [bulleted list — typically R15 chrome SVG production design (Phase
  0 locks placement+color+font, Phase 3 produces final SVGs),
  music procurement, specific operative-card-art selection for
  cascade composition]

## Phase 0 budget reconciliation
- Engine eval actual spend: [$X across ElevenLabs Creator + Gemini +
  OpenAI vs $50 envelope]
- WebMUSHRA hosting actual spend: [$0 Cloudflare Pages | $X VPS]
- Sub-phase 0a actual spend (if Path D triggered): [$X actor +
  Voice Changer polish]
```

The PHASE-0-EXIT.md exits the phase. Phase 1's first task is to
read this document and scaffold the beat-sheet around the locked
decisions.

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
