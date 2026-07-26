import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { IntakeFlow } from '@intake/flow'
import { intakeSteps } from '@intake/questions'
import { AnswerStrip } from '@intake/AnswerStrip'
import { isDateRoute, missingRequiredFacts } from '@intake/intakeMap'
import { validateDraft, type FieldPath } from '@intake/sanity'
import type { SolverRunFingerprint } from '@engine/validation/solverRunFingerprint'
import type { ScenarioDraft } from '@store/memoryModel'
import { deriveSavedRecommendationStatus, type SavedRecommendationStatus } from '@store/savedRecommendation'
import { mintSavedRecommendation } from '@store/savedRecommendationMint'
import type { SavedRecommendationV3 } from '@shared/model'
import { appModel } from './appModel'
import { Result } from './Result'
import { scenarioFromDraft, currentEpochDay } from './scenarioFromDraft'
import { draftFromScenario } from './draftFromScenario'
import { deriveRecommendationSave, type RecommendationSaveRefusal } from './recommendationSaveView'
import { agedBalancesYearFor, deriveResultSave, persistSeedFor, type PersistState } from './resultSave'
import { describeSaveFailure } from './unlockCopy'
import { PendingPanel } from './PendingPanel'
import { ReEntry } from './ReEntry'
import { composeReentry, type ReentryView } from './reentryChrome'
import { deriveStaleness } from '@store/staleness'
import { exposureForDraft } from './stalenessExposure'
import { copy } from './copy'
import './styles/save.css'

// The ceremony rides its own lazy chunk (it pulls the crypto/zxcvbn graph) — kept off the
// already-lazy intake chunk's first paint; the Save beat only ever appears on the result screen.
const SaveFlow = lazy(() => import('./SaveFlow').then((m) => ({ default: m.SaveFlow })))
// The re-offer backup step (U8-tail) rides its own lazy chunk too (it pulls the export/crypto
// graph via ExportConfirm); it only mounts from the result's backup door.
const BackupStep = lazy(() => import('./BackupStep').then((m) => ({ default: m.BackupStep })))

/** The completed-intake period probe (the F10 narrow disarm below): a synthetic touched set
 *  holding ONLY the spend-period gate's target, so `validateDraft`'s touched-filter admits
 *  exactly that rule's violation — "would the force-confirm fire on this draft in a session
 *  with no touches and no provenance?" asked through the rule's OWN predicate (sanity.ts
 *  `spend-period-unconfirmed`), never a re-typed copy of its ambiguity math. */
