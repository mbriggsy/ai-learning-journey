import { useState, type ReactNode } from 'react'
import { copy, slots } from '@ui/copy'
import type { PersonDraft, ScenarioDraft } from '@store/memoryModel'
import type { WorkStatus } from '@shared/model'
import { fraMonthsForBirthYear } from '@engine/constants/socialSecurity'
import { CurrencyField, IntegerField, NameField, SegmentedControl, formatMoney } from './fields'
import { FieldError } from './FieldError'
import { accountField, personField, SS_CLAIM_MIN, SS_CLAIM_MAX } from './sanity'
import { AccountEntry, kindLabel } from './AccountEntry'
import { OtherIncomeEntry, incomeTypeLabel, survivorNoteFor } from './OtherIncomeEntry'
import { ExternalLink } from './ExternalLink'
import { EXTERNAL_LINKS } from './links'
import { OOP_MEDICAL_TYPICAL_HOUSEHOLD } from './referenceData'
import type { StepApi, StepDef } from './flow'

/**
 * The household PREAMBLE (D1): everything asked BEFORE the account loop, so
 * `validateParams` acceptance — and the first provisional answer — is reachable
 * as soon as the first account lands (the spend figure and the ACA questions
 * deliberately ride the preamble for exactly that reason; a planted
 * question-after-the-loop ordering fails the surface-early test).
 *
 * The step list is DERIVED from the draft (conditional gates below), so it
 * recomputes as answers land; the flow clamps its index if a back-nav edit
 * shrinks the sequence.
 *
 * Conditional gates:
 *  - income           ⇐ any person ASKED-working;
 *  - health quote     ⇐ any person under 65 (or age unanswered) — everyone-65+
 *                       needs no ACA inputs (the per-person Medicare onset
 *                       machinery suffices, §0 exception);
 *  - working income   ⇐ any person ASKED-working (the §3b IRMAA override
 *                       source — a RETURN income figure, never a salary echo);
 *  - IRMAA seed       ⇐ any person 64+ (Medicare's 2-year lookback can reach
 *                       pre-sim tax years; the engine's own coverage rule is
 *                       the backstop if this gate ever under-asks).
 *
 * Work-status drives the branch (asked, never inferred): RETIRED ⇒ the stop
 * age is asked (≤ currentAge legitimate — the status-conditional R19 rule) and
 * the now-inapplicable facts are ZEROED (salary, the working-year figure);
 * WORKING ⇒ no retirement-date question exists anywhere — the date IS the
 * product's answer (intakeMap constructs the placeholder at param-build; the
 * draft never stores one, so a placeholder can never masquerade as entered).
 */

const updatePerson = (
  api: StepApi,
  index: 0 | 1,
  patch: Partial<PersonDraft>,
): void => {
  api.update((d) => {
    const people: [PersonDraft, PersonDraft] = [{ ...d.people[0] }, { ...d.people[1] }]
    people[index] = { ...people[index], ...patch }
    return { ...d, people }
  })
}

const legendFor = (draft: ScenarioDraft, index: 0 | 1): string =>
  draft.people[index].name ?? (index === 0 ? copy.personYou : copy.personSpouse)

/** Paired two-person screen: one fieldset per spouse, the pairing programmatic
 *  (legend = the entered name), never two near-identical sequential screens.
 *  `include` drops a person the question doesn't apply to ENTIRELY — an empty
 *  named group with a dangling divider reads as a broken screen. */
function Paired({
  api,
  render,
  include = () => true,
}: {
  api: StepApi
  render: (person: PersonDraft, index: 0 | 1) => ReactNode
  include?: (person: PersonDraft, index: 0 | 1) => boolean
}) {
  return (
    <>
      {([0, 1] as const)
        .filter((i) => include(api.draft.people[i], i))
        .map((i) => (
          <fieldset className="person-group" key={i}>
            <legend className="person-legend">{legendFor(api.draft, i)}</legend>
            {render(api.draft.people[i], i)}
          </fieldset>
        ))}
    </>
  )
}

