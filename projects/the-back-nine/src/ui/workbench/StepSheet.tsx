/*
 * src/ui/workbench/StepSheet.tsx — one step of the guided walk, opened over the plan from the facts page (Act 5,
 * U8; R14, R15).
 *
 * The walk's steps are the existing editors for every household fact (`intakeSteps`, `src/intake/questions.tsx`),
 * and each body depends only on its `StepApi`. So a facts-page door opens the step's OWN body in a sheet, over the
 * walk's own `StepApi` (`useStepApi`, `src/intake/flow.tsx`): each edit goes through that body's own write path
 * and its reconciliation (the out-of-pocket step's budget re-reconcile, the work step's zeroing, W's writers), and
 * the facts page never grows a second writer of any value (insight 058).
 *
 * DONE IS THE WALK'S CONTINUE: the field under focus commits first (a text field commits on blur, and the sheet
 * would otherwise end before the press's blur lands), then the step's fields become touched and its rules run on the
 * model's CURRENT draft (`continueCheck`, insight 036); if one fires, the sheet stays open showing the error. DISMISS
 * (Escape, the backdrop) closes where nothing this edit changed is refused: the field under focus commits first too,
 * then `discardOnBack` runs as in the walk. Where the step's own Continue would refuse what this edit changed, a
 * dismiss stays open and shows why, as Done does: a refused value never leaves the sheet (the panel's
 * `commitRefusing` refuses before it writes, and nothing downstream re-checks), and finished work in the same step is
 * never put back with no word (round 3 of the milestone-1 review: an account just added went with a refused one).
 * The provenance is the panel's (`periodConfirmed: true`, `PANEL_PROVENANCE`): this sheet exists only after the
 * answer, and completing the walk is the receipt that the spend period was answered.
 *
 * EVERY WAY THE SHEET ENDS ENDS THE EDIT THE SAME WAY (Done, dismiss, the host's page change, the room unmounting under
 * it, the step leaving the walk): a draft the step's own Continue would refuse goes back to the draft at open (a walk
 * step hosted outside the walk has no later Continue; Done and dismiss never close on one, so only a page change or an
 * unmount reaches it, and a leave ask over it says the step goes back), the discard rule, then, if the draft moved at ANY point while
 * the sheet was open, the route-aware recompute (`recomputeAfterEdit`, the panel's cadence), so the pinned answer and the table redraw once
 * per edit, never per field. Never "differs at the close": an edit put back to its value at open can have sent a
 * recompute in flight whose final reads the live draft, and the shown answer would describe the draft the household
 * undid (U8's review, A3). Once the edit has ended, the body's writes are inert through the sheet's exit, so no write
 * lands with no recompute behind it. While the draft differs from the draft at open, the sheet holds the
 * unsaved-buffer guard (`useUnsavedBufferHold`): a Back press asks first (IntakeApp's popstate handler; insight 112).
 *
 * A PAGE CHANGE ENDS THE EDIT THROUGH THE SHEET, never by unmounting it (`endRef`, the host's): the field under focus
 * commits first, as on Done and dismiss (the ending's own cleanup runs after the body has gone, where a blur reaches
 * nothing), then the refusal check, then the close. Unlike dismiss it never stays, for an open entry or a refusal: a
 * leave's Go says an entry not yet added is dropped, and over a refused edit that the step goes back (`putsBack`,
 * which the host reads to word its ask); a plain page move only comes when nothing is held.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ControlSheet } from '@intake/controlSheet'
import { useStepApi } from '@intake/flow'
import { continueCheck, discardRefusedOnLeave, type StepDef } from '@intake/stepChecks'
import { useUnsavedBufferHold } from '@intake/unsavedBuffer'
import type { Announcer } from '@intake/a11y'
import type { FieldPath } from '@intake/sanity'
import { draftIdentityKey, type MemoryModel, type ScenarioDraft } from '@store/memoryModel'
import { recomputeAfterEdit } from '../recompute'
import { copy } from '../copy'

/** The sheet's provenance: post-answer, like the AssumptionPanel's. */
const PERIOD_CONFIRMED = true

