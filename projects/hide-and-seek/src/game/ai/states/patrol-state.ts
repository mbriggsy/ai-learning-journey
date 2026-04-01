import type { FSMState } from '../../../types/fsm.js';
import type { SeekerContext } from '../seeker-fsm.js';
import {
  pickRandomWalkableTile, clearPath, requestPathTo,
  moveAlongPath, isPathComplete, checkDoorOnPath,
} from '../seeker-fsm.js';
import { getRoomAt } from '../../rooms.js';
import { getHidingSpotsInRoom } from '../hiding-spots.js';
import { pixelToTile } from '../../map.js';

export class PatrolState implements FSMState<SeekerContext> {
  readonly name = 'patrol';

  onEnter(ctx: SeekerContext): void {
    clearPath(ctx.ai);
    ctx.ai.patrolPauseTicks = 0;
  }

  onUpdate(ctx: SeekerContext, dt: number): void {
    // Patrol pause
    if (ctx.ai.patrolPauseTicks > 0) {
      ctx.ai.patrolPauseTicks--;
      return;
    }

    // Need a new destination?
    if (isPathComplete(ctx.ai) && !ctx.ai.pendingPath) {
      this.pickTarget(ctx);
      return;
    }

    // Check for closed door on path
    if (checkDoorOnPath(ctx)) return;

    // Doorway pause check
    if (ctx.config.doorwayPauseChance > 0 && ctx.doorSystem) {
      const wp = ctx.ai.currentPath[ctx.ai.waypointIndex];
      if (wp) {
        const door = ctx.doorSystem.getDoorAt(wp.x, wp.y);
        if (door && door.isOpen && Math.random() < ctx.config.doorwayPauseChance) {
          ctx.ai.patrolPauseTicks = ctx.config.doorwayPauseTicks;
          return;
        }
      }
    }

    // Follow path
    moveAlongPath(ctx, ctx.config.patrolSpeed, dt);

    // On arrival: pause and mark room visited
    if (isPathComplete(ctx.ai)) {
      clearPath(ctx.ai);
      const range = ctx.config.patrolPauseMaxTicks - ctx.config.patrolPauseMinTicks;
      ctx.ai.patrolPauseTicks = ctx.config.patrolPauseMinTicks + Math.floor(Math.random() * (range + 1));

      // Mark room visited for systematic/strategic patrol
      if (ctx.ai.roomTracker && ctx.rooms.length > 0) {
        const tile = pixelToTile(ctx.render.x, ctx.render.y);
        const room = getRoomAt(tile.x, tile.y, ctx.rooms);
        if (room) {
          ctx.ai.roomTracker.markVisited(room.id, ctx.currentTick);
          ctx.ai.roomTracker.clearTarget();
        }
      }
    }
  }

  onExit(_ctx: SeekerContext): void {
    // nothing to clean up
  }

  private pickTarget(ctx: SeekerContext): void {
    const { config, map, rooms, ai } = ctx;

    switch (config.patrolStrategy) {
      case 'random':
        this.pickRandom(ctx);
        break;

      case 'systematic': {
        if (rooms.length === 0 || !ai.roomTracker) {
          // Fallback: no rooms → degrade to random
          console.warn('PatrolState: systematic patrol with no rooms — falling back to random');
          this.pickRandom(ctx);
          return;
        }
        const tile = pixelToTile(ctx.render.x, ctx.render.y);
        const currentRoom = getRoomAt(tile.x, tile.y, rooms);
        const best = ai.roomTracker.getBestRoom(rooms, tile.x, tile.y, ctx.currentTick, currentRoom?.id);
        if (best) {
          requestPathTo(ctx, best.center.x, best.center.y);
        } else {
          this.pickRandom(ctx);
        }
        break;
      }

      case 'strategic': {
        if (rooms.length === 0 || !ai.roomTracker) {
          console.warn('PatrolState: strategic patrol with no rooms — falling back to random');
          this.pickRandom(ctx);
          return;
        }
        // Strategic: weight rooms by hiding spot density
        const tile = pixelToTile(ctx.render.x, ctx.render.y);
        const currentRoom = getRoomAt(tile.x, tile.y, rooms);

        let bestRoom: typeof rooms[number] | undefined;
        let bestScore = -Infinity;

        for (const room of rooms) {
          let score = ai.roomTracker.scoreRoom(room, tile.x, tile.y, ctx.currentTick, currentRoom?.id);
          // Boost by hiding spot density
          const spots = getHidingSpotsInRoom(room, ctx.hidingSpots);
          const area = room.bounds.width * room.bounds.height;
          const density = area > 0 ? spots.length / area : 0;
          score += density * 0.2;

          if (score > bestScore) {
            bestScore = score;
            bestRoom = room;
          }
        }

        if (bestRoom) {
          requestPathTo(ctx, bestRoom.center.x, bestRoom.center.y);
        } else {
          this.pickRandom(ctx);
        }
        break;
      }
    }
  }

  private pickRandom(ctx: SeekerContext): void {
    const target = pickRandomWalkableTile(ctx.map);
    if (target) {
      requestPathTo(ctx, target.x, target.y);
    }
  }
}
