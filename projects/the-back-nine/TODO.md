# The Back Nine — TODO

> **Actionable next-actions only.** No session history, no shipped-work record, no stat stamps — `git log`
> has the first, [`docs/roadmap.md`](docs/roadmap.md)'s You-Are-Here table has the second, and `README.md` +
> the roadmap carry the test count under `verify:doc-stats` (this file re-typing it rotted twice, so
> `d5df3609` made pointing the rule).
>
> **The full open register is [`docs/backlog.md`](docs/backlog.md)** — 42 open items, each traced to the raw
> obligations behind it. This file ranks only what is next; **a queue of ~16 is not the open surface, so
> read the register before filing anything as new.**
>
> ⚠️ **NEVER cite "TODO item N."** These numbers are re-ranked every session, so a citation written today
> silently resolves to a *different* live item later — worse than dangling. (Live examples: `council-log.md`
> and `cold-read-log.md` cite "TODO item 11" meaning the state-tax unit, shipped 2026-07-15; item 11 is now
> the heir-bracket entry. Others cite "item 0", which no longer exists.) Cite the register entry's **title**.

**Where we are:** all four acts are built; Act 4 closed at U17·S6 (S7 deferred, Briggsy's ruling). What is
left is not units. It is the gap between *the build is done* and *a friend can bet real money on this*.

✅ **Tier 1's *"The recommendation never says what to DO"* SHIPPED 2026-08-05** — the winning-plan card
names the crowned withdrawal order and the crowned Roth conversion, and stops. Witnessed live in real
Chromium at 1536×791 on two seeds. See that entry for what it settled and the ONE increment it left.

✅ **Tier 0 entry 1's *"retired spouse priced at $0 healthcare"* SHIPPED 2026-08-14** — intake asks the
employer-coverage premise and refuses the date when it cannot be priced. See that entry for the frame
defect it caught that the green suite could not, and the one EYE call it leaves.

✅ **Tier 1 entry 10's *heir-bracket seat* SHIPPED 2026-08-14** — the household sets its own heir
bracket, and three shipped comments that asserted a non-existent editability are corrected.

✅ **THE RECOVERY WALK SHIPPED 2026-08-14 — `RecoveryFlow` + `RestoreFlow` have now been rendered
for a human, end-to-end, at 1536×791 and 390×844.** Both happy paths were driven to completion
(recovery → new passphrase → hydrate; and a REAL backup file exported, the vault deleted, and the
plan restored onto the wiped device), plus the wrong-passphrase, wrong-word, too-short,
mismatch and recovery-collision error frames, and the U8 export ceremony on the way through.
Reach was confirmed exactly as filed — every anchor in the old REACH block held. Findings below.

⚑ **NO-SOLVE DRIVE RECIPE, so the next walk costs minutes not hours.** `?vault=rec` → Unlock
(passphrase pre-filled) → *"I forgot my passphrase"* → RecoveryFlow. Recovery word for every plant
is **`lattice harbor cinder vellum 48 thicket`** (`devSeeds.ts:1079`). For RestoreFlow you need a
real backup FILE and no full intake is required: unlock any plant → Result → **"Save a backup
file"** → *Download backup* (an `<a>` with a blob URL, **not** a button — a `button:has-text()`
selector misses it) → then delete the DB and reload. **`indexedDB.deleteDatabase` is BLOCKED while
the app holds the connection** — fire it, navigate to `about:blank`, then back; deleting and
reloading in one step silently leaves the vault in place and you land on Unlock wondering why.

✅ **THE ACA RE-VERIFY CLEARED 2026-08-20 — full 8-step chain, 7 parallel primary-source legs,
zero bot-walls.** Regime UNCHANGED (reverted; both temporary provisions still "before January 1,
2026"; ceiling still PL 119-102; tables re-typed and identical). The clock now reds ~2026-09-19
(dated row below). **What the pass changed:** the forward flip window MOVED — the Senate passed its
own clean CR (H.R. 6500, 90-6, 2026-08-08, §106(3) end date **2026-12-11**; zero ACA amendments
even filed), so the **Sept 14–30 CR endgame is the highest-risk attachment window and the next
re-verify (~Sep 19 due) lands INSIDE it — treat that one as hot, not routine.** Four enrolled bills
sit at the President (would become PL 119-103…106), all pre-swept clean — their signing is EXPECTED,
not a regime event; a FIFTH number ≥119-107 is what warrants a fresh sweep. Three fabricated/
overstated claims caught and stricken, incl. this record's own false 5-of-5 chain-check (seam 1's
2.10→3.14 is a genuine statutory discontinuity — do not "fix" a correct transcription against it).

▶ **START HERE NEXT SESSION: the two executable non-Briggsy items are** (1) the `?seed=buckets`
save + re-entry witness for the record card's advice-not-taken case (~25-min solve; the debt block
above), and (2) the next walk — the first-Save ceremony + the 10 unwalked intake steps including
**Accounts** (Tier-2 entry 11; the no-solve drive recipe above cuts the cost).

⚑ **EVERYTHING IN THE WALK-FINDINGS LIST BELOW IS BRIGGSY'S, NOT A BUILD.** Finding 2 is WITHDRAWN
(refuted same-day). Finding 1's copy pass is OFF (the string is true; only the door is missing, and
that door is a destructive council-sized decision). Findings 3, 4 and 5 each need his words or a
framing call. **Do not start any of them without him** — and do not re-derive the copy fix, the
withdrawal explains exactly why it would ship a false certainty.

**THE WALK'S FINDINGS, ranked — filed 2026-08-14, kept for the reasoning:**

