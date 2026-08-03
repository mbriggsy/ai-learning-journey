# The Back Nine — TODO

> **Actionable next-actions only.** No session history, no shipped-work record, no stat stamps — `git log`
> has the first, [`docs/roadmap.md`](docs/roadmap.md)'s You-Are-Here table has the second, and `README.md` +
> the roadmap carry the test count under `verify:doc-stats` (this file re-typing it rotted twice, so
> `d5df3609` made pointing the rule).
>
> **The full open register is [`docs/backlog.md`](docs/backlog.md)** — 43 open items, each traced to the raw
> obligations behind it. This file ranks only what is next; **a queue of ~16 is not the open surface, so
> read the register before filing anything as new.**
>
> ⚠️ **NEVER cite "TODO item N."** These numbers are re-ranked every session, so a citation written today
> silently resolves to a *different* live item later — worse than dangling. (Live examples: `council-log.md`
> and `cold-read-log.md` cite "TODO item 11" meaning the state-tax unit, shipped 2026-07-15; item 11 is now
> the heir-bracket entry. Others cite "item 0", which no longer exists.) Cite the register entry's **title**.

**Where we are:** all four acts are built; Act 4 closed at U17·S6 (S7 deferred, Briggsy's ruling). What is
left is not units. It is the gap between *the build is done* and *a friend can bet real money on this*.

---

## Dated — these fire on a clock

| Fires | What | What breaks |
|---|---|---|
| ~~NOW~~ | ~~NC FY2025-26 revenue certification~~ | ✅ **CLOSED 2026-08-02** — S.L. 2026-41 § 44.1(a) enacted the rate schedule *and* struck the trigger rows the certification fed. Withhold lifted, checkpoint retired. |
| **2026-09-02 00:00 UTC** (09-01 20:00 ET) | ACA rolling window (`verifiedOn: 2026-08-02` + `maxAgeDays: 30`) | `pnpm verify:aca` reds → CI red |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | ✅ **ARMED 2026-08-02** — `annualRoll.tripwire.test.ts` reds the suite (both arms mutation-proven). Clearing it is a **re-sourcing job, never a date bump**; `scaffold.smoke.test.ts:10-13` + `constants.shape.test.ts` red alongside by design |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the four aged tone calls are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |
| **2034-08** | NC's successor flip event — the Office of the State Controller's FY2033-34 final accounting (trigger $40,258,000,000 → TY2035, 0.25pp step, 2.49% floor) | Nothing breaks; it is the only mechanism left that can move NC's rates, and it can only CUT |

⚠️ **The ACA deadline is a ROLLING window, never an absolute `nextDue`** — grepping `nextDue` to inventory
deadlines silently misses it. It has been filed a notch late twice, both times in the unsafe direction.

---

## Next, in priority order

> **Re-verified 2026-08-03 (second pass) — 16 agents, 8 verify→skeptic pairs, every cited line re-opened.
> 7 of the 8 skeptics refuted their own verifier on a material point.** Two "obvious" fixes would have
> shipped NEW false claims (the record card's replacement sentence; the HSA disclosure's own wording), one
> filed blocker was false in the dangerous direction (widening states does *not* brick vaults — but the
> prescribed remedy would have re-opened a hole a compile tie was minted to close), one entry was
> **de-forked** (entry 6 is a regression against a ratified acceptance criterion, not a judgment call), and
> one was **re-sequenced** (entry 7 is blocked on entry 6 — naming the winner is what makes 6's false
> baseline reader-visible). **Entry 10 is the only one no skeptic could refute.**
>
> The measured hit rate on filed prescriptions here is now **four-times-confirmed at ~25-40%.** Every ⚑
> block below dated 2026-08-03 is post-refutation; the prose above it is the original filing, kept so the
> drift is visible.

### Tier 0 — calm-but-wrong (shipped code can answer WRONG)

*The cardinal rule's own list. These are defects, not scope.*

1. **The mixed household's retired spouse is priced at $0 healthcare — so the date comes out too early.**
   `healthcareStreams.ts:149` — `windowStart = Math.max(0, ...people.map(p => p.retireOffset))` is a
   *household* max, so an already-retired spouse's own (negative) offset is discarded and their entire
   pre-65 marketplace premium is zeroed across `[0, windowStart)`. The premise is "employer family coverage
   while anyone works" — **intake never asks, and no shipped copy discloses it** (all 13 intake steps
   checked; `METHODOLOGY_DISCLOSURES` at `assumptionRegistry.ts:202-233` has 5 entries, none healthcare).
   Optimistic direction, on the flagship date route.
   ⚑ **BRIGGSY RULED 2026-08-02: ask + refuse.** One yes/no employer-coverage question in intake; when the
   answer is no, refuse the date through the existing calm input-failure grammar. This honors the ruling
   the engine already made for itself at `simulate.ts:908-912` (*"rejection beats disclosure"*).
   ⚑ **Three corrections from the 2026-08-02 audit — the filed shape was wrong in ways that matter:**
   (a) the gate also zeroes **`oopMedical`**, not just premiums (`healthcareStreams.ts:168-170`) — scope is
   wider than filed; (b) **the naive fix is REJECTED by shipped code** — `simulate.ts:913-919` refuses any
   finite-positive `enrolledPremium[t]` on a bridge year, so simply un-gating the retired spouse's premium
   makes every date candidate fail, returning no answer rather than a later one (and `acaMagi` at
   `healthOverlay.ts:99-101` has **no wage term**, so a priced year would be optimistic a NEW way);
   (c) `healthcareStreams.test.ts:64`'s comment promises "use a retired 65−x case below for the ACA
   reading" — **that case does not exist in the file.** The gate is pinned only by a fixture whose retiree
   is 66 (Medicare-side, where zeroing is harmless); **the genuinely-broken pre-65 case is untested today.**
   ⚑ **2026-08-03 double-blind — the ruling is EXECUTABLE and the size came DOWN. Diagnosis re-opened
   line-by-line and every anchor is exact.** The blocker a first pass filed — *"the refusal channel does not
   exist and must be built from scratch"* — is **FALSE.** `missingRequiredFacts` (`intakeMap.ts:104-191`) is
   the shipped **ONE** authority (`memoryModel.ts:47`) and already carries two *present-but-unrepresentable*
   refusals of exactly this shape: `kindHsa` (`:187-188`, commented *"v1 model limitation, surfaced
   honestly"*) and `addAccount` (`:148-149`, pushed expressly to avoid *"an empty-missing dead-end"*). The
   wiring already runs: `intakeMap.ts:605` → `buildDateInput:1019-1020` returns null → `memoryModel.ts:717-726`
   idle/inputs-incomplete → `AnswerStrip.tsx:105-121` MissingList **names it**. So: **one new CopyKey + one arm
   in `missingRequiredFacts`** firing when the fact is absent OR false. **Never mint a second "cannot answer"
   authority.** Keep a `dateSearch.ts` guard only as the defensive mirror of the §0 `:389` pattern
   (unreachable in prod). **Export the gating predicate** so all three surfaces share it, or you take the R7
   break `intakeMap.ts:87-91` names. **Size M-L, not XL** — and `?seed=date` is **not** refused
   (`devSeeds.ts:127-181` answers YES), so the flagship demo survives.
   ⚑ Two more, found the same pass: `healthcareStreams.ts:18-21` claims the residual is *"disclosed through
   the §0 channel, D2-owned"* — **a false disclosure claim in code**, sweep it in-pass. And `copy.ts`
   `healthQuoteHelp` doesn't merely fail to disclose, it **contradicts** the premise: *"The tool splits it by
   age for each of you."* (Also: "13 intake steps" is the MAXIMUM — only **8** are unconditional,
   `questions.tsx:1147-1163`.)

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
   ⚑ **TWO SEPARABLE XS WINS, both fully decided, no research needed:**
   - **Make the clawback field bite (XS, 4 touches).** `adjacentButSharp` appears ONLY at
     `aca-last-verified.json:41`; `AcaRecord` (`scripts/verify-aca-status.ts:40-72`) never declares it and
     `checkAcaStatus` (`:77-130`) never reads it — **inert prose, confirmed twice.** Declare the key after
     `:71`, push an emptiness problem after `:117`, add it to the `base` fixture at
     `scripts/__tests__/verify-aca-status.test.ts:13-37` (else `:42`'s `toEqual([])` reds), add the
     emptiness arm mirroring `:72-80`. No `.github/` exists so `verify:aca` is local-only — but the
     shipped-record arm at that test `:177-181` runs under `pnpm test`, so the new check **genuinely bites**.
   - **A false negation on the health sheet (XS).** `copy.ts:945/951` list *"the benchmark premium itself"*
     under "Not counted here" while the entered benchmark **is** priced (`intakeMap.ts:582` →
     `healthOverlay.ts:213-223`) — the same false-negation shape O16 fixed on the Roth strings.
   ⚑ **The open fork is his, and it is not the copy.** The Medicare council's standing law
   (`oracleToken.ts:117`) is *"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a
   mis-ranking,"* written about exactly this shape. Does the pre-65 Marketplace population get the
   conversion ranking **with** the new disclosure (what the BLOCKED-ON-RESEARCH tag silently assumes), or
   does the token gain an **ACA pricing-mode clause** that withholds the ranking — as Medicare's did — until
   a sourced trend lands?

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

4. **The record card says the advice still holds when the household never took it.**
   `copy.ts:1315` — *"It still matches your plan as it stands today."* On `?vault=rec` the saved winner is
   `taxable-first` with `noChange: false` (`devSeeds.ts:1322`; the winner literal is at `:1308`) while the
   live order is labelled proportional. Cold-read Card 8 grades it HARD-FLAG/BLOCKER. Its sibling was fixed
   in `532cad82`; this arm was not. **Naming the strategy is Briggsy's ruling (#15) — the contradiction is
   not, and can be closed by dropping the execution claim without naming anything.**
   ⚑ **Audit correction 2026-08-02:** "door 2 one flick below labels the order proportional" is **wrong** —
   that literal is one tap DEEPER (`SequencingControl.tsx:173`, which does hold up) and in the panel at
   **`AssumptionPanel.tsx:388-392`** (`:375-378` is the spend-period segment), so the single-frame co-render
   claim does not hold as filed.
   ⚑ **2026-08-03 double-blind — READY TO SHIP, no ruling needed. Every anchor above had drifted and the
   first-pass replacement sentence was itself rejected.** The live string is **`copy.ts:1338`** (`:1315` is
   `recommendSavePending`); `noChange: false` is `devSeeds.ts:1330` and the winner literal `:1316`. It
   renders at `RecommendationSurface.tsx:276` via `Result.tsx:81` → `recommendationSaveView.ts:305-308`.
   **`:1309-1313` is `recommendSaveHintCeremony`'s comment — nothing defends the holds line today, so the
   fix must ADD a comment, not rewrite one.**
   ⚑ **The defect is REAL and on stronger ground than filed, but "false on its own terms" is NOT
   established.** `drawdownPolicy` **is** in the fingerprint (`intakeMap.ts:623` → `buildSpineParams:645-648`;
   `solverRunFingerprint.ts:130`; `solveAnchor.ts:224`), so a household that **acts** on a sequencing
   recommendation fires `inputs-changed` and gets the **superseded** card. The *holds* face is reachable only
   for a household whose sequencing has **not** moved: **taking the advice demotes the memory; ignoring it
   earns "It still matches your plan."** That is the sin — the invited inference in the rosy direction — not
   a literal falsehood ("your plan" means entered data everywhere else in the register).
   ⚑ **The obvious replacement is BANNED.** *"Nothing has moved since then that would change it"* is a
   **universal negative the three conjuncts cannot support** — broader and rosier than the sentence it
   replaces. The fingerprint **excludes constant vintages by design** (`savedRecommendation.ts:19-20`);
   `blendMoved` is deliberately absent from `rulesMoved` (`staleness.ts:627-628`), so a table bump can leave
   params identical while the same session's gate line says *"We can't tell from here whether it touches your
   own numbers"*; and `staleness.ts:54-58` names an engine-domain blind spot outright. **Ban every
   "nothing has moved/changed" form.**
   ⚑ **Ship this string** — it claims conjunct 1 **only** (the sole computed guarantee) and drops the
   plan-as-intention / plan-as-entered-data ambiguity that produces the on-track inference:
   **`'It still lines up with the numbers you've entered.'`** (50 chars — inside the proven 54-char ceiling
   at `copy.ts:1370-1374`; vocabulary already in the register at `copy.ts:1380`; pronoun-consistent with the
   superseded sibling at `:1375`). The ADDED comment must state both what the line claims (fingerprint
   identity) **and** what it deliberately does not (un-clocked constant/engine-domain drift; that anyone
   executed anything). **Never cite `noChange`** — `select.ts:326` compares the winner to the conventional
   baseline's provenance, never to the entered `drawdownPolicy`. Verify width under `pnpm verify:fit` (the
   `rec` HOLDS face is gated at `e2e/vertical-fit.spec.ts:1878-1884`); guessed widths are banned.
   ⚑ `?vault=rec` **cannot witness this** — its base is `retiredOnTrack` (`devSeeds.ts:951`), a single
   $1.055M traditional IRA, so `taxable-first` and `proportional` are the identical decumulation. **No
   multi-account witness plant exists**, and another open register entry is blocked on the same gap.

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

