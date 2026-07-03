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
 */
import { useLiveAnnouncer } from '@intake/a11y'
import { ExportConfirm } from './ExportConfirm'
import './styles/save.css'

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
  return (
    <main className="save">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <ExportConfirm announcer={announcer} onFinish={onFinish} onCancel={onCancel} />
    </main>
  )
}
