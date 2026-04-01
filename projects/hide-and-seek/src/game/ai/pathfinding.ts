import EasyStar from 'easystarjs';
import type { PathPoint } from '../../types/ai.js';
import { SEEKER } from '../../constants.js';

export class PathfindingSystem {
  private star: EasyStar.js;

  constructor() {
    this.star = new EasyStar.js();
    this.star.enableDiagonals();
    this.star.disableCornerCutting();
    this.star.setIterationsPerCalculation(SEEKER.PATHFINDING_ITERATIONS);
  }

  initGrid(collision: Uint8Array, width: number, height: number): void {
    // EasyStar wants [y][x] grid
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push(collision[y * width + x] ?? 0);
      }
      grid.push(row);
    }
    this.star.setGrid(grid);
    this.star.setAcceptableTiles([0]); // 0 = walkable
  }

  requestPath(
    fromX: number, fromY: number,
    toX: number, toY: number,
    callback: (path: PathPoint[] | null) => void,
  ): number | undefined {
    try {
      return this.star.findPath(fromX, fromY, toX, toY, (path) => {
        callback(path as PathPoint[] | null); // EasyStar types omit null
      });
    } catch {
      callback(null); // Out of bounds, no grid, etc.
      return undefined;
    }
  }

  cancelPath(instanceId: number): void {
    this.star.cancelPath(instanceId);
  }

  setDoorCost(x: number, y: number, cost: number): void {
    this.star.setAdditionalPointCost(x, y, cost);
  }

  removeDoorCost(x: number, y: number): void {
    this.star.removeAdditionalPointCost(x, y);
  }

  cancelAll(): void {
    // Replace the EasyStar instance to discard all queued paths
    this.star = new EasyStar.js();
    this.star.enableDiagonals();
    this.star.disableCornerCutting();
    this.star.setIterationsPerCalculation(SEEKER.PATHFINDING_ITERATIONS);
  }

  calculate(): void {
    this.star.calculate();
  }
}
