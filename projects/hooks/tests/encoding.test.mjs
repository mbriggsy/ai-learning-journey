// lib/encoding.mjs: the byte-level checks the settings writer refuses a
// damaged file on, and U9's liveness will report one with. The mojibake cases
// are made the way the 2026-10-16 damage was: UTF-8 bytes decoded as
// Windows-1252 (Node's own WHATWG windows-1252 decoder is the independent
// oracle, so the test never borrows the library's table), then kept as text.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cp1252Encodable, findMojibake, isAscii, scanEncoding } from '../lib/encoding.mjs';

const win1252 = new TextDecoder('windows-1252');
// What a cp1252 round trip leaves of `s`: its UTF-8 bytes read as cp1252.
const damage = (s) => win1252.decode(Buffer.from(s, 'utf8'));
const scan = (s) => scanEncoding(Buffer.from(s, 'utf8'));

describe('mojibake: the exact cp1252 round-trip shape', () => {
  test('the live 10-16 damage, U+00E2 U+20AC U+201D, is an em dash, with its line and column', () => {
    assert.equal(damage('—'), 'â€”', 'the oracle does not reproduce the live damage');
    const r = scan('{\n  "a": "one â€” two"\n}\n');
    assert.deepEqual(r.mojibake, [{ line: 2, col: 13, text: 'â€”', repaired: '—', codePoint: 0x2014 }]);
    assert.equal(r.counts.mojibake, 1);
    // The three characters are still non-ASCII text in their own right.
    assert.equal(r.counts.nonAscii, 3);
  });

  test('the 2-byte form U+00C3 U+00A9 is an e acute', () => {
    const r = scan('cafÃ©');
    assert.deepEqual(r.mojibake, [{ line: 1, col: 4, text: 'Ã©', repaired: 'é', codePoint: 0xe9 }]);
  });

  // Each one's damaged form, made by the oracle, must be found and repaired
  // to exactly the original: 2-, 3- and 4-byte characters, and the bytes
  // cp1252 leaves undefined (0x81 0x8D 0x8F 0x90 0x9D), which a Windows
  // decoder passes through as U+0081 and so on (A acute is C3 81, Y acute is
  // C3 9D, a right double quote is E2 80 9D).
  const CHARS = ['—', '–', '…', 'é', 'ü', '©', '€', '→', '“', '”', 'Á', 'Ý', 'ő', '中', '\u{1F600}'];
  for (const ch of CHARS) {
    const cp = ch.codePointAt(0);
    test(`U+${cp.toString(16).toUpperCase().padStart(4, '0')} damaged by a cp1252 round trip is found and repaired`, () => {
      const bad = damage(ch);
      assert.notEqual(bad, ch);
      const r = scan(`before ${bad} after`);
      assert.deepEqual(r.mojibake.map((m) => [m.text, m.repaired, m.codePoint, m.col]), [[bad, ch, cp, 8]]);
      assert.deepEqual(findMojibake(`x${bad}`), [{ index: 1, text: bad, repaired: ch, codePoint: cp }]);
      // The clean character itself is never mojibake.
      assert.deepEqual(scan(`before ${ch} after`).mojibake, []);
    });
  }

  test('clean UTF-8 non-ASCII is not mojibake: a real em dash, naive with a diaeresis, cafe with an accent', () => {
    for (const s of ['a — b', 'naïve', 'café', 'À la carte', 'Straße', 'â alone', 'end Ã']) {
      assert.deepEqual(scan(s).mojibake, [], s);
      assert.deepEqual(findMojibake(s), [], s);
    }
  });

  test('a lead character with continuations that do not decode is not mojibake (overlong, surrogate, too short)', () => {
    // E0 80 80 is an overlong form, ED A0 80 a surrogate: neither is UTF-8.
    for (const s of ['à€€', 'í €', 'â€', 'ðŸ˜']) {
      assert.deepEqual(findMojibake(s), [], JSON.stringify(s));
    }
    // A lead byte whose continuation is not a cp1252 high byte at all.
    assert.deepEqual(findMojibake('Ãx'), []);
  });

  test('several runs in one string are found in order and never overlap', () => {
    const s = `${damage('—')}-${damage('é')}${damage('→')}`;
    assert.deepEqual(findMojibake(s).map((m) => [m.index, m.repaired]), [[0, '—'], [4, 'é'], [6, '→']]);
  });
});

