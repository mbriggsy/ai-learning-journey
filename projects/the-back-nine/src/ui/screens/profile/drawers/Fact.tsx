/**
 * src/ui/screens/profile/drawers/Fact.tsx: the stamp a drawer puts around the field that edits a saved fact (Act 6 ·
 * RC13b): `data-fact` names the draft fields it writes, by the fact registry's own stamps (`factRegistry.ts`). The field
 * walk (`workbench/__tests__/factRegistry.test.tsx`) opens every drawer and reads these, so every shown fact provably has a
 * drawer home. `display: contents`: the stamp draws no box of its own, so the drawer's layout is the field's.
 */
import type { ReactNode } from 'react'
import type { FactStamp } from '../../../workbench/factRegistry'

export function Fact({ stamp, children }: { readonly stamp: `${FactStamp}` | `${FactStamp} ${string}`; readonly children: ReactNode }) {
  return (
    <div className="contents" data-fact={stamp}>
      {children}
    </div>
  )
}
