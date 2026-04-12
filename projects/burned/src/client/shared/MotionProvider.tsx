import { LazyMotion, MotionConfig } from 'motion/react'
import type { PropsWithChildren } from 'react'

const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default)

export function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
