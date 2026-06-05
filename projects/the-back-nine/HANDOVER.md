# The Back Nine — Session Handover

> Orientation doc — read this first when resuming in this directory.
> **Sources of truth:** the **north-star** `docs/plans/direction-reset-2026-06-04.md` (the *why* — ratified charter) + the **requirements v2** `docs/brainstorms/the-back-nine-requirements.md` (the locked *what/how*). `TODO.md` is the actionable queue. This file only orients; don't re-decide locked items here — when this file disagrees with the north-star, the north-star wins.

## What this is

**The Back Nine** — a retirement / wealth / tax-strategy tool. Golf metaphor for the second half of life: every shot counts more, you're playing for the finish.

**A PERSONAL tool — Briggsy's laptop plus a handful of friends, never sold. NOT a commercial product.** The bar is not "would a stranger pay for this" — it's *"would I and my friends bet real retirement money on this answer."* Removing the commercial/regulatory net does **not** lower the bar; it **transfers the load onto honesty + engine validation, which get STRICTER** — because the product now *recommends*, and **calm-but-wrong is the cardinal sin.**

## The thesis (the product in three sentences)

1. **Tell me where I stand** — *"your essentials are safe in 10 of 10 futures; your full lifestyle holds in 7"* (the confidence spine — the first magic moment).
2. **Then "here's what we'd do about it"** — a recommended, **confidence-graded** strategy over **two coupled controls** (withdrawal **sequencing** + Roth **conversion**) that funds your budget the tax-smartest way, with the full reasoning **one tap down**.
3. **You stay the pilot** — safety is the default floor, but **you pick the goal** above it (leave more · pay less tax · live bigger now), and every recommendation wears its own hedge on the headline.

**Consumability is still the wedge** — incumbents have the math and lose on feeling hostile; making this domain feel calm and legible *is* the product. There is no market to win — the only bar is whether Briggsy and his friends trust the answer.

## The founding shape (from Briggsy)

1. **Audience:** Briggsy + a few financially-literate friends betting real retirement money. Never sold.
2. **Scope:** the confidence spine **plus** a recommend-second solver over two controls (sequencing + conversion), funding a **user-built budget** toward a **user-picked goal**, with **income-aware healthcare** (pre-65 ACA-PTC, post-65 IRMAA, HSA). See requirements v2.
3. **Data:** manual entry first; Plaid-style linking later only if **"crazily hardened."**
4. **Form factor:** consumability is the HUGE factor → **web, local-first PWA**, encrypted at rest, no backend.

## Status (2026-06-04)

**Thesis reset ratified** ("cleared for takeoff"). Foundation docs cascaded **and seam-swept clean** (11-doc cross-document drift sweep, 2026-06-04):
- **North-star** written + ratified (`docs/plans/direction-reset-2026-06-04.md`).
- **Requirements rewritten to v2** (personal tool, recommend-second, two controls, lexicographic objective, healthcare-IN).
- **Foundation-findings cascaded:** §Strand 3 → archive-as-rationale; §Strand 4 grown (solver validation); §Strand 5 grown (multi-control + healthcare); residual single-lever/attorney-gate body drift corrected.
- **Healthcare research persisted** (`docs/research/pre65-healthcare-aca-hsa-2026-06-04.md`).
- **Re-plan IN PROGRESS.** The live plan is **`docs/plans/back-nine-mvp/roadmap.md`** (4 phases / 18 units, written 2026-06-04). The old `docs/plans/mvp-confidence-spine/` (roadmap + phase-1/2/3) is `superseded-pending-replan` history — kept because Phase 1 engine + Phase 2 confidence statement are ≈80% reusable (mine, don't rebuild). **Do NOT `/ce:work` the superseded docs.**

**NEXT: draft the 4 phase docs** (`phase-1-foundation` → `phase-4-solver-recommendation`) in `docs/plans/back-nine-mvp/` in one workflow, then the `/ce:plan` confidence-check + document-review, then `/ce:work` foundation-first. Exact sequence + the mining map + landmines: **`TODO.md`**.

## Standing landmines

- **No bullshitting.** Competitive, regulatory, library, and tax/health claims get verified against sources before they go load-bearing. "I don't know yet" beats a confident-wrong claim that calcifies.
- **Load transfer.** Friends bet identical real money with *less* protection and trust you *more* — so the honesty + engine-validation bar **RISES**, it does not soften. *"It's just for friends" must never excuse a calm-but-wrong recommendation.*
- **Objective ≡ headline metric**, or the product recommends a move that worsens its own hero number (D1 lexicographic resolves it). The full carried-landmines set lives in the north-star's "Carried landmines" section — read it before the re-plan.
- **Manual-first is intentional.** Don't reach for Plaid until the experience is proven and the hardening story is real.
- **The `deep-research` workflow is broken** (StructuredOutput crashes; its "refuted" verdicts are verifier false-negatives). Self-serve research via `gemini-grounding` + `curl`.
