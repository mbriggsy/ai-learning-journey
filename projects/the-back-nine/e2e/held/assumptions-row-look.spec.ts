import { test, expect } from '@playwright/test'
import { gotoSeedFinal, REAL, REAL_DPR, PHONE, PHONE_DPR } from '../reviewSurface'
import { copy } from '../../src/ui/copy'

// Run (the dev-server held harness, shots.config.ts, port 4190, filtered to this file):
//   LOOK_OUT=temp/look/<name> pnpm exec playwright test --config e2e/held/shots.config.ts assumptions-row-look
// (LOOK_SEEDS=retired,healthnc by default). Held, not gated: vitest excludes e2e/held, the CSP harness
// denylists it, and the partition test records this spec as owned by shots.config.ts alone.
//
// What it frames (the "never oversold" build, 2026-09-23): the assumptions panel's conversion-tax
// disclosure row scrolled into the sheet's own frame, on TWO households — `retired` and `healthnc` (the Roth sheet's
// residual-note frame retired with `RothLever.tsx` at Act 6 · RC4b). A door crop cuts
// at a scrolling sheet's fold (the 2026-09-14 landmine), so the row is scrolled to explicitly — make
// these frames BEFORE any reader panel over the panel.
const OUT = process.env.LOOK_OUT ?? 'temp/look/adhoc'
const SEEDS = (process.env.LOOK_SEEDS ?? 'retired,healthnc').split(',')
const SEATS = [
  ['real', REAL, REAL_DPR],
  ['phone', PHONE, PHONE_DPR],
] as const

const twoFrames = (page: import('@playwright/test').Page) =>
  page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

for (const seed of SEEDS) {
  for (const [seat, vp, dpr] of SEATS) {
    test(`${seed} at ${seat}: the conversion-tax disclosure row, scrolled into the panel's own frame`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, serviceWorkers: 'block' })
      const page = await ctx.newPage()
      await gotoSeedFinal(page, seed)
      // Act 6 · RC4: the panel opens from the shell's gear (the answer page's door is gone).
      await page.getByRole('button', { name: copy.shellGearLabel, exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await twoFrames(page)
      const dir = `${OUT}/${seed}-${seat}`
      const fs = await import('node:fs')
      fs.mkdirSync(dir, { recursive: true })

      // 1. The panel as it opens.
      await dialog.screenshot({ path: `${dir}/1-open.png` })

      // 2. Scrolled so the conversion-tax row sits mid-sheet (the row read in its neighbourhood).
      const row = dialog.locator('[data-assumption-seat="conversion-tax"]')
      await expect(row).toBeAttached()
      await row.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await twoFrames(page)
      await dialog.screenshot({ path: `${dir}/2-conversion-row.png` })
      fs.writeFileSync(`${dir}/row.txt`, await row.innerText())

      // 3. The whole panel, unclipped: lift the scroller's max-height for THIS capture only — the
      //    style tag is removed again before the Roth sheet opens, so frame 4 is a real reader frame
      //    (the review's catch: a leaked lift made frame 4 an uncapped sheet no reader ever sees).
      const lift = await page.addStyleTag({ content: '.control-sheet{max-height:none!important;overflow:visible!important}' })
      await twoFrames(page)
      await dialog.screenshot({ path: `${dir}/3-panel-full.png` })
      fs.writeFileSync(`${dir}/dialog.txt`, await dialog.innerText())
      await lift.evaluate((el) => (el as unknown as Element).remove())
      await twoFrames(page)

      // 4. (retired at Act 6 · RC4b) The Roth sheet was the pair's other half; it left with `RothLever.tsx`, its lever now
      //    a row of Probability's Action Items tray.
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await ctx.close()
    })
  }
}
