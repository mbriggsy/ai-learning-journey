import { describe, it, expect } from 'vitest';
import type { ReadonlyDeep } from '../../src/types/utility';

// These are compile-time type tests. If this file typechecks, the tests pass.
// The runtime assertions verify the type system actually enforces what we expect.

describe('ReadonlyDeep', () => {
  it('primitives pass through unchanged', () => {
    const n: ReadonlyDeep<number> = 42;
    const s: ReadonlyDeep<string> = 'hello';
    const b: ReadonlyDeep<boolean> = true;
    expect(n).toBe(42);
    expect(s).toBe('hello');
    expect(b).toBe(true);
  });

  it('object properties become readonly recursively', () => {
    type Original = { a: { b: number } };
    type Deep = ReadonlyDeep<Original>;

    // This compiles — proving the type works
    const obj: Deep = { a: { b: 1 } };
    expect(obj.a.b).toBe(1);

    // @ts-expect-error — readonly property
    obj.a = { b: 2 };
  });

  it('arrays become ReadonlyArray recursively', () => {
    type Original = { items: { name: string }[] };
    type Deep = ReadonlyDeep<Original>;

    const obj: Deep = { items: [{ name: 'a' }] };
    expect(obj.items[0]?.name).toBe('a');

    // @ts-expect-error — readonly array
    obj.items.push({ name: 'b' });
  });

  it('functions preserve their call signature (insight 007 fix)', () => {
    type WithMethod = {
      name: string;
      greet: (greeting: string) => string;
    };
    type Deep = ReadonlyDeep<WithMethod>;

    const obj: Deep = {
      name: 'test',
      greet: (g: string) => `${g} world`,
    };

    // The function must be callable — this is the insight 007 fix
    const result = obj.greet('hello');
    expect(result).toBe('hello world');
  });

  it('nested objects with methods retain callable methods', () => {
    type GameMap = {
      width: number;
      isBlocking: (x: number, y: number) => boolean;
      nested: {
        compute: (a: number) => number;
      };
    };
    type Deep = ReadonlyDeep<GameMap>;

    const map: Deep = {
      width: 10,
      isBlocking: (x, y) => x === 0 && y === 0,
      nested: {
        compute: (a) => a * 2,
      },
    };

    expect(map.isBlocking(0, 0)).toBe(true);
    expect(map.isBlocking(1, 1)).toBe(false);
    expect(map.nested.compute(5)).toBe(10);
  });

  it('Maps become ReadonlyMap', () => {
    type Original = { data: Map<string, number> };
    type Deep = ReadonlyDeep<Original>;

    const m = new Map([['a', 1]]);
    const obj: Deep = { data: m };
    expect(obj.data.get('a')).toBe(1);

    // @ts-expect-error — ReadonlyMap has no set
    obj.data.set('b', 2);
  });

  it('Sets become ReadonlySet', () => {
    type Original = { tags: Set<string> };
    type Deep = ReadonlyDeep<Original>;

    const s = new Set(['x']);
    const obj: Deep = { tags: s };
    expect(obj.tags.has('x')).toBe(true);

    // @ts-expect-error — ReadonlySet has no add
    obj.tags.add('y');
  });
});
