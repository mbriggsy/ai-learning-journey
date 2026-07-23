/*
 * src/ui/RecommendationSurface.tsx — Act-4 · U16: the recommend-second beat's render home.
 *
 * A DOWNSTREAM RENDERER (insight 020): it renders the store's structured `solve` channel through the
 * pure `recommendationView` STATES layer and NEVER re-derives anything. §S2 landed the PENDING tell;
 * §S3 (this stage) fills the committed / no-change / surplus / withheld / stale / unavailable renders —
 * a payload shape without a render is a broken state (the honesty arc ships together).
 *
 * PENDING is the shipped thinking-breathe family — one recognizable working tell (`.solve-pending`,
 * base.css), announced once on entry with burned/045 clear-after-announce discipline. COMMITTED is a
 * TERMINAL static reveal (a breathe there would falsely imply "still working"): a reveal-fade then hold,
 * with ONE `.cs-swap` crossfade key on the grade lockup (a grade change repaints word+delta+note as one
 * group — never a fresh grade beside a stale hedge). Motion is transform/opacity/SVG-attribute only
 * (CSP: no injected keyframes, no MotionConfig). The RecommendationViz is lazy-chunked behind a
 * fixed-dimension box so the beat never reflows on land (CLS).
 */
import { Suspense, lazy, useEffect, useRef } from 'react'
import type { SolveAnswer } from '@store/memoryModel'
import { useLiveAnnouncer } from '@intake/a11y'
import type { ConfidenceStatementView } from './ConfidenceStatement'
import { GradeSignal } from './GradeSignal'
import { recommendationView, type RecommendedView, type RecommendationView } from './recommendationView'
import { copy, staticDisclosures } from './copy'
import './styles/recommendation.css'

// Lazy-chunked (the U16 viz is below the grade lockup, and only the committed-active beat needs it) —
// behind a fixed-dimension box so the split-chunk load never reflows the lockup (CLS).
const RecommendationViz = lazy(() =>
  import('@viz/RecommendationViz').then((m) => ({ default: m.RecommendationViz })),
)

export function RecommendationSurface({
  solve,
  spineConfidence,
  onRepick,
}: {
  readonly solve: SolveAnswer
  /** The spine's rendered confidence object (Q1 source-bind) — threaded to the view model so the
   *  survival context is REUSED by reference, never a second authored survival claim. */
  readonly spineConfidence?: ConfidenceStatementView
  /** §S4 — the goal RE-PICK affordance: the committed beat's calm "aim at a different goal" door
   *  (the caller owns the GoalPicker + the dispatch; the un-saved hypothetical is freely re-aimable, a
   *  re-pick VISIBLY re-solves and both futures update). Optional — a surface mounted WITHOUT it (the
   *  P2/P3 shells; the in-isolation unit tests) renders no re-pick door, never a dead one. */
  readonly onRepick?: () => void
}) {
  // ONE persistent polite live region for the solve channel. Always mounted from the first resolved
  // answer so the idle→pending transition is observable (a region mounted only WHEN pending would seed
  // `prevKind` at 'pending' and never announce — burned/045).
  const announcer = useLiveAnnouncer()
  const prevKind = useRef(solve.kind)
  useEffect(() => {
    const prev = prevKind.current
    prevKind.current = solve.kind
    if (solve.kind === prev) return
    if (solve.kind === 'pending') announcer.announce(copy.recommendPendingLabel)
  }, [solve.kind, announcer])

  const view = recommendationView(solve, spineConfidence !== undefined ? { spineConfidence } : undefined)

  return (
    <div className="recommendation-surface">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {solve.kind === 'pending' && (
        <section className="solve-pending-panel" aria-busy>
          <p className="solve-pending">{copy.recommendPendingLabel}</p>
        </section>
      )}
      <CommittedBeat view={view} onRepick={onRepick} />
    </div>
  )
}

/** Route the resolved view to its render. `idle` / `blocked` / `pending` carry no committed body here —
 *  the entry affordance (Result's doors region) owns the invite + the goal steer; pending is drawn
 *  above. Every COMMITTED shape gets a render (a shape without one is a broken state). */
