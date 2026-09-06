---
title: "U13 build spec — the council-ratified corrected package (2026-07-09, wf_a1ef7e25-64d, 9/10)"
doc-type: build-spec
status: shipped
---

# U13 build spec — the council-ratified corrected package (2026-07-09, wf_a1ef7e25-64d, 9/10)

> The executable shape for ce-work. Supersedes the U13 plan section (`3-controls.md` L270–315) wherever they
> conflict — each supersession is dated and grounded in the council verdict (`docs/council-log.md` top row).
> The re-derive spine is NOT built here (it shipped in U8 — `IntakeApp.tsx` hydrate → recompute); U13 is the
> staleness layer + the ReEntry confirm + the stamps substrate.

## The honesty spine (Q1 — governs everything below)

- **Byte-identical re-presentation is scoped to the NO-DRIFT case.** The persisted seed + unchanged constants
  reproduce the saved number exactly (CRN). When ANY relevant fixture moved since save, the surface presents
  the CURRENT-vintage recompute **WITH** (never after) a calm "assumptions updated since your save" staleness
  note. Never silently stale, never silently changed — the note IS the disclosure.
- REJECTED: an engine vintage-injection seam; persisting constant sets into vaults. Engine purity absolute:
  no `Date`/clock inside `src/engine` — wall-time enters as an injected epoch-day in store/ui layers.
- The U12 sticky baseline re-seats from the re-derived value automatically (`commit()` seats
  `resolveStickyDisplay(null, …)` → raw). Under drift it re-seats to the current-vintage number; the
  staleness note discloses that. Plan L287's "sticky against the exact number the user last saw" holds
  in the no-drift case only (dated supersession).

## Phase A — the persisted substrate (stamps + producers)

