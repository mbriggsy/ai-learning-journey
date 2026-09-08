import { expect, type Page } from '@playwright/test'

/**
 * The ONE canonical home of the review-surface constants + the settle recipe, shared by every
 * harness that reads the real rendered UI (the vertical-fit gate, the Caddie cold-read walk).
 * Extracted from vertical-fit.spec.ts 2026-07-10 (the Caddie increment-1 refactor) so Briggsy's
 * real window and the "page is truly settled" contract are never re-typed — a spec cannot
 * import them from another spec (importing a *.spec.ts registers its tests in the wrong
 * harness), so they live here.
 */

/** Briggsy's REAL laptop window — 1536×791 CSS px @ DPR 2.5, measured in his own Chrome
 *  2026-07-08 (TODO landmine: the old "1871×917" screenshot number is his SCREEN, not his
 *  window — never tune a fit against it; 1871×917 serves only as the tall SHOWCASE arm
 *  where the density tier must NOT fire). */
export const REAL = { width: 1536, height: 791 }
/** The DPR his window runs at — pair with REAL wherever a context is created. */
export const REAL_DPR = 2.5
/** The `--laptop-fit-height` tier floor (tokens.css): the shortest laptop the fit law serves. */
export const TIER = { width: 1280, height: 800 }
/** The tall showcase: two-pane, but ABOVE the 840px density boundary — generous rhythm. */
export const SHOWCASE = { width: 1871, height: 917 }
/** 68rem exactly — the two-pane breakpoint's tightest in-range width (the honesty floor). */
export const FLOOR = { width: 1088, height: 800 }
/** The phone arm — only the disclaimer-tier contract applies (the phone scrolls by design). */
export const PHONE = { width: 390, height: 844 }
/** The phone DPR (typical modern handset) — pair with PHONE wherever a context is created. */
export const PHONE_DPR = 3
/** The LANDSCAPE phone (844×390 @3, isMobile+hasTouch) — the fourth arm the 2026-09-05 ink sweep
 *  measured beside REAL / FLOOR / PHONE (temp/chart-text/ink.md), and the WIDEST phone band figure
 *  of any arm (526 px against portrait's 308): a coarse pointer over a desktop-width chart. */
export const PHONE_LS = { width: 844, height: 390 }

/**
 * Settle a rendered page for measurement/capture: fonts, finite animations, a two-frame
 * reflow, and a pinned scroll origin. Runs AFTER the caller has synchronized on the app's own
 * readiness signal (the `data-answer-tier="final"` stamp for a seed route, or a post-edit echo
 * for an in-page interaction) — this helper settles LAYOUT, it does not know when the ANSWER
 * is final.
 */
export async function settleLayout(page: Page): Promise<void> {
  // Fonts decide wrap counts (wrap count decides height) — never measure on the fallback face.
  await page.evaluate(() => document.fonts.ready)
  // Every FINITE animation/transition must finish before measuring: the reveal enters on a real
  // translateY(10px→0) transition (confidence.css/fuckOffDate.css @starting-style), and
  // getBoundingClientRect reads mid-transform geometry — a measurement inside that window is
  // shifted low. Infinite ambient animation (the thinking-breathe) is exempt: it never ends and
  // animates opacity only.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const timing = a.effect?.getTiming()
      return timing?.iterations === Infinity || a.playState !== 'running'
    }),
  )
  // Two-frame settle so the post-transition reflow lands, then pin the scroll origin: fit
  // assertions read viewport-relative rects, and a capture must show the frame the user lands
  // on — a stray focus-scroll would shift both.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
}

/**
 * Drive a dev seed to its RESOLVED, FINAL-tier answer and settle layout.
 *
 * The synchronization anchor is `main.result[data-answer-tier="final"]`: memoryModel stamps the
 * recompute tier that COMMITTED the rendered answer onto ModelAnswer, and Result.tsx mirrors it.
 * The seed flow fires provisional → final (IntakeApp), so this waits for the LAST commit — a real
 * wait, never a class-absence check (the fit spec's first draft waited on `.fod-provisional` /
 * `.cs-provisional` count 0, which its adversarial review proved vacuous: those classes never
 * render on the result hero, so it resolved instantly at the provisional frame). The stamp also
 * implies `data-inframe-disclaimer` (a resolved answer is never `computing`), so no second
 * attribute wait is needed.
 */
export async function gotoSeedFinal(page: Page, seed: string): Promise<void> {
  await page.goto(`/?seed=${seed}`)
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({
    timeout: FINAL_TIER_MS,
  })
  await settleLayout(page)
}

/** How long a FINAL-tier render may take: a date seed's 16k-path final is ~60 s alone and ~1.5× that
 *  beside other solves (playwright.fit.config.ts caps the local worker count for exactly this reason).
 *  Every wait on the `data-answer-tier="final"` anchor reads this, never a re-typed 90_000. */
export const FINAL_TIER_MS = 150_000

/**
 * Drive a DEV `?vault=<key>` AGED plant (src/ui/devSeeds.ts AGED_PLANTS) to its resolved FINAL-tier
 * answer and settle layout. A vault route is GATED where a seed route is not: the plant writes an
 * encrypted vault and lands on the Unlock screen with the dev passphrase pre-filled, and the
 * re-entry gate ("Are these still your numbers?") holds the recompute until the household affirms —
 * so the drive is unlock → affirm → the same `data-answer-tier="final"` stamp gotoSeedFinal waits
 * on. NEVER drive a plant with gotoSeedFinal: `main.result` never attaches behind the gate and the
 * test dies at the tier timeout. Lives HERE (the same law as everything above): vertical-fit.spec.ts
 * and caddie-walk.spec.ts each carry this drive inline, and a spec cannot import another spec.
 */
export async function gotoVaultFinal(page: Page, key: string): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const unlock = page.getByRole('button', { name: 'Open my plan' })
  await expect(unlock, `?vault=${key}: the plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
  await unlock.click()
  const affirm = page.getByRole('button', { name: /Still about right/ })
  await expect(affirm, `?vault=${key}: the re-entry gate never mounted after unlock`).toBeVisible({ timeout: 30_000 })
  await affirm.click()
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleLayout(page)
}
