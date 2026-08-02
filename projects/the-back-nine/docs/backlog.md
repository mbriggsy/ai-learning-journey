# The Back Nine — Open Backlog

> The complete open register: **43 items** consolidated from **136 raw obligations** (a source
> audit of the shipped code + a salvage sweep of the 246 KB `TODO.md` archive it replaced). Every raw
> obligation is accounted for — the `ids` on each entry are its provenance.
>
> **This file is the register, not the queue.** The ranked next-actions live in [`TODO.md`](../TODO.md).
> Tiers are by worst consequence, never by size — the cardinal rule is that calm-but-wrong is the sin.
>
> `A*` ids came from the code audit, `S*` ids from the archive sweep. Both are on record in the session
> transcript; an entry with several ids was filed several times under different wording.

## Tier 0 — calm-but-wrong (shipped code can answer WRONG)

### The assumptions panel's monthly/yearly help line contradicts itself

`S` · **pilot** · filed 2× — `A35`, `S7`

- Card 10(a) — the assumptions panel's unit toggle contradicts itself in one sentence, and the contradiction runs 12×
- Door 4's month/year sentence still owed a rewording

### Account balances have no typo defense

`S` · **pilot** · filed 1× — `A51`

- The biggest number the couple enters — an account balance — has no magnitude defense, while spend and Social Security each got one

### ~~NC rate certification~~ — **CLOSED 2026-08-02** (the NC half; the ACA half moved below)

~~`M`~~ · **pilot** · filed 9× — `A10`, `A22`, `A25`, `A26`, `S12`, `S17`, `S24`, `S37`, `S65`

**Resolved by primary, not by a date bump.** **S.L. 2026-41 (SB 257) § 44.1(a)** — ratified 2026-07-02,
signed 2026-07-07 — rewrote G.S. 105-153.7: it struck the open-ended "After 2025 — 3.99%" row for the
enacted steps **2026 3.99 · 2027-2029 3.49 · 2030-2032 3.24 · after 2032 2.99**, *and* struck every
revenue-trigger row through FY2032-33. So the FY2025-26 certification this cluster waited on gates
nothing, and the first surviving trigger row is FY2033-34 → TY2035 (OSC **August 2034**).

- ✅ NC household strategy recommendation — **the hard withhold is LIFTED**; an NC household now mints
  and gets a real recommendation (`state-certification-pending` has no live producer).
- ✅ `verify:state-tax` NC `nextDue` — moved off the dead 2026-09-01 checkpoint to the annual cadence
  (**2027-08-02**). NC keeps `reVerifyEveryBuild`: a budget act rewrote this table mid-session once.
- ✅ U16 §Q5's NC contract — **moot, not delivered.** The withheld render it specified has no live
  household. The copy survives for a future directional state, minus its "around August" promise.
- ⚠️ **Landmine recorded in the constant + the record:** NCDOR's rate page and ncleg's *codified* G.S.
  page both still showed the STRUCK 3.99% row at pin date. They will read as contradicting our table
  until they recompile — session law wins; do not "correct" it back.

### The dated ACA re-verify gate re-arms (rolling window, 2026-09-02)

`S` · **pilot** · filed 2× — `A26`, `S65`

- ACA's deadline is a **ROLLING** window (`verifiedOn` + `maxAgeDays: 30`), never an absolute
  `nextDue` — grepping `nextDue` to inventory deadlines silently misses it. Re-verified 2026-08-02,
  so it next reds **2026-09-02**.
- `AcaRecord` has no top-level `primarySources` array where `StateTaxRecord` requires one — the two
  record shapes should converge on the stricter one.

### The saved-record card claims the advice still holds when the couple never took it

`M` · **briggsy** · filed 5× — `A30`, `S1`, `S13`, `S31`, `S38`

