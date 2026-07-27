export const meta = {
  name: 'caddie-ab',
  description: 'The Caddie reader panel, DUAL-PANEL A/B edition (Briggsy\'s 2026-07-23 ratification): every PERCEPTION seat runs twice — an Opus panel and a Sonnet-5 panel — over the same bundle; the FALSE-PASS hunter and every refuter stay big-model (Opus). The chair diffs the two panels seat-by-seat and the tape scores BOTH; a clean diff on this walk is the evidence for flipping perception seats to Sonnet. A raw panel output is never a clearance.',
  whenToUse: 'Invoked by the /caddie skill for the ratified Sonnet-5 dual-panel A/B walk. Pass { runDir, targets: [{ dir, firstState?, note? }], focus? } in args — the same contract as caddie.js.',
  phases: [
    { title: 'Read', detail: 'six lenses per target × two panels (perception seats duplicated; hunter Opus-only)' },
    { title: 'Refute', detail: 'copy-law + blocker/high findings checked against the full bundle, per panel, Opus' },
  ],
}

// ============================================================================
// caddie.js's protocol with the A/B twist. The base landmines hold, do not undo:
//  - model EXPLICIT on every agent(); NEVER an agentType (none register here).
//  - Fresh contexts, de-authored: no build context, no authorship in prompts.
//  - Words from the DOM (copy.txt) — pixels are for tone/layout only.
//  - The color lane FLAGS only; the first-look reader is COLD by design.
//  - The chair verifies everything in-session afterward.
// A/B-specific:
//  - Perception seats (first-look, spouse, copy-law, calm, cvd) run TWICE:
//    panel 'opus' (the incumbent) and panel 'sonnet' (the candidate).
//  - The FALSE-PASS hunter runs ONCE, Opus (his ratification: hunters stay
//    big-model — the safety-critical seat is not the experiment).
//  - Refuters are Opus for BOTH panels' candidates (the verdicts must be
//    comparable — a weaker refuter on one arm would confound the diff).
//  - The return carries both panels per target so the chair can diff
//    seat-by-seat and the tape can score each panel's predictions.
// ============================================================================

const PROJECT = 'C:/Users/brigg/ai-learning-journey/projects/the-back-nine'
const CORPUS = PROJECT + '/.claude/skills/caddie/taste-corpus.md'

const ARGS = typeof args === 'string' ? JSON.parse(args) : args
if (!ARGS || !ARGS.runDir || !Array.isArray(ARGS.targets) || ARGS.targets.length === 0) {
  throw new Error('caddie-ab panel needs args { runDir, targets: [{ dir, firstState?, note? }], focus? }')
}
const RUN = PROJECT + '/' + ARGS.runDir
const FOCUS = ARGS.focus ? 'WHAT THIS RUN JUDGES (scope note from the harness, not authorship): ' + ARGS.focus : ''

// INSIGHT 084, the 2026-07-22 refinement — MIRRORED from caddie.js; the two files' schemas are
// deliberately byte-identical, so any change here lands in both or the A/B comparison stops being
// a model comparison. The SCHEMA is the enforcement layer and the prompt is only advisory: a seat
// whose call overflows is TRUNCATED after its first property, fails validation on the now-missing
// fields, re-truncates on every retry, and dies with its ENTIRE read. Cap so a maximal LEGAL
// payload still fits, and order properties MOST-LOAD-BEARING FIRST — the first one survives a cut.
//
// A/B NOTE: the caps bind both models identically, so they cannot bias the Opus-vs-Sonnet diff;
// an uncapped schema could, by killing whichever model writes longer.
const FINDING_ITEMS = { type: 'object', additionalProperties: false,
  required: ['statement', 'anchor', 'lane', 'severity', 'corpusRules'],
  properties: {
    statement: { type: 'string', maxLength: 320 },
    anchor: { type: 'string', maxLength: 160, description: 'a DOM copy string, an aria node, or a named screenshot region — never a vibe' },
    lane: { type: 'string', enum: ['tone', 'correctness', 'both'] },
    severity: { type: 'string', enum: ['blocker', 'high', 'medium', 'nit'] },
    corpusRules: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 32 } },
  } }

// findings BEFORE observations, in both `required` and `properties`: findings are the deliverable,
// so they are what must survive if the call is cut after its first property.
const READER_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['findings', 'observations'],
  properties: {
    findings: { type: 'array', maxItems: 5, items: FINDING_ITEMS },
    observations: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 200 } },
  } }

