import { test, expect, type Page } from '@playwright/test'
import { REAL, REAL_DPR, TIER, SHOWCASE, FLOOR, PHONE, gotoSeedFinal, settleLayout } from './reviewSurface'
// THE SHIPPED CATALOG, never re-typed here (the `e2e/design-tokens.spec.ts:2` precedent). Every
// string this spec injects or reads back is the one the app ships: a spec-local literal would pin a
// reservation, a clause list or a heading against a fiction, and a re-word that overflowed the real
// box would escape the gate silently (U17 §S5 step 14).
import { copy, slots, staticDisclosures } from '../src/ui/copy'

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

/** The FOUR spine seeds the frame contract walks — the council's three plus `nc`, the NC priced
 *  face (its own rationale sits on its entry below). The priced-Medicare disclosure
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

/** The UNPROTECTED affordances an arm may sanction as below-fold casualties, BEYOND the always-
 *  sanctioned quiet-door row. Named rather than positional: `(page, true, true, true)` reads as
 *  nothing, and each flag has to be justified at its call site — the default is that everything
 *  fits. */
type SanctionedDoors = {
  /** `.result-backup-door` — the off-device-copy offer (2026-07-10). */
  readonly backupDoor?: boolean
  /** `.rec-record` — the remembered-record card (2026-07-26, Briggsy's placement ruling). */
  readonly recordCard?: boolean
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
  sanctioned: SanctionedDoors = {},
): Promise<FrameReport> {
  const excludeBackupDoor = sanctioned.backupDoor === true
  const excludeRecordCard = sanctioned.recordCard === true
  return page.evaluate(({ excludeQuiet, excludeBackup, excludeRecord }) => {
    const vh = window.innerHeight
    const quiet = document.querySelector('.result-quiet-row')
    const backup = document.querySelector('.result-backup-door')
    const record = document.querySelector('.rec-record')
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
      // The remembered-record card joined that same degradable tail on 2026-07-26 (Briggsy's
      // ruling, on the numbers the KNOWN-BREACH arm below used to file): it is DOM-ordered under
      // the disclaimer and seats one row above the backup door, so it degrades with the doors
      // instead of pushing the protected caveat off the frame. Excluded on exactly the same terms
      // — subtree AND ancestor chain — and, like the door, only where an arm names it.
      if (excludeRecord && record !== null && (record.contains(el) || el.contains(record))) continue
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
  }, {
    excludeQuiet: excludeQuietRow,
    excludeBackup: excludeBackupDoor,
    excludeRecord: excludeRecordCard,
  })
}

/** A resolved two-pane answer renders hundreds of elements; a walk that counted fewer than this
 *  measured a broken page, not the frame. */
const WALK_FLOOR = 60

