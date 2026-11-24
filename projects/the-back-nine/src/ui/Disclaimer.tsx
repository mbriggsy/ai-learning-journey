import { staticDisclosures } from './entryCopy'

/** The in-frame mount's element id — the verdict elements name it in `aria-describedby`, so the
 *  screen-reader reads the caveat as the verdict's own description (council 2026-09-10). */
export const IN_FRAME_DISCLAIMER_ID = 'r13-caveat'

/** A hero verdict heading's `aria-describedby` list: a line that must be heard WITH the verdict first
 *  (W9-R7, KTD6: the re-figuring line, while a run on newer inputs is in flight), then the caveat,
 *  which is always named. Both heroes build their list here, so the caveat's id is never re-typed. */
export function verdictDescribedBy(leadId?: string): string {
  return leadId === undefined ? IN_FRAME_DISCLAIMER_ID : `${leadId} ${IN_FRAME_DISCLAIMER_ID}`
}

/**
 * R13 static honest-limits disclaimer — a Unit-0 constant OUTSIDE the copyGuard's
 * input (P2·U7). A mandatory directive-shaped line ("validate ... with a
 * professional") must stay legal even though imperative mood is forbidden in the
 * confidence/recommendation verdicts. Kept on honesty grounds, not as a Terms
 * requirement (R13 reset). The strings live in `staticDisclosures` (the guard-exempt
 * export), in `entryCopy.ts` because the App mount ships in the entry chunk (copy.ts
 * re-exports it), so the no-inline-copy lint holds file-wide. The two
 * sentences render on their own lines (scope, then the validate directive).
 *
 * TWO MOUNTS, ONE VISIBLE (council 2026-07-08, wf_a2d93977-960 — the Hawk's veto):
 * the page-trailing App mount is the structural FIRST CASUALTY of any overflow (a
 * reassuring verdict in-frame while "this can be wrong" scrolls out of sight is the
 * calm-but-wrong sin). So the Result surface carries a SECOND, `inFrame` mount seated
 * ABOVE the quiet doors inside the answer's own frame. CSS keeps exactly one visible,
 * keyed to the VERDICT, not the tier (council 2026-09-10, wf_d2b1d05a-001): whenever the
 * in-frame mount is rendered — every committed verdict, at every width — app.css hides
 * the trailing mount behind `main.result[data-inframe-disclaimer]`; while computing the
 * in-frame mount is withheld with the actions row and the trailing mount stands. (Until
 * 2026-09-10 the in-frame copy existed only at ≥ --bp-laptop, so on the phone — and on
 * any laptop whose reader raised the browser font past 68rem's reach — the caveat was
 * the page's last element, AFTER the doors: the inversion this component exists to
 * prevent.) Both mounts read the SAME staticDisclosures strings — the words can never fork.
 * Where the in-frame mount sits, and whether it renders at all, is decided once, by `caveatSeat`
 * in answerView.ts: Result reads that one value for both the mount and the attribute.
 */
export function Disclaimer({ inFrame = false }: { readonly inFrame?: boolean }) {
  return (
    <footer
      className={inFrame ? 'disclaimer disclaimer--in-frame' : 'disclaimer'}
      id={inFrame ? IN_FRAME_DISCLAIMER_ID : undefined}
    >
      <p>
        {staticDisclosures.honestLimitsScope}
        {/* The space is never painted (it ends the line); it keeps the two sentences apart in
            textContent, so a screen reader and every text read see "advice. Validate". */}
        {' '}
        <br />
        {staticDisclosures.honestLimitsValidate}
      </p>
    </footer>
  )
}