// firstImpression stays first — it IS this seat's deliverable. The two readbacks follow because
// they are the capture canary (proof the image was actually read) and cost ~120 chars between
// them; findings outrank confusions.
const FIRSTLOOK_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['firstImpression', 'headlineDollarReadback', 'oddsLineReadback', 'findings', 'confusions'],
  properties: {
    firstImpression: { type: 'string', maxLength: 600, description: 'what is this / what is it telling me / tone / trust / feeling — locked before anything else' },
    headlineDollarReadback: { type: 'string', maxLength: 60, description: 'the headline dollar figure as read OFF THE IMAGE (the capture canary)' },
    oddsLineReadback: { type: 'string', maxLength: 60, description: 'the odds line as read OFF THE IMAGE' },
    findings: { type: 'array', maxItems: 3, items: FINDING_ITEMS },
    confusions: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 200 } },
  } }

const VERDICT_SCHEMA = { type: 'object', additionalProperties: false,
  required: ['survives', 'reasoning', 'contextThatKillsIt'],
  properties: { survives: { type: 'boolean' }, reasoning: { type: 'string', maxLength: 600 },
    contextThatKillsIt: { type: 'string', maxLength: 320, description: 'the adjacent line / channel artifact / bundle evidence that neutralizes the finding — empty string if none' } } }

// The advisory half of 084. It must reach EVERY seat that emits a schema call — including the two
// that take no COMMON block by charter: the first-look seat (no product context by design) and the
// refuter. A size law is output format, not product context, so it is safe in both.
const SIZE_LAW = `
STRUCTURED-OUTPUT SIZE LAW (insight 084 — the U16 review lost 4 of 42 seats to this): an oversized schema call is TRUNCATED after its first property, fails validation on the now-missing fields, and re-truncates identically on every retry until the cap — the seat dies and its ENTIRE read is lost. The schema now caps every field; stay well inside it. Budget: each finding's statement <= 320 chars, its anchor <= 160; observations/confusions <= 4 entries of <= 200 chars. Depth belongs in your reasoning BEFORE the call — the call is the verdict summary, never the essay.
IF YOU HAVE MORE FINDINGS THAN THE CAP: emit the most severe, and state the number you dropped inside your LAST finding's statement. A bounded read the chair can see is honest; a silently short one is not.`

const COMMON = (dir) => `
BUNDLE: ${RUN}/${dir} — subdirs real/ (his laptop, 1536x791 CSS px @2.5dpr — the PRIMARY read) and phone/ (390x844 @3dpr — the secondary check). Each state dir holds: viewport.png (above-fold), fullpage.png, crop-*.png (device-scale text crops), cvd-*.png (color-vision arms incl. per-chart crops), aria.yaml, copy.txt (VERBATIM DOM text), sr-only.txt (visually-hidden nodes ALSO present inside copy.txt — check apparent duplications against it before flagging), dialog.txt (open sheet text), fold.json (what sits above/below the fold), console.json. Use Glob/Read to walk it.
${FOCUS}
THE PRODUCT (all the context you get): a calm retirement co-pilot a married couple consults; it prices taxes/healthcare and answers whether their money holds, with confidence stated in odds ("N of 10"). Its cardinal rule: calm-but-wrong is the sin — a rosier-than-true reading is the worst defect.
Findings must be ANCHORED (a copy.txt string, an aria node, a named region of a named png) and tagged lane: tone|correctness|both, severity: blocker|high|medium|nit. OBSERVE before you conclude — but EMIT findings first: the schema orders them ahead of observations on purpose, so a truncated call never loses them. Do not manufacture findings — a clean read is a valid read. READ-ONLY: never edit any file.${SIZE_LAW}`

const CORPUS_NOTE = `FIRST read the taste corpus: ${CORPUS} — the evidenced rules + anti-patterns + vocabulary of the ONE reader this product serves (color-blind; hates jargon, false precision, forced derivation; loves plain named mechanisms). Cite rules by number in corpusRules.`

