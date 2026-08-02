/*
 * src/intake/BudgetBuilder.tsx — the U9b budget builder (council 2026-07-02, Q1/Q5;
 * de-modalized in-flow 2026-07-03, council wf_67fa22e5-fbb).
 *
 * ONE FORM, TWO SHELLS. The builder is the single deepening surface for the itemized budget
 * (R8: the deepening of the single-total answer, never the on-ramp), with one form core and a
 * `variant` picking the reveal shell: the Result screen mounts the `'sheet'` (portaled modal —
 * a later-edit door over a finished answer), while the intake spend step mounts `'inline'` —
 * the builder SWAPS the step body in place, the same list-in-flow grammar as the accounts and
 * other-income steps (the council's side-quest diagnosis: a modal behind a quiet button reads
 * as an optional errand; a room on the main path reads as the question continuing). Each mount
 * owns its own commit semantics (Result → appModel + an explicit recompute; intake → the flow's
 * question-commit), so this component is presentational + local state over props — it reads the
 * draft it is given and calls out through onApply / onEscape / onClose. It lives in the INTAKE
 * layer deliberately: it is a form built from the intake field primitives (commit-on-blur,
 * format-on-blur, aria-wired), and ui→intake is the established import direction (Result
 * already mounts AnswerStrip).
 *
 * THE STRUCTURAL SHELL (Q5): opening the sheet persists NOTHING — `draft.budget` stays strictly
 * undefined until the first real Apply (build-gate 2: `[]` is never written). An empty Apply is
 * the ESCAPE when a budget governs — real lines are being let go, and the button moves the plan.
 * With NO governing budget there is nothing to commit, so it BLOCKS with the announced reason
 * (Card 9, 2026-08-01, 7/7 lenses): the filled primary silently doing what the quiet Cancel link
 * does is the insight-100 family — a promise verb that owes a rendered outcome. Both shells: the
 * sheet AND the in-flow spend step. The reduce-to-spine byte-identity is structural, not
 * arithmetic: no seeded line exists to double-count.
 *
 * THE RECONCILIATION READOUT (build-gate 1): the lines-target NETS the injected OOP medical —
 * target = max(0, S − M) — with the "carried automatically" disclosure, because compileBudget
 * re-adds M on top of typed lines (a target quoted at the raw S would commit S+M, the silently-
 * pessimistic answer jump). The readout sits ABOVE the line controls in a reserved box (insight
 * 035 — it re-renders on every commit and must never shuffle the tap targets below it). When M
 * alone exceeds S the target line is REPLACED by the honest exceeds line (F10 — see
 * {@link medicalExceedsTotal}); a "$0 into the lines" target beside "$M carried" would be
 * internally contradictory.
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
import { useLiveAnnouncer, focusHeading } from './a11y'
import { formatMoney } from './fields'
import { BudgetLineItem } from './BudgetLineItem'
import './sheetShell.css'
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

/** The reconciliation readout's M>S honesty fork (F10; insight 048 — the decision is a pure
 *  exported helper): when the OOP-medical floor M ALONE exceeds the total S the answer uses,
 *  the lines-target line would read "about $0 a year goes into the lines below" beside
 *  "about $M carried automatically" — internally contradictory — so the readout swaps in the
 *  honest exceeds line instead. STRICTLY M > S: at M === S a $0 lines-target is the TRUTH
 *  (every non-medical dollar is zero), not a contradiction. The engine-side anchor stays
 *  anchorTarget = max(0, S − M) — this fork is presentation-only. */
export const medicalExceedsTotal = (spendTotal: number, oopMedical: number): boolean =>
  oopMedical > spendTotal

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
  /** The reveal shell: `'sheet'` = the portaled modal (the Result door); `'inline'` = the
   *  in-flow body swap (the intake spend step — de-modalized, council 2026-07-03). The form
   *  core, state, and commit seams are identical; only the room around them differs. */
  readonly variant?: 'sheet' | 'inline'
  /** U12 ultramode (sheet variant only): where focus lands on close when the OPENING trigger
   *  has unmounted — the via-panel route (the AssumptionPanel's governed-spend row closes the
   *  panel and opens this sheet in one click; the row's button is gone by close time).
   *  Consulted ONLY when the captured owner is disconnected — the ControlSheet scaffold
   *  carries the identical contract. */
  readonly restoreFallback?: () => HTMLElement | null
}

