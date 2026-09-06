# The Back Nine — Open Backlog

> The complete open register *(this header is GATED — `pnpm verify:doc-stats` reds when its numbers disagree with the body below or when any other doc re-types the count)*: **58 open items** (66 entries, 8 closed and kept as records; two entries are half-closed and counted open — the runner-up, and the unwitnessable household whose mechanism shipped while its sentence stays open — re-counted 2026-09-06, when two Tier-3 entries moved in from the queue, six entries were filed from the as-built doc rewrite, and two more from its skeptic passes: plan 4's three unbuilt U17 action-warning branches, and the `appDefaults.ts` re-save that reclassifies a took-the-default household as an overrider; two hygiene entries from the morning's completion check — the state-tax roster's two re-verify dates, and the solver profile's `rankableCount`) consolidated
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
> prescribed remedy would have re-opened the hole `stateTax.ts:422-431` was minted to close. And the heir
> entry (`:370`) still asserts present-tense a clause the XS half removed on 2026-08-02.
>
> **Anchors throughout this file were re-verified 2026-09-06** (a verify→skeptic fleet over 646 line-numbered citations across the doc set: 310 relocated, 12 retired as gone, 58 inside kept-for-the-reasoning blocks left as written). They drift again with every commit — still open every cited line before acting on it.
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
  **`copy.ts:1224-1225`**. The panel toggle (`AssumptionPanel.tsx:478-481`) writes `spendEntryPeriod`
  only — the stored amount holds and the SHOWN amount jumps exactly 12× (`:281-286`). The
  identical-looking INTAKE segment (`questions.tsx:432-450`) does the **opposite**: digits hold and
  `annualSpendingReal` re-bases 12×. That sentence is the only thing distinguishing the two controls, and
  it says *"switching this never changes the amount."* Flip to "Each year", see 78,000 where 6,500 was,
  believe the sentence, retype 6,500 → the plan runs on **$6,500/yr**. Nothing catches it:
  `PANEL_PROVENANCE` (`AssumptionPanel.tsx:258`) disarms `spend-period-unconfirmed`, and 6,500 is under
  `SPEND_AMBIGUOUS_MIN` anyway.
- ⚑ **A first replacement draft was written and REJECTED — do not re-derive it.** It dropped the live
  string's *"entered"* clause for *"reads on this sheet — the same money either way."* That is **false**:
  both spend commits (`AssumptionPanel.tsx:601-611`, `questions.tsx:409-422`) multiply by 12 under
  `'month'`, and `spendEntryPeriod` is **persisted** (`scenarioCodec.ts:711`), so the toggle sets the unit
  for the NEXT typed figure, across sessions. Any rewrite must keep the entry-unit disclosure. Also fix
  the now-overbroad comments at `copy.ts:1198-1200` and `AssumptionPanel.tsx:244-245`
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

### The saved-record card does not name the strategy (Briggsy ruling — its false "still matches" line closed 2026-08-03)

`M` · **briggsy** · filed 5× — `A30`, `S1`, `S13`, `S31`, `S38`

- ✅ **CLOSED 2026-08-03 (`bd851f24`)** — the card asserted "It still matches your plan as it stands today." while the door beneath it showed the household never executed the advice; the holds line is now `recommendRecordHolds` = "It still lines up with the numbers you've entered." (`copy.ts:1445`, the defending comment `copy.ts:1416-1429`). *The live half of this entry is the strategy-naming ruling below.*
- HIS EYE — the record card's strategy naming (half 2)
- S6 (f) HALF 2 — naming the strategy on the record card (a Briggsy ruling, not a build)
- ⚑⚑ RECORD CARD HALF (2) — naming the strategy on Cards 6-7 (Briggsy ruling, DO NOT PILOT-FIX)
- HIS EYE — the only thing blocking product progress (six open items)
- ⚑ **A drafted fix was REFUTED 2026-08-03 — do not execute the obvious one.** The reasoning was going to
  be *"`noChange: false` means the winner differs from the household's plan, so 'it still matches' is
  false."* **That is engine-wrong:** `noChange` compares the winner to a FIXED conventional prior
  (`select.ts:383-398`, ` (⚑ gone 2026-09-06 — the cited claim — that noChange compares the winner to a FIXED conventional prior — no longer exists anywhere: isNoChange (select.ts:383-396) anchors on the USER baseline and falls back to the conventional index only when no user baseline was enumerated, so relocating the number would attach a line to an inverted claim)`), never to the entered `drawdownPolicy` — so a defending comment built on
  it would mint a NEW false engine claim into `copy.ts`.
- ⚑ **`?vault=rec` CANNOT WITNESS this defect.** `devSeeds.ts:854-856` → `retiredOnTrack` holds **one**
  traditional IRA, so `proportional` and `taxable-first` are the identical decumulation and the
  cold-read's *"SWITCH to Brokerage first"* names an account that does not exist. **A multi-account
  witness plant must be built before any regression pin here means anything** — which is what pushes this
  from `S` to `M`.
- ⚑ Anchor drift: `noChange: false` is `devSeeds.ts:1435` (not `:1322`); the winner literal is `:1421`
  (not `:1308`). `copy.ts:1409-1413` is the card-FAMILY header — nothing defends the holds sentence
  today, so the fix must **add** a comment, not rewrite one.
- ⚑ **The semantic witness ("the advice not taken") — the debt record, moved from the queue 2026-09-06:** ⚠️ **The 2026-08-03 verification debt, CORRECTED 2026-08-14 — it was overstated, and the half that
  remains is narrower.** This block used to read *"the record card's HOLDS face has never been seen;
  `?vault=rec` cannot show it."* **The FACE has now been seen** — `?vault=rec` renders
  *"It still lines up with the numbers you've entered."* at 1536×791 (observed in passing while driving
  the heir-bracket seat, which that plant also carries). The seed table said so all along
  (`rec` · `recold` → *holds / superseded*); the debt note contradicted it.
  **What `?vault=rec` genuinely cannot witness is the SEMANTIC case** this entry is about: its base is a
  single $1.055M IRA, so every withdrawal order is the identical decumulation and no household can
  visibly *not have taken* the advice. ⚠️ **RE-SCOPED 2026-08-20 — the prescribed save + re-entry on
  `?seed=buckets` RAN, and it cannot witness the semantic case either.** The buckets leave-more crown
  is the household's OWN proportional order (`noChange` — witnessed live), so there is no advice to
  not-take; what the run DID witness is the full organic record pipeline (mint → persist → unlock →
  holds → demote → re-promote), which had never been seen outside hand-planted payloads. The semantic
  witness needs an **ACTIVE multi-bucket crown**, which no current seed produces — probe
  `buckets`+pay-less-tax in vitest first, and mint a seed only if that misses too.
  **Read the debt as "the advice-not-taken case", never "the face" — and know its prescription has now
  missed twice.**
  ✅ **Free finding from the same drive:** editing an assumption demotes the record live —
  holds → *"It may no longer fit the two of you."* The fingerprint staleness coupling is now
  witnessed end-to-end, not merely asserted.
- ⚑ ⚑ **THE PAY-LESS-TAX HUNT RAN SAME-DAY, AND THE FULL-PRECISION RUN REFUTED ITS OWN FAST-COUNT
  PROBE — the advice-not-taken prescription has now missed THREE times.** At 256 paths the probe hit
  (`winner grid:bracket-fill:0` ACTIVE over `baseline:proportional:0`, `noChange: false` — probe JSON
  in the session scratchpad), but the 16k-path browser drive landed the NO-DOLLAR register — *"You're
  already on one of the strongest paths"* + the coin-flip hinge (*"which one edges ahead can come down
  to chance"*). Read per the four-disjunct law: at full precision the bracket-fill edge sits inside
  display noise, so the surface honestly declines to urge the switch. **"Precision moves the crown"
  is now measured TWICE on this one seed** (leave-more's probe crown carried a conversion the 16k run
  dropped; pay-less-tax's probe crown was ACTIVE and the 16k run collapsed it) — `buckets` is
  precision-MARGINAL by construction, which is exactly why both goals grade "A close call".
  **The honest state of entry 4's semantic witness:** no current seed renders the advice-not-taken
  frame at full precision. The fork: (a) mint a seed tuned so an order gap SURVIVES 16k paths — a
  size-L parameter hunt (the `dateinvert (c)` class, its own session); or (b) accept the synthetic
  RecommendationSurface/recommendationView coverage as the frame's permanent home — the same
  conclusion `devSeeds.test.ts`'s 2026-07-22 note reached for the old no-change shape, and the
  PIPELINE half (mint → persist → unlock → holds → demote → re-promote) is now witnessed live
  regardless. **Lean: (b)** — the render is pinned synthetically, the pipeline is witnessed, and the
  hunt's marginal value is one eyeball frame; but the scope call is his if (a) tempts anyone.

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
  filed.** `select.ts:280-282`'s conventional-incumbent tie-break crowns the non-converting baseline as
  runner-up whenever only one conversion's advantage survives shrinkage — so
  winner-converts/runner-up-doesn't is the **natural** shape for a well-funded leave-more household, not
  a rare one. Real guard is `select.ts:333-336`; the throw is `gradeCalibration.ts:172-177` via
  `gradeOnFamily:200`; the catch narrow is `solve.ts:349`, rethrow `:350`.
- ⚑ **The engine one-liner is HALF the fix.** `recommendationView.ts:437-446` maps `withheld` to the
  SAME generic `copy.recommendUnavailable` as `compute-error`, so widening the guard alone converts a
  crash into an **identical generic card**. Route it through `heldView`'s shape (`:329-335`) with a new
  `recHoldDemotionAxis` key — `copyGuard.ts:119` makes `recHold*` require-hedge, so it must wear a modal.
- ⚑ **Four comments would become NEW false claims** and must be swept in the same commit —
  `select.ts:134-135`, `select.ts:321-328`, `solve.ts:151-152`, `solve.ts:484-487` each currently assert
  the `leave-more` arm *"falls through to a THROW."* This is the exact class `30e5bc31` just cleaned up.
- ⚑ **RED-GATE RISK:** `select.test.ts:293` asserts `kind === 'selected'` on a live-shaped leave-more
  world, and `:294`'s comment literally encodes the defect (*"leave-more never routes to withheld"*).
  Check it before shipping. No existing fixture covers leave-more + a converting winner.
- ⚑ **BRIGGSY DECIDES:** on `leave-more` a converting winner is the EXPECTED crown for a well-funded
  household, so an honest withhold likely fires for the **modal** target user — a hold, not an answer.
  Ship the hold, or go straight to calibrating the demotion width on the dollar axes?

### ✅ CLOSED 2026-09-04 (the mechanism) — `?seed=failing` mint-fails: the household the harness cannot witness is a TYPED refusal now, not a code defect; its own sentence stays open, his

`M` · **pilot (the mechanism, shipped) · briggsy (the sentence)** · filed 2026-08-05 in `TODO.md` only (the witness probe, "7b"); register entry filed with the build

- **What shipped.** Ranking stability's perturbation law needs its ONE +$1,000 step on the first anchored
  conversion candidate to MOVE that candidate's own recorded decision surface (insight 029's presence
  companion). On a household exhausted inside the window (the seed: a $60k IRA under a ~$72k year-one
  draw, both retired, low SS — every path depletes in year 0 before the year's tax accrues, so every
  recorded vector is zero whatever is converted; $50,268 and its $51,268 variant both run UNCLAMPED
  inside the pool, and $200k moves nothing either) nothing moves, and the harness binned that
  `mint-failed{stability}` — the bin reserved for
  HARNESS defects — which `recommendationView` rendered as the generic *"We couldn't work out a
  recommendation just now — adjust a number, or re-open this, to try again"*: a retry that cannot succeed
  (insight 109's shape), on the cohort least able to afford a wrong frame. Now every stability violation
  carries a TYPED class beside its prose (`rankingStability.ts` `StabilityViolationClass` — five harness
  classes, two household classes), `householdVacuity()` names the household class iff EVERY violation is
  household-conditioned (one harness-class violation beside it ⇒ the gate broke ⇒ `mint-failed` still
  wins), `solveWithMint` returns a new `SolvePayload` arm `{ kind: 'unwitnessable', reason:
  'perturbation-inert' | 'perturbation-infeasible', detail }`, and `committedView` routes it to the humane
  HOLD (`recommendHeldHeading` + `recHoldGeneric`) — a decision the surface explains, never a malfunction.
  The bin is named off the TRIGGER — the harness's own step leaving the varied candidate's surface
  byte-identical — never the verdict, and the criterion is the SURFACE, never the pool's room for the
  dollars: it is verdict-blind (a $900k household with pretax 0 reaches it by the OTHER route, both arms
  clamping to `min(planned, pretax − rmd)` — the solveEntry test) and a failing household whose surface
  still responds never reaches it. ⚑ The first draft of every comment in the build said "the pool cannot
  absorb the perturbation" — the review fleet's engine lens refuted it on the seed itself (the pool
  absorbs it with $8,732 to spare); a mechanism inferred from the verdict is not the mechanism the code
  ran. Insight 114.
