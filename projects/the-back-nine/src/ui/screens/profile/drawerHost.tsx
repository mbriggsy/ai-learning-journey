/**
 * src/ui/screens/profile/drawerHost.tsx: the one open Profile drawer and its bookkeeping (Act 6 · RC13a's, moved out of
 * `ProfilePages.tsx` by RC13b so a drawer opens from outside Profile too: the StaleBanner's standing line, Health Care's
 * Action Items tray, the gear's assumption panel, and RC18's Settings). `ProfilePages` hosts the page's drawer; the shell
 * hosts one more for those outside doors, over whatever page shows.
 *
 * ONE DRAWER AT A TIME per host. Each open is numbered, so a reopened drawer always seeds afresh from the store's draft;
 * the drawer stays mounted through its exit and is dropped after it (`onClosed`). On close, focus goes to the card the
 * drawer belongs to (a record just added: its new card), re-found by `data-profile-card` at close, else to the control
 * that opened it while it is still on the page, else to the page's heading (an outside door gone). A DELETE closes with its
 * own signal (`deleted`) and focus goes to the heading: the cards key by index, so the deleted card's node (the opener)
 * stays on the page as the NEXT record's card, and "the opener while it is still on the page" sent focus there (milestone
 * 3's review, X11).
 * Nothing is held from open but what can be re-found (insight 060).
 */
import { useCallback, useRef, useState } from 'react'
import type { MemoryModel } from '@store/memoryModel'
import { cardIdOf, type DrawerTarget } from './profileView'
import { AccountDrawer } from './drawers/AccountDrawer'
import { LivingDrawer, MedicalDrawer } from './drawers/ExpensesDrawers'
import { PersonDrawer, StateDrawer } from './drawers/FamilyDrawers'
import { HealthDrawer, MedicareDrawer } from './drawers/GoalsDrawers'
import { SalaryDrawer, SocialSecurityDrawer, WorkInvestDrawer } from './drawers/IncomeDrawers'
import { OneTimeDrawer } from './drawers/OneTimeDrawer'
import { OtherIncomeDrawer } from './drawers/OtherIncomeDrawer'
import { WorkingCostDrawer } from './drawers/WorkingCostDrawer'
import type { DrawerBodyProps } from './drawers/drawerProps'
import type { DrawerLeaveAsk } from './drawers/ProfileDrawer'

export function DrawerFor({ target, ...props }: DrawerBodyProps & { readonly target: DrawerTarget }) {
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
    case 'one-time':
      return <OneTimeDrawer at={{ index: target.index }} {...props} />
    case 'new-one-time':
      return <OneTimeDrawer at="new" {...props} />
    case 'account':
      return <AccountDrawer at={{ index: target.index, facet: target.facet }} {...props} />
    case 'new-account':
      return <AccountDrawer at={{ kind: target.accountKind, ...(target.ownerIndex !== undefined ? { ownerIndex: target.ownerIndex } : {}) }} {...props} />
    case 'living':
      return <LivingDrawer {...props} />
    case 'medical':
      return <MedicalDrawer {...props} />
    case 'working-cost':
      return <WorkingCostDrawer costOnly={target.costOnly === true} {...props} />
    case 'health':
      return <HealthDrawer {...props} />
    case 'medicare':
      return <MedicareDrawer {...props} />
  }
}

interface OpenDrawer {
  readonly seq: number
  readonly target: DrawerTarget
  readonly open: boolean
  /** The card the drawer was opened from (null: none, an outside door). */
  readonly card: string | null
  /** Opened at a refusal (the first-run stepper's Next or Complete, Act 6 · RC14). */
  readonly checkAtOpen: boolean
}

export interface DrawerHost {
  /** Open a drawer; `card` is the card it belongs to where the target alone doesn't name it (Goals' Retirement cards open
   *  the person drawer), `null` for an outside door. */
  readonly open: (target: DrawerTarget, card?: string | null, opts?: { readonly checkAtOpen?: boolean }) => void
  /** Close the drawer (its exit runs, then it is dropped); `card` re-aims where focus goes; `deleted` sends it to the
   *  page's heading (the record is gone). */
  readonly close: (card?: string | null, opts?: { readonly deleted?: boolean }) => void
  readonly isOpen: boolean
  /** The card whose drawer is open (it reads selected; the rest dim). */
  readonly selected: string | null
  /** The drawer itself, or null. */
  readonly render: (props: {
    readonly model: MemoryModel
    readonly readOnly: boolean
    readonly leaveAsk?: DrawerLeaveAsk
    /** The persisted plan's balances save year (`DrawerBodyProps.balancesSaveYear`). */
    readonly balancesSaveYear?: number
  }) => React.ReactNode
}

export function useDrawerHost(fallback: () => HTMLElement | null): DrawerHost {
  const [drawer, setDrawer] = useState<OpenDrawer | null>(null)
  const seq = useRef(0)
  /** The card focus goes to on close (null: the opener, else the page's heading). */
  const focusCard = useRef<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback((target: DrawerTarget, card?: string | null, opts?: { readonly checkAtOpen?: boolean }) => {
    seq.current += 1
    const id = card === undefined ? cardIdOf(target) : card
    focusCard.current = id
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    setDrawer({ seq: seq.current, target, open: true, card: id, checkAtOpen: opts?.checkAtOpen === true })
  }, [])
  const close = useCallback((card?: string | null, opts?: { readonly deleted?: boolean }) => {
    if (card !== undefined) focusCard.current = card
    if (opts?.deleted === true) {
      focusCard.current = null
      opener.current = null
    }
    setDrawer((d) => (d === null ? d : { ...d, open: false }))
  }, [])
  const closed = useCallback(() => setDrawer((d) => (d !== null && !d.open ? null : d)), [])
  const finalFocus = useCallback((): HTMLElement | null => {
    const id = focusCard.current
    const card = id === null ? null : document.querySelector<HTMLElement>(`[data-profile-card="${id}"]`)
    if (card !== null) return card
    const back = opener.current
    return back !== null && back.isConnected ? back : fallback()
  }, [fallback])

  const isOpen = drawer?.open === true
  return {
    open,
    close,
    isOpen,
    selected: isOpen ? drawer.card : null,
    render: ({ model, readOnly, leaveAsk, balancesSaveYear }) =>
      drawer === null ? null : (
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
          {...(drawer.checkAtOpen ? { checkAtOpen: true } : {})}
          {...(balancesSaveYear !== undefined ? { balancesSaveYear } : {})}
        />
      ),
  }
}
