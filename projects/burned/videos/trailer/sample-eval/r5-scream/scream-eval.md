# R5 Sterling-Screams-Lana Cameo Eval — Unit 0.6

> **Phase 0 Unit 0.6 record.** Determines whether a TTS-or-hybrid Dash
> scream cameo (`"VERAAA!!!"`) clears Archer-grade authenticity, or
> whether R5 must be cut. Brainstorm rule: **flat scream is worse than
> no scream.** Plan source-of-truth: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.6.

## Status

**🟡 IN-FLIGHT** — Path A clip in place from Unit 0.2 Step 2 matrix
(reused per spec). Path B awaits Briggsy's owned-voice recording.
Reference clip pending source selection. Listener panel pending
recruitment.

(Disposition will flip to `✅ CLEARED via (a)` / `✅ CLEARED via (b)` /
`❌ CUT` after the listener pass.)

---

## 1. Pool Independence Audit

**Rule** (per `phase-0-gate-resolution.md` §Documentation/Operational
Notes — P1.13): Unit 0.6 listeners MUST NOT have been Step 0.5
readers, Step 3 MUSHRA listeners, Unit 0.3 decode testers, or Unit 0.4
tone testers. The first gate a listener participates in calibrates
their downstream judgments; cross-overlap silently invalidates the
pass.

**Prior participants to exclude (Phase 0 to date):**

| Unit | Listener(s) | Date |
|---|---|---|
| Step 0.5 (single-reader fallback) | Briggsy (Reader A) | 2026-05-18 |
| Step 4 (skipped — N/A) | — | — |
| Step 5 audition (continuation of Reader A fallback) | Briggsy (Reader A) | 2026-05-18 |

→ **Briggsy is excluded as a Unit 0.6 listener.** Recruitment routes:
Briggsy's Discord network + Harry (`user_harry.md`) — neither has yet
sat any Phase 0 listener seat per the roster.

**Unit 0.6 panel (≥3 listeners, target 4):**

| # | Name | Recruitment confirmed | Date | Prior Phase 0 units | Pool-clean? |
|---|---|---|---|---|---|
| 1 | _TBD_ | ☐ | — | — | ☐ |
| 2 | _TBD_ | ☐ | — | — | ☐ |
| 3 | _TBD_ | ☐ | — | — | ☐ |
| 4 (target) | _TBD_ | ☐ | — | — | ☐ |

All listeners must self-attest Archer-fandom (definition: has watched
at least one full season; recognizes Sterling Archer's voice character
on hearing). Recorded in §Listener Responses below.

---

## 2. Stimuli

Three clips will be played in **randomized order per listener** (see
§3). Listeners do not know which is which.

### (a) Path A — Pure TTS scream

- **File:** `path-a-tts.mp3`
- **sha256:** `0e3e2e1b75cc3140987b37387e4617114e3142c2f7a7ee81d876b9e516964225`
- **Source:** ElevenLabs v3, voice `Roger` (`CwhRBWXzGAHq8TQ4Fs17`),
  model `eleven_v3`, voice_settings `{stability:0.70, similarity_boost:0.75, style:0.15, use_speaker_boost:true, speed:0.95}`,
  bracket tag `[shouts]`, text payload `[shouts] VERAAA!!!`.