- OPEN BLOCKER: the saved-record card still asserts "It still matches your plan as it stands today." while the door beneath it shows the household never executed the advice
- HIS EYE — the record card's strategy naming (half 2)
- S6 (f) HALF 2 — naming the strategy on the record card (a Briggsy ruling, not a build)
- ⚑⚑ RECORD CARD HALF (2) — naming the strategy on Cards 6-7 (Briggsy ruling, DO NOT PILOT-FIX)
- HIS EYE — the only thing blocking product progress (six open items)

### Well-funded household with a converting winner crashes into a calm "unavailable"

`M` · **pilot** · filed 2× — `A12`, `A18`

- Over-funded (≥98% survival) household whose winning strategy converts: generic "unavailable" or a calm-error, not a named refusal — and the code comments say this is unreachable when it is NOT
- R22/R9 — a leave-more surplus household with a conversion winner CRASHES to 'engine-unavailable' instead of an honest withhold

### Post-65 non-qualified HSA money is silently forfeited

`M` · **pilot** · filed 1× — `A24`

- R38 — the post-65 non-qualified HSA path is unrouted and its conservative forfeit is disclosed only in a code comment

### Long-term care is neither modeled nor listed as left out

`M` · **pilot** · filed 1× — `A48`

- Long-term care — the largest un-modeled retirement risk — is neither in the model nor in the OUT-but-disclosed list the product otherwise keeps religiously

### The staleness clocks — a false alarm today, and the state-tax arm parked

`M` · **pilot** · filed 4× — `S44`, `S45`, `S46`, `S47`

- ⚠️ Date-route ACA clock over-alarms — the FILED fix is WRONG, the real fix is still owed
- ⚠️ THE STATE-TAX AGGREGATE ARM — council-shaped, parked behind a trigger; DO NOT BUILD AS FILED
- Council fork: state-tax exposure — widen `pricedState` vs add a 7th `stateTax: ExposureRead` field
- Standing trigger — the state clock's unknown arm (unreachable in-build today)

### Annual tax-year roll on 2027-01-01 with no tripwire

`L` · **pilot** · filed 2× — `A27`, `S79`

- TAX_YEAR / COVERAGE_YEAR / CONTRIBUTION_YEAR annual roll — 2027-01-01, NO gate exists
- TWO UNPINNED GATES (incl. the dated 2027-01-01 tax-vintage tripwire)

### Pre-65 health insurance is priced with no cost growth, and the subsidy clawback is unmodeled

`L` · **pilot** · filed 2× — `A39`, `S25`

- Pre-65 ACA premiums are priced REAL-FLAT — the exact sin the Medicare council ruled solver-BLOCKING, with no trend, no oracle clause, and no disclosure
- Uncapped excess-APTC clawback — the gate never reads the field, and the copy call is unmade

### Mixed household — the already-retired spouse is priced at zero health cost while the other works

`L` · **pilot** · filed 1× — `A40`

- A mixed household's already-retired pre-65 spouse is silently priced at $0 healthcare during the working window — never asked about, never disclosed

### Unpriced states — a confident winner computed with zero state income tax

`XL` · **pilot** · filed 2× — `A14`, `A7`

- Household outside {NC, PA, FL}: the state-tax half of the answer is withheld and only disclosed in prose
- Deferred state-tax roster {SC, GA, DE} — and the 47 other unpriced states
- ⚑ The withhold machinery gates `solve()` ONLY — a withhold-only fix still ships a **state-blind
  headline / fuck-off date**. And the honest-withhold precedent this used to cite (the NC certification
  block) is **retired**, so a refusal arm must be built, not copied.
- Cheap partial: the 8 no-income-tax states are a sourced structural $0 (FL's exact shape), so widening
  to them is honest and leaves refusal for taxing states only.

### The recommendation tells a priced-state household we can't price their state

`M` · **pilot** · filed 1× — `A66` (found live in Chromium 2026-08-02, `?seed=nc`)

- `recDiscStateTax` (`src/ui/copy.ts:1531`) — *"Where we can't yet price a state's income tax, this
  compares federal tax only"* — is an **ALWAYS-ON** disclosure (`recommendationView.ts:75`, the one
  `DISCLOSURE_BUILDERS` entry with no condition). On an NC household it **contradicts the spine three
  inches above it**, which says *"Your North Carolina state income tax is reflected in these numbers."*
