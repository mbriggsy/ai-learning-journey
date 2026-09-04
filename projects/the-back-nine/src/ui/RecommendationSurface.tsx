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
 *
 * U17 §S5 lands TWO more things here, and WHERE each mounts is the load-bearing decision.
 *
 *  1. THE SAVE SLOT fills the U16 reservation, INSIDE `RecommendedBeat` — structurally correct, because
 *     a payload the view degraded to `unavailable`/`held` has no crowned winner to mint a record from.
 *  2. THE ASIDE (the remembered-record card + the gesture's refusal card) mounts in THIS component's
 *     OWN body, and NEVER inside `CommittedBeat`/`RecommendedBeat`. That is a P0, not a preference:
 *     `RecommendedBeat` has ONE call site (`case 'recommended'`), and `case 'idle'` returns null — so a
 *     card mounted there could paint only its CURRENT arm, seconds after a save, which is the one
 *     moment it is useless. A RETURNING household is IDLE (memoryModel seeds `{kind:'idle'}` and the
 *     hydrate effect only replaces the draft), and a draft edit demotes committed → `stale` — the two
 *     frames the card exists for. So the aside is gated on ITS OWN data (the disk-derived record, the
 *     standing refusal) and on nothing else.
 */
import { Suspense, lazy, useEffect, useId, useRef } from 'react'
import type { SolveAnswer } from '@store/memoryModel'
import type { PricedState } from '@engine/constants/stateTax'
import { useLiveAnnouncer } from '@intake/a11y'
import type { ConfidenceStatementView } from './ConfidenceStatement'
import type { BandPlanClockAnchor } from './bandAnnotations'
import { GradeSignal } from './GradeSignal'
import { recommendationView, type RecommendedView, type RecommendationView } from './recommendationView'
// TYPE-ONLY, and deliberately so: `IntakeApp` imports `Result` which imports THIS module, so a VALUE
// import would close a runtime cycle (and drag the lazy intake chunk's entry into this one). `import
// type` is erased at build, so the ticket's shape is shared without any module edge at all.
import type { RecommendationSaveTicket } from './IntakeApp'
import type {
  RecommendationSaveRefusal,
  RecommendationSaveView,
  SavedRecordCardView,
} from './recommendationSaveView'
import { copy, staticDisclosures } from './copy'
import './styles/recommendation.css'

/** The strategy slot's save state + the callbacks the caller attaches (`deriveRecommendationSave` is
 *  the tested machine; this surface is dumb wiring over its five arms). */
export interface RecommendationSaveProp {
  readonly view: RecommendationSaveView
  /** The tap. The TICKET is composed HERE, from the two producers on screen — never re-derived by the
   *  gesture (insight 081); see the narrowing at the call site below. */
  readonly onSave: (ticket: RecommendationSaveTicket) => void
  /** THE DURABILITY EVENT — "a write carrying this record reached disk". A flag rather than a view
   *  transition because the ceremony route UNMOUNTS this whole subtree (IntakeApp's `phase === 'save'`
   *  branch returns before `Result` renders), so a ref seeded from the current view sees `saved` on
   *  BOTH sides of the remount and stays silent about the very save it mounted to announce. */
  readonly landed: boolean
  /** Acknowledge the event so it fires once (clear-after-announce, burned/045). */
  readonly onAnnounced: () => void
}

/** The remembered record's card + its re-open handler, composed by `Result` — which alone owns the
 *  invite predicate. `onReopen === undefined` ⇒ no control at all, never a dead one. */
export interface SavedRecordProp {
  readonly view: SavedRecordCardView
  readonly onReopen?: () => void
}

/** The refusal cards' copy, keyed BY THE UNION — so a fourth refusal reason is a compile error here
 *  (TS2741) rather than a promised affordance that renders nothing (insight 100's dead-arm shape).
 *  The reason is a bare string precisely so no developer text can reach this table. */
const REFUSAL_CARD: Readonly<
  Record<RecommendationSaveRefusal, { readonly heading: string; readonly body: string }>
> = {
  'record-invalid': {
    heading: copy.recommendSaveRefusalRecordInvalidHeading,
    body: copy.recommendSaveRefusalRecordInvalidBody,
  },
  write: {
    heading: copy.recommendSaveRefusalWriteHeading,
    body: copy.recommendSaveRefusalWriteBody,
  },
  'recovery-locked': {
    heading: copy.recommendSaveRefusalRecoveryLockedHeading,
    body: copy.recommendSaveRefusalRecoveryLockedBody,
  },
}

// Lazy-chunked (the U16 viz is below the grade lockup, and only the committed-active beat needs it) —
// behind a fixed-dimension box so the split-chunk load never reflows the lockup (CLS).
const RecommendationViz = lazy(() =>
  import('@viz/RecommendationViz').then((m) => ({ default: m.RecommendationViz })),
)

export function RecommendationSurface({
  solve,
  spineConfidence,
  pricedState,
  planClock,
  onRepick,
  recSave,
}: {
  readonly solve: SolveAnswer
  /** The household's plan clock, minted ONCE by Result (`planClockAnchor`) and threaded by reference —
   *  this layer reads no clock of its own. The winning-plan card's conversion start speaks the CALENDAR
   *  year off it, because `startYearOffset` is sim-year-0-indexed and offset 0 is the plan's BUILD year,
   *  which is "today" only in the year the plan was built. ⚠️ WITHOUT IT THE CARD DOES NOT RENDER — a
   *  dropped prop costs the whole card, never a wrong year. `RecommendationSurface.test.tsx` pins that
   *  Result actually passes it, so the degrade cannot become the shipped state by omission. */
  readonly planClock?: BandPlanClockAnchor
  /** The spine's rendered confidence object (Q1 source-bind) — threaded to the view model so the
   *  survival context is REUSED by reference, never a second authored survival claim. */
  readonly spineConfidence?: ConfidenceStatementView
  /** The PricedState THIS run priced (`pricedStateForRun`, threaded from Result) — drops the
   *  state-tax scope note, which claims the delta is federal-only and is FALSE for a priced
   *  household. Optional: an in-isolation surface (the unit tests) has no draft, and `undefined`
   *  keeps the shipped not-priced words. */
  readonly pricedState?: PricedState
  /** §S4 — the goal RE-PICK affordance: the committed beat's calm "aim at a different goal" door
   *  (the caller owns the GoalPicker + the dispatch; the un-saved hypothetical is freely re-aimable, a
   *  re-pick VISIBLY re-solves and both futures update). Optional — a surface mounted WITHOUT it (the
   *  P2/P3 shells; the in-isolation unit tests) renders no re-pick door, never a dead one. */
  readonly onRepick?: () => void
  /** U17 §S5 — the strategy save slot. Optional: a surface mounted WITHOUT it (the P2/P3 shells, the
   *  in-isolation unit tests) keeps U16's empty reservation, never a dead Save control. */
  readonly recSave?: RecommendationSaveProp
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
    // The builder-refusal steers land SYNCHRONOUSLY (idle → blocked, never through pending), so a
    // note section inserted already-populated is the burden/045 may-not-fire shape — speak each
    // steer through the persistent region (review wf_6f89fe6f-35a P2: a sighted user reads the calm
    // note; an AT user heard nothing after confirming a goal). goal-unset stays silent here (its
    // steer is the GoalPicker itself, which owns focus + announcement).
    if (solve.kind === 'blocked' && solve.gap !== 'goal-unset') {
      announcer.announce(solve.gap === 'no-pretax' ? copy.recommendNoPretaxNote : copy.recommendSpineUnreadyNote)
    }
  }, [solve, announcer])

  // All three opts are pass-through-optional (`exactOptionalPropertyTypes` is off, so an undefined
  // member reads identically to an absent one) — the object is always built, so adding a fourth can
  // never be silently dropped by a stale guard.
  const view = recommendationView(solve, { spineConfidence, pricedState, planClock })

  // §S5 (a) — the save gesture's START, through the SAME region the solve channel uses, for the same
  // reason: the slot swaps whole nodes per arm, so a `role='status'` that mounts already-populated
  // may never announce (burned/045). Mirrors Result.tsx's plan-rail announcer.
  //
  // ⚠️ "PERSISTENT" IS TRUE ONLY ON THE UPDATE ROUTE. On the CEREMONY route (R1's no-vault path)
  // IntakeApp's `phase === 'save'` branch returns before Result renders, so this whole subtree
  // unmounts and the region node is BRAND NEW on the remount — the landing announce then lands in
  // the same commit as the node's own insertion, which is precisely the burned/045 may-not-fire
  // shape this indirection exists to avoid. The flow is correct either way (the badge is disk-
  // derived and cannot lie); what is unproven is whether the first-save landing SPEAKS. That needs
  // a real AT check on the real ceremony route — jsdom cannot answer it. Filed for step 14; if it
  // does not fire, seed the region empty for one frame before consuming `landed` rather than
  // changing the flow.
  const saveKind = recSave?.view.kind
  const prevSaveKind = useRef(saveKind)
  useEffect(() => {
    const prev = prevSaveKind.current
    prevSaveKind.current = saveKind
    if (saveKind === prev) return
    if (saveKind === 'saving') announcer.announce(copy.recommendSavePending)
  }, [saveKind, announcer])

  // §S5 (b) — THE LANDING, announced off the DURABILITY EVENT and never off a view transition. The
  // ceremony route unmounts this whole subtree between the tap and the landing (IntakeApp's
  // `phase === 'save'` branch returns before Result renders), so `prevSaveKind` is re-seeded at
  // `saved` on the remount and a transition watcher stays silent exactly on the route that most needs
  // the announcement. The ref makes the event fire ONCE per episode even though `onAnnounced` is a
  // fresh closure each render (and across StrictMode's double-invoke); the badge itself keeps
  // rendering — it is derived from the DISK, not from this flag.
  const landed = recSave?.landed === true
  const onAnnounced = recSave?.onAnnounced
  const announcedLanding = useRef(false)
  useEffect(() => {
    if (!landed) {
      announcedLanding.current = false
      return
    }
    if (announcedLanding.current) return
    announcedLanding.current = true
    announcer.announce(copy.recommendSaveSavedBadge)
    onAnnounced?.()
  }, [landed, onAnnounced, announcer])

  // §S5 (c) — THE TICKET, composed where BOTH producers are in scope and NARROWED rather than cast.
  // `solve` is a `SolveAnswer` and `fingerprint` exists on its committed arm (and, since the 2026-09-03
  // edit-time kill, on the pending arm — but this seat reads the committed one only); `view` is a
  // `RecommendationView` and `mode` only on `RecommendedView` — both reads are TS2339 unwrapped, and a
  // cast here would compile, lint, and leave every trichotomy arm green while stamping a record with
  // the wrong run (model.ts:1813-1820 documents that exact shape). The two values are lifted into
  // CONSTS so the handler closes over already-narrowed data — parameter narrowing does not survive
  // into a closure.
  const ticket: RecommendationSaveTicket | undefined =
    solve.kind === 'committed' && view.kind === 'recommended'
      ? { fingerprint: solve.fingerprint, noDollarRegister: view.mode === 'no-change' }
      : undefined
  const fire = recSave?.onSave
  const onSave = fire !== undefined && ticket !== undefined ? () => fire(ticket) : undefined
  const refusal = recSave?.view.kind === 'refused' ? recSave.view.reason : undefined

  return (
    <div className="recommendation-surface">
      <div ref={announcer.ref} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      {solve.kind === 'pending' && (
        <section className="solve-pending-panel" aria-busy>
          <p className="solve-pending">{copy.recommendPendingLabel}</p>
        </section>
      )}
      <CommittedBeat view={view} onRepick={onRepick} save={recSave} onSave={onSave} />
      {/* THE ASIDE — the surface's OWN body, below the beat, gated on ITS OWN data and never on
          `view.kind` (the header's P0: every arm that matters is unreachable inside the beats).
          Omitted entirely when absent, so the refusal-free frame is byte-identical to today.

          THE REFUSAL LIVES HERE; THE RECORD CARD DOES NOT (Briggsy's ruling, 2026-07-26). A refusal
          is the rendered OUTCOME of a tap the household just made, so it belongs beside the control
          that made the promise (insight 100) — and it cannot appear on an idle frame at all, so it
          never competes for the fold. The remembered-record card is the opposite on both counts:
          durable, and present on the returning household's FIRST frame. MEASURED at 1536×791, it
          pushed the PROTECTED R13 disclaimer 67px (holds) to 161px (superseded) below the fold — the
          idle frame carries only 89px of headroom, so no honest version of it fits this seat. It now
          renders in `Result.tsx` BELOW `<Disclaimer inFrame/>`, joining the doors as a sanctioned
          below-fold casualty. Content was never trimmed; the placement moved. */}
      {refusal !== undefined && (
        <div className="rec-aside">
          {refusal !== undefined && (
            // role='alert' (the `.result-save-error` precedent), NOT the persistent region: an alert
            // announces on insertion BY DESIGN, and routing it through the announcer too would
            // double-speak it. The card is composed from `reason` ALONE — the mint's and the codec's
            // developer text never left IntakeApp's console (recommendationSaveView.ts's type-level
            // leak proof), so there is nothing here that could interpolate it.
            <section className="rec-note rec-note--refused" role="alert">
              <h3 className="rec-note__head">{REFUSAL_CARD[refusal].heading}</h3>
              <p className="rec-note__line">{REFUSAL_CARD[refusal].body}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * THE REMEMBERED RECORD'S CARD — minimal by ruling (R3): that a saved read exists, its age, whether
 * it still holds, and the re-open CTA naming its cost. It quotes NO remembered grade or verdict enum.
 *
 * THE STANDING LINE IS THE NON-COLOUR SIGNAL, AND IT CARRIES ITS OWN TEXT. The `superseded` arm's
 * cause clauses may legitimately be EMPTY (recommendationSaveView.ts:237-242 — the fail-closed output
 * of the broken-contract split), so a card that were nothing but a heading over `clauses.map(...)`
 * would draw a blank exactly where the disclosure belongs. The lead sentence renders on BOTH arms —
 * the holds arm's own clause, or `recommendRecordSuperseded` — with a decorative shape mark beside
 * it: the meaning is reachable as TEXT in the a11y tree, the shape is redundant reinforcement, and
 * colour is never even the third channel.
 *
 * EVERY cause clause renders, in the producer's declaration order (insight 101) — a card naming one
 * cause when two hold describes its poster child, not the truth.
 */
export function SavedRecordCard({ card }: { readonly card: SavedRecordProp }) {
  const { standing } = card.view
  // NO `role="status"` on the section below. This card is DURABLE DISK STATE sitting in normal
  // reading order, not a transient status update, and an implicit polite live region over disk state
  // misfires twice: (a) its content changes whenever the standing flips holds→superseded on an
  // ordinary draft edit, so a routine edit re-announces the entire card; (b) on the first-save frame
  // it would double-speak with the landing announcement, which the region already owns. The heading
  // names it, and it is reachable in the a11y tree by being real text in the document. `role="alert"`
  // STAYS on the refusal card — that one IS transient and IS the rendered outcome of a gesture.
  return (
    <section className="rec-note rec-record">
      <h3 className="rec-note__head">{card.view.heading}</h3>
      <p className="rec-record__standing" data-standing={standing.kind}>
        <span className="rec-record__mark" aria-hidden="true" />
        {standing.kind === 'holds' ? standing.clauses[0] : copy.recommendRecordSuperseded}
      </p>
      {standing.kind === 'superseded' && standing.clauses.length > 0 && (
        <ul className="rec-record__causes">
          {standing.clauses.map((clause, i) => (
            <li key={i} className="rec-note__line">
              {clause}
            </li>
          ))}
        </ul>
      )}
      {/* The age, suppressed rather than fabricated for a record minted this calendar year. */}
      {card.view.savedIn !== undefined && <p className="rec-note__line">{card.view.savedIn}</p>}
      {/* The re-open control and the cost line are ONE unit, rendered IFF the caller wired the
          handler (the shipped no-dead-door law): a control that hides a multi-minute re-solve is an
          invitation the household cannot price, and a cost line beside no control is a dead promise. */}
      {card.onReopen !== undefined && (
        <div className="rec-record__reopen">
          <button type="button" className="btn-quiet rec-note__reopen" onClick={card.onReopen}>
            {card.view.reopen.label}
          </button>
          <p className="rec-record__cost">{card.view.reopen.costLine}</p>
        </div>
      )}
    </section>
  )
}

/** Route the resolved view to its render. `idle` / `blocked` / `pending` carry no committed body here —
 *  the entry affordance (Result's doors region) owns the invite + the goal steer; pending is drawn
 *  above. Every COMMITTED shape gets a render (a shape without one is a broken state). */
function CommittedBeat({
  view,
  onRepick,
  save,
  onSave,
}: {
  readonly view: RecommendationView
  readonly onRepick?: () => void
  /** Threaded to `RecommendedBeat` only — the slot's five arms are the crowned winner's. */
  readonly save?: RecommendationSaveProp
  /** The narrowed tap (undefined ⇒ nothing mintable ⇒ no control). */
  readonly onSave?: () => void
}) {
  switch (view.kind) {
    case 'idle':
    case 'pending':
      return null
    case 'blocked':
      // goal-unset: the invite door (Result's quiet row) owns the steer → no body here. The two
      // builder-refusal gaps (the steer-seed increment's TYPED reasons) each render their OWN calm
      // named-reason note — NO invite fires on them (the gap is never the goal — §Q5/F2), so the note
      // is the ONLY steer, and each note tells ITS arm's true story (the old one-note-for-every-arm
      // told a false accounts story on a facts-broken re-dispatch). Never a silent null dead-end
      // where a goal was picked but nothing renders (the blank-render mutant reds on both arms).
      switch (view.gap) {
        case 'goal-unset':
          return null
        case 'no-pretax':
          return (
            <section className="rec-note rec-note--no-pretax" role="status">
              <p className="rec-note__line">{copy.recommendNoPretaxNote}</p>
            </section>
          )
        case 'spine-unready':
          return (
            <section className="rec-note rec-note--spine-unready" role="status">
              <p className="rec-note__line">{copy.recommendSpineUnreadyNote}</p>
            </section>
          )
        default: {
          const _exhaustive: never = view.gap
          throw new Error(`[RecommendationSurface] unhandled precondition gap — declare its steer (${String(_exhaustive)})`)
        }
      }
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
      return <RecommendedBeat view={view} onRepick={onRepick} save={save} onSave={onSave} />
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
function RecommendedBeat({
  view,
  onRepick,
  save,
  onSave,
}: {
  readonly view: RecommendedView
  readonly onRepick?: () => void
  readonly save?: RecommendationSaveProp
  readonly onSave?: () => void
}) {
  const g = view.grade
  const actionHeadingId = useId()
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
        {/* The hero's MEDIAN qualification (the median-advantage increment) — INSIDE the lockup so it
            crossfades with the hero it qualifies (a fresh hero never sits beside a stale qualifier). */}
        {g.deltaQualifier !== undefined && <p className="rec-grade__note">{g.deltaQualifier}</p>}
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

        {/* THE WINNING-PLAN CARD — the answer to the question the hero's dollar provokes: "by doing
            what?" Seated directly under the nameplate so the reader learns the comparison frame and
            then what the recommended side actually IS. Present iff the view model built it (ACTIVE
            register + a plan clock); every string arrives resolved — this renderer decides nothing.
            A DEFINITION LIST because the content genuinely is a pair of named controls with their
            settings, which is also what keeps the card from reading as an instruction to ADD the
            conversion to the one the household already runs (the winner's conversion REPLACES theirs). */}
        {view.winnerAction !== undefined && (
          <div className="rec-action">
            {/* A real HEADING, not a styled <p>: it titles a block inside the beat, which is exactly
                what `.rec-conv-hold__head` (h4) does one sibling down and what `ReEntry`'s h3 does above
                its own <dl>. A <p> left the card unreachable from a screen reader's heading list. */}
            <h4 className="rec-action__heading" id={actionHeadingId}>
              {copy.recommendActionHeading}
            </h4>
            <dl className="rec-action__list" aria-labelledby={actionHeadingId}>
              <dt className="rec-action__term">{copy.recommendActionOrderLabel}</dt>
              {/* The explicit {' '} is load-bearing, not formatting: `display:block` on the gloss makes
                  the LINE break visually, but the two text nodes stay adjacent in the accessibility tree
                  and in copied text ("Low-tax room firstPulls from pre-tax only…"). */}
              <dd className="rec-action__value">
                {view.winnerAction.orderLabel}{' '}
                <span className="rec-action__gloss">{view.winnerAction.orderGloss}</span>
              </dd>
              {view.winnerAction.conversionLine !== undefined && (
                <>
                  <dt className="rec-action__term">{copy.recommendActionConversionLabel}</dt>
                  <dd className="rec-action__value">
                    {view.winnerAction.conversionLine}
                    {view.winnerAction.conversionNote !== undefined && (
                      <>
                        {' '}
                        <span className="rec-action__gloss">{view.winnerAction.conversionNote}</span>
                      </>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}

        {/* Q6 — the leave-more skew median quote (present iff disclosure-worthy). */}
        {view.skew !== undefined && <p className="rec-skew">{view.skew.medianQuote}</p>}

        {/* The disclosures adjacent to the delta (R7 nets) — read-only NOTES; no editing affordance ships
            HERE. The heir-bracket seat's editor lives in the AssumptionPanel (shipped 2026-08-14), which
            is why its note may once again say "adjust it in your assumptions": the clause names a control
            that now exists. It is NOT coming inline — insight 058's one-editor-home rule plus Result.tsx's
            measured 67–161px breach put it in the panel deliberately. */}
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

        {/* U17 §S5 — the save slot, filling U16's reservation. The box is the SAME in every arm (the
            reservation is what kills the CLS relayout: a tap must never slide the disclaimer + the
            quiet doors below up into the pointer). A surface mounted WITHOUT the prop — the P2/P3
            shells, the in-isolation unit tests — keeps the verbatim empty reservation. */}
        {save === undefined ? (
          <div className="rec-save-slot" aria-hidden="true" />
        ) : (
          <SaveSlot view={save.view} onSave={onSave} />
        )}
      </div>
    </section>
  )
}

/**
 * The five save arms in ONE reserved box.
 *
 * KEYED ON THE VIEW, NEVER ON THE PROP'S PRESENCE. `readOnly` and an unencodable answer BOTH derive
 * `{kind:'none'}` while this beat still renders, and IntakeApp always passes a view — so "is the prop
 * there?" is not the question. `none` and `refused` render the VERBATIM empty reservation: `none`
 * makes no claim about a disk state it cannot compare, and `refused` has already spoken, in the
 * aside, where the card is free to exceed this box's height.
 *
 * `aria-hidden` survives ONLY on the empty arms. Leaving it on a populated one would ship an
 * AT-invisible Save button that still passes a "the reservation is hidden" test.
 */
function SaveSlot({
  view,
  onSave,
}: {
  readonly view: RecommendationSaveView
  readonly onSave?: () => void
}) {
  switch (view.kind) {
    case 'none':
    case 'refused':
      return <div className="rec-save-slot" aria-hidden="true" />
    case 'offer':
      // No handler ⇒ no control (the shipped dead-button law). Unreachable in practice — this beat
      // renders only for a committed `recommended` payload, which is exactly when the ticket mints —
      // but the alternative is a button whose tap does nothing.
      return onSave === undefined ? (
        <div className="rec-save-slot" aria-hidden="true" />
      ) : (
        <div className="rec-save-slot">
          <button type="button" className="btn-quiet rec-save__cta" onClick={onSave}>
            {copy.recommendSaveCta}
          </button>
          {/* R2 — the disclosure lands BEFORE the tap, and `route` picks WHICH truth: the no-vault
              tap escalates into the ceremony (two passphrases + a backup copy), and either way the
              write is the whole plan. A confirmation explaining what already happened is too late. */}
          <p className="rec-save__hint">
            {view.route === 'ceremony' ? copy.recommendSaveHintCeremony : copy.recommendSaveHintUpdate}
          </p>
        </div>
      )
    case 'saving':
      // Announced by the persistent region above (a status inserted already-populated may not fire,
      // burned/045) — this node is the VISIBLE pending line only.
      return (
        <div className="rec-save-slot">
          <p className="rec-save__pending">{copy.recommendSavePending}</p>
        </div>
      )
    case 'saved':
      // The ONE arm permitted to claim a completed save, and it is derived from the DISK. The mark is
      // decorative — the badge TEXT carries the state into the a11y tree (the `.result-saved__mark`
      // precedent), so colour is never the signal.
      return (
        <div className="rec-save-slot">
          <p className="rec-save__badge">
            <span className="rec-save__mark" aria-hidden="true" />
            {copy.recommendSaveSavedBadge}
          </p>
        </div>
      )
    default: {
      // A future save arm fails tsc HERE rather than rendering an empty exposed box where a claim
      // belongs (the shipped exhaustiveness idiom).
      const _exhaustive: never = view
      throw new Error(`[RecommendationSurface] unhandled save arm — declare its render (${String(_exhaustive)})`)
    }
  }
}
