---
title: One-Frame Composites - Plan
type: fix
date: 2026-11-20
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# One-Frame Composites - Plan

**Target:** `projects/the-back-nine`. Every path below is relative to it unless it starts with `.github/`.

---

## Goal Capsule

- **Objective:** on Briggsy's laptop window (1440×731 CSS px at DPR 2), the tallest real households the app can hold show the verdict, its disclosures, the band and the "this can be wrong" caveat without a scroll, on Windows and on CI's Linux. The fit gate keeps measuring those same frames on any date, instead of going red by itself on 2027-01-01.
- **Means:** an explicit calendar for the gate (KTD1, KTD2), plants built only through the app's real producers (KTD3, KTD4, KTD5), record-only Linux probes before anything is asserted (KTD6), the ladder's rungs only on the frames that need them (KTD7), then the assertions (KTD8).
- **Authority:** the project's laws (`CLAUDE.md`, and the short tier's law in `--bp-laptop-short`'s docblock in `src/ui/styles/tokens.css`) outrank this plan. Requirements outrank KTDs on behavior, KTDs outrank units on mechanism. Where this plan cites the precedent plan (`docs/plans/features/viewport-1440x731-repoint-build-spec.md`), the cited rule binds.
- **Stop conditions:**
  - pinning the clock changes any number an existing arm prints today (U1): stop and diagnose before U2;
  - a plant's engine-acceptance pin or cause-list proof fails (U2, U3): stop, never loosen the proof;
  - a caveat frame is still outside 731 px on either platform after rung 3 (U5): stop and call a council, never a tolerance, a word cut or a new type size.
- **Execution profile:** commits on `main`, one unit per commit, in order. U4 and each rung in U5 are pushed alone, because their CI log is the evidence. The record card's seat is not this plan's: a council, then Briggsy's ruling (Open Questions).

---

## Product Contract

### Summary

Pin the page clock in every fit harness so the gate's frames stop depending on the date. Add the tallest measured real households as committed plants, built the way the app would really hold them. Read their bottoms on CI's Linux before asserting anything. Step the ladder's rungs only on the frames that still fail, then assert every new plant. The record-bearing plants assert their caveat. Their standing line is printed until the record card's seat is ruled.

### Problem Frame

