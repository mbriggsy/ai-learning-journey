import { test, expect } from '@playwright/test'
import { gotoSeedFinal, REAL, REAL_DPR, PHONE, PHONE_DPR } from '../reviewSurface'

// Run (the ONE held harness, port 4190, filtered to this file):
//   LOOK_OUT=temp/look/<name> pnpm exec playwright test --config e2e/held/shots.config.ts medicare-cards-look
// (LOOK_SEEDS=healthnc,healthgap by default). Held, not gated: vitest excludes e2e/held, the CSP harness
// denylists it, and the partition test records this spec as owned by shots.config.ts alone.

// LOOK_OUT names the run dir (before / after); LOOK_SEEDS a comma list (default both Medicare seeds).
const OUT = process.env.LOOK_OUT ?? 'temp/look/adhoc'
const SEEDS = (process.env.LOOK_SEEDS ?? 'healthnc,healthgap').split(',')
const SEATS = [
  ['real', REAL, REAL_DPR],
  ['phone', PHONE, PHONE_DPR],
] as const

const twoFrames = (page: import('@playwright/test').Page) =>
  page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))

for (const seed of SEEDS) {
  for (const [seat, vp, dpr] of SEATS) {
    test(`${seed} at ${seat}: the two Medicare cards, scrolled into the sheet's own frame`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, serviceWorkers: 'block' })
      const page = await ctx.newPage()
      await gotoSeedFinal(page, seed)
      await page.getByRole('button', { name: 'See your health-cost picture' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await twoFrames(page)
      const dir = `${OUT}/${seed}-${seat}`

      // 1. The sheet as it opens (the frame the panel saw).
      await dialog.screenshot({ path: `${dir}/1-open.png` })

      // 2. Scrolled so the premium card tops the sheet's scroller.
      // The eyebrow is the region's accessible name; it was re-scoped 2026-09-14 (his ruling), so
      // accept the pre- and post-ruling labels — the capture must work on both trees.
      const premium = dialog.getByRole('region', { name: /^(Part B premiums and any surcharge|Medicare premiums)/ })
      await expect(premium).toBeAttached()
      await premium.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await twoFrames(page)
      await dialog.screenshot({ path: `${dir}/2-premium-card.png` })

      // 3. Scrolled so the step card sits mid-sheet (the pair read together).
      const step = dialog.getByRole('region', { name: 'The next premium step' })
      await expect(step).toBeAttached()
      await step.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await twoFrames(page)
      await dialog.screenshot({ path: `${dir}/3-step-card.png` })

      // 4. The whole sheet, unclipped: lift the scroller's max-height for the capture only.
      await page.addStyleTag({ content: '.control-sheet{max-height:none!important;overflow:visible!important}' })
      await twoFrames(page)
      await dialog.screenshot({ path: `${dir}/4-sheet-full.png` })

      // The words the frames show, for the record beside them.
      const text = await dialog.innerText()
      const fs = await import('node:fs')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(`${dir}/dialog.txt`, text)
      await ctx.close()
    })
  }
}
