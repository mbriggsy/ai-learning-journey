/*
 * src/ui/ConfidenceStatement.tsx — the U7 verdict-FIRST surface (the product's face, R1).
 *
 * The plain-language confidence statement (R2/R14): a married couple with no finance background
 * reads the verdict WORD, the "X of 10" natural-frequency reading, and a coarse dollar-grammar
 * clause — in that calm order — with the range one pull away, never on the first frame (R4).
 *
 * SPINE-LEAD (U7): this surface leads with the spine confidence reading. The DATE-first lead for a
 * not-yet-retired household is D2's job (the state-adaptive first answer); the same calm voice, a
 * different lead. This component renders what it is GIVEN (the engine's Headline + DollarAdjustment
 * + an optional per-year BandFan) — it re-derives no threshold, clamp, or grade (confidence.ts
 * already tagged the distribution; outcomeStates.ts maps the tag to presentation).
 *
 * THE COLOR-BLIND LAW (back-nine-design §2): the signal is NEVER color. The verdict reaches the
 * reader through a redundant stack — the WORD (text, the a11y-tree signal), the "X of 10" count,
 * the dollar magnitude, and the SILHOUETTE glyph. The word renders in --ink (uniform), so hue
 * carries ZERO good/bad connotation; the glyph is decorative (aria-hidden) beside its visible word.
 *
 * CALM RENDERING (back-nine-design §3): the figures render STATIC — no count-up / odometer (a
 * dashboard/casino tell, and the static number is the reload-determinism screenshot artifact). The
 * surface fades in once on its first reveal (the magic moment); numbers never animate. All motion
 * honors prefers-reduced-motion, and the final rendered state is identical with motion on or off.
 *
 * THE STICKY SENTENCE + THE VERDICT CROSSFADE (U12 C2): the SENTENCE (glyph + verdict word +
 * "X of 10" + the $/mo clause) renders from the sticky DISPLAY triple when `view.displayed` rides
 * (memoryModel's hysteresis seam — the sentence never flickers between two honest roundings of one
 * household); the band + every drill-down keep reading the RAW result. A displayed-change on a
 * mounted hero crossfades the lockup AS ONE UNIT — a CSS-only @starting-style opacity entrance on
 * re-keyed TEXT containers (never framer-motion: motion@12 layout features inject an inline
 * <style> that style-src 'self' kills in prod headers only) — and announces the new sentence once
 * through the polite live region. Reduced motion: instant swap, identical final state.
 *
 * STRING-FREE inline (cross-cutting #4): every user-facing string comes from copy.ts (gated by the
 * U7 copyGuard); every numeral enters through a typed slot. CSP-clean: all styling is class-driven
 * (confidence.css), never an inline style attribute.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { copy } from './copy'
import { OUTCOME_PRESENTATION } from './outcomeStates'
import { VerdictIcon } from './verdictSignal'
import { SurvivorReadout } from './SurvivorReadout'
import { TwoTierHeadline } from './TwoTierHeadline'
import { floorRelief } from './twoTier'
import { formatAxisDollar } from './money'
import { composeVerdictReading } from './verdictSentence'
import { focusHeading, useLiveAnnouncer } from '@intake/a11y'
import { ConfidenceBandPanel } from '@viz/ConfidenceBandPanel'
import {
  resolveBandData,
  buildYTicks,
  type IndeterminateBandData,
  type XAnnotation,
} from '@viz/bandData'
import { BAND_LABELS, BAND_CHROME, composeBandAtRange } from './bandPanelChrome'
import type { BandSavedAnchor } from './bandAnnotations'
import type { BandFan, DollarAdjustment, Headline, SurvivorReading } from '@shared/model'
import type { StickyDisplay } from '@store/memoryModel'
import './styles/confidence.css'

/** What the surface shows. `reading` covers all six engine states (it reads `outcomeState`);
 *  `pending` and `compute-error` are the NON-verdict modes (the band is simply not mounted). */
