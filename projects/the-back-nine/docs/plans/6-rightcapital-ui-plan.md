---
title: "Act 6: the RightCapital-clone UI - Plan"
type: feat
date: 2026-11-24
doc-type: plan
status: planned 2026-11-24 (b9-3); building in the order below
derives-from: [docs/research/rightcapital-ui-reference.md, docs/plans/rightcapital-map.md, docs/plans/5-workbench-plan.md]
execution: code
---

# Act 6: the RightCapital-clone UI - Plan

**The ruling (Briggsy, 2026-11-24, late night).** B9's UI becomes a RightCapital clone: its screens, layout,
navigation, flow, chart types and interaction, copied on purpose. Only RightCapital's logo, name and artwork are not
lifted. His words that night: "Why do we keep persisting what we have when we've decided we need a RightCapital clone
from a UI perspective? And everytime we talk about RightCaptial you insist on not copying it, but why not??? If it
works, wtf?" The engine, the store, the vault and the intake mapping stay: they are the validated part. The
one-question setup walk and the "workspace beside the calm answer" flow of 2026-11-22 are superseded. He pre-approved
every change in this act. Nothing here stops for his decision: the pilot (b9-3, then b9-4 onward) decides, and every
decision this plan makes on its own carries the tag *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all
changes))*.

**What does not change.** Calm-but-wrong (a confident number the engine cannot back) is still the one sin. Briggsy is
colour-blind: colour is never the only signal. Words come from `src/ui/copy.ts`, are written once, plainly, and ship;
nobody pauses on a word.

**How to read this plan.** It is decisions and an ordered build, not code. Section 1 says what stays and what goes,
and the extraction step that comes first. Section 2 is the stack (the first unit that adds anything). Section 3 is
the shell. Section 4 is one unit per screen, in build order. Section 5 says when each old surface and each old test
harness goes. Section 6 lists the engine gaps the screens show stopgaps for. Section 7 is the process.

**The build sheet and its critique.** Builders work from `docs/research/rightcapital-ui-reference.md` (the
"reference"; its section numbers are cited as "ref 2.7" and so on) and the screenshots it names, which live outside
the repo in `C:/Users/brigg/.claude/projects/C--users-brigg-ai-learning-journey-projects-the-back-nine/b9-ui-research/`
(paths below are relative to that folder; open them with the Read tool). The critique of that sheet
(`b9-ui-research/reports/critique.md`) is binding, and its corrections are written into this plan. **Where this plan
and the reference differ, this plan wins.**

**This repo is public.** No RightCapital image or text is copied into it. No real household fact goes into a fixture,
seed, screenshot name, doc or commit. Code is cited by file and symbol, never by line number (`verify:doc-stats` arm 4
gates line-numbered citations). Build status lives in the roadmap's You-Are-Here table, never here.

**Unit IDs.** This act's units are **RC0 to RC21** ("RightCapital clone"). The `U` numbers are taken by Acts 1 to 5,
and `RC` is unused anywhere in the repo, so the key stays unique; other docs cite them as "Act 6 · RC4". *(the pilot's
call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

---

## Unit index

Sizes: S is about a session, M a few, L a week of sessions. Milestones 1 to 4 end with the whole-file review
(section 7); they are named in words, never "M1", because the roadmap's `M` key means a step inside a unit.

| Unit | Title | Size | Lands / deletes | Depends on |
|---|---|---|---|---|
| RC0 | Pull the logic out of the `.tsx` files | S | moves pure functions into `.ts` siblings; no behaviour change | none |
| RC1 | The stack, the tokens and the CSP proof | M | Tailwind v4, shadcn on Base UI, Highcharts styled mode, TanStack Table, lucide, Figtree; the theme; the legacy layer; the probe page | RC0 |
| RC2 | The kit and the shell | L | top bar, sub-nav, page frame, drawer, tray chrome, tables, lock menu, routing; the shell replaces the workbench room behind its door; deletes `WorkbenchRoom.tsx`, `PinnedAnswer.tsx`, `workbench.css` | RC1 |
| RC3 | Dashboard → Snapshot | M | the ring, the stat rings, the first Highcharts chart (the fan); the room's door now lands here | RC2 |
| RC4 | Retirement → Analysis → Probability, with the Action Items tray | L | the shell becomes the home (gap 2's U25, superseded here); the answer half of `Result.tsx`, the U15 rail page and the withdrawal-order and Roth sheets go | RC3 |
| RC5 | The plan list and kept what-ifs (gap 2's U16) | M | RightCapital's saved proposals | RC4 |
| RC6 | Retirement → Cash Flows: Summary and Accounts | M | the year table re-rendered; U15's paired years as the compare view; deletes `YearTable.tsx` | RC5 |
| RC7 | Retirement → Analysis → Confidence | S | the fan at full size, the run-out share | RC4 |
| | **Milestone 1**: the answer, the what-ifs and the year table in RightCapital's clothes | | | |
| RC8 | Tax → Tax Strategies | L | the recommendation's new home; deletes `Result.tsx`, `RecommendationSurface.tsx`, `RecommendationViz.tsx` | RC7 |
| RC9 | Retirement → Social Security | M | claim-age comparison on the what-if runner | RC8 |
| RC10 | Retirement → Health Care | M | deletes `HealthcareSheet.tsx`, `controlPreview.tsx`, `TwoFutures.tsx`, `chartText.tsx` | RC8 |
| RC11 | Retirement → Stress Test (the stresses B9 can run today) | M | a stopgap screen until map gap 8 | RC8 |
| RC12 | Investment → Asset Allocation and Tax Allocation | S | | RC8 |
| | **Milestone 2**: every retirement, tax and investment screen B9 can back today | | | |
| RC13 | Profile pages: card grids and drawers | L | deletes `FactsPage.tsx`, `StepSheet.tsx`; `editorSheets.tsx` shrinks to its assumptions arm | RC12 |
| RC18 | Settings (the gear) and the Display drawer (built straight after RC13; its ID keeps its number) | M | deletes `AssumptionPanel.tsx`, `editorSheets.tsx`, `controlSheet.tsx` | RC13 |
| RC14 | The first-run stepper | M | the walk goes: `flow.tsx`, `questions.tsx`, `AnswerStrip.tsx` and the intake components and CSS | RC18 |
| RC15 | Profile → Blueprint | M | | RC14 |
| | **Milestone 3**: the whole path from an empty plan is new | | | |
| RC16 | Dashboard → Balance Sheet | S | | RC15 |
| RC17 | Analysis → Comparisons, Retirement Details, Savings | M | | RC15 |
| RC19 | The vault and session screens | M | unlock, new plan, save, backup, restore, recovery, re-entry; deletes the probe page, `PendingPanel.tsx`, `NotePartsBlock.tsx`, `Disclaimer.tsx`, `ExternalLink.tsx` | RC17 |
| RC20 | Cash Flows → Maps | M | the one-year Sankey | RC6 |
| RC21 | Clean-up and the act's close | S | the legacy layer, old CSS and fonts go; Tailwind's preflight comes in | all |
| | **Milestone 4**: the act's close | | | |

The table is in build order. RC18 is built between RC13 and RC14: `AssumptionPanel.tsx` imports the walk's own
components (`fields`, `FieldError`, `questions`, `WorkingCostQuestion`, `WorkingYearLedger`,
`WorkingYearLeftOverQuestion`, `AnswerStrip`), so it has to go before the walk does, and Settings reads RC13's drawers,
not Blueprint. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

Gap 2 of the map (`docs/plans/rightcapital-map.md`) finishes inside this act: U9, U14 and U15 are built
(`5953cca9`, `00d8192a`, `7f8fccba`); U16 is RC5; U25 is superseded by the shell (RC2 and RC4). The map's later gaps
(3 onward) are not this act's units; each lands after it as its RightCapital screen (section 6).

---

## 1. Goal, and what is kept vs replaced

### 1.1 Goal

Briggsy opens B9 and it looks and moves like RightCapital: the two top bars, the module pages with folder tabs, a
chart beside the sentence that states its number, the Action Items tray under the Analysis panel, cards and right-side
drawers for every fact, the six-step chevron setup. Every number on those screens is the engine's own, every screen
says what it cannot know yet, and B9's own answers (the work-optional date, the graded recommendation, the survivor
and essentials readings, the ACA years) have homes in RightCapital's frames.

### 1.2 Kept: the engine and every engine-facing `.ts` module

Unchanged in this act: `src/engine/` (including the solver and the worker pool), `src/crypto/`, `src/store/`,
`src/shared/` (schema version 6 stays; this act adds no saved shape), `src/budget/`, the CSP header in `vercel.json`.

Kept and read by the new screens:
- `src/intake/*.ts`: `intakeMap.ts` (`buildTableBase`, `isDateRoute`, `buildDateInput`), `whatIf.ts` (`applyBundle`
  and the `with*` writers), `sanity.ts` (`validateDraft`), `otherIncome.ts`, `solveDispatch.ts`, `referenceData.ts`,
  `workingYearQuote.ts`, `workingYearLeftOver.ts`, `workingYearLeftOverState.ts`, `unsavedBuffer.ts`, `links.ts`,
  `a11y.ts`, `gestureHold.ts`, plus the new `.ts` files RC0 creates.
- `src/ui/*.ts`: `copy.ts`, `copyGuard.ts`, `entryCopy.ts`, `unlockCopy.ts`, `answerView.ts`, `verdictSentence.ts`,
  `twoTier.ts`, `dateOdds.ts`, `dateSplit.ts`, `dateTradeoff.ts`, `outcomeStates.ts`, `recommendationView.ts`,
  `recommendationSaveView.ts`, `assumptionRegistry.ts`, `stalenessExposure.ts`, `stateTaxDisclosure.ts`,
  `healthSheetChrome.ts`, `bandAnnotations.ts`, `noteParts.ts`, `money.ts`, `appModel.ts`, `scenarioFromDraft.ts`,
  `draftFromScenario.ts`, `vaultSession.ts`, `resultSave.ts`, `passphraseStrength.ts`, `updateGate.ts`,
  `unloadGuard.ts`, `devSeeds.ts`, `reentryChrome.ts`. The chrome composers tied to a retired chart
  (`bandPanelChrome.ts`, `oddsLadderChrome.ts`, `twoFuturesChrome.ts`) keep the parts the new charts read and shrink
  with their charts.
- `src/ui/workbench/*.ts`: `whatIfRun.ts`, `tableRun.ts`, `railChrome.ts`, `yearTableChrome.ts`, `factsChrome.ts`,
  `factRegistry.ts`.
- `src/viz/*.ts`: `bandData.ts` (the fan's input contract and its y lattice), `curveMarks.ts` (the odds marks and
  their honesty rules), `palette.ts` (the data colours and the colour-blind test), `scale.ts` (the lightness ramp).
- Every unit test of the above.

### 1.3 Replaced

- Every `.tsx` in `src/ui/`, `src/ui/workbench/` and `src/intake/`, re-rendered as RightCapital screens in the new kit.
- All CSS: `src/ui/styles/*.css`, `src/intake/*.css`, `src/viz/*.css`, `src/ui/workbench/workbench.css`,
  `src/ui/preview/preview.css`. Replaced by `src/ui/styles/theme.css` and `src/viz/charts/chartTheme.css`.
- The hand-drawn SVG charts and their pixel maths: `ConfidenceBand.tsx`, `ConfidenceBandPanel.tsx`, `BandLegend.tsx`,
  `BandEnlargeModal.tsx`, `OddsLadder.tsx`, `TwoFutures.tsx`, `RecommendationViz.tsx`, `chartText.tsx`,
  `bandGeometry.ts` (after RC0 moves its cohort functions out), `oddsLadderGeometry.ts`.
- The dev previews `U7Preview.tsx` and `DatePreview.tsx` in `src/ui/preview/` (they preview the old answer surface);
  `RefiguringPreview.tsx` and the preview fixtures stay (section 5.1).
- The fonts Fraunces and Source Sans 3 (Figtree replaces both, ref 3.5).

Old surfaces are deleted as their replacement lands, never archived (section 5 has the schedule).

### 1.4 RC0: pull the logic out of the `.tsx` files (the extraction-first rule)

**The rule is "keep every pure function", not "keep every `.ts`".** Exported non-visual functions that kept code or
tests use live inside `.tsx` files today. Before any `.tsx` is deleted, each moves into a `.ts` home with its tests,
with no behaviour change. RC0 lands first so later units can delete freely. *(the pilot's call, 2026-11-24, b9-3
(Briggsy pre-approved all changes))*

| From | Symbols | New `.ts` home |
|---|---|---|
| `src/intake/fields.tsx` | `parseMoney`, `formatMoney`, `formatMoneyPair`, `parsePercent`, `formatPercent` | `src/intake/moneyFormat.ts` (read by `sanity.ts`, `workingYearQuote.ts`, `workingYearLeftOver.ts`, `factsChrome.ts`, `railChrome.ts`) |
| `src/intake/questions.tsx` | `writeWorkingYearInvestment`, `writeMedicareExtras`, `oopExceedsBudgetlessSpend`, `governedSpendNotes`; and the step sequence of `intakeSteps` as a new `intakeStepIds(draft)` returning step ids (`StepSectionId`), which `intakeSteps` then maps to its step bodies | `src/intake/steps.ts` |
| `src/intake/flow.tsx` | `continueCheck`, `discardRefusedOnLeave` | `src/intake/stepChecks.ts` |
| `src/intake/AnswerStrip.tsx` | `threeThenMore`, `missingFactNames`, `missingFactLines`, `blockedLeadFor` | `src/intake/missingFacts.ts` |
| `src/intake/AssumptionPanel.tsx` | `methodologyArmFor`, `workingCostValueLine` | `src/intake/assumptionLines.ts` |
| `src/intake/AccountEntry.tsx` | `kindLabel` | `src/intake/accountKinds.ts` |
| `src/intake/AllocationEntry.tsx` | `legsOf`, `classifyLegs` | `src/intake/allocation.ts` |
| `src/intake/BudgetBuilder.tsx` | `medicalExceedsTotal` | `src/intake/budgetChecks.ts` |
| `src/intake/BudgetLineItem.tsx` | `lineDisplayName` | `src/intake/budgetLines.ts` |
| `src/intake/FieldError.tsx` | `fieldErrorId`, `fieldErrorText` | `src/intake/fieldErrors.ts` |
| `src/intake/OtherIncomeEntry.tsx` | `incomeTypeLabel`, `survivorNoteFor` | `src/intake/otherIncome.ts` (exists) |
| `src/intake/RothLever.tsx` | `rothPlanMissingField` | `src/intake/rothPlan.ts` |
| `src/intake/WorkingYearLedger.tsx` | `laterLines` | `src/intake/workingYearLines.ts` |
| `src/ui/Disclaimer.tsx` | `verdictDescribedBy` | `src/ui/disclaimerId.ts` (not `disclaimer.ts`: on Windows's case-blind disk `./Disclaimer` would resolve to it before `Disclaimer.tsx`) |
| `src/ui/editorSheets.tsx` | `recomputeBoth`, `recomputeAfterEdit` | `src/ui/recompute.ts` |
| `src/ui/FuckOffDate.tsx` | `heroLead`, `floorLineText`; the `FuckOffDateView` type (read by `answerView.ts`) | `src/ui/dateHero.ts`; the type into `src/ui/answerView.ts` |
| `src/ui/ConfidenceStatement.tsx` | the `ConfidenceStatementView` type (read by `answerView.ts`, `recommendationView.ts`, `RecommendationSurface.tsx`) | `src/ui/answerView.ts` |
| `src/ui/GradeSignal.tsx` | the `GradeSignalState` type (read by `recommendationView.ts`) | `src/ui/recommendationView.ts` |
| `src/viz/ConfidenceBandPanel.tsx` | the `BandPanelChrome` type (read by `bandPanelChrome.ts`) | `src/viz/bandData.ts` (it stays in the viz layer: `ConfidenceBandPanel.tsx` reads it until RC4, and viz may not import ui) |
| `src/ui/SaveSlot.tsx` | `useSaveAnnouncer` (a hook, no JSX); the `ResultSaveProp` type (read by `IntakeApp.tsx`) | `src/ui/saveAnnouncer.ts` |
| `src/ui/Result.tsx` (inline `useMemo` logic, not exports) | the notes the hero receives, as one pure composer `composeAnswerNotes`: the state clause; the Medicare-priced affirmation (`showMedicarePricedNote`) and the Medicare residual; the F5 extras appendix (`composeMedicareExtrasTypicalNote`); the staleness note and its left-over clause; the ONE standing line and its cause (W stale first, then `w-typed-below`, then left-over-moved, the moved left-over riding the staleness note instead when `leftOverClauseHost` says so); the aged-balances year; the plan-clock anchor (the wall year passed in). Every note reads the ANSWERED draft (`snapshot.answer.draft`, KTD5), never the live one, and a read-only tab gets every note through `withoutDoor` | `src/ui/answerNotes.ts`; `Result.tsx` calls it, and `snapshotView.ts` and `probabilityView.ts` read only it |
| `src/ui/workbench/PinnedAnswer.tsx` | `pinnedLines`, `reserveForms` | `src/ui/workbench/pinnedLines.ts` |
| `src/ui/workbench/RailLevers.tsx` | `policyWords`, `rothWords` | `src/ui/workbench/railChrome.ts` |
| `src/ui/workbench/WhatIfPage.tsx` | `useWhatIf` (a hook, no JSX) | `src/ui/workbench/useWhatIf.ts` |
| `src/viz/bandGeometry.ts` | `isThinCohort`, `truncateFanAtThinCohort`, `COHORT_FADE`, `selectAtRangeColumn`, `AT_RANGE_COHORT_MIN` (read by `answerView.ts`, `bandPanelChrome.ts`, `healthSheetChrome.ts`, `twoFuturesChrome.ts`) | `src/viz/cohort.ts` |
| `src/viz/TwoFutures.tsx` | `twoFuturesLattice`, `twoFuturesCeiling`, `tfNearestYear`, `composeTfReadoutLines` (read by `recommendationView.ts`, `twoFuturesChrome.ts`) | `src/viz/twoFuturesData.ts` |
| `src/viz/OddsLadder.tsx` | the `OddsLadderLabels` type (read by `oddsLadderChrome.ts`) | `src/viz/curveMarks.ts` |
| `src/viz/RecommendationViz.tsx` | the `RecommendationVizLabels` type (read by `recommendationView.ts`) | `src/viz/recommendationVizData.ts` |

Not extracted (each dies with its surface and nothing kept reads it): `useStepApi` (the walk), `useEditorSheets`,
`useControlPreview` (the lever sheets; the store's `src/store/controlPreview.ts` is separate and stays), the
chart-text layout hooks in `chartText.tsx`, and `crownHeadroomPx` and `crownSeat` in `OddsLadder.tsx`.

**RC0's done test.** Two greps come back empty: a non-test `.ts` file importing from a `.tsx` module, and a test
importing a non-component export from a `.tsx` module. The full unit suite passes with the same test count. The
builder re-runs the export grep (`^export (function|const) [a-z]` over the `.tsx` files) in case the list above
missed one.

**Render tests of old components.** Many tests render a `.tsx` and assert behaviour (`Result.test.tsx`,
`FuckOffDate.test.tsx`, `roomSentenceSeedGate.test.tsx`, `survivorSpendingBasisSeedGate.test.tsx` and the rest). They
stay until their component is deleted. In the unit that deletes a component, the builder reads its render tests and
sorts each assertion: an **honesty law** (a line present, a state named, a figure's source, a refusal) is re-asserted
on the new screen's composer or the new screen; a **layout or old-markup detail** goes with the component. The commit
message lists the ported laws. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**`composeAnswerNotes` lands with its laws.** It takes the snapshot plus the session facts `IntakeApp` threads to
`Result.tsx` today (read-only, the staleness note, `leftOverClauseHost`, the aged-balances year, the wall year). In
RC0 the honesty assertions of `resultPayCheckLine.test.tsx`, `resultDisclaimer.test.tsx`, `spendClause.test.tsx` and
`survivorSpendingBasisSeedGate.test.tsx` are re-asserted on the composer, before anything is deleted; the render tests
stay until RC4.

**Source-bind tests move with the call, never die with the file.** Some tests read a component's source by path to
prove it still routes through a seam (the mutant-killers): `planClockSeam.test.ts` (`Result.tsx` minting
`planClockAnchor`; a planted `+ 3` there once left 1,096 tests green), `goalLeadGate.test.tsx` and
`resultControlDoors.test.tsx` (`Result.tsx`, `editorSheets.tsx`), and `stalenessExposure.test.ts`,
`recSaveNoAutoWrite.test.tsx`, `draftFromScenario.test.ts` and `recommendationSaveGesture.test.tsx` (`IntakeApp.tsx`).
A source-bind test re-binds to the file that now makes the call (the screen's composer, `answerNotes.ts` or
`Shell.tsx`) in the unit that moves the call; it is never deleted with the old caller. `planClockSeam.test.ts`
re-binds to `answerNotes.ts` in RC0. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Files.** The `.ts` homes above; the `.tsx` files they leave; the tests that follow them; `src/ui/Result.tsx` (it
calls `composeAnswerNotes`); `src/ui/__tests__/answerNotes.test.ts`.
**Verification.** `pnpm typecheck`, `pnpm lint`, the moved tests and every test that imports them.

---

## 2. The stack adoption: RC1, the first unit that adds anything

### 2.1 RC1: the stack, the tokens and the CSP proof

**Goal.** RightCapital's own stack runs under B9's real CSP header, proven in a real browser before any screen is
built, and the token sheet is in place.

**Packages** (versions read from npm 2026-11-24; upgrading an existing dep later is approved, never pin):
`tailwindcss` and `@tailwindcss/vite` (v4); `@base-ui/react` (1.9.0); shadcn's CLI (4.23.0, Base UI flavour) run once
through `pnpm dlx` to copy components, never a dependency; `clsx` and `tailwind-merge` (shadcn's `cn`); `highcharts`
(13.1.1) and `@highcharts/react` (5.4.0); `@tanstack/react-table` (9.3.1); `lucide-react`;
`@fontsource-variable/figtree` (5.3.0). `motion`, React 19, Vite 8, comlink and idb stay.

**Decisions.**
1. **The three CSP fixes on day one** (ref 5): the app is wrapped in Base UI's `CSPProvider` with
   `disableStyleElements`, and the two-line `.base-ui-disable-scrollbar` rule is in `theme.css`; shadcn's `chart`
   component and `sonner` are never added (both inject a `<style>`); every Highcharts chart runs `styledMode: true` from
   one shared default, with `useHTML` off for legends, tooltips and labels. Base UI's opt-in `<script>` tags stay off
   (`script-src 'self'` blocks them). No library may inject a runtime `<style>`; `verify:csp` is the proof.
2. **CSS layers so the old and the new can live side by side** (the old surfaces stay until their units replace
   them). A one-line `src/ui/styles/layers.css`, imported first in `src/main.tsx`, declares the order `legacy, theme,
   base, kit, charts, utilities`. Every existing CSS file's rules are wrapped in `@layer legacy` (at-rules a layer
   cannot hold stay outside it). Tailwind is imported **without its preflight** (`tailwindcss/theme.css` and
   `tailwindcss/utilities.css` only). A copy of Tailwind's preflight rules sits in `@layer base`, scoped under
   `:where(.rc-root)`. **`.rc-root` goes on the top bar, the sub-nav, each new screen's root and the kit's portal host**
   (so Base UI's popups, which portal out of the shell, get it too), **never on the shell's outer frame**: an interim
   tab mounts in a plain container outside any `.rc-root` subtree. A later layer beats an earlier one whatever the
   specificity, so a preflight reset reaching an interim tab would strip its `@layer legacy` margins, borders and
   headings. RC21 drops the scope and imports the real preflight. Why the layers at all: unlayered old CSS would beat
   every Tailwind utility, and a global preflight would restyle every old surface the fit gates still measure.
   *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
3. **No token name is shared with the old CSS.** The old `tokens.css` defines `--text-xs`, `--radius-sm`,
   `--ease-out`, `--leading-body` and others that Tailwind's default theme also defines on `:root`; the later layer
   would silently change the old surfaces. The `@theme` block in `theme.css` starts with `--*: initial` (Tailwind's
   defaults emit nothing) and defines only role-named tokens (`--text-page-title`, `--text-metric`,
   `--radius-control`, `--radius-card`, `--color-stone-200`, `--color-plum`, `--spacing` and so on). A unit test lists
   every custom property in the legacy CSS and in `theme.css` and fails on a shared name. *(the pilot's call,
   2026-11-24, b9-3 (Briggsy pre-approved all changes))*
4. **Data colours are typed once.** `src/viz/palette.ts` gains RightCapital's categorical series (ref 3.2) and the
   fan's new hue as new exports (`RC_SERIES`, `RC_BAND`) beside the old ones, which go with the last old chart (RC10).
   `main.tsx` sets `--highcharts-color-0` to `--highcharts-color-12` (the names `highcharts.css` reads; there is no
   second `--series-color-N` name) once at start-up from `palette.ts` through the CSSOM
   (`document.documentElement.style.setProperty`), which `style-src 'self'` allows. An inline property on the root
   beats every stylesheet's `:root` rule, so Highcharts' default palette never shows. Never a runtime `<style>`.
   *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
5. **Highcharts' licence, read from the EULA itself** (`https://shop.highcharts.com/license-eula`, "End-user License
   Agreement 1.0", fetched 2026-11-24). A Personal Use licence "is granted automatically upon use by any natural
   person" for purposes "entirely non-commercial, non-professional, and for personal enjoyment or self-education"; its
   permitted examples include "personal websites/webapps without an income stream". B9 qualifies. The terms B9 must
   keep, and does: (a) **keep the credit**: the EULA says "proper accreditation should be made at all times" and bars
   disabling licence enforcement, so `credits` stays on with its default text and link, styled small in the chart CSS
   (the unload guard already asks before a stray click leaves an unsaved plan); (b) **never distribute the software**:
   the licensee may not "make available to any third party the original or any modified version of the source code or
   compiled software", so Highcharts' files are never vendored into this public repo, `dist/` stays gitignored, and the
   built app is never deployed to a public address (U24's home is his laptop only); (c) if B9 is ever shared with
   anyone, or sold, Highcharts must be licensed or replaced; Recharts is the named fallback. *(the pilot's call,
   2026-11-24, b9-3 (Briggsy pre-approved all changes))*
6. **Patterns come from shared `defs`, not the pattern-fill module.** In styled mode the pattern-fill module sets no
   fill (checked in `highcharts@13.1.1` by the critique). One shared `defs` option (`src/viz/charts/patterns.ts`) defines
   the diagonal hatch, the dots, the horizontal lines and the cross-hatch; `chartTheme.css` references them
   (`fill: url(#b9-hatch)`) on the series and on the legend symbols. **`highcharts.css` goes inside the charts layer**:
   `highcharts@13.1.1/css/highcharts.css` declares no layer and paints `.highcharts-color-N { fill: … }`, and unlayered
   CSS beats every layered rule, so a plain import would beat `chartTheme.css` and strip the hatch (colour would become
   the only signal). The charts layer starts with `@import 'highcharts/css/highcharts.css' layer(charts);`, then
   `chartTheme.css` in the same layer. That file also sets `color-scheme: light dark` on `.highcharts-container` (its
   neutral colours are `light-dark()` pairs), so `chartTheme.css` sets `.highcharts-container { color-scheme: light }`;
   a `color-scheme` on the shell root would not reach inside the chart.
7. **Printed values never hide.** Highcharts hides colliding data labels by default. Every chart where a printed value
   is a second cue sets `dataLabels.allowOverlap: true` and is sized so its labels fit; the chart-text gate asserts each
   required label exists, is visible and is unclipped (section 5).
8. **Motion.** The drawer and the tray animate with Base UI's CSS transitions (`data-starting-style`,
   `data-ending-style`). Never motion's `AnimatePresence mode="popLayout"` or layout animations (they inject a
   `<style>`). Chart animation is a short ease-out morph from old to new values (about 250 ms), off under
   `prefers-reduced-motion`; numbers never count up (ref 0, back-nine-design).
9. **Figtree** is self-hosted (`font-src 'self'`). `tabular-nums` goes on every number, chart CSS included (axes,
   tooltips, data labels): Figtree's default digits are proportional. Fraunces and Source Sans 3 stay loaded only for
   the old surfaces and leave at RC21.
10. **Kit components take every word as a prop.** The entry-chunk guard (`scripts/entryChunkGuard.ts`, live in
   `vite build`) refuses `src/ui/copy.ts` in any entry chunk's initial JS. The probe page is a second entry, and RC19
   rebuilds the entry-graph vault screens on the kit, so a kit component that read `copy.ts` (a Drawer's close label,
   a Toast's dismiss, the LoadingVeil's "Loading…") would fail `pnpm build`. Screens pass the words; the probe page and
   the RC19 screens pass them from `entryCopy.ts`.
11. **Chart option builders take their words.** `eslint.config.js` lets `src/viz/**` import only `@shared` and `@viz`.
   Every `src/viz/charts/*Options.ts` takes its words, counts and named moments as one injected labels object (the
   existing `oddsLadderChrome.ts` → `OddsLadderLabels` pattern), built by the screen's `src/ui/**/*View.ts` composer
   through `copy.ts` and its slots. The same composer supplies Highcharts' own words: the `lang` strings and the
   accessibility module's point-description formatter, so no built-in sentence bypasses `copy.ts` and `copyGuard` or
   reads a raw value (a ceiling column announced as "10"). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved
   all changes))*

**Amendments made while building RC1 (2026-11-24, b9-4).**
- **shadcn's CLI copy moves to RC2, the kit.** RC1's probe exercises Base UI's own primitives (a Dialog shaped as the
  right drawer, Select, ScrollArea, Toast, Slider) styled with Tailwind utilities; shadcn's copied components are
  Tailwind-classed wrappers over the same primitives, and `shadcn init` rewrites config files, so it belongs with the
  kit. `clsx` and `tailwind-merge` come in with RC1. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all
  changes))*