const PERIOD_PROBE_TOUCHED: ReadonlySet<FieldPath> = new Set(['annualSpendingReal'])

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
 * the constants tables) — keeping the ENTRY chunk (shell + cold start) inside
 * the 300 KiB budget (`verify:bundle`). The chunk is precached (PWA) and
 * warmed during the cold-start read, so Begin never visibly waits.
 *
 * `appModel` (the ONE memoryModel) is created at THIS module's evaluation —
 * still module-level, still outside any render path, still StrictMode-proof
 * (contract #1a); it simply lives in the lazy chunk because its builders do.
 *
 * THE TWO PHASES (D2). During `intake` the quiet provisional AnswerStrip
 * co-exists above the questions (the question stays the hero). The terminal
 * advance fires the FINAL-tier recompute AND flips to `result` — the elevated
 * state-adaptive magic moment (FuckOffDate / ConfidenceStatement). `review`
 * returns to intake with every answer preserved (the draft lives in `appModel`;
 * nothing is persisted — U8 owns Save). Re-entering intake restarts the step
 * sequence at the first question; the data is intact, only the cursor resets.
 */
export default function IntakeApp({
  seed,
  hydrateFromVault = false,
  readOnly = false,
}: {
  seed?: string | null
  /** Decrypt-on-return: after a successful unlock, hydrate the result from the session's decrypted
   *  model instead of starting a fresh intake. App sets this on the post-unlock mount. */
  hydrateFromVault?: boolean
  /** The unlock opened READ-ONLY (a 2nd tab holds the writer — Fork C ii). App's standing View-only
   *  banner is the disclosure; the result surface must derive NO save CTA (a save can't land in this
   *  tab — session.save would refuse), so this is threaded into deriveResultSave. */
  readOnly?: boolean
}) {
  const [phase, setPhase] = useState<
    'restoring' | 'reentry' | 'intake' | 'result' | 'save' | 'restore-failed' | 'backup'
  >(hydrateFromVault ? 'restoring' : 'intake')
  // P3·U13 — the re-entry gate's composed state, set ONCE by the hydrate effect from the
  // RAW-decoded model (council constraint (a): staleness reads the vault's own stamps,
  // never the draft a later re-save would have re-stamped). `rulesMoved` outlives the gate —
  // it feeds the hero's standing staleness note for the whole session. RULES-moved, never
  // `anyStale` (ultramode 2026-07-09): a lapsed budget window is a calendar prompt on a
  // byte-identical recompute — "Some rules changed" there is a false claim on the hero.
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
  // IntakeFlow-LOCAL and the flow UNMOUNTS on the phase flip to 'result', so a Review remount
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
  const [recSaveCeremony, setRecSaveCeremony] = useState(false)
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
  const steps = useMemo(() => intakeSteps(snapshot.draft), [snapshot.draft])
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // The Save beat appears only when the draft is genuinely persistable (an indeterminate answer
  // can reach the result screen — the gate, not the screen, decides saveability).
  const saveReady = useMemo(() => scenarioFromDraft(snapshot.draft), [snapshot.draft])
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
   * `exposureForDraft` calls SIX separate params producers. On a `{kind:'unsaved'}` mount — every
   * `?seed=` route, the Caddie walk, `pnpm verify:fit` — there is no record to judge, so the honest
   * answer costs nothing and must COST nothing. `currentDraftFingerprint()` is never called bare in
   * a render body for the same reason.
   *
   * `!saveReady.ready ⇒ undefined` mirrors `deriveResultSave`'s own `!ready.ready ⇒ none`
   * (resultSave.ts:77): conjunct 3 needs a normalized household scenario to overlay the record's
   * era onto, and an unencodable answer has none.
   *
   * THE DATE-ROUTE CONJUNCT IS THE STRUCTURAL FORM OF Result.tsx's OWN SUPPRESSION.
   * `exposureForDraft` carries a hard prohibition — "DO NOT LIFT THIS FUNCTION TO A CROWNED
   * SURFACE… the base read WOULD lie there" (stalenessExposure.ts:81-84) — and on a date route it
   * takes exactly the arm that reads the PRE-SWEEP base ACA overlay (:150-155), while the result
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
    // enumeration → canon serialize) PLUS `exposureForDraft`'s six params producers on every single
    // keystroke-committed edit of the intake — for a card that cannot render until `result`.
    if (phase !== 'result') return undefined
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
  const retry = useCallback(() => void appModel.recompute(), [])
  // The reveal cadence, ONE seam (ultramode 2026-07-09 — it was open-coded at three sites):
  // reveal the magic moment on the FAST provisional tier, then sharpen to the final IN
  // PLACE — never block the reveal on the final-tier sweep (16k paths × candidates ≈ a
  // multi-second wait, far longer on a phone: it read as "never gets worked out"). The
  // await ORDER is load-bearing: the provisional must COMMIT (lower epoch) before the
  // final dispatches, or the final's epoch bump cancels the in-flight provisional and the
  // reveal is back to a bare blocking spinner. The result holds the provisional reading
  // while the final computes (no re-blank), then upgrades.
  const revealAndSharpen = useCallback(async () => {
    setPhase('result')
    await appModel.recompute('provisional')
    await appModel.recompute('final')
  }, [])
  const complete = useCallback(async () => {
    // The narrow period disarm's probe — the store's CURRENT draft, never the render closure
    // (insight 036: a commit-on-blur and the terminal Continue can share a task). If the
    // completed draft trips the spend-period gate on a no-touches/no-provenance evaluation,
    // the spend step can only have been advanced through an explicit period answer (the
    // provenance proof on periodAnswerProven above) — record it before the flow unmounts.
    if (
      validateDraft(appModel.getSnapshot().draft, PERIOD_PROBE_TOUCHED, {}).some(
        (v) => v.rule === 'spend-period-unconfirmed',
      )
    ) {
      setPeriodAnswerProven(true)
    }
    await revealAndSharpen()
  }, [revealAndSharpen])
  const review = useCallback(() => setPhase('intake'), [])

  // The PROPER edit-and-re-save (retires the U8-review ② interim sticky-`saved`): a same-session
  // edit re-saves through the writable()-gated `session.save()` UPDATE path — the keys are
  // resident, so there is no ceremony, and `firstSave`'s 'not-locked' dead-end is structurally
  // unreachable (deriveResultSave can never offer the ceremony once a vault exists). The gate
  // reads the store's CURRENT draft, never the render closure (insight 036 — a commit-on-blur
  // edit and this click can share a task). `session.save` is total over typed results and its
  // {ok:true} arm has no post-commit throw window (session.ts:574-593), so the catch below only
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
   * U17 §S5 — THE SAVE GESTURE FOR THE RECOMMENDATION ON SCREEN.
   *
   * THE ORDER IS THE WHOLE DESIGN: the mint is PROBED AND REFUSED BEFORE THE STORE IS TOUCHED, and
   * the store is touched before anything reaches disk. `scenarioCodec.ts:660-664` names this
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
      // (insight 100). `getVaultSession()` → `openVaultDb()` → idb's `openDB()` (db.ts:61-67) REJECTS
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
      recSavePrevRecord.current = s.draft.savedRecommendation
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
        setPhase('save')
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
    [readOnly, persist, recSaveInFlight, saveNow],
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
        // Unreachable for this app's own vaults (unlock just decoded a 2-person v3 we wrote), but the
        // type admits null / legacy / a non-two-person shape → refuse rather than render a wrong plan.
        if (model === null || model.schemaVersion !== 3) {
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
        const report = deriveStaleness(model, currentEpochDay(), exposureForDraft(hydrated.draft))
        setReentry({ view: composeReentry(model, report), rulesMoved: report.rulesMoved })
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
      <main className="save">
        <PendingPanel status={copy.restoringStatus} />
      </main>
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
      <main className="save">
        <section className="save-step">
          <h2 className="save-step__heading" tabIndex={-1}>
            {copy.unlockHeading}
          </h2>
          <p className="save-step__note" role="alert">
            {copy.unlockGeneric}
          </p>
          <div className="save-actions">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              {copy.restoreRetry}
            </button>
          </div>
        </section>
      </main>
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
            if (recSaveCeremony) {
              const prev = recSavePrevRecord.current
              recSavePrevRecord.current = undefined
              setRecSaveCeremony(false)
              appModel.update((d) => {
                if (prev !== undefined) return { ...d, savedRecommendation: prev }
                const { savedRecommendation: _minted, ...withoutRecord } = d
                return withoutRecord
              })
            }
            setPhase('result')
          }}
          onComplete={() => {
            // Record what the ceremony COMMITTED — the same render-captured scenario passed as
            // its prop (the save phase renders no edit surface, so it cannot have drifted).
            setPersist({ kind: 'saved', scenario: saveReady.scenario })
            // The record rode that scenario to disk, so the recommendation's save LANDED. It is
            // recorded as an EVENT rather than left to a view transition because this whole subtree
            // unmounts across the ceremony (the branch above returns before Result renders), so
            // nothing downstream can observe the change it would need to announce.
            if (recSaveCeremony) {
              recSavePrevRecord.current = undefined
              setRecSaveCeremony(false)
              setRecSaveLanded(true)
            }
            setPhase('result')
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
            setPhase('result')
          }}
          // The quiet escape: declining records nothing and keeps the door offered (needsBackup
          // stays true) — an invited offer is never a trap (ultramode 2026-07-03).
          onCancel={() => setPhase('result')}
        />
      </Suspense>
    )
  }

  if (phase === 'result' || phase === 'save') {
    const view = deriveResultSave(persist, saveReady, readOnly)
    // 'idle'/'pending' = NOTHING has ever resolved (the "Working it out…" window; `pending`
    // never recurs after a first resolve — memoryModel holds the last answer visible). Result
    // withholds its whole actions row there: an affordance we don't want used during the
    // crunch shouldn't exist (Briggsy, 2026-07-02). A compute-error is NOT computing — the
    // actions row (Review = fix the inputs) is that failure's remedy.
    const computing = snapshot.answer.kind === 'idle' || snapshot.answer.kind === 'pending'
    return (
      <Result
        onReview={review}
        computing={computing}
        save={
          view.kind === 'first'
            ? { kind: 'first', onKeep: () => setPhase('save') }
            : view.kind === 'dirty'
              ? { kind: 'dirty', onSave: () => void saveNow() }
              : view.kind === 'failed'
                ? { ...view, onRetry: () => void saveNow() }
                : view
        }
        // The re-offer backup door — present only when the hydrate armed it (writable + no note on
        // record). Tapping opens the 'backup' phase; the door dissolves once the ceremony records.
        backup={needsBackup ? { onSave: () => setPhase('backup') } : undefined}
        // U17 §S5 — THE STRATEGY SLOT. The view is DERIVED every frame from the seven operands, never
        // tracked: there is no success parameter in `deriveRecommendationSave`, so the only route to a
        // "saved" claim runs through the record the disk actually carries. `status` rides
        // `recordCard?.status` — the SAME trichotomy the card reads, so the slot and the card can never
        // disagree about one record. `landed` is the durability EVENT (the ceremony unmounts this whole
        // subtree, so the surface cannot observe the transition it must announce); acknowledging it
        // clears the flag, never the badge — the badge is disk-derived.
        recSave={{
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
        }}
        // The DISK's remembered recommendation + the store's verdict on it. Result composes the card
        // (it alone owns the invite predicate that decides whether a re-open door may exist at all).
        recordCard={recordCard}
        // P3·U13 — the standing hero staleness echo (session-lifetime once the gate derived
        // it). RULES-moved only — the gate's budget re-confirm lines never claim "rules changed".
        stalenessNote={reentry?.rulesMoved === true}
        // The aged-balances clause's honest year (review 2026-07-10): from the persist
        // machine's OWN saved scenario — a re-save or an in-session edit suppresses it
        // through the machine's state, never a second bookkeeping (resultSave.ts doc).
        agedBalancesYear={agedBalancesYearFor(persist, view, currentEpochDay())}
      />
    )
  }

  return (
    <IntakeFlow
      steps={steps}
      model={appModel}
      onComplete={complete}
      answerSlot={<AnswerStrip snapshot={snapshot} missing={missing} onRetry={retry} />}
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
