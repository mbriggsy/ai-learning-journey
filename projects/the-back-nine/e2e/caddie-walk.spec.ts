import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { REAL, REAL_DPR, PHONE, PHONE_DPR, gotoSeedFinal, settleLayout } from './reviewSurface'

/**
 * The Caddie's WALK (own harness: playwright.caddie.config.ts, `pnpm caddie:walk`) — captures
 * the cold-read bundle the reader panel consumes (.claude/skills/caddie/SKILL.md). NOT a gate:
 * the few assertions here are presence companions so a broken surface fails the walk RED
 * instead of bundling a blank page (the insight-029 vacuity discipline).
 *
 * Bundle law (from the verified research, 2026-07-09):
 *  - Words are captured VERBATIM from the DOM (`copy.txt`/`dialog.txt`) — a reader never OCRs
 *    the product's sentences off pixels.
 *  - The above-fold frame ships at CSS scale (1536px long edge — under the ~2576px model
 *    ingestion cap, so it is never silently downscaled); text-critical regions additionally
 *    ship as DEVICE-scale crops (small text survives).
 *  - Color-vision arms use Chrome's own emulation (CDP setEmulatedVisionDeficiency), the same
 *    transform DevTools applies — a screening flag for the readers, never a color verdict.
 *  - Capture order matters: fold/aria/copy first (no visual side effects), then the above-fold
 *    + CVD shots (same pinned scroll), then fullpage + element crops LAST (they may scroll).
 *
 * Increment 2 (2026-07-10, the tape's first two lessons):
 *  - RUN-STAMPED bundle dirs — temp/caddie/<run>/<target>/<viewport>/<state>/; a re-walk
 *    lands in a fresh dir instead of overwriting files under a mid-read reader panel.
 *  - The DOOR WALK — every `.result-quiet-row` door is opened and captured (Briggsy's real
 *    U12 read free-walked the doors and found a real finding on a sheet the walk never
 *    captured — the withdrawal-order chart speaking years against the fan's ages).
 *  - VAULT targets — `vault:<key>` drives the U13 decrypt-on-return arc (unlock → the
 *    re-entry gate → affirm → the echoed verdict), the only live route to the staleness
 *    surfaces; `vault:stale` additionally walks the update route's first frame.
 *
 * Increment 3 (2026-07-10, the seed:date card's honest coverage refusal):
 *  - The LEVER-PREVIEW DRIVE — a door whose sheet carries a what-if lever (the policy/regime
 *    radios, the Roth plan fields) gets ONE preview driven and the TwoFutures chart captured
 *    as `door-N-<slug>-preview` (the rule-36 one-dialect check was un-verifiable while the
 *    sheets bundled only their pre-commit input state). PREVIEW-ONLY: nothing is Applied —
 *    the walk never mutates the scenario later states capture. A driven preview whose chart
 *    never arrives FAILS the walk red (insight-029 vacuity discipline).
 *  - The SR-ONLY channel annotation — `sr-only.txt` lists every visually-hidden text node,
 *    because `copy.txt` (innerText) INCLUDES clipped sr-only nodes: the "doubled wordmark"
 *    finding was the persistent sr-only h1 beside the visible wordmark, a channel artifact
 *    a reader should check against before flagging a rendered duplication.
 *  - `vault:datestale` (the aged SPLIT-date plant) rides the existing vault grammar — the
 *    floor's ARRIVED arm + the re-derived anchored hero; `seed:datesplit` covers the floor's
 *    fresh ANCHORED arm (card #4's blocked-unreachable ruling was half-wrong: the anchor is
 *    computed for every live household, so the fresh split renders the anchored floor line).
 *
 * Targets: `CADDIE_TARGETS="vault:retired,vault:stale,seed:date"` (comma list). Back-compat:
 * `CADDIE_SEED=budget` still works (one seed target). Default: `seed:retired`.
 */

interface Target {
  readonly kind: 'seed' | 'vault'
  readonly key: string
}

function parseTargets(): Target[] {
  const raw =
    process.env.CADDIE_TARGETS ??
    (process.env.CADDIE_SEED !== undefined ? `seed:${process.env.CADDIE_SEED}` : 'seed:retired')
  return raw.split(',').map((entry) => {
    const [kind, key] = entry.trim().split(':')
    if ((kind !== 'seed' && kind !== 'vault') || key === undefined || key === '') {
      throw new Error(`bad CADDIE_TARGETS entry "${entry}" — expected seed:<key> or vault:<key>`)
    }
    return { kind, key }
  })
}

