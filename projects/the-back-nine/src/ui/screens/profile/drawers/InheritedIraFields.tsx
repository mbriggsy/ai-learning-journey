/**
 * src/ui/screens/profile/drawers/InheritedIraFields.tsx: an inherited IRA's questions inside the account drawer (the Act 5
 * plan's U13). It renders exactly the questions `walkInheritedQuestions` asks, in its order, so a follow-up shows only for
 * the answers that need it and nothing shows after a refusal (`src/intake/inheritedIraQuestions.ts` decides; this file
 * only draws). Every choice is a `ChoiceGroup` with nothing pre-checked (no answer has a default), every year a
 * `WholeInput`, every dollar a `MoneyInput`. A refusal or an impossible figure shows on its question the moment it is
 * answered, in the words Save refuses with; a blank answer is named on Save.
 *
 * A choice is stored with the key of the question it answered (the walk's `asked`), so an answer counts only for that
 * question: a moved year or a different heir asks again.
 *
 * Each field that writes a saved fact carries its `inherited.*` stamp for the fact registry's walk; the refusal-only
 * questions (a Roth, a spouse, the job's plan, a successor, an eligible beneficiary, the missed minimums) write none.
 */
import { Fragment, type ReactNode } from 'react'
import type { InheritedAnswers, InheritedQuestionId, InheritedWalk, Keyed, YesNo } from '@intake/inheritedIraQuestions'
import type { InheritedLeftTo } from '@shared/model'
import type { ScenarioDraft } from '@store/memoryModel'
import { ChoiceGroup, DrawerFields, MoneyInput, WholeInput } from '../../../kit'
import { copy, slots } from '../../../copy'
import { tablePerson } from '../../../workbench/tableRun'
import type { FactStamp } from '../../../workbench/factRegistry'
import { otherMemberLabel } from './accountFields'
import { Fact } from './Fact'

const YES_NO = [
  { value: 'yes', label: copy.profileYes },
  { value: 'no', label: copy.profileNo },
] as const

type KeyedId = { [K in keyof InheritedAnswers]-?: NonNullable<InheritedAnswers[K]> extends Keyed<unknown> ? K : never }[keyof InheritedAnswers]
type NumberId = { [K in keyof InheritedAnswers]-?: NonNullable<InheritedAnswers[K]> extends number ? K : never }[keyof InheritedAnswers]

/** The answers with one field set, or cleared (never stored as `undefined`). */
function withAnswer(a: InheritedAnswers, id: keyof InheritedAnswers, v: unknown): InheritedAnswers {
  const next: Record<string, unknown> = { ...a }
  if (v === undefined) delete next[id]
  else next[id] = v
  return next as unknown as InheritedAnswers
}

