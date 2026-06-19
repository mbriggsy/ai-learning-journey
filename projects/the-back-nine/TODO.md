# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

0. **Doc restructure — M1–M5 DONE + M6 steps 1–3 DONE. ONE open decision blocks the finish.** Foundation (CP1 + CP1.5), **M1 (ledger)**, **M2 (four hubs)**, **M3 (four `decisions/` records)**, **M4 (four plans)**, **M5 (two research docs)** are committed. **M6 zero-loss gate PASSED + `docs/plans/features/` demolished** (commit `0d5ccf48`): every load-bearing fact from the 3 dissolving feature docs is homed in the surviving tree, all 14 cross-home relocations landed (the last gap — the no-tax-blind-arm decision — was added to product §4), `docs/README.md` repointed, forward-only sweep clean, 314/314 links resolve. The new tree is the live truth now; the feature docs are gone.

   **⮕ RESUME HERE: the open fork is M6 step 4 — the P→Act code-comment sweep (Q3b).** Verifying per-hit revealed it is **NOT a mechanical sweep** — DECIDE the approach with Briggsy first:
   - **Scope is Q1-tangled.** Only **2** `src/` comments use the full word "Phase N" (the literal Q3b target: `src/shared/model.ts:551`, `src/store/memoryModel.ts:16`). The other ~128 `P`-refs are `P{n}·U{m}` compound IDs (the **stable-ID taxonomy Q1 locked**) or `P{n}` abbreviations ("the P4 solver"). The `decisions/` records keep `P3·U9` / `P1-exit pin pass` / `P1 closed`, and the **insights corpus (out of rewrite scope) keeps P-form entirely incl. frontmatter** — so converting the IDs creates code↔docs drift, not cohesion. The "~18 files" estimate predates this mixed reality.
   - **Some comments carry STALE PRE-FOLD CONTENT, not just old terminology** — a mechanical rename would lock in known-wrong facts. Confirmed: `src/shared/model.ts:551` says the schemaVersion-2 fields are *"first WRITTEN to disk by Phase 3"* — the accumulation fold **moved that to Act 2** (plan-1 U2 + `insight/018` say so), so it must become **Act 2**, not "Act 3". The whole comment's rationale is pre-fold. Other `P{n}` comments need the same per-hit check.
   - **The fork:** (a) do the careful per-comment pass now (full-word "Phase N" → "Act N"; fix the stale ones like model.ts:551 → Act 2 against the current docs; leave the Q1-locked `P{n}·U` IDs + the abbreviations the docs/insights keep), its own commit; OR (b) defer it to its own tracked TODO item and finish — Claude leans (b): the doc restructure (the real goal) is done, and this is separable code-hygiene that deserves a focused pass, not a rushed deletion tail.
   - **THEN M6 step 5 (held):** delete `RESTRUCTURE-PLAN.md` + `.recovery/` (the scaffolding — kept ONLY because it records this step-4 obligation; safe to delete once step 4 is decided/done). Read [`RESTRUCTURE-PLAN.md`](RESTRUCTURE-PLAN.md) §"RESUME HERE" for the full M6 carry-forward + the M5 register-completion notes.

1. **Build R40 — other income in retirement.** The immediate next build, build-ready. The **decisions** (the nine KTDs, per-type defaults, the conservative-or-disclose discipline) are [`docs/decisions/other-income-r40.md`](docs/decisions/other-income-r40.md); the **build narrative** (five dependency-ordered units — U1 types → U2 `compileIncomeStreams` + externally-derived goldens → U3 the atomic engine integration → U4 intake UX → U5 the requirements-doc amendment) is in [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md) (R40 section); the verified tax facts are registered in [`docs/research/engine-validation-and-tax.md`](docs/research/engine-validation-and-tax.md). Do not regress the nine KTDs. Run `/ultramode-code-review` at each unit boundary; load the four-skill UI loadout before U4 (the intake UX).

2. **U8 — save/load (brought forward).** `ScenarioV3` is defined; remaining = the codec v3 arm (a *separate* `checkPersonV3`, never mutate the frozen `checkPerson`), `AnyScenario` membership, the Save ceremony (no IndexedDB write exists anywhere yet), and load-on-return. Fold in the portfolio-holdings model field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) on the same persisted shape — no v3→v4 migration.

3. **The first visible answer surface.** Two-pane laptop mockup (Briggsy's eye first — don't commit blind) → the U6 confidence-band render → U7 confidence statement + D2 state-adaptive surface. Load the four-skill UI loadout first. Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

4. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.

## Verify-owed
- The OOP-medical hint figure (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) is grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin it cell-by-cell. Conservative-by-design while it stays directional.
