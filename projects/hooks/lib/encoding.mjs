// encoding.mjs: what is in a file's bytes, encoding-wise. A small pure
// library: the settings writer (tools/settings-write.mjs) refuses a damaged
// file with it, and U9's liveness check will report one with it.
//
//   scanEncoding(buf) -> {bom, invalidUtf8: [{offset}], nonAscii: [{line,
//                         col, codePoint}], mojibake: [{line, col, text,
//                         repaired, codePoint}], counts}
//   findMojibake(str) -> [{index, text, repaired, codePoint}]
//   isAscii(str), cp1252Encodable(str)
//
// Why mojibake gets an exact test: on 2026-10-16 a Windows tool read
// settings.json as Windows-1252 and wrote it back as UTF-8, so each em dash
// (UTF-8 E2 80 94) came back as the three characters U+00E2 U+20AC U+201D.
// That damage has a precise shape, so it is matched exactly, never guessed:
// a run is mojibake only when mapping its characters back through the cp1252
// table gives bytes that decode as ONE valid UTF-8 character at or above
// U+0080. "naïve" and a real em dash are never reported; "â€”" always is.
//
// Lines and columns are 1-based. A column counts code points from the start
// of its line (a BOM is not counted: it is reported as `bom` instead).
// Each list holds at most `limit` entries (default 50, the first ones in the
// file); `counts` has the full totals, so a long list is never mistaken for a
// short one.

// The 32 characters cp1252 puts at bytes 0x80..0x9F. Windows decoders pass
// the five bytes cp1252 leaves undefined (0x81 0x8D 0x8F 0x90 0x9D) through as
// U+0081 and so on, so those map to themselves: a mojibake run made by such a
// decoder holds them.
const CP1252_HIGH = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f,
  0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

// Code point -> cp1252 byte, for every byte from 0x80 up. 0xA0..0xFF are the
// same code points in cp1252 as in Latin-1.
const CP1252_BYTE = new Map();
CP1252_HIGH.forEach((cp, i) => CP1252_BYTE.set(cp, 0x80 + i));
for (let b = 0xa0; b <= 0xff; b++) CP1252_BYTE.set(b, b);

const fatal = () => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// True when every character is 7-bit ASCII.
export function isAscii(str) {
  return /^[\x00-\x7f]*$/.test(str);
}

// True when a cp1252 writer could store `str` without loss: ASCII, the 32
// cp1252 characters above, and U+00A0..U+00FF. Anything else (U+2190 "←", an
// emoji) is what such a writer turns into '?'. The five pass-through code
// points count as encodable, as a Windows encoder treats them.
export function cp1252Encodable(str) {
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x80 && !CP1252_BYTE.has(cp)) return false;
  }
  return true;
}

