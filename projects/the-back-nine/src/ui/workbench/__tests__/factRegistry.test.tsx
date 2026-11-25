// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import type { ScenarioDraft } from '@store/memoryModel'
import { DrawerFor } from '../../screens/profile/drawerHost'
import { expensesView, familyView, goalsView, incomeView, netWorthView, savingsView, type AddItem, type CardsPageView, type DrawerTarget } from '../../screens/profile/profileView'
import { profileStore } from '../../screens/profile/__tests__/profileStore'
import { ACCOUNT_FACTS, DRAFT_FACTS, elsewhereFacts, shownFacts, type FactDrawerId } from '../factRegistry'
import { FULL, GOVERNED } from './factDrafts'

/**
 * THE FIELD WALK (R14, R15; Act 5, U8's walk, re-pointed to the Profile drawers by Act 6 · RC13b): every field of the
 * saved plan is either edited in a Profile drawer, homed outside Profile by name (the Action Items tray's levers, Tax
 * Strategies' goal and heirs' bracket), or argued away (`factRegistry.ts`, compile-enforced at every level). This walks
 * the runtime half: every drawer the Profile pages offer (each card, each Net Worth row, each Add menu item), opened over
 * made-up households that hold every field between them, stamps every SHOWN field (`data-fact`, `drawers/Fact.tsx`) in a
 * drawer the registry names for it, and stamps nothing the registry doesn't know. So every saved fact has a drawer home,
 * and none is left unshown.
 */

afterEach(cleanup)

const ALL_DRAWERS: readonly FactDrawerId[] = [
  'person', 'state', 'salary', 'social-security', 'work-invest', 'income', 'new-income', 'account', 'new-account',
  'living', 'medical', 'working-cost', 'health', 'medicare',
]

const addTargets = (items: readonly AddItem[]): DrawerTarget[] =>
  items.flatMap((i) => ('items' in i ? i.items.map((leaf) => leaf.target) : [i.target]))

/** Every drawer the Profile pages offer over `d`: each card's, each Net Worth row's, each Add menu item's. */
function drawerTargets(d: ScenarioDraft): readonly DrawerTarget[] {
  const pages: readonly CardsPageView[] = [familyView(d), incomeView(d, false), savingsView(d, false), expensesView(d), goalsView(d)]
  const worth = netWorthView(d, undefined, false)
  const all = [
    ...pages.flatMap((p) => [...p.cards.map((c) => c.target), ...(p.add === null ? [] : addTargets(p.add.items))]),
    ...worth.rows.map((r) => r.target),
    ...(worth.add === null ? [] : addTargets(worth.add.items)),
  ]
  const seen = new Set<string>()
  return all.filter((t) => {
    const k = JSON.stringify(t)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Open each drawer alone over `d` and read its stamps, each with the drawer it sits in. */
function stampsOf(d: ScenarioDraft): Map<string, Set<FactDrawerId>> {
  const out = new Map<string, Set<FactDrawerId>>()
  for (const target of drawerTargets(d)) {
    const { model } = profileStore(d)
    render(<DrawerFor target={target} model={model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
    for (const el of document.querySelectorAll('[data-fact]')) {
      for (const stamp of (el.getAttribute('data-fact') ?? '').split(' ').filter((s) => s !== '')) {
        const drawers = out.get(stamp) ?? new Set<FactDrawerId>()
        drawers.add(target.kind)
        out.set(stamp, drawers)
      }
    }
    cleanup()
  }
  return out
}

describe('the field walk: every saved fact has a drawer home (R14, R15)', () => {
  it('the made-up households open every kind of drawer, so none goes unread (non-vacuity)', () => {
    const kinds = new Set([FULL, GOVERNED].flatMap((d) => drawerTargets(d).map((t) => t.kind)))
    expect([...kinds].sort()).toEqual([...ALL_DRAWERS].sort())
  })

  it('every shown field is stamped in a drawer the registry names for it; no unknown stamp', () => {
    const seen = new Map<string, Set<FactDrawerId>>()
    for (const draft of [FULL, GOVERNED]) {
      for (const [stamp, drawers] of stampsOf(draft)) {
        const all = seen.get(stamp) ?? new Set<FactDrawerId>()
        for (const d of drawers) all.add(d)
        seen.set(stamp, all)
      }
    }
    const shown = shownFacts()
    expect(shown.size, '[non-vacuity] the registry shows dozens of fields').toBeGreaterThan(40)
    const missing = [...shown.keys()].filter((stamp) => !seen.has(stamp))
    expect(missing, 'shown fields no drawer stamps').toEqual([])
    for (const [stamp, drawers] of seen) {
      const allowed = shown.get(stamp as never)
      expect(allowed, `a drawer stamps "${stamp}", which the registry does not show`).toBeDefined()
      for (const d of drawers) expect(allowed, `"${stamp}" sits in "${d}"`).toContain(d)
    }
  })

  it('the facts with no drawer are exactly the tray’s four levers and Tax Strategies’ two choices, each saying why', () => {
    const elsewhere = elsewhereFacts()
    expect(Object.fromEntries(elsewhere)).toEqual({
      drawdownPolicy: 'tray',
      drawdownOrder: 'tray',
      rothConversion: 'tray',
      enhancedSubsidies: 'tray',
      chosenGoal: 'tax-strategies',
      heirBracket: 'tax-strategies',
    })
    for (const key of elsewhere.keys()) {
      const d = DRAFT_FACTS[key as keyof typeof DRAFT_FACTS]
      expect(d.kind === 'elsewhere' && d.why.length > 20, key).toBe(true)
    }
  })

  it('a field argued away is never stamped, and every argued field says why in one line', () => {
    for (const [key, d] of [...Object.entries(DRAFT_FACTS), ...Object.entries(ACCOUNT_FACTS).map(([k, v]) => [`account.${k}`, v] as const)]) {
      if (d.kind !== 'not-a-fact') continue
      expect(d.why.length, key).toBeGreaterThan(20)
      expect(d.why.includes('\n'), key).toBe(false)
    }
    // The non-facts: the stamps, the record, and schema version 6's ids and kept what-ifs. FULL and GOVERNED carry an id
    // on every account and line and a kept what-if, so a drawer had each to show.
    const nonFacts = [
      'seed', 'savedAt', 'filing', 'startCalendarYear', 'savedRecommendation', 'taxVintage', 'appDefaultVersion',
      'healthcareVintage', 'taxVintageDetail', 'dateVintage', 'stateTaxVintage', 'keptWhatIfs', 'account.id',
    ]
    expect(FULL.keptWhatIfs?.length, '[non-vacuity] the made-up household keeps a what-if').toBeGreaterThan(0)
    expect(GOVERNED.budget?.every((l) => l.id !== undefined), '[non-vacuity] every line carries an id').toBe(true)
    for (const draft of [FULL, GOVERNED]) {
      const seen = stampsOf(draft)
      for (const key of nonFacts) expect(seen.has(key), key).toBe(false)
    }
  })

  it('a fact reads exactly on its card: no value on a Profile card wears "~" or "about" (R11), the tool’s own extras figure included', () => {
    const values = [FULL, GOVERNED].flatMap((d) =>
      [familyView(d), incomeView(d, false), savingsView(d, false), expensesView(d), goalsView(d)].flatMap((p) => p.cards.flatMap((c) => c.rows.map((r) => r.value))),
    )
    expect(values.length).toBeGreaterThan(30)
    for (const v of values) {
      expect(v, v).not.toMatch(/~/)
      expect(v, v).not.toMatch(/\babout\b/i)
    }
  })
})