function CommittedBeat({ view, onRepick }: { readonly view: RecommendationView; readonly onRepick?: () => void }) {
  switch (view.kind) {
    case 'idle':
    case 'pending':
      return null
    case 'blocked':
      // goal-unset: the invite door (Result's quiet row) owns the steer → no body here. buckets-defaulted:
      // NO invite fires (the gap is ACCOUNTS, not the goal — §Q5/F2), so this calm note is the ONLY steer:
      // the household's accounts are entered as a single total, so a tax strategy has nothing to work with
      // until the pre-tax / Roth / taxable pieces are broken out. Never a silent null dead-end where a
      // goal was picked but nothing renders (the blank-render mutant reds on the buckets arm).
      return view.gap === 'buckets-defaulted' ? (
        <section className="rec-note rec-note--buckets" role="status">
          <p className="rec-note__line">{copy.recommendBucketsNote}</p>
        </section>
      ) : null
    case 'stale':
      // §S1 invalidation — the committed rec no longer describes the current household; calm status,
      // re-solve INVITED (never auto-re-solved). F-B (U16 chair fix): ONE coherent card — a calm HEADING,
      // a BODY (the answer above is current; only this strategy read went stale — TRUE whether the
      // predecessor was held or recommended), and the re-open CONTROL rendered INSIDE the card (the
      // promise and its action in ONE home). This is now the STALE channel's ONE re-open control home:
      // Result.tsx retires the prepended door-row invite for `stale` (compute-error keeps it). The
      // control opens the GoalPicker (the invite/re-pick path — the goal precedes the solve, the standing
      // goal pre-selected), so its label names the OUTCOME it leads to, never an imperative. Rendered
      // only when the caller wired the picker (onRepick) — never a dead button (the P2/P3 shells).
      return (
        <section className="rec-note rec-note--stale" role="status">
          <h3 className="rec-note__head">{view.heading}</h3>
          <p className="rec-note__line">{view.body}</p>
          {onRepick !== undefined && (
            <button type="button" className="btn-quiet rec-note__reopen" onClick={onRepick}>
              {copy.recommendStaleReopenCta}
            </button>
          )}
        </section>
      )
    case 'unavailable':
      // A refusal / mint-failure / demotion / compute-error, surfaced as ONE calm retry line (the raw
      // reason is `view.detail` — logging only, NEVER rendered).
      return (
        <section className="rec-note rec-note--unavailable" role="status">
          <p className="rec-note__line">{view.note}</p>
        </section>
      )
    case 'held':
      // Q5 — the honesty-gate HOLD: name every TRUE reason as TEXT (calm-competent, never an alarm).
      return (
        <section className="rec-held">
          <h3 className="rec-held__head">{view.heading}</h3>
          {view.reasons.map((reason, i) => (
            <p key={i} className="rec-held__reason">
              {reason}
            </p>
          ))}
        </section>
      )
    case 'recommended':
      return <RecommendedBeat view={view} onRepick={onRepick} />
    default: {
      // The exhaustiveness guard (the shipped gradeWord / gradeSignalState idiom): a future
      // RecommendationView arm fails tsc HERE rather than silently rendering nothing — a payload shape
      // without a render is a broken state (the honesty arc handles EVERY shape).
      const _exhaustive: never = view
      throw new Error(`[RecommendationSurface] unhandled solve view — declare its render (${String(_exhaustive)})`)
    }
  }
}

/** The committed RECOMMENDATION (active / surplus / no-change) — the grade lockup + delta viz +
 *  disclosures + runner-up + the conversion-only hold + the S4 honest-limits note, re-pick door, and
 *  the reserved save slot. Every string is pre-resolved by the view model. */
