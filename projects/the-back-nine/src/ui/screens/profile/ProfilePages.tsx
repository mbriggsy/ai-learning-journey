/**
 * src/ui/screens/profile/ProfilePages.tsx: Profile's Family, Income, Savings and Net Worth pages and the one drawer open
 * over them (Act 6 · RC13a). The shell mounts this keyed by the page, so a page change drops a drawer with it (a drawer
 * holding changes cannot be left that way unasked: its buffer holds the leave guard, and the shell's Back ask is asked
 * inside the drawer, `ProfileDrawer.tsx`).
 *
 * ONE DRAWER AT A TIME, opened by a card, a Net Worth row or an Add menu item. Each open is numbered, so a reopened
 * drawer always seeds afresh from the store's draft; the drawer stays mounted through its exit and is dropped after it
 * (`onClosed`). On close, focus goes to the card the drawer belongs to (a record just added: its new card), re-found by
 * `data-profile-card` at close, else to the page's heading (a record just deleted).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { MemoryModel, ScenarioDraft } from '@store/memoryModel'
import { CardsPage } from './CardsPage'
import { NetWorth } from './NetWorth'
import { cardIdOf, familyView, incomeView, netWorthView, profilePageTitle, savingsView, type DrawerTarget, type ProfileScreenId } from './profileView'
import { AccountDrawer } from './drawers/AccountDrawer'
import { PersonDrawer, StateDrawer } from './drawers/FamilyDrawers'
import { SalaryDrawer, SocialSecurityDrawer, WorkInvestDrawer } from './drawers/IncomeDrawers'
import { OtherIncomeDrawer } from './drawers/OtherIncomeDrawer'
import type { DrawerBodyProps } from './drawers/drawerProps'
import type { DrawerLeaveAsk } from './drawers/ProfileDrawer'

export const PROFILE_SCREENS: readonly ProfileScreenId[] = ['profile-net-worth', 'profile-income', 'profile-savings', 'profile-family']
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

interface OpenDrawer {
  readonly seq: number
  readonly target: DrawerTarget
  readonly open: boolean
}

function DrawerFor({ target, ...props }: DrawerBodyProps & { readonly target: DrawerTarget }) {
  switch (target.kind) {
    case 'person':
      return <PersonDrawer index={target.index} {...props} />
    case 'state':
      return <StateDrawer {...props} />
    case 'salary':
      return <SalaryDrawer index={target.index} {...props} />
    case 'social-security':
      return <SocialSecurityDrawer index={target.index} {...props} />
    case 'work-invest':
      return <WorkInvestDrawer index={target.index} {...props} />
    case 'income':
      return <OtherIncomeDrawer at={{ index: target.index }} {...props} />
    case 'new-income':
      return <OtherIncomeDrawer at={{ type: target.type }} {...props} />
    case 'account':
      return <AccountDrawer at={{ index: target.index, facet: target.facet }} {...props} />
    case 'new-account':
      return <AccountDrawer at={{ kind: target.accountKind }} {...props} />
  }
}

export function ProfilePages({ screen, draft, model, readOnly, headingRef, agedBalancesYear, caveat, leaveAsk, onDrawerOpen }: ProfilePagesProps) {
  const [drawer, setDrawer] = useState<OpenDrawer | null>(null)
  const seq = useRef(0)
  /** The card focus goes to on close (null: the page's heading). */
  const focusCard = useRef<string | null>(null)

  const open = useCallback((target: DrawerTarget) => {
    seq.current += 1
    focusCard.current = cardIdOf(target)
    setDrawer({ seq: seq.current, target, open: true })
  }, [])
  const close = useCallback((card?: string | null) => {
    if (card !== undefined) focusCard.current = card
    setDrawer((d) => (d === null ? d : { ...d, open: false }))
  }, [])
  const closed = useCallback(() => setDrawer((d) => (d !== null && !d.open ? null : d)), [])
  const finalFocus = useCallback((): HTMLElement | null => {
    const id = focusCard.current
    const card = id === null ? null : document.querySelector<HTMLElement>(`[data-profile-card="${id}"]`)
    return card ?? headingRef.current
  }, [headingRef])

  const drawerOpen = drawer?.open === true
  useEffect(() => {
    onDrawerOpen(drawerOpen)
  }, [drawerOpen, onDrawerOpen])
  useEffect(() => () => onDrawerOpen(false), [onDrawerOpen])

  const selected = drawerOpen ? cardIdOf(drawer.target) : null
  const title = profilePageTitle(screen)
  const view = useMemo(() => {
    if (screen === 'profile-family') return familyView(draft)
    if (screen === 'profile-income') return incomeView(draft, readOnly)
    if (screen === 'profile-savings') return savingsView(draft, readOnly)
    return null
  }, [screen, draft, readOnly])
  const worth = useMemo(() => (screen === 'profile-net-worth' ? netWorthView(draft, agedBalancesYear, readOnly) : null), [screen, draft, agedBalancesYear, readOnly])

  return (
    <>
      {worth !== null ? (
        <NetWorth headingRef={headingRef} view={worth} selected={selected} onOpen={open} caveat={caveat} />
      ) : view !== null ? (
        <CardsPage screen={screen} title={title} headingRef={headingRef} view={view} selected={selected} onOpen={open} />
      ) : null}
      {drawer !== null ? (
        <DrawerFor
          key={drawer.seq}
          target={drawer.target}
          model={model}
          open={drawer.open}
          readOnly={readOnly}
          {...(leaveAsk !== undefined && drawer.open ? { leaveAsk } : {})}
          onClose={close}
          onClosed={closed}
          finalFocus={finalFocus}
        />
      ) : null}
    </>
  )
}
