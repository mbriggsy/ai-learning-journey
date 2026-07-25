---
title: U17 — Stale-saved-recommendation handling + the aged-surface coupling (build spec)
date: 2026-07-24
status: RATIFIED — council wf_f4ced3c8-2f6, 8/10 high, hawk veto fired + HONORED into the shape
supersedes: plan 4's §U17 prose wherever they conflict
---

# U17 — The Saved Recommendation + The Aged Surface (build spec)

**This document is the executable shape.** It supersedes `docs/plans/4-recommendation.md` §U17 where they
conflict. The verdict it executes is the top row of `docs/council-log.md` (2026-07-24, wf_f4ced3c8-2f6,
23 agents, zero crashes, confidence 8/10 high, `action: execute`).

**The unit's one job:** a saved recommendation is an **executed action**. A stale one must never merely
re-present — its staleness reads *"the action we recommended may no longer be advised."* Everything else
here exists because the aged surface that record lands on is not yet honest.

---

## Two premises already dead — never re-implement them from a body grep

1. **The "inversion" premise is REFUTED against shipped source.** The spine does NOT re-present under
   saved vintage; it ALWAYS recomputes under current rules (`src/store/staleness.ts:17-21`). Byte-identity
   via the persisted seed when no clock fired is what keeps the screenshot promise. U17's real content is
   the **action-warning copy register**, not a re-presentation mechanism.
2. **The "Act-4 `schemaVersion` 3 bump" is counterfactual.** v3 is the shipped forward-written shape
   (`model.ts:1567`; codec `> 3` = newer-version). `savedRecommendation?` lands **additive-optional within
   v3**, presence-keyed, following the `rothConversion` / `savedAt` / `retirementState` precedents
   (`scenarioCodec.ts:508-511` is the pattern to copy).

---

## The spine of the spec

Q1 is **a correctness failure wearing a tone costume**. Five readers stumbled the same three facets, one
grading the pair tension-real in the **optimistic** direction. `bandAnnotations.test.ts:170-184` pins the
current render as intended — **that test is the artifact this unit changes.** A test that pins a defect is
the defect's second copy, not evidence.

Insight 099 is literal here: the **ladder got the guard** (`curveMarks.ts:112-120`), the **band is the
unguarded sibling**. The 2026-07-10 coupling forbids half-patching, so **one exported predicate governs
both**.

---

## S0 — The predicate + the clock rename (substrate, no user surface)

### S0.1 ONE exported arrived predicate

Today the "has this offset already passed?" test is **re-typed** in two places:
`curveMarks.ts:118` (`m.planOffsetYears >= elapsedYears`) and `FuckOffDate.tsx:296-298`
(`heroTrack.offsetYears < elapsedYears`). Export **one** predicate, strict `planOffset < elapsed`, and
consume it from **both** the ladder and the band.

- **Source-bind test (mutation-proven):** assert ONE export and TWO call sites. A re-typed inline compare
  in either consumer fails the test. This is the structural kill of the drift that caused the defect.
- The existing strict-`<` boundary behavior is already pinned on both sides
  (`FuckOffDate.test.tsx:201-206` withdraw, `:208-212` `crown == elapsed` keeps the crown). **Those two
  tests must stay green byte-for-byte** — the predicate extraction is a refactor at that seam, not a
  behavior change.

### S0.2 `elapsedPlanYears` is years-since-BUILT — rename it and prose it

`Result.tsx:127-133` derives the anchor from `startCalendarYear`, which is the plan's **BUILD** year
(written once at `memoryModel.ts:522`, never re-anchored, survives every re-save). Four separate comments
already forbid attributing that quantity to the save (`staleness.ts:26`, `resultSave.ts:91`,
`copy.ts:1594`, `FuckOffDate.tsx:128`) — and the band's `'saved'` label does exactly that.

- **Rename** the field to name what it is (years since the plan was BUILT). Prose every consumer comment to
  *"since you built this plan."*
