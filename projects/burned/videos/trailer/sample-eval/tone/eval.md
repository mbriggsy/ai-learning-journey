# Played-Straight Tone Gate — Unit 0.4

> **Phase 0 Unit 0.4 record.** Determines whether the played-straight
> deadpan-spy register lands on the locked Dash voice (Path A —
> ElevenLabs Roger) with engineering-peer test listeners articulating
> the gap-comedy mechanic unprompted, OR whether the played-straight
> Key Decision re-opens at brainstorm level.
>
> **Execution shape:** single-reader audition (Briggsy). Pivoted from
> the plan's n=4 mixed Archer-aware/unaware protocol 2026-05-18 —
> precedent-aligned with Unit 0.2 + Unit 0.6 single-reader fallbacks
> (Briggsy declined to recruit external testers in those units).
>
> **Validity caveat — recorded, not silently demoted.** A single reader
> who authored the paragraph cannot run the formal gap-comedy decode
> test (unprompted "what's the joke?" articulation). The decode is
> something the paragraph's author already knows the answer to. Under
> single-reader Unit 0.4 collapses to a **tone render-quality + spec
> sanity check**: does the ElevenLabs Roger render of the locked
> paragraph LAND as deadpan-briefing-room over SDLC subject matter,
> and does the gap-comedy mechanic feel like it survived the
> Pendleton-vocab translation? The full decode gate (n=6 mixed listeners
> articulating the gap unprompted) **defers to Phase 6's N=6
> cold-decode panel** per cross-phase ADR #21 — which already exists
> as a downstream re-validation for any voice/tone disposition locked
> under single-reader fallback in Phase 0.
>
> Plan source-of-truth:
> `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.4
> (lines 1939-2092).

## Status

🟡 **IN-FLIGHT — render landed 2026-05-18, awaiting Briggsy single-reader audition.**

`sample.mp3` rendered via `pnpm tone:clip` against the locked Path A
adapter. Audition protocol below; Briggsy plays the clip cold and
picks one of the 4 outcomes in §2.

---

## 1. Stimulus

### sample.mp3 (v2 — current) — TONE_SAMPLE_PARAGRAPH with earned Phrasing!

- **File:** `sample.mp3`
- **sha256:** `1d89d911a0dd65f5e201b94c57a8c7c2c27fbdd9fcf1b80b561d9769577e4b60`
- **Bytes:** 487,384
- **Payload chars (including bracket tags):** 403 (raw paragraph 381 chars; `[deadpan] ` + `[sarcastic] ` add 22)

### sample.v1.mp3 — FAILED iteration (unearned Phrasing!) preserved for A/B

- **File:** `sample.v1.mp3`
- **sha256:** `3a85741a75e14660883e4ea3c3bbb0ac7c771c1242ba32f4a2053da454987a3f`
- **Bytes:** 442,662
- **Payload chars (including bracket tags):** 385
- **Failure mode:** Paragraph ended `"Try and find a human one. …Phrasing."` with no double-entendre setup preceding the Phrasing! tag. Briggsy caught it on audition 2026-05-18: *"Phrasing is more of the equivalent of 'That's what she said' — a mix of immature double entendres, innuendos."* Phrasing! requires an entendre-coded setup line; v1 had none, so the tag was unearned. v2 inserts `"Hard to put down."` (literal: page-turner; entendre: "hard") to earn the beat.
- **Source paragraph:** `TONE_SAMPLE_PARAGRAPH` in
  `videos/trailer/scripts/tone-prototype.ts` (verbatim from plan
  §Step 1). 57 words / ~20 second target read.
- **Voice:** ElevenLabs Voice Library — Roger (`CwhRBWXzGAHq8TQ4Fs17`)
- **Model:** `eleven_v3`
- **Voice settings:** `{stability: 0.70, similarity_boost: 0.75,
  style: 0.15, use_speaker_boost: true, speed: 0.95}` (inherited from
  Unit 0.2 disposition).
- **Output format:** `mp3_44100_128`
- **Bracket-tag treatment:** `[deadpan]` leading + `[sarcastic]`
  inline immediately before `…Phrasing` (mirrors adapter
  §bracket_tags_per_paragraph entries for deadpan-exposition +
  monologue-exasperation Phrasing handling).
- **Renderer:** `scripts/generate-tone-clip.ts`
- **Invocation:** `pnpm tone:clip` (from `videos/trailer/`)
- **Generated:** 2026-05-18 (latency 14.6s; char-budget impact +385 → 3,251 / 100,000 = 3.25% of monthly cap)

### Pendleton-vocab translation table

The stimulus encodes 5 briefing-room substitutions over engineering
concepts. The gap-comedy mechanic depends on ALL five surviving the
read. Contract test (`tone-prototype.test.ts`) asserts presence;
audition validates the gap LANDS in delivery.

| Engineering term | Briefing-room substitution |
|---|---|
| agents | field asset |
| specs | forensic dossier |
| tests | contingency war-gamed |
| deploy | activated |
| roster | operative profiled |

---

## 2. Audition + Decision

Briggsy plays `sample.mp3` once cold, then picks ONE of:

| # | Outcome | Trigger |
|---|---|---|
| 1 | **Ship played-straight tone-locked** | Roger's render lands as deadpan-briefing-room over SDLC subject; gap-comedy survives the read (felt as juxtaposition, not as gibberish); Phase 1 beat-sheet inherits "played-straight" as a locked register decision |
| 2 | **Re-render with tweaked bracket-tag treatment** | Tone is close but a tag is mis-anchored (e.g. `[sarcastic]` over-performs or under-performs at Phrasing landing); iterate on `buildPayload()` in `generate-tone-clip.ts`, re-run, re-audition |
| 3 | **Defer decode-validation to Phase 6 N=6 panel** | Tone render-quality clears; gap-comedy decode test cannot be validated by author single-reader — explicit handoff to Phase 6 cross-phase ADR #21. Locks register as "provisional played-straight, decode-validated downstream" |
| 4 | **Re-open played-straight Key Decision** | Render feels off — either the tone is wrong on this voice (engine-level mismatch) OR the Pendleton-vocab translation is too dense / too light. Either way, brainstorm-level reopen per plan §Step 4 fail-action. The trailer may need a hybrid tone (one wink-line) or a different opening frame. |

**Re-render procedure (outcome 2 — iterate):** edit `buildPayload()`
in `scripts/generate-tone-clip.ts`, then `pnpm tone:clip`. The
renderer is parameterless and writes to the same path; preserve the
previous render under a `sample.v{N}.mp3` filename before iterating
if A/B comparison is wanted.

**Re-open procedure (outcome 4):** capture verbatim reaction in §3
below, mark §4 disposition as `reopen`, and surface to Briggsy as a
brainstorm-level question. Plan §Step 4 enumerates the fail-action
ladder (re-write paragraph leaning harder into SDLC subject matter
with NEW listeners preserving Archer-aware/unaware mix; if
second-pass fails, hybrid-tone or different opening frame
discussion).

---

## 3. Briggsy's Audition

### v1 — 2026-05-18

- **Paragraph ending:** `"... Try and find a human one. …Phrasing."`
- **Bracket-tag treatment:** `[deadpan]` leading + `[sarcastic]` before `…Phrasing`
- **Verbatim reaction:** *"Phrasing is more of the equivalent of 'That's what she said' — a mix of immature double entendres, innuendos. Does that help?"*
- **Diagnosis:** The Phrasing! catchphrase fires on a "that's what she said"-style trigger. v1's preceding line ("Try and find a human one") has no double-entendre reading — the Phrasing! tag was unearned. Briggsy also noted that sample-script-dash.ts paragraph 2's `"I've been waiting. …Phrasing"` is context-dependent / weak as a cold-listen entendre — flagged as a follow-up for any future Unit 0.2 reopen (out of Unit 0.4 scope).
- **Outcome:** iterate (re-write paragraph ending to include a real double-entendre setup)

### v2 — 2026-05-18

- **Paragraph ending:** `"... Try and find a human one. Hard to put down. …Phrasing."`
- **Bracket-tag treatment:** `[deadpan]` leading + `[sarcastic]` before `…Phrasing` (unchanged)
- **Entendre lock:** "Hard to put down" — literal reading "the dossier is a page-turner" + entendre on "hard." Now asserted by a contract test in `tone-prototype.test.ts` so a future edit that drops the entendre setup fails the test, BEFORE the unearned Phrasing! ships.
- **Verbatim reaction:** *"[FILL POST-AUDITION]"*
- **Outcome:** `[ship / iterate / defer-decode / reopen]`

---

## 4. Disposition

```
Date:                  [FILL]
Outcome:               [ship | iterate | defer-decode | reopen]
Path A tag treatment:  [deadpan] leading + [sarcastic] before …Phrasing
Path A sha256:         [FILL POST-RENDER]
Briggsy summary:       [FILL — 2-3 sentence verdict referencing reaction]

