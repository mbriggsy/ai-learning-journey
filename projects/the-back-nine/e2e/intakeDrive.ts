import { expect, type Page } from '@playwright/test'

/**
 * e2e/intakeDrive.ts: the one REAL walk from cold start through the guided intake to the answer page, shared by the
 * built-app harness's specs (`csp.spec.ts`'s engine and shell arms, `design-tokens.spec.ts`'s main-app Figtree arm). A
 * helper, never a spec (a spec never imports another spec). Moved out of `csp.spec.ts` unchanged at Act 6 · RC2.
 */
/**
 * Cold start → the guided intake → the Result, under whatever headers the page was served with — the
 * one REAL path both engine arms walk (the spine worker's round trip, then the pooled solve's workers).
 * A complete all-retired 65/63 household in NC with an ACA quote pair, one $1M 401(k).
 */
export async function driveIntakeToResult(page: Page): Promise<void> {
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

  // The retirement-state step (the state-tax unit — it sits BEFORE spend so the
  // spend help can speak state-aware). Pick NC: the priced-state path then runs
  // through the real engine under the enforced CSP — the state pricing is part
  // of the round trip this walk proves.
  await page.getByRole('radio', { name: 'North Carolina' }).check({ force: true })
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

  // Medicare extras (the ask-for-extras payment fork, 503213f4) — per-person,
  // nothing pre-selected; the fork passes no `required` — only a half-answer blocks advance. The MA arm is
  // an affirmed $0 beyond Part B, keeping this walk's household numbers as
  // they were before the unit.
  await pick(you, 'About nothing beyond Part B (common on Medicare Advantage)')
  await pick(spouse, 'About nothing beyond Part B (common on Medicare Advantage)')
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

  // R40's opt-in other-income loop is the LAST intake step on THIS walk's all-retired route
  // (src/intake/questions.tsx pushes `otherIncomeStep` after the accounts step, with `fields: []`,
  // so nothing blocks the advance; the pay check's two steps follow it only on the date route) —
  // one more Continue completes the intake (flow.tsx onComplete → IntakeApp `complete` → the shell, the
  // home since Act 6 · RC4) and lands Dashboard → Snapshot, so a REAL chart is proven under the REAL
  // enforced headers. The fit harness structurally cannot do this: `?seed=` is DCE'd out of dist/
  // (playwright.config.ts), and design-tokens.spec.ts's CSSOM proof is a synthetic node, not a chart.
  await next()
  await expect(page.locator('main.result')).toBeAttached({ timeout: 90_000 })
}