const TARGETS = parseTargets()
// The run stamp is minted once in playwright.caddie.config.ts (the runner process; workers
// inherit it) — 'adhoc' only if the spec somehow runs outside its own harness.
const OUT_ROOT =
  process.env.CADDIE_OUT ?? path.join('temp', 'caddie', process.env.CADDIE_RUN ?? 'adhoc')

/** Text-critical / meaning-critical regions cropped at device scale when present. */
const CROP_TARGETS = [
  { name: 'band', selector: '.cs-band' },
  { name: 'disclaimer', selector: 'footer.disclaimer.disclaimer--in-frame' },
  { name: 'echo', selector: '.ap-echo' },
  { name: 'panel', selector: '[role="dialog"]' },
  // U13 (increment 2): the staleness surfaces + the frames the batch asks his eye on.
  { name: 'staleness-note', selector: '.cs-staleness-note' },
  { name: 'reentry-notes', selector: '.reentry-notes' },
  { name: 'backup-door', selector: '.result-backup-door' },
  { name: 'hero-lead', selector: '.reveal__lead' },
] as const

/** Regions whose boxes land in fold.json so readers know what sits above/below the fold. */
const FOLD_TARGETS = [
  'main.result',
  '.confidence-reveal',
  '.cs-band',
  'footer.disclaimer.disclaimer--in-frame',
  '.result-quiet-row',
  '.ap-echo',
  '[role="dialog"]',
  // U13 (increment 2): the gate's decision pair + the vault-return frame's stacking question
  // (the filed a37b5f06 backup-door-above-disclaimer ruling needs these boxes on the record).
  '.cs-staleness-note',
  '.reentry-notes',
  '.save-actions',
  '.result-backup-door',
  '.result-save-slot',
] as const

async function captureState(page: Page, dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  await settleLayout(page)

  // 1) The non-visual channels first (no scroll side effects).
  const fold = await page.evaluate((targets) => {
    const region = (sel: string) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
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
  // The SR-ONLY channel annotation (increment 3): innerText does NOT exclude clipped nodes,
  // so copy.txt contains every .sr-only string mixed into the visible flow — the "doubled
  // wordmark" false-flag was exactly this. Readers diff apparent duplications against this
  // list before flagging them as rendered.
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
  if (await dialog.count()) {
    fs.writeFileSync(path.join(dir, 'dialog.txt'), await dialog.first().innerText())
  }

  // 2) The above-fold frame + its color-vision arms, all at the SAME pinned scroll origin.
  await page.screenshot({ path: path.join(dir, 'viewport.png'), scale: 'css' })
  const cdp = await page.context().newCDPSession(page)
  const arms = [
    ['deuteranopia', 'deuteranopia'],
    ['protanopia', 'protanopia'],
    ['grayscale', 'achromatopsia'],
  ] as const
  for (const [name, type] of arms) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
    await page.screenshot({ path: path.join(dir, `cvd-${name}.png`), scale: 'css' })
  }
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
  await cdp.detach()

  // 3) Full page, then element crops LAST — locator screenshots may scroll to their target.
  await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true, scale: 'css' })
  for (const { name, selector } of CROP_TARGETS) {
    const target = page.locator(selector).first()
    // A crop needs a real BOX, not just visibility: display:contents groups (e.g.
    // `.reveal__lead` in single column / phone) have visible children but generate no box —
    // isVisible() passes while locator.screenshot rejects ("not visible or not an
    // HTMLElement"). The box check subsumes "present when it matters": the same element
    // crops fine at two-pane, where it becomes a real grid item.
    if (
      (await target.count()) > 0 &&
      (await target.isVisible()) &&
      (await target.boundingBox()) !== null
    ) {
      await target.screenshot({ path: path.join(dir, `crop-${name}.png`), scale: 'device' })
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

/**
 * Type a value into one of the family's masked/integer fields the way a REAL user does:
 * select-all + typed digits + blur, value asserted back (the fill() concatenation trap the
 * first live read's False-PASS Hunter caught — a mis-commit fails RED here instead of
 * bundling the wrong scenario).
 */
async function typeFieldValue(
  field: ReturnType<Page['locator']>,
  digits: string,
  expected: string,
): Promise<void> {
  await field.click()
  await field.press('ControlOrMeta+a')
  await field.pressSequentially(digits)
  await field.blur()
  await expect(field, 'the preview drive committed a different value than intended').toHaveValue(expected)
}

/**
 * The LEVER-PREVIEW DRIVE (increment 3): a sheet that carries a what-if lever gets ONE
 * preview driven so the TwoFutures chart states bundle — the rule-36 one-dialect check was
 * honestly un-verifiable while the doors captured only their pre-commit input state.
 * PREVIEW-ONLY by construction: radios/fields change local sheet state and the preview seam;
 * nothing is Applied, so the scenario every later state captures is untouched. Returns true
 * if a preview was driven (the caller then captures the `-preview` state). A driven lever
 * whose chart never arrives FAILS red — never a silent no-chart bundle (insight 029).
 */
async function driveLeverPreview(
  page: Page,
  dialog: ReturnType<Page['getByRole']>,
  name: string,
): Promise<boolean> {
  // The policy/regime radio grammar (SequencingControl + HealthcareSheet): pick the first
  // NON-current option — picking the applied one deliberately withdraws the comparison.
  const uncheckedRadio = dialog.locator('.control-policies input[type="radio"]:not(:checked)')
  if ((await uncheckedRadio.count()) > 0) {
    await uncheckedRadio.first().check()
    await expect(
      dialog.locator('svg.tf'),
      `door "${name}": the driven preview never rendered its TwoFutures chart`,
    ).toBeVisible({ timeout: 120_000 })
    return true
  }
  // The Roth plan grammar (RothLever): amount / start / years — a COMPLETE plan fires the
  // preview. Values are small-but-real (a $20k, 4-year plan starting next year).
  const plan = dialog.locator('.control-plan input')
  if ((await plan.count()) >= 3) {
    await typeFieldValue(plan.nth(0), '20000', '20,000')
    await typeFieldValue(plan.nth(1), '1', '1')
    await typeFieldValue(plan.nth(2), '4', '4')
    await expect(
      dialog.locator('svg.tf'),
      `door "${name}": the driven Roth preview never rendered its TwoFutures chart`,
    ).toBeVisible({ timeout: 120_000 })
    return true
  }
  return false // no lever on this sheet (the budget builder, the assumptions panel)
}

/**
 * The DOOR WALK (increment 2 — the tape's coverage lesson): open EVERY quiet-row door on the
 * settled verdict, capture the sheet, close, next. Briggsy's real read free-walks the doors;
 * a bundle that stops at the landing pre-digests only half his walk. Close buttons are the
 * family's own: 'Close' (lever sheets + the assumptions panel) or 'Cancel' (the budget sheet).
 * Increment 3: a lever sheet additionally bundles ONE driven preview (`-preview` state).
 */
async function walkDoors(page: Page, outDir: string): Promise<void> {
  const doors = page.locator('.result-quiet-row button')
  const count = await doors.count()
  expect(count, 'no quiet-row doors on a resolved verdict — a vacuous door walk').toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const door = doors.nth(i)
    const name = (await door.innerText()).trim()
    await door.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog, `door "${name}" opened no dialog`).toBeVisible()
    await captureState(page, path.join(outDir, `door-${i + 1}-${slugify(name)}`))
    if (await driveLeverPreview(page, dialog, name)) {
      await captureState(page, path.join(outDir, `door-${i + 1}-${slugify(name)}-preview`))
    }
    await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
    await expect(dialog).toBeHidden()
  }
}

