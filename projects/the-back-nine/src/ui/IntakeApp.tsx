import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { IntakeFlow } from '@intake/flow'
import { intakeSteps } from '@intake/questions'
import { AnswerStrip } from '@intake/AnswerStrip'
import { missingRequiredFacts } from '@intake/intakeMap'
import { validateDraft, type FieldPath } from '@intake/sanity'
import { appModel } from './appModel'
import { Result } from './Result'
import { scenarioFromDraft, currentEpochDay } from './scenarioFromDraft'
import { draftFromScenario } from './draftFromScenario'
import { agedBalancesYearFor, deriveResultSave, type PersistState } from './resultSave'
import { describeSaveFailure } from './unlockCopy'
import { PendingPanel } from './PendingPanel'
import { ReEntry } from './ReEntry'
import { composeReentry, type ReentryView } from './reentryChrome'
import { deriveStaleness } from '@store/staleness'
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
  const snapshot = useSyncExternalStore(appModel.subscribe, appModel.getSnapshot)
  const steps = useMemo(() => intakeSteps(snapshot.draft), [snapshot.draft])
  const missing = useMemo(() => missingRequiredFacts(snapshot.draft), [snapshot.draft])
  // The Save beat appears only when the draft is genuinely persistable (an indeterminate answer
  // can reach the result screen — the gate, not the screen, decides saveability).
  const saveReady = useMemo(() => scenarioFromDraft(snapshot.draft), [snapshot.draft])
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
  const resave = useCallback(async () => {
    const ready = scenarioFromDraft(appModel.getSnapshot().draft)
    if (!ready.ready) return
    setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'saving', scenario: p.scenario }))
    try {
      const { getVaultSession } = await import('./vaultSession')
      const session = await getVaultSession()
      const result = await session.save(ready.scenario)
      if (result.ok) {
        setPersist({ kind: 'saved', scenario: ready.scenario })
      } else {
        const errorKey = describeSaveFailure(result)
        setPersist((p) => (p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey }))
      }
    } catch {
      setPersist((p) =>
        p.kind === 'unsaved' ? p : { kind: 'save-failed', scenario: p.scenario, errorKey: 'saveErrorFailed' },
      )
    }
  }, [])

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
        // hydrated vault). A legacy vault (no savedAt on disk) seeds WITHOUT one — suppression
        // over fabrication. The dirty/clean compare is savedAt-blind (scenarioIdentity), so
        // the clean-badge law is untouched either way.
        const { savedAt: _freshStamp, ...diskIdentity } = normalized.scenario
        setPersist({
          kind: 'saved',
          scenario: model.savedAt !== undefined ? { ...diskIdentity, savedAt: model.savedAt } : diskIdentity,
        })
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
        const report = deriveStaleness(model, currentEpochDay())
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
          onCancel={() => setPhase('result')}
          onComplete={() => {
            // Record what the ceremony COMMITTED — the same render-captured scenario passed as
            // its prop (the save phase renders no edit surface, so it cannot have drifted).
            setPersist({ kind: 'saved', scenario: saveReady.scenario })
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
              ? { kind: 'dirty', onSave: () => void resave() }
              : view.kind === 'failed'
                ? { ...view, onRetry: () => void resave() }
                : view
        }
        // The re-offer backup door — present only when the hydrate armed it (writable + no note on
        // record). Tapping opens the 'backup' phase; the door dissolves once the ceremony records.
        backup={needsBackup ? { onSave: () => setPhase('backup') } : undefined}
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
