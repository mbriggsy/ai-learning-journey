// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { IncomeFormState } from '@intake/incomeForm'
import { compileIncomeStreams, survivorNoteFor } from '@intake/otherIncome'
import type { IncomeStream, IncomeType } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { DEV_SEEDS } from '../../../../devSeeds'
import { copy, slots, type CopyKey } from '../../../../copy'
import { profileStore } from '../../__tests__/profileStore'
import { DrawerFor } from '../../drawerHost'
import { incomeCardName } from '../../profileView'
import { saveEdit } from '../drawerSave'
import { buildOtherIncome, deleteOtherIncome, otherIncomeFormFrom, ownOtherIncomeField } from '../otherIncomeFields'

/**
 * The Other income drawer's honesty laws (Act 6 · RC14, ported from the walk's deleted `OtherIncomeEntry` test): the
 * drawer builds a stream through the walk's one decision tree (`incomeForm.ts`), so every no-safe-default fact still
 * blocks the Save, by name, under its field. A pension with no survivor share never commits (the optimistic-widow sin);
 * a stream already paying anchors at its OWNER's age; a fixed raise needs its rate and an out-of-range one never
 * commits; alimony's survivor share is 0 by law and its agreement date and change answer pass through; an annuity
 * needs its kind, and a non-qualified one its tax-free part; every share outside 0 to 100% is refused, never clamped.
 * The form's output compiles to the externally derived figures (DND 012), and the widow's number reads in words.
 * Nothing refused reaches the store and no recompute is sent.
 */
afterEach(cleanup)

const retired = DEV_SEEDS.retired // Alex 66 (owner 0) and Sam 65 (owner 1), both retired, no other income yet

const withStreams = (...incomeStreams: IncomeStream[]): ScenarioDraft => ({ ...retired, incomeStreams })

/** A new stream of `type`, as the Add menu opens it, with the facts every type asks: the amount, the timing, the raise. */
function newForm(type: IncomeType, p: Partial<IncomeFormState> = {}): IncomeFormState {
  return { ...otherIncomeFormFrom(retired, { type }), annualRealToday: 30_000, receivingNow: true, colaMode: 'real-flat', ...p }
}

/** The drawer's Save of a new stream, on the real store: the stream it commits, or the refusal by field (and then the
 *  store untouched, no recompute sent). */
function saveNew(form: IncomeFormState) {
  const { model, recompute } = profileStore(retired)
  const before = model.getSnapshot().draft
  const seed = otherIncomeFormFrom(before, { type: form.type ?? 'other' })
  const res = saveEdit(model, (d) => buildOtherIncome(d, 'new', seed, form), ownOtherIncomeField(before.incomeStreams.length))
  if (!res.saved) {
    expect(model.getSnapshot().draft).toBe(before)
    expect(recompute).not.toHaveBeenCalled()
    return { stream: undefined, refusal: res.check }
  }
  expect(recompute).toHaveBeenCalledTimes(1)
  const streams = model.getSnapshot().draft.incomeStreams
  expect(streams).toHaveLength(1)
  return { stream: streams[0], refusal: undefined }
}

const refusedOn = (fields: Record<string, CopyKey>) => ({
  fields: Object.fromEntries(Object.entries(fields).map(([k, key]) => [k, copy[key]])),
  elsewhere: [],
})

const PENSION: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 30_000, startAge: 66, colaMode: 'real-flat', survivorPct: 0.5 }

