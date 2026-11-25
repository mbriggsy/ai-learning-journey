/**
 * src/ui/screens/profile/ProfilePages.tsx: Profile's pages, in RightCapital's order (Net Worth, Goals, Income, Savings,
 * Expenses, Family; Blueprint at RC15), and the one drawer open over them (Act 6 · RC13a, RC13b). The shell mounts this
 * keyed by the page, so a page change drops a drawer with it (a drawer holding changes cannot be left that way unasked:
 * its buffer holds the leave guard, and the shell's Back ask is asked inside the drawer, `ProfileDrawer.tsx`). The
 * drawer's bookkeeping is `drawerHost.tsx`'s (the shell hosts the same for drawers opened from outside Profile).
 */
import { useCallback, useEffect, useMemo, type RefObject } from 'react'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { CardsPage } from './CardsPage'
import { NetWorth } from './NetWorth'
import { expensesView, familyView, goalsView, incomeView, netWorthView, profilePageTitle, savingsView, type ProfileScreenId } from './profileView'
import { useDrawerHost } from './drawerHost'
import type { DrawerLeaveAsk } from './drawers/ProfileDrawer'

export const PROFILE_SCREENS: readonly ProfileScreenId[] = ['profile-net-worth', 'profile-goals', 'profile-income', 'profile-savings', 'profile-expenses', 'profile-family']
export const isProfileScreen = (s: string): s is ProfileScreenId => (PROFILE_SCREENS as readonly string[]).includes(s)

export interface ProfilePagesProps {
  readonly screen: ProfileScreenId
  readonly draft: ScenarioDraft
  readonly model: MemoryModel
  readonly readOnly: boolean
  readonly headingRef: RefObject<HTMLHeadingElement | null>
  readonly agedBalancesYear: number | undefined
  /** Net Worth's R13 caveat (its band prints a figure). */
  readonly caveat: readonly string[]
  /** The shell's Back ask: asked inside the open drawer (the drawer is modal). */
  readonly leaveAsk?: DrawerLeaveAsk
  /** Told whether a drawer is open (the shell then asks its Back ask inside it, never on the page beneath). */
  readonly onDrawerOpen: (open: boolean) => void
}

export function ProfilePages({ screen, draft, model, readOnly, headingRef, agedBalancesYear, caveat, leaveAsk, onDrawerOpen }: ProfilePagesProps) {
  const heading = useCallback(() => headingRef.current, [headingRef])
  const host = useDrawerHost(heading)
  const drawerOpen = host.isOpen
  useEffect(() => {
    onDrawerOpen(drawerOpen)
  }, [drawerOpen, onDrawerOpen])
  useEffect(() => () => onDrawerOpen(false), [onDrawerOpen])

  const title = profilePageTitle(screen)
  const view = useMemo(() => {
    if (screen === 'profile-family') return familyView(draft)
    if (screen === 'profile-income') return incomeView(draft, readOnly)
    if (screen === 'profile-savings') return savingsView(draft, readOnly)
    if (screen === 'profile-expenses') return expensesView(draft)
    if (screen === 'profile-goals') return goalsView(draft)
    return null
  }, [screen, draft, readOnly])
  const worth = useMemo(() => (screen === 'profile-net-worth' ? netWorthView(draft, agedBalancesYear, readOnly) : null), [screen, draft, agedBalancesYear, readOnly])

  return (
    <>
      {worth !== null ? (
        <NetWorth headingRef={headingRef} view={worth} selected={host.selected} onOpen={host.open} caveat={caveat} />
      ) : view !== null ? (
        <CardsPage screen={screen} title={title} headingRef={headingRef} view={view} selected={host.selected} onOpen={host.open} />
      ) : null}
      {host.render({ model, readOnly, ...(leaveAsk !== undefined ? { leaveAsk } : {}) })}
    </>
  )
}
