# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

0. **Doc restructure — GREEN-LIT, mid-flight. M1 DONE.** Full ground-up rewrite. Foundation (CP1 front door + legends, CP1.5 README split) **and M1 (the migration ledger)** are committed. M1 = `.recovery/migration-ledger.md`: all 1,081 quarry facts routed to their new-tree home, zero-loss, adversarially verified + fixed (74 findings; dual-canonical class resolved), with a Review Queue appendix (findings + 14 cross-home relocations). The structure + four radical moves (delete `features/`; dissolve the accumulation "fold"; promote `decisions/` to 4 records; halve plans 3+4) are locked. **Resume at M2** — rewrite `product`/`roadmap`/`architecture`/`glossary` present-tense, each authoring FROM its home-section of the ledger (read [`RESTRUCTURE-PLAN.md`](RESTRUCTURE-PLAN.md) §"RESUME HERE"). Do NOT delete `features/` or strip history until M6's zero-loss gate. Delete `RESTRUCTURE-PLAN.md` + `.recovery/` when it lands.

1. **Build R40 — other income in retirement.** The immediate next build; plan is committed + build-ready: [`docs/plans/features/other-income.md`](docs/plans/features/other-income.md). Five dependency-ordered units (U1 types → U2 `intakeMap` + externally-derived goldens → U3 the atomic engine integration → U4 intake UX → U5 the requirements-doc amendment). The nine KTDs are in that plan — do not regress them. Run `/ultramode-code-review` at each unit boundary; load the four-skill UI loadout before U4 (the intake UX).

2. **U8 — save/load (brought forward).** `ScenarioV3` is defined; remaining = the codec v3 arm (a *separate* `checkPersonV3`, never mutate the frozen `checkPerson`), `AnyScenario` membership, the Save ceremony (no IndexedDB write exists anywhere yet), and load-on-return. Fold in the portfolio-holdings model field ([`docs/plans/features/portfolio-holdings.md`](docs/plans/features/portfolio-holdings.md)) on the same persisted shape — no v3→v4 migration.

3. **The first visible answer surface.** Two-pane laptop mockup (Briggsy's eye first — don't commit blind) → the U6 confidence-band render → U7 confidence statement + D2 state-adaptive surface. Load the four-skill UI loadout first. Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

4. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.

## Verify-owed
- The OOP-medical hint figure (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) is grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin it cell-by-cell. Conservative-by-design while it stays directional.
