import { expect, type Page, type Locator, type BrowserContext, type CDPSession } from '@playwright/test'
import {
  test,
  pageDay,
  pinPlantDay,
  pinnedDay,
  pinnedYear,
  REAL,
  REAL_DPR,
  TIER,
  SHOWCASE,
  FLOOR,
  PHONE,
  PHONE_DPR,
  FINAL_TIER_MS,
  SETTLED_RESULT,
  advanceIntakeTo,
  armRefiguringWatch,
  expectRefiguringSeen,
  gotoSeedFinal,
  refiguringLog,
  rewalkSeedTo,
  settleLayout,
} from './reviewSurface'
// THE SHIPPED CATALOG, never re-typed here (the `e2e/caddie-walk.spec.ts:25` precedent). Every
// string this spec injects or reads back is the one the app ships: a spec-local literal would pin a
// reservation, a clause list or a heading against a fiction, and a re-word that overflowed the real
// box would escape the gate silently (U17 §S5 step 14).
import { copy, slots, staticDisclosures, workingCostExtras, type TypedBelowAmount } from '../src/ui/copy'
import { ENGINE_PRICING_LEDGER } from '../src/engine/pricingVersion'

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
 *  - TWO disclaimer mounts, exactly ONE visible — and the swap is keyed to the VERDICT, never to
 *    the tier (council 2026-09-10, wf_d2b1d05a-001). Wherever a committed verdict renders the
 *    in-frame mount, at EVERY width, `main.result[data-inframe-disclaimer]` hides the trailing
 *    one; while COMPUTING the in-frame mount is withheld with the actions row and the trailing
 *    mount stands. A zero-disclaimer frame and a doubled frame are both unrepresentable.
 *    (Until 2026-09-10 both CSS rules lived inside the 68rem query, so below the breakpoint the
 *    in-frame mount was display:none and the trailing footer — the page's LAST element, after the
 *    doors — was the phone's only caveat: the reader met the exits before "this can be wrong".)
 *  - THE SCROLLING TIERS' LAW, which replaces the one-frame promise wherever it cannot be kept —
 *    the phone, any width the reader's browser default makes sub-68rem (in a media query `rem`
 *    reads the BROWSER default, so a 24 px root makes 68rem 1632 px and his 1440 laptop a stacked
 *    device), and the DATE route at every width. It is ORDER + REACHABILITY: the caveat sits
 *    ABOVE the quiet doors in RENDERED GEOMETRY, the doors are LAST, the caveat can be brought
 *    fully into view by a DOCUMENT scroll (never scrollIntoView — a reader's wheel cannot scroll
 *    an overflow:hidden ancestor), and the route's hero verdict NAMES the caveat in
 *    `aria-describedby`. No fit claim is made on any scrolling tier; the one-frame law binds the
 *    ≥68rem two-pane tier only.
 *  - The short-laptop DENSITY tier (≥68rem ∧ ≤840px) steps the frame down on the tier law's ladder
 *    (its one home: tokens.css `--bp-laptop-short`); `assertDensityTier` pins every rung on both
 *    sides of the boundary, and the 917 showcase keeps the generous rhythm.
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
 * EVERY measurement waits for the SETTLED result (`SETTLED_RESULT`, e2e/reviewSurface.ts: the
 * `data-answer-tier="final"` stamp — memoryModel records which recompute tier COMMITTED the rendered
 * answer; Result.tsx mirrors it — with `data-answer-refiguring` absent, no run on newer inputs in
 * flight): the provisional→final sharpen re-keys the band axis and can re-wrap lines, and since W9-R7
 * the date hero wears the provisional tag until the final lands — measuring the provisional frame
 * would pin the frame the user does NOT end up reading. (The gate's OWN adversarial review killed
 * this spec's first draft here: it waited on `.fod-provisional` / `.cs-provisional` reaching count 0
 * — classes the result hero did not render then, a wait that passed vacuously at first paint. The
 * stamp is a real synchronization; the spine's two tiers merely HAPPEN to be byte-identical because
 * the spine run ignores the tier.) The one frame measured INSIDE the re-figuring window is the
 * re-figuring block's, on a preview that holds the window open (its header says why).
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
// `stateNote` (Card 4, the four-faces Caddie walk 2026-09-11): the STANDALONE state clause
// (`.cs-state-note`) renders exactly where the residual does NOT — the household whose residual is
// withheld (health) reads its state clause standalone; the residual-bearing frames (budget / retired /
// nc) read it INSIDE the residual and must render no standalone note (never twice).
// `survivor` (the spending-basis line, ruled 2026-10-14): `budget`'s floor relief holds the inline slot, so
// its survivor card is FOLDED; every other spine seed carries the card inline.
const SPINE_SEEDS = [
  { seed: 'budget', medicareNote: true, stateNote: false, survivor: 'folded' },
  { seed: 'retired', medicareNote: true, stateNote: false, survivor: 'inline' },
  { seed: 'health', medicareNote: false, stateNote: true, survivor: 'inline' },
  // The NC priced face (the state-carrying seed increment): a `retired` (retiredOnTrack) clone in
  // North Carolina. The NC flat-tax drag pushed the state-absent twin's on-track DOWN across the band
  // edge to BORDERLINE until S.L. 2026-41's rate cut was pinned (2026-08-02): NC lands ON-TRACK beside
  // its twin now, so this face no longer proves the borderline two-pane (word + ruin-tail band) holds
  // the one-frame law on a PRICED-STATE household. Its state clause is OUTCOME-independent
  // (statePricedNote = pricedStateForRun off the built params, never the verdict), so the affirmation
  // shape is unchanged by the pin; the clause TEXT is pinned by the `?seed=nc` arm below, never here.
  { seed: 'nc', medicareNote: true, stateNote: false, survivor: 'inline' },
] as const

/** The spine presence companions (insight 029 — geometry over an unresolved/blank page passes
 *  vacuously): the two-pane must be STAMPED, the band panel drawn, the doors offered. */
async function assertResolvedSpine(page: Page): Promise<void> {
  await expect(page.locator('.confidence-reveal[data-twopane]')).toBeVisible()
  await expect(page.locator('.cs-band .band-drawer')).toBeVisible()
  expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
}

/** The DATE route's presence companions — the same law as assertResolvedSpine for the other hero:
 *  the date reveal stamped, BOTH graphs drawn (the fan band + the odds ladder), the doors offered. */
async function assertResolvedDate(page: Page): Promise<void> {
  await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
  await expect(page.locator('.fod-band')).toBeVisible()
  await expect(page.locator('.fod-ladder')).toBeVisible()
  expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
}

/** The date route's resolved NO-DATE reading (`data-framing="no-date"`): the worded how-close line rides and no
 *  ladder is plotted (the Hawk veto, `FuckOffDate.tsx`), and the doors render. The U11 walk's (ae): the risen
 *  family's stale arms crown no date (U11 measured `datesavedrisen`'s: none at the final tier), so the dated
 *  helper above would wait for a band and a ladder that reading never draws. */
async function assertNoDateReading(page: Page): Promise<void> {
  await expect(page.locator('.fod-reveal[data-framing="no-date"]')).toBeVisible()
  await expect(page.locator('.fod-ladder'), 'a no-date hero plots no ladder').toHaveCount(0)
  expect(await page.locator('.result-quiet-row button').count()).toBeGreaterThanOrEqual(2)
}

/** The two routes' hero headings — the elements that must NAME the R13 caveat in
 *  `aria-describedby` (council 2026-09-10 clause 3). Named once so an arm can never be added
 *  with the link half silently switched off. */
const SPINE_VERDICT = 'h2.cs-word'
const DATE_VERDICT = 'h2.fod-headline'

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

/** The layout TIER the page actually rendered — read from the breakpoint itself, never inferred
 *  from the viewport width: in a media query `rem` reads the BROWSER DEFAULT font, so a 24 px
 *  default makes `68rem` 1632 px and his 1440-wide laptop a sub-68rem device (council 2026-09-10).
 *  The literal mirrors tokens.css's --bp-laptop (a source-bind test pins every mirror). */
async function assertTier(page: Page, tier: 'laptop' | 'narrow'): Promise<void> {
  const observed = await page.evaluate(() => {
    // (1) the QUERY the CSS is written against.
    const query = window.matchMedia('(min-width: 68rem)').matches
    // (2) what the page ACTUALLY LAID OUT. `[data-twopane]` is stamped whenever a band resolved —
    // at EVERY width (ConfidenceStatement.tsx / FuckOffDate.tsx), so its mere presence is NOT the
    // tier. The two-pane grid is what the 68rem query turns on: confidence.css :245 /
    // fuckOffDate.css :235 give the stamped reveal `display: grid` with TWO columns inside the
    // query and nothing outside it, so the reveal's RESOLVED column count is the rendered tier.
    // A media-query answer that disagreed with the pixels (a breakpoint mirror drifting, a
    // `display` override) would go unseen if the arm only re-computed the query.
    const reveal = document.querySelector('.confidence-reveal[data-twopane], .fod-reveal[data-twopane]')
    const columns =
      reveal === null
        ? null
        : getComputedStyle(reveal)
            .gridTemplateColumns.split(/\s+/)
            .filter((t) => t !== '' && t !== 'none').length
    return { query, columns, stamped: reveal !== null }
  })
  expect(
    observed.stamped,
    'no resolved reveal is stamped [data-twopane] — the tier read would be over a page that never rendered an answer (insight 029)',
  ).toBe(true)
  expect(
    observed.query,
    `the 68rem query says ${observed.query ? 'two-pane' : 'stacked'}, the arm expected ${tier}`,
  ).toBe(tier === 'laptop')
  // Laptop: EXACTLY the two panes. Narrow: fewer than two — the single column can be `display:
  // grid` with one track or no grid at all (`grid-template-columns: none` ⇒ 0 tracks), and which
  // one is chrome, not law; "not two panes" is the tier fact.
  if (tier === 'laptop') {
    expect(
      observed.columns,
      `the RENDERED tier disagrees with the query: the stamped reveal resolved ${String(observed.columns)} grid column(s), the arm expected two panes`,
    ).toBe(2)
  } else {
    expect(
      observed.columns,
      `the RENDERED tier disagrees with the query: the stamped reveal resolved ${String(observed.columns)} grid column(s) — the arm expected the stacked single column`,
    ).toBeLessThan(2)
  }
}

/** BOTH R13 mounts must exist (the two-mount contract), and exactly ONE is visible — the in-frame
 *  mount on every committed verdict, at every width (council 2026-09-10; until then the in-frame
 *  mount was dark below 68rem and the TRAILING footer, after the doors, was the phone's only
 *  caveat). A zero-disclaimer frame and a doubled frame are equally unrepresentable. The tier is
 *  asserted SEPARATELY (assertTier) — the two stopped implying each other on 2026-09-10. */
async function assertOneVisibleDisclaimer(page: Page, tier: 'laptop' | 'narrow'): Promise<void> {
  await assertTier(page, tier)
  const inFrame = page.locator('footer.disclaimer.disclaimer--in-frame')
  const trailing = page.locator('footer.disclaimer:not(.disclaimer--in-frame)')
  await expect(inFrame, 'the in-frame R13 mount (Result.tsx) is missing').toHaveCount(1)
  await expect(trailing, 'the page-trailing R13 mount (App.tsx) is missing').toHaveCount(1)
  await expect(inFrame, 'the in-frame caveat must be visible on a committed verdict').toBeVisible()
  await expect(trailing, 'the trailing mount must hide behind data-inframe-disclaimer').toBeHidden()
}

/** …the same two R13 mounts, one visible, on the date route's NO-DATE reading (the U11 walk's (ae)). No band
 *  resolves there, so the reveal is never stamped `[data-twopane]` and the tier read above has nothing to read;
 *  the answer's non-vacuity is `assertNoDateReading`'s visible no-date reveal instead (insight 029). */
async function assertOneVisibleDisclaimerNoDate(page: Page): Promise<void> {
  const inFrame = page.locator('footer.disclaimer.disclaimer--in-frame')
  const trailing = page.locator('footer.disclaimer:not(.disclaimer--in-frame)')
  await expect(inFrame, 'the in-frame R13 mount (Result.tsx) is missing').toHaveCount(1)
  await expect(trailing, 'the page-trailing R13 mount (App.tsx) is missing').toHaveCount(1)
  await expect(inFrame, 'the in-frame caveat must be visible on a committed verdict').toBeVisible()
  await expect(trailing, 'the trailing mount must hide behind data-inframe-disclaimer').toBeHidden()
}

/** THE ONE "doors last" WALK, shared by every arm that claims it (the date route's two ORDER
 *  blocks and the scrolling tiers' law below). Until 2026-09-10 two walks carrying the same name
 *  applied different filters: the date blocks skipped `display:none` / `visibility:hidden` /
 *  `position:fixed` chrome and hairlines, the new scrolling walk skipped none of them — so "the
 *  doors are last" meant two different things in one file. It means this:
 *
 *  Every element in `scope` that RENDERS A BOX A READER CAN SEE — excluding the doors row itself,
 *  every ancestor that encloses it (a wrapper legitimately ends where its last child, the doors,
 *  ends), sr-only clips, viewport-anchored chrome (the update toast: not a flow fact) and
 *  hairlines — reports its bottom; the tallest wins. `counted` guards the walk against vacuity
 *  (insight 029): a blank or error page yields near-zero boxes and must never read as "nothing
 *  trails the doors".
 */
async function doorsLastWalk(
  page: Page,
  scope: 'body' | 'main.result' = 'body',
): Promise<{ readonly maxOtherBottom: number; readonly desc: string; readonly counted: number }> {
  return page.evaluate((sel) => {
    const doorsEl = document.querySelector('.result-quiet-row')
    let max = -Infinity
    let desc = 'nothing'
    let counted = 0
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`${sel} *`))) {
      if (doorsEl !== null && (doorsEl.contains(el) || el.contains(doorsEl))) continue
      if (el.closest('.sr-only') !== null) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed')
        continue
      if (el.getClientRects().length === 0) continue // display:contents wrappers render no box
      const r = el.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue // sr-only 1px clips, hairlines
      counted++
      if (r.bottom > max) {
        max = r.bottom
        const cls = el.getAttribute('class')
        desc = `${el.tagName.toLowerCase()}${cls !== null && cls !== '' ? `.${cls.split(/\s+/)[0]}` : ''}`
      }
    }
    return { maxOtherBottom: max, desc, counted }
  }, scope)
}

/** A scrolling-tier answer renders dozens of boxes outside the doors row; a walk that counted
 *  fewer than this measured a broken page, not the order. */
const DOORS_WALK_FLOOR = 20
/** …and the date route's NO-DATE reading (the U11 walk's (ae)), which draws no band and no ladder: measured 14 boxes
 *  at Briggsy's window and 12 on the phone (the headline, the how-close line, the notes, the save card, the caveat).
 *  A blank or error page still counts near zero. */
const NO_DATE_DOORS_WALK_FLOOR = 10

/** THE SCROLLING TIERS' HONESTY LAW — ORDER + REACHABILITY (council 2026-09-10, wf_d2b1d05a-001;
 *  the Hawk's scoped veto). A tier that scrolls by design (the phone; any width the reader's font
 *  makes sub-68rem; the DATE route at EVERY width — both graphs stacked) cannot promise one frame,
 *  so it promises: (1) ORDER — the caveat sits ABOVE the quiet doors in rendered geometry (not
 *  merely DOM order — a grid seat or a CSS reorder could invert the pixels), and the doors are the
 *  LAST thing in the answer: no visible box outside the doors row ends below the doors row's top;
 *  (2) REACHABILITY — the caveat can be brought fully into the viewport by scrolling (order alone
 *  would pass a caveat trapped inside an overflow:hidden ancestor). No proximity ratio: the Hawk
 *  withdrew his own 1.0 × innerHeight bound as a chosen number (insight 065) — the distance is
 *  RECORDED by the caller, never asserted. (3) THE VERDICT NAMES THE CAVEAT: the route's hero
 *  heading — `h2.cs-word` on the spine, `h2.fod-headline` on the date route — carries an
 *  `aria-describedby` that RESOLVES to the in-frame mount's id.
 *
 *  `verdictSelector` is the hero heading itself, never a boolean: `assertCaveatOrderAndReach(page,
 *  false)` was a pre-built silencer (a route with no link could be added by passing `false`, and
 *  the review found exactly that hole waiting on the date route). A caller that genuinely has no
 *  hero heading passes `null` and has to justify it at the call site.
 */
async function assertCaveatOrderAndReach(page: Page, verdictSelector: string | null, walkFloor = DOORS_WALK_FLOOR): Promise<void> {
  const caveat = page.locator('footer.disclaimer.disclaimer--in-frame')
  const doors = page.locator('.result-quiet-row')
  await expect(caveat).toBeVisible()
  await expect(doors).toHaveCount(1)
  // VACUITY (insight 029): the ORDER half compares against the doors row's top, and the row is
  // `display: contents` in single column — its own rect is all zeros, so its geometry is the union
  // of its rendered children. A row that offered NO door would leave that top at Infinity and both
  // ORDER expectations would pass no matter where the caveat sat. Pin the doors here, inside the
  // helper, so no future caller can reach the ORDER law over a row with nothing in it.
  expect(
    await page.locator('.result-quiet-row button').count(),
    'the quiet-door row offers fewer than two doors — the ORDER law would be vacuous',
  ).toBeGreaterThanOrEqual(2)
  const geometry = await page.evaluate(() => {
    const c = document.querySelector('footer.disclaimer.disclaimer--in-frame')!.getBoundingClientRect()
    const doorsEl = document.querySelector('.result-quiet-row')!
    // The doors row is `display: contents` in single column (its own rect is all zeros), so its
    // geometry is the union of its RENDERED descendants — the doors themselves.
    let dTop = Infinity
    let boxed = 0
    for (const el of doorsEl.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect()
      if (r.height > 0) boxed++
      if (r.height > 0 && r.top < dTop) dTop = r.top
    }
    const scrollY = window.scrollY
    return {
      boxed,
      caveatBottom: c.bottom + scrollY,
      doorsTop: dTop + scrollY,
      caveatHeight: c.height,
      innerHeight: window.innerHeight,
      scrollY,
    }
  })
  if (geometry.boxed === 0) {
    throw new Error(
      'the quiet-door row rendered no boxed child — the doors row has no top, so both ORDER ' +
        'assertions would be vacuous (insight 029). Fix the arm or the surface, not this check.',
    )
  }
  expect(
    geometry.caveatBottom,
    `ORDER: the caveat (bottom ${geometry.caveatBottom.toFixed(1)}) must sit above the quiet doors (top ${geometry.doorsTop.toFixed(1)})`,
  ).toBeLessThanOrEqual(geometry.doorsTop + 1)
  // Doors LAST — the ONE shared walk (the same filters the date route's two ORDER blocks apply).
  const trailing = await doorsLastWalk(page, 'body')
  expect(
    trailing.counted,
    'the doors-last walk counted too few boxes — the page did not render (insight 029)',
  ).toBeGreaterThan(walkFloor)
  expect(
    trailing.maxOtherBottom + geometry.scrollY,
    `ORDER: the doors must be LAST — ${trailing.desc} ends below the doors row's top`,
  ).toBeLessThanOrEqual(geometry.doorsTop + 1)
  expect(geometry.caveatHeight, 'REACH: the caveat is taller than the viewport').toBeLessThanOrEqual(
    geometry.innerHeight,
  )
  // REACH: scroll the DOCUMENT (never scrollIntoView — that scrolls an overflow:hidden ancestor
  // programmatically, which a reader's wheel cannot; the M4 mutant proved it passes a clipped
  // caveat) to the caveat's own top, re-measure, and HIT-TEST TWO points: the upper half AND a
  // point 4 px above its BOTTOM edge. One centre point passes an ancestor clip that eats only the
  // caveat's last lines — and the last line is the "validate this with a professional" directive,
  // the half of R13 that tells the reader what to do.
  const reached = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('footer.disclaimer.disclaimer--in-frame')!
    const docTop = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, docTop - 4), behavior: 'instant' as ScrollBehavior })
    const r = el.getBoundingClientRect()
    const describe = (n: Element | null): string =>
      n === null ? 'nothing' : `${n.tagName.toLowerCase()}.${String((n as HTMLElement).className).split(' ')[0]}`
    const x = r.left + r.width / 2
    const upper = document.elementFromPoint(x, r.top + Math.min(r.height / 2, window.innerHeight / 2))
    const nearBottom = document.elementFromPoint(x, r.bottom - 4)
    return {
      top: r.top,
      bottom: r.bottom,
      innerHeight: window.innerHeight,
      upperIsCaveat: upper !== null && (upper === el || el.contains(upper)),
      upperDesc: describe(upper),
      bottomIsCaveat: nearBottom !== null && (nearBottom === el || el.contains(nearBottom)),
      bottomDesc: describe(nearBottom),
      scrolledTo: window.scrollY,
    }
  })
  expect(reached.top, 'REACH: after scrolling the document to it the caveat starts above the window').toBeGreaterThanOrEqual(-1)
  expect(reached.bottom, 'REACH: after scrolling the document to it the caveat ends below the window').toBeLessThanOrEqual(
    reached.innerHeight + 1,
  )
  expect(
    reached.upperIsCaveat,
    `REACH: the point in the caveat's upper half hits ${reached.upperDesc}, not the caveat — an ancestor clips it (document scrolled to ${reached.scrolledTo})`,
  ).toBe(true)
  expect(
    reached.bottomIsCaveat,
    `REACH: the point 4px above the caveat's BOTTOM edge hits ${reached.bottomDesc}, not the caveat — an ancestor clips its last lines, the validate directive among them (document scrolled to ${reached.scrolledTo})`,
  ).toBe(true)
  if (verdictSelector !== null) {
    const link = await page.locator(verdictSelector).getAttribute('aria-describedby')
    const caveatId = await caveat.getAttribute('id')
    // NON-NULL FIRST (insight 029): `null === null` would certify a hero that names nothing
    // against a mount that has no id — an equality over a structurally-absent surface.
    expect(link, `the verdict (${verdictSelector}) carries no aria-describedby at all`).not.toBeNull()
    expect(caveatId, 'the in-frame caveat mount carries no id to be named').not.toBeNull()
    expect(link, `the verdict (${verdictSelector}) must name the caveat in aria-describedby`).toBe(caveatId)
    // …and the reference RESOLVES: an id that names no element is a dangling description.
    await expect(
      page.locator(`#${String(caveatId)}`),
      'the aria-describedby target resolves to no element',
    ).toHaveCount(1)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

/** The reader's browser default font, raised through CDP `Page.setFontSizes` (Chromium-only — this
 *  harness's one project). Falsifiability (insight 016): the root px is pinned to have RISEN before
 *  any geometry is read, so a silently-ignored, renamed or reshaped CDP call reds instead of
 *  measuring the 16 px frame. ORDER matters: the emulation is per-target, so it is sent on the
 *  cheap bare `/` navigation and the seed route is navigated AFTER it. */
async function raiseDefaultFont(
  page: Page,
  context: BrowserContext,
  px: number,
): Promise<{ at16: number; cdp: CDPSession }> {
  await page.goto('/')
  const at16 = await rootFontPx(page)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: px, fixed: px } })
  // The root measured HERE, on the bare `/`, is not the pin: the emulation is per-target and the
  // seed route is navigated after it, so the only measurement that proves the arm read a raised
  // page is one taken on the page the arm measures — assertRootRose, at the call site.
  return { at16, cdp }
}

/** The CURRENT page's root font size in px. */
function rootFontPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
}

/** Falsifiability for the CDP emulation (insight 016), measured on the page the arm is about to
 *  read: the root must have RISEN above the browser default, so a silently-ignored, renamed or
 *  reshaped `Page.setFontSizes` reds instead of quietly measuring the 16 px frame. Returns the
 *  raised value so the caller can log or annotate the exact root it measured — the 20 px arm's
 *  annotation is the artifact the owed fork gets decided from, and a bare "> 16" in the log
 *  names no regime. (Every caller used to re-type these three lines; one home now.) */
async function assertRootRose(page: Page, at16: number): Promise<number> {
  const raised = await rootFontPx(page)
  expect(raised, `Page.setFontSizes never took (root ${at16}px → ${raised}px)`).toBeGreaterThan(at16)
  return raised
}

/** The rows `assertDensityTier` reads only where the calling arm has already asserted the fact that
 *  puts them on the frame (insight 029: a row the frame must carry fails loudly when it is missing). */
type DensityRows = {
  /** `budget`: the floor relief holds the inline slot, so the survivor card is FOLDED (SPINE_SEEDS):
   *  the relief card with its step-down, the closed fold's row and summary, and the fold's inner body. */
  readonly fold?: boolean
  /** The remembered-record card (the arm asserted it on the frame). */
  readonly record?: boolean
  /** `?vault=stale` / `?vault=statestale`: those arms read the note frames' grid and subordinates
   *  row-gaps themselves (statestale's pin is W4's; stale's 2px is written by round 5 AND W4, so it
   *  kills neither alone: see its comment), so the helper leaves them alone there. */
  readonly skipNoteGaps?: boolean
}

/** The short-laptop density tier, read on BOTH sides of its boundary: the spec's ONE home for the values
 *  every rung sets (the tier's LAW lives once, in tokens.css `--bp-laptop-short`'s docblock: whitespace,
 *  then leading, then a borrowed register; never the hero, never a new size). 'short' is ≥68rem ∧ ≤840px
 *  (REAL and TIER), 'tall' the showcase above it, where every rule is dark. Deleting a rung's rule reds
 *  HERE on every platform (insight 075: the fold arms alone red only where the platform's text metrics
 *  run out of slack). Gaps and paddings read exact strings (`rowGap`, never the `gap` shorthand); leading
 *  reads ratio bands. The rungs (the 1440×731 re-point plan's names), each as its tall → short value:
 *   - .result padding-block 40 → 32 (2026-07-08), outside the ladder since (it holds the eyebrow slot);
 *   - W1, the survivor cards' top padding 24 → 4 (the relief card and the inline card; the closed fold's
 *     row and the fold's inner body 12 → 4, read open or closed: a computed length);
 *   - W2, the survivor stack gap 12 → 4, in the open card and the fold's summary alike;
 *   - W3, the in-frame caveat's top padding 8 → 4;
 *   - W4, the note frames' grid and subordinates row-gaps → 2 (the typical frames carry 2 on both sides
 *     since round 5; the non-typical ones 4 above the tier);
 *   - W5, the record card's padding-block 12 → 8 and gap 8 → 4;
 *   - W7, the band drawer's block padding 20/24 → 16/16 (the inline 24 never moves: it is the two-pane
 *     honesty floor's input), its pull's margin 12 → 8, its legend's margin 16 → 8 and gap 8 → 4;
 *   - L1, the survivor eyebrow, context and step-down leading body 1.55 → snug 1.4.
 *  L2 (the Medicare pair and the state note) is `assertNoteLeading`'s, on both tiers. */
