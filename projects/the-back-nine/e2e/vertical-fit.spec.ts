import { test, expect, type Page } from '@playwright/test'

/**
 * The real-browser VERTICAL-FIT gate (council 2026-07-08, wf_a2d93977-960 — run via
 * `pnpm verify:fit`, harness in playwright.fit.config.ts).
 *
 * THE FRAME CONTRACT it pins (tokens.css `--laptop-fit-height` carries the law):
 *  - A resolved two-pane answer fits ONE laptop frame; the quiet doors (`.result-quiet-row`) are
 *    the ONLY sanctioned below-fold casualty. The verdict, the unpriced-Medicare disclosure, the
 *    band, and the R13 disclaimer are PROTECTED (the Honesty-Hawk veto: a reassuring verdict
 *    in-frame with "this can be wrong" scrolled out of sight is the calm-but-wrong sin).
 *  - The DATE route scrolls BY DESIGN (both graphs stacked — content-necessary, Briggsy-accepted
 *    2026-07-08); its honesty contract is ORDER: graphs → in-frame disclaimer → doors, doors last.
 *  - TWO disclaimer mounts, exactly ONE visible per tier (laptop = in-frame, <68rem = trailing).
 *  - The short-laptop DENSITY tier (≥68rem ∧ ≤840px) steps `.result` padding-block one token
 *    (40px → 32px, whitespace only); the 917 showcase keeps the generous rhythm.
 *  - The two-pane honesty floor (absorbed from the parked D2d e2e): at 1088px (68rem exactly) the
 *    band's percentile labels — the color-blind reader's honesty channel — must still render
 *    (the ≤260px container query must NOT fire at the tightest in-range pane width).
 *
 * Enforcement is REAL-BROWSER on the DEV server: vertical fit is reflow-dominated (line wraps,
 * door wrap-count, the survivor face) — a token-sum arithmetic gate would go green while the
 * frame overflows — and the `?seed=` routes this drives are DCE'd out of dist/.
 *
 * EVERY measurement waits for the FINAL engine tier via the `data-answer-tier="final"` stamp
 * (memoryModel records which recompute tier COMMITTED the rendered answer; Result.tsx mirrors it):
 * the provisional→final sharpen re-keys the band axis and can re-wrap lines — measuring the
 * provisional frame would pin the frame the user does NOT end up reading. (The gate's OWN
 * adversarial review killed this spec's first draft here: it waited on `.fod-provisional` /
 * `.cs-provisional` reaching count 0 — classes that never render on the result hero, a wait that
 * passes vacuously at first paint. The stamp is a real synchronization; the spine's two tiers
 * merely HAPPEN to be byte-identical today because the spine run ignores the tier.)
 *
 * Falsifiability (insight 016): each assertion here was proven RED against a planted violation
 * before this gate shipped — the mutation ledger lives in the gate's landing commit message.
 */

/** Briggsy's REAL laptop window — 1536×791 CSS px @ DPR 2.5, measured in his own Chrome
 *  2026-07-08 (TODO landmine: the old "1871×917" screenshot number is his SCREEN, not his
 *  window — never tune a fit against it; here 1871×917 serves only as the tall SHOWCASE arm
 *  where the density tier must NOT fire). */
const REAL = { width: 1536, height: 791 }
/** The `--laptop-fit-height` tier floor (tokens.css): the shortest laptop the fit law serves. */
const TIER = { width: 1280, height: 800 }
/** The tall showcase: two-pane, but ABOVE the 840px density boundary — generous rhythm. */
const SHOWCASE = { width: 1871, height: 917 }
/** 68rem exactly — the two-pane breakpoint's tightest in-range width (the honesty floor). */
const FLOOR = { width: 1088, height: 800 }
/** The phone arm — only the disclaimer-tier contract applies (the phone scrolls by design). */
const PHONE = { width: 390, height: 844 }

/** The three spine seeds the council named for the frame contract. `cs-medicare-note` is
 *  per-seed HONEST, not blanket: the disclosure renders only for an all-65+ household
 *  (healthSheetChrome.medicareUnpriced) — `retired` (66/65) and `budget` (68/70) carry it;
 *  `health` (61/59, the ACA-priced household) must NOT (it gets the Healthcare door instead). */
