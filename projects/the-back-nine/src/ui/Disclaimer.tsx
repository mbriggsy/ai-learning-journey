import { staticDisclosures } from './copy'

/**
 * R13 static honest-limits disclaimer — a Unit-0 constant OUTSIDE the copyGuard's
 * input (P2·U7). A mandatory directive-shaped line ("validate ... with a
 * professional") must stay legal even though imperative mood is forbidden in the
 * confidence/recommendation verdicts. Kept on honesty grounds, not as a Terms
 * requirement (R13 reset). The string lives in copy.ts's `staticDisclosures`
 * (the guard-exempt export) so the no-inline-copy lint holds file-wide.
 */
export function Disclaimer() {
  return (
    <footer className="disclaimer">
      <p>{staticDisclosures.honestLimits}</p>
    </footer>
  )
}
