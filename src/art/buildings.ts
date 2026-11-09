import type { Bitmap } from '../core/bitmap';
import type { BuildingStyle } from '../core/types';
import { canvas, clearPixel as clear, dot, FLAME, FLOWER, INDOOR, rect, stamp, STONE, WOOD } from './world-palette';

/**
 * Buildings are painted procedurally for any footprint (w 3–9, h 3–6 tiles).
 * Layout: roof on the upper ~55%, wall below with windows, door on the bottom row
 * at column doorDx. Light comes from the top-left; transparent pixels show the base tile.
 */

interface Ramp {
  hi: string;
  light: string;
  base: string;
  mid: string;
  dark: string;
  deep: string;
}

const ROOF_RED: Ramp = { hi: '#f8a890', light: '#f07c64', base: '#d85444', mid: '#c04038', dark: '#9c2c2c', deep: '#681c20' };
const ROOF_BLUE: Ramp = { hi: '#a8ccf8', light: '#7ca8f0', base: '#5484d8', mid: '#446cc0', dark: '#34509c', deep: '#20346c' };
const ROOF_GREEN: Ramp = { hi: '#b4e490', light: '#8cc864', base: '#64a84c', mid: '#508c40', dark: '#3c6c34', deep: '#264824' };
const ROOF_TEAL: Ramp = { hi: '#a8f0e4', light: '#70d4c8', base: '#44b4a8', mid: '#389c94', dark: '#2a7c76', deep: '#1c5450' };
const ROOF_SLATE: Ramp = { hi: '#c4cce4', light: '#98a4c8', base: '#7484b0', mid: '#62709c', dark: '#4c587c', deep: '#323a58' };
const ROOF_HALL: Ramp = { hi: '#b8a8d8', light: '#9080bc', base: '#6c5c9c', mid: '#5c4c88', dark: '#463a6c', deep: '#2c2448' };
const FLAT_ROOF: Ramp = { hi: '#f4f6fa', light: '#dfe2ea', base: '#cdd1dc', mid: '#b4b9c8', dark: '#9095a8', deep: '#5c6070' };

interface WallPal {
  hi: string;
  base: string;
  mid: string;
  dark: string;
  outline: string;
}

const PLASTER: WallPal = { hi: '#fffcf0', base: '#f6eed8', mid: '#e6dabc', dark: '#cbbb98', outline: '#8c7a5c' };
const PLASTER_COOL: WallPal = { hi: '#ffffff', base: '#f2f0ea', mid: '#dfddd6', dark: '#c2c0b8', outline: '#7c7c84' };
const TIMBER: WallPal = { hi: WOOD.hi, base: WOOD.light, mid: WOOD.base, dark: WOOD.mid, outline: WOOD.deep };
const HEAL_WALL: WallPal = { hi: '#ffffff', base: '#f8fafa', mid: '#e2ecec', dark: '#c4d6d4', outline: '#5c8884' };
const LAB_WALL: WallPal = { hi: '#ffffff', base: '#f2f3f6', mid: '#e0e2ea', dark: '#c2c6d2', outline: '#727888' };
const HALL_WALL: WallPal = { hi: '#f6f0e2', base: '#e4dac6', mid: '#d0c4ac', dark: '#b4a68c', outline: '#6c604c' };

const GOLD = { light: '#fff0a0', base: '#f0c040', dark: '#c08c20', deep: '#8c5c14' } as const;
const AWNING = { blue: '#4c88e0', blueHi: '#78a8f0', blueDark: '#3466b8', white: '#f4f8ff', whiteDark: '#c4d0e4', shadow: '#5a6478' } as const;

const T = 16;
const cache = new Map<string, Bitmap>();

/** Building bitmap of w×h tiles (w*16 × h*16 px) with its door at column doorDx of the bottom row. */
export function buildingBitmap(style: BuildingStyle, w: number, h: number, doorDx: number): Bitmap {
  const key = `${style}:${w}:${h}:${doorDx}`;
  let b = cache.get(key);
  if (!b) {
    b = paint(style, Math.max(3, w), Math.max(3, h), Math.min(Math.max(0, doorDx), Math.max(3, w) - 1));
    cache.set(key, b);
  }
  return b;
}

