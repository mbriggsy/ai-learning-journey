import { staticDisclosures } from './copy'

/**
 * R13 static honest-limits disclaimer — a Unit-0 constant OUTSIDE the copyGuard's
 * input (P2·U7). A mandatory directive-shaped line ("validate ... with a
 * professional") must stay legal even though imperative mood is forbidden in the
 * confidence/recommendation verdicts. Kept on honesty grounds, not as a Terms
 * requirement (R13 reset). The strings live in copy.ts's `staticDisclosures`
 * (the guard-exempt export) so the no-inline-copy lint holds file-wide. The two
 * sentences render on their own lines (scope, then the validate directive).
 *
 * TWO MOUNTS, ONE VISIBLE (council 2026-07-08, wf_a2d93977-960 — the Hawk's veto):
 * the page-trailing App mount is the structural FIRST CASUALTY of any overflow (a
 * reassuring verdict in-frame while "this can be wrong" scrolls out of sight is the
 * calm-but-wrong sin). So the Result surface carries a SECOND, `inFrame` mount seated
 * ABOVE the quiet doors inside the answer's own frame. CSS keeps exactly one visible:
 * the in-frame copy exists only at the laptop two-pane (≥ --bp-laptop), where app.css
 * hides the trailing mount behind `main.result`; below that width the in-frame copy is
 * display:none and the trailing mount stands — the phone renders byte-identically.
 * Both mounts read the SAME staticDisclosures strings — the words can never fork.
 */
export function Disclaimer({ inFrame = false }: { readonly inFrame?: boolean }) {
  return (
    <footer className={inFrame ? 'disclaimer disclaimer--in-frame' : 'disclaimer'}>
      <p>
        {staticDisclosures.honestLimitsScope}
        <br />
        {staticDisclosures.honestLimitsValidate}
      </p>
    </footer>
  )
}
