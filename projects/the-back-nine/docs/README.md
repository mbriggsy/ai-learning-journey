---
title: The Back Nine — Docs (index)
doc-type: readme
status: living
created: 2026-06-17
---

# The Back Nine — Docs

This folder is the project's documentation. For the overview — what The Back Nine is, how it works, and where the build stands — start at the [repo README](../README.md). This page is the map to everything below.

| To understand… | Read |
|---|---|
| The why, the what, and the full requirements ledger | [product.md](product.md) |
| Where the build stands — the four acts and the per-unit status table | [roadmap.md](roadmap.md) |
| Everything still open — the full tiered register behind `TODO.md`'s ranked queue | [backlog.md](backlog.md) |
| How the engine works, and the invariants nobody may break | [architecture.md](architecture.md) |
| The per-act build plans | [plans/1-engine.md](plans/1-engine.md) · [2-first-answer.md](plans/2-first-answer.md) · [3-controls.md](plans/3-controls.md) · [4-recommendation.md](plans/4-recommendation.md) — and the per-unit **build specs** (the executable shape of each shipped unit, council-ratified) in [plans/features/](plans/features/README.md) |
| A specific capability's design + decisions | Social Security: [decisions/ss-computation.md](decisions/ss-computation.md) · Other income (R40): [decisions/other-income-r40.md](decisions/other-income-r40.md) · Portfolio holdings: [decisions/portfolio-holdings.md](decisions/portfolio-holdings.md) — each capability's *build* narrative lives in [plans/1-engine.md](plans/1-engine.md) / [2-first-answer.md](plans/2-first-answer.md) |
| The reasoning behind the hard engineering calls | [decisions/](decisions/) |
| The Council of Elders' verdict digest — every chaired decision, dated | [council-log.md](council-log.md) |
| The Caddie's cold-read record + the prediction tape it is scored on | [caddie/cold-read-log.md](caddie/cold-read-log.md) · [caddie/tape.md](caddie/tape.md) |
| The verified reference numbers (Trinity/Bengen, tax, ACA/IRMAA) | [research/engine-validation-and-tax.md](research/engine-validation-and-tax.md) · [pre65-healthcare.md](research/pre65-healthcare.md) |
| Any unfamiliar term (CRN, reduce-to-spine, MAGI, the fuck-off date…) | [glossary.md](glossary.md) |
| Hard-won gotchas + lessons (wired to `/brief` and `/distill`) | [insights/](insights/) |

**Frontmatter is decorative here, and five files deliberately have none.** Nearly every `.md` file under `docs/` opens with a YAML block; the exceptions are the append-only logs and registers — `backlog.md`, `council-log.md`, `caddie/cold-read-log.md`, `caddie/tape.md` — plus `insights/README.md`, all indexed above as authority. Nothing machine-reads any of it: `verify:doc-stats` has no frontmatter arm. `status:` is descriptive prose, not a closed enum — `shipped`, `living`, `decided` and `ratified` are all in use, and `decided` / `ratified` track no consistent provenance, so neither implies a council chaired it; the numbered insight entries carry frontmatter with no `status:` key at all.