async function assertDensityTier(page: Page, tier: 'short' | 'tall', rows: DensityRows = {}): Promise<void> {
  const short = tier === 'short'
  const read = await page.evaluate(() => {
    const reveal = document.querySelector('.confidence-reveal[data-twopane]')
    const within = (sel: string): Element[] => (reveal === null ? [] : Array.from(reveal.querySelectorAll(sel)))
    const style = (el: Element | null | undefined) => (el === null || el === undefined ? null : getComputedStyle(el))
    const ratio = (el: Element): number => {
      const s = getComputedStyle(el)
      return parseFloat(s.lineHeight) / parseFloat(s.fontSize)
    }
    const has = (sel: string): boolean => reveal !== null && reveal.querySelector(sel) !== null
    const survivors = within('.survivor')
    const cards = survivors.filter((el) => el.closest('.survivor-fold') === null)
    const drawer = document.querySelector('.cs-band .band-drawer')
    const subordinates = reveal?.querySelector(':scope > .reveal__subordinates')
    const record = style(reveal?.querySelector('.rec-record'))
    return {
      stamped: reveal !== null,
      resultPaddingTop: style(document.querySelector('main.result'))?.paddingBlockStart ?? null,
      cardPaddingTop: cards.map((el) => getComputedStyle(el).paddingTop),
      foldBodyPaddingTop: survivors.filter((el) => el.closest('.survivor-fold') !== null).map((el) => getComputedStyle(el).paddingTop),
      foldPaddingTop: within('.survivor-fold').map((el) => getComputedStyle(el).paddingTop),
      foldSummaryGap: within('.survivor-fold__summary').map((el) => getComputedStyle(el).rowGap),
      revealGap: within('.survivor-reveal').map((el) => getComputedStyle(el).rowGap),
      eyebrowLeading: within('.survivor__eyebrow').map(ratio),
      // the cards' own context and step-down (the folded card's body is read for padding only: it is
      // not rendered while the fold is closed)
      contextLeading: cards.flatMap((el) => Array.from(el.querySelectorAll('.survivor__context'))).map(ratio),
      stepdownLeading: cards.flatMap((el) => Array.from(el.querySelectorAll('.survivor__stepdown'))).map(ratio),
      reliefStepdowns: within('.floor-readout .survivor__stepdown').length,
      caveatPaddingTop: style(document.querySelector('footer.disclaimer.disclaimer--in-frame'))?.paddingTop ?? null,
      drawer:
        drawer === null
          ? null
          : {
              top: getComputedStyle(drawer).paddingTop,
              bottom: getComputedStyle(drawer).paddingBottom,
              left: getComputedStyle(drawer).paddingLeft,
              right: getComputedStyle(drawer).paddingRight,
              pull: style(drawer.querySelector('.band-drawer__pull'))?.marginBottom ?? null,
              legendTop: style(drawer.querySelector('.band-legend'))?.marginTop ?? null,
              legendGap: style(drawer.querySelector('.band-legend'))?.rowGap ?? null,
            },
      noteFrame: has('.cs-medicare-note, .cs-state-note, .cs-staleness-note'),
      typical: has('.cs-medicare-residual--typical'),
      gridRowGap: style(reveal)?.rowGap ?? null,
      subordinatesRowGap: style(subordinates)?.rowGap ?? null,
      record: record === null ? null : { top: record.paddingTop, bottom: record.paddingBottom, gap: record.rowGap },
    }
  })
  const at = `(density tier ${short ? 'ON' : 'OFF'})`
  const exact = (actual: string | null | undefined, onShort: string, onTall: string, what: string): void => {
    expect(actual, `${what} ${at}`).toBe(short ? onShort : onTall)
  }
  const leading = (ratios: readonly number[], what: string): void => {
    for (const r of ratios) {
      const [lo, hi] = short ? [1.35, 1.45] : [1.5, 1.6]
      expect(r, `${what} leading ${at}: ${short ? '--leading-snug ~1.4' : 'body ~1.55'}`).toBeGreaterThan(lo)
      expect(r, `${what} leading ${at}: ${short ? '--leading-snug ~1.4' : 'body ~1.55'}`).toBeLessThan(hi)
    }
  }
  expect(read.stamped, 'no two-pane reveal is stamped — the density read would be vacuous (insight 029)').toBe(true)
  exact(read.resultPaddingTop, '32px', '40px', '.result padding-block-start')
  // W1 / W2 / L1 — the survivor cards (every spine frame carries at least one)
  expect(read.cardPaddingTop.length, 'the frame carries no survivor card — W1 would read nothing').toBeGreaterThan(0)
  for (const p of read.cardPaddingTop) exact(p, '4px', '24px', 'W1: the survivor card padding-top')
  expect(read.revealGap.length, 'the frame carries no survivor stack — W2 would read nothing').toBeGreaterThan(0)
  for (const g of read.revealGap) exact(g, '4px', '12px', 'W2: the survivor stack row-gap')
  expect(read.eyebrowLeading.length, 'the frame carries no survivor eyebrow — L1 would read nothing').toBeGreaterThan(0)
  leading(read.eyebrowLeading, 'L1: the survivor eyebrow')
  leading(read.stepdownLeading, 'L1: the survivor step-down')
  if (rows.fold === true) {
    expect(read.foldPaddingTop.length, 'the folded frame carries no survivor fold').toBe(1)
    exact(read.foldPaddingTop[0], '4px', '12px', 'W1: the closed fold row padding-top')
    expect(read.foldSummaryGap.length, 'the folded frame carries no fold summary').toBe(1)
    exact(read.foldSummaryGap[0], '4px', '12px', 'W2: the fold summary row-gap')
    expect(read.foldBodyPaddingTop.length, 'the folded frame carries no inner survivor body').toBe(1)
    exact(read.foldBodyPaddingTop[0], '4px', '12px', "W1: the fold's inner body padding-top")
    expect(read.reliefStepdowns, "the floor relief's step-down must render on the folded frame").toBeGreaterThan(0)
    expect(read.eyebrowLeading.length, 'the folded frame carries BOTH eyebrows (the relief card and the fold summary)').toBe(2)
  } else {
    expect(read.contextLeading.length, 'the inline survivor card carries no context paragraph').toBeGreaterThan(0)
    leading(read.contextLeading, 'L1: the survivor context')
  }
  // W3 — the in-frame caveat
  exact(read.caveatPaddingTop, '4px', '8px', 'W3: the in-frame caveat padding-top')
  // W7 — the band drawer
  expect(read.drawer, 'the band drawer is not on the frame').not.toBeNull()
  exact(read.drawer!.top, '16px', '20px', 'W7: the drawer padding-top')
  exact(read.drawer!.bottom, '16px', '24px', 'W7: the drawer padding-bottom')
  exact(read.drawer!.left, '24px', '24px', "W7: the drawer's inline padding (the honesty floor's input)")
  exact(read.drawer!.right, '24px', '24px', "W7: the drawer's inline padding (the honesty floor's input)")
  exact(read.drawer!.pull, '8px', '12px', "W7: the drawer pull's margin-bottom")
  exact(read.drawer!.legendTop, '8px', '16px', "W7: the drawer legend's margin-top")
  exact(read.drawer!.legendGap, '4px', '8px', "W7: the drawer legend's row-gap")
  // W4 — the note frames' grid and subordinates row-gaps
  if (rows.skipNoteGaps !== true) {
    expect(read.noteFrame, 'W4 reads a note frame (a Medicare pair, a state note or the staleness echo), and this frame carries none').toBe(true)
    const tall = read.typical ? '2px' : '4px'
    exact(read.gridRowGap, '2px', tall, `W4: the ${read.typical ? 'ON-typical' : 'non-typical'} note frame's grid row-gap`)
    exact(read.subordinatesRowGap, '2px', tall, `W4: the ${read.typical ? 'ON-typical' : 'non-typical'} note frame's subordinates row-gap`)
  }
  // W5 — the record card
  if (rows.record === true) {
    expect(read.record, 'the record card is not on the frame').not.toBeNull()
    exact(read.record!.top, '8px', '12px', 'W5: the record card padding-top')
    exact(read.record!.bottom, '8px', '12px', 'W5: the record card padding-bottom')
    exact(read.record!.gap, '4px', '8px', 'W5: the record card row-gap')
  }
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

/** Card 4 — the STANDALONE state clause renders exactly where the residual does not (never twice).
 *  Presence is the whole pin: the words are the composer's, unit-pinned in stateTaxDisclosure.test;
 *  the matrix (route × cohort × pricing) is pinned in ConfidenceStatement.test + FuckOffDate.test. */
async function assertStateNote(page: Page, expected: boolean): Promise<void> {
  const note = page.locator('.cs-state-note')
  if (expected) {
    await expect(note, 'a household whose residual is withheld reads its state clause standalone').toHaveCount(1)
    await expect(note).toBeVisible()
  } else {
    await expect(note, 'a residual-bearing frame carries its state clause INSIDE the residual — no standalone note').toHaveCount(0)
  }
}

/** The survivor card's spending-basis line (Briggsy's sentence, ruled 2026-10-14) — its presence companion
 *  (insight 029): jsdom loads no stylesheet and a missing line only makes the fit EASIER, so a CSS rule that
 *  hid it would pass every other gate. The words are the catalog slot's own (`slots.verdictSurvivorSpendBasis`,
 *  figures wildcarded — the per-seed figures are pinned once, in survivorSpendingBasisSeedGate.test.tsx).
 *  'inline': the card is on the frame, so the line is visible. 'folded' (`budget` — the floor relief holds
 *  the inline slot): the line is in the closed fold, hidden until it opens; this opens the fold, so call it
 *  AFTER the frame is measured. */
async function assertSurvivorBasis(page: Page, placement: 'inline' | 'folded'): Promise<void> {
  const FIGURE = '\u0000'
  const shape = new RegExp(
    '^' +
      slots
        .verdictSurvivorSpendBasis(FIGURE, FIGURE)
        .replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch)
        .split(FIGURE)
        .join('[1-9][0-9,]*') +
      '$',
  )
  const line = page.locator('.survivor__basis')
  await expect(line, 'the survivor card carries exactly ONE spending-basis line').toHaveCount(1)
  if (placement === 'folded') {
    await expect(line, 'the folded card keeps the line inside the closed fold').toBeHidden()
    await page.locator('.survivor-fold__summary').click()
  }
  await expect(line, 'the spending-basis line must be VISIBLE on the card (never hidden by a stylesheet)').toBeVisible()
  await expect(line, 'the line reads the ruled sentence, with two real figures').toHaveText(shape)
}

/** The Medicare pair's and the standalone state note's LEADING, on both sides of the density tier. The
 *  Linux wrap-drift reservoir (CI 2026-07-11, run 29170580301) paid for the magnitude-honest residual in
 *  leading (body 1.55 → snug 1.4, round 2); ROUND 5 stepped the ON-TYPICAL frames (the appended
 *  bi-directional typical sentence: the modifier class) on to --leading-tight (~1.3) at every two-pane
 *  height; the 1440×731 re-point's L2 (2026-11-20) brings every other note frame to tight INSIDE the short
 *  tier. So: 'short' (REAL, TIER) reads tight on every note; 'tall' (the showcase) reads tight on a typical
 *  frame and snug on the rest, so round 2's rule keeps a reader. Pinned by computed style, so deleting a
 *  rule goes red on EVERY platform (insight 075's standing encoding), never only under ubuntu's taller text
 *  metrics. Every note the frame carries is read; a frame that carries none fails loudly (insight 029). */
async function assertNoteLeading(page: Page, tier: 'short' | 'tall'): Promise<void> {
  const notes = await page.evaluate(() => {
    const typical = document.querySelector('.cs-medicare-residual--typical') !== null
    return Array.from(document.querySelectorAll('.cs-medicare-note, .cs-medicare-residual, .cs-state-note')).map((el) => {
      const cs = getComputedStyle(el)
      return { cls: el.className, ratio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), typical }
    })
  })
  expect(notes.length, 'the frame carries no Medicare pair or state note — the leading read would be vacuous').toBeGreaterThan(0)
  for (const n of notes) {
    if (tier === 'short' || n.typical) {
      const why = tier === 'short' ? 'inside the short tier every note rides --leading-tight (~1.3), L2' : 'the ON-TYPICAL pair rides --leading-tight (~1.3), round 5'
      expect(n.ratio, `.${n.cls}: ${why}`).toBeGreaterThan(1.25)
      expect(n.ratio, `.${n.cls}: ${why}`).toBeLessThan(1.35)
    } else {
      expect(n.ratio, `.${n.cls}: above the short tier the note rides --leading-snug (~1.4), round 2`).toBeGreaterThan(1.35)
      expect(n.ratio, `.${n.cls}: above the short tier the note rides --leading-snug (~1.4), round 2`).toBeLessThan(1.45)
    }
  }
}

// ── the spine frame matrix: {budget, retired, health, nc} × {REAL, TIER, SHOWCASE} ────────────

for (const { seed, medicareNote, stateNote, survivor } of SPINE_SEEDS) {
  test.describe(`?seed=${seed} — the one-frame fit law`, () => {
    test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
      test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
      test(`${seed}: everything but the doors fits one frame`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertMedicareNote(page, medicareNote)
        await assertStateNote(page, stateNote)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertFrameFits(page, true)
        await assertSurvivorBasis(page, survivor) // after the frame: the folded arm opens the fold
        // The density pins read AFTER the fit (a deleted rung reds on its own line with the fold check
        // already passed) and after the fold opens. REAL sits inside the short tier (tokens.css
        // --bp-laptop-short carries the tier's law).
        if (medicareNote || stateNote) await assertNoteLeading(page, 'short')
        await assertDensityTier(page, 'short', { fold: survivor === 'folded' })
      })
    })

    test.describe(`at a DPR-1 laptop inside the short tier (${TIER.width}×${TIER.height} @ 1dpr)`, () => {
      test.use({ viewport: TIER })
      test(`${seed}: everything but the doors fits one frame`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertFrameFits(page, true)
        // 800 ≤ 840 — the tier fires here too
        if (medicareNote || stateNote) await assertNoteLeading(page, 'short')
        await assertDensityTier(page, 'short', { fold: survivor === 'folded' })
      })
    })

    test.describe(`at the tall showcase (${SHOWCASE.width}×${SHOWCASE.height})`, () => {
      test.use({ viewport: SHOWCASE })
      test(`${seed}: FULL fit (doors included) and the density tier stays off`, async ({ page }) => {
        await gotoSeedFinal(page, seed)
        await assertResolvedSpine(page)
        await assertOneVisibleDisclaimer(page, 'laptop')
        await assertFrameFits(page, false)
        // 917 > 840 — the showcase keeps the generous rhythm, and every rung's tall side is pinned here
        if (medicareNote || stateNote) await assertNoteLeading(page, 'tall')
        await assertDensityTier(page, 'tall', { fold: survivor === 'folded' })
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
// on this reference machine at 80s (nc → held, which short-circuited at the mint until the 2026-08-02
// rate pin — that floor is GONE, nc COMMITS now) to 200s+ (surplus → recommended), FAR past this
// harness's per-test budget (120 s then, 180 s now). The fit gate is built for the fast SPINE tier
// (`data-answer-tier="final"`, seconds), NOT the solve channel (no live path-count seam — S5 deferred,
// wall #2 fixes every displayed figure at `solverMinBPaths`). So the committed / held OUTCOMES are engine-proven where
// tractable — solveDispatch.test.ts drives the REAL builder → REAL engine at the fast test counts
// (nc → recommended since the rate pin, fl → recommended) — and their RENDER SHAPES in
// RecommendationSurface.test.tsx; this real-browser arm owns the two facts only Chromium can settle: the pending
// tell's live presence, and the CLS alignment of the reserved well to the real committed grade lockup.
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

        // THE S2→S3 CLS ALIGNMENT: inject the real committed grade lockup (no solve — a live solve was
        // 80–200s+ single-worker, recorded 2026-07-22 above; the pool cut it to ~30 s on his laptop's
        // dev server (caddie-walk.spec.ts, 2026-10-03), but a 4-core runner pools at P = 2 and is
        // unmeasured), measure it under the real CSS at this tier, and pin that the pending well ALIGNS
        // to it and the grade word holds ONE line.
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
        // …and not grossly OVER-reserved (a large empty well breathing over the whole solve).
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
// Like the CLS arm above, a LIVE committed solve measured 80–200s+ on the single worker (2026-07-22,
// past this harness's budget; ~30 s on his laptop on the 2026-10-03 worker pool at v8, unmeasured under
// this parallel harness and on CI's P = 2), so this
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
          // rest wrapper. Injected (no live solve — 80–200s+ single-worker per the 2026-07-22 record,
          // ~30 s pooled at v8 on his laptop, unmeasured at a runner's P = 2) exactly as the CLS arm
          // injects its grade lockup; the viz box's presence triggers the inner two-pane.
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
// gate would stay green while the real control overflowed. `e2e/caddie-walk.spec.ts:25` is the
// precedent for importing src into an e2e spec.
//
// INJECTED, not solved: a live committed solve was 80–200s single-worker (recorded 2026-07-22
// above); the pool measured ~30 s at v8 on his laptop's dev server (caddie-walk.spec.ts, 2026-10-03)
// and is unmeasured at a 4-core runner's P = 2, so it stays out of this harness's budget. The
// injected DOM is the verbatim `RecommendationSurface.tsx` render for each arm.
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
// one MA-$0), so the pair rides --leading-snug above the short tier and --leading-tight inside it
// (L2, the 1440×731 re-point); both callers' windows sit inside it, so both read tight.

/** The priced-state spine face: pin the one-frame law PLUS the rendered state clause the matrix
 *  never reads. Both callers (REAL and TIER) sit inside the short density tier, so the note leading
 *  and the density rungs read their short side at both. */
async function assertPricedSpineFrame(page: Page, seed: string, clausePins: readonly string[]): Promise<void> {
  await gotoSeedFinal(page, seed)
  await assertResolvedSpine(page)
  await assertMedicareNote(page, true)
  await assertOneVisibleDisclaimer(page, 'laptop')
  for (const pin of clausePins) {
    await expect(
      page.locator('.cs-medicare-residual'),
      `the narrowed residual must carry the state clause: "${pin}"`,
    ).toContainText(pin)
  }
  await assertFrameFits(page, true)
  await assertSurvivorBasis(page, 'inline')
  // after the fit, so a deleted rung reds on its own line with the fold check already passed
  await assertNoteLeading(page, 'short')
  await assertDensityTier(page, 'short')
}

// nc: the residual-TEXT pin at the REAL tier (the matrix proves the frame; this proves the clause
// survives onto the hero — a BORDERLINE one until the 2026-08-02 rate pin — the exact insight-033
// question this increment exists to answer: the affirm+residual set is outcome-scoped in copy but
// outcome-INDEPENDENT in gating, so a band-crossing verdict would still name the state — no priced-state seed crosses the band today).
test.describe(`?seed=nc — the NC state clause on the priced residual (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('the hero still names North Carolina (on-track since the 2026-08-02 rate pin; it read borderline at mint); the unpriced monolith clause is gone', async ({ page }) => {
    await gotoSeedFinal(page, 'nc')
    await assertResolvedSpine(page)
    await assertMedicareNote(page, true)
    const residual = page.locator('.cs-medicare-residual')
    await expect(residual, 'the NC affirmation must swap into the residual').toContainText(
      'Your North Carolina state income tax is already counted in this answer, on top of your spending',
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
  test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('pa: everything but the doors fits; the residual names Pennsylvania (untaxed)', async ({ page }) => {
      await assertPricedSpineFrame(page, 'pa', PA_PINS)
    })
  })
  test.describe(`at a DPR-1 laptop inside the short tier (${TIER.width}×${TIER.height} @ 1dpr)`, () => {
    test.use({ viewport: TIER })
    test('pa: everything but the doors fits; the residual names Pennsylvania (untaxed)', async ({ page }) => {
      await assertPricedSpineFrame(page, 'pa', PA_PINS)
    })
  })
})

test.describe('?seed=fl — the constitutional-$0 priced clause + one-frame fit', () => {
  const FL_PINS = ['Florida has no state income tax'] as const
  test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('fl: everything but the doors fits; the residual names the Florida $0 fact', async ({ page }) => {
      await assertPricedSpineFrame(page, 'fl', FL_PINS)
    })
  })
  test.describe(`at a DPR-1 laptop inside the short tier (${TIER.width}×${TIER.height} @ 1dpr)`, () => {
    test.use({ viewport: TIER })
    test('fl: everything but the doors fits; the residual names the Florida $0 fact', async ({ page }) => {
      await assertPricedSpineFrame(page, 'fl', FL_PINS)
    })
  })
})

// elsewhere: the ANSWERED-but-unpriced face (the cards' noted coverage gap — 'elsewhere' is an
// explicit roster member, NOT in PRICED_STATES, so the run reduces byte-identically to the
// state-absent twin and the residual reads the shipped monolith VERBATIM, no state named).
test.describe(`?seed=elsewhere — the answered-but-unpriced monolith, no state clause (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
    await assertSurvivorBasis(page, 'inline')
  })
})

// healthnc: THE PRICED PRE-65 WITNESS (Card 4, the four-faces Caddie walk 2026-09-11) — the `health`
// household (61/59, the ACA door) in North Carolina. The residual is structurally WITHHELD here
// (showMedicarePricedNote: a pre-65 member reaches the Healthcare door), and the residual carried the
// verdict's ONLY state clause — so until Card 4 this household's verdict said nothing about state tax
// while its run priced NC. The clause now arrives by the standalone note: NAMES the state, ships with
// its narrowing tail (never affirm-alone), exactly ONE clause on the page, and the frame still fits.
test.describe(`?seed=healthnc — the priced pre-65 household's standalone state clause (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('no residual, ONE standalone clause naming North Carolina, and the frame fits', async ({ page }) => {
    await gotoSeedFinal(page, 'healthnc')
    await assertResolvedSpine(page)
    await assertMedicareNote(page, false)
    await assertStateNote(page, true)
    const note = page.locator('.cs-state-note')
    await expect(note, 'the priced arm names the state').toContainText('North Carolina')
    // The tail is pinned by its CATALOG constant, not a lexeme: the string is the pilot's draft
    // routed to Briggsy's words, and his swap must not red a gate whose law (never affirm-alone)
    // still holds. An emptied constant would make the pin vacuous, so its non-emptiness is asserted.
    expect(copy.verdictStatePricedDoorTail.trim().length, 'an empty tail IS affirm-alone').toBeGreaterThan(0)
    await expect(note, 'the priced arm ships WITH its narrowing tail — never affirm-alone').toContainText(copy.verdictStatePricedDoorTail)
    await expect(note, 'the unpriced words die for a priced household').not.toContainText('isn’t priced yet')
    // Exactly ONE state clause on the whole rendered verdict (the matrix law, in the real DOM).
    const clauses = await page
      .locator('main.result')
      .evaluate((el) => (el.textContent ?? '').match(/isn’t priced yet|is already counted in this answer|no state income tax/g)?.length ?? 0)
    expect(clauses, 'one state clause on the verdict — never zero, never two').toBe(1)
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertFrameFits(page, true)
    await assertSurvivorBasis(page, 'inline')
  })
})

// ── the date route (?seed=dip): scrolls BY DESIGN — its contract is ORDER ─────────────────────

test.describe(`?seed=dip — the date route's order contract (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('graphs → in-frame disclaimer → quiet doors, doors last', async ({ page }) => {
    await gotoSeedFinal(page, 'dip')
    // Presence companions: the two-pane stamped, BOTH graphs drawn (the fan band + the odds
    // ladder — the U10 hard-gate surface), the doors offered.
    await expect(page.locator('.fod-reveal[data-twopane]')).toBeVisible()
    // Card 4: a pre-65 (stateless) date household's residual is withheld, so its state clause
    // arrives by the STANDALONE note in the .fod-note register — the walk's seed-date landing
    // rendered zero state clauses before this fix.
    const stateNote = page.locator('.fod-note.cs-state-note')
    await expect(stateNote, 'the unpriced state clause renders standalone on the date claim').toHaveCount(1)
    await expect(stateNote).toContainText('isn’t priced yet')
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
    // THE ONE shared walk (doorsLastWalk) — the same law the scrolling tiers' helper applies.
    const trailing = await doorsLastWalk(page, 'body')
    expect(
      trailing.counted,
      'the doors-last walk counted too few boxes — the page did not render (insight 029)',
    ).toBeGreaterThan(DOORS_WALK_FLOOR)
    expect(
      trailing.maxOtherBottom,
      `content renders BELOW the quiet doors — doors must be last (${trailing.desc})`,
    ).toBeLessThanOrEqual(doors.y + doors.height + 0.5)
  })
})

// ── the all-65+ still-working date route (?seed=date65): priced Medicare, no false "unpriced" ──
// The insight-080 fix, live on the date route: dateSearch.ts:261 forces healthcareEnabled true on
// every candidate, so a still-working all-65+ household PRICES Medicare even with no ACA door. The
// retired age-predicate called this exact household "Medicare not priced" over numbers Medicare had
// already moved; the surface now names it PRICED (affirmation + narrowed residual, shipped together)
// and never a false unpriced claim. The date route scrolls by design, so this arm pins the ORDER
// contract plus the priced-in naming, never a full one-frame fit.

test.describe(`?seed=date65 — priced Medicare on the date route, no false "unpriced" note (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
      page.getByText('are already counted in this answer, on top of your spending'),
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

test.describe(`?seed=datenc — the NC clause on the date residual + the order contract (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
      page.getByText('Your North Carolina state income tax is already counted in this answer, on top of your spending'),
      'the NC state clause must render on the date residual',
    ).toBeVisible()
    // Card 4: the residual carries the clause on this all-65+ household — no standalone note (never twice).
    await expect(page.locator('.cs-state-note'), 'the residual-bearing date frame renders no standalone note').toHaveCount(0)

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
    // THE ONE shared walk (doorsLastWalk) — the same law the scrolling tiers' helper applies.
    const trailing = await doorsLastWalk(page, 'body')
    expect(
      trailing.counted,
      'the doors-last walk counted too few boxes — the page did not render (insight 029)',
    ).toBeGreaterThan(DOORS_WALK_FLOOR)
    expect(
      trailing.maxOtherBottom,
      `content renders BELOW the quiet doors — doors must be last (${trailing.desc})`,
    ).toBeLessThanOrEqual(doors.y + doors.height + 0.5)
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
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('exactly 3 legend rows render with the spine band', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    const rows = page.locator('.cs-band .band-legend__row')
    await expect(rows).toHaveCount(3)
    for (const row of await rows.all()) await expect(row).toBeVisible()
  })
})

// ── the scrolling tiers: ORDER + REACHABILITY, never one frame (council 2026-09-10) ──────────
// The phone at the reader's default font, and the laptop at a raised default (68rem reads the
// BROWSER default, so at 24 px both 1440 and 1280 render the stacked tier). Until 2026-09-10 the
// phone arm asserted the trailing mount visible and the in-frame mount dark — certifying the
// inversion (caveat AFTER the doors, on the phone since July) as the contract. Now: tier asserted
// first, one visible mount (the in-frame one), the caveat above the doors, the doors last, the
// caveat reachable by scroll, the verdict naming the caveat. No fit assertion on any scrolling tier.

test.describe(`the phone tier (${PHONE.width}×${PHONE.height}) — ORDER + REACHABILITY at the default font`, () => {
  test.use({ viewport: PHONE })
  test('retired: one visible caveat, above the doors, doors last, reachable', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    await assertOneVisibleDisclaimer(page, 'narrow')
    await assertCaveatOrderAndReach(page, SPINE_VERDICT)
  })

  // THE DATE ROUTE ON THE PHONE. The spine arm above proves the law for `h2.cs-word`; this route
  // has its OWN hero (`h2.fod-headline`), its own two-graph column, and its own render block —
  // and it is the route that scrolls at EVERY width, so a caveat that fell below the doors here
  // would be the inversion the council killed, live on the one surface guaranteed to scroll.
  test('dip (the date route): one visible caveat, above the doors, doors last, reachable', async ({ page }) => {
    await gotoSeedFinal(page, 'dip')
    await assertResolvedDate(page)
    await assertOneVisibleDisclaimer(page, 'narrow')
    await assertCaveatOrderAndReach(page, DATE_VERDICT)
  })
})

