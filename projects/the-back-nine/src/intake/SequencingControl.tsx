/*
 * src/intake/SequencingControl.tsx — the U10 manual withdrawal-sequencing control (R9's more
 * universal lever). A calm sheet: pick a named drawdown policy — or put the three general
 * accounts in your own order — and compare it against the neutral `proportional` baseline as
 * two futures on shared draws. The control PICKS a policy; it never ranks or recommends one
 * (that is the Act-4 solver's job — R10 here is only tune/override + comparative-on-demand).
 *
 * PRESENTATIONAL over props (the BudgetBuilder discipline): local selection state; the preview
 * arrives through the injected `preview` runner (Result composes the params + the engine call);
 * Apply calls out through `onApply` — the CALLER owns the atomic model write (policy + order in
 * ONE update, the biconditional maintained at the write site) and its recompute.
 *
 * BRACKET-FILL JOINED THE PICKER AT U11 (the withheld-policy law is retired): the engine now
 * DERIVES the per-year cliff-aware ceiling itself (taxOverlay reads magiLandscape — the min of
 * the next-bracket-edge, ACA-cliff, and next-IRMAA-step rails, each active only where the
 * engine actually prices it), so the old silent pre-tax-first degrade is structurally
 * impossible. The label names what binds ("Low-tax room first"), never the jargon.
 *
 * ORDER EDITOR: three rows with Up/Down buttons (calm, keyboard-native, no drag — a11y-clean on
 * the phone). Each button carries an aria-label naming its bucket; the list is a real <ol> (the
 * ORDER is the information — structure encodes it).
 */
import { useEffect, useRef, useState } from 'react'
import type { DrawdownOrderKey, DrawdownPolicy, TwoArmControl } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { ControlPreview } from '@store/controlPreview'
import { copy, slots, type CopyKey } from '@ui/copy'
import { composeTwoFutures } from '@ui/twoFuturesChrome'
import type { BandPlanClockAnchor } from '@ui/bandAnnotations'

import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { ControlPreviewReadout, useControlPreview } from './controlPreview'
import { KIND_TO_BUCKET } from './intakeMap'

/** The pickable set: every named household-level policy + the user's own order (see header —
 *  bracket-fill joined at U11 with the engine-derived cliff-aware ceiling). */
const PICKABLE = ['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill', 'custom'] as const
type Pickable = (typeof PICKABLE)[number]

const POLICY_LABEL: Record<Pickable, CopyKey> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  'bracket-fill': 'leverPolicyBracketFill',
  custom: 'leverPolicyCustom',
}
const POLICY_HELP: Record<Pickable, CopyKey> = {
  proportional: 'leverPolicyProportionalHelp',
  'taxable-first': 'leverPolicyTaxableFirstHelp',
  'pre-tax-first': 'leverPolicyPreTaxFirstHelp',
  'bracket-fill': 'leverPolicyBracketFillHelp',
  custom: 'leverPolicyCustomHelp',
}
const BUCKET_LABEL: Record<DrawdownOrderKey, CopyKey> = {
  taxable: 'leverOrderBucketTaxable',
  pretax: 'leverOrderBucketPretax',
  roth: 'leverOrderBucketRoth',
}

/** The BUCKET a policy's own LABEL promises to spend from — `null` = the policy names a RULE, not a
 *  holding ("A little from each", "Low-tax room first", "My own order"), so it is always offered.
 *  Card 14(b): "Brokerage first — Spends the brokerage account down before touching pre-tax or Roth."
 *  sat on the sheet of a household holding pre-tax + Roth and nothing else. Keyed on the BUCKET rather
 *  than the AccountKind because the POLICY is defined on buckets (sequencing.ts's ORDER map), so a
 *  second taxable-mapped kind added later inherits this for free. `Record<Pickable, …>` is EXHAUSTIVE:
 *  a policy added to PICKABLE cannot skip the decision. `bracket-fill` is deliberately `null` — "Low-tax
 *  room first" names tax ROOM, not a holding, and its engine form is well-defined on an empty pre-tax
 *  bucket (it falls through to taxable then Roth), so it is a behaviour, not a mislabel. */
const POLICY_NAMES_BUCKET: Record<Pickable, DrawdownOrderKey | null> = {
  proportional: null,
  'taxable-first': 'taxable',
  'pre-tax-first': 'pretax',
  'bracket-fill': null,
  custom: null,
}