- **NOT a regression — newly REACHABLE.** Until the 2026-08-02 NC pin, no priced-state household could
  reach the recommendation surface at all (NC withheld; PA/FL had no seed path through it), so this
  sentence had never co-rendered with a priced-state spine.
- Direction is CONSERVATIVE (it understates our own capability), so it is not the cardinal sin — but a
  one-screen self-contradiction is cold-read blocker class.
- **The fix is not a copy tweak.** `SolveRecommendation` (`src/engine/solver/solve.ts:159-201`) carries
  NO retirement state, so the builder cannot gate on it today. Needs the priced state threaded onto the
  payload (engine + worker wire + tests), then `'state-tax'` returns `null` when the state is priced —
  the exact shape `heir-bracket`/`aca-slcsp` already use.

## Tier 1 — the differentiator does not land

### The assumed heir tax bracket — drives the "leave more" answer, cannot be seen or changed

`M` · **pilot** · filed 2× — `A23`, `A8`

- R7 — the assumed heir tax bracket drives the leave-more hero but is read-only and unpersisted
- The heir-bracket R7 editor — a solver assumption that moves the ranking and cannot be edited

### The third goal — "live bigger now" doesn't exist

`L` · **pilot** · filed 4× — `A15`, `A19`, `A9`, `S72`

- "Spend more now" household: the goal cannot be expressed, so the answer is aimed at a proxy
- R21 — only 2 of the 3 locked Tier-2 goals ship; 'live bigger now' does not exist
- `live-bigger-now` — the third recommendation goal, deferred past U15
- 3rd-GOAL UNIT (live-bigger-now)

### The `dateinvert` proof seed and the budget's state-adaptive second beat it gates

`L` · **pilot** · filed 3× — `S16`, `S54`, `S9`

- `dateinvert` (c) — the MINT half is unbuilt
- R27 `dateinvert` seed (c) — the inversion seed is OWED and is a SEARCH, not a mint
- `dateinvert` (c) — the MINT half, its own session

### U17 S7 riders — the comparison chart's missing dollar endpoints (Q7a) and the unspecified reorder (Q7b)

`L` · **pilot** · filed 5× — `A3`, `S18`, `S19`, `S21`, `S33`

- U17 S7 riders — Q7a (RecommendationViz endpoint dollars) and Q7b (the unnamed reorder)
- Q7a is filed on a FALSE gating premise — the spec must be amended before it is built
- Q7b has NO spec — defer or amend the spec first; not buildable as filed
- U17 S7 — DEFERRED by Briggsy's ruling
- Q7a must be re-filed as its own unit with a CORRECTED gate (S7 deferred)

### Modest pre-tax household refused a withdrawal-order answer the engine could compute

`L` · **pilot** · filed 1× — `A13`

- Modest-pre-tax household: refused a SEQUENCING recommendation the engine could actually compute

### The recommendation never names the winning strategy, the runner-up, or what to do

`L` · **pilot** · filed 2× — `A16`, `A20`

- R9/R10 — the recommendation never says what to DO (winning strategy is computed but never rendered)
- R23 — the runner-up is retained but never IDENTIFIED, and the 'why' is one content-free constant

### Date-route recommend-second parity — the working household gets no strategy at all

`XL` · **council** · filed 4× — `A1`, `A11`, `A17`, `S71`

- Date-route recommend-second parity gap — the entire still-working audience gets NO strategy recommendation, silently
- Not-yet-retired (working) household: the recommendation surface does not exist at all
- R10/R29 — recommend-second is entirely absent for a not-yet-retired (date-route) household
- DATE-ROUTE RECOMMEND-SECOND PARITY (+ Q1 survivalContext + heir bracket)

### The detail-door era — nowhere to see how a number was reached

`XL` · **briggsy** · filed 2× — `A4`, `S74`

