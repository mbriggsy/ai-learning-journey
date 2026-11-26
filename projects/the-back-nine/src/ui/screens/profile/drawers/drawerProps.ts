/**
 * src/ui/screens/profile/drawers/drawerProps.ts: what the Profile pages hand every drawer body (Act 6 · RC13a). One open
 * drawer at a time, keyed per open by the host (`ProfilePages.tsx`), so a reopened drawer always seeds afresh from the
 * store's draft.
 */
import type { MemoryModel } from '@store/memoryModel'
import type { DrawerLeaveAsk } from './ProfileDrawer'

export interface DrawerBodyProps {
  readonly model: MemoryModel
  readonly open: boolean
  readonly readOnly: boolean
  readonly leaveAsk?: DrawerLeaveAsk
  /** Close the drawer; `focusCard` is the card focus goes to (a record just added: its new card), null for the page's heading. */
  readonly onClose: (focusCard?: string | null) => void
  readonly onClosed: () => void
  readonly finalFocus: () => HTMLElement | null
  /** Opened AT a refusal (Act 6 · RC14: the stepper's Next or Complete found one on this drawer's fields): the drawer opens
   *  showing it under its field, as its Save would (`openCheck`). */
  readonly checkAtOpen?: boolean
}
