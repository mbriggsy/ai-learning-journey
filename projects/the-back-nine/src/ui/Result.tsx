/*
 * src/ui/Result.tsx — D2 the landed magic moment (the result screen).
 *
 * On intake completion the quiet provisional AnswerStrip gives way to the ELEVATED state-adaptive
 * lead: the {@link FuckOffDate} hero for a still-working household, the {@link ConfidenceStatement}
 * for an all-retired one ({@link selectElevatedAnswer} owns the routing — the choice is the answer the
 * engine already crowned, never a re-derivation). The U12 Assumptions door (the Review door's old
 * seat) opens the {@link AssumptionPanel}; the guided re-walk back to intake lives INSIDE it, with
 * every answer preserved (the draft lives in the one `appModel`; nothing is persisted — U8 owns Save).
 *
 * CALM RENDERING (back-nine-design §3): the figures are STATIC and each surface owns its own
 * @starting-style reveal + reduced-motion fallback; this container adds NO theatrics — it only gives
 * the hero room to breathe and seats the quiet return. The hero heading takes focus once on landing
 * (resolvedFocusKey → the surface's focusSignal), the magic-moment announce.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnswerStrip } from '@intake/AnswerStrip'
import { buildControlPreviewParams, healthcarePriced, isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { useLiveAnnouncer } from '@intake/a11y'
import { BudgetBuilder } from '@intake/BudgetBuilder'
import { SequencingControl } from '@intake/SequencingControl'
import { RothLever } from '@intake/RothLever'
import { HealthcareSheet } from '@intake/HealthcareSheet'
import { AssumptionPanel } from '@intake/AssumptionPanel'
import { medicareUnpriced } from './healthSheetChrome'
import { budgetGoverns } from '@budget/budgetModel'
import { commitBudgetPatch } from '@budget/budgetToSpending'
import { previewRunsInWorker, runControlPreview } from '@store/controlPreview'
import type { ScenarioDraft } from '@store/memoryModel'
import type { TwoArmControl } from '@shared/model'
import { copy } from './copy'
import { appModel } from './appModel'
import { Disclaimer } from './Disclaimer'
import { FuckOffDate } from './FuckOffDate'
import { ConfidenceStatement } from './ConfidenceStatement'
import { selectElevatedAnswer, resolvedFocusKey } from './answerView'
import type { ResaveCopyKey } from './unlockCopy'
import './styles/result.css'

/** The save slot's view + handlers — IntakeApp derives the view (resultSave.ts, the tested
 *  machine) and attaches the callbacks; this screen is dumb wiring over the six states. */
export type ResultSaveProp =
  | { readonly kind: 'none' }
  | { readonly kind: 'first'; readonly onKeep: () => void }
  | { readonly kind: 'clean' }
  | { readonly kind: 'dirty'; readonly onSave: () => void }
  | { readonly kind: 'saving' }
  | { readonly kind: 'failed'; readonly errorKey: ResaveCopyKey; readonly onRetry: () => void }

/** The re-offer backup DOOR (U8-tail) — present ONLY on a returning, WRITABLE session with no
 *  backup-note on record (IntakeApp owns that gating; this screen is dumb wiring). A quiet,
 *  subordinate line + CTA that opens the export step; absent (undefined) ⇒ no door at all. */
export type ResultBackupProp = { readonly onSave: () => void }