function RecommendedBeat({ view, onRepick }: { readonly view: RecommendedView; readonly onRepick?: () => void }) {
  const g = view.grade
  return (
    <section className="rec-committed">
      {/* The grade lockup — ONE semantic group, ONE crossfade key (a grade change repaints the whole
          group so a fresh grade never paints beside a stale hedge). The glyph is decorative when the
          grade WORD sits beside it (the word carries the state into the a11y tree); the ungraded case
          draws the standalone role="img" glyph with its own name. */}
      <div
        className="rec-grade cs-swap"
        key={`${view.mode}-${g.signalState}`}
        role="group"
        aria-label={g.word ?? copy.recGradeAriaUngraded}
      >
        <p className="rec-grade__head">
          {g.word !== undefined ? (
            <>
              <GradeSignal state={g.signalState} className="rec-grade__glyph" />
              <span className="rec-grade__word">{g.word}</span>
            </>
          ) : (
            <GradeSignal state="ungraded" label={copy.recGradeAriaUngraded} className="rec-grade__glyph" />
          )}
        </p>
        <p className="rec-grade__hero">{g.heroLine}</p>
        {g.shapeNote !== undefined && <p className="rec-grade__note">{g.shapeNote}</p>}
        {g.hingeNote !== undefined && <p className="rec-grade__note">{g.hingeNote}</p>}
        {g.ungradedNote !== undefined && <p className="rec-grade__note">{g.ungradedNote}</p>}
      </div>

      {/* The two-arm comparison viz — ACTIVE mode only, lazy-chunked behind a fixed-dimension box.
          A direct child of .rec-committed (NOT wrapped below): at the laptop two-pane it rides the
          RIGHT column of the committed beat's inner grid, aligned under the spine band, while the
          text below rides the left at the reading measure (F-A the dead-rail fix, confidence.css). */}
      {view.viz !== undefined && (
        <div className="rec-viz-box">
          <Suspense fallback={<div className="rec-viz-box__placeholder" aria-hidden="true" />}>
            <RecommendationViz
              withoutMagnitude={view.viz.withoutMagnitude}
              withMagnitude={view.viz.withMagnitude}
              labels={view.viz.labels}
            />
          </Suspense>
        </div>
      )}

      {/* The text lockup below the grade — the reading-measure column of the two-pane committed beat
          (a transparent `display:contents` group in single column, so the phone renders these as flat
          flex children exactly as before; a real left grid column only at the laptop two-pane where the
          viz above rides the right — confidence.css owns the switch). */}
      <div className="rec-committed__rest">
        {/* Q7 — the baseline nameplate: a STATIC label, NO number (the A↔B residual never renders). */}
        <p className="rec-baseline">{view.baselineNameplate}</p>

        {/* Q6 — the leave-more skew median quote (present iff disclosure-worthy). */}
        {view.skew !== undefined && <p className="rec-skew">{view.skew.medianQuote}</p>}

        {/* The disclosures adjacent to the delta (R7 nets) — read-only NOTES (no inert editing affordance
            ships; the heir-bracket r7-editable seat's inline editor lands with its persisted field). */}
        {view.disclosures.length > 0 && (
          <ul className="rec-disclosures">
            {view.disclosures.map((d) => (
              <li key={d.id} className="rec-disclosure" data-disclosure={d.id} data-disposition={d.disposition}>
                {d.text}
              </li>
            ))}
          </ul>
        )}

        {/* R23 — the runner-up, retained + reachable one tap down. The hedged "why this beat it" TEXT
            always shows; the §S4 comparative-depth two-arm viz (winner vs runner-up) rides beside it ONLY
            when the winner DISPLAYS ahead at seed-B (the view model drops the picture on an A-decides/
            B-displays inversion — never a chart contradicting the ranking). Reuses the SAME lazy
            RecommendationViz chunk (already loaded by the primary viz in active mode) behind a
            fixed-dimension box so it never reflows the panel on land (CLS). */}
        {view.runnerUp !== undefined && (
          <details className="rec-runnerup">
            <summary className="rec-runnerup__summary">{copy.recSeeRunnerUp}</summary>
            <p className="rec-runnerup__why">{view.runnerUp.why}</p>
            {view.runnerUp.viz !== undefined && (
              <div className="rec-viz-box rec-runnerup__viz">
                <Suspense fallback={<div className="rec-viz-box__placeholder" aria-hidden="true" />}>
                  <RecommendationViz
                    withoutMagnitude={view.runnerUp.viz.withoutMagnitude}
                    withMagnitude={view.runnerUp.viz.withMagnitude}
                    labels={view.runnerUp.viz.labels}
                  />
                </Suspense>
              </div>
            )}
          </details>
        )}

        {/* Q5 — the conversion-only hold (dormant today): the sequencing rec ships, conversions named-held
            with their true reason(s) + the coupling caveat. */}
        {view.withheldConversion !== undefined && (
          <section className="rec-conv-hold">
            <h4 className="rec-conv-hold__head">{copy.recommendWithheldConversionsHeading}</h4>
            {view.withheldConversion.reasons.map((reason, i) => (
              <p key={i} className="rec-conv-hold__reason">
                {reason}
              </p>
            ))}
            <p className="rec-conv-hold__coupling">{view.withheldConversion.coupling}</p>
          </section>
        )}

        {/* §S4 — the honest-limits note (R13): calm, invited. The recommendation is the most plan-moving
            beat, so it carries its own honest-limits caveat — the ONE `staticDisclosures` source (never a
            parallel string that could drift; the same words the spine Disclaimer reads), a quiet
            subordinate line, never an alarm and never an imperative CTA. */}
        <p className="rec-limits">{staticDisclosures.honestLimitsValidate}</p>

        {/* §S4 — the goal RE-PICK door: the un-saved hypothetical is freely re-aimable, and a re-pick
            VISIBLY re-solves (both futures update). A calm door (btn-quiet, ≥24px, visible non-color
            focus ring), NEVER a save. Rendered only when the caller wired the picker (onRepick). */}
        {onRepick !== undefined && (
          <button type="button" className="btn-quiet rec-repick" onClick={onRepick}>
            {copy.recommendRepickCta}
          </button>
        )}

        {/* §S4 — the RESERVED save slot: layout space ONLY (kills the U17 CLS relayout). NO live Save
            control ships in U16 — a gesture whose commit doesn't persist is a lie (the security seat's
            `writable()`-refuses finding: an inert "saved" in the recovery-unlocked/no-vault survivor
            state is data loss at the widow-cliff). The gesture + the v3 write land TOGETHER in U17; here
            the slot is an EMPTY reservation (aria-hidden — nothing to announce), never interactive. */}
        <div className="rec-save-slot" aria-hidden="true" />
      </div>
    </section>
  )
}
