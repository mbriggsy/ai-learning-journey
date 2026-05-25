import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// useGSAP MUST be registered or it fails silently. CustomEase powers the weighted eases.
// ScrollTrigger is registered here by Phase 4 (the first scroll-revealed surface — the grid);
// per Phase 1 Decision 3 each phase registers the plugin it introduces. DrawSVGPlugin stays
// out until a phase needs it. (Bundle note: ScrollTrigger lands on the entry chunk via this
// boot import; accepted for v1 since the grid is on the entry route — Phase 4 Decision 7.)
gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger)

export { gsap, useGSAP, CustomEase, ScrollTrigger }
