/**
 * THE NAME CEILING: the most characters a person's name may have when it is typed (UTF-16 code units, as maxLength counts).
 *
 * Briggsy's design-ceiling ruling, 2026-11-21 (the register's composites entry, "RULED by Briggsy
 * 2026-11-21"; the frames-outside plan's KTD12, `docs/plans/features/frames-outside-widest-member-build-spec.md`).
 * His words: "$83 billion a month is nuts, let's name a ceiling - we don't need to solve for extremes
 * like that." The one-frame promise is made for names up to this many characters, and the name field
 * stops accepting input here, through the input's own length limit: no error, no new copy. The number is
 * the pilot's proposal under that ruling, put to him the same day. A name is not a figure the math needs,
 * so the cap costs the household nothing.
 *
 * It limits TYPING only. A stored name that is already longer (a restored vault) renders and saves
 * whole: the restore codec never reads this constant, and nothing rewrites stored data to fit it.
 *
 * Its one home is here, in the shared layer, because the shipping name field reads it (the
 * `incomeBounds.ts` precedent). `src/ui/devSeeds.ts` re-exports it for the seeds and the fit gate; a
 * shipping module never imports that DEV-only file.
 */
export const NAME_CEILING = 20
