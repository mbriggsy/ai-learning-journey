/**
 * Phase 0 Unit 0.4 Step 1 — tone-prototype contract.
 *
 * Validates that TONE_SAMPLE_PARAGRAPH still carries every load-bearing
 * mechanic of the played-straight tone gate: Pendleton-vocab translations
 * are present, the Phrasing! beat lands on the tail, the read targets the
 * ~20-second deadpan budget, and no engine-direction language has leaked
 * into the constant payload (the VOICE_DIRECTION anti-pattern that bit UMB
 * v3 narrator work TWICE per project memory).
 *
 * If a future edit removes a translation or drops the Phrasing! tail,
 * these tests fail loudly — making the silent erosion of the gap-comedy
 * mechanic a test failure, not a quiet shipping mistake.
 */

import { describe, it, expect } from 'vitest';
import {
  TONE_SAMPLE_PARAGRAPH,
  PENDLETON_TRANSLATIONS,
} from './tone-prototype.js';

describe('TONE_SAMPLE_PARAGRAPH — Pendleton-vocab translation contract', () => {
  // Every briefing-room substitution from the translation table must
  // appear verbatim in the paragraph. Removing one collapses the
  // gap-comedy mechanic for that engineering concept.
  for (const { engineering, briefing } of PENDLETON_TRANSLATIONS) {
    it(`briefing-room term "${briefing}" (← ${engineering}) appears in paragraph`, () => {
      expect(TONE_SAMPLE_PARAGRAPH).toContain(briefing);
    });
  }

  it('exposes at least 5 distinct Pendleton translations (gap-comedy density floor)', () => {
    expect(PENDLETON_TRANSLATIONS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('TONE_SAMPLE_PARAGRAPH — Phrasing! tail discipline', () => {
  it('ends with the Phrasing! beat', () => {
    expect(TONE_SAMPLE_PARAGRAPH).toMatch(/…Phrasing\.\s*$/);
  });

  it('uses the ellipsis-prefixed form (cues §3.5 deadpan-flat landing, not punchy exclamation)', () => {
    expect(TONE_SAMPLE_PARAGRAPH).toContain('…Phrasing.');
  });
});

describe('TONE_SAMPLE_PARAGRAPH — Sterling-coded structural mannerisms', () => {
  it('opens with a declarative briefing-room lede (no question/imperative opener)', () => {
    expect(TONE_SAMPLE_PARAGRAPH).toMatch(/^The /);
  });

  it('exercises §3.5 parenthetical-tangent mannerism (em-dash aside)', () => {
    expect(TONE_SAMPLE_PARAGRAPH).toMatch(/ — [^—]+ — /);
  });
});

describe('TONE_SAMPLE_PARAGRAPH — ~20-second read budget', () => {
  // Plan §Step 1 targets ~20 seconds. Sterling-coded pace is ~5-10%
  // slower than conversational baseline (cadence-spec §3.2); using
  // ~3 words/second as the deadpan-briefer rate gives ~60 words target.
  // Tolerance ±15 words covers natural pacing variance without letting
  // the paragraph drift outside the tone-gate stimulus window.
  it('word count is within 45-75 (~20-second deadpan-briefer read)', () => {
    const words = TONE_SAMPLE_PARAGRAPH.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(45);
    expect(words).toBeLessThanOrEqual(75);
  });
});

describe('TONE_SAMPLE_PARAGRAPH — VOICE_DIRECTION anti-pattern guard', () => {
  // ElevenLabs v3 reads anything in the text payload aloud verbatim
  // that is not a recognized bracket tag. Prepending "Read this in a
  // deadpan voice..." results in the engine speaking that direction
  // aloud. Made TWICE in UMB v3 work per project memory — codified
  // here so a third occurrence is a TEST FAILURE not a quiet ship.
  //
  // Bracket tags themselves (e.g. [deadpan], [sarcastic]) are
  // assembled in generate-tone-clip.ts, NOT in this constant. The
  // constant payload must be raw prose — guard catches any drift.
  const FORBIDDEN_DIRECTIVES = [
    /read this/i,
    /\bvoice direction\b/i,
    /\bvoice_direction\b/i,
    /^(deliver|speak|narrate|read)\b/im,
    /\bin a (deep|gravelly|noir|deadpan|sardonic|dramatic) voice\b/i,
    /\b1940s noir detective\b/i, // exact wording of the UMB v3 mistake — captured in memory
    /^\[/m, // bracket-tag token at start of any line — tags belong in the renderer payload, not the constant
  ];

  for (const pattern of FORBIDDEN_DIRECTIVES) {
    it(`paragraph does not contain directive matching ${pattern}`, () => {
      expect(TONE_SAMPLE_PARAGRAPH).not.toMatch(pattern);
    });
  }
});

describe('TONE_SAMPLE_PARAGRAPH — territory boundaries (no overlap with paragraphs 1/2/3)', () => {
  // Unit 0.4 tone paragraph is a NEW stimulus — it must not borrow
  // load-bearing phrases from the Unit 0.2 sample paragraphs. If a
  // refactor accidentally concatenates them, this catches it.
  it('does not contain Unit 0.2 paragraph 1 anchor ("trusted with a card game")', () => {
    expect(TONE_SAMPLE_PARAGRAPH).not.toContain('trusted with a card game');
  });

  it('does not contain Unit 0.2 paragraph 2 anchor ("highest expense report")', () => {
    expect(TONE_SAMPLE_PARAGRAPH).not.toContain('highest expense report');
  });

  it('does not contain Unit 0.2 paragraph 3 scream content (no VERA pattern)', () => {
    expect(TONE_SAMPLE_PARAGRAPH).not.toMatch(/V[E]+R[A]+/i);
  });
});

describe('PENDLETON_TRANSLATIONS — table integrity', () => {
  it('each entry has both engineering and briefing fields populated', () => {
    for (const entry of PENDLETON_TRANSLATIONS) {
      expect(entry.engineering.length).toBeGreaterThan(0);
      expect(entry.briefing.length).toBeGreaterThan(0);
    }
  });

  it('engineering terms are unique (no duplicate mappings)', () => {
    const eng = PENDLETON_TRANSLATIONS.map((e) => e.engineering);
    expect(new Set(eng).size).toBe(eng.length);
  });

  it('briefing terms are unique (no duplicate target phrases)', () => {
    const brief = PENDLETON_TRANSLATIONS.map((e) => e.briefing);
    expect(new Set(brief).size).toBe(brief.length);
  });
});