function paint(style: BuildingStyle, w: number, h: number, doorDx: number): Bitmap {
  switch (style) {
    case 'house_red':
      return house(w, h, doorDx, ROOF_RED, PLASTER, '#4c8c3c');
    case 'house_blue':
      return house(w, h, doorDx, ROOF_BLUE, PLASTER_COOL, WOOD.mid);
    case 'house_green':
      return house(w, h, doorDx, ROOF_GREEN, TIMBER, '#c04038');
    case 'heal':
      return heal(w, h, doorDx);
    case 'shop':
      return shop(w, h, doorDx);
    case 'lab':
      return lab(w, h, doorDx);
    case 'hall':
      return hall(w, h, doorDx);
  }
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

interface Frame {
  b: Bitmap;
  W: number;
  H: number;
  /** First pixel row below the roof. */
  roofH: number;
  doorX: number;
}

function frame(w: number, h: number, doorDx: number, roofShare: number): Frame {
  const W = w * T;
  const H = h * T;
  return { b: canvas(W, H), W, H, roofH: Math.round(H * roofShare), doorX: doorDx * T };
}

/** Wall body between the roof and the ground, inset 1px under the eaves, on a stone footing. */
function wall(f: Frame, pal: WallPal, opts: { planks?: boolean } = {}): void {
  const { b, W, H } = f;
  const top = f.roofH - 3;
  rect(b, 1, top, W - 2, H - top, pal.base);
  if (opts.planks) {
    for (let y = top; y < H; y++) {
      const k = (y - top) % 4;
      const course = Math.floor((y - top) / 4);
      rect(b, 1, y, W - 2, 1, k === 0 ? pal.hi : k === 3 ? pal.dark : pal.base);
      if (k !== 0)
        for (let x = 4 + (course % 2) * 7; x < W - 2; x += 14) dot(b, x, y, pal.dark);
    }
  } else {
    // subtle plaster texture
    for (let y = top; y < H; y++)
      for (let x = 2; x < W - 2; x++) if ((x * 7 + y * 13) % 29 === 0) dot(b, x, y, pal.mid);
  }
  rect(b, 2, top, 1, H - top, pal.hi);
  rect(b, W - 3, top, 1, H - top, pal.mid);
  rect(b, 1, top, 1, H - top, pal.outline);
  rect(b, W - 2, top, 1, H - top, pal.outline);
  // shadow under the eaves
  rect(b, 2, top + 3, W - 4, 1, pal.mid);
  rect(b, 2, top + 2, W - 4, 1, pal.dark);
  footing(f);
}

function footing(f: Frame): void {
  const { b, W, H } = f;
  rect(b, 1, H - 4, W - 2, 1, STONE.deep);
  rect(b, 1, H - 3, W - 2, 2, STONE.base);
  rect(b, 1, H - 3, W - 2, 1, STONE.light);
  for (let x = 4; x < W - 2; x += 6) dot(b, x, H - 2, STONE.dark);
  rect(b, 1, H - 1, W - 2, 1, STONE.deep);
}

/**
 * Hip roof in 3/4 view: a front plane narrowing towards the ridge plus two triangular
 * side faces (left lit, right shaded). Shingle courses of 4px with staggered seams.
 */
function slopedRoof(f: Frame, r: Ramp): void {
  const { b, W } = f;
  const R = f.roofH;
  const hip = Math.min(14, Math.round(W / 6));
  for (let y = 0; y < R; y++) {
    const side = Math.round(hip * (1 - y / (R - 1)));
    const k = (y - 1) % 4;
    const course = Math.floor((y - 1) / 4);
    for (let x = 0; x < W; x++) {
      const face = x < side ? 'left' : x > W - 1 - side ? 'right' : 'front';
      let c: string;
      if (face === 'front') {
        if (k === 0) c = r.light;
        else if (k === 3) c = r.dark;
        else if ((x + (course % 2) * 3) % 6 === 0) c = r.mid;
        else c = r.base;
      } else if (face === 'left') c = k === 3 ? r.base : k === 0 ? r.hi : r.light;
      else c = k === 3 ? r.deep : k === 0 ? r.mid : r.dark;
      dot(b, x, y, c);
    }
    // hip lines and outline
    if (side > 0) {
      dot(b, side, y, r.hi);
      dot(b, W - 1 - side, y, r.dark);
    }
    dot(b, 0, y, r.deep);
    dot(b, W - 1, y, r.deep);
  }
  // ridge cap
  rect(b, hip, 0, W - 2 * hip, 1, r.deep);
  rect(b, hip + 1, 1, W - 2 * hip - 2, 1, r.hi);
  // small chamfer on the top corners only: the whole footprint is solid, so no grass may show through
  const chamfer = 3;
  for (let x = 0; x < chamfer; x++) {
    const yEdge = chamfer - x;
    for (let y = 0; y < yEdge; y++) {
      clear(b, x, y);
      clear(b, W - 1 - x, y);
    }
    dot(b, x, yEdge, r.deep);
    dot(b, W - 1 - x, yEdge, r.deep);
  }
  rect(b, chamfer, 0, W - 2 * chamfer, 1, r.deep);
  // eave: front edge of the roof
  rect(b, 0, R - 3, W, 1, r.light);
  rect(b, 0, R - 2, W, 1, r.dark);
  rect(b, 0, R - 1, W, 1, r.deep);
}

function chimney(f: Frame, x: number, roof: Ramp): void {
  stamp(f.b, [
    'oooooo',
    'oxxxxo',
    'ohhlmo',
    'olbbdo',
    'ommmdo',
    'olbmdo',
    'olbbdo',
    'ommmdo',
    'olbbdo',
  ], { o: STONE.deep, x: '#2c2c34', h: STONE.hi, l: STONE.light, b: STONE.base, m: STONE.mid, d: STONE.dark }, x, 3);
  rect(f.b, x + 6, 5, 1, 8, roof.deep);
}

/** Small-paned window, optional shutters and alpine flower box. */
function window(f: Frame, x: number, y: number, opts: { shutter?: string; flowers?: boolean; frame?: string; wide?: boolean }): void {
  const { b } = f;
  const fr = opts.frame ?? '#fcfcf4';
  const w = opts.wide ? 12 : 10;
  const rows = opts.wide
    ? ['oooooooooooo', 'owwwwwwwwwwo', 'owGggggwGggo', 'owgGgggwgggo', 'owggggdwgggo', 'owwwwwwwwwwo', 'owgggggwgggo', 'owggggdwggdo', 'oooooooooooo']
    : ['oooooooooo', 'owwwwwwwwo', 'owGggwGggo', 'owgGgwgggo', 'owwwwwwwwo', 'owgggwgggo', 'owggdwggdo', 'owwwwwwwwo', 'oooooooooo'];
  stamp(b, rows, { o: '#5a4a40', w: fr, g: INDOOR.glass, G: INDOOR.glassHi, d: INDOOR.glassDark }, x, y);
  if (opts.shutter) {
    for (const sx of [x - 2, x + w]) {
      rect(b, sx, y, 2, rows.length, opts.shutter);
      for (let j = y + 1; j < y + rows.length - 1; j += 2) dot(b, sx + (sx < x ? 0 : 1), j, shade(opts.shutter));
    }
  }
  if (opts.flowers) {
    const box = ['.rGrRGrGr.', 'kmmmmmmmmk', 'kkkkkkkkkk'];
    stamp(b, box, { r: FLOWER.red, R: FLOWER.redDark, G: '#4c9838', k: WOOD.deep, m: WOOD.mid }, x + (w - 10) / 2, y + rows.length - 1);
  }
}

/** Darkens a #rrggbb color by ~25% (for small shading details). */
function shade(hex: string): string {
  const n = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.72).toString(16).padStart(2, '0');
  return `#${n(1)}${n(3)}${n(5)}`;
}

