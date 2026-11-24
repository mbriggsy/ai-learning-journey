import { expect, type BrowserContext, type Page } from '@playwright/test'
import { test, REAL, REAL_DPR, PHONE, PHONE_DPR, FINAL_TIER_MS, settleLayout } from './reviewSurface'
import { FAN, enterSnapshot, hcAudit, hcFloorPx, hcTextFailures, hoverMedian, type HcAudit } from './hcTextAudit'
import { copy } from '../src/ui/copy'

/**
 * THE CHART TEXT GATE'S SURVIVING ARMS (verify:fit; harness `playwright.fit.config.ts`). The hand-rolled HTML label
 * layer this file was built for (the old band, the odds ladder, TwoFutures in a lever sheet, the band's enlarge modal)
 * left with the old answer page at Act 6's RC4 (plan docs/plans/6-rightcapital-ui-plan.md, section 5.2): the ladder's
 * honesty laws were PORTED to the Odds by stop year chart's arms in `e2e/rc-screens.spec.ts` (the crown on the durable
 * year, the dipped year's word, the ceiling words, no passed year on an aged plant, the Highcharts text audit at REAL and
 * the phone); the band's arms come back on Confidence at RC7; the lever-sheet TwoFutures and enlarge-modal arms retired.
 * What stays is the Highcharts fan's: its text follows the reader's browser font, reduced motion changes none of it, and
 * the Highcharts audit's planted-fail controls bite (`e2e/hcTextAudit.ts`).
 */

/** Set the browser's default font to 20px — the reader's-font condition. Per-target emulation, so it
 *  survives navigation: call it BEFORE the first `gotoSeedFinal` and the page solves ONCE at root-20
 *  (a date seed's final tier is ~1 min; two of them in one test blow the 120 s budget). */
async function setRootFont20(page: Page, context: BrowserContext): Promise<void> {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 20 } })
}


// ── the planted-fail controls: each oracle above must be able to go red ────────────────────────

// ── the CROWN oracles bite: the marks, the containment, the seat and the row's reserve ───────────
/* On REAL with `datesplit` — the rung-9 crown, the one seed/arm pair in the catalog that takes the
 * ABOVE seat with real room (19.0px of it). That is the seat where a plant can actually put the
 * words back on the dots, which is the shape his eye ruled on; a control on an arm already in the
 * flow seat would prove nothing about the oracle that matters. (`atceiling` cannot serve here: on
 * this control's own arm, REAL, the ceiling rung misses the above seat by 0.5px; the landscape phone
 * is the one arm that clears it, by 5.5px — see CROWN_SEAT_CEILING.)
 *
 * It then NARROWS THE SAME SOLVED PAGE to 320 — the only place in this suite where the seat is
 * re-decided rather than decided at mount, so the only proof `useCrownSeat`'s ResizeObserver runs —
 * and plants the flow seat's half of the reserve there, one arm and one solve for both. */

// ── the READOUT oracles bite: one control per seat, each `toThrow` bound to its own message ─────
/* The readout's oracles live outside `assertChartText` (it takes two seats and its bound is not the
 * card in either), so they carry their own plants — one per seat, because the failure SHAPES differ:
 * in the plot seat a nowrap line paints past a capped border box; in the flow seat the row is the
 * container and `max-inline-size: 100%` clamps the line's own border box over exactly that overflow,
 * which is why the oracle measures the INK (a Range over the line) and never the line's rect. */


// ── the reader's font: chart text follows the browser default UP, never down ──────────────────
test.describe('chart text — follows the reader’s browser font size', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })

  // Act 6 · RC3 (plan 6, section 5.2): RE-POINTED from the old band to Snapshot's Highcharts fan. Highcharts draws its
  // words at the size the chart CSS sets in rem (`chartTheme.css`, `docs/architecture.md` §12), so a reader's larger
  // browser font must reach the fan's every label: the smallest one grows, and every required label still passes.
  test('at a 20px default the fan’s smallest chart text is LARGER than at 16px, and every required label still passes', async ({ page, context }) => {
    test.setTimeout(2 * FINAL_TIER_MS + 60_000)
    await enterSnapshot(page, 'retired')
    await page.locator(FAN[1]).scrollIntoViewIfNeeded()
    const at16 = await hcAudit(page, ...FAN)
    const live16 = at16.labels.filter((l) => l.text !== '')
    // non-vacuity: `Math.min()` of nothing is Infinity — an empty chart would fail for the wrong reason.
    expect(live16.length, 'no chart text to measure — the reader-font oracle is vacuous').toBeGreaterThan(0)
    const min16 = Math.min(...live16.map((l) => l.minFontPx))
    await setRootFont20(page, context)
    await enterSnapshot(page, 'retired')
    await page.locator(FAN[1]).scrollIntoViewIfNeeded()
    const at20 = await hcAudit(page, ...FAN)
    const live20 = at20.labels.filter((l) => l.text !== '')
    expect(live20.length, 'no chart text to measure at 20px — the reader-font oracle is vacuous').toBeGreaterThan(0)
    const min20 = Math.min(...live20.map((l) => l.minFontPx))
    expect(min20, `the fan's text did not follow the reader's font: ${min16}px @16 → ${min20}px @20`).toBeGreaterThan(min16)
    expect(hcTextFailures(at20, await hcFloorPx(page), FAN_REQUIRED), 'PHONE fan @20px root').toEqual([])
  })

})

