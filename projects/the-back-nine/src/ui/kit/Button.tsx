/**
 * src/ui/kit/Button.tsx: the kit's button (plan 3.1; ref 2.0 "Buttons"), copied from shadcn's Base UI `button` and
 * restyled to the role tokens, with the critique's contrast fixes (plan 2.2): primary is a solid `--blue-ink` fill
 * (5.89:1 with white), secondary is white with a blue-ink edge and words, destructive is `--coral-ink` (5.04:1), and the
 * neutral button (Cancel) is outlined, never white on grey. `quiet` is the text-only action (the tray's Reset). A
 * button that opens a menu carries the `>` chevron after its words (`opensMenu`).
 *
 * Every word is the caller's (plan 2.1 decision 10): the label is `children`.
 */
import type { ReactNode } from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { ChevronRight } from 'lucide-react'
import { cn } from './cn'

export const BUTTON_VARIANTS = ['primary', 'secondary', 'destructive', 'neutral', 'quiet'] as const
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'border-blue-ink bg-blue-ink text-bg hover:bg-[color-mix(in_oklab,var(--color-blue-ink)_86%,var(--color-stone-900))]',
  secondary: 'border-blue-ink bg-bg text-blue-ink hover:bg-blue-tint',
  destructive:
    'border-coral-ink bg-coral-ink text-bg hover:bg-[color-mix(in_oklab,var(--color-coral-ink)_86%,var(--color-stone-900))]',
  neutral: 'border-stone-300 bg-bg text-stone-900 hover:bg-stone-100',
  quiet: 'border-transparent bg-transparent px-2 text-stone-900 underline-offset-4 hover:underline',
}

const SIZE = {
  md: 'h-10 px-5 text-body',
  sm: 'h-8 px-3 text-label',
} as const

/** The classes alone, for a Base UI part that renders its own element (a Menu trigger, a Dialog close). */
export function buttonClasses(variant: ButtonVariant = 'primary', size: keyof typeof SIZE = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border whitespace-nowrap select-none',
    'font-regular transition-[scale,background-color,border-color] duration-150 ease-settle active:scale-97',
    'motion-reduce:transition-none motion-reduce:active:scale-100',
    'disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50',
    '[&_svg]:shrink-0',
    VARIANT[variant],
    SIZE[size],
    className,
  )
}

export interface ButtonProps extends Omit<ButtonPrimitive.Props, 'className' | 'children'> {
  readonly variant?: ButtonVariant
  readonly size?: keyof typeof SIZE
  /** Draws the `>` chevron after the words: this button opens a menu (ref 2.0, "Add Account >"). */
  readonly opensMenu?: boolean
  /** An icon placed before the words (lucide at 1.5 px; never alone, ref 3.8). */
  readonly icon?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', opensMenu = false, icon, className, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive data-variant={variant} className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
      {opensMenu ? <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" /> : null}
    </ButtonPrimitive>
  )
}
