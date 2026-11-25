/**
 * src/ui/shell/routes.ts: the shell's one route table (plan docs/plans/6-rightcapital-ui-plan.md, section 3.1,
 * "Routing" and "No dead tabs"). Pure: no React, no history, no DOM.
 *
 * A route is a module (the top bar's word), a page (the sub-nav's word) and, where the page has folder tabs, a tab.
 * Each row of {@link ROUTE_ROWS} is one screen that exists; a module, page or tab shows only when a row names it, so
 * no nav word ever leads to nothing. Each screen unit adds its rows here.
 *
 * The route is mirrored to the address's hash (`#/retirement/analysis/probability`) by IntakeApp. The hash names the page
 * and nothing else: no plan data ever rides in it.
 */
import { copy } from '../copy'

/** The top bar's modules, in RightCapital's order (ref 1.2). A module shows only when a row names it. */
export const MODULE_ORDER = ['dashboard', 'investment', 'retirement', 'tax', 'profile'] as const
export type ModuleId = (typeof MODULE_ORDER)[number]

/** The screens the shell can draw. RC3's Snapshot, RC4's Probability (with its Action Items tray, RC4b), RC7's
 *  Confidence (Analysis's second folder tab, a route of its own like Probability) and RC6's Cash
 *  Flows (its Summary and Accounts folder tabs are the page's own state, not routes), RC8's Tax Strategies (its four
 *  folder tabs the page's own state too) and RC9's Social Security (its Comparison and Summary tabs the same) are rebuilt; the rest ride as interim tabs in their old look until their units
 *  rebuild them: the workbench room's facts page (RC13) and the health sheet under Retirement → Health Care (RC10). */
export type ScreenId =
  | 'snapshot'
  | 'probability'
  | 'confidence'
  | 'cash-flows'
  | 'social-security'
  | 'interim-facts'
  | 'tax-strategies'
  | 'interim-health'

export interface RouteRow {
  readonly module: ModuleId
  readonly page: string
  readonly pageLabel: string
  /** The page's folder tab, where the page has them. */
  readonly tab?: string
  readonly tabLabel?: string
  readonly screen: ScreenId
  /** The screen's own heading. */
  readonly title: string
}

export interface Route {
  readonly module: ModuleId
  readonly page: string
  readonly tab?: string
}

/** The words for each module a row can name. A module with a row and no word here is a test failure. */
export const MODULE_LABELS: Readonly<Partial<Record<ModuleId, string>>> = {
  dashboard: copy.shellModuleDashboard,
  retirement: copy.shellModuleRetirement,
  tax: copy.shellModuleTax,
  profile: copy.shellModuleProfile,
}

/** Every screen that exists, each module's pages in RightCapital's order (ref 1.2). */
export const ROUTE_ROWS: readonly RouteRow[] = [
  { module: 'dashboard', page: 'snapshot', pageLabel: copy.shellPageSnapshot, screen: 'snapshot', title: copy.shellPageSnapshot },
  {
    module: 'retirement',
    page: 'analysis',
    pageLabel: copy.shellPageAnalysis,
    tab: 'probability',
    tabLabel: copy.probabilityTab,
    screen: 'probability',
    title: copy.analysisTitle,
  },
  {
    module: 'retirement',
    page: 'analysis',
    pageLabel: copy.shellPageAnalysis,
    tab: 'confidence',
    tabLabel: copy.confidenceTab,
    screen: 'confidence',
    title: copy.analysisTitle,
  },
  { module: 'retirement', page: 'social-security', pageLabel: copy.shellPageSocialSecurity, screen: 'social-security', title: copy.shellPageSocialSecurity },
  { module: 'retirement', page: 'health-care', pageLabel: copy.shellPageHealthCare, screen: 'interim-health', title: copy.shellPageHealthCare },
  { module: 'retirement', page: 'cash-flows', pageLabel: copy.shellPageCashFlows, screen: 'cash-flows', title: copy.shellPageCashFlows },
  { module: 'tax', page: 'strategies', pageLabel: copy.shellPageTaxStrategies, screen: 'tax-strategies', title: copy.shellPageTaxStrategies },
  { module: 'profile', page: 'facts', pageLabel: copy.workbenchPageFacts, screen: 'interim-facts', title: copy.workbenchPageFacts },
]

