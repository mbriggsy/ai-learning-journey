# Dreamland Season 8 Reference Frames

Curated reference stills from **Archer Season 8 "Dreamland" (2017)** for BURNED
palette extraction. These are the source material for the
`--dreamland-*` color tokens defined in
`docs/plans/css-foundation-rebuild/phase-1-foundation.md`.

## Why these frames

Dreamland is Archer's 1947 noir-inflected season, explicitly called out by
Neal Holman as "the prettiest season." Its palette is not true noir black —
it's a warm, restricted palette of **deep teals, burnt oranges/ambers, cream
highlights, mahogany woods, slate-blues, and magenta neon accents**, which
maps cleanly onto the Archer-tone visual identity the BURNED spec mandates.

The 18 frames below were chosen to span Dreamland's full lighting vocabulary:

| # | Scene target                  | File                             | Delivers                               |
|---|-------------------------------|----------------------------------|----------------------------------------|
| 1 | Title card                    | `dreamland-01-title.webp`        | Magenta neon + deep night sky + palm silhouettes |
| 2 | Interior (warm cream)         | `dreamland-02-interior-bar.webp` | Cream/tan walls, olive green tie, warm tungsten |
| 3 | Night exterior (rain/funeral) | `dreamland-03-night-neon.webp`   | Charcoal clouds, muted sage greens, cool slate  |
| 4 | Character close-up (warm)     | `dreamland-04-lana-closeup.webp` | Lavender/rose stage wash, cream skin, crimson   |
| 5 | Wide establishing (cool stage)| `dreamland-05-wide-stage.webp`   | Cobalt/lavender stage shell, magenta floor      |
| 6 | Warm accent lighting          | `dreamland-06-ray-trumpet.webp`  | Cream suit + brass trumpet on magenta/cyan wash |
| 7 | Noir signature lighting       | `dreamland-07-venetian-blinds.webp` | Mahogany wood, sage coat, amber side-light  |
| 8 | Dramatic close-up (warm)      | `dreamland-08-charlotte.webp`    | Plum coat, cream fur, burnt sienna office wall  |
| 9 | Sunset exterior wide          | `dreamland-09-sunset-finale.webp`| Rose/gold sunset gradient, silhouette, cool fore|
|10 | Cool night exterior (chase)   | `dreamland-10-dutch-chase.webp`  | Teal-grey night, cream headlights, cold sodium  |
|11 | Interior (cream/sepia)        | `dreamland-11-poovey-jail.webp`  | Honey wood door, cream wall, olive vest, stone  |
|12 | Noir signature (SIGNATURE)    | `dreamland-12-mother-window.webp`| Amber through blinds, mahogany, sage coat, teal |
|13 | Interior wide (warm)          | `dreamland-13-mother-drink.webp` | Mahogany bookcase, cream books, burgundy whiskey|
|14 | Sepia/desaturated (B&W)       | `dreamland-14-dutch-dylan.webp`  | Near-monochrome evidence board, mahogany frame  |
|15 | Rain/crowd wide               | `dreamland-15-ngd-03.webp`       | Slate-grey rain palette, black trench coats     |
|16 | Stage cool-wash close         | `dreamland-16-ngd-20.webp`       | Cobalt/lavender stage, cream suits, brass drums |
|17 | Spotlight isolation           | `dreamland-17-ngd-30.webp`       | Near-black stage, single cyan pool on white gown|
|18 | Teal/amber dock (SIGNATURE)   | `dreamland-18-ngd-45.webp`       | Teal night sky + amber crates — pure duotone    |

## Frames 7, 12, and 18 are the palette-core frames

If any three frames have to carry the palette extraction, it's these:

- **`dreamland-12-mother-window.webp`** — the quintessential "Dreamland look."
  Amber/honey sunlight pours through horizontal venetian blinds onto deep
  mahogany paneling. Foreground character in sage-grey coat. Dark teal cast
  in the blind-shadow areas. Every hallmark of the Holman-quote season in one
  frame. Extract: `--dreamland-honey` (backlight), `--dreamland-mahogany`
  (wood), `--dreamland-sage` (coat), `--dreamland-teal-shadow` (foreground).
- **`dreamland-07-venetian-blinds.webp`** — the same framing with tighter
  crop, lower key, more visible amber-line shadow pattern across face. Good
  for cross-checking the honey/sage/mahogany triad.
- **`dreamland-18-ngd-45.webp`** — wide-angle teal-and-amber dockyard at
  night. This is Dreamland's teal at its most saturated (cool sky + distant
  fog) next to its amber at its most saturated (tungsten crate-lights).
  Extract the max-chroma endpoints of the two primary hues here.

## Sources & attribution

All frames sourced from the **Archer Wiki (Fandom)** — fan-maintained
community wiki under Fandom Terms of Use. Each image was originally uploaded
by wiki editors from episode screenshots and lives at
`static.wikia.nocookie.net/archer/images/...`.

