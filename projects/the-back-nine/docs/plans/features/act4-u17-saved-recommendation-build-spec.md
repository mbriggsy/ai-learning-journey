---
title: U17 — Stale-saved-recommendation handling + the aged-surface coupling (build spec)
doc-type: build-spec
date: 2026-07-24
status: shipped
note: RATIFIED — council wf_f4ced3c8-2f6, 8/10 high, hawk veto fired + HONORED into the shape; U17 closed at S6 2026-08-02 (S7 deferred by ruling)
supersedes: plan 4's §U17 prose wherever they conflict
---

# U17 — The Saved Recommendation + The Aged Surface (build spec)

**This document is the shape U17 was built to**, and it records what shipped. It supersedes
`docs/plans/4-recommendation.md` §U17 where they conflict. The verdict it executes is the top row of
`docs/council-log.md` (2026-07-24, wf_f4ced3c8-2f6, 23 agents, zero crashes, confidence 8/10 high,
`action: execute`). Stages S0–S6 shipped; U17 closed at S6 on 2026-08-02 and **S7 was deferred by
Briggsy's ruling** (see §S7). Per-unit build status is the roadmap's You-Are-Here table, which is the
authority — it is never re-typed here.

**The unit's one job:** a saved recommendation is an **executed action**. A stale one must never merely
re-present — its staleness reads *"the action we recommended may no longer be advised."* Everything else
here exists because the aged surface that record lands on was not honest before this unit.

---

## Two premises already dead — never re-implement them from a body grep

1. **The "inversion" premise is REFUTED against shipped source.** The spine does NOT re-present under
   saved vintage; it ALWAYS recomputes under current rules (`src/store/staleness.ts:17-21`). Byte-identity
   via the persisted seed when no clock fired is what keeps the screenshot promise. U17's real content is
   the **action-warning copy register**, not a re-presentation mechanism.
2. **The "Act-4 `schemaVersion` 3 bump" is counterfactual.** v3 is the shipped forward-written shape
   (`model.ts:1643-1648`; codec `> 3` = newer-version). `savedRecommendation?` landed **additive-optional
   within v3**, presence-keyed, following the `rothConversion` / `savedAt` / `retirementState` precedents
   (`scenarioCodec.ts:731-734` was the pattern copied).

---

## The spine of the spec

Q1 was **a correctness failure wearing a tone costume**. Five readers stumbled the same three facets, one
grading the pair tension-real in the **optimistic** direction. The band-annotation test then pinned that
render as intended — **that test was the artifact this unit changed** (rewritten in §S2, now
`bandAnnotations.test.ts:218-243`). A test that pins a defect is the defect's second copy, not evidence.

Insight 099 was literal here: the **ladder had the guard** (`curveMarks.ts:112-120`), the **band was the
unguarded sibling**. The 2026-07-10 coupling forbids half-patching, so **one exported predicate governs
both**.

---

## S0 — The predicate + the clock rename (substrate, no user surface)

### S0.1 ONE exported arrived predicate

Before this stage the "has this offset already passed?" test was **re-typed** in two places: the ladder's
`m.planOffsetYears >= elapsedYears` in `curveMarks.ts` and the band's
`heroTrack.offsetYears < elapsedYears` in `FuckOffDate.tsx`. Neither compare exists any more. S0.1 exported
**one** predicate, strict `planOffset < elapsed` — `offsetHasPassed`, defined once at `curveMarks.ts:107` —
and every arrived question in the codebase now calls it: the ladder filter (`curveMarks.ts:143`), the hero
crown-arrived withdraw and the floor arm (`FuckOffDate.tsx:197`, `:232`, `:364`), the band's Roth row
(`bandAnnotations.ts:133`), the work-stops withdraw (`bandAnnotations.ts:341`), `dateTradeoff.ts:53`'s
offer filter — **a third re-typing this spec had not enumerated**, found at build — and §S1's write-side
refusal (`RothLever.tsx:53`).

- **Source-bind test (mutation-proven):** `planClockSeam.test.ts:135` asserts exactly ONE export, and a
  regex per consumer pins each call site by its literal shape (`:137`, `:196-199`, `:213-216`, `:245`,
  `:272`). A re-typed inline compare in any consumer fails the test. This is the structural kill of the
  drift that caused the defect.
- The existing strict-`<` boundary behavior was already pinned on both sides
  (`FuckOffDate.test.tsx:201-206` withdraw, `:208-212` `crown == elapsed` keeps the crown). **Those two
  tests stayed green byte-for-byte** — the predicate extraction was a refactor at that seam, not a
  behavior change.

### S0.2 The plan clock is years-since-BUILT — renamed and prosed

`Result.tsx` derives the anchor from `startCalendarYear`, which is the plan's **BUILD** year (written once
at `memoryModel.ts:565`, never re-anchored, survives every re-save). Four separate comments already forbade
attributing that quantity to the save (`staleness.ts:26`, `resultSave.ts:172`, `copy.ts:2542`,
`FuckOffDate.tsx:148`) — and the band's `'saved'` label did exactly that.

- **Renamed** `elapsedPlanYears` → **`yearsSincePlanBuilt`**, with zero orphans left behind, and every
  consumer comment prosed to *"since you built this plan."* The name now carries the contract at every
  seam it crosses.
