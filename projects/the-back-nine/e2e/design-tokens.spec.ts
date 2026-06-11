import { test, expect } from '@playwright/test'

/**
 * Design-token REALITY proofs (real Chromium, real built dist/, real enforced CSP from
 * scripts/serve-dist-with-headers.ts — the same harness as csp.spec.ts):
 *
 *  1. Both self-hosted variable fonts actually LOAD under `font-src 'self'` — a CSP or
 *     bundling regression here would silently ship the Georgia/system fallback.
 *  2. THE FIGURE LAW: digits in the body face render at equal advance widths under the
 *     app's inherited `font-variant-numeric: tabular-nums` (base.css), so an in-place
 *     recompute can never jitter a dollar figure horizontally. A font silently lacking
 *     `tnum` is a false green (back-nine-design §tabular) — this is the render-level
 *     verification that comment points at.
 *  3. The discriminating control arm (burned/070 — the proof must be able to fail):
 *     forcing `proportional-nums` on the same digits must CHANGE at least one digit
 *     string's width. If it doesn't, the equality in (2) proves nothing about the
 *     feature — fail loud and investigate the shipped font file.
 *
 * All probe nodes are styled via CSSOM property assignment (el.style.x = …), which the
 * strict style-src 'self' policy permits — never injected <style> or style attributes.
 */

test.describe('design tokens — fonts + the figure law', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('both self-hosted variable fonts load under the enforced CSP', async ({ page }) => {
    const loaded = await page.evaluate(async () => {
      // Force both families regardless of what the current App body happens to render.
      const force = (family: string) => {
        const el = document.createElement('span')
        el.textContent = 'Aa 0123456789'
        el.style.fontFamily = family
        el.style.position = 'absolute'
        el.style.visibility = 'hidden'
        document.body.appendChild(el)
        return el
      }
      force('"Fraunces Variable"')
      force('"Source Sans 3 Variable"')
      await document.fonts.ready
      return {
        fraunces: document.fonts.check('600 32px "Fraunces Variable"'),
        sourceSans: document.fonts.check('400 17px "Source Sans 3 Variable"'),
      }
    })
    expect(loaded.fraunces, 'Fraunces Variable failed to load — display face falling back').toBe(true)
    expect(loaded.sourceSans, 'Source Sans 3 Variable failed to load — body face falling back').toBe(true)
  })

  test('digits are tabular in the body face (and the probe can fail: proportional-nums changes widths)', async ({
    page,
  }) => {
    const widths = await page.evaluate(async () => {
      const probe = (text: string, variant: string) => {
        const el = document.createElement('span')
        el.textContent = text
        el.style.fontFamily = '"Source Sans 3 Variable"'
        el.style.fontSize = '32px'
        el.style.fontVariantNumeric = variant
        el.style.position = 'absolute'
        el.style.visibility = 'hidden'
        el.style.whiteSpace = 'pre'
        document.body.appendChild(el)
        return el
      }
      // The thinnest vs widest digit strings — the worst case for advance-width drift.
      const tab1 = probe('1111111111', 'tabular-nums lining-nums')
      const tab9 = probe('9999999999', 'tabular-nums lining-nums')
      const prop1 = probe('1111111111', 'proportional-nums lining-nums')
      const prop9 = probe('9999999999', 'proportional-nums lining-nums')
      await document.fonts.ready
      return {
        tab1: tab1.getBoundingClientRect().width,
        tab9: tab9.getBoundingClientRect().width,
        prop1: prop1.getBoundingClientRect().width,
        prop9: prop9.getBoundingClientRect().width,
      }
    })

    // (2) The load-bearing contract: equal advance widths under tabular-nums.
    expect(Math.abs(widths.tab1 - widths.tab9), `tabular widths differ: ${JSON.stringify(widths)}`).toBeLessThan(0.5)

    // (3) The control arm: the feature must DO something, or (2) is vacuous.
    expect(
      Math.abs(widths.prop1 - widths.prop9),
      `proportional-nums did not change digit widths — tnum/pnum features may be missing from the shipped font: ${JSON.stringify(widths)}`,
    ).toBeGreaterThan(0.5)

    // The inherited default (base.css :root) matches the tabular arm — the law holds
    // without any per-component opt-in.
    const inherited = await page.evaluate(() => {
      const el = document.createElement('span')
      el.textContent = '1111111111'
      el.style.fontFamily = '"Source Sans 3 Variable"'
      el.style.fontSize = '32px'
      el.style.position = 'absolute'
      el.style.visibility = 'hidden'
      document.body.appendChild(el)
      const eq = document.createElement('span')
      eq.textContent = '9999999999'
      eq.style.fontFamily = '"Source Sans 3 Variable"'
      eq.style.fontSize = '32px'
      eq.style.position = 'absolute'
      eq.style.visibility = 'hidden'
      document.body.appendChild(eq)
      return Math.abs(el.getBoundingClientRect().width - eq.getBoundingClientRect().width)
    })
    expect(inherited, 'body-inherited font-variant-numeric is not tabular').toBeLessThan(0.5)
  })
})