- **The clone's band uses chroma 0.085, not 0.095.** Measured with culori: at hue 272 the 0.095 cap's outer stop (L 0.82)
  falls outside sRGB and clamps; 0.0895 is the widest chroma that keeps the whole lightness range in gamut there.
  `RC_BAND` in `palette.ts` keeps B9's L stops at hue 272; the colour-blind test checks every stop is in gamut.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **Compact mode (ref 3.6) moves to RC2 with the shell it sizes.** The reference's `max-height: 800px` query would be a
  second short tier, which `scripts/__tests__/breakpoint-mirrors.test.ts` refuses (one tier: `--bp-laptop-short`'s
  `(min-width: 68rem) and (max-height: 840px)`); RC2 sizes the shell under that tier or rules a new one. *(the pilot's
  call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **Tailwind names its sources.** `theme.css` imports the utilities with `source(none)` and lists each new file or
  folder with `@source` (RC1: the probe), so an old component's class that shares a utility's name (`table`, `hidden`,
  `sr-only`) never picks one up; each new kit or screen folder is added there when its first file lands. *(the pilot's
  call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **Every font-load arm reads the font set's loaded entries**, with a fake family as the control: `document.fonts.check`
  answers true for a family that does not exist (insight 116), so the old faces' arm moved off it too. *(the pilot's
  call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*

### 2.2 The token sheet (`src/ui/styles/theme.css`), with the critique's contrast fixes

The chrome tokens, type scale, radii and spacing are ref 3.1, 3.5 and 3.6, under role names (decision 3). These pairs
change from the reference, each measured with culori 4.0.2 (WCAG contrast) on 2026-11-24:

| Where | Reference had | B9 uses | Contrast |
|---|---|---|---|
| Muted text on any stone surface (card bodies, the tray, table headers, sub-nav, read-only inputs, group headers) | `--stone-500` (3.72 to 4.37) | `--stone-600` `#57534e` | 5.91 to 6.95 |
| Every blue text: links, the tray's changed value, the ACTION ITEMS label, links in the tray | `--blue` `#5070e6` (3.76 to 4.37) | `--blue-ink` `#3d57d9` | 5.89 on white, 5.07 on the changed-value box, 5.05 on `--stone-200`, 4.57 on `--stone-250` |
| Solid blue panels with white text: primary buttons, the Add menus | `--blue` | `--blue-ink` fill | 5.89 |
| Cancel and other neutral buttons | white on `#a9a4a0` (2.47) | outlined: `--stone-300` border, `--stone-900` text | 15+ |
| Delete, and any white text on coral | white on `#e95b67` (3.41) | new `--coral-ink` `#c63d4b` | 5.04 |
| Shaded value cells (Tax Strategies) | white on light shades (2.04) | `--stone-900` on any shade lighter than `--blue-ink`; white only on `--blue-ink` | 8.56 on the palest |
| Values on the green bar | white on `#56a58c` (2.93) | printed above the bar in `--stone-900` | |
| Bracket line 22% (sand) | `#e1bd74` (1.79 on white) | stroke `--sand-ink` `#a8822f` (3.56) plus a dash pattern of its own and an end label | |
| Focused inputs | none | a 2 px `--blue-ink` ring (5.89); the 1 px `#d8d2c8` input border stays (RightCapital's look) | |

**Colour-blind pairs.** `src/viz/__tests__/colorblind.test.tsx` gains every categorical pair that sits side by side
anywhere in the clone, each asserted to clear the 0.10 floor under all three simulations or listed by name as "carried
by its second cue" (ref 3.4 and the critique's added pairs: 22% sand against 24% orange, Federal blue against Local
purple, series green against series teal). Green `#56a58c` and teal `#25a88b` never share a chart. The band hue moves
to about 272 under B9's lightness law (`BAND_HUE` in `palette.ts`, ref 3.3), re-checked by the same test.

### 2.3 RC1's proof page and its checks

- **The probe page.** A second Vite entry, `kit-probe.html` (multi-page build input), so the production `dist/` holds
  it and no app code path does: a Base UI Dialog shaped as the drawer, a Select, a ScrollArea, a Toast, a Slider, a
  TanStack table with a grouped header, and a Highcharts chart in styled mode with the accessibility module and the
  shared `defs` patterns, credits on. It is deleted at RC19, when every piece renders in a real screen a CSP arm visits.
- **`e2e/csp.spec.ts` gains one arm** on the served `dist/` with `vercel.json`'s headers: the probe page opens each
  component (dialog open, select open, slider moved, toast shown, table drawn, chart drawn with its hidden
  screen-reader nodes, a point hovered until its tooltip shows, a legend item clicked to hide and show its series)
  with no `securitypolicyviolation` of any directive and no request off the build's origin. A red names the library;
  the fallbacks are React Aria (components) and Recharts (charts). The same arm reads the cascade, a new kind of check
  (the colour-blind second cue on a Highcharts chart): the probe chart's hatched series and its legend symbol have a
  computed `fill` of `url("#b9-hatch")`, and series 0's computed fill equals `palette.ts`'s value, so neither
  `highcharts.css` nor its default palette won.
- **`e2e/design-tokens.spec.ts` gains Figtree's arms**: it loads under the enforced CSP, and its tabular digits are
  equal-width (with the probe's existing proportional control).
- **The legacy layer changes nothing.** CI's `verify:fit` and `verify:csp` stay green on the old surfaces.
- **The guards that read files by path move in the same commit** (the cadence's "test files the change reaches"
  would not run them locally): `src/ui/__tests__/tokens.test.ts`'s "every src/**/*.css except tokens.css is hex-free"
  arm also allows `src/ui/styles/theme.css` (the new canonical sheet; `chartTheme.css` stays var-only).

**Docs in RC1's commit.** `.claude/skills/back-nine-design/SKILL.md` is updated where the clone overrules it (ref 7):
the chrome palette becomes the token sheet; the palette law becomes "RightCapital's series hues, each side-by-side
pair measured against the 0.10 floor or listed as carried by its second cue"; the band hue moves to about 272 under
the same lightness law; "the band is never on the verdict's first frame" goes; Fraunces and the cream paper go; the
browser-surfaces reminder (selection colour, caret, scrollbars, focus rings, tabular numerals) is added. The project
`CLAUDE.md`'s UI design skills section says the reference screenshots and this plan outrank `frontend-design`, and
names `dataviz` for chart units. `docs/architecture.md` §10 gains the stack's CSP notes (Base UI's
`disableStyleElements`, Highcharts styled mode, no runtime `<style>`). `docs/product.md`'s 2026-11-22 flag and the
map's "nothing is copied from RightCapital's screens" line each gain a dated pointer to the 2026-11-24 ruling.

**Files.** `package.json`, `vite.config.ts`, `kit-probe.html`, `src/kit-probe.tsx`, `src/main.tsx`,
`src/ui/styles/layers.css`, `src/ui/styles/theme.css`, every legacy CSS file (the layer wrap), `src/viz/palette.ts`,
`src/viz/charts/patterns.ts`, `src/viz/charts/chartTheme.css`, `src/viz/charts/defaults.ts` (the shared Highcharts
options), `src/viz/__tests__/colorblind.test.tsx`, `src/ui/__tests__/tokens.test.ts`, `e2e/csp.spec.ts`,
`e2e/design-tokens.spec.ts`, the docs above.

**Test scenarios.**
- The token-name test fails on a planted shared name (`--radius-sm` in `theme.css`) and passes without it.
- The palette test: every listed side-by-side pair passes or is named as cue-carried; a planted merging pair with no
  cue fails.
- `seriesVars` sets every `--highcharts-color-N` from `palette.ts` and nothing else (a unit test on the CSSOM writes).
- The CSP probe arm, with the existing no-CSP control pattern: an injected `<style>` on the probe page is reported
  blocked, so the arm can fail.

**Verification.** `pnpm verify:csp` locally and in CI (this result gates RC2); `pnpm typecheck`, `pnpm lint`,
`pnpm build`; CI's `verify:fit` green on the untouched old surfaces.

---

## 3. The shell: RC2

### 3.1 RC2: the kit and the shell

**Clones.** Ref 2.0 (top bar, sub-nav, page head, folder-tab panel, chart card grammar, key-metric column, legend and
tooltip, ACTION ITEMS handle, the tray's chrome, the right drawer, inputs, buttons, Add menus, tables, loading, stale and
empty states) and ref 2.21 (the phone). Screens: `rc-shell/planoverview-05.gif`,
`rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`,
`rc-analysis/probability-tab-retirement-analysis__cleanshot-2024-07-26-at-17-10-07-2x.png`,
`rc-shell/vimeo-income_add-a-salary.jpg`, `rc-shell/bp-networth-22.png`,
`rc-analysis/FRAME_probability-refresh-loading-state.png`.

**The kit** (`src/ui/kit/`; shadcn's Base UI components copied once and restyled to the role tokens, so the code is
ours): `Button` (primary `--blue-ink`, secondary outlined blue, destructive `--coral-ink`, neutral outlined grey, a `>`
chevron when it opens a menu), `MoneyInput` and `PercentInput` (`$` prefix, `%` suffix, parsing through
`moneyFormat.ts`), `Select`, `Slider`, `Switch`, `Checkbox`, `SubNav`, `FolderTabs`, `Drawer` (a Base UI Dialog docked
right at about 45% width over a light scrim; plum header band with icon, title and X; optional previous/next
chevrons; a two-column body; a `--stone-200` footer with Delete left and Cancel and Save right; a full-screen sheet on
the phone), `AddMenu` (`--blue-ink` panels with flyout sub-menus), `Tooltip`, `Toast`, `ScrollArea`, `DataTable`
(TanStack: the 2 px plum top rule, group header row, column header row, right-aligned numbers without `$`, negatives
in parentheses, faint zebra, sticky Year and Age columns, underlined drill headers, the download button), `Card`
(Snapshot's 12 px card), `ProfileCard` (the plum header band, the selected band darker, the others fading while a
drawer is open), `PageFrame` (title, intro line, folder tabs on the panel's right edge, the panel, the centred chart
title that is a menu when the tab holds more than one chart, the pickers at the top right with "vs", the 70/30 chart
and key-metric split, the "Values in today's dollars, rounded" line under the folder tabs on value screens, the ACTION
ITEMS or DETAILS handle on the panel's bottom edge), `Tray` (two column groups on `--stone-100`, the row anatomy, the
footer), `StaleBanner`, `EmptyState` (a bold centred sentence saying what the screen waits for, and one button),
`LoadingVeil` (the old chart at 40% opacity with "Loading…" over the number), `Ring` and `TickDial` (section 4.0).
Icons: `lucide-react` at 1.5 px stroke, always beside a word (ref 3.8).

**Amendments made while building RC2's kit (2026-11-24, b9-4).**
- **RC2 is built in two halves.** RC2a is the kit alone (`src/ui/kit/`, the phone tier, the `compact:` variant, the
  probe page rendering the kit, the breakpoint arm); RC2b is the shell, the routing, `IntakeApp`'s `workspace` phase and
  the room's deletion. Each half is its own commit. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all
  changes))*
- **shadcn's CLI ran in a scratch project, never in the repo.** `shadcn@4.23.0 add` (the `base-nova` style, Base UI)
  copied button, input, select, slider, switch, checkbox, tabs, sheet, dropdown-menu, tooltip, scroll-area, table and
  card there; it wanted the npm package `cn` (it could not resolve a `utils` alias), `class-variance-authority`, and its
  global theme sheet with the `tw-animate-css` classes. None of that came in: the components were rewritten into
  `src/ui/kit/` on the role tokens, with the kit's own `cn` (`src/ui/kit/cn.ts`, tailwind-merge told the role scales,
  so `text-page-title` and `text-plum` no longer read as one kind) and plain variant maps instead of `cva`.
  `components.json` at the project root points a future `shadcn add` at `src/ui/kit` and `src/ui/styles/theme.css`;
  run it in a scratch copy the same way. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The phone tier is `--breakpoint-wide: 48rem` in `theme.css`** (Tailwind's `wide:` variant, past the phone), with
  `--breakpoint-laptop: 68rem` (`laptop:`, the existing seam) beside it; compact mode is a `compact:` variant written
  once in `theme.css` on the existing short tier's exact prelude. The tray is the one kit part that changes WHAT it
  renders at the phone tier (a panel under the frame, a full-height sheet on the phone), through `useWide`'s
  `matchMedia('(min-width: 48rem)')`. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The ring's centre words are 36 px (30 in compact mode), not the reference's 56 px.** B9's words ("7 of 10",
  "better than 9 in 10") are longer than RightCapital's "98%"; at 56 px "7 of 10" broke over two lines and touched the
  stroke on the probe. The ring stays about 184 px (160 compact) with an 8 px stroke. *(the pilot's call, 2026-11-24,
  b9-4 (Briggsy pre-approved all changes))*
- **The intro line is never clamped to one line in compact mode.** Cutting the answer sentence would cut content (the
  content-over-looks rule); each screen writes an intro that fits one line at his window, and the fit arms see it.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **Icons sit beside a word, the download button too** (ref 3.8 over ref 2.0's icon-only square): the table's download
  is the outlined blue button with its icon and its word. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all
  changes))*

**Amendments made while building RC2's shell (2026-11-24, b9-4).**
- **The door lands on Retirement → Cash Flows,** the year-by-year table, as the room's door did; its words ("See your
  plan year by year") stay true until RC3 moves it to Snapshot. Entering always lands there; the page then lives in
  `IntakeApp`'s state and the hash. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **No gear and no Lock item yet.** The gear opens nothing until RC18's settings, and the app has no in-session lock, so
  neither is drawn (no dead control). The lock menu holds the save state's sentence and the state's actions (Keep,
  Save your changes, Try again or Reload, and Back up where a vault exists in the session and the tab can write).
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The lock carries the save state in words on the bar** ("Saved", "Unsaved changes", "Saving…", "Not saved",
  "View only"), beside the icon (ref 3.8: an icon never stands alone), so the state is never hidden inside a menu; a
  failed save is also spoken as an alert. *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **History: one entry per page, each `{ b9: 'workspace', n }`,** `n` its place in the visit, so the wordmark goes
  straight back to the answer (`history.go(-n)`) as one move. A move between pages asks first only over an open
  drawer's edit (the what-if survives a page change); a leave past the shell (Back or the wordmark) asks over an open
  drawer's edit and over an unkept what-if, each in its own words (`workbenchLeaveAsk`, `shellLeaveWhatIf`). An unkept
  what-if also holds the browser's own leave dialog (insight 112), through `IntakeApp`'s guard, never the open
  entries' count. A page address left from an earlier load is dropped when the answer page lands.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **Interim tabs draw no folder tabs.** Analysis holds one tab (What if), which rides in the hash; the interim page keeps
  its old look under the banner, its heading and the intro line. The interim pages keep the old cream page.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **On the phone the sub-nav leaves with the modules:** the menu sheet holds every module and page. The top bar's
  height is a floor, not a cap: two long names wrap and the bar grows (the widest household's names pushed the menu
  button 18 px off a 390 px phone at a fixed height). *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all
  changes))*
- **The shell's load failure prints the answer's lead** on the failure page, beside "Back to your answer", so a failed
  load after its retry still leaves the answer readable (U25's rule). *(the pilot's call, 2026-11-24, b9-4 (Briggsy
  pre-approved all changes))*
- **Figtree loads in the main app, and the legacy element rules stop at `.rc-root`.** Only the probe imported the face,
  so the shell's surfaces fell back to the system sans: `src/main.tsx` imports `@fontsource-variable/figtree` beside
  the two old faces (the probe keeps its own). The legacy layer's bare element rules (`base.css`'s `h1` to `h6` face,
  leading, tracking and colour, `p`'s reading measure, `small`'s colour) reached every element the scoped preflight
  does not reset, and the phone menu's headings drew in Fraunces: `theme.css`'s base layer neutralises them under
  `:where(.rc-root)` (heading size and weight were already reset there). `e2e/design-tokens.spec.ts` reads Figtree
  loaded and computed inside the shell on the built app; `e2e/rc-screens.spec.ts` reads the face, the colour and the
  measure. RC21 deletes `base.css` and the neutraliser with it. *(the pilot's call, 2026-11-24, b9-4 (Briggsy
  pre-approved all changes))*

**The shell** (`src/ui/shell/`):
- **Top bar**: the B9 wordmark (ours), the two names stacked, the module words in RightCapital's order (Dashboard,
  Investment, Retirement, Tax, Profile), each shown only when at least one of its pages exists; the active module's
  `--stone-200` block joining the sub-nav; at the right a lock icon (B9's encrypted save: the save state, Save, Lock,
  Back up) and the gear.
- **Sub-nav**: the module's pages, the active one darker with the 3 px blue underline.
- **No dead tabs.** A module, page or folder tab shows only when its screen exists (ref 1.2). The route tree is one
  pure table, `src/ui/shell/routes.ts`, that each screen unit adds its rows to.
- **The lock menu** reads the one save machine (`deriveResultSave` in `src/ui/resultSave.ts`) through a pure
  composer, `src/ui/shell/lockMenu.ts`: saved, unsaved changes, saving, save failed (with retry), read-only (the
  view-only state: no save), no vault yet (Save opens the save ceremony). Back up opens the existing backup step until
  RC19 restyles it.
