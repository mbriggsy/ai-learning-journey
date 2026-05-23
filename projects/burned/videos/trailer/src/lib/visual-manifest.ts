/**
 * Phase 3 Unit 3.7 — visual asset manifest. Phase 4 imports this to
 * place every Phase 3-shipped visual via Remotion's
 * `staticFile(asset.staticPath)`. Hand-edited (not codegen) — entries
 * stay stable across iterations once Phase 3 closes.
 *
 * **Authority split with card-roster.ts.** Card-art (17 webps under
 * `public/assets/cards/`) lives in `card-roster.ts` as the
 * single-source-of-truth. This manifest does NOT enumerate card-art —
 * Phase 4 reads card-roster.ts directly for the cold-open / S03 /
 * cascade-halo surfaces. See `cascade-halo-column.json` for S04
 * column geometry.
 *
 * **Path A vs Path B (Phase 0 ADR #8 + Phase 3 ADR #15).** Every
 * staticPath resolves through `setPublicDir('../../public')` from the
 * trailer subpackage — both paths share BURNED's single `public/` root:
 *   - Path A: `assets/...` — pre-existing BURNED game assets the
 *     trailer borrows (mahogany backdrop, pendleton crest, etc.).
 *   - Path B: `trailer/...` — NEW trailer-only assets shipped by
 *     Phase 3 Units 3.1 / 3.3 / 3.4 / 3.5 / 3.6.
 *
 * **Bidirectional drift gate** in `visual-manifest.test.ts`: every
 * entry must exist on disk, and every file under the Path B
 * `public/trailer/` tree (excluding documented Phase 0 spike/audition
 * artifacts) must be enumerated here. Catches Phase 3 forgetting to
 * manifest a deliverable AND a manifest pointer pointing at a
 * renamed/removed asset.
 */

/** Asset category — drives Phase 4 import-grouping + scene ownership. */
export type AssetCategory =
  | 'htp'
  | 'briefing-room'
  | 'r15-chrome'
  | 'title-sequence'
  | 'audio';

/**
 * Mobile-crop role. Phase 4 composes 1920×1080 scenes; X/Twitter and
 * other distribution surfaces crop to ~1:1 (1080×1080) on mobile feed
 * previews. Critical text + focal hero must live inside the central
 * safe-square; side-band assets may be cropped without losing intent.
 */
export type SafeSquareRole = 'safe-square' | 'side-band';

/**
 * Composition priority. Hero = full visual weight in central safe-
 * square. Texture = ≤40% opacity, non-focal, fills bg or side-bands.
 * Chrome = bottom-third / edge labels / classification stamps.
 */
export type AssetTier = 'hero' | 'texture' | 'chrome';

export interface VisualAsset {
  /** Asset family — Phase 4 groups imports by category. */
  readonly category: AssetCategory;
  /**
   * Path consumable by `staticFile()`. Relative to BURNED's `public/`
   * (NOT relative to `videos/trailer/public/`, which is unreachable
   * via setPublicDir per Phase 3 ADR #15).
   */
  readonly staticPath: string;
  /**
   * REQUIRED — no default. Drives Phase 4 mobile-crop placement
   * discipline. side-band assets may land outside the central
   * 1080×1080 zone; safe-square assets must NOT be clipped by the
   * mobile preview crop.
   */
  readonly safeSquareRole: SafeSquareRole;
  /** REQUIRED — composition priority. */
  readonly tier: AssetTier;
  /** SVG viewBox or raster dims (for layout math); omitted when not load-bearing. */
  readonly width?: number;
  readonly height?: number;
  /** Cross-phase context for Phase 4 readers. */
  readonly notes?: string;
}