export interface SequencingControlProps {
  readonly open: boolean
  readonly draft: ScenarioDraft
  /** Run the two-arm preview against the household's live anchor; null = no honest anchor
   *  (the date route with no crowned date — the sheet says so calmly). */
  readonly preview: (control: TwoArmControl) => Promise<ControlPreview> | null
  /** True ⇒ the main-thread fallback is live: a preview BLOCKS the page while it runs — the
   *  sheet discloses the wait honestly (the no-worker rule; ultramode 2026-07-03 wired it). */
  readonly previewBlocking?: boolean
  /** Commit the pick — the caller writes policy + order ATOMICALLY and recomputes. */
  readonly onApply: (policy: DrawdownPolicy, order?: readonly DrawdownOrderKey[]) => void
  readonly onClose: () => void
  /** U12 ultramode: close-time focus fallback for when the opening trigger has unmounted
   *  (the via-AssumptionPanel route) — forwarded to the ControlSheet scaffold. */
  readonly restoreFallback?: () => HTMLElement | null
  /** P3·U13 — the aged-plan wall-time anchor (Result's memoized dateAnchor): the TwoFutures
   *  year-0 endpoint renames "Today" → "Plan built" when the plan clock > 0 (one time base per
   *  screen; the ultramode caller-lens caught this chart as the sibling the band fix missed.
   *  U17 §S0.2 — the clock measures the BUILD, never the save). */
  readonly savedAnchor?: BandPlanClockAnchor
}

