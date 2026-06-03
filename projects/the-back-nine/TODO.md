# The Back Nine — TODO

> Actionable items only. Decisions live in `docs/brainstorms/the-back-nine-requirements.md`; cross-session learnings live in memory + `/distill` insights. No session history here.

## Current State
Requirements locked + reviewed (7-persona). **Foundation research verified** 2026-06-03 (4-strand research + adversarial-verification workflow → `docs/research/foundation-findings-2026-06-03.md`; corrections folded into the requirements doc). No code yet. Ready to plan.

## Next Steps (priority order)
1. Run `/ce:plan` against `docs/brainstorms/the-back-nine-requirements.md` → structured implementation plan. Likely units: WASM Monte Carlo engine (single Worker; log-drift μ=arith−σ²/2; Trinity/Bengen validation cases), encrypted local store (WebCrypto AES-GCM; KDF + key-persistence decisions per findings §Strand 2), guided on-ramp, confidence-statement component (incl. "probability of adjustment" off-track grammar), Roth-lever flow (calculator, never a verdict — see regulatory landmine).

## Open Items
- _(none — surfacing-mechanic posture resolved 2026-06-03: disclaimer + categorical trigger + user-initiated math; grounded education-vs-advice pass deferred until the posture is load-bearing in a real Terms doc / marketing claim.)_

## Landmines
- **Roth lever = calculator, NEVER a verdict.** Under Reg BI, a *recommendation* of an account type (Traditional-vs-Roth, rollovers) is treated as an "investment strategy involving securities"; a user-driven calculator isn't. The no-verdict + categorical-trigger + no-securities/no-asset-location guardrail is load-bearing, not stylistic. (findings §Strand 3)
- **Non-extractable key ≠ at-rest security boundary.** `extractable:false` stops *script* exfiltration, not disk access. The real protection is the encrypted blob + KDF. Don't let copy imply otherwise (gates R15). (findings §Strand 2)
- **Jazz is alpha** — don't build the v1 persistence/crypto core on it (2.0 alpha, new API). Single-device MVP likely needs no sync engine at all.
- **Engine validation numbers live in findings §Strand 4 ONLY** (avoid stat-drift). Watch the corrected ones: Trinity 100%-bond/4%/30yr = **~70%** (NOT 20–35%); Bengen 4.15% SAFEMAX = **1966** cohort (NOT 1968); MC runs *more pessimistic* than historical — assert a band, never equality.
- **`deep-research` workflow broken** — 3× StructuredOutput crashes; "refuted" verdicts are verifier false-negatives. Self-serve via `gemini-grounding` + `curl` (the 2026-06-03 foundation workflow did exactly this — text returns, no StructuredOutput).
- **Web served-JS caveat** — "we can't see your money" covers data at rest / in transit, NOT a malicious-code-update threat model. Disclose, don't overclaim (R15: provable before spoken).
- **No competitive lens** — product is the bar; don't reintroduce moat/defensibility framing.
