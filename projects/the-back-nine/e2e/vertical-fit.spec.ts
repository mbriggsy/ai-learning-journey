import { test, expect, type Page } from '@playwright/test'
import { REAL, REAL_DPR, TIER, SHOWCASE, FLOOR, PHONE, gotoSeedFinal } from './reviewSurface'

/**
 * The real-browser VERTICAL-FIT gate (council 2026-07-08, wf_a2d93977-960 — run via
 * `pnpm verify:fit`, harness in playwright.fit.config.ts).
 *
 * THE FRAME CONTRACT it pins (tokens.css `--laptop-fit-height` carries the law):
 *  - A resolved two-pane answer fits ONE laptop frame; the quiet doors (`.result-quiet-row`) are
 *    the sanctioned below-fold casualty, and — on the tallest composite frame only (an all-65+
 *    writable stale return) — the UNPROTECTED backup door (`.result-backup-door`, DOM-ordered
 *    below the disclaimer, 2026-07-10) degrades with them. The verdict, the priced-Medicare
 *    disclosure lines (affirmation + narrowed residual), the band, and the R13 disclaimer are
 *    PROTECTED (the Honesty-Hawk veto: a reassuring verdict in-frame with "this can be wrong"
 *    scrolled out of sight is the calm-but-wrong sin).
 *  - The DATE route scrolls BY DESIGN (both graphs stacked — content-necessary, Briggsy-accepted
 *    2026-07-08); its honesty contract is ORDER: graphs → in-frame disclaimer → doors, doors last.
 *  - TWO disclaimer mounts, exactly ONE visible per tier (laptop = in-frame, <68rem = trailing).
 *  - The short-laptop DENSITY tier (≥68rem ∧ ≤840px) steps `.result` padding-block one token
 *    (40px → 32px, whitespace only); the 917 showcase keeps the generous rhythm.
 *  - The two-pane honesty floor (absorbed from the parked D2d e2e): at 1088px (68rem exactly) the
 *    band's percentile labels — the color-blind reader's honesty channel — must still render
 *    (the ≤260px container query must NOT fire at the tightest in-range pane width).
 *  - The AGED date route (?vault=datestale, council 2026-07-10): the hero's "about N years out"
 *    and the ladder crown's "Stopping in N years" speak ONE clock (pinned structurally — an
 *    engine re-grade may move N, the equality may not), the aged-balances caveat rides the
 *    ladder, and the order contract holds on the aged frame too.
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

// The viewport constants (REAL/TIER/SHOWCASE/FLOOR/PHONE) and the settle recipe live in
// e2e/reviewSurface.ts — the ONE canonical home, shared with the Caddie cold-read walk.

/** The three spine seeds the council named for the frame contract. The priced-Medicare disclosure
 *  lines (`.cs-medicare-note` affirmation + `.cs-medicare-residual`) are per-seed HONEST, not
 *  blanket: they render only for an all-65+ household with NO ACA door (showMedicarePricedNote,
 *  keyed off the run's pricing facts never ages — insight 080) — `retired` (66/65) and `budget`
 *  (68/70) carry them; `health` (61/59, the ACA-priced household) must NOT (it reaches the
 *  Healthcare door, whose sheet carries the residual — one honest home per fact). */
const SPINE_SEEDS = [
  { seed: 'budget', medicareNote: true },
  { seed: 'retired', medicareNote: true },
  { seed: 'health', medicareNote: false },
  // The NC priced face (the state-carrying seed increment): a `retired` (retiredOnTrack) clone in
  // North Carolina. The NC flat-tax drag pushes the state-absent twin's on-track DOWN across the
  // band edge to BORDERLINE — the FIRST borderline in this matrix, so the auto 3-viewport set also
  // proves the borderline two-pane (word + ruin-tail band) holds the one-frame law. Its state clause
  // is OUTCOME-independent (statePricedNote = pricedStateForRun off the built params, never the
  // verdict), so it reads the same affirmation shape as an on-track priced household; the clause
  // TEXT is pinned by the bespoke `?seed=nc` residual arm below (the matrix never reads the words).
  { seed: 'nc', medicareNote: true },
] as const

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
async function frameReport(
  page: Page,
  excludeQuietRow: boolean,
  excludeBackupDoor = false,
): Promise<FrameReport> {
  return page.evaluate(({ excludeQuiet, excludeBackup }) => {
    const vh = window.innerHeight
    const quiet = document.querySelector('.result-quiet-row')
    const backup = document.querySelector('.result-backup-door')
    const offenders: Array<{ desc: string; bottom: number }> = []
    let counted = 0
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (excludeQuiet && quiet !== null && (quiet.contains(el) || el.contains(quiet))) continue
      // The backup door is an UNPROTECTED durability affordance, DOM-ordered BELOW the disclaimer
      // (Result.tsx). On the tallest composite frame (an all-65+ writable stale return) it is a
      // sanctioned below-fold casualty, so its subtree AND its ancestor chain are excluded (an
      // ancestor's bottom is driven by the door it contains — the quiet-row precedent). The
      // PROTECTED disclaimer is a SIBLING <footer>, never an ancestor of the door, so it stays
      // measured — this arm still fails if the caveat itself breaches the fold.
      if (excludeBackup && backup !== null && (backup.contains(el) || el.contains(backup))) continue
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
  }, { excludeQuiet: excludeQuietRow, excludeBackup: excludeBackupDoor })
}

/** A resolved two-pane answer renders hundreds of elements; a walk that counted fewer than this
 *  measured a broken page, not the frame. */
const WALK_FLOOR = 60

