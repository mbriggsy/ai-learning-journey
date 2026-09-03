# The Back Nine — Open Backlog

> The complete open register: **42 open items** (48 entries, 6 closed and kept as records) consolidated
> from **136 raw obligations** (a source audit of the shipped code + a salvage sweep of the 246 KB
> `TODO.md` archive it replaced). Every raw obligation is accounted for — the `ids` on each entry are its
> provenance.
>
> **Re-anchored 2026-08-02** by a 17-agent audit that opened every cited line rather than trusting it.
> One entry CLOSED by primary source (NC rate certification), one CLOSED AS PHANTOM (the date-route ACA
> clock), two entries RETITLED because the filed claim was false, and **four filed prescriptions marked
> DO-NOT-EXECUTE** — they would each have introduced a new defect. The measured hit rate on filed
> prescriptions in this repo is ~25–40%; budget accordingly and open the lines first.
>
> **Re-verified 2026-08-03** by an 18-agent double-blind pass — 9 verifiers, each shadowed by a skeptic
> whose only job was to refute it. **5 of 9 verifiers were themselves refuted on material points**, so
> treat a lone confident audit as a draft. One entry CLOSED and shipped (`12d2bb6e`, the priced-state
> disclosure — the filed prescription had overstated it as an engine+wire job when the value was already
> one component up), **three NEW entries filed** (the baseline nameplate that names a plan the household
> never chose; NC's declining rate schedule; `verify:fit`'s blindness to the recommendation surface), and
> two re-sized on evidence (the mixed-household healthcare item `L`→`XL` — the defective household IS the
> flagship `?seed=date` fixture; account balances `S`→`M`).
>
> ⚠️ **PARTIALLY STALE AS OF 2026-08-03 — READ THIS BEFORE RE-OPENING ANYTHING BELOW.** A second
> double-blind pass (16 agents, 8 verify→skeptic pairs; **7 of 8 verifiers refuted on material points**)
> shipped four Tier-0 fixes that entries below still describe as open. **Closed, with `TODO.md` carrying
> the full post-refutation reasoning:**
> - **the baseline nameplate** (the hero measured against a plan the household never chose) — `2652b7a6`.
>   NOT the fork this register files it as: `plans/4-recommendation.md:166,:190` had already ratified
>   `current→recommended`, so it was a regression. Also **de-blocks** the "recommendation never says what
>   to DO" entry, which is now the next build.
> - **the record card's "still matches your plan"** — `bd851f24`.
> - **the ACA record's inert prose** — `a436caee`. It was **seven** undeclared fields, not just
>   `adjacentButSharp`.
> - **the health sheet's "benchmark premium" false negation** — `bd851f24`.
>
> Also corrected: the "widening the state roster bricks every saved vault" blocker is **FALSE**, and its
> prescribed remedy would have re-opened the hole `stateTax.ts:421-25` was minted to close. And the heir
> entry (`:370`) still asserts present-tense a clause the XS half removed on 2026-08-02.
>
> **Anchors throughout this file are pre-2026-08-03 and have drifted** — open every cited line.
>
> **This file is the register, not the queue.** The ranked next-actions live in [`TODO.md`](../TODO.md).
> Tiers are by worst consequence, never by size — the cardinal rule is that calm-but-wrong is the sin.
>
> `A*` ids came from the code audit, `S*` ids from the archive sweep. Both are on record in the session
> transcript; an entry with several ids was filed several times under different wording.

## Tier 0 — calm-but-wrong (shipped code can answer WRONG)

### ~~The assumptions panel's monthly/yearly help line contradicts itself~~ — **CLOSED 2026-08-03**

`S` · **pilot** · filed 2× — `A35`, `S7`

- Card 10(a) — the assumptions panel's unit toggle contradicts itself in one sentence, and the contradiction runs 12×
- Door 4's month/year sentence still owed a rewording
- ✅ **FIXED.** `assumptionPeriodHelp` now reads *"This sets the unit, not the money. Your plan keeps
  running on the same yearly spending — the figure here just shows as one month's worth or a full year's.
  With "Each month" showing, a number you type is read as dollars a month."* Both halves are named: the
  committed money is unchanged AND the next figure entered is read in the chosen unit.
- **Reproduced live before and after** (`?seed=retired` → assumptions panel, 1536×791): flipping the
  toggle moves the spend field **6,500 → 78,000** while the verdict holds at "On track — 9 of 10". The
  killed sentence claimed *"switching this never changes the amount"* while the reader watched that jump.
- **A SECOND, WORSE DEFECT WAS FOUND AND FIXED WITH IT.** `AssumptionPanel.tsx` justified permanently
  disarming the 12× force-confirm with *"the 12× misentry the rule guards is structurally impossible on
  this surface."* **False** — the toggle only re-labels, but the panel's own spend commit (`:507`)
  multiplies by 12 under `'month'`, so the misentry is entirely possible and the re-label INVITES it. The
  disarm still holds on its first clause alone; re-arming would not have caught this case anyway (the
  dangerous figure lands under `SPEND_AMBIGUOUS_MIN`, `sanity.ts:74`). **The copy is the defense here,
  not the rule** — which is why the string is now pinned.
- Pinned by a two-armed drift-pin (`copyGuard.test.ts`): an inertness-claim ban and an anti-anaphora
  anchor requiring the toggle's own visible label be quoted. Each arm mutation-proven against its own
  regression (the killed line reds the first; the *"read the same way"* draft reds the second).
- ⚑ **The anti-anaphora arm exists because of a cold-read stumble, not a theory.** A draft ending
  *"…and anything you enter next is read the same way"* was true but made the reader resolve a pointer;
  Briggsy stopped to ask what it referred to. That IS the force-the-reader-to-derive failure this entry
  exists to close, so the unit is named outright now.
- ⚑ **RE-SEVERITY 2026-08-03 (verification fleet) — this is a three-tap path to a wrong plan, not a copy
  nit.** Anchor drift first: the cold-read log cites `copy.ts:1119`; the live string is
  **`copy.ts:1124-1125`**. The panel toggle (`AssumptionPanel.tsx:364-366`) writes `spendEntryPeriod`
  only — the stored amount holds and the SHOWN amount jumps exactly 12× (`:281-286`). The
  identical-looking INTAKE segment (`questions.tsx:432-450`) does the **opposite**: digits hold and
  `annualSpendingReal` re-bases 12×. That sentence is the only thing distinguishing the two controls, and
  it says *"switching this never changes the amount."* Flip to "Each year", see 78,000 where 6,500 was,
  believe the sentence, retype 6,500 → the plan runs on **$6,500/yr**. Nothing catches it:
  `PANEL_PROVENANCE` (`sanity.ts:216`) disarms `spend-period-unconfirmed`, and 6,500 is under
  `SPEND_AMBIGUOUS_MIN` anyway.
- ⚑ **A first replacement draft was written and REJECTED — do not re-derive it.** It dropped the live
  string's *"entered"* clause for *"reads on this sheet — the same money either way."* That is **false**:
  both spend commits (`AssumptionPanel.tsx:486-496`, `questions.tsx:409-422`) multiply by 12 under
  `'month'`, and `spendEntryPeriod` is **persisted** (`scenarioCodec.ts:700`), so the toggle sets the unit
  for the NEXT typed figure, across sessions. Any rewrite must keep the entry-unit disclosure. Also fix
  the now-overbroad comments at `copy.ts:1121-1123` and `AssumptionPanel.tsx:214-215`
  ("structurally impossible"). No test pinned the string — one was added with the fix above.

### A repeat "Add this account" tap over an already-visible block changes nothing perceptible

`XS` · **pilot** · filed 2026-09-03 (the allocation-fix ultramode review — two lenses converged; verified P3)

- The Add-time block re-renders the SAME `role="alert"` node with identical text: no new announcement,
  no focus move, no pixel change (`AccountEntry.tsx` `save()` sets a flag over a `showing` predicate
  that was already true; the ceiling arm has the identical shape). The error IS on screen and bound to
  the fields, so it is not a dead end — but a second tap on the primary CTA reads as a broken button.
