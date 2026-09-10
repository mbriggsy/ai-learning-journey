import { test, expect, type Page } from '@playwright/test'
import { PHONE, PHONE_DPR, settleLayout } from './reviewSurface'
import { copy } from '../src/ui/copy'

/**
 * THE PHONE INTAKE FOLD GATE (2026-09-08) — the arrival frame of an intake step, and the two
 * view swaps inside a list step, proven in a real Chromium at 390×844.
 *
 * WHAT IT HOLDS, AND WHY EACH ARM EXISTS.
 *
 * 1. THE SCROLL RESET. The DOCUMENT is the scroller (`.intake-shell` declares no `overflow`, and
 *    neither does `html` or `body`), so the scroll offset survives a step swap. On this viewport
 *    the reader routinely has to scroll to reach Continue — measured on the walk this gate was
 *    built from, Continue's bottom edge sits below the 862 px window at scroll 0 on SIX of this
 *    route's twelve steps, reaching 1430 px on the Social Security step — and the answer strip,
 *    which sits ABOVE the step heading, is what a carried offset pushes off the top. On that walk
 *    four steps arrived scrolled, three of them with the strip 48 px, 210 px and 152 px above the
 *    fold. `useFocusHeadingOnStep` (src/intake/a11y.ts) now focuses with `preventScroll` and then
 *    puts the document back to 0.
 *
 *    HOW THE ARM STAYS HONEST. It scrolls DELIBERATELY before each advance and asserts the scroll
 *    actually landed (`carried > 0`) — an arm that advanced from scroll 0 would assert scroll 0 on
 *    arrival and prove nothing. The advance is a programmatic `.click()` inside the page rather
 *    than a Playwright tap, because a Playwright tap scrolls its target into view first and would
 *    replace the carried offset this arm is controlling. CARRY_PX is chosen BELOW the incoming
 *    heading's own top (~308–400 px at scroll 0 on every step of this route): above that the
 *    browser's own focus-scroll would pull the page to 0 by itself and the arm would pass with the
 *    reset deleted. Verified by mutant: deleting the two reset lines from `useFocusHeadingOnStep`
 *    reds this test.
 *
 * 2. THE TWO VIEW SWAPS. Tapping Add or Edit on a list step replaces the whole step body with an
 *    editor, and committing or cancelling replaces it back. The step heading never changes across
 *    either swap, so before this gate's subjects existed nothing named the new screen and focus was
 *    left on a button that had just unmounted. Both new headings are h3 under the step's h2 — a
 *    second h2 would break every singular level-2 query in the intake suite.
 *
 * 3. THE NAV YIELD. While an editor is open the step's own Continue/Back must be GONE, not merely
 *    styled: the other-income step is the LAST step and its `fields` are empty, so one tap on a live
 *    Continue fires the flow's terminal `onComplete()`, unmounts the editor and takes a fully typed
 *    pension with it. The rule is a single CSS selector (src/intake/intake.css:496), and it named only
 *    the ACCOUNT editor's root until 2026-09-08 — so this arm opens BOTH editors, never just one.
 *
 * NOT AN ARM: the editor's own scroll-into-view (`focusHeading`'s `preventScroll: false` default,
 * src/intake/a11y.ts) — it is not observable on this route, MEASURED 2026-09-08 rather than assumed.
 * An arm was built and it disqualified itself on its own non-vacuity read: the accounts LIST at this
 * viewport has a scrollable range of only 281 px, so that is the deepest offset a reader can carry
 * into the swap, while the editor's heading lands 383.3 px down the document — above the fold at
 * every reachable scroll position, so the browser has nothing to scroll and the assertion would have
 * passed with the default flipped. Only a longer list (more committed accounts than `?seed=datesolo`
 * carries) could make it bite; nothing here pretends otherwise.
 *
 * NOT AN ARM: a height budget for `.answer-strip`. The two-block missing list (an ABSENT block
 * beside an UNREPRESENTABLE one) measured 278 px at this width on 2026-09-08 — 17.4 rem against a
 * 7.5 rem reserve — and Continue's bottom edge is already below the fold at scroll 0 on half this
 * route's steps, so a phone reserve sized to that worst case would only push the question further
 * down. The register carries the fork; nothing here decrees a number.
 *
 * VIEWPORT NOTE (measured, not assumed): under Playwright's mobile emulation at PHONE the layout
 * window is 390×862 (`window.innerHeight`) while `visualViewport.height` reads 844. Every
 * assertion below is in `getBoundingClientRect` coordinates, so it reads `innerHeight`.
 *
 * HARNESS: the fit harness (`playwright.fit.config.ts`, `pnpm verify:fit`) — this drives the
 * DEV-only `?seed=` route, which is dead-code-eliminated out of dist/, so the CSP harness could
 * never run it. It is listed in that config's `testMatch` and in playwright.config.ts's
 * `testIgnore` denylist.
 */

