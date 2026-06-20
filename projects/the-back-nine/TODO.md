# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

1. **R40 closeout — Unit 5 (the requirements-doc amendment).** Small. **R40 U1–U4 are landed** — U4 = the other-income **intake UX + the KTD-9 copy half** (`d58b26d3`, built via a build-swarm: the 6-lens panel caught + killed a live out-of-range-survivor-% **cardinal-sin** bug the implementer shipped green; 1047 tests green, COLA control polished to a calm vertical stack). The KTD-9 tripwire now **PASSES** (the deferred copy half shipped — the working-year override is wages-only, the intake copy inverted). Unit 5 just reconciles any **superseded-premise lines** in [`docs/product.md §7`](docs/product.md) (insight 018 — an amendment's blast radius is the consumers of the superseded premise); the additive R40 entry is mostly already carried there by the doc rebuild.

2. **The first visible answer surface — the next BIG build + the loop-engineering experiment.** Two-pane laptop mockup (Briggsy's eye first — don't commit blind) → the U6 confidence-band render → U7 confidence statement + copyGuard → D2 state-adaptive surface. **Fly this via `loop-engineer` (live-steer Agent Teams), NOT a fire-and-forget swarm** — the oracle here is Briggsy's eye (taste/tone/colorblind-safe viz), not a test, so he steers mid-build rather than reviewing a finished worktree (the swarm/loop-engineer split = test-oracle vs eye-oracle). Load the four-skill UI loadout first (back-nine-design > frontend-design > emil-design-eng > web-design-guidelines). Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

3. **U8 — save/load (brought forward).** `ScenarioV3` is defined; remaining = the codec v3 arm (a *separate* `checkPersonV3`, never mutate the frozen `checkPerson`), `AnyScenario` membership, the user-facing **first-Save ceremony** (passphrase-strength gate `zxcvbn-ts` ≥3 ∧ len ≥12 + recovery-phrase display + mandatory export), and load-on-return. NOTE: the encrypted-vault IndexedDB writer (`writeVault`/`rewriteModel` in `store/db.ts`) already exists (the Act-1 encrypted store) and is wired into `backup.ts`/`session.ts` — U8 is the *flow* + the v3 writer, NOT a new persistence layer. Fold in the portfolio-holdings model field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) on the same persisted shape — no v3→v4 migration.

4. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** `swarm` (fire-and-forget, test-oracle units) is proven on R40 U3/U4 — the loop is the unit of trust, hand every implementer a coverage checklist, re-gate + eyeball yourself (it doesn't close its own loop). `loop-engineer` (live-steer, eye-oracle units) is the next experiment — the answer surfaces above.

## Verify-owed
- The OOP-medical hint figure (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) is grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin it cell-by-cell. Conservative-by-design while it stays directional.