/** An entry open inside a step's body, whose own buttons are its only ways out (the walk hides its nav for them). */
const OPEN_ENTRY = '.account-entry, .income-entry, .budget-inline'

export interface StepSheetProps {
  readonly model: MemoryModel
  /** The step to open (resolved from the draft's CURRENT walk by the host), or null: closed. */
  readonly step: StepDef | null
  /** The facts page's section title for the step (a noun, never the walk's question). */
  readonly title: string
  /** Close the sheet: the host drops its open step. Every ending of the edit runs on that transition. */
  readonly onClose: () => void
  /** Where focus lands on close when the opening door has unmounted (re-queried at close). */
  readonly restoreFallback: () => HTMLElement | null
  /** Set while a step is open to the sheet's own ending for a page change; null while closed. The host calls `end`
   *  instead of dropping its open step, and asks `putsBack` to word a leave ask over it. */
  readonly endRef?: MutableRefObject<StepEnding | null>
}

/** The open sheet's ending, for its host. `end`: commit the focused field, put a refused draft back, close.
 *  `putsBack`: whether that ending would put the step back (this edit moved the draft and the step's Continue refuses
 *  it), so a leave ask over the sheet never says "changes you finished stay" where they would not. */
export interface StepEnding {
  readonly end: () => void
  readonly putsBack: () => boolean
}

/** This edit moved the draft, and the step's own Continue would refuse it. Only then does an ending put the step back:
 *  a baseline is never rewritten over itself. */
function refusedEdit(model: MemoryModel, step: StepDef, touched: ReadonlySet<FieldPath>, baseline: ScenarioDraft): boolean {
  if (draftIdentityKey(model.getSnapshot().draft) === draftIdentityKey(baseline)) return false
  return continueCheck(model, step, touched, PERIOD_CONFIRMED).blocked
}

/** A draft the step's own Continue would refuse goes back to the draft at open (a walk step hosted outside the walk has
 *  no later Continue: `docs/landmines.md`). */
function restoreIfRefused(model: MemoryModel, step: StepDef, touched: ReadonlySet<FieldPath>, baseline: ScenarioDraft): void {
  if (refusedEdit(model, step, touched, baseline)) model.update(() => baseline)
}

