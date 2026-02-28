/**
 * 2D Vector Math Module
 *
 * Pure functions operating on the Vec2 interface. No classes, no mutation.
 * Every function returns a new Vec2 (or scalar). These are the building
 * blocks for all engine math: physics, collision, spline evaluation, etc.
 */

import type { Vec2 } from './types';

// Re-export Vec2 type for convenience
export type { Vec2 } from './types';

/** Create a new Vec2 from x and y components. */
export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

/** Vector addition: a + b. */
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Vector subtraction: a - b. */
export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scalar multiplication: v * s. */
export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

/** Dot product of two vectors. */
export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** 2D cross product (returns the z-component of the 3D cross product). */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

/** Magnitude (length) of a vector. */
export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Squared magnitude -- avoids sqrt when only comparing distances. */
export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

/** Unit vector in the same direction. Returns {0,0} if length < 1e-10. */
export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Rotate a vector by an angle in radians. */
export function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/** Euclidean distance between two points. */
export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance between two points. */
export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Linear interpolation between two vectors: a + (b - a) * t. */
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Interpolate between two angles handling wrapping around -PI to PI.
 * Takes the shortest angular path between a and b.
 */
export function lerpAngle(a: number, b: number, t: number): number {
  // Compute shortest angular difference
  let diff = b - a;
  // Wrap diff to [-PI, PI]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

/** Perpendicular vector, clockwise: {x: v.y, y: -v.x}. */
export function perpCW(v: Vec2): Vec2 {
  return { x: v.y, y: -v.x };
}

/** Perpendicular vector, counter-clockwise: {x: -v.y, y: v.x}. */
export function perpCCW(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/** Negate both components: {x: -v.x, y: -v.y}. */
export function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

/** Unit vector from an angle in radians. 0 = +x, PI/2 = +y. */
export function fromAngle(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}
