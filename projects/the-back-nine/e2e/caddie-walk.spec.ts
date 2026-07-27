import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { REAL, REAL_DPR, PHONE, PHONE_DPR, gotoSeedFinal, settleLayout } from './reviewSurface'

/**
 * The Caddie's WALK (own harness: playwright.caddie.config.ts, `pnpm caddie:walk`) — captures
 * the cold-read bundle the reader panel consumes (.claude/skills/caddie/SKILL.md). NOT a gate:
 * the few assertions here are presence companions so a broken surface fails the walk RED
 * instead of bundling a blank page (the insight-029 vacuity discipline).
 *
 * Bundle law (from the verified research, 2026-07-09):
 *  - Words are captured VERBATIM from the DOM (`copy.txt`/`dialog.txt`) — a reader never OCRs
 *    the product's sentences off pixels.
 *  - The above-fold frame ships at CSS scale (1536px long edge — under the ~2576px model
 *    ingestion cap, so it is never silently downscaled); text-critical regions additionally
 *    ship as DEVICE-scale crops (small text survives).
 *  - Color-vision arms use Chrome's own emulation (CDP setEmulatedVisionDeficiency), the same
 *    transform DevTools applies — a screening flag for the readers, never a color verdict.
 *  - Capture order matters: fold/aria/copy first (no visual side effects), then the above-fold
 *    + CVD shots (same pinned scroll), then fullpage + element crops LAST (they may scroll).
 *
 * Increment 2 (2026-07-10, the tape's first two lessons):
 *  - RUN-STAMPED bundle dirs — temp/caddie/<run>/<target>/<viewport>/<state>/; a re-walk
 *    lands in a fresh dir instead of overwriting files under a mid-read reader panel.
 *  - The DOOR WALK — every `.result-quiet-row` door is opened and captured (Briggsy's real
 *    U12 read free-walked the doors and found a real finding on a sheet the walk never
 *    captured — the withdrawal-order chart speaking years against the fan's ages).
 *  - VAULT targets — `vault:<key>` drives the U13 decrypt-on-return arc (unlock → the
 *    re-entry gate → affirm → the echoed verdict), the only live route to the staleness
 *    surfaces; `vault:stale` additionally walks the update route's first frame.
 *
 * Increment 3 (2026-07-10, the seed:date card's honest coverage refusal):
 *  - The LEVER-PREVIEW DRIVE — a door whose sheet carries a what-if lever (the policy/regime
 *    radios, the Roth plan fields) gets ONE preview driven and the TwoFutures chart captured
 *    as `door-N-<slug>-preview` (the rule-36 one-dialect check was un-verifiable while the
 *    sheets bundled only their pre-commit input state). PREVIEW-ONLY: nothing is Applied —
 *    the walk never mutates the scenario later states capture. A driven preview whose chart
 *    never arrives FAILS the walk red (insight-029 vacuity discipline).
 *  - The SR-ONLY channel annotation — `sr-only.txt` lists every visually-hidden text node,
 *    because `copy.txt` (innerText) INCLUDES clipped sr-only nodes: the "doubled wordmark"
 *    finding was the persistent sr-only h1 beside the visible wordmark, a channel artifact
 *    a reader should check against before flagging a rendered duplication.
 *  - `vault:datestale` (the aged SPLIT-date plant) rides the existing vault grammar — the
 *    floor's ARRIVED arm + the re-derived anchored hero; `seed:datesplit` covers the floor's
 *    fresh ANCHORED arm (card #4's blocked-unreachable ruling was half-wrong: the anchor is
 *    computed for every live household, so the fresh split renders the anchored floor line).
 *
 * Increment 4 (2026-07-12, the Medicare-extras pre-walk's coverage demands):
 *  - CVD CHART crops — the viewport-scoped cvd-*.png arms captured above-fold only, so the
 *    odds ladder and every sheet's TwoFutures chart never landed in a color-vision frame;
 *    each chart now ships a device-scale crop under each arm (`cvd-<arm>-<chart>.png`).
 *  - `intake:fork` — the guided-intake walk to the Medicare-extras payment fork (blank →
 *    R19-blocked → mixed-provenance) + the spend step en route; the fork is intake-only, so
 *    seed/vault targets structurally cannot reach it.
 *  - `vault:datestale` joins the DOOR walk — the aged date household's lever previews were
 *    an uncaptured landmine (stale-timeline inheritance unverified).
 *
 * Increment 5 (2026-07-16, the state-carrying seed increment's cold-read faces):
 *  - `vault:statestale` — the aged-STATE-profile plant (a fresh-vintage NC save whose OWN state
 *    profile drifted one rate-step back) joins the DOOR walk: the affirm lands the BORDERLINE
 *    NC-clause hero, and the Assumptions door opens the panel on the ANSWERED retirement-state
 *    seat (the priced/answered picker-row face). It also rides the UPDATE-route arm — the
 *    stateTaxMoved household's "update them" exit is the same walk-through as `vault:stale`.
 *  - The CVD SELECTED-PICKER face — `intake:fork` picks NC, then captures the answered state
 *    picker as a device-scale crop AND under each CVD arm (captureCvdRegion): the priced-state
 *    read law is that the active segment survives WITHOUT hue (weight+fill+ring, .segment-active).
 *  - `seed:nc|pa|fl|elsewhere|datenc` ride the existing `walkSeed` grammar (landing + door walk;
 *    the Assumptions-door capture IS each seed's priced/answered panel-row face).
 *
 * Increment 6 (2026-07-22, the recommend-second SOLVE arc's cold-read faces):
 *  - `solve:<seed>` — the U16 recommend-second walk: the settled landing → the invited affordance
 *    (`.result-recommend-invite`) → the GoalPicker (goal chosen by its rendered LABEL, never an index —
 *    SOLVE_GOAL below) → the PENDING breathe (captured immediately; the working tell is the only thing
 *    changing on screen) → the COMMITTED frame, at FULL worker precision (16k paths, multi-minute — the
 *    committed body is POLLED, never slept on; `test.setTimeout(720_000)` for solve targets). Two shipped
 *    worlds: `solve:nc` commits the state-certification HOLD card (~90s), `solve:surplus` the over-funded
 *    RECOMMENDED lockup (~4-7min: delta hero + the RecommendationViz two-arm chart, its own `svg.rv`).
 *  - The STALE demotion (`solve:nc` only): a fingerprint-changing control-door edit (the withdrawal-order
 *    sheet, applied off the committed `proportional`) demotes the committed rec → the stale CARD — a calm
 *    heading + body + its IN-CARD re-open control, in one frame (`stale`, F-B: the promise and its action
 *    in ONE home; the door-row invite is retired for this channel). The base's drawdownPolicy rides the
 *    solve fingerprint, so the demotion is structural even where the order is inert on a single pool.
 *  - The STEER face (`blocked{no-pretax}` — the steer-seed increment, 2026-07-23, superseding the old
 *    "no seed" note): `solve:steer` walks it — the no-pretax household (`?seed=steer`, Roth + brokerage
 *    only) lands its verdict, the invite fires, the GoalPicker confirm REFUSES at the builder with the
 *    typed reason, and the calm named-reason note is the terminal frame (no pending — nothing dispatches;
 *    the invite retires with the note). The `spine-unready` sibling stays unit-pinned only
 *    (RecommendationSurface.test) — its live face needs a facts-broken re-dispatch, not a seed.
 *
 * Targets: `CADDIE_TARGETS="vault:retired,vault:stale,seed:date,intake:fork"` (comma list).
 * Back-compat: `CADDIE_SEED=budget` still works (one seed target). Default: `seed:retired`.
 */

