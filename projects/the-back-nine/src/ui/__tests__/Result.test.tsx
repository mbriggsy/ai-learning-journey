// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { Result, type ResultSaveProp } from '../Result'
import { copy } from '../copy'

/**
 * The Result screen's SAVE SLOT — the six-state rendering contract over the resultSave.ts
 * machine (which owns the derivation; this owns the wiring). The hero renders the fallback
 * AnswerStrip here (the module appModel is empty in jsdom) — the slot under test is
 * independent of the hero's state. Key laws: the pending line is a status (never blocks),
 * the refusal is an alert WITH a retry, and 'none' renders no slot at all (no claim).
 */
afterEach(cleanup)

const renderSave = (save: ResultSaveProp) => render(<Result onReview={vi.fn()} save={save} />)

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
