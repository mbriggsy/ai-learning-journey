/**
 * U10's scan (gap 3; the Act 5 plan's KTD20 and insight 147): no code outside tests may decide an account kind by
 * omission. A Set, a list, a ternary or a `default` arm that names some kinds decides every UNNAMED kind silently, so
 * the day gap 3 adds the inherited IRA it would compile straight through, filed in whatever bucket the omission picks.
 * The cure is an exhaustive `Record<AccountKind, …>`, which fails to compile until the new kind is named.
 *
 * Keyed on the TYPE CHECKER, never on a variable's name: a finding is any expression whose operand the checker types as
 * account kinds (every string-literal member an `ACCOUNT_KINDS` member). Four shapes:
 *   - compare:      a kind compared to a kind literal (`a.kind === 'brokerage'`);
 *   - membership:   a kind tested against a Set or list (`EMPLOYER.has(kind)`, `[…].includes(a.kind)`);
 *   - switch:       a `switch` on a kind with a `default` arm;
 *   - conditional:  a conditional that picks a kind literal (`x ? 'roth-ira' : 'traditional-ira'`).
 *
 * An allowed finding carries its reason, `safe:` (KTD20's "safe equality checks": the new kind is simply excluded, which
 * is right). U10's first commit (2026-11-27) converted every other finding into an exhaustive Record or a read of one, so
 * the list holds safe checks only. It is matched as a multiset, both ways: a new finding reds, and so does an entry no
 * longer found, so the list only shrinks. The planted file below proves each shape reds (a new kind of check owes its
 * planted guard).
 *
 * The scan sees comparisons; the homes that are Records it cannot see. The last arm proves those: the same program with
 * an eighth kind, a fifth grouping and a fifth treatment added must fail to compile inside every home's own declaration
 * (the plan's type-level test), and the tree as it stands compiles clean in the same places (so a program that cannot
 * resolve a module, which would red everywhere, never passes).
 */
import { readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import ts from 'typescript'
import { ACCOUNT_KINDS } from '@shared/model'

const KINDS: ReadonlySet<string> = new Set(ACCOUNT_KINDS)
const ROOT = process.cwd()
const PLANTED = join(ROOT, 'src', '__accountKindScanPlanted__.ts')

/** Each shape once, and one look-alike that must stay quiet (a bucket vocabulary sharing the literal 'hsa'). */
const PLANTED_TEXT = `import type { AccountKind } from '@shared/model'
type Bucket = 'pretax' | 'roth' | 'taxable' | 'hsa'
const EMPLOYER: ReadonlySet<AccountKind> = new Set<AccountKind>(['401k', '403b'])
export function planted(kind: AccountKind, bucket: Bucket, roth: boolean): number {
  if (kind === 'hsa') return 1
  if (EMPLOYER.has(kind)) return 2
  if (bucket === 'hsa') return 3
  const picked: AccountKind = roth ? 'roth-ira' : 'traditional-ira'
  switch (kind) {
    case 'brokerage':
      return picked.length
    default:
      return 0
  }
}
`

type Shape = 'compare' | 'membership' | 'switch' | 'conditional'
interface Finding {
  readonly file: string
  readonly shape: Shape
  readonly text: string
}

const isKindLiteral = (n: ts.Node): boolean =>
  (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && KINDS.has(n.text)

/** Every string-literal member of the type is an account kind (`undefined`/`null` aside), and it has at least one. */
function isKindType(t: ts.Type): boolean {
  let any = false
  for (const part of t.isUnion() ? t.types : [t]) {
    if (part.isStringLiteral()) {
      if (!KINDS.has(part.value)) return false
      any = true
    } else if ((part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) === 0) {
      return false
    }
  }
  return any
}

const isSingleKindLiteralType = (t: ts.Type): boolean => t.isStringLiteral() && KINDS.has(t.value)

function scan(program: ts.Program, files: readonly ts.SourceFile[]): Finding[] {
  const checker = program.getTypeChecker()
  const typeOf = (n: ts.Node): ts.Type => checker.getTypeAtLocation(n)
  const out: Finding[] = []
  for (const sf of files) {
    const file = relative(ROOT, sf.fileName).split(sep).join('/')
    const add = (shape: Shape, node: ts.Node): void => {
      out.push({ file, shape, text: node.getText(sf).replace(/\s+/g, ' ').slice(0, 160) })
    }
    const visit = (node: ts.Node): void => {
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind
        if (
          op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
          op === ts.SyntaxKind.EqualsEqualsToken ||
          op === ts.SyntaxKind.ExclamationEqualsToken
        ) {
          const l = node.left
          const r = node.right
          const literalSide = (isKindLiteral(l) && isKindType(typeOf(r))) || (isKindLiteral(r) && isKindType(typeOf(l)))
          const constSide =
            isKindType(typeOf(l)) && isKindType(typeOf(r)) && (isSingleKindLiteralType(typeOf(l)) || isSingleKindLiteralType(typeOf(r)))
          if (literalSide || constSide) add('compare', node)
        }
      } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const name = node.expression.name.text
        const arg = node.arguments[0]
        if ((name === 'has' || name === 'includes' || name === 'indexOf') && arg !== undefined && isKindType(typeOf(arg))) {
          add('membership', node)
        }
      } else if (ts.isSwitchStatement(node)) {
        if (isKindType(typeOf(node.expression)) && node.caseBlock.clauses.some(ts.isDefaultClause)) add('switch', node.expression)
      } else if (ts.isConditionalExpression(node)) {
        if ((isKindLiteral(node.whenTrue) || isKindLiteral(node.whenFalse)) && isKindType(typeOf(node))) add('conditional', node)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return out
}

/** The allowed findings, keyed `file | shape | text`, with how many times that exact text may occur in that file.
 *  Classified 2026-11-27 (b9-1) against KTD20; every `U10: convert` entry was converted and deleted the same day (b9-2).
 *  The homes no scan can see, because they choose by grouping, treatment or deposits rather than by comparing a kind,
 *  are proved by the last arm's `RECORD_HOMES` (a Record) or read the one table (`takesDeposits`, `depositCeilingOf`). */
const ALLOWED: Readonly<Record<string, { readonly reason: string; readonly count?: number }>> = {
  // --- KTD20's "safe equality checks": a new kind is simply excluded, which is right ---
  "src/ui/screens/profile/profileView.ts | compare | a.kind === 'hsa'": {
    reason: 'safe: HSA checks (`savingsView`\'s HSA employer row and its HSA icon)',
    count: 2,
  },
  "src/intake/intakeMap.ts | compare | a.kind === 'brokerage'": { reason: 'safe: the brokerage-only basis (the missing-basis check and the basis sum)', count: 2 },
  "src/intake/intakeMap.ts | compare | a.kind === 'hsa'": { reason: 'safe: the HSA checks (HSA owners, the HSA employer stream, the HSA accounts)', count: 3 },
  "src/intake/intakeMap.ts | conditional | family === 'employerPlan' ? '401k' : family === 'hsa' ? 'hsa' : 'traditional-ira'": {
    reason: 'safe: `sampleKind` picks one kind per deposit family (KTD20: by family, not by kind), never a new kind',
  },
  "src/intake/intakeMap.ts | conditional | family === 'hsa' ? 'hsa' : 'traditional-ira'": { reason: 'safe: the inner half of `sampleKind`\'s pick' },
  "src/intake/whatIf.ts | compare | account.kind !== 'hsa'": { reason: 'safe: an HSA check (HSA employer money on any other kind is refused)' },
  "src/ui/workbench/railChrome.ts | compare | a.kind === 'hsa'": { reason: 'safe: an HSA check (which employer field a kind takes; a new kind takes none)' },
  "src/intake/accountForm.ts | compare | form.kind === 'hsa'": { reason: 'safe: an HSA check (the HSA employer field)' },
  "src/intake/accountForm.ts | compare | form.kind === 'brokerage'": { reason: 'safe: the brokerage-only basis' },
  "src/ui/screens/profile/drawers/accountFields.ts | compare | form.kind === 'hsa'": { reason: 'safe: an HSA check (the HSA employer field\'s error)' },
  "src/ui/screens/retirement/healthCareView.ts | compare | a.kind === 'hsa'": { reason: 'safe: an HSA check (the HSA note when the household holds one)' },
  "src/ui/screens/profile/drawers/AccountDrawer.tsx | compare | kind === 'hsa'": { reason: 'safe: HSA checks (the HSA icon and the HSA employer field)', count: 2 },
  "src/ui/screens/profile/drawers/AccountDrawer.tsx | compare | kind === 'brokerage'": { reason: 'safe: the brokerage-only basis field' },
  // U13 (schema version 7): each singles out the inherited kind itself, so no other kind is decided by its absence.
  "src/intake/inheritedIra.ts | compare | a.kind === 'inherited-ira'": { reason: 'safe: the inherited-account guard (the kind itself, with its facts)' },
  "src/intake/intakeMap.ts | compare | a.kind !== 'inherited-ira'": { reason: 'safe: the missing-facts arm reads only inherited accounts' },
  "src/ui/screens/profile/drawers/AccountDrawer.tsx | compare | k !== 'inherited-ira'": { reason: 'safe: no ordinary account can become an inherited IRA (its kind is locked)' },
}

const keyOf = (f: Finding): string => `${f.file} | ${f.shape} | ${f.text}`

const relOf = (f: string): string => relative(ROOT, f).split(sep).join('/')
const scanned = (f: string): boolean => {
  const rel = relOf(f)
  return rel.startsWith('src/') && /\.tsx?$/.test(rel) && !rel.endsWith('.d.ts') && !rel.includes('/__tests__/')
}

/** One program over `src` (tests aside), with some files' text replaced in memory and extra root files added. */
function programOf(overrides: ReadonlyMap<string, string>, extraRoots: readonly string[]): ts.Program {
  const config = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT)
  const host = ts.createCompilerHost(parsed.options, true)
  const baseGet = host.getSourceFile.bind(host)
  const baseExists = host.fileExists.bind(host)
  const baseRead = host.readFile.bind(host)
  const textOf = (f: string): string | undefined => overrides.get(join(f))
  host.getSourceFile = (f, lang, onError, shouldCreate) => {
    const text = textOf(f)
    return text !== undefined ? ts.createSourceFile(f, text, lang, true) : baseGet(f, lang, onError, shouldCreate)
  }
  host.fileExists = (f) => textOf(f) !== undefined || baseExists(f)
  host.readFile = (f) => textOf(f) ?? baseRead(f)
  return ts.createProgram({ rootNames: [...parsed.fileNames.filter(scanned), ...extraRoots], options: parsed.options, host })
}

/** Each source edit that adds one member to a vocabulary; it must apply exactly once (else the arm proves nothing). */
const VOCABULARY_EDITS: readonly { readonly file: string; readonly from: RegExp; readonly to: string }[] = [
  { file: 'src/shared/model.ts', from: /(export const ACCOUNT_KINDS = \[[^\]]*'hsa',)/, to: "$1\n  'eighth-kind'," },
  { file: 'src/intake/intakeMap.ts', from: /(export const KIND_BUCKETS = \[[^\]]*'hsa')/, to: "$1, 'eighth-bucket'" },
  { file: 'src/ui/screens/profile/profileView.ts', from: /(export type Treatment = 'pretax' \| 'roth' \| 'taxable' \| 'hsa')/, to: "$1 | 'eighth-treatment'" },
]

/** Every home that chooses by kind, by grouping or by treatment through a Record (or an object literal the vocabulary
 *  indexes), by the declaration that must stop compiling when its vocabulary gains a member. */
const RECORD_HOMES: readonly { readonly file: string; readonly name: string }[] = [
  // An eighth kind.
  { file: 'src/intake/intakeMap.ts', name: 'KIND_TO_BUCKET' },
  { file: 'src/intake/sanity.ts', name: 'KIND_TO_CATCHUP' },
  { file: 'src/intake/accountKinds.ts', name: 'KIND_LABELS' },
  { file: 'src/ui/screens/profile/profileView.ts', name: 'KIND_TREATMENT' },
  // A fifth grouping.
  { file: 'src/intake/intakeMap.ts', name: 'accountSources' },
  { file: 'src/intake/intakeMap.ts', name: 'contributionChannelsFor' },
  { file: 'src/ui/screens/dashboard/snapshotView.ts', name: 'INVESTED_LABEL' },
  { file: 'src/ui/screens/investment/investmentView.ts', name: 'BUCKET_NAME' },
  { file: 'src/ui/screens/investment/investmentView.ts', name: 'BUCKET_LOOK' },
  { file: 'src/ui/reentryChrome.ts', name: 'BUCKET_LABEL_KEY' },
  { file: 'src/ui/reentryChrome.ts', name: 'composeReentry' },
  { file: 'src/ui/workbench/railChrome.ts', name: 'PUT_IN' },
  // A fifth treatment.
  { file: 'src/ui/screens/profile/profileView.ts', name: 'TREATMENT_WORDS' },
  { file: 'src/ui/screens/profile/blueprintView.ts', name: 'TREATMENT_LEGEND' },
]

/** The homes whose own declaration holds a type error in `program`. Throws on a home it cannot find (a renamed home must
 *  be re-listed, never silently dropped). */
function homesInError(program: ts.Program): string[] {
  const out: string[] = []
  for (const home of RECORD_HOMES) {
    const sf = program.getSourceFiles().find((s) => relOf(s.fileName) === home.file)
    if (sf === undefined) throw new Error(`no source file ${home.file}`)
    let span: { start: number; end: number } | undefined
    const visit = (n: ts.Node): void => {
      if (span !== undefined) return
      if ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name !== undefined && ts.isIdentifier(n.name) && n.name.text === home.name) {
        span = { start: n.getStart(sf), end: n.getEnd() }
        return
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
    if (span === undefined) throw new Error(`no declaration ${home.name} in ${home.file}`)
    const { start, end } = span
    if (program.getSemanticDiagnostics(sf).some((d) => d.start !== undefined && d.start >= start && d.start < end)) out.push(`${home.file} ${home.name}`)
  }
  return out
}

describe('account kinds are never decided by omission (U10, KTD20, insight 147)', () => {
  let tree: Finding[] = []
  let planted: Finding[] = []
  let treeProgram: ts.Program
  let grownProgram: ts.Program

  beforeAll(() => {
    const isPlanted = (f: string): boolean => join(f) === PLANTED
    treeProgram = programOf(new Map([[PLANTED, PLANTED_TEXT]]), [PLANTED])
    const files = treeProgram.getSourceFiles()
    tree = scan(treeProgram, files.filter((sf) => scanned(sf.fileName) && !isPlanted(sf.fileName)))
    planted = scan(treeProgram, files.filter((sf) => isPlanted(sf.fileName)))
    const grown = new Map<string, string>()
    for (const edit of VOCABULARY_EDITS) {
      const path = join(ROOT, edit.file)
      const before = grown.get(path) ?? readFileSync(path, 'utf8')
      const after = before.replace(edit.from, edit.to)
      if (after === before || before.match(new RegExp(edit.from.source, 'g'))?.length !== 1) throw new Error(`the vocabulary edit did not apply once in ${edit.file}`)
      grown.set(path, after)
    }
    grownProgram = programOf(grown, [])
  }, 180_000)

  it('the scan is not vacuous: each shape in the planted file reds, and a bucket sharing a kind literal stays quiet', () => {
    expect(planted.map((f) => `${f.shape}: ${f.text}`).sort()).toEqual(
      [
        "compare: kind === 'hsa'",
        'membership: EMPLOYER.has(kind)',
        "conditional: roth ? 'roth-ira' : 'traditional-ira'",
        'switch: kind',
      ].sort(),
    )
  })

  it('every finding outside tests is allowed with its reason, and every allowed entry is still found (the list only shrinks)', () => {
    const counts = new Map<string, number>()
    for (const f of tree) counts.set(keyOf(f), (counts.get(keyOf(f)) ?? 0) + 1)
    const unexpected: string[] = []
    for (const [key, n] of counts) {
      const allowed = ALLOWED[key]?.count ?? (key in ALLOWED ? 1 : 0)
      if (n > allowed) unexpected.push(`  ${JSON.stringify(key)}: { reason: '…'${n > 1 ? `, count: ${n}` : ''} },`)
    }
    const stale = Object.entries(ALLOWED)
      .filter(([key, a]) => (counts.get(key) ?? 0) < (a.count ?? 1))
      .map(([key]) => key)
    expect(
      unexpected,
      'a kind decided by omission: make the home an exhaustive Record<AccountKind, …>, or allow it here with its reason',
    ).toEqual([])
    expect(stale, 'an allowed entry is no longer found: delete it (the list only shrinks)').toEqual([])
  })

  it('every allowed entry is a safe check, with its reason', () => {
    for (const [key, a] of Object.entries(ALLOWED)) {
      expect(a.reason, key).toMatch(/^safe: \S/)
    }
  })

  it('an eighth kind, a fifth grouping and a fifth treatment fail to compile in every Record home; the tree compiles clean there', () => {
    expect(homesInError(treeProgram), 'the tree as it stands: no home in error').toEqual([])
    expect(homesInError(grownProgram)).toEqual(RECORD_HOMES.map((h) => `${h.file} ${h.name}`))
  }, 180_000)

  it('reads the real source (the scan covers the intake and the screens)', () => {
    expect(tree.some((f) => f.file.startsWith('src/intake/'))).toBe(true)
    expect(readFileSync(join(ROOT, 'src', 'shared', 'model.ts'), 'utf8')).toContain('export const ACCOUNT_KINDS')
  })
})