const SPINE_SEEDS = [
  { seed: 'budget', medicareNote: true },
  { seed: 'retired', medicareNote: true },
  { seed: 'health', medicareNote: false },
] as const

/**
 * Drive a dev seed to its RESOLVED, FINAL-tier answer and settle layout.
 *
 * The synchronization anchor is `main.result[data-answer-tier="final"]`: memoryModel stamps the
 * recompute tier that COMMITTED the rendered answer onto ModelAnswer, and Result.tsx mirrors it.
 * The seed flow fires provisional → final (IntakeApp), so this waits for the LAST commit — a real
 * wait, never a class-absence check (this spec's first draft waited on `.fod-provisional` /
 * `.cs-provisional` count 0, which the adversarial review proved vacuous: those classes never
 * render on the result hero, so it resolved instantly at the provisional frame). The stamp also
 * implies `data-inframe-disclaimer` (a resolved answer is never `computing`), so no second
 * attribute wait is needed.
 */
async function gotoSeedFinal(page: Page, seed: string): Promise<void> {
  await page.goto(`/?seed=${seed}`)
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({
    timeout: 90_000,
  })
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
  // Two-frame settle so the post-transition reflow lands, then pin the scroll origin: every
  // assertion below reads viewport-relative rects, so a stray focus-scroll would shift them all.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
}

/** The spine presence companions (insight 029 — geometry over an unresolved/blank page passes
 *  vacuously): the two-pane must be STAMPED, the band panel drawn, the doors offered. */
async function assertResolvedSpine(page: Page): Promise<void> {
  await expect(page.locator('.confidence-reveal[data-twopane]')).toBeVisible()
  await expect(page.locator('.cs-band .band-drawer')).toBeVisible()
  expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
}

type FrameReport = {
  readonly counted: number
  readonly offenders: ReadonlyArray<{ readonly desc: string; readonly bottom: number }>
}

/**
 * Walk every rendered element and report the ones whose box ends below the viewport.
 *
 * `excludeQuietRow` (the laptop arms): the `.result-quiet-row` SUBTREE is the sanctioned
 * below-fold casualty, and its ANCESTOR chain (reveal → hero → main → …) is excluded with it —
 * an ancestor's bottom is driven by the row it contains, so counting it would re-ban the one
 * overflow the contract sanctions. Everything else — the disclaimer above all — must fit.
 * With `excludeQuietRow: false` (the showcase arm) even the doors must land in-frame.
 *
 * `counted` guards the walk itself: a blank/error page yields near-zero rendered elements and
 * MUST fail the companion floor, never pass an empty-offender check (insight 029).
 */
async function frameReport(page: Page, excludeQuietRow: boolean): Promise<FrameReport> {
  return page.evaluate((excludeQuiet) => {
    const vh = window.innerHeight
    const quiet = document.querySelector('.result-quiet-row')
    const offenders: Array<{ desc: string; bottom: number }> = []
    let counted = 0
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (excludeQuiet && quiet !== null && (quiet.contains(el) || el.contains(quiet))) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      // Viewport-anchored chrome (the update toast) sits outside document flow — not a fit fact.
      if (style.position === 'fixed') continue
      if (el.getClientRects().length === 0) continue // display:contents wrappers render no box
      const r = el.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue // sr-only 1px clips, hairlines
      counted++
      if (r.bottom > vh + 0.5) {
        const cls = el.getAttribute('class')
        offenders.push({
          desc: `${el.tagName.toLowerCase()}${cls !== null && cls !== '' ? `.${cls.split(/\s+/).join('.')}` : ''}`,
          bottom: Math.round(r.bottom),
        })
      }
    }
    return { counted, offenders }
  }, excludeQuietRow)
}

/** A resolved two-pane answer renders hundreds of elements; a walk that counted fewer than this
 *  measured a broken page, not the frame. */
const WALK_FLOOR = 60

async function assertFrameFits(page: Page, excludeQuietRow: boolean): Promise<void> {
  const report = await frameReport(page, excludeQuietRow)
  expect(report.counted, 'frame walk counted too few elements — page did not render').toBeGreaterThan(
    WALK_FLOOR,
  )
  expect(
    report.offenders,
    `elements end below the ${excludeQuietRow ? 'sanctioned' : 'FULL-fit'} frame`,
  ).toEqual([])
}

