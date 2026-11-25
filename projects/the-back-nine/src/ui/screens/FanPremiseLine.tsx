/**
 * src/ui/screens/FanPremiseLine.tsx: the aged fan's premise line (`fanPremise` in `src/ui/fanNotes.ts`), shared by
 * Snapshot's fan card and Confidence's key-metric column. Its re-confirm door rides inline after the sentence (the old
 * band's grammar), drawn only where the view offers it and the shell wired the re-walk.
 */
import type { FanPremise } from '../fanNotes'

/** The aged fan's premise, its re-confirm door inline after the sentence (the old band's grammar). */
export function FanPremiseLine({ premise, onReconfirm }: { readonly premise: FanPremise; readonly onReconfirm?: () => void }) {
  return (
    <p className="text-label text-stone-600" data-fan-premise="">
      <span>{premise.text}</span>
      {premise.door !== undefined && onReconfirm !== undefined ? (
        <>
          {' '}
          <button type="button" className="text-label text-blue-ink underline underline-offset-2" onClick={onReconfirm}>
            {premise.door.label}
          </button>
        </>
      ) : null}
    </p>
  )
}
