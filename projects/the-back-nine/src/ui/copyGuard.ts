/*
 * src/ui/copyGuard.ts — the R12 honesty gate for the copy catalog (U7, "born here").
 *
 * The product RECOMMENDS, but every reading must be probabilistically framed: certainty is
 * banned, advice imperatives are banned, superlatives are banned, and quantitative claims enter
 * only through typed slots (copy.ts SLOT DISCIPLINE). "calm-but-wrong is the sin" (R25).
 *
 * WHAT THIS GATE IS — and is NOT. It is a strong TRIPWIRE plus a regression net, NOT a complete
 * adversarial proof. A regex gate can never be an NLP-grade honesty boundary (an adversary can
 * always invent a fresh phrasing). So three layers carry R12, not one:
 *   1. This gate — broad lexicons over the WHOLE catalog, covering the common threat CLASSES
 *      (assured-outcome, plain-language certainty, advice imperative, assertive recommendation).
 *   2. The adversarial COVERAGE CORPUS in the test — committed real-world phrasings the gate MUST
 *      catch (and honest hedges it MUST NOT). Two adversarial review rounds fed it; add every new
 *      evasion found, so a lexicon that rots below the known-threat bar fails loud.
 *   3. The N=1 cold-read — the human honesty oracle on first-draft verdict copy before ship.
 * Treat a green gate as "no KNOWN-class sin slipped", never "proven honest".
 *
 * SCOPE. Two gates are UNIVERSAL (sins in EVERY voice, zero false-flag on the intake catalog): a
 * sure outcome and an advice imperative. `superlative` and `free-numeral` are VERDICT-scoped — both
 * have legitimate non-verdict uses ("best" is the product's framing question; factual numerals are
 * everywhere in intake). The verdict surface is {@link isVerdictKey} (owned HERE, imported by the
 * test). `catastrophe` is survivor-scoped.
 *
 * THE NEGATION GUARD (the subtle core). A false-certainty match is an honest HEDGE when an external
 * negator governs the certainty word ("Nothing here is certain", "no guarantees", "not certain to
 * last"). But two things must NOT be treated as hedges: (a) the INTERNALLY-negated claims
 * ("won't run out" / "can't fail" / "no chance of") — their negator IS the certainty mechanism, so
 * they are a separate NON-SUPPRESSIBLE class that always fires; (b) AFFIRMING idioms ("no doubt",
 * "without a doubt", "make no mistake", "not only", "nothing to fear") — these contain a negator
 * token but emphasize rather than hedge, so they are stripped before the negator search. Residual
 * (accepted, cold-read-backstopped): an attributive certainty adjective after a distant emphasis
 * negator ("Nothing can stop this guaranteed income") — too exotic to separate from the honest
 * "No projection is ever guaranteed" by regex without re-flagging real disclaimers.
 *
 * `staticDisclosures` is OUTSIDE this gate's input by design (copy.ts): its R13 line is a mandatory
 * directive ("Validate … with a professional") that must stay legal while imperative mood stays
 * banned in verdict copy. The test proves the exclusion meaningful ('validate' is in DIRECTIVE_VERBS).
 */

export type CopyGate = 'false-certainty' | 'advice-verb' | 'superlative' | 'free-numeral' | 'catastrophe'

export interface CopyViolation {
  readonly gate: CopyGate
  readonly match: string
}

// --- scope (owned here so the test and the gate cannot drift) ---------------------------------

/** Key prefixes for the verdict/answer/recommendation surface. */
export const VERDICT_KEY_PREFIXES: readonly string[] = [
  'outcome', 'answer', 'date', 'recommend', 'confidence', 'strategy',
]
/** True for the honesty-critical verdict/recommendation surface (free-numeral + superlative scope).
 *  Prefix match for the answer-strip + recommendation keys, plus a substring match for the headline
 *  feature keys whose verdict word is not the prefix (fuckOffDate / workOptionalDate / *Verdict /
 *  *Readout / *headline). The substrings are chosen to NOT collide with any intake key. */
