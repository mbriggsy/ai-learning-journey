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

## 1. Stimulus

### Path A — TTS scream (`[shouts]` tag, primary attempt)

- **File:** `path-a-tts.mp3`
- **sha256:** `0e3e2e1b75cc3140987b37387e4617114e3142c2f7a7ee81d876b9e516964225`
- **Source:** ElevenLabs v3, voice `Roger` (`CwhRBWXzGAHq8TQ4Fs17`),
  model `eleven_v3`, voice_settings `{stability:0.70, similarity_boost:0.75, style:0.15, use_speaker_boost:true, speed:0.95}`,
  bracket tag `[shouts]`, text payload `[shouts] VERAAA!!!`.
- **Generated:** 2026-05-18 in the Unit 0.2 Step 2 engine matrix
  (`scripts/generate-tts-eval.ts`) — clip reused unchanged per
  phase-0-gate-resolution.md §Unit 0.6 ("Path A reuses the isolated
  scream clip already generated in Unit 0.2 Step 1 Paragraph 3").
- **Format:** mp3 44.1kHz/128kbps mono, ~1.5s.

**Acoustic acceptance shape** (cadence-spec.md §3.6): the scream
should be **volume-discontinuous, not pitch-discontinuous** — a 6-12 dB
amplitude jump above conversational baseline WITHOUT F0 falsetto rise.
Sterling-CODED screams maintain register; they shout louder, not
higher.

---

## 2. Audition + Decision

Briggsy plays `path-a-tts.mp3` and picks ONE of:

| # | Outcome | Trigger |
|---|---|---|
| 1 | **Ship Path A `[shouts]`** | Scream lands as Archer-grade authentic — volume-discontinuous, no falsetto-rise, comedic |
| 2 | **Re-render with `[shouting]`** | Close but not quite — try the alternate documented v3 tag |
| 3 | **Re-render with `[scream]`** | Both documented tags fail — test the undocumented community-anecdotal tag as last resort |
| 4 | **Cut R5** | None of (1)/(2)/(3) lands Archer-grade — flat scream worse than no scream per brainstorm rule |

**Re-render procedure (if outcome 2 or 3):** edit the `scream`
paragraph entry in `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
(field `bracket_tags_per_paragraph.scream.leading_tag`) to the new
tag, then re-run `pnpm matrix` from `videos/trailer/`. New clip lands
at `videos/trailer/sample-eval/r4-dash/matrix/path-a-elevenlabs/scream.mp3`;
copy to `r5-scream/path-a-tts.mp3` and re-audition. Char-budget impact
per re-render: ~9 chars (~0.01% of monthly cap).

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