- **Witnessed.** Both goals through the real builder + engine (`devSeeds.test.ts`, 256 paths — the
  household dies in year one, so the solve is sub-second even at full precision) and live in real Chromium
  at 1536×791 on `?seed=failing` → leave-more: the held card renders ~4 s after the goal pick, the
  unavailable note is gone, console clean but the known favicon 404. Three mutants killed (the classifier
  returning null · the view routing to unavailable · the mortality-net seat dropped); the mutant REVERT
  landmine it cost is in `TODO.md`.
- **OPEN, HIS — the sentence, AND the heading.** `recHoldGeneric` is the interim reason line by decision
  (hedge-bearing, catastrophe-clean, nothing in it false), but FOUR temporal promises ride the frame and
  none is keepable for a structurally inert household — "for now", "can't yet stand behind" and "we'd
  rather wait than guess" in the string, plus a second "for now" in `recommendHeldHeading`, which is
  SHARED with the token-withheld and demotion holds. So the household-true frame is TWO keys, not one:
  his N=1 sentence as its own reason key, and its own heading (a heading field on the held view, or a
  second key) — swapping the reason line alone leaves a "for now" on the frame. Insight 101 binds the
  sentence: true across the predicate's WHOLE extension — every route to an unmoved surface (both arms
  clamped to the same headroom; a household exhausted inside the window; both arms infeasible), never
  "already failing", and never "your pool can't take the dollars" (false on the seed). Whatever key
  lands there is added BY NAME to `isMortalityKey` (`copyGuard.ts` — `recHoldGeneric` joined that net
  the same day because its readers INCLUDE this cohort). The seam is `unwitnessableReasonText`
  (`recommendationView.ts`); the render pin to extend is the `unwitnessable household` arm in
  `recommendationView.test.ts`.
- **Measured, not fixed:** the post-solve frame on this seed sits **149 px past the fold at 1536×791**
  (document 940 / viewport 791). The old unavailable note measures 74 px in the same slot against the
  held card's 110 px, so **113 px of that is inherited** — `failing` is not a fit-gate spine seed and the
  committed / held renders are outside `verify:fit` by record (`vertical-fit.spec.ts:392-402`). The
  recommendation channel's post-solve frames are unmeasured territory on every seed (the `TODO.md`
  landmine); this is the first measured number.
- **Edge accepted:** a rail-anchored amount landing EXACTLY on the post-RMD headroom would make the
  +$1,000 variant cap to the SAME conversion (`taxOverlay.ts:1444` — `min(planned, pretax − rmd)`, the
  RMD reserved first) and read as `perturbation-inert` on an otherwise rankable household — a
  to-the-dollar coincidence of the rail search against the pool (`candidates.ts` rejects amounts ABOVE
  headroom, not equal), and the old bin refused it too; it now refuses more honestly. `perturbationPair`
  perturbs the FIRST conversion candidate only; on this seed all four share one bracket-edge amount and
  every amount from $0 to $200k ties, so the one step the harness takes is representative here — but the
  gate witnesses ONE step, and any sentence must claim no more. `perturbation-infeasible` (both arms
  `SimInfeasible`) has no known sole-violation construction — infeasibility is world-conditioned, the
  sibling goes infeasible too and `sibling-unscored` co-fires ⇒ mint-failed — so it is pinned by the
  partition-typed constructors (`harnessViolation` / `householdViolation`: a cross-partition mis-tag is a
  compile error), not by a world.

### The goal picker tells an already-failing household "with the basics covered"

`S` · **pilot (the gate) · briggsy (the words)** · filed 2026-09-04 (seen live on the `?seed=failing` witness walk)

- `copy.goalPickerIntro` — *"With the basics covered, pick the one thing your plan should lean toward."*
  — renders unconditionally (`GoalPicker.tsx:75`) above the two goals, and the picker opens from the "See
  the recommended strategy" door on EVERY spine verdict, including *"Already short — 0 of 10 futures your
  plan covers"*. On that household the lead is FALSE: the basics are not covered, and the sentence asserts
  the one thing the verdict directly above it just denied — the calm-but-wrong shape, on the cohort least
  able to absorb it, one tap before the honest hold of the entry above.
