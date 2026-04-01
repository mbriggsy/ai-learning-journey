import EasyStar from 'easystarjs';
import type { PathPoint } from '../../types/ai.js';
import { SEEKER } from '../../constants.js';

/** Per-agent pathfinding handle — seeker and hider each get one */
export interface PathfindingInstance {
  requestPath(
    fromX: number, fromY: number,
    toX: number, toY: number,
    callback: (path: PathPoint[] | null) => void,
  ): number | undefined;
  cancelPath(instanceId: number): void;
  setDoorCost(x: number, y: number, cost: number): void;
  removeDoorCost(x: number, y: number): void;
}

function createEasyStar(): EasyStar.js {
  const star = new EasyStar.js();
  star.enableDiagonals();
  star.disableCornerCutting();
  star.setIterationsPerCalculation(SEEKER.PATHFINDING_ITERATIONS);
  return star;
}

function initGrid(star: EasyStar.js, collision: Uint8Array, width: number, height: number): void {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(collision[y * width + x] ?? 0);
    }
    grid.push(row);
  }
  star.setGrid(grid);
  star.setAcceptableTiles([0]); // 0 = walkable
}

function createInstanceHandle(star: EasyStar.js): PathfindingInstance {
  return {
    requestPath(fromX, fromY, toX, toY, callback) {
      try {
        return star.findPath(fromX, fromY, toX, toY, (path) => {
          callback(path as PathPoint[] | null);
        });
      } catch {
        callback(null);
        return undefined;
      }
    },
    cancelPath(instanceId) {
      star.cancelPath(instanceId);
    },
    setDoorCost(x, y, cost) {
      star.setAdditionalPointCost(x, y, cost);
    },
    removeDoorCost(x, y) {
      star.removeAdditionalPointCost(x, y);
    },
  };
}

export class PathfindingSystem {
  private readonly stars: Map<string, EasyStar.js> = new Map();
  private readonly handles: Map<string, PathfindingInstance> = new Map();

  createInstance(name: string, collision: Uint8Array, width: number, height: number): PathfindingInstance {
    const star = createEasyStar();
    initGrid(star, collision, width, height);
    this.stars.set(name, star);
    const handle = createInstanceHandle(star);
    this.handles.set(name, handle);
    return handle;
  }

  getInstance(name: string): PathfindingInstance {
    const handle = this.handles.get(name);
    if (!handle) throw new Error(`PathfindingSystem: no instance '${name}'`);
    return handle;
  }

  /** Update door cost on ALL instances (centralized — Race 20 fix) */
  setDoorCostAll(x: number, y: number, cost: number): void {
    for (const star of this.stars.values()) {
      star.setAdditionalPointCost(x, y, cost);
    }
  }

  /** Remove door cost on ALL instances (centralized — Race 20 fix) */
  removeDoorCostAll(x: number, y: number): void {
    for (const star of this.stars.values()) {
      star.removeAdditionalPointCost(x, y);
    }
  }

  /** Discard all instances and queued paths (called on engine dispose) */
  disposeAll(): void {
    this.stars.clear();
    this.handles.clear();
  }

  /** Process all instances in one call */
  calculate(): void {
    for (const star of this.stars.values()) {
      star.calculate();
    }
  }
}
