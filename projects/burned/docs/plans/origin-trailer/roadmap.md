---
title: "BURNED Origin Trailer — Roadmap"
type: feat
parent: docs/ideation/2026-05-15-origin-trailer-brainstorm.md
created: 2026-05-16
deepened: pending
reviewed: pending
status: active
phases:
  - phase-0-gate-resolution.md             # drafted 2026-05-16
  - phase-1-beat-sheet-lock.md             # drafted 2026-05-16
  - phase-2-voice-pipeline.md              # drafted 2026-05-16
  - phase-3-visual-asset-prep.md           # drafted 2026-05-16
  - phase-4-remotion-composite.md          # drafted 2026-05-16
  - phase-5-gameplay-capture.md            # drafted 2026-05-16
  - phase-6-final-render-qa.md             # drafted 2026-05-16
  - phase-7-distribution.md                # drafted 2026-05-16
---

# BURNED Origin Trailer — Roadmap

> *Parent document for the BURNED Origin Trailer build. Inherits every
> constraint from the origin-trailer brainstorm at
> `docs/ideation/2026-05-15-origin-trailer-brainstorm.md`. When a phase
> file disagrees with the roadmap, the roadmap wins unless the roadmap is
> demonstrably wrong — in which case we update the roadmap.*

> **Status: All 8 phase files drafted (2026-05-16). Deepening
> pending — runs sequentially across all 8 phase files next.** Per
> `feedback-phase-plan-drafting-workflow.md`, the complete set of phase
> files is written in one workflow; deepening runs sequentially across
> all 8 after all are drafted.

**Mission.** Ship a ~95-second 16:9 origin trailer for BURNED that lands
the Archer-grade quality bar on every frame, telegraphs the
agentic-SDLC origin to a no-context engineering-peer viewer within the
first five seconds, and stands as the second proof point that the
autonomous-SDLC method works repeatably (UMB v3 was the first).

---

## §1 — Why This Exists

UMB v3 — `projects/undercover-mob-boss/videos/trailer/` — is the working
precedent. 9 scenes, 4440 frames at 30fps (= **148 seconds**; the
brainstorm cites ~124s — see §6 Brainstorm Corrections). Solo Charon
noir narration over a chronological SDLC trace. Shipped.

BURNED has a richer toolkit: seven named operatives in the roster
(Dash, Vera, Sable, Janet, Neal, Otto, Agent X) + Dolores Grieves NPC,
a locked Archer-the-show visual vocabulary, in-world Pendleton Agency
set-dressing (briefing-room dossiers, comms ticker, venetian blinds),
17 unique Imagen-generated card artworks, a 10-act how-to-play dossier
app (`src/client/howtoplay/`), and the locked product specification at
`docs/PRODUCT-SPECIFICATION.md`.

**The bar-raise is the repeat itself, not new engineering substance.**
UMB v3 told the autonomous-SDLC story for the first time. BURNED's
trailer is the second proof point: *"UMB wasn't a lucky shot — the
method works twice, at Archer-grade, with a richer toolkit landing as
instruments not decoration."* Production polish (per-frame Archer
faithfulness, Pendleton briefing format, multi-voice cast, dossier-grade
artifact storytelling) is how we make the repeat *land*; the repeat
itself is what the trailer is selling.

---

## §2 — Quality Bar

**Mission line (inherited from `docs/PRODUCT-SPECIFICATION.md` §2).**
*"BURNED is indistinguishable from a commercial party game released by
a real studio."* Trailer translation: *indistinguishable from a real
studio's promotional reel for a commercial Archer-themed party game.*

**Per-frame acceptance test.** *"Could this look like a frame from an
Archer episode?"* Binary yes/no. Every shot, every overlay, every
transition state, every cascade card, every cold-open title flash.

**Trailer-specific layers (additive to spec §2):**

- **Muted-autoplay readability.** X autoplay is muted by default. Every
  text overlay must read silently. Captions / burnt-in chrome are not
  optional — they carry narrative when audio is gone.
- **First-three-seconds discipline.** The first three seconds determine
  whether a feed viewer scroll-stops. No logo opening. No face opening.
  Bold visual + text claim, instantly. R14's compressed-Archer
  title-sequence shape satisfies this if executed.
- **Chyron-is-the-joke / visual-is-the-setup.** Comedy stat overlays land
  one beat at a time. Never visual-and-overlay punchline simultaneously.