1. **🔴 THE BACKUP DOOR IS PROMISED AND CANNOT EXIST — and the naive fix is a WORSE dead end.**
   `unlockWrongCredential` (rendered on BOTH Unlock and RecoveryFlow) ends *"the saved data may be
   damaged, and your backup is the way in."* The entry graph is a closed loop: `unlock →
   {began, recover}`, `recover → {began, unlock}` (`App.tsx:206-247`); `RestoreFlow` mounts ONLY on
   `restore-cold` and `damaged`, and `restore-cold` is reachable only from ColdStart, which requires
   an EMPTY vault (`App.tsx:145`).
   ⚑ **DO NOT "just add a door" to `restore-cold`.** `backup.ts:134-135` — `restoreVault` returns
   `{ok:false, reason:'vault-exists'}` when `loadVault().kind === 'vault'`, and its comment records
   that the AUTHORITATIVE check re-runs inside the serialized write (TOCTOU). A door would march the
   user through file → word → new passphrase (**two ~1s KDF derives**) and refuse at the end.
   ⚑ **The sentence is also mostly FALSE, which shrinks the real defect.** The backup file is
   decrypted with the RECOVERY WORD — the same credential RecoveryFlow uses. Have the word ⇒ recovery
   opens the plan and the backup is unnecessary; lack it ⇒ the backup is equally unopenable. A
   genuinely damaged vault never reaches Unlock (it auto-routes to `damaged` → RestoreFlow). **The one
   case where the sentence is TRUE:** ciphertext corrupt enough to fail decrypt but intact enough to
   pass `probeVault`. Closing THAT needs a pre-clear of an unopenable vault, which `RestoreFlow.tsx:8-12`
   records as **council-killed** (*"the one data-loss path this surface must never reintroduce"*).
   ⚠️ **AND THE COPY FIX IS OFF THE TABLE TOO — corrected 2026-08-14 while attempting it.** The
   sentence is CONDITIONED (*"If you're sure it's right…"*) and TRUE on the damage branch, where the
   backup's own `recoveryWrap` opens under the same word. `unlockCopy.test.ts:34-41` pins the both-ways
   hedge deliberately. So there is **no honest copy edit here**: the remedy named is real, and what is
   missing is the DOOR to it.
   **What actually remains is one thing, and it is HIS:** a household whose vault is subtly corrupt is
   told a TRUE remedy it cannot reach, because reaching it needs `clearVault` on an unopenable vault —
   the council-killed pre-clear. Size it as a destructive one-way door, not a copy pass. Briggsy picked
   "add the door" 2026-08-14 before `backup.ts:135` was traced — **that clearance is spent; re-ask
   against these facts.**
   ⚑ **The narrow, non-destructive increment that IS available** (unproven, size XS, still needs his
   word): the Unlock error names the backup but never the recovery word, and *that* door — *"I forgot
   my passphrase"* — is on the same screen. Naming it costs nothing and breaks no hedge.

2. ❌ **WITHDRAWN 2026-08-14, SAME DAY IT WAS FILED — I was wrong, and the shipped test is why.**
   Filed as: *"the error's 'your backup is the way in' contradicts the standing 'this same word also
   opens your backup file' — the escape needs the thing you just got wrong."* **It does not contradict.**
   The clause is CONDITIONED — *"**If you're sure it's right**, the saved data may be damaged, and your
   backup is the way in"* — and on that branch (word correct, local `recoveryWrap` ciphertext corrupt,
   GCM-indistinguishable) the backup carries its **own** `recoveryWrap` under that same word, so it
   genuinely opens. The two sentences describe the two branches of one honest hedge.
   ⚠️ **DO NOT "fix" this copy.** `unlockCopy.test.ts:34-41` pins the contract on purpose: both
   GCM-ambiguous failures share ONE both-ways hedge, *"never a key that asserts the credential is
   definitely wrong or the data definitely bad."* Dropping the damage clause — which is exactly what
   the withdrawn finding prescribed — would delete the damage-side hedge and ship a false certainty.
   **The lesson: a rendered frame is authoritative about what a user SEES and not about whether it is
   true. The cold read produced the suspicion; only the crypto path settled it.**

3. **🟠 Neither recovery NOR restore ever confirms it worked.** Both land byte-identically on
   *"Are these still your numbers?"* with no acknowledgement that the household is back in, and none
   that **the new passphrase is now the live one**. `App.tsx:235` passes `notice: null` on recovery and
   `:243` threads restore's — but that channel is the READ-ONLY caveat (`UnlockCopyKey`), null on a
   normal open, so there is no success channel at all. The person most recently burned by a credential
   is given no way to verify the replacement took. Needs a success-notice channel + Briggsy's words.

4. **🟡 The escape sits ABOVE the primary action, systematically, in the `save-actions` family** —
   RecoveryFlow (word + setNew), RestoreFlow (file + word + setNew), and the backup ceremony
   (*Not now* above *Finish*). Unlock and ColdStart get it right (primary first, escape below), so it
   is ONE DOM-order decision in `save-actions`, not six fixes. Framing call — his.

5. **🟡 The raw native browse button** on RestoreFlow's file step is the one place the craft visibly
   drops, on the screen where trust matters most. `save.css:131-132` protects *"the native control
   stays — only its frame is brought into the field system; the browse button is the browser's"* —
   but `::file-selector-button` restyles APPEARANCE without replacing the control, so that rationale
   does not block it. ⚠️ **The missing `accept` filter is NOT a defect — do not "fix" it.**
   `RestoreFlow.tsx:210-211`: *"a survivor's renamed/re-extensioned export must never be unpickable."*

⚑ **CHECKED ON THE FRAME AND CLEARED — do not re-file these.** Phone fold holds at 390×844 even with
the 3-line error rendered (content ends 611px of 844). The export ceremony's `Finish` is
`aria-disabled`, never native `disabled`. Unlock's error a11y and RestoreFlow's file-error a11y are
both textbook. Only console error on every route is the known favicon 404.

✅ **THE a11y HALF SHIPPED IN-PASS (`c327e011`)** — `PassphraseStep`'s three error channels now all
satisfy WCAG 2.2 SC 3.3.1; see the Tier-2 entry below for what it was and why a green suite could not
see it.

⚑ **THE RIDE-ALONG, RE-SCOPED — its dangerous half does not exist, and its filed prescription is
wrong.** Intake has no `beforeunload` (confirmed: the repo's ONLY registration is `SaveFlow.tsx:85`),
but the healthcare.gov step **already opens in a new tab** — `ExternalLink.tsx:6-7,16` states it was
made `target="_blank"` FOR this exact hazard. So the live-navigation version of the defect is not
real; what remains is lost typing, not a wrong answer. ⚠️ **The filed arm condition
`persist.kind === 'unsaved'` is WRONG**: `IntakeApp.tsx:295` `review()` re-enters intake with a
vault-hydrated draft while `persist.kind` stays `'saved'`, so the guard would be permanently disarmed
across the documented edit-and-re-save window — the one place real off-disk edits live. `BackupStep.tsx:11`
records a DELIBERATE omission; `SaveFlow.tsx:76-86` is the shipped template; the no-persistence-until-Save
hard rule means the honest fix WARNS, never persists.

⚠️ **Every "next build" here is a user-facing surface — load the four-skill UI loadout (CLAUDE.md)
before touching a pixel, and read a ⚑ block before trusting any line number in the prose above it.**

⚠️ **The 2026-08-03 verification debt, CORRECTED 2026-08-14 — it was overstated, and the half that
remains is narrower.** This block used to read *"the record card's HOLDS face has never been seen;
`?vault=rec` cannot show it."* **The FACE has now been seen** — `?vault=rec` renders
*"It still lines up with the numbers you've entered."* at 1536×791 (observed in passing while driving
the heir-bracket seat, which that plant also carries). The seed table said so all along
(`rec` · `recold` → *holds / superseded*); the debt note contradicted it.
**What `?vault=rec` genuinely cannot witness is the SEMANTIC case** entry 4 was about: its base is a
single $1.055M IRA, so every withdrawal order is the identical decumulation and no household can
visibly *not have taken* the advice. That still needs a save + re-entry on `?seed=buckets`
(~25-minute solve). **Read the debt as "the advice-not-taken case", never "the face".**
✅ **Free finding from the same drive:** editing an assumption demotes the record live —
holds → *"It may no longer fit the two of you."* The fingerprint staleness coupling is now
witnessed end-to-end, not merely asserted.

⚠️ **A REAL-BROWSER LOOK IS NOT OPTIONAL ON A COPY CHANGE, and 2026-08-05 proved it twice in one day.**
Two defects shipped past a fully green suite and died on the rendered frame: a heading whose *"there"*
had no referent, and a formatter quoting `~$140,000` for a $148,300 anchor. A third — the card telling an
aged vault its recommendation had *"started in 2026"* — needed a 20-agent review to surface, and a test
had been written PINNING it. **Read the frame as a user, not as the author of the assertions.**

⚠️ **`mode: 'no-change'` HAS FOUR DISJUNCTS, NOT ONE — this cost a real diagnosis 2026-08-03 and will
cost the next one.** `recommendationView.ts:175-180`: `noChange` **OR** the grade's `subTenthCollapse`
**OR** a seed-B display inversion **OR** a delta that formats to $0. So *"the surface says **You're
already on one of the strongest paths**"* is **NOT** evidence that `noChange` is true, and a browser
frame can be byte-identical before and after a change that genuinely flipped the flag. Read the payload,
never the words, when the question is about a flag.

---

## Dated — these fire on a clock

| Fires | What | What breaks |
|---|---|---|
| ~~NOW~~ | ~~NC FY2025-26 revenue certification~~ | ✅ **CLOSED 2026-08-02** — S.L. 2026-41 § 44.1(a) enacted the rate schedule *and* struck the trigger rows the certification fed. Withhold lifted, checkpoint retired. |
| **CI: ~2026-09-19 00:00 UTC** · **runtime: 2026-09-20** | ACA rolling window (`verifiedOn: 2026-08-20` + `maxAgeDays: 30`) — ⚠️ the due date lands INSIDE the Sept 14–30 CR endgame (the Senate returns ~09-14 against a 09-30 funding cliff; two clean competing CRs, House 12-04 / Senate 12-11), which the record names the highest-risk §36B attachment window — run that pass EARLY in the week of Sep 14 and read `forwardClock` first | **TWO dates, and the split is DELIBERATE — one date here was wrong (corrected 2026-08-14).** `verify:aca` compares float-ms so it reds ~a day EARLIER than the runtime clause's integer-epoch-day compare; `oracleToken.ts:174-176` records that ordering as the safe one. **And it is not only CI:** `evaluateAcaFreshnessClause` (`oracleToken.ts:189-198`) is a RUNTIME clause on the user's own browser clock — once overdue the shipped app WITHHOLDS the recommendation for any household carrying an ACA enrolled premium, and `healthSheetChrome.ts:126` flips the health-sheet status line. No deploy required. Clearing it is the 8-step `howToClear` (~1h, primary sources, both attest tables hand-RE-TYPED from the PDFs — never from `health.ts`, that bind goes circular) |
| **2027-08-02** | NC `nextDue`, `state-tax-nc-last-verified.json` (annual drift cadence now, not a pending event) | `pnpm verify:state-tax` reds → CI red |
| **2027-01-01** | `TAX_YEAR` / `COVERAGE_YEAR` / `CONTRIBUTION_YEAR` roll | ✅ **ARMED 2026-08-02** — `annualRoll.tripwire.test.ts` reds the suite (both arms mutation-proven). Clearing it is a **re-sourcing job, never a date bump**; `scaffold.smoke.test.ts:10-13` + `constants.shape.test.ts` red alongside by design |
| **2027-01-01** | Every organic vault crosses `elapsed ≥ 1` | The aged surfaces stop being dev-plant-only and go live on real households — **the four aged tone calls are due before this** |
| **2028-01-01** | IRMAA top-tier re-index tripwire | Test reds by design |
| **2034-08** | NC's successor flip event — the Office of the State Controller's FY2033-34 final accounting (trigger $40,258,000,000 → TY2035, 0.25pp step, 2.49% floor) | Nothing breaks; it is the only mechanism left that can move NC's rates, and it can only CUT |

⚠️ **The ACA deadline is a ROLLING window, never an absolute `nextDue`** — grepping `nextDue` to inventory
deadlines silently misses it. It has been filed a notch late twice, both times in the unsafe direction.

---

## Next, in priority order

> **Re-verified 2026-08-05 (third pass) — 14 agents, 7 verify→skeptic pairs. ALL SEVEN skeptics refuted
> their verifier on a material point,** and the queue's own block headed *"Anchors, all drifted"* had
> itself drifted ~80 lines in `copy.ts` (two of its four anchors landed on unrelated Medicare strings,
> one on a comment). Every anchor in entry 7 was re-opened and corrected before that build started.
>
> **The measured hit rate on filed prescriptions here is five-times-confirmed at ~25-40%.** Every ⚑ block
> dated 2026-08-03 or later is post-refutation; the prose above it is the original filing, kept so the
> drift stays visible. **Open every cited line before executing it.**
>
> ⚑ **Entries 2, 3, 5 (the account-total confirm) and 14/15 are BRIGGSY'S, not builds** — do not start
> them. Entries 1 and 10 are the two that are decided AND executable.
>
> ⚑ **The 2026-08-03 second pass** (16 agents) is what de-forked entry 6 and re-sequenced entry 7; its
> findings are folded into those entries. Entry 10 is still the only one no skeptic has ever refuted.

### Tier 0 — calm-but-wrong (shipped code can answer WRONG)

*The cardinal rule's own list. These are defects, not scope.*

1. ✅ **SHIPPED 2026-08-14 (`863747d6`) — the premise is ASKED now, and the answer it cannot price is REFUSED.**
   One yes/no step (`employer-coverage`, gated on the exported `anyRetiredPre65WhileAnotherWorks`),
   one additive-optional v3 field (`health.employerPlanCoversRetiredMember` — no version bump, no
   migration), and one arm in `missingRequiredFacts`. **The authority did not move** — no second
   "cannot answer" authority was minted.
   ⚑ **THE FILED PRESCRIPTION WAS WRONG ON THE FRAME, and the shipped `kindHsa` proved it.** Filed:
   fire the arm "when the fact is absent **OR false**". But that channel renders *"Still needed: X"*
   under *"The tool never guesses these — it prices only what you enter."* For the household that
   **answered** *"buying their own coverage"*, nothing is still needed and nothing they can type will
   ever clear it — a retry invitation that cannot succeed (7b's shape). `kindHsa` had **already
   shipped** under that frame: two spouses' HSAs rendered *"Still needed: HSA"* to a household that
   entered two. So `MissingFact` gained a **kind** (`absent` | `unrepresentable`), the two kinds get
   different words, and **`kindHsa` was re-tagged in the same pass** — the live defect fixed, not cloned.
   ⚑ **THE RENDERED FRAME CAUGHT A DEFECT THE WHOLE GREEN SUITE COULD NOT.** The strip led with
   *"Your answer takes shape as you go."* above a permanent refusal — a keep-going promise over an
   answer that is never coming. Every string was individually true. `answerWithheldLead` now leads
   when EVERY blocker is unrepresentable, and it is **route-neutral by necessity** (insight 101): its
   extension covers the two-HSA **spine** household, so it can never say *"your date"*.
   ⚑ **`?seed=date` WAS the broken household** — Alex 58 working / Sam 60 retired at 58, pre-65. Its
   own comment brags *"a pre-65 retiree so the ACA quote IS required"*, and the gate then threw that
   quote away. Seeded `true` (the premise the gate always silently assumed), so it still crowns
   *"about 8 years out — around 2034"*, unchanged. **New seed `?seed=datesolo`** is the false arm's
   only live drive; `devSeeds.test.ts` gained a `REFUSAL_SEEDS` map that asserts it refuses for the
   NAMED reason with NO incidental gaps — a skip-list with no counter-assertion is how a broken seed
   hides.
   ⚑ **WITNESSED LIVE** in real Chromium at 1536×791: `?seed=datesolo` renders the cannot-price
   block; `?seed=date` unchanged; and the question was walked **organically from ColdStart** through
   all three states (unasked → named as actionable · *"their own"* → refused · *"covered"* → clears),
   including the mixed frame where BOTH blocks render over their own facts. Gates: typecheck, lint,
   3273 tests, `verify:fit` (52), doc-stats, aca, state-tax, bundle.
   ⚑ **The false disclosure claim is swept.** `healthcareStreams.ts:18-21` said the residual was
   *"disclosed through the §0 channel, D2-owned"*. It was not — `METHODOLOGY_DISCLOSURES` carried
   five rows (market, longevity, survivor-ss, outlive-order, conversion-tax), **none healthcare**.
   ⚑ **STILL OPEN, and it is an EYE call, not a build:** `copy.ts healthQuoteHelp` (*"The tool splits
   it by age for each of you."*) was filed as CONTRADICTING the premise. It now reads directly above
   the new step, which states the working-window rule in its own words — so the contradiction looks
   resolved **by adjacency**. That is a tone/comprehension judgment on a rendered pair, so it belongs
   to the Caddie or Briggsy's eye; do not re-file it as a copy defect without a read.
   <details><summary>original entry — the diagnosis, kept for the reasoning</summary>

   **The mixed household's retired spouse is priced at $0 healthcare — so the date comes out too early.**
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
   ⚑ **2026-08-03 double-blind — the ruling is EXECUTABLE and the size came DOWN. Diagnosis re-opened
   line-by-line and every anchor is exact.** The blocker a first pass filed — *"the refusal channel does not
   exist and must be built from scratch"* — is **FALSE.** `missingRequiredFacts` (`intakeMap.ts:104-191`) is
   the shipped **ONE** authority (`memoryModel.ts:47`) and already carries two *present-but-unrepresentable*
   refusals of exactly this shape: `kindHsa` (`:187-188`, commented *"v1 model limitation, surfaced
   honestly"*) and `addAccount` (`:148-149`, pushed expressly to avoid *"an empty-missing dead-end"*). The
   wiring already runs: `intakeMap.ts:605` → `buildDateInput:1019-1020` returns null → `memoryModel.ts:717-726`
   idle/inputs-incomplete → `AnswerStrip.tsx:105-121` MissingList **names it**. So: **one new CopyKey + one arm
   in `missingRequiredFacts`** firing when the fact is absent OR false. **Never mint a second "cannot answer"
   authority.** Keep a `dateSearch.ts` guard only as the defensive mirror of the §0 `:389` pattern
   (unreachable in prod). **Export the gating predicate** so all three surfaces share it, or you take the R7
   break `intakeMap.ts:87-91` names. **Size M-L, not XL** — and `?seed=date` is **not** refused
   (`devSeeds.ts:127-181` answers YES), so the flagship demo survives.
   ⚑ Two more, found the same pass: `healthcareStreams.ts:18-21` claims the residual is *"disclosed through
   the §0 channel, D2-owned"* — **a false disclosure claim in code**, sweep it in-pass. And `copy.ts`
   `healthQuoteHelp` doesn't merely fail to disclose, it **contradicts** the premise: *"The tool splits it by
   age for each of you."* (Also: "13 intake steps" is the MAXIMUM — only **8** are unconditional,
   `questions.tsx:1147-1163`.)
   </details>

2. **Pre-65 ACA premiums are priced real-flat — the sin the Medicare council ruled solver-BLOCKING.**
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
   block would hold for months over the whole pre-65 population.
   ⚑ **2026-08-03 double-blind — the pricing defect is REAL and confirmed; the near-term copy move as filed
   was WRONG THREE WAYS.** (a) *"stop claiming the coupling is fully priced"* — **the coupling IS fully
   priced.** A conversion enters `nonSSordinary` → `acaMagi` (`healthOverlay.ts:99-101`) → `slidingScalePtc`
   → net premium, in both preview arms. The fault is the **closed "Not counted here:" list** omitting the
   held-price modeling choice, while the sibling health-sheet list (`copy.ts:945/951`) does name the
   benchmark. (b) *"priced real-flat"* **understates what IS modelled** — `escalateQuote` climbs with the
   age-rating curve (0.765 → 3.000 at 64). Only the **cost trend** is missing; the schedule is not flat, so
   **do NOT borrow `verdictResidualTail`'s "held flat in today's dollars"** — verbatim it is a NEW false
   claim on this surface. (c) the editable strings are **`copy.ts:895` and `:897`** (`894`/`896` are key
   names), and both must move together.
   ⚑ **The direction claim must be CLIFF-SCOPED, never blanket.** `healthOverlay.ts:222`+`:294` give
   under-cliff net = `enrolled − slcsp + contribution`, and `intakeMap.ts:581-582` scale **both** streams by
   the same `escalateQuote` factor — so under the cliff a missing trend is **zero** when E=S
   (`devSeeds.ts:577/578` = 4200/4200) and **reversed (pessimistic)** when E<S, which `copy.ts:209` invites.
   It bites one-way optimistic **only over the cliff** (`healthOverlay.ts:299-303`, full enrolled premium).
   The shipped sibling `recDiscAcaSlcsp` (`copy.ts:1567-1568`) hedges bidirectionally on this exact fact and
   `medicare-pricing-build-spec.md:43` bans the false unidirectional. Draft to append to BOTH strings:
   *"One modeling choice: these prices step up with your ages, not with the way plan prices themselves climb
   — so a conversion that crosses the income line could cost more than shown."*
   ✅ **BOTH XS WINS SHIPPED 2026-08-03** — the clawback gate (`a436caee`) and the false negation
   (`bd851f24`). The gate turned out to be **seven** undeclared fields, not one (`discriminatingProof`,
   `nothingEnactedChain`, `pendingExtension`, `retroactivity`, `adjacentButSharp`, `forwardClock`,
   `strickenCitations`) — all now declared + required, with array arms that reject `[]` (truthy) and
   blank links; mutation-proven against the shipped record. And `copy.ts:945/951` no longer list the
   benchmark premium as uncounted — it is the §36B PTC basis. **What REMAINS open here: the
   cliff-scoped disclosure sentence, and the withhold-vs-disclose fork below.**
   <details><summary>the two shipped XS entries</summary>

   - **Make the clawback field bite (XS, 4 touches).** `adjacentButSharp` appears ONLY at
     `aca-last-verified.json:41`; `AcaRecord` (`scripts/verify-aca-status.ts:40-72`) never declares it and
     `checkAcaStatus` (`:77-130`) never reads it — **inert prose, confirmed twice.** Declare the key after
     `:71`, push an emptiness problem after `:117`, add it to the `base` fixture at
     `scripts/__tests__/verify-aca-status.test.ts:13-37` (else `:42`'s `toEqual([])` reds), add the
     emptiness arm mirroring `:72-80`. ⚠️ **The "no `.github/` exists so `verify:aca` is local-only"
     clause this line used to carry was FALSE — corrected 2026-08-14.** CI exists and runs the FULL
     gate; the scoping error was looking inside `projects/the-back-nine/` when the git root is
     `ai-learning-journey`. See the CI note under "Standing cadences".
   - **A false negation on the health sheet (XS).** `copy.ts:945/951` list *"the benchmark premium itself"*
     under "Not counted here" while the entered benchmark **is** priced (`intakeMap.ts:582` →
     `healthOverlay.ts:213-223`) — the same false-negation shape O16 fixed on the Roth strings.
   </details>

   ⚑ **The open fork is his, and it is not the copy.** The Medicare council's standing law
   (`oracleToken.ts:117`) is *"disclose-and-ship is FORBIDDEN — a disclosure fixes a number, never a
   mis-ranking,"* written about exactly this shape. Does the pre-65 Marketplace population get the
   conversion ranking **with** the new disclosure (what the BLOCKED-ON-RESEARCH tag silently assumes), or
   does the token gain an **ACA pricing-mode clause** that withholds the ranking — as Medicare's did — until
   a sourced trend lands?

3. **A household outside {NC, PA, FL} gets a confident winner computed with zero state income tax.**
   Reduce-to-spine `+0` is keyed on `PRICED_STATES` membership, so an unpriced state ranks strategies with
   the state term absent — and that term is proven to **flip the optimal anchor** (U14's own NC oracle
   fixture moves it 22%→12%-top). Disclosed in prose only. Decide: refuse outside the roster, or widen it.
   **His scope call.** ⚑ Two corrections from the 2026-08-02 audit: (a) the honest-withhold precedent it
   used to cite — the NC certification block — **is retired**; (b) the withhold machinery gates `solve()`
   ONLY, so a withhold-only fix still ships a **state-blind headline / fuck-off date**.
   ⚑ **2026-08-03 double-blind — diagnosis CONFIRMED, and the "cheap partial" is not cheap and not sound.**
   Pricing is membership-keyed at `taxOverlay.ts:867`; `PRICED_STATES` is `constants/stateTax.ts:50`; the
   flip is pinned live at `optimalityOracle.test.ts:194-205` (NC crowns the 12%-top anchor, the state-absent
   twin the 22%-top). Correction (a) is **half-stale** — the `state-certification-pending` WithheldReason
   (`oracleToken.ts:48`), its humane string (`recommendationView.ts:272-273`) and the whole *held* card
   still ship and are tested; only the **live trigger** is gone, so a new arm is an addition, not a build.
   Correction (b) is **confirmed exact**: `mintOracleToken` has one live call site (`solveEntry.ts:179`),
   reached only via `engineApi.runSolve`; `engineApi.run` (`engineProtocol.ts:277` — headline/confidence)
   and `runDateSearch` (`:314` — the date) mint **no token**.
   ⚑ **The no-income-tax premise is FALSE for 5 of the 8, and it adds 7, not 8 (FL is already priced).**
   Only **FL, NV, TX** carry a broad constitutional ban. **TN**'s Art. II §28 (2014) bans payroll/**earned**
   income only — the Hall tax carve-out proves investment income sat outside it; TN's $0 on dividends is the
   statutory Hall repeal (eff. 2021). **AK** (repealed 1980), **SD**, and **WY** (voter-approval hurdle, not
   a ban) are statutory-only. **NH is a live re-enactment risk**, not a permanent $0: its I&D tax was
   repealed by HB 2 (2023) eff. **2025-01-01** — 13 months old for the modeled year — and a constitutional
   ban (CACR 13) was **defeated** in 2012.
   ⚑ **Real costs the partial omits.** `verify-state-tax.ts:111` loops `PRICED_STATES`, so **every state
   added is a new annual red-build gate with its own `nextDue`** (FL already carries one). Per state:
   `model.ts:317` STATE_ROSTER · a sourced(0) constants entry + profile · `copy.ts` `stateOption<X>` +
   `verdictResidualState<X>` (the exhaustive switches at `stateTaxDisclosure.ts:47-60` and `:122-134` fail
   `tsc` until written) · `recommendationView.ts:252-256` · the intake picker **4 → 11 vertical arms**
   against `verify:fit`. Engine cost is genuinely near-zero (`stateTax.ts:132` structural early return).
   ⚑ **The filed "every saved vault decodes Corrupt" blocker is FALSE — do not act on it, and do NOT loosen
   the compile tie.** `_V3FieldsCover` (`model.ts:2241-43`) covers only `keyof ScenarioV3`;
   `checkStateTaxVintageV3` (`scenarioCodec.ts:541-546`) is hand-written and compels no `needString`. Safe
   because `scenarioCodec.ts:782-783` gates `retirementState` via `needVocab(STATE_ROSTER)`, so no
   pre-widening vault can *be* a household in a newly-priced state. The prescribed remedy — loosening
   `stateTax.ts:427-431` — would **re-open the exact hole that tie was minted to close** (`:421-25`).
   ⚑ **His call, sharpened:** does the refusal reach the **headline + date** (`engineProtocol.ts:277`/`:314`)
   or stop at the strategy? Gating only `solve()` leaves a state-blind first answer for everyone off the
   roster; gating all three blanks the product's magic moment for **~86% of US households**. Widening to the
   no-tax seven moves coverage ~14% → ~27%, of which **Texas alone is two-thirds** — so *which of your
   friends' states actually matter* may make the fork moot. Landmines for the refuse arm: insight-081's
   degenerate overlay ($0 portfolio) builds no overlay and would read as unpriced (**false refusal**), and
   the state step is deliberately **non-blocking** (`questions.tsx:569-575`), so refusing on ABSENT walls
   every household that skipped it.

4. ✅ **SHIPPED 2026-08-03 (`bd851f24`) — the record card no longer implies the household acted.**
   `copy.ts` `recommendRecordHolds` now reads *"It still lines up with the numbers you've entered."*
   (50 chars, width MEASURED under `verify:fit` — `standing bottom=774`, slack 17, one line). It claims
   conjunct 1 (fingerprint identity) and nothing else, and a defending comment — there was none — states
   what it does NOT claim and **bans every "nothing has moved" universal-negative form**. Kept below as
   the record of the reasoning; do not re-open.
   <details><summary>original entry</summary>

   **The record card says the advice still holds when the household never took it.**
   `copy.ts:1315` — *"It still matches your plan as it stands today."* On `?vault=rec` the saved winner is
   `taxable-first` with `noChange: false` (`devSeeds.ts:1322`; the winner literal is at `:1308`) while the
   live order is labelled proportional. Cold-read Card 8 grades it HARD-FLAG/BLOCKER. Its sibling was fixed
   in `532cad82`; this arm was not. **Naming the strategy is Briggsy's ruling (#15) — the contradiction is
   not, and can be closed by dropping the execution claim without naming anything.**
   ⚑ **Audit correction 2026-08-02:** "door 2 one flick below labels the order proportional" is **wrong** —
   that literal is one tap DEEPER (`SequencingControl.tsx:173`, which does hold up) and in the panel at
   **`AssumptionPanel.tsx:388-392`** (`:375-378` is the spend-period segment), so the single-frame co-render
   claim does not hold as filed.
   ⚑ **2026-08-03 double-blind — READY TO SHIP, no ruling needed. Every anchor above had drifted and the
   first-pass replacement sentence was itself rejected.** The live string is **`copy.ts:1338`** (`:1315` is
   `recommendSavePending`); `noChange: false` is `devSeeds.ts:1330` and the winner literal `:1316`. It
   renders at `RecommendationSurface.tsx:276` via `Result.tsx:81` → `recommendationSaveView.ts:305-308`.
   **`:1309-1313` is `recommendSaveHintCeremony`'s comment — nothing defends the holds line today, so the
   fix must ADD a comment, not rewrite one.**
   ⚑ **The defect is REAL and on stronger ground than filed, but "false on its own terms" is NOT
   established.** `drawdownPolicy` **is** in the fingerprint (`intakeMap.ts:623` → `buildSpineParams:645-648`;
   `solverRunFingerprint.ts:130`; `solveAnchor.ts:224`), so a household that **acts** on a sequencing
   recommendation fires `inputs-changed` and gets the **superseded** card. The *holds* face is reachable only
   for a household whose sequencing has **not** moved: **taking the advice demotes the memory; ignoring it
   earns "It still matches your plan."** That is the sin — the invited inference in the rosy direction — not
   a literal falsehood ("your plan" means entered data everywhere else in the register).
   ⚑ **The obvious replacement is BANNED.** *"Nothing has moved since then that would change it"* is a
   **universal negative the three conjuncts cannot support** — broader and rosier than the sentence it
   replaces. The fingerprint **excludes constant vintages by design** (`savedRecommendation.ts:19-20`);
   `blendMoved` is deliberately absent from `rulesMoved` (`staleness.ts:627-628`), so a table bump can leave
   params identical while the same session's gate line says *"We can't tell from here whether it touches your
   own numbers"*; and `staleness.ts:54-58` names an engine-domain blind spot outright. **Ban every
   "nothing has moved/changed" form.**
   ⚑ **Ship this string** — it claims conjunct 1 **only** (the sole computed guarantee) and drops the
   plan-as-intention / plan-as-entered-data ambiguity that produces the on-track inference:
   **`'It still lines up with the numbers you've entered.'`** (50 chars — inside the proven 54-char ceiling
   at `copy.ts:1370-1374`; vocabulary already in the register at `copy.ts:1380`; pronoun-consistent with the
   superseded sibling at `:1375`). The ADDED comment must state both what the line claims (fingerprint
   identity) **and** what it deliberately does not (un-clocked constant/engine-domain drift; that anyone
   executed anything). **Never cite `noChange`** — `select.ts:326` compares the winner to the conventional
   baseline's provenance, never to the entered `drawdownPolicy`. Verify width under `pnpm verify:fit` (the
   `rec` HOLDS face is gated at `e2e/vertical-fit.spec.ts:1878-1884`); guessed widths are banned.
   ⚑ `?vault=rec` **cannot witness this** — its base is `retiredOnTrack` (`devSeeds.ts:951`), a single
   $1.055M traditional IRA, so `taxable-first` and `proportional` are the identical decumulation. **No
   multi-account witness plant exists**, and another open register entry is blocked on the same gap.
   </details>