The one-frame law is enforced only on the plants the gate renders, and every priced or record-bearing plant carries entered Medicare extras. A household that answers "not sure" funds the typical figure, whose residual runs two lines longer, so the tallest real frames were never planted. Measured at 1440×731 @ 2 on Windows (the register's Tier 0 *The tallest real composites break the one-frame law at his 1440×731 window…*, and the Appendix):

- A Pennsylvania household at its yearly return puts the R13 caveat at 737.3 px, and an off-track one at 744.3. That is "On the line" with "this can be wrong" below the fold, the calm-but-wrong sin.
- Every saved recommendation over typical extras, and the entered-extras household at its yearly return, puts the record card's standing line past 731 (736.9 to 799.3).

A second problem surfaced while planning. The gate reads the wall clock (the register's Tier 0 *The fit gate reads the wall clock…*). Every seed hardcodes `startCalendarYear: 2026`, so on 2027-01-01 every plant renders as a plan built last year. `?vault=rec` and `recold` then move their standing line from 707 to 754.5 px, and CI goes red with no code change (measured under a pinned page clock). The same frame is every real 2026 saver's return. So the gate's catalog expires in six weeks unless its calendar is made explicit, and that is this plan's foundation.

### Requirements

**The gate's calendar**

- R1. Every fit-harness arm renders the same frame on any day it runs. A frame aged a year exists only as an explicit plant.
- R2. When the gate's day must move into a later calendar year, a unit test goes red and names the seeds' build-year roll as the job.

**The plants**

- R3. The gate carries the tallest measured real frames as committed plants: Pennsylvania with "not sure" extras, fresh and at its yearly return; an off-track household with "not sure" extras at its yearly return; the entered-extras household at its yearly return with a saved record (his likeliest return); and Pennsylvania "not sure" with a saved record, fresh and at its yearly return.
- R4. Every plant is a household the app could really hold: the answers the intake writes, a save date the calendar allows, and a record minted through the real mint under the rulebooks of its save. Each is proven by an engine-acceptance pin, and each record by its exact cause list.

**Measurement and the law**

- R5. Before any rung or assertion lands, each new plant's bottoms are read on CI's Linux at the target, beside Windows.
- R6. Every caveat-class plant holds the one-frame law on both platforms. It gets there only through the ladder's rungs in order, each applied only to the frames that need it.
- R7. Every record-bearing plant asserts its caveat inside the frame, its card below the caveat, and its card's cause count. Its standing line is printed until the record card's seat is ruled.

### Scope Boundaries

- Not in this plan: the record card's seat (the register entry's prescription (4)). A council sits, then Briggsy rules on his 2026-07-26 placement. The record plants this plan adds are its evidence.
- Considered and not built:
  - seeds whose start year follows the wall year. Shifting `birthYear` alongside moves the Social Security and required-withdrawal birth-year bands on `retired`, the documented knife-edge seed, so every outcome pin would move each New Year. Evidence that would reopen it: a ruling that the gate must see the live year.
  - a `?clock=` URL parameter for viewing a yearly-return plant by hand. Viewed by hand before 2027, the plant floors to a same-year save under older rules, which is still an honest household (KTD3). Reopen it if a Caddie walk needs the yearly-return face before New Year.
  - a chosen margin or tolerance on any bottom (insight 065, and the precedent plan's KTD15).

### Deferred to Follow-Up Work

- The Caddie capture harness's clock (`e2e/caddie-walk.spec.ts`). Walk 10 runs before New Year. A walk after it needs the same pin, filed in U7.
- The unit suite's own wall-clock reads on 2027-01-01, unmeasured. The `annualRoll` tripwire reds the suite that day by design, and nothing else is known. Filed in U7.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Every fit-harness arm pins its page clock before it navigates, and every node-side date read in those specs reads the same pinned day.**
  - **The days.** The fresh day, `GATE_DAY`, is `FIRST_UNAMBIGUOUS_SAVE_DAY` (`src/engine/pricingVersion.ts:243`). It is read from the source, never typed. `e2e/` already imports from `../src/`, and the plants already save on that day (`runPlantDevVault`'s clamp in `src/ui/devSeeds.ts`). The yearly-return day, `RETURN_DAY`, is the same calendar date one year later. A fixed day count could cross two year boundaries when the gate day falls late in a year.
  - **The pin.** Playwright's `page.clock.setFixedTime` at UTC noon of the day. The fit config sets no `timezoneId`, so Windows reads Eastern time and CI reads UTC; UTC noon is the same calendar day in both, where a midnight pin reads as the day before on Windows. It fixes `Date` and leaves timers and animation frames running (measured 2026-11-20: every frame settled under it). Each arm reads the page's day back and asserts it is the pinned day.
  - **The mechanism.** An auto fixture in `e2e/reviewSurface.ts` that every listed spec takes its `test` from, plus one guard arm that reds when a listed spec imports `test` straight from `@playwright/test`. Without the guard, a future spec would read the wall clock and nobody would notice until a New Year.
  - **Node-side reads.** Each date the specs compute in Node reads the shared pinned day, never `new Date()`: the stale arm's ledger oracle (`e2e/vertical-fit.spec.ts:2250`) and `recold`'s "Saved in" check (`e2e/vertical-fit.spec.ts:4141`).
  - **Coverage.** `e2e/vertical-fit.spec.ts`, `e2e/chart-text.spec.ts`, `e2e/intake-fold.spec.ts` and `e2e/chart-text-rv.spec.ts`: every CI-gated harness that renders a seed or a plant. Chart-text and the recommendation chart read the plan clock too. Not `e2e/csp.spec.ts`, which asserts no layout.

  Rejected alternative: seeds that follow the wall year (Scope Boundaries).
- KTD2. **The seeds' build year is one constant, bound to the gate's day.** The ten `startCalendarYear: 2026` literals in `src/ui/devSeeds.ts` read one exported `SEED_BUILD_YEAR`. A unit test asserts that `FIRST_UNAMBIGUOUS_SAVE_DAY`'s calendar year equals it (R2), and that `RETURN_DAY`'s year is exactly one later. The day an engine-pricing ledger row ships in a later year, that test reds. Rolling the seeds' year is then a named job, never a date bump. Its known surface: the outcome pins, every seed's birth years (they must move with the start year to keep the same people), and the year literals in `e2e/vertical-fit.spec.ts` (`:1312`, `:2613-2850`). The test's failure message names that surface.
- KTD3. **A yearly return is a plant viewed a calendar year after its save. The doctor never moves the start year.** `doctorYearlyReturn(s, today)`:
  - keeps the seed's start year and every answer;
  - sets `savedAt` to `max(today − YEARLY_RETURN_GAP_DAYS, FIRST_UNAMBIGUOUS_SAVE_DAY)`, the `statestale` floor, so no engine-pricing method line speaks;
  - ages two stamps one step by year arithmetic: `taxVintageDetail.taxYear` − 1, keeping its `legalBasis`, and `healthcareVintage`'s `coverageYear` − 1 and `partBStandardMonthly` − 10. That is the `doctorStaleVault` idiom without its extras strip, its basis rewrite and its start-year move. It touches no other stamp, so the gate speaks exactly two staleness notes, derived in a unit arm.

  The gap lives only inside the doctor: 400 days, `RECORD_AGED_DAYS`' rationale (365 stays inside one year on a leap year's 31 December). At `RETURN_DAY` the floor binds, so the save lands on `GATE_DAY` itself. Viewed at `RETURN_DAY`, the gate renders a plan built in 2026, saved in 2026 and seen in 2027: the aged band, the aged-balances clause and the staleness echo. That works for Pennsylvania, whose start year 2026 meets its first rate row, and it is what the temporary plants measured (Appendix). Viewed by hand at today's real date, the floor makes it a same-year save under older rules, still a real household.
- KTD4. **A record on a yearly return is minted under the rulebooks of its save.** `withMintedRecord` mints it on the doctored save day at this build's solver version. Its `era` is then set to the aged scenario's own five stamps, the record a build of that day would have minted (the `eraOf(s)` idiom, `src/store/__tests__/savedRecommendation.test.ts:44`). The doctor proves at plant time that `deriveSavedRecommendationStatus` yields exactly `['rules-changed']`, and it throws otherwise. `doctorRecordSuperseded`'s docblock, which says no hand should touch the era, is reworded in the same commit to name this one honest exception.
- KTD5. **"Not sure" is the answer the intake writes.** That is `{ kind: 'typical', adoptionVintage: medicareExtrasTypical.value.vintage }` per person (`src/intake/questions.tsx:890`), never a stripped field. A stripped field is a pre-extras save, and it adds a re-confirm line on the gate. Two new seeds carry it: `patypical` (Pennsylvania) and `failingtypical` (the off-track household). Each is a spread of its base that sets only `medicareExtrasByPerson`.
- KTD6. **Linux is read before anything is asserted.** This is the precedent's KTD8 shape. A record-only describe at 1440×731 @ 2 drives each new plant at its own day and asserts the laptop tier and the short tier. Per plant it prints one line: `[fit probe] <plant>: clock=<YYYY-MM-DD> attempt=<n> caveat bottom=<px> left end=<px> band end=<px>`, plus ` standing bottom=<px> causes=<n>` on a record plant. The clock is the page's day read back. The attempt is Playwright's retry index, so a retried arm's two lines tell themselves apart. The lines are read from CI's verify log by tag, final attempt only. Attempts that disagree are unknown, and an unknown fails the frame.
- KTD7. **Rungs are for the caveat frames only, scoped to the frames that carry the staleness echo.** They follow the precedent's U3 order:
  - rung 2a, the survivor statements' leading → tight, as `.confidence-reveal[data-twopane]:has(.cs-staleness-note)` inside `survivor.css`'s short-tier block;
  - rung 2b, `.cs-staleness-note`'s leading → snug, written at the specificity the precedent names;
  - rung 3, the survivor context and its step-down → `--text-sm`, on frames carrying the echo and either the Medicare pair or the state note (the precedent's U3 scope).

  Echo-scoping departs from the precedent, which planned rung 2a tier-wide but never landed it: frames that fit keep the look he has seen. Each rung is pinned on both sides of the tier, the tall side by resizing an echo frame to SHOWCASE (the W5 precedent). Each is followed by `pnpm build`, pushed alone and re-read. Stop at the first rung that holds on both platforms.
- KTD8. **What each plant asserts.** A caveat-class plant gets the full one-frame law in the `?vault=stale` arm's shape. A record plant gets its caveat inside the frame, its card below the caveat in pixels and in the DOM, and its card's cause count. Its standing line is printed, never asserted, until the seat is ruled. This is the 20 px arm's record-only precedent (`e2e/vertical-fit.spec.ts:1718-1731`), never `test.fail`.
- KTD9. **The pin changes no frame today.** After U1, every line the existing arms print (`[U17 record return]`, `[route fit]` and the others) reads the same as before U1, from one `verify:fit` run each side. Today's date (2026-11-20) and `GATE_DAY` (2026-10-22) share a year, and an undoctored plant saves on whatever day the page reads as today, so its frame is the same on both days. The one predicted exception is `?vault=datearrived`'s gate (U1's test scenarios).

### High-Level Technical Design

```mermaid
flowchart TB
  U1[U1 pin the gate's calendar] --> U2[U2 the two not-sure seeds]
  U2 --> U3[U3 the yearly-return doctor and the record plants]
  U3 --> U4[U4 the Linux probe, pushed alone, read on CI]
  U4 --> D{every caveat frame inside 731 on both platforms?}
  D -->|yes| U6[U6 the asserting arms]
  D -->|no| U5[U5 the next rung, pushed alone, re-read]
  U5 --> D
  U5 -->|rung 3 still fails| C[stop: council]
  U6 --> U7[U7 docs and the register]
```

The plant catalog. The Windows numbers come from the temporary plants, with stripped extras where the plant now carries "not sure" (Appendix). U4 re-measures each one.

| plant | base | doctor | day | class | Windows (caveat / standing) |
|---|---|---|---|---|---|
| `?seed=patypical` | `pa` + typical answers | none | `GATE_DAY` | caveat | 708.2 / — |
| `?vault=yearpa` | `patypical` | `doctorYearlyReturn` | `RETURN_DAY` | caveat | 737.3 / — |
| `?vault=yearfailing` | `failingtypical` | `doctorYearlyReturn` | `RETURN_DAY` | caveat | 744.3 / — |
| `?vault=yearrec` | `retired` (entered) | yearly return + record | `RETURN_DAY` | record | 692.4 / 754.5 |
| `?vault=recpa` | `patypical` | `doctorRecordHolds` | `GATE_DAY` | record | 707.4 / 769.4 |
| `?vault=yearparec` | `patypical` | yearly return + record | `RETURN_DAY` | record | 737.3 / 799.3 |

### Assumptions

- A1. The "not sure" answer renders the same result frame as the stripped field the temporary plants measured. On the gate it differs: there is no re-confirm line, and the extras-typical clock stays silent at a fresh vintage. U4's probe confirms or refutes the result frame.
- A2. The 754.5 band-binding frame is faithful. It was measured twice: once by the temporary start-year doctor, and once with no doctor at all, `?vault=rec` under a 2027-01-02 clock. The second needs no birth-year shift, and `yearrec` is that second form plus the aged stamps.
- A3. CI keeps writing test stdout into the verify job's log through the `DotReporter` that Playwright prepends (the precedent's A2). `playwright.fit.config.ts` never gains `list`.
- A4. The tighter leading and the borrowed register on echo frames read calm to his eye. Walk 10 is that check, and its targets gain the new plants (U7).

### Open Questions

- **The record card's seat. Blocking for the record plants' standing-line assertion only, and due before 2027-01-01.** Every measured record frame puts the standing line past 731, and the ladder is exhausted (Appendix). From New Year it is every real 2026 saver's frame, and the gate's own `rec`/`recold` arms are its witnesses. Recommended: the council sits on U4's Linux table, then Briggsy rules on his 2026-07-26 placement. The ruling's build adds the standing-line assertion to every record plant.

### Risks

| risk | mitigation |
|---|---|
| A wall-clock read on the page that the pin misses, for example inside a worker | KTD9's before-and-after comparison of every printed line; the engine reads no clock (lint-banned) |
| A rung changes frames beyond the echo frames | each rung's scope is a `:has()` on the echo; the HOLDS twin check and the existing arms' prints catch a leak |
| Linux wraps a frame a line taller than Windows | U4 reads Linux before any rung, and each rung is re-read on Linux (insight 075) |
| The record twin check sits at −1 against ±1 (`docs/landmines.md`) | no rung touches the save slot; any change to the slot re-measures the twin gap first |

---

## Implementation Units

### U1. Pin the gate's calendar

**Goal:** every fit-harness arm renders the same frame on any date (R1), and the seeds' build year is bound to the gate's day (R2).

**Requirements:** R1, R2 (KTD1, KTD2, KTD9).

**Dependencies:** none.

**Files:**
- `e2e/reviewSurface.ts`: `GATE_DAY`, `RETURN_DAY`, the auto fixture that pins the clock, and the Node-side pinned-day helper.
- `e2e/vertical-fit.spec.ts`, `e2e/chart-text.spec.ts`, `e2e/intake-fold.spec.ts`, `e2e/chart-text-rv.spec.ts`: each takes `test` from the fixture; `vertical-fit` also swaps its two Node-side date reads (`:2250`, `:4141`) for the helper.
- `scripts/__tests__/playwright-harness-partition.test.ts`: the import guard (it already reads every spec's collector).
- `src/ui/devSeeds.ts`: `SEED_BUILD_YEAR` replaces the ten literals.
- `src/ui/__tests__/devSeeds.test.ts`: the binding test.

**Approach:**
1. Before U1's code, run `pnpm verify:fit` alone and keep its printed lines. That is the "before" side of KTD9.
2. Add the days, the fixture and the helper to `e2e/reviewSurface.ts`, the harnesses' shared home (it already holds `REAL`), per KTD1. The fixture pins `GATE_DAY` by default. An arm that needs `RETURN_DAY` re-pins before its own navigation.
3. Point each listed spec's `test` import at the fixture, swap `vertical-fit`'s two Node-side date reads, and add the guard.
4. Replace the ten seed literals with `SEED_BUILD_YEAR`, and add the binding test (KTD2).
5. Re-run `pnpm verify:fit` and `pnpm verify:fit:rv` alone, and compare the printed lines with step 1's.

**Patterns to follow:** `REAL`/`REAL_DPR` in `e2e/reviewSurface.ts` (one home, every harness reads it); the `breakpoint-mirrors.test.ts` binding style for a constant two places share.

**Test scenarios:**
- The binding test passes today: `FIRST_UNAMBIGUOUS_SAVE_DAY` falls in 2026, which equals `SEED_BUILD_YEAR`, and `RETURN_DAY` falls in 2027.
- The binding test reds when `SEED_BUILD_YEAR` is set to 2025, a planted fault reverted by snapshot + `cmp`.
- The guard reds when one listed spec imports `test` from `@playwright/test` (a planted fault, reverted the same way).
- With the fixture's day moved to 2027-01-02, `?vault=rec`'s record arm reds at a standing line near 754.5. This planted fault proves the pin reaches the page; revert it the same way.
- Every arm's read-back day equals its pinned day, on Windows and on CI.
- Every line the existing arms print reads the same before and after U1 (KTD9). One delta is predicted and is the only allowed one: `?vault=datearrived`'s gate gains the newest ledger row's method line, because its doctor saves at today − 30 with no floor. No fit arm counts that gate's notes. If any printed line other than that one moves, stop (a stop condition).

**Verification:** the KTD9 comparison holds; `pnpm verify:fit` and `pnpm verify:fit:rv` are green; CI is green on U1's commit.

### U2. The two "not sure" seeds

**Goal:** Pennsylvania and the off-track household answer "not sure" on Medicare extras, the way the intake writes it (KTD5).

**Requirements:** R3, R4.

**Dependencies:** U1.

**Files:**
- `src/ui/devSeeds.ts`: `patypical` and `failingtypical` in `DEV_SEEDS`.
- `src/ui/__tests__/devSeeds.test.ts`
- `src/ui/__tests__/survivorSpendingBasisSeedGate.test.tsx`: two census rows, and its count of 16 becomes 18.
- Any other hand-listed seed census the full suite names when it reds.

**Approach:** each seed is a spread of its base that sets only `medicareExtrasByPerson`, one typical entry per person, with `adoptionVintage` read from the constant. Edit with the Edit tool: `devSeeds.ts` and its test are CRLF.

**Patterns to follow:** `paAffirmation`'s one-field spread; the census rows' hand derivation in `survivorSpendingBasisSeedGate.test.tsx`.

**Test scenarios:**
- Each seed is engine-accepted (the existing `DEV_SEEDS` sweep adds the arm by itself) and resolves a real `outcomeState`, pinned as found.
- Each seed's answers survive the codec's round trip with `kind: 'typical'` and the live vintage.
- Each seed's fresh save fires no staleness clock (the extras-typical clock is silent at the live vintage).

**Verification:** `pnpm test` green with the census counts moved; `pnpm typecheck` and `pnpm lint` 0.

### U3. The yearly-return doctor and the record plants

**Goal:** the five vault plants of the catalog, each a household the app could really hold (R3, R4).

**Requirements:** R3, R4 (KTD3, KTD4).

**Dependencies:** U2.

**Files:**
- `src/ui/devSeeds.ts`: `doctorYearlyReturn`, the yearly-return record doctor, the `AGED_PLANTS` entries `yearpa`, `yearfailing`, `yearrec`, `recpa` and `yearparec`, and the reworded docblock on `doctorRecordSuperseded`.
- `src/ui/__tests__/devSeeds.test.ts`: the U10 sweep's hand list of `AGED_PLANTS` keys, the engine-acceptance pins, and the record-status arms. Its `plant()` helper gains a base parameter.

**Approach:**
1. `doctorYearlyReturn` per KTD3. It fails loud on a base with no healthcare stamp to age, never a silent no-op.
2. The record doctor composes it with a mint per KTD4, and throws unless the status is exactly `['rules-changed']`.
3. `recpa` is `doctorRecordHolds` over `patypical`: no doctoring beyond the existing one.
4. Every doctor is exported and docblocked with what it moves, why, and the face it shows at `RETURN_DAY` and by hand at today's date.

**Patterns to follow:** `doctorStateStaleVault` (the floored `savedAt`), `doctorStaleVault` (stamp ageing by year arithmetic), `doctorRecordSuperseded` (prove the cause, never a silent one), `statestale`'s engine-acceptance arm (`devSeeds.test.ts`).

**Test scenarios:** unit tests call each doctor with `today = RETURN_DAY` (or `GATE_DAY` for `recpa`) passed in, never the wall clock.
- Each plant hydrates, builds, passes `validateParams` and resolves a real `outcomeState`, pinned as found (insight 085).
- `yearrec` and `yearparec`: the status's causes equal `['rules-changed']`; the record's era equals the doctored scenario's five stamps; its fingerprint equals the fresh one; its `mintedAt` year comes before `RETURN_DAY`'s year.
- `yearpa`, `yearfailing`, `yearrec` and `yearparec`: `savedAt` is not before `FIRST_UNAMBIGUOUS_SAVE_DAY`, so the gate's engine-pricing note count is zero, derived from the ledger, never typed.
- Each yearly-return plant fires the tax and healthcare staleness clocks and keeps its start year and answers byte-equal to its base.
- A base with no healthcare stamp makes `doctorYearlyReturn` throw.
- The plant guard's codec round trip keeps every record (no `record-dropped`).

**Verification:** `pnpm test` green; each new key is in the sweep's list; `pnpm typecheck` and `pnpm lint` 0.

### U4. Read Linux before anything is asserted

**Goal:** each new plant's bottoms on Windows and on CI's Linux at the target, before any rung or assertion (R5).

**Requirements:** R5 (KTD6).

**Dependencies:** U3.

**Files:** `e2e/vertical-fit.spec.ts`, the probe describe, placed after the spend-lane describe as the precedent's was.

**Approach:**
1. Restore the precedent's probe shape from commit `83802b7a6`, extended by KTD6's standing and cause fields. Each arm pins its plant's day and drives it the way its asserting arm will (U6).
2. Run `pnpm verify:fit` alone on Windows and keep the lines.
3. Push the commit alone. Wait on CI by the full sha and the run id. Read the verify job's log by tag, final attempt only.
4. Record the table: plant, Windows, Linux, which column binds. It goes into U5's or U6's commit message and into the composites folder's README.

**Execution note:** a measurement first. The describe asserts no fit.

**Test scenarios:**
- Each probe arm asserts the laptop tier and the short tier before it prints (insight 125).
- A missing element makes the arm throw, and a non-finite value fails it.

**Verification:** a written table with a Linux and a Windows number for every plant, read from the head run's final attempts.

### U5. Rungs for the caveat frames that fail

**Goal:** every caveat-class plant inside 731 on both platforms (R6), through KTD7's rungs in order.

**Requirements:** R6 (KTD7).

**Dependencies:** U4. U5 is skipped when U4's table shows every caveat frame inside on both platforms.

**Files:**
- `src/ui/styles/survivor.css` and `src/ui/styles/confidence.css`, inside their existing short-tier blocks.
- `e2e/vertical-fit.spec.ts`: each rung's computed-style pin on both sides of the tier. The leading and register helpers gain an echo flag. A new reader covers `.cs-staleness-note`'s leading.
- `src/ui/styles/tokens.css`: the law's docblock names the new rungs beside W1–W7, L1 and L2.

**Approach:** for each failing frame, take the next rung:
1. Write it.
2. `pnpm build`, because the CSS minifier is what refuses a broken nest (insight 061).
3. Pin it on both sides of the tier.
4. Run `pnpm verify:fit` alone.
5. Push it alone and re-read the probe lines on Linux.

The precedent's Windows deltas are the starting estimates: rung 2a −8.8 px, rung 2b −2.7 px, rung 3 −11.2 px (Appendix). Each later rung is re-measured on top of the earlier ones.

**Execution note:** the rule decides, not the estimate. A rung that does not move the Linux number did nothing (insight 075).

**Test scenarios:**
- Each rung's pin reds on every platform when its rule is deleted (a planted fault, reverted by snapshot + `cmp`). Name, before running it, which arms can red and which cannot (insight 126).
- On the tall side, the echo frame resized to SHOWCASE reads every new rung dark.
- No rung moves a frame without the staleness echo: the existing arms' printed lines stay the same.

**Verification:** U4's table, re-read, shows every caveat frame inside 731 on both platforms at the commit U6 builds on.

### U6. The asserting arms

**Goal:** the gate holds every new plant to its law (R6, R7), and the probe describe goes.

**Requirements:** R6, R7 (KTD8).

**Dependencies:** U5, or U4 when U5 was skipped.

**Files:** `e2e/vertical-fit.spec.ts`.

**Approach:**
1. `?seed=patypical` joins the spine one-frame arms.
2. `yearpa` and `yearfailing` get arms in `?vault=stale`'s shape at `RETURN_DAY`:
   - the gate frame first: the affirm button inside the frame, and the note count derived from the ledger;
   - then the result: the echo visible, one visible caveat, the backup door below it, `assertFrameFits` with the backup door sanctioned, the survivor basis inline, and the density tier with KTD7's flags.
3. `yearrec`, `recpa` and `yearparec` join the record loop, each at its own day. Each asserts its caveat inside the frame, its card below the caveat in pixels and in the DOM, and its card's cause count. Each prints its `[U17 record return]` line with the standing bottom. The loop's standing-line assertion stays on `rec` and `recold` only.
4. Delete the probe describe.

**Patterns to follow:** the `?vault=stale` arm, the record loop and its `[U17 record return]` print, and the 20 px arm's record-only comment, quoted at the record plants' print.

**Test scenarios:**
- Deleting a caveat-class plant's rung reds its arm (U5's planted fault, now reading the asserting arm).
- A record plant whose card loses a cause reds its cause-count assertion.
- Seating a record plant's card above its caveat reds its order assertion.

**Verification:** `pnpm verify:fit` green alone on Windows; CI green on both jobs at the head.

### U7. Docs, the register and the landmines

**Goal:** every live statement matches what was built.

**Requirements:** R1–R7.

**Dependencies:** U6.

**Files:**
- `docs/backlog.md`:
  - the composites entry's prescriptions (1) and (3) marked built, with U4's table; its prescription (4) stays open, with the deadline;
  - *The fit gate reads the wall clock…* closed by U1;
  - the Tier 3 yearly-return entry pointed at the composites entry;
  - two new entries: the Caddie harness's clock and the unit suite's 2027 reads (the Deferred list).
- `docs/landmines.md`: under the fit gate's area, the gate's calendar — every arm pins it, and a yearly return is a plant at `RETURN_DAY`, never a start-year doctor.
- `TODO.md`: the Dated row for 2027-01-01 rewritten to what remains (the record card's seat); walk 10's targets gain the new plants.

**Test expectation:** none -- docs only. `pnpm verify:doc-stats` is the gate.

**Verification:** `pnpm verify:doc-stats` 0.

---

## Verification Contract

| check | command | when |
|---|---|---|
| types | `pnpm typecheck`, plus each edited spec through a scratch tsconfig (`e2e/` is outside it; filter the eight known `Node.remove` errors) | every unit |
| lint | `pnpm lint` | every unit |
| unit suite | `pnpm test` | U1, U2, U3 |
| build | `pnpm build` | U1, every U5 rung, U6 |
| fit gate | `pnpm verify:fit`, alone on an idle machine, never beside another suite | U1 (before and after), U4, every U5 rung, U6 |
| recommendation chart | `pnpm verify:fit:rv`, alone | U1 |
| doc numbers | `pnpm verify:doc-stats` | U2, U3, U7 |
| CI | the run for the full sha, by run id (`gh run view <id> --json status,conclusion`) | every push; U4 and each rung read from the log |

---

## Definition of Done

- Every arm in the four fit harnesses pins its clock. The binding test stands, and the KTD9 comparison read the same.
- `patypical`, `failingtypical`, `yearpa`, `yearfailing`, `yearrec`, `recpa` and `yearparec` are committed. Each has its engine-acceptance pin, and each record has its cause-list proof.
- U4's table holds a Windows and a Linux number for every plant, and it is written in the commit history and in the composites folder's README.
- Every caveat-class plant passes the one-frame law on CI and on Windows. Each rung that landed has its pins on both sides.
- Every record plant asserts its caveat, its order and its cause count, and prints its standing line.
- The probe describe is gone. No temporary plant, scratch file or abandoned rung is left in the tree.
- The register, the landmines file and the TODO say what was built, and `pnpm verify:doc-stats` is 0.

---

## Appendix

### The measured catalog (Windows, 1440×731 @ 2, temporary plants, reverted)

Source: `C:\Users\brigg\.claude\projects\C--Users-brigg-ai-learning-journey-projects-the-back-nine\b9-repoint\composites\README.md`, b9-3's section and the "b9-4" sections. That is machine-local, and the register's Tier 0 entry carries the same numbers.

| frame | caveat | standing | with U3's whole ladder |
|---|---|---|---|
| Pennsylvania, typical, yearly return | 737.3 | — | 715.4 |
| off track, typical, yearly return | 744.3 | — | 701.7 |
| retired, typical, saved record | 686.6 | 748.6 | 731.1 |
| Pennsylvania, typical, saved record | 707.4 | 769.4 | 751.9 |
| retired, typical, yearly return + record | 716.5 | 778.5 | 747.9 |
| Pennsylvania, typical, yearly return + record | 737.3 | 799.3 | 768.7 |
| retired, entered, yearly return + record, start year kept | 674.9 | 736.9 | 706.3 |
| Pennsylvania, entered, yearly return + record | 695.7 | 757.7 | 727.1 |
| retired, entered, yearly return + record, a year on (the band binds) | 692.4 | 754.5 | 745.8 |

The ladder's steps on the caveat frames (Pennsylvania / off track): rung 2a 728.5 / 735.6, rung 2b 725.8 / 732.9, rung 3 715.4 / 701.7.

### The 2027-01-01 measurement (HEAD code, the page's clock pinned to 2027-01-02)

`?vault=rec` and `recold`: caveat 692.4, standing 754.5 (today 645 / 707). `?seed=retired`, `pa`, `budget` and `?vault=statestale`: caveat 692.4. `?vault=stale`: 716.5, unchanged. The band grows from 529 to 645.2 px on every frame built in 2026.
