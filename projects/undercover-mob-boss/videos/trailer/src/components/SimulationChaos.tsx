import React, { useMemo } from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY, FONT_MONO } from '../lib/fonts';

/** Mulberry32 seeded PRNG — deterministic for Remotion's frame seeking. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Card assets with spawn weights. */
const CARD_POOL = [
  { src: 'assets/policy-good.png', weight: 3 },
  { src: 'assets/policy-bad.png', weight: 3 },
  { src: 'assets/vote-approve.png', weight: 2 },
  { src: 'assets/vote-block.png', weight: 2 },
  { src: 'assets/role-citizen.png', weight: 1 },
  { src: 'assets/role-mob-soldier.png', weight: 1 },
  { src: 'assets/role-mob-boss.png', weight: 0.5 },
  { src: 'assets/power-investigate.png', weight: 0.5 },
  { src: 'assets/power-nominate.png', weight: 0.5 },
  { src: 'assets/power-execute.png', weight: 0.5 },
  { src: 'assets/power-peek.png', weight: 0.5 },
  { src: 'assets/veto-deliberation.png', weight: 0.3 },
];

/** Build weighted lookup array for card selection. */
const WEIGHTED_CARDS: string[] = [];
for (const card of CARD_POOL) {
  const count = Math.round(card.weight * 10);
  for (let i = 0; i < count; i++) {
    WEIGHTED_CARDS.push(card.src);
  }
}

interface SpawnEvent {
  spawnFrame: number;
  src: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  driftX: number;
  driftY: number;
  lifespan: number;
}

/** Error flash events at predetermined frames. */
const ERROR_FLASHES = [
  { frame: 95, x: 350, y: 180 },
  { frame: 175, x: 1150, y: 320 },
  { frame: 255, x: 750, y: 130 },
  { frame: 350, x: 550, y: 380 },
  { frame: 420, x: 1350, y: 220 },
];

const FLASH_DURATION = 12;

interface Props {
  freezeFrame: number;
  spawnStartFrame: number;
  spawnEndFrame: number;
  bounds: { width: number; height: number };
}

export const SimulationChaos: React.FC<Props> = ({
  freezeFrame,
  spawnStartFrame,
  spawnEndFrame,
  bounds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spawns = useMemo(() => {
    const rng = mulberry32(42);
    const events: SpawnEvent[] = [];
    const totalSpawns = 280;
    const spawnRange = spawnEndFrame - spawnStartFrame;

    for (let i = 0; i < totalSpawns; i++) {
      // Density increases over time — earlier spawns spread out, later spawns packed
      const progress = i / totalSpawns;
      const easedProgress = progress * progress; // quadratic = accelerating
      const spawnFrame = Math.round(
        spawnStartFrame + easedProgress * spawnRange,
      );

      events.push({
        spawnFrame,
        src: WEIGHTED_CARDS[Math.floor(rng() * WEIGHTED_CARDS.length)],
        x: 60 + rng() * (bounds.width - 180),
        y: 30 + rng() * (bounds.height - 160),
        rotation: (rng() - 0.5) * 60,
        scale: 0.25 + rng() * 0.45,
        driftX: (rng() - 0.5) * 2.5,
        driftY: (rng() - 0.5) * 1.8,
        lifespan: 60 + Math.round(rng() * 60),
      });
    }

    return events;
  }, [spawnStartFrame, spawnEndFrame, bounds.width, bounds.height]);

  const effectiveFrame = Math.min(frame, freezeFrame);
  const isFrozen = frame >= freezeFrame;

  return (
    <div
      style={{
        position: 'relative',
        width: bounds.width,
        height: bounds.height,
        overflow: 'hidden',
      }}
    >
      {/* Spawned cards */}
      {spawns.map((spawn, i) => {
        if (effectiveFrame < spawn.spawnFrame) return null;

        const localFrame = effectiveFrame - spawn.spawnFrame;
        const fadeOutStart = spawn.lifespan;
        const fadeOutEnd = spawn.lifespan + 20;

        // Don't render fully faded cards (unless frozen)
        if (!isFrozen && localFrame > fadeOutEnd) return null;

        const entryScale = spring({
          fps,
          frame: Math.min(localFrame, 10),
          config: { damping: 40, stiffness: 200 },
        });

        const currentX = spawn.x + spawn.driftX * localFrame;
        const currentY = spawn.y + spawn.driftY * localFrame;

        const fadeOpacity =
          localFrame > fadeOutStart
            ? interpolate(
                localFrame,
                [fadeOutStart, fadeOutEnd],
                [1, 0],
                { extrapolateRight: 'clamp' },
              )
            : 1;

        const cardWidth = 90 * spawn.scale;
        const cardHeight = 126 * spawn.scale;

        return (
          <Img
            key={i}
            src={staticFile(spawn.src)}
            style={{
              position: 'absolute',
              left: currentX,
              top: currentY,
              width: cardWidth,
              height: cardHeight,
              objectFit: 'cover',
              borderRadius: 4,
              transform: `rotate(${spawn.rotation}deg) scale(${entryScale})`,
              opacity: fadeOpacity * entryScale,
              boxShadow: `0 2px 8px ${NOIR.black}60`,
            }}
          />
        );
      })}

      {/* Error flash events */}
      {ERROR_FLASHES.map((flash, i) => {
        const localFrame = effectiveFrame - flash.frame;
        if (localFrame < 0 || localFrame > FLASH_DURATION) return null;

        const isFailPhase = localFrame < 5;
        const isResolvePhase = localFrame >= 5 && localFrame < 9;
        const isFadePhase = localFrame >= 9;

        const opacity = isFadePhase
          ? interpolate(localFrame, [9, FLASH_DURATION], [1, 0])
          : 1;

        const bgColor = isFailPhase
          ? NOIR.blood
          : NOIR.green;
        const text = isFailPhase
          ? 'FAIL?'
          : '✓ PASS';

        return (
          <div
            key={`flash-${i}`}
            style={{
              position: 'absolute',
              left: flash.x,
              top: flash.y,
              padding: '6px 16px',
              borderRadius: 4,
              backgroundColor: `${bgColor}dd`,
              border: `2px solid ${bgColor}`,
              boxShadow: `0 0 20px ${bgColor}80`,
              fontFamily: FONT_MONO,
              fontSize: 14,
              fontWeight: 'bold',
              color: NOIR.cream,
              letterSpacing: '0.1em',
              opacity,
              transform: isResolvePhase ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
};
