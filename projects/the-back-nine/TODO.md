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
> silently resolves to a *different* live item later — worse than dangling. (The worked example: the logs once
> cited "TODO item 11" meaning the state-tax unit, shipped 2026-07-15; by 2026-09-24 this file's item 11 was a
> different entry, and "item 0" no longer existed.) Cite the register entry's **title**.

**Where we are:** all four acts are built. On 2026-10-21 Briggsy ruled **D7** ([`docs/product.md §4`](docs/product.md)): the tool
**uses** every number the household gives it, **asks** for any number it needs and lacks, and says "nobody can know this" only
about markets, lifespans and future law. A gap is a build item, never a note written around it. Go as deep as the math needs,
in words he reads without a PhD, and show the household how we got to the answer, in their own numbers. The queue below is
ranked under that rule.

▶ **START HERE (2026-10-30, written by b9-8 for b9-9): U11 is LANDED — every pay-check doc says how a working year is
modeled now, and every gap it leaves is filed once** (`d7930466`; CI run 41162167856 green on both jobs (verify, verify-rv-chart-text), read by id). U10's Caddie
card stays **HARD-FLAG**, held on two Tier 1 builds: *The re-entry gate says "Markets and paychecks move" but shows no pay…*
and *The gate's working-year lines can't say whether a change touches this household…*. It goes PILOT-CLEARED when both walk
clean. Next, in order:
1. **The whole-file review** of the pay check (`/ultramode-code-review`, the A7 review's `brief.md` the template) and `/distill`
   (the DISTILL CANDIDATES below, b9-8's and b9-7's first). Its scope is the whole build plus b9-7's code: `oopHelpKeyFor`,
   `composeReentry`'s `payCheckStale`, `workingYearCostStaleText`'s one-sided lean, `captureTallSheetRegion`. The rulings are
   `b9-phaseb\DECISIONS.md` 1–37. The review tools (every lens's repros, the mutant specs and the runner, the re-anchor
   classifier) are in `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-phaseb-review\`
   (`b9-4-mutants\`, `b9-5-mutants\`), and its `FIXES.md` is the progress record. U11 found no code defect; the review starts
   from the code, with the register's 2026-10-30 entries as its map of the known gaps.
2. **Rank the registers against the D7 queue** (his order; never re-ordered without him):
   - **b9-5's four.** Tier 0 *A self-employed worker's Social Security and Medicare tax is charged at an employee's half…*
     (a D7 ask; measure first). Tier 1: *The money picture's later years name a change without its dollars or its
     direction…*, *The assumptions sheet says "Everything the answer leans on, in one place" but shows no pay…* and *The
     working-year methodology row lists about fifteen caveats…*.
   - **b9-7's four (Tier 1).** The two the card HOLDS on (above). The gate's pay row is a new gate row, so the four design
     skills load first. The stale lines' measure needs the working-year check run at both figures over the engine's own
     paths, survivor rows included, never the everyone-alive ledger. Then *Keeping a stale yes turns it into an entered
     figure…* (it re-opens ruling 34) and *The spending help names only Medicare premiums to leave out…*.
   - **U11's (b9-8).**
     - ⏰ *A copy of the app built before the pay check opens a plan carrying W without a word…* (Tier 2). Its ruling is DUE
       BEFORE HIS FIRST REAL SAVE: after that save, its option (a), a `schemaVersion` bump, is a persisted-shape one-way door.
       Rule it, or put it to him, before that save.
     - *Until the W step is answered, the walk's provisional date runs without the pay check…* (Tier 1, re-titled from the
       earnings-test entry). Measure the strip just before and just after the W step on every date seed and `dateshort`,
       then `/council` the remedy.
     - Tier 0: *The 3.8% surtax on investment income is never charged…* (split out of the Tier 3 entry; already in D7 bucket
       3), and the two re-tiers, *The working-year base subtracts every traditional-IRA contribution…* and *The 2026
       Roth-only catch-up rides the entered account kind…*.
     - Tier 1: *Health premiums taken from pay before tax are charged payroll tax and income tax as if they were pay…*.
     - Tier 2: *A job outside Social Security is still charged Social Security tax…*, *The Social Security wage base and the
       earnings test's exempt amounts are held flat in today's dollars…*, *Social Security checks held back because of pay
       before the plan's first year are never credited back…* and *Two states outside the priced three look the same to the
       working-year cost…*.
   - **The tier rule: settle it once, in this pass.** U11 moved §219(g) and the Roth-only catch-up to Tier 0 because, under W,
     their rosy half reaches each working year's cash, beside K1 and K2. The same reading would also lift four entries
     whose rosy halves now reach the check:
     - K6 *Pay is one steady figure all the way to the stop date…*;
     - K7 *The tool asks only where you'll live in retirement, and taxes your working years as if you already lived there*;
     - K8, the wage-base entry;
     - the two-unpriced-states entry.

     U11 amended K6's and K7's text and left their tiers alone. K5 rides the Tier 2 birth-month entry. The register also keeps
     narrow rosy entries in Tier 2 (Philadelphia's School Income Tax, PA's inheritance tax). Rule it by the header's "worst
     consequence, never by size". Either move all four up, or move §219(g) and the catch-up back down. Then write the rule
     into the register header so it stops being re-derived.
3. **Build 2, the surplus question**, follows. The council's shape is on the ⚑ RULED bullet of the CLOSED Tier 0 *A working
   year never checks the household's pay against its spending…*.
**U11's record, durable:** the four workflow journals, under
`C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\d53f9156-ebb9-488d-afe3-12339f606f74\subagents\workflows\`:
`wf_eefd24b7-629` (scout + six drafting lanes + the applier), `wf_c01e9698-67f` (the adversarial verify: 70 findings),
`wf_e1352a25-e01` (the fix pass) and `wf_52bd1d61-b04` (the final verify of the fixes). `d7930466`'s message summarizes them.
**U10's measurement, durable:** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-u10-tools\`
— its `README.md` indexes the date-search probe (`probe.mts`, `--w` mints W at run time on a frozen HEAD copy), `compare.mjs` /
`deepdiff.mjs`, the hand-derived year-0 check (`year0check.mts`) and the pre-59½ count (`precount.mts`); `head\` holds a
`node_modules` JUNCTION — remove the link alone before deleting the folder. The re-pointed pay-check probe
(`b9-paycheck-probe\paycheck.mts`) writes to its own `out\` and passes the earnings-test schedule under W.
**The research, durable:** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-paycheck-research\`
(the payroll and earnings-test primaries, verified) and `b9-phaseb\sources\` (42 CFR 407.20 and 411.172, read 2026-10-30 for the
spouse-side Part B entry).
**Nothing parks.** Every new string is drafted and ships flagged; the saved shapes are the pilot's until Briggsy saves his first
real plan.

**SESSION 2026-10-30 (b9-8, the pay check's U11):** docs only, no code touched. By exit code at this close:
`pnpm verify:doc-stats` 0 (its counts, the register header and every code citation match; the numbers live under that gate).
`pnpm doc:reanchor HEAD --apply` moved 20 doc-to-doc line citations; two more were moved by hand (the bridge row, `docs/architecture.md` 119 → 120);
the dated `docs/council-log.md` was restored as it was. CI run 41162167856 on `d7930466`: green on both jobs (verify, verify-rv-chart-text). Typecheck, lint,
build, bundle and `verify:fit` were not re-run here: no code changed, and CI's full gate covers them.
**LANDMINES from this session:**
- `verify:doc-stats`'s citation arm checks only CODE targets: its `CITATION` regex has no `.md`, so a doc-to-doc citation such
  as `docs/architecture.md:119` is never checked. One inserted line in a cited doc silently shifts every one of them.
  `pnpm doc:reanchor HEAD` does move them, because its target filter includes `.md`. So:
  - run it last on any commit that edits a cited doc;
  - read its REVIEW list, where a citation inside a modified hunk is a hand call;
  - it also rewrites the dated logs (`docs/council-log.md`), whose citations are frozen as they were. Restore that file
    afterwards. `git restore --source=HEAD` is safe only while the log has no other edit.
- A Workflow's task output file wraps the script's return value as `.result`:
  `JSON.parse(text.slice(text.indexOf('{'))).result`.

**DISTILL CANDIDATES (for the pay check's Phase C `/distill`):**
- (b9-8) a plan's reachability sentence is a claim about every caller, and a later ruling can move the carriage rule under
  it. KTD1 and KTD22's "only dev plants and engine tests reach a W-absent run" went false the day Phase B ruling 17 made
  `buildDateInput` carry W only once it is answered: the walk's provisional strip runs W-absent before the W step. Three
  drafting lanes found it independently from the code; the spec was never re-read. When a carriage rule changes, grep the
  plan for "only … reach".
- (b9-8) drafting from a spec inherits the spec's stale sentences. Six careful lanes copied R1's "Medicare excepted" and
  KTD22's reachability into four docs. What caught them was an adversarial verify against the CODE: 70 findings, 35 of them
  "wrong", and 0 rejected on re-check. The fix pass's own new sentences then carried 11 more. Budget draft → verify → fix →
  verify-the-fix for any docs unit.
- (b9-8) a plan's "file these new entries" list is a hypothesis about the register. One of seven was already filed (b9-5's
  self-employment) and a second was half covered. The scout read entry BODIES, not only headings, before any lane filed.
- (b9-8) a re-tier is a rule, not a pair of moves. Lifting §219(g) and the catch-up to Tier 0 for "a rosy half that now
  reaches cash" left K6–K8's entries in Tier 2 under the same rule. It also made two "the other rosy keys sit in Tier 0"
  sentences false, because K5 rides a Tier 2 entry. Apply a tier rule to the whole family, or write down why not.
- (b9-7) a "can" sentence is read as "is": "this answer can look worse than it really is" was true of the mechanism (a higher
  W never improves the answer) and false of the household — on `datecoststale` neither figure makes a year short, the curves are
  identical, and two seats read it as "the real answer is better". A direction claim is a claim about THIS household: say it
  where measured, or only on the side whose over-read errs safe.
- (b9-7) a capture artifact readers route around is still a hole: `crop-w-row.png` painted the landing over its top third since
  U8 (a crop taller than its sheet's scroller — the harness's own docblock named the limit), four seats quietly read copy.txt
  instead, and the color lane had never screened that row. When a reader says "I read it from the text instead", the capture
  is the finding.
- (b9-7) "this seam takes no draft" was a convenience, not a law: the gate's static line existed because `composeReentry` took
  no draft, and its caller held the hydrated draft one line above. Before writing a figure-less stopgap, read the caller.
- (b9-7) three rewordings of one pointer failed ("which button fixes it?") until the chair read where each control leads —
  both reach W. Trace the controls before rewording a hint about them a second time.
- (b9-6) a seed measurement can take its AFTER without touching the tree: mint the change at run time with the SHIPPED
  producer on a frozen `git archive` HEAD copy (`b9-u10-tools\probe.mts --w`), then require the edited tree to reproduce that
  run byte for byte. It splits "what the change does" from "did I make the change I measured" — and the edit can land while
  the measurement runs.
- (b9-6) a prediction is a claim about REACH before it is a claim about size: "dip's crown moves at most one year earlier"
  could not happen, because the earnings test reaches only offsets that work past the 62 claim and the crown IS the claim
  year — offsets 0–4 are byte-identical by construction. Ask which offsets a new mechanism can touch before predicting where
  the crown goes. And measuring EVERY seed, not only the ones predicted to move, caught two docblock crowns ("≈ 7 years out",
  "floor ≈ 4") that were wrong before the change too.
- (b9-5) a fix that adds a control is a new surface with its OWN rosy direction: the Keep door closed one rosy path (the easy
  Yes cut W when spending fell) and, read cold as the stale note's only visible action, opened its mirror (a one-tap keep BELOW
  today's spending where spending rose). Re-read every new control in BOTH directions of the quantity it moves; the gate (shown
  only at or above the quote) came from the second panel's first-look seat, not the chair.
- (b9-5) a label is a claim about scope, and the producer owns scope: "Income tax on that income" read as every income tax
  where the run charged federal only. The fix read the run's own state slice — and the chair's first rule (point at W only
  where the slice is $0) was wrong for PA, whose run prices its tax on investment income and leaves its tax on pay to W. A
  real-seed arm per reading (NC / PA / unpriced / FL) caught it before landing; key the words to what the producer did, per
  reading, never to one inferred proxy.
- (b9-5) each re-walk round after a fix found one more holds-type defect in the fix's neighborhood (walk 1: "keep" read as
  already counted; walk 2: the federal-only line and the Keep door's mirror). A fixed sentence is a new sentence: put it in
  front of fresh readers before clearing, and budget the second round.
- (b9-4) a review's ADVISORY bucket is still findings: the held-back sentence (confidence 100, rosy words, a repro) sat in the
  review result's `advisory` list and fell out of b9-3's merged fix list, which drew from `confirmed` and the overflow. Merge
  EVERY bucket of a review result, then rule each item — an advisory is a severity guess, never a dismissal.
- (b9-4) a sentence about what the run does has to come FROM the run's own rule, per household: "each month held back raises
  the benefit later" was the law's general case, false in the full-retirement-age year (the stopgap credits none) and for a
  payee past FRA. The fix classifies each held-back month on the crediting test itself (`heldBackReason` reads the settle's own
  ages), so the words and `creditMonths` can never disagree — and a hand-derived fixture caught the pilot's own wrong guess (the
  widow's FRA-year excess was $0: 11/12 of $60,000 sits under the higher amount).
- (b9-3) a stopgap sentence is read by EVERY household shape, not the one it was written for: ruling 1's "health premiums
  before anyone's Medicare starts" was right for a retired spouse on the worker's plan and told `dateshort` (one already on
  Medicare, one working) to count no premium at all; and "leave out Medicare premiums" turned a register gap ("no sentence covers
  it") into an instruction that hides the cost. Walk a help sentence against each seed's shape before shipping it (the Caddie
  card, b9-3).
- (b9-3) four review lenses found the same exit independently: Back is the one ungated way out of a gated step, so a value the
  step's Continue refuses ($0, an unconfirmed period) leaves through it and meets a route change or a remount's provenance. A
  gated step owns what it leaves behind on EVERY exit (`discardOnBack`), not only on Continue.
- (b9-3) a CSS fix outlives its reason: `.strip-fact { white-space: nowrap }` was written for a "(62–70)" label no longer in the
  catalog, and ran a 60-character fact off a 390 px phone. An atomic-when-it-fits unit is an inline-block with `max-inline-size:
  100%`, not nowrap.
- (b9-1, Phase B) an input surface's reading must come from the same source as its sibling input surface: KTD18 took the
  W question's state reading from the BUILT run, which is `undefined` on any unbuildable draft, so the W step would have told an
  NC household the opposite of the spend step and then staled its answer when a skipped question was filled. Input surfaces
  read the draft (`spendHelpKeyFor`'s doctrine); output surfaces read the producer — check which a new surface is before
  copying a predicate (`b9-phaseb\DECISIONS.md` ruling 5).
- (b9-1) a register entry's premise is a claim to check against the code before measuring its size: the Tier 1 premium entry
  assumed a marketplace spouse beside a worker, a household the intake refuses outright (`employerCoverageUnpriced`); the real
  shape (her share of the plan at work, only inside an ENTERED W) changed the remedy from an engine step to words.
- (A7 review, 2026-10-29) a gate copied from a sibling event whose step moves the quantity the OTHER way: `turns65` lowers
  a tax, so "the year before owed some" is its right gate; the senior bonus's end RAISES one, so the same gate hid every
  2029 where the bonus had zeroed 2028 (a $185–$1,050 yearly drop, unnamed — and it named a false sunset where a pension's
  end took 2029 to $0). Before reusing a gate, ask which way this step moves what the gate reads (`wf_b97c0055-346`, six of
  nine lenses).
- (A7 review) the coordinator suspected that gate before the launch and kept it OUT of every prompt; six lenses found it
  independently. A hypothesis handed to a reviewer comes back confirmed, not tested — hold it back, then check whether the
  fan-out reaches it unaided (a free measure of the review's own coverage).
- (A7 review) snapping to the money's grain does not settle a true tie: `Math.round` lets the float's dust pick the side,
  so a true −$12.005 (payroll on $72,570 is a half cent) read "Short $12". A grain snap needs its own tie rule — the
  gloomy side, within a dust tolerance — and every gate that compares money reads the same grain.
- (A7 review) a cross-check over only what a producer chose to report cannot catch what it failed to report: the year-0 and
  named-year `Object.is` pins could not see an unnamed year. Pin the converse too (every year the run itself finds short is
  named) — the producer-omission oracle.
- (A7 review) "who explains this move" can be settled on household figures by the law's monotonicity: a start only adds
  to what the earnings test holds back and never starts a credit, so a release or a credit beside a start is the test's
  own — no per-person arrays needed.
- (A7, 2026-10-29) a floor-based dollar rule turns float dust into a visible dollar: $3,060.0000000000005 of payroll, as a
  money-out line, floors to −$3,061 on a round-number household. Snap each figure to the money's own grain (the cent) before
  any dollar rule; then the largest remainder is exact in integer cents (`roundLinesToBottomLine`).
- (A7) a compiled input that pre-sums per-item vectors loses the items' boundaries: a person's income streams are one leaf, so
  a pension ending beside a second stream never reaches 0 in the run. An event producer takes such a boundary from the source
  that still holds it (the draft, compiled one stream at a time), never from the summed vector.
- (b9-14) a "reads the SAME object" test that checks what a probe was HANDED proves nothing about what the code READ: the
  check composed from a second floor preparation survived, because the probe was passed the prepared floor while the
  composition used the copy. Pin it by a value only the right object carries (an NC household through the loop, a later
  calendar year), never by identity on the probe's argument.
- (b9-14) a zero a component returns for one composition's reason can be a hole in the next: PA's floor pair is 0 because
  the increment over pay is pay-invariant (the floor's question), and the check (a new question: what does the outside
  income cost by itself?) inherited that 0 and charged PA nothing on a pension or I. Re-ask what a reused figure MEANS
  before composing it into a new total (the A6 review's money-law lens; its skeptic reproduced $675.40 a year).
- (b9-13) an extraction is cut for its NEXT consumer's constraints, not only its first caller's: `medicareChargeForYear` first
  took the IRMAA schedule and the run's Part B schedule as inputs, which is what the year loop holds — but A7's ledger, the
  reason the function exists, may import neither `@engine/healthOverlay` nor the constants (KTD12's allowlist), so A7 would
  have re-cut it. Read the downstream unit's import and data constraints before fixing an extracted signature.
- (b9-13) an equivalent mutant is a question the DOMAIN answers: the producer's both-alive `auxStart` survived planting
  (`spousalStart` → `ownStart`) because in the FRA year a piece that began in an earlier year was always claimed before FRA,
  so it is already priced early and its start never decides; 20,000 aimed households (2,735 paying a spousal excess in a
  working FRA year) digested identically. Prove it by an aimed fuzz, never by the argument alone.
- (b9-12) "starts this year" is not "starts at FRA": the FRA-year exemption has to key on how the ENGINE PRICED the benefit
  (unreduced = begun at FRA), never on its start year — a spousal excess the other spouse's filing starts that year is priced
  as the payee's early claim, and an own claim at 67 was shielding a widow(er) benefit begun years before (the review's two
  confirmed rosy holes, `wf_bb2c6dec-c1c`).
- (b9-12) "the most the year can hold back" was a flat 11; derive the bound from the sourced table per cohort, (FRA + 11) mod 12 —
  the one cohort a plan can reach on a fractional FRA (1959) holds 9.
- (b9-12) owed − withheld in floating point leaves a crumb (a year withheld in full read −3.6e-12): keep the composed float
  where nothing is withheld (bit-identity) and sum the remaining months in exact cents where something is — the seeded sweep
  caught it on its first run.
- (b9-10, now proven by the fix) a decision record's "no oracle exists" is a claim to check at the primary, not a
  fact: `ss-computation.md` said no oracle covered the RIB-LIM × age-reduction order and pinned the engine's order as
  deliberate; the RS 00615.322 D worksheet's chart (its payable cell is a `poms-underline` span — plain text drops it)
  is that oracle, and the order was backwards.
- (b9-11) a reach claim reasoned from who a change is "for" missed a branch: "only the early claimers can move" was
  false — the dime floor's delayed-credit path reaches every pre-1960 cohort claiming at 67 (past a ~66 FRA). A probe
  of the CHANGED FUNCTION over every seed's death orders and drawable death ages, old against new
  (`b9-seed-probe\reach.mts`), settled it; and a seed reading byte-identical is a statement about OUTPUTS — `failing`'s
  function moved on all 93 cells and no output reads it (every path is depleted in year 0). Insight 143's sibling, one
  level down: enumerate the function's own domain, never infer it.
- (b9-11) a normalization added inside ONE function makes a mixed basis with its siblings: flooring the PIA to the
  dime for the full rate while the cap read the raw figure let the reorder pay a cap a dime above the law — the round-1
  law lens's catch (`wf_c6ac19f3-207`); the own-benefit sibling is the filing above.
- (b9-11) a property whose oracle calls the function under test certifies that shared arithmetic: say what it pins (the
  composition) and pin the rest by hand goldens; count a chart row "reached" only on strictly ordered amounts (a $0 PIA
  ties all three) — both mutant-proven.
**THE A7 REVIEW (durable, 2026-10-29):** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-a7-review\`
— `brief.md` (the review's contract brief, a template for Phase C's), every lens's repros in its own folder, `a7-tools\` (A7's
53-mutant spec and `seeds.mts`, saved from the dead A7 scratchpad), and `fixes\` (the fix's 28-mutant spec + its result,
`seeds.mts` pointed at `fixes\out`, the before/after outputs; `head\` and `pre-a7\` are `git archive` copies with
`node_modules` junctions). For U10: `adv-temporal\sweep.mts nocpi` is a drift-free completeness sweep over generated W
households — it reads `adv-temporal\nocpi\src`, a `src` copy whose `priceIndex.ts` multiplies by `1 + 0 * cpiRateFor(y)` (no
drift, so every cash move left is discrete), and prints each later year that moved UNNAMED, was named with no move (NOISE), or
was MISATTRibuted. That copy is the PRE-fix tree: re-copy today's `src` into it and re-apply the one-line pin before re-running.
**THE A6 TOOLS (durable, b9-14):** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-a6-tools\`
— `seeds.mts` (`b9-seed-probe`'s, rooted at the CWD's `src`: run it once from `b9-a6-head\` — a `git archive` of HEAD's
`src` + tsconfig with a `node_modules` junction; refresh it with `git archive HEAD:projects/the-back-nine src tsconfig.json
package.json` — and once from the project, then `cmp` the two outputs for a byte-identity proof that never touches the live
tree), `timing.mts` (final-tier wall time, W-absent vs W-present, alternating), `unreanchor.mjs` (the landmine below) and
the A6 mutant specs. The A6 review's repros: `b9-a6-review\` (`wf_fdc509f6-84c`).
**THE SEED PROBES (durable, b9-11):** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-seed-probe\`
— `seeds.mts` (every dev seed's FULL engine output through the app's own calls: the spine run with band fan + survivor
reading + health readout, both date tiers; typed arrays digested), `diff.mjs` (every moved field per seed — it stops at 80
lines per seed, so recount from the JSON), `solve.mts` (`buildSolveRequest` → `solveWithMint`; pass `seed:goal`),
`extras.mts` (`healthss`'s spend solve + the step-down distribution path by path) and `reach.mts` (HEAD's function against
the tree's, per seed). Re-point each script's output DIR off this session's scratchpad; run from the project dir with
`pnpm exec tsx`. For a "before" run, snapshot the HEAD module with an absolute constants import (as `reach.mts`'s comment
says) or swap the HEAD file in with snapshot + restore + `cmp`, never `git checkout`.
**THE MUTATION HARNESS (durable):** `mutants-spec.cjs` in the re-anchor tools folder (UNFINISHED's path), run from the
project dir as `node <tools>\mutants-spec.cjs <spec.json>`; `mutants-spec.example-a3.json` is A3's eight-mutant spec. Each
plant must land exactly once, the named tests must go red, and every file is restored and byte-compared.
**FOR HIM (one read, no rush):** two `docs/product.md` spots still lean on friends using the tool — R13's "kept on honesty
grounds for friend-users" and the test-driver list naming real friends' households. The tool is built for him (his
correction, 2026-10-21); whether R13's reason and the test-driver framing change is his call. And one A4 call that is his
to overrule (b9-12): a widow(er) benefit that STARTS in the survivor's full-retirement-age year is never earnings-tested
(the engine prices it as begun at FRA, and the plan says such a benefit is untested), though a death early in that year can
mean a few months the law would test. It joined the disclosed K5 residual (the plan's U9 K5 key), beside "a claim at 67
is paid for the whole year"; the review's two refuters split on it. Asking the birth month closes both (the register's
*Ages are whole years from the birth year alone — the birth month isn't asked*).
**THE PAY-CHECK PROBE (for build 1's re-measure):** `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-paycheck-probe\`
(`paycheck.mts` + `paycheck-years.json` + the skeptic's `survivor.mts` / `survivor-rows.json`). Absolute imports into `src/`;
re-point each script's output path off the dead session scratchpad before running. Run it from the project dir with tsx.
**THE D7 QUEUE — his order, ruled 2026-10-21 ("yep, seems right").** Every item is a register entry; cite it by title.
1. **An honest quit date (the working years).** Most of these make the date read too early:
   - (a) ✅ BUILT 2026-10-30, build 1, the pay check (the CLOSED Tier 0 *A working year never checks the household's pay against its spending…*): with W answered, every working year checks pay against W, payroll tax, the tax on outside income and its own deposits, and a short year draws from savings. Its open residuals are their own register entries (START HERE item 3 ranks them);
   - (b) the 10% charge for pulling from an IRA or 401(k) before 59½: *Money taken from retirement accounts before age 59½ is never charged the 10% early-withdrawal tax…* (mind the age-55 rule for a job's plan);
   - (c) the Social Security figure assumes work continues to full retirement age and is used unchanged for an earlier stop: *The Social Security statement's default figure assumes continued earnings…*;
   - (d) *A pension from the job you still work at counts the same whatever stop date is tested…*;
   - (e) *Money coming in beyond what the household spends is thrown away…*: build 2, the surplus question. Council `wf_2247c0df-73b` ruled it with (a) on 2026-10-21; its shortfall half shipped with (a). The pre-W measurement found ~$70,000 a year dropped on `dateborder`;
   - (f) *Two working spouses always stop work in the same year…* (an ask);
   - then the rest of the working-year family: *A still-working employer-plan participant's RMD is forced…*, *Until the W step is answered, the walk's provisional date runs without the pay check…* (re-titled 2026-10-30 from *The Social Security earnings test is unmodeled…*: the test is built under W; the open residual is the provisional strip), *Medicare's income surcharge is figured on working-year income that is too high…*, *Someone still working after 65 is assumed to stay off Medicare…*, *The tool asks only where you'll live in retirement, and taxes your working years as if you already lived there*, *Pay is one steady figure all the way to the stop date…*, and the small base fixes (*The working-year base never subtracts an employee's own HSA contribution…*, *…every traditional-IRA contribution…*, *The 2026 Roth-only catch-up…*, *The bracket-fill rails read a clamped working year's committed income without the pay…*).
2. **"How we got here"**: a year-by-year money picture in the household's own numbers, under the main answer on both routes: *The detail-door era — nowhere to see how a number was reached* (his ruling and the audit's map are on it). It shares 1(a)'s per-year take-home, so the engine work is done once.
3. **Taxes it can already figure:** *The taxable account's yield never reaches a year's tax base…*; the 3.8% surtax (*The 3.8% surtax on investment income is never charged…*, split 2026-10-30 out of *Knowingly omitted costs — the discussion he parked* into Tier 0); *A brokerage sale at a loss gives no tax break*; *When the first spouse dies, the brokerage account's cost basis isn't reset…*; *The brokerage account's cost basis is held at today's dollars forever…*; *Tax brackets and the standard deduction keep their full 2026 value after inflation…*; PA's two (*In Pennsylvania the tool taxes a pension the household marked as a pension…*, *In Pennsylvania, every retirement-account withdrawal and Roth conversion is state-taxed until the younger spouse turns 60…*).
4. **Health costs that grow over time:** *Pre-65 health insurance is priced with no cost growth…*; *Out-of-pocket medical costs and Medicare's drug-plan and supplement premiums never grow…*.
5. **New setup questions** (each its own register entry, filed 2026-10-21): *Investment income is asked only of whoever still works…*; *Children or other dependents are never asked about…*; *Before Medicare the tool assumes marketplace coverage…*; *Fund fees and adviser fees are never taken out of the growth*; *Tax is always figured with the standard deduction…*; *Life insurance paid at the first death is never asked about…*; *A known one-time inflow…*; **the heirs' rate — *The heirs' tax bracket for "leave more behind" is a 24% default found only in the assumptions panel — ask it in setup* (his ruling 2026-10-21: "yes")**.
- **The other new Tier 0s** (filed 2026-10-21) rank after bucket 1 by measured reach: *Nobody in the model can die before 65…*, *Social Security is paid in full for the whole plan…*, *The health-insurance quote question never says whether to enter the price before or after the marketplace discount…*, *A retiree already drawing Social Security is asked for a "full retirement age" figure…*, *A retired 65+ couple with no savings entered and no pension or other income is charged no Medicare premiums at all…*; and the two b9-11 filings, *A typed Social Security amount with odd cents is never rounded to the dime…* (own benefit rosy up to a dime a month, two on the delayed-credit path; the spousal excess either way; its Prescription moves most seeds' goldens) and *A spouse who dies in the year they planned to claim is treated as having filed early…* (gloomy; reach needs a planned claim AT 66, which no seed has). The register holds all 48 of the 2026-10-21 filings; search it for "filed 2026-10-21 (b9-7)".
6. **The plain-words pass:** the audit's 30 worst sentences, drafted plain by the pilot, Caddie-walked, and read by him in ONE sitting, never one call at a time. Many vanish with 1–5.
- **ON THE CLOCK, above all of it:** the ACA re-verify, CI-red ~2026-11-19 (the *Dated* table).
- **States:** the priced roster stays NC, PA and FL "for now" (his ruling 2026-10-21). His generic-state idea (ask the state's rate, and whether it taxes Social Security) is filed on *Unpriced states — a confident winner computed with zero state income tax*.
- **The pilot's working rule (a HOW call, not his ruling):** no new process or tooling work unless a D7 build needs it. October ran 55 docs/bookkeeping commits to 17 features; that ratio is part of what took us off course.
**WHERE THE SOLVE STANDS (carried from b9-6; the RIB-LIM clause added 2026-10-27, b9-11):** ONE pricing change since the 2026-10-12 (b9-2) close — ledger v12, the working-year tax floor (`b4bbbd3e`): a reprice of `tax` + NC's `stateTax` gated row-wide on `reach: 'working-years'`, UNSCORED (the solver runs only on the all-retired spine, so it left `SOLVER_CODE_VERSION` at 11; the date-route Roth preview moves, unpersisted); no roster change — THE POOL (`225d8da4`, laws in `docs/architecture.md`'s *The pooled solve*), the all-in objective (v10, `6dab9ec0`), the budgetless survivor-medical lean (v11, `c1ada867`; a scored spend-side pricing change, no roster change), then — no ledger row — the RIB-LIM order (`SOLVER_CODE_VERSION` 12, 2026-10-27, the current one: survivor income where a member claims before FRA, and a dime or two lower on a PIA with odd cents; measured on `healthss`, both goals, crown / runner-up / grade / top five unmoved), the v9 window walk, rosters `retired`-type 93 / `health` 97 / `healthgap` 101; THE APP (production, his laptop, P = 12): `retired` 36.5 s · `nc` 39.8 s · `healthnc` 150.9 s (ANY roster growth re-times `healthnc` first, `e2e/held/solve-timing.spec.ts`). The PHONE half of the pending-line entry is still owed (a ≤ 3-core device gets no pool).
**UNFINISHED:** the distills are DONE (2026-10-21, b9-7): insights 141 (a headline on the population its caveat names), 142 (a disclosure instead of a used number — D7) and 143 (reach enumerates every consumer), plus refinements on 126 (a plan witness LABEL) and 136 (the re-anchor verification method). Still open from them: move the re-anchor verification scripts (`C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-reanchor-verification-tools\`, now with `content-check.mjs` — b9-9's cited-line content check) into the repo beside the register Tier 4 re-anchor entry, so they stop living only in a session folder. No distill is owed for b9-9 or b9-11 yet: the pay-check build's whole-file review and `/distill` run at its end (the plan's Phase C), with the DISTILL CANDIDATES above.
**OWED (carried from b9-6):** to HIM — the "Income Medicare looks at" heading (⚑, `docs/council-log.md` 2026-10-20 — the figure now also sets the income-tax base). The NIIT clause's "here" is no longer a word call: under D7 the surtax gets figured (queue 3), and the clause goes. OWED (both carried from b9-2, still live): (a) the engine measurement of the discount a crossing dollar loses, for the scope entry (Tier 0 *The health sheet's "26¢ on each dollar converted" holds only inside the ~$18,600 of room…*) — only hand figures exist, from the 2026-10-15 early-claim Caddie walk's hunter in b9-toronto1 (`healthss` $9,479 at the anchor; about $8,374 at the ~$84,600 line, the same on `healthnc`'s line — both seeds carry `slcspMonthlyToday` 1,400); measure through the engine on `healthnc`, `healthgap` (the register's Prescription (1) names it — its cliff is live, "about 2 of 10 futures") and `healthss` (a paired CRN run across the line, the anchor year's readout) before his words; (b) the Caddie tape rows awaiting his read — 2026-10-06 all-in, 2026-10-09 survivor-medical, 2026-10-14 survivor spending-basis, and 2026-10-15's four (held-flat, NC cents, early-claim cents, the same-age Medicare card), 2026-10-16's one (the one-figure card's first-year frame + his trend clause), 2026-10-16 (b9-1)'s one (his three rulings + his two in-session rulings), and 2026-10-19 (b9-2)'s one (his four b9-1 walk rulings + his in-session Medicare re-ruling), and 2026-10-21 (b9-6)'s one (the working-year tax row, three walks — his in-chat reads of its DRAFTS are on it as E20, not a read of the shipped face) — `docs/caddie/tape.md`.
**Keep out of every commit from here:** the three family-feud working files (`../family-feud/newsletter/…`) are uncommitted on purpose; never stage them from this project.

---

## Below the D7 queue — the pre-D7 ranked lists

> Kept word for word as PRESCRIPTIONS, not as ranking: the D7 queue above outranks every line here. Each item is a register
> entry (cite it by title). Re-sort each under D7 when it is reached: many are wording calls that a D7 build removes, some are
> real defects that still stand, and the process and tooling ones wait unless a D7 build needs them.

**The b9-6 NEXT list (2026-10-21, pre-D7):** (A) the ACA re-verify — ✅ CLEARED 2026-10-20 (regime unchanged; the ceiling 119-124, every law above 119-118 matched by bill number and swept clean; the record's two self-contradictions corrected — `lawsInEffect` turned out to be one stamp per RELEASE, neither per section nor site-wide); the next FULL pass is due by CI-red ~2026-11-19 00:00 UTC / runtime 2026-11-20 — follow the record's `forwardClock` (its ⚑ 2026-10-20 head: the Senate resumes business 2026-11-09, so the pass lands in the first floor weeks before the December 11, 2026 cliff; the twelve House bills presented 10-14/15 first, by bill number; two new referral-only vehicles to watch — H.R. 10730, retroactive to TY2026 and permanent, and S. 5496, permanent from TY2027) · (B) the NEW Tier 0 *A working year never checks the household's pay against its spending…* (filed 2026-10-21, b9-6, by the working-year row's first Caddie walk and his "why the fuck not? what are we building???") — the first BUILD only if his off-course discussion leaves it there (it is that discussion's example #1; never treat it as ruled): (1) measure — per clamped year, take-home = pay − the worker's own pre-tax deferral − the floor's tax on the base − payroll tax − every other contribution, against the year's spending; name each seed and household shape that goes short, and by how much; payroll tax (FICA) is unmodeled and NOT in the constants — source it first, never a plausible default (burned/062); (2) `/council` the remedy — draw the shortfall, flag it at intake, or both (a draw nets against the contributions, never stacks: §7's double count); (3) build; the `working-year-tax` row's "It doesn’t check that your pay really covers all of that…" sentence comes out the day the check ships (⚑ the entry's NEGATIVEs: never restore the gross-pay subtraction; never key the clamp on a value) · (1) the three filings his 2026-10-16 (b9-1) walk left open (the four rulings themselves are BUILT + WALKED, `1b685648` — git log and the cold-read log's 2026-10-19 (b9-2) card are the record): (1a) Tier 1 *On a plan reopened in a later year the relief line names no assumption…* — words his (the pilot's draft is on the entry), due before 2027-01-01; (1b) Tier 1 *On the date route the North Carolina / Pennsylvania clause says "your state income tax" with no scope…* — MEASURED 2026-10-20 (no priced-state seed reaches at its crown; the mechanism is federal too and is closed by the working-year tax floor, `b4bbbd3e`), so only the words are left, his; (1c) Tier 3 *A household that kept its state bill inside its spending, then picked a priced state in the panel…* — his product call · (2) **HIS WORD CALLS** (what is left after his 2026-10-16 rulings — each needs the pilot's measurement or draft first): (iii) Tier 0 *The health sheet's "26¢ on each dollar converted" holds only inside the ~$18,600 of room…* — OWED (a) first; the bound is the FIRST POINT THE RATE CHANGES, never the room (on `healthss` 28¢ holds for ~$1,260 converted; the rest of the room costs 32.16¢, filling it $3,528 — the entry's AMENDED bullet); (iv) Tier 0 *The survivor step-down attribution…* — its third misreading, the order of death ("$990" is the floor; ~42 % of `healthss`'s survivor futures drop ~$1,283, the refuter's `sampleCouplePath` run) — measure on the engine, then words his; (v) the 2026-10-14 survivor-basis build's and walk's word-his Tier 1s: *The survivor card's spending-basis line is withheld on a RAMPED budget…*, *On an itemized budget the assumptions sheet says the survivor share is "75" %…*, *The survivor card carries no closeness hedge…* (per each entry's owner line — the hedge: pilot measures + the flag first, then words his; the RAMPED line: words his, then the pilot builds; the "75": words his); (vi) Tier 1 *The conversion tile's "all told" leaves out the tax on the money that pays the tax…* — framing his (~1.5¢ on `health`, ~33¢ derived on `healthss` against the tile's 28¢) · (3) Tier 0 *The ACA solve finds no root at the 100 %-FPL line…* — pilot measure + the build's mechanics → council on what a household AT the line pays · (4) Tier 1 *The conversion tile's federal term treats a realized gain as ordinary income…* — pilot (measure reach → build; the gain split is not on the wire today; for a couple reachable only past the subsidy cliff) · (5) Tier 2 *The 2026-10-15 held-flat walk's other pre-existing sheet findings…* — pilot (layout + measure) → words his · (6) Tier 1 *The relief line has no branch for a floor BELOW the hero…* — NOT a Tier 0 (the 2026-10-14 probe found floor < full unreached on every measured face); next: reachability outside the measured family (the entry's Prescription bullet) · (6b) Tier 1 *The one-figure Medicare card's "start at" reads as a floor when the first billed year carries a look-back surcharge…* — NEW 2026-10-16 (b9-toronto3), from the card's build review (`wf_0f6a7da2-fb1`, reproduced through the engine; PESSIMISTIC — it overstates): pilot measures reach on the MEDIAN path (a big conversion two years before enrollment; a high look-back seed), then words his for a surcharged first year (⚑ never the trend clause there; never a second figure without a ruling) · (7) Tier 1 *The date route's Tier-1 key is unruled…* — ruled in the same council as the working-route solve (`datesplit` / `datemixed` / `dip`, plan-as-executed as a probe; the fiduciary elder's charter is already amended, `.claude/workflows/council.js:119` — the workflow, not the skill directory) · (8) Tier 1 *The TwoFutures even line swallows a lever's harm…* — measure across the roster's previews AND the off-roster HSA construct (the 3.94 pp HSA-class loss was measured on `healthgap` + a $150,000 HSA, wf_d98e02fb-08c — no dev seed carries an HSA, so a roster-only measure cannot reach that class), then `/council` on the grammar · (9) Tier 1 *No sourced NON-medical survivor ratio…* — the research leg (a sourced r_N, or a sourced survivor-OOP fall ≥ (1 − r), FLIPS the survivor-medical ruling to keep-flat-and-disclose — so says `docs/council-log.md`'s 2026-10-08 row; ⚑ the register's Prescription and `docs/decisions/ss-computation.md` §6a disagree, both APPLYING a sourced r_N to both arms (the Prescription flipping only on the OOP fall): resolve which governs BEFORE the leg acts on a finding — found 2026-10-15, b9-toronto3; §6a's side added by the 2026-10-16 doc audit, and the register entry's ⚑ flag names all four homes, the CLOSED survivor-medical entry's Dissent bullet among them) · (10) Tier 1 *The band sentence's low figure reads as a FLOOR…* (words his or a council); its two Tier 2 siblings (the delta hero's mean lead; the 10-06 read's other findings) ride the ranked list as filed · (11) the headroom look-back entry TOGETHER with *The step card's room covers the one-enrollee years…* (Tier 1, pilot + council — open, not blocked; figures re-derive under the growth base) · (12) Tier 2 *The engine-pricing ledger cannot name a date-route or spending-figure change…* (8d4d4e58, 6e4c065d — RE-READ 2026-10-15 b9-toronto3: ledger v11's `spending` family does NOT cover the spending half — its exposure read is `survivorMedicalLeanMoves`, its phrase the survivor-spending one, its witness `cashTermsForYear`, and no row names 6e4c065d; the register's "five families" is six now) · (13) Tier 2 *The spend lane's test + polish debt…* · (14) the Roth sheet's blank amount box (Tier 1 — its rail half's shape RULED 2026-10-04, the entry's ⚑ RULED block; built with the sheet after (11) — and after (18)(c): the entry's COUPLING bullet says the fact lines make the sheet taller, so "the build rides" the tall-sheet decision) · (15) the step card's "a year" read (Tier 2, words his) · (16) the echo-ink entry · (17) the Part D hold-direction research leg · (18) **the three owed councils** (the pilot's since the 2026-09-30 re-triage; ≥ 7/10 executes with its ⚑ line in `docs/council-log.md`, a lower score or a Hawk veto returns to HIS EYE with the rec): (a) the 20 px two-pane overrun (Tier 2 *The app on someone else's device…*, candidates (i)–(iii) in its ⚑ OPEN FORK bullet); (b) the phone strip-reserve fork (the block after HIS EYE); (c) Tier 3 *The lever sheets at his seat…* — the hidden actions row (one shape for the control-sheet family) plus Apply-before-the-comparison (the pilot's lean: block while pending) · (19) Tier 2 *`bandPercentile` INTERPOLATES…* — build its ruled shape (pilot; engine-side, observe-only, reduce-to-spine byte-identical): the path-observed (nearest-rank / lower) median for the integer enrolled count and the both-enrolled path FRACTION on the wire (the `overCliffFraction` shape), the base read CONDITIONED on the count the card names; red-first on a fixture splitting exactly 50/50 on enrollment; re-pin the seed gate from the engine; put any moved health card on the next Caddie walk (⚑ never round at the UI; the era-year RULE untouched) · (20) the statistic half of Tier 2 *The premium card's era arm fires on a both-enrolled median window of ONE year…* — BLOCKED on (19); then measure the fraction at the era year through the real engine across 61/59 · 61/45 · 61/43 · 61/41 · 61/40 · 61/38 and on `healthnc`; a candidate must leave the shipped `healthnc` card's routing unchanged; `/council` before any routing change (⚑ never a K; never re-open the era-year rule on a pilot number) · (21) Tier 2 *`tax.rmdStartAge` vs 26 CFR 1.401(a)(9)-2(b)(2)…* (pilot, `S`): the 1959 row's honest form (consumption keyed to birth year, or a disclosed caveat), the unreachable pre-1949-07-01 70½ band, re-cite to the eCFR read + 89 FR 58644, delete the entry's `EXEMPT` row in `constants.shape.test.ts` (⚑ never flip the whole entry) · (22) the latent staleness gate (Tier 4 — shares `staleness.ts` with the ledger) · (23) Tier 4 *Gate honesty after the 2026-09-30 constants re-cite…* (pilot, `M`): rule the parked ACA-MAGI / PTC pair (against §36B(d)(2)(B) + Form 8962 Worksheet 1-1 and §1395r(i)(4)(A)), classify `medicareExtrasTypical`, widen the tripwire's `RESEARCH_OR_SECONDARY` list, re-cite `health.irmaa` with its CMS read date (⚑ never walk the pair as `certification-pinnable` before the primary read) · (24) Tier 4 `pnpm doc:reanchor` self-citations (including the frozen-file class: it rewrites the FROZEN `e2e/held/fit-24px-measurements.md` on every run, `scripts/reanchor-citations.mjs:65` scanning every tracked `.md` with no frozen-file exclusion — restore it after each run, the landmine below; on the entry's size line since `e17c40e4`, "past six by 2026-10-15" — and its b9-toronto1 bullet (27 missed continuations, the pair-check law) and b9-toronto2 bullet (`:N+`, code-block and `~N` forms; preserved rot) ride this item too) — and the three shapes met 2026-10-12 (the register entry's ⚑ 2026-10-12 bullet: only the first bare token per line moves, a re-run against HEAD after `--apply` double-shifts, historical citations move like live ones) · (25) Tier 4 *No priced-state seed crosses the confidence band any more…* — mint a NEW borderline seed + its state-off twin on NC or PA (the `devSeeds.test.ts:498-506` shape), MEASURED by a real-engine pin, added beside `{ seed: 'nc', … }` in `e2e/vertical-fit.spec.ts` and to the next Caddie walk; reword the routing in `docs/plans/features/state-seed-increment-brief.md` in the mint commit (⚑ never re-tune `nc`'s own accounts) · (26) the two 2026-10-19 (b9-2) Tier 4 `XS` filings from the build's pre-trace (pilot): *A passing `verify:fit` spine arm prints no headroom…* (one `console.log` per spine one-frame arm, mirroring `[U16 pending posture]`; ⚑ never a threshold tuned to it) and *No gate holds the catalog's typographic apostrophe…* (a `copyGuard.test.ts` sweep of string VALUES; survey for legitimate straight quotes first) · then the 2026-09-13 late (b9-9) list below as ranked. **ON THE CLOCK:** the ACA window — (A), next due ~2026-11-19. The roster-recall stays CLOSED; its code waits on `b9-v10-gapfill-wip` (`f7aeaf35`), never for main.

**The 2026-09-13 list (pre-D7) — RE-RANKED 2026-09-13 late (b9-9) by the verify pass (13 seats + 12 refuters over the b9-8 list; all 13 items OPEN at `084f94f0`, none stale, every refuter agreed; what the pass CORRECTED in the prescriptions is inline below, each re-opened at source; every item is `execute` EXCEPT Card 9, which the register and the batched-oracle law keep PARKED as a framing fork — it moves to HIS EYE). Its ✅ items 1–4 — the two Tier 0s that led it (the Medicare-era premium sentence, the step card's per-person figure), Card 3 and the "never oversold" row — are BUILT and were cut from this list 2026-09-25: their records are their register entries (all four are CLOSED, each with its ⚑ NEGATIVEs — the Medicare-era entry on his 2026-09-25 ruling, `b83bb464`) and `git log`. The rest by tier, then by cost:**
5. **Card 13's (iv)** — the ladder readout shows the CROWN's line at rest (`readoutIdx = scrubIdx ?? crown index`; `data-active` on it; the scrub rule + `scrubbed` stay gated on `scrubIdx`; no CSS; the readout stays `aria-hidden`; amend `OddsLadder.test.tsx`) + fuckOffDate.css's D2d comment — stale on FOUR counts (it describes candidate (i) as shipped AND calls the ladder a `<details>` disclosure; the as-built is `<section className="fod-ladder">` inside `.fod-graphs`, no disclosure element; AND its `auto 1fr` / `grid-row 1/-1` rows AND its "when the ladder opens" — it never opens) + the dead `<details>`-era `.fod-ladder__summary::before` (`fuckOffDate.css:313`) + `OddsLadder.tsx`'s two comments that go stale with the build (`OddsLadder.tsx:27-30` "pointer-only…", `OddsLadder.tsx:292-297` "visibility-hidden except the scrubbed one") + the design skill's "on-demand, not on the first frame" clause (architecture §12 wins) + the `h2.fod-headline` aria-describedby GATE ARM on the three REAL date arms (the attribute already SHIPS, `FuckOffDate.tsx:395` — only the arm is owed; reuse the link-and-resolve block inside `assertCaveatOrderAndReach`, and the aged REAL arms datestale / datearrived lack it too; ⚑ narrowed 2026-10-15 b9-toronto3: the arm already runs on `dip` at PHONE (`vertical-fit.spec.ts:1520`) and at 24 px REAL/TIER (`:1617`), so what is owed is the 16 px REAL describes — `dip` (`:1307`), `date65` (`:1365`), `datenc` (`:1412`) — plus the aged `datestale` (`:2060`) and `datearrived` (`:2173`); `datesplit` has no vertical-fit arm at all); the register's "a newly visible node joins the audit" was false (the readout line carries neither `.ct-text` nor `.ct-block__item`) — corrected; THEN the REAL catalog capture (date65 / datenc / datesplit + one live-Chrome scrollbar look) before the column half files durably, and the Caddie chart walk the change owes (Card 1 rides it as its own commit). The a11y gain is for a SIGHTED keyboard-only reader — AT already reaches the crown via the dot's `role="img"` label; do not overstate it in the commit. The rest line is the SHIPPED `ladderMarkAria` crown sentence (two to three lines, the crown's own odds), never the fixture's "9 of 10, your date".
6. **Card 6's three chart-text arms** — the 2026-09-13 evening b9-8 close's mechanism (`084f94f0`, re-verified by the 2026-09-13 late b9-9 pass, `7ee82569`; it builds on the register's ⚑ CORRECTED 2026-09-13 diagnosis — the stagger already seats named moments first — and REPLACES the register's hide / LAST-row rule for (b), which stays the fallback): a crossing-aware stagger — exhaustive assignment over the named items (≤ 5): min rows → min tail crossings (an item's x inside a HIGHER row's box) → min Σ rank×row → the greedy order as tiebreak; unnamed ticks unchanged (row 0 if clear, else hidden); `.ct-block__name` min-height one line so an unnamed item's ages sit on the AGE baseline. BIGGER THAN IT READS: `data-ct-rank` (work-stops — the crown, relabelled on a split — 3, today 2, built + horizon 1) does NOT exist — `ConfidenceBand.tsx` mints `data-ct-item`, `data-ct-optional` and `data-ct-tail`, no rank — mint it from the annotation's IDENTITY in the same red-first commit as arm 2, before the stagger change (NEW unit arms for rank + crossings; `chartText.test.tsx`'s five greedy pins hold under a greedy tiebreak); two arms need measurement `chartTextAudit.ts` does not expose (no tail rect, no `.ct-block__sub` rect — spec-local `page.evaluate`, each new field with its own non-vacuity pin); the "~2 px thin on PHONE" worry was WRONG (corrected 2026-09-27: 82.9 was Today's box MIDPOINT — Today is start-anchored, its tail at 65.1 px, ~19.9 px clear of Work stops' 85; the tightest margin is Plan built's tail at 50.6 vs Today's left edge, ~14.5 px PHONE / ~16.9 FLOOR, derived not measured) — MEASURE before decreeing rows 0 / 1 / 2; arm 3's witness is NOT the 70 / 71 tick (it sits inside Work stops' row-0 box on both arms, hidden by construction once arm 2 passes — pinning it reds whenever arm 2 is green): pin "80 / 81" on FLOOR, accept an empty unnamed set on PHONE, never move the witness to the ungated REAL arm; min-rows stays FIRST in the lexicographic order (AGED_DATE_ROWS / AGED_SPINE_ROWS / `architecture.md`'s recorded counts are downstream). Arms (chart-text.spec.ts, datestale PHONE + FLOOR): tail-vs-box zero crossings · the top-ranked named moment on row 0 · unnamed sub baseline == a named sub baseline on its row; ~55–72 s per datestale arm on the fit harness.
7. **The family's other two primaries** (Tier 2) — the BUDGET half is a three-line delta on the EMPTY face: render the shipped `budgetApplyEmpty` string above `.budget-sheet__actions`, point `aria-describedby` at it (conditional on `nothingToCommit` — a one-line budget with a blank amount is a SECOND reason-less blocked face, `hasErrors`: rule it in or out), guard `.btn-quiet:hover` on `[aria-disabled]` (`intake.css:253-257`, the only such rule); the same `formBody` renders in the intake spend step's inline builder, so the reason shows at rest there too and the door walk never reaches it (the register's "aria: `[disabled]`" is the snapshot spelling — source is `aria-disabled`, `BudgetBuilder.tsx:424`; the blocked press ALREADY announces, `:273`, pinned; the channel is `opacity: 0.55`, not tint — corrected in the entry). The SEQUENCING half is an UNDECIDED fork (block on the applied pick, or the live no-op as the intended calm) — `/council` it before building (a block keys on (policy, order), never the policy alone). Caddie door walk on both — scroll-and-clip frames first (the register's below-fold harness gap) — plus the intake step.
8. **Card 1** — delete the two legend outlines (`band.css` `.band-legend__sw--inner/--outer`) + rewrite THREE comments, not two (band.css's narrative, `BandLegend.tsx`'s header comment AND the `LegendSwatch` JSDoc that claims "the outline-style differences reinforce the three tiers") + the a11y gate (assert, do not re-plumb: the fills are ALREADY source-bound to `BAND_FILL_*` — only "band.css has no outline on the swatches" becomes true after the edit); strike the register's NESTED-CHIP alternative with reason on close (the entry labels no option (a) — corrected 2026-09-27). One visual change, Caddie-read, its own commit — pull it onto whichever chart walk Card 13's (iv) or Card 6's arms owes.
9. **The four-rungs deliverables** — the pbt's RECORDED-LIMIT docblock's WORDS only today ([1001,1250] are SHIPPED mislabelled ladders; the k-lock rung is its own UNRULED entry — moving the pbt boundary before `money.ts` changes reds the two-sided offender arm); the direction-neutral `assertTickColumn` arm (`.band-tick` count === intervals + 1 — `intervals` from `niceLattice` on the parsed ceiling or a per-seed record, never the ticks counted against themselves) + the min / max adjacent-gap EMITTER as recorded distances (insight 065) — EMIT FIRST, then set the crowding floor from the recorded minimum, never pinned at today's densest ladder (the ruling's clause — `borderline` IS the five-interval densest): 16.9 px is DERIVED (13 px × 1.3, `tokens.css`), measured on neither platform, and the register's "seven rungs at 24.2 px must still pass" was unsourced (no band ladder draws seven lines under intervals ∈ {3,4,5}) — WITHDRAWN in the entry; the arm runs on ONE seed (`borderline`) — healthnc joins only after the count + gap arm is split off `assertTickColumn` (its borderline-only non-vacuity guards red on healthnc) and its lattice is RE-MEASURED (measured 2026-09-12 — 39 engine commits ago at 2026-10-15, b9-toronto3; the "17" this line carried was the 2026-09-27 count); no max-gap threshold. These three live inside the CLOSED *Two dollar ladders* entry today — nothing OPEN tracks them: file them as an OPEN Tier 2 entry when the work starts (header count +1), carrying the CLOSED entry's ⚑ VERIFIED 2026-09-27 block.
10. **Card 2's lever (ii)** — MEASURE FIRST (ten minutes — now to CONFIRM, the arithmetic rules it), then decide: `readoutSeat`'s SECOND clause (`chartText.tsx:446` — `min(widest + chrome, cap) + gap ≤ plot / 2`) needs, on the pass's arithmetic (cap ≈ 38 % of the host, plot ≈ 80 %), a host ≥ ~500 px for a CAPPED box, and the PHONE arm's host is 308 px; its "widest" is the widest COLUMN, set by the wrapping range LABEL (~138 px at 13 px on every arm), not the figure — so clause 2 already fails on PHONE and FLOOR today and collapsing the degenerate range cannot flip either (corrected 2026-09-27 from "likely stays FLOW"): lever (ii) would NOT fill the hole Card 2 filed; lever (iii) — his framing, the four-rungs EXPIRY watches it — is the one that reaches the row. If it is built anyway (`composeReadoutLines`, `src/viz/bandData.ts`: `row.low === row.high` composes ages / a "land at" label ← new `bandReadoutRangeSameLabel` / ONE figure): compare `row.median` too (never assume the formatter is monotone — a calm-but-wrong shape if it changes), the new label needs a `BandLabels` field + its wiring + all FOUR test LABELS fixtures, and the red-first arm must assert the degenerate COLUMN's lines (the gate's `maxLines >= 5` guard is a max over columns and proves nothing here); `BAND_SEAT.PHONE` MEASURED, never decreed.
11. **Card 11's (c)** — first DEFINE "the widest delta string": the hero is runtime-formatted by `formatDeltaDollar` (`money.ts`), not a catalog entry (glyph count under the $10,000 step — e.g. eleven glyphs at `$12,340,000`); measure PHONE AND FLOOR (fluid `--text-lg` puts FLOOR ~5 % under PHONE in units per font-px, so the narrowest host is not proven worst); nothing survives in `temp/` (`verify-rv.json` cleared) — the hero's ink has never been RECORDED (the RV audit containment-checks `.rv__delta` on every arm, never at the widest string — corrected 2026-09-27); the only renderer is the RV gate (budget ~3 min an arm on CI on the worker pool: the three arms' Playwright total ran 4.9–9.1 min across the green runs 2026-10-04 → 10-16, runs 38693180201 / 37221659495 — the committed-lockup wait ALONE ran 131–175 s per arm across the four green CI runs `12e40395` re-budgeted from) — plant the widest string on the hero inside the existing arm (the `--ct-ty` plant-and-restore shape) and emit its width, no new pass; then name + pin `HERO_HALF_RESERVE` (`RV_PLOT.left + plotW + reserve ≤ RV_VIEW.w`) with a docblock that says the invariant reduces to `reserve ≤ RV_PLOT.right` (192 u) and is trivially green today — it bounds the "shorten the label column" lever, nothing live; "~151u" is the council's estimate of the WHOLE hero (the half ~75u). ⚑ The LEFT edge is the tighter, unguarded bound (a $0 shorter bar puts gapMid near 153u) — pin it too or name it out of scope; `RV_VIEW` / `RV_PLOT` are module-private (export, or bind by regex as `viewBoxMirrors.test.ts:42` does).
12. Pilot-movable while he is out of the chair: **the forced-colors audit of `src/viz`** (Tier 4 — zero `forced-colors` occurrences in code, never attempted; NOT fully prescribed, corrected 2026-09-27: its premise is backwards in Chromium — the SVG's author paint survives and the HTML backdrop is forced, so the risk is the dark `--ink` marks on a forced-DARK Canvas and the fix is `CanvasText`, not `forced-color-adjust: none` — and it names no instrument; read the register entry's ⚑ VERIFIED block first).
**HIS EYE (a HIM batch — ride one sitting, not a trailing item; it holds only words, framing forks, one-way doors and rendered-surface reads — the 2026-09-30 re-triage moved "the three councils still owed" to the b9-1 NEXT list (2026-10-16 doc audit: that block is pruned — they ride the newest session block's NEXT list, under *the three owed councils*), and two register entries out of Tier 3 to the pilot):** **the step card's surcharge scope** (register *The step card never says what its surcharge covers…* — PARKED 2026-09-27 after three drafts: the shipped unscoped line reads as a data bug at the true price; "drug-plan surcharges" collided with "drug and supplement plans" not counted; "on your drug plan" read as escaping on a $0 plan — the entry carries all three as the brief) · **Card 9** (moved here: the register files it as a PARKED framing fork, owner briggsy, "either way the words are his" — the 2026-09-13 b9-8 list's "every ruling is execute" was wrong on this one; both halves are his words — the refusal's sentence `recHoldUnwitnessable` + its heading, and the one-line reason; NOTE for the build when he rules: the picker has FOUR routes in (the invite, the record card's `onReopen`, the committed + stale re-picks — `Result.tsx`), so the gate rides the PROP, never the invite door alone) · the copy forks in his words (the Roth sheet's three added 2026-09-13) · Card 2 (iii) · the Tier 3 omitted-costs discussion · the NIIT gloss (named in NINE copy strings, not two — `copy.ts` :1142–:1327 + `recDiscNiit` — glossed in none) · Card 1's rendered result / the two ⚑ composition sign-offs (the RV label gutter at 52.3 % of plot run; the date route's bare left column) / the four-rungs taste sign-off (four stays) / the 24 px + 20 px frames / the icon / the hidden actions row at his seat · the 320 build's crown fork (moved here 2026-09-25 from the discharged 2026-09-05 plan — the register's 320 ruling says both its forks are "ranked in `TODO.md`"; the other is Card 2's lever (ii), ranked above): a rung-9 crown seated ABOVE dips its "your date" tell 5–7 px into the plot's top (7.1 / 5.8 / 5.1 px at REAL / FLOOR / PHONE), so a scrub rule at its own column passes behind it — pre-existing, bounded by the marks oracle (4.4 / 3.6 / 3.2 px of ring clearance); clamping the anchor to `PLOT.top` would cost the phone its above seat (40.9 → 35.8 px of headroom against a 36.6 px callout); pilot's lean: leave it, watch it — plus the watch item: at 1536 the ceiling crown misses its above seat by 0.5 px of headroom (~7 px of figure width), so a wider result column would silently seat it above, the shape his eye ruled crowded in another form (`CROWN_SEAT_MARGIN_PX` in `e2e/chart-text.spec.ts` keeps CI stable across it). **The FADING-seed walk is RE-FILED, not walked:** its premise is structural — both routes cut the fan at cohort ≥ 0.5 BEFORE the resolver (`answerView.ts:81` / `:120` → `truncateFanAtThinCohort`) and `cohortFadeOpacity` is exactly 1 at ≥ 0.5, so no RENDERED sample ever fades and the legend's reopen trigger has no referent on ANY seed by construction — the residual needs a new framing (what the mask is for on the drawn fan) before any walk. Frames: CLEARED with `temp/` (emptied at every squeaky). Re-make them on the CURRENT tree before the sitting, and never beside vitest / doc-stats (the load landmine). The fork and sign-off frames (Cards 1 / 2 / 9 / 13, the RV label gutter, the date route's left column, the four-rungs pair on `seed-healthnc`): `CADDIE_TARGETS="seed:retired,seed:date,vault:datestale,solve:surplus,solve:failing,seed:healthnc" CADDIE_RUN=<name> pnpm caddie:walk` (~19 m, into `temp/caddie/<name>/`). The 24 px / 20 px frames: `pnpm exec playwright test --config e2e/held/shots.config.ts council-24px-shots` (~2 m, into `temp/council-24px/`). The icon is tracked (`scripts/icons/preview.png`). The two sibling sheets' blocked / pointed / cleared look has NO tracked instrument (the register's *The Caddie door walk captures no pixel of a scrolling sheet's below-fold cards* is the harness gap). Its only copy is the 2026-09-13 ad-hoc scratchpad harness `%TEMP%/claude/C--Users-brigg-ai-learning-journey-projects-the-back-nine/8269e9f0-120a-4772-a4d3-546bfdc40056/scratchpad/look/look.spec.ts` (port 4197). Hold it first as `e2e/held/sibling-sheets-look.spec.ts`: import from `../reviewSurface`, write to `process.env.LOOK_OUT ?? 'temp/look/adhoc'`, and drop its own config, since `shots.config.ts` collects every held spec. Then run `LOOK_OUT=temp/look/<name> pnpm exec playwright test --config e2e/held/shots.config.ts sibling-sheets-look`.

**The phone strip-reserve fork** (register *The phone intake walk* item 3 — one of the three owed councils, the pilot's since the 2026-09-30 re-triage; ranked in the newest session block's NEXT list, under *the three owed councils*, (b)): the two-block strip measured 278 px =
17.4 rem, Continue lands at y 1,378 on the Social Security step at scroll 0 — a reserve sized for a rare state taxes
every step; a council (his eye only if the council cannot rule it), not a pilot number.

**Closed records (`git log` is the history; the session records that carried these were cut 2026-09-25):** 2026-09-07/08 — the
2026-09-05 plan's builds: the RV gate `c135a99c`, the critic's arms `96e87e0f`, the unmeasured trio `da881de5`, five of six arms
`31cba0fe`, the legend council `2d671144` · 2026-09-10 — the item-4 review `780409f7`; the citation re-anchor `a1eca4e4` · `6bc863fc`
· `026ab3ff`; the 24 px fit-law ruling (council wf_d2b1d05a-001, architecture §12) · 2026-09-11 — the CI partition fix `cba26770`;
the four-faces walk (harness `7aaa84b9`; the card is the cold-read log's 2026-09-11 entry); Cards 4 + 5 `c43eb879` · 2026-09-12 —
Card 4 ruled `9965b09d`; Card 10 `c77bcf24` + `62360933` · 2026-09-13 — the Linux ink `a4030a92`; Card 14 `8f2943b4`; Card 6's
register correction `709834a6`; the sibling sheets' blocked Apply `084f94f0` · 2026-09-14 — the Medicare era `1d49ba22`; the
Medicare cards `17cebce2`; the ACA re-verify + the eyebrow ruling `71fe42c1` · 2026-09-17 — Card 3 `99637c5f` · 2026-09-23 —
"never oversold" `6435cd30` · 2026-09-24 — the era lines `c3684b73`, the basis clause `6d700d26`; the SS thresholds `be0e1e76` +
review `be99027e` · 2026-09-25 — the frozen-nominal siblings + the per-person senior bonus `e04823a4` (the IRMAA sibling refuted and reverted in the same commit); his two rulings `b83bb464`.

> **Superseded hand-offs deleted 2026-09-06 (the doc audit):** b9-2 (2026-09-05 midday — `8a6fc6b7` · `add8dea8`) and b9-3
> (2026-09-05 evening — `32c1231d` · `b4b27a60` · `8748e4f5` · `abf1ab38`). `git log` is the record (the verify digest was cleared with `temp/`);
> every still-open re-verify clause they carried is
> folded into the ranked entry it belongs to (the ⚑ "Folded 2026-09-06" blocks) or the register. This file is the
> ranked queue, not a chronicle — a superseded START HERE is deleted, never kept, and so is a superseded session block:
> the squeaky that writes the next one first moves its landmines into *Operational landmines* and its live items into the
> ranked lists or the register, then cuts it (the 2026-09-25 pass cut every session record older than the newest).

> **Moved to the register 2026-09-06:** the 2026-08-14 recovery walk's four open findings and the 2026-08-20 desktop
> intake walk's four open findings (both Tier 3 — his words), and the advice-not-taken semantic-witness record (the
> record-card entry). The no-solve drive recipe moved to "Driving the app" below.

---

## Dated — these fire on a clock

| Fires | What | What breaks |
|---|---|---|
| ~~NOW~~ | ~~NC FY2025-26 revenue certification~~ | ✅ **CLOSED 2026-08-02** — S.L. 2026-41 § 44.1(a) enacted the rate schedule *and* struck the trigger rows the certification fed. Withhold lifted, checkpoint retired. |
| **CI: ~2026-11-19 00:00 UTC** · **runtime: 2026-11-20** | ACA rolling window (`verifiedOn: 2026-10-20` + `maxAgeDays: 30`) — ✅ the 2026-10-20 pass CLEARED it (four primary-source legs + the pilot's own re-fetches: §36B read live at `/119-121/`, both clauses still bounded "before January 1, 2026"; the law ceiling 119-124, all six laws above 119-118 matched by bill number and swept clean; the three §36B vehicles unmoved on the 2026-10-19 calendar; both Rev. Procs byte-identical; the Treasury/IRS 2026-10-15 PTC proposed rule writes the 400 % cap as operative law; two new referral-only vehicles, H.R. 10730 and S. 5496; the record's forwardClock carries the next probe order) · the one must-pass cliff stands: Pub. L. 119-103 §106(3)'s **December 11, 2026** (no new CR; the Senate resumes business 2026-11-09) | **TWO dates, and the split is DELIBERATE — one date here was wrong (corrected 2026-08-14).** `verify:aca` compares float-ms so it reds ~a day EARLIER than the runtime clause's integer-epoch-day compare; `oracleToken.ts:176-178` records that ordering as the safe one. **And it is not only CI:** `evaluateAcaFreshnessClause` (`oracleToken.ts:191-201`) is a RUNTIME clause on the user's own browser clock — once overdue the shipped app WITHHOLDS the recommendation for any household carrying an ACA enrolled premium, and `healthSheetChrome.ts:287` flips the health-sheet status line. No deploy required. Clearing it is the 10-step `howToClear` ((9) added 2026-09-14, (10) 2026-10-05) (~1h, primary sources, both attest tables hand-RE-TYPED from the PDFs — never from `health.ts`, that bind goes circular) |
| ~~**2026-10-19**~~ | ~~GitHub's `ubuntu-latest` → Ubuntu 26~~ | ✅ **DEFUSED 2026-10-08 (b9-1)** — the dry run on `ubuntu-26.04` (run 37857970818) proved the break: Playwright 1.60.0 cannot install Chromium there ("does not support chromium on ubuntu26.04-x64"; support arrived in 1.61.1). Fixed the same evening: Playwright 1.60.0 → 1.63.0 (`2545d3e9`), the full gate green on `ubuntu-26.04` (run 37864060784), and both b9 jobs now PINNED to `ubuntu-26.04` (a `runner` input on `workflow_dispatch` proves the next image first) — the register's CLOSED Tier 4 entry *CI is pinned to `ubuntu-24.04`…* is the record. The four other monorepo workflows stay on `ubuntu-latest` — none installs Playwright |
| **2027-07-15** | PA + FL `nextDue`, `state-tax-pa-last-verified.json` / `state-tax-fl-last-verified.json` (annual drift cadence) — **the roster's real deadline: it fires 18 days BEFORE NC's** | `pnpm verify:state-tax` reds → CI red |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-08-01 00:00 UTC** (2027-07-31 20:00 ET) | SS spousal-rate annual re-verify — `src/engine/constants/__tests__/spousalRate.reverify.tripwire.test.ts` (`LAST_REVERIFIED` 2026-08-01 + `REVERIFY_WINDOW_MONTHS` 12; fires one day BEFORE NC) | the suite reds → CI red. Clear it by re-reading POMS RS 00202.020 / RS 00615.201 A.1 against 42 U.S.C. §402(b)/(c), then set `LAST_REVERIFIED` to the date the source was opened — never just bump it |
| **2027-09-01** | Medicare-cost-trend re-pin — `src/engine/constants/__tests__/medicareTrend.reverify.tripwire.test.ts` (`reportEdition` 2026) | the suite reds → CI red. Re-pin `medicareCostTrend` to the 2027 Trustees Report (Table V.E2 + II.D1 + III.B12 + §III.D) under a NEW vintage (the `part-b-trend` staleness clock then fires on saved vaults by design), bump `reportEdition` + the constants.shape pin + the DND-012 fixtures, then move the tripwire forward |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` / `WORKING_YEARS_YEAR` roll | ✅ **ARMED 2026-08-02** — `annualRoll.tripwire.test.ts` reds the suite (both arms mutation-proven). Clearing it is a **re-sourcing job, never a date bump**; `scaffold.smoke.test.ts:10-14` + `constants.shape.test.ts` red alongside by design |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the aged tone calls (the four filed + the aged date band's three-row block, 2026-09-07; + the aged relief line's words, the register's Tier 1 *On a plan reopened in a later year the relief line names no assumption…*, 2026-10-16) are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |
| **2034-08** | NC's successor flip event — the Office of the State Controller's FY2033-34 final accounting (trigger $40,258,000,000 → TY2035, 0.25pp step, 2.49% floor) | Nothing breaks; it is the only mechanism left that can move NC's rates, and it can only CUT |

⚠️ **The ACA deadline is a ROLLING window, never an absolute `nextDue`** — grepping `nextDue` to inventory
deadlines silently misses it. It has been filed a notch late twice, both times in the unsafe direction. The four wall-clock tripwire tests (`git ls-files | grep tripwire` — annualRoll, irmaaTopTierReindex, medicareTrend.reverify, spousalRate.reverify) carry no `nextDue` either; inventory them by that grep.

⚠️ **The priced roster reds in TWO waves, not one** — same ANNUAL cadence, different dates: each record's
`nextDue` is its own verification's anniversary, and `scripts/verify-state-tax.ts:120` loops `PRICED_STATES`
judging each against its own date (`:104-112`), so PA + FL red 18 days before NC. The gate prints every
state's `next due` on each run (`:141-143`), so a red build is never ambiguous — the gap is in PLANNING:
schedule the July pass, or the first thing that tells you is a blocked build.

---

## Next, in priority order — the 2026-08 tiered list (pre-D7: re-sort each item under D7 when it is reached)

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
   `intakeMap.ts:352-372` (`escalateQuote`) builds both the enrolled premium and the SLCSP benchmark from
   `acaAgeRatingCurve` factors alone — **no cost-trend term**. Part B was fixed for exactly this reason;
   `oracleToken.ts:112-133` writes the argument out (*"disclose-and-ship is FORBIDDEN — a disclosure fixes
   a number, never a mis-ranking"*). The same argument holds at the 400%-FPL cliff, where the household
   eats the full premium. The token has an ACA **legislative freshness** clause and **no ACA pricing-mode
   clause**.
   ⚑ **Audit corrections 2026-08-02 — three anchors were wrong and the fix shape is NOT Part B's:**
   (a) `healthOverlay.ts:305` is a **closing brace**, not a consumer; the real seam is `taxOverlay.ts:2463` plus `taxOverlay.ts:2591-2598`
   → `healthOverlay.ts:279`. (b) `copy.ts:1209` (`healthFactMedicare`) is a Medicare eyebrow; the strings that claim
   the coupling is priced are **`copy.ts:1170-1173`**. (c) the excess-APTC field moved to
   `aca-last-verified.json:43` (was `:21`) and `scripts/verify-aca-status.ts:40-103` declares and REQUIRES the key
   (`adjacentButSharp` at `:90`, `needProse` at `:169`, since 2026-08-03) — **the gate is presence-only**: nothing checks that the prose models the uncapped clawback.
   ⚑ **STRUCTURAL — this is why it isn't a Part B copy-paste:** Part B's schedule is built INSIDE the
   engine, which is why the oracle token can witness it. The ACA escalator lives in **intake**
   (`intakeMap.ts:352-372`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto
   intakeMap would be the exact lying-mirror `oracleToken.ts:114-122` warns about. The honest fix moves the
   schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1974`).
   ⚑ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver
   block would hold for months over the whole pre-65 population.
   ⚑ **2026-08-03 double-blind — the pricing defect is REAL and confirmed; the near-term copy move as filed
   was WRONG THREE WAYS.** (a) *"stop claiming the coupling is fully priced"* — **the coupling IS fully
   priced.** A conversion enters `nonSSordinary` → `acaMagi` (`healthOverlay.ts:104-106`) → `slidingScalePtc`
   → net premium, in both preview arms. The fault is the **closed "Not counted here:" list** omitting the
   held-price modeling choice, while the sibling health-sheet list ONCE named the benchmark — struck 2026-08-03 as FALSE in
   both lists (`copy.ts:1302-1315`); what is genuinely unmodelled about it is the COST TREND (`copy.ts:1317-1319`). (b) *"priced real-flat"* **understates what IS modelled** — `escalateQuote` climbs with the
   age-rating curve (0.765 → 3.000 at 64). Only the **cost trend** is missing; the schedule is not flat, so
   **do NOT borrow `verdictResidualTail`'s "held flat in today's dollars"** — verbatim it is a NEW false
   claim on this surface. (c) the editable strings are **`copy.ts:1171` and `:1173`** (the key names sit one line
   above), and both must move together.
   ⚑ **The direction claim must be CLIFF-SCOPED, never blanket.** `healthOverlay.ts:231`+`:303` give
   under-cliff net = `enrolled − slcsp + contribution`, and `intakeMap.ts:727-728` scale **both** streams by
   the same `escalateQuote` factor — so under the cliff a missing trend is **zero** when E=S
   (`devSeeds.ts:658-659` = 4200/4200) and **reversed (pessimistic)** when E<S, which `copy.ts:231` invites.
   It bites one-way optimistic **only over the cliff** (`healthOverlay.ts:308-312`, full enrolled premium).
   The shipped sibling `recDiscAcaSlcsp` (`copy.ts:2323-2324`) hedges bidirectionally on this exact fact and
   `medicare-pricing-build-spec.md:43` bans the false unidirectional. Draft to append to BOTH strings:
   *"One modeling choice: these prices step up with your ages, not with the way plan prices themselves climb
   — so a conversion that crosses the income line could cost more than shown."*
   ✅ **BOTH XS WINS SHIPPED 2026-08-03** — the clawback gate (`a436caee`) and the false negation
   (`bd851f24`). The gate turned out to be **seven** undeclared fields, not one (`discriminatingProof`,
   `nothingEnactedChain`, `pendingExtension`, `retroactivity`, `adjacentButSharp`, `forwardClock`,
   `strickenCitations`) — all now declared + required, with array arms that reject `[]` (truthy) and
   blank links; mutation-proven against the shipped record. And `copy.ts:1321` / `:1327` no longer list the
   benchmark premium as uncounted — it is the §36B PTC basis. **What REMAINS open here: the
   cliff-scoped disclosure sentence, and the withhold-vs-disclose fork below.**
   <details><summary>the two shipped XS entries</summary>

   - **Make the clawback field bite (XS, 4 touches).** `adjacentButSharp` appears ONLY at
     `aca-last-verified.json:43`; `AcaRecord` (`scripts/verify-aca-status.ts:40-72`) never declares it and
     `checkAcaStatus` (`:77-130`) never reads it — **inert prose, confirmed twice.** Declare the key after
     `:71`, push an emptiness problem after `:117`, add it to the `base` fixture at
     `scripts/__tests__/verify-aca-status.test.ts:13-37` (else `:52`'s `toEqual([])` reds), add the
     emptiness arm mirroring `:72-80`. ⚠️ **The "no `.github/` exists so `verify:aca` is local-only"
     clause this line used to carry was FALSE — corrected 2026-08-14.** CI exists and runs the FULL
     gate; the scoping error was looking inside `projects/the-back-nine/` when the git root is
     `ai-learning-journey`. See the CI note under "Standing cadences".
   - **A false negation on the health sheet (XS).** `copy.ts:1159/960` list *"the benchmark premium itself"*
     under "Not counted here" while the entered benchmark **is** priced (`intakeMap.ts:728` →
     `healthOverlay.ts:222-232`) — the same false-negation shape O16 fixed on the Roth strings.
   </details>

   ⚑ **The open fork is his, and it is not the copy.** The Medicare council's standing law
   (`oracleToken.ts:119-120`) is *"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a
   mis-ranking,"* written about exactly this shape. Does the pre-65 Marketplace population get the
   conversion ranking **with** the new disclosure (what the BLOCKED-ON-RESEARCH tag silently assumes), or
   does the token gain an **ACA pricing-mode clause** that withholds the ranking — as Medicare's did — until
   a sourced trend lands?
   ⚑ **2026-09-04 anchors + two unfiled facts:** `escalateQuote` is `intakeMap.ts:352-372` (not `:271-291`);
   the "Not counted here" pair is `copy.ts:1142` / `:1147` (not `:895/:897`) and the surface is SIX strings
   (`copy.ts:1142`, `:1147, :1161, :1163, :1171, :1173` — selected by `composeRothOmissionsNote`'s 2×3 matrix, whose
   ACA-priced arm already AFFIRMS the subsidy is counted, so a trend sentence must reconcile with that
   affirmation, not append to it) + the two health-control siblings (`copy.ts:1321`, `:1327`), which CANNOT take it
   (gated on `statePriced` alone — `copy.ts:1313-1315`). Unfiled: `shadowRateHeadroom` (`copy.ts:3235`)
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
   Pricing is membership-keyed at `taxOverlay.ts:1630`; `PRICED_STATES` is `constants/stateTax.ts:50`; the
   flip is pinned live at `optimalityOracle.test.ts:295-306` (NC crowns the 12%-top anchor, the state-absent
   twin the 22%-top). Correction (a) is **half-stale** — the `state-certification-pending` WithheldReason
   (`oracleToken.ts:48`), its humane string (`recommendationView.ts:364-365`) and the whole *held* card
   still ship and are tested; only the **live trigger** is gone, so a new arm is an addition, not a build.
   Correction (b) is **confirmed exact**: `mintOracleToken` has one live call site (`solveEntry.ts:232`),
   reached only via `engineApi.runSolve`; `engineApi.run` (`engineProtocol.ts:423` — headline/confidence)
   and `runDateSearch` (`:458` — the date) mint **no token**.
   ⚑ **The no-income-tax premise is FALSE for 5 of the 8, and it adds 7, not 8** — the register entry
   *Unpriced states — a confident winner computed with zero state income tax* carries the state-by-state negative.
   ⚑ **Real costs the partial omits.** `verify-state-tax.ts:120` loops `PRICED_STATES`, so **every state
   added is a new annual red-build gate with its own `nextDue`** (FL already carries one). Per state:
   `model.ts:319` STATE_ROSTER · a sourced(0) constants entry + profile · `copy.ts` `stateOption<X>` +
   `verdictResidualState<X>` (the THREE exhaustive switches at `stateTaxDisclosure.ts:52-63`,
   `stateTaxDisclosure.ts:93-104` (the standalone note, Card 4) and `stateTaxDisclosure.ts:172-181` fail
   `tsc` until written) · `recommendationView.ts:344-348` · the intake picker **4 → 11 vertical arms**
   against `verify:fit`. Engine cost is genuinely near-zero (`stateTax.ts:163` structural early return).
   ⚑ **The filed "every saved vault decodes Corrupt" blocker is FALSE — do not act on it, and do NOT loosen
   the compile tie.** `_V3FieldsCover` (`model.ts:2650-2652`) covers only `keyof ScenarioV3`;
   `checkStateTaxVintageV3` (`scenarioCodec.ts:558-563`) is hand-written and compels no `needString`. Safe
   because `scenarioCodec.ts:799-800` gates `retirementState` via `needVocab(STATE_ROSTER)`, so no
   pre-widening vault can *be* a household in a newly-priced state. The prescribed remedy — loosening
   `stateTax.ts:429-433` — would **re-open the exact hole that tie was minted to close** (`:424-428`).
   ⚑ **His call, sharpened:** does the refusal reach the **headline + date** (`engineProtocol.ts:423`/`:460`)
   or stop at the strategy? Gating only `solve()` leaves a state-blind first answer for everyone off the
   roster; gating all three blanks the product's magic moment for **~86% of US households**. Widening to the
   no-tax seven moves coverage ~14% → ~27%, of which **Texas alone is two-thirds** — so *which of your
   friends' states actually matter* may make the fork moot. Landmines for the refuse arm: insight-081's
   degenerate overlay ($0 portfolio) builds no overlay and would read as unpriced (**false refusal**), and
   the state step is deliberately **non-blocking** (`questions.tsx:596-602`), so refusing on ABSENT walls
   every household that skipped it.
   ⚑ **2026-09-04:** "no token on the headline/date" is TRUE; "no honesty gate at all" would be FALSE — a
   state-tax disclosure already renders on both first-answer surfaces (`composeVerdictMedicareResidual`,
   `stateTaxDisclosure.ts:45` → `ConfidenceStatement.tsx:501` + `FuckOffDate.tsx:428`; off-roster arm
   `copy.ts:1390` "State income tax isn't priced yet…"). ✅ **The GATE gap this block named is CLOSED
   2026-09-11 (Card 4):** the residual still rides `medicarePricedNote` (`healthSheetChrome.ts:681-686` —
   Medicare-priced AND no health door), but the clause no longer depends on it — `composeVerdictStateNote`
   (`stateTaxDisclosure.ts:86`, home #6) renders it STANDALONE (`.cs-state-note`) on both routes wherever the
   residual is withheld, so EVERY verdict — pre-65 and health-door included, the fuck-off-date audience —
   reads exactly one state clause, priced or unpriced; scope the roster fork against disclosure-everywhere,
   never against a silent pre-65 cohort. A THIRD token-less lane exists: `runTwoArm` (`engineProtocol.ts:476`, the U10 control
   preview), gated by copy only. Anchors: `stateStep` `questions.tsx:596`, `fields: []` at `:603`, the
   retired twin `:593`.

4. ✅ **SHIPPED 2026-08-03 (`bd851f24`) — the record card no longer implies the household acted.** What remains — naming the strategy (his ruling) and the advice-not-taken semantic witness that has now missed three times — lives in the register entry "The saved-record card does not name the strategy".

5. **Smaller, each self-contained** *(all four re-anchored by the 2026-08-02 audit)*:

   - **Post-65 non-qualified HSA money is silently forfeited.** ✅ The false *"(conservative, disclosed)"*
     claim at `healthOverlay.ts:912` is **corrected 2026-08-02** — it now says the direction is safe but
     the disclosure does **not** exist, and asks whoever adds it to fix the comment in the same change.
     **The disclosure itself is still OWED** (candidate home: the new "What this leaves out" section below).
   - **Account balances have no magnitude sanity rule** while spend and PIA each got one (real range
     `sanity.ts:66-89`). ⚑ **Size is M, not S, and a ceiling is the wrong instrument:** a 10× slip on
     $500k is $5M — a perfectly coherent household, so no threshold catches it. The shape that works is
     **one confirm on the household TOTAL** at the accounts step (the figure the engine actually consumes),
     reusing the running total already rendered at `copy.ts:2469` / `questions.tsx:1106-1108`.
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
     `:742`, footer `:748` (2026-10-16 doc audit: these four are the 2026-08-03 numbering, never
     re-anchored — the live ones are the ⚑ 2026-09-04 re-anchor bullet's below). **It is NOT data-only** —
     `METHODOLOGY_DISCLOSURES` rows render *inside* section
     a's single `<ul>` (`AssumptionPanel.tsx:706-738`), so an entry there lands in "On your behalf". A third
     section is **~18 lines of new JSX** mirroring `:570-574`, + 1 heading and 2 line keys in `copy.ts`'s
     `assumption*` block (hedge/verdict-EXEMPT at `copy.ts:1463-1474`; avoid `copyGuard.ts:255`'s
     `/(tap|draw|pull) … hsa/`), + **no CSS change** (`.ap-section*`/`.ap-row*` are generic). **Fit is safe
     and gets safer:** the panel scrolls (`sheetShell.css` `.control-sheet` 88dvh/94dvh, `overflow-y:auto`)
     and the fit gate's panel arm (`vertical-fit.spec.ts:1734-1763`) asserts only that the dialog box fits
     **and** `scrollHeight > clientHeight` — content growth makes the second assertion *more* true.
     ⚑ **The drafted HSA sentence would have DENIED the very forfeit it discloses — do not ship "stays
     put" / "simply sits."** The balance is not parked, it is **destroyed**: `taxOverlay.ts:2687-2688` sets
     `buckets = EMPTY_BUCKETS` (hsa: 0) → `simulate.ts:2307` `terminalHsaReal = 0` →
     `objectiveHeadline.ts:62` bequest contribution **$0**. On the exact path the sentence names, the HSA
     adds nothing to the leave-more dollar the reader sees. **The sentence must say the balance is DROPPED.**
     ⚑ **Sweep BOTH stale comments in the same commit** — `healthOverlay.ts:912-915` (which says
     fix-or-it-re-rots) **and** `taxOverlay.ts:2678-2680`, which still calls post-65 HSA-as-ordinary-income
     *"a DISCLOSED non-feature, the survivor-SS class"* — the same false claim, in the file that **owns** the
     mechanism.
     ⚑ **The genuine ruling here is scope, not wording** (tone is Caddie-chair under the batched-oracle law):
     **NIIT is not homeless** — `recommendationView.ts:101` emits it on *every* committed recommendation
     (rendered `RecommendationSurface.tsx:541-549`) and `controlHealthOmissionsNote` carries it on the
     Healthcare sheet. So: ship the section with only the two genuinely-homeless items (HSA forfeit + LTC),
     or make the panel section NIIT's canonical home and prune the other two — the repo's own
     one-honest-home-per-fact law (`healthSheetChrome.ts:677`) forbids a silent third.
     ⚑ **2026-09-04 re-anchor (drifted AGAIN, +62/+101 in a month) + four traps the build must clear.** The
     panel is `src/intake/AssumptionPanel.tsx` — section a opens `:572` / closes `:740`, section b `:743` /
     `:851`, footer `:857`, the disclosures map `:533-565`; the `assumption*` prefix law is
     `copy.ts:1463-1474` (keys `:1475-1709`); the panel fit arm is `vertical-fit.spec.ts:1734-1763`;
     `sheetShell.css:34-35`/`:94`; the overlays are `src/engine/healthOverlay.ts:911-915` and
     `src/engine/taxOverlay.ts:2677-2680` (there is no `overlays/` dir). NIIT's two homes confirmed
     (`recommendationView.ts:101` unconditional; `copy.ts:1320-1321`) — the scope fork is self-resolving:
     HSA + LTC only. TRAP 1 — `Row` REQUIRES a `seat` from the CLOSED 22-member `AssumptionSeat` union
     (`AssumptionPanel.tsx:139`, `assumptionRegistry.ts:41-65`): a leaves-out row is a hand-rolled
     `<li className="ap-row">` or a registry extension — "mirror the section" yields only the shell.
     TRAP 2 — a heading literally "What this leaves out" that names two items is ITSELF a completeness claim
     the constants falsify (`health.ts:72/:112/:120/:135/:319` declare four more OUT-but-disclosed facts) —
     scope the heading or name them. TRAP 3 — the HSA sentence must be true across ALL THREE zeroing
     branches (`taxOverlay.ts:2686-2692`, `:2706-2711`, `:2835-2838`): on each, EVERY bucket is zeroed
     because the path DEPLETED, so a bequest-framed sentence ("dropped from what's left to your heirs")
     names a state the engine cannot reach; the honest harm is that the plan is COUNTED AS HAVING RUN OUT
     while HSA dollars remain unspent (understated survival), because HSA outflow is qualified-medical-only
     and the general draw cannot name the bucket. "Dropped" is guard-safe; "draw … HSA" reds
     `copyGuard.ts:255`; `FALSE_CERTAINTY_INTERNAL` (`copyGuard.ts:148-157`) is universal and
     non-suppressible — "can't run out while the HSA lasts" reds. TRAP 4 — `verify:doc-stats` reds on ANY
     added test until README `:82` + roadmap `:165` move in the same commit. Sweep THREE comment spans (the
     `healthOverlay.ts:912-914` "a sweep found NO user-facing disclosure" clause becomes false the moment the
     section ships — rewrite the whole `:900-909`). Caddie walk before "shipped".

   ⚑ **CLOSED AS PHANTOM — the date-route ACA clock does NOT over-alarm.** The date route simulates all 11
   offsets (`dateSearch.ts:608/450/457`) and candidate Y=0 carries the base ACA stream **ungated**
   (`healthcareStreams.ts:181` → `windowStart = 0`, so the window gate is a pass-through). So
   `exposure.aca === 'priced'` *proves* the ACA tables were consumed — the clock is load-bearing, not
   spurious. ✅ **THE TRAP IS DELETED 2026-08-02.** `stalenessExposure.ts` no longer prescribes
   "re-derive against the CROWNED offset" — that arm would have **silenced** the ACA clock for exactly the
   household whose crown a subsidy flip moved (insight 103's shape, for the THIRD time in that one
   comment). The file now records the sweep argument and keeps only the sound arm: **per-clock attribution,
   so the ACA line can withdraw without taking the tax and Medicare lines with it** — which requires
   `rulesMoved` to stop being one OR-collapsed boolean. Nothing here is urgent: the residual over-alarm is
   bounded and knowingly accepted, and the clock is load-bearing.

6. ✅ **SHIPPED 2026-08-03 (`2652b7a6` + `94ea8d00`) — the hero is measured against the household's OWN plan, on both coupled tax controls.** Proven at the engine seam; the runtime semantic witness is the same register entry as 4.

### Tier 1 — the differentiator does not land

7. ✅ **SHIPPED 2026-08-05 (`db371655` + the ladder fix) — the recommendation names the plan.** One increment left:
   ⚑ **THE ONE INCREMENT LEFT: the no-change register still does not name the plan.** A household on
   `?seed=health` + pay-less-tax reads *"You're already on one of the strongest paths we tested"* and
   never learns WHICH path. Deliberately out of scope: the proof above holds only in ACTIVE, so the
   no-change arm needs the `custom` branch (with a THIRD ui bucket map — `SequencingControl`'s is
   intake-private and `reentryChrome.ts:70`'s points at different strings) and different words, since
   `mode === 'no-change'` is NOT "the winner is the plan you run" (it also fires on a seed-B display
   inversion and a $0 collapse). **No seed produces a `custom` winner**, so that branch would ship
   unwitnessable — mint the seed first or leave it.

8. **The whole still-working audience gets no strategy — silently.** `Result.tsx:532` gates
   `RecommendationSurface` off for the date route entirely and `Result.tsx:395` gates the invite door. The
   `blocked{spine-unready}` note that would explain it lives *inside* the gated-off component, so a working
   couple sees the date answer and **zero words** about strategy. `Result.tsx:368-370`'s comment now records the
   opposite (corrected 2026-09-04): the builder's `spine-unready` refusal does NOT cover the date route, so no note is minted there at all.
   ⚑ **THE FILED "CHEAP INTERIM" IS WRONG — do not execute it.** Dropping the `!isDateRoute` gate at
   `Result.tsx:532` alone renders an **empty `<div>`**, not the refusal: the note is not reachable on that path. And
   reusing `recommendSpineUnreadyNote` would tell a household with a **complete** answer that its answer is
   incomplete — a new false claim, worse than the silence. The honest interim is a **route-true one-liner**
   admitting the v1 limit in its own words, seated and re-measured under `verify:fit` (~89px headroom).
   **Briggsy blesses the words.** Full parity stays council-sized — the crowned offset lives in the
   committed answer, not the draft, and anchoring candidates at a future retirement year is a real ranking
   question.
   ⚑ **2026-09-04 anchors:** the gates are `Result.tsx:532` (surface) and `:395` (the invite conjunct; door
   `Result.tsx:604-612`); a THIRD exclusion kills the record card at its producer (`IntakeApp.tsx:287`). Strike
   "~89px headroom" — that is the SPINE idle frame's figure; the date arms of `verify:fit` assert ORDER + REACHABILITY only — never fit
   (spec header `vertical-fit.spec.ts:22-23`). `Result.tsx:368-370`'s "covers the date route honestly" comment was FALSE (never
   minted there; a route-flip render is dropped) — swept 2026-09-04. A crowned-offset params builder ALREADY
   exists (`buildControlPreviewParams`, `intakeMap.ts:1221-1230`), so parity's base shape is not from zero.
   Build shape: the ⚑ Folded 2026-09-06 block directly below.
   ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 6, the date-route one-liner) — its 2026-09-04 re-verify clause, still live:** Date-route one-liner (S) via a Caddie card — words must be true on all FOUR date-hero framings
   (anchor on WORK STATUS, never "a date ahead of you"); the one token yours: does it promise parity.
   ⚑ **2026-09-04:** the framings are no-date · now (today/arrived) · past · future (`heroLead`,
   `FuckOffDate.tsx:192-211`; the split household's floor line has its own six arms, `:218-247`). Seat =
   the else-arm of the `Result.tsx:532` gate, gated ALSO on `focusKey !== undefined` (else it prints beside
   the non-answer strip on an inputs-incomplete date frame); CSS in `fuckOffDate.css` — NOT
   `confidence.css`, the date grid is its own (`:238-254`) and its first free cell is r3c1 above the
   protected disclaimer; the key lands in verdict scope through the `fuckoff` substring net
   (`copyGuard.ts:73`) so free-numeral bites — no bare digit. The date arms of `verify:fit` assert ORDER
   only (only `dip` + `datenc` carry the exhaustive doors-last sweep) — add a presence pin to the `?seed=dip`
   describe and measure the vertical cost by hand. The line must also be true on the route-FLIP frame: a
   committed rec whose spouse un-retires lands `stale` (not `blocked`) and the gate drops the stale card's
   own re-open door with it. `Result.tsx:368-370`'s "covers the date route honestly" comment was FALSE —
   swept 2026-09-04.

9. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
    `solveDispatch.ts:102` returns `'no-pretax'` when no *conversion* candidate survives — but a
    conversion-free candidate survives for **every entry in `SEARCHED_POLICIES`** (`candidates.ts:651-657`),
    and `solve.ts:504-509` already implements that exact partition for the trend-blocked case.
    ⚑ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:185-192` mint-fails the
    roster *before* `solve()` runs, and `rankingStability.ts:247-255` knows only a conversion-**amount**
    perturbation. So dispatching the sequencing-only field would surface `mint-failed{roster}` **live** —
    the exact state `solveDispatch.ts:91` forbids in its own comment. Making it real needs a second
    validation law (a sequencing perturbation) under every shipped recommendation, which is a one-way door
    on what "validated" means.
    ⚑⚑ **The "cheap copy fix" is itself a TRAP (found 2026-08-02)** — the register entry *Modest pre-tax
    household refused a withdrawal-order answer the engine could compute* carries the negative.
    **Briggsy's words, or ship the engine half first.**
    ⚑ **2026-09-04 anchors:** the described arm is `solveDispatch.ts:102` (`:89` is the separate no-tax-overlay
    arm; `~:79` was mis-pointed at filing — the file is untouched since 2026-08-14); the refusal string is
    `copy.ts:2087-2088` with its three-rewrite comment `:2064-2086` (`:1931-1935` now holds an unrelated
    save-refusal block).

10. ✅ **SHIPPED 2026-08-14 (`2816d036`) — the heir bracket is the household's now.** Register Tier 1 records the closure and the three swept comments.

### Tier 2 — what breaks on someone else's device

11. **The surfaces a friend actually hits have never been walked or cold-read by anyone.**
    ✅ **PARTLY CLOSED 2026-08-14** — `RecoveryFlow`, `RestoreFlow`, ColdStart, Unlock and the Backup/
    Export ceremony have now been walked end-to-end at 1536×791 and 390×844 (the open findings moved to
    the register 2026-09-06 — *The 2026-08-14 recovery walk's open findings*). ✅ **THE REST CLOSED 2026-08-20 AT DESKTOP** — the full organic intake (ColdStart →
    every step incl. Accounts, a real mixed household typed in by hand) and the first-Save ceremony
    (passphrase + recovery word + backup + success frame) walked end-to-end at 1536×791; the open findings moved to
    the register 2026-09-06 (*The 2026-08-20 desktop intake walk's open findings*). ✅ **THE SAME INTAKE WAS WALKED AT 390×844 on 2026-09-04**
    (the pilot on the Playwright MCP, filed in `8b056397`) — its fifteen defects + two copy items, and each one's build status, live in
    the register (*The phone intake walk (390×844, 2026-09-04)*).
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
    household (up to **14** steps — 8 unconditional + 6 gated, `questions.tsx:1366-1391`) if the
    reader confirms the dialog, because nothing is written until Save (the D1 law; a plaintext
    draft outside the vault is a security-posture ruling, never a build) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:581` refuses anything but
    v3, and the brick runs in the LEGACY direction: a v4 blob is caught honestly upstream
    (`scenarioCodec.ts:998` → `unlockNewerVersion`), but the moment a future build writes v4, today's v3
    vaults fall into the arm v1/v2 sit in now — decode-ok, then "That didn't work. Try again." over a
    reload that cannot succeed (`IntakeApp.tsx:686-703`) — and their backups fail identically (same bytes,
    `backup.ts:84-93`) · there is **no way to delete the vault** (`clearVault` exists; its only PRODUCTION
    caller is the dev seed planter, `devSeeds.ts:1969` — eight test/e2e files also call it).
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 9 — the aged note, the v2→v3 ladder, the leaves-out section) — its 2026-09-04 re-verify clause, still live:** Aged-window disclosure note (S; the ranking fork stays yours, three arms with corrected costs, due
    before 2027-01-01) · migration ladder scaffold (S; the honest legacy state names NO remedy — the
    backup carries the same bytes) · HSA-forfeit + LTC "What this leaves out" section (M; pilot per the
    register — the queue's owner call is the account-total confirm only).
    ⚑ **2026-09-04, each re-scoped:** (a) THE AGED NOTE IS NOT PILOT — the register's *The aged surface* entry (its crowned-window build-year anchor bullet) rules "Do NOT fix this in
    copy" and both nearest register entries — *The aged surface — every 2026 plan changes wording on 2027-01-01, unreviewed* and *Unscored Caddie tape rows plus the four aged-surface tone calls due before 2027-01-01* — are owned **briggsy**; neither is a copy fix; the "three arms with
    corrected costs" existed NOWHERE — they are now written, with sizes, under the register's "The aged
    surface" entry. A shipped copy defect on the SAME cohort WAS pilot and is FIXED (2026-09-04: the singular arm ships at
    `copy.ts:3139-3141` under the NUMBER AGREEMENT post-mortem at `copy.ts:3125`, covered by `copyGuard.test.ts:921`):
    `rothPlanRanked` hardcoded the plural "Those years are counted from…" after a correctly-singular "for 1 year" —
    live for any at/past-RMD household on an aged vault (the 1-year clamp, `solveAnchor.ts:263-264`) — and no test
    covered `years: 1, passed: true`. (b) THE LADDER is register `L` · **pilot**, and the v2→v3 ALGORITHM IS
    PRESCRIBED: `model.ts:1673-1675` mints synthetic entered accounts from the old aggregates "so the ladder
    stays total"; the write primitive exists (`db.ts:231 rewriteModel`, pinned `db.test.ts:180`); today's
    ladder is decode-and-return with NO migrate step (`scenarioCodec.ts:981-998`), and a v1 vault survives
    every store seam on real IndexedDB (`e2e/vaultHarness.ts:21-22`) to die only at `IntakeApp.tsx:581`.
    Two new defects ride with it: `session.ts:464-468` claims the writer and UNLOCKS before the version is
    judged (the recovery path claims unconditionally, `:539`), and `backup.ts:209-213` LANDS a legacy backup
    on a clean device and only then dead-ends. Size M–L, not S. His word narrows to the TERMINAL arm's
    sentence (v1, or a genuinely unmigratable shape) — and "legacy" already means "a v3 vault missing
    additive-optional fields" (`staleness.ts:27`, `resultSave.ts:146`), so the new reason must not reuse it.
    The docs that called the refuse-ladder "the migration ladder" were swept 2026-09-25 (architecture §7.3,
    product R39, roadmap R39 trace, plans/3-controls; plans/1-engine and the roadmap U4 row earlier) — re-word
    them again only when the ladder is actually built.
    (c) THE LEAVES-OUT SECTION is pilot (register *Post-65 non-qualified HSA money is silently forfeited* and *Long-term care is neither modeled nor listed as left out*, both **pilot**); anchors + the four traps are under
    the *Long-term care* bullet of *Smaller, each self-contained* above (its ⚑ 2026-09-04 re-anchor).

13. **Also:** ✅ icons + an installable PWA shipped 2026-09-08 · WebKit reaches only the VAULT seam (2026-09-08 — the two
    `@cross-browser` vault arms; every UI surface is still verified in Chromium alone, and nothing anywhere executes a
    real Safari eviction) · the fit law at enlarged text — ✅ RULED + BUILT 2026-09-10 (council wf_d2b1d05a-001, `8f66dcfe`:
    the 2026-09-08 24 px reds measured the stacked tier, now gated by ORDER + REACHABILITY); the 20 px two-pane overrun is the open
    fork (register *The app on someone else's device*) · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · ✅ the solve
    lane's EDIT-TIME cancel shipped 2026-09-03 (`engineClient.ts:278 createResettableEngine` +
    `memoryModel.ts:783-786`); what remains is the interactive tier and the MAIN-THREAD FALLBACK, which still
    freezes the tab for the whole solve and says nothing — its `reset` is a documented no-op
    (`engineClient.ts:51-63`; the old `:55` anchor named nothing about freezing).
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 8 — icons · WebKit arm · enlarged-text arm) — its 2026-09-04 re-verify clause, still live:** ✅ PWA icons DONE 2026-09-08 (his eye audits the silhouette sheet — path in the register's device entry) · ✅ WebKit e2e
    arm DONE 2026-09-08 (the two vault arms only) · enlarged-text fit arm (S, CDP `Page.setFontSizes`) MEASURED 2026-09-08 —
    eight PROTECTED reds, so the council fired: ✅ RULED + BUILT 2026-09-10 (the reds measured the stacked tier — register *The app on someone else's device*); the clauses below were the build recipe, kept for that arm's CDP notes.
    ⚑ **2026-09-04:** INDEPENDENT, not a chain — the text arm rides CDP (Chromium-only) so it can never share
    the WebKit project; all three are pilot (register `M` · **pilot**; "his eye audits" is the post-hoc
    batched-oracle read, not a gate). ICONS: `manifest: false` (`vite.config.ts:36`) disables the plugin's
    icon precache, so ship `includeAssets` (or image globs) WITH the files or the installed PWA has no
    offline icon (proven against `dist/sw.js`); the favicon 404 is GONE since 2026-09-08 (`public/favicon.ico` plus
    the three link tags in `index.html`); no brand mark existed to quarry — the color-blind-safe
    SVG glyph vocabulary (GradeSignal / verdictSignal / BandLegend) is the silhouette source; CSP already
    allows `img-src 'self'`. WEBKIT: `playwright install webkit` IS required (the on-disk `webkit-2272` is a
    stale revision — `@playwright/test` 1.60.0 needs 2287, launch fails today) + `webkit` on
    `verify-the-back-nine.yml:89` (the `verify` job's install — NOT the `:131` twin in the `verify-rv-chart-text`
    job); scope at TEST level — `vault.spec.ts:70` (trust loop) + `:121`
    (second-tab read-only), never the whole file: the KDF spike `:145-176` asserts a Chromium-only
    thread-pool fact; the arm RECORDS the storage capability triple and asserts only Web Locks — WebKit exposes NO
    `navigator.storage.persist()` (measured 2026-09-08; `db.ts` calls it advisory) — it does NOT verify Safari eviction (nothing in the repo executes a real eviction;
    both harnesses model it with a wipe). ENLARGED TEXT: `Page.setFontSizes` re-probed 2026-09-04 against
    the repo's chromium-1223 — the param shape is `{ fontSizes: { standard: 24, fixed: 24 } }` (the flat
    form is rejected); it propagates because the type scale is rem/clamp with ZERO literal-px `font-size`
    rules; the `newCDPSession` pattern is at `caddie-walk.spec.ts:380`, and the shipped arm's own helper is `raiseDefaultFont` (`vertical-fit.spec.ts:468-481`); re-run the 8 REAL+TIER one-frame
    arms (4 spine seeds × 2), not all 52; PROTECTED = `vertical-fit.spec.ts:17-21`.

### Tier 3 — Briggsy's call

14. **His eye, the standing block.** The stacked tape rows (07-08 → 07-23, which also score the
    Opus-vs-Sonnet Caddie flip) · the aged-surface tone calls, **due before 2027-01-01** — the four filed
    plus the aged date band's THREE-row annotation block on the phone / 1088 (2026-09-07, register *The aged
    surface*) · the chart
    framing forks (whose range is shaded, which odds the ladder quotes, the axis units) · `?vault=stale`'s
    MEANING ruling (both obvious repairs are measured dead ends) · the three-doors rhythm on `datemixed` ·
    the essentials median line · the legend's rendered result after the pilot's outline delete (council
    2026-09-08; the 2026-09-11 walk parked the shape, his 2026-09-13 "go with your gut/lean" grant discharged the
    delete to the pilot's lean; the outer-edge flag refuted by measurement) · the record card's strategy naming (half 2) · the phone-rhythm pass · the
    fiduciary's current-law-as-written caveat, unanswered since 2026-07-09.
    ⚑ **On-surface re-audit owed** for the two Card 9 / GoalPicker fixes that shipped without it, and (2026-09-13) for Card 14a's blocked CTA — its rendered reason, the paper-and-dashed-hairline look, the Tab order — ONE re-audit, one dialog, not a third IOU — a
    chat-approved change does not survive his re-read on the surface (the 2026-07-11 false-PASS lesson).

### Tier 4 — hygiene

15. **Verify-owed, and it needs him.** The OOP-medical figures (`src/intake/referenceData.ts` →
    `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified
    (`directionalUntilPinned`). BLS bot-walls `curl`, so this is the sanctioned exception to
    no-manual-steps: ask Briggsy to pull the CE "Age of reference person" table and pin them cell-by-cell.

16. **The gates that don't bite (the register entry of this title is the live list — count there; the richer market draw is filed
    twice, as its DEFERRED BUILD and THE RICHER MARKET DRAW bullets; the CVD one is PARKED, below)** — R7's registry is one level deep, copyGuard's scope is
    a prefix allowlist with no forcing function on new keys, and several arms still cannot fail. None can
    produce a wrong answer today; all mean the net is thinner than it reads. Plus the Medicare-trend
    riders, the open copy obligations, the deferred richer market draw, and the `dateinvert` (c) mint —
    its own session, a size-L parameter hunt.
    ⚑ **2026-09-04:** two bullets were half-dead and are closed — the `partBTrendVintage` "no exposure gate"
    clause was swept in `staleness.ts:712-715` but still lived verbatim at `model.ts:2606` (swept), and
    Plan 4's "the record carries `seedA`/`seedB`" (`plans/4-recommendation.md:283`) had outlived its own
    "kill BEFORE S5 mints" deadline — the shipped `SavedRecommendationV3` (`model.ts:2187-2209`) has no seed
    field (struck in the plan). ⚑ (b)'s SOURCE twin outlived that close — `heldOutSeed.ts:13-14` still said
    the U17 record stores the seed — and was swept 2026-09-25 (the register bullet is closed with it).
    ✅ **NC's RETIRED CERTIFICATION CHECKPOINT — SWEPT 2026-08-14.** Six shipped surfaces (not the
    five filed; `CLAUDE.md:38` turned up in the sweep) still asserted the dead ~Aug-2026 event in
    PRESENT tense after S.L. 2026-41 struck every trigger row FY2025-26 → FY2032-33 on 2026-08-02:
    `scripts/verify-state-tax.ts` header + its `nextDue` doc comment · `verify-the-back-nine.yml:64-66`
    · project `CLAUDE.md:38` · and two in the engine — `constants/types.ts` and
    `validation/oracleToken.ts`. All now name it as RETIRED, in past tense, and the two engine
    docblocks additionally record that **`certification-pinnable` currently fires for NOBODY** — the
    kind survives only because the machinery is generic and the next directional state re-arms it,
    which is the thing a reader would otherwise mis-infer from an NC example written in the present.
    The `verify-state-tax.ts` header also gained the source landmine it was missing: NCDOR's rate
    page and the codified G.S. page both still show the struck "after 2025 — 3.99%", so they read as
    CONTRADICTING the pinned record until they recompile — **session law wins, do not "correct" the
    engine table back to a flat 3.99%.** Comment-only; typecheck · lint · 3289 tests · state-tax gate
    all green. (`copy.ts:3553` and `caseStateCompanions.ts` were already correct — swept 2026-08-02.)
    ⚑ **The CVD half of this cluster is PARKED, not owed — do not re-propose it.** The filed gap ("the CVD
    crops prove PRESENCE only") is real, and a `verify:cvd` pixel-regression gate was designed for it on
    2026-08-02. **Briggsy declined it on the only authority that can:** *"I'm pretty color blind and I think
    b9 looks great."* Per `caddie/SKILL.md:249` the colour lane can only flag, never pass — his eyes own the
    verdict, so that IS the pass (taste-corpus rule 40 + exemplar E14). Rule 18 still binds every NEW
    surface; this covers what he has seen. **Being colour-blind qualifies him as the oracle rather than
    disqualifying him** — he is the failure mode, not a judge of prettiness, and a simulated-CVD PNG is only
    a model of him. Reach for the human before building the simulator.
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 10, the hygiene session) — its 2026-09-04 re-verify clause:** Hygiene session (M): the copyGuard scope canary **DONE 2026-09-08**; everything after it in this paragraph is still live.
    ⚑ **2026-09-04:** "nine items" was UNSOURCED (no such list exists anywhere; Tier-4 "The gates that don't
    bite" carried 14 filed bullets that day = 13 distinct — the register entry is the live list — one of them the CVD probe Briggsy parked). The real
    copyGuard defect was ONE key: the RecommendationViz aria slot spoke three dollar figures + a delta to a
    screen reader outside require-hedge — the AT twin of the gated `recDeltaTypical` — and its exclusion was
    a RECORDED decision in the SLOT_RENDER fixture's own comment, so the fix reversed a stated call, not an
    accident. **DONE 2026-09-08:** RENAMED onto the existing `recDelta` control prefix (`recDeltaVizAria`,
    `copy.ts:3601`; a new `recViz` prefix would red the three hedge-free arm labels — each measured to red
    `require-hedge` on its own) + a catalog canary over `/^rec(?!over)/` (a bare `/^rec/` reds the 16
    innocent `recovery*`/`recover*` intake keys) with a NAMED allowlist that SPLITS flat keys from slots
    (unscoped flat keys get 2 gates, unscoped slots get 3 + catastrophe). Scope is decided ONLY in the test
    file (`copyGuard.test.ts`, "every rec* key is verdict-scoped, control-scoped, or a NAMED figure-free
    exception"; `lintCopy` stays scope-agnostic) — the canary is a row there, not a gate. The 11 byte-identical
    `EngineClient` fakes cost an 18-file sweep (not 19) — a shared helper. `ensureSeed()`: the two queue
    files DISAGREED (the register's residual list says "none a build without a ruling", this file carried no
    flag) and BOTH candidate fixes cost something — "mint through `update()`" turns a deferred false-arm
    into an immediate one; an eager mint in `createMemoryModel` breaks the WRITTEN contract #1b (mint at the
    FIRST ENGINE RUN, `plans/2-first-answer.md:57`) with no test that would catch it. His ruling, framed as
    those two arms. Two half-swept false comments closed 2026-09-04: `model.ts:2606` and
    `plans/4-recommendation.md:283`.

---

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
  `projects/the-back-nine/**` (plus the workflow file itself), and by hand via `workflow_dispatch`, whose
  `runner` choice (added `2766a852`) dry-runs a candidate image before the pin moves. It runs TWO parallel
  jobs, both PINNED to `ubuntu-26.04`, never `ubuntu-latest` (`d878e4c3`): `verify`, in order —
  `verify:aca` · `verify:state-tax` · `lint` · `typecheck` · `verify:doc-stats` · `test` · `build` ·
  `verify:bundle` · `verify:csp` · `verify:fit` — and `verify-rv-chart-text`, which runs `verify:fit:rv` alone
  (three serialized arms, each a full-precision solve, since 2026-09-07; 5.4 min for the whole step on the first `SOLVER_CODE_VERSION` 9 run (`53f1ae71`, run 37166135388) and 4.9–9.1 min across the green runs since (runs 38693180201 / 37221659495), against 36.0 min before the solve-time levers, run 37144203722, and 9.8 min after them on the single worker, run 37157413217). **All eleven.** `vercel.json` carries no
  `buildCommand`, so a deploy still runs the default build with no gate — CI is the gate, Vercel is not.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (one file per lesson; cite by full path + slug).
These are the mechanical ones that keep costing hours.*

- **From the b9-7 close (2026-10-30), migrated by b9-8:** `e2e/` is outside `tsconfig.json`'s `include`, so `pnpm typecheck` never reads a spec — check
  one with a scratch config that extends the project's, sets `typeRoots` to the project's `node_modules/@types` and
  `node_modules`, and includes the spec by absolute path. `verify:doc-stats`'s citation arm freezes only "not `" and
  "-at-filing`" tokens, while `doc:reanchor` also freezes "(then" — so a historical "`x.ts:N` (then)" is frozen by the tool and
  still CHECKED by the gate, and reds the day an edit lands a blank line under N; write a historical number as prose ("line N
  of `x.ts`"). A sentence that says "can look worse/better" reads as "is": say a direction only where it is measured, or only
  on the side whose over-read errs safe (the card's withdrawn mirror). (b9-6's, kept:) `git status --porcelain` prints REPO-ROOT paths, so a `git commit -- <paths>` built from it
  must run from the repo root — from the project dir every pathspec misses and NOTHING commits (no harm, but read the sha before
  believing a commit happened). A fixture that used a date seed as "the W-free draft" carries W since U10: strip
  `workingYearCost` where an arm measures the W-free case (seven arms needed it — the floor-reach pairs in
  `stalenessExposure.test.ts` and `reentry.test.tsx`, the methodology pair in `assumptionPanel.test.tsx`, `datemixed`'s W-absent
  twin, `dip`'s floor premise — W brings `employerHsaByPerson` with it — and the stale-W witness).
- **From the b9-4 close (2026-10-30), migrated by b9-5:** a test "retype" that fires `change` with the value focus already put
  in the box (`CurrencyField` fills it with the figure on focus) fires NO React change event — the arm read a real product bug
  that was not there; a retype passes through other text (`'700'` then `'7000'`). A tap on an UNCHECKED segmented control
  reaches `onChange` twice (its click and its change), so an arm counting commits sees two — pin what each commit lands, never
  the count (filed Tier 4). A full-suite failure list needs the names: `vitest run --reporter=json --outputFile=<file>` and
  print `testResults[].assertionResults` with node — `| tail` keeps neither the names nor the exit code. A test written in a fix
  pass and never run sat red for two sessions: after any fix pass, run the WHOLE suite (and every gate whose surface it
  touched) before the next step.

- **From the b9 A7-review close (2026-10-29):** `b9-a7-review\fixes\head\` and `b9-a7-review\pre-a7\` (in the session
  folder `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\`) hold a `node_modules`
  JUNCTION into the project's own `node_modules` (as `b9-a6-head\` does). Before deleting either folder, remove the link alone
  (`cmd /c rmdir <folder>\node_modules`), never a recursive delete through it.
- **From the b9-2 close (2026-10-30), migrated at b9-3:** a Python `open(p).read()` in TEXT mode turns CRLF into LF silently,
  so an "is it CRLF?" check inside the same script is blind — read and write BYTES (or compare against `git show HEAD:<path>`) on
  any file you rewrite; `devSeeds.ts` and `devSeeds.test.ts` are CRLF. `sed -i` strips CRLF too. A seed figure equal to a sourced
  constant's value (`72000` is the §415(c) cap) reds the single-source gate — pick a figure no constant holds. Editing ANY `src`
  file while a fit run is going hot-reloads its dev server mid-test.
- **From the b9-1 to b9-5 closes (2026-10-30, Phase B carried uncommitted across four sessions, landed as `c07e5758`):** when
  a multi-session build must sit UNCOMMITTED in the shared tree, back it up on a side ref cut through a TEMPORARY index —
  `GIT_INDEX_FILE=<scratch>/x.index`, `git read-tree HEAD`, `git add -A -- projects/the-back-nine`, `git write-tree`,
  `git commit-tree`, `git update-ref` with the old value — so the real index never moves; recover a lost file with
  `git show <ref>:projects/the-back-nine/<path>`, never a reset, and never `git checkout`/`restore`/`stash` the held paths.
  Deleting the spent ref (`git push origin :<ref>`) is refused to the pilot by the permission classifier: it is Briggsy's
  one command (`refs/wip/b9-phaseb` was his to delete, gone local and on origin since 2026-10-30).
- **From the b9-5 close (2026-10-30, migrated at b9-6's):** `verify:fit`'s four-worker run can time out final-tier waits on
  this laptop under load (the `?vault=datestale` / `?vault=datearrived` returns at 90 s, reduced-motion chart text at 180 s;
  60–90 s alone) — re-run them with `--workers=1 -g` before calling one a regression (b9-6's run, alone on the CPU, went 152/152
  in 6.4 min). The full suite's parallel run can time out heavy tests the same way (`budgetTwoTrack`'s compute profile,
  `solvePayloadIdentity` F1 / F4, `.health` F2 — 126–325 s against 120 s limits; pass alone). A background Bash command ending
  `; echo "EXIT $?" >> log` reports exit 0 in its task notification whatever the gate returned: read the log's own EXIT line
  (bit b9-6 too). After a fix pass that touches a gated surface, run that surface's gate, not only the unit tests.
  `pnpm doc:reanchor <BASE>` moves a citation written FRESH in the tree a second time: classify every proposed edit first
  (`b9-phaseb-review\b9-5-mutants\classify-reanchor.mjs <dry-run output>` — SAFE / CARRIED / FRESH), hand-check each FRESH one
  and each REVIEW line (a citation inside a modified hunk is never moved), and move the second number of a comma pair by hand
  (the tool moves only the first).
- **From the b9-14 close (2026-10-29, A6):**
  - **The once-only re-anchor rule below was broken anyway** — `pnpm doc:reanchor HEAD --apply` was invoked twice in one
    shell line (once piped to a count, once to a tail), so 276 citations moved twice (983 → 1109 → 1235). Capture ONE
    run's output to a file and read the file. The recovery that touches no other edit is
    `b9-a6-tools\unreanchor.mjs` (an LCS over lines with citation numbers masked puts HEAD's text back on every line that
    differs only in them; it snapshots first), then one fresh run, then the three checkers.
  - **The re-anchor tool still misses bare tokens on a line that names another file first** (four this time, plus four
    bare `taxOverlay.ts` tokens in `objectiveHeadline.ts`'s docblock that only `crossline-sweep.mjs` sees — the same four
    as b9-13), and still rewrites the two HISTORICAL lines (`docs/backlog.md`'s quoted re-anchor incident, insight 136's
    wrong-citation example): after the one `--apply`, run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs`
    and put every recorded number back to HEAD.
  - **`copyFence.test.ts` (30 s default) timed out once in the full suite under load** — ESLint's cold start; alone it ran
    in 0.9 s, and the next full run passed. Re-run a lint-in-test timeout alone before believing it.
- **From the b9-11 close (2026-10-27, the RIB-LIM order fix):**
  - **`pnpm doc:reanchor` runs ONCE, LAST — and docs edited after it ran need hand moves.** A re-run against HEAD
    double-shifts every token it already moved (its dry run proposed `solverCodeVersion.ts:154 → :171` for a citation
    already at the right line). Move the later ones by hand from content, then run `content-check.mjs` (the re-anchor
    tools folder) — every DIFF it prints must be a construct this change edited on purpose. It also rewrote a HISTORICAL
    example inside a landmine below (the "two new register entries shifted `docs/backlog.md:1938`…" line) as if it were
    live: reverted by hand; read its WOULD list for examples before `--apply`.
  - **A dev seed carries no `chosenGoal`**, so `buildSolveRequest` returns `spine-unready` for it — a node-side solve
    probe passes `{ ...seed, chosenGoal }` (`b9-seed-probe\solve.mts`'s `seed:goal`). Single-threaded, `healthss` takes
    ~15–18 min per goal.
  - **`solvePayloadIdentity.health.test.ts` (180 s budget) timed out in the full suite under background-probe load**;
    alone it ran in ~53 s. Re-run a solve-test timeout alone before believing it; keep heavy probes off the suite.
  - **Inline `node -e` scripts are shell-interpolated** — a regex with `$&` broke at parse (it failed before writing, so
    nothing moved). Write the script to a file in the scratchpad (the memory rule, met again).
- **From the b9-10 close (2026-10-22, A2 and A3 landed overnight):**
  - **Another Claude session works in the same monorepo** (`projects/hooks/` files showed modified under `git status ..`
    mid-session, and MEMORY.md changed on disk). Commit by explicit paths only (`git commit -- <paths>`); check that
    `git diff --cached --name-only` holds nothing outside `projects/the-back-nine/` before every commit.
  - **Windows has carried RebootRequired + RebootPending since 2026-10-15 01:43** (last boot 2026-10-08 05:14) and did not
    auto-restart through six 02:00–08:00 windows. Still check both keys before overnight work, but it is not forcing.
  - **`pnpm doc:reanchor` skips `index.ts` too** (two are tracked: `src/engine/constants/index.ts` and
    `src/engine/reference/solver-cases/index.ts`), the ambiguous-basename class. Run `git grep -n "index\.ts:[0-9]"` and fix
    by content. Its missed-bare-token class recurred: backlog's `:401-407` sat ~90 characters after `simulate.ts:441-444`,
    and pair-check's DOCHUNK section caught it. It also never moves a doc's citations INTO ITSELF, and neither tool flagged
    it: two new register entries shifted `docs/backlog.md:1938`, `:2224`, `:2297` (cited from inside the register) by +36.
    After any edit that adds lines to a doc, run `git grep -n "<doc>:[0-9]"` across the repo, the doc itself included, and
    compare HEAD vs tree content at each shifted number.
  - **The single-source gate in `constants.shape.test.ts` scans EVERY `src` file, tests included**; only `engine/constants/`
    is exempt. A test elsewhere that types a DISTINCTIVE figure (now including `184500`) reds. Read the figure from the
    constant and type only the derived dollars.
  - **A pure refactor's proof** (A2's arm): a FROZEN verbatim copy of the replaced code in the test, swept over a seeded
    population, green on the untouched engine FIRST, then green after the extraction, plus planted mutants on the new code.
  - **Window cost:** A2 + A3 together, each with a mutant pass, a re-anchor and two full-suite runs, plus the session's
    reading, brought the window to ~41 % by A3's commit. A4 (the month-by-month earnings test and its credits) is larger:
    build it fresh, alone.
- **From the b9-9 close (2026-10-21, the review verified and applied; A1 landed):**
  - **Nobody uses the product yet, and it is built for Briggsy alone.** His words: "There is no one who has used this
    product yet, not even me" and "This tool is for me, if one of my friends uses it, it'll be a crazy outside chance."
    The reviewers, the council and the b9-8 plan all assumed saved plans and friend users; a whole unit (U12) existed for
    plans that cannot exist. Before designing any migration, legacy-vault or "returning household" path, read the memory
    `project-back-nine-no-users-yet`. A saved shape is not a one-way door until HIS first real save.
  - **Never apply a verifier's resolution unchallenged.** The skeptics caught real defects in the verifiers' own fixes:
    a bottom line that rounds to −0 ("Left over $0" while the engine draws $0.40), a couple's $8,640 expected on a lone
    worker ($240), a yearly default under a period rule whose 8,000 floor only means something under a month default.
  - **The verification fan-out cost** ~2.6M subagent tokens and 32 minutes (9 agents); the reviewed plan plus A1 took the
    window to ~47 %. Build A2 onward fresh.
  - **The re-anchor after an engine edit.** `pnpm doc:reanchor HEAD` (dry run) then `--apply` made 148 edits, including
    dated logs and insights (the precedent `b4bbbd3e` accepted the same). Then: hand-fix each REVIEW token by content
    (a reworded cited line); run `pair-check.mjs` + `crossline-sweep.mjs` + `content-check.mjs` from the tools folder.
    `pair-check` flags a HISTORICAL token as MISMATCH (TODO's "`model.ts`'s `:658` … had been stale") — a recorded
    number stays. `crossline-sweep` found two bare `:151-152` docstring tokens the tool cannot see (fixed by hand).
  - **A plan doc under `docs/` must carry no line-numbered code citation and no count:** `verify:doc-stats` scans every
    doc there for both.
- **From the b9-8 close (2026-10-21, the pay-check plan: research → plan → deepen → doc review):**
  - **A plan cycle ate the window.** `/brief`, the two-primary research fan-out, the plan, a nine-agent deepening and a
    five-agent doc review reached ~55 % with no code written. That confirms b9-4: build in a fresh session.
  - **Fan-out outputs that must outlive the session go OUTSIDE the session scratchpad.** Use
    `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-<name>\`. Have the
    agents write files there and return only a count, which is how the doc review ran past the 50 % fan-out line.
  - **The 5-hour session limit kills workflow agents mid-run.** Resume with `resumeFromRunId`: finished agents replay
    from cache. A "failed" agent may already have written its file (design-lens did); the re-run overwrites it, so read
    the file's own totals line before trusting it.
  - **A council-ruled mechanism can be wrong in detail.** The pay-check ruling's survivor W
    (`budgetlessSurvivorSpending(W, r, M)`) reduces to r·W under a budget, which is the ratio-on-total shape the
    2026-07-02 council vetoed ($27,000 vs $32,000 on `dip`). The plan records it as a refinement (R9, KTD6). The register
    amendment is U11's.
- **From the b9-7 close (2026-10-21, D7 ruled; the audit, the filing, the pay-check measurement and its council):**
  - **`node -e` mangles Windows paths.** The shell ate the backslashes in a TODO edit (`C:\Users\brigg\.claude…` came out
    `C:Users\brigg.claude…`). It was caught only by a snapshot + `cmp` at squeaky. Edit docs with the Edit tool, or with a
    script FILE, never `node -e`.
  - **`docs/insights/README.md` is CRLF, and the insight files are LF.** A `cat >>` append put LF lines into the CRLF index.
    The Edit tool keeps a file's own line ending. Count `\r\n` with a node script before trusting Git Bash.
  - **A shell-made edit is invisible to squeaky's ownership check** (TODO.md went `contested`, the index `foreign`). Make
    doc edits with the Edit tool, or squeaky cannot commit them.
  - **A summary's headline is computed on the population its caveat names** (insight 141). The survivor rows carry a
    `reachable` column: filter on it first, then take the max.
  - **ssa.gov answers curl with 403.** Read the IRS Topic pages instead (751 payroll, 560 Additional Medicare: primary,
    and they curl fine), or LII for the statute. A grounded search alone is secondary.
  - **A council fed a wrong headline reasons from it.** Every opening seat built on the mis-filtered survivor figure until
    the red team re-read the rows file. Re-count a brief's numbers from the source before convening.
- **From the b9-6 close (2026-10-21, (B) landed `b4bbbd3e`; the working-year row walked three times):**
  - **The re-anchor and its misses.** `pnpm doc:reanchor` made 625 edits, then verification found 59 + 9 more it cannot see:
    - it SKIPS both files of an ambiguous basename outright (`stateTax.ts`, the engine file and the constants file), so resolve each by content;
    - a bare token on a line that names NO file, continuing the line above (`IntakeApp.tsx:267`'s `(:170-175)`, which is `stalenessExposure.ts`'s), is invisible to the tool AND to any same-line checker;
    - its earliest-file attribution re-shifted quoted tokens inside the register's own re-anchor-bug entry.
  - **The method that caught them.** A naive HEAD-side pair-check also goes blind to every line the tool itself rewrote, since that line now sits in the doc's own diff. Pair same-size hunks positionally, then sweep cross-line bare tokens, then send each disagreement to a two-reader content pass applied by unique windowed match. The scripts are in `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-reanchor-verification-tools\`.
  - **A doc edit AFTER the apply that adds a line** shifts every citation INTO that doc below it. Grep `<doc>:N` and its bare continuations before adding (this run's one register line was checked clean).
  - **The Caddie walk now captures `door-N-<slug>-methodology`** (the assumptions sheet scrolled to the end of its methodology rows) and `crop-method-last-row`. These are the first frames ever to paint those rows; any methodology-row change reads them.
  - **A copy mutant whose text also sits in another key plants twice.** The row ends exactly like `recDiscNiit`, so anchor the plant on row-only context.
  - **Workflow args.** A JSON-encoded placeholder crashes at parse, with 0 agents spent. Pass real values, and send big inputs as files the agents read (`batch-N.json`), never inline.
  - **CI:** `gh run watch <id> --exit-status` in the background notifies on completion, so never poll.
  - **His taste, E20:** a disclosure that the tool skips something it already has the inputs for reads to him as a product failure, not honesty. It opened the off-course discussion.
- **From the b9-5 close (2026-10-20, (B) built, uncommitted):** the HEAD engine is measurable without touching the tree:
  `git worktree add --no-checkout <scratch>/head HEAD` → `git sparse-checkout set --no-cone projects/the-back-nine/src …tsconfig.json
  …package.json …vite.config.ts` → `git checkout` → a JUNCTION to the real `node_modules` (`New-Item -ItemType Junction`), then run the
  probe from the worktree's project dir · REMOVE THE JUNCTION FIRST (`cmd /c rmdir <junction>`) and only then `git worktree remove
  --force` — a recursive delete must never walk into the real `node_modules` · a fan-out of parallel builders on ONE tree leaves a
  cross-file fallout (an existing arm another builder's change reds) flagged by both and fixed by neither — name an owner for every
  fallout in the brief · a 3-builder + docs + 3-reviewer workflow ran ~75 min and 2.7M subagent tokens, and the build itself took the
  pilot to ~50 % before it — plan the walk + the commit for a FRESH session · `node -e` ate a comment's backticks AGAIN (this
  session) — the rule stands: any script text with backticks goes in a FILE · `C:/wt/b9` (branch `b9-squeaky`) is ANOTHER
  session's worktree — never remove it.
- **From the b9-4 close (2026-10-20, (B) planned):** the plan + its deepening + a four-persona doc review + a full council cost ~50 % of the window (10 opus agents + a 21-agent council, `wf_ef6cf7c5-a2b`, 2.27M subagent tokens, ~31 min) — BUILD (B) in a FRESH session, never on the planning session's tail · the build is ONE commit (U1–U7): the `dip` re-tune (the register's same-commit law), the ledger row (a row-less engine push recomputes saved vaults silently — the witness cannot see the gross-up), and the test counts (`verify:doc-stats` arm 1 is a CI step) are all CI- or honesty-coupled · the register's reach measurement for (B) covered only the channels its title names — the year's OTHER portfolio draw (a retired spouse's Medicare/extras, `fundingNet`) was found only by the deepening's flow analysis: a reach measurement enumerates EVERY portfolio-funded dollar in the year, not the named ones · a binding NEGATIVE can be falsified by its own entry's Prescription formula (tax(W+X) − tax(W) charged $0 where Social Security alone is taxable) — check the formula against the NEGATIVE before building it · `bridgeYearMask` is built only under `healthcareEnabled` (`simulate.ts`), so any guard keyed on it is silent on a healthcare-off run (the plan's KTD5 builds it under the construct) · a session can be FORKED into a background job mid-conversation (this one became `b9 (2)`, a new session id, its scratchpad gone) — `/window` takes `$CLAUDE_CODE_SESSION_ID`, never a remembered id · background sessions: `claude agents --json` lists them, `claude stop <id>` stops one and keeps its conversation; an INTERACTIVE terminal session is not a daemon job (`claude stop` answers "No job matching") and killing its `claude.exe` is classifier-blocked ("Interfere With Workloads") — it needs `/exit` in its own window; never `claude daemon stop`, which ends EVERY background session, the caller included · uscode.house.gov answered "Under Maintenance" 2026-10-20 — LII (`law.cornell.edu/uscode/text/26/<section>`) carried §402 / §86; IRS PDFs read clean through `pdftotext -layout`.
- **From the b9-3 close (2026-10-20, the ACA re-verify + (1b)'s measurement):** every ACA instrument change this pass met lives in the record's `forwardClock` ⚑ 2026-10-20 head — uscode's `versions.json` lists only the newest id and an unknown id answers HTTP 500 with a 75 B body; the GovTrack JSON API is retired (enumerate new measures from govinfo BILLSTATUS bulk listings); the govinfo PLAW not-published shell is now 44,172 B (detect it by content); archives.gov needs a cache-busting query; the Senate vote menu moved to `roll_call_lists/` — read that head before the next pass, never this line · a presented bill past its tenth day can already be law with no list showing it (S. 195 was signed 10-09 and read "unsigned" on 10-12) — read the bill's own BILLSTATUS actions · a GPO HTML bill print can render a table as "TABLE TOOL ERROR" (S. 5496) — read the XML · research agents that browse drive Playwright from the repo and leave `.playwright-mcp/` in it — sweep it after any such agent · a probe script outside the project runs under `pnpm exec tsx` from the project dir (its relative imports reach `src/`, whose `@engine/*` aliases then resolve), but only as `.mts` — a `.ts` with top-level await dies "not supported with the cjs output format" · a commit message's summed counts come from the run outputs (582 + 98 + 29 = 709 across 21 files), never a recalled figure — the ACA commit first said 680 and was corrected before the push.
- **From the b9-2 close (2026-10-19, his four b9-1 walk rulings + his Medicare re-ruling):** the harness now COMPACTS an idle session (summarizes it; it does not clear it) ~55 min after a turn ends — twice this session (212,652 → 43,451 and 485,045 → 45,821 tokens), and the status bar read ~0 after. Write the squeaky close while the session's detail is live, before he walks away; the full log stays on disk (`~/.claude/projects/<slug>/<session>.jsonl`) for anything the summary dropped. `/window`'s first read after a compaction was the stale pre-compaction 48.3% — fixed in the monorepo (`7faa5c5d`); it now prints "compacted … no live read since" · one walked copy build (pre-trace + build + whole-file review + TWO Caddie walks, 103 panel agents) cost ~48 % of the window — keep ONE walked build per session · `git show <sha>:src/…` resolves from the MONOREPO root and fails; from the project dir use `git show <sha>:./src/…` · a healthcare-sheet fixture account added without `manualBlend` left the draft with no priced run, so the per-person extras block never rendered — fix the fixture, never the assertion · the Caddie panel's output file wraps the verdicts as `{ summary, …, result }` — parse `.result` · a seat arm whose every fixture shared an incidental property (a step card) let a step-keyed seat mutant survive, and a sibling assertion that implied its parent hid a second — vary the incidental property and assert each parent directly (insight 140's *Also Applies To*).
- **From the b9-1 close (2026-10-16 evening, his three rulings + two in-session):** `pnpm doc:reanchor` LEAVES its REVIEW citations (inside a modified hunk) at their OLD numbers even under `--apply` — hand-fix each by CONTENT (HEAD line vs tree line); it moves only the FIRST number of a comma list (`ConfidenceStatement.test.tsx:691,704` → `:721,704`, fixed by hand), it rewrites citations inside `.ts` comments too (check `git status` for test files you never touched), and it misses a bare continuation more than ~60 characters from its file name (four this session) · the honest post-run check runs from HEAD's side: take each HEAD doc token, map it through the code diff, and confirm the tree doc carries the new number — a tree-side scan ("does tree(N) still equal head(N)?") flags every correctly moved token in a uniformly shifted region (190 false positives this session) · a ruled word change can be FALSE on a route its ruling never saw — trace every render site through a workflow before the first edit (this session's trace found the aged-plan "starting now" and the wide-gap "add none" before a line was written) · `copyGuard`'s `require-hedge` is PREFIX-scoped: a figure-free mechanism pointer belongs in the `medicareExtras*` family with a figure-free pin, never an exemption list · the Healthcare sheet portals to `document.body` — an RTL `container.textContent` reads empty there · `node -e` ate a regex's backslashes again (`\S+` → `S+`) — any script with backslashes or backticks goes in a FILE · a capture-only `devSeeds.ts` plant runs AFTER the walk (the walk's dev server would hot-reload mid-capture), restored by copy + cmp
- **From the b9-toronto3 close (2026-10-16, the one-figure Medicare card's first-year frame):** a RESUMED Claude Code process carries the git snapshot of its START — this session's process had run since 2026-10-12, so its context reported nine "uncommitted" files that b9-toronto1/2 had long since committed; run `git status` live before reporting the tree · the Caddie walk captures no pixel of a scrolling sheet's below-fold card: `LOOK_OUT=temp/look/<run> LOOK_SEEDS=<seed> pnpm exec playwright test --config e2e/held/shots.config.ts medicare-cards-look`, then copy `2-premium-card.png` / `4-sheet-full.png` / `3-step-card.png` / `dialog.txt` into the bundle as a `door-5-see-your-health-cost-picture-scrolled-premium` state (viewport / fullpage / crop / copy) BEFORE the panel runs — never beside vitest · a pilot lean is a claim too: the no-trend-line build (the no-era precedent) was refuted by the first walk ("start at" alone read as WHEN) — run the walk before calling a frame fixed · `pnpm doc:reanchor` moved insight 136's historical copy citation (then 1186) AGAIN (its second time) — corrected 2026-10-16: 1186 was already a moved value (the insight was written at `f74f6ee6` as copy 1178, `verdictMedicarePriced` that day, and `c1ada867`'s run moved it unnoticed), and five of its line-11 citations have moved since it was written — restore all five by hand to the `f74f6ee6` text (taxOverlay 1796/1853 and its bare 1853, devSeeds 1079, vertical-fit 396-406, copy 1178) after every run until the register's Tier 4 entry excludes historical records; the positional pair-check can be scripted from the dry-run log (HEAD line vs tree line per endpoint — 245 endpoints, 0 mismatches this session) · a full-bodied session (a 66-item verify, two six-lens walks, a 13-agent review) reaches the 50 % context line by the second walk — budget ONE walked build per session plus its records
- **From the b9-toronto2 close (2026-10-15, the same-age Medicare card):** `gh run list --commit <sha>` matches only the FULL 40-character SHA — a short one returns NOTHING (re-proven at the close: `690bcae0` → empty, the full SHA → run 38806260414), so a poller fed a short SHA reported "no run registered" for ten minutes while the run was live; resolve with `git rev-parse HEAD` first, then poll that run by explicit id · `pnpm doc:reanchor` PRESERVES pre-existing rot — a citation already on the wrong content moves with its line and stays wrong, and arm 4 passes it green; the catch is a PROVENANCE check (open the line each citation named in the commit that wrote it, then find that content in today's tree) — it found all six register citations in `docs/plans/features/pay-less-tax-all-in-build-spec.md` already wrong; the same session met three more blind classes (a `:N+` suffix, citations inside a code block, `~N` tilde forms — the register's Tier 4 entry's ⚑ 2026-10-15 bullet), and the second run again rewrote the frozen `e2e/held/fit-24px-measurements.md` (restore it) · a scratch measurement test's `console.log` never reached the captured run output (cause NOT traced — `vite.config.ts`'s `test` block sets no `silent`) — have it write its figures to a file in system temp, and delete it from the tree after its run (the doc-stats count landmine) · `git show HEAD:<path>` run from the project dir resolves the path from the MONOREPO root — write `HEAD:./<path>` · Git Bash has no `rev` — use `grep -o`.
- **From the b9-toronto1 close (2026-10-14/15, the survivor basis + trim cut, the ACA itemized probe, three health-sheet Tier 0s):** the OS MEMORY REAPER kills a background full suite on this laptop — vitest's workers die, the log stalls with no summary, and the parent tree lives on as a zombie (kill it with `taskkill /T /F /PID <root>` after reading its command line); results are VOID, so never count a stalled log, never restart it unasked — run the files the change reaches in the foreground and let CI be the full run · `pnpm doc:reanchor` missed 27 bare continuations on PARTLY-moved multi-citation lines in one run (`ee62a839`) and `verify:doc-stats` arm 4 passed them green (it checks only that the line exists and is not blank — insight 136); after every re-anchor run a POSITIONAL pair-check — pair each bare token with the named citation it continues, re-read both lines at HEAD and on the tree, fix by content (754 pairs that day) · a stray `cat > file` with no heredoc blocks forever on stdin and leaves an EMPTY file behind — write scripts with the Write tool · `node -e` given a Git Bash path (`/c/Users/…`) inside a JS string resolves it as `C:\c\Users\…` (ENOENT) — put the script in a `.cjs` file and use `__dirname` or `C:/…` paths · a vite dev server launched in a background shell can survive `TaskStop` and keep its port — find the PID by port, read its command line, then `Stop-Process`.
- **From the b9-2 close (2026-10-11/12, D1's Tier-1 key; the ACA step-1 link; the survivor + trim measurements):** background Workflows STALL when the laptop sleeps or its battery dies (23:15 → 15:07 the first night, again at the battery death) and resume on wake — never promise overnight work without an awake machine · uscode.house.gov relaunched as a static "temporary format" by 2026-10-10: the old `view.xhtml` / `currency.shtml` forms answer HTTP 200 with a 5,792 B "Page Not Found - US Code" body (and for two days a stale 14.6 KB house.gov maintenance body — the pilot called a dead URL an outage on 10-11; Briggsy called it) — fetch the ROOT and follow its links, check the BODY, never the status or `<title>`; the ACA record's `forwardClock` carries the URL forms · `node -e "…"` in Bash runs backticks as commands — it inserted a holed bullet into `backlog.md` this session (caught in the diff, rewritten from a script file); any script text with backticks goes in a FILE · `pnpm doc:reanchor` met three more shapes (the register entry's ⚑ 2026-10-12 bullet) — run it ONCE per base, read every "(bare, after" line AND every line citing a moved file for a second bare token, restore historical citations (insight 136's copy citation — written here as 1186, and the tool moved this mention too, to 1199 then 1214; corrected 2026-10-16: the as-written value is 1178, see the b9-toronto3 bullet) by hand · Git Bash `grep -c $'\r$'` cannot count CRs (it read 0 on a CRLF file) — count line endings with node · a LOCKED-text amendment needs a text refuter: the council's own D1 draft stated the lower-bound relation backwards and five of six elders first drafted the false floor ≥ full lemma — both caught only by the red team / refuter · a commit landing mid-measurement moves the agents' line citations (the trim chair re-pinned `copy.ts` after `b29a550d`) — re-pin at the chair.
- **From the b9-1 close (2026-10-08/11, Playwright 1.63 + the `ubuntu-26.04` pin; the essentials-floor measurement; the survivor-medical lean):** NEVER revert a planted mutant with `git checkout -- <file>` on an uncommitted tree — it restores HEAD and wiped a delegated build's whole `copy.ts` (recovered only from a verifier's scratch `.orig` + the agent transcripts' Edit inputs); snapshot with `cp`, revert with `cp`, prove with `cmp` · `playwright install` GARBAGE-COLLECTS every browser revision no linked Playwright still uses (`%LOCALAPPDATA%/ms-playwright/.links`) — a version rollback must re-run the install · `pnpm doc:reanchor` rewrote the FROZEN `e2e/held/fit-24px-measurements.md` (its header: numbers NOT maintained) — `git checkout` that one file after any reanchor (it carries no other uncommitted work) · the doc-stats citation arm checks a workflow-file line EXISTS, not that it says what the doc claims — four `.github/workflows/verify-the-back-nine.yml:<N>` citations were 1–4 lines stale before any edit; re-point by content after any workflow edit · the council's `uiCouncil` regex auto-seats the three UI specialists on words like "band" / "render" in the CONTEXT — name the six core `openers` explicitly for an engine question · ENGINE_PRICING_LEDGER row `shippedOn` must equal the commit's LOCAL date and no test binds it — re-stamp it in the commit if the land slips a day · a 16k measurement workflow over many off-roster variants ran 6.8 h (ship gate 1, `wf_d98e02fb-08c`) — budget the wall clock, keep the session's other CPU work off it · the window script once reported 3.6 % mid-session (it read another transcript) — distrust a sudden drop, re-run it.
- **From the b9-2 close (2026-10-04/06, the pay-less-tax all-in build):** NEVER `git commit -a` in this monorepo — the root spans every project and it swept six uncommitted family-feud files into `1dd80ecc` (backed out by `7571d1a5`, working copies restored); stage explicit paths or `git add -A .` from the project dir, and read `git show --stat HEAD` before pushing · `pnpm doc:reanchor HEAD` is NOT idempotent on an uncommitted diff — a second run re-shifts citations the first already moved; for a later edit on an already-re-anchored tree, make a temporary LOCAL commit of the tree minus the new edit, re-anchor against it, then `git reset --soft HEAD~1` · in Git Bash `grep -c $'\r'` counts EVERY line (the pattern collapses to empty) — check line endings with node · uscode.house.gov serves a house.gov "Under Maintenance" fallback to EVERY client (curl, real Chromium, an external proxy) — the URL is right, the site is down (⚑ 2026-10-16 doc audit: true through 2026-10-09 only — `f2093b1b`: the site relaunched by 2026-10-10 at new static URLs, and from then the old `view.xhtml` path's maintenance body meant a DEAD URL, not an outage; the b9-2 (2026-10-11/12) bullet above governs); a web-search summary said it was live and was stale crawl data — trust only a fetch · two workflow reviewers each running the full suite in parallel produced an artificial 123 s timeout on a 21 s solve test — never bump a time budget on contention a workflow created; re-run the suite alone · a workflow agent can return a non-report ("Waiting for the full-suite notification") — verify the tree yourself, never trust the chain · a GitHub "runner has received a shutdown signal" red (run 37374864752 on `b3284566`) is infrastructure, not a test failure — confirm by the log, then by the next run · the pay-less-tax Tier-2 statistic is ALL-IN since v10 (`lifetimeAllInCostPerPath`, one home); `lifetimeTaxMeanReal` still means income tax and a source-bind test keeps it out of the five read sites — never re-point one site alone.
- **From the b9-7/b9-8 close (2026-10-04, the v10 roster-recall + the ACA re-verify):** `EnterWorktree` FAILS on this monorepo — four insight filenames overflow MAX_PATH under `.claude/worktrees/<name>/`, and the failed attempt leaves an orphan `worktree-<name>` branch (delete it): use `git -c core.longpaths=true worktree add -b <branch> C:/wt/<x> HEAD`, then `git -C C:/wt/<x> config core.longpaths true` and `pnpm install --frozen-lockfile` in the project (6 s) · a cost cap and a coverage goal can be STRUCTURALLY incompatible on ~linear cost — count the roster at the candidate spacing BEFORE a ruling (the roster dump: `buildSolveRequest` over `DEV_SEEDS`, distinct grid amounts per seed); the v10 ruling's +33 % cap admitted ~7 amounts beside `retired`'s 22, knowable before the council sat · a solve-cost model fit on two measured roster sizes (F + slope × roster) predicted the third within 1–4 % — validate on the held-out point, then compute any closed form from it · ranking stability scores the WHOLE roster on BOTH seeds and the crown search adopts that pass (`rankingStability.ts`), so a "cheaper seed A" scheme cuts per-candidate cost to 0.625 at best · a council can read shipped copy as unscoped — open `copy.ts` before relaying a disclosure brief (`recComposeAlready` already said "we tested") · uscode.house.gov can serve an HTTP-200 "Under Maintenance" page on EVERY path with no redirect — check `<title>` before trusting a read (⚑ 2026-10-16 doc audit — SUPERSEDED 2026-10-12, `f2093b1b`: `<title>` alone is not enough — after the relaunch (by 2026-10-10) the old paths served that maintenance body for two days, then a "Page Not Found" body, each a DEAD URL on a live site; fetch the ROOT and check the BODY, per the b9-2 (2026-10-11/12) bullet above and the ACA record's `howToClear` step (1)) · ACA retrieval mechanics (control-proven): congress.gov bill pages Cloudflare-403 → govinfo BILLSTATUS bulkdata, parsing the bill's OWN `<actions>` (the first `<latestAction>` can be a related bill's); the Senate calendar package is `CCAL-119scal-YYYY-MM-DD`; the Federal Register API needs `curl -g`; eCFR's versioner needs `--compressed` · two branches touching ADJACENT TODO lines conflict on rebase — take one side (`git checkout --ours`), re-apply the other through its own script, grep both markers · the Playwright MCP writes `.playwright-mcp/` into the project root — delete it after any browser check · a scratch `*.test.ts` anywhere under the project is counted by `verify:doc-stats` (3864 / 203) — rename it `.off` or keep it outside before any gate.
- **From the b9-4 close (2026-10-03, the solve-time levers + the pool's generator foundation):** his LAPTOP STATE swings a solve's wall clock ~2× on the same code (`retired` 639 s on 10-01, 338.5 s on 10-03, both on AC / High performance, cause not recoverable) — compare timings only WITHIN one session, take a same-session baseline before every re-time, and never mix days in one table · node runs the engine ~2.5× slower than Chrome (the identity gate's 256-path `retired` solve ~11 s in vitest) — vitest runs one FILE's tests serially, so a heavy fixture goes in its own file to run in parallel (`solvePayloadIdentity.health.test.ts`) · `verify:doc-stats` counts any `*.test.ts` under `src/` — a scratch runner (the digest anchor, the call-sequence recorder) lives OUTSIDE the tree and is copied in only for its run, then deleted (the session's two were `zzAnchor.test.ts` = `bitDigest` of `solveWithMint` payload + `packSolveWire` on F1–F4 / F6 via `identityRequest`, and `zzCalls.test.ts` = `vi.mock('@engine/simulate')` recording `bitDigest([params, seed, options])` per call, shipped AND legacy — re-create them from that description; the scratchpad is per-session) · a HEAD-vs-tree differential by `git stash push -- src` leaves UNTRACKED files in place — sound only while HEAD's code imports none of them · `node -e "…"` in Git Bash interpolates backticks (it ate a docblock's identifier) — any edit carrying backticks goes through a script FILE or the Edit tool · an FNV lane with an EVEN multiplier flushes to a constant over a long walk (`bitDigest`'s first cut — a 64-bit digest with 32 live bits); both halves are now pinned to vary · one added import line in `intakeMap.ts` moves ~90 citations — `pnpm doc:reanchor HEAD` handles them, never by hand · a mutant plant must be grep-verified as LANDED and the file `cmp`-restored after (`scratchpad/plant.mjs` refused a missing anchor with exit 2 — re-create it: replace one exact string or exit 2).
- **From the b9-3 close (2026-10-01/03, the production-build timing instrument):** the production build DCEs `?seed=` / `?vault=` — a dist drive PLANTS the household with the dev `plantDevVault` from a harness injected on the control origin :4181 (CSP blocks injected script on :4180), then unlocks it as a returning user (`e2e/held/solveTimingPlant.ts`) · vite's library mode (the IIFE harness bundles) leaves `process.env.NODE_ENV` for its consumer, so the bundle threw `process is not defined` at load — `define` it "production" — and `page.addScriptTag({ content })` RESOLVES even when the script throws: assert the global (`typeof window.X`) with the `pageerror` text in the message · Playwright's default headless is the chromium HEADLESS SHELL, not Chrome; `channel: 'chrome'` drives the installed Chrome in new headless (Context7-checked) — the instrument's browser · a solve timing needs an idle machine: the batch ran ~58 min serially with nothing beside it (no vitest, no doc-stats, no second solve) · the FIRST full suite after the machine sat idle two days red `copyFence.test.ts`'s cold-ESLint arm at its 30 s timeout (import 226 s vs 142 s, environment 248 s vs 105 s on the warm rerun, which was green 3787 / 190) — read the run's phase times before diagnosing, and never bump that timeout on one cold run · tsx runs a `.ts` outside the project as CJS (top-level await fails — use `.mts`) and cannot resolve `vite` from the scratchpad — import it by its `file:///…/node_modules/vite/dist/node/index.js` URL · a held instrument with its OWN config needs `e2e/held/shots.config.ts`'s `testIgnore` beside it, or the partition gate reds the double claim (mutation-checked: it does) · the dev-era "~90 s nc HOLD" figure was stale in four places — FIXED `3c9411f9` (the walk re-budgeted on the pool).
- **Claude Code substitutes `$N` / `$ARGUMENTS` ANYWHERE in a SKILL.md body** (not only in `!` commands) — a literal `$0` or `$2,800` in a project skill silently becomes the user's argument text. Write literal dollar-digits as `\$0`; never put `$<digit>` in an awk/shell snippet inside a skill (use `$NF` or a script file). Found and fixed 2026-09-30 in caddie, back-nine-design, web-design-guidelines and /distill.
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
- **`verify:fit` does NOT measure the recommendation surface** (`e2e/vertical-fit.spec.ts:736-746`
  excludes the committed + held renders — the exclusion dates from 2026-07-22, before the worker pool, when a dev-server solve ran 80–200 s+ against the then-120 s per-test budget (now 180 s, `playwright.fit.config.ts:57`); on the pool a dev-server `solve:nc` / `solve:surplus` takes ~30 s at the laptop (`e2e/caddie-walk.spec.ts:887-889`), and on CI's 4-vCPU runner (pool P = 2) the RV gate's `?seed=surplus` pending-to-lockup wait — measured on the v9 build, its per-arm figures in `COMMITTED_LOCKUP_MS`'s docblock (`e2e/chart-text-rv.spec.ts:49-52`, `12e40395`) — has run with its worst arm close to this harness's 180 s per-test budget, but the fit arms still inject the committed lockup and never wait for a committed solve). So *"seat it and re-measure
  under `verify:fit`"* is **unexecutable** for anything in `.rec-committed__rest`; it needs a MANUAL
  1536×791 measure. And the *"~89px headroom"* number is the SPINE idle frame (`vertical-fit.spec.ts:2483-2485`), a once-measured
  prose figure the spec never asserts — **never budget a different surface against it.** The DATE route's
  arms assert ORDER + REACHABILITY only (spec header `vertical-fit.spec.ts:22-23`) — no date frame has ever been fit-measured either.
- **A live solve is tens of seconds to minutes — budget for it.** On the PRODUCTION build at the laptop with the worker pool
  (2026-10-03, `e2e/held/solve-timing.spec.ts`, P = 12, `SOLVER_CODE_VERSION` 9's rosters): `retired` **36.5 s**, `nc`
  **39.8 s**, `healthnc` **150.9 s** — a healthcare household pays a second full search (the named-driver probe), and the
  ~2× slow laptop state doubles every figure (`healthnc` ~5 min). `buckets` has not been re-timed on the pool. A device
  with ≤ 3 logical cores gets no pool (`poolSizeFor` ⇒ 0) and runs the single worker (`healthnc` ~9 min at v8 — `225d8da4`'s
  554 s single-worker baseline — unmeasured at v9). The single-thread v8 figures (2026-10-01: `buckets` 8.9 min, `retired`
  10.7, `nc` 12.1, `healthnc` 26.0) predate the share-the-pass + probe-skip levers (`10bcba05` / `55cd7382`), the pool and
  v9, and do not carry; quote the figure for the household AND the pool size you are actually driving.
  Prod DCEs the dev seeds — a dist drive that needs a committed recommendation PLANTS the household (`e2e/held/solveTimingPlant.ts`). Before calling one frozen, measure CPU on the Playwright renderer
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
  LAN IP over http — serve the phone with `pnpm dev:phone`.
- **`verify:fit`'s `?seed=dip` arm is LOAD-SENSITIVE and can red the whole gate on a busy machine.**
  Measured 2026-08-05: it PASSES isolated at 1.1m and FAILED at 1.5m inside the full parallel run, on
  `gotoSeedFinal`'s final-tier wait (`FINAL_TIER_MS` = 150 s today, `reviewSurface.ts:101`; it was 90 s when this was filed) — the heaviest date seed
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
cost the next one.** `recommendationView.ts:244-249`: `noChange` **OR** the grade's `subTenthCollapse`
**OR** a seed-B display inversion **OR** a delta that formats to $0. So *"the surface says **You're
already on one of the strongest paths**"* is **NOT** evidence that `noChange` is true, and a browser
frame can be byte-identical before and after a change that genuinely flipped the flag. Read the payload,
never the words, when the question is about a flag.


*The dated blocks below, newest first, were moved here 2026-09-25 out of the session records they were written into (the
records themselves are cut — `git log` is the history).*

**LANDMINES (2026-10-30, b9-3):** `$'\r$'` inside a `$(…)` substitution in a Bash `for` loop matched EVERY line, so a CRLF count
read "all CRLF" on pure-LF files — count line endings with a byte loop (`node -e` over `readFileSync`), never grep in a
substitution · the Phase B review left a `node_modules` JUNCTION in `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-phaseb-review\head\` and `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-phaseb-review\verify-correctness\` — remove each link alone
(`cmd //c rmdir <folder>\node_modules`, or `cmd /c rmdir` from PowerShell) before deleting either folder · a prop added to a
component's TYPE but not to its destructure silently resolves to any same-named module binding (`describedBy` in `fields.tsx`);
a `(s): s is string` filter guard then hides it from tsc — destructure first, and name a new prop so it cannot collide.

**LANDMINES (2026-10-03 late, b9-5):** the worker script exposes `{ ...engineApi, ...poolApi }` and `EngineHandle` is SPINE-only (`Promisified<EngineApi>`) — a new pool method goes on `poolApi`, never forwarded by the resettable handle; a new `EngineApi` method still breaks every hand-rolled fake by design · a fake pool lane must `structuredClone` its REPLY (the wire) or the candidate re-attach is never exercised — and a pooled differential must tally lanes (≥ 2 used) or a silent one-lane fallback passes as a pool · a count-ZERO assertion on a lazily-chunked node passes VACUOUSLY — `svg.rv` toHaveCount(0) passed on PHONE with the chart planted back, the Suspense chunk not yet mounted; pin the synchronously-rendered box (`.rec-viz-box`) · the Caddie walk's solve budgets (300 s lockup / 480 s test, `e2e/caddie-walk.spec.ts` `SOLVE_LOCKUP_MS`) are SHORT of a single-thread solve on purpose — a `solve:` red there is a pool regression until proven otherwise · `pnpm doc:reanchor <BASE>` a SECOND time after `--apply` re-proposes the applied shifts (it diffs against BASE) — never apply twice; and it shifted a bare `:725` following `taxOverlay.ts:673` (then UNCHANGED — both are 2026-10-03's numbering; the register's *`tax.rmdStartAge` vs 26 CFR 1.401(a)(9)-2(b)(2)* entry carries the live pair, and `ee62a839`'s run moved only the named one here, to 677) by `solveAnchor.ts`'s diff ("bare, after solveAnchor.ts") — read every bare continuation's governing file before trusting the shift (a fourth blind class beside the register's Tier 4 two) (filed in the register 2026-10-03) · the roster measurement recipe: a tsx script OUTSIDE `src/` (doc-stats counts `*.test.ts` under it) over `DEV_SEEDS` + `buildSolveRequest`, run on the tree, then `git stash push -q -- src`, run, `git stash pop` — sound while the new code adds no untracked file the script imports · `solve-timing.spec.ts`'s `lockupText` stops before the plan card — the crowned AMOUNT is not in the capture; read the hero delta, or extend the capture before claiming what was crowned · a rewritten engine block can leave a TEST name stale where no citation points — grep the old behavior's words after a refactor (the IRMAA window arms' titles still name `firstCrossingMagiYear`, correctly; the ACA / bracket arms say `firstCrossingYear`).

**LANDMINES (2026-09-28, b9-1):** a "holds across years" check composed from TWO years' frames (year-k lines, year-0 income) describes no real year — and a constant-income witness world makes the mixed and true frames agree, so the suite AND the mutants go green on it: list whose year each term is read from, vary the spanned axis in one witness (insight 139) · an enumerator change moves every real-solve witness's wall time ∝ roster: after one, tabulate per-test CI times across runs (strip ANSI with node; an older run's log labels the step `UNKNOWN STEP`, not `Run pnpm test`) and re-budget any 60 s solve witness past ~50 % — `health` read 21 → 43 → 60 s (v7 / v8 / a slow runner) · the CI runner varied ~1.4× across the board within an hour (`datesplit` 141 → 203 s) — a docs-only commit CAN red; read the table before calling it a flake · the TODO's own prescription can be wrong ("AND a ledger row") — the ledger's discipline and its pin test are the source; a contradiction is resolved at source before building · SSA dime-floors the monthly benefit (POMS RS 00615.101): a $20,000 PIA is $19,999.20 a year — a hand-derived Social Security figure that ignores it disagrees with a correct engine (insight 091's direction) · the constants gate flags a pinned figure typed in a test (`109000`) — READ the pinned figure, type only the algebra · `devSeeds.test.ts` is CRLF: script edits need per-file EOL detection + a match-count guard (the first try matched 0) · a long heredoc AND a `node -e` with backslash escapes both mangled again — write patch scripts with the Write tool, then `node <file>` · a re-anchor is owed after EVERY line-count change, even a comment (the 7-line budget comment moved two `act4-u17` spec citations; doc-stats' structural arm stays green on that rot — insight 136).

**LANDMINES (2026-09-27, b9-11):** a fixture or dev plant saved at the WALL CLOCK's today sits on the ledger's ambiguous ship day whenever a row lands — it reds CI on exactly that day and greens the next; stamp "saved by this build" at `FIRST_UNAMBIGUOUS_SAVE_DAY` (every existing fixture and plant already does); a date-derived pin (`?vault=stale`'s note count) is DERIVED from the ledger in both its unit arm and its fit arm, never hand-typed · the witness digests see the exported PRICERS only — a change to how they compose (the gross-up, the IRMAA lag, RMDs, the draft → params map beyond `escalateQuote`) moves no digest: append the row by the discipline, not by the red · the ONE width seam: a new `@media (min-width: …rem)` fails `breakpoint-mirrors.test.ts` unless it mirrors `--bp-laptop` (68rem) — a new tier is a product decision · the Bash tool truncated a long heredoc AND interpolated backticks inside a double-quoted `node -e` again — write the script with the Write tool · Git Bash's `sed`/`cat -A` hide CR: count `\r\n` with node before trusting a line-ending read.

**LANDMINES (2026-09-27, b9-10):** Git Bash's `grep -q $'\r'` and `sed` HIDE a file's CR — a CRLF file (`healthSheetChrome.test.ts`, `copyGuard.test.ts`) read as LF and a string rewrite silently matched nothing; count EOLs with node before any scripted edit, and give every scripted rewrite a match-COUNT guard (it caught both misses before they wrote) · a stray `cat > file` with no heredoc waits on stdin and hangs the whole Bash call to its timeout — nothing after it runs · a price fix can make a witness VACUOUS: at the bill-year prices both seeds round the two-of-you figure the same whether formatted once or as 2 × the rounded one, so the chrome arm's formatted-once pin went dead on the re-pin — rebuild the witness on a fixture where the two roundings differ (an aged 2024 start), and plant the mutant to prove it · a true price can read as a BUG next to a figure a reader thinks it should resemble — the Part D surcharge ~3× after the 2030 reset read "too big" to two seats; the fix is the LABEL, never the number · a scope clause can trade one misread for a rosier one ("on your drug plan" read as escaping on a $0 plan) — one refinement, then park the words with every draft as the brief; rosy outranks confusing, so revert to the confusing-but-not-rosy wording · compute the closed form before searching for a plant: `room` ⇒ joint survival ≥ 0.90 and the survivor subset ≈ every path, so `survivor-short` is unreachable — 612 engine runs only confirmed what one line of arithmetic said · a Caddie walk of a never-walked seed can hang on a product defect (the no-pretax Roth sheet had no Close) — read the dialog snapshot in `test-results/*/error-context.md`, and fix the product, never the harness.

**LANDMINES (2026-09-27, b9-sotd):** a UI-cost number measured in NODE is not the app's cost — the spend solve read 27 s / 13 s under node, 5.1 s / 2.4 s in laptop Chromium and 4.7 s / 2.8 s on his phone, the same figures to the dollar; the council row nearly ruled its dissent on node's number ("slow: it is") — time a UI claim in a browser · an instrument that writes the DOM its MutationObserver watches re-fires itself forever and freezes the main thread it measures (the first phone-profile cut did) — poll, and prove any instrument on laptop Chromium before his phone · the phone rig: the laptop was 192.168.1.151, Windows labels the home Wi-Fi *Public*, and node already holds inbound Allow on Public + Private — `pnpm dev:phone` reaches his phone with no firewall change · `pnpm doc:reanchor` skips self-citations and ambiguous basenames (the Tier 4 entry) — in a parallel fix pass a number into ANOTHER file is its HEAD number, a self-citation the post-edit one, then the tool ONCE, LAST · `gh run list --commit <short sha>` returns nothing (it wants the full sha) — a watcher on an empty id "completes" having watched nothing; select by `headSha | startswith` · Windows `execSync` runs cmd.exe, which eats the `^` in `X^{commit}` — use `execFileSync('git', [...])` · `git diff --check` flags a CRLF file's `\r` as trailing whitespace — confirm real spaces before touching anything · a code-driven DELTA doc audit found 105 stale claims 21 h after a full audit and hours after a 100-agent review that restored five — after an engine-meaning commit batch, run one (`4c6b3e4f`'s message is the recipe).

**LANDMINES (2026-09-26, b9-8):** a level-clamped index is only honest for LEVEL reads — a ratio `index(a) / index(b)` whose `b` sits at or before the anchor silently deletes the clamped span from the GROWTH (tiers 1–4's August-2025 base; insight 138) — and a hand oracle that uses the same index map re-derives the defect: count the source's own years · an "equivalent" mutant is a QUESTION before it is a record — ask why the branch cannot matter; "the input is flat there" was the defect's fingerprint · the IRMAA tier readers REQUIRE the compared schedule at the RIGHT MAGI year — the four clocks are in architecture §7.2; a new reader picks its clock there, never `irmaa.value` (the brand makes that a compile error) · the citation re-anchor is `pnpm doc:reanchor <BASE>` (the 2026-09-14 landmine) — this session re-invented it in scratchpad scripts (verified byte-identical, but the tool owns bare continuations and freezes); a bare `:NNN` on the line AFTER its governing `file.ts:` is invisible to a line-scoped remap (`model.ts`'s `:658` into `fingerprintOf` had been stale since before this session) [2026-09-26 delta doc audit: two more classes the tool never re-anchors — a file's citations of ITSELF (`base === selfBase`, `scripts/reanchor-citations.mjs:82` / `:102`; `intakeMap.ts`'s four self-citations rotted +26 in `e04823a4`), and, outside a narrow edge of its 60-char window, a bare continuation after a `.tsx` name (`LAST_FILE` tries `ts` before `tsx`, `reanchor-citations.mjs:58` / `:63`, so it resolves a phantom `AssumptionPanel.ts` and skips — `copy.ts`'s `entered * 12` anchor rotted that way in `6e4c065d`; where a same-stem `.ts` exists, `controlPreview`, it can move the token by the WRONG file's diff) — grep both classes by hand after `--apply`] · several test files are CRLF (`ConfidenceStatement.test.tsx`, `magiLandscape.test.ts`, `magiLandscape.pbt.test.ts`, `partBTrend.test.ts`, `healthSheetChrome.test.ts`) — edit through an EOL-preserving script or the Edit tool, and check `git diff --stat` deltas · a review fan-out's result is too big to read whole (270 KB for 100 agents) — parse the `.output` JSON's `result` field with node and print a table; never cat it · a UI number moved by an engine fix (the step card's $218,000 → $224,000) is a visible change inside an unchanged sentence — say so to him the same turn, the words-are-his law covers meaning · the phone profile needs the home LAN (see (1)).

**LANDMINES (2026-09-26):** `pnpm test | tail` REPORTS EXIT 0 ON A RED SUITE — the pipe eats the exit code; capture it (`pnpm -s test > f; echo exit=$? >> f`) and grep `Tests ` for the fail count · `test.use({ reducedMotion: 'reduce' })` does NOT apply under `playwright.fit.config.ts` — `matchMedia('(prefers-reduced-motion: reduce)')` measured FALSE, so the 24 px reduced-motion arm had been passing on an unmet premise; use `page.emulateMedia({ reducedMotion: 'reduce' })` and ASSERT the premise · a new `EngineApi` method breaks ~21 hand-rolled test fakes (the `EngineHandle` mapped type makes each a compile error, by design) and the `memoryModel.test.ts` fake defaults `runningInWorker: true` — a lane gated on the worker DOES dispatch there; stub it inert · the spend lane lands a beat AFTER `data-answer-tier="final"`: a capture must wait out `.cs-magnitude[data-spend="pending"]` (the Caddie walk does since `2f43761f`), while a fit arm measuring right after `final` is measuring the RESERVED pending box — both states are laws · a line-count change in a heavily-cited file reds the full suite's citation arm on the NEXT run; re-anchor at each commit boundary (97 edits after phase B), not only at the close · a proxy that reads as honest to eight machine seats can still be WRONG — probe the engine AT the quoted figure before debating its words (the trim clause's council found the ~2× error in its clerk's first run) · a council's draft copy is a floor, not the words — his read cut its duration phrase; offer the lean form, then take his ruling and record the evidence honestly (the "how long?" was the pilot's question, not his).

**LANDMINES (2026-09-25 late):** a statute-frozen figure deflates by the price index of the year whose income it is COMPARED with, never the year it is published for — the NC deduction, the senior bonus and the HSA catch-up meet same-year income (the sim year's index is right); IRMAA compares MAGI two years older, so its frozen top line was already exact through 2027 and the pilot's bill-year deflation was harsh-wrong (built, refuted by the review, reverted; insight 135's refinement) · a statute check must ask "compared with WHAT?" as well as "does the statute index it?" — the pilot confirmed the freeze and stopped · the biggest find of a statute read can be its SIDE NOTE (the per-person phase-out came back as an aside to an indexing question) — read the primary form yourself before acting (Schedule 1-A Part V) · an "externally derived" fixture is independent only along its source's axis: hand arithmetic over the research strand's rule is one witness, not two (insight 137) · a band fixture guarded by a RANGE keyed to the old ceiling (`< 350_000`) passes after the band narrows — guard the band's PROPERTY (each spouse's bonus still live) instead · ANY change to a scored overlay's pricing bumps `SOLVER_CODE_VERSION` (the rule is in `solverCodeVersion.ts`; the §86 fix missed it) · a Workflow survived a power outage and completed on its own; the per-agent results were readable in `journal.jsonl` before the completion notice — but refuters that ran AFTER a revert judged the NEW tree, so a "refuted: moot on the current tree" verdict confirms the fix, it does not clear the finding · the insights' long filenames exceed the MSYS path limit: `git show HEAD:<path>` fails with "Filename too long" and a shell EOL check silently reads garbage — count with node (`git -c core.longpaths=true show`) · `pnpm doc:reanchor` SKIPS an ambiguous basename (`stateTax.ts` exists in `src/engine/` AND `src/engine/constants/`) — list every `stateTax.ts:N` citation, read the HEAD line it names, locate that content on the tree, and hand-fix AFTER the tool's `--apply` · `vitest` swallows `console.log` AND a temporary instrument under `src/ui/__tests__/` runs inside the full suite — name it `zz*`, pass its output path by env var, and DELETE it before staging (it fails the suite without the var) · 57.9 % context after one build + one 25-agent review: stop at the build boundary, never start the next Tier 0 in the same window.

**LANDMINES (2026-09-25):** a Workflow `resumeFromRunId` after a session-limit death REPLAYS the finders but RE-RUNS every nested verifier — not just the dead ones (journal: 384 started / 299 results for a 206-agent run; two verdicts changed) — budget a resume as a full second pass of everything after the first nondeterministically-ordered call · a finder lane briefed "Location A = the correct version; otherFile = the wrong one" files `file` = the CORRECT side — group fixes by `otherFile` for that lane or the wrong owner gets the finding · the TODO chronicle's root cause was the user-level CLAUDE.md end-of-session line asking for "what we did" while the squeaky skill forbade it — both fixed 2026-09-25; the skill's PRUNE step is what keeps this file short, and a close that appends without pruning has regressed it · `git ls-files --eol` read TODO.md as `-text` (mixed endings) before the audit; it is LF now — the Edit tool cannot match a lone CR, and a whole-file rewrite shows as a thousand-line diff · a link scanner that walks `[text](target)` with a simple regex mis-calls insights 046 / 050 / 095 orphans (nested parentheses in the link TEXT) — they are indexed; check the README before believing an orphan list · two fix judges can disagree on a date (Act 4 "closed" 2026-07-27 at U17·S6 vs the 2026-08-02 declaration); one pass must RULE it and sweep every live copy, or the docs fork · an audit's finder that quotes a hard-wrapped doc line gets refuted for "not verbatim" unless the refuter is told the docs wrap with a 4-space indent — say so in the brief.

**LANDMINES (2026-09-24 evening):** a sentence written into a canonical doc BEFORE the measurement must be hunted down AFTER it — the pilot's refuted "cap binds, seeds didn't move" survived in architecture §7.1 and a test title until the review fleet read them · a sweep's sibling list is the AUTHOR's memory — the review found three more frozen-nominal figures in the same class (grep every constant whose citation says frozen / fixed / not indexed) · the docblock line in a heavily-cited file costs a re-anchor: three lines added to `taxOverlay.ts`'s `GrossUpContext` moved 94 citations (all mechanical, 0 hand review — but run the DRY RUN and read it) · a `min(cap, tier)` binds on whichever arm is SMALLER for the actual inputs — compute BOTH before predicting "no change"; a cap that scales with the benefit is nothing like a threshold that scales with nothing · "frozen" is a NOMINAL statement — in a real-dollar engine it means "divide by the price level every year", and flat-real is INDEXED, the rosy way; the sibling test is "does the statute index it?", never "is it a dollar figure?" · the vitest config swallows `console.log` — an instrument must write to a FILE, or it "passes" in 341 ms having said nothing · a mutant script MUTATES source on disk — never run it while any other vitest or measurement job is reading the engine · the dev seeds are FIXTURES with named states: when the engine's truth moves one out of its band, record the move at the old inputs in the docblock, then re-tune the smallest knob that leaves the other pins' figures alone (the IRA; spending would move the health-sheet MAGI too) · a hand-typed engine number in a test (the trim gate's −7,500) is a pin that moves with the seed — read the new number off the failure and re-pin, never hand-edit toward agreement · `git add -- .` from the project dir, never `-A` from the root (the newsletter file).

**LANDMINES (2026-09-24):** a readout row is the END of a sim-year — a STOCK at row k is "k years out", a FLOW at row k was paid during sim-year k−1 (calendar start + k − 1); print the calendar beside every spoken distance or an off-by-one lives forever (insight 134) · a scout's file:line anchors are CLAIMS — re-open every one before it enters the register (two of the chair's were a different comment) · a `describe`-scoped fixture means a new arm goes INSIDE that describe — the file's last `})` was a different describe's · a helper that loses its last caller reds lint, not typecheck — run both · a background scheduler dirties `../family-feud/newsletter/…` mid-session; `git add -- .` from the project dir, never `-A` from the root. · the `irmaaStep*` copy family lives in `slots` for its templated members — a PLAIN string with that prefix belongs in the `copy` catalog beside `irmaaStepBothBase` (a string dropped into `slots` made `copy.<key>` undefined and the new pins compared undefined to undefined — the render-sample census caught it, typecheck would have) · the citation re-anchor is `scripts/reanchor-citations.mjs` (`pnpm doc:reanchor <BASE>` = the dry run; add `--apply`, or `--only-missed` for the v1-recovery case): per-TOKEN freeze + bare-continuation attribution; run it ALONE from the base — never after the v1 tool for the same base (it would move the named tokens twice; `--only-missed` exists for exactly that recovery).

**LANDMINES (2026-09-23 evening):** a review lens's "these N citations must be hand-fixed" list is a CLAIM — run the re-anchor DRY RUN first (the eleven it named were ordinary `file:N-M` forms the tool rewrites) · a template literal inside the `as const` copy catalog is fine (nothing parses `copy.ts` as source except the new source-level arm; `copyFence.test.ts` reads JSX, not the catalog) · an inline `node -e` whose script string carries backslashes is shell-mangled — a `.mjs` file, every time, even for a one-line patch · a held look spec's style-tag lift must be REMOVED before the next dialog opens (a leaked `max-height:none` made the Roth frame an uncapped sheet no reader sees) · the Roth door's label depends on a committed conversion (`leverRothDoorCta` / `leverRothDoorEditCta`) — a selector on one label silently skipped the other seed; match both and assert the count.

**LANDMINES (2026-09-17):** a fixture family that all carries ONE value (every `READING_FIXTURE` spend is 6,500) BLINDS a mutant to a hard-wired constant and to a held-vs-adopted field — vary the oracle value in at least one arm before trusting a mutant's green (M2 + M5 survived round one on exactly this) · a mutant script's "expected red file" must name a file whose PIN can SEE the plant — the seed gate composes through `resolveStickyDisplay`, never the component, so it can never red a component-only mutant · the reanchor tool maps from `git diff -U0 <BASE>` over EVERY changed file including `.md`, so it runs after ALL doc edits, once; the cites it lists under REVIEW (a cited line INSIDE a modified hunk) are hand-fixed AFTER it, never before · a long `node -e` followed by a heredoc in ONE Bash command truncated silently (the shell reported an unmatched quote at a line the command never had) — scripts go through the Write tool, then `node <file>` · the `caddie-ab` result envelope is JSON with `.result.targets[0].{panels,hunter,refuted}` and only a SUBSET of findings reach refuters (the highs + the hunter's) — read every seat's unrefuted mediums at source before the card says "clean" (the echo-ink entry came from one) · the retired seed's worsened landing is NOT a fit-gated state: measure the base tree (stash → walk → pop, 25 s) before calling a fold overrun a regression.

**LANDMINES (2026-09-14):** the `caddie-ab` seat schema caps observations at 200 chars and a seat that writes 201 dies after five retries — cap the prompt's budget line UNDER the schema (the fix belongs in `caddie.js` + `caddie-ab.js` together; still open — filed 2026-09-25 in the register as *Unscored Caddie tape rows + the increment-4 residuals*' PANEL-SCHEMA RESIDUAL) · a Caddie door crop cuts at a scrolling sheet's fold, so a panel over a tall sheet reads WORDS only and the LOOK is unjudged unless a seat is told to check coverage — make the scroll-and-clip frames BEFORE the panel next time · an inline `node -e` with template literals in a replacement STRING is shell-interpolated (bit again: the digest's refuter lines printed blank) — edit scripts with the Edit tool · the re-anchor tool is `scripts/reanchor-citations.mjs` (`pnpm doc:reanchor <BASE>`); the scratchpad copies are retired · the register's Tier 2 section does NOT open with "the family's other two primaries" — anchor an insert on the `## Tier` header line, never on a remembered first entry · a SECOND config under `e2e/held/` is a second OWNER of every held spec (the shots config collects `**/*.spec.ts` there by design — it is THE held harness); a new instrument is a `.spec.ts` under it, run filtered by file name, never its own config, and never a `.look.ts` (the partition walk only sees `*.spec.ts`).

**LANDMINES (2026-09-13 late):** `String.prototype.replace` with a replacement STRING treats `$$` as one `$` — an edit script that rewrites copy templates (`~$${x}`) MUST use a function replacer or every dollar in the slot silently vanishes (it did: 21 restored, caught by the one-year on-ramp arm) · `grep -q $'\r'` under Git Bash reports LF on a CRLF file — measure EOLs with `git ls-files --eol` or `tr -cd '\r' | wc -c` (the insights README is i/crlf; `devSeeds.ts` and `healthSheetChrome.test.ts` are CRLF, `healthSheetSeedGate.test.ts` LF) · a council's ruled MITIGATION for a red-team hit can be wrong at source (hit #4's "the span bounds the rule") — measure the ruling's own claims before recording them as verified · a dead session's Workflow verdict lives in `~/.claude/projects/<proj>/<session>/tasks/<task>.output` (the `result` field) and its script under `workflows/scripts/` — recover from there, never re-run the council · `retired` has NO health door (post-65-only households render the verdict-level priced note), so its byte-identity is a composer fact, not a walkable surface — the Caddie walks `healthnc` + `healthgap`. [2026-10-16 doc audit: `retired` still has no door (its seed gate says so), but the rest is superseded. Its card is no longer byte-identical: `690bcae0` gave the one-figure arm the singular drug-and-supplement carve-out ("`retired`'s gate gains the line"), and `e17c40e4` made the two-person form dated and "start at" under the both-on-it eyebrow, with Briggsy's trend clause. And the arm IS walkable: `healthss` (62/62) is "the one door-bearing seed on the one-figure arm" (`healthSheetSeedGate.test.ts`; its row in *Scenario seeds* under *Driving the app*), so a Medicare-card change walks all three — `LOOK_SEEDS=healthnc,healthgap,healthss` on the scrolled-card recipe in this section's b9-toronto3 bullet.]

**LANDMINES (2026-09-13 evening):** a Workflow fleet dies WHOLESALE at the session limit, and a script's "≥ 2 votes survive" rule then marks every finding REFUTED with zero votes — read the result's `votes` (or `journal.jsonl`) before trusting a refuted list; `resumeFromRunId` after the reset replays the cached seats and re-runs only the dead ones · the council-log's table header repeats per section — anchor an insert on the FIRST DATA ROW, never the header · a door crop cuts above a tall sheet's actions row — the blocked-Apply look needs the scroll-and-clip harness (this session's scratchpad `look/`; port 4197) · the Edit tool needs a register bullet's exact bytes — Read the lines before Edit, never quote from memory (one bullet lacked the "(two seats, survived)" tail I remembered) · a council's "verified in source" line numbers are the council's — re-open the lines before building (the Card 13 API cites `OddsLadder.tsx:276/:300`) · at 44 % with three fleets in flight the honest call was "finish the open fix, then a freshy" — it held at ~52 %.

**LANDMINES (2026-09-13):** a build brief's "re-point these three citations by hand" and a delta re-anchor tool are MUTUALLY EXCLUSIVE on the same citation — the tool maps from the base commit's numbers, so a hand-fixed citation gets mapped AGAIN (revert hand fixes to the old numbers, then run the tool once, last) · `aria-disabled` is one strand of the `disabled` bundle: jest-dom's `toBeEnabled` goes silently vacuous, a `:not(:disabled)` hover rule starts matching, and Playwright refuses the click (1.60, unchanged in 1.63) (`getAriaDisabled` in coreBundle.js — the installed file lives under `node_modules/.pnpm/playwright-core@<version>/…/lib/coreBundle.js`, not `generated/injectedScriptSource.js`; insight 131) · a CSS rule that reaches a sheet FAMILY re-skins sheets that OPEN blocked (HealthcareSheet: `picked === applied` on arrival; RothLever: an empty plan) — a loud "cannot commit" with no sentence is worse than the mute; make the look conditional on the rendered reason (`[aria-describedby]`) · `--on-brand` and `--paper` are one hex, so a primary whose fill eases from transparent blanks its label for the fade — never transition the fill of a state flip · EOL is per file (the insights index is CRLF, most of the tree LF) — measure with `git ls-files --eol`, never assume · a Caddie door crop cuts above a scrolling sheet's actions row — the look of a blocked Apply needs its own scroll-and-clip capture · the classifier that gates auto-mode Bash can rate-limit mid-session; read-only tools keep working, so route the wait into Read/Grep work · a review fleet of 114 agents is ~11 M subagent tokens and a 460 KB result — digest from the pretty-printed JSON envelope's `.result`, never the raw file · a number that gains a platform label needs every sibling number on its line labelled too — the Linux-ink pass (`a4030a92`) found three Windows-only figures left unlabelled beside the new Linux one, and its own prescription's site list missed five sites that four skeptic passes caught: a filed site list is its author's memory, the sweep is the deliverable.

**LANDMINES (2026-09-12):** the band the app DRAWS is the engine fan CUT at the thin-cohort year (`answerView.ts` → `bandGeometry.truncateFanAtThinCohort`, 24–36 y) — a probe that takes the max over the RAW fan (54–61 y) overstates every growing household's ceiling (health: 15M predicted, 6M rendered; the brief, the review and the `c77bcf24` commit message all carry the raw table — the register is corrected); a seed-level prediction must run the SURFACE's pipeline (`lattice-probe-rendered.mts` in this session's scratchpad: buildSpineParams → runEngine with the app's options → the cut → resolveBandData), and a frame is the only proof · a process COUNT is not a running gate — `ps -W | grep -i chrome` counts his own Chrome windows; ask
`Get-CimInstance Win32_Process` for the COMMAND LINE (`playwright test --config …`, `vite --port …`) and read the gate's own log / `.last-run.json`
before saying "running" (his "I don't see anything running" was Earth) · a Playwright run stopped by TaskStop on Windows leaves its worker AND its
Vite alive as orphans (the `gracefulShutdown` signal is ignored here); a second run on the same port then REUSES that Vite and races the orphan
for cores — kill by PID (`Stop-Process`) before relaunching, and treat a "timeout while setting up page" artefact in `test-results/` as the orphan's,
never the passing run's (`.last-run.json` carries the truth) · a `tsx` probe outside the repo: CJS needs bare `C:/…` import paths; an `.mts` (top-level
await) needs `file:///C:/…` URLs, and `--tsconfig tsconfig.json` from the repo dir for the path aliases inside src · an inline `node -e "…"` with a
template literal is shell-interpolated — the backtick block became empty command substitutions and wrote a mangled brief; scripts in FILES, always ·
the citation re-anchor (`reanchor-delta.mjs`, this session's scratchpad: an old→new line map from `git diff -U0 BASE`, arm 4's grammar, EOL-preserving)
maps from the BASE commit's numbers, so it runs EXACTLY ONCE per base after ALL source edits — a second `--apply` re-maps the already-moved numbers;
its dry run before the fixer's edits and its apply after them legitimately differ (+1 became +8 on one file), so never spot-check an apply against a
dry run's numbers · the review fleet's raw result was 657 KB — chair from `digest-review.mjs` (synthesis first, then survivors with votes), never
the raw file · a "recorded limit" arm that enumerates a set by RUNNING the code is a DND 012 brush — acceptable only when a lens independently
re-derives the same set and the comment says so (the pbt's `[1,2] ∪ [9,12] ∪ [1001,1250]` arm) · a `;` where `&&` belonged let the close chain
push past a red doc-stats (`118e9822`, fixed by `40b14952`) — gate every chain with `&&` · arm 4 attributes a bare `:NNN` after a `.md` citation
to the nearest SOURCE citation on its line — name the file beside every bare continuation.

**LANDMINES (2026-09-11, evening):** `verify:fit` under self-inflicted LOAD reds arms that are green — running `verify:doc-stats` (its
`vitest list` collects the whole suite) twice DURING the fit run redded the two raised-root chart-text arms ("no figure matches
figure.band-figure": the band had not mounted when the audit ran); both pass in isolation and the full 139 passed on an idle rerun
(4.9 m locally). Never run vitest / doc-stats / a build beside a browser gate; a red under your own load is not a finding, and the
idle rerun is the proof · the resampled band LATTICE is the wrong instrument for a spoken year: 49 columns over a 41-year horizon
put the first $0 column at 1.7 y over a grid that reads $0 at year 1 — read the integer grid at the producer seam (`medianGoneYear`)
and measure the instrument before trusting it · no dev seed was pre-65 AND priced until `healthnc` — a register prescription that
names a seed for a cohort must be checked against the seed's ages (`datenc` = 66/65), never trusted · a test that asserts "no
subordinates wrapper" as a proxy for "no relief line" breaks the moment the wrapper hosts a second child — pin the element's own class ·
a re-anchor pass is only as good as its LAST run: every comment edit made AFTER it re-drifts the citations below the edit (three
files moved again this evening after the pass; the fix was a delta pass from a pass-time copy of each file) — make ALL source edits
first, re-anchor LAST, run `verify:doc-stats` last · the pass's blind spot was the BARE continuation (a backticked `:NNN` / a comma
list / a `/NNN` after a named citation) — the 2026-09-10 fleet re-anchored 287 by hand and this pass forgot them; doc-stats arm 4 now
checks every bare continuation against the nearest named citation on its line (a `(not `:NNN`)` record stays frozen), so the class
is gated, but a bare token whose named citation sits on the PREVIOUS line is still invisible — name the file on the same line.

**LANDMINES (2026-09-11):** the Bash tool TRUNCATES a long quoted heredoc (≳100 lines: "unexpected EOF while looking for matching
`''`" mid-file) — write big files with the Write tool, never a heredoc · a glob spelled `**/held/**` inside a `/** … */` block comment
CLOSES the comment ("held is not defined") — describe it in words · an inline `node -e "…"` is shell-interpolated (a backtick runs a
command, `\n` collapses) — put scripts in files · `grep -c $'\r'` in this tool counts the letter r, not CR (the tree is mostly LF, a few files CRLF — `git ls-files --eol`; the
"CRLF" probe was wrong) · the CVD per-chart crops select the bare `svg` — a crown row seated ABOVE the svg is outside them (the plain
`crop-ladder` / `crop-twofutures` / `crop-recviz` crops select the HOST and include it) · a `display:contents` group reports an all-zero
rect — `fold.json` now unions the children (harness fixed) · a 182-agent panel costs ~19 M subagent tokens and ~250 KB of digest to
chair; chair from a digest script, never the raw result, and expect the window to jump ~25 % — start the walk EARLY in a session.

**LANDMINES (2026-09-10, late):** vitest's default include picks up ANY `*.spec.ts` under `temp/` — a throwaway
Playwright spec there breaks `vitest list` and therefore `verify:doc-stats` ("could not collect the live suite"); park
instruments in `e2e/held/` — excluded from vitest AND (since 2026-09-11) named in the CSP harness's `testIgnore`; before that
entry `verify:csp` collected `e2e/**` by default and ran the instrument against `dist/`, CI red on three commits while every local
gate was green — a change under `e2e/` must run `verify:csp` too, and `playwright-harness-partition.test.ts` now gates
one-owner-per-spec (insight 128) · a Playwright `fullPage` capture DROPS CDP `Page.setFontSizes` emulation — shoot the
first frame first and re-assert the root before every capture (insight 127) · `scrollIntoView` reaches through
`overflow:hidden` — a reach oracle scrolls the DOCUMENT and hit-tests (insight 124) · a mutant's label must be what was
planted; predict the arms that CANNOT red (insight 126) · `rem` in a media query reads the browser default — assert the
tier before the law (insight 125) · a `| grep` after a gate returns the grep's exit code — one commit shipped doc-stats red
that way; gate by exit code · never `git checkout -- <file>` to revert a mutant while the tree carries uncommitted work —
`cp` a backup and restore it.

**LANDMINES (2026-09-10):** a content-only read of a cited range misses drift whenever today's lines still "read
plausibly" — six wrong-"correct" verdicts survived that way in one batch; the skeptic that caught them DIFFED the cited
range against the tree at the last re-anchor commit (`61c57ff5`), and a range that was a clean syntactic unit THEN and a
ragged one NOW is drift regardless of how it reads · the citation regex captures only the FIRST number of a comma list (a file name, a colon, then
72,95,120) and nothing of a bare `:232` — both forms are citations and both drift; inventory them separately · a bare token's
nearest preceding named citation is the WRONG file 70 times in 287 (the sentence names another file in prose) — attribution
is a guess a verifier must check, never a fact · a machine crash mid-session leaves the commit and loses the hand-off:
read `git log` before the START HERE, and treat any "OWED" line older than the newest commit as suspect · the Dell's crash
corrupted the monorepo's `.git/index` (all-zero header): back it up, delete it, `git reset` rebuilds it from HEAD with the
working tree untouched; `fsck` proves nothing else was hit.

**LANDMINES (2026-09-08):** a `council` Workflow can lose EVERY elder to the 5-hour session limit and returns a "hawk
seat crashed → re-dispatch" verdict — never execute one; re-dispatch after the reset · jsdom 29 has NO
`document.scrollingElement` (the TS lib types it non-optional) — the guard must be nullish, a `!== null` check threw in 60
tests · `settleLayout` ENDS in `scrollTo(0,0)` — a gate whose subject is the scroll position must not call it before
measuring (the first mutant went green for exactly that) · a Playwright `.click()` scrolls its target into view — use an
in-page `button.click()` when the offset is the subject · `?seed=datesolo` NEVER stamps `data-answer-tier="final"` (the
refusal witness), so `gotoSeedFinal` times out on it — anchor on `main.result` · Playwright's 390×844 mobile emulation
reports `innerHeight` 862 (870 on the first step) against a 844 `visualViewport` — pick one deliberately · WebKit has no
`navigator.storage.persist()` — record, never assert · `git diff` elides binary assets — the icons patch needed
`--binary`, or the manifest ships pointing at files that do not exist · a `--` inside an SVG XML comment breaks the
rasterizer SILENTLY · `copyGuard.test.ts` is CRLF (the one CRLF file seen this session) — detect EOL per file, always ·
a canary that enumerates the LIVE catalog (`Object.keys(slots)`) is not redded by a fixture-only mutant — plant in
`copy.ts` · the CSP real-intake test ran under Playwright's 30 s DEFAULT with 60 / 90 s waits inside it (dead letters:
a matcher timeout never clamps to the test deadline, and no custom message prints) — `test.setTimeout` scoped to the one
heavy test · `<ChartReadoutRow>` renders in BOTH seats and marks `data-active` either way — seat-aware locators, never
an OR · taps and hovers land in VIEWPORT coordinates — on a 390-tall viewport scroll the target into view first ·
`gh run list --commit` needs the FULL sha; match `headSha.startsWith` instead · a detached
`pwsh -Command "cmd *> log; Add-Content …"` never appended its exit line — read Playwright's own summary · the digest's
anchors were three days stale on EVERY item (chart-text.spec.ts 254 → 1,750 lines) — the builders re-derived all of
them, and a verifier that trusts a skeptic's line number is as wrong as one that trusts the verifier's.

**LANDMINES (2026-09-07/08):** `e2e/` is outside `tsconfig.json`'s include — nothing typechecks the specs,
so every new audit field needs a non-vacuity pin (the `data-ct-priority` pin is the pattern). Ink px differ
by rasterizer — 45.0 Windows / 42.0 Linux for the same glyphs (insight 118): pin structure by TEXT, floor ink
with a cross-platform margin, never a Windows number. A synthetic tap at an element's EXACT edge dispatches
nothing on 390@3 (insight 119) — inset 1 px. `test.fail` + a timeout = a real failure (insight 120) —
instrument tests measure first, assert last, and load ONCE (`setRootFont20` BEFORE `gotoSeedFinal`). Local
fit workers are capped at 30% (insight 121); `FINAL_TIER_MS` (150 s, `e2e/reviewSurface.ts`) is the one anchor
wait — `vertical-fit.spec.ts` still re-types `90_000` in eight places (harmless at 6 workers; hoist when
touched). `atceiling` is a DATE seed (~45 s/arm) and rides EVERY arm in the loop (six since PHONE_LS). The squeaky skill clears
`temp/` UNCONDITIONALLY (its §4 overrides any KEEP note here), so nothing irreplaceable may live there: the 24 px instrument +
measurements moved to `e2e/held/` and the icon generator + sheets to `scripts/icons/` on 2026-09-08; screenshots are regenerable.

**LANDMINES (2026-09-06):** an identifier-proximity anchor gate measured 21–42 % false positives on freshly
verified citations — REJECTED; arm 4 is structural only (file exists · line in range · not blank · range
well-formed), the semantic half is the anchor fleet · arm 4 never scans `src/**`, README.md, CLAUDE.md, or
`.md:NN` doc-to-doc citations — ~40 stale SOURCE-comment citations were re-pointed by hand this morning
(register: *The gates that don't bite*) · a Git-Bash `grep -c` for carriage returns lies about CRLF here —
node decides EOL per file · `grep -ni "a|b"` without `-E` treats `|` literally and returns NOTHING — that
false negative produced the u13 spec's "no e2e walks" sentence in `85fb5dc1`; alternation needs `-E` · an
inline `node -e` given a `/c/...` path fails — write scripts to files · the 2026-09-06 scratchpad's
`linkcheck.mjs` collapses runs of spaces to one hyphen (GitHub maps EACH space) — its "8 broken anchors" were
all false positives; the doc set has zero broken links · parallel owners in ONE working tree shift each other's
line numbers mid-read (insight 083) — a citation written against a file another owner is editing is unverified
until every owner lands; re-run `verify:doc-stats` last · two "AS BUILT: never created" annotations from the
truth pass were WRONG (`BudgetBuilder.tsx`, `BudgetLineItem.tsx`, `SequencingControl.tsx`, `HealthcareSheet.tsx`
live in `src/intake/`) — never assert "never built" from one `ls src/ui` · a rewriter's own defect list is ~1/3
stale by the time you read it (two skeptics caught rewriters reporting defects already fixed in the tree) —
verify before chasing · a Bash heredoc holding a long JSON with apostrophes truncated mid-string here, and another ate a
backslash inside a regex — write big edit payloads and scripts with the Write tool, then run the file · a screenshot proves ONE
column: a per-width seat is governed by the WIDEST column, so "looks great" at the mid column hid the column-0 overflow on the
390 phone — measure the whole catalog before reading a frame as proof (insight 123).

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
RESOLVED band, not the placeholder; `solve:nc` renders no `svg.rv` — only `solve:surplus` does (~40 s a walk per viewport on the worker pool, 2026-10-03; ~5 min single-worker) ·
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
`src/ui/devSeeds.ts` — `DEV_SEEDS` at `devSeeds.ts:1297`, `AGED_PLANTS` at `devSeeds.ts:1894`.

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
| `buckets` | **the ordering witness** — 3 real buckets (pre-tax + taxable-with-gain + Roth) on the `proportional` default, so `taxable-first` and the household's own order finally DIVERGE. The only seed on which "your plan today" is observably their plan. Live solve: NOT re-timed on the worker pool (8.9 min single-thread on the 2026-10-01 production build, v8, before the roster grew 57 → 77 at v9); on the pool at P = 12 the app reads `retired` 36.5 s · `nc` 39.8 s · `healthnc` 150.9 s (2026-10-03). Time `buckets` with `e2e/held/solve-timing.spec.ts` before quoting it |
| `steer` | the `no-pretax` typed refusal — invite → GoalPicker → calm refusal, no solve |
| `nc` · `pa` · `fl` · `elsewhere` | the state faces — NC bites, PA is small, FL is $0, elsewhere unpriced |
| `datenc` | the date-route NC witness (all-65+ — its clause rides the residual) |
| `healthnc` | **the priced PRE-65 witness** (Card 4, 2026-09-11) — `health`'s couple in NC: the residual is withheld (the Healthcare door), so the verdict's state clause is the STANDALONE note with the ruled tail (`copy.ts` `verdictStatePricedDoorTail`, ruled 2026-09-12) |
| `healthgap` | **the wide-gap Medicare witness** (61/40 — council wf_9921d7e3-55b, 2026-09-13 late) — `healthnc` with Sam at 40: the enrolled median is non-monotonic, so the both-enrolled window is a one-year blip and the premium card's era arm fires on it; pinned through the real engine in `healthSheetSeedGate.test.ts` |
| `healthss` | **the early-claim + same-age Medicare witness** (62/62, both claiming at 62 — 2026-10-15) — the conversion tile's 28¢ (the benefit taxation a converted dollar triggers, priced) and the one door-bearing seed whose premium card takes the ONE-FIGURE arm (the era IS the anchor), its drug-and-supplement carve-out spoken; pinned through the real engine in `healthSheetSeedGate.test.ts` |
| `datesolo` | **the refusal witness** — `?seed=date`'s couple with the ONE field flipped (Sam buys their own pre-65 coverage instead of riding Alex's plan at work). The only live drive of the `unrepresentable` strip block; it renders the cannot-price frame and builds NO date, by design. Its exemption from the all-seeds-build law is asserted, never skipped (`REFUSAL_SEEDS`, `devSeeds.test.ts`) |
| `atceiling` | **the CEILING crown** — `date`'s couple over-funded until the crown sits at rung 10; the arm that proves the odds ladder's FLOW seat. A DATE seed (~45 s/arm), walked by every chart-text arm |

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
is **`lattice harbor cinder vellum 48 thicket`** (`devSeeds.ts:1350`). For RestoreFlow you need a
real backup FILE and no full intake is required: unlock any plant → Result → **"Save a backup
file"** → *Download backup* (an `<a>` with a blob URL, **not** a button — a `button:has-text()`
selector misses it) → then delete the DB and reload. **`indexedDB.deleteDatabase` is BLOCKED while
the app holds the connection** — fire it, navigate to `about:blank`, then back; deleting and
reloading in one step silently leaves the vault in place and you land on Unlock wondering why.
⚠️ **AND ANY OTHER TAB with the app open blocks it the same way** (bit again 2026-08-20: the
deleting tab did the about:blank dance correctly while a second tab held the connection — the
vault silently survived a "successful" deletion). Close every other app tab first.
