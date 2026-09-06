---
title: "U16 — Recommendation Surface: build spec"
doc-type: build-spec
status: shipped
created: 2026-07-22
council: wf_8d4c6f65-415 (8/10 RATIFY, execute; hawk veto fired + HONORED into the shape)
supersedes: "docs/plans/4-recommendation.md §Unit 16 where they conflict (each supersession dated); the DEAD-COPY list below is binding"
---

# U16 — The Recommendation Surface (build spec)

> **Provenance.** Pre-build council **wf_8d4c6f65-415** (2026-07-22, full bench, 22/23 agents;
> the security engineer's OPENING crashed at the StructuredOutput cap — a named 019 abstention;
> its REBUTTAL seat completed and affirmatively found no crypto concern in scope. The hawk sat
> both rounds; its veto **fired + was HONORED into the shape** — see §Q1). Verdict: RATIFY 8/10,
> tier council-decided, action execute. The red team landed exactly ONE structural hit, absorbed
> as the §S0 near-tie gate. `docs/council-log.md` top row carries the digest. This spec is the
> executable shape; **it supersedes the plan's §Unit 16 body where they conflict.**
>
> **U16 SHIPPED 2026-07-22** — `6f927862` (S1–S4 + the §S5 deferral), `263b1053` (the live dispatch
> seam, the arc breathing end-to-end) and `30b5ae85` (the ultramode fold: the seed-B inversion guard,
> the re-solve promise, the blocked steer); Caddie pre-walked 2026-07-23 with five chair fixes
> (`docs/caddie/cold-read-log.md`, walk increment 6). The body below records **what was built**,
> section by section. Per-unit build status lives in the roadmap's You-Are-Here table and is never
> re-typed here.

## The spine of the spec (the architect's frame, council-ratified)

**U16 is a DOWNSTREAM RENDERER** (insight 020). It renders the pre-computed structured flags —
`noChange`, `surplusRegime`, the grade (`demotionFired`, `subTenthCollapse`, member margins),
`ShapeDisclosure`, `leaveMoreSkewDisclosure`, `withheldConversionLevers[]`, the named driver —
and **NEVER re-derives** selection / no-change / robustness / skew from displayed seed-B figures.
The held-out A-decides/B-displays split is this surface's CRN — its peer invariant. Every wall
below is a corollary.