4b. ✅ **SEED MINTED 2026-08-03 — `?seed=buckets`.** Three real buckets (pre-tax $700k + brokerage $450k
   with a $150k embedded gain + Roth $200k) on `retiredOnTrack`'s unchanged 66/65 couple, inheriting the
   `proportional` default. Pinned through the REAL builder + REAL engine at the shipped fast counts
   (`devSeeds.test.ts`): `noActionBaseline.id === 'baseline:proportional:0'`, with non-vacuity guards on
   bucket count and policy so a later "simplification" fails loudly instead of passing for the wrong
   reason. **Mutation-proven** — re-anchoring `solve.ts` reds it. Carries **no regime knob**, so the C3
   re-tune-on-drift law does not bite: the displayed baseline is the household's own order whatever wins.
   ✅ **DRIVEN END-TO-END IN REAL CHROMIUM 2026-08-03 at 1536×791 — the verification debt on entry 6 is
   PAID.** `?seed=buckets` → GoalPicker → leave-more → committed recommendation. It renders *"You're
   already on one of the strongest paths we tested"* under *"Compared with your plan today"*, which is
   **the fix stated in one frame**: this household's own `proportional` order IS the winner, so the old
   conventional-keyed `noChange` would have been FALSE and the surface would have shown an ACTIVE dollar
   hero urging them to switch **to the plan they are already on**, measured against an arm labelled
   "your plan today" that was not theirs. Only console error on the route is the missing favicon (the
   known Tier-2 no-icons item). **This is also the first LIVE `noChange` witness the repo has ever had**
   — `devSeeds.test.ts` carried a note saying one was unachievable; corrected in place, since its
   premise was about the OLD meaning of the flag.
   ⚑ **MEASURED: the dev solve took ~25 MINUTES, not ~11.** The landmine figure below was taken on the
   single-bucket `?seed=nc`; a three-bucket household is materially slower (CPU pinned on one core the
   whole time — checked twice, so this is compute, not a hang). Budget accordingly.
   ⚠️ **Entry 4's record card — RE-SCOPED 2026-08-14, this bullet was overstated.** It used to say the
   HOLDS face "was not seen" and that `?vault=rec` "cannot show it either". **`?vault=rec` renders the
   HOLDS face** — *"It still lines up with the numbers you've entered."*, observed at 1536×791 (see the
   corrected debt block at the top of this file). What that plant cannot witness is the **semantic**
   case: a single $1.055M IRA makes every withdrawal order the identical decumulation, so no household
   can visibly *not have taken* the advice — which is the whole point of entry 4. **That** still needs
   a save + re-entry on THIS seed.
   <details><summary>why it had to exist</summary>

   Confirmed 2026-08-03 by walking every seed: **no dev seed could witness a withdrawal ORDER
   mattering.** `retiredOnTrack` (and therefore `rec`/`recold`/`surplus`) holds ONE traditional
   IRA, so every order is the identical decumulation; `surplus` adds a $3M IRA but still one bucket at
   t=0; `?vault=rec` renders a HAND-PLANTED payload (`headlineStatisticB: 0`, no solve at all).
   **Requirements:** ≥2 buckets at t=0 (pre-tax + taxable with a basis, ideally + Roth), a
   `drawdownPolicy` that is NOT `taxable-first`, and a household whose crown is a SEQUENCING arm rather
   than a conversion. Then the baseline re-anchoring (entry 6) and the record card (entry 4) become
   eyeball-verifiable, and the register's own "no multi-account witness" blocker closes with it.
   ⚑ The crown requirement turned out to be **unnecessary** — the displayed baseline is the household's
   own order regardless of what wins, so the seed needed no tuning and carries no drift knob.
   </details>

