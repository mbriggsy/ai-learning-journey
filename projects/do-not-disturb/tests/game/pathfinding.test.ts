import { describe, it, expect } from 'vitest';
import { createPathfindingSystem } from '../../src/game/pathfinding';
import type { NavGraph, NavNode, NavEdge } from '../../src/types/state';

function makeGraph(
  nodes: NavNode[],
  edges: NavEdge[],
): NavGraph {
  const nodeMap = new Map<string, NavNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const edgeMap = new Map<string, NavEdge[]>();
  for (const e of edges) {
    const list = edgeMap.get(e.from) ?? [];
    list.push(e);
    edgeMap.set(e.from, list);
  }

  return { nodes: nodeMap, edges: edgeMap };
}

function makeSingleFloorGraph(): NavGraph {
  // A --10-- B --10-- C
  const nodes: NavNode[] = [
    { id: 'A', position: { x: 0, y: 0 }, floor: 1, type: 'waypoint' },
    { id: 'B', position: { x: 100, y: 0 }, floor: 1, type: 'waypoint' },
    { id: 'C', position: { x: 200, y: 0 }, floor: 1, type: 'waypoint' },
  ];
  const edges: NavEdge[] = [
    { from: 'A', to: 'B', cost: 10 },
    { from: 'B', to: 'A', cost: 10 },
    { from: 'B', to: 'C', cost: 10 },
    { from: 'C', to: 'B', cost: 10 },
  ];
  return makeGraph(nodes, edges);
}

function makeMultiFloorGraph(): NavGraph {
  // Floor 1: F1A --10-- F1B(stair-bottom)
  // Floor 2: F2A(stair-top) --10-- F2B
  // Stairs: F1B --50-- F2A
  const nodes: NavNode[] = [
    { id: 'F1A', position: { x: 0, y: 0 }, floor: 1, type: 'waypoint' },
    { id: 'F1B', position: { x: 100, y: 0 }, floor: 1, type: 'stair-bottom' },
    { id: 'F2A', position: { x: 100, y: -200 }, floor: 2, type: 'stair-top' },
    { id: 'F2B', position: { x: 200, y: -200 }, floor: 2, type: 'waypoint' },
  ];
  const edges: NavEdge[] = [
    { from: 'F1A', to: 'F1B', cost: 10 },
    { from: 'F1B', to: 'F1A', cost: 10 },
    { from: 'F1B', to: 'F2A', cost: 50 }, // stairs
    { from: 'F2A', to: 'F1B', cost: 50 },
    { from: 'F2A', to: 'F2B', cost: 10 },
    { from: 'F2B', to: 'F2A', cost: 10 },
  ];
  return makeGraph(nodes, edges);
}

function makeElevatorGraph(): NavGraph {
  // Floor 1: F1A --10-- F1E(elevator)
  // Floor 2: F2A --10-- F2E(elevator)
  // Elevator: F1E --30-- F2E (faster than stairs)
  // Also stairs: F1A --10-- F1S(stair) --80-- F2S(stair) --10-- F2A
  const nodes: NavNode[] = [
    { id: 'F1A', position: { x: 0, y: 0 }, floor: 1, type: 'waypoint' },
    { id: 'F1E', position: { x: 50, y: 0 }, floor: 1, type: 'elevator-stop' },
    { id: 'F1S', position: { x: 150, y: 0 }, floor: 1, type: 'stair-bottom' },
    { id: 'F2A', position: { x: 0, y: -200 }, floor: 2, type: 'waypoint' },
    { id: 'F2E', position: { x: 50, y: -200 }, floor: 2, type: 'elevator-stop' },
    { id: 'F2S', position: { x: 150, y: -200 }, floor: 2, type: 'stair-top' },
  ];
  const edges: NavEdge[] = [
    { from: 'F1A', to: 'F1E', cost: 10 },
    { from: 'F1E', to: 'F1A', cost: 10 },
    { from: 'F1A', to: 'F1S', cost: 10 },
    { from: 'F1S', to: 'F1A', cost: 10 },
    { from: 'F1E', to: 'F2E', cost: 30 }, // elevator
    { from: 'F2E', to: 'F1E', cost: 30 },
    { from: 'F1S', to: 'F2S', cost: 80 }, // stairs (slower)
    { from: 'F2S', to: 'F1S', cost: 80 },
    { from: 'F2E', to: 'F2A', cost: 10 },
    { from: 'F2A', to: 'F2E', cost: 10 },
    { from: 'F2S', to: 'F2A', cost: 10 },
    { from: 'F2A', to: 'F2S', cost: 10 },
  ];
  return makeGraph(nodes, edges);
}

describe('createPathfindingSystem', () => {
  it('finds shortest path on a single floor', () => {
    const pf = createPathfindingSystem(makeSingleFloorGraph());
    const result = pf.findPath('A', 'C');
    expect(result).not.toBeNull();
    expect(result!.path.map(n => n.id)).toEqual(['A', 'B', 'C']);
    expect(result!.totalCost).toBe(20);
  });

  it('finds path across floors via stairs', () => {
    const pf = createPathfindingSystem(makeMultiFloorGraph());
    const result = pf.findPath('F1A', 'F2B');
    expect(result).not.toBeNull();
    expect(result!.path.map(n => n.id)).toEqual(['F1A', 'F1B', 'F2A', 'F2B']);
    expect(result!.totalCost).toBe(70);
  });

  it('prefers elevator over stairs when cheaper', () => {
    const pf = createPathfindingSystem(makeElevatorGraph());
    const result = pf.findPath('F1A', 'F2A');
    expect(result).not.toBeNull();
    // Elevator route: F1A → F1E → F2E → F2A = 10 + 30 + 10 = 50
    // Stair route: F1A → F1S → F2S → F2A = 10 + 80 + 10 = 100
    expect(result!.totalCost).toBe(50);
    expect(result!.path.map(n => n.id)).toContain('F1E');
  });

  it('returns null for unreachable node', () => {
    const graph = makeGraph(
      [
        { id: 'A', position: { x: 0, y: 0 }, floor: 1, type: 'waypoint' },
        { id: 'B', position: { x: 100, y: 0 }, floor: 1, type: 'waypoint' },
      ],
      [], // no edges
    );
    const pf = createPathfindingSystem(graph);
    expect(pf.findPath('A', 'B')).toBeNull();
  });

  it('returns null for non-existent node', () => {
    const pf = createPathfindingSystem(makeSingleFloorGraph());
    expect(pf.findPath('A', 'Z')).toBeNull();
  });

  it('path from node to itself returns single-node path with zero cost', () => {
    const pf = createPathfindingSystem(makeSingleFloorGraph());
    const result = pf.findPath('A', 'A');
    expect(result).not.toBeNull();
    expect(result!.path).toHaveLength(1);
    expect(result!.totalCost).toBe(0);
  });

  it('updateEdgeCost changes path selection', () => {
    const pf = createPathfindingSystem(makeElevatorGraph());

    // Initially prefers elevator (cost 30)
    let result = pf.findPath('F1A', 'F2A');
    expect(result!.path.map(n => n.id)).toContain('F1E');

    // Make elevator very expensive
    pf.updateEdgeCost('F1E', 'F2E', 500);
    pf.updateEdgeCost('F2E', 'F1E', 500);

    // Now should prefer stairs
    result = pf.findPath('F1A', 'F2A');
    expect(result!.path.map(n => n.id)).toContain('F1S');
  });
});