async function assertFrameFits(
  page: Page,
  excludeQuietRow: boolean,
  excludeBackupDoor = false,
): Promise<void> {
  const report = await frameReport(page, excludeQuietRow, excludeBackupDoor)
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
  // The priced-Medicare disclosure is TWO lines that ship together (hard constraint 2): the
  // affirmation (.cs-medicare-note) + the narrowed residual (.cs-medicare-residual).
  const affirm = page.locator('.cs-medicare-note')
  const residual = page.locator('.cs-medicare-residual')
  if (expected) {
    await expect(affirm, 'the priced-Medicare affirmation must render').toBeVisible()
    await expect(residual, 'the narrowed residual must render WITH the affirmation').toBeVisible()
  } else {
    await expect(affirm, 'a door household carries no hero-level Medicare lines').toHaveCount(0)
    await expect(residual, 'a door household carries no hero-level Medicare lines').toHaveCount(0)
  }
}

async function assertMedicareSnugLeading(page: Page): Promise<void> {
  // The Linux wrap-drift reservoir (CI 2026-07-11, run 29170580301): the pair pays for the
  // magnitude-honest residual in LEADING (body 1.55 → snug 1.4) — a platform-independent
  // delta pinned here by computed style, so deleting the rule goes red on EVERY platform
  // (insight 075's standing encoding), never only under ubuntu's taller text metrics.
  // ROUND 5: the ON-TYPICAL frames (the appended bi-directional typical sentence — the
  // modifier class) step one further to --leading-tight (~1.3); entered/mixed frames keep
  // snug. Branch on the modifier so BOTH regimes stay pinned.
  const { ratio, typical } = await page.locator('.cs-medicare-residual').evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      ratio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
      typical: el.classList.contains('cs-medicare-residual--typical'),
    }
  })
  if (typical) {
    expect(ratio, 'the ON-TYPICAL pair rides --leading-tight (~1.3) — round 5').toBeGreaterThan(1.25)
    expect(ratio, 'the ON-TYPICAL pair rides --leading-tight (~1.3) — round 5').toBeLessThan(1.35)
  } else {
    expect(ratio, 'the medicare pair rides --leading-snug (~1.4)').toBeGreaterThan(1.35)
    expect(ratio, 'the medicare pair rides --leading-snug (~1.4)').toBeLessThan(1.45)
  }
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
        if (medicareNote) await assertMedicareSnugLeading(page)
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

// ── U16 §S2: the recommend-second INVITED AFFORDANCE — measured posture ───────────────────────
// The affordance (`.result-recommend-invite`) joins the doors DOM region as the FIRST quiet-row door
// (so it degrades below-fold LAST among the doors). Its fit posture is MEASURED, not decreed
// (the advocate's ratified priority): (1) spine content protected in-frame > (2) affordance in-frame
// > (3) affordance a doors casualty. Because it lives INSIDE `.result-quiet-row` — the sanctioned
// below-fold exclusion — spine content is STRUCTURALLY protected (posture 1) whatever the affordance's
// own posture; this arm proves that invariant AND records where the affordance itself lands at each
// walk tier. (The DATE-route "doors last" order contract needs no new arm: the affordance is a
// quiet-row child, so the existing dip/datenc order checks — which exclude the quiet-row subtree —
// already cover it.) The affordance is inert-on-click until §S3 wires the intakeMap solve builder into
// appModel; its PRESENCE + posture (what this arm measures) needs no builder.

const AFFORDANCE_SEEDS = ['retired', 'nc'] as const

