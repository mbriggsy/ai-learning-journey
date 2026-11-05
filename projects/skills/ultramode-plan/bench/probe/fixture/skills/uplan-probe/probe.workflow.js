export const meta = {
  name: 'uplan-probe',
  description: 'U1 probe: one helper writes into the state folder, pages a plan to its last line, and reports what it was given',
  phases: [{ title: 'Probe' }],
}

// args may arrive as a JSON string (the Workflow runtime passes args verbatim).
const a = typeof args === 'string' ? JSON.parse(args) : args
if (!a || !a.stateDir || !a.specPath) throw new Error('probe.workflow.js needs args.stateDir and args.specPath')

const REPORT = {
  type: 'object',
  properties: {
    wrote: { type: 'string', maxLength: 600 },
    last_line_number: { type: 'integer' },
    last_line_text: { type: 'string', maxLength: 4000 },
    pages_read: { type: 'integer' },
    relayed_text: { type: 'string', maxLength: 6000 },
  },
  required: ['wrote', 'last_line_number', 'last_line_text', 'pages_read', 'relayed_text'],
}

const prompt = [
  `You are one helper in a measurement probe. Do exactly these ${a.decoyRead ? 'four' : 'three'} things, then return.`,
  `1. Use the Write tool to write the file ${a.stateDir}/wf-helper-write.txt containing the single line UPLAN-WF-WRITE. Put its absolute path in "wrote".`,
  `2. Read the whole file ${a.specPath} with the Read tool, in pages of at most 160 lines (offset and limit), from line 1 until a page comes back with fewer lines than you asked for. Do not stop early and do not skip pages. Report the number of the last line that holds any text in "last_line_number", that line's exact text, copied character for character without its line-number prefix, in "last_line_text", and how many Read calls you made in "pages_read".`,
  '3. If the message that started you carries a block headed "Workflow harness" and "user request", copy that block\'s text verbatim into "relayed_text"; otherwise set "relayed_text" to the empty string.',
  ...(a.decoyRead ? [`4. Make one Read call of ${a.decoyRead}. It is expected to be refused; do not retry it or work around it.`] : []),
  'Use no other tools. Never ask a question.',
].join('\n')

phase('Probe')
const helper = await agent(prompt, { label: 'probe:helper', phase: 'Probe', schema: REPORT, model: 'opus', effort: 'xhigh' })
return { helper }