interface Target {
  readonly kind: 'seed' | 'vault' | 'intake' | 'solve'
  readonly key: string
}

function parseTargets(): Target[] {
  const raw =
    process.env.CADDIE_TARGETS ??
    (process.env.CADDIE_SEED !== undefined ? `seed:${process.env.CADDIE_SEED}` : 'seed:retired')
  return raw.split(',').map((entry) => {
    const [kind, key] = entry.trim().split(':')
    if (
      (kind !== 'seed' && kind !== 'vault' && kind !== 'intake' && kind !== 'solve') ||
      key === undefined ||
      key === ''
    ) {
      throw new Error(
        `bad CADDIE_TARGETS entry "${entry}" — expected seed:<key>, vault:<key>, intake:<key>, or solve:<key>`,
      )
    }
    return { kind, key }
  })
}

const TARGETS = parseTargets()
// The run stamp is minted once in playwright.caddie.config.ts (the runner process; workers
// inherit it) — 'adhoc' only if the spec somehow runs outside its own harness.
const OUT_ROOT =
  process.env.CADDIE_OUT ?? path.join('temp', 'caddie', process.env.CADDIE_RUN ?? 'adhoc')

/** Text-critical / meaning-critical regions cropped at device scale when present. */
const CROP_TARGETS = [
  { name: 'band', selector: '.cs-band' },
  { name: 'disclaimer', selector: 'footer.disclaimer.disclaimer--in-frame' },
  { name: 'echo', selector: '.ap-echo' },
  { name: 'panel', selector: '[role="dialog"]' },
  // U13 (increment 2): the staleness surfaces + the frames the batch asks his eye on.
  { name: 'staleness-note', selector: '.cs-staleness-note' },
  { name: 'reentry-notes', selector: '.reentry-notes' },
  { name: 'backup-door', selector: '.result-backup-door' },
  { name: 'hero-lead', selector: '.reveal__lead' },
  // U16 (increment 6): the recommend-second COMMITTED text regions — the grade lockup (a RECOMMENDED
  // beat), the HELD card, and the calm note (stale / buckets). Each renders on the committed frame ONLY,
  // so it is absent (guarded) on landing / goalpicker / pending — no vacuous crop.
  { name: 'rec-grade', selector: '.rec-grade' },
  { name: 'rec-held', selector: '.rec-held' },
  { name: 'rec-note', selector: '.rec-note' },
] as const

/** The Chrome-native color-vision arms (CDP emulation — the same transform DevTools applies). */
const CVD_ARMS = [
  ['deuteranopia', 'deuteranopia'],
  ['protanopia', 'protanopia'],
  ['grayscale', 'achromatopsia'],
] as const

/**
 * Meaning-critical CHART regions, additionally cropped under EACH CVD arm (increment 4): the
 * viewport-scoped cvd-*.png captures above-fold only, so the odds ladder (below the fold on
 * the date route) and the lever sheets' TwoFutures charts never landed in a color-vision
 * frame at all — the CVD screener was structurally blind to exactly the surfaces where color
 * carries the most meaning. Element crops may SCROLL to their target, so these run in the
 * LAST capture stage, never before the pinned-scroll frames.
 */
const CVD_CHART_TARGETS = [
  { name: 'band', selector: 'svg.band-svg' },
  { name: 'ladder', selector: 'svg.ladder-svg' },
  { name: 'twofutures', selector: 'svg.tf' },
  // U16 (increment 6): the RecommendationViz two-arm delta chart carries the with/without arms in color,
  // so the CVD screener must see it. It is its OWN svg class (`svg.rv`), NOT `svg.tf`. The collapsed
  // runner-up viz is a second in-DOM `svg.rv` skipped by the loop's visibility guard, so the visible
  // primary lands as `cvd-<arm>-recviz` (or `-recviz-1` when the runner-up chart is also mounted).
  { name: 'recviz', selector: 'svg.rv' },
] as const

/** Regions whose boxes land in fold.json so readers know what sits above/below the fold. */
const FOLD_TARGETS = [
  'main.result',
  '.confidence-reveal',
  '.cs-band',
  'footer.disclaimer.disclaimer--in-frame',
  '.result-quiet-row',
  '.ap-echo',
  '[role="dialog"]',
  // U13 (increment 2): the gate's decision pair + the vault-return frame's stacking question
  // (the filed a37b5f06 backup-door-above-disclaimer ruling — RESOLVED 2026-07-10 by the
  // Medicare-pricing unit: the door is now DOM-ordered BELOW the disclaimer; these boxes keep the
  // before/after on the record).
  '.cs-staleness-note',
  '.reentry-notes',
  '.save-actions',
  '.result-backup-door',
  '.result-save-slot',
  // U16 (increment 6): where the recommend-second beat sits in the frame — the invited door, the working
  // breathe, and the committed lockup / note (the second magic moment's fold positions for the readers).
  '.result-recommend-invite',
  '.recommendation-surface',
  '.solve-pending',
  '.rec-committed',
  '.rec-held',
  '.rec-note',
] as const

