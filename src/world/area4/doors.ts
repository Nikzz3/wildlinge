/** Shared door/arrival tiles of AREA 4, so outdoor doors and interior exit mats always line up. */

/** Outdoor tiles directly below the Frostalp doors (interior mats warp here). */
export const FROSTALP_DOORS = {
  center: { x: 18, y: 6 },
  shop: { x: 17, y: 12 },
  hall: { x: 5, y: 6 },
  /** Gasthaus Edelweiß. */
  house1: { x: 5, y: 13 },
  house2: { x: 17, y: 18 },
} as const;

/** Halle 4: tile above the exit mat. */
export const FROSTALP_HALL_ARRIVAL = { x: 6, y: 14 } as const;