test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

/** How far down the page the reader is when they tap Continue. Deliberately SMALL — see the
 *  docblock: a carry larger than the incoming heading's own top is erased by the browser's focus
 *  scroll, which would make the reset arm vacuous. */
const CARRY_PX = 120

interface Arrival {
  readonly heading: string | null
  readonly scrollTop: number
  readonly innerHeight: number
  readonly stripTop: number | null
  /** The incoming heading's own top at scroll 0 — the live half of CARRY_PX's precondition. */
  readonly headingTop: number | null
  readonly headingBottom: number | null
}

const arrival = (page: Page): Promise<Arrival> =>
  page.evaluate(() => {
    const strip = document.querySelector('.answer-strip')
    const heading = document.querySelector('.step-heading')
    const scroller = document.scrollingElement ?? undefined
    return {
      heading: heading === null ? null : heading.textContent,
      scrollTop: scroller === undefined ? -1 : scroller.scrollTop,
      innerHeight: window.innerHeight,
      stripTop: strip === null ? null : strip.getBoundingClientRect().top,
      headingTop: heading === null ? null : heading.getBoundingClientRect().top,
      headingBottom: heading === null ? null : heading.getBoundingClientRect().bottom,
    }
  })

/**
 * Fonts, finite animations and a two-frame reflow — `settleLayout`'s recipe MINUS its final
 * `window.scrollTo(0, 0)`.
 *
 * THAT PIN CANNOT BE USED HERE. It exists so a capture or a fit measurement reads the frame the
 * user lands on rather than a stray focus scroll; on this spec the SCROLL POSITION IS THE
 * MEASUREMENT, and pinning it would make the reset arm assert a reset this helper had just
 * performed itself. Caught by mutant: with `settleLayout` in the arrival path, deleting the reset
 * from `useFocusHeadingOnStep` left all three tests green.
 */
async function settleKeepingScroll(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const timing = a.effect?.getTiming()
      return timing?.iterations === Infinity || a.playState !== 'running'
    }),
  )
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )
}

/** The focused element, described enough to identify WHICH heading it is. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el === null ? null : el.tagName,
      className: el === null ? null : el.className,
      text: el === null ? null : (el.textContent ?? '').trim(),
    }
  })

/**
 * The ONLY entry that reaches the intake flow with a real household behind it.
 *
 * `?seed=…` applies a COMPLETE draft and lands on the result surface — there are no steps to
 * advance there. The AssumptionPanel's re-walk door remounts IntakeFlow at index 0 over that
 * seeded draft, which is what a returning reader actually does.
 *
 * `datesolo` deliberately, and NOT `gotoSeedFinal`: it is the refusal witness (the engine cannot
 * price coverage bought alone beside a working spouse), so `buildDateInput` returns null and
 * `data-answer-tier` NEVER stamps — a wait on `main.result[data-answer-tier="final"]` times out
 * against it. The honest anchor is the withheld hero's own line.
 */