5. **Smaller, each self-contained** *(all four re-anchored by the 2026-08-02 audit)*:

   - **Post-65 non-qualified HSA money is silently forfeited.** ✅ The false *"(conservative, disclosed)"*
     claim at `healthOverlay.ts:747` is **corrected 2026-08-02** — it now says the direction is safe but
     the disclosure does **not** exist, and asks whoever adds it to fix the comment in the same change.
     **The disclosure itself is still OWED** (candidate home: the new "What this leaves out" section below).
   - **Account balances have no magnitude sanity rule** while spend and PIA each got one (real range
     `sanity.ts:51-74`). ⚑ **Size is M, not S, and a ceiling is the wrong instrument:** a 10× slip on
     $500k is $5M — a perfectly coherent household, so no threshold catches it. The shape that works is
     **one confirm on the household TOTAL** at the accounts step (the figure the engine actually consumes),
     reusing the running total already rendered at `copy.ts:1664` / `questions.tsx:974-980`.
     ⚑ **"Briggsy sets the number" is the WRONG ask — there IS no honest number** (every total is
     coherent, so any threshold is the guessed plausibility band burned/062 bans). The only rule that
     invents nothing is an **unconditional** one-tap confirm for any household with ≥1 account. That is a
     friction-vs-honesty **framing fork**, and it is his.
     ⚑ Mechanism: `valueToday` has **no `touched` entry anywhere** (`AccountEntry.tsx` uses the form-local
     `'account.valueToday'`, not `accountField(i,…)`), so a per-account rule could never fire today — a
     synthetic household-total `FieldPath` is not optional.
   - **Long-term care is neither modeled nor in the OUT-but-disclosed list.** ⚑ Recommended home: a new
     third *"What this leaves out"* section in the assumptions panel. The R13 disclaimer is the wrong
     home and is vertical-fit pinned.
     ⚑ **2026-08-03 double-blind — both defects HOLD; the filed shape and the drafted tone were both wrong.**
     Anchors drifted +14: the two `<section className="ap-section">` opens are **`:331` and `:463`**, close
     `:742`, footer `:748`. **It is NOT data-only** — `METHODOLOGY_DISCLOSURES` rows render *inside* section
     a's single `<ul>` (`AssumptionPanel.tsx:426-458`), so an entry there lands in "On your behalf". A third
     section is **~18 lines of new JSX** mirroring `:463-467`, + 1 heading and 2 line keys in `copy.ts`'s
     `assumption*` block (hedge/verdict-EXEMPT at `:1043-1053`; avoid `copyGuard.ts:243`'s
     `/(tap|draw|pull) … hsa/`), + **no CSS change** (`.ap-section*`/`.ap-row*` are generic). **Fit is safe
     and gets safer:** the panel scrolls (`sheetShell.css` `.control-sheet` 88dvh/94dvh, `overflow-y:auto`)
     and the fit gate's panel arm (`vertical-fit.spec.ts:1098-1127`) asserts only that the dialog box fits
     **and** `scrollHeight > clientHeight` — content growth makes the second assertion *more* true.
     ⚑ **The drafted HSA sentence would have DENIED the very forfeit it discloses — do not ship "stays
     put" / "simply sits."** The balance is not parked, it is **destroyed**: `taxOverlay.ts:1812-13` sets
     `buckets = EMPTY_BUCKETS` (hsa: 0) → `simulate.ts:1730` `terminalHsaReal = 0` →
     `objectiveHeadline.ts:58` bequest contribution **$0**. On the exact path the sentence names, the HSA
     adds nothing to the leave-more dollar the reader sees. **The sentence must say the balance is DROPPED.**
     ⚑ **Sweep BOTH stale comments in the same commit** — `healthOverlay.ts:747-750` (which says
     fix-or-it-re-rots) **and** `taxOverlay.ts:1803-1805`, which still calls post-65 HSA-as-ordinary-income
     *"a DISCLOSED non-feature, the survivor-SS class"* — the same false claim, in the file that **owns** the
     mechanism.
     ⚑ **The genuine ruling here is scope, not wording** (tone is Caddie-chair under the batched-oracle law):
     **NIIT is not homeless** — `recommendationView.ts:78` emits it on *every* committed recommendation
     (rendered `RecommendationSurface.tsx:477-486`) and `controlHealthOmissionsNote` carries it on the
     Healthcare sheet. So: ship the section with only the two genuinely-homeless items (HSA forfeit + LTC),
     or make the panel section NIIT's canonical home and prune the other two — the repo's own
     one-honest-home-per-fact law (`healthSheetChrome.ts:333`) forbids a silent third.

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

6. ✅ **SHIPPED 2026-08-03 (`2652b7a6`) — the hero is measured against the household's own plan now.**
   `solve.ts` displays `search.userBaseline ?? search.conventionalBaseline`; the delta skew moved with
   it; `noChange` re-anchored and **compares PLANS, not indices** (`sameDecumulationPlan` — the injected
   user baseline is always a strategic duplicate of some grid arm unless the policy is `custom`, and
   ties resolve toward the incumbent, so index equality would have told a household already running the
   winner that we recommend a change). The shrinkage prior + incumbent tie-break **stayed** conventional
   (Council Q3). `SOLVER_CODE_VERSION` 1→2 because `noChange` is persisted. All four copy strings became
   true with **no rename** and now carry the coupling. **Both arms mutation-proven**; goldens untouched
   (oracle fixtures take a fallback that is the old test verbatim).
   ⚠️ **RUNTIME NOT EYEBALLED — see 4b.** Proven at the engine seam through the real token/oracle/grade
   path and every gate, but no dev seed can render a case where the two arms differ. Kept below.
   <details><summary>original entry</summary>

   **The hero says "Compared with your plan today" — and the baseline is never their plan.** *(Found
   2026-08-03 by the verification fleet; filed nowhere before.)* `copy.ts:1458` (and the viz arm label
   `copy.ts:1537`) name the compared-against arm as the household's own plan. It is not: `noChange` is
   `winner.index === conventionalIndex` (`select.ts:313`), and `conventionalIndex` is the FIXED
   `taxable-first`/conversion-0 candidate, *"NEVER the user's custom baseline"* (`select.ts:324`/`:329`);
   `solve.ts:500` displays that arm. `search.userBaseline` (`search.ts:179`) is computed and **consumed
   nowhere.** So for any household whose entered order isn't `taxable-first` — **including the default
   `proportional` draft** — the dollar hero is measured against a plan they never chose, under a label
   saying it is theirs.
   ⚑ **2026-08-03 double-blind — CONFIRMED end-to-end, WORSE than filed, and it is NOT a fork: it is a
   regression against a ratified acceptance criterion.** `plans/4-recommendation.md:190` (and `:166`) already
   ruled *"the rendered delta is current→recommended, **never** conventional-default→recommended."* Briggsy
   is needed only to **reverse** that spec, not to choose. Pilot fixes it.
   ⚑ **Four shipped strings carry the false referent, not two** — and the two the entry missed are the
   load-bearing ones: nameplate `copy.ts:1481`, viz arm `:1571`, and **the hero slots themselves at `:2332`
   and `:2336`** ("than today's plan"). Anchors: `noChange` is `select.ts:326`; the NEVER-the-user's-baseline
   comment is `:337`/`:342`; the displayed arm is `solve.ts:501`, the skew `:594`.
   ⚑ **Second false surface:** `noChange = winner === conventionalIndex`, so a **proportional** household
   whose real recommendation is *to switch* hears `recComposeAlready` — *"You're already on one of the
   strongest paths."*
   ⚑ **The fix has two anchors doing two different jobs — do not move both.** **KEEP conventional** for the
   shrinkage prior (`select.ts:202-207`) and the incumbent tie-break (`:248`): `council-log.md:17` Q3
   ratified it and `select.test.ts:589-597` is the purpose-built mutant-#4 killer (*"the user's habit is not
   laundered into advice"*). Flipping those would let a household's own habit win near-ties — *stay put* as a
   NEW calm-but-wrong. **RE-ANCHOR to `search.userBaseline`** (fallback conventional when absent) in exactly
   three places: the displayed arm `solve.ts:501`, the delta skew `:594`, and `noChange` `select.ts:326`
   (its own `userIndex`). Ranking is unmoved, so `caseNoChange` + the goldens **survive**;
   `select.test.ts:597`'s `noChange: true` flips — **re-derive it, never delete it.**
   ⚑ **Still bump `SOLVER_CODE_VERSION` 1→2** (`solverCodeVersion.ts:36`): `noChange` is **persisted**
   (`SavedRecommendationV3.noChange`, whose own doc says *"winner IS the conventional prior"*) — a fifth
   false surface. Every saved record invalidates. Then `copy.ts:1481/1571/2332/2336` become **true with no
   rename**.
   ⚑ `?vault=rec` could never have caught this: it renders a **hand-planted** payload
   (`devSeeds.ts:1315-1342`) whose arms all carry `headlineStatisticB: 0` — no real solve, no dollar hero.
   (Filed same-day at `docs/backlog.md:94-112` with the same drifted anchors — newly filed, not unfiled.)
   </details>

