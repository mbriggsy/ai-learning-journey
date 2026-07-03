/*
 * src/intake/controlPreview.tsx — the shared what-if PREVIEW seam for the two U10 control sheets
 * (SequencingControl + RothLever). Both sheets tune candidate settings and compare two futures on
 * shared draws; this module owns the plumbing that was byte-identical between them:
 *
 *   - PreviewState — the five-arm union each sheet renders (idle / pending / no-anchor / ready / error).
 *   - useControlPreview — the LATEST-WINS seam (the sheet-local generation guard). The store's
 *     preview ticket only sees runs it MINTED; two transitions it cannot see — a selection that fires
 *     NO run (back to baseline / a cleared plan) and a run that outlives a close+reopen — leak a stale
 *     resolve over a newer state. So EVERY `run` call (including the withdraw-to-idle arm) and every
 *     open-edge `resetForOpen` bumps a monotonic generation; a resolve landing under a superseded
 *     generation is discarded UNRENDERED. NaN-proof by construction (a local counter, never a clock).
 *   - ControlPreviewReadout — the calm readout block (pending / no-anchor / error / the no-worker
 *     disclosure / the landed delta + chart), with the control's own trailing disclosures slotted in.
 *
 * ZERO WRITE PATH (the what-if law, plan §U10): a preview never touches the vault — this seam only
 * reads the injected runner and paints local state. Apply/Remove route OUT through the sheet's props.
 */
import { useCallback, useRef, useState } from 'react'
import type { TwoArmControl, TwoArmOutcome } from '@shared/model'
import type { ControlPreview } from '@store/controlPreview'
import { copy } from '@ui/copy'
import type { TwoFuturesView } from '@ui/twoFuturesChrome'
import { TwoFutures } from '@viz/TwoFutures'
import type { Announcer } from './a11y'

export type PreviewState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'no-anchor' }
  | { readonly kind: 'ready'; readonly view: TwoFuturesView }
  | { readonly kind: 'error'; readonly reason: string }

/** How a sheet interprets a landed OK outcome into the readout: a ready view, or the calm error
 *  face (e.g. an engine-indeterminate closure, or a compose that couldn't build a view). The
 *  transport-level failures (worker death, a stale supersession) are handled by the seam itself. */
export type PreviewResolution =
  | { readonly kind: 'ready'; readonly view: TwoFuturesView }
  | { readonly kind: 'error'; readonly reason: string }

export interface ControlPreviewSeam {
  readonly previewState: PreviewState
  /** Open-edge reset: back to idle and bump the generation so any in-flight run is superseded
   *  (call inside the sheet's open-edge re-seed effect, alongside the local state reseed). */
  readonly resetForOpen: () => void
  /** Run one preview. `request === null` WITHDRAWS the comparison to idle (a selection that
   *  fires no run — baseline-vs-baseline, a cleared plan). EVERY call bumps the generation, so a
   *  withdraw supersedes an in-flight run just as a new request does. `interpret` maps the landed
   *  OK outcome to the readout; it runs only under the still-current generation. */
  readonly run: (
    request: TwoArmControl | null,
    interpret: (outcome: TwoArmOutcome) => PreviewResolution,
  ) => void
}

export function useControlPreview({
  preview,
  announcerRef,
}: {
  readonly preview: (control: TwoArmControl) => Promise<ControlPreview> | null
  readonly announcerRef: React.MutableRefObject<Announcer | null>
}): ControlPreviewSeam {
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'idle' })
  const genRef = useRef(0)

  const resetForOpen = useCallback(() => {
    genRef.current++
    setPreviewState({ kind: 'idle' })
  }, [])

  const run = useCallback<ControlPreviewSeam['run']>(
    (request, interpret) => {
      const gen = ++genRef.current // EVERY run supersedes — including the withdraw arm below
      if (request === null) {
        setPreviewState({ kind: 'idle' })
        return
      }
      const p = preview(request)
      if (p === null) {
        setPreviewState({ kind: 'no-anchor' })
        return
      }
      setPreviewState({ kind: 'pending' })
      void p.then((res) => {
        if (gen !== genRef.current) return // superseded (a newer request, a withdraw, or a reopen)
        if (res.kind === 'stale') return
        if (res.kind === 'error') {
          setPreviewState({ kind: 'error', reason: res.reason })
          announcerRef.current?.announce(copy.leverPreviewError)
          return
        }
        const resolution = interpret(res.outcome)
        if (resolution.kind === 'error') {
          setPreviewState({ kind: 'error', reason: resolution.reason })
          announcerRef.current?.announce(copy.leverPreviewError)
          return
        }
        setPreviewState({ kind: 'ready', view: resolution.view })
        announcerRef.current?.announce(resolution.view.deltaLine)
      })
      // `preview` IS the identity trigger the sheets depend on (its identity carries the crowned
      // offset anchor — insight 047), so `run` re-memoizes exactly when `preview` does.
    },
    [preview, announcerRef],
  )

  return { previewState, resetForOpen, run }
}

/** The calm preview readout — every non-idle state, plus the landed two-futures delta + chart. The
 *  control's own trailing disclosures (Roth funding+omissions, the sequencing baseline note) slot in
 *  after the shared caption via `notes`; a disclosed omission rides BESIDE the number, never a footnote. */
export function ControlPreviewReadout({
  previewState,
  previewBlocking,
  notes,
}: {
  readonly previewState: PreviewState
  readonly previewBlocking: boolean
  readonly notes: React.ReactNode
}) {
  return (
    <div className="control-preview" aria-live="off">
      {previewState.kind === 'pending' && <p className="control-preview__pending">{copy.leverPreviewPending}</p>}
      {previewState.kind === 'no-anchor' && <p className="field-help">{copy.leverPreviewNoDate}</p>}
      {previewState.kind === 'error' && <p className="field-help">{copy.leverPreviewError}</p>}
      {previewBlocking && previewState.kind !== 'idle' && <p className="field-help">{copy.leverNoWorkerNote}</p>}
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
          {notes}
        </>
      )}
    </div>
  )
}
