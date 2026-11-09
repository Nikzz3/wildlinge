/** Tile ids, gameplay metadata and the default map legend. Art lives in src/art/tiles.ts. */

export const TILE_IDS = [
  // outdoor
  'grass', 'tallgrass', 'path', 'flowers', 'tree', 'water', 'bridge', 'sand', 'fence', 'rock', 'ledge', 'cliff',
  'sign', 'snow', 'snow_grass', 'ice_rock',
  // cave
  'cave_wall', 'cave_floor', 'cave_entrance',
  // indoor
  'wall', 'wall_window', 'shelf', 'floor_wood', 'floor_tile', 'carpet', 'mat', 'table', 'counter',
  'heal_machine', 'pc', 'bed', 'plant', 'stairs', 'void', 'hall_floor', 'statue', 'lab_machine', 'door',
  // special
  'flame',
] as const;
export type TileId = (typeof TILE_IDS)[number];

export interface TileMeta {
  /** Blocks movement. */
  solid: boolean;
  /** Stepping here may trigger a wild encounter from the map's table of that kind. */
  encounter?: 'grass' | 'cave';
  /** One-way ledge: can only be crossed moving down (player jumps 2 tiles). */
  ledge?: boolean;
  /** NPCs behind this tile can be talked to across it (shop / heal counters). */
  counter?: boolean;
  /** Characters standing here have their lower half covered by the tile overlay (tall grass). */
  tall?: boolean;
}

export const TILE_META: Record<TileId, TileMeta> = {
  grass: { solid: false },
  tallgrass: { solid: false, encounter: 'grass', tall: true },
  path: { solid: false },
  flowers: { solid: false },
  tree: { solid: true },
  water: { solid: true },
  bridge: { solid: false },
  sand: { solid: false },
  fence: { solid: true },
  rock: { solid: true },
  ledge: { solid: true, ledge: true },
  cliff: { solid: true },
  sign: { solid: true },
  snow: { solid: false },
  snow_grass: { solid: false, encounter: 'grass', tall: true },
  ice_rock: { solid: true },
  cave_wall: { solid: true },
  cave_floor: { solid: false, encounter: 'cave' },
  cave_entrance: { solid: false },
  wall: { solid: true },
  wall_window: { solid: true },
  shelf: { solid: true },
  floor_wood: { solid: false },
  floor_tile: { solid: false },
  carpet: { solid: false },
  mat: { solid: false },
  table: { solid: true },
  counter: { solid: true, counter: true },
  heal_machine: { solid: true },
  pc: { solid: true },
  bed: { solid: true },
  plant: { solid: true },
  stairs: { solid: false },
  void: { solid: true },
  hall_floor: { solid: false },
  statue: { solid: true },
  lab_machine: { solid: true },
  door: { solid: false },
  flame: { solid: true },
};

/** Default character → tile mapping for MapDef.tiles. Maps may extend/override via MapDef.legend. */
export const DEFAULT_LEGEND: Record<string, TileId> = {
  '.': 'grass',
  ',': 'tallgrass',
  ':': 'path',
  '*': 'flowers',
  T: 'tree',
  '~': 'water',
  '=': 'bridge',
  s: 'sand',
  f: 'fence',
  o: 'rock',
  v: 'ledge',
  M: 'cliff',
  S: 'sign',
  n: 'snow',
  '"': 'snow_grass',
  i: 'ice_rock',
  '#': 'cave_wall',
  _: 'cave_floor',
  E: 'cave_entrance',
  w: 'wall',
  W: 'wall_window',
  b: 'shelf',
  p: 'floor_wood',
  q: 'floor_tile',
  r: 'carpet',
  d: 'mat',
  t: 'table',
  c: 'counter',
  H: 'heal_machine',
  P: 'pc',
  B: 'bed',
  k: 'plant',
  u: 'stairs',
  x: 'void',
  g: 'hall_floor',
  h: 'statue',
  L: 'lab_machine',
  D: 'door',
  F: 'flame',
};
