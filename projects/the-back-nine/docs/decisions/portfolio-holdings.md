---
title: Portfolio holdings & basis — the household-blend model, the multi-holding recommendation, and the §1014 basis decision
doc-type: decision
status: ratified
created: 2026-06-18
derives-from: [docs/product.md, docs/architecture.md]
sources: [docs/architecture.md]
---

# Portfolio holdings & basis

## What this record is

This is the **permanent decision record** for how the household's portfolio is described to the engine — the **as-built household-blend model** (an exact per-account stock/bond/cash %, collapsed to one household `stockWeight`), the **shape-ratified but unbuilt** multi-holding entry that would let people enter the *securities they actually own*, and the **basis / estate-character** decisions (per-account-not-per-lot basis, the §1014 step-up, the ticker→blend collapse).

The portfolio **requirement** — R37, the ticker→one-household-blend collapse and per-account basis — is canonical in [docs/product.md](../product.md); the **load-bearing engine invariants** this rides (the single shared market draw / CRN, no asset-location) live once in [docs/architecture.md](../architecture.md). This record holds the *rationale* and links to those for the fact.

Two things are true at once, and the split runs through this whole record. The **household-blend model shipped**: an exact per-account allocation collapsing to one household `stockWeight`, sum-to-100 enforced at "Add this account" since 2026-09-03 (`41f9edee`). The **multi-holding `holdings?` field is shape-ratified and not built** (Council of Elders, 2026-06-29, conf 9/10 — see [`docs/council-log.md`](../council-log.md)): the field shape, the pinned invariants and the gate obligations below are the recorded design, awaiting a build. Per-unit build status lives in the roadmap's [You-Are-Here table](../roadmap.md) — never re-typed here.

---

## Council ratification (2026-06-29) — shape decided, build deferred

The council was convened to ratify this decision *before* U8 shipped (U8 is the first encrypted Save, which makes `ScenarioV3` durable, persisted user data). It **refuted the load-bearing premise** of the sequencing rule this record previously carried and ratified a corrected decision (full roster, Honesty-Hawk veto fired-and-honored, conf 9/10):

- **The "fold into U8 now, or pay a v3→v4 migration over encrypted blobs" dichotomy is FALSE.** The codec is a documented **tolerant reader**: unknown extra fields pass through untouched, and an *optional additive* field under the same `schemaVersion` is the established pattern (`src/shared/scenarioCodec.ts:21-23`; the live `hsa`/`contributions`/`ticker?` precedents; `checkEnteredAccount` already gates optional siblings on `!== undefined` at `:364-365`; decode returns the whole parsed object at `:940`). So **adding `holdings?` later is additive-within-v3 — no `schemaVersion` bump, no re-encrypt, no migration.** Deferral is the *free* option; folding a dark, not-yet-built validator into the durable encrypted format *now* is the latent liability (an untested gate over real money data — insights 048/029).
- **DECISION: ship U8 on the existing `ScenarioV3` unchanged. Land multi-holding LATER, additive-within-v3, WITH its UI writer + a real populated fixture + the codec gate.** U8 shipped that way on 2026-07-02, on `ScenarioV3` untouched; the multi-holding half has not been built since.

**The ratified field shape** (recorded so the build inherits it):

```ts
// on EnteredAccount:
readonly holdings?: readonly Holding[]

interface Holding {
  readonly label: string                 // ticker/blend LABEL — never a live-price key (R36)
  readonly blend: TickerClassification   // REUSE the existing union ⇒ burned/062 no-silent-default for free
  readonly valueToday: number            // the position's dollars off the statement — a BLEND WEIGHT only
}
```

