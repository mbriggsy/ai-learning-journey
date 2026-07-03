/*
 * src/ui/Result.tsx — D2 the landed magic moment (the result screen).
 *
 * On intake completion the quiet provisional AnswerStrip gives way to the ELEVATED state-adaptive
 * lead: the {@link FuckOffDate} hero for a still-working household, the {@link ConfidenceStatement}
 * for an all-retired one ({@link selectElevatedAnswer} owns the routing — the choice is the answer the
 * engine already crowned, never a re-derivation). A calm "review" path returns to the intake with
 * every answer preserved (the draft lives in the one `appModel`; nothing is persisted — U8 owns Save).
 *
 * CALM RENDERING (back-nine-design §3): the figures are STATIC and each surface owns its own
 * @starting-style reveal + reduced-motion fallback; this container adds NO theatrics — it only gives
 * the hero room to breathe and seats the quiet return. The hero heading takes focus once on landing
 * (resolvedFocusKey → the surface's focusSignal), the magic-moment announce.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnswerStrip } from '@intake/AnswerStrip'
import { buildControlPreviewParams, missingRequiredFacts } from '@intake/intakeMap'
import { createAnnouncer, type Announcer } from '@intake/a11y'
import { BudgetBuilder } from '@intake/BudgetBuilder'
import { SequencingControl } from '@intake/SequencingControl'
import { RothLever } from '@intake/RothLever'
import { budgetGoverns } from '@budget/budgetModel'
import { commitBudgetPatch } from '@budget/budgetToSpending'
import { runControlPreview } from '@store/controlPreview'
import type { TwoArmControl } from '@shared/model'
import { copy } from './copy'
import { appModel } from './appModel'
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

export function Result({
  onReview,
  save,
  computing = false,
}: {
  readonly onReview: () => void
  readonly save: ResultSaveProp
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
  // (The liveRef+forwarder idiom's 5th site — the filed useLiveAnnouncer() advisory covers all.)
  const liveRef = useRef<HTMLDivElement | null>(null)
  const announcerRef = useRef<Announcer | null>(null)
  useEffect(() => {
    if (liveRef.current) announcerRef.current = createAnnouncer(liveRef.current)
  }, [])
  const prevSaveKind = useRef(save.kind)
  useEffect(() => {
    const prev = prevSaveKind.current
    prevSaveKind.current = save.kind
    if (save.kind === prev) return
    if (save.kind === 'saving') announcerRef.current?.announce(copy.resavePending)
    else if (save.kind === 'clean' && prev === 'saving') announcerRef.current?.announce(copy.savedBadge)
  }, [save.kind])

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
  const rothApplied = snapshot.draft.rothConversion
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
      {/* The quiet pair rides ONE transparent wrapper (display:contents in single column — the
          stack renders exactly as before) that becomes a centered ROW at the laptop two-pane,
          buying back 60px of the fit-one-frame vertical budget (result.css .result-quiet-row). */}
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
        <button type="button" className="btn-quiet" onClick={onReview}>
          {copy.resultReview}
        </button>
      </div>
    </div>
  )

  return (
    <main className="result">
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <div className="result-hero">
        {elevated.kind === 'date' && (
          <FuckOffDate
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
          />
        )}
        {elevated.kind === 'spine' && (
          <ConfidenceStatement
            view={elevated.view}
            focusSignal={focusKey}
            actionsSlot={seatInLead ? actionsNode : undefined}
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
      />
      <SequencingControl
        open={sequencingOpen}
        draft={snapshot.draft}
        preview={runPreview}
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
    </main>
  )
}