- The "detail-door era" — the post-U16 unit that owns every filed detail-hunger residue
- THE DETAIL-DOOR ERA — its own post-U16 unit + walk

## Tier 2 — what breaks on someone else’s device

### The app on someone else's device — no icons, no Safari, no large text

`M` · **pilot** · filed 3× — `A46`, `A50`, `A54`

- The app has no icons at all — the "local-first PWA" is not installable and its tab/bookmark is unidentifiable
- No WebKit arm anywhere — the app is verified only in Chromium, while the vault's durability story is explicitly about Safari's eviction
- The one-frame honesty law is verified only at fixed pixel viewports — never at the enlarged text setting this audience actually uses

### Nothing a friend can read, nothing a professional can read

`M` · **pilot** · filed 2× — `A47`, `A52`

- The app orders the couple to "validate with a professional" and gives them nothing a professional can read
- There is no document a friend reads — every doc in the repo is written for the builder, and the in-app total is two sentences

### Intake shape — no single-person household, and no way to enter what you actually own

`L` · **pilot** · filed 2× — `A2`, `A21`

- "Just me" single-user (non-couple) household mode
- R37 — ticker/holdings entry was RETIRED from the shipped intake; the bundled blend table is dead code

### The surfaces a friend actually hits have never been walked or read

`L` · **pilot** · filed 7× — `A31`, `A32`, `A33`, `A36`, `A38`, `S42`, `S60`

- Every vault-credential ceremony — PassphraseStep, BackupStep, SaveFlow, ExportConfirm — has never been walked or cold-read by any oracle, and no dev seed reaches it
- RecoveryFlow and RestoreFlow — the two "I lost access to my retirement plan" surfaces — have zero coverage in the log and zero coverage in the harness
- Ten of thirteen intake steps have never been cold-read — including the ACCOUNTS step where the couple enters their entire net worth
- ColdStart — the first screen every new user sees — is entered by the walk but never captured, and never cold-read
- ViewOnlyBanner, UpdateToast and AppErrorBoundary render on every session and have never appeared in any bundle or card
- Post-ceremony landing announce is UNPROVEN — needs a real NVDA/VoiceOver pass
- THREE NEVER-COLD-READ FACES — fold into the S6/S7 aged-seed walk, never standalone (datesplit, datemixed, the save ceremony)

### The couple's own data — no draft saving, no format migration, no way to delete

`L` · **pilot** · filed 3× — `A45`, `A49`, `A53`

- An interrupted intake loses the entire household — no draft persistence, no resume, and the tool promises "about five minutes"
- The schemaVersion "migration ladder" does not exist as code — it is a refusal, so the first bump to v4 strands every saved plan
- No user-facing way to delete the vault — the couple's entire net worth cannot be removed from the device that holds it

### The solve lane — long runs, no cancel, and a silently frozen tab

`XL` · **pilot** · filed 3× — `A55`, `A6`, `S70`

- The main-thread engine fallback freezes the tab for the whole solve and never says so
- The WASM port — the measurement gate is BUILT and has fired; the port itself is deferred
- SOLVE LANE — cancel is dark + the deferred interactive tier

## Tier 3 — Briggsy’s call (taste, scope, one-way doors)

### The aged surface — every 2026 plan changes wording on 2027-01-01, unreviewed

`M` · **briggsy** · filed 1× — `S39`