6. **The hero says "Compared with your plan today" — and the baseline is never their plan.** *(Found
   2026-08-03 by the verification fleet; filed nowhere before.)* `copy.ts:1458` (and the viz arm label
   `copy.ts:1537`) name the compared-against arm as the household's own plan. It is not: `noChange` is
   `winner.index === conventionalIndex` (`select.ts:313`), and `conventionalIndex` is the FIXED
   `taxable-first`/conversion-0 candidate, *"NEVER the user's custom baseline"* (`select.ts:324`/`:329`);
   `solve.ts:500` displays that arm. `search.userBaseline` (`search.ts:179`) is computed and **consumed
   nowhere.** So for any household whose entered order isn't `taxable-first` — **including the default
   `proportional` draft** — the dollar hero is measured against a plan they never chose, under a label
   saying it is theirs.
   ⚑ **2026-08-03 double-blind — CONFIRMED end-to-end, WORSE than filed, and it is NOT a fork: it is a
   regression against a ratified acceptance criterion.** `plans/4-recommendation.md:190` (and `:166`) already
   ruled *"the rendered delta is current→recommended, **never** conventional-default→recommended."* Briggsy
   is needed only to **reverse** that spec, not to choose. Pilot fixes it.
   ⚑ **Four shipped strings carry the false referent, not two** — and the two the entry missed are the
   load-bearing ones: nameplate `copy.ts:1481`, viz arm `:1571`, and **the hero slots themselves at `:2332`
   and `:2336`** ("than today's plan"). Anchors: `noChange` is `select.ts:326`; the NEVER-the-user's-baseline
   comment is `:337`/`:342`; the displayed arm is `solve.ts:501`, the skew `:594`.
   ⚑ **Second false surface:** `noChange = winner === conventionalIndex`, so a **proportional** household
   whose real recommendation is *to switch* hears `recComposeAlready` — *"You're already on one of the
   strongest paths."*
   ⚑ **The fix has two anchors doing two different jobs — do not move both.** **KEEP conventional** for the
   shrinkage prior (`select.ts:202-207`) and the incumbent tie-break (`:248`): `council-log.md:17` Q3
   ratified it and `select.test.ts:589-597` is the purpose-built mutant-#4 killer (*"the user's habit is not
   laundered into advice"*). Flipping those would let a household's own habit win near-ties — *stay put* as a
   NEW calm-but-wrong. **RE-ANCHOR to `search.userBaseline`** (fallback conventional when absent) in exactly
   three places: the displayed arm `solve.ts:501`, the delta skew `:594`, and `noChange` `select.ts:326`
   (its own `userIndex`). Ranking is unmoved, so `caseNoChange` + the goldens **survive**;
   `select.test.ts:597`'s `noChange: true` flips — **re-derive it, never delete it.**
   ⚑ **Still bump `SOLVER_CODE_VERSION` 1→2** (`solverCodeVersion.ts:36`): `noChange` is **persisted**
   (`SavedRecommendationV3.noChange`, whose own doc says *"winner IS the conventional prior"*) — a fifth
   false surface. Every saved record invalidates. Then `copy.ts:1481/1571/2332/2336` become **true with no
   rename**.
   ⚑ `?vault=rec` could never have caught this: it renders a **hand-planted** payload
   (`devSeeds.ts:1315-1342`) whose arms all carry `headlineStatisticB: 0` — no real solve, no dollar hero.
   (Filed same-day at `docs/backlog.md:94-112` with the same drifted anchors — newly filed, not unfiled.)

