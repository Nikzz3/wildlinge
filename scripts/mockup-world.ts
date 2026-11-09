/**
 * World-art review: composes sample scenes from tiles + buildings + characters (drawn the way
 * the overworld should: cellFrames per cell) and renders every autotile edge mask.
 * Usage: npx tsx scripts/mockup-world.ts            → all sheets below
 *        npx tsx scripts/mockup-world.ts preview rock cliff:5   → tiles-preview.png (id[:edgeMask], big)
 * Writes out/sheets/mockup-world.png (town, scale 3), mockup-*.png (other areas), tiles-autotile.png
 * (all 16 edge masks per autotiled tile), tiles-grounds.png (every tile on each ground),
 * tiles-anim.png (animation frames), buildings-sizes.png.
 */
import { mkdirSync } from 'node:fs';
import { type Bitmap, blit, createBitmap } from '../src/core/bitmap';
import { DEFAULT_LEGEND, TILE_IDS, type TileId } from '../src/core/tiles-meta';
import { BUILDING_STYLES, type BuildingStyle, type CharSpriteId, type Dir } from '../src/core/types';
import { buildingBitmap } from '../src/art/buildings';
import { charFrame } from '../src/art/characters';
import { AUTOTILED, cellFrames, type TileNeighbours, tileFrames, tileOverlay } from '../src/art/tiles';
import { compositeOver, copyBitmap } from '../src/art/world-palette';
import { writePng } from './lib/png';
import { sheet } from './lib/sheet';

const OUT = 'out/sheets';
mkdirSync(OUT, { recursive: true });

interface Scene {
  name: string;
  base: TileId;
  rows: readonly string[];
  buildings?: readonly { x: number; y: number; w: number; h: number; style: BuildingStyle; dx: number }[];
  chars?: readonly { x: number; y: number; id: CharSpriteId; dir: Dir }[];
}

function tileAt(rows: readonly string[], x: number, y: number): TileId | null {
  const ch = rows[y]?.[x];
  if (ch === undefined) return null;
  const id = DEFAULT_LEGEND[ch];
  if (!id) throw new Error(`Unknown legend char "${ch}"`);
  return id;
}

function neighbours(rows: readonly string[], x: number, y: number): TileNeighbours {
  return { n: tileAt(rows, x, y - 1), e: tileAt(rows, x + 1, y), s: tileAt(rows, x, y + 1), w: tileAt(rows, x - 1, y) };
}

/** Draws a scene the way the overworld should: cellFrames per cell, buildings, characters, grass overlays. */
function render(scene: Scene): Bitmap {
  const h = scene.rows.length;
  const w = scene.rows[0]!.length;
  const out = createBitmap(w * 16, h * 16);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = tileAt(scene.rows, x, y)!;
      blit(out, cellFrames(id, neighbours(scene.rows, x, y), scene.base)[0]!, x * 16, y * 16);
    }
  for (const b of scene.buildings ?? []) blit(out, buildingBitmap(b.style, b.w, b.h, b.dx), b.x * 16, b.y * 16);
  for (const c of scene.chars ?? []) {
    blit(out, charFrame(c.id, c.dir, 0), c.x * 16, c.y * 16 - 4);
    const id = tileAt(scene.rows, c.x, c.y);
    const over = id ? tileOverlay(id) : null;
    if (over) blit(out, over, c.x * 16, c.y * 16);
  }
  return out;
}

/** A tile composited over a ground tile (alpha-blended, so cast shadows show). */
function onGround(ground: TileId, tile: Bitmap): Bitmap {
  const b = copyBitmap(tileFrames(ground)[0]!);
  compositeOver(b, tile);
  return b;
}

