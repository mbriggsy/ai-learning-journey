# The trial's three blind readers (wf_e9e89756-6a6, 2026-11-12)

Each reader got both plans with every label removed, A and B by a coin flip (`key.txt`: A was ultramode-plan's, B was ce-plan's), read both whole, and said which it would build from. The script is `readers.workflow.js` beside this page. Their answers, word for word:

Tally: A 1, B 2, neither 0. Dead: none. Read short: none.

## The builder reader picked B (ce-plan's), clearly better (read A first)

I would build from B. Each of its units has the same parts in the same order: goal, requirements, dependencies, files, approach (numbered steps in U1 and U3), test scenarios with hand-worked dollar figures, and a verification line. A per-unit Done table follows (B 720-733), and the Verification Contract table names the exact command for each gate (B 695-706). Its line citations match the code as it stands today. I checked advancePerPersonLedger at taxOverlay.ts:1002-1024, `max(alloc.pretax, rmd)` at :1632, `GROSS_UP_MAX_PASSES = 192` at :619, the stale k≈0.74 docstring at :1049, the three reset sites at :2763, :2791 and :2915, the same-year conversion at :2357, the stop rewrite at dateSearch.ts:198-201, the stream type at model.ts:351-364, K1 at copy.ts:1700 and schema version 5 at model.ts:1987. A builder can go straight to the right spot.

B also avoids the trap that A walks into. B keys the charge on a construct that production carries and test callers can leave out (KTD4, B 148), with a test proving every seed and date candidate carries it. B builds the engine work dark, so it changes nothing, and turns the charge on once at U10 (KTD9, B 164). The existing hand-worked fixtures and the 8 oracle cases therefore stay byte-identical (B 130). A does the opposite: any caller with no per-person ledger is charged on every dollar when any living owner is under the line (A 129), and the year an owner turns 60 is charged (A 128). I counted the existing overlay fixtures. About 40 mkHousehold calls use owners born 1966-1980 with a 2026-2032 start, among them (2026,1966,1966) ×9, (2026,1980) ×4, (2026,1970,1970) ×4 and (2026,1975,1975) ×2. At U7 many of these go red, but A plans hand re-derivation only for the oracle cases (A 183, 296), and its own done line requires `pnpm test` to pass on every commit (A 468).

B also found a real bug that A missed. I confirmed it in the code: in the per-person path, `advancePerPersonLedger` relocates each spouse's own RMD excess. For a couple where one spouse owes a $20,000 RMD against a $10,000 need, $25,000 leaves pre-tax but only $20,000 is taxed, and the extra $5,000 enters taxable at full basis (taxOverlay.ts:1019, :2857, :2883). B's U3 fixes this first, with a red test written before the fix (B 147, 348-384). A keeps today's split without noticing the leak (A 129).

A's prose is a second problem for a builder. U7's whole approach is one paragraph of about 400 words holding a dozen tasks (A 296). Several steps branch on outside state: whether a real plan has been saved, whether the workbench plan's U3 or U7 has shipped, whether the council calls the split a new lever (A 99, 135, 270, 317). The unit numbers are out of order: U16 sits inside Phase 2 and U5 in Phase 4 (A 192-209, 172-177). A builder working alone will misread or skip something.

A does have real advantages. It alone noticed that build 2 is still open and that TODO.md:83 makes every `src` commit run the sweep and per-key idcheck, and it orders its units around that (A 15). It gives a default for every convention, so the work doesn't stall (A 161-170, 270). It also prices Roth earnings as income, which matches the forms (A 32).

B's weaknesses are real but mostly flagged in the plan itself. Building past U3 waits on six rulings from the council and Briggsy (B 117-127, 336-342, 392). B never mentions build 2. Its R4 is admittedly wrong for a plan left at 55 or later at an earlier job (B 53, 739). And it leaves Roth earnings out of income by default (B 110). Of those, only the build-2 omission is unflagged, and the session protocol has a builder read TODO.md first anyway. A's main trap is not flagged anywhere in A.

### Plan A (ultramode-plan's), read to line 492

Strengths:

