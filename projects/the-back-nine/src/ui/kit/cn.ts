/**
 * src/ui/kit/cn.ts: shadcn's `cn` (clsx, then tailwind-merge), told about the role tokens in `theme.css`.
 *
 * tailwind-merge only knows Tailwind's default scale names. Left alone it reads `text-page-title` as a text COLOUR
 * (an unknown `text-*` word), so `cn('text-page-title', 'text-plum')` would silently drop the size; and it would never
 * merge `rounded-control` against `rounded-card`. Each role scale `theme.css` declares is named here so a later class
 * replaces an earlier one of the same kind and never one of another kind. A token added to `theme.css`'s type, radius,
 * shadow, spacing, ease or weight scales is added here too (`src/ui/kit/__tests__/cn.test.ts` reads theme.css and
 * fails on a missing name).
 */
import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/** The role scales in `theme.css`'s `@theme` block, by tailwind-merge's theme key. */
export const KIT_THEME_SCALES = {
  text: [
    'page-title',
    'step-title',
    'chart-title',
    'metric',
    'metric-words',
    'ring',
    'ring-compact',
    'intro',
    'nav',
    'subnav',
    'body',
    'label',
    'axis',
  ],
  'font-weight': ['light', 'regular', 'medium', 'semibold'],
  tracking: ['nav'],
  radius: ['bar', 'control', 'tooltip', 'card'],
  shadow: ['tooltip', 'menu', 'drawer'],
  spacing: ['panel', 'gap'],
  ease: ['settle', 'drawer'],
} as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...KIT_THEME_SCALES.text],
      'font-weight': [...KIT_THEME_SCALES['font-weight']],
      tracking: [...KIT_THEME_SCALES.tracking],
      radius: [...KIT_THEME_SCALES.radius],
      shadow: [...KIT_THEME_SCALES.shadow],
      spacing: [...KIT_THEME_SCALES.spacing],
      ease: [...KIT_THEME_SCALES.ease],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
