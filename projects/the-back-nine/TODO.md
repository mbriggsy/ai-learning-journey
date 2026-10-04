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

**Where we are:** all four acts are built; Act 4 closed at U17·S6 (S7 deferred, Briggsy's ruling). What is
left is not units. It is the gap between *the build is done* and *a friend can bet real money on this*.

▶ **START HERE — the fresh session's entry is the NEWEST session block's NEXT list: today, the 2026-10-03 late (b9-5)
block directly below and its "NEXT, in order", which ends "then the 2026-09-13 late (b9-9) list below as ranked" — the
"NEXT, in order — RE-RANKED 2026-09-13 late (b9-9)" list after it (its open items 5–12), then its HIS EYE batch. The
register is the open surface. Every eye frame is re-made before a sitting — the commands are in the NEXT list and the
HIS EYE batch's "Frames:" line (`temp/` is emptied at every squeaky).**

**SESSION 2026-10-03 late (b9-5 — THE WORKER POOL shipped; the ACA-cliff + bracket-edge window anchors, `SOLVER_CODE_VERSION` 9):**
**STATE on the final tree, by exit code:** typecheck · lint · the full suite 3863 tests / 202 files · `verify:doc-stats` five arms · build · `verify:bundle` 269.5 KiB · `verify:aca` · `verify:state-tax` · `verify:csp` 16 / 16 locally (chromium + webkit, the new pooled arm included). `verify:fit` / `verify:fit:rv` NOT run locally (no rendered-UI change) — CI runs them. `pnpm caddie:walk` `solve:nc` + `solve:surplus` 4 / 4 green at REAL + PHONE on the walk's new budgets.
**CI:** GREEN by run id through `53f1ae71` (37166135388) — `225d8da4` the pool (37161088381), `3c9411f9` the walk (37162043560), `53f1ae71` v9. The squeaky commit was in flight at close — the next session reads its run FIRST, by id.
**WHERE THE SOLVE STANDS (the register entries *The recommendation's pending line promises "a few minutes"…* — its ⚑ BUILT block — and the CLOSED *The solver's ACA-cliff and bracket-edge anchors…* carry the tables):** THE POOL (`225d8da4`) — its laws live in `docs/architecture.md`'s *The pooled solve* bullet; bit-identical to the single worker across real V8 isolates at 16,000 paths (`e2e/held/solve-pool.spec.ts`, every run of the P = 4 / 8 / 12 / 18 sweep). `SOLVER_CODE_VERSION` 9 (`53f1ae71`) — the ACA cliff, the bracket edges AND the IRMAA tiers judge the one repeated amount in every window year's own committed frame through ONE routine (`candidates.ts` `railAcrossWindow`, `WindowAnchorContext`); rosters `retired`-type 93, `health` 97, `healthgap` 101 (858 → 1,142 over the 15 solvable dev seeds). THE APP (production, his laptop, P = 12): `retired` 36.5 s · `nc` 39.8 s · `healthnc` 150.9 s — "a few minutes" TRUE (the words stand); `healthnc` in the ~2× slow laptop state (~5 min) is the phrase's EDGE, so ANY roster growth re-times `healthnc` first (`e2e/held/solve-timing.spec.ts`) — NEXT (1)–(2) can grow it. The recommendation at v9: `retired` "keeps about $10,000 more…" (typical $3,000), `nc` $3,000 (typical $700), `healthnc` unchanged. The identity gate's LEGACY arm is still the two seams `_resimulateSearch` + `_probeEveryHealthcareWorld` (`solveIdentityFixtures.ts`); the pool's own gate is `src/ui/__tests__/solvePool*.test.ts`. The solve witnesses keep the 120 s idiom — v9 projects ≤ 47 % of every budget on a slow runner (the commit's table). The PHONE half of the pending-line entry is still owed (a ≤ 3-core device gets no pool — `healthnc` ~9 min there at v8, unmeasured at v9).
**UNFINISHED (prescriptions):** (i) `.claude/workflows/council.js` — the oracle-settled and ungrounded early returns (find them by their BLOCKER / attestation text) omit `abstentions`: add `abstentions: []` to both · (ii) `scripts/__tests__/ci-gate-completeness.test.ts` — the `working-directory` match is not quote-tolerant (a quoted `"working-directory"` under `defaults.run` passes): make it tolerate quotes the way the `if` / `continue-on-error` guard does, plus a mutant arm · (iii) `docs/architecture.md` (the "no live entry is certification-pinnable" sentence), `docs/plans/4-recommendation.md` and `docs/plans/features/act4-u14-validation-harness-build-spec.md` (same phrase) — scope it to "no RUN-CONSUMED entry … three parked health refs carry the kind", as `docs/roadmap.md` now says · (iv) `docs/plans/features/state-seed-increment-brief.md` (its `nc` bullet and closing bullet) still routes the band-crossing seed to Briggsy — reword to the Tier 4 pilot entry in the mint commit (NEXT (16) carries it) · (v) NEW — `e2e/chart-text-rv.spec.ts:51` `COMMITTED_LOCKUP_MS = 720_000` predates the worker pool: re-budget it from CI's per-test time on the pooled build (a 4-vCPU runner pools at P = 2 — `poolSizeFor(4)`), the LANDMINES recipe (strip ANSI with node, ≤ ~50 % of the budget), never from a laptop run; generous today, so safe until then.
**NEXT, in order:** (A) **DATED, this week** — the ACA rolling re-verify pass is due the week of 2026-10-05: CI reds ~2026-10-14 00:00 UTC, and from 2026-10-15 the runtime clause withholds the recommendation for every household carrying an ACA enrolled premium. The 8-step `howToClear` (~1 h, primary sources; the Dated table's row carries the probe order — the Senate calendar first). On the first session day ≥ 2026-10-05 it runs FIRST, ahead of (1) · (1) the anchors' draw-aware ROSTER RECALL (register *The solver's rail anchors stand under their line on COMMITTED income only…*, Tier 1 — filed 2026-10-04 by the draw-frame council `wf_919f377d-274`, which ranked it first because it can move the crown): the probe RAN 2026-10-04 (the entry's ⚑ MEASURED block): the crown MOVES on 8 of 10 seeds, $6–9.5k of lifetime tax left on the table on `budget` / `pa` / `retired` / `nc` / `buckets` (`retired` at 16k: $33,381 → $49,000, $9,102) — the gap is the roster's COVERAGE between rail points, the draw one cause. ADOPTION RULED 2026-10-04 (council `wf_a51047f0-f4b`, 7/10 — the entry's ⚑ RULED block is the build spec): BUILD the roster-wide per-policy on-lattice GAP-FILL in `enumerateCandidates`, `SOLVER_CODE_VERSION` 10 — pre-register `G` + `G'` FIRST (before any measurement), hoist the display step rule to `@shared`, the typed `filled` marker + display-string dedup, the card-proof premise rewrite + test, then the gates in order (v9 baseline recorded → the recall gate on a fresh seed set C → a fresh B with pre-registered runner-up rules → slow-state production timing ≤ +33 % → CI re-budget ≤ 50 % → Caddie walk + `verify:fit:rv`); the moved hero's words are his (⚑ never crown-local refinement, never a second stage, never the dense grid, never a knob fitted to the probe's B) · (2) the headroom look-back entry TOGETHER with *The step card's room covers the one-enrollee years…* (Tier 1, pilot + council — open, not blocked; figures re-derive under the growth base) · (3) Tier 2 *The engine-pricing ledger cannot name a date-route or spending-figure change…* (8d4d4e58, 6e4c065d) · (4) Tier 2 *The spend lane's test + polish debt…* · (5) the Roth sheet's blank amount box (Tier 1 — its rail half's shape RULED 2026-10-04, the entry's ⚑ RULED block: a measured fraction of the crowned arm's own futures, built with the sheet after (2)) · (6) the step card's "a year" read + the survivor sentence's dollar line (Tier 2, words his — fix the survivor mechanism before the words) · (7) the echo-ink entry · (8) the Part D hold-direction research leg · (9) **the three owed councils** — RE-TRIAGED 2026-09-30 out of the HIS EYE batch, because convening a council is the pilot's job, not a chore for him. The verdict follows the council law: ≥ 7/10 executes with its ⚑ line in `docs/council-log.md`; a lower score or a Hawk veto returns to HIS EYE with the rec. (a) The 20 px two-pane overrun, from Tier 2 *The app on someone else's device…*: candidates (i)–(iii) are named in its ⚑ OPEN FORK bullet, and the 20 px arm only records until the ruling. (b) The phone strip-reserve fork (the block after HIS EYE). (c) Tier 3 *The lever sheets at his seat…*: the hidden actions row (one shape for the control-sheet family) plus Apply-before-the-comparison (the pilot's lean: block while pending). His read of the rendered results stays in HIS EYE · (10) Tier 2 *`bandPercentile` INTERPOLATES…* — RANKED 2026-09-30 because (11) is blocked on it. Build the entry's ruled shape (pilot; engine-side, observe-only, reduce-to-spine byte-identical): the path-observed (nearest-rank / lower) median for the integer enrolled count, and the both-enrolled path FRACTION on the wire beside it (the `overCliffFraction` shape), with the base read CONDITIONED on the count the card names. Red-first on a fixture whose paths split exactly 50/50 on enrollment (an integer count, a base some path pays); re-pin the seed gate from the engine afterwards, and put any health card whose figure moves on the next Caddie walk (⚑ never round at the UI; the era-year RULE is not touched) · (11) the statistic half of Tier 2 *The premium card's era arm fires on a both-enrolled median window of ONE year…*, re-owned from him 2026-09-30. It is BLOCKED on (10), because the both-enrolled path fraction reaches the wire only with that build. After that build, measure the fraction at the era year through the real engine across the council's sweep (61/59 · 61/45 · 61/43 · 61/41 · 61/40 · 61/38) and on `healthnc`. A candidate statistic must leave the shipped `healthnc` card's routing unchanged (the test that killed K). Then `/council` before any routing change (⚑ never a K; never re-open the era-year rule on a pilot number) · (12) Tier 2 *`tax.rmdStartAge` vs 26 CFR 1.401(a)(9)-2(b)(2)…* (filed 2026-09-30; pilot, `S`): choose the 1959 row's honest form — consumption keyed to birth year (directional only for a household with a 1959 birth; the `directionalKind` is part of the call) or a disclosed caveat — add or document the unreachable pre-1949-07-01 70½ band, re-cite to the eCFR read plus 89 FR 58644, and delete the entry's `EXEMPT` row in `constants.shape.test.ts` (⚑ never flip the whole entry — the walk is family-level) · (13) the latent staleness gate (Tier 4 — shares `staleness.ts` with the ledger) · (14) Tier 4 *Gate honesty after the 2026-09-30 constants re-cite…* (filed 2026-09-30; pilot, `M`): rule the parked ACA-MAGI / PTC pair (pin it against §36B(d)(2)(B) + Form 8962 Worksheet 1-1 and §1395r(i)(4)(A), or walk code-embodied rules when `healthcareEnabled`), classify `medicareExtrasTypical` (a council first if the disclosure renders), widen the tripwire's `RESEARCH_OR_SECONDARY` list, and re-cite `health.irmaa` with its CMS read date (⚑ never walk the pair as `certification-pinnable` before the primary read — it would withhold every healthcare-on household's token) · (15) Tier 4 `pnpm doc:reanchor` self-citations · (16) Tier 4 *No priced-state seed crosses the confidence band any more…*, re-owned from him 2026-09-30 because it is a test-fixture mint. Mint a NEW seed plus its state-off twin (the shape `devSeeds.test.ts:490-498` files) on a priced state whose clause bites (NC or PA). It must land BORDERLINE with margin from both band edges, MEASURED by a real-engine pin in `devSeeds.test.ts`, never assumed. Add it beside `{ seed: 'nc', … }` in `e2e/vertical-fit.spec.ts`'s seed rows and to the next Caddie walk. The stale "Briggsy's call" routing in `devSeeds.ts` and that test comment was reworded 2026-09-30; in the mint commit, reword the same routing in `docs/plans/features/state-seed-increment-brief.md` (its `nc` bullet and its closing bullet) (⚑ never re-tune `nc`'s own accounts — the one-difference twin) · then the 2026-09-13 late (b9-9) list below as ranked. **ON THE CLOCK:** the ACA window — (A); `ubuntu-latest` → Ubuntu 26 from 2026-10-19 (Dated — pin the jobs or dry-run on `ubuntu-26.04` before it lands).
**SQUEAKY CLOSE 2026-10-03 late (b9-5):** typecheck · lint · the full suite 3863 / 202 · doc-stats five arms · build · bundle 269.5 KiB · `verify:aca` · `verify:state-tax` — all by exit code on the final tree; `temp/` EMPTY; no orphan servers, every background shell exited. **LANDMINES (2026-10-03 late, b9-5):** the worker script exposes `{ ...engineApi, ...poolApi }` and `EngineHandle` is SPINE-only (`Promisified<EngineApi>`) — a new pool method goes on `poolApi`, never forwarded by the resettable handle; a new `EngineApi` method still breaks every hand-rolled fake by design · a fake pool lane must `structuredClone` its REPLY (the wire) or the candidate re-attach is never exercised — and a pooled differential must tally lanes (≥ 2 used) or a silent one-lane fallback passes as a pool · a count-ZERO assertion on a lazily-chunked node passes VACUOUSLY — `svg.rv` toHaveCount(0) passed on PHONE with the chart planted back, the Suspense chunk not yet mounted; pin the synchronously-rendered box (`.rec-viz-box`) · the Caddie walk's solve budgets (300 s lockup / 480 s test, `e2e/caddie-walk.spec.ts` `SOLVE_LOCKUP_MS`) are SHORT of a single-thread solve on purpose — a `solve:` red there is a pool regression until proven otherwise · `pnpm doc:reanchor <BASE>` a SECOND time after `--apply` re-proposes the applied shifts (it diffs against BASE) — never apply twice; and it shifted a bare `:725` following `taxOverlay.ts:673` (UNCHANGED) by `solveAnchor.ts`'s diff ("bare, after solveAnchor.ts") — read every bare continuation's governing file before trusting the shift (a fourth blind class beside the register's Tier 4 two) (filed in the register 2026-10-03) · the roster measurement recipe: a tsx script OUTSIDE `src/` (doc-stats counts `*.test.ts` under it) over `DEV_SEEDS` + `buildSolveRequest`, run on the tree, then `git stash push -q -- src`, run, `git stash pop` — sound while the new code adds no untracked file the script imports · `solve-timing.spec.ts`'s `lockupText` stops before the plan card — the crowned AMOUNT is not in the capture; read the hero delta, or extend the capture before claiming what was crowned · a rewritten engine block can leave a TEST name stale where no citation points — grep the old behavior's words after a refactor (the IRMAA window arms' titles still name `firstCrossingMagiYear`, correctly; the ACA / bracket arms say `firstCrossingYear`).

**NEXT, in order — RE-RANKED 2026-09-13 late (b9-9) by the verify pass (13 seats + 12 refuters over the b9-8 list; all 13 items OPEN at `084f94f0`, none stale, every refuter agreed; what the pass CORRECTED in the prescriptions is inline below, each re-opened at source; every item is `execute` EXCEPT Card 9, which the register and the batched-oracle law keep PARKED as a framing fork — it moves to HIS EYE). Its ✅ items 1–4 — the two Tier 0s that led it (the Medicare-era premium sentence, the step card's per-person figure), Card 3 and the "never oversold" row — are BUILT and were cut from this list 2026-09-25: their records are their register entries (all four are CLOSED, each with its ⚑ NEGATIVEs — the Medicare-era entry on his 2026-09-25 ruling, `b83bb464`) and `git log`. The rest by tier, then by cost:**
5. **Card 13's (iv)** — the ladder readout shows the CROWN's line at rest (`readoutIdx = scrubIdx ?? crown index`; `data-active` on it; the scrub rule + `scrubbed` stay gated on `scrubIdx`; no CSS; the readout stays `aria-hidden`; amend `OddsLadder.test.tsx`) + fuckOffDate.css's D2d comment — stale on FOUR counts (it describes candidate (i) as shipped AND calls the ladder a `<details>` disclosure; the as-built is `<section className="fod-ladder">` inside `.fod-graphs`, no disclosure element; AND its `auto 1fr` / `grid-row 1/-1` rows AND its "when the ladder opens" — it never opens) + the dead `<details>`-era `.fod-ladder__summary::before` (`fuckOffDate.css:313`) + `OddsLadder.tsx`'s two comments that go stale with the build (`OddsLadder.tsx:27-30` "pointer-only…", `OddsLadder.tsx:292-297` "visibility-hidden except the scrubbed one") + the design skill's "on-demand, not on the first frame" clause (architecture §12 wins) + the `h2.fod-headline` aria-describedby GATE ARM on the three REAL date arms (the attribute already SHIPS, `FuckOffDate.tsx:388` — only the arm is owed; reuse the link-and-resolve block inside `assertCaveatOrderAndReach`, and the aged REAL arms datestale / datearrived lack it too); the register's "a newly visible node joins the audit" was false (the readout line carries neither `.ct-text` nor `.ct-block__item`) — corrected; THEN the REAL catalog capture (date65 / datenc / datesplit + one live-Chrome scrollbar look) before the column half files durably, and the Caddie chart walk the change owes (Card 1 rides it as its own commit). The a11y gain is for a SIGHTED keyboard-only reader — AT already reaches the crown via the dot's `role="img"` label; do not overstate it in the commit. The rest line is the SHIPPED `ladderMarkAria` crown sentence (two to three lines, the crown's own odds), never the fixture's "9 of 10, your date".
6. **Card 6's three chart-text arms** — the 2026-09-13 evening b9-8 close's mechanism (`084f94f0`, re-verified by the 2026-09-13 late b9-9 pass, `7ee82569`; it builds on the register's ⚑ CORRECTED 2026-09-13 diagnosis — the stagger already seats named moments first — and REPLACES the register's hide / LAST-row rule for (b), which stays the fallback): a crossing-aware stagger — exhaustive assignment over the named items (≤ 5): min rows → min tail crossings (an item's x inside a HIGHER row's box) → min Σ rank×row → the greedy order as tiebreak; unnamed ticks unchanged (row 0 if clear, else hidden); `.ct-block__name` min-height one line so an unnamed item's ages sit on the AGE baseline. BIGGER THAN IT READS: `data-ct-rank` (work-stops — the crown, relabelled on a split — 3, today 2, built + horizon 1) does NOT exist — `ConfidenceBand.tsx` mints `data-ct-item`, `data-ct-optional` and `data-ct-tail`, no rank — mint it from the annotation's IDENTITY in the same red-first commit as arm 2, before the stagger change (NEW unit arms for rank + crossings; `chartText.test.tsx`'s five greedy pins hold under a greedy tiebreak); two arms need measurement `chartTextAudit.ts` does not expose (no tail rect, no `.ct-block__sub` rect — spec-local `page.evaluate`, each new field with its own non-vacuity pin); the "~2 px thin on PHONE" worry was WRONG (corrected 2026-09-27: 82.9 was Today's box MIDPOINT — Today is start-anchored, its tail at 65.1 px, ~19.9 px clear of Work stops' 85; the tightest margin is Plan built's tail at 50.6 vs Today's left edge, ~14.5 px PHONE / ~16.9 FLOOR, derived not measured) — MEASURE before decreeing rows 0 / 1 / 2; arm 3's witness is NOT the 70 / 71 tick (it sits inside Work stops' row-0 box on both arms, hidden by construction once arm 2 passes — pinning it reds whenever arm 2 is green): pin "80 / 81" on FLOOR, accept an empty unnamed set on PHONE, never move the witness to the ungated REAL arm; min-rows stays FIRST in the lexicographic order (AGED_DATE_ROWS / AGED_SPINE_ROWS / `architecture.md`'s recorded counts are downstream). Arms (chart-text.spec.ts, datestale PHONE + FLOOR): tail-vs-box zero crossings · the top-ranked named moment on row 0 · unnamed sub baseline == a named sub baseline on its row; ~55–72 s per datestale arm on the fit harness.
7. **The family's other two primaries** (Tier 2) — the BUDGET half is a three-line delta on the EMPTY face: render the shipped `budgetApplyEmpty` string above `.budget-sheet__actions`, point `aria-describedby` at it (conditional on `nothingToCommit` — a one-line budget with a blank amount is a SECOND reason-less blocked face, `hasErrors`: rule it in or out), guard `.btn-quiet:hover` on `[aria-disabled]` (`intake.css:247-251`, the only such rule); the same `formBody` renders in the intake spend step's inline builder, so the reason shows at rest there too and the door walk never reaches it (the register's "aria: `[disabled]`" is the snapshot spelling — source is `aria-disabled`, `BudgetBuilder.tsx:424`; the blocked press ALREADY announces, `:273`, pinned; the channel is `opacity: 0.55`, not tint — corrected in the entry). The SEQUENCING half is an UNDECIDED fork (block on the applied pick, or the live no-op as the intended calm) — `/council` it before building (a block keys on (policy, order), never the policy alone). Caddie door walk on both — scroll-and-clip frames first (the register's below-fold harness gap) — plus the intake step.
8. **Card 1** — delete the two legend outlines (`band.css` `.band-legend__sw--inner/--outer`) + rewrite THREE comments, not two (band.css's narrative, `BandLegend.tsx`'s header comment AND the `LegendSwatch` JSDoc that claims "the outline-style differences reinforce the three tiers") + the a11y gate (assert, do not re-plumb: the fills are ALREADY source-bound to `BAND_FILL_*` — only "band.css has no outline on the swatches" becomes true after the edit); strike the register's NESTED-CHIP alternative with reason on close (the entry labels no option (a) — corrected 2026-09-27). One visual change, Caddie-read, its own commit — pull it onto whichever chart walk Card 13's (iv) or Card 6's arms owes.
9. **The four-rungs deliverables** — the pbt's RECORDED-LIMIT docblock's WORDS only today ([1001,1250] are SHIPPED mislabelled ladders; the k-lock rung is its own UNRULED entry — moving the pbt boundary before `money.ts` changes reds the two-sided offender arm); the direction-neutral `assertTickColumn` arm (`.band-tick` count === intervals + 1 — `intervals` from `niceLattice` on the parsed ceiling or a per-seed record, never the ticks counted against themselves) + the min / max adjacent-gap EMITTER as recorded distances (insight 065) — EMIT FIRST, then set the crowding floor from the recorded minimum, never pinned at today's densest ladder (the ruling's clause — `borderline` IS the five-interval densest): 16.9 px is DERIVED (13 px × 1.3, `tokens.css`), measured on neither platform, and the register's "seven rungs at 24.2 px must still pass" was unsourced (no band ladder draws seven lines under intervals ∈ {3,4,5}) — WITHDRAWN in the entry; the arm runs on ONE seed (`borderline`) — healthnc joins only after the count + gap arm is split off `assertTickColumn` (its borderline-only non-vacuity guards red on healthnc) and its lattice is RE-MEASURED (measured 2026-09-12, 17 engine commits ago); no max-gap threshold. These three live inside the CLOSED *Two dollar ladders* entry today — nothing OPEN tracks them: file them as an OPEN Tier 2 entry when the work starts (header count +1), carrying the CLOSED entry's ⚑ VERIFIED 2026-09-27 block.
10. **Card 2's lever (ii)** — MEASURE FIRST (ten minutes — now to CONFIRM, the arithmetic rules it), then decide: `readoutSeat`'s SECOND clause (`chartText.tsx:446` — `min(widest + chrome, cap) + gap ≤ plot / 2`) needs, on the pass's arithmetic (cap ≈ 38 % of the host, plot ≈ 80 %), a host ≥ ~500 px for a CAPPED box, and the PHONE arm's host is 308 px; its "widest" is the widest COLUMN, set by the wrapping range LABEL (~138 px at 13 px on every arm), not the figure — so clause 2 already fails on PHONE and FLOOR today and collapsing the degenerate range cannot flip either (corrected 2026-09-27 from "likely stays FLOW"): lever (ii) would NOT fill the hole Card 2 filed; lever (iii) — his framing, the four-rungs EXPIRY watches it — is the one that reaches the row. If it is built anyway (`composeReadoutLines`, `src/viz/bandData.ts`: `row.low === row.high` composes ages / a "land at" label ← new `bandReadoutRangeSameLabel` / ONE figure): compare `row.median` too (never assume the formatter is monotone — a calm-but-wrong shape if it changes), the new label needs a `BandLabels` field + its wiring + all FOUR test LABELS fixtures, and the red-first arm must assert the degenerate COLUMN's lines (the gate's `maxLines >= 5` guard is a max over columns and proves nothing here); `BAND_SEAT.PHONE` MEASURED, never decreed.
11. **Card 11's (c)** — first DEFINE "the widest delta string": the hero is runtime-formatted by `formatDeltaDollar` (`money.ts`), not a catalog entry (glyph count under the $10,000 step — e.g. eleven glyphs at `$12,340,000`); measure PHONE AND FLOOR (fluid `--text-lg` puts FLOOR ~5 % under PHONE in units per font-px, so the narrowest host is not proven worst); nothing survives in `temp/` (`verify-rv.json` cleared) — the hero's ink has never been RECORDED (the RV audit containment-checks `.rv__delta` on every arm, never at the widest string — corrected 2026-09-27); the only renderer is the RV gate (~2 min per arm on CI since the worker pool: `53f1ae71`'s run, 3 arms in 5.4 min) — plant the widest string on the hero inside the existing arm (the `--ct-ty` plant-and-restore shape) and emit its width, no new pass; then name + pin `HERO_HALF_RESERVE` (`RV_PLOT.left + plotW + reserve ≤ RV_VIEW.w`) with a docblock that says the invariant reduces to `reserve ≤ RV_PLOT.right` (192 u) and is trivially green today — it bounds the "shorten the label column" lever, nothing live; "~151u" is the council's estimate of the WHOLE hero (the half ~75u). ⚑ The LEFT edge is the tighter, unguarded bound (a $0 shorter bar puts gapMid near 153u) — pin it too or name it out of scope; `RV_VIEW` / `RV_PLOT` are module-private (export, or bind by regex as `viewBoxMirrors.test.ts:42` does).
12. Pilot-movable while he is out of the chair: **the forced-colors audit of `src/viz`** (Tier 4 — zero `forced-colors` occurrences in code, never attempted; NOT fully prescribed, corrected 2026-09-27: its premise is backwards in Chromium — the SVG's author paint survives and the HTML backdrop is forced, so the risk is the dark `--ink` marks on a forced-DARK Canvas and the fix is `CanvasText`, not `forced-color-adjust: none` — and it names no instrument; read the register entry's ⚑ VERIFIED block first).
**HIS EYE (a HIM batch — ride one sitting, not a trailing item; it holds only words, framing forks, one-way doors and rendered-surface reads — the 2026-09-30 re-triage moved "the three councils still owed" to the b9-1 NEXT list, and two register entries out of Tier 3 to the pilot):** **the step card's surcharge scope** (register *The step card never says what its surcharge covers…* — PARKED 2026-09-27 after three drafts: the shipped unscoped line reads as a data bug at the true price; "drug-plan surcharges" collided with "drug and supplement plans" not counted; "on your drug plan" read as escaping on a $0 plan — the entry carries all three as the brief) · **Card 9** (moved here: the register files it as a PARKED framing fork, owner briggsy, "either way the words are his" — the 2026-09-13 b9-8 list's "every ruling is execute" was wrong on this one; both halves are his words — the refusal's sentence `recHoldUnwitnessable` + its heading, and the one-line reason; NOTE for the build when he rules: the picker has FOUR routes in (the invite, the record card's `onReopen`, the committed + stale re-picks — `Result.tsx`), so the gate rides the PROP, never the invite door alone) · the copy forks in his words (the Roth sheet's three added 2026-09-13) · Card 2 (iii) · the Tier 3 omitted-costs discussion · the NIIT gloss (named in NINE copy strings, not two — `copy.ts` :979–:1149 + `recDiscNiit` — glossed in none) · Card 1's rendered result / the two ⚑ composition sign-offs (the RV label gutter at 52.3 % of plot run; the date route's bare left column) / the four-rungs taste sign-off (four stays) / the 24 px + 20 px frames / the icon / the hidden actions row at his seat · the 320 build's crown fork (moved here 2026-09-25 from the discharged 2026-09-05 plan — the register's 320 ruling says both its forks are "ranked in `TODO.md`"; the other is Card 2's lever (ii), ranked above): a rung-9 crown seated ABOVE dips its "your date" tell 5–7 px into the plot's top (7.1 / 5.8 / 5.1 px at REAL / FLOOR / PHONE), so a scrub rule at its own column passes behind it — pre-existing, bounded by the marks oracle (4.4 / 3.6 / 3.2 px of ring clearance); clamping the anchor to `PLOT.top` would cost the phone its above seat (40.9 → 35.8 px of headroom against a 36.6 px callout); pilot's lean: leave it, watch it — plus the watch item: at 1536 the ceiling crown misses its above seat by 0.5 px of headroom (~7 px of figure width), so a wider result column would silently seat it above, the shape his eye ruled crowded in another form (`CROWN_SEAT_MARGIN_PX` in `e2e/chart-text.spec.ts` keeps CI stable across it). **The FADING-seed walk is RE-FILED, not walked:** its premise is structural — both routes cut the fan at cohort ≥ 0.5 BEFORE the resolver (`answerView.ts:81` / `:120` → `truncateFanAtThinCohort`) and `cohortFadeOpacity` is exactly 1 at ≥ 0.5, so no RENDERED sample ever fades and the legend's reopen trigger has no referent on ANY seed by construction — the residual needs a new framing (what the mask is for on the drawn fan) before any walk. Frames: CLEARED with `temp/` (emptied at every squeaky). Re-make them on the CURRENT tree before the sitting, and never beside vitest / doc-stats (the load landmine). The fork and sign-off frames (Cards 1 / 2 / 9 / 13, the RV label gutter, the date route's left column, the four-rungs pair on `seed-healthnc`): `CADDIE_TARGETS="seed:retired,seed:date,vault:datestale,solve:surplus,solve:failing,seed:healthnc" CADDIE_RUN=<name> pnpm caddie:walk` (~19 m, into `temp/caddie/<name>/`). The 24 px / 20 px frames: `pnpm exec playwright test --config e2e/held/shots.config.ts council-24px-shots` (~2 m, into `temp/council-24px/`). The icon is tracked (`scripts/icons/preview.png`). The two sibling sheets' blocked / pointed / cleared look has NO tracked instrument (the register's *The Caddie door walk captures no pixel of a scrolling sheet's below-fold cards* is the harness gap). Its only copy is the 2026-09-13 ad-hoc scratchpad harness `%TEMP%/claude/C--Users-brigg-ai-learning-journey-projects-the-back-nine/8269e9f0-120a-4772-a4d3-546bfdc40056/scratchpad/look/look.spec.ts` (port 4197). Hold it first as `e2e/held/sibling-sheets-look.spec.ts`: import from `../reviewSurface`, write to `process.env.LOOK_OUT ?? 'temp/look/adhoc'`, and drop its own config, since `shots.config.ts` collects every held spec. Then run `LOOK_OUT=temp/look/<name> pnpm exec playwright test --config e2e/held/shots.config.ts sibling-sheets-look`.

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
| **CI: ~2026-10-14 00:00 UTC** · **runtime: 2026-10-15** | ACA rolling window (`verifiedOn: 2026-09-14` + `maxAgeDays: 30`) — ✅ the 2026-09-14 pass CLEARED it (8 legs + 16 refuters + a synthesis + a critic, `wf_fa72168d-8cb`): regime UNCHANGED; the forecast Sept 14–30 endgame closed EMPTY and early — H.R. 6500 became Pub. L. 119-103 on 2026-09-02 with ZERO §36B text, the ceiling is 119-108 (six new laws swept clean at enrolled text), the one must-pass cliff left is §106(3)'s **December 11, 2026**. The next pass probes the SENATE CALENDAR first (H.R. 1834 GO 319 · S. 3385 GO 284 · S.J. Res. 197 GO 456), then the FY2027 track, then the still-unpublished PLAW-119publ103…108 slip laws; the record's `forwardClock` carries the nine-item order and the chair's residuals (what was carried from 08-20, not re-opened) | **TWO dates, and the split is DELIBERATE — one date here was wrong (corrected 2026-08-14).** `verify:aca` compares float-ms so it reds ~a day EARLIER than the runtime clause's integer-epoch-day compare; `oracleToken.ts:176-178` records that ordering as the safe one. **And it is not only CI:** `evaluateAcaFreshnessClause` (`oracleToken.ts:191-201`) is a RUNTIME clause on the user's own browser clock — once overdue the shipped app WITHHOLDS the recommendation for any household carrying an ACA enrolled premium, and `healthSheetChrome.ts:149` flips the health-sheet status line. No deploy required. Clearing it is the 8-step `howToClear` (~1h, primary sources, both attest tables hand-RE-TYPED from the PDFs — never from `health.ts`, that bind goes circular) |
| **2026-10-19** | GitHub's `ubuntu-latest` runner label migrates to **Ubuntu 26** (the annotation on every CI run since 2026-09-25; actions/runner-images#14748) | Every CI job moves image; the Playwright browser installs behind `verify:fit` / `verify:fit:rv` / `verify:csp` (Chromium + the WebKit `@cross-browser` project) are the likeliest to break (system-deps changes). Before it lands: pin the jobs to `ubuntu-24.04` in `.github/workflows/`, OR run the full CI once on `ubuntu-26.04` early (a branch-free `workflow_dispatch` input) and fix what reds — never discover it on a red main |
| **2027-07-15** | PA + FL `nextDue`, `state-tax-pa-last-verified.json` / `state-tax-fl-last-verified.json` (annual drift cadence) — **the roster's real deadline: it fires 18 days BEFORE NC's** | `pnpm verify:state-tax` reds → CI red |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-08-01 00:00 UTC** (2027-07-31 20:00 ET) | SS spousal-rate annual re-verify — `src/engine/constants/__tests__/spousalRate.reverify.tripwire.test.ts` (`LAST_REVERIFIED` 2026-08-01 + `REVERIFY_WINDOW_MONTHS` 12; fires one day BEFORE NC) | the suite reds → CI red. Clear it by re-reading POMS RS 00202.020 / RS 00615.201 A.1 against 42 U.S.C. §402(b)/(c), then set `LAST_REVERIFIED` to the date the source was opened — never just bump it |
| **2027-09-01** | Medicare-cost-trend re-pin — `src/engine/constants/__tests__/medicareTrend.reverify.tripwire.test.ts` (`reportEdition` 2026) | the suite reds → CI red. Re-pin `medicareCostTrend` to the 2027 Trustees Report (Table V.E2 + II.D1 + III.B12 + §III.D) under a NEW vintage (the `part-b-trend` staleness clock then fires on saved vaults by design), bump `reportEdition` + the constants.shape pin + the DND-012 fixtures, then move the tripwire forward |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | ✅ **ARMED 2026-08-02** — `annualRoll.tripwire.test.ts` reds the suite (both arms mutation-proven). Clearing it is a **re-sourcing job, never a date bump**; `scaffold.smoke.test.ts:10-13` + `constants.shape.test.ts` red alongside by design |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the aged tone calls (the four filed + the aged date band's three-row block, 2026-09-07) are due before this** |
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
   `intakeMap.ts:340-360` (`escalateQuote`) builds both the enrolled premium and the SLCSP benchmark from
   `acaAgeRatingCurve` factors alone — **no cost-trend term**. Part B was fixed for exactly this reason;
   `oracleToken.ts:112-133` writes the argument out (*"disclose-and-ship is FORBIDDEN — a disclosure fixes
   a number, never a mis-ranking"*). The same argument holds at the 400%-FPL cliff, where the household
   eats the full premium. The token has an ACA **legislative freshness** clause and **no ACA pricing-mode
   clause**.
   ⚑ **Audit corrections 2026-08-02 — three anchors were wrong and the fix shape is NOT Part B's:**
   (a) `healthOverlay.ts:301` is a **closing brace**, not a consumer; the real seam is `taxOverlay.ts:1705` plus `taxOverlay.ts:1747-1754`
   → `healthOverlay.ts:275`. (b) `copy.ts:1171` is a Medicare eyebrow; the strings that claim
   the coupling is priced are **`copy.ts:1007-1010`**. (c) the excess-APTC field moved to
   `aca-last-verified.json:43` (was `:21`) and `scripts/verify-aca-status.ts:40-103` declares and REQUIRES the key
   (`adjacentButSharp` at `:90`, `needProse` at `:169`, since 2026-08-03) — **the gate is presence-only**: nothing checks that the prose models the uncapped clawback.
   ⚑ **STRUCTURAL — this is why it isn't a Part B copy-paste:** Part B's schedule is built INSIDE the
   engine, which is why the oracle token can witness it. The ACA escalator lives in **intake**
   (`intakeMap.ts:340-360`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto
   intakeMap would be the exact lying-mirror `oracleToken.ts:114-122` warns about. The honest fix moves the
   schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1128`).
   ⚑ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver
   block would hold for months over the whole pre-65 population.
   ⚑ **2026-08-03 double-blind — the pricing defect is REAL and confirmed; the near-term copy move as filed
   was WRONG THREE WAYS.** (a) *"stop claiming the coupling is fully priced"* — **the coupling IS fully
   priced.** A conversion enters `nonSSordinary` → `acaMagi` (`healthOverlay.ts:104-106`) → `slidingScalePtc`
   → net premium, in both preview arms. The fault is the **closed "Not counted here:" list** omitting the
   held-price modeling choice, while the sibling health-sheet list ONCE named the benchmark — struck 2026-08-03 as FALSE in
   both lists (`copy.ts:1124-1137`); what is genuinely unmodelled about it is the COST TREND (`copy.ts:1139-1141`). (b) *"priced real-flat"* **understates what IS modelled** — `escalateQuote` climbs with the
   age-rating curve (0.765 → 3.000 at 64). Only the **cost trend** is missing; the schedule is not flat, so
   **do NOT borrow `verdictResidualTail`'s "held flat in today's dollars"** — verbatim it is a NEW false
   claim on this surface. (c) the editable strings are **`copy.ts:1008` and `:1010`** (`983`/`985` are key
   names), and both must move together.
   ⚑ **The direction claim must be CLIFF-SCOPED, never blanket.** `healthOverlay.ts:227`+`:299` give
   under-cliff net = `enrolled − slcsp + contribution`, and `intakeMap.ts:676-677` scale **both** streams by
   the same `escalateQuote` factor — so under the cliff a missing trend is **zero** when E=S
   (`devSeeds.ts:615-616` = 4200/4200) and **reversed (pessimistic)** when E<S, which `copy.ts:227` invites.
   It bites one-way optimistic **only over the cliff** (`healthOverlay.ts:304-308`, full enrolled premium).
   The shipped sibling `recDiscAcaSlcsp` (`copy.ts:1955-1956`) hedges bidirectionally on this exact fact and
   `medicare-pricing-build-spec.md:43` bans the false unidirectional. Draft to append to BOTH strings:
   *"One modeling choice: these prices step up with your ages, not with the way plan prices themselves climb
   — so a conversion that crosses the income line could cost more than shown."*
   ✅ **BOTH XS WINS SHIPPED 2026-08-03** — the clawback gate (`a436caee`) and the false negation
   (`bd851f24`). The gate turned out to be **seven** undeclared fields, not one (`discriminatingProof`,
   `nothingEnactedChain`, `pendingExtension`, `retroactivity`, `adjacentButSharp`, `forwardClock`,
   `strickenCitations`) — all now declared + required, with array arms that reject `[]` (truthy) and
   blank links; mutation-proven against the shipped record. And `copy.ts:1143` / `:1149` no longer list the
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
   - **A false negation on the health sheet (XS).** `copy.ts:996/960` list *"the benchmark premium itself"*
     under "Not counted here" while the entered benchmark **is** priced (`intakeMap.ts:677` →
     `healthOverlay.ts:218-228`) — the same false-negation shape O16 fixed on the Roth strings.
   </details>

   ⚑ **The open fork is his, and it is not the copy.** The Medicare council's standing law
   (`oracleToken.ts:119-120`) is *"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a
   mis-ranking,"* written about exactly this shape. Does the pre-65 Marketplace population get the
   conversion ranking **with** the new disclosure (what the BLOCKED-ON-RESEARCH tag silently assumes), or
   does the token gain an **ACA pricing-mode clause** that withholds the ranking — as Medicare's did — until
   a sourced trend lands?
   ⚑ **2026-09-04 anchors + two unfiled facts:** `escalateQuote` is `intakeMap.ts:340-360` (not `:271-291`);
   the "Not counted here" pair is `copy.ts:979` / `:984` (not `:895/:897`) and the surface is SIX strings
   (`copy.ts:979`, `:984, :998, :1000, :1008, :1010` — selected by `composeRothOmissionsNote`'s 2×3 matrix, whose
   ACA-priced arm already AFFIRMS the subsidy is counted, so a trend sentence must reconcile with that
   affirmation, not append to it) + the two health-control siblings (`copy.ts:1143`, `:1149`), which CANNOT take it
   (gated on `statePriced` alone — `copy.ts:1135-1137`). Unfiled: `shadowRateHeadroom` (`copy.ts:2725`)
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
   Pricing is membership-keyed at `taxOverlay.ts:881`; `PRICED_STATES` is `constants/stateTax.ts:50`; the
   flip is pinned live at `optimalityOracle.test.ts:194-205` (NC crowns the 12%-top anchor, the state-absent
   twin the 22%-top). Correction (a) is **half-stale** — the `state-certification-pending` WithheldReason
   (`oracleToken.ts:48`), its humane string (`recommendationView.ts:338-339`) and the whole *held* card
   still ship and are tested; only the **live trigger** is gone, so a new arm is an addition, not a build.
   Correction (b) is **confirmed exact**: `mintOracleToken` has one live call site (`solveEntry.ts:232`),
   reached only via `engineApi.runSolve`; `engineApi.run` (`engineProtocol.ts:423` — headline/confidence)
   and `runDateSearch` (`:458` — the date) mint **no token**.
   ⚑ **The no-income-tax premise is FALSE for 5 of the 8, and it adds 7, not 8** — the register entry
   *Unpriced states — a confident winner computed with zero state income tax* carries the state-by-state negative.
   ⚑ **Real costs the partial omits.** `verify-state-tax.ts:120` loops `PRICED_STATES`, so **every state
   added is a new annual red-build gate with its own `nextDue`** (FL already carries one). Per state:
   `model.ts:317` STATE_ROSTER · a sourced(0) constants entry + profile · `copy.ts` `stateOption<X>` +
   `verdictResidualState<X>` (the THREE exhaustive switches at `stateTaxDisclosure.ts:52-63`,
   `stateTaxDisclosure.ts:93-104` (the standalone note, Card 4) and `stateTaxDisclosure.ts:169-178` fail
   `tsc` until written) · `recommendationView.ts:318-322` · the intake picker **4 → 11 vertical arms**
   against `verify:fit`. Engine cost is genuinely near-zero (`stateTax.ts:134` structural early return).
   ⚑ **The filed "every saved vault decodes Corrupt" blocker is FALSE — do not act on it, and do NOT loosen
   the compile tie.** `_V3FieldsCover` (`model.ts:2313-2315`) covers only `keyof ScenarioV3`;
   `checkStateTaxVintageV3` (`scenarioCodec.ts:552-557`) is hand-written and compels no `needString`. Safe
   because `scenarioCodec.ts:793-794` gates `retirementState` via `needVocab(STATE_ROSTER)`, so no
   pre-widening vault can *be* a household in a newly-priced state. The prescribed remedy — loosening
   `stateTax.ts:429-433` — would **re-open the exact hole that tie was minted to close** (`:424-428`).
   ⚑ **His call, sharpened:** does the refusal reach the **headline + date** (`engineProtocol.ts:423`/`:460`)
   or stop at the strategy? Gating only `solve()` leaves a state-blind first answer for everyone off the
   roster; gating all three blanks the product's magic moment for **~86% of US households**. Widening to the
   no-tax seven moves coverage ~14% → ~27%, of which **Texas alone is two-thirds** — so *which of your
   friends' states actually matter* may make the fork moot. Landmines for the refuse arm: insight-081's
   degenerate overlay ($0 portfolio) builds no overlay and would read as unpriced (**false refusal**), and
   the state step is deliberately **non-blocking** (`questions.tsx:570-576`), so refusing on ABSENT walls
   every household that skipped it.
   ⚑ **2026-09-04:** "no token on the headline/date" is TRUE; "no honesty gate at all" would be FALSE — a
   state-tax disclosure already renders on both first-answer surfaces (`composeVerdictMedicareResidual`,
   `stateTaxDisclosure.ts:45` → `ConfidenceStatement.tsx:501` + `FuckOffDate.tsx:421`; off-roster arm
   `copy.ts:1191` "State income tax isn't priced yet…"). ✅ **The GATE gap this block named is CLOSED
   2026-09-11 (Card 4):** the residual still rides `medicarePricedNote` (`healthSheetChrome.ts:466-471` —
   Medicare-priced AND no health door), but the clause no longer depends on it — `composeVerdictStateNote`
   (`stateTaxDisclosure.ts:86`, home #6) renders it STANDALONE (`.cs-state-note`) on both routes wherever the
   residual is withheld, so EVERY verdict — pre-65 and health-door included, the fuck-off-date audience —
   reads exactly one state clause, priced or unpriced; scope the roster fork against disclosure-everywhere,
   never against a silent pre-65 cohort. A THIRD token-less lane exists: `runTwoArm` (`engineProtocol.ts:476`, the U10 control
   preview), gated by copy only. Anchors: `stateStep` `questions.tsx:570`, `fields: []` at `:577`, the
   retired twin `:593`.

4. ✅ **SHIPPED 2026-08-03 (`bd851f24`) — the record card no longer implies the household acted.** What remains — naming the strategy (his ruling) and the advice-not-taken semantic witness that has now missed three times — lives in the register entry "The saved-record card does not name the strategy".

5. **Smaller, each self-contained** *(all four re-anchored by the 2026-08-02 audit)*:

   - **Post-65 non-qualified HSA money is silently forfeited.** ✅ The false *"(conservative, disclosed)"*
     claim at `healthOverlay.ts:875` is **corrected 2026-08-02** — it now says the direction is safe but
     the disclosure does **not** exist, and asks whoever adds it to fix the comment in the same change.
     **The disclosure itself is still OWED** (candidate home: the new "What this leaves out" section below).
   - **Account balances have no magnitude sanity rule** while spend and PIA each got one (real range
     `sanity.ts:52-75`). ⚑ **Size is M, not S, and a ceiling is the wrong instrument:** a 10× slip on
     $500k is $5M — a perfectly coherent household, so no threshold catches it. The shape that works is
     **one confirm on the household TOTAL** at the accounts step (the figure the engine actually consumes),
     reusing the running total already rendered at `copy.ts:2101` / `questions.tsx:1052-1054`.
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
     a's single `<ul>` (`AssumptionPanel.tsx:533-565`), so an entry there lands in "On your behalf". A third
     section is **~18 lines of new JSX** mirroring `:570-574`, + 1 heading and 2 line keys in `copy.ts`'s
     `assumption*` block (hedge/verdict-EXEMPT at `:1123-1134`; avoid `copyGuard.ts:254`'s
     `/(tap|draw|pull) … hsa/`), + **no CSS change** (`.ap-section*`/`.ap-row*` are generic). **Fit is safe
     and gets safer:** the panel scrolls (`sheetShell.css` `.control-sheet` 88dvh/94dvh, `overflow-y:auto`)
     and the fit gate's panel arm (`vertical-fit.spec.ts:1700-1729`) asserts only that the dialog box fits
     **and** `scrollHeight > clientHeight` — content growth makes the second assertion *more* true.
     ⚑ **The drafted HSA sentence would have DENIED the very forfeit it discloses — do not ship "stays
     put" / "simply sits."** The balance is not parked, it is **destroyed**: `taxOverlay.ts:1830-1831` sets
     `buckets = EMPTY_BUCKETS` (hsa: 0) → `simulate.ts:1736` `terminalHsaReal = 0` →
     `objectiveHeadline.ts:58` bequest contribution **$0**. On the exact path the sentence names, the HSA
     adds nothing to the leave-more dollar the reader sees. **The sentence must say the balance is DROPPED.**
     ⚑ **Sweep BOTH stale comments in the same commit** — `healthOverlay.ts:875-878` (which says
     fix-or-it-re-rots) **and** `taxOverlay.ts:1821-1823`, which still calls post-65 HSA-as-ordinary-income
     *"a DISCLOSED non-feature, the survivor-SS class"* — the same false claim, in the file that **owns** the
     mechanism.
     ⚑ **The genuine ruling here is scope, not wording** (tone is Caddie-chair under the batched-oracle law):
     **NIIT is not homeless** — `recommendationView.ts:90` emits it on *every* committed recommendation
     (rendered `RecommendationSurface.tsx:535-543`) and `controlHealthOmissionsNote` carries it on the
     Healthcare sheet. So: ship the section with only the two genuinely-homeless items (HSA forfeit + LTC),
     or make the panel section NIIT's canonical home and prune the other two — the repo's own
     one-honest-home-per-fact law (`healthSheetChrome.ts:463`) forbids a silent third.
     ⚑ **2026-09-04 re-anchor (drifted AGAIN, +62/+101 in a month) + four traps the build must clear.** The
     panel is `src/intake/AssumptionPanel.tsx` — section a opens `:399` / closes `:567`, section b `:570` /
     `:849`, footer `:855`, the disclosures map `:533-565`; the `assumption*` prefix law is
     `copy.ts:1264-1275` (keys `:1276-1417`); the panel fit arm is `vertical-fit.spec.ts:1700-1729`;
     `sheetShell.css:34-35`/`:94`; the overlays are `src/engine/healthOverlay.ts:874-878` and
     `src/engine/taxOverlay.ts:1820-1823` (there is no `overlays/` dir). NIIT's two homes confirmed
     (`recommendationView.ts:90` unconditional; `copy.ts:1142-1143`) — the scope fork is self-resolving:
     HSA + LTC only. TRAP 1 — `Row` REQUIRES a `seat` from the CLOSED 22-member `AssumptionSeat` union
     (`AssumptionPanel.tsx:108`, `assumptionRegistry.ts:39-61`): a leaves-out row is a hand-rolled
     `<li className="ap-row">` or a registry extension — "mirror the section" yields only the shell.
     TRAP 2 — a heading literally "What this leaves out" that names two items is ITSELF a completeness claim
     the constants falsify (`health.ts:72/:112/:120/:135/:319` declare four more OUT-but-disclosed facts) —
     scope the heading or name them. TRAP 3 — the HSA sentence must be true across ALL THREE zeroing
     branches (`taxOverlay.ts:1829-1835`, `:1849-1854`, `:1977-1980`): on each, EVERY bucket is zeroed
     because the path DEPLETED, so a bequest-framed sentence ("dropped from what's left to your heirs")
     names a state the engine cannot reach; the honest harm is that the plan is COUNTED AS HAVING RUN OUT
     while HSA dollars remain unspent (understated survival), because HSA outflow is qualified-medical-only
     and the general draw cannot name the bucket. "Dropped" is guard-safe; "draw … HSA" reds
     `copyGuard.ts:254`; `FALSE_CERTAINTY_INTERNAL` (`copyGuard.ts:147-156`) is universal and
     non-suppressible — "can't run out while the HSA lasts" reds. TRAP 4 — `verify:doc-stats` reds on ANY
     added test until README `:82` + roadmap `:165` move in the same commit. Sweep THREE comment spans (the
     `healthOverlay.ts:875-877` "a sweep found NO user-facing disclosure" clause becomes false the moment the
     section ships — rewrite the whole `:869-878`). Caddie walk before "shipped".

   ⚑ **CLOSED AS PHANTOM — the date-route ACA clock does NOT over-alarm.** The date route simulates all 11
   offsets (`dateSearch.ts:425/450/457`) and candidate Y=0 carries the base ACA stream **ungated**
   (`healthcareStreams.ts:160` → `windowStart = 0`, so the window gate is a pass-through). So
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
   intake-private and `reentryChrome.ts:68`'s points at different strings) and different words, since
   `mode === 'no-change'` is NOT "the winner is the plan you run" (it also fires on a seed-B display
   inversion and a $0 collapse). **No seed produces a `custom` winner**, so that branch would ship
   unwitnessable — mint the seed first or leave it.

8. **The whole still-working audience gets no strategy — silently.** `Result.tsx:509` gates
   `RecommendationSurface` off for the date route entirely and `:372` gates the invite door. The
   `blocked{spine-unready}` note that would explain it lives *inside* the gated-off component, so a working
   couple sees the date answer and **zero words** about strategy. `Result.tsx:345-347`'s comment now records the
   opposite (corrected 2026-09-04): the builder's `spine-unready` refusal does NOT cover the date route, so no note is minted there at all.
   ⚑ **THE FILED "CHEAP INTERIM" IS WRONG — do not execute it.** Dropping the `!isDateRoute` gate at
   `:509` alone renders an **empty `<div>`**, not the refusal: the note is not reachable on that path. And
   reusing `recommendSpineUnreadyNote` would tell a household with a **complete** answer that its answer is
   incomplete — a new false claim, worse than the silence. The honest interim is a **route-true one-liner**
   admitting the v1 limit in its own words, seated and re-measured under `verify:fit` (~89px headroom).
   **Briggsy blesses the words.** Full parity stays council-sized — the crowned offset lives in the
   committed answer, not the draft, and anchoring candidates at a future retirement year is a real ranking
   question.
   ⚑ **2026-09-04 anchors:** the gates are `Result.tsx:509` (surface) and `:372` (the invite conjunct; door
   `:574-582`); a THIRD exclusion kills the record card at its producer (`IntakeApp.tsx:284`). Strike
   "~89px headroom" — that is the SPINE idle frame's figure; the date arms of `verify:fit` assert ORDER + REACHABILITY only — never fit
   (spec header `vertical-fit.spec.ts:22-23`). `Result.tsx:345-347`'s "covers the date route honestly" comment was FALSE (never
   minted there; a route-flip render is dropped) — swept 2026-09-04. A crowned-offset params builder ALREADY
   exists (`buildControlPreviewParams`, `intakeMap.ts:1102-1111`), so parity's base shape is not from zero.
   Build shape: the ⚑ Folded 2026-09-06 block directly below.
   ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 6, the date-route one-liner) — its 2026-09-04 re-verify clause, still live:** Date-route one-liner (S) via a Caddie card — words must be true on all FOUR date-hero framings
   (anchor on WORK STATUS, never "a date ahead of you"); the one token yours: does it promise parity.
   ⚑ **2026-09-04:** the framings are no-date · now (today/arrived) · past · future (`heroLead`,
   `FuckOffDate.tsx:185-204`; the split household's floor line has its own six arms, `:211-240`). Seat =
   the else-arm of the `Result.tsx:509` gate, gated ALSO on `focusKey !== undefined` (else it prints beside
   the non-answer strip on an inputs-incomplete date frame); CSS in `fuckOffDate.css` — NOT
   `confidence.css`, the date grid is its own (`:238-254`) and its first free cell is r3c1 above the
   protected disclaimer; the key lands in verdict scope through the `fuckoff` substring net
   (`copyGuard.ts:72`) so free-numeral bites — no bare digit. The date arms of `verify:fit` assert ORDER
   only (only `dip` + `datenc` carry the exhaustive doors-last sweep) — add a presence pin to the `?seed=dip`
   describe and measure the vertical cost by hand. The line must also be true on the route-FLIP frame: a
   committed rec whose spouse un-retires lands `stale` (not `blocked`) and the gate drops the stale card's
   own re-open door with it. `Result.tsx:345-347`'s "covers the date route honestly" comment was FALSE —
   swept 2026-09-04.

9. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
    `solveDispatch.ts:92` returns `'no-pretax'` when no *conversion* candidate survives — but a
    conversion-free candidate survives for **every entry in `SEARCHED_POLICIES`** (`candidates.ts:651-657`),
    and `solve.ts:500-505` already implements that exact partition for the trend-blocked case.
    ⚑ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:185-192` mint-fails the
    roster *before* `solve()` runs, and `rankingStability.ts:247-255` knows only a conversion-**amount**
    perturbation. So dispatching the sequencing-only field would surface `mint-failed{roster}` **live** —
    the exact state `solveDispatch.ts:81` forbids in its own comment. Making it real needs a second
    validation law (a sequencing perturbation) under every shipped recommendation, which is a one-way door
    on what "validated" means.
    ⚑⚑ **The "cheap copy fix" is itself a TRAP (found 2026-08-02)** — the register entry *Modest pre-tax
    household refused a withdrawal-order answer the engine could compute* carries the negative.
    **Briggsy's words, or ship the engine half first.**
    ⚑ **2026-09-04 anchors:** the described arm is `solveDispatch.ts:92` (`:79` is the separate no-tax-overlay
    arm; `~:79` was mis-pointed at filing — the file is untouched since 2026-08-14); the refusal string is
    `copy.ts:1734-1735` with its three-rewrite comment `:1711-1733` (`:1589-1593` now holds an unrelated
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
    household (up to **14** steps — 8 unconditional + 6 gated, `questions.tsx:1236-1254`) if the
    reader confirms the dialog, because nothing is written until Save (the D1 law; a plaintext
    draft outside the vault is a security-posture ruling, never a build) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:578` refuses anything but
    v3, and the brick runs in the LEGACY direction: a v4 blob is caught honestly upstream
    (`scenarioCodec.ts:947` → `unlockNewerVersion`), but the moment a future build writes v4, today's v3
    vaults fall into the arm v1/v2 sit in now — decode-ok, then "That didn't work. Try again." over a
    reload that cannot succeed (`IntakeApp.tsx:670-687`) — and their backups fail identically (same bytes,
    `backup.ts:84-93`) · there is **no way to delete the vault** (`clearVault` exists; its only PRODUCTION
    caller is the dev seed planter, `devSeeds.ts:1738` — eight test/e2e files also call it).
    ⚑ **Folded 2026-09-06 from the superseded b9-3 plan (its item 9 — the aged note, the v2→v3 ladder, the leaves-out section) — its 2026-09-04 re-verify clause, still live:** Aged-window disclosure note (S; the ranking fork stays yours, three arms with corrected costs, due
    before 2027-01-01) · migration ladder scaffold (S; the honest legacy state names NO remedy — the
    backup carries the same bytes) · HSA-forfeit + LTC "What this leaves out" section (M; pilot per the
    register — the queue's owner call is the account-total confirm only).
    ⚑ **2026-09-04, each re-scoped:** (a) THE AGED NOTE IS NOT PILOT — the register's *The aged surface* entry (its crowned-window build-year anchor bullet) rules "Do NOT fix this in
    copy" and both nearest register entries — *The aged surface — every 2026 plan changes wording on 2027-01-01, unreviewed* and *Unscored Caddie tape rows plus the four aged-surface tone calls due before 2027-01-01* — are owned **briggsy**; neither is a copy fix; the "three arms with
    corrected costs" existed NOWHERE — they are now written, with sizes, under the register's "The aged
    surface" entry. A shipped copy defect on the SAME cohort WAS pilot and is FIXED (2026-09-04: the singular arm ships at
    `copy.ts:2629-2631` under the NUMBER AGREEMENT post-mortem at `copy.ts:2615`, covered by `copyGuard.test.ts:706`):
    `rothPlanRanked` hardcoded the plural "Those years are counted from…" after a correctly-singular "for 1 year" —
    live for any at/past-RMD household on an aged vault (the 1-year clamp, `solveAnchor.ts:263-264`) — and no test
    covered `years: 1, passed: true`. (b) THE LADDER is register `L` · **pilot**, and the v2→v3 ALGORITHM IS
    PRESCRIBED: `model.ts:1399-1401` mints synthetic entered accounts from the old aggregates "so the ladder
    stays total"; the write primitive exists (`db.ts:231 rewriteModel`, pinned `db.test.ts:180`); today's
    ladder is decode-and-return with NO migrate step (`scenarioCodec.ts:930-947`), and a v1 vault survives
    every store seam on real IndexedDB (`e2e/vaultHarness.ts:19-20`) to die only at `IntakeApp.tsx:578`.
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
    `memoryModel.ts:777-780`); what remains is the interactive tier and the MAIN-THREAD FALLBACK, which still
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
    `verify-the-back-nine.yml:72` (the `verify` job's install — NOT the `:109` twin in the `verify-rv-chart-text`
    job); scope at TEST level — `vault.spec.ts:70` (trust loop) + `:121`
    (second-tab read-only), never the whole file: the KDF spike `:145-176` asserts a Chromium-only
    thread-pool fact; the arm RECORDS the storage capability triple and asserts only Web Locks — WebKit exposes NO
    `navigator.storage.persist()` (measured 2026-09-08; `db.ts` calls it advisory) — it does NOT verify Safari eviction (nothing in the repo executes a real eviction;
    both harnesses model it with a wipe). ENLARGED TEXT: `Page.setFontSizes` re-probed 2026-09-04 against
    the repo's chromium-1223 — the param shape is `{ fontSizes: { standard: 24, fixed: 24 } }` (the flat
    form is rejected); it propagates because the type scale is rem/clamp with ZERO literal-px `font-size`
    rules; the `newCDPSession` pattern is at `caddie-walk.spec.ts:324`, and the shipped arm's own helper is `raiseDefaultFont` (`vertical-fit.spec.ts:466-479`); re-run the 8 REAL+TIER one-frame
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
    clause was swept in `staleness.ts:619-622` but still lived verbatim at `model.ts:2270` (swept), and
    Plan 4's "the record carries `seedA`/`seedB`" (`plans/4-recommendation.md:282`) had outlived its own
    "kill BEFORE S5 mints" deadline — the shipped `SavedRecommendationV3` (`model.ts:1891-1913`) has no seed
    field (struck in the plan). ⚑ (b)'s SOURCE twin outlived that close — `heldOutSeed.ts:13-14` still said
    the U17 record stores the seed — and was swept 2026-09-25 (the register bullet is closed with it).
    ✅ **NC's RETIRED CERTIFICATION CHECKPOINT — SWEPT 2026-08-14.** Six shipped surfaces (not the
    five filed; `CLAUDE.md:38` turned up in the sweep) still asserted the dead ~Aug-2026 event in
    PRESENT tense after S.L. 2026-41 struck every trigger row FY2025-26 → FY2032-33 on 2026-08-02:
    `scripts/verify-state-tax.ts` header + its `nextDue` doc comment · `verify-the-back-nine.yml:50-51`
    · project `CLAUDE.md:38` · and two in the engine — `constants/types.ts` and
    `validation/oracleToken.ts`. All now name it as RETIRED, in past tense, and the two engine
    docblocks additionally record that **`certification-pinnable` currently fires for NOBODY** — the
    kind survives only because the machinery is generic and the next directional state re-arms it,
    which is the thing a reader would otherwise mis-infer from an NC example written in the present.
    The `verify-state-tax.ts` header also gained the source landmine it was missing: NCDOR's rate
    page and the codified G.S. page both still show the struck "after 2025 — 3.99%", so they read as
    CONTRADICTING the pinned record until they recompile — **session law wins, do not "correct" the
    engine table back to a flat 3.99%.** Comment-only; typecheck · lint · 3289 tests · state-tax gate
    all green. (`copy.ts:3024` and `caseStateCompanions.ts` were already correct — swept 2026-08-02.)
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
    `copy.ts:3071`; a new `recViz` prefix would red the three hedge-free arm labels — each measured to red
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
    those two arms. Two half-swept false comments closed 2026-09-04: `model.ts:2270` and
    `plans/4-recommendation.md:282`.

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
  `projects/the-back-nine/**` (plus the workflow file itself) and runs TWO parallel jobs: `verify`, in order —
  `verify:aca` · `verify:state-tax` · `lint` · `typecheck` · `verify:doc-stats` · `test` · `build` ·
  `verify:bundle` · `verify:csp` · `verify:fit` — and `verify-rv-chart-text`, which runs `verify:fit:rv` alone
  (three serialized arms, each a full-precision solve, since 2026-09-07; ~5.4 min for the whole step on the worker pool at `53f1ae71`, run 37166135388, against 36.0 min before the solve-time levers, run 37144203722, and 9.8 min after them on the single worker, run 37157413217). **All eleven.** `vercel.json` carries no
  `buildCommand`, so a deploy still runs the default build with no gate — CI is the gate, Vercel is not.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (one file per lesson; cite by full path + slug).
These are the mechanical ones that keep costing hours.*

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
- **`verify:fit` does NOT measure the recommendation surface** (`e2e/vertical-fit.spec.ts:705-715`
  excludes the committed + held renders — the exclusion dates from 2026-07-22, before the worker pool, when a dev-server solve ran 80–200 s+ against the then-120 s per-test budget (now 180 s, `playwright.fit.config.ts:53`); on the pool a dev-server `solve:nc` / `solve:surplus` takes ~30 s at the laptop (`e2e/caddie-walk.spec.ts:704-706`; CI hardware not measured), but the fit arms still inject the committed lockup and never wait for a committed solve). So *"seat it and re-measure
  under `verify:fit`"* is **unexecutable** for anything in `.rec-committed__rest`; it needs a MANUAL
  1536×791 measure. And the *"~89px headroom"* number is the SPINE idle frame (`vertical-fit.spec.ts:2387-2389`), a once-measured
  prose figure the spec never asserts — **never budget a different surface against it.** The DATE route's
  arms assert ORDER + REACHABILITY only (spec header `:21-22`) — no date frame has ever been fit-measured either.
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
  `gotoSeedFinal`'s final-tier wait (`FINAL_TIER_MS` = 150 s today, `reviewSurface.ts:100`; it was 90 s when this was filed) — the heaviest date seed
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
cost the next one.** `recommendationView.ts:218-223`: `noChange` **OR** the grade's `subTenthCollapse`
**OR** a seed-B display inversion **OR** a delta that formats to $0. So *"the surface says **You're
already on one of the strongest paths**"* is **NOT** evidence that `noChange` is true, and a browser
frame can be byte-identical before and after a change that genuinely flipped the flag. Read the payload,
never the words, when the question is about a flag.


*The dated blocks below, newest first, were moved here 2026-09-25 out of the session records they were written into (the
records themselves are cut — `git log` is the history).*

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

**LANDMINES (2026-09-13 late):** `String.prototype.replace` with a replacement STRING treats `$$` as one `$` — an edit script that rewrites copy templates (`~$${x}`) MUST use a function replacer or every dollar in the slot silently vanishes (it did: 21 restored, caught by the one-year on-ramp arm) · `grep -q $'\r'` under Git Bash reports LF on a CRLF file — measure EOLs with `git ls-files --eol` or `tr -cd '\r' | wc -c` (the insights README is i/crlf; `devSeeds.ts` and `healthSheetChrome.test.ts` are CRLF, `healthSheetSeedGate.test.ts` LF) · a council's ruled MITIGATION for a red-team hit can be wrong at source (hit #4's "the span bounds the rule") — measure the ruling's own claims before recording them as verified · a dead session's Workflow verdict lives in `~/.claude/projects/<proj>/<session>/tasks/<task>.output` (the `result` field) and its script under `workflows/scripts/` — recover from there, never re-run the council · `retired` has NO health door (post-65-only households render the verdict-level priced note), so its byte-identity is a composer fact, not a walkable surface — the Caddie walks `healthnc` + `healthgap`.

**LANDMINES (2026-09-13 evening):** a Workflow fleet dies WHOLESALE at the session limit, and a script's "≥ 2 votes survive" rule then marks every finding REFUTED with zero votes — read the result's `votes` (or `journal.jsonl`) before trusting a refuted list; `resumeFromRunId` after the reset replays the cached seats and re-runs only the dead ones · the council-log's table header repeats per section — anchor an insert on the FIRST DATA ROW, never the header · a door crop cuts above a tall sheet's actions row — the blocked-Apply look needs the scroll-and-clip harness (this session's scratchpad `look/`; port 4197) · the Edit tool needs a register bullet's exact bytes — Read the lines before Edit, never quote from memory (one bullet lacked the "(two seats, survived)" tail I remembered) · a council's "verified in source" line numbers are the council's — re-open the lines before building (the Card 13 API cites `OddsLadder.tsx:276/:300`) · at 44 % with three fleets in flight the honest call was "finish the open fix, then a freshy" — it held at ~52 %.

**LANDMINES (2026-09-13):** a build brief's "re-point these three citations by hand" and a delta re-anchor tool are MUTUALLY EXCLUSIVE on the same citation — the tool maps from the base commit's numbers, so a hand-fixed citation gets mapped AGAIN (revert hand fixes to the old numbers, then run the tool once, last) · `aria-disabled` is one strand of the `disabled` bundle: jest-dom's `toBeEnabled` goes silently vacuous, a `:not(:disabled)` hover rule starts matching, and Playwright 1.60 refuses the click (`getAriaDisabled` in coreBundle.js — the installed file lives under `node_modules/.pnpm/playwright-core@1.60.0/…/lib/coreBundle.js`, not `generated/injectedScriptSource.js`; insight 131) · a CSS rule that reaches a sheet FAMILY re-skins sheets that OPEN blocked (HealthcareSheet: `picked === applied` on arrival; RothLever: an empty plan) — a loud "cannot commit" with no sentence is worse than the mute; make the look conditional on the rendered reason (`[aria-describedby]`) · `--on-brand` and `--paper` are one hex, so a primary whose fill eases from transparent blanks its label for the fade — never transition the fill of a state flip · EOL is per file (the insights index is CRLF, most of the tree LF) — measure with `git ls-files --eol`, never assume · a Caddie door crop cuts above a scrolling sheet's actions row — the look of a blocked Apply needs its own scroll-and-clip capture · the classifier that gates auto-mode Bash can rate-limit mid-session; read-only tools keep working, so route the wait into Read/Grep work · a review fleet of 114 agents is ~11 M subagent tokens and a 460 KB result — digest from the pretty-printed JSON envelope's `.result`, never the raw file · a number that gains a platform label needs every sibling number on its line labelled too — the Linux-ink pass (`a4030a92`) found three Windows-only figures left unlabelled beside the new Linux one, and its own prescription's site list missed five sites that four skeptic passes caught: a filed site list is its author's memory, the sweep is the deliverable.

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
`src/ui/devSeeds.ts` — `DEV_SEEDS` at `devSeeds.ts:1122`, `AGED_PLANTS` at `devSeeds.ts:1670`.

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
is **`lattice harbor cinder vellum 48 thicket`** (`devSeeds.ts:1168`). For RestoreFlow you need a
real backup FILE and no full intake is required: unlock any plant → Result → **"Save a backup
file"** → *Download backup* (an `<a>` with a blob URL, **not** a button — a `button:has-text()`
selector misses it) → then delete the DB and reload. **`indexedDB.deleteDatabase` is BLOCKED while
the app holds the connection** — fire it, navigate to `about:blank`, then back; deleting and
reloading in one step silently leaves the vault in place and you land on Unlock wondering why.
⚠️ **AND ANY OTHER TAB with the app open blocks it the same way** (bit again 2026-08-20: the
deleting tab did the about:blank dance correctly while a second tab held the connection — the
vault silently survived a "successful" deletion). Close every other app tab first.
