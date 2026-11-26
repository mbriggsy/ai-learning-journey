/**
 * src/ui/kit/Toast.tsx: the kit's toast, on Base UI's Toast (never shadcn's `sonner`, which injects a `<style>`;
 * plan 2.1 decision 1). `ToastProvider` wraps a page once and draws the stack at the bottom right (full width on the
 * phone) in a portal carrying `.rc-root`; `useToast()` returns `show`, `update` and `close`. A toast is a white card
 * with a 1 px edge and a soft shadow, its title semibold, its one action (where it has one) a small blue primary button,
 * and its dismiss a blue-ink text button whose words the provider takes (plan 2.1 decision 10). The stack is a polite
 * live region (Base UI's viewport, always mounted, named by `regionLabel`), so a toast is read, not only seen.
 *
 * Since Act 6 · RC19 the update prompt (`UpdateToast.tsx`) is its first real screen: a toast can stay until a press
 * (`timeout: 0`), carry an action, and tell its caller when it closes by any way (`onClose`: the dismiss, a swipe).
 *
 * Motion: a 200 ms rise and fade in, a faster fade out; fade only under reduced motion.
 */
import type { ReactNode } from 'react'
import { Toast } from '@base-ui/react/toast'
import { buttonClasses } from './Button'
import { cn } from './cn'

export interface ToastProviderProps {
  /** The dismiss button's words. */
  readonly dismissLabel: string
  /** The stack's name as a region (Base UI's own default is an English word the copy catalog never saw). */
  readonly regionLabel: string
  readonly children: ReactNode
}

function ToastStack({ dismissLabel }: { readonly dismissLabel: string }) {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      data-toast=""
      className={cn(
        'flex flex-col gap-2 rounded-control border border-stone-300 bg-bg p-4 text-stone-900 shadow-menu',
        'transition-[opacity,translate] duration-200 ease-settle data-ending-style:duration-150',
        'data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:translate-y-2',
      )}
    >
      <Toast.Title className="text-body font-semibold" />
      <Toast.Description className="text-label text-stone-600 empty:hidden" />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {toast.actionProps !== undefined ? <Toast.Action className={buttonClasses('primary', 'sm')} /> : null}
        <Toast.Close className="min-h-8 cursor-pointer text-label text-blue-ink underline underline-offset-4">{dismissLabel}</Toast.Close>
      </div>
    </Toast.Root>
  ))
}

export function ToastProvider({ dismissLabel, regionLabel, children }: ToastProviderProps) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal className="rc-root">
        <Toast.Viewport
          aria-label={regionLabel}
          className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 wide:inset-x-auto wide:right-6 wide:bottom-6 wide:w-80"
        >
          <ToastStack dismissLabel={dismissLabel} />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

export interface ToastMessage {
  readonly title: string
  readonly description?: string
  /** A fixed id, so a caller can update or close its own toast. */
  readonly id?: string
  /** Milliseconds before it closes by itself; `0` keeps it until a press. Base UI's 5 s by default. */
  readonly timeout?: number
  /** One action beside the dismiss. */
  readonly action?: { readonly label: string; readonly onSelect: () => void }
  /** Called when the toast closes by any way (the dismiss, a swipe, a `close`). */
  readonly onClose?: () => void
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  readonly show: (message: ToastMessage) => string
  readonly update: (id: string, message: Partial<Pick<ToastMessage, 'title' | 'description'>>) => void
  readonly close: (id: string) => void
}

/** `show`, `update` and `close`, inside a `ToastProvider`. */
export function useToast(): ToastApi {
  const manager = Toast.useToastManager()
  return {
    show: ({ title, description, id, timeout, action, onClose }) =>
      manager.add({
        title,
        description,
        ...(id !== undefined ? { id } : {}),
        ...(timeout !== undefined ? { timeout } : {}),
        ...(action !== undefined ? { actionProps: { children: action.label, onClick: action.onSelect } } : {}),
        ...(onClose !== undefined ? { onClose } : {}),
      }),
    update: (id, message) => manager.update(id, message),
    close: (id) => manager.close(id),
  }
}