- The picker is verdict-blind by construction (props `open · current · onPick · onClose`; no outcome
  state reaches it), so the GATE is a build: thread the spine's outcome state (or a `basicsCovered`
  boolean derived where the door is offered, `Result.tsx`) and pick a verdict-true lead — or make the
  lead verdict-neutral. The WORDS are his; the fork (a second key for the failing cohort vs one neutral
  lead) is a Caddie card, not a park. Whatever key renders to the failing cohort joins `isMortalityKey`
  by name (the entry above's law).
- Hiding the strategy door on a failing household is a FRAMING call, not a copy fix — that door is where
  the household is told, honestly, that the harness cannot rank it.
- ⚑ **Folded 2026-09-06 from the queue's superseded b9-3 plan (its item 11) — the gate mechanics, pilot:** The goal picker's lead on a failing household (S): `copy.goalPickerIntro` — "With the basics covered,
  pick the one thing your plan should lean toward." — renders unconditionally (`src/intake/GoalPicker.tsx:75` — the INTAKE layer, there is no `src/ui/GoalPicker.tsx`) and the
  picker opens from the strategy door on EVERY spine verdict, so an "Already short — 0 of 10" household is
  told the basics are covered one tap before the honest hold (seen live 2026-09-04 on the `?seed=failing`
  witness walk). The GATE is pilot — the picker is verdict-blind (props `open · current · onPick ·
  onClose · restoreFallback`, `GoalPicker.tsx:37-53`); thread the outcome state or a `basicsCovered` boolean from where the door is offered
  (`Result.tsx` — TWO doors, not one: the invite at `:550` is `focusKey`-gated, the re-pick at `:493` sits
  inside `RecommendationSurface`; gate the lead from ONE predicate both doors share, and do not write
  "indeterminate never reaches here" into the comment — it does, `snapshot.displayed` is null there, that
  is what saves it). The register's standing law rides with it: whatever key renders to the failing
  cohort joins `isMortalityKey` by name (`backlog.md:359-360`). The WORDS are yours, and the fork (a second key for the failing cohort vs one
  verdict-neutral lead) is a Caddie card. Register: Tier 0 "The goal picker tells an already-failing
  household".

### Post-65 non-qualified HSA money is silently forfeited

`M` · **pilot** · filed 1× — `A24`

- R38 — the post-65 non-qualified HSA path is unrouted and its conservative forfeit is disclosed only in a code comment
- ⚑ **Negatives (the register's half — the live prescription is the ranked entry in `TODO.md`):** the false *"(conservative, disclosed)"* comment at `healthOverlay.ts:747` was corrected 2026-08-02 — the disclosure itself is still OWED; `taxOverlay.ts:1803-1805` still calls the forfeit *"a DISCLOSED non-feature"* — the same false claim in the file that owns the mechanism; sweep both in the disclosing commit. **Do not write "stays put" / "simply sits"** — the balance is DESTROYED (`buckets = EMPTY_BUCKETS` → `terminalHsaReal = 0` → bequest $0); the sentence must say DROPPED, and must hold across all three zeroing branches (each fires because the path DEPLETED, so a bequest-framed sentence names a state the engine cannot reach — the honest harm is a plan counted as run-out while HSA dollars sit unspent). "draw … HSA" reds `copyGuard.ts:250`; "can't run out while the HSA lasts" reds `FALSE_CERTAINTY_INTERNAL`.
- A SECOND owed HSA disclosure, filed 2026-09-06 from the accumulation record's rewrite: §6 there assigned D2 the sentence *"if you keep funding an HSA after you stop full-time work, your real free-date may be slightly earlier"* with a copyGuard catalog scenario. No such string exists in `copy.ts`; the direction is conservative (the model under-credits the funding), so it is a missing explanation, not a wrong number — ship it with the forfeit sentence above, in the same "What this leaves out" home.

### Long-term care is neither modeled nor listed as left out

`M` · **pilot** · filed 1× — `A48`

- Long-term care — the largest un-modeled retirement risk — is neither in the model nor in the OUT-but-disclosed list the product otherwise keeps religiously
- ⚑ **Negatives (the register's half — the live prescription is the ranked entry in `TODO.md`):** the R13 disclaimer is the WRONG home (vertical-fit pinned); the recommended home is a third *"What this leaves out"* section of the assumptions panel (`src/intake/AssumptionPanel.tsx`) — **not** data-only (`METHODOLOGY_DISCLOSURES` rows render inside section a's "On your behalf"). **Scope is the HSA forfeit + LTC only** — NIIT is NOT homeless (`recommendationView.ts` emits it on every committed rec; the Healthcare sheet carries it) and a silent third home breaks the one-honest-home law. A heading literally "What this leaves out" that names two items is itself a completeness claim the constants falsify (`health.ts` declares four more OUT-but-disclosed facts) — scope the heading or name them. `Row` requires a `seat` from the CLOSED `AssumptionSeat` union, so a leaves-out row is a hand-rolled `<li className="ap-row">` or a registry extension. The TODO entry's anchors drifted twice in a month (+14, then +62/+101) — open every cited line.

### The staleness clocks — a false alarm today, and the state-tax arm parked

`M` · **pilot** · filed 4× — `S44`, `S45`, `S46`, `S47`

- ✅ **Date-route ACA clock over-alarm — CLOSED AS PHANTOM (2026-08-02).** It does not over-alarm: the date
  route simulates all 11 offsets (`dateSearch.ts:425/450/457`) and candidate Y=0 carries the base ACA
  stream **ungated** (`healthcareStreams.ts:158-160` → `windowStart = 0`, a pass-through), so
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
- Enforced in CI — `pnpm test` runs at `.github/workflows/verify-the-back-nine.yml:57`.
- ⚠️ Known and unchanged: a red tripwire reds the GitHub check but does **not** block a Vercel deploy.
  True of all three pre-existing tripwires — the house posture, not a gap this introduced.

### Pre-65 health insurance is priced with no cost growth, and the subsidy clawback is unmodeled

`L` · **pilot** · filed 2× — `A39`, `S25`

- Pre-65 ACA premiums are priced REAL-FLAT — the exact sin the Medicare council ruled solver-BLOCKING, with no trend, no oracle clause, and no disclosure
- ⚠️ **The fix is NOT a Part B copy-paste.** Part B’s schedule is built INSIDE the engine, which is why the oracle token can witness it; the ACA escalator lives in **intake** (`intakeMap.ts:336-345`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto intakeMap would be the exact lying-mirror `oracleToken.ts:113-119` warns about. The honest fix moves the schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1110`).
- ⚠️ Anchor corrections: `healthOverlay.ts:296` is a **closing brace**, not a consumer (real seam `taxOverlay.ts:1689` + `:1731-1738` → `healthOverlay.ts:270`); the strings claiming the coupling is priced are `copy.ts:944-947`, not `copy.ts:924`.
- ⚠️ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver block would hold for months over the whole pre-65 population. Near-term move is the copy swap at `copy.ts:944-947`. The excess-APTC field moved to `aca-last-verified.json:41` and `scripts/verify-aca-status.ts:40-72` never declares the key — **it is inert prose, not a gate.**
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
- ⚠️ **The obvious fix is REJECTED by shipped code — do NOT simply un-gate the premium.** `simulate.ts:913-919` refuses any finite-positive `enrolledPremium[t]` on a bridge year, so un-gating makes every date candidate fail: no answer at all, rather than a later one. `acaMagi` (`healthOverlay.ts:99-101`) also carries no wage term, so a priced year would be optimistic a NEW way. Scope is wider than filed — the gate zeroes `oopMedical` too (`healthcareStreams.ts:181`). And `healthcareStreams.test.ts:64` promises a pre-65 case that **does not exist in the file**, so the genuinely-broken case is untested.
- ⚑ **RE-SIZE `L` → `XL` (verification fleet 2026-08-03), and the reason is the fixtures.** The defective
  household **IS the canonical date fixture**: `intakeMap.test.ts:105-118` `completeDateDraft()` is a
  working person + a retired 60-year-old, used in ~18 assertions including the render-anchor coupling
  test at `:129-137`; `devSeeds.ts:127-181` `stillWorking` = **`DEV_SEEDS.date`**, the flagship
  `?seed=date`, clones it verbatim and its own comment says *"a pre-65 retiree so the ACA quote IS
  required."* So every cold read of the fuck-off date ran on the broken household — it is not
  "untested", it is asserted **GREEN**. `devSeeds.test.ts:90` pins `missingRequiredFacts → []` for
  EVERY seed, so the refusal channel reds the coupling battery + devSeeds until both fixtures answer the
  new question.
- ⚑ **"Refuse through the existing calm input-failure grammar" is NOT executable — that grammar cannot
  express this refusal.** `answerView.ts:221` maps `input-failure` to `fallback` and **drops `reason`**;
  `AnswerStrip.tsx:158-163` then renders `copy.answerIncomplete` + a MissingList built from the DRAFT. A
  household with no missing facts gets an **empty strip** — the "empty-missing dead-end"
  `intakeMap.ts:146` already warns about. A new `MissingFact` refusal variant plus a matching AnswerStrip
  arm is **mandatory, not optional**.
- ⚑ **Shipped copy CONTRADICTS the premise — it is not merely silent.** `copy.ts:207-208`
  (`healthQuoteHelp`) promises *"A quote for everyone under 65 in the household… The tool splits it by
  age for each of you"*, and `escalateQuote` (`intakeMap.ts:339-346`) really does include the retired
  spouse's age share — before `healthcareStreams` zeroes it. That line must change in the same pass.
- ⚑ **Pre-existing false claim in the channel this fix would reuse:** the two-HSA-owner model-limitation
  refusal (`intakeMap.ts:251-252`) already renders as *"Still needed: HSA"* under MissingList's lead
  *"The tool never guesses these — it prices only what you enter"* (`copy.ts:410`). That lead is
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

### A rental stream's real rise is unmodeled AND undisclosed — optimistic at the ACA cliff, with no cliff fixture

`M` · **pilot** · filed 2026-09-06 (the R40 record's as-built rewrite; every absence re-grepped by its skeptic)

- The record (`docs/decisions/other-income-r40.md`) rules the rental net-real-rise omission OPTIMISTIC and compounding at the 400%-FPL cliff — the miss there is an entire unsubsidized bridge-year premium — and ruled that the magnitude be DISCLOSED in the rental copy. No such disclosure exists in `copy.ts`'s R40 block.
- No rental-at-the-cliff fixture exists under any `__tests__` directory, and no integration arm asserts the ACA subsidy rise — the only healthcare-on R40 arms are age-67 Medicare households asserting Medicare cost, never a premium tax credit. A regression at the cliff is silent.
- Same family, filed here rather than as three entries: the alimony payer-death and the simple-COLA simplifications are optimistic and undisclosed on every user surface; the §86-once seam is pinned only on a pre-tax-only pool (`realizedGain ≠ 0` is never exercised with an R40 stream).
- Fix shape: one rental-copy disclosure sentence naming the direction (his words — copy), a rental household planted at the cliff in the healthcare test file, and one R40 arm with `healthcareEnabled` on a pre-65 household.

### The Social Security statement's default figure assumes continued earnings — a stop-early household reads a rosier at-FRA benefit and is never routed to the $0-future-earnings estimate

`S` · **pilot** (the routing) · **briggsy** (the words) · filed 2026-09-06 (the SS decision record §9; confirmed by its skeptic)

- The intake's SS amount help (`ssAmountLabel` / `ssAmountHelp`, `copy.ts`) warns only "not the one for age 62 or 70". The mySSA statement figure assumes earnings continue to FRA; a household that stops work early is overstated in the rosy direction, and nothing in `src/` mentions the estimator, future earnings, or the mySSA "$0 future earnings" setting.
- Fix shape: one help sentence routing a stop-early household to the mySSA estimator with future earnings set to $0 (the link home already exists — `linkFindSsStatement`, `questions.tsx`); the words are his.

### `belowFloor` stops at the overlay — a household under the 100%-FPL floor is never told

`M` · **pilot** · filed 2026-09-06 (the accumulation record's as-built rewrite; the absence re-grepped by its skeptic)

- `belowFloor` exists only in `healthOverlay.ts` (`:150`, `:303`, `:404`, `:411`) and its own test file. No consumer in `taxOverlay.ts`, `simulate.ts`, `dateSearch.ts`, the shared model or any UI file — the per-track floor disclosure `docs/decisions/accumulation-fuck-off-date.md` §6 owes was never threaded. The engine computes the flag and drops it.
- Fix shape: carry the flag through the yearly result to the readout the way `belowFloor`'s sibling facts travel, and disclose it on the health sheet (his words) — never a silent optimistic PTC on a household that qualifies for none.

### The survivor step-down attribution — "as one Social Security benefit ends" reads wrong for a pension-heavy household

`S` · **pilot** · filed 2026-09-06 (the U7 spec's as-built rewrite; confirmed by its skeptic)

- `verdictSurvivorStepDown` (`copy.ts`) attributes the whole monthly drop to Social Security. The figure also covers a lost pension or earned income — the minority case per the record, but a household whose survivor cliff is mostly a lost pension reads the cause wrong while the number is right.
- The revisit trigger the copy's own comment named ("when D2 wires real households") fired 2026-06-28 and never ran; the comment now points here.
- Fix shape: attribute by the dominant component (the engine already carries each stream's survivor variant), keep the median scope; the sentence is his words if it changes.

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
  2026-08-05; corrected against the source.) ⚑ **2026-09-06:** the clause was RESTORED on 2026-08-14 in the
  same change that shipped the heir-bracket seat — exactly the coupling this bullet prescribed — and lives at
  `copy.ts:2669-2670` under the comment at `:2659-2668` that states the both-ways coupling.
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
- ⚠️ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:167-174` mint-fails the roster *before* `solve()` runs, and `rankingStability.ts:224-237` knows only a conversion-**amount** perturbation — so dispatching the sequencing-only field would surface `mint-failed{roster}` **live**, the exact state `solveDispatch.ts:80` forbids in its own comment. Doing it properly needs a second validation law under every shipped recommendation, a one-way door on what "validated" means.
- **Near-term, honest, XS:** fix `copy.ts:1537-1538` only — it says a *withdrawal strategy* needs more pre-tax when only the **conversion** half does. Sequencing across taxable and Roth is real and rankable.

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
  content-free constant (`copy.ts:1699-1700`) naming neither arm, while `payload.runnerUp.id`/`.policy` sit
  unused. The winning-plan card's own vocabulary is now the obvious material for it.

### Date-route recommend-second parity — the working household gets no strategy at all

`XL` · **council** · filed 4× — `A1`, `A11`, `A17`, `S71`

- Date-route recommend-second parity gap — the entire still-working audience gets NO strategy recommendation, silently
- Not-yet-retired (working) household: the recommendation surface does not exist at all
- R10/R29 — recommend-second is entirely absent for a not-yet-retired (date-route) household
- ⚠️ **The filed "cheap interim" is WRONG — do NOT drop the `Result.tsx:485` gate alone** (`:476` at filing). It renders an **empty `<div>`**, not the refusal. And reusing `recommendSpineUnreadyNote` would tell a household with a COMPLETE answer that its answer is incomplete — a new false claim, worse than the silence it replaces. The honest interim is a route-true one-liner admitting the v1 limit, seated above `.result-quiet-row` on the DATE grid (`fuckOffDate.css`, not `confidence.css`) — the date arms of `verify:fit` assert ORDER only and the "~89px headroom" figure is the SPINE idle frame's (see Tier 4), so its vertical cost is a manual 1536×791 measure (corrected 2026-09-04). A chaired Caddie card ships the sentence; **the one token Briggsy holds is whether it promises parity.**
- DATE-ROUTE RECOMMEND-SECOND PARITY (+ Q1 survivalContext + heir bracket)

### The detail-door era — nowhere to see how a number was reached

`XL` · **briggsy** · filed 2× — `A4`, `S74`

- The "detail-door era" — the post-U16 unit that owns every filed detail-hunger residue
- THE DETAIL-DOOR ERA — its own post-U16 unit + walk

### The three U17 action-warning branches plan 4 specified and the build never shipped — same-strategy-degraded copy, the retroactive-ACA past-cost note, the gate-red branch on the token's withheld reason

`M` · **pilot** · filed 2026-09-06 (plan 4's as-built rewrite + its skeptic; all three re-confirmed absent from `src/` and from this register at filing)

- `docs/plans/4-recommendation.md:313` names all three as specified-and-not-shipped and records that none of them appears here; `:337` repeats them in the not-built list, and the ruling that keeps the register alive is `:23` ("the **action-warning copy register** (unchanged, still needed …)"). The finding is not new — only unregistered, which is what this entry fixes.
- **Same-strategy-degraded.** An invited re-solve that returns the SAME strategy with a fallen grade or a flipped delta sign owes copy saying so — the memory holds on identity while the confidence behind it moved. Confirmed absent: `grep -rn "same-strategy\|sameStrategy" src/` and `grep -rni "flipped delta\|fallen grade" src/` return nothing (every `degraded` hit in `src/` is worker-spawn or a view fallback). ⚑ Unlike its two siblings its reasoning is NOT kept below `docs/plans/4-recommendation.md:313` — that line's own parenthetical plus the ruling at `:23` is the whole of it, so whoever builds it starts from those two lines and nothing else.
- **The retroactive-ACA past-cost note.** The enhanced regime can be restored retroactively to all of 2026 — `src/engine/constants/health.ts:34` (H.R. 1834 §1(c) is tax-year based, and only for months a Marketplace premium was actually PAID), `:25`, `:104` — so a conversion or withdrawal the household has already executed can carry a different cost after the fact. The record answers FORWARD only: the ACA status rides the `healthcareVintage` stamp inside the record's era (`docs/plans/4-recommendation.md:315`), which demotes the saved verdict and says nothing about the past action. The specified line is at that same `:315` — *"a recent law change may apply to a past year, so an action you may already have taken could now carry a different cost — worth revisiting with a pro"*. Confirmed absent: `grep -rln "retroactive" src/` hits only `engine/constants/{contributions,health,types}.ts`, their shape test and `shared/model.ts` — nothing under `src/ui/` or `src/store/`. ⚑ The four dated legislative-status notes are NOT coverage: `acaCostStatus` / `…Enhanced` / `…Overdue` / `…EnhancedOverdue` (`src/ui/copy.ts:2398`, `:2402`, `:2411`, `:2413`) are all forward-looking — "Congress could still restore them — last checked …". ⚑ It must stay GENERIC: neither execution nor tax-year is tracked, which is why `:315` phrases it conditionally and routes to a professional. Any wording implying we know what the household did, or when, is a fabricated claim.
- **The gate-red branch on the token's withheld reason.** `SavedRecordStanding` (`src/ui/recommendationSaveView.ts:244-246`) resolves `holds | superseded` over the four trichotomy causes only (`src/store/savedRecommendation.ts:38-50`), and none of them says *we cannot currently stand behind this build's rankings*. The card's producer gates on phase / vault / record / save-readiness / date-route and never on the token (`src/ui/IntakeApp.tsx:271-284`), and the card renders in every solve state (`src/ui/Result.tsx:522`); the only token mention in either module is the SAVE gate (`recommendationSaveView.ts:140`), so token-withheld is handled at save time and nowhere at re-entry. The sharpest instance needs no code change at all: `aca-unverified` is a rolling 30-day window on `verifiedOn` (`src/engine/constants/solver.ts:70`, `:74`), so a deployed build ages into a withheld token while the fingerprint, `SOLVER_CODE_VERSION` and every rulebook stamp stay identical — no cause can fire, the returning household reads "It still lines up with the numbers you've entered." (`src/ui/copy.ts:1445`), and after taking the card's own re-open the withheld hold renders on the SAME frame as that reassurance. The per-reason wording to carry forward is `docs/plans/4-recommendation.md:316`: ACA status unverified → do not act until the status is confirmed; a rec-relevant primary still directional or ε uncalibrated → not validated on this version yet — never blaming the law when a primary is merely un-pinned.
- **Tier 1, not Tier 0, and the reason is narrow.** The holds line is scoped by its own defending comment (`src/ui/copy.ts:1416-1429`) to conjunct 1 — fingerprint identity — which stays literally true under a withheld token; the card quotes no remembered grade, verdict or figure; and the true reason is one click away through `withheldReasonText` (`src/ui/recommendationView.ts:334-349`), whose five arms U16 already renders on the live surface (`src/engine/validation/oracleToken.ts:43-49`). A missing disclosure branch, not a wrong number.
- ⚑ **Do NOT build the gate-red arm as a fifth `SavedRecommendationSupersededCause`.** A withheld token is not a demotion of the memory — the memory may be perfectly current. It is a property of THIS BUILD, so it belongs beside the standing split, never inside `causes`, whose exhaustive `Record` (`src/ui/recommendationSaveView.ts:218`) is the compile-time bind that fails the assembly site when a fifth cause lands; widening it would silently retire that bind's meaning.
- ⚑ **None of the three is card copy alone — the shipped card does not re-solve.** `Result.tsx:398`'s `onReopen` opens the GoalPicker and nothing more, and the only `dispatchSolve()` on that surface is inside `pickGoal` (`Result.tsx:407`). Each branch needs the card to speak a RE-SOLVED verdict against the remembered one, so this belongs to whatever unit gives the invited re-open a landing surface — filing it as a copy sweep would produce strings nothing can reach.

## Tier 2 — what breaks on someone else’s device

### The app on someone else's device — no icons, no Safari, no large text

`M` · **pilot** · filed 3× — `A46`, `A50`, `A54`

- The app has no icons at all — the "local-first PWA" is not installable and its tab/bookmark is unidentifiable
- No WebKit arm anywhere — the app is verified only in Chromium, while the vault's durability story is explicitly about Safari's eviction
- The one-frame honesty law is verified only at fixed pixel viewports — never at the enlarged text setting this audience actually uses. *(Partial, 2026-09-05: the four charts' text now FOLLOWS the browser font — `e2e/chart-text.spec.ts` asserts the smallest chart text grows at a 20px default; the svg era shrank it. The fit law itself is still unmeasured under a raised default.)*

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

### The phone intake walk (390×844, 2026-09-04) — fifteen defects and two copy items, all filed, none built

`M` · **pilot (1–15) · briggsy (16)** · filed 2026-09-04 — the ranked queue's item 4, walked end-to-end by the pilot on the Playwright MCP
(19 frames + the per-step DOM log in `temp/phone-walk/`, KEPT past this session by Briggsy's call), then graded by a 4-lens fleet with two
source-reading refuters per finding: 32 of 47 confirmed, 15 refuted — including four of the pilot's own candidates. The refuters' CORRECTED
fixes are the prescriptions below; their full text is `temp/phone-walk/review-result-final.json` — transcribe anything still needed before
a squeaky clears `temp/`. **Fidelity ceiling:** CSS viewport only — no DPR, no touch (`(pointer: coarse)` never matches), and headless
Chromium reserves a 15px CLASSIC scrollbar, so content ran at 375px; a real phone is 390 with overlay scrollbars. The typed household:
Alex 58 working ($150k pay, PIA $2,333/mo from 2035, $30k investment income) · Sam 60 retired at 58 (PIA $2,000/mo from 2033) · NC ·
$84,000/yr all-in (typed under the monthly default first — R19 refused it, textbook) · premium $1,100 / benchmark $1,000 · employer plan
covers Sam · OOP $3,000 · four accounts (Alex 401(k) $900k 60/30/10 +$20k +$8k match · Sam Roth IRA $200k 70/20/10 · Alex brokerage
$150k basis $100k 70/20/10 · Sam Traditional IRA $120k 50/40/10) · no other income → "about 5 years out — around 2031, about 9 of 10 odds",
final tier ~30 s after the provisional.

1. ✅ **SHIPPED 2026-09-05 — SVG DRAWS, HTML WRITES (council wf_ecbe0ab2-7bb, 8/10; `docs/architecture.md §12`; insights 115 + 116).**
   The scope was FOUR charts, not two: `RecommendationViz` (560×210) and `TwoFutures` (560×280) shared the fixed viewBox with no drop guard
   at all. MEASURED first in real Chromium (two fleets, 18 agents; `temp/chart-text/`, KEPT): band ticks **6.9 CSS px on the 390 phone (308px
   figure) · 8.0 at the 1088 floor (358) · 10.0 on the 1536 window (446)**; the band's readout label 6.1 on the phone; the ladder's svg text
   7.0–9.7; RV 7.7–8.3 on the phone; TF 7.5–8.1 on the phone but 16–17.5 on the laptop (a fixed 752px dialog). Three findings the walk had
   NOT filed: the phone's only dollar channel (the touch-scrub readout) vanished 600 ms after the finger lifted (`ConfidenceBand.tsx` cleared
   on an ungated `pointerleave` while the comment beside it claimed the pin held); the band's named moments had rendered at weight 400 in the
   muted tick fill since U6 (`b1ff189a` shipped a compound `.band-frame-text.is-strong` over a parent/child class pairing); and raising the
   browser font SHRANK phone chart text (6.88 → 5.99 CSS px at a 24px default — rem chrome eats the fixed viewport). The register's
   294/353 figures were a 375px-content artifact; the phone renders 308/358. **The council's red team killed the filed FIX SHAPE and every
   in-svg lift:** an end-anchored `$2.25M` at any legible size clips LEFT against its fixed 70-unit gutter into a plausible WRONG dollar on
   the household's only position→dollar decoder (O3), with every proposed font-size gate green. So every word left the svg: the shared text
   layer `src/viz/chartText.tsx` (viewBox-fraction positions as React style-prop custom properties — CSSOM, proven under the served CSP with
   a blocked-attribute control in `design-tokens.spec.ts`; three borrowed registers xs/sm/lg; colliders from MEASURED boxes — `LABEL_CHAR_PX`,
   `TF_AXIS_CHAR_W`, `TF_READOUT_CHAR_W`, `placeAnnotationLabels`, `READOUT_*` all deleted), the band's annotation block in flow under a
   380-unit viewBox (the emptied gutter made the fit-law frames SHORTER: 398 → 344 px at REAL, 320 → 285 at the floor — measured as the
   council's blocking precondition: one row on every fit-law household, two on the scrolling date route, never three), `PLOT.left` 78 → 92
   (band + TF parity), the ladder's viewBox 340 → 284 with `PLOT.top` 40 → 56 so the crown callout sits ABOVE a rung-9 dot (beside it at the
   ceiling), RV/TF end labels that WRAP with a measured vertical pass, the ≤260/280 drop guards retired, the touch pin gated on
   `pointerType`, the dead selector made a descendant. GATES: `e2e/chart-text.spec.ts` on the fit harness (19 arms — rendered px ≥ `--text-xs`
   read from tokens · containment in the card · pairwise non-overlap · nothing named hidden · text grows with the reader's font ·
   reduced-motion identity · planted CLIP + SHRINK controls) and `twoPaneHonestyFloor.test.ts` re-pointed to the y-tick column's geometry.
   Witnessed at 1536×791 / 1088×800 / 390×844 on the band, the ladder and TwoFutures; RecommendationViz was witnessed at 1536 and 390 only
   (the 1088 capture holds no RV node) and its gate arm is still open (see the RV gate entry). **RESIDUALS (pilot unless marked):** (a) ⚑ HIS — the three-register
   collapse and the HTML-over-svg look (Caddie walk owed on the four faces); (b) ⚑ HIS — an unnamed interim age tick now HIDES on a
   collision (the cure for the cold-read's "70 / 69 reads as a defect" flag) rather than taking a row; (c) RV's end labels ride `--text-xs`
   strong in a column widened 168 → 192 units (sm wrapped a 24-char label to THREE lines on the phone and overprinted its neighbour; at xs
   in the old column it still wrapped to three and touched the hero) — the bars gave up ~6% of their run; the honest longer fix is
   above-bar labels (the plot widens again), a layout fork for his eye; the RV axis labels moved to the plot's TOP edge because a 134px phone
   box could not hold them and the hero below the bars; (d) TF's scrub readout stays mouse/pen-only BY DESIGN (the sheets scroll under touch) —
   the band and ladder now pin on touch, so a phone reader has no TF dollar channel; (e) the band callouts seam is supported by the layer but
   no production caller fills it (`bandData.ts`); (f) filed by the council, not built: the band's keyboard lockout (SC 2.1.1 — the enlarge
   button is the only tabstop, the scrub has no keyboard path), `prefers-contrast` / `forced-colors` absent repo-wide; (g) the 320 reflow arm
   lets an end-anchored label borrow its card's padding (inside the card, on screen) — the gate's bound is the CARD named per chart, not the svg
   box. The old "~6px" is retired (not reproducible from any kept artefact). MEASURED by the gate's own `borderline` arm (2026-09-05): on the
   three seeds the gate ran before that arm the band's widest tick at 320 is 32.1px against a 35.7px column — no borrow at all; the shipped
   worst case (`borderline`'s `$0.375M`, 45.0px on Windows / 42.0px on Linux CI — FreeType rounds glyph advances to whole pixels) hangs
   9.3px (6.3 on Linux) left of the 238px figure into the drawer's 25px chrome, 15.7px clear of the card edge (`assertTickColumn` reds it
   inside 4px; its seed guard pins the seven-glyph dollar by TEXT and floors the ink at 40, which both rasterizers clear); the ladder's "on track" (44.3px against a 43.2px column on a 288px figure) takes ~1px of the
   page gutter, which is why the ladder's bound is `main.result` — it has no padded card of its own (council 2026-09-05 owns what yields there);
   (h) ⚑ HIS + council-HELD — **"what yields when the room runs out" on the 320 arm** (council wf_1b45326f-9e8, 2026-09-05, 8/10 —
   `docs/council-log.md`; the law it wrote is `docs/architecture.md §12` "the room is not the ink"). THREE exhibits, one mechanism: the band's
   scrub readout's nowrap lines paint 13.0px past their own border box on every column of the 238px host (the 38% cap is ACQUITTED — it bounds
   the BOX, not the ink — and 2.4px past the plot at the flip column; at a 20px root the same shape reaches the 390 phone); the ladder crown's
   headroom at rung 9 (escapes the figure top at 320 and at root-20; PLOT.top 64 ties by 0.17px, 68 compresses every rung — geometry change
   REJECTED); the ladder's "on track" label column (~1px into the gutter at 320/root-16, ~13px at root-20 — DERIVED, now rendered by the
   root-20 instrument arm, never sanctioned); and a FOURTH the instrument's first render found (2026-09-05): at 320 × root-20 the rung-7
   "7 of 10" anchor OVERPRINTS "on track" (22 viewBox units of rung spacing = 11.3px on the 288px figure, against two ~21px-tall --text-xs
   anchors) — the same column, declared with it (`test.fail` on the ladder instrument; the `[instrument]` stdout line carries the numbers).
   A hide-on-collision layout over the rung anchors (the x-tick precedent — the anchors are wayfinding, "on track" is the named one) is the
   obvious remedy shape; it lands with the column's other oracles, not alone. SHIPPED with the verdict: `.ladder-crown--side` (the ceiling branch had NO CSS rule and no seed
   reached it — `?seed=atceiling` renders it on every arm now), the instrument (a classic-scrollbar 320 arm, the 320 × root-20 arms that
   RENDER + REPORT the three quantities as run annotations, the readout under the reader's-font arm, a five-line seed guard on the readout
   sweep), `fonts.ready` re-place in both chart-text hooks. STILL OPEN — the remedy for the readout's 320 shape, a taste fork the council held
   for HIS cold read at 320 + the instrument's numbers: (a) `min-width: min-content` on `.ct-readout` (the dissent — design-engineer + 3;
   flips to SHIP if min-content is CONSTANT across the 49 columns at every catalog composition, or reserved by a hidden widest specimen, AND
   the ~16/49 rule-covered columns with a 62%×79% box cold-read acceptable), (b) wrap the figures (rejected by "figures never break" unless a
   deliberate two-line dollar), (c) the readout LEAVES the plot for a flow row in the drawer reserved at its tallest (~115px against the
   one-frame fit law — measure `verify:fit` against the reserved height first). Whatever lands, land its oracles WITH it, each with a plant:
   every readout LINE inside its own border box; the crown vs the MARKS bounded to the figure; the side flip's monotonicity. Until then the
   gate's 320 readout arms are `test.fail`-DECLARED expected failures (`HELD_READOUT_320` in `e2e/chart-text.spec.ts`) — Playwright reds the
   run the day one passes, which is the forcing function to delete the declaration with the remedy. The TwoFutures readout on a fine-pointer
   320 host is the same shape (its ~117px content-sized box against a ~166px plot cannot clear the rule mid-corridor) and rides the same hold.
   <details><summary>original finding — kept for the reasoning (its 294/353 phone figures were a 375px-content artifact)</summary>

   **P1, EVERY viewport, not only the phone — the two result charts' whole text layer renders at 6.5–8 CSS px at 390 and 8–10 on the
   laptop.** Both SVGs draw into a FIXED 560-wide viewBox (`bandGeometry.ts:27`, `oddsLadderGeometry.ts:29`) at `width:100%`, so rendered
   size = user px × width/560: the band's `.band-frame-text` 12.5 → 6.6 at the 294px phone figure (the $0 / $1.25M … tick labels are ~4px
   of ink beside 15px body copy); the ladder's y-axis 11 → 6.9 at 353. Each file's label-DROP guard (`band.css:200` ≤260 · `oddsLadder.css:155`
   ≤280) sits just BELOW the phone width, and band.css's own comment encodes the floor as "~6px". Refuters: the laptop two-pane band figure
   is 358px → 8.0 CSS px, his 1536×791 → 9.95 — the phone is the worst case, not a special case; the LADDER half is P3 (a touch PINS the
   `.ladder-readout` sentence at body size — `OddsLadder.tsx:129-146` — so it is wayfinding, not information, loss; the crown's "9 of 10"
   repeats the h2 subline); a bare `@container` font bump BREAKS the band's de-collision (`LABEL_CHAR_PX = 6.6` at `bandGeometry.ts:350-359`
   assumes 12.5px) and `.band-callout` is never supplied; one container step re-scales inside its own range (a 1.7× cliff at the boundary).
   FIX SHAPE: a step ladder of user-unit sizes (or one size stamped from the measured container width) targeting a rendered 10–13 CSS px on
   every tier, `LABEL_CHAR_PX` scaled with it, the drop thresholds re-tuned to be the last resort for a genuinely narrow drawer. The $0
   anchor tick is design-law §3's honesty proof — it must be legible, never dropped.
   </details>
