import { LazyMotion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

const loadFeatures = () =>
  import('./motion-features').then((mod) => mod.default)

export function MotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
