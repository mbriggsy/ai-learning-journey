import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

/**
 * The copy fence (cross-cutting #4) proven NON-vacuous (D1 review T2): the ESLint
 * rule must FAIL on a planted inline user-facing string — visible JSXText AND an
 * aria-label literal — and PASS the catalog-routed form. A regex selector silently
 * stops matching after a parser/selector change; this control arm is what keeps
 * "every string routes through copy.ts" from being a vacuously-green guarantee
 * (mirrors the no-write seam's planted-write control).
 */

const eslint = new ESLint()

// Cold-loading ESLint + resolving the flat config is legitimately slow (~1.5s solo, but 5–6s under
// full-suite parallel CPU contention), which trips vitest's 5s default. Give these spawn-ESLint
// probes explicit headroom so the copy-fence guard never flakes the suite under load.
const ESLINT_TIMEOUT_MS = 30_000

const fenceMessages = async (code: string) => {
  // A src/intake/*.tsx path (NOT under __tests__, which the rule ignores) so the
  // copy-fence config applies; the file need not exist (no type-aware linting).
  const [result] = await eslint.lintText(code, { filePath: 'src/intake/__fence_probe__.tsx' })
  return result!.messages.filter((m) => m.ruleId === 'no-restricted-syntax')
}

describe('the copy fence is not vacuous (D1 review T2)', () => {
  it('FAILS on inline JSXText (a directive could otherwise ship unfenced)', async () => {
    const msgs = await fenceMessages('export const X = () => <p>Guaranteed to retire</p>')
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs.some((m) => /copy\.ts/.test(m.message))).toBe(true)
  }, ESLINT_TIMEOUT_MS)

  it('FAILS on an inline aria-label literal (the a11y directive channel)', async () => {
    const msgs = await fenceMessages('export const X = () => <button aria-label="Remove">x</button>')
    expect(msgs.length).toBeGreaterThan(0)
  }, ESLINT_TIMEOUT_MS)

  it('PASSES the catalog-routed form ({copy.key} text + aria-label)', async () => {
    const msgs = await fenceMessages(
      "import { copy } from '@ui/copy'\nexport const X = () => <p aria-label={copy.appTitle}>{copy.appTitle}</p>",
    )
    expect(msgs).toHaveLength(0)
  }, ESLINT_TIMEOUT_MS)
})
