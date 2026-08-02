# The Back Nine — TODO

> **Actionable next-actions only.** No session history, no shipped-work record, no stat stamps — `git log`
> has the first, [`docs/roadmap.md`](docs/roadmap.md)'s You-Are-Here table has the second, and `README.md` +
> the roadmap carry the test count under `verify:doc-stats` (this file re-typing it rotted twice, so
> `d5df3609` made pointing the rule).
>
> **The full open register is [`docs/backlog.md`](docs/backlog.md)** — 44 open items, each traced to the raw
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
| ~~NOW~~ | ~~NC FY2025-26 revenue certification~~ | ✅ **CLOSED 2026-08-02** — S.L. 2026-41 § 44.1(a) enacted the rate schedule *and* struck the trigger rows the certification fed. Withhold lifted, checkpoint retired. |
| **2026-09-02 00:00 UTC** (09-01 20:00 ET) | ACA rolling window (`verifiedOn: 2026-08-02` + `maxAgeDays: 30`) | `pnpm verify:aca` reds → CI red |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | **No gate exists** — every figure silently goes a year stale |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the four aged tone calls are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |
| **2034-08** | NC's successor flip event — the Office of the State Controller's FY2033-34 final accounting (trigger $40,258,000,000 → TY2035, 0.25pp step, 2.49% floor) | Nothing breaks; it is the only mechanism left that can move NC's rates, and it can only CUT |

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
   while anyone works" — **intake never asks, and no shipped copy discloses it** (all 13 intake steps
   checked; `METHODOLOGY_DISCLOSURES` at `assumptionRegistry.ts:202-233` has 5 entries, none healthcare).
   Optimistic direction, on the flagship date route.
   ⚑ **BRIGGSY RULED 2026-08-02: ask + refuse.** One yes/no employer-coverage question in intake; when the
   answer is no, refuse the date through the existing calm input-failure grammar. This honors the ruling
   the engine already made for itself at `simulate.ts:908-912` (*"rejection beats disclosure"*).
   ⚑ **Three corrections from the 2026-08-02 audit — the filed shape was wrong in ways that matter:**
   (a) the gate also zeroes **`oopMedical`**, not just premiums (`healthcareStreams.ts:168-170`) — scope is
   wider than filed; (b) **the naive fix is REJECTED by shipped code** — `simulate.ts:913-919` refuses any
   finite-positive `enrolledPremium[t]` on a bridge year, so simply un-gating the retired spouse's premium
   makes every date candidate fail, returning no answer rather than a later one (and `acaMagi` at
   `healthOverlay.ts:99-101` has **no wage term**, so a priced year would be optimistic a NEW way);
   (c) `healthcareStreams.test.ts:64`'s comment promises "use a retired 65−x case below for the ACA
   reading" — **that case does not exist in the file.** The gate is pinned only by a fixture whose retiree
   is 66 (Medicare-side, where zeroing is harmless); **the genuinely-broken pre-65 case is untested today.**

2. **A well-funded household whose winning strategy converts crashes into a calm "unavailable."**
   `select.ts:280-284` routes the uncalibrated demotion axis to a structured withhold **only** when
   `goal === 'pay-less-tax'`; `gradeCalibration.ts:154-160` returns false for *any* non-survival axis, so
   the leave-more arm falls through to the throw at `:166-178`. `solve.ts:342` narrows its catch to
   `GradeFloorRefusal` and rethrows. The guard comment at `select.ts:279` still reads *"UNREACHABLE live
   (conversions stay trend-blocked)"*; **that premise expired 2026-07-19** — `taxOverlay.ts:916` is
   `PART_B_PRICING_MODE = 'trended'` and `health.ts:204` is sourced, so the whole roster ranks WITH
   conversions today.
   Minimum fix: route leave-more to the same structured withheld state, and give both arms a humane named
   reason instead of the generic card. Full fix: calibrate the demotion width on the goal-dollar axes.
   ⚑ `solve.ts:342`'s own comment says a fail-closed guard "must never be laundered into a calm
   'unavailable' (the calm-but-wrong cardinal sin)" — which is precisely what happens.
   ⚑ **Audit corrections 2026-08-02:** (a) the terminal state was misstated — it does **not** land as
   `engine-unavailable`; `engineProtocol.ts:260-266` converts the throw to `calm-error` → `compute-error`
   → the generic card at `copy.ts:1461-1462`. Fix the right surface. (b) ✅ **SWEPT 2026-08-02** — the five
   comments that asserted the expired trend-block premise (`select.ts:279`, `select.ts:112-114`,
   `solve.ts:101`, `solve.ts:147-148`, `solve.ts:475-476`) now each say the premise expired and that the
   `leave-more` arm reaches a THROW. They were the traps that would have told you this branch is dead code.
   (c) No fixture proves the crash fires OR that it can't; `select.ts:236-250`'s shrinkage
   tie-break can naturally crown a conversion winner, so treat it as live-possible until a probe says
   otherwise.