- **Mobile-crop safety.** X serves a **1.91:1 in-feed preview crop on
  mobile**. Critical text must live within a central 1:1 safe square
  inside the 16:9 frame.
- **The water-beads test (from the elite-engineer manifesto).** The
  magic of agentic autonomous software development should disappear and
  the joy of the product itself should take over. If a reviewer reacts
  "wow Claude built this," the bar was missed. The product has to stand
  on its own. The craft has to be invisible.

---

## §3 — Phase Breakdown

| # | Phase | Produces | Gating dependency |
|---|-------|----------|-------------------|
| 0 | **Gate Resolution** | Trailer project scaffold + 5 gate evaluations under `videos/trailer/sample-eval/`. Voice cast + tone + composite-spike-viable foundation. | None — Phase 0 is the entry point. |
| 1 | **Beat Sheet Lock** | Scene-by-scene 90–100s outline with locked voice cast, locked tone, locked transition vocabulary. `videos/trailer/BEAT-SHEET.md`. | Phase 0 — all five gates resolved (cleared / restructured / cut). |
| 2 | **Voice Pipeline** | Dash sustained narration WAVs + R5 scream + R14 cold-open line, generated via `videos/trailer/scripts/generate-dash-tts.ts`. | Phase 1 — beat sheet defines the line set. |
| 3 | **Visual Asset Prep** | BURNED HTP fullpage capture, goofy-stats list with cold-read gate, card-art curation, briefing-room composition, R15 text-signal layer assets. | Phase 1 — beat sheet defines the asset inventory. (Parallel with Phase 2.) |
| 4 | **Remotion Composite Build** | All scenes assembled in `videos/trailer/src/scenes/*.tsx` at studio-preview quality. Per-scene Archer test pass. | Phases 2 + 3 — voice + visual assets ready. |
| 5 | **Gameplay Capture Harness + Capture** | Real BURNED multiplayer gameplay clip (phone-controller + TV-shared-screen) at `videos/trailer/assets/gameplay.mp4`. | Deploy migration partykit → Cloudflare Workers complete (per TODO.md §1 note). |
| 6 | **Final Render + QA** | `out/trailer.mp4` at H264/CRF 18, bar-raise criteria evaluation against UMB v3 on the three locked axes. `qa-report.md`. | Phases 4 + 5 — all scenes integrated, gameplay closer in place. |
| 7 | **Distribution** | X-native cutdown + portfolio embed + distribution plan. | Phase 6 — final QA pass cleared. |

All 8 phase plans drafted (2026-05-16). Deepening runs sequentially
across all 8 phase files next, per
`feedback-phase-plan-drafting-workflow.md`. Briggsy reviews after
deepening completes.

---

