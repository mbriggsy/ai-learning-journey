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
 * An allowed finding carries its reason, in one of two classes: `safe:` (KTD20's "safe equality checks": the new kind
 * is simply excluded, which is right) or `U10: convert` (a home U10's first commit turns into an exhaustive Record).
 * The list is matched as a multiset, both ways: a new finding reds, and so does an entry no longer found, so the list
 * only shrinks. The planted file below proves each shape reds (a new kind of check owes its planted guard).
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
 *  Classified 2026-11-27 (b9-1) against KTD20. One key can hold sites of both classes (a count over one text): it is
 *  filed under U10 while any of its sites is U10's, and the count drop that converting one forces re-opens it.
 *  KTD20 also names homes no scan can see, because they choose by tax bucket or label rather than by kind
 *  (`investedKinds`, Balance Sheet's grouping, `bucketAccounts`, `reentryChrome`'s four buckets, `treatmentLegend`,
 *  `accountAddItems`, `ARMS.deposits`' and `railOffers`' deposit loops, `buildAccount`'s deposit): its list governs those. */
const ALLOWED: Readonly<Record<string, { readonly reason: string; readonly count?: number }>> = {
  // --- U10's first commit converts these (KTD20, "silent today, and wrong for a new kind") ---
  "src/intake/intakeMap.ts | compare | kind === 'brokerage'": { reason: 'U10: convert `familyOf` (a ternary that files any unnamed kind in the IRA family, sharing its deposit ceiling)' },
  "src/intake/intakeMap.ts | compare | kind === 'hsa'": { reason: 'U10: convert `familyOf` (its HSA arm; the same ternary)' },
  "src/ui/screens/profile/profileView.ts | compare | kind === 'brokerage'": { reason: 'U10: convert `treatmentOf` (an if-chain that ends on "Pre-tax" for any unnamed kind)' },
  "src/ui/screens/profile/profileView.ts | compare | kind === 'hsa'": { reason: 'U10: convert `treatmentOf` (its HSA arm)' },
  "src/ui/screens/profile/profileView.ts | compare | kind === 'roth-401k'": { reason: 'U10: convert `treatmentOf` (its Roth arm)' },
  "src/ui/screens/profile/profileView.ts | compare | kind === 'roth-ira'": { reason: 'U10: convert `treatmentOf` (its Roth arm)' },
  "src/ui/screens/profile/profileView.ts | compare | a.kind === 'brokerage'": {
    reason: 'U10: convert `limitLines` and `savingsView` (brokerage-or-not: any unnamed kind reads as having a deposit limit)',
    count: 3,
  },
  "src/ui/screens/profile/profileView.ts | compare | a.kind === 'hsa'": {
    reason: 'U10: convert `limitLines`\' family pick (ends on the IRA family); its other two sites, `savingsView`\'s HSA employer row and HSA icon, are safe',
    count: 3,
  },
  // --- KTD20's "safe equality checks": a new kind is simply excluded, which is right ---
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
}

const keyOf = (f: Finding): string => `${f.file} | ${f.shape} | ${f.text}`

describe('account kinds are never decided by omission (U10, KTD20, insight 147)', () => {
  let tree: Finding[] = []
  let planted: Finding[] = []

  beforeAll(() => {
    const config = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile)
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT)
    const scanned = (f: string): boolean => {
      const rel = relative(ROOT, f).split(sep).join('/')
      return rel.startsWith('src/') && /\.tsx?$/.test(rel) && !rel.endsWith('.d.ts') && !rel.includes('/__tests__/')
    }
    const host = ts.createCompilerHost(parsed.options, true)
    const baseGet = host.getSourceFile.bind(host)
    const baseExists = host.fileExists.bind(host)
    const baseRead = host.readFile.bind(host)
    const isPlanted = (f: string): boolean => join(f) === PLANTED
    host.getSourceFile = (f, lang, onError, shouldCreate) =>
      isPlanted(f) ? ts.createSourceFile(f, PLANTED_TEXT, lang, true) : baseGet(f, lang, onError, shouldCreate)
    host.fileExists = (f) => isPlanted(f) || baseExists(f)
    host.readFile = (f) => (isPlanted(f) ? PLANTED_TEXT : baseRead(f))
    const roots = [...parsed.fileNames.filter(scanned), PLANTED]
    const program = ts.createProgram({ rootNames: roots, options: parsed.options, host })
    const files = program.getSourceFiles()
    tree = scan(program, files.filter((sf) => scanned(sf.fileName) && !isPlanted(sf.fileName)))
    planted = scan(program, files.filter((sf) => isPlanted(sf.fileName)))
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

  it('every allowed entry names its class: safe, or U10’s conversion', () => {
    for (const [key, a] of Object.entries(ALLOWED)) {
      expect(a.reason, key).toMatch(/^(safe: |U10: convert )\S/)
    }
  })

  it('reads the real source (the scan covers the intake and the screens)', () => {
    expect(tree.some((f) => f.file.startsWith('src/intake/'))).toBe(true)
    expect(readFileSync(join(ROOT, 'src', 'shared', 'model.ts'), 'utf8')).toContain('export const ACCOUNT_KINDS')
  })
})
