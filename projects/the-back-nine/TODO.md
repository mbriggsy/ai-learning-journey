# The Back Nine — TODO

> **Actionable next-actions only.** No session history, no shipped-work record, no stat stamps — `git log`
> has the first, [`docs/roadmap.md`](docs/roadmap.md)'s You-Are-Here table has the second, and `README.md` +
> the roadmap carry the test count under `verify:doc-stats` (this file re-typing it rotted twice, so
> `d5df3609` made pointing the rule).
>
> **The full open register is [`docs/backlog.md`](docs/backlog.md)** — 43 items, each traced to the raw
> obligations behind it. This file ranks only what is next; **a queue of ~17 is not the open surface, so
> read the register before filing anything as new.**
>
> ⚠️ **NEVER cite "TODO item N."** These numbers are re-ranked every session, so a citation written today
> silently resolves to a *different* live item later — worse than dangling. (Live examples: `council-log.md`
> and `cold-read-log.md` cite "TODO item 11" meaning the state-tax unit, shipped 2026-07-15; item 11 is now
> the heir-bracket entry. Others cite "item 0", which no longer exists.) Cite the register entry's **title**.

**Where we are:** all four acts are built; Act 4 closed at U17·S6 (S7 deferred, Briggsy's ruling). What is
left is not units. It is the gap between *the build is done* and *a friend can bet real money on this*.

---

## Dated — these fire on a clock

| Fires | What | What breaks |
|---|---|---|
| **NOW** | NC FY2025-26 revenue certification (`~Aug 2026`) | **Every NC household's recommendation is withheld** — and `recHoldStateCert` promises "around August" |
| **2026-09-01** | NC `nextDue`, `state-tax-nc-last-verified.json` | `pnpm verify:state-tax` reds → CI red |
| **2026-09-02 00:00 UTC** (09-01 20:00 ET) | ACA rolling window (`verifiedOn: 2026-08-02` + `maxAgeDays: 30`) | `pnpm verify:aca` reds → CI red |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | **No gate exists** — every figure silently goes a year stale |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the four aged tone calls are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |

⚠️ **The ACA deadline is a ROLLING window, never an absolute `nextDue`** — grepping `nextDue` to inventory
deadlines silently misses it. It has been filed a notch late twice, both times in the unsafe direction.

---

## Next, in priority order

### Tier 0 — calm-but-wrong (shipped code can answer WRONG)

*The cardinal rule's own list. These are defects, not scope.*

1. **The mixed household's retired spouse is priced at $0 healthcare — so the date comes out too early.**
   `healthcareStreams.ts:149` — `windowStart = Math.max(0, ...people.map(p => p.retireOffset))` is a
   *household* max, so an already-retired spouse's own (negative) offset is discarded and their entire
   pre-65 marketplace premium is zeroed across `[0, windowStart)`. The premise is "employer family coverage
   while anyone works" — **intake never asks, and no shipped copy discloses it** (grep of `copy.ts` for
   employer/family-coverage language returns only an HSA contribution line). Optimistic direction, on the
   flagship date route. `healthcareStreams.test.ts:64` **pins it as intended**, and
   `assumptionPanel.test.tsx:85` already fixtures the affected household. **This is a fork, not an edit:**
   ask the employer-coverage question in intake, or price the retired spouse and disclose. Cost both arms
   and take it to Briggsy — the defending test gets rewritten either way.

2. **A well-funded household whose winning strategy converts crashes into a calm "unavailable."**
   `select.ts:280-284` routes the uncalibrated demotion axis to a structured withhold **only** when
   `goal === 'pay-less-tax'`; `gradeCalibration.ts:154-160` returns false for *any* non-survival axis, so
   the leave-more arm falls through to the throw at `:166-178`. `solve.ts:342` narrows its catch to
   `GradeFloorRefusal` and rethrows — landing as `compute-error` → `engine-unavailable`. The guard comment
   at `select.ts:279` still reads *"UNREACHABLE live (conversions stay trend-blocked)"*; **that premise
   expired 2026-07-19** when the Medicare-cost-trend unit set `PART_B_PRICING_MODE: 'trended'`.
   Minimum fix: route leave-more to the same structured withheld state, and give both arms a humane named
   reason instead of the generic card. Full fix: calibrate the demotion width on the goal-dollar axes.
   ⚑ `solve.ts:342`'s own comment says a fail-closed guard "must never be laundered into a calm
   'unavailable' (the calm-but-wrong cardinal sin)" — which is precisely what happens.

