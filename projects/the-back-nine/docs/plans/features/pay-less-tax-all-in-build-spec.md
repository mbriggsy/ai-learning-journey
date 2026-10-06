# Build spec: pay-less-tax ranks on ALL-IN COST

*Drafted 2026-10-05 by the planning workflow `wf_23bd4439-e6d` (five readers, two independent specs, a merging chair, two source skeptics). The skeptics' 16 findings (5 wrong, 4 missing sites, 7 risky) are FOLDED below, each fix marked ⚑ SKEPTIC.*

*Register: Tier 0, "Pay-less-tax ranks on income tax alone…" (`docs/backlog.md:758`). Its ⚑ RULED block (`:762`) is the mandate and its ⚑ MEASURED block (`:764+`) is the method. Ruled 2026-10-05 by Briggsy: **"All-in cost"**. HEAD e3577909.*

*How sites are marked:*
- **(read)** = I re-read it at HEAD for this merge.
- **(map)** = taken from the reader maps and not re-opened by me.
- **unverified** = no one opened it.

*Coupled entry:* the Tier 1 entry "The live solve ranks survival at `tieTolerance` 0…" (`backlog.md:926-934`, map). It stays BLOCKED and untouched. This build unblocks it on paper and does not execute it.

## 0. Ruled scope, not re-opened

**All-in** = per path:
- `lifetimeTaxPaidReal`: income tax, federal plus priced state;
- `+ lifetimeNetPremiumReal`: the ACA premium after the PTC;
- `+ lifetimeMedicareCostReal`: base Part B + IRMAA + extras (`taxOverlay.ts:1867`, map).

It is measured in real $, lifetime, as the mean over paths, on the same after-depletion footing as today. Lower is better.

The three addends are disjoint:
- the premium is taken OUT of `taxPaidThisYear` (`:1805`, map);
- Medicare is funded outside tax (`:1659`, map);
- all three accrue together after the depletion check (`:1860-1871`, map);
- `totalQualifiedHsaSpendReal` (`:1869`) is a funding source, NOT an addend.

The words are HIS. The build drafts options (§6) and ships none that Briggsy has not read.

## 1. Decisions (chair's pick, and why, on each point the specs or readers split)

**D1 One per-path home.** Add `lifetimeAllInCostPerPath(dist): readonly number[] | undefined` to `src/engine/solver/objectiveHeadline.ts`, beside `afterTaxBequestPerPath` (`:43-64`, map).
- It returns `undefined` when there is no `taxAware`.
- It THROWS if the three arrays differ in length (insight 010; no `?? 0`, which is stricter than the bequest helper).
- It sums `tax[i] + premium[i] + medicare[i]` left to right, in that fixed order.
- Its docblock cites `taxOverlay.ts:1805 / :1659 / :1860-1871` as the proof the addends are disjoint, and notes HSA spend is not an addend.
- Re-export it from `evaluate.ts` the way `:37` re-exports the bequest helper.
- *Why here:* all readers agree. The module imports only `@shared/model` types, so it is safe on the render path.

**D2 New score field; keep the old one.** Add `CandidateScore.lifetimeAllInCostMeanReal: number | undefined = mean(lifetimeAllInCostPerPath(dist))`, computed with `evaluate.ts`'s own `mean` (`:95`, map).
- KEEP `lifetimeTaxMeanReal` (`:99`) as income tax. These read it as income tax:
  - the oracle's hand-derived pins (`optimalityOracle.test.ts:70-104, :220-322`, map: case ii is "the world's ONLY tax", and NC is fed+state exact);
  - `nearTieInversion.ts:183-184`;
  - `blockBootstrap.test.ts:217-218`.
- *Why:* every reader converged on this. Redefining the field in place would make its name lie, and the oracle's income-tax pins would then pass only because the premium is 0. That proves typing, not correctness (DND 012).

**D3 The mean is the mean of the per-path sum, NEVER `mean(tax)+mean(prem)+mean(med)`.**
- `assertObjectiveMatchesHeadline` compares with strict `!==` (`objectiveHeadline.ts:178`, map).
- The two orders differ by float dust on every healthcare-priced run. Every live pay-less-tax solve would then route to calm-unavailable, and healthcare-off fixtures would hide it.
- Both homes therefore import the ONE function.
- ⚑ SKEPTIC: strict equality ALSO rests on the two private `mean` copies (`evaluate.ts:~75-85`, `objectiveHeadline.ts:29-41`) staying byte-identical loops. Have `scoreFromDistribution`'s all-in mean import ONE shared `mean` from `objectiveHeadline.ts`, and keep the cross-home `Object.is` arm (§5.2) as the pin.

**D4 Five read sites move in one commit.**

| # | Site | Today | After |
|---|---|---|---|
| 1 | `evaluate.ts:117` + `tier2` `:236-241` (map) | `mean(ta.lifetimeTaxPaidReal)` / `lifetimeTaxMeanReal` | fill D2; tier2 reads `lifetimeAllInCostMeanReal`; keep the burned/062 throw |
| 2 | `objective.ts:74-79` goalHeadlineStatistic (read) | `score.lifetimeTaxMeanReal` | the D2 field, same throw; re-word the docblock `:59-69` and the error text; `goalHigherIsBetter` stays false |
| 3 | `objectiveHeadline.ts:116-124` headlineStatisticFromDistribution (map) | `mean(ta.lifetimeTaxPaidReal)` | `mean(lifetimeAllInCostPerPath(dist))`; re-word `:62-69` |
| 4 | `select.ts:194-209` goalPerPathA (read) | `taxAware?.lifetimeTaxPaidReal` (if-chain) | `lifetimeAllInCostPerPath(outcome.distribution)`; convert to the exhaustive switch + never-guard idiom; docblock `:188-193` |
| 5 | `gradeCalibration.ts:273-281` pairedDecisionDiffs (read) | runner − winner over `lifetimeTaxPaidReal` (if-chain) | runner − winner over D1, refusing undefined; exhaustive switch; docblock `:247` |

