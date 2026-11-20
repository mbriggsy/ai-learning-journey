import { expect, type Page } from '@playwright/test'
import { copy } from '../src/ui/copy'

/**
 * The ONE canonical home of the review-surface constants + the settle recipe, shared by every
 * harness that reads the real rendered UI (the vertical-fit gate, the Caddie cold-read walk).
 * Extracted from vertical-fit.spec.ts 2026-07-10 (the Caddie increment-1 refactor) so Briggsy's
 * real window and the "page is truly settled" contract are never re-typed — a spec cannot
 * import them from another spec (importing a *.spec.ts registers its tests in the wrong
 * harness), so they live here.
 */

/** Briggsy's REAL laptop window — 1440×731 CSS px @ DPR 2, his Lenovo, measured in his own
 *  Chrome 2026-11-19 (the 1440×731 re-point, 2026-11-20; the Dell's 1536×791 @ 2.5 window,
 *  measured 2026-07-08, died with that laptop). It sits in the two-pane tier AND the short
 *  density tier (731 ≤ 840, tokens.css --bp-laptop-short). tokens.css `--laptop-fit-height`
 *  mirrors REAL.height, and scripts/__tests__/breakpoint-mirrors.test.ts binds the two. */
export const REAL = { width: 1440, height: 731 }
/** The DPR his window runs at — pair with REAL wherever a context is created. */
export const REAL_DPR = 2
/** A DPR-1 laptop inside the short density tier (800 ≤ 840) — NOT a narrower-width arm. At a
 *  16 px root, 1280, 1440, 1536 and 1871 all render the same capped 1120 px frame
 *  (--content-wide; measured identical y-values, 2026-11-20), so what this arm adds over REAL is
 *  DPR 1 and the short tier at 800 px. FLOOR is the only narrower two-pane width. */
export const TIER = { width: 1280, height: 800 }
/** The tall showcase: two-pane, but ABOVE the 840px density boundary — the generous rhythm, where
 *  every density rung's tall side is pinned. A TEST arm, not any screen of his: 1871×917 was the
 *  Dell's screen, and his Lenovo's full screen (1440×900 @ 2) also leaves the short tier off. */
export const SHOWCASE = { width: 1871, height: 917 }
/** The two-pane breakpoint in REM, mirroring `--bp-laptop` in src/ui/styles/tokens.css (@media
 *  cannot read a custom property, so every @media rule re-states it as a literal too).
 *  scripts/__tests__/breakpoint-mirrors.test.ts pins THIS constant and every CSS/matchMedia mirror
 *  against the token, so the seam can never drift silently. */
export const BP_LAPTOP_REM = 68
/** The browser's DEFAULT root font size in px — what one rem resolves to when the user has not
 *  raised it. Named, not inlined (council 2026-09-10): a raised default changes what 68rem resolves
 *  to, so a reader of FLOOR sees exactly which assumption the pixel width rests on. This is the CSS
 *  initial `font-size` (the spec's value, not a project knob) — the 20px/24px fit arms raise it via
 *  CDP Page.setFontSizes and are deltas FROM it, so it must NEVER be edited to match one of those
 *  regimes: that would slide FLOOR off the two-pane seam it exists to sit on.
 *  scripts/__tests__/breakpoint-mirrors.test.ts pins it against a literal 16 for exactly that. */