async function rewalkFromDateSolo(page: Page): Promise<void> {
  await page.goto('/?seed=datesolo')
  await expect(page.locator('main.result')).toBeAttached({ timeout: 60_000 })
  await expect(
    page.getByText(copy.answerWithheldLead),
    'datesolo did not land on the withheld hero — the seed or the refusal route moved',
  ).toBeVisible({ timeout: 60_000 })
  await settleLayout(page)
  await page.getByRole('button', { name: copy.assumptionDoorCta }).click()
  await page.getByRole('button', { name: copy.assumptionRewalkCta }).click()
  await expect(page.locator('.intake-shell')).toBeVisible({ timeout: 30_000 })
  await settleLayout(page)
}

/** Scroll the document down, then advance IN-PAGE (no Playwright auto-scroll — see the docblock).
 *  Returns the offset that was actually carried into the swap. */
async function carryThenAdvance(page: Page): Promise<number> {
  const carried = await page.evaluate((px) => {
    const scroller = document.scrollingElement ?? undefined
    if (scroller === undefined) return -1
    scroller.scrollTop = px
    return scroller.scrollTop // what the page could actually take, never what we asked for
  }, CARRY_PX)
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('.intake-nav .btn-primary')
    btn?.click()
  })
  await page.waitForTimeout(400) // the enter transition; settleLayout below waits it out properly
  return carried
}

/** Advance until the step heading reads `target`. Returns the number of advances taken. */
async function advanceTo(page: Page, target: string): Promise<number> {
  for (let taken = 0; taken < 30; taken += 1) {
    const heading = await page.locator('.step-heading').textContent()
    if (heading === target) return taken
    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>('.intake-nav .btn-primary')
      btn?.click()
    })
    await page.waitForTimeout(350)
  }
  throw new Error(`never reached the step headed "${target}"`)
}