- **PINNED INVARIANT (Honesty-Hawk veto + the red-team's strongest hit, conceded by architect+advocate):** `account.valueToday` **stays required and stored as the authoritative balance** (`scenarioCodec.ts:370-371` needFinite; summed into the portfolio at `intakeMap`). Holdings derive the **blend only, never the balance**. The `valueToday − Σ(holdings)` residual (cash sweep, accrued dividends, untyped lots) is **visibly reconciled in plain text, never silently absorbed** (burned/062). Deriving the balance from the holdings sum is **rejected** — it would be either the subtractive reshape this record claims to avoid (a false "data damaged" on every rollback / multi-device / stale-PWA load) or a silent portfolio *understatement* (pessimistic calm-but-wrong — scaring a household into over-working or mis-sizing Roth headroom).
- **Codec rule:** absent `holdings` = the simple `manualBlend` path (~95% of saves). A present-but-empty `holdings: []` and a `null` are both **Corrupt** (present ⇒ `length ≥ 1`; DND-009 absent-not-null).
- **Gate obligations owed WHEN it lands (they did not block U8):** finiteness-first then per-component range + sum gate at the codec on every blend fraction; a *planted* finite-out-of-range fail test (insight 046); and a *populated* value-weighted multi-holding fixture (insight 029). The fourth obligation — the then-finite-only `checkTickerClassification` `exact` arm — was **closed early**, on 2026-06-30 in the U8-arc ultramode review (`d405fb08`): that arm now refuses a negative component and a zero-sum blend as `Corrupt` (`scenarioCodec.ts:327-352`), mirroring the invariant `stockWeightForBlend` throws on. It deliberately does **not** gate sum-to-1 — the collapse renormalizes by the actual sum, so only `≥ 0` and a positive sum are load-bearing at the restore path. The whole household blend is backstopped by `validateParams`' `stockWeight ∈ [0,1]` gate (`simulate.ts:510-511`; stockWeight is *derived*, not persisted). `checkEnteredAccount` has no burned/063 exhaustiveness tie (that tie is top-level only) — author the validator deliberately.
- **Accessibility (the reader is color-blind):** the eventual blend / asset-mix readout / reconcile note must encode by **label + number + a non-color channel**, never hue alone.
- **Dissent (minimalist, recorded):** make the per-holding weight a **percentage summing to 100** (converted at entry, with the user present) so no residual can exist. *What would flip it:* at build time, if dollars-with-visible-reconcile proves error-prone for a scared non-expert, or a dollars→percent conversion-at-entry proves cleaner than persisting a residual, percent wins. **Dollars is the recorded lead** (matches R36 statement entry, reuses the `EnteredAccount` blend machinery with zero new logic); percent is the documented alternative. Either way: `valueToday` stays the stored authoritative balance.

---

## The current holdings model (as-built)

The intake is **exact-allocation, per account.** Each account is entered with one precise stock/bond/cash % (`AllocationEntry.tsx`, sum-to-100 enforced in the component so an invalid split never leaves it — and, since 2026-09-03 (`41f9edee`), "Add this account" refuses a typed-but-not-100 split rather than committing the account blend-less), value-weighted across accounts into **one household `stockWeight` ∈ [0,1]** (`intakeMap.ts` `householdStockWeight`). The engine consumes that single `stockWeight` under the single shared market draw / CRN contract — asset-location is deliberately **forbidden** (the engine never models *which* assets sit in *which* account for growth or tax). A single-ticker-per-account lookup and a "mostly stocks" quick-pick were both **retired** in favor of the one precise allocation question; the per-account allocation is the entry.

The ticker *read* path is nonetheless live below the UI: `resolveBlend` (`intakeMap.ts:290-301`) prefers `account.ticker` against the bundled blend table, falls back to the household `tickerClassifications` entry for a missed ticker, and only then reads `account.manualBlend`. Nothing in the shipped intake writes `ticker` or `tickerClassifications`, so today every account arrives through the `manualBlend` arm — the ticker arms are the seat the multi-holding build lands into, kept exercised by the codec and the unit tests. Either way a blend is never a silent default: an unresolved blend makes `resolveBlend` return `null`, which `missingRequiredFacts` (`intakeMap.ts:207`) gates as an unmet fact *before* any params are built, so no plausible guess ever reaches the engine (burned/062). The one `stockWeight ?? 0` fallback at `intakeMap.ts:688` is reachable only at zero accounts, where every return multiplies a $0 portfolio and the weight is mathematically inert.

---

## Why this is safe to build (the load-bearing insight)

Letting a user enter many holdings per account **aggregates to the same single `stockWeight` the engine already consumes.** Each holding resolves to a stock fraction via the existing ticker machinery; the account's blend becomes the value-weighted average of its holdings; the household stock weight is unchanged (still value-weighted across accounts). **The engine contract does not move** — no per-account asset growth, no asset-location, CRN intact. This is an **intake + aggregation** upgrade, not an engine change.

It also *improves the answer's fidelity*, not just the UX: for a single-fund account the two paths agree exactly; for a mixed account a **real per-account blend beats a one-allocation proxy**. The CRN / no-asset-location invariants are canonical in [docs/architecture.md](../architecture.md); this record links to them rather than restating them.

---

## The CSP / R36 constraint that shapes the design

`connect-src 'self'` + R36 forbid any runtime price fetch. So the ratified holdings entry is **(ticker, dollar value)** — the value read off the statement — **never (ticker, shares × live price)**. The ticker drives the *blend*; the entered dollars drive the *weight*. (Shares-only entry is a non-starter without a price source we are not allowed to fetch.) The account's `valueToday` stays the required, authoritative balance — the holdings derive the **blend only**, and the `valueToday − Σ(holdings)` residual must be visibly reconciled (the PINNED INVARIANT above; deriving the balance from the holdings sum is **rejected**). A holding's ticker/CUSIP is a **label + asset-class hint**, never a live-price key — the same no-runtime-external-fetch architecture the whole product rides (strict CSP, offline-first PWA, deterministic replay).

---

## The multi-holding entry (shape RATIFIED by the 2026-06-29 council — not built)

> Briggsy, 2026-06-14 — *"why aren't we just letting folks input what securities they own? … if we can't even do what they do then why would they use our tool?"*

Every brokerage app shows you **holdings** — a list of positions. The ratified answer to the remark: **opt-in, value-based, in two slices, as an additive-within-v3 field** — without faking a precision the honest engine does not have. The shape is settled; the build is not done.

- **Slice 1 (the product win):** multi-holding entry per account behind an **opt-in expander**; aggregate to the account blend; derive/reconcile the value. The default stays the exact-allocation entry that shipped (the ~5-minute path is protected); the expander is where "enter what you own" lives.
- **Slice 2 (optional polish):** a holdings summary in the account-list row, and a household **asset-mix readout** ("about 68% stocks") so the user *sees* the blend their holdings produced — closing the loop on "I entered what I own, here's my mix."

**Sequencing — the canonical rule (this record's single owner of it):** multi-holding entry lands as an **additive-within-v3 optional field** on `EnteredAccount`, shipped **WITH its UI writer** — never as a bare dark field. Because the codec is a tolerant reader (the `hsa`/`contributions` additive-within-version pattern), landing it after U8 is **not** a v3→v4 migration and never was: the "rides U8 or else pay a v3→v4 migration" framing this record once carried was a verified false dichotomy, refuted by the 2026-06-29 council above. That is why U8 shipped on the existing `ScenarioV3` unchanged, and why the field can still land today at no schema cost.

### Honest framing (the scope boundary)

This does **not** make us a position-level portfolio analyzer — we do not track each holding's growth; **one blended `stockWeight` is the deliberate engine design** (asset-location forbidden for CRN). It makes the **intake match how people see their accounts** and derives the mix more accurately, **without faking a precision the honest engine doesn't have** (the cardinal rule — canonical in [docs/product.md](../product.md)).

### The three ATC sub-decisions — all RESOLVED 2026-06-29 (kept for the record)

These were the three open ATC calls when this record was written. **The 2026-06-29 council resolved all three**; the questions are kept because the reasoning that closed them constrains the build:

1. **Opt-in expander vs. holdings-first?** → **opt-in** (protects the ~5-minute path; the remark is satisfied by *offering* real holdings, not *forcing* them; settled by design law). The offer *wording* is the one thing left to the build — it must read clearly optional, the simple path never the lesser answer.
2. **Value-derived account balance, or balance + holdings cross-check?** → **neither: `valueToday` stays the stored authoritative balance; holdings derive the *blend* only; the residual is *visibly reconciled*, never silently derived/overwritten.** Deriving the balance from the holdings sum is rejected (subtractive reshape / silent understatement). The reconcile-UX wording is Briggsy's taste call; the "visible reconcile, never silent" floor is pinned.
3. **Fold the model field into U8, or do it standalone now?** → **neither: land it after U8, additive-within-v3, with its writer.** Deferral is not a migration (tolerant reader); folding a dark validator into the durable format would have been the liability.

---

## Basis & estate character

### Per-account, not per-lot, basis

We collect taxable cost basis **per taxable account** (asked on brokerage accounts only, summed to the engine's single aggregate `initialTaxableBasis` at `intakeMap.ts:635`) — **not per lot.** Per-lot basis is collectible-but-unused precision; we deliberately don't collect it (scope-guardian). The fact itself — that the engine consumes one aggregate basis and per-lot is intentionally uncollected — is canonical in [docs/product.md](../product.md) **R37**; this record holds the rationale and points to R37 for the requirement.

### The ticker → one household blend (cash → bond; TDFs static)

Per-ticker holdings collapse to a single household stock-vs-(bond+cash) blend feeding the engine's one `stockWeight` (the engine is 2-asset, so a separate cash sleeve is deferred — cash folds into the bond sleeve; the fold itself lives in `stockWeightForBlend`). The blend table shipped: every row in `src/engine/reference/tickerBlend.ts` carries an **issuer / SEC-EDGAR citation**, and every *dated* row its `asOf` (a pure index fund whose allocation is definitional carries none and does not hold the aggregate back — `tickerBlend.ts:1570-1572`), and target-date funds hold a **static-snapshot** blend ("today's allocation, held constant") — the years-to-target glide curve is the named correctness upgrade, and several TDF rows carry an in-flight glide revision flagged for re-pinning. The table's staleness is already exposed to the user: `BLEND_SNAPSHOT_AS_OF` (`tickerBlend.ts:1573`) is one MAX `asOf` over all rows and feeds the U17 §S4 staleness surface, which stays inert for a household whose blends are its own manual entry. Two pieces are owed by the build that turns the ticker on: the **static-snapshot disclosure copy**, owned by the D1 intake (the C1 half — the constants table itself — shipped), and the **manual 3-choice classifier (+ an advanced exact-% expander)** an unrecognized ticker routes to. The model and codec already carry the classifier's `simple`/`exact` union and `resolveBlend` reads both arms, but only the `exact` variant has a production writer: the per-account allocation entry commits it as the account's `manualBlend` (`AllocationEntry.tsx:85`). The `simple` 3-choice arm and the ticker-keyed `tickerClassifications` map have no writer at all. The ticker→household-blend collapse and the manual-classification fallback are canonical in [docs/product.md](../product.md) **R37**; this record holds the rationale.

### The §1014 basis step-up is IN

A disclosed omission here can **invert the after-tax ranking**, so §1014 was **modeled, not deferred**, and it shipped with the recommend-second engine: the first-order §1014 / IRD adjustment is folded into the **leave-more objective** (`src/engine/solver/objective.ts`) at a **disclosed assumed heir bracket** (preserving a taxable bucket that steps up at death can beat converting pre-tax the heirs owe IRD on). The heir bracket is a named R7 constant with its own citation, defaulted to the representative middle federal ordinary bracket and **editable at the AssumptionPanel heir-bracket seat — surfaced, never hidden** (`src/engine/constants/solver.ts:114-136`). The inversion it exists to catch is pinned by an externally-derived oracle case, `caseLeaveMore.ts` ("the gross-bequest argmax is the after-tax LOSER"). The overlay exposes per-bucket **basis / character** (taxable basis, pre-tax IRD, Roth tax-free) so the objective can read it; the per-bucket basis/character mechanic lives in [docs/architecture.md §7.1](../architecture.md). A **full estate model is chapter-two** — out of v1.

---

## Build status

The household-blend model (exact per-account allocation → one `stockWeight`) and the §1014 / per-bucket basis-character exposure inside the recommend-second engine's leave-more objective both **shipped**. `EnteredAccount.holdings?` is **shape-ratified and unbuilt** (council 2026-06-29): when it lands it is an additive-within-v3 optional field carrying its UI writer, its populated fixture and its codec gate — never a v3→v4 migration. Per-unit status is the roadmap's [You-Are-Here table](../roadmap.md); the build narrative lives in [docs/plans/2-first-answer.md](../plans/2-first-answer.md) (intake) and [docs/plans/4-recommendation.md](../plans/4-recommendation.md) (the leave-more objective).
