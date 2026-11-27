/**
 * IRS Single Life Table (26 CFR 1.401(a)(9)-9(b), "Table 1 to Paragraph (b)"; Pub 590-B (2025) Appendix B Table I, "For Use
 * by Beneficiaries"): the life expectancy of one person at each age, the divisor an inherited IRA's yearly minimum reads.
 *
 * GENERATED + COMMITTED FIXTURE (clean-clone discipline). Do not hand-edit: no cell was read by hand. The golden in
 * `src/engine/constants/__tests__/singleLifeTable.test.ts` pins the full vector, typed from the diff's output, never read
 * back off this module.
 *
 * PROVENANCE (DND/012, insight 009's method; U11, 2026-11-27):
 *   - The authority: the eCFR's GPO XML for 26 CFR 1.401(a)(9)-9 (the versioner API at 2026-11-24, fetched with
 *     `curl --compressed`), parsed row by row and keyed by the printed age, never by position.
 *   - The second source, typeset separately: IRS Pub 590-B (2025), Appendix B Table I, pages 50 and 51, read with
 *     `pdftotext -raw` (never `-layout`, which splits the right-hand column onto other lines and pairs ages with the
 *     wrong values) and paired as age, value tokens.
 *   - The diff by age: 121 cells each side, 0 mismatches, 0 extra keys. The ages run 0 to 119 then "120+" with no gap,
 *     and the values never rise with age. The IRS's own anchors hold: 14.1 at 76 (-9(f)(2)(ii)(B)'s example) and 29.8
 *     at 57 (Pub 590-B's). The gap-3 law seat's separate diff (2026-11-26, its own scripts) found the same.
 *
 * SHAPE: `byAge[age]` for ages 0 to 120; the last entry is the source's "120+" row, and every older age clamps to it.
 */
import type { SingleLifeTable } from './types'

export const singleLifeTableData: SingleLifeTable = {
  lastAge: 120,
  lastAgeLabel: '120+',
  byAge: [
    84.6, 83.7, 82.8, 81.8, 80.8, 79.8, 78.8, 77.9, 76.9, 75.9,
    74.9, 73.9, 72.9, 71.9, 70.9, 69.9, 69, 68, 67, 66,
    65, 64.1, 63.1, 62.1, 61.1, 60.2, 59.2, 58.2, 57.3, 56.3,
    55.3, 54.4, 53.4, 52.5, 51.5, 50.5, 49.6, 48.6, 47.7, 46.7,
    45.7, 44.8, 43.8, 42.9, 41.9, 41, 40, 39, 38.1, 37.1,
    36.2, 35.3, 34.3, 33.4, 32.5, 31.6, 30.6, 29.8, 28.9, 28,
    27.1, 26.2, 25.4, 24.5, 23.7, 22.9, 22, 21.2, 20.4, 19.6,
    18.8, 18, 17.2, 16.4, 15.6, 14.8, 14.1, 13.3, 12.6, 11.9,
    11.2, 10.5, 9.9, 9.3, 8.7, 8.1, 7.6, 7.1, 6.6, 6.1,
    5.7, 5.3, 4.9, 4.6, 4.3, 4, 3.7, 3.4, 3.2, 3,
    2.8, 2.6, 2.5, 2.3, 2.2, 2.1, 2.1, 2.1, 2, 2,
    2, 2, 2, 1.9, 1.9, 1.8, 1.8, 1.6, 1.4, 1.1,
    1,
  ],
}