const errorsFor = (api: StepApi, field: string): ReactNode =>
  api
    .violationsFor(field)
    .map((v) => <FieldError key={v.rule} field={v.field} messageKey={v.messageKey} />)

// ---------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------

const namesStep: StepDef = {
  id: 'names',
  headingKey: 'qNamesHeading',
  fields: [personField(0, 'birthYear'), personField(1, 'birthYear')],
  render: (api) => (
    <Paired
      api={api}
      render={(p, i) => (
        <>
          <NameField
            labelKey="nameLabel"
            value={p.name}
            autoCompleteToken={i === 0 ? 'given-name' : 'off'}
            onCommit={(name) => updatePerson(api, i, { name })}
          />
          <IntegerField
            labelKey="birthYearLabel"
            placeholderKey="birthYearPlaceholder"
            field={personField(i, 'birthYear')}
            value={p.birthYear}
            invalid={api.violationsFor(personField(i, 'birthYear')).length > 0}
            onEdit={() => api.clearTouched(personField(i, 'birthYear'))}
            onCommit={(birthYear) => {
              // currentAge derives ONCE here (whole-year convention — the same
              // ±1yr birth-month approximation PersonAccounts.birthYear pins).
              updatePerson(api, i, {
                birthYear,
                currentAge:
                  birthYear === undefined ? undefined : api.draft.startCalendarYear - birthYear,
              })
              api.commitField(personField(i, 'birthYear'))
            }}
          />
          {errorsFor(api, personField(i, 'birthYear'))}
          {/* Sex selects the SSA cohort curve per spouse (the joint-and-survivor
              math is sex-specific) — collected, never implicit (U5 contract; an
              implicit value would be a hidden R7 assumption AND a correctness bug
              on the product's core survivor case). */}
          <SegmentedControl<'male' | 'female'>
            legendKey="sexLegend"
            name={`sex-${i}`}
            options={[
              { value: 'male', labelKey: 'sexMale' },
              { value: 'female', labelKey: 'sexFemale' },
            ]}
            value={p.sex}
            onChange={(sex) => updatePerson(api, i, { sex })}
          />
          <p className="field-help">{copy.sexHelp}</p>
        </>
      )}
    />
  ),
}

const workStep: StepDef = {
  id: 'work',
  headingKey: 'qWorkHeading',
  fields: [personField(0, 'retirementAge'), personField(1, 'retirementAge')],
  render: (api) => (
    <Paired
      api={api}
      render={(p, i) => (
        <>
          <SegmentedControl<WorkStatus>
            legendKey="workStatusLegend"
            name={`work-${i}`}
            options={[
              { value: 'working', labelKey: 'workStatusWorking' },
              { value: 'retired', labelKey: 'workStatusRetired' },
            ]}
            value={p.workStatus}
            onChange={(workStatus) => {
              if (workStatus === 'working') {
                // No retirement date exists for a still-working person — clear
                // any stale stop age and re-open the salary question.
                updatePerson(api, i, {
                  workStatus,
                  retirementAge: undefined,
                  earnedIncomeReal: undefined,
                })
              } else {
                // Retired: the inapplicable facts are ZEROED (engine-inert),
                // never left to dangle as absent-required.
                updatePerson(api, i, { workStatus, earnedIncomeReal: 0 })
              }
            }}
          />
          {p.workStatus === 'retired' && (
            <>
              <IntegerField
                labelKey="stopAgeLabel"
                helpKey="stopAgeHelp"
                field={personField(i, 'retirementAge')}
                value={p.retirementAge}
                invalid={api.violationsFor(personField(i, 'retirementAge')).length > 0}
                onEdit={() => api.clearTouched(personField(i, 'retirementAge'))}
                onCommit={(retirementAge) => {
                  updatePerson(api, i, { retirementAge })
                  api.commitField(personField(i, 'retirementAge'))
                }}
              />
              {errorsFor(api, personField(i, 'retirementAge'))}
            </>
          )}
        </>
      )}
    />
  ),
}