export const VISUAL_ASSETS: readonly VisualAsset[] = [
  // ─── HTP fullpage (Unit 3.1) ─────────────────────────────────
  {
    category: 'htp',
    staticPath: 'trailer/htp-fullpage.png',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1920,
    notes:
      'Playwright fullpage capture of production HOW-TO-PLAY at DPR=1. ' +
      'Phase 4 <Img> with translateY animation 0 → -(scrollHeight - 1080)px ' +
      'over S05 deep-scroll. Phase 6 renders --scale=2 for output crispness.',
  },

  // ─── R15 chrome stamps (Unit 3.4 — SPLIT-LAYER per stamp) ────
  // Each instance ships frame.svg + text.svg. Phase 4 wraps both in
  // a single AbsoluteFill so transform-origin: center pivots through
  // both layers as one logical stamp (Phase 1 Unit 1.4 slap geometry).
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/stamp-1-operation-pendleton-frame.svg',
    safeSquareRole: 'side-band',
    tier: 'chrome',
    width: 800,
    height: 240,
    notes: 'S01 frame 150 — rotated -8° in Phase 4 wrapper. ochre-9 ink on cream paper.',
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/stamp-1-operation-pendleton-text.svg',
    safeSquareRole: 'side-band',
    tier: 'chrome',
    width: 800,
    height: 240,
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/ticker-2-method-repeatable-frame.svg',
    safeSquareRole: 'side-band',
    tier: 'chrome',
    width: 1920,
    height: 40,
    notes: 'S04 frame 1680 — bottom-strip ticker, axis-aligned (rotation 0°). ochre-9 on charcoal-3 strip.',
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/ticker-2-method-repeatable-text.svg',
    safeSquareRole: 'side-band',
    tier: 'chrome',
    width: 1920,
    height: 40,
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/stamp-3-asset-delivered-frame.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1200,
    height: 280,
    notes:
      'S04 frame 1950 PAYOFF — load-bearing visual. Rotated -3°, burn-fire ink. ' +
      'Phase 4 wraps with scaleSlap(frame) 0.95 → 1.04 → 1.0 (16-frame heavy slap per HERO weight).',
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/stamp-3-asset-delivered-text.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1200,
    height: 280,
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/subhead-4-field-ready-frame.svg',
    safeSquareRole: 'safe-square',
    tier: 'chrome',
    width: 800,
    height: 60,
    notes: 'S06 frame 2820 closing subhead "OPERATION STATUS: FIELD-READY". Axis-aligned.',
  },
  {
    category: 'r15-chrome',
    staticPath: 'trailer/r15-chrome/subhead-4-field-ready-text.svg',
    safeSquareRole: 'safe-square',
    tier: 'chrome',
    width: 800,
    height: 60,
  },

  // ─── Briefing-room NEW (Unit 3.3 Path B SVGs) ────────────────
  {
    category: 'briefing-room',
    staticPath: 'trailer/briefing-room/venetian-blinds.svg',
    safeSquareRole: 'side-band',
    tier: 'texture',
    width: 1920,
    height: 1080,
    notes:
      'S02 sun-through-blinds shadow mask. Phase 4 animates translateX ' +
      '1.5–2px/frame (Phase 1 lock). Sun-from-right bias; back-layer ' +
      'parallax prevents repeat-gradient read.',
  },
  {
    category: 'briefing-room',
    staticPath: 'trailer/briefing-room/dossier-folder-closed.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1000,
    height: 1300,
    notes:
      'S02 pre-reveal hero. Manila + diagonal TOP SECRET stamp + Pendleton crest watermark ' +
      '+ paperclip + filing stamp. Layered on top of folder-open.svg; Phase 4 animates cover-lift.',
  },
  {
    category: 'briefing-room',
    staticPath: 'trailer/briefing-room/dossier-folder-open.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1000,
    height: 1300,
    notes:
      'S02 reveal post-state. Inner cream case-sheet, classification ribbon, ' +
      'REDACTED operative field, "ACTIVE · BURNED" status callout, brief redactions, ' +
      'PEN-22-CF footer.',
  },
  {
    category: 'briefing-room',
    staticPath: 'trailer/briefing-room/depth-plane.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 600,
    height: 160,
    notes:
      'S02 foreground depth element — Step 7 LOCK: Option A brass nameplate ' +
      '"M. PENDLETON / BUREAU CHIEF". Engraved-into-brass filter; corner phillips screws. ' +
      'Phase 4 may anchor lower-left or treat as full-nameplate hero across S02 → S06.',
  },

  // ─── Briefing-room EXISTING (Path A via ADR #8) ──────────────
  {
    category: 'briefing-room',
    staticPath: 'assets/arena/mahogany-horizontal.png',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    notes: 'S02 / S06 desk backdrop. Pre-existing Imagen-gen.',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/arena/mahogany-vertical.png',
    safeSquareRole: 'side-band',
    tier: 'texture',
    notes: 'Vertical frame / column elements. Pre-existing Imagen-gen.',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/arena/blotter.png',
    safeSquareRole: 'safe-square',
    tier: 'texture',
    notes: 'Paper-pad backdrop for desk-surface composition. Pre-existing Imagen-gen.',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/arena/stamp-classified.png',
    safeSquareRole: 'safe-square',
    tier: 'chrome',
    notes: 'Classification stamp primitive (separate from R15 SVG stamps). Pre-existing Imagen-gen.',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/arena/operative-silhouette.png',
    safeSquareRole: 'safe-square',
    tier: 'chrome',
    notes: 'Agent X REDACTED treatment fallback (vendored RedactBar.tsx is primary). Pre-existing Imagen-gen.',
  },
  {
    category: 'briefing-room',
    staticPath: 'assets/howtoplay/pendleton-crest.png',
    safeSquareRole: 'side-band',
    tier: 'chrome',
    notes: 'S02 corner watermark + S06 closing-folder dressing. Pre-existing Imagen-gen.',
  },

  // ─── Title-sequence NEW (Unit 3.6 Path B SVGs) ───────────────
  {
    category: 'title-sequence',
    staticPath: 'trailer/title-sequence/operative-card-frame.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 800,
    height: 1000,
    notes:
      'S01 cold-open card-flash chrome template (frames 30–210). Phase 4 composites ' +
      'card-roster operative portrait + Clash Display 700 name overlay. Composite proof at ' +
      'sample-eval/visual-asset-prep/operative-card-composite-proof.png verified readability ' +
      'at 1/3-canvas size.',
  },
  {
    category: 'title-sequence',
    staticPath: 'trailer/title-sequence/chevron-motif-bg.svg',
    safeSquareRole: 'side-band',
    tier: 'texture',
    width: 1920,
    height: 1080,
    notes:
      'S01 cold-open background. Diagonal chevron pattern (Bass / Ferro lineage) at 0.14 opacity, ' +
      'radial vignette pulls eye to center.',
  },
  {
    category: 'title-sequence',
    staticPath: 'trailer/title-sequence/burned-logo.svg',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    width: 1600,
    height: 400,
    notes:
      'S06 closing wordmark ONLY (frame 2780). S01 cold-open uses assets/cards/burned.webp ' +
      '(in-world card-art) per Phase 1 Unit 1.10 differential. Clash Display 700 320px, ' +
      'burn-fire ink, letter-spacing -8. viewBox 1600×400 (widened from 1200 to clear ' +
      'sans-serif fallback overflow on the D — 2026-05-22 eyeball fix).',
  },

  // ─── Title-sequence EXISTING (Path A via ADR #8) ─────────────
  {
    category: 'title-sequence',
    staticPath: 'assets/howtoplay/operations-manual-plate.png',
    safeSquareRole: 'safe-square',
    tier: 'hero',
    notes: 'S01 title-plate reveal (frame ~210). Saul-Bass-coded; pre-existing Imagen-gen.',
  },

  // ─── Card-art (Unit 3.2) ─────────────────────────────────────
  // Authoritative source: src/lib/card-roster.ts (typed, drift-gated).
  // Geometry: src/lib/cascade-halo-column.json (S04 right-edge column).
  // NOT enumerated here to preserve single-source-of-truth.

  // ─── Audio (Unit 3.5) ────────────────────────────────────────
  // safeSquareRole + tier are typed-required; audio has no visual
  // position, so side-band + texture is the conventional non-focal
  // pair (matches the music-bed's "underneath dialogue" composition role).
  {
    category: 'audio',
    staticPath: 'trailer/audio/music-bed.mp3',
    safeSquareRole: 'side-band',
    tier: 'texture',
    notes:
      '"Spy Glass" — Kevin MacLeod, incompetech.com, CC-BY 4.0. ' +
      'Phase 4 clips a 106s window from the 226.98s track. ' +
      'Attribution required on every distribution surface ' +
      '(music-license.md has verbatim text + per-surface checklist).',
  },
] as const;

// ─── Helper exports (Phase 4 ergonomics) ──────────────────────

/** S05 deep-scroll HTP hero. Exactly one. */
export const HTP_ASSET: VisualAsset = VISUAL_ASSETS.find((a) => a.category === 'htp')!;

/** 8 SVGs across 4 instances (frame + text per instance). */
export const R15_CHROME: readonly VisualAsset[] = VISUAL_ASSETS.filter(
  (a) => a.category === 'r15-chrome',
);

/** Briefing-room set-dressing — NEW SVGs + EXISTING raster assets. */
export const BRIEFING: readonly VisualAsset[] = VISUAL_ASSETS.filter(
  (a) => a.category === 'briefing-room',
);

/** Title-sequence — NEW SVGs + EXISTING operations-manual-plate. */
export const TITLE_SEQ: readonly VisualAsset[] = VISUAL_ASSETS.filter(
  (a) => a.category === 'title-sequence',
);

/** Continuous music bed. Exactly one. */
export const MUSIC_BED: VisualAsset = VISUAL_ASSETS.find((a) => a.category === 'audio')!;
