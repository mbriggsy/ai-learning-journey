/*
 * src/ui/workbench/whatIfRun.ts — a what-if's runs beside the plan (the workbench plan's U14, KTD10 to KTD13): the
 * request builder for one what-if slot ({@link whatIfRunFor}), and the slot runner that keeps the one-key rule
 * ({@link createWhatIfSlot}). No UI and no write path: the rail is U15.
 *
 * THE TIER (U14's timing measurement, 2026-11-23, recorded in the plan's U14 "As built" note and `docs/landmines.md`):
 * a working household's what-if runs at the date search's FINAL tier (`DATE_SEARCH_PATHS.final`, 16,000 paths) on the
 * plan's seed, so the plan's own odds are read off the committed answer's curve at the base offset, with NO run and no
 * plan-base lane: the plan cell is the pinned answer's own reading, and the what-if cell is the same statistic
 * (`offsetReading`, the curve's own per-offset producer) on the same futures. An all-retired household's what-if is the
 * spine run on its copy; the plan's side is the store's own headline, with no run.
 *
 * THE BUILDER reads only the store's committed FINAL answer (`answer.draft`, never the live draft: a run that sampled a
 * half-edited live draft would carry inputs the store never committed, insight 159) and the LIVE draft's seed (a
 * household's first answer carries none: `recompute` captures the draft before `ensureSeed` mints it). The bundle is
 * applied to a copy (`applyBundle`) and compiled by the plan's own table base (`buildTableBase`, with the stop-year
 * lever's offset and the plan's left-over credit): that one compile is the what-if's many-futures run (2,000 paths on
 * the spine, the committed curve's 16,000-path candidate on the date route), and its one named future is the rows,
 * through the core the plan's table uses (`tableRequestsOn`). The track is always the plan's (KTD12): it picks the
 * reading (the floor pass's survival or the full one's) and `ledgerTrack` for the rows, never what is run.
 * KTD11's check sits here: the plan's and the what-if's many-futures parameters must match on paths, horizon and the
 * number of people, on the same seed, or the builder refuses by name before any request.
 *
 * THE ONE-KEY RULE (insights 094 and 159). The lanes carry no epoch; their only defence is that a newer request
 * supersedes an older one. So every slot state carries a key — the answer key plus the bundle key, or the refusal's
 * key — and a result renders only on its key ({@link whatIfSlotView}). A refusal, the empty bundle and "back to the
 * plan" each move the key, so a late result from an earlier key is dropped. Nothing skips a request because the bundle
 * looks like what is shown: every `ask` with a runnable state sends its requests. Each slot's lanes (the many-futures
 * run, the two named futures, and the plan run that only the working route's subsidy-rules health line asks for,
 * {@link PlanHealth}) are made ONCE, with the slot; they call only `engine.run`, never the date search, the solve or the
 * store's epoch setters, and an `EngineResetError` reaches the lane unwrapped, so the lane re-sends (insight 113).
 *
 * THE ONE CORE (Act 6 · RC11): the builder and the slot are `copyRunFor` and `createCopySlot` over any writer of the
 * committed draft's copy; a what-if is the core over `applyBundle`, a Stress Test bar the core over `src/intake/stress.ts`'s
 * writers (`stressRun.ts`), so the plan's reading, KTD11's check and the one-key rule are written once.
 */