All additive-within-v3 (NO schemaVersion bump — the plan's L282 "single schemaVersion bump" language was
retired by the U10/U11 supersession precedent; next real bump is U17's). Every new field lands in ONE atomic
change with: `ScenarioV3` type + `SCENARIO_V3_FIELDS` + `checkV3Fields` + the draft shape +
`DRAFT_DISPOSITIONS` entry (R7 compile gate) + codec tolerant-reader + planted-fail codec arms (burned/063).

1. **`savedAt?: number`** — finite integer **epoch-day** (UTC days since 1970-01-01), encrypted in the model.
   - Codec RANGE gate: reject outside [18263 ≈ 2020-01-01 .. 47482 ≈ 2100-01-01] as corrupt (insight-046
     class — an in-range garbage value is worse than a reject; mere finiteness is not enough). DND-009.
   - Stamped by `scenarioFromDraft` at the **atomic save-commit**, from the ui layer's clock.
   - **THE NORMALIZER (the clerk's determinism catch):** `scenarioFromDraft`'s output is BOTH the disk
     payload AND the dirty/clean `JSON.stringify` compare operand — a fresh `savedAt` per call would make
     every session permanently dirty. ONE shared normalizer excludes `savedAt` from the dirty compare and
     the draft↔scenario round-trip guard. Both consumers import it; neither re-implements it.
   - **Absent `savedAt`** (every vault saved before U13): the "~N years since your save" claim is
     SUPPRESSED — never fabricated from `startCalendarYear`, never defaulted to "today".
2. **`taxVintageDetail?: TaxVintageV3`** — atomic object minted by **`taxVintageStamp()` in
   `src/engine/constants/tax.ts`** (mirror `healthcareVintageStamp`, health.ts:422). Keyed on
   `TAX_YEAR` + the legal basis string. The legacy opaque `taxVintage: string` stays untouched (add-only).
   - RMD-age rule (effectiveFrom 2033) + senior-bonus sunset (sunsetAfter 2028) are **NOT stamped** —
     they are DERIVED read-time communication notes against LIVE constants (they're already deterministic
     inside the engine given birthYear + startCalendarYear).
3. **`dateVintage?: DateVintageV3`** — `{ contributionYear, blendSnapshotAsOf }`.
   - `contributionYear` from the existing `CONTRIBUTION_YEAR` (contributions.ts:28).
   - `blendSnapshotAsOf`: mint the aggregate export in `src/engine/reference/tickerBlend.ts` (max per-row
     `asOf`, or a hand-set snapshot date — whichever the blend single-source gate prefers; it lives under
     the reference gate, NOT `CONSTANTS_VINTAGE`).
4. **`CURRENT_APP_DEFAULT_VERSION`** — the canonical constant (today's value `'p2-d1'`), single home in
   `src/shared/` (leaf — importable by store + ui), replacing the bare literal in memoryModel.ts:567.
5. **`scenarioFromDraft` re-stamps ALL vintages fresh at every save** — taxVintageDetail, healthcareVintage
   (already does), dateVintage, appDefaultVersion, savedAt. Insight-058: N writers of a reconciliation
   invariant; the save path is the ONE stamp writer.

## Phase B — the staleness reader (`src/store/staleness.ts`, pure)

- **Input:** the RAW-decoded `ScenarioV3` captured **ONCE at unlock** (red-team constraint (a) — BEFORE
  `draftFromScenario`/`scenarioFromDraft` normalize or re-stamp; reading the post-resave draft cries wolf,
  reading the normalized persist never fires) + the current-build stamps + an injected `todayEpochDay`.
  Pure function — no clock reads inside.
- **Output — the per-surface clock map (U17-inheritable, 4-recommendation #8b):**
  - `spine`: `{ appDefaultMoved, yearsSinceSave? }` — appDefaultMoved via the **SAVED-ERA map** (Q7 REBUILT):
    an add-only `version → defaults` map keyed on the persisted `appDefaultVersion` (v1 seed:
    `'p2-d1' → { survivorSpendingRatio: 0.75 }`). A household is immune iff its persisted value differs
    from its SAVED era's default (they overrode), NEVER iff it differs from the CURRENT default (that
    inversion silently withholds the note from the took-the-default household — struck by the council).
    Vacuously inert in v1 (only p2-d1 exists); the SHAPE is the deliverable.
  - `controls`: `{ taxMoved }` — `taxVintageDetail` vs `taxVintageStamp()`; absent stamp = not-applicable.
    Plus the DERIVED notes: RMD-age era + senior-bonus sunset from (birthYear, startCalendarYear,
    todayEpochDay) against live constants. The senior-bonus note quotes **mfjBothSpouses65 = $350k**
    (tax.ts:133) — never the one-spouse $250k (red-team constraint (d); MFJ product by construction).
  - `healthcare`: `{ acaMoved, … }` — saved `healthcareVintage` vs `healthcareVintageStamp()`; the
    applicable-% clock rides the DOCUMENTED proxy (coverageYear + acaStatus + acaVerifiedOn; the
    reVerifyEveryBuild CI gate is the real mid-year detector — Q4, no new field).
  - `date`: `{ contributionMoved, blendMoved, yearsSinceSave? }` — plus the decay rule: the relative
    "~N years out" framing re-derives from wall-time; a sufficiently old save routes to recompute framing,
    never re-presents as current. NEVER write back into `startCalendarYear`/`currentAge` (round-trip guard).
  - `budget`: `{ expiredLines[] }` — **spine route only** (Q6): a line is past its window iff
    `(wallYear − startCalendarYear) > endYear`. The date route is documented-inert (its year-0 anchors to
    the FUTURE crowned work-stop; nothing can be past by pure time passage). Dated supersession of plan
    L293's route-agnostic wording.
- **Absent stamp = not-applicable** (plan L298) — never "infinitely stale", no false stale on legacy vaults.
- Battery: hand-derived fixtures per clock + planted-fail arms both directions (fires-when-moved,
  silent-when-identical) + the absent-stamp arms + a property sweep over the map (no clock fires on a
  freshly-stamped save).

## Phase C — the ReEntry surface + wiring

- **Mount:** an IntakeApp phase between `'restoring'` and `'result'` (inside the draft/persist/resave
  machinery the confirm's writes need). **The confirm GATES the reveal** (red-team (b)): split the hydrate
  IIFE so the balance confirm resolves BEFORE `setPhase('result')`/recompute — the verdict never renders on
  unconfirmed balances and then asks (the bait-and-switch).
- **The balance-drift confirm:** UNCONDITIONAL on every writable unlock (drift is undetectable by design —
  nothing to diff). Per-bucket read-back incl. HSA + the SS fold-in ("are these still your benefit
  amounts?"), affirm-first. A PROMPT, never an attestation (red-team (c)): no stored/displayed
  "confirmed-fresh on DATE".
  - Changed split → the EXISTING intake walk-through (the U12 panel's "Edit in the walk-through" precedent;
    no new mini-intake surface). Changed total → the U12 sharpen loop (the assumption panel / spend edit).
  - Read-only second-tab unlock (`session.writable()===false`, resultSave.ts forces `kind:'none'`):
    view-only presentation, NO write affordance; the ViewOnlyBanner stays the authority.
- **The staleness notes:** rendered WITH the first verdict presentation. Copy in `copy.ts` (copyGuard),
  calm-not-alarming — the Act-3 exit-condition cold-read (Briggsy's N=1, flagged in TODO).
- **The date answer's calendar label** (`startCalendarYear + Y`) — net-new render, tabular-nums, static,
  computed once.
- **Survivor door e2e:** recovery-passphrase unlock → mandatory new-passphrase gate → re-derive → the
  confirm — asserted end-to-end (the flows shipped in U8; U13 owes the assert).
- **Render floors:** CSS-only `@starting-style` crossfade (NEVER framer-motion layout — the style-src
  trap); reduced-motion IDENTITY (the note present in the final DOM with motion off); never-color-alone —
  a neutral info-silhouette DISTINCT from the six verdict glyphs, reachable as TEXT in the a11y tree
  (extend colorblind.test.tsx's distinctness arm); polite (never assertive) live region; focus-to-heading
  `tabindex=-1`.
- Live verify (real Chromium, 1536×791 + 390×844): writable / survivor / read-only walks; `verify:fit`
  stays 14/14 (+ any new arm if ReEntry adds a frame).

## Struck / already done

- ~~ACA verifiedOn sync~~ — landed pre-council (62ebe5fa + 6a94faf0, CI green).
- ~~roadmap.md:26 stale prose~~ — landed (62ebe5fa).

## Q2 dissent (preserved)

Minimalist: drop `savedAt`, anchor every wall-clock on `startCalendarYear`. Rebutted 7-elder:
startCalendarYear = "since you BUILT the plan" (mislabels every re-saver); only an in-ciphertext savedAt
survives export-restore for the wiped-device survivor. Flips only if re-save frequency proves ~zero AND
export-restore is ruled out of wall-clock scope.

## Dated supersessions — the U13 ultramode review (2026-07-09, wf_44cdf86d-b71; 13 lenses, 44 agents, per-finding refuters)

1. **The senior-bonus sunset "derived note" (this spec L41-43 / L69-71) is SUPERSEDED — the clock is
   REMOVED.** The ratified premise ("already deterministic inside the engine given birthYear +
   startCalendarYear") was refuted against source: `seniorBonusFor` (taxCore.ts) takes only
   (filing, count65, magi) and NOTHING in the tax math reads `seniorBonus.sunsetAfter` — the engine
   credits the 2025–2028-only bonus in EVERY sim year. So the shipped note ("this reading prices the
   years as they stand now") asserted a re-pricing the recompute never performs — calm-but-wrong,
   OPTIMISTIC-masking, 4-lens convergence. And under a CORRECTED engine the crossing is still not
   drift (the save already priced the calendar-deterministic sunset — recompute byte-identical), so
   the note has no honest content in either world. Disposition: the clock + copy removed
   (staleness.ts header carries the law); the **engine sunset unit is FILED REQUIRED** (thread the
   sim-year calendar through `deductionStack`/`seniorBonusFor` + the magiLandscape rails, DND-012
   external fixtures, council-ratified — TODO) and **build-tripwired**
   (`seniorBonusSunset.tripwire.test.ts` goes red on 2028-01-01 so the sunset's final priced year
   cannot build with the gap open).
   **→ CLOSED 2026-07-09 (same day): the engine sunset unit SHIPPED** — council-ratified 8/10
   (wf_a5ccd576-048, no veto; the honesty hawk's opening seat crashed on a schema mismatch and its
   rebuttal-round seat voted RATIFY explicitly — recorded, insight-019 handling). `seniorBonusFor`
   now prices the bonus ONLY in calendar years [effectiveFrom .. sunsetAfter] = [2025 .. 2028],
   consumed from the constant's own metadata behind a fail-loud guard, symmetric shape pins on both
   ends; the calendar (`startCalendarYear + t`) threads `deductionStack`/`ordinaryIncomeTax`/
   `ordinaryPlusCapitalGainsTax`/`CommittedYearIncome`/`GrossUpContext` + the healthSheetChrome
   shadow-rate anchor (the same `yearsIn` clock as its count65). DND-012 batteries: statutory edges
   both ends, the gain-shelter channel (the runtime primitive, leftoverDeduction > 0), the
   full-solver gross-up step at exactly 2029, the bracket-fill ceiling→ledger crossing, PBT arms
   spanning 2023–2036, the readout 12¢→22¢ crossing. The tripwire is RETIRED in the unit's commit.
   Architecture §7.1/§8 updated; the staleness header now records the shipped-engine world (the
   crossing is still not drift — byte-identical recompute).
2. **`anyStale` split into TWO predicates.** The hero's standing "Some rules changed since your save —
   this answer uses today's" echo rides `rulesMoved` (rulebook drift = the recompute genuinely
   differs); the budget window re-confirms raise `anyStale` for the GATE only (calendar prompts over a
   byte-identical recompute — "worth a look", never "rules changed").
3. **The date-surface contribution clock is ROUTE-GATED** (quiet for an all-retired household — the
   accumulation overlay is the only consumer of contribution limits, and the annual table bump would
   otherwise falsely stale every returning retiree), and the blend clock speaks route-true copy on the
   spine (`stalenessBlendSpine` — never "your date" to a household with no date).
4. **The whole clock subsystem is LOCAL-calendar-based.** `currentEpochDay()` mints the household's
   local calendar day (was UTC): `startCalendarYear` is local-minted, so a UTC wall year expired
   budget windows a few hours early every Dec 31. Result.tsx's date anchor reads the same chain.
5. **The floor line anchors like the hero** (`floorLineText` takes the same `dateAnchor`;
   `dateFloorCoveredAnchored`/`dateFloorCoveredPast` slots) — one screen, one time base.
6. **The v1 disclosure seats are RATIFIED SUFFICIENT** (review judgment J2): the gate's per-clock
   lines + the one-line hero echo; the plan-L290 per-sheet vintage notes stay un-built (the sheets
   re-derive under live constants — a per-sheet "computed with [year]" would duplicate the gate's
   disclosure without adding a decision the user can take there). The elapsed line's whole-year floor
   (J5) stands as built.