- Plans around build 2 being open: units that move an answer, or touch intake, the codec or the money picture, wait for build 2's close; units that change no output may land meanwhile (line 15). TODO.md:83 confirms the every-src-commit sweep and idcheck rule.
- Gives a default for every convention so building never stalls: the line falls on the gloomy side (KTD2, 128), the survivor treats the account as their own (KTD7, 133), the separation year is fixed per route (KTD8, 134), the split stays pro-rata until the council rules, and U7 proceeds on that default (270). Assumptions are listed (161-170).
- Legally coherent on the Roth: early earnings are both income and charged, per Form 5329 and Form 8606 (32), and the state bases (NC, FL, PA) get treatments in both gross-up arms (360).
- Concrete acceptance examples tied to form lines (AE1-AE8, 76-83) and regulation examples worked by hand (344, 364-365).
- A clear fallback if Phase 3 stops: K1 is narrowed rather than deleted, and the entry stays open on the Roth half (177).
- Correctly found that all eight oracle cases are 60/60, born 1966, starting 2026 (123); I verified this in solver-cases.
- Handles the workbench plan's conflicting flag, table grain and schema-version claim (99, 184, 460).

Weaknesses:

- A caller with no per-person ledger is charged on every dollar (129), and the year an owner turns 60 is charged (128). Together these move dozens of existing hand-worked overlay fixtures with owners born 1966-1980, yet only the oracle cases are planned for hand re-derivation (183, 296), while `pnpm test` must pass on every commit (468).
- Misses the forced-excess leak in the per-person split (more pre-tax leaves the ledgers than the gross-up taxes) and keeps today's rule as the charge's base (129, 117).
- Very dense run-on approaches: U7 is one paragraph holding about a dozen tasks (296), and KTD9 nests several conditionals (135). It is easy to skip a step.
- Many steps branch on outside state (whether a plan has been saved, whether the workbench has shipped, whether the council calls the split a lever): 99, 135, 270, 296, 317.
- Units are out of order (U16 in Phase 2, U5 in Phase 4; 192-209), so the builder must rebuild the real order from Sequencing (172-177).
- U2 claims byte-identity and may land while build 2 is open, yet admits it moves solverRunFingerprint's canon (229, 15). That could trip build 2's per-key idcheck.
- Never names the three pretaxLedger reset sites the class sub-ledgers must follow (229); the builder has to find them.
- Briggsy is asked mid-unit before U7 lands (296, 442), with no unit of its own.

### Plan B (ce-plan's), read to line 739

Strengths:

- Uniform unit structure, with numbered steps in U1 and U3, a per-unit Done table (720-733), and a Verification Contract table naming each gate's command (695-706).
- Accurate line-level anchors, verified against the live code: taxOverlay.ts:1002-1024, :1632, :619, :1049, :2763/:2791/:2915, :2357; dateSearch.ts:198-201; model.ts:351-364 and :1987; copy.ts:1700.
- Found a real, verified rosy leak in advancePerPersonLedger: the per-spouse RMD excess is relocated untaxed (KTD3, 147). U3 fixes it first with a red test worked by hand and a property test (348-384).
- Keys the charge on a construct that test callers can leave out, with a test proving production always carries it (KTD4, 148). Existing hand fixtures and the 8 oracle cases stay byte-identical (130), so the U7-style fixture avalanche never happens.
- Builds the engine work dark and turns the charge on once at U10 (KTD9, 164), so U4-U9 land byte-identical and there is one solver bump and one sitting for the words.
- Names the class reset sites, the probe hook and the fingerprint's stability (KTD5, 149-154), and the schema-step mechanics in detail (KTD11, 171-177).
- Concrete dollar fixtures: $20k/$10k leak (374), $40,000 → $4,000 (444), Form 5329 example line 1 = $22,000 (486), Roth 401(k) $200 (487).
- Timing and work-count gates with thresholds (704-705).

Weaknesses:

