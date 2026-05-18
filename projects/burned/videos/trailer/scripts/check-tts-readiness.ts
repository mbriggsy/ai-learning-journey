/**
 * Phase 0 Unit 0.2 Step 0a — Engine account readiness probe.
 *
 * Shell-agnostic (Node + dotenv + fetch) — works identically on Windows
 * PowerShell and Unix bash. Auth headers stay in-process; nothing hits
 * shell history.
 *
 * Per-engine probe shape (P1.11): auth + scope verification + real TTS
 * endpoint exercise. Catches voice-access gating, regional restrictions,
 * and silent tier downgrades that auth-only probes miss.
 *
 * Invoke from `videos/trailer/`:
 *   pnpm check:tts
 *
 * Outputs:
 *   sample-eval/r4-dash/account-readiness.md  — human-readable report
 *   sample-eval/r4-dash/char-budget.json      — usage tracker (preserved on re-run)
 *
 * Exit code: 0 on all green; 1 if any engine fails. Failure halts the
 * Unit 0.2 ladder at this step and routes the executor to the
 * Pre-Execution Prerequisites in phase-0-gate-resolution.md.
 */

import { config as loadEnv } from 'dotenv';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve paths from the script's own directory so cwd surprises don't matter.
// videos/trailer/scripts/check-tts-readiness.ts → BURNED root = ../../../
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');
const OUTPUT_DIR = resolve(TRAILER_ROOT, 'sample-eval/r4-dash');
const READINESS_PATH = resolve(OUTPUT_DIR, 'account-readiness.md');
const BUDGET_PATH = resolve(OUTPUT_DIR, 'char-budget.json');

loadEnv({ path: ENV_PATH });

type Probe = { engine: string; ok: boolean; detail: string };

async function probeElevenLabs(): Promise<Probe> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return { engine: 'elevenlabs', ok: false, detail: `ELEVENLABS_API_KEY missing from ${ENV_PATH}` };
  }
  // Auth + subscription tier check
  const u = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': key } });
  if (!u.ok) return { engine: 'elevenlabs', ok: false, detail: `auth probe ${u.status}` };
  const body = (await u.json()) as { subscription?: { tier?: string } };
  const tier = body?.subscription?.tier;
  if (tier !== 'creator') {
    return { engine: 'elevenlabs', ok: false, detail: `tier=${tier} (need 'creator' — Voice Library commercial rights + Instant Voice Cloning gated on this tier)` };
  }
  // Real TTS endpoint probe — generate 10 chars on Rachel (always-available Voice Library voice).
  // Voice ID 21m00Tcm4TlvDq8ikWAM = Rachel.
  const tts = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello', model_id: 'eleven_v3' }),
  });
  if (!tts.ok) return { engine: 'elevenlabs', ok: false, detail: `tts endpoint ${tts.status}` };
  const bytes = await tts.arrayBuffer();
  if (bytes.byteLength < 1000) {
    return { engine: 'elevenlabs', ok: false, detail: `tts returned ${bytes.byteLength} bytes (<1KB, suspicious)` };
  }
  return { engine: 'elevenlabs', ok: true, detail: `tier=creator, tts ok (${bytes.byteLength} bytes)` };
}

async function probeOpenAI(): Promise<Probe> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { engine: 'openai', ok: false, detail: `OPENAI_API_KEY missing from ${ENV_PATH}` };
  }
  // Auth + model scope check — gpt-4o-mini-tts is sometimes a separate enablement gate on accounts.
  const m = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  if (!m.ok) return { engine: 'openai', ok: false, detail: `auth probe ${m.status}` };
  const body = (await m.json()) as { data?: { id: string }[] };
  const hasTTS = body?.data?.some((row) => row.id === 'gpt-4o-mini-tts');
  if (!hasTTS) {
    return { engine: 'openai', ok: false, detail: 'gpt-4o-mini-tts not in account model list (account-scope enablement missing)' };
  }
  // Real TTS endpoint probe
  const tts = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', input: 'hello', voice: 'alloy' }),
  });
  if (!tts.ok) return { engine: 'openai', ok: false, detail: `tts endpoint ${tts.status}` };
  const bytes = await tts.arrayBuffer();
  if (bytes.byteLength < 1000) {
    return { engine: 'openai', ok: false, detail: `tts returned ${bytes.byteLength} bytes (<1KB, suspicious)` };
  }
  return { engine: 'openai', ok: true, detail: `model scope ok, tts ok (${bytes.byteLength} bytes)` };
}