for (const seed of AFFORDANCE_SEEDS) {
  for (const vp of [REAL, TIER] as const) {
    const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
    test.describe(`?seed=${seed} — the recommend-second affordance posture (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: vp, ...scale })
      test(`${seed}: the affordance is the FIRST quiet-row door; spine content stays frame-protected`, async ({
        page,
      }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        // Offered, rendered STATICALLY (no badge/pulse/scroll-entrance — R11), and it is the FIRST
        // door (degrades below-fold LAST among the doors).
        const affordance = page.locator('.result-recommend-invite')
        await expect(affordance, 'the recommend-second affordance must be offered').toBeVisible()
        await expect(
          page.locator('.result-quiet-row > button').first(),
          'the affordance is the first quiet-row door (degrades last)',
        ).toHaveClass(/result-recommend-invite/)
        // POSTURE (1) — spine content protected: the frame fits with the quiet row (the affordance's
        // home) excluded. The affordance itself MAY be a below-fold doors casualty; the spine cannot.
        await assertFrameFits(page, true)
        // Record the measured posture (in-frame vs below-fold) — the spec's measured-not-decreed law.
        const box = await affordance.boundingBox()
        expect(box, 'the affordance reported no box').not.toBeNull()
        const bottom = Math.round(box!.y + box!.height)
        const inFrame = bottom <= vp.height + 0.5
        console.log(
          `[U16 affordance posture] seed=${seed} ${vp.width}x${vp.height}: bottom=${bottom} viewport=${vp.height} → ${inFrame ? 'IN-FRAME (posture 2)' : 'below-fold doors casualty (posture 3)'}`,
        )
      })
    })
  }
}

// ── U16 §S2/§S3: the recommend-second PENDING frame + the recorded S2→S3 CLS alignment ─────────
// THE LIVE DISPATCH SEAM (the recorded blocker, now closed by this fleet): a real GoalPicker pick
// drives the affordance → GoalPicker → the SOLVE, so the pending tell renders — `idle` no longer
// dead-ends. This arm PROVES the organic dispatch fires (the whole point of the fleet) and pins the
// S2→S3 CLS seam.
//
// WHY THE COMMITTED / HELD RENDERS ARE NOT MEASURED HERE (recorded, 2026-07-22): a live solve on the
// DEV server runs FULL PRECISION (16k paths through the mint's oracle gate + search + grade) — MEASURED
// on this reference machine at 80s (nc → held, which short-circuits at the mint) to 200s+ (surplus →
// recommended), FAR past this harness's 120s per-test budget. The fit gate is architected for the fast
// SPINE tier (`data-answer-tier="final"`, seconds), NOT the solve channel (there is no live path-count
// seam — S5 deferred, wall #2 fixes every displayed figure at `solverMinBPaths`). So the committed /
// held OUTCOMES are engine-proven where they are tractable — solveDispatch.test.ts drives the REAL
// builder → REAL engine at the fast test counts (nc → token-withheld{state-cert}, fl → recommended) —
// and their RENDER SHAPES in RecommendationSurface.test.tsx; this real-browser arm owns the two facts
// only Chromium can settle: the pending tell's live presence, and the CLS alignment of the reserved
// well to the real committed grade lockup.
//
// THE CLS ALIGNMENT (measured, no solve): the committed `.rec-grade` lockup is injected into the live
// `.recommendation-surface` (real CSS, real fonts, real wrap at the `--measure` reading width) and
// measured — the pending placeholder's reserved well must ALIGN to it (`.solve-pending-panel`
// min-height 7rem ≈ the ~110px lockup, MEASURED here 2026-07-22), so the committed beat lands in place,
// not shoved (the recorded S2→S3 CLS seam). The grade WORD holds ONE line (the CLS law). Planted-mutant
// killer (b): dropping the pending well's min-height collapses it below the lockup and the committed
// beat jumps on land — the `panelWell ≥ lockup` band goes RED.

/** Reach the pending tell organically: affordance → GoalPicker → confirm the goal → the solve
 *  dispatches (the store sets `pending` synchronously before awaiting the worker). */
async function dispatchToPending(page: Page): Promise<void> {
  await page.locator('.result-recommend-invite').click()
  await expect(page.getByRole('dialog'), 'the GoalPicker must open before the solve').toBeVisible()
  await page.locator('input[name="recommendation-goal"][value="leave-more"]').check()
  await page.getByRole('dialog').getByRole('button', { name: 'See the strategy' }).click()
}

const PENDING_SEEDS = ['surplus', 'nc'] as const

for (const seed of PENDING_SEEDS) {
  for (const vp of [REAL, TIER] as const) {
    const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
    test.describe(`?seed=${seed} — the recommend-second pending frame + CLS alignment (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: vp, ...scale })
      test(`${seed}: the goal pick drives the pending tell; its well aligns to the committed grade lockup`, async ({
        page,
      }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page) // the spine stands before the pick

        await dispatchToPending(page)

        // THE PENDING TELL renders — the dispatch fired (idle no longer dead-ends). One recognizable
        // working tell: the `.solve-pending` label under `aria-busy`, placeholder-SHAPED (not a spinner).
        const panel = page.locator('.solve-pending-panel')
        await expect(panel, 'the pending tell must render — the live dispatch fired').toBeVisible()
        await expect(panel).toHaveAttribute('aria-busy', /.*/)
        await expect(page.locator('.solve-pending')).toBeVisible()

        // The spine is UNPERTURBED by the pick (posture 1 — spine content protected): the two-pane
        // verdict + band still stand (the solve is a SEPARATE channel; it never touches the first beat).
        await assertResolvedSpine(page)

        // The thinking-breathe (the ONE working-tell family) runs on the label — an INFINITE
        // opacity animation (base.css), unless reduced motion drops it (then the label alone stands).
        const motion = await page.evaluate(() => {
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const label = document.querySelector('.solve-pending')
          const anims = label
            ? label.getAnimations().map((a) => ({
                name: (a as CSSAnimation).animationName,
                infinite: a.effect?.getTiming().iterations === Infinity,
                running: a.playState === 'running',
              }))
            : []
          return { reduce, anims }
        })
        if (!motion.reduce) {
          expect(
            motion.anims.some((a) => a.name === 'thinking-breathe' && a.infinite && a.running),
            'the pending tell must carry the shared infinite thinking-breathe (not a second working tell)',
          ).toBe(true)
        }

        // THE S2→S3 CLS ALIGNMENT: inject the real committed grade lockup (no solve — a live solve is
        // 80–200s+, past this harness's budget), measure it under the real CSS at this tier, and pin
        // that the pending well ALIGNS to it and the grade word holds ONE line.
        const cls = await page.locator('.recommendation-surface').evaluate((surface) => {
          const panelEl = document.querySelector('.solve-pending-panel') as HTMLElement | null
          const panelWell = panelEl ? panelEl.getBoundingClientRect().height : 0
          const el = document.createElement('div')
          el.className = 'rec-committed'
          // The real RecommendedBeat grade-lockup DOM (the no-note core the pending well aligns to):
          // the glyph+word head + the two-line delta-as-hero comparative.
          el.innerHTML =
            '<div class="rec-grade" role="group">' +
            '<p class="rec-grade__head"><svg class="rec-grade__glyph" width="22" height="22" viewBox="0 0 22 22"></svg>' +
            '<span class="rec-grade__word">A confident lean</span></p>' +
            '<p class="rec-grade__hero">This keeps about $128,000 more for the two of you to pass on than staying on your current plan.</p>' +
            '</div>'
          surface.appendChild(el)
          const word = el.querySelector('.rec-grade__word') as HTMLElement
          const wordLineHeight = parseFloat(getComputedStyle(word).lineHeight)
          const lockup = Math.round((el.querySelector('.rec-grade') as HTMLElement).getBoundingClientRect().height)
          const wordOneLine = word.getBoundingClientRect().height <= wordLineHeight * 1.4
          el.remove()
          return { panelWell: Math.round(panelWell), lockup, wordOneLine }
        })

        // The grade word (the longest confident/coin-flip word) holds ONE line at this laptop tier — the
        // CLS law (the lockup never wraps the word beside its glyph).
        expect(cls.wordOneLine, 'the grade word must hold one line at this tier (the CLS law)').toBe(true)

        // ALIGNMENT (mutant killer b): the reserved pending well is at least the committed grade
        // lockup's height, so the committed beat lands in place. Dropping the min-height collapses the
        // well to the bare label and the committed lockup jumps on land — this lower bound goes RED.
        expect(
          cls.panelWell,
          `the pending well (${cls.panelWell}px) collapsed below the committed grade lockup (${cls.lockup}px) — the committed beat would jump on land (CLS)`,
        ).toBeGreaterThanOrEqual(cls.lockup - 8)
        // …and not grossly OVER-reserved (a large empty well breathing over the ~72s solve).
        expect(
          cls.panelWell,
          `the pending well (${cls.panelWell}px) over-reserves vs the committed lockup (${cls.lockup}px)`,
        ).toBeLessThanOrEqual(cls.lockup + 44)

        // POSTURE (measured, not decreed — the S2 law): record where the pending well lands at this tier
        // (in-frame vs a below-fold doors-region casualty), like the affordance-posture arm.
        const posture = await panel.evaluate((el) => {
          const b = el.getBoundingClientRect()
          return { bottom: Math.round(b.bottom), inFrame: b.bottom <= window.innerHeight + 0.5 }
        })
        console.log(
          `[U16 pending posture] seed=${seed} ${vp.width}x${vp.height}: well=${cls.panelWell}px lockup=${cls.lockup}px bottom=${posture.bottom} → ${posture.inFrame ? 'IN-FRAME' : 'below-fold (doors-region casualty)'}`,
        )
      })
    })
  }
}

