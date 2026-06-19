# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

1. **R40 U3 — the atomic engine integration (U1+U2 DONE & committed; U3 is next).** Decisions: [`docs/decisions/other-income-r40.md`](docs/decisions/other-income-r40.md) (nine KTDs); narrative: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md) R40 §. **U1** (types: `IncomeStream` union + compiled leaf, `772ca158`) and **U2** (`compileIncomeStreams` + externally-derived goldens, `7a87c009`) are landed, both adversarially reviewed. U3 is ATOMIC (seam 1 without seam 2 = income reduces the draw without being taxed = the optimistic sin), so land it as ONE focused pass guarded by the reduce-to-spine 962-test net + discriminating tests + a full `/ultramode-code-review`. **The integration is fully mapped — exact insertion points:**
   - **Select** `ongoingIncomeForYear(t, income, deathOffsets) → {gross, taxable}` in `src/engine/simulate.ts` (sibling of `contributionsForYear`; KTD-4 select: owner-alive→FULL, owner-dead+**spouse**-alive→SURVIVOR, both-dead→0; PER-OWNER death gate, never a household-level gate — the swap-mutant target).
   - **Seam 1** `simulate.ts cashTermsForYear:260` — `net = clampedWorking ? 0 : max(0, spending − earned − sel.gross − ss)`; extend its return to `{net, ss, ongoingTaxableGrossUp, ongoingTaxableIrmaaOnly}` where the clamp (`accumulating && livingWorker`) splits the taxable: `grossUp = clamped?0:taxable`, `irmaaOnly = clamped?taxable:0`. Single-sources the clamp.
   - **Path loop** `simulate.ts ~906` (inside `if (overlay)`) — push `cash.ongoingTaxable*` into two arrays; pass to `runTaxAwareDecumulation` presence-keyed on `overlay.income`.
   - **Seam 2** `taxOverlay.ts solveGrossWithdrawal:939` — `nonSSordinary = max(alloc.pretax, rmd) + conversion + ctx.ongoingTaxable` (KTD-1: SS-§86 / ACA-MAGI / IRMAA all ride this ONE producer). Add `ongoingTaxable` to `GrossUpContext:912`; set it in the `grossUpCtx` assembly `:1513` = `ongoingTaxableGrossUp[t] ?? 0`.
   - **KTD-9 IRMAA decouple** `taxOverlay.ts:1598` — `irmaaMagiHistory[t] = (irmaaMagiOverride[t]??0) + irmaaMagi(components) + (ongoingTaxableIrmaaOnly[t]??0)`. The clamped-year income taxable kept OUT of the gross-up (no phantom withdrawal) lands in IRMAA-MAGI, counted exactly once.
   - **TaxYearInputs:213 + runTaxAwareDecumulation destructure ~:998** — add `ongoingTaxableGrossUp?` + `ongoingTaxableIrmaaOnly?` (default `[]`).
   - **validateParams** `simulate.ts:376` income block (mirror the accumulation block `:561`): `incomeByPerson.length === people.length`; each of grossFull/taxableFull/grossSurvivor/taxableSurvivor `.every(finiteNonNeg)` + `≤ ENGINE_MAX_DOLLAR`; `startAge < currentAge` ALLOWED.
   - **Intake wiring** `intakeMap.ts buildOverlay:438` — `compileIncomeStreams(d.incomeStreams, d.people.map(p=>p.currentAge!), horizonYears, productionMarket.value.inflation.mean)`, spread `...(income ? {income} : {})`; **FIX the early-return guard `:440`** so a household with ONLY income (no accounts/health) still builds the overlay.
   - **Date-sweep un-truncation** `dateSearch.ts` — income is Y-invariant (KTD-8a): pass through `...overlayBase` UN-truncated, compiled ONCE in `buildParams`, never per candidate (read the overlayBase stream-truncation site first).
   - **Discriminating tests**: reduce-to-spine swap-mutant (absent income byte-identical), §86-rose-ONCE, IRMAA decouple (no phantom withdrawal on the wages-only clamped path; IRMAA = wages + pension counted once), survivor both-dead⇒$0, **cross-owner-death-order swap-mutant** (a single household death gate FAILS — KTD-7). Load the four-skill UI loadout before U4 (intake UX).

2. **U8 — save/load (brought forward).** `ScenarioV3` is defined; remaining = the codec v3 arm (a *separate* `checkPersonV3`, never mutate the frozen `checkPerson`), `AnyScenario` membership, the user-facing **first-Save ceremony** (passphrase-strength gate `zxcvbn-ts` ≥3 ∧ len ≥12 + recovery-phrase display + mandatory export), and load-on-return. NOTE: the encrypted-vault IndexedDB writer (`writeVault`/`rewriteModel` in `store/db.ts`) **already shipped with U4** and is wired into `backup.ts`/`session.ts` — U8 is the *flow* + the v3 writer, NOT a new persistence layer. Fold in the portfolio-holdings model field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) on the same persisted shape — no v3→v4 migration.

3. **The first visible answer surface.** Two-pane laptop mockup (Briggsy's eye first — don't commit blind) → the U6 confidence-band render → U7 confidence statement + D2 state-adaptive surface. Load the four-skill UI loadout first. Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

4. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.

## Verify-owed
- The OOP-medical hint figure (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) is grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin it cell-by-cell. Conservative-by-design while it stays directional.
