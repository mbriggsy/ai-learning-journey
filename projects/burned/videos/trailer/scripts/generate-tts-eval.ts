/**
 * Phase 0 Unit 0.2 Step 2 — Engine matrix generator.
 *
 * Generates the full Dash sample-script across three engine paths
 * using the Step 1.5 adapter files. Path B (Briggsy voice clone) is
 * OPT-IN and excluded from this first matrix run.
 *
 *   Path A   — ElevenLabs v3 preset (auto-picked from Voice Library)
 *   Path C-G — Gemini 3.1 Flash TTS Preview voice "Charon"
 *   Path C-O — OpenAI gpt-4o-mini-tts voice "onyx"
 *
 * 3 paths × 3 paragraphs = 9 WAVs, all written under
 * `videos/trailer/sample-eval/r4-dash/matrix/{path-id}/{paragraph-id}.wav`.
 * Plus a summary `matrix/results.md` capturing per-call latency, byte
 * counts, computed durations, picks, and any errors.
 *
 * Invoke from `videos/trailer/`:
 *   pnpm matrix
 *
 * Per-engine VOICE_DIRECTION anti-pattern guards fire at every call
 * site — see comments at each generator function.
 */

import { config as loadEnv } from 'dotenv';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DASH_SAMPLE_SCRIPT,
  PARAGRAPH_1_DEADPAN,
  PARAGRAPH_2_MONOLOGUE,
  PARAGRAPH_3_SCREAM,
} from './sample-script-dash.js';
import { extractPromptTemplate, substituteTranscript } from './generate-preflight-clip.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TRAILER_ROOT = resolve(SCRIPT_DIR, '..');
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ENV_PATH = resolve(BURNED_ROOT, '.env');

const ADAPTER_DIR = resolve(TRAILER_ROOT, 'sample-eval/r4-dash');
const GEMINI_ADAPTER = resolve(ADAPTER_DIR, 'cadence-spec-gemini.md');
const OPENAI_ADAPTER = resolve(ADAPTER_DIR, 'cadence-spec-openai.md');
const ELEVENLABS_ADAPTER = resolve(ADAPTER_DIR, 'cadence-spec-elevenlabs.json');

const MATRIX_DIR = resolve(ADAPTER_DIR, 'matrix');
const PATH_A_DIR = resolve(MATRIX_DIR, 'path-a-elevenlabs');
const PATH_CG_DIR = resolve(MATRIX_DIR, 'path-c-gemini');
const PATH_CO_DIR = resolve(MATRIX_DIR, 'path-c-openai');
const RESULTS_PATH = resolve(MATRIX_DIR, 'results.md');
const BUDGET_PATH = resolve(ADAPTER_DIR, 'char-budget.json');

loadEnv({ path: ENV_PATH });

// ----- Shared helpers ---------------------------------------------------

/**
 * Wrap raw PCM (24kHz / 16-bit / mono — Gemini's native output) in a
 * 44-byte RIFF WAV header. Same helper as generate-preflight-clip.ts;
 * duplicated here to keep both scripts self-contained.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Retry-on-transient wrapper. Retries on 503 (model overloaded — Gemini
 * surfaces this when the preview model spikes) and 429 (rate-limit —
 * ElevenLabs / OpenAI both use this). Backoff: 5s, 15s. Max 2 retries
 * (3 total attempts). Network-layer throws also retried.
 *
 * Reason this matters: Gemini Flash TTS Preview models are explicitly
 * preview-tier and prone to transient overload. Without retry the matrix
 * would falsely report a failing engine when the engine is fine.
 */