- Everything from U4 on is blocked on U2: six questions to the council and Briggsy's ruling, with no defaults (117-127, 336-342, 392). This widens Briggsy's calls beyond the one council question the job named, and U5's tests are written against rulings that do not exist yet ('either side of U2's ruled line', 445).
- Never mentions that build 2 is open or its every-src-commit sweep and idcheck rule (TODO.md:83). U3's pricing change and solver bump would land into that window (22, 366).
- R4 as written denies the age-55 exception for an earlier job's plan in a working year. The plan itself says this is wrong under §72(t)(2)(A)(v) and leaves the fix unapplied (53, 739), so the builder must guess.
- Roth earnings stay out of income by default (110, 342), which charges 10% on dollars the model never taxes. If U2 rules them in, U6 must be re-planned (481), so that branch is unplanned.
- U10 is built and held uncommitted in the shared checkout until Briggsy's sitting (590, 610).
- U8 puts draft words into src/ui/copy.ts before they are ruled (534).
- Line-number citations will drift as units edit taxOverlay.ts (669); it relies on doc:reanchor.

**Where a builder would fail first:** A: at U7. The builder follows the no-ledger charge rule (129) and the turning-60 rule (128). About 40 existing hand-worked overlay fixtures with owners born 1966-1980 and tax on then go red under `pnpm test` (468), but the plan only arranges hand re-derivation for the 8 oracle cases (183, 296). The builder must invent a policy: re-derive each by hand, change its birth years, or re-pin to the engine's output, which DND-012 forbids. A smaller risk comes earlier at U2, which moves the run fingerprint while landing inside build 2's per-key idcheck window (229, 15). B: at U3 and then U2. U3 commits a pricing change and a SOLVER_CODE_VERSION bump (366) while build 2's every-src-commit sweep and idcheck rule is live, and B never mentions it. After that the builder cannot start U4 until Briggsy rules all six of U2's questions (392). If he doesn't, the builder hits R4's admitted error (53, 739) at U5, where the plan says working years never get the age-55 exemption (437), and must choose between the flawed requirement and the unapplied fix.

## The rules reader picked B (ce-plan's), a close call (read B first)

Through the correctness lens, B edges ahead, but it is a close call. The deciding point is a real defect that B found and A missed. B's KTD3 (line 147) says the per-person split lets more pre-tax money leave the ledgers than the gross-up taxes. I traced it in the code and it holds. advancePerPersonLedger (taxOverlay.ts:1016-1021) moves, for each owner, the required withdrawal beyond their own pro-rata share, sum of max(0, rmd_i - ap_i). The gross-up taxes only max(alloc.pretax, sum of rmd) (:1632, :2346), and the aggregate path uses the smaller max(0, rmd - alloc.pretax) (:2870). B's case (a $20,000 required withdrawal against a $10,000 need: $25,000 leaves, $20,000 is taxed) is exact, and the extra dollars enter the taxable account at full basis (:2883), so they are never taxed. That is rosy, and it sits in the very split the charge has to key on. B measures it first and stops if the measurement refutes it (lines 315-316, Goal Capsule line 17). A's KTD3 (line 129) keeps "today's pro-rata by draw-time balance" and treats the case where the older spouse's required withdrawal covers the year as a council split question (line 270). So A would charge a draw the younger spouse never really takes and leave the untaxed leak in place. Every other B line citation I opened checks out: 1002-1024, 1612-1705, 1656-1669, 2294-2302, 2357-2360, 2841, 527-619, 1049 (stale k of 0.74), healthOverlay 162-163, dateSearch 321-325 and 336-351, the schema version of 5 at model.ts:1987, and basis at :1777. B's convergence arithmetic is right: k goes from 0.78 to 0.88, ln(1e20)/ln(1/0.88) is about 360, and the cap today is 192 (line 162). Its Form 5329 example ($22,000 and $2,200) and its Roth 401(k) pro-rata case ($200) are right (lines 486-487). B is honest where it is unsure: the Roth 401(k)'s age-55 reach is left to a source read (line 135), the 2025 reconciliation act's text could not be loaded (line 270), and it flags its own R4 error (line 739). Its presence-keyed construct keeps the existing hand fixtures with owners under 60 meaningful (line 148; taxOverlay.test.ts:1628 and :4870 are such fixtures). A is the stronger plan on several rules and gates. It gets the 59½ line right: the whole-year "under 60" reading is rosy for a July-December birthday (line 112), and A applies that to PA's comment (line 457). It counts Roth earnings as income as well as charged (lines 32 and 54), which is correct law. It uses the held deferral and match fact to identify the plan of the job still held (line 114, verified in AccountEntry.tsx:205-209). It is right that the pricing witness sees only exported pricers (line 119) and that the substring gate cannot see 0.10, 59.5 or 55 (line 121). Its claim that all eight oracle cases are 60/60, born 1966, starting 2026 checks out (line 123). It also catches that lifetimeTaxPaidReal is documented as income tax (model.ts:875-876). B is confidently wrong on exactly those two gates (lines 384 and 460) and never amends the lifetimeTaxPaidReal contract. On balance, a missed rosy defect in the charge's base, plus A's fail-closed rule moving hand fixtures it never plans for, outweighs B's two gate misstatements and its larger council load. That makes B the plan to build from, by a modest margin, after fixing R4 per line 739, U3's witness step and U5's shape-test line.

