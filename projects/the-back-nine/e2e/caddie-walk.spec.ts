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
 */

const SEED = process.env.CADDIE_SEED ?? 'retired'
const OUT_ROOT = process.env.CADDIE_OUT ?? path.join('temp', 'caddie')

/** Text-critical / meaning-critical regions cropped at device scale when present. */
const CROP_TARGETS = [
  { name: 'band', selector: '.cs-band' },
  { name: 'disclaimer', selector: 'footer.disclaimer.disclaimer--in-frame' },
  { name: 'echo', selector: '.ap-echo' },
  { name: 'panel', selector: '[role="dialog"]' },
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
    if ((await target.count()) > 0 && (await target.isVisible())) {
      await target.screenshot({ path: path.join(dir, `crop-${name}.png`), scale: 'device' })
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

/**
 * The retired-spine walk (the U12 cold-read batch's core): landing → the assumptions panel →
 * a worsening spending edit (R8's honest-worsening arm — the truer-picture line renders ONLY
 * when the displayed verdict lands BELOW the panel-open baseline).
 */
async function walkAssumptionsPanel(page: Page, outDir: string): Promise<void> {
  await gotoSeedFinal(page, SEED)
  await captureState(page, path.join(outDir, 'landing'))

  // The door CTA (itself a U12 cold-read subject — copy.assumptionDoorCta).
  await page.getByRole('button', { name: 'The assumptions behind this', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.ap-echo__lead')).toBeVisible() // the echo's baseline reading
  await captureState(page, path.join(outDir, 'panel-open'))

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
  // and the CVD screener's landing arm was all-positive. The sheet's own Close button (Escape
  // did NOT close it with focus on the body post-blur — filed as an a11y check task, since a
  // synthetic focus state isn't proof about a real user's Escape).
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

test.describe(`caddie walk — ?seed=${SEED} at REAL (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('landing → panel → worsened', async ({ page }) => {
    const consoleLog = hookConsole(page)
    const outDir = path.join(OUT_ROOT, SEED, 'real')
    await walkAssumptionsPanel(page, outDir)
    fs.writeFileSync(path.join(outDir, 'console.json'), JSON.stringify(consoleLog, null, 2))
  })
})

test.describe(`caddie walk — ?seed=${SEED} at PHONE (${PHONE.width}×${PHONE.height} @ ${PHONE_DPR}dpr)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR })
  test('landing → panel → worsened', async ({ page }) => {
    const consoleLog = hookConsole(page)
    const outDir = path.join(OUT_ROOT, SEED, 'phone')
    await walkAssumptionsPanel(page, outDir)
    fs.writeFileSync(path.join(outDir, 'console.json'), JSON.stringify(consoleLog, null, 2))
  })
})
