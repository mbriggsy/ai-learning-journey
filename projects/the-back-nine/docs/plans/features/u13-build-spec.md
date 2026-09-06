---
title: "U13 build spec — the council-ratified corrected package (2026-07-09, wf_a1ef7e25-64d, 9/10)"
doc-type: build-spec
status: shipped
---

# U13 build spec — the council-ratified corrected package (2026-07-09, wf_a1ef7e25-64d, 9/10)

> The as-built record of U13. It supersedes the U13 plan section (`3-controls.md`, *Unit 13 —
> Returning-user re-entry + per-surface staleness*) wherever they conflict — each supersession is dated
> and grounded in the council verdict (`docs/council-log.md` top row).
> The re-derive spine was not built here (it shipped in U8 — `IntakeApp.tsx` hydrate → recompute); U13 is the
> staleness layer + the ReEntry confirm + the stamps substrate. Per-unit status lives in the roadmap's
> You-Are-Here table (`docs/roadmap.md`), never here.

## The honesty spine (Q1 — governs everything below)

- **Byte-identical re-presentation is scoped to the NO-DRIFT case.** The persisted seed + unchanged constants
  reproduce the saved number exactly (CRN). When ANY relevant fixture moved since save, the surface presents
  the CURRENT-vintage recompute **WITH** (never after) a calm "assumptions updated since your save" staleness
  note. Never silently stale, never silently changed — the note IS the disclosure.
- REJECTED: an engine vintage-injection seam; persisting constant sets into vaults. Engine purity absolute:
  no `Date`/clock inside `src/engine` — wall-time enters as an injected epoch-day in store/ui layers.
- The U12 sticky baseline re-seats from the re-derived value automatically (`commit()` seats
  `resolveStickyDisplay(null, …)` → raw). Under drift it re-seats to the current-vintage number; the
  staleness note discloses that. The plan's "sticky against the exact number the user last saw" claim
  (its re-derive-at-unlock bullet) holds in the no-drift case only (dated supersession).

## Phase A — the persisted substrate (stamps + producers)

