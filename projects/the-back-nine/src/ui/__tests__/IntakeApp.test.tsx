// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * IntakeApp's read-only GLUE (Fork C ii) — the one link neither seam test reaches:
 * resultSave.test.ts pins `deriveResultSave(…, readOnly)` at the leaf, and App.test.tsx pins the
 * router's `entry.notice → readOnly` derivation against a props-echo stub — but nothing proved
 * IntakeApp actually FORWARDS its readOnly prop into the derivation (dropping the 3rd argument at
 * the call site left the whole suite green — ultramode 2026-07-03). Result is stubbed to an echo
 * of `save.kind`; the vault session and the engine recompute are faked so the hydrate path runs
 * REAL (currentModel → draftFromScenario → scenarioFromDraft → deriveResultSave) without the
 * engine graph.
 */

const h = vi.hoisted(() => ({ model: null as unknown }))
vi.mock('../vaultSession', () => ({
  getVaultSession: async () => ({ currentModel: () => h.model }),
}))
vi.mock('../Result', () => ({
  Result: ({ save }: { save: { kind: string } }) => <div data-save-kind={save.kind}>result stub</div>,
}))
// Props-echo for the intake phase (the bogus-seed provenance pin below) — the hydrate tests
// never mount it (they land on the Result phase).
vi.mock('@intake/flow', () => ({
  IntakeFlow: ({ periodConfirmed = false }: { periodConfirmed?: boolean }) => (
    <div data-period-confirmed={String(periodConfirmed)}>flow stub</div>
  ),
}))

import IntakeApp from '../IntakeApp'
import { appModel } from '../appModel'
import { scenarioFromDraft } from '../scenarioFromDraft'
import { DEV_SEEDS } from '../devSeeds'

// A complete, persistable household — the same fixture the seeds prove against the real engine.
const ready = scenarioFromDraft(DEV_SEEDS.retired)
if (!ready.ready) throw new Error('IntakeApp.test: the retired dev seed must build a persistable scenario')
h.model = ready.scenario

// The hydrate path awaits both recompute tiers; the derivation under test never reads the answer.
vi.spyOn(appModel, 'recompute').mockResolvedValue(undefined)

afterEach(cleanup)

describe('IntakeApp — the read-only verdict reaches deriveResultSave (Fork C ii glue)', () => {
  it('a READ-ONLY hydrated session derives NO save claim (kills the dropped-3rd-arg mutant)', async () => {
    render(<IntakeApp hydrateFromVault readOnly />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'none')
  })

  it('the WRITABLE twin derives the clean saved badge — the flag is the verdict, not a global mute', async () => {
    render(<IntakeApp hydrateFromVault />)
    const stub = await screen.findByText('result stub')
    expect(stub).toHaveAttribute('data-save-kind', 'clean')
  })
})

describe('IntakeApp — dev-seed provenance flips only on an APPLIED seed (the R19 disarm stays armed)', () => {
  it('a BOGUS `?seed=` key applies no draft and never disarms the spend-period force-confirm', async () => {
    const { act } = await import('@testing-library/react')
    render(<IntakeApp seed="not-a-real-seed-key" />)
    // Flush the dynamic devSeeds import + its early return (resolveDevSeed → null, no apply).
    await act(async () => {})
    await act(async () => {})
    const stub = screen.getByText('flow stub')
    expect(stub).toHaveAttribute('data-period-confirmed', 'false')
  })
})