const incomeStep: StepDef = {
  id: 'income',
  headingKey: 'qIncomeHeading',
  fields: [],
  render: (api) => (
    <Paired
      api={api}
      include={(p) => p.workStatus === 'working'}
      render={(p, i) => (
        <CurrencyField
          labelKey="salaryLabel"
          helpKey="salaryHelp"
          field={personField(i, 'earnedIncomeReal')}
          value={p.earnedIncomeReal}
          onCommit={(earnedIncomeReal) => updatePerson(api, i, { earnedIncomeReal })}
        />
      )}
    />
  ),
}

const ssStep: StepDef = {
  id: 'social-security',
  headingKey: 'qSsHeading',
  // pia is listed so the PIA-ceiling rule (the 12× monthly-vs-yearly misentry
  // guard) gates advance alongside the claim window.
  fields: [
    personField(0, 'pia'),
    personField(1, 'pia'),
    personField(0, 'socialSecurityClaimAge'),
    personField(1, 'socialSecurityClaimAge'),
  ],
  render: (api) => (
    <>
      <Paired
        api={api}
        render={(p, i) => {
          // FRA is a fact of birthYear (the SSA table) — echo it so the user can
          // confirm the monthly figure they're copying is the at-FRA one, and so
          // "full retirement age" in the label is concrete. Guard the domain the
          // engine fn requires (it throws out of range): a transient bad birthYear
          // shows no echo rather than crashing the render.
          const fraMonths =
            p.birthYear !== undefined &&
            Number.isInteger(p.birthYear) &&
            p.birthYear >= 1900 &&
            p.birthYear <= 2200
              ? fraMonthsForBirthYear(p.birthYear, 'retirement')
              : undefined
          return (
          <>
            {/* The statement states a MONTHLY figure; the model stores annual pia,
                so display pia/12 and commit ×12 (the canonical-period discipline,
                mirroring spendStep). The PIA-ceiling rule catches a yearly figure
                fat-fingered into the monthly field. */}
            <CurrencyField
              labelKey="ssAmountLabel"
              helpKey="ssAmountHelp"
              field={personField(i, 'pia')}
              value={p.pia === undefined ? undefined : p.pia / 12}
              invalid={api.violationsFor(personField(i, 'pia')).length > 0}
              onEdit={() => api.clearTouched(personField(i, 'pia'))}
              onCommit={(monthly) => {
                updatePerson(api, i, { pia: monthly === undefined ? undefined : monthly * 12 })
                api.commitField(personField(i, 'pia'))
              }}
            />
            {fraMonths !== undefined && (
              <p className="field-help">{slots.fraEcho(fraMonths)}</p>
            )}
            {errorsFor(api, personField(i, 'pia'))}
            {/* Claiming is entered as the YEAR you start (concrete + plan-shaped);
                the model stores the whole-year claim AGE the sub-engine needs, so
                display birthYear+age and commit year−birthYear. birthYear is asked
                first (namesStep) and required, so it is present here; if it were
                somehow absent the field simply can't resolve a year (a named
                missing fact, never a silent default). */}
            <IntegerField
              labelKey="ssClaimLabel"
              placeholderKey="ssClaimYearPlaceholder"
              field={personField(i, 'socialSecurityClaimAge')}
              value={
                p.birthYear === undefined || p.socialSecurityClaimAge === undefined
                  ? undefined
                  : p.birthYear + p.socialSecurityClaimAge
              }
              invalid={api.violationsFor(personField(i, 'socialSecurityClaimAge')).length > 0}
              onEdit={() => api.clearTouched(personField(i, 'socialSecurityClaimAge'))}
              onCommit={(year) => {
                updatePerson(api, i, {
                  socialSecurityClaimAge:
                    year === undefined || p.birthYear === undefined ? undefined : year - p.birthYear,
                })
                api.commitField(personField(i, 'socialSecurityClaimAge'))
              }}
            />
            {p.birthYear !== undefined && (
              <p className="field-help">
                {p.socialSecurityClaimAge === undefined
                  ? slots.ssClaimWindow(p.birthYear + SS_CLAIM_MIN, p.birthYear + SS_CLAIM_MAX)
                  : slots.ssClaimAge(p.socialSecurityClaimAge)}
              </p>
            )}
            {errorsFor(api, personField(i, 'socialSecurityClaimAge'))}
          </>
          )
        }}
      />
      <p className="field-help">{copy.ssSpousalNote}</p>
      <p className="resource-links">
        <ExternalLink href={EXTERNAL_LINKS.ssaMyAccount}>{copy.linkFindSsStatement}</ExternalLink>
      </p>
    </>
  ),
}

