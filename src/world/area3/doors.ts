/**
 * Shared door, arrival and cave-mouth tiles of AREA 3, so outdoor doors, interior exit mats and the cave warps
 * always line up (docs/WORLD.md §5: arriving at a cave mouth puts the player on the tile in front of it, facing away).
 */

/** Outdoor tiles directly below the Funkenstadt doors (interior mats warp here). */
export const FUNKEN_DOORS = {
  center: { x: 6, y: 16 },
  shop: { x: 11, y: 16 },
  hall: { x: 5, y: 8 },
  werk: { x: 22, y: 8 },
  house1: { x: 21, y: 16 },
} as const;

/** Custom interiors: tile above the exit mat. */
export const FUNKEN_HALL_ARRIVAL = { x: 6, y: 14 } as const;
export const FUNKEN_WERK_ARRIVAL = { x: 6, y: 8 } as const;

/** cave_entrance tiles. `front` is the walkable side the player arrives on (and walks out from). */
export const MOUTHS = {
  /** Pfad 3, top cliff row; the cave lies to the north. */
  pfad3: { x: 10, y: 1, front: 'down' },
  /** Glimmerhöhle 1, bottom row (back to Pfad 3). */
  g1Entrance: { x: 6, y: 23, front: 'up' },
  /** Glimmerhöhle 1, north wall (on to Glimmerhöhle 2). */
  g1Passage: { x: 21, y: 1, front: 'down' },
  /** Glimmerhöhle 2, bottom row (back to Glimmerhöhle 1). */
  g2Passage: { x: 4, y: 23, front: 'up' },
  /** Glimmerhöhle 2, north wall (out to Funkenstadt). */
  g2Exit: { x: 17, y: 1, front: 'down' },
  /** Funkenstadt, the cliffs in the south-west; the cave lies to the south. */
  funken: { x: 4, y: 21, front: 'up' },
} as const;

type Mouth = (typeof MOUTHS)[keyof typeof MOUTHS];

/** The tile in front of a cave mouth. */
export function frontOf(m: Mouth): { x: number; y: number } {
  return { x: m.x, y: m.front === 'down' ? m.y + 1 : m.y - 1 };
}

/** Warp on mouth `from` to the front of mouth `to`, facing away from it (into the new map). */
export function caveWarp(from: Mouth, toMap: string, to: Mouth) {
  const land = frontOf(to);
  return { x: from.x, y: from.y, to: toMap, tx: land.x, ty: land.y, facing: to.front };
}