async function captureState(page: Page, dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  await settleLayout(page)

  // 1) The non-visual channels first (no scroll side effects).
  const fold = await page.evaluate((targets) => {
    const region = (sel: string) => {
      const el = document.querySelector(sel)
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
    }
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      scrollHeight: document.documentElement.scrollHeight,
      regions: Object.fromEntries(targets.map((t) => [t, region(t)])),
    }
  }, FOLD_TARGETS as unknown as string[])
  fs.writeFileSync(path.join(dir, 'fold.json'), JSON.stringify(fold, null, 2))

  fs.writeFileSync(path.join(dir, 'aria.yaml'), await page.locator('body').ariaSnapshot())
  fs.writeFileSync(path.join(dir, 'copy.txt'), await page.evaluate(() => document.body.innerText))
  // The SR-ONLY channel annotation (increment 3): innerText does NOT exclude clipped nodes,
  // so copy.txt contains every .sr-only string mixed into the visible flow — the "doubled
  // wordmark" false-flag was exactly this. Readers diff apparent duplications against this
  // list before flagging them as rendered.
  const srOnly = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.sr-only'))
      .map((el) => (el as HTMLElement).innerText.trim())
      .filter((t) => t.length > 0),
  )
  fs.writeFileSync(
    path.join(dir, 'sr-only.txt'),
    [
      '# Screen-reader-only text on this state (these strings ALSO appear inside copy.txt —',
      '# innerText includes clipped .sr-only nodes). Text that looks doubled in copy.txt but',
      '# appears here is a CHANNEL artifact, not a rendered duplication.',
      '',
      ...srOnly,
    ].join('\n'),
  )
  const dialog = page.locator('[role="dialog"]')
  if (await dialog.count()) {
    fs.writeFileSync(path.join(dir, 'dialog.txt'), await dialog.first().innerText())
  }

  // 2) The above-fold frame + its color-vision arms, all at the SAME pinned scroll origin.
  await page.screenshot({ path: path.join(dir, 'viewport.png'), scale: 'css' })
  const cdp = await page.context().newCDPSession(page)
  for (const [name, type] of CVD_ARMS) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
    await page.screenshot({ path: path.join(dir, `cvd-${name}.png`), scale: 'css' })
  }
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })

  // 3) Full page, then element crops LAST — locator screenshots may scroll to their target.
  await page.screenshot({ path: path.join(dir, 'fullpage.png'), fullPage: true, scale: 'css' })
  for (const { name, selector } of CROP_TARGETS) {
    const target = page.locator(selector).first()
    // A crop needs a real BOX, not just visibility: display:contents groups (e.g.
    // `.reveal__lead` in single column / phone) have visible children but generate no box —
    // isVisible() passes while locator.screenshot rejects ("not visible or not an
    // HTMLElement"). The box check subsumes "present when it matters": the same element
    // crops fine at two-pane, where it becomes a real grid item.
    if (
      (await target.count()) > 0 &&
      (await target.isVisible()) &&
      (await target.boundingBox()) !== null
    ) {
      await target.screenshot({ path: path.join(dir, `crop-${name}.png`), scale: 'device' })
    }
  }

  // 4) The CVD CHART crops (increment 4) — every chart on the state, under each arm, at
  // device scale. Runs after the pinned-scroll frames by the same scroll-side-effect law as
  // stage 3; absence is fine (an intake step has no chart), presence captures every match
  // (a sheet's TwoFutures beside the landing's band).
  for (const [armName, type] of CVD_ARMS) {
    let emulating = false
    for (const { name, selector } of CVD_CHART_TARGETS) {
      const charts = page.locator(selector)
      const count = await charts.count()
      for (let i = 0; i < count; i++) {
        const chart = charts.nth(i)
        if (!(await chart.isVisible()) || (await chart.boundingBox()) === null) continue
        if (!emulating) {
          await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
          emulating = true
        }
        const suffix = count > 1 ? `-${i + 1}` : ''
        await chart.screenshot({
          path: path.join(dir, `cvd-${armName}-${name}${suffix}.png`),
          scale: 'device',
        })
      }
    }
    if (emulating) await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
  }
  await cdp.detach()
  await page.evaluate(() => window.scrollTo(0, 0))
}

/**
 * Capture ONE static, meaning-critical region as a device-scale crop PLUS a device-scale crop
 * under each CVD arm (increment 5 — the state-tax picker's SELECTED-segment face). captureState's
 * stage-4 CVD crops are CHART-shaped (svg selectors) and re-run on every state; the state picker
 * is a static fieldset that lives only on the intake state step, so it gets its own parallel path
 * here rather than bloating the per-state chart loop with a selector that matches nowhere else.
 * The read law this proves: the ACTIVE segment must be distinguishable in every arm WITHOUT hue
 * (weight + fill + inset ring — intake.css .segment-active); the CVD screener reads exactly these
 * crops. A region that never renders FAILS the walk red (insight-029 vacuity discipline).
 */
async function captureCvdRegion(
  page: Page,
  dir: string,
  selector: string,
  baseName: string,
): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  const region = page.locator(selector).first()
  await expect(
    region,
    `captureCvdRegion "${baseName}" (${selector}) never became visible — a vacuous CVD crop`,
  ).toBeVisible()
  expect(
    await region.boundingBox(),
    `captureCvdRegion "${baseName}" (${selector}) has no box`,
  ).not.toBeNull()
  await region.screenshot({ path: path.join(dir, `crop-${baseName}.png`), scale: 'device' })
  const cdp = await page.context().newCDPSession(page)
  for (const [armName, type] of CVD_ARMS) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
    await region.screenshot({
      path: path.join(dir, `cvd-${armName}-${baseName}.png`),
      scale: 'device',
    })
  }
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
  await cdp.detach()
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