export function Result({
  onReview,
  save,
  backup,
  computing = false,
}: {
  readonly onReview: () => void
  readonly save: ResultSaveProp
  /** The re-offer backup door (U8-tail). Present ⇒ render the quiet subordinate line + CTA;
   *  undefined ⇒ no door. Withheld with the whole actions row while computing (an affordance
   *  we don't want used on a non-answer shouldn't exist — the same rule as the quiet doors). */
  readonly backup?: ResultBackupProp
  /** True while NOTHING has ever resolved (answer 'idle'/'pending' — the "Working it out…"
   *  window). The whole actions row is withheld: the actions act on an answer that isn't
   *  there yet, and an affordance we don't want used shouldn't exist (Briggsy, 2026-07-02).
   *  The edit path is epoch-SAFE during a compute (memoryModel discards stale resolves), so
   *  this is a calm-affordance rule, not a data guard. `pending` is pre-first-resolve ONLY —
   *  the background final sharpen never re-hides the row — and a compute-error shows it
   *  (editing inputs is that failure's remedy). */
  readonly computing?: boolean
}) {
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // Retry re-runs the FINAL tier: the result screen only ever shows the crowned final answer, never a
  // provisional re-blank (a provisional re-fire would mint a higher epoch and supersede the final).
  const retry = useCallback(() => void appModel.recompute('final'), [])

  // The save slot's TRANSITION announcements (ultramode 2026-07-02). The slot swaps whole nodes
  // per state, so a `role='status'` that mounts already-populated may never announce (burned/045),
  // and the success badge is plain text — a screen-reader re-save was silent on both the start and
  // the landing of a durability transition. This persistent, always-mounted polite region (empty
  // until spoken into, clear-after-announce) owns both: →saving announces the pending line, and
  // saving→clean announces the badge. The FAILED arm stays with its own role='alert' (an alert
  // announces on insertion by design — routing it here too would double-speak it). Edit-back
  // clean (failed→clean with no save) is deliberately silent: no durability event occurred.
  // (The shared useLiveAnnouncer() hook — one callback-ref-bound live-region idiom, insight 060.)
  const announcer = useLiveAnnouncer()
  const prevSaveKind = useRef(save.kind)
  useEffect(() => {
    const prev = prevSaveKind.current
    prevSaveKind.current = save.kind
    if (save.kind === prev) return
    if (save.kind === 'saving') announcer.announce(copy.resavePending)
    else if (save.kind === 'clean' && prev === 'saving') announcer.announce(copy.savedBadge)
  }, [save.kind, announcer])

  const elevated = selectElevatedAnswer(snapshot, retry)
  const focusKey = resolvedFocusKey(elevated)

  // U9b — the ONE deepening door (council 2026-07-02, Q1/R8): a quiet affordance on the landed
  // answer opens the budget-builder sheet; a governing budget re-words the same door. Offered only
  // on a RESOLVED reading (focusKey is defined exactly then) — the budget deepens an answer, and
  // an affordance we don't want used on a non-answer shouldn't exist.
  const [budgetOpen, setBudgetOpen] = useState(false)
  const governs = budgetGoverns(snapshot.draft.budget)

  // P3·U10 — the two control doors (R9/R11: quiet, invited, never a badge). GATING LAW:
  //  - sequencing: a resolved reading + ≥1 entered account (an order over zero accounts is inert);
  //  - the Roth door: a resolved reading + CATEGORICAL facts only — filing status, never a
  //    personalized bracket/balance computation (plan §U10 teaser law; the $0-pre-tax case gets
  //    the lever's own calm closed face, so even that read stays out of the door predicate).
  const [sequencingOpen, setSequencingOpen] = useState(false)
  const [rothOpen, setRothOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const rothApplied = snapshot.draft.rothConversion
  // P3·U11 — the Healthcare door's domain (categorical, fact-presence only) is the ENGINE's own
  // priced-healthcare gate (healthcarePriced — single-sourced with buildOverlay; council
  // 2026-07-03: no hollow door). The post-65-only household instead gets the verdict-level
  // unpriced-Medicare disclosure, threaded to BOTH hero surfaces + the Roth lever below.
  const healthPriced = healthcarePriced(snapshot.draft)
  const medicareGap = medicareUnpriced(snapshot.draft.people)
  const enhancedApplied = snapshot.draft.enhancedSubsidies === true
  // The wire's per-year healthcare series (spine headline runs only — presence-keyed).
  const healthReadout =
    snapshot.answer.kind === 'headline' ? snapshot.answer.result.distribution.healthReadout : undefined
  // The date route's preview anchor: the CROWNED lifestyle offset (the plan the answer named);
  // undefined (⇒ preview withheld) when no date crowned or on the spine route (unused there).
  const crownedOffset =
    snapshot.answer.kind === 'date' &&
    snapshot.answer.outcome.kind === 'dates' &&
    'offsetYears' in snapshot.answer.outcome.lifestyle
      ? snapshot.answer.outcome.lifestyle.offsetYears
      : undefined
  // The preview runner the sheets inject: params from the CURRENT draft (never a render-captured
  // copy going stale mid-sheet — composed per call), the household's one CRN seed, latest-wins.
  const runPreview = useCallback(
    (control: TwoArmControl) => {
      const { draft } = appModel.getSnapshot()
      const params = buildControlPreviewParams(draft, crownedOffset)
      if (params === null || draft.seed === undefined) return null
      return runControlPreview(params, draft.seed, control)
    },
    [crownedOffset],
  )
  // Apply/escape recompute provisional→final (the decrypt-on-return fast-show precedent): the
  // provisional lands quickly under the thinking-breathe, the final sharpens in the background.
  const recomputeBoth = useCallback(async () => {
    await appModel.recompute('provisional')
    await appModel.recompute('final')
  }, [])

  // U12 — the AssumptionPanel's ONE commit seam: apply the mutate atomically (it reads the
  // store's CURRENT draft inside the update — insight 036, never a render-captured copy),
  // then the ROUTE-AWARE recompute (the ratified F6 policy): SPINE → 'final' ONLY (the
  // spine's two tiers are byte-identical, so a provisional re-fire is pure waste); DATE →
  // the recomputeBoth cadence (provisional lands fast, the final sharpens behind it). The
  // route is read AFTER the update — panel edits can't change workStatus, but the draft the
  // recompute serves is the committed one.
  const commitAssumptionEdit = useCallback(
    (mutate: (d: ScenarioDraft) => ScenarioDraft) => {
      appModel.update(mutate)
      if (isDateRoute(appModel.getSnapshot().draft)) void recomputeBoth()
      else void appModel.recompute('final')
    },
    [recomputeBoth],
  )

  // U12 ultramode — the modal-ownership signal, threaded two ways: (1) `sheetOpen` to both
  // heroes (suppress the landing focus grab + the sharpen announce while a sheet/panel owns
  // focus and AT — an in-panel edit can demote → re-resolve → REMOUNT a hero behind the open
  // aria-modal); (2) `restoreToAssumptionsDoor` to every sheet as the close-time focus
  // fallback for the via-panel route (the panel's Edit row unmounts with the panel, so the
  // sheet's captured owner is disconnected by close time — without a fallback focus strands
  // on <body>). The Assumptions door is the honest landmark: it is the surface the user came
  // through, and it stays reachable in every post-resolve state (the hatch gate below).
  const sheetOpen = budgetOpen || sequencingOpen || rothOpen || healthOpen || assumptionsOpen
  const restoreToAssumptionsDoor = useCallback(
    () => document.querySelector<HTMLElement>('[data-door="assumptions"]'),
    [],
  )

  // U12 — the Assumptions door's gate (F4: it takes the Review door's quiet-row seat; count
  // stays 5). THIS DOOR GATES DIFFERENTLY FROM ITS SIBLINGS, deliberately (3-controls.md:243):
  // every other door gates on `focusKey` and so VANISHES exactly while the answer is
  // indeterminate / inputs-incomplete — but the escape hatch is the way BACK from those
  // states, so it must stay reachable there: a resolved reading (focusKey), the store's
  // post-first-resolve `inputs-incomplete` demotion, the post-first-resolve fallback arms
  // (a date input-failure / an indeterminate headline — the strip is showing, the hero fell
  // back), AND compute-error (its comment above names editing inputs as the remedy — a
  // remedy needs its door; the old Review button was unconditional here). While computing
  // (pre-first-resolve) it is withheld with the whole row, the existing law.
  const hatchReachable =
    focusKey !== undefined ||
    snapshot.answer.kind === 'inputs-incomplete' ||
    snapshot.answer.kind === 'compute-error' ||
    (elevated.kind === 'fallback' &&
      (snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date'))

  // The completion actions (save slot + the ONE budget door + the quiet return), built once.
  // On a RESOLVED date/spine answer they are SEATED in the surface's left reading column (the
  // two-pane grid tucks them under the words instead of stranding them centered below both panes
  // — the scroll + dead-lower-left fix, Briggsy 2026-07-02); on the fallback/pending answer (no
  // two-pane) they render below as before. Withheld entirely while computing (the actions act on
  // an answer that isn't there yet).
  const seatInLead = focusKey !== undefined && (elevated.kind === 'date' || elevated.kind === 'spine')
  const actionsNode = computing ? null : (
    <div className="result-actions">
      {/* The save slot: one reserved box across all five populated states (insight 035 — the
        Review button below must never shift under a pointer when a click swaps CTA→pending→
        badge). 'none' renders no slot at all: no claim about a disk state that can't be
        compared, and no reserved emptiness on the never-saveable answer. */}
      {save.kind !== 'none' && (
        <div className="result-save-slot">
          {save.kind === 'first' && (
            <div className="result-keep">
              <button type="button" className="btn-primary" onClick={save.onKeep}>
                {copy.saveCta}
              </button>
              <p className="result-keep__hint">{copy.saveCtaHint}</p>
            </div>
          )}
          {save.kind === 'dirty' && (
            <div className="result-keep">
              <button type="button" className="btn-primary" onClick={save.onSave}>
                {copy.resaveCta}
              </button>
              <p className="result-keep__hint">{copy.resaveHint}</p>
            </div>
          )}
          {save.kind === 'saving' && (
            // Announced by the persistent region above (a status inserted already-populated may
            // not fire, burned/045) — this node is the VISIBLE pending line only.
            <p className="result-save-pending">{copy.resavePending}</p>
          )}
          {save.kind === 'failed' && (
            <div className="result-keep">
              <p className="result-save-error" role="alert">
                {copy[save.errorKey]}
              </p>
              {save.errorKey === 'saveErrorReadOnly' ? (
                // The read-only refusal is NON-transient: `secondTab` is captured once at unlock
                // and never re-probed, so a retry deterministically re-refuses — the primary
                // action must match the copy's own instruction (RELOAD), never a "Try again"
                // that can't succeed (the RestoreFlow vault-exists arm's law; ultramode
                // 2026-07-02 — 7 lenses converged on this exact lying-remedy shape).
                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                  {copy.restoreRetry}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={save.onRetry}>
                  {copy.exportRetry}
                </button>
              )}
            </div>
          )}
          {save.kind === 'clean' && (
            <p className="result-saved">
              <span className="result-saved__mark" aria-hidden="true" />
              {copy.savedBadge}
            </p>
          )}
        </div>
      )}
      {/* The re-offer backup door (U8-tail): a QUIET, subordinate durability affordance — the
          plan is already saved to this device (the slot above says so); this only offers the
          off-device second copy when none is on record. Lead states the fact, then a quiet button;
          it reads under the verdict, never a primary CTA, never color-only. */}
      {backup !== undefined && (
        <div className="result-backup-door">
          <p className="result-backup-door__lead">{copy.backupDoorLead}</p>
          <button type="button" className="btn-quiet" onClick={backup.onSave}>
            {copy.backupDoorCta}
          </button>
        </div>
      )}
      {/* The IN-FRAME R13 disclaimer (council 2026-07-08, "buttons drop below" — Briggsy's fork
          call): DOM-ordered ABOVE the quiet doors, so the doors are always the LAST thing any
          overflow pushes past the fold — never the honesty caveat (the Hawk's veto; the trailing
          App mount is the structural first casualty). Visible ONLY at the laptop two-pane, where
          app.css hides the trailing mount; display:none below that width — the phone renders
          byte-identically (same words, one visible mount, Disclaimer.tsx has the contract). */}
      <Disclaimer inFrame />
      {/* The quiet doors: the sanctioned below-fold flex (the --laptop-fit-height degrade
          contract, tokens.css). display:contents in single column — the stack renders exactly as
          before; at the laptop two-pane the whole actions chain unwraps (display:contents) and
          this row seats as the grid's LAST full-width row, below both panes and below the
          in-frame disclaimer — one flick away, never crowding the answer. */}
      <div className="result-quiet-row">
        {focusKey !== undefined && (
          <button type="button" className="btn-quiet" onClick={() => setBudgetOpen(true)}>
            {governs ? copy.budgetEditCta : copy.budgetCta}
          </button>
        )}
        {focusKey !== undefined && snapshot.draft.enteredAccounts.length > 0 && (
          <button type="button" className="btn-quiet" onClick={() => setSequencingOpen(true)}>
            {snapshot.draft.drawdownPolicy === 'proportional'
              ? copy.leverSequencingCta
              : copy.leverSequencingEditCta}
          </button>
        )}
        {focusKey !== undefined && snapshot.draft.filing === 'mfj' && (
          <button type="button" className="btn-quiet" onClick={() => setRothOpen(true)}>
            {rothApplied === undefined ? copy.leverRothDoorCta : copy.leverRothDoorEditCta}
          </button>
        )}
        {focusKey !== undefined && healthPriced && (
          <button type="button" className="btn-quiet" onClick={() => setHealthOpen(true)}>
            {enhancedApplied ? copy.leverHealthDoorEditCta : copy.leverHealthDoorCta}
          </button>
        )}
        {/* U12 (F4): the Assumptions door in the Review door's old seat — door count stays 5,
            the quiet row stays the grid's LAST full-width row (the vertical-fit contract is
            untouched). Gated by `hatchReachable`, NOT bare focusKey — see the gate above for
            why this one door must survive indeterminate/incomplete. The guided re-walk
            (`onReview`) now lives INSIDE the panel. */}
        {hatchReachable && (
          <button
            type="button"
            className="btn-quiet"
            data-door="assumptions"
            onClick={() => setAssumptionsOpen(true)}
          >
            {copy.assumptionDoorCta}
          </button>
        )}
      </div>
    </div>
  )

  // The committed answer's recompute tier, mirrored below as `data-answer-tier` — the vertical-fit
  // gate's REAL final-tier synchronization (e2e/vertical-fit.spec.ts waits for "final" before any
  // measurement; a class-absence wait was proven vacuous by the gate's adversarial review). Absent
  // until a verdict has committed — exactly when there is no frame worth measuring.
  const answerTier =
    snapshot.answer.kind === 'headline' || snapshot.answer.kind === 'date'
      ? snapshot.answer.tier
      : undefined

  return (
    // data-inframe-disclaimer mirrors the actions row EXACTLY (withheld while computing): app.css
    // hides the page-trailing disclaimer behind it at the laptop tier, so a frame with no visible
    // disclaimer is unrepresentable — the trailing mount stands whenever the in-frame one is out.
    <main className="result" data-inframe-disclaimer={computing ? undefined : true} data-answer-tier={answerTier}>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="result-hero">
        {elevated.kind === 'date' && (
          <FuckOffDate
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
            medicareUnpricedNote={medicareGap}
            sheetOpen={sheetOpen}
          />
        )}
        {elevated.kind === 'spine' && (
          <ConfidenceStatement
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
            medicareUnpricedNote={medicareGap}
            sheetOpen={sheetOpen}
          />
        )}
        {elevated.kind === 'fallback' && (
          <AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />
        )}
      </div>
      {!seatInLead && actionsNode}
      <BudgetBuilder
        open={budgetOpen}
        draft={snapshot.draft}
        onApply={(items) => {
          // The atomic reconciliation patch — the OOP figure reads the store's CURRENT draft
          // inside the update (insight 036), never a render-captured copy.
          appModel.update((d) => ({ ...d, ...commitBudgetPatch(items, d.health.oopMedicalAnnual) }))
          setBudgetOpen(false)
          void recomputeBoth()
        }}
        onEscape={() => {
          // Back to a single number: budget → strictly-undefined; the scalar keeps its last
          // reconciled value (build-gate 2 — never `budget: []`).
          appModel.update((d) => ({ ...d, budget: undefined }))
          setBudgetOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setBudgetOpen(false)}
        restoreFallback={restoreToAssumptionsDoor}
      />
      <SequencingControl
        open={sequencingOpen}
        draft={snapshot.draft}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        restoreFallback={restoreToAssumptionsDoor}
        onApply={(policy, order) => {
          // ONE atomic write maintains the 'custom'⟺order biconditional (the codec re-proves it
          // at Save; validateParams re-proves it at every run — the two-gate rule's write half).
          appModel.update((d) => {
            const { drawdownOrder: _order, ...rest } = d
            return { ...rest, drawdownPolicy: policy, ...(order !== undefined ? { drawdownOrder: order } : {}) }
          })
          setSequencingOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setSequencingOpen(false)}
      />
      <RothLever
        open={rothOpen}
        draft={snapshot.draft}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        medicareUnpricedNote={medicareGap}
        restoreFallback={restoreToAssumptionsDoor}
        onApply={(plan) => {
          appModel.update((d) => ({ ...d, rothConversion: plan }))
          setRothOpen(false)
          void recomputeBoth()
        }}
        onRemove={() => {
          // Strip the KEY (absence ≡ no conversions ≡ reduce-to-spine — never an undefined-valued
          // slot a JSON write would null, DND/009).
          appModel.update((d) => {
            const { rothConversion: _plan, ...rest } = d
            return rest
          })
          setRothOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setRothOpen(false)}
      />
      <HealthcareSheet
        open={healthOpen}
        draft={snapshot.draft}
        readout={healthReadout}
        preview={runPreview}
        previewBlocking={!previewRunsInWorker()}
        restoreFallback={restoreToAssumptionsDoor}
        onApply={(enhanced) => {
          // THE SINGLE-KEY WRITE FENCE (insight 058): exactly one key moves — set the literal
          // `true`, or STRIP the key entirely (absence ≡ the statutory reverted regime — never
          // `false`, DND/009's strip-the-key discipline; the codec rejects a persisted false).
          appModel.update((d) => {
            const { enhancedSubsidies: _regime, ...rest } = d
            return enhanced ? { ...rest, enhancedSubsidies: true } : rest
          })
          setHealthOpen(false)
          void recomputeBoth()
        }}
        onClose={() => setHealthOpen(false)}
      />
      {/* U12 — the AssumptionPanel mounts at RESULT level, outside the hero swap (supersession
          #6): it exists over the fallback strip too, so the escape hatch stays real exactly
          where the hero has fallen back to incomplete. Via-sheet rows close this panel and
          open the fact's ONE editor home (insight 058 — never a duplicate editor). */}
      <AssumptionPanel
        open={assumptionsOpen}
        snapshot={snapshot}
        missing={missing}
        onCommitEdit={commitAssumptionEdit}
        onOpenBudget={() => {
          setAssumptionsOpen(false)
          setBudgetOpen(true)
        }}
        onOpenSequencing={() => {
          setAssumptionsOpen(false)
          setSequencingOpen(true)
        }}
        onOpenRoth={() => {
          setAssumptionsOpen(false)
          setRothOpen(true)
        }}
        onOpenHealth={() => {
          setAssumptionsOpen(false)
          setHealthOpen(true)
        }}
        onReview={() => {
          setAssumptionsOpen(false)
          onReview()
        }}
        onClose={() => setAssumptionsOpen(false)}
      />
    </main>
  )
}
