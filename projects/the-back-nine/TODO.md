# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

1. **Close out U6-render — the confidence-band render (built, NOT closed).** The render shipped as the first loop-engineer dogfood (`src/viz/ConfidenceBand.tsx` + `BandEnlargeModal` + `ConfidenceBandPanel` + `bandGeometry` + `band.css`; direction B — Lead + Drawer + click-to-enlarge; tested + green). It is **not yet**: (a) `/ultramode-code-review`'d at the unit boundary, (b) wired into a live surface (`ConfidenceBandPanel` is referenced **nowhere** outside `src/viz/`), or (c) **N=1 laptop cold-read by Briggsy** (colorblind-safe band honesty is the whole point — he is the eye-oracle). Closeout = review → integrate → his eye on the laptop. **Load the four-skill UI loadout before touching the surface** (back-nine-design > frontend-design [the *Every* variant, NEVER the official plugin] > emil-design-eng > web-design-guidelines). Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

2. **U7 — the confidence statement surface + copyGuard.** The plain-language verdict + the outcome-state system + the survivor readout; `copyGuard` is born here. Consumes the U6-render band on demand. Detail: [`docs/plans/2-first-answer.md`](docs/plans/2-first-answer.md).

3. **D2 — the state-adaptive first answer + two-pane laptop layout.** Date-first for not-yet-retired, spine-first for already-retired; one intake flow, two leads. The showcase surface (laptop is primary). Composes over U6-render + U7.

4. **U8 — save/load (the first encrypted Save).** `ScenarioV3` is defined; remaining = the codec v3 arm (a *separate* `checkPersonV3`, never mutate the frozen `checkPerson`), `AnyScenario` membership, the user-facing **first-Save ceremony** (passphrase-strength gate `zxcvbn-ts` ≥3 ∧ len ≥12 + recovery-phrase display + mandatory export), and load-on-return. NOTE: the encrypted-vault IndexedDB writer (`writeVault`/`rewriteModel` in `store/db.ts`) already exists (the Act-1 encrypted store) and is wired into `backup.ts`/`session.ts` — U8 is the *flow* + the v3 writer, NOT a new persistence layer. Fold in the portfolio-holdings model field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) on the same persisted shape — no v3→v4 migration.

5. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** use **native Agent Teams** for live-steer, **eye-oracle** units (Briggsy steers mid-build) and the **Workflow** tool for fire-and-forget, **test-oracle** fan-out. The durable laws live in memory `feedback-delegated-build-laws` (decide-before-dispatch · loop=unit-of-trust · independent-verify-by-a-different-agent · task-list-canonical · coordinator-restraint · eye-vs-test-oracle). *(The `loop-engineer` + `swarm` skill wrappers were archived 2026-06-24 — thin wrappers over the now-native capabilities; don't reach for them.)*

## Verify-owed
- The OOP-medical hint figure (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) is grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin it cell-by-cell. Conservative-by-design while it stays directional.
