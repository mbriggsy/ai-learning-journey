---
title: "U16 — Recommendation Surface: build spec"
doc-type: build-spec
status: ratified
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

## The spine of the spec (the architect's frame, council-ratified)

**U16 is a DOWNSTREAM RENDERER** (insight 020). It renders the pre-computed structured flags —
`noChange`, `surplusRegime`, the grade (`demotionFired`, `subTenthCollapse`, member margins),
`ShapeDisclosure`, `leaveMoreSkewDisclosure`, `withheldConversionLevers[]`, the named driver —
and **NEVER re-derives** selection / no-change / robustness / skew from displayed seed-B figures.
The held-out A-decides/B-displays split is this surface's CRN — its peer invariant. Every wall
below is a corollary.

**FATAL-IF-VIOLATED walls** (encode as tests, not conventions):
1. No U16 code re-derives a decision from displayed seed-B figures (render-the-flag + planted-fail guards, burned/070).
2. The interactive tier reduces SEARCH precision only — grades + every displayed figure ALWAYS at `solverMinBPaths`; never down-sampled.
3. The A↔B residual is NEVER a rendered number. Name the baseline, never the residual.
4. The solve channel NEVER emits `data-answer-tier` (`SolveComputeTier` stays on the payload; the fit gate's `final` wait must be unsatisfiable by a solve — memoryModel already ships this; U16 must not add a tier mirror).
5. No inert lying affordance: the save gesture is **ABSENT in U16** (reserved layout slot only — §Q8).
6. A withheld reason renders TRUE and humane, never laundered, never color/opacity-only; unclassified **fails CLOSED**.

---

## S0 — TASK ZERO: the two gates (prerequisites, no user surface)

### S0.1 The reference-device knob-pin

`assertFallbackCalibrated` THROWS on the three `-1` sentinels until tuned — the router cannot
exist without this. Run `profileSolve` on the REFERENCE DEVICE (Briggsy's real laptop — this dev
machine, 1536×791 @ 2.5dpr; the healthcare-priced worst case reads 1.57s single simulate /
72.4s full solve, 45.9×) and pin the three `fallback.ts` knobs to sourced MEASURED values with
citation. If a proxy environment is ever substituted, the citation NAMES the proxy and the entry
is `directionalUntilPinned` until a real-device confirm — but the real device is available here;
use it.

**The calibration target is RANK-STABILITY, not latency** (hawk + red-team Attack 6, ratified):
the coarse pass can PRUNE the true optimum (`solverCoarseSurvivors` is the pruning-safety knob)
and reduced search paths can re-rank. Pin the knobs to the measured **winner-cannot-flip**
guarantee (the rankingStability machinery exists to measure it) — a latency-tuned knob that lets
a provisional winner flip on refine is the calm-but-wrong trap.

> **§S0.1 RUN — 2026-07-22, the reference device (the dev laptop IS the reference machine): ALL
> THREE KNOBS PINNED, `assertFallbackCalibrated` now PASSES.** Method: the SHIPPED
> `runSearch`→`selectRecommendation` crown (the exact selection U16 renders) at `tieTolerance 0`
> — the STRICTEST regime, so the pin is conservative-safe under any looser live tolerance — over
> a three-cell battery: the profile worst case (both-regime healthcare, 45y, 8-roster,
> leave-more), the Q4d NEAR-TIE class with a dense conversion grid (pay-less-tax — the flip-prone
> regime that drives the requirement), and the fast known-robust contrast cell. RESULTS: rung
> 1000 DIVERGED on BOTH hard cells (W1 crowned pre-tax-first over the true proportional; W2
> crowned conversion-20k over the true 30k — the rank-stability requirement is real, not
> theater); rungs 2000/4000/8000 matched the 16k truth on every cell, monotone. DERIVATIONS —
> **`solverInteractivePaths` = 4000** (smallest all-match rung 2000 + one rung headroom);
> **`solverCoarseSurvivors` = 2** (worst truth-position 0 at the pinned rung, +1 position→count,
> +1 headroom — a lower bound from this battery; the S5 build re-proves pruning safety on its
> actual coarse-grid design); **`solverCandidateCeiling` = 5** (W1 16k search 27.7s / 8
> candidates = 3.47s per candidate across both seed-sets; the ~20s shipped working-route window
> anchor → floor(20/3.47) = 5 — full-precision-inside-the-window only fits a 5-roster on this
> machine, the measured reality that makes the ladder load-bearing). All three flipped
> `directionalUntilPinned` → false with the calibration cited; the fail-closed guard stays
> provably-biting forever through the new `assertFallbackCalibratedOver` seam (planted −1 per
> knob drives it red, control arm proves non-vacuous). Harness committed:
> `scripts/calibrate-fallback.ts`.

### S0.2 The near-tie inversion stress-test gate (the red team's absorbed hit)

The runway's item-7 dissent (hawk/fiduciary, 4-recommendation.md:25) preserves a flip condition
the council must not assume away: **does the difference-keyed grade invert a
conversion-vs-no-conversion ranking under the richer block-bootstrap draw at the 85% near-tie
line?** Recorded here as a **U14/U15 grade-calibration lane gate** — never a U16 assumption.

- Shape: a TEST-ONLY block-bootstrap draw over the historical series (market-model §7's
  mechanism, test-side — NOT the shipped engine draw), re-ranking the conversion near-tie class
  through the shipped search→select path (the 095 shipped-path law).
- **If it FIRES** (ranking inverts): the richer draw becomes a HARD upstream prerequisite;
  U16 must not crown a difference-keyed conversion near-tie grade until U14 re-clears —
  STOP and re-convene.
- **If it holds**: the richer-draw deferral stands RATIFIED on the record (dated result in this
  spec), and the demotion valve carries the residual.
- The U16-side valve exists either way: the conversion-near-tie "just do it" DEMOTION is
  engine-enforced and was **re-calibrated post-trend-flip 2026-07-19** (the scale-free
  SE-multiple on Medicare-bearing worlds) — red-team Attack 2's "nobody confirmed recalibration"
  is answered by that dated re-cal.

**Gate order:** S0 completes (both gates green, results dated in this spec) before any S3
conversion-grade render lands.

> **§S0.2 RUN — 2026-07-22, the reference device: NO FIRE. The richer-draw deferral is
> RATIFIED on the record; the dissent's flip condition was tested and did not trigger.**
> The machinery: the `_injectedDraws` harness seam (simulate.ts — byte-transparent, identity-
> and consumer-pinned), `blockBootstrap.ts` (moving-block resample of the committed Shiller
> 1926–1995 REAL series, standardized in log space — the world keeps its own marginal level and
> varies ONLY in temporal shape; longevity draws held verbatim), `nearTieInversion.ts` (the
> probe + the PRE-REGISTERED fires criterion, fixed in code before the first run), run full-scale
> by `scripts/stress-near-tie-inversion.ts` on the Q4d measured class (16k paths × 12
> pre-registered rep seeds, the 30k×3yr-conversion vs conversion-0 pair). RESULTS — control
> mean advantage **+0.00264** (conversion winner 12/12; reproduces the recorded class margins
> 0.0021–0.0041 — the validity check): PRIMARY L=10 bootstrap **+0.00236** (12/12 positive,
> SE-of-mean 0.000122, shape penalty +0.00028) — no fire; ROBUSTNESS L=5 **+0.00285** (12/12,
> penalty −0.00021, slightly conversion-favorable) — no fire; NULL L=1 permutation **+0.00242**
> (12/12, penalty +0.00022) — no fire. The sign never inverted in any of the 36 rep-arms; the
> L=1 arm's penalty matching L=10's shows the small residual is mostly empirical-marginal
> texture, not temporal shape. One committed-data fact recorded en route: the Shiller ANNUAL
> real STOCK series carries slightly negative lag-1 autocorrelation, so the persistence witness
> is the BOND/inflation channel (the §5 grind) — pinned in `blockBootstrap.test.ts`. The
> conversion-near-tie demotion (re-calibrated post-trend-flip 2026-07-19) remains the standing
> valve; the §7 triggers in `docs/decisions/market-model.md` stay live and unchanged.

---

## S1 — Router + invalidation (store substrate; no user surface)

- **ONE worker, queue discipline.** No second worker (bundle + lifecycle cost for a latency
  nicety; the 45.9× ratio makes the fallback LADDER load-bearing, not a second worker).
  Recommend-second makes the ordering structural: the solve DISPATCHES only after the spine
  beat committed — the spine lane never starves. Deferred-with-trigger: a second worker /
  per-candidate abort revives only if the profile proves the (already-committed-first) spine
  lane still starves.
  ⚑ **AMENDED 2026-09-03 (ranked item 5, the solve-lane cancel).** The sentence "the spine lane
  never starves" was scoped to the FIRST beat's dispatch ordering and is FALSE for a spine
  recompute dispatched AFTER the solve: the worker's `runSolve` is one synchronous call (no yield
  point anywhere in `src/engine/solver`; a cooperative predicate cannot cross the structured
  clone), so an edit made during the 72 s solve the U15 profile measured leaves its own recompute
  queued behind a run that now describes a superseded household — the starvation this bullet
  named as its own trigger, and the landmine U15's spec handed forward. What shipped honors both
  sentences: **a SEQUENTIAL worker reset** (`engineClient.ts createResettableEngine` —
  terminate + respawn on a fingerprint-moving edit during a pending solve, from `memoryModel`'s
  `update()`), never two live workers and zero bundle cost; the per-candidate abort and the live
  worker-epoch transport stay deferred exactly as below. The trade recorded with it: the kill is
  one-way (an edit that is then reverted has still destroyed the run — the household re-invites),
  which was judged the lesser sin against minutes of a frozen headline.
