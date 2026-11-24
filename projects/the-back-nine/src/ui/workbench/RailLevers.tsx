/*
 * src/ui/workbench/RailLevers.tsx — the lever rail's controls (workbench plan U15; R17, R18, KTD15). Each lever is a
 * quiet disclosure: its name and a "Changed" mark (a word, never a colour), then the plan's own value, the control, and
 * the lever's own "Back to the plan", which drops that one lever from the bundle.
 *
 * A CONTROL COMMITS ON BLUR OR ENTER (R18): a typed figure is the field's own text until then, so no figure anywhere
 * ticks while a control moves; a pick (a year, a policy, a tier, on or off) is one discrete commit. A value put back to
 * the plan's own drops the lever rather than holding a lever that changes nothing. The rail writes only the bundle
 * (`onLever`), never the draft: Apply is the one write (`WhatIfPage.tsx`).
 *
 * NOTHING HERE MOVES UNDER A FINGER (insights 035, 149): the "Changed" mark reserves its width when hidden, and every
 * line that comes and goes (an error, a "Back to the plan", a waiting note) sits after the controls of its lever.
 */
import { useId, useState, type ReactNode, type Ref } from 'react'
import { SegmentedControl } from '@intake/fields'
import { formatMoney, parseMoney } from '@intake/moneyFormat'
import type { ScenarioDraft } from '@store/memoryModel'
import type {
  BudgetTier,
  DrawdownOrderKey,
  DrawdownPolicy,
  RothConversionPlan,
  WhatIfBudgetLineV6,
  WhatIfLeverKind,
  WhatIfLeverV6,
} from '@shared/model'
import { freshStableId, idsInUse } from '@shared/stableIds'
import { copy, slots, type CopyKey } from '../copy'
import type { BandPlanClockAnchor } from '../bandAnnotations'
import { KIND_TO_BUCKET } from '@intake/intakeMap'
import { BUCKET_LABEL, POLICY_LABEL, leverTarget, lineName, policyWords, railMoney, rothWords, stopWords, type RailOffers } from './railChrome'

/** What a rail field commits: a number, a blank (back to the plan), or text that is not a figure. */
export type RailCommit = number | undefined | 'invalid'