export type ConfidenceStatementView =
  | {
      readonly kind: 'reading'
      readonly headline: Headline
      readonly dollar: DollarAdjustment
      /** U12 C2 — the sticky-resolved DISPLAY triple (memoryModel's hysteresis seam, threaded by
       *  answerView from the same commit as the answer). When present, the SENTENCE — glyph +
       *  verdict word + "X of 10" + the $/mo clause — renders from it; the band and every
       *  drill-down (survivor, floor relief, scrub, AT range) keep reading the RAW
       *  `headline`/`dollar` above (one honest raw record, one sticky sentence). Absent (the
       *  preview harness, displayed-less fixtures) ⇒ the sentence reads the raw result directly. */
      readonly displayed?: StickyDisplay
      /** The engine's per-year fan, opt-in. When present (and the state is a real verdict), the
       *  "show me the range" drawer mounts. Absent ⇒ no drawer (the verdict still stands). */
      readonly band?: BandFan
      /** Household-clock x-axis markers (Today / retirement / horizon) for the band; without them
       *  the band's x-axis reads bare. Applied to the resolved band AND the indeterminate placeholder. */
      readonly bandAnnotations?: readonly XAnnotation[]
      /** Maps a lattice year to the household ages string for the band's hover/scrub readout (the same
       *  slot the annotations use). Absent ⇒ the readout omits its ages line. */
      readonly bandAges?: (yearsFromNow: number) => string
      /** Renders the PROVISIONAL eyebrow — a reading taken before the account set is complete is a
       *  labeled provisional update, never a final answer (back-nine-design intake §progressive). */
      readonly provisional?: boolean
      /** The U7 "as the survivor" reading — the quieter second statement. Present iff the spine run
       *  carried a survivor phase (the parent, answerView, decides); when present, SurvivorReadout
       *  mounts below the band. Spine-only: the date route renders a timing claim, not a joint verdict. */
      readonly survivorReading?: SurvivorReading
      /** The U9b essentials-floor verdict — a PARALLEL engine-tagged Headline, present iff a budget
       *  rode the run (carried VERBATIM from SimulationResult.floorReading, never re-derived —
       *  insight 045). The floorRelief gate decides whether it earns the subordinate relief line;
       *  the value-equal degenerate collapses to the single-metric statement verbatim. */
      readonly floorReading?: Headline
    }
  | { readonly kind: 'pending' }
  | { readonly kind: 'compute-error'; readonly onRetry: () => void }

export interface ConfidenceStatementProps {
  readonly view: ConfidenceStatementView
  /** Bump to move focus to the verdict heading (the magic-moment landing — the focus-to-heading
   *  announce, no double-announce). Omit (default) to leave focus alone: provisional ticks and the
   *  dev preview harness never steal focus. */
  readonly focusSignal?: number | string
  /** The completion actions (Result's save slot + budget door + return). Passed ONLY on a resolved
   *  two-pane answer so the grid can seat them in the left reading column (result.css / confidence.css);
   *  in single column `.reveal__actions` is `display:contents` so they render flat below, unchanged.
   *  Omitted (the preview harness, the fallback path) ⇒ nothing renders here. */
  readonly actionsSlot?: ReactNode
  /** P3·U11 (the council's veto condition, 2026-07-03): TRUE for a household whose Medicare
   *  costs the engine does not yet price (post-65-only — the intake never asks the marketplace
   *  questions, so healthcare never prices and base Part B + IRMAA read $0). The verdict then
   *  wears the honest-gap disclosure in its subordinate region — on the surface, in the a11y
   *  tree, never buried. Default false (the priced domain). */
  readonly medicareUnpricedNote?: boolean
  /** P3·U13 — TRUE when any staleness clock fired at unlock (IntakeApp's re-entry gate):
   *  the verdict wears the standing "figured fresh under today's rules" line in its
   *  subordinate region — the Q1 disclosure rides WITH the verdict, never after it.
   *  Default false (fresh intakes, no-drift returns). */
  readonly stalenessNote?: boolean
  /** U12 ultramode: TRUE while a modal sheet/panel owns focus and AT (Result threads its
   *  open-sheet states). Two suppressions, same reason (the insight-067 modal contract):
   *  (1) the mount-time landing focus is CONSUMED without moving focus — an in-panel edit
   *  that demotes → re-resolves REMOUNTS this hero, and focusHeading would yank the keyboard
   *  user out of the open aria-modal onto a heading behind it; (2) the sharpen announce is
   *  skipped — aria-modal does NOT silence background live regions, so the panel echo
   *  (role=status, the panel's own AT feedback) would compete with a second reading of the
   *  same verdict. Default false (the panel-less sharpen keeps both behaviors). */
  readonly sheetOpen?: boolean
  /** P3·U13 — the aged-vault wall-time anchor (Result's memoized dateAnchor; the ONE
   *  local-calendar chain). Re-bases the C2 AT sentence's "about N years out" to wall time —
   *  the plan-time count read ~elapsed years LONG on an aged vault (optimistic direction;
   *  ultramode 2026-07-10). Absent / elapsed 0 (fresh sessions, the preview harness) is
   *  byte-identical. */
  readonly savedAnchor?: BandSavedAnchor
}

