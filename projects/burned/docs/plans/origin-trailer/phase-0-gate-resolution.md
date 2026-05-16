---
title: "Origin Trailer — Phase 0: Gate Resolution"
type: feat
phase: 0
parent: docs/plans/origin-trailer/roadmap.md
origin: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
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

Phase 0 exits when every gate has a documented outcome and the
**voice-cast lock** + **tone lock** + **composite-viability lock** are
recorded in `videos/trailer/PHASE-0-EXIT.md`.

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

Brainstorm says "$10 across both jobs" (R5-research-gate). Research-corrected:

- **$50 ceiling** for engine-eval pass (ElevenLabs Creator $22, Gemini
  $10, OpenAI $5, WebMUSHRA hosting $0–20).
- **$0–500 separate line item** for hybrid Path C voice-actor VO if Path A/B fail.

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
  Composition` chain. Diff vs UMB: add `@remotion/transitions`,
  `@remotion/media`, `@remotion/lottie`, `@remotion/skills` packages.
- **Phase 0 lives in `videos/trailer/sample-eval/` for evaluation
  artifacts, not in the main scenes directory.** The spike compositions
  (`SpikeComposition.tsx`, `SpikeS01.tsx`, `SpikeS02.tsx`) are throwaway
  — they exist to validate integration points, not to ship.
- **Sample-script discipline:** test paragraphs drawn from existing
  Dash copy (`ActRoster.tsx`, `ActArsenal.tsx`, `ActMission.tsx`), NOT
  invented in isolation. Tests character voice, not engine capability.
  Sources cited in Unit 0.2.
- **VOICE_DIRECTION anti-pattern guard** is codified in
  `videos/trailer/scripts/generate-dash-tts.ts` at the API call site,
  mirroring UMB's `generate-narrator.ts:195–198`. Inline comment shape:
  ```ts
  // CRITICAL: Send script text ONLY. The TTS engine reads ALL text verbatim.
  // NEVER prepend style/voice direction here — it will be spoken aloud.
  // Voice character comes from the engine's voice preset, not text instructions.
  ```
- **Cadence-spec-first.** Unit 0.2 begins with Step 0 — Benjamin
  Sterling cadence characterization. The spec is the steering input
  fed to every engine in the matrix. Engines work on non-identifying
  voices (preset, owned-clone, voice-actor) — never on Benjamin
  audio.

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

- `package.json` mirrors UMB but with BURNED-specific name and the
  expanded dependency set:
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
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "remotion":             "4.0.438",
      "@remotion/cli":        "4.0.438",
      "@remotion/fonts":      "4.0.438",
      "@remotion/transitions":"4.0.438",
      "@remotion/media":      "4.0.438",
      "@remotion/lottie":     "4.0.438",
      "react":     "^19.1.0",
      "react-dom": "^19.1.0"
    },
    "devDependencies": {
      "@types/react": "^19.1.0",
      "typescript":   "^5.9.3"
    }
  }
  ```
- `remotion.config.ts` is one line: `Config.setPublicDir('../../public')`
- `tsconfig.json`: target ES2022, module ESNext, moduleResolution
  bundler, jsx react-jsx, strict, isolatedModules, noEmit.
- `src/Root.tsx` exports a single `<Composition id="BurnedTrailer"
  component={Placeholder} durationInFrames={150} fps={30} width={1920}
  height={1080} />` so `pnpm studio` boots.
- Install `@remotion/skills` separately (skills system flow, not
  npm dep): `npx remotion add skills` or equivalent install path into
  `~/.claude/skills/`. Verify auto-load on next session start.

**Patterns to follow:**

- UMB v3 trailer scaffold — `projects/undercover-mob-boss/videos/trailer/`
- Briggsy CLAUDE.md "Autonomy" rule — load `.env` with `set -a && source
  .env && set +a` before any TTS script run.

**Verification:**

- `pnpm install` completes without errors.
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
  (Step 0 output). Becomes the steering input for every engine in the
  matrix. **The contract document for the whole unit.**
- Create: `videos/trailer/scripts/sample-script-dash.ts` — exports the
  three sample paragraphs (deadpan exposition + monologue ending in
  exasperation + isolated scream clip). Each paragraph is drawn from
  existing Dash copy in `src/client/howtoplay/`.