function woodDoor(f: Frame): void {
  const x = f.doorX + 3;
  const y = f.H - 16;
  stamp(f.b, [
    '.oooooooo.',
    'oddddddddo',
    'odhllllmdo',
    'odhlbblmdo',
    'odhlbblmdo',
    'odhllllmdo',
    'odhmmmmmdo',
    'odhllllmdo',
    'odhlbbyydo',
    'odhlbblmdo',
    'odhllllmdo',
    'odhmmmmmdo',
    'odhllllmdo',
    'odhllllmdo',
    'oddddddddo',
    'SSSSSSSSSS',
  ], { o: WOOD.deep, d: WOOD.dark, h: WOOD.hi, l: WOOD.light, b: WOOD.base, m: WOOD.mid, y: '#f8d040', S: STONE.light }, x, y);
  dot(f.b, x - 1, f.H - 1, STONE.mid);
  dot(f.b, x + 10, f.H - 1, STONE.mid);
}

/** Glass double door with a coloured frame. */
function glassDoor(f: Frame, frameColor: string, frameDark: string): void {
  const x = f.doorX + 2;
  const y = f.H - 16;
  stamp(f.b, [
    'oooooooooooo',
    'offfffffffko',
    'ofGgggfGgggo',
    'ofgGggfgGggo',
    'ofggGgfggGgo',
    'ofgggGfgggGo',
    'ofggggfggggo',
    'ofggggfggggo',
    'ofggwgfgwggo',
    'ofggwgfgwggo',
    'ofggggfggggo',
    'ofggggfggggo',
    'ofddddfddddo',
    'ofggggfggggo',
    'okkkkkkkkkko',
    'SSSSSSSSSSSS',
  ], { o: frameDark, f: frameColor, k: frameDark, g: INDOOR.glass, G: INDOOR.glassHi, d: INDOOR.glassDark, w: '#e8f8ff', S: STONE.light }, x, y);
}