**Site 5 is the easy one to miss.** It feeds two things:
- the surplus-regime grade: `gradeAxisFor` → `solve.ts:291-306, :355` (map);
- the hero's skew qualifier `deltaSkewFor` (`solve.ts:394-406`), whose contract is mean(diffs) ≡ the displayed delta.

The MEASURED probe substituted its vector before `adoptObservedOutcome`. The grade re-simulates fresh (`solve.ts:338-355`, map), so the probe never reached site 5. The grade and skew legs are UNMEASURED, and the built grade on surplus-regime runs may differ from the measured table. The probe script itself is unverified.

**Follows automatically, no edit needed:**
- `rankCandidates`;
- `selectionScoreA` (`solve.ts:592`) and `armOfB` (`solve.ts:250-259`, the read at `:256`);
- `gradeStatistic` (`:604`);
- `adoptObservedOutcome` and `collectCandidateOutcome`, which re-score via `scoreFromDistribution`;
- `selectionTieTolerance` (`heldOutSeed.ts:129`), which is vector-generic;
- `gradeAxisFor`: the axis label is keyed by goal, and `GradeStatistic 'pay-less-tax'` keeps its name;
- `demotionAxisCalibrated` (`gradeCalibration.ts:163`) is unchanged.
- ⚑ SKEPTIC (missing readers; each follows through sites 1-2, named so nothing is assumed): the hero delta itself (`recommendationView.ts:634-646` `winnerDisplaysAhead` / `deltaReal`, and the zero-collapse guard at `:650`, which decide dollar vs no-dollar); `runnerUpVizFor` (`recommendationView.ts:880-881`, leave-more gated today); `namedDriverProbe` / `namedDriverProbeSteps` (`gradeCalibration.ts:399-436`), which re-rank under `rankCandidates` and drive F2's `aca-enhanced-subsidies` driver and the coin-flip hinge `recGradeNoteHingeAca` (`copy.ts:1900-1901`). That sentence will now fire on PREMIUM-driven flips, so it joins the §8 Caddie read.

**D5 Byte-identity when healthcare is off.**
- The premium and Medicare yearly values start at 0 (`taxOverlay.ts:1529-1535`, map).
- They are written only under the healthcare gate (`:1098, :1555, :1707-1712`).
- healthcareEnabled requires taxEnabled (`:1004`; `simulate.ts:832`).
- `totalTaxPaidReal` starts at +0, so `(t + 0) + 0 === t`, including the sign of zero.

Result: the all-in vector equals the tax vector element by element, and its mean, SE, grade diffs and headline are bit-identical. The goldens and the two healthcare-OFF pay-less-tax oracle cases cannot move: `caseConstantRate.ts:149` and `caseNoChange.ts:56`, and `healthcareEnabled` appears only in caseAcaCliff (map).

**D6 Finiteness seam.**
- Add `!Number.isFinite(taxRes.totalNetPremiumReal) || !Number.isFinite(taxRes.totalMedicareCostReal)` to `simulate.ts:1717-1731` (read: today it checks terminal, tax, basis and buckets only).
- *Chair's pick:* the full arm ONLY. `floorTaxRes` has the same type (`:1648`, read), but no ranked statistic reads the floor arm's premium. The existing floor clause checks terminal + tax for the same reason.
- It is throw-or-nothing, so no value moves. A non-finite value then takes the typed infeasible route instead of throwing in `mean` and aborting the batch.
- ⚑ SKEPTIC: D6 lands in the SAME Phase A commit as the D2 field (the new `mean` throw path must never exist without its seam). In principle it can mark a previously scored candidate infeasible (`solverCodeVersion.ts:12-21`: bump on anything that can move a ranking); in practice it is measure-zero (the premium sits inside `grossWithdrawal`, so an overflow hits `terminalReal` first). The Phase A commit and the VERSION 10 block both say so: unreachable in practice, landed before the bump.