3. **Pre-65 ACA premiums are priced real-flat — the sin the Medicare council ruled solver-BLOCKING.**
   `intakeMap.ts:271-291` (`escalateQuote`) builds both the enrolled premium and the SLCSP benchmark from
   `acaAgeRatingCurve` factors alone — **no cost-trend term** — and `healthOverlay.ts:296` consumes it
   verbatim. Part B was fixed for exactly this reason; `oracleToken.ts:112-133` writes the argument out
   (*"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a mis-ranking"*). The same
   argument holds at the 400%-FPL cliff, where the household eats the full premium — and `copy.ts:924`
   already tells the reader the conversion↔subsidy coupling *is* priced. The token has an ACA
   **legislative freshness** clause and **no ACA pricing-mode clause**. Rides with the uncapped
   excess-APTC clawback (the gate never reads the field).

4. **A household outside {NC, PA, FL} gets a confident winner computed with zero state income tax.**
   Reduce-to-spine `+0` is keyed on `PRICED_STATES` membership, so an unpriced state ranks strategies with
   the state term absent — and that term is proven to **flip the optimal anchor** (U14's own NC oracle
   fixture moves it 22%→12%-top). Disclosed in prose only. Decide: refuse outside the roster (mirrors the
   NC withhold, honest), or widen it. **His scope call.**

5. **The record card says the advice still holds when the household never took it.**
   `copy.ts:1315` — *"It still matches your plan as it stands today."* On `?vault=rec` the saved winner is
   `taxable-first` with `noChange: false` (`devSeeds.ts:1322`) while door 2 one flick below labels the live
   order proportional — and they **co-render in a single frame**. Cold-read Card 8 grades it
   HARD-FLAG/BLOCKER. Its sibling was fixed in `532cad82`; this arm was not. **Naming the strategy is
   Briggsy's ruling (#15) — the contradiction is not, and can be closed by dropping the execution claim
   without naming anything.**

6. **Smaller, each self-contained:** post-65 non-qualified HSA money is silently forfeited (unrouted path;
   the conservative direction is disclosed only in a code comment) · account balances have **no magnitude
   sanity rule** while spend and PIA each got one (`sanity.ts:51-72`) · the assumptions panel's
   monthly/yearly help line contradicts itself, 12× · the date-route ACA clock over-alarms — **the filed
   fix is wrong**, `rulesMoved` is one OR-collapsed boolean so it would silence the tax and Medicare clocks
   too · **long-term care is neither modeled nor in the OUT-but-disclosed list** the product otherwise
   keeps religiously.

7. ⏰ **The 2027-01-01 annual roll has no tripwire at all.** `TAX_YEAR` / `COVERAGE_YEAR` /
   `CONTRIBUTION_YEAR` go a year stale in silence. Every other dated constant here carries a gate; these
   do not. Cheap to arm, and the deadline is fixed.

### Tier 1 — the differentiator does not land

8. **The recommendation never says what to DO.** `recommendationView.ts:410` computes `winnerStrategyKey`;
   repo-wide it has **exactly two other references — its own type declaration and one unit test.** Zero
   render consumers, and `RecommendationSurface.tsx` contains no strategy name anywhere. The hero is a bare
   dollar delta (`copy.ts:2297/2301`); the winner's conversion amount and years render nowhere; there is
   **no apply seam** back into the sequencing or Roth sheets. R23's runner-up is the same story — `why` is
   one static sentence (`copy.ts:1497`) naming neither arm, while `runnerUpId`/`policy` sit unused on the
   payload.

9. **The whole still-working audience gets no strategy — silently.** `Result.tsx:476` gates
   `RecommendationSurface` off for the date route entirely and `:362` gates the invite door. The
   `blocked{spine-unready}` note that would explain it lives *inside* the gated-off component, so a working
   couple sees the date answer and **zero words** about strategy. `Result.tsx:340`'s comment claims "the
   builder's `spine-unready` refusal covers the date route honestly" — it does not render.
   **Cheap honest interim (XS–S): drop the `!isDateRoute` gate at `:476` alone** so the existing refusal
   renders, turning a silent withholding into a stated one. Full parity is council-sized — the crowned
   offset lives in the committed answer, not the draft, and anchoring candidates at a future retirement
   year is a real ranking question.

10. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
    `solveDispatch.ts:79` returns `'no-pretax'` when no *conversion* candidate survives — but four
    sequencing-only candidates always survive (`candidates.ts:331-337`), and `solve.ts:452-457` already
    implements that exact partition for the trend-blocked case. Reserve `no-pretax` for `set === null` and
    dispatch the sequencing-only field.

