# Insights — The Back Nine

Hard-won, non-obvious engineering lessons for this project. One file per insight,
numbered `NNN-kebab-slug.md`. Added via `/distill` after debugging something whose
root cause wasn't obvious; surfaced via `/brief` before related work.

**Citation format:** reference an insight by its **full relative path + title slug**
(e.g. `docs/insights/001-some-lesson.md`), not a bare number — and cross-repo
citations carry the full path too (e.g. `projects/burned/docs/insights/072-...`),
never just `burned/072`.

## Transferable discipline carried in from sibling projects

No domain prior art exists, but the engineering discipline transfers. The
load-bearing ones (see `CLAUDE.md` for how each applies here):

- **One canonical constants table** — `projects/burned/docs/insights/` 057/061/063.
- **No in-range default fallbacks** — `projects/burned/docs/insights/062`.
- **Absence-tests need presence companions** — `projects/burned/docs/insights/027`.
- **Determinism gates self-test against a planted positive** — `projects/burned/docs/insights/070`.
- **Engine↔reader contract drift at a serialization boundary** — `projects/burned/docs/insights/042`.
- **Stale Vite HMR dev-500** — `projects/burned/docs/insights/072`.
- **Externally-derived golden fixtures** — `projects/archive/do-not-disturb/docs/insights/012`.
- **JSON-persisted Infinity/NaN → null sentinels** — `projects/archive/do-not-disturb/docs/insights/009`.
- **Clean-clone discipline** — `projects/ai-journey-stats/docs/insights/008`.
- **Eager module-level singletons (never minted in render)** — `projects/ai-journey-stats/docs/insights/003`.

## This project's insights

- [001 — strict CSP vs Vite/PWA inline scripts + workbox-window peer](001-strict-csp-vs-vite-pwa-inline-scripts.md)
- [002 — Trusted Types breaks `new Worker(new URL(...))`](002-trusted-types-breaks-new-worker.md)
- [003 — ESLint engine-purity bypasses (global objects, dynamic import, eval, .mts)](003-eslint-engine-purity-bypasses.md)
- [004 — monorepo CI: action-setup reads repo root + workflow self-trigger](004-monorepo-ci-pnpm-and-workflow-self-trigger.md)
- [005 — verify review findings before folding; reviewers should be read-only](005-verify-review-findings-and-readonly-reviewers.md)
- [006 — a convergence probe that contradicted the algebra was sampling the wrong regime](006-gross-up-convergence-probe-wrong-regime.md)
- [007 — cap-gains stacking raised the gross-up's worst-case k to ≈0.74 and made the contraction rest on regime-disjointness](007-capgains-stacking-raised-convergence-k-and-broke-automatic-contraction.md)
- [008 — a NaN survives `?? default`, so an unguarded sibling input stream becomes a calm-but-wrong crash](008-nan-survives-nullish-coalescing-in-an-unguarded-input-stream.md)
- [009 — cross-verifying a transcribed ~3,000-cell federal reference table (eCFR XML + Pub 590-B diff + symmetry + cross-table identity)](009-cross-verifying-a-transcribed-federal-reference-table.md)
- [010 — a NaN passes a tolerance/range guard (every comparison with NaN is false); knowing the `??` form (008) didn't prevent the `>` form](010-nan-passes-a-relational-guard-because-every-comparison-with-nan-is-false.md)
- [011 — externally-deriving a golden fixture through a solver whose API returns only aggregates (the zero-return read-off trick)](011-externally-deriving-a-fixture-through-an-aggregate-only-solver-api.md)
- [012 — ceil-quantizing MAGI against an integer cliff is a no-op vs a raw compare (it does NOT absorb float noise)](012-ceil-quantizing-against-an-integer-cliff-is-a-no-op-vs-a-raw-compare.md)
- [013 — a discontinuity in a sourced table silently breaks a root-finder's monotonicity premise (segment the bracket at the jump)](013-a-table-discontinuity-silently-breaks-a-root-finders-monotonicity-premise.md)
- [014 — a threshold whose location depends on an evolving state variable needs its CROSSING year tested, not just static positions (the survivor ACA cliff drop)](014-a-mid-simulation-state-change-moves-a-threshold-so-test-the-crossing-year-not-just-static-positions.md)
- [015 — a generative break-the-code adversary finds mutation-survival seams that the value lenses + adversarial-verify structurally cannot (the first /ultramode-code-review spin)](015-a-generative-adversary-finds-mutation-survival-seams-that-checks-and-verify-cannot.md)
- [016 — a security-header gate needs a header-applying harness, a no-policy control arm + mutation, and EXACT-directive assertions or it's theater (the CSP browser-enforcement build)](016-a-security-header-gate-needs-a-control-arm-mutation-and-exact-directive-match-or-its-theater.md)
- [017 — a confirming review-fold loop converges by finding-CLASS, not zero count; even confirmed prescriptions need source-verification before folding](017-a-confirming-review-loop-converges-by-finding-class-not-zero-count.md)
- [018 — an amendment's blast radius is the CONSUMERS of the superseded premise, not the producers of the new content (grep for premise phrases, not requirement numbers; verbatim transplants by line-range extraction; additive commits have a zero-removals invariant)](018-an-amendments-blast-radius-is-the-consumers-of-the-superseded-premise.md)