## §4 — Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Remotion 4.0.438 pin** | Inherited from UMB v3. Within 4.x stability policy (additive only). Working render pipeline. |
| 2 | **Isolated package** at `projects/burned/videos/trailer/` (not added to `pnpm-workspace.yaml` packages: array) | Mirrors UMB pattern — stub workspace, own `node_modules` + `pnpm-lock.yaml`. Avoids leaking Remotion deps into BURNED's phone bundle. |
| 3 | **Self-hosted woff2 via `@remotion/fonts`** | UMB precedent. `loadFont()` from `@remotion/fonts` returns a promise Remotion auto-tracks for `delayRender` — no manual machinery, no studio-vs-export font fallback trap. **NOT `@remotion/google-fonts`.** |
| 4 | **`@remotion/transitions` — install ON-DEMAND, NOT used at composition level** (revised 2026-05-17 per Phase 1 deepening) | Original brainstorm intent: required for R3 cross-dissolve via `<TransitionSeries>`. Phase 1 deepening replaced the cross-dissolve with a hard cut after the payoff visual hold (more Archer per design-lens; resolves 3 internal timing contradictions; avoids TransitionSeries overlap-math conflict with `timing.ts` declared sums). BURNED uses **bare `<Series>` + scene-internal overlay components** (stamp slap, dossier-page wipe, iris wipe) — matches UMB v3 precedent exactly. `@remotion/transitions` may still be installed for the `iris()` / `addSound()` primitives as overlay-component helpers — Phase 4 micro-spike decides necessity. |
| 5 | **ADD `@remotion/media`** (UMB uses legacy `Html5Audio`) | Newer `<Audio>` component (4.0.x) — better frame-accuracy, Mediabunny-backed. Required for R3's audio crossfade and R9's music bed. |
| 6 | **`@remotion/lottie` — install ON-DEMAND** | Reserved for R14 chevron / target-reticle motion graphics if static SVG won't deliver. **NOT pre-installed in Unit 0.1.** Phase 0 Unit 0.5 spike validates all three Archer-grammar transition candidates (stamp-slap primary / iris wipe fallback / kinetic typography for stat overlays) in pure Remotion FIRST. Install only if a candidate's pure-Remotion render fails (YAGNI — the spike decides necessity). |
| 7 | **INSTALL `@remotion/skills`** | Remotion Agent Skills for Claude Code (Jan 2026 release, ~126k installs). 28 rule files auto-load when Claude touches Remotion code. Fundamentally improves the agentic iteration story. |
| 8 | **`Config.setPublicDir('../../public')`** | UMB pattern. Trailer reads BURNED's existing public/ — card art, fonts, audio — without duplication. |
| 9 | **VOICE_DIRECTION anti-pattern guard** | Inline comment at TTS API call site mirroring UMB's `generate-narrator.ts:195-198`. Gemini TTS reads ALL text verbatim — style instructions become spoken audio. Codify on first write of `generate-dash-tts.ts`. |
| 10 | **TTS-budget envelope: $50** | Research-corrected from brainstorm's $10. Real engine-eval cost across ElevenLabs Creator ($22) + Gemini ($10) + OpenAI ($5) + WebMUSHRA hosting ($0–20). Hybrid path adds $200–500. |
| 11 | **No `<TransitionSeries>` at composition level — bare `<Series>` + scene-internal overlay components** (revised 2026-05-17 per Phase 1 deepening) | UMB v3 TrailerV3.tsx (verified lines 28-56) uses bare `<Series>` of `<Series.Sequence>` with ZERO scene-boundary transitions. FadeTransition exists in UMB only as scene-internal element fader (V3S08, etc.). BURNED inherits this composition shape exactly. Scene transitions (stamp slap, dossier-page wipe, iris wipe) are overlay components rendered inside scene tail/head frames, NOT TransitionSeries presentations. This avoids the `<TransitionSeries>` overlap-math (`total = sum - transitions`) that would contradict `timing.ts`'s declared TOTAL_FRAMES=2850. |
| 12 | **All phase files drafted in one workflow** | Per `feedback-phase-plan-drafting-workflow.md` (corrected 2026-05-16): write the complete set of phase files sequentially in one drafting workflow. Mid-drafting stops are for Claude's context-density management, never for Briggsy's review. Deepen all phases sequentially AFTER they're written, not per-phase during drafting. Briggsy reviews output, not intermediate planning artifacts. |
| 13 | **Sterling-CODED, not Sterling-cloned** (locked 2026-05-16) | BURNED's visuals scream Archer without being Archer (per `docs/PRODUCT-SPECIFICATION.md` §3.6 "verified influences" — Bass, Ditko, Mad Men, OSS 117 as influences, not literal reproductions; `project-burned-creative-direction` memory). **Voice follows the same principle:** Sterling-CODED cadence (deadpan mid-Atlantic clip, sardonic lift, deliberate pace, declarative falling intonation on punchlines) without being a Benjamin clone or impression. This is a design choice first; the legal floor (see §5.1) aligns with it. |

---

## §5 — Critical Constraints (Research-Surfaced)

These were not visible in the brainstorm but matter at planning time.

### §5.1 — Sterling-CODED, not Sterling-cloned (design principle + legal floor align)

