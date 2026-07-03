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
 * BRACKET-FILL IS DELIBERATELY NOT OFFERED YET: a picked bracket-fill without derived per-year
 * ceilings silently degrades to pre-tax-first (model.ts's documented fallback) — a policy the
 * user chose reading as one they didn't, the calm-but-wrong sin. It joins the picker WITH the
 * cliff-aware ceiling derivation (filed in-unit follow-up), never before.
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
import { composeTwoFutures, type TwoFuturesView } from '@ui/twoFuturesChrome'
import { TwoFutures } from '@viz/TwoFutures'
import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'

/** The pickable set (v1): the named household-level policies minus bracket-fill (see header). */
const PICKABLE = ['proportional', 'taxable-first', 'pre-tax-first', 'custom'] as const
type Pickable = (typeof PICKABLE)[number]

const POLICY_LABEL: Record<Pickable, CopyKey> = {
  proportional: 'leverPolicyProportional',
  'taxable-first': 'leverPolicyTaxableFirst',
  'pre-tax-first': 'leverPolicyPreTaxFirst',
  custom: 'leverPolicyCustom',
}
const POLICY_HELP: Record<Pickable, CopyKey> = {
  proportional: 'leverPolicyProportionalHelp',
  'taxable-first': 'leverPolicyTaxableFirstHelp',
  'pre-tax-first': 'leverPolicyPreTaxFirstHelp',
  custom: 'leverPolicyCustomHelp',
}
const BUCKET_LABEL: Record<DrawdownOrderKey, CopyKey> = {
  taxable: 'leverOrderBucketTaxable',
  pretax: 'leverOrderBucketPretax',
  roth: 'leverOrderBucketRoth',
}

type PreviewState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'no-anchor' }
  | { readonly kind: 'ready'; readonly view: TwoFuturesView }
  | { readonly kind: 'error'; readonly reason: string }

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
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'idle' })
  // The sheet-local GENERATION (ultramode 2026-07-03 — two verified leaks the store's
  // latest-wins ticket cannot see): (a) a selection that fires NO preview (back to the
  // baseline) minted no ticket, so an in-flight run still painted 'ready' over 'idle';
  // (b) an in-flight run outlived a close and leaked into the reopened sheet. EVERY
  // preview-effect run and every open-edge bumps the generation; a resolve landing under
  // a stale generation is discarded unrendered.
  const genRef = useRef(0)

  // Re-seed the selection from the governing draft at the open EDGE only (the BudgetBuilder rule:
  // a mid-open draft change must never clobber an in-progress pick).
  useEffect(() => {
    if (!open) return
    genRef.current++
    setPicked(current)
    setOrder(draft.drawdownOrder ?? ['taxable', 'pretax', 'roth'])
    setPreviewState({ kind: 'idle' })
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent)
  }, [open])

  // Preview on every committed selection change (radio pick / order move — discrete commits,
  // never per-drag; the no-worker rule is satisfied by construction).
  useEffect(() => {
    if (!open) return
    const gen = ++genRef.current // EVERY run supersedes — including the no-preview arms below
    if (picked === 'proportional' && current === 'proportional') {
      setPreviewState({ kind: 'idle' }) // baseline vs baseline is a zero-delta non-comparison
      return
    }
    const control: TwoArmControl =
      picked === 'custom'
        ? { kind: 'sequencing', policy: 'custom', order }
        : { kind: 'sequencing', policy: picked }
    const run = preview(control)
    if (run === null) {
      setPreviewState({ kind: 'no-anchor' })
      return
    }
    setPreviewState({ kind: 'pending' })
    void run.then((res) => {
      if (gen !== genRef.current) return // superseded (a newer selection, a reset, or a reopen)
      if (res.kind === 'stale') return
      if (res.kind === 'error') {
        setPreviewState({ kind: 'error', reason: res.reason })
        announcerRef.current?.announce(copy.leverPreviewError)
        return
      }
      const view = composeTwoFutures(
        res.outcome,
        copy[POLICY_LABEL[picked]],
        copy.leverPolicyProportional,
        slots.sequencingDelta,
      )
      if (view === null) {
        setPreviewState({ kind: 'error', reason: 'indeterminate' })
        announcerRef.current?.announce(copy.leverPreviewError)
        return
      }
      setPreviewState({ kind: 'ready', view })
      announcerRef.current?.announce(view.deltaLine)
    })
    // `preview` IS a dep: its identity carries the anchor (the crowned offset), so a
    // provisional→final sharpen that moves the crown re-anchors an open sheet's preview
    // (insight 047's tiered-consumer class — ultramode 2026-07-03).
  }, [open, picked, order, preview, current])

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

      <div className="control-preview" aria-live="off">
        {previewState.kind === 'pending' && <p className="control-preview__pending">{copy.leverPreviewPending}</p>}
        {previewState.kind === 'no-anchor' && <p className="field-help">{copy.leverPreviewNoDate}</p>}
        {previewState.kind === 'error' && <p className="field-help">{copy.leverPreviewError}</p>}
        {previewBlocking && previewState.kind !== 'idle' && (
          <p className="field-help">{copy.leverNoWorkerNote}</p>
        )}
        {previewState.kind === 'ready' && (
          <>
            <p className="control-preview__delta">{previewState.view.deltaLine}</p>
            {previewState.view.stateLine && <p className="control-preview__state">{previewState.view.stateLine}</p>}
            {previewState.view.yearsLine && <p className="control-preview__years">{previewState.view.yearsLine}</p>}
            {previewState.view.series && (
              <TwoFutures
                withArm={previewState.view.series.withArm}
                withoutArm={previewState.view.series.withoutArm}
                labels={previewState.view.series.labels}
              />
            )}
            <p className="field-help">{copy.twoFuturesCaption}</p>
            <p className="field-help">{copy.sequencingBaselineNote}</p>
          </>
        )}
      </div>

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
