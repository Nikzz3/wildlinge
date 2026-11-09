/** Shared door/arrival tiles of AREA 1, so outdoor doors and interior exit mats always line up. */

/** Outdoor tiles directly below the Moosbach doors (interior mats warp here). */
export const MOOSBACH_DOORS = {
  playerHouse: { x: 4, y: 6 },
  rivalHouse: { x: 15, y: 6 },
  lab: { x: 6, y: 12 },
} as const;

/** Outdoor tiles directly below the Kieselstadt doors. */
export const KIESEL_DOORS = {
  center: { x: 4, y: 12 },
  shop: { x: 18, y: 8 },
  hall: { x: 11, y: 6 },
  house1: { x: 17, y: 18 },
  house2: { x: 5, y: 18 },
} as const;

/** Custom interiors: tile above the exit mat. */
export const LAB_ARRIVAL = { x: 6, y: 8 } as const;
export const HALL_ARRIVAL = { x: 5, y: 12 } as const;

/** New-game spawn: the player's room, next to the bed. */
export const PLAYER_ROOM = { mapId: 'player_house', x: 1, y: 1, facing: 'down' } as const;
