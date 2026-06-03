# The Back Nine — TODO

> Actionable items only. Decisions live in `docs/brainstorms/the-back-nine-requirements.md`; cross-session learnings live in memory + `/distill` insights. No session history here.

## Current State
Requirements locked + reviewed (7-persona). No code yet. Ready to plan.

## Next Steps (priority order)
1. Run `/ce:plan` against `docs/brainstorms/the-back-nine-requirements.md` → structured implementation plan. Likely units: WASM Monte Carlo engine, encrypted local store (WebCrypto + IndexedDB), guided on-ramp, confidence-statement component (incl. "probability of adjustment" off-track grammar), Roth-lever flow.

## Open Items
- [ ] **Regulatory surfacing gut-check** — does the software *selectively surfacing* a personalized Roth opportunity (R10a) stay on the tool side of the advice line, or does the selection mechanic itself brush it? We verified the *disclaimer*, not the *surfacing*. Resolve before that lever ships.

## Landmines
- **`deep-research` workflow broken** — 3× StructuredOutput crashes; its "refuted" verdicts are verifier false-negatives. Self-serve via `gemini-grounding` + `curl`; always read the `failures` block, not just the summary.
- **Web served-JS caveat** — "we can't see your money" covers data at rest / in transit, NOT a malicious-code-update threat model. Disclose, don't overclaim (R15: provable before spoken).
- **No competitive lens** — product is the bar; don't reintroduce moat/defensibility framing.