async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  const backoffsMs = [5000, 15000];
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status !== 503 && res.status !== 429) return res;
      if (attempt >= backoffsMs.length) return res;
      console.log(`[matrix]   ${label}: ${res.status}, retrying in ${backoffsMs[attempt]}ms (attempt ${attempt + 1}/${backoffsMs.length + 1})`);
      await new Promise((r) => setTimeout(r, backoffsMs[attempt]));
    } catch (e) {
      if (attempt >= backoffsMs.length) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[matrix]   ${label}: network throw "${msg}", retrying in ${backoffsMs[attempt]}ms (attempt ${attempt + 1}/${backoffsMs.length + 1})`);
      await new Promise((r) => setTimeout(r, backoffsMs[attempt]));
    }
  }
}

type ParagraphId = (typeof DASH_SAMPLE_SCRIPT)[number]['id'];

type CallResult = {
  paragraph: ParagraphId;
  path: 'path-a-elevenlabs' | 'path-c-gemini' | 'path-c-openai';
  ok: boolean;
  detail: string;
  outputPath?: string;
  bytes?: number;
  durationSeconds?: number;
  latencyMs?: number;
  charsUsed?: number;
};

function paragraphTextFor(id: ParagraphId): string {
  switch (id) {
    case 'deadpan-exposition':
      return PARAGRAPH_1_DEADPAN;
    case 'monologue-exasperation':
      return PARAGRAPH_2_MONOLOGUE;
    case 'scream':
      return PARAGRAPH_3_SCREAM;
  }
}

// ----- Path A: ElevenLabs v3 -------------------------------------------

type ElevenLabsAdapter = {
  model_id: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
  path_A_voice_library_filter: {
    labels: Record<string, string>;
    search_keywords: string[];
    anti_picks: string[];
  };
  bracket_tags_per_paragraph: Record<
    ParagraphId,
    {
      leading_tag: string;
      inline_tags: Array<{ position: string; tag: string; rationale: string }>;
    }
  >;
};

type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  description?: string;
  category?: string;
};

/**
 * Enumerate the Voice Library, score against the adapter filter,
 * return the top-ranked voice. Scoring is logged in results.md so
 * the pick is auditable + iterable.
 */
async function pickElevenLabsVoice(
  adapter: ElevenLabsAdapter,
  key: string,
): Promise<{ id: string; name: string; score: number; ranking: Array<{ name: string; id: string; score: number }> }> {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`ElevenLabs voices enumeration failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const body = (await res.json()) as { voices: ElevenLabsVoice[] };
  const filter = adapter.path_A_voice_library_filter;
  const blob = (v: ElevenLabsVoice): string => {
    const labelText = v.labels ? Object.values(v.labels).join(' ') : '';
    return `${v.name} ${v.description ?? ''} ${labelText}`.toLowerCase();
  };
  const ranked = body.voices
    .map((v) => {
      let score = 0;
      const text = blob(v);
      if (v.labels?.['accent']?.toLowerCase().includes(filter.labels['accent'] ?? '')) score += 3;
      if (v.labels?.['gender']?.toLowerCase().includes(filter.labels['gender'] ?? '')) score += 3;
      for (const kw of filter.search_keywords) {
        if (text.includes(kw.toLowerCase())) score += 1;
      }
      for (const anti of filter.anti_picks) {
        if (text.includes(anti.toLowerCase())) score -= 5;
      }
      return { name: v.name, id: v.voice_id, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    throw new Error('No ElevenLabs voices matched the adapter filter — relax search_keywords in cadence-spec-elevenlabs.json.');
  }
  const top = ranked[0]!;
  return { id: top.id, name: top.name, score: top.score, ranking: ranked.slice(0, 5) };
}

/**
 * VOICE_DIRECTION GUARD — ElevenLabs.
 *
 * Text payload contains only the script + recognized bracket tags.
 * Free prose is read aloud verbatim by v3, so this builder prepends
 * the leading_tag + inserts inline_tags at documented positions.
 * Any anchor-phrase miss throws rather than silently producing bad audio.
 */
function buildElevenLabsTextPayload(adapter: ElevenLabsAdapter, paragraphId: ParagraphId): string {
  const entry = adapter.bracket_tags_per_paragraph[paragraphId];
  if (!entry) throw new Error(`No bracket-tags entry for paragraph ${paragraphId}`);
  let text = paragraphTextFor(paragraphId);
  for (const inline of entry.inline_tags) {
    // Greedy match — captures everything between the FIRST and LAST
    // single quote on the line. Handles English contractions inside
    // the phrase (e.g., "I've been waiting") which a `[^']+` group
    // would choke on.
    const m = inline.position.match(/^before\s+'(.+)'$/);
    if (!m) {
      throw new Error(`Cannot parse inline-tag position "${inline.position}" — expected "before '<phrase>'"`);
    }
    const phrase = m[1]!;
    if (!text.includes(phrase)) {
      throw new Error(`Inline-tag anchor phrase "${phrase}" not found in paragraph ${paragraphId}; adapter and script drifted`);
    }
    text = text.replace(phrase, `${inline.tag} ${phrase}`);
  }
  return `${entry.leading_tag} ${text}`;
}

async function generatePathA(
  adapter: ElevenLabsAdapter,
  voiceId: string,
  paragraphId: ParagraphId,
  key: string,
): Promise<CallResult> {
  const text = buildElevenLabsTextPayload(adapter, paragraphId);
  const started = Date.now();
  const res = await fetchWithRetry(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: adapter.model_id,
      voice_settings: adapter.voice_settings,
      output_format: 'mp3_44100_128',
    }),
  }, `eleven/${paragraphId}`);
  const latencyMs = Date.now() - started;
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    return {
      paragraph: paragraphId,
      path: 'path-a-elevenlabs',
      ok: false,
      detail: `${res.status} — ${body.slice(0, 300)}`,
      latencyMs,
    };
  }
  const bytes = await res.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const outputPath = resolve(PATH_A_DIR, `${paragraphId}.mp3`);
  writeFileSync(outputPath, buffer);
  return {
    paragraph: paragraphId,
    path: 'path-a-elevenlabs',
    ok: true,
    detail: `mp3_44100_128 (${buffer.length.toLocaleString()} bytes)`,
    outputPath,
    bytes: buffer.length,
    latencyMs,
    charsUsed: text.length,
  };
}