- **Generated:** 2026-05-18 in the Unit 0.2 Step 2 engine matrix
  (`scripts/generate-tts-eval.ts`) — clip reused unchanged per
  phase-0-gate-resolution.md §Unit 0.6 ("Path A reuses the isolated
  scream clip already generated in Unit 0.2 Step 1 Paragraph 3").
- **Format:** mp3 44.1kHz/128kbps mono.
- **Bracket-tag fallback (conditional, only if listeners reject):**
  1. Primary attempt = `[shouts]` (this clip).
  2. If panel rejects, re-render with `[shouting]` (also documented in
     ElevenLabs v3 audio-tags reference).
  3. If panel rejects again, re-render with `[scream]` as a test
     (undocumented community-anecdotal tag; spec §Unit 0.6 Approach
     explicitly permits this as fallback).
  4. If all three tag variants reject, Path A fails; outcome routes to
     Path B alone or to R5 cut depending on panel verdict.

### (b) Path B — Voice Changer hybrid

- **File:** `path-b-hybrid.mp3` _(pending — see §6 Blockers)_
- **sha256:** _TBD after generation_
- **Source:** ElevenLabs `POST /v1/speech-to-speech/CwhRBWXzGAHq8TQ4Fs17`
  with model `eleven_multilingual_sts_v2`, applied to
  `path-b-source-recording.wav` (owned-voice human scream, Briggsy
  — gitignored as security-sensitive per `.gitignore` line 9).
- **Recording brief for the human-source scream** (per
  phase-0-gate-resolution.md §Unit 0.6 Path B step 1):
  - Mic distance: **12-18" from mouth** (phone) or **6"+** (laptop).
    Too close clips the loud peaks; Voice Changer cannot repair flat-top
    clipping.
  - Test the first take in Audacity — flat-top clipping = re-take
    further from mic OR lower input gain.
  - Multiple takes: 5-10 takes, pick the one with peak around
    **~-3 dBFS** (loud but unclipped).
  - Length: **~1.5s total.** The "VERAAA!!!" should pop instantly, not
    ramp up. Sterling-CODED scream is volume-discontinuous from
    baseline conversation, not a slow build.
  - Format: WAV (not MP3) for lossless input.
  - Save to: `videos/trailer/sample-eval/r5-scream/path-b-source-recording.wav`
- **Generation command** (once recording exists):
  ```bash
  cd videos/trailer && pnpm scream:path-b
  ```
  Script: `scripts/generate-path-b-vc.ts`. Output:
  `path-b-hybrid.mp3` + `path-b-generation-log.md`. Char-budget
  impact: +25 chars (estimate; logged in `char-budget.json`).

### (c) Reference — non-Benjamin authentic human scream

- **File:** `reference-scream.[ext]` _(pending — see §7 Reference Sourcing)_
- **sha256:** _TBD after download_
- **Source:** _TBD — see candidates in §7_

**Critical constraint:** Reference clip MUST NOT be Benjamin Jay's
archival scream. Per ADR #13 (Sterling-CODED, not Sterling-cloned) and
phase-0-gate-resolution.md §Unit 0.6 Listener protocol:

> Benjamin's archival scream is NOT used — this aligns with the ADR
> #13 design principle (don't anchor candidates against the impression
> target), removes fair-use friction, and prevents anchoring bias
> where Path A/B lose to the original because they're not Benjamin.

---

## 3. Playback Randomization

Each listener hears all three clips in a **randomly assigned order**.
Listener identifies what they pick by clip letter only — they do not
see which letter maps to which source until after they submit.

| Listener | Playback order | Identifier reveal? |
|---|---|---|
| 1 | _TBD_ | After submission |
| 2 | _TBD_ | After submission |
| 3 | _TBD_ | After submission |
| 4 | _TBD_ | After submission |

The eval operator (Briggsy or delegate) generates per-listener orders
via a fair shuffle (e.g., shuffle `[a, b, c]`); the order is recorded
in the listener's response cell at submission time.

---

## 4. The Question

Verbatim — read or shown to each listener before playback:

> **"Which of these would you ship in a comedy trailer where the joke
> depends on the scream being authentic? You can pick multiple. You
> can pick none."**

Allowed responses: any subset of `{a, b, c}`, or `none`.

After the multi-pick, the operator asks one **freeform comment** per
listener for verbatim transcription. No leading questions.

---

## 5. Listener Responses

Filled at eval time. One block per listener.

### Listener 1: _[name]_ — _[date]_

- **Archer-fan attestation:** ☐ confirmed
- **Pool-independence:** ☐ confirmed (no Phase 0 prior listener seat)
- **Playback order assigned:** _e.g., b → a → c_
- **Selections (multi-pick allowed):** ☐ a  ☐ b  ☐ c  ☐ none
- **Verbatim comment:**

  > _[paste exact words]_

