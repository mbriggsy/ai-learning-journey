import { describe, expect, it } from 'vitest'
import { LANDING, MODULE_LABELS, MODULE_ORDER, navModules, parseHash, routeHash, routeOf, rowFor, ROUTE_ROWS, type RouteRow } from '../routes'

/**
 * The shell's one route table (Act 6 · RC2; plan 6, section 3.1 "Routing" and "No dead tabs"): a module, page or tab
 * shows only when a screen exists; every hash the table makes reads back to the same route; an unknown hash lands on
 * its module's first page; and a hash carries nothing but the page's name.
 */

const row = (r: Partial<RouteRow> & Pick<RouteRow, 'module' | 'page'>): RouteRow => ({
  pageLabel: r.page,
  screen: 'cash-flows',
  title: r.page,
  ...r,
})

describe('routes — no dead tabs', () => {
  it('only modules with a screen show, in RightCapital’s order; since RC12 Dashboard, Investment, Retirement, Tax and Profile', () => {
    expect(navModules().map((m) => m.id)).toEqual(['dashboard', 'investment', 'retirement', 'tax', 'profile'])
    expect(navModules().find((m) => m.id === 'investment')!.pages.map((p) => p.id)).toEqual(['asset-allocation', 'tax-allocation'])
    expect(navModules().find((m) => m.id === 'dashboard')!.pages.map((p) => p.id)).toEqual(['snapshot'])
    expect(navModules().find((m) => m.id === 'retirement')!.pages.map((p) => p.id)).toEqual(['analysis', 'stress-test', 'social-security', 'health-care', 'cash-flows'])
    // Every module with a screen has its word.
    for (const m of navModules()) expect(MODULE_LABELS[m.id]).toBe(m.label)
  })

  it('a module with no built page is absent; a page appears when its row is added', () => {
    const rows = [row({ module: 'profile', page: 'facts' })]
    expect(navModules(rows, { profile: 'Profile' }).map((m) => m.id)).toEqual(['profile'])
    const more = [row({ module: 'dashboard', page: 'snapshot' }), ...rows]
    expect(navModules(more, { profile: 'Profile', dashboard: 'Dashboard' }).map((m) => m.id)).toEqual(['dashboard', 'profile'])
    expect(navModules(more, { profile: 'Profile', dashboard: 'Dashboard' })[0]!.pages.map((p) => p.id)).toEqual(['snapshot'])
  })

  it('a module with a screen and no word is refused, never drawn blank', () => {
    expect(() => navModules([row({ module: 'tax', page: 'strategies' })], {})).toThrow(/tax/)
  })

  it('the order holds whatever the rows’ order', () => {
    const rows = [row({ module: 'profile', page: 'facts' }), row({ module: 'retirement', page: 'analysis' })]
    expect(navModules(rows, { profile: 'P', retirement: 'R' }).map((m) => m.id)).toEqual(['retirement', 'profile'])
    expect(MODULE_ORDER).toEqual(['dashboard', 'investment', 'retirement', 'tax', 'profile'])
  })
})

describe('routes — the hash', () => {
  it('every hash the table produces parses back to the same route', () => {
    for (const r of ROUTE_ROWS) {
      const route = routeOf(r)
      expect(parseHash(routeHash(route))).toEqual(route)
      expect(rowFor(route)).toBe(r)
    }
    expect(routeHash({ module: 'retirement', page: 'analysis', tab: 'probability' })).toBe('#/retirement/analysis/probability')
  })

  it('an unknown page or tab lands on its module’s first page; a known page with no tab on its first tab', () => {
    expect(parseHash('#/retirement/savings')).toEqual({ module: 'retirement', page: 'analysis', tab: 'probability' })
    expect(parseHash('#/retirement/stress-test')).toEqual({ module: 'retirement', page: 'stress-test' })
    // Allocation Path and Holdings have no screen yet (plan section 6): their addresses land on Asset Allocation.
    expect(parseHash('#/investment/holdings')).toEqual({ module: 'investment', page: 'asset-allocation' })
    expect(parseHash('#/retirement/analysis')).toEqual({ module: 'retirement', page: 'analysis', tab: 'probability' })
    // Confidence is its own tab since RC7; an unknown tab on the page still lands on Probability.
    expect(parseHash('#/retirement/analysis/confidence')).toEqual({ module: 'retirement', page: 'analysis', tab: 'confidence' })
    expect(parseHash('#/retirement/analysis/comparisons')).toEqual({ module: 'retirement', page: 'analysis', tab: 'probability' })
    // The interim What if tab left with RC4b (its levers are Probability's Action Items tray): its old address lands on Probability.
    expect(parseHash('#/retirement/analysis/what-if')).toEqual({ module: 'retirement', page: 'analysis', tab: 'probability' })
    expect(parseHash('#/retirement')).toEqual({ module: 'retirement', page: 'analysis', tab: 'probability' })
    expect(parseHash('#/profile/net-worth')).toEqual({ module: 'profile', page: 'facts' })
    expect(parseHash('#/retirement/cash-flows/extra/parts')).toEqual({ module: 'retirement', page: 'cash-flows' })
  })

  it('a hash naming no module with a screen is not a shell address', () => {
    expect(parseHash('')).toBeNull()
    expect(parseHash('#')).toBeNull()
    expect(parseHash('#/estate/plan')).toBeNull()
    expect(parseHash('#section-2')).toBeNull()
  })

  it('a hash names the page and nothing else: no figure, no name, no plan data', () => {
    for (const r of ROUTE_ROWS) expect(routeHash(routeOf(r))).toMatch(/^#\/[a-z-]+\/[a-z-]+(\/[a-z-]+)?$/)
    expect(parseHash(routeHash(LANDING))).toEqual(LANDING)
  })

  it('the door lands on Dashboard → Snapshot (RC3)', () => {
    expect(LANDING).toEqual({ module: 'dashboard', page: 'snapshot' })
    expect(rowFor(LANDING)!.screen).toBe('snapshot')
    expect(parseHash('#/dashboard')).toEqual(LANDING)
  })
})
