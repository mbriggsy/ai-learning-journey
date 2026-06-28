# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

1. **PRIME-THE-PUMP DEV SEED — a dev-only way to reach the result without re-driving the intake (Briggsy's ask 2026-06-28; "not re-entering values every time"). BUILD FIRST — it unblocks every cold-read after.**

   **WHY:** verifying any band/result change today means hand-driving ~8 intake screens. Not ATC-like. A seed jumps straight to a worded result.

   **PRESCRIPTION:**
   - New `src/ui/devSeeds.ts` (DEV-only, dead-code-eliminated in prod exactly like the `?preview` branch): export one or more COMPLETE `ScenarioDraft` fixtures. The all-retired on-track couple proven live this session: people **66 / 65** both `retired`, stop ages **65 / 63**, sex male/female, pia **30000 / 24000** (annual; the field stores annual = monthly×12), `socialSecurityClaimAge` **67 / 67**, `annualSpendingReal` **78000** (spendEntryPeriod 'month'), one Traditional IRA **$1,000,000** @ 60/30/10, `health.irmaaMagiSeed` **[80000, 80000]**. Must be a COMPLETE draft so `validateParams` accepts → a worded (non-indeterminate) result.
   - `src/main.tsx`: read `?seed` (DEV-only, mirror the existing `?preview` gate) and pass it into `<App/>` → `IntakeApp`.
   - `src/ui/IntakeApp.tsx`: when a seed is present, `appModel.update(() => SEED_DRAFT)` at mount AND start in `phase='result'` (so it lands on the elevated answer). Keep "Review my answers" working (it just flips to intake with the seeded draft intact).
   - **LANDMINE:** nothing may persist to IndexedDB (the no-write-until-Save rule) — the seed only mutates the in-memory `appModel`, same as a normal intake.

2. **THE DATE BAND (slice 2 of the band evidence) — the showcase "fuck-off date" half. The spine band (slice 1) is DONE; this is the not-yet-retired route.**

   The wire-trace was VERIFIED 2026-06-28 (10-agent sweep); these findings are confirmed against code:
   - **(a) Emit the crowned fan** — `src/engine/dateSearch.ts` `runDateSearch`, after `decideTrack` (~line 465): run `simulate(candidates[track.offsetYears], seed, {bandFan:true})` ONCE and attach `.distribution.bandFan` to a NEW field on the 'dates' outcome. `candidates[]` is live at the return; the dense-axis contract guarantees `candidates[offsetYears]` IS the crowned candidate; CRN makes the re-run byte-identical to the crowned sweep reading. **Cost: one extra pinned-path run at the crowned offset — DECIDED 2026-06-28 (the single targeted re-run, not fattening every sweep candidate).** `decideTrack` itself CANNOT emit it (signature is `(curve, paths)` — no `SimulationParams` in scope).
   - **(b) Wire it** — add the fan field to the `DateSearchOutcome` 'dates' arm (`src/shared/model.ts`). The date wire (`DateSearchWire`) is **structured-clone only** (no transferables — ≤11-pt curves), and `bandFan` is plain numbers, so it rides `dateSearchFromWire` automatically once it's on the outcome. Confirm in `src/engine/engineWire.ts`.
   - **(c) OutcomeState mapping — DESIGN + BRIGGSY COLD-READ (do NOT guess).** `resolveBandData(fan, outcomeState, …)` needs an `OutcomeState`; a date track carries only a `grade` (quantizedLowerBound). Decide the mapping (a confirmed date → which state drives the band's edge/callout semantics?). Honesty-critical → back-nine-design law.
   - **(d) FuckOffDate drawer** — `src/ui/FuckOffDate.tsx`: add `band?`/`bandAnnotations?` to the `dates` view variant; mirror `ConfidenceStatement`'s `resolveBandData` `useMemo` + `<ConfidenceBandPanel>` mount inside the confirmed-date `.fod-reveal` branch (reduced-motion + the band's internal motion come free). The "fuck off today" (offset 0) case most needs it.
   - **(e) Date-route annotations** — a date-route deriver that INCLUDES a future **"work stops"** marker (the household is not-yet-retired, so unlike the spine route the work-stops moment is in the FUTURE). Template: `src/ui/bandAnnotations.ts` `deriveSpineBandAnnotations` (Today + decade ticks + horizon); add a work-stops marker at each person's retirement age. Copy: `bandClockWorkStopsLabel` (mirror the fixture's "Work stops").
   - **(f) Tests** — a date-fan wire round-trip + a crowned-fan test (NONE exists today).
   - **LANDMINE:** the date sweep IS tiered (provisional/final) → the **re-draw-not-morph** obligation MATTERS here (provisional vs final fan differ in scale; hold `dollarMax`/`horizonYears` stable across recompute or treat a change as a re-draw, never a cross-scale morph). The spine path was untiered (byte-identical), so it didn't need this; the date path does.