All additive-within-v3 (NO schemaVersion bump — the plan's original "single schemaVersion bump" language was
retired by the U10/U11 supersession precedent; the next real bump is U17's). Every new field landed in ONE
atomic change with: `ScenarioV3` type + `SCENARIO_V3_FIELDS` + `checkV3Fields` + the draft shape +
`DRAFT_DISPOSITIONS` entry (R7 compile gate) + codec tolerant-reader + planted-fail codec arms (burned/063).

1. **`savedAt?: number`** (model.ts:1759) — finite integer **epoch-day**, encrypted in the model. The unit is
   the household's **LOCAL** calendar day, not UTC: `currentEpochDay()` (scenarioFromDraft.ts:62) mints it
   local because the persisted `startCalendarYear` is local-minted, and a UTC day expired budget windows a
   few hours early every Dec 31 for any household behind UTC (the ultramode review's basis-mismatch catch,
   2026-07-09 — a dated correction of this spec's original UTC unit; Result.tsx's date anchor reads the same
   chain, so one screen carries one time base).
   - Codec RANGE gate (`SAVED_AT_EPOCH_DAY_MIN`/`MAX`, scenarioCodec.ts:807-815): outside the epoch-day
     window it rejects as corrupt, because an epoch-MILLISECOND value is a finite integer that silently
     reads as year ~55000 (insight-046 class — an in-range garbage value is worse than a reject; mere
     finiteness is not enough). DND-009. `savedRecommendation`'s `mintedAt` carries the same gate.
   - Stamped by `scenarioFromDraft` at the **atomic save-commit**, from the ui layer's clock.
   - **THE NORMALIZER (the clerk's determinism catch):** `scenarioFromDraft`'s output is BOTH the disk
     payload AND the dirty/clean compare operand — a fresh `savedAt` per call would make every session
     permanently dirty. ONE shared normalizer, `scenarioIdentity` (model.ts:2148), strips ONLY `savedAt`;
     the dirty compare goes through its key-order-insensitive serialization `scenarioIdentityKey`
     (model.ts:2185) so key order and absent-vs-undefined cannot read as a change. Both consumers — the
     unsaved-buffer dirty compare and the draft↔scenario round-trip guard — import it; neither
     re-implements it.
   - **Absent `savedAt`** (every vault saved before U13): the "~N years since your save" claim is
     SUPPRESSED — never fabricated from `startCalendarYear`, never defaulted to "today".
2. **`taxVintageDetail?: TaxVintageV3`** — atomic object minted by **`taxVintageStamp()`** (tax.ts:379),
   the `healthcareVintageStamp` mirror. Keyed on `TAX_YEAR` + the legal basis string. The legacy opaque
   `taxVintage: string` stayed untouched (add-only).
   - Neither the RMD-age rule nor the senior-bonus sunset is stamped, and **neither got a clock** — the
     ratified plan's "derived read-time note" for both was withdrawn during the build. The RMD banded table
     (`rmdStartAge`, tax.ts:151 — the figures live there, never re-typed here) is birth-year-cohort-keyed
     and STATIC, so a re-derivation under any wall-clock prices the identical rule; a change to the RULE
     arrives as a new `legalBasis`/`taxYear` and fires the tax clock instead. The senior-bonus ruling is the ultramode review's, recorded below.
3. **`dateVintage?: DateVintageV3`** — `{ contributionYear, blendSnapshotAsOf }`, minted by
   `dateVintageStamp()` in `src/engine/constants/index.ts` (assembled there because its two figures span
   modules).
   - `contributionYear` from the existing `CONTRIBUTION_YEAR` (contributions.ts:28).
   - `blendSnapshotAsOf` is the aggregate export `BLEND_SNAPSHOT_AS_OF` (tickerBlend.ts:1573) — one MAX
     per-row `asOf` over the whole ticker table. It lives under the blend single-source gate, NOT under
     `CONSTANTS_VINTAGE`. That the stamp is one MAX across all rows is why no per-row attribution exists,
     which is what later routed this clock to the nameless aggregate (Phase B).
4. **`CURRENT_APP_DEFAULT_VERSION`** — the canonical constant (value `'p2-d1'`), single home in
   `src/shared/appDefaults.ts` (leaf — importable by store + ui), replacing the bare literal that lived in
   memoryModel's default draft. It ships compile-tied to the era map beside it, so a version cannot be
   stamped without a comparator entry.
5. **`scenarioFromDraft` re-stamps ALL vintages fresh at every save** — taxVintageDetail, healthcareVintage
   (already did), dateVintage, appDefaultVersion, savedAt. Insight-058: N writers of a reconciliation
   invariant; the save path is the ONE stamp writer.

## Phase B — the staleness reader (`src/store/staleness.ts`, pure)

- **Input** (`deriveStaleness`, staleness.ts:399-403): the RAW-decoded `ScenarioV3` captured **ONCE at
  unlock** (red-team constraint (a) — BEFORE `draftFromScenario`/`scenarioFromDraft` normalize or re-stamp;
  reading the post-resave draft cries wolf, reading the normalized persist never fires), an injected
  `todayEpochDay`, and — added by the U17 §S4 exposure gate below — a `StalenessExposure` read of what the
  household's own run actually priced (`exposureForDraft`, `src/ui/stalenessExposure.ts:146`). The
  current-build stamps are the comparators the module imports. Pure function — no clock reads inside.
- **Output — `StalenessReport`, the per-surface clock map (U17-inheritable, 4-recommendation #8b):**
  - `elapsed: { days, saveYear } | null` and `wallYear` sit at the TOP level, not inside a surface: the
    elapsed anchor is one fact the whole report shares (`null` = no `savedAt`, every "since your save"
    claim suppressed; days clamp at 0 so clock skew never yields a negative claim), and `wallYear` is the
    local calendar year the budget windows compare against.
  - `spine`: `{ appDefaultMoved }` — via the **SAVED-ERA map** (Q7 REBUILT): the add-only
    `version → defaults` map in `src/shared/appDefaults.ts`, keyed on the persisted `appDefaultVersion`
    (v1 seed: `'p2-d1' → { survivorSpendingRatio: 0.75 }`). A household is immune iff its persisted value
    differs from its SAVED era's default (they overrode), NEVER iff it differs from the CURRENT default
    (that inversion silently withholds the note from the took-the-default household — struck by the
    council). An unknown saved era is not-comparable and stays quiet. Vacuously inert in v1 (only p2-d1
    exists); the SHAPE is the deliverable.
  - `controls`: `{ taxMoved, stateTaxMoved }` — `taxVintageDetail` vs `taxVintageStamp()`, and (added by
    the later state-tax unit) the household's OWN priced state's serialized profile vs
    `stateTaxVintageStamp()`, so an NC rate step never alarms a PA or FL vault. Both are EXPOSURE-GATED
    (below): `taxMoved` on `exposure.overlayBuilt` — a $0-account, SS-only household takes `buildOverlay`'s
    degenerate early return and never reads the tax family — and `stateTaxMoved` on the state the run
    priced. Absent stamp = not-applicable. No RMD or senior-bonus note ships here (Phase A item 2).
  - `healthcare`: `{ moved, movedClocks[], acaMoved, medicareMoved, silencedClocks[] }` — saved
    `healthcareVintage` vs `healthcareVintageStamp()`. The applicable-% clock rides the DOCUMENTED proxy
    (coverageYear + acaStatus; the `reVerifyEveryBuild` CI gate is the real mid-year detector — Q4, no new
    field). `acaVerifiedOn` is deliberately EXCLUDED from the moved-compare: a re-verify that confirms the
    SAME law is provenance, not drift, and firing on it would stale every vault monthly.
  - `unattributed: { moved, clocks[] }` — the bucket the U17 §S4 exposure gate added (below): a reference
    table the app reads was re-dated, but no run-layer read can say whether THIS household's answer moved.
  - `date`: `{ contributionMoved, blendMoved }` — `contributionMoved` is TWICE-gated (the route gate
    `!allRetired` protects the WORDING, `exposure.contributions` the CLAIM: the date route's forced
    accumulation construct carries the BASE overlay's streams, which are empty for a household whose
    accounts all belong to the retired spouse), and `blendMoved` names no line on either route. Plus the
    decay rule: the relative "~N years out" framing re-derives from wall-time; a sufficiently old save
    routes to recompute framing, never re-presents as current. NEVER write back into
    `startCalendarYear`/`currentAge` (round-trip guard).
  - `budget`: `{ expiredLines[] }` — **spine route only** (Q6): a line is past its window iff
    `(wallYear − startCalendarYear) > endYear`. The date route is documented-inert (its year-0 anchors to
    the FUTURE crowned work-stop; nothing can be past by pure time passage). A dated supersession of the
    plan's originally route-agnostic budget wording, which the plan now carries as built.
  - `rulesMoved` and `anyStale` — TWO predicates, not one (the ultramode review's hero-echo catch).
    `rulesMoved` means the CURRENT recompute genuinely differs from the saved answer, and is the ONLY
    predicate the hero's standing echo may ride and the only one `savedRecommendation.ts`'s conjunct 3 may
    demote on. `anyStale` is anything worth a line at the gate, and ALSO includes the budget window
    re-confirms — calendar-passage prompts over a byte-identical recompute ("worth a look", never "rules
    changed"). Collapsing them made a lapsed travel budget fire a false "rules changed" claim on the
    magic-moment surface.
- **The EXPOSURE GATE (U17 §S4, 2026-07-25 — the later correction that reshaped this map).** A bare vintage
  compare answers "did the TABLE move?", never "did THIS household's answer move?". The shipped defect: one
  healthcare line rode the OR-collapse of all seven healthcare clocks, so an all-65+ household — which takes
  `buildOverlay`'s Medicare-only branch, ships no `enrolledPremium`, and can therefore never open the
  engine's ACA gate — was told health-coverage rules had been updated on a moved `acaStatus` stamp. Every
  clock now lands in exactly ONE of three buckets: FIRED AND EXPOSED (names itself, counts toward
  `rulesMoved`); FIRED, NOT EXPOSED (silent — the recompute is byte-identical, so both "rules changed" and
  "worth a look" are false); FIRED, UNATTRIBUTABLE (the nameless `unattributed` aggregate, counting toward
  `anyStale` only). The full contract lives in `staleness.ts`'s header and
  `docs/plans/features/act4-u17-saved-recommendation-build-spec.md`.
- **Absent stamp = not-applicable** (the plan's absent-stamp default) — never "infinitely stale", no false
  stale on legacy vaults.
- **A named blind spot:** an ENGINE-DOMAIN change has no clock. These clocks diff CONSTANT vintages, never
  whether the app itself started pricing something it previously didn't (the Medicare pricing unit's
  ultramode review, 2026-07-10, voted real-but-immaterial: the installed base is ~zero and the drift
  direction is conservative). The sanctioned mechanism once a real installed base exists is a new
  `appDefaults.ts` era entry, not a new clock.
- Battery (`src/store/__tests__/staleness.test.ts`): hand-derived fixtures per clock + planted-fail arms
  both directions (fires-when-moved, silent-when-identical) + the absent-stamp/legacy-vault arms + a
  property sweep over the map — a freshly-stamped save fires NO clock on any route, because every
  comparator diffs write-time truth against the same build. Copy composition is proven separately, from
  real seeds through real copy, in `reentry.test.tsx`.

## Phase C — the ReEntry surface + wiring

- **Mount:** the `'reentry'` IntakeApp phase between `'restoring'` and `'result'` (inside the
  draft/persist/resave machinery the confirm's writes need), armed off the unlock entry's `hydrate` flag.
  **The confirm GATES the reveal** (red-team (b)): the hydrate IIFE is split so the balance confirm resolves
  BEFORE `setPhase('result')`/recompute — the verdict never renders on unconfirmed balances and then asks
  (the bait-and-switch).
- **The balance-drift confirm:** UNCONDITIONAL on every writable unlock (drift is undetectable by design —
  nothing to diff). Per-bucket read-back incl. HSA + the SS fold-in ("are these still your benefit
  amounts?"), affirm-first. A PROMPT, never an attestation (red-team (c)): no stored/displayed
  "confirmed-fresh on DATE".
  - The gate offers ONE update route, not a split/total fork: "Something's changed — update them" sets the
    intake phase, so accounts are edited where they were entered (the U12 panel's "Edit in the walk-through"
    precedent; no new mini-intake surface, and the hydrated draft preserves every prior answer). The U12
    sharpen loop stays reachable after the verdict, as it always was — routing a changed TOTAL there from
    the gate would have split one question across two surfaces.
  - The intro line is ROUTE-TRUE: `reentryIntroRetired` swaps "paychecks" for "benefit checks" at a
    household with none (Caddie card #1, pilot-cleared with a fix 2026-07-10).
  - Read-only second-tab unlock (`session.writable()===false`, resultSave.ts forces `kind:'none'`):
    view-only presentation, NO write affordance; the ViewOnlyBanner stays the authority.
- **The staleness notes:** the per-clock disclosure renders at the GATE, not on the verdict — one
  `noteLines` paragraph per fired clock, composed by `reentryChrome.ts` off the report. The hero carries
  only the one-line standing echo (`stalenessHeroNote`). Copy in `copy.ts` (copyGuard), calm-not-alarming —
  the Act-3 exit-condition cold-read (Briggsy's N=1). The echo was reworded 2026-07-10 by the Caddie
  false-PASS hunter: its old "this answer uses today's" tail was the reassuring half alone, reading in-frame
  as whole-answer currency while the balances-are-your-save-vintage truth sat below the fold, so the line
  now carries both standing epistemic facts and the "what changed" alarm stays at the gate. It is
  deliberately ONE line — a two-line echo pushed the protected R13 disclaimer below the one-frame fold at
  1536×791 (measured live, 2026-07-09).
- **The date answer's calendar label** (`startCalendarYear + Y`) shipped INSIDE the hero and floor lead
  slots (`dateInYearsAnchored` / `dateFloorCoveredAnchored` and their now/past siblings), not as a separate
  render: the wall-time-anchored relative clause and the stable calendar year are one sentence, so they
  cannot drift apart. `FuckOffDate` takes a `dateAnchor` and the floor line takes the SAME anchor — one
  screen, one time base (a dated supersession of the plan's per-element framing). Tabular-nums in
  `fuckOffDate.css`.
- **The survivor door assert shipped as a composition arm, not an e2e walk** (J1): `App.test.tsx` pins the
  one link — unlock → forgot → `RecoveryFlow.onRecovered` lands in IntakeApp with `hydrate: true` and
  writable, which is what arms this gate for the wiped-device survivor. The flows themselves shipped in U8
  and carry their own suites; an e2e re-walk would have re-tested them, not the composition.
- **Render floors:** CSS-only `@starting-style` on `.save-step` (NEVER framer-motion layout — the style-src
  trap); under `prefers-reduced-motion: reduce` the translate drops to `transform: none` on both the
  settled rule and the `@starting-style` block, leaving a fast opacity fade — the entry is decoration
  only, so every note is in the final DOM with motion off. Focus-to-heading `tabindex=-1` on the gate's
  `h2`. There is NO live region here and NO status glyph: the intake focus law makes the heading itself the
  announcement, and every staleness note ships as plain body text, so never-color-alone holds by
  construction rather than by a silhouette. The read-back figures are `tabular-nums` so the column cannot
  jitter.
- Live verify: `verify:fit` gained the writable vault-return arm (`e2e/vertical-fit.spec.ts`, the
  `?vault=stale` plant at 1536×791/2.5 DPR) — the gate's decision pair in-frame, its fired-clock lines
  asserted by name so the frame is not vacuous, then the echoed result frame under the one-frame law
  (frame-mutant proven). The survivor door is proven at the composition level (`App.test.tsx:139`), not as
  an e2e walk — but the read-only second tab IS one: `e2e/vault.spec.ts:84` drives two genuinely separate
  Playwright tabs over real cross-tab BroadcastChannel and shared-origin IndexedDB, asserting `readOnly`
  and `saveRefused` (`e2e/vault.spec.ts:96-97`). The RECOVERY credential is walked too, inside the trust
  loop at `e2e/vault.spec.ts:62` (`e2e/vaultHarness.ts:94-96`, asserted at `e2e/vault.spec.ts:79`); what is
  genuinely un-walked in `e2e/` is the RecoveryFlow **UI** surface, not the mechanism. The gate's live arm
  count is the roadmap's, never re-typed here.

## Struck / already done

- ~~ACA verifiedOn sync~~ — landed pre-council (62ebe5fa + 6a94faf0, CI green).
- ~~roadmap.md:26 stale prose~~ — landed (62ebe5fa).

## Q2 dissent (preserved)

Minimalist: drop `savedAt`, anchor every wall-clock on `startCalendarYear`. Rebutted 7-elder:
startCalendarYear = "since you BUILT the plan" (mislabels every re-saver); only an in-ciphertext savedAt
survives export-restore for the wiped-device survivor. Flips only if re-save frequency proves ~zero AND
export-restore is ruled out of wall-clock scope.

## The U13 ultramode review — the rulings (2026-07-09, wf_44cdf86d-b71; 13 lenses, 44 agents, per-finding refuters)

*The review's mechanical outcomes are folded into Phases A–C above. What is kept here is the reasoning a
future builder would otherwise re-derive.*

1. **The senior-bonus sunset clock was REMOVED, and the refuted premise is why.** The ratified plan called
   for a derived read-time note on the ground that the sunset was "already deterministic inside the engine
   given birthYear + startCalendarYear." That premise was refuted against source: `seniorBonusFor` took
   only (filing, count65, magi), and NOTHING in the tax math read `seniorBonus.sunsetAfter` — the engine
   credited the 2025–2028-only bonus in EVERY sim year. So the note ("this reading prices the years as they
   stand now") asserted a re-pricing the recompute never performed — calm-but-wrong, OPTIMISTIC-masking,
   4-lens convergence. And under a CORRECTED engine the crossing is still not drift (the save already
   priced the calendar-deterministic sunset — recompute byte-identical), so the note had no honest content
   in either world. **Do not re-file it.** The engine gap was filed REQUIRED, build-tripwired, and
   **CLOSED the same day** — council-ratified 8/10 (wf_a5ccd576-048, no veto; the honesty hawk's opening
   seat crashed on a schema mismatch and its rebuttal-round seat voted RATIFY explicitly — recorded,
   insight-019 handling). `seniorBonusFor` (taxCore.ts:81) now prices the bonus ONLY in calendar years
   [effectiveFrom .. sunsetAfter] = [2025 .. 2028], read from the constant's own metadata behind a
   fail-loud non-integer guard, symmetric shape pins on both ends; the calendar (`startCalendarYear + t`)
   threads `deductionStack`/`ordinaryIncomeTax`/`ordinaryPlusCapitalGainsTax`/`CommittedYearIncome`/
   `GrossUpContext` + the healthSheetChrome shadow-rate anchor (the same `yearsIn` clock as its count65).
   DND-012 batteries: statutory edges both ends, the gain-shelter channel (the runtime primitive,
   leftoverDeduction > 0), the full-solver gross-up step at exactly 2029, the bracket-fill ceiling→ledger
   crossing, PBT arms spanning 2023–2036, the readout 12¢→22¢ crossing. The tripwire was retired in the
   unit's own commit. Architecture §7.1/§8 carry the shipped contract.
2. **The date-surface contribution clock is ROUTE-GATED quiet for an all-retired household.** Contribution
   limits enter the engine only through the accumulation overlay, so a decumulation-only household's answer
   is byte-identical under any `CONTRIBUTION_YEAR`, and the annual table bump would otherwise falsely stale
   essentially every returning retiree. The review also gave the blend clock a route-true spine line
   (`stalenessBlendSpine`, so a household with no date never heard "your date"); **that line is gone** —
   U17 §S4 (2026-07-25) moved the blend clock out of the named lines entirely, because
   `BLEND_SNAPSHOT_AS_OF` is one MAX date over the whole ticker table and fires for a household holding
   none of the re-dated funds. The blend clock now speaks only through the nameless aggregate, on both
   routes. The Caddie card #2 fix that purged the word "snapshots" from user copy stands.
3. **The v1 disclosure seats are RATIFIED SUFFICIENT** (review judgment J2): the gate's per-clock lines +
   the one-line hero echo. The plan's per-sheet vintage notes stay un-built — no "computed with [year]"
   string exists in `copy.ts` — because the sheets re-derive under live constants, so such a note would
   duplicate the gate's disclosure without adding a decision the user can take there. The elapsed line's whole-year floor (J5) stands as built.
