/**
 * src/ui/screens/profile/ProfilePages.tsx: Profile's pages, in RightCapital's order (Net Worth, Goals, Income, Savings,
 * Expenses, Family, Blueprint), and the one drawer open over them (Act 6 · RC13a, RC13b, RC15). The shell mounts this
 * keyed by the page, so a page change drops a drawer with it (a drawer holding changes cannot be left that way unasked:
 * its buffer holds the leave guard, and the shell's Back ask is asked inside the drawer, `ProfileDrawer.tsx`). The
 * drawer's bookkeeping is `drawerHost.tsx`'s (the shell hosts the same for drawers opened from outside Profile). Every
 * Blueprint tile opens its drawer through this same host, so a tile and its Profile card open one drawer.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import type { MemoryModel, ModelAnswer, ScenarioDraft } from '@store/memoryModel'
import type { BandPlanClockAnchor } from '../../bandAnnotations'
import { Blueprint } from './Blueprint'
import { blueprintView, type BlueprintTab } from './blueprintView'
import { CardsPage } from './CardsPage'
import { NetWorth } from './NetWorth'
import { expensesView, familyView, goalsView, incomeView, netWorthView, profilePageTitle, savingsView, type ProfileScreenId } from './profileView'
import { useDrawerHost } from './drawerHost'
import type { DrawerLeaveAsk } from './drawers/ProfileDrawer'

export const PROFILE_SCREENS: readonly ProfileScreenId[] = [
  'profile-net-worth',
  'profile-goals',
  'profile-income',
  'profile-savings',
  'profile-expenses',
  'profile-family',
  'profile-blueprint',
]
export const isProfileScreen = (s: string): s is ProfileScreenId => (PROFILE_SCREENS as readonly string[]).includes(s)

export interface ProfilePagesProps {
  readonly screen: ProfileScreenId
  readonly draft: ScenarioDraft
  readonly model: MemoryModel
  readonly readOnly: boolean
  readonly headingRef: RefObject<HTMLHeadingElement | null>
  readonly agedBalancesYear: number | undefined
  /** The year the plan's balances were last saved, from the persisted plan (absent before any save): an inheritance or
   *  gift's card, tile and drawer read it (gap 5's U4, R15, R17). */
  readonly balancesSaveYear?: number
  /** Net Worth's and Blueprint's R13 caveat (each prints a figure). */
  readonly caveat: readonly string[]
  /** Blueprint's Goals timeline: a working household's stop year is the committed answer's (`blueprintView.ts`). */
  readonly answer: ModelAnswer
  readonly refiguring: boolean
  readonly anchor: BandPlanClockAnchor
  /** The shell's StaleBanner: drawn inside Blueprint's panel, below its folder tabs, while the Goals tab reads the
   *  answer's own sentence (the crowned date or no-date words), as every figured page carries it (the review's E3;
   *  milestone 3's review, round 2). */
  readonly answerBanner?: ReactNode
  /** The shell's Back ask: asked inside the open drawer (the drawer is modal). */
  readonly leaveAsk?: DrawerLeaveAsk
  /** Told whether a drawer is open (the shell then asks its Back ask inside it, never on the page beneath). */
  readonly onDrawerOpen: (open: boolean) => void
}

const NO_HIDDEN: Readonly<Record<BlueprintTab, readonly string[]>> = { 'net-worth': [], goals: [], ise: [] }

export function ProfilePages({ screen, draft, model, readOnly, headingRef, agedBalancesYear, balancesSaveYear, caveat, answer, refiguring, anchor, answerBanner, leaveAsk, onDrawerOpen }: ProfilePagesProps) {
  const heading = useCallback(() => headingRef.current, [headingRef])
  const host = useDrawerHost(heading)
  const drawerOpen = host.isOpen
  useEffect(() => {
    onDrawerOpen(drawerOpen)
  }, [drawerOpen, onDrawerOpen])
  useEffect(() => () => onDrawerOpen(false), [onDrawerOpen])

  // Blueprint's folder tab and Edit's hidden categories: the page's own state (a page move drops them).
  const [bpTab, setBpTab] = useState<BlueprintTab>('net-worth')
  const [bpHidden, setBpHidden] = useState(NO_HIDDEN)
  const hiddenSet = useMemo(() => new Set(bpHidden[bpTab]), [bpHidden, bpTab])

  const title = profilePageTitle(screen)
  const view = useMemo(() => {
    if (screen === 'profile-family') return familyView(draft)
    if (screen === 'profile-income') return incomeView(draft, readOnly, balancesSaveYear)
    if (screen === 'profile-savings') return savingsView(draft, readOnly)
    if (screen === 'profile-expenses') return expensesView(draft)
    if (screen === 'profile-goals') return goalsView(draft)
    return null
  }, [screen, draft, readOnly, balancesSaveYear])
  const worth = useMemo(() => (screen === 'profile-net-worth' ? netWorthView(draft, agedBalancesYear, readOnly) : null), [screen, draft, agedBalancesYear, readOnly])
  const blueprint = useMemo(
    () =>
      screen === 'profile-blueprint'
        ? blueprintView({ draft, tab: bpTab, readOnly, agedBalancesYear, balancesSaveYear, answer, refiguring, anchor, hidden: hiddenSet })
        : null,
    [screen, draft, bpTab, readOnly, agedBalancesYear, balancesSaveYear, answer, refiguring, anchor, hiddenSet],
  )

  return (
    <>
      {worth !== null ? (
        <NetWorth headingRef={headingRef} view={worth} selected={host.selected} onOpen={host.open} caveat={caveat} />
      ) : blueprint !== null ? (
        <Blueprint
          headingRef={headingRef}
          view={blueprint}
          selected={host.selected}
          onOpen={host.open}
          onTab={setBpTab}
          hidden={hiddenSet}
          onHidden={(id, hide) =>
            setBpHidden((cur) => ({ ...cur, [bpTab]: hide ? [...cur[bpTab].filter((x) => x !== id), id] : cur[bpTab].filter((x) => x !== id) }))
          }
          caveat={caveat}
          {...(blueprint.answerShown && answerBanner !== undefined ? { banner: answerBanner } : {})}
        />
      ) : view !== null ? (
        <CardsPage screen={screen} title={title} headingRef={headingRef} view={view} selected={host.selected} onOpen={host.open} />
      ) : null}
      {host.render({ model, readOnly, ...(leaveAsk !== undefined ? { leaveAsk } : {}), ...(balancesSaveYear !== undefined ? { balancesSaveYear } : {}) })}
    </>
  )
}