3. **BAND HOVER/TOOLTIP — on mouseover, show the ages + dollar values at that point on the fan (Briggsy's ask 2026-06-28). Lives in the SHARED renderer, so it benefits BOTH bands — build once.**

   **PRESCRIPTION:** add a pointer-move handler to `src/viz/ConfidenceBand.tsx` that maps cursor x → nearest lattice sample → a tooltip showing the household-clock **ages** at that year (reuse the deriver's age math) + the percentile **dollars** (median + 10th–90th), `tabular-nums`, ~humane precision via copy slots.
   - **CSP LANDMINE:** inline `style` attributes are governed by `style-src 'self'` (back-nine-design §CSP) — a JS-set `el.style.transform`/custom-prop is an inline style and is BANNED. Render the tooltip as an **SVG-internal** element (a `<g transform="…">` positioned by attribute, text via class) so it stays CSP-clean, OR solve positioning without an inline style attribute. Reduced-motion: instant follow, no animation needed.
   - **Four-skill UI loadout before touching it** (new interactive surface): back-nine-design (law) + emil-design-eng + compound-engineering:frontend-design + web-design-guidelines.

4. **D2 remaining: (c) the confidence-curve drawer + (d) the two-pane laptop layout.**
   - **(c) confidence-curve drawer** — the date's secondary "how your odds shift by *when* you stop." Uses `DateTrackOutcome.curve` (already crosses the wire). Honesty-critical curve-reading semantics — designed separately.
   - **(d) two-pane laptop showcase layout** — the richer composition (laptop is primary). **ATC/layout call — Briggsy's eye.** Do LAST, with Briggsy awake to cold-read.
   - **Already-failing magnitude clause — BRIGGSY'S COLD-READ CALL (still owed):** off-track and already-failing share `verdictTrimClause`. For a 0-of-10 plan it may read as falsely-actionable. Re-cold-read the **already-failing** case asking *"does this read as 'cut this and you're fine'?"* — if yes, a dedicated already-failing clause (a "what would have to change" framing, not a single sufficient-sounding trim).

5. **U8 — the first-Save ceremony (eye-oracle, deferred).** The v3 restore codec is ✓ DONE (commit 90d2efe5). Remaining: the user-facing ceremony (passphrase-strength gate `zxcvbn-ts` ≥3 ∧ len ≥12 + recovery-phrase display + mandatory export) and load-on-return wiring. DEFER to a Briggsy cold-read.
   - **OPEN ATC CALL (do NOT build solo):** the portfolio-holdings multi-holding field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) is unratified. `ScenarioV3` ships WITHOUT it. Ratify before folding `holdings[]` in — no v3→v4 migration if folded during U8.

6. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse". (NB: `deriveSpineBandAnnotations` currently assumes a two-person household for the ages string — generalize it when this lands.)

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Done this arc (state pointers — git log has the detail)
- **THE BAND EVIDENCE — spine band ✓ COMPLETE + VERIFIED LIVE** (2026-06-28). `bandFan` now crosses the worker wire (opt-in via `run`'s 3rd options arg → `runEngine` packs it presence-keyed; `ResolvedWire`/`fromWire` carry it; structured-clone, NOT a transferable). `memoryModel` spine branch requests `{bandFan:true}`; `answerView.spineBand` feeds the band + screens the $0-portfolio household (no honest dollar scale → no band); `src/ui/bandAnnotations.ts` derives the household-clock x-axis (Today + decade-age ticks 70/80/90/100, capped at 100 + Plan horizon at the fan's ACTUAL last year — NO work-stops on the all-retired route). **Dead-cohort de-emphasis (obligation #3) DONE** — `src/viz/bandGeometry.ts` `cohortFadeOpacity`/`cohortFadeStops` + an SVG mask in `ConfidenceBand` fade the thin late-cohort tail (`COHORT_FADE` constants are cold-read-TUNABLE; Briggsy = "ok" 2026-06-28). Verified by a real-engine end-to-end test + a real-fan render test + the live browser drive.
- **Enlarged-modal legend (horizontal) + no-scroll ✓** (2026-06-28) — extracted `src/viz/BandLegend.tsx` (`layout: 'stack' | 'row'`); the drawer keeps the vertical stack, the modal gets the horizontal span. `band.css` `.band-modal__dialog .band-figure` height budget dropped 82vh → **68vh** to make room for the legend so the modal NEVER scrolls — do NOT raise it back.
- **U7 confidence statement ✓ COMPLETE** (cold-read + `/ultramode-code-review` cleared 2026-06-27; [insight 044]). Surface, survivor readout (component), copyGuard, the band producer + panel, the verdict signals — all shipped.
- **D2 (a) state-adaptive routing ✓** (commit 61b9d9bf) — `selectElevatedAnswer` (date / spine / fallback). **D2 (b) live-wiring ✓** + **reveal-on-provisional ✓** (commit a6145d1d).

## Landmines (carry forward)
- **The `?preview` harness does NOT exercise the live deriver** — it renders fixtures with a hardcoded 3-marker `HOUSEHOLD_ANNOTATIONS` (Today/Work stops/Plan horizon). So the spine band's **decade-age ticks only show on a real drive / the dev seed**, never in `?preview`. (It DOES show renderer changes — the fade, the horizontal legend.)
- **The decade-tick de-collision** (Today + age-70 sit ~8% apart) stacks the close pair to a lower row — verify it reads clean on a real drive; if it bugs Briggsy, tune `HORIZON_TICK_PAD_YEARS`/the first-decade skip in `bandAnnotations.ts`.
- **The SURVIVOR READOUT is ALSO dormant** (built `src/ui/SurvivorReadout.tsx` + cold-read on `?preview`, but NOT wired live — `distribution.survivorConditioned` + `survivorReading` are dropped by the SAME `ResolvedWire`/`fromWire` gap the band had). A future item: mirror this session's `bandFan` wire work (request in `runEngine` + carry on `ResolvedWire`/`fromWire` + thread into the `ConfidenceStatement` reading view).
- ONE shared market draw/year (CRN); a fan-on run is byte-identical to fan-off on the goldens (`bandFan.test.ts` reduce-to-spine guard). Stateless Box-Muller. Externally-derived fixtures (DND 012). The band renderer + producer are DONE — feed them, do not redesign.

## Parked (Briggsy's call)
- **The work-income re-ask (cold-read #2):** "Income Medicare looks at" re-asks what the salary page captured. **Recommended fix: pre-fill the field from `earnedIncomeReal` as a VISIBLE, editable default** (a confirmation, not a burned/062 silent default). PARKED 2026-06-28 awaiting Briggsy's go.

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** **native Agent Teams** for live-steer **eye-oracle** units; the **Workflow** tool for fire-and-forget **test-oracle** fan-out. Durable laws in memory `feedback-delegated-build-laws`.

## Verify-owed
- The OOP-medical figures (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin them cell-by-cell.