export const BROWSER_DEFAULT_PX = 16
/** 68rem exactly — the two-pane breakpoint's tightest in-range width (the honesty floor). */
export const FLOOR = { width: BP_LAPTOP_REM * BROWSER_DEFAULT_PX, height: 800 }
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
 * readiness signal (`SETTLED_RESULT` for a seed route, or a post-edit echo for an in-page
 * interaction) — this helper settles LAYOUT, it does not know when the ANSWER is final.
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
 * THE SETTLED RESULT — every harness's synchronization anchor (W9-R7, KTD9; the plan is
 * `docs/plans/features/answered-draft-build-spec.md`): a FINAL-tier answer with no run on newer inputs
 * in flight.
 *  - `data-answer-tier`: memoryModel stamps the recompute tier that COMMITTED the shown answer, and
 *    Result.tsx mirrors it (absent until a verdict commits). A presence the producer writes, never a
 *    class-absence check: the fit spec's first draft waited on `.fod-provisional` / `.cs-provisional`
 *    reaching count 0, classes the hero did not render then, so the wait passed at first paint
 *    (insight 070).
 *  - `data-answer-refiguring`: present exactly while a run on inputs different from the shown answer's
 *    is in flight (the store's flag, presence-keyed). Once an answer stands the store HOLDS it through
 *    an edit's run, and that old answer still says "final", so a final-tier wait alone passes inside
 *    the window, measuring or capturing the answer from before the edit.
 * On a fresh load the flag never rises (it is down over `pending`, and the seed's provisional → final
 * pair is one input), so this and a bare final-tier wait agree there. After an EDIT the absence half is
 * an absence wait, green before the edit's run is dispatched as well as after it lands: a wait that
 * follows an edit sees the attribute APPEAR first (`armRefiguringWatch` before the edit,
 * `expectRefiguringSeen` after it), and only then waits for this. The stamp also implies
 * `data-inframe-disclaimer` (a resolved answer is never `computing`).
 */
export const SETTLED_RESULT = 'main.result[data-answer-tier="final"]:not([data-answer-refiguring])'

/**
 * Drive a dev seed to its RESOLVED, FINAL-tier answer and settle layout. The seed flow fires
 * provisional → final (IntakeApp), so `SETTLED_RESULT` waits for the LAST commit.
 */
export async function gotoSeedFinal(page: Page, seed: string): Promise<void> {
  await page.goto(`/?seed=${seed}`)
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({
    timeout: FINAL_TIER_MS,
  })
  await settleLayout(page)
}

/** How long a FINAL-tier render may take: a date seed's 16k-path final is ~60 s alone and ~1.5× that
 *  beside other solves (playwright.fit.config.ts caps the local worker count for exactly this reason).
 *  Every wait on `SETTLED_RESULT` reads this, never a re-typed 90_000. */
export const FINAL_TIER_MS = 150_000

/** One reading of `main.result` by the re-figuring watch: whether the flag's attribute stood, the tier,
 *  and the hero's own words (its heading and the line under it, which only a commit writes), stamped in
 *  ms since the watch was armed. */
export type RefiguringReading = {
  readonly t: number
  readonly refiguring: boolean | null
  readonly tier: string | null
  readonly verdict: string
}

/**
 * THE RE-FIGURING WATCH (W9-R7's U5) — armed just before an edit, it records every change in what
 * `main.result` says: the flag's attribute, the tier, the hero's words. Shared by the Caddie walk (a
 * panel capture must never show the answer from before the edit) and the fit gate's live arm.
 *
 * Why the attribute is the signal: the store sets it the moment a run on newer inputs is dispatched and
 * clears it when the first answer at those inputs commits (or the run returns held), on both routes. The
 * tier is no signal: a spine panel edit dispatches the final tier alone, so the tier never leaves
 * "final" (and walk 1's branch B moved the date hero with every tier read "final"). An edit that changes
 * no engine input (a name, a blur that changed nothing) raises nothing, by design (R5).
 *
 * Armed only once the page is settled, so every earlier edit's run has landed and the attribute's next
 * appearance is this edit's. The observer reads `main.result` afresh on every mutation, so a Result
 * remounted by a run is still seen, and it keeps a reading only when one of its three facts moved.
 */
export async function armRefiguringWatch(page: Page): Promise<void> {
  await expect(page.locator(SETTLED_RESULT), 'an earlier edit’s run never settled').toBeAttached({ timeout: FINAL_TIER_MS })
  await page.evaluate(() => {
    const w = window as unknown as { __refiguring?: RefiguringReading[]; __refiguringObserver?: MutationObserver }
    w.__refiguringObserver?.disconnect()
    const t0 = performance.now()
    const log: RefiguringReading[] = []
    w.__refiguring = log
    const read = (): void => {
      const m = document.querySelector('main.result')
      const h = document.querySelector('main.result h2')
      const next: RefiguringReading = {
        t: Math.round(performance.now() - t0),
        refiguring: m === null ? null : m.hasAttribute('data-answer-refiguring'),
        tier: m === null ? null : m.getAttribute('data-answer-tier'),
        verdict: h === null ? '' : `${h.textContent ?? ''} | ${h.nextElementSibling?.textContent ?? ''}`,
      }
      const last = log[log.length - 1]
      if (last === undefined || last.refiguring !== next.refiguring || last.tier !== next.tier || last.verdict !== next.verdict) {
        log.push(next)
      }
    }
    read()
    if (log[0]!.verdict === '') throw new Error('the re-figuring watch found no verdict heading on the Result')
    const observer = new MutationObserver(read)
    w.__refiguringObserver = observer
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-answer-refiguring', 'data-answer-tier'],
    })
  })
}

/** What the watch armed by `armRefiguringWatch` has read so far, oldest first. */
export async function refiguringLog(page: Page): Promise<readonly RefiguringReading[]> {
  return page.evaluate(() => (window as unknown as { __refiguring?: RefiguringReading[] }).__refiguring ?? [])
}

/** Passes once the watch has seen the edit's run dispatched (the attribute stood at least once). The
 *  flag rises in the same task as the dispatch, so a miss means the edit changed no engine input or
 *  dispatched nothing; it prints what the watch read, labelled with `who`. */