export function StepSheet({ model, step, title, onClose, restoreFallback, endRef }: StepSheetProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const { api, touched, setTouched } = useStepApi(model, { periodConfirmed: PERIOD_CONFIRMED })
  const openId = step?.id ?? null

  // The edit's baseline, captured on the open edge (render-phase, so the first open frame never compares against
  // a stale prior open), with a fresh touched set: errors show only for what THIS sheet's session touched.
  const [session, setSession] = useState<{ readonly id: string | null; readonly atOpen: ScenarioDraft | null }>({
    id: null,
    atOpen: null,
  })
  if (openId !== session.id) {
    setSession({ id: openId, atOpen: openId === null ? null : model.getSnapshot().draft })
    if (openId !== null) setTouched(new Set())
  }
  const atOpen = session.id === openId ? session.atOpen : null
  const moved = atOpen !== null && draftIdentityKey(api.draft) !== draftIdentityKey(atOpen)
  useUnsavedBufferHold(moved)

  // Whether the draft moved at ANY point while open, and whether the edit has ended: both reset ONLY on the open edge
  // (a reset on close would clear them in the closing render, before the ending's cleanup reads them).
  const everMovedRef = useRef(false)
  const endedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  if (sessionIdRef.current !== openId) {
    sessionIdRef.current = openId
    if (openId !== null) {
      everMovedRef.current = false
      endedRef.current = false
    }
  }
  if (moved) everMovedRef.current = true
  // The body's own api: its writes are inert once the edit has ended (the exit animation keeps the body on screen).
  const bodyApi = useMemo(
    () => ({
      ...api,
      update: (mutate: Parameters<typeof api.update>[0]) => {
        if (!endedRef.current) api.update(mutate)
      },
    }),
    [api],
  )

  // What the edit's ending reads, kept current for the effect's cleanup (it runs after the render that closed it).
  const stepRef = useRef<StepDef | null>(step)
  if (step !== null) stepRef.current = step
  const touchedRef = useRef<ReadonlySet<FieldPath>>(touched)
  touchedRef.current = touched
  const atOpenRef = useRef<ScenarioDraft | null>(atOpen)
  if (atOpen !== null) atOpenRef.current = atOpen

  // THE ONE ENDING. Its cleanup runs when the open step changes or the sheet unmounts: on Done, on dismiss, when
  // the room unmounts under an open sheet, and when the step leaves the walk.
  useEffect(() => {
    if (openId === null) return
    return () => {
      const def = stepRef.current
      const baseline = atOpenRef.current
      if (def === null || def.id !== openId || baseline === null) return
      endedRef.current = true
      // An ending no close path ran first (the room unmounting under the sheet): the refusal check still holds.
      restoreIfRefused(model, def, touchedRef.current, baseline)
      discardRefusedOnLeave(model, def, touchedRef.current, PERIOD_CONFIRMED)
      const movedNow = draftIdentityKey(model.getSnapshot().draft) !== draftIdentityKey(baseline)
      if (everMovedRef.current || movedNow) recomputeAfterEdit(model)
    }
  }, [openId, model])

  // While an account or income entry, or the spending step's in-place budget builder, is open inside the body, the
  // walk hides its own Continue and Back (`intake.css`): the entry's own buttons are its only ways out, so typed work
  // is never dropped by a press meant for the step. The sheet mirrors that: Done is hidden the same way
  // (`workbench.css`) and a dismiss is ignored. A selector, never `unsavedBuffersHeld()`: that count holds this
  // sheet's own hold and other sheets' too.
  const bodyRef = useRef<HTMLDivElement>(null)
  /** Commit the field under focus: a text field commits on blur, synchronously (`fields.tsx`). */
  const commitFocused = () => {
    const active = document.activeElement
    if (active instanceof HTMLElement && bodyRef.current?.contains(active) === true) active.blur()
  }
  /** The host's page change: commit the focused field, put a refused draft back, close. */
  const end = () => {
    commitFocused()
    const baseline = atOpenRef.current
    if (step !== null && baseline !== null) restoreIfRefused(model, step, touchedRef.current, baseline)
    onClose()
  }
  const putsBack = (): boolean => {
    const baseline = atOpenRef.current
    return step !== null && baseline !== null && refusedEdit(model, step, touchedRef.current, baseline)
  }
  /** Escape, the backdrop, the close button. It never puts finished work back unasked: where the step's Continue would
   *  refuse what this edit changed, the sheet stays and shows why, as Done does (round 3 of the milestone-1 review: the
   *  whole step went back with no word, an account just added with it). The leave ask's Go is the one ending that puts
   *  a step back, and its words say so (`putsBack`). */
  const dismiss = () => {
    if (bodyRef.current?.querySelector(OPEN_ENTRY) != null) return
    commitFocused()
    if (step !== null && putsBack()) {
      setTouched(continueCheck(model, step, touchedRef.current, PERIOD_CONFIRMED).touched)
      return
    }
    end()
  }
  // The host's page change ends the edit here (see the header); kept current each commit, before the host's effects.
  useLayoutEffect(() => {
    if (endRef === undefined) return
    endRef.current = step !== null ? { end, putsBack } : null
  })
  useEffect(() => () => {
    if (endRef !== undefined) endRef.current = null
  }, [endRef])

  const done = () => {
    // Hidden while an entry is open (`workbench.css`); a press that reaches it anyway does nothing, as a dismiss.
    if (step === null || bodyRef.current?.querySelector(OPEN_ENTRY) != null) return
    commitFocused()
    const check = continueCheck(model, step, touched, PERIOD_CONFIRMED)
    setTouched(check.touched)
    if (check.blocked) return
    onClose()
  }

  return (
    <ControlSheet
      open={step !== null}
      title={title}
      onClose={dismiss}
      announcerRef={announcerRef}
      restoreFallback={restoreFallback}
    >
      {step !== null && (
        <div ref={bodyRef} className="wb-step-sheet__body step-body">
          {step.render(bodyApi)}
        </div>
      )}
      <div className="control-sheet__actions">
        <button type="button" className="btn-primary" onClick={done}>
          {copy.workbenchFactsDone}
        </button>
      </div>
    </ControlSheet>
  )
}