/**
 * Type a value into one of the family's masked/integer fields the way a REAL user does:
 * select-all + typed digits + blur, value asserted back (the fill() concatenation trap the
 * first live read's False-PASS Hunter caught — a mis-commit fails RED here instead of
 * bundling the wrong scenario).
 */
async function typeFieldValue(
  field: ReturnType<Page['locator']>,
  digits: string,
  expected: string,
): Promise<void> {
  await field.click()
  await field.press('ControlOrMeta+a')
  await field.pressSequentially(digits)
  await field.blur()
  await expect(field, 'the preview drive committed a different value than intended').toHaveValue(expected)
}

/**
 * The LEVER-PREVIEW DRIVE (increment 3): a sheet that carries a what-if lever gets ONE
 * preview driven so the TwoFutures chart states bundle — the rule-36 one-dialect check was
 * honestly un-verifiable while the doors captured only their pre-commit input state.
 * PREVIEW-ONLY by construction: radios/fields change local sheet state and the preview seam;
 * nothing is Applied, so the scenario every later state captures is untouched. Returns which
 * terminal state landed, so the caller can NAME the capture (the caller then captures the
 * `-preview` state). A driven lever that reaches NEITHER terminal state FAILS red — never a
 * silent no-chart bundle (insight 029).
 *
 * ⚑ THE `no-anchor` ARM (added 2026-07-27, U17 §S6's walk — and it is why `seed:datemixed` had
 * never been cold-read by ANY oracle). `ControlPreviewReadout` is a FIVE-arm union, and one of
 * those arms renders no chart AT ALL by design: a household with no crowned work-optional date
 * lands `no-anchor` and speaks `copy.leverPreviewNoDate` instead ("This comparison anchors to
 * your work-optional date, so it needs one on the board first"). `datemixed` is the only face in
 * the repo that reaches it — lifestyle `no-date-in-window` by construction — so demanding a chart
 * here failed the walk red at BOTH viewports, on correct product behaviour.
 *
 * That is a self-reinforcing blind spot worth naming: the face was never walked because the walk
 * crashed on it, and the crash went unnoticed because the face was never walked. The chartless
 * arm is not a degraded capture — it is a REAL cold-read surface (a door that opens and calmly
 * explains why it has nothing to show), so it gets its own capture name rather than being folded
 * into `-preview` where a reader would mistake it for a screenshot that failed.
 */
type PreviewDrive = 'chart' | 'no-anchor' | false

async function driveLeverPreview(
  page: Page,
  dialog: ReturnType<Page['getByRole']>,
  name: string,
): Promise<PreviewDrive> {
  /** The race every driven lever runs: the chart, or the structurally-chartless no-anchor line.
   *  Waiting on their `.or()` keeps the insight-029 teeth — reaching NEITHER still fails red —
   *  while refusing to call correct behaviour a failure. */
  const settleToTerminal = async (why: string): Promise<PreviewDrive> => {
    const chart = dialog.locator('svg.tf')
    const noAnchor = dialog.getByText(/This comparison anchors to your work-optional date/)
    await expect(chart.or(noAnchor), why).toBeVisible({ timeout: 120_000 })
    return (await chart.isVisible()) ? 'chart' : 'no-anchor'
  }

  // The policy/regime radio grammar (SequencingControl + HealthcareSheet): pick the first
  // NON-current option — picking the applied one deliberately withdraws the comparison.
  const uncheckedRadio = dialog.locator('.control-policies input[type="radio"]:not(:checked)')
  if ((await uncheckedRadio.count()) > 0) {
    await uncheckedRadio.first().check()
    return settleToTerminal(
      `door "${name}": the driven preview reached neither its TwoFutures chart nor the no-anchor line`,
    )
  }
  // The Roth plan grammar (RothLever): amount / start / years — a COMPLETE plan fires the
  // preview. Values are small-but-real (a $20k, 4-year plan starting next year). U17 §S1: the
  // start field speaks the CALENDAR YEAR now — a bare offset ('1' = year 1 AD) is a past start
  // the write side REFUSES aloud, so the drive types next wall year (valid on every vault, aged
  // or fresh, and never rots across a New Year).
  const nextYear = String(new Date().getFullYear() + 1)
  const plan = dialog.locator('.control-plan input')
  if ((await plan.count()) >= 3) {
    await typeFieldValue(plan.nth(0), '20000', '20,000')
    await typeFieldValue(plan.nth(1), nextYear, nextYear)
    await typeFieldValue(plan.nth(2), '4', '4')
    // Same race: the Roth lever shares `ControlPreviewReadout`, so it reaches `no-anchor` on the
    // same households the sequencing sheet does.
    return settleToTerminal(
      `door "${name}": the driven Roth preview reached neither its TwoFutures chart nor the no-anchor line`,
    )
  }
  return false // no lever on this sheet (the budget builder, the assumptions panel)
}

/**
 * The DOOR WALK (increment 2 — the tape's coverage lesson): open EVERY quiet-row door on the
 * settled verdict, capture the sheet, close, next. Briggsy's real read free-walks the doors;
 * a bundle that stops at the landing pre-digests only half his walk. Close buttons are the
 * family's own: 'Close' (lever sheets + the assumptions panel) or 'Cancel' (the budget sheet).
 * Increment 3: a lever sheet additionally bundles ONE driven preview (`-preview` state).
 */
async function walkDoors(page: Page, outDir: string): Promise<void> {
  const doors = page.locator('.result-quiet-row button')
  const count = await doors.count()
  expect(count, 'no quiet-row doors on a resolved verdict — a vacuous door walk').toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const door = doors.nth(i)
    const name = (await door.innerText()).trim()
    await door.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog, `door "${name}" opened no dialog`).toBeVisible()
    await captureState(page, path.join(outDir, `door-${i + 1}-${slugify(name)}`))
    const drive = await driveLeverPreview(page, dialog, name)
    if (drive !== false) {
      // The chartless `no-anchor` arm gets its OWN suffix: a `-preview` capture with no chart in
      // it reads to a card's reader as a screenshot that failed, when it is in fact the surface
      // under review — a door that opens and calmly explains why it has nothing to compare.
      const suffix = drive === 'chart' ? 'preview' : 'preview-no-anchor'
      await captureState(page, path.join(outDir, `door-${i + 1}-${slugify(name)}-${suffix}`))
    }
    await dialog.getByRole('button', { name: /^(Close|Cancel)$/ }).first().click()
    await expect(dialog).toBeHidden()
  }
}