- **The balance vintage stays on `savedAt`** (`agedBalancesYearFor`, `resultSave.ts:180-190`) — unchanged.
- **Clamped to `[0, horizonYears)`**, **refusing aloud** outside it. A skewed clock refuses; it never
  redraws. The numeric domain gate has ONE home — `elapsedYearsWithin` in `bandData.ts` (moved there in
  §S2) — and ui's `planClockWithin` (`bandAnnotations.ts:155`) delegates to it rather than re-typing the
  bound.

  **PILOT RULING (2026-07-24, dated amendment — the S0 verifier asked for it explicitly):** the two ends
  are **deliberately asymmetric**, and this is the contract, not a builder's reading. The **HIGH end
  throws** (the `resolveBandData` fail-loud-at-the-producer-seam idiom): a plan clock at or past the drawn
  horizon has no honest picture to re-base — every drawn year would be in the past under a wall-Today
  marker that isn't on the chart. The **LOW end clamps to the fresh identity** and does **not** throw: a
  device clock reading behind the build year is a *broken clock, not a household state*, and clamping to 0
  IS the refusal to redraw — no re-base, no claim, the un-anchored picture. Throwing there would crash a
  reader over their own system settings, which is hostile and buys no honesty. Only a **positive** claim
  ("this plan is N years old") can be out of the drawable domain, so only a positive claim can refuse
  aloud. **The low-end clamp is pinned by an arm that can actually witness it** — a non-integer negative,
  since a negative *integer* is nulled downstream by the `yearsSinceBuilt > 0` gate and so passes
  vacuously (insight 029).
- **The user-visible label followed the rename.** `bandAnnotations.ts`'s aged arm used to render
  `bandClockSavedLabel` (`'Your save'`) + `bandClockSavedDesc` (*"When you saved this — ages A and B"*)
  at plan-year 0. On a **re-saver** (built last year, saved five minutes ago) that is **false**, and it
  contradicts the fresh "Saved to this device" badge on the same screen. The key is now
  `bandClockBuiltLabel` — **`'Plan built'`** (`copy.ts:612`, rendered at `bandAnnotations.ts:169`) — with
  `bandClockBuiltDesc` naming the BUILD year and the ages at that year. **Both renderers moved in the same
  change** (insight 086): the annotation arm and `twoFuturesChrome.ts:202-204`'s today-label, which picks
  the built label over `bandClockTodayLabel` exactly when the plan clock is positive.

### S0.3 The test gap this closed (verified, not assumed)

`Result.test.tsx` contained **zero** references to `startCalendarYear`, `elapsedPlanYears`, or `savedAt` —
the seam that chooses the clock for the entire aged surface was **unasserted**. Everything downstream was
well pinned (all four `agedLadderMarks` rails at `curveMarks.test.ts:181-216`; the saved/today swap on
both routes; the sort order with a deliberate red-path witness at `bandAnnotations.test.ts:158-169`; the
strict `<` on both sides) — but
**every one of those tests was handed an elapsed value.**

The divergence stayed invisible because **every aged fixture made the two clocks agree**:
`doctorStaleVault` ages `savedAt` and `startCalendarYear` **together** (deliberately, for save-moment
coherence). This is insight 073's class exactly.

The stage shipped the arm that witnesses the divergence: a **re-saver** fixture — fresh `savedAt`, old
`startCalendarYear` — asserting the band's year-0 label names the BUILD year and does **not** claim to be
the save, with the `agedBalancesYear` clause simultaneously absent (a fresh save has no aged balances).
Revert the label and it goes red. The whole seam now lives in one file, `src/ui/__tests__/planClockSeam.test.ts`.

**Shipped 2026-07-24, commit `102416af`.** The verifier failed the first cut TWICE and was right both
times, and both lessons are why the arms above read the way they do: the seam test had COPIED the mint
under a comment claiming it matched `Result.tsx` (planting `+3` left the whole suite green — a test that
re-derives its subject measures itself), and the low-end clamp arm never exercised the clamp it named,
because only a NON-INTEGER negative routes differently (insight 029).

---

## S1 — Q2: the Roth echo speaks the calendar year, on READ and WRITE

**Both re-bases are REFUSED** (hawk veto arm 2). `startYearOffset` is unambiguously sim-year-0-indexed and
passes straight into `overlay.conversions` (`model.ts:239-249`, `roth.ts:82-93`). A presentation-only
re-base states a start the engine does not price; a persisted re-base makes the same vault price a
different schedule on a different day.

**The ruling:** speak the **calendar year** — `startCalendarYear + startYearOffset` — on both sides.
Shipped 2026-07-25, commit `e4754134`, CI green by explicit run id 30136387827.

- **READ:** `rothPlanEcho` no longer says *"starting in about N years"*; it names the year, and carries a
  `passed` flag so the sentence's tense matches. Both render sites re-pointed in the SAME commit
  (`AssumptionPanel.tsx:502`, `RothLever.tsx:245`) — insight 086: splitting a copy key orphans every
  renderer not re-pointed with it.
- **WRITE:** the `RothLever` input, once labelled *"Starting how many years from now"* — wall-time words
  over a plan-time value — takes the calendar year, and **refuses a past start** aloud. **The refusal IS
  the §S0.1 predicate:** a typed calendar year refuses through
  `offsetHasPassed(year − startCalendarYear, yearsSincePlanBuilt)` (`RothLever.tsx:51-53`) — one strict
  compare covers both "before the build year" and "already passed", and no second comparator was
  authored. It renders through the R19 `FieldError` grammar with the earliest startable year QUOTED
  (`errRothStartPast`, `RothLever.tsx:221`, joined `SlottedErrorKey` at `copy.ts:1775`). The fresh default
  start seeds the WALL year (build + clock), so an aged vault never pre-fills the exact start the write
  side refuses.
- **"Suppress when unanchored" was satisfied STRUCTURALLY, not by a dead arm.** `savedAnchor` is REQUIRED
  on both render sites (`BandPlanClockAnchor`, `AssumptionPanel.tsx:88`) and `startCalendarYear` is a
  required `ScenarioDraft` field, so the unanchored state is unrepresentable — no suppression code exists
  to rot untested. The how-close-line precedent still governs anywhere a value genuinely can go missing.
