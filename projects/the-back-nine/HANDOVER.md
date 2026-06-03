# The Back Nine — Session Handover

> Kickoff/charter doc. Read this first when resuming in this directory.
> This is the durable context; the living task queue lives in `TODO.md` once we start building.

## What this is

**The Back Nine** — a retirement planning / wealth management / tax planning product.

Name = golf metaphor for the second half of life: every shot counts more, you're playing for the finish. Picked by Briggsy over Harvest / Compound / Golden Hour.

**This is NOT another engineering proving ground.** It is a **potential commercial product**. The bar is no longer "does it run" — it is "would a stranger pay for this and trust it with their net worth." Treat every decision at that altitude.

## The four founding answers (from Briggsy)

1. **Audience:** Initially for Briggsy, but built as a potential commercial product from day one.
2. **Scope:** All of it — retirement glidepath projections, live wealth/portfolio picture, tax-move planning (Roth conversions, harvesting, bracket management) — woven together, with room to grow.
3. **Data source:** Manual entry first. Open to Plaid-style account linking later, but only if **"crazily hardened."**
4. **Form factor:** Web app or desktop app. **Consumability is the HUGE factor** — Briggsy's lived complaint is that existing tools (and he knows what he's doing) have bad UX.

## The thesis (the wedge / the moat)

**Consumability is the entire moat.** The gap in this market isn't features or fancier math — every tool has those. The gap is that complex financial planning feels *hostile*: dense, intimidating, structured the way a builder thinks instead of the way a human thinks. If a competent user bounces off the incumbents, the 95% who aren't competent bounce harder. **The product that makes this domain feel calm and legible wins.** UX is not polish here — it is the product.

## Two architectural forks to settle EARLY (cascade into everything)

### Fork 1 — Where does the money data live? (RECOMMENDED, not yet locked)
**Recommendation: local-first, end-to-end encrypted.**
- Data lives on the user's device. Any future cloud sync encrypts client-side *before* anything touches a server — we hold ciphertext we cannot read.
- Marketing line AND engineering truth: *"We can't see your money, by design."*
- Makes manual-first the *correct* v1, not a compromise: zero third-party data risk while we nail the experience.
- Tension to resolve: commercial products usually want accounts/subscriptions/cross-device sync. The reconciliation is local-first + E2E-encrypted sync. **Do not name specific sync libraries as load-bearing until verified against sources.**

### Fork 2 — Are we a "tool" or an "advisor"? (regulatory line)
- Tools that *project and inform* ("here's what the math says") sit in a safe calculator-like zone.
- Tools that *recommend* ("you should do this Roth conversion") wade toward regulated financial-advice territory.
- Commercial products thread this with positioning + disclaimers. **We need to be on the right side of this line from the architecture up — not bolt it on later.**

## AGREED NEXT MOVE

**Research the landscape first — from cited sources, not memory.** A real pass covering:
1. **Competitors** — ProjectionLab, Boldin (née NewRetirement), Empower (née Personal Capital), Monarch, and others. Specifically *where their UX breaks* — that's our opening.
2. **Architecture** — local-first + E2E-encrypted patterns and tooling for a financial web/desktop app.
3. **Regulatory** — exactly where the advice-vs-tool line sits for a commercial planning product (disclaimers, positioning).

Output: a cited positioning brief we can lock decisions against. `deep-research` skill is the likely tool. Then: brainstorm product shape → pick tech foundation → scaffold.

## Landmines / standing notes

- **No bullshitting the market.** Competitive claims, regulatory line, and library choices get verified against sources before they go load-bearing. "I don't know yet" beats a confident-wrong claim that calcifies.
- **Commercial bar.** Quality-is-the-deliverable still holds, but now there's a real user who isn't Briggsy. User-seat empathy is mandatory.
- **Manual-first is intentional.** Don't reach for Plaid until the experience is proven and the hardening story is real.
- Stack is **undecided** — do not assume BURNED's Cloudflare/React setup carries over. Form factor (web vs desktop) is part of Fork 1's cascade.