// The five PERCEPTION seat prompts (identical text for both panels — the model is the only variable).
const SEAT_PROMPTS = (dir, first, note) => ({
  firstLook: `You are a genuinely COLD first-look reader. Read ONLY this image: ${RUN}/${dir}/real/${first}/viewport.png — nothing else, no other files. Lock your first impression BEFORE any second pass: what is this? what is it telling me? tone? do I trust it? how does it make me feel? Then a second pass for confusions. Also read back OFF THE IMAGE the headline dollar figure and the odds line ("N of 10" or similar) exactly as rendered — if none is visible, say "none visible". You get no product context by design.${SIZE_LAW}`,
  spouse: `You are the NAIVE-SPOUSE walker: no finance background, scared, first time on this product, your spouse usually handles money. ${CORPUS_NOTE}\nRead every state's copy.txt and dialog.txt under ${RUN}/${dir} (both viewports; real/ primary) IN USER ORDER (state dir names). ${note}\nAnswer as this persona: what is our situation? are we okay? what would I do next? HUNT confusion — do not glide: every term you would not know, every figure whose origin you cannot name, every sentence you would misread. Each stumble is a finding (lane both if a misread is rosier than truth).${COMMON(dir)}`,
  copyFinder: `You are the COPY-LAW finder. ${CORPUS_NOTE}\nRun the seven comprehension-hole shapes (unnamed referent; forced derivation; two figures one referent; mechanism unnamed; era/source missing; general-term-without-a-details-home; omission-reads-as-a-bill) PLUS the corpus copy rules over the VERBATIM copy.txt + dialog.txt of every state under ${RUN}/${dir}. ${note}\nEvery quantity must be quoted in-sentence in the user's frame; every mechanism named with its owner; disclosures mechanism-not-memory (rule 37); general terms need a details home (rule 38); omissions must not read as bills (rule 39). Flag candidates generously — an independent refuter checks each against full rendered context after you.${COMMON(dir)}`,
  calm: `You are the CALM/HONESTY reader. ${CORPUS_NOTE}\nRead ${RUN}/${dir}/real/*/viewport.png + every copy.txt. ${note}\nRun the false-precision/casino-tell checklist: lone unhedged point estimates, spurious decimals, bare success-percentages, celebration on a money result, reassurance-as-spin, alarm-as-theater. Penalize hype/irreverence/false precision — NEVER warmth. The product should read like a careful friend, not a dashboard.${COMMON(dir)}`,
  cvd: `You are the CVD screener — FLAGS ONLY (the color lane never contributes to a clean verdict; a simulator is not the reader's eyes). Read every cvd-*.png (above-fold arms AND the per-chart cvd-<arm>-<chart>.png crops) + aria.yaml under ${RUN}/${dir}. ${note}\nAsk: does every MEANING survive without color (shape/word/magnitude/position)? does hierarchy survive grayscale? is every color-carried signal also reachable as text (aria)? Presence of a cue is NOT disambiguation.${COMMON(dir)}`,
})

phase('Read')
log(`A/B panel over ${ARGS.targets.length} target(s) — 5 perception seats × 2 models + 1 Opus hunter each`)

const panels = await parallel(ARGS.targets.map((t) => () => (async () => {
  const dir = t.dir
  const first = t.firstState ?? 'landing'
  const note = t.note ? 'TARGET NOTE (walk shape, not authorship): ' + t.note : ''
  const prompts = SEAT_PROMPTS(dir, first, note)

  const seat = (name, prompt, model, schema) =>
    agent(prompt, { label: `${name}:${model}:${dir}`, phase: 'Read', model, schema })

  const [oFirst, oSpouse, oCopy, oCalm, oCvd, sFirst, sSpouse, sCopy, sCalm, sCvd, hunter] = await parallel([
    () => seat('first-look', prompts.firstLook, 'opus', FIRSTLOOK_SCHEMA),
    () => seat('spouse', prompts.spouse, 'opus', READER_SCHEMA),
    () => seat('copy-law', prompts.copyFinder, 'opus', READER_SCHEMA),
    () => seat('calm', prompts.calm, 'opus', READER_SCHEMA),
    () => seat('cvd', prompts.cvd, 'opus', READER_SCHEMA),
    () => seat('first-look', prompts.firstLook, 'sonnet', FIRSTLOOK_SCHEMA),
    () => seat('spouse', prompts.spouse, 'sonnet', READER_SCHEMA),
    () => seat('copy-law', prompts.copyFinder, 'sonnet', READER_SCHEMA),
    () => seat('calm', prompts.calm, 'sonnet', READER_SCHEMA),
    () => seat('cvd', prompts.cvd, 'sonnet', READER_SCHEMA),
    // The FALSE-PASS hunter — ONCE, Opus (the ratification: hunters stay big-model; the safety-
    // critical seat is not the experiment).
    () => agent(`You are the FALSE-PASS HUNTER — the panel's reason to exist. Read EVERYTHING under ${RUN}/${dir} (all states, both viewports, all channels). ${note}\nCharge: assume this surface IS calm-but-wrong. Find the rosier-than-true reading a scared couple would actually walk away with — the figure they would misattribute, the cost they would believe is included when it is not, the "fine" that is narrower than it sounds. ${CORPUS_NOTE}\nA clean verdict from you must be EARNED: enumerate the rosier readings you attempted and why each dies against the rendered words. If you find one that survives, it is at minimum severity high, lane both.${COMMON(dir)}`,
      { label: `false-pass:${dir}`, phase: 'Read', model: 'opus', schema: READER_SCHEMA }),
  ])

  return {
    dir,
    panels: {
      opus: { firstLook: oFirst, lenses: { spouse: oSpouse, copyFinder: oCopy, calm: oCalm, cvd: oCvd } },
      sonnet: { firstLook: sFirst, lenses: { spouse: sSpouse, copyFinder: sCopy, calm: sCalm, cvd: sCvd } },
    },
    hunter,
  }
})()))