6b. ✅ **SHIPPED 2026-08-03 (`94ea8d00`) — the OTHER coupled control. Entry 6 fixed one of the plan's
   two tax controls; this is the half it left behind.** `enumerateCandidates` had **no field in which a
   conversion could be expressed**, so the injected user baseline was minted `conversion: null`
   unconditionally and `applyCandidate` strips the base's schedule — for a household running the
   shipped Roth lever, the arm four strings call *"your plan today"* was their order with their
   conversion **DELETED**, a different "today" from the one the spine band directly above it draws from
   the same draft. `draft.rothConversion` now threads `solveDispatch` → `enumerateSolveCandidates` →
   the baseline arm, present-iff-the-base-run-carries-it. The baseline stays **UNSCREENED** by the
   grid's legality filter by design (it is their standing plan, already simulated on the spine).
   `SOLVER_CODE_VERSION` **2→3** — unlike v2 this genuinely **moves the ranking**. Three mutants
   planted and killed.
   ⚑ **MEASURED, full precision, real builder + real engine, `?seed=health` (the repo's ONLY
   already-retired seed carrying an applied lever, $20k/yr × 4):** pre-fix `noActionBaseline.id =
   baseline:proportional:0`, `noChange = true`, delta **$0** — the surface reassured a household whose
   actual recommendation is to take their conversion back out. Post-fix `baseline:proportional:20000`,
   `noChange = false`, delta **$12,530**. *The tool was comparing them against the fix.*
   ⚑ **The visible frame did NOT change, and that is not a failure** — the $12,530 collapses at display
   precision (both arms render "$2.3M"), so `subTenthCollapse` routes it to the same compose words. See
   the four-disjunct warning at the top of this file. **The proof is the payload, not the pixel.**
   ⚑ **A silent scope change was caught in-flight and closed in the same commit:** `solveDispatch`'s
   `no-pretax` gate now screens on `anchoredRail`, which is what it MEANT before the baseline could
   carry a conversion. A bare `conversion !== null` let the unscreened baseline satisfy a gate that
   exists to prove the SOLVER has a rail-anchored grid to perturb. Mutation-proven both ways.

### Tier 1 — the differentiator does not land

