---
title: The Back Nine — Roadmap (where we are, what is next)
doc-type: roadmap
status: living
created: 2026-06-17
updated: 2026-06-24
derives-from: [docs/product.md]
---

# The Back Nine — Roadmap

This is the single maintained source of build-truth for the repo. The four acts below trace the work from the deterministic engine to the recommendation surface; the **You-Are-Here table** is the honest per-unit status the rest of the docs point to. When a doc and this table disagree about what is built, this table wins.

The *why* and the *what* live in [docs/product.md](product.md). How the engine holds the cardinal rule — and the load-bearing invariants — live once in [docs/architecture.md](architecture.md). This doc is the map between them: which requirement landed in which unit, what is shipped, and what is next.

> The volatile next-action queue lives in `TODO.md`, not here. This doc moves at the speed of *units shipping*; `TODO.md` moves at the speed of *sessions*.

## The four acts

The product grows in four strictly-dependent acts. The first two answer the question; the last two are the differentiator.

**Act 1 — The Engine** (`docs/plans/1-engine.md`). The two hardest surfaces — correctness and trust — plus the overlays both controls stand on. A deterministic Monte Carlo spine validated against Trinity/Bengen, joint-and-survivor longevity, the zero-draw tax and healthcare overlays, the encrypted-at-rest store, and the accumulation date-search (the fuck-off-date search). Nothing user-facing ships in this act. **Done and pinned.**

**Act 2 — Where You Stand** (`docs/plans/2-first-answer.md`). The magic moment end-to-end: the ~5-minute account-level guided setup, the colorblind-safe visualization, the plain-language confidence statement, the state-adaptive first answer (the fuck-off date for a still-working household; the spine statement for an already-retired one), and the first encrypted Save. **In progress.**

**Act 3 — The Levers You Hold** (`docs/plans/3-controls.md`). The itemized, time-boxed budget builder plus both manual controls — withdrawal sequencing and Roth conversion — driving the Act-1 overlays, with the healthcare surfaces and the sharpen/re-entry loop. A shippable cold-read milestone in its own right, *before* the solver exists. **Not started** (`src/budget` is `.gitkeep`-only).

**Act 4 — The Recommended Route** (`docs/plans/4-recommendation.md`). The new layer and the actual differentiator: the solver validation harness, then the solver that ranks candidate strategies on identical futures, then the recommend-second surface, then stale-recommendation handling. **Validation is built and passing before the solver is allowed to recommend.** **Not started** (`src/engine/solver` and `src/engine/validation` are `.gitkeep`-only).

The act-to-act dependency is strict — each act stands on the one before — but the Act-1 overlays feed Act 3 directly, and the validated spine feeds Act 4 directly.

## The ID scheme