2. **P2, phone — the answer strip, the entire "answer during entry" surface, sits above the fold on arrival at EVERY step after the first
   (y −51 … −178), including the flagship first provisional reading, which landed on step 12 where only `aria-live` announced it.** The
   refuters' experiment: it is NOT `focus()`'s scroll-into-view (arrival is identical with focus scrolling forced off) — the shell's scroll
   position simply carries across the step swap, so `scroll-margin` is inert. FIX: on step change scroll the shell to 0 (strip + thread +
   heading in view) and keep focus-to-heading with `preventScroll: true`; verify the heading still lands in view at 844 under the strip's
   tallest state (item 3).
3. **P2, phone — the strip's 7.5rem reserved floor (`intake.css` `.answer-strip`) is exceeded on 9 of 11 steps (139–186px vs 120),** so
   the mid-interaction reflow the comment exists to prevent is live at phone width. FIX: derive the reserve from the structural cap —
   `missingFactNames` caps at 3 names + one "N more" (`AnswerStrip.tsx:83-87`) — at the narrowest width, as a container-query arm; never the
   186 sample.
4. **P2 — focus lands on `<body>` on every account-editor transition** (open · commit · Edit · Never mind): nothing in the a11y tree says a
   form opened, and on the phone the editor's only exits ("Add this account" / "Never mind") sit 200px+ below the fold with the nav blacked
   out (`intake.css:478-480`). Sibling of Tier 0 "A repeat Add tap over an already-visible block". FIX: give `AccountEntry` its own
   `tabIndex={-1}` heading ("Add an account" / "Edit this account" — which also closes the shipped "Add this account"-inside-an-edit label
   defect) focused on mount through `focusHeading`, AND focus the list heading / the new row on the return leg.
