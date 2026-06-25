// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { VerdictIcon, VERDICT_GLYPH, type VerdictGlyph } from '../verdictSignal'
import { OUTCOME_STATES, type OutcomeState } from '@shared/model'

afterEach(cleanup)

// A position-independent silhouette signature: the glyph's draw commands. Two states with the same
// signature would draw the SAME silhouette — invisible to the color-blind reader who has only the
// silhouette to tell them apart (back-nine-design §2). Distinct signatures are necessary (not
// sufficient — true visual distinctness is the N=1 cold-read's call); this catches an accidental
// duplicate loud.
const signature = (g: VerdictGlyph): string => JSON.stringify({ paths: g.paths, dots: g.dots ?? null })

describe('verdictSignal — the six non-color silhouettes (the color-blind reader depends on these)', () => {
  it('binds EVERY outcome state to a glyph (exhaustive — an unmapped state is a calm-but-wrong gap)', () => {
    for (const s of OUTCOME_STATES) expect(VERDICT_GLYPH[s]).toBeDefined()
    expect(Object.keys(VERDICT_GLYPH).sort()).toEqual([...OUTCOME_STATES].sort())
  })

  it('all six silhouettes are pairwise-distinct (C(6,2)=15 pairs — none draws the same shape)', () => {
    const sigs = OUTCOME_STATES.map((s) => signature(VERDICT_GLYPH[s]))
    expect(new Set(sigs).size).toBe(OUTCOME_STATES.length)
  })

  it('PLANTED FAIL: a duplicated silhouette is caught (proves the distinctness check is non-vacuous)', () => {
    // borderline and off-track forced to the SAME shape — the probe MUST flag the collision.
    const planted: Record<OutcomeState, VerdictGlyph> = {
      ...VERDICT_GLYPH,
      'off-track': VERDICT_GLYPH.borderline,
    }
    const sigs = OUTCOME_STATES.map((s) => signature(planted[s]))
    expect(new Set(sigs).size).toBeLessThan(OUTCOME_STATES.length)
  })

  it('is DECORATIVE by default (aria-hidden) — the visible verdict word carries the a11y signal, once', () => {
    const { container } = render(<VerdictIcon state="on-track" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
  })

  it('becomes a labelled role="img" when used standalone (no adjacent word)', () => {
    const { container } = render(<VerdictIcon state="off-track" label="Off track" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', 'Off track')
    expect(svg).not.toHaveAttribute('aria-hidden')
  })

  it('renders the indeterminate ellipsis as three dots (its distinct no-line silhouette)', () => {
    const { container } = render(<VerdictIcon state="indeterminate" />)
    expect(container.querySelectorAll('circle')).toHaveLength(3)
    expect(container.querySelectorAll('path')).toHaveLength(0)
  })

  it('renders a stroked-path glyph for a line state (e.g. on-track is a single check path)', () => {
    const { container } = render(<VerdictIcon state="on-track" />)
    expect(container.querySelectorAll('path')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })
})
