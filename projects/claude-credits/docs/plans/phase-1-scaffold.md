---
created: 2026-05-24T09:46:48-04:00
deepened:
doc-reviewed:
---

# Phase 1 — Scaffold `projects/claude-credits/`

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

```
projects/claude-credits/
├── public/
│   ├── data/
│   │   └── stats.json               # committed snapshot, refreshed by Action
│   └── assets/
│       └── <projectName>/           # hero images copied by refresh script
│           └── hero.png
├── scripts/
│   ├── refresh-stats.ts             # runs claude-credit, strips projectPath, writes JSON
│   └── copy-editorial-assets.ts     # walks editorial.heroImage / gallery, copies to public/assets
├── src/
│   ├── main.tsx                     # Vite entry
│   ├── App.tsx                      # router (react-router-dom v7)
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── About.tsx
│   ├── components/
│   │   ├── HeroCounter.tsx          # ONE big lifetime total with tick-up. No droplets behind it.
│   │   ├── HeroSupportingLine.tsx   # "across N projects · M files · K commits"
│   │   ├── TaxonomyHint.tsx         # small inline hint near hero (links to About)
│   │   ├── ProjectTile.tsx          # editorial-driven tile (one-liner + hook + visual + live link)
│   │   ├── StatusMarker.tsx         # shelved / meta badge
│   │   ├── TierBar.tsx              # mini horizontal bar chart per project
│   │   ├── AuthoredByBlock.tsx      # "AUTHORED BY · Claude N lines + N tokens · Briggsy M lines" on detail page
│   │   ├── TokensBlock.tsx          # "TOKENS CONSUMED · 147M · by model breakdown" on detail page (Phase 0.5b)
│   │   ├── AssetDonut.tsx           # asset-by-kind donut (the DrawSVG flourish)
│   │   ├── CadenceSparkline.tsx     # commitsByDay timeline
│   │   ├── StatCallout.tsx          # cold display-type stat callout
│   │   ├── BottomCTA.tsx            # dual CTA (tool install + GitHub)
│   │   └── Timestamp.tsx            # "Last updated · 2h ago"
│   ├── hooks/
│   │   ├── useStats.ts              # loads stats.json via context
│   │   ├── useCountUp.ts            # GSAP-driven number tween
│   │   └── useRevealOnScroll.ts     # ScrollTrigger reveal
│   ├── motion/
│   │   ├── easings.ts               # named eases — `settle`, `weighted`, `snap`. NEVER linear.
│   │   ├── tokens.ts                # duration/ease tokens
│   │   └── gsap-context.ts          # registers ScrollTrigger, DrawSVG (only for AssetDonut)
│   ├── styles/
│   │   ├── tokens.css               # color, type, spacing, radii vars
│   │   ├── reset.css
│   │   └── global.css
│   └── types.ts                     # re-exports from tools/claude-credit
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json                      # use undercover-mob-boss/vercel.json as starting template
└── README.md
```

**Dependencies:**
- `react@^19`, `react-dom@^19`, `react-router-dom@^7`
- `gsap@3.14.2` (matches BURNED/UMB)
- `clsx`
- Dev: `vite@^7`, `@vitejs/plugin-react`, `typescript@^5.7`, `@types/react`, `@types/node`, `tsx`

**Vite config:** standard React preset, base `/`, build output `dist/`.

**tsconfig:** copy from BURNED's `tsconfig.json` with paths adjusted.

---

← [Phase 0 — Data gaps](phase-0-data-gaps.md) | [Index](README.md) | Next → [Phase 2 — Data wiring](phase-2-data-wiring.md)
