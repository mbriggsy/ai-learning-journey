# R5 Sterling-Screams-Lana Cameo Eval — Unit 0.6

> **Phase 0 Unit 0.6 record.** Determines whether the TTS Dash scream
> cameo (`"VERAAA!!!"`) clears Archer-grade authenticity, or whether
> R5 is cut. Brainstorm rule: **flat scream is worse than no scream.**
>
> **Execution shape:** single-reader audition (Briggsy). Pivoted from
> 3-listener panel 2026-05-18 — Briggsy declined to (a) record an
> owned-voice scream for Path B Voice Changer, (b) source/judge a
> reference anchor clip, (c) recruit external Archer-fan listeners.
> Single-reader fallback is precedent-aligned: same shape closed
> Unit 0.2 (per `videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md`
> §Reader A audition) and Step 0.5 (per `preflight/preflight-decision.md`).
> Plan source-of-truth: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.6.

## Status

**🟡 IN-FLIGHT** — Path A clip in place from Unit 0.2 Step 2 matrix.
Awaiting Briggsy audition.

(Disposition flips to `✅ CLEARED via Path A [shouts]` /
`✅ CLEARED via Path A [shouting]` / `✅ CLEARED via Path A [scream]` /
`❌ CUT` after the audition.)

---

## 1. Stimuli (variants under audition)

### v1 — `[shouts] VERAAA!!!` (matrix default, short-burst form)

