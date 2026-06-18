---
title: The Back Nine — Docs (start here)
doc-type: readme
status: living
created: 2026-06-17
updated: 2026-06-18
---

# The Back Nine — Docs

The Back Nine is a **personal** retirement / tax-strategy co-pilot for one married couple and a few friends. Never sold. It answers one question — *"Can we retire, and how do we do it best?"* — with a calm, plain-language confidence statement, then proposes a confidence-graded strategy (withdrawal sequencing + Roth conversion) to fund a real budget toward a goal you pick. For a household still working, the first answer adapts: it leads with **the fuck-off date** — the two confidence-graded dates when work becomes optional.

**The cardinal rule: calm-but-wrong is the sin.** Friends bet real retirement money on this answer with *less* protection than a commercial tool — so the honesty and engine-validation bar *rises*, it never softens. "It's just for friends" never excuses a confidently-wrong recommendation.

## You are here

- **The engine is done and pinned.** The Monte Carlo core, joint-and-survivor longevity, the tax + accounts overlay, the income-dependent healthcare overlay, the encrypted-at-rest store, the accumulation fold (the fuck-off-date search), and the Social Security spousal/survivor sub-engine are all shipped, reviewed, and validated against golden cases.
- **The first visible answer is being built.** Account-level intake ships; the colorblind-safe viz foundation ships. Still ahead: the confidence-band render, the confidence statement, the state-adaptive surface. Other income (pension/rental/annuity/alimony) is the immediate next build.
- **The recommendation engine is still entirely ahead.** The solver, its optimality oracle, and the recommendation surface — the actual differentiator — are not started yet.

The maintained per-unit status table lives in [roadmap.md](roadmap.md).

## Where to read next

New here? Start with **[product.md](product.md)** — the why and the what — then jump to anything specific below.

| To understand… | Read |
|---|---|
| The why, the what, and the full requirements ledger | [product.md](product.md) |
| Where the build stands — the four acts and the per-unit status table | [roadmap.md](roadmap.md) |
| How the engine works, and the invariants nobody may break | [architecture.md](architecture.md) |
| The per-act build plans | [plans/1-engine.md](plans/1-engine.md) · [2-first-answer.md](plans/2-first-answer.md) · [3-controls.md](plans/3-controls.md) · [4-recommendation.md](plans/4-recommendation.md) |
| A specific capability's plan | [plans/features/social-security.md](plans/features/social-security.md) · [other-income.md](plans/features/other-income.md) · [portfolio-holdings.md](plans/features/portfolio-holdings.md) |
| The reasoning behind the hard engineering calls | [decisions/](decisions/) |
| The verified reference numbers (Trinity/Bengen, tax, ACA/IRMAA) | [research/engine-validation-and-tax.md](research/engine-validation-and-tax.md) · [pre65-healthcare.md](research/pre65-healthcare.md) |
| Any unfamiliar term (CRN, reduce-to-spine, MAGI, the fuck-off date…) | [glossary.md](glossary.md) |
| Hard-won gotchas + lessons (wired to `/brief` and `/distill`) | [insights/](insights/) |