- **The slot parameter `startYearsFromNow` is gone**; it was not years-from-now.
- **`rothPlanStartFor` (`bandAnnotations.ts`) is the ONE start derivation** — both echo sites and the
  lever's applied re-seed consume it, source-bind-pinned in `planClockSeam.test.ts`.
- **Filed, deliberately not built here:** re-anchoring the engine's own conversion semantics. It is open
  in `docs/backlog.md` ("Mid-flight Roth conversion: engine re-anchoring unit"), where the arms and the
  one-way-door cost are stated.

**The coverage hole this closed.** `rothPlanEcho` had **zero** aged coverage: both its tests ran at
elapsed 0, one comparing the slot against its own output — pinning routing, not the sentence — and the
other a bare string in the copy guard (`copyGuard.test.ts:502`). **The `RothLever` sheet echo had no assertions of any kind**, and
while `RothLever` did receive a `savedAnchor`, it routed it only to `composeTwoFutures`; the echo sentence
three lines above never saw it. The same verifier lesson landed on this stage's own first cut: the
sheet-echo test's `toBe(slots.…)` was the insight-081 tautology and a tense-arm swap sailed through it, so
literal tense regexes pin it now. Three mutants red → reverted.

---

## S2 — Q1: the aged band geometry (the honored veto, made structural)

**Shipped together, never split** — all five arms in one change, 2026-07-25, the same session as S1.

1. **No future-tense named marker renders left of Today.** The marker withdraws at the **ARRAY** — so it
   leaves the a11y tree too — and is **never clamped** (a negative offset handed to the x-scale silently
   pins to the left edge: a fresh lie, the rail `curveMarks.ts:116-121` already names). Surviving markers
   speak **ONE age base**. The withdraw generalizes the fresh offset-0 precedent: it fires when
   `offsetHasPassed(crown, clock) || crown === clock` (`bandAnnotations.ts:341`), the equality arm being
   Today's own column — wall-Today already marks it, and two named markers would stack. The fresh
   derivation is byte-identical to pre-U17.
2. **The elapsed fan segment is de-emphasised by a STATIC mask** — `ElapsedDimGroup`, a second static
   luminance mask NESTED inside the cohort-fade group (`ConfidenceBand.tsx:344`, `:382`), composing
   multiplicatively. **Never a re-trimmed `d`**, which would break the morph and the vertex-snapped scrub;
   the fresh DOM renders NO wrapper at all. **Non-colour channel PLUS a11y text** (colour is never the
   only signal). The pure stops live beside their cohort sibling — `elapsedFadeStops` and
   `ELAPSED_DIM = 0.45` in `bandGeometry.ts:271-285` — deliberately cold-read-tunable, because the
   tint-vs-hatch-vs-rule strength was Briggsy's to close at the arrived walk.
3. **Clipping is REJECTED** and the reason is load-bearing: a fan clipped to Today reads as a projection
   from a **KNOWN current balance** — which is precisely the optimistic misread. Retain-and-demote keeps
   the build anchor visible and lets the premise be **stated**.
4. **The aged fan ships ONLY with** (a) an adjacent **premise line** naming the balance vintage and (b) a
   **RENDERED re-confirm control** (insight 100 — a copy promise is a UI contract). The residual is
   disclosed as **UNDETERMINED, never "conservative."** Both ship as `.band-premise` (`result.css:229`,
   one family home) under BOTH routes' band panes — `ConfidenceStatement.tsx:386-393` and
   `FuckOffDate.tsx:471-481`; the OLD-SAVE arm names the `agedBalancesYearFor` vintage and the re-saver
   reads the build-anchor arm. **No premise line ⇒ no aged fan, and that law is STRUCTURAL:** the resolved
   memo withdraws the aged fan when no `onReconfirm` route exists (`ConfidenceStatement.tsx:263`, and its
   twin in `FuckOffDate`), so an aged projection with an unstated premise is unrepresentable. `onReconfirm`
   routes to the guided re-walk (`onReview`).