/** The drawer for the stream at index 0 of `draft`, opened on the real store. */
function openDrawer(draft: ScenarioDraft) {
  const store = profileStore(draft)
  render(<DrawerFor target={{ kind: 'income', index: 0 }} model={store.model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
  return { ...store, dialog: screen.getByRole('dialog', { name: incomeCardName(draft, draft.incomeStreams[0]!) }) }
}

/** Type as a person does: focus, the text, the blur that commits it. */
function type(field: HTMLElement, text: string) {
  act(() => field.focus())
  fireEvent.change(field, { target: { value: text } })
  act(() => field.blur())
}

/** Type `text` into the field labelled `label`, press Save: refused, its words under THAT field (aria-invalid, and its
 *  aria-describedby resolves to the alert, so the refusal is reachable on the field, never colour alone), the drawer
 *  open, the store untouched, nothing recomputed. */
function expectRefusedOnField(draft: ScenarioDraft, label: string, text: string, error: CopyKey) {
  const { model, recompute, dialog } = openDrawer(draft)
  const before = model.getSnapshot().draft
  const field = within(dialog).getByLabelText(label)
  type(field, text)
  fireEvent.click(within(dialog).getByRole('button', { name: copy.profileDrawerSave }))
  const alert = within(dialog).getByRole('alert')
  expect(alert).toHaveTextContent(copy[error])
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field.getAttribute('aria-describedby')?.split(' ') ?? []).toContain(alert.id)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(model.getSnapshot().draft).toBe(before)
  expect(recompute).not.toHaveBeenCalled()
}

describe('the drawer asks what each kind of income needs (the KTD-6 union as a form)', () => {
  it('a pension asks the survivor share, never an alimony date or an annuity kind', () => {
    const { dialog } = openDrawer(withStreams(PENSION))
    expect(within(dialog).getByLabelText(copy.incomeSurvivorLabel)).toBeInTheDocument()
    expect(within(dialog).queryByText(copy.incomeAlimonyDateLegend)).toBeNull()
    expect(within(dialog).queryByText(copy.incomeAnnuityKindLegend)).toBeNull()
  })

  it('alimony asks the agreement date and never a survivor share (0 by law); the change question only for a pre-2019 agreement', () => {
    const alimony = (executedAfter2018: boolean): IncomeStream =>
      executedAfter2018
        ? { ownerIndex: 0, type: 'alimony', executedAfter2018: true, annualRealToday: 18_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0 }
        : { ownerIndex: 0, type: 'alimony', executedAfter2018: false, modifiedAdoptsPost2018Rules: false, annualRealToday: 18_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0 }
    const pre = openDrawer(withStreams(alimony(false))).dialog
    expect(within(pre).queryByLabelText(copy.incomeSurvivorLabel)).toBeNull()
    expect(within(pre).getByText(copy.incomeAlimonyDateLegend)).toBeInTheDocument()
    expect(within(pre).getByText(copy.incomeAlimonyModifiedLegend)).toBeInTheDocument()
    cleanup()
    const post = openDrawer(withStreams(alimony(true))).dialog
    expect(within(post).getByText(copy.incomeAlimonyDateLegend)).toBeInTheDocument()
    expect(within(post).queryByText(copy.incomeAlimonyModifiedLegend)).toBeNull()
  })

  it('a non-qualified annuity asks its tax-free part; a qualified one, or one whose kind is not yet answered, does not', () => {
    const nonQual = openDrawer(
      withStreams({ ownerIndex: 0, type: 'annuity', qualified: false, exclusionFraction: 0.4, annualRealToday: 20_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0.5 }),
    ).dialog
    expect(within(nonQual).getByLabelText(copy.incomeExclusionLabel)).toBeInTheDocument()
    cleanup()
    const qual = openDrawer(
      withStreams({ ownerIndex: 0, type: 'annuity', qualified: true, annualRealToday: 20_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0.5 }),
    ).dialog
    expect(within(qual).queryByLabelText(copy.incomeExclusionLabel)).toBeNull()
    cleanup()
    const store = profileStore(retired)
    render(<DrawerFor target={{ kind: 'new-income', type: 'annuity' }} model={store.model} open readOnly={false} onClose={() => {}} onClosed={() => {}} finalFocus={() => null} />)
    const fresh = screen.getByRole('dialog')
    expect(within(fresh).getByText(copy.incomeAnnuityKindLegend)).toBeInTheDocument()
    expect(within(fresh).queryByLabelText(copy.incomeExclusionLabel)).toBeNull()
  })

  it('the set raise’s rate is asked only for a fixed raise', () => {
    expect(within(openDrawer(withStreams(PENSION)).dialog).queryByLabelText(copy.incomeColaPctLabel)).toBeNull()
    cleanup()
    const fixed = openDrawer(withStreams({ ...PENSION, colaMode: 'fixed-pct', colaPct: 0.02 })).dialog
    expect(within(fixed).getByLabelText(copy.incomeColaPctLabel)).toBeInTheDocument()
  })

  it('the start age is asked only for a stream that starts later; one paying now anchors at its owner’s age (KTD-8b)', () => {
    expect(within(openDrawer(withStreams({ ...PENSION, startAge: 62 })).dialog).queryByLabelText(copy.incomeStartAgeLabel)).toBeNull()
    cleanup()
    const later = openDrawer(withStreams({ ...PENSION, startAge: 70 })).dialog
    expect(within(later).getByLabelText(copy.incomeStartAgeLabel)).toBeInTheDocument()
  })
})

describe('no safe default: a Save commits a whole stream or nothing (R40.7)', () => {
  it('a pension with no survivor share never commits, and the refusal names it (the optimistic-widow sin)', () => {
    expect(saveNew(newForm('pension')).refusal).toEqual(refusedOn({ survivorPct: 'errIncomeSurvivorRequired' }))
  })

  // Milestone 3's review, X8: a last paying age before the first is no stream; refused under the end age, drawn.
  it('an end age before the start age never commits, its refusal under the end age (paying now starts at today’s age)', () => {
    expect(saveNew(newForm('pension', { receivingNow: false, startAge: 70, endAge: 68, survivorPct: 0.5 })).refusal).toEqual(refusedOn({ endAge: 'errIncomeEndBeforeStart' }))
    expect(saveNew(newForm('pension', { endAge: 60, survivorPct: 0.5 })).refusal).toEqual(refusedOn({ endAge: 'errIncomeEndBeforeStart' }))
    expect(saveNew(newForm('pension', { receivingNow: false, startAge: 70, endAge: 70, survivorPct: 0.5 })).stream).toMatchObject({ startAge: 70, endAge: 70 })
    expectRefusedOnField(withStreams(PENSION), copy.incomeEndAgeLabel, '60', 'errIncomeEndBeforeStart')
  })

  // Milestone 3's review, G2: the two choices a Save needs are announced up front, never only by a refusal.
  it('the timing and the inflation choices carry aria-required', () => {
    const { dialog } = openDrawer(withStreams(PENSION))
    expect(within(dialog).getByRole('combobox', { name: copy.incomeTimingLegend })).toHaveAttribute('aria-required', 'true')
    expect(within(dialog).getByRole('combobox', { name: copy.incomeColaLegend })).toHaveAttribute('aria-required', 'true')
  })

  // Milestone 3's review, X7: "paying now" with no birth year refused on the drawn timing box, naming the birth year.
  it('"paying now" with no birth year is refused under the timing (drawn), naming the owner’s birth year, never an undrawn start age', () => {
    const { birthYear: _b, currentAge: _a, ...sam } = retired.people[1]
    const noBirth: ScenarioDraft = { ...retired, people: [retired.people[0], sam] }
    const { model } = profileStore(noBirth)
    const seed = otherIncomeFormFrom(noBirth, { type: 'pension' })
    const res = saveEdit(model, (d) => buildOtherIncome(d, 'new', seed, { ...seed, ownerIndex: 1, annualRealToday: 9_000, receivingNow: true, colaMode: 'real-flat', survivorPct: 0.5 }), ownOtherIncomeField(0))
    expect(res.saved).toBe(false)
    if (res.saved) return
    expect(res.check.fields).toEqual({ timing: slots.profileBirthYearFirst('Sam’s', true) })
  })

  it('a stream paying now anchors at its OWNER’s current age, never a typed start age or the other person’s (KTD-8b)', () => {
    const { stream } = saveNew(newForm('pension', { ownerIndex: 1, startAge: 70, survivorPct: 0.5 }))
    expect(stream).toMatchObject({ ownerIndex: 1, type: 'pension', annualRealToday: 30_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5 })
  })

  it('a fixed raise with no rate never commits, and the refusal names the rate (never coerced to 0)', () => {
    expect(saveNew(newForm('pension', { colaMode: 'fixed-pct', survivorPct: 1 })).refusal).toEqual(refusedOn({ colaPct: 'errIncomeColaPct' }))
  })

  it('a fixed raise of 30% a year never commits (the never-deplete sin), its refusal under the rate', () => {
    expectRefusedOnField(withStreams({ ...PENSION, colaMode: 'fixed-pct', colaPct: 0.03 }), copy.incomeColaPctLabel, '30', 'errIncomeColaRange')
  })

  it('a real 3% raise commits: the ceiling is generous, never over-strict', () => {
    expect(saveNew(newForm('pension', { colaMode: 'fixed-pct', colaPct: 0.03, survivorPct: 1 })).stream).toMatchObject({ colaMode: 'fixed-pct', colaPct: 0.03 })
  })

  it('post-2018 alimony commits a survivor share of 0, derived by law, carrying its agreement date', () => {
    const { stream } = saveNew(newForm('alimony', { colaMode: 'nominal-flat', executedAfter2018: true }))
    expect(stream).toMatchObject({ type: 'alimony', executedAfter2018: true, survivorPct: 0 })
  })

  it('a pre-2019 alimony commits executedAfter2018 false and, unchanged, the old rules (taxable, seen by the income tests)', () => {
    const { stream } = saveNew(newForm('alimony', { colaMode: 'nominal-flat', executedAfter2018: false }))
    expect(stream).toMatchObject({ type: 'alimony', executedAfter2018: false, modifiedAdoptsPost2018Rules: false, survivorPct: 0 })
  })

  it('a pre-2019 alimony expressly changed to the new rules commits modifiedAdoptsPost2018Rules true', () => {
    const { stream } = saveNew(newForm('alimony', { colaMode: 'nominal-flat', executedAfter2018: false, modifiedAdoptsPost2018Rules: true }))
    expect(stream).toMatchObject({ type: 'alimony', executedAfter2018: false, modifiedAdoptsPost2018Rules: true })
  })

  it('alimony with its agreement date unanswered never commits', () => {
    expect(saveNew(newForm('alimony', { colaMode: 'nominal-flat' })).refusal).toEqual(refusedOn({ alimonyDate: 'errIncomeAlimonyDateRequired' }))
  })

  it('a non-qualified annuity needs its tax-free part to commit, then commits it', () => {
    const form = newForm('annuity', { colaMode: 'nominal-flat', survivorPct: 0.5, annuityQualified: false })
    expect(saveNew(form).refusal).toEqual(refusedOn({ exclusionFraction: 'errIncomeExclusionRequired' }))
    expect(saveNew({ ...form, exclusionFraction: 0.4 }).stream).toMatchObject({ type: 'annuity', qualified: false, exclusionFraction: 0.4 })
  })

  it('a qualified annuity commits qualified true with NO tax-free part, even one left from a non-qualified answer (fully taxable)', () => {
    const { stream } = saveNew(newForm('annuity', { colaMode: 'nominal-flat', survivorPct: 0.5, annuityQualified: true, exclusionFraction: 0.4 }))
    expect(stream).toMatchObject({ type: 'annuity', qualified: true })
    expect(stream).not.toHaveProperty('exclusionFraction')
  })

  it('an annuity with qualified-or-not unanswered never commits, and the refusal names it', () => {
    expect(saveNew(newForm('annuity', { colaMode: 'nominal-flat', survivorPct: 0.5 })).refusal).toEqual(refusedOn({ annuityKind: 'errIncomeAnnuityKindRequired' }))
  })

  it('a stream that starts later commits the ENTERED start age, not the owner’s (the KTD-8b complement)', () => {
    expect(saveNew(newForm('pension', { receivingNow: false, startAge: 70, survivorPct: 0.5 })).stream).toMatchObject({ startAge: 70 })
  })

  it('the age it stops and its taxable part commit as entered (never lifetime, never fully taxable by a dropped field)', () => {
    expect(saveNew(newForm('pension', { survivorPct: 0.5, endAge: 82, taxableFraction: 0.8 })).stream).toMatchObject({ endAge: 82, taxableFraction: 0.8 })
  })
})

describe('the range gate: a share outside 0 to 100% is refused under its field, never clamped', () => {
  it('a survivor share of 150% never commits (the optimistic widow)', () => {
    expectRefusedOnField(withStreams(PENSION), copy.incomeSurvivorLabel, '150', 'errIncomeSurvivorRange')
  })

  it('a survivor share of exactly 100% commits (the full-continuation widow)', () => {
    expect(saveNew(newForm('pension', { survivorPct: 1 })).stream).toMatchObject({ survivorPct: 1 })
  })

  it('a tax-free part of 120% never commits (it would drive the taxable part negative)', () => {
    expectRefusedOnField(
      withStreams({ ownerIndex: 0, type: 'annuity', qualified: false, exclusionFraction: 0.4, annualRealToday: 20_000, startAge: 66, colaMode: 'nominal-flat', survivorPct: 0.5 }),
      copy.incomeExclusionLabel,
      '120',
      'errIncomeExclusionRange',
    )
  })

  it('a taxable part of 150% never commits, its field in plain view (no folded tier to hide it)', () => {
    expectRefusedOnField(withStreams(PENSION), copy.incomeTaxableLabel, '150', 'errIncomeTaxableRange')
  })

  it('a Save with the survivor share cleared names the missing fact under its field, never a silent dead button', () => {
    expectRefusedOnField(withStreams(PENSION), copy.incomeSurvivorLabel, '', 'errIncomeSurvivorRequired')
  })
})

describe('the list: an edit keeps its place, Delete removes it, and the widow’s number reads in words', () => {
  it('Sam’s pension at a 50% survivor share reads as what Alex would keep, never a raw 0.5', () => {
    const { stream } = saveNew(newForm('pension', { ownerIndex: 1, annualRealToday: 24_000, survivorPct: 0.5 }))
    expect(stream).toMatchObject({ ownerIndex: 1, type: 'pension', survivorPct: 0.5 })
    const note = survivorNoteFor(retired, stream!)
    expect(note).toBe(slots.incomeSurvivorNote('Alex', 'Sam', 0.5))
    expect(note).not.toMatch(/0\.5/)
  })

  it('an edit replaces the stream in its own place; Delete takes it off the list', () => {
    const rental: IncomeStream = { ownerIndex: 0, type: 'rental', annualRealToday: 18_000, startAge: 66, colaMode: 'real-flat', survivorPct: 1 }
    const draft = withStreams(rental, PENSION)
    expect(survivorNoteFor(draft, rental)).toBe(slots.incomeSurvivorNote('Sam', 'Alex', 1))
    const { model } = profileStore(draft)
    const seed = otherIncomeFormFrom(draft, { index: 0 })
    const res = saveEdit(model, (d) => buildOtherIncome(d, 0, seed, { ...seed, annualRealToday: 20_000 }), ownOtherIncomeField(0))
    expect(res.saved).toBe(true)
    expect(model.getSnapshot().draft.incomeStreams).toEqual([{ ...rental, annualRealToday: 20_000 }, PENSION])
    expect(deleteOtherIncome(model.getSnapshot().draft, 0).incomeStreams).toEqual([PENSION])
  })
})

// A bridge to the compile (U2): a stream committed through the form compiles to
// the correct two-variant leaf — proving the FORM output is engine-consumable.
describe('the form output is engine-consumable (form → compileIncomeStreams)', () => {
  it('a 50%-survivor real-flat pension compiles to a half-weight survivor variant (EXTERNALLY-derived golden)', () => {
    // The exact shape the form commits for "Jane, pension, $24k, receiving now, real-flat, 50% survivor".
    const s: IncomeStream = { ownerIndex: 1, type: 'pension', annualRealToday: 24_000, startAge: 65, colaMode: 'real-flat', survivorPct: 0.5 }
    const out = compileIncomeStreams([s], [66, 65], 6, 0.03)!
    const leaf = out.incomeByPerson[1]!
    // Hand-derived (DND/012): real-flat holds 24_000 every year; survivor = ×0.5 = 12_000.
    expect(leaf.grossFull!.every((v) => v === 24_000)).toBe(true)
    expect(leaf.grossSurvivor!.every((v) => v === 12_000)).toBe(true)
    expect(leaf.taxableFull!.every((v) => v === 24_000)).toBe(true) // pension fully taxable (default)
    expect(out.incomeByPerson[0]).toEqual({}) // Jim has no stream
  })

  it('a teacher’s-pension shape (nominal-flat, 60% survivor) — the COLA-DEFLATION × survivor MAGNITUDE oracle (DND/012)', () => {
    // The most dangerous number in the app: a wife's teacher pension, no COLA (nominal-flat ⇒ erodes
    // in real terms), 60% survivor. Hand-derived by an INDEPENDENT path — NOT by running the compile:
    //   real[t] = 36000 / 1.03^t  (nominal-flat ⇒ pure deflation at the 0.03 point estimate)
    //     t=0: 36000
    //     t=1: 36000 / 1.03            = 34951.456310679610...  (computed long-hand, cross-checked
    //     t=2: 36000 / 1.03^2          = 33933.452728815156...   against the recurrence real[t] =
    //     t=3: 36000 / 1.03^3          = 32945.099736713744...   real[t-1] / 1.03, agreeing to 1e-6)
    //   survivor[t] = real[t] × 0.60   (the per-stream survivor weight, KTD-4)
    const s: IncomeStream = { ownerIndex: 0, type: 'pension', annualRealToday: 36_000, startAge: 60, colaMode: 'nominal-flat', survivorPct: 0.6 }
    const leaf = compileIncomeStreams([s], [66, 65], 4, 0.03)!.incomeByPerson[0]!
    expect(leaf.grossFull![0]).toBe(36_000) // the KTD-8b anchor (already-receiving)
    expect(leaf.grossFull![1]).toBeCloseTo(34_951.456311, 5)
    expect(leaf.grossFull![2]).toBeCloseTo(33_933.452729, 5)
    expect(leaf.grossFull![3]).toBeCloseTo(32_945.099737, 5)
    // The widow's magnitude: 60% of the deflating curve, per-stream weighted.
    expect(leaf.grossSurvivor![0]).toBeCloseTo(21_600, 5) // 36000 × 0.6
    expect(leaf.grossSurvivor![1]).toBeCloseTo(20_970.873786, 5) // 34951.4563… × 0.6
    expect(leaf.grossSurvivor![3]).toBeCloseTo(19_767.059842, 5) // 32945.0997… × 0.6
  })
})
