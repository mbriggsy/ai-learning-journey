// block-webfetch.sh through the harness: the first live hook replayed from a
// fixture. It runs the source copy in this folder; the deployed copy under
// ~/.claude/hooks must stay byte-identical to it (README, "Deployment").
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertBlocks, fixture, outcome, runHook } from './harness.mjs';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'block-webfetch.sh');
const run = (input) => outcome('PreToolUse', runHook(['bash', HOOK], input), { onFailure: 'block' });

describe('block-webfetch.sh', () => {
  test('blocks a WebFetch and names both ways around it', () => {
    const o = run(fixture('PreToolUse', 'webfetch'));
    assertBlocks(o, { reason: /^WebFetch is blocked/ });
    assert.match(o.reason, /mcp__gemini-grounding__search_with_grounding/);
    assert.match(o.reason, /curl -sL --max-time 15 'https:\/\/example\.com\/docs'/);
    assert.equal(o.failure, false, 'the block came from a failure, not from the hook');
  });

  test('it speaks the deprecated top-level form, which maps to deny (Q2 checks the mapping live)', () => {
    const o = run(fixture('PreToolUse', 'webfetch'));
    assert.equal(o.deprecated, true);
    assert.equal(o.decision, 'deny');
  });

  test('a URL with a quote, a backslash and an apostrophe still yields one valid JSON block', () => {
    const url = `https://example.com/a"b\\c'd`;
    const o = run(fixture('PreToolUse', 'webfetch', { tool_input: { url } }));
    assert.equal(o.stdoutKind, 'json');
    assertBlocks(o);
    assert.ok(o.reason.includes(`'https://example.com/a"b\\c'\\''d'`), `the curl suggestion is not shell-quoted: ${o.reason}`);
  });

  test('unparseable stdin still blocks (the static payload)', () => {
    const o = run('not json');
    assertBlocks(o, { reason: /^WebFetch is blocked/ });
  });
});
