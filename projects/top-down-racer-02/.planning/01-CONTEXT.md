# Phase 1 Context: Core Simulation Engine

**Created:** 2026-02-27
**Phase:** 1 — Core Simulation Engine
**Areas discussed:** Car physics feel, Wall collision behavior

---

## Car Physics Feel

### Car Archetype: Rally Car
The car should feel like a rally car — loose rear end, slides are expected and recoverable, weight transfer is prominent. Not a go-kart (too tame), not a touring car (too planted). Think Dirt Rally on easy mode.

### Oversteer Character: Noticeable Slide
When the player lifts off throttle mid-corner, the rear should **clearly rotate** — requiring counter-steer to catch. It should feel satisfying when you save a slide. This is the "simcade sweet spot." Not a subtle hint (too boring), not a dramatic snap (too punishing for casual players).

### Acceleration: Medium (~4-5 seconds to top speed)
Acceleration is a factor in racing but doesn't dominate. Good balance of straight-line speed and cornering importance. Exit speed matters, but it's not the only thing.

### Braking: Meaningful
Braking zones exist and matter. Brake too late → run wide. Brake too early → lose time. But mistakes are **recoverable** — you run wide, you don't spin into a wall every time. Not forgiving (too easy), not punishing (too frustrating).

### Surface Grip Delta: Significant (~50% grip on runoff)
Going from road to runoff should be a **noticeable event**. The car becomes clearly harder to control on runoff. Going wide costs real time and forces corrections. This forces players to stay on the racing line. Not mild (too forgiving), not severe (too punishing).

### Speed Range: 150-200 units/sec
Fast enough to feel exciting at top speed, slow enough to give reaction time in a top-down view. Track geometry should be designed around this speed range.

### Steering Response: Blend
Responsive at low speed (snappy, direct feel), progressively wider arcs at higher speed. This gives the car a natural progression — nimble in parking lot maneuvers, committed in high-speed sweepers. Implements MECH-06 (steering authority reduces at speed) naturally.

### Slide Recovery: Intuitive
When the car is sliding, pointing the wheels where you want to go should mostly sort it out. The car has a **self-correcting tendency** — most players can catch slides without precise counter-steer timing. The skill gap is in *avoiding* the slide, not *recovering* from it.

---

## Wall Collision Behavior

### Glancing Contact (shallow angle): Noticeable Drag
Scraping along a wall produces a **moderate speed penalty (~15-25%)**. The car slows noticeably while in contact with the wall. You feel it, you lose time, but you're not destroyed. Punishes sloppy racing lines without being catastrophic.

### Hard Impact (steep angle / head-on): Stop and Slide
A hard impact nearly **stops the car**. Devastating to momentum. If the player is still holding throttle, the car can begin sliding along the wall surface from near-zero speed. This is maximum punishment for blown braking points — you have to rebuild speed from scratch.

### Contact Mode: Slide Along Wall
The car stays in contact with the wall surface and **slides parallel** to it (like a hockey puck along boards). No bouncing, no deflection. The car rides the wall until the player steers away from it. This is standard top-down racer behavior and is predictable for both humans and AI.

### Rotation on Contact: Yes (Speed + Rotation)
Wall contact **rotates the car** based on impact angle — the nose steers along the wall surface. This creates natural wall-riding behavior where the car's heading aligns with the wall. More realistic, gives the wall-sliding a physical feel rather than just being a speed tax.

### Speed Penalty Formula
Speed penalty should be **proportional to impact angle** (per MECH-08):
- 0° (parallel scrape): minimal penalty, mostly friction drag
- 45°: moderate penalty, noticeable speed loss
- 90° (head-on): near-total speed loss, car nearly stops

The normal component of velocity is absorbed, the tangential component is preserved (minus friction). This gives a natural, physics-based response without needing separate "glancing" vs "hard impact" code paths.

---

## Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Car archetype | Rally car | Loose, slidey, recoverable — matches "simcade" target |
| Oversteer level | Noticeable slide | Satisfying to catch, not punishing to trigger |
| Acceleration | ~4-5 sec to top speed | Balanced — speed matters but doesn't dominate |
| Braking | Meaningful zones | Rewards planning, mistakes recoverable |
| Runoff grip | ~50% of road | Forces staying on track, not catastrophic |
| Top speed | 150-200 units/sec | Exciting but reactable in top-down view |
| Steering at speed | Blend (responsive→wide arcs) | Natural MECH-06 implementation |
| Slide recovery | Intuitive (self-correcting) | Skill gap in avoidance, not recovery |
| Wall scrape | ~15-25% speed penalty | Punishes sloppiness, not catastrophic |
| Wall hard impact | Near-stop, then slide | Maximum momentum punishment |
| Wall contact mode | Slide along surface | Predictable for humans and AI |
| Wall rotation | Yes — nose aligns to wall | Natural wall-riding behavior |
| Speed penalty | Proportional to impact angle | Physics-based, single formula |

---

## Deferred Ideas

None raised during discussion.

---
*Context created: 2026-02-27*