3. **Pre-65 ACA premiums are priced real-flat — the sin the Medicare council ruled solver-BLOCKING.**
   `intakeMap.ts:271-291` (`escalateQuote`) builds both the enrolled premium and the SLCSP benchmark from
   `acaAgeRatingCurve` factors alone — **no cost-trend term**. Part B was fixed for exactly this reason;
   `oracleToken.ts:112-133` writes the argument out (*"disclose-and-ship is FORBIDDEN — a disclosure fixes
   a number, never a mis-ranking"*). The same argument holds at the 400%-FPL cliff, where the household
   eats the full premium. The token has an ACA **legislative freshness** clause and **no ACA pricing-mode
   clause**.
   ⚑ **Audit corrections 2026-08-02 — three anchors were wrong and the fix shape is NOT Part B's:**
   (a) `healthOverlay.ts:296` is a **closing brace**, not a consumer; the real seam is `taxOverlay.ts:1689`
   + `:1731-1738` → `healthOverlay.ts:270`. (b) `copy.ts:924` is a Medicare eyebrow; the strings that claim
   the coupling is priced are **`copy.ts:894-897`**. (c) the excess-APTC field moved to
   `aca-last-verified.json:41` (was `:21`) and `scripts/verify-aca-status.ts:40-72` never declares the key
   — **the clawback gate is inert prose**, not a gate.
   ⚑ **STRUCTURAL — this is why it isn't a Part B copy-paste:** Part B's schedule is built INSIDE the
   engine, which is why the oracle token can witness it. The ACA escalator lives in **intake**
   (`intakeMap.ts:271-291`), which the engine cannot import — so an `ACA_PRICING_MODE` flag bolted onto
   intakeMap would be the exact lying-mirror `oracleToken.ts:113-119` warns about. The honest fix moves the
   schedule build to an engine-owned `buildAcaPricingSchedule` beside `partBPricingByT` (`taxOverlay.ts:1110`).
   ⚑ **Re-tag: BLOCKED ON RESEARCH.** No sourced ACA cost-trend primary exists in the repo, so a solver
   block would hold for months over the whole pre-65 population. Near-term move is the **copy swap** at
   `copy.ts:894-897` so it stops claiming the coupling is fully priced.

4. **A household outside {NC, PA, FL} gets a confident winner computed with zero state income tax.**
   Reduce-to-spine `+0` is keyed on `PRICED_STATES` membership, so an unpriced state ranks strategies with
   the state term absent — and that term is proven to **flip the optimal anchor** (U14's own NC oracle
   fixture moves it 22%→12%-top). Disclosed in prose only. Decide: refuse outside the roster, or widen it.
   **His scope call.** ⚑ Two corrections from the 2026-08-02 audit: (a) the honest-withhold precedent it
   used to cite — the NC certification block — **is retired**, so a refusal arm must be built, not copied;
   (b) the withhold machinery gates `solve()` ONLY, so a withhold-only fix still ships a **state-blind
   headline / fuck-off date**. Cheap partial: the 8 no-income-tax states are sourced structural $0 (FL's
   exact shape), so widening to them is honest and leaves refusal for taxing states only.

5. **The record card says the advice still holds when the household never took it.**
   `copy.ts:1315` — *"It still matches your plan as it stands today."* On `?vault=rec` the saved winner is
   `taxable-first` with `noChange: false` (`devSeeds.ts:1322`; the winner literal is at `:1308`) while the
   live order is labelled proportional. Cold-read Card 8 grades it HARD-FLAG/BLOCKER. Its sibling was fixed
   in `532cad82`; this arm was not. **Naming the strategy is Briggsy's ruling (#15) — the contradiction is
   not, and can be closed by dropping the execution claim without naming anything.**
   ⚑ **Audit correction 2026-08-02:** "door 2 one flick below labels the order proportional" is **wrong** —
   that literal is one tap DEEPER (`SequencingControl.tsx:173`) and in the panel
   (`AssumptionPanel.tsx:375-378`), so the single-frame co-render claim does not hold as filed. The record
   card's own sentence is still false on its own terms, which is what actually needs fixing. Do the
   defending comment at `copy.ts:1309-1313` in the same edit (the `532cad82` discipline).

6. **Smaller, each self-contained** *(all four re-anchored by the 2026-08-02 audit)*:

   - **Post-65 non-qualified HSA money is silently forfeited.** ✅ The false *"(conservative, disclosed)"*
     claim at `healthOverlay.ts:747` is **corrected 2026-08-02** — it now says the direction is safe but
     the disclosure does **not** exist, and asks whoever adds it to fix the comment in the same change.
     **The disclosure itself is still OWED** (candidate home: the new "What this leaves out" section below).
   - **Account balances have no magnitude sanity rule** while spend and PIA each got one
     (`sanity.ts:51-72`). ⚑ **Size is M, not S, and a ceiling is the wrong instrument:** a 10× slip on
     $500k is $5M — a perfectly coherent household, so no threshold catches it. The shape that works is
     **one confirm on the household TOTAL** at the accounts step (the figure the engine actually consumes),
     reusing the running total already rendered at `copy.ts:1664` / `questions.tsx:974-980`. Briggsy sets
     the number.
   - **The assumptions panel's monthly/yearly help line contradicts itself, 12×.** ⚑ Anchor drift: the
     cold-read log points at `copy.ts:1119`; the live string is **`copy.ts:1124-1125`**. XS, no test pins it.
   - **Long-term care is neither modeled nor in the OUT-but-disclosed list.** ⚑ Recommended home: a new
     third *"What this leaves out"* section in the assumptions panel (beside `AssumptionPanel.tsx:317` and
     `:449`) — the only option that also houses the HSA forfeit and NIIT. The R13 disclaimer is the wrong
     home and is vertical-fit pinned. **The tone sentence needs Briggsy's eye — do not ship it unreviewed.**

   ⚑ **CLOSED AS PHANTOM — the date-route ACA clock does NOT over-alarm.** The date route simulates all 11
   offsets (`dateSearch.ts:425/450/457`) and candidate Y=0 carries the base ACA stream **ungated**
   (`healthcareStreams.ts:149` → `windowStart = 0`, so the window gate is a pass-through). So
   `exposure.aca === 'priced'` *proves* the ACA tables were consumed — the clock is load-bearing, not
   spurious. ✅ **THE TRAP IS DELETED 2026-08-02.** `stalenessExposure.ts` no longer prescribes
   "re-derive against the CROWNED offset" — that arm would have **silenced** the ACA clock for exactly the
   household whose crown a subsidy flip moved (insight 103's shape, for the THIRD time in that one
   comment). The file now records the sweep argument and keeps only the sound arm: **per-clock attribution,
   so the ACA line can withdraw without taking the tax and Medicare lines with it** — which requires
   `rulesMoved` to stop being one OR-collapsed boolean. Nothing here is urgent: the residual over-alarm is
   bounded and knowingly accepted, and the clock is load-bearing.

7. ⏰ **The 2027-01-01 annual roll has no tripwire at all.** `TAX_YEAR` / `COVERAGE_YEAR` /
   `CONTRIBUTION_YEAR` go a year stale in silence. Cheap to arm, and the deadline is fixed.
   ⚑ **Audit corrections 2026-08-02:** (a) *"every other dated constant carries a gate"* is **false** —
   `federalPovertyGuidelines` (`health.ts:113-114`, `guidelineYear: 2025`) is dated, annual and equally
   ungated, so include it in scope. *(Check the coverage-year mapping before calling it stale — ACA
   deliberately applies the PRIOR year's guidelines to a coverage year, so 2025 in a 2026 build may be
   correct. Do not assert staleness without confirming that rule.)* (b) Mirror
   `irmaaTopTierReindex.tripwire.test.ts` — it is the working template. (c) **Know what it buys:** a red
   tripwire reds the GitHub check but does **not** block a Vercel deploy. That is true of all three
   existing tripwires, so it is the house posture, not a new gap — don't "fix" it here.

8. **The recommendation tells an NC household we can't price their state — while the spine three inches
   above says we did.** `copy.ts:1531` (`recDiscStateTax`) is the ONE `DISCLOSURE_BUILDERS` entry with no
   condition (`recommendationView.ts:75`), so it renders on priced-state households too. **Newly reachable,
   not a regression:** before the 2026-08-02 NC pin no priced-state household could reach this surface, so
   it had never co-rendered with a priced-state spine. Found live in Chromium on `?seed=nc`. Direction is
   conservative (it understates us), so not the cardinal sin — but a one-screen self-contradiction is
   cold-read blocker class. **Not a copy tweak:** `SolveRecommendation` (`solve.ts:159-201`) carries no
   retirement state, so the payload needs it threaded (engine + worker wire + tests) before the builder can
   return `null` — the shape `heir-bracket`/`aca-slcsp` already use.

### Tier 1 — the differentiator does not land

9. **The recommendation never says what to DO.** `recommendationView.ts:410` computes `winnerStrategyKey`;
   repo-wide it has **exactly two other references — its own type declaration and one unit test.** Zero
   render consumers, and `RecommendationSurface.tsx` contains no strategy name anywhere. The hero is a bare
   dollar delta (`copy.ts:2297/2301`); the winner's conversion amount and years render nowhere; there is
   **no apply seam** back into the sequencing or Roth sheets. R23's runner-up is the same story — `why` is
   one static sentence (`copy.ts:1497`) naming neither arm, while `runnerUpId`/`policy` sit unused on the
   payload.
   ⚑ **Audit 2026-08-02 — take the instruction-card arm, NOT a store write.** Writing the winner into the
   draft changes the solver fingerprint and would **instantly demote the recommendation the household just
   accepted** (`recommendationView.ts:289-290`). Name the winner and point at the sequencing sheet; no
   apply-seam mutation. Most of what's missing is already ON the payload and needs only rendering — that
   half is cheap and answers "it never says what to do" with zero engine work.

10. **The whole still-working audience gets no strategy — silently.** `Result.tsx:476` gates
   `RecommendationSurface` off for the date route entirely and `:362` gates the invite door. The
   `blocked{spine-unready}` note that would explain it lives *inside* the gated-off component, so a working
   couple sees the date answer and **zero words** about strategy. `Result.tsx:340`'s comment claims "the
   builder's `spine-unready` refusal covers the date route honestly" — it does not render.
   ⚑ **THE FILED "CHEAP INTERIM" IS WRONG — do not execute it.** Dropping the `!isDateRoute` gate at
   `:476` alone renders an **empty `<div>`**, not the refusal: the note is not reachable on that path. And
   reusing `recommendSpineUnreadyNote` would tell a household with a **complete** answer that its answer is
   incomplete — a new false claim, worse than the silence. The honest interim is a **route-true one-liner**
   admitting the v1 limit in its own words, seated and re-measured under `verify:fit` (~89px headroom).
   **Briggsy blesses the words.** Full parity stays council-sized — the crowned offset lives in the
   committed answer, not the draft, and anchoring candidates at a future retirement year is a real ranking
   question.

11. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
    `solveDispatch.ts:79` returns `'no-pretax'` when no *conversion* candidate survives — but a
    conversion-free candidate survives for **every entry in `SEARCHED_POLICIES`** (`candidates.ts:331-337`),
    and `solve.ts:452-457` already implements that exact partition for the trend-blocked case.
    ⚑ **DOWN-RANKED — the filed fix is UNSHIPPABLE as written.** `solveEntry.ts:140-147` mint-fails the
    roster *before* `solve()` runs, and `rankingStability.ts:145-153` knows only a conversion-**amount**
    perturbation. So dispatching the sequencing-only field would surface `mint-failed{roster}` **live** —
    the exact state `solveDispatch.ts:76` forbids in its own comment. Making it real needs a second
    validation law (a sequencing perturbation) under every shipped recommendation, which is a one-way door
    on what "validated" means.
    ⚑⚑ **AND THE "CHEAP COPY FIX" IS ITSELF A TRAP — found 2026-08-02 while attempting it.** The filed
    near-term move was to reword `copy.ts:1408` so it blames only the **conversion** half rather than "a
    withdrawal strategy." **Do not.** The code still returns `'no-pretax'` and runs NO solve, so a sentence
    saying only conversions are blocked would promise a withdrawal-order answer we never deliver — trading
    a false CAUSE for a false PROMISE, which is strictly worse. Any honest rewording must ALSO say we are
    not ranking an order here, and that sentence is a real drafting call (the current wording was chosen
    deliberately — `copy.ts:1404-1406` records that naming "a withdrawal strategy" cures the panel's
    unglossed-"order" stumble). **Briggsy's words, or ship the engine half first.**

12. **The assumed heir bracket (0.24) — the shipped copy sends the reader to a control that does not exist.**
    ⚑ **The filed claim ("cannot be seen or edited") is HALF FALSE, and the truth is worse.** It IS
    disclosed — `recommendationView.ts:78-81` → `copy.ts:2352-2353` → `RecommendationSurface.tsx:469-477` —
    and the sentence ends *"— adjust it in your assumptions if that's off."* **There is no heir seat in
    `assumptionRegistry.ts` or `AssumptionPanel.tsx`** (grepped 2026-08-02: zero rows). A dead-end
    instruction is worse than silence — it was **live**, visible in the 2026-08-02 `?seed=nc` capture.
    ✅ **XS half SHIPPED 2026-08-02** — the dead-end clause is gone; the sentence states the assumption and
    stops. **(M) still OPEN:** the real editable row, using `survivor-ratio`
    (`AssumptionPanel.tsx:322-348`) as a line-for-line template. ⚠️ The copy's own comment carries the
    coupling — **restore the "adjust it in your assumptions" clause in the SAME change that ships the seat,
    never before it.**
    **Panel only — never asked in intake** ("what bracket will your kids be in?" invites a confidently-wrong
    guess worse than the 24% default). Also open: the third locked Tier-2 goal (`live-bigger-now`) does not
    exist, so R21 ships 2 of 3 · the U17 S7 riders, **neither buildable as filed** (Q7a's gating premise is
    false — the dialects already co-render; Q7b's whole spec is one line).

### Tier 2 — what breaks on someone else's device

13. **The surfaces a friend actually hits have never been walked or cold-read by anyone.** The vault
    credential ceremonies (Passphrase, Backup, Save, Export), `RecoveryFlow` and `RestoreFlow` — the two
    *"I lost access to my retirement plan"* screens — plus ColdStart and 10 of 13 intake steps, including
    **Accounts, where the couple enters their entire net worth.** No dev seed reaches most of them.

14. **The couple's own data.** An interrupted intake loses the whole household (13 steps, zero persistence,
    no `beforeunload`, and one step tells them to fetch a number from healthcare.gov **in a new tab**) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:537` refuses anything but
    v3, so the first v4 bump bricks every saved plan *and its backup* · there is **no way to delete the
    vault** (`clearVault` exists; its only caller is the dev seed planter).

15. **Also:** no icons at all, so the "local-first PWA" is not installable · Chromium-only verification
    while the durability story is explicitly about Safari eviction · the fit law is never checked at
    enlarged text · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · the solve
    lane has no cancel and can freeze the tab silently (`engineClient.ts:50`).

### Tier 3 — Briggsy's call

16. **His eye, the standing block.** The stacked tape rows (07-08 → 07-23, which also score the
    Opus-vs-Sonnet Caddie flip) · the four aged-surface tone calls, **due before 2027-01-01** · the chart
    framing forks (whose range is shaded, which odds the ladder quotes, the axis units) · `?vault=stale`'s
    MEANING ruling (both obvious repairs are measured dead ends) · the three-doors rhythm on `datemixed` ·
    the essentials median line · the record card's strategy naming (half 2) · the phone-rhythm pass · the
    fiduciary's current-law-as-written caveat, unanswered since 2026-07-09.
    ⚑ **On-surface re-audit owed** for the two Card 9 / GoalPicker fixes that shipped without it — a
    chat-approved change does not survive his re-read on the surface (the 2026-07-11 false-PASS lesson).

17. **Verify-owed, and it needs him.** The OOP-medical figures (`src/intake/referenceData.ts` →
    `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified
    (`directionalUntilPinned`). BLS bot-walls `curl`, so this is the sanctioned exception to
    no-manual-steps: ask Briggsy to pull the CE "Age of reference person" table and pin them cell-by-cell.

### Tier 4 — hygiene

18. **The gates that don't bite (14 filed items)** — R7's registry is one level deep, copyGuard's scope is
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
- **Line-ending churn — and "use node instead" is NOT the fix by itself.** `sed -i` in Git Bash rewrites
  the whole file CRLF → LF; this repo is `core.autocrlf=false`, so the churn lands in the commit (an
  884-line diff on a 20-line edit). **But a node script that hardcodes `lines.join('\r\n')` does exactly
  the same thing in reverse** — hit 2026-08-02, turning a 196-line TODO edit into a 648-line diff.
  Rewriting a file? **Detect the existing ending** (`raw.includes('\r\n') ? '\r\n' : '\n'`) instead of
  assuming either. The real rule is the last one: **always `git diff --stat` before staging, and if the
  changed-line count is near the file's line count, it is churn — stop and fix the endings.**
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
