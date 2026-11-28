import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { budgetGoverns } from '@budget/budgetModel'
import { isDateRoute } from '@intake/intakeMap'
import { periodGateTrips } from '@intake/sanity'
import { subscribeUnsavedBuffers, unsavedBuffersHeld } from '@intake/unsavedBuffer'
import { isWorkingYearCostStale } from '@intake/workingYearQuote'
import { withKeptWhatIfs } from '@intake/whatIf'
import { canonicalIdentityToken } from '@shared/model'
import { idsInUse } from '@shared/stableIds'
import {
  workingYearCostStaleDoor,
  workingYearCostStaleLine,
  workingYearCostTypedBelowComposed,
  workingYearCostTypedBelowDoor,
  workingYearLeftOverMoved,
  workingYearLeftOverMovedClause,
  workingYearLeftOverMovedText,
} from '@intake/workingYearLeftOver'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import { draftIdentityKey, type ScenarioDraft } from '@store/memoryModel'
import { deriveSavedRecommendationStatus, type SavedRecommendationStatus } from '@store/savedRecommendation'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import { CURRENT_SCHEMA_VERSION, type SavedRecommendationV3 } from '@shared/model'
import { appModel } from './appModel'
import { scenarioFromDraft, currentEpochDay } from './scenarioFromDraft'
import { draftFromScenario } from './draftFromScenario'
import { deriveRecommendationSave, type RecommendationSaveRefusal } from './recommendationSaveView'
import {
  agedBalancesYearFor,
  deriveResultSave,
  persistSeedFor,
  type PersistState,
  type ResultSaveView,
  unsavedWorkPending,
} from './resultSave'
import type { ResultSaveProp } from './saveAnnouncer'
import { ShellSlot } from './shell/ShellSlot'
import { Stepper } from './screens/setup/Stepper'
import type { KeptEdit, KeptWriteOutcome } from './screens/retirement/planListView'
import { LANDING, parseHash, routeEquals, routeHash, type Route } from './shell/routes'
import { describeSaveFailure } from './unlockCopy'
import { useUnloadGuard } from './unloadGuard'
import { Button, FieldNote, VaultCard, VaultHeading, VaultPage, VaultPending } from './kit'
import { ReEntry } from './ReEntry'
import { composeReentry, type ReentryView } from './reentryChrome'
import { deriveStaleness } from '@store/staleness'
import { exposureForDraft } from './stalenessExposure'
import { copy } from './copy'
import { DEFAULT_DISPLAY, type DisplaySettings } from './displaySettings'

// The ceremony rides its own lazy chunk (it pulls the crypto/zxcvbn graph) — kept off the
// already-lazy intake chunk's first paint; the Save beat only ever appears on the result screen.
const SaveFlow = lazy(() => import('./SaveFlow').then((m) => ({ default: m.SaveFlow })))
// The re-offer backup step (U8-tail) rides its own lazy chunk too (it pulls the export/crypto
// graph via ExportConfirm); it only mounts from the result's backup door.
const BackupStep = lazy(() => import('./BackupStep').then((m) => ({ default: m.BackupStep })))

/** The shell's history entries (Act 6 · RC2; KTD31's history, one entry per page): a bare marker and the entry's place
 *  in this visit to the shell (`n`, 1 for the first page), so the wordmark goes straight back to the answer. The
 *  address's hash names the page (`#/retirement/cash-flows`, `src/ui/shell/routes.ts`). No plan data rides in either. */
interface WorkspaceEntry {
  readonly b9: 'workspace'
  readonly n: number
}
const isWorkspaceEntry = (state: unknown): state is WorkspaceEntry =>
  typeof state === 'object' &&
  state !== null &&
  (state as { readonly b9?: unknown }).b9 === 'workspace' &&
  typeof (state as { readonly n?: unknown }).n === 'number'
/** The address with no page in it: the answer's own (the dev `?seed=` and `?vault=` shortcuts ride the query). */
const plainUrl = (): string => window.location.pathname + window.location.search

/**
 * U17 §S5 — WHAT THE TAP CARRIES, and why it is two values and not zero.
 *
 * The gesture cannot read either of these for itself. `fingerprint` is the identity of the
 * COMMITTED run the household is looking at, read off `SolveAnswer` at the surface that renders
 * it — this component re-reads the store after its own awaits and REFUSES on a mismatch, which is
 * only a check if the tap says which run it meant. `noDollarRegister` is the COMPOSED view's own
 * `mode === 'no-change'` register: two of its three disjuncts read seed-B headline dollars the
 * record deliberately does not carry, so re-deriving it here would silently re-tell a run whose
 * live surface refused to claim any switch AS an active switch (`savedRecommendationMint.ts`'s
 * @param note). Both are COPIED from the producer on screen — never re-derived (insight 081).
 */
export interface RecommendationSaveTicket {
  readonly fingerprint: SolverRunFingerprint
  readonly noDollarRegister: boolean
}

/**
 * The intake subtree — the LAZY half of the App split (default export for
 * React.lazy). Everything heavy rides this chunk: the intake components, the
 * param builders, and their engine dependencies (the 161-family ticker table,
 * the constants tables) — keeping the ENTRY chunk (shell + cold start)
 * small. The chunk is precached (PWA) and
 * warmed during the cold-start read, so Begin never visibly waits.
 *
 * `appModel` (the ONE memoryModel) is created at THIS module's evaluation —
 * still module-level, still outside any render path, still StrictMode-proof
 * (contract #1a); it simply lives in the lazy chunk because its builders do.
 *
 * THE PHASES. `intake` is the first-run stepper (Act 6 · RC14, in place of the
 * walk and its provisional answer strip: setup shows no answer). Its Complete
 * runs the reveal (provisional, then final) and lands on the home, the
 * `workspace` phase (RC4). Settings' re-walk and the re-entry gate's update
 * return to the stepper with every answer preserved (the draft lives in
 * `appModel`; nothing is persisted until Save); it opens at its first step.
 */