/** A number field that commits on blur or Enter (R18), never per keystroke. */
export function RailNumber({
  label,
  value,
  onCommit,
  mode,
  help,
  error,
}: {
  readonly label: string
  readonly value: number | undefined
  readonly onCommit: (v: RailCommit) => void
  readonly mode: 'money' | 'integer'
  readonly help?: string
  readonly error?: string
}) {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const [editing, setEditing] = useState<string | null>(null)
  const shown = value === undefined ? '' : mode === 'money' ? formatMoney(value) : String(value)
  const commit = () => {
    if (editing === null) return
    const text = editing.trim()
    setEditing(null)
    if (text === '') return onCommit(undefined)
    if (mode === 'money') {
      const v = parseMoney(text)
      return onCommit(v === undefined ? 'invalid' : v)
    }
    const n = Number(text)
    onCommit(Number.isInteger(n) && n >= 0 ? n : 'invalid')
  }
  const described = [help !== undefined ? helpId : null, error !== undefined ? errorId : null].filter((s) => s !== null).join(' ')
  return (
    <div className="field wb-rail-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        type="text"
        inputMode={mode === 'money' ? 'decimal' : 'numeric'}
        autoComplete="off"
        enterKeyHint="done"
        spellCheck={false}
        value={editing ?? shown}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={described === '' ? undefined : described}
        onFocus={() => setEditing(value === undefined ? '' : String(value))}
        onChange={(e) => setEditing(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
      />
      {help !== undefined && (
        <p className="field-help" id={helpId}>
          {help}
        </p>
      )}
      {error !== undefined && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function LeverSection({
  kind,
  title,
  changed,
  children,
  detailsRef,
}: {
  readonly kind: WhatIfLeverKind
  readonly title: string
  readonly changed: boolean
  readonly children: ReactNode
  readonly detailsRef?: Ref<HTMLDetailsElement>
}) {
  return (
    <details className="wb-lever" data-lever={kind} ref={detailsRef}>
      <summary className="wb-lever__summary">
        <span className="wb-lever__title">{title}</span>
        {/* The mark keeps its width when hidden, so a lever pulled never re-wraps its own title under a finger. */}
        <span className={changed ? 'wb-lever__mark' : 'wb-lever__mark wb-lever__mark--off'} aria-hidden={changed ? undefined : true}>
          {copy.workbenchRailChanged}
        </span>
      </summary>
      <div className="wb-lever__body">{children}</div>
    </details>
  )
}

/** A lever's own way back. Drawn whether or not the lever is pulled, so a commit that pulls it moves nothing below
 *  (insight 035): unpulled, it keeps its room unseen and out of reach (`inert`). */
function Back({ what, onBack, pulled }: { readonly what: string; readonly onBack: () => void; readonly pulled: boolean }) {
  return (
    <button
      type="button"
      className={pulled ? 'btn-quiet wb-lever__back' : 'btn-quiet wb-lever__back wb-lever__back--off'}
      aria-label={slots.workbenchRailBackName(what)}
      inert={!pulled}
      onClick={onBack}
    >
      {copy.workbenchRailBack}
    </button>
  )
}

function PlanValue({ value }: { readonly value: string }) {
  return <p className="wb-lever__plan">{slots.workbenchRailPlanValue(value)}</p>
}

const PICKABLE = ['proportional', 'taxable-first', 'pre-tax-first', 'bracket-fill', 'custom'] as const
const POLICY_HELP: Readonly<Record<DrawdownPolicy, CopyKey>> = {
  proportional: 'leverPolicyProportionalHelp',
  'taxable-first': 'leverPolicyTaxableFirstHelp',
  'pre-tax-first': 'leverPolicyPreTaxFirstHelp',
  'bracket-fill': 'leverPolicyBracketFillHelp',
  custom: 'leverPolicyCustomHelp',
}
/** The bucket a shortcut names, never offered when the household holds no account there (SequencingControl's rule). */
const POLICY_NAMES_BUCKET: Readonly<Record<DrawdownPolicy, DrawdownOrderKey | null>> = {
  proportional: null,
  'taxable-first': 'taxable',
  'pre-tax-first': 'pretax',
  'bracket-fill': null,
  custom: null,
}
const DEFAULT_ORDER: readonly DrawdownOrderKey[] = ['taxable', 'pretax', 'roth']

const sameOrder = (a: readonly DrawdownOrderKey[] | undefined, b: readonly DrawdownOrderKey[] | undefined) =>
  (a ?? DEFAULT_ORDER).join() === (b ?? DEFAULT_ORDER).join()

const sameLine = (a: WhatIfBudgetLineV6, b: WhatIfBudgetLineV6) =>
  a.annualAmountReal === b.annualAmountReal && a.tier === b.tier && a.startYear === b.startYear && a.endYear === b.endYear && a.label === b.label && a.category === b.category

export interface RailLeversProps {
  readonly offers: RailOffers
  readonly bundle: readonly WhatIfLeverV6[]
  /** Set a target's lever, or drop it (null). */
  readonly onLever: (target: string, lever: WhatIfLeverV6 | null) => void
  /** The committed draft the what-if is applied to (names, the plan's clock). */
  readonly draft: ScenarioDraft
  readonly anchor: BandPlanClockAnchor
  /** Each lever's disclosure, by kind, so a facts-page link can open and focus it. */
  readonly sectionRef: (kind: WhatIfLeverKind) => Ref<HTMLDetailsElement>
}

export function RailLevers({ offers, bundle, onLever, draft, anchor, sectionRef }: RailLeversProps) {
  const lever = (target: string) => bundle.find((l) => leverTarget(l) === target)
  const has = (kind: WhatIfLeverKind) => bundle.some((l) => l.kind === kind)
  return (
    <div className="wb-levers">
      {offers.stop !== undefined && <StopLever offer={offers.stop} lever={lever('stop-year')} onLever={onLever} draft={draft} detailsRef={sectionRef('stop-year')} />}
      <SpendingLever offers={offers} bundle={bundle} onLever={onLever} draft={draft} changed={has('spending')} detailsRef={sectionRef('spending')} />
      {offers.deposits.length > 0 && (
        <DepositsLever offers={offers} bundle={bundle} onLever={onLever} changed={has('deposits')} detailsRef={sectionRef('deposits')} />
      )}
      <MixLever offer={offers.mix} lever={lever('mix')} onLever={onLever} detailsRef={sectionRef('mix')} />
      {offers.roth !== undefined && (
        <RothLeverRow plan={offers.roth.plan} lever={lever('roth')} onLever={onLever} draft={draft} anchor={anchor} detailsRef={sectionRef('roth')} />
      )}
      {offers.order !== undefined && (
        <OrderLever offer={offers.order} lever={lever('withdrawal-order')} onLever={onLever} draft={draft} detailsRef={sectionRef('withdrawal-order')} />
      )}
      {offers.claims.length > 0 && <ClaimLever offers={offers} bundle={bundle} onLever={onLever} changed={has('claim-age')} detailsRef={sectionRef('claim-age')} />}
      {offers.aca !== undefined && <AcaLever plan={offers.aca.planEnhanced} lever={lever('aca-subsidy')} onLever={onLever} detailsRef={sectionRef('aca-subsidy')} />}
    </div>
  )
}

interface LeverProps {
  readonly lever: WhatIfLeverV6 | undefined
  readonly onLever: RailLeversProps['onLever']
  readonly detailsRef: Ref<HTMLDetailsElement>
}

// ── The stop year ────────────────────────────────────────────────────────────────────────────────────────────────────
function StopLever({
  offer,
  lever,
  onLever,
  draft,
  detailsRef,
}: LeverProps & { readonly offer: NonNullable<RailOffers['stop']>; readonly draft: ScenarioDraft }) {
  const id = useId()
  const year = lever?.kind === 'stop-year' ? lever.calendarYear : offer.planYear
  return (
    <LeverSection kind="stop-year" title={copy.workbenchRailStopTitle} changed={lever !== undefined} detailsRef={detailsRef}>
      <PlanValue value={String(offer.planYear)} />
      <div className="field wb-rail-field">
        <label className="field-label" htmlFor={id}>
          {copy.workbenchRailStopLabel}
        </label>
        <select
          id={id}
          className="field-input"
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value)
            onLever('stop-year', y === offer.planYear ? null : { kind: 'stop-year', calendarYear: y })
          }}
        >
          {offer.years.map((y) => (
            <option key={y} value={y}>
              {slots.workbenchRailStopOption(y, y === offer.planYear)}
            </option>
          ))}
        </select>
      </div>
      <p className="wb-lever__words">{stopWords(draft, offer.working, year)}</p>
      <p className="wb-lever__note">{copy.workbenchRailStopNote}</p>
      <Back what={copy.workbenchRailStopTitle} pulled={lever !== undefined} onBack={() => onLever('stop-year', null)} />
    </LeverSection>
  )
}

// ── Spending ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function SpendingLever({
  offers,
  bundle,
  onLever,
  draft,
  changed,
  detailsRef,
}: {
  readonly offers: RailOffers
  readonly bundle: readonly WhatIfLeverV6[]
  readonly onLever: RailLeversProps['onLever']
  readonly draft: ScenarioDraft
  readonly changed: boolean
  readonly detailsRef: Ref<HTMLDetailsElement>
}) {
  const spending = offers.spending
  return (
    <LeverSection kind="spending" title={copy.workbenchRailSpendTitle} changed={changed} detailsRef={detailsRef}>
      {spending.kind === 'total' ? (
        <SpendingTotal plan={spending.plan} bundle={bundle} onLever={onLever} />
      ) : (
        <SpendingLines lines={spending.lines} unnamed={spending.unnamed} bundle={bundle} onLever={onLever} draft={draft} />
      )}
    </LeverSection>
  )
}

