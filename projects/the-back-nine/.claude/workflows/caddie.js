export const meta = {
  name: 'caddie',
  description: 'The Caddie reader panel — fresh-context, de-authored lenses cold-read a walk bundle (viewport frames, verbatim DOM copy, aria, CVD arms) and every blocker/high finding is adversarially refuted against the bundle before the chair sees it. The chair (the pilot, in-session) verifies and files the card — a raw panel output is never a clearance.',
  whenToUse: 'Invoked by the /caddie skill after `pnpm caddie:walk` lands a bundle. Pass { runDir, targets: [{ dir, firstState?, note? }], focus? } in args. runDir is the run-stamped bundle root (temp/caddie/<run>); each target dir sits under it with real/ + phone/ viewport subdirs.',
  phases: [
    { title: 'Read', detail: 'six lenses per target, fresh contexts, de-authored', model: 'opus' },
    { title: 'Refute', detail: 'copy-law + blocker/high findings checked against the full bundle', model: 'opus' },
  ],
}

// ============================================================================
// The panel protocol lives in .claude/skills/caddie/SKILL.md — this script is
// its codification (increment 4; it previously lived in session scratchpads).
// Landmines baked in, do not undo:
//  - model 'opus' EXPLICIT on every agent(); NEVER an agentType (none register
//    on this machine — a missing agentType crashes every lens at launch).
//  - Fresh contexts, de-authored: no build context, no authorship in prompts.
//  - Words from the DOM (copy.txt) — pixels are for tone/layout only; a
//    readback/copy mismatch is a CAPTURE defect, never a UI finding.
//  - The color lane FLAGS only; it never contributes to a clean verdict.
//  - The first-look reader is COLD by design: no corpus, no rubric, one image.
//  - The chair verifies everything in-session afterward; this workflow's
//    output is panel evidence, never a clearance.
// ============================================================================

const PROJECT = 'C:/Users/brigg/ai-learning-journey/projects/the-back-nine'
const CORPUS = PROJECT + '/.claude/skills/caddie/taste-corpus.md'

// The args-string landmine (the council.js lesson): the harness sometimes delivers `args`
// as a JSON-ENCODED STRING rather than the parsed object — parse defensively, never assume.
const ARGS = typeof args === 'string' ? JSON.parse(args) : args
if (!ARGS || !ARGS.runDir || !Array.isArray(ARGS.targets) || ARGS.targets.length === 0) {
  throw new Error('caddie panel needs args { runDir, targets: [{ dir, firstState?, note? }], focus? }')
}
const RUN = PROJECT + '/' + ARGS.runDir
const FOCUS = ARGS.focus ? 'WHAT THIS RUN JUDGES (scope note from the harness, not authorship): ' + ARGS.focus : ''

const FINDING_ITEMS = { type: 'object', additionalProperties: false,
  required: ['statement', 'anchor', 'lane', 'severity', 'corpusRules'],
  properties: {
    statement: { type: 'string' },
    anchor: { type: 'string', description: 'a DOM copy string, an aria node, or a named screenshot region — never a vibe' },
    lane: { type: 'string', enum: ['tone', 'correctness', 'both'] },
    severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'nit'] },
    corpusRules: { type: 'array', items: { type: 'string' } },
  } }

const READER_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['observations', 'findings'],
  properties: { observations: { type: 'array', items: { type: 'string' } }, findings: { type: 'array', items: FINDING_ITEMS } } }

const FIRSTLOOK_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['firstImpression', 'headlineDollarReadback', 'oddsLineReadback', 'confusions', 'findings'],
  properties: {
    firstImpression: { type: 'string', description: 'what is this / what is it telling me / tone / trust / feeling — locked before anything else' },
    headlineDollarReadback: { type: 'string', description: 'the headline dollar figure as read OFF THE IMAGE (the capture canary)' },
    oddsLineReadback: { type: 'string', description: 'the odds line as read OFF THE IMAGE' },
    confusions: { type: 'array', items: { type: 'string' } },
    findings: { type: 'array', items: FINDING_ITEMS },
  } }

const VERDICT_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['survives', 'reasoning', 'contextThatKillsIt'],
  properties: { survives: { type: 'boolean' }, reasoning: { type: 'string' },
    contextThatKillsIt: { type: 'string', description: 'the adjacent line / channel artifact / bundle evidence that neutralizes the finding — empty string if none' } } }