- **The phone shape** below 48rem: the wordmark, the names and a menu button that opens a sheet of modules and pages;
  folder tabs as a sideways-scrolling strip; the key-metric column under its chart; the tray as a full-height bottom
  sheet; drawers as full-screen sheets; tables with sticky Year and Age that scroll sideways inside their own frame
  while the page never does; Snapshot cards in one column. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved
  all changes))*
- **Breakpoints.** Phone shape below 48rem; the panel's 70/30 chart and key-metric split stacks below the existing
  seam, `--bp-laptop` (68rem); both in rem, so the reader's browser font picks the tier (`docs/architecture.md` §12's
  rem law). **Compact mode** reuses the existing short tier, prelude exactly `@media (min-width: 68rem) and
  (max-height: 840px)` (`--bp-laptop-short`; his 1440×731 window sits inside it): top bar 48 px, sub-nav 40 px, page
  title 32 px, the intro one line, panel padding 32 px (ref 3.6). The one new tier, the phone's 48rem, is declared once
  as a token, and `scripts/__tests__/breakpoint-mirrors.test.ts`'s "ONE seam" arm changes in RC2's commit to "every
  rem width equals a declared tier" with the phone tier added by name (the arm's own route for a new tier), its
  height-prelude and no-range-syntax arms unchanged. Tailwind's `--breakpoint-*` values in `theme.css` are among the
  values that arm checks. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Routing.** No router library. The route (module, page, folder tab) is state held in `IntakeApp`, which stays mounted