/** BOTH R13 mounts must exist (the two-mount contract), and exactly the tier's one is visible:
 *  a zero-disclaimer frame and a doubled frame are equally unrepresentable. */
async function assertOneVisibleDisclaimer(page: Page, tier: 'laptop' | 'narrow'): Promise<void> {
  const inFrame = page.locator('footer.disclaimer.disclaimer--in-frame')
  const trailing = page.locator('footer.disclaimer:not(.disclaimer--in-frame)')
  await expect(inFrame, 'the in-frame R13 mount (Result.tsx) is missing').toHaveCount(1)
  await expect(trailing, 'the page-trailing R13 mount (App.tsx) is missing').toHaveCount(1)
  if (tier === 'laptop') {
    await expect(inFrame).toBeVisible()
    await expect(trailing).toBeHidden()
  } else {
    await expect(trailing).toBeVisible()
    await expect(inFrame).toBeHidden()
  }
}

/** The density tier is WHITESPACE-ONLY and boundary-exact: `.result` padding-block steps
 *  --space-8 (40px) → --space-7 (32px) at ≥68rem ∧ ≤840px, and ONLY there. */
async function assertResultPadding(page: Page, px: '32px' | '40px'): Promise<void> {
  const padding = await page
    .locator('main.result')
    .evaluate((el) => window.getComputedStyle(el).paddingBlockStart)
  expect(padding, `.result padding-block-start (density tier ${px === '32px' ? 'ON' : 'OFF'})`).toBe(px)
}

async function assertMedicareNote(page: Page, expected: boolean): Promise<void> {
  const note = page.locator('.cs-medicare-note')
  if (expected) await expect(note, 'the unpriced-Medicare disclosure must render').toBeVisible()
  else await expect(note, 'a pre-65 household must NOT carry the Medicare disclosure').toHaveCount(0)
}

// ── the spine frame matrix: {budget, retired, health} × {REAL, TIER, SHOWCASE} ────────────────

for (const { seed, medicareNote } of SPINE_SEEDS) {
  test.describe(`?seed=${seed} — the one-frame fit law`, () => {
    test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
      test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
      test(`${seed}: everything but the doors fits one frame`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertMedicareNote(page, medicareNote)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertResultPadding(page, '32px') // 791 ≤ 840 — the density tier serves his window
        await assertFrameFits(page, true)
      })
    })

    test.describe(`at the fit-law tier floor (${TIER.width}×${TIER.height})`, () => {
      test.use({ viewport: TIER })
      test(`${seed}: everything but the doors fits one frame`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertResultPadding(page, '32px') // 800 ≤ 840 — tier fires here too
        await assertFrameFits(page, true)
      })
    })

    test.describe(`at the tall showcase (${SHOWCASE.width}×${SHOWCASE.height})`, () => {
      test.use({ viewport: SHOWCASE })
      test(`${seed}: FULL fit (doors included) and the density tier stays off`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertResultPadding(page, '40px') // 917 > 840 — the showcase keeps the generous rhythm
        await assertFrameFits(page, false)
      })
    })
  })
}

// ── the date route (?seed=dip): scrolls BY DESIGN — its contract is ORDER ─────────────────────

