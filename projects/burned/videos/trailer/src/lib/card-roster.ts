/**
 * Phase 3 Unit 3.2 — card-art curation.
 *
 * 17 BURNED card-art webps at `public/assets/cards/` assigned to
 * trailer roles. No file copies, no symlinks — Phase 4 reads through
 * Phase 0 ADR #8 `setPublicDir('../../public')` via
 * `staticFile('assets/cards/<filename>')`.
 *
 * **Cold-open speaker locked to Janet** per `PHASE-0-EXIT.md`
 * Section 2 (R14 Cold-Open Line Disposition — Voice ID
 * `2qQJWjw5XdG80GreshqG`, Eleanor matriarch-tuned). Vera/Sable were
 * alternate-speaker candidates during deepening; Phase 0 close
 * narrowed to Janet. They retain S03 roster + cascade-halo roles
 * but NOT the cold-open flash role (insight #057 — spike-wins on
 * Phase-0-locked values).
 *
 * **S01 cold-open card flash trio (frames 30-210):**
 *   - Janet (cold-open speaker, frames 30-90)
 *   - Dash (the briefer, frames 90-150)
 *   - Neal (default 3rd per plan Step 3 — distinct visual DNA from
 *     Janet's silver hair + Dash's mid-tone hair; Phase 4 may
 *     override at composite review)
 *
 * **S03 roster reveal:** 6 operatives slide in from right edge:
 * Dash, Vera, Sable, Janet, Neal, Agent X (RedactBar overlay applied
 * by Phase 4 per vendored `RedactBar.tsx`). Otto's exclusion is the
 * joke ("One on the research budget. Don't ask.") — Phase 4 composes
 * a 7th slot with classification chrome using `portrait-otto.png`
 * + vendored `ClassificationBanner.tsx`. Dolores Grieves appears only
 * on the Intercepted card-art (no separate slide).
 *
 * **Cascade halo (S04 frames 1560-1572):** Same 6 operatives, right-
 * edge column at x=1560-1880, 40% opacity ceiling, 2-frame stagger.
 * Geometry locked in `cascade-halo-column.json` per Phase 1 Unit 1.5
 * lock (NOT a 360° ring — that's the AI-slop anti-pattern the lock
 * explicitly guards against).
 *
 * **Action cards** (11) have `roles: []` — they don't appear in any
 * fixed trailer surface. Phase 4 may sample them for the offscreen
 * variety pool (one-frame cold-open flashes) per
 * `cascade-halo-column.json#offscreenVarietyPool`. `burned.webp` +
 * `burn-the-files.webp` carry `tier: 'hero'` so Phase 4 can elevate
 * them when their narrative weight matters (the game-namesake card +
 * the mechanic-namesake card respectively).
 *
 * **Drift gates** in `card-roster.test.ts`: roster↔disk bidirectional
 * + roster↔cascade-halo-column.json bidirectional (insight #027
 * presence-companion, #063 sync-pair-declarations corrective).
 */

/** Trailer surfaces a card-art may appear in. */
export type TrailerRole = 'cold-open' | 's03-roster' | 'cascade-halo';

/** Asset-tier per Phase 3 Critical Constraints §Asset Tier Taxonomy. */
export type CardTier = 'hero' | 'texture' | 'chrome';

export interface CardRosterEntry {
  /** webp filename relative to `public/assets/cards/`. Verified to exist on disk by `card-roster.test.ts`. */
  readonly filename: string;
  /** Display name for chrome labels in S03 roster reveal. */
  readonly displayName: string;
  /** Card category — narrowed per BURNED domain. */
  readonly type: 'operative' | 'action';
  /** Fixed trailer-surface assignments (may be empty for action cards used only in offscreen variety pool). */
  readonly roles: ReadonlyArray<TrailerRole>;
  /** Visual weight — Phase 4 uses for relative emphasis when both fixed and ad-hoc compositions are options. */
  readonly tier: CardTier;
}

