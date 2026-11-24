/**
 * src/ui/kit/Toast.tsx: the kit's toast, on Base UI's Toast (never shadcn's `sonner`, which injects a `<style>`;
 * plan 2.1 decision 1). `ToastProvider` wraps a page once and draws the stack at the bottom right (full width on the
 * phone) in a portal carrying `.rc-root`; `useToast()` returns `show({ title, description })`. A toast is a white card
 * with a 1 px edge and a soft shadow, its title semibold, its dismiss a blue-ink text button whose words the provider
 * takes (plan 2.1 decision 10). The stack is a polite live region (Base UI's viewport), so a toast is read, not only
 * seen.
 *
 * Motion: a 200 ms rise and fade in, a faster fade out; fade only under reduced motion.
 */
import type { ReactNode } from 'react'
import { Toast } from '@base-ui/react/toast'
import { cn } from './cn'

export interface ToastProviderProps {
  /** The dismiss button's words. */
  readonly dismissLabel: string
  readonly children: ReactNode
}

function ToastStack({ dismissLabel }: { readonly dismissLabel: string }) {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        'flex flex-col gap-1 rounded-control border border-stone-300 bg-bg p-4 text-stone-900 shadow-menu',
        'transition-[opacity,translate] duration-200 ease-settle data-ending-style:duration-150',
        'data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:translate-y-2',
      )}
    >
      <Toast.Title className="text-body font-semibold" />
      <Toast.Description className="text-label text-stone-600" />
      <Toast.Close className="mt-1 cursor-pointer self-start text-label text-blue-ink underline underline-offset-4">
        {dismissLabel}
      </Toast.Close>
    </Toast.Root>
  ))
}

export function ToastProvider({ dismissLabel, children }: ToastProviderProps) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal className="rc-root">
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 wide:inset-x-auto wide:right-6 wide:bottom-6 wide:w-80">
          <ToastStack dismissLabel={dismissLabel} />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

export interface ToastMessage {
  readonly title: string
  readonly description?: string
}

/** `show({ title, description })` inside a `ToastProvider`. */
export function useToast(): { readonly show: (message: ToastMessage) => void } {
  const manager = Toast.useToastManager()
  return { show: ({ title, description }) => void manager.add({ title, description }) }
}