/** The home: setup's end, a reopened vault and every dev seed land on Dashboard → Snapshot (RC4; RC3's door landed here). */
export const LANDING: Route = { module: 'dashboard', page: 'snapshot' }

export const routeEquals = (a: Route, b: Route): boolean => a.module === b.module && a.page === b.page && a.tab === b.tab
const sameRoute = routeEquals

/** The route of the first row showing `screen` (every screen has exactly one row). */
export function routeOfScreen(screen: ScreenId, rows: readonly RouteRow[] = ROUTE_ROWS): Route {
  const row = rows.find((r) => r.screen === screen)
  if (row === undefined) throw new Error(`routes: no row shows ${screen}`)
  return routeOf(row)
}

/** The route a row is. */
export const routeOf = (row: RouteRow): Route => (row.tab === undefined ? { module: row.module, page: row.page } : { module: row.module, page: row.page, tab: row.tab })

/** The row a route names, or undefined. */
export function rowFor(route: Route, rows: readonly RouteRow[] = ROUTE_ROWS): RouteRow | undefined {
  return rows.find((r) => sameRoute(routeOf(r), route))
}

/** The hash a route is mirrored to: `#/module/page` or `#/module/page/tab`. */
export function routeHash(route: Route): string {
  return `#/${route.module}/${route.page}${route.tab === undefined ? '' : `/${route.tab}`}`
}

/**
 * The route a hash names. An exact row wins; a known page with an unknown tab lands on that page's first tab; a known
 * module with an unknown page (or one whose page has no screen yet) lands on the module's first page. A hash that names
 * no module with a screen is not a shell address: `null`.
 */
export function parseHash(hash: string, rows: readonly RouteRow[] = ROUTE_ROWS): Route | null {
  const parts = hash.replace(/^#\/?/, '').split('/').filter((p) => p !== '')
  const [module, page, tab] = parts
  if (module === undefined) return null
  const inModule = rows.filter((r) => r.module === module)
  const first = inModule[0]
  if (first === undefined) return null
  const onPage = inModule.filter((r) => r.page === page)
  const exact = onPage.find((r) => r.tab === tab)
  if (exact !== undefined && parts.length <= 3) return routeOf(exact)
  return routeOf(onPage[0] ?? first)
}

export interface NavPage {
  readonly id: string
  readonly label: string
  /** The page's first screen: where its sub-nav word goes. */
  readonly route: Route
}

export interface NavModule {
  readonly id: ModuleId
  readonly label: string
  /** The module's first page: where its top-bar word goes. */
  readonly route: Route
  readonly pages: readonly NavPage[]
}

/** The top bar's modules and each one's pages: only those a row names, in RightCapital's order. */
export function navModules(rows: readonly RouteRow[] = ROUTE_ROWS, labels: Readonly<Partial<Record<ModuleId, string>>> = MODULE_LABELS): readonly NavModule[] {
  const out: NavModule[] = []
  for (const id of MODULE_ORDER) {
    const inModule = rows.filter((r) => r.module === id)
    const first = inModule[0]
    if (first === undefined) continue
    const label = labels[id]
    if (label === undefined) throw new Error(`routes: the ${id} module has a screen and no word`)
    const pages: NavPage[] = []
    for (const row of inModule) {
      if (pages.some((p) => p.id === row.page)) continue
      pages.push({ id: row.page, label: row.pageLabel, route: routeOf(row) })
    }
    out.push({ id, label, route: routeOf(first), pages })
  }
  return out
}