The docs and the code share a small set of stable IDs. They are **internal join-keys** — the thread that ties a requirement to the unit that builds it to the test that proves it to the insight that hardened it. They are **never shown to the user**, and they are **never renumbered**: the numbers are wired into the source comments, the test names, the insight files, and the git history, so a renumber would silently rot every one of those references with no gate to catch the drift. Cosmetic labels (an act's name) change freely; these keys do not.

| Key | Name | What it identifies |
|---|---|---|
| **R**`n` | Requirement | A product contract (R1–R40) — *what* must be true. The ledger is in [product.md](product.md). |
| **U**`n` | Unit | A build unit (U0–U17, globally unique across all acts) — *how* it gets built. |
| **C**`n` / **D**`n` | Unit tracks | The accumulation tracks: **C** at engine altitude (C1–C3), **D** at intake/answer altitude (D1–D2). They extend the U-numbering without renumbering it. |
| **Act**`n` | Act | One of the four build chapters (Act 1–4). The code comments say `P`n (Phase) for the same chapter — the globally-unique unit key is the unambiguous join. |
| **M**`n` | Milestone | A sub-step inside a unit (e.g. `U3·M5`); lives in code comments, not the build tables. |
| **§**`n` | Section | A numbered section inside a plan or doc (e.g. `architecture §7.2`). |

Compound refs read left-to-right: `Act 2 · U7` is Act 2, Unit 7; `U3·M6` is Unit 3, Milestone 6. Because the unit key is globally unique, a doc that says `Act 2 · U7` and code that says `P2·U7` join unambiguously on `U7`.

> **The unit-track `C` is not the code variable `C_dest`.** `C2` is an engine-altitude accumulation *unit*; `C`/`C_dest` in `taxOverlay.ts` is the per-bucket *contribution* amount. Same letter, unrelated.

## The You-Are-Here table

The single source of build-truth. Status is honest, not aspirational — the closed set: `shipped` means coded **and** reviewed; `in-progress` means partially landed; `planned` means scoped and build-ready with zero code; `scoping` means the shape is still being worked out, not yet build-ready; `not-started` means the directory is `.gitkeep`-only.

The C-units and D-units are the accumulation tracks — they extend the U-numbering without renumbering it (see [The ID scheme](#the-id-scheme)). C-units land at Act-1 engine altitude; D-units reshape Act-2 intake and the answer surface.

### Act 1 — The Engine (shipped + pinned; closed 2026-06-11)

| Unit | What it delivers | Status | Note |
|---|---|---|---|
| **U0** | Scaffold, conventions, PWA shell, CI; engine-purity lint; strict CSP | shipped | The burned toolchain; strict CSP ships via HTTP headers, not a meta tag |
| **U1** | MC engine core: determinism, CRN single shared draw, joint-survivor longevity retaining survivor identity, Trinity/Bengen externally-derived fixtures, sequencing as a pluggable policy | shipped | The validated spine; the survivor-spending ratio is grounded + dangerous-direction-documented |
| **U2** | Tax-and-accounts overlay: buckets, ordinary tax/gross-up, RMD birth-year, SS provisional-income fixed-point, MFJ→single; reduces-to-spine when off | shipped | Zero-draw deterministic transform |
| **U3** | Healthcare overlay: ACA-MAGI + IRMAA-MAGI calculators, ACA pre-65 fixed-point + cliff/enhanced toggle, IRMAA 2-yr lag, HSA 4th bucket; reduces-to-spine when off | shipped | Zero-draw; `verify:aca` gates the legislative status. HSA *spend* (the resumed U3·M5, "B1") is decumulation-side and not yet built |
| **U4** | Encrypted store + key lifecycle + recovery/export: PBKDF2-600k, AES-GCM, recovery phrase, mandatory export/restore, schemaVersion | shipped | The migration ladder covers the v2-with-accounts shape |
| **SS sub-engine** | Social Security spousal/survivor benefit math | shipped | Reviewed; the review caught + fixed a cardinal-sin optimistic survivor-floor bug |
| **C1** | Contribution-limit + ticker-blend constants (Notice 2025-67 / Rev. Proc. 2025-19 / issuer-or-EDGAR; pinned to primaries) | shipped | Feeds the accumulation projection and the household stock/bond/cash blend |
| **C2** | Accumulation projection: signed contribution inflow on the one continuous absolute-year CRN timeline; presence-keyed reduce-to-spine | shipped | Empty phase (`Y == 0` / construct-absent) reduces byte-identically to plain decumulation |
| **C3** | The date-search (`dateSearch.ts`): exhaustive, non-monotone-robust sweep over the household work-stop offset; quantized-lower-bound selection — **the fuck-off date** | shipped | Three first-class outcomes per track: confirmed date / window-edge-unconfirmed / no-date-in-window |

### Act 2 — Where You Stand (in progress)

| Unit | What it delivers | Status | Note |
|---|---|---|---|
| **U5 / D1** | Account-level guided setup (the U5 reshape): surface-early, single entry pass; the in-memory orchestrator + R19 sanity | shipped | Cleared the N=1 laptop cold-read on every screen. The broader D1 date/answer surface is still ahead |
| **U6** (foundation) | Colorblind-safe viz primitives: palette / scale / CVD probe | shipped | The CVD-safe foundation, not the band render |
| **U6** (render) | The confidence-band / projection-fan RENDER | in-progress | Built (direction B: Lead + Drawer + click-to-enlarge) + tested + green; **review DONE** (`/ultramode-code-review`, 11 lenses, findings adversarially verified, fold landed — insight 043); **app-integration + N=1 laptop cold-read pending** — built, not closed |
| **U7** | Confidence statement surface + outcome-state system + survivor readout; copyGuard born here | shipped | Path B. Built, **N=1 cold-read-cleared**, and **`/ultramode-code-review`-cleared** ([insight 044](insights/044-a-can-never-happen-comment-is-a-claim-about-the-gate-not-a-fact.md)): `ConfidenceStatement` (verdict-first, wires the band on demand), the `resolveBandData` producer + its fail-loud seam, the non-color verdict signals, `outcomeStates`, the `copy` verdict-grammar, `copyGuard`, the `?preview` harness. The survivor-conditioned engine surface — e1 (survival fraction) + e1b (income step-down) + e1c (the `confidence.ts` survivor reading) — is **built + adversarially verified** (2026-06-27; a 4-lens pass caught + fixed a P1 understatement where an fd-anchored counterfactual went negative for pre-claim deaths — fixed with a steady-state anchor, regression-guarded). The **`SurvivorReadout` UI (e2)** is **built + cold-read cleared + review-hardened** (2026-06-27 — the quieter second statement; three cold-read calls resolved, and a focused 4-lens review caught a regression-net hole over the $0-cliff suppression, now boundary-pinned). The live-app wiring **LANDED** (2026-06-28, council-chosen): the survivor readout now mounts beneath the live spine verdict — `engineWire`/`fromWire` carry `survivorConditioned` + `survivorReading` presence-keyed (the `bandFan` mirror); the $0-portfolio band-suppression + insight-035 obligations were handled in D2. |
| **U8** | First-Save flow + recovery-phrase display + mandatory export + passphrase-strength gate (`zxcvbn-ts` ≥ 3 ∧ length ≥ 12) | in-progress | The `ScenarioV3` codec arm + `AnyScenario` membership are **built + adversarially verified** (2026-06-27 — `checkV3Fields` + the separate `checkPersonV3`/account/health/income/ticker validators; a 4-lens pass caught + fixed a P1 cardinal-sin false-accept where the income entity fractions weren't [0,1]-gated, the codec being the sole such gate on restore). Remaining = the first-Save **ceremony** (eye-oracle, deferred to a cold-read) + load-on-return wiring. The portfolio-holdings multi-holding field is **ratified — build-DEFERRED** (council 2026-06-29, `docs/decisions/portfolio-holdings.md`): adding `EnteredAccount.holdings?` later is additive-within-v3 (tolerant-reader codec), NOT a v3→v4 migration — so U8 is **unblocked** |
| **D2** | The state-adaptive first answer surface: date-first for not-yet-retired, spine-first for already-retired; the two-pane laptop layout | shipped | Same calm voice, one intake flow; only the lead answer changes. **Built (2026-06-27, cold-read cleared):** the elevated `FuckOffDate` surface — the date-first magic moment (hero headline in the "fuck-off date" voice — Briggsy's call), the three first-class outcomes + free-today, the conservative odds (single-sourced with the strip via `dateOdds.ts`), the window-edge + non-monotone disclosures, and the **date↔confidence tradeoff** (R28 — an earlier lower-odds point, suppressed when a priority disclosure already shows). Reached at `?preview=date`. **Now COMPLETE (2026-06-28/29, council-decided + cold-read-cleared):** the on-demand odds drawer (D2c — a discrete integer-rung odds-ladder + a y-axis "X of 10" scale, NOT a smooth curve), the **state-adaptive routing** + the **live-wiring** (`runDateSearch` → the surface), and the **two-pane laptop layout** (cold-read cleared 2026-06-29: "calm, not an ambush — ship"). See [`docs/council-log.md`](council-log.md). |
| **R40** | Other income in retirement (pension / rental / annuity / alimony / other) — engine + intake | shipped | U1–U4 shipped (types · compile + goldens · the atomic engine integration · the **intake UX + the KTD-9 copy half**); U5 doc-reconcile done — R40 complete. Build steps: [docs/plans/2-first-answer.md](plans/2-first-answer.md) |

### Act 3 — The Levers You Hold (not started; `src/budget` is `.gitkeep`-only)

| Unit | What it delivers | Status | Note |
|---|---|---|---|
| **U9** | Budget builder: itemized, time-boxed, essentials/discretionary; the two-tier lexicographic headline reading | not-started | The two-date split rides U9's degenerate-collapse |
| **U10** | Manual withdrawal-sequencing control + Roth-conversion lever (both drive the U2 overlay); require-the-hedge lint introduced | not-started | |
| **U11** | Healthcare surfaces (ACA cliff + enhanced toggle + re-verify gate; IRMAA cliffs; HSA entry) over the U3 overlay | not-started | |
| **U12** | Sharpen loop + assumption editing + power-user escape hatch | not-started | |
| **U13** | Returning-user re-entry + per-surface staleness (tax/healthcare vintages, budget line items, the date answer's fixture clocks) | not-started | The date answer joins the per-surface staleness map |

### Act 4 — The Recommended Route (not started; `src/engine/solver` + `src/engine/validation` are `.gitkeep`-only)

| Unit | What it delivers | Status | Note |
|---|---|---|---|
| **U14** | Solver validation harness: optimality/ranking oracle, ranking-stability-under-CRN, grade calibration, held-out-seed reporting — **gates U15** | not-started | The "oracle-cleared" token is the structural gate |
| **U15** | Solver core: named-policies × conversion-grid search on identical CRN draws; lexicographic objective; byte-identical selection; the WASM measurement gate | not-started | |
| **U16** | Recommendation surface: recommend-second, confidence-grading, comparative transparency with the runner-up retained, objective ≡ headline, the 10/10→surplus pivot, hedge-on-headline lint | not-started | The actual differentiator |
| **U17** | Stale-saved-recommendation handling: a saved rec is an executed action → re-solve under current fixtures; staleness reads "the action we recommended may no longer be advised" | not-started | |

### Cross-cutting features

| Feature | What it delivers | Status | Note |
|---|---|---|---|
| **Social Security** | Spousal/survivor benefit sub-engine (shipped above) + the claim-age intake | shipped (engine) | Claim-age as a *solver-optimized control* is chapter two. Mechanics: [docs/architecture.md](architecture.md) §7; build: [docs/plans/1-engine.md](plans/1-engine.md) |
| **Other income (R40)** | Generic per-person non-earned income stream (pension/rental/annuity/alimony/other) | shipped | U1–U4 + the U5 doc-reconcile (done) — R40 complete. Build steps: [docs/plans/2-first-answer.md](plans/2-first-answer.md) |
| **Portfolio holdings** | Per-account exact stock/bond/cash %; ticker → blend; the household blend the engine consumes | scoping | Accounts take an exact stock/bond/cash % that collapses to the one household blend the engine consumes. Folds into U8. Requirement: [product.md](product.md) R37 |
| **"Just me" single-user mode** | A single-person (non-couple) household path | planned/deferred | Named, deferred |

## Requirements → unit trace

Every requirement maps to an act/unit. Numbers are immutable (R1–R40); the prose is re-framed for clarity, the mapping is not. `SC` = the success-criteria list in [docs/product.md](product.md). The C/D-unit detail lives in [docs/decisions/accumulation-fuck-off-date.md](decisions/accumulation-fuck-off-date.md).

| Req | Where |
|---|---|
| **R1** primary question is the face | Act 2 · U7 |
| **R2** plain-language confidence statement, survival-vs-lifestyle separation, no color-alone | Act 2 · U7 (single metric), Act 3 · U9 (the two-tier essentials/lifestyle reading) |
| **R3** distribution of futures | Act 1 · U1 |
| **R4** detail on demand, never unsolicited | Act 2 · U7, Act 3 · U10–U12, Act 4 · U16 |
| **R5** guided one-question intake — the guided intake is the account-level setup of R35, one flow for both user states | Act 2 · U5 → D1 (the U5 reshape) |
| **R6** power-user escape hatch | Act 3 · U12 |
| **R7** every assumption (and every recommendation input/reasoning) visible+editable | Act 3 · U12, Act 4 · U16 |
| **R8** input mirrors output; refinement *sharpens* (narrows on precision, shifts on a correction) | Act 2 · U5, Act 3 · U12 |
| **R9** propose a strategy over two coupled solver-optimized controls (sequencing + conversion) | substrate Act 1 · U1–U2; manual Act 3 · U10; solver Act 4 · U15 |
| **R10** recommend-*second* flow (spine first, then strategy, comparative reasoning on demand, user tunes/overrides) | Act 4 · U16 |
| **R11** calm, invited; never a nagging alert | Act 3 · U10, Act 4 · U16 |
| **R12** recommends, but every recommendation probabilistically framed; certainty banned; hedge required | copyGuard Act 2 · U7, extended Act 3 · U10 + Act 4 · U16 |
| **R13** optional honest-limits note (honesty grounds, not a Terms requirement) | Act 1 · U0 (static), Act 4 · U16 |
| **R14** plain not dumbed-down | Act 2 · U7, Act 4 · U16 |
| **R15** no marketing privacy claim; honesty-about-architecture survives | Act 1 · U4 |
| **R16** encrypted at rest + local access guarded (PBKDF2-600k acceptable) | Act 1 · U4 |
| **R17** survivor recovery load-bearing (phrase + mandatory export, two-person posture) | Act 1 · U4, Act 2 · U8, Act 3 · U13 |
| **R18** export/back-up for durability | Act 1 · U4, Act 2 · U8 |
| **R19** manual inputs sanity-checked, never falsely confident | engine half Act 1 · U1; intake half Act 2 · U5; control surfaces Act 3 · U10; budget Act 3 · U9 |
| **R20** itemized, time-boxed budget (essentials=floor / discretionary=surplus) | Act 3 · U9 |
| **R21** lexicographic objective (survival floor → user-chosen surplus goal; objective metric ≡ headline metric) | Act 4 · U15 (objective), Act 4 · U16 (headline pivot) |
| **R22** every recommendation grades its own confidence; hedge rides the headline | Act 4 · U14 (calibration), Act 4 · U16 (render) |
| **R23** comparative depth (why this beat the runner-up; retain the runner-up) | Act 4 · U15–U16 |
| **R24** income-dependent healthcare across the Medicare line (ACA-PTC / IRMAA / HSA) | overlay Act 1 · U3; surfaces Act 3 · U11 |
| **R25** cardinal honesty: calm-but-wrong is the sin; the bar rises for a recommender; "just for friends" never softens validation | validation Act 4 · U14; copyGuard everywhere; N=1 cold-reads |
| **SC** correctness two-tier (engine number right + recommendation right vs an optimality/ranking oracle, ranking-stability, grade calibration) | Act 1 · U1 (number), Act 4 · U14 (recommendation) |
| **R26** the fuck-off date = the existing engine swept over the household work-stop **date-offset `Y`** (never a household "age"); **non-monotone-robust** exhaustive sweep, never a bisection | C3 (`dateSearch.ts`) |
| **R27** the answer is **two dates** (floor + lifestyle) from the lexicographic objective; one-sided window-floor semantic | C3 (engine) + D2 (surface); the two-track split rides Act 3 · U9's degenerate-collapse |
| **R28** both dates **confidence-graded**, never hard lines; re-grade on strategy override | C3 + D2 |
| **R29** framing **adapts to user state** (date for not-yet-retired; spine confidence for already-retired) | D2 (state-adaptive first answer) |
| **R30** model the pre-retirement accumulation phase (contributions + growth → retirement-onset balance + basis) | C2 (accumulation projection) |
| **R31** contributions **per-account, flat-real, stop at the tested date**; employer **match** captured (pre-tax even on a Roth 401k) | C2 (engine) + D1 (intake) + C1 (limit constants) |
| **R32** v1 **projects**, does not optimize accumulation; solver stays decumulation-only | Scope Boundaries (product); C3 (date-search ≠ solver) |
| **R33** healthcare **OFF during accumulation, ON at the tested date** — per-candidate cost-stream construction (the engine has no retirement gate) | C3 (`buildCandidateParams(Y)`) + C2 |
| **R34** accumulation **inherits the engine invariants** — ONE continuous absolute-year draw timeline (CRN); one per-path future end-to-end; empty phase reduces byte-identically | C2 (the load-bearing engine contract; the CRN + reduce-to-spine invariants are canonical in [architecture.md](architecture.md)) |
| **R35** the first answer from a **~5-min account-level guided setup**, surface-early, single entry pass, both user states | D1 (intake reshape) |
| **R36** account **values user-entered; no live price lookup** | D1 + Scope Boundaries |
| **R37** per-ticker holdings **collapse to one household blend**; bundled ticker→asset-class table + manual classification; basis per account, not per lot | C1 (`tickerBlend.ts`) + D1 (entry + manual fallback) |
| **R38** HSA **contributions → accumulation**; HSA **spend → decumulation** (the resumed U3·M5) | C2 (contributions) + B1 (U3·M5 spend) |
| **R39** new PII inherits encryption + the schema ladder (additive `schemaVersion` bump) | C2/D1 schema fields; consumed by Act 1 · U4's migration ladder |
| **R40** generic per-person ongoing non-earned income stream (pension/rental/annuity/alimony/other); reduces-to-spine byte-identically; opt-in off the guided path | Act 2 (engine + intake); build steps [docs/plans/2-first-answer.md](plans/2-first-answer.md) |

## Validation gates

These are the gates a fixture or recommendation must clear before any downstream surface treats it as golden. The full engine-validation detail (golden derivations, the SSA cohort pin, the dataset pins) lives in [docs/architecture.md](architecture.md) and [docs/research/engine-validation-and-tax.md](research/engine-validation-and-tax.md); the per-command surface is below.

| Gate | What it checks | Command |
|---|---|---|
| **Typecheck** | `tsc --noEmit` — must pass before any browser touch | `pnpm typecheck` |
| **Tests** | 1364 vitest across 72 files (Vitest 4, `globals:false`); externally-derived goldens, absence-tests paired with presence companions | `pnpm test` |
| **Lint** | Layer-boundary + engine-purity rules (no clock/entropy/env inside `src/engine/**`) | `pnpm lint` |
| **ACA re-verify** | Fails the build if the enhanced-subsidy legislative entry is stale/unconfirmed — live, possibly-retroactive policy | `pnpm verify:aca` |
| **Bundle budget** | Initial-JS byte sentinel ≤ 300 KiB entry JS; **currently 206.3 KiB** | `pnpm verify:bundle` |
| **CSP enforcement** | A real Chromium blocks an injected inline script + a cross-origin fetch, while the engine worker still constructs — each with a no-CSP control arm | `pnpm verify:csp` |
| **Doc-stat drift** | README + roadmap "NNN tests across NN files" must match the live suite (vitest collection) — catches both staleness and cross-surface drift | `pnpm verify:doc-stats` |

Solver-blocking gates (Act 4, not yet live): the **optimality oracle** (hand-computable known-best cases, including the after-tax leave-more inversion and the no-change case) must exist and pass **before the solver is allowed to recommend** — enforced structurally as a harness-minted "oracle-cleared" token, taken as a required parameter, withheld until every check passes **and** every rec-relevant primary is pinned (`directionalUntilPinned === false`) **and** ε is calibrated. Skipping validation or recommending on directional fixtures is a *compile* error, not a discipline check. The date-search carries the non-monotone-robust contract and the empty-phase byte-identity gate (both shipped with C2/C3). The N=1 cold-read judges *tone*; the automated oracle judges *correctness* — never the reverse.

## What is next

**U7 is shipped** — the confidence-statement surface, the survivor-conditioned engine surface (e1/e1b/e1c), and the `SurvivorReadout` UI (e2) are all built, cold-read cleared, and review-hardened (2026-06-27). R40 (other income) is shipped end-to-end, and the **U6 confidence-band render** is built + `/ultramode-code-review`-cleared (insight 043), still owing only its live-app integration + N=1 cold-read.

The Act-2 answer surface now owes, in order: **D2** (the state-adaptive first answer + the two-pane laptop layout — the live-wiring unit that composes U6 + U7 into the running app, and carries the U7-review obligations: $0-portfolio band-suppression, the plan-horizon annotation, insight-035's reserved provisional slot, the already-failing magnitude re-cold-read), then **U8** (the first encrypted Save + recovery-phrase + export — the `ScenarioV3` codec arm is already built + adversarially verified; the first-Save ceremony remains). Act 3 (Controls) and Act 4 (Recommendation) follow in order; Act 4 is the actual differentiator and is still entirely ahead. Build steps: [docs/plans/2-first-answer.md](plans/2-first-answer.md).

The live, session-level next-action queue is in `TODO.md`.