// ── U16 F-A: the recommend-second surface fills the right rail (the dead-rail fix) ────────────
// THE DEAD RAIL (refuter-confirmed): the committed recommend-second beat rendered in a 576px LEFT
// rail beside ~950px of blank right pane — the spine band ends ~615px, and the whole rail below it
// was dead while the tall committed beat stacked down the left. The fix seats the surface as a
// FULL-WIDTH row BELOW the two panes (confidence.css, keyed on the surface carrying a beat so the
// IDLE frame stays byte-identical — the matrix arms above prove that), and the committed viz
// continues the band down into that rail at the SAME x + width.
//
// Like the CLS arm above, a LIVE committed solve is 80–200s+ (past this harness's budget), so this
// INJECTS the real committed DOM (grade lockup + the fixed-dimension viz box + the text rest) into
// the live `.recommendation-surface` — the viz box's PRESENCE is exactly what the shipped CSS keys
// the inner two-pane on (`.rec-committed:has(> .rec-viz-box)`) — and measures where the real CSS
// seats it. Two seeds: `retired` (tall verdict column) and `health` (SHORT verdict column, where a
// naive full-width span at the slack row would paint the viz OVER the band — the collision this
// placement structurally avoids). Planted-mutant killers: reverting the surface span
// (`.recommendation-surface` back to `grid-column: 1`) reds assertion (1); reverting the inner
// two-pane (`.rec-committed` back to the --measure single column) reds assertion (3).
const DEAD_RAIL_SEEDS = ['retired', 'health'] as const

for (const seed of DEAD_RAIL_SEEDS) {
  for (const vp of [REAL, TIER] as const) {
    const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
    test.describe(`?seed=${seed} — the recommend-second surface fills the right rail (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: vp, ...scale })
      test(`${seed}: the committed beat spans full width with the viz seated under the band, never over it`, async ({
        page,
      }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        const geom = await page.locator('.recommendation-surface').evaluate((surface) => {
          // The real committed DOM (RecommendationSurface.tsx → RecommendedBeat): the grade lockup,
          // the fixed-dimension viz box (its placeholder holds the RV_VIEW aspect), and the text
          // rest wrapper. Injected (no live solve — 80–200s+) exactly as the CLS arm injects its
          // grade lockup; the viz box's presence triggers the inner two-pane.
          const el = document.createElement('section')
          el.className = 'rec-committed'
          el.innerHTML =
            '<div class="rec-grade" role="group"><p class="rec-grade__head">' +
            '<svg class="rec-grade__glyph" width="22" height="22" viewBox="0 0 22 22"></svg>' +
            '<span class="rec-grade__word">A confident lean</span></p>' +
            '<p class="rec-grade__hero">This keeps about $128,000 more for the two of you to pass on than staying on your current plan.</p></div>' +
            '<div class="rec-viz-box"><div class="rec-viz-box__placeholder" aria-hidden="true"></div></div>' +
            '<div class="rec-committed__rest"><p class="rec-baseline">Compared with keeping your current plan</p>' +
            '<p class="rec-limits">Validate big, irreversible moves with a professional.</p></div>'
          surface.appendChild(el)
          const rect = (node: Element | null) => {
            if (node === null) return null
            const r = node.getBoundingClientRect()
            return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }
          }
          const out = {
            surface: rect(surface)!,
            viz: rect(el.querySelector('.rec-viz-box'))!,
            grade: rect(el.querySelector('.rec-grade'))!,
            band: rect(document.querySelector('.cs-band'))!,
            reveal: rect(document.querySelector('.confidence-reveal[data-twopane]'))!,
          }
          el.remove()
          return out
        })
        // (1) FULL-WIDTH — the surface LEAVES the left column: its right edge reaches the reveal's
        // right edge (not the ~576px left rail). MUTANT (revert the span → grid-column: 1): the
        // right edge pins back at the left column (~784px) and this goes RED.
        expect(
          geom.surface.right,
          `the committed surface stayed in the left rail (right=${geom.surface.right}, reveal right=${geom.reveal.right}) — the dead rail is back`,
        ).toBeGreaterThanOrEqual(geom.reveal.right - 2)
        // (2) the grade lockup stays at the comfortable reading measure (never stretched wall-wide).
        expect(
          geom.grade.width,
          `the grade lockup stretched past the reading measure (width=${geom.grade.width})`,
        ).toBeLessThanOrEqual(600)
        // (3) RIGHT RAIL — the viz seats in the right pane, aligned with the band's own left edge (its
        // vertical continuation). MUTANT (revert the inner two-pane): the viz collapses into the left
        // column (~208px) and this goes RED.
        expect(
          geom.viz.left,
          `the viz did not reach the right rail (viz left=${geom.viz.left}, band left=${geom.band.left}) — the right pane is still dead below the fan`,
        ).toBeGreaterThanOrEqual(geom.band.left - 4)
        expect(geom.viz.width, `the viz has no breathing width in the rail (width=${geom.viz.width})`).toBeGreaterThan(300)
        // (4) NO COLLISION — the viz seats BELOW the band's render bottom, never painted over the fan
        // (the short-`health` verdict column is the structural test: its slack row ends exactly at the
        // band bottom, so the full-width row below it clears the fan).
        expect(
          geom.viz.top,
          `the viz overlaps the band (viz top=${geom.viz.top}, band bottom=${geom.band.bottom}) — the recommendation paints over the fan`,
        ).toBeGreaterThanOrEqual(geom.band.bottom - 1)
      })
    })
  }
}

// ── the priced-state faces (the state-tax unit / the state-carrying seed increment) ───────────
// Each priced seed is a retiredOnTrack clone carrying ONE `retirementState`, so the all-65+
// medicarePricedNote block renders with the household's state clause SWAPPED into the narrowed
// residual (composeVerdictMedicareResidual, stateTaxDisclosure.ts). The SPINE matrix above already
// pins nc's FRAME across three viewports; these bespoke arms add what the matrix never reads — the
// rendered residual TEXT — and carry pa/fl at BOTH laptop tiers (pa is the LONGEST clause variant,
// the wrap-risk arm). All are non-typical (retiredOnTrack's mixed-provenance extras — one entered,
// one MA-$0), so the residual rides --leading-snug, asserted where the house asserts it (REAL).

/** The priced-state spine face: pin the one-frame law PLUS the rendered state clause the matrix
 *  never reads. `snug` only on the REAL medicare-note frame (the house asserts leading there). */
async function assertPricedSpineFrame(
  page: Page,
  seed: string,
  clausePins: readonly string[],
  opts: { readonly snug: boolean },
): Promise<void> {
  await gotoSeedFinal(page, seed)
  await assertResolvedSpine(page)
  await assertMedicareNote(page, true)
  if (opts.snug) await assertMedicareSnugLeading(page)
  await assertOneVisibleDisclaimer(page, 'laptop')
  await assertResultPadding(page, '32px') // both laptop tiers (791, 800) ≤ 840 — the density tier
  for (const pin of clausePins) {
    await expect(
      page.locator('.cs-medicare-residual'),
      `the narrowed residual must carry the state clause: "${pin}"`,
    ).toContainText(pin)
  }
  await assertFrameFits(page, true)
}

// nc: the residual-TEXT pin at the REAL tier (the matrix proves the frame; this proves the clause
// survives all the way onto the BORDERLINE hero — the exact insight-033 question this increment
// exists to answer: the affirm+residual set is outcome-scoped in copy but outcome-INDEPENDENT in
// gating, so a band-crossing verdict still names the state).
test.describe(`?seed=nc — the NC state clause on the borderline priced residual (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the borderline hero still names North Carolina; the unpriced monolith clause is gone', async ({ page }) => {
    await gotoSeedFinal(page, 'nc')
    await assertResolvedSpine(page)
    await assertMedicareNote(page, true)
    const residual = page.locator('.cs-medicare-residual')
    await expect(residual, 'the NC affirmation must swap into the residual').toContainText(
      'Your North Carolina state income tax is reflected in these numbers',
    )
    // The unpriced monolith's distinctive aside DIES for a priced household (the swap, not an append).
    await expect(residual, 'the unpriced clause must not survive on a priced household').not.toContainText(
      'a real yearly bill',
    )
  })
})

