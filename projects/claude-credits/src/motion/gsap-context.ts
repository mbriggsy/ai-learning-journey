import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'

// useGSAP MUST be registered or it fails silently. CustomEase powers the weighted eases.
// ScrollTrigger + DrawSVGPlugin are NOT registered here — each later phase registers the
// plugin it introduces (DrawSVG → Phase 5). Don't load heavy plugins on the entry chunk
// for zero consumers.
gsap.registerPlugin(useGSAP, CustomEase)

export { gsap, useGSAP, CustomEase }