- Create: `videos/trailer/scripts/generate-tts-eval.ts` — engine
  comparison generator. Loads `.env`, walks the engine matrix, writes
  WAVs to `videos/trailer/sample-eval/r4-dash/{elevenlabs,gemini,openai}/`.
- Create: `videos/trailer/sample-eval/r4-dash/MUSHRA-protocol.md` — the
  listening protocol document tester receives.
- Create: `videos/trailer/sample-eval/r4-dash/results.md` — outcome
  documentation (which path cleared / which restructured / fail-action
  triggered).
- Test: `videos/trailer/scripts/sample-script-dash.test.ts` — verifies
  sample paragraphs are sourced from existing files (regex match against
  `src/client/howtoplay/acts/ActMission.tsx` + `ActRoster.tsx` content).

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

Output: `cadence-spec.md`. Becomes the natural-language steering
instruction fed to every engine in Step 2. Cite every claim against
the source consulted; this is the proof-of-shape that style-mimicry is
the goal, not impression.

**Step 1 — Sample script.** Three paragraphs in `sample-script-dash.ts`,
each drawn from existing Dash copy (the brainstorm requires this — test
character voice, not engine):

1. **20s deadpan exposition.** Adapted from `ActMission.tsx:31–34`
   (M's voice rewritten in first-person Dash):
   > *"Good morning. You are reading this because somebody with my
   > clearance level — fine, **me** — decided you could be trusted with
   > a card game. The deck is a series of operations. One of them ends
   > your career instantly. The rest exist to help you survive it, or
   > to make sure your colleagues don't. Try not to make me look
   > foolish."*

2. **10s monologue ending in mild exasperation.** Adapted from
   `ActRoster.tsx:26–27` Dash blurb + flourish, recast as first-person:
   > *"Pendleton's top-rated field operative. By which we mean I have
   > the highest expense report and survive most of it. Fluent in seven
   > languages, three of which are martini orders. Tell anyone you read
   > my file. I've been waiting. …Phrasing."*

3. **Isolated scream clip.** Single CAPS line, ~1.5 seconds:
   > *"VERAAA!!!"*
   (Doubles as R5 scream candidate; see Unit 0.6.)

**Step 2 — Engine matrix.** Generate identical script across the three
engine candidates, **feeding the Step 0 cadence-spec.md as the
natural-language steering input** to each. No engine receives Benjamin
audio; every engine works on a non-identifying voice.

| Engine | Voice path | Cost estimate |
|--------|------------|---------------|
| **ElevenLabs v3** | Path A: pre-existing preset voice (mid-baritone male) + cadence-spec steering via voice settings + style controls. Test ElevenLabs Iconic Voice Marketplace for *style-licensed* voices (non-Benjamin) that match the cadence profile. | ~$22 (Creator month) |
| **ElevenLabs v3** | Path B: Briggsy's owned voice cloned via Instant Voice Cloning (10s sample, full legal license since he owns it) + cadence-spec steering. | (same month, no extra cost) |
| **Gemini 3.1 Flash TTS** | Path C engine variant: Steerable preset + "Director's Notes" mode with cadence-spec fed verbatim. | ~$10 (output tokens) |
| **OpenAI gpt-4o-mini-tts** | Path C engine variant: Steerable preset, cadence-spec as natural-language instruction. | ~$5 |

VOICE_DIRECTION anti-pattern guard codified at every API call site —
inline comment + script-only text contents (the *script* is sent in
the `parts.text` payload; the *cadence-spec* is sent in the
voice-control / steering API surface where each engine accepts it,
never prepended to the script text). The guard catches future agent
edits.

**Step 3 — MUSHRA listening protocol.** Document in `MUSHRA-protocol.md`.
Note the protocol has **shifted from actor-identity testing to
register-recognition testing** to match the design principle:

- **Stimuli:** 3–4 TTS candidates (one per engine path) + 1 low-quality
  anchor (band-limited TTS) + 1 baseline reference (a NON-Benjamin
  Sterling-coded delivery — e.g., a voice actor's portfolio sample
  doing a deadpan-spy-detective read) used as the cadence target, NOT
  as an identity reference. Order randomized per listener.
- **Listeners:** 6 minimum (8 target). Mix: 3+ Archer fans (validates
  Sterling-coded register recognition) + 3+ cold (validates that the
  voice works on engineering-peer baseline without Archer pre-loading).
  Briggsy's Discord network for recruitment (Harry et al.).
- **Questions** (no actor-identity questions):
  - Per stimulus: *"Rate this clip's naturalness from 0–100."*
  - Per stimulus open: *"Describe this voice in your own words —
    register, tone, character archetype it suggests."* (Listening for
    Sterling-coded register cluster: *deadpan, dry, mid-Atlantic,
    sardonic, spy, detective, film-noir, Archer-coded, briefing-room*.
    NOT listening for actor names; if a listener volunteers "sounds
    like Jon Benjamin," that's noted but it's not the success criterion
    and it's not what we're asking for.)
  - Per stimulus character-fit: *"Does this voice match a fictional
    spy-agency briefer named Dash Barlowe, ~90% of trailer runtime?"*
    (Yes / No / Mixed)
  - Per stimulus uncanny-check: *"Does anything about this voice
    sound obviously synthetic or off?"* (Yes / No)
