import { expect, type CDPSession, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { test, pinPlantDay, REAL, REAL_DPR, PHONE, PHONE_DPR, FINAL_TIER_MS, SETTLED_RESULT, gotoSeedFinal, settleLayout } from './reviewSurface'
// Every word the walk presses or waits on is the CATALOG's, never re-typed here: a literal is a second copy of the
// product's words, and a re-word would silently break the walk that reads it.
import { copy } from '../src/ui/copy'
import { ROUTE_ROWS, routeHash, routeOf } from '../src/ui/shell/routes'

/**
 * The Caddie's WALK (own harness: playwright.caddie.config.ts, `pnpm caddie:walk`) — captures the cold-read bundle the
 * reader panel consumes (.claude/skills/caddie/SKILL.md). NOT a gate: the few assertions here are presence companions,
 * so a broken surface fails the walk RED instead of bundling a blank page (the insight-029 vacuity discipline).
 *
 * Act 6 · RC21 re-pointed the walk at the RightCapital clone's screens. The old walk drove the answer page's quiet doors,
 * the assumptions panel, the lever sheets, the GoalPicker and the old intake's steps, all gone (RC4 to RC19); its
 * witness walks (`intake:fork`, `paycheck`, `leftover`, `kept`, `typedbelow`, `typedmoved`) and their per-witness word
 * assertions left with those surfaces. Their laws live in the gates now: the pay check's standing line and its gate in
 * e2e/rc-screens.spec.ts (the "pay check" arms), the W drawer's faces in its RC13b and RC14 arms, the stepper in its
 * RC14 arms. The git history (this file before RC21) holds the old walks.
 *
 * Bundle law (from the verified research, 2026-07-09), unchanged:
 *  - Words are captured VERBATIM from the DOM (`copy.txt`/`dialog.txt`) — a reader never OCRs the product's sentences.
 *  - The above-fold frame ships at CSS scale (REAL's 1440px long edge, under the ~2576px model ingestion cap); text-
 *    critical regions additionally ship as DEVICE-scale crops (small text survives).
 *  - Colour-vision arms use Chrome's own emulation (CDP setEmulatedVisionDeficiency) — a screening flag for the
 *    readers, never a colour verdict; every chart on a state is cropped under each arm (`cvd-<arm>-<chart>.png`).
 *  - Capture order matters: fold/aria/copy first (no visual side effects), then the above-fold + CVD shots (same pinned
 *    scroll), then fullpage (and the full scroll under each CVD arm) + element crops LAST (they may scroll).
 *  - Run-stamped bundle dirs: temp/caddie/<run>/<target>/<viewport>/<state>/, so a re-walk never overwrites a bundle a
 *    reader panel is mid-read on.
 *
 * TARGETS (`CADDIE_TARGETS="seed:retired,vault:datesavedrisen,solve:surplus,intake:new"`, a comma list; back-compat
 * `CADDIE_SEED=budget` is one seed target; default `seed:retired`):
 *  - `seed:<key>` — the seed's settled answer lands on the home: `landing` (Dashboard → Snapshot), then every page the
 *    shell draws, in the route table's order (`page-<screen>`: Balance Sheet, Investment, Analysis's five tabs, Stress
 *    Test, Social Security, Health Care, Cash Flows, Tax Strategies, Profile's pages, Settings), each reached by its
 *    address and settled; then, where the home's StaleBanner carries a standing line with a door, that door's drawer
 *    (`door-<slug>`), the shell's one home for a "this answer may be out of date" fix.
 *  - `vault:<key>` — the decrypt-on-return arc: the unlock card (`unlock`), the re-entry gate where the return raises
 *    one (`gate`), the affirmed home (`landing`) and its standing line's drawer where it has one.
 *  - `solve:<key>` — the recommend-second arc on Tax Strategies: its first frame (`landing`), the goal picked by its
 *    label and Find pressed (`pending`, the Calculating frame), then the Winner card and its list at full worker
 *    precision (`committed`); a household the solve refuses ends on its own words (`after-find`).
 *  - `intake:new` — a fresh plan: the cold start (`cold-start`), "Start a new plan" (`new-plan`, the names dialog),
 *    then each of the first-run stepper's six steps, empty (`setup-<step>`).
 */

interface Target {
  readonly kind: 'seed' | 'vault' | 'intake' | 'solve'
  readonly key: string
}

/** The old walks RC21 retired, each with where its law lives now (a stale target fails loud, never silently). */
const RETIRED_INTAKE: Readonly<Record<string, string>> = {
  fork: 'the old walk is gone (RC14); the stepper is `intake:new`',
  paycheck: 'the W step and money picture live in the Pre-retirement living expenses drawer (`seed:datecoststale` opens it)',
  leftover: 'the left-over question lives in the W drawer (`seed:datesavedmoved` opens it)',
  kept: 'the kept figure lives in the W drawer (`seed:datecoststale` opens it)',
  typedbelow: 'the typed-below line rides the StaleBanner (`seed:datesavedtypedpension`)',
  typedmoved: 'the moved line rides the StaleBanner (`seed:datesavedtypedmoved`)',
}

function parseTargets(): Target[] {
  const raw = process.env.CADDIE_TARGETS ?? (process.env.CADDIE_SEED !== undefined ? `seed:${process.env.CADDIE_SEED}` : 'seed:retired')
  return raw.split(',').map((entry) => {
    const [kind, key] = entry.trim().split(':')
    if ((kind !== 'seed' && kind !== 'vault' && kind !== 'intake' && kind !== 'solve') || key === undefined || key === '') {
      throw new Error(`bad CADDIE_TARGETS entry "${entry}" — expected seed:<key>, vault:<key>, intake:new, or solve:<key>`)
    }
    if (kind === 'intake' && key !== 'new') {
      const why = RETIRED_INTAKE[key]
      throw new Error(why !== undefined ? `intake:${key} retired at Act 6 · RC21: ${why}` : `unknown intake walk "${key}" — intake:new is the one intake walk`)
    }
    return { kind, key }
  })
}

const TARGETS = parseTargets()
// The run stamp is minted once in playwright.caddie.config.ts (the runner process; workers inherit it) — 'adhoc' only
// if the spec somehow runs outside its own harness.
const OUT_ROOT = process.env.CADDIE_OUT ?? path.join('temp', 'caddie', process.env.CADDIE_RUN ?? 'adhoc')

/** Text-critical / meaning-critical regions cropped at device scale when present (`cvd`: also under every CVD arm). */
const CROP_TARGETS = [
  // The page's heading and the ring card's reading (Snapshot), Probability's rings, the Winner card (Tax Strategies).
  { name: 'heading', selector: 'main.result h1' },
  { name: 'ring', selector: '[data-ring-half="compared"]', cvd: true },
  { name: 'winner', selector: '[data-winner]' },
  // The StaleBanner (every "this answer may be out of date" line) and the pay check's standing line inside it.
  { name: 'stale-banner', selector: '[data-stale-banner]' },
  { name: 'paycheck-note', selector: '[data-stale-banner] .cs-paycheck-note' },
  // The re-entry gate's notes and its door under the buttons (W stale: heading, scope, route).
  { name: 'reentry-notes', selector: '.reentry-notes' },
  { name: 'reentry-door', selector: '.reentry-door' },
  // An open drawer (the kit's dialog) and the W drawer's left-over seat (its radios are a read the colour lane owes).
  { name: 'drawer', selector: '[role="dialog"]' },
  { name: 'left-over-seat', selector: '[role="dialog"] [data-left-over-seat]', cvd: true },
  // R13's caveat: the page's own in its frame, else App's trailing mount (exactly one is visible).
  { name: 'caveat', selector: '[data-caveat]:visible' },
] as const

/** The Chrome-native colour-vision arms (CDP emulation — the same transform DevTools applies). */
const CVD_ARMS = [
  ['deuteranopia', 'deuteranopia'],
  ['protanopia', 'protanopia'],
  ['grayscale', 'achromatopsia'],
] as const

/** Every chart on a state (each kit chart carries `data-chart="<id>"`), cropped under each CVD arm. */
const CHART_SELECTOR = '[data-chart]'

/** Regions whose boxes land in fold.json so readers know what sits above/below the fold. */
const FOLD_TARGETS = [
  'header.rc-root',
  'main.result',
  'main.result h1',
  '[data-stale-banner]',
  '[data-ring-half="compared"]',
  '[data-calculating]',
  '[data-winner]',
  '[data-caveat]',
  '[role="dialog"]',
  '.reentry-notes',
  '.reentry-actions',
  '.reentry-door',
  '[data-setup-nav]',
] as const

/**
 * One state's bundle, re-captured whole ONCE when a late re-run replaces a captured element mid-capture (walk 8, b9-1,
 * 2026-11-16: a commit landed after the settled frame and re-mounted a chart). Retrying only the failed crop would mix
 * two frames in one bundle, so the files this call wrote are removed, the page is waited back to its settled final
 * frame, and the whole state is captured again; `recaptured.txt` and a console line say it happened, and a second
 * detach fails the walk (the config's retries-0 law: a flaky capture is seen, never retried into a different frame).
 */
async function captureState(page: Page, dir: string): Promise<void> {
  const before = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : [])
  // ONE colour-vision session for the whole state, owned here, so a throw mid-arm never leaves the page under an arm.
  const cdp = await page.context().newCDPSession(page)
  try {
    await captureStateOnce(page, dir, cdp)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (!/not attached to the DOM|detached from the DOM/i.test(message)) throw e
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
    for (const f of fs.readdirSync(dir)) if (!before.has(f)) fs.rmSync(path.join(dir, f), { recursive: true, force: true })
    if ((await page.locator('main.result').count()) > 0) {
      await expect(page.locator(SETTLED_RESULT), 'after a late re-run, the page never settled again').toBeAttached({ timeout: FINAL_TIER_MS })
    }
    console.log(`[caddie] re-captured ${dir} whole: a late re-run replaced an element mid-capture (${message.split('\n')[0]})`)
    await captureStateOnce(page, dir, cdp)
    fs.writeFileSync(
      path.join(dir, 'recaptured.txt'),
      [
        'This state was captured twice. The first capture failed because an element was replaced mid-capture (a late',
        're-run after the settled frame), so its files were removed and every file here is from the second capture.',
        '',
        `First failure: ${message.split('\n')[0]}`,
      ].join('\n'),
    )
  } finally {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' }).catch(() => {})
    await cdp.detach().catch(() => {})
  }
}

