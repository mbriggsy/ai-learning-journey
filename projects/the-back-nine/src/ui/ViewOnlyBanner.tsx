/**
 * Fork C(ii) — the standing view-only notice (U8 decrypt-on-return, council 2026-06-30).
 * A read-only open is a SUCCESS with a caveat: a second tab holds the writer, so this tab
 * decrypted the plan but cannot save. This banner is that caveat, standing for the whole
 * session view (the `secondTab` probe is captured ONCE at unlock and never re-checked —
 * session.ts — so the state cannot change without a reload, and the banner never needs to).
 *
 * ALWAYS mounted at the App root, empty when writable — a live region that first mounts
 * already-populated may not announce (burned/045), so the region exists from app start and
 * the populate is the announcement. `role='status'`, never alert: nothing went wrong.
 *
 * Icon + WORD + text (color-blind law — the lead word carries the state at a glance; the
 * mark is decorative), and the steer is RELOAD, never "close the other tab" (which would
 * promise an edit this tab can't grant without re-running the writer probe).
 *
 * Act 6 · RC19: a shell banner, drawn as the kit's StaleBanner is (a full-width strip, a plum bar at its left edge, the
 * eye mark and the bold "View-only" word, then the reason), above the shell's top bar so it stands on every page. Empty,
 * the region has no padding and no height.
 */
import { Eye } from 'lucide-react'
import { entryCopy } from './entryCopy'
import type { UnlockCopyKey } from './unlockCopy'

export function ViewOnlyBanner({ notice }: { readonly notice: UnlockCopyKey | null }) {
  return (
    <div className="view-only-banner rc-root w-full" role="status" aria-live="polite" aria-atomic="true" data-view-only="">
      {notice !== null && (
        <p className="flex items-start gap-2 border-b border-l-4 border-stone-300 border-l-plum bg-stone-100 px-4 py-3 text-body text-stone-900 wide:px-10">
          <span className="view-only-banner__mark mt-0.5 flex shrink-0 text-plum" aria-hidden="true">
            <Eye size={20} strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <strong className="font-semibold">{entryCopy.unlockReadOnlyLead}</strong> {entryCopy[notice]}
          </span>
        </p>
      )}
    </div>
  )
}