5. **On a split, the crown names WHICH date** at the marker — `bandClockWorkStopsSplitLabel`,
   *'Essentials date'* (`copy.ts:593`, selected at `bandAnnotations.ts:350`) — with its own a11y sentence.
   **§S2.5, ruled by the pilot at build:** the arrived idiom is the STRICT three-way split. Strictly-past
   speaks "come and gone" (`dateInYearsPast`, with `dateFloorCoveredPast` as its floor mirror);
   exactly-this-year speaks "about now" (`dateInYearsNow` / `dateFloorCoveredNow` — the old text kept at
   its one true boundary, agreeing with the ladder's "stopping today" crown); future speaks the anchored
   count. The old non-strict `<= 0` had collapsed "this year" and "three years gone" into one sentence.
   The three-way branch reads at `FuckOffDate.tsx:197-200` (hero) and `:232-236` (floor).

**One clause of arm 5 was superseded after U17 closed, and the reason is worth keeping.** Split-ness was
originally derived from
`composeDateSplit(...).kind === 'split'` — the renderer's own producer. The **2026-07-30 band flip**
(`8d4d4e58`, council wf_457f0930-dba) made that derivation wrong: a both-dated household is still
`'split'`, but its band now rides the LIFESTYLE crown, so the old question answered `true` and painted
"Essentials date" onto a marker sitting at the lifestyle year. The name now reads the band's own published
track — `band.track === 'floor'` (`answerView.ts:145`), the same authority tag the offset one line below
already reads. The lesson is insight 081 in its sharper form, and it is recorded in that file: the old code
DID consume the shared producer and was still wrong, because it asked that producer a question about
split-ness when the thing it needed to know was which track the band drew.

### The artifact that changed

`src/ui/__tests__/bandAnnotations.test.ts` carried an arm — *"AGED: 'Your save' at 0 + wall-Today at
elapsed, the work-stops marker untouched at its crowned offset"* — that pinned `work-stops` at x=1 with
Today at x=2 and reasoned that the crowned offset *"stays in PLAN time … its x is calendar-stable."* That
is the render the five readers stumbled on. It was **rewritten to the new contract**, not deleted:
`bandAnnotations.test.ts:218-243` now asserts that a passed crowned offset WITHDRAWS at the array, and its
comment names this spec and the council row, so the next reader sees a decision changed rather than a test
lost.

The `BandSavedAnchor → BandPlanClockAnchor` rename landed across all 11 sites in the same change. Four
mutant families went red and were reverted: withdraw dropped, coupling dropped twice, mask suppressed,
idiom re-collapsed.

---

## S3 — Q3: re-entry, and Q5: the record

### Q3 — the trichotomy

**The saved recommendation is re-presented as CURRENT only when ALL THREE hold:**
`solverRunFingerprint` matches **AND** `SOLVER_CODE_VERSION` matches **AND** **no clock fired**. The rule
lives in `src/store/savedRecommendation.ts`, whose `deriveSavedRecommendationStatus` is the one place it is
written down; it is PURE — the caller injects `todayEpochDay` and the freshly-built fingerprint (or `null`),
so every arm is table-testable.

The third conjunct is the red team's hit, conceded in source: `solverRunFingerprint.ts:31-34` **excludes**
`consumedConstantEntries` — it is **constant-blind by design**. A bare fingerprint match would re-present a
saved conversion under superseded brackets *with a proof attached*.

Otherwise: the **action-warning record** + an **invited re-open that names its cost** (the solve is
multi-minute — U16 measured 45.9× a single simulate). **Never auto-re-solve.**

### Q5 — what the record carries

Identifying triple (goal + candidate + fingerprint) **+ `SOLVER_CODE_VERSION` + `savedAt` + an ENUMERATED
era-stamped remembered verdict**, rendered **only inside the record card** (never hoisted into the live
headline, where it would read as current).

- **Atomic, presence-keyed, fail-closed but NON-FATAL:** a corrupt/unknown record **drops the atom and
  keeps the model**. A saved plan must never become unopenable because its recommendation record went bad.
- **INSIGHT 073 IS BINDING HERE (it names U17 by name):** any stamp this payload carries joins the
  scenario-identity compare — or its own normalizer — **in the same commit**, and the aged-copy fixture
  ships with it. Otherwise every identity compare silently becomes a clock compare and every same-day test
  stays green. The identity consumers were enumerated first: `resultSave.ts`'s two compares and the
  round-trip guard.
- **The `JSON.stringify` accident was removed, not documented.** `resultSave.ts` justified its compare with
  *"decodeScenario builds every object."* It does **not** — `scenarioCodec.ts:938-940` is a validated
  pass-through cast, and the behavior was safe only because `JSON.parse` preserves `encodeScenario`'s
  insertion order, so a future field reorder would have broken dirty-detection silently. The fix is
  `scenarioIdentityKey` (`model.ts:2185`), which rebuilds plain objects with SORTED keys and throws on a
  non-serializable value, so key order and absent-vs-undefined can never read as a change.

**Shipped 2026-07-25, commit `374299c9`, CI green by explicit run id 30163571502**, carrying one ruling
this spec had been silent on — and it is the reason the stage is correct. `scenarioFromDraft` re-mints all
five vintage stamps at EVERY save, so a plan re-saved after a bracket change reads "no clock fired" while
its remembered verdict was priced under superseded rules. `savedRecommendation.ts` therefore snapshots the
record's OWN era and runs the SAME `deriveStaleness` against it: one comparator, two subjects, with the
overlay typed `Required<Pick<…>>` so dropping a key is a TS2741 compile failure rather than a silent gap.
All five era fields are REQUIRED on the record. The scenario's absent-is-quiet contract has a real
population — a pre-U13 vault predates the stamps — but a record born at U17 does not, so applying the same
rule here would fail OPEN, reading `rulesMoved:false` forever. The remembered verdict is ENUMERATED, never
a remembered dollar. Four adversarial seats found six real defects in the first build, the fail-open era
caught independently by two of them; twelve mutant families went red and were restored.

---

## S4 — Q4: exposure-gated clock naming (the copy register moved to S5)

**A clock names itself only where the run was EXPOSED to it.** Before this stage, five of `staleness.ts`'s
clocks were **bare vintage compares** — so naming `aca-status` at an all-65+ household was
**alarm-when-fine**, insight 101 inverted (a refusal/warning arm must describe the predicate's whole
extension, and must not claim exposure the household never had). No clock is a bare vintage compare any
more: exposure is **INJECTED** from the run's own built params through the ui layer's
`src/ui/stalenessExposure.ts` — six reads,
six producers, never one derived from another — and the range that region of `staleness.ts` once held is now
the gate's own type, `ExposureRead` (`'priced' | 'unpriced' | 'unknown'`) and `StalenessExposure`.

- **`'priced'` names the clock and raises `rulesMoved`; `'unpriced'` is SILENT** (the recompute is
  byte-identical); **`'unknown'` aggregates** under ONE sentence that is **true of every member** — no
  names. `'unknown'` is reserved for the genuinely undecidable case, never a convenience default: a caller
  that guesses there manufactures a nameless line out of nothing.
- The quiet set (`acaVerifiedOn`, the RMD-age rule) **stays quiet**.
- The MAXIMAL variant was **fold-measured** (insight 097: a copy swap on a fold-law frame is a layout change
  the metrics run alone can see).

**Shipped 2026-07-25, commits `0c2fe6cb` plus the flake fix `bd4ebcf8`, CI green by explicit run id
30170575831 — and the stage's content turned out to be a SHIPPED DEFECT, not a prospective register.** The
scout proved the record card could not render at all: nothing called the trichotomy, no seed carried a
record, no fit arm covered it. Authoring its copy here would have been dead code, so **the copy register
moved to S5** (see below) — the one promise in this spec that did not survive contact, and the reason this
heading now names only the exposure gate. What the stage found instead was live: `reentryChrome` was
pushing ONE healthcare line off the
OR-collapse of all seven clocks, and an all-65+ household takes the Medicare-only branch, ships no
`enrolledPremium`, and can never open the engine's ACA gate — it prices ZERO ACA and was being told
"Health-coverage rules have been updated." That was never only copy: `healthcare.moved` fed `rulesMoved`,
which feeds both hero echoes AND S3's third conjunct, so the same falsehood would have DEMOTED a still-valid
saved recommendation.

**The pilot's own governing rule was wrong and a verifier caught it.** The first rule — "no run-layer reader
⇒ aggregate" — would have shipped a SILENT STALE on the 2028 IRMAA re-index while fixing a false alarm.
Insight 103 records the general form: a rule written to kill an over-alarm must be checked in the SILENCING
direction.

---

## S5 — The save gesture goes live

U16 shipped the gesture **absent** with a **reserved inert slot** and a **no-auto-save pin**
(`solveNoAutoSave.test.ts`). **The gesture and the v3 write landed TOGETHER here**, across
`173c4997` · `c68afc5e` · `15c5d64c` · `ec87622d` · `a7eaf074` · `4753b08f` on 2026-07-26/27, every one
CI-green by explicit run id, against the fourteen steps of
`docs/plans/features/act4-u17-s5-execution-plan.md`. That plan was rebuilt TWICE under adversarial review
before any code was written (v1 five P0s, v2 two P0s, four lenses all `holds=false`).

- The reserved slot became the real control — the five save arms in ONE reserved box
  (`RecommendationSurface.tsx:598-613`); the U16 "layout space only" test was **replaced**, not deleted.
- **The no-auto-save law survived:** saving stays an explicit gesture, and the existing pin was re-pointed
  rather than dropped (`solveNoAutoSave.test.ts` plus the new `recSaveNoAutoWrite.test.tsx`).
- **Every save arm is a claim the disk can back.** `RecommendationSaveView` is a closed union —
  `none` (no claim either way, never a silent "not saved"), `offer` (carrying `route: 'ceremony' | 'update'`
  so the hint discloses what the tap escalates to BEFORE the tap), `saving`, `saved` (the only arm that
  asserts a completed save), and `refused`. A promised affordance that did not complete owes a rendered
  outcome (insight 100), which is why `refused` exists at all.

**The survivor case was a hard constraint**, and it is what shaped the refusal set: the recovery-unlocked
session cannot persist, and a gesture whose commit cannot persist is a lie. **`writable()` is not the seam**
— it is a module-PRIVATE closure (`session.ts:304`) absent from the `VaultSession` interface, so the UI
cannot call it, and `save()`'s `{ ok:false, reason:'not-writable' }` (`session.ts:597`) is a last-resort
backstop rather than a gate. The two non-writable states are detected separately:

- **recovery-unlocked survivor** → `session.status() === 'recovery-unlocked'` (`IntakeApp.tsx:436-444`).
  `recoveryUnlock` clears `passphraseWrapCurrent` and returns a bare `{ ok: true }`; `RecoveryUnlockResult`
  carries **no** `readOnly`, so `deriveResultSave`'s read-only parameter does not cover this state.
- **read-only second tab** → the existing `UnlockResult.readOnly`, already threaded into
  `deriveResultSave(persist, ready, readOnly)` (`resultSave.ts:101`).

`RecommendationSaveRefusal` is therefore the three-arm enum `'record-invalid' | 'write' | 'recovery-locked'`,
each with its own heading and body (`copy.ts:1397-1406`). The recovery arm's name is deliberately **not**
`…Survivor…`: `copyGuard.ts`'s `isSurvivorKey` is a `/survivor/i` SUBSTRING net feeding `isMortalityKey`, so
that spelling would have silently enrolled a plumbing key in the mortality-lexicon gate and made its guard
arm pass for the wrong reason.

### What S3 and S4 handed this stage

S3 built the whole substrate and S4 deliberately declined the copy; both created obligations the stage's
original thirteen lines could not name.

**The copy register landed here, not in S4** (see S4 for why). It shipped as two families — the save
GESTURE (`recommendSave*`) and the saved-record CARD (`recommendRecord*`), `copy.ts:1368-1493` — modelled on
`recommendStale{Heading,Body,ReopenCta}` and on `RecommendationSurface.tsx:372-379`'s render shape, the
`role="status"` card with heading, body and re-open button. `recommendRecordReopenCost` names the re-open's
cost the way the pending label does: *"This can take a few minutes."* Exactly one key in either family may
claim a completed save, and it is `recommendSaveSavedBadge`.

**Key PREFIX picks the copyGuard gates, and that is why these two families exist as they do.**
`staleness*` and `reentry*` are hedge-, verdict- AND control-EXEMPT by documented law — the weakest net in
the catalog — so a new warning register needs its own explicit guard arm. The arms live in the TEST file
(`copyGuard.test.ts`: the `staleness*` register at `:226-298`, the S5 families at `:318-362`), **not** in
`copyGuard.ts`: there is nothing named `staleness`, `reentry` or `recommendRecord` in the gate SOURCE at
all, so grepping `copyGuard.ts` for those returns zero hits and must never be read as "already handled." The
lists a key is measured against are `VERDICT_KEY_PREFIXES` (`copyGuard.ts:63-65`) and
`CONTROL_KEY_PREFIXES` (`:102-116`) — and `recommendSave*`/`recommendRecord*` fall under the `recommend`
verdict prefix, unlike `staleness*`, so they clear the scoped gates rather than being exempt from them.

**The four mint obligations**, all discharged in `src/store/savedRecommendationMint.ts`:

1. `validateSavedRecommendation` (`scenarioCodec.ts:682`) is called BEFORE the record touches the draft
   (`savedRecommendationMint.ts:141`) — the SAME validator the decode path runs, never a parallel copy. It
   had ZERO product callers before this stage.
2. A non-empty `droppedAtoms` at the gesture **refuses aloud** and never reports a saved recommendation
   (insight 100 — the gesture promised an affordance, so it owes a rendered outcome).
3. `noDollarRegister` is **COPIED from the composed view, never re-derived record-side**
   (`savedRecommendationMint.ts:89`, `:100`, `:133`). The reachable register is
   `RecommendedView.mode === 'no-change'` (`recommendationView.ts:223`, assigned `:646`), NOT the
   module-local `noDollar` const at `:616`.
4. The `fingerprint` has no type bind and cannot get one — `solverRunFingerprint.ts:61` is a bare
   `export type … = string` — so the bind is a TEST: mint from a REAL `solverRunFingerprint(...)` call,
   encode, decode, and assert the trichotomy reads `current`.

**Two things about this stage were described wrongly before it was built, and both corrections are
load-bearing.**

- **S5 does not DEFINE a second fingerprint computation.** `memoryModel.ts` already had
  `fingerprintOf`/`currentDraftFingerprint` in exactly the `SolverRunFingerprint | null` shape the
  trichotomy wants, and explicitly bans a re-typed subset. But that did not mean "no seam work here": both
  were private closures inside `createMemoryModel` and **neither was on the returned surface**, so the
  stage's seam work was **EXPOSING `currentDraftFingerprint()` on `MemoryModel`** (`memoryModel.ts:402`,
  returned at `:942`, derived at `:668`) — not re-deriving it. The committed `SolveAnswer.fingerprint` is
  the MINT basis, *not* the trichotomy's fresh fingerprint.