export function InheritedIraFields({
  draft,
  heirIndex,
  answers,
  walk,
  readOnly,
  errorOf,
  onAnswers,
}: {
  readonly draft: ScenarioDraft
  readonly heirIndex: 0 | 1
  readonly answers: InheritedAnswers
  readonly walk: InheritedWalk
  readonly readOnly: boolean
  /** The words on a question: its refusal or impossible figure as answered, else the last Save's. */
  readonly errorOf: (id: InheritedQuestionId) => string | undefined
  readonly onAnswers: (id: InheritedQuestionId, next: InheritedAnswers) => void
}) {
  const heir = tablePerson(draft, heirIndex, 0, 0)
  const other = otherMemberLabel(draft, heirIndex)
  const w = walk.words
  const keyOf = (id: InheritedQuestionId): string => walk.asked.find((q) => q.id === id)?.key ?? ''
  const err = (id: InheritedQuestionId) => {
    const e = errorOf(id)
    return e !== undefined ? { error: e } : {}
  }
  const choiceValue = <T,>(id: KeyedId): T | null => {
    const a = answers[id] as Keyed<T> | undefined
    return a !== undefined && a.key === keyOf(id) ? a.value : null
  }
  const setChoice = (id: KeyedId, value: string) => onAnswers(id, withAnswer(answers, id, { value, key: keyOf(id) }))
  const setNumber = (id: NumberId, v: number | undefined) => onAnswers(id, withAnswer(answers, id, v))

  const yesNo = (id: KeyedId, legend: string, description?: string): ReactNode => (
    <ChoiceGroup<YesNo>
      legend={legend}
      name={`inherited-${id}`}
      items={YES_NO}
      value={choiceValue<YesNo>(id)}
      disabled={readOnly}
      required
      {...(description !== undefined ? { description } : {})}
      {...err(id)}
      onValueChange={(v) => setChoice(id, v)}
    />
  )
  const money = (id: NumberId, label: string, description?: string): ReactNode => (
    <MoneyInput
      label={label}
      value={answers[id]}
      invalidMessage={copy.profileInvalidMoney}
      readOnly={readOnly}
      {...(description !== undefined ? { description } : {})}
      {...err(id)}
      onCommit={(v) => setNumber(id, v)}
    />
  )
  const stamped = (stamp: FactStamp, node: ReactNode): ReactNode => <Fact stamp={stamp}>{node}</Fact>
  const deathYear = answers.ownerDeathYear ?? w.askedYear
  const untakenStamp = w.deathYearIsFigure === true ? 'inherited.askedFigure' : 'inherited.deathYearUntaken'
  // A death last year: the owner's leftover is asked as of December 31 of the death year (a fixed figure); a death this
  // year: the custodian's live figure.
  const atYearEnd = w.deathYearIsFigure !== true

  const QUESTION: Readonly<Record<InheritedQuestionId, () => ReactNode>> = {
    treatment: () => (
      <ChoiceGroup<'traditional' | 'roth'>
        legend={copy.inheritedTreatmentLegend}
        name="inherited-treatment"
        items={[
          { value: 'traditional', label: copy.kindTraditionalIra },
          { value: 'roth', label: copy.kindRothIra },
        ]}
        value={choiceValue('treatment')}
        disabled={readOnly}
        required
        {...err('treatment')}
        onValueChange={(v) => setChoice('treatment', v)}
      />
    ),
    fromSpouse: () => yesNo('fromSpouse', slots.inheritedFromSpouseLegend(heir.mid)),
    heldAtDeath: () => (
      <ChoiceGroup<'own-ira' | 'job-plan'>
        legend={copy.inheritedHeldLegend}
        description={copy.inheritedHeldHelp}
        name="inherited-heldAtDeath"
        items={[
          { value: 'own-ira', label: copy.inheritedHeldOwnIra },
          { value: 'job-plan', label: copy.inheritedHeldJobPlan },
        ]}
        value={choiceValue('heldAtDeath')}
        disabled={readOnly}
        required
        {...err('heldAtDeath')}
        onValueChange={(v) => setChoice('heldAtDeath', v)}
      />
    ),
    ownerInherited: () => yesNo('ownerInherited', copy.inheritedOwnerInheritedLegend, copy.inheritedOwnerInheritedHelp),
    named: () => (
      <ChoiceGroup<'named' | 'estate-or-trust'>
        legend={slots.inheritedNamedLegend(heir.mid, heir.you)}
        description={copy.inheritedNamedHelp}
        name="inherited-named"
        items={[
          { value: 'named', label: copy.inheritedNamedYes },
          { value: 'estate-or-trust', label: copy.inheritedNamedEstate },
        ]}
        value={choiceValue('named')}
        vertical
        disabled={readOnly}
        required
        {...err('named')}
        onValueChange={(v) => setChoice('named', v)}
      />
    ),
    // The two years sit side by side (`dates` below draws them together).
    ownerBirthYear: () => null,
    ownerDeathYear: () => null,
    disabledAtDeath: () => yesNo('disabledAtDeath', slots.inheritedDisabledLegend(heir.mid, heir.you)),
    childUnder21AtDeath: () => yesNo('childUnder21AtDeath', slots.inheritedChildLegend(heir.mid, heir.you)),
    moreThanTenYounger: () =>
      stamped('inherited.heirMoreThanTenYearsYounger', yesNo('moreThanTenYounger', slots.inheritedTenYearsLegend(heir.mid, heir.you))),
    bornFirstHalf: () =>
      stamped(
        'inherited.ownerBornFirstHalf',
        <ChoiceGroup<YesNo>
          legend={slots.inheritedBirthHalfLegend(answers.ownerBirthYear ?? w.askedYear)}
          name="inherited-bornFirstHalf"
          items={[
            { value: 'yes', label: copy.inheritedFirstHalf },
            { value: 'no', label: copy.inheritedSecondHalf },
          ]}
          value={choiceValue<YesNo>('bornFirstHalf')}
          disabled={readOnly}
          required
          {...err('bornFirstHalf')}
          onValueChange={(v) => setChoice('bornFirstHalf', v)}
        />,
      ),
    diedBeforeApril1: () => stamped('inherited.ownerDiedBeforeApril1', yesNo('diedBeforeApril1', slots.inheritedBeforeApril1Legend(deathYear))),
    hasDeathYearFigure: () =>
      stamped(untakenStamp, yesNo('hasDeathYearFigure', slots.inheritedHasDeathYearLegend(deathYear, atYearEnd), slots.inheritedHasDeathYearHelp(atYearEnd))),
    deathYearUntaken: () =>
      stamped(
        untakenStamp,
        <MoneyInput
          label={slots.inheritedDeathYearLabel(deathYear, atYearEnd)}
          value={answers.deathYearUntaken !== undefined && answers.deathYearUntaken.key === keyOf('deathYearUntaken') ? answers.deathYearUntaken.value : undefined}
          invalidMessage={copy.profileInvalidMoney}
          readOnly={readOnly}
          {...err('deathYearUntaken')}
          onCommit={(v) => onAnswers('deathYearUntaken', withAnswer(answers, 'deathYearUntaken', v === undefined ? undefined : { value: v, key: keyOf('deathYearUntaken') }))}
        />,
      ),
    decemberBalance: () => stamped('inherited.askedFigure', money('decemberBalance', slots.inheritedDecemberLabel(w.askedYear - 1), copy.inheritedDecemberHelp)),
    hasCustodianFigure: () => stamped('inherited.askedFigure', yesNo('hasCustodianFigure', slots.inheritedHasFigureLegend(w.askedYear), copy.inheritedCustodianHelp)),
    custodianFigure: () => stamped('inherited.askedFigure', money('custodianFigure', slots.inheritedCustodianFigureLabel(w.askedYear))),
    sharedUnsplit: () => yesNo('sharedUnsplit', slots.inheritedSharedLegend(w.sharedBy ?? deathYear + 1, w.askedYear)),
    takenThisYear: () => stamped('inherited.takenInAskedYear', money('takenThisYear', slots.inheritedTakenLabel(w.askedYear))),
    minimumsTaken: () =>
      w.minimumYears === undefined ? null : yesNo('minimumsTaken', slots.inheritedMinimumsLegend(w.minimumYears.from, w.minimumYears.to), copy.inheritedMinimumsHelp),
    deathYearTakenInTime: () => yesNo('deathYearTakenInTime', slots.inheritedDeathYearInTimeLegend(deathYear)),
    earlier: () => {
      const e = errorOf('earlier')
      return stamped(
        'inherited.earlierWithdrawals',
        <fieldset className="flex min-w-0 flex-col gap-3" aria-invalid={e !== undefined || undefined}>
          <legend className="mb-2 text-body text-stone-900">{copy.inheritedEarlierLegend}</legend>
          <DrawerFields>
            {w.earlierYears.map((y) => (
              <MoneyInput
                label={slots.inheritedEarlierYearLabel(y)}
                value={answers.earlier[y]}
                invalidMessage={copy.profileInvalidMoney}
                readOnly={readOnly}
                {...(e !== undefined && answers.earlier[y] === undefined ? { error: e } : {})}
                onCommit={(v) => {
                  const earlier: Record<number, number> = { ...answers.earlier }
                  if (v === undefined) delete earlier[y]
                  else earlier[y] = v
                  onAnswers('earlier', { ...answers, earlier })
                }}
              />
            ))}
          </DrawerFields>
        </fieldset>,
      )
    },
    leftTo: () =>
      stamped(
        'inherited.leftTo',
        <ChoiceGroup<InheritedLeftTo | 'split'>
          legend={slots.inheritedLeftToLegend(heir.mid, heir.you)}
          name="inherited-leftTo"
          items={[
            { value: 'other-member', label: other },
            { value: 'someone-else', label: copy.inheritedSomeoneElse },
            { value: 'split', label: slots.inheritedSplitLabel(other) },
          ]}
          value={choiceValue('leftTo')}
          vertical
          disabled={readOnly}
          required
          {...err('leftTo')}
          onValueChange={(v) => setChoice('leftTo', v)}
        />,
      ),
  }

  const dates = (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-body text-stone-900">{copy.inheritedOwnerYearsLegend}</legend>
      <DrawerFields>
      <Fact stamp="inherited.ownerBirthYear">
        <WholeInput
          label={copy.inheritedOwnerBornLabel}
          value={answers.ownerBirthYear}
          invalidMessage={copy.profileInvalidYear}
          readOnly={readOnly}
          {...err('ownerBirthYear')}
          onCommit={(v) => setNumber('ownerBirthYear', v)}
        />
      </Fact>
      <Fact stamp="inherited.ownerDeathYear">
        <WholeInput
          label={copy.inheritedOwnerDiedLabel}
          value={answers.ownerDeathYear}
          invalidMessage={copy.profileInvalidYear}
          readOnly={readOnly}
          {...err('ownerDeathYear')}
          onCommit={(v) => setNumber('ownerDeathYear', v)}
        />
      </Fact>
      </DrawerFields>
    </fieldset>
  )

  return (
    <section className="flex flex-col gap-6 border-t border-stone-300 pt-6" data-profile-section="inherited">
      <h3 className="text-body font-semibold text-stone-900">{copy.inheritedSectionHeading}</h3>
      <p className="text-label text-stone-600">{copy.inheritedNoBasisNote}</p>
      {walk.needsHeirBirthYear ? (
        <p className="text-body text-stone-900" data-inherited-needs-heir="">
          {slots.inheritedNeedsHeirBirthYear(heir.possessive)}
        </p>
      ) : null}
      {walk.asked.map((q) => (
        <Fragment key={q.id}>{q.id === 'ownerBirthYear' ? dates : q.id === 'ownerDeathYear' ? null : QUESTION[q.id]()}</Fragment>
      ))}
    </section>
  )
}