export function SequencingControl({ open, draft, preview, previewBlocking = false, onApply, onClose, restoreFallback, savedAnchor }: SequencingControlProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const current: Pickable = (PICKABLE as readonly string[]).includes(draft.drawdownPolicy)
    ? (draft.drawdownPolicy as Pickable)
    : 'proportional'
  // Card 14(b) — never OFFER a shortcut whose own words name an account the household does not hold.
  // PRESENCE, never a balance: a $0 brokerage is enterable (AccountEntry requires only that valueToday
  // be DEFINED) and a $0 brokerage with contributions still funds the taxable channel in accumulation,
  // and the shipped re-entry read-back (reentryChrome.ts) is presence-based for exactly that reason.
  const held = new Set(draft.enteredAccounts.map((a) => KIND_TO_BUCKET[a.kind]))
  /** The bucket this policy names and the household does not hold — `undefined` = nothing to disclose. */
  const absentBucket = (p: Pickable): DrawdownOrderKey | undefined => {
    const named = POLICY_NAMES_BUCKET[p]
    return named !== null && !held.has(named) ? named : undefined
  }
  // The household's OWN committed policy is ALWAYS offered, even when the account it names is gone (a
  // restored vault; an account removed since). Hiding it would leave the sheet with NO radio checked
  // while the plan actually runs on that policy — the sheet silently disagreeing with the plan it
  // fronts, which is worse than the finding this filter closes, and `walkSolveStale` reads that checked
  // radio by name. It carries the absent-account tag instead, so it explains itself rather than lying
  // quietly. FLOOR, by construction: proportional / bracket-fill / custom are never gated, so the list
  // can never fall below three, nor below two non-current options. HIDDEN, never disabled-in-place:
  // Playwright folds `aria-disabled` into actionability (getAriaDisabled — coreBundle.js, 1.60), so a
  // blocked radio in a list the harness walks by "first unchecked" would hang `.check()`.
  const offered = PICKABLE.filter((p) => absentBucket(p) === undefined || p === current)
  const [picked, setPicked] = useState<Pickable>(current)
  const [order, setOrder] = useState<readonly DrawdownOrderKey[]>(
    draft.drawdownOrder ?? ['taxable', 'pretax', 'roth'],
  )
  // The sheet-local latest-wins seam (shared with RothLever — ultramode 2026-07-03 — two verified
  // leaks the store's ticket cannot see): (a) a selection that fires NO preview (back to the
  // baseline) minted no ticket, so an in-flight run still painted 'ready' over 'idle'; (b) an
  // in-flight run outlived a close and leaked into the reopened sheet. resetForOpen + every `run`
  // (including the withdraw arm) bump the generation; a stale-generation resolve is discarded.
  const { previewState, resetForOpen, run } = useControlPreview({ preview, announcerRef })

  // Re-seed the selection from the governing draft at the open EDGE only (the BudgetBuilder rule:
  // a mid-open draft change must never clobber an in-progress pick).
  useEffect(() => {
    if (!open) return
    resetForOpen()
    setPicked(current)
    setOrder(draft.drawdownOrder ?? ['taxable', 'pretax', 'roth'])
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent)
  }, [open])

  // The chart's household ages — the chrome derives the fan-dialect axis ticks AND the scrub
  // closure from this ONE pair (RothLever's note: per-render derivation is safe, ages are
  // open-stable; guard mirrors answerView — absent ⇒ the year-count fallback axis).
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const ages = ageA !== undefined && ageB !== undefined ? ([ageA, ageB] as const) : undefined

  // Preview on every committed selection change (radio pick / order move — discrete commits,
  // never per-drag; the no-worker rule is satisfied by construction). Baseline-vs-baseline
  // WITHDRAWS the comparison (request null) — a zero-delta non-comparison, kept idle.
  useEffect(() => {
    if (!open) return
    const request: TwoArmControl | null =
      picked === 'proportional' && current === 'proportional'
        ? null
        : picked === 'custom'
          ? { kind: 'sequencing', policy: 'custom', order }
          : { kind: 'sequencing', policy: picked }
    run(request, (outcome) => {
      const view = composeTwoFutures(
        outcome,
        copy[POLICY_LABEL[picked]],
        copy.leverPolicyProportional,
        slots.sequencingDelta,
        ages,
        savedAnchor,
      )
      return view === null ? { kind: 'error', reason: 'indeterminate' } : { kind: 'ready', view }
    })
    // `run`'s identity carries `preview` (the crowned-offset anchor), so a provisional→final
    // sharpen that moves the crown re-anchors an open sheet's preview (insight 047). `ages`
    // is deliberately NOT a dep (a per-render tuple over open-stable ages — RothLever's note);
    // `savedAnchor` likewise (memoized in Result off startCalendarYear — open-stable).
  }, [open, picked, order, run, current])

  const move = (key: DrawdownOrderKey, dir: -1 | 1) => {
    setOrder((prev) => {
      const i = prev.indexOf(key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      next[i] = next[j]!
      next[j] = key
      return next
    })
  }

  return (
    <ControlSheet open={open} title={copy.leverSequencingTitle} onClose={onClose} announcerRef={announcerRef} restoreFallback={restoreFallback}>
      <p className="control-sheet__intro">{copy.leverSequencingIntro}</p>

      <fieldset className="control-policies">
        <legend className="sr-only">{copy.leverSequencingTitle}</legend>
        {offered.map((p) => (
          <label key={p} className="control-policy" data-picked={picked === p || undefined}>
            <input
              type="radio"
              name="drawdown-policy"
              value={p}
              checked={picked === p}
              onChange={() => setPicked(p)}
            />
            <span className="control-policy__body">
              <span className="control-policy__label">
                {copy[POLICY_LABEL[p]]}
                {/* Reachable ONLY for the committed-policy exception above (every other absent-account
                    policy is filtered out): the plan is RUNNING an order that names an account this
                    household no longer holds, so the row says so rather than standing there bare. It
                    renders FIRST, against the label whose noun it qualifies — "Brokerage first — no
                    account entered — your current order" — never as a third fragment after the current
                    tag, where "no account entered" would read as a claim about the ORDER (the
                    2026-09-13 review's catch). */}
                {absentBucket(p) !== undefined && (
                  <span className="control-policy__tag">{copy.leverNoAccountTag}</span>
                )}
                {p === current && <span className="control-policy__tag">{copy.leverPolicyCurrentTag}</span>}
              </span>
              <span className="control-policy__help">{copy[POLICY_HELP[p]]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {picked === 'custom' && (
        <ol className="control-order">
          {order.map((key, i) => (
            <li key={key} className="control-order__row">
              {/* All three general buckets stay, always: simulate.ts REFUSES a `drawdownOrder` that does
                  not name each general bucket exactly once, so a pruned editor would emit an order the
                  engine rejects — and the order genuinely matters later even on an empty bucket, because
                  RMD forced excess rebuilds a taxable bucket the household started without. The bucket
                  the household holds no account in is TAGGED, not removed: this editor is also the
                  escape hatch that keeps a taxable-first ORDER reachable after (b) hid the shortcut. */}
              <span className="control-order__name">
                {copy[BUCKET_LABEL[key]]}
                {!held.has(key) && <span className="control-order__tag">{copy.leverNoAccountTag}</span>}
              </span>
              <span className="control-order__moves">
                <button
                  type="button"
                  className="btn-quiet control-order__move"
                  aria-label={`${copy.leverOrderMoveUp} — ${copy[BUCKET_LABEL[key]]}`}
                  aria-disabled={i === 0}
                  onClick={() => move(key, -1)}
                >
                  <span aria-hidden="true">{copy.leverOrderUpGlyph}</span>
                </button>
                <button
                  type="button"
                  className="btn-quiet control-order__move"
                  aria-label={`${copy.leverOrderMoveDown} — ${copy[BUCKET_LABEL[key]]}`}
                  aria-disabled={i === order.length - 1}
                  onClick={() => move(key, 1)}
                >
                  <span aria-hidden="true">{copy.leverOrderDownGlyph}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <ControlPreviewReadout
        previewState={previewState}
        previewBlocking={previewBlocking}
        notes={<p className="field-help">{copy.sequencingBaselineNote}</p>}
      />

      <div className="control-sheet__actions">
        <button type="button" className="btn-primary" onClick={() => onApply(picked, picked === 'custom' ? order : undefined)}>
          {copy.leverSequencingApply}
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>
          {copy.leverCancel}
        </button>
      </div>
    </ControlSheet>
  )
}