/** Rounded plaque centred on cx with an emblem drawn by `art` (12×9 area at plaque + (2,1)). */
function plaque(f: Frame, cx: number, y: number, bg: string, border: string, art: readonly string[], pal: Readonly<Record<string, string>>): void {
  const x = cx - 8;
  stamp(f.b, [
    '.oooooooooooooo.',
    'oHbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbbo',
    'obbbbbbbbbbbbbDo',
    '.oooooooooooooo.',
  ], { o: border, b: bg, H: '#ffffff', D: shade(bg) }, x, y);
  stamp(f.b, art, pal, x + 2, y + 1);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** y of an upper window row when the wall is tall enough for a second floor, else null. */
function upperRow(f: Frame, windowH: number): number | null {
  const top = f.roofH + 1;
  const gap = f.H - 17 - top;
  return gap >= windowH + 4 ? top + Math.floor((gap - windowH) / 2) : null;
}

function house(w: number, h: number, doorDx: number, roof: Ramp, wallPal: WallPal, shutter: string): Bitmap {
  const f = frame(w, h, doorDx, h >= 6 ? 0.56 : 0.55);
  const timber = wallPal === TIMBER;
  const frameColor = timber ? '#f8f0e0' : undefined;
  wall(f, wallPal, { planks: timber });
  slopedRoof(f, roof);
  if (w >= 4) chimney(f, (doorDx >= w / 2 ? 1 : w - 2) * T + 5, roof);
  const up = upperRow(f, 10);
  for (let c = 0; c < w; c++) {
    if (c !== doorDx) window(f, c * T + 3, f.H - 15, { shutter, flowers: true, frame: frameColor });
    if (up !== null) window(f, c * T + 3, up, { shutter, flowers: true, frame: frameColor });
  }
  woodDoor(f);
  return f.b;
}

const HEART_LEAF = [
  '......gG....',
  '.....gg.....',
  '..www.www...',
  '.wwwwwwwww..',
  '.wwwwwwwwW..',
  '..wwwwwwW...',
  '...wwwwW....',
  '....wwW.....',
  '.....W......',
];

function heal(w: number, h: number, doorDx: number): Bitmap {
  const f = frame(w, h, doorDx, h >= 6 ? 0.54 : 0.5);
  wall(f, HEAL_WALL);
  // teal band along the base
  rect(f.b, 2, f.H - 8, f.W - 4, 3, INDOOR.teal);
  rect(f.b, 2, f.H - 8, f.W - 4, 1, INDOOR.tealLight);
  rect(f.b, 2, f.H - 6, f.W - 4, 1, INDOOR.tealDark);
  slopedRoof(f, ROOF_TEAL);
  const up = upperRow(f, 9);
  for (let c = 0; c < w; c++) {
    if (c !== doorDx) window(f, c * T + 2, f.H - 17, { wide: true, frame: '#e8fcf8' });
    if (up !== null && Math.abs(c - doorDx) > 0) window(f, c * T + 2, up, { wide: true, frame: '#e8fcf8' });
  }
  glassDoor(f, INDOOR.teal, INDOOR.tealDeep);
  const py = up !== null ? up - 1 : f.roofH - 9;
  plaque(f, f.doorX + 8, py, INDOOR.teal, INDOOR.tealDeep, HEART_LEAF, { w: '#ffffff', W: '#c8e8e4', g: '#b8f4d0', G: '#ffffff' });
  return f.b;
}

/** Shopping bag (white, with a handle loop) and a gold coin beside it. */
const BAG = [
  '..wwww......',
  '.w....w.....',
  '.oooooo.....',
  'owwwwwWo....',
  'owwwwwWoCCC.',
  'owwwwwWCyhyC',
  'owwwwwWCyyyC',
  'owwwwwWCyyYC',
  'ooooooo.CCC.',
];

function shop(w: number, h: number, doorDx: number): Bitmap {
  const f = frame(w, h, doorDx, h >= 6 ? 0.54 : 0.5);
  wall(f, PLASTER_COOL);
  slopedRoof(f, ROOF_SLATE);
  // striped awning below the eave, scalloped lower edge
  const ay = f.roofH - 1;
  for (let x = 1; x < f.W - 1; x++) {
    const stripe = Math.floor((x - 1) / 4) % 2 === 0;
    rect(f.b, x, ay, 1, 4, stripe ? AWNING.blue : AWNING.white);
    dot(f.b, x, ay, stripe ? AWNING.blueHi : '#ffffff');
    if ((x - 1) % 4 === 1 || (x - 1) % 4 === 2) {
      dot(f.b, x, ay + 4, stripe ? AWNING.blueDark : AWNING.whiteDark);
      dot(f.b, x, ay + 5, AWNING.shadow);
    }
  }
  const up = upperRow(f, 10);
  for (let c = 0; c < w; c++) {
    if (c !== doorDx) {
      window(f, c * T + 2, f.H - 17, { wide: true, frame: '#e8f0ff' });
      // goods on display
      stamp(f.b, ['r.y.b', 'rryyb'], { r: '#e05050', y: '#f0c040', b: '#5080e0' }, c * T + 4, f.H - 11);
    }
    if (up !== null && c !== doorDx) window(f, c * T + 3, up + 2, { shutter: AWNING.blue, frame: '#e8f0ff' });
  }
  glassDoor(f, AWNING.blue, '#284c8c');
  const py = up !== null ? up + 2 : f.roofH - 11;
  plaque(f, f.doorX + 8, py, '#3c78d8', '#20407c', BAG, { o: '#20407c', w: '#ffffff', W: '#c4d4ec', C: '#8c5c14', y: '#f8d048', h: '#fff4b0', Y: '#d8a020' });
  return f.b;
}

const FLASK = [
  '....oooo....',
  '.....ww.....',
  '.....ww.....',
  '....owwo....',
  '...owwwwo...',
  '..owgGggwo..',
  '.owggggggwo.',
  '.oggggggggo.',
  '..oooooooo..',
];

function lab(w: number, h: number, doorDx: number): Bitmap {
  const f = frame(w, h, doorDx, h >= 5 ? 0.46 : 0.42);
  const { b, W, H } = f;
  wall(f, LAB_WALL);
  // flat roof seen from above: panels, parapet, vents, skylight, antenna
  const R = f.roofH;
  rect(b, 0, 0, W, R, FLAT_ROOF.base);
  for (let y = 5; y < R - 6; y += 6) rect(b, 2, y, W - 4, 1, FLAT_ROOF.mid);
  for (let x = 16; x < W - 2; x += 16) rect(b, x, 2, 1, R - 7, FLAT_ROOF.mid);
  rect(b, 0, 0, W, 1, FLAT_ROOF.deep);
  rect(b, 0, 0, 1, R, FLAT_ROOF.deep);
  rect(b, W - 1, 0, 1, R, FLAT_ROOF.deep);
  rect(b, 1, 1, W - 2, 1, FLAT_ROOF.hi);
  rect(b, 1, 1, 1, R - 5, FLAT_ROOF.hi);
  rect(b, W - 2, 1, 1, R - 5, FLAT_ROOF.dark);
  // parapet front face
  rect(b, 0, R - 5, W, 1, FLAT_ROOF.dark);
  rect(b, 0, R - 4, W, 2, FLAT_ROOF.light);
  rect(b, 0, R - 2, W, 1, FLAT_ROOF.mid);
  rect(b, 0, R - 1, W, 1, FLAT_ROOF.deep);
  const vent = ['.oooooo.', 'ohhhhhho', 'odmdmdmo', 'odmdmdmo', 'ommmmmmo', '.oooooo.'];
  const ventPal = { o: FLAT_ROOF.deep, h: '#ffffff', d: '#50586c', m: FLAT_ROOF.dark };
  const vy = Math.max(3, Math.floor((R - 5) / 2) - 3);
  for (let x = 6; x <= W - 30; x += 26) stamp(b, vent, ventPal, x, vy);
  if (W >= 64) {
    stamp(b, [
      'oooooooooooooo',
      'oGggggoGggggdo',
      'ogGgggoggGggdo',
      'oggggdogggggdo',
      'oddddddddddddo',
      'oooooooooooooo',
    ], { o: FLAT_ROOF.deep, g: INDOOR.glass, G: INDOOR.glassHi, d: INDOOR.glassDark }, W - 36, vy);
  }
  // antenna mast with a red beacon
  stamp(b, [
    '..r..',
    '.oho.',
    '..o..',
    'ooooo',
    '..o..',
    '.ooo.',
    '..o..',
    '.ooo.',
  ], { o: FLAT_ROOF.deep, h: '#f04848', r: '#ffb0a0' }, W - 13, 1);
  // blue stripe + window bands
  rect(b, 2, R + 1, W - 4, 2, '#5c88d0');
  rect(b, 2, R + 1, W - 4, 1, '#88b0e8');
  const band = (y: number, c: number) =>
    stamp(b, [
      'oooooooooooooo',
      'oGgggggGgggggo',
      'ogGgggggGggggo',
      'ogggggggggggdo',
      'oddddddddddddo',
      'oooooooooooooo',
    ], { o: '#5c6476', g: INDOOR.glass, G: INDOOR.glassHi, d: INDOOR.glassDark }, c * T + 1, y);
  const up = upperRow(f, 6);
  for (let c = 0; c < w; c++) {
    if (c !== doorDx) band(H - 16, c);
    if (up !== null) band(up + 1, c);
  }
  rect(b, 2, H - 8, W - 4, 1, '#88a0c8');
  glassDoor(f, '#9aa4b8', '#4c5468');
  if (up === null) plaque(f, f.doorX + 8, R - 4, '#8890a8', '#4c5468', FLASK, { o: '#4c5468', w: '#ffffff', g: '#60d090', G: '#c8ffe0' });
  else plaque(f, f.doorX + 8, up - 3, '#8890a8', '#4c5468', FLASK, { o: '#4c5468', w: '#ffffff', g: '#60d090', G: '#c8ffe0' });
  return b;
}

const PEAK_FLAME = [
  '.....ff.....',
  '....fFFf....',
  '.....ff.....',
  '....oyyo....',
  '...oyyhyo...',
  '..oyyyhyyo..',
  '.oyyyyyhyyo.',
  'oyyyyyyyhyyo',
  'oooooooooooo',
];

function hall(w: number, h: number, doorDx: number): Bitmap {
  const f = frame(w, h, doorDx, 0.46);
  const { b, W, H } = f;
  wall(f, HALL_WALL);
  // ashlar courses
  for (let y = f.roofH + 2; y < H - 6; y += 5) {
    rect(b, 3, y, W - 6, 1, HALL_WALL.mid);
    for (let x = 6 + ((y / 5) % 2) * 6; x < W - 3; x += 12) rect(b, x, y - 4, 1, 4, HALL_WALL.mid);
  }
  slopedRoof(f, ROOF_HALL);
  rect(b, 0, f.roofH - 3, W, 1, GOLD.base);
  // stone pediment (front gable) with the Alpenglut emblem, centred on the building
  const cx = Math.round(W / 2);
  const pw = Math.max(13, Math.min(Math.round(f.roofH * 0.7), 22));
  for (let y = 0; y < pw; y++) {
    const half = Math.min(Math.round(y * 1.6) + 3, cx - 2);
    const py = f.roofH - pw - 1 + y;
    for (let x = cx - half; x < cx + half; x++) {
      const edge = x <= cx - half + 1 || x >= cx + half - 2;
      const c = y === 0 || edge ? (x < cx ? GOLD.light : GOLD.dark) : x < cx - half + 4 ? HALL_WALL.hi : HALL_WALL.base;
      dot(b, x, py, c);
      if (y === 0 || x === cx - half || x === cx + half - 1) dot(b, x, py - 1, HALL_WALL.outline);
    }
  }
  stamp(b, PEAK_FLAME, { o: GOLD.deep, y: GOLD.base, h: GOLD.light, f: FLAME.rose, F: FLAME.inner }, cx - 6, f.roofH - 11);
  // pillars between window bays
  const pillar = (x: number) => {
    const top = f.roofH - 1;
    rect(b, x - 1, top, 8, 1, HALL_WALL.hi);
    rect(b, x - 1, top + 1, 8, 1, HALL_WALL.outline);
    for (let y = top + 2; y < H - 5; y++) {
      rect(b, x, y, 6, 1, HALL_WALL.base);
      dot(b, x, y, HALL_WALL.outline);
      dot(b, x + 1, y, '#ffffff');
      dot(b, x + 3, y, HALL_WALL.mid);
      dot(b, x + 4, y, HALL_WALL.dark);
      dot(b, x + 5, y, HALL_WALL.outline);
    }
    rect(b, x - 1, H - 6, 8, 1, HALL_WALL.hi);
    rect(b, x - 1, H - 5, 8, 1, HALL_WALL.outline);
  };
  // pillars between window bays and flanking the door, never under the door or past the walls
  const flank = [f.doorX - 5, f.doorX + 15];
  const bays = Array.from({ length: w - 1 }, (_, i) => (i + 1) * T - 3).filter((x) => flank.every((fx) => Math.abs(x - fx) > 4));
  for (const x of [...flank, ...bays]) if (x >= 2 && x <= W - 8 && (x + 5 <= f.doorX || x >= f.doorX + 15)) pillar(x);
  const up = upperRow(f, 10);
  for (let c = 0; c < w; c++) {
    if (c !== doorDx) window(f, c * T + 3, H - 18, { frame: HALL_WALL.hi });
    if (up !== null && c !== doorDx) window(f, c * T + 3, up, { frame: HALL_WALL.hi });
  }
  // grand door with gold trim
  stamp(b, [
    '...oooooooo...',
    '..oyyyyyyyyo..',
    '.oyddddddddyo.',
    'oyddhllhllddyo',
    'oydhlllhlllmyo',
    'oydhlbbhbblmyo',
    'oydhlbbhbblmyo',
    'oydhlllhlllmyo',
    'oydhllyhyllmyo',
    'oydhlllhlllmyo',
    'oydhlbbhbblmyo',
    'oydhlbbhbblmyo',
    'oydhlllhlllmyo',
    'oydmmmmhmmmmyo',
  ], { o: WOOD.deep, y: GOLD.base, d: WOOD.dark, h: WOOD.hi, l: WOOD.light, b: WOOD.base, m: WOOD.mid }, f.doorX + 1, H - 16);
  // steps
  rect(b, f.doorX - 1, H - 2, 18, 1, STONE.light);
  rect(b, f.doorX - 1, H - 1, 18, 1, STONE.mid);
  return b;
}