// The mojibake run starting at cps[i], or null. `cps` is an array of code
// points (-1 marks an undecodable byte, which breaks any run). The first
// character's cp1252 byte is a UTF-8 lead byte (U+00C2..U+00F4 are bytes
// C2..F4), which says how many continuation bytes follow; each following
// character must map back to one cp1252 byte in 0x80..0xBF. The bytes must
// then decode, strictly, to exactly one code point >= U+0080, so an overlong
// form, a surrogate or a lead byte with the wrong continuation never counts.
function runAt(cps, i) {
  const lead = cps[i];
  if (lead < 0xc2 || lead > 0xf4) return null;
  const n = lead <= 0xdf ? 1 : lead <= 0xef ? 2 : 3;
  if (i + n >= cps.length) return null;
  const bytes = [lead];
  for (let j = 1; j <= n; j++) {
    // > 0xBF is a guard too: the strict decode below rejects such a byte.
    const b = CP1252_BYTE.get(cps[i + j]);
    if (b === undefined || b > 0xbf) return null;
    bytes.push(b);
  }
  let repaired;
  try {
    repaired = fatal().decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
  // A guard, not a filter: a strict decode of a lead byte C2..F4 with the
  // continuation count it names can only give one code point >= U+0080.
  const cp = repaired.codePointAt(0);
  if ([...repaired].length !== 1 || cp < 0x80) return null;
  return { length: n + 1, text: String.fromCodePoint(...cps.slice(i, i + n + 1)), repaired, codePoint: cp };
}

// Every mojibake run in a string: {index (in code points), text, repaired,
// codePoint}. Runs never overlap: the scan resumes after each one.
export function findMojibake(str) {
  const cps = Array.from(str, (ch) => ch.codePointAt(0));
  const out = [];
  for (let i = 0; i < cps.length; i++) {
    const r = runAt(cps, i);
    if (!r) continue;
    out.push({ index: i, text: r.text, repaired: r.repaired, codePoint: r.codePoint });
    i += r.length - 1;
  }
  return out;
}

// Decode one UTF-8 sequence at buf[i]: [codePoint, byteLength], or null when
// the bytes there are not valid UTF-8 (the WHATWG rules the fatal decoder
// uses: no overlong forms, no surrogates, nothing above U+10FFFF).
function decodeAt(buf, i) {
  const b0 = buf[i];
  if (b0 < 0x80) return [b0, 1];
  let n;
  let lo = 0x80;
  let hi = 0xbf;
  if (b0 >= 0xc2 && b0 <= 0xdf) n = 1;
  else if (b0 >= 0xe0 && b0 <= 0xef) {
    n = 2;
    if (b0 === 0xe0) lo = 0xa0;
    if (b0 === 0xed) hi = 0x9f;
  } else if (b0 >= 0xf0 && b0 <= 0xf4) {
    n = 3;
    if (b0 === 0xf0) lo = 0x90;
    if (b0 === 0xf4) hi = 0x8f;
  } else return null;
  // A sequence cut off by the end of the file reads undefined below.
  let cp = b0 & (0x3f >> n);
  for (let j = 1; j <= n; j++) {
    const b = buf[i + j];
    const min = j === 1 ? lo : 0x80;
    const max = j === 1 ? hi : 0xbf;
    if (b === undefined || b < min || b > max) return null;
    cp = (cp << 6) | (b & 0x3f);
  }
  return [cp, n + 1];
}

// The encoding report for a file's bytes (a Buffer or Uint8Array).
export function scanEncoding(input, { limit = 50 } = {}) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  // The fatal decoder is the verdict on validity; the walk below finds where.
  let valid = true;
  try {
    fatal().decode(buf);
  } catch {
    valid = false;
  }
  const invalidUtf8 = [];
  const nonAscii = [];
  const mojibake = [];
  const counts = { invalidUtf8: 0, nonAscii: 0, mojibake: 0 };
  // One entry per decoded unit, for the mojibake pass: the code point (-1 for
  // a byte that isn't valid UTF-8) and where it sits.
  const cps = [];
  const at = [];
  let line = 1;
  let col = 1;
  for (let i = bom ? 3 : 0; i < buf.length;) {
    const d = decodeAt(buf, i);
    if (!d) {
      counts.invalidUtf8++;
      if (invalidUtf8.length < limit) invalidUtf8.push({ offset: i });
      cps.push(-1);
      at.push([line, col]);
      col++;
      i++;
      continue;
    }
    const [cp, len] = d;
    cps.push(cp);
    at.push([line, col]);
    if (cp >= 0x80) {
      counts.nonAscii++;
      if (nonAscii.length < limit) nonAscii.push({ line, col, codePoint: cp });
    }
    if (cp === 0x0a) {
      line++;
      col = 1;
    } else col++;
    i += len;
  }
  // Both checks must agree; if they ever don't, the file is reported as
  // invalid rather than passed.
  if (!valid && counts.invalidUtf8 === 0) {
    counts.invalidUtf8 = 1;
    invalidUtf8.push({ offset: -1 });
  }
  for (let i = 0; i < cps.length; i++) {
    const r = runAt(cps, i);
    if (!r) continue;
    counts.mojibake++;
    if (mojibake.length < limit) mojibake.push({ line: at[i][0], col: at[i][1], text: r.text, repaired: r.repaired, codePoint: r.codePoint });
    i += r.length - 1;
  }
  return { bom, invalidUtf8, nonAscii, mojibake, counts };
}
