import { test, expect, type Page } from '@playwright/test'
import { driveIntakeToResult } from './intakeDrive'
import { copy } from '../src/ui/copy'

/**
 * Design-token REALITY proofs (real Chromium, real built dist/, real enforced CSP from
 * scripts/serve-dist-with-headers.ts — the same harness as csp.spec.ts):
 *
 *  1. Both self-hosted variable fonts actually LOAD under `font-src 'self'` — a CSP or
 *     bundling regression here would silently ship the Georgia/system fallback. Read from the
 *     font set's FontFace entries (`status === 'loaded'`), with a fake family as the control;
 *     never `document.fonts.check`, which is true for a family that does not exist (insight 116).
 *     Act 6's Figtree gets the same two arms on the kit probe page (its own describe below).
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

/** A family no stylesheet declares: the control that proves `loadedFamilies` can read false. */
const FAKE_FAMILY = 'No Such Family B9'

/**
 * Asks the page to load each family (400 weight, the face covering a space), waits for the font set, and reads
 * whether a FontFace of that family now reports `status === 'loaded'`. Never `document.fonts.check`, which answers
 * true for a family nobody declared (insight 116).
 */
async function loadedFamilies(page: Page, families: readonly string[]): Promise<Record<string, boolean>> {
  return page.evaluate(async (names) => {
    await Promise.all(names.map((n) => document.fonts.load(`400 32px "${n}"`).catch(() => [])))
    await document.fonts.ready
    const faces = [...document.fonts]
    const bare = (f: string) => f.replace(/^["']|["']$/g, '')
    return Object.fromEntries(names.map((n) => [n, faces.some((f) => bare(f.family) === n && f.status === 'loaded')]))
  }, families)
}

/** Digit-string widths in `family` at 32 px, tabular and proportional (the figure law's measurement). */
async function digitWidths(page: Page, family: string) {
  return page.evaluate(async (fam) => {
    const probe = (text: string, variant: string) => {
      const el = document.createElement('span')
      el.textContent = text
      el.style.fontFamily = `"${fam}"`
      el.style.fontSize = '32px'
      el.style.fontVariantNumeric = variant
      el.style.position = 'absolute'
      el.style.visibility = 'hidden'
      el.style.whiteSpace = 'pre'
      document.body.appendChild(el)
      return el
    }
    const tab1 = probe('1111111111', 'tabular-nums lining-nums')
    const tab9 = probe('9999999999', 'tabular-nums lining-nums')
    const prop1 = probe('1111111111', 'proportional-nums lining-nums')
    const prop9 = probe('9999999999', 'proportional-nums lining-nums')
    await document.fonts.load(`400 32px "${fam}"`)
    await document.fonts.ready
    return {
      tab1: tab1.getBoundingClientRect().width,
      tab9: tab9.getBoundingClientRect().width,
      prop1: prop1.getBoundingClientRect().width,
      prop9: prop9.getBoundingClientRect().width,
    }
  }, family)
}

/**
 * Act 6 · RC1 (plan docs/plans/6-rightcapital-ui-plan.md, section 2.3): Figtree, the clone's one face, self-hosted from
 * `@fontsource-variable/figtree`. In RC1 only the kit probe page loaded it, so these arms read `kit-probe.html` on the
 * same enforced origin; since RC2 the main entry imports it too, and one arm reads it inside the shell. Its default digits are proportional (ref 3.5), so the figure law is the tabular pair below with
 * its proportional control, exactly as for the body face above.
 */
test.describe('design tokens — Figtree (the kit probe and the main app)', () => {
  test('Figtree loads under the enforced CSP (and the check can fail: a fake family reads unloaded)', async ({ page }) => {
    await page.goto('/kit-probe.html')
    const loaded = await loadedFamilies(page, ['Figtree Variable', FAKE_FAMILY])
    expect(loaded['Figtree Variable'], 'Figtree Variable failed to load — the clone’s face falling back').toBe(true)
    expect(loaded[FAKE_FAMILY], 'a family that does not exist read as loaded — the check is deaf').toBe(false)
  })

  test('the main app loads Figtree too: inside the shell the wordmark computes in it, and the font set holds a loaded entry (a fake family reads unloaded)', async ({ page }) => {
    // Act 6 · RC2: the shell is the first `.rc-root` surface in the main app, so the main entry (`src/main.tsx`) imports
    // the face, not only the probe. Entered as a user would: the real intake, whose end lands on the shell (the home
    // since RC4).
    test.setTimeout(180_000)
    await driveIntakeToResult(page)
    await expect(page.locator('main.result[data-shell-screen]')).toBeAttached({ timeout: 120_000 })
    const word = page.getByRole('link', { name: copy.shellHomeLabel }).getByText(copy.appTitle, { exact: true })
    await expect(word, 'the wordmark’s words are drawn at this width').toBeVisible()
    const family = await word.evaluate((el) => getComputedStyle(el).fontFamily.replace(/["']/g, ''))
    expect(family, 'the wordmark computes in Figtree').toMatch(/^Figtree Variable(,|$)/)
    const loaded = await loadedFamilies(page, ['Figtree Variable', FAKE_FAMILY])
    expect(loaded['Figtree Variable'], 'Figtree Variable is not loaded in the main app — its .rc-root surfaces fall back').toBe(true)
    expect(loaded[FAKE_FAMILY], 'a family that does not exist read as loaded — the check is deaf').toBe(false)
  })

  test('Figtree’s digits are tabular under tabular-nums (and the probe can fail: proportional-nums changes widths)', async ({ page }) => {
    await page.goto('/kit-probe.html')
    const w = await digitWidths(page, 'Figtree Variable')
    expect(Math.abs(w.tab1 - w.tab9), `tabular widths differ: ${JSON.stringify(w)}`).toBeLessThan(0.5)
    expect(
      Math.abs(w.prop1 - w.prop9),
      `proportional-nums did not change Figtree’s digit widths — tnum/pnum may be missing from the shipped file: ${JSON.stringify(w)}`,
    ).toBeGreaterThan(0.5)
    // The kit root inherits tabular-nums (theme.css's scoped base), so a number on a new screen is tabular by default.
    const inherited = await page.locator('main.rc-root').evaluate((el) => getComputedStyle(el).fontVariantNumeric)
    expect(inherited).toContain('tabular-nums')
  })
})

test.describe('design tokens — fonts + the figure law', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('both self-hosted variable fonts load under the enforced CSP (and the check can fail: a fake family reads unloaded)', async ({ page }) => {
    // `document.fonts.check(...)` answers true for a family that does not exist at all (insight 116), so it proves
    // nothing. The proof is a FontFace entry of the family whose status is 'loaded', after asking for it; the fake
    // family is the control that shows the reading can come back false.
    const loaded = await loadedFamilies(page, ['Fraunces Variable', 'Source Sans 3 Variable', FAKE_FAMILY])
    expect(loaded['Fraunces Variable'], 'Fraunces Variable failed to load — display face falling back').toBe(true)
    expect(loaded['Source Sans 3 Variable'], 'Source Sans 3 Variable failed to load — body face falling back').toBe(true)
    expect(loaded[FAKE_FAMILY], 'a family that does not exist read as loaded — the check is deaf').toBe(false)
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

/**
 * THE CHART TEXT LAYER'S CSP PREMISE (council wf_ecbe0ab2-7bb, 2026-09-05). Every word on the four
 * result charts is HTML positioned by React style-prop custom properties (`--fx`/`--fy`,
 * src/viz/chartText.tsx). React applies a style prop through the CSSOM (element.style.setProperty),
 * which the strict `style-src 'self'` policy does NOT govern — a style ATTRIBUTE string does. This
 * arm proves BOTH halves in the real browser under the real served headers (the same harness as
 * csp.spec.ts): a CSSOM custom-property position LANDS, and the discriminating control — the same
 * position written as a style attribute string — is BLOCKED. If Chromium ever changed either, the
 * text layer would silently pile every label at the origin; this is where that would go red.
 *
 * (Until 2026-09-05 this file also pinned the svg readout box's fixed width against the catalog
 * strings — the box is HTML now and hugs its content, so a catalog string can no longer clip.)
 */
test.describe('the chart text layer — CSSOM custom properties land under the enforced CSP', () => {
  test('a --fx custom property set via the CSSOM positions the node; a style ATTRIBUTE string is blocked', async ({ page }) => {
    await page.goto('/')
    const probe = await page.evaluate(() => {
      const host = document.createElement('div')
      host.style.position = 'relative'
      host.style.width = '400px'
      host.style.height = '40px'
      host.style.visibility = 'hidden'
      document.body.appendChild(host)
      // the text layer's channel: CSSOM property writes
      const cssom = document.createElement('span')
      cssom.style.position = 'absolute'
      cssom.style.setProperty('--fx', '0.5')
      cssom.style.left = 'calc(var(--fx) * 100%)'
      cssom.textContent = 'x'
      host.appendChild(cssom)
      // the control: the same position as a style ATTRIBUTE string (what style-src 'self' forbids)
      const attr = document.createElement('span')
      attr.setAttribute('style', 'position:absolute;left:300px')
      attr.textContent = 'x'
      host.appendChild(attr)
      const out = {
        cssomLeft: parseFloat(getComputedStyle(cssom).left),
        attrLeft: getComputedStyle(attr).left,
        attrPosition: getComputedStyle(attr).position,
      }
      host.remove()
      return out
    })
    // 0.5 × 400px host = 200px: the CSSOM write landed
    expect(probe.cssomLeft, 'the CSSOM custom-property position did not land — the text layer would collapse').toBeCloseTo(200, 0)
    // the attribute string was refused (an unpositioned span reports left "auto"): the CSP is enforced
    expect(probe.attrPosition, 'a style ATTRIBUTE applied under the served CSP — the policy is not enforced (bypassCSP?)').toBe('static')
    expect(probe.attrLeft).toBe('auto')
  })
})
