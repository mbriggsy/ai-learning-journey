# The Back Nine — TODO

> Actionable items only. Decisions live in `docs/brainstorms/the-back-nine-requirements.md`; cross-session learnings live in memory + `/distill` insights. No session history here.

## Current State
Requirements locked + 7-persona reviewed. **Foundation research verified** 2026-06-03 (`docs/research/foundation-findings-2026-06-03.md`). **MVP plan written** 2026-06-03 → `docs/plans/mvp-confidence-spine/` (roadmap + 3 phase docs, burned-style frontmatter w/ `deepened`/`doc-reviewed`/`coded`/`code-reviewed` lifecycle stamps, all empty). 9 units across 3 phases. **NOT deepened yet** (depth tier only — no `deepened:` stamp). New decisions locked: **engine = TypeScript** (WASM = fast-follow); **unlock = passphrase each session, memory-only key, no username**; **KDF = PBKDF2-600k**; magic-moment-first onboarding; shared household credential; married-couple precondition. No code yet.

## Next Steps (priority order)
1. **Deepen the 3 phase docs** (`docs/plans/mvp-confidence-spine/phase-{1,2,3}-*.md`) — Briggsy's "write-all-phases-then-deepen" rhythm. Read the ce:plan `references/deepening-workflow.md` (or `/deepen-plan`). Use Sequential Thinking for synthesis ([[deepen-plan-lessons]]); **watch the deepening-drift anti-pattern** — grep each body for OLD patterns claimed "Resolved" in headers ([[feedback-deepening-drift-anti-pattern]]); verify critical fixes against the findings doc. Stamp `deepened:` on each phase + the roadmap roll-up when done.
2. **`document-review`** the roadmap + 3 phase docs (multi-persona: coherence, feasibility, scope, security, design). Stamp `doc-reviewed:`.
3. **Then `/ce:work`** Phase 1 — the `enforce-brief-before-work.sh` hook will block until `/brief` runs, so run `/brief` first (verified 2026-06-03: hook gates `ce:work` only, not `ce:plan`).

## Open Items
- [ ] **Back-annotate the requirements doc?** The plan *extended* the requirements (survivor-phase modeling — survivor-SS step-down, ~75% spending ratio, two-regime horizon, death-order; the 6-state outcome matrix; married precondition). Decide whether to fold these back into `the-back-nine-requirements.md` so spec and plan don't drift. (Briggsy to decide.)
- [ ] **Brief-before-planning hook?** Optionally add `ce:plan`/`ce:brainstorm` to `enforce-brief-before-work.sh`'s block-list (currently gates `ce:work` only). Likely redundant since `ce:plan` runs learnings-research natively. (Briggsy to decide.)
- [ ] Residual gates (don't block deepening): confirm SSA cohort life-table data against the real table files before Unit 1 relies on it; attorney review of exact Roth-lever copy before any Terms/marketing.

## Landmines
- **Roth lever = calculator, NEVER a verdict.** Under Reg BI, a *recommendation* of an account type (Traditional-vs-Roth, rollovers) is treated as an "investment strategy involving securities"; a user-driven calculator isn't. The no-verdict + categorical-trigger + no-securities/no-asset-location guardrail is load-bearing, not stylistic. (findings §Strand 3)
- **Non-extractable key ≠ at-rest security boundary.** `extractable:false` stops *script* exfiltration, not disk access. The real protection is the encrypted blob + KDF. Don't let copy imply otherwise (gates R15). (findings §Strand 2)
- **Jazz is alpha** — don't build the v1 persistence/crypto core on it (2.0 alpha, new API). Single-device MVP likely needs no sync engine at all.
- **Engine validation numbers live in findings §Strand 4 ONLY** (avoid stat-drift). Watch the corrected ones: Trinity 100%-bond/4%/30yr = **~70%** (NOT 20–35%); Bengen 4.15% SAFEMAX = **1966** cohort (NOT 1968); MC runs *more pessimistic* than historical — assert a band, never equality.
- **`deep-research` workflow broken** — 3× StructuredOutput crashes; "refuted" verdicts are verifier false-negatives. Self-serve via `gemini-grounding` + `curl` (the 2026-06-03 foundation workflow did exactly this — text returns, no StructuredOutput).
- **Web served-JS caveat** — "we can't see your money" covers data at rest / in transit, NOT a malicious-code-update threat model. Disclose, don't overclaim (R15: provable before spoken).
- **No competitive lens** — product is the bar; don't reintroduce moat/defensibility framing.