**The design principle (locked 2026-05-16, ADR #13).** BURNED's visuals
scream Archer without being Archer — Saul Bass, Steve Ditko, Mad Men,
1960 Bond, OSS 117, Pink Panther named as influences in spec §3.6, none
literally reproduced. **The voice follows the same rule.** We want
Sterling-CODED cadence (deadpan mid-Atlantic clip, sardonic lift on
terminal syllables, deliberate pace, declarative falling intonation on
punchlines, the barely-audible exhale that reads as "I am exhausted by
you specifically") without being a Benjamin clone or recognizable
impression. **Mimicry of style; never replication of identity.**

This is the design choice. The legal floor aligns with it as supporting
context:

**ElevenLabs Prohibited Use Policy (updated Sept 3 2025)** forbids
unauthorized impersonation including voice replication of any
identifiable person without consent. Audio is traceable to the user
account.

**Statutory frameworks reinforce this:**

- **Tennessee ELVIS Act 2024** — first state law specifically classifying
  unconsented voice clones as actionable.
- **Proposed federal NO FAKES Act** — Senate, 2026; would federalize
  the right-of-publicity claim for voice.
- **EU AI Act (Aug 2025 phased rollout)** — classifies unconsented
  voice cloning of identifiable public figures as high-risk.

**Right-of-publicity claims survive "satire" framing for commercial
content.** Even non-monetized promotional content asserts identity
ownership; satire framing doesn't waive that.

**Operative rule:** No engine is asked to produce a recognizable
Benjamin / Sterling Archer voice. The R4 work in Unit 0.2 instead
**characterizes Benjamin's distinctive Sterling cadence as teachable
specs** (pitch range, pace, mannerisms, intonation contours), then
applies those specs as TTS steering on ANY voice — preset, owned-clone,
or voice-actor. The acceptance test is *"does this voice land in the
Sterling-coded register?"* — character-archetype recognition, not
actor recognition.

### §5.2 — Blind-tester protocol: MUSHRA, register-recognition framing

Industry standard for "does this fool listeners" research is **MUSHRA**
(ITU-R BS.1534-3). The brainstorm specifies "≥2 testers, blind
protocol" — research shows this is too thin for statistical confidence
on a voice authenticity question. **6–8 listeners minimum** for an
informal research pass (8–12 for a formal one).

**Stimuli per ADR #13 (Sterling-CODED, not Sterling-cloned):** 3–4 TTS
candidates + low-quality anchor + **non-Benjamin Sterling-coded
reference clip** (voice-actor portfolio sample in the deadpan-spy
register) used as the cadence target — NOT as an identity reference.
The reference anchors the MUSHRA score scale; it never serves as a
clone-match target. Question phrasing avoids "which is fake"
leading-the-witness. Open-source hosting via **WebMUSHRA** (ed.ac.uk).

**Acceptance threshold for R4 (register-recognition, NOT
actor-identity):**
- ≥4 of 6 listeners' open-description responses include ≥2 terms from
  the Sterling-coded register cluster (*deadpan / dry / mid-Atlantic /
  sardonic / spy / detective / film-noir / Archer-coded /
  briefing-room*).
- ≥5 of 6 listeners say *Yes* or *Mixed* on character-fit ("does this
  voice match a fictional spy-agency briefer named Dash Barlowe, ~90%
  of trailer runtime?").
- **Joint pass:** ≥4 listeners clear character-fit AND register-cluster
  AND don't flag obviously-synthetic — **same listener across all
  three dimensions**.
- ≤1 of 6 flags "obviously synthetic" on the uncanny-check (with
  free-text capture of what sounded synthetic, for triage).
- MUSHRA naturalness within **±10 points of the non-Benjamin
  Sterling-coded reference clip** (reference-anchored, not absolute).

**Bonus-signal disambiguation:** if a listener invokes Archer/Sterling
unprompted ("sounds Sterling-y," "reminds me of Archer"), the protocol
follows up: *"does it sound like the same actor, or the same style?"*
*Same style* → register pass (target achieved). *Same actor* → engines
drifted toward impression and a Step 4 re-spec is triggered. See Phase
0 Unit 0.2 Step 4 + spectrum bands (Floor / Target / Ceiling).

### §5.3 — Twitter/X mobile crop resolved

The brainstorm flagged a "pressure test before planning" question about
whether to add a center-safe-zone composition rule (Dependencies
§Distribution surface). **Resolved:** X serves a **1.91:1 in-feed
preview crop on mobile**. Critical text must live within a central 1:1
safe square inside the 16:9 frame. No separate vertical track required
— just composition discipline.

### §5.4 — Engineering-Twitter trailer best practices (2026)

- **Runtime sweet spot for portfolio trailers: 60–90s.** BURNED's
  90–100s envelope is at the top end. Acceptable.
- **For X-native in-feed cutdown: 7–15s.** Phase 7 ships a flagship 95s
  + a 12s X-native cutdown.
- **Dead tropes:** slow logo intros, narrator-on-camera, "Hi I'm X..."
  openings, synth-piano underscore, before/after stopwatch splits.
- **Alive:** working product in motion in second 1, UI speaks, text
  overlays carry the narrative because feed autoplay is muted.
- **Reference points (no single canonical "AI built this" trailer):**
  Replit Agent 3 + 4 launch reels (Sept 2025, March 2026) — real-time
  screen recording, no narration, captions only. Cursor 0.50 "Agent
  Revolution" + Cursor 3 "Mission Control" — screen-recorded multi-file
  refactor, ambient sound, visible code touching real files. **Pattern:
  show artifact working in second 1, never explain in VO, let chyron
  carry the joke.**
- **X video specs (2026):** MP4/MOV, H.264 High profile, AAC-LC
  128 kbps audio. 30 fps recommended (60 supported). 5–8 Mbps VBR for
  1080p (don't overshoot — X re-encodes). Non-premium cap 2:20 / 512 MB.

### §5.5 — Composite-spike key risk: font fallback in MP4 export

Brainstorm flags the studio-vs-export font risk as a spike requirement.
**Resolved by architecture:** `@remotion/fonts.loadFont()` automatically
blocks render until the font is ready — no manual `delayRender` /
`continueRender` machinery. The "works in studio, falls back in MP4"
trap is specifically the manual `FontFace` API path. UMB's `useFonts`
hook proves the pattern.

### §5.6 — No prior art for several Phase 5 / Phase 4 patterns

- **Playwright `page.video()` / trace-video gameplay capture** (R13) —
  brand-new. Phase 5 budgets a full standalone phase for invention.
- **Expressive TTS for screams** (R5) — UMB only did calm noir. The
  "Archer-grade authentic or cut" framing in the brainstorm is correct.
  Real human scream + Voice Changer post-processing is the documented
  industry pattern when synthesis fails.
- **Mid-century brass / bossa music bed sourcing** (R9) — brainstorm
  defers to planning. Three candidate sources (generative / royalty-free
  / licensed) resolved in Phase 3.
- **Composite multi-source video** (Imagen art + Playwright page scroll
  + real gameplay footage + live TTS in one timeline) — UMB came close
  (HTP scroll + Imagen art + chaos sim) but never integrated real
  gameplay footage. Phase 4 budget accounts for this.

---

## §6 — Brainstorm Corrections Surfaced by Research

These are factual updates to the brainstorm that planning carries
forward. The brainstorm itself remains the locked requirements contract
— these notes correct numbers / claims that don't reshape requirements.

| # | Brainstorm claim | Research finding | Disposition |
|---|------------------|------------------|-------------|
| C1 | UMB v3 runtime "~124s" (Problem Frame + Key Decisions §90–100s runtime) | Authoritative source `timing-v3.ts` — total is **4440 frames @ 30fps = 148.0s**. | BURNED 95s vs UMB 148s. Recalculated scene density: BURNED 95s / 6 scenes = 15.8s/scene; UMB 148s / 9 scenes = 16.4s/scene. **"Comparable density" defense in brainstorm Key Decisions holds, with corrected numbers.** |
| C2 | TTS evaluation budget "$10 across both jobs" (R5-research-gate) | Real envelope for one-off voice eval: <$50 (ElevenLabs Creator $22 + Gemini $10 + OpenAI $5 + MUSHRA hosting $0–20). Hybrid path: $200–500. | **Plan budget: $50 ceiling for engine evaluation, separate $0–500 line item for hybrid VO if Path C triggers.** |
| C3 | R4 / R14 testers: "≥2 testers, blind protocol" | MUSHRA protocol (ITU-R BS.1534-3) requires 6–8 minimum listeners for informal voice-authenticity confidence. | **Plan tightens R4 + R14 acceptance to 6–8 testers with WebMUSHRA-style protocol.** |
| C4 | R14 candidate cold-open lines | Three of five named candidates (Vera "kid did it. Again. Show-off.", Sable "He did it again! Twice! TWICE!", Janet "Apparently the second one shipped") **lack the machine-wordplay R14 explicitly requires** ("machine"/"autonomous"/"wrote itself"/"built itself" double-meaning). | **Two NEW candidate lines proposed for Phase 0 Unit 0.3 testing:** (i) *"He's a machine, this kid. Honestly at this point I'm just impressed."* (ii) *"Briggsy didn't write this one either. He's getting good at not writing them."* (echoes UMB v3 cold-open hook). |
| C5 | Brainstorm R4-acceptance-gate framing reads as "produce a Sterling-mistakable voice" | The design intent was always Sterling-CODED, not Sterling-cloned — mirroring BURNED's "Archer w/o being Archer" visual rule. Legal floor (ElevenLabs ToS + Tennessee ELVIS Act + EU AI Act + NO FAKES Act, right-of-publicity surviving satire framing) aligns with the design choice. | **R4 reframed as cadence-match gate.** New Step 0 in Unit 0.2 characterizes Benjamin's distinctive cadence as teachable specs; engines steer to those specs on any voice. MUSHRA tests register recognition, not actor recognition. See §5.1 + Phase 0 Unit 0.2. |
| C6 | Brainstorm Dependencies §Distribution surface deferred the Twitter mobile-crop pressure test | X serves 1.91:1 in-feed preview crop on mobile. **Resolution: critical text inside central 1:1 safe square within 16:9 frame.** | **Composition discipline rule added; no separate vertical track required.** |

---

## §7 — Requirements Trace (R1–R15 → Phases)

| R# | Requirement | Owning phase(s) |
|----|-------------|-----------------|
| R1 | Spine: in-world Pendleton Agency briefing | Phase 1 (beat sheet) + Phase 4 (scene composition) |
| R2 | Tone: deadpan, played straight | Phase 0 Unit 0.4 (tone gate) + Phase 1 (locks the thesis) |
| R3 | Climax: stacked visual cascade + audio reveal + gameplay dissolve | Phase 0 Unit 0.5 (spike) + Phase 4 (build) |
| R4 | Dash sustained narration ~90% runtime | Phase 0 Unit 0.2 (gate) + Phase 2 (production) |
| R5 | Vera scream cameo, authentic or cut | Phase 0 Unit 0.6 (gate) + Phase 2 (production if cleared) |
| R6 | Pendleton vocabulary discipline end-to-end | Phase 1 (script gate) + Phase 2 (translation key applied) |
| R7 | 90–100s runtime, 5–7 scenes | Phase 1 (scene count lock) |
| R8 | 16:9 landscape only | All phases (architectural invariant) |
| R9 | Music bed: Archer-coded mid-century brass / bossa | Phase 3 (sourcing) + Phase 4 (mix) |
| R10 | HTP dossier hero in cascade | Phase 0 Unit 0.5 (capture spike) + Phase 3 (production capture) + Phase 4 (scene build) |
| R11 | Goofy stats with comedy-first companion pairing | Phase 3 (stat-list draft + cold-read gate) + Phase 4 (overlay build) |
| R12 | Imagen-generated card art curation | Phase 3 (selection from 17 existing artworks) + Phase 4 (scene composition) |
| R13 | Live gameplay footage closer | Phase 5 (capture harness + capture) + Phase 4 (closer integration) |
| R14 | Compressed-Archer-title-sequence cold-open + repeatability declaration | Phase 0 Unit 0.3 (decode gate) + Phase 4 (build) |
| R15 | On-screen text signal layer for agentic-SDLC origin | Phase 0 Unit 0.5 (spike validates rendering) + Phase 3 (chrome design) + Phase 4 (placement) |

---

## §8 — Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Legal exposure on Sterling-cadence TTS | High (default path is prohibited) | High (project blocker) | Path A clones Briggsy's owned voice; Path C hybrid uses voice actor; no cloning of Benjamin. See §5.1 + Phase 0 Unit 0.2 ladder. |
| TTS authenticity fails across all legal engines | Medium | High (forces restructure) | Path D — restructure to non-Dash briefer (Janet-M, Vera, Sable) using their established voice DNA. Path E — abandon. Documented in Phase 0 Unit 0.2 fail-action ladder. |
| Composite spike reveals font fall-back in MP4 export | Low (`@remotion/fonts` auto-blocks) | Medium | Spike validates end-to-end before beat-sheet locks. UMB's `useFonts` precedent. |
| Composite spike reveals Remotion 4.0.438 incompatibility with one of (transitions / media / lottie) | Low | Medium | Pin to latest 4.0.x compatible release; fallback is UMB's `Series` + `Html5Audio` pattern (audio crossfade becomes manual frame-math). |
| Gameplay capture mechanism greenfield | High (no prior art) | Medium | Phase 5 budgeted as full standalone phase; precedent invention expected; spike at Phase 0 captures HTP only, gameplay deferred. |
| Deploy migration mid-flight affects capture URLs | Medium (in flight 2026-05-16) | Medium | Phase 0 spike uses local Vite dev URL (`http://localhost:5173/howtoplay.html`); production capture deferred to Phase 3 (HTP) + Phase 5 (gameplay) after migration completes. |
| Stats drift between trailer build and ship | Medium | Low | Adopt `feedback-stats-single-source.md` discipline — grep all surfaces (TODO.md, README, trailer scene files, narrator-prompts) on any count change. |
| MUSHRA tester recruitment delay | Low | Low | 6 minimum listeners; Briggsy's network + Discord (Harry et al.) likely sufficient; if not, fall back to Path C hybrid which doesn't need testers. |
| VOICE_DIRECTION anti-pattern reintroduced by future agent | Low (guard codified) | High (corrupts every WAV) | Inline comment at TTS API call site, mirroring UMB's `generate-narrator.ts:195-198`. Lint-grep optional follow-up. |
| Stat-overlay cold-read gate fails | Medium | Low | R11 fail-action: cascade becomes purely visual (card art + dossier + gameplay), comedy-stats cut. Documented in brainstorm Deferred-to-Planning. |

---

## §9 — Bar-Raise Criteria (vs UMB v3)

The trailer must clear UMB v3 on at least one of these three dimensions
on a fixed sampling protocol (per brainstorm Success Criteria):

1. **Named-operative density** — average count of named Pendleton
   operatives visible per sampled frame (silhouette, portrait, dossier
   photo, illustration panel). 10 frames sampled at fixed timecodes
   (every ~10s) from each trailer.
2. **§2 frame-pass rate** — across 10 sampled frames, how many
   independently pass §2 Quality Bar ("could be a frame from an Archer
   episode") on a fixed yes/no rubric (composition, palette discipline,
   typographic discipline). Threshold: ≥8 of 10.
3. **Stacked-payoff moment** — does the trailer have a single beat
   where visual + audio reveal land simultaneously (cascade + Dash VO
   reveal per R3)? UMB v3 doesn't have this. Binary yes/no.

**Parity-with-UMB is not the goal; relative advance on at least one of
these axes is.** Axis 4 from the brainstorm's prior version (absence
of LinkedIn-coded stats) was dropped — R11's cold-read-through gate
makes it table stakes, not a bar-raise dimension.

---

## §10 — Tiebreaker Rule

When (a) "engineers talk about how it was built" and (b) "water-beads /
product-joy takes over" conflict in the edit bay, **water-beads wins.**
The build is the subtext; the game is the text. The cascade earns its
place by feeling like Archer set-dressing, not a credits roll.

---

## §11 — Status & Next Steps

- ✅ **Brainstorm landed:** `docs/ideation/2026-05-15-origin-trailer-brainstorm.md` (2026-05-15, two-pass document review, 15 requirements, 5 Resolve-Before-Planning gates).
- ✅ **Roadmap written:** this file (2026-05-16).
- ✅ **Phase 0 plan written:** `phase-0-gate-resolution.md` (2026-05-16).
- ✅ **Phases 1–7 plans written:** all 7 drafted 2026-05-16 in one workflow per `feedback-phase-plan-drafting-workflow.md`.
- ⏸ **Deepening pass (all 8 phases, sequentially):** pending — next action.
- ⏸ **Briggsy review of deepened plans:** pending — after deepening completes.
- ⏸ **Phase 0 execution:** begins after Briggsy reviews deepened plans.

**Open carry-forward decisions** (resolve at Phase 0 → Phase 1 boundary,
not now):
- Phase 0 Unit 0.5 spike outcome — does Lottie-inside-Remotion land for
  Archer transition vocabulary, or do we need post-processing?
- Phase 0 Unit 0.2 outcome — which TTS engine + voice path clears the
  R4 bar (Path A/B/C/D)?
- Phase 1 scene count lock — 5, 6, or 7 scenes from the 5–7 range.

---

## §12 — Sources & References

**Origin documents:**
- Brainstorm: [`docs/ideation/2026-05-15-origin-trailer-brainstorm.md`](../../ideation/2026-05-15-origin-trailer-brainstorm.md)
- Product specification: [`docs/PRODUCT-SPECIFICATION.md`](../../PRODUCT-SPECIFICATION.md)

**UMB v3 trailer precedent:**
- Composition: `projects/undercover-mob-boss/videos/trailer/src/{Root.tsx,TrailerV3.tsx}`
- Scenes: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S{01..09}_*.tsx`
- Timing: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` (authoritative 148s)
- Narrator pipeline: `projects/undercover-mob-boss/scripts/generate-narrator.ts` (VOICE_DIRECTION guard at lines 195–198)
- Narrator prompts: `projects/undercover-mob-boss/scripts/narrator-prompts.ts` (TRAILER_V3_PROMPTS)
- HTP capture: `projects/undercover-mob-boss/scripts/capture-htp-scroll.ts`
- Goofy-stats exemplar: `projects/undercover-mob-boss/videos/trailer/src/scenes/V3S08_ThePunchline.tsx`

**BURNED assets the trailer consumes:**
- Card art: `public/assets/cards/` (17 unique webp — verified 2026-05-16)
- HTP app: `src/client/howtoplay/App.tsx` (10 acts: Cover → Mission → Roster → Loop → Arsenal → Combos → TurnInheritance → Intercept → Remote → Signoff)
- Dash voice DNA: `src/client/howtoplay/acts/ActRoster.tsx` (Dash dossier + flourish, the strongest Sterling-cadence material), `ActArsenal.tsx` (tactic lines with Phrasing! beats), `ActMission.tsx` (M's briefing cadence — proves briefer-voice register), `ActIntercept.tsx` (counting-fingers Phrasing line)
- BURNED Phrasing! wire-report pool: `src/client/shared/DramaOverlay.tsx:187` (6 sub-captions usable as R15 chrome)
- COMMS ticker idle lines: `src/client/board/DossierFeed.tsx:20-25` (`CHANNEL OPEN`, `STANDING BY`, `AWAITING TRANSMISSION`, `INTERCEPT CLEAR`)
- Verified stats source: `TODO.md` §1 (2026-05-16 squeaky) — 1407 tests pass / 6 expected fail / 68/68 files green / phone player 19.17 KB gz / DramaOverlay lazy 2.34 KB gz / HOW-TO-PLAY 99.04 KB JS + 65.83 KB CSS + 69.42 KB GSAP chunk / Protocol v6

**Remotion documentation:**
- TransitionSeries + fade: https://www.remotion.dev/docs/transitions/transitionseries
- Fonts API: https://www.remotion.dev/docs/fonts-api/load-font
- OffthreadVideo: https://www.remotion.dev/docs/offthreadvideo
- Quality (CRF, codecs): https://www.remotion.dev/docs/quality
- Lottie: https://www.remotion.dev/docs/lottie
- Remotion Agent Skills (Jan 2026): https://github.com/remotion-dev/skills

**TTS engine landscape (2026):**
- ElevenLabs v3 + Prohibited Use Policy (Sept 3 2025): elevenlabs.io, audioscripter.com
- Gemini 3.1 Flash TTS (launched April 15 2026): blog.google, google.dev
- OpenAI gpt-4o-mini-tts: openai.com
- Voice actor marketplaces: voices.com, voice123.com

**Legal references for voice cloning:**
- Tennessee ELVIS Act 2024
- Proposed federal NO FAKES Act (Senate, 2026)
- EU AI Act (Aug 2025 phased): rock.law, holonlaw.com
- ElevenLabs traceability: biometricupdate.com, regulations.gov (Sen. Hassan April 2026 inquiry)

**Audio evaluation protocols:**
- MUSHRA: ITU-R BS.1534-3
- WebMUSHRA (open-source): ed.ac.uk
- MOS comparison: audiolabs-erlangen.de
- Reference-matching bias: openreview.net 2025

**X / Twitter video specs (2026):**
- Specs: moda.app, sprinklr.com, postful.ai, X Help
- Engineering-trailer references: replit.com (Agent 3 + 4 launches), cursor.com (0.50 + 3 launches), anthropic.com (Code with Claude 2026 keynote clips)

**Institutional learnings (memory):**
- `feedback-narrator-voice-direction.md` — VOICE_DIRECTION anti-pattern
- `feedback-stats-single-source.md` — stat drift discipline
- `feedback-imagen-budget.md` — one-test-image-first protocol
- `feedback-imagen4-over-nbp.md` — Imagen 4 preferred for any new asset
- `feedback-wow-over-simplicity.md` — visual richness over "cut layers" advice
- `feedback-phase-plan-drafting-workflow.md` — write all phase files in one workflow; deepen sequentially after
- `feedback-wait-for-all-agents.md` — synthesis discipline
- `feedback-eye-in-loop-beats-calibration-for-motion.md` — motion validation rule (applies to Phase 4 scene timing review)

**Brainstorm-corrections sources (§6):**
- UMB v3 runtime: `projects/undercover-mob-boss/videos/trailer/src/lib/timing-v3.ts` (authoritative 4440 frames @ 30fps)
- TTS budget envelope: cross-engine pricing scan via vendr.com + engine pricing pages
- MUSHRA listener count: ITU-R BS.1534-3 + ed.ac.uk reference implementations