- **The mint is NOT independent of the plan-save machine.** The record participates in the dirty/clean
  compare (`resultSave.test.ts` pins it by name), so it had to be sequenced against it. But **"a mint
  NECESSARILY flips `deriveResultSave` to `'dirty'`" is FALSE for the exact case obligation 1 exists to
  prevent.** `scenarioFromDraft` runs the candidate through `decodeScenario(encodeScenario(…))`; the codec
  DELETES an invalid record; `deriveResultSave` then compares two POST-codec operands — a disk scenario with
  no record against a live scenario whose record was just dropped. **Those are identical, so an invalid mint
  reads CLEAN.** The dirty flip holds only for a VALID record, and it is never evidence the mint landed.

**The record card's copy is injected, not read from `copy.ts` directly** — the one place
`recommendationSaveView.ts` departs from the step spec, and deliberately. `SavedRecordCopy` types the
cause clauses as `Record<SavedRecommendationSupersededCause, string>`, which is EXHAUSTIVE: the day the
store adds a fifth supersession cause, the assembly site fails to compile rather than the composer silently
emitting a card with a missing clause — insight 029's shape applied to copy. `SavedRecordStanding` is a
discriminated pair so "still holds" and "here is why it doesn't" can neither co-exist nor both go missing,
and the `superseded` marker is a non-colour signal that stands on its own with ZERO clauses beneath it,
because the fail-closed split can legitimately produce an empty cause list.