async function captureStateOnce(page: Page, dir: string, cdp: CDPSession): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  await settleLayout(page)

  // 1) The non-visual channels first (no scroll side effects).
  const fold = await page.evaluate((targets) => {
    const region = (sel: string) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const b = el.getBoundingClientRect()
      if (b.width === 0 && b.height === 0) return null
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }
    }
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      scrollHeight: document.documentElement.scrollHeight,
      regions: Object.fromEntries(targets.map((t) => [t, region(t)])),
    }
  }, FOLD_TARGETS as unknown as string[])
  fs.writeFileSync(path.join(dir, 'fold.json'), JSON.stringify(fold, null, 2))

  fs.writeFileSync(path.join(dir, 'aria.yaml'), await page.locator('body').ariaSnapshot())
  fs.writeFileSync(path.join(dir, 'copy.txt'), await page.evaluate(() => document.body.innerText))
  // The SR-ONLY channel annotation: innerText does NOT exclude clipped nodes, so copy.txt contains every .sr-only string
  // mixed into the visible flow (the "doubled wordmark" false-flag was exactly this). Readers diff an apparent
  // duplication against this list before flagging it as rendered.
  const srOnly = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.sr-only'))
      .map((el) => (el as HTMLElement).innerText.trim())
      .filter((t) => t.length > 0),
  )
  fs.writeFileSync(
    path.join(dir, 'sr-only.txt'),
    [
      '# Screen-reader-only text on this state (these strings ALSO appear inside copy.txt —',
      '# innerText includes clipped .sr-only nodes). Text that looks doubled in copy.txt but',
      '# appears here is a CHANNEL artifact, not a rendered duplication.',
      '',
      ...srOnly,
    ].join('\n'),
  )
  const dialog = page.locator('[role="dialog"]')
  if (await dialog.count()) fs.writeFileSync(path.join(dir, 'dialog.txt'), await dialog.first().innerText())

  // 2) The above-fold frame + its colour-vision arms, all at the SAME pinned scroll origin.
  await page.screenshot({ path: path.join(dir, 'viewport.png'), scale: 'css' })
  for (const [name, type] of CVD_ARMS) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
    await page.screenshot({ path: path.join(dir, `cvd-${name}.png`), scale: 'css' })
  }
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })

  // 3) Full page (and the full scroll under each arm, a page only: on a drawer state the full scroll is the page behind
  //    the fixed drawer), then element crops LAST — locator screenshots may scroll to their target.
  await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true, scale: 'css' })
  if ((await dialog.count()) === 0) {
    for (const [name, type] of CVD_ARMS) {
      await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
      await page.screenshot({ path: path.join(dir, `cvd-${name}-fullpage.png`), fullPage: true, scale: 'css' })
    }
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
  }
  for (const crop of CROP_TARGETS) {
    const target = page.locator(crop.selector).first()
    // A crop needs a real BOX, not just presence (a display:contents group passes isVisible but cannot be shot).
    if ((await target.count()) === 0 || !(await target.isVisible()) || (await target.boundingBox()) === null) continue
    await target.screenshot({ path: path.join(dir, `crop-${crop.name}.png`), scale: 'device' })
    if ('cvd' in crop && crop.cvd) {
      for (const [armName, type] of CVD_ARMS) {
        await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
        await target.screenshot({ path: path.join(dir, `cvd-${armName}-${crop.name}.png`), scale: 'device' })
      }
      await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
    }
  }

  // 4) Every visible chart on the state under each arm, at device scale, named by its `data-chart` id.
  const charts = page.locator(CHART_SELECTOR)
  const ids: string[] = []
  for (let i = 0; i < (await charts.count()); i++) ids.push((await charts.nth(i).getAttribute('data-chart')) ?? `chart-${i + 1}`)
  for (const [armName, type] of CVD_ARMS) {
    let emulating = false
    for (let i = 0; i < ids.length; i++) {
      const chart = charts.nth(i)
      if (!(await chart.isVisible()) || (await chart.boundingBox()) === null) continue
      if (!emulating) {
        await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
        emulating = true
      }
      const twin = ids.filter((id) => id === ids[i]).length > 1 ? `-${i + 1}` : ''
      await chart.screenshot({ path: path.join(dir, `cvd-${armName}-${slugify(ids[i]!)}${twin}.png`), scale: 'device' })
    }
    if (emulating) await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

/** How long a page's own runs may take to land after its address is set (a working plan's Stress Test and Social
 *  Security runs are the slowest, measured by the look instrument's waits). */
const PAGE_RUNS_MS = 240_000

/**
 * Show a shell page by its address and wait it out: the page's `main.result`, the settled answer, no part of the page
 * still busy (`aria-busy`), and every chart's series drawn. A page that never settles fails the walk red.
 */
async function showPage(page: Page, hash: string, screen: string): Promise<void> {
  await page.evaluate((h) => {
    window.location.hash = h
  }, hash)
  await expect(page.locator(`main.result[data-shell-screen="${screen}"]`), `${screen}: the page never drew`).toBeAttached({ timeout: 30_000 })
  await expect(page.locator(SETTLED_RESULT), `${screen}: the answer never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await expect(page.locator('main.result [aria-busy="true"]'), `${screen}: a part of the page stayed busy`).toHaveCount(0, { timeout: PAGE_RUNS_MS })
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll('main.result [data-chart]')]
            .filter((c) => c.getClientRects().length > 0)
            .every((c) => c.querySelector('.highcharts-series-group') !== null),
        ),
      { message: `${screen}: a chart never drew its series`, timeout: PAGE_RUNS_MS },
    )
    .toBe(true)
  await page.waitForTimeout(600) // the charts' ~250 ms morph and the drawers' settle
}

/** The standing line's door, where the home's StaleBanner carries one: opens its drawer, captures it, closes it. */
async function walkStandingDoor(page: Page, outDir: string): Promise<void> {
  const door = page.locator('[data-stale-banner] .cs-paycheck-note button').first()
  if ((await door.count()) === 0 || !(await door.isVisible())) return
  const label = (await door.innerText()).trim()
  await door.click()
  const drawer = page.getByRole('dialog')
  await expect(drawer, `the standing line's door ("${label}") opened no drawer`).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(600)
  await captureState(page, path.join(outDir, `door-${slugify(label)}`))
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 })
}