async function assertFrameFits(
  page: Page,
  excludeQuietRow: boolean,
  sanctioned: SanctionedDoors = {},
): Promise<void> {
  const report = await frameReport(page, excludeQuietRow, sanctioned)
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

// ── the spine frame matrix: {budget, retired, health, nc} × {REAL, TIER, SHOWCASE} ────────────

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
// already cover it.) The affordance opens the GoalPicker and dispatches the solve (U16 §S3 shipped
// 2026-07-22); its PRESENCE + posture (what this arm measures) needs no solve, so this arm never waits on one.

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

// ── The STEER-NOTE frame (the steer-seed increment, 2026-07-23) — the sanctioned-scroll ORDER
// contract under the no-pretax refusal. The refusal is SYNCHRONOUS (no worker wait), so the frame
// is fit-tractable — but it is a BEAT-CARRYING frame, and the F-A design (confidence.css r5)
// RECORDS that beat frames scroll by design (the surface takes a full-width row; the disclaimer +
// tail step down — 'steer' is enumerated in that ruling). So this arm pins what the frame OWES,
// the date-route order-contract idiom, not the idle one-frame law: (1) the NOTE — the response to
// the user's own goal pick — fully IN-FRAME (a refusal the user must scroll to find is a silent
// dead-end; the A/B walk measured the first three-line draft at surface-bottom 776 and the
// tightened note at 751 — the tighter TRUE sentence bought the headroom, insight 097); (2) the
// order holds: note → disclaimer → doors, doors last; (3) nothing breathes and the invite retires.
for (const vp of [REAL, TIER] as const) {
  const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
  test.describe(`?seed=steer — the no-pretax steer-note frame (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: vp, ...scale })
    test('the goal pick lands the calm steer note IN-FRAME; the beat-frame order contract holds', async ({
      page,
    }) => {
      await gotoSeedFinal(page, 'steer')
      await assertResolvedSpine(page)
      await page.locator('.result-recommend-invite').click()
      const dialog = page.getByRole('dialog')
      const radio = dialog.getByRole('radio', { name: /Leave more behind/ })
      // NATIVE click — the sr-only radio trap (layout-independent, still bubbles to React's root).
      await radio.evaluate((el) => (el as HTMLInputElement).click())
      await expect(radio).toBeChecked()
      await dialog.getByRole('button', { name: 'See the strategy', exact: true }).click()
      await expect(dialog).toBeHidden()
      // The refusal is synchronous: the note renders, nothing breathes, the invite retires.
      const note = page.locator('.rec-note--no-pretax')
      await expect(note, 'the steer note must render (never a silent dead-end)').toBeVisible()
      await expect(page.locator('.solve-pending')).toHaveCount(0)
      await expect(page.locator('.result-recommend-invite')).toHaveCount(0)
      // (1) The note — the answer to the user's own action — fully IN-FRAME, no scroll to find it.
      const noteBox = await note.boundingBox()
      expect(noteBox, 'the steer note reported no box').not.toBeNull()
      expect(
        Math.round(noteBox!.y + noteBox!.height),
        'the refusal must be visible where the door was — never below the fold',
      ).toBeLessThanOrEqual(vp.height)
      // (2) The beat-frame ORDER contract (the date-route idiom): note → disclaimer → doors last.
      const disclaimer = page.locator('.disclaimer--in-frame')
      const dBox = await disclaimer.boundingBox()
      const qBox = await page.locator('.result-quiet-row').boundingBox()
      expect(dBox, 'the in-frame disclaimer mount must exist').not.toBeNull()
      expect(qBox, 'the quiet row must exist').not.toBeNull()
      expect(dBox!.y, 'the disclaimer sits BELOW the note').toBeGreaterThan(noteBox!.y + noteBox!.height - 1)
      expect(qBox!.y, 'the doors sit BELOW the disclaimer — doors always last').toBeGreaterThan(dBox!.y + dBox!.height - 1)
    })
  })
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
          //
          // ⚠️ IT MODELS THE COLUMN STRUCTURE, NOT THE COPY. This arm asserts where the two columns
          // START AND END — the inner text is a stand-in and has drifted from the catalog (the shipped
          // nameplate is "Compared with your plan today"), which costs nothing because no assertion
          // below reads it. Children that cannot move a column boundary are therefore deliberately NOT
          // injected here, including the 2026-08-05 winning-plan card: it is a flow child of `__rest`
          // with no width of its own. The SAVE-SLOT arm below is the one that must stay content-true —
          // it measures heights — and it carries the card, sourced from `copy` like everything else.
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

// ── U17 §S5: the SAVE SLOT's reservation, MEASURED (the CLS law) ──────────────────────────────
// WHAT THIS REPLACES. U16 reserved `.rec-save-slot` at 2.75rem and S5 re-sized it to 8rem BY
// ARITHMETIC off the type scale — recommendation.css says so in its own comment ("this figure is
// reasoned from the type scale, not observed"). The only guard until now was a `min-height` lower
// bound, which is UNFALSIFIABLE: `min-block-size` never clips, so "the box is at least its content"
// is true by construction whatever the content does. The falsifiable law is EQUALITY — every arm the
// slot can swap to must land in a box of the SAME height, because the swap happens under the
// household's pointer with the R13 disclaimer and the quiet doors directly beneath it (insight 035:
// a collapsing box yanks them up mid-gesture). An arm that OVERFLOWS the reservation grows the box
// and breaks the equality; an arm that under-fills it does not (the floor holds) — so this measures
// the one direction that can actually move.
//
// EVERY STRING COMES FROM THE SHIPPED CATALOG (`copy`), never re-typed here. A spec-local literal
// would pin the reservation against a fiction: re-word the ceremony hint one line longer and the
// gate would stay green while the real control overflowed. `e2e/design-tokens.spec.ts:2` is the
// precedent for importing src into an e2e spec.
//
// INJECTED, not solved: a live committed solve is 80–200s (recorded above), past this harness's
// budget. The injected DOM is the verbatim `RecommendationSurface.tsx` render for each arm.
//
// WHAT THE MEASUREMENT FOUND, AND WHY THE PHONE IS NOT IN THE LOOP (recorded 2026-07-26, first real
// browser run of this arm — the reservation had never been observed, only derived):
//   1536×791 · 1280×800 · 1088×800 — reserved 128px, offer content 101.59px, ceremony hint TWO
//     lines. The shipped arithmetic (recommendation.css: "3 × 24.8 = 74px … total 126.4px") is
//     WRONG in the safe direction: the hint holds two lines at every laptop tier, so the box
//     OVER-reserves by 26.41px. Harmless to the fold (the slot exists only on the committed beat,
//     and that frame is a full-width r5 row that scrolls by design — the PROTECTED idle frames
//     render no slot at all), but the figure in that comment is not what the browser does.
//   390×844 — reserved 128px, offer content 146.13px, ceremony hint FOUR lines. The box GREW to
//     146.13px, so the tap offer→saving collapsed it back to 128px and everything below it rose
//     18.13px mid-gesture: a live CLS defect, and the equality this arm exists to enforce was FALSE
//     on the phone. The phone was deliberately held OUT of the loop rather than pinned green against
//     that wrong behaviour (an arm that pins a defect is the defect's second copy) or left red.
//
// ✓ THE PHONE IS IN THE LOOP AS OF 2026-07-27 — the defect is fixed, so the arm can hold it honestly.
// `recommendation.css` now reserves PER TIER (10rem base / 8rem at the 68rem laptop seam), sized off
// a re-measurement across the sub-laptop range: 390×844 is the governing width at 146.13px of offer
// content, and 320×844 is slightly SHORTER (145.25px — the hint is 4L at both, and the one-line arms
// rewrap at 320), so narrower is not monotonically taller. The hint was NOT trimmed: content never
// yields to layout. This loop is what keeps that true — a reword that outgrows 10rem reds here.
const SAVE_SLOT_SEEDS = ['retired'] as const

for (const seed of SAVE_SLOT_SEEDS) {
  for (const vp of [REAL, TIER, FLOOR, PHONE] as const) {
    const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
    test.describe(`?seed=${seed} — the save slot's reservation holds every arm (${vp.width}×${vp.height})`, () => {
      test.use({ viewport: vp, ...scale })
      test(`${seed}: empty, offer, saving and saved all land in the SAME box (no mid-gesture collapse)`, async ({
        page,
      }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)

        // RENAMED from `slots` 2026-08-05: the winning-plan card's conversion line comes from the
        // copy-catalog `slots` import, and a local `const slots` puts that import in the temporal dead
        // zone for this whole block — the catalog could not be read at all while the shadow stood.
        const slotBoxes = await page.locator('.recommendation-surface').evaluate((surface, text) => {
          // The real committed beat (RecommendedBeat) — the grade lockup, the fixed-dimension viz
          // box (whose PRESENCE is what the shipped CSS keys the inner two-pane on), and the text
          // rest that OWNS the save slot. The aside is a SIBLING of the beat, exactly as the
          // surface renders it.
          const beat = document.createElement('section')
          beat.className = 'rec-committed'
          beat.innerHTML =
            '<div class="rec-grade" role="group"><p class="rec-grade__head">' +
            '<svg class="rec-grade__glyph" width="22" height="22" viewBox="0 0 22 22"></svg>' +
            '<span class="rec-grade__word">A confident lean</span></p>' +
            '<p class="rec-grade__hero">This keeps about $128,000 more for the two of you to pass on than staying on your current plan.</p></div>' +
            '<div class="rec-viz-box"><div class="rec-viz-box__placeholder" aria-hidden="true"></div></div>' +
            '<div class="rec-committed__rest">' +
            '<p class="rec-baseline">Compared with keeping your current plan</p>' +
            // The winning-plan card (2026-08-05) — a real child of `__rest` on every ACTIVE beat, so it
            // rides above the slot here too. Its content comes from the catalog like everything else;
            // the conversion line is the shipped slot rendered with the widest live figure shape.
            '<div class="rec-action">' +
            `<p class="rec-action__heading">${text.actionHeading}</p>` +
            '<dl class="rec-action__list">' +
            `<dt class="rec-action__term">${text.actionOrder}</dt>` +
            `<dd class="rec-action__value">${text.orderLabel}<span class="rec-action__gloss">${text.orderGloss}</span></dd>` +
            `<dt class="rec-action__term">${text.actionConversion}</dt>` +
            `<dd class="rec-action__value">${text.conversionLine} <span class="rec-action__gloss">${text.conversionNote}</span></dd>` +
            '</dl></div>' +
            `<p class="rec-limits">${text.limits}</p>` +
            `<button type="button" class="btn-quiet rec-repick">${text.repick}</button>` +
            '<div class="rec-slot-host"></div>' +
            '</div>'
          surface.appendChild(beat)
          const host = beat.querySelector('.rec-slot-host') as HTMLElement

          // The four arms, verbatim from `SaveSlot` (RecommendationSurface.tsx). The OFFER arm uses
          // the CEREMONY hint — the longer of the two routes, and the one every dev seed, the
          // Caddie walk and this gate actually reach (no vault ⇒ route 'ceremony').
          const arms: Record<string, string> = {
            empty: '<div class="rec-save-slot" aria-hidden="true"></div>',
            offer:
              '<div class="rec-save-slot">' +
              `<button type="button" class="btn-quiet rec-save__cta">${text.cta}</button>` +
              `<p class="rec-save__hint">${text.hintCeremony}</p></div>`,
            saving: `<div class="rec-save-slot"><p class="rec-save__pending">${text.pending}</p></div>`,
            saved:
              '<div class="rec-save-slot"><p class="rec-save__badge">' +
              `<span class="rec-save__mark" aria-hidden="true"></span>${text.badge}</p></div>`,
          }
          const out: Record<string, { box: number; content: number; hintLines: number }> = {}
          for (const [name, html] of Object.entries(arms)) {
            host.innerHTML = html
            const slot = host.querySelector('.rec-save-slot') as HTMLElement
            const box = slot.getBoundingClientRect().height
            // The CONTENT extent (first child's top → last child's bottom): what the box would be
            // WITHOUT the reservation. Reported so an overflow names its own margin.
            const kids = Array.from(slot.children) as HTMLElement[]
            const content =
              kids.length === 0
                ? 0
                : kids[kids.length - 1]!.getBoundingClientRect().bottom - kids[0]!.getBoundingClientRect().top
            const hint = slot.querySelector('.rec-save__hint') as HTMLElement | null
            const hintLines =
              hint === null
                ? 0
                : Math.round(hint.getBoundingClientRect().height / parseFloat(getComputedStyle(hint).lineHeight))
            out[name] = { box: Math.round(box * 100) / 100, content: Math.round(content * 100) / 100, hintLines }
          }
          const reserved = parseFloat(getComputedStyle(host.querySelector('.rec-save-slot')!).minBlockSize)
          beat.remove()
          return { arms: out, reserved: Math.round(reserved * 100) / 100 }
        }, {
          limits: staticDisclosures.honestLimitsValidate,
          repick: copy.recommendRepickCta,
          cta: copy.recommendSaveCta,
          hintCeremony: copy.recommendSaveHintCeremony,
          pending: copy.recommendSavePending,
          badge: copy.recommendSaveSavedBadge,
          actionHeading: copy.recommendActionHeading,
          actionOrder: copy.recommendActionOrderLabel,
          actionConversion: copy.recommendActionConversionLabel,
          // `bracket-fill` is the LONGEST shipped gloss by a wide margin and is a live crown on the
          // core seed, so the card is measured at its tallest real content, never a friendly one.
          orderLabel: copy.leverPolicyBracketFill,
          orderGloss: copy.leverPolicyBracketFillHelp,
          // The PASSED arm and the replacement clause together — the card's tallest producible content,
          // not its friendliest. The passed arm is two sentences (the aged vault, which is the ordinary
          // returning household), and the note only renders when both plans convert.
          conversionLine: slots.rothPlanRanked('72,000', 9, 2026, true),
          conversionNote: slots.rothPlanReplaces('20,450'),
        })

        const a = slotBoxes.arms
        const report =
          `reserved=${slotBoxes.reserved}px · ` +
          Object.entries(a)
            .map(([k, v]) => `${k}: box=${v.box} content=${v.content}${v.hintLines > 0 ? ` hint=${v.hintLines}L` : ''}`)
            .join(' · ')
        console.log(`[U17 save-slot reservation] seed=${seed} ${vp.width}x${vp.height}: ${report}`)

        // NON-VACUITY (insight 029): a reservation of zero would make every equality below pass over
        // four collapsed boxes.
        expect(slotBoxes.reserved, 'the slot must carry a real reservation').toBeGreaterThan(0)
        expect(a.empty!.box, 'the empty reservation must be the reservation').toBe(slotBoxes.reserved)

        // (1) THE CLS LAW — the populated OFFER arm lands in the SAME box as the empty reservation.
        // This is the assertion the old `min-height ≥ content` lower bound could not make: it goes
        // RED both ways — delete the min-block-size (recommendation.css) and `empty` collapses; grow
        // the hint past the reservation and `offer` swells.
        expect(
          a.offer!.box,
          `the OFFER arm does not fit its reservation — content ${a.offer!.content}px (CTA + a ` +
            `${a.offer!.hintLines}-line ceremony hint) in a ${slotBoxes.reserved}px box, so the box grew to ` +
            `${a.offer!.box}px and the tap will shift everything below it (insight 035). Content is ` +
            `never trimmed to fit — raise the reservation.`,
        ).toBe(a.empty!.box)

        // (2) …and so do the two one-line arms the tap swaps THROUGH. These under-fill, so they are
        // held by the floor — the assertion is that the floor is still there for them.
        expect(a.saving!.box, 'the pending line must not collapse the box mid-write').toBe(a.empty!.box)
        expect(a.saved!.box, 'the saved badge must not collapse the box after the write').toBe(a.empty!.box)

        // The reservation is honest about WHY it is that tall: the offer arm really is the governing
        // one (a reservation sized for a one-line arm would be a coincidence, not a design).
        expect(
          a.offer!.content,
          'the OFFER arm must be the tallest — it is what the reservation is sized for',
        ).toBeGreaterThan(Math.max(a.saving!.content, a.saved!.content))
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
test.describe(`?seed=nc — the NC state clause on the priced residual (${REAL.width}×${REAL.height} @ 2.5dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the hero still names North Carolina (on-track since the 2026-08-02 rate pin; it read borderline at mint); the unpriced monolith clause is gone', async ({ page }) => {
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
  test('the band keeps its dollar ticks at the tightest in-range pane', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    // The y-tick dollars are the color-blind reader's position→dollar decoder (the never-color-alone
    // law; O3 permits no SR substitute). They are HTML in the chart text layer since 2026-09-05 —
    // never scaled, never dropped — so PRESENCE + visibility is the contract here; the rendered size,
    // containment and non-overlap are chart-text.spec.ts's gate on every arm.
    const labels = page.locator('.cs-band .band-tick')
    expect(await labels.count(), 'the band rendered no dollar ticks at all').toBeGreaterThan(0)
    await expect(labels.first()).toBeVisible()
    await expect(page.locator('.cs-band .band-tick--floor'), 'the $0 anchor — design-law §3’s honesty proof — must render').toHaveText('$0')
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
    // insight 029), and the ~760-day-old savedAt → the two-year elapsed line (coherent with the
    // seed's -2 startCalendarYear — a real save mints both together).
    //
    // U17 §S4 RE-DERIVED THIS COUNT FROM WHAT THE SURFACE HONESTLY SHOWS — 3 → 2, never relaxed
    // to make a run pass. The plant moves four stamps: taxVintageDetail, coverageYear,
    // partBStandardMonthly and blendSnapshotAsOf. Under the exposure three-way this household
    // (all-65+ ⇒ Medicare-only, one manual-blend account ⇒ no dated ticker row, both retired ⇒ no
    // contribution stream) gets exactly two lines:
    //   · the federal tax line NAMED (their run builds an overlay ⇒ `taxEnabled` ⇒ the `tax.`
    //     family is consumed);
    //   · ONE Medicare cost line NAMED, carrying BOTH `part-b` and the Medicare half of
    //     `coverage-year` (which dates the ACA/IRMAA tables — they price the IRMAA ladder and
    //     zero marketplace years, so the marketplace line must stay dark).
    // The blend re-date reaches NO line at all: `resolveBlend` never consults the dated table for
    // a manual-blend account, so "we can't tell whether it touches your numbers" would be false —
    // we can. The old "fund data we read your accounts against" line is likewise gone.
    // The count is derived in a unit arm — `devSeeds.test.ts` "'stale' composes EXACTLY the two
    // lines…" — so a re-bucketing fails there first, in a second, not here in ninety.
    await expect(page.locator('.reentry-notes p')).toHaveCount(2)
    await expect(page.getByText('Medicare cost figures have been updated')).toBeVisible()
    await expect(
      page.getByText('Marketplace health-plan rules have been updated'),
      'they price zero marketplace years — the ACA line must be dark',
    ).toHaveCount(0)
    await expect(
      page.getByText('Reference data this tool reads has been updated since your save'),
      'the nameless aggregate must be dark — the blend re-date is provably inert here',
    ).toHaveCount(0)
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
    // (rules moved: the federal tax vintage + the Medicare cost figures, all EXPOSURE-PROVEN for
    // this household) with the R13 disclaimer still in-frame beside it.
    await expect(page.locator('.cs-staleness-note')).toBeVisible()
    // U17 §S2 — the aged band ships ONLY beside its premise + the RENDERED re-confirm control
    // (insight 100; the no-premise ⇒ no-fan law is structural in the component, and this arm
    // pins the pair VISIBLE inside the measured frame — the fold-legality half). The elapsed
    // segment's demotion mask rides the same clock (the honored hawk veto: drawn-as-history,
    // never clipped, never full-strength).
    await expect(page.locator('.band-premise')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Re-confirm your numbers' })).toBeVisible()
    await expect(page.locator('.band-elapsed-dim')).toBeAttached()
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
    await assertFrameFits(page, true, { backupDoor: true })
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
  test('the gate fires the state-tax clock in isolation, decision pair in-frame; the echoed hero names NC and holds the one-frame law', async ({ page }) => {
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
    // The distinctively-worded sibling lines are demonstrably dark (belt-and-suspenders on the
    // count): neither healthcare family nor the nameless aggregate fires on a stamps-fresh save.
    // (U17 §S4 re-pointed these from the retired `stalenessHealthcare` / `stalenessBlendSpine`
    // keys — insight 086: a negative aimed at a deleted string is vacuously green forever.)
    await expect(
      page.getByText('Marketplace health-plan rules have been updated'),
      'the ACA family must be dark (stamp fresh)',
    ).toHaveCount(0)
    await expect(
      page.getByText('Medicare cost figures have been updated'),
      'the Medicare family must be dark (stamp fresh)',
    ).toHaveCount(0)
    await expect(
      page.getByText('Reference data this tool reads has been updated since your save'),
      'the nameless aggregate must be dark (no unattributable clock fired)',
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
      'the NC state clause must ride the echoed hero',
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
    await assertFrameFits(page, true, { backupDoor: true })
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
    // U17 §S2 — the DATE route's aged band carries the same premise + rendered re-confirm pair
    // and the elapsed-segment demotion (one law, both routes).
    await expect(page.locator('.band-premise')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Re-confirm your numbers' })).toBeVisible()
    await expect(page.locator('.band-elapsed-dim')).toBeAttached()
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

// ── U17 §S6: the ARRIVED vault return (?vault=datearrived) — the aged band's X-AXIS, and the
// silence where a marker used to be ───────────────────────────────────────────────────────────
// TWO THINGS HAD NO REAL-BROWSER WITNESS BEFORE THIS PLANT EXISTED.
//
// (1) THE AGED BAND'S YEAR-0 LABEL. U17 §S0 renamed it `bandClockBuiltLabel` — the band had been
// calling the BUILD year "Your save", false for any re-saver and contradicted by the fresh "Saved
// to this device" badge on the same screen. That rename shipped with unit arms only: no e2e arm
// asserts the aged axis at all, so a regression to the fresh "Today" endpoint on an aged plan —
// the exact class §S0 fixed — would draw in a real browser with a green suite.
//
// (2) THE WITHDRAWN WORK-STOPS MARKER. §S2.1's honored hawk veto: a crowned offset the plan clock
// has PASSED withdraws AT THE ARRAY, so no future-tense named marker can ever render left of
// Today. On `?vault=datestale` the crown sits BEYOND the elapsed window, so the marker renders and
// the withdrawal never fires. THIS is the first live surface where it does — which makes the arm
// below the only structural guard on a silence that is otherwise indistinguishable, in a
// screenshot, from a marker someone forgot to draw. (Whether that silence READS honest or missing
// is Briggsy's parked tone call; this arm only holds the mechanism still while he rules.)
test.describe(`the arrived date return (?vault=datearrived) — the aged x-axis + the withdrawn marker (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the year-0 endpoint names the BUILD year, wall-time Today is marked, and no named marker renders left of Today', async ({
    page,
  }) => {
    await page.goto('/?vault=datearrived')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the datearrived plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
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

    // PRESENCE COMPANIONS (insight 029) — a fresh page, or a plant that quietly stopped arriving,
    // would pass every absence assertion below vacuously. The hero sentence is the discriminator:
    // it is the §S2.5 STRICTLY-PAST arm, and it exists on no other live route.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    await expect(page.locator('.fod-band')).toBeVisible()
    await expect(page.getByText(/that year has already come and gone/)).toBeVisible()
    await expect(page.locator('.band-premise')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Re-confirm your numbers' })).toBeVisible()
    await expect(page.locator('.band-elapsed-dim')).toBeAttached()

    // THE X-AXIS. Read the band's own named labels rather than a screenshot: `Plan built` is the
    // aged year-0 endpoint, and `Today` is the wall-time marker §S2 places at x = years-elapsed.
    // Both must be present — asserting only the first would pass on a band that lost its wall
    // clock entirely, which is the two-time-bases defect in its other direction.
    // The named moments are the annotation block's NAME lines (HTML, chart text layer, 2026-09-05);
    // an interim age tick renders an EMPTY name, so the empty strings are filtered, not counted.
    const strongLabels = (await page.locator('.fod-band .band-annotation__name').allTextContents()).filter((t) => t !== '')
    expect(
      strongLabels,
      `the aged band must name the BUILD year at year 0, never "Today" (U17 §S0). Labels: ${JSON.stringify(strongLabels)}`,
    ).toContain('Plan built')
    expect(
      strongLabels,
      `the aged band must still mark WALL-TIME today. Labels: ${JSON.stringify(strongLabels)}`,
    ).toContain('Today')

    // THE SILENCE (§S2.1). The crowned offset is behind the wall clock here, so NEITHER named
    // work-stops label may render — not the plain one, not the split one. Both are checked because
    // the split arm picks between them at the array, and pinning one leaves the other free.
    expect(
      strongLabels,
      `no future-tense marker may render left of Today. Labels: ${JSON.stringify(strongLabels)}`,
    ).not.toContain('Work stops')
    expect(
      strongLabels,
      `nor the split variant. Labels: ${JSON.stringify(strongLabels)}`,
    ).not.toContain('Essentials date')

    await assertOneVisibleDisclaimer(page, 'laptop')

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

// ── U17 §S5: the RECORD-BEARING vault return (?vault=rec) — the card on a PROTECTED idle frame ──
//
// THE BLIND SPOT THIS CLOSES. Every arm above mounts `{kind:'unsaved'}` — a `?seed=` route has no
// vault, and `IntakeApp`'s recordCard memo reads the DISK, never the draft — so until the record
// plants landed (devSeeds.ts, this same step) no frame in this gate carried the one piece of new
// content S5 drops onto a protected frame. And it IS protected: a returning household lands `idle`,
// which is a fast one-frame fit frame, NOT one of the beat frames that scroll by design.
//
// THE STRUCTURAL RISK IS THE GRID SEAT, not the card's own height. confidence.css excludes
// `.rec-aside` from the two-pane beat switch (`:has(.recommendation-surface > :not(.sr-only)
// :not(.rec-aside))`) precisely so the instantly-painted memory card cannot flip the surface out of
// its r4 idle seat and step the PROTECTED in-frame disclaimer, the backup door and the quiet row
// each down one row on the first screen a returning household sees. Drop `:not(.rec-aside)` from
// that selector and the surface takes r5 / the disclaimer r6 — which is exactly what the computed-
// row assertions below read.
//
// THE RECORD-FREE REFERENCE IS MEASURED IN THE SAME RUN, never hand-typed: after measuring the
// vault frame this test navigates to `?seed=retired` — the SAME household, the same idle solve
// state, no vault and therefore no card — and requires the two computed rows to be IDENTICAL. So
// "unchanged from the record-free return" is a comparison, not a remembered constant.

test.describe(`the record-bearing vault returns (?vault=rec / ?vault=recold) — the memory card on the protected idle frame (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: 2.5 })
  test('the card paints its HOLDS face and leaves the spine above it byte-identical (surface r4, caveat r5)', async ({
    page,
  }) => {
    const seats = async () =>
      page.evaluate(() => {
        const cs = (sel: string) => {
          const el = document.querySelector(sel)
          if (el === null) return null
          const s = getComputedStyle(el)
          const r = el.getBoundingClientRect()
          return {
            row: s.gridRowStart,
            column: s.gridColumnStart,
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
          }
        }
        return {
          surface: cs('.recommendation-surface'),
          disclaimer: cs('footer.disclaimer.disclaimer--in-frame'),
          card: cs('.rec-record'),
        }
      })

    // (0) THE RECORD-FREE REFERENCE, captured FIRST in this same run and same browser: the identical
    // household with no vault (and therefore no card). Every "unchanged" claim below is a comparison
    // against these numbers, never a remembered constant.
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    await expect(page.locator('.rec-record'), 'a no-vault route has no record to remember').toHaveCount(0)
    const recordFree = await seats()

    await page.goto('/?vault=rec')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the rec plant did not land on the unlock screen').toBeVisible({ timeout: 30_000 })
    await unlock.click()

    // The re-entry gate is UNCONDITIONAL on every return (ReEntry.tsx) — but this plant ages NO
    // vintage, so it must arrive with the clock lines DARK: the record card has to be readable in
    // isolation, not beside a staleness echo it did not cause.
    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.reentry-notes p'), 'the rec plant ages no stamp — no clock may fire').toHaveCount(0)
    await affirm.click()

    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
    await settleLayout(page)
    await assertResolvedSpine(page)

    // (1) THE CARD IS REALLY THERE, and it is the HOLDS face — the standing this plant produces is
    // derived from the real trichotomy in `devSeeds.test.ts` ("'rec' — the memory STILL HOLDS"), so
    // this arm reads what that unit proved rather than re-deriving it. Every string is the shipped
    // catalog's (imported at the top), never re-typed.
    const card = page.locator('.rec-record')
    await expect(card, 'the remembered-record card must paint on the vault-return idle frame').toBeVisible()
    // …and it is OUTSIDE the surface's aside now (Briggsy's 2026-07-26 placement ruling): the aside
    // keeps the refusal alone. A card that crept back inside would re-acquire the fold breach the
    // arm below retired, so pin the seam here rather than only in the unit suite.
    await expect(
      page.locator('.rec-aside .rec-record'),
      'the card must NOT be inside the surface aside — that seat breaches the protected caveat',
    ).toHaveCount(0)
    await expect(card.locator('.rec-note__head')).toHaveText(copy.recommendRecordHeading)
    const standing = card.locator('.rec-record__standing')
    await expect(standing).toHaveAttribute('data-standing', 'holds')
    await expect(standing).toContainText(copy.recommendRecordHolds)
    // The re-open control and its COST line ship as one unit (a control that hides a multi-minute
    // re-solve is an invitation the household cannot price).
    await expect(card.getByRole('button', { name: copy.recommendRecordReopenCta })).toBeVisible()
    await expect(card.locator('.rec-record__cost')).toHaveText(copy.recommendRecordReopenCost)
    // …and the doors-region invite is GONE (Result.tsx drops the idle disjunct when a record card is
    // on screen): two controls opening the same GoalPicker on one frame is the duplication the F-B
    // chair fix retired.
    await expect(
      page.locator('.result-recommend-invite'),
      'the card carries the re-open — a second door-row invite would be the retired duplication',
    ).toHaveCount(0)

    const withCard = await seats()
    expect(withCard.surface, 'the surface must be on the page').not.toBeNull()
    expect(withCard.disclaimer, 'the in-frame disclaimer must be on the page').not.toBeNull()
    expect(withCard.card, 'the card must have a box to measure').not.toBeNull()
    console.log(
      `[U17 record return] ?vault=rec ${REAL.width}x${REAL.height}: ` +
        `card h=${withCard.card!.height} bottom=${withCard.card!.bottom} · ` +
        `surface r${withCard.surface!.row}c${withCard.surface!.column} h=${withCard.surface!.height} ` +
        `(record-free r${recordFree.surface!.row}c${recordFree.surface!.column} h=${recordFree.surface!.height}) · ` +
        `disclaimer r${withCard.disclaimer!.row} bottom=${withCard.disclaimer!.bottom} ` +
        `(record-free r${recordFree.disclaimer!.row} bottom=${recordFree.disclaimer!.bottom}) · ` +
        `Δfold=${withCard.disclaimer!.bottom - recordFree.disclaimer!.bottom}px · frame=${REAL.height}px`,
    )

    // (2) THE GRID SEAT — the surface stays in the r4 idle slack of the LEFT column and the
    // PROTECTED disclaimer stays on r5, IDENTICAL to the record-free reference: everything the
    // household reads BEFORE the caveat is byte-identical with or without a memory, and the card
    // is purely additive below it. MUTANT (seat the card at `grid-row: 4` — the seat it shipped
    // from, inside the idle slack): the r4 row grows by the card's full height and the disclaimer
    // steps down with it, so the bottoms diverge and the fold arm below reads RED at 857px.
    expect(withCard.surface!.row, 'the surface must keep the r4 idle slack seat').toBe(recordFree.surface!.row)
    expect(withCard.surface!.column, 'the idle seat is the LEFT column, never the full-width beat row').toBe(
      recordFree.surface!.column,
    )
    expect(
      withCard.disclaimer!.row,
      'a returning household WITH a memory must read the same frame as one without',
    ).toBe(recordFree.disclaimer!.row)
    // …and the reference really is the shipped idle seat, so the equalities above cannot both drift.
    expect(recordFree.surface!.row).toBe('4')
    expect(recordFree.disclaimer!.row).toBe('5')
    // THE SPINE ABOVE THE CAVEAT IS UNMOVED IN PIXELS, not just in row numbers (the row equality
    // alone would survive a re-sized track). ±1px absorbs sub-pixel rounding between the two
    // navigations, nothing more — the breach this replaced was 67px.
    expect(
      Math.abs(withCard.disclaimer!.bottom - recordFree.disclaimer!.bottom),
      `the caveat moved ${withCard.disclaimer!.bottom - recordFree.disclaimer!.bottom}px between the ` +
        `record-free and record-bearing frames — the card must be purely additive BELOW it`,
    ).toBeLessThanOrEqual(1)
    // The card's own seat: the row DIRECTLY below the protected caveat, in the LEFT reading column
    // (confidence.css pins it — auto-placement would drop it into the dead right rail, and would
    // move it to the left column only when the household happens to have no backup door).
    expect(withCard.card!.row, 'the card seats on the row below the caveat').toBe('6')
    expect(withCard.card!.column, 'the card reads in the LEFT column with the other doors').toBe('1')

    // (3) The two-mount contract and the density tier are unmoved by the card.
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertResultPadding(page, '32px') // 791 ≤ 840 — the density tier serves this frame too
  })

  /**
   * THE ONE-FRAME FIT LAW ON THE RECORD-BEARING FRAME — the Honesty-Hawk veto case, RESOLVED
   * 2026-07-26 and asserted here positively on BOTH standings.
   *
   * WHAT WAS FILED (measured 1536×791 @ 2.5 DPR, the first run that ever rendered a saved record):
   * the card shipped inside the surface's r4 idle slack, and that slack carries ZERO free space on
   * this frame (the verdict column and the band end together, so the `1fr` row distributes
   * nothing). The PROTECTED in-frame R13 disclaimer therefore moved down by the card's FULL height
   * — 702 → 858px with the 156px `holds` card, 702 → 952px with the 251px two-clause `superseded`
   * one, against 89px of headroom. A 67–161px breach: a reassuring frame with "this can be wrong"
   * scrolled out of sight. Not fixable by trimming (content never yields to layout — no honest
   * version of heading + standing + the priced re-open fits 89px), so it was filed as a PLACEMENT
   * decision for the pilot.
   *
   * THE RULING (Briggsy, on those numbers): the card moves BELOW the disclaimer, into the doors
   * region — already the only sanctioned below-fold casualty under this law. Result.tsx renders it
   * after `<Disclaimer inFrame/>`; confidence.css seats it on the row directly beneath the caveat
   * in the left reading column, stepping the backup door and the quiet row one row down. Content
   * was never trimmed; every word survives, one flick away.
   *
   * RE-MEASURED THE SAME DAY, same viewport, after the move: the disclaimer's bottom is 701px on
   * BOTH plants — 90px inside the frame and within 1px of the record-free twin (`?seed=retired`,
   * 702px), i.e. the card is purely additive below the caveat. The card itself runs 705 → 862px
   * (`rec`) and 705 → 956px (`recold`): below the fold BY DESIGN, sanctioned exactly as the doors
   * are, and its top edge is on screen so the scroll is invited rather than hidden.
   *
   * THE `test.fail()` ANNOTATION THIS REPLACES was written to fail the day the placement was fixed
   * — forcing its own removal instead of letting a repaired frame quietly re-acquire an unenforced
   * law. It did its job. What is left is the law itself, falsifiable two ways (both watched RED
   * 2026-07-26 before this landed): seat the card back at `grid-row: 4` and the fold assertion
   * reads 857px; re-hoist it above `<Disclaimer inFrame/>` in Result.tsx and the document-order
   * assertion fails while the pixels stay put — which is exactly the CSS-only reorder (WCAG 2.4.3)
   * that a geometry-only gate would wave through.
   */
  for (const { plant, face } of [
    { plant: 'rec', face: 'HOLDS' },
    // The superseded face is the tall one — two cause clauses plus the mint year. If the law holds
    // here it holds on every standing the producer can emit (the recold arm below measures the
    // three-clause producible maximum on the same frame).
    { plant: 'recold', face: 'SUPERSEDED' },
  ] as const) {
    test(`?vault=${plant} — the ${face} card reads BELOW the PROTECTED R13 disclaimer, which keeps the frame`, async ({
      page,
    }) => {
      await page.goto(`/?vault=${plant}`)
      const unlock = page.getByRole('button', { name: 'Open my plan' })
      await expect(unlock, `the ${plant} plant did not land on the unlock screen`).toBeVisible({
        timeout: 30_000,
      })
      await unlock.click()
      const affirm = page.getByRole('button', { name: /Still about right/ })
      await expect(affirm).toBeVisible({ timeout: 30_000 })
      await affirm.click()
      await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
      await settleLayout(page)
      // NON-VACUITY (insight 029): every claim below is about a frame that carries the card, so a
      // frame that quietly stopped rendering one must fail here, never pass an empty walk.
      await expect(page.locator('.rec-record'), 'the frame under measure must carry the card').toBeVisible()

      const geometry = await page.evaluate(() => {
        const disc = document.querySelector('footer.disclaimer.disclaimer--in-frame')!
        const card = document.querySelector('.rec-record')!
        const standing = document.querySelector('.rec-record__standing')!
        const d = disc.getBoundingClientRect()
        const c = card.getBoundingClientRect()
        const s = standing.getBoundingClientRect()
        return {
          discBottom: Math.round(d.bottom),
          cardTop: Math.round(c.top),
          cardBottom: Math.round(c.bottom),
          cardHeight: Math.round(c.height),
          standingBottom: Math.round(s.bottom),
          standingText: (standing.textContent ?? '').trim(),
          // Node.DOCUMENT_POSITION_FOLLOWING — the card comes AFTER the caveat in the DOM, so
          // focus order matches the visual order the pixels below assert.
          cardFollowsInDom: (disc.compareDocumentPosition(card) & 4) !== 0,
          vh: window.innerHeight,
        }
      })
      console.log(
        `[U17 record return] ?vault=${plant} ${REAL.width}x${REAL.height}: ` +
          `disclaimer bottom=${geometry.discBottom} (frame=${geometry.vh}, headroom=${geometry.vh - geometry.discBottom}) · ` +
          `card h=${geometry.cardHeight} top=${geometry.cardTop} bottom=${geometry.cardBottom} · ` +
          `standing bottom=${geometry.standingBottom} (slack=${geometry.vh - geometry.standingBottom})`,
      )

      // (1) THE LAW: the protected caveat is IN FRAME. This is the assertion the filed annotation
      // stated and could not meet; it is met now.
      expect(
        geometry.discBottom,
        `the protected R13 disclaimer ends at ${geometry.discBottom}px, past the ${REAL.height}px frame`,
      ).toBeLessThanOrEqual(REAL.height)

      // (2) THE RULING: the card is BELOW the caveat — in the pixels AND in the DOM. Either check
      // alone is escapable (an explicit grid row survives a DOM re-hoist; a DOM order survives a
      // CSS re-seat), and the pair is precisely the no-CSS-only-reorder law the doors already obey.
      expect(
        geometry.cardTop,
        `the card starts at ${geometry.cardTop}px, above the caveat's ${geometry.discBottom}px bottom — ` +
          `it must never share or precede the protected row`,
      ).toBeGreaterThanOrEqual(geometry.discBottom)
      expect(
        geometry.cardFollowsInDom,
        'the card must FOLLOW the in-frame disclaimer in document order — a CSS-only reorder breaks ' +
          'focus order (WCAG 2.4.3) even while the pixels look right',
      ).toBe(true)

      // (2b) THE STANDING LINE KEEPS THE FRAME — the one part of the card that is NOT a sanctioned
      // below-fold casualty. The cause clauses may scroll (they are the detail); the lead sentence is
      // the card's whole MEANING, and on the superseded face it is the only thing telling a household
      // still executing the saved conversions that the advice itself may no longer fit. If it wraps
      // out of frame, the card degrades to a heading over nothing — strictly worse than the defect the
      // wording fixes, and invisible to every jsdom arm because it is a pure reflow outcome.
      //
      // The bound is TIGHT BY CONSTRUCTION (~10px at 1536×791), so this is a live constraint on the
      // copy rather than a formality: it is what makes the length note in copy.ts:1310-1332 enforceable
      // instead of advisory. Text is captured so a red names the sentence that outgrew the slack.
      expect(
        geometry.standingBottom,
        `the card's standing line ends at ${geometry.standingBottom}px, past the ${REAL.height}px frame — ` +
          `the meaning-bearing sentence must never be the scroll casualty (line: "${geometry.standingText}")`,
      ).toBeLessThanOrEqual(REAL.height)

      // (3) THE SANCTION IS NARROW (burned/070 — a sweep needs a guard, and an exclusion that
      // quietly swallowed a neighbour would be the defect's next home). `recordCard` skips the
      // card's SUBTREE *and*, like the quiet row and the backup door before it, its ANCESTOR chain
      // — an ancestor's bottom is driven by the box it contains. That ancestor arm is the blind
      // spot: it is only honest while every ancestor it hides was already sanctioned by the
      // always-excluded quiet row. Checked structurally by containment, never by class-name
      // spelling, so a rename cannot turn the guard vacuous.
      const overBroad = await page.evaluate(() => {
        const quiet = document.querySelector('.result-quiet-row')
        const backup = document.querySelector('.result-backup-door')
        const record = document.querySelector('.rec-record')!
        const extra: string[] = []
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          if (el === record || !el.contains(record)) continue // subtree + non-ancestors: not the risk
          const alreadySanctioned =
            (quiet !== null && (quiet.contains(el) || el.contains(quiet))) ||
            (backup !== null && (backup.contains(el) || el.contains(backup)))
          if (alreadySanctioned) continue
          const cls = el.getAttribute('class')
          extra.push(`${el.tagName.toLowerCase()}${cls !== null && cls !== '' ? `.${cls.split(/\s+/).join('.')}` : ''}`)
        }
        return extra
      })
      expect(
        overBroad,
        'sanctioning the record card must not newly blind the walk to any ancestor the doors had not ' +
          'already sanctioned — the card would be hiding an overflow that is not its own',
      ).toEqual([])
      // The backup door is the sanctioned casualty on a writable return (the ?vault=stale
      // precedent) and the card joins it; the caveat is a sibling <footer>, never an ancestor of
      // either, so it stays measured — this still fails if the caveat itself breaches.
      await assertFrameFits(page, true, { backupDoor: true, recordCard: true })

      // (4) BELOW THE FOLD IS NOT LOST: the card is one flick away with its re-open control and the
      // cost line that prices it intact. A door the household cannot reach would be a worse answer
      // than the breach.
      const card = page.locator('.rec-record')
      await card.scrollIntoViewIfNeeded()
      const reopen = card.getByRole('button', { name: copy.recommendRecordReopenCta })
      await expect(reopen, 'the re-open control must be reachable by scrolling').toBeInViewport()
      await expect(reopen).toBeEnabled()
      await expect(card.locator('.rec-record__cost')).toHaveText(copy.recommendRecordReopenCost)
    })
  }

  /**
   * THE CARD'S SEAT WHEN A BEAT IS ALSO ON SCREEN — the state the household reaches by tapping the
   * card's OWN re-open control, and the one this harness cannot drive: a live solve is 80–200s, past
   * any fit budget. So the beat is INJECTED, exactly as the recold arm injects its third cause clause
   * onto the real card — confidence.css's switch keys on the surface having any direct child that is
   * neither `.sr-only` nor `.rec-aside`, so one appended child reaches the real rule.
   *
   * WHY THIS ARM EXISTS: the beat switch and the record seat each step the degradable tail down one
   * row, and CSS cannot add — the combination needs its own `:has():has()` rules at a specificity
   * above both. Get that wrong and two elements share a grid cell and paint on top of each other.
   * Without this arm that branch ships ungated, which is precisely the unenforced law the retired
   * `test.fail()` annotation was written to prevent.
   */
  test('a BEAT beside the record steps the whole tail down one more row, with no two elements sharing a cell', async ({
    page,
  }) => {
    await page.goto('/?vault=rec')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the rec plant did not land on the unlock screen').toBeVisible({ timeout: 30_000 })
    await unlock.click()
    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await affirm.click()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
    await settleLayout(page)

    const rows = async () =>
      page.evaluate(() => {
        const row = (sel: string) => {
          const el = document.querySelector(sel)
          return el === null ? null : getComputedStyle(el).gridRowStart
        }
        return {
          surface: row('.recommendation-surface'),
          disclaimer: row('footer.disclaimer.disclaimer--in-frame'),
          record: row('.rec-record'),
          backupDoor: row('.result-backup-door'),
          quietRow: row('.result-quiet-row'),
        }
      })

    // (1) THE SHIPPED IDLE RETURN — the baseline the two arms above measure in pixels, read here as
    // rows so the step below is a delta against a witnessed state rather than a remembered one.
    expect(await rows(), 'the idle vault return seats caveat → card → backup door → quiet row').toEqual({
      surface: '4',
      disclaimer: '5',
      record: '6',
      backupDoor: '7',
      quietRow: '8',
    })

    // (2) THE BEAT LANDS. Everything below the two panes steps down exactly one row, DOM order intact.
    const beatChild = await page.evaluate(() => {
      const surface = document.querySelector('.recommendation-surface')!
      const beat = document.createElement('div')
      beat.className = 'rec-committed'
      beat.textContent = 'injected beat'
      surface.appendChild(beat)
      return surface.children.length
    })
    expect(beatChild, 'the injected beat must really be a child of the surface').toBeGreaterThan(1)
    await settleLayout(page)
    expect(
      await rows(),
      'with a beat AND a record every row steps once more — a missing `:has():has()` rule collides two of them',
    ).toEqual({
      surface: '5',
      disclaimer: '6',
      record: '7',
      backupDoor: '8',
      quietRow: '9',
    })
    // No two of them share a cell (the collision this arm exists to catch reads as a duplicate row).
    const seated = Object.values(await rows())
    expect(new Set(seated).size, 'every element must own its own grid row').toBe(seated.length)

    // (3) THE CONTROL ARM (burned/070 — the step must be caused by the RECORD, not by the beat
    // alone): drop the card and the tail returns to the pre-2026-07-26 beat numbers exactly. Without
    // this, a rule that shifted the tail unconditionally would read green above.
    await page.evaluate(() => document.querySelector('.rec-record')!.remove())
    await settleLayout(page)
    expect(
      await rows(),
      'a beat WITHOUT a record must read the numbers it read before the card existed',
    ).toEqual({
      surface: '5',
      disclaimer: '6',
      record: null,
      backupDoor: '7',
      quietRow: '8',
    })
  })

  /**
   * THE SUPERSEDED FACE (`?vault=recold`) — the card's OTHER standing, and the only live route to
   * its cause LIST. Insight 101 is binding: a warning that names one cause when two hold describes
   * its poster child, not the predicate's whole extension — and until this plant existed no
   * rendered frame carried more than zero clauses. The plant's two causes ('inputs-changed' +
   * 'solver-changed') and their declaration order are derived from the real trichotomy in
   * `devSeeds.test.ts`; this arm reads what that unit proved.
   *
   * IT ALSO CARRIES THE WORST-CASE HEIGHT MEASUREMENT. That number sized the placement ruling above
   * and it still earns its keep: the card is now the LAST thing between the protected caveat and the
   * doors, so its producible maximum is what the tail below the fold has to absorb. The PRODUCIBLE
   * maximum is THREE clauses, not four: `inputs-changed` and `inputs-unavailable` are the two arms
   * of one conjunct (`savedRecommendation.ts` pushes one or the other, never both), so a four-clause
   * card is unreachable and measuring one would be reserving against a fiction. The third clause is
   * injected from the shipped catalog onto the REAL card, in the same run, so the number is measured
   * rather than estimated.
   */
  test('the superseded face names EVERY cause it has, in the producer’s order, with the mint year — and reports the worst-case card height', async ({
    page,
  }) => {
    await page.goto('/?vault=recold')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the recold plant did not land on the unlock screen').toBeVisible({ timeout: 30_000 })
    await unlock.click()
    const affirm = page.getByRole('button', { name: /Still about right/ })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await affirm.click()
    await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({ timeout: 90_000 })
    await settleLayout(page)
    await assertResolvedSpine(page)

    const card = page.locator('.rec-record')
    await expect(card).toBeVisible()
    const standing = card.locator('.rec-record__standing')
    await expect(standing).toHaveAttribute('data-standing', 'superseded')
    // The LEAD sentence, which must stand on its own even with zero clauses beneath it — never the
    // holds sentence, which would be the calm-but-wrong direction.
    await expect(standing).toContainText(copy.recommendRecordSuperseded)
    await expect(standing).not.toContainText(copy.recommendRecordHolds)
    // BOTH clauses, in the producer's declaration order (inputs → solver → rules).
    await expect(card.locator('.rec-record__causes li')).toHaveText([
      copy.recommendRecordSupersededInputs,
      copy.recommendRecordSupersededSolver,
    ])
    // The rulebook clause is DARK — this plant's era is fresh, so naming it would be a cause the
    // trichotomy never found (the arm that proves the list is the store's, not a fixed set).
    await expect(card).not.toContainText(copy.recommendRecordSupersededRules)

    // THE MINT YEAR: this plant's record is ~400 days old, so the age clause renders rather than
    // suppressing. Bound to the catalog's own slot (never a re-typed sentence) and to a year that
    // is genuinely in the past.
    const savedIn = card.locator('p.rec-note__line')
    await expect(savedIn).toHaveCount(1)
    const savedInText = (await savedIn.textContent()) ?? ''
    const year = Number(/(\d{4})/.exec(savedInText)?.[1])
    expect(Number.isFinite(year), `the age clause must name a year — got "${savedInText}"`).toBe(true)
    expect(savedInText, 'the sentence is the shipped slot, not a re-typed one').toBe(
      slots.recommendRecordSavedIn(year),
    )
    expect(year, 'a record minted THIS calendar year suppresses the clause instead').toBeLessThan(
      new Date().getFullYear(),
    )

    // THE WORST CASE, measured on the real card: add the one clause the producer could still emit
    // beside these two (the rulebook one), from the catalog. The protected caveat's bottom is read
    // in the SAME frame as the injected clause — the card seats below it now, so a tallest-possible
    // card must move the caveat by nothing at all. If some future seat ever re-coupled them, this
    // reads it directly rather than inferring it from a row number.
    const worst = await card.evaluate((el, rulesClause) => {
      const disc = () =>
        Math.round(
          document
            .querySelector('footer.disclaimer.disclaimer--in-frame')!
            .getBoundingClientRect().bottom,
        )
      const two = Math.round(el.getBoundingClientRect().height)
      const discTwo = disc()
      const list = el.querySelector('.rec-record__causes')!
      const li = document.createElement('li')
      li.className = 'rec-note__line'
      li.textContent = rulesClause
      list.appendChild(li)
      const three = Math.round(el.getBoundingClientRect().height)
      const discThree = disc()
      li.remove()
      return { two, three, discTwo, discThree }
    }, copy.recommendRecordSupersededRules)
    console.log(
      `[U17 record return] ?vault=recold ${REAL.width}x${REAL.height}: superseded card h=${worst.two} ` +
        `(producible worst case, 3 clauses: ${worst.three}) · disclaimer bottom=${worst.discTwo} ` +
        `(worst case: ${worst.discThree}) · frame=${REAL.height}px`,
    )
    // Non-vacuity: the injected clause really did grow the card, so `three` is a measurement.
    expect(worst.three, 'a third clause must make the card taller').toBeGreaterThan(worst.two)
    // …and growing it moved the PROTECTED caveat not one pixel, on either count.
    expect(worst.discThree, 'the tallest producible card must not move the protected caveat').toBe(
      worst.discTwo,
    )
    expect(
      worst.discThree,
      `the caveat ends at ${worst.discThree}px on the worst-case card, past the ${REAL.height}px frame`,
    ).toBeLessThanOrEqual(REAL.height)
    // The surface keeps its r4 idle seat on this face too, and the card keeps the row below the
    // caveat: the placement is standing-independent, not tuned to the short card.
    const rows = await page.evaluate(() => ({
      surface: getComputedStyle(document.querySelector('.recommendation-surface')!).gridRowStart,
      card: getComputedStyle(document.querySelector('.rec-record')!).gridRowStart,
    }))
    expect(rows.surface, 'the superseded card must keep the r4 idle seat as well').toBe('4')
    expect(rows.card, 'the superseded card seats on the row below the caveat, like the holds face').toBe('6')
  })
})