7. ✅ **SHIPPED 2026-08-05 (`db371655` + the ladder fix) — the recommendation names the plan now.**
   The winning-plan card sits in `.rec-committed__rest` under the baseline nameplate and states the
   crowned plan CONTROL BY CONTROL: the withdrawal order (the sequencing sheet's own `leverPolicy*`
   label + gloss) and the Roth conversion (the shipped `rothPlanEcho` slot). No door — Briggsy's ruling.
   **A SETTINGS LIST, NOT AN INSTRUCTION LIST**, which is what kills panel problem 2 (the crowned
   conversion REPLACES theirs, so "also/alongside" is a false implicature) and what removes the need for
   any imperative the advice-verb gate would ban.
   ⚑ **ACTIVE REGISTER ONLY — and that scoping settled panel problems 1, 3 and 5 by CONSTRUCTION.**
   ACTIVE ⇒ `noChange` false ⇒ `sameDecumulationPlan(winner, userBaseline)` false ⇒ the crowned plan is
   provably NOT the household's own ⇒ the winner is a GRID arm. So its amount is rail-anchored (the
   floor is safe), its window is horizon-clamped at offset 0 (no unbounded `years`), and `custom` is
   unreachable (so `leverPolicyCustom`'s first-person "My own order" can never render as the
   recommendation) — no branches to write, no third bucket vocabulary to mint. The full proof lives on
   `winnerActionView` (`recommendationView.ts`).
   ⚑ **The dialects are now split by PROVENANCE, and this was a real hole.** `formatActionableDollar`
   floors unconditionally on the premise that the household's own amount is "already round" — nothing
   enforces it, so quoting a typed $43,617 as "$43,000" on a card whose nameplate says *"your plan
   today"* is the `94ea8d00` misquote family one decimal down. New `formatEnteredDollar` renders a
   figure THEY entered exactly; a figure WE propose still floors.
   ⚑ **TWO DEFECTS THE REAL FRAME CAUGHT THAT EVERY GREEN TEST MISSED** (the reason the walk is not
   optional): (a) the first heading, *"How this plan gets there"*, had **no referent for "there"** — and
   the anaphora it leaned on is broken by the nameplate sitting between the hero and the card; now
   *"What this plan does"*. (b) `formatActionableDollar` inherited the delta hero's **$10,000 top step**,
   so a conversion anchored at ~$148,300 rendered *"~$140,000"* — **up to $9,999 a year across a
   nine-year window of the crowned move, discarded by a display choice** and unrecoverable by a reader
   who types what they are shown. Step size does not affect SAFETY (flooring a monotone metric clears
   its rail at any granularity), so the shared ladder bought nothing. Ladder now stops at $1,000.
   ⚑ **WITNESSED LIVE** in real Chromium at 1536×791 @2.5 DPR, full precision: `?seed=retired`
   leave-more renders the ORDER row only (the 16k crown carries no conversion — the 256-path probe's did,
   so **precision moves the crown; never quote a fast-count figure as seen**), and `?seed=surplus`
   renders BOTH rows — *"Low-tax room first"* + *"Converting ~$148,000 a year for 9 years, starting in
   2026."* Five mutants planted and killed.
   ⚑ **THE ONE INCREMENT LEFT: the no-change register still does not name the plan.** A household on
   `?seed=health` + pay-less-tax reads *"You're already on one of the strongest paths we tested"* and
   never learns WHICH path. Deliberately out of scope: the proof above holds only in ACTIVE, so the
   no-change arm needs the `custom` branch (with a THIRD ui bucket map — `SequencingControl`'s is
   intake-private and `reentryChrome.ts:47`'s points at different strings) and different words, since
   `mode === 'no-change'` is NOT "the winner is the plan you run" (it also fires on a seed-B display
   inversion and a $0 collapse). **No seed produces a `custom` winner**, so that branch would ship
   unwitnessable — mint the seed first or leave it.
   <details><summary>original entry</summary>

   **The recommendation never says what to DO.** `recommendationView.ts:410` computes `winnerStrategyKey`;
   repo-wide it has **exactly two other references — its own type declaration and one unit test.** Zero
   render consumers, and `RecommendationSurface.tsx` contains no strategy name anywhere. The hero is a bare
   dollar delta (`copy.ts:2297/2301`); the winner's conversion amount and years render nowhere; there is
   **no apply seam** back into the sequencing or Roth sheets. R23's runner-up is the same story — `why` is
   one static sentence (`copy.ts:1497`) naming neither arm, while `runnerUpId`/`policy` sit unused on the
   payload.
   ⚑ **Audit 2026-08-02 — take the instruction-card arm, NOT a store write.** Writing the winner into the
   draft changes the solver fingerprint and would **instantly demote the recommendation the household just
   accepted** — the mechanism is `invalidateStaleSolve` (`store/memoryModel.ts:658-664`) fired by `update()`
   at `:679`, **not** `recommendationView.ts:289-290` (a comment banner). Name the winner and point at the
   sequencing sheet; no apply-seam mutation.
   ⚑ **2026-08-03 double-blind — WAS blocked on entry 6; ENTRY 6 SHIPPED (`2652b7a6`), SO THIS IS NOW
   THE TOP OF THE QUEUE.** The block was real: rendering `alreadyYours` — or even just **naming the
   winner** — to a `proportional` household would have painted the winner beside an ACTIVE hero reading
   *"Keeps about $X more … than today's plan"* under *"Compared with your plan today"*, one card with two
   contradictory claims. Naming the winner is precisely what made entry 6's false baseline
   reader-visible. **That contradiction is gone**: the hero now compares against the household's own
   plan and `noChange` tracks whether the crown IS their plan, so `alreadyYours` and the strategy name
   are both truthful. Take the render half.
   ⚑ **Worse than filed, in the good direction: conversions rank LIVE.** `taxOverlay.ts:916`
   `PART_B_PRICING_MODE='trended'` + sourced `medicareCostTrend` ⇒ `enumerateWithheldConversionLevers`
   returns `[]` ⇒ the **whole roster ranks** (`solve.ts:456-461`), and `select.ts:296-298` calls a
   converting winner *"the natural outcome."* So `winner.conversion {annualAmountReal, startYearOffset,
   years}` is a **live modal case that renders nowhere.**
   ⚑ **Anchors — RE-OPENED AND CORRECTED 2026-08-05 (the block below had itself drifted ~+80 lines in
   `copy.ts`, and two of its four anchors landed on unrelated Medicare-extras strings).** `winnerStrategyKey`
   is declared `recommendationView.ts:188` and built `:440` (**`:409`** is `deltaFigure`; `:410` is blank);
   the hero slots are **`copy.ts:2414` `recDeltaLeaveMore` / `:2418` `recDeltaPayLessTax`** (`:2331/2335` are
   `medicareExtrasFact*`; `dateInYearsNow/Past` are **`:2372`/`:2379`**); **`recRunnerUpWhy` is `copy.ts:1599`**
   (`:1520` is a comment) and `recComposeAlready` — the no-dollar hero this card must not contradict — is
   **`copy.ts:1575`**; there is **no `runnerUpId` on `SolveRecommendation`** (that field is on `SolveWithheld`)
   — the unused values are `payload.runnerUp.id`/`.policy`.
   ⚑ **Two hard gates on the render:** `anchoredRail` is **absent from `SolveArm`** (`solve.ts:98-113`), so
   "why this amount" needs engine work — omit it; and **no calendar anchor rides the payload** — derive via
   `draft.startCalendarYear` + `rothPlanStartFor`, never a re-based offset. Space is ~90-120px inside
   `.rec-committed__rest`, which is `display:contents` single-column and a real flex column at the two-pane,
   so a new child needs **no** grid rule.
   ✅ **BRIGGSY RULED 2026-08-03: NAME IT, NO DOOR.** The card states the winning strategy and stops —
   no control into the sequencing/Roth sheets, because following the pointer fires
   `invalidateStaleSolve` and demotes the very card that pointed there. **Do not re-propose the door.**
   (Original fork, kept for the reasoning: act → demote → re-solve, vs name-with-no-door.)

   ⚑⚑ **DESIGN PANEL 2026-08-03 (4 proposals × 3 adversarial judges, 16 agents): NO PROPOSAL WAS
   SHIPPABLE AS WRITTEN.** Five problems, every one of which a naive "just render `winnerStrategyKey`"
   would have shipped. **Build against these five, not against the prose above.**
   1. ✅ **CLOSED (`9527067f`) — the quoted amount would have crossed the cliff.** Grid conversion
      amounts are `largestWholeDollarWithin(metric, rail, …)` (`candidates.ts:229-238`), the largest
      whole dollar keeping an ACA-cliff / IRMAA-step / bracket-edge metric AT OR UNDER its rail; every
      shipped dialect rounds to NEAREST, so an anchored $43,600 renders "$44,000" — $400 past the rail,
      to a reader who can type it into the Roth lever. **Use `formatActionableDollar` (`money.ts`) for
      this figure. Never `formatDeltaDollar`/`formatAbsoluteDollar`.**
      ⚑ **2026-08-05 — THE FLOOR IS ONLY SAFE ON THE *WINNER*, AND ONLY IN THE ACTIVE REGISTER. Applying
      it to the BASELINE's amount writes a NEW false claim** of exactly the family `94ea8d00` closed.
      `formatActionableDollar` floors UNCONDITIONALLY (`money.ts:90-95`) on the stated premise that "the
      household's own (already round) amount" makes the floor a no-op (`money.ts:81-82`) — **nothing
      enforces that**: `RothLever.tsx:54` takes any finite positive number and `fields.tsx:37` accepts a
      decimal fraction, so a typed $43,617 would render "$43,000" — a $617 downward misquote of their own
      figure, on a card whose sibling nameplate says *"your plan today."* Safe on the winner because
      ACTIVE ⇒ `noChange` false ⇒ `sameDecumulationPlan(winner, userBaseline)` false ⇒ the crowned plan is
      NOT theirs ⇒ it is a grid arm, and every grid amount is rail-floored. **So: quote the winner's
      amount; state the baseline's conversion RELATIONALLY (present/absent/different) without re-quoting
      its dollar** — which also dodges the second-vocabulary problem, since their own figure already has
      one honest home in `slots.rothPlanEcho`.
      ⚑ Two false sentences in that docstring to sweep in-pass: `money.ts:68-69` says flooring is *"THE
      ONLY DIFFERENCE FROM formatDeltaDollar"* (also `Math.max(0,…)` vs `Math.abs`, and the sub-step
      fallback — pinned live at `money.test.ts:194`), and `money.ts:69-71` says *"Every conversion amount
      the solver proposes is built by `largestWholeDollarWithin`"* — the **ACA arm** is a closed-form
      floor (`candidates.ts:285` → `flooredOrNull` `:220-223`) and the **user-baseline arm has no rail at
      all** (`candidates.ts:427`, unscreened).
   2. **The winner's conversion REPLACES theirs — it does not add to it.** `applyCandidate`
      (function at **`candidates.ts:453`**; the strip is **`:467`**, the re-install **`:483`**; `:443` is
      a doc-comment line) strips the base's conversions before installing the candidate's. So
      "alongside"/"also" framing is a false implicature. **The card must read
      `payload.noActionBaseline.conversion` and state a DIFF** — five arms: neither converts · winner
      only · baseline only · both-and-different · both-and-same. (Reading the baseline's conversion is
      only *possible* since `94ea8d00`; before it, that field was always null.)
      ⚑ **2026-08-05 — the five-arm partition is INCOMPLETE, and the obvious gate is the wrong one.**
      (a) Amount equality is not plan equality: the grid's window is FIXED (`solveAnchor.ts:208`
      `{startYearOffset: 0, years}`) while the baseline carries the household's ENTERED window
      unscreened, so "both convert $20,000" can be two different schedules — a **sixth arm** (same
      amount, different start/duration). (b) **Do NOT gate the conversion sentence on
      `sameDecumulationPlan`** — it short-circuits on POLICY first (`candidates.ts:164`), so a
      byte-identical conversion under a different order returns false and the card would announce a Roth
      change that isn't happening. Compare the three `RothConversionPlan` fields directly. (c) A
      **seventh** arm: the winner arm IS the baseline arm (identical plan, zero delta) — but that is
      `noChange`, i.e. the no-change register, not an ACTIVE diff.
      ⚑ `solve.ts:461`'s conversion-0 filter is a **dead branch today** (its ternary condition at `:458`
      is true on every live dispatch — `solveDispatch.ts:91` refuses the run unless a rail-anchored
      conversion candidate exists, and the trend clause clears). It is a forward landmine, not a shipped
      fact — do not file it as a live defect.
   3. **The DURATION carries the same defect the start year was rejected for.** `conversionWindowFor`
      (**`solveAnchor.ts:201-208`**) measures `years` from the plan's BUILD year, and the live window pins at
      offset 0 — so on an aged vault the window has partly elapsed. Refusing the start year while
      quoting "for 6 years" is inconsistent. **Decide both together.** Shipped voice for the past
      tense: `copy.ts leverRothAlreadyApplied`.
      ⚑ **2026-08-05 — DECIDED SHAPE, and there is already ONE honest home: don't author a second.**
      `slots.rothPlanEcho` (**`copy.ts:2176-2179`**) is the shipped duration vocabulary — *"Converting
      ~$X a year for N years, starting/started in YYYY."* — and it clears the gates only by accident of
      wording (`~` satisfies require-hedge; "Converting" escapes `advice-verb`, which bans the base form
      `convert` clause-initially, `copyGuard.ts:250-256`). **Reuse its grammar.** The tense comes from
      `rothPlanStartFor(anchor, offset)` (**`bandAnnotations.ts:130-135`** → `{year, passed}`), which
      needs the plan clock: `planClockAnchor(...)` is already minted one component up as `dateAnchor`
      (`Result.tsx:175-179`) but is **not** threaded to the surface — seat it in **`RecommendationViewOpts`**
      (`recommendationView.ts:291`), the same bag as `spineConfidence`/`pricedState`, never as a raw
      prop read in JSX.
      ⚑ **Do NOT copy `leverRothAlreadyApplied` verbatim** — its final clause promises *"taking it back
      out is still available below,"* a control that does not exist on the no-door card; its own comment
      makes promising-only-what-exists the reason it was worded that way.
      ⚑ **CLAMP the duration.** `years` has **no upper bound** anywhere (codec checks integer ≥ 1 only,
      `scenarioCodec.ts:477-480`; the lever field has no max) and the engine truncates at the horizon
      (`model.ts:249`). Only the GRID window is horizon-clamped (`solveAnchor.ts:207`). So a
      user-baseline arm can carry a nominal 40 years against a 25-year horizon — quote the PRICED
      length, and never render `startCalendarYear + years − 1` as a span end (it would name a year the
      engine never simulated).
   4. **Gate on the render mode, NOT on `noChange`.** `mode: 'no-change'` has four disjuncts
      (`recommendationView.ts:175-179` is the DOC COMMENT; the disjuncts are computed at **`:372`**
      `isNoChange`, **`:382-385`** `winnerDisplaysAhead`, **`:401`** `deltaCollapsesToZero`); gating the
      card on `noChange` alone paints it on three arms where `recComposeAlready` already says *"nothing
      else we tried looks likely to pull clearly ahead."* **Use the same predicate the hero and the viz
      use.**
      ⚑ **2026-08-05 — the predicate has a NAME: `noDollar` (`recommendationView.ts:407`).** It is the
      single const behind `deltaFigure` (`:409`), `heroLine` (`:411`), `mode` (`:437`) and `viz` (`:456`);
      at the surface its only visible form is `view.mode` (already read that way at
      `RecommendationSurface.tsx:200`).
      ⚑ **But `mode` is NOT "the winner is the order you already run" — and that matters for the card's
      WORDS, not just its gate.** `noDollar` also fires on the seed-B display inversion and the
      $0-collapse, where the crowned plan genuinely DIFFERS from the household's. So a card that gates
      on `mode === 'no-change'` and speaks *"the order you already run"* would be false on two of the
      three no-dollar arms. **Read `payload.noChange` for the WORDS; use `view.mode` only for the
      register.** (Both are needed — this is why a single boolean cannot drive this card.)
   5. **`custom` must never render as "My own order"** (`leverPolicyCustom`, `copy.ts:795`) — a
      first-person radio caption inside a card whose whole job is saying what the order IS.
      `SolveArm.drawdownOrder` is on the payload (**`solve.ts:106`**; `:105` is its comment — present iff
      `policy === 'custom'`, runtime-enforced both ways at `candidates.ts:417-422`); name the buckets with
      the shipped `leverOrderBucketTaxable` / `…Pretax` / `…Roth` labels (**`copy.ts:802-804`**).
      ⚑ **2026-08-05 — a `custom` winner is reachable in EXACTLY ONE register, and it is the no-change
      one.** `custom` is excluded from the searched grid (`candidates.ts:65-67`), so the only custom
      candidate in the set is the injected user baseline; if that candidate is crowned,
      `sameDecumulationPlan` compares it with itself ⇒ `noChange` true ⇒ `noDollar` ⇒ `mode:'no-change'`.
      So the custom branch never renders beside an ACTIVE dollar hero, and there the honest words are
      *"the order you already run"* — not a neutral strategy name. `noActionBaseline` can be custom too
      (`solve.ts:516`), so the same bucket-list treatment is owed wherever the card names "your plan today."
      ⚑ **The bucket map must be NEW, not imported.** `SequencingControl.tsx:54`'s `BUCKET_LABEL` is
      module-private **and in the intake layer**, which `src/ui` does not reach into (`money.ts:6-7`
      states the convention). `src/ui` already has a *different* bucket map pointing at *different*
      strings (`reentryChrome.ts:47` → `copy.ts:1213` *"Pre-tax accounts — 401(k), 403(b), traditional
      IRA"*), so this would be the **third** — declare it in `recommendationView.ts` against the shipped
      `leverOrderBucket*` keys and pin it, or the second-vocabulary risk is live.
      ⚑ `WINNER_STRATEGY_KEY` (`recommendationView.ts:243-249`) is an exhaustive
      `Record<DrawdownPolicy, CopyKey>` — its own comment says a new policy fails `tsc` there — so the
      `custom` row **cannot be deleted**. Branch in the composer (a discriminated view field), and pin the
      custom arm: `recommendationView.test.ts` has **zero** custom coverage today (`:231` pins
      `taxable-first` only).
   ⚑ **Reuse, never re-type:** the order half is the sequencing sheet's own shipped `leverPolicy*`
   label + its `leverPolicy*Help` gloss (`copy.ts:784-796`). A new name would be a second vocabulary.
   (Note the SIXTH key one line past that range — `copy.ts:797` `leverPolicyCurrentTag: '— your current
   order'` — picker-only, second person, also wrong inside the card.)

   ⚑⚑ **SECOND VERIFICATION PASS 2026-08-05 — 14 agents, 7 verify→skeptic pairs, every cited line
   re-opened. All 7 skeptics refuted their verifier on a material point.** Four findings above are new;
   these five are structural and decide the build shape:

   **(i) THIS IS NOT A RENDER-ONLY TASK, and the payload must not be read in JSX.**
   `RecommendationSurface.tsx:4-5` declares itself *"A DOWNSTREAM RENDERER (insight 020) … NEVER
   re-derives anything."* The whole `SolvePayload` **is** in scope on the props (`solve` is a
   `SolveAnswer` whose committed arm carries it, `memoryModel.ts:292`) — so nothing *stops* a raw read;
   the law does. `RecommendedView` (`recommendationView.ts:173-218`) carries `winnerStrategyKey` and
   **nothing else about the strategy** — no conversion amount, no offset, no years, no order. So the
   build is: **new view fields + builders in `recommendedView()` first, JSX second.** The shipped
   precedent is `winnerStrategyKey` itself, minted in the composer.

   **(ii) THE COPY-KEY NAME DECIDES THE GATES, AND BOTH OBVIOUS NAMES ARE TRAPS.** Scope is a bare
   `startsWith` (`copyGuard.ts:71`/`:129`). `recStrategy*` / `recWinner*` / `recRoth*` match **neither**
   `VERDICT_KEY_PREFIXES` (`:63-65`) nor `CONTROL_KEY_PREFIXES` (`:102-116`) — so a plan-moving dollar
   would ship green past **both** free-numeral and require-hedge (live precedent for an unscoped `rec`
   key: `recSeeRunnerUp`). Nothing forces a new key into a scope: the scope tests are hand-listed names,
   not a catalog sweep. **Pick a prefix already in `CONTROL_KEY_PREFIXES`, or add the prefix AND a canary
   at `copyGuard.test.ts:920-931`.** Every figure must ride a **slot** (`copy.ts:1749`) with a matching
   `SLOT_RENDER` sample — `Record<keyof typeof slots, …>` makes a missing sample a **compile** error, and
   `copyGuard.test.ts:587` reds too. And `advice-verb` is **universal**: clause-initial
   `convert`/`withdraw`/`draw`/`spend` is banned (`copyGuard.ts:250-256`) — that is why every shipped
   gloss is third-person (*"Spends the brokerage account down…"*). Write in that voice.
   Inline strings are ESLint-fenced in **three** selectors — visible text **and**
   `aria-label`/`aria-description`/`placeholder`/`alt`/`title` (`eslint.config.js:87-101`, proven
   non-vacuous by `copyFence.test.ts`); the committed beat already carries a catalog aria-label
   (`RecommendationSurface.test.tsx:276`), so budget one.

   **(iii) NOTHING AUTOMATED CAN MEASURE THIS CARD — and the fit gate will go quietly stale.** There is
   no exclusion *rule* to remove: `vertical-fit.spec.ts:390-401` is a comment, and every `.rec-committed`
   arm **injects hand-typed HTML** (`:474`, `:558`, `:674`, **`:1984`** — four sites, not three) because a
   live solve is 80–200s against a 120s budget. Those strings assert they are *"the verbatim
   `RecommendationSurface.tsx` render"* (`:632-633`), so **adding a child without updating them turns a
   green gate into a lie.** Update the injected strings in the same commit. The *"~89px headroom"* figure
   does **not** apply here at all — that is the idle frame; `confidence.css:404-406` records that the
   committed frame **scrolls by design**, so vertical room is not the constraint. The real geometry fork:
   a child of `.rec-committed__rest` auto-flows in both registers (`display:contents` in one column;
   flex column at ≥68rem **only when a `.rec-viz-box` is a direct child** — i.e. ACTIVE mode), whereas a
   direct child of `.rec-committed` auto-places into an **implicit third grid row** the viz's
   `grid-row: 1 / -1` does not span. **Seat it inside `__rest`.**

   **(iv) THE ACTIVE WITNESS IS UNPROVEN — `?seed=surplus` may be exactly the state the engine
   WITHHOLDS.** `select.ts:333-350`: in the **surplus regime**, a converting winner over a
   NON-converting runner-up routes to `kind: 'withheld'` (`demotion-axis-uncalibrated`) — and its own
   comment calls that *"the NATURAL outcome for a well-funded leave-more household,"* which is what
   `surplus` is. No shipped assertion anywhere pins `winner.conversion !== null`
   (`devSeeds.test.ts:813-816` pins `noChange === false`, which a bare POLICY difference already
   satisfies). Both record plants mint hand-built payloads with `conversion: null`. **So before the
   conversion half is built, run a vitest probe through the real builder + real engine at the shipped
   fast counts** — the `?seed=buckets` pattern — to find (or mint) a seed that yields an ACTIVE
   recommendation with a non-null winner conversion. Building the render first risks designing a card
   for a frame the engine never emits.

   **(v) The persisted record cannot reproduce the timing.** `savedRecommendationMint.ts:114-122` stores
   only `candidateId` + `policy` (+ `drawdownOrder` iff custom), and the id encodes the conversion's
   **annual amount only** (`candidates.ts:135-136`). A re-opened saved record therefore has no
   `startYearOffset`/`years` to re-render. Decide what the card shows on re-entry before shipping the
   timing clause.
   ⚑ Also true, and useful: `formatActionableDollar` has **zero consumers today** (`money.ts:90` + its
   test only) — this card is its first. And `anchoredRail` is a discriminated union of **objects**
   carrying the rail's dollar (`candidates.ts:112-115`), not a string union; it lives on
   `CandidateStrategy` and is **dropped** at `armOfB` (`solve.ts:232-236`). Surfacing "just under the ACA
   cliff" would need **five** seams widened — `SolveArm`, `armOfB`, `SolveArmWire`, `packArm`
   (`engineProtocol.ts:180-189`, the one that silently drops), `armFromWire`. Out of scope; omit the why.
   </details>