Carry-forwards to Phase 1 beat-sheet-lock:
- Tone register decision: [played-straight locked | provisional-pending-decode | reopened]
- Pendleton-vocab translation table: [survives | needs revision]
- Briefer voice: Roger (CwhRBWXzGAHq8TQ4Fs17 / eleven_v3) confirmed; voice_settings unchanged from Unit 0.2 lock

Carry-forwards to Phase 4 trailer assembly:
- Bracket-tag treatment for any Phrasing-tail paragraph: [deadpan] leading + [sarcastic] before …Phrasing (this audition's outcome)
- If outcome=iterate, the iteration that landed is the canonical pattern.

Carry-forwards to Phase 6 N=6 cold-decode panel (if outcome=defer-decode or single-reader-fallback elected):
- Stimulus: this sample.mp3 OR re-rendered Phase 4 production paragraph (whichever Phase 6 elects)
- Decode rubric: gap-articulation Tier 1 / Tier 2 / Insufficient per plan §Step 3
- Acceptance threshold: ≥4 of 6 testers reach Tier 1 OR Tier 2; ≥1 from each mix-profile (Archer-aware / Archer-unaware) reaches Tier 1
- If Phase 6 N=6 panel fails: brainstorm-level reopen of played-straight Key Decision; the trailer hard-pivots toward hybrid tone OR alternate opening frame
```

---

## 5. Downstream Propagation

Filled at disposition time. Each item is a write that must land
**before** Unit 0.4 is considered closed.

- [ ] `PHASE-0-EXIT.md` §Section 3 (Tone Disposition) — DEFERRED;
      PHASE-0-EXIT.md is written at Phase 0 close (after Unit 0.3
      finishes). This document is the durable Unit 0.4 record the
      exit doc will cite.
- [ ] **Phase 1 beat-sheet-lock hand-off** — tone disposition lands
      in `phase-1-beat-sheet-lock.md` §Tone column (played-straight
      locked / provisional-pending-decode / reopened). Phase 1
      branches on disposition state.
- [ ] **Phase 4 trailer assembly hand-off** — bracket-tag treatment
      from the locked-in render is the canonical pattern for any
      Phrasing-tail paragraph in production narration.
- [ ] **Phase 6 N=6 cold-decode panel cross-ref** (if outcome ∈
      `{defer-decode, ship}`) — ADR #21's N=6 panel is the load-bearing
      decode validation; this disposition supplies the stimulus +
      acceptance threshold + fail-action.
- [ ] `briggsy-review-0.4.signoff` sentinel written per ADR #22
      precedent (matches Unit 0.6 closure shape).

---

## 6. Authoritative pointers

- Plan source-of-truth:
  `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.4
- Paragraph constant + Pendleton translations:
  `videos/trailer/scripts/tone-prototype.ts`
- Renderer: `videos/trailer/scripts/generate-tone-clip.ts`
- Contract test:
  `videos/trailer/scripts/tone-prototype.test.ts`
- Engine adapter (voice ID + settings + bracket-tag conventions):
  `videos/trailer/sample-eval/r4-dash/cadence-spec-elevenlabs.json`
- Char-budget tracker:
  `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Cadence spec (acoustic acceptance shape):
  `videos/trailer/sample-eval/r4-dash/cadence-spec.md`
- Unit 0.2 disposition (voice + settings inheritance):
  `videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md`
- Cross-phase ADR #21 (Phase 6 N=6 decode panel):
  `docs/plans/origin-trailer/roadmap.md` ADR ledger

---

## Appendix — what was dropped from the original n=4 plan

Recorded for audit / future-Briggsy / Phase 6 panel coordinator:

1. **n=4 mixed Archer-aware/unaware listener panel.** Plan §Step 3
   prescribed 4 testers minimum (2 Archer-aware + 2 unaware, 6
   target) running blind cold-listen with two-reader transcript
   coding. Single-reader fallback elected by Briggsy 2026-05-18 in
   continuity with the same shape closing Unit 0.2 Step 0.5 and
   Unit 0.6.
2. **Two-reader transcript coding.** Briggsy + Claude / Briggsy +
   Harry independently grading each response to a Tier 1 / Tier 2 /
   Insufficient rubric. Moot with N=1 self-listener.
3. **Pool-independence audit.** Listener-roster tracking across
   Phase 0 units. Moot at N=1.

The **load-bearing decode-validation is preserved** by deferring to
Phase 6's existing N=6 cold-decode panel (cross-phase ADR #21).
Phase 6 listener pool is fresh, zero-overlap with Phase 0, blind
cold-listen — the same rigor the plan called for, just executed
downstream. The risk this carries: a tone disposition can pass
Phase 0 single-reader fallback then fail Phase 6 N=6, which would
trigger a structural reopen mid-production. This risk is documented
in the plan's deepening cross-references (lines 2683 + 2795 + 2867).