/**
 * The U13 decrypt-on-return arc: `?vault=<key>` plants the vault + lands on the unlock screen
 * with the dev passphrase PRE-FILLED (App) → the re-entry gate (the read-back + every fired
 * staleness clock, BEFORE any verdict — the reveal is gated) → affirm → the echoed verdict.
 * `?vault=stale` is the aged plant: the elapsed line + the tax/healthcare/blend notes at the
 * gate, the one-line standing echo + the un-noted backup door on the verdict frame.
 */
async function walkVaultReturn(
  page: Page,
  key: string,
  outDir: string,
  opts: { readonly doors: boolean },
): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const open = page.getByRole('button', { name: 'Open my plan' })
  await expect(open, 'the vault plant did not land on the unlock screen').toBeVisible({
    timeout: 30_000,
  })
  await captureState(page, path.join(outDir, 'unlock'))
  await open.click()

  await expect(
    page.getByRole('heading', { name: 'Are these still your numbers?' }),
    'the re-entry gate did not mount after unlock',
  ).toBeVisible({ timeout: 30_000 })
  await captureState(page, path.join(outDir, 'gate'))

  await page.getByRole('button', { name: /Still about right/ }).click()
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({
    timeout: 120_000,
  })
  await captureState(page, path.join(outDir, 'verdict'))
  if (opts.doors) await walkDoors(page, outDir)
}

/** The stale gate's OTHER exit: "Something's changed — update them" → the walk-through's
 *  first frame (accounts are edited where they were entered). One capture — the batch judges
 *  the button pair's wording and where the update door drops you. */
async function walkUpdateRoute(page: Page, key: string, outDir: string): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const open = page.getByRole('button', { name: 'Open my plan' })
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  const gateHeading = page.getByRole('heading', { name: 'Are these still your numbers?' })
  await expect(gateHeading).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: /changed — update them/ }).click()
  await expect(gateHeading, 'the update route did not leave the gate').toBeHidden({
    timeout: 30_000,
  })
  await captureState(page, path.join(outDir, 'update-entry'))
}