/** The indeterminate placeholder band — a wide low-emphasis envelope (no median, no precise band)
 *  so the "range not determined yet" card still reads as a band and sits at the SAME size as the
 *  resolved panels, without implying a confident answer. The $ ceiling + horizon are representative
 *  (the range is genuinely undetermined); the note names the state. */
const PLACEHOLDER_HORIZON_YEARS = 30
const PLACEHOLDER_DOLLAR_MAX = 2_000_000
function buildPlaceholderBand(annotations: readonly XAnnotation[]): IndeterminateBandData {
  return {
    kind: 'indeterminate',
    horizonYears: PLACEHOLDER_HORIZON_YEARS,
    dollarMax: PLACEHOLDER_DOLLAR_MAX,
    yTicks: buildYTicks(PLACEHOLDER_DOLLAR_MAX, formatAxisDollar),
    annotations,
    placeholderNote: copy.bandPlaceholderNote,
  }
}

export function ConfidenceStatement({ view, focusSignal, actionsSlot, medicareUnpricedNote = false, stalenessNote = false, sheetOpen = false, savedAnchor }: ConfidenceStatementProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Announce on the FIRST landing only (the undefined→defined edge) — the shared once-per-landing
  // contract (mirrors FuckOffDate). The spine's two recomputes are byte-identical, so its key never
  // changes across the pair; this guard makes the once-only intent explicit and tier-proof. Review
  // unmounts the surface, resetting the ref so a fresh completion re-announces.
  // Behind an open sheet the landing is CONSUMED without moving focus (see the sheetOpen prop
  // doc): the remount came from an in-panel edit, the modal owns focus, and the panel's own
  // close/steer owns where focus goes next — the hero must never grab it from behind aria-modal.
  const announcedRef = useRef(false)
  useEffect(() => {
    if (focusSignal !== undefined && !announcedRef.current) {
      announcedRef.current = true
      if (!sheetOpen) focusHeading(headingRef.current)
    }
  }, [focusSignal, sheetOpen])

  // ── U12 C2 — the sticky sentence + the verdict crossfade ────────────────────────────────────
  // WHAT THE SENTENCE SHOWS: the sticky DISPLAY triple when one rides the view (production — the
  // Phase B invariant makes it non-null on every non-indeterminate spine verdict), else the raw
  // result (the preview harness). All-or-nothing — never a per-field mix of sticky and raw (the
  // WithMargin failure mode: one figure sticky while another flickers in one sentence).
  const shown =
    view.kind === 'reading' && view.headline.outcomeState !== 'indeterminate'
      ? (view.displayed ?? {
          xOfTen: view.headline.xOfTen.value,
          outcomeState: view.headline.outcomeState,
          perMonthDollar: view.dollar.perMonthReal.value,
          direction: view.dollar.direction,
        })
      : null
  // The sentence pieces come from the ONE shared composer (verdictSentence.ts — the
  // AssumptionPanel echo reads the same seam, so hero and echo can never diverge; U12
  // ultramode). `shown` excludes indeterminate above, so the composer never returns null here.
  // The FRAMING (outcome-first vs action-first) stays a presentation lookup — it shapes the
  // lockup's layout, not its words, so it lives outside the sentence composer.
  const shownVerdict = shown ? composeVerdictReading(shown) : null
  const shownPres = shown ? OUTCOME_PRESENTATION[shown.outcomeState] : null
  const shownWord = shownVerdict?.word ?? ''
  const shownReading = shownVerdict?.reading ?? ''
  const shownClause = shownVerdict?.clause ?? ''

  // THE SWAP KEY (the CSS-only crossfade's re-mount trigger): derived from the RENDERED sentence
  // pieces — state + count line + clause — so it changes exactly when the visible sentence changes
  // and NEVER otherwise. Deliberately not the bare `${state}:${xOfTen}:${dollar}` tuple: a $-step
  // move under a figure-less clause (on-the-line / rethink) leaves the sentence byte-identical, and
  // re-keying then would blink unchanged words — the exact flicker the sticky seam exists to kill.
  const lockupKey = shown ? `${shown.outcomeState}:${shownReading}:${shownClause}` : undefined

  // THE CROSSFADE LATCH (the firstDraw pattern): the fade fires only on a lockupKey CHANGE while
  // mounted — first mount / fresh landing carries no swap class (the .confidence-reveal reveal owns
  // the entrance). `everSwapped` keeps the class stable across later same-key re-renders (a stale
  // .cs-swap on a settled element is inert — @starting-style only fires at element creation).
  const prevLockupKey = useRef(lockupKey)
  const everSwapped = useRef(false)
  const isSwap =
    lockupKey !== undefined && prevLockupKey.current !== undefined && prevLockupKey.current !== lockupKey
  const swapCls = (base: string): string => (isSwap || everSwapped.current ? `${base} cs-swap` : base)

  // THE SHARPEN ANNOUNCE (AT parity — the FuckOffDate hero-claim idiom, ConfidenceStatement's
  // sibling): a displayed-triple change on a mounted hero announces the NEW sentence ONCE through
  // the polite clear-after-announce live region (mounted empty — a region born populated may never
  // speak, burned/045). Focus is never yanked — the announcedRef latch above is untouched.
  const announcer = useLiveAnnouncer()
  const sentence = shown ? `${shownWord}. ${shownReading} ${copy.confidenceCoverageCaption}. ${shownClause}` : ''
  useEffect(() => {
    const prev = prevLockupKey.current
    prevLockupKey.current = lockupKey
    if (lockupKey === undefined || prev === undefined || prev === lockupKey) return
    everSwapped.current = true
    // Behind an open sheet the panel echo (role=status) IS the AT feedback for the edit —
    // aria-modal does not silence background live regions, so speaking here too would read
    // the same verdict twice (U12 ultramode). The crossfade bookkeeping above still runs.
    if (!sheetOpen) announcer.announce(sentence)
  }, [lockupKey, sentence, announcer, sheetOpen])

  // The producer seam: resolve the per-year fan into drawable geometry ONCE per view. resolveBandData
  // owns the fail-loud honesty guards (malformed fan ⇒ throw — never a silently-wrong band). Only a
  // worded reading with a fan carries a band; indeterminate / pending / error never do.
  const resolved = useMemo(() => {
    // Align the resolve guard with the RENDER guard: only a WORDED reading with a fan draws a band.
    // An indeterminate reading renders the placeholder (never `resolved`), so resolving — and possibly
    // throwing on — a fan it would never draw is both wasted and a latent render-throw on a never-shown
    // band (the engine emits no fan for indeterminate today; this keeps the guards from drifting apart).
    if (view.kind !== 'reading' || !view.band || view.headline.outcomeState === 'indeterminate') {
      return null
    }
    return resolveBandData(view.band, view.headline.outcomeState, {
      formatDollar: formatAxisDollar,
      annotations: view.bandAnnotations,
      formatAges: view.bandAges,
    })
  }, [view])

  // The screen-reader-only band range sentence (AT parity, council 2026-06-29). Composed off the SAME
  // resolved data, so it re-renders WITH the band on a provisional→final scale re-key (insight 047) and
  // quotes the same resampled tooltipRows the sighted scrub shows. null ⇒ withdrawn (no clean column).
  // The anchor re-bases "about N years out" to WALL time on an aged vault (one time base per screen).
  const atRangeSentence = useMemo(
    () => (resolved ? composeBandAtRange(resolved, savedAnchor) : null),
    [resolved, savedAnchor],
  )

  let body: ReactNode
  if (view.kind === 'pending') {
    body = <p className="cs-pending">{copy.answerPending}</p>
  } else if (view.kind === 'compute-error') {
    body = (
      <p className="cs-error">
        {copy.answerError}{' '}
        <button type="button" className="cs-retry" onClick={view.onRetry}>
          {copy.answerRetry}
        </button>
      </p>
    )
  } else if (view.headline.outcomeState === 'indeterminate') {
    // Range / no-verdict: the answer is incomplete, not bad — the ellipsis glyph + the calm "takes
    // shape as you go" line (never an outcome word — outcomeStates framing 'range') + the wide
    // PLACEHOLDER band (no median, no precise edge), so the card reads as a band and matches the
    // resolved panels' size without implying a confident answer.
    body = (
      <div className="confidence-reveal" data-framing="range">
        <div className="cs-range">
          <VerdictIcon state="indeterminate" className="cs-glyph" />
          <h2 className="cs-range__lead" tabIndex={-1} ref={headingRef}>
            {copy.answerIncomplete}
          </h2>
        </div>
        <div className="cs-band">
          <ConfidenceBandPanel
            data={buildPlaceholderBand(view.bandAnnotations ?? [])}
            labels={BAND_LABELS}
            chrome={BAND_CHROME}
          />
        </div>
      </div>
    )
  } else {
    // U12 C2 — THE RAW/STICKY SPLIT, surface half: the SENTENCE below (glyph + word + count +
    // clause) renders the `shown` values derived above (the sticky display triple when threaded);
    // everything else in this arm — the two-tier relief gate, the survivor readout, the band, the
    // AT range sentence — keeps reading the RAW `view.headline`/`view.dollar`/`view.band`. One
    // honest raw record, one sticky sentence. `shown` is non-null exactly in this arm (the same
    // worded-reading condition computed it).
    const s = shown!
    // The two-tier gate (pure, insight 048): null = no budget rode, or the value-equal
    // degenerate — the single-metric statement renders verbatim, no subordinate wrapper. Reads the
    // RAW headline (a drill-down must agree with the engine record, never the sticky display).
    const relief = floorRelief(view.headline, view.floorReading)
    // The folded survivor's CLOSED face (2026-07-02 rework — the raw disclosure row read as a
    // form control, not a statement): the summary speaks the eyebrow AND the verdict lockup
    // (glyph + word, the same scale as its subordinate siblings), so the fold reads as a real
    // third statement with its COUNT one calm pull away — build-gate 7 intact (≤1 subordinate
    // X-of-10 count on the first frame; the WORD carries no count). Defensive absence (insight
    // 044): a wordless state renders an eyebrow-only summary, never a wordless verdict lockup.
    const survivorPres = view.survivorReading
      ? OUTCOME_PRESENTATION[view.survivorReading.outcomeState]
      : null
    const survivorWord = survivorPres?.verdictWordKey ? copy[survivorPres.verdictWordKey] : null
    // THE VERDICT CROSSFADE (U12 C2 — CSS-only, the council's hard F7 CSP condition): the lockup's
    // TEXT containers below carry `key={…lockupKey}` so a displayed-change remounts them and the
    // .cs-swap @starting-style fade enters the fresh nodes (confidence.css) — word + shape +
    // magnitude AS ONE UNIT, never a hue transition, no framer-motion anywhere in this path.
    // THE KEY SCOPING LAW (insight 047): the key rides the text containers ONLY — the h2 (the
    // focus latch), the band panel, the drawers, and the actions row all survive the swap unmoved.
    body = (
      <div className="confidence-reveal" data-framing={shownPres!.framing} data-twopane={resolved ? '' : undefined}>
        <div className="reveal__lead">
          {view.provisional && <p className="cs-provisional">{copy.answerProvisionalTag}</p>}
          <div className="cs-verdict">
            <VerdictIcon key={`glyph:${lockupKey}`} state={s.outcomeState} className={swapCls('cs-glyph')} />
            <h2 className="cs-word" tabIndex={-1} ref={headingRef}>
              <span key={`word:${lockupKey}`} className={swapCls('cs-word__text')}>
                {shownWord}
              </span>
            </h2>
          </div>
          <p key={`reading:${lockupKey}`} className={swapCls('cs-reading')}>
            <span className="cs-reading__count">{shownReading}</span>{' '}
            <span className="cs-reading__frame">{copy.confidenceCoverageCaption}</span>
          </p>
          <p key={`magnitude:${lockupKey}`} className={swapCls('cs-magnitude')}>
            {shownClause}
          </p>
        </div>
        {resolved && (
          <div className="cs-band">
            <ConfidenceBandPanel
              data={resolved}
              labels={BAND_LABELS}
              chrome={BAND_CHROME}
              atRangeSentence={atRangeSentence}
            />
          </div>
        )}
        {/* THE SUBORDINATE READOUTS — one wrapper so the two-pane grid stays two rows and the band
            stays pinned rows 1/-1 whatever mounts here (U9b build-gate 4; two direct grid children
            would mint an implicit third row). Inside, in order:
            (1) the U9b essentials-relief line (present iff the floorRelief gate earns it — the
                value-equal degenerate renders the single-metric statement VERBATIM, wrapper absent
                when nothing earns it);
            (2) the "as the survivor" statement — INLINE exactly as shipped when it is the only
                subordinate face, FOLDED behind a calm <details> when the floor relief already
                holds the one inline X-of-10 slot (build-gate 7: at most ONE subordinate count on
                the first frame; R4 — the fold is the seam the cold-read can flip). Both render
                below the band so the scrub tap-targets never move (insight 035); absence renders
                nothing (insight 044). */}
        {(relief || view.survivorReading || medicareUnpricedNote || stalenessNote) && (
          <div className="reveal__subordinates">
            {relief && <TwoTierHeadline relief={relief} />}
            {view.survivorReading &&
              (relief ? (
                <details className="survivor-fold">
                  <summary className="survivor-fold__summary">
                    <span className="survivor__eyebrow">{copy.survivorReadoutEyebrow}</span>
                    <span className="survivor-fold__verdict">
                      {survivorWord && (
                        <>
                          <VerdictIcon
                            state={view.survivorReading.outcomeState}
                            className="survivor__glyph"
                          />
                          <span className="survivor__word">{survivorWord}</span>
                        </>
                      )}
                      <span className="survivor-fold__chevron" aria-hidden="true" />
                    </span>
                  </summary>
                  <SurvivorReadout reading={view.survivorReading} foldBody />
                </details>
              ) : (
                <SurvivorReadout reading={view.survivorReading} />
              ))}
            {/* P3·U11 — the unpriced-Medicare disclosure (the council's veto condition,
                2026-07-03): ON the verdict surface for the post-65-only household the engine
                prices $0 Medicare for — plain text in the a11y tree (never aria-hidden, never
                a buried list), carrying NO count (build-gate 7 untouched). */}
            {medicareUnpricedNote && (
              <p className="cs-medicare-note">{copy.verdictMedicareUnpriced}</p>
            )}
            {/* P3·U13 — the standing staleness echo (Q1): the full per-clock disclosure
                already rendered at the re-entry gate; this line keeps the fact visible WITH
                the verdict. Plain text in the a11y tree; its OWN class — the fit gate pins
                .cs-medicare-note per-seed, so this note must never alias it. */}
            {stalenessNote && <p className="cs-staleness-note">{copy.stalenessHeroNote}</p>}
          </div>
        )}
        {/* The completion actions, seated in the left reading column on two-pane (display:contents in
            single column keeps them flat below — see confidence.css). Absent in the preview harness. */}
        {actionsSlot != null && <div className="reveal__actions">{actionsSlot}</div>}
      </div>
    )
  }

  return (
    <section className="confidence" aria-label={copy.confidenceRegionLabel}>
      {/* U12 C2 — the ONE polite clear-after-announce live region (the FuckOffDate sibling):
          mounted EMPTY unconditionally (a region born populated may never speak — burned/045);
          the sharpen announce above speaks the new sticky sentence into it. */}
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {body}
    </section>
  )
}