### Listener 2: _[name]_ — _[date]_

- **Archer-fan attestation:** ☐ confirmed
- **Pool-independence:** ☐ confirmed
- **Playback order assigned:** _TBD_
- **Selections:** ☐ a  ☐ b  ☐ c  ☐ none
- **Verbatim comment:**

  > _[paste exact words]_

### Listener 3: _[name]_ — _[date]_

- **Archer-fan attestation:** ☐ confirmed
- **Pool-independence:** ☐ confirmed
- **Playback order assigned:** _TBD_
- **Selections:** ☐ a  ☐ b  ☐ c  ☐ none
- **Verbatim comment:**

  > _[paste exact words]_

### Listener 4 (target — for marginal-case disambiguation): _[name]_ — _[date]_

- **Archer-fan attestation:** ☐ confirmed
- **Pool-independence:** ☐ confirmed
- **Playback order assigned:** _TBD_
- **Selections:** ☐ a  ☐ b  ☐ c  ☐ none
- **Verbatim comment:**

  > _[paste exact words]_

---

## 6. Acceptance Check

Per phase-0-gate-resolution.md §Unit 0.6 Listener protocol
(P2.34-raised threshold):

- [ ] **≥2 of 3 listeners selected at least one of (a) or (b)**
- [ ] **No listener selected "none" exclusively across the panel**
- [ ] (Bonus signal — for marginal cases) Listener 4 either confirms
      a clear winner OR reveals split that warrants Path A re-render
      with `[shouting]`/`[scream]` fallback before final decision

**Result:** ☐ `CLEARED via (a)`  ☐ `CLEARED via (b)`  ☐ `CUT`

If the acceptance check fails (`"none" is the consensus` OR
`<2 listeners pick (a) or (b)`), **R5 is cut**:
- Vera is removed from the trailer (no non-scream cameo substitute
  per brainstorm cut-handling rule).
- If Vera was Unit 0.2's selected cold-open speaker for R14, the
  cold-open speaker re-selects from {Sable, Janet} OR R14 falls back
  to non-voice cold-open per the R5-research-gate routing — captured
  in §9 Downstream Propagation.

---

## 7. Reference Clip Sourcing — Candidates

Listed for Briggsy review. Pick ONE before listener seating begins;
download, place at `reference-scream.[ext]`, fill the §2(c) sha256.

### Candidate 1 (RECOMMENDED — cleanest license posture): Freesound CC0

**Strategy:** browse Freesound.org for a short male-shout/scream
licensed CC0 (Public Domain — no attribution required). Search URL:
<https://freesound.org/search/?q=male+scream+anger+frustration&f=license:%22Creative+Commons+0%22+duration:[0.5+TO+2.0]>

Tentative IDs surfaced via grounded search (verify on freesound.org
before downloading — license + duration + fitness):

- **<https://freesound.org/s/525622/>** — "Angry frustrated and
  disappointed - Male - Various Sounds.wav" by user khenshom
  (referenced as CC0). May contain a short clip suitable as the
  reference; verify license + extract appropriate ~1.5s segment.
- **<https://freesound.org/s/272373/>** — "Excited Young Male Screams"
  by user unfa (~40 short vocal shouts; cherry-pick best 1.5s).
  License must be re-verified on the freesound page.

License posture: CC0 = no attribution required, no fair-use friction,
no commercial-use complications. Cleanest for downstream Phase 4 /
Phase 6 audit if the reference is ever cited in eval notes.

### Candidate 2: Voice-actor demo reel (Brandon Deep, Voices.com)

- Profile: <https://www.voices.com/actors/BrandonDeep>
- Relevant demos: **"Angry Voice Actor | Rage & Fury for Games &
  Animation"** + "Boredom Voice Demo | Deadpan Animation & Game VO" +
  "Anxiety Voice Demo".
- Strengths: deep, warm baritone — strong fit for the Sterling-coded
  register cluster. Professional production quality.
- License posture: portfolio reels are technically marketing samples.
  Internal eval use (clip never shipped, played to ≤4 listeners during
  a research test) is defensible fair use. Document the source URL +
  use-context in §2(c) attribution if selected.

