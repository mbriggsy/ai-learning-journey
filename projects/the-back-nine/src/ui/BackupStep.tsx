/**
 * U8-tail re-offer backup step — the EXISTING {@link ExportConfirm} seated in the house save
 * shell with its OWN polite live region, mirroring how SaveFlow mounts the same component on its
 * export step. Reached from the Result backup door when a returning, WRITABLE session has no
 * backup-note on record (IntakeApp's `backup` phase). `onFinish` returns to the result screen;
 * the ceremony's channels (ExportConfirm) record the sentinel, so the door dissolves on return.
 *
 * Lazy-loaded by IntakeApp exactly like SaveFlow, so the export/crypto graph stays off the intake
 * chunk's first paint.
 *
 * DELIBERATELY NO beforeunload guard and NO holdUpdateApply (unlike SaveFlow's export step): there
 * the vault was JUST committed and losing the window strands the survivor's artifact behind a
 * believed-finished save. Here the vault has been durable all along and the note is written only on
 * a CONFIRMED channel — an interruption mid-offer degrades to the safe re-offer on the next return.
 * Do not "fix" the omission by copying SaveFlow's hold (ultramode 2026-07-03).
 *
 * Act 6 · RC19: "Back up and export" is a right drawer (the kit's Drawer, titled as the lock menu's door, "Save a backup
 * file") over the quiet stone page (`VaultGround`; the shell unmounts across it, as before). Its X, Escape and scrim are
 * the step's own "Not now": the invited offer declines in one press and records nothing, so every close is that, UNTIL a
 * channel is confirmed. From then the backup IS made (ExportConfirm's channel already recorded the note), so the X,
 * Escape, the scrim and "Not now" all finish the step: a decline there would keep "No backup file has been saved from
 * this device." in the lock menu for the session (milestone 4's review, V2).
 */
import { useRef } from 'react'
import { Download } from 'lucide-react'
import { useLiveAnnouncer } from '@intake/a11y'
import { copy } from './copy'
import { Drawer } from './kit'
import { ExportConfirm } from './ExportConfirm'
import { VaultGround } from './VaultGround'

export function BackupStep({
  onFinish,
  onCancel,
}: {
  readonly onFinish: () => void
  /** The quiet escape back to the answer — this mount is an INVITED offer, never the mandatory
   *  ceremony, so declining must always be one tap (the door stays offered; nothing records). */
  readonly onCancel: () => void
}) {
  // The ONE polite live region — a stable announcer ExportConfirm holds as a steady prop even
  // before its node mounts (useLiveAnnouncer's callback ref binds late; insight 060).
  const announcer = useLiveAnnouncer()
  // Set by ExportConfirm's first confirmed channel; a ref, since only the close handlers read it.
  const exported = useRef(false)
  const close = () => (exported.current ? onFinish() : onCancel())
  return (
    <>
      <VaultGround />
      <Drawer
        open
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={copy.backupDoorCta}
        icon={<Download strokeWidth={1.5} aria-hidden="true" />}
        closeLabel={copy.profileDrawerClose}
        cancelLabel={copy.profileDrawerCancel}
        footer={null}
        initialFocus={() => document.querySelector<HTMLElement>('[data-backup-step] [data-vault-heading]')}
      >
        <div className="flex flex-col" data-backup-step="">
          <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
          <ExportConfirm
            announcer={announcer}
            onFinish={onFinish}
            onCancel={close}
            onExported={() => {
              exported.current = true
            }}
          />
        </div>
      </Drawer>
    </>
  )
}
