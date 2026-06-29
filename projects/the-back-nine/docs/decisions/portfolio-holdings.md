---
title: Portfolio holdings & basis — the household-blend model, the multi-holding recommendation, and the §1014 basis decision
doc-type: decision
status: ratified
created: 2026-06-18
updated: 2026-06-29
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/architecture.md]
---

# Portfolio holdings & basis

## What this record is

This is the **permanent decision record** for how the household's portfolio is described to the engine — the **as-built household-blend model** (an exact per-account stock/bond/cash %, collapsed to one household `stockWeight`), the **pending-ratification recommendation** to let people enter the *securities they actually own*, and the **basis / estate-character** decisions (per-account-not-per-lot basis, the §1014 step-up, the ticker→blend collapse).

The portfolio **requirement** — R37, the ticker→one-household-blend collapse and per-account basis — is canonical in [docs/product.md](../product.md); the **load-bearing engine invariants** this rides (the single shared market draw / CRN, no asset-location) live once in [docs/architecture.md](../architecture.md). This record holds the *rationale* and links to those for the fact.

The current model is **decided and as-built**. The multi-holding entry is **shape-ratified (Council of Elders, 2026-06-29, conf 9/10 — see [`docs/council-log.md`](../council-log.md)) but BUILD-DEFERRED**: it lands *after* U8 as an additive-within-v3 optional field, with its UI writer. See **Council ratification** immediately below — it is the current source of truth and **supersedes** any "rides U8 / else a v3→v4 migration" framing later in this record.

---

## Council ratification (2026-06-29) — shape decided, build deferred

The council was convened to ratify this decision *before* U8 ships (U8 is the first encrypted Save, which makes `ScenarioV3` durable, persisted user data). It **refuted the load-bearing premise** of the sequencing rule below and ratified a corrected decision (full roster, Honesty-Hawk veto fired-and-honored, conf 9/10):

- **The "fold into U8 now, or pay a v3→v4 migration over encrypted blobs" dichotomy is FALSE.** The codec is a documented **tolerant reader**: unknown extra fields pass through untouched, and an *optional additive* field under the same `schemaVersion` is the established pattern (`src/shared/scenarioCodec.ts:21-23`; the live `hsa`/`contributions`/`ticker?` precedents; `checkEnteredAccount` already gates optional siblings on `!== undefined` at `:248-249`; decode returns the whole parsed object at `:361`). So **adding `holdings?` later is additive-within-v3 — no `schemaVersion` bump, no re-encrypt, no migration.** Deferral is the *free* option; folding a dark, not-yet-built validator into the durable encrypted format *now* is the latent liability (an untested gate over real money data — insights 048/029).
- **DECISION: ship U8 on the existing `ScenarioV3` unchanged. Land multi-holding LATER, additive-within-v3, WITH its UI writer + a real populated fixture + the codec gate.** U8 is **not** blocked by this record.

**The ratified field shape** (recorded now so the later build inherits it):

```ts
// on EnteredAccount:
readonly holdings?: readonly Holding[]

interface Holding {
  readonly label: string                 // ticker/blend LABEL — never a live-price key (R36)
  readonly blend: TickerClassification   // REUSE the existing union ⇒ burned/062 no-silent-default for free
  readonly valueToday: number            // the position's dollars off the statement — a BLEND WEIGHT only
}
```