### Candidate 3: Voice-actor demo reel (Kevin Urban, Voices.com / YouTube)

- Profile: <https://www.voices.com/actors/KUrban1Voices>
- Demo reel: <https://www.youtube.com/watch?v=kYJv1zT0j10>
- Strengths: rich baritone, modern cinematic edge, gravelly
  authoritative villain tones. Character-driven dramatic intensity.
- License posture: same as Candidate 2 — internal eval, never shipped,
  document source + context if selected.

**Selection logged at:** _date / time_ — picked: _candidate # + URL_.

---

## 8. Reference Clip Attribution + Post-Eval Cleanup

Fill at clip download time.

- **Source URL:** _TBD_
- **License:** _TBD (CC0 / CC BY / portfolio fair-use / stock-licensed)_
- **Attribution required:** ☐ yes / ☐ no — if yes, attribution text:
  _TBD_
- **License rationale for internal eval use:** _TBD (1-2 sentences)_

### Post-eval cleanup verification

Per phase-0-gate-resolution.md §Unit 0.6 Verification:

- [ ] Any Benjamin-archival clips in workspace: VERIFIED ZERO via
      `git ls-files videos/trailer/sample-eval/r5-scream/`
- [ ] Reference clip source + license recorded above
- [ ] Local browser / Playwright caches cleared of any informal
      reference audio used during candidate review
- [ ] `videos/trailer/sample-eval/r5-scream/` directory contents
      reviewed pre-commit (no orphan reference candidates left
      sitting on disk)

---

## 9. Downstream Propagation

Filled at disposition time. Each item is a write that must land
**before** Unit 0.6 is considered closed.

- [ ] `PHASE-0-EXIT.md` §Section 5 (R5 Scream Disposition) updated
      with: cleared-via-(a) / cleared-via-(b) / cut, plus 1-line
      rationale citing this document.
- [ ] **If R5 cut:** Unit 0.3 candidate speaker pool updated —
      `phase-0-gate-resolution.md` §Unit 0.3 Step 1 candidate set
      drops "Vera (if R5 cleared)" branches; documented in this
      file's disposition section.
- [ ] **If R5 cleared:** Phase 4 trailer assembly inherits the
      winning clip (a or b) at the scene-4 cameo slot. Note in
      `unit-0.6-disposition.md` for downstream consumers.
- [ ] `briggsy-review-0.6.signoff` sentinel file written per ADR #22
      sign-off ceremony (phase-0-gate-resolution.md §PHASE-0-EXIT.md
      template). File contents: `signed-off-by: Briggsy / date: YYYY-MM-DD / sha256: <hash of this file at sign-off>`.

---

## 10. Disposition

Filled when the panel completes and acceptance check resolves.

```
Date:             YYYY-MM-DD
Outcome:          [ cleared-via-(a) | cleared-via-(b) | cut ]
Path A tag used:  [shouts] / [shouting] / [scream]      (N/A if Path B wins or cut)
Path A sha256:    0e3e2e1b75cc3140987b37387e4617114e3142c2f7a7ee81d876b9e516964225
Path B sha256:    _TBD_                                  (N/A if cut OR Path A wins)
Reference sha256: _TBD_
Listeners:        [n] of [target n] panel size
Panel summary:    [verbatim 1-2 sentence summary of why this won/cut]
Carry-forwards:   [any Phase 4 hand-off notes — e.g. preferred
                  voice_settings, alternate-tag retry, etc.]
```

---

## 11. Authoritative pointers

- Plan source-of-truth: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.6
- Unit 0.2 disposition (winning voice + settings inherited):
  `videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md`
- Engine adapter (voice ID + settings):
  `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- Char-budget tracker:
  `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Path B generator: `videos/trailer/scripts/generate-path-b-vc.ts`
- Listener-roster shared across Phase 0 units (TBD):
  `videos/trailer/sample-eval/listener-roster.md` _(scaffold at
  Unit 0.6 panel seating time)_
