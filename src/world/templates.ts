/**
 * Standard interiors for area builders. Each template returns a complete indoor MapDef whose door mat
 * (bottom row) warps back to `exit` (the outdoor tile below the building door, player facing down).
 *
 * Wire the outdoor door to the interior's arrival tile (the tile above the mat):
 *   door: { dx, to: 'kiesel_center', tx: HEAL_CENTER_ARRIVAL.x, ty: HEAL_CENTER_ARRIVAL.y }
 *
 * | template         | interior size | mat    | arrival (door target) |
 * |------------------|---------------|--------|-----------------------|
 * | makeHealCenter   | 11 × 9        | (5, 8) | (5, 7)                |
 * | makeShop         | 10 × 9        | (5, 8) | (5, 7)                |
 * | makeHouse        | 10 × 8        | (4, 7) | (4, 6)                |
 *
 * `name` is the display name used for "met at" (use the town name, e.g. "Kieselstadt").
 * Preview them with: npx tsx scripts/render-map.ts dev_center dev_shop dev_house
 */
import type { MapDef, NpcDef } from '../core/contracts';
import type { MusicId } from '../core/types';

export interface InteriorExit {
  /** Outdoor map id. */
  map: string;
  /** Outdoor landing tile, normally directly below the building door. */
  x: number;
  y: number;
}

export const HEAL_CENTER_ARRIVAL = { x: 5, y: 7 } as const;
export const SHOP_ARRIVAL = { x: 5, y: 7 } as const;
export const HOUSE_ARRIVAL = { x: 4, y: 6 } as const;

function matWarp(mat: { x: number; y: number }, exit: InteriorExit) {
  return { x: mat.x, y: mat.y, to: exit.map, tx: exit.x, ty: exit.y, facing: 'down' as const };
}

/**
 * Heilstation: nurse behind the counter (talk from (5, 3) facing up) heals and sets the respawn point,
 * PC at (9, 2) (use from (9, 3) facing up). Row 2 (plants, counter, PC, plant) is closed wall to wall,
 * so the player can never get behind the counter.
 */
export function makeHealCenter(opts: { id: string; name: string; exit: InteriorExit }): MapDef {
  return {
    id: opts.id,
    name: opts.name,
    kind: 'indoor',
    music: 'center',
    battleBg: 'indoor',
    border: 'void',
    baseTile: 'floor_tile',
    isHealCenter: true,
    tiles: [
      'wWwwbbbwwWw',
      'qqqqqqHqqqq',
      'kkcccccccPk',
      'qqqqqqqqqqq',
      'qqqqrrrqqqq',
      'kqqqrrrqqqk',
      'qqqqrrrqqqq',
      'qqqqrrrqqqq',
      'xxxxxdxxxxx',
    ],
    warps: [matWarp({ x: 5, y: 8 }, opts.exit)],
    npcs: [
      {
        id: 'nurse',
        x: 5,
        y: 1,
        facing: 'down',
        sprite: 'nurse',
        onTalk: async (ctx) => {
          const yes = await ctx.confirm('Willkommen in der Heilstation!\fMöchtest du deine Wildlinge heilen lassen?');
          if (!yes) {
            await ctx.say('Komm jederzeit wieder vorbei!');
            return;
          }
          await ctx.say('Gut, ich kümmere mich kurz um deine Wildlinge.');
          await ctx.heal();
          await ctx.say('Deine Wildlinge sind wieder topfit!\fKomm jederzeit wieder vorbei!');
        },
      },
    ],
  };
}

/** Laden: clerk behind the counter (talk from (1, 3) facing up) opens the shop with `shopItems`. */
export function makeShop(opts: { id: string; name: string; shopItems: readonly string[]; exit: InteriorExit; music?: MusicId }): MapDef {
  const items = [...opts.shopItems];
  return {
    id: opts.id,
    name: opts.name,
    kind: 'indoor',
    music: opts.music ?? 'center',
    battleBg: 'indoor',
    border: 'void',
    baseTile: 'floor_tile',
    tiles: [
      'wWwbbbbwWw',
      'qqqqkqqqqk',
      'ccccqqqqqq',
      'qqqqqqqqqq',
      'qqqqqqttqq',
      'kqqqqqttqq',
      'qqqqqqqqqk',
      'qqqqqqqqqq',
      'xxxxxdxxxx',
    ],
    warps: [matWarp({ x: 5, y: 8 }, opts.exit)],
    npcs: [
      {
        id: 'clerk',
        x: 1,
        y: 1,
        facing: 'down',
        sprite: 'clerk',
        onTalk: async (ctx) => {
          await ctx.say('Willkommen im Laden! Schau dich ruhig um.');
          await ctx.shop(items);
        },
      },
    ],
  };
}

const HOUSE_LAYOUTS: readonly (readonly string[])[] = [
  // 0: bed top-left, table in the middle, rug by the door
  [
    'wWwwbbwwWw',
    'Bppppppkpp',
    'pppptttppp',
    'pppptttppp',
    'pppppppppp',
    'kpprrrrppp',
    'ppprrrrppk',
    'xxxxdxxxxx',
  ],
  // 1: shelves, table left, bed right
  [
    'wWwbbwwbbw',
    'ppppppppBp',
    'pttppppppp',
    'pttppppkpp',
    'pppprrpppp',
    'kppprrpppp',
    'pppprrpppk',
    'xxxxdxxxxx',
  ],
  // 2: tiled kitchen corner, bed top-right
  [
    'wWwwbbwwWw',
    'qqqqpppppB',
    'qtqqpppppp',
    'qqqqppkppp',
    'pppppppppp',
    'kppprrpppk',
    'pppprrpppp',
    'xxxxdxxxxx',
  ],
];

/**
 * Small furnished house (10 × 8). `variant` 0–2 picks the furniture. Free floor tiles for NPCs:
 * (2, 4), (7, 4), (8, 5) and (1, 6) are floor in every variant (keep column 4 free for the door path).
 */
export function makeHouse(opts: {
  id: string;
  name: string;
  exit: InteriorExit;
  npcs?: readonly NpcDef[];
  variant?: number;
  music?: MusicId;
}): MapDef {
  const layout = HOUSE_LAYOUTS[Math.abs(opts.variant ?? 0) % HOUSE_LAYOUTS.length]!;
  return {
    id: opts.id,
    name: opts.name,
    kind: 'indoor',
    music: opts.music ?? 'home',
    battleBg: 'indoor',
    border: 'void',
    baseTile: 'floor_wood',
    tiles: layout,
    warps: [matWarp({ x: 4, y: 7 }, opts.exit)],
    npcs: opts.npcs ? [...opts.npcs] : [],
  };
}
