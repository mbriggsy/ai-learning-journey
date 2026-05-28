import { Config } from '@remotion/cli/config'
import path from 'node:path'

// Point at BURNED's public/ so staticFile() reads real game assets (card art,
// fonts) directly. Same pin as the v1 trailer (ADR #15).
Config.setPublicDir('../../public')

// === Import wiring (carried-forward tool, proven by the 2026-05-28 spike) ===
// Resolve BURNED's `@shared` / `@client` path aliases inside the Remotion
// bundle so v2 can borrow the real game's INERT building blocks across the
// package wall — card art, the card treatment CSS, the design-token legend,
// pure data (card-defs) and pure presentational helpers (card-icons,
// card-accents). The live ANIMATED components stay home (they carry the game's
// motion engine + live store, which don't run under Remotion's frame model).
// Resolve against cwd (the package dir when Remotion runs its scripts) — same
// basis as setPublicDir('../../public'). NOT import.meta.dirname: Remotion
// loads this config as CJS, where import.meta is empty.
const burnedSrc = path.resolve(process.cwd(), '../../src')

Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(current.resolve?.alias ?? {}),
      '@shared': path.resolve(burnedSrc, 'shared'),
      '@client': path.resolve(burnedSrc, 'client'),
    },
  },
}))
