import { test, expect } from '@playwright/test'
import { gotoSeedFinal, REAL, REAL_DPR, PHONE, PHONE_DPR } from '../reviewSurface'
import { copy } from '../../src/ui/copy'

// Run (the ONE held harness, port 4190, filtered to this file):
//   LOOK_OUT=temp/look/<name> pnpm exec playwright test --config e2e/held/shots.config.ts assumptions-row-look
// (LOOK_SEEDS=retired,healthnc by default). Held, not gated: vitest excludes e2e/held, the CSP harness
// denylists it, and the partition test records this spec as owned by shots.config.ts alone.
//
// What it frames (the "never oversold" build, 2026-09-23): the assumptions panel's conversion-tax
// disclosure row scrolled into the sheet's own frame, on TWO households — `retired` (the run priced
// Medicare and there is no Healthcare door, so the Roth sheet's residual note ALSO renders and the
// pair that reads ONE constant is captured together) and `healthnc` (pre-65: the sheet's note is
// absent by its gate, and the frame set RECORDS that absence — never a silent skip). A door crop cuts
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
      await page.getByRole('button', { name: copy.assumptionDoorCta }).click()
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
      await lift.evaluate((el) => el.remove())
      await twoFrames(page)

      // 4. The Roth sheet — the pair's other half. Every seeded household files jointly, so the door
      //    ALWAYS exists (Result.tsx renders leverRothDoorCta / leverRothDoorEditCta by whether a
      //    conversion is committed); a missing door fails the instrument instead of dropping the frame.
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      const rothDoor = page.getByRole('button', { name: new RegExp(`^(${copy.leverRothDoorCta}|${copy.leverRothDoorEditCta})$`) })
      await expect(rothDoor, 'the Roth door exists on every seeded (MFJ) household').toHaveCount(1)
      await rothDoor.click()
      const sheet = page.getByRole('dialog')
      await expect(sheet).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await twoFrames(page)
      // The note is located by its exact catalog string — never a substring that could drift.
      const note = sheet.getByText(copy.rothMedicareResidualNote, { exact: true })
      const present = (await note.count()) === 1
      if (present) {
        await note.evaluate((el) => el.scrollIntoView({ block: 'center' }))
        await twoFrames(page)
        await sheet.screenshot({ path: `${dir}/4-roth-sheet-note.png` })
      } else {
        // Record the observation only (the CAUSE — showMedicarePricedNote's gate — is the unit test's
        // to assert, not this instrument's). The frame is still taken so the absence is on film.
        await sheet.screenshot({ path: `${dir}/4-roth-sheet-no-note.png` })
      }
      fs.writeFileSync(
        `${dir}/roth-note.txt`,
        present ? await note.innerText() : '(observed: the Roth sheet renders NO residual note on this household)',
      )
      await ctx.close()
    })
  }
}