/**
 * The U13 decrypt-on-return arc: `?vault=<key>` plants the vault + lands on the unlock screen
 * with the dev passphrase PRE-FILLED (App) → the re-entry gate (the read-back + every fired
 * staleness clock, BEFORE any verdict — the reveal is gated) → affirm → the echoed verdict.
 * `?vault=stale` is the aged plant: the elapsed line + the tax/healthcare/blend notes at the
 * gate, the one-line standing echo + the un-noted backup door on the verdict frame.
 */
async function walkVaultReturn(
  page: Page,
  key: string,
  outDir: string,
  opts: { readonly doors: boolean },
): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const open = page.getByRole('button', { name: 'Open my plan' })
  await expect(open, 'the vault plant did not land on the unlock screen').toBeVisible({
    timeout: 30_000,
  })
  await captureState(page, path.join(outDir, 'unlock'))
  await open.click()

  await expect(
    page.getByRole('heading', { name: 'Are these still your numbers?' }),
    'the re-entry gate did not mount after unlock',
  ).toBeVisible({ timeout: 30_000 })
  await captureState(page, path.join(outDir, 'gate'))

  await page.getByRole('button', { name: /Still about right/ }).click()
  await expect(page.locator('main.result[data-answer-tier="final"]')).toBeAttached({
    timeout: 120_000,
  })
  await captureState(page, path.join(outDir, 'verdict'))
  if (opts.doors) await walkDoors(page, outDir)
}

/** The stale gate's OTHER exit: "Something's changed — update them" → the walk-through's
 *  first frame (accounts are edited where they were entered). One capture — the batch judges
 *  the button pair's wording and where the update door drops you. */
async function walkUpdateRoute(page: Page, key: string, outDir: string): Promise<void> {
  await page.goto(`/?vault=${key}`)
  const open = page.getByRole('button', { name: 'Open my plan' })
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  const gateHeading = page.getByRole('heading', { name: 'Are these still your numbers?' })
  await expect(gateHeading).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: /changed — update them/ }).click()
  await expect(gateHeading, 'the update route did not leave the gate').toBeHidden({
    timeout: 30_000,
  })
  await captureState(page, path.join(outDir, 'update-entry'))
}

/** A seed target: the settled final landing + the door walk. `seed:retired` additionally
 *  rides the proven U12 worsening arc (it is that seed's own cold-read subject). */
async function walkSeed(page: Page, key: string, outDir: string): Promise<void> {
  await gotoSeedFinal(page, key)
  await captureState(page, path.join(outDir, 'landing'))
  await walkDoors(page, outDir)
  if (key === 'retired') await walkWorsening(page, outDir)
}

/**
 * The retired-spine worsening arc (the U12 cold-read batch's core): the assumptions panel →
 * a worsening spending edit (R8's honest-worsening arm — the truer-picture line renders ONLY
 * when the displayed verdict lands BELOW the panel-open baseline) → the worsened landing.
 */