const spendStep: StepDef = {
  id: 'spend',
  headingKey: 'qSpendHeading',
  fields: ['annualSpendingReal'],
  render: (api) => {
    const annual = api.draft.annualSpendingReal
    const period = api.draft.spendEntryPeriod
    const displayed = annual === undefined ? undefined : period === 'month' ? annual / 12 : annual
    return (
      <>
        <CurrencyField
          labelKey="spendLabel"
          helpKey="spendHelp"
          field="annualSpendingReal"
          value={displayed}
          invalid={api.violationsFor('annualSpendingReal').length > 0}
          onEdit={() => api.clearTouched('annualSpendingReal')}
          onCommit={(entered) => {
            // Canonical ANNUAL in the model; the entered unit rides
            // spendEntryPeriod (an explicit answer, persisted — fidelity rule).
            api.update((d) => ({
              ...d,
              annualSpendingReal:
                entered === undefined
                  ? undefined
                  : d.spendEntryPeriod === 'month'
                    ? entered * 12
                    : entered,
            }))
            api.commitField('annualSpendingReal')
          }}
        />
        <SegmentedControl
          legendKey="periodLegend"
          name="spend-period"
          options={[
            { value: 'month', labelKey: 'periodMonth' },
            { value: 'year', labelKey: 'periodYear' },
          ]}
          value={period}
          onChange={(next) => {
            // Re-base the canonical annual to the SAME entered digits under the
            // new unit (the figure the user typed is the truth; the unit moves).
            api.update((d) => {
              const enteredNow =
                d.annualSpendingReal === undefined
                  ? undefined
                  : d.spendEntryPeriod === 'month'
                    ? d.annualSpendingReal / 12
                    : d.annualSpendingReal
              return {
                ...d,
                spendEntryPeriod: next,
                annualSpendingReal:
                  enteredNow === undefined ? undefined : next === 'month' ? enteredNow * 12 : enteredNow,
              }
            })
            api.commitField('spendEntryPeriod') // the explicit answer — clears the force-confirm
          }}
        />
        {errorsFor(api, 'annualSpendingReal')}
      </>
    )
  },
}

const healthQuoteStep: StepDef = {
  id: 'health-quote',
  headingKey: 'qHealthHeading',
  fields: [],
  render: (api) => (
    <>
      <CurrencyField
        labelKey="enrolledPremiumLabel"
        helpKey="healthQuoteHelp"
        field="health.enrolledPremiumMonthlyToday"
        value={api.draft.health.enrolledPremiumMonthlyToday}
        onCommit={(v) =>
          api.update((d) => ({ ...d, health: { ...d.health, enrolledPremiumMonthlyToday: v } }))
        }
      />
      <CurrencyField
        labelKey="slcspLabel"
        field="health.slcspMonthlyToday"
        value={api.draft.health.slcspMonthlyToday}
        onCommit={(v) =>
          api.update((d) => ({ ...d, health: { ...d.health, slcspMonthlyToday: v } }))
        }
      />
      <p className="resource-links">
        {copy.linkGetQuote}{' '}
        <ExternalLink href={EXTERNAL_LINKS.healthcareGov}>{copy.linkHealthcareGov}</ExternalLink>
        {' · '}
        <ExternalLink href={EXTERNAL_LINKS.kffCalculator}>{copy.linkKffCalculator}</ExternalLink>
      </p>
    </>
  ),
}

