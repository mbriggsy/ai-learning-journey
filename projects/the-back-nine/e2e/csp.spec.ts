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

  test("engine module Web Worker constructs + round-trips under worker-src 'self'", async ({ page }) => {
    await installCollector(page)
    await page.goto('/')

    // "…" → "N of 10 · <state>" only after the module worker constructs (worker-src 'self') AND the
    // real Monte Carlo engine round-trips over the transferred buffer. paths:2000 → generous timeout.
    await expect(page.getByTestId('engine-reading')).toHaveText(/^\d+ of 10 · /, { timeout: 30_000 })

    // No worker-src/script-src violation slipped through while the app + worker loaded under the CSP.
    const v = await violations(page)
    expect(v.some((x) => /worker-src|script-src/.test(x.violatedDirective))).toBe(false)
  })
})