- **The balance vintage stays on `savedAt`** (`agedBalancesYearFor`, `resultSave.ts:99-109`) — unchanged.
- **Clamp to `[0, horizonYears)`** and **refuse aloud** outside it. A skewed clock refuses; it never
  redraws.

  **PILOT RULING (2026-07-24, dated amendment — the S0 verifier asked for it explicitly):** the two ends
  are **deliberately asymmetric**, and this is the contract, not a builder's reading. The **HIGH end
  throws** (the `resolveBandData` fail-loud-at-the-producer-seam idiom): a plan clock at or past the drawn
  horizon has no honest picture to re-base — every drawn year would be in the past under a wall-Today
  marker that isn't on the chart. The **LOW end clamps to the fresh identity** and does **not** throw: a
  device clock reading behind the build year is a *broken clock, not a household state*, and clamping to 0
  IS the refusal to redraw — no re-base, no claim, the un-anchored picture. Throwing there would crash a
  reader over their own system settings, which is hostile and buys no honesty. Only a **positive** claim
  ("this plan is N years old") can be out of the drawable domain, so only a positive claim can refuse
  aloud. **The low-end clamp must be pinned by an arm that can actually witness it** — a non-integer
  negative, since a negative *integer* is nulled downstream by the `yearsSinceBuilt > 0` gate and so
  passes vacuously (insight 029).
- **The user-visible label follows the rename.** `bandAnnotations.ts:66-82`'s aged arm currently renders
  `bandClockSavedLabel` (`'Your save'`) + `bandClockSavedDesc` (*"When you saved this — ages A and B"*)
  at plan-year 0. On a **re-saver** (built last year, saved five minutes ago) that is **false**, and it
  contradicts the fresh "Saved to this device" badge on the same screen. The label must name the BUILD
  year, not the save.

### S0.3 The test gap this closes (verified, not assumed)

`Result.test.tsx` contains **zero** references to `startCalendarYear`, `elapsedPlanYears`, or `savedAt` —
the seam that chooses the clock for the entire aged surface is **unasserted**. Everything downstream is
well pinned (all four `agedLadderMarks` rails at `curveMarks.test.ts:181-216`; the saved/today swap on
both routes; the sort order with a deliberate red-path witness at `bandAnnotations.test.ts:111-122`; the
strict `<` on both sides) — but **every one of those tests is handed an elapsed value.**

The divergence stayed invisible because **every aged fixture makes the two clocks agree**:
`doctorStaleVault` ages `savedAt` and `startCalendarYear` **together** (`devSeeds.ts:1028-1029`,
deliberately, for save-moment coherence). This is insight 073's class exactly.

- **Required new arm:** a **re-saver** fixture — fresh `savedAt`, old `startCalendarYear` — asserting the
  band's year-0 label names the BUILD year and does **not** claim to be the save, with the
  `agedBalancesYear` clause simultaneously absent (a fresh save has no aged balances). Planted-fail: revert
  the label and it goes red.

---

## S1 — Q2: the Roth echo speaks the calendar year, on READ and WRITE

**Both re-bases are REFUSED** (hawk veto arm 2). `startYearOffset` is unambiguously sim-year-0-indexed and
passes straight into `overlay.conversions` (`model.ts:239-249`, `roth.ts:82-93`). A presentation-only
re-base states a start the engine does not price; a persisted re-base makes the same vault price a
different schedule on a different day.

**The ruling:** speak the **calendar year** — `startCalendarYear + startYearOffset` — on both sides.

- **READ:** `rothPlanEcho` (`copy.ts:1759-1767`) stops saying *"starting in about N years"* and names the
  year. Both render sites re-point in the SAME commit (`AssumptionPanel.tsx:374-382`,
  `RothLever.tsx:172-176`) — insight 086: splitting a copy key orphans every renderer not re-pointed with
  it.
