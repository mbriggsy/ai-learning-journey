---
title: "Phase 2 — The First Answer (the magic moment)"
type: feat
phase: 2
parent: docs/plans/mvp-confidence-spine/roadmap.md
date: 2026-06-03
status: not-started
deepened:        # YYYY-MM-DD
doc-reviewed:    # YYYY-MM-DD
coded:           # YYYY-MM-DD
code-reviewed:   # YYYY-MM-DD
---

# Phase 2 — The First Answer (the magic moment)

**Goal.** Deliver the magic moment end-to-end: a calm one-question-at-a-time intake that produces a first plain-language confidence statement, rendered through colorblind-safe viz, handling all six outcome states honestly — with nothing persisted until the user chooses to save.

**Why this is Phase 2.** Phase 1 proved the engine is *right* and the store is *safe*. This phase is where a stranger first meets the product and decides whether to trust it. It consumes the engine (Unit 1) and is gated by the N=1 cold-read across all outcome states — the human bar from the success criteria. The viz primitives (Unit 4) can be built alongside Phase 1 since they only depend on the scaffold.

> Paths are relative to `projects/the-back-nine/`. References: `(origin: …)`, `(findings §StrandN)`. Reference numbers/params live in the findings doc.

---

- [ ] **Unit 3: Guided on-ramp (intake) + in-memory session + sanity checks**

**Goal:** A calm, one-question-at-a-time intake for a married couple that produces a first answer with zero persistence, validating inputs inline.

**Requirements:** R5 (guided intake), R6 (escape hatch — entry point), R8 (caveated-answer-fast), R19 (sanity checks).

**Dependencies:** Units 1, 2.

**Files:**
- Create: `src/intake/flow.tsx`, `src/intake/questions.ts`, `src/intake/sanity.ts`, `src/store/memoryModel.ts`
- Test: `src/intake/__tests__/sanity.test.ts`, `flow.test.tsx`

**Approach:**
- ~8–10 inputs for a couple: two current ages, two incomes / SS streams + claim ages, household savings, household spending, **per-person retirement target** (couples retire at different times; default both equal). One question per screen, advisor-tone, no wall of forms.
- **Magic-moment-first:** the model lives in `memoryModel.ts` (in-memory); nothing is written to IndexedDB until the user later chooses to Save (hand-off to Unit 2). The first confidence statement renders from memory.
- **R19 sanity (inline, calm):** draw the impossible-vs-dire line — block only true impossibilities (retirement age < current age; SS claim outside 62–70; survivor-spending ratio > 100%); let coherent-but-dire inputs ($0 portfolio + spending) flow to an honest "0 of N". Guard the **monthly-vs-annual 12× footgun** with an implausible-magnitude check.
- "Married couple" is a stated precondition (a one-line framing at the top, not a gating question).

**Patterns to follow:** `useCallback` all handlers passed to step/slider children (`ai-journey-stats/007`).

**Test scenarios:**
- Happy path: complete the ~8–10 question flow → a first confidence statement renders, nothing persisted to IndexedDB.
- Error path (R19): retirement age before current age → caught inline, calm, no broken answer.
- Edge case (R19): spending entered as a monthly figure that's implausible-as-annual → magnitude guard prompts "per month or per year?".
- Edge case: coherent-but-dire ($0 savings, positive spend) → flows through to an honest grim answer, not blocked.
- Edge case: per-person retirement ages differ → both modeled (one income continues while the other stops).
- Integration: no `indexedDB` write occurs during the entire intake (assert the store is untouched until an explicit Save).

**Verification:** A brand-new user reaches a first confidence statement in one short sitting with nothing on disk; every sanity rule fires on its trigger and only its trigger.

---

- [ ] **Unit 4: Colorblind-safe viz primitives (confidence band + two-futures)**

**Goal:** Hand-rolled SVG + `motion` viz primitives — a single-distribution confidence band and a two-series "two futures" overlay — legible on mobile, never chart-heavy, never color-dependent.

**Requirements:** R2 (no color-alone), R10b (two futures legible without chart-soup).

**Dependencies:** Unit 0. (Can build alongside Phase 1; consumed by Units 5 and 7.)

**Files:**
- Create: `src/viz/ConfidenceBand.tsx`, `src/viz/TwoFutures.tsx`, `src/viz/scale.ts`, `src/viz/palette.ts`
- Test: `src/viz/__tests__/colorblind.test.tsx`, `scale.test.ts`