export default function IntakeApp({
  seed,
  hydrateFromVault = false,
  readOnly = false,
  onCancelNewPlan,
}: {
  seed?: string | null
  /** Decrypt-on-return: after a successful unlock, hydrate the result from the session's decrypted
   *  model instead of starting a fresh intake. App sets this on the post-unlock mount. */
  hydrateFromVault?: boolean
  /** The unlock opened READ-ONLY (a 2nd tab holds the writer — Fork C ii). App's standing View-only
   *  banner is the disclosure; the result surface must derive NO save CTA (a save can't land in this
   *  tab — session.save would refuse), so this is threaded into deriveResultSave. */
  readOnly?: boolean
  /** Act 6 · RC14: "Start a new plan" dismissed before it began (its names drawer's Cancel): back to the cold start. */
  onCancelNewPlan?: () => void
}) {
  // Act 6 · RC4 — the shell is the home: setup's end, a reopened vault and every dev seed land in the
  // `workspace` phase on Snapshot. The old answer page's `result` phase is gone; the save and backup
  // ceremonies return to the shell.
  const [phase, setPhase] = useState<'restoring' | 'reentry' | 'intake' | 'workspace' | 'save' | 'restore-failed' | 'backup'>(
    hydrateFromVault ? 'restoring' : 'intake',
  )
  // Act 6 · RC2 — a leave held over work it would drop (a Back press can't be cancelled, so the shell's
  // entry went back on and the shell asks first; the wordmark and the re-walk ask before they go). `lines`
  // say what the leave drops; `go` is how the household's "Go back" leaves: one entry back, home to the
  // first page, or out to the walk-through.
  const [leaveAsk, setLeaveAsk] = useState<{
    readonly lines: readonly string[]
    readonly go: 'back' | 'home' | 'review' | 'save' | 'backup'
    readonly goLabel?: string
  } | null>(null)
  // The ask as last rendered, for the leaves that replace or clear it (`dropSaveAsk`).
  const leaveAskRef = useRef(leaveAsk)
  leaveAskRef.current = leaveAsk
  // Act 6 · RC5 — a kept what-if Keep sent through the save ceremony (no vault yet): the shell reopens it on the left
  // when it mounts again, so the what-if the household kept is the one on screen after the ceremony.
  const [resumeKept, setResumeKept] = useState<string | undefined>(undefined)
  // The shell's page (KTD31: route state lives here, in the app that stays mounted), mirrored to the hash.
  const [route, setRoute] = useState<Route>(LANDING)
  // Whether the shell's what-if holds a change the plan doesn't: unkept work a leave or a reload would drop.
  const [whatIfHeld, setWhatIfHeldState] = useState(false)
  // P3·U13 — the re-entry gate's composed state, set ONCE by the hydrate effect from the
  // RAW-decoded model (council constraint (a): staleness reads the vault's own stamps,
  // never the draft a later re-save would have re-stamped). `rulesMoved` outlives the gate —
  // it feeds the hero's standing staleness note for the whole session. RULES-moved, never
  // `anyStale` (ultramode 2026-07-09): a lapsed budget window is a calendar prompt on a
  // byte-identical recompute — "Some rules changed" there is a false claim on the hero.
  // Build 2: the view also carries the left-over clause host (`leftOverClauseHost`), which the Result's hero
  // rules note reads for the whole session the same way.
  const [reentry, setReentry] = useState<{ view: ReentryView; rulesMoved: boolean } | null>(null)
  // The re-offer backup door's gate (U8-tail): set true only on a decrypt-on-return WHERE the
  // session is writable AND no backup-note is on record — a returning household whose off-device
  // copy was never made here. Never set on a fresh/seed intake (no vault to lack a backup), never
  // set read-only (the standing view-only banner is disclosure enough; one door is v1 scope). The
  // door dissolves when the ceremony records the note: cleared on the in-session finish, and never
  // re-armed on the next return (hasBackupRecord reads true then).
  const [needsBackup, setNeedsBackup] = useState(false)
  // What is on disk (the edit-and-re-save machine, resultSave.ts). Starts 'unsaved' even on a
  // hydrate mount — the hydrate effect installs the decoded model's normalized scenario, and
  // until then the phase is 'restoring' so no save UI renders from the placeholder state.
  const [persist, setPersist] = useState<PersistState>({ kind: 'unsaved' })
  // DEV-seed provenance for the spend-period disarm: flips ONLY after a seed draft actually
  // APPLIES — `resolveDevSeed` returns null for a bogus `?seed=` key, and that mount is a
  // genuinely-fresh intake that must keep the R19 force-confirm armed (ultramode 2026-07-03).
  // A state flag, not a render-time resolveDevSeed(seed) call: devSeeds must stay behind the
  // dynamic import so it remains dead-code-eliminated from prod.
  const [devSeedApplied, setDevSeedApplied] = useState(false)
  // THE COMPLETED-INTAKE PERIOD PROVENANCE (the council-ratified NARROW disarm, F10 carry-in
  // 2026-07-08 — explicitly NOT a lift of the flow's touched state). `touched` is
  // the stepper's own (the walk's IntakeFlow's until RC14) and it UNMOUNTS on Complete, so a re-walk remount
  // starts it empty — an explicit period answer given THIS session cannot survive as a touched
  // entry (the same channel gap sanity.ts's SanityProvenance documents for the vault
  // round-trip), and the force-confirm was re-firing on every post-completion spend-step
  // advance: a false nag against a household that already answered. THE PROOF (mirroring
  // SanityProvenance's reasoning): the flow gates the spend step's OWN advance on this rule,
  // and completion means every step was advanced through. So IF the draft at the terminal
  // advance would STILL trip the spend-period gate under an EMPTY touched set and NO
  // provenance, the only way the spend step was passed is that the period was EXPLICITLY
  // answered this session (touched 'spendEntryPeriod' — the tap) or provenance already carried
  // it — completion is the downstream receipt of that answer. A completion whose draft does
  // NOT trip the gate proves nothing and must NOT disarm: a Review that first enters an
  // ambiguous figure is a genuinely fresh first answer, and the R19 12×-silent-misentry
  // defense stays armed for it (a bare completed-once flag would leak the disarm to exactly
  // that household). Mount-lifetime like devSeedApplied; never persisted (the vault round-trip
  // carries its own provenance via hydrateFromVault).
  const [periodAnswerProven, setPeriodAnswerProven] = useState(false)
  // Act 6 · RC14: a brand-new plan (no vault, no dev seed) opens the stepper on "Start a new plan"'s names, once; its
  // Complete (and any later re-walk) never asks them again.
  const [newPlan, setNewPlan] = useState(() => !hydrateFromVault && seed == null)
  // Act 6 · RC18: the Display drawer's two choices, for the session (`displaySessionNote`: they last until B9 closes).
  // Held here, beside the other session state, because the shell unmounts across a first save, a Keep's ceremony and a
  // backup; held in the shell they reset on every one of those. Never saved (no saved shape in this act).
  const [display, setDisplay] = useState<DisplaySettings>(DEFAULT_DISPLAY)

  // ── U17 §S5 — THE RECOMMENDATION SAVE GESTURE'S OWN STATE ──────────────────────────────────
  // Five values, none of which the plan rail's machine can carry: `resultSave.ts` describes the
  // PLAN's relationship to disk, and the strategy slot makes a narrower claim about ONE atom
  // riding that plan (`recommendationSaveView.ts`).
  //
  // THIS gesture's write is in flight — deliberately NOT `persist.kind === 'saving'`. The plan
  // rail's own re-save sets that too, and the recommendation's pending line must speak only for
  // the tap that asked for it (`deriveRecommendationSave` ranks `inFlight` ABOVE its saved arm
  // because during an update the disk still holds the PREVIOUS commit — "saved" there would be a
  // claim about the wrong record).
  const [recSaveInFlight, setRecSaveInFlight] = useState(false)
  // THE STANDING REFUSAL, PAIRED WITH THE DRAFT IT WAS MINTED AGAINST — so "a refusal clears on a
  // draft change" is COMPUTED, never raced. The obvious shape (a bare union cleared by an effect
  // keyed on `snapshot.draft`) LOSES A REAL REFUSAL: the write arm mutates the draft (it puts the
  // record on it) and only learns the write failed several awaits later, so the draft-change
  // effect and the `'write'` set land in an order React does not order for us — flush the effect
  // last and it erases the rendered outcome of a write that genuinely failed (insight 100). Keying
  // the refusal to its own draft makes a superseded entry UNRENDERABLE instead of racing to delete
  // it, which is `resultSave.ts`'s law applied here: the honest states are DERIVED from an
  // operand, never tracked in a flag somebody has to remember to clear at the right instant. The
  // `reason` stays the bare string union — the developer text (the mint's failing field path, the
  // codec's dropped atom) goes to the `console` and never enters React state that a surface could
  // interpolate (`recommendationSaveView.ts`'s type-level leak proof).
  const [recSaveRefusal, setRecSaveRefusal] = useState<{
    readonly reason: RecommendationSaveRefusal
    readonly draft: ScenarioDraft
  } | null>(null)
  // THIS gesture opened the firstSave ceremony (R1: the no-vault tap MINTS and routes into the
  // ceremony rather than going dead — that path is every dev seed, the Caddie walk and the fit
  // gate). It disambiguates the ceremony's TWO entrances: the plan rail's own "Keep this plan"
  // minted no record, so its cancel must restore nothing and its completion must announce no
  // saved recommendation.
  const [recSaveCeremony, setRecSaveCeremonyState] = useState(false)
  // The flag as just set, for a handler that runs before the re-render (the ask's Stay, a cancel).
  const recSaveCeremonyRef = useRef(false)
  const setRecSaveCeremony = useCallback((on: boolean) => {
    recSaveCeremonyRef.current = on
    setRecSaveCeremonyState(on)
  }, [])
  // THE DURABILITY EVENT — "a write carrying this record reached disk" — carried as a flag the
  // surface consumes and acknowledges, NOT as a view transition. The ceremony route unmounts this
  // whole subtree (the `phase === 'save'` branch returns before Result renders), so a consumer
  // comparing its previous view to its current one sees `saved` on BOTH sides of the remount and
  // stays silent about the very save it was mounted to announce.
  const [recSaveLanded, setRecSaveLanded] = useState(false)
  // The record the draft carried BEFORE this gesture minted over it (undefined = none). A REF, not
  // state: nothing renders it, and the ceremony's cancel must read the value captured at the TAP.
  const recSavePrevRecord = useRef<SavedRecommendationV3 | undefined>(undefined)
  // THE POST-AWAIT PERSIST AUTHORITY. `saveRecommendation` reads `persist.kind` twice: once at its
  // entry guard, and again several awaits later to choose the ceremony vs update route. The second
  // read must NOT come from the closure. The plan rail's own save control is on screen at the same
  // time, so `unsaved → saving → saved` can complete inside this gesture's DB-open window; a stale
  // `'unsaved'` would then route an existing vault into the firstSave ceremony — the "not-locked"
  // lying dead-end recorded when U8 closed. A ref re-read at the branch cannot go stale.
  const persistRef = useRef<PersistState>(persist)
  persistRef.current = persist

  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  // The Save beat appears only when the draft is genuinely persistable (an indeterminate answer
  // can reach the result screen — the gate, not the screen, decides saveability).
  const saveReady = useMemo(() => scenarioFromDraft(snapshot.draft), [snapshot.draft])
  // THE UNSAVED-WORK GUARD (2026-09-03 — the 2026-08-20 walk's "couple's own data" finding, the
  // honest half). Nothing persists until Save (the D1 law, docs/plans/2-first-answer.md:145), so a
  // tab close / refresh mid-intake silently discarded every typed step. This WARNS through the
  // browser's own beforeunload dialog (ui/unloadGuard.ts — which also HOLDS the PWA update-apply
  // gate for the same window, so "Refresh now" refuses instead of racing the dialog) and writes
  // nothing. It arms on "would a reload lose typed work?", read from TWO derived operands and never
  // a touched set (the walk's `touched`, the stepper's session flag since RC14, is a VALIDATION set marked on every attempt-to-advance
  // and it dies on the flip to 'result', where the biggest loss window — a complete, never-saved
  // household — lives):
  //  · the DRAFT — resultSave.ts `unsavedWorkPending`, disk-derived: with no vault, "has the draft
  //    moved from its mount baseline"; with one, the dirty badge's own compare against the LAST
  //    COMMITTED model (so dialog and badge can never disagree);
  //  · the OPEN ENTRY BUFFERS — intake/unsavedBuffer.ts: the atomic forms (an account, an income
  //    stream, the staged budget, the typed Roth plan) hold a whole answer in component state until
  //    an explicit commit, invisible to the draft compare — over a saved-and-clean vault that is the
  //    returning household's entire session, and the unit review found an eight-field account
  //    reloading away silently there. Each form holds while its state differs from its seed.
  // No phase gate: both operands are false on their own in every draft-free phase and true exactly
  // where typed work is at risk, including SaveFlow's pre-commit steps; the draft operand disarms
  // the instant the ceremony COMMITS (SaveFlow's `onCommitted`, below), after which SaveFlow's
  // export-step guard is the single owner of the post-commit window. The baseline is the draft at
  // mount — re-pointed at a DEV `?seed=` install (it applies in a post-mount effect; without the
  // re-point every seed route, i.e. the Caddie walk and `pnpm verify:fit`, would arm on landing). A
  // hydrated vault needs no baseline write: persist flips to 'saved' and the compare goes disk-side.
  // Chromium shows the dialog only after sticky user activation — a programmatic-only draft never
  // sees one (not a bug). The healthcare.gov link opens a new tab (the kit's OutLink, target="_blank").
  // ACCEPTED RESIDUALS, both bounded to ONE field: (a) text fields commit on blur (fields.tsx), so
  // a single un-blurred field's in-progress text is in neither operand; (b) the listener registers
  // in a passive effect one scheduler task after the commit that first arms it, so the reload-button
  // click that blurs the very FIRST committed field of a session can beat the registration. Any
  // second field means the first is in the draft and the guard is up.
  const baselineRef = useRef<ScenarioDraft>(snapshot.draft)
  const draftKey = useMemo(() => draftIdentityKey(snapshot.draft), [snapshot.draft])
  const buffersHeld = useSyncExternalStore(subscribeUnsavedBuffers, unsavedBuffersHeld)
  const guarding =
    unsavedWorkPending(persist, saveReady, draftKey !== draftIdentityKey(baselineRef.current)) ||
    buffersHeld > 0 ||
    // Act 6 · RC2: the shell's unkept what-if (never plan data, so neither operand above sees it).
    whatIfHeld
  useUnloadGuard(guarding)

  // ── Act 6 · RC2/RC4 — THE SHELL'S HISTORY (KTD31; plan 6, section 3.1 "Routing") ──────────────────────
  // The shell is a phase of this app, never an App route (a route would unmount this subtree and with it
  // the draft's save state, the unsaved mark and the leave guard). No router library: the page is state
  // here, mirrored to the address's hash, one history entry per page (`WorkspaceEntry`), so Back and
  // Forward move between pages and this listener restores the page. Since RC4 the shell is the HOME:
  // landing REPLACES the document's own entry with the first page's (`n: 1`), so there is no answer page
  // beneath it, and a Back press from the first page leaves the app the way any page does (the browser's
  // leave dialog stands over unsaved work and an unkept what-if, `useUnloadGuard`).
  // The listener is mounted once, so it reads the live values through refs.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const routeRef = useRef(route)
  routeRef.current = route
  // The shown page's entry's place in this visit (`WorkspaceEntry.n`).
  const depthRef = useRef(0)
  const whatIfHeldRef = useRef(false)
  const onWhatIfHeld = useCallback((held: boolean) => {
    whatIfHeldRef.current = held
    setWhatIfHeldState(held)
  }, [])
  // Set by the ask's "Go back" (or the wordmark) so the move it sends passes the check that raised the ask.
  const leavingRef = useRef<'back' | 'home' | null>(null)
  // What a leave would drop, one sentence each: an open entry (the buffers the leave guard reads, insight
  // 112: an open drawer's edit), and, where the leave goes past the shell, an unkept what-if.
  const leaveLines = useCallback(
    (pastTheShell: boolean): readonly string[] => [
      ...(unsavedBuffersHeld() > 0 ? [copy.workbenchLeaveAsk] : []),
      ...(pastTheShell && whatIfHeldRef.current ? [copy.shellLeaveWhatIf] : []),
    ],
    [],
  )
  /** Land on the home: the document's own entry becomes the first page's (no answer page beneath it). */
  const enterWorkspace = useCallback(() => {
    depthRef.current = 1
    window.history.replaceState({ b9: 'workspace', n: 1 } satisfies WorkspaceEntry, '', plainUrl() + routeHash(LANDING))
    routeRef.current = LANDING
    setRoute(LANDING)
    setLeaveAsk(null)
    setPhase('workspace')
  }, [])
  /** A page of the shell: one new history entry, its hash the page's. */
  const navigate = useCallback((to: Route) => {
    if (routeEquals(to, routeRef.current)) return
    const n = depthRef.current + 1
    depthRef.current = n
    window.history.pushState({ b9: 'workspace', n } satisfies WorkspaceEntry, '', plainUrl() + routeHash(to))
    routeRef.current = to
    setRoute(to)
  }, [])
  /** Straight back to the home: every later page entry of this visit at once (the first entry is the home). */
  const leaveHome = useCallback(() => {
    const back = depthRef.current - 1
    if (back <= 0) {
      if (!routeEquals(routeRef.current, LANDING)) navigate(LANDING)
      return
    }
    leavingRef.current = 'home'
    window.history.go(-back)
  }, [navigate])
  /** Out to the walk-through (the assumption panel's guided re-walk): the shell unmounts, so its open entries and
   *  the what-if go with it. The address drops its page; the walk's terminal advance lands on the home again. */
  const leaveForReview = useCallback(() => {
    setLeaveAsk(null)
    window.history.replaceState(null, '', plainUrl())
    depthRef.current = 0
    setPhase('intake')
  }, [])
  /** The ceremony's cancel (and its ask's Stay) puts back the record the recommendation's gesture minted for it. */
  const restoreRecMint = useCallback(() => {
    if (!recSaveCeremonyRef.current) return
    const prev = recSavePrevRecord.current
    recSavePrevRecord.current = undefined
    recSaveCeremonyRef.current = false
    setRecSaveCeremony(false)
    appModel.update((d) => {
      if (prev !== undefined) return { ...d, savedRecommendation: prev }
      const { savedRecommendation: _minted, ...withoutRecord } = d
      return withoutRecord
    })
  }, [])
  /** A Back, a Forward, the wordmark or the re-walk over a save ask (`go: 'save'`) leaves it unanswered, as its Stay
   *  does: the ask goes, and the record the recommendation's keep minted comes back off the draft (nothing saved it, and
   *  no later save may carry it unnamed, R2; `restoreRecMint` is a no-op over the lock menu's own save, which minted
   *  nothing). The ask goes here, not only where the move lands: the wordmark on the home moves nowhere, and an ask
   *  left standing would run the save steps with no record. A caller's own ask, set after this, stands. */
  const dropSaveAsk = useCallback(() => {
    if (leaveAskRef.current?.go !== 'save') return
    restoreRecMint()
    leaveAskRef.current = null
    setLeaveAsk(null)
  }, [restoreRecMint])
  /** The wordmark: home to Snapshot, asking first over an open drawer's edit (the what-if survives a page move). */
  const goHome = useCallback(() => {
    dropSaveAsk()
    const lines = leaveLines(false)
    if (lines.length > 0) {
      setLeaveAsk({ lines, go: 'home' })
      return
    }
    leaveHome()
  }, [leaveLines, leaveHome, dropSaveAsk])
  /** The lock menu's save and backup steps unmount the shell (RC5, found at RC4b's close: they dropped an unkept
   *  what-if silently): over an open entry or an unkept what-if they ask first, in the ceremony's own words. */
  const toCeremony = useCallback((go: 'save' | 'backup') => {
    const lines = [
      ...(unsavedBuffersHeld() > 0 ? [copy.shellCeremonyOpenEntry] : []),
      ...(whatIfHeldRef.current ? [copy.shellCeremonyWhatIf] : []),
    ]
    if (lines.length > 0) {
      setLeaveAsk({ lines, go, goLabel: copy.shellCeremonyGo })
      return
    }
    setPhase(go)
  }, [])
  /** The re-walk asks first over anything the shell's unmount would drop (insight 112: every way out holds). */
  const reviewFromShell = useCallback(() => {
    dropSaveAsk()
    const lines = leaveLines(true)
    if (lines.length > 0) {
      setLeaveAsk({ lines, go: 'review' })
      return
    }
    leaveForReview()
  }, [leaveLines, leaveForReview, dropSaveAsk])
  // The ceremony opens only on a plan that can be saved. A save ask's Go after a required fact was cleared beneath it
  // finds none: the phase goes back to the shell's, as the ceremony's cancel does (its minted record off), so a Back
  // press moves between pages again instead of being absorbed as if a ceremony were open.
  useEffect(() => {
    if (phase !== 'save' || saveReady.ready) return
    restoreRecMint()
    setPhase('workspace')
  }, [phase, saveReady.ready, restoreRecMint])
  // A page address left from an earlier load (a reload in the shell) names a page nothing has landed on yet: plain.
  useEffect(() => {
    if (parseHash(window.location.hash) !== null) window.history.replaceState(null, '', plainUrl())
  }, [])
  useEffect(() => {
    /** Put the shown page's entry back on top (a Back or Forward press can't be cancelled). */
    const restoreShownEntry = () =>
      window.history.pushState({ b9: 'workspace', n: depthRef.current } satisfies WorkspaceEntry, '', plainUrl() + routeHash(routeRef.current))
    const onPop = (e: PopStateEvent) => {
      const entry = isWorkspaceEntry(e.state) ? e.state : null
      // A typed page address arrives with no entry of ours: the hash alone names it.
      const addressed = parseHash(window.location.hash)
      const onShell = entry !== null || addressed !== null
      const p = phaseRef.current
      if (p === 'workspace') {
        if (!onShell) {
          // An entry beneath the home that is not a page of ours (left by an earlier load): the home stands; pass on.
          window.history.back()
          return
        }
        // The wordmark's leave landed short of the home (a Forward-raised ask's entry sits out of order): on.
        if (leavingRef.current === 'home' && entry !== null && entry.n > 1) {
          window.history.go(-(entry.n - 1))
          return
        }
        const to = addressed ?? LANDING
        const n = entry?.n ?? depthRef.current + 1
        if (entry === null) window.history.replaceState({ b9: 'workspace', n } satisfies WorkspaceEntry, '')
        // A move between pages drops nothing but an open drawer's edit: with one open, ask first. Either way an ask
        // left unanswered goes, as its Stay would (`dropSaveAsk`).
        if (leavingRef.current === null && !routeEquals(to, routeRef.current)) {
          dropSaveAsk()
          const lines = leaveLines(false)
          if (lines.length > 0) {
            restoreShownEntry()
            setLeaveAsk({ lines, go: 'back' })
            return
          }
        }
        leavingRef.current = null
        depthRef.current = n
        setLeaveAsk(null)
        routeRef.current = to
        setRoute(to)
        return
      }
      // A ceremony the shell opened: a Back press mid-ceremony is absorbed (the shown page's entry goes back
      // on), so it can never strand the ceremony or tear the shell's entry out from under it.
      if (p === 'save' || p === 'backup') {
        const onShown = entry !== null && entry.n === depthRef.current && addressed !== null && routeEquals(addressed, routeRef.current)
        if (!onShown) restoreShownEntry()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [leaveLines, dropSaveAsk])
  /**
   * U17 §S5 — THE REMEMBERED RECOMMENDATION'S TRICHOTOMY, DERIVED ONCE PER FRAME.
   *
   * THE OPERAND IS THE DISK, NEVER THE DRAFT. `persist.scenario` is documented as "the LAST
   * COMMITTED model" (resultSave.ts:41-42) and is the only value with an on-disk guarantee; the
   * DRAFT carries a record from the instant the gesture mints one, several awaits BEFORE any write
   * lands (and forever, if the write fails). Reading it here would render a
   * minted-but-never-persisted record as a remembered one — the cardinal calm-but-wrong sin, in
   * the exact direction `recommendationSaveView.ts`'s header says this whole machine exists to make
   * unrepresentable. It also needs no `savedRecommendation` validity check: the codec DELETES an
   * invalid record from the very object `decodeScenario` returns, so a record our minter got wrong
   * is ABSENT from this operand rather than present-and-bad.
   *
   * THE SHORT-CIRCUIT DOES ZERO WORK, AND THAT IS THE FIT-FRAME CONTRACT. Both reads below are
   * expensive: `currentDraftFingerprint()` runs the injected solve builder (→ `buildSpineParams` →
   * the candidate enumeration) and canon-serializes the whole params object plus the roster, and
   * `exposureForDraft` calls NINE separate params producers (one, `workingYearTaxForRun` — the
   * 2026-10-20 working-year tax floor's ledger reach — walks every date-route candidate's cash terms).
   * On a `{kind:'unsaved'}` mount — every
   * `?seed=` route, the Caddie walk, `pnpm verify:fit` — there is no record to judge, so the honest
   * answer costs nothing and must COST nothing. `currentDraftFingerprint()` is never called bare in
   * a render body for the same reason.
   *
   * `!saveReady.ready ⇒ undefined` mirrors `deriveResultSave`'s own `!ready.ready ⇒ none`
   * (resultSave.ts:112): conjunct 3 needs a normalized household scenario to overlay the record's
   * era onto, and an unencodable answer has none.
   *
   * THE DATE-ROUTE CONJUNCT IS THE STRUCTURAL FORM OF Result.tsx's OWN SUPPRESSION.
   * `exposureForDraft` carries a hard prohibition — "DO NOT LIFT THIS FUNCTION TO A CROWNED
   * SURFACE… the base read WOULD lie there" (stalenessExposure.ts:96-99) — and on a date route it
   * takes exactly the arm that reads the PRE-SWEEP base ACA overlay (:179-184), while the result
   * screen it would feed sits beside a CROWNED date. `savedRecommendation.ts:88-94` proves no
   * record can be BORN on a date route, but the frame is reachable the other way round (a
   * household saves a record, then a spouse un-retires), and Result already refuses to render the
   * recommendation surface there at all. Making the refusal structural HERE — at the producer —
   * means the lying exposure read is never taken, rather than taken and then discarded.
   */
  const recordCard = useMemo(():
    | { readonly status: SavedRecommendationStatus; readonly record: SavedRecommendationV3 }
    | undefined => {
    // PHASE FIRST — this memo's zero-work contract has to hold during INTAKE too, and nothing
    // consumes it there. Without this conjunct, a returning household with a save-ready draft pays
    // a full `currentDraftFingerprint()` (buildSolveRequest → buildSpineParams → candidate
    // enumeration → canon serialize) PLUS `exposureForDraft`'s nine params producers on every single
    // keystroke-committed edit of the intake — for a card that cannot render until `result`.
    // The shell's What if page runs the record as a what-if too (the workbench plan's R22, U15).
    if (phase !== 'workspace') return undefined
    if (persist.kind === 'unsaved') return undefined
    const record = persist.scenario.savedRecommendation
    if (record === undefined) return undefined
    if (!saveReady.ready) return undefined
    if (isDateRoute(snapshot.draft)) return undefined
    return {
      record,
      status: deriveSavedRecommendationStatus({
        record,
        // The HOUSEHOLD basis is today's answer (the clock's exposure gates and budget windows
        // describe the household NOW); only the five era-bearing fields are overlaid from the
        // record, inside the store's own comparator.
        scenario: saveReady.scenario,
        // The OTHER operand: what the draft would solve now. The record's own `fingerprint` is the
        // COMMITTED run's — the two are equal at the mint and diverge after, and that divergence
        // IS the mechanism (memoryModel.ts's `currentDraftFingerprint` doc).
        freshFingerprint: appModel.currentDraftFingerprint(),
        todayEpochDay: currentEpochDay(),
        exposure: exposureForDraft(snapshot.draft),
      }),
    }
  }, [phase, persist, saveReady, snapshot.draft])
  /** The refusal that still stands FOR THE DRAFT ON SCREEN — see the paired state above. A
   *  superseded entry is simply not this draft's, so it cannot render. */
  const recSaveRefusalStanding: RecommendationSaveRefusal | null =
    recSaveRefusal !== null && recSaveRefusal.draft === snapshot.draft ? recSaveRefusal.reason : null
  // The reveal cadence, ONE seam (ultramode 2026-07-09 — it was open-coded at three sites):
  // reveal the magic moment on the FAST provisional tier, then sharpen to the final IN
  // PLACE — never block the reveal on the final-tier sweep (16k paths × candidates ≈ a
  // multi-second wait, far longer on a phone: it read as "never gets worked out"). The
  // await ORDER is load-bearing: the provisional must COMMIT (lower epoch) before the
  // final dispatches, or the final's epoch bump cancels the in-flight provisional and the
  // reveal is back to a bare blocking spinner. The result holds the provisional reading
  // while the final computes (no re-blank), then upgrades. W9-R7 (R6, KTD7): a provisional that a
  // newer recompute superseded before it settled (an edit on the Result during the reveal) sends NO
  // final — the newer edit's own pair sharpens the household's latest inputs.
  const revealAndSharpen = useCallback(async () => {
    // Act 6 · RC4: the reveal lands on the home (Snapshot), never an answer page.
    enterWorkspace()
    if (!(await appModel.recompute('provisional'))) return
    await appModel.recompute('final')
  }, [enterWorkspace])
  const complete = useCallback(async () => {
    // The narrow period disarm's probe — the store's CURRENT draft, never the render closure
    // (insight 036: a commit-on-blur and the terminal Continue can share a task). If the
    // completed draft trips the spend-period gate on a no-touches/no-provenance evaluation,
    // the spend step can only have been advanced through an explicit period answer (the
    // provenance proof on periodAnswerProven above) — record it before the flow unmounts.
    // A governing budget asks no unit (its lines are yearly figures, its face has no unit control), so its completion
    // proves no period answer: a budget total at or past the band under the untouched default month trips the probe
    // and would wrongly disarm a later re-walk's one-figure gate (the review's D4).
    const done = appModel.getSnapshot().draft
    if (
      !budgetGoverns(done.budget) &&
      periodGateTrips(done) // the completed-intake period probe (sanity.ts; the F10 narrow disarm above)
    ) {
      setPeriodAnswerProven(true)
    }
    await revealAndSharpen()
  }, [revealAndSharpen])

  // The PROPER edit-and-re-save (retires the U8-review ② interim sticky-`saved`): a same-session
  // edit re-saves through the writable()-gated `session.save()` UPDATE path — the keys are
  // resident, so there is no ceremony, and `firstSave`'s 'not-locked' dead-end is structurally
  // unreachable (deriveResultSave can never offer the ceremony once a vault exists). The gate
  // reads the store's CURRENT draft, never the render closure (insight 036 — a commit-on-blur
  // edit and this click can share a task). `session.save` is total over typed results and its
  // {ok:true} arm has no post-commit throw window (session.ts:596-614), so the catch below only
  // ever speaks for a save that did NOT land — "didn't finish" stays honest (insight 052).
  //
  // U17 §S5 — IT IS THE ONE WRITE PRODUCER, AND IT NOW RETURNS ITS OUTCOME. There is exactly one
  // `session.save()` call for the whole result screen: the plan rail's CTA/retry and the
  // recommendation gesture's update route both land here, so the two can never disagree about
  // what reached disk, and the recommendation's `'write'` refusal has a REAL producer (a declared
  // refusal nobody can produce renders NOTHING on a failure — the dead-arm shape). The body,
  // every `setPersist` transition and the `describeSaveFailure` mapping are UNCHANGED: the plan
  // rail's behaviour is byte-identical to the `resave` this replaces.
  const saveNow = useCallback(async (): Promise<
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: 'not-ready' | 'not-writable' | 'quota' | 'write-failed' }
  > => {
    const ready = scenarioFromDraft(appModel.getSnapshot().draft)
    if (!ready.ready) return { ok: false, reason: 'not-ready' }
    setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'saving', scenario: p.scenario }))
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.save(ready.scenario)
      if (result.ok) {
        setPersist({ kind: 'saved', scenario: ready.scenario })
        // A REFUSAL MUST NEVER OUTLIVE THE WRITE THAT LANDED THE VERY RECORD IT DISOWNS. The
        // recommendation gesture deliberately LEAVES its record on the draft when a write fails
        // (see the restore rule below), so the plan rail's own retry carries that record to disk —
        // and this scenario IS record-bearing (`ready` re-read the current draft). Without this
        // clear the screen would hold two contradictory claims about one vault: the strategy slot
        // reporting a save that failed, over a plan rail reporting the save that succeeded.
        //
        // GATED ON THE SCENARIO ACTUALLY CARRYING A RECORD — a `'record-invalid'` refusal is NOT
        // repaired by this write and must survive it. That arm returns BEFORE the draft is ever
        // touched, so no record exists to carry; clearing unconditionally would let an unrelated
        // plan-rail save silently erase a standing refusal, leaving the household believing a
        // strategy read was kept that was never built. The `'write'` arm always leaves its record on
        // the draft, so this predicate is true in exactly the case the clear is for.
        if (ready.scenario.savedRecommendation !== undefined) setRecSaveRefusal(null)
        return { ok: true }
      }
      const errorKey = describeSaveFailure(result)
      setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey }))
      return { ok: false, reason: result.reason }
    } catch {
      setPersist((p) =>
        p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey: 'saveErrorFailed' },
      )
      return { ok: false, reason: 'write-failed' }
    }
  }, [])

  /**
   * Act 6 · RC5 — THE PLAN LIST'S ONE WRITE (KTD19): Keep, rename, copy, delete and reorder all land here. The edit is
   * applied to the store's CURRENT list at the press (insight 036), never a render's; it writes only on a clean draft (an
   * unsaved fact edit would otherwise ride a keep to disk unasked: the page says why instead, and the vault is
   * unchanged), probes the round trip first (the list must reach the disk whole), then goes through the plan's one
   * save (`saveNow`). With no vault yet, the list goes on the unsaved plan, and a Keep opens the save ceremony, which
   * saves the plan with it (the kept what-if then reopens on the left, `resumeKept`).
   */
  const writeKept = useCallback(
    async (edit: KeptEdit, keep?: string): Promise<KeptWriteOutcome> => {
      if (readOnly) return { kind: 'refused', reason: 'read-only' }
      const s = appModel.getSnapshot()
      const view = deriveResultSave(persistRef.current, scenarioFromDraft(s.draft), readOnly)
      if (view.kind !== 'first' && view.kind !== 'clean') return { kind: 'refused', reason: view.kind }
      const next = edit(s.draft.keptWhatIfs ?? [], idsInUse(s.draft))
      if (next === null) return { kind: 'refused', reason: 'stale' }
      const probe = scenarioFromDraft(withKeptWhatIfs(s.draft, next))
      if (!probe.ready || probe.droppedAtoms.length > 0 || canonicalIdentityToken(probe.scenario.keptWhatIfs ?? []) !== canonicalIdentityToken(next)) {
        return { kind: 'refused', reason: 'invalid' }
      }
      appModel.update((d) => withKeptWhatIfs(d, next))
      if (view.kind === 'first') {
        if (keep === undefined) return { kind: 'draft' }
        setResumeKept(keep)
        setPhase('save')
        return { kind: 'ceremony' }
      }
      const written = await saveNow()
      return written.ok ? { kind: 'saved' } : { kind: 'failed' }
    },
    [readOnly, saveNow],
  )

  /**
   * U17 §S5 — THE SAVE GESTURE FOR THE RECOMMENDATION ON SCREEN.
   *
   * THE ORDER IS THE WHOLE DESIGN: the mint is PROBED AND REFUSED BEFORE THE STORE IS TOUCHED, and
   * the store is touched before anything reaches disk. `scenarioCodec.ts:1072-1075` names this
   * function as the seam that "MUST validate its own mint HERE, before the record ever touches the
   * draft", and the reason is a DATA-LOSS case, not tidiness: if the disk already holds a VALID
   * record and a new mint is invalid, the codec deletes the bad record from the LIVE operand only,
   * the two `scenarioIdentityKey`s diverge, `deriveResultSave` reads DIRTY, and the household's
   * next plan-save writes a record-FREE scenario over the good record. Both checks are kept —
   * `validateSavedRecommendation` (inside the mint) judges an in-memory object, while the
   * `scenarioFromDraft` probe is the only one covering the values `JSON.stringify` transforms
   * (DND 009).
   */
  const saveRecommendation = useCallback(
    async (ticket: RecommendationSaveTicket): Promise<void> => {
      // (1) THE SYNCHRONOUS GUARDS. Each returns SILENTLY, and that is honest rather than a missing
      // outcome (insight 100): nothing was minted, nothing was written, and nothing was promised
      // that these states break. A read-only tab derives no CTA at all (the standing View-only
      // banner is the whole disclosure); a plan-rail write already in flight has its own pending
      // line on screen; a second tap during our own write would race two writes for one vault.
      if (readOnly || persist.kind === 'saving' || recSaveInFlight) return

      // (2) THE SESSION — the FIRST and ONLY read of it in this feature, and it happens ON THE TAP.
      // `getVaultSession()` IS the IndexedDB open (vaultSession.ts:28-29), and the module's own
      // contract is that the dev `?seed` / `?preview` paths "pay nothing" — App skips even the
      // startup probe on them, and they are exactly what the Caddie walk and `pnpm verify:fit` run.
      // A mount-time status read would open the DB on every one of those routes.
      //
      // A RECOVERY-UNLOCKED SESSION CANNOT PERSIST AT ALL, and no existing parameter covers it:
      // `recoveryUnlock` clears `passphraseWrapCurrent` (session.ts:537) which `writable()`
      // requires (:305), and `RecoveryUnlockResult` carries no `readOnly` bit for
      // `deriveResultSave`'s parameter to have been threaded from. Refuse ALOUD here rather than
      // mint a record and discover it at the write. Never reachable on the no-vault path — a fresh
      // session initialises 'locked' (session.ts:216) — so R1's ceremony route stays live.
      // THE DB OPEN CAN REJECT, AND A GESTURE THAT PROMISED AN AFFORDANCE OWES A RENDERED OUTCOME
      // (insight 100). `getVaultSession()` → `openVaultDb()` → idb's `openDB()` (db.ts:62-68) REJECTS
      // on a blocked / unavailable / version-errored IndexedDB — a storage policy, Firefox private
      // browsing, a corrupt DB. Left bare, that rejection escapes the `void saveRecommendation(…)`
      // call site as an unhandled promise rejection and the household sees NOTHING happen: the one
      // arm of this gesture that could produce no outcome at all. It refuses as `'write'` because
      // that is precisely what failed — nothing could be written — and because at this point nothing
      // has been minted, probed, or put on the draft, so no stronger claim would be true.
      let recoveryLocked: boolean
      try {
        const { getVaultSession } = await import('./vaultSession')
        recoveryLocked = (await getVaultSession()).status() === 'recovery-unlocked'
      } catch {
        setRecSaveRefusal({ reason: 'write', draft: appModel.getSnapshot().draft })
        return
      }
      if (recoveryLocked) {
        setRecSaveRefusal({ reason: 'recovery-locked', draft: appModel.getSnapshot().draft })
        return
      }

      // (3) RE-READ THE STORE AFTER THE AWAIT (insight 036) AND RE-CONFIRM THE RUN. Steps 3→4→5
      // contain NO await, so what is checked here is what is minted. A mismatch RETURNS silently
      // and owes nothing: the store demotes a committed solve to `stale` on every draft mutation,
      // so the surface has ALREADY re-rendered off that demotion — the rendered outcome insight 100
      // asks for is on screen before this line runs. The fingerprint compare is what makes the
      // ticket a check rather than a courier: it pins the record to the run the household tapped.
      const s = appModel.getSnapshot()
      if (
        s.solve.kind !== 'committed' ||
        s.solve.payload.kind !== 'recommended' ||
        s.solve.fingerprint !== ticket.fingerprint
      ) {
        return
      }

      // (4) THE MINT — the COMMITTED fingerprint, never a fresh one (a fresh basis would stamp the
      // record with inputs the recommendation was never computed against, making a stale memory
      // calm-but-wrong instead of detectable). It validates itself and hands back the codec's own
      // failing field path, which goes to the `console` and NOWHERE near the surface.
      const minted = mintSavedRecommendation(
        s.solve.payload,
        s.solve.fingerprint,
        ticket.noDollarRegister,
        currentEpochDay(),
      )
      if (!minted.ok) {
        console.error(`[u17/s5] saved-recommendation mint refused: ${minted.detail}`)
        setRecSaveRefusal({ reason: 'record-invalid', draft: s.draft })
        return
      }

      // (5) THE SAVE-GATE PROBE — the same round-trip the real save runs, over the draft this
      // gesture is ABOUT to build, so a record that would be dropped on the way to disk is caught
      // while the draft is still clean. A dropped atom here is a defect of OURS, so it refuses with
      // the same one word the household can act on (none of these three states has a different
      // repair). NOTE the drop check lives HERE and must not migrate into scenarioFromDraft.ts:
      // that file must keep saving the plan when an atom drops (refusing the whole save would
      // strand real edits over our bug), and `draftFromScenario.test.ts` greps it to prove so.
      const probe = scenarioFromDraft({ ...s.draft, savedRecommendation: minted.record })
      if (!probe.ready || probe.droppedAtoms.length > 0) {
        console.error(
          `[u17/s5] saved-recommendation dropped by the save gate: ${probe.ready ? probe.droppedAtoms[0] : probe.detail}`,
        )
        setRecSaveRefusal({ reason: 'record-invalid', draft: s.draft })
        return
      }

      // (6) NOW the store may be touched. Capture what the draft carried first — the ceremony's
      // cancel restores it (see the restore rule at the save phase below).
      // A second press while this gesture's mint is still outstanding (its save ask is not modal, so the card's Keep
      // stays pressable) keeps the record captured at the FIRST tap: capturing again would take the first mint as the
      // prior record, and Stay would put it back instead of taking it off (round 3 of the milestone-1 review).
      if (!recSaveCeremonyRef.current) recSavePrevRecord.current = s.draft.savedRecommendation
      appModel.update((d) => ({ ...d, savedRecommendation: minted.record }))

      // (7) ROUTE. NO VAULT ⇒ THE CEREMONY, NEVER A DEAD CONTROL (R1). `deriveResultSave` maps
      // `unsaved → first`, the ceremony is how a first vault is made, and the record is already on
      // the draft — so `saveReady` (memoized on the draft the store just replaced) hands SaveFlow a
      // record-BEARING scenario and one ceremony writes the whole plan including this memory.
      // It deliberately does NOT clear a standing refusal (the update route below must): a standing
      // refusal renders `{kind:'refused'}`, which draws NO save control at all, so there is no tap
      // that can reach this line with one outstanding.
      // Read through the REF, never the closure — see `persistRef` above. A vault created during
      // this gesture's own awaits must route to the update write, not a second ceremony.
      if (persistRef.current.kind === 'unsaved') {
        setRecSaveCeremony(true)
        // The ceremony returns to the shell, where the gesture was made (Act 6 · RC4: the shell is the home). Over an
        // unkept what-if or an open entry it asks first, as the lock menu's Keep does (RC5); Stay restores the record.
        toCeremony('save')
        return
      }
      // A VAULT EXISTS ⇒ the update write. Clearing the refusal in the SAME state update that sets
      // `inFlight` is mandatory, not tidiness: the standing refusal deliberately OUTRANKS `inFlight`
      // in `deriveRecommendationSave`'s guard order (so an unrelated commit-on-blur can never erase
      // a real outcome), which means a stale refusal left standing here would render a dead card
      // over live work.
      setRecSaveInFlight(true)
      setRecSaveRefusal(null)
      const written = await saveNow()
      setRecSaveInFlight(false)
      if (written.ok) {
        setRecSaveLanded(true)
        return
      }
      // THE RECORD STAYS ON THE DRAFT. Stripping it here was proposed and is REJECTED as a
      // data-loss bug: where the disk already holds a valid R_old, a strip makes the plan rail's
      // own live retry — which re-reads the CURRENT draft — write a record-free scenario that WIPES
      // R_old. The household authorized exactly this whole-plan commit, that retry carries the
      // record, and `saveNow`'s {ok:true} arm clears this refusal when it lands.
      setRecSaveRefusal({ reason: 'write', draft: appModel.getSnapshot().draft })
    },
    [readOnly, persist, recSaveInFlight, saveNow, setRecSaveCeremony, toCeremony],
  )

  // DEV-only `?seed=<key>`: apply a COMPLETE fixture to the in-memory appModel and
  // run the SAME terminal-advance path `complete()` runs (apply → result →
  // provisional → final), so the seed lands on the elevated answer exactly like a
  // hand-driven intake. devSeeds.ts is DEV-gated + dynamically imported here, so it
  // is dead-code-eliminated from prod (the `?preview` DCE contract). Mount-only;
  // nothing persists (the seed mutates only appModel — U8 owns Save). "Review my
  // answers" still works: the seeded draft lives in appModel, intact on flip-back.
  useEffect(() => {
    if (!(import.meta.env.DEV && seed != null)) return
    let cancelled = false
    void import('./devSeeds').then(async ({ resolveDevSeed }) => {
      const draft = resolveDevSeed(seed)
      if (draft === null || cancelled) return
      appModel.update(() => draft)
      baselineRef.current = draft // the seed IS the baseline — a seed route lands with nothing to lose
      setDevSeedApplied(true)
      await revealAndSharpen()
    })
    return () => {
      cancelled = true
    }
  }, [seed, revealAndSharpen])

  // DECRYPT-ON-RETURN: after a successful unlock the session holds the decrypted model. Mirror the
  // `?seed` hydration — whole-draft replace → result → provisional (shows FAST) → final (sharpens in
  // the BACKGROUND), NEVER blocking the reveal on the heavy final sweep (Fork D + the wall-clock
  // measurement: retired final ~2.9s, working ~20s). The 'restoring…' pending covers unlock +
  // provisional; the final lands off the blocking path as a band re-draw. `getVaultSession` is a
  // dynamic import so the crypto graph stays out of the intake chunk's static top-level.
  useEffect(() => {
    if (!hydrateFromVault) return
    let cancelled = false
    void (async () => {
      try {
        const { getVaultSession } = await import('./vaultSession')
        const session = await getVaultSession()
        const model = session.currentModel()
        if (cancelled) return
        // Admits exactly the current version. A version-3 or version-4 plan never reaches here as 3
        // or 4: the codec relabels each to its successor at unlock (scenarioCodec.ts), so it hydrates
        // like any current save. What this refuses is null and the version-1/2 ladder members (decoded as-is, never
        // up-converted — the register's *The couple's own data…* keeps that dead end) → refuse
        // rather than render a wrong plan. A non-two-person shape is draftFromScenario's refusal below.
        if (model === null || model.schemaVersion !== CURRENT_SCHEMA_VERSION) {
          setPhase('restore-failed')
          return
        }
        const hydrated = draftFromScenario(model)
        if (!hydrated.ok) {
          setPhase('restore-failed')
          return
        }
        // The decrypt-on-return session IS saved — without this, the result screen offered the
        // firstSave ceremony against an existing vault ('not-locked' → the lying "Try again"
        // dead-end, found closing U8). Normalize through scenarioFromDraft so the dirty
        // comparison (resultSave.ts) is codec-keyed on BOTH sides; a failed normalization of a
        // just-decoded model is structurally unreachable (the Fork-D round-trip guarantee), so
        // it refuses like the adjacent decode failures — never a silently wrong save state.
        const normalized = scenarioFromDraft(hydrated.draft)
        if (!normalized.ready) {
          setPhase('restore-failed')
          return
        }
        appModel.update(() => hydrated.draft)
        // The persist seed keeps the DISK's own savedAt (review 2026-07-10): scenarioFromDraft
        // re-stamps a fresh save-day, but persist.scenario's contract is "the LAST COMMITTED
        // model" — and agedBalancesYearFor reads its savedAt as the year the numbers were
        // entered (a fresh stamp here silently killed the aged-balances clause on every
        // hydrated vault). The reconstruction is the ONE exported producer (resultSave.ts
        // `persistSeedFor`) — never re-typed here or in a test, which is how S0's seam bug hid.
        setPersist({ kind: 'saved', scenario: persistSeedFor(normalized.scenario, model.savedAt) })
        // The re-offer backup door: a WRITABLE return with no backup-note on record offers the
        // off-device copy. A read-only tab skips it (the standing view-only banner is disclosure
        // enough — one door is the deliberate v1 scope). A note-read hiccup must NEVER fail the
        // hydrate, so it has its OWN guard OUTSIDE the restore-failed catch — a failure just leaves
        // the door closed (the next return re-checks); re-offer is the safe direction elsewhere.
        if (!readOnly) {
          try {
            const hasBackup = await session.hasBackupRecord()
            if (!cancelled && !hasBackup) setNeedsBackup(true)
          } catch {
            // leave the door closed on a note-read failure — never a restore-failed
          }
        }
        // P3·U13 — THE RE-ENTRY GATE (council constraints (a)+(b)). Staleness is derived
        // from the RAW-decoded `model` — the vault's own stamps, captured before any
        // re-save could re-stamp them — and the balance confirm resolves BEFORE the result
        // phase mounts or any recompute dispatches: the verdict never renders on
        // unconfirmed balances and then asks. The recompute moves to the affirm handler.
        //
        // U17 §S4 — the EXPOSURE record is built HERE, at the ui/intake seam, off the HYDRATED
        // draft's own built params (`exposureForDraft` → `buildSpineParams`/`buildDateInput`).
        // The store cannot make this read (layer law), and re-deriving it from ages/geography
        // is the insight-080/081 defect class. The draft is the round-trip inverse of the same
        // `model` the stamps come from, so the exposure and the stamps describe one household.
        // The household's own working-year answers ride BESIDE the exposure record, never inside it:
        // whether the W answer still matches its quote (the pay check's KTD21) is an intake predicate
        // over the same hydrated draft (an answer against its inputs, not a built run), passed in
        // their own named object. Build 2's left-over fact is the moved core's answer over the same
        // draft (`workingYearLeftOverMoved`: a "saved" answer, W fresh, a known picture, a printed
        // year-0 figure that differs from the stored one), computed ONCE into `leftOverMoved` — the fact
        // below and the gate's sentence both read that one value, so `composeReentry`'s throw (a fact
        // with no sentence — the restore-failed face on every reload) is unreachable by construction
        // (obligation (f)). The core is total: the money picture's read catches every producer fault.
        const leftOverMoved = workingYearLeftOverMoved(hydrated.draft)
        const report = deriveStaleness(model, currentEpochDay(), exposureForDraft(hydrated.draft), {
          costStale: isWorkingYearCostStale(hydrated.draft),
          leftOverStale: leftOverMoved !== null,
        })
        // The gate's KTD21 sentence from the SAME hydrated draft — the W step's own stale sentence,
        // which the answer's standing line repeats (b9-7), with build 2's clause for a "saved" answer
        // waiting on W (R12); the door hint only where this tab can save, the same condition as the
        // answer's door (`Result`'s `onOpen`). The gate's door under its buttons from the same draft
        // (`workingYearCostStaleDoor`'s `gate`, council `wf_22858e04-f7a`); `composeReentry` draws it only where the tab can save.
        const payCheckStaleLine = workingYearCostStaleLine(hydrated.draft)
        const payCheckStaleDoor = workingYearCostStaleDoor(hydrated.draft)
        const payCheckStale =
          payCheckStaleLine === null || payCheckStaleDoor === null
            ? null
            : { line: payCheckStaleLine, door: payCheckStaleDoor.gate, canChange: !readOnly }
        const leftOverStale =
          leftOverMoved === null
            ? null
            : {
                text: workingYearLeftOverMovedText(leftOverMoved),
                clause: workingYearLeftOverMovedClause(leftOverMoved),
                canChange: !readOnly,
              }
        // U11 walk 6's R1: a fresh TYPED W below today's quote, from the same draft — the report never calls it
        // stale (a typed figure is never staled on a quote, KTD10), so the gate hears it only here. The line and its
        // door read one predicate (`freshTypedBelow`), so they are null together; the door rides where the tab can save.
        // Whether the line carries the moved clause is `composeReentry`'s one decision (the walk-9 form council's call
        // (1a)), never this caller's: it hands both forms of the one hydrated draft's line, and both doors.
        const typedBelowLines = {
          plain: workingYearCostTypedBelowComposed(hydrated.draft, { kind: 'gate', carriesMoved: false }),
          carryingMoved: workingYearCostTypedBelowComposed(hydrated.draft, { kind: 'gate', carriesMoved: true }),
        }
        const typedBelowDoor = workingYearCostTypedBelowDoor(hydrated.draft, false)
        const typedBelowDoorMoved = workingYearCostTypedBelowDoor(hydrated.draft, true)
        const { plain: typedBelowPlain, carryingMoved: typedBelowCarrying } = typedBelowLines
        const typedBelow =
          typedBelowPlain === null || typedBelowCarrying === null || typedBelowDoor === null || typedBelowDoorMoved === null
            ? null
            : {
                compose: (carriesMoved: boolean) => (carriesMoved ? typedBelowCarrying : typedBelowPlain),
                door: { plain: typedBelowDoor, carryingMoved: typedBelowDoorMoved },
                canChange: !readOnly,
              }
        setReentry({
          view: composeReentry(model, report, { costStale: payCheckStale, leftOverStale, typedBelow }),
          rulesMoved: report.rulesMoved,
        })
        setPhase('reentry')
      } catch {
        if (!cancelled) setPhase('restore-failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrateFromVault, readOnly])

  if (phase === 'restoring') {
    return (
      // The unlock card's "Opening your plan…" carried on (the same card, the same words) until the gate or the answer is
      // ready (Act 6 · RC19, in place of the old PendingPanel).
      <VaultPage>
        <VaultCard wordmark={{ mark: copy.shellMark, title: copy.appTitle }} busy>
          <VaultPending status={copy.restoringStatus} />
        </VaultCard>
      </VaultPage>
    )
  }

  if (phase === 'reentry' && reentry !== null) {
    return (
      <ReEntry
        view={reentry.view}
        readOnly={readOnly}
        onAffirm={() => {
          // Affirmed (a prompt, not an attestation — nothing recorded): NOW the reveal
          // proceeds — result phase + the two-tier recompute the gate had been holding.
          void revealAndSharpen()
        }}
        onUpdate={() => {
          // Something changed: route into the walk-through (accounts are edited where they
          // were entered — the U12 panel precedent; the terminal advance recomputes as
          // always). The hydrated draft is already installed, so every answer is preserved.
          setPhase('intake')
        }}
      />
    )
  }

  if (phase === 'restore-failed') {
    return (
      <VaultPage>
        <VaultCard wordmark={{ mark: copy.shellMark, title: copy.appTitle }}>
          <VaultHeading>{copy.unlockHeading}</VaultHeading>
          <FieldNote>{copy.unlockGeneric}</FieldNote>
          <Button variant="primary" className="w-full" onClick={() => window.location.reload()}>
            {copy.restoreRetry}
          </Button>
        </VaultCard>
      </VaultPage>
    )
  }

  if (phase === 'save' && saveReady.ready) {
    return (
      <Suspense fallback={null}>
        <SaveFlow
          scenario={saveReady.scenario}
          onCancel={() => {
            // U17 §S5 — THE RESTORE RULE, and it is a RESTORE, never a strip. Nothing was written,
            // and R2 forbids a later plan-save carrying to disk a record whose own CTA never named
            // it — so the record this gesture minted comes back off. Restoring the PRIOR value (not
            // deleting the key) is what makes it safe in every direction: an unconditional strip
            // would erase a record the household saved earlier and never touched today. Gated on
            // `recSaveCeremony` because the plan rail's own "Keep this plan" enters this same
            // ceremony having minted nothing — it must not perturb the draft at all.
            restoreRecMint()
            setPhase('workspace')
          }}
          // Record what the ceremony COMMITTED the instant it commits — the same render-captured
          // scenario passed as its prop (the save phase renders no edit surface, so it cannot have
          // drifted). AT the commit, not at the Done tap: the unsaved-work guard above reads
          // `persist`, and between firstSave landing and Done the household sits on "Your plan is
          // saved" — a beforeunload dialog there would be alarm-when-fine, a lie in the safe direction.
          onCommitted={() => setPersist({ kind: 'saved', scenario: saveReady.scenario })}
          onComplete={() => {
            // The record rode that scenario to disk, so the recommendation's save LANDED. It is
            // recorded as an EVENT rather than left to a view transition because this whole subtree
            // unmounts across the ceremony (the branch above returns before Result renders), so
            // nothing downstream can observe the change it would need to announce.
            if (recSaveCeremony) {
              recSavePrevRecord.current = undefined
              setRecSaveCeremony(false)
              setRecSaveLanded(true)
            }
            setPhase('workspace')
          }}
        />
      </Suspense>
    )
  }

  if (phase === 'backup') {
    // The re-offer backup step: the EXISTING ExportConfirm in the house save shell (BackupStep owns
    // its live region). onFinish records the note via the ceremony's channels, clears the door's
    // gate, and returns to the answer — where the dissolved door no longer renders.
    return (
      <Suspense fallback={null}>
        <BackupStep
          onFinish={() => {
            setNeedsBackup(false)
            setPhase('workspace')
          }}
          // The quiet escape: declining records nothing and keeps the door offered (needsBackup
          // stays true) — an invited offer is never a trap (ultramode 2026-07-03).
          onCancel={() => setPhase('workspace')}
        />
      </Suspense>
    )
  }

  // The one save machine's view, wired for the shell: its lock menu draws the save control from it, and a first save
  // opened there returns to it.
  const saveProp = (view: ResultSaveView): ResultSaveProp =>
    view.kind === 'first'
      ? { kind: 'first', onKeep: () => toCeremony('save') }
      : view.kind === 'dirty'
        ? { kind: 'dirty', onSave: () => void saveNow() }
        : view.kind === 'failed'
          ? { ...view, onRetry: () => void saveNow() }
          : view

  // The shell (Act 6 · RC4: the home). A `save` phase whose plan can't be saved falls back to it.
  if (phase === 'workspace' || phase === 'save') {
    const view = deriveResultSave(persist, saveReady, readOnly)
    // The aged year reads the save machine as a writable tab would: a read-only tab claims no save of its own (`view` is
    // 'none'), but its plan still matches the disk's until it is edited, so the aged-balances lines stay true there
    // (round 3 of the milestone-1 review: every one went missing on a second tab).
    const aged = agedBalancesYearFor(persist, readOnly ? deriveResultSave(persist, saveReady) : view, currentEpochDay())
    return (
      <ShellSlot
        shell={{
          save: saveProp(view),
          // The lock menu's Back up: the existing backup step, wherever a vault exists in this session and the tab
          // can write (a read-only tab writes nothing, not even a backup note).
          ...(persist.kind !== 'unsaved' && !readOnly ? { onBackup: () => toCeremony('backup') } : {}),
          // The re-offer (U8-tail, the old answer page's backup door): a writable return with no backup note.
          backupOffered: needsBackup,
          route,
          onNavigate: navigate,
          onHome: goHome,
          onWhatIfHeld,
          // The plan list's one write (RC5), and the kept what-if a Keep sent through the save ceremony.
          onWriteKept: writeKept,
          ...(resumeKept !== undefined ? { resumeKept, onResumed: () => setResumeKept(undefined) } : {}),
          // The assumption panel's guided re-walk (the old answer page's Review): out to the walk-through.
          onReview: reviewFromShell,
          // The committed answer every page reads, and the draft the facts page reads (U8).
          snapshot,
          // The Display drawer's choices, for the session (held here: the shell unmounts across a save or a backup).
          display,
          onDisplayChange: setDisplay,
          // A read-only tab's facts page draws no door (U8): `save.kind` can't carry it (`none` is also a plan
          // that can't be saved yet).
          readOnly,
          // P3·U13 — the standing staleness note (session-lifetime once the gate derived it; RULES-moved only), and build
          // 2's clause host, decided once by `composeReentry`. The StaleBanner carries both (RC4).
          stalenessNote: reentry?.rulesMoved === true,
          leftOverClauseHost: reentry?.view.leftOverClauseHost === true,
          // The saved recommendation's side on Probability and the What if page (R22): the DISK's record and the
          // store's trichotomy; it runs only while current.
          ...(recordCard !== undefined ? { recommendation: { record: recordCard.record, current: recordCard.status.current } } : {}),
          // U17 §S5 — THE STRATEGY SLOT, derived every frame from its operands, never tracked (the only route to a
          // "saved" claim runs through the record the disk actually carries). `landed` is the durability EVENT.
          recSave: {
            view: deriveRecommendationSave({
              persist,
              solve: snapshot.solve,
              ready: saveReady,
              readOnly,
              status: recordCard?.status,
              inFlight: recSaveInFlight,
              refusal: recSaveRefusalStanding,
            }),
            onSave: (ticket) => void saveRecommendation(ticket),
            landed: recSaveLanded,
            onAnnounced: () => setRecSaveLanded(false),
          },
          ...(recordCard !== undefined ? { recordCard } : {}),
          // The aged-balances clause's honest year (review 2026-07-10): from the persist machine's OWN saved scenario.
          ...(aged !== undefined ? { agedBalancesYear: aged } : {}),
          ...(leaveAsk !== null
            ? {
                leaveAsk: {
                  lines: leaveAsk.lines,
                  ...(leaveAsk.goLabel !== undefined ? { goLabel: leaveAsk.goLabel } : {}),
                  onGo: () => {
                    const go = leaveAsk.go
                    setLeaveAsk(null)
                    if (go === 'save' || go === 'backup') {
                      setPhase(go)
                      return
                    }
                    if (go === 'home') {
                      leaveHome()
                      return
                    }
                    if (go === 'review') {
                      leaveForReview()
                      return
                    }
                    leavingRef.current = 'back'
                    window.history.back()
                  },
                  onStay: () => {
                    // A recommendation's keep that asked before its ceremony: Stay puts the minted record back.
                    if (leaveAsk.go === 'save') restoreRecMint()
                    setLeaveAsk(null)
                  },
                },
              }
            : {}),
        }}
      />
    )
  }

  // Act 6 · RC14: the `intake` phase is the first-run stepper (the walk is deleted). A fresh plan (no vault, no dev seed)
  // opens on "Start a new plan"'s names; a re-walk (Settings, the re-entry gate's update) opens on its first step.
  return (
    <Stepper
      model={appModel}
      onComplete={() => {
        setNewPlan(false)
        void complete()
      }}
      askNames={newPlan}
      notSaved={persist.kind === 'unsaved'}
      {...(onCancelNewPlan !== undefined ? { onCancelNewPlan } : {})}
      // Provenance: a vault-decrypted (or genuinely APPLIED dev-seed) draft answered the
      // spend period before it could ever be saved, and a completed intake whose draft trips
      // the gate proved the explicit answer on the way through (periodAnswerProven above) —
      // Review must not re-nag any of them. All three signals are mount-lifetime (none ever
      // resets), so the flag survives Review re-entries; a bogus `?seed=` key never sets the
      // second, and a completion that proves nothing never sets the third.
      periodConfirmed={hydrateFromVault || devSeedApplied || periodAnswerProven}
    />
  )
}
