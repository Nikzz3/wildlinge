/** Pure overworld rules: directions, script paths, encounter rolls, trainer sight, connection landings. */
import type { EncounterTable, MapConnection } from '../core/contracts';
import type { Rng } from '../core/rng';
import type { Dir } from '../core/types';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];

export const DIR_DELTA: Readonly<Record<Dir, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const PATH_CHARS: Readonly<Record<string, Dir>> = { U: 'up', D: 'down', L: 'left', R: 'right' };

/** 'UULD' → ['up','up','left','down'] (case-insensitive; spaces ignored). Throws on other characters. */
export function parsePath(path: string): Dir[] {
  return [...path.toUpperCase()]
    .filter((c) => c !== ' ')
    .map((c) => {
      const d = PATH_CHARS[c];
      if (!d) throw new Error(`Invalid path character "${c}" in "${path}" (use U/D/L/R)`);
      return d;
    });
}

/** Direction from a tile to an orthogonally aligned other tile, else null. */
export function dirTowards(fromX: number, fromY: number, toX: number, toY: number): Dir | null {
  if (fromX === toX && toY !== fromY) return toY < fromY ? 'up' : 'down';
  if (fromY === toY && toX !== fromX) return toX < fromX ? 'left' : 'right';
  return null;
}

export interface WildPick {
  species: string;
  level: number;
}

/**
 * One step on an encounter tile: rolls the table's rate, a weighted slot and a level.
 * `repelLevel` (first party member's level while a repel is active) skips weaker creatures.
 */
export function rollEncounter(table: EncounterTable, rng: Rng, repelLevel: number | null): WildPick | null {
  if (table.slots.length === 0 || !rng.chance(table.rate)) return null;
  const slot = rng.weighted(table.slots, (s) => s.weight);
  const level = rng.int(slot.minLevel, slot.maxLevel);
  if (repelLevel !== null && level < repelLevel) return null;
  return { species: slot.species, level };
}

/**
 * Distance (1..sight) at which a viewer facing `facing` sees `target` in a straight line,
 * or null. `blocked(x, y)` reports tiles that stop the view (solids, other characters).
 */
export function sightDistance(
  viewer: { x: number; y: number; facing: Dir },
  sight: number,
  target: { x: number; y: number },
  blocked: (x: number, y: number) => boolean,
): number | null {
  const { dx, dy } = DIR_DELTA[viewer.facing];
  for (let d = 1; d <= sight; d++) {
    const x = viewer.x + dx * d;
    const y = viewer.y + dy * d;
    if (x === target.x && y === target.y) return d;
    if (blocked(x, y)) return null;
  }
  return null;
}

/**
 * Moves for a trainer `distance` tiles away from the player (in its facing direction) to end up next
 * to the player: single steps, a 2-tile hop down over a ledge, and a stop in front of a ledge it cannot hop.
 */
export function approachSteps(
  viewer: { x: number; y: number; facing: Dir },
  distance: number,
  isLedge: (x: number, y: number) => boolean,
): { dir: Dir; tiles: 1 | 2 }[] {
  const { dx, dy } = DIR_DELTA[viewer.facing];
  const steps: { dir: Dir; tiles: 1 | 2 }[] = [];
  let d = 1;
  while (d < distance) {
    if (!isLedge(viewer.x + dx * d, viewer.y + dy * d)) {
      steps.push({ dir: viewer.facing, tiles: 1 });
      d += 1;
    } else if (viewer.facing === 'down' && d + 1 < distance) {
      steps.push({ dir: 'down', tiles: 2 });
      d += 2;
    } else break;
  }
  return steps;
}

/** Tile on the neighbour map where a player leaving the current map at (x, y) towards `dir` arrives. */
export function connectionLanding(
  dir: Dir,
  x: number,
  y: number,
  conn: MapConnection,
  target: { w: number; h: number },
): { x: number; y: number } {
  switch (dir) {
    case 'up':
      return { x: x + conn.offset, y: target.h - 1 };
    case 'down':
      return { x: x + conn.offset, y: 0 };
    case 'left':
      return { x: target.w - 1, y: y + conn.offset };
    case 'right':
      return { x: 0, y: y + conn.offset };
  }
}