**Approach:**
- Hand-rolled SVG (zero charting-lib dependency — `motion` already in stack; findings/framework research). `motion` animates band draw (`pathLength`) and fan expansion.
- **Colorblind-safe encoding:** distinguish the two futures by **line style** (solid vs dashed) + **direct end-of-line labels** (no color-keyed legend) + **distinct marker shapes** + **luminance** contrast — never red/green. Confidence band as a `<pattern>` hatch or bounded opacity with explicit boundary lines, not a hue-tinted fill.
- Run a `culori` oklab probe over the chosen palette (0.10 floor across deuter/protan/trit) as a permanent dev gate; separate critical pairs by luminance (`burned/051`, `010`).
- Portal any overlay/tooltip to `document.body` (transform-ancestor trap, `burned/013`).

**Patterns to follow:** `burned/docs/insights/051` + `010` (CVD probe), `013` (fixed/portal).

**Test scenarios:**
- Happy path: a distribution renders as a band with the headline number as prominent text.
- Edge case (color-independence): with color stripped to grayscale, the two futures remain distinguishable (line style + labels + shape) — automated check that series identity survives desaturation.
- Edge case: degenerate distributions (all-success, all-fail) render without visual breakage.
- `Test expectation`: the oklab probe is a dev gate, not a unit test, but assert `scale.ts` lerp math at boundaries.

**Verification:** A colorblind viewer (and the grayscale test) can tell the two futures apart and read the verdict without relying on hue; the band reads calm, not like a dashboard chart.

---

- [ ] **Unit 5: Confidence statement surface + six-state outcome system + survivor readout**

**Goal:** The product's face — one plain-language answer, leading with the verdict, handling all six outcome states with honest copy + a non-color signal + a next-action, including a survivor-specific readout.

**Requirements:** R1, R2, R4 (depth on demand), R12 (no directives), R14 (plain not dumbed-down).

**Dependencies:** Units 1, 4 (and 3 for data).

**Files:**
- Create: `src/ui/ConfidenceStatement.tsx`, `src/ui/outcomeStates.ts`, `src/ui/SurvivorReadout.tsx`, `src/ui/verdictSignal.tsx`, `src/ui/copyGuard.ts`
- Test: `src/ui/__tests__/outcomeStates.test.tsx`, `copyGuard.test.ts`, `ConfidenceStatement.test.tsx`

**Approach:**
- **One answer, not a dashboard.** Leads with the verdict in human terms; the range/assumptions/math are reachable on demand but never shown unsolicited (R4).
- **Six states** (roadmap Key Technical Decisions), each with copy + next-action + non-color signal: on-track, borderline, off-track, **indeterminate** (the expected first answer — "too early to tell, here's the range, sharpen to narrow"), over-funded, already-failing. **10/10 rule:** never render a bald 100%.
- Off-track/borderline use the **dollar-adjustment** grammar ("in 4 of 10 futures you'd trim ~$600/month"), never "failure".
- **Survivor readout:** a one-tap disclosure answering "and the survivor?" — honest about money lasting to the *second* death and what the surviving spouse specifically faces (the success criterion).
- `copyGuard.ts`: a string-level lint rejecting directive/forbidden verbs (R12) — shared with Unit 7.
- Non-color signal: verdict **word** + distinct **shape/icon** + **dollar magnitude** as the lead; color redundant only.

**Patterns to follow:** Unit 4 viz; `copyGuard` reused by Unit 7.

**Test scenarios:**
- Happy path: an on-track distribution → relief-toned verdict + on-track signal + appropriate next-action.
- Edge cases (each state): borderline/off-track render the dollar-adjustment (not "failure"); indeterminate renders the "too early, sharpen" copy; over-funded renders spend-more/legacy; already-failing renders "starting now" framing; a computed 100% renders capped, never a bald 10/10.
- Error path (R12): `copyGuard` rejects any string containing "you should" / "we recommend" / "you will save" / "guaranteed" / "optimal" — tested against a fixture of forbidden strings.
- Edge case (color-independence): each state's signal is identifiable in grayscale (word + shape + magnitude).
- Integration: the survivor readout reflects survivor-SS step-down + survivor-spending and differs from the joint headline.

**Verification:** All six states render correct copy/signal/next-action; the copy guard blocks every forbidden verb; the survivor case is honestly surfaced. N=1 cold-read with Briggsy across on-track / borderline / off-track is the human gate.