test.describe(`?seed=dip — the date route's order contract (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('graphs → in-frame disclaimer → quiet doors, doors last', async ({ page }) => {
    await gotoSeedFinal(page, 'dip')
    // Presence companions: the two-pane stamped, BOTH graphs drawn (the fan band + the odds
    // ladder — the U10 hard-gate surface), the doors offered.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    await expect(page.locator('.fod-band')).toBeVisible()
    await expect(page.locator('.fod-ladder')).toBeVisible()
    expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
    await assertOneVisibleDisclaimer(page, 'laptop')

    const box = async (selector: string) => {
      const b = await page.locator(selector).boundingBox()
      expect(b, `${selector} must render with a real box`).not.toBeNull()
      return b as NonNullable<typeof b>
    }
    const graphs = await box('.fod-graphs')
    const disclaimer = await box('footer.disclaimer.disclaimer--in-frame')
    const doors = await box('.result-quiet-row')

    // ORDER (the Hawk's contract): any overflow pushes the DOORS past the fold, never the
    // honesty caveat — so the caveat sits fully below the graphs, and the doors below it.
    expect(disclaimer.y, 'the R13 disclaimer must sit BELOW both graphs').toBeGreaterThanOrEqual(
      graphs.y + graphs.height - 0.5,
    )
    expect(doors.y, 'the quiet doors must sit BELOW the R13 disclaimer').toBeGreaterThanOrEqual(
      disclaimer.y + disclaimer.height - 0.5,
    )

    // Doors LAST: no rendered content element may end below the doors row.
    const maxOtherBottom = await page.evaluate(() => {
      const doorsEl = document.querySelector('.result-quiet-row')
      let max = 0
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        if (doorsEl !== null && (doorsEl.contains(el) || el.contains(doorsEl))) continue
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed')
          continue
        if (el.getClientRects().length === 0) continue
        const r = el.getBoundingClientRect()
        if (r.width <= 1 || r.height <= 1) continue
        max = Math.max(max, r.bottom)
      }
      return max
    })
    expect(maxOtherBottom, 'content renders BELOW the quiet doors — doors must be last').toBeLessThanOrEqual(
      doors.y + doors.height + 0.5,
    )
  })
})

// ── the two-pane honesty floor (absorbs the parked D2d e2e) ───────────────────────────────────

test.describe(`the honesty floor — 68rem exactly (${FLOOR.width}×${FLOOR.height})`, () => {
  test.use({ viewport: FLOOR })
  test('the band keeps its percentile labels at the tightest in-range pane', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    // The ≤260px container query (band.css) must NOT fire at the 68rem floor: the labels are
    // the color-blind reader's honesty channel (the never-color-alone law).
    const labels = page.locator('.cs-band .band-droppable-label')
    expect(await labels.count(), 'the band rendered no droppable labels at all').toBeGreaterThan(0)
    await expect(labels.first()).toBeVisible()
    // The 3 legend rows ride the same floor (band shape alone must never carry the encoding).
    await expect(page.locator('.cs-band .band-legend__row')).toHaveCount(3)
  })
})

// ── the legend contract at the showcase width ─────────────────────────────────────────────────

test.describe(`the band legend (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('exactly 3 legend rows render with the spine band', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    const rows = page.locator('.cs-band .band-legend__row')
    await expect(rows).toHaveCount(3)
    for (const row of await rows.all()) await expect(row).toBeVisible()
  })
})

// ── the narrow tier: the trailing mount stands, the in-frame mount is dark ────────────────────

test.describe(`the phone tier (${PHONE.width}×${PHONE.height})`, () => {
  test.use({ viewport: PHONE })
  test('exactly one visible disclaimer — the page-trailing mount', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    // The phone scrolls by design — no fit assertion. The two-mount swap is the contract here.
    await assertOneVisibleDisclaimer(page, 'narrow')
  })
})

// ── U12: the AssumptionPanel's OWN vertical extent (the F4 council mandate) ───────────────────
// "Door count stays 5" proves the RESULT frame fits; it says nothing about the panel. The full
// assumption inventory (two sections, ~20 rows) is a density surface no other arm measures: the
// family shell caps the sheet at 94dvh and the content scrolls chrome-lessly INSIDE it — if a
// regression lets the dialog itself outgrow the viewport, the footer (Close / the re-walk) walks
// off-screen with no scrollbar to reach it. The assertion is on the DIALOG BOX, not the content.

