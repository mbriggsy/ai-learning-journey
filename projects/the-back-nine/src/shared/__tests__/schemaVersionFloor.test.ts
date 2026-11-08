/**
 * THE VERSION FLOOR — the schema-v4 plan's KTD1 (`docs/plans/features/schema-v4-old-copy-refusal-build-spec.md`),
 * raised to 5 by build 2's U10 (`docs/plans/features/working-year-surplus-build-spec.md`, KTD6).
 *
 * A ONE-WAY DOOR, guarded from OUTSIDE the commit it guards. Once a real save carries a version, a build
 * whose ladder top is lower meets that save with "This plan was saved by a newer version of the app" —
 * and there is no newer version to update to. The vault and every backup cut after it stay intact but
 * unreachable until a forward fix.
 *
 * WHY ITS OWN COMMIT. Every other version pin derives from `CURRENT_SCHEMA_VERSION` (KTD5), so a revert of
 * the bump's commit takes the constant AND those pins back together and stays green; the codec suite's
 * absolute pin for that version goes with the revert too, because it lives in the same commit. A
 * `git revert` of a bump cannot take this file with it, because no bump's commit touches it: the floor
 * was set to 4 in the commit after the schema-v4 bump, and raised to 5 in the commit after build 2's
 * go-live (`a9cacf22`, which wrote 5). Each later bump raises this floor in its own follow-up commit, the
 * same way.
 *
 * The rule (never revert a bump once a real save carries it; never lower the constant; roll forward) is
 * stated once, in `docs/architecture.md` §7.3.
 */
import { describe, expect, it } from 'vitest'

import * as model from '../model'

/** The highest version a real save may already carry. Raise it, in its own commit, after each bump. */
const FLOOR = 5

/** Read through the module namespace, never a named import: a `git revert` of the bump that introduced the
 *  constant DELETES it, and a named import would then fail typecheck (TS2305) and red here on a matcher
 *  TypeError — never on the message below, which is the whole point of this guard. */
const current: unknown = (model as Record<string, unknown>).CURRENT_SCHEMA_VERSION

describe('the schema version floor (a one-way door once a real save exists)', () => {
  it('CURRENT_SCHEMA_VERSION never falls below the floor — lowering it, or reverting the bump that raised it, strands every real save made at the higher version', () => {
    expect(
      typeof current === 'number' && current >= FLOOR,
      `CURRENT_SCHEMA_VERSION is ${String(current)}, below the floor of ${FLOOR}. A real save may already carry ` +
        `version ${FLOOR}, and this build would show it as "saved by a newer version" with no newer version to ` +
        'update to. Never revert a schema bump or lower the constant once a real save exists — roll forward ' +
        '(docs/architecture.md §7.3).',
    ).toBe(true)
  })
})