const SCENES: Scene[] = [
  {
    name: 'mockup-world',
    base: 'grass',
    rows: [
      'TTTTTTTTTTTTTTT',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.............T',
      'T*:::::::::::*T',
      'T**ff.S:.ffff.T',
      'T~~~~..:..,,,,T',
      'T~~~~*.:.,,,,,T',
      'TT~~..o:..,,,TT',
    ],
    buildings: [
      { x: 1, y: 1, w: 5, h: 4, style: 'heal', dx: 2 },
      { x: 7, y: 1, w: 4, h: 4, style: 'shop', dx: 1 },
      { x: 11, y: 2, w: 3, h: 3, style: 'house_red', dx: 1 },
    ],
    chars: [
      { x: 7, y: 7, id: 'player', dir: 'up' },
      { x: 9, y: 5, id: 'girl', dir: 'left' },
      { x: 11, y: 8, id: 'boy', dir: 'down' },
    ],
  },
  {
    name: 'mockup-town2',
    base: 'grass',
    rows: [
      'TTTTTTTTTTTTTTT',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.:::::::::::.T',
      'T.:.*.....*.:.T',
      'T.:.......f.:.T',
      'TT:TTTTTTTTT:TT',
    ],
    buildings: [
      { x: 1, y: 1, w: 4, h: 5, style: 'house_blue', dx: 2 },
      { x: 5, y: 1, w: 6, h: 5, style: 'lab', dx: 3 },
      { x: 11, y: 2, w: 3, h: 4, style: 'house_green', dx: 1 },
    ],
  },
  {
    name: 'mockup-hall',
    base: 'grass',
    rows: [
      'TTTTTTTTTTTTTTT',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.............T',
      'T.............T',
      'T*...........*T',
      'T**:::::::::**T',
      'TTTTTT:::TTTTTT',
      'TTTTTT:::TTTTTT',
    ],
    buildings: [{ x: 3, y: 1, w: 9, h: 6, style: 'hall', dx: 4 }],
  },
  {
    name: 'mockup-route',
    base: 'grass',
    rows: [
      'TT.....TT..TTTT',
      'MMMMMMMMMMMMMTT',
      'MMMMMMEMMMMMMTT',
      'o.....:.....,,T',
      'vvvvv.:.vvvv,,T',
      '..o...:.....,,T',
      'os~~~~=~~~~sSss',
      'sss~~~=~~~~~sos',
      'TTs...:...f..TT',
      'TTT...:...S..TT',
    ],
    chars: [{ x: 6, y: 5, id: 'hiker', dir: 'down' }, { x: 13, y: 4, id: 'boy', dir: 'left' }],
  },
  {
    name: 'mockup-snow',
    base: 'snow',
    rows: [
      'TTTTTTTTTTTTTTT',
      'Tnnnnnn"""nnniT',
      'Tnin:::"""nnnnT',
      'Tnnn:nn"""nnnnT',
      'Tnnn:nnnnn~~~nT',
      'T..n::::nn~~~nT',
      'T...nnn:nnnnnnT',
      'T.,,.nn:n"""nnT',
      'T.,,..n:n""i.TT',
      'TT....n:nnn..TT',
    ],
    chars: [{ x: 8, y: 2, id: 'player', dir: 'down' }],
  },
  {
    name: 'mockup-cave',
    base: 'cave_floor',
    rows: [
      '###############',
      '###############',
      '##_____####___#',
      '##______##____#',
      '#____o_____o__#',
      '#__________####',
      '###__#####__###',
      '###__#####____#',
      '#_____________#',
      '######E########',
    ],
    chars: [{ x: 6, y: 8, id: 'player', dir: 'up' }],
  },
  {
    name: 'mockup-indoor',
    base: 'floor_tile',
    rows: [
      'wwWwwbbwbbwWwww',
      'qqqqqqqHqqqqqqq',
      'qqqqqcccccqqqPq',
      'qkqqqqqqqqqqqkq',
      'qqqqrrrrrrqqqqq',
      'qqqqrrrrrrqqqqq',
      'qqqqrrrrrrqqqqq',
      'qtttqqqqqqqqqqq',
      'qtttqqqqqqqqqqk',
      'xxxxxxxdxxxxxxx',
    ],
    chars: [{ x: 6, y: 1, id: 'nurse', dir: 'down' }, { x: 7, y: 7, id: 'player', dir: 'up' }],
  },
  {
    name: 'mockup-house',
    base: 'floor_wood',
    rows: [
      'wwwwwwwwwwwwwww',
      'wWwwbbwwwWwwwuw',
      'pBpppppppppkppp',
      'ppppppppppppppp',
      'ppppptttpppLLpp',
      'pppppttttppppPp',
      'pphpppprrrrpppF',
      'ppppppprrrrpppp',
      'ppppppDppdppppp',
      'xxxxxxxxxxxxxxx',
    ],
  },
  {
    name: 'mockup-hallfloor',
    base: 'hall_floor',
    rows: [
      'wwwwwwFwwwwwwww',
      'ggggggggggggggg',
      'ghggggggggggghg',
      'ggggggrrrgggggg',
      'ggggggrrrgggggg',
      'ghggggrrrggggkg',
      'ggggggrrrgggggg',
      'ggggggrrrgggggg',
      'ggggggrrrgggggg',
      'xxxxxxxdxxxxxxx',
    ],
  },
];