- Mid-flight Roth conversion: engine re-anchoring unit + the withdrawn two-futures preview (Briggsy's call)

### The essentials median line on the band

`M` · **briggsy** · filed 2× — `A5`, `S26`

- The essentials median LINE drawn on the band
- The essentials median line — Briggsy's call; the pilot's filed recommendation is DO NOT BUILD as specced

### Two unruled honesty questions — the expiring-tax-law caveat and the per-strategy floor verdict

`M` · **briggsy** · filed 1× — `S73`

- PER-ARM FLOOR VERDICT — never ruled

### `doctorStaleVault` / what a two-year-old saved plan should mean on return

`L` · **briggsy** · filed 4× — `S20`, `S4`, `S41`, `S49`

- The `doctorStaleVault` defect — surfaced by the S6 plant, filed into UNFINISHED FIXES
- HIS EYE — ?vault=stale's MEANING ruling
- ⚑ `doctorStaleVault` breaks the PersonInputs model invariant and costs ?vault=stale its verdict — RULING FIRST
- `doctorStaleVault` invariant break — `?vault=stale` resolves BORDERLINE where fresh `retired` resolves ON-TRACK

### The charts' framing — whose range is shaded, which odds the ladder quotes, what the axis counts

`L` · **briggsy** · filed 6× — `A29`, `S2`, `S29`, `S30`, `S56`, `S64`

- The 2026-07-30 date-band FLIP shipped with its own council's binding ship gate undischarged — five faces changed, none cold-read since
- HIS EYE — the money-chart framing fork
- S6 (a) the two-odds collision on datesplit — rule it WITH Card 2, not ahead of it
- S6 (b) the money chart's essentials-world-under-a-lifestyle-headline — PARKED-FOR-BRIGGSY framing fork
- LONG-HORIZON BAND-SCALE SQUASH — his tone call on the honest-as-is squash, plus the latent U8 tier-persistence bug
- THE LADDER AXIS UNITS — a HIS-CALL fork, no prescription writable until he rules

### Budget product forks awaiting his ruling

`L` · **briggsy** · filed 3× — `S53`, `S66`, `S77`

- The scoped OOP-only `healthcare` budget category — PARKED for his eye
- ⚑ THE BUDGET HEALTHCARE-CATEGORY FORK — a one-way door the batched-oracle grant does NOT auto-clear
- ⚑ GATED — the budget's state-adaptive second beat

### Unscored Caddie tape rows plus the four aged-surface tone calls due before 2027-01-01

`L` · **briggsy** · filed 7× — `A28`, `A34`, `S34`, `S36`, `S5`, `S57`, `S58`

- Aged surface arms for real households — 2027-01-01 (tone calls still unreviewed)
- Sixteen tape rows sit unscored, and the two most recent walks have no tape row at all
- HIS EYE — the stacked tape rows plus the parked U17 aged-surface tone calls at the ?vault=datearrived walk
- HIS EYE — U17 tone calls on the stacked tape rows, deferred to the ?vault=datearrived walk
- HIS EYE — the stacked tape rows (07-15 → 07-23), which also score the Opus-vs-Sonnet Caddie flip
- HIS EYE — the stacked, unscored Caddie tape rows 07-08 → 07-23 (six sub-items a–f) + the standing O16 tape-watch
- THE AGED SURFACE — four tone calls at ?vault=datearrived, his eye due BEFORE 2027-01-01 (a dated deadline, not 'later')

### Parked tone residuals — survivor label, fold points, design-council leftovers, and the stale his-eye queue

`L` · **briggsy** · filed 3× — `A37`, `S55`, `S6`

- Card 12's residuals — the survivor label orphan and door 4's phone fold — were PILOT-CLEARED "with fixes filed" and the fixes did not ship
- Parked pre-grant tone cold-reads: the survivor fold + the design-council CF items (CF3/CF4/CF5/CF2) + two cosmetic design advisories
- HIS EYE — on-surface re-audit of the two Card 9 / GoalPicker fixes that shipped without it

### Caddie walk-and-chair debt on four changed or never-capturable faces

`L` · **pilot** · filed 6× — `S14`, `S15`, `S28`, `S35`, `S48`, `S8`

- The unchaired Caddie bundles — `?vault=rec`/`recold` four door sheets
- The unchaired Caddie bundle — the `datesplit` tier transient cold read
- NEW cold-read surface never looked at: the datesplit tier transient (a caveat that retracts itself)
- Cold-read + chair the date-window edge hedge (self-retracting caveat)
- Two S4 sentences have NO live cold-read path — the nameless aggregate and the reworded contribution line
- THE UNCHAIRED CADDIE BUNDLES — now actually walkable, must be re-walked

### Reading order and rhythm never graded — three refusals in a row, and the whole phone fold

`L` · **briggsy** · filed 3× — `S3`, `S32`, `S63`

- HIS EYE — the three-doors rhythm on ?seed/?vault datemixed
- S6 (e) THE RHYTHM HALF — three doors refuse in a row on datemixed (a tone call)
- THE PHONE-RHYTHM PASS — STANDING, OWED, never graded

### Armed copy and framing forks awaiting his ruling

`XL` · **briggsy** · filed 3× — `S59`, `S61`, `S62`

- BLOCKED, NOT DROPPED — the no-dollar compose face has no live witness; ultimately HIS call
- TWO ARMED COPY/FRAMING FORKS awaiting his read — the F3 legend dissent (O14) and the 'elsewhere' uncapped grade (O15)
- THE FIDUCIARY'S CURRENT-LAW-AS-WRITTEN CAVEAT — his yes/no, never a rider; unanswered since 2026-07-09

## Tier 4 — hygiene (no user-visible wrong answer)

### Health-constant riders — Medicare-trend fixes and pinning the out-of-pocket figures

`M` · **pilot** · filed 2× — `S69`, `S81`

- U15 / MEDICARE-TREND — three fixes riding the next healthOverlay/taxOverlay commit
- VERIFY-OWED — pin the OOP-medical figures to the primary BLS table

### Cold-read path debt — changed door sheets, unaudited fixes, and sentences with no way to be seen

`L` · **pilot** · filed 1× — `S40`

- ⚑ Roth door tone call routed to the Caddie panel, NOT pilot-fixed

### Unscored Caddie tape rows + the increment-4 residuals

`L` · **pilot** · filed 1× — `S76`

- CADDIE INCREMENT-4 RESIDUALS — move them out of TODO.md

### Open copy obligations — the research claim, the O-lane sentences, and the budget's sticky-essentials note

`L` · **pilot** · filed 3× — `S52`, `S75`, `S78`

- The budget sticky disclosure — `budgetModel.ts:22`'s "(flagged in TODO)" points HERE
- O-LANE COPY MECHANICS — each rides its surface's next touch
- THREE COPY OBLIGATIONS

### The gates that don't bite — registry depth, copy scope, colour probe, missing arms

`XL` · **pilot** · filed 14× — `A41`, `A42`, `A43`, `A44`, `S10`, `S11`, `S22`, `S23`, `S27`, `S43`, `S50`, `S51`, `S67`, `S68`

- R7's compile-enforced assumption registry is ONE LEVEL DEEP — the fix is named in its own comment as 'cheap' and deliberately not shipped
- The intake picker's never-color-alone signal is held by CSS text + a class-name assertion — no computed-style gate anywhere
- copyGuard's honesty gates are prefix-allowlist-scoped for FLAT keys with no forcing function on new ones — the same hole already fired once
- blockBootstrap's original tautology survives beside its own replacement
- The budget readout's min-block-size is a FLOOR, not the fixed height insight 035 claims
- The CVD crops prove PRESENCE only — the reader LENS is unautomated
- If the SS spousal-rate runtime withhold is ever revisited, it owes the `recHold*` control-scoped sweep
- Any future dated tripwire must NOT be worded as detecting enactment
- Missing regression arm: nothing pins fan-on ≡ fan-off with a budget present
- `appDefaultVersion` era arm has no BEHAVIOURAL witness until a second era ships
- False source comment (a) — `partBTrendVintage`'s "no exposure gate" clause in `model.ts`
- False source comment (b) — kill "the record stores the seed" in Plan 4 BEFORE S5 mints
- DEFERRED BUILD — the richer market draw: block-bootstrap + stochastic correlated inflation
- THE RICHER MARKET DRAW — block-bootstrap + stochastic correlated inflation

### Deferred engine builds and the missing regression arms

`XL` · **pilot** · filed 1× — `S80`

- SMALL-DEFERRALS BUCKET — nine items, each on its OWN trigger (scrub e2e · DateBand band · 2 AssumptionPanel · 5 small)

