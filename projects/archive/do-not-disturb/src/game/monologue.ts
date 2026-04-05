import type { Emitter } from './events';

export type MonologueTrigger = {
  readonly id: string;
  readonly lines: readonly string[];
  readonly cooldownS: number;
  readonly priority: number;
  readonly check: (context: MonologueContext) => boolean;
};

export type MonologueContext = {
  readonly currentNight: number;
  readonly currentZone: string;
  readonly monstersNearby: readonly string[];
  readonly firstSightings: ReadonlySet<string>;
};

export type MonologueSystem = {
  update(dt: number, context: MonologueContext): void;
  readonly activeLine: string | null;
  readonly activePriority: number;
};

export function createMonologueSystem(
  triggers: readonly MonologueTrigger[],
  emitter: Emitter,
): MonologueSystem {
  const cooldowns = new Map<string, number>();
  let activeLine: string | null = null;
  let activePriority = -1;
  let displayTimer = 0;
  const DISPLAY_DURATION_S = 3;

  return {
    update(dt: number, context: MonologueContext) {
      // Tick down cooldowns
      for (const [id, remaining] of cooldowns) {
        const next = remaining - dt;
        if (next <= 0) {
          cooldowns.delete(id);
        } else {
          cooldowns.set(id, next);
        }
      }

      // Tick down display timer
      if (activeLine !== null) {
        displayTimer -= dt;
        if (displayTimer <= 0) {
          activeLine = null;
          activePriority = -1;
          emitter.emit('MONOLOGUE_HIDE');
        }
      }

      // Check triggers (highest priority first)
      let bestTrigger: MonologueTrigger | null = null;
      for (const trigger of triggers) {
        if (cooldowns.has(trigger.id)) continue;
        if (trigger.priority <= activePriority) continue;
        if (!trigger.check(context)) continue;
        if (!bestTrigger || trigger.priority > bestTrigger.priority) {
          bestTrigger = trigger;
        }
      }

      if (bestTrigger) {
        const line = bestTrigger.lines[Math.floor(Math.random() * bestTrigger.lines.length)]!;
        activeLine = line;
        activePriority = bestTrigger.priority;
        displayTimer = DISPLAY_DURATION_S;
        if (bestTrigger.cooldownS > 0) {
          cooldowns.set(bestTrigger.id, bestTrigger.cooldownS);
        }
        emitter.emit('MONOLOGUE_SHOW', line);
      }
    },

    get activeLine() { return activeLine; },
    get activePriority() { return activePriority; },
  };
}

// --- Built-in trigger definitions ---

export const MONOLOGUE_TRIGGERS: readonly MonologueTrigger[] = [
  {
    id: 'bellhop-nearby',
    lines: ['Is that... humming?'],
    cooldownS: 30,
    priority: 5,
    check: (ctx) => ctx.monstersNearby.includes('bellhop'),
  },
  {
    id: 'housekeeper-nearby',
    lines: ['I can hear wheels...'],
    cooldownS: 30,
    priority: 5,
    check: (ctx) => ctx.monstersNearby.includes('housekeeper'),
  },
  {
    id: 'basement-enter',
    lines: ['It\'s so dark down here.', 'I can\'t see anything.'],
    cooldownS: 60,
    priority: 3,
    check: (ctx) => ctx.currentZone.startsWith('basement'),
  },
  {
    id: 'attic-enter',
    lines: ['Oh GREAT, another floor.'],
    cooldownS: 60,
    priority: 3,
    check: (ctx) => ctx.currentZone.startsWith('attic'),
  },
  {
    id: 'night5-deja-vu',
    lines: ['Have I been here before?', 'This isn\'t right...'],
    cooldownS: 45,
    priority: 6,
    check: (ctx) => ctx.currentNight === 5,
  },
  {
    id: 'first-bellhop',
    lines: ['What IS that?'],
    cooldownS: 0,
    priority: 9,
    check: (ctx) => ctx.firstSightings.has('bellhop'),
  },
  {
    id: 'first-housekeeper',
    lines: ['...is that a cleaning cart?'],
    cooldownS: 0,
    priority: 9,
    check: (ctx) => ctx.firstSightings.has('housekeeper'),
  },
  {
    id: 'first-guest',
    lines: ['DID THAT JUST MOVE?!'],
    cooldownS: 0,
    priority: 9,
    check: (ctx) => ctx.firstSightings.has('guest'),
  },
];
