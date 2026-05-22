---
title: `as const satisfies` narrows empty arrays in object literals to `readonly []` — breaks downstream `.includes()` / `.indexOf()` calls
date: 2026-05-22
phase: trailer-phase-3
modules: [videos/trailer/src/lib/card-roster.ts]
tags: [typescript, as-const, satisfies, type-inference, readonly-arrays, project-conventions]
---

## Problem

Phase 3 Unit 3.2 ships `CARD_ROSTER`, an array of 17 entries each
carrying a `roles: readonly TrailerRole[]` field. Some entries have
populated roles (operatives — `['cold-open', 's03-roster',
'cascade-halo']`); some have empty roles (action cards — `[]`).

Per the project convention from CLAUDE.md type architecture section
("Types derived from data (`as const satisfies` + `typeof`), never
parallel enums"), I reached for:

```ts
export interface CardRosterEntry {
  readonly filename: string;
  readonly roles: ReadonlyArray<TrailerRole>;
  // ...
}

export const CARD_ROSTER = [
  { filename: 'dash-barlowe.webp', roles: ['cold-open', 's03-roster', 'cascade-halo'], /* ... */ },
  // ... 6 more populated ...
  { filename: 'back-channel.webp', roles: [], /* ... */ },
  // ... 10 more with roles: [] ...
] as const satisfies readonly CardRosterEntry[];
```

Goal: compile-time length-tuple preservation (so a `length extends 17`
type assertion would catch accidental add/remove), AND interface
conformance via `satisfies`.

Typecheck failed with three errors at the filter helpers below:

```
src/lib/card-roster.ts:141:75 - error TS2345: Argument of type '"cold-open"'
  is not assignable to parameter of type 'never'.
```

The error pointed at this line:

```ts
export const COLD_OPEN_CARDS = CARD_ROSTER.filter(
  (c) => c.roles.includes('cold-open'),
);
```

`'cold-open'` is a valid `TrailerRole`. Why is it `never`?

## Root Cause

`as const` narrows EVERY array literal in the value to its narrowest
tuple type:

- `roles: ['cold-open', 's03-roster', 'cascade-halo']` becomes
  `readonly ['cold-open', 's03-roster', 'cascade-halo']` — useful.
- `roles: []` becomes **`readonly []`** — the empty tuple type.

TypeScript's `.includes` signature on `readonly []` is
`(searchElement: never): boolean`. The empty tuple has no element
type to search for. So passing any actual `TrailerRole` value to
`.includes` is a type error.

The filter callback gets a union type for `c.roles` across all 17
entries:
- `readonly ['cold-open', 's03-roster', 'cascade-halo']` |
- `readonly ['s03-roster', 'cascade-halo']` |
- `readonly []` (×11)
- ... etc.

The union's `.includes` parameter is the **intersection** of each
constituent's parameter type. `'cold-open' | 's03-roster' |
'cascade-halo' | ... | never = never`. Hence the error.

`satisfies` doesn't help — it checks the literal type conforms to
the interface but PRESERVES the literal type at the declaration site.
The interface widens to `readonly TrailerRole[]` for assignment, but
the literal type at the call site is still the narrow tuple union.

## Fix

Two options, both work; pick based on whether you need the
length-tuple preservation:

**Option A — drop `as const`, use plain interface annotation
(simpler, what I shipped):**

```ts
export const CARD_ROSTER: readonly CardRosterEntry[] = [
  // ... 17 entries with roles: [...] or roles: [] ...
];
```

Cost: lose the compile-time length-tuple. Move length assertion to
runtime (Vitest `expect(CARD_ROSTER.length).toBe(17)`).

**Option B — keep `as const satisfies`, annotate empty arrays
explicitly:**

```ts
export const CARD_ROSTER = [
  { filename: 'dash-barlowe.webp', roles: ['cold-open', 's03-roster', 'cascade-halo'] as const, /* ... */ },
  { filename: 'back-channel.webp', roles: [] as readonly TrailerRole[], /* ... */ },
  // ...
] as const satisfies readonly CardRosterEntry[];
```

Cost: one annotation per empty-array entry. Benefit: compile-time
length-tuple AND `.includes()` works.

For card-roster (17 entries, 11 empties), Option A was cleaner.
For a smaller value with one or two empty arrays, Option B keeps
more type information.

## Key Insight

**`as const` on an object literal narrows EVERY array inside it,
including empty arrays — `[]` becomes `readonly []`, NOT the parent
interface's `readonly Foo[]`.** When downstream code calls array
methods that take a `Foo` argument on this collection, TypeScript
computes the union's method-parameter type and lands on `never`
because the empty tuple contributes no element type.

The project convention ("`as const satisfies T`") works cleanly for:
- Object literals with uniformly-populated arrays
- Discriminated unions where every variant has the same shape
- Tuples whose length you want preserved at the type level

It fails when:
- The value has optional/variable-arity arrays (some populated, some
  empty)
- Downstream code uses `.includes()` / `.indexOf()` / `.find()` —
  any method whose parameter type comes from the array's element
  type

**Catch shape during execution:** if you reach for `as const satisfies`
on a value with optional empty arrays, and TS complains about
`never` at the use site, you have two fixes (Options A and B above).
Don't fight the compiler — pick based on whether you need the
length-tuple.

**Project convention amendment:** CLAUDE.md type architecture says
"Types derived from data (`as const satisfies` + `typeof`), never
parallel enums." That holds. But the convention should carry the
caveat: **if your value has optional empty arrays AND you need array
methods at the use site, either annotate the empty arrays or drop
the `as const`.** The compile-time length-tuple is a "nice to have";
runtime length assertion in a Vitest test does the same job without
the type-system gymnastics.

## Also Applies To

- Any `readonly Entry[]` value where `Entry` carries an
  `Array | ReadonlyArray` field that some entries leave empty.
- Discriminated unions where one variant intentionally has an empty
  collection (e.g., `{ kind: 'leaf', children: [] }` in a tree
  schema).
- Codegen output that emits objects with conditional collections —
  the emit pipeline may produce empties that look fine at runtime
  but defeat consumer-side type narrowing.
- Phase 1's `BURNED_TRAILER_LINES`-style declarations if a Line ever
  gained an optional empty-array field.
- Any time you copy CLAUDE.md's "`as const satisfies` + `typeof`"
  pattern and it bites — check whether your value has optional
  empty collections before assuming the pattern is universal.
- Distinct from insights #057 (plan-vs-spike drift), #061 (plan
  enumeration decay), #063 (sync-pair declarations), #064 (gate
  over-constraint) — this is a TYPE-SYSTEM trap with the project's
  own preferred pattern, not a plan/execution drift.
