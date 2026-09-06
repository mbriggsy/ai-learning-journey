# The Back Nine — TODO

> **Actionable next-actions only.** No session history, no shipped-work record, no stat stamps — `git log`
> has the first, [`docs/roadmap.md`](docs/roadmap.md)'s You-Are-Here table has the second, and `README.md` +
> the roadmap carry the test count under `verify:doc-stats` (this file re-typing it rotted twice, so
> `d5df3609` made pointing the rule).
>
> **The full open register is [`docs/backlog.md`](docs/backlog.md)** — the open COUNT lives only in that file's own
> header (never re-typed here; it rotted twice — `verify:doc-stats` gates it since 2026-09-06), each entry traced to the raw obligations behind it. This
> file ranks only what is next; **a ranked queue is not the open surface, so read the register before
> filing anything as new.** The split is by KIND: the register carries every NEGATIVE finding (what was
> refuted, what must not be built or re-derived); this file carries the ranking + the live prescription.
>
> ⚠️ **NEVER cite "TODO item N."** These numbers are re-ranked every session, so a citation written today
> silently resolves to a *different* live item later — worse than dangling. (Live examples: `council-log.md`
> and `cold-read-log.md` cite "TODO item 11" meaning the state-tax unit, shipped 2026-07-15; item 11 is now
> the heir-bracket entry. Others cite "item 0", which no longer exists.) Cite the register entry's **title**.