### Tier 1 — the differentiator does not land

7. **The recommendation never says what to DO.** `recommendationView.ts:410` computes `winnerStrategyKey`;
   repo-wide it has **exactly two other references — its own type declaration and one unit test.** Zero
   render consumers, and `RecommendationSurface.tsx` contains no strategy name anywhere. The hero is a bare
   dollar delta (`copy.ts:2297/2301`); the winner's conversion amount and years render nowhere; there is
   **no apply seam** back into the sequencing or Roth sheets. R23's runner-up is the same story — `why` is
   one static sentence (`copy.ts:1497`) naming neither arm, while `runnerUpId`/`policy` sit unused on the
   payload.
   ⚑ **Audit 2026-08-02 — take the instruction-card arm, NOT a store write.** Writing the winner into the
   draft changes the solver fingerprint and would **instantly demote the recommendation the household just
   accepted** — the mechanism is `invalidateStaleSolve` (`store/memoryModel.ts:658-664`) fired by `update()`
   at `:679`, **not** `recommendationView.ts:289-290` (a comment banner). Name the winner and point at the
   sequencing sheet; no apply-seam mutation.
   ⚑ **2026-08-03 double-blind — BLOCKED ON ENTRY 6. Do not start this first.** The *"needs only rendering,
   zero engine work"* bet **fails on its own gate.** Rendering `alreadyYours` — or even just **naming the
   winner** — to a `proportional` household paints the winner beside an ACTIVE hero reading *"Keeps about $X
   more … than today's plan"* under *"Compared with your plan today"*: **one card, two contradictory
   claims.** Naming the winner is precisely what makes entry 6's false baseline **reader-visible**. Either
   sequence this behind entry 6, or ship name + conversion line **only** once `copy.ts:1481/2331/2335` stop
   saying "today's plan."
   ⚑ **Worse than filed, in the good direction: conversions rank LIVE.** `taxOverlay.ts:916`
   `PART_B_PRICING_MODE='trended'` + sourced `medicareCostTrend` ⇒ `enumerateWithheldConversionLevers`
   returns `[]` ⇒ the **whole roster ranks** (`solve.ts:456-461`), and `select.ts:296-298` calls a
   converting winner *"the natural outcome."* So `winner.conversion {annualAmountReal, startYearOffset,
   years}` is a **live modal case that renders nowhere.**
   ⚑ **Anchors, all drifted:** `winnerStrategyKey` is declared `recommendationView.ts:188` and built `:440`
   (`:410` is `deltaFigure`); the hero slots are `copy.ts:2331/2335` (`:2297/2301` are `dateInYearsNow/Past`);
   `recRunnerUpWhy` is `copy.ts:1520`; there is **no `runnerUpId` on `SolveRecommendation`** (that field is
   on `SolveWithheld`) — the unused values are `payload.runnerUp.id`/`.policy`.
   ⚑ **Two hard gates on the render:** `anchoredRail` is **absent from `SolveArm`** (`solve.ts:98-113`), so
   "why this amount" needs engine work — omit it; and **no calendar anchor rides the payload** — derive via
   `draft.startCalendarYear` + `rothPlanStartFor`, never a re-based offset. Space is ~90-120px inside
   `.rec-committed__rest`, which is `display:contents` single-column and a real flex column at the two-pane,
   so a new child needs **no** grid rule.
   ⚑ **His call when it comes up:** following the card's own pointer **destroys the card** — applying a
   policy in the sheet fires `invalidateStaleSolve` → *"This strategy read is out of date"* → a re-solve
   costing 80-200s. Ship the door anyway (act → demote → re-solve), or does v1 **name** the winner with no
   door at all?

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