test.describe(`the assumption panel's vertical extent (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the open panel is fully inside the viewport; its content scrolls internally', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    await page.getByRole('button', { name: 'The assumptions behind this' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Let the enter transition settle before measuring (transform/opacity only, ~200ms).
    await page.waitForTimeout(400)
    const box = await dialog.boundingBox()
    expect(box, 'the dialog reported no bounding box').not.toBeNull()
    expect(box!.y, 'the panel top sits above the viewport').toBeGreaterThanOrEqual(0)
    expect(
      box!.y + box!.height,
      `the panel bottom (${Math.round(box!.y + box!.height)}px) walks past the ${REAL.height}px viewport — the footer is unreachable`,
    ).toBeLessThanOrEqual(REAL.height)
    // The full inventory is TALLER than the box — the chrome-less internal scroll must own the
    // difference (if this ever fails the inventory shrank below one screen, which is fine, but
    // then the box bound above is the only live assertion — keep both honest).
    const scroll = await dialog.evaluate((el) => {
      const scroller = el.querySelector('.control-sheet__body, .sheet-body, [class*="body"]') ?? el
      return { scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight }
    })
    expect(
      scroll.scrollHeight,
      'the inventory no longer overflows its scroller — re-check which element owns the scroll',
    ).toBeGreaterThan(scroll.clientHeight)
  })
})

// ── U13: the vault-return frames (?vault=stale — the ultramode J3 arm) ────────────────────────
// Every `?seed=` arm above BYPASSES the re-entry gate (a seed mounts straight into the result
// with stalenessNote=false), so before this arm NO gate ever measured (a) the gate surface
// itself or (b) the result frame carrying the extra `.cs-staleness-note` line — the aged-vault
// return is a reachable PRODUCTION frame rendering strictly MORE content than any `?seed` frame,
// exactly where an extra line could push the PROTECTED R13 disclaimer below the fold. The
// `?vault=stale` plant (devSeeds) is the one live drive: it writes the aged vault, strips its own
// param, and lands on the unlock screen with the dev passphrase PRE-FILLED.

test.describe(`the vault return (?vault=stale) — the gate + the staleness-echo frame (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the gate offers its decision pair in-frame with the aged-vault disclosures; the echoed result frame holds the one-frame law', async ({ page }) => {
    await page.goto('/?vault=stale')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the stale plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    // THE GATE FRAME: the balance confirm + the fired clocks render BEFORE any verdict, and
    // the decision pair must sit in the first frame (the gate is the reveal's front door —
    // a below-fold affirm strands the survivor at a dead-looking screen).
    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const affirmBox = await affirm.boundingBox()
    expect(affirmBox, 'the affirm CTA reported no box').not.toBeNull()
    expect(
      affirmBox!.y + affirmBox!.height,
      'the affirm CTA sits below the first frame at the real window',
    ).toBeLessThanOrEqual(REAL.height)
    // The aged vault's own disclosures rendered (the frame under test is not vacuous —
    // insight 029): the plant moves the tax + healthcare stamps → exactly their two lines,
    // and the ~400-day-old savedAt → the one-year elapsed line.
    await expect(page.locator('.reentry-notes p')).toHaveCount(2)
    await expect(page.getByText('You saved this about a year ago.')).toBeVisible()

    // Affirm → the gate releases the held recompute pair; wait out the FINAL tier like every
    // other arm, then settle animations before measuring (the gotoSeedFinal discipline).
    await affirm.click()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({
      timeout: 90_000,
    })
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
    await page.evaluate(() => window.scrollTo(0, 0))

    await assertResolvedSpine(page)
    // The frame under measure IS the echoed one — the standing staleness line is visible
    // (rules moved: tax + healthcare) with the R13 disclaimer still in-frame beside it.
    await expect(page.locator('.cs-staleness-note')).toBeVisible()
    // THE ECHO WHITESPACE BUDGET IS APPLIED, not just survived (insight 075 — the standing
    // encoding of the measured-delta rule; U13 post-fold review advisory 6): the only other
    // guard on the `:has(.cs-staleness-note)` step-down is assertFrameFits GEOMETRY, which a
    // deleted :has() rule can survive on Windows text metrics while red on CI (the exact 075
    // loop). Pin the COMPUTED styles: one token below the ≤840px density tier — row-gap
    // --space-2 (8px) on the two-pane grid, gap --space-1 (4px) on the subordinates.
    const echoGaps = await page
      .locator('.confidence-reveal[data-twopane]')
      .evaluate((reveal) => ({
        rowGap: getComputedStyle(reveal).rowGap,
        // row-gap is the operative axis on the column-flex subordinates (and dodges the
        // gap-shorthand serialization question entirely).
        subordinatesRowGap: getComputedStyle(reveal.querySelector('.reveal__subordinates')!).rowGap,
      }))
    expect(echoGaps.rowGap, 'the staleness-echo frame row-gap must step to --space-2').toBe('8px')
    expect(
      echoGaps.subordinatesRowGap,
      'the staleness-echo subordinates row-gap must step to --space-1',
    ).toBe('4px')
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertResultPadding(page, '32px') // 791 ≤ 840 — the density tier serves this frame too
    await assertFrameFits(page, true)
  })
})
