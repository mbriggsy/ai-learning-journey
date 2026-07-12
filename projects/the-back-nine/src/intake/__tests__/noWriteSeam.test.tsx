// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useMemo, useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { IntakeFlow } from '../flow'
import { intakeSteps } from '../questions'
import { AnswerStrip } from '../AnswerStrip'
import { missingRequiredFacts } from '../intakeMap'
import { createMemoryModel, type MemoryModel } from '@store/memoryModel'
import { openVaultDb, writeVault, clearVault } from '@store/db'
import type { EngineClient } from '@store/engineClient'
import { copy } from '@ui/copy'

/**
 * THE NO-IndexedDB-WRITE-UNTIL-SAVE SEAM (D1's privacy tripwire, asserted
 * against U4's REAL store layer on fake-indexeddb — never a stub, which would
 * be vacuously green; the planted arm proves the probe detects a real write
 * through db.ts, the same vacuity-control pattern as the CSP e2e).
 *
 * Today these branches write nothing because no unkeyed write path exists
 * (U4 enforces it structurally) — the battery exists so a future local
 * draft/resume path fails LOUD rather than silently shipping cleartext intake
 * to disk. Branches: the household preamble (preamble-only checkpoint), the
 * account loop, an R19 error branch, back-navigation, and a mid-intake
 * abandon (unmount).
 */

const nullClient: EngineClient = {
  runningInWorker: true,
  engine: {
    ping: async () => 'pong' as const,
    run: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
    setLatestEpoch: async () => {},
    runDateSearch: async () => ({ kind: 'date-search', outcome: { kind: 'cancelled' } }) as const,
    runTwoArm: async () => ({ kind: 'calm-error', reason: 'unused' }) as const,
  },
}

function freshModel(): MemoryModel {
  return createMemoryModel({
    client: nullClient,
    builders: { buildSpineParams: () => null, buildDateInput: () => null },
    mintSeed: () => 1,
    startCalendarYear: 2026,
  })
}

function Harness({ model }: { model: MemoryModel }) {
  const snap = useSyncExternalStore(model.subscribe, model.getSnapshot)
  const steps = useMemo(() => intakeSteps(snap.draft), [snap.draft])
  const missing = useMemo(() => missingRequiredFacts(snap.draft), [snap.draft])
  return (
    <IntakeFlow
      steps={steps}
      model={model}
      answerSlot={<AnswerStrip snapshot={snap} missing={missing} onRetry={() => {}} />}
    />
  )
}

/** The probe: any database existing at all is a write (the vault DB is created
 *  on first open-for-write; intake must never cause one to exist). */
async function databaseNames(): Promise<string[]> {
  const dbs = await indexedDB.databases()
  return dbs.map((d) => d.name ?? '<unnamed>')
}

const setMoney = (label: string, value: string, index = 0) => {
  const input = screen.getAllByLabelText(label)[index]!
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

afterEach(cleanup)

describe('the no-write-until-Save seam (against the REAL store layer)', () => {
  it('PLANTED CONTROL: a real write through db.ts IS detected by the probe (non-vacuous)', async () => {
    expect(await databaseNames()).toEqual([])
    const db = await openVaultDb()
    const bytes = (n: number) => new Uint8Array([n, n, n])
    await writeVault(db, {
      model: { iv: bytes(1), ciphertext: bytes(2) },
      passphraseWrap: { salt: bytes(3), iv: bytes(4), wrappedDataKey: bytes(5) },
      recoveryWrap: { salt: bytes(6), iv: bytes(7), wrappedDataKey: bytes(8) },
    })
    expect(await databaseNames()).not.toEqual([]) // the probe CAN fail
    await clearVault(db)
    db.close()
    // Deleting the database returns the world to the no-write baseline for the
    // real arms below (fake-indexeddb is per-process global).
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('the-back-nine-vault')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error as Error)
    })
    expect(await databaseNames()).toEqual([])
  })

  it('the FULL branch set leaves IndexedDB untouched: preamble-only checkpoint, error branch, back-nav, account loop, abandon', async () => {
    const model = freshModel()
    const { unmount } = render(<Harness model={model} />)

    // --- preamble entry (per-person facts; the preamble-only checkpoint) ---
    setMoney(copy.birthYearLabel, '1961', 0)
    setMoney(copy.birthYearLabel, '1963', 1)
    fireEvent.click(screen.getAllByLabelText(copy.sexMale)[0]!)
    fireEvent.click(screen.getAllByLabelText(copy.sexFemale)[1]!)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → work

    // R19 error branch: retired with a FUTURE stop age (blocks; role=alert).
    fireEvent.click(screen.getAllByLabelText(copy.workStatusRetired)[0]!)
    setMoney(copy.stopAgeLabel, '66')
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(await databaseNames()).toEqual([]) // the error branch wrote nothing

    // Correct it; spouse retired too; advance.
    setMoney(copy.stopAgeLabel, '63')
    fireEvent.click(screen.getAllByLabelText(copy.workStatusRetired)[1]!)
    setMoney(copy.stopAgeLabel, '61', 1)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → ss

    // Back-nav (answers kept; nothing written).
    fireEvent.click(screen.getByRole('button', { name: copy.flowBack }))
    expect(await databaseNames()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → ss again

    // PREAMBLE-ONLY CHECKPOINT: per-person facts entered, zero accounts ⇒ zero writes.
    expect(await databaseNames()).toEqual([])

    // --- through spend into the account loop ---
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // ss → spend
    setMoney(copy.spendLabel, '7000')
    fireEvent.click(screen.getByLabelText(copy.periodMonth)) // explicit period
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → health
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → oop
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → irmaa seed (65 ⇒ shown)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → medicare extras (the fork — optional-with-average, advancing blank is legal)
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // → accounts

    fireEvent.click(screen.getByRole('button', { name: copy.addAccount }))
    fireEvent.click(screen.getByLabelText(copy.kindRothIra))
    setMoney(copy.accountValueLabel, '250000')
    fireEvent.click(screen.getByRole('button', { name: copy.accountSave }))
    expect(model.getSnapshot().draft.enteredAccounts).toHaveLength(1)
    expect(await databaseNames()).toEqual([]) // the account loop wrote nothing

    // --- the R40 other-income loop (committing a real stream against the REAL store) ---
    fireEvent.click(screen.getByRole('button', { name: copy.flowNext })) // accounts → other-income
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(copy.qOtherIncomeHeading)
    fireEvent.click(screen.getByRole('button', { name: copy.addOtherIncome }))
    // A pension the household already receives, with a real survivor share — a
    // genuine commit, the most sensitive number in the app (the widow's picture).
    fireEvent.click(screen.getByLabelText(copy.incomeTypePension))
    setMoney(copy.incomeAmountLabel, '30000')
    fireEvent.click(screen.getByLabelText(copy.incomeTimingNow))
    fireEvent.click(screen.getByLabelText(copy.incomeColaReal))
    setMoney(copy.incomeSurvivorLabel, '50')
    fireEvent.click(screen.getByRole('button', { name: copy.otherIncomeSave }))
    expect(model.getSnapshot().draft.incomeStreams).toHaveLength(1)
    expect(await databaseNames()).toEqual([]) // the income loop wrote nothing either

    // --- mid-intake abandon: unmount with a half-entered household ---
    unmount()
    expect(await databaseNames()).toEqual([]) // park-and-resume is in-session only
  })
})