5. **P2 — the progress thread runs BACKWARD in the a11y tree:** `aria-valuenow/max` moved 1/9 → 2/9 → 3/12 as the work answers un-gated
   steps, so the announced percentage can fall after an honest answer and disagree with the painted fill. FIX: announce POSITION, never a
   percentage of a moving denominator (the design law's "quiet thread, SR-announced position").
6. **P2, phone — a blocked Continue is a silent no-op, and on two-screen steps the error it refuses over can be off-screen.** Family of
   Tier 2 "The dead-end repair beat". FIX: focus the first offending control on block (insight 054's remedy).
7. **P2 — "Still needed: Cost basis" names the fact, never the account or its owner, over four committed rows** (the producer holds
   `ownerIndex` + kind and drops both). FIX: name the account through the strip's producer ("Cost basis — Alex's brokerage account").
8. **P2, phone — on the empty accounts step the filled Continue outranks "Add an account", and the only objection is the strip,
   off-screen.** Refuter: the predicate is NOT `length === 0` — the gate is `intakeMap.ts:193-195` (date route: Σ `valueToday` ≤ 0 →
   blocked); the emphasis inversion must key off that same gate. FIX: while it blocks, Add is primary and Continue quiet.
9. **P3, phone — the account list mixes two row layouts at 390** (short names keep Edit/Remove inline right-aligned, long names wrap them
   under). Refuter: `flex-wrap: nowrap` is broken — `.account-row` has a THIRD flex child, the live `FieldError` (`questions.tsx:1008-1010`,
   `sanity.ts:358-380`). FIX: at narrow widths make the actions a fixed row under the summary on EVERY row.
10. **P3 — the three blend legs lack `enterKeyHint`** (add after `autoComplete` at `AllocationEntry.tsx:145`, the `fields.tsx` attribute
    order), and `enterkeyhint` is hardcoded "next" everywhere including the last field of every step ("done" law).
11. **P3 — loose field hints are not wired by `aria-describedby`** (the SS claim-year range, "Your full retirement age is 67.", the Sex
    survival-tables note).
12. **P3 — the account editor pre-selects the owner** (person 0): a required per-person fact carrying a silent default, 957px above its
    commit; the desktop walk's seed shape masks it.
13. **P3 — eight "Edit" / "Remove" buttons with no row identity** in the a11y tree (the budget list already carries row-specific names).
14. **P3 — the intake shell has no `<main>` landmark** — the longest surface in the product is the only one without one.
15. **P3, phone — the Continue row and the account editor's exits are consistently a scroll below the fold on the paired-person steps**
    (names 1433px, Social Security 1675px, the editor 1487–1740px) — the phone scrolls by design, so no defect on its own; recorded because
    2, 4 and 8 compound it.
16. **HIS WORDS (refuted as defects, true as observations):** the R19 period alarm names two readings and quotes neither — a reader
    computes 84,000 × 12 himself ("$84,000 a month is about $1,008,000 a year — tap the one you meant" is the never-force-the-reader
    shape; one refuter confirmed it verbatim, the second vote died on a safeguard) · the floor line quotes a relative distance ("about a
    year sooner") beside a hero that quotes an absolute year · the 124-word spend gloss (306px) between the field and the period control —
    both in ONE viewport (the pilot's "a full scroll below" was wrong), density not fold.

**CLEARED by the fleet (do not re-file):** the focused heading "flush at y0" (the background holds clean; refuted) · the ssa.gov link's
22px height (SC 2.5.8 met by the spacing exception) · money fields "without a format example" (the law inverts it) · "(required)" on one
control (it renders on five) · R19 under the monthly default (textbook: aria-invalid + role=alert + icon, cleared by "Each year") · the
disclaimer two-mount swap (holds: in-frame mount dark, trailing mount after the doors) · no horizontal overflow anywhere · every button
≥44px tall · focus-to-heading on every step · labels above every field, `inputmode` right on every field.

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
    seedless draft recomputes before typing (⚑ 2026-09-04: the filed fix "mint through `update()`"
    only turns a DEFERRED false-arm into an immediate one; the alternative — an eager mint in
    `createMemoryModel` — breaks the WRITTEN contract #1b "minted exactly once at the first engine
    run" (`plans/2-first-answer.md:68`, `model.ts:1666-1668`) with no test that would catch it — a
    ruling between those two arms) · a read-only tab's
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

### The solve lane — long runs, the interactive tier, and a silently frozen tab (the edit-time cancel shipped 2026-09-03)

`XL` · **pilot** · filed 3× — `A55`, `A6`, `S70`

- The main-thread engine fallback freezes the tab for the whole solve and never says so
- The WASM port — the measurement gate is BUILT and has fired; the port itself is deferred
- SOLVE LANE — ✅ the CANCEL shipped 2026-09-03 (the edit-time kill: `engineClient.ts
  createResettableEngine` + `memoryModel.update()` — a ranking-affecting edit during a pending solve
  demotes to `stale` and resets the worker sequentially; insight 113) · the deferred interactive
  tier stays open
  - ⚑ Residuals of the cancel (2026-09-03, each recorded, none a build without a ruling): the kill
    is ONE-WAY — an edit that is then reverted has still destroyed the run (the old resolve-time
    compare would have kept it); decided as the lesser sin against minutes of a frozen headline, the
    stale card's own door is the recovery · the stale card fires mid-"solving…" on the first
    keystroke and its body "Your answer above already reflects them" is true only once the
    follow-up recompute lands (pre-existing on committed→stale; a Caddie read, not a blocker) · a
    worker DEATH (`EngineDeadError`) settles every call as the calm compute-error and recovers on
    reload — a bounded auto-respawn is the next increment · the respawn's engine-module re-evaluation
    on the first post-reset call is unmeasured on the reference device · the guard's coverage equals
    the solve fingerprint's: an edit that moves the spine's params but not the solve request leaves
    the solve running and that recompute queued (none known today) · the live region announces
    nothing on pending→stale (an AT user hears "working on it" and is never told the run was killed;
    the committed→stale path has the same silence) · a worker `error` event a LIVE worker survives
    (an uncaught throw outside a Comlink call) marks the generation dead until the next reset —
    deliberate (Comlink's expose catches every in-call error), recorded · eleven byte-identical
    `EngineClient` test fakes — one new member cost a 19-file sweep (hygiene: a shared helper)

### A vault saved before either spend-help boundary flip double-counts its Medicare premiums — Part B and IRMAA as well as Part D / Medigap, no migration, no clock

`M` · **pilot** · filed 2026-09-06 (the Medicare-extras and Medicare-pricing specs' as-built rewrites; both unfiled obligations confirmed by their skeptics)

- **TWO flips, one defect.** The pricing unit (`3454c224`, 2026-07-10) moved **base Part B and its IRMAA surcharge** out of typed spending; the extras unit (`503213f4`, 2026-07-11) moved **Part D / Medigap / Medicare Advantage**. The live boundary sentence now carries both — "Leave out the Medicare premiums the tool prices itself: Part B, its income surcharge, and any Part D, Medigap, or Medicare Advantage premium" (`src/ui/copy.ts:117`, and the identical priced-state twin at `:131`). A vault saved BEFORE either flip still carries those premiums inside its spending AND gets them priced — a double count. Each unit's council required a NAMED follow-up for the installed base; neither was filed (the pricing spec records its own at `docs/plans/features/medicare-pricing-build-spec.md:42`) and no staleness clock keys on either.
- Pessimistic-safe (the household reads slightly worse) against a ~zero real pre-launch base, so neither was a ship blocker — but it is an undetected wrong number on every pre-flip vault, and the re-entry walk-through is the only thing that corrects it today.
- ⚑ **The fix is NOT a new clock, and the extras filing's original prescription was wrong.** `src/store/staleness.ts:60-62` rules it out in its own words: the sanctioned mechanism when a real installed base exists is a Q7 saved-era entry (`src/shared/appDefaults.ts` — the add-only era map exists for exactly this class; `ERAS` at `:35`, `CURRENT_APP_DEFAULT_VERSION` at `:41`), "not a new clock here". ONE era entry covering BOTH boundaries — never two clocks, and never a clock that names Part D while staying silent about Part B — plus the calm note; the words are his.

### A re-save that never touches the knob reclassifies a took-the-default household as an overrider — and the note built to protect them is then withheld

`S` · **pilot** · filed 2026-09-06 (the U13 build spec's as-built rewrite + its skeptic; documented in-source, deliberately not built around, and now unowned)

- Every save re-stamps `appDefaultVersion` to the current era (`src/ui/scenarioFromDraft.ts:86`) while the draft's `survivorSpendingRatio` rides through untouched, so a household that saw the "we've updated our default assumptions" note and re-saved WITHOUT touching the knob ends up stamped CURRENT over the OLD era's value. On the next default move `deriveStaleness` (`src/store/staleness.ts:417-422`) compares that value against the wrong era's default, reads it as a deliberate override, and silently withholds the exact note built to protect them — the inverted honesty `src/shared/appDefaults.ts:9-15` names as calm-but-wrong. The edge is stated in-source at `appDefaults.ts:23-26`.
- **Not live today, and NOT gated on real vaults existing.** `ERAS` holds one entry (`src/shared/appDefaults.ts:35-41`) and an older build's bare literal resolves to not-comparable, so no note can fire at all (`appDefaults.ts:17`). The trigger is a SECOND methodology-default era shipping; the wrong withholding lands on the era move after that. Filing it as a live installed-base gap would mis-rank it.
- **The engine-domain blind spot is the same map's other unowned half.** `src/store/staleness.ts:53-62` names it: these clocks diff CONSTANT vintages, never whether the APP ITSELF started pricing something it previously didn't, so a pre-unit vault recomputes with every stamp equal and fires no note. Held immaterial at ship (base ~zero, drift conservative) with the remedy named — a Q7 saved-era entry, "not a new clock here" (`:60-62`) — but nothing MAKES an engine-domain unit mint one, and the two instances that already shipped are the entry above.
- ⚑ **The fork is named in source and deliberately not ruled** — "Resolving that (re-seat vs re-ask) is a U17-era question" (`src/shared/appDefaults.ts:23-26`) — and its named owner passed without answering: U17 closed at S6, S7 deferred by ruling (`docs/roadmap.md:99`). Do not implement re-seat or re-ask without the ruling, and do not edit an existing era entry to work around it: the map is add-only by ratified contract. Whoever adds era #2 owes the decision in the same change.
- Distinct from Tier 4's "`appDefaultVersion` era arm has no BEHAVIOURAL witness until a second era ships", which is a missing test rather than this reclassification.

## Tier 3 — Briggsy’s call (taste, scope, one-way doors)

### No priced-state seed crosses the confidence band any more — the fit matrix lost its PRICED-STATE borderline two-pane coverage when NC's rate cut was pinned

`M` · **briggsy** · filed 2026-09-06 (the state-seed brief's rewrite; measured by its skeptic: `devSeeds.test.ts` 66/66, NC on-track beside its twin)

- `?seed=nc` and `?vault=statestale` were minted BORDERLINE (NC 0.8425 vs the twin's 0.8585). S.L. 2026-41's 2027+ cut, pinned 2026-08-02, lifted NC onto ON-TRACK — so the vertical-fit matrix and the Caddie walk no longer exercise a borderline two-pane on any priced-state household, while five comments/test names still said they did (swept 2026-09-06).
- The fix is a NEW purpose-built band-crossing seed with its own state-off twin (`devSeeds.test.ts:487-495` files the shape) — a seed mint is a taste + scope call (which household, which state, how close to the bar), so it is his, not a pilot build.

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
- ⚑ **THE CROWNED WINDOW'S BUILD-YEAR ANCHOR — the three arms, written down 2026-09-04 so the fork is
  presentable (the queue cited "three arms with corrected costs" that existed nowhere).** Cause:
  `conversionWindowFor` (`solveAnchor.ts:201-208`) returns `startYearOffset: 0` = the plan's BUILD year,
  and `RothLever.complete()` refuses a passed start (`RothLever.tsx:60-66`), so on an aged vault the crowned
  conversion cannot be enacted as priced — and for an at/past-RMD household (1-year clamp, `:206-207`) the
  window is WHOLLY elapsed after New Year's, not partly. Every organic 2026 vault crosses this on
  2027-01-01 with no deploy. **Arm 1 — re-anchor the window to the wall year** (engine; MOVES the
  ranking → `SOLVER_CODE_VERSION` bump → every saved record invalidates; size M; cost: an aged household's
  saved recommendation demotes on re-open). **Arm 2 — refuse to crown a conversion whose window began
  before the wall year** (engine; changes what crowns, also a version bump; size S–M; cost: aged
  households lose conversion recommendations entirely until re-solved — and the refusal needs its own
  honest words). **Arm 3 — disclose only** (view + copy; size S; the plan clock is already threaded —
  `Result.tsx:489` → `recommendationView.ts:393-399`; true under both engine arms and removed by whichever
  lands; cost: the recommendation stays un-enactable and the reader is merely TOLD). Tier-1 7c rules
  "Do NOT fix this in copy" — so arm 3 alone is a decision, not a default. Sizes are the pilot's
  estimates. Whichever arm: gate any note on GRID provenance / winner≠baseline, never on `start.passed`
  alone (`recommendationView.ts:483-492` — under the fallback the crown can be the household's OWN
  baseline with THEIR start, the exact false claim `leverRothAlreadyApplied` exists to prevent).

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

### The 2026-08-14 recovery walk's open findings — the backup door that cannot exist · no success frame · the escape above the primary · the raw browse button

`XS–M` · **briggsy** · filed 2026-08-14 in the queue, moved here 2026-09-06 (RecoveryFlow + RestoreFlow rendered for a human end-to-end at 1536×791 and 390×844; the a11y half shipped in-pass, `c327e011`)

- ⚑ **All four are his — none is a build.** The copy pass on the backup-door finding is OFF (the string is true; only the door is missing, and that door is a destructive council-sized decision). Do not re-derive the copy fix: a fifth finding, withdrawn the same day it was filed, prescribed exactly that and would have shipped a false certainty — `unlockCopy.test.ts:34-41` pins the both-ways hedge on purpose (both GCM-ambiguous failures share ONE hedge, never a key that asserts the credential is definitely wrong or the data definitely bad).
- **🔴 THE BACKUP DOOR IS PROMISED AND CANNOT EXIST — and the naive fix is a WORSE dead end.**
  `unlockWrongCredential` (rendered on BOTH Unlock and RecoveryFlow) ends *"the saved data may be
  damaged, and your backup is the way in."* The entry graph is a closed loop: `unlock →
  {began, recover}`, `recover → {began, unlock}` (`App.tsx:206-247`); `RestoreFlow` mounts ONLY on
  `restore-cold` and `damaged`, and `restore-cold` is reachable only from ColdStart, which requires
  an EMPTY vault (`App.tsx:145`).
  ⚑ **DO NOT "just add a door" to `restore-cold`.** `backup.ts:134-135` — `restoreVault` returns
  `{ok:false, reason:'vault-exists'}` when `loadVault().kind === 'vault'`, and its comment records
  that the AUTHORITATIVE check re-runs inside the serialized write (TOCTOU). A door would march the
  user through file → word → new passphrase (**two ~1s KDF derives**) and refuse at the end.
  ⚑ **The sentence is also mostly FALSE, which shrinks the real defect.** The backup file is
  decrypted with the RECOVERY WORD — the same credential RecoveryFlow uses. Have the word ⇒ recovery
  opens the plan and the backup is unnecessary; lack it ⇒ the backup is equally unopenable. A
  genuinely damaged vault never reaches Unlock (it auto-routes to `damaged` → RestoreFlow). **The one
  case where the sentence is TRUE:** ciphertext corrupt enough to fail decrypt but intact enough to
  pass `probeVault`. Closing THAT needs a pre-clear of an unopenable vault, which `RestoreFlow.tsx:8-12`
  records as **council-killed** (*"the one data-loss path this surface must never reintroduce"*).
  ⚠️ **AND THE COPY FIX IS OFF THE TABLE TOO — corrected 2026-08-14 while attempting it.** The
  sentence is CONDITIONED (*"If you're sure it's right…"*) and TRUE on the damage branch, where the
  backup's own `recoveryWrap` opens under the same word. `unlockCopy.test.ts:34-41` pins the both-ways
  hedge deliberately. So there is **no honest copy edit here**: the remedy named is real, and what is
  missing is the DOOR to it.
  **What actually remains is one thing, and it is HIS:** a household whose vault is subtly corrupt is
  told a TRUE remedy it cannot reach, because reaching it needs `clearVault` on an unopenable vault —
  the council-killed pre-clear. Size it as a destructive one-way door, not a copy pass. Briggsy picked
  "add the door" 2026-08-14 before `backup.ts:135` was traced — **that clearance is spent; re-ask
  against these facts.**
  ⚑ **The narrow, non-destructive increment that IS available** (unproven, size XS, still needs his
  word): the Unlock error names the backup but never the recovery word, and *that* door — *"I forgot
  my passphrase"* — is on the same screen. Naming it costs nothing and breaks no hedge.
- **🟠 Neither recovery NOR restore ever confirms it worked.** Both land byte-identically on
  *"Are these still your numbers?"* with no acknowledgement that the household is back in, and none
  that **the new passphrase is now the live one**. `App.tsx:235` passes `notice: null` on recovery and
  `:243` threads restore's — but that channel is the READ-ONLY caveat (`UnlockCopyKey`), null on a
  normal open, so there is no success channel at all. The person most recently burned by a credential
  is given no way to verify the replacement took. Needs a success-notice channel + Briggsy's words.

- **🟡 The escape sits ABOVE the primary action, systematically, in the `save-actions` family** —
  RecoveryFlow (word + setNew), RestoreFlow (file + word + setNew), and the backup ceremony
  (*Not now* above *Finish*). Unlock and ColdStart get it right (primary first, escape below), so it
  is ONE DOM-order decision in `save-actions`, not six fixes. Framing call — his.

- **🟡 The raw native browse button** on RestoreFlow's file step is the one place the craft visibly
  drops, on the screen where trust matters most. `save.css:131-132` protects *"the native control
  stays — only its frame is brought into the field system; the browse button is the browser's"* —
  but `::file-selector-button` restyles APPEARANCE without replacing the control, so that rationale
  does not block it. ⚠️ **The missing `accept` filter is NOT a defect — do not "fix" it.**
  `RestoreFlow.tsx:210-211`: *"a survivor's renamed/re-extensioned export must never be unpickable."*
- ⚑ Checked on the frame and CLEARED — do not re-file: the phone fold holds at 390×844 with the 3-line error rendered (content ends 611 px of 844); the export ceremony's Finish is `aria-disabled`, never native `disabled`; Unlock's error a11y and RestoreFlow's file-error a11y are textbook; the only console error on every route is the known favicon 404.

### The 2026-08-20 desktop intake walk's open findings — error-copy nits · "still being finalized" · five tone reads · the health-quote join

`S` · **briggsy** · filed 2026-08-20 in the queue, moved here 2026-09-06 (desktop only, 1536×791, mixed worker + retiree household, NC, 4 accounts; findings 1–2 shipped 2026-09-03 — the completed-intake door and the allocation discard — and have their own entries)

- **🟡 Error copy speaks to the absurd reading:** birth year "62" → "Ages past 119 are beyond what
  the projection can model." True, never says "four-digit year". · **The tax-returns step names no
  1040 line** ("Income, two years back" — AGI? MAGI?), and the second field has no gloss. · **Plain
  bank cash has no labeled home** among the 7 account kinds ("Brokerage / taxable" is mechanically
  right; the label doesn't say so). · The account editor's commit button reads "Add this account"
  inside an EDIT (edit-in-place works; label only). · The SS start-year label is future-tense over a
  legitimately-past range for an already-claimed retiree.
  ⚑ **2026-09-04 anchors** (all still live): `errAgeBeyondModel` `copy.ts:631` / rule `sanity.ts:412-424` ·
  IRMAA labels `copy.ts:252-255`, the gloss-less second field `questions.tsx:917-928` (its step is
  non-blocking by design — a blank seed blocks the ANSWER via `intakeMap.ts:236-242`, not the step) ·
  `ACCOUNT_KINDS` `model.ts:1425-1433` + labels `copy.ts:289-295` · `copy.accountSave` rendered
  unconditionally at `AccountEntry.tsx:357-364` (`initial` already tells the form it is editing;
  `FIELD_OP_ALLOWLIST` `copyGuard.ts:260-263` already admits save/edit/add, so a sibling key needs no guard
  edit) · `ssClaimLabel` `copy.ts:77` is route-blind — the route-true twin idiom is
  `stateStep`/`stateStepRetired` (`questions.tsx:569`/`:592`, picked at `:1197`). The mechanics of the
  edit-label, the SS tense and the missing `helpKey` are one-key/one-prop each; the bank-cash home is a
  SCHEMA call (`ACCOUNT_KINDS` feeds the codec vocabulary `scenarioCodec.ts:363` and `contributionCeilingFor`
  `sanity.ts:111`). Words stay yours as filed.
- **🟡 "Still being finalized" reads as a PROGRESS state and is a PERMANENT disclosure — and it is
  the DEFAULT face of every real recommendation, not an edge case.** `recGradeNoteShape` renders on
  the buckets leave-more run and cost this walk 30 minutes of waiting for a "finalization" that is
  not a process. ✅ **TRACED + SWEPT 2026-08-20 (same session):** the feeders are
  `methodology.productionMarket` + `methodology.survivorSpendingRatio` (both live directional
  methodology-substrate; `consumedConstantEntries` includes them whenever the run carries the
  default bytes — i.e. essentially every household; `solver.*` entries are EXCLUDED from the walk,
  so this line's first filing named the wrong keys and the trace refuted it before the sweep). All
  FIVE stale "dormant / no entry is live" comments corrected (`copy.ts`, `recommendationView.ts`,
  `recommendationView.test.ts`, `solve.ts`, `solve.test.ts`). Also noted: the hand-planted
  `?vault=rec` payload carries `disclosedDirectional: []` (`devSeeds.ts:1444`), so the plants HIDE a
  note every real run shows. **What remains is the WORDING — his words:** "still being finalized"
  promises a later that never comes; types.ts records no dated pin event exists for these entries.
- **EYE/tone:** the spending step's all-in gloss is ~90 words of carve-outs in one paragraph (the
  densest frame of the walk) · ColdStart's "about five minutes" sits above a fetch-a-healthcare-quote
  sidebar · the still-needed counter GROWS after honest answers (gated steps un-gate) · the record
  demotion's reason line says "Your numbers have changed" when a SETTING changed · recovery/restore
  still land with no success frame while first-Save gets "✓ Your plan is saved" — the pattern exists
  in the family (walk-finding 3's ask now has an in-family precedent to copy).
- **Input to the Tier-0 "retired spouse priced at $0 healthcare" entry's open EYE call (`healthQuoteHelp`), witnessed live:** the health-quote step's "splits it by
  age for each of you" renders one Continue from the employer-coverage step's "counts no health costs
  for the one who has already stopped." Each true alone; the JOIN (what happens to the combined quote
  I typed?) is still left to inference. Adjacency helps; it does not close.

## Tier 4 — hygiene (no user-visible wrong answer)

### `verify:fit` is BLIND to the recommendation surface — every "re-measure under the fit gate" prescription aimed at it is unexecutable

`S` · **pilot** · filed 2026-08-03 (verification fleet)

- `e2e/vertical-fit.spec.ts:392-402` **explicitly excludes the committed and held recommendation
  renders** — a live solve blows the spec's 120s per-test budget (measured 2026-08-03: a dev-build
  `?seed=nc` solve took **~11 minutes**). Only an *injected* `.rec-grade` lockup is measured.
- **The exclusion holds on the BUDGET premise, never on the retired `nc → held` one.** That block's
  recorded 2026-07-22 band put its 80s floor on `nc` short-circuiting at the mint, and named the
  compensating coverage as `nc → token-withheld{state-cert}`. S.L. 2026-41 § 44.1(a) pinned NC's rate
  schedule (2026-08-02) and the seam that comment cites now asserts the opposite
  (`src/ui/__tests__/solveDispatch.test.ts:235` — "the Q5 held render is retired with the
  certification block" — and `:247` `expect(solve.payload.kind).toBe('recommended')`), so `nc` commits,
  it is the SLOW arm, and the 80s floor is gone — which makes the exclusion MORE true, not less. Both
  copies of that stale band were corrected 2026-09-06: this bullet's, and the spec comment's own
  (`e2e/vertical-fit.spec.ts:394-395` and `:400` now record the retirement in place). Never re-derive
  a solve-channel budget from the retired figures.
- So any queue item prescribing *"seat it and re-measure under `pnpm verify:fit`"* for that surface is
  **not executable** — new lines in `.rec-committed__rest` need a **manual 1536×791 measure** against the
  protected in-frame R13 disclaimer.
- **The "~89px headroom" figure is not this surface's.** It is the SPINE idle frame
  (`vertical-fit.spec.ts:1810`), a once-measured prose number the spec never asserts — it logs headroom
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
- The passphrase floor's dictionary packs have no test arm that DEPENDS on them — a silently pack-less estimator reads green. `checkPassphraseFloor` (`src/crypto/kdf.ts:112-119`) is the sole minter of the `FloorCheckedPassphrase` brand and therefore the only thing between a weak credential and the PBKDF2-600k wrap, and its score clause is only as strong as the `language-common` + `language-en` packs configured inside `loadZxcvbn` (`src/crypto/kdf.ts:90-104`, `setOptions` at `:96-100`) — a pack-less core still RETURNS a score, so the floor degrades silently instead of throwing. Measured twice against this repo's `@zxcvbn-ts/core`, pack-less → packed: `password` 2→0 (still under `PASSPHRASE_MIN_SCORE` 3, `kdf.ts:44`, so that arm's `below-min-score` assertion passes either way), `aaaaaaaaaaaaaaaaaaaa` 0→0, `xK9#mQ2$vL7` 4→4, six emoji 0→0, the accepting arm `plinth otter vivid casket 92 lampoon` 4→4 — but `iloveyoubaby` **4→1**, and at twelve code points it clears `PASSPHRASE_MIN_LENGTH` (`kdf.ts:45`), so a pack-less estimator would mint the carrier for it with every arm green (`src/crypto/__tests__/kdf.test.ts:175-180`, `:182-189`, `:191-198`, `:200-205`, `:207-210` — each rejection decided by length or by the dictionary-free repeat matcher). The UI layer is blind too: `src/ui/__tests__/passphraseStrength.test.ts:34`'s only score-floor fixture is another dictionary-free repeat. FIX: one dictionary-only rejection arm — a ≥12-code-point common phrase scoring ≥3 pack-less and <3 packed (`iloveyoubaby` is the measured witness) — so the packs become load-bearing on a green suite. Stated in prose at `docs/plans/2-first-answer.md:249`; this is that gap moved onto the open surface. ⚑ Tier 4 by this file's own definition (no user-visible wrong answer); the severity argument — it is the SOLE at-rest defense for real financial PII — is Briggsy's to promote.
- `blendTableReadForRun` re-implements `resolveBlend`'s branch condition and nothing binds the two. `resolveBlend` (`src/intake/intakeMap.ts:294-300`) reads the dated blend table only when `account.ticker` is set AND `findBlendRow` hits, BEFORE falling through to `tickerClassifications` and then `manualBlend`; the mirror (`intakeMap.ts:946-951`) re-types that as `a.valueToday > 0 && a.ticker !== undefined && findBlendRow(a.ticker) !== undefined`. Sharing `findBlendRow` pins the LOOKUP, never the PRECEDENCE — and the mirror's own header claims exactly that shared-call defense (`:939`, "called HERE with the SAME function, never a re-typed ticker list"), which is the reasoning that would wave a reorder through, while the source comment names a discipline nothing enforces (`:285-289` — "if the branch order here ever changes, change it there in the same edit"). NEITHER direction is pinned: `src/ui/__tests__/stalenessExposure.test.ts:79` binds the exposure RECORD to the mirror, and no test exercises the `tickerClassifications` fallback with a table-hitting ticker at all — so a reorder putting the manual classification first breaks no test and silently flips U17 §S4's staleness exposure. Tier 4 because the shipped intake collects no ticker (`src/shared/model.ts:1443-1448`; the retirement is recorded at `src/intake/AccountEntry.tsx:21-23`, and Tier 2's R37 bullet already calls the bundled blend table dead code) — a ticker reaches the predicate only through a dev seed or a legacy restored vault (`src/shared/scenarioCodec.ts:364` still decodes the field). ⚑ Do not assume U8 re-opens it: the ratified holdings shape is `{ label; blend; valueToday }` with `label` a LABEL, "never a live-price key (R36)" (`docs/plans/2-first-answer.md:320`). FIX: one test pinning the precedence — an account whose ticker BOTH hits a table row and carries a differing `tickerClassifications` entry, asserting `resolveBlend` returns the TABLE's weight while `blendTableReadForRun` reads true on the same draft.
- False source comment (a) — `partBTrendVintage`'s "no exposure gate" clause in `model.ts`
- False source comment (b) — kill "the record stores the seed" in Plan 4 BEFORE S5 mints
- DEFERRED BUILD — the richer market draw: block-bootstrap + stochastic correlated inflation
- THE RICHER MARKET DRAW — block-bootstrap + stochastic correlated inflation
- The date-search grade never routes through U14's held-out seed B (filed 2026-09-06, confirmed by grep): `deriveSeedB` / `heldOutSeed` live in `solver/search.ts`, `solver/solve.ts`, `solver/solveEntry.ts`, `validation/gradeCalibration.ts` and nowhere in `dateSearch.ts`, `dateSearchProfile.ts`, `dateOdds.ts` or `FuckOffDate.tsx` — the fuck-off date's confidence is a one-seed statistic while the recommendation's is held-out. The accumulation record §3c states it; the curse-defense law (product D-decisions) says it should not be.
- `verify:doc-stats` arm 4 never scans `src/**`, `README.md`, `CLAUDE.md`, or `.md:NN` doc-to-doc citations — its surface list is `TODO.md` plus a walk over `docs/` (`citationSurfaces` in `scripts/verify-doc-stats.ts`) and its `CITATION` regex names code extensions only — so every line-numbered citation inside a SOURCE comment is un-gated by construction. The doc layer was re-anchored in `61c57ff5`; the source-comment layer was not, and ~40 stale source-comment citations were re-pointed by hand on 2026-09-06 (the u17s5 skeptic's six, then the whole `intakeMap.ts` family across `intakeMap.ts`, `staleness.ts`, `stalenessExposure.ts`, `copy.ts`, `savedRecommendation.ts` and three tests — every anchor into a file that grew rots together). Fix shape: extend arm 4's surfaces to comments under `src/**`, `e2e/**` and `scripts/**` plus README.md and CLAUDE.md, structural half only, and widen the regex to `.md`. ⚑ NEGATIVE — do NOT re-arm the semantic half: the identifier-proximity heuristic measured 21–42 % false positives on freshly verified citations and was rejected at `bc026ef4`.

### Deferred engine builds and the missing regression arms

`XL` · **pilot** · filed 1× — `S80`

- SMALL-DEFERRALS BUCKET — nine items, each on its OWN trigger (scrub e2e · DateBand band · 2 AssumptionPanel · 5 small)

### The priced roster's re-verify records red on two dates, and only the later one was on a clock surface

`S` · **pilot** · filed 2026-09-06 (the state-tax build spec's skeptic pass; graded fragile-not-wrong)

- `state-tax-pa-last-verified.json:6` and `state-tax-fl-last-verified.json:6` both carry `nextDue` **2027-07-15**;
  `state-tax-nc-last-verified.json:6` carries **2027-08-02**. Three records, TWO dates, 18 days apart.
  `scripts/verify-state-tax.ts:120` loops `PRICED_STATES` (`src/engine/constants/stateTax.ts:50`) and `:104-112`
  judges each record against its OWN `nextDue`, so `pnpm verify:state-tax` reds in two waves — PA + FL first, NC
  18 days later. Probe-proven at a fixed clock: 2027-07-16 reds PA and FL while NC is still green.
- The roster's real deadline is the EARLIEST record's, not NC's. **The gap is planning, not diagnosis:** the gate
  prints every passing state's `verified … next due …` on the same run (`:141-143`; `failed` at `:139` does not
  break the loop), so a red build always shows all three dates — but nothing SCHEDULES the July pass, so the
  first thing that names it is a blocked build. Not wrong today: all three records are `statusConfirmed: true`
  and in-window; the queue's deadline table now carries both dates.
- Tier 4 is provable: `grep -rn "nextDue" src/ scripts/ --include=*.ts` hits only `scripts/verify-state-tax.ts`
  and its test — no `src/` consumer at all, so a stale state-tax record reds CI and nothing else. Contrast the
  ACA record, whose staleness is a RUNTIME withhold via `evaluateAcaFreshnessClause`
  (`src/engine/validation/oracleToken.ts:191-201`).
- ⚑ **NEGATIVE — the gate is NOT the defect; do not "fix" it.** It already reds per record. Judging the roster
  against one shared (latest) date would silently swallow the earlier deadline — the unsafe direction.
  `scripts/verify-state-tax.ts:48-51` states the cadence-vs-deadline distinction at the field itself, and the
  roster test in `scripts/__tests__/verify-state-tax.test.ts:80-110` now REDS on that refactor (date-agnostic:
  one day past the earliest `nextDue`, exactly the earliest-dated records must be overdue).
- ⚑ **NEGATIVE — do NOT collapse the dates by bumping `verifiedOn`/`nextDue` on a state nobody re-read.** Every
  record's `howToClear` says "Do NOT just bump the date." Convergence has to fall out of ONE re-verify pass that
  genuinely re-reads all three primaries, which means re-reading PA and FL early and paying for it. The ACA
  record is not the model either — it is a ROLLING `verifiedOn` + `maxAgeDays` window, deliberately a different
  shape.

### The solver profile's `rankableCount` still counts the pre-trend-flip subset — a healthy conversion-bearing solve can read SUPER-linear

`S` · **pilot** · filed 2026-09-06 (plan 4's skeptic pass; confirmed against source by the roadmap owner's skeptic)

- `src/engine/solver/profile.ts:109` computes `rankableCount` as `request.candidates.filter((c) => c.conversion
  === null).length` — the sequencing-only subset the solve ranked BEFORE the Medicare-cost-trend unit — while
  `src/engine/solver/solve.ts:459-464` derives the live `rankable` from `enumerateWithheldConversionLevers`,
  which is the WHOLE roster whenever the trend clause is clear (conversions rank since 2026-07-19). The module's
  own budget shape (`profile.ts:12-17`) says search ≈ 2·|rankable| and now names the whole roster; the field it
  is judged against does not.
- Consequence: on a conversion-bearing roster `ratioVsSingle` (`profile.ts:116`) is judged against an
  expectation whose |rankable| term is under-counted, so a HEALTHY solve reads SUPER-linear — the exact
  regression signal the module exists to raise. Instrument only: `profile.ts` REPORTS, never judges, and no
  shipped path consumes it — no user-visible wrong answer. But it is the WASM-trigger measurement the roadmap's
  U15 row names, so a false super-linear reading would mis-fire that decision.
- Fix shape: derive the field from `enumerateWithheldConversionLevers`'s output exactly as `solve.ts:459-464`
  does (one shared helper, never a second `conversion === null` filter), and re-pin `profile.test.ts:86-87`,
  which today asserts the `conversion === null` subset BY NAME. ⚑ NEGATIVE — the comments at `profile.ts:44-52`
  and `profile.test.ts:86-87` state the divergence deliberately; do not re-label the field "what solve ranks"
  without changing the computation.