async function probeGemini(): Promise<Probe> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { engine: 'gemini', ok: false, detail: `GEMINI_API_KEY missing from ${ENV_PATH}` };
  }
  const model = 'gemini-2.5-flash-preview-tts';
  const m = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`);
  if (!m.ok) return { engine: 'gemini', ok: false, detail: `model probe ${m.status} for ${model}` };
  const tts = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'hello' }] }],
        generationConfig: { responseModalities: ['AUDIO'] },
      }),
    },
  );
  if (!tts.ok) return { engine: 'gemini', ok: false, detail: `tts endpoint ${tts.status}` };
  return { engine: 'gemini', ok: true, detail: `model ${model} ok, tts endpoint ok` };
}

type Budget = {
  month: string;
  elevenlabs_chars_used: number;
  elevenlabs_chars_cap: number;
  tripwire_50pct: boolean;
  tripwire_80pct: boolean;
};

function initOrLoadBudget(): { budget: Budget; created: boolean } {
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (existsSync(BUDGET_PATH)) {
    const existing = JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) as Budget;
    // If the file is from a prior month, reset (new billing cycle).
    if (existing.month !== currentMonth) {
      const fresh: Budget = {
        month: currentMonth,
        elevenlabs_chars_used: 0,
        elevenlabs_chars_cap: 100_000,
        tripwire_50pct: false,
        tripwire_80pct: false,
      };
      writeFileSync(BUDGET_PATH, JSON.stringify(fresh, null, 2));
      return { budget: fresh, created: true };
    }
    return { budget: existing, created: false };
  }
  const budget: Budget = {
    month: currentMonth,
    elevenlabs_chars_used: 0,
    elevenlabs_chars_cap: 100_000,
    tripwire_50pct: false,
    tripwire_80pct: false,
  };
  writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
  return { budget, created: true };
}

async function main(): Promise<void> {
  // Ensure output dir exists (may be running before any prior probe).
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = await Promise.all([probeElevenLabs(), probeOpenAI(), probeGemini()]);
  const { budget, created } = initOrLoadBudget();

  const lines: string[] = [
    '# Engine Account Readiness',
    '',
    `Probed: ${new Date().toISOString()}`,
    `Env loaded from: \`${ENV_PATH}\``,
    '',
    '## Per-engine results',
    '',
    ...results.map((r) => `- **${r.engine}**: ${r.ok ? 'OK' : 'FAIL'} — ${r.detail}`),
    '',
    '## Char-budget tracker',
    '',
    `- Month: ${budget.month}`,
    `- ElevenLabs chars used: ${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}`,
    `- 50% tripwire (yellow): ${budget.tripwire_50pct ? 'TRIPPED' : 'clear'}`,
    `- 80% tripwire (red, halt): ${budget.tripwire_80pct ? 'TRIPPED' : 'clear'}`,
    `- Tracker file ${created ? 'initialized' : 'preserved'}: \`${BUDGET_PATH}\``,
    '',
  ];

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    lines.push('## Disposition: HALT', '', 'One or more engines failed readiness. Route to Pre-Execution Prerequisites in `docs/plans/origin-trailer/phase-0-gate-resolution.md` (Unit 0.2). Common causes:', '');
    for (const r of failed) {
      lines.push(`- **${r.engine}**: ${r.detail}`);
    }
    writeFileSync(READINESS_PATH, lines.join('\n'));
    console.error(`FAIL — ${failed.length}/${results.length} engines not ready. See ${READINESS_PATH}`);
    for (const r of failed) console.error(`  - ${r.engine}: ${r.detail}`);
    process.exit(1);
  }

  lines.push('## Disposition: READY', '', 'All engines green. Unit 0.2 Step 0.5 (audio pre-flight) may proceed.', '');
  writeFileSync(READINESS_PATH, lines.join('\n'));
  console.log(`OK — all engines ready. Report: ${READINESS_PATH}`);
}

void main();