const COMMON = (dir) => `
BUNDLE: ${RUN}/${dir} — subdirs real/ (his laptop, 1536x791 CSS px @2.5dpr — the PRIMARY read) and phone/ (390x844 @3dpr — the secondary check). Each state dir holds: viewport.png (above-fold), fullpage.png, crop-*.png (device-scale text crops), cvd-*.png (color-vision arms incl. per-chart crops), aria.yaml, copy.txt (VERBATIM DOM text), sr-only.txt (visually-hidden nodes ALSO present inside copy.txt — check apparent duplications against it before flagging), dialog.txt (open sheet text), fold.json (what sits above/below the fold), console.json. Use Glob/Read to walk it.
${FOCUS}
THE PRODUCT (all the context you get): a calm retirement co-pilot a married couple consults; it prices taxes/healthcare and answers whether their money holds, with confidence stated in odds ("N of 10"). Its cardinal rule: calm-but-wrong is the sin — a rosier-than-true reading is the worst defect.
Findings must be ANCHORED (a copy.txt string, an aria node, a named region of a named png) and tagged lane: tone|correctness|both, severity: blocker|high|medium|nit. Observations first, findings second. Do not manufacture findings — a clean read is a valid read. READ-ONLY: never edit any file.`

const CORPUS_NOTE = `FIRST read the taste corpus: ${CORPUS} — the evidenced rules + anti-patterns + vocabulary of the ONE reader this product serves (color-blind; hates jargon, false precision, forced derivation; loves plain named mechanisms). Cite rules by number in corpusRules.`

phase('Read')
log(`Panel over ${ARGS.targets.length} target(s) — 6 lenses each, fresh contexts`)