export const CARD_ROSTER: readonly CardRosterEntry[] = [
  // ─── Operatives (6 — in card deck; Otto roster-only excluded; Dolores depicted on Intercepted card only) ───
  {
    filename: 'dash-barlowe.webp',
    displayName: 'Dash Barlowe',
    type: 'operative',
    roles: ['cold-open', 's03-roster', 'cascade-halo'],
    tier: 'hero',
  },
  {
    filename: 'vera-khan.webp',
    displayName: 'Vera Khan',
    type: 'operative',
    // No cold-open — Phase 0 EXIT locked speaker to Janet (insight #057).
    roles: ['s03-roster', 'cascade-halo'],
    tier: 'hero',
  },
  {
    filename: 'sable-ashworth.webp',
    displayName: 'Sable Ashworth',
    type: 'operative',
    // No cold-open — Phase 0 EXIT locked speaker to Janet.
    roles: ['s03-roster', 'cascade-halo'],
    tier: 'hero',
  },
  {
    filename: 'janet-broadside.webp',
    displayName: 'Janet Broadside',
    type: 'operative',
    roles: ['cold-open', 's03-roster', 'cascade-halo'],
    tier: 'hero',
  },
  {
    filename: 'neal-proctor.webp',
    displayName: 'Neal Proctor',
    type: 'operative',
    roles: ['cold-open', 's03-roster', 'cascade-halo'],
    tier: 'hero',
  },
  {
    filename: 'agent-x.webp',
    displayName: 'Agent X',
    type: 'operative',
    // No cold-open — wild card / rival agency framing belongs to S03 with RedactBar overlay.
    roles: ['s03-roster', 'cascade-halo'],
    tier: 'hero',
  },

  // ─── Action cards (11) — no fixed surfaces; Phase 4 samples from offscreenVarietyPool if needed ───
  { filename: 'back-channel.webp',    displayName: 'Back Channel',    type: 'action', roles: [], tier: 'texture' },
  // Mechanic-namesake card; Phase 4 may elevate when used.
  { filename: 'burn-the-files.webp',  displayName: 'Burn the Files',  type: 'action', roles: [], tier: 'hero'    },
  // Game-namesake card; Phase 4 may elevate at S05 scream / payoff inset.
  { filename: 'burned.webp',          displayName: 'Burned',          type: 'action', roles: [], tier: 'hero'    },
  { filename: 'call-in-a-favor.webp', displayName: 'Call In A Favor', type: 'action', roles: [], tier: 'texture' },
  { filename: 'direct-order.webp',    displayName: 'Direct Order',    type: 'action', roles: [], tier: 'texture' },
  { filename: 'extraction.webp',      displayName: 'Extraction',      type: 'action', roles: [], tier: 'texture' },
  { filename: 'falsify-intel.webp',   displayName: 'Falsify Intel',   type: 'action', roles: [], tier: 'texture' },
  { filename: 'go-dark.webp',         displayName: 'Go Dark',         type: 'action', roles: [], tier: 'texture' },
  { filename: 'intel-briefing.webp',  displayName: 'Intel Briefing',  type: 'action', roles: [], tier: 'texture' },
  // Dolores Grieves depicted here per project-burned-dolores-grieves memory.
  { filename: 'intercepted.webp',     displayName: 'Intercepted',     type: 'action', roles: [], tier: 'texture' },
  { filename: 'reassign.webp',        displayName: 'Reassign',        type: 'action', roles: [], tier: 'texture' },
];

// Runtime length invariant is enforced by `card-roster.test.ts` (compile-
// time `length extends 17` assertion was attempted but `as const` widens
// the empty `roles: []` tuples and breaks `.includes()` type-narrowing
// on the filter helpers below — runtime test is the cleaner gate).

/** S01 cold-open card-flash trio (Janet + Dash + Neal). Order is
 * CARD_ROSTER iteration order — for the S01 scene's display order
 * (Janet first as the cold-open speaker), use
 * `COLD_OPEN_CARDS_DISPLAY_ORDER` instead. */
export const COLD_OPEN_CARDS = CARD_ROSTER.filter((c) => c.roles.includes('cold-open'));

/**
 * S01 cold-open card-flash trio in DISPLAY ORDER per Phase 1 Unit 1.10
 * lock — Janet (speaker, frames 30-90), Dash (briefer, 90-150), Neal
 * (third operative, 150-180). Filename lookups guarantee the right
 * cards even if CARD_ROSTER iteration order ever changes.
 */
const _byFilename = (name: string): CardRosterEntry => {
  const found = CARD_ROSTER.find((c) => c.filename === name);
  if (!found) throw new Error(`card-roster: ${name} missing from CARD_ROSTER`);
  return found;
};
export const COLD_OPEN_CARDS_DISPLAY_ORDER = [
  _byFilename('janet-broadside.webp'), // frames 30-90 — cold-open speaker
  _byFilename('dash-barlowe.webp'),    // frames 90-150 — briefer
  _byFilename('neal-proctor.webp'),    // frames 150-180 — third operative
] as const;

/** S03 roster slide-in (6 operatives). */
export const S03_ROSTER = CARD_ROSTER.filter((c) => c.roles.includes('s03-roster'));

/** S04 cascade halo right-edge column (6 operatives; geometry in `cascade-halo-column.json`). */
export const CASCADE_HALO = CARD_ROSTER.filter((c) => c.roles.includes('cascade-halo'));
