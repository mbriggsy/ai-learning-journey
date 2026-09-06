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
