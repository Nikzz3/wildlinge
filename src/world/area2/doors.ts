/** Shared door/arrival tiles of AREA 2, so outdoor doors and interior exit mats always line up. */

/** Outdoor tiles directly below the Seewil doors (interior mats warp here). */
export const SEEWIL_DOORS = {
  center: { x: 3, y: 5 },
  shop: { x: 8, y: 5 },
  hall: { x: 22, y: 6 },
  house1: { x: 3, y: 12 },
  house2: { x: 8, y: 12 },
} as const;

/** Halle 2: tile above the exit mat. */
export const SEEWIL_HALL_ARRIVAL = { x: 6, y: 14 } as const;
