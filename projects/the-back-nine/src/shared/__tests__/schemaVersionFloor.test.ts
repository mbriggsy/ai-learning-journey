/**
 * THE VERSION FLOOR — the schema-v4 plan's KTD1 (`docs/plans/features/schema-v4-old-copy-refusal-build-spec.md`).
 *
 * A ONE-WAY DOOR, guarded from OUTSIDE the commit it guards. Once a real save carries a version, a build
 * whose ladder top is lower meets that save with "This plan was saved by a newer version of the app" —
 * and there is no newer version to update to. The vault and every backup cut after it stay intact but
 * unreachable until a forward fix.
 *
 * WHY ITS OWN COMMIT. Every other version pin derives from `CURRENT_SCHEMA_VERSION` (KTD5), so a revert of
 * the bump's commit takes the constant AND those pins back together and stays green; the codec suite's
 * absolute pin goes with the revert too, because it lives in the same commit. A `git revert` cannot take
 * this file with it: it landed in the commit AFTER the bump. Each later bump raises this floor in its
 * own follow-up commit, the same way.
 *
 * The rule (never revert a bump once a real save carries it; never lower the constant; roll forward) is
 * stated once, in `docs/architecture.md` §7.3.
 */
import { describe, expect, it } from 'vitest'

import { CURRENT_SCHEMA_VERSION } from '../model'

/** The highest version a real save may already carry. Raise it, in its own commit, after each bump. */
const FLOOR = 4

describe('the schema version floor (a one-way door once a real save exists)', () => {
  it('CURRENT_SCHEMA_VERSION never falls below the floor — lowering it, or reverting the bump that raised it, strands every real save made at the higher version', () => {
    expect(
      CURRENT_SCHEMA_VERSION,
      `CURRENT_SCHEMA_VERSION is ${CURRENT_SCHEMA_VERSION}, below the floor of ${FLOOR}. A real save may already carry ` +
        `version ${FLOOR}, and this build would show it as "saved by a newer version" with no newer version to ` +
        'update to. Never revert a schema bump or lower the constant once a real save exists — roll forward ' +
        '(docs/architecture.md §7.3).',
    ).toBeGreaterThanOrEqual(FLOOR)
  })
})
