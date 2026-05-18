/**
 * Phase 0 Unit 0.2 Step 1 — sample-script-dash lineage contract.
 *
 * The trailer narration is recast from existing BURNED howtoplay copy
 * (paragraphs 1 + 2 only — paragraph 3 is a new Vera scream with no
 * upstream source). These tests assert that the load-bearing lineage
 * anchors still appear in BOTH the sample script AND the source files —
 * so a future edit that renames a phrase in the howtoplay copy will
 * make the trailer narration's lineage claim falsifiable here.
 *
 * Test also verifies the per-engine VOICE_DIRECTION anti-pattern guard
 * (no style-direction strings prepended to the script payloads — Gemini
 * reads everything aloud verbatim; this mistake has been made TWICE in
 * prior UMB v3 narrator work per the project's memory).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PARAGRAPH_1_DEADPAN,
  PARAGRAPH_1_PREFLIGHT,
  PARAGRAPH_2_MONOLOGUE,
  PARAGRAPH_3_SCREAM,
  DASH_SAMPLE_SCRIPT,
} from './sample-script-dash.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BURNED_ROOT = resolve(SCRIPT_DIR, '../../..');
const ACT_MISSION = readFileSync(resolve(BURNED_ROOT, 'src/client/howtoplay/acts/ActMission.tsx'), 'utf8');
const ACT_ROSTER = readFileSync(resolve(BURNED_ROOT, 'src/client/howtoplay/acts/ActRoster.tsx'), 'utf8');

describe('Paragraph 1 (deadpan exposition) lineage → ActMission.tsx', () => {
  // Lineage anchors — distinctive phrases that must survive in BOTH the
  // sample script and the source file. Future rename in howtoplay copy
  // will make this test fail loudly, exposing trailer/game-copy drift.
  const ANCHORS = [
    'trusted with a card game', // ActMission lede
    'make me look foolish', // ActMission lede
    'ends your career', // ActMission Beat II
    "your colleagues don't", // ActMission Beat II
  ];

  for (const phrase of ANCHORS) {
    it(`anchor "${phrase}" appears in sample script`, () => {
      expect(PARAGRAPH_1_DEADPAN).toContain(phrase);
    });

    it(`anchor "${phrase}" still appears in ActMission.tsx`, () => {
      expect(ACT_MISSION).toContain(phrase);
    });
  }
});

describe('Paragraph 2 (monologue + Phrasing!) lineage → ActRoster.tsx Dash entry', () => {
  const ANCHORS = [
    "Pendleton's top-rated field operative",
    'highest expense report',
    'Fluent in seven languages',
    'martini orders',
    'been waiting', // ActRoster source uses "He's been waiting"; trailer recast is "I've been waiting" — the verb phrase survives the pronoun swap and is the load-bearing setup for the Phrasing! beat.
    '…Phrasing',
  ];

  for (const phrase of ANCHORS) {
    it(`anchor "${phrase}" appears in sample script`, () => {
      expect(PARAGRAPH_2_MONOLOGUE).toContain(phrase);
    });

    it(`anchor "${phrase}" still appears in ActRoster.tsx`, () => {
      expect(ACT_ROSTER).toContain(phrase);
    });
  }
});

describe('Paragraph 3 (scream) — no source lineage, structural assertions only', () => {
  it('is a Vera reference', () => {
    expect(PARAGRAPH_3_SCREAM).toMatch(/VERA/i);
  });

  it('is all-caps shouted (no lowercase letters)', () => {
    expect(PARAGRAPH_3_SCREAM).toMatch(/^[^a-z]+$/);
  });

  it('contains repeated A for elongated vowel', () => {
    expect(PARAGRAPH_3_SCREAM).toMatch(/A{2,}/);
  });

  it('uses exclamation punctuation', () => {
    expect(PARAGRAPH_3_SCREAM).toContain('!');
  });
});

describe('PARAGRAPH_1_PREFLIGHT — Step 0.5 trim contract', () => {
  // Trim must be a subset of PARAGRAPH_1_DEADPAN — every sentence in the
  // preflight read also appears verbatim in the full paragraph. If
  // PARAGRAPH_1_DEADPAN is edited and a kept sentence is renamed, the
  // preflight read silently drifts off-source. Catch here.
  const PRESERVED_SENTENCES = [
    'Good morning.',
    'You are reading this because somebody with my clearance level — fine, me — decided you could be trusted with a card game.',
    'Try not to make me look foolish.',
  ];

  for (const sentence of PRESERVED_SENTENCES) {
    it(`sentence "${sentence.slice(0, 40)}..." appears in preflight trim`, () => {
      expect(PARAGRAPH_1_PREFLIGHT).toContain(sentence);
    });

    it(`sentence "${sentence.slice(0, 40)}..." still appears in full paragraph 1`, () => {
      expect(PARAGRAPH_1_DEADPAN).toContain(sentence);
    });
  }

  it('exercises §3.5 parenthetical-tangent mannerism ("— fine, me —")', () => {
    expect(PARAGRAPH_1_PREFLIGHT).toMatch(/— fine, me —/);
  });

  it('exercises §3.4 downspeak punchline (terminal "foolish.")', () => {
    expect(PARAGRAPH_1_PREFLIGHT).toMatch(/foolish\.\s*$/);
  });

  it('excludes paragraph 2 territory (no Phrasing beat)', () => {
    expect(PARAGRAPH_1_PREFLIGHT).not.toMatch(/Phrasing/i);
  });

  it('excludes paragraph 3 territory (no scream content)', () => {
    expect(PARAGRAPH_1_PREFLIGHT).not.toMatch(/VERA/i);
  });

  it('word count targets ~15s Sterling-coded read (~32 words ±5)', () => {
    const words = PARAGRAPH_1_PREFLIGHT.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(27);
    expect(words).toBeLessThanOrEqual(37);
  });
});

describe('VOICE_DIRECTION anti-pattern guard (CRITICAL — per memory feedback-narrator-voice-direction)', () => {
  // Gemini TTS reads everything in the text payload aloud verbatim.
  // Prepending "Read this in a deadpan voice..." results in the engine
  // speaking that direction aloud before the actual line. This mistake
  // has been made TWICE in prior UMB v3 narrator work — codified as a
  // contract test here to make a third occurrence a TEST FAILURE,
  // not a quiet shipping mistake.
  //
  // The shape of the anti-pattern is a script body that *describes* the
  // delivery instead of *being* the delivery. Catch by asserting absence
  // of common direction-language tokens.
  const FORBIDDEN_DIRECTIVES = [
    /read this/i,
    /\bvoice direction\b/i,
    /\bvoice_direction\b/i,
    /^(deliver|speak|narrate|read)\b/im,
    /\bin a (deep|gravelly|noir|deadpan|sardonic|dramatic) voice\b/i,
    /\b1940s noir detective\b/i, // exact wording of the UMB v3 mistake — captured in memory
  ];

  // Guard sweeps the three engine-matrix paragraphs AND the Step 0.5
  // preflight trim — both flow into Gemini's text payload at different
  // call sites, so both must clear the directive-language guard.
  const TEXTS_TO_GUARD: Array<{ id: string; text: string }> = [
    ...DASH_SAMPLE_SCRIPT.map((e) => ({ id: e.id, text: e.text })),
    { id: 'paragraph-1-preflight', text: PARAGRAPH_1_PREFLIGHT },
  ];

  for (const entry of TEXTS_TO_GUARD) {
    for (const pattern of FORBIDDEN_DIRECTIVES) {
      it(`text "${entry.id}" does not contain directive matching ${pattern}`, () => {
        expect(entry.text).not.toMatch(pattern);
      });
    }
  }
});

describe('DASH_SAMPLE_SCRIPT structural shape', () => {
  it('contains exactly 3 entries', () => {
    expect(DASH_SAMPLE_SCRIPT).toHaveLength(3);
  });

  it('entries are ordered: deadpan → monologue → scream', () => {
    expect(DASH_SAMPLE_SCRIPT[0].id).toBe('deadpan-exposition');
    expect(DASH_SAMPLE_SCRIPT[1].id).toBe('monologue-exasperation');
    expect(DASH_SAMPLE_SCRIPT[2].id).toBe('scream');
  });

  it('target_seconds match plan ladder (20/10/1.5)', () => {
    expect(DASH_SAMPLE_SCRIPT[0].target_seconds).toBe(20);
    expect(DASH_SAMPLE_SCRIPT[1].target_seconds).toBe(10);
    expect(DASH_SAMPLE_SCRIPT[2].target_seconds).toBe(1.5);
  });

  it('each paragraph has non-empty text', () => {
    for (const entry of DASH_SAMPLE_SCRIPT) {
      expect(entry.text.length).toBeGreaterThan(0);
    }
  });
});