- The house grammar has no precedent for focus-on-block (OtherIncomeEntry renders the line and stops),
  so this was NOT built with the 2026-09-03 fix. The honest closes are: move focus to the first
  offending control on block (also insight 054's remedy affordance; scrolls it into view on the phone),
  or re-mount the alert on a block counter so AT re-announces. Decide ONCE for all three arms of the
  Add gate (missing fact · allocation · ceiling), never for one.
- Sibling residual, same function: `save()` reads the render closure, so a same-task type+tap on the
  BALANCE sees `valueToday` undefined and names "Still need the balance today." over a typed figure
  (insight 036's shape; `CurrencyField` commits on blur only). The line is honest and a second tap
  heals it — P3. A live re-parse of the balance input on block would close it.

### Account balances have no typo defense

`M` (filed `S`) · **pilot** · filed 1× — `A51`

- The biggest number the couple enters — an account balance — has no magnitude defense, while spend and Social Security each got one
- ⚑ **"Briggsy sets the number" is the WRONG framing (verification fleet 2026-08-03) — there is no honest
  number.** The two existing instruments are different in kind: PIA (`sanity.ts:51-63`) is a hard
  IMPOSSIBILITY ceiling justified against the SSA maximum; spend (`sanity.ts:65-74`) is a one-shot
  CONFIRM with deliberately **no** upper bound. A balance has no impossibility — a 10× slip on $500k is
  $5M, a perfectly coherent household — so any threshold is a guessed plausibility band, exactly what
  burned/062 bans. The only rule that invents nothing is an **unconditional one-tap confirm on the
  household TOTAL** for any household with ≥1 account. **That is a friction-vs-honesty framing fork and
  it is Briggsy's call, not a number he supplies.**
- ⚑ Mechanism note: `valueToday` has **no `touched` entry anywhere** — `AccountEntry.tsx` uses the
  form-local path `'account.valueToday'`, not `accountField(i,…)`, so a per-account rule could never fire
  under today's machinery. A synthetic household-total `FieldPath` is not optional. 6 edits, enumerated
  in the fleet transcript.

### ~~The hero's baseline nameplate names "your plan today" — but the baseline is never your plan~~ — **CLOSED 2026-08-03, in two commits**

~~`S`~~ · **pilot** · filed 2026-08-03 (verification fleet; found while auditing "the recommendation never
says what to do", filed nowhere before)

**It took TWO fixes because the plan has TWO coupled tax controls, and the first one shipped believing
it was whole.** The register's own fix-shape question ("rename the nameplate, or rank against
`userBaseline`") was answered by `plans/4-recommendation.md:190`, which had already ratified *"the
rendered delta is current→recommended, **never** conventional-default→recommended"* — so this was a
regression against a ratified acceptance criterion, not a product decision.

- **The ORDER half — `2652b7a6`.** The displayed baseline moved from `search.conventionalBaseline` to
  `search.userBaseline`; `noChange` re-anchored and compares **plans, not indices**
  (`sameDecumulationPlan`). The shrinkage prior and the incumbent tie-break deliberately **stayed**
  conventional (Council Q3) so a household's own habit is never laundered into advice.
  `SOLVER_CODE_VERSION` 1→2.
- **The CONVERSION half — `94ea8d00`.** `enumerateCandidates` had **no field in which a conversion
  could be expressed**, so the injected baseline was minted `conversion: null` and `applyCandidate`
  strips the base's schedule: for a household running the shipped Roth lever, "your plan today" was
  their order with their conversion **deleted**. `draft.rothConversion` now threads through to the
  baseline arm, unscreened by the grid's legality filter (it is their standing plan, already simulated
  on the spine). Pinned as a **reduce-to-spine identity** — `applyCandidate(base, userBaseline)`
  deep-equals the household's own params. `SOLVER_CODE_VERSION` 2→3; this one **moves the ranking**.
- **Measured, full precision, `?seed=health`:** pre-fix `baseline:proportional:0` / `noChange: true` /
  delta **$0** — the surface reassured a household whose real recommendation is to take their
  conversion back out. Post-fix `baseline:proportional:20000` / `noChange: false` / delta **$12,530**.
- ⚠️ **The single-bucket immunity note above was right and is worth keeping:** couples with one pre-tax
  account are immune on the ORDER half (every order is the same decumulation), which is why no cold
  read caught it — `?vault=rec`'s household is exactly that shape. `?seed=buckets` was minted to close
  that witness gap; `?seed=health` is the conversion-half witness.
- ⚠️ **The four strings on this seam are load-bearing and now carry a coupling comment**
  (`copy.ts` `recommendBaselineNameplate`): they are true only while the displayed baseline is the user
  baseline **AND** that baseline carries **both** controls. Dropping either half makes all four lies in
  the same commit.

### ~~NC rate certification~~ — **CLOSED 2026-08-02** (the NC half; the ACA half moved below)

~~`M`~~ · **pilot** · filed 9× — `A10`, `A22`, `A25`, `A26`, `S12`, `S17`, `S24`, `S37`, `S65`

**Resolved by primary, not by a date bump.** **S.L. 2026-41 (SB 257) § 44.1(a)** — ratified 2026-07-02,
signed 2026-07-07 — rewrote G.S. 105-153.7: it struck the open-ended "After 2025 — 3.99%" row for the
enacted steps **2026 3.99 · 2027-2029 3.49 · 2030-2032 3.24 · after 2032 2.99**, *and* struck every
revenue-trigger row through FY2032-33. So the FY2025-26 certification this cluster waited on gates
nothing, and the first surviving trigger row is FY2033-34 → TY2035 (OSC **August 2034**).

- ✅ NC household strategy recommendation — **the hard withhold is LIFTED**; an NC household now mints
  and gets a real recommendation (`state-certification-pending` has no live producer).
- ✅ `verify:state-tax` NC `nextDue` — moved off the dead 2026-09-01 checkpoint to the annual cadence
  (**2027-08-02**). NC keeps `reVerifyEveryBuild`: a budget act rewrote this table mid-session once.
- ✅ U16 §Q5's NC contract — **moot, not delivered.** The withheld render it specified has no live
  household. The copy survives for a future directional state, minus its "around August" promise.
- ⚠️ **Landmine recorded in the constant + the record:** NCDOR's rate page and ncleg's *codified* G.S.
  page both still showed the STRUCK 3.99% row at pin date. They will read as contradicting our table
  until they recompile — session law wins; do not "correct" it back.

### The dated ACA re-verify gate re-arms (rolling window, 2026-09-02)

`S` · **pilot** · filed 2× — `A26`, `S65`

- ACA's deadline is a **ROLLING** window (`verifiedOn` + `maxAgeDays: 30`), never an absolute
  `nextDue` — grepping `nextDue` to inventory deadlines silently misses it. Re-verified 2026-08-02,
  so it next reds **2026-09-02**.
- `AcaRecord` has no top-level `primarySources` array where `StateTaxRecord` requires one — the two
  record shapes should converge on the stricter one.

### The saved-record card claims the advice still holds when the couple never took it

`M` · **briggsy** · filed 5× — `A30`, `S1`, `S13`, `S31`, `S38`

- OPEN BLOCKER: the saved-record card still asserts "It still matches your plan as it stands today." while the door beneath it shows the household never executed the advice
- HIS EYE — the record card's strategy naming (half 2)
- S6 (f) HALF 2 — naming the strategy on the record card (a Briggsy ruling, not a build)
- ⚑⚑ RECORD CARD HALF (2) — naming the strategy on Cards 6-7 (Briggsy ruling, DO NOT PILOT-FIX)
- HIS EYE — the only thing blocking product progress (six open items)
- ⚑ **A drafted fix was REFUTED 2026-08-03 — do not execute the obvious one.** The reasoning was going to
  be *"`noChange: false` means the winner differs from the household's plan, so 'it still matches' is
  false."* **That is engine-wrong:** `noChange` compares the winner to a FIXED conventional prior
  (`select.ts:313`, `:324-329`), never to the entered `drawdownPolicy` — so a defending comment built on
  it would mint a NEW false engine claim into `copy.ts`.
- ⚑ **`?vault=rec` CANNOT WITNESS this defect.** `devSeeds.ts:951` → `retiredOnTrack` holds **one**
  traditional IRA, so `proportional` and `taxable-first` are the identical decumulation and the
  cold-read's *"SWITCH to Brokerage first"* names an account that does not exist. **A multi-account
  witness plant must be built before any regression pin here means anything** — which is what pushes this
  from `S` to `M`.
- ⚑ Anchor drift: `noChange: false` is `devSeeds.ts:1330` (not `:1322`); the winner literal is `:1316`
  (not `:1308`). `copy.ts:1309-1313` is the card-FAMILY header — nothing defends the holds sentence
  today, so the fix must **add** a comment, not rewrite one.

### ~~Well-funded household with a converting winner crashes into a calm "unavailable"~~ — **CLOSED 2026-08-03** (`e7bf0485`)

`M` · **pilot** · filed 2× — `A12`, `A18`

- ✅ **BOTH HALVES SHIPPED.** Engine: `select.ts`'s §S4.5 guard is goal-agnostic now (it tested
  `goal === 'pay-less-tax'` AND passed that literal as the statistic, so `leave-more` walked past it
  into `assertDemotionAxisCalibrated`'s plain throw → rethrown by `solve.ts` → the generic card). UI:
  `recommendationView`'s `withheld` arm returned the SAME string as `compute-error`, so the engine fix
  alone would have converted a crash into an identical generic card — it now routes to the humane HOLD
  with a new `recHoldDemotionAxis`.
- **Reproduced before fixing** (the new `select.test.ts` arm failed first), then both halves
  mutation-proven independently. Four stale "falls through to a THROW" comments swept.
- ⚑ **The `detail` string was a trap the audit missed:** it hard-coded `pay-less-tax`. Widening the
  guard without interpolating the axis would have told a leave-more household we refused on the OTHER
  goal — a new false statement inside the fix for a false statement. It interpolates `goal` now, and a
  test asserts the refusal never names the wrong axis.
- ⚑ **Copy constraint, load-bearing:** the guard fires on SHAPE (converting winner over a
  non-converting runner-up) **before any margin is read**. So the string says we cannot tell how close
  the call is — never that the strategies ARE close, which would be a fabricated finding. A regression
  arm bans the near-tie vocabulary outright.
- **MEASURED FREQUENCY (2026-08-03 probe, 27 well-funded leave-more worlds):** the hold fires
  **3–4 of 27 (11–15%)** — 15% at 400 paths, **11% at 1600**. It did NOT rise with path count, so the
  "low paths under-count this" reasoning was **wrong in direction**; the rate is stable and modest.
  Structural reason it is not modal: conversions win OFTEN (17 of 24 crowns convert), but the runner-up
  almost always converts too (`pre-tax-first:57000` over `bracket-fill:57000` — same conversion,
  different sequencing), which keeps the axis calibrated. The withhold needs a conversion-**zero**
  runner-up. All three 1600-path withholds sat in the HIGHEST spend tier ($120k).
- **OPEN, and it is Briggsy's call:** ship the hold (current behavior — ~1 in 8 well-funded leave-more
  couples get a hold instead of an answer), or calibrate the conversion-near-tie demotion width on the
  DOLLAR axes so they get a graded answer. Calibration is a correctness-critical measurement (the width
  governs when a "confident" grade demotes to "coin-flip"), so it is not a quick follow-up.
- ⚠️ **NOT YET SEEN IN A BROWSER.** No dev seed crowns a lone conversion winner; `?seed=surplus` +
  leave-more lands on the ACTIVE arm (verified live 2026-08-03 — no crash). The `held` render branch is
  payload-agnostic and already ships for token withholds, so the unproven link is narrow. Mint a seed
  from the probe's `2.5M/120k/pretax30%` world to close it.

- Over-funded (≥98% survival) household whose winning strategy converts: generic "unavailable" or a calm-error, not a named refusal — and the code comments say this is unreachable when it is NOT
- R22/R9 — a leave-more surplus household with a conversion winner CRASHES to 'engine-unavailable' instead of an honest withhold
- ⚑ **Crash path CONFIRMED reachable end-to-end (verification fleet 2026-08-03), and MORE likely than
  filed.** `select.ts:245-247`'s conventional-incumbent tie-break crowns the non-converting baseline as
  runner-up whenever only one conversion's advantage survives shrinkage — so
  winner-converts/runner-up-doesn't is the **natural** shape for a well-funded leave-more household, not
  a rare one. Real guard is `select.ts:287-291`; the throw is `gradeCalibration.ts:172-177` via
  `gradeOnFamily:200`; the catch narrow is `solve.ts:346`, rethrow `:347`.
- ⚑ **The engine one-liner is HALF the fix.** `recommendationView.ts:315-317` maps `withheld` to the
  SAME generic `copy.recommendUnavailable` as `compute-error`, so widening the guard alone converts a
  crash into an **identical generic card**. Route it through `heldView`'s shape (`:329-335`) with a new
  `recHoldDemotionAxis` key — `copyGuard.ts:112` makes `recHold*` require-hedge, so it must wear a modal.
- ⚑ **Four comments would become NEW false claims** and must be swept in the same commit —
  `select.ts:116-117`, `select.ts:284-286`, `solve.ts:151-152`, `solve.ts:481-483` each currently assert
  the `leave-more` arm *"falls through to a THROW."* This is the exact class `30e5bc31` just cleaned up.
- ⚑ **RED-GATE RISK:** `select.test.ts:292` asserts `kind === 'selected'` on a live-shaped leave-more
  world, and `:294`'s comment literally encodes the defect (*"leave-more never routes to withheld"*).
  Check it before shipping. No existing fixture covers leave-more + a converting winner.
- ⚑ **BRIGGSY DECIDES:** on `leave-more` a converting winner is the EXPECTED crown for a well-funded
  household, so an honest withhold likely fires for the **modal** target user — a hold, not an answer.
  Ship the hold, or go straight to calibrating the demotion width on the dollar axes?

### Post-65 non-qualified HSA money is silently forfeited

`M` · **pilot** · filed 1× — `A24`

- R38 — the post-65 non-qualified HSA path is unrouted and its conservative forfeit is disclosed only in a code comment

### Long-term care is neither modeled nor listed as left out

`M` · **pilot** · filed 1× — `A48`

- Long-term care — the largest un-modeled retirement risk — is neither in the model nor in the OUT-but-disclosed list the product otherwise keeps religiously

### The staleness clocks — a false alarm today, and the state-tax arm parked

`M` · **pilot** · filed 4× — `S44`, `S45`, `S46`, `S47`

- ✅ **Date-route ACA clock over-alarm — CLOSED AS PHANTOM (2026-08-02).** It does not over-alarm: the date
  route simulates all 11 offsets (`dateSearch.ts:425/450/457`) and candidate Y=0 carries the base ACA
  stream **ungated** (`healthcareStreams.ts:149` → `windowStart = 0`, a pass-through), so
  `exposure.aca === 'priced'` *proves* the ACA tables were consumed. The clock is load-bearing.
- ⚠️ **BUT THE FILED FIX IS A LIVE TRAP — do not execute it.** The prescription still sitting in
  `stalenessExposure.ts:115-117` ("re-derive the exposure against the CROWNED offset") would **silence**
  the ACA clock for exactly the household whose date a subsidy flip moved — insight 103's shape recurring
  inside the comment that cites insight 103. Rewrite `stalenessExposure.ts:86-117` to record the sweep
  argument and delete the trap; its render-chain anchors are 20–60 lines stale as well.
- ⚠️ THE STATE-TAX AGGREGATE ARM — council-shaped, parked behind a trigger; DO NOT BUILD AS FILED
- Council fork: state-tax exposure — widen `pricedState` vs add a 7th `stateTax: ExposureRead` field
- Standing trigger — the state clock's unknown arm (unreachable in-build today)

### ~~Annual tax-year roll on 2027-01-01 with no tripwire~~ — **ARMED 2026-08-02**

~~`L`~~ · **pilot** · filed 2× — `A27`, `S79`

- ✅ `src/engine/constants/__tests__/annualRoll.tripwire.test.ts` — mirrors the
  `irmaaTopTierReindex.tripwire` idiom. **Both arms mutation-proven red in isolation** before landing.
- Arm 1 reds when the wall clock passes `TAX_YEAR`, and refuses a **partial** roll (the three years must
  move together, cross-checked against `CONSTANTS_VINTAGE`).
- Arm 2 pins the FPL relationship **structurally** — `guidelineYear === COVERAGE_YEAR − 1` (ACA's
  prior-year rule) — rather than a literal. This closes the correction the audit raised: the FPL table
  IS dated and was equally ungated, and the roll can desync it in **either** direction (forget it and
  the offset becomes 2, understating income vs poverty and OVERSTATING subsidies — the optimistic
  direction; "fix" the apparent staleness by syncing them and the cliff moves against every pre-65
  household). A hardcoded year only pins today; the relationship keeps biting after the roll.
- Enforced in CI — `pnpm test` runs at `.github/workflows/verify-the-back-nine.yml:56`.
- ⚠️ Known and unchanged: a red tripwire reds the GitHub check but does **not** block a Vercel deploy.
  True of all three pre-existing tripwires — the house posture, not a gap this introduced.

### Pre-65 health insurance is priced with no cost growth, and the subsidy clawback is unmodeled

`L` · **pilot** · filed 2× — `A39`, `S25`

- Pre-65 ACA premiums are priced REAL-FLAT — the exact sin the Medicare council ruled solver-BLOCKING, with no trend, no oracle clause, and no disclosure
- ⚠️ **The fix is NOT a Part B copy-paste.** Part B’s schedule is built INSIDE the engine, which is why the oracle token can witness it; the ACA escalator lives in **intake** (`intakeMap.ts:271-291`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto intakeMap would be the exact lying-mirror `oracleToken.ts:113-119` warns about. The honest fix moves the schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1110`).
- ⚠️ Anchor corrections: `healthOverlay.ts:296` is a **closing brace**, not a consumer (real seam `taxOverlay.ts:1689` + `:1731-1738` → `healthOverlay.ts:270`); the strings claiming the coupling is priced are `copy.ts:894-897`, not `copy.ts:924`.
- ⚠️ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver block would hold for months over the whole pre-65 population. Near-term move is the copy swap at `copy.ts:894-897`. The excess-APTC field moved to `aca-last-verified.json:41` and `scripts/verify-aca-status.ts:40-72` never declares the key — **it is inert prose, not a gate.**
- Uncapped excess-APTC clawback — the gate never reads the field, and the copy call is unmade

### ✅ CLOSED 2026-08-14 (`863747d6`) — Mixed household: the already-retired spouse is priced at zero health cost while the other works

`L` → shipped · **pilot** · filed 1× — `A40`

**Closure.** Intake now ASKS the employer-coverage premise (`employer-coverage` step, gated on the
exported `anyRetiredPre65WhileAnotherWorks`) and REFUSES the date when the answer is "buying their
own coverage". `health.employerPlanCoversRetiredMember` is additive-optional within v3 (no version
bump, no migration). `missingRequiredFacts` remains the ONE authority — nothing new decides.

Three of this entry's own warnings were load-bearing and all three held:
- **The XL re-size was right, and for exactly the stated reason.** `completeDateDraft()` and
  `DEV_SEEDS.date` both ARE the defective household, so both fixtures redded until they answered.
  Twelve tests failed on the first run — the gate biting, not a regression.
- **The "existing calm grammar cannot express this refusal" warning was correct.** `MissingFact`
  gained a `kind` (`absent` | `unrepresentable`) and `AnswerStrip` gained the matching arm, exactly
  as this entry prescribed.
- **The pre-existing `kindHsa` false claim was real and is FIXED IN THE SAME PASS** (re-tagged
  `kindHsaBothSpouses`, `unrepresentable`), as this entry asked.

One thing this entry did NOT anticipate, caught only on the rendered frame with the whole suite
green: the strip's LEAD (*"Your answer takes shape as you go."*) sat above a permanent refusal — a
keep-going promise over an answer that is never coming. `answerWithheldLead` now leads when every
blocker is unrepresentable, route-neutral per insight 101 (its extension includes the two-HSA SPINE
household, so it can never say "your date").

**Residual, and it is an EYE call not a build:** the `healthQuoteHelp` contradiction below now reads
directly above the new step, which states the working-window rule in its own words — so it looks
resolved *by adjacency*. That is a tone judgment on a rendered pair; it belongs to the Caddie or
Briggsy's eye, and should not be re-filed as a copy defect without a read.

<details><summary>the original entry — diagnosis and warnings, kept for the reasoning</summary>

- A mixed household's already-retired pre-65 spouse is silently priced at $0 healthcare during the working window — never asked about, never disclosed
- ⛑ **BRIGGSY RULED 2026-08-02: ask + refuse** — one employer-coverage question in intake; refuse the date when the answer is no. Honors the ruling the engine already made for itself at `simulate.ts:908-912` ("rejection beats disclosure").
- ⚠️ **The obvious fix is REJECTED by shipped code — do NOT simply un-gate the premium.** `simulate.ts:913-919` refuses any finite-positive `enrolledPremium[t]` on a bridge year, so un-gating makes every date candidate fail: no answer at all, rather than a later one. `acaMagi` (`healthOverlay.ts:99-101`) also carries no wage term, so a priced year would be optimistic a NEW way. Scope is wider than filed — the gate zeroes `oopMedical` too (`healthcareStreams.ts:168-170`). And `healthcareStreams.test.ts:64` promises a pre-65 case that **does not exist in the file**, so the genuinely-broken case is untested.
- ⚑ **RE-SIZE `L` → `XL` (verification fleet 2026-08-03), and the reason is the fixtures.** The defective
  household **IS the canonical date fixture**: `intakeMap.test.ts:105-118` `completeDateDraft()` is a
  working person + a retired 60-year-old, used in ~18 assertions including the render-anchor coupling
  test at `:129-137`; `devSeeds.ts:127-181` `stillWorking` = **`DEV_SEEDS.date`**, the flagship
  `?seed=date`, clones it verbatim and its own comment says *"a pre-65 retiree so the ACA quote IS
  required."* So every cold read of the fuck-off date ran on the broken household — it is not
  "untested", it is asserted **GREEN**. `devSeeds.test.ts:64-66` pins `missingRequiredFacts → []` for
  EVERY seed, so the refusal channel reds the coupling battery + devSeeds until both fixtures answer the
  new question.
- ⚑ **"Refuse through the existing calm input-failure grammar" is NOT executable — that grammar cannot
  express this refusal.** `answerView.ts:221` maps `input-failure` to `fallback` and **drops `reason`**;
  `AnswerStrip.tsx:148-152` then renders `copy.answerIncomplete` + a MissingList built from the DRAFT. A
  household with no missing facts gets an **empty strip** — the "empty-missing dead-end"
  `intakeMap.ts:146` already warns about. A new `MissingFact` refusal variant plus a matching AnswerStrip
  arm is **mandatory, not optional**.
- ⚑ **Shipped copy CONTRADICTS the premise — it is not merely silent.** `copy.ts:203-204`
  (`healthQuoteHelp`) promises *"A quote for everyone under 65 in the household… The tool splits it by
  age for each of you"*, and `escalateQuote` (`intakeMap.ts:276`) really does include the retired
  spouse's age share — before `healthcareStreams` zeroes it. That line must change in the same pass.
- ⚑ **Pre-existing false claim in the channel this fix would reuse:** the two-HSA-owner model-limitation
  refusal (`intakeMap.ts:187-188`) already renders as *"Still needed: HSA"* under MissingList's lead
  *"The tool never guesses these — it prices only what you enter"* (`copy.ts:381-382`). That lead is
  false for an answered-but-unpriceable household. Fix it with the new variant.
</details>

### Unpriced states — a confident winner computed with zero state income tax

`XL` · **pilot** · filed 2× — `A14`, `A7`

- Household outside {NC, PA, FL}: the state-tax half of the answer is withheld and only disclosed in prose
- Deferred state-tax roster {SC, GA, DE} — and the 47 other unpriced states
- ⚑ The withhold machinery gates `solve()` ONLY — a withhold-only fix still ships a **state-blind
  headline / fuck-off date**. And the honest-withhold precedent this used to cite (the NC certification
  block) is **retired**, so a refusal arm must be built, not copied.
- Cheap partial: the 8 no-income-tax states are a sourced structural $0 (FL's exact shape), so widening
  to them is honest and leaves refusal for taxing states only.

### ~~The recommendation tells a priced-state household we can't price their state~~ — **CLOSED 2026-08-03** (`12d2bb6e`)

`S` (filed `M`) · **pilot** · filed 1× — `A66` (found live in Chromium 2026-08-02, `?seed=nc`)

- `recDiscStateTax` was an **ALWAYS-ON** disclosure and contradicted the spine three inches above it.
  Now `composeRecStateTaxDisclosure` (`src/ui/stateTaxDisclosure.ts`, **home #5**) drops it for a priced
  household — a DROP matching homes #2/#3, so no new copy and no new require-hedge sweep.
- **The filed prescription was WRONG, and the error is the reusable lesson.** It said the payload needed
  retirement state threaded through *"engine + worker wire + tests."* None of that was true:
  `pricedStateForRun` was **already computed in `Result.tsx` as `statePricedNote`** and already handed to
  three other disclosure homes — the recommendation surface sat 240 lines below it and was simply never
  passed the value. Four edits, no engine, no worker, no wire. **Before costing a "needs it threaded"
  item, grep for whether the value already exists one component up.**
- `disclosuresFor`'s `pricedState` parameter is **REQUIRED, not optional** — the defect existed because a
  computed value was never handed down, and an optional parameter rebuilds that exact trapdoor.
- Guarded by the exhaustive-switch idiom: the drop is honest ONLY because a flat-or-zero roster makes the
  federal-only bracket-fill rails provably neutral, so a **GRADUATED** state joining `PricedState` fails
  `tsc` until someone authors the replacement caveat.
- Verified live at 1536×791 on `?seed=nc` (spine affirmation renders, the federal-only sentence appears
  nowhere); both new tests red on a planted mutant.

### NC's declining rate SCHEDULE is a timing signal the federal-only rails cannot see

`M` · **pilot** · filed 2026-08-03 — split out of `A66` while closing it above

- The state-tax drop rests on the roster being **flat-or-zero**, which makes the federal-only bracket-fill
  rails neutral: with a flat rate, the state tax on a marginal conversion dollar is identical whichever
  federal bracket you fill to, so no state term can move the optimal fill point.
- **That neutrality is CROSS-SECTIONAL only.** NC's flat rate **steps down by schedule** (3.49 → 3.24 →
  2.99), so converting *later* is cheaper in state tax. The rails cannot see it, so a converting NC
  household can be ranked on the wrong timing.
- **Do NOT "fix" this by restoring the dropped scope note** — a disclosure fixes a number, never a
  mis-ranking (`oracleToken.ts:112-133`). This is a rails question, and it is the same class of defect as
  the pre-65 ACA real-flat pricing entry above.
- The `PricedState` widening tripwire in `composeRecStateTaxDisclosure` fires on a **new roster member**;
  it does NOT fire on a rate-schedule change to an existing one. That gap is the thing to close first.

## Tier 1 — the differentiator does not land

### ✅ CLOSED 2026-08-14 (`2816d036`) — The assumed heir tax bracket: the shipped copy sent the reader to a control that did not exist

`M` → shipped · **pilot** · filed 2× — `A23`, `A8`

**Closure.** The `heir-bracket` seat ships in `AssumptionPanel.tsx` — a radio over the statutory
ordinary ladder DERIVED from `ordinaryBracketsMFJ` (never re-typed), gated on
`chosenGoal === 'leave-more'` (under pay-less-tax nothing multiplies by the bracket, so a row there
would be a hollow door). `ScenarioV3.heirBracket` is additive-optional; `solveDispatch` reads
`draft.heirBracket ?? solverAssumedHeirBracket.value`.

**Both of this entry's warnings were right, and a third was needed.**
- The `survivor-ratio` "not a line-for-line template" warning held exactly: the field is
  additive-OPTIONAL, unseeded, and absence means "took our default".
- The SegmentedControl-not-PercentField call held, and its reason turned out to be stronger than
  filed: a closed vocabulary cannot express `24` or `1`, and `afterTaxBequestPerPath` THROWS outside
  [0, 1) — so no sanity rule was needed at all, and the codec's gate uses an EXCLUSIVE upper bound
  rather than `needUnitFraction` (which admits 1).
- The third, unfiled: the goal gate REDS the R7 completeness walk, which renders only two fixtures
  and demands every registry seat appear. A leave-more fixture was owed with the seat.

**The clause is restored**, in the same commit, per the coupling below — and its comment now records
that the coupling runs BOTH ways (remove the seat ⇒ drop the clause in that same change).

**Corrected in passing:** three shipped comments asserted an editability that did not exist — the
`solverAssumedHeirBracket` docblock, its citation string, and its note all said "R7-editable
(recommendationView.ts registry)" / "the user overrides it", inside the constants provenance a
reader is meant to trust. All three now name the PANEL as the editor home (the registry NAMES the
disclosure; the panel HOMES the editor — insight 058), as do the two "inline editor lands later"
notes on `recommendationView.ts` and `RecommendationSurface.tsx`. The editor is not coming inline.

<details><summary>the original entry — diagnosis and warnings, kept for the reasoning</summary>

- ⚑ **RETITLED 2026-08-02 — the filed claim ("cannot be seen") is HALF FALSE and the truth is worse.**
  It IS disclosed: `recommendationView.ts:88-91` → `copy.ts:2485-2486` → `RecommendationSurface.tsx:477-487`.
  The shipped sentence USED TO end *"— adjust it in your assumptions if that's off"* while **there is no
  heir seat in `assumptionRegistry.ts` or `AssumptionPanel.tsx`** (re-grepped 2026-08-05: still zero
  rows). We sent the reader hunting for a control we never built — a dead-end instruction worse than
  silence, live in the 2026-08-02 `?seed=nc` capture.
- ✅ **(XS) SHIPPED 2026-08-02 — the dead-end clause is GONE.** `copy.ts:2485-2486` now states the
  assumption and stops; its comment (`:2478-2484`) carries the coupling: **restore the clause in the SAME
  change that ships the seat, never before it.** (This bullet asserted the clause was still live until
  2026-08-05; corrected against the source.)
- **(M) STILL OPEN** — add the real editable row. ⚠️ `survivor-ratio` (`AssumptionPanel.tsx:336-362`) is
  **not** a line-for-line template: it is a REQUIRED v3 field, and copying that shape bricks every
  existing vault at `needFinite`. `heirBracket` must be additive-OPTIONAL, and the control a
  `SegmentedControl` over the statutory ladder, not a `PercentField`. Full prescription lives in
  `TODO.md`'s heir-bracket entry — the only 2026-08-03 entry no skeptic could refute.
</details>
- **Panel only — never asked in intake.** "What bracket will your kids be in?" invites a
  confidently-wrong guess worse than the 24% default. This also sets the precedent for every future
  methodology knob (`market` sits in the same limbo).

### The third goal — "live bigger now" doesn't exist

`L` · **pilot** · filed 4× — `A15`, `A19`, `A9`, `S72`

- "Spend more now" household: the goal cannot be expressed, so the answer is aimed at a proxy
- R21 — only 2 of the 3 locked Tier-2 goals ship; 'live bigger now' does not exist
- `live-bigger-now` — the third recommendation goal, deferred past U15
- 3rd-GOAL UNIT (live-bigger-now)

### The `dateinvert` proof seed and the budget's state-adaptive second beat it gates

`L` · **pilot** · filed 3× — `S16`, `S54`, `S9`

- `dateinvert` (c) — the MINT half is unbuilt
- R27 `dateinvert` seed (c) — the inversion seed is OWED and is a SEARCH, not a mint
- `dateinvert` (c) — the MINT half, its own session

### U17 S7 riders — the comparison chart's missing dollar endpoints (Q7a) and the unspecified reorder (Q7b)

`L` · **pilot** · filed 5× — `A3`, `S18`, `S19`, `S21`, `S33`

- U17 S7 riders — Q7a (RecommendationViz endpoint dollars) and Q7b (the unnamed reorder)
- Q7a is filed on a FALSE gating premise — the spec must be amended before it is built
- Q7b has NO spec — defer or amend the spec first; not buildable as filed
- U17 S7 — DEFERRED by Briggsy's ruling
- Q7a must be re-filed as its own unit with a CORRECTED gate (S7 deferred)

### Modest pre-tax household refused a withdrawal-order answer the engine could compute

`L` · **pilot** · filed 1× — `A13`

- Modest-pre-tax household: refused a SEQUENCING recommendation the engine could actually compute
- ⚠️ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:140-147` mint-fails the roster *before* `solve()` runs, and `rankingStability.ts:145-153` knows only a conversion-**amount** perturbation — so dispatching the sequencing-only field would surface `mint-failed{roster}` **live**, the exact state `solveDispatch.ts:76` forbids in its own comment. Doing it properly needs a second validation law under every shipped recommendation, a one-way door on what "validated" means.
- **Near-term, honest, XS:** fix `copy.ts:1408` only — it says a *withdrawal strategy* needs more pre-tax when only the **conversion** half does. Sequencing across taxable and Roth is real and rankable.

### ~~The recommendation never names the winning strategy, the runner-up, or what to do~~ — **the STRATEGY half CLOSED 2026-08-05 (`db371655`); the RUNNER-UP half stays open**

~~`L`~~ → `S` · **pilot** · filed 2× — `A16`, `A20`

- ✅ **R9/R10 — the winning-plan card ships.** `.rec-action` in `.rec-committed__rest` states the crowned
  plan CONTROL BY CONTROL: the withdrawal order (the sequencing sheet's own `leverPolicy*` label + gloss)
  and the Roth conversion (the shipped `rothPlanEcho` slot, its amount through the round-DOWN
  `formatActionableDollar`). A **settings list, not an instruction list** — the crowned conversion
  REPLACES the household's, so any "also/alongside" framing was a false implicature, and a row that
  names a control and states its setting cannot carry one.
- ✅ **No store write, and no door at all** — Briggsy ruled NAME IT, NO DOOR (2026-08-03). The filed
  "point at the sequencing sheet" half was dropped for the reason the ⚠️ below gives: following the
  pointer fires `invalidateStaleSolve` and demotes the card that pointed there.
- ⚑ **"Most of the gap is already ON the payload and needs only rendering" was FALSE.** The surface is a
  declared downstream renderer (insight 020) and `RecommendedView` carried `winnerStrategyKey` and
  nothing else about the strategy — no conversion amount, offset or years, no order. It needed new view
  fields, a new composer, a plan-clock thread through `RecommendationViewOpts`, a new money dialect
  (`formatEnteredDollar` — the household's own figure must NOT be floored), and three new copy strings.
- ⚑ **Scoped to the ACTIVE register**, which settled three of the 2026-08-03 design panel's five
  problems by construction. **The no-change register still does not name the plan** — that is the one
  increment left, and it is specified in `TODO.md`'s entry 7 (it needs a `custom` branch, a third ui
  bucket map, and a seed that can witness a custom winner, which none exists).
- **STILL OPEN — R23: the runner-up is retained but never IDENTIFIED**, and its `why` is one
  content-free constant (`copy.ts:1599`) naming neither arm, while `payload.runnerUp.id`/`.policy` sit
  unused. The winning-plan card's own vocabulary is now the obvious material for it.

### Date-route recommend-second parity — the working household gets no strategy at all

`XL` · **council** · filed 4× — `A1`, `A11`, `A17`, `S71`

- Date-route recommend-second parity gap — the entire still-working audience gets NO strategy recommendation, silently
- Not-yet-retired (working) household: the recommendation surface does not exist at all
- R10/R29 — recommend-second is entirely absent for a not-yet-retired (date-route) household
- ⚠️ **The filed "cheap interim" is WRONG — do NOT drop the `Result.tsx:476` gate alone.** It renders an **empty `<div>`**, not the refusal. And reusing `recommendSpineUnreadyNote` would tell a household with a COMPLETE answer that its answer is incomplete — a new false claim, worse than the silence it replaces. The honest interim is a route-true one-liner admitting the v1 limit, seated and re-measured under `verify:fit` (~89px headroom); **Briggsy blesses the words.**
- DATE-ROUTE RECOMMEND-SECOND PARITY (+ Q1 survivalContext + heir bracket)

### The detail-door era — nowhere to see how a number was reached

`XL` · **briggsy** · filed 2× — `A4`, `S74`

- The "detail-door era" — the post-U16 unit that owns every filed detail-hunger residue
- THE DETAIL-DOOR ERA — its own post-U16 unit + walk

## Tier 2 — what breaks on someone else’s device

### The app on someone else's device — no icons, no Safari, no large text

`M` · **pilot** · filed 3× — `A46`, `A50`, `A54`

- The app has no icons at all — the "local-first PWA" is not installable and its tab/bookmark is unidentifiable
- No WebKit arm anywhere — the app is verified only in Chromium, while the vault's durability story is explicitly about Safari's eviction
- The one-frame honesty law is verified only at fixed pixel viewports — never at the enlarged text setting this audience actually uses

### Nothing a friend can read, nothing a professional can read

`M` · **pilot** · filed 2× — `A47`, `A52`

- The app orders the couple to "validate with a professional" and gives them nothing a professional can read
- There is no document a friend reads — every doc in the repo is written for the builder, and the in-app total is two sentences

### Intake shape — no single-person household, and no way to enter what you actually own

`L` · **pilot** · filed 2× — `A2`, `A21`

- "Just me" single-user (non-couple) household mode
- R37 — ticker/holdings entry was RETIRED from the shipped intake; the bundled blend table is dead code

### The surfaces a friend actually hits have never been walked or read

`L` · **pilot** · filed 7× — `A31`, `A32`, `A33`, `A36`, `A38`, `S42`, `S60`

- Every vault-credential ceremony — PassphraseStep, BackupStep, SaveFlow, ExportConfirm — has never been walked or cold-read by any oracle, and no dev seed reaches it
- RecoveryFlow and RestoreFlow — the two "I lost access to my retirement plan" surfaces — have zero coverage in the log and zero coverage in the harness
- Ten of thirteen intake steps have never been cold-read — including the ACCOUNTS step where the couple enters their entire net worth
- ColdStart — the first screen every new user sees — is entered by the walk but never captured, and never cold-read
- ViewOnlyBanner, UpdateToast and AppErrorBoundary render on every session and have never appeared in any bundle or card
- Post-ceremony landing announce is UNPROVEN — needs a real NVDA/VoiceOver pass
- THREE NEVER-COLD-READ FACES — fold into the S6/S7 aged-seed walk, never standalone (datesplit, datemixed, the save ceremony)

### The dead-end repair beat — four residuals the 2026-09-03 review confirmed and did not build

`S–M` · **pilot** · filed 2026-09-03 (the completed-intake dead-end fix's ultramode review; all verified real + new, P2/P3)

- **(P2) Close DURING the repair compute strands focus on <body>.** Supplying the missing fact flips
  `computing` true for the compute; the actions row (and the door) is withheld for that beat, so
  `restoreToAssumptionsDoor` — the ONLY rung of every sheet's `restoreFallback` — resolves null if the
  panel closes inside it (the shipped pin closes AFTER the row is back). FIX: give the fallback a second
  rung that survives `computing`: `document.querySelector('[data-door="assumptions"]') ??
  document.querySelector('main.result')` with `tabIndex={-1}` on `<main className="result">`
  (Result.tsx ~:610) AND a `:focus-visible` rule so the programmatic landing paints no full-page ring
  (a calm-tone design call — run it through the UI loadout, not a mechanical edit). Never the strip:
  it is the `aria-live` region. Pin: open on the dead-end frame, `rerender(computing)`, Close WHILE
  computing, assert `document.activeElement` is the landmark (not `!== body`). Also covers the
  via-sheet Apply route, the likelier real trigger. `verify:fit` re-run (the attribute touches the
  protected crunch frame's DOM; no layout effect).
- **(P2) A SECOND panel edit during the repair compute can crown a verdict on superseded inputs.**
  `memoryModel.recompute`'s pre-first-resolve arm returns WITHOUT minting an epoch when a builder
  nulls (`memoryModel.ts` ~:725-732), so if the household re-blanks a fact while the first compute is
  in flight, that run still lands (nothing out-epochs it) — a confident verdict painted over an
  incomplete draft until the next edit, and `pending` can latch. FIX (the verifier's refinement, not
  the finding's blanket one): keep `if (everResolved) { …inputs-incomplete… }` and add
  `else if (dispatchedEpoch > committedEpoch) { const e = ++dispatchedEpoch; void
  deps.client.engine.setLatestEpoch(e); commit(e, { kind: 'idle' }) }` — mid-intake stays
  byte-identical (no in-flight ⇒ no mint), the idle-with-missing shape the three new predicates handle
  is restored, the in-flight resolve is discarded by contract (f). Pin with the fakeClient's
  controllable `run` promise: dispatch, re-blank a fact, resolve the first run, assert `answer.kind`
  is `idle` (never `headline`) and the strip names the fact.
- **(P3) `computing` is all-or-nothing, so the dead-end frame also paints the save slot** when the
  draft is READY but the answer is idle — the unrepresentable-only case (`datesolo`), where
  `scenarioFromDraft` builds and `deriveResultSave` offers "Keep this answer" over an answerless
  frame. On absent-fact dead ends the slot is 'none' (not ready). DECIDE + PIN: either a distinct
  `deadEnd` signal from IntakeApp that renders the hatch + in-frame disclaimer while still withholding
  the save slot / backup door / record card, or name the sibling-parity choice (inputs-incomplete
  already ships the slot) in the audit note. Either way a pin on what the save slot does there.
- **(P3) On the DATE route the repaired dead end lands with no AT feedback**: the hero's one-shot
  landing announce is consumed under `sheetOpen`, and the panel echo has no `date` arm (its first
  branch reads the spine's sticky `displayed`, null on the date route), so the aria-modal falls to the
  quiet line while the answer commits behind it. FIX: a `date` arm in the echo rendering the same
  composed hero lead the surface uses (`heroLead`/`composeDateSplit`), keyed so `role="status"`
  announces on commit. Do NOT take the "smaller" alternative (fire the landing announce when the
  sheet closes) — it races ControlSheet's `restoreFocus` and contradicts ConfidenceStatement's
  documented "the panel's own close/steer owns where focus goes next". Sibling, pre-existing:
  `compute-error` also falls to the quiet line in the panel — file with this, fix together.

### The couple's own data — no draft saving, no format migration, no way to delete

`L` · **pilot** · filed 3× — `A45`, `A49`, `A53`

- An interrupted intake loses the entire household — no draft persistence, no resume, and the tool promises "about five minutes"
  - ✅ The WARN half shipped 2026-09-03: `IntakeApp` arms `beforeunload` on two derived operands —
    the disk-derived "would a reload lose typed work?" (`resultSave.ts unsavedWorkPending`) OR an
    open entry buffer (`intake/unsavedBuffer.ts`: AccountEntry, OtherIncomeEntry, the budget
    builder, the Roth lever each hold while their local state differs from its seed) — through
    `ui/unloadGuard.ts`, which pairs the dialog with the PWA update-apply hold so "Refresh now"
    refuses (and says so, `copy.updateHeld`) instead of racing the dialog after skipWaiting; the
    draft operand disarms the instant the ceremony commits (`SaveFlow onCommitted`).
    Persistence/resume itself stays open here — a plaintext draft outside the encrypted vault is a
    security-posture ruling, not a build.
  - ⚑ Accepted residuals of the warn half (2026-09-03 review; each bounded, none a build without a
    ruling): a single un-blurred field's in-progress text (blur-commit, fields.tsx) · the first
    arming edit of a session can race the passive effect's listener registration when the
    reload-button click is the blur (one field) · `memoryModel.ts ensureSeed()` mints the CRN seed
    outside `notify()` — harmless today (every seed/vault carries one), a latent false-arm if a
    seedless draft recomputes before typing (fix: mint through `update()`) · a read-only tab's
    refusal remedy is a reload and an edit there arms the dialog on that very remedy — truthful,
    noisy · the single-pick sheets (SequencingControl, HealthcareSheet) do NOT hold by judgment (a
    differing radio is a one-tap preview) — flip it in `unsavedBuffer.ts`'s header if his eye
    disagrees.
  - ⚑ Cross-reference (2026-09-03): the completed-intake dead end made this loss reachable in ONE
    refresh — finish intake with one gated fact blank and the page had no door at all. The door is
    back (`IntakeApp`'s `computing` no longer conflates the idle-with-missing-facts frame with the
    crunch); what remains here is the persistence question itself, a security-posture decision
    (plaintext draft outside the encrypted vault) — never a build without a ruling.
- The schemaVersion "migration ladder" does not exist as code — it is a refusal, so the first bump to v4 strands every saved plan
- No user-facing way to delete the vault — the couple's entire net worth cannot be removed from the device that holds it

### The solve lane — long runs, no cancel, and a silently frozen tab

`XL` · **pilot** · filed 3× — `A55`, `A6`, `S70`

- The main-thread engine fallback freezes the tab for the whole solve and never says so
- The WASM port — the measurement gate is BUILT and has fired; the port itself is deferred
- SOLVE LANE — cancel is dark + the deferred interactive tier

## Tier 3 — Briggsy’s call (taste, scope, one-way doors)

### The completed-intake door's IDEAL shape — quiet hatch, primary "finish" CTA, or re-enter at the step

`S–M` · **briggsy** · filed 2026-09-03 (the 2026-08-20 intake walk's finding 1, decision half)

- What SHIPPED 2026-09-03 is the quiet hatch the plan already ratified: on a completed intake with a
  required fact still blank, "The assumptions behind this" renders over the "Still needed: …" strip,
  its aria-modal echo names the facts, and the panel rows (or "Walk through everything again") are the
  way to supply them. It reinterprets the LETTER of the 2026-07-02 "remove the opportunity" ruling
  (idle/pending ⇒ the row is withheld) to honor its RATIONALE (the crunch + the remedy carve-out) —
  flagged for the owner's audit, reversible, one frame.
- The fork that is his: keep the quiet hatch as the door, add a PRIMARY "finish the missing fact"
  action on that frame, or re-enter intake AT the missing step (`IntakeFlow` has no start-at-step
  API — `flow.tsx` `useState(0)` — so that arm is a new prop plus a scope call). And the frame's
  strip lead "Your answer takes shape as you go." is mid-intake copy on a FINISHED intake — a tone
  call, Caddie-clearable under the batched-oracle law or his words.

### The aged surface — every 2026 plan changes wording on 2027-01-01, unreviewed

`M` · **briggsy** · filed 1× — `S39`

- Mid-flight Roth conversion: engine re-anchoring unit + the withdrawn two-futures preview (Briggsy's call)

### The essentials median line on the band

`M` · **briggsy** · filed 2× — `A5`, `S26`

- The essentials median LINE drawn on the band
- The essentials median line — Briggsy's call; the pilot's filed recommendation is DO NOT BUILD as specced

### Two unruled honesty questions — the expiring-tax-law caveat and the per-strategy floor verdict

`M` · **briggsy** · filed 1× — `S73`

- PER-ARM FLOOR VERDICT — never ruled

### `doctorStaleVault` / what a two-year-old saved plan should mean on return

`L` · **briggsy** · filed 4× — `S20`, `S4`, `S41`, `S49`

- The `doctorStaleVault` defect — surfaced by the S6 plant, filed into UNFINISHED FIXES
- HIS EYE — ?vault=stale's MEANING ruling
- ⚑ `doctorStaleVault` breaks the PersonInputs model invariant and costs ?vault=stale its verdict — RULING FIRST
- `doctorStaleVault` invariant break — `?vault=stale` resolves BORDERLINE where fresh `retired` resolves ON-TRACK

### The charts' framing — whose range is shaded, which odds the ladder quotes, what the axis counts

`L` · **briggsy** · filed 6× — `A29`, `S2`, `S29`, `S30`, `S56`, `S64`

- The 2026-07-30 date-band FLIP shipped with its own council's binding ship gate undischarged — five faces changed, none cold-read since
- HIS EYE — the money-chart framing fork
- S6 (a) the two-odds collision on datesplit — rule it WITH Card 2, not ahead of it
- S6 (b) the money chart's essentials-world-under-a-lifestyle-headline — PARKED-FOR-BRIGGSY framing fork
- LONG-HORIZON BAND-SCALE SQUASH — his tone call on the honest-as-is squash, plus the latent U8 tier-persistence bug
- THE LADDER AXIS UNITS — a HIS-CALL fork, no prescription writable until he rules

### Budget product forks awaiting his ruling

`L` · **briggsy** · filed 3× — `S53`, `S66`, `S77`

- The scoped OOP-only `healthcare` budget category — PARKED for his eye
- ⚑ THE BUDGET HEALTHCARE-CATEGORY FORK — a one-way door the batched-oracle grant does NOT auto-clear
- ⚑ GATED — the budget's state-adaptive second beat

### Unscored Caddie tape rows plus the four aged-surface tone calls due before 2027-01-01

`L` · **briggsy** · filed 7× — `A28`, `A34`, `S34`, `S36`, `S5`, `S57`, `S58`

- Aged surface arms for real households — 2027-01-01 (tone calls still unreviewed)
- Sixteen tape rows sit unscored, and the two most recent walks have no tape row at all
- HIS EYE — the stacked tape rows plus the parked U17 aged-surface tone calls at the ?vault=datearrived walk
- HIS EYE — U17 tone calls on the stacked tape rows, deferred to the ?vault=datearrived walk
- HIS EYE — the stacked tape rows (07-15 → 07-23), which also score the Opus-vs-Sonnet Caddie flip
- HIS EYE — the stacked, unscored Caddie tape rows 07-08 → 07-23 (six sub-items a–f) + the standing O16 tape-watch
- THE AGED SURFACE — four tone calls at ?vault=datearrived, his eye due BEFORE 2027-01-01 (a dated deadline, not 'later')

### Parked tone residuals — survivor label, fold points, design-council leftovers, and the stale his-eye queue

`L` · **briggsy** · filed 3× — `A37`, `S55`, `S6`

- Card 12's residuals — the survivor label orphan and door 4's phone fold — were PILOT-CLEARED "with fixes filed" and the fixes did not ship
- Parked pre-grant tone cold-reads: the survivor fold + the design-council CF items (CF3/CF4/CF5/CF2) + two cosmetic design advisories
- HIS EYE — on-surface re-audit of the two Card 9 / GoalPicker fixes that shipped without it

### Caddie walk-and-chair debt on four changed or never-capturable faces

`L` · **pilot** · filed 6× — `S14`, `S15`, `S28`, `S35`, `S48`, `S8`

- The unchaired Caddie bundles — `?vault=rec`/`recold` four door sheets
- The unchaired Caddie bundle — the `datesplit` tier transient cold read
- NEW cold-read surface never looked at: the datesplit tier transient (a caveat that retracts itself)
- Cold-read + chair the date-window edge hedge (self-retracting caveat)
- Two S4 sentences have NO live cold-read path — the nameless aggregate and the reworded contribution line
- THE UNCHAIRED CADDIE BUNDLES — now actually walkable, must be re-walked

### Reading order and rhythm never graded — three refusals in a row, and the whole phone fold

`L` · **briggsy** · filed 3× — `S3`, `S32`, `S63`

- HIS EYE — the three-doors rhythm on ?seed/?vault datemixed
- S6 (e) THE RHYTHM HALF — three doors refuse in a row on datemixed (a tone call)
- THE PHONE-RHYTHM PASS — STANDING, OWED, never graded

### Armed copy and framing forks awaiting his ruling

`XL` · **briggsy** · filed 3× — `S59`, `S61`, `S62`

- BLOCKED, NOT DROPPED — the no-dollar compose face has no live witness; ultimately HIS call
- TWO ARMED COPY/FRAMING FORKS awaiting his read — the F3 legend dissent (O14) and the 'elsewhere' uncapped grade (O15)
- THE FIDUCIARY'S CURRENT-LAW-AS-WRITTEN CAVEAT — his yes/no, never a rider; unanswered since 2026-07-09

## Tier 4 — hygiene (no user-visible wrong answer)

### `verify:fit` is BLIND to the recommendation surface — every "re-measure under the fit gate" prescription aimed at it is unexecutable

`S` · **pilot** · filed 2026-08-03 (verification fleet)

- `e2e/vertical-fit.spec.ts:391-397` **explicitly excludes the committed and held recommendation
  renders** — a live solve is 80–200s against the spec's 120s budget (confirmed empirically 2026-08-03:
  a dev-build `?seed=nc` solve took **~11 minutes**). Only an *injected* `.rec-grade` lockup is measured.
- So any queue item prescribing *"seat it and re-measure under `pnpm verify:fit`"* for that surface is
  **not executable** — new lines in `.rec-committed__rest` need a **manual 1536×791 measure** against the
  protected in-frame R13 disclaimer.
- **The "~89px headroom" figure is not this surface's.** It is the SPINE idle frame
  (`vertical-fit.spec.ts:1773`), a once-measured prose number the spec never asserts — it logs headroom
  (`:1845`) and asserts only binary in-frame relations. The committed frame's headroom is **unmeasured**.
- The date route scrolls BY DESIGN (spec header `:21-22`); its arms assert **order** only.

### Health-constant riders — Medicare-trend fixes and pinning the out-of-pocket figures

`M` · **pilot** · filed 2× — `S69`, `S81`

- U15 / MEDICARE-TREND — three fixes riding the next healthOverlay/taxOverlay commit
- VERIFY-OWED — pin the OOP-medical figures to the primary BLS table

### Cold-read path debt — changed door sheets, unaudited fixes, and sentences with no way to be seen

`L` · **pilot** · filed 1× — `S40`

- ⚑ Roth door tone call routed to the Caddie panel, NOT pilot-fixed

### Unscored Caddie tape rows + the increment-4 residuals

`L` · **pilot** · filed 1× — `S76`

- CADDIE INCREMENT-4 RESIDUALS — move them out of TODO.md

### Open copy obligations — the research claim, the O-lane sentences, and the budget's sticky-essentials note

`L` · **pilot** · filed 3× — `S52`, `S75`, `S78`

- The budget sticky disclosure — `budgetModel.ts:22`'s "(flagged in TODO)" points HERE
- O-LANE COPY MECHANICS — each rides its surface's next touch
- THREE COPY OBLIGATIONS

### The gates that don't bite — registry depth, copy scope, colour probe, missing arms

`XL` · **pilot** · filed 14× — `A41`, `A42`, `A43`, `A44`, `S10`, `S11`, `S22`, `S23`, `S27`, `S43`, `S50`, `S51`, `S67`, `S68`

- R7's compile-enforced assumption registry is ONE LEVEL DEEP — the fix is named in its own comment as 'cheap' and deliberately not shipped
- The intake picker's never-color-alone signal is held by CSS text + a class-name assertion — no computed-style gate anywhere
- copyGuard's honesty gates are prefix-allowlist-scoped for FLAT keys with no forcing function on new ones — the same hole already fired once
- blockBootstrap's original tautology survives beside its own replacement
- The budget readout's min-block-size is a FLOOR, not the fixed height insight 035 claims
- The CVD crops prove PRESENCE only — the reader LENS is unautomated
- If the SS spousal-rate runtime withhold is ever revisited, it owes the `recHold*` control-scoped sweep
- Any future dated tripwire must NOT be worded as detecting enactment
- Missing regression arm: nothing pins fan-on ≡ fan-off with a budget present
- `appDefaultVersion` era arm has no BEHAVIOURAL witness until a second era ships
- False source comment (a) — `partBTrendVintage`'s "no exposure gate" clause in `model.ts`
- False source comment (b) — kill "the record stores the seed" in Plan 4 BEFORE S5 mints
- DEFERRED BUILD — the richer market draw: block-bootstrap + stochastic correlated inflation
- THE RICHER MARKET DRAW — block-bootstrap + stochastic correlated inflation

### Deferred engine builds and the missing regression arms

`XL` · **pilot** · filed 1× — `S80`

- SMALL-DEFERRALS BUCKET — nine items, each on its OWN trigger (scrub e2e · DateBand band · 2 AssumptionPanel · 5 small)

