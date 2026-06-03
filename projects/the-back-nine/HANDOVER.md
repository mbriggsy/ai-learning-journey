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

Landscape research + brainstorm + 7-persona document-review **complete**. All architectural forks locked. **Foundation research verified** 2026-06-03 (`docs/research/foundation-findings-2026-06-03.md`). **MVP plan written** 2026-06-03 → `docs/plans/mvp-confidence-spine/` (roadmap + 3 phase docs; 9 units; burned-style frontmatter with `deepened`/`doc-reviewed`/`coded`/`code-reviewed` lifecycle stamps). Planning-time decisions locked: **engine = TypeScript** (WASM = fast-follow), **unlock = passphrase each session / memory-only key / no username** (PBKDF2-600k), magic-moment-first onboarding, shared household credential, married-couple precondition.

**Next: deepen the 3 phase docs, then `document-review`, then `/ce:work`** (see `TODO.md` for the exact sequence + landmines). The plan is NOT yet deepened — depth tier only. Decisions/requirements/foundation: `docs/brainstorms/the-back-nine-requirements.md` + `docs/research/foundation-findings-2026-06-03.md`.

## Standing landmines

- **No bullshitting the market.** Competitive, regulatory, and library claims get verified against sources before they go load-bearing. "I don't know yet" beats a confident-wrong claim that calcifies.
- **Commercial bar.** There's a real user who isn't Briggsy. User-seat empathy is mandatory.
- **Manual-first is intentional.** Don't reach for Plaid until the experience is proven and the hardening story is real.
- **The `deep-research` workflow is currently broken** (StructuredOutput crashes; its "refuted" verdicts are verifier false-negatives, not real refutations). Self-serve research via `gemini-grounding` + `curl`.