function SpendingTotal({ plan, bundle, onLever }: { readonly plan: number | undefined; readonly bundle: readonly WhatIfLeverV6[]; readonly onLever: RailLeversProps['onLever'] }) {
  const lever = bundle.find((l) => leverTarget(l) === 'spending:total')
  const value = lever?.kind === 'spending' && lever.op === 'total' ? lever.annualSpendingReal : plan
  const [error, setError] = useState<string | undefined>(undefined)
  return (
    <>
      {plan !== undefined && <PlanValue value={slots.workbenchRailPerYear(railMoney(plan))} />}
      <RailNumber
        label={copy.workbenchRailSpendTotalLabel}
        mode="money"
        value={value}
        {...(error !== undefined ? { error } : {})}
        onCommit={(v) => {
          if (v === 'invalid') return setError(copy.errBudgetAmountNonFinite)
          setError(undefined)
          onLever('spending:total', v === undefined || v === plan ? null : { kind: 'spending', op: 'total', annualSpendingReal: v })
        }}
      />
      <Back what={copy.workbenchRailSpendTitle} pulled={lever !== undefined} onBack={() => onLever('spending:total', null)} />
    </>
  )
}

function SpendingLines({
  lines,
  unnamed,
  bundle,
  onLever,
  draft,
}: {
  readonly lines: readonly WhatIfBudgetLineV6[]
  readonly unnamed: number
  readonly bundle: readonly WhatIfLeverV6[]
  readonly onLever: RailLeversProps['onLever']
  readonly draft: ScenarioDraft
}) {
  const added = bundle.flatMap((l) => (l.kind === 'spending' && l.op === 'add' ? [l.line] : []))
  return (
    <>
      <ul className="wb-lever__lines">
        {lines.map((line) => (
          <SpendingLine key={line.id} line={line} bundle={bundle} onLever={onLever} />
        ))}
        {added.map((line) => (
          <li key={line.id} className="wb-lever__line">
            <p className="wb-lever__line-name">{lineName(line)}</p>
            <p className="wb-lever__plan">{slots.workbenchRailPerYear(railMoney(line.annualAmountReal))}</p>
            <p className="wb-lever__words">{copy.workbenchRailLineNew}</p>
            <Back what={lineName(line)} pulled onBack={() => onLever(`spending:line:${line.id}`, null)} />
          </li>
        ))}
      </ul>
      {unnamed > 0 && <p className="wb-lever__note">{copy.workbenchRailSpendUnnamed}</p>}
      <AddLine draft={draft} bundle={bundle} onLever={onLever} />
    </>
  )
}