- **Invalidation source-binds to `solverRunFingerprint`** — never a bespoke epoch mirror (the
  forked-seam trap). The committed solve arm carries what it solved on; a draft mutation that
  changes the fingerprint demotes the committed rec to a structured **stale/re-solve state**
  ("these inputs changed") — NEVER a stale rec rendered as current, and NEVER an auto-re-solve
  storm (re-solving is invited, like the beat itself). Mirror the U12 inputs-incomplete demotion
  shape on the solve channel.
- **Abort stays as shipped**: coarse per-stage `shouldAbort` + the unconditional commit-epoch
  guard. Per-candidate granularity + the live worker-epoch transport stay DEFERRED to a measured
  trigger.
- The pre-dispatch `blocked` arm (goal-unset → GoalPicker steer; buckets-defaulted →
  the RothAccounts mini-intake precondition) stays DISTINCT from the committed withheld payload —
  two calm renders, both naming the true reason (§Q5).
  *(SUPERSEDED 2026-07-23, the steer-seed increment — commits 8b9cab61 + 0b75740f: the one
  `buckets-defaulted` gap became the builder's TYPED refusal `no-pretax` | `spine-unready`
  landing verbatim as the gap, each with its own true note; the old note's "one lump sum"
  household cannot exist (account kinds are mandatory) and its successor was falsified on the
  small-IRA-under-every-rail sibling — insight 101. Blocked builder-refusal states are now
  SELF-HEALING on the fixing edit (blocked → idle re-opens the invite; a moved reason re-lands;
  a cleared goal re-lands goal-unset), and both steers are SPOKEN through the persistent live
  region (the synchronous idle→blocked transition never passes through pending). `?seed=steer`
  + the `solve:steer` walk target are the live face.)*
