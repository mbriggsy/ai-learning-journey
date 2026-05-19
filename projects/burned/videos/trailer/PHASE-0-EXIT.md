# Phase 0 Exit Record

> **Phase 0 close consolidator.** Five gate dispositions (voice-cast,
> cold-open line, tone, composite-viability, R5 scream) recorded here
> for Phase 1's beat-sheet-lock to consume without back-reading the
> five per-unit eval files.
>
> "Documented disposition" is one of three states per plan §exit
> protocol:
> - **cleared** — original gate intent landed, acceptance threshold cleared
> - **restructured** — fail-action redirected to documented alternative
> - **cut** — gate intent abandoned, downstream re-scopes around absence
>
> Plan template: `docs/plans/origin-trailer/phase-0-gate-resolution.md`
> §PHASE-0-EXIT.md template (lines 2899-3056).
>
> Sign-off sentinel: `sample-eval/PHASE-0-EXIT.signoff` (per ADR #22 —
> Briggsy git-author-checked).

## Section 1 — Voice Cast Disposition (Unit 0.2) [PHASE 1 BLOCKER]

- **Disposition:** **cleared**
- **Voice lock provisional?:** Y — Phase 6 N=6 cold-decode panel
  re-validates per cross-phase ADR #21. Single-reader Step 5 fallback
  cleared engine selection; downstream listener decode is the
  load-bearing acceptance.
- **Cleared path:** Path A (Voice Library preset)
- **Engine:** ElevenLabs v3 (Voice Library preset; Sterling-CODED voice
  via curated catalog rather than Voice Design mint)
