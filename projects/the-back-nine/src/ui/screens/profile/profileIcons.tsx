/**
 * src/ui/screens/profile/profileIcons.tsx: the line icon each Profile card's band and its drawer's header draw (Act 6 ·
 * RC13a; ref 3.8: lucide at 1.5 px, white on plum). B9's own drawings (never RightCapital's artwork). An icon is never a
 * card's only signal: the band's kind words carry it.
 */
import { Banknote, Building2, ChartColumnBig, CircleDollarSign, HandCoins, HeartPulse, House, Landmark, MapPin, PiggyBank, Scale, ShieldCheck, UserRound } from 'lucide-react'
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
  }
}
