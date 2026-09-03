// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { Result, type ResultSaveProp } from '../Result'
import { copy } from '../copy'
import { appModel } from '../appModel'
import { DEV_SEEDS } from '../devSeeds'

/**
 * The Result screen's SAVE SLOT — the six-state rendering contract over the resultSave.ts
 * machine (which owns the derivation; this owns the wiring). The hero renders the fallback
 * AnswerStrip here (the module appModel is empty in jsdom) — the slot under test is
 * independent of the hero's state. Key laws: the pending line is a status (never blocks),
 * the refusal is an alert WITH a retry, and 'none' renders no slot at all (no claim).
 */
const pristineDraft = appModel.getSnapshot().draft
afterEach(() => {
  cleanup()
  appModel.update(() => pristineDraft) // the module singleton must not leak between tests
})

const renderSave = (save: ResultSaveProp) => render(<Result onReview={vi.fn()} save={save} computing={false} />)

describe('Result — the actions row is withheld while the answer computes', () => {
  it('while computing ("Working it out…"), NO actions render — no doors, no save slot, no badge (remove the opportunity, Briggsy 2026-07-02)', () => {
    render(<Result onReview={vi.fn()} save={{ kind: 'clean' }} computing />)
    expect(document.querySelector('.result-actions')).toBeNull()
    expect(screen.queryByRole('button', { name: copy.assumptionDoorCta })).toBeNull()
    expect(screen.queryByText(copy.savedBadge)).toBeNull()
  })

  it('once computing clears, the row appears as one beat — slot rendered; the Assumptions door still gates on a resolved-or-demoted answer (idle with NOTHING missing ⇒ withheld)', () => {
    // U12 (F4): the Review button left this row — the guided re-walk lives inside the
    // AssumptionPanel now (resultAssumptionsDoor.test.tsx owns the door + re-walk coverage).
    // A COMPLETE draft: idle here is the one-frame crunch window (nothing missing, nothing yet
    // dispatched), so the hatch offers no door — same law as its four siblings. This pin used to
    // run on the PRISTINE draft (every fact missing), which is the completed-intake DEAD END, not
    // the crunch — resultAssumptionsDoor.test.tsx now pins that frame the other way (2026-09-03).
    appModel.update(() => DEV_SEEDS.retired)
    render(<Result onReview={vi.fn()} save={{ kind: 'clean' }} computing={false} />)
    expect(document.querySelector('.result-actions')).not.toBeNull()
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.assumptionDoorCta })).toBeNull()
  })
})

