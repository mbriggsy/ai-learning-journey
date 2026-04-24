# Deferred items — playtest-harness phase

Pre-existing issues discovered during unit execution that are out of scope for
the current unit. Not fixed in the unit they were found; tracked here for
later triage.

## Phase 3 Unit 1

- **`pnpm lint` pre-existing failure** (observed 2026-04-24 during Unit 1):
  - `src/client/player/Hand.module.css:54` — `position: fixed` reference in a
    comment flagged by `scripts/lint-css.sh`.
  - `src/client/player/StealReport.module.css:15` — `position: fixed` on an
    actual rule.
  - Verified pre-existing: `git stash` + `pnpm lint` reproduces on `main@8c465ebf`.
  - Not related to playtest-harness work. Does NOT block `eslint` (that passes
    cleanly on Unit 1's new files). The lint-css script is an additive shell
    rule layered on top of ESLint.
