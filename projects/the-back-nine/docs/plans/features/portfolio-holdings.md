---
title: Portfolio holdings entry — let people enter the securities they actually own
doc-type: feature
status: scoping
created: 2026-06-17
updated: 2026-06-17
derives-from: [docs/product.md]
sources: [docs/architecture.md]
---

# Portfolio holdings entry

**Status: scoping — decision-ready, not yet built. Zero code.**

Let a household enter the actual securities it owns, per account, instead of describing each
account in aggregate. This is an **intake + aggregation** upgrade, not an engine change: many
holdings collapse to the same single household stock/bond/cash blend the engine already consumes,
so the load-bearing engine contracts (the single shared market draw / CRN, no asset-location) do
not move. See [docs/architecture.md](../../architecture.md) for those invariants — they live there
once and this doc links to them rather than restating them.

## The remark that started it

> Briggsy, 2026-06-14 — "why aren't we just letting folks input what securities they own? feels
> weird (and mediocre) that the user can't enter their portfolio. We keep saying we don't want to
> be like every other simple calculator, but if we can't even do what they do then why would they
> use our tool?"

Every brokerage app shows you **holdings** — a list of positions (VTI, BND, AAPL, cash). A real
mixed brokerage account collapses, in the current intake, to a single per-account allocation. That
is below the bar a co-pilot people bet real retirement money on should hold. The fix is to let an
account be entered as the positions it actually holds — and to do it without faking a precision the
honest engine does not have.

## Current state (verified in code, 2026-06-17)

The single-ticker-per-account approach described in the original scoping note is **gone**. The
current intake is **exact-allocation, per account**:

- **Model** (`src/shared/model.ts`): `EnteredAccount = { ownerIndex, kind, ticker?, manualBlend?,
  valueToday, basis?, annualContribution?, employerMatchAnnual?, hsaEmployerAnnual? }`. The account's
  stock/bond/cash mix is entered **directly** via `manualBlend` (the `exact` arm of
  `TickerClassification` — `{ stockPct, bondPct, cashPct }`, intake-enforced sum-to-100). The
  `ticker` field still exists on the interface but is **NOT collected by the current intake** — it is
  explicitly reserved for the U8 multi-holding entry (decision 7 below). Absent or unrecognized
  ticker ⇒ `manualBlend` is REQUIRED (burned/062 — a blend is never a silent default).
- **Allocation entry** (`src/intake/AllocationEntry.tsx`): one precise stock/bond/cash % question per
  account, sum-to-100 enforced in the component so an invalid split never leaves it. Per the file's
  own contract: *the earlier "mostly stocks" quick-pick AND the single-ticker lookup were both
  retired (decision: one precise allocation question per account; the multi-holding ticker entry
  rides U8).* The stored shape is still `TickerClassification`; the `simple` arm is kept in the model
  for the U8 reuse path but is no longer produced by intake.
- **Household weight**: value-weighted across accounts → ONE `stockWeight` ∈ [0,1].
- **Engine** (`src/engine/simulate.ts`): consumes a single `params.stockWeight` under the single
  shared market draw / CRN contract. Asset-location is deliberately forbidden — the engine never
  models *which* assets sit in *which* account for growth/tax.

The current persisted shape is `ScenarioV3` (defined in `model.ts`; written at U8 per the
define-now / write-at-U8 contract).

## The load-bearing insight (why this is safe to build)

PRESERVE — the reason the engine contract does not move:

> **Letting a user enter many holdings per account AGGREGATES to the same single `stockWeight` the
> engine already consumes.** Each holding resolves to a stock fraction via the *existing* ticker
> machinery; the account's blend becomes the value-weighted average of its holdings; the household
> stock weight is unchanged (still value-weighted across accounts). **The engine contract does not
> move** — no per-account asset growth, no asset-location, CRN intact. This is an **intake +
> aggregation** upgrade, not an engine change. It also *improves the answer's fidelity* (a real
> per-account blend beats a one-allocation proxy), not just the UX — for a single-fund account the
> two agree exactly; for a mixed account the holdings path is more honest.

## Hard constraint that shapes the design (CSP / R36)

PRESERVE-VERBATIM — the price-fetch prohibition:

> `connect-src 'self'` + R36 forbid any runtime price fetch. So holdings are entered as **(ticker,
> dollar value)** — the value read off the statement — **never (ticker, shares × live price)**. The
> ticker drives the *blend*; the entered dollars drive the *weight*. (Shares-only entry is a
> non-starter without a price source we're not allowed to fetch.) The account's `valueToday` can then
> be **derived** as the sum of its holdings (with a manual-override + reconcile path), or kept as a
> separate entry cross-checked against the holdings sum.

This is the same no-runtime-external-fetch architecture the whole product rides: strict CSP,
offline-first PWA, deterministic replay. A holding's ticker/CUSIP is a **label + asset-class hint**,
never a live-price key (R36).

## What it would take

Multi-holding entry rides **U8** (save/load) as a **fresh opt-in**, behind an expander. It is a new
field on the U8 persisted shape — **no v3→v4 migration** (the field is folded in while U8 is the unit
that defines the persisted shape + its codec, so there is no separate migration step to own).

1. **Model:** add `holdings?: ReadonlyArray<{ ticker?: string; manualBlend?: TickerClassification;
   value: number }>` to `EnteredAccount`, folded into the U8 persisted shape. The direct `manualBlend`
   (exact-%) entry stays as the simple default path (back-compat); `holdings` is the richer
   alternative. `ticker` per holding drives the blend lookup; `manualBlend` per holding is the
   classify-the-miss fallback.
2. **Blend resolution:** when `holdings` is present, the account blend becomes
   `Σ(h.value · stockWeightOf(h)) / Σ(h.value)` — reuse the existing blend-row / classifier machinery
   per holding. The household weight code is untouched (still value-weighted across accounts).
3. **Intake (`AccountEntry.tsx` / `AllocationEntry.tsx`):** a **holdings sub-list** (add/remove rows:
   ticker + value, each row resolving its blend via the existing classifier for a miss). Per
   back-nine-design's **progressive-disclosure / advanced-precision-on-demand** rule, keep the current
   exact-allocation entry as the **default**, with **"enter individual holdings" as an opt-in
   expander**. We do NOT force every household to itemize (the ~5-minute path). The expander is where
   "enter what you own" lives.
4. **Validation / aggregation:** the account value reconciles to the holdings sum — a calm *"these
   don't add up to the balance — $N left to assign"* note, never a hard block; coherent-but-dire
   flows through (R19).
5. **Tests:** holdings → blend aggregation (externally-derived per the architecture's externally-
   derived-fixtures rule), the value reconcile, and the opt-in default path stays byte-identical to
   today's exact-allocation accounts.

## Recommendation (for the ATC call)

PRESERVE — the scope decision:

> **Build it, opt-in, value-based, in two slices — but sequence it as part of U8 (save/load).**
> Rationale: the model change adds a field to the persisted shape, and U8 is the unit that defines
> that shape + its codec; folding `holdings` in during U8 avoids a v3→v4 migration. So:
>
> - **Slice 1 (the product win):** multi-holding entry per account behind an opt-in expander;
>   aggregate to the account blend; derive/reconcile the value. This is the "enter your portfolio"
>   answer to the remark.
> - **Slice 2 (polish, optional):** a tidy holdings summary in the account-list row, and a household
>   asset-mix readout ("about 68% stocks") so the user *sees* the blend their holdings produced —
>   closing the loop on "I entered what I own, here's my mix."

**The honest framing to preserve:** this does NOT make us a position-level portfolio analyzer (we
don't track each holding's growth — one blended `stockWeight` is the deliberate engine design,
asset-location forbidden for CRN). It makes the **intake match how people see their accounts** and
derives the mix more accurately. That's the right scope — it does what the calculators do (enter
holdings) without faking a precision the honest engine doesn't have.

## ATC decisions / sub-decisions (open)

PRESERVE — the three open decisions and their recommendations:

1. **Opt-in expander vs. holdings-first?** Recommendation: **opt-in** (protects the ~5-minute path);
   the remark is satisfied by *offering* real holdings, not *forcing* them.
2. **Value-derived account balance, or balance + holdings cross-check?** Recommendation: **derive**
   the balance from the holdings sum in the expander (one less number to type), with a manual override.
3. **Sequence:** fold the model field into U8, or do it standalone now (accepting a small migration)?
   Recommendation: **fold into U8** (no v3→v4 migration).

## Superseded / changelog

Live text above reads current. The superseded facts, recorded once, here:

- **Single-ticker-per-account → exact allocation (removed).** The original scoping note (2026-06-14)
  described the then-current intake as "one balance + one representative ticker per account"
  (`AccountEntry.tsx` single `ticker` field → blend lookup, or a manual "mostly stocks/bonds/cash"
  quick-pick). That approach was **retired**: the single-ticker lookup AND the "mostly stocks"
  quick-pick were both removed in favor of one precise stock/bond/cash % allocation question per
  account (`AllocationEntry.tsx`; the `exact` arm of `TickerClassification`). The `ticker` field
  remains on the model interface but is no longer collected — it is reserved for this feature's U8
  multi-holding entry.
- **`ScenarioV3` field → fresh U8 opt-in (no migration).** The original note framed `holdings` as a
  new `ScenarioV3` field that "rides the U8 persisted-shape work." It is now correctly a **fresh
  opt-in** field (`holdings?`) on the U8 persisted shape, folded in while U8 defines the shape — so
  there is **no v3→v4 migration**.