10. **The assumed heir bracket (0.24) — the shipped copy sends the reader to a control that does not exist.**
    ⚑ **The filed claim ("cannot be seen or edited") is HALF FALSE, and the truth is worse.** It IS
    disclosed — `recommendationView.ts:78-81` → `copy.ts:2352-2353` → `RecommendationSurface.tsx:469-477` —
    and the sentence ends *"— adjust it in your assumptions if that's off."* **There is no heir seat in
    `assumptionRegistry.ts` or `AssumptionPanel.tsx`** (grepped 2026-08-02: zero rows). A dead-end
    instruction is worse than silence — it was **live**, visible in the 2026-08-02 `?seed=nc` capture.
    ✅ **XS half SHIPPED 2026-08-02** — the dead-end clause is gone; the sentence states the assumption and
    stops. **(M) still OPEN:** the real editable row. ⚠️ The copy's own comment carries the coupling —
    **restore the "adjust it in your assumptions" clause in the SAME change that ships the seat, never
    before it.**
    ⚑ **2026-08-03 double-blind — the ONLY entry whose skeptic could not refute it. Fully decided, ZERO
    engine change, ~10 source + 3 test + 3 doc files. Ready to build.** `0.24` is
    `solverAssumedHeirBracket` (`engine/constants/solver.ts:126`), read once at `solveDispatch.ts:82`;
    `heirBracket` **already threads** as `SolverRunRanking.heirBracket` (`solve.ts:402`, `select.ts:141`,
    `objectiveHeadline.ts:47-58`) — only its **source** moves.
    ⚑ **"Line-for-line template" is the one trap: `survivorSpendingRatio` is a REQUIRED v3 field seeded from
    the app-default era — copying that shape BRICKS every existing vault at `needFinite`.** `heirBracket`
    must be **additive-optional**: `model.ts` beside `chosenGoal` + `SCENARIO_V3_FIELDS` (the 4 shape ties do
    the rest) · `memoryModel.ts` **optional** Pick block `:160-191`, **not** the required block `:193-202`,
    and **no seed** in `createMemoryModel` (absence = took our default) · `scenarioCodec.ts` guard beside
    `chosenGoal` `:828-830`, **range-gated [0,1)** not merely finite (a persisted `24` is in-range garbage
    that throws at `objectiveHeadline.ts:49`) · `solveDispatch.ts:81-82` →
    `draft.heirBracket ?? solverAssumedHeirBracket.value`.
    ⚑ **The seat:** `assumptionRegistry.ts:39-60` + a disposition at `:107-183` (both compile-forced) · a new
    Row after `AssumptionPanel.tsx:362`, gated `chosenGoal === 'leave-more'` (no-hollow-door) · a
    **`SegmentedControl` over the statutory ladder, NOT a `PercentField`** — a closed vocabulary cannot reach
    the `>= 1` that throws, so `sanity.ts` stays untouched (survivor-ratio needed it). Help text must
    disclose the **unsafe direction** the way survivor-ratio does (`copy.ts:1112-13`): too low **understates**
    conversion value and can invert the ranking. Staleness is **free** — the fingerprint already carries
    `heirBracket` (`solverRunFingerprint.ts:55,122`).
    ⚑ **Same commit, now-false claims to sweep:** `solver.ts:113-134` asserts the figure is *"R7-editable
    (recommendationView.ts registry)"* and *"the user overrides it"* — **false today, live inside the
    constants provenance**, including the citation string at `:128`. Also `recommendationView.ts:46-49`,
    `:56-59` and `RecommendationSurface.tsx:477-478` say the deferred editor is **inline**; the panel wins
    (`Result.tsx:493-508`'s measured 67-161px breach + insight 058's one-editor-home).
    ⚑ **Anchors, all drifted:** the slot is `copy.ts:2402-2403` (not `:2352-53`); the survivor-ratio row is
    `AssumptionPanel.tsx:336-362` (not `:322-348`); the disclosure builder is `recommendationView.ts:86-91`
    (not `:78-81`) and renders at `RecommendationSurface.tsx:477-487`. `docs/backlog.md:370` still asserts
    present-tense that the shipped sentence ends *"— adjust it in your assumptions if that's off"*; the XS
    half removed that clause — **correct the register too.**
    **Panel only — never asked in intake** ("what bracket will your kids be in?" invites a confidently-wrong
    guess worse than the 24% default). Also open: the third locked Tier-2 goal (`live-bigger-now`) does not
    exist, so R21 ships 2 of 3 · the U17 S7 riders, **neither buildable as filed** (Q7a's gating premise is
    false — the dialects already co-render; Q7b's whole spec is one line).

### Tier 2 — what breaks on someone else's device

11. **The surfaces a friend actually hits have never been walked or cold-read by anyone.** The vault
    credential ceremonies (Passphrase, Backup, Save, Export), `RecoveryFlow` and `RestoreFlow` — the two
    *"I lost access to my retirement plan"* screens — plus ColdStart and 10 of 13 intake steps, including
    **Accounts, where the couple enters their entire net worth.** No dev seed reaches most of them.

12. **The couple's own data.** An interrupted intake loses the whole household (13 steps, zero persistence,
    no `beforeunload`, and one step tells them to fetch a number from healthcare.gov **in a new tab**) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:537` refuses anything but
    v3, so the first v4 bump bricks every saved plan *and its backup* · there is **no way to delete the
    vault** (`clearVault` exists; its only caller is the dev seed planter).

13. **Also:** no icons at all, so the "local-first PWA" is not installable · Chromium-only verification
    while the durability story is explicitly about Safari eviction · the fit law is never checked at
    enlarged text · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · the solve
    lane has no cancel and can freeze the tab silently (`engineClient.ts:50`).

### Tier 3 — Briggsy's call

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

16. **The gates that don't bite (14 filed items)** — R7's registry is one level deep, copyGuard's scope is
    a prefix allowlist with no forcing function on new keys, and several arms still cannot fail. None can
    produce a wrong answer today; all mean the net is thinner than it reads. Plus the Medicare-trend
    riders, the open copy obligations, the deferred richer market draw, and the `dateinvert` (c) mint —
    its own session, a size-L parameter hunt.
    ⚑ **The CVD half of this cluster is PARKED, not owed — do not re-propose it.** The filed gap ("the CVD
    crops prove PRESENCE only") is real, and a `verify:cvd` pixel-regression gate was designed for it on
    2026-08-02. **Briggsy declined it on the only authority that can:** *"I'm pretty color blind and I think
    b9 looks great."* Per `caddie/SKILL.md:235` the colour lane can only flag, never pass — his eyes own the
    verdict, so that IS the pass (taste-corpus rule 40 + exemplar E14). Rule 18 still binds every NEW
    surface; this covers what he has seen. **Being colour-blind qualifies him as the oracle rather than
    disqualifying him** — he is the failure mode, not a judge of prettiness, and a simulated-CVD PNG is only
    a model of him. Reach for the human before building the simulator.

---

## Standing cadences

- `/ultramode-code-review` at every unit boundary; the **four-skill UI loadout** before ANY user-facing
  surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** native Agent Teams for live-steer **eye-oracle** units; the Workflow tool for
  fire-and-forget **test-oracle** fan-out. Durable laws in memory `feedback-delegated-build-laws`.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (106 of them; cite by full path + slug).
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
  prose figure the spec never asserts — **never budget a different surface against it.**
- **A live solve is minutes, not seconds — budget for it.** A dev-build `?seed=nc` solve measured **~11
  minutes** (2026-08-03). Prod DCEs the dev seeds, so a browser walk that needs a committed
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
  times out the final-tier waits).
- **A StructuredOutput schema that asks for too much output fails the whole call** (insight 084). Split the
  fan-out; never ask one agent for dozens of long fields at once.
- **`?vault=` / unlock / save need a secure context** (`crypto.subtle`) — localhost or https, never a bare
  LAN IP over http.

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
| `steer` | the `no-pretax` typed refusal — invite → GoalPicker → calm refusal, no solve |
| `nc` · `pa` · `fl` · `elsewhere` | the state faces — NC bites, PA is small, FL is $0, elsewhere unpriced |
| `datenc` | the date-route NC witness |

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
