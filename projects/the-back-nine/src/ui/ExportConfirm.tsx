/**
 * U8 mandatory backup-export step. The block is satisfiable by ANY observable channel —
 * download OR copy OR show-the-text — with a MANDATORY non-download fallback, because
 * `exportVault` returns a STRING and only the OS download can fail (iOS-PWA / locked-down
 * storage would otherwise brick an un-skippable gate). The show-text path has no OS
 * dependency, so the gate can always be cleared. No remind-me-later bypass: Finish is
 * `aria-disabled` (never native `disabled`) until the backup is saved by some channel.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { copy } from './copy'
import { focusHeading } from '@intake/a11y'
import type { Announcer } from '@intake/a11y'
import { exportVaultFile } from './vaultSession'

const BACKUP_FILENAME = 'the-back-nine-backup.json'

export function ExportConfirm({
  onFinish,
  announcer,
}: {
  readonly onFinish: () => void
  readonly announcer: Announcer
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

  // Produce the backup from the committed vault on mount (firstSave already committed it).
  useEffect(() => {
    let alive = true
    void exportVaultFile().then((r) => {
      if (alive && r.ok) setFileText(r.file)
    })
    return () => {
      alive = false
    }
  }, [])

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
    <section className="save-step">
      <h2 className="save-step__heading" tabIndex={-1} ref={headingRef}>
        {copy.exportHeading}
      </h2>
      <p className="save-step__intro">{copy.exportIntro}</p>
      {/* Council-mandated substance (2026-06-30): the entropy downgrade + the estate handoff. */}
      <p className="save-step__intro save-step__intro--secondary">{copy.exportEntropyNote}</p>
      <p className="save-step__intro save-step__intro--secondary">{copy.exportEstateNote}</p>

      <div className="save-export">
        {downloadUrl && (
          <a
            className="btn-primary save-export__channel"
            href={downloadUrl}
            download={BACKUP_FILENAME}
            onClick={() => markExported('exportDownloaded')}
          >
            {copy.exportDownload}
          </a>
        )}
        <button type="button" className="btn-quiet save-export__channel" disabled={fileText === null} onClick={() => void handleCopy()}>
          {copy.exportCopy}
        </button>
        <button type="button" className="btn-quiet save-export__channel" disabled={fileText === null} onClick={() => setShowText(true)}>
          {copy.exportShowText}
        </button>
      </div>

      {confirmKey && <p className="save-export__confirm">{copy[confirmKey]}</p>}
      {copyFailed && <p className="save-step__note">{copy.exportTextHint}</p>}

      {showText && fileText !== null && (
        <div className="save-export__text">
          <label className="save-field__label" htmlFor={textId}>
            {copy.exportTextHint}
          </label>
          <textarea id={textId} className="save-export__textarea" readOnly value={fileText} rows={6} />
          <button type="button" className="btn-quiet" onClick={() => markExported(null)}>
            {copy.exportTextSaved}
          </button>
        </div>
      )}

      <div className="save-actions">
        <button type="button" className="btn-primary" aria-disabled={!exported} onClick={handleFinish}>
          {copy.exportFinish}
        </button>
      </div>
    </section>
  )
}