export function isVerdictKey(key: string): boolean {
  if (VERDICT_KEY_PREFIXES.some((p) => key.startsWith(p))) return true
  return /verdict|readout|headline|fuckoff|workoptional/.test(key.toLowerCase())
}
/** Survivor copy — flat keys and slot names alike (`incomeSurvivor*`, `verdictSurvivor*`). */
export function isSurvivorKey(key: string): boolean {
  return /survivor/i.test(key)
}
/** Mortality-facing copy that must carry NO catastrophe/alarm lexicon — survivor copy PLUS the
 *  dead-cohort scrub note (`bandReadoutThinNote`), the one mortality-adjacent key that isn't
 *  survivor-scoped. Council 2026-06-28: give it the same net so a future morbid edit can't ship green. */
export function isMortalityKey(key: string): boolean {
  return isSurvivorKey(key) || key === 'bandReadoutThinNote'
}

// --- lexicons --------------------------------------------------------------------------------

/** INTERNALLY-negated certainty — the negator is the certainty mechanism ("won't run out"), so an
 *  external negator must NEVER exempt these. Run in a pass that BYPASSES the negation guard. */
export const FALSE_CERTAINTY_INTERNAL: readonly RegExp[] = [
  // The negator includes BOTH contractions AND the plain uncontracted forms (a writer who
  // un-contracts "won't" → "will not" must not escape — the verdict voice is plain-language).
  /\b(won'?t|will not|can'?t|cannot|will never|never|does not|doesn'?t|do not|don'?t|did not|didn'?t)( ever)? (run out|runs out|running out|run dry|running dry|deplete|depletes|depleting|fail|fails|failing|lose money|losing money|run short|runs short|running short|fall short|falls short|falling short|go broke|going broke|be broke|end up broke)\b/i,
  /\b(no|zero|not a|little) (chance|way|risk|possibility|prospect) (of|to|that|you'?ll|you|the|in which)\b/i,
  // The safety-ASSERTION frame ("no scenario where you run out") — the negator IS the certainty
  // mechanism, so it is non-suppressible. Gated on a depletion verb, so the honest "no scenario
  // where this is certain" (no depletion verb) is NOT caught here and still hedges via its own token.
  /\bno (scenario|world|situation|case|way) (where|in which|that)\b[^.!?]*\b(run out|runs out|run dry|deplete|depletes|fall short|falls short|go broke|be broke|lose money)\b/i,
]

/** Asserts a SURE financial outcome — banned EVERYWHERE (R12), subject to the negation guard. */
export const FALSE_CERTAINTY: readonly RegExp[] = [
  /\bguarantee(d|s|ing)?\b/i,
  /\bassured?\b/i,
  /\bcertainty\b/i,
  /\bcertainly\b/i,
  /\b(is|are|be|been|feels?|seems?|stays?|remains?) certain\b/i,
  /\bcertain to\b/i,
  /\bdefinitely\b/i,
  /\bfor sure\b/i,
  /\bsure thing\b/i,
  /\brisk-?free\b/i,
  /\briskless\b/i,
  /\bno risk\b/i,
  /\bbullet-?proof\b/i,
  /\biron-?clad\b/i,
  /\bfool-?proof\b/i,
  /\bslam dunk\b/i,
  /\b(worry|stress)-?free\b/i,
  /\brock-?solid\b/i,
  /\bsolid as a rock\b/i,
  /\bset for life\b/i,
  /\b(covered|comfortable|comfortably|provided for|set up|secure) for (life|the rest of your life)\b/i,
  /\bcomfortable (forever|for the rest of your life)\b/i,
  /\bout-?lasts?\b/i,
  /\blasts? (forever|a lifetime|the rest of your life)\b/i,
  /\blast a lifetime\b/i,
  /\b(is|are|will be|stays?|remains?) (secure|safe|locked)\b/i,
  /\ba (safe|sure) bet\b/i,
  /\b(count|rely|depend) on (this|it|that|your|the)\b/i,
  /\b(sleep|rest|breathe) (easy|easily|soundly|at night)\b/i,
  /\bnever (have to )?worry\b/i,
  /\b(nothing to worry about|stop worrying|no more (money )?worries)\b/i,
  /\bsee you through\b/i,
  // certainty idioms (off-tone for this product, but unambiguous reassurance — cheap to net)
  /\b(money in the bank|smooth sailing|home free|easy street|sitting pretty|have it made|in the clear)\b/i,
  /\ba sure (path|bet|thing)\b/i,
  /\ball set\b/i,
  /\bgood to go\b/i,
  /\bin (great|good) shape\b/i,
  /\bplenty to (spare|last|go around)\b/i,
  /\bmoney to spare\b/i,
  /\balways (be |have |has |is )?(enough|covered)\b/i,
  /\bmore than enough\b/i,
  /\bno matter (what|how|the market)\b/i,
  /\b(can'?t|cannot) lose\b/i,
  /\block(s|ed)? in\b/i,
  /\bis locked\b/i,
  /\bpromis(e|ed|es)\b/i,
  /\balways works?\b/i,
  /\b100% (safe|sure|certain)\b/i,
]

/** Negators that, governing a certainty match, make the claim an honest hedge. */
const NEGATORS = /\b(no|not|nothing|never|none|neither|without|hardly|rarely|isn'?t|aren'?t|wasn'?t|won'?t|can'?t|cannot|doesn'?t|don'?t|didn'?t|n'?t)\b/i

/** Affirming idioms — they carry a negator TOKEN but emphasize rather than hedge, so they are
 *  stripped from the clause before the negator search (else "There is no doubt … bulletproof" reads
 *  as a hedge and the sin escapes). */
// NOTE: 'scenario' is deliberately NOT here — "no scenario where you run out" is a safety
// ASSERTION (caught by FALSE_CERTAINTY_INTERNAL), and the honest "no scenario where this is
// certain" still hedges via its own 'is certain' token, so stripping it earned nothing and
// opened a hole.
const AFFIRMING_IDIOMS =
  /\b(no (doubt|question|mistake|exaggeration|catch|fee|fees|strings|gotcha)|without (a )?(doubt|question)|make no mistake|not only|nothing to (fear|worry))\b/gi

/** Modal-advice + imperative-phrase + assertive-recommendation patterns — advice in ANY voice
 *  (universal). The assertive-recommendation frames ("is the smart call", "makes the most sense")
 *  catch a crowned action even when no imperative VERB is present (the subject carries the action). */
export const ADVICE_PATTERNS: readonly RegExp[] = [
  /\byou (should|must|need to|ought to|have to|'?d better)\b/i,
  /\bwe('?d| would| will| can)? ?(recommend|suggest|advise)\b/i,
  /\byou'?ll want to\b/i,
  /\byou (may|might|could|can) want to\b/i,
  /\b(you should|please|might) consider\b/i,
  /\bconsider \w+ing\b/i,
  /\bthe (smart|smartest|best|right|optimal|ideal|wise|wisest) (move|play|thing|option|choice|strategy|approach|idea|bet) (is|would be|here|now)\b/i,
  /\bit (would|'?d) (help|be (smart|wise|best|better|worth))\b/i,
  /\bworth (doing|it|considering|converting|delaying|waiting)\b/i,
  /\b(our|my) (suggestion|recommendation|advice) (is|would be)?\b/i,
  /\bthe recommendation is\b/i,
  /\bis (the )?(wise|wisest|smart|smartest|right|sensible|prudent|advisable|obvious|clear|natural|logical)( (move|play|call|thing|choice|idea|bet|approach))?\b/i,
  /\bthe (obvious|clear|smart|right|best|logical|natural|sensible) (move|play|call|choice|thing|answer|option)\b/i,
  /\b(makes|make) (the most |good |the )?sense\b/i,
  /\bis (the )?(way to go|move|play|smart call)\b/i,
  /\bthe (move|play|call|takeaway) (here )?is\b/i,
  /\bare the (play|move|way to go)\b/i,
  /\b(is|are) advisable\b/i,
  /\bpays (off|to)\b/i,
  /\bbetter off\b/i,
  // The financial-OBJECT imperative — catches "tap the brokerage" / "move the surplus to a Roth"
  // without flagging the UI gesture "tap again to remove" (object is "again", not an account).
  /\b(tap|draw|pull|raid|drain|move|shift|funnel|sweep|earmark|sock|shovel|stuff|plow|stockpile|shelter) (the |your |from |into |down |to |out |away )?(brokerage|taxable|pre-?tax|roth|ira|hsa|401|403|account|bucket|portfolio|savings|nest ?egg|surplus|extra|remainder|leftover|equity|funds?|money|balance)\b/i,
]

/** Strategy/directive verbs that must never LEAD verdict/recommendation copy (clause-initial only —
 *  "taxes move to a single filer's" is fine; "Move your money" is caught by the object-phrase).
 *  Base forms only, so 3rd-person intake words never match. 'validate' is load-bearing for the
 *  staticDisclosures proof. */
export const DIRECTIVE_VERBS: readonly string[] = [
  'convert', 'withdraw', 'maximize', 'minimize', 'rebalance', 'delay', 'claim', 'contribute',
  'consider', 'sell', 'buy', 'invest', 'validate', 'park', 'stash', 'ladder', 'harvest', 'roll',
  'rollover', 'draw', 'spend', 'defer', 'front-load', 'allocate', 'fund', 'prioritize', 'downsize',
  'gift', 'annuitize', 'reallocate', 'liquidate', 'earmark', 'sock', 'sweep', 'shovel', 'stuff',
  'dollar-cost', 'glide', 'bucket', 'shelter', 'stockpile', 'plow',
]

/** Field-operation imperatives — the allowlisted class (R40-U4). These LEAD legitimate intake copy
 *  ("Skip this if…", "Set an age only if…", "Lower it only if…") and are NOT financial advice. */
export const FIELD_OP_ALLOWLIST: readonly string[] = [
  'skip', 'set', 'lower', 'raise', 'leave', 'enter', 'type', 'pick', 'select', 'find', 'get', 'add',
  'edit', 'remove', 'refresh', 'try', 'begin', 'continue', 'back', 'tap', 'choose', 'save',
]

/** Leading discourse markers stripped before the clause's verb is read ("…, so convert" → convert). */
const DISCOURSE_LEAD = /^(so|then|and|but|now|also|instead|rather|plus|yet|or|because)\s+/i

/** Advice superlatives — "optimal / best / ideal" crown a single right answer. Verdict-scoped. */
export const SUPERLATIVES: readonly RegExp[] = [
  /\bbest\b/i,
  /\boptimal(ly)?\b/i,
  /\boptimi[sz]e[sd]?\b/i,
  /\bideal(ly)?\b/i,
  /\bperfect(ly)?\b/i,
  /\bsmartest\b/i,
  /\bsurest\b/i,
  /\bunbeatable\b/i,
  /\bunrivall?ed\b/i,
  /\bsecond to none\b/i,
]

/** Catastrophe / alarm lexicon — the survivor reading is a calm $ step-down, never melodrama. */
export const CATASTROPHE_LEXICON: readonly RegExp[] = [
  /\bwidow(er|'?s|s)?\b/i,
  /\bdies?\b/i,
  /\bdied\b/i,
  /\bdeath\b/i,
  /\bdeceased\b/i,
  /\bpenalt(y|ies)\b/i,
  /\bpenali[sz]e/i,
  /\bcatastroph/i,
  /\bdevastat/i,
  /\bdisaster\b/i,
  /\bdestitute\b/i,
  /\bruin(ed|ous)?\b/i,
  /\bwiped out\b/i,
]

// --- helpers ---------------------------------------------------------------------------------

const CLAUSE_BOUNDARIES = ['. ', '? ', '! ', '; ', ': ', ', ', '—', '–', '…']

/** True if an external negator GOVERNS `matchIndex` within its clause (so a certainty match is an
 *  honest hedge). Affirming idioms ("no doubt", "without a doubt") are stripped first — they carry a
 *  negator token but emphasize, not hedge. */
function negatedBefore(text: string, matchIndex: number): boolean {
  const before = text.slice(0, matchIndex)
  const clauseStart = Math.max(...CLAUSE_BOUNDARIES.map((b) => before.lastIndexOf(b)))
  const clause = (clauseStart >= 0 ? before.slice(clauseStart) : before).replace(AFFIRMING_IDIOMS, ' ')
  return NEGATORS.test(clause)
}

/** Split into clause leads — strong breaks (.?!;:…), em/en-dash WITHOUT requiring trailing space,
 *  and commas — so a directive that hides after a comma/dash/semicolon is still clause-initial. */
function clauseLeads(text: string): string[] {
  return text
    .split(/[.!?…;:,]\s+|\s*[—–]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** The first alphabetic word of a clause — strips leading quotes/parens/bullets/glyphs and a
 *  leading discourse marker (so/then/and/…), lower-cased. `null` when the clause leads with a
 *  non-letter token. */
function firstWord(clause: string): string | null {
  const cleaned = clause.replace(/^[\s•·*\-–—“”‘’"'()[\]]+/, '').replace(DISCOURSE_LEAD, '')
  const m = /^([A-Za-z][A-Za-z'’-]*)/.exec(cleaned)
  return m ? m[1]!.toLowerCase() : null
}

// --- the gate --------------------------------------------------------------------------------

/** Lint one rendered string against the given gates. Returns every match (empty array = clean).
 *  Typographic apostrophes/quotes are normalized to ASCII FIRST (length-preserving, so match
 *  indices stay valid) — the catalog uses ’ ‘, which the straight-quote regexes would otherwise
 *  miss, including in the negation guard. */
export function lintCopy(text: string, gates: readonly CopyGate[]): CopyViolation[] {
  const t = text.replace(/[’‘]/g, "'")
  const out: CopyViolation[] = []
  for (const gate of gates) {
    if (gate === 'false-certainty') {
      for (const re of FALSE_CERTAINTY_INTERNAL) {
        const m = re.exec(t)
        if (m) out.push({ gate, match: m[0] })
      }
      for (const re of FALSE_CERTAINTY) {
        const m = re.exec(t)
        if (m && !negatedBefore(t, m.index)) out.push({ gate, match: m[0] })
      }
    } else if (gate === 'advice-verb') {
      for (const re of ADVICE_PATTERNS) {
        const m = re.exec(t)
        if (m) out.push({ gate, match: m[0] })
      }
      for (const clause of clauseLeads(t)) {
        const word = firstWord(clause)
        if (word && DIRECTIVE_VERBS.includes(word) && !FIELD_OP_ALLOWLIST.includes(word)) {
          out.push({ gate, match: word })
        }
      }
    } else if (gate === 'superlative') {
      for (const re of SUPERLATIVES) {
        const m = re.exec(t)
        if (m) out.push({ gate, match: m[0] })
      }
    } else if (gate === 'free-numeral') {
      const m = /\d/.exec(t)
      if (m) out.push({ gate, match: m[0] })
    } else {
      // gate === 'catastrophe'
      for (const re of CATASTROPHE_LEXICON) {
        const m = re.exec(t)
        if (m) out.push({ gate, match: m[0] })
      }
    }
  }
  return out
}
