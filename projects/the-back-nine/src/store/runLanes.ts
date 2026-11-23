/**
 * src/store/runLanes.ts — the workbench's run lanes (workbench plan U5, KTD13).
 *
 * The year-by-year table and each what-if on screen get a LANE: an independent queue of engine runs,
 * so several workbench runs can be in flight without one silencing another (the single module-level
 * ticket in `controlPreview.ts` makes every preview stale the moment any other starts; that runner
 * stays with the front room's sheets).
 *
 * One lane:
 *  - keeps ONE call in flight and holds only its NEWEST request until that call settles, so rapid
 *    commits collapse to the last one (ten commits start at most two runs);
 *  - is TOTAL: every request resolves to a value, `superseded` (a newer request on the same lane
 *    replaced it; resolved the moment it is replaced), or a calm error. It never rejects;
 *  - when a call is rejected because the store RESET the worker (`EngineResetError`: an edit during a
 *    pending solve, `engineClient.ts`), re-sends its newest request: the reset killed a run nobody
 *    asked to stop;
 *  - when the worker has DIED (`EngineDeadError`) or the transport failed, gives the request in flight
 *    its calm error and never re-sends it (a dead worker refuses every later call at once, so a newer
 *    request still waiting takes the same calm error on its own one send).
 *
 * The lanes share the one engine worker in order (one Comlink port, FIFO). On the main-thread fallback
 * every call blocks the page, so a group runs ONE lane's call at a time, first come first served.
 *
 * A lane never resets the worker and never moves the store's epoch (`setLatestEpoch` /
 * `setLatestSpendEpoch`): it calls only the run function it was built with, and this module imports
 * nothing from `memoryModel`. No lane has a write path to the vault.
 */
import { fromWire } from '@engine/engineWire'
import type { RunOptions } from '@engine/engineProtocol'
import type { SimulationParams, SimulationResult } from '@shared/model'
import { engineClient, isEngineReset } from './engineClient'

/** What a lane's run function returns: the engine's own answer, or its calm refusal. */
export type LaneOutcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string }

/** What a request resolves to. Never a rejection. */
export type LaneResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  /** A newer request on the same lane replaced this one: the caller renders nothing for it. */
  | { readonly kind: 'superseded' }
  | { readonly kind: 'error'; readonly reason: string }

export interface Lane<Req, T> {
  /** Ask for a run. Resolves with this request's result, or `superseded` the moment a newer request
   *  on this lane replaces it. */
  request(req: Req): Promise<LaneResult<T>>
}

export interface LaneGroup {
  /** A new lane over `run`, the one engine call it makes. */
  lane<Req, T>(run: (req: Req) => Promise<LaneOutcome<T>>): Lane<Req, T>
}

const SUPERSEDED = { kind: 'superseded' } as const

/** The fallback's turn: one call at a time across every lane of a group, in the order asked. In the
 *  worker it is always granted (the port already orders the calls). */
function createTurns(runsInWorker: () => boolean) {
  let held = false
  /** Each waiting lane's start, called with the turn already held for it; false if it no longer has
   *  anything to start (the turn then passes on). */
  const queue: (() => boolean)[] = []
  return {
    take(startHeld: () => boolean): boolean {
      if (runsInWorker()) return true
      if (!held && queue.length === 0) {
        held = true
        return true
      }
      if (!queue.includes(startHeld)) queue.push(startHeld)
      return false
    },
    give(): void {
      if (runsInWorker()) return
      held = false
      while (queue.length > 0) {
        held = true
        if (queue.shift()!()) return
        held = false
      }
    },
  }
}

interface Ask<Req, T> {
  readonly req: Req
  readonly resolve: (r: LaneResult<T>) => void
  /** Set once its promise has resolved (superseded, or its result delivered). */
  done: boolean
}

function finish<Req, T>(ask: Ask<Req, T>, result: LaneResult<T>): void {
  if (ask.done) return
  ask.done = true
  ask.resolve(result)
}

/** A group of lanes sharing one engine. `runsInWorker` false ⇒ the main-thread fallback. */
export function createLaneGroup(opts: { readonly runsInWorker: () => boolean }): LaneGroup {
  const turns = createTurns(opts.runsInWorker)

  return {
    lane<Req, T>(run: (req: Req) => Promise<LaneOutcome<T>>): Lane<Req, T> {
      let running: Ask<Req, T> | null = null
      let newest: Ask<Req, T> | null = null

      const start = (ask: Ask<Req, T>): void => {
        running = ask
        let call: Promise<LaneOutcome<T>>
        try {
          call = run(ask.req)
        } catch (e) {
          call = Promise.reject(e)
        }
        call.then(
          (out) => {
            running = null
            turns.give()
            finish(ask, out.ok ? { kind: 'ok', value: out.value } : { kind: 'error', reason: out.reason })
            pump()
          },
          (e: unknown) => {
            running = null
            turns.give()
            if (isEngineReset(e)) {
              // The store killed the worker under this call: re-send the newest request, which is this
              // one unless a newer request is already waiting.
              if (newest === null && !ask.done) newest = ask
            } else {
              finish(ask, { kind: 'error', reason: e instanceof Error ? e.message : 'the run failed' })
            }
            pump()
          },
        )
      }

      /** Start the newest request with the fallback's turn already held for this lane. */
      const startHeld = (): boolean => {
        if (running !== null || newest === null) return false
        const ask = newest
        newest = null
        start(ask)
        return true
      }

      const pump = (): void => {
        if (running !== null || newest === null) return
        if (!turns.take(startHeld)) return
        const ask = newest
        newest = null
        start(ask)
      }

      return {
        request(req: Req): Promise<LaneResult<T>> {
          return new Promise<LaneResult<T>>((resolve) => {
            if (newest !== null) finish(newest, SUPERSEDED)
            else if (running !== null) finish(running, SUPERSEDED)
            newest = { req, resolve, done: false }
            pump()
          })
        },
      }
    },
  }
}

/** The workbench's lanes, on the app's one engine. */
export const workbenchLanes: LaneGroup = createLaneGroup({ runsInWorker: () => engineClient.runningInWorker })

/** One `simulate` through the worker's `run`: the table's named futures and their ledger rows ride
 *  `options` (`RunOptions`). */
export interface EngineRunRequest {
  readonly params: SimulationParams
  readonly seed: number
  readonly options?: RunOptions
}

/** A lane whose one call is the engine's `run`, decoded off the wire (its calm-error and infeasible
 *  arms become the lane's calm error). */
export function engineRunLane(group: LaneGroup = workbenchLanes): Lane<EngineRunRequest, SimulationResult> {
  return group.lane(async (r: EngineRunRequest): Promise<LaneOutcome<SimulationResult>> => {
    const decoded = fromWire(await engineClient.engine.run(r.params, r.seed, r.options))
    return decoded.ok ? { ok: true, value: decoded.result } : { ok: false, reason: decoded.reason }
  })
}
