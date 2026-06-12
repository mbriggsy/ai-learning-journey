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
- [019 — a crashed verifier is not a refutation: a verify-stage aggregation that treats missing votes as "discard" silently loses real findings (score ABSTAIN, read the failures block, resume the run)](019-a-crashed-verifier-is-not-a-refutation-missing-votes-must-abstain-not-discard.md)
- [020 — a fail-loud guard gated on its FIRST consumer silently fails to protect the SECOND consumer of the same fragile invariant (gate on the property, not the consumer)](020-a-guard-gated-on-its-first-consumer-does-not-protect-the-second-consumer-of-the-same-invariant.md)
- [021 — anchors + monotonicity left 45/50 transcribed cells silently mutable: structural invariants admit SMOOTH corruptions, so pin transcribed vectors in FULL (the 015 mutation-survival lesson, specialized to data)](021-structural-invariants-admit-smooth-corruptions-pin-transcribed-vectors-in-full.md)
- [022 — provenance is per-FIGURE, not per-document-family: frozen-base formula figures (§109's 150%×the-2024-catch-up), first-bump staleness (the §108 IRA catch-up), and a figure cited to a document it isn't in (the §223(b)(3)(B) HSA catch-up)](022-provenance-is-per-figure-frozen-base-formulas-and-first-bump-staleness.md)
- [023 — an external-derivation panel validates ARITHMETIC, not RULE SELECTION: the conventions you hand it are an unchecked trust root (the C2 ledger-RMD fixture's near-miss on the JLLS gap-11 switch)](023-an-external-derivation-panel-validates-arithmetic-not-rule-selection.md)
- [024 — an unattributable aggregate can neither be vetted nor safely rejected: carry per-entity attribution through the wire (the C2 wave-2 dead-slot trilemma; a verify-panel dissent is design input)](024-an-unattributable-aggregate-can-neither-be-vetted-nor-safely-rejected.md)
- [025 — a plan's enumerated test scenario is a HYPOTHESIS: derive that the mechanism exists in THIS engine before building the fixture, and record the reactivation trigger when retiring a premise-false one (the C3 cliff-straddle + averaged-handoff pair; insight 023 lifted to plan altitude)](025-a-plans-test-scenario-is-a-hypothesis-derive-the-mechanism-before-the-fixture.md)
- [026 — your FIX for a confirmed finding is also a hypothesis: feed the verifiers the disposition and let them attack IT (the C3 verify stage overturned the P1 instrument + the decideTrack guard; "adjusted" is a first-class verdict)](026-your-fix-for-a-confirmed-finding-is-also-a-hypothesis-verify-dispositions-not-just-findings.md)
- [027 — a guard family's trigger predicate must match the HAZARD CREATOR's domain, not a correlated proxy (the §7-clamp/§3b-guard split: income-blind creator, earned>0 guards — the zero-income-worker P1; insight 020's class, third recurrence)](027-a-guard-familys-trigger-predicate-must-match-the-hazard-creators-domain-not-a-proxy.md)
- [028 — finite inputs do not bound the computation: float overflow voids a convergence proof — and the green test pinning it (the M6 saturation claim, refuted; the ENGINE_MAX_* domain bounds + the per-path finiteness seam; insight 026 on a THEORY)](028-finite-inputs-do-not-bound-the-computation-float-overflow-voids-convergence-proofs.md)
- [029 — an equality assertion on a structurally-zero surface discriminates nothing: a planted zeroing of the hsa collection survived 567 green tests (presence companions for field PLUMBING; insights 015/021's class at the copying layer)](029-an-equality-assertion-on-a-structurally-zero-surface-discriminates-nothing.md)
- [030 — an async cancel/lock authority that acts only at its END is fiction: synchronous token bump at entry + generation checks after every await + local ref captures (the U4 session race cluster; lens diversity is ANGLE diversity)](030-an-async-cancel-authority-must-be-synchronous-and-generation-checked-across-every-await.md)
- [031 — a committed credential must outlive the cancellation of the op that minted it: firstSave returns the phrase whenever the vault write committed (the point-of-no-return owns the reporting obligations)](031-a-committed-credential-must-outlive-the-cancellation-of-the-op-that-minted-it.md)
- [032 — a committed source artifact without a test-time bind is not a pin: integral guards (window counts, S(90) anchors) + spot cells left 106/110 mortality and ~332/340 Damodaran values silently mutable, incl. the optimistic-direction mutant (the pin-pass review fold; insight 021 sharpened — the bind is a TEST that re-derives every cell)](032-a-committed-source-artifact-without-a-test-time-bind-is-not-a-pin.md)
- [033 — verify a gate's TARGET when WRITING the gate, not when clearing it: table4c7.html never existed (TR table numbering ≠ filename, the phantom propagated to 5 docs), bit-exact Bengen is unattainable at any price (his own tail was estimated; SBBI edition-revises), and the "bot-blocks curl" blocker dissolved on one real recon attempt](033-verify-a-gates-target-when-writing-the-gate-not-when-clearing-it.md)
- [034 — independent verification agents apply CONFLICTING conventions and the harness's own manifest is an error source: the fold owns cross-prescription consistency — resolve against the file's documented rules, never the more confident agent (the tickerBlend real-asset split; the constants sweep's only STOP indicted the workflow's inventory, not the data)](034-cross-agent-convention-conflicts-must-be-resolved-against-the-files-own-rules-before-folding.md)
- [035 — a live-updating region ABOVE interactive content shifts tap targets mid-gesture: reserve its box (the answer strip resized on every commit and a segment tap landed one control off — caught by the retargeted CSP e2e walk; "calm" is a hit-target property, not just tone)](035-a-live-updating-region-above-interactive-content-shifts-tap-targets-mid-gesture.md)
- [036 — a gate reading a render-closure snapshot validates ONE COMMIT STALE when blur and action share a task: snapshots are for rendering, gates read the store (the period force-confirm let an ambiguous spend straight past Continue; advance() now reads getSnapshot())](036-a-gate-reading-a-render-closure-validates-one-commit-stale-when-blur-and-action-share-a-task.md)