import { applyBundle, type WhatIfRefusal } from '@intake/whatIf'
import { buildTableBase, carriedWorkingYearLeftOver, workingYearLeftOverShownState, type TableBase } from '@intake/intakeMap'
import { DATE_SEARCH_PATHS, offsetReading } from '@engine/dateSearch'
import { engineRunLane, type EngineRunRequest, type Lane, type LaneResult } from '@store/runLanes'
import type { ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import {
  canonicalIdentityToken,
  type DateOffsetReading,
  type DateSearchOutcome,
  type Headline,
  type LedgerYearRow,
  type SimulationParams,
  type SimulationResult,
  type SurvivorReading,
  type TaxAwareDistribution,
  type WhatIfLeverV6,
} from '@shared/model'
import { answerKey, tableRequestsOn, type TableMeta, type TableRun, type TableView, type ViewRequest } from './tableRun'

/** A many-futures reading, in the statistic the plan's pinned answer reads. */
export type WhatIfReading =
  /** All retired: the spine run's own headline (the store's for the plan; the copy's run for the what-if). */
  | { readonly kind: 'headline'; readonly headline: Headline }
  /** Working: one offset of the §3c curve at the final tier — the committed curve's entry for the plan, the same
   *  producer (`offsetReading`) over the what-if's own run for the what-if. `track` is the pass it reads, the plan's
   *  table base's (`buildTableBase`, KTD12): `floor` is the essentials-only pass (a floor-keyed band, the lifestyle track
   *  undated), and every caption of it says so (`ringFace`), on both sides alike. */
  | { readonly kind: 'offset'; readonly reading: DateOffsetReading; readonly track: 'full' | 'floor' }

/** The runner's own refusals, beside the copy's (whatever wrote the copy: a what-if's bundle, a stress). */
export type RunnerRefusal =
  /** The live draft carries no seed (never on a committed final answer; a calm refusal, never a guessed seed). */
  | { readonly kind: 'no-seed' }
  /** KTD11: the two runs would not share futures. No version-1 lever can cause it; an inside check. */
  | { readonly kind: 'futures-differ'; readonly field: 'paths' | 'maxHorizonYears' | 'people' | 'seed' }

/** Why a what-if cannot run: the bundle's own refusal, or the runner's. */
export type WhatIfRunRefusal = WhatIfRefusal | RunnerRefusal

/**
 * A copy of the committed draft to run, written by its caller (the what-if's bundle through `applyBundle`; Act 6 · RC11's
 * stresses through `src/intake/stress.ts`), or the writer's own refusal by name. `stopOffsetYears` is the stop-year
 * lever's offset (absent: the plan's own base offset).
 */
export type DraftCopy<R> = { readonly ok: true; readonly draft: ScenarioDraft; readonly stopOffsetYears?: number } | { readonly ok: false; readonly refusal: R }

type TableWithheldReason = Extract<TableRun, { kind: 'withheld' }>['reason']

/**
 * THE HEALTH LINE'S PLAN SIDE (the register's Tier 0 *The subsidy-rules comparison lost its lifetime health-cost line with
 * RC10…*; council 2026-07-03: the rules move health costs far more than the odds). Where the bundle tries the subsidy
 * rules, Analysis prints each side's lifetime health cost beside the odds, so the plan's figure must come off the same
 * futures as the what-if's. All retired: the committed spine run kept its futures, so its figure is read off them (no
 * run; `plan` is undefined where that run carried no tax surfaces). Working: the committed answer keeps only its curve,
 * so the plan's own candidate at its base offset runs on the plan's seed (`planRun`, the same compile the empty bundle
 * makes); this line is that run's one reader, and nothing else in the slot waits for it.
 */
export type PlanHealth =
  | { readonly kind: 'known'; readonly plan: number | undefined }
  | { readonly kind: 'run'; readonly planRun: EngineRunRequest }

/** Does a bundle try the subsidy rules (the one lever the health line serves)? */
export const triesSubsidyRules = (bundle: readonly WhatIfLeverV6[]): boolean => bundle.some((l) => l.kind === 'aca-subsidy')

/** One slot's state for a committed answer and a copy (`R`: the copy writer's refusals). Every arm carries its key. */
export type CopyRun<R> =
  | {
      readonly kind: 'run'
      readonly key: string
      readonly answerKey: string
      readonly bundleKey: string
      readonly track: 'full' | 'floor'
      /** The plan's many-futures reading: the store's own, no run. */
      readonly plan: WhatIfReading
      /** The what-if's many-futures run, and the offset it reads at (the date route; absent on the spine). */
      readonly many: EngineRunRequest
      readonly offsetYears?: number
      /** The what-if's rows: the meta and the two named futures' requests, from the plan's table core. */
      readonly meta: TableMeta
      readonly views: Readonly<Record<TableView, ViewRequest>>
      /** The plan's side of the health line (present only where the bundle tries the subsidy rules, {@link triesSubsidyRules}). */
      readonly health?: PlanHealth
    }
  | { readonly kind: 'refused'; readonly key: string; readonly bundleKey: string; readonly refusal: R | RunnerRefusal }
  | { readonly kind: 'withheld'; readonly key: string; readonly bundleKey: string; readonly reason: TableWithheldReason }
  /** No final answer yet (pending, provisional, or none). */
  | { readonly kind: 'waiting'; readonly key: string; readonly bundleKey: string }
  | { readonly kind: 'answer-error'; readonly key: string; readonly bundleKey: string }

/** One what-if slot's state for a committed answer and a bundle. */
export type WhatIfRun = CopyRun<WhatIfRefusal>

/**
 * KTD11: do two many-futures runs share futures? `buildDraws` reads only the seed, the path count, the horizon and the
 * number of people, so those four must match. Returns the first field that differs, or null.
 */
export function futuresDiffer(
  a: SimulationParams,
  seedA: number,
  b: SimulationParams,
  seedB: number,
): 'paths' | 'maxHorizonYears' | 'people' | 'seed' | null {
  if (a.paths !== b.paths) return 'paths'
  if (a.maxHorizonYears !== b.maxHorizonYears) return 'maxHorizonYears'
  if (a.people.length !== b.people.length) return 'people'
  if (seedA !== seedB) return 'seed'
  return null
}

/** The plan's many-futures reading off its committed answer, and the seed that answer ran on (no run). */
function planReading(
  answer: Extract<ModelAnswer, { kind: 'headline' | 'date' }>,
  base: Extract<TableBase, { kind: 'run' }>,
): { readonly reading: WhatIfReading; readonly seed: number } | null {
  if (answer.kind === 'headline') return { reading: { kind: 'headline', headline: answer.result.headline }, seed: answer.result.seed }
  const outcome: DateSearchOutcome = answer.outcome
  if (outcome.kind !== 'dates' || base.stopOffsetYears === undefined) return null
  const curve = (base.track === 'floor' ? outcome.floor : outcome.lifestyle).curve
  const reading = curve[base.stopOffsetYears]
  return reading === undefined ? null : { reading: { kind: 'offset', reading, track: base.track }, seed: outcome.seed }
}

/**
 * THE ONE PLAN READING (Act 6, plan 4.0 "One plan reading"): the plan's own many-futures reading for the ring on
 * Snapshot and the right half of Probability, from the same composer the what-if compares against, so two derivations
 * of one reading never exist. All retired: the committed headline. Working: the committed curve's entry at the offset
 * `buildTableBase` decides (the band's, on the band's track; with no date, the full track at the window's top). `null`
 * where the answer carries no reading (not resolved, no date search yet, or a base the table builder withholds).
 */
export function planReadingFor(answer: ModelAnswer): WhatIfReading | null {
  if (answer.kind === 'headline') return { kind: 'headline', headline: answer.result.headline }
  if (answer.kind !== 'date') return null
  const base = buildTableBase(answer.draft, answer.outcome)
  if (base.kind !== 'run') return null
  return planReading(answer, base)?.reading ?? null
}

/**
 * THE RETIRED ROUTE'S EXTRA READINGS (Act 6 · RC4, Probability's halves): beside the count, a spine run carries the
 * survivor reading (present iff the run opted into the survivor surface and a survivor phase occurred), the essentials
 * reading (present iff a budget rode the run) and the balance each future ends on (`terminalValuesReal`: the balance
 * when the second of you dies, capped at the plan's last year). Carried verbatim, never re-derived (insight 045); the
 * median is the one figure computed here, the plain middle of the sorted futures.
 */
export interface HeadlineExtras {
  readonly survivorReading?: SurvivorReading
  readonly floorReading?: Headline
  /** The median of `distribution.terminalValuesReal`, in today's dollars; absent on an empty sample. */
  readonly terminalMedianReal?: number
}

/** The middle of a sample (the mean of the two middle values on an even count); undefined on an empty one. */
export function medianOf(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** A run's lifetime health cost: the median of each future's own total (its net marketplace premiums plus its Medicare
 *  costs, summed per future first, in today's dollars), so the figure is one future's, never a sum of two medians.
 *  Undefined where the run carried no tax surfaces or an empty sample. Health Care's hero reads the same statistic. */
export function lifetimeHealthMedianReal(ta: TaxAwareDistribution | undefined): number | undefined {
  if (ta === undefined || ta.lifetimeNetPremiumReal.length === 0) return undefined
  return medianOf(ta.lifetimeNetPremiumReal.map((premium, i) => premium + (ta.lifetimeMedicareCostReal[i] ?? 0)))
}

/** The extras a spine run's result carries (the plan's from its committed answer; the what-if's from its own run). */
export function headlineExtras(result: SimulationResult): HeadlineExtras {
  // A result with no sample (a test's hand-built answer) has no median: absent, never a guessed figure.
  const sample = result.distribution?.terminalValuesReal
  const median = Array.isArray(sample) ? medianOf(sample) : undefined
  return {
    ...(result.survivorReading !== undefined ? { survivorReading: result.survivorReading } : {}),
    ...(result.floorReading !== undefined ? { floorReading: result.floorReading } : {}),
    ...(median !== undefined ? { terminalMedianReal: median } : {}),
  }
}

/**
 * The what-if's many-futures reading from its run, in the plan's statistic: the spine's headline; or, on the date route,
 * the §3c reading of the plan's track (the floor pass's survival on the floor track) at the what-if's offset.
 */
export function whatIfReading(
  result: SimulationResult,
  track: 'full' | 'floor',
  offsetYears: number | undefined,
): WhatIfReading | null {
  if (offsetYears === undefined) return { kind: 'headline', headline: result.headline }
  const survivalFraction = track === 'floor' ? result.distribution.floor?.survivalFraction : result.distribution.survivalFraction
  if (survivalFraction === undefined) return null
  return { kind: 'offset', reading: offsetReading({ offsetYears, survivalFraction }, DATE_SEARCH_PATHS.final), track }
}

/** The request builder for one what-if slot: its bundle applied to the copy (`applyBundle`), through the one core. */
export function whatIfRunFor(answer: ModelAnswer, liveSeed: number | undefined, bundle: readonly WhatIfLeverV6[]): WhatIfRun {
  return copyRunFor(answer, liveSeed, canonicalIdentityToken(bundle), (draft) => applyBundle(draft, bundle), triesSubsidyRules(bundle))
}

/**
 * THE ONE CORE every slot's requests come from (the what-if's bundle, RC11's stresses): the committed FINAL answer's draft
 * copied by `makeCopy`, compiled by the plan's own table base on the plan's futures, the plan's reading off the committed
 * answer (no run), KTD11's check, and the key (`bundleKey` names the copy; the answer's key joins it). `health` asks for
 * the health line's plan side (the what-if's subsidy-rules bundle only).
 */
export function copyRunFor<R extends { readonly kind: string }>(
  answer: ModelAnswer,
  liveSeed: number | undefined,
  bundleKey: string,
  makeCopy: (draft: ScenarioDraft) => DraftCopy<R>,
  health: boolean,
): CopyRun<R> {
  type Run = CopyRun<R>
  if (answer.kind === 'compute-error') return { kind: 'answer-error', key: `answer-error|${bundleKey}`, bundleKey }
  if (answer.kind === 'inputs-incomplete') return { kind: 'withheld', key: `withheld:no-run|${bundleKey}`, bundleKey, reason: 'no-run' }
  if ((answer.kind !== 'headline' && answer.kind !== 'date') || answer.tier !== 'final') {
    return { kind: 'waiting', key: `waiting|${bundleKey}`, bundleKey }
  }
  const aKey = answerKey(answer)
  const key = `${aKey}|${bundleKey}`
  const refused = (refusal: R | RunnerRefusal): Run => ({ kind: 'refused', key: `${key}|${refusal.kind}`, bundleKey, refusal })
  const outcome = answer.kind === 'date' ? answer.outcome : undefined
  const planBase = buildTableBase(answer.draft, outcome)
  if (planBase.kind === 'withheld') {
    return { kind: 'withheld', key: `${aKey}|withheld:${planBase.reason}|${bundleKey}`, bundleKey, reason: planBase.reason }
  }
  if (liveSeed === undefined) return refused({ kind: 'no-seed' })
  const applied = makeCopy(answer.draft)
  if (!applied.ok) return refused(applied.refusal)
  const base = buildTableBase(applied.draft, outcome, {
    ...(applied.stopOffsetYears !== undefined ? { offsetYears: applied.stopOffsetYears } : {}),
    leftOver: { fromPlan: carriedWorkingYearLeftOver(answer.draft) },
  })
  if (base.kind === 'withheld') {
    return { kind: 'withheld', key: `${aKey}|withheld:${base.reason}|${bundleKey}`, bundleKey, reason: base.reason }
  }
  const plan = planReading(answer, planBase)
  if (plan === null) return { kind: 'withheld', key: `${aKey}|withheld:no-date-answer|${bundleKey}`, bundleKey, reason: 'no-date-answer' }
  const differ = futuresDiffer(planBase.params, plan.seed, base.params, liveSeed)
  if (differ !== null) return refused({ kind: 'futures-differ', field: differ })
  const { meta, views } = tableRequestsOn(applied.draft, base, workingYearLeftOverShownState(answer.draft))
  // The spine's committed run kept its futures (a test's hand-built answer may carry none: no figure, never a guess).
  const planHealth: PlanHealth | undefined = !health
    ? undefined
    : answer.kind === 'headline'
      ? { kind: 'known', plan: lifetimeHealthMedianReal(answer.result.distribution?.taxAware) }
      : { kind: 'run', planRun: { params: planBase.params, seed: plan.seed } }
  return {
    kind: 'run',
    key,
    answerKey: aKey,
    bundleKey,
    track: base.track,
    plan: plan.reading,
    // The spine's run asks for the survivor surface too (a parallel observed surface: it perturbs no draw, so the count
    // is byte-identical to the run without it), so the what-if half reads its survivor row as the plan's half does.
    many: { params: base.params, seed: liveSeed, ...(base.stopOffsetYears === undefined ? { options: { survivorConditioned: true } } : {}) },
    ...(base.stopOffsetYears !== undefined ? { offsetYears: base.stopOffsetYears } : {}),
    meta,
    views,
    ...(planHealth !== undefined ? { health: planHealth } : {}),
  }
}

// ---------------------------------------------------------------------------
// The slot runner
// ---------------------------------------------------------------------------

/** A delivered part, tagged with the key it was asked under. */
interface Tagged {
  readonly key: string
  readonly answerKey: string
  readonly bundleKey: string
}

/** The plan's reading and the what-if's, from one answer (so a pair never mixes two answers). */
export interface ReadingPair {
  readonly plan: WhatIfReading
  readonly whatIf: WhatIfReading
  /** The what-if run's extra readings on the spine (absent on the date route). */
  readonly extras?: HeadlineExtras
  /** The what-if run's lifetime health cost ({@link lifetimeHealthMedianReal}), on both routes; read only where the bundle
   *  tries the subsidy rules, and absent where the run carried no tax surfaces. */
  readonly whatIfHealthReal?: number
}

/** The what-if's rows for one view, with the meta of the compile that produced them. */
export interface WhatIfRows {
  readonly rows: readonly LedgerYearRow[]
  readonly meta: TableMeta
}

type Part<T> = Tagged & ({ readonly kind: 'ok'; readonly value: T } | { readonly kind: 'error' })

export interface CopySlotSnapshot<R> {
  /** The newest state asked for (its key is the slot's key). */
  readonly run: CopyRun<R>
  /** The newest delivered result of each part, each with its own key (it may belong to an older ask). */
  readonly many?: Part<ReadingPair>
  readonly steady?: Part<WhatIfRows>
  readonly rough?: Part<WhatIfRows>
  /** The plan's lifetime health cost for the health line ({@link PlanHealth}); asked only where the bundle tries the
   *  subsidy rules. */
  readonly planHealth?: Part<number>
}

export type WhatIfSlotSnapshot = CopySlotSnapshot<WhatIfRefusal>

/** A slot's lanes, made once with the slot. `plan` runs only the working route's plan side of the health line; a caller
 *  that passes no `plan` lane (a test's three) asks for none, and the line stays unprinted. */
export interface WhatIfSlotLanes {
  readonly many: Lane<EngineRunRequest, SimulationResult>
  readonly steady: Lane<EngineRunRequest, SimulationResult>
  readonly rough: Lane<EngineRunRequest, SimulationResult>
  readonly plan?: Lane<EngineRunRequest, SimulationResult>
}

/** A copy slot's lanes: the many-futures run's always; the two named futures' only where the slot's reader shows rows
 *  (a stress bar reads its count alone, so RC11's slots ask for no rows). */
export interface CopySlotLanes {
  readonly many: Lane<EngineRunRequest, SimulationResult>
  readonly steady?: Lane<EngineRunRequest, SimulationResult>
  readonly rough?: Lane<EngineRunRequest, SimulationResult>
  readonly plan?: Lane<EngineRunRequest, SimulationResult>
}

export interface CopySlot<A, R> {
  /** Ask for the copy of `a` on the store's committed `answer`, on the live draft's seed. Always sends the runnable
   *  state's requests; never skips because the copy looks like what is shown. */
  ask(answer: ModelAnswer, liveSeed: number | undefined, a: A): void
  getSnapshot(): CopySlotSnapshot<R>
  subscribe(listener: () => void): () => void
}

export type WhatIfSlot = CopySlot<readonly WhatIfLeverV6[], WhatIfRefusal>

/** One what-if slot: its lanes (made here, once), its newest state and its newest delivered parts. */
export function createWhatIfSlot(
  lanes: WhatIfSlotLanes = { many: engineRunLane(), steady: engineRunLane(), rough: engineRunLane(), plan: engineRunLane() },
): WhatIfSlot {
  return createCopySlot(lanes, whatIfRunFor)
}

/** One slot over the one core: `build` turns the ask into its state ({@link copyRunFor} under it), the lanes are made by
 *  the caller once, and the one-key rule holds for every reader. */
export function createCopySlot<A, R>(lanes: CopySlotLanes, build: (answer: ModelAnswer, liveSeed: number | undefined, a: A) => CopyRun<R>): CopySlot<A, R> {
  let snapshot: CopySlotSnapshot<R> = { run: { kind: 'waiting', key: 'waiting|', bundleKey: '' } }
  const listeners = new Set<() => void>()
  const set = (next: Partial<CopySlotSnapshot<R>>): void => {
    snapshot = { ...snapshot, ...next }
    for (const l of listeners) l()
  }
  return {
    ask(answer, liveSeed, a) {
      const run = build(answer, liveSeed, a)
      // A retry on the same key (a same-bundle Refresh after a failed run) shows the run working, never the failure it
      // is retrying: a part that failed on this very key is dropped until the retry delivers.
      const keep = <T>(p: Part<T> | undefined): Part<T> | undefined => (p !== undefined && run.kind === 'run' && p.kind === 'error' && p.key === run.key ? undefined : p)
      const many = keep(snapshot.many)
      const steady = keep(snapshot.steady)
      const rough = keep(snapshot.rough)
      const planHealth = keep(snapshot.planHealth)
      snapshot = {
        run,
        ...(many !== undefined ? { many } : {}),
        ...(steady !== undefined ? { steady } : {}),
        ...(rough !== undefined ? { rough } : {}),
        ...(planHealth !== undefined ? { planHealth } : {}),
      }
      for (const l of listeners) l()
      if (run.kind !== 'run') return
      const tag: Tagged = { key: run.key, answerKey: run.answerKey, bundleKey: run.bundleKey }
      void lanes.many.request(run.many).then((res: LaneResult<SimulationResult>) => {
        if (res.kind === 'superseded') return
        const whatIf = res.kind === 'ok' ? whatIfReading(res.value, run.track, run.offsetYears) : null
        const extras = res.kind === 'ok' && run.offsetYears === undefined ? headlineExtras(res.value) : undefined
        const health = res.kind === 'ok' && run.health !== undefined ? lifetimeHealthMedianReal(res.value.distribution.taxAware) : undefined
        set({
          many:
            whatIf === null
              ? { ...tag, kind: 'error' }
              : {
                  ...tag,
                  kind: 'ok',
                  value: { plan: run.plan, whatIf, ...(extras !== undefined ? { extras } : {}), ...(health !== undefined ? { whatIfHealthReal: health } : {}) },
                },
        })
      })
      // The health line's plan side: the spine's figure off its committed futures, at once; the working route's off the
      // plan's own run on its own lane, so the ring never waits for it.
      const h = run.health
      if (h?.kind === 'known') {
        set({ planHealth: h.plan === undefined ? { ...tag, kind: 'error' } : { ...tag, kind: 'ok', value: h.plan } })
      } else if (h?.kind === 'run' && lanes.plan !== undefined) {
        void lanes.plan.request(h.planRun).then((res) => {
          if (res.kind === 'superseded') return
          const figure = res.kind === 'ok' ? lifetimeHealthMedianReal(res.value.distribution.taxAware) : undefined
          set({ planHealth: figure === undefined ? { ...tag, kind: 'error' } : { ...tag, kind: 'ok', value: figure } })
        })
      }
      for (const v of ['steady', 'rough'] as const) {
        const deliver = (part: Part<WhatIfRows>) => set(v === 'steady' ? { steady: part } : { rough: part })
        const view = run.views[v]
        const lane = lanes[v]
        if (lane === undefined) continue
        if (view.kind === 'refused') {
          deliver({ ...tag, kind: 'error' })
          continue
        }
        void lane.request(view.request).then((res) => {
          if (res.kind === 'superseded') return
          const rows = res.kind === 'ok' ? res.value.distribution.ledgerRows : undefined
          deliver(rows !== undefined && rows.length > 0 ? { ...tag, kind: 'ok', value: { rows, meta: run.meta } } : { ...tag, kind: 'error' })
        })
      }
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** One part as it may render. */
export type PartView<T> =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  /** `updating`: the same bundle's result on an older answer, shown marked while the newer one is worked out. */
  | { readonly kind: 'ready'; readonly value: T; readonly answerKey: string; readonly updating: boolean }

export type CopySlotView<R> =
  | { readonly kind: 'refused'; readonly refusal: R | RunnerRefusal }
  | { readonly kind: 'withheld'; readonly reason: TableWithheldReason }
  | { readonly kind: 'answer-error' }
  | {
      readonly kind: 'shown'
      readonly many: PartView<ReadingPair>
      readonly steady: PartView<WhatIfRows>
      readonly rough: PartView<WhatIfRows>
      /** The plan's side of the health line (loading where the bundle tries no subsidy rules: nothing asks for it). */
      readonly planHealth: PartView<number>
    }

export type WhatIfSlotView = CopySlotView<WhatIfRefusal>

/**
 * THE ONE-KEY RULE, as the slot renders: a part renders as current only on the slot's own key; the same bundle's part on
 * an older answer renders marked as updating (as the table keeps its prior rows), and never under a refusal or a
 * withheld state; a part asked under ANY other bundle never renders (a lever pulled and put back while its run was in
 * flight shows the put-back run, never the pulled one).
 */
export function whatIfSlotView<R>(s: CopySlotSnapshot<R>): CopySlotView<R> {
  const run = s.run
  if (run.kind === 'refused') return { kind: 'refused', refusal: run.refusal }
  if (run.kind === 'withheld') return { kind: 'withheld', reason: run.reason }
  if (run.kind === 'answer-error') return { kind: 'answer-error' }
  const view = <T>(part: Part<T> | undefined): PartView<T> => {
    if (part === undefined || part.bundleKey !== run.bundleKey) return { kind: 'loading' }
    const current = run.kind === 'run' && part.key === run.key
    if (part.kind === 'error') return current ? { kind: 'error' } : { kind: 'loading' }
    return { kind: 'ready', value: part.value, answerKey: part.answerKey, updating: !current }
  }
  return { kind: 'shown', many: view(s.many), steady: view(s.steady), rough: view(s.rough), planHealth: view(s.planHealth) }
}