const panels = await parallel(ARGS.targets.map((t) => () => (async () => {
  const dir = t.dir
  const first = t.firstState ?? 'landing'
  const note = t.note ? 'TARGET NOTE (walk shape, not authorship): ' + t.note : ''

  const [firstLook, spouse, copyFinder, calm, cvd, hunter] = await parallel([
    () => agent(`You are a genuinely COLD first-look reader. Read ONLY this image: ${RUN}/${dir}/real/${first}/viewport.png — nothing else, no other files. Lock your first impression BEFORE any second pass: what is this? what is it telling me? tone? do I trust it? how does it make me feel? Then a second pass for confusions. Also read back OFF THE IMAGE the headline dollar figure and the odds line ("N of 10" or similar) exactly as rendered — if none is visible, say "none visible". You get no product context by design.`,
      { label: `first-look:${dir}`, phase: 'Read', model: 'opus', schema: FIRSTLOOK_SCHEMA }),
    () => agent(`You are the NAIVE-SPOUSE walker: no finance background, scared, first time on this product, your spouse usually handles money. ${CORPUS_NOTE}\nRead every state's copy.txt and dialog.txt under ${RUN}/${dir} (both viewports; real/ primary) IN USER ORDER (state dir names). ${note}\nAnswer as this persona: what is our situation? are we okay? what would I do next? HUNT confusion — do not glide: every term you would not know, every figure whose origin you cannot name, every sentence you would misread. Each stumble is a finding (lane both if a misread is rosier than truth).${COMMON(dir)}`,
      { label: `spouse:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
    () => agent(`You are the COPY-LAW finder. ${CORPUS_NOTE}\nRun the seven comprehension-hole shapes (unnamed referent; forced derivation; two figures one referent; mechanism unnamed; era/source missing; general-term-without-a-details-home; omission-reads-as-a-bill) PLUS the corpus copy rules over the VERBATIM copy.txt + dialog.txt of every state under ${RUN}/${dir}. ${note}\nEvery quantity must be quoted in-sentence in the user's frame; every mechanism named with its owner; disclosures mechanism-not-memory (rule 37); general terms need a details home (rule 38); omissions must not read as bills (rule 39). Flag candidates generously — an independent refuter checks each against full rendered context after you.${COMMON(dir)}`,
      { label: `copy-law:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
    () => agent(`You are the CALM/HONESTY reader. ${CORPUS_NOTE}\nRead ${RUN}/${dir}/real/*/viewport.png + every copy.txt. ${note}\nRun the false-precision/casino-tell checklist: lone unhedged point estimates, spurious decimals, bare success-percentages, celebration on a money result, reassurance-as-spin, alarm-as-theater. Penalize hype/irreverence/false precision — NEVER warmth. The product should read like a careful friend, not a dashboard.${COMMON(dir)}`,
      { label: `calm:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
    () => agent(`You are the CVD screener — FLAGS ONLY (the color lane never contributes to a clean verdict; a simulator is not the reader's eyes). Read every cvd-*.png (above-fold arms AND the per-chart cvd-<arm>-<chart>.png crops) + aria.yaml under ${RUN}/${dir}. ${note}\nAsk: does every MEANING survive without color (shape/word/magnitude/position)? does hierarchy survive grayscale? is every color-carried signal also reachable as text (aria)? Presence of a cue is NOT disambiguation.${COMMON(dir)}`,
      { label: `cvd:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
    () => agent(`You are the FALSE-PASS HUNTER — the panel's reason to exist. Read EVERYTHING under ${RUN}/${dir} (all states, both viewports, all channels). ${note}\nCharge: assume this surface IS calm-but-wrong. Find the rosier-than-true reading a scared couple would actually walk away with — the figure they would misattribute, the cost they would believe is included when it is not, the "fine" that is narrower than it sounds. ${CORPUS_NOTE}\nA clean verdict from you must be EARNED: enumerate the rosier readings you attempted and why each dies against the rendered words. If you find one that survives, it is at minimum severity high, lane both.${COMMON(dir)}`,
      { label: `false-pass:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
  ])

  return { dir, firstLook, lenses: { spouse, copyFinder, calm, cvd, hunter } }
})()))

const panelsOk = panels.filter(Boolean)

phase('Refute')
// The copy-law finder's candidates are refuted per the SKILL's finder→refuter law; every
// OTHER lens's blocker/high finding gets the same treatment (an adjacent line legitimately
// supplying a referent kills a finding — insight-069's proven pattern). medium/nit pass
// through to the chair unrefuted (the chair verifies everything anyway).
const refuted = await parallel(panelsOk.map((p) => () => (async () => {
  const candidates = []
  for (const [lensName, r] of Object.entries(p.lenses)) {
    if (!r) continue
    for (const f of r.findings) {
      if (lensName === 'copyFinder' || f.severity === 'blocker' || f.severity === 'high') {
        candidates.push({ lens: lensName, ...f })
      }
    }
  }
  const verdicts = await parallel(candidates.map((f) => () => agent(
`You are an independent REFUTER on a cold-read panel. A finder flagged this on a rendered surface; your default posture is to KILL it against the full rendered context (an adjacent line legitimately supplying the referent, an sr-only channel artifact, a crop showing what the fold hides, a help line one tap away).

FINDING (${f.lens}, ${f.severity}, lane ${f.lane}): ${f.statement}
ANCHOR: ${f.anchor}

Check it against the FULL bundle for this target: ${RUN}/${p.dir} (all states, both viewports — copy.txt, sr-only.txt, dialog.txt, aria.yaml, fold.json, the pngs). Rules: a referent supplied by an ADJACENT RENDERED line kills an unnamed-referent finding; an apparent duplication that appears in sr-only.txt is a channel artifact, not a rendered defect; something below the fold still RENDERS (fold position is a severity input, not a kill). If the finding survives, say what makes it survive. READ-ONLY.`,
    { label: `refute:${p.dir}:${f.lens}`, phase: 'Refute', model: 'opus', schema: VERDICT_SCHEMA })
    .then((v) => ({ finding: f, verdict: v }))))
  return { dir: p.dir, refuted: verdicts.filter(Boolean) }
})()))

const refutedOk = refuted.filter(Boolean)
log(`Panel complete: ${panelsOk.length} targets read, ${refutedOk.reduce((n, r) => n + r.refuted.length, 0)} findings refuter-checked`)

return {
  targets: panelsOk.map((p) => ({
    dir: p.dir,
    firstLook: p.firstLook,
    lenses: Object.fromEntries(Object.entries(p.lenses).map(([k, v]) => [k, v ?? { observations: ['LENS CRASHED — abstention, not a clean read'], findings: [] }])),
    refuted: (refutedOk.find((r) => r.dir === p.dir) ?? { refuted: [] }).refuted,
  })),
  chairReminder: 'This output is panel evidence, never a clearance. Verify every surviving finding against the bundle yourself, route correctness findings to the oracle lane, assemble the card per SKILL.md, log the prediction, and dispose per the batched-oracle law.',
}