// ----- Path C-G: Gemini 3.1 Flash TTS Preview ---------------------------

const GEMINI_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_VOICE = 'Charon';
const GEMINI_TRANSCRIPT_MARKER = '### TRANSCRIPT';

/**
 * VOICE_DIRECTION GUARD — Gemini. Reuses preflight extract+substitute.
 */
async function generatePathCGemini(geminiAdapterPath: string, paragraphId: ParagraphId, key: string): Promise<CallResult> {
  const adapter = readFileSync(geminiAdapterPath, 'utf8');
  const template = extractPromptTemplate(adapter);
  const transcript = paragraphTextFor(paragraphId);
  const prompt = substituteTranscript(template, transcript);

  const markerCount = prompt.split(GEMINI_TRANSCRIPT_MARKER).length - 1;
  if (markerCount !== 1) {
    throw new Error(`Gemini guard: expected exactly one ${GEMINI_TRANSCRIPT_MARKER} marker, found ${markerCount}`);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  // safetySettings @ BLOCK_ONLY_HIGH (not BLOCK_NONE) — still blocks
  // genuinely harmful content but permits dramatic / shouted content
  // that the default thresholds reject as PROHIBITED_CONTENT. Needed
  // for the §3.6 scream paragraph; the all-caps "VERAAA!!!" + spy-
  // agency Director's Notes context tripped the default classifier
  // during first matrix run. BURNED is parody-spy comedy; this is a
  // creative-asset pipeline, not user-input handling.
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
  const started = Date.now();
  const res = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, `gemini/${paragraphId}`);
  const latencyMs = Date.now() - started;
  if (!res.ok) {
    const text = await res.text().catch(() => '<unreadable>');
    return {
      paragraph: paragraphId,
      path: 'path-c-gemini',
      ok: false,
      detail: `${res.status} — ${text.slice(0, 300)}`,
      latencyMs,
    };
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
  };
  const pcmBase64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!pcmBase64) {
    // Surface what Gemini actually returned so the next debug pass
    // has data, not speculation. Empty inlineData typically means
    // the model returned text-shaped output (refusal / explanation)
    // instead of audio — common on payloads it parses as non-speech.
    const shape = JSON.stringify(json).slice(0, 500);
    return {
      paragraph: paragraphId,
      path: 'path-c-gemini',
      ok: false,
      detail: `response missing inlineData.data — shape: ${shape}`,
      latencyMs,
    };
  }
  const pcm = Buffer.from(pcmBase64, 'base64');
  const wav = pcmToWav(pcm, 24000);
  const outputPath = resolve(PATH_CG_DIR, `${paragraphId}.wav`);
  writeFileSync(outputPath, wav);
  return {
    paragraph: paragraphId,
    path: 'path-c-gemini',
    ok: true,
    detail: `wav 24kHz/16-bit/mono (${wav.length.toLocaleString()} bytes)`,
    outputPath,
    bytes: wav.length,
    durationSeconds: pcm.length / 48000,
    latencyMs,
  };
}

