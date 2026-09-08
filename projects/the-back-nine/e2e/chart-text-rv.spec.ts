import { test, expect, type Page } from '@playwright/test'
import { REAL, REAL_DPR, FLOOR, PHONE, PHONE_DPR, gotoSeedFinal, settleLayout } from './reviewSurface'
import { type Audit, floorPx, audit, assertChartText } from './chartTextAudit'

/**
 * The RECOMMENDATIONVIZ chart-text gate (`verify:fit:rv`, playwright.fit-rv.config.ts) — the fourth
 * chart of the §12 contract (docs/architecture.md, "SVG draws, HTML writes"), on its own SERIALIZED
 * harness because it is the one chart that exists only after a full-precision worker solve.
 *
 * WHAT IT DRIVES. `?seed=surplus` — the over-funded household whose committed lockup is a RECOMMENDED
 * card carrying the §S4 two-bar comparison (the winner against the household's own plan) AND a
 * runner-up with its own chart one tap down (`details.rec-runnerup`). The recipe is the Caddie walk's
 * `walkSolve` (e2e/caddie-walk.spec.ts): the invite in the quiet row → the GoalPicker → "Leave more
 * behind" (SOLVE_GOAL there) → "See the strategy" → the pending breathe → the lockup, polled for up
 * to COMMITTED_LOCKUP_MS. A HELD card here is a RED, never a skip: the gate exists to render the
 * chart, and a seed that stops committing must be re-picked, not silently waved through.
 *
 * WHAT IT AUDITS — the same oracles as chart-text.spec.ts (`assertChartText`, chartTextAudit.ts),
 * per chart, against the chart's OWN card: the primary `.rv-host` inside its `.rec-viz-box` (the
 * fixed-ASPECT 560×210 CLS reservation — `inline-size: 100%` + `aspect-ratio: 560 / 210`,
 * recommendation.css, so the box is fluid-width) and the runner-up's `.rv-host` inside its own
 * `.rec-viz-box.rec-runnerup__viz`. `audit()` is `document.querySelector`, so each host is named by
 * a selector only IT matches: the primary is DOM-first (RecommendationSurface.tsx renders it above
 * the runner-up's <details>), the runner-up carries the `.rec-runnerup__viz` ancestor.
 *
 * Plus the shape only this chart has (`assertRvShape`): the five text nodes RecommendationViz.tsx
 * writes (two axis labels, two end-of-bar labels, the delta hero), the two bar labels VISIBLE (a
 * REQUIRED non-color channel — never dropped, they wrap), and the hero on the `valign="top"` anchor
 * — the ONLY vtop node in src/viz, where the 2026-09-05 `--ct-ty: 0` defect lived. The anchor
 * oracle is then proved to BITE on that very node: the unitless zero is planted inline and
 * `assertChartText` must red with its own message (the planted-fail discipline of insights 016/029).
 *
 * ARMS. PHONE / FLOOR / REAL — the three the other charts' witnesses cover. PHONE is the NARROWEST
 * box of the three (a 358 px primary host — the "358px phone box" RecommendationViz.tsx tuned its
 * label column against, where the 24-character bar label wraps to two lines; measured 2026-09-05,
 * temp/chart-text/verify-rv.json, REAL's primary 496). FLOOR is the narrowest DESKTOP box: the
 * primary drops 576 → 408 px across the 1088 two-pane cliff while the runner-up's holds 576
 * (temp/chart-text/raw-1b-sweep-rv.json — a sweep that starts at 632, so it says nothing about the
 * phone). No 320 arm yet: every arm is a ~6–8 min test (a ~4–7 min solve plus the seed's final tier
 * and the audits — measured 2026-09-07: 8.0 / 7.7 / 6.0 min on a 20-thread laptop, 21.8 min for
 * the gate), and the RV has never been rendered at 320 by anyone (register: "The gates that don't
 * bite").
 *
 * Every measurement waits for the FINAL engine tier (gotoSeedFinal), the committed lockup, the real
 * `svg.rv` (never the Suspense placeholder) and a settled layout (settleLayout).
 */

/** The committed lockup's own wait — the full-precision (16k-path) solve of the `surplus` household
 *  is ~4–7 min with the whole machine (playwright.caddie.config.ts, measured); the Caddie walk polls
 *  the same lockup with this budget (e2e/caddie-walk.spec.ts walkSolve). One number, two harnesses. */
