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
import { deriveBandAgesAt } from '@ui/bandAnnotations'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { ControlPreviewReadout, useControlPreview } from './controlPreview'

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
}

export function SequencingControl({ open, draft, preview, previewBlocking = false, onApply, onClose }: SequencingControlProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const current: Pickable = (PICKABLE as readonly string[]).includes(draft.drawdownPolicy)
    ? (draft.drawdownPolicy as Pickable)
    : 'proportional'
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

  // The chart scrub's household-ages closure — the SAME deriveBandAgesAt the fan's readout rides
  // (RothLever's note: per-render derivation is safe, ages are open-stable; guard mirrors answerView).
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const agesAt = ageA !== undefined && ageB !== undefined ? deriveBandAgesAt(ageA, ageB) : undefined

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
        agesAt,
      )
      return view === null ? { kind: 'error', reason: 'indeterminate' } : { kind: 'ready', view }
    })
    // `run`'s identity carries `preview` (the crowned-offset anchor), so a provisional→final
    // sharpen that moves the crown re-anchors an open sheet's preview (insight 047). `agesAt`
    // is deliberately NOT a dep (a per-render closure over open-stable ages — RothLever's note).
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
    <ControlSheet open={open} title={copy.leverSequencingTitle} onClose={onClose} announcerRef={announcerRef}>
      <p className="control-sheet__intro">{copy.leverSequencingIntro}</p>

      <fieldset className="control-policies">
        <legend className="sr-only">{copy.leverSequencingTitle}</legend>
        {PICKABLE.map((p) => (
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
              <span className="control-order__name">{copy[BUCKET_LABEL[key]]}</span>
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
