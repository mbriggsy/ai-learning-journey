import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { copy, slots, type CopyKey } from '@ui/copy'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { createAnnouncer, useFocusHeadingOnStep, type Announcer } from './a11y'
import { validateDraft, type FieldPath, type SanityViolation } from './sanity'
import './intake.css'

/**
 * The intake flow shell (D1 — the U5 reshape's step machine). Owns:
 *  - the step sequence + direction state (forward enters from the right, Back
 *    reverses — direction encodes meaning);
 *  - ENTER-ONLY motion: the outgoing step UNMOUNTS instantly (never
 *    visibility-hidden — `.focus()` must take on the incoming heading,
 *    ai-journey-stats/006) and the incoming step animates via @starting-style
 *    CSS transitions — interruptible by construction, no keyframe restarts;
 *    `prefers-reduced-motion` drops the slide, keeps a fast opacity fade
 *    (intake.css owns both);
 *  - focus-to-heading on every step change (the heading IS the announcement);
 *  - the ONE polite live region (clear-after-announce, burned/045) carrying
 *    only the SR position — never the question text (no double-announce);
 *  - the quiet progress thread (fill proportion, never hue; no visible
 *    "Step N of M" — the flow is variable-length; SR gets the position via
 *    progressbar semantics + the announce);
 *  - validation TIMING (attempt-to-advance here; field blur via
 *    `commitField`; never per keystroke) over sanity.ts's pure rules — Back is
 *    never gated, and back-nav preserves every answer because steps read/write
 *    the single memoryModel draft (no per-step local copy to lose);
 *  - the question-COMMIT recompute trigger (model.recompute() on advance —
 *    cross-cutting #6).
 */

export interface StepApi {
  readonly draft: ScenarioDraft
  readonly update: MemoryModel['update']
  /** Blur-time per-field commit: marks the field touched so its rules may fire. */
  readonly commitField: (field: FieldPath) => void
  /** Re-edit forgiveness: drop a field's touched state so its error clears the
   *  instant the user starts fixing it (re-validated on blur/advance). */
  readonly clearTouched: (field: FieldPath) => void
  /** Violations currently attached to a field (touched-aware). */
  readonly violationsFor: (field: FieldPath) => readonly SanityViolation[]
}

export interface StepDef {
  readonly id: string
  readonly headingKey: CopyKey
  /** The fields this step owns — touched + validated on attempt-to-advance. */
  readonly fields: readonly FieldPath[]
  readonly render: (api: StepApi) => ReactNode
}

export interface IntakeFlowProps {
  readonly steps: readonly StepDef[]
  readonly model: MemoryModel
  /** Fired after the LAST step advances cleanly (slice (e): the account-set-
   *  complete boundary → the final-tier recompute). */
  readonly onComplete?: () => void
  /** The provisional answer surface, rendered between the header and the step
   *  (cross-cutting #6: the confidence surface CO-EXISTS with intake). */
  readonly answerSlot?: ReactNode
}

export function IntakeFlow({ steps, model, onComplete, answerSlot }: IntakeFlowProps) {
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [touched, setTouched] = useState<ReadonlySet<FieldPath>>(() => new Set())

  // Conditional steps derive from the draft (work-status / age gates), so a
  // back-nav edit can SHRINK the sequence while we're standing past the cut —
  // clamp rather than crash (the draft keeps every answer regardless).
  const safeIndex = Math.min(index, steps.length - 1)
  const step = steps[safeIndex]
  if (step === undefined) throw new Error('intake flow: empty step list')

  const headingRef = useFocusHeadingOnStep(step.id)

  // The one polite live region (burned/045 clear-after-announce).
  const liveRef = useRef<HTMLDivElement | null>(null)
  const announcerRef = useRef<Announcer | null>(null)
  useEffect(() => {
    if (liveRef.current !== null) announcerRef.current = createAnnouncer(liveRef.current)
  }, [])

  const violations = useMemo(
    () => validateDraft(snapshot.draft, touched),
    [snapshot.draft, touched],
  )

  const commitField = useCallback((field: FieldPath) => {
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)))
  }, [])

  const clearTouched = useCallback((field: FieldPath) => {
    setTouched((prev) => {
      if (!prev.has(field)) return prev
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }, [])

  const violationsFor = useCallback(
    (field: FieldPath) => violations.filter((v) => v.field === field),
    [violations],
  )

  const advance = useCallback(() => {
    // Attempt-to-advance: this step's fields become touched, then its rules
    // gate the move. Rules whose inputs are absent simply don't fire — an
    // unanswered-but-required fact reaches the engine as a burned/062 sentinel
    // and renders indeterminate, never a hard wall here.
    const nextTouched = new Set(touched)
    for (const f of step.fields) nextTouched.add(f)
    setTouched(nextTouched)
    // Validate against the model's CURRENT draft, not this render's closure: a
    // blur-commit and the Continue tap can land in the same task (programmatic
    // dispatch, exotic browsers), and the closure would be one commit stale —
    // letting an unconfirmed value slip past its gate.
    const blocking = validateDraft(model.getSnapshot().draft, nextTouched).some((v) =>
      step.fields.includes(v.field),
    )
    if (blocking) return

    if (safeIndex + 1 < steps.length) {
      setDirection('forward')
      setIndex(safeIndex + 1)
      announcerRef.current?.announce(slots.questionPosition(safeIndex + 2))
      void model.recompute() // question-COMMIT refire, never per keystroke
    } else {
      // The terminal advance delegates SOLELY to onComplete (the final-tier
      // recompute). A trailing provisional recompute here would mint a HIGHER
      // epoch and supersede the crowned final-tier date — the 2k provisional
      // would win over the 16k final and render the uncrowned tier (D1 review).
      onComplete?.()
    }
  }, [safeIndex, model, onComplete, step.fields, steps.length, touched])

  const back = useCallback(() => {
    if (safeIndex === 0) return
    setDirection('back')
    setIndex(safeIndex - 1) // never gated; the draft keeps every downstream answer
    announcerRef.current?.announce(slots.questionPosition(safeIndex))
  }, [safeIndex])

  const api: StepApi = useMemo(
    () => ({ draft: snapshot.draft, update: model.update, commitField, clearTouched, violationsFor }),
    [snapshot.draft, model.update, commitField, clearTouched, violationsFor],
  )

  return (
    <div className="intake-shell">
      <header className="intake-header">
        <span className="intake-wordmark">{copy.appTitle}</span>
        <div
          className="progress-thread"
          role="progressbar"
          aria-label={copy.flowProgressLabel}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={safeIndex + 1}
        >
          <div
            className="progress-thread-fill"
            style={{ width: `${((safeIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </header>

      {answerSlot}

      {/* Keyed by step id: the outgoing step unmounts instantly; the incoming
          one enters via @starting-style (opacity-only when motion is reduced). */}
      <section key={step.id} className="intake-step" data-direction={direction}>
        <h2 className="step-heading" tabIndex={-1} ref={headingRef}>
          {copy[step.headingKey]}
        </h2>
        <div className="step-body">{step.render(api)}</div>
        <nav className="intake-nav">
          <button type="button" className="btn-primary" onClick={advance}>
            {copy.flowNext}
          </button>
          {safeIndex > 0 && (
            <button type="button" className="btn-quiet" onClick={back}>
              {copy.flowBack}
            </button>
          )}
        </nav>
      </section>

      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  )
}