describe('scanEncoding', () => {
  test('a BOM is reported and not counted as a character; positions start after it', () => {
    const r = scanEncoding(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a—', 'utf8')]));
    assert.equal(r.bom, true);
    assert.deepEqual(r.nonAscii, [{ line: 1, col: 2, codePoint: 0x2014 }]);
    assert.equal(scan('plain').bom, false);
  });

  test('invalid UTF-8 is reported by byte offset: a stray 0xFF, a lone continuation byte, a cut-off sequence', () => {
    const buf = Buffer.concat([Buffer.from('ab'), Buffer.from([0xff]), Buffer.from('c'), Buffer.from([0x80]), Buffer.from('d'), Buffer.from([0xe2, 0x80])]);
    const r = scanEncoding(buf);
    assert.deepEqual(r.invalidUtf8, [{ offset: 2 }, { offset: 4 }, { offset: 6 }, { offset: 7 }]);
    assert.equal(r.counts.invalidUtf8, 4);
    // An undecodable byte breaks a run: nothing is reported as mojibake.
    assert.deepEqual(r.mojibake, []);
  });

  // The WHATWG rules the fatal decoder applies, located byte by byte: each
  // byte of a sequence that breaks them is reported, never a guessed -1.
  test('overlong forms, surrogates and code points past U+10FFFF are invalid at each byte', () => {
    const cases = [
      [[0xe0, 0x80, 0x80], [0, 1, 2]], // overlong 3-byte NUL
      [[0xc0, 0x80], [0, 1]], // overlong 2-byte NUL (C0 is never a lead)
      [[0xc1, 0xbf], [0, 1]],
      [[0xed, 0xa0, 0x80], [0, 1, 2]], // a UTF-16 surrogate
      [[0xf0, 0x80, 0x80, 0x80], [0, 1, 2, 3]], // overlong 4-byte
      [[0xf4, 0x90, 0x80, 0x80], [0, 1, 2, 3]], // U+110000
      [[0xf5, 0x80, 0x80, 0x80], [0, 1, 2, 3]],
    ];
    for (const [bytes, offsets] of cases) {
      const r = scanEncoding(Buffer.from([0x61, ...bytes, 0x62]));
      assert.deepEqual(r.invalidUtf8.map((x) => x.offset), offsets.map((o) => o + 1), bytes.map((b) => b.toString(16)).join(' '));
    }
    // The edges that are valid: U+0800, U+D7FF, U+E000, U+10000, U+10FFFF.
    for (const bytes of [[0xe0, 0xa0, 0x80], [0xed, 0x9f, 0xbf], [0xee, 0x80, 0x80], [0xf0, 0x90, 0x80, 0x80], [0xf4, 0x8f, 0xbf, 0xbf]]) {
      assert.deepEqual(scanEncoding(Buffer.from(bytes)).invalidUtf8, [], bytes.map((b) => b.toString(16)).join(' '));
    }
  });

  test('the fatal decoder and the walk agree on a valid file: no invalid bytes', () => {
    assert.deepEqual(scan('valid \u{1F600} — text\n').invalidUtf8, []);
  });

  test('non-ASCII positions count code points per line, an astral character as one', () => {
    const r = scan('ab\n\u{1F600}x—\n');
    assert.deepEqual(r.nonAscii, [{ line: 2, col: 1, codePoint: 0x1f600 }, { line: 2, col: 3, codePoint: 0x2014 }]);
  });

  test('lists stop at the limit; counts keep the full totals', () => {
    const r = scanEncoding(Buffer.from('—'.repeat(30) + damage('—').repeat(5), 'utf8'), { limit: 3 });
    assert.equal(r.nonAscii.length, 3);
    assert.equal(r.counts.nonAscii, 30 + 15);
    assert.equal(r.mojibake.length, 3);
    assert.equal(r.counts.mojibake, 5);
  });

  test('a Uint8Array is read like a Buffer', () => {
    assert.equal(scanEncoding(new Uint8Array([0x61, 0xc3, 0xa9])).counts.nonAscii, 1);
  });
});

describe('isAscii and cp1252Encodable', () => {
  test('isAscii is true for 7-bit text only', () => {
    assert.equal(isAscii('plain -- text {"a": 1}\n\t'), true);
    assert.equal(isAscii(''), true);
    assert.equal(isAscii('a—b'), false);
    assert.equal(isAscii('\u0080'), false);
  });

  test('cp1252Encodable: the cp1252 repertoire and the five pass-through points yes; an arrow or an emoji no', () => {
    for (const s of ['abc', '—', '€', 'éÿ', '\u0081\u008d\u008f\u0090\u009d']) assert.equal(cp1252Encodable(s), true, JSON.stringify(s));
    for (const s of ['←', '\u{1F600}', 'ő', '\u0080']) assert.equal(cp1252Encodable(s), false, JSON.stringify(s));
  });
});