**Where we are:** all four acts are built; Act 4 closed at U17·S6 (S7 deferred, Briggsy's ruling). What is
left is not units. It is the gap between *the build is done* and *a friend can bet real money on this*.

▶ **START HERE (b9-4) — hand-off 2026-09-05 late evening. The b9-3 plan's steps 1–3 SHIPPED: `32c1231d`
(the gate hardened in one pass + the council's ship-now list) · `b4b27a60` (the hygiene sweep) · `8748e4f5`
(the CI fix — a Windows-pinned ink threshold) · `abf1ab38` (insights 117–121). CI run 34005602885 is GREEN on
Linux (97 fit tests, 11.8 m). Enter here. (The b9-2 / b9-3 hand-offs that used to follow were deleted 2026-09-06 with the doc audit — git log + the kept digest are the record; their still-open re-verify clauses are folded into the ranked entries below as ⚑ blocks.)**

**HIS EYE FIRST (⚑ council-HELD 2026-09-05 — `docs/council-log.md`; the law is `docs/architecture.md §12`
"the room is not the ink"):** the 320 arm's readout shape + the ceiling crown over the dots. Eight PNGs in
`temp/cold-read-320/` (KEEP — `INDEX.md` names them): 01/02 the readout's dollar lines hanging out of their
card at 320 (root-16 / root-20), 03 the same on the 390 phone at root-20, 05 "on track" 13 px into the gutter
touching "7 of 10" at 320 × root-20, 06/07 the NEW ceiling crown (`?seed=atceiling`) aligned beside its dot but
printing across the year-1..3 dots on every arm. Pilot's lean: below ~306 px of host the readout LEAVES the
plot for a flow row in the drawer reserved at its tallest (a contained box still covers 62%×79% of that plot);
the dissent's cheap alternative is `min-width: min-content` on `.ct-readout` (wins if min-content is constant
across the 49 columns and the ~16/49 rule-covered columns cold-read acceptable). Whatever he picks lands WITH
its oracles, each with a plant: every readout LINE inside its own border box; the crown vs the MARKS bounded
to the figure (the ceiling crown over the neighbouring ceiling dots is the live case); the side flip's
monotonicity; a hide-on-collision layout over the rung anchors for "7 of 10" vs "on track" at 320 × root-20
(the x-tick precedent — the anchors are wayfinding, "on track" is the named one). THEN delete the `test.fail`
declarations (`HELD_READOUT_320` in `e2e/chart-text.spec.ts`: the readout sweep on NARROW + NARROW-SCROLLBAR,
TwoFutures' readout on NARROW-SCROLLBAR, the reader's-font readout test, the root-20 ladder instrument) —
Playwright reds the run the day one passes. The `[instrument]` stdout lines carry the numbers (320 × root-20:
readout ink 45.9 px past its box locally / 49.2 on Linux; the crown's top 13.5 px above the svg host; "on
track" 13.3 px into the gutter, 4.6 px over rung 7).

**THEN, ranked — all pilot-buildable; the recipes are `temp/chart-text/verify-0905-b9-2/verify-digest.md`
(KEEP; read each item's `S.correctedPrescription`, it supersedes the verifier's):**
(1) **The RV gate as its OWN serialized script** (digest `rv-gate-row`, L). Extract `audit` / `assertChartText`
/ `floorPx` / `auditReadout` / `assertReadout` from `e2e/chart-text.spec.ts` into `e2e/chartTextAudit.ts` (no
spec imports another spec — importing one runs its describes). New `e2e/chart-text-rv.spec.ts` on the
committed-lockup household (`?seed=surplus`, a ~5–7 min solve) auditing `.rv-host` AND
`.rec-runnerup__viz .rv-host` (audit() is `querySelector` — one call per host), bound `.rec-viz-box` BEFORE
`main`. Its own `playwright.fit-rv.config.ts` (`workers: 1`, `test.setTimeout(900_000)` — the inner
committed-lockup wait is 720 s), `verify:fit:rv` in package.json AND in
`.github/workflows/verify-the-back-nine.yml` (monorepo root — a local-only gate is not a gate). Add the new
spec to `playwright.config.ts:20`'s `testIgnore` DENYLIST (the CSP harness auto-collects `e2e/*.spec.ts`; the
`?seed=` routes are DCE'd there) and keep it OUT of the fit config's `testMatch`. Then restore "every chart
word" in `CLAUDE.md`'s verify:fit row, `docs/architecture.md §12`'s gate bullet, the back-nine-design
`SKILL.md`, and `docs/backlog.md` — all four say RV is unit-pinned only today. The RV hero is the ONLY
`valign="top"` node, so the e2e transform-anchor oracle covers the `--ct-ty` class only once this arm lands
(`chartText.test.tsx`'s source pin holds it until then).
(2) **The critic's arms** (digest `critic-arms`, M together): a `PHONE_LS` 844×390 arm; `gotoVaultFinal` +
`?vault=stale` + `?vault=datestale` (the MAX-cardinality band — FOUR named markers; the crowned work-stops
marker SURVIVES there, never write "withdraws"); the enlarge-modal arm on `.band-modal__dialog
figure.band-figure` (a bare selector returns the INLINE band — vacuous), pin `modalRows <= inlineRows`, wait
on the computed transform, not `settleLayout`.
(3) **The unmeasured trio** (digest `critic-docs-unmeasured`): the placeholder note is dev-preview-only
(`plans/2-first-answer.md:205` still calls it a shipping state — fix the plan); font-swap staleness now has
the `fonts.ready` one-shot in both hooks but NO gate — a probe that loads with the webfonts blocked then
released; a CSSOM-landed probe in `csp.spec.ts` under ENFORCED headers (assert the custom prop / computed
transform, NOT `left > 0` — end-anchored ticks go negative).
(4) Ranked 8 (icons / webkit text), 10 + 11 (the guards; the goal picker's "basics covered" lead on a failing
household needs HIS words over a pilot gate), the phone P2s 2–4 — digest `ranked-8-icons-webkit-text`,
`ranked-10-11-guards`, `phone-walk-2-4`.
(5) `band.css` + `BandLegend.tsx` still claim the legend is "never the sole non-color signal" — false for the
TIERS (no production `callouts` caller); build-vs-accept is a council fork.
(6) The Caddie walk of the four chart faces at REAL + PHONE (the three-register collapse, the HTML-over-svg
look, the hidden interim ticks, the RV above-bar-labels fork).

**LANDMINES (new this session):** `e2e/` is outside `tsconfig.json`'s include — nothing typechecks the specs,
so every new audit field needs a non-vacuity pin (the `data-ct-priority` pin is the pattern). Ink px differ
by rasterizer — 45.0 Windows / 42.0 Linux for the same glyphs (insight 118): pin structure by TEXT, floor ink
with a cross-platform margin, never a Windows number. A synthetic tap at an element's EXACT edge dispatches
nothing on 390@3 (insight 119) — inset 1 px. `test.fail` + a timeout = a real failure (insight 120) —
instrument tests measure first, assert last, and load ONCE (`setRootFont20` BEFORE `gotoSeedFinal`). Local
fit workers are capped at 30% (insight 121); `FINAL_TIER_MS` (150 s, `e2e/reviewSurface.ts`) is the one anchor
wait — `vertical-fit.spec.ts` still re-types `90_000` in eight places (harmless at 6 workers; hoist when
touched). `atceiling` is a DATE seed (~45 s/arm) and rides all five arms. `temp/probe/` is spent;
`temp/chart-text/`, `temp/cold-read-320/` and `temp/phone-walk/` are KEPT — no squeaky clears them.

> **Superseded hand-offs deleted 2026-09-06 (the doc audit):** b9-2 (2026-09-05 midday — `8a6fc6b7` · `add8dea8`) and b9-3
> (2026-09-05 evening — `32c1231d` · `b4b27a60` · `8748e4f5` · `abf1ab38`). `git log` and the kept digest
> `temp/chart-text/verify-0905-b9-2/verify-digest.md` are the record; every still-open re-verify clause they carried is
> folded into the ranked entry it belongs to (the ⚑ "Folded 2026-09-06" blocks) or the register. This file is the
> ranked queue, not a chronicle — a superseded START HERE is deleted, never kept.

> **Moved to the register 2026-09-06:** the 2026-08-14 recovery walk's four open findings and the 2026-08-20 desktop
> intake walk's four open findings (both Tier 3 — his words), and the advice-not-taken semantic-witness record (the
> record-card entry). The no-solve drive recipe moved to "Driving the app" below.

---

## Dated — these fire on a clock

| Fires | What | What breaks |
|---|---|---|
| ~~NOW~~ | ~~NC FY2025-26 revenue certification~~ | ✅ **CLOSED 2026-08-02** — S.L. 2026-41 § 44.1(a) enacted the rate schedule *and* struck the trigger rows the certification fed. Withhold lifted, checkpoint retired. |
| **CI: ~2026-09-19 00:00 UTC** · **runtime: 2026-09-20** | ACA rolling window (`verifiedOn: 2026-08-20` + `maxAgeDays: 30`) — ⚠️ the due date lands INSIDE the Sept 14–30 CR endgame (the Senate returns ~09-14 against a 09-30 funding cliff; two clean competing CRs, House 12-04 / Senate 12-11), which the record names the highest-risk §36B attachment window — run that pass EARLY in the week of Sep 14 and read `forwardClock` first | **TWO dates, and the split is DELIBERATE — one date here was wrong (corrected 2026-08-14).** `verify:aca` compares float-ms so it reds ~a day EARLIER than the runtime clause's integer-epoch-day compare; `oracleToken.ts:174-176` records that ordering as the safe one. **And it is not only CI:** `evaluateAcaFreshnessClause` (`oracleToken.ts:189-198`) is a RUNTIME clause on the user's own browser clock — once overdue the shipped app WITHHOLDS the recommendation for any household carrying an ACA enrolled premium, and `healthSheetChrome.ts:126` flips the health-sheet status line. No deploy required. Clearing it is the 8-step `howToClear` (~1h, primary sources, both attest tables hand-RE-TYPED from the PDFs — never from `health.ts`, that bind goes circular) |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | ✅ **ARMED 2026-08-02** — `annualRoll.tripwire.test.ts` reds the suite (both arms mutation-proven). Clearing it is a **re-sourcing job, never a date bump**; `scaffold.smoke.test.ts:10-13` + `constants.shape.test.ts` red alongside by design |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the four aged tone calls are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |
| **2034-08** | NC's successor flip event — the Office of the State Controller's FY2033-34 final accounting (trigger $40,258,000,000 → TY2035, 0.25pp step, 2.49% floor) | Nothing breaks; it is the only mechanism left that can move NC's rates, and it can only CUT |

⚠️ **The ACA deadline is a ROLLING window, never an absolute `nextDue`** — grepping `nextDue` to inventory
deadlines silently misses it. It has been filed a notch late twice, both times in the unsafe direction.

---

## Next, in priority order

> **Re-verified 2026-08-05 (third pass) — 14 agents, 7 verify→skeptic pairs. ALL SEVEN skeptics refuted
> their verifier on a material point,** and the queue's own block headed *"Anchors, all drifted"* had
> itself drifted ~80 lines in `copy.ts` (two of its four anchors landed on unrelated Medicare strings,
> one on a comment). Every anchor in entry 7 was re-opened and corrected before that build started.
>
> **The measured hit rate on filed prescriptions here is ~25-40%** (the samples live ONCE, in the landmines section at the end of this file; the durable form is insight 105). Every ⚑ block
> dated 2026-08-03 or later is post-refutation; the prose above it is the original filing, kept so the
> drift stays visible. **Open every cited line before executing it.**
>
> ⚑ **Entries 2, 3, 5 (the account-total confirm) and 14/15 are BRIGGSY'S, not builds** — do not start
> them. Entries 1 and 10 — the two that were decided AND executable — shipped 2026-08-14.
>
> ⚑ **The 2026-08-03 second pass** (16 agents) is what de-forked entry 6 and re-sequenced entry 7; its
> findings are folded into those entries. Entry 10 is still the only one no skeptic has ever refuted.

### Tier 0 — calm-but-wrong (shipped code can answer WRONG)

*The cardinal rule's own list. These are defects, not scope.*
1. ✅ **SHIPPED 2026-08-14 (`863747d6`) — the employer-coverage premise is ASKED; the answer it cannot price is REFUSED.** Register Tier 0 carries the closed half. One residue, HIS:
   ⚑ **STILL OPEN, and it is an EYE call, not a build:** `copy.ts healthQuoteHelp` (*"The tool splits
   it by age for each of you."*) was filed as CONTRADICTING the premise. It now reads directly above
   the new step, which states the working-window rule in its own words — so the contradiction looks
   resolved **by adjacency**. That is a tone/comprehension judgment on a rendered pair, so it belongs
   to the Caddie or Briggsy's eye; do not re-file it as a copy defect without a read.

2. **Pre-65 ACA premiums are priced real-flat — the sin the Medicare council ruled solver-BLOCKING.**
   `intakeMap.ts:271-291` (`escalateQuote`) builds both the enrolled premium and the SLCSP benchmark from
   `acaAgeRatingCurve` factors alone — **no cost-trend term**. Part B was fixed for exactly this reason;
   `oracleToken.ts:112-133` writes the argument out (*"disclose-and-ship is FORBIDDEN — a disclosure fixes
   a number, never a mis-ranking"*). The same argument holds at the 400%-FPL cliff, where the household
   eats the full premium. The token has an ACA **legislative freshness** clause and **no ACA pricing-mode
   clause**.
   ⚑ **Audit corrections 2026-08-02 — three anchors were wrong and the fix shape is NOT Part B's:**
   (a) `healthOverlay.ts:296` is a **closing brace**, not a consumer; the real seam is `taxOverlay.ts:1689`
   + `:1731-1738` → `healthOverlay.ts:270`. (b) `copy.ts:924` is a Medicare eyebrow; the strings that claim
   the coupling is priced are **`copy.ts:894-897`**. (c) the excess-APTC field moved to
   `aca-last-verified.json:41` (was `:21`) and `scripts/verify-aca-status.ts:40-72` never declares the key
   — **the clawback gate is inert prose**, not a gate.
   ⚑ **STRUCTURAL — this is why it isn't a Part B copy-paste:** Part B's schedule is built INSIDE the
   engine, which is why the oracle token can witness it. The ACA escalator lives in **intake**
   (`intakeMap.ts:271-291`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto
   intakeMap would be the exact lying-mirror `oracleToken.ts:113-119` warns about. The honest fix moves the
   schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1110`).
   ⚑ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver
   block would hold for months over the whole pre-65 population.
   ⚑ **2026-08-03 double-blind — the pricing defect is REAL and confirmed; the near-term copy move as filed
   was WRONG THREE WAYS.** (a) *"stop claiming the coupling is fully priced"* — **the coupling IS fully
   priced.** A conversion enters `nonSSordinary` → `acaMagi` (`healthOverlay.ts:99-101`) → `slidingScalePtc`
   → net premium, in both preview arms. The fault is the **closed "Not counted here:" list** omitting the
   held-price modeling choice, while the sibling health-sheet list (`copy.ts:945/951`) does name the
   benchmark. (b) *"priced real-flat"* **understates what IS modelled** — `escalateQuote` climbs with the
   age-rating curve (0.765 → 3.000 at 64). Only the **cost trend** is missing; the schedule is not flat, so
   **do NOT borrow `verdictResidualTail`'s "held flat in today's dollars"** — verbatim it is a NEW false
   claim on this surface. (c) the editable strings are **`copy.ts:895` and `:897`** (`894`/`896` are key
   names), and both must move together.
   ⚑ **The direction claim must be CLIFF-SCOPED, never blanket.** `healthOverlay.ts:222`+`:294` give
   under-cliff net = `enrolled − slcsp + contribution`, and `intakeMap.ts:581-582` scale **both** streams by
   the same `escalateQuote` factor — so under the cliff a missing trend is **zero** when E=S
   (`devSeeds.ts:577/578` = 4200/4200) and **reversed (pessimistic)** when E<S, which `copy.ts:209` invites.
   It bites one-way optimistic **only over the cliff** (`healthOverlay.ts:299-303`, full enrolled premium).
   The shipped sibling `recDiscAcaSlcsp` (`copy.ts:1567-1568`) hedges bidirectionally on this exact fact and
   `medicare-pricing-build-spec.md:43` bans the false unidirectional. Draft to append to BOTH strings:
   *"One modeling choice: these prices step up with your ages, not with the way plan prices themselves climb
   — so a conversion that crosses the income line could cost more than shown."*
   ✅ **BOTH XS WINS SHIPPED 2026-08-03** — the clawback gate (`a436caee`) and the false negation
   (`bd851f24`). The gate turned out to be **seven** undeclared fields, not one (`discriminatingProof`,
   `nothingEnactedChain`, `pendingExtension`, `retroactivity`, `adjacentButSharp`, `forwardClock`,
   `strickenCitations`) — all now declared + required, with array arms that reject `[]` (truthy) and
   blank links; mutation-proven against the shipped record. And `copy.ts:945/951` no longer list the
   benchmark premium as uncounted — it is the §36B PTC basis. **What REMAINS open here: the
   cliff-scoped disclosure sentence, and the withhold-vs-disclose fork below.**
   <details><summary>the two shipped XS entries</summary>

   - **Make the clawback field bite (XS, 4 touches).** `adjacentButSharp` appears ONLY at
     `aca-last-verified.json:41`; `AcaRecord` (`scripts/verify-aca-status.ts:40-72`) never declares it and
     `checkAcaStatus` (`:77-130`) never reads it — **inert prose, confirmed twice.** Declare the key after
     `:71`, push an emptiness problem after `:117`, add it to the `base` fixture at
     `scripts/__tests__/verify-aca-status.test.ts:13-37` (else `:42`'s `toEqual([])` reds), add the
     emptiness arm mirroring `:72-80`. ⚠️ **The "no `.github/` exists so `verify:aca` is local-only"
     clause this line used to carry was FALSE — corrected 2026-08-14.** CI exists and runs the FULL
     gate; the scoping error was looking inside `projects/the-back-nine/` when the git root is
     `ai-learning-journey`. See the CI note under "Standing cadences".
   - **A false negation on the health sheet (XS).** `copy.ts:945/951` list *"the benchmark premium itself"*
     under "Not counted here" while the entered benchmark **is** priced (`intakeMap.ts:582` →
     `healthOverlay.ts:213-223`) — the same false-negation shape O16 fixed on the Roth strings.
   </details>

   ⚑ **The open fork is his, and it is not the copy.** The Medicare council's standing law
   (`oracleToken.ts:117`) is *"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a
   mis-ranking,"* written about exactly this shape. Does the pre-65 Marketplace population get the
   conversion ranking **with** the new disclosure (what the BLOCKED-ON-RESEARCH tag silently assumes), or
   does the token gain an **ACA pricing-mode clause** that withholds the ranking — as Medicare's did — until
   a sourced trend lands?
   ⚑ **2026-09-04 anchors + two unfiled facts:** `escalateQuote` is `intakeMap.ts:339-359` (not `:271-291`);
   the "Not counted here" pair is `copy.ts:916` / `:921` (not `:895/:897`) and the surface is SIX strings
   (`:916, :921, :935, :937, :945, :947` — selected by `composeRothOmissionsNote`'s 2×3 matrix, whose
   ACA-priced arm already AFFIRMS the subsidy is counted, so a trend sentence must reconcile with that
   affirmation, not append to it) + the two health-control siblings (`:1013`, `:1019`), which CANNOT take it
   (gated on `statePriced` alone — `copy.ts:1005-1007`). Unfiled: `shadowRateHeadroom` (`copy.ts:2442`)
   quotes cliff headroom against an SLCSP that never trends — the headroom figure inherits the held-price
   optimism; and there is NO ACA cost-trend constant at all (`health.ts` carries only `medicareCostTrend`)
   — ACA premiums are the one health channel with no trend, no clause AND no disclosure, in the
   optimistic direction.

3. **A household outside {NC, PA, FL} gets a confident winner computed with zero state income tax.**
   Reduce-to-spine `+0` is keyed on `PRICED_STATES` membership, so an unpriced state ranks strategies with
   the state term absent — and that term is proven to **flip the optimal anchor** (U14's own NC oracle
   fixture moves it 22%→12%-top). Disclosed in prose only. Decide: refuse outside the roster, or widen it.
   **His scope call.** ⚑ Two corrections from the 2026-08-02 audit: (a) the honest-withhold precedent it
   used to cite — the NC certification block — **is retired**; (b) the withhold machinery gates `solve()`
   ONLY, so a withhold-only fix still ships a **state-blind headline / fuck-off date**.
   ⚑ **2026-08-03 double-blind — diagnosis CONFIRMED, and the "cheap partial" is not cheap and not sound.**
   Pricing is membership-keyed at `taxOverlay.ts:867`; `PRICED_STATES` is `constants/stateTax.ts:50`; the
   flip is pinned live at `optimalityOracle.test.ts:194-205` (NC crowns the 12%-top anchor, the state-absent
   twin the 22%-top). Correction (a) is **half-stale** — the `state-certification-pending` WithheldReason
   (`oracleToken.ts:48`), its humane string (`recommendationView.ts:272-273`) and the whole *held* card
   still ship and are tested; only the **live trigger** is gone, so a new arm is an addition, not a build.
   Correction (b) is **confirmed exact**: `mintOracleToken` has one live call site (`solveEntry.ts:179`),
   reached only via `engineApi.runSolve`; `engineApi.run` (`engineProtocol.ts:277` — headline/confidence)
   and `runDateSearch` (`:314` — the date) mint **no token**.
   ⚑ **The no-income-tax premise is FALSE for 5 of the 8, and it adds 7, not 8 (FL is already priced).**
   Only **FL, NV, TX** carry a broad constitutional ban. **TN**'s Art. II §28 (2014) bans payroll/**earned**
   income only — the Hall tax carve-out proves investment income sat outside it; TN's $0 on dividends is the
   statutory Hall repeal (eff. 2021). **AK** (repealed 1980), **SD**, and **WY** (voter-approval hurdle, not
   a ban) are statutory-only. **NH is a live re-enactment risk**, not a permanent $0: its I&D tax was
   repealed by HB 2 (2023) eff. **2025-01-01** — 13 months old for the modeled year — and a constitutional
   ban (CACR 13) was **defeated** in 2012.
   ⚑ **Real costs the partial omits.** `verify-state-tax.ts:111` loops `PRICED_STATES`, so **every state
   added is a new annual red-build gate with its own `nextDue`** (FL already carries one). Per state:
   `model.ts:317` STATE_ROSTER · a sourced(0) constants entry + profile · `copy.ts` `stateOption<X>` +
   `verdictResidualState<X>` (the exhaustive switches at `stateTaxDisclosure.ts:47-60` and `:122-134` fail
   `tsc` until written) · `recommendationView.ts:252-256` · the intake picker **4 → 11 vertical arms**
   against `verify:fit`. Engine cost is genuinely near-zero (`stateTax.ts:132` structural early return).
   ⚑ **The filed "every saved vault decodes Corrupt" blocker is FALSE — do not act on it, and do NOT loosen
   the compile tie.** `_V3FieldsCover` (`model.ts:2241-43`) covers only `keyof ScenarioV3`;
   `checkStateTaxVintageV3` (`scenarioCodec.ts:541-546`) is hand-written and compels no `needString`. Safe
   because `scenarioCodec.ts:782-783` gates `retirementState` via `needVocab(STATE_ROSTER)`, so no
   pre-widening vault can *be* a household in a newly-priced state. The prescribed remedy — loosening
   `stateTax.ts:427-431` — would **re-open the exact hole that tie was minted to close** (`:421-25`).
   ⚑ **His call, sharpened:** does the refusal reach the **headline + date** (`engineProtocol.ts:277`/`:314`)
   or stop at the strategy? Gating only `solve()` leaves a state-blind first answer for everyone off the
   roster; gating all three blanks the product's magic moment for **~86% of US households**. Widening to the
   no-tax seven moves coverage ~14% → ~27%, of which **Texas alone is two-thirds** — so *which of your
   friends' states actually matter* may make the fork moot. Landmines for the refuse arm: insight-081's
   degenerate overlay ($0 portfolio) builds no overlay and would read as unpriced (**false refusal**), and
   the state step is deliberately **non-blocking** (`questions.tsx:569-575`), so refusing on ABSENT walls
   every household that skipped it.
   ⚑ **2026-09-04:** "no token on the headline/date" is TRUE; "no honesty gate at all" would be FALSE — a
   state-tax disclosure already renders on both first-answer surfaces (`composeVerdictMedicareResidual`,
   `stateTaxDisclosure.ts:41` → `ConfidenceStatement.tsx:454` + `FuckOffDate.tsx:409`; off-roster arm
   `copy.ts:1061` "State income tax isn't priced yet…"). The REAL gap is its GATE: it rides
   `medicarePricedNote` (`healthSheetChrome.ts:336-341` — Medicare-priced AND no health door), so it ships
   for the all-65+ population and is ABSENT for every pre-65 / health-door household — the fuck-off-date
   audience. A THIRD token-less lane exists: `runTwoArm` (`engineProtocol.ts:321`, the U10 control
   preview), gated by copy only. Anchors: `stateStep` `questions.tsx:569`, `fields: []` at `:576`, the
   retired twin `:592`.

4. ✅ **SHIPPED 2026-08-03 (`bd851f24`) — the record card no longer implies the household acted.** What remains — naming the strategy (his ruling) and the advice-not-taken semantic witness that has now missed three times — lives in the register entry "The saved-record card does not name the strategy".

5. **Smaller, each self-contained** *(all four re-anchored by the 2026-08-02 audit)*:

   - **Post-65 non-qualified HSA money is silently forfeited.** ✅ The false *"(conservative, disclosed)"*
     claim at `healthOverlay.ts:747` is **corrected 2026-08-02** — it now says the direction is safe but
     the disclosure does **not** exist, and asks whoever adds it to fix the comment in the same change.
     **The disclosure itself is still OWED** (candidate home: the new "What this leaves out" section below).
   - **Account balances have no magnitude sanity rule** while spend and PIA each got one (real range
     `sanity.ts:51-74`). ⚑ **Size is M, not S, and a ceiling is the wrong instrument:** a 10× slip on
     $500k is $5M — a perfectly coherent household, so no threshold catches it. The shape that works is
     **one confirm on the household TOTAL** at the accounts step (the figure the engine actually consumes),
     reusing the running total already rendered at `copy.ts:1664` / `questions.tsx:974-980`.
     ⚑ **"Briggsy sets the number" is the WRONG ask — there IS no honest number** (every total is
     coherent, so any threshold is the guessed plausibility band burned/062 bans). The only rule that
     invents nothing is an **unconditional** one-tap confirm for any household with ≥1 account. That is a
     friction-vs-honesty **framing fork**, and it is his.
     ⚑ Mechanism: `valueToday` has **no `touched` entry anywhere** (`AccountEntry.tsx` uses the form-local
     `'account.valueToday'`, not `accountField(i,…)`), so a per-account rule could never fire today — a
     synthetic household-total `FieldPath` is not optional.
   - **Long-term care is neither modeled nor in the OUT-but-disclosed list.** ⚑ Recommended home: a new
     third *"What this leaves out"* section in the assumptions panel. The R13 disclaimer is the wrong
     home and is vertical-fit pinned.
     ⚑ **2026-08-03 double-blind — both defects HOLD; the filed shape and the drafted tone were both wrong.**
     Anchors drifted +14: the two `<section className="ap-section">` opens are **`:331` and `:463`**, close
     `:742`, footer `:748`. **It is NOT data-only** — `METHODOLOGY_DISCLOSURES` rows render *inside* section
     a's single `<ul>` (`AssumptionPanel.tsx:426-458`), so an entry there lands in "On your behalf". A third
     section is **~18 lines of new JSX** mirroring `:463-467`, + 1 heading and 2 line keys in `copy.ts`'s
     `assumption*` block (hedge/verdict-EXEMPT at `:1043-1053`; avoid `copyGuard.ts:243`'s
     `/(tap|draw|pull) … hsa/`), + **no CSS change** (`.ap-section*`/`.ap-row*` are generic). **Fit is safe
     and gets safer:** the panel scrolls (`sheetShell.css` `.control-sheet` 88dvh/94dvh, `overflow-y:auto`)
     and the fit gate's panel arm (`vertical-fit.spec.ts:1098-1127`) asserts only that the dialog box fits
     **and** `scrollHeight > clientHeight` — content growth makes the second assertion *more* true.
     ⚑ **The drafted HSA sentence would have DENIED the very forfeit it discloses — do not ship "stays
     put" / "simply sits."** The balance is not parked, it is **destroyed**: `taxOverlay.ts:1812-13` sets
     `buckets = EMPTY_BUCKETS` (hsa: 0) → `simulate.ts:1730` `terminalHsaReal = 0` →
     `objectiveHeadline.ts:58` bequest contribution **$0**. On the exact path the sentence names, the HSA
     adds nothing to the leave-more dollar the reader sees. **The sentence must say the balance is DROPPED.**
     ⚑ **Sweep BOTH stale comments in the same commit** — `healthOverlay.ts:747-750` (which says
     fix-or-it-re-rots) **and** `taxOverlay.ts:1803-1805`, which still calls post-65 HSA-as-ordinary-income
     *"a DISCLOSED non-feature, the survivor-SS class"* — the same false claim, in the file that **owns** the
     mechanism.
     ⚑ **The genuine ruling here is scope, not wording** (tone is Caddie-chair under the batched-oracle law):
     **NIIT is not homeless** — `recommendationView.ts:78` emits it on *every* committed recommendation
     (rendered `RecommendationSurface.tsx:477-486`) and `controlHealthOmissionsNote` carries it on the
     Healthcare sheet. So: ship the section with only the two genuinely-homeless items (HSA forfeit + LTC),
     or make the panel section NIIT's canonical home and prune the other two — the repo's own
     one-honest-home-per-fact law (`healthSheetChrome.ts:333`) forbids a silent third.
     ⚑ **2026-09-04 re-anchor (drifted AGAIN, +62/+101 in a month) + four traps the build must clear.** The
     panel is `src/intake/AssumptionPanel.tsx` — section a opens `:393` / closes `:561`, section b `:564` /
     `:843`, footer `:849`, the disclosures map `:527-559`; the `assumption*` prefix law is
     `copy.ts:1111-1122` (keys `:1123-1248`); the panel fit arm is `vertical-fit.spec.ts:1125-1160`;
     `sheetShell.css:34-35`/`:94`; the overlays are `src/engine/healthOverlay.ts:746-750` and
     `src/engine/taxOverlay.ts:1802-1805` (there is no `overlays/` dir). NIIT's two homes confirmed
     (`recommendationView.ts:90` unconditional; `copy.ts:1012-1013`) — the scope fork is self-resolving:
     HSA + LTC only. TRAP 1 — `Row` REQUIRES a `seat` from the CLOSED 22-member `AssumptionSeat` union
     (`AssumptionPanel.tsx:108`, `assumptionRegistry.ts:39-61`): a leaves-out row is a hand-rolled
     `<li className="ap-row">` or a registry extension — "mirror the section" yields only the shell.
     TRAP 2 — a heading literally "What this leaves out" that names two items is ITSELF a completeness claim
     the constants falsify (`health.ts:72/:112/:120/:135/:316` declare four more OUT-but-disclosed facts) —
     scope the heading or name them. TRAP 3 — the HSA sentence must be true across ALL THREE zeroing
     branches (`taxOverlay.ts:1811-1817`, `:1831-1836`, `:1956-1959`): on each, EVERY bucket is zeroed
     because the path DEPLETED, so a bequest-framed sentence ("dropped from what's left to your heirs")
     names a state the engine cannot reach; the honest harm is that the plan is COUNTED AS HAVING RUN OUT
     while HSA dollars remain unspent (understated survival), because HSA outflow is qualified-medical-only
     and the general draw cannot name the bucket. "Dropped" is guard-safe; "draw … HSA" reds
     `copyGuard.ts:243`; `FALSE_CERTAINTY_INTERNAL` (`copyGuard.ts:136-145`) is universal and
     non-suppressible — "can't run out while the HSA lasts" reds. TRAP 4 — `verify:doc-stats` reds on ANY
     added test until README `:80` + roadmap `:167` move in the same commit. Sweep THREE comment spans (the
     `healthOverlay.ts:747-749` "a sweep found NO user-facing disclosure" clause becomes false the moment the
     section ships — rewrite the whole `:746-750`). Caddie walk before "shipped".

   ⚑ **CLOSED AS PHANTOM — the date-route ACA clock does NOT over-alarm.** The date route simulates all 11
   offsets (`dateSearch.ts:425/450/457`) and candidate Y=0 carries the base ACA stream **ungated**
   (`healthcareStreams.ts:149` → `windowStart = 0`, so the window gate is a pass-through). So
   `exposure.aca === 'priced'` *proves* the ACA tables were consumed — the clock is load-bearing, not
   spurious. ✅ **THE TRAP IS DELETED 2026-08-02.** `stalenessExposure.ts` no longer prescribes
   "re-derive against the CROWNED offset" — that arm would have **silenced** the ACA clock for exactly the
   household whose crown a subsidy flip moved (insight 103's shape, for the THIRD time in that one
   comment). The file now records the sweep argument and keeps only the sound arm: **per-clock attribution,
   so the ACA line can withdraw without taking the tax and Medicare lines with it** — which requires
   `rulesMoved` to stop being one OR-collapsed boolean. Nothing here is urgent: the residual over-alarm is
   bounded and knowingly accepted, and the clock is load-bearing.

6. ✅ **SHIPPED 2026-08-03 (`2652b7a6` + `94ea8d00`) — the hero is measured against the household's OWN plan, on both coupled tax controls.** Proven at the engine seam; the runtime semantic witness is the same register entry as 4.

7. ✅ **SHIPPED 2026-08-05 (`db371655` + the ladder fix) — the recommendation names the plan.** One increment left:
   ⚑ **THE ONE INCREMENT LEFT: the no-change register still does not name the plan.** A household on
   `?seed=health` + pay-less-tax reads *"You're already on one of the strongest paths we tested"* and
   never learns WHICH path. Deliberately out of scope: the proof above holds only in ACTIVE, so the
   no-change arm needs the `custom` branch (with a THIRD ui bucket map — `SequencingControl`'s is
   intake-private and `reentryChrome.ts:47`'s points at different strings) and different words, since
   `mode === 'no-change'` is NOT "the winner is the plan you run" (it also fires on a seed-B display
   inversion and a $0 collapse). **No seed produces a `custom` winner**, so that branch would ship
   unwitnessable — mint the seed first or leave it.

8. **The whole still-working audience gets no strategy — silently.** `Result.tsx:476` gates
   `RecommendationSurface` off for the date route entirely and `:362` gates the invite door. The
   `blocked{spine-unready}` note that would explain it lives *inside* the gated-off component, so a working
   couple sees the date answer and **zero words** about strategy. `Result.tsx:340`'s comment claims "the
   builder's `spine-unready` refusal covers the date route honestly" — it does not render.
   ⚑ **THE FILED "CHEAP INTERIM" IS WRONG — do not execute it.** Dropping the `!isDateRoute` gate at
   `:476` alone renders an **empty `<div>`**, not the refusal: the note is not reachable on that path. And
   reusing `recommendSpineUnreadyNote` would tell a household with a **complete** answer that its answer is
   incomplete — a new false claim, worse than the silence. The honest interim is a **route-true one-liner**
   admitting the v1 limit in its own words, seated and re-measured under `verify:fit` (~89px headroom).
   **Briggsy blesses the words.** Full parity stays council-sized — the crowned offset lives in the
   committed answer, not the draft, and anchoring candidates at a future retirement year is a real ranking
   question.
   ⚑ **2026-09-04 anchors:** the gates are `Result.tsx:482` (surface) and `:369` (the invite conjunct; door
   `:547-554`); a THIRD exclusion kills the record card at its producer (`IntakeApp.tsx:284`). Strike
   "~89px headroom" — that is the SPINE idle frame's figure; the date arms of `verify:fit` assert ORDER only
   (spec header `:21-22`). `Result.tsx:345-347`'s "covers the date route honestly" comment was FALSE (never
   minted there; a route-flip render is dropped) — swept 2026-09-04. A crowned-offset params builder ALREADY
   exists (`buildControlPreviewParams`, `intakeMap.ts:1071-1080`), so parity's base shape is not from zero.
   Build shape under ranked item 6.
   ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 6, the date-route one-liner) — its 2026-09-04 re-verify clause, still live:** Date-route one-liner (S) via a Caddie card — words must be true on all FOUR date-hero framings
   (anchor on WORK STATUS, never "a date ahead of you"); the one token yours: does it promise parity.
   ⚑ **2026-09-04:** the framings are no-date · now (today/arrived) · past · future (`heroLead`,
   `FuckOffDate.tsx:183-202`; the split household's floor line has its own six arms, `:209-238`). Seat =
   the else-arm of the `Result.tsx:482` gate, gated ALSO on `focusKey !== undefined` (else it prints beside
   the non-answer strip on an inputs-incomplete date frame); CSS in `fuckOffDate.css` — NOT
   `confidence.css`, the date grid is its own (`:220-236`) and its first free cell is r3c1 above the
   protected disclaimer; the key lands in verdict scope through the `fuckoff` substring net
   (`copyGuard.ts:72`) so free-numeral bites — no bare digit. The date arms of `verify:fit` assert ORDER
   only (only `dip` + `datenc` carry the exhaustive doors-last sweep) — add a presence pin to the `?seed=dip`
   describe and measure the vertical cost by hand. The line must also be true on the route-FLIP frame: a
   committed rec whose spouse un-retires lands `stale` (not `blocked`) and the gate drops the stale card's
   own re-open door with it. `Result.tsx:345-347`'s "covers the date route honestly" comment was FALSE —
   swept 2026-09-04.

9. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
    `solveDispatch.ts:79` returns `'no-pretax'` when no *conversion* candidate survives — but a
    conversion-free candidate survives for **every entry in `SEARCHED_POLICIES`** (`candidates.ts:331-337`),
    and `solve.ts:452-457` already implements that exact partition for the trend-blocked case.
    ⚑ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:140-147` mint-fails the
    roster *before* `solve()` runs, and `rankingStability.ts:145-153` knows only a conversion-**amount**
    perturbation. So dispatching the sequencing-only field would surface `mint-failed{roster}` **live** —
    the exact state `solveDispatch.ts:76` forbids in its own comment. Making it real needs a second
    validation law (a sequencing perturbation) under every shipped recommendation, which is a one-way door
    on what "validated" means.
    ⚑⚑ **AND THE "CHEAP COPY FIX" IS ITSELF A TRAP — found 2026-08-02 while attempting it.** The filed
    near-term move was to reword `copy.ts:1408` so it blames only the **conversion** half rather than "a
    withdrawal strategy." **Do not.** The code still returns `'no-pretax'` and runs NO solve, so a sentence
    saying only conversions are blocked would promise a withdrawal-order answer we never deliver — trading
    a false CAUSE for a false PROMISE, which is strictly worse. Any honest rewording must ALSO say we are
    not ranking an order here, and that sentence is a real drafting call (the current wording was chosen
    deliberately — `copy.ts:1404-1406` records that naming "a withdrawal strategy" cures the panel's
    unglossed-"order" stumble). **Briggsy's words, or ship the engine half first.**
    ⚑ **2026-09-04 anchors:** the described arm is `solveDispatch.ts:91` (`:78` is the separate no-tax-overlay
    arm; `~:79` was mis-pointed at filing — the file is untouched since 2026-08-14); the refusal string is
    `copy.ts:1537-1538` with its three-rewrite comment `:1514-1536` (`:1404-1408` now holds an unrelated
    save-refusal block).

10. ✅ **SHIPPED 2026-08-14 (`2816d036`) — the heir bracket is the household's now.** Register Tier 1 records the closure and the three swept comments.

11. **The surfaces a friend actually hits have never been walked or cold-read by anyone.**
    ✅ **PARTLY CLOSED 2026-08-14** — `RecoveryFlow`, `RestoreFlow`, ColdStart, Unlock and the Backup/
    Export ceremony have now been walked end-to-end at 1536×791 and 390×844 (findings ranked at the top
    of this file). ✅ **THE REST CLOSED 2026-08-20 AT DESKTOP** — the full organic intake (ColdStart →
    every step incl. Accounts, a real mixed household typed in by hand) and the first-Save ceremony
    (passphrase + recovery word + backup + success frame) walked end-to-end at 1536×791; findings in
    the 2026-08-20 block at the top. **STILL UNWALKED: the same intake at 390×844** — the desktop walk
    cleared the copy and the mechanics, not the phone fold.
    ⚑ **What the first walk cost the product, as the argument for doing the rest:** it found a
    WCAG 3.3.1 gap on all four credential ceremonies that 3,284 green tests could not see — the
    `externalError` channel announced the negative-pairing bounce and then left BOTH fields reporting
    themselves valid, so an AT user heard the error once and tabbed back into a control the app called
    fine. Fixed + mutation-proven in `c327e011`, with the component's first-ever suite. **A green
    suite cannot see an orphaned alert; only the frame can.**

12. **The couple's own data.** ✅ **The warn half SHIPPED 2026-09-03** (the review's residuals sit in the
    register under this entry's title): a reload mid-intake, on the never-saved result screen, or on an edited-but-not-re-saved
    hydrated plan now raises the browser's dialog; the healthcare.gov link is a new tab and never
    fires it. **Still open:** persistence itself — an interrupted intake still loses the whole
    household (up to **14** steps — 8 unconditional + 6 gated, `questions.tsx:1191-1209`) if the
    reader confirms the dialog, because nothing is written until Save (the D1 law; a plaintext
    draft outside the vault is a security-posture ruling, never a build) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:578` refuses anything but
    v3, and the brick runs in the LEGACY direction: a v4 blob is caught honestly upstream
    (`scenarioCodec.ts:947` → `unlockNewerVersion`), but the moment a future build writes v4, today's v3
    vaults fall into the arm v1/v2 sit in now — decode-ok, then "That didn't work. Try again." over a
    reload that cannot succeed (`IntakeApp.tsx:670-687`) — and their backups fail identically (same bytes,
    `backup.ts:84-93`) · there is **no way to delete the vault** (`clearVault` exists; its only PRODUCTION
    caller is the dev seed planter, `devSeeds.ts:1637` — eight test/e2e files also call it).
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 9 — the aged note, the v2→v3 ladder, the leaves-out section) — its 2026-09-04 re-verify clause, still live:** Aged-window disclosure note (S; the ranking fork stays yours, three arms with corrected costs, due
    before 2027-01-01) · migration ladder scaffold (S; the honest legacy state names NO remedy — the
    backup carries the same bytes) · HSA-forfeit + LTC "What this leaves out" section (M; pilot per the
    register — the queue's owner call is the account-total confirm only).
    ⚑ **2026-09-04, each re-scoped:** (a) THE AGED NOTE IS NOT PILOT — Tier-1 7c rules "Do NOT fix this in
    copy" and both nearest register entries are **briggsy** (`backlog.md:733`, `:780`); the "three arms with
    corrected costs" existed NOWHERE — they are now written, with sizes, under the register's "The aged
    surface" entry. A shipped copy defect on the SAME cohort IS pilot: `rothPlanRanked` (`copy.ts:2339-2350`)
    hardcodes the plural "Those years are counted from…" after a correctly-singular "for 1 year" — live for
    any at/past-RMD household on an aged vault (the 1-year clamp, `solveAnchor.ts:206-207`) — and no test
    covers `years: 1, passed: true`. (b) THE LADDER is register `L` · **pilot**, and the v2→v3 ALGORITHM IS
    PRESCRIBED: `model.ts:1386-1388` mints synthetic entered accounts from the old aggregates "so the ladder
    stays total"; the write primitive exists (`db.ts:221 rewriteModel`, pinned `db.test.ts:180`); today's
    ladder is decode-and-return with NO migrate step (`scenarioCodec.ts:930-947`), and a v1 vault survives
    every store seam on real IndexedDB (`e2e/vaultHarness.ts:19-20`) to die only at `IntakeApp.tsx:578`.
    Two new defects ride with it: `session.ts:464-468` claims the writer and UNLOCKS before the version is
    judged (the recovery path claims unconditionally, `:539`), and `backup.ts:209-213` LANDS a legacy backup
    on a clean device and only then dead-ends. Size M–L, not S. His word narrows to the TERMINAL arm's
    sentence (v1, or a genuinely unmigratable shape) — and "legacy" already means "a v3 vault missing
    additive-optional fields" (`staleness.ts:24`, `resultSave.ts:146`), so the new reason must not reuse it.
    Five docs call the refuse-ladder "the migration ladder" (`architecture.md:204`, `plans/1-engine.md:142`,
    `plans/3-controls.md:40`, `product.md:165`; `roadmap.md:63` fixed 2026-09-04) — sweep with the build.
    (c) THE LEAVES-OUT SECTION is pilot (register `:277`, `:283`); anchors + the four traps are under
    Tier-0 entry 5 below.

13. **Also:** no icons at all, so the "local-first PWA" is not installable · Chromium-only verification
    while the durability story is explicitly about Safari eviction · the fit law is never checked at
    enlarged text · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · ✅ the solve
    lane's EDIT-TIME cancel shipped 2026-09-03 (`engineClient.ts:177 createResettableEngine` +
    `memoryModel.ts:726-729`); what remains is the interactive tier and the MAIN-THREAD FALLBACK, which still
    freezes the tab for the whole solve and says nothing — its `reset` is a documented no-op
    (`engineClient.ts:45-57`; the old `:50` anchor named nothing about freezing).

### Tier 3 — Briggsy's call
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 8 — icons · WebKit arm · enlarged-text arm) — its 2026-09-04 re-verify clause, still live:** PWA icons (S, silhouette-first, his eye audits) · WebKit e2e arm (M) · enlarged-text fit arm (S,
    CDP `Page.setFontSizes` — council only on a protected red).
    ⚑ **2026-09-04:** INDEPENDENT, not a chain — the text arm rides CDP (Chromium-only) so it can never share
    the WebKit project; all three are pilot (register `M` · **pilot**; "his eye audits" is the post-hoc
    batched-oracle read, not a gate). ICONS: `manifest: false` (`vite.config.ts:36`) disables the plugin's
    icon precache, so ship `includeAssets` (or image globs) WITH the files or the installed PWA has no
    offline icon (proven against `dist/sw.js`); the favicon 404 is a SECOND sub-task (`public/favicon.ico`
    + `<link rel="icon">` — `index.html` has none); no brand mark exists to quarry — the color-blind-safe
    SVG glyph vocabulary (GradeSignal / verdictSignal / BandLegend) is the silhouette source; CSP already
    allows `img-src 'self'`. WEBKIT: `playwright install webkit` IS required (the on-disk `webkit-2272` is a
    stale revision — `@playwright/test` 1.60.0 needs 2287, launch fails today) + `webkit` on
    `verify-the-back-nine.yml:66`; scope at TEST level — `vault.spec.ts:62` (trust loop) + `:84`
    (second-tab read-only), never the whole file: the KDF spike `:106-137` asserts a Chromium-only
    thread-pool fact; the arm proves the IndexedDB / Web Locks / BroadcastChannel / `storage.persist()`
    paths RUN in WebKit — it does NOT verify Safari eviction (nothing in the repo executes a real eviction;
    both harnesses model it with a wipe). ENLARGED TEXT: `Page.setFontSizes` re-probed 2026-09-04 against
    the repo's chromium-1223 — the param shape is `{ fontSizes: { standard: 24, fixed: 24 } }` (the flat
    form is rejected); it propagates because the type scale is rem/clamp with ZERO literal-px `font-size`
    rules; the `newCDPSession` pattern is at `caddie-walk.spec.ts:293`; re-run the 8 REAL+TIER one-frame
    arms (4 spine seeds × 2), not all 52; PROTECTED = `vertical-fit.spec.ts:16-20`.

14. **His eye, the standing block.** The stacked tape rows (07-08 → 07-23, which also score the
    Opus-vs-Sonnet Caddie flip) · the four aged-surface tone calls, **due before 2027-01-01** · the chart
    framing forks (whose range is shaded, which odds the ladder quotes, the axis units) · `?vault=stale`'s
    MEANING ruling (both obvious repairs are measured dead ends) · the three-doors rhythm on `datemixed` ·
    the essentials median line · the record card's strategy naming (half 2) · the phone-rhythm pass · the
    fiduciary's current-law-as-written caveat, unanswered since 2026-07-09.
    ⚑ **On-surface re-audit owed** for the two Card 9 / GoalPicker fixes that shipped without it — a
    chat-approved change does not survive his re-read on the surface (the 2026-07-11 false-PASS lesson).

15. **Verify-owed, and it needs him.** The OOP-medical figures (`src/intake/referenceData.ts` →
    `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified
    (`directionalUntilPinned`). BLS bot-walls `curl`, so this is the sanctioned exception to
    no-manual-steps: ask Briggsy to pull the CE "Age of reference person" table and pin them cell-by-cell.

### Tier 4 — hygiene

16. **The gates that don't bite (14 filed bullets — 13 distinct, the last two the same deferral filed
    twice; the CVD one is PARKED, below)** — R7's registry is one level deep, copyGuard's scope is
    a prefix allowlist with no forcing function on new keys, and several arms still cannot fail. None can
    produce a wrong answer today; all mean the net is thinner than it reads. Plus the Medicare-trend
    riders, the open copy obligations, the deferred richer market draw, and the `dateinvert` (c) mint —
    its own session, a size-L parameter hunt.
    ⚑ **2026-09-04:** two bullets were half-dead and are closed — the `partBTrendVintage` "no exposure gate"
    clause was swept in `staleness.ts:550-553` but still lived verbatim at `model.ts:2253` (swept), and
    Plan 4's "the record carries `seedA`/`seedB`" (`plans/4-recommendation.md:282`) had outlived its own
    "kill BEFORE S5 mints" deadline — the shipped `SavedRecommendationV3` (`model.ts:1878-1900`) has no seed
    field (struck in the plan).
    ✅ **NC's RETIRED CERTIFICATION CHECKPOINT — SWEPT 2026-08-14.** Six shipped surfaces (not the
    five filed; `CLAUDE.md:35` turned up in the sweep) still asserted the dead ~Aug-2026 event in
    PRESENT tense after S.L. 2026-41 struck every trigger row FY2025-26 → FY2032-33 on 2026-08-02:
    `scripts/verify-state-tax.ts` header + its `nextDue` doc comment · `verify-the-back-nine.yml:46`
    · project `CLAUDE.md:35` · and two in the engine — `constants/types.ts` and
    `validation/oracleToken.ts`. All now name it as RETIRED, in past tense, and the two engine
    docblocks additionally record that **`certification-pinnable` currently fires for NOBODY** — the
    kind survives only because the machinery is generic and the next directional state re-arms it,
    which is the thing a reader would otherwise mis-infer from an NC example written in the present.
    The `verify-state-tax.ts` header also gained the source landmine it was missing: NCDOR's rate
    page and the codified G.S. page both still show the struck "after 2025 — 3.99%", so they read as
    CONTRADICTING the pinned record until they recompile — **session law wins, do not "correct" the
    engine table back to a flat 3.99%.** Comment-only; typecheck · lint · 3289 tests · state-tax gate
    all green. (`copy.ts:2620` and `caseStateCompanions.ts` were already correct — swept 2026-08-02.)
    ⚑ **The CVD half of this cluster is PARKED, not owed — do not re-propose it.** The filed gap ("the CVD
    crops prove PRESENCE only") is real, and a `verify:cvd` pixel-regression gate was designed for it on
    2026-08-02. **Briggsy declined it on the only authority that can:** *"I'm pretty color blind and I think
    b9 looks great."* Per `caddie/SKILL.md:235` the colour lane can only flag, never pass — his eyes own the
    verdict, so that IS the pass (taste-corpus rule 40 + exemplar E14). Rule 18 still binds every NEW
    surface; this covers what he has seen. **Being colour-blind qualifies him as the oracle rather than
    disqualifying him** — he is the failure mode, not a judge of prettiness, and a simulated-CVD PNG is only
    a model of him. Reach for the human before building the simulator.

---
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 10, the hygiene session) — its 2026-09-04 re-verify clause, still live:** Hygiene session (M): the copyGuard scope canary first (six `rec*` keys sit in neither scope today).
    ⚑ **2026-09-04:** "nine items" was UNSOURCED (no such list exists anywhere; Tier-4 "The gates that don't
    bite" carries 14 filed bullets = 13 distinct, one of them the CVD probe Briggsy parked). The real
    copyGuard defect is ONE key: `recVizAria` (`copy.ts:2674` — was filed `:2666`) speaks three dollar figures + a delta to a
    screen reader outside require-hedge — the AT twin of the gated `recDeltaTypical` — and its exclusion is
    a RECORDED decision (`copyGuard.test.ts:577-578`), so the fix reverses a stated call, not an accident.
    Fix = RENAME it onto an existing control prefix (`recDeltaVizAria`; a new `recViz` prefix would red
    three correctly hedge-free labels) + a catalog canary over `/^rec(?!over)/` (a bare `/^rec/` reds 16
    innocent `recovery*` intake keys) with a NAMED allowlist that SPLITS flat keys from slots (unscoped flat
    keys get 2 gates, unscoped slots get 3 + catastrophe). Scope is decided ONLY in the test file
    (`lintCopy` is scope-agnostic) — the canary is a row there, not a gate. The 11 byte-identical
    `EngineClient` fakes cost an 18-file sweep (not 19) — a shared helper. `ensureSeed()`: the two queue
    files DISAGREED (the register's residual list says "none a build without a ruling", this file carried no
    flag) and BOTH candidate fixes cost something — "mint through `update()`" turns a deferred false-arm
    into an immediate one; an eager mint in `createMemoryModel` breaks the WRITTEN contract #1b (mint at the
    FIRST ENGINE RUN, `plans/2-first-answer.md:68`) with no test that would catch it. His ruling, framed as
    those two arms. Two half-swept false comments closed 2026-09-04: `model.ts:2253` and
    `plans/4-recommendation.md:282`.

## Standing cadences

- `/ultramode-code-review` at every unit boundary; the **four-skill UI loadout** before ANY user-facing
  surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** native Agent Teams for live-steer **eye-oracle** units; the Workflow tool for
  fire-and-forget **test-oracle** fan-out. Durable laws in memory `feedback-delegated-build-laws`.
- ⚠️ **CI EXISTS AND EVERY GATE IS ENFORCED — this file asserted the opposite until 2026-08-14.**
  `.github/workflows/verify-the-back-nine.yml` lives at the **monorepo root** (`ai-learning-journey`),
  NOT inside `projects/the-back-nine/`, which is why grepping the project dir "proves" there is no CI
  and has now produced a false claim twice. It triggers on push to `main` + PR on paths
  `projects/the-back-nine/**` (plus the workflow file itself) and runs, in order: `verify:aca` ·
  `verify:state-tax` · `lint` · `typecheck` · `verify:doc-stats` · `test` · `build` ·
  `verify:bundle` · `verify:csp` · `verify:fit`. **All ten.** `vercel.json` carries no
  `buildCommand`, so a deploy still runs the default build with no gate — CI is the gate, Vercel is not.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (one file per lesson; cite by full path + slug).
These are the mechanical ones that keep costing hours.*

- **A filed prescription in this repo is ~25-40% executable as written** — thrice-measured (5-of-11,
  2-of-5, 1-of-5 clean). Drifted anchors, mechanisms the code does not have, edits that would write NEW
  false claims. **Open every cited line before executing; budget as if it were unwritten.** A prescription
  never inherits the trust of the correct diagnosis above it.
- **Line-ending churn — and "use node instead" is NOT the fix by itself.** `sed -i` in Git Bash rewrites
  the whole file CRLF → LF; this repo is `core.autocrlf=false`, so the churn lands in the commit (an
  884-line diff on a 20-line edit). **But a node script that hardcodes `lines.join('\r\n')` does exactly
  the same thing in reverse** — hit 2026-08-02, turning a 196-line TODO edit into a 648-line diff.
  Rewriting a file? **Detect the existing ending** (`raw.includes('\r\n') ? '\r\n' : '\n'`) instead of
  assuming either. The real rule is the last one: **always `git diff --stat` before staging, and if the
  changed-line count is near the file's line count, it is churn — stop and fix the endings.**
- **Never read a command's verdict through a pipe.** `cmd 2>&1 | tail` returns *tail's* exit code — this
  has burned both `gh run watch` and `pnpm caddie:walk`. Redirect to a file and echo `$?`.
- **CI verdicts by explicit id only:** poll `gh run view <id> --json status,conclusion` to `completed`,
  then read `conclusion`. A watch exit code lies in **both** directions.
- **`pnpm verify:bundle` reads `dist/` WITHOUT rebuilding.** A stale `dist/` is a false green; this has
  bitten twice. Fresh `pnpm build` first, every time.
- **`verify:fit` does NOT measure the recommendation surface** (`e2e/vertical-fit.spec.ts:391-397`
  excludes the committed + held renders — a live solve blows the 120s budget). So *"seat it and re-measure
  under `verify:fit`"* is **unexecutable** for anything in `.rec-committed__rest`; it needs a MANUAL
  1536×791 measure. And the *"~89px headroom"* number is the SPINE idle frame (`:1773`), a once-measured
  prose figure the spec never asserts — **never budget a different surface against it.** The DATE route's
  arms assert ORDER only (spec header `:21-22`) — no date frame has ever been fit-measured either.
- **A live solve is minutes, not seconds — budget for it.** A dev-build `?seed=nc` solve measured **~11
  minutes** (2026-08-03) — but that is the SINGLE-BUCKET figure and it does not generalize: the
  three-bucket `?seed=buckets` measured **~25 minutes** the same day. Bucket count moves this a lot;
  quote the figure for the household you are actually driving. Prod DCEs the dev seeds, so a browser walk that needs a committed
  recommendation has no fast path. Before calling one frozen, measure CPU on the Playwright renderer
  (`Get-CimInstance Win32_Process | ? CommandLine -match 'ms-playwright'`, then sample `.CPU` twice) —
  a pinned core means it is computing, and Briggsy's own Chrome PIDs will read 0% and mislead you.
- **`console.log` in a vitest run is SWALLOWED here** — a measurement probe that prints its answer
  produces a green run and no output, which reads as a silent failure. Write results to a file
  (`writeFileSync` to the scratchpad) and `cat` it. Cost one full 78-second run to discover.
- **A directional caveat is a CLAIM — measure it or drop it.** Writing "low path counts under-count
  this, read it as a floor" on the demotion-frequency probe sounded obviously right and was **backwards**
  (15% at 400 paths → 11% at 1600). Re-running at 4× cost five minutes and inverted the conclusion. If a
  caveat is worth writing next to a number, it is worth one more run.
- **Verify a planted mutant landed, and hit the right occurrence.** A no-op edit goes green and reads as a
  surviving mutant; a replace on the wrong line produces a real-looking red for the wrong reason. Match on
  a unique anchor, then `grep` the file back. **And run the baseline before diagnosing your own change** —
  when the task is "extend the harness to capture X," run the harness *first*.
- **Never `git checkout -- <file>`** to revert a planted mutant on a dirty tree; it nukes uncommitted work.
  Revert with Edit.
- **Never measure the tree while an agent fleet works in it** — their scratch files produce bogus doc-stat
  reds and bogus test counts. Never run the Caddie walk concurrently with the full suite (CPU contention
  times out the final-tier waits). **A PARALLEL SESSION on another project is the same hazard from
  outside the tree:** 2026-08-20, three RecoveryFlow tests (the ~1s KDF waits) red inside a full run
  whose imports took 260s, then green isolated AND green on a full re-run — re-run the failing file
  alone before believing any timing-shaped red.
- **A StructuredOutput schema that asks for too much output fails the whole call** (insight 084). Split the
  fan-out; never ask one agent for dozens of long fields at once.
- **`?vault=` / unlock / save need a secure context** (`crypto.subtle`) — localhost or https, never a bare
  LAN IP over http.
- **`verify:fit`'s `?seed=dip` arm is LOAD-SENSITIVE and can red the whole gate on a busy machine.**
  Measured 2026-08-05: it PASSES isolated at 1.1m and FAILED at 1.5m inside the full parallel run, on
  `gotoSeedFinal`'s 90s wait for the FINAL engine tier (`reviewSurface.ts:74`) — the heaviest date seed
  sweeping 11 offsets at final precision. **Do NOT just raise the 90s** (insight 106: a fix that raises a
  bound must prove that bound is the one that binds, and three prescriptions in a row adjusting a clock
  means the wait is the wrong instrument). The wait is on REAL compute, so it is slow rather than
  impossible — which is the opposite of 106's case and needs its own diagnosis. Re-run the arm alone
  before believing a red: `pnpm exec playwright test --config=playwright.fit.config.ts -g "seed=dip"`.


⚠️ **A REAL-BROWSER LOOK IS NOT OPTIONAL ON A COPY CHANGE, and 2026-08-05 proved it twice in one day.**
Two defects shipped past a fully green suite and died on the rendered frame: a heading whose *"there"*
had no referent, and a formatter quoting `~$140,000` for a $148,300 anchor. A third — the card telling an
aged vault its recommendation had *"started in 2026"* — needed a 20-agent review to surface, and a test
had been written PINNING it. **Read the frame as a user, not as the author of the assertions.**

⚠️ **`mode: 'no-change'` HAS FOUR DISJUNCTS, NOT ONE — this cost a real diagnosis 2026-08-03 and will
cost the next one.** `recommendationView.ts:175-180`: `noChange` **OR** the grade's `subTenthCollapse`
**OR** a seed-B display inversion **OR** a delta that formats to $0. So *"the surface says **You're
already on one of the strongest paths**"* is **NOT** evidence that `noChange` is true, and a browser
frame can be byte-identical before and after a change that genuinely flipped the flag. Read the payload,
never the words, when the question is about a flag.


**Landmines the 2026-09-05 session added (the chart text layer; the instrument half is insight 116):** a
`node -e "…"` string carrying `$2.25M` lost its dollar to SHELL interpolation and broke the quote — write
every script to a file with the Write tool and run it, never inline · the Bash tool persists any output
over ~30 KB to a file and shows 2 KB — read the file with the Read tool, don't re-run · `document.fonts.check`
returns true for a face that does not exist · `getBBox()` on svg text is the em box, not the ink · a
first-match regex over a stylesheet matched the retirement COMMENT and went green (match `selector {`,
comment-strip first) · a Playwright `:not(:checked)` locator re-resolves after the click — pin by
`[value=…]` · a `<span>` host for absolute children collapses their percentage positions onto one point —
`display:block` it · a unitless `0` in a custom property that feeds `calc()` invalidates the WHOLE
declaration (`transform` fell to `none`) — `0px` · `?seed=datemixed` renders no ladder; `?seed=failing` is a
RESOLVED band, not the placeholder; `solve:nc` renders no `svg.rv` — only `solve:surplus` does (~5 min) ·
the dev server for measurement lives on **4197** (4190 fit · 4195 caddie · 4180/4181 CSP).

**Landmines the 2026-09-04 session added:** a mutant REVERT anchored on a line that also appears elsewhere
fails the exactly-once check and leaves the mutant PLANTED while the chain reads green (the unwitnessable
arm's mutant line — `{ kind: 'unavailable', …, detail: payload.detail }` — is the aborted arm's line too);
verify the revert with the same grep count as the plant, on a UNIQUE anchor · `grep -c` returning 0 exits
1 and breaks an `&&` chain — the step after it silently never ran (cost one re-run) · `grep -c $'\r'` lied
about line endings in this Bash tool (2,689 CR lines counted in an LF file) — trust `git diff --stat` and
node's `raw.includes('\r\n')` · `String.prototype.replace` with a replacement carrying `$$` eats a dollar
sign (the window sentence lost its `$`; the existing pins caught it) — split/join, never replace · the
`failing` seed's live solve is sub-second even at full precision (the household dies in year one), so a
`?seed=failing` browser witness costs seconds, not the 11-minute budget — the goal-pick → held card was ~4 s · the MECHANISM I inferred for the bin ("the pool cannot absorb the perturbation") was refuted by the review fleet on the seed itself (the pool absorbs it with $8,732 to spare; every path depletes in year 0 so the surface is all-zero) — a 5-lens review with 2 refuters per finding confirmed 14 of 31, and the P1s were all this one false mechanism laundered into eight docstrings; probe a mechanism before writing it into the docstring a sentence will be authored from.

**Landmines the 2026-09-03 session added:** the Bash tool mangles heredocs carrying nested quotes — write the
script to a file with the Write tool and `node` it · `.playwright-mcp/` and `temp/` are BOTH gitignored
(`.gitignore:24`, `:4`) — the `mv`-before-`git add` half was stale; what matters is DESTINATION: pass a
relative `filename:` on `browser_take_screenshot` (`scale` is a REQUIRED arg) and copy into `temp/<walk>/` · Playwright `fill` + an immediate Continue click can
land without a blur and not advance (seen once on the OOP step; a real tap blurs first) — click the
step heading to blur, then Continue · a power/network blip drops Vite's websocket and full-reloads the
page to ColdStart mid-walk · `:nth-match(label:has-text("…"), N)` is the selector for the sr-only
radios (the label intercepts the click) · CLAUDE_CODE_SUBAGENT_MODEL=opus is set in settings.json
since today — a fresh terminal picks it up; STILL pass `model: 'opus'` on every spawn and check
`/tasks` shows Opus · **(second session)** a temp script must be `.cjs` — the package is
`"type": "module"`, so `require` throws in a `.js` · the Playwright MCP's `browser_navigate` STALLS
the full 60s on a `beforeunload` dialog (the stall IS the witness; `browser_handle_dialog(accept:false)`
clears it and the page survives) · Playwright `fill` on a formatted currency field APPENDS ("6,500" +
"6600" → "65,006,600"); click → Ctrl+A → `pressSequentially` replaces · "Edit in the walk-through"
lands on step 1, never the section's step (no start-at-step API) · a `?seed=` route bypasses the vault
even when one exists; the plain `/` route is the Unlock check.

---

## Driving the app

`pnpm dev`, then a `?seed=` or `?vault=` param. DEV-only, DCE'd from prod. Source of truth:
`src/ui/devSeeds.ts` — `DEV_SEEDS` at `:942`, `AGED_PLANTS` at `:1481`.

**Scenario seeds** — jump straight to a worded result + band:

| Seed | Face |
|---|---|
| `retired` | all-retired, on-track spine band — the U12 core |
| `date` | still-working — the fuck-off-date band |
| `borderline` · `dateborder` | borderline verdicts whose band descends to $0 — the honesty cold-read |
| `failing` | the bad-news verdict |
| `budget` | the budget builder's own face |
| `datesplit` · `datemixed` | split floor/lifestyle dates · the three-doors rhythm face |
| `dip` | **the hard-gate seed** — non-monotone ladder (dips 0-2, crown 5) + an applied conversion |
| `order` | custom drawdown order, round-tripped through the codec |
| `health` | the healthcare door/sheet |
| `date65` | all-65+ still working — Medicare priced, no false "unpriced" note |
| `surplus` | the over-funded ACTIVE recommendation — delta-as-hero + the median qualifier |
| `buckets` | **the ordering witness** — 3 real buckets (pre-tax + taxable-with-gain + Roth) on the `proportional` default, so `taxable-first` and the household's own order finally DIVERGE. The only seed on which "your plan today" is observably their plan. Live solve (~11 min in dev) |
| `steer` | the `no-pretax` typed refusal — invite → GoalPicker → calm refusal, no solve |
| `nc` · `pa` · `fl` · `elsewhere` | the state faces — NC bites, PA is small, FL is $0, elsewhere unpriced |
| `datenc` | the date-route NC witness |
| `datesolo` | **the refusal witness** — `?seed=date`'s couple with the ONE field flipped (Sam buys their own pre-65 coverage instead of riding Alex's plan at work). The only live drive of the `unrepresentable` strip block; it renders the cannot-price frame and builds NO date, by design. Its exemption from the all-seeds-build law is asserted, never skipped (`REFUSAL_SEEDS`, `devSeeds.test.ts`) |

**Vault plants** — `?vault=<key>` plants an encrypted vault and lands on Unlock with the passphrase
pre-filled. **The param strips itself** (`history.replaceState`), so a plain refresh probes the REAL vault
like prod; re-planting is an explicit re-entry of the URL, never a refresh side effect.

| Plant | Base | What it drives |
|---|---|---|
| `stale` | `retired` | the aged vault — the only live drive of re-entry staleness |
| `datestale` | `datesplit` | the floor's ARRIVED arm |
| `statestale` | `nc` | the `stalenessStateTax` gate note, in isolation |
| `rec` · `recold` | `retired` | the saved record card — holds / superseded |
| `datearrived` | `dip` | the hero's arrived arm ("that year has already come and gone") |

### The no-solve drive recipe (recovery + restore, minutes not hours)

⚑ **NO-SOLVE DRIVE RECIPE, so the next walk costs minutes not hours.** `?vault=rec` → Unlock
(passphrase pre-filled) → *"I forgot my passphrase"* → RecoveryFlow. Recovery word for every plant
is **`lattice harbor cinder vellum 48 thicket`** (`devSeeds.ts:1079`). For RestoreFlow you need a
real backup FILE and no full intake is required: unlock any plant → Result → **"Save a backup
file"** → *Download backup* (an `<a>` with a blob URL, **not** a button — a `button:has-text()`
selector misses it) → then delete the DB and reload. **`indexedDB.deleteDatabase` is BLOCKED while
the app holds the connection** — fire it, navigate to `about:blank`, then back; deleting and
reloading in one step silently leaves the vault in place and you land on Unlock wondering why.
⚠️ **AND ANY OTHER TAB with the app open blocks it the same way** (bit again 2026-08-20: the
deleting tab did the about:blank dance correctly while a second tab held the connection — the
vault silently survived a "successful" deletion). Close every other app tab first.
