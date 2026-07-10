/*
 * src/intake/HealthcareSheet.tsx — the U11 healthcare surface. A calm sheet: where the
 * income-dependent health costs stand in the plan (the pre-65 marketplace picture, the cliff,
 * the shadow rate on the next converted dollar, the Medicare look-back story), and ONE what-if
 * lever — which subsidy rules the plan figures under (current law vs the enhanced regime
 * Congress may restore) — compared as two futures on shared draws.
 *
 * PRESENTATIONAL over props (the ControlSheet discipline): every readout line arrives
 * pre-composed from the PURE healthSheetChrome seam (insight 048 — the honesty decisions are
 * tested there, not in this render path); the preview arrives through the injected runner;
 * Apply calls out — the CALLER owns the atomic model write + recompute.
 *
 * THE SINGLE-KEY WRITE FENCE (insight 058): this sheet's Apply commits EXACTLY ONE draft key
 * (`enhancedSubsidies` — set or stripped). It never edits a health scalar (SLCSP, premiums,
 * OOP) — those stay with the intake/Review flow, so the sheet can never become a second
 * writer of the spending-reconciliation invariant.
 *
 * DOOR DOMAIN (the council's categorical-gating condition, 2026-07-03): the caller mounts the
 * DOOR only where the engine actually prices healthcare (`healthcarePriced` — the intakeMap
 * predicate, single-sourced with buildOverlay's own gate). A post-65-only household gets NO
 * hollow door; its honesty surface is the verdict-level unpriced-Medicare disclosure.
 */
import { useEffect, useRef, useState } from 'react'
import type { HealthReadout, TwoArmControl } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import type { ControlPreview } from '@store/controlPreview'
import { copy } from '@ui/copy'
import { composeHealthSheet, composeRegimeFutures } from '@ui/healthSheetChrome'
import type { BandSavedAnchor } from '@ui/bandAnnotations'

import type { Announcer } from './a11y'
import { ControlSheet } from './controlSheet'
import { ControlPreviewReadout, useControlPreview } from './controlPreview'

type Regime = 'reverted' | 'enhanced'

/** One era-chapter of the stepped fact readout — single-file, rules included (the grammar the
 *  cold-read cleared). Empty chapters render nothing (a fact absent means its data honestly
 *  doesn't exist — decided in the pure chrome seam). */
function FactList({ facts }: { readonly facts: readonly import('@ui/healthSheetChrome').HealthFact[] }) {
  if (facts.length === 0) return null
  return (
    <div className="hs-facts">
      {facts.map((f) => (
        <section key={f.id} className="hs-fact" aria-label={f.eyebrow}>
          <p className="hs-fact__eyebrow" aria-hidden="true">
            {f.eyebrow}
          </p>
          {f.figure && (
            <p className="hs-fact__figure" aria-hidden="true">
              {f.figure}
            </p>
          )}
          {f.lines.map((l) => (
            <p key={l} className="hs-fact__body">
              {l}
            </p>
          ))}
        </section>
      ))}
    </div>
  )
}

export interface HealthcareSheetProps {
  readonly open: boolean
  readonly draft: ScenarioDraft
  /** The wire's per-year healthcare series (the spine headline run's opt-in). Undefined on the
   *  date route / pre-resolve — the sheet still teaches, it just quotes no empirical figures. */
  readonly readout: HealthReadout | undefined
  readonly preview: (control: TwoArmControl) => Promise<ControlPreview> | null
  /** True ⇒ the main-thread fallback is live (the no-worker disclosure rule). */
  readonly previewBlocking?: boolean
  /** Commit the picked regime — the caller writes the ONE key (set `true` / strip) atomically
   *  and recomputes. `enhanced === false` IS the escape ("back to current law"). */
  readonly onApply: (enhanced: boolean) => void
  readonly onClose: () => void
  /** U12 ultramode: close-time focus fallback for when the opening trigger has unmounted
   *  (the via-AssumptionPanel route) — forwarded to the ControlSheet scaffold. */
  readonly restoreFallback?: () => HTMLElement | null
  /** P3·U13 — the aged-vault wall-time anchor: the TwoFutures year-0 endpoint renames
   *  "Today" → "Your save" when elapsed > 0 (one time base per screen). */
  readonly savedAnchor?: BandSavedAnchor
}