- `chosenGoal` persistence: NO new write path. The field is shipped (additive-in-v3, unset
  sentinel); it rides the EXISTING explicit re-save ceremony like every other model field —
  in-session until the user saves, never auto-written on pick.

## S2 — The entry surfaces: affordance + GoalPicker + pending

- **The invited affordance** lives in the doors DOM REGION (recommend-second literally true in
  DOM order: graphs → in-frame disclaimer → doors), rendered STATICALLY (no scroll-entrance /
  IntersectionObserver — engagement bait, R11), no badge/pulse/imperative CTA (R12); the
  `--dur-press` resting press idiom is fine. **Fit posture is MEASURED, not decreed** (the
  advocate's ratified priority): (1) spine content protected in-frame > (2) affordance visible
  in-frame > (3) affordance below the fold as a doors casualty. Measure at 1536×791@2.5dpr +
  1280×800 on the walk seeds; the fit gate grows arms for the outcome. Never push spine content
  below the fold to keep the invitation.
- **GoalPicker** joins `sheetShell.css` by ADDING selectors (never copying — the named
  budget-sidecar drift) and REUSES the ControlSheet scaffold's focus contract verbatim (capture
  on open, focus heading, restore on close incl. sheet→sheet, scroll lock, reduced-motion
  slide→fade). `role="dialog"`, real labelled radios, three goals each with a one-line gloss.
  Activating the affordance opens GoalPicker FIRST (the goal precedes the solve); unset sentinel,
  never a silent default; a re-pick VISIBLY re-solves (request-epoch), both futures update.
