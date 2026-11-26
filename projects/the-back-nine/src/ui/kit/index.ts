/**
 * src/ui/kit: Act 6's component kit (plan docs/plans/6-rightcapital-ui-plan.md, section 3.1). shadcn's Base UI
 * components were copied once into a scratch project (`components.json` at the project root points here) and rewritten
 * to the role tokens in `src/ui/styles/theme.css`, so the code is ours. Three laws hold in every file:
 * - every word is a prop (no kit file imports `copy.ts` or `entryCopy.ts`; the vault screens ride the entry
 *   chunk, and the build refuses `copy.ts` in an entry's first load);
 * - colour is never the only signal (an underline, a weight, a mark, a position or words go with every colour);
 * - nothing injects a `<style>` (Base UI under `CSPProvider disableStyleElements`; popups portal with `.rc-root`).
 */
export { AddMenu, type AddMenuEntry, type AddMenuGroup, type AddMenuLeaf, type AddMenuProps } from './AddMenu'
export { Button, buttonClasses, BUTTON_VARIANTS, type ButtonProps, type ButtonVariant } from './Button'
export { Card, type CardProps } from './Card'
export { Caveat, type CaveatProps } from './Caveat'
export { Checkbox, type CheckboxProps } from './Checkbox'
export { ChoiceGroup, type ChoiceGroupProps, type ChoiceItem } from './ChoiceGroup'
export { cn } from './cn'
export { DataTable, type DataColumn, type DataColumnGroup, type DataTableColumn, type DataTableProps } from './DataTable'
export { Drawer, DrawerFields, type DrawerProps, type DrawerStep } from './Drawer'
export { FolderTabs, PANEL_CLASSES, type FolderTab, type FolderTabsProps } from './FolderTabs'
export { tableNumber } from './format'
export { OutLink } from './OutLink'
export { MoneyInput, PercentInput, WholeInput, type MoneyInputProps, type PercentInputProps, type WholeInputProps } from './NumberInputs'
export { ChartTitle, PageFrame, PickerPair, type ChartTitleProps, type PageFrameHandle, type PageFrameProps, type PageFrameTabs } from './PageFrame'
export { Ring, ringArcLength, RING_CIRCUMFERENCE, RING_RADIUS, type RingProps } from './Ring'
export { ProfileCard, type ProfileCardProps, type ProfileCardRow } from './ProfileCard'
export { ScrollArea, type ScrollAreaProps } from './ScrollArea'
export { Select, type SelectItem, type SelectProps } from './Select'
export { Slider, type SliderProps } from './Slider'
export { EmptyState, LoadingVeil, StaleBanner, type EmptyStateProps, type LoadingVeilProps, type StaleBannerProps, type StateAction } from './States'
export { isPlainClick, SubNav, type NavItem, type SubNavProps } from './SubNav'
export { Switch, type SwitchProps } from './Switch'
export { TextInput, type TextInputProps } from './TextInput'
export { TickDial, type TickDialProps } from './TickDial'
export { ToastProvider, useToast, type ToastApi, type ToastMessage, type ToastProviderProps } from './Toast'
export { InfoTip, Tooltip, type InfoTipProps, type TooltipProps } from './Tooltip'
export { Tray, TrayColumn, TrayFooter, TrayRow, TraySection, type TrayAction, type TrayColumnProps, type TrayFooterProps, type TrayProps, type TrayRowProps } from './Tray'
export { LAPTOP_QUERY, useLaptop } from './useLaptop'
export { useWide, WIDE_QUERY } from './useWide'
export { FieldNote, PassphraseField, TextLink, VAULT_ACTIONS, VaultCard, VaultHeading, VaultPage, VaultPending, Wordmark, type PassphraseFieldProps, type VaultCardProps, type VaultPageProps, type WordmarkProps } from './VaultCard'