7c. **The crowned conversion is anchored to the plan's BUILD year, so on an aged vault it cannot be
   enacted as priced.** *(Found 2026-08-05 by the ultramode review — seven lenses converged on its COPY
   symptom; this is the cause underneath, and it is engine-level.)* `conversionWindowFor`
   (`solveAnchor.ts:201-208`) returns `{ startYearOffset: 0, years }`, and offset 0 is the plan's build
   year. A household who saved in 2026 and re-solves in 2029 is therefore crowned a window whose first
   three years are already gone — and **`RothLever`'s `complete()` refuses a passed start**
   (`RothLever.tsx:53-56`), so the one control that could apply the recommendation rejects the very year
   it was priced from. ✅ **The card no longer LIES about it** (`rothPlanRanked` makes no commencement
   claim on the passed arm) — but the recommendation is still not enactable, and the reader is not told
   so. **Do NOT fix this in copy**: the honest repairs are engine-side (re-anchor the window to the wall
   year, which moves the ranking and needs a `SOLVER_CODE_VERSION` bump, or refuse to crown a conversion
   whose window has partly elapsed). Both are real ranking decisions. Witness: any `?vault=`-aged plant
   driven to a committed ACTIVE recommendation.

7b. **`?seed=failing` mint-fails — the bad-news household gets a "something went wrong" card.** *(Found
   2026-08-05 by the witness probe; filed nowhere before.)* Both goals return
   `{kind:'mint-failed', stage:'stability'}` with detail *"perturbation arm VACUOUS: the +1,000
   conversion perturbation left the varied candidate's own decision surface byte-identical — nothing
   moved, so sibling-identity proves no decoupling (insight 029)"*. `recommendationView` routes a
   mint-failure to `kind:'unavailable'` → `recommendUnavailable` (*"We couldn't work out a
   recommendation just now — adjust a number, or re-open this, to try again"*), which invites a retry
   that **cannot succeed**: the household is failing, so the perturbation is inert by CONSTRUCTION, not
   transiently. Same family as `e7bf0485` (the well-funded household whose best move was a conversion),
   opposite end of the distribution. **Reproduce in seconds, not a browser walk** — drive
   `DEV_SEEDS.failing` through `buildSolveRequest` → `engineApi.runSolve` at `paths: 256`,
   `_gradeMinPaths: 50` (the `devSeeds.test.ts` `solveWitness` pattern). Decide whether an inert
   perturbation on an already-failing household is a MINT failure at all, or a typed refusal with its
   own honest words.

8. **The whole still-working audience gets no strategy — silently.** `Result.tsx:476` gates
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

9. **A modest-pre-tax household is refused a withdrawal-order answer the engine could compute.**
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

10. ✅ **SHIPPED 2026-08-14 (`2816d036`) — the heir bracket is the household's now.**
    The `heir-bracket` seat is a radio over the statutory ordinary ladder **derived from
    `ordinaryBracketsMFJ`** (never re-typed), gated on `chosenGoal === 'leave-more'`;
    `ScenarioV3.heirBracket` is additive-optional and `solveDispatch` reads
    `draft.heirBracket ?? solverAssumedHeirBracket.value` (`??`, never `||` — an explicitly chosen 0
    is a real household). **The "adjust it in your assumptions" clause is restored in the same
    commit**, and its comment now records that the coupling runs BOTH ways.
    ⚑ **Every filed warning held; the codec's reason was STRONGER than filed.** The closed vocabulary
    means no `sanity.ts` rule was needed at all — and because `afterTaxBequestPerPath` throws outside
    **[0, 1)**, the codec gate uses an **EXCLUSIVE** upper bound rather than `needUnitFraction`,
    which admits `1`. Mutation-proven: loosening `>= 1` to `> 1` reds the `1` case.
    ⚑ **One thing nobody filed: the goal gate REDS the R7 completeness walk.** That walk renders two
    fixtures and demands every registry seat appear, so a goal-gated seat needs its own leave-more
    fixture shipped alongside it.
    ⚑ **THE FRAME CHANGED THE CONTROL.** It shipped `vertical` (copied from the state picker) — wrong:
    `vertical` is for long labels that cram, and these rungs are three characters. Seven stacked rows
    burned ~340px of a scrolling panel; horizontal is **165px**, reads as the ordered ladder it is,
    and matches the sibling period toggle. Phone measured **45×44 CSS px** per segment (clears WCAG
    2.2 SC 2.5.8's 24×24).
    ⚑ **PROVEN LIVE, not believed** — `?vault=rec` carries `chosenGoal: 'leave-more'`, so it drives
    the seat with no solve. 24% pre-selects from the constant; moving it to 37% demoted the saved
    record from *"It still lines up with the numbers you've entered"* to *"It may no longer fit the
    two of you."* **The fingerprint staleness coupling works end-to-end with zero new wiring.**
    ⚑ **Three shipped comments stopped lying:** the `solverAssumedHeirBracket` docblock, its citation
    string, AND its note all claimed "R7-editable (recommendationView.ts registry)" / "the user
    overrides it" — false for six months, inside the constants provenance. All three now name the
    PANEL (the registry NAMES the disclosure; the panel HOMES the editor, insight 058), as do the two
    "inline editor lands later" notes. **The editor is not coming inline** — that is deliberate.
    <details><summary>original entry — the prescription, kept for the reasoning</summary>

    **The assumed heir bracket (0.24) — the shipped copy sends the reader to a control that does not exist.**
    ⚑ **The filed claim ("cannot be seen or edited") is HALF FALSE, and the truth is worse.** It IS
    disclosed — `recommendationView.ts:78-81` → `copy.ts:2352-2353` → `RecommendationSurface.tsx:469-477` —
    and the sentence ends *"— adjust it in your assumptions if that's off."* **There is no heir seat in
    `assumptionRegistry.ts` or `AssumptionPanel.tsx`** (grepped 2026-08-02: zero rows). A dead-end
    instruction is worse than silence — it was **live**, visible in the 2026-08-02 `?seed=nc` capture.
    ✅ **XS half SHIPPED 2026-08-02** — the dead-end clause is gone; the sentence states the assumption and
    stops. **(M) still OPEN:** the real editable row. ⚠️ The copy's own comment carries the coupling —
    **restore the "adjust it in your assumptions" clause in the SAME change that ships the seat, never
    before it.**
    ⚑ **2026-08-03 double-blind — the ONLY entry whose skeptic could not refute it. Fully decided, ZERO
    engine change, ~10 source + 3 test + 3 doc files. Ready to build.** `0.24` is
    `solverAssumedHeirBracket` (`engine/constants/solver.ts:126`), read once at `solveDispatch.ts:82`;
    `heirBracket` **already threads** as `SolverRunRanking.heirBracket` (`solve.ts:402`, `select.ts:141`,
    `objectiveHeadline.ts:47-58`) — only its **source** moves.
    ⚑ **"Line-for-line template" is the one trap: `survivorSpendingRatio` is a REQUIRED v3 field seeded from
    the app-default era — copying that shape BRICKS every existing vault at `needFinite`.** `heirBracket`
    must be **additive-optional**: `model.ts` beside `chosenGoal` + `SCENARIO_V3_FIELDS` (the 4 shape ties do
    the rest) · `memoryModel.ts` **optional** Pick block `:160-191`, **not** the required block `:193-202`,
    and **no seed** in `createMemoryModel` (absence = took our default) · `scenarioCodec.ts` guard beside
    `chosenGoal` `:828-830`, **range-gated [0,1)** not merely finite (a persisted `24` is in-range garbage
    that throws at `objectiveHeadline.ts:49`) · `solveDispatch.ts:81-82` →
    `draft.heirBracket ?? solverAssumedHeirBracket.value`.
    ⚑ **The seat:** `assumptionRegistry.ts:39-60` + a disposition at `:107-183` (both compile-forced) · a new
    Row after `AssumptionPanel.tsx:362`, gated `chosenGoal === 'leave-more'` (no-hollow-door) · a
    **`SegmentedControl` over the statutory ladder, NOT a `PercentField`** — a closed vocabulary cannot reach
    the `>= 1` that throws, so `sanity.ts` stays untouched (survivor-ratio needed it). Help text must
    disclose the **unsafe direction** the way survivor-ratio does (`copy.ts:1112-13`): too low **understates**
    conversion value and can invert the ranking. Staleness is **free** — the fingerprint already carries
    `heirBracket` (`solverRunFingerprint.ts:55,122`).
    ⚑ **Same commit, now-false claims to sweep:** `solver.ts:113-134` asserts the figure is *"R7-editable
    (recommendationView.ts registry)"* and *"the user overrides it"* — **false today, live inside the
    constants provenance**, including the citation string at `:128`. Also `recommendationView.ts:46-49`,
    `:56-59` and `RecommendationSurface.tsx:477-478` say the deferred editor is **inline**; the panel wins
    (`Result.tsx:493-508`'s measured 67-161px breach + insight 058's one-editor-home).
    ⚑ **Anchors, all drifted:** the slot is `copy.ts:2402-2403` (not `:2352-53`); the survivor-ratio row is
    `AssumptionPanel.tsx:336-362` (not `:322-348`); the disclosure builder is `recommendationView.ts:86-91`
    (not `:78-81`) and renders at `RecommendationSurface.tsx:477-487`. `docs/backlog.md:370` still asserts
    present-tense that the shipped sentence ends *"— adjust it in your assumptions if that's off"*; the XS
    half removed that clause — **correct the register too.**
    **Panel only — never asked in intake** ("what bracket will your kids be in?" invites a confidently-wrong
    guess worse than the 24% default).
    </details>

    ⚠️ **STILL OPEN under this entry, and NOT shipped with the seat:** the third locked Tier-2 goal
    (`live-bigger-now`) does not exist, so R21 ships **2 of 3** · the U17 S7 riders, **neither
    buildable as filed** (Q7a's gating premise is false — the dialects already co-render; Q7b's whole
    spec is one line).

### Tier 2 — what breaks on someone else's device

11. **The surfaces a friend actually hits have never been walked or cold-read by anyone.**
    ✅ **PARTLY CLOSED 2026-08-14** — `RecoveryFlow`, `RestoreFlow`, ColdStart, Unlock and the Backup/
    Export ceremony have now been walked end-to-end at 1536×791 and 390×844 (findings ranked at the top
    of this file). **STILL UNWALKED:** the first-Save ceremony (Passphrase + recovery steps) and 10 of
    the intake steps, including **Accounts, where the couple enters their entire net worth.** No dev
    seed reaches most of them.
    ⚑ **What the first walk cost the product, as the argument for doing the rest:** it found a
    WCAG 3.3.1 gap on all four credential ceremonies that 3,284 green tests could not see — the
    `externalError` channel announced the negative-pairing bounce and then left BOTH fields reporting
    themselves valid, so an AT user heard the error once and tabbed back into a control the app called
    fine. Fixed + mutation-proven in `c327e011`, with the component's first-ever suite. **A green
    suite cannot see an orphaned alert; only the frame can.**

12. **The couple's own data.** An interrupted intake loses the whole household (up to **14** steps —
    8 unconditional + 6 gated, `questions.tsx:1191-1209`; "13" was the long-standing figure and is one
    short of the worst case — zero persistence,
    **no `beforeunload` ON INTAKE**, and one step tells them to fetch a number from healthcare.gov
    **in a new tab**) · the
    `schemaVersion` migration ladder **does not exist as code** — `IntakeApp.tsx:537` refuses anything but
    v3, so the first v4 bump bricks every saved plan *and its backup* · there is **no way to delete the
    vault** (`clearVault` exists; its only caller is the dev seed planter).

13. **Also:** no icons at all, so the "local-first PWA" is not installable · Chromium-only verification
    while the durability story is explicitly about Safari eviction · the fit law is never checked at
    enlarged text · no single-person household (a solo friend is withheld forever or must invent a spouse)
    · **no document a friend reads** — the in-app honest-limits total is two sentences, and the app tells
    them to "validate with a professional" while handing that professional nothing readable · the solve
    lane has no cancel and can freeze the tab silently (`engineClient.ts:50`).

### Tier 3 — Briggsy's call

14. **His eye, the standing block.** The stacked tape rows (07-08 → 07-23, which also score the
    Opus-vs-Sonnet Caddie flip) · the four aged-surface tone calls, **due before 2027-01-01** · the chart
    framing forks (whose range is shaded, which odds the ladder quotes, the axis units) · `?vault=stale`'s
    MEANING ruling (both obvious repairs are measured dead ends) · the three-doors rhythm on `datemixed` ·
    the essentials median line · the record card's strategy naming (half 2) · the phone-rhythm pass · the
    fiduciary's current-law-as-written caveat, unanswered since 2026-07-09.
    ⚑ **On-surface re-audit owed** for the two Card 9 / GoalPicker fixes that shipped without it — a
    chat-approved change does not survive his re-read on the surface (the 2026-07-11 false-PASS lesson).

15. **Verify-owed, and it needs him.** The OOP-medical figures (`src/intake/referenceData.ts` →
    `OOP_MEDICAL_TYPICAL_HOUSEHOLD`) are grounded-search-sourced, **not** primary-table-verified
    (`directionalUntilPinned`). BLS bot-walls `curl`, so this is the sanctioned exception to
    no-manual-steps: ask Briggsy to pull the CE "Age of reference person" table and pin them cell-by-cell.

### Tier 4 — hygiene

16. **The gates that don't bite (14 filed items)** — R7's registry is one level deep, copyGuard's scope is
    a prefix allowlist with no forcing function on new keys, and several arms still cannot fail. None can
    produce a wrong answer today; all mean the net is thinner than it reads. Plus the Medicare-trend
    riders, the open copy obligations, the deferred richer market draw, and the `dateinvert` (c) mint —
    its own session, a size-L parameter hunt.
    ✅ **NC's RETIRED CERTIFICATION CHECKPOINT — SWEPT 2026-08-14.** Six shipped surfaces (not the
    five filed; `CLAUDE.md:35` turned up in the sweep) still asserted the dead ~Aug-2026 event in
    PRESENT tense after S.L. 2026-41 struck every trigger row FY2025-26 → FY2032-33 on 2026-08-02:
    `scripts/verify-state-tax.ts` header + its `nextDue` doc comment · `verify-the-back-nine.yml:46`
    · project `CLAUDE.md:35` · and two in the engine — `constants/types.ts` and
    `validation/oracleToken.ts`. All now name it as RETIRED, in past tense, and the two engine
    docblocks additionally record that **`certification-pinnable` currently fires for NOBODY** — the
    kind survives only because the machinery is generic and the next directional state re-arms it,
    which is the thing a reader would otherwise mis-infer from an NC example written in the present.
    The `verify-state-tax.ts` header also gained the source landmine it was missing: NCDOR's rate
    page and the codified G.S. page both still show the struck "after 2025 — 3.99%", so they read as
    CONTRADICTING the pinned record until they recompile — **session law wins, do not "correct" the
    engine table back to a flat 3.99%.** Comment-only; typecheck · lint · 3289 tests · state-tax gate
    all green. (`copy.ts:2620` and `caseStateCompanions.ts` were already correct — swept 2026-08-02.)
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
- ⚠️ **CI EXISTS AND EVERY GATE IS ENFORCED — this file asserted the opposite until 2026-08-14.**
  `.github/workflows/verify-the-back-nine.yml` lives at the **monorepo root** (`ai-learning-journey`),
  NOT inside `projects/the-back-nine/`, which is why grepping the project dir "proves" there is no CI
  and has now produced a false claim twice. It triggers on push to `main` + PR on paths
  `projects/the-back-nine/**` (plus the workflow file itself) and runs, in order: `verify:aca` ·
  `verify:state-tax` · `lint` · `typecheck` · `verify:doc-stats` · `test` · `build` ·
  `verify:bundle` · `verify:csp` · `verify:fit`. **All ten.** `vercel.json` carries no
  `buildCommand`, so a deploy still runs the default build with no gate — CI is the gate, Vercel is not.

