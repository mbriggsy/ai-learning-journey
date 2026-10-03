/**
 * `evalSteps.ts` — the drivers' contract (the worker-pool build, 2026-10-03). The sync driver must be
 * the straight-line code it replaced, call for call: a result is evaluated only when READ, once, and
 * its error surfaces at the read. The async driver must hand each call's result back in call order and
 * refuse a batch evaluator that loses or invents a result.
 */
import { describe, expect, it, vi } from 'vitest'
import type { SimulationParams } from '@shared/model'
import * as evaluate from '../evaluate'
import { onlyResult, runEvalAsync, runEvalSync, type EvalCall, type EvalResult, type EvalSteps } from '../evalSteps'

vi.mock('../evaluate', async (importOriginal) => {
  const real = await importOriginal<typeof import('../evaluate')>()
  return { ...real, evaluateCandidates: vi.fn(() => []) }
})
const evalMock = vi.mocked(evaluate.evaluateCandidates)

const call = (seed: number): EvalCall => ({ base: {} as SimulationParams, candidates: [], seed, opts: {} })

describe('runEvalSync — the straight-line code, call for call', () => {
  it('evaluates a result only when READ, in read order, and never one that is not read', () => {
    evalMock.mockClear()
    function* stage(): EvalSteps<string> {
      const r = yield [call(1), call(2), call(3)]
      r[1]!()
      r[0]!()
      return 'done' // r[2] is never read — like the grade's family after an early "unavailable"
    }
    expect(runEvalSync(stage())).toBe('done')
    expect(evalMock.mock.calls.map((c) => c[2])).toEqual([2, 1])
  })

  it('memoizes: a second read neither re-evaluates nor changes the outcome', () => {
    evalMock.mockClear()
    function* stage(): EvalSteps<boolean> {
      const r = yield [call(7)]
      return r[0]!() === r[0]!()
    }
    expect(runEvalSync(stage())).toBe(true)
    expect(evalMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces a call’s error AT THE READ — a later unread failure never fires', () => {
    evalMock.mockClear()
    evalMock.mockImplementation((_b, _c, seed) => {
      throw new Error(`boom ${seed}`)
    })
    function* stage(): EvalSteps<string> {
      const r = yield [call(1), call(2)]
      try {
        r[0]!()
      } catch (e) {
        return (e as Error).message
      }
      return 'unreachable'
    }
    expect(runEvalSync(stage())).toBe('boom 1')
    expect(evalMock).toHaveBeenCalledTimes(1)
    evalMock.mockImplementation(() => [])
  })
})

describe('runEvalAsync — results by call order, never by completion order', () => {
  it('hands the batch evaluator every call and the generator its results in call order', async () => {
    function* stage(): EvalSteps<readonly number[]> {
      const r = yield [call(10), call(20)]
      const r2 = yield [call(30)]
      return [r[0]!().length, r[1]!().length, onlyResult(r2).length]
    }
    const seen: number[][] = []
    const out = await runEvalAsync(stage(), async (calls): Promise<readonly EvalResult[]> => {
      seen.push(calls.map((c) => c.seed))
      // Complete out of order on purpose; results are placed by index.
      const results = calls.map((c) => () => new Array(c.seed / 10).fill(null))
      await Promise.resolve()
      return results
    })
    expect(seen).toEqual([[10, 20], [30]])
    expect(out).toEqual([1, 2, 3])
  })

  it('refuses a batch evaluator that returns the wrong number of results', async () => {
    function* stage(): EvalSteps<void> {
      yield [call(1), call(2)]
    }
    await expect(runEvalAsync(stage(), async () => [() => []])).rejects.toThrow(/1 results for 2 calls/)
  })
})