export function HealthcareSheet({ open, draft, readout, preview, previewBlocking = false, onApply, onClose, restoreFallback, savedAnchor }: HealthcareSheetProps) {
  const announcerRef = useRef<Announcer | null>(null)
  const applied: Regime = draft.enhancedSubsidies === true ? 'enhanced' : 'reverted'
  const [picked, setPicked] = useState<Regime>(applied)
  const { previewState, resetForOpen, run } = useControlPreview({ preview, announcerRef })

  // The composed readout lines — PURE, decided in healthSheetChrome (regime-aware: an applied
  // enhanced regime swaps the dated status note to the what-if variant and drops the cliff lines).
  const view = composeHealthSheet(readout, draft)
  const hasHsa = draft.enteredAccounts.some((a) => a.kind === 'hsa')

  // Open-edge re-seed (the BudgetBuilder rule): the applied regime pre-selects.
  useEffect(() => {
    if (!open) return
    resetForOpen()
    setPicked(applied)
    // (deps deliberately narrow: open-edge re-seed only — the BudgetBuilder precedent)
  }, [open])

  // The chart's household ages — the chrome derives the fan-dialect axis ticks AND the scrub
  // closure from this ONE pair (RothLever's note: per-render derivation is safe, ages are
  // open-stable; guard mirrors answerView — absent ⇒ the year-count fallback axis).
  const ageA = draft.people[0]?.currentAge
  const ageB = draft.people[1]?.currentAge
  const ages = ageA !== undefined && ageB !== undefined ? ([ageA, ageB] as const) : undefined

  // Preview on every committed selection change. Picking the APPLIED regime withdraws the
  // comparison (a baseline-vs-baseline zero-delta non-comparison stays idle — the
  // SequencingControl rule); picking the other regime runs the subsidy-regime two-arm.
  useEffect(() => {
    if (!open) return
    const request: TwoArmControl | null =
      picked === applied ? null : { kind: 'subsidy-regime', enhanced: picked === 'enhanced' }
    run(request, (outcome) => {
      if (outcome.kind === 'indeterminate') return { kind: 'error', reason: outcome.reason }
      const composed = composeRegimeFutures(outcome, picked === 'enhanced', ages, savedAnchor)
      return composed === null ? { kind: 'error', reason: 'indeterminate' } : { kind: 'ready', view: composed }
    })
    // `run`'s identity carries `preview` (the crowned-offset anchor — insight 047). `ages` is
    // deliberately NOT a dep (a per-render tuple over open-stable ages — RothLever's note).
  }, [open, picked, applied, run])

  return (
    <ControlSheet open={open} title={copy.leverHealthTitle} onClose={onClose} announcerRef={announcerRef} restoreFallback={restoreFallback}>
      <p className="control-sheet__intro">{copy.leverHealthIntro}</p>

      {/* STRAIGHT DOWN (Briggsy's pick, 2026-07-03 — the chaptered 3-column spread lost the
          test spin; it lives at f6aedb78 if history ever wants it). One reading line: the
          stepped facts, then the lever, the preview, the disclosures, the actions — the
          chrome-less scroll + shadow carry the "there's more" cue at every width. Each fact:
          calm sentence-case eyebrow (the region's accessible name) + a tabular-nums dollar
          anchor (aria-hidden — every figure also lives in a hedged body sentence, so AT hears
          it once) + the honed sentence(s). Composed + honesty-gated in the PURE chrome seam,
          never here. */}
      <FactList facts={view.facts} />
      {hasHsa && <p className="field-help">{copy.controlHealthHsaNote}</p>}

      {/* The ONE lever — which subsidy rules the plan figures under (the SequencingControl
          radio grammar: shape/weight mark the pick, never hue alone). */}
      <fieldset className="control-policies">
        <legend className="sr-only">{copy.leverHealthRegimeLegend}</legend>
        {(['reverted', 'enhanced'] as const).map((r) => (
          <label key={r} className="control-policy" data-picked={picked === r || undefined}>
            <input
              type="radio"
              name="subsidy-regime"
              value={r}
              checked={picked === r}
              onChange={() => setPicked(r)}
            />
            <span className="control-policy__body">
              <span className="control-policy__label">
                {r === 'reverted' ? copy.leverHealthRegimeReverted : copy.leverHealthRegimeEnhanced}
                {r === applied && <span className="control-policy__tag">{copy.leverHealthRegimeCurrentTag}</span>}
              </span>
              <span className="control-policy__help">
                {r === 'reverted' ? copy.leverHealthRegimeRevertedHelp : copy.leverHealthRegimeEnhancedHelp}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {/* The dated legislative note rides WITH the lever it explains — read from the LIVE
          constants at render time, never a persisted stamp (reVerifyEveryBuild). */}
      <p className="field-help">{view.statusLine}</p>

      <ControlPreviewReadout previewState={previewState} previewBlocking={previewBlocking} notes={null} />

      {/* The survivor + omission disclosures describe the WHOLE readout, not just a landed
          preview — they stand on the sheet unconditionally (the ready-arm `notes` slot would
          hide them until a comparison ran; a disclosed omission rides beside the numbers). */}
      <p className="field-help">{copy.controlHealthSurvivorNote}</p>
      <p className="field-help">{copy.controlHealthOmissionsNote}</p>

      <div className="control-sheet__actions">
        <button
          type="button"
          className="btn-primary"
          aria-disabled={picked === applied}
          onClick={() => {
            if (picked === applied) {
              announcerRef.current?.announce(copy.leverPreviewPending)
              return
            }
            onApply(picked === 'enhanced')
          }}
        >
          {copy.leverHealthRegimeApply}
        </button>
        <button type="button" className="btn-quiet" onClick={onClose}>
          {copy.leverCancel}
        </button>
      </div>
      {applied === 'enhanced' && picked === 'enhanced' && (
        <div className="control-sheet__escape">
          <button type="button" className="btn-quiet" onClick={() => onApply(false)}>
            {copy.leverHealthRegimeRemove}
          </button>
        </div>
      )}
    </ControlSheet>
  )
}
