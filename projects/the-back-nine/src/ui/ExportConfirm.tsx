/**
 * U8 mandatory backup-export step. The block is satisfiable by ANY observable channel —
 * download OR copy OR show-the-text — with a MANDATORY non-download fallback, because
 * `exportVault` returns a STRING and only the OS download can fail (iOS-PWA / locked-down
 * storage would otherwise brick an un-skippable gate). The show-text path has no OS
 * dependency, so the gate can always be cleared. No remind-me-later bypass: Finish is
 * `aria-disabled` (never native `disabled`) until the backup is saved by some channel.
 *
 * Act 6 · RC19: drawn in the kit, inside the save drawer (its export step) and the backup drawer: the download as the
 * blue primary (an anchor wearing the kit Button's classes), copy and show-the-text as outlined buttons, the confirm line
 * with a check beside it, Finish at the end.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { copy } from './copy'
import { focusHeading } from '@intake/a11y'
import type { Announcer } from '@intake/a11y'
import { exportVaultFile, recordBackupMade } from './vaultSession'
import { Button, buttonClasses } from './kit/Button'
import { FieldNote, VAULT_ACTIONS, VaultHeading } from './kit/VaultCard'

const BACKUP_FILENAME = 'the-back-nine-backup.json'

export function ExportConfirm({
  onFinish,
  announcer,
  onCancel,
}: {
  readonly onFinish: () => void
  readonly announcer: Announcer
  /** The OPTIONAL quiet escape ("Not now") for INVITED mounts (the re-offer door), returning
   *  without exporting or recording. The mandatory first-save ceremony passes nothing — its gate
   *  stays un-skippable by construction (ultramode 2026-07-03: an optional door must never trap). */
  readonly onCancel?: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  useEffect(() => focusHeading(headingRef.current), [])
  const textId = useId()
  const [fileText, setFileText] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [exported, setExported] = useState(false)
  const [showText, setShowText] = useState(false)
  const [confirmKey, setConfirmKey] = useState<'exportDownloaded' | 'exportCopied' | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [exportError, setExportError] = useState(false)

  // Read the just-committed vault back into a backup file (firstSave already committed it). A failure
  // here is RARE — the vault is on disk — but it MUST surface: the {ok:false} arm OR a rejected
  // read (an IndexedDB read transaction can throw) would otherwise leave `fileText` null, disabling
  // every channel and leaving Finish un-clearable with NO error — stranding the user on the one gate
  // whose whole purpose is the survivor's off-device artifact. A calm message + retry, never silence.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const loadBackup = useCallback(() => {
    setExportError(false)
    void exportVaultFile()
      .then((r) => {
        if (!mounted.current) return
        if (r.ok) setFileText(r.file)
        else setExportError(true)
      })
      .catch(() => {
        if (mounted.current) setExportError(true)
      })
  }, [])
  useEffect(() => loadBackup(), [loadBackup])

  // A persistent object URL for the download anchor; revoked on change/unmount.
  useEffect(() => {
    if (fileText === null) return
    const url = URL.createObjectURL(new Blob([fileText], { type: 'application/json' }))
    setDownloadUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fileText])

  function markExported(key: 'exportDownloaded' | 'exportCopied' | null) {
    setExported(true)
    setConfirmKey(key)
    if (key) announcer.announce(copy[key])
    // Every confirmed channel (download click, copy success, text-saved) records the off-device
    // backup so a decrypt-on-return never re-nags a household that already has one. Fire-and-forget
    // (void + internal catch): the note is advisory metadata — it must never block or fail the
    // mandatory gate the way a thrown promise would.
    // INHERITED TRADE-OFF (deliberate): the download CLICK records even if the OS write silently
    // fails (iOS-PWA / locked storage) — download completion is unobservable from the web platform,
    // and the same click already clears the mandatory gate identically. Show-text is the guaranteed
    // fallback channel; do not "fix" this by trusting the click less without a real completion signal.
    void recordBackupMade().catch(() => undefined)
  }

  async function handleCopy() {
    if (fileText === null) return
    try {
      await navigator.clipboard.writeText(fileText)
      setCopyFailed(false)
      markExported('exportCopied')
    } catch {
      // Clipboard can be unavailable (permissions / insecure context) — steer to the fallback.
      setCopyFailed(true)
      setShowText(true)
    }
  }

  function handleFinish() {
    if (exported) {
      onFinish()
      return
    }
    announcer.announce(copy.exportBlocked)
  }

  return (
    <section className="flex flex-col gap-6" data-export-step="">
      <div className="flex flex-col gap-2">
        <VaultHeading ref={headingRef}>{copy.exportHeading}</VaultHeading>
        <p className="text-body text-stone-600">{copy.exportIntro}</p>
        {/* Council-mandated substance (2026-06-30): the entropy downgrade + the estate handoff. */}
        <p className="text-body text-stone-600">{copy.exportEntropyNote}</p>
        <p className="text-body text-stone-600">{copy.exportEstateNote}</p>
      </div>

      {exportError ? (
        <div className="flex flex-col gap-3">
          <FieldNote>{copy.exportUnavailable}</FieldNote>
          <Button variant="primary" className="self-start" onClick={loadBackup}>
            {copy.exportRetry}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 wide:flex-row wide:flex-wrap [&>*]:h-auto [&>*]:min-h-10 [&>*]:whitespace-normal [&>*]:py-2" data-export-channels="">
            {downloadUrl && (
              <a
                className={buttonClasses('primary')}
                href={downloadUrl}
                download={BACKUP_FILENAME}
                onClick={() => markExported('exportDownloaded')}
              >
                {copy.exportDownload}
              </a>
            )}
            <Button variant="secondary" disabled={fileText === null} onClick={() => void handleCopy()}>
              {copy.exportCopy}
            </Button>
            <Button variant="secondary" disabled={fileText === null} onClick={() => setShowText(true)}>
              {copy.exportShowText}
            </Button>
          </div>

          {confirmKey && (
            <p className="flex items-start gap-1.5 text-body font-medium text-stone-900" data-export-confirm="">
              <Check size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-plum" />
              {copy[confirmKey]}
            </p>
          )}
          {copyFailed && <p className="text-label text-stone-600">{copy.exportTextHint}</p>}

          {showText && fileText !== null && (
            <div className="flex flex-col gap-2">
              <label className="text-body text-stone-900" htmlFor={textId}>
                {copy.exportTextHint}
              </label>
              <textarea
                id={textId}
                className="min-h-32 w-full rounded-control border border-stone-300 bg-stone-100 p-3 font-mono text-label break-all text-stone-900 outline-none focus:outline-2 focus:outline-offset-2 focus:outline-blue-ink"
                readOnly
                value={fileText}
                rows={6}
              />
              <Button variant="secondary" className="self-start" onClick={() => markExported(null)}>
                {copy.exportTextSaved}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={VAULT_ACTIONS}>
        {onCancel && (
          <Button variant="neutral" onClick={onCancel}>
            {copy.backupNotNow}
          </Button>
        )}
        <Button variant="primary" aria-disabled={!exported} onClick={handleFinish}>
          {copy.exportFinish}
        </Button>
      </div>
    </section>
  )
}