test.describe('?seed=pa — the LONGEST priced clause (the wrap-risk arm) + one-frame fit', () => {
  // Pennsylvania exempts most retirement income, so the clause carries the extra "usually a small
  // piece …" qualifier — the longest state variant, where a wrap would breach the fold first.
  const PA_PINS = ['Pennsylvania', 'Pennsylvania leaves most retirement income untaxed'] as const
  test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
    test('pa: everything but the doors fits; the residual names Pennsylvania (untaxed)', async ({ page }) => {
      await assertPricedSpineFrame(page, 'pa', PA_PINS, { snug: true })
    })
  })
  test.describe(`at the fit-law tier floor (${TIER.width}×${TIER.height})`, () => {
    test.use({ viewport: TIER })
    test('pa: everything but the doors fits; the residual names Pennsylvania (untaxed)', async ({ page }) => {
      await assertPricedSpineFrame(page, 'pa', PA_PINS, { snug: false })
    })
  })
})

test.describe('?seed=fl — the constitutional-$0 priced clause + one-frame fit', () => {
  const FL_PINS = ['Florida has no state income tax'] as const
  test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
    test('fl: everything but the doors fits; the residual names the Florida $0 fact', async ({ page }) => {
      await assertPricedSpineFrame(page, 'fl', FL_PINS, { snug: true })
    })
  })
  test.describe(`at the fit-law tier floor (${TIER.width}×${TIER.height})`, () => {
    test.use({ viewport: TIER })
    test('fl: everything but the doors fits; the residual names the Florida $0 fact', async ({ page }) => {
      await assertPricedSpineFrame(page, 'fl', FL_PINS, { snug: false })
    })
  })
})

