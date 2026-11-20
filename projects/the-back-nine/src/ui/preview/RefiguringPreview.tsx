/*
 * src/ui/preview/RefiguringPreview.tsx — the DEV-ONLY re-figuring-window preview (W9-R7's U5,
 * `docs/plans/features/answered-draft-build-spec.md`).
 *
 * Reached at `?preview=refiguring&seed=<key>` (DEV-gated in main.tsx, dead-code-eliminated from the
 * production build). It mounts the REAL app on the seed, lets the seed's own runs land, and from the
 * first final-tier commit on HOLDS every later spine and date run: the household's next edit raises the
 * store's re-figuring flag over the settled answer, and the flag stays up. That is the window's frame —
 * the answer from before the edit, the line on the hero, the band caption's clause, the panel echo —
 * held still for as long as a harness needs to measure it. Live it lasts one run (~3 s on the spine, a
 * provisional sweep on the date route), too short to measure reliably (`docs/landmines.md`, The fit
 * gate and e2e, b9-5's "a window one run long"), so this preview is the measurement of record and
 * `e2e/vertical-fit.spec.ts`'s re-figuring arms read it.
 *
 * Why the real app and not the heroes alone (the `U7Preview.tsx` / `DatePreview.tsx` shape the plan
 * named): the fold the spine arm proves runs from the verdict to the R13 in-frame disclaimer, and that
 * disclaimer, the actions chain and the quiet doors are `Result.tsx`'s, not the heroes'. A hero-only
 * preview would measure a copy of that layout, never the page.
 *
 * What it holds, and how: `engineClient.engine` is the one handle the store calls at run time
 * (`deps.client.engine.run` / `.runDateSearch`, `src/store/memoryModel.ts`'s `recompute`), so this
 * module swaps those two methods for gated ones before the app mounts. A held call returns a promise
 * that never settles: the store keeps the shown answer and the flag (it clears only on a commit or a
 * held RETURN, KTD4), and nothing ever commits. Every other method passes through untouched — the spend
 * solve, the lever previews (`runTwoArm`), the recommendation solve. No store code changes; the store
 * cannot tell a held run from a slow one.
 *
 * When the hold arms: on the first commit of a final-tier answer with the flag down (a store
 * subscription, so it arms inside that commit's notify, before React paints `data-answer-tier="final"`
 * — a harness that waits for the settled page can never edit ahead of it). The seed's own provisional
 * and final runs dispatch before that commit, so they always pass.
 */
import { engineClient, type EngineHandle } from '@store/engineClient'
import { App } from '../App'
import { appModel } from '../appModel'

type WritableHandle = { -readonly [K in keyof EngineHandle]: EngineHandle[K] }

/** The answer of a held run: a promise that never settles. One shared instance; it holds no state. */
const HELD: Promise<never> = new Promise<never>(() => undefined)

let holding = false
const handle = engineClient.engine as WritableHandle
const runThrough = handle.run
const dateSearchThrough = handle.runDateSearch
handle.run = (...args) => (holding ? HELD : runThrough(...args))
handle.runDateSearch = (...args) => (holding ? HELD : dateSearchThrough(...args))

const stopArming = appModel.subscribe(() => {
  const { answer, refiguring } = appModel.getSnapshot()
  if ((answer.kind === 'headline' || answer.kind === 'date') && answer.tier === 'final' && !refiguring) {
    holding = true
    stopArming()
  }
})

export default function RefiguringPreview() {
  return <App seed={new URLSearchParams(window.location.search).get('seed')} vaultSeed={null} />
}