for the whole session (KTD31's reason: unmounting it would lose the draft's save state, the unsaved mark and the leave
guard). The route is mirrored to the address's hash (`#/retirement/analysis/probability`) through `history.pushState`,
so Back and Forward move between pages and `popstate` restores the route. No plan data ever rides in the hash or a
history entry. Back with an open drawer holding an unsaved edit, or with an unkept what-if, asks first, in the app (a
Back press cannot be cancelled, so the entry is pushed again and the ask shows, U6's mechanism). The dev `?seed=` and
`?vault=` query shortcuts keep working. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**The settle hook.** Every real-browser harness waits on `main.result[data-answer-tier="final"]:not([data-answer-refiguring])`
(`SETTLED_RESULT` in `e2e/reviewSurface.ts`). The shell renders one `<main class="result">` carrying both attributes,
mirrored from the store exactly as `Result.tsx` mirrors them, on every page, so a seed settles wherever it lands.
`main.result` belongs to the shell alone: from RC4 the interim `Result.tsx` renders a `<div class="result-page">`
with no tier attributes (two matches would make `SETTLED_RESULT` a strict-mode error in every gate, and nest a
`<main>` in a `<main>`). RC2 renames `result.css`'s `.result` layout rules (`display: flex`, centring, padding) to
`.result-page`, and the old answer page's `<main>` carries both classes until RC4, so the legacy layer never lays out
the shell's `<main>`. `app.css`'s `main.result[data-inframe-disclaimer] ~ .disclaimer` hide rule stays as it is
(section 4.0's R13 rule uses it).

**How the shell arrives (coexistence).** *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- **RC2: the shell replaces the workbench room, behind the room's existing door** on today's answer page. The room's
  phase in `IntakeApp` becomes the `workspace` phase. Its lazy chunk, error boundary and retry keep `RoomSlot.tsx`'s
  pattern (one memoized lazy import whose failure clears the slot, insight 053), renamed `ShellSlot.tsx`. What
  `WorkbenchRoom.tsx` makes once moves into `Shell.tsx`, so runs survive a tab switch: the steady and rough table
  lanes, `useWhatIf`'s slot and bundle, the facts page's door map, and the leave ask. The room's three pages ride
  inside the shell as **interim tabs** in their current look, each in a plain container outside any `.rc-root`
  subtree: Retirement → Analysis → "What if"
  (`WhatIfPage.tsx`), Retirement → Cash Flows (`YearTable.tsx`), Profile (`FactsPage.tsx`). The wordmark returns to
  the answer page. U6's history entry and leave ask carry over unchanged.
- **RC3**: the door lands on Dashboard → Snapshot.
- **RC4: the shell becomes the home.** Setup's end, a reopened vault and every dev seed land on Snapshot; the door,
  the `result` phase and the room's history entry go; the answer half of `Result.tsx` is deleted. What is left of
  today's answer page rides as interim tabs until its unit: the recommendation surface under Tax → Tax Strategies
  (until RC8), the health sheet under Retirement → Health Care (until RC10), the assumption panel in the gear's drawer
  (until RC18). This is gap 2's U25, done in RightCapital's form.
- An interim tab wears a one-line banner, "This page keeps its old look until it is rebuilt" (copy key in `copy.ts`),
  so the mix of looks is never mistaken for the finished design.

**Retired vs working.** The shell is the same for both. The module rows that differ (Analysis → Savings, the
odds-by-stop-year chart) are their units'.

**Files.** `src/ui/kit/*`, `src/ui/shell/Shell.tsx`, `ShellSlot.tsx`, `routes.ts`, `lockMenu.ts`, `TopBar.tsx`,
`SubNav.tsx`, `PhoneMenu.tsx`; `src/ui/IntakeApp.tsx` (the `workspace` phase); the interim tabs' container, which now
imports `workbench.css` (only `WorkbenchRoom.tsx` and `RoomSlot.tsx` import it today); `src/ui/copy.ts`; `components.json`
(shadcn's config pointing at `src/ui/kit`); `src/ui/styles/result.css` and `src/ui/Result.tsx` (the `.result-page`
rename); `src/ui/styles/theme.css` (the phone tier's token); `scripts/__tests__/breakpoint-mirrors.test.ts`;
`playwright.fit.config.ts` and `playwright.config.ts`; deletes `src/ui/workbench/WorkbenchRoom.tsx`, `RoomSlot.tsx`,
`PinnedAnswer.tsx` (its lines, already moved by RC0, become the interim pages' intro line) and `workbench.css`'s
room rules (the interim pages keep the rules they still use until their units).

**Test scenarios.**
- `routes.ts`: a module with no built page is absent; a page appears when its row is added; every hash the table
  produces parses back to the same route; an unknown hash lands on the module's first page.
- `lockMenu.ts`: each save-machine state gives its menu items; read-only gives no Save; a failed save offers retry.
- Back with an open drawer holding an edit asks first; Back with an unkept what-if asks first; Back with nothing open
  moves to the previous page; nothing about the plan appears in the hash.
- A failed lazy load of the shell, after its retry, leaves today's answer readable (U25's rule).
- The `main.result` attributes on the shell match the store's tier and refiguring flag through a provisional, a final
  and an edit's re-figuring.
- The phone menu opens the modules and pages and closes on choice; focus returns to the menu button.

**Verification.**
- CI `verify:csp`: the room arm becomes the shell arm (entered through the answer page's door, no violation of any
  directive, no request off the build's origin).
- CI `verify:fit`: new file `e2e/rc-screens.spec.ts` (added to `playwright.fit.config.ts`'s `testMatch` and to
  `playwright.config.ts`'s `testIgnore` denylist, or the harness-partition test reds) with the shell's arms: at
  1440×731 @2x the top bar is 48 px and the sub-nav 40 px (compact mode); at 390×844 the page never scrolls sideways
  and the menu reaches every page; the interim pages are reachable, and on one of them a legacy rule's computed padding
  survives inside the shell (the preflight scope holds). The room's old fit arms (U6 to U8, U15) re-point to the
  interim tabs or retire per section 5.
- Local: `pnpm verify:csp` once (it gates RC3); the look instrument (section 7) for screenshots at 1440×731 @2x and
  390×844 @3x.

---

## 4. The screens, one unit each, in build order

### 4.0 Rules every screen follows

**Colour roles** (critique 5). RightCapital is inconsistent (Retirement Comparisons paints the edited plan blue and
the compared plan green; Tax Strategies does the reverse). B9 uses one meaning everywhere: **the alternative being
looked at (a what-if, a kept what-if, the recommendation, a claim strategy) is green and solid** (solid fill, solid
line, filled markers, ■ legend chip); **the plan it is compared against is blue with the second cue** (outline-only
area with a dashed top line, dashed line, hollow markers, hatched bars, □ legend chip). The compared side is on the
right and is "your plan" unless its picker says otherwise; the cue follows the side's role, never the hue alone.
Comparisons therefore inverts RightCapital's screenshot on purpose; Tax Strategies matches its screenshot. Every pair
also gets direct end labels or printed values. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all
changes))*

**The ring** (ref 3.3, corrected by critique 12). About 184 px across with an 8 px stroke (RightCapital's is about
185 px CSS; the reference's 300 px read a 2x capture), 160 px in compact mode. The arc starts at 3 o'clock and runs
clockwise; the blue-to-green gradient runs top to bottom and carries no meaning; the unfilled arc is light grey; no
zones and no threshold tick. It is our own SVG (`src/ui/kit/Ring.tsx`), not a Highcharts gauge, with the number and
caption as HTML over it so they follow the font law. **The centre text comes from `copy.ts`'s slots, never
`${n} of 10`**: the slots handle the over-funded ceiling ("better than 9 in 10"), `indeterminate` (no number, no arc,
the outcome words) and `already-failing` (0 and an empty arc). The arc fills to X/10. The caption is the outcome word
from `OUTCOME_PRESENTATION` (`outcomeStates.ts`). One pure composer, `src/ui/ringReading.ts` (RC3), turns any answer or
what-if reading into the ring's view, and every ring reads it. *(the pilot's call, 2026-11-24, b9-3 (Briggsy
pre-approved all changes))*

**The two routes.** A retired household's answer is a `SimulationResult` (`answer.kind === 'headline'` in
`src/store/memoryModel.ts`'s `ModelAnswer`). A working household's is a `DateSearchOutcome` (`answer.kind === 'date'`):
two tracks (floor and lifestyle), each a per-offset curve of `DateOffsetReading`s, plus one `DateBand` at the crowned
date. It has no `Headline`, no `terminalValuesReal`, no `SurvivorReading`, no `floorReading`, no `depletionYears` and
no `HealthReadout`. Every unit below says what each route shows; a widget with no honest number on a route is left out
or carries its stopgap line, never a number from the other route.

**Answer states every figured screen shows**: provisional (the date route's 2,000-path tier, under D1's tag,
`answerProvisionalTag`); re-figuring (`answerRefiguringCaption` and its siblings: the old answer stays visible); the
what-if `waiting` state (until the final tier lands); `no-date-in-window`; `window-edge-unconfirmed`
(`dateWindowEdgeNote`); `input-failure` (no number, the reason); `indeterminate`; `already-failing`; and the three the
store's `ModelAnswer` adds: `pending` (the first run in flight: the computing frame, never a number), the
**fallback** (`idle` and `inputs-incomplete`: no figure, the missing facts named by `missingFactLines` and
`blockedLeadFor`, moved to `missingFacts.ts` by RC0, each with its door), and `compute-error` (the retry). Every
figured screen reads the answer through `selectElevatedAnswer` (`answerView.ts`), never `snapshot.answer` raw, from
RC3 on, so a fact cleared on the interim Profile page leaves each screen naming what it waits for, not blank.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**One plan reading.** The plan's own many-futures reading (the ring on Snapshot, the right half on Probability) comes
from one composer over `buildTableBase`: `whatIfRun.ts`'s `planReading`, exported as `planReadingFor(answer)`, the
same path the what-if compares against. On the date route that is the band's track at its offset, and with no date the
full track at the window's top (`buildTableBase` already decides both). Two derivations of one reading never exist.

**Read-only.** A read-only tab (the second tab, opened view-only) shows no control that writes the plan or the
vault: no Apply to my plan, no Keep this what-if, no rename, copy or delete in the plan list, no drawer Save or Delete,
no Add menu, no Keep this recommendation. Running something writes nothing, so Refresh and Find the best strategy
stay (as today: the rail withholds only Apply, `WhatIfPage`'s `!readOnly`). Each screen's view composer takes
`readOnly`, and its test proves a read-only view carries no write action.

**Figures.** `~` before every printed projected dollar figure (tooltips, data labels, metric columns); axis tick
labels carry none (they are scale). Axes abbreviate (`$500k`, `$2.5mm`). Table cells drop `$`, negatives in
parentheses. "X of 10", never a percent, for odds. Every printed odds count goes through the copy slots.

**Tax figures say only what they hold.** `taxPaid` is the income tax the portfolio's own income adds (federal, plus
state only where the state is priced: an `elsewhere` household's state part is a structural $0,
`taxOverlay.ts`); in a working year the tax on pay is not in it, and payroll tax is never income tax. So no tax label
states a scope ("federal and state together" appears nowhere); a tax figure is labelled "Income tax" and the page's
one state clause (`composeVerdictStateNote`, which already speaks for a priced state, Florida's $0 and the unpriced
monolith) says the scope; payroll tax keeps its own column. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved
all changes))*

**One-path views say so.** Steady (every year the middle return, middle lifespans; `steadyFuture` in
`src/engine/simulate.ts`) and Rough (the worst 30-year start in the committed historical series; `roughFuture` in
`src/engine/reference/roughSequence.ts`) are single paths. Every chart or metric drawn from one names its future in
its key-metric sentence or legend ("in the steady future"), so a one-path picture is never read as the odds.

**The disclosure map** (critique 10). Every honesty line already shipped gets a slot on the new screens:

| Disclosure | Producer | Copy keys | Screen and slot |
|---|---|---|---|
| The state clause (priced state, or the unpriced monolith) | `composeVerdictStateNote` in `stateTaxDisclosure.ts` | `verdictStateUnpricedNote` and the state slots | Probability's key-metric column, under the answer sentence; under Odds by stop year (no key-metric column there), first in the footnote row (`probabilityView.ts`'s `noteLines`; fix round 1 of the milestone-1 review); every figured page's footnote row ("every figured surface carries one state clause") |
| The Medicare residual | `composeVerdictMedicareResidual` | `verdictMedicareResidual` | Probability's footnote row; Health Care's key-metric column |
| The Medicare-priced affirmation | `showMedicarePricedNote` in `healthSheetChrome.ts` (over `spineMedicarePriced`, `isDateRoute`, `healthcarePriced`), through `composeAnswerNotes` | `verdictMedicarePriced` | Probability's key-metric column, just above the Medicare residual it qualifies; under Odds by stop year, the footnote row's first line, above that residual (`noteLines`, fix round 1) |
| The Medicare-extras appendix (F5) | `composeMedicareExtrasTypicalNote` over `medicareExtrasDisclosureView`, through `composeAnswerNotes` | `medicareExtrasTypicalBoth`, `medicareExtrasTypicalOne` and their fact slots | Probability's footnote row, after the Medicare residual; Health Care's key-metric column |
| The provisional tag and the re-figuring line | `answerView.ts` | `answerProvisionalTag`, `answerRefiguringCaption`, `answerRefiguringDate`, `answerRefiguringVerdict` | the page intro on Probability and Snapshot's ring card; the chart title on Odds by stop year |
| The thin-cohort cut | `truncateFanAtThinCohort` (moved to `src/viz/cohort.ts` by RC0) | none (the fan is cut where the cohort thins) | the fan everywhere. **The shipped cut stays**; the reference's "fade and say so" is not built (the 2026-07-03 cold-read ruling stands) *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))* |
| The non-monotone dip and the window-edge tell | `curveMarks.ts` (the `isDip` field of each `CurveMark`), `dateSplit.ts` | `dateNonMonotoneNote`, `dateWindowEdge`, `dateWindowEdgeNote` | Odds by stop year (on the column and under the chart); the Probability intro |
| The survivor spending basis | `verdictSentence.ts` | `verdictSurvivorSpendBasis` | under the "As the survivor" row on Probability |
| The survivor income step-down (one Social Security benefit ends, single filer's brackets: why the survivor's odds read lower) | `headlineRows` in `probabilityView.ts`, over `SurvivorReading.incomeStepDownMonthlyReal` (shown only for a drop that does not round to $0, as the old survivor card drew it) | `verdictSurvivorStepDown` | under the "As the survivor" row on Probability, after the spending basis: said once under both halves when both match (`shareRowNotes`), in each half when a lever moves it (a claim age) *(fix round 1 of the milestone-1 review: it died with `SurvivorReadout.tsx` in RC4, left off this map by oversight)* |
| The leave-more skew and the delta skew | `recommendationView.ts` (`skew`, `deltaSkew`) | `recSkewMedian` and the delta-skew line | the Winner card, beside its hero figure |
| The withheld conversion levers | `recommendationView.ts` (`withheldConversion`) | `recommendWithheldConversionsHeading` and its reasons | the Winner card, under the winner's sentence |
| The shape disclosure | `SolveRecommendation.disclosedDirectional` | `recHoldPrimaryDirectional` | the Winner card's footnote row |
| The recommendation's adjacent disclosures (NIIT and state scope, Social Security held fixed, heirs' bracket, the ACA caveat) | `recommendationView.ts` (`disclosures`, complete over `RecommendationDisclosureId`) | their keys | Tax Strategies → Strategies, under the Winner card |
| The aged-balances clause | `agedBalancesYearFor` in `resultSave.ts` | `ladderCaveatAgedBalances` and the verdict clause | the StaleBanner on Snapshot, Probability and Cash Flows, with its door where the tab can write. Cash Flows' row-one line (`workbenchAged`) names the build year and claims nothing about the balances ("the years since are modeled, not records"; a re-saver entered them later, U17 §S0.3), so the two lines say two causes *(round 3 of the milestone-1 review, replacing rounds 1 and 2's same-year suppression)* |
| The band's track note (whose world the range prices; council 2026-07-30, every band says so) | `bandTrackNote` in `src/ui/fanNotes.ts`, over the band's own `track` and `answerView.ts`'s `spendLevels` and `workingYearFigure` | `bandPricesEssentialsNote`, `bandPricesEssentialsWithLevels`, `bandPricesFullBudgetNote`, `bandPricesFullBudgetWithLevels`, `bandCountsWorkingYearsNote`, `bandCountsWorkingYearsWithLevels`; `answerRefiguringCaption` appended while re-figuring | under the fan, the working route: Snapshot's fan card and Confidence *(fix round 1 of the milestone-1 review: it died with `FuckOffDate.tsx` in RC4a)* |
| The aged fan's premise (U17 §S2) | `fanPremise` in `src/ui/fanNotes.ts`, wherever the fan draws its "Plan built" moment | `bandAgedPremiseSaved` (the balances saved in an earlier year, `agedBalancesYear`), else `bandAgedPremiseFresh` (the build year); the door `bandPremiseReconfirmCta` on a writable tab; on a read-only tab `bandPremiseReadOnly` after the words, in place of the door *(fix round 2)* | under Snapshot's fan; first in Confidence's key-metric column *(fix round 1: no screen printed it since RC4a)* |
| The essentials-only ring (a floor-keyed band: the lifestyle track undated, so the plan's reading is the floor pass) | `ringFace` in `ringReading.ts`, over the reading's own `track` (`WhatIfReading`'s offset arm, from `buildTableBase` through `planReadingFor` and `whatIfReading`) | `snapshotRingEssentialsNote` | under every ring that reads the floor pass: Snapshot's and both Probability halves, plan and what-if alike; Snapshot's ring card also prints the essentials date line (`floorLineText`), as Probability's intro does |
| The essentials-only stat dials | `statsView` in `snapshotView.ts`, over the steady rows' `TableMeta.track` | `snapshotStatFloorTrack` | under Snapshot's two stat dials |
| Why a floor-track what-if's odds can't move (U15's floorUnread line) | `floorUnread` in `railChrome.ts`, through `probabilityView.ts`'s difference line | `workbenchRailFloorUnread` | Probability's difference line, in place of "Both read", only where your plan is one of the two halves: on the right beside the what-if, or on the left (the empty what-if) beside a kept what-if *(fix round 2)* |
| A passed stop year on an aged plan | `ringFace` with `offsetHasPassed` (`curveMarks.ts`, the odds chart's own test) | `snapshotRingStoppedIn` | the ring's caption on Snapshot and Probability (the count kept: the plan's own reading, as "Stopping then" prints it) |
| The staleness note and the re-entry lines | `stalenessExposure.ts`, `reentryChrome.ts` | their keys | the StaleBanner, on Snapshot, Probability and Cash Flows (above its intro; Cash Flows since fix round 1 of the milestone-1 review) |
| The yield stopgap | `yieldLine` in `yearTableChrome.ts` | `workbenchYieldAllYears`, `workbenchYieldAfterWork`, `workbenchPairYield` | Cash Flows and the compare view, under each run whose taxable ledger holds money, named for that run |
| The lifespans line | `lifespansLine` in `yearTableChrome.ts` | its key | Cash Flows, under the table |
| Whose stop year the rows run at (the answer's date, the window's last year, or a what-if's stop-year lever, never credited to the answer's date) | `stopLine` in `cashFlowsView.ts`, over the run's own `TableMeta.stopYear` and `stopFrom` (`buildTableBase`'s `stopFrom`) | `workbenchStopsIn`, `workbenchNoDate`; `cashFlowsRunStopsLever`; in the paired view where the two runs' years differ, each run's, named: `cashFlowsRunStopsDated`, `cashFlowsRunStopsNoDate`, `cashFlowsRunStopsLever` | Cash Flows, under the table with the lifespans line *(fix round 1 of the milestone-1 review)* |
| The pay check's notes (what the pay check's income tax holds, by the run's state reading; where the state's tax on pay sits) | `payCheckNotes` in `yearTableChrome.ts` | `workbenchPayCheckNoteFederal`, `workbenchPayCheckNoteFederalState`, `workbenchPayCheckStateInW`, `workbenchPayCheckStatePayInW` | Cash Flows' notes wherever the "Pay check's income tax" column shows: the one-run table (the Summary and its drills) and the paired view, which carries that column and payroll tax whenever either run has a working year *(fix round 1 of the milestone-1 review)* |
| The one future's pinned answer is your plan's (over a what-if's table or the paired view, the steady sentence says the pinned answer reads your plan, not this table's run) | `aboutLines` in `cashFlowsView.ts` | `workbenchSteadyWhat` over your plan; `cashFlowsSteadyWhatOther` over any other pick | Cash Flows, first line under the table *(fix round 1 of the milestone-1 review)* |
| What the answer waits for (the fallback's missing facts; a failed answer; an answer with no reading yet) | `pinnedLines` in `pinnedLines.ts`, over `missingRequiredFacts`, `blockedLeadFor` and `missingFactLines` (the fallback `selectElevatedAnswer` names) | `answerIncomplete` or `answerWithheldLead` with `answerStillNeeded` and `answerCannotPrice`; `answerError` (the table: `workbenchTableAnswerError`, which names Analysis's Try again); `snapshotRingNoReading` | Cash Flows' intro (and the interim pages' intro, which share the box) *(fix round 1 of the milestone-1 review)* |
| The R13 disclaimer | `verdictDescribedBy` (moved to `src/ui/disclaimerId.ts` by RC0; not `disclaimer.ts`, which `./Disclaimer` would resolve to before `Disclaimer.tsx` on Windows's case-blind disk) | its keys | every figured page's footnote row inside the panel, above the handle, tied to the page's answer by `aria-describedby` (the R13 rule below) |
| The standing line (the pay check's: ONE at a time, in this order) | `composeAnswerNotes` over `workingYearCostStaleLine`, `workingYearCostTypedBelowLine`, `workingYearLeftOverMoved` (`workingYearLeftOver.ts`) | the W-stale keys; `workingCostTypedBelowAdds`; `stalenessLeftOverNote`, `stalenessLeftOverMoved`, `stalenessLeftOverMovedAt` (`workingYearLeftOverMovedText`) | the StaleBanner (Snapshot, Probability and Cash Flows), its door opening the Pre-retirement living expenses drawer: W stale first, then the typed-below line, then the left-over-moved line |
| The left-over clause on the staleness note | `composeAnswerNotes` over `workingYearLeftOverMovedClause` (`leftOverClauseHost`, decided once by `composeReentry`) | `stalenessLeftOverClause`, `stalenessLeftOverClauseAt` | the StaleBanner's staleness note; when it rides there, the standing line does not repeat it |

**Fit decision per screen** (the one-frame law binds one tier; every other tier is order and reachability,
`docs/architecture.md` §12). Each unit names its screen's decision; the default is: a single-chart page holds one
frame at 1440×731 @2x in compact mode, from the top bar down to the ACTION ITEMS handle with the tray closed, the R13
disclaimer inside that frame; a page of cards, a table or a form is a scrolling page whose first frame holds its
title, intro and first content row, with order and reachability asserted at the phone. *(the pilot's call,
2026-11-24, b9-3 (Briggsy pre-approved all changes))* On a landed what-if the frame binds to the R13 caveat, and the
ACTION ITEMS handle may sit just below it (budget's landed state, where the survivor step-down line under the survivor
row puts it 27 px down), never at the cost of a line. *(pilot amendment, 2026-11-24, b9-7: content over layout)*

**The R13 disclaimer** (the shipped law: "the disclaimer above all must fit", exactly one mount visible, order graphs
then caveat then doors; `docs/architecture.md` §12). Every figured page carries one mount, the kit's caveat line
(`src/ui/kit/Caveat.tsx`, words from the R13 keys), inside its panel above the handle and inside the REAL frame,
named by the page's answer through `verdictDescribedBy`. The shell's `main.result` stamps `data-inframe-disclaimer`
on such a page, so `app.css`'s existing swap rule hides `App.tsx`'s trailing mount there (the builder keeps
`main.result` a sibling before that mount, as today). A page with no figure (Profile, Settings) and every screen
outside the shell (unlock, start, the walk, whose provisional strip still prints "X of 10" until RC14) keep the
trailing mount; RC19 swaps it for the kit's line in `App.tsx` and deletes `Disclaimer.tsx`. An interim tab's old
component renders no disclaimer of its own. The ported arm asserts exactly one visible disclaimer on every shell
page, in frame at REAL on a figured page, and in order and reachable at the phone and at a 20 px default.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Each unit's verification** has three parts, defined once here:
- **CI fit** (`verify:fit`): the unit's arms in `e2e/rc-screens.spec.ts`, at 1440×731 @2x (REAL) and 390×844 @3x
  (PHONE), on the seeds named: the frame decision above, no sideways page scroll, every required label present, visible
  and unclipped (the rewritten chart-text audit), the honesty lines present, and no tap target moving when a reading
  lands.
- **CI CSP** (`verify:csp`): where the unit adds a new kind of component or chart, the shell arm visits it.
- **Local look**: the held instrument `e2e/held/rc-look.spec.ts` captures each screen at REAL and PHONE for Briggsy and
  audits it (no sideways scroll, no clipped text, no overlapping controls, no text under 12 CSS px), as
  `e2e/held/rail-look.spec.ts` does today for the rail.

### RC3: Dashboard → Snapshot (the home)

**Clones.** Ref 2.1. Screens: `rc-shell/planoverview-03.png`, `rc-shell/advnext-12.gif`, `rc-shell/snap-custom-01.png`.

**Layout.** Title "Snapshot". A two-column masonry of white cards (12 px radius, 1 px border, no shadow, 24 px gaps),
a fixed set in this order (no Add Item, no drag in this act): the ring card (left, wide); two small stat rings (right,
top); the Invested accounts card; the fan card; the Recommendations card. Each card's "Open item" arrow jumps to its
module. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Reads, and what each route shows.**
- **The ring card.** Every state through `selectElevatedAnswer` and `ringReading.ts` (it takes an `ElevatedAnswer`,
  never a raw answer). Retired: `Headline.xOfTen` and `outcomeState`, the outcome word as caption. Working: the
  work-optional date sentence above the ring (`dateSplit.ts`, `heroLead` in `dateHero.ts`), and the ring reads the one
  plan reading (`planReadingFor`, section 4.0): the committed curve's entry at the band's offset on the band's track
  (`DateOffsetReading.quantizedLowerBound`, `round(·10)` with the ceiling words), captioned "if you stop in 2031" (the
  year from that offset). No date in the window: the full track at the window's top, captioned with that year, and the
  no-date words. Provisional, re-figuring, pending, the fallback and the other states per 4.0.
- **Stat rings** (`TickDial`), both read from the plan's Steady-future ledger rows (`tableRunFor` in `tableRun.ts`,
  `LedgerYearRow`) and labelled "in the steady future" (critique 13): the withdrawal rate in the first retired year
  (the year's draws, `draw` plus `hsaSpend`, over its start-of-year invested balance) and income tax. Retired route:
  "Lifetime income tax" (the sum of `taxPaid` over every row: no row is a working year). Working route: "Income tax
  after you stop working" (the sum of `taxPaid` over the rows with no `workingYear`; the tax on pay is not a ledger
  field, so no honest lifetime figure exists there). The scope is the card's state clause (section 4.0's tax rule).
  *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- **Invested accounts card** (critique 4). Never "net worth": B9 holds no home, debts or bank accounts. Label/value
  rows of the entered balances by kind (taxable, pre-tax, Roth, HSA) and their total, "as entered" with the
  aged-balances year where it applies, and the stopgap line "B9 doesn't ask about your home, debts or bank accounts
  yet."
- **The fan card**: the plan's fan at card size (the same chart RC7 shows full size). Retired: `bandFan` cut by
  `truncateFanAtThinCohort`. Working: the crowned date's `DateBand.fan`, with the stop-year marker.
- **Recommendations card** (the Winner card pattern, ref 4.1, held to critique 2). A current saved recommendation
  (`src/store/savedRecommendation.ts`, the record card's view) or this session's solve (`recommendationView.ts`) in
  one sentence with its grade words. On this session's unsaved solve the card offers **"Keep this recommendation"**
  (today's save-record gesture, `recommendationSaveView.ts`) and nothing else; **"Try it in the plan"** (opens
  Analysis with Recommended on the left side; the tray's Apply, U15's, is what writes it into the plan) shows only
  once a current saved record exists whose action builds a bundle (`recommendationBundle` in `railChrome.ts` returns
  non-null), because the rail runs only a saved record (`RailRecommendation.record: SavedRecommendationV3`). No button
  on the card is labelled Apply, because the card itself changes nothing. No recommendation yet: "No recommendation
  yet" and a link to Tax Strategies. **Working route**: the solve does not run for a working household yet
  (`solveDispatch.ts`'s `buildSolveRequest` refuses `spine-unready` when `buildSpineParams` returns null on the date
  route), so the card shows RC8's working-route line and no link. *(the pilot's call, 2026-11-24, b9-3 (Briggsy
  pre-approved all changes))*

**The first Highcharts chart lands here**, so this unit also builds: `src/viz/charts/Chart.tsx` (the
`@highcharts/react` wrapper over `defaults.ts`), `src/viz/charts/fanOptions.ts` (pure: `BandFan` plus an injected
labels object to options; the named moments in it are built by `snapshotView.ts` (and RC7's `confidenceView.ts`) with
`deriveSpineBandAnnotations` or `deriveDateBandAnnotations` from `src/ui/bandAnnotations.ts`, since viz may not import
ui (decision 11); the axis
linear from `$0`, ticks from `niceLattice` and `buildYTicks` in `bandData.ts`; the p10 to p90 and p25 to p75 bands as
area ranges with their percentile words printed inside each band, never relabelled 5 to 95; the median a solid line;
lightness-ordered fills; age ticks every 5 years with both ages in the tooltip; named moments as labelled plot lines),
and the chart-text audit rewrite (section 5). `docs/architecture.md` §12 is rewritten in this commit: Highcharts draws
at real pixel size (no 560-unit viewBox), so its SVG text renders at the size the chart CSS sets in rem; the new law is
"chart text in rem through the chart CSS, `useHTML` off, every required label present, visible and unclipped,
`allowOverlap` where a value is a cue".

**Owed from RC1 (2026-11-24, b9-4; both read off the probe's screenshots, neither gated yet).**
- **Hovering one series fades the others' printed values to near-invisible.** Highcharts' default inactive state drops
  every other series to about 20% opacity while a point is hovered, data labels included, which breaks decision 7
  ("printed values never hide"). `src/viz/charts/defaults.ts` sets `plotOptions.series.states.inactive` so the other
  series and their labels stay legible (off, or an opacity the chart-text audit passes), and the rewritten
  `chartTextAudit.ts` reads each required label with a point of ANOTHER series hovered.
- **Every pattern draws in one ink per chart.** `patterns.ts`'s `defs` paint from one `--b9-pattern-ink` set on the
  chart's container, so two patterned series in one chart (pre-tax hatched beside Roth dotted, ref 3.2) would lose their
  colour difference and keep only the pattern. Give each pattern kind its own ink variable (or one pattern per series
  slot), and add a cascade arm that two patterned series in one chart compute different stroke colours.
*(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*

**Files.** `src/ui/screens/dashboard/Snapshot.tsx`, `snapshotView.ts`; `src/ui/ringReading.ts`;
`src/ui/workbench/whatIfRun.ts` (`planReadingFor` exported); `src/ui/kit/Ring.tsx`, `TickDial.tsx`, `Caveat.tsx`;
`src/viz/charts/Chart.tsx`, `fanOptions.ts`, `FanChart.tsx`; `src/ui/shell/routes.ts`; `src/ui/copy.ts`;
`docs/architecture.md`; `docs/backlog.md` (section 6's surfaced gaps); `e2e/chartTextAudit.ts`;
`e2e/rc-screens.spec.ts`.

**Test scenarios.**
- `ringReading.ts` from hand-built answers: xOfTen 7 gives 7 and a 70% arc; the ceiling gives "better than 9 in 10"
  and a full-less-one arc; `indeterminate` gives no number and no arc; `already-failing` gives 0 and an empty arc; a
  date curve entry of 0.86 gives 9 with "if you stop in" its year; `no-date-in-window` names the window top; never the
  string "10 of 10".
- `snapshotView.ts`: the Invested accounts total equals the sum of entered balances and the stopgap line is present;
  the stat rings say "in the steady future"; no Liabilities or net worth figure exists in the view; the retired tax
  ring equals the sum of `taxPaid` over every row, and on `dip` the working ring sums only the rows with no
  `workingYear` and says "after you stop working"; no label in any view says "state together"; on `elsewhere` the
  card's state clause is the unpriced one; an `inputs-incomplete` answer gives the fallback with its missing-fact
  lines, `pending` gives no number, `compute-error` gives the retry; a read-only view carries no write action.
- `fanOptions.ts`: the y axis minimum is 0 and linear; the cut fan has no point past the thin-cohort cut; each band
  carries its own percentile words; the series lightness is ordered.
- Recommendations card: with a current record, Keep's badge and Try it in the plan; on an unsaved solve, Keep and no
  try action; with a superseded record, the record card's superseded face; with none, the link; on a working
  household (`dip`), the working-route line and no link; no action labelled Apply.
- The ring on Snapshot and the right ring on Probability come from the same `planReadingFor` call (one test feeds both
  views one answer and compares).

**Verification.** CI fit on `retired`, `dip` and `datemixed`: Snapshot is a scrolling page whose first frame at REAL
holds the title, the ring card and the stat rings; the fan's band words and ticks pass the audit at REAL and PHONE;
the phone stacks one column in order; one visible R13 disclaimer. CI CSP: the shell arm opens Snapshot (the first
Highcharts chart under the real header). Local look: screenshots.

**Amendments made while building RC3 (2026-11-24, b9-4).**
- **"After you stop working" is the run's own bound.** A working year the household priced no pay check for carries no
  `workingYear` on its ledger row, so "the rows with no `workingYear`" alone would count it; the retired rows are the
  rows with no `workingYear` AND at or past the run's stop offset (`TableMeta.stopYear` less its build year), and the
  withdrawal rate reads the first of them (`retiredRows`, `steadyStats` in `snapshotView.ts`). *(the pilot's call,
  2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The stat dials print a short caption; the full label sits under the dial.** "Income tax after you stop working, in
  the steady future" does not fit a 144 px dial; the dial says "Withdrawal rate" or "Income tax" and the line under it
  carries the population and "in the steady future". The tax figure is abbreviated in RightCapital's `k`/`mm`
  (`formatMmDollar` in `money.ts`, "~$312k"), the rate to one decimal ("~4.1%"). *(the pilot's call, 2026-11-24, b9-4
  (Briggsy pre-approved all changes))*
- **The R13 caveat sits in the ring card**, the answer's own card, at its foot: inside the first frame at his window on
  every seed, and named by the ring's reading through `verdictDescribedBy`. *(the pilot's call, 2026-11-24, b9-4
  (Briggsy pre-approved all changes))*
- **The ring reads the raw headline through `planReadingFor`**, never the answer page's sticky display triple: one plan
  reading for every ring (4.0). Near a band edge the old answer page's sentence may read one count apart until RC4
  deletes it. The ceiling arc is 9 of 10 ("full less one"). *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved
  all changes))*
- **No dead links until their screens exist.** "No recommendation yet" links to the answer page, where the
  recommendation is found today (Tax Strategies is RC8's); "Try it in the plan" opens the interim What if page, whose
  rail runs the saved record, until RC4's tray. A keep made on Snapshot returns from the save ceremony to Snapshot. The
  record card's words moved out of `Result.tsx` to `src/ui/savedRecordCopy.ts` so both cards read one literal.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The fan.** The median is drawn in `--color-stone-900` (insight 038, measured: its weakest distance to any `RC_BAND`
  stop is 0.203, tritanopia, against the 0.10 floor; the band's own darkest stop as a line measures 0.001 and the series
  blue 0.038). Each range's words sit where that range is widest in the middle stretch of the fan; the named moments'
  labels stagger over two rows at the foot of the plot (the ranges' words sit in the upper strips; short words, "Eight in
  ten" and "Middle half", so they fit a phone's plot, the legend naming each in full). The y axis draws no title: a
  rotated title outgrew the phone's plot at a 20 px default (the audit caught it clipped), so the card prints "Savings, in
  today’s dollars" over the chart. The options are keyed on the fan's content, so an unrelated re-render never restarts
  the morph or drops a hover. Highcharts rides a lazy chunk (`Snapshot.tsx`), so the shell's other pages
  and jsdom never evaluate it. **Owed to RC4:** Highcharts' global `lang` strings (the accessibility module's built-in
  sentences) are still Highcharts' own; the fan's description, tooltip and per-point sentences are the composer's.
  *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The clone's chart floor is `--text-axis` (12 px), not the old charts' `--text-xs` (13 px).** Ref 3.5 sets axis labels
  at 12 px and 4.0's look audit floors text at 12 CSS px; insight 115's floor was `--text-xs` because the old charts
  borrowed it. The audit reads `--text-axis` from the live sheet (`hcFloorPx`), at the leaf. The first audit run also
  caught the band words at 0 opacity (Highcharts defers data labels until the morph ends), so the words are shown with
  their ranges (`defer: false`). *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*
- **The Highcharts audit is a new file, `e2e/hcTextAudit.ts`,** beside `chartTextAudit.ts` (whose functions still run on
  the old answer page's charts); its failures come back as worded lines so each plant asserts its own. The door's words
  became "See your plan’s pages". *(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*

### RC4: Retirement → Analysis → Probability, with the Action Items tray

**Clones.** Ref 2.7 and 2.8. Screens: `rc-analysis/probability-tab-retirement-analysis__cleanshot-2024-07-26-at-17-10-07-2x.png`,
`rc-shell/planoverview-05.gif`, `rc-analysis/FRAME_plan-picker-dropdown-above-gauge.png`,
`rc-analysis/FRAME_probability-refresh-loading-state.png`,
`rc-analysis/action-items__cleanshot-2024-10-28-at-15-44-44-copy.png`,
`rc-analysis/action-items__cleanshot-2024-10-28-at-16-24-46.png`,
`rc-analysis/FRAME_action-items-drawer-add-new-items-goals-menu.png`, `rc-analysis/FRAME_new-action-item-green-dot-row.png`.

**This unit makes the shell the home** (section 3's coexistence) and deletes the answer half of `Result.tsx` with
`FuckOffDate.tsx`, `ConfidenceStatement.tsx`, `TwoTierHeadline.tsx`, `SurvivorReadout.tsx`, `SaveSlot.tsx`, the old
band and ladder (`ConfidenceBand.tsx`, `ConfidenceBandPanel.tsx`, `BandLegend.tsx`, `BandEnlargeModal.tsx`,
`OddsLadder.tsx`, `oddsLadderGeometry.ts`), the U15 rail page (`WhatIfPage.tsx`, `RailLevers.tsx`), the withdrawal-order
and Roth sheets (`SequencingControl.tsx`, `RothLever.tsx`, and their arms in `editorSheets.tsx`), the dev previews
`U7Preview.tsx` and `DatePreview.tsx` with `preview.css`, and their CSS. Kept, because something live still imports
them (section 5.1's rule): `verdictSignal.tsx` (`GradeSignal.tsx`, to RC8), `PendingPanel.tsx` (`IntakeApp.tsx` and
the vault screens, to RC19), `NotePartsBlock.tsx` (`ReEntry.tsx`, to RC19), `Disclaimer.tsx` (`App.tsx`'s trailing
mount, to RC19), `controlSheet.tsx` (`GoalPicker.tsx`, `HealthcareSheet.tsx`, `StepSheet.tsx`, `AssumptionPanel.tsx`,
to RC18), `controlPreview.tsx` (`HealthcareSheet.tsx`, to RC10), and `src/ui/preview/RefiguringPreview.tsx` with
`fixtures.ts` and `dateFixtures.ts`: `RefiguringPreview` mounts the real `App` and is the re-figuring arms'
measurement of record (`?preview=refiguring`), and the fixtures feed kept tests (`answerView.test.ts`,
`AnswerStrip.test.tsx` and others). It may land in two green commits: the page first, then the tray, and
`WhatIfPage.tsx` is deleted in the tray's commit, so main never lacks a what-if.

**Layout.** Title "Retirement Analysis"; folder tabs Probability (and Confidence from RC7). Inside the panel, two
equal halves. **Right half: the compared plan**, "Your plan" by default (its picker: Your plan, each kept what-if from
RC5, Recommended). **Left half: the alternative**, its picker offering "New what-if" (the tray's working bundle), each
kept what-if (RC5), and Recommended (the saved record's own action, `recommendationBundle` in `railChrome.ts`, run only
while the store reads the record as current). On the working route neither picker offers Recommended: the solve does
not run there (RC8), so no record exists to run, and the rule is stated in `probabilityView.ts`, never left to a
runtime null. **Default on landing**: Recommended when a current saved recommendation exists, otherwise the new
what-if, which with no lever pulled reads "No changes yet" beside the plan's own reading (the
empty bundle returns the plan's own bytes, U14). Each half: the ring, the readings rows under it, and, on the retired
route, the balance bar. The key-metric column carries the page's answer. "Today's dollars ⚙" at the panel's lower right
opens the Display drawer (RC18; until then it opens nothing and shows as plain text). ACTION ITEMS centred on the
panel's bottom edge. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**The retired route** (`answer.kind === 'headline'`).
- **Intro line**: the confidence statement (`selectElevatedAnswer` in `answerView.ts`, `composeVerdictReading` in
  `verdictSentence.ts`); its notes from `composeAnswerNotes` (RC0).
- **Each half**: the ring (`ringReading.ts`; the right half's reading from `planReadingFor`, section 4.0); "As the survivor: X of 10" (`SurvivorReading`) with the survivor
  spending basis line, and "Essentials only: X of 10" (`floorReading`, `twoTier.ts`'s relief rule), each only when
  present; the bar: the median of `distribution.terminalValuesReal`, printed above the bar in dark text, **labelled
  for what it is**: each future's balance when the second of you dies, capped at the plan's last year
  (`SimulationResult`'s own definition), never RightCapital's "ending assets" (critique 1). The two halves share one
  y-scale (the Display drawer can split them at RC18). The what-if half's bar reads its run's terminal values; if the
  what-if slot's reading does not carry them, this unit extends `WhatIfReading` (UI side) to carry the run's
  `terminalValuesReal` median.
- **Key-metric column**: the spend clause where `spendClauseFor` yields one (the spend solve's home, critique 11);
  the difference line between the halves from `composeReadings` (it speaks the two counts and nothing else); the state
  clause.

**The working route** (`answer.kind === 'date'`; critique 1 in full).
- **Intro line**: the two-dates sentence (`composeDateSplit` in `dateSplit.ts`, `heroLead` and `floorLineText` in
  `dateHero.ts`), the graded date first, under the provisional tag while provisional.
- **Each half's ring** reads the odds at the stop year that half runs at: the right (your plan) reads `planReadingFor`
  (section 4.0: the committed curve's entry at the plan's base offset, `buildTableBase`'s `stopOffsetYears`, the
  crowned date, or the window's top on the full track when there is no date, OQ6); the left reads its what-if run's
  `offsetReading` at its own stop year (the stop-year lever's, else the base). Both through `ringReading.ts`; the
  caption names the year ("if you stop in 2031").
- **No balance bar on either half**: the plan has no run at its date carrying terminal values, and a bar on one side
  only invites a false comparison. The build item is section 6's "the working household's readings at its date".
- **No survivor row**: in its place one stopgap line, "The survivor reading shows once everyone has stopped working",
  until that same build item lands. The essentials reading on this route is the floor track's date, already in the
  intro.
- **Key-metric column**: the two dates and their grade words; the what-if's difference line.
- **States**: provisional, re-figuring, the what-if's `waiting` (until the final tier lands, U14 runs what-ifs at
  16,000 paths), `no-date-in-window`, `window-edge-unconfirmed`, `input-failure`.
- **The title chevron** switches to a second chart, **"Odds by stop year"** (critique 3): a column chart of
  `curveMarks()` output only, one column per evaluated offset, its count printed on top through the copy slots (the
  words built by `probabilityView.ts` and injected into `oddsByStopYearOptions.ts`, decision 11). Its
  four honesty rules are acceptance checks: the on-track bar drawn at `BAR_RUNG` 8.5, so clearing reads by position; a
  dipped offset (`isDip`) wears the worded "doesn't hold" mark; `atCeiling` prints "better than 9 in 10", never "10 of
  10"; the flag icon and its word sit on the crowned durable date (`isCrown`), never the tallest column. Also: the
  provisional tag on a provisional curve; on `no-date-in-window` no flag and the curve's explanation; the window-edge
  tell; on an aged vault, `agedLadderMarks` and `offsetHasPassed` (a passed year is not plotted). The chart draws the
  tracks the old ladder drew, one series each, the floor track hatched with its word. `curveMarks.test.ts` stays.

**The Action Items tray** (U14 and U15's built logic, re-rendered).
- **Rows** come from `railOffers` in `railChrome.ts` and map to RightCapital's two column groups (ref 2.8's table):
  left, Financial goals (stop year: working households only, one calendar year, valid years only), Savings (each
  working owner's account deposit, with the employer match and employer HSA dollar as sub-rows), Expenses (the
  one-figure total, or one row per budget line: amount and kind; add and remove); right, Strategies (Social Security:
  one indented row per person not yet claimed; withdrawal order; Roth conversions: none, or amount, start and years;
  asset allocation: stock, bond, cash; the ACA subsidy rules). Each row: the label, a slider where a range applies, the
  input box, and the compared side's value as plain text.
- **Changed values**: `--blue-ink` text on the pale blue box, medium weight, and a 2 px left bar (three cues). A
  budget line added only in this what-if shows a green dot with a "+" inside and its name as a link to its drawer.
- **Explicit Refresh.** Edits in the tray are pending until Refresh; Refresh commits the whole bundle once and starts
  one run (`useWhatIf`, made once per page). This replaces U15's commit-on-blur. A Refresh press reads the inputs as
  they stand at the press, so a figure committed by the press's own blur is the one sent (insights 036 and 149). While
  a run is in flight the left half fades to 40% under "Loading…" and its numbers stay put. Fact edits elsewhere still
  recompute the plan as today (the store's re-figuring); only the tray waits for Refresh. *(the pilot's call,
  2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- **Footer**: Reset (drops every lever: the what-if returns to the plan), Edit (the "Add or remove action items"
  drawer: which rows show, and "Add new items" for a budget line, which opens the budget line drawer), Refresh, and
  **"Apply to my plan"** (U15's Apply through the intake writers, withheld for a stop year or the mix with
  `applyState`'s reasons, `workbenchRailApplyWithheldStop`, `workbenchRailApplyWithheldMix`,
  `workbenchRailApplyWithheldBoth`; Apply after a spending what-if on a confirmed W says the working-year cost must be
  confirmed again). Each pulled row keeps its own "back to the plan". No Notes link (RightCapital's Notes are left
  out). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- Everything U15's test list proves about the levers carries over unchanged in the composer tests (deposits checked
  with the family-wide `validateDraft`; the employer figure asked again on a lowered deposit; refusals by name; the
  stop-year words for two earners; no lean words).
- **U15's paired years** leave with the old What if page here and return as Cash Flows' compare view at RC6.
  *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Interim homes from this unit** (section 3): the recommendation surface under Tax → Tax Strategies (the interim
`Result.tsx`, a `<div class="result-page">` with no tier attributes and no disclaimer of its own; on the working
route, where the old surface renders nothing, the tab shows RC8's working-route line), the health sheet
under Retirement → Health Care, the assumption panel in the gear's drawer (mounted through `editorSheets.tsx`'s
assumptions arm, as today), the budget sheet on the interim Profile page. The assumption panel's via-sheet rows for
the withdrawal order and the Roth plan (`onOpenSequencing`, `onOpenRoth`) re-point to the tray, opened at that row;
`'sequencing'` and `'roth'` leave `factRegistry.ts`'s `FactDoorId` and the shell's door map (no fact has used them
since U15, so `shownFacts()` stays green). The backup re-offer door joins the lock menu; the staleness note and the
aged-balances clause join the StaleBanner; the pay check's standing line joins the StaleBanner, its door opening the
gear's interim panel at the W row until RC13. The source-bind tests that read `IntakeApp.tsx` or `Result.tsx` re-bind
to the file that now makes each call (section 1.4).

**Fit decision.** One frame at REAL in compact mode for both routes with the tray closed (title, intro, the panel,
the R13 line, the handle); with the tray open the page scrolls. At a 20 px browser default and at the phone: order and
reachability. Whenever the StaleBanner holds lines (an aged vault return, a pay-check standing line), every shell page
may scroll: its arm asserts the order (the banner's lines first, the R13 caveat last), exactly one visible caveat and
that the caveat is reachable; with no banner lines the one-frame law holds as before. *(the pilot's call, 2026-11-24,
b9-5)*

**Owed from RC3 (2026-11-24, b9-4).**
- **One count per screen: decide raw or sticky, then make every printed count read it.** The old answer page prints
  its "X of 10" from the sticky display triple (`snapshot.displayed`, U12 C2's "one honest raw record, one sticky
  sentence": the count is held through a recompute that moves the raw reading inside the hysteresis band), while
  RC3's ring reads the raw headline through `planReadingFor`. Both are honest, but after such a recompute the two pages
  can print counts one apart, until this unit deletes the old page. Probability puts the ring, the answer sentence
  (`verdictSentence.ts`) and the what-if's "Your plan" side on one screen, so it must print ONE count: rule which source
  the clone's printed count reads (the sticky triple exists so a re-figure never flickers the printed count; the what-if
  compares readings, which wants raw on both sides), record the ruling here, and add a test that feeds one snapshot with
  a held `displayed` triple and proves every count on Probability and Snapshot reads the same number.
  **RULED (2026-11-24, b9-5, the pilot's call): RAW, everywhere the clone prints a count.** Snapshot's ring and stat
  rings, Probability's two rings, the intro sentence (`composeVerdictReading` fed the raw headline's triple, the shape
  `resolveStickyDisplay(null, headline, dollar)` returns), the difference line, and the gear drawer's assumption echo
  (`AssumptionPanel.tsx`'s `displayed` reads become the raw triple, with its `worsened` flag comparing raw counts), and
  the interim Tax Strategies tab's lead gate (`Result.tsx`'s `snapshot.displayed` membership test). Why raw: an empty
  what-if returns the plan's own bytes (U14), so a sticky "Your plan" beside it would print two counts for one unchanged
  plan, and with a lever pulled it would make the lever read one count better than it is at an edge, the rosy direction
  for a what-if (insight 072's hold keeps the LOWER plan count). What raw costs: the anti-flicker hold only ever held a
  one-step RISE landing exactly on an edge, the raw count is the engine's own quantized headline (cross-engine robust),
  and the tray no longer recomputes per keystroke (explicit Refresh). The working route is unchanged (the seam never
  applied to `date`). The store's sticky seam (`resolveStickyDisplay`, `snapshot.displayed`) keeps its tests and has no
  printed reader after RC4; RC21 deletes it with them. The test: one snapshot whose `displayed` holds 8 over a raw 9
  renders 9 in every count on Snapshot, Probability and the drawer's echo.
- **Highcharts' own words.** Its built-in accessibility sentences (`lang`, such as "Combination chart with 5 data
  series", which also counts the fan's two hidden word series) do not come from `copy.ts` yet (decision 11): the
  screen's composer supplies `lang` and the point-description formatter.
- **Keep and Try it in the plan were never pressed in a real browser** (no seed carries a committed solve or a saved
  record); RC4's arms press both through a `?vault=` plant with a saved recommendation.
*(the pilot's call, 2026-11-24, b9-4 (Briggsy pre-approved all changes))*

**Files.** `src/ui/screens/retirement/Analysis.tsx`, `Probability.tsx`, `probabilityView.ts` (pure: both routes,
both halves, the states, the disclosures), `ActionItemsTray.tsx`, `trayView.ts` (pure: `railOffers` to the two
column groups, the pending edits, the changed marks); `src/viz/charts/oddsByStopYearOptions.ts`, `OddsByStopYear.tsx`,
`BalanceBar.tsx`; `src/ui/workbench/whatIfRun.ts` (the terminal-values median, if needed); `src/ui/IntakeApp.tsx`
(the home; the `result` phase and the door go); `src/ui/Result.tsx` (reduced to the interim recommendation tab);
`src/ui/editorSheets.tsx` and `src/intake/AssumptionPanel.tsx` (the two sheets' arms go, the via-sheet rows
re-point); `src/ui/workbench/factRegistry.ts`; `src/ui/copy.ts`; the deletions listed above; the re-bound source-bind
tests; `e2e/rc-screens.spec.ts`, `e2e/vertical-fit.spec.ts`,
`e2e/chart-text.spec.ts`, `e2e/vault.spec.ts`, `e2e/vaultHarness.ts`.

**Test scenarios.**
- Setup's end, a reopened vault and `?seed=retired`, `?seed=dip` each land on Snapshot, and Analysis → Probability
  shows the same answer words today's answer page shows (the confidence statement; the two-dates sentence).
- Retired, `retired`: the right ring reads the headline; the survivor and essentials rows appear only when present;
  the bar's median equals the median of `terminalValuesReal` and its label says "when the second of you dies".
- Working, `dip`: the right ring equals `round(quantizedLowerBound·10)` of the committed curve at the base offset;
  no bar on either half; the survivor stopgap line is present; a stop-year what-if's ring names its own year.
- Working, `datemixed` (floor-dated): both rings read the floor curve.
- Odds by stop year on `dip`: the crown sits on the durable date, not the tallest column; the dipped offset carries
  its "doesn't hold" word; a column at the ceiling prints "better than 9 in 10"; on a hand-built no-date track no flag
  is drawn; on a provisional curve the tag shows; on `?vault=datearrived` no passed year is plotted.
- The tray: typing changes no figure until Refresh; Refresh starts one run; Reset returns the plan's own reading;
  Apply is withheld on a stop-only bundle and on any bundle holding a mix, with its reason; Apply then Save changes the
  vault; leaving without Apply changes nothing; Apply marks a saved recommendation stale and starts no solve.
- The Recommended side runs the record's own policy, order and conversion plan, only while current; a stale record
  or one saved before version 6 shows words and runs nothing; on `dip` neither picker offers Recommended.
- A read-only view: no Apply, no Keep; Refresh still runs. A cleared required fact gives the fallback naming it, on
  Probability and on Snapshot.
- Exactly one R13 disclaimer is visible, inside the frame at REAL (section 4.0's rule).
- The assumption panel's withdrawal-order and Roth rows open the tray at their row.
- The ring states: provisional tag, re-figuring line over the old answer, `waiting`, `no-date-in-window`,
  `window-edge-unconfirmed` (`dateborder`), `already-failing` (`failing`).
- The state clause names North Carolina on `nc` and `datenc`, Pennsylvania on `pa`, Florida's $0 fact on `fl`, and the
  unpriced monolith on `elsewhere`; the R13 disclaimer is present and tied to the answer.
- A real Back press with an unkept what-if open asks first.

**Verification.** CI fit on `retired`, `nc`, `pa`, `fl`, `elsewhere`, `dip`, `datenc`, `date65`, `datemixed`: one
frame at REAL with the tray closed; the honesty lines; the ring's and the chart's labels pass the audit; Refresh's
landing reading moves no tap target (Apply, Refresh, the pickers); phone order and reachability; a 20 px default order
and reachability. The old answer-surface arms re-point or retire per section 5. CI CSP: the shell arm now enters
through the real intake and lands on the home, then opens Probability and the tray and runs one what-if. Local look:
screenshots of both routes, tray closed and open.

### RC5: The plan list and kept what-ifs (gap 2's U16)

**Clones.** Ref 2.8's plan list. Screens: `rc-analysis/FRAME_add-or-remove-plans-drawer.png`,
`rc-analysis/FRAME_plan-picker-dropdown-above-gauge.png`.

**What it does.** The pencil beside the right-hand picker opens the plan list drawer: Your plan and Recommended pinned
on top, a divider, then the kept what-ifs by name (the schema-v6 `keptWhatIfs` list, `KeptWhatIfV6`); hover a row for
Copy, Rename and Delete; "Keep this what-if" names the tray's working bundle in an inline box with a tick; drag
handles reorder the list (the list's own order is what is saved). Both pickers on Probability (and later Cash Flows,
Comparisons, Retirement Details) offer the kept what-ifs.

**Decisions.** U16's approach stands (KTD18, KTD19): Keep writes through the plan's one save path and only on a clean
draft, with no vault Keep opens the save ceremony, a kept stop year is a calendar year, a kept line moves with the plan's
lines, a kept what-if whose lever no longer applies says so and runs nothing, editing a reopened kept what-if makes it
unkept until Keep (which replaces it), and Back asks first. **U16's three-way compare becomes RightCapital's two-up**:
any two of your plan, the kept what-ifs, Recommended and the new what-if, one per picker, each side on its own slot
made once. U16 finishes before any U24 promotion that could carry a real save (KTD16). *(the pilot's call, 2026-11-24,
b9-3 (Briggsy pre-approved all changes))*

**Reads.** `keptWhatIfs` on the draft; `applyBundle` (`src/intake/whatIf.ts`); `whatIfRunFor`, `createWhatIfSlot`
(`whatIfRun.ts`); the save machine.

**Retired vs working.** A kept stop-year what-if on a household that has since fully retired says so and runs nothing;
otherwise the same.

**Files.** `src/ui/screens/retirement/PlanListDrawer.tsx`, `planListView.ts`; `src/ui/workbench/useWhatIf.ts` (a slot
per side); `src/ui/scenarioFromDraft.ts`, `src/ui/draftFromScenario.ts` (only if the round trip needs it);
`src/ui/copy.ts`.

**Test scenarios.** U16's list, re-pointed: AE8 (keep, reopen, rename, delete); an account a kept what-if points at,
edited, saved and reopened, still pointed at; Keep with unsaved facts not offered and the page says why, the vault
unchanged; delete the targeted line and account, add new ones, save and reopen: the what-if still says gone; Keep with
no vault opens the save ceremony and keeps the what-if when it completes; a kept what-if survives a save and a reopen
with the same bytes; a reopened kept bundle holding a stop year withholds Apply with its reason; a read-only tab lists
and opens kept what-ifs and cannot keep, rename or delete; a real Back press with an unkept what-if asks first; two kept
what-ifs compared left against right, neither being your plan, each with its own reading.

**Verification.** A plan holding kept what-ifs survives a save and a reopen through the real path with the same bytes
(`e2e/vault.spec.ts` gains the arm). CI fit: the plan list drawer at REAL and as a full-screen sheet on PHONE. Local
look.

**Settled in the build (2026-11-24, b9-6).** Rename, Copy, Delete and reorder write through Keep's one save path and
only on a clean plan (KTD19 is one rule for the whole list); with no vault they change only the unsaved plan, and Keep
opens the save ceremony. A cancelled ceremony leaves the kept what-if on the unsaved plan, open on the left, and the
drawer says the plan is not saved (dropping it would be the silent loss this unit removes). The lock menu's Keep and
Back up, and the recommendation's no-vault Keep on Snapshot, ask first over an unkept what-if (b9-4 found them dropping
it; Stay puts the minted record back). "Keep this what-if" lives in the drawer, as RightCapital's flow has it. The
recommendation is not keepable as a what-if (Tax Strategies already remembers it); Recommended is pinned only when a
recommendation is on offer (the working route runs none). Names are trimmed, required, at most 60 characters and unique
regardless of case; a copy is "Copy of …", numbered from the second, placed after its original. Neither picker offers
what the other side shows. A typed name box holds the leave ask (insight 112). Row actions always show on a phone and
fade in on hover or focus past it. Every verdict clause names "your plan", never "it" or "this plan": two kept
what-ifs can now fill both halves, and the clause beside them is always the plan's own reading (insight 160).
Untested by choice: a pointer drag (the keyboard reorder is tested and writes the same order) and a completed
ceremony after Keep in a browser (the cancel path is driven; completion saves the draft that already holds the list).
*(the pilot's call, 2026-11-24, b9-6)*

### RC6: Retirement → Cash Flows: Summary and Accounts

**Clones.** Ref 2.16. Screens: `rc-cashflow-tax/help-retirement-cash-flows-summary-tab-cash-flows-51.png`,
`-51-later.png`, `-02.png`, `-06.png`, `rc-cashflow-tax/help-retirement-cash-flows-accounts-tab-cash-flows-02.png`.

**Reads.** The built table (gap 1, U2 to U7): `tableRunFor` and `tableRequestsOn` (`tableRun.ts`), `composeYearTable`
(`yearTableChrome.ts`), `LedgerYearRow` fields; U15's `composePaired` (`railChrome.ts`); kept what-if runs through the
slots.

**Layout and decisions.**
- Folder tabs **Summary** and **Accounts**. Invested Assets waits for portfolio-return dollars (section 6), Net Worth
  for property and debts, Maps is RC20. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- Header row: at the right the future select (Steady, Rough), the plan select (Your plan, the new what-if, each kept
  what-if, Recommended, and **"Your plan beside the what-if"**) and the download button (a CSV of the shown table,
  built in the page; no network).
- **Summary**: RightCapital's grouped headers and the table laws kept (every figure one row field, `~` on projected
  figures, the non-colour `+` and `−` direction mark). Columns: Year, Age (both ages), Income inflows (pay by person,
  Social Security, other income by person; drills to each), Planned distribution (draw by bucket and HSA spend; RMD as
  its own drill column), Total inflows, Expenses (`spending`; health premiums as a drill: ACA net, Medicare, IRMAA
  surcharge, extras), Income tax (`taxPaid` alone, the shipped year table's `income-tax` column, headed "Income tax"
  and **not underlined**: its drill waits for gap 10), on working rows the pay check's taxes as their own column
  (`yearTableChrome.ts`'s `pay-check` spec: the income tax the outside income adds, `taxOnOutsideIncome`, and the
  payroll tax, `payrollTax`, each its own line; payroll tax is never folded into Income tax), Planned saving
  (deposits), Total outflows, and B9's own columns: Roth conversion, income not kept (R13's flag), a short year (`ranOut`). Goals, Other
  inflows and the federal, state, payroll and local split are dropped, never zero-filled (critique 13). Underlined
  headers drill: the panel title becomes a breadcrumb ("Summary / Expenses") and back.
- **Accounts**: a table switcher (ending balance, deposits, RMDs, withdrawals, conversions) with columns per bucket
  (taxable, pre-tax per person, Roth, HSA) and a total, each from `start`, `end`, `draw`, `conversion`, `rmd`,
  `contribution` (and `pretaxEndByPerson`, `pretaxDrawByPerson`).
- **"Your plan beside the what-if"** renders U15's paired form: one table whose year is a group of two rows, the plan's
  over the what-if's, each a real row header every cell is tied to, the pair's columns from `pairedColumnsFor`. U15's
  law that the two are never hidden behind a switch holds inside this view; RightCapital's plan select chooses the view.
  *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- The yield stopgap line under each run whose taxable ledger holds money, named for that run; the lifespans line; the
  year table's own notes (`composeYearTable`'s, the pay check's included); the page's state clause.

**Retired vs working.** Working households' rows carry the working years (`LedgerWorkingYear`: pay, own deposits,
payroll tax, left over) before the stop; the table's heading says which stop year the rows run at (the band's, or the
window top on the no-date route, OQ6).

**Fit decision.** A scrolling page; the first frame at REAL holds the title, the selects and the header rows; the page
never scrolls sideways at any size; the table scrolls inside its frame with sticky Year and Age.

**Files.** `src/ui/screens/retirement/CashFlows.tsx`, `cashFlowsView.ts` (pure: the RightCapital column grouping and
drills over `composeYearTable`'s figures), `src/ui/kit/DataTable.tsx`; deletes `src/ui/workbench/YearTable.tsx` and
`workbench.css`'s remaining rules.

**Test scenarios.** Every shown figure equals one row field (U7's law, re-asserted on the new view); no column B9
does not emit appears; Income tax is not a drill and equals `taxPaid` alone; on `dip` the payroll tax sits in its own
column, never inside Income tax; a drill and its breadcrumb round-trip; Steady and Rough switch
without moving the select's position; the paired view puts the plan's figure over the what-if's in every year, each
with its run's name; the yield line shows under the run that holds taxable money only; the CSV holds exactly the shown
cells.

**Verification.** CI fit on `tablewidest`, `retired` and `dip`: no sideways page scroll at REAL and PHONE; the table
scrolls in its frame; the rows landing move no tap target. Local look.

**Settled in the build (2026-11-24, b9-6).** No total column: the column list's "Total inflows" and "Total outflows"
(and RightCapital's summed Income Inflows, Planned Distribution and Planned Saving cells) wait. A sum over one row is
allowed (the table runs one path per view, so it is arithmetic over that row's own cells, not the median-stack class
the one-field law guards), but the totals ship only where inflows − outflows − income not kept balances, and measured
over every seed in both views (2,648 rows) it misses on 229: by the employer match inside the put-ins and by a short
year's unmet need, neither of which has a row field. The register's *Cash Flows can't print RightCapital's Total
inflows and Total outflows…* carries the two fields and the identity test. Each of those RightCapital
columns is a header over its one-field columns, drawn underlined where its drill holds more than the top shows (the top
shows the group's main fields; the drill every field: the pre-tax draw by person, the required withdrawal and its move
to taxable, the premiums, the taxed parts of pay and other income, the from-pay lines). The one sum printed is the
Accounts ending balance's Total, the engine's own `totalAcrossBuckets`, said so under the table (the paired form's
year-end total is U15's same exception). No "+" or "−" rides a figure: each column names its direction in words
("Taxable, taken out", "Roth, put in"), and beside "~" the mark read as a minus over a positive draw; a short left over
prints in parentheses (4.0). The pay check's income tax is headed "Pay check’s income tax", never a second "Income tax".
The folder tabs are the page's own state, not routes (the hash stays `#/retirement/cash-flows`); the tab, drill, table
and pick survive a page move. The working what-if is offered where it holds a change no kept one names; "Your plan
beside the what-if" sets your plan beside the what-if open on Analysis's left, and a picked run already made there is
read from that side's slot (only a pick neither side shows runs on the page's own slot, and only while the page shows).
The rows' sentences moved out of the grid into "Notes by year" under it (with the rough view's steady-from line), so the
old arm reading them inside the frame retired. A drill swaps the table with no motion and puts focus on the panel title.
*(the pilot's call, 2026-11-24, b9-6)*

### RC7: Retirement → Analysis → Confidence

**Clones.** Ref 2.9. Screens: `rc-analysis/confidence-tab-retirement-analysis__cleanshot-2024-07-29-at-10-17-02-2x.png`,
`rc-analysis/FRAME_confidence-legend-toggled-median-only.png`.

**Reads.** Retired: `bandFan` (`BandFan.byYear`, `cohortFraction`), `depletionYears`. Working: the crowned date's
`DateBand` (`fan`, `offsetYears`, `track`).

**What it shows.** "Range of balances, [plan]" over the full-size fan from RC3's `fanOptions.ts`: B9's real
percentiles labelled in place (10 to 90, 25 to 75), the median line, the cut at the thin cohort (kept), the named
moments, the legend toggling series (with the bands hidden the axis zooms to the median). **Retired route**: under the
fan a small second chart sharing its age axis, "Futures run out by this age" (the cumulative share of
`depletionYears` at or before each year), its values printed as "about N in 100 futures": "fewer than 1 in 100" below
0.5% and never 0 while any future runs out, "more than 99 in 100" above 99.5% unless every future does (the same
honesty as "better than 9 in 10"; never a percent, and never the X-of-10 slots, where a 3% share would round to a
false "0 of 10"). **Working route**: the stop-year marker and word at the
band's `offsetYears`; no run-out chart, and one stopgap line saying the run-out share comes with the working
household's readings at its date (section 6). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all
changes))*

**Fit decision.** One frame at REAL (title, tabs, the fan and the run-out chart, the key-metric column).

**Files.** `src/ui/screens/retirement/Confidence.tsx`, `confidenceView.ts` (it builds the fan's named moments and the
run-out words, decision 11), `src/viz/charts/runOutOptions.ts`.

**Test scenarios.** The run-out share is non-decreasing and equals the count of `depletionYears` at or before each
year over the path count (never-depleted sentinels excluded); on `retired` the last year's share equals
`1 − distribution.survivalFraction`; a 0.3% share prints "fewer than 1 in 100", a 3% share "about 3 in 100", a 99.7%
share "more than 99 in 100", and no value prints a percent or "0 in 100"; the axis keeps its dollar ticks at the narrowest desktop
pane (the old honesty-floor arm, ported); the aged returns (`?vault=stale`, `?vault=datestale`) show their named
moments; the working route shows its stop marker and the stopgap line and no run-out chart.

**Verification.** CI fit on `retired`, `dip`, `?vault=stale`, `?vault=datestale`: one frame at REAL; every band word,
tick and moment label passes the audit at REAL and PHONE and at a 20 px default. Local look.

**Owed from RC4 (2026-11-24, b9-5).** RC4 deleted the old band with the answer page, so section 5.2's "the honesty
floor and legend ported to Confidence" has no live arm to port: the two retired with their surface (`e2e/vertical-fit.spec.ts`
lines 2018 and 2038 at `95c715e1`, "the honesty floor — 68rem exactly" and "the band legend"). Rebuild their laws here
on Confidence from that text: every band word and the legend in frame and legible at the 68rem floor, and the legend
naming each range the fan draws. *(the pilot's call, 2026-11-24, b9-5)*

**Settled in the build (2026-11-24, b9-6).** The "[plan]" is always your plan, with no picker: a what-if run carries no
fan, so the title reads "Range of balances, your plan", and the tab has no ACTION ITEMS handle (a what-if edited there
would change nothing on it). Confidence is a route of its own (`#/retirement/analysis/confidence`) and reads the page's
title, intro, states and caveat from `probabilityView.ts`, so the two tabs are one answer. The run-out chart shares the
fan's axis exactly: the same first and last year (the fan's cut, kept), the same age ticks, and the fan's plot margins
handed over as it draws (`PlotBox`; the run-out chart is rebuilt on a new box, never updated). Its y axis counts futures
in every 100, linear from 0, topped at the smallest of 10, 20, 50 or 100 that holds the highest share. No value is
printed on the plot (its few rows of height would put any label over the line); every year's words are in its tooltip
and screen-reader sentence, and the key-metric column leads with the share by the last year drawn ("By ages 93 and 92,
about 8 in 100 futures have run out of money") and then the whole plan's ("Over the whole plan, about 12 in 100 futures
run out of money while one of you is still living", exactly 1 − `survivalFraction`). A depletion in simulated year d
counts from the fan's year d + 1 (the year it reads $0). The share rounds a whole count (count × 100 ÷ paths) and names
its edges apart: no future, fewer than 1 in 100, more than 99 in 100 (99.5 in 100 included), every future. The counted
words are slots (the free-numeral gate covers every `confidence*` key). The R13 caveat closes the key-metric column on
this tab, inside the one frame at his window, where the panel's foot under two charts is not. "Savings, in today's
dollars" is not printed over this fan (the tab row already says "Today's dollars"). The legend toggle is Highcharts'
own: the y axis fits the visible series' top through `tickPositioner` (never an axis update) and stays from $0, each
range's words ride it (`linkedTo`), and the moments' labels re-seat (removed and added again). A moment's label moves
from the plot's foot to its top where the median under it sits below 45% of the axis (the RC7 look caught "Work stops"
printed across the median on `dip`), never in the ranges' words' stretch; this reaches Snapshot's card, which draws the
same fan. The tooltip gains the middle half's low and high (ref 2.9). **The fan's cut is named for what it is** (the
orchestrator's read of the RC7 shots): on `retired` the plan runs 47 years (to ages 113 and 112) but the fan, and so the
run-out chart, stops at the cohort cut, year 27 (ages 93 and 92, the last year at least half of the futures still have
one of you living); 150 of the 239 run-outs in 2,000 paths fall before it and 89 after. So the right-hand moment says
"Range ends" wherever the drawn fan ends before the engine's ("Plan horizon" only where it does not), and the second
metric line says why the charts stop and gives the whole plan's share as that longer span; where the charts reach the
plan's end, the one sentence is the whole plan's and equals the chart's last point. No moment label crosses another
moment's line: each is seated from the drawn widths (`labelSides`: its preferred side, else the other, else read along
its own line), as "Today" crossed "Work stops" on `dip` at the phone. *(the pilot's call, 2026-11-24, b9-6)*

**Milestone 1** closes here (section 7).

### RC8: Tax → Tax Strategies

**Clones.** Ref 2.17, corrected by critique 2. Screens: `rc-cashflow-tax/help-tax-tax-strategies-roth-conversion-strategy-51.png`,
`rc-cashflow-tax/help-tax-tax-strategies-comparison-tab-03.png`, `-05.png`,
`rc-cashflow-tax/help-tax-tax-strategies-details-tab-02.png`, `-03.png`, `-04.png`,
`rc-cashflow-tax/rcsite-tax-planning-identify-top-tax-strategies.png`,
`rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-01.png`, `rc-cashflow-tax/help-tax-tax-strategies-strategies-tab-51-later.png`;
the Winner card pattern: `diy/pl-optimizer-results.png`.

**Reads.** `SolveRecommendation` (`src/engine/solver/solve.ts`: `goal`, `heirBracket`, `winner`, `runnerUp`,
`noActionBaseline`, `rankedIds`, `noChange`, `surplusRegime`, `grade`, `gradeUnavailable`, `namedDriver`,
`skewDisclosure`, `deltaSkew`, `withheldConversionLevers`, `disclosedDirectional`; each `SolveArm`'s
`headlineStatisticB` and `distributionB`), all through `recommendationView.ts`'s `RecommendationView` (the one state
authority) and `recommendationSaveView.ts`; the record card (`savedRecommendation.ts`); `solveDispatch.ts`.

**Folder tabs** Strategies, Summary, Comparison, Details. Calibration waits for map gap 6 (no dead tab).

**Strategies** (B9's solve; the default tab).
- **Before a solve** (the empty state, ref 2.0): the bold sentence saying what the solve needs, the **goal picker**
  (leave more, pay less tax) and, for leave more, **the heirs' tax bracket** beside it (critique 11: they sit beside
  Solve), and the solid blue "Find the best strategy" button. The blocked states say why in words: no pre-tax money
  (the steer note), the plan's answer not ready, no goal picked.
- **While it runs**: the bold sentence and "◯ Calculating".
- **The Winner card** (ref 4.1, held to critique 2): the hero follows the goal: "~$X more left to heirs (average across
  futures)" with the skew line beside it when the skew is disclosure-worthy, or "~$X less in tax and health premiums
  (average across futures)"; the delta-skew line; "N strategies compared" (`rankedIds`); the winner in one sentence
  with its levers as small chips; the grade words and the named driver; the withheld conversion levers' hold; the shape
  disclosure. Actions: "Keep this recommendation" (the save-record gesture, with the record's badge), and, once the
  record is kept and current, "Try it in the plan" (Analysis with Recommended on the left; the tray's Apply writes
  it). An unsaved solve offers Keep alone (RC3's rule: the rail runs only a saved record). The runner-up's "why this
  beat it" one tap down.
- **The ranked list**: three rows only, the winner, the runner-up and the no-change baseline, each with its levers
  and a value cell (their held-out seed-B figures, the hero's statistic), then one line: "N other strategies were
  compared and ranked below these; their figures aren't shown." A pruned candidate is never a row: its record
  (`SolvePrunedScore`) carries only an id, a rank and a never-rendered score, and its id
  (`solverCandidateId`: provenance, policy, amount) holds no start year, length or custom order and can repeat one plan
  under two provenances, so its levers could only be guessed. **No 1 to 5 rank column.** Cell shading follows the
  value (ties share a shade, as RightCapital's do); when the grade calls winner and runner-up a near-tie (`namedDriver`
  reads `sampling-noise-near-tie`), the rows say so in words. Value cells: `--stone-900` text on light shades, white
  only on `--blue-ink`.
- **States**, each with its existing copy: `noChange` (the reassurance alone, no bars, no fabricated delta),
  `surplusRegime`, `gradeUnavailable`, `withheldConversionLevers`, `disclosedDirectional`, and the record card's faces
  (holds, superseded with its causes in the producer's order and the mint year) above the empty state when a record
  exists.
- The adjacent disclosures (`disclosures`, complete over `RecommendationDisclosureId`) under the card.

**Summary.** "Summary of the recommendation": grouped bars, the winner green and solid, no change blue and hatched,
values printed on every bar, on the **hero's own statistic** (`headlineStatisticB`) so the bars and the hero never
disagree. For pay less tax, the three additive parts (the means of `lifetimeTaxPaidReal`, `lifetimeNetPremiumReal` and
`lifetimeMedicareCostReal` from each arm's `distributionB.taxAware`) show as their own groups only if a unit test
proves they sum to the arm's all-in statistic; otherwise the hero bars alone. The bars follow `RecommendationView`'s
existing rule for its two-bar picture: none in no-change mode or on a seed-B display inversion. Key-metric column: the
hero sentence. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Comparison and Details** (one-path, each named "in the steady future" or "in the rough future" by the future
picker). The winner's levers (a `withdrawal-order` and `roth` bundle built from `SolveRecommendation.winner`) and the
baseline's (the empty bundle when `noActionBaseline` equals the plan's own policy, order and conversion, which the
builder checks; otherwise its own bundle) each run through a what-if slot. Comparison's chevron: invested assets
(overlapping areas), income tax paid per year (`taxPaid`, headed "Income tax", the page's state clause beneath),
RMDs, withdrawals (two
side-by-side stacked areas, taxable solid, pre-tax hatched, Roth dotted, HSA lined, stack order listed in the legend),
conversions. Details' table switcher: Withdrawal and conversion (Year, Age, conversion, from taxable, from pre-tax,
from Roth, the three balances), Medicare premium (Year, Age, the IRMAA income `irmaaIncome`, `premiums.medicare`, the
surcharge, total). The tax-details table (federal tax and bracket) waits for gap 10.

**Retired vs working.** The solve runs for the retired route only. For a working household `buildSolveRequest`
(`solveDispatch.ts`) returns `spine-unready`, because `buildSpineParams` returns null on the date route ("v1: the
all-retired route"; the working-route base, the crowned candidate, is the module's named follow-up), and the shipped
`recommendSpineUnreadyNote` ("Once that answer is complete again, this can run") would be false for a household whose
answer is complete. So the working route gets its own spec: Tax → Tax Strategies shows the Strategies tab alone,
holding one stopgap line (a new copy key): "B9 works out a withdrawal and Roth strategy once everyone in the plan has
stopped working; that build comes next." No goal picker, no heirs' bracket, no Find button, and no Summary,
Comparison or Details tabs (no dead tab, ref 1.2). Snapshot's Recommendations card shows the same line (RC3), and
Probability's pickers never offer Recommended (RC4). The build is section 6's "the working household's
recommendation". *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Deletes**: `Result.tsx` (its interim tab), `RecommendationSurface.tsx`, `GradeSignal.tsx`, `verdictSignal.tsx`,
`GoalPicker.tsx`, `RecommendationViz.tsx`, `recommendationViz.css`, `recommendation.css`, `result.css`.
`TwoFutures.tsx`, `chartText.tsx`, `chartText.css`, `twoFutures.css`, what is left of `bandGeometry.ts`, and the old
palette exports nothing kept reads wait for RC10: the health sheet's preview (`controlPreview.tsx`) still draws
`TwoFutures` until then. `twoFuturesChrome.ts` shrinks to what `healthSheetChrome.ts` still reads.

**Fit decision.** Strategies and Comparison are scrolling pages: the first frame at REAL holds the Winner card (or the
empty state with its goal picker and button). Summary holds one frame.

**Files.** `src/ui/screens/tax/TaxStrategies.tsx`, `Strategies.tsx`, `strategiesView.ts` (pure: the list rows with the
pruned-figure rule, the shades, the near-tie words), `Summary.tsx`, `summaryView.ts`, `Comparison.tsx`, `Details.tsx`,
`taxRunsView.ts`; `src/viz/charts/groupedBarsOptions.ts`, `stackedAreasOptions.ts`; `src/ui/copy.ts`; the deletions.

**Test scenarios.**
- From hand-built `SolveRecommendation`s: the view holds exactly three rows (winner, runner-up, baseline), each with
  its figure, and the line naming the N others; no field of the view carries a pruned candidate's id, levers or score
  (a planted pruned row fails the test; `recommendationView.test.ts`'s source bind, `selectionScoreA` never named in
  `src/ui` or `src/viz`, keeps guarding); no rank number appears; tied values share a shade; a near-tie says so.
- The hero's wording and statistic follow the goal; the skew line appears exactly when `skewDisclosure` says so; the
  Summary bars read the same statistic as the hero.
- Each state (`noChange`, `surplusRegime`, `gradeUnavailable`, withheld levers, directional) renders its copy and no
  bars where the rule says none.
- The empty state blocks Solve with no goal, and on a household with no pre-tax money shows the steer note.
- "Keep this recommendation" writes the record and shows the badge; "Try it in the plan" appears only after Keep,
  and opens Analysis with Recommended on the left; an unsaved solve shows no try action; nothing on the card writes
  the plan; a read-only view has no Keep (Find still runs).
- On a working household (`dip`): the working-route line, no goal picker, no heirs' bracket, no Find button, no
  Summary, Comparison or Details tab.
- Comparison's two runs share futures with the plan (U14's check) and are named for their future.

**Verification.** CI fit on `?vault=rec`, `?vault=recold`, `steer` and `retired` (the solve driven where the seed has
no record): the Winner card in the first frame at REAL; the record card's faces; the steer note in frame; phone order
and reachability. `dip` is the working-route arm: the stopgap line in the first frame, no solve driven. **`e2e/chart-text-rv.spec.ts` is rewritten here, not retired**: on its own serialized
harness (`playwright.fit-rv.config.ts`, its CI job) after a full-precision solve, the Summary bars' printed values and
the Winner card's hero pass the audit at PHONE and REAL. CI CSP: the shell arm opens Strategies. Local look.

**Owed from RC4 (2026-11-24, b9-5).** "Keep" on an unsaved solve has never been pressed in a real browser: it needs a
committed full-precision solve, and no `?vault=` plant carries one (RC4 pressed "Try it in the plan" through
`?vault=rec`). This unit's arms drive the solve on `surplus` and press Keep, then assert the record card's HOLDS face.
RC4 re-pointed the steer-note, pending-frame and record-card arms to the interim Tax Strategies tab
(`e2e/rc-screens.spec.ts`, "RC4 re-pointed" and "RC4 ported · the vault returns"); this unit ports them onto the clone's
Strategies screen. *(the pilot's call, 2026-11-24, b9-5)*

### RC9: Retirement → Social Security

**Clones.** Ref 2.14. Screens: `rc-analysis/FRAME_social-security-cumulative-break-even.png`,
`rc-analysis/comparison-tab-social-security-module__cleanshot-2025-07-08-at-10-08-16-2x.png`,
`rc-analysis/summary-tab-social-security-module__cleanshot-2024-02-26-at-17-45-03.png`,
`rc-analysis/FRAME_social-security-action-items-filing-instructions.png`.

**Reads.** The `claim-age` lever on the what-if runner (`applyBundle`, `whatIfRunFor`); the ledger's `socialSecurity`
per year on the Steady future; each strategy's many-futures reading.

**What it shows.** Folder tabs Comparison and Summary. Strategies (each for every person not yet claimed): the
earliest whole age still open, `max(62, current age)` (the `claim-age` lever takes whole years and refuses an age
already passed, `whatIf.ts`'s `claim-age-in-the-past`, so a 64-year-old is never offered 62); full retirement age
rounded up to the whole year (`fraMonthsForBirthYear` in `src/engine/constants/socialSecurity.ts`: 66 and 2 to 10
months for births from 1955 to 1959); 70; and your plan's own ages. Duplicates are dropped, and the page says which
two coincide ("For Pat, claiming as early as possible and at full retirement age are both 67"). Each is a claim-age
bundle run on one slot, made once.
- **Comparison**: two pickers with "vs" (A green, B blue; B defaults to your plan). Chevron: Annual (paired bars per
  year, B hatched) and Cumulative (two lines, B dashed; the crossing marked with a ring marker and its age, which
  RightCapital leaves unmarked). Key metric: "~$X more from [A] than [B], in the steady future" (lifetime totals: the
  sum of `socialSecurity` over the steady rows) or "Break-even at age N" (the first year A's cumulative total passes
  B's after trailing it), or "No break-even before [age] in the steady future".
- **Summary**: one bar per strategy of lifetime benefits in the steady future, with each strategy's odds printed under
  its bar ("7 of 10", from its many-futures run; B9's addition). Key metric: the strategy with the most lifetime
  benefits, named, and the plan's own odds beside it.
- **Action Items** here are instructions, as RightCapital's are: a numbered list composed from strategy A ("1. [Name]
  files at 70, in [year].").
- **Stopgap**: B9 does not search for the best claim ages yet (map gap 7); one line under the pickers says so, and the
  picker offers no "optimal" option until that build. A person who already claims is shown as fixed, in words.

**Retired vs working.** Working: the runs use the plan's base stop year (named). Both people already claiming: the
page shows each one's benefit and the lifetime total, and says there is no claim choice left.

**Fit decision.** One frame at REAL per tab.

**Files.** `src/ui/screens/retirement/SocialSecurity.tsx`, `socialSecurityView.ts` (pure: strategies to bundles,
the cumulative series, the break-even, the instructions); `src/viz/charts/claimOptions.ts`.

**Test scenarios.** Each strategy's bundle changes only claim ages (U14's field-by-field check); a claimed person is
never in a bundle; a person aged 64 is offered 64, never 62, and no bundle is refused as in the past; a 1957 birth's
full-retirement strategy is 67; coinciding strategies appear once, with the line saying so; the break-even from hand-built series (crossing, no crossing, a crossing after the steady future's
second death is not shown); the lifetime totals equal the row sums; the instruction list names each person once;
"optimal" appears nowhere.

**Verification.** CI fit on `retired`, `date`, `healthss`: one frame at REAL; the crossing label and the odds labels
pass the audit at REAL and PHONE. Local look.

### RC10: Retirement → Health Care

**Clones.** Ref 2.15, corrected by critique 9. Screens: `rc-analysis/health-care-cost-analysis__cleanshot-2026-09-22-at-11-35-47-2x.png`,
`rc-analysis/health-care-cost-analysis__cleanshot-2026-09-21-at-17-07-22-2x.png`.

**Reads.** Retired: `HealthReadout.byYear` (per-year medians of the net ACA premium, base Medicare, the IRMAA surcharge
and the extras; `overCliffFraction`), the lifetime totals (`TaxAwareWire`'s `lifetimeNetPremiumReal`,
`lifetimeMedicareCostReal`); every sentence through `composeHealthSheet` and its siblings in `healthSheetChrome.ts`.
Working: the Steady future's ledger `premiums` per year (the date route emits no health readout).

**What it shows.** One folder tab, Cost Analysis (Medicare Options and Preferences are left out: their ✓/✗ matrix
needs fields B9 does not ask). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
- **No stacked total.** A sum of medians is not the median of totals, and the IRMAA median is $0 in any year fewer than
  half the futures pay it. Each part is its own small chart, the four aligned on one age axis (small multiples, as
  RightCapital's summary is): ACA net premium, Medicare base, IRMAA surcharge, extras, each titled with its part and
  "middle cost each year" in the legend.
- **The shipped sheet's two quoting gates hold.** The charts draw only `quotableYears(readout)` (`healthSheetChrome.ts`:
  years where the living cohort is full, `cohortFraction >= COHORT_FADE.full`; a median over few living futures is
  noise). A year below that bar draws nothing.
- **The ACA cliff**: `overCliffFraction` is a share of the ACA-priced futures only (`HealthReadoutYear`: "read it only
  where `acaPricedFraction > 0`"). It prints above a pre-65 bar only where `acaPricedFraction >= 0.5` (the sheet's own
  gate), through the sheet's own count rule (`acaCostCliff`'s X-of-10 words, the "more than 9 in 10" ceiling, nothing
  where it rounds below 1), and its words name the base: "of the futures that buy ACA cover this year". The working
  route (no readout) prints no cliff share.
- **IRMAA**: the health sheet's existing wording (`healthSheetChrome.ts`) under its chart, until a per-year share of
  futures paying IRMAA exists (section 6).
- **Key-metric column**: the lifetime totals as the health sheet words them; the Medicare residual.
- **The Action Items tray**, mapped to B9's health inputs: the ACA subsidy rules row is a what-if (the `aca-subsidy`
  lever); the other rows (each person's Medicare extras, the out-of-pocket figure, pre-65 coverage while another works)
  are plan facts, shown with their values, each opening its Profile drawer (the interim Profile page until RC13) and
  saying in words that it changes the plan.
- **Working route**: the same small multiples from the steady future's premiums, labelled "in the steady future", with
  one stopgap line that the range across futures comes with the working household's readings at its date (section 6).
- **Per person**: the readout is household-wide; the charts say "both of you" (section 6 names the split).

**Deletes**: `src/intake/HealthcareSheet.tsx` (its interim tab) and its CSS, its arm in `editorSheets.tsx`, and the
files only it kept alive: `controlPreview.tsx`, `TwoFutures.tsx`, `chartText.tsx`, `chartText.css`, `twoFutures.css`,
what is left of `bandGeometry.ts`, and the old palette exports nothing kept reads. The assumption panel's health row
(`onOpenHealth`) re-points to this page.

**Fit decision.** One frame at REAL (the four small charts and the column).

**Files.** `src/ui/screens/retirement/HealthCare.tsx`, `healthCareView.ts`, `src/viz/charts/healthPartsOptions.ts`.

**Test scenarios.** No series is a stack total; every part's legend says "middle cost each year"; a year below the
cohort bar draws nothing; the cliff share appears above pre-65 years only, and a year where 10% of futures price the
ACA prints no share; the share's words name the ACA-priced futures; IRMAA's words come from the health sheet's composer; the working route's charts name
the steady future and carry the stopgap line; the fact rows open their drawers and the subsidy row runs a what-if.

**Verification.** CI fit on `health`, `healthnc`, `date65`, `healthgap`: one frame at REAL; every printed share and
label passes the audit. Local look.

### RC11: Retirement → Stress Test, the stresses B9 can run today

**Clones.** Ref 2.13. Screens: `rc-analysis/FRAME_stress-test-full-page-hover-tooltip.png`,
`rc-analysis/stress-test-action-items__cleanshot-2024-08-06-at-10-48-54-2x.png`,
`rc-analysis/FRAME_stress-test-loading-after-refresh.png`.

**What B9 can run honestly today, with no engine work** (map gap 8's market, inflation, tax, return and lifespan
shocks need the engine; section 6): stresses that are edits to a copy of the plan's inputs, run on the what-if runner
on the plan's own futures: "Social Security pays X% less than your statements say, from the start" (the statement
figures scaled), "Out-of-pocket medical costs run X% higher" (the out-of-pocket figure scaled), and "The ACA subsidy
rules switch" (the `aca-subsidy` lever; offered only when someone has years before 65). Plus Baseline (the plan) and
Combined (every chosen stress at once). The builder first confirms the statement figure is the only input to each
person's benefit in `socialSecurityBenefit.ts`; if another input feeds it, the stress scales it too or the row is left
out. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**What it shows.** "Stress test: odds of success", one bar per stress on a fixed 0 to 10 axis, "X of 10" printed on
top of every bar (no hover needed), the stress's name under it; Baseline drawn as an outline with its word, Combined
hatched. The tray: sentence rows with a slider ("Social Security pays [20%] less…"), Edit and Refresh. **Stopgap**:
one line under the chart: "Market drops, higher inflation, higher taxes, lower returns and longer lives come with
B9's stress-test build." Working: the odds at the plan's base stop year, named.

**Files.** `src/intake/stress.ts` (pure: the draft-copy writers, refusals by name), `src/ui/workbench/stressRun.ts`
(the request builder over `whatIfRunFor`'s core; KTD11's matching check; one slot per stress, made once),
`src/ui/screens/retirement/StressTest.tsx`, `stressView.ts`, `src/viz/charts/stressBarsOptions.ts`.

**Test scenarios.** Each stress writer changes only its own input on the copy, compared field by field; the plan's
draft and vault are untouched (a spy); every run shares the plan's futures (seed, paths, horizon, people); Combined
applies every chosen stress; the subsidy row is absent with no pre-65 years; every bar prints its count through the
copy slots; Baseline equals the plan's own reading.

**Verification.** CI fit on `retired`, `health`, `dip`: one frame at REAL; every printed count and name passes the
audit at REAL and PHONE. Local look.

### RC12: Investment → Asset Allocation and Tax Allocation

**Clones.** Ref 2.19. Screens: `rc-cashflow-tax/help-investment-asset-allocation-51.png`, `-54-later.png`,
`rc-cashflow-tax/help-investment-tax-allocation-51-later.png`.

**Reads.** Each entered account's mix and balance (the draft; `blendSourceOf` in `intakeMap.ts` for the
value-weighted household blend the run reads); the left plan's `mix` lever; balances by tax bucket.

**What it shows.**
- **Asset Allocation → Summary**: two thick donuts facing each other, "Current mix" (picker: all accounts, by owner, by
  tax bucket) and "What-if mix" (the mix lever of the alternative chosen on Analysis, else "No what-if mix"), each
  with stock, bond and cash only (B9 holds one stock, bond and cash split per account; the legend table says so),
  stock / bond percentages in the centre; between them the legend table (current %, class, what-if %). **No annual
  return or standard deviation lines** (no engine output stands behind them, critique 13). **Detail**: a Category,
  Class, Current, What-if table beside diverging bars centred on 0%.
- **Tax Allocation**: a donut of taxable, pre-tax, Roth and HSA (each with its pattern and word) beside their big
  numbers; clicking a slice or number lists that bucket's accounts.
- Allocation Path and Holdings are absent until their builds (section 6). The mix stays a what-if that is never
  applied (KTD15).

**Fit decision.** One frame at REAL per tab.

**Files.** `src/ui/screens/investment/AssetAllocation.tsx`, `TaxAllocation.tsx`, `investmentView.ts`,
`src/viz/charts/donutOptions.ts`.

**Test scenarios.** The current mix equals the run's household blend; the by-owner and by-bucket pickers sum to the
whole; no return or risk figure exists in the view; the what-if donut reads the lever, never the facts.

**Verification.** CI fit on `buckets`, `retired`: one frame at REAL; donut words and centre numbers pass the audit.
Local look.

**Milestone 2** closes here.

### RC13: Profile pages: card grids and drawers

**Clones.** Ref 2.4 and 2.5. Screens: `rc-shell/dataentry-05.png`, `rc-shell/profile-03.png`, `profile-05.png`,
`profile-07.png`, `rc-shell/form-401k-01.png`, `rc-shell/form-retexp-02.png`, `rc-shell/planoverview-01.png`,
`rc-shell/profile-02.png`, `rc-shell/form-card-01.png`, `rc-shell/bp-networth-22.png`, `rc-shell/vimeo-income_add-a-salary.jpg`.

**What it does.** Profile's sub-tabs Family, Income, Savings, Net Worth, Expenses, Goals (Blueprint at RC15), each a
4-column grid of RightCapital cards (Net Worth is master-detail), every card opening a right drawer with only the
fields the engine reads (D7). A drawer's Save writes through the intake's writers and `validateDraft`'s errors show
under their fields (never a separate screen); the store recomputes as today. Delete removes list items (accounts,
budget lines, other income). The blue "Add … >" menus add cards. The same cards serve the stepper in RC14.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**The cards** (B9's facts on RightCapital's sections; placement keeps B9's input order, so a later card never asks
before what its question reads):
- **Family**: Client and Co-client (name, birth year, sex, still working or retired, and the age they stopped if
  retired); Home state.
- **Income**: a Salary card per working person (pay); a Social Security card per person (statement figure, claim age,
  already claiming); Other income cards (pension, rental, annuity and the rest: start and end age, raise rule, taxable
  share, survivor share, `otherIncome.ts`); Investment income while working (`writeWorkingYearInvestment`).
- **Savings**: one card per account carrying deposits (yearly deposit, employer match, employer HSA dollar), the
  legal limits from the family-wide rule. The account itself is one record shown on two cards: deposits here, balance
  and mix on Net Worth.
- **Net Worth**: master-detail. Left, the plum band "Invested accounts $X" (never "Total Net Worth", critique 4) and
  the Investment row (the only kind B9 holds); right, the account rows (name, kind, owner, balance; the drawer adds
  the mix by hand or by ticker, `allocation.ts`). The Add menu offers the four kinds. Stopgap lines: "B9 doesn't ask
  about your home, debts or bank accounts yet." and "An inherited IRA can't be entered as its own kind yet; entered as
  a traditional IRA it reads too rosy." (section 6).
- **Expenses**: Living expenses (one figure, or the **budget worksheet drawer**: one row per line with category,
  amount, essentials or discretionary, and start and end years; the survivor spending ratio), Out-of-pocket medical,
  and for a working household **Pre-retirement living expenses** (W: the quote, its stale face and Keep,
  `workingYearQuote.ts`; the left-over question inside it). This is RightCapital's Pre-retirement Living Expenses card
  (critique 11).
- **Goals**: Retirement (per person: still working, "B9 finds your work-optional date", or retired), Health before
  Medicare (the ACA quote; pre-65 coverage while another works), Medicare (the IRMAA income two years back; each
  person's extras, `writeMedicareExtras`), and for a working household the **money picture** card (year 0 and the
  years an event changes it, `workingYearLines.ts`).
- **Where the rest live**: the plan's withdrawal order, Roth plan and ACA rules are changed in the tray and applied
  (U15's rule) and read in Settings (RC18); the recommendation's goal and heirs' bracket live on Tax Strategies.
- **No Notes** link anywhere (RightCapital's Notes are left out; B9 has no notes field). *(the pilot's call,
  2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**The fact registry.** `factRegistry.ts`'s doors re-point from the facts page and its step sheets to the drawers:
every saved fact has a drawer home, and `shownFacts()`'s test keeps proving the not-yet-shown list is empty.

**Deletes**: `src/ui/workbench/FactsPage.tsx`, `StepSheet.tsx`, `factsChrome.ts`'s parts only the facts page read,
and `editorSheets.tsx`'s budget arm (the assumption panel's budget row re-points to the Expenses drawer).
`editorSheets.tsx` shrinks to its assumptions arm, the gear's interim drawer's only mount, until RC18 (built next)
deletes it with the panel. The walk's components stay until RC14 (the walk still runs first-run setup).

**Retired vs working.** Salary, W, the money picture and the working-income card show only for working people; a
retired person's card shows the age they stopped.

**Fit decision.** Scrolling pages; drawers fit his window with their own scroll; at the phone each drawer is a
full-screen sheet that names itself and takes focus.

**Files.** `src/ui/screens/profile/*.tsx` (one page per section), `profileView.ts` (pure: the cards per draft),
`src/ui/screens/profile/drawers/*.tsx` with a pure field composer per drawer (`*Fields.ts`); `src/ui/kit/ProfileCard.tsx`;
`src/ui/workbench/factRegistry.ts`; `src/ui/copy.ts`.

**Test scenarios.** Every drawer field writes the same draft field the walk wrote (compared field by field on a seed);
an error from `validateDraft` shows under its field and blocks Save; two accounts of one owner over the shared limit are
refused as intake refuses them; deleting a budget line a kept what-if targets leaves that what-if saying gone; every
saved fact has a drawer (the registry test); the inherited-IRA and home/debt/bank stopgap lines are present; W's stale
face and Keep behave as the pay check spec says (`?seed=datecoststale`, `?seed=datesaved`).

**Verification.** CI fit on `budget`, `date`, `datesaved`, `datecoststale`, `tablewidest`: each page's first frame,
each drawer at REAL and as a phone sheet; no sideways scroll; a W period tapped right after typing lands (the old
coordinate-tap arms, ported). Local look.

### RC18: Settings (the gear) and the Display drawer (built straight after RC13)

**Why here.** `AssumptionPanel.tsx` imports the walk's components, so it must go before RC14 deletes them, and its
only mount (`editorSheets.tsx`'s assumptions arm) is all that is left of that file after RC13. Settings reads RC13's
drawers and RC4's tray, nothing from RC14 to RC17. *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all
changes))*

**Clones.** Ref 2.20. Screens: `rc-shell/plansettings-02.png`, `rc-analysis/FRAME_display-settings-drawer.png`.

**What it shows.** The gear's page: folder tabs (Methodology, then the groups `assumptionRegistry.ts` already lists),
a two-column grid of rows, each a value or a dropdown with a one-sentence plain explanation under it that changes with
the choice (`methodologyArmFor`, `workingCostValueLine` and the registry's lines). Editable rows open their drawer
(the survivor ratio, W) or their tray row (the plan's withdrawal order, Roth plan, ACA rules, with Apply). A read-only
tab shows the values and no control that writes (section 4.0). **The Display drawer**: "Show years instead of ages",
"Same scale for both halves"; the dollars are stated as "Today's dollars" (B9's native unit) with no future-dollars
toggle until `src/engine/priceIndex.ts` backs one (critique 12). Display choices last for the session only (no saved
shape in this act). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Deletes**: `src/intake/AssumptionPanel.tsx` (its interim drawer), `assumptions.css`, `src/ui/editorSheets.tsx`
(its last arm), and `src/intake/controlSheet.tsx` (the panel was its last importer).

**Files.** `src/ui/screens/settings/Settings.tsx`, `settingsView.ts`, `DisplayDrawer.tsx`, `src/ui/displaySettings.ts`.

**Test scenarios.** Every assumption the answer used has a row (the registry test); each live sentence follows its
choice; the W row's door opens W's drawer; "years instead of ages" switches every time axis; no future-dollars
control exists; a read-only view carries no write action.

**Verification.** CI fit on `retired`, `datecoststale`: the page at REAL and PHONE; the old assumption-panel arm
retires. Local look.

### RC14: The first-run stepper

**Clones.** Ref 2.3 and 1.3. Screens: `rc-shell/dataentry-03.png` to `dataentry-09.png`,
`rc-shell/vimeo-family_choose-a-resident-state.jpg`.

**What it does.** The cold start's Begin becomes "Start a new plan": a drawer asks the two names, then the stepper
opens with no module nav (wordmark, names, gear): the six chevron steps Family, Income, Savings, Net Worth, Expenses,
Goals, each a page of RC13's cards, pre-made where B9 has the field (a Salary and a Social Security card per person,
an account card per working person, Living expenses, Retirement per person). Which cards a household gets comes from
`intakeStepIds(draft)` (RC0), so the conditional order of today's walk holds (the state before spending, spending and
out-of-pocket before W, the accounts before the money picture). Previous and Next at the bottom right; Next runs
`continueCheck` (`stepChecks.ts`) over the step's cards and opens the first card with a blocking error at its field;
Goals ends with Complete, which hands the draft to the store (provisional, then final) and lands on Snapshot.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**The walk's step ids on the six steps** (`intakeStepIds` keeps choosing which appear; this table only says where):

| Step | Walk step ids (today's `StepSectionId`) |
|---|---|
| Family | `names`, `work`, `retirement-state` |
| Income | `income`, `social-security`, `other-income`, `working-income` |
| Savings | the deposit fields of `accounts` (a retired household's Savings step holds one line: nobody is saving from pay) |
| Net Worth | `accounts` (balances and mix) |
| Expenses | `spend`, `oop-medical`, `working-cost`, in that order |
| Goals | `health-quote`, `employer-coverage`, `irmaa-seed`, `medicare-extras`, `working-ledger` |

Three ids move earlier than today's walk (`retirement-state`, `other-income`, `working-income`); none of them reads a
card that now comes after it. The orders that matter hold: the state before spending; spending and out-of-pocket
before W (the W quote reads spending, the budget, out-of-pocket and the state, `workingYearQuote.ts`); the accounts and
everything else before the money picture, which is last. The builder re-checks each card's reads against this table
before building, and a card that reads a later one moves after it.

**The provisional answer strip leaves setup** (RightCapital shows no answer during setup). Its logic stays: the
missing-facts lines (`missingFactLines`, `blockedLeadFor` in `missingFacts.ts`) show on Complete when something
blocking is still unanswered, and in the shell's empty states (TPAW's rule: say what the screen is waiting for).
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

**Deletes the walk**: `src/intake/flow.tsx`, `questions.tsx` (its step bodies), `AnswerStrip.tsx`, `fields.tsx`,
`FieldError.tsx`, `AccountEntry.tsx`, `AllocationEntry.tsx`, `BudgetBuilder.tsx`, `BudgetLineItem.tsx`,
`OtherIncomeEntry.tsx`, `WorkingCostQuestion.tsx`, `WorkingYearLedger.tsx`, `WorkingYearLeftOverQuestion.tsx`,
`budget.css` and `sheetShell.css` (RC18 already removed their last importer outside the walk, `AssumptionPanel.tsx`).
`ExternalLink.tsx` and `intake.css` stay: `coldStart.tsx` imports both until RC19 restyles the cold start (the link
rule then moves into the kit).

**Retired vs working.** The working-only cards appear as `intakeStepIds` says; a household that turns out all retired
never sees them.

**Fit decision.** Scrolling pages; the stepper bar and the step title in the first frame at REAL; at the phone each
step change scrolls to the top (the old intake-fold law, ported).

**Files.** `src/ui/screens/setup/Stepper.tsx`, `stepperView.ts` (pure: steps from `intakeStepIds`, the pre-made cards,
Next's check), `NewPlanDrawer.tsx`; `src/ui/IntakeApp.tsx` (the `intake` phase renders the stepper); the deletions.

**Test scenarios.** A fresh plan walks the six steps to Complete and lands on Snapshot with the same draft the walk
produced for the same answers (compared field by field on two made-up households, one working, one retired); Next with
a blocking error opens that card's drawer at the field; the pre-made cards exist before any typing; `?seed=` skips the
stepper; a working household gets W and the money picture, a retired one does not.

**Verification.** CI CSP: the real-intake walk now drives the stepper and lands on the home. CI fit: the stepper at
REAL and PHONE (step change to top; a drawer names itself and takes focus; the step nav yields while a drawer is
open). `e2e/intake-fold.spec.ts` retires here. Local look.

### RC15: Profile → Blueprint

**Clones.** Ref 2.6. Screens: `rc-shell/site-blueprint-net-worth.png`, `rc-shell/planoverview-02.png`,
`rc-shell/kbbp-networth-02.png`, `rc-shell/kbbp-goals-01.png`, `rc-shell/site-blueprint-goals.png`, `rc-shell/kbbp-ise-01.png`.

**What it shows.** Folder tabs Net Worth, Goals, and Income, Savings, Expenses on one panel; the legend of dashes; the
headline box; "Edit" (hide or show items) and "Add >" (the same Add menus). **Net Worth**: the two person icons with
name and age, the curved arrows to each person's column of tiles; **no Jointly Held column** (B9 has no joint
ownership, critique 13); the headline reads "Invested accounts: $X" with the stopgap line. **Goals**: the dotted spine
with each year's tiles: each person's stop (the crowned work-optional date once the answer has one, else "B9 finds
it"), each claim age, Medicare at 65, budget lines by their start and end years. **Income, Savings, Expenses**: the
swim lanes (rows Income, Savings, Expenses; columns him and her). Every tile carries its category word in small caps
above its name (the colour bar alone fails for green against coral) and opens the same drawer as its Profile card.

**Fit decision.** Scrolling page.

**Files.** `src/ui/screens/profile/Blueprint.tsx`, `blueprintView.ts`.

**Test scenarios.** Every tile names its category in words; no joint column exists; every tile opens its card's
drawer; the Goals spine orders by year and shows both ages; the work-optional date tile reads the committed answer's
date, never a provisional one without its tag.

**Verification.** CI fit on `budget`, `date`: first frame and no sideways scroll at REAL and PHONE. Local look.

**Milestone 3** closes here.

### RC16: Dashboard → Balance Sheet

**Clones.** Ref 2.2. Screens: `rc-shell/balsheet-01.png`, `balsheet-02.png`.

**What it shows.** Folder tabs Current and Details (Historical left out: B9 keeps no history). Current: the sentence
"Your invested accounts total ~$X, as entered" with the aged-balances year where it applies, and one bar per kind
(taxable, pre-tax, Roth, HSA) with its name on the axis and its value printed; **no Liabilities and no Net worth bars**
(critique 4); the stopgap line. Details: accounts by kind and owner. DETAILS pull tab.

**Files.** `src/ui/screens/dashboard/BalanceSheet.tsx`, `balanceSheetView.ts`.

**Test scenarios.** The total equals the entered balances; no liability or net worth figure exists in the view; the
stopgap line is present.

**Verification.** CI fit on `buckets`: one frame at REAL. Local look.

### RC17: Analysis → Comparisons, Retirement Details, Savings

**Clones.** Ref 2.10, 2.11, 2.12. Screens: `rc-analysis/comparisons-tab-retirement-analysis__cleanshot-2024-07-29-at-10-46-33.png`,
`rc-analysis/FRAME_comparisons-return-scenario-dropdown-bad-decade.png`,
`rc-analysis/retirement-details-tab-retirement-analysis__cleanshot-2024-07-29-at-13-47-56-2x.png`,
`rc-analysis/savings-tab-retirement-analysis__cleanshot-2024-07-29-at-13-16-56-2x.png`,
`rc-analysis/blog__income-comparison.png`, `rc-analysis/blog__retirement-spending.png`.

**Reads.** Ledger rows of the left and right plans on Steady or Rough (the future picker at the top right), through the
table lanes and the what-if slots.

**What it shows** (three new Analysis folder tabs):
- **Comparisons**: invested assets over time (the sum of each row's year-end balances), income tax per year, and
  each side's assets at its own first retired year (two bars, each labelled with its year and both ages, since a
  what-if can move the stop year). The net worth chart is left out (no net worth data). Overlapping areas:
  the alternative solid green, the compared plan an outline with a dashed top line. Key metric: "[Plan] has ~$X more
  invested at [age] than [plan], in the steady future".
- **Retirement Details**: income sources (stacked bars per retired year: Social Security, other income, withdrawals by
  bucket, HSA; a short year drawn as a cross-hatched band with the words "money ran out this year" on top, never a
  dollar shortage the rows do not carry), the withdrawal rate per year, spending (spending, income tax, health
  premiums stacked), the income comparison donuts and the spending comparison bars. Key metrics: the share of income
  that is not a withdrawal, the short years. Guardrail and floor-and-ceiling charts wait for map gap 9.
- **Savings** (working households; a retired household sees only this year's deposits): this year's deposits by
  bucket, deposits per year to the first stop, deposits as a share of pay, and the working years' left over
  (`LedgerWorkingYear`). The "portfolio return" chart is left out until return dollars are a ledger field.

**Fit decision.** One frame at REAL per tab.

**Files.** `src/ui/screens/retirement/Comparisons.tsx`, `RetirementDetails.tsx`, `Savings.tsx`, their `*View.ts`
composers, `src/viz/charts/overlapAreasOptions.ts`, `incomeSourcesOptions.ts`.

**Test scenarios.** Each series equals its row fields; a short year draws the hatched band and no dollar figure; the
one-path key metrics name their future; Savings for an all-retired household shows one chart.

**Verification.** CI fit on `retired`, `dip`, `dateshort`: one frame at REAL; labels pass the audit. Local look.

### RC19: The vault and session screens

**Clones.** No RightCapital screenshot covers them (the reference offered only "a lock icon"); they take the look of a
RightCapital login page and its drawers (critique 11). *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all
changes))*

**What it does.** Restyles, with the same logic (`vaultSession.ts`, `passphraseStrength.ts`, `unlockCopy.ts`,
`updateGate.ts`, the store): **Unlock** (a centred white card on `--stone-100`: the wordmark, the passphrase field, the
blue Unlock button, links "Use your recovery passphrase" and "Restore from a backup file"); **Start** (the cold start:
"Start a new plan" and the restore link; the damaged-vault notice); **Save** (first save from the lock menu: a right
drawer for the passphrase with its strength meter, then the recovery passphrase, then the done state); **Back up and
export** (a drawer, `ExportConfirm`); **Restore** and **Recovery** (pages before unlock, in the card style);
**Re-entry** ("Still about right?" on its own page in the stepper's frame, its decision pair in the first frame);
**View-only** (a shell banner); **Update** (Base UI Toast); the error boundary in the shell's frame.

**Deletes** the old components' CSS (`save.css`), `PendingPanel.tsx`, `NotePartsBlock.tsx`, `ExternalLink.tsx` (their
last importers are these screens), `Disclaimer.tsx` (`App.tsx`'s trailing mount becomes the kit's `Caveat`, section
4.0's R13 rule), and the probe page (`kit-probe.html`, `src/kit-probe.tsx`): every probe component now renders in a
real screen a CSP arm visits, and the probe's hatch-and-palette check moves to the first screen the shell arm visits
that draws a hatched series (the builder names it in the commit).

**Files.** `src/ui/App.tsx`, `UnlockScreen.tsx`, `PassphraseStep.tsx`, `SaveFlow.tsx`, `BackupStep.tsx`,
`ExportConfirm.tsx`, `RestoreFlow.tsx`, `RecoveryFlow.tsx`, `ReEntry.tsx`, `ViewOnlyBanner.tsx`, `UpdateToast.tsx`,
`ErrorBoundary.tsx`, `src/intake/coldStart.tsx` (each rewritten in the kit, logic unchanged).

**Test scenarios.** The existing tests of these components, re-pointed: the full trust loop (save, lock, unlock,
export, wipe, restore) on real IndexedDB; a second tab opens read-only and its write is refused; the recovery
passphrase opens the vault; the re-entry gate's decision pair; the update toast's reload path.

**Verification.** `e2e/vault.spec.ts` and its WebKit arms re-pointed and green; CI CSP: the probe arm folds into the
shell arm (unlock to home with no violation). Local look of each screen at REAL and PHONE.

### RC20: Cash Flows → Maps

**Clones.** Ref 2.16's Maps. Screens: `rc-cashflow-tax/help-retirement-cash-flows-maps-cash-flows-51.png`, `-53-later.png`.

**What it shows.** A Maps folder tab: the year scrubber (a dashed line from the first to the last year, the chosen
year pinned, retirement years marked) and a Sankey (Highcharts' sankey module) of that year's ledger row for the chosen
plan and future: inflow sources to total inflows to outflow groups to leaves, each node labelled "**Name**: ~$amount"
(colour plus words; links in pale tints); the Breakdown view as tinted tiles with a 4 px bar and the category word.

**Files.** `src/ui/screens/retirement/Maps.tsx`, `mapsView.ts`, `src/viz/charts/sankeyOptions.ts`.

**Test scenarios.** Inflows equal outflows plus the year's net change as the row's fields give them (no figure
invented to balance: a gap shows as its own labelled node); every node prints its name and amount; the scrubber's
year and both ages match the row.

**Verification.** CI fit on `retired`, `dip`: one frame at REAL; every node label passes the audit. CI CSP: the sankey
module under the real header. Local look.

### RC21: Clean-up and the act's close

Section 7.4.

---

## 5. What happens to the old UI

### 5.1 When each old surface is deleted

| Old surface (and its CSS) | Deleted at | Its replacement |
|---|---|---|
| `WorkbenchRoom.tsx`, `RoomSlot.tsx`, `PinnedAnswer.tsx`, the room's rules in `workbench.css` (the import of the rest moves to the interim tabs' container: today only `WorkbenchRoom.tsx` and `RoomSlot.tsx` import it) | RC2 | the shell (`ShellSlot.tsx`) |
| The answer half of `Result.tsx`; `FuckOffDate.tsx`, `ConfidenceStatement.tsx`, `TwoTierHeadline.tsx`, `SurvivorReadout.tsx`, `SaveSlot.tsx`; `ConfidenceBand.tsx`, `ConfidenceBandPanel.tsx`, `BandLegend.tsx`, `BandEnlargeModal.tsx`, `OddsLadder.tsx`, `oddsLadderGeometry.ts`; `src/ui/preview/U7Preview.tsx`, `DatePreview.tsx`, `preview.css`; `confidence.css`, `fuckOffDate.css`, `survivor.css`, `band.css`, `oddsLadder.css` | RC4 | Snapshot and Probability |
| `WhatIfPage.tsx` (in the tray's commit), `RailLevers.tsx`, `SequencingControl.tsx`, `RothLever.tsx`, their arms in `editorSheets.tsx` | RC4 | the Action Items tray |
| `YearTable.tsx`, the rest of `workbench.css` | RC6 | Cash Flows |
| `Result.tsx` (the interim recommendation tab), `RecommendationSurface.tsx`, `GradeSignal.tsx`, `verdictSignal.tsx`, `GoalPicker.tsx`, `RecommendationViz.tsx`, `recommendationViz.css`, `recommendation.css`, `result.css` | RC8 | Tax Strategies |
| `HealthcareSheet.tsx` and its `editorSheets.tsx` arm, `controlPreview.tsx`, `TwoFutures.tsx`, `chartText.tsx`, `chartText.css`, `twoFutures.css`, the rest of `bandGeometry.ts`, the old palette exports nothing kept reads | RC10 | Health Care |
| `FactsPage.tsx`, `StepSheet.tsx`, the budget arm of `editorSheets.tsx` | RC13 | Profile pages and drawers |
| `AssumptionPanel.tsx`, `assumptions.css`, `editorSheets.tsx`, `controlSheet.tsx`, `controls.css` (built straight after RC13) | RC18 | Settings |
| The walk: `flow.tsx`, `questions.tsx`, `AnswerStrip.tsx`, `fields.tsx`, `FieldError.tsx`, `AccountEntry.tsx`, `AllocationEntry.tsx`, `BudgetBuilder.tsx`, `BudgetLineItem.tsx`, `OtherIncomeEntry.tsx`, `WorkingCostQuestion.tsx`, `WorkingYearLedger.tsx`, `WorkingYearLeftOverQuestion.tsx`, `budget.css`, `sheetShell.css` | RC14 | the stepper |
| The vault screens' old markup, `save.css`; `PendingPanel.tsx`, `NotePartsBlock.tsx`, `noteParts.css`, `Disclaimer.tsx`, `ExternalLink.tsx`, `intake.css` (`coldStart.tsx`'s); the probe page | RC19 | the restyled vault screens and the kit's `Caveat` |
| `tokens.css`, `base.css`, `app.css`, the legacy layer, Fraunces and Source Sans 3 (their packages) | RC21 | `theme.css` and Tailwind's preflight |

Not scheduled: `src/ui/preview/RefiguringPreview.tsx` stays (it mounts the real `App` and holds the re-figuring
window still; the ported re-figuring arms measure through it), and `preview/fixtures.ts` and `dateFixtures.ts` stay
while kept tests import them.

**The rule.** A file is deleted in the unit that deletes its last importer (a CSS file with the last component that
imports it). The builder proves it by removing the file and running `pnpm typecheck` (and, for CSS, `pnpm build`)
before the commit; a file the table names too early stays until its last importer goes, and the commit says so.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

A copy key used only by a deleted surface goes with it. A render test goes with its component after section 1.4's
port of its honesty laws.

### 5.2 The e2e harnesses: retired or re-pointed per screen

**The rule.** An arm that guards an **honesty law** (a line present, a state named, a decision pair in frame, a tap
target that must not move when a reading lands, a typed figure that must land) is **ported** to the new screen in the
unit that deletes its surface. An arm that guards **the old layout** (the old two-pane's one-frame fit, a seat's
reservation, a posture, a row count) **retires with its surface**, and the new screen's own fit decision (section 4.0)
replaces it. The builder finds the arms by grepping `e2e/` for the deleted components' selectors and classes, and the
commit message lists each arm as ported or retired. Nothing moves to `e2e/held/` to dodge a red: a held spec is an
instrument, never a parked gate. CI never freezes the old look: no arm is kept alive by keeping an old surface alive.
*(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*

| Harness | What it binds today | Fate |
|---|---|---|
| `e2e/vertical-fit.spec.ts` (verify:fit) | the answer page's one-frame law per seed and size, the recommend-second posture, steer note, pending frame and right rail, the save slot's reservation, the NC, PA, FL, elsewhere and health state clauses, the date route's order contracts, the honesty floor and band legend, the phone tier, the 20 and 24 px defaults, the computing frame, the re-figuring window, the assumption panel's extent, the vault returns and their gates, the record card faces, the spend lane, the pay check's W step and money picture and their coordinate taps, the survivor fold, the room's table and facts page | **RC2**: the room's arms re-point to the interim tabs. **RC4**: the answer page's arms go; ported to `rc-screens.spec.ts` on Probability: the state clauses, the date order contract, the re-figuring line over the old answer, the computing frame's caveat, the vault-return gates' decision pairs and their echoed answer, the spend lane's "the figure lands without moving anything", the survivor row, the R13 arms (exactly one visible disclaimer, `assertOneVisibleDisclaimer`; in frame at REAL; caveat order and reach at the phone and at 20 px, `assertCaveatOrderAndReach`); retired: the old one-frame, posture, seat and row-count arms. **RC6**: the table arms ported to Cash Flows. **RC7**: the honesty floor and legend ported to Confidence. **RC8**: recommend-second, steer, pending and record-card arms ported to Strategies. **RC13**: the W step, money picture, left-over seat and coordinate-tap arms ported to the drawers; the facts page arm goes. **RC18**: the assumption panel arm retires. **RC21**: the file is deleted once empty. |
| `e2e/chart-text.spec.ts` and `e2e/chartTextAudit.ts` (verify:fit) | the hand-rolled HTML label layer on the band, the ladder, TwoFutures and the enlarge modal; the planted-fail controls; the font-size and reduced-motion arms | **RC3**: `chartTextAudit.ts` is rewritten for Highcharts' DOM (data labels, axis labels, plot-line labels, legend items: each required label exists, is visible, is unclipped by the chart or the page, is at least the leaf floor size, and is not hidden by collision handling); being a new kind of check, it gets its planted-fail controls (a hidden label, a clipped label, a shrunk label). The font-size-following and reduced-motion arms re-point to the fan. **RC4**: the ladder's arms port to Odds by stop year (critique 3: ported, never retired); the enlarge-modal and lever-sheet TwoFutures arms retire. **RC7**: the band arms (dense date household, spine, aged spine and aged date band, widest tick) port to Confidence. **RC8**: the remaining TwoFutures arms retire. |
| `e2e/chart-text-rv.spec.ts`, `playwright.fit-rv.config.ts`, the `verify-rv-chart-text` CI job | the two-bar RecommendationViz after a full-precision solve | **RC8**: rewritten on Tax Strategies (Summary bars, the Winner card's hero), same serialized harness and job |
| `e2e/intake-fold.spec.ts` (verify:fit) | the walk's phone fold | **RC14**: retired; its laws (step to top, an editor names itself and takes focus, the step nav yields) port to the stepper's arms |
| `e2e/design-tokens.spec.ts` (verify:csp) | the two old fonts, tabular digits, the CSSOM custom property | **RC1**: Figtree's arms added. **RC21**: the old fonts' arms go; the CSSOM arm stays |
| `e2e/csp.spec.ts` (verify:csp) | inline script, connect-src, img-src (with controls), the engine worker through the real intake, the pooled solve's workers, the room | **RC1**: the probe arm. **RC2**: the room arm becomes the shell arm. **RC4**: the real-intake walk lands on the home. **RC14**: the real intake is the stepper. **RC19**: the probe arm folds into the shell arm |
| `e2e/vault.spec.ts`, `e2e/vaultHarness.ts` (verify:csp, with the WebKit project) | the trust loop and the second tab | selectors re-pointed at **RC4** (save from the lock menu), **RC5** (kept what-ifs round trip), **RC19** (restyled screens); green throughout |
| `e2e/caddie-walk.spec.ts`, `playwright.caddie.config.ts` (not a CI gate) | the Caddie's capture targets on the old surfaces | not run during the act (no Caddie walks); **RC21** re-points its target list to the new screens so the skill works again |
| `e2e/held/` instruments | `rail-look`, `assumptions-row-look`, `medicare-cards-look`, `council-24px-shots` (old surfaces); the solve and what-if timing instruments (engine) | each old-surface instrument is deleted in the unit that deletes its surface; the timing instruments stay |
| New: `e2e/rc-screens.spec.ts` (verify:fit) | each new screen's arms, added unit by unit | added at RC2 |
| New: `e2e/held/rc-look.spec.ts` (instrument) | screenshots and the look audit for Briggsy | added at RC2 |

`scripts/__tests__/playwright-harness-partition.test.ts` keeps every spec claimed by exactly one harness; each unit
that adds or deletes a spec updates the configs in the same commit. The roadmap's Validation-gates rows for "Vertical
fit + chart text" and "CSP enforcement" are updated in the commits that change their arms.

---

## 6. The engine gaps the screens need, in the map's order

None of these is this act's unit. Each lands after the act as its own unit, in the map's order
(`docs/plans/rightcapital-map.md`, ruled 2026-11-22), opened with `/brief`, and each lands **as its RightCapital
screen**: the screen named below gains what the build adds, and its stopgap line goes in the same commit (D7: a note
survives only while its build is open).

| Map gap | The build (its existing units) | Screens it fills | What the screen shows until then |
|---|---|---|---|
| 2 | U16, U25 | done in this act (RC5; RC2 and RC4) | |
| 3 | The inherited-IRA account kind (U11, U12, U13; the pace lever U17) | Net Worth's Add menu and rows, Cash Flows → Accounts' inherited column, the tray's pace row | the Net Worth stopgap line (an inherited IRA entered as a traditional IRA reads too rosy) |
| 4 | Repeating spending lines (U18), a per-line inflation rate, a fixed payment that ends | the budget worksheet drawer's line fields; Blueprint Goals' repeat icon | a line in the worksheet drawer: every line keeps pace with inflation and happens once |
| 5 | One-time money in (an inheritance, a home sale) | an Income card; a Goals timeline tile; Cash Flows' Other inflows column | a line on the Income page; the column absent |
| 6 | The yearly yield (U23) first, then fill-to-a-line conversions (U19) and lines and room (U22) | Tax Strategies → Calibration (bracket and IRMAA lines over income, each line labelled at its right end); the tray's Roth row gains "fill up to a bracket"; the bracket headroom picture (ref 4.8) | no Calibration tab; the Roth row offers amounts only; the yield stopgap line on Cash Flows |
| 7 | The best claim ages search | Social Security's "best for your plan" strategy in both pickers and a Summary bar | RC9's line; the four fixed strategies |
| 8 | Stress tests: fixed shocks on the one shared draw (a drop now or at retirement, lower returns, higher inflation, higher taxes, longer lives) | Stress Test's remaining bars and sliders | RC11's line; the input-level stresses only |
| 9 | Spending that reacts to the markets (guardrails, floor and ceiling) | the tray's spending strategy row; Retirement Details' guardrail if/then card and its charts (ref 4.3, 4.13) | the strategy row shows only "Keeps pace with inflation" with a line saying the reacting styles come next |
| 10 | Per-year tax detail (federal, state and payroll split; the top bracket), then the 1040-style year | Tax → Tax Estimate (appears); Cash Flows' Income tax drill (its header underlined); Snapshot's effective federal rate ring; Tax Strategies → Details' tax table | no Tax Estimate tab; Income tax headed "Income tax" with the page's state clause, no drill |
| 11 | Positions (U20, U21) and bank accounts (U10) | Investment → Holdings (appears); Net Worth's Bank row; Blueprint tiles | Net Worth's stopgap line |
| 12 | Pay that changes (raises, part-time years), long-term care cost, then QCD, NIIT, AMT and itemized deductions where they move his numbers | the Salary drawer's raise and end fields; a Goals LTC card; Tax Strategies' disclosures | a line in the Salary drawer: one steady figure until the stop date |
| Map §1 rows | Home and property (only if a sale is planned) and debts | Balance Sheet's Liabilities and Net worth bars; Net Worth's Loan and Property rows; "Invested accounts" becomes net worth | the "Invested accounts" naming and the stopgap line (critique 4) |

**Gaps the screens surfaced that the map has no row for.** Each is a later unit, filed in `docs/backlog.md` by RC3 (the
first unit whose screen carries one of their stopgaps), small unless marked, except where the register already holds
it:
- **The working household's recommendation** (the solve on the crowned candidate, `solveDispatch.ts`'s named
  follow-up). Already in the register: *The date route's Tier-1 key is unruled…*, whose ⚑ NEGATIVE binds it (never ship
  the working-route solve without that ruling). RC3 adds Act 6's stopgaps to that entry rather than filing a new one.
  Until then: Tax Strategies' working-route line and no goal picker, Find button or Summary, Comparison and Details
  tabs (RC8); Snapshot's Recommendations card line (RC3); no Recommended in Probability's pickers (RC4). M.
- **The working household's readings at its date.** A plan run at the crowned date carrying the per-future outputs
  (the balance at the second death, the survivor reading, the run-out share, the health range). The request options
  exist on `engine.run`; the unit decides what the floor track shows and whether it needs engine work. Until then:
  Probability's survivor stopgap and no balance bar (RC4), Confidence's run-out stopgap (RC7), Health Care's
  steady-future charts and stopgap (RC10). M.
- **Portfolio-return dollars per year as a ledger field** (engine). Until then: no Invested Assets tab on Cash Flows,
  no "portfolio return" chart on Savings.
- **The per-year share of futures paying IRMAA** (engine; the same pattern as `overCliffFraction`). Until then: the
  health sheet's IRMAA wording on Health Care.
- **Health costs per person** (engine). Until then: Health Care's charts say "both of you".
- **A future-dollars view** (check `src/engine/priceIndex.ts` first). Until then: "Today's dollars", no toggle.
- **More named futures** (a flat 0% path, a crash in year one; engine). Until then: Steady and Rough only.
- **Allocation Path** (a mix that changes over time; M, map §7). Until then: no Allocation Path tab.

**Left out on purpose, so nobody re-adds them** (the map's §8, Briggsy 2026-11-09, plus critique 13): Insurance,
Education, Estate, Dashboard's Liquidity, Budget and Tasks, the More menu (Debt, Student Loan, Stock Plans, Business,
Calculator, Notes), the document Vault, Tax Analyzer, Investment's Risk, Sector and Style and Concentration, reports
and print, the Iris assistant, the chat button, the advisor portal and client switcher, account linking, Snapshot's
Add Item and drag, the Notes links, Health Care's Medicare Options and Preferences tabs. The top bar keeps
RightCapital's order so any of them could slot back in.

---

## 7. The process

### 7.1 Each unit

1. **The builder.** A fresh builder subagent per unit (`model: 'opus'`, `effort: 'high'`: a builder working from a
   finished plan with an xhigh review behind it, per the project's effort rule). Its inputs: this plan's unit, section
   4.0, section 5's rows for its surfaces, the reference sections and screenshots the unit names, `docs/landmines.md`'s
   UI, fit-gate, copy and Windows-and-the-shell sections (line endings bit RC4a), and Briggsy's latest typed message. It loads `back-nine-design` (as updated by RC1)
   for every unit, `dataviz` for any chart, `emil-design-eng` for the drawer, the tray and chart motion. Not
   `frontend-design` (the screenshots outrank it), not impeccable (not installed, ref 7). It writes the code and its
   tests, ports or retires the arms per section 5, runs the look instrument, and reports what it changed, what it
   ported and retired, and any call it made (tagged).
2. **The orchestrator** (the session: b9-3, then b9-4 onward) re-runs, on a quiet tree: `pnpm typecheck`, `pnpm lint`,
   the unit test files the change reaches (`pnpm vitest run <files>`), the unit's new `rc-screens.spec.ts` arms once
   with `-g` on the fit harness, `pnpm verify:csp` locally for RC1, RC2 and RC19 (their result gates the next unit),
   `pnpm verify:doc-stats` when a doc, a test count or a citation moved, and the look instrument; plus every spec that greps
   to a moved or deleted surface's copy keys or selectors, and the line-ending check (`docs/landmines.md`, Windows and the
   shell). It reads the builder's screenshots itself before committing. *(the pilot's call, 2026-11-24, b9-5: RC4a's CI
   reds and its CRLF files)*
3. **Commit and push** at the unit's end (or at each green commit inside an L unit): `git commit -- <paths>` (never
   `-a`), a message `feat(ui): Act 6 RC<n> -- …` listing the ported and retired arms and the pilot's calls. CI runs the
   full list; a CI red is fixed in the next commit; each session start reads the last code commit's runs by full sha.
4. **Screenshots for Briggsy.** The look instrument saves each finished screen at 1440×731 @2x and 390×844 @3x, for one
   retired and one working seed, to `temp/rc-shots/RC<n>/` (gitignored; `<screen>-<seed>-<size>.png`). The
   orchestrator names the folder in its report and in TODO's START HERE, so he reviews the output, never the diffs.
   *(the pilot's call, 2026-11-24, b9-3 (Briggsy pre-approved all changes))*
5. **The roadmap's You-Are-Here table** gains the unit's row status in its commit.

### 7.2 What does not happen in this act

No Caddie walks, no councils on copy, no stopping for Briggsy. Words are written once in `copy.ts`, plainly, under
`copyGuard`, and ship. No new design skill. No bundle-size trimming (ruled away 2026-11-22). No saved-shape change (if a
unit finds it needs one, that is a stop condition, 7.5).

### 7.3 Milestone reviews

At milestone 1 (after RC7), 2 (after RC12), 3 (after RC15) and 4 (RC21): one whole-file review of every file the milestone's
units touched, through the `ultramode-code-review` skill (fanned lenses, an adversary seat hunting the calm-but-wrong
reading, every finding verified against the source before it is acted on), every reviewer seat at `effort: 'xhigh'`.
Real findings are fixed in the next commit; the rest are recorded with why. Then one `/distill` pass for the
milestone's lessons. The adversary's standing questions: does any screen print a number the engine cannot back (a
pruned figure, a median stack total, a net worth with no debts, a percent for odds, "10 of 10", a one-path figure read
as the odds)? Is colour the only signal anywhere? Does any old honesty line lack its slot (section 4.0's map)?

### 7.4 RC21: clean-up and the act's close

- Delete `tokens.css`, `base.css`, `app.css` and the legacy layer; drop the scoped base and import Tailwind's preflight;
  remove `@fontsource-variable/fraunces` and `@fontsource-variable/source-sans-3` (and `motion` if nothing uses it);
  re-point the guards that read `tokens.css` to `theme.css` (`tokens.test.ts`'s contrast gate and its no-hex-elsewhere
  rule, and `breakpoint-mirrors.test.ts`'s token reads: the 68rem seam, the short tier and the phone tier move into
  `theme.css`), and delete the token-name collision test (nothing left to collide with); delete the interim banner and
  every interim-tab path; delete `vertical-fit.spec.ts` if empty; drop the old fonts' arms from
  `design-tokens.spec.ts`.
- Delete the store's sticky display seam (`resolveStickyDisplay`, `HEADLINE_STICKY_EPS`, `snapshot.displayed` and its
  capture in `commit()`) with its tests, once no reader is left (RC4's raw ruling took the last printed one).
- Re-point the Caddie capture harness's targets to the new screens.
- Docs: the roadmap's Act 6 rows closed; `docs/product.md`'s flow sections read the clone; `docs/architecture.md` §12
  final; `back-nine-design` final pass; the project `CLAUDE.md`'s commands table (the gates' descriptions name the new
  arms); `docs/landmines.md` carries what the act learned, by area.
- Milestone 4's review and `/distill`.

### 7.5 Stop conditions (the pilot decides; nothing waits for Briggsy)

A unit stops and the pilot rules, recording the call with the tag, when: the CSP proof reds on a library with no fix
inside the header (switch to the named fallback: React Aria for components, Recharts for charts); a measurement or a
test contradicts a decision this plan rests on; a screen would need a saved-shape change (a schema step is its own
unit, per KTD16); or the cardinal rule is at stake and no decision here covers the case. A pilot's ruling is written
into this plan as a dated amendment in the same commit.

---

## Attack verdicts (2026-11-24, b9-3)

The adversary's attack on this plan (`b9-ui-research/reports/plan-attack.md`, 17 findings) was checked against the
code at `7f8fccba4`. Every finding held at least in part and is folded into the sections above. These parts were
rejected or changed, with the reason:

- **F2, a label built per run ("federal and North Carolina").** Changed: no tax label names a scope, and the page's
  one state clause (`composeVerdictStateNote`) says it, so there is one producer, not two. **F2, summing
  `taxOnOutsideIncome` into a "lifetime" figure.** Rejected: the tax on pay is not a ledger field at all, so no sum is
  lifetime on the working route; that ring sums `taxPaid` over the years after work and says so.
- **F4, `ConfidenceStatement.tsx` kept to RC8.** Rejected: once RC0 moves `ConfidenceStatementView` into
  `answerView.ts`, that type is the only thing `RecommendationSurface.tsx` imports from it, so RC4 stands.
- **F4, "re-point the facts page's sequencing and roth doors".** Changed: the facts page has opened no sheet for those
  two since U15 (`factsChrome.ts`'s `choicesSection`: door `'none'` plus a link to the what-if). The two sheets are
  reached through the assumption panel's via-sheet rows (`onOpenSequencing`, `onOpenRoth`), so RC4 re-points those
  rows instead.
- **F6, `color-scheme: light` on the shell root.** Changed: `highcharts.css` sets `color-scheme: light dark` on
  `.highcharts-container` itself, so the root's value never reaches the chart. `chartTheme.css` sets it on the
  container.
- **F7, a 64rem stack tier.** Changed: the 70/30 split stacks at the existing 68rem seam, so the phone's 48rem is the
  only new tier. **F7, adding `rc-look.spec.ts` to `e2e/held/shots.config.ts`.** Rejected: that config already
  collects every `*.spec.ts` under `e2e/held/`, and the CSP harness already ignores `**/held/**`.
- **F12, deleting `App.tsx`'s trailing disclaimer in RC4.** Rejected: the walk's provisional strip prints "X of 10"
  until RC14 and relies on that mount. The shipped two-mount swap (`main.result[data-inframe-disclaimer] ~
  .disclaimer`) keeps exactly one visible, and the trailing mount goes at RC19.
- **F14, Refresh and Find counted as writes.** Rejected: running a what-if or a solve writes neither the plan nor the
  vault, and today a read-only tab may run both (only Apply and the save gestures are withheld).
- **F15, `BandPanelChrome` into `bandPanelChrome.ts`.** Changed: it goes to `src/viz/bandData.ts`, because
  `ConfidenceBandPanel.tsx` (viz) reads it until RC4 and viz may not import ui.
- **F16, the full-retirement-age function's file.** Corrected: it lives in `src/engine/constants/socialSecurity.ts`,
  not `earningsTest.ts`.
- **F17, "every move is to a later step".** Rejected as stated: `retirement-state`, `other-income` and
  `working-income` move earlier. The mapping holds anyway, because none of the three reads a card that now comes after
  it (RC14).

The same check found four deletion-schedule slips the attack missed, folded into section 5.1:
- `coldStart.tsx` imports `ExternalLink.tsx` and `intake.css` (both to RC19).
- `IntakeApp.tsx` imports the `ResultSaveProp` type from `SaveSlot.tsx` (moved by RC0).
- Only `WorkbenchRoom.tsx` and `RoomSlot.tsx` import `workbench.css`, so RC2 moves the import to the interim tabs.
- `sheetShell.css` lives until `BudgetBuilder.tsx` goes at RC14.
