import { expect, type Locator, type Page } from '@playwright/test'
import { copy } from '../src/ui/copy'

/**
 * e2e/intakeDrive.ts: the one REAL first run, from the cold start through the first-run stepper to the home, shared by the
 * built-app harness's specs (`csp.spec.ts`'s engine and shell arms, `design-tokens.spec.ts`'s main-app Figtree arm). A
 * helper, never a spec (a spec never imports another spec). Moved out of `csp.spec.ts` at Act 6 · RC2; since RC14 it
 * drives the stepper (the walk is deleted): "Start a new plan" and its names drawer, then each step's cards and their
 * drawers, Next, and Complete.
 *
 * The household is the walk's: a complete all-retired 65/63 couple in NC with an ACA quote pair and one $1M 401(k).
 */

/** The open drawer. */
const drawer = (page: Page): Locator => page.getByRole('dialog')

/** A figure typed as a person types it: the box takes focus first (its focus swaps in the raw figure), then the text. */
async function typeIn(page: Page, label: string, text: string): Promise<void> {
  const box = drawer(page).getByLabel(label, { exact: true })
  await box.click()
  await box.fill(text)
}

/** A choice in a drawer's select (a portaled Base UI listbox). */
async function choose(page: Page, label: string, option: string): Promise<void> {
  await drawer(page).getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function save(page: Page): Promise<void> {
  await drawer(page).getByRole('button', { name: copy.profileDrawerSave, exact: true }).click()
  await expect(drawer(page), 'the drawer refused its Save').toHaveCount(0, { timeout: 10_000 })
}

async function card(page: Page, id: string): Promise<void> {
  await page.locator(`[data-profile-card="${id}"]`).click()
  await expect(drawer(page)).toBeVisible()
}

const next = (page: Page) => page.getByRole('button', { name: copy.setupNext, exact: true }).click()

export async function driveIntakeToResult(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: copy.coldStartBegin }).click()

  // "Start a new plan": the two first names.
  await expect(drawer(page).getByRole('heading', { name: copy.setupNewPlanTitle })).toBeVisible({ timeout: 30_000 })
  await typeIn(page, copy.setupNameYou, 'Pat')
  await typeIn(page, copy.setupNameSpouse, 'Sam')
  await drawer(page).getByRole('button', { name: copy.setupNewPlanStart, exact: true }).click()
  await expect(drawer(page)).toHaveCount(0)

  // Family: both already retired, with their stop ages; North Carolina (a priced state: the state pricing rides the
  // round trip under the enforced CSP).
  for (const [i, born, sex, stop] of [
    [0, '1961', copy.sexMale, '63'],
    [1, '1963', copy.sexFemale, '61'],
  ] as const) {
    await card(page, `person-${i}`)
    await typeIn(page, copy.birthYearLabel, born)
    await choose(page, copy.sexLegend, sex)
    await choose(page, copy.workStatusLegend, copy.workStatusRetired)
    await typeIn(page, copy.stopAgeLabel, stop)
    await save(page)
  }
  await card(page, 'state')
  await choose(page, copy.profileStateLabel, copy.stateOptionNC)
  await save(page)
  await next(page)

  // Income: Social Security, the monthly figure at full retirement age and the year each starts.
  for (const [i, monthly, year] of [
    [0, '2000', '2028'],
    [1, '1500', '2030'],
  ] as const) {
    await card(page, `ss-${i}`)
    await typeIn(page, copy.ssAmountLabel, monthly)
    await typeIn(page, copy.ssClaimLabel, year)
    await save(page)
  }
  await next(page)
  // Savings (nobody saving from pay), then Net Worth: one 401(k), all stock.
  await next(page)
  await page.getByRole('button', { name: copy.profileAddAccount }).click()
  await page.getByRole('menuitem', { name: copy.investBucketPretax }).click()
  await page.getByRole('menuitem', { name: copy.kind401k, exact: true }).click()
  await expect(drawer(page)).toBeVisible()
  await typeIn(page, copy.accountValueLabel, '1000000')
  await typeIn(page, copy.classifierStockPct, '100')
  await typeIn(page, copy.classifierBondPct, '0')
  await typeIn(page, copy.classifierCashPct, '0')
  await save(page)
  await next(page)

  // Expenses: the spending figure in the ambiguous band, its unit answered by a press on the month it already shows.
  await card(page, 'living')
  await typeIn(page, copy.spendLabel, '7000')
  await drawer(page).locator('[data-choice-group="living-period"] label[data-choice="month"]').click()
  await save(page)
  await next(page)

  // Goals: the ACA quote pair (63 < 65); Medicare's extras (an affirmed nothing beyond Part B) and the look-back income.
  await card(page, 'health')
  await typeIn(page, copy.enrolledPremiumLabel, '950')
  await typeIn(page, copy.slcspLabel, '880')
  await save(page)
  await card(page, 'medicare')
  for (const i of [0, 1]) await drawer(page).locator(`[data-extras-person="${i}"] label[data-choice="none"]`).click()
  await typeIn(page, copy.irmaaSeedTwoBackLabel, '120000')
  await typeIn(page, copy.irmaaSeedOneBackLabel, '110000')
  await save(page)

  // Complete: the draft goes to the store (provisional, then final) and the home opens. The module worker constructs
  // (worker-src 'self') and the real Monte Carlo engine round-trips before the home's figures draw: the callers assert
  // that on the home's own charts.
  await page.getByRole('button', { name: copy.setupComplete, exact: true }).click()
  await expect(page.locator('main.result')).toBeAttached({ timeout: 90_000 })
}