// ----- Path C-O: OpenAI gpt-4o-mini-tts ---------------------------------

const OPENAI_MODEL = 'gpt-4o-mini-tts';
const OPENAI_VOICE = 'onyx';
const OPENAI_INSTRUCTIONS_START = '\n---INSTRUCTIONS START---\n';
const OPENAI_INSTRUCTIONS_END = '\n---INSTRUCTIONS END---\n';

function extractOpenAIInstructions(adapterMarkdown: string): string {
  const s = adapterMarkdown.indexOf(OPENAI_INSTRUCTIONS_START);
  const e = adapterMarkdown.indexOf(OPENAI_INSTRUCTIONS_END);
  if (s < 0 || e < 0 || e <= s) {
    throw new Error('OpenAI adapter fence markers not found or out of order');
  }
  return adapterMarkdown.slice(s + OPENAI_INSTRUCTIONS_START.length, e).replace(/^\n+/, '').replace(/\n+$/, '');
}

/**
 * VOICE_DIRECTION GUARD — OpenAI. `instructions` and `input` are
 * separate API parameters by design; this function passes each as a
 * distinct top-level body key, never concatenated.
 */
async function generatePathCOpenAI(openaiAdapterPath: string, paragraphId: ParagraphId, key: string): Promise<CallResult> {
  const adapter = readFileSync(openaiAdapterPath, 'utf8');
  const instructions = extractOpenAIInstructions(adapter);
  const input = paragraphTextFor(paragraphId);

  if (instructions.length >= 4096) throw new Error('OpenAI instructions exceed 4096 char limit');
  if (input.length >= 4096) throw new Error('OpenAI input exceeds 4096 char limit');

  const started = Date.now();
  const res = await fetchWithRetry('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input,
      instructions,
      voice: OPENAI_VOICE,
      response_format: 'wav',
      speed: 0.95,
    }),
  }, `openai/${paragraphId}`);
  const latencyMs = Date.now() - started;
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    return {
      paragraph: paragraphId,
      path: 'path-c-openai',
      ok: false,
      detail: `${res.status} — ${body.slice(0, 300)}`,
      latencyMs,
    };
  }
  const bytes = await res.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const outputPath = resolve(PATH_CO_DIR, `${paragraphId}.wav`);
  writeFileSync(outputPath, buffer);
  return {
    paragraph: paragraphId,
    path: 'path-c-openai',
    ok: true,
    detail: `wav (${buffer.length.toLocaleString()} bytes)`,
    outputPath,
    bytes: buffer.length,
    latencyMs,
  };
}

// ----- Char-budget tracking --------------------------------------------

type Budget = {
  month: string;
  elevenlabs_chars_used: number;
  elevenlabs_chars_cap: number;
  tripwire_50pct: boolean;
  tripwire_80pct: boolean;
};

function loadBudget(): Budget {
  if (!existsSync(BUDGET_PATH)) {
    throw new Error(`Budget file missing at ${BUDGET_PATH}. Run \`pnpm check:tts\` first.`);
  }
  return JSON.parse(readFileSync(BUDGET_PATH, 'utf8')) as Budget;
}

function saveBudget(b: Budget): void {
  writeFileSync(BUDGET_PATH, JSON.stringify(b, null, 2));
}

// ----- Main -----------------------------------------------------------