---

## Operational landmines — these bite hands

*Engineering lessons live in [`docs/insights/`](docs/insights/) (109 of them; cite by full path + slug).
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
- **`verify:fit` does NOT measure the recommendation surface** (`e2e/vertical-fit.spec.ts:391-397`
  excludes the committed + held renders — a live solve blows the 120s budget). So *"seat it and re-measure
  under `verify:fit`"* is **unexecutable** for anything in `.rec-committed__rest`; it needs a MANUAL
  1536×791 measure. And the *"~89px headroom"* number is the SPINE idle frame (`:1773`), a once-measured
  prose figure the spec never asserts — **never budget a different surface against it.**
- **A live solve is minutes, not seconds — budget for it.** A dev-build `?seed=nc` solve measured **~11
  minutes** (2026-08-03) — but that is the SINGLE-BUCKET figure and it does not generalize: the
  three-bucket `?seed=buckets` measured **~25 minutes** the same day. Bucket count moves this a lot;
  quote the figure for the household you are actually driving. Prod DCEs the dev seeds, so a browser walk that needs a committed
  recommendation has no fast path. Before calling one frozen, measure CPU on the Playwright renderer
  (`Get-CimInstance Win32_Process | ? CommandLine -match 'ms-playwright'`, then sample `.CPU` twice) —
  a pinned core means it is computing, and Briggsy's own Chrome PIDs will read 0% and mislead you.
- **`console.log` in a vitest run is SWALLOWED here** — a measurement probe that prints its answer
  produces a green run and no output, which reads as a silent failure. Write results to a file
  (`writeFileSync` to the scratchpad) and `cat` it. Cost one full 78-second run to discover.
- **A directional caveat is a CLAIM — measure it or drop it.** Writing "low path counts under-count
  this, read it as a floor" on the demotion-frequency probe sounded obviously right and was **backwards**
  (15% at 400 paths → 11% at 1600). Re-running at 4× cost five minutes and inverted the conclusion. If a
  caveat is worth writing next to a number, it is worth one more run.
- **Verify a planted mutant landed, and hit the right occurrence.** A no-op edit goes green and reads as a
  surviving mutant; a replace on the wrong line produces a real-looking red for the wrong reason. Match on
  a unique anchor, then `grep` the file back. **And run the baseline before diagnosing your own change** —
  when the task is "extend the harness to capture X," run the harness *first*.
- **Never `git checkout -- <file>`** to revert a planted mutant on a dirty tree; it nukes uncommitted work.
  Revert with Edit.
- **Never measure the tree while an agent fleet works in it** — their scratch files produce bogus doc-stat
  reds and bogus test counts. Never run the Caddie walk concurrently with the full suite (CPU contention
  times out the final-tier waits). **A PARALLEL SESSION on another project is the same hazard from
  outside the tree:** 2026-08-20, three RecoveryFlow tests (the ~1s KDF waits) red inside a full run
  whose imports took 260s, then green isolated AND green on a full re-run — re-run the failing file
  alone before believing any timing-shaped red.
- **A StructuredOutput schema that asks for too much output fails the whole call** (insight 084). Split the
  fan-out; never ask one agent for dozens of long fields at once.
- **`?vault=` / unlock / save need a secure context** (`crypto.subtle`) — localhost or https, never a bare
  LAN IP over http.
- **`verify:fit`'s `?seed=dip` arm is LOAD-SENSITIVE and can red the whole gate on a busy machine.**
  Measured 2026-08-05: it PASSES isolated at 1.1m and FAILED at 1.5m inside the full parallel run, on
  `gotoSeedFinal`'s 90s wait for the FINAL engine tier (`reviewSurface.ts:74`) — the heaviest date seed
  sweeping 11 offsets at final precision. **Do NOT just raise the 90s** (insight 106: a fix that raises a
  bound must prove that bound is the one that binds, and three prescriptions in a row adjusting a clock
  means the wait is the wrong instrument). The wait is on REAL compute, so it is slow rather than
  impossible — which is the opposite of 106's case and needs its own diagnosis. Re-run the arm alone
  before believing a red: `pnpm exec playwright test --config=playwright.fit.config.ts -g "seed=dip"`.

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
| `buckets` | **the ordering witness** — 3 real buckets (pre-tax + taxable-with-gain + Roth) on the `proportional` default, so `taxable-first` and the household's own order finally DIVERGE. The only seed on which "your plan today" is observably their plan. Live solve (~11 min in dev) |
| `steer` | the `no-pretax` typed refusal — invite → GoalPicker → calm refusal, no solve |
| `nc` · `pa` · `fl` · `elsewhere` | the state faces — NC bites, PA is small, FL is $0, elsewhere unpriced |
| `datenc` | the date-route NC witness |
| `datesolo` | **the refusal witness** — `?seed=date`'s couple with the ONE field flipped (Sam buys their own pre-65 coverage instead of riding Alex's plan at work). The only live drive of the `unrepresentable` strip block; it renders the cannot-price frame and builds NO date, by design. Its exemption from the all-seeds-build law is asserted, never skipped (`REFUSAL_SEEDS`, `devSeeds.test.ts`) |

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
