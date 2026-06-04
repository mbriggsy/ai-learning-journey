---
title: "Phase 3 — Depth on Demand"
type: feat
phase: 3
parent: docs/plans/mvp-confidence-spine/roadmap.md
date: 2026-06-03
status: not-started
deepened:        # YYYY-MM-DD
doc-reviewed:    # YYYY-MM-DD
coded:           # YYYY-MM-DD
code-reviewed:   # YYYY-MM-DD
---

# Phase 3 — Depth on Demand

**Goal.** Deliver the "pull it toward you" half of the master principle: the sharpen loop (every assumption visible and editable), the one differentiated Roth-conversion lever, and the returning-user re-entry with honest staleness.

**Why this is Phase 3.** These surfaces all *consume* the first answer — they only make sense once the confidence statement exists (Phase 2) and the engine is deterministic (Phase 1). The Roth lever is the differentiation success criterion and the regulatory tripwire, so it lands after the spine is trustworthy. Re-entry closes the loop for returning users.

> Paths are relative to `projects/the-back-nine/`. References: `(origin: …)`, `(findings §StrandN)`. Reference numbers/params live in the findings doc.

---

- [ ] **Unit 7: Sharpen loop + assumption editing (R7/R8) + escape hatch**

**Goal:** Make every assumption visible and editable, so each added precision visibly (and stably) tightens the confidence band — and a power user can set any assumption directly.

**Requirements:** R6 (escape hatch), R7 (every assumption visible+editable), R8 (refinement tightens the band).

**Dependencies:** Units 1, 5.

**Files:**
- Create: `src/ui/SharpenLoop.tsx`, `src/ui/AssumptionPanel.tsx`, `src/ui/EscapeHatch.tsx`
- Modify: `src/store/memoryModel.ts` (edit → recompute)
- Test: `src/ui/__tests__/sharpen.test.tsx`, `assumptions.test.tsx`