async function main(): Promise<void> {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!elevenKey || !openaiKey || !geminiKey) {
    throw new Error('Missing API key(s). Run `pnpm check:tts` first to confirm all three engines are ready.');
  }

  mkdirSync(PATH_A_DIR, { recursive: true });
  mkdirSync(PATH_CG_DIR, { recursive: true });
  mkdirSync(PATH_CO_DIR, { recursive: true });

  const adapter = JSON.parse(readFileSync(ELEVENLABS_ADAPTER, 'utf8')) as ElevenLabsAdapter;
  const budget = loadBudget();

  console.log('[matrix] enumerating ElevenLabs Voice Library for Path A pick...');
  const pick = await pickElevenLabsVoice(adapter, elevenKey);
  console.log(`[matrix] Path A voice → "${pick.name}" (${pick.id}) score=${pick.score}`);

  /**
   * Per-engine error isolation — one path failing on one paragraph
   * must NOT abort the rest of the matrix. The generators return
   * CallResult on API failures; this wrapper catches network-layer
   * throws (fetch failed, DNS, timeouts) and converts them to
   * failure CallResults so the loop continues.
   */
  async function runIsolated(
    path: CallResult['path'],
    paragraphId: ParagraphId,
    work: () => Promise<CallResult>,
  ): Promise<CallResult> {
    try {
      return await work();
    } catch (e) {
      return {
        paragraph: paragraphId,
        path,
        ok: false,
        detail: `threw: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  const results: CallResult[] = [];
  for (const entry of DASH_SAMPLE_SCRIPT) {
    console.log(`\n[matrix] paragraph: ${entry.id}`);
    // Path A
    console.log('  Path A (ElevenLabs)...');
    const a = await runIsolated('path-a-elevenlabs', entry.id, () =>
      generatePathA(adapter, pick.id, entry.id, elevenKey),
    );
    results.push(a);
    console.log(`    ${a.ok ? 'OK' : 'FAIL'} ${a.detail} (${a.latencyMs ?? '?'}ms)`);
    if (a.ok && a.charsUsed) {
      budget.elevenlabs_chars_used += a.charsUsed;
      if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.5) budget.tripwire_50pct = true;
      if (budget.elevenlabs_chars_used >= budget.elevenlabs_chars_cap * 0.8) budget.tripwire_80pct = true;
    }
    // Path C-Gemini
    console.log('  Path C-Gemini...');
    const cg = await runIsolated('path-c-gemini', entry.id, () =>
      generatePathCGemini(GEMINI_ADAPTER, entry.id, geminiKey),
    );
    results.push(cg);
    console.log(`    ${cg.ok ? 'OK' : 'FAIL'} ${cg.detail} (${cg.latencyMs ?? '?'}ms)`);
    // Path C-OpenAI
    console.log('  Path C-OpenAI...');
    const co = await runIsolated('path-c-openai', entry.id, () =>
      generatePathCOpenAI(OPENAI_ADAPTER, entry.id, openaiKey),
    );
    results.push(co);
    console.log(`    ${co.ok ? 'OK' : 'FAIL'} ${co.detail} (${co.latencyMs ?? '?'}ms)`);
  }

  saveBudget(budget);

  // Classify failures: documented engine limitations vs. true bugs.
  // Documented limitations are CALLED OUT prominently but do NOT fail
  // the orchestrator — per cadence-spec §3.6 ("Engines that scream by
  // raising pitch instead of raising amplitude fail this row — flag
  // in results.md"). Failing a row is valid Step 5 winner-selection
  // data, not a script error.
  const failures = results.filter((r) => !r.ok);
  type DocumentedLimitation = { result: CallResult; reason: string };
  const documentedLimitations: DocumentedLimitation[] = failures
    .filter((r) => r.path === 'path-c-gemini' && r.detail.includes('PROHIBITED_CONTENT'))
    .map((r) => ({
      result: r,
      reason: "Gemini prompt-level safety filter (`promptFeedback.blockReason: PROHIBITED_CONTENT`) blocks this prompt combination. Confirmed not overridable via `safetySettings` BLOCK_ONLY_HIGH (those gate output-side filtering, not prompt-input filtering). Known Gemini engine constraint, not a script bug. Per cadence-spec §3.6 acceptance criterion: this is valid Step 5 winner-selection data — engines that cannot deliver the scream row fail that row.",
    }));
  const trueFailures = failures.filter((r) => !documentedLimitations.find((d) => d.result === r));

  // Write results.md
  const lines: string[] = [
    '# Engine Matrix Results',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Orchestrator: \`scripts/generate-tts-eval.ts\``,
    '',
    `**Summary:** ${results.length - failures.length} / ${results.length} cells produced audio. ${documentedLimitations.length} documented engine limitation(s). ${trueFailures.length} unexplained failure(s).`,
    '',
    '## Path A — ElevenLabs voice pick',
    '',
    `- **Picked:** ${pick.name} (\`${pick.id}\`) — score ${pick.score}`,
    '- **Top 5 ranking:**',
    ...pick.ranking.map((r, i) => `  ${i + 1}. ${r.name} (\`${r.id}\`) — score ${r.score}`),
    '',
    '## Per-call results',
    '',
    '| Paragraph | Path | OK | Detail | Latency | Bytes | Duration | Chars |',
    '|---|---|---|---|---|---|---|---|',
    ...results.map((r) => {
      const dur = r.durationSeconds ? `${r.durationSeconds.toFixed(2)}s` : '—';
      const ok = r.ok ? 'OK' : 'FAIL';
      return `| ${r.paragraph} | ${r.path} | ${ok} | ${r.detail.slice(0, 80)} | ${r.latencyMs ?? '—'}ms | ${r.bytes?.toLocaleString() ?? '—'} | ${dur} | ${r.charsUsed?.toLocaleString() ?? '—'} |`;
    }),
    '',
  ];

  if (documentedLimitations.length > 0) {
    lines.push(
      '## Documented engine limitations',
      '',
      'Per-cell failures that reflect known engine constraints rather than orchestrator bugs. These are VALID Step 5 winner-selection data — an engine that fails a row simply cannot serve that row.',
      '',
    );
    for (const d of documentedLimitations) {
      lines.push(`### ${d.result.path} / ${d.result.paragraph}`);
      lines.push('');
      lines.push(d.reason);
      lines.push('');
      lines.push('Raw response shape (truncated):');
      lines.push('```');
      lines.push(d.result.detail);
      lines.push('```');
      lines.push('');
    }
  }

  if (trueFailures.length > 0) {
    lines.push(
      '## Unexplained failures (require investigation)',
      '',
      'Per-cell failures that do NOT match a documented engine limitation. These warrant triage before the listener panel.',
      '',
    );
    for (const f of trueFailures) {
      lines.push(`- **${f.path} / ${f.paragraph}**: ${f.detail}`);
    }
    lines.push('');
  }

  lines.push(
    '## Char-budget delta',
    '',
    `- ElevenLabs chars used: **${budget.elevenlabs_chars_used.toLocaleString()} / ${budget.elevenlabs_chars_cap.toLocaleString()}** (${((budget.elevenlabs_chars_used / budget.elevenlabs_chars_cap) * 100).toFixed(2)}%)`,
    `- 50% tripwire: ${budget.tripwire_50pct ? 'TRIPPED' : 'clear'}`,
    `- 80% tripwire (halt): ${budget.tripwire_80pct ? 'TRIPPED' : 'clear'}`,
    '',
    '## File map',
    '',
    '```',
    'matrix/',
    '├── path-a-elevenlabs/     ← mp3 files (44.1kHz / 128kbps)',
    '├── path-c-gemini/         ← wav files (24kHz / 16-bit / mono)',
    '├── path-c-openai/         ← wav files (OpenAI native)',
    '└── results.md             ← this file',
    '```',
    '',
    '## Next step',
    '',
    'Briggsy auditions the produced clips against cadence-spec §5',
    'three-band rubric (Floor / Target Band / Ceiling). Step 4 MUSHRA',
    'listener panel rates each engine path; Step 5 selects the winning',
    'engine, accounting for any documented limitations above (an',
    'engine that fails a row cannot serve that row in the final mix).',
    '',
  );
  writeFileSync(RESULTS_PATH, lines.join('\n'));

  console.log(`\n[matrix] complete — ${results.length - failures.length}/${results.length} ok`);
  if (documentedLimitations.length > 0) {
    console.log(`[matrix] ${documentedLimitations.length} documented engine limitation(s):`);
    for (const d of documentedLimitations) console.log(`  - ${d.result.path}/${d.result.paragraph}`);
  }
  if (trueFailures.length > 0) {
    console.error(`[matrix] ${trueFailures.length} unexplained failure(s):`);
    for (const f of trueFailures) console.error(`  - ${f.path}/${f.paragraph}: ${f.detail}`);
  }
  console.log(`[matrix] results: ${RESULTS_PATH}`);
  // Exit 0 when the orchestrator did its job (matrix wrote results.md
  // and at least one cell produced audio). Exit 1 only on systemic
  // failure (all cells failed → likely auth/network/script issue).
  process.exit(results.some((r) => r.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error('[matrix] FAIL');
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