// ── reduced motion: the text layer is identical with motion on and off ─────────────────────────
test.describe('chart text — reduced motion changes nothing', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  // Act 6 · RC3: RE-POINTED from the old band to Snapshot's fan (plan 6, section 5.2). The final state is identical with
  // motion on or off (back-nine-design section 3): the 250 ms morph carries no information of its own.
  test('the fan’s text: the same labels, same words, same sizes under prefers-reduced-motion', async ({ page }) => {
    test.setTimeout(2 * FINAL_TIER_MS + 60_000)
    await enterSnapshot(page, 'datemixed')
    const motion = await hcAudit(page, ...FAN)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterSnapshot(page, 'datemixed')
    const reduced = await hcAudit(page, ...FAN)
    const shape = (a: HcAudit) => a.labels.map((l) => `${l.kind}|${l.text}|${l.minFontPx}|${l.visibility}`)
    // non-vacuity + discrimination (insight 029): both sides carry labels, and a one-px change on one side is SEEN.
    expect(shape(motion).length, 'nothing to compare — the reduced-motion oracle is vacuous').toBeGreaterThan(0)
    expect(shape(reduced).length, 'nothing to compare — the reduced-motion oracle is vacuous').toBeGreaterThan(0)
    expect(
      shape({ ...reduced, labels: reduced.labels.map((l, i) => (i === 0 ? { ...l, minFontPx: l.minFontPx + 1 } : l)) }),
      'shape() does not discriminate',
    ).not.toEqual(shape(motion))
    expect(shape(reduced)).toEqual(shape(motion))
  })
})

// ── Act 6 · RC3: the Highcharts text audit's planted-fail controls (a new kind of check) ─────────────────────────────
// `e2e/hcTextAudit.ts` reads a Highcharts chart's SVG words (`docs/architecture.md` §12). Each oracle gets a plant on
// the real fan, and each plant must produce ITS OWN failure line: a band word hidden (the collision handling's
// `visibility`), a band word faded (the inactive state's opacity, decision 7), an axis label pushed out of the chart
// (clipped), and an axis label shrunk under the floor; plus the missing-label oracle. The clean fan passes first, with
// the median hovered too, so every red below is the plant's.
const FAN_REQUIRED = {
  texts: [copy.snapshotFanOuterWords, copy.snapshotFanInnerWords, copy.snapshotFanOuter, copy.snapshotFanInner, copy.snapshotFanMedian],
  counts: { 'data-label': 2, 'legend-item': 3, 'axis-label': 4, 'plot-line-label': 2 },
} as const

test.describe('chart text — the Highcharts audit bites (planted-fail controls)', () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })

  test('a hidden, a faded, a clipped and a shrunk label each produce their own failure; a missing word is named', async ({ page }) => {
    test.setTimeout(FINAL_TIER_MS + 60_000)
    await enterSnapshot(page, 'retired')
    await page.locator(FAN[1]).scrollIntoViewIfNeeded()
    await settleLayout(page)
    const floor = await hcFloorPx(page)
    const clean = await hcAudit(page, ...FAN)
    expect(hcTextFailures(clean, floor, FAN_REQUIRED), 'the clean fan').toEqual([])
    await hoverMedian(page)
    expect(hcTextFailures(await hcAudit(page, ...FAN), floor, FAN_REQUIRED), 'the clean fan, the median hovered').toEqual([])
    await page.mouse.move(0, 0)

    const word = `${FAN[0]} .highcharts-data-label text`
    const yLabel = `${FAN[0]} .highcharts-yaxis-labels text`
    const plant = async (sel: string, prop: string, value: string): Promise<string[]> => {
      await page.locator(sel).first().evaluate((el, [p, v]) => (el as SVGElement).style.setProperty(p!, v!), [prop, value])
      const out = hcTextFailures(await hcAudit(page, ...FAN), floor, FAN_REQUIRED)
      await page.locator(sel).first().evaluate((el, p) => (el as SVGElement).style.removeProperty(p), prop)
      return out
    }
    // Each plant reds with its own oracle's line, and the restore leaves the fan clean again.
    expect((await plant(word, 'visibility', 'hidden')).some((f) => /^hidden: data-label .* is hidden/.test(f)), 'a hidden band word').toBe(true)
    expect((await plant(word, 'opacity', '0.2')).some((f) => /^hidden: data-label .* faded to 0\.20/.test(f)), 'a faded band word').toBe(true)
    expect((await plant(yLabel, 'transform', 'translate(-2000px, 0)')).some((f) => /^clipped: axis-label .* leaves the chart/.test(f)), 'a clipped tick').toBe(true)
    expect((await plant(yLabel, 'font-size', '8px')).some((f) => /^shrunk: axis-label .* renders at 8px/.test(f)), 'a shrunk tick').toBe(true)
    expect(hcTextFailures(await hcAudit(page, ...FAN), floor, FAN_REQUIRED), 'the restored fan').toEqual([])
    expect(
      hcTextFailures(await hcAudit(page, ...FAN), floor, { ...FAN_REQUIRED, texts: [...FAN_REQUIRED.texts, 'A WORD NO CHART PRINTS'] }),
      'a required word that is not printed',
    ).toContain('missing: "A WORD NO CHART PRINTS" is not printed')
  })
})

// ── the ENLARGE modal: the one arm whose collision pass measures a TRANSFORMED frame ─────────────
// The dialog animates scale 0.96 → 1 (src/viz/BandEnlargeModal.tsx) while useCollisionLayout
// measures on layout-effect + ResizeObserver — neither re-fires on a transform, so a row assignment
// computed under the 0.96 frame would never be corrected. REAL only: the affordance is FINE-POINTER
// ONLY (src/viz/ConfidenceBandPanel.tsx — `(pointer: coarse)` hides it), so no touch arm can reach it.
