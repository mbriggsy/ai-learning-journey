/**
 * The R13 caveat's one id and the verdict's description list that names it (`Disclaimer.tsx` mounts the caveat; both
 * heroes build their `aria-describedby` here). Moved out of `Disclaimer.tsx` by Act 6's RC0, unchanged. Not named
 * `disclaimer.ts`: on Windows's case-blind disk `./Disclaimer` would resolve to it before `Disclaimer.tsx`.
 */

/** The in-frame mount's element id — the verdict elements name it in `aria-describedby`, so the
 *  screen-reader reads the caveat as the verdict's own description (council 2026-09-10). */
export const IN_FRAME_DISCLAIMER_ID = 'r13-caveat'

/** A hero verdict heading's `aria-describedby` list: a line that must be heard WITH the verdict first
 *  (W9-R7, KTD6: the re-figuring line, while a run on newer inputs is in flight), then the caveat,
 *  which is always named. Both heroes build their list here, so the caveat's id is never re-typed. */
export function verdictDescribedBy(leadId?: string): string {
  return leadId === undefined ? IN_FRAME_DISCLAIMER_ID : `${leadId} ${IN_FRAME_DISCLAIMER_ID}`
}
