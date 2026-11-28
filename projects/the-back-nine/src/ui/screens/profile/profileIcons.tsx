/**
 * src/ui/screens/profile/profileIcons.tsx: the line icon each Profile card's band and its drawer's header draw (Act 6 ·
 * RC13a; ref 3.8: lucide at 1.5 px, white on plum). B9's own drawings (never RightCapital's artwork). An icon is never a
 * card's only signal: the band's kind words carry it.
 */
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChartColumnBig,
  CircleDollarSign,
  Gift,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  MapPin,
  PiggyBank,
  ReceiptText,
  Scale,
  ShieldCheck,
  ShoppingBasket,
  Stethoscope,
  Sunrise,
  UserRound,
  WalletCards,
} from 'lucide-react'
import type { CardIcon } from './profileView'

export function ProfileIcon({ icon }: { readonly icon: CardIcon | 'investment' }) {
  const props = { strokeWidth: 1.5, 'aria-hidden': true } as const
  switch (icon) {
    case 'person':
      return <UserRound {...props} />
    case 'state':
      return <MapPin {...props} />
    case 'salary':
      return <Banknote {...props} />
    case 'social-security':
      return <Landmark {...props} />
    case 'work-invest':
      return <HandCoins {...props} />
    case 'savings':
      return <PiggyBank {...props} />
    case 'hsa':
      return <HeartPulse {...props} />
    case 'investment':
      return <ChartColumnBig {...props} />
    case 'pension':
      return <Building2 {...props} />
    case 'rental':
      return <House {...props} />
    case 'annuity':
      return <ShieldCheck {...props} />
    case 'alimony':
      return <Scale {...props} />
    case 'other':
      return <CircleDollarSign {...props} />
    case 'living':
      return <ShoppingBasket {...props} />
    case 'medical':
      return <Stethoscope {...props} />
    case 'working-cost':
      return <BriefcaseBusiness {...props} />
    case 'retirement':
      return <Sunrise {...props} />
    case 'health':
      return <HeartPulse {...props} />
    case 'medicare':
      return <WalletCards {...props} />
    case 'money-picture':
      return <ReceiptText {...props} />
    case 'one-time':
      return <Gift {...props} />
  }
}