// elsewhere: the ANSWERED-but-unpriced face (the cards' noted coverage gap — 'elsewhere' is an
// explicit roster member, NOT in PRICED_STATES, so the run reduces byte-identically to the
// state-absent twin and the residual reads the shipped monolith VERBATIM, no state named).
test.describe(`?seed=elsewhere — the answered-but-unpriced monolith, no state clause (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the residual reads the shipped monolith with NO built state affirmation', async ({ page }) => {
    await gotoSeedFinal(page, 'elsewhere')
    await assertResolvedSpine(page)
    await assertMedicareNote(page, true)
    const residual = page.locator('.cs-medicare-residual')
    // The monolith's distinctive state SENTENCE — the unpriced words a priced household drops.
    await expect(residual, 'the unpriced monolith clause must render verbatim').toContainText(
      'a real yearly bill',
    )
    // No BUILT state affirmation leaks onto the unpriced household (roster membership, not truthiness).
    await expect(residual, 'no NC affirmation on an unpriced household').not.toContainText('North Carolina')
    await expect(residual, 'no PA affirmation on an unpriced household').not.toContainText('Pennsylvania')
    await expect(residual, 'no FL affirmation on an unpriced household').not.toContainText('Florida')
    await assertFrameFits(page, true)
  })
})

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

// ── the all-65+ still-working date route (?seed=date65): priced Medicare, no false "unpriced" ──
// The insight-080 fix, live on the date route: dateSearch.ts:222 forces healthcareEnabled true on
// every candidate, so a still-working all-65+ household PRICES Medicare even with no ACA door. The
// retired age-predicate called this exact household "Medicare not priced" over numbers Medicare had
// already moved; the surface now names it PRICED (affirmation + narrowed residual, shipped together)
// and never a false unpriced claim. The date route scrolls by design, so this arm pins the ORDER
// contract plus the priced-in naming, never a full one-frame fit.

test.describe(`?seed=date65 — priced Medicare on the date route, no false "unpriced" note (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the date surface names Medicare priced (affirmation + residual) and holds graphs → disclaimer → doors', async ({ page }) => {
    await gotoSeedFinal(page, 'date65')
    // Presence companions (insight 029): the date hero two-pane stamped, BOTH graphs drawn, doors offered.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    await expect(page.locator('.fod-band')).toBeVisible()
    await expect(page.locator('.fod-ladder')).toBeVisible()
    expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
    await assertOneVisibleDisclaimer(page, 'laptop')

    // Medicare is named PRICED, never falsely "unpriced" — the affirmation and the narrowed residual
    // both render on the date surface (distinctive substrings of verdictMedicarePriced / Residual).
    await expect(
      page.getByText('are already in these numbers'),
      'the priced-Medicare affirmation must render on the date route',
    ).toBeVisible()
    await expect(
      page.getByText('could run higher than shown'),
      'the narrowed residual must ship WITH the affirmation',
    ).toBeVisible()

    // ORDER (the date route's honesty contract): graphs → in-frame disclaimer → doors, doors last.
    const box = async (selector: string) => {
      const b = await page.locator(selector).boundingBox()
      expect(b, `${selector} must render with a real box`).not.toBeNull()
      return b as NonNullable<typeof b>
    }
    const graphs = await box('.fod-graphs')
    const disclaimer = await box('footer.disclaimer.disclaimer--in-frame')
    const doors = await box('.result-quiet-row')
    expect(disclaimer.y, 'the R13 disclaimer must sit BELOW both graphs').toBeGreaterThanOrEqual(
      graphs.y + graphs.height - 0.5,
    )
    expect(doors.y, 'the quiet doors must sit BELOW the R13 disclaimer').toBeGreaterThanOrEqual(
      disclaimer.y + disclaimer.height - 0.5,
    )
  })
})

// ── the date-route NC witness (?seed=datenc — the second producer, insight 080) ───────────────
// datenc = stillWorkingAllMedicare (the date65 shape) in North Carolina. The date route rides its
// OWN state producer (dateStatePriced, off buildDateInput's overlay — NOT the spine's), so a
// roster-gate regression on the date route surfaces HERE. Same honesty contract as date65: the
// route scrolls by design, so this arm pins the NC clause on the residual + the ORDER contract
// (graphs → in-frame disclaimer → doors LAST, the dip block's stronger check), never a full fit.