### Plan A (ultramode-plan's), read to line 492

Strengths:

- Correct analysis of the 59½ line with birth year only: the year an owner turns 60 holds days before 59½ for a July-December birthday, so the 'under 60' reading is not the safe side; it charges through the year they turn 60 (lines 112, 128; AE3 line 78).
- Correct law on Roth earnings: drawn early they are income as well as charged (Key Decision line 32, R8 line 54); the Roth IRA ordering and Roth 401(k) pro-rata rules are right (line 55); AE4 ($600, then free a year later) and the Example 6 layer arithmetic ($1,000 charge, line 370) are right.
- Uses a fact intake already holds, as D7 says: a working owner's employer plan that carries a deferral or a match is the plan of the job still held (lines 114, 130). Verified in AccountEntry.tsx:205-209 (contribution only while the owner works; match only on employer-plan kinds).
- Gate mechanics are accurate: the pricing witness probes only exported pure pricers (line 119; verified in the pricingWitness.test.ts header), so the pricer is exported and added to the grid with a 'charge ignored' mutant arm (KTD5 line 131); the substring gate cannot see 0.10, 59.5 or 55, so they are pinned by assertion (line 121; constants.shape.test.ts:834-846).
- Verified facts: all eight solver oracle cases are 60/60, born 1966, starting 2026 (line 123; the case files' people blocks), and A names that its 59½ rule charges their first year; PricingReach has one member (line 119); lifetimeTaxPaidReal is documented as income tax, and A amends that docblock (KTD6 line 132; model.ts:875-876).
- Age-55 separation rules are right: a calendar-year test, never for IRA money, and only for draws after the separation, so a short working year's draw from the plan of the job still held stays charged (lines 113, 134; AE2, AE8). The in-service bar is filed as rosy, with a line put to Briggsy (lines 88, 296, 444).
- PA findings are correct: the 'one year conservative' comment is half wrong (lines 457-458; stateTax.ts:95-96).

Weaknesses:

- Misses the required-withdrawal leak in advancePerPersonLedger: it states only that the split is pro-rata by draw-time balance (line 117) and keeps that as the charge's split (KTD3 line 129). It treats a spouse whose required withdrawal alone covers the year, beside a spouse under the line who is still charged, as a council split question (U4 line 270) instead of a defect. In that case the charge falls on a draw the younger spouse never really takes, and the code's untaxed relocation (taxOverlay.ts:1019 against :1632 and :2870) stays.
- Its fail-closed rule (KTD3 line 129), combined with its 59½ convention, charges every existing hand fixture whose owner is under the line, for example taxOverlay.test.ts:1628 (born 1975, in 2026) and :4870 (born 1973, in 2030). The plan names hand re-derivation only for the eight oracle cases (Risks line 183; U7 line 296), so U7's test fallout is unplanned.
- The Key Decision at line 32 says 'Form 5329 charges only what is includible in income'. The five-year recapture charges conversion dollars that are not includible; R8 (line 54) handles it correctly, so the statement is imprecise rather than built wrong.
- U8's prediction (line 329) that the pre-tax half reaches only healthgap's survivor years overlooks health and healthnc survivor paths: Sam, born 1967 (devSeeds.ts:791), would inherit Alex's IRA in the year she turns 60, which A's own 59½ rule (KTD2) charges. It is labeled a prediction to test.
- Gloomy simplifications, each named: a governmental 457(b) with any rolled-in money is charged whole (KTD13 line 139), and an old job's plan left at 55 or later before a later job is never asked about (line 92).
- Cites code without line numbers on purpose (line 7). That is defensible, but its engine claims are harder to check than B's.

### Plan B (ce-plan's), read to line 739

Strengths:

- Finds a real, rosy pre-existing defect in the base the charge keys on (KTD3 line 147): per-person forced excess is the sum of max(0, rmd_i - ap_i) (taxOverlay.ts:1019) while the gross-up taxes max(alloc.pretax, sum of rmd) (:1632, :2346) and the aggregate path uses :2870. I verified the $20,000 / $10,000 case: $25,000 leaves the ledgers and $20,000 is taxed, with the excess entering taxable at full basis (:2883). It plans the fix (RMD first, the rest by room) and measures the leak first, with a stop if refuted (lines 315-316, 17).
- Engine citations are exact and check out: allocateWithdrawal's signature (sequencing.ts:134), the state addend (taxOverlay.ts:1656-1669), the death merge (:2294-2302), the conversion drawable the same year (:2357-2360), the probe hook (:2841), the stale k of 0.74 docstring (:1049), the cap derivation (:527-619), the ACA band claim (healthOverlay.ts:162-163), the reach rule (dateSearch.ts:321-325, 336-351), the schema version of 5 (model.ts:1987), and basis as brokerage cost (model.ts:1777).
- The convergence arithmetic is right: worst-case k goes from 0.78 to 0.88, and the file's own formula gives about 360 passes against today's 192 (line 162).
- Tax rules are correct and pinned to the form: the Form 5329 instructions' Roth example ($22,000, $2,200) and a Roth 401(k) pro-rata case ($200) (lines 486-487); a governmental 457(b) is exempt except money rolled in, with the rolled-in amount asked (R5, KTD12); a non-governmental 457(b) is never charged (line 99); the §26(b)(2)(C) point that nonrefundable credits cannot offset the charge (line 145); SIMPLE IRA and the other exceptions are scoped out correctly (lines 97-98).
- Honest about what it does not know: whether the age-55 rule reaches designated-Roth or rolled-in 457(b) dollars is left to a source read (line 135); the 2025 reconciliation act's text could not be loaded (line 270); it flags its own R4 error with an exact fix (line 739).
- Its presence-keyed construct with a builder-side proof over every seed and candidate (KTD4 line 148) follows the codebase's established pattern and keeps existing hand fixtures with owners under 60 meaningful. It correctly notes that the oracle cases carry no pretaxByPerson (line 130; verified).
- Seed facts are verified: healthgap's Sam is 40 with the household's only Roth IRA, and health and healthnc draw Sam's Roth at 59 (lines 39-40; devSeeds.ts:791, 814-816, 1116-1121).

Weaknesses:

- R4 (line 53) denies the age-55 exemption in every working year, which is wrong for a plan from an earlier job left at 55 or later. B flags it at line 739 but does not apply the fix.
- U5's test 'no re-typed 0.10, 59½ or 55 anywhere (the shape test)' (line 460) is confidently wrong: the substring gate excludes small, collision-prone figures (constants.shape.test.ts:834-846).
- U3 expects 'the ledger row, the solver bump and the witness pins move together' (line 384; files at line 360), but the pricing witness probes only exported pure pricers and says it cannot see the RMD path. The new `tax` row would read 'row-unpinned' with an unmoved digest unless the extracted split is added to the grid, and U3 never says to do that.
- Routes the charge into 'the year's tax and lifetime tax paid' (line 213) without noting that lifetimeTaxPaidReal is documented as income tax, with the state-tax disclosure and the oracle's income-tax pins reading it that way (model.ts:875-876).
- Asks every employer plan whether it belongs to the current job (R9 line 61) instead of using the held deferral and match fact, which misses D7's 'use what is held'.
- Treats PA's 'one year conservative' comment as untrue only if U2's ruling makes it so (lines 102, 339, 647). For a July-December birthday it is already rosy in the year the owner turns 60.
- Leaves Roth earnings income out pending council (lines 110, 342), so as planned the Roth half is charged 10% with no income; it is honestly deferred and filed.
- Six council questions gate U4 onward (lines 119-126, 241-244), more than the single council the entry names.

**Where a builder would fail first:** A: at U7's commit (lines 127-129, 296-309). The fail-closed rule (KTD3) charges every existing hand fixture whose owner is under the line (for example taxOverlay.test.ts:1628, born 1975; :4870, born 1973), so many tests go red that the plan never lists for hand re-derivation; only the eight oracle cases are named (line 183). In the same commit, a couple where one spouse has a required withdrawal and the other is under the line is charged on a pro-rata draw the younger spouse never really takes, while advancePerPersonLedger's untaxed relocation stays (line 270 treats this as a council split). B: at U3 (lines 363-384). The builder appends a `tax` ledger row for the leak fix and expects 'the witness pins move together', but the pricing witness probes only exported pure pricers and cannot see the RMD path, so the digest stays unmoved and the row reads 'row-unpinned' until the grid is widened with the extracted split, a step the unit never names. The next misstep is U5's shape-test claim at line 460, which the substring gate cannot check (constants.shape.test.ts:834-846).

## The owner reader picked A (ultramode-plan's), a close call (read A first)

A close call. Both plans are heavier than the owner likes. I pick A for three reasons.

First, A keeps the owner's calls the right size. The council gets only the question the entry names, how a mixed-age couple's draw splits (U4, lines 264-271). It has today's rule as the default (OQ1, line 97). If the council calls the split a new lever, that goes to Briggsy as one framed recommendation. The engine-side conventions are the pilot's to settle, and A settles them on the side that never flatters and lists them as overturnable bets (lines 161-170): the 59½ line (KTD2), the year of separation (KTD8) and the survivor (KTD7). B turns the one named council into six questions (lines 119-126, 336-342), four of them law readings the pilot can make. It then holds every unit from U4 on until Briggsy rules all six (line 23). That hands mechanics back to him.

Second, A puts guards only where something has happened. A builds the saved-plan reach qualifier only if a real plan has been saved by then (KTD9, line 135; U16, line 317). B wires a full staleness reach unconditionally (KTD10, line 167), though it turns the same thing down for U3 because no real save exists (lines 104-105). B also adds an alternating A/B timing harness with ratio thresholds (line 705), four new property-test files (lines 359, 400, 478, 573) and pass-count instrumentation (KTD13).

Third, A is more correct where the app's cardinal sin, an answer that reads better than the truth, applies. A deflates each nominal Roth layer by the price index every year (KTD11, line 137; U9, line 352; insight 135). B holds the Roth basis flat (KTD6, line 158) and never cites insight 135 (line 271). In a real-dollar engine that overstates the free amount and under-charges, more each year. healthgap's Sam draws for about 19 years before 59½. A also fixes the conversion tile, which prices its own tax on a converted dollar and has already had several Tier 0 entries (U13, line 430). B never mentions the tile.

What keeps it close: B's process is cleaner for Briggsy. It has one switch-on, one solver bump and one word sitting on real screens (KTD9, line 164; U12, lines 582-602). It never puts a new note in place of the charge (R15, line 72). It sends the scope question of taxing Roth earnings as income to the council (line 126). It asks about an earlier job's separation, as D7 says (R9, line 61). And it found a real rosy bug A missed: I checked src/engine/taxOverlay.ts:1009-1023 against :1632. The per-person forced excess can exceed the aggregate max(alloc.pretax, rmd). With a $20,000 required withdrawal against a $10,000 need, $25,000 leaves the ledgers and $20,000 is taxed (KTD3, line 147; U3).

A also does work nobody asked for. It proposes a new note for the bar on drawing a current job's 401(k) while still working, which runs against D7 (lines 296, 444). Its U13 changes the pay check's ruled list of engine functions the money picture may import without routing that change to anyone (line 430). It sizes the medical exception (line 329). It decides on its own that early Roth earnings count as income (line 32). Its two production landings force an interim K1 narrowing and an extra word ask (lines 296, 442). Its KTD2 plus the fail-closed rule moves all eight solver oracle cases, each re-derived by hand (lines 128, 183).

Net: A asks less of Briggsy on mechanics and leaves the household's numbers more correct. Its extra work is visible and easy to cut. B's defects are built into its tests: a flat Roth basis that under-charges, and an R4 it knows is wrong (line 739).

### Plan A (ultramode-plan's), read to line 492

Strengths:

- Council scoped to the one question the entry names (U4, lines 264-271), with today's split as the default (OQ1, line 97) and the lever question sent to Briggsy as a framed recommendation, not decided (line 270)
- Engine-side conventions are settled by the pilot on the side that never flatters and listed as overturnable assumptions (KTD2 line 128, KTD7 line 133, KTD8 line 134, Assumptions lines 161-170), so they do not land on Briggsy
- No guard without an incident: the reach qualifier on saved plans is built only if a real plan has been saved by then (KTD9 line 135, U16 line 317); with none, the ledger row just names the over-reach
- Roth layers are held nominal and deflated yearly by the one price index (KTD11 line 137, U9 line 352), applying insight 135 so the Roth free amount never reads high
- Catches the conversion tile, an existing surface that prices its own tax on a converted dollar and would read rosy without the charge (U13 line 430, tests line 433)
- Words come as one batch drafted from measured numbers, kept in the session folder rather than in copy.ts, with every new figure's existence left to Briggsy (U5 lines 387-401, line 398)
- Grounds early Roth earnings as income in the entry's own gap text ('no Roth term') and in Form 5329/8606 (line 32, U10 line 360)
- Plans a clean fallback if the Roth half stops: the pre-tax half closes, K1 narrows and the entry stays open (Sequencing line 177)
- Primary-source research is specific and flags its own contradiction (Pub 590-B vs. the statute, line 104), with search-summary-only sources marked for a re-read (line 105)

Weaknesses:

- Work nobody asked for: proposes a new disclosure line for the bar on drawing a current job's 401(k) while still working, against D7, which its own Problem Frame quotes (lines 28, 296, 444)
- U13 adds a year-0 charge figure to the money picture and puts a new pricing helper on the pay check's ruled import list of engine functions, 'as a change to the pay check's ruled list', without routing that ruling change to anyone (line 430); the money picture's own header says nothing there prices a tax
- Decides a scope question itself: early Roth earnings become ordinary income across federal, ACA, IRMAA, provisional income and every state base, which is a large part of U10 (Key Decisions line 32, U10 line 360), where the entry's prescription asks only for the charge
- Two production landings (pre-tax at U7, Roth at U10) mean two ledger rows, two solver bumps, two convergence re-derivations, an interim K1 narrowing and a mid-build word ask to Briggsy before U7 (lines 135, 296, 442)
- KTD2 plus the fail-closed rule moves all eight solver oracle cases, each re-derived by hand, churn created by a convention choice (lines 128, 183, 296)
- U7 is a single commit holding the charge, U16's ledger row, the seed records, the witness re-pin, the cap re-derivation, architecture rewrites and possibly the workbench re-pointing (lines 296, 315)
- Three measurement units plus extra sizing nobody asked for, such as the medical exception (U8 line 329), and heavy proof such as the three-mutant deflation fixture (line 352)
- Very dense prose and an out-of-order unit numbering (U16 after U7; U5 in Phase 4; U14 lands inside U10's commit) make it hard to follow as a recipe (lines 192-209)
- Misses the per-person required-withdrawal leak B found; its share producer keeps today's split unchanged (KTD3 line 129)
- Does not ask about an old job's plan left at 55 or later before a later job; it files that case instead, so it asks less than D7's 'the year each person left the job' (line 92)

### Plan B (ce-plan's), read to line 739

Strengths:

- One switch-on, one solver bump for the charge, and one word sitting on real screens before the commit (KTD9 line 164, U12 lines 582-602, R17 line 78), the lightest process for Briggsy
- D7 is honored strictly: no new note stands in for any part of the charge (R15 line 72), and the bar on drawing a current job's 401(k) while still working is filed as an availability gap rather than given a note (line 101)
- Leaves display to Briggsy: the charge rides in the total tax already shown, and any line of its own is his call (Assumptions line 263, U10 line 620)
- Sends the scope expansion (Roth earnings as income) to the council, with stop-and-replan if it is ruled in (Q6 line 126, U6 line 481, stop condition line 14)
- Found a real rosy bug in the per-person split that A missed (KTD3 line 147); verified at src/engine/taxOverlay.ts:1009-1023 against :1632. The plan confirms it by measurement first and gives it its own small unit and register entry (U1 step 6 line 312, U3 lines 348-384)
- Asks about an earlier job's separation year, as D7 says, rather than filing it (R9 line 61, KTD5 line 149)
- Presence-keying leaves the hand fixtures and the eight solver oracle cases unmoved (KTD4 line 148, line 130)
- Asks Briggsy whether the amendment's household joins the dev seeds, citing that past ruling (U12 step 3 line 597)
- Clearer structure for a builder: numbered steps, per-unit file lists, a done-when table (lines 720-733)

Weaknesses:

- Turns the one named council into six questions, several of them law readings the pilot owns, and holds every unit from U4 on until Briggsy rules all six (lines 23, 119-126, 336-342, 346)
- The Roth basis is never deflated in a real-dollar engine. 'never growth-scaled' (line 158) follows the taxable-basis pattern, and insight 135 is missing from the lessons (line 271). An answered basis then reads high and under-charges, more each year (U6 tests lines 486-496 pin this shape)
- Misses the conversion tile, which prices its own tax on a converted dollar; it would read rosy for an owner under 59½ (no mention anywhere)
- Knowingly leaves R4 wrong: it charges an earlier-job plan exempt at 55 in working years, and the fix is only proposed (line 739, R4 line 53)
- Wires staleness reach unconditionally (KTD10 line 167, U10 line 615) while rejecting the same thing for U3 because no real save exists (lines 104-105): a guard with no incident behind it
- Proof larger than the question: an alternating A/B timing harness with ratio thresholds (line 705), pass-count instrumentation in U1 and U7 (KTD13 line 179, line 704), four new property-test files (lines 359, 400, 478, 573)
- U10 is built and held uncommitted until Briggsy's sitting, in a shared monorepo checkout, on a multi-session job (lines 22, 588, 610)
- U8 commits draft words into src/ui/copy.ts before Briggsy has read them (line 534)
- The Goal Capsule already says the Roth income gaps stay out of this build (line 9), while Q6 leaves the same question open for the council (line 126)
- Calls the money picture 'not a reader' (line 146) while U10 tests a money-picture line in Briggsy's words (line 631); not a wrong design, but the plan never squares the two

**Where a builder would fail first:** Plan A: U7 (lines 290-309) is one commit that carries the pre-tax charge in both gross-up arms plus U16's ledger row, solver bump and seed records. It also re-pins the pricing witness grid, re-derives the pass cap and rewrites architecture §7.1 and §7.4. It hand re-derives all eight solver oracle cases that KTD2 and the fail-closed rule now charge in 2026 (lines 128, 183). And it needs a K1 ruling from Briggsy before it lands (line 296). A builder would most likely stall there or land a mega-commit that is only partly verified. Soon after, U13 (line 430) would have the builder override the pay check's ruled list of engine functions without asking anyone.

Plan B: U2 (lines 324-346). Six rulings must all come back before U4 can start (line 23); one punt from the council, or one slow reply from Briggsy, stops the build. Past that, U6 (line 158) builds a nominal Roth basis that is never deflated in a real-dollar engine. The answered basis then reads high and the charge comes out low, more each year, and U6's own tests pin that behaviour in.