/** `seed:<key>`: the home, every shell page in the route table's order, then the standing line's drawer. */
async function walkSeed(page: Page, key: string, outDir: string): Promise<void> {
  await gotoSeedFinal(page, key)
  await expect(page.locator('main.result[data-shell-screen="snapshot"]'), `?seed=${key}: the answer never landed on the home`).toBeAttached()
  await showPage(page, '#/dashboard/snapshot', 'snapshot')
  await captureState(page, path.join(outDir, 'landing'))
  for (const row of ROUTE_ROWS) {
    if (row.screen === 'snapshot') continue
    await showPage(page, routeHash(routeOf(row)), row.screen)
    await captureState(page, path.join(outDir, `page-${row.screen}`))
  }
  await showPage(page, '#/dashboard/snapshot', 'snapshot')
  await walkStandingDoor(page, outDir)
}

/** `vault:<key>`: the unlock card, the re-entry gate where the return raises one, the affirmed home and its door. */
async function walkVaultReturn(page: Page, key: string, outDir: string): Promise<void> {
  await pinPlantDay(page, key)
  await page.goto(`/?vault=${key}`)
  const unlock = page.getByRole('button', { name: 'Open my plan' })
  await expect(unlock, `?vault=${key}: the plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
  await captureState(page, path.join(outDir, 'unlock'))
  await unlock.click()
  const affirm = page.getByRole('button', { name: /still about right/i })
  const settled = page.locator(SETTLED_RESULT)
  await expect(affirm.or(settled), `?vault=${key}: the return reached neither the gate nor the home`).toBeAttached({ timeout: FINAL_TIER_MS })
  if (await affirm.isVisible()) {
    await captureState(page, path.join(outDir, 'gate'))
    await affirm.click()
  }
  await expect(settled, `?vault=${key}: the home never settled`).toBeAttached({ timeout: FINAL_TIER_MS })
  await showPage(page, '#/dashboard/snapshot', 'snapshot')
  await captureState(page, path.join(outDir, 'landing'))
  await walkStandingDoor(page, outDir)
}

const SOLVE_LOCKUP_MS = 300_000
const SOLVE_TEST_MS = 480_000

/** The goal each solve household's world is read under, by its rendered label (never an index); default: Pay less tax. */
const SOLVE_GOAL: Readonly<Record<string, string>> = {
  surplus: copy.goalLeaveMoreLabel,
  steer: copy.goalLeaveMoreLabel,
}

/** `solve:<key>`: Tax Strategies' first frame, the goal and Find, Calculating, then the Winner card (or the refusal). */
async function walkSolve(page: Page, key: string, outDir: string): Promise<void> {
  await gotoSeedFinal(page, key)
  await showPage(page, '#/tax/strategies', 'tax-strategies')
  await captureState(page, path.join(outDir, 'landing'))
  const goal = page.getByRole('radio', { name: new RegExp(SOLVE_GOAL[key] ?? copy.goalPayLessTaxLabel) })
  await expect(goal, `solve:${key}: Tax Strategies offers no goal to pick (a working plan shows its one line)`).toBeVisible({ timeout: 30_000 })
  await goal.check()
  await page.getByRole('button', { name: copy.taxStratFind, exact: true }).click()
  const calculating = page.locator('[data-calculating]')
  const winner = page.locator('[data-winner]')
  // A refused Find (a household the solve cannot rank) shows its own words and no Calculating frame: give the frame a
  // moment to appear, then read whichever face stands.
  await calculating.or(winner).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  if (await calculating.isVisible()) {
    await captureState(page, path.join(outDir, 'pending'))
    await expect(winner, `solve:${key}: the Winner card never committed`).toBeVisible({ timeout: SOLVE_LOCKUP_MS })
  }
  await page.waitForTimeout(600)
  await captureState(page, path.join(outDir, (await winner.isVisible()) ? 'committed' : 'after-find'))
}

/** The first-run stepper's steps, in order. */
const SETUP_STEPS = ['family', 'income', 'savings', 'net-worth', 'expenses', 'goals'] as const

/** `intake:new`: the cold start, "Start a new plan", then each of the stepper's six steps, empty. */
async function walkIntakeNew(page: Page, outDir: string): Promise<void> {
  await page.goto('/')
  await expect(page.locator('main.rc-root[data-vault-page]'), 'the cold start never drew').toBeVisible({ timeout: 30_000 })
  await captureState(page, path.join(outDir, 'cold-start'))
  await page.getByRole('button', { name: copy.coldStartBegin }).click()
  const names = page.getByRole('dialog', { name: copy.setupNewPlanTitle })
  await expect(names, '"Start a new plan" opened no names dialog').toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(450)
  await captureState(page, path.join(outDir, 'new-plan'))
  await names.getByLabel(copy.setupNameYou).fill('Alex')
  await names.getByLabel(copy.setupNameSpouse).fill('Sam')
  await names.getByRole('button', { name: copy.setupNewPlanStart }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const step of SETUP_STEPS) {
    await expect(page.locator(`main[data-setup-step="${step}"]`), `the stepper never reached ${step}`).toBeAttached({ timeout: 30_000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await captureState(page, path.join(outDir, `setup-${step}`))
    // The stepper's Next (or Complete), its nav's last button.
    if (step !== 'goals') await page.locator('[data-setup-nav] button').last().click()
  }
}

function hookConsole(page: Page): Array<{ type: string; text: string }> {
  const log: Array<{ type: string; text: string }> = []
  page.on('console', (m) => log.push({ type: m.type(), text: m.text() }))
  page.on('pageerror', (e) => log.push({ type: 'pageerror', text: e.message }))
  return log
}

// The phone arm carries hasTouch + isMobile so `(pointer: coarse)` matches like a REAL phone: pointer-adaptive chrome
// otherwise captures a desktop DOM into the "phone" bundle and the readers judge a frame no phone user sees.
const VIEWPORTS = [
  { name: 'real', viewport: REAL, dpr: REAL_DPR, touch: false },
  { name: 'phone', viewport: PHONE, dpr: PHONE_DPR, touch: true },
] as const

for (const target of TARGETS) {
  const targetSlug = `${target.kind}-${target.key}`
  for (const v of VIEWPORTS) {
    test.describe(`caddie walk — ${target.kind}:${target.key} at ${v.name.toUpperCase()} (${v.viewport.width}×${v.viewport.height} @ ${v.dpr}dpr)`, () => {
      test.use({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch })
      test('walk', async ({ page }) => {
        // A seed walk visits every page (each waits out its own runs); a solve adds the full-precision pooled solve.
        test.setTimeout(target.kind === 'solve' ? SOLVE_TEST_MS : target.kind === 'seed' ? FINAL_TIER_MS + 20 * 60_000 : FINAL_TIER_MS + 180_000)
        const consoleLog = hookConsole(page)
        const outDir = path.join(OUT_ROOT, targetSlug, v.name)
        if (target.kind === 'vault') await walkVaultReturn(page, target.key, outDir)
        else if (target.kind === 'intake') await walkIntakeNew(page, outDir)
        else if (target.kind === 'solve') await walkSolve(page, target.key, outDir)
        else await walkSeed(page, target.key, outDir)
        fs.writeFileSync(path.join(outDir, 'console.json'), JSON.stringify(consoleLog, null, 2))
        console.log(`caddie bundle → ${outDir}`)
      })
    })
  }
}
