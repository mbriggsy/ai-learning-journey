import { CustomEase } from './gsap-context'

// Reveal / arrival — scroll reveals, page load, route fade (0.6–1.0s).
// Moderate ramp-in (initial velocity ~0.5), strong glide, soft landing — an ease-out shape.
CustomEase.create('weighted-arrive', 'M0,0 C0.2,0.1 0.2,1 1,1')

// Hero counter tick-up (2.0–2.8s). Slow first 12% (mass), accelerate through the
// middle, very long final 30% so the last digit settles rather than snaps.
CustomEase.create('weighted-settle', 'M0,0 C0.12,0 0.18,0.7 0.5,0.92 C0.7,0.98 0.86,1 1,1')

// Hover lift / press (0.16–0.25s). The 1.05 control point gives a mechanical-key
// overshoot — mass without playful bounce.
CustomEase.create('weighted-press', 'M0,0 C0.3,0 0.4,1.05 1,1')

// Exit — faster than entry (asymmetric rule). ease-in is OK on exit.
CustomEase.create('weighted-exit', 'M0,0 C0.4,0 1,0.6 1,1')

export const ease = {
  arrive: 'weighted-arrive',
  settle: 'weighted-settle',
  press: 'weighted-press',
  exit: 'weighted-exit',
} as const