**Approach:**
- Every assumption the flow made on the user's behalf (returns, inflation, longevity, **survivor-SS step-down, survivor-spending ratio, death-order hypothetical**) is listed and editable — these survivor assumptions are R7 obligations the engine makes invisibly today.
- Each edit re-runs the engine through the **Phase-2 `memoryModel` orchestrator** (it does **not** re-own the recompute home — it **extends** it) with the **same seed** → the band moves **monotonically** (no sampling jitter) and **morphs** (Unit 4's draw-once-then-morph, never a re-draw). Phase 2 **named** the hysteresis seam (memoryModel = recompute home + future owner) but built **no** sticky rounding — during intake the numbers move **freely** so progressive sharpening is visible. **This unit seats the stateful sticky-rounding**: it adds the `lastDisplayedHeadline` / `lastDisplayedDollar` / `lastState` fields to memoryModel and the sticky rule, applied to edits of an **already-complete** answer, keeping the X-of-N headline, the **dollar figure**, and the **copy-state / verb tense** stable under tiny changes (Phase-1 contract #1, Phase-2-amended). The cross-edit margin-gated crossfade Unit 5 defined is **exercised here** (Phase 2 tested it only with synthetic prop recomputes).
- Honest about the **epistemic vs aleatory** floor: sharpening narrows input uncertainty but cannot narrow market randomness — copy for "you've hit the floor, more precision won't narrow it further," and for "sharpening revealed bad news" (entering real, higher spending makes the verdict worse — handled calmly; R8's "rewarding" cannot promise only-good-news).
- Escape hatch: jump straight to any assumption without walking the guided path (R6).

**Patterns to follow:** `useCallback` slider/panel handlers (`ai-journey-stats/007`); portal panels (`burned/013`).

**Test scenarios:**
- Happy path: edit an assumption → engine recomputes → band visibly tightens; same seed → no jitter.
- Edge case: entering higher real spending makes the verdict worse → calm "sharpening revealed…" copy, not a cheerful tightening.
- Edge case: at the aleatory floor, further precision does not narrow the band → the floor is communicated, not hidden.
- Edge case: every survivor-phase assumption is present and editable (R7 completeness check).
- Integration: escape hatch sets an assumption directly and the answer updates consistently with the guided path.

**Verification:** Every assumption behind the answer is reachable and changeable within one interaction (trust success criterion); edits move the band stably and monotonically.

---

- [ ] **Unit 8: Roth-conversion lever (the differentiator)**

**Goal:** The one tax lever — a quiet categorical surface → a user-initiated "two futures, with vs without" → live tuning, headlined by the survivor's tax cliff, as a calculator that never issues a verdict.

**Requirements:** R9, R10, R11, R12 (string-level).

**Dependencies:** Units 1 (CRN), 4 (two-series **encoding tokens** — line-style/marker/label/luminance + the CVD/grayscale gate; the de-collision/delta-hero *rendering* is THIS unit's, see below), 5 (copyGuard + copy catalog), 3 (the in-memory `memoryModel` the lever-open mini-intake extends).

**Files:**
- Create: `src/engine/roth.ts`, `src/viz/TwoFutures.tsx` (the two-series **component** — built here against `roth.ts`'s real emission, reusing Unit 4's encoding tokens, so the data-shape contract is never guessed a phase ahead of its producer — `burned/042`), `src/ui/RothLever.tsx`, `src/ui/RothSurface.tsx`, `src/ui/RothTuner.tsx`, `src/ui/RothAccounts.tsx` (lever-open mini-intake for the account-type buckets)
- Modify: `src/shared/model.ts` (add per-person pre-tax / Roth / taxable bucket fields behind a `schemaVersion` bump — the migration enabler Phase 1 Unit 2 seated)
- Test: `src/engine/__tests__/roth.test.ts`, `src/ui/__tests__/rothLever.test.tsx`

**Approach:**
- **Quiet categorical surface (R11, regulatory):** surfaces on a general fact about couples filing jointly ("couples who file jointly often have a low-bracket window before RMDs at 73…"), **naming NO personalized dollar figure** — personalization appears only after the user opens it. This is the categorical→personalized boundary (findings §Strand 3 — the "ballgame").
- **Account-type buckets are collected here, on lever-open (the Phase-2→3 handoff).** Phase 2 intake deliberately collects only one total-savings figure to protect the calm on-ramp; the Roth lever cannot model a conversion without the pre-tax pool (the convertible source + the RMD base) and the existing Roth/taxable split, so `RothAccounts.tsx` is a lever-open mini-intake (per-person pre-tax balance required; existing Roth so the destination / survivor tax-free pool is honest; taxable optional). It writes the new `model.ts` bucket fields (behind the `schemaVersion` bump) and **owns the v1→v2 vault upgrade-on-open**: a returning user whose vault was saved in Phase 2 (v1, total-savings only) opens the lever → `RothAccounts` decrypts the v1 model, adds the collected bucket fields, and re-encrypts as v2 (the decrypt-branch-on-version enabler is Phase 1 Unit 2's). Stays a **calculator, not an optimizer**: model the conversion's tax / RMD / survivor-bracket effects as hypotheticals (R12); do **not** auto-select amounts or model a tax-payment-source optimization (that drifts toward the optimizer posture the regulatory line deliberately avoids).
- **Two futures (R10b):** with vs without, computed with **common random numbers** (same seed/paths both arms) so the delta is stable as the slider drags; rendered via `TwoFutures` (built here against `roth.ts`'s emission, reusing Unit 4's colorblind-safe two-series **encoding tokens**). **De-collision / delta-as-hero rendering is owned here** (it lives with its only consumer + real emission, per `burned/042`): the small-delta "buys you ~N years" case is exactly where end-labels collide, so the **delta callout is the hero** and the per-series labels resolve into a **value-ordered, leadered stack with a minimum vertical separation**; the **narrowest breakpoint collapses to the delta callout + a one-tap reveal** of the two values (R4; mobile must shine).
- Headline = the **survivor's** tax cliff (converting while both file jointly defuses the survivor's post-first-death bracket jump). The "buys you ~N years" delta is the **survivor's** number and carries the **same probabilistic honesty** as the spine (odds, not deterministic certainty).
- **Death-order** is an explicit, editable hypothetical (R7), framed "if X predeceases Y…" (R12), never a prediction.
- Live tune amount/years; both futures update live.
- **Calculator, never a verdict:** `copyGuard` (Unit 5) lints the slider readout + the "buys you ~N years" headline; never names securities, asset classes, or asset *location*.

**Execution note:** Test-first on `roth.ts` common-random-numbers stability and the copy-guard, then the UI.

**Patterns to follow:** Unit 1 seeding/CRN; Unit 5 `copyGuard` + copy catalog; Unit 4 two-series **encoding tokens** (line-style/marker/label/luminance + the grayscale gate); `burned/042` (single-source the producer→viz shape contract).

**Test scenarios:**
- Happy path: open the lever → two futures render; dragging the amount slider updates both arms live.
- Edge case (CRN): the with/without delta changes monotonically with the slider, no jitter (common random numbers verified — identical seed across arms).
- Edge case (two-series convergence — owned here with `TwoFutures`): two near-converging arms at minimal delta → both series identities stay legible, labels **non-overlapping** (value-ordered leadered stack), the delta callout is correct, and the narrowest breakpoint collapses to the delta callout + one-tap reveal.
- Integration (v1→v2 vault upgrade): open the lever against a **pre-existing Phase-2 v1 vault** (total-savings only) → `RothAccounts` collects the buckets, the model upgrades v1→v2 and re-encrypts, and a subsequent reload reads it as v2 (decrypt-branch-on-version, Phase 1 Unit 2).
- Error path (regulatory): the quiet surface contains no personalized dollar figure (asserted); `copyGuard` rejects any forbidden verb on the readout/headline.
- Edge case: the "buys you ~N years" figure is the survivor's, expressed probabilistically (matches spine voice), not a deterministic claim.
- Edge case: death-order is editable and framed as a hypothetical.
- Integration: a Roth what-if visibly moves the confidence answer (differentiation success criterion).

**Verification:** A user watches a Roth what-if visibly move the confidence answer; the surface stays categorical until opened; no string issues a directive; the delta is the survivor's and probabilistic.

---

- [ ] **Unit 9: Returning-user re-entry + staleness**

**Goal:** A calm re-entry that shows the saved answer (not a re-run of intake) with honest staleness awareness.

**Requirements:** R4 (saved answer surface), R8 (re-entry not re-intake), R15/R16 (unlock).

**Dependencies:** Units 2, 5.

**Files:**
- Create: `src/ui/ReEntry.tsx`, `src/store/staleness.ts`
- Modify: `src/shared/model.ts` (tax-table + SS version stamps)
- Test: `src/ui/__tests__/reentry.test.tsx`, `src/store/__tests__/staleness.test.ts`

**Approach:**
- Unlock with passphrase → show the **saved confidence statement**, not the intake flow.
- **Multi-clock staleness:** wall-time since last edit; **tax-table vintage** (version-stamp the 2026 MFJ brackets — a 2026-computed answer viewed in 2027 is silently stale, and the Roth lever is bracket-sensitive); SS COLA/wage-base vintage. The **undetectable clock** — the user's real portfolio has drifted and the app *cannot* know (no aggregation) — is handled by a calm **"is this still your balance?"** confirmation before presenting the saved verdict as current.
- Stamps live on the model so staleness is computable offline.

**Patterns to follow:** Unit 2 unlock; Unit 5 statement.

**Test scenarios:**
- Happy path: unlock → saved verdict shown immediately (no intake re-run).
- Edge case: tax-table version older than current → a calm staleness note appears.
- Edge case: re-entry gates the "is this still your balance?" confirm before showing the saved verdict as current.
- Error path: failed unlock → calm retry, no data leak.
- Integration: confirming a changed balance routes into the sharpen loop (Unit 7) rather than full re-intake.

**Verification:** A returning user sees their saved answer behind an unlock, with honest staleness, and is nudged to confirm the balance before trusting a stale verdict.