**The record card's placement is Briggsy's 2026-07-26 ruling on measured numbers:** it sits BELOW the
protected in-frame R13 disclaimer. The caveat bottoms at 701px in a 791px frame on both plants, and the
tallest producible card moves it zero pixels. Two dev plants carry records — `?vault=rec` (holds) and
`?vault=recold` (superseded).

**One sweep in `session.ts` is done:** a comment there once claimed `scenarioFromDraft` "REFUSES on a
non-empty [dropped-atom] list." It does not — `scenarioFromDraft.ts:115` returns `ready:true`, and
`draftFromScenario.test.ts:556` pins that a dropped atom never refuses the whole save. The comment now states
the opposite explicitly, matching the recovery-path twin that never repeated the error.

**S5's residue was swept 2026-07-27:** `d5d77191` (insight 084's Caddie schema caps, the binding
prerequisite before any walk), `ee7d0307` (three mis-cited pointers), `b985d0c3` (the two mutants that
survived S5's review, both now planted-red and restored), `f74065cc` (the phone CLS at 390×844 — a per-tier
reservation, and the phone joined the fit reservation loop), and `a5ae2a2a` (the S6 probe). The sweep opened
with a 22-agent queue audit whose finding was procedural and worth keeping: of eleven claims **none was
substantively false, but six of eleven PRESCRIPTIONS were wrong** — a prescription does not inherit trust
from its diagnosis.

---

## S6 — The plant: `?vault=datearrived`

A **new, stateless** plant for the arrived household — the aged surface's cold read had never had one.
**Built, walked and carded 2026-07-27**, closing U17.

- **Constructibility-probed against `earliestPricedRateYear`** — the stage **opened** with a
  `validateParams` probe, **never a decreed aging depth.** This is insight 085's law: a doctored fixture is
  a new producer of persisted state, and the engine's fail-loud gates are part of its consumer chain. Age
  only inside the domain the engine prices. The probe settled the plant as `base: 'dip'`, aging depth 6
  (`ARRIVED_PLAN_YEARS` at `devSeeds.ts:1284`, registry entry `:1620`, doctor `doctorArrivedVault`
  at `:1331`).
- **The engine-acceptance pin ships:** hydrate → `buildSpineParams` → `validateParams` accepts → the run
  resolves to a **real** `outcomeState`, never the R19 indeterminate. It was modelled on the `statestale`
  arm at `devSeeds.test.ts:636-660`, whose rationale comment is `:587-597`.