- **File:** `path-a-tts.mp3`
- **sha256:** `0e3e2e1b75cc3140987b37387e4617114e3142c2f7a7ee81d876b9e516964225`
- **Source:** ElevenLabs v3, voice `Roger` (`CwhRBWXzGAHq8TQ4Fs17`),
  model `eleven_v3`, voice_settings `{stability:0.70, similarity_boost:0.75, style:0.15, use_speaker_boost:true, speed:0.95}`,
  text payload `[shouts] VERAAA!!!` (3 A's).
- **Generated:** 2026-05-18 in the Unit 0.2 Step 2 engine matrix.
- **Reader-A signal (Briggsy, 2026-05-18):** *"the pitch is good
  though. sounds really good"* — pitch + voice cleared; vowel-drag
  shape under-rendered (Sterling's signature is the sustained call,
  not the short burst — captured below).

### v2 — `[shouts] VERAAAAAAAAAAA!!!` (second-vowel drag — FAILED shape)

- **File:** `path-a-tts-v2-vowel-drag.mp3`
- **sha256:** `879d8b3c2bfb87c9ee4116116b2f6b6c85661ae2b92aff43d4bddc0eecb57820`
- **Source:** ElevenLabs v3, voice Roger, same voice_settings as v1,
  text payload `[shouts] VERAAAAAAAAAAA!!!` (11 A's — drag on second
  vowel).
- **Generated:** 2026-05-18 via `scripts/generate-scream-variant.ts`
  in response to Reader A note that v1 missed the sustained-call
  shape.
- **Reader-A signal (Briggsy, 2026-05-18):** *"the wrong vowel got
  elongated. it sounds like verrrraaa, i think it should be
  veeeeeeeeraaaa and the accent shifted it needs to stay on the 1st
  syllable."* Diagnosis: the AAA cluster after R triggered an R+A
  blend elongation (engine treated R+AAA as one sustained ar-blend),
  AND the accent migrated from VEE (first syllable) to RAH (the
  dragged vowel). Sterling-LANA shape requires drag on the FIRST
  vowel with accent staying on the first syllable.
- **Char-budget impact:** +26 chars (cumulative 2,840 / 100,000).

### v3 — `[shouts] VEEEEEEEERAAAA!!!` (first-vowel drag, accent-anchored)

- **File:** `path-a-tts-v3-first-vowel-drag.mp3`
- **sha256:** `5daa176d38ce3f4f8711ae7b8351485d0299ff7a9473a29ec0658c8a72269c9a`
- **Source:** ElevenLabs v3, voice Roger, same voice_settings as v1/v2,
  text payload `[shouts] VEEEEEEEERAAAA!!!` (8 E's + 4 A's — matching
  Briggsy's typed reference exactly). Drag on the first vowel (EE)
  with secondary stretch on the trailing A.
- **Generated:** 2026-05-18 via `scripts/generate-scream-variant.ts`
  in response to v2 Reader-A signal.
- **Char-budget impact:** +26 chars (cumulative 2,866 / 100,000).
- **Theoretical alignment with Sterling-LANA:** first vowel
  stretched + accent anchored on first syllable + quick punctuated
  tail = the four-axis acoustic shape captured below.

**Sterling-LANA acoustic acceptance shape** (refined characterization,
captured 2026-05-18 — supersedes the pure "volume-discontinuous /
not pitch-discontinuous" framing in cadence-spec.md §3.6):

1. **Pitch flat.** No F0 falsetto rise. Sterling stays in
   mid-baritone register through the scream. *(v1 cleared this.)*
2. **Amplitude jump.** 6-12 dB above conversational baseline.
3. **Vowel-drag.** Sustained vowel on the stressed syllable — the
   AH gets stretched into a multi-second drone, not a quick burst.
   The comedic core of "Laaaaaaaaaaaana!" is the duration, not the
   loudness. *(v2 tests this.)*
4. **Quick punctuation tail.** Final unstressed syllable ("-na" /
   "-a") snaps short, not stretched alongside the AH.

cadence-spec.md §3.6 update pending — will land in a follow-up
commit if Briggsy confirms v2 lands the shape (no point editing
spec on speculation).

---

## 2. Audition + Decision

Briggsy A/Bs `path-a-tts.mp3` (v1) vs `path-a-tts-v3-first-vowel-drag.mp3`
(v3), then picks ONE of:

| # | Outcome | Trigger |
|---|---|---|
| 1 | **Ship v1** (`[shouts] VERAAA!!!`) | Short-burst form lands; vowel-drag judged unnecessary |
| 2 | **Ship v3** (`[shouts] VEEEEEEEERAAAA!!!`) | First-vowel-drag form lands the Sterling-LANA shape |
| 3 | **Try another variant** | Neither v1 nor v3 lands — iterate on tag, vowel count, or stress shape (see Re-render procedure below) |
| 4 | **Cut R5** | No variant lands Archer-grade after exhausting reasonable iterations; flat scream worse than no scream per brainstorm rule |

(v2 is preserved on disk as a FAILED-shape negative reference — drag
landed on the wrong vowel + accent shift.)

**Re-render procedure (outcome 3 — iterate):** the
`generate-scream-variant.ts` script takes arbitrary text + label +
optional bracket tag. Examples worth running:

| Hypothesis | Command |
|---|---|
| `[shouting]` tag may give different amplitude/duration shape | `pnpm scream:variant --text "VERAAAAAAAAAAA!!!" --label "v3-shouting" --tag "[shouting]"` |
| No tag — see what the all-caps stretched text does alone | `pnpm scream:variant --text "VERAAAAAAAAAAA!!!" --label "v4-no-tag" --no-tag` |
| Try `[scream]` (undocumented community-anecdotal) | `pnpm scream:variant --text "VERAAAAAAAAAAA!!!" --label "v5-scream" --tag "[scream]"` |
| Different vowel count — 7 A's instead of 11 | `pnpm scream:variant --text "VERAAAAAAA!!!" --label "v6-7As"` |
| Sub-call shape — drag drops to quiet tail | `pnpm scream:variant --text "VERAAAAAAAAAAANA..." --label "v7-with-tail"` |

Char-budget impact per render: ~25 chars (~0.025% of monthly cap).

---

## 3. Briggsy's Audition

Filled at audition time.

- **Date:** _YYYY-MM-DD_
- **Tag heard:** `[shouts]` / `[shouting]` / `[scream]`
- **Verbatim reaction:**

  > _[paste exact words]_

- **Outcome:** ☐ ship  ☐ re-render `[shouting]`  ☐ re-render `[scream]`  ☐ cut

If re-render → loop back to §3 with the new clip + new audition entry
beneath this one (don't overwrite — preserve the audit trail).

---

## 4. Disposition

Filled at decision time.

```
Date:             YYYY-MM-DD
Outcome:          [ ship | cut ]
Path A tag locked: [shouts] / [shouting] / [scream]   (N/A if cut)
Path A sha256:    [final clip sha256]                  (N/A if cut)
Briggsy summary:  [1-2 sentences capturing the call]
Carry-forwards:   [any Phase 4 hand-off notes — voice_settings tuning,
                  fallback option to revisit, etc.]
```

---

## 5. Downstream Propagation

Filled at disposition time. Each item is a write that must land
**before** Unit 0.6 is considered closed.

- [ ] `PHASE-0-EXIT.md` §Section 5 (R5 Scream Disposition) updated
      with: ship-via-Path-A-`{tag}` / cut, plus 1-line rationale
      citing this document.
- [ ] **If R5 cut:** Unit 0.3 candidate speaker pool updated —
      `phase-0-gate-resolution.md` §Unit 0.3 Step 1 candidate set
      drops "Vera (if R5 cleared)" branches; documented here in
      §4 Disposition carry-forwards.
- [ ] **If R5 ships:** Phase 4 trailer assembly inherits the
      locked clip at the scene-4 cameo slot. Note in §4 carry-forwards
      for downstream consumers.
- [ ] `briggsy-review-0.6.signoff` sentinel file written per ADR #22
      sign-off ceremony (phase-0-gate-resolution.md §PHASE-0-EXIT.md
      template). File contents: `signed-off-by: Briggsy / date: YYYY-MM-DD / sha256: <hash of this file at sign-off>`.

---

## 6. Authoritative pointers

- Plan source-of-truth: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.6
- Unit 0.2 disposition (winning voice + settings inherited):
  `videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md`
- Engine adapter (voice ID + settings + bracket-tag mapping):
  `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- Char-budget tracker:
  `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Cadence spec (acoustic acceptance shape — §3.6 scream characterization):
  `videos/trailer/sample-eval/r4-dash/cadence-spec.md`
- Matrix orchestrator (used for re-render with alternate bracket tag):
  `videos/trailer/scripts/generate-tts-eval.ts`

## Appendix — what was dropped from the original spec

Recorded for audit / future-Briggsy / whoever reads this in Phase 4:

1. **Path B Voice Changer (Speech-to-Speech).** Required Briggsy to
   record an owned-voice scream as STS input. Briggsy declined
   2026-05-18 ("not recording my voice"). The renderer
   (`generate-path-b-vc.ts`) was authored and then removed in the
   same session — restorable from git history if Briggsy ever
   elects Path B. ElevenLabs STS API surface contract preserved in
   that commit's body.
2. **Non-Benjamin reference scream anchor.** Was a 3-listener control
   variable; with single-reader, redundant (Briggsy holds the Archer
   mental reference). Candidate research preserved in git history
   (Freesound CC0 + voice-actor portfolio reels — see prior commit
   `a4107255`).
3. **3-listener panel + pool-independence audit.** Briggsy is the sole
   listener; pool-independence is moot with N=1.

Single-reader fallback is precedent-aligned with Unit 0.2 and
Step 0.5 closure shape.