test.describe(`?seed=datenc — the NC clause on the date residual + the order contract (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the date hero names North Carolina; graphs → in-frame disclaimer → doors last', async ({ page }) => {
    await gotoSeedFinal(page, 'datenc')
    // Presence companions (insight 029): the date hero two-pane stamped, BOTH graphs drawn, doors offered.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    await expect(page.locator('.fod-band')).toBeVisible()
    await expect(page.locator('.fod-ladder')).toBeVisible()
    expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
    await assertOneVisibleDisclaimer(page, 'laptop')

    // The NC affirmation rides the date residual (the .fod-note render block; the second producer's
    // live witness — a date-route roster regression would drop or mis-name this clause).
    await expect(
      page.getByText('Your North Carolina state income tax is reflected in these numbers'),
      'the NC state clause must render on the date residual',
    ).toBeVisible()

    // ORDER (the date route's honesty contract): graphs → in-frame disclaimer → doors, doors last.
    const box = async (selector: string) => {
      const b = await page.locator(selector).boundingBox()
      expect(b, `${selector} must render with a real box`).not.toBeNull()
      return b as NonNullable<typeof b>
    }
    const graphs = await box('.fod-graphs')
    const disclaimer = await box('footer.disclaimer.disclaimer--in-frame')
    const doors = await box('.result-quiet-row')
    expect(disclaimer.y, 'the R13 disclaimer must sit BELOW both graphs').toBeGreaterThanOrEqual(
      graphs.y + graphs.height - 0.5,
    )
    expect(doors.y, 'the quiet doors must sit BELOW the R13 disclaimer').toBeGreaterThanOrEqual(
      disclaimer.y + disclaimer.height - 0.5,
    )

    // Doors LAST (the dip block's stronger check): no content element ends below the doors row.
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
    // insight 029): the plant moves the tax + healthcare stamps + the blend snapshot →
    // exactly their three lines, and the ~760-day-old savedAt → the two-year elapsed line
    // (coherent with the seed's -2 startCalendarYear — a real save mints both together).
    // (The blend line is named, not just counted: an all-retired household must get the
    // route-true spine wording, never stalenessDate's "behind your date".)
    await expect(page.locator('.reentry-notes p')).toHaveCount(3)
    await expect(page.getByText('The fund data we read your accounts against')).toBeVisible()
    await expect(page.getByText('You saved this about 2 years ago.')).toBeVisible()

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
    // loop). Pin the COMPUTED styles: two tokens below the ≤840px density tier since the
    // 2026-07-11 round-3 reservoir step — row-gap --space-1 (4px) on the two-pane grid,
    // gap --space-1 (4px) on the subordinates.
    const echoGaps = await page
      .locator('.confidence-reveal[data-twopane]')
      .evaluate((reveal) => ({
        rowGap: getComputedStyle(reveal).rowGap,
        // row-gap is the operative axis on the column-flex subordinates (and dodges the
        // gap-shorthand serialization question entirely).
        subordinatesRowGap: getComputedStyle(reveal.querySelector('.reveal__subordinates')!).rowGap,
      }))
    // ROUND 5: the stale vault is an ON-TYPICAL frame (doctorStaleVault strips the fork —
    // the recompute funds typical-both), so its chain gaps ride the 2px typical tier.
    expect(echoGaps.rowGap, 'the ON-TYPICAL note-frame row-gap steps to 2px (round 5)').toBe('2px')
    expect(
      echoGaps.subordinatesRowGap,
      'the ON-TYPICAL subordinates row-gap steps to 2px (round 5)',
    ).toBe('2px')
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertResultPadding(page, '32px') // 791 ≤ 840 — the density tier serves this frame too

    // THE FOLD-PRIORITY FIX (the Medicare-pricing unit, 2026-07-10 — the pulled-forward TODO-7 /
    // Caddie-#3 inversion): this all-65+ writable stale return is the tallest composite frame —
    // it carries the priced-Medicare pair AND the staleness echo AND the backup door together.
    // Prove the frame is NOT vacuous (the priced-Medicare affirmation renders) and that the
    // UNPROTECTED backup door is DOM- + visually BELOW the PROTECTED disclaimer, so any overflow
    // sacrifices the door before the caveat (the Hawk's veto).
    await expect(page.locator('.cs-medicare-note')).toBeVisible()
    const foldOrder = await page.evaluate(() => {
      const disc = document.querySelector('footer.disclaimer.disclaimer--in-frame')
      const door = document.querySelector('.result-backup-door')
      if (disc === null || door === null) return null
      return { discBottom: disc.getBoundingClientRect().bottom, doorTop: door.getBoundingClientRect().top }
    })
    expect(foldOrder, 'the disclaimer and the backup door must both render on this frame').not.toBeNull()
    expect(
      foldOrder!.doorTop,
      'the backup door must sit BELOW the R13 disclaimer (the caveat wins the fold)',
    ).toBeGreaterThanOrEqual(foldOrder!.discBottom - 0.5)

    // The backup door is the sanctioned below-fold casualty on THIS composite frame (decision (b) —
    // it stays measured on every other arm; here it may degrade past the fold). The disclaimer is a
    // sibling <footer>, so it stays measured — the arm still fails if the caveat itself breaches.
    await assertFrameFits(page, true, true)
  })
})

// ── the state-tax staleness return (?vault=statestale — the state-carrying seed increment) ────
// The state-tax analog of ?vault=stale, on the LIGHT doctor (F2 supersession, 2026-07-15): the
// NC-priced spine household saved ~150d ago with startCalendarYear UNTOUCHED (2026) and the tax /
// healthcare / blend stamps FRESH — ONLY the state profile diverged. So the re-entry gate fires
// the stalenessStateTax clock in ISOLATION (an NC rate step must never read as a federal /
// healthcare / blend change), and — unlike the full doctor that stranded a 2024 anchor below
// simulate.ts's priced-state lower bound (R19 calm indeterminate) — the affirm recompute resolves
// a REAL borderline verdict whose residual names North Carolina. This is the only live route to
// the stalenessStateTax note AND to the state clause on a writable stale return.

test.describe(`the state-tax staleness return (?vault=statestale) — the isolated clock + the NC-clause echo frame (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the gate fires the state-tax clock in isolation, decision pair in-frame; the echoed borderline hero names NC and holds the one-frame law', async ({ page }) => {
    await page.goto('/?vault=statestale')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the statestale plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    // THE GATE FRAME: the decision pair sits in the first frame (a below-fold affirm strands the
    // survivor at a dead-looking screen).
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

    // THE ISOLATION (the light doctor's design): EXACTLY ONE reentry note fires — the state-tax
    // clock — with the sibling clocks (federal tax / healthcare / blend) quiet. The count is the
    // airtight isolation proof (the federal-tax note's wording is a case-insensitive substring of
    // the state note, so isolation is asserted by count, not by a fragile federal-tax negative).
    const notes = page.locator('.reentry-notes p')
    await expect(notes, 'the state-tax clock fires in ISOLATION — exactly one reentry note').toHaveCount(1)
    await expect(notes, 'the one fired note is the state-tax clock, by name').toContainText(
      'State tax rules have been updated since your save',
    )
    // The two distinctively-worded sibling clocks are demonstrably dark (belt-and-suspenders on the
    // count): healthcare + blend never fire on a stamps-fresh save.
    await expect(
      page.getByText('Health-coverage rules have been updated'),
      'the healthcare clock must be dark (stamp fresh)',
    ).toHaveCount(0)
    await expect(
      page.getByText('The fund data we read your accounts against'),
      'the blend clock must be dark (stamp fresh)',
    ).toHaveCount(0)
    // At ~150d elapsed no "You saved this … ago" line renders (O6 floor-rounding — verified live),
    // so none is pinned; the isolated state note is the whole gate disclosure.

    // Affirm → the held recompute pair; wait the FINAL tier, then settle (the gotoSeedFinal discipline).
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
    // The echoed frame carries the standing staleness line AND — the state-tax unit's whole point —
    // the priced residual names North Carolina on the writable stale return, not only on fresh ?seed=nc.
    await expect(page.locator('.cs-staleness-note')).toBeVisible()
    await expect(
      page.locator('.cs-medicare-residual'),
      'the NC state clause must ride the echoed borderline hero',
    ).toContainText('Your North Carolina state income tax is reflected in these numbers')

    // THE ECHO WHITESPACE BUDGET (insight 075) — pinned by COMPUTED style so a deleted
    // `:has(.cs-staleness-note)` rule goes red on EVERY platform, never only under CI's taller
    // metrics. UNLIKE ?vault=stale (on-typical — the full doctor strips the extras fork, so its
    // gaps step to the 2px round-5 tier): the LIGHT doctor KEEPS the base's mixed-provenance
    // extras, so statestale is a NON-typical staleness-echo frame — the round-3 --space-1 (4px) tier.
    const echoGaps = await page
      .locator('.confidence-reveal[data-twopane]')
      .evaluate((reveal) => ({
        rowGap: getComputedStyle(reveal).rowGap,
        subordinatesRowGap: getComputedStyle(reveal.querySelector('.reveal__subordinates')!).rowGap,
      }))
    expect(echoGaps.rowGap, 'the NON-typical note-frame row-gap rides --space-1 (4px, round 3)').toBe('4px')
    expect(
      echoGaps.subordinatesRowGap,
      'the NON-typical subordinates row-gap rides --space-1 (4px, round 3)',
    ).toBe('4px')
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertResultPadding(page, '32px') // 791 ≤ 840 — the density tier serves this frame too

    // The all-65+ writable stale return is a tall composite (priced-Medicare pair + staleness echo +
    // backup door). Prove non-vacuous (the priced-Medicare affirmation renders) and that the
    // UNPROTECTED backup door is DOM- + visually BELOW the PROTECTED disclaimer (the Hawk's veto).
    await expect(page.locator('.cs-medicare-note')).toBeVisible()
    const foldOrder = await page.evaluate(() => {
      const disc = document.querySelector('footer.disclaimer.disclaimer--in-frame')
      const door = document.querySelector('.result-backup-door')
      if (disc === null || door === null) return null
      return { discBottom: disc.getBoundingClientRect().bottom, doorTop: door.getBoundingClientRect().top }
    })
    expect(foldOrder, 'the disclaimer and the backup door must both render on this frame').not.toBeNull()
    expect(
      foldOrder!.doorTop,
      'the backup door must sit BELOW the R13 disclaimer (the caveat wins the fold)',
    ).toBeGreaterThanOrEqual(foldOrder!.discBottom - 0.5)

    // The backup door is the sanctioned below-fold casualty on THIS composite frame (the disclaimer
    // is a sibling <footer>, so it stays measured — the arm still fails if the caveat itself breaches).
    await assertFrameFits(page, true, true)
  })
})