- **Two corrections to the probe that specced this plant**, both caught by opening source rather than
  trusting the filing. (1) It lights **ONE** arrived arm, not two: the floor crowns at 0 and `floorLineText`
  short-circuits offset 0 before the three-way split (`FuckOffDate.tsx:226`), so `dateFloorCoveredPast`
  never fires here and keeps `?vault=datestale` as its only live route. (2) Aging `startCalendarYear` alone
  breaks the documented `currentAge === startCalendarYear − birthYear` model invariant (`model.ts:98`) and
  forks the engine's two birth-year reads, so `doctorArrivedVault` ages `birthYear` in step (the
  pre-aging invariant guard, `devSeeds.ts:1343-1350`) and refuses a priced-state base aloud (`:1334`).
  The crowns measured byte-identical either way, so
  the coherent household was free.
- **The pre-existing `stale`-plant gap is closed.** Its `−2y startCalendarYear` aging is the exact mutation
  that broke `statestale` and produced insight 085, and its sibling had the unit pin while it did not — the
  insight-051 tell. The flat claim "no engine-acceptance pin" was overstated: two witnesses already existed,
  `e2e/vertical-fit.spec.ts` driving `?vault=stale` through a real unlock and asserting `assertResolvedSpine`
  (which requires `.confidence-reveal[data-twopane]`, emitted only when the run resolves), and
  `devSeeds.test.ts:303-320` running the SAME doctor's output through `runDateSearch`, which calls
  `validateParams` internally, on the `datestale` base. The real gap was the missing FAST
  `buildSpineParams → validateParams → runEngine → outcomeState` unit arm on the spine path — what
  `devSeeds.test.ts:1010-1018`'s own header asked for, failing "HERE (fast) instead of only in the 90-second
  Chromium run." That arm now exists at `devSeeds.test.ts:1080-1120`, and writing it **surfaced a live
  defect**: the doctored build year forks the derived birth year across the RMD band edge, forcing the
  household into RMDs two years early. It is pinned as found and filed.
- **Both seeds were walked** (`datearrived` plus the existing aged plant) in the Caddie walk, and
  `datearrived` joined the door walk (`e2e/caddie-walk.spec.ts:972-997`) — without that allowlist entry the
  one plant this stage exists to cold-read would have been chaired on its landing alone.
- **The walk hard-flagged all six faces and NOTHING shipped from it** (`docs/caddie/cold-read-log.md`,
  2026-07-27) — three carrying **calm-but-wrong BLOCKERS**, the class the batched-oracle grant has never
  covered. They are **pre-existing product defects, not S6 regressions**: the stage's value was the
  *looking*, and its own deliverable was the plant that finally made them visible. Four of the six were
  fixed 2026-07-30/31 (the Roth door calling an executed conversion a typo, `d8f35d8c`; the lever refusal
  denying a date the same screen plots, `72d638d9`; the premise line contradicting its own axis,
  `d5e7b466`; and the band flip onto the lifestyle crown, `8d4d4e58`). A fifth followed: **Cards 6–7's
  record-card verb is closed too** — the showing-verb was replaced 2026-07-31 (`532cad82`; `copy.ts:1482`
  now reads "It may no longer fit the two of you.", with a standing prohibition on ever restoring it at
  `copy.ts:1453-1460`), and the false "still matches" holds line 2026-08-03 (`bd851f24`; `copy.ts:1445`).
  Card 1's two-odds collision remains open, as does the OTHER half of Cards 6–7 — naming the strategy on
  the holds face, Briggsy's own ruling, carried in the register as "The saved-record card does not name
  the strategy".
- **Filed from the walk:** the arrived-walk's state-tax blindness.
- **The aged band's x-axis has its first real-browser arm.** Before S6 no fit arm asserted it — the aged
  axis appeared nowhere in `e2e/`, so §S0's rename had shipped on unit arms alone. `?vault=datearrived` is
  now driven at `e2e/vertical-fit.spec.ts:1543-1647`, asserting that the year-0 endpoint names the BUILD
  year (`'Plan built'`, `:1607-1612`) and that no named marker renders left of Today — neither the plain
  label nor the split one, since the array picks between them (`:1616-1626`). Both are mutation-proven, and
  the withdrawal mutant draws
  "Essentials date" to the LEFT of "Today" — the exact stumble §S2's hawk veto killed.
- **The saved recommendation took its first trip through real WebCrypto and IndexedDB** here.

---

## S7 — The riders: DEFERRED, and U17 closed at S6

**Briggsy ruled 2026-07-27: close U17 at S6 and re-file Q7a as its own unit.** Neither rider was buildable
as the council admitted it, and the reasons are the material the re-filed unit starts from. Both are open in
`docs/backlog.md` under "U17 S7 riders."

### Q7a — the RecommendationViz endpoint labels: admitted conditionally, then **filed on a false premise**

Verified at council time: the bars carry arm **names** at their ends plus the delta hero and the
`$0`/ceiling axis frame; each bar's own dollar value renders **only** in `ariaSummary`
(`recommendationView.ts:681-687`, `copy.ts:2677`). The
AT-over-sighted inversion is real and nobody disputed it.

The admission was gated on a **deliberate dialect split** in `recommendationView.ts` — endpoints humane
`$X.XM` (`formatAbsoluteDollar`), the delta grouped digits — held safe "because they never co-render."
**That premise is false:** they co-render in `ariaSummary`, and visibly above $1M. Worse, the naive fix the
gate implies prints "about $0" on a real $18,000 delta. So the gate as written cannot be met, and the
council's own rule applies: a failing gate is not a bug to patch late, it is the rider not shipping.

The gate the re-filed unit still owes is the right one — unify the dialect **and DERIVE the displayed delta
from the displayed endpoints**, pinned `rendered_B − rendered_A === rendered_delta` across the full fixture
roster, with `ariaSummary` bound to the same values — but it must be re-specified against the true
co-render behavior first.

### Q7b — the pre-flight steer: admitted, **unspecified**