// preview mode: just the given tiles, big, on each ground plus a 3×3 repeat to check seams
if (process.argv[2] === 'preview') {
  const specs = process.argv.slice(3).map((a) => a.split(':') as [TileId, string?]);
  const grounds: readonly TileId[] = ['grass', 'snow', 'sand', 'floor_tile'];
  const items = specs.flatMap(([id, m]) => grounds.map((g) => onGround(g, tileFrames(id, Number(m ?? 0))[0]!)));
  const tiled = specs.map(([id, m]) => {
    const b = createBitmap(48, 48);
    for (let i = 0; i < 9; i++) blit(b, onGround('grass', tileFrames(id, Number(m ?? 0))[0]!), (i % 3) * 16, Math.floor(i / 3) * 16);
    return b;
  });
  writePng(`${OUT}/tiles-preview.png`, sheet([...items, ...tiled], grounds.length, 2), 6);
  console.log(`${OUT}/tiles-preview.png`);
  process.exit(0);
}

const written: string[] = [];
for (const s of SCENES) {
  writePng(`${OUT}/${s.name}.png`, render(s), 3);
  written.push(`${OUT}/${s.name}.png`);
}

// Animation strip of the town (all water/flower/flame frames side by side for comparison)
const animFrames = (['water', 'flowers', 'flame', 'tallgrass', 'snow_grass'] as const).flatMap((id) =>
  tileFrames(id).map((fr) => onGround(id === 'snow_grass' ? 'snow' : 'grass', fr)),
);
writePng(`${OUT}/tiles-anim.png`, sheet(animFrames, 8, 2), 5);
written.push(`${OUT}/tiles-anim.png`);

// Every building style at several footprints (w 3–9, h 3–6), on grass.
const sizes: readonly [number, number, number][] = [[3, 3, 1], [4, 4, 0], [5, 4, 2], [7, 5, 3], [9, 6, 6]];
const buildings = BUILDING_STYLES.flatMap((style) =>
  sizes.map(([w, h, dx]) => {
    const b = createBitmap(w * 16, h * 16);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) blit(b, tileFrames('grass')[0]!, x * 16, y * 16);
    blit(b, buildingBitmap(style, w, h, dx), 0, 0);
    return b;
  }),
);
writePng(`${OUT}/buildings-sizes.png`, sheet(buildings, sizes.length, 4), 2);
written.push(`${OUT}/buildings-sizes.png`);

// All 16 edge masks for every autotiled tile, on a fitting ground.
const INDOOR_AUTO: ReadonlySet<TileId> = new Set<TileId>(['carpet', 'table', 'counter', 'wall', 'wall_window', 'door']);
const masks = Array.from({ length: 16 }, (_, i) => i);
const auto = [...AUTOTILED].flatMap((id) =>
  masks.map((m) => onGround(INDOOR_AUTO.has(id) ? 'floor_wood' : id === 'cave_wall' ? 'cave_floor' : 'grass', tileFrames(id, m)[0]!)),
);
writePng(`${OUT}/tiles-autotile.png`, sheet(auto, 16, 2), 4);
written.push(`${OUT}/tiles-autotile.png`);

// Every tile on grass, snow, sand and floor (first frame), to judge props and cast shadows on each ground.
const grounds: readonly TileId[] = ['grass', 'snow', 'sand', 'cave_floor', 'floor_tile'];
const props = grounds.flatMap((g) => TILE_IDS.map((id) => onGround(g, tileFrames(id)[0]!)));
writePng(`${OUT}/tiles-grounds.png`, sheet(props, TILE_IDS.length, 2), 3);
written.push(`${OUT}/tiles-grounds.png`);
console.log(written.join('\n'));
