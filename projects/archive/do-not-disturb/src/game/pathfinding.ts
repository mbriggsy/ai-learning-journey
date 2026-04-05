import type { NavGraph, NavNode, NavEdge, Position } from '../types/state';

export type PathResult = {
  readonly path: readonly NavNode[];
  readonly totalCost: number;
} | null;

export type PathfindingSystem = {
  findPath(fromId: string, toId: string): PathResult;
  updateEdgeCost(fromId: string, toId: string, cost: number): void;
};

export function createPathfindingSystem(graph: NavGraph): PathfindingSystem {
  // Mutable copy of edges for dynamic cost updates
  const mutableEdges = new Map<string, NavEdge[]>();
  for (const [nodeId, edges] of graph.edges) {
    mutableEdges.set(nodeId, edges.map(e => ({ ...e })));
  }

  function heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  return {
    findPath(fromId: string, toId: string): PathResult {
      const startNode = graph.nodes.get(fromId);
      const endNode = graph.nodes.get(toId);
      if (!startNode || !endNode) return null;
      if (fromId === toId) return { path: [startNode], totalCost: 0 };

      const openSet = new Set<string>([fromId]);
      const cameFrom = new Map<string, string>();
      const gScore = new Map<string, number>();
      const fScore = new Map<string, number>();

      gScore.set(fromId, 0);
      fScore.set(fromId, heuristic(startNode.position, endNode.position));

      while (openSet.size > 0) {
        // Find node in openSet with lowest fScore
        let currentId = '';
        let lowestF = Infinity;
        for (const id of openSet) {
          const f = fScore.get(id) ?? Infinity;
          if (f < lowestF) {
            lowestF = f;
            currentId = id;
          }
        }

        if (currentId === toId) {
          // Reconstruct path
          const path: NavNode[] = [];
          let traceId: string | undefined = currentId;
          while (traceId !== undefined) {
            const node = graph.nodes.get(traceId);
            if (node) path.unshift(node);
            traceId = cameFrom.get(traceId);
          }
          return { path, totalCost: gScore.get(toId) ?? 0 };
        }

        openSet.delete(currentId);
        const edges = mutableEdges.get(currentId) ?? [];

        for (const edge of edges) {
          const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.cost;
          const existingG = gScore.get(edge.to) ?? Infinity;

          if (tentativeG < existingG) {
            cameFrom.set(edge.to, currentId);
            gScore.set(edge.to, tentativeG);
            const neighbor = graph.nodes.get(edge.to);
            fScore.set(
              edge.to,
              tentativeG + (neighbor ? heuristic(neighbor.position, endNode.position) : 0),
            );
            openSet.add(edge.to);
          }
        }
      }

      return null; // no path found
    },

    updateEdgeCost(fromId: string, toId: string, cost: number) {
      const edges = mutableEdges.get(fromId);
      if (edges) {
        const edge = edges.find(e => e.to === toId);
        if (edge) {
          (edge as { cost: number }).cost = cost;
        }
      }
    },
  };
}