const oopStep: StepDef = {
  id: 'oop-medical',
  headingKey: 'qOopHeading',
  fields: [],
  render: (api) => (
    <>
      <CurrencyField
        labelKey="oopLabel"
        helpKey="oopHelp"
        field="health.oopMedicalAnnual"
        value={api.draft.health.oopMedicalAnnual}
        onCommit={(v) => api.update((d) => ({ ...d, health: { ...d.health, oopMedicalAnnual: v } }))}
      />
      {/* The optional-field reference hint shows only while the field is empty:
          a grounded, conservative anchor (referenceData.ts) so a user who doesn't
          know the figure isn't guessing blind. It vanishes once they answer. */}
      {api.draft.health.oopMedicalAnnual === undefined && (
        <p className="field-help">
          {slots.oopHint(
            formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.annual),
            formatMoney(OOP_MEDICAL_TYPICAL_HOUSEHOLD.federalAverageApproxAnnual),
          )}
        </p>
      )}
    </>
  ),
}

/** Write one working-year IRMAA-MAGI part (pay or investment) for person `i`, force-
 *  zeroing any RETIRED member's slot in the SAME array (the inapplicable-question zeroing —
 *  a retiree has no working-year count). Both arrays share the per-person/aligned contract;
 *  the engine override is their per-person SUM, composed at the intake→engine boundary
 *  (`intakeMap.buildDateInput`). */
function writeWorkingYearPart(
  d: ScenarioDraft,
  key: 'workingYearWagesByPerson' | 'workingYearInvestmentByPerson',
  i: 0 | 1,
  v: number | undefined,
): ScenarioDraft {
  const next: (number | undefined)[] = [d.health[key]?.[0], d.health[key]?.[1]]
  next[i] = v
  for (const j of [0, 1] as const) {
    if (d.people[j].workStatus === 'retired') next[j] = 0
  }
  return { ...d, health: { ...d.health, [key]: next } }
}

// C3 → Option B SPLIT: pay + working-year investment income as two first-class fields per
// still-working spouse (engine-summed at the boundary). The investment add can't be silently
// skipped — a blank leaves the answer incomplete, never a silent $0 (the lazy-confirm gap).
const workIncomeStep: StepDef = {
  id: 'working-income',
  headingKey: 'qWorkIncomeHeading',
  fields: [],
  render: (api) => (
    <Paired
      api={api}
      include={(p) => p.workStatus === 'working'}
      render={(_p, i) => (
        <>
          <CurrencyField
            labelKey="workPayLabel"
            helpKey="workPayHelp"
            field={`health.workingYearWagesByPerson.${i}`}
            value={api.draft.health.workingYearWagesByPerson?.[i]}
            onCommit={(v) =>
              api.update((d) => writeWorkingYearPart(d, 'workingYearWagesByPerson', i, v))
            }
          />
          <CurrencyField
            labelKey="workInvestmentLabel"
            helpKey="workInvestmentHelp"
            field={`health.workingYearInvestmentByPerson.${i}`}
            value={api.draft.health.workingYearInvestmentByPerson?.[i]}
            onCommit={(v) =>
              api.update((d) => writeWorkingYearPart(d, 'workingYearInvestmentByPerson', i, v))
            }
          />
        </>
      )}
    />
  ),
}

const irmaaSeedStep: StepDef = {
  id: 'irmaa-seed',
  headingKey: 'qIrmaaSeedHeading',
  fields: [],
  render: (api) => (
    <>
      <CurrencyField
        labelKey="irmaaSeedTwoBackLabel"
        helpKey="irmaaSeedHelp"
        field="health.irmaaMagiSeed.0"
        value={api.draft.health.irmaaMagiSeed?.[0]}
        onCommit={(v) =>
          api.update((d) => ({
            ...d,
            health: { ...d.health, irmaaMagiSeed: [v, d.health.irmaaMagiSeed?.[1]] },
          }))
        }
      />
      <CurrencyField
        labelKey="irmaaSeedOneBackLabel"
        field="health.irmaaMagiSeed.1"
        value={api.draft.health.irmaaMagiSeed?.[1]}
        onCommit={(v) =>
          api.update((d) => ({
            ...d,
            health: { ...d.health, irmaaMagiSeed: [d.health.irmaaMagiSeed?.[0], v] },
          }))
        }
      />
    </>
  ),
}