11. **The assumed heir bracket (0.24) drives the leave-more hero and cannot be seen or edited** — an R7
    break on the one input that moves that ranking. Also open: the third locked Tier-2 goal
    (`live-bigger-now`) does not exist, so R21 ships 2 of 3 · the U17 S7 riders, **neither buildable as
    filed** (Q7a's gating premise is false — the dialects already co-render; Q7b's whole spec is one line).

### Tier 2 — what breaks on someone else's device

12. **The surfaces a friend actually hits have never been walked or cold-read by anyone.** The vault
    credential ceremonies (Passphrase, Backup, Save, Export), `RecoveryFlow` and `RestoreFlow` — the two
    *"I lost access to my retirement plan"* screens — plus ColdStart and 10 of 13 intake steps, including
    **Accounts, where the couple enters their entire net worth.** No dev seed reaches most of them.

13. **The couple's own data.** An interrupted intake loses the whole household (13 steps, zero persistence,
    no `beforeunload`, and one step tells them to fetch a number from healthcare.gov **in a new tab**) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:537` refuses anything but
    v3, so the first v4 bump bricks every saved plan *and its backup* · there is **no way to delete the
    vault** (`clearVault` exists; its only caller is the dev seed planter).

14. **Also:** no icons at all, so the "local-first PWA" is not installable · Chromium-only verification
    while the durability story is explicitly about Safari eviction · the fit law is never checked at
    enlarged text · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · the solve
    lane has no cancel and can freeze the tab silently (`engineClient.ts:50`).

### Tier 3 — Briggsy's call

15. **His eye, the standing block.** The stacked tape rows (07-08 → 07-23, which also score the
    Opus-vs-Sonnet Caddie flip) · the four aged-surface tone calls, **due before 2027-01-01** · the chart
    framing forks (whose range is shaded, which odds the ladder quotes, the axis units) · `?vault=stale`'s
    MEANING ruling (both obvious repairs are measured dead ends) · the three-doors rhythm on `datemixed` ·
    the essentials median line · the record card's strategy naming (half 2) · the phone-rhythm pass · the
    fiduciary's current-law-as-written caveat, unanswered since 2026-07-09.
    ⚑ **On-surface re-audit owed** for the two Card 9 / GoalPicker fixes that shipped without it — a
    chat-approved change does not survive his re-read on the surface (the 2026-07-11 false-PASS lesson).

16. **Verify-owed, and it needs him.** The OOP-medical figures (`src/intake/referenceData.ts` →
    `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified
    (`directionalUntilPinned`). BLS bot-walls `curl`, so this is the sanctioned exception to
    no-manual-steps: ask Briggsy to pull the CE "Age of reference person" table and pin them cell-by-cell.

### Tier 4 — hygiene

