import type { CardType } from '@shared/types'

const ASSET_PATH = '/assets/cards'

export function CardIllustration({ type }: { type: CardType }) {
  return (
    <span className="cardIllustration" aria-hidden="true">
      <img
        src={`${ASSET_PATH}/${type}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  )
}
