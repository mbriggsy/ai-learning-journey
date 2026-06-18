---
title: Portfolio holdings & basis — the household-blend model, the multi-holding recommendation, and the §1014 basis decision
doc-type: decision
status: scoping
created: 2026-06-18
updated: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/architecture.md]
---

# Portfolio holdings & basis

## What this record is

This is the **permanent decision record** for how the household's portfolio is described to the engine — the **as-built household-blend model** (an exact per-account stock/bond/cash %, collapsed to one household `stockWeight`), the **pending-ratification recommendation** to let people enter the *securities they actually own*, and the **basis / estate-character** decisions (per-account-not-per-lot basis, the §1014 step-up, the ticker→blend collapse).

The portfolio **requirement** — R37, the ticker→one-household-blend collapse and per-account basis — is canonical in [docs/product.md](../product.md); the **load-bearing engine invariants** this rides (the single shared market draw / CRN, no asset-location) live once in [docs/architecture.md](../architecture.md). This record holds the *rationale* and links to those for the fact.

The current model is **decided and as-built**. The multi-holding entry is **decision-ready, build-pending, and its sub-decisions remain open ATC calls** (flagged below). Nothing in the "recommendation" section is ratified.

---

## The current holdings model (as-built)

The intake is **exact-allocation, per account.** Each account is entered with one precise stock/bond/cash % (sum-to-100 enforced in the component so an invalid split never leaves it), value-weighted across accounts into **one household `stockWeight` ∈ [0,1]**. The engine consumes that single `stockWeight` under the single shared market draw / CRN contract — asset-location is deliberately **forbidden** (the engine never models *which* assets sit in *which* account for growth or tax). A single-ticker-per-account lookup and a "mostly stocks" quick-pick are **not used**; the precise per-account allocation is the entry. An absent or unrecognized ticker requires a manual blend — a blend is never a silent default (burned/062).

---

## Why this is safe to build (the load-bearing insight)

Letting a user enter many holdings per account **aggregates to the same single `stockWeight` the engine already consumes.** Each holding resolves to a stock fraction via the existing ticker machinery; the account's blend becomes the value-weighted average of its holdings; the household stock weight is unchanged (still value-weighted across accounts). **The engine contract does not move** — no per-account asset growth, no asset-location, CRN intact. This is an **intake + aggregation** upgrade, not an engine change.

It also *improves the answer's fidelity*, not just the UX: for a single-fund account the two paths agree exactly; for a mixed account a **real per-account blend beats a one-allocation proxy**. The CRN / no-asset-location invariants are canonical in [docs/architecture.md](../architecture.md); this record links to them rather than restating them.

---

## The CSP / R36 constraint that shapes the design

`connect-src 'self'` + R36 forbid any runtime price fetch. So holdings are entered as **(ticker, dollar value)** — the value read off the statement — **never (ticker, shares × live price)**. The ticker drives the *blend*; the entered dollars drive the *weight*. (Shares-only entry is a non-starter without a price source we are not allowed to fetch.) The account's `valueToday` can be **derived** as the sum of its holdings (with a manual-override + reconcile path), or kept as a separate entry cross-checked against the holdings sum. A holding's ticker/CUSIP is a **label + asset-class hint**, never a live-price key — the same no-runtime-external-fetch architecture the whole product rides (strict CSP, offline-first PWA, deterministic replay).

---

## The multi-holding entry (recommendation — pending ATC ratification)

> Briggsy, 2026-06-14 — *"why aren't we just letting folks input what securities they own? … if we can't even do what they do then why would they use our tool?"*

Every brokerage app shows you **holdings** — a list of positions. The recommendation: **build it, opt-in, value-based, in two slices, sequenced as part of U8 (save/load).** This is the answer to the remark — without faking a precision the honest engine does not have.

