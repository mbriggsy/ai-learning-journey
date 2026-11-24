// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Result } from '../Result'
import { copy } from '../copy'
import { appModel } from '../appModel'
import { DEV_SEEDS } from '../devSeeds'

/**
 * The INTERIM recommendation tab (Act 6 · RC4: `Result.tsx` reduced to Tax → Tax Strategies until RC8). The old answer
 * page's save slot, backup door, doors row and heroes left with RC4 (the save state lives in the shell's lock menu,
 * `lockMenu.test.ts`; the backup re-offer joined it; the answer's words are Snapshot's and Probability's). What this
 * pins is the interim tab's own contract (plan 3.1's settle hook and 4.0's R13 rule):
 * - it renders a `div.result-page`, never a `<main>`, and carries no tier attributes (the shell's one `main.result`
 *   does: two would make `SETTLED_RESULT` a strict-mode error in every gate);
 * - it renders no disclaimer of its own (the shell's R13 mount covers the page);
 * - on the working route, where the solve does not run, it shows RC8's working-route line and nothing else.
 */
const pristineDraft = appModel.getSnapshot().draft
afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
})

describe('the interim Tax Strategies tab', () => {
  it('a div.result-page with no tier attributes, no <main> and no disclaimer of its own', () => {
    appModel.update(() => DEV_SEEDS.retired)
    const { container } = render(<Result />)
    const page = container.querySelector('.result-page')
    expect(page).not.toBeNull()
    expect(page!.tagName).toBe('DIV')
    expect(container.querySelector('main')).toBeNull()
    expect(container.querySelector('[data-answer-tier]')).toBeNull()
    expect(container.querySelector('[data-answer-refiguring]')).toBeNull()
    expect(container.querySelector('footer.disclaimer, [data-caveat]')).toBeNull()
  })

  it('on the working route: the working-route line, and no recommendation surface, invite or picker door', () => {
    appModel.update(() => DEV_SEEDS.dip)
    const { container } = render(<Result />)
    expect(screen.getByText(copy.strategiesInterimWorkingRoute)).toBeInTheDocument()
    expect(container.querySelector('.recommendation-surface')).toBeNull()
    expect(screen.queryByRole('button', { name: copy.recommendInviteCta })).toBeNull()
  })
})
