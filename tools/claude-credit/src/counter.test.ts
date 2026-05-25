import { describe, expect, it } from 'vitest';
import { countTestDefinitions } from './counter.js';

describe('countTestDefinitions (0.5c — static, execution-free)', () => {
  it('counts JS/TS it()/test() variants and skips a commented-out decoy', () => {
    const src = [
      "import { it, test, describe } from 'vitest';",
      "describe('group', () => {",
      "  it('does a thing', () => { expect(1).toBe(1); });",
      "  test('another thing', () => {});",
      "  it.each([1, 2])('table %s', () => {});", // counted once (the call, not rows)
      "  test.skip('skipped but defined', () => {});",
      "  // it('this one is commented out', () => {});", // NOT counted
      '  /* test(\"block comment\") */', // NOT counted
      "  const unitPrice = compute(); // not a test",
      '});',
    ].join('\n');
    // it + test + it.each + test.skip = 4
    expect(countTestDefinitions(src, false)).toBe(4);
  });

  it('counts pytest def test_ definitions and skips # comments', () => {
    const src = [
      'import pytest',
      'def test_alpha():',
      '    assert True',
      'def test_beta(fixture):',
      '    assert fixture',
      '# def test_commented():', // NOT counted
      'def helper():', // not a test
      '    return 1',
    ].join('\n');
    expect(countTestDefinitions(src, true)).toBe(2);
  });

  it('returns 0 for source with no test definitions', () => {
    expect(countTestDefinitions('export const x = 1;\n', false)).toBe(0);
  });
});
