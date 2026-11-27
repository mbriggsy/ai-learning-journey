import { describe, expect, it } from 'vitest'
import { RC_SERIES } from '../../palette'
import { applySeriesVars, seriesVarName } from '../seriesVars'

/**
 * The start-up CSSOM write (plan 6-rightcapital-ui-plan.md, 2.1 decision 4): `--highcharts-color-N` for every
 * RC_SERIES slot, from `palette.ts`, and nothing else. A skipped slot paints Highcharts' own default hue for that series
 * (`highcharts.css`'s `:root`), a wrong name paints nothing, and a stray write could re-value a token: each is caught
 * here on a recorder standing in for `document.documentElement.style`.
 */
function record(): Array<[string, string]> {
  const writes: Array<[string, string]> = []
  applySeriesVars({ setProperty: (name, value) => writes.push([name, value]) })
  return writes
}

describe('seriesVars: the series colours written onto the root through the CSSOM', () => {
  it('writes --highcharts-color-0 to -13 from palette.ts, in order, and nothing else', () => {
    const expected = RC_SERIES.map((hex, i) => [`--highcharts-color-${i}`, hex])
    expect(record()).toEqual(expected)
  })

  it('covers all 13 of RightCapital’s categorical slots and B9’s own slot 13, the inherited IRA (the names highcharts.css and chartTheme.css read)', () => {
    expect(RC_SERIES).toHaveLength(14)
    expect(record().map(([name]) => name)).toEqual(Array.from({ length: 14 }, (_, i) => seriesVarName(i)))
  })

  it('writes every slot exactly once (no duplicate, no gap)', () => {
    const names = record().map(([name]) => name)
    expect(new Set(names).size).toBe(names.length)
  })
})
