/*
 * src/intake/BudgetBuilder.tsx — the U9b budget-builder sheet (council 2026-07-02, Q1/Q5).
 *
 * ONE DOOR, TWO MOUNTS. The builder is the single deepening surface for the itemized budget
 * (R8: the deepening of the single-total answer, never the on-ramp). The Result screen mounts it
 * behind the quiet "break down your spending" affordance; the governed spend question mounts the
 * SAME component behind its steer. Each mount owns its own commit semantics (Result → appModel +
 * an explicit recompute; intake → the flow's question-commit), so this component is presentational
 * + local state over props — it reads the draft it is given and calls out through onApply /
 * onEscape / onClose. It lives in the INTAKE layer deliberately: it is a form built from the
 * intake field primitives (commit-on-blur, format-on-blur, aria-wired), and ui→intake is the
 * established import direction (Result already mounts AnswerStrip).
 *
 * THE STRUCTURAL SHELL (Q5): opening the sheet persists NOTHING — `draft.budget` stays strictly
 * undefined until the first real Apply (build-gate 2: `[]` is never written; an empty Apply is the
 * escape/cancel, never an empty budget). The reduce-to-spine byte-identity is structural, not
 * arithmetic: no seeded line exists to double-count.
 *
 * THE RECONCILIATION READOUT (build-gate 1): the lines-target NETS the injected OOP medical —
 * target = max(0, S − M) — with the "carried automatically" disclosure, because compileBudget
 * re-adds M on top of typed lines (a target quoted at the raw S would commit S+M, the silently-
 * pessimistic answer jump). The readout sits ABOVE the line controls in a reserved box (insight
 * 035 — it re-renders on every commit and must never shuffle the tap targets below it).
 *
 * VALIDATION TIMING (R19 + insight 036): field edits commit on blur into LOCAL items state; a
 * line's errors show only once it is touched (or an Apply was attempted) — silent while typing,
 * checked on leave, forgiven on re-edit. Apply is the ONE commit seam: validate-before-mutate
 * (burned/021), aria-disabled with the announced reason while blocked (never a native disabled).
 * Local state survives close-without-apply (nothing lost, no drama); it re-seeds from the draft
 * on open only when no uncommitted edits are pending.
 *
 * OVERLAY CONTRACT (mirrors BandEnlargeModal): portaled to document.body (no transform ancestor
 * can trap the fixed backdrop), focus trapped, Escape closes (= cancel), focus restored to the
 * trigger after exit. Motion is a calm 24px rise + fade (transform/opacity only, CSP-clean, no
 * layout prop); reduced motion drops the movement — final state identical.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { copy, slots } from '@ui/copy'
import type { BudgetLineItem as BudgetLine } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { budgetGoverns, isRampedBudget, validateBudgetItems, isActiveAt } from '@budget/budgetModel'
import { anchorTarget } from '@budget/budgetToSpending'
import { createAnnouncer, focusHeading, type Announcer } from './a11y'
import { formatMoney } from './fields'
import { BudgetLineItem } from './BudgetLineItem'
import './budget.css'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** A fresh line: `other` + essentials (the neutral unclassified pick — errs STICKY, insight 055's
 *  conservative direction) with NO amount (NaN blocks Apply until typed — never a silent 0). */
const freshLine = (): BudgetLine => ({
  category: 'other',
  label: '',
  annualAmountReal: Number.NaN,
  tier: 'essentials',
  startYear: 0,
})

export interface BudgetBuilderProps {
  readonly open: boolean
  /** The live draft (the anchor scalar, the OOP-medical figure, the governing budget if any). */
  readonly draft: ScenarioDraft
  /** Commit a NON-EMPTY validated item list. The caller applies the atomic reconciliation patch
   *  (commitBudgetPatch) and owns its recompute semantics. */
  readonly onApply: (items: readonly BudgetLine[]) => void
  /** The "back to a single number" escape — the caller clears `budget` to undefined (the scalar
   *  keeps governing) and recomputes. Only reachable when a budget currently governs. */
  readonly onEscape: () => void
  /** Cancel / Escape key / backdrop — local edits persist for the session, nothing commits. */
  readonly onClose: () => void
}