- **WRITE:** the `RothLever` input (`RothLever.tsx:158-164`, labelled *"Starting how many years from
  now"* — wall-time words over a plan-time value) speaks the calendar year too, and **refuses a past
  start** aloud.
- **Suppress when unanchored** (no `startCalendarYear` available) rather than fabricate — the
  how-close-line precedent.
- **Rename** the slot parameter `startYearsFromNow`; it is not years-from-now.
- **File** (do NOT build here): re-anchoring the engine's own conversion semantics.

**Coverage note:** `rothPlanEcho` has **zero** aged coverage today — both its tests run at elapsed 0
(`AssumptionPanel.test.tsx:415-422` compares the slot against its own output, pinning routing not the
sentence; `copyGuard.test.ts:208` is a bare string). **The `RothLever` sheet echo has no assertions of any
kind** (`grep control-plan__echo` → the CSS rule and the JSX, nothing else). Note also that `RothLever`
*does* receive a `savedAnchor` (`:80`, `:82`) but routes it only to `composeTwoFutures` at `:130` — the
echo sentence three lines above never sees it.

> **S1 BUILD STAMP (2026-07-25, commit e4754134 — CI green by explicit id 30136387827).** Shipped as
> specified, with three dated build decisions:
> 1. **"Suppress when unanchored" is satisfied STRUCTURALLY, not by a dead arm:** `savedAnchor` is
>    REQUIRED on both render sites and `startCalendarYear` is a required `ScenarioDraft` field, so the
>    unanchored state is unrepresentable — no suppression code exists to rot untested.
> 2. **The write-side refusal IS the §S0.1 predicate:** a typed calendar year refuses through
>    `offsetHasPassed(year − buildYear, plan clock)` — one strict compare covers both "before the
>    build year" and "already passed"; no second comparator was authored. The refusal renders through
>    the R19 `FieldError` grammar with the earliest startable year QUOTED (`errRothStartPast` joined
>    `SlottedErrorKey`). The fresh default start seeds the WALL year (build + clock), so an aged vault
>    never pre-fills the exact start the write side refuses.
> 3. **`rothPlanStartFor` (bandAnnotations.ts) is the ONE start derivation** — both echo sites and the
>    lever's applied re-seed consume it, source-bind-pinned in `planClockSeam.test.ts`. The verifier
>    lesson applied to my own first cut: the sheet-echo test's `toBe(slots.…)` was the 081 tautology
>    (a tense-arm swap sailed through) — literal tense regexes now pin it. 3 mutants red → reverted.

---

## S2 — Q1: the aged band geometry (the honored veto, made structural)

**Ships together. Never split.**

1. **No future-tense named marker may render left of Today.** Withdraw at the **ARRAY** — so it leaves the
   a11y tree too — **never clamp** (a negative offset handed to the x-scale silently pins to the left edge:
   a fresh lie, the rail `curveMarks.ts:96-111` already names). Surviving markers speak **ONE age base**.
2. **The elapsed fan segment is de-emphasised by a STATIC mask/overlay** nested in the cohort-fade group
   (`ConfidenceBand.tsx:199-226`) — **never a re-trimmed `d`**, which breaks the morph and the
   vertex-snapped scrub. **Non-colour channel PLUS a11y text** (colour is never the only signal).
3. **Clipping is REJECTED** and the reason is load-bearing: a fan clipped to Today reads as a projection
   from a **KNOWN current balance** — which is precisely the optimistic misread. Retain-and-demote keeps
   the build anchor visible and lets the premise be **stated**.
4. **The aged fan ships ONLY with** (a) an adjacent **premise line** naming the balance vintage and (b) a
   **RENDERED re-confirm control** (insight 100 — a copy promise is a UI contract). The residual is
   disclosed as **UNDETERMINED, never "conservative."** **No fold-legal premise line ⇒ the aged fan
   withdraws entirely.**
5. **On a split, the crown names WHICH date** at the marker; the floor/hero arrived idiom is de-mudded —
   one idiom per surface, each naming its date.

### The artifact that changes

`src/ui/__tests__/bandAnnotations.test.ts:170-184` — *"AGED: 'Your save' at 0 + wall-Today at elapsed, the
work-stops marker untouched at its crowned offset"* — currently pins `work-stops` at x=1 with Today at x=2
and reasons that the crowned offset *"stays in PLAN time … its x is calendar-stable."* **Rewrite it to the
new contract.** Do not silently delete it: the replacement carries a comment naming this spec and the
council row, so the next reader sees a decision changed, not a test lost.

> **S2 BUILD STAMP (2026-07-25, same session as S1).** All five arms shipped together, with the dated
> build decisions:
> 1. **The withdraw** generalizes the fresh offset-0 precedent: the marker withdraws when
>    `offsetHasPassed(crown, clock) || crown === clock` (the equality arm is Today's own column —
>    wall-Today already marks it; two named markers would stack). Fresh derivation byte-identical.
> 2. **The mask** is a second static luminance mask NESTED inside the cohort-fade group
>    (`ElapsedDimGroup` — multiplicative compose, no re-trimmed `d`, morph + vertex-snapped scrub
>    intact; the fresh DOM renders NO wrapper at all, byte-identical to pre-U17). The pure stops live
>    beside their cohort sibling (`elapsedFadeStops` + `ELAPSED_DIM = 0.45`, bandGeometry.ts —
>    cold-read-tunable, the ⚑ tint-vs-hatch-vs-rule question rides the arrived walk). The numeric
>    domain gate moved to ONE home (`elapsedYearsWithin`, bandData.ts); ui's `planClockWithin`
>    delegates.
> 3. **The premise + control:** `.band-premise` (result.css, one family home) under BOTH routes' band
>    panes — the OLD-SAVE arm names the `agedBalancesYearFor` vintage, the re-saver reads the
>    build-anchor arm; residual spoken UNDETERMINED. The no-premise ⇒ no-fan law is STRUCTURAL: the
>    resolved memo withdraws the aged fan when no `onReconfirm` route exists (both components), so an
>    aged projection with an unstated premise is unrepresentable. `onReconfirm` routes to the guided
>    re-walk (`onReview`).
> 4. **§S2.5 ruled (pilot, dated):** the arrived idiom is the STRICT three-way split — strictly-past
>    speaks "come and gone" (`dateInYearsPast` retexted; `dateFloorCoveredPast` mirror), exactly-this-
>    year speaks "about now" (`dateInYearsNow` / `dateFloorCoveredNow`, the old text at its one true
>    boundary — agreeing with the ladder's "stopping today" crown), future speaks the anchored count.
>    The old non-strict `<= 0` collapsed "this year" and "three years gone" into one sentence. On a
>    SPLIT the marker names WHICH date (`bandClockWorkStopsSplitLabel` "Essentials date" + its a11y
>    sentence), split-ness derived via `composeDateSplit` — the renderer's own producer.
> 5. **The artifact rewritten**, carrying this spec + the council row; the `BandSavedAnchor →
>    BandPlanClockAnchor` rename landed across all 11 sites. 4 mutant families red → reverted
>    (withdraw dropped · coupling dropped ×2 · mask suppressed · idiom re-collapsed).

---

## S3 — Q3: re-entry, and Q5: the record

### Q3 — the trichotomy

**Re-present the saved recommendation as CURRENT only when ALL THREE hold:**
`solverRunFingerprint` matches **AND** `SOLVER_CODE_VERSION` matches **AND** **no clock fired**.

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
- **INSIGHT 073 IS BINDING HERE (it names U17 by name):** any stamp this payload carries joins
  `scenarioIdentity` (`model.ts:1828-1831`) — or its own normalizer — **in the same commit**, and the
  aged-copy fixture ships with it. Otherwise every identity compare silently becomes a clock compare and
  every same-day test stays green. Enumerate the identity consumers first: `resultSave.ts:48-49` (the two
  compares) and the round-trip guard.
- **Carry into review, do not fix blind:** `resultSave.ts:13-14` justifies its `JSON.stringify` compare
  with *"decodeScenario builds every object."* It does **not** — `scenarioCodec.ts:679` is a validated
  pass-through cast. The behavior is safe today only because `JSON.parse` preserves `encodeScenario`'s
  insertion order. A future reorder breaks dirty-detection silently.

---

## S4 — Q4: the action-warning copy register (exposure-gated naming)

**A clock names itself only where the run was EXPOSED to it.** `staleness.ts:218-254` shows five clocks are
**bare vintage compares** — naming `aca-status` at an all-65+ household is **alarm-when-fine**, insight 101
inverted (a refusal/warning arm must describe the predicate's whole extension, and must not claim exposure
the household never had).

- Ungateable clocks **aggregate** under ONE sentence that is **true of every member** — no names.
- The quiet set (`acaVerifiedOn`, the RMD-age rule) **stays quiet**.
- **Fold-measure the MAXIMAL variant** (insight 097: a copy swap on a fold-law frame is a layout change the
  metrics run alone can see).

---

## S5 — The save gesture goes live

U16 shipped the gesture **absent** with a **reserved inert slot** (`RecommendationSurface.tsx:298-303`,
pinned at `RecommendationSurface.test.tsx:212-224`) and a **no-auto-save pin**
(`solveNoAutoSave.test.ts`). **The gesture and the v3 write land TOGETHER here.**

- The reserved slot becomes the real control; its "layout space only" test is **replaced**, not deleted.
- **The no-auto-save law survives:** saving stays an explicit gesture. Re-point the existing pin rather
  than dropping it.
- **The survivor case is a hard constraint:** `writable()` is false for the recovery-unlocked session
  (`session.ts:305`). A gesture whose commit cannot persist is a lie — the control must refuse honestly in
  that state, never present an inert "saved."

---

## S6 — The plant: `?vault=datearrived`

A **new, stateless** plant for the arrived household — the aged surface's cold read has never had one.

- **Constructibility-probed against `earliestPricedRateYear`** — the spec **opens** with a `validateParams`
  probe, **never a decreed aging depth.** This is insight 085's law: a doctored fixture is a new producer
  of persisted state, and the engine's fail-loud gates are part of its consumer chain. Age only inside the
  domain the engine prices.
- **Required engine-acceptance pin:** hydrate → `buildSpineParams` → `validateParams` accepts → the run
  resolves to a **real** `outcomeState`, never the R19 indeterminate. (Model it on
  `devSeeds.test.ts:500-524`, the `statestale` arm.)
- **Pre-existing gap to close while here:** the `stale` plant (full doctor, spine route) has **no
  engine-acceptance pin** — its `−2y startCalendarYear` aging is the exact mutation that broke `statestale`
  and produced insight 085. Its sibling has the pin; it doesn't. That is the insight-051 tell.
- **Walk both seeds** (`datearrived` + the existing aged plant) in the Caddie walk.
- **File** from the walk: the arrived-walk's state-tax blindness.
- **No fit arm asserts the aged band's x-axis today** — zero `'Your save'` hits anywhere in `e2e/`. The new
  plant's fit arms close that.

---

## S7 — The riders (insight 051 applies: review them as their own unit)

### Q7a — the RecommendationViz endpoint labels: ADMITTED **CONDITIONALLY**

Verified: the bars carry arm **names** at their ends plus the delta hero and the `$0`/ceiling axis frame;
each bar's own dollar value renders **only** in `ariaSummary` (`recommendationView.ts:433-441`,
`copy.ts:2002-2003`). The AT-over-sighted inversion is real and nobody disputed it.

**But** `recommendationView.ts:436-448` carries a **deliberate dialect split** — endpoints are humane
`$X.XM` (`formatAbsoluteDollar`), the delta is grouped digits — safe today only because they never
co-render. Shipping them adjacent under two dialects would print figures that **subtract to something other
than the hero**: a NEW falsehood on the decision surface.

**The gate:** unify the dialect **and DERIVE the displayed delta from the displayed endpoints**, pinned
`rendered_B − rendered_A === rendered_delta` across the full fixture roster, with `ariaSummary` bound to the
same values. **If that gate cannot pass, the rider does not ship** — it defers whole. A failing gate is not
a bug to patch late; it is the rider not shipping.

### Q7b — the pre-flight steer: ADMITTED

**Reorder only.** Existing strings **verbatim**, zero new copy, fold-measured.

### Rider discipline (binding)

Insight 051: a rider folded into a decision-reviewed commit is **unreviewed by construction**. Both riders
get their **own review scope** in the ultramode fold — grep the diff for changes outside the decided scope
and review those as their own unit.

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
(`session.ts:305`), so withholding her answer until she re-confirms strands the reader R17/R18 exist to
protect.

**What would flip it:** the `?vault=datearrived` walk showing a reader treat the aged fan as priced on
today's balances **despite** the premise line and the re-confirm control — or the premise line failing the
fold gate. Either fires the **withdrawal**: the aged fan disappears and the surface renders the re-confirm
invite alone. **Secondary flip (Q5):** any read where a reader quotes the remembered figure as current
drops the record to identity-triple-only.

---

## ⚑ For Briggsy's eye (shipped at high confidence; audits at the Caddie/tape cadence)

The council classified these **yours-to-close** — they ship on the lead pick and go to his eye at the
arrived-vault walk, **not before the build**:

1. **How strongly the elapsed segment is de-emphasised** — tint vs hatch vs rule.
2. **The premise line's wording** (the balance-vintage sentence beside the aged fan).
3. **The de-mudded arrived idiom** — one idiom per surface, each naming its date.

**Scope guard:** the **detail-door era stays a separate post-U16 unit.** Nothing in S2's premise line may
grow into it.
