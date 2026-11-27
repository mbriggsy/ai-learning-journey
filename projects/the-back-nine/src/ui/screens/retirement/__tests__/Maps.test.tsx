// @vitest-environment jsdom
/**
 * Retirement → Cash Flows → Maps' page wiring (milestone 4's review, T1). `mapsView.test.ts` pins the composer's tiles
 * against the Summary's cells; this pins that `Maps.tsx` draws them where they belong: the Breakdown (the only view
 * below the laptop tier) puts the money in under its own total and the money out under its own, every tile and part
 * the composer's words in the composer's order. A swap of the two sides' tiles (money in twice, out never) reds here.
 * Built from a REAL `mapsView` output: the `dip` seed's steady run, one working year, the laptop hook stubbed off.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { simulate } from '@engine/simulate'
import { DATE_OFFSET_WINDOW_TOP } from '@engine/dateSearch'
import type { ModelAnswer } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../devSeeds'
import { copy } from '../../../copy'
import { tableRunFor } from '../../../workbench/tableRun'
import { mapsView, type MapTile } from '../mapsView'
import { Maps } from '../Maps'

vi.mock('../../../kit', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../../kit')>()), useLaptop: () => false }))

afterEach(cleanup)

/** `dip`'s steady run, from the same request the page makes (a working seed at a band four years out, lifestyle). */
function dipSteady() {
  const draft = DEV_SEEDS['dip']!
  const run = tableRunFor({
    kind: 'date',
    tier: 'final',
    draft,
    outcome: { kind: 'dates', tier: 'final', windowTopYears: DATE_OFFSET_WINDOW_TOP, seed: 1, band: { offsetYears: 4, track: 'lifestyle' } },
    inputKey: 'k',
  } as unknown as ModelAnswer)
  if (run.kind !== 'run') throw new Error(`dip: no table run (${run.kind})`)
  const ask = run.views.steady
  if (ask.kind !== 'run') throw new Error('dip: no steady run')
  const res = simulate(ask.request.params, ask.request.seed, ask.request.options)
  if (res.indeterminate || res.infeasible) throw new Error('dip: the steady run came back without rows')
  return { meta: run.meta, rows: res.distribution.ledgerRows ?? [] }
}

/** Each tile's words as the page draws them: its name and amount, then each part's. */
const drawnTiles = (side: Element) =>
  [...side.querySelectorAll('[data-maps-tile]')].map((tile) => ({
    id: tile.getAttribute('data-maps-tile'),
    words: [...tile.querySelectorAll(':scope > div:first-child p')].map((p) => p.textContent),
    leaves: [...tile.querySelectorAll('[data-maps-leaf]')].map((leaf) => [leaf.getAttribute('data-maps-leaf'), ...[...leaf.querySelectorAll('p')].map((p) => p.textContent)]),
  }))

const composedTiles = (tiles: readonly MapTile[]) =>
  tiles.map((t) => ({ id: t.id, words: [t.name, t.text], leaves: t.leaves.map((l) => [l.id, l.name, l.text]) }))

describe('Maps: the Breakdown draws each side’s own tiles', () => {
  it('money in under Total inflows and money out under Total outflows, every tile and part the composer’s, in order', () => {
    const { meta, rows } = dipSteady()
    const view = mapsView({ rows, meta, future: 'steady', t: 1, choice: 'flow', runName: copy.workbenchRailPlanLabel, roughEndYear: 1995, readOnly: false })
    if (view.body.kind !== 'map') throw new Error(`[test setup] dip t=1 draws no map: ${JSON.stringify(view.body)}`)
    const body = view.body
    // [test setup] both sides hold tiles, and they differ, so a swap would show.
    expect(body.inTiles.length).toBeGreaterThan(0)
    expect(body.outTiles.length).toBeGreaterThan(0)
    expect(body.outTiles.some((t) => t.leaves.length > 0)).toBe(true)

    const { container } = render(<Maps view={view} onYear={() => {}} />)
    expect(container.querySelector('[data-maps]')).toHaveAttribute('data-maps', 'breakdown')
    const side = (s: 'in' | 'out') => container.querySelector(`[data-maps-side="${s}"]`)!
    expect(side('in').querySelector('[data-maps-total="in"]')).toHaveTextContent(body.totalInWords)
    expect(side('out').querySelector('[data-maps-total="out"]')).toHaveTextContent(body.totalOutWords)
    expect(drawnTiles(side('in'))).toEqual(composedTiles(body.inTiles))
    expect(drawnTiles(side('out'))).toEqual(composedTiles(body.outTiles))
  })
})

describe('Maps: a run of one year draws no slider (milestone 4’s review, M3)', () => {
  it('that year’s label with its "Runs out" mark and the readout, and no slider to move', () => {
    const { meta, rows } = dipSteady()
    // A plan already running out in its first year (every `failing*` seed): one row, run out.
    const one = [{ ...rows[0]!, ranOut: true }]
    const view = mapsView({ rows: one, meta, future: 'steady', t: null, choice: 'flow', runName: copy.workbenchRailPlanLabel, roughEndYear: 1995, readOnly: false })
    const { container } = render(<Maps view={view} onYear={() => {}} />)
    expect(screen.queryByRole('slider')).toBeNull()
    const ends = container.querySelectorAll('[data-maps-end]')
    expect(ends).toHaveLength(1)
    expect(ends[0]).toHaveTextContent(String(view.scrubber.years[0]!.year))
    expect(ends[0]).toHaveTextContent(copy.cashFlowsShortYear)
    expect(container.querySelector('[data-maps-year]')).toHaveTextContent(view.heading)
  })
})