const COMMITTED_LOCKUP_MS = 720_000

/** figure → the card it must stay inside. Both charts sit in a `.rec-viz-box` (the CLS reservation,
 *  src/ui/styles/recommendation.css); the runner-up's is the one wearing `.rec-runnerup__viz`. */
const PRIMARY = ['.rv-host', '.rec-viz-box'] as const
const RUNNER_UP = ['.rec-runnerup__viz .rv-host', '.rec-viz-box'] as const

/** The text nodes RecommendationViz.tsx writes into its layer: `.rv__axis--floor`, `.rv__axis--end`,
 *  two `.rv__bar-label`s, `.rv__delta`. A dropped label is a dropped non-color channel. */
const RV_NODE_COUNT = 5

const ARMS = [
  { name: 'PHONE', use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
  { name: 'FLOOR', use: { viewport: FLOOR } },
  { name: 'REAL', use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
] as const

/** Drive `?seed=surplus` to its RECOMMENDED lockup with the real chart on screen. */
async function gotoCommittedLockup(page: Page): Promise<void> {
  await gotoSeedFinal(page, 'surplus')
  const invite = page.locator('.result-recommend-invite')
  await expect(invite, '?seed=surplus: the recommend-second invite never mounted').toBeVisible()
  await invite.click()
  await expect(page.getByRole('heading', { name: 'What should your plan aim for?' }), 'the GoalPicker did not open').toBeVisible()
  // NATIVE click on the sr-only radio (the label intercepts a pointer click; el.click() is
  // layout-independent and still bubbles to React's root), asserted checked so a missed pick fails
  // RED here rather than as "no chart" ten minutes later.
  const dialog = page.getByRole('dialog')
  const radio = dialog.getByRole('radio', { name: /Leave more behind/ })
  await radio.evaluate((el) => (el as HTMLInputElement).click())
  await expect(radio, 'the goal radio did not commit').toBeChecked()
  await dialog.getByRole('button', { name: 'See the strategy', exact: true }).click()
  await expect(dialog, 'the GoalPicker did not close on confirm').toBeHidden()
  await expect(page.locator('.solve-pending'), 'the pending breathe never mounted (a refusal would render instantly here)').toBeVisible()
  await expect(page.locator('.rec-held, .rec-committed'), 'no lockup after the full-precision solve (expected the RECOMMENDED card)').toBeVisible({
    timeout: COMMITTED_LOCKUP_MS,
  })
  // NON-VACUITY, the seed guard: a HELD card renders no chart. Red, never skip — re-pick the seed.
  await expect(page.locator('.rec-committed'), '?seed=surplus produced a HELD card, not a RECOMMENDED lockup — this gate has no chart to measure; re-pick the seed').toHaveCount(1)
  // The real chart, never the Suspense placeholder (the lazy chunk): the primary viz is DOM-first.
  await expect(page.locator('svg.rv').first(), 'the recommended lockup never rendered its RecommendationViz chart').toBeVisible({ timeout: 60_000 })
  await settleLayout(page)
}

/** Open the runner-up's <details> so its chart lays out, and wait for the real svg inside it. */
async function openRunnerUp(page: Page): Promise<void> {
  const details = page.locator('details.rec-runnerup')
  await expect(details, 'seed guard: ?seed=surplus no longer carries a runner-up — re-pick the seed').toHaveCount(1)
  await details.evaluate((d) => {
    ;(d as HTMLDetailsElement).open = true
  })
  const svg = page.locator('.rec-runnerup__viz svg.rv')
  await expect(svg, 'seed guard: the runner-up dropped its chart (an A-decides/B-displays inversion drops the picture) — re-pick the seed').toBeVisible({ timeout: 30_000 })
  // The host went from display:none to a real box: its ResizeObserver re-runs the measured layout
  // (chartText useCollisionLayout). Two frames for that pass to land, then the shared settle.
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
  await settleLayout(page)
}

/** The shape only this chart has — the oracles inside assertChartText see nodes, not roles. */
function assertRvShape(a: Audit, label: string): void {
  const visible = a.nodes.filter((n) => !n.hidden && n.text !== '')
  expect(visible.length, `${label}: expected the ${RV_NODE_COUNT} text nodes RecommendationViz writes (two axis labels, two bar labels, the hero) — got ${visible.length}: ${visible.map((n) => `"${n.text}"`).join(', ')}`).toBe(RV_NODE_COUNT)
  // Both end-of-bar labels VISIBLE — a REQUIRED non-color channel; they wrap, they are never hidden.
  const barLabels = a.nodes.filter((n) => /rv__bar-label/.test(n.cls))
  expect(barLabels.length, `${label}: expected two end-of-bar labels`).toBe(2)
  for (const n of barLabels) expect(n.hidden, `${label}: bar label "${n.text}" is hidden — a non-color channel was dropped`).toBe(false)
  // THE HERO on the vtop anchor: the only valign="top" node in src/viz (RecommendationViz.tsx), the
  // register the 2026-09-05 `--ct-ty: 0` defect lived on. Pin that it is here and typed.
  const vtop = a.nodes.filter((n) => /ct-text--vtop/.test(n.cls))
  expect(vtop.length, `${label}: expected exactly one valign="top" node (the delta hero)`).toBe(1)
  const hero = vtop[0]!
  expect(hero.cls, `${label}: the vtop node is not the delta hero`).toMatch(/rv__delta/)
  // recommendationView.ts formats deltaLabel as `$${figure}` — a dollar figure, never a bare digit.
  expect(hero.text, `${label}: the delta hero reads "${hero.text}" — not a dollar figure`).toMatch(/^\$[\d,]+/)
  expect(hero.transform, `${label}: the hero computes transform:none — the vtop register is untyped (chartText.css .ct-text--vtop)`).not.toBe('none')
}

for (const arm of ARMS) {
  test.describe(`RecommendationViz chart text — ${arm.name} (${arm.use.viewport.width}×${arm.use.viewport.height})`, () => {
    test.use(arm.use)

    test('the committed lockup’s two-bar chart, primary and runner-up: readable, inside its box, never overprinting — and the hero anchor bites', async ({ page }) => {
      await gotoCommittedLockup(page)
      const floor = await floorPx(page)
      expect(floor, 'the --text-xs token did not resolve').toBeGreaterThanOrEqual(12)

      // THE PRIMARY — the winner against the household's own plan.
      const primary = await audit(page, ...PRIMARY)
      assertChartText(primary, floor, `${arm.name} rv/primary`)
      assertRvShape(primary, `${arm.name} rv/primary`)

      // THE RUNNER-UP — one tap down, its own box, the same oracles.
      await openRunnerUp(page)
      const runnerUp = await audit(page, ...RUNNER_UP)
      assertChartText(runnerUp, floor, `${arm.name} rv/runner-up`)
      assertRvShape(runnerUp, `${arm.name} rv/runner-up`)
      // the two audits measured two DIFFERENT charts — a selector that resolved the primary twice would
      // pass every oracle above while proving the runner-up nothing.
      expect(runnerUp.chartBox.top, `${arm.name}: the runner-up audit resolved the PRIMARY chart (same box)`).not.toBe(primary.chartBox.top)

      // THE ANCHOR CONTROL, on the node that had the bug. Plant the TYPE error itself — a unitless zero
      // where chartText.css's calc() needs a length (NOT `0px`; that is the whole bug) — inline on the
      // hero, so it overrides the `.ct-text--vtop` register and reaches the transform declaration. The
      // hero carries no `data-ct-item`, so useCollisionLayout's reset sweep can never erase the plant
      // mid-test; React never authors `--ct-ty` inline, so `removeProperty` is the exact restore.
      const hero = page.locator('.rec-viz-box .rv__delta').first()
      await expect(hero, 'the primary hero is missing — the plant would land on nothing').toHaveCount(1)
      await hero.evaluate((el) => (el as HTMLElement).style.setProperty('--ct-ty', '0'))
      const untyped = await audit(page, ...PRIMARY)
      const bad = untyped.nodes.find((n) => /rv__delta/.test(n.cls))!
      expect(bad.transform, `${arm.name}: the planted unitless zero did not invalidate the hero’s transform — the anchor oracle is vacuous on the vtop node`).toBe('none')
      expect(() => assertChartText(untyped, floor, 'planted unitless --ct-ty on the hero')).toThrow(/computes transform:none/)
      await hero.evaluate((el) => (el as HTMLElement).style.removeProperty('--ct-ty'))
      assertChartText(await audit(page, ...PRIMARY), floor, `${arm.name} rv/primary after the plant`)
    })
  })
}