**FATAL-IF-VIOLATED walls** (encoded as tests, not conventions):
1. No U16 code re-derives a decision from displayed seed-B figures (render-the-flag + planted-fail guards, burned/070).
2. The interactive tier reduces SEARCH precision only — grades + every displayed figure ALWAYS at `solverMinBPaths`; never down-sampled.
3. The A↔B residual is NEVER a rendered number. Name the baseline, never the residual.
4. The solve channel NEVER emits `data-answer-tier` (`SolveComputeTier` stays on the payload; the fit gate's `final` wait must be unsatisfiable by a solve — `memoryModel` already shipped this and U16 added no tier mirror; `Result.tsx:613` stamps the attribute from the DATE-search tier alone).
5. No inert lying affordance: the save gesture was **ABSENT in U16** — a reserved layout slot only (§S4). U17 §S5 landed the gesture and the v3 write together (2026-07-26/27) into that same reservation, so the slot is live today and the wall did its job: no inert Save ever rendered.
6. A withheld reason renders TRUE and humane, never laundered, never color/opacity-only; unclassified **fails CLOSED**.

---

## S0 — TASK ZERO: the two gates (prerequisites, no user surface)

### S0.1 The reference-device knob-pin

`assertFallbackCalibrated` THREW on the three `-1` sentinels until tuned — the router could not
exist without this. **The gate closed 2026-07-22 on the REFERENCE DEVICE** (Briggsy's real laptop —
this dev machine, 1536×791 @ 2.5dpr; the healthcare-priced worst case reads 1.57s single simulate /
72.4s full solve, 45.9×): all three `fallback.ts` knobs are pinned to sourced MEASURED values with
citation, and `assertFallbackCalibrated` PASSES. No proxy environment was substituted — the standing
rule if one ever is: the citation NAMES the proxy and the entry stays `directionalUntilPinned` until
a real-device confirm.

**The calibration target was RANK-STABILITY, not latency** (hawk + red-team Attack 6, ratified):
the coarse pass can PRUNE the true optimum (`solverCoarseSurvivors` is the pruning-safety knob)
and reduced search paths can re-rank. The knobs are pinned to the measured **winner-cannot-flip**
guarantee (the rankingStability machinery measures it) — a latency-tuned knob that lets
a provisional winner flip on refine is the calm-but-wrong trap.

**The run, its method and its derivations.** The harness is `scripts/calibrate-fallback.ts`; it
drove the SHIPPED `runSearch`→`selectRecommendation` crown (the exact selection U16 renders) at
`tieTolerance 0` — the STRICTEST regime, so the pin is conservative-safe under any looser live
tolerance — over a three-cell battery: the profile worst case (both-regime healthcare, 45y,
8-roster, leave-more), the Q4d NEAR-TIE class with a dense conversion grid (pay-less-tax — the
flip-prone regime that drives the requirement), and the fast known-robust contrast cell. RESULTS:
rung 1000 DIVERGED on BOTH hard cells (W1 crowned pre-tax-first over the true proportional; W2
crowned conversion-20k over the true 30k — the rank-stability requirement is real, not theater);
rungs 2000/4000/8000 matched the 16k truth on every cell, monotone. DERIVATIONS —
**`solverInteractivePaths` = 4000** (smallest all-match rung 2000 + one rung headroom);
**`solverCoarseSurvivors` = 2** (worst truth-position 0 at the pinned rung, +1 position→count,
+1 headroom — a lower bound from this battery, so an S5 build would have to re-prove pruning safety
on its actual coarse-grid design); **`solverCandidateCeiling` = 5** (W1 16k search 27.7s / 8
candidates = 3.47s per candidate across both seed-sets; the ~20s shipped working-route window
anchor → floor(20/3.47) = 5 — full-precision-inside-the-window only fits a 5-roster on this
machine, the measured reality that makes the ladder load-bearing). All three flipped
`directionalUntilPinned` → false with the calibration cited (`src/engine/solver/fallback.ts`), and
the fail-closed guard stays provably-biting through the `assertFallbackCalibratedOver` seam
(a planted −1 per knob drives it red; the control arm proves it non-vacuous).

### S0.2 The near-tie inversion stress-test gate (the red team's absorbed hit)

The runway's item-7 dissent (hawk/fiduciary — the market-model §7 trigger ruling in
`docs/plans/4-recommendation.md`'s council runway) preserves a flip condition
the council must not assume away: **does the difference-keyed grade invert a
conversion-vs-no-conversion ranking under the richer block-bootstrap draw at the 85% near-tie
line?** Recorded here as a **U14/U15 grade-calibration lane gate** — never a U16 assumption.

- Shape: a TEST-ONLY block-bootstrap draw over the historical series (market-model §7's
  mechanism, test-side — NOT the shipped engine draw), re-ranking the conversion near-tie class
  through the shipped search→select path (the 095 shipped-path law).
- **The pre-registered dispositions.** FIRES (ranking inverts) ⇒ the richer draw becomes a HARD
  upstream prerequisite, U16 must not crown a difference-keyed conversion near-tie grade until U14
  re-clears, STOP and re-convene. HOLDS ⇒ the richer-draw deferral stands RATIFIED on the record and
  the demotion valve carries the residual.
- The U16-side valve exists either way: the conversion-near-tie "just do it" DEMOTION is
  engine-enforced and was **re-calibrated post-trend-flip 2026-07-19** (the scale-free
  SE-multiple on Medicare-bearing worlds) — red-team Attack 2's "nobody confirmed recalibration"
  is answered by that dated re-cal.

**THE GATE RAN 2026-07-22 ON THE REFERENCE DEVICE: NO FIRE.** The richer-draw deferral is RATIFIED
on the record; the dissent's flip condition was tested and did not trigger, so both S0 gates were
green before any S3 conversion-grade render landed (the gate order held).

The machinery, all committed: the `_injectedDraws` harness seam (`simulate.ts` — byte-transparent,
identity- and consumer-pinned), `src/engine/validation/blockBootstrap.ts` (moving-block resample of
the committed Shiller 1926–1995 REAL series, standardized in log space — the world keeps its own
marginal level and varies ONLY in temporal shape; longevity draws held verbatim),
`src/engine/validation/nearTieInversion.ts` (the probe + the PRE-REGISTERED fires criterion, fixed
in code before the first run), run full-scale by `scripts/stress-near-tie-inversion.ts` on the Q4d
measured class (16k paths × 12 pre-registered rep seeds, the 30k×3yr-conversion vs conversion-0
pair). RESULTS — control mean advantage **+0.00264** (conversion winner 12/12; reproduces the
recorded class margins 0.0021–0.0041 — the validity check): PRIMARY L=10 bootstrap **+0.00236**
(12/12 positive, SE-of-mean 0.000122, shape penalty +0.00028) — no fire; ROBUSTNESS L=5 **+0.00285**
(12/12, penalty −0.00021, slightly conversion-favorable) — no fire; NULL L=1 permutation **+0.00242**
(12/12, penalty +0.00022) — no fire. The sign never inverted in any of the 36 rep-arms; the L=1 arm's
penalty matching L=10's shows the small residual is mostly empirical-marginal texture, not temporal
shape. One committed-data fact recorded en route: the Shiller ANNUAL real STOCK series carries a
WEAK POSITIVE lag-1 autocorrelation (≈ +0.03), too small to resolve against the known −1/(n−1)
≈ −0.077 finite-sample bias that a 14-year row carries — the bias swamps the signal, so a stock-keyed
persistence assertion would be a coin flip. The persistence witness is therefore the BOND/inflation
channel (the §5 grind), which is strongly persistent; stock is pinned to the shared finite-sample
envelope only. Both arms live in `blockBootstrap.test.ts`'s PERSISTENCE WITNESS case. The
conversion-near-tie demotion remains the
standing valve; the §7 triggers in `docs/decisions/market-model.md` stay live and unchanged.

---

## S1 — Router + invalidation (store substrate; no user surface)

- **ONE worker, queue discipline.** No second worker shipped (bundle + lifecycle cost for a latency
  nicety; the 45.9× ratio makes the fallback LADDER load-bearing, not a second worker).
  Recommend-second makes the ordering structural: the solve DISPATCHES only after the spine
  beat committed, so the spine lane never starves **on the first beat's dispatch ordering**.
  That scoping is load-bearing, because it does NOT hold for a spine recompute dispatched AFTER
  the solve: the worker's `runSolve` is one synchronous call (no yield point anywhere in
  `src/engine/solver`; a cooperative predicate cannot cross the structured clone), so an edit made
  during the 72 s solve the U15 profile measured left its own recompute queued behind a run that
  now described a superseded household — the starvation this bullet named as its own trigger, and
  the landmine U15's spec handed forward. **The fix shipped 2026-09-03 as a SEQUENTIAL worker
  reset** (`engineClient.ts` `createResettableEngine` — terminate + respawn on a fingerprint-moving
  edit during a pending solve, driven from `memoryModel`'s `update()`): never two live workers,
  zero bundle cost. The trade recorded with it: the kill is one-way (an edit that is then reverted
  has still destroyed the run — the household re-invites), judged the lesser sin against minutes of
  a frozen headline. A second worker and per-candidate abort remain deferred-with-trigger, revived
  only if a profile proves the (already-committed-first) spine lane still starves.
- **Invalidation source-binds to `solverRunFingerprint`** — never a bespoke epoch mirror (the
  forked-seam trap). The committed solve arm carries what it solved on; a draft mutation that
  changes the fingerprint demotes the committed rec to a structured **stale/re-solve state**
  ("these inputs changed") — NEVER a stale rec rendered as current, and NEVER an auto-re-solve
  storm (re-solving is invited, like the beat itself). It mirrors the U12 inputs-incomplete
  demotion shape on the solve channel.
- **Abort stayed as U15 shipped it**: coarse per-stage `shouldAbort` + the unconditional
  commit-epoch guard. Per-candidate granularity and the live worker-epoch transport are still
  DEFERRED to a measured trigger.
- The pre-dispatch `blocked` arm stays DISTINCT from the committed withheld payload — two calm
  renders, both naming the true reason (§Q5). The gap vocabulary shipped as
  `SolvePreconditionGap = 'goal-unset' | SolveBlockReason` over `SolveBlockReason = 'no-pretax' |
  'spine-unready'` (`memoryModel.ts:277`, `:282`):
  `goal-unset` steers to the GoalPicker, and the single `buckets-defaulted` gap this spec first
  prescribed became the builder's TYPED refusal `no-pretax` | `spine-unready` landing verbatim as
  the gap, each with its own true note (the steer-seed increment, 2026-07-23, commits `8b9cab61` +
  `0b75740f`). The prescription changed because its premise was false twice over: the old note's
  "one lump sum" household cannot exist (account kinds are mandatory) and its successor was
  falsified on the small-IRA-under-every-rail sibling — insight 101. Blocked builder-refusal states
  are SELF-HEALING on the fixing edit (blocked → idle re-opens the invite; a moved reason re-lands;
  a cleared goal re-lands goal-unset), and both steers are SPOKEN through the persistent live
  region (the synchronous idle→blocked transition never passes through pending). `?seed=steer`
  and the `solve:steer` walk target are the live face.
- `chosenGoal` persistence: NO new write path. The field is shipped (additive-in-v3, unset
  sentinel); it rides the EXISTING explicit re-save ceremony like every other model field —
  in-session until the user saves, never auto-written on pick.

## S2 — The entry surfaces: affordance + GoalPicker + pending

- **The invited affordance** (`.result-recommend-invite`) lives in the doors DOM REGION
  (recommend-second literally true in DOM order: graphs → in-frame disclaimer → doors), rendered
  STATICALLY (no scroll-entrance / IntersectionObserver — engagement bait, R11), no
  badge/pulse/imperative CTA (R12); the `--dur-press` resting press idiom is fine. **Fit posture
  was MEASURED, not decreed** (the advocate's ratified priority): (1) spine content protected
  in-frame > (2) affordance visible in-frame > (3) affordance below the fold as a doors casualty.
  The measurement shipped as fit-gate arms at 1536×791@2.5dpr and 1280×800 over `?seed=retired` +
  `?seed=nc` (`e2e/vertical-fit.spec.ts`): the affordance is the FIRST quiet-row door, so it
  degrades below-fold LAST among the doors, and because it lives inside `.result-quiet-row` — the
  sanctioned below-fold exclusion — spine content is STRUCTURALLY protected whatever the
  affordance's own posture. Both walk seeds measured IN-FRAME. Spine content is never pushed below
  the fold to keep the invitation.
- **The affordance is offered on the all-retired route only** (a recorded v1 deviation):
  `solveInvitable` guards `!isDateRoute(snapshot.draft)` (`Result.tsx:371`), because the
  working/date-route base is the crowned date offset — a follow-up increment. Both fit-gate
  affordance seeds are all-retired, so the measured posture is unregressed.
- **GoalPicker** (`src/intake/GoalPicker.tsx`) joins `sheetShell.css` by ADDING selectors (never
  copying — the named budget-sidecar drift) and REUSES the ControlSheet scaffold's focus contract
  verbatim (capture on open, focus heading, restore on close incl. sheet→sheet, scroll lock,
  reduced-motion slide→fade). `role="dialog"`, real labelled radios, three goals each with a
  one-line gloss. Activating the affordance opens GoalPicker FIRST (the goal precedes the solve);
  unset sentinel, never a silent default; a re-pick VISIBLY re-solves (request-epoch), both futures
  update.
- **Pending** = the shipped thinking-breathe family: `.solve-pending` joined the ONE family list in
  `base.css` (never a second working tell), the `--dur-breathe` 2100ms opacity breath, a
  plain-language what's-happening label through copy.ts — "Working out your strategy — this can
  take a few minutes…", the Caddie chair's naming of the real cost rather than a silent wait (the
  duration phrase is TRUE for the measured 90s–6min full-precision wait, `copy.ts:1555`) —
  `aria-busy` on the panel (the `PendingPanel` grammar) with the label spoken through the surface's
  own persistent `role="status"` / `aria-live="polite"` announcer rather than the panel line, so a
  pending frame that mounts already-pending still announces — clear-after-announce (burned/045),
  placeholder-SHAPED so nothing jumps on land. NO spinner, NO progress %, NO count-up, NO fake ETA.
  Reduced motion drops the breath, keeps the label, final state identical. Solves run FULL
  PRECISION under the breathe; the `.cs-provisional` heartbeat idiom stayed UNWIRED on the solve
  channel when §S5 deferred (it remains the spine's own tag in `ConfidenceStatement.tsx`).

## S3 — The committed beat (the honesty arc — ships TOGETHER, never split)

The hawk's phasing law bound this stage: **every figure shipped in the SAME sub-ship as its
mandatory disclosure.** The committed render handles EVERY payload shape (active rec / no-change /
surplus / withheld / compute-error) — a payload shape without a render is a broken state, and
no-change is a HOT path (oracle cases i/v). The whole render arc landed in `6f927862` (S1–S4 in one
commit) and kept growing inside S3's own scope: `30b5ae85` (the ultramode fold — the seed-B inversion
guard, the re-solve promise, the blocked steer) and the 2026-07-23 median/steer increment
(`8b9cab61` folded by `0b75740f`). The phasing law binds a FIGURE to its disclosure, never a section
to a single commit.

### Q1 — The surplus pivot (the honored veto, made structural)

- **Delta-as-hero.** The headline is the DOLLAR DELTA as a comparative ("keeps ~$X more than
  staying put" register), riding the spine's disclosed directional level. The delta is defensible
  where the level is not: both strategies share the CRN draw, so regime error is common-mode and
  cancels in the comparison (the fiduciary's grounding).
- **The scoped veto, enforced structurally:** "you're safe either way" AND "more than enough"
  never ship as MINTED rec-surface claims. Survival context is **SOURCE-BOUND to the spine's
  rendered confidence object** — the second beat REUSES the spine's rendered statement by
  reference; it never authors a second survival claim (no parity-matched string to desync — the
  U11 six-holes class killed at the root). A source-bind test pins this; require-the-hedge alone
  is NECESSARY BUT NOT SUFFICIENT (it proves a hedge word exists, never level parity).
- **Compose state** (surplus + no-change): a NO-dollar reassurance — "you're already running the
  strongest path we tested" register, the word *already* carrying the relief, the inherited frame
  carrying the honesty. Never a fabricated dollar hero, never "safe either way".
- **ONE `RecommendationGrade` lockup** (`.rec-grade`, `RecommendationSurface.tsx:437`): grade word
  + glyph + delta figure (tabular-nums via money.ts) + the ShapeDisclosure note as a subordinate
  line — one component, one semantic group (`role="group"` + `aria-describedby`), **one crossfade
  key** (the `.cs-swap` / `@starting-style` CSS-only idiom — a separate fade paints a fresh grade
  beside a stale hedge). The shape note renders the pre-composed `composeShapeDisclosure()` output
  (`gradeCalibration.ts:392`) translated to HUMANE language ("these two are so close, treat it as a
  lean, not a lock" register) — never machine phrasing. Not a fold, not a footnote, not one tap
  down.
- **The delta hero's MEDIAN qualification** (the median-advantage increment, 2026-07-23, `8b9cab61`
  folded by `0b75740f`) sits on the same lockup as `rec-grade__note`. It shipped because a mean
  advantage that leans on a few strong futures overstates what the typical household gets: a
  positive display-distinct median names what the TYPICAL future gains (in the delta's own
  `formatDeltaDollar` dialect — one ruler per axis); a MATERIALLY negative median names that the
  typical future gains little or nothing (the optimistic sin is silence here); a sub-step median
  either side of zero takes the same honest "little or nothing" arm; a median that rounds to the
  hero's own figure stays quiet because it adds nothing.
- The "coin-flip" render names WHAT IT HINGES ON from the payload's named driver; a
  `sampling-noise-near-tie` sentinel renders the sampling-framed hinge, never a fabricated cause.

### Q5 — The withheld render (the NC household is Briggsy's own)

- A withheld household sees the REAL, minted, ranked **sequencing-only recommendation** (full value,
  never a stub, never a blank refusal) with the conversion lever's withheld reason named
  ADJACENT in the same lockup: the cause by name, the TRUE reason, the DIRECTION honestly
  ("converting could help or hurt — we won't guess"), and the framing as the tool REFUSING TO
  GUESS — calm-competent, never an error/alarm register, never a red badge, never greyed-only (the
  reason is TEXT in the a11y tree). It shipped and was live-smoked in real Chromium on 2026-07-22
  via `?seed=nc`, whose withheld arm was then the NC **state-certification** hold: the state named,
  the upcoming rates not officially set, the ~August timeframe. The slot survives as
  `recHoldStateCert` (it takes the state name) — but **its "around August" clause was DROPPED with
  the 2026-08-02 pin**, because it promised a month tied to NC's own certification that no longer
  gates anything, and a withhold that names a date it cannot keep is exactly the promise this
  product must not make. A future state's pin event may have any timing, so the shipped slot commits
  to none (`copy.ts:2650`).
- **No live household fires the withheld render today, and that is a CLEARED clause, not a
  regression.** Both blocking clauses cleared after U16 shipped: S.L. 2026-41 § 44.1(a) pinned
  `ncRateSchedule` to an enacted statutory schedule on 2026-08-02, retiring the last directional
  entry on the priced roster (every priced state now mints), and the Medicare-cost-trend clause
  cleared when the trend constant became sourced AND consumed. The render, its copy and every
  `WithheldReason` arm stay wired and tested through the mint's `_pinningOverride` and
  `_trendOverride` seams — the insight-048 law that a clause which CLEARS must grow a seam, or
  deleting its leg stays green forever. The other clauses stay ARMED and need no code change to
  fire: the ACA-freshness clause withholds for any ACA-priced household once
  `acaEnhancedSubsidyStatus.verifiedOn` ages past `solverAcaFreshnessWindowDays` (the same calendar
  `verify:aca` gates), and the ε clause fires on any un-calibrated solver constant. "Nothing fires
  today" is a statement about the calendar and the constants, never about the render being retired.
- **The COUPLING caveat (ratified from the red team's Attack 4):** sequencing and conversion rank
  JOINTLY, so the sequencing-only winner is a coupled sub-solution — the render says "for now /
  may update once conversions certify", never final-locked.
- Register discipline: this is U16's FIRST-solve register ("we're holding off until
  certification") — DISTINCT from U17's "isn't validated on this version yet" re-entry copy.
- Every `WithheldReason` enum arm has its own copy.ts entry (no blank "unavailable"). The enum's five
  arms map one-to-one: `medicare-trend-unsourced` → `recHoldTrend`, `aca-unverified` →
  `recHoldAcaUnverified`, `rec-relevant-primary-directional` → `recHoldPrimaryDirectional`,
  `epsilon-uncalibrated` → `recHoldEpsilon`, `state-certification-pending` → the
  `recHoldStateCert` SLOT; `recHoldGeneric` is the fail-CLOSED humane string an unclassified reason
  lands on (`recommendationView.ts:349`, `:377`). Two further hold strings ship BESIDE the enum, not
  from it: `recHoldCoupling` (the Q5 coupling caveat) and `recHoldDemotionAxis` — the latter added
  2026-08-03 as the Tier-0 crash fix, since a well-funded household whose winner converts used to hit
  `gradeCalibration`'s plain throw and land on the generic compute-error card. It names the shape
  alone ("we can't yet tell how close that call is"), never a near-tie the guard did not measure.

### Q6 — Skew disclosure + the objective≡headline guard

- The MEAN ranks AND displays (contract #4; the S2 intractability ruling stands). When
  `leaveMoreSkewDisclosure` fires, the disclosure rides ADJACENT in the same lockup and **QUOTES
  THE MEDIAN** ("a few very good futures pull the average up — the more typical outcome is closer
  to ~$X"), never a bare "it's skewed", never a second chart, never a second ranking authority
  (insight 093).
- **AT parity (a11y amendment A2):** the viz's `role="img"` `aria-label` sentence carries BOTH arm
  magnitudes AND the delta (`RecommendationViz.tsx:128`, composed by `copy.recVizAria`) — the
  TwoFutures/OddsLadder precedent, so the picture is never the only place a figure lives. The
  median quote, the skew note and every withheld reason are real TEXT in the a11y tree beside the
  lockup rather than folded into that label; scrub stays pointer-only sugar.
- The surface renders no percentile of its own: the survival context is source-bound BY REFERENCE
  to the spine's rendered confidence object (Q1), which is where the `displayTenth`/`xOfTenClamp`
  convention lives (`confidence.ts:66`, `gradeCalibration.ts:93`). Nothing is re-typed.
- **`assertObjectiveMatchesHeadline(payload)`** (`src/engine/solver/objectiveHeadline.ts:132`): a
  PURE exported guard the render path AND a unit test both call — the statistic that RANKED
  (seed-A tier2) ≡ the statistic DISPLAYED (seed-B headline) — with PLANTED-MISMATCH arms proving
  it bites (burned/070). The seed-A selection score NEVER renders, for winner or runner-up.

### Q7 — The baseline nameplate (the dead premise reconciled)

- "Name the active baseline" shipped as a short STATIC label on the no-action figure —
  `copy.recommendBaselineNameplate`, "Compared with your plan today", carried on the view as
  `baselineNameplate` (`recommendationView.ts:243`, `:653`). NO number. The A↔B residual is never
  rendered, quantified, or narrated.

### The rest of S3, and its nets

- **The no-change state**: "already on the best path we found" register, hedged, own calibrated
  grade, runner-up still one tap down. Decided upstream on the A-side selection tolerance —
  U16 renders the flag (wall #1).
- **RunnerUp (R23 floor)**: retained + reachable one tap down as TEXT ("why this beat it") in a
  `<details className="rec-runnerup">` (`RecommendationSurface.tsx:552`); the two-series viz
  richness rides beside it from S4. Stripping the runner-up fails the suite.
- **RecommendationViz** (`src/viz/RecommendationViz.tsx`, lazy-chunked behind `React.lazy`) EXTENDS
  the shipped TwoFutures two-arm grammar, but mapped to what the solve payload actually carries:
  the arms are two TERMINAL goal magnitudes (winner vs no-action baseline, the seed-B headline
  statistic each), not a per-year fan — so it shipped as a two-BAR terminal comparison rather than
  the line pair the grammar's first reading implied, because fabricating a year-by-year median path
  the payload does not hold would be the calm-but-wrong shape. Non-color identity is five-channel:
  FILL TEXTURE (baseline solid, recommended diagonal hatch over its fill), END-MARKER SHAPE (circle
  vs triangle), a DIRECT end-of-bar TEXT label each, ROW position, and luminance (blue vs
  vermilion), with hue redundant and fifth. $0-anchored (a magnitude can never be truncated to
  exaggerate a gap), draws ONCE then morphs on recompute, string-free props from copy.ts, fixed
  viewBox in a fixed-dimension container (no CLS). The delta magnitude — the gap between the bar
  tips — is the non-color hero channel. The 2026-09-05 council `wf_ecbe0ab2-7bb` split the layers:
  the svg draws bars, markers, floor, guides and bracket, while the axis labels, both end-of-bar
  labels and the delta hero are HTML in the chart-text layer, on the type scale.
- **Disclosures adjacent to the delta**: NIIT + (outside the roster) state tax; the SS claim-age
  held-fixed note; the heir bracket on leave-more (plain language); SLCSP/CSR caveats by reference
  when the delta leans on ACA. The compile gate shipped as the surface's OWN closed vocabulary,
  `RecommendationDisclosureId = 'ss-claim-fixed' | 'niit' | 'state-tax' | 'heir-bracket' |
  'aca-slcsp'` (`recommendationView.ts:58`), NOT as seats on the draft-keyed `DRAFT_DISPOSITIONS`
  registry: `heirBracket` and the SS-claim-fixed note are DERIVED solve parameters, not persisted
  `ScenarioDraft` fields, so they cannot ride a gate that keys on `keyof ScenarioDraft`. A new id
  fails `tsc` until its builder and its humane string are authored. Both dispositions render here
  as read-only notes — no inert editing affordance ships on this surface (wall #5). `heirBracket`
  also holds a `row-editable` seat in `assumptionRegistry.ts:127`, and its editor is **NOT inline**:
  it shipped 2026-08-14 as the AssumptionPanel `heir-bracket` seat, on Result.tsx's measured
  67–161px breach and insight 058's one-editor-home rule. `r7-editable` therefore means "an editable
  home exists somewhere", never "render a control right here".
- **copyGuard**: `CONTROL_KEY_PREFIXES` gained `recDelta` · `recSkew` · `recGradeNote` · `recCompose`
  · `recHold` · `recRunnerUp` (S3) and `recDisc` (S3b) — closing the live silent hole where
  require-the-hedge did not bite the new keys. Deliberately NOT a bare `recommend`/`recGrade` sweep:
  the terse GRADE WORDS, the baseline nameplate, the held headings and the calm-unavailable string
  ride `recommend*` = verdict-scoped, and a forced hedge would mush a terse verdict ("A confident
  lean") into weaker copy. Bare enum labels ("just-do-it"/"coin-flip") stay EXEMPT as internal
  identifiers. The Q1 source-bind spine-parity test ships alongside — the prefix fix alone is
  insufficient.
- **`src/viz/__tests__/colorblind.test.tsx` (a11y amendment A1)** closed its own U16 deferral: the
  six verdict silhouettes (`verdictSignal.tsx`) and the three confidence-GRADE silhouettes
  (`GradeSignal.tsx`) are asserted to encode state in SHAPE ONLY and to be pairwise-distinct FORMS,
  proven non-vacuous by a planted duplicate. ConfidenceGrade is the most trust-load-bearing signal
  on the surface: word + distinct shape + aria-label naming the state, never color alone.
- **Dev seeds for the walk**: `?seed=surplus` is the engine-proven over-funded (surplus-regime)
  witness. `?seed=nc` DROVE the withheld render organically until 2026-08-02 and was the face the
  live smoke and the Caddie walk read; with the certification clause cleared it is now
  `ncAffirmation` — the NC-priced household commits a REAL recommendation (`devSeeds.ts:965`,
  end-to-end in `solveDispatch.test.ts`). **No registered seed reaches the withheld render today**,
  so that face has no live walk route: it is exercised through the mint's `_pinningOverride` /
  `_trendOverride` seams and in `RecommendationSurface.test.tsx`, and a state whose rates go
  un-certified again re-arms it organically. **No no-change witness seed ships** — a
  recorded deviation, not an omission: `noChange` is structurally unreachable for a natural live
  household (a beneficial conversion always exists) and `subTenthCollapse` needs full 16k-path
  convergence no registered seed reaches, so the no-change RENDER is covered synthetically in
  `RecommendationSurface.test.tsx`.

## S4 — Comparative depth + the reserved slot

- RunnerUp's two-series viz richness (the winner-vs-runner-up arms of `RecommendationViz`, rendered
  inside the same `<details>` as the "why this beat it" text); goal-repick polish; the honest-limits
  note (R13, calm, invited).
- **The save slot**: RESERVED layout space only (which killed the U17 CLS relayout) — **no live Save
  control shipped in U16**, because a gesture whose commit doesn't persist is a lie and the security
  seat's finding is decisive: `writable()` refuses in the recovery-unlocked/no-vault survivor state,
  so an inert "saved" is data loss at the widow-cliff. The gesture and the v3 write landed TOGETHER
  in **U17 §S5 (2026-07-26/27)** and now mount into that reservation as `RecommendationSaveProp`
  (`RecommendationSurface.tsx:130`); a surface mounted WITHOUT it — the P2/P3 shells, the
  in-isolation unit tests — still renders U16's empty reservation, never a dead Save control. No
  auto-save on solve/close/re-pick, ever (test-pinned, `src/store/__tests__/solveNoAutoSave.test.ts`).
- The un-saved hypothetical lives in memoryModel, freely tunable/abandonable — honest
  session-hold.

## S5 — The interactive tier (GATED — DEFERRED, did not ship)

The gate: only after S0.1's knobs were pinned AND rank-stability was profile-PROVEN would the
coarse→refine two-phase map onto the `.cs-provisional` heartbeat idiom — the provisional sharpening
FIGURES beneath an unchanging winner, a winner-swap on refine forbidden, the interactive→full
refinement carrying `SolveComputeTier` on the payload and never a tier the fit gate can see
(wall #4). If the proof could not be made, S5 would not ship and the full-precision breathe would
stand.

**The proof could not be made. S5 was DEFERRED 2026-07-22 on the reference device**, so S2's
full-precision `.solve-pending` breathe stands and the `.cs-provisional` heartbeat is unwired on
the solve channel. The gate ran its own "attempt the proof first" path (the shipped
`runSearch`→`selectRecommendation` crown at 4000 vs the 16000-path `solverMinBPaths` confirm; the
095 shipped-path law) and returned `deferred` on two independent findings, each sufficient:

**(1) THE FLIP BAND IS PROVABLY NON-EMPTY (measured mechanism).** The interactive tier reduces the
seed-A SEARCH to `solverInteractivePaths` (4000); the selection shrinkage tolerance
(`selectionTieTolerance` = 1.96·SE of the CRN-paired per-path goal difference, `heldOutSeed.ts`)
scales as 1/√n, so the near-tie COLLAPSE band is EXACTLY 2× wider at 4000 than at the 16000-path
confirm — measured directly through the shipped `tier2` / `selectionTieTolerance` /
`survivingAdvantage` primitives on a surplus Medicare world (every row: tol₄ₖ = 2·tol₁₆ₖ, e.g.
$61/$31, $121/$61, $243/$123, $365/$185). A conversion whose advantage lands in `(tol₁₆ₖ, tol₄ₖ)` —
equivalently a CRN t-statistic in (1.96, 3.92) — DISPLACES the prior at full precision (crowned
convert) but COLLAPSES to the prior at the interactive tier (crowned no-change): a prior↔active
WINNER SWAP on refine, at exactly the no-change/act decision boundary. So "NEVER swaps the winner on
refine" is FALSE as a universal guarantee, and the S0.1 pin (one seed, three cells) cannot certify a
universal "never" over the continuous household space. The band is THIN — CRN drives the paired SE
to ~$15–30 so it bites only a near-breakeven conversion (this scan: the committed W2 near-tie held
6/6, and clearly-beneficial conversions held 40/40 at t-stats 115–227) — but thin is not empty, and
thin sits precisely where a calm-but-wrong swap does the most damage.

**(2) THE DEGENERACY (spec-internal, dispositive).** Wall #2 fixes every displayed figure + the
grade at `solverMinBPaths` (16000) in BOTH tiers. So when the winner is stable — the proof's own
promise — the provisional lockup and the final lockup are BYTE-IDENTICAL (same candidate, same
seed-B figures, same 16000 paths): the `.cs-provisional` crossfade would animate NOTHING. There is
no honest "provisional that sharpens FIGURES beneath an unchanging winner" to render — under wall #2
the figures never sharpen; the tier's ONLY non-identical transition is the forbidden swap. The
latency win is modest anyway (the seed-B display + the m-draw grade dominate cost and are fixed at
16000; only the seed-A search drops), so the interactive provisional buys little while adding a
greenfield router + two-phase store dispatch + heartbeat and a residual swap-risk — whereas S2's
full-precision breathe waits honestly and shows nothing until the answer is final. A forced ship is
the failure mode (the council's own S5 gate).

**Standing posture:** the pinned knobs, the fail-closed `assertFallbackCalibrated` guard, and the
`SolveComputeTier` / `CoarseThenRefinePlan` shapes are shipped + tested (`fallback.ts` carries them;
the ladder stays load-bearing in the blocking direction). **Revival trigger:** S5 revives only when
a future profile proves the (already-committed-first) spine lane STARVES *and* a winner-stable,
honestly-renderable provisional design clears this gate — a design that reduces DISPLAY latency
without down-sampling any displayed figure (the thing wall #2 forbids of the current shape).

---

## Cross-cutting laws (all stages)

- **Motion**: transform/opacity/SVG-attribute animation ONLY — no motion@12 `layout`, no
  `<MotionConfig>`, no injected keyframes (the nonce-less CSP kills them). Grade state changes =
  the CSS-only crossfade. Committed/withheld are TERMINAL states: static reveal-fade then hold
  (a breathe there falsely implies "still working"). Invalidation transitions fade; never yank a
  committed lockup. Existing duration/easing tokens only — U16 mints none.
- **CLS**: the grade lockup's longest word+shape holds ONE line at both laptop tiers (measured in
  real Chromium); reserved-tallest-box for any hover readout; fixed-dimension viz container.
- **Fit**: all rec content lives at/below the doors region per S2's measured posture; the fit gate
  grew two arm families for it in `e2e/vertical-fit.spec.ts` — the affordance posture, and the
  pending frame plus the recorded S2→S3 CLS alignment (the reserved `.solve-pending-panel` well must
  align to the real committed `.rec-grade` lockup, and the grade WORD holds ONE line). The
  date-route order contract (doors LAST) needed no new arm: the affordance is a quiet-row child, so
  the existing order checks, which exclude the quiet-row subtree, already cover it.
- **A11y (amendments A1–A6, all binding)**: CVD coverage closed with planted-fail; both arm
  magnitudes and the delta AT-reachable in the viz aria-label and every other disclosed figure real
  text in the tree; withheld reasons as tree TEXT; grade+note one
  semantic group; pending via `aria-live=polite` + `aria-busy` clear-after-announce; GoalPicker
  full dialog contract; the affordance a real ≥24px button with a visible non-color focus ring.
- **Copy**: every string through copy.ts (viz string-free, burned/063); machine flags translated
  humane; hedged-confident, never mealy ("across the futures we tested, this holds up" register);
  clamped vocabulary, tabular-nums; no count-up anywhere. ONE money ruler per axis: the delta and
  its median qualification share `formatDeltaDollar`, and the portfolio LEVELS the sentence compares
  take the absolute dialect that only reaches "$X.XM" above a million — the Caddie chair's fix, so
  a level and a difference are never printed on two rulers in one lockup.
- **Tests**: planted mutants per stage with named killers (the standing discipline); every guard
  proves it BITES (burned/070); source-bind over re-type everywhere a constant/convention crosses
  a file boundary.

## DEAD COPY — never author (binding on every builder)

These phrasings are SUPERSEDED and must never be authored. The list was minted as a
reconcile-before-code condition (the hawk's) against `docs/plans/4-recommendation.md`, which carried
every one of them verbatim in its body — the standing risk being a builder implementing them from a
grep. **That body no longer carries them:** the 2026-09-06 as-built rewrite struck all seven, and
what survives there is the veto record plus the two NEGATIVE uses below. The list stays binding
anyway, because it is a ban on the PHRASINGS, not on one file: the plan is not their only possible
source, and a re-authored line is exactly what it exists to catch.

**⚠️ THE QUOTED PHRASE IS THE ONLY KEY. This list carries no line numbers on purpose.** It was
line-keyed twice and rotted twice — every anchor was stale by exactly +10 until 2026-08-01, and by
+1 again by 2026-09-06 — which is the failure mode a line-keyed list has by construction. Grep the
phrase. Where an entry names where a phrasing SAT in the plan, that is its provenance, not a live
address.

1. **"you're safe either way, and you're already on the best surplus path we found"** — the compose
   ABSOLUTE, in the no-change-recommendation bullet → superseded by S3.Q1's compose state (no-dollar,
   inherited frame).
2. **"you're safe either way; this keeps ~$X more from the IRS"** — in the objective≡headline bullet
   → superseded by the delta-as-hero comparative.
3. The ENTIRE tax-blind→tax-aware reframe paragraph, opening **"Tax-blind→tax-aware reframe,
   inherited from Act 3"** (premise dead, supersession item 2).
4. The test scenario **"Edge case (tax-aware baseline, not the tax-blind spine)"** (same dead
   premise).
5. The test scenario **"Edge case (surplus + no-change compose)"** and its "safe either way" wording.
6. Contract #6's **"you're safe either way; this keeps more from the IRS"** phrasing — the PIVOT
   survives; the absolute does not. *(This entry once misquoted the body as "**it** keeps more from
   the IRS"; under the phrase-as-only-key rule that key greps to zero hits, so the one anchor that
   never drifted was the one that could not be found. Corrected 2026-08-01.)*
7. **ADDED 2026-08-01, never listed before:** the test scenario **"Edge case (surplus pivot)"**,
   whose `("safe either way; keeps ~$X more from the IRS")` is the same absolute. Both prior copies
   of this list stopped one entry short of it.

**NOT dead copy — do not "sweep" these:** the runway's council record that *states* the veto, and
the two bullets (the 10/10-clamp surplus-regime bullet and its surplus-regime edge case) that use the
phrase NEGATIVELY — "no false 'safe either way'" — to describe when the pivot must **not** trip.
Those are correct as written; deleting them would remove the guard.

**The gate is enforced in code, not just here** (2026-08-01): `copyGuard.ts`'s false-certainty list
carries the contracted arms alongside the uncontracted ones (`copyGuard.ts:185`), and `lintCopy`
normalizes the typographic apostrophe before matching, so authoring any of the above reds the build.
`docs/product.md` §6 + R21 — which used to PRESCRIBE the phrase — now carry the veto.

## The dissent (preserved verbatim, with its flip condition)

**hawk + fiduciary (amplified by the red team):** the richer block-bootstrap draw may be a U14
PREREQUISITE, not a deferred tripwire — delta-as-hero crowns the difference-keyed near-tie grade,
which could invert a conversion-vs-no-conversion ranking under the richer draw at the 85%
near-tie line; surfaced calmly, that is the cardinal sin wearing the product's most
differentiated face. **Flip condition:** S0.2 FIRES → the richer draw becomes a hard upstream
prerequisite; U16 must not crown a difference-keyed conversion near-tie grade until U14
re-clears.

**Disposition:** S0.2 ran 2026-07-22 and did NOT fire (36/36 rep-arms conversion-positive), so the
dissent stands unfired on the record rather than open, and the richer-draw deferral is ratified. The
flip condition above is preserved verbatim because it is the re-test the next builder runs if the
market model's §7 triggers move.

## For Briggsy's eye (shipped at high confidence, audited at Caddie/tape cadence)

Two questions were routed to the tape rather than a pre-confirm: the pending-state CHARACTER (the
breathe + label feel over a multi-minute full-precision solve — the §S0.1 profile's 72.4s worst case
was the pre-build estimate; the shipped wait measures 90s–6min), and the reframe's exact TONE (delta-as-hero
wording; the compose state's "already" relief). Both were read on the 2026-07-23 Caddie pre-walk of
the full solve arc — invite → GoalPicker → pending → committed/held → stale, on `solve:nc` and
`solve:surplus` at both viewports — which returned five chair fixes, among them the pending line that
now names the real few-minutes cost. The card and its tape row are in `docs/caddie/`.