// ---------------------------------------------------------------------------
// the account loop (a real COMPONENT — it owns list-vs-form view state)
// ---------------------------------------------------------------------------

function AccountsStep({ api }: { api: StepApi }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  // Remove is two-tap (no undo once gone): the first tap arms the row, the
  // second removes it (D1 review DA4 — a destructive action needs a confirm).
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  if (editing !== null) {
    const initial = editing === 'new' ? undefined : api.draft.enteredAccounts[editing]
    return (
      <AccountEntry
        draft={api.draft}
        initial={initial}
        onCancel={() => setEditing(null)}
        onSave={(account) => {
          api.update((d) => {
            const next = [...d.enteredAccounts]
            if (editing === 'new') next.push(account)
            else next[editing] = account
            return { ...d, enteredAccounts: next }
          })
          setEditing(null)
        }}
      />
    )
  }

  return (
    <>
      <p className="field-help">{copy.accountsIntro}</p>
      {api.draft.enteredAccounts.length === 0 && (
        <p className="accounts-empty">{copy.accountsEmpty}</p>
      )}
      <ul className="account-list">
        {api.draft.enteredAccounts.map((a, i) => (
          <li key={i} className="account-row">
            <span className="account-summary">
              {slots.accountSummary(
                kindLabel(a.kind),
                api.draft.people[a.ownerIndex]?.name ??
                  (a.ownerIndex === 0 ? copy.personYou : copy.personSpouse),
                formatMoney(a.valueToday),
              )}
            </span>
            <span className="account-row-actions">
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  setConfirmRemove(null)
                  setEditing(i)
                }}
              >
                {copy.accountEdit}
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  if (confirmRemove === i) {
                    api.update((d) => ({
                      ...d,
                      enteredAccounts: d.enteredAccounts.filter((_, j) => j !== i),
                    }))
                    setConfirmRemove(null)
                  } else {
                    setConfirmRemove(i) // arm the confirm — no undo once removed
                  }
                }}
              >
                {confirmRemove === i ? copy.accountRemoveConfirm : copy.accountRemove}
              </button>
            </span>
            {api.violationsFor(accountField(i, 'annualContribution')).map((v) => (
              <FieldError key={v.rule} field={v.field} messageKey={v.messageKey} />
            ))}
            {api.violationsFor(accountField(i, 'employerMatchAnnual')).map((v) => (
              <FieldError key={v.rule} field={v.field} messageKey={v.messageKey} />
            ))}
          </li>
        ))}
      </ul>
      {api.draft.enteredAccounts.length > 0 && (
        <p className="accounts-total">
          {slots.accountsTotal(
            formatMoney(api.draft.enteredAccounts.reduce((s, a) => s + a.valueToday, 0)),
          )}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          setConfirmRemove(null)
          setEditing('new')
        }}
      >
        {copy.addAccount}
      </button>
    </>
  )
}

/** The accounts step derives its sanity-gate fields from the committed list. */
const accountsStep = (draft: ScenarioDraft): StepDef => ({
  id: 'accounts',
  headingKey: 'qAccountsHeading',
  fields: draft.enteredAccounts.flatMap((_, i) => [
    accountField(i, 'annualContribution'),
    accountField(i, 'employerMatchAnnual'),
  ]),
  render: (api) => <AccountsStep api={api} />,
})

// ---------------------------------------------------------------------------
// the other-income loop (R40 — opt-in; mirrors the account loop's list/form
// view state). A stream commits ATOMICALLY through OtherIncomeEntry (complete +
// in-range or nothing), so the list never holds a half-entered stream and the
// step is genuinely optional — zero streams reduces byte-identically to the
// spine (R40.6). Session-only until U8; the "nothing saved yet" affordance is
// the calm, reserved-slot note that color is never the only signal (insight 035).
// ---------------------------------------------------------------------------

