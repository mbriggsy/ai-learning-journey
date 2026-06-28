# The Back Nine — TODO

> Actionable next-actions only. **Where we are** ("you are here") lives in [`docs/roadmap.md`](docs/roadmap.md) — the maintained per-unit status table. **What we're building + why** is [`docs/README.md`](docs/README.md). No session history here; git log has it.

## Next, in priority order

1. **THE BAND EVIDENCE — wire the per-year fan across the worker, render the existing band panel under BOTH heroes (Briggsy approved 2026-06-28).**

   **WHY:** the live D2 reveal lands the headline ("you can fuck off today") + odds and *nothing else* — Briggsy's cold-read: "no charts, no evidence, nada." The band (the projection fan — median + 10th–90th range + whether it touches $0) is the convincing "will my money last" evidence. The renderer is **already built + cold-read cleared** (`src/viz/ConfidenceBandPanel.tsx` + the producer `src/viz/bandData.ts` `resolveBandData`) — it sits **dormant**, never wired into the live app. The only block is the engine wire.

   **THE WIRE TRACE (verified 2026-06-28 — `bandFan` is NOT plumbed across the worker; zero matches in `engineProtocol.ts`/`engineWire.ts`):**
   - **(1) `src/engine/engineProtocol.ts`** — `engineApi.run` takes only `(params, seed)`. `bandFan` is `simulate`'s **3rd-arg option** (`simulate(params, seed, {bandFan:true})`), NOT a param. Add an options arg to the `run` protocol method → forward to `simulate`'s 3rd arg.
   - **(2) `src/engine/engineWire.ts`** — `toWire`/`fromWire` must serialize/deserialize `distribution.bandFan` (`{byYear: BandFanYear[]}`, each year `p10..p90` + `cohortFraction`, all finite). **DND/009: never put `Infinity`/`NaN` on the wire** — the never-depleted sentinel is already a numeric value; keep it that way.
   - **(3) `src/store/engineClient.ts`** — BOTH arms pass the option through: the Comlink `run` AND `mainThreadHandle.run` (currently `(params, seed) => api().run(params, seed)`).
   - **(4) `src/store/memoryModel.ts`** — the spine branch (`engine.run(params!, seed)`, ~line 306) requests `{bandFan:true}`; carry `result.distribution.bandFan` onto the committed answer.
   - **(5) `src/ui/answerView.ts` + `src/ui/Result.tsx`** — feed `ConfidenceStatementView.band` (it already accepts `band?: BandFan`) + `bandAnnotations` (household-clock x-axis markers — derive Today / work-stops / plan-horizon **ages** from the draft).
   - **(6) DATE band (the harder half) `src/engine/dateSearch.ts`** — the sweep crowns offset Y but emits no fan. Emit the **crowned candidate's** `bandFan` in `DateSearchOutcome` (run `simulate(crownedCandidateParams, seed, {bandFan:true})` once at the crowned Y, or retain it). Mind CRN — same seed, the crowned candidate's draw schedule.
   - **(7) `src/ui/FuckOffDate.tsx`** — add the on-demand band drawer (mirror `ConfidenceStatement`'s), fed by `resolveBandData(crownedFan, …)`. The "today" case most needs it.

   **THE THREE HONESTY OBLIGATIONS (land HERE):**
   - **$0-portfolio screen:** `resolveBandData` FAILS LOUD on an all-$0 fan ([insight 044]) — a VALID Social-Security-funded $0-portfolio household. Screen `initialPortfolio === 0` and render the verdict **without** a band (nothing to plot but the $0 floor; an over-funded $0 household needs a cold-read on whether to show a band at all).
   - **Plan-horizon x-annotation:** the real fan can end **before** `maxHorizonYears` (band stops at the last living-cohort year). Align the "Plan horizon" x-annotation to the fan's **actual last year**, not `maxHorizon`.
   - **Dead-cohort de-emphasis:** drive thin-late-year de-emphasis off per-sample `cohortFraction` so a band narrowing because couples *died* never reads as rising certainty. And treat a `dollarMax`/`horizonYears` change across recomputes as a **re-draw, not a cross-scale morph**. (`cohortFraction` is finiteness+range-guarded at the `resolveBandData` seam — [insight 044] — so the render consumes a validated signal.)

   **LANDMINES (architecture invariants — do not break):** ONE shared market draw/year (CRN); the `bandFan` uses the SAME draw schedule, so a fan-on run is **byte-identical** to fan-off on the golden cases — the reduce-to-spine byte-identity test in `src/engine/__tests__/bandFan.test.ts` must stay green. Stateless Box-Muller. Externally-derived fixtures (DND 012). **The band renderer + producer are DONE + cold-read cleared — feed them, do NOT redesign.**

   **VERIFY:** drive a working household (date) + an all-retired household (spine) to the result, open the band drawer, screenshot at laptop width, confirm the fan renders honestly (median, 10–90 range, $0 floor visible on off-track). Briggsy cold-reads. Four-skill UI loadout before touching `FuckOffDate`/the band render (back-nine-design is law here — color-blind-safe fan, honest axes).

2. **D2 remaining (after the band): (c) the confidence-curve drawer + (d) the two-pane laptop layout.**
   - **(c) confidence-curve drawer** — the date's secondary "how your odds shift by *when* you stop." Uses `DateTrackOutcome.curve` (offset→odds readings), which **already crosses the wire** in the date outcome (no engine plumbing). Honesty-critical curve-reading semantics — designed separately (the `FuckOffDate.tsx` scope note). Lower priority than the band.
   - **(d) two-pane laptop showcase layout** — the showcase composition (laptop is primary). **ATC/layout call — Briggsy's eye.** The current result is a single centered hero column; (d) is the richer composition. Do LAST, with Briggsy awake to cold-read.
   - **Already-failing magnitude clause — BRIGGSY'S COLD-READ CALL (still owed):** off-track and already-failing share `verdictTrimClause` ("About $X a month less would bring it onto steadier ground"). For a 0-of-10 plan this may read as a falsely-actionable "cut this and you're OK." Cleared the 2026-06-27 cold-read; re-cold-read the **already-failing** case asking *"does this read as 'cut this and you're fine'?"* — if yes, add a dedicated already-failing clause (a "what would have to change" framing, not a single sufficient-sounding trim figure).

3. **U8 — the first-Save ceremony (eye-oracle, deferred).** The v3 restore codec is ✓ DONE (commit 90d2efe5, adversarially verified). Remaining: the user-facing ceremony (passphrase-strength gate `zxcvbn-ts` ≥3 ∧ len ≥12 + recovery-phrase display + mandatory export) and load-on-return wiring. The encrypted-vault writer (`writeVault`/`rewriteModel` in `store/db.ts`) + `firstSave` already exist + are wired — the ceremony is the *flow*, not a new persistence layer. DEFER to a Briggsy cold-read.
   - **OPEN ATC CALL (do NOT build solo):** the portfolio-holdings multi-holding field ([`docs/decisions/portfolio-holdings.md`](docs/decisions/portfolio-holdings.md)) is unratified (3 open sub-decisions). `ScenarioV3` ships WITHOUT it. Ratify before folding `holdings[]` in — no v3→v4 migration if folded during U8.

4. **Single-user "just me" mode** (deferred). A real people-of-one path — NOT "zeros for the spouse" (a phantom zero-spouse still carries a mortality curve and warps joint-survivor + the MFJ→single transition).

Then Act 3 (Controls, U9–U13) → Act 4 (Solver & Recommendation, U14–U17). See [`docs/roadmap.md`](docs/roadmap.md).

## Done this arc (state pointers — git log has the detail)
- **U7 confidence statement ✓ COMPLETE** (cold-read + `/ultramode-code-review` cleared 2026-06-27; [insight 044]). Surface, survivor readout, copyGuard, the band producer + panel, the verdict signals — all shipped.
- **D2 (a) state-adaptive routing ✓** (commit 61b9d9bf) — `src/ui/answerView.ts` `selectElevatedAnswer` (snapshot.answer → date / spine / fallback; `resolvedFocusKey`). The route is read from the committed `answer.kind` (the work-status router already crowned it); the **work-status corner case is structurally reconciled** — `buildPeople` gives a working person `retirementAge = currentAge+1`, so the engine's all-retired §0 guard (`dateSearch.ts`) can NEVER fire while date-routing.
- **D2 (b) live-wiring ✓** (commit 61b9d9bf) — `src/ui/Result.tsx` + `styles/result.css`; `IntakeApp.tsx` intake→result phase. On completion the elevated hero lands (FuckOffDate/ConfidenceStatement) replacing the quiet AnswerStrip; "Review my answers" returns (draft preserved; nothing persisted).
- **The reveal-on-provisional fix ✓** (commit a6145d1d) — `IntakeApp.onComplete` reveals on the FAST provisional tier, then sharpens to the final IN PLACE (the await ORDER is load-bearing). Never blocks the reveal on the 16k×candidates final sweep (was "Working it out…" forever). `#root` is a flex column + `.result { flex: 1 }` fixed the overflow-scroll past the Disclaimer.
- **Intake cold-read polish ✓** (commit 18df7755) — OOP hint states the federal average ("about $3,400", single-sourced); work-income help dedup'd + reframed (the Medicare lens); accounts step shows a running total.

## Parked (Briggsy's call)
- **The work-income re-ask (cold-read #2):** "Income Medicare looks at" re-asks what the salary page captured. Genuinely redundant for the salary-only common case; the IRMAA-MAGI is *deliberately* decoupled (KTD-9) for high earners. **Recommended fix: pre-fill the field from `earnedIncomeReal` as a VISIBLE, editable default** (a confirmation, not a burned/062 silent default). The help copy is already reframed to support it ("Usually the same as the pay you entered earlier…"). PARKED 2026-06-28 awaiting Briggsy's go.

## Standing cadences
- `/ultramode-code-review` at every unit boundary; the four-skill UI loadout before ANY user-facing surface (CLAUDE.md "UI design skills").
- `/brief` (read `docs/insights/`) before a unit; `/distill` after.
- **Delegated build:** **native Agent Teams** for live-steer **eye-oracle** units (Briggsy steers mid-build); the **Workflow** tool for fire-and-forget **test-oracle** fan-out. Durable laws in memory `feedback-delegated-build-laws`.

## Verify-owed
- The OOP-medical figures (`src/intake/referenceData.ts` → `OOP_MEDICAL_TYPICAL_HOUSEHOLD`, now incl. `federalAverageApproxAnnual`) are grounded-search-sourced, **not** primary-table-verified (`directionalUntilPinned`). BLS bot-walls `curl` — ask Briggsy to pull the CE "Age of reference person" table to pin them cell-by-cell. Conservative-by-design while directional.