| File                             | Source wiki page                           | Original file                 | Identifiable episode |
|----------------------------------|--------------------------------------------|-------------------------------|----------------------|
| `dreamland-01-title.webp`        | `Category:Screenshots_from_Episode_8.01 "Archer Dreamland: No Good Deed"` | `Archer_s8e1_Title.jpg`  | S8E01 |
| `dreamland-02-interior-bar.webp` | same category                              | `Krieger_barman.jpg`          | S8E01 |
| `dreamland-03-night-neon.webp`   | same category                              | `No_Good_Deed-1.jpg`          | S8E01 (opening funeral) |
| `dreamland-04-lana-closeup.webp` | same category                              | `Lana_sings.jpg`              | S8E01 |
| `dreamland-05-wide-stage.webp`   | same category                              | `Dreamland_Houseband.jpg`     | S8E01 |
| `dreamland-06-ray-trumpet.webp`  | same category                              | `Ray_Trumpet.jpg`             | S8E01 |
| `dreamland-07-venetian-blinds.webp` | same category                           | `Mother_blinds.jpg`           | S8E01 |
| `dreamland-08-charlotte.webp`    | same category                              | `Charlotte_vandertunt_3.jpg`  | S8E02 "Berenice" (character debut) |
| `dreamland-09-sunset-finale.webp`| `Auflosung` episode page                   | `Archer_0808_sunset.jpg`      | S8E08 "Auflosung" (finale) |
| `dreamland-10-dutch-chase.webp`  | `Season_8` page                            | `S08E07-Dutch_chases_car.jpg` | S8E07 |
| `dreamland-11-poovey-jail.webp`  | `Poovey_(Dreamland)` character page        | `Poovey@jail.png`             | unknown Dreamland episode |
| `dreamland-12-mother-window.webp`| `Mother_(Dreamland)` character page        | `Mother@window.png`           | unknown Dreamland episode |
| `dreamland-13-mother-drink.webp` | `Mother_(Dreamland)` character page        | `Motherw:drink.png`           | unknown Dreamland episode |
| `dreamland-14-dutch-dylan.webp`  | Category page (S8E01)                      | `Dutch_dylan.jpg`             | S8E01 (evidence montage) |
| `dreamland-15-ngd-03.webp`       | Category page (S8E01)                      | `No_Good_Deed-3.jpg`          | S8E01 |
| `dreamland-16-ngd-20.webp`       | Category page (S8E01)                      | `No_Good_Deed-20.jpg`         | S8E01 |
| `dreamland-17-ngd-30.webp`       | Category page (S8E01)                      | `No_Good_Deed-30.jpg`         | S8E01 |
| `dreamland-18-ngd-45.webp`       | Category page (S8E01)                      | `No_Good_Deed-45.jpg`         | S8E01 |

**Canonical Fandom URL pattern:**
`https://static.wikia.nocookie.net/archer/images/<hash-prefix>/<hash>/<filename>/revision/latest/scale-to-width-down/1280`

Complete source-page list (what was crawled to find these):

- `https://archer.fandom.com/wiki/No_Good_Deed`
- `https://archer.fandom.com/wiki/Category:Screenshots_from_Episode_8.01_%22Archer_Dreamland:_No_Good_Deed%22`
- `https://archer.fandom.com/wiki/Season_8`
- `https://archer.fandom.com/wiki/Berenice`
- `https://archer.fandom.com/wiki/Jane_Doe`
- `https://archer.fandom.com/wiki/Ladyfingers`
- `https://archer.fandom.com/wiki/A_Discovery`
- `https://archer.fandom.com/wiki/Gramercy,_Halberd!`
- `https://archer.fandom.com/wiki/Auflosung`
- `https://archer.fandom.com/wiki/Sterling_Archer_(Dreamland)`
- `https://archer.fandom.com/wiki/Lana_Kane_(Dreamland)`
- `https://archer.fandom.com/wiki/Mother_(Dreamland)`
- `https://archer.fandom.com/wiki/Figgis_(Dreamland)`
- `https://archer.fandom.com/wiki/Krieger_(Dreamland)`
- `https://archer.fandom.com/wiki/Poovey_(Dreamland)`

## Format note

All files have the extension `.webp` because Fandom's CDN transparently
transcodes and serves WebP regardless of the `.jpg`/`.png` URL suffix. They
open in any modern image viewer and in Claude's Read tool without special
handling. Dimensions are mostly 1280 × ~720 (scaled down from the full-res
originals via `/scale-to-width-down/1280`), which is plenty for palette
extraction.

## Fair-use / copyright posture

**These frames are screenshots of an animated television series produced
and owned by FX Productions / 20th Television Animation / FXX.** They were
not obtained from an official FX/FXX press kit; they are fan-uploaded
episode captures hosted on Archer Wiki (Fandom).

Copyright posture for this directory:

- **Allowed use:** internal palette-extraction research and art-direction
  reference for BURNED. This is a transformative use — we're sampling
  colors to build a design system, not redistributing frames.
- **Not allowed:** publishing these frames in any public-facing BURNED
  artifact, committing them to a public repo, embedding them in marketing,
  or shipping them with the game.
- **If the repo ever goes public**, this entire `dreamland-reference/images/`
  directory should be added to `.gitignore` and the frames kept only in a
  local/private working copy. The README (with URLs) is fine to publish as
  long as the actual image files are not.

No official FX/FXX press-kit images were found during this crawl —
they appear to have been taken down or placed behind press-credential walls
between 2017 and now. The Fandom wiki is the best publicly indexable source
for Dreamland stills at this date.
