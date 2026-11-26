/**
 * src/ui/kit/Caveat.tsx: the R13 caveat line inside a figured page's panel, above its handle (plan 4.0, "The R13
 * disclaimer"). The words are the caller's (the R13 keys, `staticDisclosures` in `entryCopy.ts`); the element carries
 * the one in-frame id the page's answer names in `aria-describedby` (`verdictDescribedBy`, `disclaimerId.ts`), so a
 * screen reader hears the caveat as the answer's own description. Each line renders on its own line, a space kept
 * before each break so the text reads "advice. Validate", never "advice.Validate" (landmines, UI and product).
 */
import { Fragment } from 'react'
import { IN_FRAME_DISCLAIMER_ID } from '../disclaimerId'
import { cn } from './cn'

export interface CaveatProps {
  readonly lines: readonly string[]
  /** The element's id; the one in-frame id by default. `null` for App's trailing mount (Act 6 · RC19), which no answer
   *  names (the page-trailing caveat on a screen with no figure: unlock, the cold start, Profile, Settings). */
  readonly id?: string | null
  readonly className?: string
}

export function Caveat({ lines, id = IN_FRAME_DISCLAIMER_ID, className }: CaveatProps) {
  return (
    <footer id={id ?? undefined} data-caveat="" className={cn('text-label text-stone-600', className)}>
      <p>
        {lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <>
                {' '}
                <br />
              </>
            ) : null}
            {line}
          </Fragment>
        ))}
      </p>
    </footer>
  )
}