**D7 The hero's scope follows the run's BUILT pricing state.** ⚑ RESOLVED 2026-10-05 at source (Phase A's implementer + both reviewers, re-read by the pilot): the skeptic's correction below was ITSELF wrong — `missingRequiredFacts` REQUIRES both ACA quotes for any household with a pre-65 or not-yet-known age (`intakeMap.ts:212-219`, `anyPre65OrUnknown`), an all-65+ household takes the Medicare-only branch (`medicareOnlyPriced`, `:784-790`), and the one healthcare-off overlay left (the degenerate $0-accounts early return) is refused as `no-pretax` before any solve. So every live solve today prices healthcare, and cohorts (a) / (b) below cannot reach one. The UNPRICED arm is kept as DEFENCE-IN-DEPTH, keyed on the built predicate (the `spineMedicarePriced` idiom), so a future intake change that drops a quote can never make the hero claim premiums it did not count; its Phase B test builds a base directly with `overlay.healthcareEnabled` false. Phase A's `solveDispatch.test.ts` arm pins the refusal (a pre-65 household without quotes is `spine-unready`) — if the quotes ever become optional it reds and the unpriced arm is re-checked. Briggsy's words for that arm (today's string) stand; only the reason changed. *The original skeptic text, kept so the drift stays visible:* live runs do NOT always price healthcare. `intakeMap.ts:673-686` sets `healthcareEnabled` only when `healthcareOn` (both ACA quotes entered + someone under 65, `:607`, `:762-768`) or `medicareOnly` (EVERY member 65+, `:784-790`); `missingRequiredFacts` (`:159-175`) does not require the quotes. Two live cohorts therefore solve with healthcare OFF: (a) a pre-65 household that skipped the quotes; (b) a mixed-age household with no quotes (the 65+ member's Medicare unpriced too). On them all-in ≡ income tax (D5), so the engine is right, and a hero claiming premiums were counted would be calm-but-wrong copy. So the hero and the scope disclosure key on `base.overlay.healthcareEnabled` (the predicate the spine route, `intakeMap.ts:792-801`, and the Medicare / ACA disclosure seams already read), with a PRICED arm and an UNPRICED arm (§6). The test: the hero arm follows `overlay.healthcareEnabled` on both values, with a planted unpriced pre-65 household. The cohort is named in the word packet so Briggsy rules on its words.

**D8 Versioning.**
- `SOLVER_CODE_VERSION` 9 → 10 (`solverCodeVersion.ts:129`, read), in the SWITCH commit only. Add a VERSION 10 block saying:
  - the pay-less-tax Tier-2 statistic moved from mean lifetime income tax to mean lifetime all-in cost, per Briggsy's 2026-10-05 ruling, applying the objective clause (`:14`);
  - it is ranking logic only, so there is no `ENGINE_PRICING_LEDGER` row;
  - the stamp is global, so leave-more records re-stale too. That over-re-run is accepted under the file's when-in-doubt rule.
- Re-pin `pricingVersion.test.ts:141-152` to `{ solverCodeVersion: 10, newestRepriceRow: 7 }`, and retitle it "v8, v9 and v10 were ranking logic only".
- **No ledger row** (`pricingVersion.ts:38-45`): no figure from a saved household's spine recompute moves. `FIRST_UNAMBIGUOUS_SAVE_DAY` stays put.
- **No `FINGERPRINT_SCHEMA` bump and no objective tag** (`solverRunFingerprint.ts:62-64`). Either would add a false 'inputs-changed' cause, which renders "Your numbers have changed since then." (`copy.ts:1682`). Saved records must report ONE cause, 'solver-changed', which renders "The way strategies are worked out has changed since then." (the string is at `copy.ts:1685`, mapped from the cause at `Result.tsx:85`). That sentence is true. Records persist no dollar figure (`model.ts:1899-1961`).
- **Persisted id `'pay-less-tax'` stays.** It lives in `model.ts:270` RECOMMENDATION_GOALS, the codec needVocab gate (`:1817`) and the fingerprint canon (`:121`). Renaming it is a one-way door: memories dropped, plus a false 'inputs-changed'.
- **v10 collision:** `council-log.md:14` and `backlog.md:864-873` earmark v10 for the unmerged gap-fill (`b9-v10-gapfill-wip`). Note in the register's recall entry: "v10 = the all-in objective; a revived gap-fill re-measures on all-in and takes a later version." The council rows stay as records.

## 2. Every site

**Engine edits:**
- `objectiveHeadline.ts`: D1 and site 3.
- `evaluate.ts`: D2, site 1, the re-export, and the seam header `:5-15` plus field docblocks.
- `objective.ts`: site 2.
- `select.ts`: site 4.
- `gradeCalibration.ts`: site 5.
- `simulate.ts:1717-1731`: D6.
- `solverCodeVersion.ts`: D8.
- NEW `reference/solver-cases/caseAllInAcaTrap.ts` plus its `index.ts` entry (§5.1).

**Docblock only:**
- ⚑ SKEPTIC (missing site): `src/shared/model.ts:797-799` (pre-Phase-A lines; as built the field is at `model.ts:807`) documents `lifetimeMedicareCostReal` as "base Part B + the IRMAA surcharge", but `taxOverlay.ts:1867` accrues `medicareCostThisYear + medicareExtrasThisYear` (the Part D / Medigap / MA extras). Re-word it to "base Part B + IRMAA + the Part D / Medigap / MA extras (`taxOverlay.ts:1867`), an addend of the pay-less-tax all-in objective", and note at `model.ts:770-773` ("the P4 objective reads THESE") that pay-less-tax now ranks on tax + premium + Medicare. No type change; Phase A.
- `solve.ts:211-221, :381-386` (deltaSkew wording).
- `stateTaxDisclosure.ts:151-155`: the priced-state layer reaches the hero through the tax addend; the logic is unchanged.
- `recommendationView.ts:100` and `:720`.
- `copy.ts:1778` comment and `:3086`.
- the `recommendationView.test.ts:596` comment.

The viz suppression off leave-more stays correct, because all-in is still lower-is-better.

**Copy (HIS, §6):** `recDeltaPayLessTax` (`copy.ts:2995-2996`, read), `goalPayLessTaxGloss` (`:1785`), `recDiscNiit` (`:1956-1957`), `recDiscStateTax` (`:1961-1962`), the optional new `recDisc*`, and `recDeltaTypical*` (`:3023-3042`) only under a "$X less" hero.

**Calibration:**
- Add "an objective-statistic change" to the RE-MEASURE triggers at `fallback.ts:42, :56, :70` (map).
- Re-run `scripts/calibrate-fallback.ts` (W2, `:146-157`) on the built tree (Phase C).
- No live consumer today (`fallback.ts:9-10`).

**NO change:**
- `engineWire.ts` and `engineProtocol.ts`: the three vectors already cross the wire.
- `model.ts` Distribution TYPES (its docblocks do change; see Docblock only).
- taxOverlay accrual math.
- the pricing ledger and `solverRunFingerprint`.
- oracleToken clauses: `mintedOver.oracleCaseIds` grows automatically.
- `heldOutSeed`.
- `rankingStability.ts:42-61`: it already byte-compares all three vectors.
- `nearTieInversion`.
- `devSeeds` and its plants, which follow the bump.
- the savedRecommendation store and mint.
- `solveDispatch` `tieTolerance` (`:106`).
- `taxAware.lifetimeTaxPaidReal` meaning (`stateTaxDisclosure.ts:153` reads it as income tax).

## 3. Ordered steps, red first

**Step 0: the word packet goes to Briggsy at the start.** It is §6, sent as one message. Engine work does not wait on it. Only the Phase B landing does.

**Phase A: inert plumbing. Byte-identical; lands on its own.**
*Chair's pick (Spec 1):* it shrinks the atomic commit, and nothing ranks on the new field yet. That honors the register NEGATIVE (never fold premiums in while the hero says "tax").

1. RED: `objectiveHeadline.test`, on a priced distribution (tax [10k,12k,14k], premium [5k,7k,9k], Medicare [2k,2k,2k]).
   - (a) PASS when the stored figure = mean(per-path all-in). This is RED on today's tax-only recompute.
   - (b) THROW when the stored figure = mean(tax).
   - Keep these arms skipped or local until Phase B, because the recompute moves in Phase B. Record the red output.
2. Add `lifetimeAllInCostPerPath`, with unit arms for:
   - the length-mismatch throw;
   - undefined without taxAware;
   - a healthcare-off identity on a real engine run of caseConstantRate: `toBe` per element plus `Object.is` on the mean against `lifetimeTaxPaidReal`.
3. Add `lifetimeAllInCostMeanReal` to CandidateScore. It is required, so the typecheck reds in `select.test.ts:54, :473` and `gradeCalibration.test.ts:58` (map). That is the intended failure; fix them.
4. Add the D6 finiteness seam, with a mutant arm: a NaN premium routes the candidate infeasible.
5. Add reduction arms OVER caseConstantRate and caseNoChange. ⚑ SKEPTIC: the arms live in the TEST files (`optimalityOracle.test.ts` or a new reduction test) and read the cases' outcomes; the case modules stay BYTE-UNCHANGED (they are `SOLVER_CASES` members run inside every live mint, `solveEntry.ts:173`, and goldens are never perturbed). They are green now and act as mutant guards:
   - every outcome's premium and Medicare vectors are exactly 0;
   - `lifetimeAllInCostMeanReal` `toBe` `lifetimeTaxMeanReal`;
   - the D1 vector `toBe` `lifetimeTaxPaidReal` element by element.
   - Mutant: adding a constant reds them.
6. Add the D7 predicate test: Phase A pins `overlay.healthcareEnabled` on a planted unpriced pre-65 household (false) and a priced one (true); the hero-arm half lands in Phase B with his words.
7. Add the caseAcaCliff dollar arm. It is a leave-more fixture with no goal change. The closed forms are:
   - `taxConv0 = 5·(0.12·m0 − c)`;
   - `taxUnder = 3·(0.12·mU − c) + 2·(0.12·m0 − c)`;
   - taxOver likewise;
   - `allIn* = tax* + premiums*`, using the existing hand premiums 35,505.79 / 39,334.60 / 86,202.32 (`caseAcaCliff.ts:35-36`; the closed forms are `:19-36`);
   - Medicare 0.
   - Assert against the D1 mean with `toBeCloseTo(…,2)`. This proves the ACA addend's dollars independently, before the switch.
8. Gates: typecheck, lint, test. Commit "all-in plumbing, not ranked". Push.

**Phase B: the switch. ONE atomic commit, landed only after Briggsy has chosen the words.**

9. RED, recorded locally and NEVER committed alone: add case vi (§5.1) to `SOLVER_CASES`, run `optimalityOracle.test` with the objective untouched, and record the wrong-best (expected [84k, 100k], engine [100k, 84k]).
   - ⚑ `SOLVER_CASES` runs inside every live solve (`solveEntry.ts:173`, map). A red case committed alone mint-fails every household.
10. RED: the synthetic flip arms (§5.2) in objective, select, gradeCalibration and solve (deltaSkewFor); the cross-home pin; the premium-only plant.
11. RED: the hl50 witness (§5.3). Today its income-tax diff has the opposite sign, and today's ranker crowns pre-tax-first:0.
12. Move all five sites (D4) together. Add the source-bind test (§5.4). Re-point `objective.test.ts:162`. Un-skip the step 1 arms. Restart any dev server afterwards (burned/072).
13. D8: bump, VERSION 10 block, re-pin.
14. Re-measure on the built objective:
    - **F2** healthnc · pay-less-tax · 128 paths (`solvePayloadIdentity.health.test.ts:14-19`, `solvePoolIdentity.health.test.ts:12-16`, map) pins `namedDriver === 'aca-enhanced-subsidies'`. If the probe no longer flips the crown, RE-PICK the arm (another seed or the leave-more goal) so it still exercises a real flip. ⚑ Never loosen the assertion.
    - **Funded-years footing gate** (*chair's pick: Spec 2*). Base Part B + extras accrue only in funded years, so a candidate whose failing paths deplete earlier looks cheaper. Tie tolerance 0 equalizes the survival COUNT, not depletion years; the register already saw this on `order` (`backlog.md:813`).
      - On `health`, `healthnc`, `order`, `borderline` and hl50, at 16k paths, split each crown/runner-up all-in delta into four parts: income tax, ACA premium, IRMAA at equal funded years, and the funded-years component.
      - ⚑ SKEPTIC: the funded-years bias is ALREADY inside today's income-tax objective and the premium addend (both accrue after the same depletion `break`, `taxOverlay.ts:1847-1871`), not only base Medicare. So compute the funded-years component across ALL three addends (re-score each at the pair's common funded-year count per path vs as-accrued), and report how much is NEW with all-in against what the tax-only objective already carried.
      - If any all-in crown or runner-up flip is DECIDED by the all-in funded-years delta (with the pre-existing tax-only share shown beside it), STOP and take the figures to Briggsy. It is new evidence that the ruled footing rewards running out (contradictions mean STOP), not a pilot re-opening.
      - Otherwise append the decomposition to the register's as-built note.
      - *Why over Spec 1's record-only:* Spec 1 records the bias but never checks whether it decides a crown. On this point calm-but-wrong is a live risk.
15. Land Briggsy's chosen strings (§6). Then:
    - add a `SLOT_RENDER` sample for any new slot, cohort arm or `recDisc*` key (`copyGuard.test.ts:660`, the burned/070 completeness test);
    - update the pinned DISCLOSURE_ORDER test (`recommendationView.ts:131-132`, map) if a scope disclosure is added;
    - add the `recommendationView.test` arms (§5.5).
16. Docs (§7). Then `pnpm doc:reanchor`, grepping the dry run for "(bare, after", the tool's 5th blind class. Then doc-stats.
17. Gates (§8). One commit containing: the engine switch, case vi, hl50, the synthetic arms, the version bump, his words and the docs. Push.

**Phase C: same session if the context window has room.**

18. Re-run `calibrate-fallback` and re-cite W2 with the date, or re-pin `fallback.ts`. The trigger notes stay either way.
19. Register: close Tier 0 with the as-built note covering F2's outcome, the decomposition, both witnesses and the measured grade/skew leg. Re-derive the header count (101 → 100 expected) with doc-stats; never type it. UNBLOCK the Tier 1 tolerance entry and re-word its title ("…thousands of dollars of tax apart") and coupling bullet to the all-in statistic. Its arms re-run on all-in ONLY. Add the v10-meaning note. File the follow-ups listed in §11.
20. TODO re-rank.

## 4. Pins that move

These pins move value:
- `objective.test.ts:162`;
- `pricingVersion.test.ts:152`;
- the three CandidateScore literals;
- possibly F2.

Everything else is either byte-identical by D5, or an identity differential that moves on both sides at once. Confirm by running, with no edits:
- `solvePayloadIdentity`, `solvePoolIdentity(.arms)`, `acaProbeInertness`, `solvePoolThrowOrder.health`;
- `devSeeds.test`: its solve witnesses run leave-more;
- the four seed gates;
- `solvePayloadIdentity.test` (the adopt path).

⚑ Never cite "no dev-seed change" as clearance (`backlog.md:821`): the roster lacks the low-spend ACA shape.

## 5. Fixtures and re-derivation (DND 012)

**5.1 Case vi, `caseAllInAcaTrap.ts`: the PRIMARY oracle witness.**

It is deterministic, so it is seed-free in both senses. Template it on `caseAcaCliff.ts` (`:19-41, :108-171`).

*World:*
- MFJ 60/60; fixed horizon 4 (2026-29); r = 0; 2 paths.
- PIA 0; taxable basis = value, so no gains.
- Policy `taxable-first` (`sequencing.ts:70`, map).
- healthcareEnabled; enrolled = SLCSP = $24,000/yr; pre65 = 2 each year; no Medicare.
- State `'absent'`; SS, capital gains and RMD off; `tieTolerance` 0; healthcareCliffs true.

*Candidates:* a conversion of $84,000 ×2 years and one of $100,000 ×2 years. Whether the candidate grammar expresses exactly this is unverified; mirror caseAcaCliff's construction.

*Mechanism:*
- Years 0-1 are funded from taxable, so MAGI = the conversion exactly, with no ACA fixed point.
- $84k is about 3.97 FPL, inside the flat band (net premium = k·A). $100k is over the cliff and pays the full premium.
- In years 2-3 pretax is drawn in the 22 % band with MAGI over the cliff, the same for both candidates. Pretax exhausts in year 3, so converted Roth displaces 22 % dollars.

*Pilot sketch, re-derive at build* (2026 table, MFJ standard deduction 32,200, k = 9.96 %, P0 ≈ $580k):

| | Income tax | Premiums | All-in |
|---|---|---|---|
| A = $84k | $66,760 | 2·8,366.40 + 48,000 = $64,732.80 | ≈ $131,493 |
| A = $100k | $63,560 | $96,000 | ≈ $159,560 |

Today's objective crowns $100k. All-in crowns $84k, by about $28k.

*`expected()`:* derives from the tables, never literals (insight 032): handStandardDeduction / handBandTop, federalPovertyGuidelines, acaApplicablePercentage. It FAILS LOUD on every premise (insight 023):
- MAGI = A in years 0-1;
- $84k inside [3,4) FPL and $100k over the cliff;
- years 2-3 taxable income inside the 22 % band and MAGI over the cliff;
- taxable exhausted by year 2, pretax exhausted inside year 3 for both;
- survival 1.0;
- k guarded so that a tenth-point move cannot flip the order.

*Asserts:*
- the all-in ranking = `expectedRankingIds`;
- the income-tax ranking is the reverse (case iii's blind-counterfactual idiom, via `lifetimeTaxMeanReal`);
- the hand dollars for tax, premium and all-in, `toBeCloseTo(…,2)`;
- draw invariance at a second seed (`optimalityOracle.test.ts:114` idiom).

⚑ SKEPTIC: **the cliff margin.** $84k at ~3.97 FPL sits only ~$600 under the 400 % line, so a routine FPL re-pin could push it over, and every live solve would mint-fail. Choose A with ≥ ~5 % of FPL of margin under the 400 % line, inside the flat applicable-percentage band at both edges. Better still, have `expected()` CHOOSE A from the table (e.g. 3.8 × FPL, rounded) so a re-pin moves the fixture instead of breaking it, and re-derive the gap there.

⚑ **Spacing trap:** in the flat band k ≈ the 10-point rate gap, so $70k vs $84k differ by about $11 all-in. Add a third candidate only with a margin of at least $1k under BOTH statistics.

⚑ **Shared cliff premise:** cases vi and iii both rest on the 400 % cliff. Name this in the premise guard and in the verify:aca runbook. If enhanced subsidies return, two oracle cases flip and every solve mint-fails.

**5.2 Synthetic arms.** These are the Medicare clause's cover, because case vi has no Medicare.
- **objective.test:**
  - tax and all-in disagree, and both goalHeadlineStatistic and `rankForGoal` follow all-in;
  - the `:140` monotonicity arm re-run on case vi outcomes;
  - an undefined-throw arm.
- **select.test:** extend `scored` (`:34-57`) with optional premium/Medicare vectors.
  - (a) A wins on tax, B wins all-in: the crown is B with shrinkage OFF and ON.
  - (b) A pair whose SE decision differs between the tax and all-in vectors. Mutant: restoring `:192` reds it.
  - (c) A Medicare-ONLY flip.
  - Leave `:524-548` numerically alone (tolerance arms).
- **gradeCalibration.test:** winner 200/50/10 vs runner 300/0/0 gives **+40** per path, not +100. Add a Medicare-only variant.
- **solve.test `deltaSkewFor`:** the same pricing, plus the linearity identity mean(diffs) ≡ the all-in headline delta. ⚑ SKEPTIC: use `Object.is` ONLY on a zero-vol (identical-path) fixture and `toBeCloseTo` on a priced multi-path fixture (`solve.ts:386-390`: exact on zero-vol, float dust on a live world). The cross-home pin below keeps `Object.is`, because both sides are `mean()` over the SAME D1 vector.
- **Cross-home pin**, on one priced distribution, all with `Object.is`: `tier2` ≡ `goalHeadlineStatistic` ≡ `headlineStatisticFromDistribution` ≡ `mean(goalPerPathA)` ≡ `−mean(pairedDecisionDiffs vs a zero-cost arm)`.
- **Premium-only plant:** a difference in premium alone moves all five sites.

**5.3 hl50: the register's "~$50k-spend witness household".** It is OWED by the RULED block; case vi is the chair's addition.
- `retiredHealth` at `annualSpendingReal` 50,000 (`devSeeds.ts:729-792`, map), constructed in the test.
- Keep it OUT of DEV_SEEDS: membership enrolls it in every DEV_SEEDS loop and in Caddie (`devSeeds.test.ts:78-112`). Adding it is HIS call.
- Roster: {the user baseline, pre-tax-first:0, bracket-fill:0}, at 16,000 paths on BOTH live seeds (12245589 / −1438857764), then `selectRecommendation`.
- The expected crown is bracket-fill:0, taken from an INDEPENDENT ranker: direct `simulate(applyCandidate)` plus the test's own tier-1/tier-2 sort over the three summed vectors (register method b).
- Assert:
  - the CRN-paired all-in diff vs pre-tax-first:0 has z ≥ 5 on both seeds (measured 19.3 / 20.4);
  - the income-tax diff has the opposite sign;
  - `lifetimeMedicareCostReal` is non-zero, which proves the Medicare addend is live in an engine run (Spec 2).
- Measure the cost before committing (120 s idiom). It must run in CI vitest, because a local-only gate is not a gate.
- ⚑ Never pin it below 16k paths: at 256, z ≈ 2.5.
- "Seed-free" in the register is ambiguous: not a dev seed, or not dependent on the CRN seed. Case vi satisfies both readings and hl50 only the first, so both are built.

**5.4 Source-bind test.** On the pay-less-tax arm, none of the five site files may read `lifetimeTaxPaidReal` (check by grep over the function bodies). Only `lifetimeAllInCostPerPath` reads it. These legitimately keep reading it as income tax: `nearTieInversion.ts`, `stateTaxDisclosure.ts:153`, `rankingStability.ts`, simulate and the wire.

**5.5 UI tests** (`recommendationView.test.ts`):
- a priced pay-less-tax arm where the hero delta = baseline all-in − winner all-in, which differs from the tax delta;
- an inversion arm where the winner pays LESS tax but MORE all-in, so the dollar is SUPPRESSED (the `:648` idiom);
- these pin wiring plus copyGuard compliance, never draft words.

## 6. Copy: the WORD PACKET for Briggsy. Every line is HIS; nothing ships unread

**⚑ HIS WORDS — RULED 2026-10-05 by Briggsy (the word packet, every pilot lean taken) — ⚑ REFINED 2026-10-06 by Briggsy on the pre-land Caddie read: the gloss now ends "…premiums this tool counts." and the scope line "…changes to your copays and deductibles aren’t counted and could move this."; the scope note renders BEFORE the NIIT note.**
- **Hero, priced arm** (`overlay.healthcareEnabled` on) — option A: "Keeps about $X more out of your lifetime tax and health-insurance premiums than today’s plan."
- **Hero, unpriced arm** (healthcare off) — today's string, unchanged: "Keeps about $X more out of your lifetime tax than today’s plan."
- **Goal gloss** (`goalPayLessTaxGloss`, ONE line on both arms): "Less paid over your lifetime in tax, and in the health-insurance premiums this tool counts."
- **Scope disclosure — ADD** (a new `recDisc*` id, ordered BEFORE `'niit'`, gated `goal === 'pay-less-tax'` AND the priced arm): "This counts your income tax plus the health-insurance premiums a strategy can move; changes to your copays and deductibles aren’t counted and could move this."
- **`recDiscNiit`** (both goals): "A federal surtax on higher investment income isn’t counted here, and it could apply."
- **`recDiscStateTax`** (both goals): "Where we can’t yet price a state’s income tax, it’s left out of this comparison — the state piece could move it either way."
- The label "Pay less tax" and the id `'pay-less-tax'` stay. A Caddie read of these words on the rendered card runs before the Phase B land (§8 item 10); a framing-level hit parks for him.

*The packet as sent (the options he chose among):*

**Constraints the drafts meet.** This was a hand-lint against `copyGuard.ts:147-308` + `HEDGE_TOKENS` (`copy.ts:2035-2044`); the suite runs on whatever he picks.
- A hedge ("about" / "could"); `recDelta*` and `recDisc*` are require-hedge swept (`copyGuard.ts:123-127`).
- No superlative, no clause-leading directive verb (`:261`), no "pays off" or "better off" (`:250-251`), no em-dash apposition on the figure.
- The hero stays one line (`recommendationView.ts:172-174`) and keeps "than today’s plan" (the userBaseline seam, `copy.ts:1820-1827`).
- The slot keeps its one-arg signature, so `recommendationView.ts:673` and `copyGuard.test.ts:660` need no wiring change.
- Rejected: "health costs" and "in your pocket". Out-of-pocket and cost-sharing are not counted, and funded-year accrual makes any wealth claim an overclaim. Also do not reuse the health sheet's "Lifetime health costs" lexeme: one lexeme with two referents is the O14 class.

**Hero `recDeltaPayLessTax`.** Today: "Keeps about $X more out of your lifetime tax than today’s plan."
- **A (pilot's lean, HIS):** "Keeps about $X more out of your lifetime tax and health-insurance premiums than today’s plan." It is the smallest change, true for every cohort, and keeps "$X more", so the `recDeltaTypical*` quotes stay valid. "Health-insurance premiums" literally covers the ACA premium after the discount, Part B, the Part D/Medigap extras and IRMAA, which is a premium surcharge.
- **B (HIS):** "Keeps about $X more out of your lifetime tax and health-insurance premiums, Medicare included, than today’s plan." Names Medicare for the 65+ reader.
- **C (HIS):** "Pays about $X less in income tax and health-insurance premiums over your lifetime than today’s plan." This breaks the "$X more" quote. `recDeltaTypical / None / Behind` must drop "more" in the same change (suggested: "“$X” above is an average…"), and no test catches the mismatch.
- **D (HIS, cohort-gated):** two arms, needing a composer arm and SLOT_RENDER samples.
  - ACA-priced: "Keeps about $X more out of your lifetime tax, marketplace premiums and Medicare costs than today’s plan."
  - All-65+: "Keeps about $X more out of your lifetime tax and Medicare costs than today’s plan."

**UNPRICED arm (D7 — HIS; unreachable from intake today, kept as defence-in-depth — see D7).** A run with `overlay.healthcareEnabled` off ranks on income tax alone, because there all-in ≡ income tax (D5). Its hero must not claim premiums were counted. Lean: keep today's string unchanged for that arm ("Keeps about $X more out of your lifetime tax than today’s plan."), which is true there; options C and D need their own third arm.

**Gloss `goalPayLessTaxGloss`.** Today: "Less total tax over your lifetime." It is FALSE after the switch, so it MUST change.
- **G1 (lean, HIS):** "Less total tax over your lifetime, with health-insurance premiums counted too."
- **G2 (HIS):** "Less paid over your lifetime in tax and health-insurance premiums."
- Check the 390 px wrap (vertical-fit GoalPicker arm, `:669`).
- ⚑ (pilot, folding D7) The gloss would render on an unpriced run too (unreachable from intake today — D7), where no premium is counted. So G1 / G2 either gate on the same built predicate, or use a wording true on both arms (e.g. "Less paid over your lifetime in tax, and in the health-insurance premiums the plan prices"). His call, made with the hero.

**Label "Pay less tax": lean KEEP (HIS call).**
- His ruling covered the objective and the hero, not the D1/R21 vocabulary.
- A lost PTC is a shadow tax (`pre65-healthcare.md:76`).
- Five regex selectors pin it: `e2e/csp.spec.ts:337` (CI), `caddie-walk.spec.ts:728/735`, `held/solve-timing.spec.ts:51`, `recommendInvite.test.tsx:127/145/213`.

**`recDiscNiit`** renders on BOTH goals. "Your federal income tax" is already wrong on NC/PA/FL.
- Draft (HIS): "A federal surtax on higher investment income isn’t counted here, and it could apply."

**`recDiscStateTax`** renders on both goals; "federal tax only" becomes false.
- Draft (HIS): "Where we can’t yet price a state’s income tax, it’s left out of this comparison — the state piece could move it either way."

**Optional scope disclosure** (new `recDisc*` id after `'niit'`, gated `goal === 'pay-less-tax'`).
- Draft (HIS): "This counts your income tax plus the health-insurance premiums a strategy can move; changes to your copays and deductibles aren’t counted and could move this."
- *Chair's lean: SHIP it* (Spec 2 leaned skip). No hero option names the cost-sharing residual, and that residual is exactly the calm-but-wrong reading: "premiums" read as out-of-pocket costs. R24 and contract #7 want it named. Spec 1's longer two-clause variant is the alternative if he wants the marketplace and Medicare mechanics spelled out.

**Flagged to him in the packet:**
- The NIIT and state-tax rewrites also change the leave-more surface. Intended, since both sentences are loose there today.
- The id never changes.

## 7. Docs. One pass, AFTER his words. Point at the slot; never type a draft

**Change:**
- **`docs/plans/4-recommendation.md`**
  - `:47` contract #4: redefine as all-in, with the provenance line "RULED 2026-10-05 by Briggsy, 'All-in cost'" citing the register entry by title. State the one-field law: rank, SE vector, grade axis and hero are one field, across the five sites. The 2026-07-18 council block (`:16-25`) is the wrong home.
  - `:171`: the same definition, pointing at #4.
  - `:18`: a parenthetical only. `totalTaxPaidReal` is now one addend, and state is still inherited.
  - `:53/:247` contract #7: healthcare is IN the objective for BOTH goals; NIIT stays the one lever-inert omission.
  - `:244`: replace "keeps ~$X more from the IRS" with a pointer to the `recDeltaPayLessTax` slot.
  - `:109/:123`: case vi names pay-less-tax.
  - `:99`: the live fixture count.
- **`docs/product.md`**
  - D1 `:71`: one clause.
  - R21 `:129` and §6 `:101`: his shipped words, or a slot pointer.
  - R24 `:134`: holds for both goals. Edit it only in the shipping commit.
- **`docs/architecture.md` §7.5 `:226`:** the three addends, the one composing function, and the invariants: shared footing (with the funded-years bias named), reduce-to-spine, no double count, HSA not an addend.
- **`docs/plans/1-engine.md:121`:** a one-clause annotation.
- **`act4-u16-recommendation-surface-build-spec.md:373, :380-398`:** "all-in lifetime cost, lower is better", plus the re-scoped disclosure list.
- **`docs/glossary.md`:** a new entry "All-in cost (pay-less-tax objective)". ⚑ Disambiguate it from "all-in" as the Medicare base + Part D/Medigap figure (`council-log.md:21`, the `taxOverlay.ts:1865` comment), from the premiums-only median sum the U11 regime-toggle preview reads (`roth.ts:144`, documented at `model.ts:799-802`), and from "Household spending, all in" (`council-log.md:40`): three referents (⚑ SKEPTIC). Re-check `:145` against the final verb.
- **`docs/roadmap.md:95`:** the fixture count.
- **`backlog.md`:** Phase C step 19.

**Leave alone (dated records):** `pre65-healthcare.md`, the council-log rows, `decisions/`, `insights/091`, `medicare-cost-trend-build-spec.md:143`, `state-seed-increment-brief.md`, `cold-read-log.md`, and `act4-u15` spec `:208`. The rest of the u15 prose is unverified, so grep it for "lifetime tax" during the pass.

## 8. Verification gates (all green before the Phase B push)

1. `pnpm typecheck`
2. `pnpm lint`: engine purity; the helper imports only `@shared`.
3. `pnpm test`: the full suite, including case vi, hl50, the cross-home pin, source-bind, the reduction arms, D7, the F2 re-measure and the identity suites.
4. `pnpm verify:doc-stats`: test count, register count and arm-4 citations after reanchor.
5. `pnpm build`
6. `pnpm verify:bundle`: ≤ 300 KiB.
7. `pnpm verify:csp`: the label regex at `csp.spec.ts:337` must still match, and this arm runs a pay-less-tax solve.
8. `pnpm verify:fit`: GoalPicker gloss wrap at 390 px and at his 1536×791.
9. `pnpm verify:fit:rv`: a FULL run. The RV gate drives leave-more, and the rewritten NIIT and state-tax disclosures render there.
10. **Caddie read of the re-worded hero.** No automated fit or text gate covers the pay-less-tax committed surface.
    - Walk `pnpm caddie:walk`'s pay-less-tax arms (`solve:nc` / failing, `caddie-walk.spec.ts:728,735`, map) at 1536×791@2.5 and on the phone.
    - Plus one planted hl50-shape ACA household where premiums dominate.
    - Focus: does the hero say what it counts? Can "premiums" be read as out-of-pocket or money kept? Do the gloss, hero, scope, NIIT and state lines agree?
    - Run it on his candidate words BEFORE the land. The card travels with the packet: it informs his choice and cannot clear his words. A framing-level hit parks for him.
11. `pnpm verify:aca` and `verify:state-tax`: today is ≥ 10-05, and case vi now rests on the cliff premise.
12. ⚑ SKEPTIC: case vi adds a healthcare-priced (ACA fixed-point) simulation to EVERY live mint (`solveEntry.ts:173`). Measure the oracle stage before and after (the 120 s idiom or the slow-state timing gate) and re-time `healthnc` (`e2e/held/solve-timing.spec.ts`), since "a few minutes" is at its edge. Name EVERY `expected()` premise (the cliff, the k tenth-point guard, the 22 %-band and exhaustion premises, an FPL guideline re-pin) in the `verify:aca` / `verify:state-tax` runbook note: a constants re-vintage that trips one mint-fails every household.

## 9. Risks

- **A partial switch ships green.** Missing site 4 or 5 splits the SE, grade or skew from the hero, and no guard fires. Mitigations: D1, source-bind, the cross-home `Object.is` pin and the premium-only plant.
- **Guard landmine.** Sum-of-means vs mean-of-sums gives calm-unavailable on every live pay-less-tax solve (D3).
- **Funded-years bias.** Base Medicare + extras reward earlier depletion. Step 14's gate decides whether this goes to him.
- **Red-first can break production.** Case vi committed without the switch mint-fails every solve.
- **The all-in LEVEL is dominated by strategy-invariant base Medicare.** ⚑ Only the delta ever renders.
- **Re-stale cost.** Every saved recommendation, on both goals, shows the superseded card once (accepted).
- **F2 may legitimately red.** Re-pick the arm.
- **hl50 is meaningful only at 16k.**
- **The fallback W2 citation describes a retired statistic** until it is re-run. Inert today; a precondition for U16 §S5.
- **The measured grade/skew leg was never probed** (site 5). The built surplus grade may differ from the MEASURED table.
- **The cliff premise is now shared by two oracle cases.**
- **Closed-entry figures rest on tax-only numbers.** The roster-recall closure ($9,102; `retired` $10,000) was reasoned on income tax. On all-in it is unmeasured; note this in the recall entry.

## 10. NEGATIVEs

- ⚑ Never change `tieTolerance` (`solveDispatch.ts:106`) or the `select.test.ts:573-597` arms.
- ⚑ Never redefine `lifetimeTaxMeanReal`, `taxAware.lifetimeTaxPaidReal` or `totalTaxPaidReal`.
- ⚑ Never add a Distribution, wire, accumulator or persisted field, or touch the accrual math.
- ⚑ Never compute all-in as a sum of means.
- ⚑ Never bump `FINGERPRINT_SCHEMA`, add an objective tag, or append a pricing-ledger row.
- ⚑ Never rename the id `'pay-less-tax'` or `GradeStatistic`. Never rename the label without his ruling.
- ⚑ Never fold premiums in while any rendered string still says "tax" only. The switch and his words land together.
- ⚑ Never commit case vi apart from the switch.
- ⚑ Never derive an expected crown or dollar figure from the build's own statistic. Never pin hl50 below 16k. Never add hl50 to DEV_SEEDS (his call).
- ⚑ Never loosen F2's `namedDriver`.
- ⚑ Never cite "no dev-seed change" as clearance.
- ⚑ Never pre-type hero words into product, plan or glossary docs.
- ⚑ Never re-word `recRunnerUpWhy` (it belongs to the blocked tolerance entry).
- ⚑ Never widen the `recDiscAcaSlcsp` gate in this build.
- ⚑ Never re-open the ruled scope (base + IRMAA + extras) on a pilot call. An IRMAA-only surface does not exist (`taxOverlay.ts:1877-1880` is sink-only); only step 14's measured evidence may go back to him.

## 11. Chair's ledger: what was cut, moved or picked

**Moved to filed follow-ups (new register entries with tier):**
- the engine-run IRMAA-crossing oracle case (Spec 1 had it optional; insight 138 bill-year counting). The Medicare clause is covered here by the synthetic Medicare-only flips plus hl50's non-zero check.
- widening the `recDiscAcaSlcsp` gate to every ACA-priced pay-less-tax run (Spec 1 left it as a question for him; Spec 2 made it a follow-up).
- whether pay-less-tax needs a skew disclosure (lumpy cliff premiums; unmeasured).

**Floor-arm finiteness:** cut. It has the same type, but nothing ranked reads it (D6).

**Picks:**
- **Phase split:** Spec 1, because it shrinks the atomic commit.
- **Step-0 parallel packet:** Spec 2, so the build does not block on his read.
- **Funded-years gate:** Spec 2's STOP condition over Spec 1's record-only.
- **caseAcaCliff dollar arm:** kept from Spec 2 (Spec 1 omitted it), moved into Phase A because it is goal-neutral.
- **hl50 Medicare non-zero check and the CI requirement:** Spec 2.
- **Scope disclosure:** shipped, against Spec 2's lean to skip.
- **Fallback:** trigger note now plus a re-run (both specs' halves).

**Resolved open questions:** the field name follows his noun, so `lifetimeAllInCostMeanReal` is provisional until his words land; it is engine-internal and never persisted.