17. **The gates that don't bite (14 filed items)** — R7's registry is one level deep, copyGuard's scope is
    a prefix allowlist with no forcing function on new keys, and several arms still cannot fail. None can
    produce a wrong answer today; all mean the net is thinner than it reads. Plus the Medicare-trend
    riders, the open copy obligations, the deferred richer market draw, and the `dateinvert` (c) mint —
    its own session, a size-L parameter hunt.
    ⚑ **The CVD half of this cluster is PARKED, not owed — do not re-propose it.** The filed gap ("the CVD
    crops prove PRESENCE only") is real, and a `verify:cvd` pixel-regression gate was designed for it on
    2026-08-02. **Briggsy declined it on the only authority that can:** *"I'm pretty color blind and I think
    b9 looks great."* Per `caddie/SKILL.md:235` the colour lane can only flag, never pass — his eyes own the
    verdict, so that IS the pass (taste-corpus rule 40 + exemplar E14). Rule 18 still binds every NEW
    surface; this covers what he has seen. **Being colour-blind qualifies him as the oracle rather than
    disqualifying him** — he is the failure mode, not a judge of prettiness, and a simulated-CVD PNG is only
    a model of him. Reach for the human before building the simulator.

---

## Standing cadences

- `/ultramode-code-review` at every unit boundary; the **four-skill UI loadout** before ANY user-facing
  surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** native Agent Teams for live-steer **eye-oracle** units; the Workflow tool for
  fire-and-forget **test-oracle** fan-out. Durable laws in memory `feedback-delegated-build-laws`.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (106 of them; cite by full path + slug).
These are the mechanical ones that keep costing hours.*

- **A filed prescription in this repo is ~25-40% executable as written** — thrice-measured (5-of-11,
  2-of-5, 1-of-5 clean). Drifted anchors, mechanisms the code does not have, edits that would write NEW
  false claims. **Open every cited line before executing; budget as if it were unwritten.** A prescription
  never inherits the trust of the correct diagnosis above it.
- **`sed -i` in Git Bash rewrites the whole file CRLF → LF.** This repo is `core.autocrlf=false`, so the
  churn lands in the commit (an 884-line diff on a 20-line edit). Use node for surgical rewrites, and
  **always `git diff --stat` before staging.**
- **Never read a command's verdict through a pipe.** `cmd 2>&1 | tail` returns *tail's* exit code — this
  has burned both `gh run watch` and `pnpm caddie:walk`. Redirect to a file and echo `$?`.
- **CI verdicts by explicit id only:** poll `gh run view <id> --json status,conclusion` to `completed`,
  then read `conclusion`. A watch exit code lies in **both** directions.
- **`pnpm verify:bundle` reads `dist/` WITHOUT rebuilding.** A stale `dist/` is a false green; this has
  bitten twice. Fresh `pnpm build` first, every time.
- **Verify a planted mutant landed, and hit the right occurrence.** A no-op edit goes green and reads as a
  surviving mutant; a replace on the wrong line produces a real-looking red for the wrong reason. Match on
  a unique anchor, then `grep` the file back. **And run the baseline before diagnosing your own change** —
  when the task is "extend the harness to capture X," run the harness *first*.
- **Never `git checkout -- <file>`** to revert a planted mutant on a dirty tree; it nukes uncommitted work.
  Revert with Edit.
- **Never measure the tree while an agent fleet works in it** — their scratch files produce bogus doc-stat
  reds and bogus test counts. Never run the Caddie walk concurrently with the full suite (CPU contention
  times out the final-tier waits).
- **A StructuredOutput schema that asks for too much output fails the whole call** (insight 084). Split the
  fan-out; never ask one agent for dozens of long fields at once.
- **`?vault=` / unlock / save need a secure context** (`crypto.subtle`) — localhost or https, never a bare
  LAN IP over http.

---

## Driving the app

`pnpm dev`, then a `?seed=` or `?vault=` param. DEV-only, DCE'd from prod. Source of truth:
`src/ui/devSeeds.ts` — `DEV_SEEDS` at `:942`, `AGED_PLANTS` at `:1481`.

**Scenario seeds** — jump straight to a worded result + band:

| Seed | Face |
|---|---|
| `retired` | all-retired, on-track spine band — the U12 core |
| `date` | still-working — the fuck-off-date band |
| `borderline` · `dateborder` | borderline verdicts whose band descends to $0 — the honesty cold-read |
| `failing` | the bad-news verdict |
| `budget` | the budget builder's own face |
| `datesplit` · `datemixed` | split floor/lifestyle dates · the three-doors rhythm face |
| `dip` | **the hard-gate seed** — non-monotone ladder (dips 0-2, crown 5) + an applied conversion |
| `order` | custom drawdown order, round-tripped through the codec |
| `health` | the healthcare door/sheet |
| `date65` | all-65+ still working — Medicare priced, no false "unpriced" note |
| `surplus` | the over-funded ACTIVE recommendation — delta-as-hero + the median qualifier |
| `steer` | the `no-pretax` typed refusal — invite → GoalPicker → calm refusal, no solve |
| `nc` · `pa` · `fl` · `elsewhere` | the state faces — NC bites, PA is small, FL is $0, elsewhere unpriced |
| `datenc` | the date-route NC witness |

**Vault plants** — `?vault=<key>` plants an encrypted vault and lands on Unlock with the passphrase
pre-filled. **The param strips itself** (`history.replaceState`), so a plain refresh probes the REAL vault
like prod; re-planting is an explicit re-entry of the URL, never a refresh side effect.

| Plant | Base | What it drives |
|---|---|---|
| `stale` | `retired` | the aged vault — the only live drive of re-entry staleness |
| `datestale` | `datesplit` | the floor's ARRIVED arm |
| `statestale` | `nc` | the `stalenessStateTax` gate note, in isolation |
| `rec` · `recold` | `retired` | the saved record card — holds / superseded |
| `datearrived` | `dip` | the hero's arrived arm ("that year has already come and gone") |