/** A seed target: the settled final landing + the door walk. `seed:retired` additionally
 *  rides the proven U12 worsening arc (it is that seed's own cold-read subject). */
async function walkSeed(page: Page, key: string, outDir: string): Promise<void> {
  await gotoSeedFinal(page, key)
  await captureState(page, path.join(outDir, 'landing'))
  await walkDoors(page, outDir)
  if (key === 'retired') await walkWorsening(page, outDir)
}

/**
 * The retired-spine worsening arc (the U12 cold-read batch's core): the assumptions panel →
 * a worsening spending edit (R8's honest-worsening arm — the truer-picture line renders ONLY
 * when the displayed verdict lands BELOW the panel-open baseline) → the worsened landing.
 */
async function walkWorsening(page: Page, outDir: string): Promise<void> {
  await page.getByRole('button', { name: 'The assumptions behind this', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.ap-echo__lead')).toBeVisible() // the echo's baseline reading

  // The worsening edit: the retired seed enters spending MONTHLY (spendEntryPeriod:'month'),
  // so 10,000/mo = $120k/yr against the seed's $78k baseline — the verdict must step down.
  // Edits land as you leave each field (the panel's own contract), hence the explicit blur.
  // NOT fill(): the masked currency input swallowed fill's select-all and CONCATENATED
  // ("6,500" + "10000" → 650,010,000 — caught by the first live read's False-PASS Hunter,
  // 2026-07-10), silently walking an absurd scenario. Select-all + typed digits matches a
  // real user's keystrokes, and the value is asserted back so a mis-commit fails RED here
  // instead of bundling the wrong scenario (the walk's own insight-033 discipline).
  const spend = page.getByLabel('Household spending, all in')
  await expect(spend).toBeVisible()
  await spend.click()
  await spend.press('ControlOrMeta+a')
  await spend.pressSequentially('10000')
  await spend.blur()
  await expect(spend, 'the walk committed a different spending value than intended').toHaveValue(
    '10,000',
  )
  // The truer-picture line (`.ap-echo__shift`) is the synchronization anchor: it renders only
  // after the recompute commits a verdict below baseline — a real wait, never a sleep.
  await expect(page.locator('.ap-echo__shift')).toBeVisible({ timeout: 120_000 })
  await captureState(page, path.join(outDir, 'panel-worsened'))

  // The worsened LANDING (panel closed): the negative-verdict frame the panel occludes — the
  // first read's honesty lens could not verify the worsened chart isn't a red gash (rule 11),
  // and the CVD screener's landing arm was all-positive.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await captureState(page, path.join(outDir, 'landing-worsened'))
}

function hookConsole(page: Page): Array<{ type: string; text: string }> {
  const log: Array<{ type: string; text: string }> = []
  page.on('console', (m) => log.push({ type: m.type(), text: m.text() }))
  page.on('pageerror', (e) => log.push({ type: 'pageerror', text: e.message }))
  return log
}

// The phone arm carries hasTouch + isMobile so `(pointer: coarse)` matches like a REAL phone —
// pointer-adaptive chrome (the band's enlarge affordance is fine-pointer-only, 2026-07-10)
// otherwise captures a desktop DOM into the "phone" bundle and the readers judge a frame no
// phone user sees.
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
        const consoleLog = hookConsole(page)
        const outDir = path.join(OUT_ROOT, targetSlug, v.name)
        if (target.kind === 'vault') {
          // Doors ride the STALE verdict only — `vault:retired`'s verdict is the same
          // household minus the staleness surfaces; double-walking its sheets is pure bloat.
          await walkVaultReturn(page, target.key, outDir, { doors: target.key === 'stale' })
        } else {
          await walkSeed(page, target.key, outDir)
        }
        fs.writeFileSync(path.join(outDir, 'console.json'), JSON.stringify(consoleLog, null, 2))
        console.log(`caddie bundle → ${outDir}`)
      })
    })
  }
  if (target.kind === 'vault' && target.key === 'stale') {
    test.describe(`caddie walk — vault:stale UPDATE route at REAL (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
      test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
      test('update-entry', async ({ page }) => {
        const consoleLog = hookConsole(page)
        const outDir = path.join(OUT_ROOT, targetSlug, 'real')
        await walkUpdateRoute(page, target.key, outDir)
        fs.writeFileSync(path.join(outDir, 'console-update.json'), JSON.stringify(consoleLog, null, 2))
        console.log(`caddie bundle → ${outDir}`)
      })
    })
  }
}