- **Slice 1 (the product win):** multi-holding entry per account behind an **opt-in expander**; aggregate to the account blend; derive/reconcile the value. The default stays the current exact-allocation entry (the ~5-minute path is protected); the expander is where "enter what you own" lives.
- **Slice 2 (optional polish):** a holdings summary in the account-list row, and a household **asset-mix readout** ("about 68% stocks") so the user *sees* the blend their holdings produced — closing the loop on "I entered what I own, here's my mix."

**Sequencing — the canonical rule (this record's single owner of it):** multi-holding entry **rides U8** as a new field on the U8 persisted shape, folded in **while U8 is the unit that defines the persisted shape + its codec** — so there is **no v3→v4 migration** (no separate migration step to own).

### Honest framing (the scope boundary)

This does **not** make us a position-level portfolio analyzer — we do not track each holding's growth; **one blended `stockWeight` is the deliberate engine design** (asset-location forbidden for CRN). It makes the **intake match how people see their accounts** and derives the mix more accurately, **without faking a precision the honest engine doesn't have** (the cardinal rule — canonical in [docs/product.md](../product.md)).

### Open ATC sub-decisions (pending ratification, with recommendations)

These are **live pending decisions**, not ratified:

1. **Opt-in expander vs. holdings-first?** → recommend **opt-in** (protects the ~5-minute path; the remark is satisfied by *offering* real holdings, not *forcing* them).
2. **Value-derived account balance, or balance + holdings cross-check?** → recommend **derive** the balance from the holdings sum in the expander (one less number to type), with a manual override.
3. **Fold the model field into U8, or do it standalone now?** → recommend **fold into U8** (no v3→v4 migration — the canonical sequencing rule above).

---

## Basis & estate character

### Per-account, not per-lot, basis

We collect taxable cost basis **per taxable account** (summed to the per-person account basis, then to the engine's single aggregate `initialTaxableBasis`) — **not per lot.** Per-lot basis is collectible-but-unused precision; we deliberately don't collect it (scope-guardian). The fact itself — that the engine consumes one aggregate basis and per-lot is intentionally uncollected — is canonical in [docs/product.md](../product.md) **R37**; this record holds the rationale and points to R37 for the requirement.

### The ticker → one household blend (cash → bond; TDFs static)

Per-ticker holdings collapse to a single household stock-vs-(bond+cash) blend feeding the engine's one `stockWeight` (the engine is 2-asset, so a separate cash sleeve is deferred — cash folds into the bond sleeve). Target-date funds ship a **static-snapshot** blend ("today's allocation, held constant"; the disclosure copy is owned by the D1 intake, the snapshot data by the C1 constants); the years-to-target glide curve is the named correctness upgrade. **An unrecognized ticker routes to a manual 3-choice classifier (+ an advanced exact-% expander).** All blends carry an **issuer / SEC-EDGAR citation, directional-until-pinned.** The ticker→household-blend collapse and the manual-classification fallback are canonical in [docs/product.md](../product.md) **R37**; this record holds the rationale.

### The §1014 basis step-up is IN

A disclosed omission here can **invert the after-tax ranking**, so §1014 is **modeled, not deferred**: a first-order §1014 / IRD adjustment is folded into the **leave-more objective** at a **disclosed assumed heir bracket** (preserving a taxable bucket that steps up at death can beat converting pre-tax the heirs owe IRD on). The overlay exposes per-bucket **basis / character** (taxable basis, pre-tax IRD, Roth tax-free) so the objective can read it; the per-bucket basis/character mechanic lives in [docs/architecture.md §7.1](../architecture.md). A **full estate model is chapter-two** — out of v1.

---

## Build status

The household-blend model (exact per-account allocation → one `stockWeight`) is **as-built**. Multi-holding entry is **decision-ready, zero code**, sequenced into **U8 (save/load)** — its three sub-decisions remain open ATC calls. The §1014 / per-bucket basis-character exposure rides the recommend-second engine's leave-more objective (Act 4). The build narrative lives in [docs/plans/2-first-answer.md](../plans/2-first-answer.md) (intake) and [docs/plans/4-recommendation.md](../plans/4-recommendation.md) (the leave-more objective).
