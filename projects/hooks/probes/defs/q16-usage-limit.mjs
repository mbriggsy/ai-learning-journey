// Q16: does a running workflow pause at a usage limit in a Remote Control
// session, or lose its agents (S11)?
//
// The plan settles this with a docs check first and a test only if the docs
// are silent. They aren't, and a usage limit can't be produced safely on
// purpose, so this probe records the docs answer plus the two local facts it
// turns on: whether the calling session has a live Remote Control connection
// (CLAUDE_CODE_BRIDGE_SESSION_ID, set only while one is active) and the
// autoContinueAtUsageLimit setting. It runs no session.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DOCS = 'https://code.claude.com/docs/en/workflows.md, "When a run hits your usage limit" (fetched 2026-10-21)';
const QUOTES = [
  'When an agent hits your claude.ai usage limit, the run pauses rather than failing that agent: the agents that hit the limit wait for the reset, and no new agents start. [...] Requires Claude Code v2.1.271 or later',
  'The run pauses only when all of these hold; when one doesn\'t, the affected agent fails instead: The session is interactive and signed in with a claude.ai subscription. A run doesn\'t pause in non-interactive mode with claude -p or the Agent SDK, in a background session, or in a Remote Control or agent team teammate session.',
  '[autoContinueAtUsageLimit] is on [...]. The limit resets within 24 hours. [...] The run hasn\'t already waited twice.',
  'Failed: runs again, and so does every agent the script starts after it, even ones that completed. [...] If a script starts A, B, C, and D in that order and B fails, relaunching returns A from cache and runs B, C, and D again.',
];

export default {
  id: 'Q16',
  question: 'Does a running workflow pause at a usage limit in a Remote Control session, or lose its agents?',
  assumption: 'A workflow launched from this (Remote Control) session waits out a usage limit instead of failing its agents.',
  loadBearing: false,
  async run() {
    const settingsFile = path.join(os.homedir(), '.claude', 'settings.json');
    let autoContinue = 'unset (the reference documents it as on until turned off)';
    try {
      const s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      if ('autoContinueAtUsageLimit' in s) autoContinue = String(s.autoContinueAtUsageLimit);
    } catch (e) {
      autoContinue = `unreadable (${e.code || e.message})`;
    }
    const rcLive = Boolean(process.env.CLAUDE_CODE_BRIDGE_SESSION_ID);
    const evidence = [
      `source: ${DOCS}`,
      ...QUOTES.map((q) => `quote: ${q}`),
      `the calling session has a live Remote Control connection: ${rcLive}`,
      `autoContinueAtUsageLimit in user settings: ${autoContinue}`,
    ];
    // The Remote Control rule decides this session only while its link is
    // live; without one, the other documented conditions do.
    const here = rcLive
      ? "This session's Remote Control link is live, so a fan-out launched here would fail at a limit, not wait"
      : `This session's Remote Control link is not live, so that rule does not decide it: a fan-out launched here waits only if the session is interactive, signed in with a claude.ai subscription, autoContinueAtUsageLimit is on (user settings: ${autoContinue}), the limit resets within 24 hours and the run has not already waited twice`;
    return {
      verdict: 'CONTRADICTED',
      summary: `documented: no pause in a Remote Control session (nor in -p, a background session or a teammate); the agent that hits the limit fails, completed agents keep their saved results, and a relaunch replays them and reruns the failed agent and every one after it. ${here}`,
      evidence,
    };
  },
};