- **PINNED INVARIANT (Honesty-Hawk veto + the red-team's strongest hit, conceded by architect+advocate):** `account.valueToday` **stays required and stored as the authoritative balance** (`scenarioCodec.ts:250` needFinite; summed into the portfolio at `intakeMap`). Holdings derive the **blend only, never the balance**. The `valueToday − Σ(holdings)` residual (cash sweep, accrued dividends, untyped lots) is **visibly reconciled in plain text, never silently absorbed** (burned/062). Deriving the balance from the holdings sum is **rejected** — it would be either the subtractive reshape this record claims to avoid (a false "data damaged" on every rollback / multi-device / stale-PWA load) or a silent portfolio *understatement* (pessimistic calm-but-wrong — scaring a household into over-working or mis-sizing Roth headroom).
- **Codec rule:** absent `holdings` = the simple `manualBlend` path (~95% of saves). A present-but-empty `holdings: []` and a `null` are both **Corrupt** (present ⇒ `length ≥ 1`; DND-009 absent-not-null).
- **Gate obligations owed WHEN it lands (NOT U8 blockers):** finiteness-first then per-component range + sum gate at the codec on every blend fraction; a *planted* finite-out-of-range fail test (insight 046); a *populated* value-weighted multi-holding fixture (insight 029); and close the pre-existing `checkTickerClassification` finite-only `exact` arm (`scenarioCodec.ts:232-234`) in the same pass. Backstopped today by `validateParams`' `stockWeight ∈ [0,1]` gate (stockWeight is *derived*, not persisted), so it does **not** block U8. `checkEnteredAccount` has no burned/063 exhaustiveness tie (that tie is top-level only) — author the validator deliberately.
- **Accessibility (the reader is color-blind):** the eventual blend / asset-mix readout / reconcile note must encode by **label + number + a non-color channel**, never hue alone.
- **Dissent (minimalist, recorded):** make the per-holding weight a **percentage summing to 100** (converted at entry, with the user present) so no residual can exist. *What would flip it:* at build time, if dollars-with-visible-reconcile proves error-prone for a scared non-expert, or a dollars→percent conversion-at-entry proves cleaner than persisting a residual, percent wins. **Dollars is the recorded lead** (matches R36 statement entry, reuses the `EnteredAccount` blend machinery with zero new logic); percent is the documented alternative. Either way: `valueToday` stays the stored authoritative balance.

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

Every brokerage app shows you **holdings** — a list of positions. The recommendation: **build it, opt-in, value-based, in two slices, landed *after* U8 as an additive-within-v3 field** (see the **Council ratification** above — *not* folded into U8; deferral is verified free, not a migration). This is the answer to the remark — without faking a precision the honest engine does not have.

- **Slice 1 (the product win):** multi-holding entry per account behind an **opt-in expander**; aggregate to the account blend; derive/reconcile the value. The default stays the current exact-allocation entry (the ~5-minute path is protected); the expander is where "enter what you own" lives.
- **Slice 2 (optional polish):** a holdings summary in the account-list row, and a household **asset-mix readout** ("about 68% stocks") so the user *sees* the blend their holdings produced — closing the loop on "I entered what I own, here's my mix."

**Sequencing — the canonical rule (this record's single owner of it; CORRECTED by the 2026-06-29 council above):** multi-holding entry lands as an **additive-within-v3 optional field** on `EnteredAccount`, shipped **WITH its UI writer** — *after* U8, **not** folded into it. Because the codec is a tolerant reader (the `hsa`/`contributions` additive-within-version pattern), deferring past U8 is **not** a v3→v4 migration. U8 ships on the existing `ScenarioV3` unchanged. *(The original "rides U8 or else a v3→v4 migration" framing was a verified false dichotomy — see the ratification section.)*

### Honest framing (the scope boundary)

This does **not** make us a position-level portfolio analyzer — we do not track each holding's growth; **one blended `stockWeight` is the deliberate engine design** (asset-location forbidden for CRN). It makes the **intake match how people see their accounts** and derives the mix more accurately, **without faking a precision the honest engine doesn't have** (the cardinal rule — canonical in [docs/product.md](../product.md)).

### Open ATC sub-decisions (pending ratification, with recommendations)

These were the open ATC calls; **the 2026-06-29 council resolved all three** (see the **Council ratification** section above — these lines are kept for the record but are superseded where marked RESOLVED):

1. **Opt-in expander vs. holdings-first?** → **RATIFIED: opt-in** (protects the ~5-minute path; the remark is satisfied by *offering* real holdings, not *forcing* them; settled by design law). Only the offer *wording* remains open — it must read clearly optional, the simple path is never the lesser answer.
2. **Value-derived account balance, or balance + holdings cross-check?** → **RESOLVED: neither — `valueToday` stays the stored authoritative balance; holdings derive the *blend* only; the residual is *visibly reconciled*, never silently derived/overwritten.** Deriving the balance from the holdings sum is rejected (subtractive reshape / silent understatement). The reconcile-UX wording is Briggsy's taste call; the "visible reconcile, never silent" floor is pinned.
3. **Fold the model field into U8, or do it standalone now?** → **RESOLVED: neither — land it *after* U8, additive-within-v3, with its writer.** Deferral is not a migration (tolerant reader); folding a dark validator into the durable format now is the liability.

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

The household-blend model (exact per-account allocation → one `stockWeight`) is **as-built**. Multi-holding entry is **shape-ratified + build-deferred** (council 2026-06-29): an additive-within-v3 optional `EnteredAccount.holdings?` field, landed **after** U8 with its UI writer — **not** a v3→v4 migration. The §1014 / per-bucket basis-character exposure rides the recommend-second engine's leave-more objective (Act 4). The build narrative lives in [docs/plans/2-first-answer.md](../plans/2-first-answer.md) (intake) and [docs/plans/4-recommendation.md](../plans/4-recommendation.md) (the leave-more objective).
