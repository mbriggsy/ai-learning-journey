---
title: "The Back Nine — Direction Reset (north-star)"
type: feat
date: 2026-06-04
status: active
supersedes: "the commercial framing of docs/brainstorms/the-back-nine-requirements.md + the single-Roth-lever scope of docs/plans/mvp-confidence-spine/"
ratified: 2026-06-04   # Briggsy: "cleared for takeoff"
sources:
  - docs/research/foundation-findings-2026-06-03.md   # §Strand 1-5 (regulatory strand now archive-as-rationale)
  - "impact assessment 2026-06-04 (7-lens + 2-critic workflow wf_27462f20)"
  - "pre-65 healthcare grounding 2026-06-04 (workflow wf_0e97dfc3 — fold into §Strand 5)"
---

# Direction Reset — what The Back Nine is now

> This is the new north-star. It captures decisions made in conversation 2026-06-04 that **re-open the locked requirements doc at thesis level** and reshape the MVP. It is the source the requirements rewrite + the phase re-plan cascade from. Decisions, not code.

## What changed (one paragraph)

The Back Nine moves from a **commercial product** (held-out-to-the-public, regulated, a single user-driven Roth-conversion calculator) to a **personal tool** (Briggsy's laptop + a few friends, never sold). That single change unlocks the product it always wanted to be: a **recommend-first co-pilot with a solver** that proposes a confidence-graded *strategy* over **two coupled tax controls** (withdrawal sequencing + Roth conversion), funding a **user-built budget** toward a **user-chosen goal**, with **income-aware healthcare** modeled across the Medicare line. The regulatory guardrails relax to wording; **the load transfers to honesty + engine validation, which harden.**

## The thesis (the product in three sentences)

1. Tell me where I stand — *"your essentials are safe in 10 of 10 futures; your full lifestyle holds in 7"* (the spine, unchanged — still the first magic moment).
2. Then, *"and here's what we'd do about it"* — a recommended, **confidence-graded** strategy (sequence withdrawals + convert) that funds your budget the tax-smartest way, with the full reasoning **one tap down**.
3. You stay the pilot: safety is the default floor, but **you pick the goal** above it (leave more · pay less tax · live bigger now), and every recommendation wears its own hedge on the headline.

## Locked decisions (this session)

| # | Decision | Resolution |
|---|----------|-----------|
| **D1** | What does "best" mean? | **Lexicographic.** Tier 1 = never drop below the survival floor (essentials always covered — the spine's voice, honors R2/Kitces). Tier 2 = a **user-chosen** goal among the surplus: *leave more · pay less tax · live bigger now.* The objective metric is the **same quantity as the headline** so a recommendation can never contradict the magic moment. |
| **D2** | Recommend-first or -second? | **Recommend-*second*.** Spine answer stays the first magic moment; the recommendation is the immediate next beat, math one tap down (depth-on-demand). Protects the calm on-ramp + keeps Phase 2 reusable. *(A deliberate re-reading of "recommend-first" — ratified here.)* |
| **D3** | Phase shape? | **Grow to 4 phases:** Foundation → First Answer → **Controls** (manual sequencing + Roth, a shippable cold-read milestone) → **Solver & Recommendation.** |
| **D4** | Solver search space (MVP)? | **Named drawdown policies × a conversion grid** (proportional / taxable-first / pre-tax-first / bracket-fill), not full continuous optimization. Bounds compute (TS stays viable, WASM stays a fast-follow), keeps the comparative story legible, shrinks optimizer's-curse exposure. |
| **D5** | Confidence + curse defense? | **Held-out reporting seed** (select on seed-set A, grade on B) **+ an optimality oracle built *before* the solver.** Non-negotiable — this is the raised honesty bar made concrete. |
| **D6** | Tax scope? | **ACA-PTC (pre-65) and IRMAA (post-65) come IN** — they are income-dependent, so a sequencing/conversion change moves them, and an omitted cliff *inverts which strategy wins* (not just its size). NIIT / state stay **OUT-but-disclosed**. New falsifiable line: **IN iff sequencing or conversion can move it.** |
| **—** | Regulatory frame | **Relaxes to wording.** The reg guardrails (no-verdict, no-optimizer, categorical-only triggers, attorney-gate, "we can't see your money" *claim*) drop or relax. **The load transfers to honesty + validation, which get stricter.** "It's just for friends" must **never** soften validation — friends risk identical real money with less protection and trust you more. |

## The lever set

**MVP — solver-optimized** (there's an objectively right answer once the goal is fixed):
- **Withdrawal sequencing** — which bucket funds each year's net withdrawal.
- **Roth conversion** — amount + years.

**MVP — user-set** (no "right" answer; a tool must never *recommend* a lifestyle — it shows honest consequences):
- **The budget** — itemized, with **time-boxed line items** (travel runs yrs 1–20 then stops; the healthcare gap runs retirement→65). Essentials vs discretionary.
- **The goal** — the Tier-2 pick (leave more / pay less tax / live bigger now), including a **go-go-years spending shape**.

**Chapter two (named, deferred):** SS-claiming-age (heavy, solver-optimizable, big for the survivor benefit); a full **continuous** optimizer; a **"die with zero"** spend-down solver (needs a disclosed life-value model); **asset-location** (modelable later as a *deterministic per-bucket tilt on the one shared draw* — capability without breaking CRN).

## The budget builder

The user expresses spending as a categorized, time-boxed plan; the **solver funds it tax-smart** around the user's chosen goal. Key structural insight: **essentials vs discretionary *is* the safety floor vs the surplus.**
- **Tier 1 floor** = essentials always covered across futures (the honest "will I be OK").
- **Tier 2 surplus** = discretionary (travel, fun) — what "live bigger now" spends and the solver optimizes the funding of.
- The headline gets more humane: *"essentials safe 10/10; full lifestyle 7/10 — in the other 3 you'd trim travel, not go hungry; here's the plan that pushes 7→9."*
- **On-ramp protection:** the fast first answer still runs on a single total spend number; the itemized budget is the **deepening** (sharpen loop), not the on-ramp.

## Healthcare — the income-dependent cost (grounding: workflow wf_0e97dfc3, 2026-06-04; fold into §Strand 5)

- **Pre-65 gap (retirement→65):** a time-boxed expense like travel — *but income-dependent.* ACA marketplace cost falls as a Premium Tax Credit that scales with **ACA-MAGI**, so withdrawals/conversions raise the cost. **2026 base case = the 400% FPL cliff is BACK** (enhanced subsidies expired 12/31/2025; House-passed/Senate-stalled extension **not enacted** as of 2026-06-04). Model **cliff-on** as base; expose **"enhanced subsidies" as a scenario toggle**; **re-verify the legislative status every build** (possible retroactive restoration).
- **65+:** **IRMAA** Medicare-premium surcharge — **2-year MAGI lookback** (2026 set by 2024 MAGI), hard per-person step-cliffs, **a different MAGI definition than ACA** (IRMAA-MAGI omits the SS add-back). A voluntary conversion is *not* an SSA-44 appealable event.
- **HSA = a 4th account bucket** (triple-advantaged, earmarked medical). Covers out-of-pocket + (owner 65+) Medicare premiums tax-free; **NOT ACA marketplace premiums** (only via COBRA / unemployment). Medicare enrollment **zeroes** HSA contributions (6-month Part A retroactive trap).
- **Engine:** **two separate MAGI calculators** (ACA ≠ IRMAA); the pre-65 ACA cost is a **per-year fixed-point** (cost depends on MAGI which depends on the strategy — same shape as the SS-taxation fixed-point already specced, zero draws, CRN-safe); IRMAA is a **2-year-lagged** surcharge. This is the concrete reason healthcare **couples into the solver objective**, not just the budget.
- Numbers → **§Strand 5 expansion, directional until pinned**: IRS Pub 969 (HSA), §36B / Pub 974 (ACA-PTC), CMS (IRMAA brackets + 2026 Part B), Rev. Proc. (HSA limits).

## What is SAFE — reuse, build as planned

Phase 1 engine core (determinism, joint-and-survivor longevity, Trinity/Bengen validation) · Phase 2 confidence statement (still the first magic moment) · the **single-shared-market-draw CRN rule** (its regulatory twin drops; the CRN reason **survives and is *more* load-bearing** — the solver ranks N candidates on identical draws) · the at-rest crypto store + two-person survivor recovery/export · the reduce-to-spine golden invariant · copyGuard's certainty-hygiene + catastrophe-lexicon + catalog architecture · the survivor tax-cliff as the **emotional story** · "the product is the bar."

## What RE-OPENS

- **Requirements doc — thesis-level** (not back-annotation): rewrite R9–R13 (kill "exactly one lever" / "calculator-never-optimizer" / "no individualized directive"); relax R13/R15–R18 to personal hygiene (re-justify anything kept on engineering grounds, not the dead marketing claim); add net-new requirements (sequencing-as-a-control, the objective function, recommend-first posture, the solver, confidence-grading, comparative transparency, the headline-hedge invariant, the budget builder, income-aware healthcare).
- **Foundation findings:** **§Strand 3 (regulatory) → archive-as-rationale** (the WHY, in case of future re-commercialization); invalidate the attorney-gate everywhere. **§Strand 4 grows** (solver validation: an optimality/ranking oracle, ranking-stability-under-CRN, grade-calibration). **§Strand 5 grows** (sequencing tax + the healthcare grounding note).
- **The deepened Phase 3** splits: → **P3 Controls** (sharpen + manual sequencing + Roth control + re-entry) and **P4 Solver & Recommendation** (objective, search, grading, comparative transparency, recommendation surface).

## Carried landmines (from the adversarial assessment — these must survive into the re-plan)

- **Objective ≡ headline metric**, or the product recommends a move that worsens its own hero number. *(D1 lexicographic resolves it.)* Watch the R2/Kitces "never maximize" tension — the floor-first framing is the reconciliation.
- **Optimizer's curse rendered as confidence** — argmax over many candidates on one seed overfits that seed's noise. *Held-out seed + optimality oracle before the solver.* Compounded by directional-until-pinned fixtures deciding the near-ties.
- **A disclosed omission inverts a ranking** (not just blunts a delta) → why ACA/IRMAA come IN (D6).
- **A stale saved recommendation is a real, executed action** — Unit 9's "re-present under saved vintage" rule may need to **invert to re-solve under current fixtures** for a recommendation; staleness must read *"the action we recommended may no longer be advised,"* not *"your number drifted."*
- **"Require the hedge on the headline" is a new copyGuard lint shape** (a positive/require assertion, not the current ban-list) — build it mechanically or hedge-burial drifts in silently.
- **The 10/10 clamp eats the solver's signal** for over-funded households — when survival is a given, honestly **switch the headline to the tax/wealth/lifestyle metric** ("you're safe either way; this keeps more from the IRS"). The lexicographic Tier-2 *is* this pivot.
- **Spending/lifestyle is never solver-recommended** — only user-set with honest consequences. The solver optimizes *funding*, not how you live.

## Next steps

1. **Briggsy ratifies this north-star** (set `ratified:`).
2. **Requirements re-open** (thesis-level rewrite, tracked).
3. **Re-plan into 4 phases**; cascade the §Strand 4/5 growth; fold the full healthcare grounding note into §Strand 5.
4. **Update memory** (`project-the-back-nine` line still says "commercial product") **and TODO**.
