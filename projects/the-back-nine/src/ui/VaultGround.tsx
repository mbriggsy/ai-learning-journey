/**
 * src/ui/VaultGround.tsx: the quiet page the save and backup drawers open over (Act 6 · RC19). The shell unmounts across
 * those ceremonies by design (`IntakeApp`'s `toCeremony` asks first over what that drops), so the drawer's scrim lies
 * over the shell's frame drawn still, never over the live shell: the white top bar with the wordmark on the vault
 * screens' stone page (`data-vault-page`, so the trailing R13 caveat sits on the same ground). It holds no control.
 */
import { copy } from './copy'
import { Wordmark } from './kit'

export function VaultGround() {
  return (
    <div data-vault-page="" data-vault-ground="" className="rc-root flex w-full flex-1 flex-col">
      <header className="w-full border-b border-stone-300 bg-bg">
        <div className="mx-auto flex min-h-12.5 max-w-[90rem] items-center px-4 wide:px-10">
          <Wordmark mark={copy.shellMark} title={copy.appTitle} />
        </div>
      </header>
    </div>
  )
}