describe('Result — the save slot states', () => {
  it("'none' renders NO slot: no badge, no CTA, no claim about a disk it can't compare", () => {
    renderSave({ kind: 'none' })
    expect(document.querySelector('.result-save-slot')).toBeNull()
    expect(screen.queryByText(copy.savedBadge)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.saveCta })).toBeNull()
  })

  it("'first' renders the ceremony CTA with its hint", () => {
    const onKeep = vi.fn()
    renderSave({ kind: 'first', onKeep })
    fireEvent.click(screen.getByRole('button', { name: copy.saveCta }))
    expect(onKeep).toHaveBeenCalledTimes(1)
    expect(screen.getByText(copy.saveCtaHint)).toBeInTheDocument()
  })

  it("'clean' renders the saved badge with its decorative mark — and no save button", () => {
    renderSave({ kind: 'clean' })
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument()
    expect(document.querySelector('.result-saved__mark')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('button', { name: copy.saveCta })).toBeNull()
    expect(screen.queryByRole('button', { name: copy.resaveCta })).toBeNull()
  })

  it("'dirty' renders the re-save CTA (NOT the ceremony CTA) with the unsaved-changes hint", () => {
    const onSave = vi.fn()
    renderSave({ kind: 'dirty', onSave })
    expect(screen.queryByRole('button', { name: copy.saveCta })).toBeNull() // never the ceremony
    fireEvent.click(screen.getByRole('button', { name: copy.resaveCta }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.getByText(copy.resaveHint)).toBeInTheDocument()
    expect(screen.queryByText(copy.savedBadge)).toBeNull() // a stale badge over an edited answer is the lie
  })

  it("'saving' renders the calm pending line — no buttons, never an alert", () => {
    renderSave({ kind: 'saving' })
    expect(screen.getByText(copy.resavePending)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: copy.resaveCta })).toBeNull()
  })

  it("a TRANSIENT failure renders the alert with a live retry (quota/write-failed can legitimately succeed)", () => {
    const onRetry = vi.fn()
    renderSave({ kind: 'failed', errorKey: 'saveErrorFailed', onRetry })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(copy.saveErrorFailed)
    fireEvent.click(screen.getByRole('button', { name: copy.exportRetry }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("the READ-ONLY failure offers RELOAD, never the futile Try-again (a retry deterministically re-refuses — the lying-remedy guard, ultramode 2026-07-02)", () => {
    const onRetry = vi.fn()
    renderSave({ kind: 'failed', errorKey: 'saveErrorReadOnly', onRetry })
    expect(screen.getByRole('alert').textContent).toBe(copy.saveErrorReadOnly)
    // The primary action must match the copy's own "Reload this page" instruction —
    // `secondTab` is captured once at unlock, so a re-run of resave() can never succeed.
    expect(screen.getByRole('button', { name: copy.restoreRetry })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy.exportRetry })).toBeNull()
  })

  it('ANNOUNCES the re-save transitions through the persistent region: →saving speaks the pending line, saving→clean speaks the badge (burned/045 — the swapped nodes mount populated and may not fire)', () => {
    const { rerender } = render(<Result onReview={vi.fn()} save={{ kind: 'dirty', onSave: vi.fn() }} />)
    const region = document.querySelector('.result > .sr-only[role="status"]')
    expect(region).not.toBeNull()
    expect(region).toBeEmptyDOMElement() // mounted BEFORE it speaks — the announce contract
    rerender(<Result onReview={vi.fn()} save={{ kind: 'saving' }} />)
    expect(region?.textContent).toBe(copy.resavePending)
    rerender(<Result onReview={vi.fn()} save={{ kind: 'clean' }} />)
    expect(region?.textContent).toBe(copy.savedBadge)
  })

  it('an edit-back clean (failed→clean, no save occurred) is deliberately SILENT — no durability event to announce', () => {
    const { rerender } = render(
      <Result onReview={vi.fn()} save={{ kind: 'failed', errorKey: 'saveErrorFailed', onRetry: vi.fn() }} />,
    )
    const region = document.querySelector('.result > .sr-only[role="status"]')
    rerender(<Result onReview={vi.fn()} save={{ kind: 'clean' }} />)
    expect(region).toBeEmptyDOMElement()
    expect(screen.getByText(copy.savedBadge)).toBeInTheDocument() // the visible badge still tells the truth
  })
})

describe('Result — the re-offer backup door (U8-tail: quiet, subordinate, present only with the prop)', () => {
  it('renders the quiet lead line + CTA and fires onSave', () => {
    const onSave = vi.fn()
    render(<Result onReview={vi.fn()} save={{ kind: 'clean' }} backup={{ onSave }} computing={false} />)
    expect(screen.getByText(copy.backupDoorLead)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: copy.backupDoorCta }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('ABSENT when the prop is absent — no line, no CTA (a household with a backup sees nothing)', () => {
    render(<Result onReview={vi.fn()} save={{ kind: 'clean' }} computing={false} />)
    expect(screen.queryByText(copy.backupDoorLead)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.backupDoorCta })).toBeNull()
  })

  it('WITHHELD while the answer computes — the door rides the actions row, gone during "Working it out…"', () => {
    render(<Result onReview={vi.fn()} save={{ kind: 'clean' }} backup={{ onSave: vi.fn() }} computing />)
    expect(screen.queryByText(copy.backupDoorLead)).toBeNull()
    expect(screen.queryByRole('button', { name: copy.backupDoorCta })).toBeNull()
  })
})
