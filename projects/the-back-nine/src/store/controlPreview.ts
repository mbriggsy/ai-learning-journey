/**
 * src/store/controlPreview.ts — the U10 control-preview runner (the levers' what-if seam).
 *
 * A PREVIEW channel, deliberately OUTSIDE memoryModel's answer state: tuning a lever runs the
 * two-arm comparison against CANDIDATE settings without committing anything — the primary answer
 * (and the vault) is untouched until an explicit Apply routes through `appModel.update` +
 * `recompute` like every other edit. Opening a what-if never mutates the vault (plan §U10) —
 * structurally: this module exposes no write path at all.
 *
 * LATEST-WINS EPOCH (the memoryModel (f) discipline, preview-local): field commits can overlap
 * (a slow both-arms run behind a quick re-edit), so each run mints a monotonic ticket and a
 * resolve is DISCARDED unless it still holds the latest — the caller never renders a stale
 * comparison over a newer request. NaN-proof by construction (a local counter, never a clock).
 *
 * ONE worker call computes BOTH arms (`engineApi.runTwoArm`) on the injected seed — the arms can
 * never diverge on the draw set (CRN). On the main-thread fallback (`runningInWorker === false`)
 * the call BLOCKS for two full runs — the surfaces disable per-drag/live recompute and preview
 * only on field COMMIT, with the pending state honest about the wait (plan §U10 no-worker rule).
 */
import type { SimulationParams, TwoArmControl, TwoArmOutcome } from '@shared/model'
import { twoArmFromWire } from '@engine/engineWire'
import { engineClient } from './engineClient'

export type ControlPreview =
  | { readonly kind: 'ok'; readonly outcome: TwoArmOutcome }
  | { readonly kind: 'error'; readonly reason: string }
  /** A newer request superseded this one — the caller simply ignores it. */
  | { readonly kind: 'stale' }

let latestTicket = 0

/** Run one two-arm preview; resolves 'stale' if a newer preview was requested meanwhile.
 *  TOTAL — never rejects (ultramode 2026-07-03): a worker-transport failure (worker death,
 *  a structured-clone refusal) would otherwise reject a promise the sheets consume with a
 *  bare `.then`, pinning the preview on "pending" forever. Every failure is the calm typed
 *  error arm the surfaces render. */
export async function runControlPreview(
  params: SimulationParams,
  seed: number,
  control: TwoArmControl,
): Promise<ControlPreview> {
  const ticket = ++latestTicket
  try {
    const wire = await engineClient.engine.runTwoArm(params, seed, control)
    if (ticket !== latestTicket) return { kind: 'stale' }
    const result = twoArmFromWire(wire)
    if (!result.ok) return { kind: 'error', reason: result.reason }
    return { kind: 'ok', outcome: result.outcome }
  } catch (e) {
    if (ticket !== latestTicket) return { kind: 'stale' }
    return { kind: 'error', reason: e instanceof Error ? e.message : 'preview failed' }
  }
}

/** False ⇒ the main-thread fallback is live: a preview BLOCKS the page for two full runs, so
 *  surfaces must recompute on COMMIT only (never per-drag) and say so honestly. */
export function previewRunsInWorker(): boolean {
  return engineClient.runningInWorker
}
