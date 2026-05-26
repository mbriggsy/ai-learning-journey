import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'

// useGSAP MUST be registered or it fails silently. CustomEase powers the weighted eases.
// ScrollTrigger is registered here by Phase 4 (the first scroll-revealed surface — the grid);
// per Phase 1 Decision 3 each phase registers the plugin it introduces. DrawSVGPlugin is
// introduced by Phase 5 for the AssetDonut draw-on (it ships inside gsap@^3.x — free since the
// Webflow acquisition; verified resolvable). Registration must survive the prod tree-shake —
// re-verify the donut draws in `pnpm preview`, not just dev (same failure class as the eases).
gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger, DrawSVGPlugin)

export { gsap, useGSAP, CustomEase, ScrollTrigger, DrawSVGPlugin }