- **Pending** = the shipped thinking-breathe family: a `.solve-pending` selector joins the ONE
  family list (never a second working tell), 2.1s opacity breath, plain-language what's-happening
  label through copy.ts, `role="status"` + `aria-busy` via the PendingPanel grammar,
  clear-after-announce (burned/045), placeholder-SHAPED so nothing jumps on land. NO spinner, NO
  progress %, NO count-up, NO fake ETA. Reduced motion drops the breath, keeps the label, final
  state identical. Phase-A solves run FULL PRECISION under the breathe; the `.cs-provisional`
  heartbeat idiom is RESERVED for S5 (it may only ever sharpen FIGURES beneath an unchanging
  winner — a provisional→full crossfade NEVER animates a winner swap).

## S3 — The committed beat (the honesty arc — ships TOGETHER, never split)

The hawk's phasing law binds this stage: **every figure ships in the SAME sub-ship as its
mandatory disclosure.** The committed render handles EVERY payload shape from day one (active
rec / no-change / surplus / withheld / compute-error) — a payload shape without a render is a
broken state, and no-change is a HOT path (oracle cases i/v).

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
- **ONE `RecommendationGrade` lockup**: grade word + delta figure (tabular-nums via money.ts) +
  the ShapeDisclosure note as a subordinate line — one component, one semantic group
  (`aria-describedby`), **one crossfade key** (the `.cs-swap` / `@starting-style` CSS-only
  idiom — a separate fade paints a fresh grade beside a stale hedge). The shape note renders the
  pre-composed `composeShapeDisclosure()` output translated to HUMANE language ("these two are so
  close, treat it as a lean, not a lock" register) — never machine phrasing. Not a fold, not a
  footnote, not one tap down.
- The "coin-flip" render names WHAT IT HINGES ON from the payload's named driver; a
  `sampling-noise-near-tie` sentinel renders the sampling-framed hinge, never a fabricated cause.

### Q5 — The withheld render (LIVE TODAY — the NC household is Briggsy's own)

- An NC household sees the REAL, minted, ranked **sequencing-only recommendation** (full value,
  never a stub, never a blank refusal) with the conversion lever's withheld reason named
  ADJACENT in the same lockup: the STATE by name, the TRUE reason (2026 rates not yet officially
  certified), the DIRECTION honestly ("converting could help or hurt depending on that rate — we
  won't guess"), the TIMEFRAME (~August), framed as the tool REFUSING TO GUESS — calm-competent,
  never an error/alarm register, never a red badge, never greyed-only (the reason is TEXT in the
  a11y tree).
- **The COUPLING caveat (ratified from the red team's Attack 4):** sequencing and conversion rank
  JOINTLY, so the sequencing-only winner is a coupled sub-solution — the render says "for now /
  may update once conversions certify", never final-locked.
- Register discipline: this is U16's FIRST-solve register ("we're holding off until
  certification") — DISTINCT from U17's "isn't validated on this version yet" re-entry copy.
- Every `WithheldReason` enum arm gets its own copy.ts entry (no blank "unavailable");
  an UNCLASSIFIED reason fails CLOSED with a humane string.

### Q6 — Skew disclosure + the objective≡headline guard

- The MEAN ranks AND displays (contract #4; the S2 intractability ruling stands). When
  `leaveMoreSkewDisclosure` fires, the disclosure rides ADJACENT in the same lockup and **QUOTES
  THE MEDIAN** ("a few very good futures pull the average up — the more typical outcome is closer
  to ~$X"), never a bare "it's skewed", never a second chart, never a second ranking authority
  (insight 093).
- **AT parity (a11y amendment A2):** every disclosed figure — delta, median, p10, skew direction,
  X-of-10 — is reachable inside the viz `role="img"` `aria-label` sentence (the
  TwoFutures/OddsLadder precedent); scrub stays pointer-only sugar.
- The percentile convention SOURCE-BINDS to confidence.ts (the displayTenth/xOfTenClamp
  precedent) — never re-typed.
- **`assertObjectiveMatchesHeadline(payload)`**: a PURE exported guard the render path AND a unit
  test both call — the statistic that RANKED (seed-A tier2) ≡ the statistic DISPLAYED (seed-B
  headline) — with a PLANTED-MISMATCH arm proving it bites (burned/070). The seed-A selection
  score NEVER renders, for winner or runner-up.

### Q7 — The baseline nameplate (the dead premise reconciled)

- "Name the active baseline" = a short STATIC label on the no-action figure ("compared with your
  plan today" register — which strategy the baseline IS, at the shared spine/rec fidelity). NO
  number. The A↔B residual is never rendered, quantified, or narrated.

### The rest of S3, and its nets

- **The no-change state**: "already on the best path we found" register, hedged, own calibrated
  grade, runner-up still one tap down. Decided upstream on the A-side selection tolerance —
  U16 renders the flag (wall #1).
- **RunnerUp (R23 floor)**: retained + reachable one tap down as TEXT ("why this beat it") in S3;
  the two-series viz richness is S4. Stripping the runner-up fails the suite.
- **RecommendationViz**: EXTENDS the shipped TwoFutures two-arm grammar (with-arm = the
  recommended bundle, without-arm = today's plan; solid/dashed + marker shape + direct end labels
  + luminance-not-hue, $0-anchored, draw-once-then-morph, string-free props from copy.ts,
  lazy-chunked). The delta magnitude is the non-color hero channel.
- **Disclosures adjacent to the delta**: NIIT + (outside the roster) state tax; the SS claim-age
  held-fixed note; the heir bracket on leave-more (plain language, R7-EDITABLE inline); SLCSP/CSR
  caveats by reference when the delta leans on ACA. **R7 registry seats** (compile-enforced):
  `heirBracket` (editable) + `ssClaimAgeHeldFixed` (disclosed note, not editable in U16).
- **copyGuard**: extend `CONTROL_KEY_PREFIXES` with the recommendation/grade prefixes (the
  live silent hole — require-the-hedge does not bite the new keys today); bare enum labels
  ("just-do-it"/"coin-flip") stay EXEMPT as internal identifiers; PLUS the Q1 source-bind
  spine-parity test (the prefix fix alone is insufficient).
- **colorblind.test.tsx (a11y amendment A1)**: close its own U16 deferral — verdict-state
  colors, icon swatches, icon-silhouette pairwise distinctness — WITH a planted-fail arm.
  ConfidenceGrade is the most trust-load-bearing signal on the surface: word + distinct shape +
  aria-label naming the state, never color alone.
- **Dev seeds for the walk**: `?seed=nc` drives the withheld render organically; mint/verify an
  over-funded (surplus-regime) witness and a no-change witness engine-proven per the devSeeds
  discipline (record-before-retune if any drift).

## S4 — Comparative depth + the reserved slot

- RunnerUp's two-series viz richness; goal-repick polish; the honest-limits note (R13, calm,
  invited).
- **The save slot**: RESERVED layout space only (kills the U17 CLS relayout) — **NO live Save
  control ships in U16** (a gesture whose commit doesn't persist is a lie; the security seat's
  finding is decisive: `writable()` refuses in the recovery-unlocked/no-vault survivor state, so
  an inert "saved" is data loss at the widow-cliff). The gesture + the v3 write land TOGETHER in
  U17. No auto-save on solve/close/re-pick, ever (test-pinned).
- The un-saved hypothetical lives in memoryModel, freely tunable/abandonable — honest
  session-hold.

## S5 — The interactive tier (GATED; may defer past U16)

Only after S0.1's knobs are pinned AND rank-stability is profile-PROVEN: the coarse→refine
two-phase maps onto the shipped `.cs-provisional` heartbeat idiom — the provisional sharpens
FIGURES beneath an unchanging winner; a winner-swap on refine is forbidden (if the proof can't be
made, S5 doesn't ship and the full-precision breathe stands). The interactive→full refinement
carries `SolveComputeTier` on the payload — never a tier the fit gate can see (wall #4).

> **§S5 DEFERRAL — 2026-07-22, the reference device: S5 does NOT ship. The clean winner-cannot-flip
> proof CANNOT be made, and under wall #2 the tier is degenerate — so the full-precision breathe
> (S2's `.solve-pending`) STANDS and the `.cs-provisional` heartbeat stays RESERVED + unwired.** The
> gate ran its own "attempt the proof first" path (the shipped `runSearch`→`selectRecommendation`
> crown at 4000 vs the 16000-path `solverMinBPaths` confirm; the 095 shipped-path law), and returned
> `deferred` on two independent findings, each sufficient:
>
> (1) **THE FLIP BAND IS PROVABLY NON-EMPTY (measured mechanism).** The interactive tier reduces the
> seed-A SEARCH to `solverInteractivePaths` (4000); the selection shrinkage tolerance
> (`selectionTieTolerance` = 1.96·SE of the CRN-paired per-path goal difference, heldOutSeed.ts)
> scales as 1/√n, so the near-tie COLLAPSE band is EXACTLY 2× wider at 4000 than at the 16000-path
> confirm — measured directly through the shipped `tier2` / `selectionTieTolerance` /
> `survivingAdvantage` primitives on a surplus Medicare world (every row: tol₄ₖ = 2·tol₁₆ₖ, e.g.
> $61/$31, $121/$61, $243/$123, $365/$185). A conversion whose advantage lands in `(tol₁₆ₖ, tol₄ₖ)`
> — equivalently a CRN t-statistic in (1.96, 3.92) — DISPLACES the prior at full precision (crowned
> convert) but COLLAPSES to the prior at the interactive tier (crowned no-change): a prior↔active
> WINNER SWAP on refine, at exactly the no-change/act decision boundary. So "NEVER swaps the winner
> on refine" is FALSE as a universal guarantee, and the S0.1 pin (one seed, three cells) cannot
> certify a universal "never" over the continuous household space. The band is THIN — CRN drives the
> paired SE to ~$15–30 so it bites only a near-breakeven conversion (this scan: the committed W2
> near-tie held 6/6, and clearly-beneficial conversions held 40/40 at t-stats 115–227) — but thin is
> not empty, and thin sits precisely where a calm-but-wrong swap does the most damage.
>
> (2) **THE DEGENERACY (spec-internal, dispositive).** Wall #2 fixes every displayed figure + the
> grade at `solverMinBPaths` (16000) in BOTH tiers. So when the winner is stable — the proof's own
> promise — the provisional lockup and the final lockup are BYTE-IDENTICAL (same candidate, same
> seed-B figures, same 16000 paths): the `.cs-provisional` crossfade would animate NOTHING. There is
> no honest "provisional that sharpens FIGURES beneath an unchanging winner" to render — under wall
> #2 the figures never sharpen; the tier's ONLY non-identical transition is the forbidden swap. The
> latency win is modest anyway (the seed-B display + the m-draw grade dominate cost and are fixed at
> 16000; only the seed-A search drops), so the interactive provisional buys little while adding a
> greenfield router + two-phase store dispatch + heartbeat and a residual swap-risk — whereas S2's
> full-precision breathe waits honestly and shows nothing until the answer is final. A forced ship is
> the failure mode (the council's own S5 gate).
>
> **Standing posture:** the pinned knobs, the fail-closed `assertFallbackCalibrated` guard, and the
> `SolveComputeTier` / `CoarseThenRefinePlan` shapes remain shipped + tested (`fallback.ts` unchanged;
> the ladder stays load-bearing in the blocking direction). **Revival trigger:** S5 revives only when
> a future profile proves the (already-committed-first) spine lane STARVES *and* a winner-stable,
> honestly-renderable provisional design clears this gate — a design that reduces DISPLAY latency
> without down-sampling any displayed figure (the thing wall #2 forbids of the current shape).

---

## Cross-cutting laws (all stages)

- **Motion**: transform/opacity/SVG-attribute animation ONLY — no motion@12 `layout`, no
  `<MotionConfig>`, no injected keyframes (the nonce-less CSP kills them). Grade state changes =
  the CSS-only crossfade. Committed/withheld are TERMINAL states: static reveal-fade then hold
  (a breathe there falsely implies "still working"). Invalidation transitions fade; never yank a
  committed lockup. Existing duration/easing tokens only — U16 mints none.
- **CLS**: the grade lockup's longest word+shape holds ONE line at both laptop tiers (measured in
  real Chromium); reserved-tallest-box for any hover readout; fixed-dimension viz container.
- **Fit**: all rec content lives at/below the doors region per S2's measured posture; the fit
  gate grows arms for the affordance posture + the pending/committed frames; the date-route order
  contract (doors LAST) holds.
- **A11y (amendments A1–A6, all binding)**: CVD coverage closed with planted-fail; every
  disclosed figure AT-reachable in the aria-label; withheld reasons as tree TEXT; grade+note one
  semantic group; pending via `aria-live=polite` + `aria-busy` clear-after-announce; GoalPicker
  full dialog contract; the affordance a real ≥24px button with a visible non-color focus ring.
- **Copy**: every string through copy.ts (viz string-free, burned/063); machine flags translated
  humane; hedged-confident, never mealy ("across the futures we tested, this holds up" register);
  X-of-10 literal text, clamped vocabulary, tabular-nums; no count-up anywhere.
- **Tests**: planted mutants per stage with named killers (the standing discipline); every guard
  proves it BITES (burned/070); source-bind over re-type everywhere a constant/convention crosses
  a file boundary.

## DEAD COPY — never author (binding on every builder)

The plan body is deliberately un-rewritten; these lines are SUPERSEDED and must never be
implemented from a grep of the body (the hawk's reconcile-before-code condition):

**⚠️ THE QUOTED PHRASE IS THE PRIMARY KEY; THE LINE NUMBER IS ONLY A HINT.** Every anchor below was
stale by exactly +10 until 2026-08-01 (the body shifted; the list did not), which is the failure mode
a line-keyed list has by construction. Grep the phrase, then confirm the line — never the reverse.

1. `4-recommendation.md:232` (was `:222`) — **"you're safe either way, and you're already on the best
   surplus path we found"**, the compose ABSOLUTE → S3.Q1's compose state (no-dollar, inherited frame).
2. `:234` (was `:224`) — **"you're safe either way; this keeps ~$X more from the IRS"** →
   delta-as-hero comparative.
3. `:235` (was `:225`) — the ENTIRE tax-blind→tax-aware reframe paragraph, opening
   **"Tax-blind→tax-aware reframe, inherited from Act 3"** (premise dead, supersession item 2).
4. `:249` (was `:239`) — the test scenario **"Edge case (tax-aware baseline, not the tax-blind
   spine)"** (same dead premise).
5. `:253` (was `:243`) — the test scenario **"Edge case (surplus + no-change compose)"** and its
   "safe either way" wording.
6. Contract #6's (`:52`) **"you're safe either way; this keeps more from the IRS"** phrasing — the
   PIVOT survives; the absolute does not. *(This entry previously misquoted the body as "**it** keeps
   more from the IRS"; under the phrase-as-primary-key rule above that key greps to zero hits, so the
   one anchor that never drifted was the one that could not be found. Corrected 2026-08-01.)*
7. **ADDED 2026-08-01, never listed before:** `:256` — the test scenario **"Edge case (surplus
   pivot)"**, whose `("safe either way; keeps ~$X more from the IRS")` is the same absolute. Both
   prior copies of this list stopped at `:253`.

**NOT dead copy — do not "sweep" these:** `:25` (the council record that *states* the veto), and
`:171` / `:189`, which use the phrase NEGATIVELY ("no false 'safe either way'") to describe when the
pivot must **not** trip. Those are correct as written; deleting them would remove the guard.

**The gate is now enforced in code, not just here** (2026-08-01): `copyGuard.ts`'s false-certainty
clause catches both the contracted and uncontracted forms, so authoring any of the above reds the
build. `docs/product.md` §6 + R21 — which used to PRESCRIBE the phrase — now carry the veto.

## The dissent (preserved verbatim, with its flip condition)

**hawk + fiduciary (amplified by the red team):** the richer block-bootstrap draw may be a U14
PREREQUISITE, not a deferred tripwire — delta-as-hero crowns the difference-keyed near-tie grade,
which could invert a conversion-vs-no-conversion ranking under the richer draw at the 85%
near-tie line; surfaced calmly, that is the cardinal sin wearing the product's most
differentiated face. **Flip condition:** S0.2 FIRES → the richer draw becomes a hard upstream
prerequisite; U16 must not crown a difference-keyed conversion near-tie grade until U14
re-clears.

## ⚑ For Briggsy's eye (shipped-at-high-confidence, audits at Caddie/tape cadence)

1. The pending-state CHARACTER (the breathe + label feel over a ~72s full-precision solve).
2. The reframe's exact TONE (delta-as-hero wording; the compose state's "already" relief).
Both go to the tape, not a pre-confirm.