function OtherIncomeStep({ api }: { api: StepApi }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  if (editing !== null) {
    const initial = editing === 'new' ? undefined : api.draft.incomeStreams[editing]
    return (
      <OtherIncomeEntry
        draft={api.draft}
        initial={initial}
        onCancel={() => setEditing(null)}
        onSave={(stream) => {
          api.update((d) => {
            const next = [...d.incomeStreams]
            if (editing === 'new') next.push(stream)
            else next[editing] = stream
            return { ...d, incomeStreams: next }
          })
          setEditing(null)
        }}
      />
    )
  }

  return (
    <>
      <p className="field-help">{copy.otherIncomeIntro}</p>
      {api.draft.incomeStreams.length === 0 && (
        <p className="accounts-empty">{copy.otherIncomeEmpty}</p>
      )}
      <ul className="account-list">
        {api.draft.incomeStreams.map((s, i) => (
          <li key={i} className="income-row">
            <div className="income-row-main">
              <span className="account-summary">
                {slots.incomeSummary(
                  incomeTypeLabel(s.type),
                  api.draft.people[s.ownerIndex]?.name ??
                    (s.ownerIndex === 0 ? copy.personYou : copy.personSpouse),
                  formatMoney(s.annualRealToday),
                )}
              </span>
              {/* The widow's NUMBERS in plain language — never a raw survivorPct. */}
              <span className="income-survivor-note">{survivorNoteFor(api.draft, s)}</span>
            </div>
            <span className="account-row-actions">
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  setConfirmRemove(null)
                  setEditing(i)
                }}
              >
                {copy.otherIncomeEdit}
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  if (confirmRemove === i) {
                    api.update((d) => ({
                      ...d,
                      incomeStreams: d.incomeStreams.filter((_, j) => j !== i),
                    }))
                    setConfirmRemove(null)
                  } else {
                    setConfirmRemove(i)
                  }
                }}
              >
                {confirmRemove === i ? copy.otherIncomeRemoveConfirm : copy.otherIncomeRemove}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          setConfirmRemove(null)
          setEditing('new')
        }}
      >
        {copy.addOtherIncome}
      </button>
      {/* The reserved-slot "not saved yet" affordance — neutral text + icon, role
          note, NEVER a red badge (color is never the only signal). Reserved height
          (insight 035) so the note appearing never shifts the Add button under a
          tapping thumb. */}
      <p className="not-saved-note" role="note">
        <svg
          className="not-saved-icon"
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="16"
          height="16"
        >
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4.5" r="0.9" fill="currentColor" />
        </svg>
        <span>{copy.notSavedYet}</span>
      </p>
    </>
  )
}

/** The other-income step (R40) — opt-in, no advance-gate fields (the form gates
 *  every stream atomically; the entity-scalar ranges live in sanity's income
 *  rules, exercised on a directly-mutated draft / the U8 restore path). */
const otherIncomeStep: StepDef = {
  id: 'other-income',
  headingKey: 'qOtherIncomeHeading',
  fields: [],
  render: (api) => <OtherIncomeStep api={api} />,
}

// ---------------------------------------------------------------------------
// the conditional sequence
// ---------------------------------------------------------------------------

const anyWorking = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.workStatus === 'working')

const anyPre65OrUnknown = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.currentAge === undefined || p.currentAge < 65)

const anyNearMedicare = (d: ScenarioDraft): boolean =>
  d.people.some((p) => p.currentAge !== undefined && p.currentAge >= 64)

/** The full intake sequence for the current draft state: the household
 *  preamble (spend + ACA inputs BEFORE the loop — first-acceptance
 *  reachability), then the variable-length account loop. */
export function intakeSteps(draft: ScenarioDraft): readonly StepDef[] {
  const steps: StepDef[] = [namesStep, workStep]
  if (anyWorking(draft)) steps.push(incomeStep)
  steps.push(ssStep, spendStep)
  if (anyPre65OrUnknown(draft)) steps.push(healthQuoteStep)
  steps.push(oopStep)
  if (anyWorking(draft)) steps.push(workIncomeStep)
  if (anyNearMedicare(draft)) steps.push(irmaaSeedStep)
  steps.push(accountsStep(draft))
  // R40 — the opt-in other-income loop, last (off the 5-minute guided path; a
  // household with no pension/rental/annuity/alimony simply advances past it).
  steps.push(otherIncomeStep)
  return steps
}
