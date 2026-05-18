# R14 Cold-Open Decode Gate — Unit 0.3

> **Phase 0 Unit 0.3 record.** Determines whether the 5-second cold-open
> spike (audio + R15 chrome stamp + operative-card-flash composite)
> telegraphs the agentic-SDLC origin — "AI / agent / autonomous / built
> itself" — to a no-context viewer, OR whether the cold open requires a
> rewrite / visual-density escalation / non-voice fallback.
>
> **Execution shape:** single-reader audition (Briggsy). Pivoted from
> the plan's n=4 minimum non-primed protocol 2026-05-18 —
> precedent-aligned with Unit 0.2 + Unit 0.4 + Unit 0.6 single-reader
> fallbacks. **The single-reader collapse is more consequential for
> Unit 0.3 than for the prior units** because Briggsy is the author of
> the candidate lines + the engineering audience the wordplay is aimed
> at — he is, in a literal sense, the worst-possible decode tester.
> Caveat is RECORDED, not silently demoted (see Validity caveat below).
>
> Plan source-of-truth:
> `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.3
> (lines 1650-1937).

## Status

**✅ CLOSED 2026-05-18 — Candidate #4 line + Sloane voice (Shared
Library, matriarch-tuned) locked.**

Line audition cleared #4 over #5 (#5 carried robotic-tail defect on
kicker). Janet voice iteration then ran a 4-variant audit (Sarah →
Matilda-tuned → Sloane-tuned → Kristen-tuned) after Sarah was flagged
as "too reassuring" for Janet's tough-matriarch character — Sloane
(Shared Library, `m8AHWg36LJTQWKmfeGVv`) with matriarch-tuned
voice_settings won the A/B over Kristen and now ships as Janet's voice.
Canonical `candidate-4.mp3` is the exact audited Sloane bytes
(sha256 `4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d`);
re-rendered `cold-open-candidate-4.mp4` consumes that audio.

---

## Validity caveat — recorded, not silently demoted

A single reader who authored the candidate lines AND is the literal
engineering audience the wordplay targets cannot run the formal
decode test (unprompted "what is this trailer about?" articulation).
The decode is something the paragraph's author already knows the
answer to — confirmation bias is structurally unavoidable. Under
single-reader Unit 0.3 collapses to a **composite-quality sanity
check**: does the SpikeColdOpen MP4 (audio + R15 stamp + portrait
cuts + BURNED landing card) READ LIKE a working cold-open hook to
the author, AND does the bracket-tag bracketed line cadence land
the way the cadence-spec calls for?

The full decode gate (n=4 minimum non-primed engineering-peer
testers reaching Tier 1 ≥50% of the time per plan §Step 3) **defers
to Phase 6's full-trailer cold-decode panel** (cross-phase ADR #21).
Phase 6 listener pool is fresh, zero-overlap with Phase 0, blind
cold-listen — the rigor the plan called for, executed downstream.

**Risk this carries:** a cold-open line + composite can pass Phase
0 single-reader fallback then fail Phase 6 N=6, which would
trigger a structural reopen mid-production (rewrite line, regenerate
audio, re-render cold-open MP4, push fix back to Phase 1
beat-sheet-lock). The Phase 1 beat-sheet inherits Unit 0.3's locked
line as **provisional** until Phase 6 re-validates.

This is the same risk shape as Units 0.2 / 0.4 / 0.6; Phase 6's
N=6 panel is the absolute backstop across all four single-reader
fallbacks.

---

## 1. Stimuli

### `cold-open-candidate-4.mp4` — Section B Candidate #4

- **File:** `clips/cold-open-candidate-4.mp4`
- **Bytes:** 670,805
- **Video:** h264 / 1920×1080 / 8.000s @ 30fps (240 frames)
- **Audio:** aac / 5.97s active (mounted from frame 30 / 1.00s)
- **Line:** *"He's a machine, this kid. Honestly at this point I'm just impressed."*
- **TTS payload (90 chars):** `[deadpan] He's a machine, this kid. [sarcastic] Honestly at this point I'm just impressed.`
- **TTS sha256:** `c3c070cb3d64a5074dbf0af3749445578dfa3047c99fa9c965be96881a64ecae`

### `cold-open-candidate-5.mp4` — Section B Candidate #5

- **File:** `clips/cold-open-candidate-5.mp4`
- **Bytes:** 638,899
- **Video:** h264 / 1920×1080 / 8.000s @ 30fps (240 frames)
- **Audio:** aac / 5.18s active (mounted from frame 30 / 1.00s)
- **Line:** *"Briggsy didn't write this one either. He's getting good at not writing them."*
- **TTS payload (98 chars):** `[deadpan] Briggsy didn't write this one either. [sarcastic] He's getting good at not writing them.`
- **TTS sha256:** `c87338efe1eb25b17f4c62e1a3351fbbfe26b313dc7ab5cabb37f09ac38993f5`

### Shared composition shape

Both stimuli use the same SpikeColdOpen visual timeline (Janet flash
→ Dash flash → BURNED landing card + R15 chrome stamp slap at frame
75). See `candidates.md` §SpikeColdOpen composition shape for the
frame-by-frame budget. Audio only differs.

**Voice:** Sarah - Mature, Reassuring, Confident (`EXAVITQu4vr4xnSDxMaL`)
attributed to Janet (Malory-coded executive dryness). Voice settings
inherit Unit 0.2 Roger lock. See `candidates.md` §Speaker pool for
selection rationale.

**Music:** ABSENT for the spike (deliberate scope decision). Phase 3
sources brass-jazz hook for production trailer; spike validates VO +
visual decode signal in isolation.

---

## 2. Audition + Decision

Briggsy plays `cold-open-candidate-4.mp4` once cold, then plays
`cold-open-candidate-5.mp4` once cold (or A/Bs them in either order),
then picks ONE of:

| # | Outcome | Trigger |
|---|---|---|
| 1 | **Ship Candidate #4** ("He's a machine") | Both clips clear render-quality + composite-readability bar; #4's machine-wordplay double-meaning lands more directly than #5's UMB callback for a cold viewer. Phase 1 beat-sheet inherits #4 as the locked cold-open line. |
| 2 | **Ship Candidate #5** ("Briggsy didn't write this one either") | Both clips clear bar; #5's UMB v3 callback lands stronger as a series-implication hook, with "either" carrying the repeatability load. Phase 1 inherits #5 as the locked cold-open line. |
| 3 | **Iterate** — re-render with tweaked bracket-tag treatment, alternate voice settings, or speaker attribution swap | One or both clips have a fixable mechanical issue (cadence off, `[sarcastic]` over/under-performs, voice character mismatched to line). Edit `buildPayload()` in `generate-cold-open-clip.ts` OR swap `COLD_OPEN_SPEAKER` voice ID in `cold-open-prototype.ts`; re-run `pnpm cold-open:clip` + `pnpm render:cold-open-{4,5}`; re-audition. |
| 4 | **Failure mode 1 — line decodes but not as autonomous** (per plan §Step 3) | Both clips read as "Archer parody" or "spy comedy" without telegraphing autonomy/agent/machine. Rewrite both lines with more explicit phrasing (candidates from plan: *"He wrote himself a sequel,"* *"The machine learned to ship."*) and re-render. |
| 5 | **Failure mode 2 — visual decodes but audio doesn't** (per plan §Step 3) | R15 chrome stamp lands but spoken line doesn't sell autonomy hook. Add visual signal density — a second chrome stamp ("CLAUDE / SONNET 4.6 / AGENTIC SDLC") landing during the line — and re-render. |
| 6 | **Failure mode 3 — non-voice fallback** (per plan §Step 3) | Neither audio nor visual decodes after two rewrites. R14 falls back to non-voice cold-open: title-card structure remains (operative flashes + BURNED logo + R15 stamp), spoken line dropped. Run a conditional R15-only silent-cold-open spike before locking the non-voice fallback. |

**Iterate procedure (outcome 3):** edit the relevant constant /
renderer / speaker file, re-run `pnpm cold-open:clip --candidate {4|5}`
(writes both audit-trail and render-input MP3), then `pnpm
render:cold-open-{4|5}` (writes MP4 to `out/`; manual copy to
`sample-eval/r14-cold-open/clips/` for audit). Preserve previous
renders under `cold-open-candidate-N.v{V}.mp4` filenames before
iterating if A/B comparison is wanted.

**Failure-mode-1 procedure (outcome 4):** capture verbatim reaction in
§3 below, edit `CANDIDATE_4` and/or `CANDIDATE_5` in
`cold-open-prototype.ts` (contract test will fail until plan-locked
text updates), re-render both, re-audition. If second pass also fails,
escalate to plan §Step 3 failure-mode-3 (non-voice fallback) OR
brainstorm-level reopen of R14 framing.

**Non-voice fallback procedure (outcome 6):** create a third candidate
composition `SpikeColdOpenSilent` rendering only the visual timeline
(no `<Audio>` mount). Re-audition the silent variant under the same
Tier 1 / Tier 2 acceptance frame. If silent variant decodes,
non-voice cold-open is the disposition; if it doesn't, escalate to
Briggsy as brainstorm-level question (R14 framing isn't viable in
current shape).

---

## 3. Briggsy's Audition — 2026-05-18

### Joint audition (both clips A/B'd in sequence on desktop)

- **Played:** `cold-open-candidate-4.mp4` + `cold-open-candidate-5.mp4`
- **Verbatim reaction:** *"ok listened to opener 4 & 5. both are good.
  But 5, at the end, 'writing them' it seemed to have a bit of a
  robotic feel to it."*

### Candidate #4 audition

- **Stimulus surface noticed:** COMPOSITE (no specific defect or
  surface call-out; "good" signal applies to the audio + visual + R15
  stamp as a whole)
- **Decode signal:** Render-quality pass under single-reader fallback.
  Formal Tier 1 / Tier 2 articulation rubric does NOT apply (Briggsy
  is the author of the lines + the engineering audience the
  machine-wordplay targets — author-tester confirmation bias is
  structurally unavoidable, per Validity caveat above). The audition
  cleared the COMPOSITE-quality sanity check the single-reader gate
  collapses to.

### Candidate #5 audition

- **Stimulus surface noticed:** AUDIO — specifically the trailing
  phrase "writing them" at the end of the kicker.
- **Defect call:** Robotic feel on the trailing "writing them"
  phrase. The defect lands on the kicker (the punchline moment) — the
  most important second of the line. Likely engine-level: ElevenLabs
  v3's `[sarcastic]` tag is reinforcing the wrong shape on the
  trailing-syllable cluster, OR the trailing-word-pair lacks enough
  voice_settings expressive range to hold against the deadpan-leading
  cadence.
- **Decode signal:** "Good" — but with a render-quality defect on the
  highest-value second of the clip. Phase 4 carry-forward path if #5
  content is revisited: try `[exhale]` instead of `[sarcastic]` at the
  inline anchor, OR lower `stability` (0.70 → 0.55) + bump `style`
  (0.15 → 0.25) on a re-render, OR shorten the kicker
  ("He's getting good at not writing them" → "He's getting good at it").

### Disposition (line audition)

- **Outcome (per §2 table):** **#1 — Ship Candidate #4** (line content)
- **Locked candidate:** #4 (`"He's a machine, this kid. Honestly at this point I'm just impressed."`)
- **Notes:** #4 cleared without any defect call; #5 carries a
  flagged-but-unfixed render-quality issue at the kicker. The CLEAN
  candidate ships. #5 stays preserved on disk + in candidates.md
  Section B documentation for future Phase 4 reference if the UMB v3
  callback content is ever wanted in a different scene.

---

## 3a. Janet Voice Iteration — 2026-05-18

After line disposition cleared #4, Briggsy flagged a CHARACTER-VOICE
issue separable from line content: the original Sarah voice render
came across as too "reassuring" for Janet's character note.

> *"Janet is a bit more mature, not old. But not young either. Tough
> as nails, doesn't take shit from anyone, especially Dash. She loves
> him, just doesn't take shit from him. I think her voice needs to be
> toughened up — in a matriarch kinda way."*

This is exactly the Malory archetype Janet was attributed to (executive
dryness with scotch-and-cigarettes edge), but Sarah's "Mature,
Reassuring, Confident" baseline read warm-mature rather than
tough-mature. Sarah's timbre fights Malory's signature.

### Iteration shape

Plan: pick a voice whose BASELINE TIMBRE carries the matriarch edge,
keep matriarch-tuned voice_settings (high stability + ultra-low style
+ slow speed) across all variants for A/B parity. The variable being
tested is VOICE TIMBRE, not voice_settings.

### Variant 1 — Sarah baseline (original)

- **Voice:** Sarah (`EXAVITQu4vr4xnSDxMaL`), Roger defaults (stability
  0.70 / style 0.15 / speed 0.95)
- **Audition signal:** Too reassuring (Briggsy flag above)
- **Disposition:** Replace voice, escalate to library re-pick

### Variant 2 — Matilda-tuned

- **Voice:** Matilda (`XrExE9yKIg1WjnnlVkGX`), matriarch-tuned (stability
  0.85 / style 0.05 / speed 0.92)
- **Rationale:** Best local-library female candidate per scout —
  "Knowledgable, Professional, alto pitch." Alto register is direction-
  right for matriarch.
- **Audition signal:** *"Matilda could work. But let's try some from
  our scout."*
- **Disposition:** Direction-right but not winner; escalate to Shared
  Library scout for stronger candidate.

### Variant 3 — Sloane-tuned (Shared Library escalation)

- **Voice:** Sloane (`m8AHWg36LJTQWKmfeGVv`, ElevenLabs Shared
  Library), matriarch-tuned (same as v2)
- **Rationale:** Shared Library scout top result — *"A confident,
  mature American female voice. She carries a commanding yet
  approachable tone with a sleek, professional delivery that exudes
  authority without feeling distant"* — literal Malory-archetype
  description.
- **Audition signal:** *"ooooohhhhh I likey. Let's do one more, but
  yeah that's good."*
- **Disposition:** Winning timbre; one more A/B for diagnostic
  confidence.

### Variant 4 — Kristen-tuned (Shared Library, true-crime baseline)

- **Voice:** Kristen (`OIadkU6YLviNhuekXGly`, ElevenLabs Shared
  Library), matriarch-tuned (same as v2/v3)
- **Rationale:** Shared Library scout #5 candidate — TED-style
  professional + true-crime/documentary baseline. Different shape of
  authority than Sloane (weighty-weary vs polished-commanding).
- **Audition signal:** *"Kirsten is good, really good. But Sloane is
  our gal."*
- **Disposition:** Strong contender but Sloane wins the A/B.

### Janet voice lock

- **Voice:** **Sloane - Bold and Polished** (`m8AHWg36LJTQWKmfeGVv`,
  ElevenLabs Shared Library, model `eleven_v3`)
- **Voice settings (matriarch-tuned override, NOT Unit 0.2 Roger
  defaults):** `{stability: 0.85, similarity_boost: 0.75, style: 0.05,
  use_speaker_boost: true, speed: 0.92}`
- **Locked into `cold-open-prototype.ts COLD_OPEN_SPEAKER`** as the
  canonical Janet voice for any future cold-open render. Contract test
  in `cold-open-prototype.test.ts` asserts both voice ID and
  voice_settings profile to prevent silent drift.
- **Canonical audio = exact audited bytes:** the production
  `candidate-4.mp3` is a byte-for-byte COPY of the audited
  `candidate-4-janet-sloane-tuned.mp3` (not a re-render — ElevenLabs is
  non-deterministic so re-rendering would produce different audio than
  Briggsy approved). sha256 verified:
  `4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d`.
- **Char-budget impact (iteration total):** +360 chars across 4 renders
  (cumulative 4,202 / 100,000 = 4.20%; 50% + 80% tripwires clear).
- **Iteration audit-trail MP3s preserved on disk** (gitignored under
  sample-eval/**/*.mp3 rule):
  - `candidate-4-janet-matilda-tuned.mp3`
  - `candidate-4-janet-sloane-tuned.mp3` (= canonical `candidate-4.mp3`)
  - `candidate-4-janet-kristen-tuned.mp3`

---

## 4. Disposition

```
Date:                  2026-05-18
Outcome:               ship #4 (line) + Sloane-tuned (Janet voice)
Locked line:           "He's a machine, this kid. Honestly at this point I'm just impressed."
Locked speaker:        Janet (Sloane voice — m8AHWg36LJTQWKmfeGVv, ElevenLabs Shared Library)
Voice settings:        matriarch-tuned override (stability 0.85, similarity 0.75, style 0.05, speaker_boost true, speed 0.92)
Composition:           SpikeColdOpen (8s @ 30fps, 240 frames)
Briggsy summary:       Two iteration phases. Line audition picked #4 over
                       #5 (#5 carried robotic-tail defect on kicker).
                       Voice audition then ran 4 variants (Sarah →
                       Matilda → Sloane → Kristen, all matriarch-tuned)
                       after Sarah flagged as too "reassuring" for
                       Janet's tough-matriarch character. Sloane
                       (Shared Library — "commanding yet approachable
                       tone with a sleek, professional delivery that
                       exudes authority without feeling distant") won
                       the A/B over Kristen ("good, really good. But
                       Sloane is our gal"). Canonical candidate-4.mp3
                       is exact audited Sloane bytes (sha256
                       4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d);
                       re-rendered cold-open-candidate-4.mp4 consumes
                       that audio. Phase 1 beat-sheet inherits #4 +
                       Janet + Sloane voice + matriarch-tuned settings.

Carry-forwards to Phase 1 beat-sheet-lock:
- Cold-open line: "He's a machine, this kid. Honestly at this point
  I'm just impressed." (Candidate #4 locked)
- Cold-open speaker: Janet (provisional speaker-attribution lock —
  Phase 6 N=6 panel may surface speaker change if a different operative
  reads the line stronger; voice swap would be cheap since Sloane is
  Shared Library available)
- Cold-open voice: Sloane (m8AHWg36LJTQWKmfeGVv, ElevenLabs Shared
  Library) + matriarch-tuned voice_settings
- R15 chrome stamp content: "OPERATION PENDLETON / CASE FILE 02 /
  METHOD: AUTONOMOUS" — locked at Unit 0.3 cold-open instance
  (visual spec inherited by Phase 1's other R15 stamps)
- Composition shape: two fast cuts → one held landing card +
  stamp-slap-at-frame-75 — Archer-grammar inheritance for Phase 1
  scene-by-scene blocking

Carry-forwards to Phase 4 trailer assembly:
- Cold-open scene built from this exact spike composition (Phase 4
  consumes SpikeColdOpen as the cold-open scene structure; only
  upgrade is Phase 2 brass-jazz hook + Phase 3 production R15 SVG)
- Speaker voice: ElevenLabs Sloane (Shared Library) with matriarch-
  tuned voice_settings — locked in COLD_OPEN_SPEAKER constant;
  contract test asserts both voice ID + voice_settings shape
- Bracket-tag treatment: [deadpan] leading + [sarcastic] before
  kicker phrase — replicate the contract-test shape in
  cold-open-prototype.test.ts for any new Phase 4 cold-open
  paragraph variant
- Phase 4 may want to commission additional Sloane renders for OTHER
  Janet dialogue beyond the cold-open; voice ID + settings already
  locked, no re-pick required

Carry-forwards to Phase 6 N=6 cold-decode panel (ADR #21 —
single-reader fallback elected for Phase 0):
- Stimulus: `cold-open-candidate-4.mp4` OR re-rendered Phase 4 cold-
  open scene (Phase 6 elects)
- Decode rubric: Tier 1 (unprompted "agent/autonomous/built itself")
  / Tier 2 (AI + authorship verb) / Insufficient / Ceiling per plan
  §Step 3 keyword-precision rule (ADR #21 build-process vs
  render-tech distinction)
- Acceptance threshold: ≥50% of non-primed testers reach Tier 1 (n=4
  minimum → ≥2 Tier 1; n=6 target → ≥3 Tier 1)
- If Phase 6 N=6 panel fails: structural reopen of R14 — line
  rewrite OR non-voice fallback OR brainstorm-level cold-open
  redesign

Outstanding follow-up (NOT blocking Phase 0 exit):
- Music placeholder. Spike rendered without music to keep the decode
  test pure. Phase 3 sources brass-jazz hook for production trailer;
  cold-open scene gets re-rendered with music at that point.
- Logo treatment. SpikeColdOpen uses a typeset BURNED placeholder
  (Clash Display 700, wide tracking, cream on teal with thin
  keyline). Phase 3 produces the final mark; cold-open scene gets
  re-rendered with the production logo at that point.
- R15 chrome stamp SVG. Spike uses styled <div> markup. Phase 3
  produces R15 stamp SVGs (per ADR-pattern from spike
  spike-results.md §Per-point verdicts (e₁)); cold-open scene gets
  re-rendered with production stamp SVGs at that point.
- Candidate #5 robotic-tail defect. Briggsy flagged "robotic feel" on
  trailing "writing them" phrase. If Phase 4 ever wants to recover #5
  content for a different scene: try [exhale] tag instead of
  [sarcastic] at the inline anchor, OR lower stability (0.70 → 0.55)
  + bump style (0.15 → 0.25), OR shorten kicker. Cheap iteration
  (~98 char re-render).
```

---

## 5. Downstream Propagation

Filled at disposition time. Each item is a write that must land
**before** Unit 0.3 is considered closed.

- [x] `PHASE-0-EXIT.md` §Section 2 (R14 Cold-Open Line Disposition) —
      filled with disposition: cleared / line / speaker / voice ID at
      Phase 0 close.
- [x] **Phase 1 beat-sheet-lock hand-off** — cold-open line (#4) +
      speaker (Janet) + composition shape inherited by Phase 1 scene
      blocking. Provisional pending Phase 6 N=6 re-validation per
      ADR #21.
- [x] **Phase 4 trailer assembly hand-off** — SpikeColdOpen
      composition + bracket-tag treatment + speaker voice ID
      replicated in production cold-open scene. #5 defect notes
      preserved for any future Phase 4 #5-content recovery.
- [x] **Phase 6 N=6 cold-decode panel cross-ref** — stimulus + decode
      rubric + acceptance threshold + fail-action documented in §4.
- [x] `briggsy-review-0.3.signoff` sentinel written per ADR #22.

---

## 6. Authoritative pointers

- Plan source-of-truth:
  `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.3
- Line constants:
  `videos/trailer/scripts/cold-open-prototype.ts`
- Contract test:
  `videos/trailer/scripts/cold-open-prototype.test.ts`
- Renderer:
  `videos/trailer/scripts/generate-cold-open-clip.ts`
- Composition wrapper:
  `videos/trailer/src/SpikeColdOpenComposition.tsx`
- Scene:
  `videos/trailer/src/scenes/SpikeColdOpen.tsx`
- Components:
  `videos/trailer/src/components/{OperativePortraitFlash,CutBrightnessPop,
  BurnedLogoPlate,R15ChromeStamp}.tsx`
- Engine adapter (voice settings rationale inherited):
  `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- Char-budget tracker:
  `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Cross-phase ADR #21 (Phase 6 N=6 decode panel):
  `docs/plans/origin-trailer/roadmap.md` ADR ledger

---

## Appendix — what was dropped from the original n=4 plan

Recorded for audit / future-Briggsy / Phase 6 panel coordinator:

1. **n=4 minimum non-primed engineering-peer panel + UMB-v3
   pre-screen battery.** Plan §Step 3 prescribed 4 testers minimum
   (6 target), with a two-question UMB v3 pre-screen branching to
   disqualify primed testers or run a shortened informative-only
   protocol. Single-reader fallback elected by Briggsy 2026-05-18 in
   continuity with the same shape closing Units 0.2 / 0.4 / 0.6.
2. **Two-tier decode acceptance with ≥50% Tier 1 threshold +
   three-band parity (Floor / Target / Ceiling).** With N=1 author
   self-listener, threshold math is moot.
3. **Pool-independence audit + tester-roster tracking across Phase 0
   units.** Moot at N=1.
4. **Failure-mode-1/2 two-pass retest with NEW testers preserving the
   pre-screen battery.** Iterate procedure (outcome 3 above) preserves
   the *mechanism* of iterate-and-retest at single-reader scale;
   formal N=4 retest defers to Phase 6.

The **load-bearing decode-validation is preserved** by deferring to
Phase 6's existing N=6 cold-decode panel (cross-phase ADR #21).
Phase 6 listener pool is fresh, zero-overlap with Phase 0, blind
cold-listen — the rigor the plan called for, executed downstream.