const panelsOk = panels.filter(Boolean)

phase('Refute')
// Refuters are OPUS for both panels (comparable verdicts). Candidates: every copy-law finding +
// every blocker/high from any seat (both panels) + the hunter's. Tagged by panel for the tape.
const refuted = await parallel(panelsOk.map((p) => () => (async () => {
  const candidates = []
  for (const [panelName, panel] of Object.entries(p.panels)) {
    for (const [lensName, r] of Object.entries(panel.lenses)) {
      if (!r) continue
      for (const f of r.findings) {
        if (lensName === 'copyFinder' || f.severity === 'blocker' || f.severity === 'high') {
          candidates.push({ panel: panelName, lens: lensName, ...f })
        }
      }
    }
  }
  if (p.hunter) {
    for (const f of p.hunter.findings) {
      if (f.severity === 'blocker' || f.severity === 'high') candidates.push({ panel: 'hunter', lens: 'false-pass', ...f })
    }
  }
  const verdicts = await parallel(candidates.map((f) => () => agent(
`You are an independent REFUTER on a cold-read panel. A finder flagged this on a rendered surface; your default posture is to KILL it against the full rendered context (an adjacent line legitimately supplying the referent, an sr-only channel artifact, a crop showing what the fold hides, a help line one tap away).

FINDING (${f.panel}/${f.lens}, ${f.severity}, lane ${f.lane}): ${f.statement}
ANCHOR: ${f.anchor}

Check it against the FULL bundle for this target: ${RUN}/${p.dir} (all states, both viewports — copy.txt, sr-only.txt, dialog.txt, aria.yaml, fold.json, the pngs). Rules: a referent supplied by an ADJACENT RENDERED line kills an unnamed-referent finding; an apparent duplication that appears in sr-only.txt is a channel artifact, not a rendered defect; something below the fold still RENDERS (fold position is a severity input, not a kill). If the finding survives, say what makes it survive. READ-ONLY.${SIZE_LAW}`,
    { label: `refute:${p.dir}:${f.panel}:${f.lens}`, phase: 'Refute', model: 'opus', schema: VERDICT_SCHEMA })
    .then((v) => ({ finding: f, verdict: v }))))
  return { dir: p.dir, refuted: verdicts.filter(Boolean) }
})()))

const refutedOk = refuted.filter(Boolean)
log(`A/B panel complete: ${panelsOk.length} targets × 2 panels read, ${refutedOk.reduce((n, r) => n + r.refuted.length, 0)} findings refuter-checked`)

return {
  targets: panelsOk.map((p) => ({
    dir: p.dir,
    panels: Object.fromEntries(Object.entries(p.panels).map(([name, panel]) => [name, {
      firstLook: panel.firstLook ?? { firstImpression: 'SEAT CRASHED — abstention', headlineDollarReadback: '', oddsLineReadback: '', confusions: [], findings: [] },
      lenses: Object.fromEntries(Object.entries(panel.lenses).map(([k, v]) => [k, v ?? { observations: ['LENS CRASHED — abstention, not a clean read'], findings: [] }])),
    }])),
    hunter: p.hunter ?? { observations: ['HUNTER CRASHED — abstention, not a clean verdict'], findings: [] },
    refuted: (refutedOk.find((r) => r.dir === p.dir) ?? { refuted: [] }).refuted,
  })),
  chairReminder: 'A/B edition: diff the two panels SEAT-BY-SEAT (findings each caught/missed/false-flagged), score BOTH on the tape, and verify every surviving finding against the bundle yourself. The flip decision (perception seats → Sonnet) needs a clean diff on the tape, not one walk\'s vibe. Assemble the card per SKILL.md; dispose per the batched-oracle law.',
}