Admitted as a **reorder only** — existing strings verbatim, zero new copy, fold-measured. But its whole spec
is that one line, and no document names what it reorders. Not buildable as filed; the spec must be amended
before it is built.

### Rider discipline (binding, and it still applies to the re-filed unit)

Insight 051: a rider folded into a decision-reviewed commit is **unreviewed by construction**. Each rider
gets its **own review scope** in the ultramode fold — grep the diff for changes outside the decided scope and
review those as their own unit.

---

## Cross-cutting laws (all stages)

- **The cardinal rule.** Calm-but-wrong is the sin. Friends bet real retirement money on this with *less*
  protection than a commercial tool.
- **Insight 073** — a non-deterministic field entering a compared payload turns every identity compare into
  a clock compare; normalizer + aged fixture in the SAME commit.
- **Insight 085** — every vault doctor needs an engine-acceptance pin; age only within the priced domain.
- **Insight 099** — the guarded sibling indicts the unguarded primary; a display gate keys on the
  **displayed** quantity.
- **Insight 100** — a copy string that promises an affordance is a UI contract: pair every promise verb
  with a rendered-control test.
- **Insight 101** — a refusal/warning arm's copy describes the predicate's **whole extension**, never its
  poster child.
- **Insight 086** — splitting a copy key orphans every renderer not re-pointed in the same commit.
- **Suppression over fabrication** everywhere a value is unavailable.
- **The one-frame fit law** (`pnpm verify:fit`) and **colour is never the only signal**.
- Every gate green **by the pilot's own hand** before "done," and **CI checked by explicit run id.**

---

## DEAD COPY — never author (inherited from U16, binding)

- The **"safe either way"** and **"more than enough"** absolutes.
- The dead **tax-blind reframe**.
- **New for U17:** never call the aged fan's residual **"conservative."** Only its WIDTH is conservative;
  its LOCATION is **undetermined**. Never print a future-tense claim about a date that has passed.

---

## The dissent (preserved verbatim, with its flip condition)

> Fixing how the elapsed segment is DRAWN does not make the aged band honest. Under every proposed arm the
> surviving fan is a simulated distribution rolled forward from build-era balances and ages, now labelled
> 'Today' — and clipping it to Today makes it read as a projection from a KNOWN current balance. Only its
> width is conservative; its location is undetermined and optimistic for any household that overspent or
> ate a drawdown. The one honest arm nobody ruled: refuse the headline projection until balances are
> re-confirmed.

**Who:** red team, conceded by honesty-hawk, architect, craftsman and fiduciary-advisor; **opposed** by the
security engineer on survivor-stranding grounds — `writable()` is false for the recovery-unlocked session
(`session.ts:304`), so withholding her answer until she re-confirms strands the reader R17/R18 exist to
protect.

**What would flip it:** the `?vault=datearrived` walk showing a reader treat the aged fan as priced on
today's balances **despite** the premise line and the re-confirm control — or the premise line failing the
fold gate. Either fires the **withdrawal**: the aged fan disappears and the surface renders the re-confirm
invite alone. **Secondary flip (Q5):** any read where a reader quotes the remembered figure as current
drops the record to identity-triple-only.

**The walk ran 2026-07-27 (panel wf_efc3968f-cf5, 140 agents) and the flip did not fire — but it came
close, and for a reason the dissent did not anticipate.** The premise line did not fail the fold gate and no
reader read the fan as priced on today's balances *because of* the fan. What the panel found instead was
that the premise line contradicted its own axis: it said *"Where today sits on it is undetermined until you
re-confirm"* while the chart drew and labelled a Today tick at ages 63 and 63, and readers trusted the tick
over the sentence — **the rosy direction**, making the six-year modeled segment read as lived history. That
was fixed 2026-07-30 (`d5e7b466`), the sentence no longer calling a calendar position unknown while the axis
labels it. The panel also flagged, without carding it as a verdict, that the elapsed segment is carried by
**opacity alone**: the legend names three encodings while the plot draws five, the ghosted elapsed band and
median have no key, and in grayscale the elapsed wedge reads as a fourth unexplained band. The one genuinely
new signal this unit introduced — *"these years already happened"* — is the one with no text channel. That
is a live colour-is-the-only-signal breach against the project's own law, and it is open.

---

## ⚑ For Briggsy's eye — the three tone calls, and what the walk said about them

The council classified these **yours-to-close**: they shipped on the lead pick and went to his eye at the
arrived-vault walk, not before the build. The 2026-07-27 panel's answers are advisory — his eye still owns
all three, and the mechanism is fit-pinned either way.

1. **How strongly the elapsed segment is de-emphasised** — tint vs hatch vs rule. Shipped as a tint
   (`ELAPSED_DIM = 0.45`). The panel read it as well calibrated — pale, with a hard step and a dashed rule
   at Today, surviving every colour-vision arm — but named the opposite failure as the live risk: faint
   enough that its left edge reads as a real historical balance.
2. **The premise line's wording** (the balance-vintage sentence beside the aged fan). The panel found the
   wording sound and the contradiction with its own axis to be the actual defect — since fixed. See the
   dissent section above.
3. **The de-mudded arrived idiom** — one idiom per surface, each naming its date. It **lands**: multiple
   lenses called *"penciled the fuck-off date around 2025 — that year has already come and gone"* warm,
   hedged and blameless.

**A fourth call the walk surfaced, still his:** the **withdrawn work-stops marker reads MISSING, not
restrained.** The headline names 2025 in 44px type while the axis carries no 2025 mark at all, so the reader
must derive that the date sits between two age ticks. §S2's hawk veto forbade a **future-tense named marker
left of Today** — it did not require silence, and a PAST-TENSE mark remains available within the veto.

**Scope guard:** the **detail-door era stays a separate post-U16 unit.** Nothing in S2's premise line may
grow into it.