function SpendingLine({ line, bundle, onLever }: { readonly line: WhatIfBudgetLineV6; readonly bundle: readonly WhatIfLeverV6[]; readonly onLever: RailLeversProps['onLever'] }) {
  const target = `spending:line:${line.id}`
  const lever = bundle.find((l) => leverTarget(l) === target)
  const removed = lever?.kind === 'spending' && lever.op === 'remove'
  const shown = lever?.kind === 'spending' && lever.op === 'replace' ? lever.line : line
  const [error, setError] = useState<string | undefined>(undefined)
  const name = lineName(line)
  const write = (next: WhatIfBudgetLineV6) => onLever(target, sameLine(next, line) ? null : { kind: 'spending', op: 'replace', line: next })
  return (
    <li className="wb-lever__line">
      <p className="wb-lever__line-name">{name}</p>
      <PlanValue value={slots.workbenchRailPerYear(railMoney(line.annualAmountReal))} />
      {removed ? (
        <p className="wb-lever__words">{copy.workbenchRailLineOut}</p>
      ) : (
        <>
          <RailNumber
            label={slots.workbenchRailLineAmount(name)}
            mode="money"
            value={shown.annualAmountReal}
            {...(error !== undefined ? { error } : {})}
            onCommit={(v) => {
              if (v === 'invalid') return setError(copy.errBudgetAmountNonFinite)
              setError(undefined)
              write({ ...shown, annualAmountReal: v ?? line.annualAmountReal })
            }}
          />
          <SegmentedControl<BudgetTier>
            legend={slots.workbenchRailLineTier(name)}
            name={`wb-rail-tier-${line.id}`}
            value={shown.tier}
            onChange={(tier) => write({ ...shown, tier })}
            options={[
              { value: 'essentials', labelKey: 'budgetTierEssentials' },
              { value: 'discretionary', labelKey: 'budgetTierDiscretionary' },
            ]}
          />
          <button type="button" className="btn-quiet wb-lever__remove" onClick={() => onLever(target, { kind: 'spending', op: 'remove', lineId: line.id })}>
            {slots.workbenchRailLineRemove(name)}
          </button>
        </>
      )}
      <Back what={name} pulled={lever !== undefined} onBack={() => onLever(target, null)} />
    </li>
  )
}

interface NewLine {
  readonly label: string
  readonly amount?: number
  readonly tier: BudgetTier
  readonly startYear?: number
  readonly endYear?: number
}

