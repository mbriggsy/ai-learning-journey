import type { FSMState } from '../../../types/fsm.js';
import type { SeekerContext } from '../seeker-fsm.js';
import type { HidingSpot, RoomDefinition } from '../../../types/ai.js';
import {
  clearPath, requestPathTo, moveAlongPath,
  isPathComplete, pickRandomWalkableTile, checkDoorOnPath,
} from '../seeker-fsm.js';
import { getRoomAt } from '../../rooms.js';
import { getHidingSpotsInRoom, getHidingSpotsNear } from '../hiding-spots.js';

let searchCenterX = 0;
let searchCenterY = 0;
let searchTargets: Array<{ x: number; y: number }> = [];
let searchTargetIndex = 0;
let ticksRemaining = 0;
let searchRadiusExpansionTicks = 0;
let currentSearchRadius = 0;

export class SearchState implements FSMState<SeekerContext> {
  readonly name = 'search';

  onEnter(ctx: SeekerContext): void {
    clearPath(ctx.ai);

    // Search center = last known hider position or evidence location
    if (ctx.ai.lastKnownHiderPos) {
      searchCenterX = ctx.ai.lastKnownHiderPos.x;
      searchCenterY = ctx.ai.lastKnownHiderPos.y;
    }

    ticksRemaining = ctx.config.searchDurationTicks;
    currentSearchRadius = ctx.config.searchRadiusTiles;
    searchRadiusExpansionTicks = 0;
    searchTargetIndex = 0;
    searchTargets = this.computeTargets(ctx);
  }

  onUpdate(ctx: SeekerContext, dt: number): void {
    ticksRemaining--;

    // Timer expired → PATROL
    if (ticksRemaining <= 0) {
      ctx.render.fsmState = 'patrol';
      return;
    }

    // Hard AI: expand search radius every 5 seconds
    if (ctx.config.searchThoroughness === 'room-plus-adjacent') {
      searchRadiusExpansionTicks++;
      if (searchRadiusExpansionTicks >= 300) { // 5s at 60tick/s
        currentSearchRadius++;
        searchRadiusExpansionTicks = 0;
        // Recompute targets with expanded radius
        const newTargets = this.computeTargets(ctx);
        // Append new targets we haven't visited
        for (const t of newTargets) {
          if (!searchTargets.some(s => s.x === t.x && s.y === t.y)) {
            searchTargets.push(t);
          }
        }
      }
    }

    // Process action queue (door opening)
    if (!ctx.actionQueue.isEmpty()) return;

    // Moving to current target
    if (!isPathComplete(ctx.ai)) {
      if (checkDoorOnPath(ctx)) return;
      moveAlongPath(ctx, ctx.config.patrolSpeed, dt);
      return;
    }

    // Arrived at target — move to next
    if (searchTargetIndex < searchTargets.length) {
      const target = searchTargets[searchTargetIndex]!;
      searchTargetIndex++;

      // Skip LKP tile with configured probability
      if (target.x === searchCenterX && target.y === searchCenterY) {
        if (Math.random() < ctx.config.searchSkipLKPChance) {
          // Skip this target
          return;
        }
      }

      requestPathTo(ctx, target.x, target.y);
    } else {
      // All targets visited → back to PATROL
      ctx.render.fsmState = 'patrol';
    }
  }

  onExit(_ctx: SeekerContext): void {
    searchTargets = [];
    searchTargetIndex = 0;
  }

  private computeTargets(ctx: SeekerContext): Array<{ x: number; y: number }> {
    const targets: Array<{ x: number; y: number }> = [];

    switch (ctx.config.searchThoroughness) {
      case 'spot-check': {
        // Easy: 1-2 random tiles within radius
        for (let i = 0; i < 2; i++) {
          const x = searchCenterX + Math.floor(Math.random() * currentSearchRadius * 2) - currentSearchRadius;
          const y = searchCenterY + Math.floor(Math.random() * currentSearchRadius * 2) - currentSearchRadius;
          const cx = Math.max(0, Math.min(ctx.map.width - 1, x));
          const cy = Math.max(0, Math.min(ctx.map.height - 1, y));
          if (ctx.map.isWalkable(cx, cy)) {
            targets.push({ x: cx, y: cy });
          }
        }
        break;
      }

      case 'full-room': {
        // Medium: all hiding spots in the room containing search center
        const room = getRoomAt(searchCenterX, searchCenterY, ctx.rooms);
        if (room) {
          const spots = getHidingSpotsInRoom(room, ctx.hidingSpots);
          this.addSpotTargets(targets, spots, ctx);
        }
        // Always include search center
        if (!targets.some(t => t.x === searchCenterX && t.y === searchCenterY)) {
          targets.unshift({ x: searchCenterX, y: searchCenterY });
        }
        break;
      }

      case 'room-plus-adjacent': {
        // Hard: hiding spots in room + all adjacent rooms
        const room = getRoomAt(searchCenterX, searchCenterY, ctx.rooms);
        if (room) {
          const spots = getHidingSpotsInRoom(room, ctx.hidingSpots);
          this.addSpotTargets(targets, spots, ctx);

          // Adjacent rooms
          for (const adjId of room.adjacentRooms) {
            const adjRoom = ctx.rooms.find(r => r.id === adjId);
            if (adjRoom) {
              const adjSpots = getHidingSpotsInRoom(adjRoom, ctx.hidingSpots);
              this.addSpotTargets(targets, adjSpots, ctx);
            }
          }
        }

        // Also search nearby spots not in any room
        const nearSpots = getHidingSpotsNear(searchCenterX, searchCenterY, currentSearchRadius, ctx.hidingSpots);
        this.addSpotTargets(targets, nearSpots, ctx);

        // Always include search center
        if (!targets.some(t => t.x === searchCenterX && t.y === searchCenterY)) {
          targets.unshift({ x: searchCenterX, y: searchCenterY });
        }
        break;
      }
    }

    // Fallback: if no targets computed, use search center
    if (targets.length === 0) {
      targets.push({ x: searchCenterX, y: searchCenterY });
    }

    return targets;
  }

  private addSpotTargets(
    targets: Array<{ x: number; y: number }>,
    spots: readonly HidingSpot[],
    ctx: SeekerContext,
  ): void {
    // Sort by score descending — check best spots first
    const sorted = [...spots].sort((a, b) => b.score - a.score);
    for (const spot of sorted) {
      const { x, y } = spot.position;
      // Clamp to map bounds
      if (x < 0 || x >= ctx.map.width || y < 0 || y >= ctx.map.height) continue;
      if (!targets.some(t => t.x === x && t.y === y)) {
        targets.push({ x, y });
      }
    }
  }

  /** Set search center externally. */
  static setSearchCenter(x: number, y: number): void {
    searchCenterX = x;
    searchCenterY = y;
  }
}