// ── the reader's raised default font (CDP Page.setFontSizes) — the two regimes ─────────────────
// (a) 20 px: Chrome's one-click "Large". 68rem is 1360 px there, so his 1440 laptop STAYS two-pane
//     with 1.25× rem ink against the same 731 px budget — the binding case (the two-pane tier holds
//     every root up to 21.2 px on his window: 1440 / 68). FIRST MEASURED 2026-09-10 on the Dell's
//     1536×791 @ 2.5: budget / retired / nc RED the one-frame law — the save slot ended at 806–871 px
//     and the PROTECTED in-frame caveat at 877–936 px against 791 (86–145 px past the fold); health
//     fit. RE-RECORDED 2026-11-20 at REAL 1440×731 @ 2 (the re-point, with the short tier's density
//     rungs in place): budget's caveat ends at 878 px (its CTA at 777, the save slot at 818),
//     retired's and nc's at 804 px (the save slot at 743) — 73–147 px past the 731 px fold; health
//     still fits (offenders=none). That is the PRODUCT finding the council
//     pre-registered as a NEW FORK (register: "The app on someone else's device"), never a density
//     regime (rejected on mechanics) and never a `test.fail()`. Until the fork is decided this arm
//     RECORDS: it pins the root rose, the tier is two-pane, one caveat is visible, and logs the
//     walk — it does NOT assert the fit (a red gate would stall every other arm behind a product
//     decision that is Briggsy's). The assertion returns with the fork's ruling.
// (b) 24 px: 68rem is 1632 px, so 1440 and 1280 both render the stacked tier — the scrolling law.
//     The 2026-09-08 measurement asserted the one-frame law on this tier and red all eight arms
//     against the trailing footer; the magnitude is still RECORDED here (frameReport, non-asserting)
//     so the instrument survives, but the assertion is ORDER + REACHABILITY.
// The 16 px control for both families is the spine matrix above (the same seeds, the same walk).
for (const { seed } of SPINE_SEEDS) {
  test.describe(`?seed=${seed} — the one-frame law at a 20 px default (${REAL.width}×${REAL.height}, two-pane)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test(`${seed}: everything but the doors fits one frame at a 20 px root`, async ({ page, context }) => {
      const { at16, cdp } = await raiseDefaultFont(page, context, 20)
      await gotoSeedFinal(page, seed)
      const at20 = await assertRootRose(page, at16)
      await assertResolvedSpine(page)
      await assertOneVisibleDisclaimer(page, 'laptop')
      const report = await frameReport(page, true)
      console.log(
        `[20px-root fit] seed=${seed} ${REAL.width}x${REAL.height} root=${at16}→${at20}px: counted=${report.counted} offenders=${
          report.offenders.length === 0 ? 'none' : report.offenders.map((o) => `${o.desc}@${o.bottom}`).join(', ')
        }`,
      )
      // RECORDED, NOT ASSERTED — the fork is filed (see the block comment above). The walk floor
      // still guards vacuity: a page that did not render cannot pass as "measured".
      expect(report.counted, 'frame walk counted too few elements — page did not render').toBeGreaterThan(
        WALK_FLOOR,
      )
      test.info().annotations.push({
        // The ROOT is named in the annotation, not only in the log: this artifact is what the
        // owed fork gets decided from, and "the 20 px arm" is a label — the measured root is the
        // regime. (A `> 16` pin alone would let a 17 px emulation file itself as "20 px".)
        type: '20px-root one-frame law (RECORDED — fork owed)',
        description: `root ${at16}px → ${at20}px at ${REAL.width}×${REAL.height}: ${report.offenders.length} element(s) past the ${REAL.height}px fold: ${
          report.offenders.map((o) => `${o.desc}@${o.bottom}`).join(', ') || 'none'
        }`,
      })
      await cdp.detach()
    })
  })

  for (const vp of [REAL, TIER] as const) {
    const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
    test.describe(`?seed=${seed} — ORDER + REACHABILITY at a 24 px default (${vp.width}×${vp.height}, stacked)`, () => {
      test.use({ viewport: vp, ...scale })
      test(`${seed}: the caveat above the doors, doors last, reachable — no fit claim`, async ({ page, context }) => {
        const { at16, cdp } = await raiseDefaultFont(page, context, 24)
        await gotoSeedFinal(page, seed)
        const at24 = await assertRootRose(page, at16)
        await assertResolvedSpine(page)
        await assertOneVisibleDisclaimer(page, 'narrow')
        // INSTRUMENT, not oracle: the one-frame magnitude on the stacked tier, recorded for the log.
        const report = await frameReport(page, true)
        console.log(
          `[24px-root instrument] seed=${seed} ${vp.width}x${vp.height} root=${at16}→${at24}px: counted=${report.counted} belowFold=${report.offenders.length} caveatBottom=${
            report.offenders.find((o) => o.desc.includes('disclaimer'))?.bottom ?? 'in-frame'
          }`,
        )
        await assertCaveatOrderAndReach(page, SPINE_VERDICT)
        await cdp.detach()
      })
    })
  }
}

// THE DATE ROUTE AT A 24 px DEFAULT — the same two widths as the spine family. The spine arms
// above prove the law on the confidence hero; this route reaches the stacked tier by TWO
// independent paths (its own single-column chrome, and the 68rem query the raised root moves),
// carries its own grid (fuckOffDate.css) and its own hero heading. A regression that re-seated
// the caveat below the doors in fuckOffDate.css alone would pass every spine arm in this file.
for (const vp of [REAL, TIER] as const) {
  const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
  test.describe(`?seed=dip — ORDER + REACHABILITY at a 24 px default (${vp.width}×${vp.height}, stacked)`, () => {
    test.use({ viewport: vp, ...scale })
    test('dip: the caveat above the doors, doors last, reachable — no fit claim', async ({ page, context }) => {
      const { at16, cdp } = await raiseDefaultFont(page, context, 24)
      await gotoSeedFinal(page, 'dip')
      const at24 = await assertRootRose(page, at16)
      await assertResolvedDate(page)
      await assertOneVisibleDisclaimer(page, 'narrow')
      const report = await frameReport(page, true)
      console.log(
        `[24px-root instrument] seed=dip ${vp.width}x${vp.height} root=${at16}→${at24}px: counted=${report.counted} belowFold=${report.offenders.length}`,
      )
      await assertCaveatOrderAndReach(page, DATE_VERDICT)
      await cdp.detach()
    })
  })
}

test.describe(`reduced motion — the 24 px scrolling law holds without the entrance choreography (${REAL.width}×${REAL.height})`, () => {
  // `page.emulateMedia`, NOT `test.use({ reducedMotion })`: under this harness the context option
  // measured `matchMedia('(prefers-reduced-motion: reduce)')` FALSE (2026-09-26, the spend-lane arm's
  // diagnostic) — this arm's premise was silently unmet. The premise is now ASSERTED, never assumed.
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('retired: the caveat above the doors, doors last, reachable', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const { at16, cdp } = await raiseDefaultFont(page, context, 24)
    await gotoSeedFinal(page, 'retired')
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'the reduced-motion premise').toBe(true)
    await assertRootRose(page, at16)
    await assertResolvedSpine(page)
    await assertOneVisibleDisclaimer(page, 'narrow')
    await assertCaveatOrderAndReach(page, SPINE_VERDICT)
    await cdp.detach()
  })
})

// ── THE COMPUTING FRAME: exactly ONE caveat while the answer is still being worked out ────────
// app.css's swap rule is `main.result[data-inframe-disclaimer] ~ .disclaimer { display: none }`.
// The ATTRIBUTE QUALIFIER is the whole safety property: Result.tsx withholds the in-frame mount
// with the entire actions row while computing and stamps the attribute in the same breath, so a
// computing frame carries NO attribute and the page-trailing mount must stand. Drop the qualifier
// to a bare `main.result ~ .disclaimer` and the crunch window renders ZERO caveats — "Working it
// out…" with nothing on the page saying the answer can be wrong — and every arm in this file
// still passes, because every other arm measures a COMMITTED verdict where both spellings agree.
// Nothing in any browser test saw this until now (the review's one P1).
//
// The probe is installed BEFORE navigation and fires on the first frame `main.result` exists, so
// the window is caught deterministically instead of raced: a date seed's crunch is long (~60 s to
// final) but the provisional lands much sooner, and a `waitFor` would be a coin flip.
type ComputingProbe = {
  readonly stamped: boolean
  readonly inFrameCount: number
  readonly trailingCount: number
  readonly trailingVisible: number
  readonly inFrameVisible: number
}

async function probeComputingFrame(page: Page, seed: string): Promise<ComputingProbe> {
  await page.addInitScript(() => {
    const store = window as unknown as { __r13Probe?: unknown }
    const shown = (el: Element): boolean => {
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden'
    }
    const capture = (): boolean => {
      const main = document.querySelector('main.result')
      if (main === null) return false
      const inFrame = Array.from(document.querySelectorAll('footer.disclaimer.disclaimer--in-frame'))
      const trailing = Array.from(
        document.querySelectorAll('footer.disclaimer:not(.disclaimer--in-frame)'),
      )
      store.__r13Probe = {
        stamped: main.hasAttribute('data-inframe-disclaimer'),
        inFrameCount: inFrame.length,
        trailingCount: trailing.length,
        trailingVisible: trailing.filter(shown).length,
        inFrameVisible: inFrame.filter(shown).length,
      }
      return true
    }
    const obs = new MutationObserver(() => {
      if (capture()) obs.disconnect()
    })
    const start = (): void => {
      if (!capture()) obs.observe(document.documentElement, { subtree: true, childList: true })
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
  })
  await page.goto(`/?seed=${seed}`)
  const handle = await page.waitForFunction(
    () => (window as unknown as { __r13Probe?: ComputingProbe }).__r13Probe ?? null,
    undefined,
    { timeout: 30_000 },
  )
  return (await handle.jsonValue()) as ComputingProbe
}

function assertComputingFrameHasExactlyOneCaveat(probe: ComputingProbe): void {
  // The frame we caught IS the crunch: no attribute, no in-frame mount. (If a future change
  // stamped the attribute at first paint this reds here rather than certifying the wrong frame.)
  expect(probe.stamped, 'the first main.result frame already carried data-inframe-disclaimer — this is not the computing window').toBe(false)
  expect(probe.inFrameCount, 'the in-frame mount must be WITHHELD with the actions row while computing').toBe(0)
  // …and the caveat the reader can actually see is the page-trailing one, standing alone.
  expect(probe.trailingCount, 'the page-trailing R13 mount (App.tsx) is missing').toBe(1)
  expect(
    probe.trailingVisible,
    'ZERO caveats while computing — the trailing mount is hidden and no in-frame mount exists. app.css’s swap must be qualified by data-inframe-disclaimer.',
  ).toBe(1)
  expect(probe.inFrameVisible + probe.trailingVisible, 'exactly ONE caveat is visible while computing').toBe(1)
}

for (const vp of [PHONE, REAL] as const) {
  const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
  test.describe(`the COMPUTING frame at ${vp.width}×${vp.height} — one caveat stands during the crunch`, () => {
    test.use({ viewport: vp, ...scale })
    test('dip: no data-inframe-disclaimer, no in-frame mount, the trailing caveat visible', async ({ page }) => {
      assertComputingFrameHasExactlyOneCaveat(await probeComputingFrame(page, 'dip'))
    })
  })
}

// ── W9-R7: the re-figuring window (`docs/plans/features/answered-draft-build-spec.md`, U5) ─────────
// After an edit on the answer page the store holds the shown answer while a run on the new inputs is in
// flight, and the page says so (U4): a line in the hero's eyebrow slot, a clause on the date band's caption,
// one line in the panel echo. Two kinds of arm:
//  - THE FRAME, on `?preview=refiguring&seed=<key>` (src/ui/preview/RefiguringPreview.tsx): the real app on
//    the seed with every run after its first final held, so the window's frame stands still to be measured.
//    Live it lasts one run (the `retired` edit below cleared in ~120 ms on the Lenovo; a date provisional
//    ~2 s), too short to measure without racing it. The spine arms prove R5's fold at the two-pane tier: the
//    line is ONE line inside the frame and above the verdict, the verdict and the R13 disclaimer stand where
//    they stood before the edit (the slot overlays `.result`'s top padding there, b9-5's landmine), and the
//    whole frame still fits. The date arms prove the line and the caption's clause render and overlap
//    nothing. The phone arms prove the in-flow slot keeps its order (above the hero, over nothing); the hero
//    moving down there is walk 10's read (U4's watch item (h)), never a law here.
//  - THE SIGNAL, live on `?seed=retired`: a spending edit in the panel raises `data-answer-refiguring`, and it
//    clears in the same commit that puts up the edit's own answer — the shared watch (`armRefiguringWatch`)
//    seeing a SPINE panel edit, which dispatches the final tier alone (its tier never leaves "final").

/** A box the re-figuring arms read: viewport-relative edges, its height, and whether it is one line box
 *  (no taller than one and a half of its own computed line-height). */
type RefigBox = { readonly top: number; readonly bottom: number; readonly height: number; readonly oneLine: boolean }

async function refigBoxes(page: Page, sels: Readonly<Record<string, string>>): Promise<Readonly<Record<string, RefigBox | null>>> {
  return page.evaluate((s) => {
    const out: Record<string, RefigBox | null> = {}
    for (const [k, sel] of Object.entries(s)) {
      const el = document.querySelector(sel)
      if (el === null) {
        out[k] = null
        continue
      }
      const r = el.getBoundingClientRect()
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      out[k] = { top: r.top, bottom: r.bottom, height: r.height, oneLine: Number.isFinite(lh) && r.height <= lh * 1.5 }
    }
    return out
  }, sels)
}

function refigPresent(box: RefigBox | null | undefined, what: string): RefigBox {
  expect(box, `${what} is not on the page`).toBeTruthy()
  return box!
}

/** One route's reading of the held window: the hero's line and heading, the heading's other reading box
 *  (the spine's verdict lockup, the date's headline itself), the line's words. */
const REFIG_ROUTES = {
  spine: { seed: 'budget', line: '.cs-refiguring', heading: SPINE_VERDICT, anchor: '.cs-verdict', words: copy.answerRefiguringVerdict },
  date: { seed: 'date', line: '.fod-refiguring', heading: DATE_VERDICT, anchor: DATE_VERDICT, words: copy.answerRefiguringDate },
} as const

const REFIG_FRAME = {
  disclaimer: 'footer.disclaimer.disclaimer--in-frame',
  drawer: '.fod-band .band-drawer',
  caption: '.fod-band__tracknote',
  echo: '[role="dialog"] .ap-echo',
} as const

/**
 * Drive the preview into the held window and settle it: the settled landing (its boxes read), the panel
 * opened (the echo's box read), one engine-input edit — the survivor spending share, 75 ↔ 70 — with the flag
 * SEEN (a presence the edit's dispatch mints, never an absence), the echo read again, the panel closed, and
 * the page settled with the flag still up. The caller reads the window's boxes, then `expectStillHeld`.
 */
async function enterHeldWindow(
  page: Page,
  route: (typeof REFIG_ROUTES)[keyof typeof REFIG_ROUTES],
): Promise<{
  readonly before: Readonly<Record<string, RefigBox | null>>
  readonly captionBefore: string | null
  readonly echoBefore: RefigBox
  readonly echoAfter: RefigBox
  readonly echoText: string | null
}> {
  await page.goto(`/?preview=refiguring&seed=${route.seed}`)
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleLayout(page)
  await expect(page.locator(route.line), 'a settled landing shows no re-figuring line').toHaveCount(0)
  const before = await refigBoxes(page, { anchor: route.anchor, ...REFIG_FRAME })
  // Read only where it renders: a locator action on an absent node waits out the test's whole budget.
  const caption = page.locator(REFIG_FRAME.caption)
  const captionBefore = (await caption.count()) > 0 ? await caption.textContent() : null
  await page.locator('[data-door="assumptions"]').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await settleLayout(page)
  const echoBefore = refigPresent((await refigBoxes(page, { echo: REFIG_FRAME.echo })).echo, 'the panel echo')
  const field = dialog.getByLabel(copy.assumptionSurvivorRatioLabel)
  const now = (await field.inputValue()).replace(/[^0-9]/g, '')
  await field.fill(now === '70' ? '65' : '70')
  await field.press('Tab')
  await expect(page.locator('main.result[data-answer-refiguring]'), 'the edit raised no re-figuring flag').toBeAttached({ timeout: 30_000 })
  await settleLayout(page)
  const echoAfter = refigPresent((await refigBoxes(page, { echo: REFIG_FRAME.echo })).echo, 'the panel echo')
  const echoText = await dialog.locator('.ap-echo').textContent()
  await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
  await expect(dialog).toBeHidden()
  await settleLayout(page)
  return { before, captionBefore, echoBefore, echoAfter, echoText }
}

/** Read AFTER the window's boxes: the flag still stands and the shown answer is still the old final, so every
 *  box was read inside the window (the flag cannot fall and rise again without another edit). */
async function expectStillHeld(page: Page): Promise<void> {
  await expect(page.locator('main.result[data-answer-refiguring][data-answer-tier="final"]'), 'the preview let the window close before the read').toHaveCount(1)
}

/** The line names itself first in the heading's description, the R13 caveat after it (U4, KTD6). */
async function expectHeadingDescribedByLine(page: Page, route: (typeof REFIG_ROUTES)[keyof typeof REFIG_ROUTES]): Promise<void> {
  const lineId = await page.locator(route.line).getAttribute('id')
  const caveatId = await page.locator(REFIG_FRAME.disclaimer).getAttribute('id')
  expect(lineId, 'the re-figuring line carries no id to be named').toBeTruthy()
  expect(caveatId, 'the in-frame caveat carries no id to be named').toBeTruthy()
  await expect(page.locator(route.heading)).toHaveAttribute('aria-describedby', `${String(lineId)} ${String(caveatId)}`)
}

for (const vp of [REAL, TIER] as const) {
  const scale = vp === REAL ? { deviceScaleFactor: REAL_DPR } : {}
  test.describe(`the re-figuring window, held (${vp.width}×${vp.height}, two-pane)`, () => {
    test.use({ viewport: vp, ...scale })

    test('spine (?seed=budget): the line is one line above the verdict, and the verdict and the R13 disclaimer do not move', async ({ page }) => {
      const route = REFIG_ROUTES.spine
      const { before, echoBefore, echoAfter, echoText } = await enterHeldWindow(page, route)
      await assertOneVisibleDisclaimer(page, 'laptop')
      await expect(page.locator(route.line)).toHaveText(route.words)
      await expect(page.locator(route.line)).toBeVisible()
      const after = await refigBoxes(page, { line: route.line, anchor: route.anchor, disclaimer: REFIG_FRAME.disclaimer })
      const line = refigPresent(after.line, 'the re-figuring line')
      const verdict = refigPresent(after.anchor, 'the verdict lockup')
      const caveat = refigPresent(after.disclaimer, 'the in-frame R13 disclaimer')
      const verdictBefore = refigPresent(before.anchor, 'the settled verdict lockup')
      const caveatBefore = refigPresent(before.disclaimer, 'the settled R13 disclaimer')
      expect(line.oneLine, `the line wraps (${line.height.toFixed(1)} px): its slot holds one line`).toBe(true)
      expect(line.top, 'the line climbs above the page top').toBeGreaterThanOrEqual(0)
      expect(line.bottom, 'the line overlaps the verdict').toBeLessThanOrEqual(verdict.top + 0.5)
      expect(Math.abs(verdict.top - verdictBefore.top), `the verdict moved ${(verdict.top - verdictBefore.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
      expect(Math.abs(caveat.top - caveatBefore.top), `the R13 disclaimer moved ${(caveat.top - caveatBefore.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
      expect(caveat.bottom, 'the R13 disclaimer left the frame').toBeLessThanOrEqual(vp.height)
      await assertFrameFits(page, true)
      await expectHeadingDescribedByLine(page, route)
      expect(echoText, 'the panel echo says the answer is being figured again').toBe(copy.assumptionEchoRefiguring)
      expect(Math.abs(echoAfter.height - echoBefore.height), `the echo's reserved box changed height (${echoBefore.height.toFixed(1)} → ${echoAfter.height.toFixed(1)} px)`).toBeLessThanOrEqual(0.5)
      await expectStillHeld(page)
    })

    test('date (?seed=date): the line sits above the headline, and the caption adds its clause over nothing', async ({ page }) => {
      const route = REFIG_ROUTES.date
      const { before, captionBefore, echoText } = await enterHeldWindow(page, route)
      await assertResolvedDate(page)
      await assertTier(page, 'laptop')
      await expect(page.locator(route.line)).toHaveText(route.words)
      await expect(page.locator(route.line)).toBeVisible()
      expect(captionBefore, 'the settled band carries no caption').toBeTruthy()
      await expect(page.locator(REFIG_FRAME.caption)).toHaveText(`${String(captionBefore)} ${copy.answerRefiguringCaption}`)
      const after = await refigBoxes(page, { line: route.line, anchor: route.anchor, drawer: REFIG_FRAME.drawer, caption: REFIG_FRAME.caption })
      const line = refigPresent(after.line, 'the re-figuring line')
      const headline = refigPresent(after.anchor, 'the headline')
      const headlineBefore = refigPresent(before.anchor, 'the settled headline')
      const drawer = refigPresent(after.drawer, 'the band')
      const caption = refigPresent(after.caption, 'the band caption')
      expect(line.oneLine, `the line wraps (${line.height.toFixed(1)} px): its slot holds one line`).toBe(true)
      expect(line.top, 'the line climbs above the page top').toBeGreaterThanOrEqual(0)
      expect(line.bottom, 'the line overlaps the headline').toBeLessThanOrEqual(headline.top + 0.5)
      expect(Math.abs(headline.top - headlineBefore.top), `the headline moved ${(headline.top - headlineBefore.top).toFixed(1)} px`).toBeLessThanOrEqual(0.5)
      expect(caption.top, 'the caption overlaps the band').toBeGreaterThanOrEqual(drawer.bottom - 0.5)
      await expectHeadingDescribedByLine(page, route)
      expect(echoText, 'the panel echo says the answer is being figured again').toBe(copy.assumptionEchoRefiguring)
      await expectStillHeld(page)
    })
  })
}

test.describe(`the re-figuring window, held (phone ${PHONE.width}×${PHONE.height}, stacked)`, () => {
  test.use({ viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true })
  for (const key of ['spine', 'date'] as const) {
    test(`${key} (?seed=${REFIG_ROUTES[key].seed}): the line sits in the flow above the hero, over nothing`, async ({ page }) => {
      const route = REFIG_ROUTES[key]
      await enterHeldWindow(page, route)
      await assertTier(page, 'narrow')
      await expect(page.locator(route.line)).toHaveText(route.words)
      await expect(page.locator(route.line)).toBeVisible()
      const after = await refigBoxes(page, { line: route.line, anchor: route.anchor })
      const line = refigPresent(after.line, 'the re-figuring line')
      const hero = refigPresent(after.anchor, key === 'spine' ? 'the verdict lockup' : 'the headline')
      expect(line.top, 'the line climbs above the page top').toBeGreaterThanOrEqual(0)
      expect(line.bottom, 'the line overlaps the hero below it').toBeLessThanOrEqual(hero.top + 0.5)
      await expectHeadingDescribedByLine(page, route)
      await expectStillHeld(page)
    })
  }
})

test.describe(`the re-figuring signal, live (?seed=retired, ${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('a panel spending edit raises data-answer-refiguring over the old verdict, and it clears in the commit that puts up the new one', async ({ page }) => {
    await gotoSeedFinal(page, 'retired')
    await assertResolvedSpine(page)
    await page.locator('[data-door="assumptions"]').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const field = dialog.getByLabel(copy.spendLabel, { exact: true })
    await expect(field, '`retired` enters its $78,000 a year by the month').toHaveValue('6,500')
    await armRefiguringWatch(page)
    // $9,500 a month ($114,000 a year) takes `retired` from on track to off track (measured 2026-11-20), so the
    // verdict's own words move in the commit that clears the flag. A raise that left them still would leave
    // that commit unseen: the arm then fails below, and wants a larger raise, never a weaker check.
    await field.click()
    await field.press('ControlOrMeta+a')
    await field.pressSequentially('9500')
    await field.blur()
    await expect(field).toHaveValue('9,500')
    await expectRefiguringSeen(page, 'the live re-figuring arm')
    await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
    await expect(dialog).toBeHidden()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
    const log = await refiguringLog(page)
    const first = log[0]
    expect(first, 'the watch read nothing').toBeTruthy()
    expect(first!.refiguring, 'the watch was armed on a page already re-figuring').toBe(false)
    const rose = log.findIndex((r) => r.refiguring === true)
    const fell = log.findIndex((r, i) => i > rose && r.refiguring === false)
    const story = log.map((r) => `${r.t}ms ${String(r.refiguring)}/${String(r.tier)} "${r.verdict}"`).join(' · ')
    expect(rose, `the flag never rose: ${story}`).toBeGreaterThan(0)
    expect(fell, `the flag never cleared: ${story}`).toBeGreaterThan(rose)
    for (const r of log.slice(rose, fell)) {
      expect(r.verdict, `while the flag stood the hero showed an answer other than the one from before the edit: ${story}`).toBe(first!.verdict)
    }
    expect(log[fell]!.verdict, `the flag cleared with the old verdict still up, so no new answer committed there: ${story}`).not.toBe(first!.verdict)
    expect(log[fell]!.tier, `a spine panel edit dispatches the final tier alone: ${story}`).toBe('final')
    expect(log.slice(fell).every((r) => r.refiguring === false), `the flag rose again with no second edit: ${story}`).toBe(true)
  })
})

// ── U12: the AssumptionPanel's OWN vertical extent (the F4 council mandate) ───────────────────
// "Door count stays 5" proves the RESULT frame fits; it says nothing about the panel. The full
// assumption inventory (two sections, ~20 rows) is a density surface no other arm measures: the
// family shell caps the sheet at 94dvh and the content scrolls chrome-lessly INSIDE it — if a
// regression lets the dialog itself outgrow the viewport, the footer (Close / the re-walk) walks
// off-screen with no scrollbar to reach it. The assertion is on the DIALOG BOX, not the content.

test.describe(`the assumption panel's vertical extent (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
    const affirm = page.getByRole('button', { name: /still about right/i })
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
    // PLUS the engine-pricing ledger's lines (the engine-domain council, 2026-09-27): the plant saves
    // ~760 days back (the LOCAL epoch-day, the plant's own basis), so every `reprice` row shipped
    // after that save speaks ONE method line (tax + Medicare here), and the full doctor strips the
    // extras marker, so the Medicare-spending re-confirm always asks — never "rules", never on the echo.
    // The count is derived in a unit arm — `devSeeds.test.ts` "'stale' composes EXACTLY the
    // lines…" — so a re-bucketing fails there first, in a second, not here in ninety; the ledger term
    // below is that arm's own oracle, so neither pin drifts with the calendar.
    // The plant's today is the pinned day (the gate's calendar, `e2e/reviewSurface.ts`), never Node's clock.
    const plantSavedAt = pinnedDay(page) - 760
    const methodLine = ENGINE_PRICING_LEDGER.some(
      (r) => r.kind === 'reprice' && r.sinceEpochDay > plantSavedAt && r.families.some((fam) => fam === 'tax' || fam === 'medicare'),
    )
      ? 1
      : 0
    await expect(page.locator('.reentry-notes p')).toHaveCount(2 + methodLine + 1)
    await expect(page.getByText(copy.stalenessReconfirmMedicareSpending)).toBeVisible()
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
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({
      timeout: FINAL_TIER_MS,
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
    // loop). Pin the COMPUTED styles. TWO RULES WRITE THIS 2px AT REAL (the 1440×731 re-point's
    // review, 2026-11-20): round 5's on-typical step (2px at every two-pane height) and W4 (2px on
    // every note frame inside the short tier). Deleting either one alone leaves 2px here, so this pin
    // kills neither rule by itself: round 5 is killed by the spine matrix's tall read on the
    // on-typical `budget` at SHOWCASE, W4 by the spine arms' short reads. It still reds if both
    // go, or if the echo frame stops being a two-pane grid with a 2px rhythm.
    const echoGaps = await page
      .locator('.confidence-reveal[data-twopane]')
      .evaluate((reveal) => ({
        rowGap: getComputedStyle(reveal).rowGap,
        // row-gap is the operative axis on the column-flex subordinates (and dodges the
        // gap-shorthand serialization question entirely).
        subordinatesRowGap: getComputedStyle(reveal.querySelector('.reveal__subordinates')!).rowGap,
      }))
    // ROUND 5: the stale vault is an ON-TYPICAL frame (doctorStaleVault strips the fork —
    // the recompute funds typical-both), so its chain gaps ride the 2px typical tier, and W4 agrees.
    expect(echoGaps.rowGap, 'the ON-TYPICAL note-frame row-gap is 2px (round 5, and W4 inside the short tier)').toBe('2px')
    expect(
      echoGaps.subordinatesRowGap,
      'the ON-TYPICAL subordinates row-gap is 2px (round 5, and W4 inside the short tier)',
    ).toBe('2px')
    await assertOneVisibleDisclaimer(page, 'laptop')

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
    await assertSurvivorBasis(page, 'inline')
    // REAL sits inside the short tier (tokens.css --bp-laptop-short carries the tier's law); read after
    // the fit. The echo-gap pins above own this frame's W4 row-gaps, so the helper skips them here.
    await assertDensityTier(page, 'short', { skipNoteGaps: true })
  })
})

