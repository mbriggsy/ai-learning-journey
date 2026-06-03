# The Back Nine — Session Handover

> Orientation doc — read this first when resuming in this directory.
> **Source of truth for current decisions = `docs/brainstorms/the-back-nine-requirements.md`.**
> This file is the durable charter (the *why*); the requirements doc holds the locked *what/how*; `TODO.md` is the actionable queue. Don't re-decide locked items here.

## What this is

**The Back Nine** — a retirement / wealth / tax-planning product. Golf metaphor for the second half of life: every shot counts more, you're playing for the finish.

**NOT an engineering proving ground.** A potential **commercial product**. The bar is not "does it run" — it's *"would a stranger pay for this and trust it with their net worth."* Treat every decision at that altitude.

## The four founding answers (from Briggsy)

1. **Audience:** Briggsy first, built as a potential commercial product from day one.
2. **Scope:** retirement glidepath projections + live wealth picture + tax-move planning, woven together, room to grow. (MVP deliberately narrows to the *confidence spine + one Roth lever* — see requirements doc.)
3. **Data:** manual entry first; Plaid-style linking later only if **"crazily hardened."**
4. **Form factor:** consumability is the HUGE factor. (Decided: **web, local-first PWA** — see requirements doc.)

## The thesis (the wedge)

**Consumability is the wedge.** Every incumbent has the features and the math; they all feel *hostile*. The product that makes this domain feel **calm and legible** wins. UX is not polish — it *is* the product. We assume we're the only game in town; the only competition is the quality bar itself.

## Status

Landscape research + brainstorm + 7-persona document-review **complete**. All architectural forks locked (form factor, engine, household, regulatory posture, data location). **Foundation research verified** 2026-06-03 — a hand-rolled 4-strand research + adversarial-verification workflow (UX pain, local-first architecture, regulatory line, engine reference cases) confirmed the thesis, sharpened the regulatory posture, corrected the Jazz/KDF/engine-number assumptions, and produced the engine validation contract. Evidence: `docs/research/foundation-findings-2026-06-03.md`; corrections folded into the requirements doc. **Next: `/ce:plan`.** Current decisions, requirements, success criteria, and the technical foundation all live in `docs/brainstorms/the-back-nine-requirements.md`.

## Standing landmines

- **No bullshitting the market.** Competitive, regulatory, and library claims get verified against sources before they go load-bearing. "I don't know yet" beats a confident-wrong claim that calcifies.
- **Commercial bar.** There's a real user who isn't Briggsy. User-seat empathy is mandatory.
- **Manual-first is intentional.** Don't reach for Plaid until the experience is proven and the hardening story is real.
- **The `deep-research` workflow is currently broken** (StructuredOutput crashes; its "refuted" verdicts are verifier false-negatives, not real refutations). Self-serve research via `gemini-grounding` + `curl`.