export function BudgetBuilder({ open, draft, onApply, onEscape, onClose }: BudgetBuilderProps) {
  const reduce = useReducedMotion() ?? false
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  // Rows carry a CLIENT-SIDE stable id (never persisted): an index key would let React reuse a
  // removed neighbor's field state (the U8 same-tree-position leak), and an index-keyed touched
  // set would silently re-point at the wrong line after a removal.
  const nextIdRef = useRef(0)
  const mintRows = useCallback(
    (list: readonly BudgetLine[]): readonly { id: number; item: BudgetLine }[] =>
      list.map((item) => ({ id: nextIdRef.current++, item })),
    [],
  )
  const [rows, setRows] = useState<readonly { id: number; item: BudgetLine }[]>(() =>
    mintRows(draft.budget ?? []),
  )
  const [touched, setTouched] = useState<ReadonlySet<number>>(new Set())
  const [attempted, setAttempted] = useState(false)
  const dirtyRef = useRef(false)
  const items = useMemo(() => rows.map((r) => r.item), [rows])

  // The blocked-Apply announce region (clear-after-announce — the one live-region idiom).
  // The node lives INSIDE the open-gated portal, so a mount-time effect would bind null on
  // the app's real closed-at-mount shape and never re-run — the announce would be silently
  // dead in BOTH live mounts (Result, the governed spend step). A CALLBACK ref binds and
  // unbinds the announcer exactly when the node exists.
  const announcerRef = useRef<Announcer | null>(null)
  const bindLiveRegion = useCallback((node: HTMLDivElement | null) => {
    announcerRef.current = node === null ? null : createAnnouncer(node)
  }, [])

  // On OPEN: re-seed from the governing draft unless uncommitted local edits are pending (close-
  // without-apply preserves work); capture the focus owner; land focus on the sheet heading
  // (focus-to-heading — the established pattern; never an input, which pops the phone keyboard).
  useEffect(() => {
    if (!open) return
    if (!dirtyRef.current) {
      setRows(mintRows(draft.budget ?? []))
      setTouched(new Set())
      setAttempted(false)
    }
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    document.documentElement.classList.add('budget-sheet-open')
    focusHeading(headingRef.current)
    return () => {
      document.documentElement.classList.remove('budget-sheet-open')
    }
    // draft.budget is deliberately NOT a dep: re-seeding happens at the open EDGE only (a
    // mid-open draft change must never clobber in-progress local edits).
  }, [open, mintRows])

  const restoreFocus = useCallback(() => {
    const owner = restoreRef.current
    restoreRef.current = null
    if (owner !== null && owner.isConnected) owner.focus()
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (root === null) return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  const markDirty = () => {
    dirtyRef.current = true
  }
  const touchRow = (id: number) =>
    setTouched((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

  const setRow = (id: number, patch: Partial<BudgetLine>) => {
    markDirty()
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, item: { ...r.item, ...patch } } : r)))
  }
  const setRowEnd = (id: number, endYear: number | undefined) => {
    markDirty()
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        // ABSENT (never an undefined-valued key) is the lifelong encoding — DND/009 hygiene.
        const { endYear: dropped, ...rest } = r.item
        void dropped
        return { ...r, item: endYear === undefined ? rest : { ...rest, endYear } }
      }),
    )
  }
  const addLine = () => {
    markDirty()
    setRows((prev) => [...prev, { id: nextIdRef.current++, item: freshLine() }])
  }
  const removeRow = (id: number) => {
    markDirty()
    setRows((prev) => prev.filter((r) => r.id !== id))
    setTouched((prev) => new Set([...prev].filter((t) => t !== id)))
  }

  const validation = useMemo(() => validateBudgetItems(items), [items])
  const hasErrors = validation.errors.length > 0
  const governs = budgetGoverns(draft.budget)

  const apply = () => {
    if (items.length === 0) {
      // An empty Apply is never `budget: []` (build-gate 2): with a governing budget it is the
      // escape; with none it is simply a close (there is nothing to commit).
      if (governs) {
        dirtyRef.current = false
        onEscape()
      } else {
        onClose()
      }
      return
    }
    if (hasErrors) {
      setAttempted(true)
      announcerRef.current?.announce(copy.budgetApplyBlocked)
      return
    }
    dirtyRef.current = false
    setAttempted(false)
    onApply(items)
  }

  const escapeHatch = () => {
    // Just clear the dirty latch and call out — the parent's onEscape closes the sheet in the
    // SAME click batch, so any local setRows/setTouched here would be batched away unrendered and
    // the open-edge effect re-seeds on the next open regardless (the resets were dead; ultramode
    // 2026-07-02 nit). The dirtyRef clear is the one durable effect: it lets that re-seed run.
    dirtyRef.current = false
    onEscape()
  }

  // The reconciliation figures (build-gate 1). S may be genuinely absent on a defensive mount —
  // the readout simply withholds its anchor lines (never a fabricated figure).
  const S = draft.annualSpendingReal
  const M = draft.health.oopMedicalAnnual
  const target = S === undefined ? undefined : anchorTarget(S, M)
  const running = items.reduce(
    (sum, it) => (isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal) ? sum + it.annualAmountReal : sum),
    0,
  )
  // validateBudgetItems is index-keyed (rows and items share order); touched is ID-keyed.
  const errorsFor = (index: number, id: number) =>
    attempted || touched.has(id) ? validation.errors.filter((e) => e.index === index) : []

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence onExitComplete={restoreFocus}>
      {open && (
        <motion.div
          className="budget-sheet__backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.16, ease: EASE_OUT }}
        >
          <motion.div
            ref={dialogRef}
            className="budget-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={onKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
          >
            <div ref={bindLiveRegion} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
            <h2 className="budget-sheet__title" id={titleId} tabIndex={-1} ref={headingRef}>
              {copy.budgetSheetTitle}
            </h2>
            <p className="budget-sheet__intro">{copy.budgetSheetIntro}</p>

            {/* The reconciliation readout — reserved box (insight 035: it updates on every commit
                and sits above the tap targets; the box never changes height). */}
            <div className="budget-sheet__readout" role="status">
              {S !== undefined && <p className="budget-readout__line">{slots.budgetAnchorLead(formatMoney(S))}</p>}
              {S !== undefined && M !== undefined && M > 0 && (
                <>
                  <p className="budget-readout__line">{slots.budgetLinesTarget(formatMoney(target!))}</p>
                  <p className="budget-readout__line budget-readout__line--muted">
                    {slots.budgetMedicalCarried(formatMoney(M))}
                  </p>
                </>
              )}
              {items.length > 0 && (
                <p className="budget-readout__line">{slots.budgetRunningTotal(formatMoney(running))}</p>
              )}
              {items.length > 0 && isRampedBudget(items) && (
                <p className="budget-readout__line budget-readout__line--muted">{copy.budgetAnchorRampNote}</p>
              )}
              {items.length > 0 &&
                validation.warnings.map((w) => (
                  <p key={w} className="budget-readout__line budget-readout__line--muted">
                    {w === 'zero-essentials' ? copy.budgetWarnZeroEssentials : copy.budgetWarnNoYearZero}
                  </p>
                ))}
            </div>

            <ul className="budget-sheet__lines">
              {rows.map((row, i) => (
                <BudgetLineItem
                  key={row.id}
                  item={row.item}
                  index={i}
                  errors={errorsFor(i, row.id)}
                  onChange={(patch) => setRow(row.id, patch)}
                  onWindowEnd={(end) => setRowEnd(row.id, end)}
                  onRemove={() => removeRow(row.id)}
                  onTouched={() => touchRow(row.id)}
                />
              ))}
            </ul>
            <button type="button" className="btn-quiet budget-sheet__add" onClick={addLine}>
              {copy.budgetAddLine}
            </button>

            <div className="budget-sheet__actions">
              <button
                type="button"
                className="btn-primary"
                aria-disabled={hasErrors}
                onClick={apply}
              >
                {copy.budgetApply}
              </button>
              <button type="button" className="btn-quiet" onClick={onClose}>
                {copy.budgetCancel}
              </button>
            </div>
            {governs && (
              <div className="budget-sheet__escape">
                <button type="button" className="btn-quiet" onClick={escapeHatch}>
                  {copy.budgetBackToSingle}
                </button>
                <p className="field-help">{copy.budgetBackToSingleHint}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
