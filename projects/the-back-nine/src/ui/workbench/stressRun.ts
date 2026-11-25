/*
 * src/ui/workbench/stressRun.ts — Retirement → Stress Test's runs (Act 6 · RC11; plan docs/plans/6-rightcapital-ui-plan.md,
 * RC11): the request builder for one stress bar over the what-if runner's ONE core (`copyRunFor`), and its slot. No UI,
 * no write path, and nothing saved anywhere: a stress is a copy of the committed plan's draft, written by
 * `src/intake/stress.ts`, never a lever (`WHAT_IF_LEVER_KINDS` is a persisted vocabulary; plan 7.5).
 *
 * Every run is the core's: the committed FINAL answer's draft (never the live draft, insight 159), compiled by the plan's
 * own table base at the plan's own stop offset on the working route, on the plan's seed, and KTD11's check (paths,
 * horizon, people, seed) refuses by name before any request where the futures would differ. So every bar reads the same
 * futures as Baseline, which is the plan's own reading (`planReadingFor`, no run), exactly as Probability prints it.
 *
 * One slot per bar (each stress and Combined), made once by its caller; a slot asks for the many-futures run alone (a bar
 * reads its count, never rows). The one-key rule is the core's: the key is the answer's plus the stress's own token, so a
 * late result from an earlier size never renders on a later one.
 */
import { applyStress, applyStresses, type StressChoice, type StressRefusal } from '@intake/stress'
import { canonicalIdentityToken } from '@shared/model'
import type { ModelAnswer } from '@store/memoryModel'
import { engineRunLane } from '@store/runLanes'
import { copyRunFor, createCopySlot, type CopyRun, type CopySlot, type CopySlotLanes } from './whatIfRun'

/** One bar's ask: one stress, or every chosen stress at once (Combined). */
export type StressAsk = { readonly kind: 'one'; readonly choice: StressChoice } | { readonly kind: 'combined'; readonly choices: readonly StressChoice[] }

export type StressRun = CopyRun<StressRefusal>
export type StressSlot = CopySlot<StressAsk, StressRefusal>

/** The ask's own token: the slot's bundle key (a stress never shares a key with a what-if's bundle). */
export function stressKey(ask: StressAsk): string {
  return `stress:${canonicalIdentityToken(ask.kind === 'one' ? [ask.choice] : ask.choices)}`
}

/** The request builder for one stress bar: its copy written by the stress writers, through the one core. */
export function stressRunFor(answer: ModelAnswer, liveSeed: number | undefined, ask: StressAsk): StressRun {
  return copyRunFor(answer, liveSeed, stressKey(ask), (draft) => (ask.kind === 'one' ? applyStress(draft, ask.choice) : applyStresses(draft, ask.choices)), false)
}

/** One stress bar's slot: its many-futures lane, made here once. */
export function createStressSlot(lanes: CopySlotLanes = { many: engineRunLane() }): StressSlot {
  return createCopySlot(lanes, stressRunFor)
}
