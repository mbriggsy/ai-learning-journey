---
title: "Scoping: let people enter the securities they actually own (the portfolio remark)"
date: 2026-06-14
status: SCOPING — decision-ready, NOT yet built (awaiting Briggsy's ATC call)
trigger: Briggsy, 2026-06-14 — "why aren't we just letting folks input what securities they own? feels weird (and mediocre) that the user can't enter their portfolio. We keep saying we don't want to be like every other simple calculator, but if we can't even do what they do then why would they use our tool?"
---

## The remark, sharpened

Every brokerage app shows you **holdings** — a list of positions (VTI, BND, AAPL, cash). The Back Nine
asks, per account, for **one balance + one representative ticker** (`AccountEntry.tsx:186` — a single
`ticker` field → `findBlendRow` → a stock/bond blend; or a manual "mostly stocks/bonds/cash"). So a
real mixed brokerage account collapses to "what's it *mostly* in?" — exactly the mediocrity the remark
names, and below the bar a co-pilot people bet real money on should hold.

## Current state (verified in the code)

- **Model** (`src/shared/model.ts`): `EnteredAccount = { kind, ownerIndex, valueToday, basis?, ticker?,
  manualBlend?, annualContribution?, employerMatchAnnual? }` — **one optional ticker per account**.
- **Blend resolution** (`intakeMap.ts:194` `resolveBlend`): `ticker → findBlendRow → stockWeightForBlend`,
  else the household `tickerClassifications[ticker]`, else the per-account `manualBlend`. One stock
  fraction per account.
- **Household weight** (`intakeMap.ts:210` `householdStockWeight`): **value-weighted across accounts**
  → ONE `stockWeight` ∈ [0,1].
- **Engine** (`simulate.ts`): consumes a single `params.stockWeight` under the **single shared market
  draw / CRN** contract. **Asset-location is deliberately forbidden** (CLAUDE.md: per-bucket draws would
  break CRN and re-enable asset-location) — the engine never models *which* assets sit in *which*
  account for growth/tax.

## The load-bearing insight (why this is safe to build)

**Letting a user enter many holdings per account AGGREGATES to the same single `stockWeight` the engine
already consumes.** Each holding resolves to a stock fraction via the *existing* ticker machinery; the
account's blend becomes the value-weighted average of its holdings; `householdStockWeight` is unchanged
(still value-weighted across accounts). **The engine contract does not move** — no per-account asset
growth, no asset-location, CRN intact. This is an **intake + aggregation** upgrade, not an engine change.
It also *improves the answer's fidelity* (a real per-account blend beats a one-ticker proxy), not just
the UX — for a single-fund account the two agree exactly; for a mixed account the holdings path is more
honest.

## Hard constraint that shapes the design (CSP / R36)

`connect-src 'self'` + R36 forbid any runtime price fetch. So holdings are entered as **(ticker, dollar
value)** — the value read off the statement — **never (ticker, shares × live price)**. The ticker drives
the *blend*; the entered dollars drive the *weight*. (Shares-only entry is a non-starter without a price
source we're not allowed to fetch.) The account's `valueToday` can then be **derived** as the sum of its
holdings (with a manual-override + reconcile path), or kept as a separate entry cross-checked against the
holdings sum.

## What it would take

1. **Model:** add `holdings?: ReadonlyArray<{ ticker?: string; manualBlend?: TickerClassification; value: number }>`
   to `EnteredAccount` (a new ScenarioV3 field → rides the U8 persisted-shape work). `ticker`/`manualBlend`
   stay for the simple single-holding path (back-compat); `holdings` is the richer alternative.
2. **`resolveBlend`:** when `holdings` present, return `Σ(h.value · stockWeightOf(h)) / Σ(h.value)` —
   reuse `findBlendRow` / the classifier per holding. The household weight code is untouched.
3. **Intake (`AccountEntry.tsx`):** a **holdings sub-list** (add/remove rows: ticker + value, each row
   resolving its blend via the existing `TickerClassifier` for a miss). Per back-nine-design's
   **progressive-disclosure / advanced-precision-on-demand** rule, keep the current single-ticker (or
   "mostly-X") entry as the **default**, with **"enter individual holdings" as an opt-in expander** — we
   do NOT force every household to itemize (the ~5-minute budget). The expander is where "enter what you
   own" lives.
4. **Validation/aggregation:** the account value reconciles to the holdings sum (a calm "these don't add
   up to the balance — N left to assign" note, never a hard block; coherent-but-dire flows through).
5. **Tests:** holdings → blend aggregation (externally-derived), the value reconcile, the opt-in default
   path stays byte-identical to today's single-ticker accounts.

## Recommendation (for the ATC call)

**Build it, opt-in, value-based, in two slices — but sequence it AFTER U8 (save/load).** Rationale:
the model change adds a `ScenarioV3` field, and U8 is already the unit that defines the persisted shape +
its codec; folding `holdings` in during U8 avoids a v3→v4 migration. So:

- **Slice 1 (the product win):** multi-holding entry per account behind an opt-in expander; aggregate to
  the account blend; derive/reconcile the value. This is the "enter your portfolio" answer to the remark.
- **Slice 2 (polish, optional):** a tidy holdings summary in the account list row, and a household
  asset-mix readout ("about 68% stocks") so the user *sees* the blend their holdings produced — closing
  the loop on "I entered what I own, here's my mix."

**The honest framing to preserve:** this does NOT make us a position-level portfolio analyzer (we don't
track each holding's growth — one blended `stockWeight` is the deliberate engine design, asset-location
forbidden for CRN). It makes the **intake match how people see their accounts** and derives the mix more
accurately. That's the right scope — it does what the calculators do (enter holdings) without faking a
precision the honest engine doesn't have.

## Open decisions for Briggsy

1. **Opt-in expander vs. holdings-first?** Recommendation: opt-in (protects the 5-minute path); the remark
   is satisfied by *offering* real holdings, not *forcing* them.
2. **Value-derived account balance, or balance + holdings cross-check?** Recommendation: derive the balance
   from the holdings sum in the expander (one less number to type), with a manual override.
3. **Sequence:** fold the model field into U8, or do it standalone now (accepting a small migration)?
   Recommendation: fold into U8.