test.describe('the phone intake fold', () => {
  test('every step arrives at the top of the page, with the answer strip in view', async ({ page }) => {
    await rewalkFromDateSolo(page)

    const first = await arrival(page)
    expect(first.heading, 'the re-walk did not land on a step').not.toBeNull()

    let arrivals = 0
    for (let i = 0; i < 30; i += 1) {
      if ((await page.locator('.intake-nav .btn-primary').count()) === 0) break
      const before = await page.locator('.step-heading').textContent()
      const carried = await carryThenAdvance(page)
      // NON-VACUITY: the whole arm is about a scroll offset SURVIVING the swap. If the page could
      // not take one, the assertions below would be about nothing.
      expect(carried, 'the pre-advance scroll never landed — the reset arm would be vacuous').toBeGreaterThan(0)
      if ((await page.locator('.intake-shell').count()) === 0) break // the terminal advance left the flow
      await settleKeepingScroll(page)
      const now = await arrival(page)
      expect(now.heading, 'Continue did not advance the step').not.toBe(before)
      arrivals += 1
      const where = `arriving at "${now.heading ?? '?'}" carrying ${carried}px`

      // (a) the reset itself.
      expect(now.scrollTop, `${where}: the document scroll carried into the new step`).toBe(0)
      // (a2) CARRY_PX's OWN PRECONDITION, read live rather than decreed. Assertion (a) can be
      // satisfied by the browser's focus scroll instead of the reset whenever the carry is LARGER
      // than the incoming heading's own top — and (a) has just proved the page is at 0, so this
      // rect top IS that document offset. A future shorter answer strip would void the guard in
      // silence; here it reds instead.
      expect(
        now.headingTop ?? 0,
        `${where}: CARRY_PX (${CARRY_PX}) is no longer below the step heading's own top — the browser's focus scroll would erase the carry by itself and this arm would pass with the reset deleted`,
      ).toBeGreaterThan(CARRY_PX)
      // (b) the answer strip — the whole answer-during-entry surface — is on screen.
      expect(now.stripTop, `${where}: no answer strip rendered`).not.toBeNull()
      expect(now.stripTop ?? -1, `${where}: the answer strip is above the top of the window`).toBeGreaterThanOrEqual(0)
      // (c) the question the reader came for is on screen with it.
      expect(now.headingBottom ?? Number.MAX_SAFE_INTEGER, `${where}: the step heading is below the fold`).toBeLessThan(
        now.innerHeight,
      )
    }
    // The walk must actually have happened: datesolo's sequence is 12 steps
    // (names · work · pay · Social Security · state · spend · health quote · employer coverage ·
    // out-of-pocket · work investment · accounts · other income), so 11 arrivals follow the first.
    expect(arrivals, 'the walk advanced through fewer steps than datesolo has').toBeGreaterThanOrEqual(11)
  })

  test('the account editor names itself and takes focus; Never mind hands focus to the list', async ({ page }) => {
    await rewalkFromDateSolo(page)
    await advanceTo(page, copy.qAccountsHeading)

    await page.getByRole('button', { name: copy.addAccount }).click()
    await page.waitForTimeout(300)
    const onEditor = await focused(page)
    expect(onEditor.tag, 'the account editor did not take focus on its own heading').toBe('H3')
    expect(onEditor.className).toContain('entry-heading')
    expect(onEditor.text).toBe(copy.accountEntryAddHeading)
    // The step's own h2 is still the only h2 — a second one breaks the intake suite's singular
    // level-2 queries.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1)

    await page.getByRole('button', { name: copy.accountCancel }).click()
    await page.waitForTimeout(300)
    const onList = await focused(page)
    expect(onList.tag, 'the return from the editor left focus nowhere').toBe('H3')
    expect(onList.className).toContain('list-heading')
    expect(onList.text).toBe(copy.accountsListHeading)

    // Edit on a committed row opens the SAME editor under its other name.
    await page.getByRole('button', { name: copy.accountEdit }).first().click()
    await page.waitForTimeout(300)
    const onEdit = await focused(page)
    expect(onEdit.tag).toBe('H3')
    expect(onEdit.text).toBe(copy.accountEntryEditHeading)
  })

  test('the other-income editor names itself and takes focus; Never mind hands focus to the list', async ({ page }) => {
    await rewalkFromDateSolo(page)
    await advanceTo(page, copy.qOtherIncomeHeading)

    await page.getByRole('button', { name: copy.addOtherIncome }).click()
    await page.waitForTimeout(300)
    const onEditor = await focused(page)
    expect(onEditor.tag, 'the other-income editor did not take focus on its own heading').toBe('H3')
    expect(onEditor.className).toContain('entry-heading')
    expect(onEditor.text).toBe(copy.otherIncomeEntryAddHeading)
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1)

    await page.getByRole('button', { name: copy.otherIncomeCancel }).click()
    await page.waitForTimeout(300)
    const onList = await focused(page)
    expect(onList.tag, 'the return from the editor left focus nowhere').toBe('H3')
    expect(onList.className).toContain('list-heading')
    expect(onList.text).toBe(copy.otherIncomeListHeading)
  })

  test('an open editor takes the step nav away — on BOTH list steps', async ({ page }) => {
    await rewalkFromDateSolo(page)
    const nav = page.locator('.intake-nav')

    // Walked in sequence: accounts comes before other income, so one re-walk covers both. The
    // other-income half is the one that matters most — that step is LAST and its `fields` are
    // empty, so a live Continue there is a silent discard, not merely a broken-looking screen.
    for (const step of [
      { heading: copy.qAccountsHeading, add: copy.addAccount, cancel: copy.accountCancel },
      { heading: copy.qOtherIncomeHeading, add: copy.addOtherIncome, cancel: copy.otherIncomeCancel },
    ]) {
      await advanceTo(page, step.heading)
      await expect(nav, `${step.heading}: no step nav to yield — the arm would be vacuous`).toBeVisible()

      await page.getByRole('button', { name: step.add }).click()
      await page.waitForTimeout(300)
      await expect(
        nav,
        `${step.heading}: Continue stayed live over the open editor — one tap abandons the form`,
      ).toBeHidden()

      await page.getByRole('button', { name: step.cancel }).click()
      await page.waitForTimeout(300)
      await expect(nav, `${step.heading}: the nav did not come back with the list`).toBeVisible()
    }
  })
})