- **Hosting:** WebMUSHRA (open-source from ed.ac.uk). Run on Briggsy's
  laptop via local server; share URL with listeners.

**Step 4 — Acceptance threshold.**

A candidate clears R4 IFF:

- ≥4 of 6 listeners' open-description responses include ≥2 terms from
  the Sterling-coded register cluster (deadpan / dry / mid-Atlantic /
  sardonic / spy / detective / film-noir / Archer-coded /
  briefing-room), AND
- ≥4 of 6 listeners say *Yes* or *Mixed* on character-fit, AND
- Zero listeners flag the voice as "obviously synthetic" on the
  uncanny-check, AND
- MUSHRA naturalness score ≥75/100 average.

Bonus signal (informative, not required): listener volunteers actor
recognition unprompted ("reminds me of Archer" / "sounds Sterling-y").
This is **not** the acceptance criterion — recognition would actually
indicate the voice is too close to a clone and triggers a Step 4
re-spec.

If multiple engines clear, pick lowest-cost.

**Step 5 — Fail-action ladder.**

- **Path A fail** (ElevenLabs preset + cadence-spec doesn't clear):
  try Path B (Briggsy clone + same cadence-spec).
- **Path B fail** (Briggsy clone + cadence-spec doesn't clear): try
  Path C engines (Gemini, OpenAI).
- **Path C fail** (all steerable engines fail): escalate to Path D
  hybrid — hire a voice actor on Voices.com or Voice123 who already
  reads in a Sterling-coded register ($150–500 budget for 60–90s
  trailer read). The cadence-spec is the casting brief. Optional
  polish via ElevenLabs Voice Changer (speech-to-speech) on the
  actor's owned voice for additional cadence refinement.
- **Path D fail or budget exceeded:** restructure to non-Dash briefer.
  Use established voice DNA for Janet-M (`ActMission.tsx`), Vera
  (`ActRoster.tsx:32–36`), or Sable (`ActRoster.tsx:39–46`). Whichever
  character's voice the available engines can match the cadence-spec
  best wins. **R4 is recast** to ~90% of the new briefer's voice.

There is no "abandon" terminal — the legal floor is no longer the
constraint, only the cadence-match bar. If Path A–D all fail, the
trailer ships with the best-available non-Dash briefer (Path D outcome)
or with a deliberately TTS-tinged register that owns the synthetic-ness
rather than fighting it (last-resort design pivot, surfaces back to
Briggsy as a brainstorm-level decision).

Budget hard stop: $50 across Paths A–C + WebMUSHRA hosting. Path D
($150–500 hybrid) is a separate line item gated on explicit Briggsy
approval before spend.

**Patterns to follow:**

- UMB narrator script structure: `projects/undercover-mob-boss/scripts/generate-narrator.ts`
- VOICE_DIRECTION guard placement: same script, lines 195–198
- Dash voice DNA citations: `src/client/howtoplay/acts/{ActMission,ActRoster,ActArsenal,ActIntercept}.tsx`
- Spec §3.6 verified-influences pattern (style-mimicry, not literal
  reproduction): `docs/PRODUCT-SPECIFICATION.md` §3.6

**Test scenarios:**

- **Happy path:** `generate-tts-eval.ts --engine elevenlabs` produces
  3 valid WAV files (RIFF header + non-zero data section) at
  `sample-eval/r4-dash/elevenlabs/` matching the three sample paragraphs.
- **Happy path:** `--engine gemini` and `--engine openai` produce same
  3-file output structure for their respective engine subdirectories.
- **Happy path:** `generate-tts-eval.ts` reads cadence-spec.md and
  passes it as the steering input to each engine (via each engine's
  appropriate API surface — voice-control settings for ElevenLabs,
  Director's Notes for Gemini, instruction string for OpenAI). The
  cadence-spec is NEVER prepended to the script text payload.
- **Edge case:** `--engine elevenlabs --force` overwrites existing WAVs
  (UMB precedent — skip-if-exists default, force flag for re-run).
- **Edge case:** `--engine elevenlabs --dry-run` lists what would be
  generated without making API calls.
- **Error path:** Missing API key produces fatal error with clear
  message naming which env var is required.
- **Error path:** API 401/403 produces fatal exit (auth issue, no retry).
- **Error path:** API 429 / 5xx triggers exponential backoff retry
  (3 attempts max, mirroring UMB pattern).
- **Integration:** `sample-script-dash.test.ts` greps
  `src/client/howtoplay/acts/ActMission.tsx` AND `ActRoster.tsx` for
  the source lines — verifies the sample paragraphs are derived from
  existing copy, not invented.
- **Anti-pattern guard:** `generate-tts-eval.ts` source contains the
  VOICE_DIRECTION comment block. Lint-grep candidate for follow-up.

**Verification:**

- `videos/trailer/sample-eval/r4-dash/cadence-spec.md` exists with
  each characteristic documented + source citations.
- `videos/trailer/sample-eval/r4-dash/{elevenlabs,gemini,openai}/`
  each contain three WAV files matching the sample paragraphs.
- `videos/trailer/sample-eval/r4-dash/MUSHRA-protocol.md` exists with
  WebMUSHRA setup instructions + question wording + listener tracking.
- `videos/trailer/sample-eval/r4-dash/results.md` documents listener
  responses + which path cleared (A/B/C/D). **Voice cast + cadence
  steering choice lock** for Phase 1 recorded in results.md.

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
nearest substitute if R4 is in Path D restructure).

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

**Step 1 — Document five candidate lines.** In `candidates.md`:

| # | Line | Speaker | Machine wordplay? | Notes |
|---|------|---------|--------------------|-------|
| 1 | *"...the kid did it. Again. Show-off."* | Vera (Lana-coded exasperated-impressed) | **No** | Brainstorm original. Lacks "machine"/"autonomous"/"wrote itself" double-meaning. Fails R14's stated requirement. |
| 2 | *"He did it again! Twice! TWICE!"* | Sable (Cheryl-coded chaos enthusiasm) | **No** | Brainstorm original. Same gap as #1. |
| 3 | *"Well. Apparently the second one shipped."* | Janet (Malory-coded dismissive-exec dryness) | **No** | Brainstorm original. Same gap as #1. |
| 4 | *"He's a machine, this kid. Honestly at this point I'm just impressed."* | TBD (Vera / Sable / Janet — picked by Unit 0.2 outcome) | **Yes** | NEW candidate. "He's a machine" reads as colloquial admiration to a naive viewer AND literally as "the machine did it" to engineering audience. Clears R14's stated load. |
| 5 | *"Briggsy didn't write this one either. He's getting good at not writing them."* | TBD | **Yes** | NEW candidate. Echoes UMB v3 cold-open hook ("Briggsy didn't write a single line of code... Not one."). Direct callback for viewers who HAVE seen UMB v3; standalone-coherent for those who haven't. |

The three brainstorm-original candidates are documented as failing the
brainstorm's own R14 line-shape requirement ("the chosen cold-open line
MUST contain the 'machine' double-meaning hook (or equivalent
wordplay)..."). Only candidates 4 and 5 — and any further variants — are
tested in Step 3.

**Step 2 — Cold-open spike composition.** `SpikeColdOpen.tsx` renders:

- 3–4 operative card flashes (~1.5–2s per card across ≤8s cold-open
  window — compressed from Archer's typical ~30s title sequence). Use
  existing artwork from `public/assets/cards/`:
  - Frame 0–60 (2s): cold-open speaker's portrait (Vera / Sable / Janet
    per Unit 0.2 outcome) — chosen art TBD.
  - Frame 60–120 (2s): Dash portrait (the briefer) — `dash-barlowe.webp`.
  - Frame 120–180 (2s): one more operative (Neal / Sable / etc.) for
    cast density.
- Chevron / target-reticle motifs as background layer (placeholder SVG
  for spike; Lottie or refined SVG in Phase 4).
- BURNED logo treatment as the landing card (bold mid-century geometric,
  matching Archer title-sequence vocabulary; Bass / Ferro lineage).
- Brass-jazz hook (royalty-free placeholder — full sourcing in Phase 3).
- TTS cold-open line dropped over the music hook at frame ~30.
- Optional R15 chrome stamp landing in the cold-open frame:
  `"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"` — tests
  whether the visual signal layer reinforces the audio.

**Step 3 — Tester protocol.** Document in `decode-eval.md`:

- **Listeners:** 2 minimum engineering-peer testers who have NOT seen
  UMB v3 (brainstorm requirement). 4 target. Briggsy's network +
  Discord recruitment.
- **Stimulus:** 5s rendered MP4 clip played cold — no context, no setup.
- **Open question (asked first):** *"What do you think this trailer is
  about?"* Tester narrates their reaction stream-of-consciousness for
  30 seconds.
- **Acceptance:** at least 1 of 2 testers surfaces "AI / agent /
  autonomous / built itself" unprompted within the first 30 seconds.
- **Failure mode 1 — line decodes but not as autonomous:** tester
  describes the trailer as "Archer parody" or "spy comedy" without
  mentioning autonomy. **Rewrite line** with more explicit phrasing
  (candidates: *"He wrote himself a sequel,"* *"The machine learned to
  ship."*).
- **Failure mode 2 — visual decodes but audio doesn't:** R15 chrome
  stamp lands, but spoken line doesn't sell the autonomy hook. **Add
  visual signal density** — a Claude / agent log-entry stamp landing as
  the line drops.
- **Failure mode 3 — neither audio nor visual decodes:** R14 falls back
  to non-voice cold-open. Title-card structure remains (operative flashes
  + brass hook + BURNED logo + agentic-SDLC stamp); spoken line dropped.
  R15 carries full signal load.

**Patterns to follow:**

- UMB v3 cold-open: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S01_ColdOpen.tsx`
- UMB v3 cold-open line shape: "Briggsy didn't write a single line of
  code... Not one." (`projects/undercover-mob-boss/scripts/narrator-prompts.ts` v3-cold-open)

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

**Step 2 — TTS generation.** Voice via the engine selected in Unit 0.2.
Output: `sample-eval/tone/sample.wav`. ~20 seconds.

**Step 3 — Tester protocol.** Document in `eval.md`:

- **Listeners:** 2 engineering-peer testers, two distinct profiles —
  - Archer-aware (validates the gag references land culturally)
  - Archer-unaware (validates the gap-comedy works without the show
    pre-loaded — closer to a real audience cross-section).
- **Stimulus:** 20s WAV played cold, single listen.
- **Question:** *"What's the joke here?"*
- **Acceptance threshold:** Both listeners articulate unprompted that
  the gap between spy-speak and SDLC reality is the joke. Phrasings
  may vary ("they're describing software in spy terms," "it's nerds in
  bond movie cosplay," "calling code a forensic dossier is doing a lot
  of work") — any articulation of the *gap structure* clears.

**Step 4 — Fail-action.** If either listener doesn't articulate the
gap structure unprompted, the **played-straight Key Decision is
RE-OPENED** as a brainstorm-level question, not patched silently with
a Vera-hedge or wink-handoff. Either the played-straight thesis
survives a real test or it isn't a locked decision.

Fail-action outcomes:
- Re-write sample paragraph to lean harder into the SDLC subject
  matter (more dossiers, more rehearsals, more debriefs) and retest
  with new listeners.
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
  scene with HTP-placeholder + one stat overlay + one Archer-grammar
  transition candidate.
- Create: `videos/trailer/src/scenes/SpikeS02_Gameplay.tsx` — 2s
  placeholder gameplay clip (any 1920×1080 silent MP4 works — UMB's
  HTP fullpage screenshot animated via translateY interpolation is
  the lightest precedent).
- Create: `videos/trailer/src/SpikeCompositionMain.tsx` — wraps
  SpikeS01 + cross-dissolve transition + SpikeS02 in `<TransitionSeries>`.
- Create: `videos/trailer/scripts/capture-htp-scroll-burned.ts` — clone
  of UMB's `capture-htp-scroll.ts` pointed at BURNED's HTP page.
- Create: `videos/trailer/public/htp-fullpage.png` — captured BURNED HTP
  full page (output of capture script).
- Create: `videos/trailer/public/fonts/{display}.woff2` — at least one
  self-hosted display font for the custom-font rendering test.
- Create: `videos/trailer/sample-eval/spike/spike-results.md` —
  pass/fail per integration point + remediation notes if any fail.
- Create: `videos/trailer/out/spike-frame-test.mp4` — rendered MP4 for
  inspection.

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
import { interpolate, staticFile } from 'remotion';

// Music bed fading under VO
<Audio
  src={staticFile('audio/spike-music-bed.mp3')}
  volume={(f) => interpolate(f, [0, 30, 90, 150], [0, 0.6, 0.2, 0.6], { extrapolateRight: 'clamp' })}
/>
<Audio src={staticFile('audio/spike-vo.wav')} from={30} />
```
Uses three audio sources: music bed (fades up), VO (drops in at frame
30), and (silent) gameplay capture for the closer (muted).

**Integration point (c) — Custom font in MP4 export.**
```ts
// useFonts.ts
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let loaded = false;
export function useFonts() {
  if (loaded) return;
  loaded = true;
  loadFont({
    family: 'BurnedDisplay',
    url: staticFile('fonts/burned-display.woff2'),
    weight: '700',
    format: 'woff2',
  });
}
```
`@remotion/fonts.loadFont()` auto-blocks the render until the font is
ready — no manual `delayRender` / `continueRender`. Used in
`Root.tsx` at top. Spike validates by rendering a text overlay using
`font-family: BurnedDisplay` and confirming the EXPORTED MP4 shows the
loaded font (not a fallback). If fallback appears in MP4 but not studio
preview, the bug is in our load timing — not the package.

**Integration point (d) — HTP dossier placeholder via Playwright.**
`capture-htp-scroll-burned.ts` clones UMB's script. Diff:

- URL: `http://localhost:5173/howtoplay.html` (BURNED Vite dev) for
  Phase 0 spike. Production URL (`burned-cxa.pages.dev`) deferred to
  Phase 3 after deploy migration completes.
- Output: `videos/trailer/public/htp-fullpage.png`.
- 1920×1080 viewport, scroll-by-200px-then-wait-80ms loop (same UMB
  trick — triggers BURNED's GSAP ScrollTrigger animations).
- Reports `scrollHeight` so Phase 3 can compute the Remotion scroll
  distance.

`SpikeS01_Cascade.tsx` renders the captured PNG with a `translateY`
interpolation:
```tsx
<Img
  src={staticFile('htp-fullpage.png')}
  style={{ transform: `translateY(${interpolate(frame, [0, 60], [0, -800])}px)` }}
/>
```

**Integration point (e) — Archer-grammar transition candidate.** Pick
ONE of (chosen on aesthetic preference at spike time):

- **Iris wipe.** Circular SVG mask animating from full-screen to point.
  Achievable in pure Remotion with `<clipPath>` + interpolated radius.
- **Classification-stamp slap.** Stamp graphic rotates in from
  upper-right + lands with a 1-frame scale-up + 1-frame settle. Pure
  Remotion (interpolation of rotation + scale).
- **Kinetic typography reveal.** Single-line text appears word-by-word
  with per-word interpolated `opacity + translateY`. Pure Remotion.

If the chosen transition lands cleanly in pure Remotion: Archer-grammar
transition vocabulary lives in Remotion. If it requires Lottie or
post-processing: install `@remotion/lottie` in Phase 4 OR plan
post-process compositing in After Effects (worst case — explicit
budget bump).

**Pass criterion.** All five points (a–e) clear in
`out/spike-frame-test.mp4`:

- (a) Cross-dissolve visually completes over 20 frames (no hard cut).
- (b) Music bed audibly drops to 20% when VO drops, returns to 60%
  after VO ends.
- (c) Custom-font text overlay renders with `BurnedDisplay` family (not
  the default sans-serif fallback).
- (d) HTP dossier scrolls smoothly in the cascade window.
- (e) Archer-grammar transition lands without visual artifacts.

Fail-mode root-cause analysis required before Phase 1 begins.

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

**Dependencies:** Unit 0.2 (engine + voice cast chosen — Vera's target
timbre informs Path (b) speech-to-speech polish target).

**Files:**

- Create: `videos/trailer/sample-eval/r5-scream/path-a-tts.wav` — Path
  A: pure-TTS scream (ElevenLabs v3 with `[scream]` tag).
- Create: `videos/trailer/sample-eval/r5-scream/path-b-hybrid.wav` —
  Path B: real human scream + Voice Changer post-processing.
- Create: `videos/trailer/sample-eval/r5-scream/scream-eval.md` —
  protocol + listener responses + decision.

**Approach:**

**Path (a) — TTS scream.** Generate via ElevenLabs v3 with `[scream]`
emotion tag on the Vera voice (whichever voice cleared R4 or is
substituted by Unit 0.2's outcome). Single 1.5-second clip. CAPS letters
in the script for additional intensity signal.

**Path (b) — Hybrid scream.** Process:
1. Real human scream recording: Briggsy or volunteer screams "VERA!!!"
   into phone or laptop mic. ~1.5 seconds. Multiple takes for selection.
2. ElevenLabs Voice Changer (speech-to-speech) applies the Vera voice
   timbre to the owned recording. Briggsy's own voice → Vera timbre
   keeps the legal path clean (owned source audio).
3. Output: `path-b-hybrid.wav`.

**Listener protocol.** Document in `scream-eval.md`:

- **Listeners:** 2 minimum Archer-fan testers (same pool as Unit 0.2
  Archer-fan portion).
- **Stimuli:** Three clips played in randomized order — (a) Path A TTS,
  (b) Path B hybrid, (c) a real H. Jon Benjamin scream clip from
  archival audio (Lana-scream supercut on YouTube — fair use for
  evaluation, not shipping) as hidden reference.
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
- **Scream outcome lock** for Phase 1 recorded in `scream-eval.md`.

---

## System-Wide Impact

- **Interaction graph:** All five gate outcomes flow into Phase 1 (Beat
  Sheet Lock). Voice cast (R4 + R14 + R5) determines scene voice
  assignments. Tone outcome (R2 thesis) determines whether
  played-straight cadence survives. Spike outcome determines Remotion
  package set + transition vocabulary scope. R15 chrome stamp design
  validated through Unit 0.3 + 0.5.

- **Error propagation:** If Unit 0.2 fails Paths A–D, Phase 0 fails to
  clear → Phase 1 cannot begin → trailer concept restructured or
  abandoned (Path E). If Unit 0.3 fails both rewrites + visual signal
  augmentation, R14 falls back to non-voice cold-open + R15 carries
  full agentic-SDLC signal load. If Unit 0.4 fails twice,
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
| Path D budget approval delays | Low | Medium | Defer Path D ($150–500 hybrid) to a separate Briggsy approval gate; Phase 0 continues with Path A/B/C engine evaluation in parallel. |
| Listener recognizes voice as Benjamin clone unprompted | Low (cadence-spec is style-only) | High (means engines drifted toward impression, not style) | Re-spec the cadence input — strip any identity-suggesting characteristic, re-run engine matrix. |
| MUSHRA tester recruitment delay (no 6 listeners within 1 week) | Medium | Low | Reduce to 4-listener pass with stated reduced confidence; document gap explicitly in results.md. |
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
  hosting, 6–8 listeners. Acceptance shifted from actor-identity
  testing to register-recognition testing — listeners describe the
  voice in their own words, success = Sterling-coded register cluster
  terms (deadpan / dry / mid-Atlantic / sardonic / spy / detective /
  film-noir / Archer-coded). Plus character-fit yes/no and
  uncanny-valley check.
- **TTS budget envelope:** $50 ceiling for engine eval (research-corrected
  from brainstorm's $10). Separate $0–500 line for Path D hybrid.
- **Twitter/X mobile crop:** 1:1 safe square within 16:9 frame. No
  separate vertical track.
- **R14 cold-open candidate lines:** Three brainstorm originals
  documented as failing R14's machine-wordplay requirement; two new
  candidates proposed for testing (Unit 0.3 candidates table).

### Deferred to Implementation

- **Benjamin Sterling cadence characterization completeness:** Step 0
  output document quality determined by Unit 0.2 execution. Re-spec
  triggered if Step 4 acceptance fails on "too generic" grounds.
- **Which TTS engine + voice path clears R4 cadence-match:** answered
  by Unit 0.2 listener pass (Path A preset / Path B Briggsy clone /
  Path C Gemini or OpenAI / Path D hybrid VO).
- **Which candidate cold-open line decodes:** answered by Unit 0.3
  listener pass.
- **Whether the played-straight thesis survives the tone gate:** answered
  by Unit 0.4 listener pass.
- **Whether Lottie-inside-Remotion is needed for Archer transition
  vocabulary:** answered by Unit 0.5 transition-candidate render.
- **Whether the R5 scream is kept via Path (a), Path (b), or cut:**
  answered by Unit 0.6 listener pass.
- **Briggsy's voice clone via ElevenLabs Instant Voice Cloning vs
  Professional Voice Cloning:** Instant is the default (10s sample);
  Professional (30-min sample) deferred only if Instant clearly fails
  the cadence steering.
- **Specific brass-jazz hook for cold-open spike:** any royalty-free
  placeholder works for spike; full source decision in Phase 3.

---

## Documentation / Operational Notes

- All gate evaluation artifacts land in
  `projects/burned/videos/trailer/sample-eval/`.
- TTS API keys (Gemini, ElevenLabs, OpenAI) stored in `.env` at BURNED
  project root — loaded via `set -a && source .env && set +a` before
  any TTS script invocation (per Briggsy's autonomy rule).
- VOICE_DIRECTION anti-pattern guard: inline comment in
  `generate-tts-eval.ts` at API call site, plus `generate-dash-tts.ts`
  when that script is written in Phase 2.
- Spike artifacts (`SpikeColdOpen.tsx`, `SpikeS01_Cascade.tsx`,
  `SpikeS02_Gameplay.tsx`, `SpikeComposition*.tsx`, spike-frame-test.mp4)
  are intentionally throwaway. Mark for removal in Phase 4 cleanup once
  real scenes ship.
- Listener recruitment routing: Briggsy's Discord network + Harry
  (per `user_harry.md`) as the primary tester pool. Documented in
  each unit's protocol file with consent confirmation.

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

**BURNED voice DNA citations:**
- Dash blurb + flourish: `src/client/howtoplay/acts/ActRoster.tsx:18–28`
- Dash tactic lines: `src/client/howtoplay/acts/ActArsenal.tsx` (Phrasing! beats at lines 49, 76)
- M / briefer cadence: `src/client/howtoplay/acts/ActMission.tsx:31–34, 73–74`
- Vera dossier: `src/client/howtoplay/acts/ActRoster.tsx:32–36`
- Sable dossier: `src/client/howtoplay/acts/ActRoster.tsx:39–46`
- Janet dossier (M): `src/client/howtoplay/acts/ActRoster.tsx:48–55`
- Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187–194`

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