async function walkWorsening(page: Page, outDir: string): Promise<void> {
  await page.getByRole('button', { name: 'The assumptions behind this', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.ap-echo__lead')).toBeVisible() // the echo's baseline reading

  // The worsening edit: the retired seed enters spending MONTHLY (spendEntryPeriod:'month'),
  // so 10,000/mo = $120k/yr against the seed's $78k baseline — the verdict must step down.
  // Edits land as you leave each field (the panel's own contract), hence the explicit blur.
  // NOT fill(): the masked currency input swallowed fill's select-all and CONCATENATED
  // ("6,500" + "10000" → 650,010,000 — caught by the first live read's False-PASS Hunter,
  // 2026-07-10), silently walking an absurd scenario. Select-all + typed digits matches a
  // real user's keystrokes, and the value is asserted back so a mis-commit fails RED here
  // instead of bundling the wrong scenario (the walk's own insight-033 discipline).
  const spend = page.getByLabel('Household spending, all in')
  await expect(spend).toBeVisible()
  await spend.click()
  await spend.press('ControlOrMeta+a')
  await spend.pressSequentially('10000')
  await spend.blur()
  await expect(spend, 'the walk committed a different spending value than intended').toHaveValue(
    '10,000',
  )
  // The truer-picture line (`.ap-echo__shift`) is the synchronization anchor: it renders only
  // after the recompute commits a verdict below baseline — a real wait, never a sleep.
  await expect(page.locator('.ap-echo__shift')).toBeVisible({ timeout: 120_000 })
  await captureState(page, path.join(outDir, 'panel-worsened'))

  // The worsened LANDING (panel closed): the negative-verdict frame the panel occludes — the
  // first read's honesty lens could not verify the worsened chart isn't a red gash (rule 11),
  // and the CVD screener's landing arm was all-positive.
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await captureState(page, path.join(outDir, 'landing-worsened'))
}

/**
 * The SOLVE arc's per-seed plan (increment 6): the goal each seed's WORLD solves under, read by its
 * rendered RADIO LABEL (never an nth-index — RECOMMENDATION_GOALS order is not a walk contract), plus
 * whether this seed additionally walks the post-commit STALE demotion. nc: pay-less-tax → the NC
 * state-certification HOLD; surplus: leave-more → the over-funded delta-as-hero RECOMMENDED lockup.
 */
const SOLVE_GOAL: Record<string, { readonly label: RegExp; readonly stale: boolean; readonly terminal?: 'steer' }> = {
  nc: { label: /Pay less tax/, stale: true },
  surplus: { label: /Leave more behind/, stale: false },
  // The steer-seed increment (2026-07-23): the no-pretax household's confirmed pick REFUSES at the
  // builder (typed reason) — no dispatch, no pending; the calm named-reason note is the terminal.
  steer: { label: /Leave more behind/, stale: false, terminal: 'steer' },
}

/**
 * A `solve:<seed>` target (increment 6): the recommend-second walk from the settled landing through the
 * committed frame, at FULL worker precision. Every stage synchronizes on a real selector — the multi-
 * minute committed body is POLLED (720s budget), never slept on; the pending breathe is the only thing
 * changing on screen meanwhile. `solve:nc` additionally walks the STALE demotion (walkSolveStale).
 */
async function walkSolve(page: Page, key: string, outDir: string): Promise<void> {
  const plan = SOLVE_GOAL[key]
  expect(plan, `solve:${key} has no goal mapping — add it to SOLVE_GOAL`).toBeDefined()

  await gotoSeedFinal(page, key)
  await captureState(page, path.join(outDir, 'landing'))

  // The invited affordance — a calm door in the quiet row (present iff the solve is invitable).
  const invite = page.locator('.result-recommend-invite')
  await expect(invite, `solve:${key}: the recommend-second invite never mounted`).toBeVisible()
  await invite.click()

  // The GoalPicker (the Tier-2 goal that PRECEDES the solve). Its dialog carries the copy + aria read.
  await expect(
    page.getByRole('heading', { name: 'What should your plan aim for?' }),
    `solve:${key}: the GoalPicker did not open`,
  ).toBeVisible()
  await captureState(page, path.join(outDir, 'goalpicker'))

  // Pick the goal by its rendered LABEL. NATIVE click (the sr-only radio trap the intake walk documents —
  // layout-independent, still bubbles to React's root), asserted checked so a missed click fails RED here.
  const dialog = page.getByRole('dialog')
  const radio = dialog.getByRole('radio', { name: plan!.label })
  await radio.evaluate((el) => (el as HTMLInputElement).click())
  await expect(radio, `solve:${key}: the goal radio did not commit`).toBeChecked()
  await dialog.getByRole('button', { name: 'See the strategy', exact: true }).click()

  await expect(dialog, `solve:${key}: the GoalPicker did not close on confirm`).toBeHidden()

  // The STEER terminal (the steer-seed increment): the builder REFUSES with the typed `no-pretax`
  // reason BEFORE any dispatch — no pending breathe (nothing is working), the calm named-reason note
  // renders immediately, and the invite door is GONE (a blocked non-goal-unset gap is not invitable —
  // a second door would re-promise the solve the note just declined). The walk ends on the note frame.
  if (plan!.terminal === 'steer') {
    const note = page.locator('.rec-note--no-pretax')
    await expect(note, `solve:${key}: the no-pretax steer note never rendered (a silent dead-end)`).toBeVisible()
    await expect(page.locator('.solve-pending'), `solve:${key}: a steer face must never breathe`).toHaveCount(0)
    await expect(
      page.locator('.result-recommend-invite'),
      `solve:${key}: the invite must retire once the steer note carries the story`,
    ).toHaveCount(0)
    await captureState(page, path.join(outDir, 'steer-note'))
    return
  }

  // The PENDING breathe — the picker closes, the solve dispatches. Capture the working frame IMMEDIATELY
  // (it holds for the full worker wait); its role=status announce rides aria.yaml / copy.txt.
  await expect(
    page.locator('.solve-pending'),
    `solve:${key}: the pending breathe never mounted (a no-pretax steer would render instantly here)`,
  ).toBeVisible()
  await captureState(page, path.join(outDir, 'pending'))

  // The COMMITTED frame — the terminal lockup (a HELD card OR the RECOMMENDED lockup). Poll patiently:
  // the full-precision (16k-path) worker solve is ~90s (nc) to ~4-7min (surplus). A never-arriving
  // lockup FAILS the walk red (insight-029) rather than bundling a frozen pending frame.
  await expect(
    page.locator('.rec-held, .rec-committed'),
    `solve:${key}: no committed lockup after the full-precision solve (expected held / recommended)`,
  ).toBeVisible({ timeout: 720_000 })
  // A RECOMMENDED lockup carries the lazy-chunked RecommendationViz — wait for the real chart (never the
  // Suspense placeholder) so the recviz crop + its CVD arms are non-vacuous (insight-029). The primary
  // viz is DOM-first (the runner-up's is inside a collapsed <details>), so `.first()` is the primary.
  if ((await page.locator('.rec-committed').count()) > 0) {
    await expect(
      page.locator('svg.rv').first(),
      `solve:${key}: the recommended lockup never rendered its RecommendationViz chart`,
    ).toBeVisible({ timeout: 60_000 })
  }
  await captureState(page, path.join(outDir, 'committed'))

  if (plan!.stale) await walkSolveStale(page, outDir)
}

/**
 * The post-commit STALE demotion (increment 6, `solve:nc` only): a fingerprint-changing control-door
 * edit demotes the committed rec → `stale`. The cheapest real edit: the withdrawal-order sheet, applied
 * off the committed `proportional` (the base's drawdownPolicy rides the solve fingerprint, so the
 * demotion is structural even where the order is inert on a single pool). One capture — the stale CARD
 * (heading + body + its IN-CARD re-open control) in one frame; the walk ends here (no revert needed).
 *
 * F-B (U16 chair fix): the fit arm now asserts note+control ADJACENCY — the re-open control lives INSIDE
 * the stale card (`.rec-note--stale .rec-note__reopen`), the promise and its action in ONE home; the
 * prepended door-row invite (`.result-recommend-invite`) is RETIRED for the stale channel (asserted gone).
 */
async function walkSolveStale(page: Page, outDir: string): Promise<void> {
  await page.getByRole('button', { name: 'Change your withdrawal order' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog, 'the withdrawal-order sheet did not open').toBeVisible()

  // Pick a policy OTHER than the committed one (the fingerprint-changing edit). Target it by a STABLE
  // value-based locator — NEVER a `:not(:checked)` locator: that re-resolves to a DIFFERENT radio the
  // instant the pick flips the checked state, so the follow-up toBeChecked lands on a now-unchecked
  // element and times out (the run1 stale-step trap). The value attribute never moves, so this locator
  // points at the same radio before and after the NATIVE click (the sr-only radio idiom).
  const currentPolicy = await dialog.locator('input[name="drawdown-policy"]:checked').getAttribute('value')
  expect(currentPolicy, 'no committed withdrawal policy to change from').not.toBeNull()
  const changedPolicy = dialog
    .locator(`input[name="drawdown-policy"]:not([value="${currentPolicy}"])`)
    .first()
  await changedPolicy.evaluate((el) => (el as HTMLInputElement).click())
  await expect(changedPolicy, 'the changed withdrawal policy did not commit').toBeChecked()
  await dialog.getByRole('button', { name: 'Use this order' }).click()

  // The demotion is synchronous on the model write (invalidateStaleSolve), but the sheet close +
  // spine recompute settle around it — wait for BOTH the stale card AND its in-card re-open control
  // so the captured frame is the settled staleness read, not a mid-transition flicker.
  const staleCard = page.locator('.rec-note--stale')
  await expect(
    staleCard,
    'the fingerprint-changing edit did not demote the committed rec to stale',
  ).toBeVisible({ timeout: 120_000 })
  // ADJACENCY (F-B): the re-open control the card promises lives INSIDE the card — the scoped locator
  // proves it structurally (a descendant of `.rec-note--stale`), and it must be in-frame with the note.
  await expect(
    staleCard.locator('.rec-note__reopen'),
    'the stale card promises a re-open — its IN-CARD control must be present, in one home with the note',
  ).toBeVisible()
  // The prepended door-row invite is RETIRED for the stale channel (ONE control home; no second door).
  await expect(
    page.locator('.result-recommend-invite'),
    'the door-row invite must NOT re-appear in the stale state (the in-card control is its one home)',
  ).toHaveCount(0)
  await captureState(page, path.join(outDir, 'stale'))
}

/**
 * The INTAKE walk (increment 4 — `intake:fork`): the Medicare-extras payment fork is
 * intake-ONLY — every seed/vault target bypasses the guided flow entirely, so the fork's
 * blank-start frame, its half-answer R19 block, and the mixed-provenance state (one entered
 * dollar, one adopted typical) were structurally uncapturable before this target. The drive
 * mirrors the CSP walk's proven near-Medicare household (65/63) up to the fork; the SPEND
 * step is captured en route (`spendHelp`'s first-ever walk — it carries the post-flip
 * premium-boundary sentence + the income-tax fence). Nothing past the fork is driven —
 * verdict/door/panel coverage rides the seed and vault targets.
 */
async function walkIntakeFork(page: Page, outDir: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Begin' }).click()

  // Person groups locate by the STABLE class — committing a name renames the group's
  // accessible legend mid-flow (by design), which would stale a name-based locator.
  const you = page.locator('.person-group').first()
  const spouse = page.locator('.person-group').nth(1)
  // NOT check({force}) (the CSP walk's idiom): the segment radios are sr-only 1px boxes, and
  // on the PHONE arm the forced click can land off-target ("did not change its state" —
  // caught by this walk's own smoke run). A NATIVE element click is layout-independent,
  // still bubbles to React's root listener, and the committed state is asserted back.
  const pick = async (
    scope: Page | ReturnType<Page['locator']>,
    name: string | RegExp,
  ): Promise<void> => {
    const radio = scope.getByRole('radio', { name, exact: typeof name === 'string' })
    await radio.evaluate((el) => (el as HTMLInputElement).click())
    await expect(radio, 'the picked radio did not commit').toBeChecked()
  }
  const next = () => page.getByRole('button', { name: 'Continue' }).click()

  await you.getByLabel('First name').fill('Pat')
  await you.getByLabel('Birth year').fill('1961')
  await pick(you, 'Male')
  await spouse.getByLabel('First name').fill('Sam')
  await spouse.getByLabel('Birth year').fill('1963')
  await pick(spouse, 'Female')
  await next()

  await pick(you, 'Already retired')
  await you.getByLabel('The age work stopped').fill('63')
  await pick(spouse, 'Already retired')
  await spouse.getByLabel('The age work stopped').fill('61')
  await next()

  const ssAmounts = page.getByLabel('Monthly benefit at full retirement age')
  await ssAmounts.first().fill('2000')
  await ssAmounts.last().fill('1500')
  const claims = page.getByLabel('The year you’ll start Social Security')
  await claims.first().fill('2028')
  await claims.last().fill('2030')
  await next()

  // The RETIREMENT-STATE step (the state-tax unit) — captured blank (the lead +
  // help + the four honest arms are the read), then NC picked so the spend step
  // downstream carries the PRICED-state spendHelp branch into its capture.
  // This walk's household is both-already-retired, so the ROUTE-TRUE present-tense heading
  // renders (the Caddie chair fix, 2026-07-15).
  await expect(page.getByRole('heading', { name: 'Where do you live in retirement?' })).toBeVisible()
  await captureState(page, path.join(outDir, 'state-step'))
  await pick(page, 'North Carolina')
  // The SELECTED-picker face (increment 5): the answered picker is a walked cold-read surface of
  // its own — the state-tax read law is that the picked segment survives WITHOUT hue (weight +
  // fill + inset ring, intake.css .segment-active). Assert the pick committed a visually-active
  // segment BEFORE the crop so a forced-click that missed (the sr-only 1px-box phone trap the
  // `pick` helper guards) fails RED here, not a bundle showing no selection. The full state
  // (copy/aria/whole-viewport CVD arms) lands the answered picker in context; captureCvdRegion
  // adds the dedicated device-scale picker crops under every arm for the fine read.
  const pickerSel = 'fieldset.segmented:has(input[name$="-retirement-state"])'
  await expect(
    page.locator(`${pickerSel} .segment-active`),
    'the North Carolina pick did not activate a segment — the picker crop would show no selection',
  ).toBeVisible()
  await captureState(page, path.join(outDir, 'state-step-picked'))
  await captureCvdRegion(page, path.join(outDir, 'state-step-picked'), pickerSel, 'state-picker')
  await next()

  // The SPEND step — captured BEFORE any entry (the help text is the read).
  await expect(page.getByLabel('Household spending, all in')).toBeVisible()
  await captureState(page, path.join(outDir, 'spend-step'))
  await page.getByLabel('Household spending, all in').fill('7000')
  await pick(page, 'Each month')
  await next()

  // ACA pair (63 < 65 ⇒ required) → out-of-pocket (optional, skipped) → IRMAA seed.
  await page.getByLabel('Your household’s combined monthly premium').fill('950')
  await page.getByLabel('Benchmark Silver plan, monthly (whole household)').fill('880')
  await next()
  await next()
  await page.getByLabel('Income, two years back').fill('120000')
  await page.getByLabel('Income, last year').fill('110000')
  await next()

  // THE FORK, blank-start: nothing pre-selected — an unanswered arm is never a silent $0.
  await expect(
    page.getByRole('heading', { name: 'Medicare, beyond Part B' }),
    'the intake drive did not land on the payment-fork step',
  ).toBeVisible()
  await captureState(page, path.join(outDir, 'fork-blank'))

  // The half-answer R19 block: 'entered below' with no dollar + Continue → the
  // finish-the-answer-or-unsay-it line. Asserted so a silent advance (or a never-rendered
  // error) fails the walk RED instead of bundling a frame identical to fork-blank
  // (insight-029 vacuity discipline).
  await pick(you, 'A monthly premium — entered below')
  await pick(spouse, /Not sure — use a typical figure/)
  await next()
  await expect(
    page.getByText('Enter the monthly amount — or pick one of the other choices.'),
    'the half-answered fork did not fire its R19 block',
  ).toBeVisible()
  await captureState(page, path.join(outDir, 'fork-blocked'))

  // Mixed provenance: Pat enters a real $180; Sam stays on the adopted typical — the state
  // the standing disclosures must keep legible per person (spec F2). Select-all + typed
  // digits + value asserted back (the fill() concatenation trap — the walk's own law).
  await typeFieldValue(you.getByLabel('Monthly premium, all in'), '180', '180')
  await captureState(page, path.join(outDir, 'fork-mixed'))
}

function hookConsole(page: Page): Array<{ type: string; text: string }> {
  const log: Array<{ type: string; text: string }> = []
  page.on('console', (m) => log.push({ type: m.type(), text: m.text() }))
  page.on('pageerror', (e) => log.push({ type: 'pageerror', text: e.message }))
  return log
}

// The phone arm carries hasTouch + isMobile so `(pointer: coarse)` matches like a REAL phone —
// pointer-adaptive chrome (the band's enlarge affordance is fine-pointer-only, 2026-07-10)
// otherwise captures a desktop DOM into the "phone" bundle and the readers judge a frame no
// phone user sees.
const VIEWPORTS = [
  { name: 'real', viewport: REAL, dpr: REAL_DPR, touch: false },
  { name: 'phone', viewport: PHONE, dpr: PHONE_DPR, touch: true },
] as const

for (const target of TARGETS) {
  const targetSlug = `${target.kind}-${target.key}`
  for (const v of VIEWPORTS) {
    test.describe(`caddie walk — ${target.kind}:${target.key} at ${v.name.toUpperCase()} (${v.viewport.width}×${v.viewport.height} @ ${v.dpr}dpr)`, () => {
      test.use({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.touch, isMobile: v.touch })
      test('walk', async ({ page }) => {
        if (target.kind === 'solve') test.setTimeout(720_000) // the full-precision worker solve is multi-minute
        const consoleLog = hookConsole(page)
        const outDir = path.join(OUT_ROOT, targetSlug, v.name)
        if (target.kind === 'vault') {
          // Doors ride the STALE verdicts only — `vault:retired`'s verdict is the same
          // household minus the staleness surfaces; double-walking its sheets is pure bloat.
          // Increment 4: `datestale` JOINS the door walk — the aged DATE household's sheets
          // are where a driven lever preview inherits (or fails to inherit) the stale
          // timeline; that interplay was an uncaptured landmine while only the spine-stale
          // vault opened its doors.
          // Increment 5: `statestale` JOINS the door walk — the affirm lands the BORDERLINE
          // NC-clause hero, and the Assumptions door opens the panel on the ANSWERED
          // retirement-state seat (the priced/answered picker-row face — face #2 of the
          // state-carrying increment, uncapturable on any non-door state).
          // U17 §S6: `datearrived` JOINS the door walk, for increment 4's own stated reason —
          // it is an aged DATE household, so its sheets are exactly where a driven lever preview
          // inherits (or fails to inherit) the elapsed timeline. It is the STRONGER case than
          // `datestale`: on the arrived plant the crowned date is BEHIND the wall clock, so any
          // lever preview that still speaks in future tense about it is wrong in a way no
          // already-covered face can show. Left out, the one plant this stage exists to
          // cold-read would have been chaired on its landing alone — and the tape's costliest
          // lesson (2026-07-10) is that he finds real defects on the surfaces the walk skipped.
          await walkVaultReturn(page, target.key, outDir, {
            doors:
              target.key === 'stale' ||
              target.key === 'datestale' ||
              target.key === 'statestale' ||
              target.key === 'datearrived',
          })
        } else if (target.kind === 'intake') {
          if (target.key !== 'fork') {
            throw new Error(`unknown intake walk "${target.key}" — only intake:fork exists`)
          }
          await walkIntakeFork(page, outDir)
        } else if (target.kind === 'solve') {
          await walkSolve(page, target.key, outDir)
        } else {
          await walkSeed(page, target.key, outDir)
        }
        fs.writeFileSync(path.join(outDir, 'console.json'), JSON.stringify(consoleLog, null, 2))
        console.log(`caddie bundle → ${outDir}`)
      })
    })
  }
  if (target.kind === 'vault' && (target.key === 'stale' || target.key === 'statestale')) {
    test.describe(`caddie walk — ${target.kind}:${target.key} UPDATE route at REAL (${REAL.width}×${REAL.height} @ ${REAL_DPR}dpr)`, () => {
      test.use({ viewport: REAL, deviceScaleFactor: REAL_DPR })
      test('update-entry', async ({ page }) => {
        const consoleLog = hookConsole(page)
        const outDir = path.join(OUT_ROOT, targetSlug, 'real')
        await walkUpdateRoute(page, target.key, outDir)
        fs.writeFileSync(path.join(outDir, 'console-update.json'), JSON.stringify(consoleLog, null, 2))
        console.log(`caddie bundle → ${outDir}`)
      })
    })
  }
}