// ── the state-tax staleness return (?vault=statestale — the state-carrying seed increment) ────
// The state-tax analog of ?vault=stale, on the LIGHT doctor (F2 supersession, 2026-07-15): the
// NC-priced spine household saved ~150d ago with startCalendarYear UNTOUCHED (2026) and the tax /
// healthcare / blend stamps FRESH — ONLY the state profile diverged. So the re-entry gate fires the
// stalenessStateTax clock in ISOLATION (an NC rate step must never read as a federal / healthcare /
// blend change), and — unlike the full doctor that stranded a 2024 anchor below simulate.ts's
// priced-state lower bound (R19 calm indeterminate) — the affirm recompute resolves a REAL verdict
// (borderline at mint; on-track since the 2026-08-02 rate pin) whose residual names North Carolina. This
// is the only live route to the stalenessStateTax note AND to the state clause on a writable stale return.

test.describe(`the state-tax staleness return (?vault=statestale) — the isolated clock + the NC-clause echo frame (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('the gate fires the state-tax clock in isolation, decision pair in-frame; the echoed hero names NC and holds the one-frame law', async ({ page }) => {
    await page.goto('/?vault=statestale')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the statestale plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    // THE GATE FRAME: the decision pair sits in the first frame (a below-fold affirm strands the
    // survivor at a dead-looking screen).
    const affirm = page.getByRole('button', { name: /still about right/i })
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
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({
      timeout: FINAL_TIER_MS,
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
    ).toContainText('Your North Carolina state income tax is already counted in this answer, on top of your spending')

    // THE ECHO WHITESPACE BUDGET (insight 075) — pinned by COMPUTED style so a deleted
    // `:has(.cs-staleness-note)` rule goes red on EVERY platform, never only under CI's taller
    // metrics. UNLIKE ?vault=stale (on-typical — the full doctor strips the extras fork, so its
    // gaps step to the 2px round-5 tier at every two-pane height): the LIGHT doctor KEEPS the base's
    // mixed-provenance extras, so statestale is a NON-typical staleness-echo frame — the round-3
    // --space-1 (4px) tier above the short density tier, stepped to 2px inside it by W4 (the
    // 1440×731 re-point, confidence.css's short-tier block). REAL sits inside the short tier.
    const echoGaps = await page
      .locator('.confidence-reveal[data-twopane]')
      .evaluate((reveal) => ({
        rowGap: getComputedStyle(reveal).rowGap,
        subordinatesRowGap: getComputedStyle(reveal.querySelector('.reveal__subordinates')!).rowGap,
      }))
    expect(echoGaps.rowGap, 'the NON-typical note-frame row-gap steps to 2px inside the short tier (W4)').toBe('2px')
    expect(
      echoGaps.subordinatesRowGap,
      'the NON-typical subordinates row-gap steps to 2px inside the short tier (W4)',
    ).toBe('2px')
    await assertOneVisibleDisclaimer(page, 'laptop')

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
    await assertSurvivorBasis(page, 'inline')
    // REAL sits inside the short tier (tokens.css --bp-laptop-short carries the tier's law); read after
    // the fit. The echo-gap pins above own this frame's W4 row-gaps, so the helper skips them here.
    await assertDensityTier(page, 'short', { skipNoteGaps: true })
  })
})

// ── the pay check's unlock lines (?vault=wyclock · ?vault=datecoststale — U10; build 2's two witnesses) ──
// `wyclock` is `date` saved under the PREVIOUS working-years vintage (the light doctor), so the
// working-years clock fires; `datecoststale` is the stale-W witness planted as a vault, so KTD21's line
// fires (an input re-confirm, never a rules line) — since b9-7 the W step's own stale sentence framed by
// the gate's lead ($84,000 said yes to, $78,000 now), never the figure-less fallback.
// Build 2 (R12) adds two answer lines, each on an undoctored seed planted as a vault: `datesavedstale` is
// `datecoststale` with "All of it" stored at $16,985 before the spending moved, so W's own line carries the
// clause naming in dollars what is not added while W is stale; `datesavedmoved` stored $16,985 and then got a
// raise, so W stays fresh and the moved line speaks alone ($16,985 answered at, $27,537 now). Each must be
// the gate's ONLY note, by name, with the decision pair in the first frame — the `statestale` isolation law
// — and its sibling negative is aimed at a live key (insight 086). The affirm lands the date route's
// resolved reading, whose standing slot (`.cs-paycheck-note`) speaks the same cause's line, or nothing; the
// date route scrolls by design, so past the gate the arm pins the order contract (the `datestale`
// precedent), never a full one-frame fit.
//
// The figures: $84,000 / $78,000 are `datecoststale`'s quotes (its W confirmed at `date`'s spending, then the
// spending lowered); $16,985 is `date`'s year-0 Left over, hand-derived (`workingYearCredit.test.ts`: pay
// 150,000 − payroll tax 11,475 − tax on outside income 17,540 − deposits 20,000 − W 84,000), which a stale W
// still prints (R4: the engine runs on the last W given); $27,537 is `datesavedmoved`'s after its raise to
// $165,000, hand-derived from the primaries by the build-2 record's `year0check.mts` (pay 165,000 − payroll
// 12,622.50 − tax 20,840 − deposits 20,000 − W 84,000 = 27,537.50, a surplus rounding down).
//
// THE FORM (council `wf_22858e04-f7a`, U11 walk 6's fix round): a note with parts is a BLOCK — `div.note-parts`, the
// opening as a `<p>`, then a `<dl>` of `div>dt+dd` (labels with no colon of their own), and on the Result only the door
// as the last dt/dd (its lead `<p>`, the cost `<ul>`, its tail `<p>`, then the button). Its `textContent` has no space
// between a dt and its dd, so every joined compare below reads `innerText` (`useInnerText`: a newline between blocks,
// which the matcher's whitespace normalization reads as one space). A note with no parts stays its old single `<p>`.
// THE GATE'S DOOR left the notes: `section.reentry-door`, the next element sibling of `.save-actions`, drawn only where
// the tab can save — its heading, then one `<p>`: the scope sentence (the affirm button's description) and the route.
//
// STILL OWED (the council asked for it; no seed or vault carries four buckets): a read-back arm on a four-bucket
// household, where the balances' read-back is tallest and the door below the buttons has the least room in frame.
const STALE_W_QUOTE = slots.workingCostStaleQuote('84,000', '78,000')
/** The Result door's cost list: the W help's own items. No seed here carries a budget or a priced state, so the
 *  state-tax item rides after the local-tax one. */
const STALE_W_EXTRAS = workingCostExtras(true)
/** The gate's door words (`section.reentry-door`), on EVERY stale arm where the tab can save: the heading, the scope
 *  sentence (neither gate button changes the figure; the affirm button's description), and the route (where each
 *  leads, naming the Result door's own label) — "confirm or change" where the spending fell (the W row's Keep door is
 *  real), "update" where it rose past the yes. */
interface GateDoorWords {
  readonly heading: string
  readonly scope: string
  readonly route: string
}
const CONFIRM_GATE_DOOR: GateDoorWords = {
  heading: slots.workingCostStaleDoorHeadingConfirm('84,000'),
  scope: slots.workingCostStaleGateScopeConfirm('84,000'),
  route: slots.workingCostStaleGateRoute(copy.stalenessPayCheckCta),
}
const UPDATE_GATE_DOOR: GateDoorWords = {
  heading: slots.workingCostStaleDoorHeadingUpdate('84,000'),
  scope: slots.workingCostStaleGateScopeUpdate('84,000'),
  route: slots.workingCostStaleGateRoute(copy.stalenessPayCheckCtaUpdate),
}
/** The Result's door (its last dt/dd), for a "saved" answer waiting on W: the heading (the gate's, word for word), the
 *  sentences before the list, the list, the sentences after it, and the button's label (the dd's last child). */
interface ResultDoorWords {
  readonly heading: string
  readonly lead: readonly string[]
  readonly items: readonly string[]
  readonly tail: readonly string[]
  readonly cta: string
}
const resultDoorText = (d: ResultDoorWords): string => [d.heading, ...d.lead, ...d.items, ...d.tail].join(' ')
// Council `wf_7fa86902-35c` (U11 walk 4), drawn as a block since `wf_22858e04-f7a`: a "saved" answer waiting on W
// reads, after its note, a lead, "This answer now" (after work it already uses the spending, the stored $16,985
// dated, why none of it is added, in the act's verb, and — where `none` does not already say it — why no smaller
// amount either), and on the risen arms "If a working year costs $X". No budget on these seeds, so the after-work
// figure is exact (no "about").
const savedNow = (spending: string, none: string, why?: string): readonly string[] => [
  copy.workingCostStaleLabelNow,
  slots.workingCostStaleAfterWork(spending, true),
  slots.workingCostStaleLeftOverAnswered('16,985'),
  none,
  ...(why === undefined ? [] : [why]),
]
const STALE_W_SAVED_LINE = [
  STALE_W_QUOTE,
  copy.workingCostStaleEitherWayConfirm,
  ...savedNow('78,000', slots.workingCostStaleLeftOverNoneConfirm('16,985', '84,000'), copy.workingCostStaleNoGuess),
].join(' ')
/** The fallen arm's Result door ("confirm or change"): the hold sentence ends on the list; after it, the $6,000 the
 *  held figure leaves above the $78,000 quote, the press sentence, then each choice with its condition first. */
const STALE_W_SAVED_RESULT_DOOR: ResultDoorWords = {
  heading: CONFIRM_GATE_DOOR.heading,
  lead: [copy.workingCostStaleDoorHold],
  items: STALE_W_EXTRAS,
  tail: [
    slots.workingCostStaleDoorMore('84,000', '6,000', '78,000'),
    slots.workingCostStaleResultDoorConfirm(copy.stalenessPayCheckCta),
    // U11 walk 8's W8-R12 (c): the none choice first, then Keep for some costs within the room.
    slots.workingCostStaleDoorYesFirst('78,000'),
    slots.workingCostStaleDoorKeepUpTo(slots.workingCostKeepYearly('84,000'), '6,000'),
    slots.workingCostStaleDoorNoPlus('78,000', false),
  ],
  cta: copy.stalenessPayCheckCta,
}
const LEFT_OVER_MOVED_SENTENCE = slots.stalenessLeftOverMoved('16,985', '27,537', '16,985')
const LEFT_OVER_MOVED_GATE_LINE = `${copy.stalenessLeftOverNote} ${LEFT_OVER_MOVED_SENTENCE} ${copy.stalenessLeftOverGateDoor}`
// The U11 walk's (ae): the risen family's W line — W's sentence, the lean, then the tail by what a check at the quote
// does. Year 0 at the quote, by hand from `date`'s sum above with W at the quote: $10,985 at $90,000 (capped, no later
// short year: the lean is the left over reading $6,000 high, U11 walk 6's R2); −$4,015 at $105,000 (first short);
// $5,985 there with `datesavedrisenlater`'s $10,000 of untaxed alimony, whose end at Sam's 62 makes 2029 the short
// arm's −$4,015 again (later short). The later-short line is the LONGEST stale line any seed draws (with its gain years
// and its short run), so its arm is the gate's wrap-risk arm. After work the answer uses the risen spending figure,
// which on these seeds IS the quote (no budget).
/** The survivor part closing each risen line (U11 walk 8's W8-R12 (a)): the survivor rule counts 75 % of each figure on
 *  these seeds (Sam can die from 2032 while Alex works; no budget, no medical held whole), its close glossed (the line's
 *  first rider). Before the Result's door; the gate's door is its own section. W's out-of-date line names the two answers
 *  beside their figures (the walk-9 form council's call (4): `names: 'answers'` — "$63,000 in this answer at your figure
 *  …, and $67,500 in the answer at your spending …"), since it compares them in dollars nowhere else. */
const staleSurvivorWords = (quote: string, chargeAtQuote: string, most: string): readonly string[] => [
  slots.workingCostTypedBelowSurvivorCharges({ typed: '84,000', quote, source: 'spending', names: 'answers' }, ['63,000', chargeAtQuote]),
  slots.workingCostTypedBelowSurvivorLess({ typed: '84,000', quote, source: 'spending', names: 'answers' }, most, 2),
]
/** The short run at $105,000 on B and C, in the one amount rule (the walk-9 form council's call (1), flip (iii)): two
 *  groups, each figure beside its own years — $4,015 until Sam's Medicare starts, then $3,652 from 2031 (the U11 walk 2
 *  probe's money picture at the quote) — never the old "$3,652 to $4,015" range. B's run starts in 2026, C's in 2029. */
const risenShortRun = (firstYear: number): TypedBelowAmount => ({
  kind: 'two',
  groups: [
    { figure: '4,015', firstYear, lastYear: 2030 },
    { figure: '3,652', firstYear: 2031, lastYear: 2032 },
  ],
})
const risenNow = (quoteNow: string): readonly string[] =>
  savedNow(quoteNow, slots.workingCostStaleLeftOverNoneUpdate('16,985', '84,000'), slots.workingCostStaleNoSmallerAmount(quoteNow))
const RISEN_LINE = [
  slots.workingCostStaleQuote('84,000', '90,000'),
  slots.workingCostStaleLeftOverInflated('84,000', '6,000', '90,000', true),
  copy.workingCostStaleEitherWayUpdate,
  ...risenNow('90,000'),
  slots.workingCostStaleLabelIf('90,000'),
  slots.workingCostStaleLeftOverIfCapped('10,985', 2026, '90,000', false),
  slots.workingCostStaleEachDollar('90,000', '10,985'),
  // The extra a lower figure counts: the stored $16,985 less year 0's $10,985 at the quote (U11 walk 7's R6 (a)).
  slots.workingCostStaleLowerAddsMore('90,000', '10,985', '6,000', '16,985'),
  ...staleSurvivorWords('90,000', '67,500', '4,500'),
].join(' ')
const RISEN_SHORT_LINE = [
  slots.workingCostStaleQuote('84,000', '105,000'),
  slots.workingCostStaleLeftOverYearsCheaper('84,000'),
  slots.workingCostStaleShortUntilUpdated('84,000'),
  ...savedNow('105,000', slots.workingCostStaleLeftOverNoneNow('16,985', '84,000')),
  slots.workingCostStaleLabelIf('105,000'),
  slots.workingCostStaleLeftOverIfFirstShortRun(2026, 2032, risenShortRun(2026), '105,000', '84,000', '16,985', true),
  copy.workingCostStaleLowerCounts,
  ...staleSurvivorWords('105,000', '78,750', '15,750'),
].join(' ')
const RISEN_LATER_LINE = [
  slots.workingCostStaleQuote('84,000', '105,000'),
  slots.workingCostStaleLeftOverYearsCheaper('84,000'),
  copy.workingCostStaleEitherWayUpdate,
  ...risenNow('105,000'),
  slots.workingCostStaleLabelIf('105,000'),
  slots.workingCostStaleLeftOverIfCapped('5,985', 2026, '105,000', true),
  slots.workingCostStaleLeftOverGainYears(2026, 2028, 2033),
  slots.workingCostStaleEachDollar('105,000', '5,985'),
  slots.workingCostStaleShortLaterYears(2029, 2032, risenShortRun(2029), '84,000', true),
  slots.workingCostStaleLowerCountsMore('16,985'),
  ...staleSurvivorWords('105,000', '78,750', '15,750'),
].join(' ')
/** The risen arms' Result door ("update": no Keep door below the quote): the press sentence and the condition, ending
 *  on the list; after it, that the tool counts them only if added, then "Yes" at today's quote. */
const risenResultDoor = (quoteNow: string): ResultDoorWords => ({
  heading: UPDATE_GATE_DOOR.heading,
  lead: [slots.workingCostStaleResultDoorUpdate(copy.stalenessPayCheckCtaUpdate), slots.workingCostStaleDoorIfUpdate(quoteNow, false)],
  items: STALE_W_EXTRAS,
  tail: [copy.workingCostStaleDoorCounted, slots.workingCostStaleDoorYes(quoteNow)],
  cta: copy.stalenessPayCheckCtaUpdate,
})
/** The sheet the Result's W door opens, on an arm whose held figure sits BELOW today's quote: "Yes" offered, no Keep
 *  door (ruling 34). Above the quote (the fallen arms) Keep is drawn too, its condition above it. */
const UPDATE_SHEET = { cta: copy.stalenessPayCheckCtaUpdate, keep: null } as const
const CONFIRM_SHEET = { cta: copy.stalenessPayCheckCta, keep: slots.workingCostKeepYearly('84,000') } as const
const risenUnlock = (key: string, line: string, quoteNow: string) =>
  ({
    key,
    note: `${copy.stalenessPayCheckGateLead} ${line}`,
    gateDoor: UPDATE_GATE_DOOR,
    sibling: copy.stalenessLeftOverNote,
    standing: `${copy.stalenessPayCheckNote} ${line}`,
    resultDoor: risenResultDoor(quoteNow),
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  }) as const
/** Council `wf_22858e04-f7a` (6)'s read-back: `datesavedfourbuckets`' four bucket rows in bucket order, then both
 *  people's benefit rows — the tallest read-back a gate draws, by name. */
const FOUR_BUCKET_READBACK = [
  copy.reentryBucketPretax,
  copy.reentryBucketRoth,
  copy.reentryBucketTaxable,
  copy.reentryBucketHsa,
  'Alex',
  'Sam',
] as const
/** The typed-below line's runs (the whole-window rebuild, `docs/plans/features/typed-below-whole-window-rebuild-spec.md`
 *  KTD6/KTD7, in the walk-9 form council's form, `docs/plans/features/typed-below-walk9-form-build-spec.md`): each working
 *  year this answer's credit beside the credit the answer at today's quote would give, the years grouped into runs, every
 *  figure the engine's own on the seed (U3's witness table, the research record's `witnesses.md`). The line opens on the
 *  counts sentence (no lean in it now), then the moved clause where the host carries it, then the lean as its own
 *  sentence naming the quote in dollars, then the cap sentence (no dollars of the quote, no floor aside). Inside a list a
 *  credit run is TWO paragraphs (its two beats share the first, then the close) and a short run three (the walk-9 form
 *  council's call (1b)); every run's label is its years and ", while you’re still working" (the old "If you’re still
 *  working in …" label is retired on this line); a run's figure follows the one amount rule (one value "$X a year", two
 *  groups each beside its own years, never the old "$X to $Y" range). Every word TYPED BY HAND from the composer's
 *  output (the U2 probe, `probe.out.txt`), never composed from a slot, so a plant in the copy reds the gate too. A run's
 *  words in the order a block draws them, as `innerText` reads them: its label (the run's first `<p>`), then its
 *  paragraphs (one `<p>` each). Every seed and vault this spec walks is `date`'s couple (Alex 58, working; Sam 60,
 *  retired), so the engine can draw a working year with Sam dead and Alex still working (2032–2035, Sam's 66 on), and
 *  the survivor-path build's gate is on (`docs/plans/features/typed-below-survivor-path-build-spec.md`, KTD3/KTD7): the
 *  one-run close, the scoped lead and the short kinds' year subject carry "you’re both alive", and the survivor part
 *  closes every line. `noun` — "This" on the Result, "Your" on the gate (KD9). */
type TypedBelowNoun = 'This' | 'Your'
/** The rider (the walk-9 form council's words: "except for any difference …"), and the gloss its first use on a line
 *  carries inside its period, after a comma, no brackets (KD3, reworded). */
const TB_RIDER = ', except for any difference between the two answers in income tax and Medicare’s income surcharge'
const TB_GLOSS = ', the extra Medicare premium you pay when your income two years before was high'
/** The counts sentence, naming the host's answer (KD9), at the typed $84,000 — no lean in it now (call (2)). */
const tbCounts = (noun: TypedBelowNoun, quote: string): string =>
  `${noun} answer counts a working year at your own figure of $84,000 a year, below your spending of $${quote} a year.`
/** The lean, its own sentence after the counts sentence (and after the moved clause where the host carries it), naming
 *  the quote in dollars and the host's answer: the one home for the quote's dollars on the line. */
const tbLean = (noun: TypedBelowNoun, quote: string): string =>
  `A working year almost always costs at least your spending of $${quote} a year, so ${noun === 'This' ? 'this' : 'your'} answer can look better than it really is.`
/** The cap sentence (KD5): year 0 at the spending leaves less over than the stored $16,985, so that is the answer there's
 *  cap. The lean above names the quote's dollars, so the cap says "At your spending" alone, with no floor aside (W8-R8's
 *  aside retired by the walk-9 form council's call (2)). */
const tbCap = (leftOver: string): string =>
  `At your spending, your first working year would have $${leftOver} left over, so the answer at that spending would add at most $${leftOver} in any working year.`
/** The scoped lead over two or more runs, on every host under the survivor gate ("each answer": every run states both). */
const TB_LEAD = 'What each answer adds to your savings in each working year you’re both alive:'
/** A run's label: its years, then ", while you’re still working", on EVERY run (the walk-9 form council's call (3)). */
const tbLabel = (years: string): string => `${years}, while you’re still working`
/** A run as `innerText` reads it: its label, then its paragraphs. */
const tbRun = (years: string, paras: readonly string[]): string => [tbLabel(years), ...paras].join(' ')
/** A `bothCredit` run at the typed $84,000 under the $105,000 spending, inside a list: TWO paragraphs (call (1b)) — its
 *  two beats share the first (the answer there adds at most `atQuote`, this answer $16,985, neither restating the
 *  spending's dollars nor "to your savings", which the lead says), then the close "At your spending, that’s `less`",
 *  glossed on the line's first rider only. `atQuote` and `less` in the one amount rule, as the probe prints them. */
const tmCreditRun = (noun: TypedBelowNoun, years: string, atQuote: string, less: string, glossed: boolean): string =>
  tbRun(years, [
    `The answer at your spending would add at most ${atQuote}. ${noun} answer adds at most $16,985 a year.`,
    `At your spending, that’s ${less}${TB_RIDER}${glossed ? TB_GLOSS : ''}.`,
  ])
/** A `shortLeftOverAtTyped` run at the typed $84,000 under the $105,000 spending, several years: three paragraphs — the
 *  shortfall the spending takes from savings and its nothing, the ruled clause ("Your figure", its dollars said once
 *  above in the counts sentence) and this answer's $16,985, then "at most" the difference. `short` and `less` in the
 *  one amount rule. */
const tmShortRun = (noun: TypedBelowNoun, years: string, short: string, less: string): string =>
  tbRun(years, [
    `At your spending, each working year you’re both alive comes up ${short}, which would be taken from your savings, and the answer at that spending would add nothing.`,
    `Your figure leaves those shortfalls out of ${noun === 'This' ? 'this' : 'your'} answer, which adds at most $16,985 a year.`,
    `At your spending, that’s at most ${less}${TB_RIDER}.`,
  ])
/** …and one year: "that working year, if you’re both alive,", "that shortfall", no "a year" on its credit or difference
 *  (W8-R5 (c)). */
const tmShortYear = (noun: TypedBelowNoun, year: number, short: string, less: string): string =>
  tbRun(`${year}`, [
    `At your spending, that working year, if you’re both alive, comes up $${short} short, which would be taken from your savings, and the answer at that spending would add nothing.`,
    `Your figure leaves that shortfall out of ${noun === 'This' ? 'this' : 'your'} answer, which adds at most $16,985.`,
    `At your spending, that’s at most $${less} less in your savings${TB_RIDER}.`,
  ])
/** The survivor part (the survivor-path build's KTD5; its form the walk-8 council's KD7): after the runs' list (or
 *  closing the one paragraph of a one-run line), the two survivor charges, then the close with X, "at most". Each seed's
 *  figures by hand (DND 012), never through the engine's `workingYearCostForYear`: no seed here carries a budget, so the
 *  survivor rule charges the app's default survivor ratio (0.75, `src/shared/appDefaults.ts`) of each W — $84,000 × 0.75
 *  = $63,000 at the typed figure; $90,000 × 0.75 = $67,500 and $105,000 × 0.75 = $78,750 at the spending — and X is
 *  their difference: $4,500 on `datesavedtyped`, $15,750 on TM and the pension household (`survivorCharges` form: a ratio
 *  below 1 never spans the whole gap). It opens "In a working year with only one of you alive," (the walk-9 form
 *  council's call (4); the old "If only one of you is alive in a working year" opener is retired) and, on this line,
 *  names no answer beside its figures (`names: 'none'`: the runs above already named each). */
const SURVIVOR_A =
  'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $67,500 at your spending of $90,000 a year. ' +
  `At your spending, that’s at most $4,500 a year less in your savings${TB_RIDER}.`
const SURVIVOR_TM =
  'In a working year with only one of you alive, that year’s costs count as $63,000 at your figure of $84,000 a year and $78,750 at your spending of $105,000 a year. ' +
  `At your spending, that’s at most $15,750 a year less in your savings${TB_RIDER}.`
/** U11 walk 6's R1 on `datesavedtyped` (`datesavedrisen` with its old $84,000 TYPED back in, fresh): the typed-below
 *  line, "Your" on the gate and "This" on the Result — the counts sentence, the lean ($90,000), the cap sentence (year 0
 *  at $90,000 leaves $10,985), then its ONE run over the whole window (A: $16,985 against $10,985 in every year,
 *  2026–2035), folded into the opening as a plain paragraph with no label. A's at-spending figure IS the cap, so the run
 *  drops its first beat (T's twin, the walk-9 form council's call (2)) and its close carries the survivor scope ("$6,000
 *  less in your savings in each working year you’re both alive"); the survivor part's two sentences close the same
 *  paragraph ($63,000 and $67,500; $4,500). Its door is the update act's, naming the same $84,000. */
const typedBelowLine = (noun: TypedBelowNoun): string =>
  [
    tbCounts(noun, '90,000'),
    tbLean(noun, '90,000'),
    tbCap('10,985'),
    `${noun} answer adds at most $16,985 a year to your savings.`,
    `At your spending, that’s $6,000 less in your savings in each working year you’re both alive${TB_RIDER}${TB_GLOSS}.`,
    SURVIVOR_A,
  ].join(' ')
/** A run's shape in the runs' ordered list: its label, and how many paragraphs follow it — two for a credit run (its
 *  beats share the first), three for a short run (the walk-9 form council's call (1b)). */
interface TypedBelowRunShape {
  readonly label: string
  readonly paras: 2 | 3
}
/** The walk-6 round review's pair on `datesavedtypedmoved` (`datesavedrisenlater` with its old $84,000 TYPED back in, the
 *  left over moved to $26,985 at it): R1's line as a block of three runs (TM: 2026 through 2028, $16,985 against $5,985;
 *  the 2029–2032 run short at $105,000, $4,015 in 2029 through 2030 and $3,652 in 2031 through 2032; 2033 through 2035,
 *  $16,985 against $5,985 — the years the old year-0 line called $762), every run's label its years "while you’re still
 *  working". The moved clause after the counts sentence (`middle`) on BOTH hosts here: on the Result, and on the gate,
 *  where no rules line fires on this vault, so since the walk-9 form council's call (1a) the typed-below line carries it
 *  and no moved note of its own is drawn. Then the lean, the cap sentence ($5,985) and the scoped lead; the survivor part
 *  ($63,000 and $78,750; $15,750) follows the runs' list as its own paragraph (KD7). */
const TYPED_MOVED_RUNS: readonly TypedBelowRunShape[] = [
  { label: tbLabel('2026 through 2028'), paras: 2 },
  { label: tbLabel('2029 through 2032'), paras: 3 },
  { label: tbLabel('2033 through 2035'), paras: 2 },
]
const typedMovedLine = (noun: TypedBelowNoun, middle: string | null): string =>
  [
    tbCounts(noun, '105,000'),
    ...(middle === null ? [] : [middle]),
    tbLean(noun, '105,000'),
    tbCap('5,985'),
    TB_LEAD,
    tmCreditRun(noun, '2026 through 2028', '$5,985 a year', '$11,000 a year less in your savings', true),
    tmShortRun(
      noun,
      '2029 through 2032',
      '$4,015 short in 2029 through 2030 and $3,652 short in 2031 through 2032',
      '$21,000 less in your savings in 2029 through 2030 and $20,637 less in 2031 through 2032',
    ),
    tmCreditRun(noun, '2033 through 2035', '$5,985 a year', '$11,000 a year less in your savings', false),
    SURVIVOR_TM,
  ].join(' ')
/** The rebuild's five-run household on `datesavedtypedpension` (`datesavedrisenlater` plus Sam's $9,000 pension at 64
 *  and 65, the old $84,000 typed back in): the pension lifts 2030 and 2031 above $0 at $105,000, so its short years at
 *  the quote split into two one-year runs, 2029 and 2032 ("that working year", "that shortfall"), around a 2030–2031
 *  credit run whose figures differ by year, so each is said beside its own year (the one amount rule's two groups: "$3,005
 *  in 2030 and $3,368 in 2031", then "$13,980 less in your savings in 2030 and $13,617 less in 2031"). Saved-moved as TM
 *  is (year 0 $26,985 at the typed figure), so the same `middle` on both hosts and no moved note on the gate; the
 *  survivor scope and the survivor part as on TM (the same W pair). */
const TYPED_PENSION_RUNS: readonly TypedBelowRunShape[] = [
  { label: tbLabel('2026 through 2028'), paras: 2 },
  { label: tbLabel('2029'), paras: 3 },
  { label: tbLabel('2030 through 2031'), paras: 2 },
  { label: tbLabel('2032'), paras: 3 },
  { label: tbLabel('2033 through 2035'), paras: 2 },
]
const typedPensionLine = (noun: TypedBelowNoun, middle: string | null): string =>
  [
    tbCounts(noun, '105,000'),
    ...(middle === null ? [] : [middle]),
    tbLean(noun, '105,000'),
    tbCap('5,985'),
    TB_LEAD,
    tmCreditRun(noun, '2026 through 2028', '$5,985 a year', '$11,000 a year less in your savings', true),
    tmShortYear(noun, 2029, '4,015', '21,000'),
    tmCreditRun(noun, '2030 through 2031', '$3,005 in 2030 and $3,368 in 2031', '$13,980 less in your savings in 2030 and $13,617 less in 2031', false),
    tmShortYear(noun, 2032, '3,652', '20,637'),
    tmCreditRun(noun, '2033 through 2035', '$5,985 a year', '$11,000 a year less in your savings', false),
    SURVIVOR_TM,
  ].join(' ')
/** The moved clause the typed-below line carries on TM and the pension household, on the Result and on the gate (no rules
 *  line hosts it on either vault), in W8-R5 (b)'s words: "all the money left over in a working year", never the
 *  referent-less "all of it". */
const TYPED_MOVED_CLAUSE =
  'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over. At your figure of $84,000 a year, it has $26,985 left over now. So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.'
/** The moved note's own three parts as the gate WOULD draw them were the clause not carried (its lead, its sentence, its
 *  door sentence), read off the live copy so the negative aims at live words (insight 086): on TM and the pension
 *  vault none of them may be drawn — the line carries the fact, one cause, one line. */
const TYPED_MOVED_OWN_NOTE_PARTS = [
  copy.stalenessLeftOverNote,
  slots.stalenessLeftOverMovedAt('84,000', '16,985', '26,985', '16,985'),
  copy.stalenessLeftOverGateDoor,
] as const
/** The gate's door where the typed-below line carries the moved clause: the update act's heading and route, and the
 *  scope sentence naming the moved fact's noun too (the walk-9 form council's call (1a): the moved note's door sentence
 *  moves into it). The scope typed by hand from the probe (`workingYearCostTypedBelowDoor(d, true)`). */
const TYPED_MOVED_GATE_DOOR: GateDoorWords = {
  ...UPDATE_GATE_DOOR,
  scope: 'Neither button on this page updates your $84,000 figure or what you said about the money left over; both lead to where you can.',
}
/** `note` — the gate's one note (its text, read as `innerText`; every arm draws exactly one since the walk-9 form
 *  council's call (1a): the typed-and-moved arms' line carries the moved clause, and the second note they once drew, the
 *  moved line of its own, is gone). `carriesMoved` — the moved clause the gate's ONE note carries after its counts
 *  sentence, where the typed-below line hosts the moved fact: the arm then proves the clause is in that note and that
 *  none of the moved note's own parts is drawn anywhere on the gate. `gateDoor` — the gate's door section, or `null`
 *  where none is drawn (W not stale). `standing` — the Result's standing-slot lead and line (before its door), or `null`
 *  where the answer carries none (the fresh-vintage `wyclock`). `resultDoor` — the standing slot's door as its last
 *  dt/dd (the block), or `null` where the slot is its old `<p>` with the button inline — or, with `standingRuns`, a
 *  block with NO door (the typed-below line at two or more runs: its runs' labels in order in the ordered list, each
 *  with its paragraph count, the survivor part's paragraph after it, its button the block's last child). `dated` — whether the affirm
 *  lands a crowned date (`assertResolvedDate`) or the no-date reading (`assertNoDateReading`). `sheet` — the Result
 *  door that opens the panel at the W row, and the Keep door's label there (`null` where none is drawn), or `null`
 *  where the slot opens no W row. `readback` — the gate's read-back labels in order, where the arm pins them. */
const PAY_CHECK_UNLOCKS: readonly {
  readonly key: string
  readonly note: string
  readonly carriesMoved?: string
  readonly gateDoor: GateDoorWords | null
  readonly sibling: string
  readonly standing: string | null
  readonly resultDoor: ResultDoorWords | null
  readonly standingRuns?: readonly TypedBelowRunShape[]
  readonly dated: boolean
  readonly sheet: { readonly cta: string; readonly keep: string | null } | null
  readonly readback: readonly string[] | null
}[] = [
  {
    key: 'wyclock',
    note: copy.stalenessWorkingYears,
    gateDoor: null,
    sibling: copy.stalenessPayCheckGateLead,
    standing: null,
    resultDoor: null,
    dated: true,
    sheet: null,
    readback: null,
  },
  {
    key: 'datecoststale',
    note: `${copy.stalenessPayCheckGateLead} ${STALE_W_QUOTE}`,
    gateDoor: CONFIRM_GATE_DOOR,
    sibling: copy.stalenessWorkingYears,
    standing: `${copy.stalenessPayCheckNote} ${STALE_W_QUOTE}`,
    resultDoor: null,
    dated: true,
    sheet: CONFIRM_SHEET,
    readback: null,
  },
  {
    key: 'datesavedstale',
    note: `${copy.stalenessPayCheckGateLead} ${STALE_W_SAVED_LINE}`,
    gateDoor: CONFIRM_GATE_DOOR,
    sibling: copy.stalenessLeftOverNote,
    standing: `${copy.stalenessPayCheckNote} ${STALE_W_SAVED_LINE}`,
    resultDoor: STALE_W_SAVED_RESULT_DOOR,
    dated: true,
    sheet: CONFIRM_SHEET,
    readback: null,
  },
  {
    key: 'datesavedmoved',
    note: LEFT_OVER_MOVED_GATE_LINE,
    gateDoor: null,
    sibling: copy.stalenessPayCheckGateLead,
    standing: `${copy.stalenessLeftOverNote} ${LEFT_OVER_MOVED_SENTENCE}`,
    resultDoor: null,
    dated: true,
    // Its door opens the left-over seat, never the W row (its own arm above pins where it lands).
    sheet: null,
    readback: null,
  },
  risenUnlock('datesavedrisen', RISEN_LINE, '90,000'),
  risenUnlock('datesavedrisenshort', RISEN_SHORT_LINE, '105,000'),
  risenUnlock('datesavedrisenlater', RISEN_LATER_LINE, '105,000'),
  // Council (6)'s four-bucket arm: `datesavedrisenlater` plus a brokerage and an HSA that take no deposit, so its words
  // are that seed's (devSeeds.test.ts pins the identity) — the longest stale line under the tallest read-back, and it
  // still crowns no date (measured at the final tier, b9-4: the top rung's lower bound 0.77, against 0.74 without the
  // two accounts).
  { ...risenUnlock('datesavedfourbuckets', RISEN_LATER_LINE, '105,000'), readback: FOUR_BUCKET_READBACK },
  // R1: a fresh typed W has no stale line, so W's gate lead stays dark; its own line and door speak instead, and the
  // Result's slot keeps it in W's plain form (the update button inline). It crowns about 9 years out (U11 walk 6's
  // R1 measurement, draft b).
  {
    key: 'datesavedtyped',
    note: typedBelowLine('Your'),
    gateDoor: UPDATE_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedBelowLine('This'),
    resultDoor: null,
    dated: true,
    sheet: UPDATE_SHEET,
    readback: null,
  },
  // The pair (b9-5): R1's line and the moved fact on one gate — the tallest R1 gate — each figure naming what it rests on.
  // Since the walk-9 form council's call (1a), with no rules line fired on this vault, the typed-below line CARRIES the
  // moved clause after its counts sentence on the gate as on the Result, the moved note of its own is not drawn (one
  // note), and the gate door's scope sentence names the moved fact's noun. No date within the window (the final tier's top
  // rung 0.80, b9-5's probe, against `datesavedrisenlater`'s 0.74). Since the whole-window rebuild R1's line is a block of
  // three labelled runs on both hosts, the Result's with no door of its own (its button the block's last child); since the
  // walk-8 form council, an ordered list under the cap sentence and the scoped lead, the survivor part its paragraph after.
  {
    key: 'datesavedtypedmoved',
    note: typedMovedLine('Your', TYPED_MOVED_CLAUSE),
    carriesMoved: TYPED_MOVED_CLAUSE,
    gateDoor: TYPED_MOVED_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedMovedLine('This', TYPED_MOVED_CLAUSE),
    resultDoor: null,
    standingRuns: TYPED_MOVED_RUNS,
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  },
  // The rebuild's five-run household (walk 8's first added target): the longest R1 line, five labelled runs on the
  // gate above the decision pair, carrying the moved clause as TM's does (call (1a): no moved note of its own). No date
  // within the window on either tier (probed node-side through the app's own date search, b9-1: `no-date-in-window` on
  // the floor and lifestyle tracks, provisional and final).
  {
    key: 'datesavedtypedpension',
    note: typedPensionLine('Your', TYPED_MOVED_CLAUSE),
    carriesMoved: TYPED_MOVED_CLAUSE,
    gateDoor: TYPED_MOVED_GATE_DOOR,
    sibling: copy.stalenessPayCheckGateLead,
    standing: typedPensionLine('This', TYPED_MOVED_CLAUSE),
    resultDoor: null,
    standingRuns: TYPED_PENSION_RUNS,
    dated: false,
    sheet: UPDATE_SHEET,
    readback: null,
  },
]

/** The standing slot drawn as a block (W's stale line for a "saved" answer): still one `.cs-paycheck-note`, now
 *  `div.note-parts`; its lead and line, then the door's heading, every list item, the tail, in order (`innerText`); the
 *  door's dt is the gate's heading word for word; and the door's button is the dd's LAST child, by its label. */
async function assertStandingBlock(standing: Locator, who: string, lineText: string, door: ResultDoorWords): Promise<void> {
  await expect(standing, `${who}: the standing slot is drawn as a block`).toHaveClass(/(^|\s)note-parts(\s|$)/)
  await expect(standing, `${who}: the standing slot speaks its line, then its door, in order`).toContainText(
    `${lineText} ${resultDoorText(door)}`,
    { useInnerText: true },
  )
  const doorPart = standing.locator('.note-parts__door')
  await expect(doorPart, `${who}: exactly one door, the block's last dt/dd`).toHaveCount(1)
  await expect(doorPart.locator('dt')).toHaveText(door.heading)
  await expect(doorPart.locator('li'), `${who}: the door's cost list, every item in order`).toHaveText([...door.items])
  const last = await doorPart.locator('dd').evaluate((dd) => {
    const el = dd.lastElementChild
    return el === null ? null : { tag: el.tagName, text: el.textContent ?? '' }
  })
  expect(last, `${who}: the door's button is the dd's last child`).toEqual({ tag: 'BUTTON', text: door.cta })
  await assertLabelType(standing, who)
  // Council (4): the door's button is a block button at least 44 px tall — jsdom loads no stylesheet, so only a real
  // browser can hold it (the walk-6 round review's L4-4: without `min-height` it fell to 24 px at his window).
  const button = await doorPart.locator('dd > button').boundingBox()
  expect(button, `${who}: the door's button has no box`).not.toBeNull()
  expect(button!.height, `${who}: the door's button is at least 44 px tall`).toBeGreaterThanOrEqual(44)
}