// ── U13 follow-up: the AGED date route (?vault=datestale — the re-based odds ladder) ──────────
// The two-time-bases fix (council 2026-07-10): the hero re-derives "years out" from TODAY, and
// the ladder below it must speak the SAME clock — the Caddie panel's hard-flagged blocker was
// the rosier re-derived hero over a save-relative ladder ("about 6 years out" vs "Stopping in
// 8 years … your date"). The DATE route scrolls by design, so this arm pins the ORDER contract
// plus the aged surface's own honesty composition, never a full one-frame fit.

test.describe(`the aged date return (?vault=datestale) — one clock across hero and ladder (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the hero count and the ladder crown speak the same years-from-today; the aged-balances caveat rides the ladder; order holds', async ({ page }) => {
    await page.goto('/?vault=datestale')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the datestale plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    // The gate's decision pair sits in the first frame on the DATE route's gate too.
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

    // Presence companions (insight 029): the two-pane stamped, BOTH graphs drawn, the floor's
    // ARRIVED line rendered (the aged split really landed — not a fresh page passing vacuously),
    // the doors offered.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    await expect(page.locator('.fod-band')).toBeVisible()
    await expect(page.locator('.fod-ladder')).toBeVisible()
    await expect(page.getByText(/penciled as covered/)).toBeVisible()
    expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
    await assertOneVisibleDisclaimer(page, 'laptop')

    // THE ONE-CLOCK PIN — the exact Caddie-flagged contradiction, pinned STRUCTURALLY (an
    // engine re-grade may move N; hero-N must equal crown-N forever): the hero's "about N
    // years out" and the crown aria's "Stopping in N years" read one number.
    const heroText = await page.locator('.fod-headline').innerText()
    const heroN = heroText.match(/about (a|\d+) years? out/)
    expect(heroN, `the hero does not carry the anchored count: "${heroText}"`).not.toBeNull()
    const crownAria = await page
      .locator('.fod-ladder [aria-label*="your date"]')
      .first()
      .getAttribute('aria-label')
    expect(crownAria, 'the ladder crown aria is missing').not.toBeNull()
    const crownN = crownAria!.match(/^Stopping (today|in (a|\d+) years?)/)
    expect(crownN, `the crown aria does not open with a stopping count: "${crownAria}"`).not.toBeNull()
    const heroCount = heroN![1] === 'a' ? 1 : Number(heroN![1])
    const crownCount = crownN![1] === 'today' ? 0 : crownN![2] === 'a' ? 1 : Number(crownN![2])
    expect(
      crownCount,
      `two time bases on one screen: the hero says ${heroCount} years out, the ladder crown says ${crownCount} (aria: "${crownAria}")`,
    ).toBe(heroCount)

    // THE AGED-BALANCES CAVEAT (council 2026-07-10, the pulled-forward facet c) rides the ladder.
    await expect(
      page.getByText('They also read from your account balances as you entered them in'),
    ).toBeVisible()

    // ORDER (the date route's honesty contract): graphs → in-frame disclaimer → doors, doors last.
    const box = async (selector: string) => {
      const b = await page.locator(selector).boundingBox()
      expect(b, `${selector} must render with a real box`).not.toBeNull()
      return b as NonNullable<typeof b>
    }
    const graphs = await box('.fod-graphs')
    const disclaimer = await box('footer.disclaimer.disclaimer--in-frame')
    const doors = await box('.result-quiet-row')
    expect(disclaimer.y, 'the R13 disclaimer must sit BELOW both graphs').toBeGreaterThanOrEqual(
      graphs.y + graphs.height - 0.5,
    )
    expect(doors.y, 'the quiet doors must sit BELOW the R13 disclaimer').toBeGreaterThanOrEqual(
      disclaimer.y + disclaimer.height - 0.5,
    )
  })
})
