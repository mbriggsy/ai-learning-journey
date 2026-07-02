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
 */
import { copy } from './copy'
import type { UnlockCopyKey } from './unlockCopy'

export function ViewOnlyBanner({ notice }: { readonly notice: UnlockCopyKey | null }) {
  return (
    <div className="view-only-banner" role="status" aria-live="polite" aria-atomic="true">
      {notice !== null && (
        <p className="view-only-banner__inner">
          <span className="view-only-banner__mark" aria-hidden="true" />
          <span className="view-only-banner__body">
            <strong className="view-only-banner__lead">{copy.unlockReadOnlyLead}</strong>{' '}
            {copy[notice]}
          </span>
        </p>
      )}
    </div>
  )
}