export function BudgetBuilder({ open, draft, onApply, onEscape, onClose, variant = 'sheet', restoreFallback }: BudgetBuilderProps) {
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
  // The node lives INSIDE the open-gated portal, so it mounts only when the sheet opens —
  // AFTER this component. useLiveAnnouncer is callback-ref based precisely so it binds on
  // that late mount, never null-at-mount like a `[]`-deps effect would (insight 060).
  const announcer = useLiveAnnouncer()

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
    // Sheet-only chrome: capture the focus owner BEFORE focus moves (it is the restore target),
    // plus the scroll lock. The inline swap is a plain body change — the PARENT owns post-close
    // focus, and the page keeps scrolling.
    if (variant === 'sheet') {
      restoreRef.current = (document.activeElement as HTMLElement) ?? null
      document.documentElement.classList.add('budget-sheet-open')
    }
    focusHeading(headingRef.current)
    if (variant !== 'sheet') return
    return () => {
      document.documentElement.classList.remove('budget-sheet-open')
    }
    // draft.budget is deliberately NOT a dep: re-seeding happens at the open EDGE only (a
    // mid-open draft change must never clobber in-progress local edits).
  }, [open, mintRows, variant])

  const restoreFocus = useCallback(() => {
    const owner = restoreRef.current
    restoreRef.current = null
    if (owner !== null && owner.isConnected) {
      owner.focus()
      return
    }
    // The owner unmounted mid-open (the via-panel route) — land on the caller-named fallback
    // landmark instead of stranding focus on <body> (U12 ultramode; controlSheet.tsx mirror).
    const fallback = restoreFallback?.() ?? null
    if (fallback !== null) fallback.focus()
  }, [restoreFallback])

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
  // Card 9: the empty sheet's CTA is not a second Cancel. `nothingToCommit` is the SINGLE source
  // read by both apply()'s first arm and the aria-disabled attribute below, so the visible state
  // and the behaviour cannot drift apart. The EMPTY+GOVERNING case is deliberately excluded —
  // there a budget really is being let go and the button does move the plan (the escape, unchanged).
  const nothingToCommit = items.length === 0 && !governs

  const apply = () => {
    if (nothingToCommit) {
      // Nothing typed and no budget governing: there is nothing to commit, so the CTA SPEAKS
      // rather than closing silently — a silent close is byte-identical to the quiet Cancel beside
      // it. Cancel / Escape / the backdrop still leave in one tap (R8's never-a-gate holds), and
      // the inline mount's Back/Next are untouched, so this blocks nobody.
      announcer.announce(copy.budgetApplyEmpty)
      return
    }
    if (items.length === 0) {
      // An empty Apply is never `budget: []` (build-gate 2): a budget GOVERNS and every line was
      // removed, so this is the escape back to a single number.
      dirtyRef.current = false
      onEscape()
      return
    }
    if (hasErrors) {
      setAttempted(true)
      announcer.announce(copy.budgetApplyBlocked)
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
  // The tier split (cold-read 2026-07-03: the essential/extra answer must be SEEN used) — the
  // same year-0-active rule as `running`, split by the tier the user picked.
  const essentialsAt0 = items.reduce(
    (sum, it) =>
      it.tier === 'essentials' && isActiveAt(it, 0) && Number.isFinite(it.annualAmountReal)
        ? sum + it.annualAmountReal
        : sum,
    0,
  )
  const extrasAt0 = running - essentialsAt0
  // A row that carries no number yet contributes nothing to `running` — and a readout that
  // SPEAKS "$0" for lines the user never valued is the blank-becomes-a-spoken-zero shape (the
  // R19 law's readout face; Briggsy's live read 2026-07-11: one "Add a line" click made the
  // box announce "lines add up to about $0 · essentials $0 · extras $0" over an untouched
  // field). The running total + tier split wait for the FIRST real dollar anywhere in the
  // list; all-NaN fresh rows keep the calm anchor-only readout the empty builder shows.
  const anyValued = items.some((it) => Number.isFinite(it.annualAmountReal))
  // validateBudgetItems is index-keyed (rows and items share order); touched is ID-keyed.
  const errorsFor = (index: number, id: number) =>
    attempted || touched.has(id) ? validation.errors.filter((e) => e.index === index) : []

  // The heading subordinates to its room: the sheet is its own dialog context (h2); the inline
  // swap sits under the flow's step h2 (h3 keeps the outline honest — a11y heading order).
  const HeadingTag: 'h2' | 'h3' = variant === 'sheet' ? 'h2' : 'h3'

  // ONE form core, rendered by whichever shell is mounted (state above outlives both).
  const formBody = (
    <>
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <HeadingTag className="budget-sheet__title" id={titleId} tabIndex={-1} ref={headingRef}>
        {copy.budgetSheetTitle}
      </HeadingTag>
      <p className="budget-sheet__intro">{copy.budgetSheetIntro}</p>

      {/* The reconciliation readout — reserved box (insight 035: it updates on every commit
          and sits above the tap targets; the box never changes height). */}
      <div className="budget-sheet__readout" role="status">
        {S !== undefined && <p className="budget-readout__line">{slots.budgetAnchorLead(formatMoney(S))}</p>}
        {S !== undefined && M !== undefined && M > 0 && (
          <>
            {/* Carried-medical BEFORE the lines-target (audit 2026-07-03): the reader follows
                the subtraction in the order it happens — total → what's carried → what's left. */}
            <p className="budget-readout__line budget-readout__line--muted">
              {slots.budgetMedicalCarried(formatMoney(M))}
            </p>
            {/* The M>S honesty fork (F10): the medical figure alone exceeding S would make the
                target line read "$0 into the lines below" beside "$M carried" — contradictory —
                so the honest exceeds line REPLACES it, one line for one line in the SAME reserved
                box (insight 035: S and M are draft-fixed for the whole open, so the branch never
                flips mid-gesture and the tap targets below never shuffle). */}
            {medicalExceedsTotal(S, M) ? (
              <p className="budget-readout__line">
                {slots.budgetMedicalExceedsTotal(formatMoney(M), formatMoney(S))}
              </p>
            ) : (
              <p className="budget-readout__line">{slots.budgetLinesTarget(formatMoney(target!))}</p>
            )}
          </>
        )}
        {anyValued && (
          <p className="budget-readout__line">{slots.budgetRunningTotal(formatMoney(running))}</p>
        )}
        {anyValued && (
          <p className="budget-readout__line">
            {slots.budgetTierSplit(formatMoney(essentialsAt0), formatMoney(extrasAt0))}
          </p>
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
      {/* Card 9, the EMPHASIS FLIP (Briggsy's call, 2026-08-02). On the empty first-open frame the
          only real path forward is "Add a line", and it was a small underlined link sitting under a
          full-width filled button that could not act — the emphasis pointed at the wrong control.
          The two swap on `nothingToCommit` and nothing else: as soon as a line exists, "Use this
          budget" is genuinely the next step and takes the primary back. DOM ORDER IS UNCHANGED, so
          focus order never moves — only the visual weight does. NOT ANIMATED, deliberately: the
          swap rides the user's own click and lands beside a whole new row appearing, so a button
          growing prominent would compete with the thing that actually happened, and a primary
          "arriving" is the reward flourish the calm law forbids. */}
      <button
        type="button"
        className={`${nothingToCommit ? 'btn-primary' : 'btn-quiet'} budget-sheet__add`}
        onClick={addLine}
      >
        {copy.budgetAddLine}
      </button>

      <div className="budget-sheet__actions">
        <button
          type="button"
          className={nothingToCommit ? 'btn-quiet' : 'btn-primary'}
          aria-disabled={hasErrors || nothingToCommit}
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
    </>
  )

  // ── the IN-FLOW shell: a plain body swap on the step's own entrance timing — no portal, no
  // backdrop, no focus trap, no dialog role (it is not modal; the flow's Back/Next stay live
  // and R8's never-a-gate holds). Escape mirrors Cancel as a convenience; the explicit buttons
  // are the contract (insight 067). ──────────────────────────────────────────────────────────
  if (variant === 'inline') {
    if (!open) return null
    return (
      <section
        className="budget-inline"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          }
        }}
      >
        {formBody}
      </section>
    )
  }

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
            {formBody}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
