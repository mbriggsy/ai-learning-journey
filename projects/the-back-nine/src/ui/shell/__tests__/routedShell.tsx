/**
 * A test host for the shell: it holds the route the way IntakeApp does (state, moved by the shell's own links), so a
 * render test can mount `Shell` directly over planted lanes and walk its pages by their real nav links. The history
 * mirror is IntakeApp's and is tested through it (`src/ui/__tests__/shellRouting.test.tsx`).
 */
import { useState } from 'react'
import { fireEvent, screen, within } from '@testing-library/react'
import Shell, { type ShellProps } from '../Shell'
import type { Route } from '../routes'
import { copy } from '../../copy'

export type RoutedShellProps = Omit<ShellProps, 'route' | 'onNavigate' | 'onHome'> & {
  readonly initialRoute?: Route
  readonly onHome?: () => void
}

// The table page by default: the render tests below this host were written against it (RC2's landing); Snapshot's
// arms name their own route.
export function RoutedShell({ initialRoute = { module: 'retirement', page: 'cash-flows' }, onHome = () => {}, ...props }: RoutedShellProps) {
  const [route, setRoute] = useState<Route>(initialRoute)
  return <Shell {...props} route={route} onNavigate={setRoute} onHome={onHome} />
}

export const PAGES = {
  snapshot: { module: 'dashboard', page: 'snapshot' },
  probability: { module: 'retirement', page: 'analysis', tab: 'probability' },
  whatif: { module: 'retirement', page: 'analysis', tab: 'what-if' },
  health: { module: 'retirement', page: 'health-care' },
  strategies: { module: 'tax', page: 'strategies' },
  table: { module: 'retirement', page: 'cash-flows' },
  facts: { module: 'profile', page: 'facts' },
} as const satisfies Record<string, Route>

const modulesNav = () => screen.getAllByRole('navigation', { name: copy.shellModulesLabel })[0]!
const pagesNav = () => screen.getByRole('navigation', { name: copy.shellPagesLabel })

/** Walk to a page by its real links: the module's word in the top bar, then the page's word in the sub-nav. */
export function showPage(page: keyof typeof PAGES): void {
  if (page === 'facts') {
    fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleProfile }))
    return
  }
  if (page === 'strategies') {
    fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleTax }))
    return
  }
  if (page === 'snapshot') {
    fireEvent.click(within(modulesNav()).getByRole('link', { name: copy.shellModuleDashboard }))
    return
  }
  const retirement = within(modulesNav()).getByRole('link', { name: copy.shellModuleRetirement })
  if (retirement.getAttribute('aria-current') !== 'page') fireEvent.click(retirement)
  const word = page === 'table' ? copy.shellPageCashFlows : page === 'health' ? copy.shellPageHealthCare : copy.shellPageAnalysis
  fireEvent.click(within(pagesNav()).getByRole('link', { name: word }))
  // The What if page is Analysis's interim folder tab (until RC4b's tray): open it from the Probability page.
  if (page === 'whatif') fireEvent.click(screen.getByRole('tab', { name: copy.workbenchPageWhatIf }))
}

/** The page shown, by the screen the shell's `main.result` names. */
export const shownScreen = (): string | null => document.querySelector('main.result')?.getAttribute('data-shell-screen') ?? null
