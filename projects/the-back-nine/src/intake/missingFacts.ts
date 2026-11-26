/**
 * The missing-fact words every surface shares: three names then "N more", the strip's two one-line echoes, and the
 * blocked answer's lead. Moved out of `AnswerStrip.tsx` by Act 6's RC0, unchanged.
 */
import { copy, slots } from '@ui/copy'
import type { MissingFact } from './intakeMap'

/** Three names, then "N more" — the ONE rule for every list of names a surface caps: deduped by
 *  name (two entries reading the same are one name to the reader), the first three in order, the
 *  rest as a count. Pure over plain names, so the missing-fact lists below and the W question's
 *  left-out budget lines (the pay check's KTD5) can never disagree on what "N more" hides. */
export function threeThenMore(names: readonly string[]): { readonly shown: readonly string[]; readonly more: number } {
  const distinct = [...new Set(names)]
  const shown = distinct.slice(0, 3)
  return { shown, more: distinct.length - shown.length }
}

/** The names a block of missing facts shows — deduped, the first three, the rest as a count. ONE
 *  producer for every surface that lists missing facts (the strip's FactBlock and the assumptions
 *  panel's aria-modal echo), so the two can never disagree on what "N more" hides. */
export function missingFactNames(facts: readonly MissingFact[]): { readonly shown: readonly string[]; readonly more: number } {
  return threeThenMore(facts.map((m) => copy[m.labelKey]))
}

/** EVERY name a block of missing facts holds, no cap: the one surface with room to list them all (setup's box beside
 *  Complete, the last screen before the answer; Act 6 · RC14). Deduped like the capped form, except that a fact two
 *  people both owe names whose it is ("Birth year (you)", "Birth year (Sam)"), since one bare "Birth year" would hide the
 *  second; a fact only one person owes, or the household's own, stands bare. */
export function missingFactNamesAll(
  facts: readonly MissingFact[],
  people: readonly { readonly name?: string | undefined }[],
): readonly string[] {
  const owners = new Map<string, Set<0 | 1>>()
  for (const m of facts) if (m.personIndex !== undefined) (owners.get(m.labelKey) ?? owners.set(m.labelKey, new Set()).get(m.labelKey)!).add(m.personIndex)
  const whose = (i: 0 | 1): string => people[i]?.name?.trim() || (i === 0 ? copy.personYouMid : copy.personSpouseMid)
  return [
    ...new Set(
      facts.map((m) =>
        m.personIndex !== undefined && (owners.get(m.labelKey)?.size ?? 0) > 1
          ? slots.missingFactOf(copy[m.labelKey], whose(m.personIndex))
          : copy[m.labelKey],
      ),
    ),
  ]
}

/** The two one-line echoes of a missing-fact list — "Still needed: …" over the facts still to enter,
 *  "Outside what this version can price: …" over the ones no entry can fix — each `null` when its
 *  bucket is empty. ONE composer for every surface that echoes the strip in a single line (the
 *  assumption panel's aria-modal echo and the money picture's unknown face), so the two can never
 *  drift apart on a lead, a separator or what "N more" hides (insight 081). */
export function missingFactLines(
  missing: readonly MissingFact[],
  /** Given, every name with whose where it is unclear ({@link missingFactNamesAll}); absent, the capped form. */
  all?: { readonly people: readonly { readonly name?: string | undefined }[] },
): {
  readonly stillNeeded: string | null
  readonly cannotPrice: string | null
} {
  const line = (facts: readonly MissingFact[], lead: string): string | null => {
    if (facts.length === 0) return null
    if (all !== undefined) return `${lead} ${missingFactNamesAll(facts, all.people).join(' · ')}`
    const { shown, more } = missingFactNames(facts)
    return `${lead} ${shown.join(' · ')}${more > 0 ? ` · ${slots.factsMore(more)}` : ''}`
  }
  return {
    stillNeeded: line(missing.filter((m) => (m.kind ?? 'absent') === 'absent'), copy.answerStillNeeded),
    cannotPrice: line(missing.filter((m) => m.kind === 'unrepresentable'), copy.answerCannotPrice),
  }
}

/** The strip's LEAD over a blocked answer. Keep-going ("takes shape as you go") is only honest
 *  while something the reader can still enter is holding the answer up. When EVERY blocker is
 *  unrepresentable, no amount of entry will finish it, and the keep-going lead becomes a promise
 *  the tool cannot keep — so the lead states the withhold instead. A MIXED household keeps the
 *  keep-going lead: it has real facts left to enter, and the unrepresentable block below says
 *  plainly which part is out of reach. */
export function blockedLeadFor(missing: readonly MissingFact[]): string {
  const anyActionable = missing.some((m) => (m.kind ?? 'absent') === 'absent')
  const anyWithheld = missing.some((m) => m.kind === 'unrepresentable')
  return anyWithheld && !anyActionable ? copy.answerWithheldLead : copy.answerIncomplete
}