export async function expectRefiguringSeen(page: Page, who: string): Promise<void> {
  try {
    await expect
      .poll(async () => (await refiguringLog(page)).some((r) => r.refiguring === true), {
        message: `${who}: the edit dispatched no run on new inputs (data-answer-refiguring never appeared)`,
        timeout: 30_000,
      })
      .toBe(true)
  } catch (e) {
    const log = await refiguringLog(page)
    console.log(
      `[${who}] the Result since the watch was armed (ms:refiguring/tier): ${log
        .slice(0, 40)
        .map((r) => `${r.t}:${String(r.refiguring)}/${String(r.tier)}`)
        .join(' ')}`,
    )
    throw e
  }
}

/**
 * Drive a DEV `?vault=<key>` AGED plant (src/ui/devSeeds.ts AGED_PLANTS) to its resolved FINAL-tier
 * answer and settle layout. A vault route is GATED where a seed route is not: the plant writes an
 * encrypted vault and lands on the Unlock screen with the dev passphrase pre-filled, and the
 * re-entry gate ("Are these still your numbers?") holds the recompute until the household affirms —
 * so the drive is unlock → affirm → the same `SETTLED_RESULT` gotoSeedFinal waits
 * on. NEVER drive a plant with gotoSeedFinal: `main.result` never attaches behind the gate and the
 * test dies at the tier timeout. Lives HERE (the same law as everything above): vertical-fit.spec.ts
 * and caddie-walk.spec.ts each carry this drive inline, and a spec cannot import another spec.
 */
export async function gotoVaultFinal(page: Page, key: string): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const unlock = page.getByRole('button', { name: 'Open my plan' })
  await expect(unlock, `?vault=${key}: the plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
  await unlock.click()
  const affirm = page.getByRole('button', { name: /still about right/i })
  await expect(affirm, `?vault=${key}: the re-entry gate never mounted after unlock`).toBeVisible({ timeout: 30_000 })
  await affirm.click()
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleLayout(page)
}

/**
 * Re-walk a dev seed's intake to the step headed `heading` — the ONE route into the intake flow with
 * a real household behind it. `?seed=` applies a complete draft and lands on the result (there are no
 * steps to advance there); the AssumptionPanel's re-walk door remounts the flow at index 0 over that
 * draft, which is what a returning reader does. Lives HERE because two specs drive it (intake-fold's
 * own spec-local copy predates it, and vertical-fit's pay-check arms need it) and a spec cannot import
 * another spec.
 *
 * The anchor is the Assumptions door itself, never `SETTLED_RESULT`: the refusal witness
 * (`datesolo`) never stamps a tier. For a buildable seed pass `final: true` so the final-tier recompute
 * commits BEFORE the walk starts (it would otherwise land mid-walk). Advances are IN-PAGE clicks on
 * the step's primary button (no Playwright auto-scroll), and a step that will not advance fails loud
 * — a W gate holding Continue on a stale or absent W is exactly that.
 */
export async function rewalkSeedTo(
  page: Page,
  seed: string,
  heading: string,
  opts: { readonly final?: boolean } = {},
): Promise<void> {
  await page.goto(`/?seed=${seed}`)
  if (opts.final === true) {
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  }
  const door = page.locator('[data-door="assumptions"]')
  await expect(door, `?seed=${seed}: no Assumptions door — the result never offered the re-walk`).toBeVisible({
    timeout: FINAL_TIER_MS,
  })
  await door.click()
  await page.getByRole('button', { name: copy.assumptionRewalkCta }).click()
  await advanceIntakeTo(page, heading, `?seed=${seed}`)
}

/**
 * Advance the re-walk the page has just opened (the panel's `assumptionRewalkCta`) to the step headed
 * `heading`, and settle layout. Advances are IN-PAGE clicks on the step's primary button (no Playwright
 * auto-scroll), and a step that will not advance fails loud. `who` names the route in the errors. The
 * second half of `rewalkSeedTo`, for a caller that changed the draft in the panel before re-walking.
 */
export async function advanceIntakeTo(page: Page, heading: string, who: string): Promise<void> {
  await expect(page.locator('.intake-shell')).toBeVisible({ timeout: 30_000 })
  for (let taken = 0; taken < 30; taken += 1) {
    const now = await page.locator('.step-heading').textContent()
    if (now === heading) {
      await settleLayout(page)
      return
    }
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('.intake-nav .btn-primary')?.click())
    await page.waitForTimeout(350)
    if ((await page.locator('.step-heading').textContent()) === now) {
      throw new Error(`${who}: Continue did not advance past "${now ?? '?'}" on the way to "${heading}"`)
    }
  }
  throw new Error(`${who}: never reached the step headed "${heading}"`)
}