/** The typed-below block's parts, on any host (the walk-8 form council's KD7 and KD8,
 *  `docs/plans/features/typed-below-walk8-form-build-spec.md`, in the walk-9 form council's form): the opening `<p>`, then
 *  the runs as ONE ordered list (`ol.note-parts__runs`, `role="list"`, one `li.note-parts__run` per run, its years its
 *  label in time order, then its paragraphs, one `<p>` each — two on a credit run, whose beats share the first, three on
 *  a short run: call (1b)), then the survivor part as its own paragraph after the list (`p.note-parts__closing`: a
 *  condition over the runs, never one more of them), and last, where the host passes one, its button. No description
 *  list (the coda's `dl` is gone), no door part, no heading, no table. Then the form's CSS, read in the browser against
 *  its tokens (below). Every block here carries the survivor part: every typed-below seed and vault this spec walks opens
 *  the survivor gate (the runs' docblock). */
async function assertTypedBelowParts(block: Locator, who: string, runShapes: readonly TypedBelowRunShape[], withButton: boolean): Promise<void> {
  const runs = block.locator(':scope > ol.note-parts__runs')
  await expect(runs, `${who}: the runs are one ordered list`).toHaveCount(1)
  await expect(runs, `${who}: the list stays a list in the accessibility tree`).toHaveAttribute('role', 'list')
  await expect(runs.locator(':scope > li.note-parts__run'), `${who}: one item per run`).toHaveCount(runShapes.length)
  await expect(runs.locator(':scope > li > p.note-parts__label'), `${who}: each run's years are its label, in time order`).toHaveText(
    runShapes.map((r) => r.label),
  )
  const shapes = await runs.evaluate((ol) => [...ol.children].map((li) => [...li.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`).join(' ')))
  expect(shapes, `${who}: a run is its label, then its paragraphs, one <p> each — two on a credit run, three on a short run (call (1b))`).toEqual(
    runShapes.map((r) => ['p.note-parts__label', ...Array.from({ length: r.paras }, () => 'p.note-parts__para')].join(' ')),
  )
  const closing = block.locator(':scope > p.note-parts__closing')
  await expect(closing, `${who}: the survivor part is its own paragraph after the list`).toHaveCount(1)
  await expect(closing, `${who}: the survivor part opens on its condition`).toHaveText(/^In a working year with only one of you alive, /)
  await expect(runs, `${who}: the survivor part is never one more run`).not.toContainText('only one of you alive')
  await expect(block.locator('dl, h1, h2, h3, h4, h5, h6, table'), `${who}: no description list, heading or table in the block`).toHaveCount(0)
  await expect(block.locator('.note-parts__door'), `${who}: the typed-below block carries no door part`).toHaveCount(0)
  const order = await block.evaluate((el) =>
    [...el.children].map((c) =>
      c.matches('p.note-parts__opening')
        ? 'opening'
        : c.matches('ol.note-parts__runs')
          ? 'runs'
          : c.matches('p.note-parts__closing')
            ? 'closing'
            : c.tagName.toLowerCase(),
    ),
  )
  expect(order, `${who}: the opening, the runs, the survivor part after them${withButton ? ', the button last' : ''}`).toEqual([
    'opening',
    'runs',
    'closing',
    ...(withButton ? ['button'] : []),
  ])
  // THE FORM'S CSS, in a real browser (jsdom loads no stylesheet, so no unit test can see it; `noteParts.css`, KD8): the
  // list draws no marker and no indent or margin of its own; a run's paragraphs stand --space-2 apart, its first flush
  // under the label; the survivor part stands --space-5 off the list (the walk-9 form council's call (4), was --space-4);
  // the label keeps base.css's figure law, tabular LINING numerals (KD8 deleted a restatement that set tabular-nums alone
  // and so dropped lining-nums). Each spacing is read against its token as this document resolves it, never a pixel
  // number typed here; a bare `ol` drawn for the moment of the read proves the list's none and zeros are the
  // stylesheet's, not the browser's defaults.
  const css = await block.evaluate((el) => {
    const root = getComputedStyle(document.documentElement)
    const rem = parseFloat(root.fontSize)
    const [space2, space5] = [root.getPropertyValue('--space-2').trim(), root.getPropertyValue('--space-5').trim()].map((t) =>
      t.endsWith('rem') ? parseFloat(t) * rem : t.endsWith('px') ? parseFloat(t) : Number.NaN,
    )
    const ol = el.querySelector(':scope > ol.note-parts__runs')!
    const o = getComputedStyle(ol)
    const control = document.createElement('ol')
    document.body.appendChild(control)
    const c = getComputedStyle(control)
    const bare = { listStyleType: c.listStyleType, paddingInlineStart: parseFloat(c.paddingInlineStart) }
    document.body.removeChild(control)
    const label = ol.querySelector(':scope > li > p.note-parts__label')!
    return {
      space2: space2!,
      space5: space5!,
      listStyleType: o.listStyleType,
      listBox: [o.paddingTop, o.paddingRight, o.paddingBottom, o.paddingLeft, o.marginTop, o.marginRight, o.marginBottom, o.marginLeft].map((v) => parseFloat(v)),
      bare,
      paraTops: [...ol.querySelectorAll(':scope > li')].map((li) => [...li.querySelectorAll(':scope > p.note-parts__para')].map((p) => parseFloat(getComputedStyle(p).marginTop))),
      closingTop: parseFloat(getComputedStyle(el.querySelector(':scope > p.note-parts__closing')!).marginTop),
      labelNumeric: getComputedStyle(label).fontVariantNumeric,
    }
  })
  // Non-vacuous: both tokens resolve to a real length, the survivor part's step is the larger, and a bare list here would
  // draw its marker and its indent. Never its margin: `base.css`'s `* { margin: 0 }` zeroes every element's, so a margin
  // control reds on every arm (seen on the first run, b9-3).
  expect(css.space2, `${who}: --space-2 resolves to a length`).toBeGreaterThan(0)
  expect(css.space5, `${who}: --space-5 resolves to a larger length than --space-2`).toBeGreaterThan(css.space2)
  expect(css.bare.listStyleType, `${who}: a bare ol draws a marker (the control)`).not.toBe('none')
  expect(css.bare.paddingInlineStart, `${who}: a bare ol is indented (the control)`).toBeGreaterThan(0)
  expect(css.listStyleType, `${who}: the runs' list draws no marker (each label is its marker)`).toBe('none')
  expect(css.listBox, `${who}: the runs' list has no padding and no margin of its own`).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  expect(css.paraTops.length, `${who}: one set of paragraphs per run`).toBe(runShapes.length)
  css.paraTops.forEach((tops, i) => {
    expect(tops.length, `${who}: run ${i + 1} draws ${runShapes[i]!.paras} paragraphs`).toBe(runShapes[i]!.paras)
    expect(tops[0], `${who}: a run's first paragraph sits flush under its label`).toBe(0)
    for (const t of tops.slice(1)) expect(t, `${who}: a run's paragraphs stand --space-2 apart`).toBeCloseTo(css.space2, 2)
  })
  expect(css.closingTop, `${who}: the survivor part stands --space-5 off the runs' list`).toBeCloseTo(css.space5, 2)
  expect(css.labelNumeric, `${who}: the label keeps the figure law's lining numerals`).toMatch(/\blining-nums\b/)
  expect(css.labelNumeric, `${who}: …and its tabular ones`).toMatch(/\btabular-nums\b/)
}

/** The standing slot drawn as a block with NO door (the typed-below line at two or more runs, the whole-window
 *  rebuild's KTD6 host 1): still one `.cs-paycheck-note`, now `div.note-parts`; its words — the opening ending on the
 *  scoped lead, then each run's label and paragraphs, then the survivor part — in order, read as `innerText` (a block's
 *  `textContent` runs its parts together); its parts (`assertTypedBelowParts`: exactly the runs given, each label with
 *  its paragraph count, in the runs' ordered list, the survivor part's paragraph after it); the label type; and the
 *  Result's button ("Update your figure for a working year") still drawn wherever the tab can act, as the block's LAST
 *  child and a block at least 44 px tall (`FuckOffDate` passes it whenever `onOpen` is set; before the rebuild a doorless
 *  block dropped it). */
async function assertDoorlessStandingBlock(
  standing: Locator,
  who: string,
  lineText: string,
  runShapes: readonly TypedBelowRunShape[],
  cta: string,
): Promise<void> {
  await expect(standing, `${who}: the standing slot is drawn as a block`).toHaveClass(/(^|\s)note-parts(\s|$)/)
  await expect(standing, `${who}: the standing slot speaks its opening, every run, then the survivor part, in order`).toContainText(lineText, {
    useInnerText: true,
  })
  await assertTypedBelowParts(standing, who, runShapes, true)
  await assertLabelType(standing, who)
  const last = await standing.evaluate((el) => {
    const c = el.lastElementChild
    return c === null ? null : { tag: c.tagName, text: c.textContent ?? '' }
  })
  expect(last, `${who}: the block's button is its last child`).toEqual({ tag: 'BUTTON', text: cta })
  const button = await standing.locator(':scope > button').boundingBox()
  expect(button, `${who}: the block's button has no box`).not.toBeNull()
  expect(button!.height, `${who}: the block's button is at least 44 px tall`).toBeGreaterThanOrEqual(44)
}

/** Council `wf_22858e04-f7a` (1)'s label type, in a real browser (jsdom loads no stylesheet; the walk-6 round review's
 *  L4-5): every label in the block — a segment's dt (W's stale line), a run's first `<p>` (the typed-below line's runs,
 *  the walk-8 form council's KD8) — is the body face (never the display face), semibold or heavier, and one step LARGER
 *  than the text it labels (its dd, or its run's first sentence). */
async function assertLabelType(block: Locator, who: string): Promise<void> {
  const type = await block.evaluate((el) =>
    [
      ...[...el.querySelectorAll('dl > div')].map((row) => [row.querySelector('dt'), row.querySelector('dd')] as const),
      ...[...el.querySelectorAll('ol.note-parts__runs > li')].map(
        (li) => [li.querySelector(':scope > p.note-parts__label'), li.querySelector(':scope > p.note-parts__para')] as const,
      ),
    ].map(([label, text]) => {
      if (label === null || text === null) return null
      const t = getComputedStyle(label)
      const d = getComputedStyle(text)
      return { label: label.textContent ?? '', dtFace: t.fontFamily, ddFace: d.fontFamily, dtSize: parseFloat(t.fontSize), ddSize: parseFloat(d.fontSize), weight: Number(t.fontWeight) }
    }),
  )
  expect(type.length, `${who}: the block draws no labelled parts`).toBeGreaterThan(0)
  for (const r of type) {
    expect(r, `${who}: a labelled part is malformed`).not.toBeNull()
    expect(r!.dtFace, `${who}: "${r!.label}" is in the body face`).toBe(r!.ddFace)
    expect(r!.weight, `${who}: "${r!.label}" is semibold`).toBeGreaterThanOrEqual(600)
    expect(r!.dtSize, `${who}: "${r!.label}" is one step larger than its text`).toBeGreaterThan(r!.ddSize)
  }
}

/** Council `wf_22858e04-f7a` (6)'s hit-test, a control in the open sheet where a reader can tap it. Only what a reader
 *  can scroll is scrolled — the nearest `auto`/`scroll` scroller above the control (the sheet's own body), never a
 *  clipped box and never `scrollIntoView`, which reaches through clips no reader can (insight 124) — until the control's
 *  centre sits mid-way in that scroller's visible box; then the browser is asked what is AT that point. The control or
 *  a descendant, or it is covered or clipped. */
async function assertTappableInSheet(target: Locator, who: string): Promise<void> {
  await expect(target, `${who}: drawn exactly once`).toHaveCount(1)
  const hit = await target.evaluate((el) => {
    let sc: Element | null = el.parentElement
    while (sc !== null && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
    const scroller = sc ?? document.scrollingElement!
    const box = sc === null ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect()
    const before = el.getBoundingClientRect()
    scroller.scrollTop += before.top + before.height / 2 - (box.top + box.bottom) / 2
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const at = document.elementFromPoint(x, y)
    return {
      onTarget: at !== null && el.contains(at),
      inWindow: x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight,
      at: at === null ? null : `${at.tagName.toLowerCase()}.${String(at.className)}`,
      y: Math.round(y),
      sheetScrolled: sc !== null,
    }
  })
  console.log(`[sheet hit] ${who}: ${JSON.stringify(hit)}`)
  expect(hit.inWindow, `${who}: its centre lies outside the window (${JSON.stringify(hit)})`).toBe(true)
  expect(hit.onTarget, `${who}: covered or clipped, the point hits ${hit.at} (${JSON.stringify(hit)})`).toBe(true)
}

/** The re-entry gate's short-tier rung, W6 (the 1440×731 re-point plan's KTD6 and KTD11; the tier's LAW lives once, in
 *  tokens.css `--bp-laptop-short`'s docblock), read on the gate's open frame: the gate's first short-tier block
 *  (`save.css`), on its top spacing and its confirm half only. Two rules are gate-wide and lift both halves as a block —
 *  the step's top padding 40 → 32 and the grid's row-gap under the heading 20 → 12 — and three tighten the confirm half:
 *  its stack gap 20 → 12, and the lead-ins of the second read-back group and of the buttons 16 → 8. The first group keeps
 *  the ≥68rem block's zero, so the halves still start on one line. The story column's own gap stays --space-5 (20 px):
 *  W6 never touches it (the walk-9 form council reasoned the survivor part's --space-5 against it; that margin is
 *  `assertTypedBelowParts`'s). Read inside the short tier only: no contract sets a tall rhythm for the gate (the plan's
 *  Scope Boundaries; the planning probe found the 917 showcase and the phone byte-identical at build). Exact strings,
 *  `rowGap` never the `gap` shorthand, so deleting any W6 rule reds HERE on every platform (insight 075). Every plant
 *  this reads draws both read-back groups, and the helper asserts that count; a gate draws one where a bucket set is
 *  empty (`ReEntry.tsx`'s `ReadbackGroup` renders nothing for no rows), so a one-group plant would need its own read. */
async function assertGateDensity(page: Page, who: string): Promise<void> {
  const read = await page.evaluate(() => {
    const style = (sel: string) => {
      const el = document.querySelector(sel)
      return el === null ? null : getComputedStyle(el)
    }
    return {
      short: window.matchMedia('(min-width: 68rem) and (max-height: 840px)').matches,
      padTop: style('main.save.save--reentry')?.paddingTop ?? null,
      gridRowGap: style('section.reentry')?.rowGap ?? null,
      confirmRowGap: style('.reentry-confirm')?.rowGap ?? null,
      groupTops: Array.from(document.querySelectorAll('.reentry-confirm > .reentry-group')).map((g) => getComputedStyle(g).marginTop),
      actionsTop: style('.reentry-confirm > .save-actions')?.marginTop ?? null,
      storyRowGap: style('.reentry-story')?.rowGap ?? null,
    }
  })
  const at = '(density tier ON)'
  expect(read.short, `${who}: the gate arm runs inside the short tier (≥68rem ∧ ≤840px, tokens.css --bp-laptop-short)`).toBe(true)
  expect(read.padTop, `${who}: W6: the gate's top padding ${at}`).toBe('32px')
  expect(read.gridRowGap, `${who}: W6: the gate grid's row-gap under the heading ${at}`).toBe('12px')
  expect(read.confirmRowGap, `${who}: W6: the confirm half's row-gap ${at}`).toBe('12px')
  // Every plant this helper reads draws BOTH read-back groups (the docblock above), so the count is
  // asserted, never branched on: a plant that dropped to one group would silently take W6's group rule
  // off its only pin (insight 029; the re-point's review, 2026-11-20). A one-group plant added on purpose
  // changes this line with it.
  expect(read.groupTops.length, `${who}: the confirm half draws both read-back groups (insight 029)`).toBe(2)
  expect(read.groupTops[0], `${who}: the first read-back group keeps no lead-in, so the halves start on one line`).toBe('0px')
  expect(read.groupTops[1], `${who}: W6: the second read-back group's lead-in ${at}`).toBe('8px')
  expect(read.actionsTop, `${who}: W6: the confirm half's buttons' lead-in ${at}`).toBe('8px')
  expect(read.storyRowGap, `${who}: the story column's gap is never W6's (--space-5)`).toBe('20px')
}

for (const u of PAY_CHECK_UNLOCKS) {
  test.describe(`the pay check’s unlock line (?vault=${u.key}) — one note, the decision pair in frame (${REAL.width}×${REAL.height})`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('exactly one gate note, by name; the door under the buttons in frame; the affirm lands the resolved date reading, doors last', async ({ page }) => {
      await page.goto(`/?vault=${u.key}`)
      const unlock = page.getByRole('button', { name: 'Open my plan' })
      await expect(unlock, `the ${u.key} plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
      await unlock.click()

      const affirm = page.getByRole('button', { name: /still about right/i })
      await expect(affirm).toBeVisible({ timeout: 30_000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      const affirmBox = await affirm.boundingBox()
      expect(affirmBox, 'the affirm CTA reported no box').not.toBeNull()
      expect(affirmBox!.y + affirmBox!.height, 'the affirm CTA sits below the first frame at the real window').toBeLessThanOrEqual(
        REAL.height,
      )
      // THE ISOLATION: one note, this plant's own — and the pay check's other line is dark (a negative
      // aimed at a live key, never a deleted one: insight 086). Each note is a direct child (a `<p>`, or W's
      // block), so the count reads the children; the text reads `innerText` across the block's dt/dd.
      await expect(page.locator('.reentry-notes > *'), `${u.key}: exactly one gate note`).toHaveCount(1)
      await expect(page.locator('.reentry-notes')).toContainText(u.note, { useInnerText: true })
      // THE MOVED FACT ON THE GATE (the walk-9 form council's call (1a)): where no rules line fired and the typed-below
      // line is the line drawn, that ONE note carries the moved clause (its words in `note`, after the counts sentence and
      // before the lean, so the ordered compare above pins its place), and the moved note of its own is drawn nowhere —
      // not its lead, not its sentence, not its door sentence (each checked alone: a joined negative passes when any one
      // part is absent). The single note's count above is the other half: no second note of any cause.
      if (u.carriesMoved !== undefined) {
        await expect(page.locator('.reentry-notes > *').nth(0), `${u.key}: the gate's one note carries the moved clause`).toContainText(
          u.carriesMoved,
          { useInnerText: true },
        )
        // Non-vacuous: the negatives below read a gate that is drawn (its notes and its door inside it).
        await expect(page.locator('section.reentry'), `${u.key}: the gate is one section`).toHaveCount(1)
        await expect(page.locator('section.reentry .reentry-notes'), `${u.key}: the notes sit inside the gate section`).toHaveCount(1)
        for (const part of TYPED_MOVED_OWN_NOTE_PARTS) {
          // The whole gate (`section.reentry`: the story column with its notes AND the confirm column with its door).
          await expect(page.locator('section.reentry'), `${u.key}: no moved note of its own on the gate ("${part}")`).not.toContainText(part)
        }
        await expect(page.getByText(copy.stalenessLeftOverNote), `${u.key}: the moved note's lead is drawn nowhere`).toHaveCount(0)
      }
      // A block on the gate (W's, or the typed-below line's runs) carries the same label type as the Result's (council (1)).
      const gateBlock = page.locator('.reentry-notes > .note-parts')
      if ((await gateBlock.count()) > 0) await assertLabelType(gateBlock, `${u.key} (gate)`)
      // The typed-below line at two or more runs is the gate's block: the runs' ordered list, then the survivor part's
      // paragraph (the walk-8 form council's KD7 and KD8, host 2); the gate passes no button.
      if (u.standingRuns !== undefined) await assertTypedBelowParts(gateBlock, `${u.key} (gate)`, u.standingRuns, false)
      // The read-back the frame must hold, where the arm pins it (council (6): the four-bucket arm is its tallest).
      if (u.readback !== null) {
        await expect(page.locator('.reentry-confirm .reentry-row__label'), `${u.key}: the gate's read-back, every row`).toHaveText([
          ...u.readback,
        ])
      }
      await expect(page.getByText(u.sibling), 'the pay check’s other unlock line stays dark').toHaveCount(0)
      await expect(page.getByText(copy.stalenessWorkingYearCost), 'never the figure-less fallback').toHaveCount(0)

      // THE GATE'S DOOR (council `wf_22858e04-f7a` (2)): on every stale-W arm (each tab here can save), its own section
      // right after the buttons — never in the notes — naming no W-row button and pointing neither up nor down.
      const door = page.locator('section.reentry-door')
      if (u.gateDoor === null) {
        await expect(door, `${u.key}: W is not stale, so no door under the buttons`).toHaveCount(0)
      } else {
        await expect(door, `${u.key}: exactly one door under the buttons`).toHaveCount(1)
        const placed = await page.evaluate(() => {
          const actions = document.querySelector('.reentry-confirm > .save-actions')
          const d = document.querySelector('section.reentry-door')
          return actions !== null && d !== null && actions.nextElementSibling === d
        })
        expect(placed, `${u.key}: the door is the next element sibling of the gate's buttons`).toBe(true)
        await expect(door.locator('h3.reentry-door__heading')).toHaveText(u.gateDoor.heading)
        await expect(door.locator('p')).toHaveText(`${u.gateDoor.scope} ${u.gateDoor.route}`)
        await expect(affirm, `${u.key}: the affirm button is described by the scope sentence`).toHaveAccessibleDescription(
          u.gateDoor.scope,
        )
        await expect(door, `${u.key}: the gate names no W-row button`).not.toContainText(
          /Yes, that’s about right|I’ll enter a different figure|Keep \$/,
        )
        await expect(door, `${u.key}: the gate points neither above nor below`).not.toContainText(/\b(above|below)\b/)
        // Council (2): the route's heading is in the body face (the walk-6 round review's L4-5: nothing read it).
        const faces = await door.evaluate((d) => ({
          heading: getComputedStyle(d.querySelector('h3.reentry-door__heading')!).fontFamily,
          body: getComputedStyle(d.querySelector('p')!).fontFamily,
        }))
        expect(faces.heading, `${u.key}: the route's heading is in the body face`).toBe(faces.body)
        // THE COUNCIL'S FIT GATE: the route sits in the first frame at his window, with the buttons it names.
        await settleLayout(page)
        await page.evaluate(() => window.scrollTo(0, 0))
        const doorBox = await door.boundingBox()
        expect(doorBox, 'the door reported no box').not.toBeNull()
        console.log(`[route fit] ?vault=${u.key}: the route's bottom at ${(doorBox!.y + doorBox!.height).toFixed(1)} of ${REAL.height} px`)
        expect(doorBox!.y + doorBox!.height, `${u.key}: route in frame`).toBeLessThanOrEqual(REAL.height)
        // The gate's density pins read AFTER the route fit (a deleted W6 rule reds on its own line with the route check
        // already passed). REAL sits inside the short tier (tokens.css --bp-laptop-short carries the tier's law).
        await assertGateDensity(page, u.key)
      }

      await affirm.click()
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
      await settleLayout(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await (u.dated ? assertResolvedDate(page) : assertNoDateReading(page))
      await (u.dated ? assertOneVisibleDisclaimer(page, 'laptop') : assertOneVisibleDisclaimerNoDate(page))
      // The stale answer survives the save: the result keeps its standing line (R4 — the engine still
      // runs on the last figure given), in the gate's own cause; a moved left over keeps its own (R12). The
      // fresh-vintage answer on `wyclock` carries none. The gate's door section never rides the Result.
      await expect(page.locator('section.reentry-door')).toHaveCount(0)
      const standing = page.locator('.cs-paycheck-note')
      await expect(standing).toHaveCount(u.standing === null ? 0 : 1)
      if (u.standing !== null) {
        if (u.resultDoor !== null) {
          await assertStandingBlock(standing, u.key, u.standing, u.resultDoor)
        } else if (u.standingRuns !== undefined) {
          await assertDoorlessStandingBlock(standing, u.key, u.standing, u.standingRuns, copy.stalenessPayCheckCtaUpdate)
        } else {
          await expect(standing, `${u.key}: the standing slot speaks the gate’s cause`).toContainText(u.standing)
        }
      }
      const doors = await page.locator('.result-quiet-row').boundingBox()
      expect(doors, 'the quiet doors render').not.toBeNull()
      const trailing = await doorsLastWalk(page, 'body')
      expect(trailing.counted).toBeGreaterThan(u.dated ? DOORS_WALK_FLOOR : NO_DATE_DOORS_WALK_FLOOR)
      expect(trailing.maxOtherBottom, `content renders BELOW the quiet doors (${trailing.desc})`).toBeLessThanOrEqual(
        doors!.y + doors!.height + 0.5,
      )

      // THE ROUTE'S END (council `wf_22858e04-f7a` (6)): the gate's route sends the household to this door, and the door
      // opens the panel at the W row, where the choices the route promises must be tappable: "Yes" always (every arm
      // here has a quote), and Keep exactly where the held figure sits above it (ruling 34: never below). The council
      // claims "route in frame", never "Yes in frame", so the reader's own scroll in the sheet is allowed; a clip or a
      // cover is not.
      if (u.sheet !== null) {
        await expect(standing.getByRole('button', { name: u.sheet.cta, exact: true }), `${u.key}: the Result's W door`).toHaveCount(1)
        await standing.getByRole('button', { name: u.sheet.cta, exact: true }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await settleLayout(page)
        const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
        await expect(row, `${u.key}: the door opens the panel at the W row`).toHaveCount(1)
        await assertTappableInSheet(row.locator('label.segment').filter({ hasText: copy.workingCostYes }), `${u.key}: "${copy.workingCostYes}"`)
        if (u.sheet.keep === null) {
          await expect(row.getByRole('button', { name: /^Keep / }), `${u.key}: no Keep door below today's quote (ruling 34)`).toHaveCount(0)
        } else {
          await assertTappableInSheet(row.getByRole('button', { name: u.sheet.keep, exact: true }), `${u.key}: "${u.sheet.keep}"`)
        }
        // The rebuild's host 3 in a real browser (round 2, finding #9: jsdom loads no stylesheet): where the line speaks
        // two or more runs, the left-over seat below draws them as one block whose labels are a step above their text in
        // the body face, at this width where the control sheet's laptop rule widens `.field-help`; and the block ends the
        // seat with no trailing margin (intake.css's `.left-over > div.note-parts:last-child`, the design read). The
        // survivor part rides the seat too, its paragraph after the runs' list (KD7); the seat passes no button, so the
        // survivor part is the block's last part.
        if (u.standingRuns !== undefined) {
          const seatBlock = dialog.locator('[data-assumption-seat="working-year-left-over"] .left-over > div.note-parts')
          await expect(seatBlock, `${u.key}: the left-over seat draws its runs as one block`).toHaveCount(1)
          await assertTypedBelowParts(seatBlock, `${u.key}: the seat`, u.standingRuns, false)
          await assertLabelType(seatBlock, `${u.key}: the seat's runs`)
          const foot = await seatBlock.evaluate((el) => ({ last: el.parentElement?.lastElementChild === el, end: getComputedStyle(el).marginBlockEnd }))
          expect(foot, `${u.key}: the runs end the seat with no trailing margin`).toEqual({ last: true, end: '0px' })
        }
      }
    })
  })
}

// ── U13 follow-up: the AGED date route (?vault=datestale — the re-based odds ladder) ──────────
// The two-time-bases fix (council 2026-07-10): the hero re-derives "years out" from TODAY, and
// the ladder below it must speak the SAME clock — the Caddie panel's hard-flagged blocker was
// the rosier re-derived hero over a save-relative ladder ("about 6 years out" vs "Stopping in
// 8 years … your date"). The DATE route scrolls by design, so this arm pins the ORDER contract
// plus the aged surface's own honesty composition, never a full one-frame fit.

test.describe(`the aged date return (?vault=datestale) — one clock across hero and ladder (${REAL.width}×${REAL.height})`, () => {
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('the hero count and the ladder crown speak the same years-from-today; the aged-balances caveat rides the ladder; order holds', async ({ page }) => {
    await page.goto('/?vault=datestale')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the datestale plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    // The gate's decision pair sits in the first frame on the DATE route's gate too.
    const affirm = page.getByRole('button', { name: /still about right/i })
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

    await expect(page.locator(SETTLED_RESULT)).toBeAttached({
      timeout: FINAL_TIER_MS,
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
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
  test('the year-0 endpoint names the BUILD year, wall-time Today is marked, and no named marker renders left of Today', async ({
    page,
  }) => {
    await page.goto('/?vault=datearrived')
    const unlock = page.getByRole('button', { name: 'Open my plan' })
    await expect(unlock, 'the datearrived plant did not land on the unlock screen').toBeVisible({
      timeout: 30_000,
    })
    await unlock.click()

    const affirm = page.getByRole('button', { name: /still about right/i })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await affirm.click()

    await expect(page.locator(SETTLED_RESULT)).toBeAttached({
      timeout: FINAL_TIER_MS,
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
  test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
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
        // The caveat's distance from the hero's top, from UNROUNDED rects (only a difference of two of
        // these is ever rounded — the twin check below says why).
        const hero = document.querySelector('.confidence-reveal[data-twopane] > .reveal__lead')
        const caveat = document.querySelector('footer.disclaimer.disclaimer--in-frame')
        return {
          surface: cs('.recommendation-surface'),
          disclaimer: cs('footer.disclaimer.disclaimer--in-frame'),
          card: cs('.rec-record'),
          caveatFromHero:
            hero === null || caveat === null ? null : caveat.getBoundingClientRect().bottom - hero.getBoundingClientRect().top,
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
    const affirm = page.getByRole('button', { name: /still about right/i })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.reentry-notes p'), 'the rec plant ages no stamp — no clock may fire').toHaveCount(0)
    await affirm.click()

    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
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
    expect(withCard.caveatFromHero, 'the hero and the caveat must both be on the record-bearing frame').not.toBeNull()
    expect(recordFree.caveatFromHero, 'the hero and the caveat must both be on the record-free frame').not.toBeNull()
    const fromHero = Math.round(withCard.caveatFromHero! - recordFree.caveatFromHero!)
    console.log(
      `[U17 record return] ?vault=rec ${REAL.width}x${REAL.height}: ` +
        `card h=${withCard.card!.height} bottom=${withCard.card!.bottom} · ` +
        `surface r${withCard.surface!.row}c${withCard.surface!.column} h=${withCard.surface!.height} ` +
        `(record-free r${recordFree.surface!.row}c${recordFree.surface!.column} h=${recordFree.surface!.height}) · ` +
        `disclaimer r${withCard.disclaimer!.row} bottom=${withCard.disclaimer!.bottom} ` +
        `(record-free r${recordFree.disclaimer!.row} bottom=${recordFree.disclaimer!.bottom}) · ` +
        `Δfold=${withCard.disclaimer!.bottom - recordFree.disclaimer!.bottom}px · ` +
        `Δcaveat-from-hero=${fromHero}px · frame=${REAL.height}px`,
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
    // alone would survive a re-sized track) — measured as the caveat's distance from the HERO'S TOP,
    // never as two absolute bottoms (the 1440×731 re-point plan's KTD9). `.result` centres any frame
    // shorter than the viewport, and the record-free twin is the shorter frame here (the vault's carries
    // the card and the backup door below the caveat), so wherever the twin fits the viewport it centres
    // and an absolute comparison reads the centring offset instead of the card (about 11px at the old 1536×791
    // once the re-point's density rungs land). The claim is that the card is purely ADDITIVE below the
    // caveat, and the caveat's distance from the hero's top carries it whole. Both distances come from
    // unrounded rects and only their difference is rounded: the two caveats already sit 0.8px apart
    // (the twin's save slot holds the 84.8px CTA where the vault's holds the 84px saved badge), and
    // rounding each distance first could add up to another pixel. A rounded difference of at most 1 absorbs
    // that (it admits an unrounded Δ from −1.5 up to, not including, +1.5 px; the measured Δ is −0.8), nothing more —
    // the breach this replaced was 67px, and the card seated back in grid row 4 moves the caveat ~150px.
    expect(
      Math.abs(fromHero),
      `the caveat moved ${fromHero}px relative to the hero between the record-free and record-bearing ` +
        `frames — the card must be purely additive BELOW it`,
    ).toBeLessThanOrEqual(1)
    // The card's own seat: the row DIRECTLY below the protected caveat, in the LEFT reading column
    // (confidence.css pins it — auto-placement would drop it into the dead right rail, and would
    // move it to the left column only when the household happens to have no backup door).
    expect(withCard.card!.row, 'the card seats on the row below the caveat').toBe('6')
    expect(withCard.card!.column, 'the card reads in the LEFT column with the other doors').toBe('1')

    // (3) The two-mount contract and the density tier are unmoved by the card; REAL sits inside the
    // short tier (tokens.css --bp-laptop-short carries the tier's law), and the card's own rung (W5)
    // reads with the rest.
    await assertOneVisibleDisclaimer(page, 'laptop')
    await assertDensityTier(page, 'short', { record: true })

    // (4) W5's TALL side (the 1440×731 re-point's review, 2026-11-20): no other arm renders a record
    // card above the short tier, so without this read a W5 rule written outside the tier would change
    // the 917 SHOWCASE card while every arm stayed green (R4). The same frame, widened to SHOWCASE,
    // must read every rung dark, the card's own included. A computed-style read only, so the resize
    // needs no fresh load.
    await page.setViewportSize(SHOWCASE)
    await settleLayout(page)
    await assertDensityTier(page, 'tall', { record: true })
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
      const affirm = page.getByRole('button', { name: /still about right/i })
      await expect(affirm).toBeVisible({ timeout: 30_000 })
      await affirm.click()
      await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
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
      // The bound is TIGHT BY CONSTRUCTION (24px of slack at 1440×731 @ 2, under the ~28px a second line
      // costs), so this is a live constraint on the copy rather than a formality: it is what makes the
      // LENGTH note on `recommendRecordSuperseded` in src/ui/copy.ts enforceable instead of advisory.
      // Text is captured so a red names the sentence that outgrew the slack.
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
      await assertSurvivorBasis(page, 'inline')
      // The card's own rung (W5) on BOTH faces, read after the fit and the standing line passed; REAL
      // sits inside the short tier (tokens.css --bp-laptop-short carries the tier's law).
      await assertDensityTier(page, 'short', { record: true })

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
   * card's OWN re-open control, and the one this harness cannot drive: a live solve was 80–200s
   * single-worker (recorded 2026-07-22 above) and, pooled, is still unmeasured at a runner's P = 2;
   * no fit budget carries it. So the beat is INJECTED, exactly as the recold arm injects its third
   * cause clause onto the real card — confidence.css's switch keys on the surface having any direct
   * child that is neither `.sr-only` nor `.rec-aside`, so one appended child reaches the real rule.
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
    const affirm = page.getByRole('button', { name: /still about right/i })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await affirm.click()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
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
    const affirm = page.getByRole('button', { name: /still about right/i })
    await expect(affirm).toBeVisible({ timeout: 30_000 })
    await affirm.click()
    await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
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
      pinnedYear(page),
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

// ── THE SPEND LANE (council wf_faa1af2d-052, 2026-09-26) ───────────────────────────────────────────
// The verdict clause's REAL figure lands a beat after the final answer (spendSolve.ts on its own
// worker lane). While it is in flight the clause RESERVES the widest sized sentence's height (insight
// 035), so the band never jumps when the figure lands; both the pending and the sized frames must hold
// the one-frame law at the laptop; the swap honours reduced motion. `surplus` is the room seed (~5 s).
async function spendLaneBandDelta(page: Page): Promise<{ pendingTop: number; sizedTop: number }> {
  await gotoSeedFinal(page, 'surplus')
  await assertResolvedSpine(page)
  const clause = page.locator('.cs-magnitude')
  // the PENDING frame must be OBSERVED — a solve that landed before this read would make the delta vacuous
  await expect(clause, 'the clause must be caught pending (else the band-delta arm proves nothing)').toHaveAttribute('data-spend', 'pending')
  const pendingTop = (await page.locator('.cs-band').boundingBox())!.y
  await expect(clause).toHaveAttribute('data-spend', 'sized', { timeout: 90_000 })
  await settleLayout(page)
  const sizedTop = (await page.locator('.cs-band').boundingBox())!.y
  await expect(clause).toContainText('Above that, it starts to sit close to the line.')
  return { pendingTop, sizedTop }
}

test.describe('the spend lane — the solved figure lands without moving anything', () => {
  test.describe(`at Briggsy's real window (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    test('surplus: the pending frame fits, the band holds still as the figure lands, the sized frame fits', async ({ page }) => {
      await gotoSeedFinal(page, 'surplus')
      await assertResolvedSpine(page)
      await expect(page.locator('.cs-magnitude')).toHaveAttribute('data-spend', 'pending')
      await assertFrameFits(page, true) // the RESERVED (pending) frame
      await expect(page.locator('.cs-magnitude')).toHaveAttribute('data-spend', 'sized', { timeout: 90_000 })
      await settleLayout(page)
      await assertFrameFits(page, true) // the sized frame
      await assertSurvivorBasis(page, 'inline')
    })
  })
  test.describe(`on the phone (${PHONE.width}×${PHONE.height})`, () => {
    test.use({ viewport: PHONE })
    test('surplus: the band below the clause does not move when the figure lands (reserve ≥ the sized clause)', async ({ page }) => {
      const { pendingTop, sizedTop } = await spendLaneBandDelta(page)
      expect(Math.abs(sizedTop - pendingTop), `band moved ${sizedTop - pendingTop}px as the figure landed`).toBeLessThanOrEqual(0.5)
    })
  })
  test.describe('under prefers-reduced-motion', () => {
    test.use({ viewport: PHONE })
    test('surplus: the figure lands with NO transition on the swapped clause', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' }) // test.use({ reducedMotion }) did not apply here — see the 24 px arm
      await spendLaneBandDelta(page)
      const diag = await page.locator('.cs-magnitude').evaluate((el) => ({ swapped: el.classList.contains('cs-swap'), reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, td: getComputedStyle(el).transitionDuration }))
      expect(diag.reduce, 'the reduced-motion premise').toBe(true)
      expect(diag.swapped, 'the clause must have SWAPPED (else no transition is vacuous)').toBe(true)
      const transition = diag.td
      expect(transition.split(',').every((d) => parseFloat(d) === 0), `transition-duration ${transition}`).toBe(true)
    })
  })
})

// ── THE COMPOSITES PROBE — RECORD-ONLY, never asserted (the one-frame composites plan's U4, KTD6; its U6
// DELETES this describe) ─────────────────────────────────────────────────────────────────────────────
// The plan's six new frames (`docs/plans/features/one-frame-composites-build-spec.md`): `?seed=patypical`
// and the five vault plants of its U3. Before any rung or assertion lands, each one's bottoms are READ on
// CI's Linux beside Windows (insight 075: Linux can wrap a line taller), at every size its U6 arm will
// assert: `patypical` at REAL, TIER and SHOWCASE (it joins SPINE_SEEDS in U6), each vault plant at REAL
// (the size the `?vault=stale` arm and the record loop assert). Each arm drives its frame the way its
// asserting arm will, at the plant's declared day (a yearly return is viewed at RETURN_DAY), asserts the
// tier it expects there (insight 125), asserts NO fit, and prints one line per frame and size:
//   [fit probe] <plant> <size>: clock=<YYYY-MM-DD> attempt=<n> caveat bottom=<px> left end=<px>
//   band end=<px> survivor=<inline|folded|none> medicare note=<0|1> state note=<0|1>
//   [ gate affirm bottom=<px> gate notes=<n>] [ standing bottom=<px> causes=<n>] [ doors bottom=<px>]
// (all on one log line). The clock is the page's own day, read back. The attempt is Playwright's retry
// index, so a retried arm's lines tell themselves apart: read the final attempt only, and an arm whose
// attempts disagree is unknown, which fails the frame. The presence fields are what U6 writes into
// `patypical`'s SPINE_SEEDS row and the yearly-return arms' survivor and note checks, read, never guessed.
// The caveat is the in-frame R13 disclaimer; the left end is the save slot's bottom + 2 px, the left
// column's comparable end; the band end is the band's bottom (it spans grid rows 1 to 5), printed because
// on an aged frame the band can bind (the plan's A5). The gate fields are a vault return's re-entry gate
// before the affirm; the record fields are the card's standing line and its cause list; the doors are the
// quiet row at SHOWCASE, where the full fit includes them. A missing element throws; a non-finite value
// fails the arm; it never prints a blank.
type ProbeSize = 'REAL' | 'TIER' | 'SHOWCASE'

type ProbeGate = { readonly affirmBottom: number; readonly notes: number }

/** A vault plant's drive, step for step as its asserting arm takes it, reading the re-entry gate on the
 *  way: pin the plant's declared day, unlock, read the affirm and the gate's notes, affirm, settle. */
async function driveProbeVault(page: Page, key: string): Promise<ProbeGate> {
  await pinPlantDay(page, key)
  await page.goto(`/?vault=${key}`)
  const unlock = page.getByRole('button', { name: 'Open my plan' })
  await expect(unlock, `?vault=${key}: the plant did not land on the unlock screen`).toBeVisible({ timeout: 30_000 })
  await unlock.click()
  const affirm = page.getByRole('button', { name: /still about right/i })
  await expect(affirm, `?vault=${key}: the re-entry gate never mounted`).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const box = await affirm.boundingBox()
  if (box === null) throw new Error(`[fit probe] ?vault=${key}: the gate's affirm reported no box`)
  const notes = await page.locator('.reentry-notes p').count()
  await affirm.click()
  await expect(page.locator(SETTLED_RESULT)).toBeAttached({ timeout: FINAL_TIER_MS })
  await settleLayout(page)
  return { affirmBottom: box.y + box.height, notes }
}

async function printCompositeProbe(
  page: Page,
  frame: string,
  size: ProbeSize,
  opts: { readonly record: boolean; readonly gate?: ProbeGate },
): Promise<void> {
  await assertTier(page, 'laptop')
  const shortTier = await page.evaluate(() => window.matchMedia('(min-width: 68rem) and (max-height: 840px)').matches)
  expect(shortTier, `${frame} ${size}: the short density tier is on at REAL and TIER and off at SHOWCASE`).toBe(size !== 'SHOWCASE')
  const read = await page.evaluate(
    ({ record, doors }) => {
      const bottom = (sel: string): number => {
        const el = document.querySelector(sel)
        if (el === null) throw new Error(`[fit probe] ${sel} is not on the page`)
        return el.getBoundingClientRect().bottom
      }
      const survivor =
        document.querySelector('details.survivor-fold') !== null
          ? 'folded'
          : document.querySelector('.survivor__basis') !== null
            ? 'inline'
            : 'none'
      return {
        px: {
          caveat: bottom('footer.disclaimer.disclaimer--in-frame'),
          leftEnd: bottom('.confidence-reveal[data-twopane] .result-save-slot') + 2,
          bandEnd: bottom('.confidence-reveal[data-twopane] > .cs-band'),
          ...(record ? { standing: bottom('.rec-record__standing') } : {}),
          ...(doors ? { doors: bottom('.result-quiet-row') } : {}),
        },
        survivor,
        medicareNote: document.querySelectorAll('.cs-medicare-note').length,
        stateNote: document.querySelectorAll('.cs-state-note').length,
        causes: record ? document.querySelectorAll('.rec-record__causes li').length : null,
      }
    },
    { record: opts.record, doors: size === 'SHOWCASE' },
  )
  const px: Record<string, number> = { ...read.px, ...(opts.gate === undefined ? {} : { gateAffirm: opts.gate.affirmBottom }) }
  for (const [what, value] of Object.entries(px)) {
    expect(Number.isFinite(value), `[fit probe] ${frame} ${size}: ${what} is not a number`).toBe(true)
  }
  const clock = new Date((await pageDay(page)) * 86_400_000).toISOString().slice(0, 10)
  const f = (n: number): string => n.toFixed(1)
  console.log(
    `[fit probe] ${frame} ${size}: clock=${clock} attempt=${test.info().retry} ` +
      `caveat bottom=${f(read.px.caveat)} left end=${f(read.px.leftEnd)} band end=${f(read.px.bandEnd)} ` +
      `survivor=${read.survivor} medicare note=${read.medicareNote} state note=${read.stateNote}` +
      (opts.gate === undefined ? '' : ` gate affirm bottom=${f(opts.gate.affirmBottom)} gate notes=${opts.gate.notes}`) +
      (read.px.standing === undefined ? '' : ` standing bottom=${f(read.px.standing)} causes=${read.causes}`) +
      (read.px.doors === undefined ? '' : ` doors bottom=${f(read.px.doors)}`),
  )
}

test.describe("the composites probe — RECORD-ONLY, never asserted (the one-frame composites plan's U4)", () => {
  for (const size of ['REAL', 'TIER', 'SHOWCASE'] as const) {
    test.describe(`?seed=patypical at ${size}`, () => {
      if (size === 'REAL') test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
      else test.use({ viewport: size === 'TIER' ? TIER : SHOWCASE })
      test(`?seed=patypical ${size} — Pennsylvania answering "not sure", fresh`, async ({ page }) => {
        await gotoSeedFinal(page, 'patypical')
        await assertResolvedSpine(page)
        await printCompositeProbe(page, '?seed=patypical', size, { record: false })
      })
    })
  }

  test.describe(`the vault plants at REAL (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
    test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
    for (const { key, record, echo, what } of [
      { key: 'yearpa', record: false, echo: true, what: 'Pennsylvania "not sure" at its yearly return' },
      { key: 'yearfailing', record: false, echo: true, what: 'the off-track household "not sure" at its yearly return' },
      { key: 'yearrec', record: true, echo: true, what: 'the entered-extras household at its yearly return, with a record' },
      { key: 'recpa', record: true, echo: false, what: 'Pennsylvania "not sure" with a record that holds, fresh' },
      { key: 'yearparec', record: true, echo: true, what: 'Pennsylvania "not sure" at its yearly return, with a record' },
    ] as const) {
      test(`?vault=${key} REAL — ${what}`, async ({ page }) => {
        const gate = await driveProbeVault(page, key)
        await assertResolvedSpine(page)
        await printCompositeProbe(page, `?vault=${key}`, 'REAL', { record, gate })
        // After the line, so the numbers print either way: the frame read is the one U6 will assert.
        await expect(page.locator('.cs-staleness-note'), `?vault=${key}: the staleness echo`).toHaveCount(echo ? 1 : 0)
      })
    }
  })
})

// ── the pay check: its two intake steps, its panel row and its standing line (U8) ───────────────
//
// THE INTAKE STEP CONTRACT (defined here, 2026-10-30 — the one-frame law above is a RESULT-frame law,
// and the intake scrolls by design: a step's help and the money picture run long on a phone). What a
// scrolling step owes the reader instead:
//   (a) its question lands in the first frame — the step heading ends above the fold;
//   (b) nothing inside the flow spills sideways — every rendered box inside `.intake-shell` sits within
//       the viewport's width, and the document never scrolls sideways;
//   (c) every figure in the money picture reads WHOLE — no `.wy-row__value` clipped by its row;
//   (d) Continue is in the document below the content, never overlapped by it.
// The walk is SCOPED to `.intake-shell`: the App's trailing disclaimer sits below the 100svh shell by
// design, and a `body *` walk would read it as an offender on every intake frame.
// PHONE runs under the intake precedent's FULL mobile emulation (`e2e/intake-fold.spec.ts`), never the
// bare-viewport phone the result arms above use: the intake is what a reader types into on a phone.

/** The rendered boxes inside a scope that spill past the viewport's right edge (or its left), the
 *  document's sideways scroll, and how many boxes the walk counted (insight 029: a blank page must
 *  fail the floor, never pass an empty-offender check). */
async function sidewaysReport(
  page: Page,
  scope: string,
): Promise<{ readonly counted: number; readonly offenders: readonly string[]; readonly docOverflow: number }> {
  return page.evaluate((sel) => {
    const vw = document.documentElement.clientWidth
    const offenders: string[] = []
    let counted = 0
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`${sel} *`))) {
      if (el.closest('.sr-only') !== null) continue
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') continue
      if (el.getClientRects().length === 0) continue
      const r = el.getBoundingClientRect()
      if (r.width <= 1 || r.height <= 1) continue
      counted++
      if (r.right > vw + 0.5 || r.left < -0.5) {
        const cls = el.getAttribute('class')
        offenders.push(`${el.tagName.toLowerCase()}${cls !== null && cls !== '' ? `.${cls.split(/\s+/)[0]}` : ''} [${Math.round(r.left)}, ${Math.round(r.right)}] of ${vw}`)
      }
    }
    const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    return { counted, offenders, docOverflow }
  }, scope)
}

/** Every money-picture figure that does not fit its own box (its text clipped or spilling), and how many
 *  figures the walk read — (c)'s own non-vacuity count (insight 029; the whole-file review, H-D10): an
 *  offender list alone is empty when the selector matches NOTHING, so a renamed `.wy-row__value` would
 *  have passed every arm as "every figure whole". */
async function clippedFigures(
  page: Page,
  scope: string,
): Promise<{ readonly counted: number; readonly offenders: readonly string[] }> {
  return page.evaluate((sel) => {
    const offenders: string[] = []
    const figures = Array.from(document.querySelectorAll<HTMLElement>(`${sel} .wy-row__value`))
    for (const el of figures) {
      if (el.scrollWidth > el.clientWidth + 1) offenders.push(`${el.textContent ?? ''} (${el.scrollWidth} > ${el.clientWidth})`)
      const row = el.closest('.wy-rows')
      if (row !== null) {
        const r = el.getBoundingClientRect()
        const box = row.getBoundingClientRect()
        if (r.right > box.right + 0.5 || r.left < box.left - 0.5) offenders.push(`${el.textContent ?? ''} outside its group`)
      }
    }
    return { counted: figures.length, offenders }
  }, scope)
}

/** The figures a money picture of `date`'s household must show (`?seed=datecoststale` once re-answered,
 *  walk and panel alike; `?seed=datesaved`, walk and panel, whose "All of it" moves no year-0 line — the
 *  credit lands at the year's end, KTD12): year 0's nonzero lines from the U10 hand derivation
 *  (`b9-u10-tools/year0check`, every rate from its primary) — pay $150,000, payroll tax $11,475, the tax on
 *  outside income $17,540, deposits $20,000, W — and the bottom line, which every picture carries
 *  (`WorkingYearLedger.tsx` draws any other line only above $0; no Social Security, no other income, nobody
 *  on Medicare yet). Later years only add to it. Build 2's left-over question below the picture adds none:
 *  its year-0 figure is a sentence (`.left-over__figure`), never a `.wy-row__value`, so its own arms read
 *  it by text. */
const DATE_PICTURE_FIGURES = 6

/** (a)–(d) on the step the page stands on. `minBoxes` is the arm's own non-vacuity floor; `minFigures`
 *  is (c)'s — the money-picture figures the frame must read before "none clipped" means anything. `0`
 *  only on a frame that carries no picture (the W step; the unknown face), where (c) has nothing to read. */
async function assertIntakeStepHolds(page: Page, where: string, minBoxes: number, minFigures: number): Promise<void> {
  await settleLayout(page)
  const heading = await page.locator('.step-heading').boundingBox()
  expect(heading, `${where}: the step heading must render`).not.toBeNull()
  const innerHeight = await page.evaluate(() => window.innerHeight)
  expect(heading!.y + heading!.height, `${where}: the question is below the first frame`).toBeLessThanOrEqual(innerHeight)
  const sideways = await sidewaysReport(page, '.intake-shell')
  expect(sideways.counted, `${where}: the walk counted too few boxes — the step did not render`).toBeGreaterThan(minBoxes)
  expect(sideways.offenders, `${where}: boxes spill past the viewport's sides`).toEqual([])
  expect(sideways.docOverflow, `${where}: the document scrolls sideways`).toBeLessThanOrEqual(0)
  const figures = await clippedFigures(page, '.intake-shell')
  expect(figures.counted, `${where}: the walk read too few money-picture figures — (c) would pass on nothing`).toBeGreaterThanOrEqual(
    minFigures,
  )
  expect(figures.offenders, `${where}: a money-picture figure is clipped`).toEqual([])
  const body = await page.locator('.step-body').boundingBox()
  const nav = await page.locator('.intake-nav').boundingBox()
  expect(body !== null && nav !== null, `${where}: the step body and its nav must render`).toBe(true)
  expect(nav!.y, `${where}: Continue overlaps the step's content`).toBeGreaterThanOrEqual(body!.y + body!.height - 0.5)
}

/** The Result's standing slot, placed (`.fod-note.cs-paycheck-note` — a `<p>`, or W's block `div.note-parts` for a
 *  "saved" answer waiting on W: the pay check's KTD21 line, and build 2's
 *  moved left over in the same slot, keyed by cause — R12): the lead's LAST note and before the graphs in DOM
 *  order (at REAL the graphs sit BESIDE the lead, so "above" is DOM order there); at PHONE above the first
 *  graph in geometry, with the caveat's order and reach; at REAL one visible disclaimer and the doors last.
 *  The caller has pinned the line's count and words; this reads only where it sits. `dated: false` — the no-date
 *  reading draws no band, so at PHONE there is no first graph to sit above (DOM order and the caveat still bind). */
async function assertStandingLinePlaced(page: Page, line: Locator, phone: boolean, dated = true): Promise<void> {
  const order = await page.evaluate(() => {
    const lead = document.querySelector('.fod-reveal .reveal__lead')
    const notes = lead === null ? [] : Array.from(lead.querySelectorAll(':scope > .fod-note'))
    const pay = document.querySelector('.cs-paycheck-note')
    const graphs = document.querySelector('.fod-graphs')
    return {
      last: notes.length > 0 && notes[notes.length - 1] === pay,
      beforeGraphs: pay !== null && graphs !== null && (pay.compareDocumentPosition(graphs) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    }
  })
  expect(order.last, 'the line is the lead’s last note').toBe(true)
  expect(order.beforeGraphs, 'the line comes before the graphs').toBe(true)
  if (phone) {
    // At PHONE `.fod-graphs` is display:contents (no box), so the first graph is the geometry.
    if (dated) {
      const lineBox = await line.boundingBox()
      const band = await page.locator('.fod-band').boundingBox()
      expect(lineBox !== null && band !== null).toBe(true)
      expect(lineBox!.y + lineBox!.height, 'the line sits above the first graph').toBeLessThanOrEqual(band!.y + 0.5)
    }
    await (dated ? assertOneVisibleDisclaimer(page, 'narrow') : assertOneVisibleDisclaimerNoDate(page))
    await assertCaveatOrderAndReach(page, DATE_VERDICT, dated ? DOORS_WALK_FLOOR : NO_DATE_DOORS_WALK_FLOOR)
  } else {
    await (dated ? assertOneVisibleDisclaimer(page, 'laptop') : assertOneVisibleDisclaimerNoDate(page))
    const doors = await page.locator('.result-quiet-row').boundingBox()
    expect(doors, 'the quiet doors render').not.toBeNull()
    const trailing = await doorsLastWalk(page, 'body')
    expect(trailing.counted).toBeGreaterThan(dated ? DOORS_WALK_FLOOR : NO_DATE_DOORS_WALK_FLOOR)
    expect(trailing.maxOtherBottom, `content renders BELOW the quiet doors (${trailing.desc})`).toBeLessThanOrEqual(
      doors!.y + doors!.height + 0.5,
    )
  }
}

/** Build 2's left-over seat in the open assumptions panel — its own row BELOW the W row (KTD8). */
const LEFT_OVER_SEAT = '[role="dialog"] [data-assumption-seat="working-year-left-over"]'

/** The seat's face once its replies show (R5, R6): exactly the three replies under the static legend, `checked`
 *  the one reply checked (or none), the year-0 figure line, and the one line below the group — every string the
 *  shipped one, every count exact, so a seat that rendered nothing (or rendered its replies elsewhere) reds.
 *  Then nothing in the seat spills sideways, over a counted floor. The caller has scrolled the seat in. */
async function assertLeftOverSeatFace(
  page: Page,
  where: string,
  face: { readonly checked: string | null; readonly figure: string; readonly line: string },
): Promise<void> {
  const seat = page.locator(LEFT_OVER_SEAT)
  await expect(seat, `${where}: the left-over seat renders once`).toHaveCount(1)
  await expect(seat.locator('.ap-row__name')).toHaveText(copy.assumptionWorkingCostLeftOverName)
  const group = seat.getByRole('group', { name: copy.workingLedgerLeftOverLegend })
  await expect(group).toHaveCount(1)
  await expect(group.getByRole('radio'), `${where}: exactly the three replies, in the group`).toHaveCount(3)
  await expect(seat.getByRole('radio'), `${where}: no reply outside the group`).toHaveCount(3)
  await expect(seat.getByRole('radio', { checked: true }), `${where}: the checked reply`).toHaveCount(face.checked === null ? 0 : 1)
  if (face.checked !== null) await expect(group.getByRole('radio', { name: face.checked, exact: true })).toBeChecked()
  await expect(seat.locator('.left-over__figure'), `${where}: the year-0 figure line`).toHaveText(face.figure)
  await expect(seat.locator('.left-over__line'), `${where}: the line below the group`).toHaveText(face.line)
  const sideways = await sidewaysReport(page, LEFT_OVER_SEAT)
  // The boxes inside the seat's row (the walk reads its descendants): its name, the question's root, the
  // figure and check lines, the fieldset, its legend and the legend's text, the track, three replies, and the
  // line below — 12, measured at both sizes (the radios themselves are `.sr-only`, which the walk skips).
  expect(sideways.counted, `${where}: the walk counted too few boxes — the seat did not render`).toBeGreaterThanOrEqual(12)
  expect(sideways.offenders, `${where}: the seat spills past the viewport`).toEqual([])
  expect(sideways.docOverflow, `${where}: the document scrolls sideways`).toBeLessThanOrEqual(0)
}

const PAY_CHECK_VIEWPORTS = [
  { name: `${REAL.width}×${REAL.height}`, use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
  { name: `phone ${PHONE.width}×${PHONE.height}`, use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true } },
] as const

for (const vp of PAY_CHECK_VIEWPORTS) {
  test.describe(`the pay check’s W step and money picture (${vp.name})`, () => {
    test.use(vp.use)

    test('?seed=datecoststale: the stale face, the blocked Continue, the figure option, then the answered picture', async ({ page }) => {
      await rewalkSeedTo(page, 'datecoststale', copy.qWorkingCostHeading, { final: true })
      // The stale face: the calm note before any tap, no answer checked, no alert.
      await expect(page.getByRole('note')).toContainText(slots.workingCostStaleQuote('84,000', '78,000'))
      await expect(page.getByRole('alert')).toHaveCount(0)
      await assertIntakeStepHolds(page, 'W step, stale', 25, 0)
      // A blocked Continue: the gate's message under the fork, the fork marked invalid.
      await page.evaluate(() => document.querySelector<HTMLButtonElement>('.intake-nav .btn-primary')?.click())
      await expect(page.getByRole('alert')).toContainText(copy.errWorkingCostUnanswered)
      await expect(page.locator('fieldset[role="radiogroup"]')).toHaveAttribute('aria-invalid', 'true')
      await assertIntakeStepHolds(page, 'W step, blocked', 25, 0)
      // The figure option open: the field and its period control in one slot.
      await page.getByRole('radio', { name: copy.workingCostDifferent }).evaluate((el) => (el as HTMLInputElement).click())
      // By role and EXACT name: a bare getByLabel matches by substring, and the fork's legend ("Is that about
      // what a year costs while you’re working?") contains the field's own label.
      await expect(page.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true })).toBeVisible()
      await expect(page.getByRole('radio', { name: copy.periodMonth })).toBeChecked()
      await assertIntakeStepHolds(page, 'W step, figure open', 30, 0)
      // Re-answer "yes" and walk on to the picture of the answered household.
      await page.getByRole('radio', { name: copy.workingCostYes }).evaluate((el) => (el as HTMLInputElement).click())
      await page.evaluate(() => document.querySelector<HTMLButtonElement>('.intake-nav .btn-primary')?.click())
      await expect(page.locator('.step-heading')).toHaveText(copy.qWorkingLedgerHeading)
      await expect(page.locator('.wy-row--bottom')).toContainText(copy.workingLedgerLeftOver)
      await assertIntakeStepHolds(page, 'money picture, datecoststale', 40, DATE_PICTURE_FIGURES)
      // Build 2's question now renders below this picture (W fresh again, nothing answered), so (d) above is
      // the walk's real fit read of the UNANSWERED face — counted, or (d) would pass on the picture alone if
      // the question vanished. Its figure by hand: `date`'s $16,985 with W re-answered at the $78,000 quote,
      // $6,000 less going out (W comes off the bottom line dollar for dollar; nothing else in year 0 reads
      // the spending) — $22,985. Nothing checked (R1), and the unanswered line below the group.
      const question = page.locator('.intake-shell .step-body .left-over')
      await expect(question, 'the left-over question renders once, inside the step').toHaveCount(1)
      const replies = question.getByRole('group', { name: copy.workingLedgerLeftOverLegend }).getByRole('radio')
      await expect(replies, 'exactly the three replies, in the group').toHaveCount(3)
      await expect(question.getByRole('radio', { checked: true }), 'an unanswered question checks no reply').toHaveCount(0)
      await expect(question.locator('.left-over__figure')).toHaveText(slots.workingLedgerLeftOverFigure('22,985'))
      await expect(question.locator('.left-over__line')).toHaveText(slots.workingLedgerLeftOverAbsentLine('22,985'))
    })

    test('?seed=datesaved: the left-over question below the whole picture — three replies, "All of it" checked at its figure', async ({ page }) => {
      await rewalkSeedTo(page, 'datesaved', copy.qWorkingLedgerHeading, { final: true })
      await expect(page.locator('.wy-row--bottom')).toContainText(copy.workingLedgerLeftOver)
      // (a)–(d) with the question in the step: its replies and lines are inside `.step-body`, so (d) reads
      // Continue below the question, never only below the picture.
      await assertIntakeStepHolds(page, 'money picture, datesaved', 50, DATE_PICTURE_FIGURES)
      // THE NON-VACUITY COUNT (U9: "the fit arms count the three radios and the figure line, so an empty pass
      // reds"), scoped to the question's own root, never the page: a page-wide count would pass on replies
      // rendered anywhere, and a vanished question would leave (a)–(d) green on the picture alone.
      const question = page.locator('.intake-shell .step-body .left-over')
      await expect(question, 'the left-over question renders once, inside the step').toHaveCount(1)
      const group = question.getByRole('group', { name: copy.workingLedgerLeftOverLegend })
      await expect(group).toHaveCount(1)
      // Three in the question's own group, and no other reply anywhere in its root.
      await expect(group.getByRole('radio'), 'exactly the three replies, in the group').toHaveCount(3)
      await expect(question.getByRole('radio'), 'no reply outside the group').toHaveCount(3)
      await expect(question.getByRole('radio', { checked: true }), 'exactly one reply checked').toHaveCount(1)
      await expect(group.getByRole('radio', { name: copy.workingLedgerLeftOverSaved, exact: true })).toBeChecked()
      // The figure line, and the saved line below the group, in `date`'s hand-derived $16,985 (the unlock
      // block's derivation above): the stored answer and the live figure agree, so the plain "saved" line.
      await expect(question.locator('.left-over__figure')).toHaveText(slots.workingLedgerLeftOverFigure('16,985'))
      await expect(question.locator('.left-over__line')).toHaveText(slots.workingLedgerLeftOverSavedLine('16,985'))
      // Below the WHOLE picture (KTD8: never inside it), in geometry as well as DOM order.
      const placed = await page.evaluate(() => {
        const ledger = document.querySelector('.intake-shell .wy-ledger')
        const q = document.querySelector('.intake-shell .left-over')
        if (ledger === null || q === null) return null
        return {
          outside: !ledger.contains(q),
          ledgerBottom: ledger.getBoundingClientRect().bottom,
          questionTop: q.getBoundingClientRect().top,
        }
      })
      expect(placed, 'the picture and the question both render').not.toBeNull()
      expect(placed!.outside, 'the question is never inside the picture').toBe(true)
      expect(placed!.questionTop, 'the question starts below the whole picture').toBeGreaterThanOrEqual(placed!.ledgerBottom - 0.5)
    })

    test('?seed=dateshort: the picture at its fullest — held-back Social Security, Medicare from savings, every later year short', async ({ page }) => {
      await rewalkSeedTo(page, 'dateshort', copy.qWorkingLedgerHeading, { final: true })
      await expect(page.locator('.wy-row--bottom')).toContainText(copy.workingLedgerShort)
      // The held-back words are the shipped slot's, never re-typed (the header's catalog law; the whole-file
      // review, H-D11). $2,760 is U10's hand derivation (`b9-u10-tools/year0check`, typed from the primary):
      // Alex's $30,000 of pay less the 2026 lower exempt amount (`earningsTestExemptAmounts`), $1 held back
      // for every $2 above it. Year 0 is not her full-retirement-age year, so the plain sentence, never the
      // "at most" one.
      await expect(page.locator('.wy-ledger')).toContainText(slots.workingLedgerSsHeldBack('2,760'))
      await expect(page.getByRole('heading', { level: 3, name: copy.workingLedgerAlsoFromSavings })).toBeVisible()
      await expect(page.getByRole('heading', { level: 3, name: copy.workingLedgerLaterHeading })).toBeVisible()
      await expect(page.locator('[role="alert"], .wy-ledger [aria-live]')).toHaveCount(0)
      // (c)'s floor, by hand from the same derivation: pay $30,000 and Social Security $27,960 coming in;
      // payroll tax $2,295, deposits $3,000 and W going out (its tax on outside income is $0, so no line);
      // the bottom line; and at least one line under each of the two headings just seen (a group draws its
      // heading only over a line) — 8.
      await assertIntakeStepHolds(page, 'money picture, dateshort', 60, 8)
    })

    test('?seed=datesolo: the refusal witness walks every step, and its picture step reads one calm line', async ({ page }) => {
      await rewalkSeedTo(page, 'datesolo', copy.qWorkingLedgerHeading)
      // Nothing the household can enter draws a picture (no "yet"), and the step points at the answer
      // strip, which names the blocker ONCE on the screen (rulings 36; b9-3's C13 dropped the "yet").
      const face = page.locator('.wy-ledger--unknown')
      await expect(face).toContainText(copy.workingLedgerUnknownLeadFinal)
      await expect(face).not.toContainText(copy.workingLedgerUnknownLead)
      await expect(face).toContainText(copy.workingLedgerUnknownSeeStrip)
      await expect(page.locator('.answer-strip')).toContainText(copy.employerCoverageUnpriced)
      expect(
        await page.evaluate((needle) => document.body.innerText.split(needle).length - 1, copy.employerCoverageUnpriced),
        'the blocker is named once on the screen, in the strip',
      ).toBe(1)
      await expect(page.locator('.intake-shell dl')).toHaveCount(0)
      await assertIntakeStepHolds(page, 'money picture, unknown', 10, 0)
    })
  })

  test.describe(`the pay check’s standing line and panel row on ?seed=datecoststale (${vp.name})`, () => {
    test.use(vp.use)

    test('the line sits in the lead after the other notes, above the graphs, doors last; its door opens the panel at the W row', async ({ page }) => {
      await gotoSeedFinal(page, 'datecoststale')
      await assertResolvedDate(page)
      const line = page.locator('.fod-reveal .reveal__lead > p.fod-note.cs-paycheck-note')
      await expect(line, 'the standing line renders in the lead').toHaveCount(1)
      await expect(line).toContainText(copy.stalenessPayCheckNote)
      await assertStandingLinePlaced(page, line, vp.use.viewport.width === PHONE.width)
      // The door: the panel opens AT the W row — its name focused, the row inside the dialog, nothing
      // spilling sideways — and a "yes" there draws the picture under h4 legends, every figure whole.
      await page.getByRole('button', { name: copy.stalenessPayCheckCta }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await page.waitForTimeout(400)
      const focusedName = await page.evaluate(() => document.activeElement?.textContent ?? '')
      expect(focusedName).toBe(copy.assumptionWorkingCostName)
      const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
      const dialogBox = await dialog.boundingBox()
      const nameBox = await row.locator('.ap-row__name').boundingBox()
      expect(dialogBox !== null && nameBox !== null).toBe(true)
      expect(nameBox!.y, 'the W row’s name is scrolled into the dialog').toBeGreaterThanOrEqual(dialogBox!.y - 0.5)
      expect(nameBox!.y + nameBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 0.5)
      await expect(row.getByRole('note')).toContainText(slots.workingCostStaleQuote('84,000', '78,000'))
      await row.getByRole('radio', { name: copy.workingCostYes }).evaluate((el) => (el as HTMLInputElement).click())
      await expect(row.getByRole('heading', { level: 4, name: copy.workingLedgerComingIn })).toBeVisible({ timeout: 30_000 })
      await row.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await settleLayout(page)
      const sideways = await sidewaysReport(page, '[role="dialog"] [data-assumption-seat="working-year-cost"]')
      expect(sideways.counted).toBeGreaterThan(30)
      expect(sideways.offenders, 'the W row spills past the viewport').toEqual([])
      const panelFigures = await clippedFigures(page, '[role="dialog"]')
      expect(panelFigures.counted, 'the panel picture read too few figures — "none clipped" would pass on nothing').toBeGreaterThanOrEqual(
        DATE_PICTURE_FIGURES,
      )
      expect(panelFigures.offenders, 'a panel money-picture figure is clipped').toEqual([])
    })
  })

  // ── the U11 walk's (ae): the risen family's longest words on the W surfaces and the Result. The W step's note and
  //    the panel's W row carry the year-level lean and never a figure at the quote (the fork's description: the
  //    red team's attack 4); the standing line carries the five-sentence later-short line. Fix the layout, never
  //    cut the content. ──
  test.describe(`the risen family’s stale words on ?seed=datesavedrisenlater (${vp.name})`, () => {
    test.use(vp.use)

    test('the W step’s stale face holds with the year-level lean, and no figure at the quote', async ({ page }) => {
      await rewalkSeedTo(page, 'datesavedrisenlater', copy.qWorkingCostHeading, { final: true })
      const note = page.getByRole('note')
      await expect(note).toContainText(
        `${slots.workingCostStaleQuote('84,000', '105,000')} ${slots.workingCostStaleLeftOverYearsCheaper('84,000')}`,
      )
      await expect(note, 'no whole-answer lean on a "saved" note').not.toContainText(slots.workingCostStaleLeansBetter('84,000'))
      await expect(note, 'no figure at the quote in the fork’s description').not.toContainText('5,985')
      await assertIntakeStepHolds(page, 'W step, stale, saved', 25, 0)
    })

    test('the standing line carries the whole later-short line in place; its door opens a W row whose note holds the lean, nothing sideways', async ({ page }) => {
      await gotoSeedFinal(page, 'datesavedrisenlater')
      await assertNoDateReading(page)
      // A "saved" answer waiting on W: the slot is W's block (`div.note-parts`, council `wf_22858e04-f7a`), still the
      // lead's direct child in the same `.fod-note` register; its words read across the dt/dd as `innerText`.
      const line = page.locator('.fod-reveal .reveal__lead > div.note-parts.fod-note.cs-paycheck-note')
      await expect(line, 'the standing line renders in the lead').toHaveCount(1)
      await assertStandingBlock(line, 'datesavedrisenlater', `${copy.stalenessPayCheckNote} ${RISEN_LATER_LINE}`, risenResultDoor('105,000'))
      await assertStandingLinePlaced(page, line, vp.use.viewport.width === PHONE.width, false)
      // Below the quote the door says "update" (council `wf_7fa86902-35c`): the W row offers no Keep door there.
      await page.getByRole('button', { name: copy.stalenessPayCheckCtaUpdate }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
      await expect(row.getByRole('note')).toContainText(slots.workingCostStaleLeftOverYearsCheaper('84,000'))
      await row.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await settleLayout(page)
      const sideways = await sidewaysReport(page, '[role="dialog"] [data-assumption-seat="working-year-cost"]')
      expect(sideways.counted, 'the W row rendered').toBeGreaterThan(10)
      expect(sideways.offenders, 'the W row spills past the viewport').toEqual([])
    })
  })

  // ── the whole-window rebuild's five-span line in the Result's standing slot (walk 8's first added target;
  //    `datesavedtypedpension`): no typed-below seed had a placement arm. An ordered list of five labelled runs under the
  //    cap sentence and the scoped lead, then the survivor part's paragraph (the walk-8 form council's KD7 and KD8), with
  //    no door of its own, its button its last child; the lead's last note and before the graphs (the no-date reading
  //    draws no band, so at PHONE no first graph to sit above), doors last. The date route scrolls, so no one-frame
  //    claim: whether five runs read as a wall is walk 9's read. ──
  test.describe(`the typed-below line’s five spans on ?seed=datesavedtypedpension (${vp.name})`, () => {
    test.use(vp.use)

    test('the block sits in the lead after the other notes, above the graphs, doors last; five labelled spans, its button last', async ({ page }) => {
      await gotoSeedFinal(page, 'datesavedtypedpension')
      await assertNoDateReading(page)
      const line = page.locator('.fod-reveal .reveal__lead > div.note-parts.fod-note.cs-paycheck-note')
      await expect(line, 'the typed-below block renders in the lead').toHaveCount(1)
      await assertDoorlessStandingBlock(
        line,
        'datesavedtypedpension',
        typedPensionLine('This', TYPED_MOVED_CLAUSE),
        TYPED_PENSION_RUNS,
        copy.stalenessPayCheckCtaUpdate,
      )
      // ONE CAUSE, ONE LINE: the moved line's own lead never shares the slot this line holds.
      await expect(line).not.toContainText(copy.stalenessLeftOverNote)
      await assertStandingLinePlaced(page, line, vp.use.viewport.width === PHONE.width, false)
    })
  })

  // ── build 2's left-over question in the panel and on the Result (U7, U14, U9) ───────────────────
  // The seat is its own row below the W row (KTD8), drawn with the W row from ONE gesture hold
  // (`WorkingYearRows`, `gestureHold.ts`'s two-element arm). The figures are hand-derived in the unlock block
  // above: `date`'s $16,985; `datesavedmoved`'s $27,537 after its raise.
  test.describe(`build 2’s left-over seat and its moved line (${vp.name})`, () => {
    test.use(vp.use)

    test('?seed=datesaved: the panel seat below the W row — three replies, "All of it" checked at its figure, nothing sideways', async ({ page }) => {
      await gotoSeedFinal(page, 'datesaved')
      await assertResolvedDate(page)
      await page.locator('[data-door="assumptions"]').click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
      const seat = page.locator(LEFT_OVER_SEAT)
      await expect(seat).toHaveCount(1)
      // Its OWN row, after the W row's, never a control inside it (KTD8) — and the W row holds no reply.
      const order = await page.evaluate((sel) => {
        const w = document.querySelector('[role="dialog"] [data-assumption-seat="working-year-cost"]')
        const s = document.querySelector(sel)
        return w !== null && s !== null && !w.contains(s) && (w.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      }, LEFT_OVER_SEAT)
      expect(order, 'the seat is its own row after the W row').toBe(true)
      await expect(row.getByRole('radio', { name: copy.workingLedgerLeftOverSaved, exact: true })).toHaveCount(0)
      await seat.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await settleLayout(page)
      await assertLeftOverSeatFace(page, 'datesaved’s seat', {
        checked: copy.workingLedgerLeftOverSaved,
        figure: slots.workingLedgerLeftOverFigure('16,985'),
        line: slots.workingLedgerLeftOverSavedLine('16,985'),
      })
      // The W row above draws the same household's picture, every figure whole (the shared memo's draft).
      const panelFigures = await clippedFigures(page, '[role="dialog"]')
      expect(panelFigures.counted, 'the panel picture read too few figures — "none clipped" would pass on nothing').toBeGreaterThanOrEqual(
        DATE_PICTURE_FIGURES,
      )
      expect(panelFigures.offenders, 'a panel money-picture figure is clipped').toEqual([])
    })

    test('?seed=datesavedmoved: the moved line takes the standing slot, W’s line absent; its door lands on the seat’s name', async ({ page }) => {
      await gotoSeedFinal(page, 'datesavedmoved')
      await assertResolvedDate(page)
      const line = page.locator('.fod-reveal .reveal__lead > p.fod-note.cs-paycheck-note')
      await expect(line, 'the moved line renders in the lead').toHaveCount(1)
      await expect(line).toContainText(`${copy.stalenessLeftOverNote} ${LEFT_OVER_MOVED_SENTENCE}`)
      // ONE CAUSE, ONE LINE (U14): W is fresh here, so W's lead is nowhere on the page — a negative aimed at
      // the slot's other live cause (insight 086).
      await expect(line).not.toContainText(copy.stalenessPayCheckNote)
      await expect(page.getByText(copy.stalenessPayCheckNote)).toHaveCount(0)
      await assertStandingLinePlaced(page, line, vp.use.viewport.width === PHONE.width)
      // The door: the panel opens AT the left-over seat — its name focused and inside the dialog — showing the
      // moved line below the group, "All of it" still checked.
      await line.getByRole('button', { name: copy.stalenessLeftOverCta }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      // A condition wait, never a fixed sleep: focus lands (the sheet's h2 first, then the seat's name, in one
      // commit's effects), the sheet's entrance finishes (the box reads below are of the settled sheet), and
      // focus is STILL on the name once it has — a later steal would red here.
      const focusedText = () => page.evaluate(() => document.activeElement?.textContent ?? '')
      await expect.poll(focusedText, { message: 'the door lands on the seat’s name' }).toBe(copy.assumptionWorkingCostLeftOverName)
      await page.waitForFunction(() =>
        document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== 'running'),
      )
      expect(await focusedText(), 'focus stays on the seat’s name once the sheet settles').toBe(copy.assumptionWorkingCostLeftOverName)
      const seat = page.locator(LEFT_OVER_SEAT)
      const dialogBox = await dialog.boundingBox()
      const nameBox = await seat.locator('.ap-row__name').boundingBox()
      expect(dialogBox !== null && nameBox !== null).toBe(true)
      expect(nameBox!.y, 'the seat’s name is scrolled into the dialog').toBeGreaterThanOrEqual(dialogBox!.y - 0.5)
      expect(nameBox!.y + nameBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 0.5)
      await seat.evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await settleLayout(page)
      await assertLeftOverSeatFace(page, 'datesavedmoved’s seat', {
        checked: copy.workingLedgerLeftOverSaved,
        figure: slots.workingLedgerLeftOverFigure('27,537'),
        line: slots.workingLedgerLeftOverRoseLine('16,985', '27,537'),
      })
    })

    // THE COORDINATE TAP — the only real-browser gate for the label-forwarded click (insight 149;
    // `gestureHold.ts`'s header). The press on "All of it" blurs a typed W figure, and that commit changes the
    // live year-0 Left over while the held seat still shows the old one. A label's own click reaches the
    // window's bubble listener before the label forwards a second click to its radio, so a release in that
    // listener would re-render first and the forwarded click would act from the LIVE render — store a figure
    // the household never saw. jsdom cannot show it (its synchronous dispatch runs the forwarded click inside
    // the same act). So: `date` unanswered, W confirmed at $84,000 (the seat shows $16,985); "a different
    // figure", then 6,000 a month typed (under the period rule's 8,000 floor, so no unit prompt), which is
    // $72,000 a year and a live Left over of $28,985 (W comes off the bottom line dollar for dollar, and
    // nothing else in year 0 reads W: $16,985 + $12,000); then, focus still in the figure, a REAL tap on "All
    // of it" at its centre (a press, 80 ms, the release — or a touch tap), never `.click()` / `check()`. The
    // stored figure must be the one on screen at the press, $16,985: the seat then reads "moved" from $16,985
    // to $28,985. Stored from the live render, it would read the plain saved line at $28,985; a lost tap
    // leaves nothing checked and the absent line.
    test('?seed=date: "All of it" tapped by coordinate right after typing W stores the figure on screen at the press', async ({ page }) => {
      await gotoSeedFinal(page, 'date')
      await page.locator('[data-door="assumptions"]').click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
      const seat = page.locator(LEFT_OVER_SEAT)
      const saved = seat.getByRole('radio', { name: copy.workingLedgerLeftOverSaved, exact: true })
      await expect(seat.getByRole('radio')).toHaveCount(3)
      await expect(saved, '`date` is unanswered').not.toBeChecked()
      await expect(seat.locator('.left-over__line')).toHaveText(slots.workingLedgerLeftOverAbsentLine('16,985'))
      // "A different figure": the panel never clears a confirmed W (KTD4), so nothing moves yet.
      await row.getByRole('radio', { name: copy.workingCostDifferent }).evaluate((el) => (el as HTMLInputElement).click())
      const input = row.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true })
      await expect(input).toBeVisible()
      await expect(row.getByRole('radio', { name: copy.periodMonth }), 'the untapped unit is a month (KTD17)').toBeChecked()
      await input.scrollIntoViewIfNeeded()
      await input.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('6000')
      const label = seat.locator('label.segment').filter({ hasText: copy.workingLedgerLeftOverSaved })
      await expect(label).toHaveCount(1)
      await label.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus — the press is what blurs it').toBeFocused()
      // What the seat SHOWS at the press, read off the screen — and it is `date`'s own $16,985 (the typed
      // digits have not committed: the figure commits on blur).
      const shownAtPress = await seat.locator('.left-over__figure').textContent()
      expect(shownAtPress, 'the seat shows the old figure until the press').toBe(slots.workingLedgerLeftOverFigure('16,985'))
      const box = await label.boundingBox()
      expect(box).not.toBeNull()
      const x = box!.x + box!.width / 2
      const y = box!.y + box!.height / 2
      // The hit-test at the point the tap will use (insight 119: what the input path hits).
      const onLabel = await label.evaluate((el, [px, py]) => {
        const hit = document.elementFromPoint(px, py)
        return hit !== null && el.contains(hit)
      }, [x, y] as const)
      expect(onLabel, `the tap point is not on "${copy.workingLedgerLeftOverSaved}"`).toBe(true)
      if (vp.use.viewport.width === PHONE.width) {
        await page.touchscreen.tap(x, y)
      } else {
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.waitForTimeout(80) // a human press lasts tens of milliseconds
        await page.mouse.up()
      }
      await expect(saved, 'the tap on "All of it" was lost').toBeChecked()
      // The press's blur committed the typed figure, and the hold let go: the W row and the seat's figure now
      // draw the live draft. The typed $72,000 sits below `date`'s $84,000 of spending, so the figure names it
      // (U11 walk 7's R2).
      await expect(row.locator('.ap-row__value')).toHaveText(slots.assumptionWorkingCostEntered('72,000'))
      await expect(seat.locator('.left-over__figure')).toHaveText(slots.workingLedgerLeftOverFigureAt('72,000', '28,985'))
      // THE GATE: what was STORED is the figure on screen at the press. The moved line names the stored figure
      // as the one chosen against — never the plain saved line at the live figure — and the typed figure the live one
      // rests on (R2).
      await expect(seat.locator('.left-over__line'), 'the stored figure is not the one on screen at the press').toHaveText(
        slots.workingLedgerLeftOverRoseLineAt('72,000', '16,985', '28,985'),
      )
      // …and below it, the typed-below line's runs (the whole-window rebuild, KTD6 host 3): ONE `same` run, a plain
      // paragraph in the sheet. The sheet has no counts sentence (the W row above carries its "can look better" half), so
      // its paragraph opens on the bare lean naming the quote's dollars (the walk-9 form council's call (2): "A working
      // year almost always costs at least your spending of $84,000 a year."). The stored $16,985 caps both this answer and
      // the answer at the $84,000 spending in every working year, so they add the same (KTD3), the figure stated (W8-R5
      // (a)). Year 0 at the spending leaves the stored $16,985 itself, so no cap sentence is drawn, and the run's first
      // sentence says "the answer at your spending" with no dollars and no floor aside (the lean said both). The only
      // real-browser witness of the seat's line. `date`'s couple opens the survivor gate (the runs' docblock), so the one
      // run opens "Each working year you’re both alive," and the survivor part's two sentences close the same paragraph:
      // by hand, the default 0.75 survivor ratio of each W, $72,000 × 0.75 = $54,000 at the typed figure and $84,000 × 0.75
      // = $63,000 at the spending, so at most $9,000 a year less. Typed by hand from the probe (`date6000Month`; the sheet
      // names "this answer": the walk-8 form council's KD9).
      const sameRun = (noun: TypedBelowNoun): string =>
        [
          'Each working year you’re both alive, the answer at your spending would add at most $16,985 a year.',
          `${noun} answer adds at most $16,985 a year to your savings.`,
          `At your spending, that’s the same in your savings${TB_RIDER}${TB_GLOSS}.`,
          'In a working year with only one of you alive, that year’s costs count as $54,000 at your figure of $72,000 a year and $63,000 at your spending of $84,000 a year.',
          `At your spending, that’s at most $9,000 a year less in your savings${TB_RIDER}.`,
        ].join(' ')
      await expect(seat.locator('p.left-over__at-quote')).toHaveText(
        `A working year almost always costs at least your spending of $84,000 a year. ${sameRun('This')}`,
      )
      // A second reader of the stored answer, off the panel: the Result's standing slot names the same two. The typed
      // $72,000 sits below `date`'s $84,000 of spending, so R1's typed-below line holds the slot (U11 walk 6,
      // `3000a04c`) and carries the moved figures as its clause right after its counts sentence (`TypedBelowHost`: no
      // rules line hosts the clause here), naming the typed $72,000 its $28,985 rests on (the walk-6 round review's pair),
      // then the lean in its own sentence naming the $84,000 (the walk-9 form council's call (2)), then the one `same` run
      // and the survivor part. Stored from the live render, the clause would be absent and the run would read $28,985
      // against the quote answer's $16,985; a lost tap would leave the counts sentence alone.
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      const standing = page.locator('.fod-reveal .reveal__lead > p.fod-note.cs-paycheck-note')
      await expect(standing).toContainText(
        [
          'This answer counts a working year at your own figure of $72,000 a year, below your spending of $84,000 a year.',
          'You said all the money left over in a working year goes into your savings, when your first working year had $16,985 left over.',
          'At your figure of $72,000 a year, it has $28,985 left over now.',
          'So each working year adds at most $16,985 of its left over to your savings, the smaller of the two.',
          'A working year almost always costs at least your spending of $84,000 a year, so this answer can look better than it really is.',
          sameRun('This'),
        ].join(' '),
        { timeout: FINAL_TIER_MS },
      )
      // ONE CAUSE, ONE LINE: the moved line's own lead never shares the slot this line holds.
      await expect(standing).not.toContainText(copy.stalenessLeftOverNote)
    })
  })
}

// ── the W period tap under its own blur-commit, on a screen taller than his (the h2 cure) ────────
// The register's Tier 0 "On a screen taller than his laptop's, a tap on "Each month" right after typing
// the working-year figure can miss…", cured by `src/intake/gestureHold.ts`. The figure commits on blur,
// and the press on "Each month" is what blurs it; the commit un-stales W, so the content above the
// control changes between the press and the release (the walk's stale note unmounts; the panel's money
// picture mounts above the question). Chromium's scroll anchoring moved the scroller back on every
// screen of his then (the Dell's 1536×791 and 1536×960 full screen, a 448×891 phone: 19 of 19 coordinate
// taps landed, b9-10's `tapProbe2.mts`; his Lenovo's 1440×731 window and 1440×900 screen, 2026-11-19, are
// shorter than both miss geometries and were not re-probed), so these arms run where it cannot: a 1536×1300 window (mouse) and a 1024×1366 touch
// screen, which missed 4 of 4 before the hold — a monthly 7,000 left as $7,000 a YEAR, unasked.
// A REAL coordinate tap (a press, 80 ms, the release — or a touch tap), never `.click()` / `check()`: those
// re-resolve the target between the halves, which is the race itself. Each arm's non-vacuity floor is the
// geometry the hold must survive, read before the tap — content ABOVE the change on screen, so the node
// scroll anchoring picks sits above it and the control below it moves: the walk's whole stale note on
// screen with the page above it; the panel's row value line (the picture mounts right under it) on
// screen. The panel arms run 100 px taller than the probe's screens: there the question's whole face
// sits between the value line and the control, and at 1300 / 1366 px the probe had 28 px of slack —
// one more wrapped help line on another rasterizer (insight 118) would leave no reachable geometry.
const TALL_MOUSE = { deviceScaleFactor: 1.5 } as const
const TALL_TOUCH = { deviceScaleFactor: 2, isMobile: true, hasTouch: true } as const
const TALL_TAP_ARMS = [
  { host: 'walk', name: '1536×1300 window, mouse', touch: false, use: { viewport: { width: 1536, height: 1300 }, ...TALL_MOUSE } },
  { host: 'walk', name: '1024×1366 touch screen', touch: true, use: { viewport: { width: 1024, height: 1366 }, ...TALL_TOUCH } },
  { host: 'panel', name: '1536×1400 window, mouse', touch: false, use: { viewport: { width: 1536, height: 1400 }, ...TALL_MOUSE } },
  { host: 'panel', name: '1024×1466 touch screen', touch: true, use: { viewport: { width: 1024, height: 1466 }, ...TALL_TOUCH } },
] as const

/** `datecoststale` with its W kept through the Keep door as an entered $84,000 a year in the panel, then
 *  staled on the reading by a move to PA — the probe's set-up, through the panel the result's standing
 *  line opens. Since build 2's U5 (`d4227774`) the Keep stamps the figure with the quote its note showed
 *  ($78,000), so the note reads "You kept", never "You entered" (KTD10), and a kept figure above today's
 *  quote stales on the state alone, exactly as the typed figure this set-up first held. */
async function staleEnteredWInPanel(page: Page) {
  await gotoSeedFinal(page, 'datecoststale')
  await page.getByRole('button', { name: copy.stalenessPayCheckCta }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const row = dialog.locator('[data-assumption-seat="working-year-cost"]')
  await row.getByRole('button', { name: slots.workingCostKeepYearly('84,000') }).click()
  await expect(row.getByRole('note'), 'the kept figure is fresh').toHaveCount(0)
  await dialog
    .locator('[data-assumption-seat="retirement-state"]')
    .getByRole('radio', { name: /Pennsylvania/ })
    .first()
    .evaluate((el) => (el as HTMLInputElement).click())
  await expect(row.getByRole('note'), 'the move to PA stales the kept figure').toContainText(
    slots.workingCostStaleStateKept('84,000'),
  )
  return { dialog, row }
}

for (const { host, ...vp } of TALL_TAP_ARMS) {
  test.describe(`the W period tap right after typing (${host}, ${vp.name})`, () => {
    test.use(vp.use)

    test('"Each month" tapped by coordinate lands: the note above it stands until the click, and 7,000 is a month', async ({ page }) => {
      const { dialog } = await staleEnteredWInPanel(page)
      if (host === 'walk') {
        await dialog.getByRole('button', { name: copy.assumptionRewalkCta }).click()
        await advanceIntakeTo(page, copy.qWorkingCostHeading, `${host} ${vp.name}`)
      }
      const face = host === 'walk' ? page.locator('.intake-shell .working-cost') : dialog.locator('[data-assumption-seat="working-year-cost"] .working-cost')
      await expect(face.getByRole('note')).toContainText(slots.workingCostStaleStateKept('84,000'))
      const month = face.getByRole('radio', { name: copy.periodMonth })
      await expect(month, 'the held figure’s own unit, a year, is the one checked').not.toBeChecked()
      const input = face.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true })
      await input.scrollIntoViewIfNeeded()
      await input.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('7000')
      // The low geometry (the probe's): scroll, keeping the figure's focus, until the label's bottom sits
      // `margin` px above the scroller's visible bottom — the most content above it on screen — at the
      // smallest margin whose centre point still hits the label. Then read the floor.
      const label = face.locator('label.segment').filter({ hasText: copy.periodMonth })
      let geometry: {
        readonly hitsLabel: boolean
        readonly scrollTop: number
        readonly docScroll: boolean
        readonly noteHeight: number
        readonly noteTopPx: number | null
        readonly noteBottomGapPx: number | null
        readonly rowValueVisiblePx: number | null
      } | null = null
      for (const margin of [16, 72, 128, 184, 240]) {
        geometry = await label.evaluate((el, m) => {
          let sc: Element | null = el.parentElement
          while (sc !== null && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement
          const scroller = sc ?? document.scrollingElement!
          const visTop = sc === null ? 0 : sc.getBoundingClientRect().top
          const visBottom = sc === null ? window.innerHeight : sc.getBoundingClientRect().bottom
          scroller.scrollTop += el.getBoundingClientRect().bottom - (visBottom - m)
          const r = el.getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          const note = el.closest('.working-cost')?.querySelector('[role="note"]') ?? null
          const rowValue = el.closest('[data-assumption-seat]')?.querySelector('.ap-row__value') ?? null
          const rv = rowValue === null ? null : rowValue.getBoundingClientRect()
          const nr = note === null ? null : note.getBoundingClientRect()
          return {
            hitsLabel: hit !== null && el.contains(hit),
            scrollTop: Math.round(scroller.scrollTop),
            docScroll: sc === null,
            noteHeight: nr === null ? 0 : Math.round(nr.height),
            // The note's top below the visible top (content above it on screen), and its bottom above
            // the visible bottom — negative on either when it is cut off.
            noteTopPx: nr === null ? null : Math.round(nr.top - visTop),
            noteBottomGapPx: nr === null ? null : Math.round(visBottom - nr.bottom),
            rowValueVisiblePx: rv === null ? null : Math.round(Math.min(rv.bottom, visBottom) - Math.max(rv.top, visTop)),
          }
        }, margin)
        if (geometry.hitsLabel) break
      }
      expect(geometry?.hitsLabel, `${host}: no margin puts the tap point on "${copy.periodMonth}" (${JSON.stringify(geometry)})`).toBe(true)
      // THE FLOOR — the geometry scroll anchoring cannot cure, or the arm proves nothing about the hold.
      if (host === 'walk') {
        expect(geometry!.docScroll, 'the walk scrolls the document').toBe(true)
        expect(geometry!.noteHeight, 'the stale note renders above the figure').toBeGreaterThan(0)
        // The whole note on screen with the page above it: the anchor is picked above the note, so its
        // unmount moves everything under it (b9-10's misses: the label moved the full note height at a
        // scroll of 33 px and 0). A note cut off at the top would hand anchoring a node below the change.
        expect(geometry!.noteTopPx ?? -1, `walk: the note’s top is cut off (${JSON.stringify(geometry)})`).toBeGreaterThan(0)
        expect(geometry!.noteBottomGapPx ?? -1, `walk: the note’s bottom is off screen (${JSON.stringify(geometry)})`).toBeGreaterThan(0)
      } else {
        expect(geometry!.rowValueVisiblePx ?? 0, `panel: the W row’s value line is off screen (${JSON.stringify(geometry)}) — anchoring would hold the question`).toBeGreaterThan(0)
      }
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus — the press is what blurs it').toBeFocused()
      const box = await label.boundingBox()
      expect(box).not.toBeNull()
      const x = box!.x + box!.width / 2
      const y = box!.y + box!.height / 2
      // The hit-test again, at the point the tap will use (insight 119: what the input path hits).
      const onLabel = await label.evaluate((el, [px, py]) => {
        const hit = document.elementFromPoint(px, py)
        return hit !== null && el.contains(hit)
      }, [x, y] as const)
      expect(onLabel, `${host}: the tap point is not on "${copy.periodMonth}"`).toBe(true)
      if (vp.touch) {
        await page.touchscreen.tap(x, y)
      } else {
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.waitForTimeout(80) // a human press lasts tens of milliseconds
        await page.mouse.up()
      }
      console.log(`[h2 tap] ${host} ${vp.name}: ${JSON.stringify(geometry)}`)
      await expect(month, `${host}: the tap on "${copy.periodMonth}" was lost`).toBeChecked()
      await expect(face.getByRole('note'), 'the commit landed and the hold let go').toHaveCount(0)
      await expect(input).toHaveValue('7,000')
      if (host === 'panel') {
        await expect(dialog.locator('[data-assumption-seat="working-year-cost"] .ap-row__value')).toHaveText(
          slots.assumptionWorkingCostEntered('84,000'),
        )
      }
    })
  })
}

// The same gesture on the note's OWN door, on his own two kinds of screen: type a figure, then tap "Keep
// $84,000 a year". The press blurs the figure and its commit un-stales W, so before the hold the note —
// and the door with it — unmounted between the press and the release on EVERY screen (scroll anchoring
// cannot keep a control that is gone): 4 of 4 lost on his 1536×791 window and his 448×891 phone, walk
// and panel (b9-1, `b9-h2-cure\tapProbe3.mts`, `before-keep.jsonl`), leaving $7,000 a year, the note gone
// as a keep would leave it, and focus on the page. Held, the door stays under the release, and it keeps
// the figure it NAMES. These two arms are also the only REAL-BROWSER gate that the hold lets go AFTER the
// app's own click handlers (a capture-phase release detaches the held door before React dispatches its
// click, which jsdom's synchronous dispatch cannot show — the unit file pins the phase structurally), and
// K-panel is the panel row's hold's only gate at his own laptop's size (mutant-measured, b9-1). The mouse
// tall arms cannot red a release on pointerup (Chromium hit-tests a mouse release once, so pointerup,
// mouseup and click share a target); the touch arms and these two can, and do.
const KEEP_TAP_ARMS = [
  { host: 'panel', name: `${REAL.width}×${REAL.height}, mouse`, touch: false, use: { viewport: REAL, deviceScaleFactor: REAL_DPR } },
  {
    host: 'walk',
    name: `phone ${PHONE.width}×${PHONE.height}, touch`,
    touch: true,
    use: { viewport: PHONE, deviceScaleFactor: PHONE_DPR, isMobile: true, hasTouch: true },
  },
] as const

for (const arm of KEEP_TAP_ARMS) {
  test.describe(`the W note’s Keep door tapped right after typing (${arm.host}, ${arm.name})`, () => {
    test.use(arm.use)

    test('"Keep $84,000 a year" tapped by coordinate keeps $84,000 — the figure it names — and focus lands on the answer', async ({ page }) => {
      const { dialog } = await staleEnteredWInPanel(page)
      if (arm.host === 'walk') {
        await dialog.getByRole('button', { name: copy.assumptionRewalkCta }).click()
        await advanceIntakeTo(page, copy.qWorkingCostHeading, `keep ${arm.name}`)
      }
      const face =
        arm.host === 'walk' ? page.locator('.intake-shell .working-cost') : dialog.locator('[data-assumption-seat="working-year-cost"] .working-cost')
      const input = face.getByRole('textbox', { name: copy.workingCostAmountLabel, exact: true })
      await input.scrollIntoViewIfNeeded()
      await input.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('7000')
      const door = face.getByRole('button', { name: slots.workingCostKeepYearly('84,000') })
      await door.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await expect(input, 'the figure still has focus — the press is what blurs it').toBeFocused()
      const box = await door.boundingBox()
      expect(box).not.toBeNull()
      const x = box!.x + box!.width / 2
      const y = box!.y + box!.height / 2
      // The floor: the tap point is ON the door (insight 119: a centre point, never an edge).
      const onDoor = await door.evaluate((el, [px, py]) => {
        const hit = document.elementFromPoint(px, py)
        return hit !== null && el.contains(hit)
      }, [x, y] as const)
      expect(onDoor, 'the tap point does not hit the Keep door').toBe(true)
      if (arm.touch) {
        await page.touchscreen.tap(x, y)
      } else {
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.waitForTimeout(80)
        await page.mouse.up()
      }
      await expect(face.getByRole('note'), 'the keep landed and the hold let go').toHaveCount(0)
      await expect(input, `${arm.host}: the door kept the typed digits, not the figure it names`).toHaveValue('84,000')
      await expect(face.getByRole('radio', { name: copy.periodYear })).toBeChecked()
      const focused = await page.evaluate(() => {
        const a = document.activeElement
        return a instanceof HTMLInputElement && a.type === 'radio' && a.checked
      })
      expect(focused, 'focus never falls to the page: it lands on the answer that now stands').toBe(true)
      if (arm.host === 'panel') {
        // The door keeps the HELD answer, a kept figure, and a Keep carries its stamp (KTD10): typing
        // digits and then keeping must never launder it into a typed figure that no quote can stale.
        await expect(dialog.locator('[data-assumption-seat="working-year-cost"] .ap-row__value')).toHaveText(
          slots.assumptionWorkingCostKept('84,000'),
        )
      }
    })
  })
}