- **Engine model version pin:** `eleven_v3`
- **Voice ID / actor identifier:** `CwhRBWXzGAHq8TQ4Fs17` ("Roger -
  Laid-Back, Casual, Resonant")
- **Engine-adapter file path:** `sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- **MUSHRA listener count:** 1 / 6 minimum — single-reader fallback
  elected by Briggsy 2026-05-18 in continuity with Step 0.5 + Unit 0.6
  + Unit 0.4 fallback pattern. Confidence impact: Phase 6 N=6 panel is
  the absolute backstop.
- **Joint-pass verification:** N/A under single-reader fallback (joint
  pass is multi-listener concept). Reader A free-form signal carried
  forward: *"OpenAI — too robotic. ElevenLabs prolly the best although
  Gemini was very good as well."* — Path A in Target Band with hedge
  noted for Phase 4 refinement.
- **Ceiling-band history:**
  - Ceiling-band triggered during eval?: N — Reader A signal landed in
    Target Band on first pass; no over-telegraph reaction.
  - Re-spec iterations run: 0
  - Final disposition cleared after re-spec: N/A (cleared on initial)
  - Per-iteration cadence-spec.md diff summary: N/A
- **Cadence-spec.md path + Step 0.5 audio pre-flight sign-off:**
  - Path: `sample-eval/r4-dash/cadence-spec.md` (refined §3.6 four-axis
    Sterling-LANA shape added 2026-05-18 per Unit 0.6 closure)
  - Pre-flight reviewers: Briggsy (Reader A; Reader B single-reader
    fallback elected per plan §Step 0.5 step 6)
  - Pre-flight WAV: `sample-eval/r4-dash/preflight/gemini-spec-test.wav`
  - Reader A vibe-check: *"Patrick Warburton"* → Target Band cluster
    (Warburton-adjacent flag carried forward to Phase 4 as Voice
    Library re-pick signal)

**Phase 4 carry-forwards (sub-notes from Unit 0.2 disposition):**
voice_settings tuning headroom (`style=0.05` / `stability=0.80` /
`speed=0.92` alternates), alternate Voice Library voices not auditioned
(Daniel + Sarah + Laura + Callum + Harry — all score 6 in adapter
filter), Warburton-adjacent register avoidance, bracket-tag policy
refinement (per-tag improves-vs-degrades A/B), Path B (voice clone)
opt-in opportunity. Full sub-notes:
`sample-eval/r4-dash/unit-0.2-disposition.md` §Phase 4 carry-forward.

---

## Section 2 — R14 Cold-Open Line Disposition (Unit 0.3) [PHASE 1 BLOCKER]

- **Disposition:** **cleared**
- **Line (verbatim):** *"He's a machine, this kid. Honestly at this
  point I'm just impressed."* (Section B Candidate #4)
- **Speaker character:** Janet (Malory-coded executive dryness — tough-
  matriarch register, not warm-mature)
- **Speaker voice ID:** `2qQJWjw5XdG80GreshqG` ("Eleanor – Gracious
  and Authoritative", ElevenLabs **Shared Library**, model `eleven_v3`).
  Re-locked 2026-05-19 after Phase 2 Unit 2.3 cunty-pass canary
  (Briggsy + MichaelAnne — huge Archer fan). Iteration history:
  v1 Sarah → too reassuring; v2 Sloane (`m8AHWg36LJTQWKmfeGVv`) →
  cleared on initial audition but Phase 2 canary surfaced it as "too
  polished / not enough of a cunt" + missing the smoker-drinker
  Jessica-Walter-Mallory-Archer DNA Briggsy was actually after; v3
  Eleanor → British "refined, seasoned voice of an older British
  female, articulate delivery with warm yet commanding presence,
  suggesting a wealth of experience and high status." Eleanor was
  the only candidate of three age=old options (Empress / Mora /
  Eleanor) that landed the Q-from-Bond + experienced-not-frail
  brief. British accent works because the Q-cadence reference IS
  British — Mallory's character DNA transfers across the accent
  shift.
- **Voice settings (matriarch-tuned override, NOT Unit 0.2 Roger
  defaults):** `stability: 0.85, similarity_boost: 0.75, style: 0.05,
  use_speaker_boost: true, speed: 0.92` — high stability kills F0
  wander for flat declarative read, ultra-low style strips
  engine-default upbeat-expressive baseline, slow speed pushes
  deliberate-weighty matriarch register. Locked in
  `cold-open-prototype.ts COLD_OPEN_SPEAKER.voiceSettings`; contract
  test asserts profile shape to prevent silent tuning drift.
- **Tester count:** 1 non-primed / 4 minimum — single-reader fallback
  elected (precedent-aligned with Unit 0.2 + Unit 0.4 + Unit 0.6).
  Author-tester validity caveat recorded in `sample-eval/r14-cold-open/
  decode-eval.md` §Validity caveat: full decode gate defers to Phase 6
  N=6 panel per ADR #21.
- **Decode tier achieved:** N/A under single-reader fallback. Reader-A
  line audition: *"both are good. But 5, at the end, 'writing them' it
  seemed to have a bit of a robotic feel to it."* — #4 cleared without
  defect call. Subsequent voice audition: *"ooooohhhhh I likey"* on
  Sloane v3; *"Kirsten is good, really good. But Sloane is our gal"* on
  A/B confirmation.
- **Pre-screen battery — UMB-v3 contamination check:** N/A under
  single-reader fallback (Briggsy is the UMB v3 author — primed by
  construction; full pre-screen pool-management defers to Phase 6
  N=6 panel)
- **ADR #21 keyword-precision check:** N/A under single-reader fallback
  (the keyword-precision rule applies to non-primed listener decode
  citations; Reader A is the author, citation is render-quality not
  decode-tier signal)
- **If non-voice fallback:** N/A (audio cold-open cleared)
- **Canonical audio integrity:** production `candidate-4.mp3` is a
  byte-for-byte COPY of audited `candidate-4-janet-sloane-tuned.mp3`
  (sha256 `4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d`).
  NOT a re-render — ElevenLabs is non-deterministic so re-rendering
  would produce different audio than Briggsy approved. The exact
  audited bytes ship.

**Composition shape locked:** `SpikeColdOpen` — 8s composition / 240
frames @ 30fps. Two fast cuts (Janet portrait → Dash portrait, 1s each
with 2-frame brightness pop) → held BURNED landing card (180 frames)
with logo entry at frame 60 and R15 chrome stamp slap at frame 75. VO
drops at frame 30 on the cut to Dash. R15 stamp content: `OPERATION
PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS`. Phase 4 inherits the
composition structure as the production cold-open scene shape.

**Phase 4 carry-forwards** (from decode-eval.md §4 disposition):
- SpikeColdOpen composition + bracket-tag treatment (`[deadpan]`
  leading + `[sarcastic]` before "Honestly") replicate in production
  cold-open scene.
- Speaker voice: ElevenLabs Sloane (Shared Library, `m8AHWg36LJTQWKmfeGVv`)
  with matriarch-tuned voice_settings — locked in COLD_OPEN_SPEAKER
  constant; contract test asserts both voice ID + voice_settings shape.
  Phase 4 may want to commission additional Sloane renders for OTHER
  Janet dialogue beyond the cold-open; no re-pick required.
- **Janet voice DNA brief** (for any future Janet dialogue/scene Phase
  4 might author): mature but not old; tough as nails; doesn't take
  shit from anyone, especially Dash; loves him, just doesn't take shit
  from him. Malory-archetype scotch-and-cigarettes matriarch. Sloane
  + matriarch-tuned settings is the locked recipe.
- **Candidate #5 robotic-tail defect** preserved for Phase 4 recovery:
  if anyone wants the UMB v3 callback content (*"Briggsy didn't write
  this one either..."*) in a DIFFERENT scene, try `[exhale]` instead
  of `[sarcastic]` at the inline anchor, OR lower stability (0.70 →
  0.55) + bump style (0.15 → 0.25), OR shorten the kicker. Cheap
  iteration (~98 char re-render). Note: #5 was rendered on Sarah voice
  + Roger defaults; re-rendering with Sloane + matriarch-tuned would
  also be cheap and worth trying first since Sloane's commanding
  baseline + matriarch-tuned settings already cleared the kicker
  defect on #4.

---

## Section 3 — Tone Disposition (Unit 0.4)

- **Disposition:** **played-straight-cleared**
- **Played-straight thesis:** SURVIVES — Reader A audition cleared v2
  paragraph with earned-Phrasing! setup; the deadpan-briefer register
  over SDLC subject matter held through the render.
- **Tester count:** 1 / 4 minimum — single-reader fallback elected
  (precedent-aligned with Unit 0.2 + Unit 0.6). Author-tester validity
  caveat recorded in `sample-eval/tone/eval.md` §Validity caveat: full
  decode gate (n=6 mixed listeners articulating the joke unprompted)
  defers to Phase 6 N=6 panel per cross-phase ADR #21.
- **Two-reader coding agreement:** N/A under single-reader fallback.
- **Listener decode citations:** Reader A verbatim: *"it's good"*
  (Tier-bypass under single-reader fallback — the formal Tier 1 / Tier
  2 articulation rubric requires the listener to be UNPRIMED on the
  joke mechanic; Briggsy authored the paragraph, so the citation is a
  render-quality signal rather than a decode-tier signal).
- **If REOPENED:** N/A
- **If briefer changed via Option (ii) restructure:** N/A (Dash voice
  Roger inherited from Unit 0.2 Path A; tone gate held on the locked
  briefer voice)

**Phrasing! mechanic carry-forward (v1 → v2 correction):** The Phrasing!
catchphrase fires on a "that's what she said"-style trigger; preceding
line must read SIMULTANEOUSLY as benign briefing-context AND a sexual
double entendre. v1 shipped without an entendre setup (Briggsy caught
unearned `…Phrasing` on audition); v2 inserts `"Hard to put down"`
(literal: page-turner; entendre: "hard") to earn the beat. Rule now
asserted by contract test in `tone-prototype.test.ts`; spec §3.5 +
CLAUDE.md updated 2026-05-18.

**Phase 4 carry-forward:** bracket-tag treatment `[deadpan]` leading +
`[sarcastic]` before `…Phrasing.` — replicate via the contract-test
shape for any new Phrasing-bearing paragraph. Earned-Phrasing! rule is
canonical going forward (cold-listen "that's what she said" trigger
required).

---

## Section 4 — Composite-Viability Disposition (Unit 0.5)

- **(a) Bare `<Series>` + scene-internal overlay** (per ADR #4 revised):
  **PASS.** Two-sequence Series renders without frame-skipping; fade
  overlay reaches opacity 1.0 at the boundary frame.
- **(b) Audio crossfade via `@remotion/media` + `<Sequence>`:** **PASS.**
  Music bed at composition level with volume callback ducks correctly
  under VO offset via `<Sequence from>`. `<Audio>` has no `from` prop —
  pattern locked at `<Sequence>` offset.
- **(c) Custom font multi-weight** (Clash Display, 200/400/700 from
  variable woff2): **PASS.** Single `ClashDisplay-Variable.woff2` with
  `weight: '200 700'` range syntax renders all three weights distinct
  in MP4 export. Phase 3 ships the variable woff2 via
  `Promise.all([loadFont(...) × N])`. **No `pyftsubset` per-weight
  escalation needed. Phase 4 Unit 4.0 font spike DROPS from scope.**
- **(d) HTP scroll via Playwright capture:** **PASS.** `pnpm capture:htp`
  runs cleanly against the dev URL; scroll loop fires
  `useScrollReveal()` reveals; ≥ 95% of `[data-reveal]` elements past
  opacity 0.95 at capture time (2 of 2 mid-tween artifacts surfaced as
  Phase 3 dwell-tuning signal, not Phase 4 blocker).
- **(e) Archer-grammar transition vocabulary — render-validation per
  candidate:**
  - **Stamp-slap render:** **PASS.** STAMP_SLAP envelope renders at
    contract values (rotate −3° landed, scale 1.0 settled,
    `transform-origin: center`); emil EASE_OUT curve produces
    snap-then-settle feel. No artifacts.
  - **Iris wipe render:** **PASS.** Pure-Remotion inline SVG
    `<clipPath>` + `<circle r={interpolate}>` works without edge
    artifacts at 1080p. No `@remotion/lottie` install needed.
  - **Kinetic typography render:** **PASS.** Word-by-word reveal with
    stagger 4 + per-word duration 6 + emil EASE_OUT renders cleanly.
- **Phase 4 inherits the stamp-slap mechanical contract:** Y — see
  `sample-eval/spike/spike-results.md` §Per-point verdicts (e₁) +
  `videos/trailer/src/lib/animations.ts STAMP_SLAP` constant.
- **`@remotion/lottie` install required:** N — pure-Remotion iris-wipe
  cleared.
- **`@remotion/transitions` install required for Phase 4:** N — bare
  `<Series>` + scene-internal-overlay shape confirmed sufficient per
  ADR #4 revised.

**Phase 4 carry-forwards** (validated production patterns):
`SceneFadeToBlack` overlay primitive, composition-level `<Audio>` mount,
`<Sequence from={N}>` for VO offset, `@remotion/fonts.loadFont()`
variable-axis range, `staticFile('trailer/...')` namespace under
`setPublicDir('../../public')` (ADR #15), HTP capture script
(`capture-htp-scroll-burned.ts` — Phase 3 promotes via URL swap), all
three Archer-grammar transition primitives validated.

---

## Section 5 — R5 Scream Disposition (Unit 0.6)

- **Disposition:** **cleared (kept-A — TTS via ElevenLabs v3 Roger)**
- **If cut:** N/A (R5 cleared; Vera RETAINED in trailer cast + Unit
  0.3 candidate speaker pool)
- **Listener count:** 1 / 3 minimum — single-reader fallback elected
  (Briggsy declined to record owned-voice scream for Path B Voice
  Changer, source/judge reference anchor clip, or recruit external
  Archer-fan listeners 2026-05-18). Precedent-aligned with Unit 0.2 +
  Step 0.5 fallback shape.
- **Voice Changer source recording path:** N/A (Path B not exercised;
  Briggsy declined recording session)
- **Reference clip source + license:** N/A (3-listener panel control
  variable moot under single-reader fallback)
- **Path B IVC profile lifecycle:** N/A (Path B not exercised)

**Audition outcome:** v3 (`[shouts] VEEEEEEEERAAAA!!!`) cleared after
v1 (short burst, no drag) and v2 (wrong-vowel drag + accent shift).
Sterling-LANA four-axis acoustic shape now characterized in
`sample-eval/r4-dash/cadence-spec.md §3.6`: (1) flat pitch (no F0
falsetto rise), (2) 6-12 dB amplitude jump, (3) FIRST-vowel drag, (4)
accent anchored on first syllable. Adapter
(`cadence-spec-elevenlabs.json bracket_tags_per_paragraph.scream`)
updated; canonical text locked into `PARAGRAPH_3_SCREAM` in
`sample-script-dash.ts` (with `eCount > aCount` test constraint
encoded in `sample-script-dash.test.ts`).

**Phase 4 carry-forward:** `PARAGRAPH_3_SCREAM` constant is the
canonical scream text (any Phase 4 re-render reuses the exact shape);
voice_settings inherit Unit 0.2 Roger lock; re-render is cheap (~25
chars) via `pnpm scream:variant --text "VEEEEEEEERAAAA!!!" --label
"v3-locked"`.

**Vera retention implication for Section 2:** R5 cleared → Vera stays
in the trailer cast → Unit 0.3 candidate speaker pool retained Vera
as an option. Section 2 drafted attribution to Janet (Malory archetype
the more diagnostic fit for the cold-open lines); Vera/Sable remain
viable alternates if Briggsy elects different speaker at audition.

---

## Open carry-forwards to Phase 1

- **Cold-open line + speaker:** TBD pending Section 2 audition close.
  Phase 1 scene 1 (cold open) blocks on this disposition.
- **Music bed for cold-open scene:** sine-tone placeholder excluded
  from Unit 0.3 spike for decode-test purity; Phase 3 sources brass-
  jazz hook for production trailer (Phase 1 beat-sheet should note
  the music slot as Phase 3 dependency).
- **R15 chrome stamp content for instances #2-#4:** Phase 0 locks only
  #1 (cold-open: `OPERATION PENDLETON / CASE FILE 02 / METHOD:
  AUTONOMOUS`). Phase 1 beat-sheet authoring (Unit 1.9 per Phase 1
  plan) defines the remaining 3-4 stamp contents + landing frames.
- **R15 chrome stamp final SVGs:** Phase 0 spike uses styled `<div>`
  markup; Phase 3 produces production SVG assets per ADR #15.
- **Final BURNED title-card mark:** SpikeColdOpen uses a typeset
  placeholder (Clash Display 700 wide tracking + thin keyline). Phase
  3 produces the production logo treatment.
- **Operative-card-flash artwork:** Spike uses existing in-game card
  art (`janet-broadside.webp`, `dash-barlowe.webp`). Phase 3 may
  produce trailer-specific portrait variants if the in-game art fights
  the trailer composition (TBD at Phase 3 entry).
- **Phase 6 N=6 cold-decode panel** is the absolute backstop for
  Unit 0.2 + Unit 0.3 + Unit 0.4 + Unit 0.6 single-reader-fallback
  dispositions per cross-phase ADR #21. Any single-reader-fallback
  disposition is provisional until Phase 6 re-validates.

---

## Phase 0 budget reconciliation

- **Engine eval actual spend:** $22 ElevenLabs Creator (one-month
  subscription for `eleven_v3` access; OpenAI + Gemini consumed via
  pay-per-use under $1 cumulative). Within $50 envelope.
- **ElevenLabs Creator char count actual:** 4,202 / 100,000 (4.20%
  monthly cap consumed across Steps 0.5 + 1 + 2 + Unit 0.4 tone v1/v2
  + Unit 0.6 scream v1/v2/v3 + Unit 0.3 cold-open candidates 4 + 5 +
  Janet voice iteration v2/v3/v4 [Matilda + Sloane + Kristen variants]).
  Tripwire status: 50% clear / 80% clear.
- **Hosting actual spend:** $0 (Cloudflare Pages + Workers, per
  deploy-migration WIP — see TODO.md §Deploy migration).
- **Sub-phase 0a actual spend:** $0 (Path D not triggered — Path A
  cleared on first pass without restructure)
- **Total Phase 0 elapsed days:** ~3 days (2026-05-16 plan deepening
  complete → 2026-05-18 Unit 0.3 audition pending). The single-reader
  fallback shape across all four audition gates collapsed elapsed
  duration significantly vs the planned multi-listener panel cadence.

---

## Amendments (template-amendment log per P2.33)

Template fields are **add-only** after Phase 0 exit. If Phase 1+
deepening discovers a field this template missed, append the new
field here with date stamp + originating phase.

- (initial) — Template locked at Phase 0 deepening 2026-05-16
- 2026-05-17: P0.3 / P1.16 / P1.19 / P2.5 / P2.15 / P2.20 / P2.33 /
  P3.2 amendments absorbed during doc-review pass — see commit log.
- 2026-05-17 (Phase 2 doc-review pass): P2.34 — Section 2 gains
  "Speaker voice ID" field so Phase 2 can generate the cold-open WAV
  without a separate Phase 2-owned voice-id-overrides file.
- 2026-05-18 (Phase 0 close — Unit 0.3 audition): Single-reader
  fallback shape applied to Section 2 in continuity with Sections 1
  + 3 + 5 — `Tester count` field carries the n=1 fallback signal +
  validity caveat reference; full decode validation defers to Phase 6
  N=6 cross-phase ADR #21. No template field semantics changed.
- 2026-05-18 (Phase 0 close — Unit 0.3 voice iteration): Section 2
  gains "Voice settings" subfield as a CHILD of "Speaker voice ID" —
  Janet's matriarch-tuned profile diverges from Unit 0.2 Roger
  defaults, so the override must be explicit in the EXIT doc.
  Add-only amendment per template policy. No removal or semantic
  change to existing fields.

Removing fields or changing field semantics requires a brainstorm-
level re-open routed through `/ce:plan` deepening, NOT a silent edit.