function AddLine({ draft, bundle, onLever }: { readonly draft: ScenarioDraft; readonly bundle: readonly WhatIfLeverV6[]; readonly onLever: RailLeversProps['onLever'] }) {
  const [line, setLine] = useState<NewLine>({ label: '', tier: 'essentials', startYear: 0 })
  const [error, setError] = useState<string | undefined>(undefined)
  const labelId = useId()
  const windowHelp = draft.people.some((p) => p.workStatus === 'working') ? copy.budgetWindowHelp : slots.budgetWindowHelpRetired(draft.startCalendarYear)
  return (
    <div className="wb-lever__add">
      <p className="wb-lever__line-name">{copy.workbenchRailAddLine}</p>
      <div className="field wb-rail-field">
        <label className="field-label" htmlFor={labelId}>
          {copy.budgetLineLabelLabel}
        </label>
        <input
          id={labelId}
          className="field-input"
          type="text"
          autoComplete="off"
          value={line.label}
          onChange={(e) => setLine((l) => ({ ...l, label: e.target.value }))}
        />
      </div>
      <RailNumber
        label={copy.budgetAmountLabel}
        mode="money"
        value={line.amount}
        onCommit={(v) => setLine((l) => ({ ...l, ...(typeof v === 'number' ? { amount: v } : { amount: undefined }) }))}
      />
      <SegmentedControl<BudgetTier>
        legendKey="budgetTierLegend"
        name="wb-rail-new-tier"
        value={line.tier}
        onChange={(tier) => setLine((l) => ({ ...l, tier }))}
        options={[
          { value: 'essentials', labelKey: 'budgetTierEssentials' },
          { value: 'discretionary', labelKey: 'budgetTierDiscretionary' },
        ]}
      />
      <div className="wb-lever__window">
        <RailNumber
          label={copy.budgetWindowFromLabel}
          mode="integer"
          value={line.startYear}
          onCommit={(v) => setLine((l) => ({ ...l, ...(typeof v === 'number' ? { startYear: v } : { startYear: undefined }) }))}
        />
        <RailNumber
          label={copy.budgetWindowThroughLabel}
          mode="integer"
          value={line.endYear}
          onCommit={(v) => setLine((l) => ({ ...l, ...(typeof v === 'number' ? { endYear: v } : { endYear: undefined }) }))}
        />
      </div>
      <p className="field-help">{windowHelp}</p>
      <button
        type="button"
        className="btn-quiet wb-lever__add-go"
        onClick={() => {
          // The line's figures as committed: an amount and a first year, and a last year on or after it.
          const { amount, startYear, endYear } = line
          if (amount === undefined || startYear === undefined || (endYear !== undefined && endYear < startYear)) {
            setError(endYear !== undefined && startYear !== undefined && endYear < startYear ? copy.errBudgetWindowReversed : copy.workbenchRailAddLineNeeds)
            return
          }
          setError(undefined)
          const id = freshStableId(new Set([...idsInUse(draft), ...bundle.flatMap((l) => (l.kind === 'spending' && l.op !== 'remove' && l.op !== 'total' ? [l.line.id] : []))]))
          const added: WhatIfBudgetLineV6 = {
            id,
            category: 'other',
            label: line.label.trim(),
            annualAmountReal: amount,
            tier: line.tier,
            startYear,
            ...(endYear !== undefined ? { endYear } : {}),
          }
          onLever(`spending:line:${id}`, { kind: 'spending', op: 'add', line: added })
          setLine({ label: '', tier: 'essentials', startYear: 0 })
        }}
      >
        {copy.workbenchRailAddLineGo}
      </button>
      {error !== undefined && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Deposits ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function DepositsLever({
  offers,
  bundle,
  onLever,
  changed,
  detailsRef,
}: {
  readonly offers: RailOffers
  readonly bundle: readonly WhatIfLeverV6[]
  readonly onLever: RailLeversProps['onLever']
  readonly changed: boolean
  readonly detailsRef: Ref<HTMLDetailsElement>
}) {
  return (
    <LeverSection kind="deposits" title={copy.workbenchRailDepositsTitle} changed={changed} detailsRef={detailsRef}>
      <ul className="wb-lever__lines">
        {offers.deposits.map((offer) => (
          <DepositRow key={offer.accountId} offer={offer} bundle={bundle} onLever={onLever} />
        ))}
      </ul>
      <p className="wb-lever__note">{copy.workbenchRailDepositsSpent}</p>
    </LeverSection>
  )
}

function DepositRow({
  offer,
  bundle,
  onLever,
}: {
  readonly offer: RailOffers['deposits'][number]
  readonly bundle: readonly WhatIfLeverV6[]
  readonly onLever: RailLeversProps['onLever']
}) {
  const target = `deposits:${offer.accountId}`
  const lever = bundle.find((l) => leverTarget(l) === target)
  // A lower deposit on an account that carries an employer dollar waits for the employer's figure at that deposit (D7):
  // held here until answered, never sent as a lever that would keep the plan's employer dollar on a smaller deposit.
  const [pending, setPending] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const leverDeposit = lever?.kind === 'deposits' ? lever.annualContribution : undefined
  const deposit = pending ?? leverDeposit ?? offer.planDeposit
  const employer = offer.employer
  const lowered = employer !== undefined && deposit < offer.planDeposit
  const leverEmployer = lever?.kind === 'deposits' && employer !== undefined ? lever[employer.field] : undefined
  const send = (own: number, employerFigure: number | undefined) => {
    if (own === offer.planDeposit && employerFigure === undefined) return onLever(target, null)
    onLever(target, {
      kind: 'deposits',
      accountId: offer.accountId,
      annualContribution: own,
      ...(employer === undefined || employerFigure === undefined
        ? {}
        : employer.field === 'employerMatchAnnual'
          ? { employerMatchAnnual: employerFigure }
          : { hsaEmployerAnnual: employerFigure }),
    })
  }
  return (
    <li className="wb-lever__line">
      <p className="wb-lever__line-name">{offer.name}</p>
      <PlanValue value={slots.workbenchRailPerYear(railMoney(offer.planDeposit))} />
      <RailNumber
        label={slots.workbenchRailDepositLabel(offer.name)}
        mode="money"
        value={deposit}
        {...(error !== undefined ? { error } : {})}
        onCommit={(v) => {
          if (v === 'invalid') return setError(copy.errBudgetAmountNonFinite)
          setError(undefined)
          const own = v ?? offer.planDeposit
          if (employer !== undefined && own < offer.planDeposit) {
            // Lowered: wait for the employer's figure (blank until answered); a lever already holding one keeps it.
            if (leverEmployer !== undefined) {
              setPending(undefined)
              return send(own, leverEmployer)
            }
            setPending(own)
            return onLever(target, null)
          }
          setPending(undefined)
          send(own, undefined)
        }}
      />
      {employer !== undefined && lowered && (
        <>
          <p className="wb-lever__words">{slots.workbenchRailEmployerPlan(railMoney(employer.plan))}</p>
          <RailNumber
            label={copy.workbenchRailEmployerLabel}
            mode="money"
            value={leverEmployer}
            onCommit={(v) => {
              if (typeof v !== 'number') return
              setPending(undefined)
              send(deposit, v)
            }}
          />
          {lever === undefined && <p className="wb-lever__note">{copy.workbenchRailEmployerWaiting}</p>}
        </>
      )}
      <Back
        what={offer.name}
        pulled={lever !== undefined || pending !== undefined}
        onBack={() => {
          setPending(undefined)
          onLever(target, null)
        }}
      />
    </li>
  )
}

// ── The mix ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function MixLever({ offer, lever, onLever, detailsRef }: LeverProps & { readonly offer: RailOffers['mix'] }) {
  const held = lever?.kind === 'mix' ? lever : undefined
  const [parts, setParts] = useState<{ stock?: number; bond?: number; cash?: number }>(
    held !== undefined ? { stock: held.stockPct, bond: held.bondPct, cash: held.cashPct } : {},
  )
  const [error, setError] = useState<string | undefined>(undefined)
  const commit = (next: typeof parts) => {
    setParts(next)
    const { stock, bond, cash } = next
    if (stock === undefined || bond === undefined || cash === undefined) {
      setError(undefined)
      return
    }
    const total = stock + bond + cash
    if (total !== 100) {
      setError(slots.workbenchRailMixSum(String(total)))
      return
    }
    setError(undefined)
    onLever('mix', { kind: 'mix', stockPct: stock, bondPct: bond, cashPct: cash })
  }
  const field = (key: 'stock' | 'bond' | 'cash', label: string) => (
    <RailNumber
      label={label}
      mode="integer"
      value={parts[key]}
      onCommit={(v) => commit({ ...parts, [key]: typeof v === 'number' && v <= 100 ? v : undefined })}
    />
  )
  return (
    <LeverSection kind="mix" title={copy.workbenchRailMixTitle} changed={held !== undefined} detailsRef={detailsRef}>
      {offer.planStockShare !== null && <p className="wb-lever__plan">{slots.workbenchRailMixPlan(String(Math.round(offer.planStockShare * 100)))}</p>}
      <div className="wb-lever__mix">
        {field('stock', copy.workbenchRailMixStocks)}
        {field('bond', copy.workbenchRailMixBonds)}
        {field('cash', copy.workbenchRailMixCash)}
      </div>
      {error !== undefined && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="wb-lever__note">{copy.workbenchRailMixNote}</p>
      <Back
        what={copy.workbenchRailMixTitle}
        pulled={held !== undefined}
        onBack={() => {
          setParts({})
          setError(undefined)
          onLever('mix', null)
        }}
      />
    </LeverSection>
  )
}

// ── Roth conversions (the amount mode) ───────────────────────────────────────────────────────────────────────────────
function RothLeverRow({
  plan,
  lever,
  onLever,
  draft,
  anchor,
  detailsRef,
}: LeverProps & { readonly plan: RothConversionPlan | undefined; readonly draft: ScenarioDraft; readonly anchor: BandPlanClockAnchor }) {
  const held = lever?.kind === 'roth' ? lever.conversion : undefined
  const shownPlan = held === undefined ? plan : held.kind === 'plan' ? held.plan : undefined
  const earliest = anchor.startCalendarYear + anchor.yearsSincePlanBuilt
  const [mode, setMode] = useState<'none' | 'amount'>(shownPlan === undefined ? 'none' : 'amount')
  const [fields, setFields] = useState<{ amount?: number; start?: number; years?: number }>(
    shownPlan !== undefined
      ? { amount: shownPlan.annualAmountReal, start: draft.startCalendarYear + shownPlan.startYearOffset, years: shownPlan.years }
      : { start: earliest, years: 5 },
  )
  const startPast = fields.start !== undefined && fields.start < earliest
  const send = (m: 'none' | 'amount', f: typeof fields) => {
    if (m === 'none') return onLever('roth', plan === undefined ? null : { kind: 'roth', conversion: { kind: 'none' } })
    const { amount, start, years } = f
    if (amount === undefined || amount <= 0 || start === undefined || start < earliest || years === undefined || years < 1) return
    const next: RothConversionPlan = { annualAmountReal: amount, startYearOffset: start - draft.startCalendarYear, years }
    const same = plan !== undefined && plan.annualAmountReal === next.annualAmountReal && plan.startYearOffset === next.startYearOffset && plan.years === next.years
    onLever('roth', same ? null : { kind: 'roth', conversion: { kind: 'plan', plan: next } })
  }
  const commitField = (key: 'amount' | 'start' | 'years') => (v: RailCommit) => {
    const next = { ...fields, [key]: typeof v === 'number' ? v : undefined }
    setFields(next)
    send(mode, next)
  }
  return (
    <LeverSection kind="roth" title={copy.workbenchRailRothTitle} changed={held !== undefined} detailsRef={detailsRef}>
      <PlanValue value={rothWords(plan, draft.startCalendarYear, anchor)} />
      <SegmentedControl<'none' | 'amount'>
        legend={copy.workbenchRailRothLegend}
        name="wb-rail-roth"
        value={mode}
        onChange={(m) => {
          setMode(m)
          send(m, fields)
        }}
        options={[
          { value: 'none', label: copy.workbenchRailRothNone },
          { value: 'amount', label: copy.workbenchRailRothAmount },
        ]}
      />
      {mode === 'amount' && (
        <div className="wb-lever__fields">
          <RailNumber label={copy.leverRothAmountLabel} mode="money" value={fields.amount} onCommit={commitField('amount')} />
          <RailNumber
            label={copy.leverRothStartLabel}
            mode="integer"
            value={fields.start}
            onCommit={commitField('start')}
            {...(startPast ? { error: slots.workbenchRailRothStartPast(earliest) } : {})}
          />
          <RailNumber label={copy.leverRothYearsLabel} mode="integer" value={fields.years} onCommit={commitField('years')} />
        </div>
      )}
      <Back
        what={copy.workbenchRailRothTitle}
        pulled={held !== undefined}
        onBack={() => {
          setMode(plan === undefined ? 'none' : 'amount')
          setFields(
            plan !== undefined
              ? { amount: plan.annualAmountReal, start: draft.startCalendarYear + plan.startYearOffset, years: plan.years }
              : { start: earliest, years: 5 },
          )
          onLever('roth', null)
        }}
      />
    </LeverSection>
  )
}

// ── Withdrawal order ─────────────────────────────────────────────────────────────────────────────────────────────────
function OrderLever({
  offer,
  lever,
  onLever,
  draft,
  detailsRef,
}: LeverProps & { readonly offer: NonNullable<RailOffers['order']>; readonly draft: ScenarioDraft }) {
  const held = lever?.kind === 'withdrawal-order' ? lever : undefined
  const policy = held?.policy ?? offer.policy
  const order = held?.policy === 'custom' ? held.drawdownOrder : (offer.order ?? DEFAULT_ORDER)
  const name = useId()
  const buckets = new Set(draft.enteredAccounts.map((a) => KIND_TO_BUCKET[a.kind]))
  const offered = PICKABLE.filter((p) => {
    const named = POLICY_NAMES_BUCKET[p]
    return named === null || buckets.has(named) || p === offer.policy
  })
  const send = (p: DrawdownPolicy, o: readonly DrawdownOrderKey[]) => {
    const same = p === offer.policy && (p !== 'custom' || sameOrder(o, offer.order))
    if (same) return onLever('withdrawal-order', null)
    onLever('withdrawal-order', p === 'custom' ? { kind: 'withdrawal-order', policy: 'custom', drawdownOrder: o } : { kind: 'withdrawal-order', policy: p })
  }
  const move = (key: DrawdownOrderKey, dir: -1 | 1) => {
    const i = order.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const next = [...order]
    next[i] = next[j]!
    next[j] = key
    send('custom', next)
  }
  return (
    <LeverSection kind="withdrawal-order" title={copy.workbenchRailOrderTitle} changed={held !== undefined} detailsRef={detailsRef}>
      <PlanValue value={policyWords(offer.policy, offer.order)} />
      <fieldset className="wb-lever__policies">
        <legend className="sr-only">{copy.workbenchRailOrderTitle}</legend>
        {offered.map((p) => (
          <label key={p} className="wb-lever__policy" data-picked={policy === p || undefined}>
            <input type="radio" name={name} value={p} checked={policy === p} onChange={() => send(p, order)} />
            <span className="wb-lever__policy-body">
              <span className="wb-lever__policy-label">{copy[POLICY_LABEL[p]]}</span>
              <span className="wb-lever__policy-help">{copy[POLICY_HELP[p]]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {policy === 'custom' && (
        <ol className="wb-lever__order">
          {order.map((key, i) => (
            <li key={key} className="wb-lever__order-row">
              <span className="wb-lever__order-name">{copy[BUCKET_LABEL[key]]}</span>
              <span className="wb-lever__order-moves">
                <button
                  type="button"
                  className="btn-quiet wb-lever__move"
                  aria-label={`${copy.leverOrderMoveUp} — ${copy[BUCKET_LABEL[key]]}`}
                  aria-disabled={i === 0}
                  onClick={() => move(key, -1)}
                >
                  <span aria-hidden="true">{copy.leverOrderUpGlyph}</span>
                </button>
                <button
                  type="button"
                  className="btn-quiet wb-lever__move"
                  aria-label={`${copy.leverOrderMoveDown} — ${copy[BUCKET_LABEL[key]]}`}
                  aria-disabled={i === order.length - 1}
                  onClick={() => move(key, 1)}
                >
                  <span aria-hidden="true">{copy.leverOrderDownGlyph}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <Back what={copy.workbenchRailOrderTitle} pulled={held !== undefined} onBack={() => onLever('withdrawal-order', null)} />
    </LeverSection>
  )
}

// ── Social Security's start ──────────────────────────────────────────────────────────────────────────────────────────
function ClaimLever({
  offers,
  bundle,
  onLever,
  changed,
  detailsRef,
}: {
  readonly offers: RailOffers
  readonly bundle: readonly WhatIfLeverV6[]
  readonly onLever: RailLeversProps['onLever']
  readonly changed: boolean
  readonly detailsRef: Ref<HTMLDetailsElement>
}) {
  return (
    <LeverSection kind="claim-age" title={copy.workbenchRailClaimTitle} changed={changed} detailsRef={detailsRef}>
      <ul className="wb-lever__lines">
        {offers.claims.map((c) => (
          <ClaimRow key={c.personIndex} offer={c} bundle={bundle} onLever={onLever} />
        ))}
      </ul>
    </LeverSection>
  )
}

/** The engine's claim window: 62 through 70 (the intake's own rule). */
const CLAIM_MIN = 62
const CLAIM_MAX = 70

function ClaimRow({ offer, bundle, onLever }: { readonly offer: RailOffers['claims'][number]; readonly bundle: readonly WhatIfLeverV6[]; readonly onLever: RailLeversProps['onLever'] }) {
  const target = `claim-age:${offer.personIndex}`
  const lever = bundle.find((l) => leverTarget(l) === target)
  const age = lever?.kind === 'claim-age' ? lever.claimAge : offer.planAge
  const from = Math.max(CLAIM_MIN, offer.currentAge)
  const [error, setError] = useState<string | undefined>(undefined)
  const label = slots.workbenchRailClaimLabel(offer.possessive)
  return (
    <li className="wb-lever__line">
      <PlanValue value={String(offer.planAge)} />
      <RailNumber
        label={label}
        mode="integer"
        value={age}
        {...(error !== undefined ? { error } : {})}
        onCommit={(v) => {
          if (v === undefined) {
            setError(undefined)
            return onLever(target, null)
          }
          if (v === 'invalid' || v < from || v > CLAIM_MAX) return setError(slots.workbenchRailClaimRange(from))
          setError(undefined)
          onLever(target, v === offer.planAge ? null : { kind: 'claim-age', personIndex: offer.personIndex, claimAge: v })
        }}
      />
      <Back
        what={label}
        pulled={lever !== undefined}
        onBack={() => {
          setError(undefined)
          onLever(target, null)
        }}
      />
    </li>
  )
}

// ── The marketplace regime ───────────────────────────────────────────────────────────────────────────────────────────
function AcaLever({ plan, lever, onLever, detailsRef }: LeverProps & { readonly plan: boolean }) {
  const enhanced = lever?.kind === 'aca-subsidy' ? lever.enhanced : plan
  return (
    <LeverSection kind="aca-subsidy" title={copy.workbenchRailAcaTitle} changed={lever !== undefined} detailsRef={detailsRef}>
      <PlanValue value={plan ? copy.leverHealthRegimeEnhanced : copy.leverHealthRegimeReverted} />
      <SegmentedControl<'enhanced' | 'reverted'>
        legend={copy.workbenchRailAcaTitle}
        name="wb-rail-aca"
        value={enhanced ? 'enhanced' : 'reverted'}
        onChange={(v) => {
          const next = v === 'enhanced'
          onLever('aca-subsidy', next === plan ? null : { kind: 'aca-subsidy', enhanced: next })
        }}
        options={[
          { value: 'reverted', labelKey: 'leverHealthRegimeReverted' },
          { value: 'enhanced', labelKey: 'leverHealthRegimeEnhanced' },
        ]}
      />
      <Back what={copy.workbenchRailAcaTitle} pulled={lever !== undefined} onBack={() => onLever('aca-subsidy', null)} />
    </LeverSection>
  )
}
