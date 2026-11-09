import { type Bitmap, getPixel, parseColor, recolor, setPixel, toHex } from '../core/bitmap';
import type { TileId } from '../core/tiles-meta';
import {
  blendDot, canvas, CAVE, clearPixel, compositeOver, copyBitmap, dot, dotWrap, FLAME, FLOWER, GRASS, hash, ICE, INDOOR,
  PATH, rect, ROCK, SAND, SHADOW, SNOW, stamp, STONE, TREE, WATER, WOOD,
} from './world-palette';

/** Animated tiles cycle through their frames, advancing every TILE_ANIM_TICKS frames. */
export const TILE_ANIM_TICKS = 20;

/**
 * Neighbour bits for `edges`: set where that side needs a transition. tileEdges computes the
 * art-aware mask; a plain "neighbour has a different tile id" mask also works.
 */
export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;

const S = 16;
/** Denser cast shadow right at the foot of tall things. */
const SHADOW_DEEP = '#1c284c90';

/** Ids of a map cell's four neighbours; null = outside the map. */
export interface TileNeighbours {
  readonly n: TileId | null;
  readonly e: TileId | null;
  readonly s: TileId | null;
  readonly w: TileId | null;
}

/**
 * Opaque frames for one map cell — what the overworld should draw. Uses art-aware edges
 * (tileEdges), puts the right ground under transparent pixels (tileUnderlay; `base` is the
 * map's baseTile, used when no neighbour is a better fit) and picks variants such as the
 * cave-palette entrance inside caves. Cached.
 */
export function cellFrames(id: TileId, nb: TileNeighbours, base: TileId): readonly Bitmap[] {
  const e = tileEdges(id, nb);
  const cave = id === 'cave_entrance' && (base === 'cave_floor' || [nb.n, nb.e, nb.s, nb.w].some((o) => o === 'cave_wall' || o === 'cave_floor'));
  const under = tileUnderlay(id, nb, base);
  const ue = WALLS.has(under) ? tileEdges(under, nb) : 0;
  return cached(`cell:${id}:${e}:${cave ? 'cave' : ''}/${under}:${ue}`, () => {
    const top = cave ? caveEntrance(e, true) : tileFrames(id, e);
    if (top.every(isOpaque)) return top;
    return top.map((f) => {
      const b = copyBitmap(tileFrames(under, ue)[0]!);
      compositeOver(b, f);
      return b;
    });
  });
}

/**
 * 16×16 frames for a tile (length ≥ 1). `edges` (EDGE_* bitmask) lets autotiled tiles
 * (e.g. water shores, path borders) draw transitions; other tiles ignore it.
 * Transparent pixels show the ground underneath and translucent ones (SHADOW) darken it —
 * prefer cellFrames, which composites the right ground per cell.
 */
export function tileFrames(id: TileId, edges = 0): readonly Bitmap[] {
  const e = AUTOTILED.has(id) ? edges & 15 : 0;
  return cached(`${id}:${e}`, () => BUILDERS[id](e));
}

/** Optional 16×16 overlay drawn above characters standing on the tile (front grass blades), else null. */
export function tileOverlay(id: TileId): Bitmap | null {
  if (!overlayCache.has(id)) {
    const gap = id === 'tallgrass' ? GRASS.deep : id === 'snow_grass' ? FROST.deep : null;
    overlayCache.set(id, gap ? grassOverlay(tileFrames(id)[0]!, gap) : null);
  }
  return overlayCache.get(id) ?? null;
}

/** Tile ids whose art depends on the edge mask. */
export const AUTOTILED: ReadonlySet<TileId> = new Set<TileId>([
  'water', 'path', 'sand', 'snow', 'tree', 'bridge', 'fence', 'ledge', 'cliff', 'cave_wall', 'cave_entrance', 'carpet', 'table',
  'counter', 'wall', 'wall_window', 'door',
]);

/**
 * Art-aware EDGE_* mask for a cell: a bit is set where that neighbour needs a visible
 * transition. Mostly "different tile id", but e.g. bridges don't cut water, props standing
 * on sand or snow don't get a rim, cliffs flow into cave entrances, and the higher terrain
 * (snow > sand > path > grass) draws the border between two grounds. Indoor walls treat
 * the map edge as open so the top row gets its cornice.
 */
export function tileEdges(id: TileId, nb: TileNeighbours): number {
  return (
    (joins(id, nb.n) ? 0 : EDGE_N) | (joins(id, nb.e) ? 0 : EDGE_E) | (joins(id, nb.s) ? 0 : EDGE_S) | (joins(id, nb.w) ? 0 : EDGE_W)
  );
}

/**
 * Ground drawn under the transparent pixels of `id` at a cell: for terrain borders the
 * neighbouring ground across the border, for props the ground they stand on (weighted
 * vote of the neighbours, south counts most), the wall for props set into a wall row.
 */
export function tileUnderlay(id: TileId, nb: TileNeighbours, base: TileId): TileId {
  const wallLike = (o: TileId | null) => o !== null && WALLS.has(o);
  const terrain = id in GROUND_LEVEL || id === 'water' || id === 'cliff';
  if (!terrain && (wallLike(nb.w) || wallLike(nb.e)) && (nb.n === null || nb.n === 'void' || wallLike(nb.n)) && !wallLike(nb.s)) return 'wall';
  const e = tileEdges(id, nb);
  const votes = new Map<TileId, number>();
  const sides: readonly (readonly [TileId | null, number, number])[] = [[nb.s, EDGE_S, 3], [nb.w, EDGE_W, 2], [nb.e, EDGE_E, 2], [nb.n, EDGE_N, 1]];
  for (const [o, side, weight] of sides) {
    const g = groundOf(o);
    if (!g || g === id || (terrain && !has(e, side))) continue;
    // props stand on soil, not on the path next to them (unless there is nothing else)
    votes.set(g, (votes.get(g) ?? 0) + (g === 'path' && !terrain ? weight / 10 : weight));
  }
  let best = base;
  for (const [g, v] of votes) if (v > (votes.get(best) ?? 0)) best = g;
  return best;
}

/** Height order of ground terrains: the higher one draws the border onto the lower one. */
const GROUND_LEVEL: Partial<Record<TileId, number>> = { grass: 0, tallgrass: 0, flowers: 0, cave_floor: 0, path: 1, sand: 2, snow: 3, snow_grass: 3 };
/** Indoor wall pieces that stack into one wall (cornice on top, baseboard at the bottom). */
const WALLS: ReadonlySet<TileId> = new Set<TileId>(['wall', 'wall_window', 'door', 'shelf']);

function joins(id: TileId, o: TileId | null): boolean {
  if (WALLS.has(id)) return o !== null && (WALLS.has(o) || o === 'stairs');
  if (o === null || o === id) return true;
  switch (id) {
    case 'water':
      return o === 'bridge';
    case 'bridge':
      return o !== 'water';
    case 'path':
      return o === 'bridge' || o === 'cave_entrance' || o === 'water' || (GROUND_LEVEL[o] ?? 0) > 1;
    case 'sand':
    case 'snow': {
      const level = GROUND_LEVEL[o];
      return level === undefined || level >= GROUND_LEVEL[id]!;
    }
    case 'cliff':
    case 'cave_wall':
      return o === 'cave_entrance';
    case 'cave_entrance':
      return o === 'cliff' || o === 'cave_wall';
    default:
      return false;
  }
}

/** The ground a neighbour offers as an underlay, if any. */
function groundOf(o: TileId | null): TileId | null {
  switch (o) {
    case 'tallgrass':
    case 'flowers':
      return 'grass';
    case 'snow_grass':
      return 'snow';
    case 'grass':
    case 'path':
    case 'sand':
    case 'snow':
    case 'cave_floor':
    case 'floor_wood':
    case 'floor_tile':
    case 'hall_floor':
      return o;
    default:
      return null;
  }
}

const frameCache = new Map<string, readonly Bitmap[]>();
const overlayCache = new Map<TileId, Bitmap | null>();

function cached(key: string, build: () => readonly Bitmap[]): readonly Bitmap[] {
  let frames = frameCache.get(key);
  if (!frames) {
    frames = build();
    frameCache.set(key, frames);
  }
  return frames;
}

function isOpaque(b: Bitmap): boolean {
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] !== 255) return false;
  return true;
}

const has = (e: number, side: number) => (e & side) !== 0;
type Pal = Readonly<Record<string, string>>;

// ---------------------------------------------------------------------------
// Edge geometry shared by autotiles
// ---------------------------------------------------------------------------

interface EdgeHit {
  /** Distance in px from the flagged side (0 = outermost row/column). Negative = outside a rounded corner. */
  t: number;
  side: number;
  /** Position along that side (0..15), continuous across neighbouring tiles. */
  along: number;
}

/** Nearest flagged side for pixel (x, y); corners where two flagged sides meet are rounded with radius r. */
function edgeHit(e: number, x: number, y: number, r = 0): EdgeHit | null {
  const hits: EdgeHit[] = [];
  if (has(e, EDGE_N)) hits.push({ t: y, side: EDGE_N, along: x });
  if (has(e, EDGE_S)) hits.push({ t: S - 1 - y, side: EDGE_S, along: x });
  if (has(e, EDGE_W)) hits.push({ t: x, side: EDGE_W, along: y });
  if (has(e, EDGE_E)) hits.push({ t: S - 1 - x, side: EDGE_E, along: y });
  if (hits.length === 0) return null;
  const best = hits.reduce((a, b) => (b.t < a.t ? b : a));
  if (r > 0) {
    const cx = has(e, EDGE_W) && x < r ? x : has(e, EDGE_E) && S - 1 - x < r ? S - 1 - x : -1;
    const cy = has(e, EDGE_N) && y < r ? y : has(e, EDGE_S) && S - 1 - y < r ? S - 1 - y : -1;
    if (cx >= 0 && cy >= 0) {
      const t = Math.floor(r - Math.hypot(r - cx - 0.5, r - cy - 0.5));
      if (t < best.t) return { ...best, t };
    }
  }
  return best;
}

/** Irregular depth profiles (periodic over 16 px) so borders don't look ruled. */
const WAVE_A = [1, 1, 2, 2, 1, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 1];
const WAVE_B = [0, 1, 1, 2, 2, 1, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0];
const wave = (side: number, along: number) => (side === EDGE_N || side === EDGE_W ? WAVE_A : WAVE_B)[along & 15]!;

// ---------------------------------------------------------------------------
// Ground textures
// ---------------------------------------------------------------------------

const TUFT = ['l.l', 'm.m', '.m.'];
const TUFT_SPOTS: readonly (readonly [number, number])[] = [[1, 1], [9, 3], [5, 7], [13, 9], [1, 12], [9, 13]];

function grassBase(spots = TUFT_SPOTS): Bitmap {
  const b = canvas(S, S, GRASS.base);
  for (const [x, y] of spots) stampWrap(b, TUFT, { l: GRASS.light, m: GRASS.mid }, x, y);
  // a few single light specks for texture
  for (const [x, y] of [[6, 2], [14, 5], [3, 9], [11, 11], [6, 15]] as const) dotWrap(b, x, y, GRASS.light);
  return b;
}

/** Row-art stamp with wrap-around (seamless textures). */
function stampWrap(b: Bitmap, rows: readonly string[], pal: Pal, x: number, y: number): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]!];
      if (c) dotWrap(b, x + i, y + j, c);
    }
  });
}

function grass(): Bitmap[] {
  return [grassBase()];
}

function flowers(): Bitmap[] {
  const spots: readonly (readonly [number, number])[] = [[13, 1], [6, 6], [0, 13]];
  const heads: readonly { x: number; y: number; petal: string; shade: string; center: string; sway: number }[] = [
    { x: 1, y: 1, petal: FLOWER.red, shade: FLOWER.redDark, center: FLOWER.yellow, sway: 1 },
    { x: 9, y: 4, petal: FLOWER.white, shade: FLOWER.whiteShade, center: FLOWER.yellow, sway: -1 },
    { x: 4, y: 9, petal: FLOWER.blue, shade: FLOWER.blueDark, center: FLOWER.white, sway: -1 },
    { x: 11, y: 11, petal: FLOWER.red, shade: FLOWER.redDark, center: FLOWER.yellow, sway: 1 },
  ];
  return [0, 1].map((f) => {
    const b = grassBase(spots);
    for (const h of heads) {
      const sx = f === 1 ? h.sway : 0;
      dotWrap(b, h.x + 1, h.y + 4, GRASS.dark);
      dotWrap(b, h.x + 2, h.y + 4, GRASS.mid);
      dotWrap(b, h.x + 1 + (sx > 0 ? 1 : 0), h.y + 3, GRASS.dark);
      stampWrap(b, ['.PP.', 'PccQ', '.QQ.'], { P: h.petal, Q: h.shade, c: h.center }, h.x + sx, h.y);
    }
    return b;
  });
}

function tallgrassArt(): Bitmap {
  const pal: Pal = { o: GRASS.deep, d: GRASS.dark, m: GRASS.mid, b: GRASS.base, l: GRASS.light, h: GRASS.hi };
  return stampRows([
    'd.ho.ho.d.ho.ho.',
    'dohlohlodohlohlo',
    'ohlbhlbmohlbhlbm',
    'hlbmlbmmhlbmlbmm',
    'lbbmbmmdlbbmbmmd',
    'bbmmmmddbbmmmmdd',
    'bmmdmddobmmdmddo',
    'oddodooo.ho.hood',
    'o.ho.ho.dohlohlo',
    'dohlohlodhlbhlbm',
    'ohlbhlbmolbmlbmm',
    'hlbmlbmmhbbmbmmd',
    'lbbmbmmdbbmmmmdd',
    'bbmmmmddbmmdmddo',
    'bmmdmddodmddoddo',
    'oddodoooooooo.oo',
  ], pal, GRASS.dark);
}

/** Front blades of the lower rows — drawn over a character's feet. The top row keeps only blade tips. */
function grassOverlay(tile: Bitmap, gap: string): Bitmap {
  const out = canvas(S, S);
  const gapPx = toHex(parseColor(gap));
  for (let y = 10; y < S; y++)
    for (let x = 0; x < S; x++) {
      const p = getPixel(tile, x, y);
      if (y === 10 && toHex(p) === gapPx) continue;
      setPixel(out, x, y, p);
    }
  return out;
}

/** bitmapFromRows with a background color for '.'. */
function stampRows(rows: readonly string[], pal: Pal, bg?: string): Bitmap {
  const b = canvas(rows[0]!.length, rows.length, bg);
  stamp(b, rows, pal, 0, 0);
  return b;
}

/** Frosted grass for snowy routes (same blades as tallgrass, recoloured). */
const FROST = { deep: '#6c8cac', dark: '#94b4cc', mid: '#a8d4d0', base: '#c8ece4', light: '#e4f8f4', hi: '#ffffff' } as const;
const FROST_MAP: Pal = {
  [GRASS.deep]: FROST.deep, [GRASS.dark]: FROST.dark, [GRASS.mid]: FROST.mid, [GRASS.base]: FROST.base, [GRASS.light]: FROST.light, [GRASS.hi]: FROST.hi,
};

function path(e: number): Bitmap[] {
  const b = canvas(S, S, PATH.base);
  const pebbles: readonly (readonly [number, number])[] = [[3, 3], [11, 2], [7, 8], [14, 11], [2, 13], [9, 14]];
  for (const [x, y] of pebbles) {
    dotWrap(b, x, y, PATH.light);
    dotWrap(b, x + 1, y, PATH.mid);
    dotWrap(b, x, y + 1, PATH.mid);
  }
  for (const [x, y] of [[6, 4], [13, 6], [1, 8], [10, 11], [5, 12], [15, 15]] as const) dotWrap(b, x, y, PATH.mid);
  for (const [x, y] of [[8, 1], [0, 5], [12, 9], [4, 15]] as const) dotWrap(b, x, y, PATH.hi);
  // soft fringe: transparent (the neighbouring ground shows) + a shaded line on the dirt
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const hit = edgeHit(e, x, y, 3);
      if (!hit) continue;
      const depth = 1 + wave(hit.side, hit.along);
      if (hit.t < depth) clearPixel(b, x, y);
      else if (hit.t === depth) dot(b, x, y, hash(hit.along, hit.side) < 0.25 ? PATH.dark : PATH.mid);
    }
  return [b];
}

function sand(e: number): Bitmap[] {
  const b = canvas(S, S, SAND.base);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = hash(x, y, 7);
      if (n < 0.07) dot(b, x, y, SAND.mid);
      else if (n > 0.95) dot(b, x, y, SAND.light);
    }
  for (const [x, y] of [[4, 4], [12, 10]] as const) stampWrap(b, ['hm', 'md'], { h: SAND.hi, m: SAND.mid, d: SAND.dark }, x, y);
  for (const [x, y] of [[9, 2], [2, 11], [14, 14]] as const) {
    dotWrap(b, x, y, SAND.dark);
    dotWrap(b, x + 1, y, SAND.mid);
  }
  // irregular border: transparent beyond a wavy depth (the lower ground shows), shaded rim
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const hit = edgeHit(e, x, y, 3);
      if (!hit) continue;
      const depth = wave(hit.side, hit.along + 6);
      const shadowSide = hit.side === EDGE_S || hit.side === EDGE_E;
      if (hit.t < depth) clearPixel(b, x, y);
      else if (hit.t === depth) dot(b, x, y, shadowSide || hash(hit.along, hit.side, 3) < 0.3 ? SAND.dark : SAND.mid);
      else if (hit.t === depth + 1 && hash(hit.along, hit.side, 4) < 0.45) dot(b, x, y, shadowSide ? SAND.mid : SAND.light);
    }
  return [b];
}

function snow(e: number): Bitmap[] {
  const b = canvas(S, S, SNOW.base);
  const drifts: readonly (readonly [number, number])[] = [[2, 3], [10, 1], [6, 9], [13, 7], [1, 13], [10, 13]];
  for (const [x, y] of drifts) {
    stampWrap(b, ['.ww.', 'm..m'], { w: SNOW.white, m: SNOW.mid }, x, y);
  }
  for (const [x, y] of [[7, 5], [15, 11], [4, 15]] as const) dotWrap(b, x, y, SNOW.dark);
  // soft drift edge: transparent fringe + blue shading on the snow side
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const hit = edgeHit(e, x, y, 3);
      if (!hit) continue;
      const depth = wave(hit.side, hit.along) > 1 ? 1 : 0;
      const shadowSide = hit.side === EDGE_S || hit.side === EDGE_E;
      if (hit.t < depth) clearPixel(b, x, y);
      else if (hit.t === depth) dot(b, x, y, shadowSide ? SNOW.dark : SNOW.mid);
      else if (hit.t === depth + 1 && shadowSide && wave(hit.side, hit.along + 5) > 0) dot(b, x, y, SNOW.mid);
    }
  return [b];
}

function water(e: number): Bitmap[] {
  const phase = [0, 1, 2, 1];
  const waves: readonly (readonly [number, number])[] = [[1, 2], [9, 5], [4, 10], [12, 13]];
  return phase.map((p, f) => {
    const b = canvas(S, S, WATER.base);
    for (const [x, y] of [[6, 0], [14, 8], [0, 6], [8, 12]] as const) stampWrap(b, ['mm.m'], { m: WATER.mid }, x - p, y);
    for (const [x, y] of waves) {
      const dx = (y & 4) !== 0 ? -p : p;
      stampWrap(b, ['.lhl.', 'm...m'], { l: WATER.light, h: WATER.hi, m: WATER.mid }, x + dx, y);
    }
    if (f === 1) dotWrap(b, 6, 7, WATER.hi);
    if (f === 3) dotWrap(b, 14, 1, WATER.hi);
    // shoreline: dark bank line, shallow band with drifting foam, shadow under north/west banks
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const hit = edgeHit(e, x, y, 4);
        if (!hit) continue;
        const shaded = hit.side === EDGE_N || hit.side === EDGE_W;
        const foam = hash((hit.along + p * 3) & 15, hit.side) < 0.3;
        if (hit.t < 0) clearPixel(b, x, y);
        else if (hit.t === 0) dot(b, x, y, WATER.deep);
        else if (hit.t === 1) dot(b, x, y, foam ? WATER.foam : shaded ? WATER.dark : WATER.light);
        else if (hit.t === 2) dot(b, x, y, shaded ? WATER.mid : foam ? WATER.hi : WATER.light);
        else if (hit.t === 3 && !shaded && foam) dot(b, x, y, WATER.light);
      }
    return b;
  });
}

// ---------------------------------------------------------------------------
// Outdoor objects
// ---------------------------------------------------------------------------

interface Ramp {
  hi: string;
  light: string;
  base: string;
  mid: string;
  dark: string;
  deep: string;
}

interface Blob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Union of shaded ellipses (leaf clusters, boulders). Later blobs sit in front of
 * earlier ones; each gets ball shading lit from the top-left and a dark crease
 * where it overlaps a blob behind it. Outline drawn inside the silhouette.
 * wrap: distances and neighbours wrap around the bitmap (seamless textures).
 */
function blobs(b: Bitmap, list: readonly Blob[], ramp: Ramp, outline: string, opts: { wrap?: boolean } = {}): void {
  const { w, h } = b;
  const delta = (v: number, size: number) => (opts.wrap ? v - size * Math.round(v / size) : v);
  const norm = (c: Blob, x: number, y: number) => [delta(x + 0.5 - c.cx, w) / c.rx, delta(y + 0.5 - c.cy, h) / c.ry] as const;
  const owner = new Int16Array(w * h).fill(-1);
  list.forEach((c, i) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [nx, ny] = norm(c, x, y);
        if (nx * nx + ny * ny <= 1) owner[y * w + x] = i;
      }
  });
  const own = (x: number, y: number) => {
    if (opts.wrap) return owner[((y + h) % h) * w + ((x + w) % w)]!;
    return x < 0 || y < 0 || x >= w || y >= h ? -1 : owner[y * w + x]!;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = own(x, y);
      if (i < 0) continue;
      const c = list[i]!;
      if (own(x - 1, y) < 0 || own(x + 1, y) < 0 || own(x, y - 1) < 0 || own(x, y + 1) < 0) {
        dot(b, x, y, outline);
        continue;
      }
      const [nx, ny] = norm(c, x, y);
      const up = own(x, y - 1);
      const left = own(x - 1, y);
      if (((up >= 0 && up < i) || (left >= 0 && left < i)) && ny < 0.2) {
        dot(b, x, y, ramp.deep);
        continue;
      }
      const light = -0.55 * nx - 0.75 * ny + 0.35 * (1 - Math.hypot(nx, ny));
      const tone = light > 0.62 ? ramp.hi : light > 0.3 ? ramp.light : light > -0.05 ? ramp.base : light > -0.4 ? ramp.mid : ramp.dark;
      dot(b, x, y, tone);
    }
}

/** Trees fill the gaps towards neighbouring trees with forest shade so woods read as one dense mass. */
function tree(e: number): Bitmap[] {
  const b = canvas(S, S);
  stamp(b, [
    'oTto',
    'oTto',
    'oTko',
    'okko',
  ], { o: WOOD.deep, T: WOOD.base, t: WOOD.mid, k: WOOD.dark }, 6, 12);
  blobs(b, [
    { cx: 8, cy: 4.4, rx: 5.8, ry: 4.6 },
    { cx: 3.9, cy: 7.6, rx: 4.3, ry: 4.1 },
    { cx: 12.1, cy: 7.6, rx: 4.3, ry: 4.1 },
    { cx: 8, cy: 9.4, rx: 5, ry: 3.6 },
  ], TREE, TREE.outline);
  for (const [x, y] of [[6, 2], [3, 6], [11, 5], [7, 8], [5, 3]] as const) dot(b, x, y, TREE.hi);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (getPixel(b, x, y)[3] > 0) continue;
      const dx = x < 8 ? x : S - 1 - x;
      const dy = y < 8 ? y : S - 1 - y;
      const side = dx <= dy ? (x < 8 ? EDGE_W : EDGE_E) : y < 8 ? EDGE_N : EDGE_S;
      if (!has(e, side)) dot(b, x, y, TREE.deep);
    }
  return [b];
}

/** Faceted grey boulder: lit top plane, front and shaded right face, dark footing, cast shadow. */
function rock(): Bitmap[] {
  const b = canvas(S, S);
  stamp(b, [
    '................',
    '................',
    '.....ooooo......',
    '...oohhhhhoo....',
    '..ohhhhhhhllo...',
    '.ohhhhhhllllmo..',
    '.ohhhhhllllmmdo.',
    'olhhhllllllmmdo.',
    'olllllllllkmmddo',
    'obbbbbbbbkmmdddo',
    'obbbmbbbbkmmdddo',
    'obbbbbbbkmmmmddo',
    'ombbbbbbkmmdddko',
    '.okkkkkkkkkkkko.',
    '..ooooooooooo...',
    '................',
  ].map((r) => r.slice(0, 15) + '.'), { o: STONE.deep, h: STONE.hi, l: STONE.light, b: STONE.base, m: STONE.mid, d: STONE.dark, k: STONE.deep }, 0, 0);
  castShadow(b);
  return [b];
}

/** Ice boulder: three crystal prisms on a flat footing with a cast shadow (not a jelly blob). */
function iceRock(): Bitmap[] {
  const b = canvas(S, S);
  stamp(b, [
    '................',
    '.......oo.......',
    '......ohmo......',
    '.....ohlmdo.....',
    '.....ohlmdo.oo..',
    '.....ohlmdooldo.',
    '..oo.ohlmdooldo.',
    '.ohmoohhmdoohdo.',
    'ohlmdohlhdoldoo.',
    'ohlmdohlmhdolmo.',
    'ohhmdohlmddolmo.',
    'olhmdohlmddolmo.',
    'ollmdollmddommo.',
    'odddddddddddddo.',
    'ooooooooooooooo.',
    '................',
  ], { o: ICE.deep, h: ICE.hi, l: ICE.light, b: ICE.base, m: ICE.mid, d: ICE.dark }, 0, 0);
  castShadow(b);
  return [b];
}

/** Translucent ground shadow hugging the right side and bottom of an object (light from the top-left). */
function castShadow(b: Bitmap, rows = 4): void {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && getPixel(b, x, y)[3] === 255;
  for (let y = S - rows; y < S; y++)
    for (let x = 1; x < S; x++)
      if (!solid(x, y) && (solid(x - 1, y - 1) || solid(x - 1, y) || solid(x, y - 1))) dot(b, x, y, SHADOW);
}

function sign(): Bitmap[] {
  const pal: Pal = { o: WOOD.deep, d: WOOD.dark, m: WOOD.mid, b: WOOD.base, l: WOOD.light, h: WOOD.hi };
  return [stampRows([
    '................',
    '................',
    '.oooooooooooooo.',
    'ohhhhhhhhhhhhhlo',
    'ohlllllllllllbmo',
    'ohlddddlddddlbmo',
    'ohllllllllllbbmo',
    'ohldddldddddbbmo',
    'ohlbbbbbbbbbbbmo',
    'olmmmmmmmmmmmmdo',
    '.ooooooblooooo..',
    '......oldo......',
    '......oldo......',
    '......oldo......',
    '.....oobddo.....',
    '......oooo......',
  ], pal)];
}

function fence(e: number): Bitmap[] {
  const b = canvas(S, S);
  const left = !has(e, EDGE_W);
  const right = !has(e, EDGE_E);
  const rail = (x0: number, x1: number, y: number) => {
    rect(b, x0, y - 1, x1 - x0 + 1, 1, WOOD.deep);
    rect(b, x0, y, x1 - x0 + 1, 1, WOOD.light);
    rect(b, x0, y + 1, x1 - x0 + 1, 1, WOOD.mid);
    rect(b, x0, y + 2, x1 - x0 + 1, 1, WOOD.deep);
  };
  // rails only run towards connected neighbours; a lone post (mask 15) stays a post
  for (const y of [5, 10]) {
    if (left) rail(0, 7, y);
    if (right) rail(8, 15, y);
  }
  const vRail = (y0: number, y1: number) => {
    rect(b, 7, y0, 1, y1 - y0, WOOD.light);
    rect(b, 8, y0, 1, y1 - y0, WOOD.mid);
  };
  if (!has(e, EDGE_N)) vRail(0, 3);
  if (!has(e, EDGE_S)) vRail(14, 16);
  // post
  stamp(b, [
    '.oo.',
    'ohlo',
    'olbo',
    'olmo',
    'olmo',
    'olmo',
    'olmo',
    'olmo',
    'olmo',
    'olmo',
    'olmo',
    'oldo',
    '.oo.',
  ], { o: WOOD.deep, h: WOOD.hi, l: WOOD.light, b: WOOD.base, m: WOOD.mid, d: WOOD.dark }, 6, 2);
  return [b];
}

/**
 * One-way ledge on grass (opaque): upper grass, a bright overhanging lip, a 4px earth face
 * and a shadow band on the lower grass, so the drop to the south reads at a glance.
 */
function ledge(e: number): Bitmap[] {
  const b = grassBase();
  const ends = [has(e, EDGE_W) ? 0 : -1, has(e, EDGE_E) ? S - 1 : -1];
  /** 0 = ledge end column, 1 = next to it, 2+ = inside. */
  const fromEnd = (x: number) => Math.min(...ends.filter((c) => c >= 0).map((c) => Math.abs(x - c)), 9);
  for (let x = 0; x < S; x++) {
    const d = fromEnd(x);
    if (d === 0) continue; // plain grass where the ledge ends
    const blade = x % 5 === 1 || x % 7 === 4;
    dot(b, x, 8, d === 1 ? GRASS.light : x % 4 === 2 ? GRASS.light : GRASS.hi);
    dot(b, x, 9, d === 1 ? GRASS.mid : x % 3 === 0 ? GRASS.base : GRASS.light);
    dot(b, x, 10, d === 1 ? GRASS.dark : blade ? GRASS.mid : PATH.mid);
    dot(b, x, 11, d === 1 ? GRASS.deep : blade && x % 5 === 1 ? GRASS.dark : PATH.dark);
    dot(b, x, 12, d === 1 ? GRASS.deep : hash(x, 12, 31) < 0.2 ? PATH.mid : PATH.dark);
    dot(b, x, 13, d === 1 ? GRASS.deep : PATH.deep);
    if (d > 1 || x === 0 || x === S - 1) {
      blendDot(b, x, 14, SHADOW);
      blendDot(b, x, 14, SHADOW);
      if (d > 1) blendDot(b, x, 15, SHADOW);
    }
  }
  return [b];
}

/** Rock face (seamless): tall, uneven slabs so it reads vertical rather than as a stacked wall. */
function slabFace(ramp: Ramp, outline: string): Bitmap {
  const b = canvas(S, S, outline);
  blobs(b, [
    { cx: 2.5, cy: 3, rx: 4.2, ry: 7 },
    { cx: 9.5, cy: 1, rx: 4.6, ry: 6 },
    { cx: 14.5, cy: 7, rx: 3.6, ry: 6.5 },
    { cx: 6.5, cy: 10.5, rx: 4.4, ry: 6.5 },
    { cx: 12, cy: 14, rx: 4, ry: 5 },
  ], ramp, outline, { wrap: true });
  return b;
}

const cliffRock = () => slabFace(ROCK, ROCK.deep);

/** One step darker along a ramp (for the shaded lower face of cliffs). */
function darker(r: Ramp): Pal {
  return { [r.hi]: r.light, [r.light]: r.base, [r.base]: r.mid, [r.mid]: r.dark, [r.dark]: r.deep };
}

/**
 * Raised rock: where the cliff starts (N edge) a flat, lit top surface with a bright rim;
 * where it ends (S edge) a darker foot and a cast shadow on the ground below.
 */
function cliff(e: number): Bitmap[] {
  const b = cliffRock();
  if (has(e, EDGE_S)) {
    // lower face in shade: recolour rows 8.. one step darker
    const dark = recolor(b, darker(ROCK));
    for (let y = 8; y < S; y++) for (let x = 0; x < S; x++) setPixel(b, x, y, getPixel(dark, x, y));
  }
  for (let x = 0; x < S; x++) {
    if (has(e, EDGE_N)) {
      const top = wave(EDGE_N, x) > 1 ? 1 : 0;
      const rim = 4 + (wave(EDGE_S, x + 5) > 1 ? 1 : 0);
      for (let y = 0; y < top; y++) clearPixel(b, x, y);
      for (let y = top; y < rim; y++) dot(b, x, y, hash(x, y, 13) < 0.12 ? ROCK.base : hash(x, y, 14) < 0.1 ? ROCK.hi : ROCK.light);
      dot(b, x, top, ROCK.hi);
      dot(b, x, rim, ROCK.hi);
      dot(b, x, rim + 1, ROCK.dark);
    }
    if (has(e, EDGE_S)) {
      const foot = 13 - (wave(EDGE_S, x) > 1 ? 1 : 0);
      dot(b, x, foot, ROCK.deep);
      for (let y = foot + 1; y < S; y++) {
        clearPixel(b, x, y);
        dot(b, x, y, y === foot + 1 ? SHADOW_DEEP : SHADOW);
      }
    }
  }
  if (has(e, EDGE_W)) for (let y = 0; y < S; y++) if (getPixel(b, 0, y)[3] === 255) dot(b, 0, y, ROCK.light);
  if (has(e, EDGE_E)) for (let y = 0; y < S; y++) if (getPixel(b, S - 1, y)[3] === 255) dot(b, S - 1, y, ROCK.deep);
  // round the outer corners
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const hit = edgeHit(e, x, y, 2);
      if (hit && hit.t < 0) clearPixel(b, x, y);
    }
  return [b];
}

function bridge(e: number): Bitmap[] {
  const b = canvas(S, S, WOOD.base);
  const vertical = has(e, EDGE_E) && has(e, EDGE_W) && !(has(e, EDGE_N) && has(e, EDGE_S));
  // planks run across the walking direction
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < S; j++) {
      const k = i % 4;
      const col = k === 0 ? WOOD.light : k === 3 ? WOOD.dark : hash(i >> 2, j, 5) < 0.15 ? WOOD.mid : WOOD.base;
      if (vertical) dot(b, j, i, col);
      else dot(b, i, j, col);
    }
  }
  // nail heads
  for (let i = 1; i < S; i += 4) {
    if (vertical) {
      dot(b, 3, i, WOOD.deep);
      dot(b, 12, i, WOOD.deep);
    } else {
      dot(b, i, 3, WOOD.deep);
      dot(b, i, 12, WOOD.deep);
    }
  }
  // rails along the water sides
  const railSides = vertical ? [EDGE_W, EDGE_E] : [EDGE_N, EDGE_S];
  for (const side of railSides) {
    if (!has(e, side)) continue;
    for (let a = 0; a < S; a++) {
      const post = a % 8 === 3 || a % 8 === 4;
      const px = (t: number) => (side === EDGE_N ? [a, t] : side === EDGE_S ? [a, S - 1 - t] : side === EDGE_W ? [t, a] : [S - 1 - t, a]) as [number, number];
      const [x0, y0] = px(0);
      const [x1, y1] = px(1);
      const [x2, y2] = px(2);
      dot(b, x0, y0, WOOD.deep);
      dot(b, x1, y1, post ? WOOD.hi : WOOD.light);
      dot(b, x2, y2, post ? WOOD.light : WOOD.deep);
    }
  }
  return [b];
}

// ---------------------------------------------------------------------------
// Cave
// ---------------------------------------------------------------------------

function caveFloor(): Bitmap[] {
  const b = canvas(S, S, CAVE.base);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = hash(x, y, 21);
      if (n < 0.08) dot(b, x, y, CAVE.mid);
      else if (n > 0.96) dot(b, x, y, CAVE.light);
    }
  for (const [x, y] of [[3, 3], [11, 6], [6, 12], [14, 13]] as const)
    stampWrap(b, ['lb', 'bd'], { l: CAVE.light, b: CAVE.base, d: CAVE.dark }, x, y);
  stampWrap(b, ['m...', '.mm.', '...m'], { m: CAVE.mid }, 8, 1);
  stampWrap(b, ['.m', 'm.', 'm.'], { m: CAVE.mid }, 1, 8);
  return [b];
}

const CAVE_ROCK: Ramp = { hi: CAVE.light, light: CAVE.base, base: CAVE.mid, mid: CAVE.dark, dark: CAVE.deep, deep: CAVE.deepest };

/**
 * Cave walls: an uneven rock mass seen from above (one big lump, smaller ones, cracks — no
 * egg-carton grid); where the floor lies to the south, a lit slab face like outdoor cliffs.
 */
function caveWall(e: number): Bitmap[] {
  const b = canvas(S, S, CAVE.deepest);
  blobs(b, [
    { cx: 6, cy: 6.5, rx: 7, ry: 6 },
    { cx: 14.5, cy: 2, rx: 3.6, ry: 3.2 },
    { cx: 13.5, cy: 11, rx: 4.8, ry: 4.2 },
    { cx: 3, cy: 15, rx: 3.8, ry: 2.8 },
    { cx: 9.5, cy: 15.5, rx: 2.8, ry: 2.2 },
  ], CAVE_ROCK, CAVE.deepest, { wrap: true });
  for (const [x, y] of [[3, 8], [4, 8], [5, 9], [6, 10], [9, 3], [10, 4]] as const) dot(b, x, y, CAVE.deep);
  if (has(e, EDGE_S)) {
    const face = slabFace(CAVE_ROCK, CAVE.deepest);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const top = 6 + wave(EDGE_S, x);
        if (y < top) continue;
        setPixel(b, x, y, getPixel(face, x, y));
        if (y === top) dot(b, x, y, CAVE.light);
        if (y === top - 1) dot(b, x, y, CAVE.deepest);
        if (y === S - 1) dot(b, x, y, CAVE.deepest);
      }
  }
  if (has(e, EDGE_N)) for (let x = 0; x < S; x++) dot(b, x, 0, x % 3 === 0 ? CAVE.base : CAVE.light);
  if (has(e, EDGE_W)) rect(b, 0, 0, 1, S, CAVE.dark);
  if (has(e, EDGE_E)) rect(b, S - 1, 0, 1, S, CAVE.deepest);
  return [b];
}

/** Dark opening in a rock face: the outdoor cliff, or (inside caves) the cave wall it sits in. */
function caveEntrance(e: number, cave = false): Bitmap[] {
  const b = cave ? caveWall(e)[0]! : cliff(e)[0]!;
  const rim = cave ? CAVE.deepest : ROCK.deep;
  stamp(b, [
    '....dddddd....',
    '...dooooood...',
    '..doxxxxxxod..',
    '.doxxxxxxxxod.',
    '.doxxxxxxxxod.',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
    'doxxxxxxxxxxod',
  ], { d: rim, o: '#201814', x: '#080604' }, 1, 4);
  return [b];
}

// ---------------------------------------------------------------------------
// Indoor
// ---------------------------------------------------------------------------

/**
 * Indoor wall face, stackable: the cornice only where the wall starts (N edge), the baseboard
 * only where it meets the floor (S edge), so walls can be one or several tiles tall.
 */
function wallBase(e: number): Bitmap {
  const b = canvas(S, S, INDOOR.wall);
  for (let x = 0; x < S; x += 4) rect(b, x, 0, 1, S, INDOOR.wallMid);
  for (let x = 1; x < S; x += 4) rect(b, x, 0, 1, S, INDOOR.wallHi);
  if (has(e, EDGE_N)) {
    rect(b, 0, 0, S, 1, INDOOR.trimDark);
    rect(b, 0, 1, S, 1, INDOOR.trim);
    rect(b, 0, 2, S, 1, INDOOR.wallDark);
  }
  if (has(e, EDGE_S)) {
    rect(b, 0, 12, S, 1, INDOOR.wallDark);
    rect(b, 0, 13, S, 1, INDOOR.trimHi);
    rect(b, 0, 14, S, 1, INDOOR.trim);
    rect(b, 0, 15, S, 1, INDOOR.trimDark);
  }
  return b;
}

function wall(e: number): Bitmap[] {
  return [wallBase(e)];
}

function wallWindow(e: number): Bitmap[] {
  const b = wallBase(e);
  stamp(b, [
    'oooooooooo',
    'ohhhhhhhho',
    'ohGgggggwo',
    'ohgGggggwo',
    'ohggggggwo',
    'ohwwwwwwwo',
    'ohggggGgwo',
    'ohgggGggwo',
    'owwwwwwwwo',
    'oooooooooo',
  ], { o: INDOOR.trimDark, h: '#ffffff', w: INDOOR.wallMid, g: INDOOR.glass, G: INDOOR.glassHi }, 3, 2);
  return [b];
}

function shelf(): Bitmap[] {
  const b = canvas(S, S, WOOD.dark);
  rect(b, 0, 0, S, 1, WOOD.deep);
  rect(b, 0, 1, S, 1, WOOD.light);
  rect(b, 0, 15, S, 1, WOOD.deep);
  rect(b, 0, 1, 1, 15, WOOD.mid);
  rect(b, S - 1, 1, 1, 15, WOOD.deep);
  const colors = ['#d85050', '#4878d0', '#58a850', '#e0b040', '#9060b0', '#e88040', '#40a0a0'];
  const books = (y: number, h: number, seed: number) => {
    let x = 1;
    let i = seed;
    while (x < S - 1) {
      const w = 1 + (i % 3 === 0 ? 1 : 0);
      const bh = h - ((i * 7) % 3 === 0 ? 1 : 0);
      const c = colors[(i * 5 + seed) % colors.length]!;
      if ((i * 3) % 7 !== 6) {
        rect(b, x, y + (h - bh), Math.min(w, S - 1 - x), bh, c);
        dot(b, x, y + (h - bh), '#f8f0e0');
      }
      x += w;
      i++;
    }
    rect(b, 1, y + h, S - 2, 1, WOOD.light);
    rect(b, 1, y + h + 1, S - 2, 1, WOOD.mid);
  };
  books(2, 5, 1);
  books(9, 4, 4);
  return [b];
}

/** Long floorboards: boards in slightly different tones, soft seams, grain streaks, one soft butt joint (no brick bond). */
function floorWood(): Bitmap[] {
  const b = canvas(S, S);
  const tones = [INDOOR.floor, FLOOR_LIGHT, INDOOR.floor, FLOOR_WARM];
  for (let k = 0; k < 4; k++) {
    const y = k * 4;
    rect(b, 0, y, S, 3, tones[k]!);
    rect(b, 0, y + 3, S, 1, INDOOR.floorMid);
    // grain: a few streaks along the board, one small highlight
    for (let i = 0; i < 2; i++) {
      const x0 = Math.floor(hash(i, k, 10) * S);
      const len = 3 + Math.floor(hash(i, k, 11) * 4);
      for (let j = 0; j < len; j++) dotWrap(b, x0 + j, y + 1 + ((i + k) & 1), INDOOR.floorMid);
    }
    const hx = Math.floor(hash(k, 3, 12) * S);
    dotWrap(b, hx, y, INDOOR.floorHi);
    dotWrap(b, hx + 1, y, INDOOR.floorHi);
  }
  rect(b, 10, 4, 1, 3, INDOOR.floorDark);
  dot(b, 11, 4, INDOOR.floorHi);
  return [b];
}

const FLOOR_LIGHT = '#e8bf8c';
const FLOOR_WARM = '#d8ab78';

function floorTile(): Bitmap[] {
  const b = canvas(S, S);
  for (let q = 0; q < 4; q++) {
    const x0 = (q % 2) * 8;
    const y0 = Math.floor(q / 2) * 8;
    const c = (q === 0 || q === 3) ? INDOOR.tileA : INDOOR.tileB;
    rect(b, x0, y0, 8, 8, c);
    rect(b, x0, y0 + 7, 8, 1, INDOOR.tileLine);
    rect(b, x0 + 7, y0, 1, 8, INDOOR.tileLine);
    dot(b, x0 + 1, y0 + 1, '#ffffff');
    dot(b, x0 + 2, y0 + 1, '#ffffff');
    dot(b, x0 + 1, y0 + 2, '#ffffff');
  }
  return [b];
}

function carpet(e: number): Bitmap[] {
  const b = canvas(S, S, INDOOR.carpet);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.abs(((x + 4) % 8) - 4);
      const dy = Math.abs(((y + 4) % 8) - 4);
      if (dx + dy === 3) dot(b, x, y, INDOOR.carpetMid);
      if (dx + dy === 0) dot(b, x, y, INDOOR.carpetGold);
    }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const hit = edgeHit(e, x, y);
      if (!hit) continue;
      const col = [INDOOR.carpetDark, INDOOR.carpetGold, INDOOR.carpetGoldDark, INDOOR.carpet, INDOOR.carpetDark][hit.t];
      if (col) dot(b, x, y, col);
    }
  return [b];
}

function mat(): Bitmap[] {
  const b = canvas(S, S);
  rect(b, 1, 4, 14, 10, '#7c3c34');
  rect(b, 2, 5, 12, 8, '#b85a48');
  for (let y = 6; y < 12; y += 2) rect(b, 3, y, 10, 1, '#d88868');
  rect(b, 1, 13, 14, 1, '#58281e');
  return [b];
}

/**
 * Furniture that merges with same-tile neighbours on all sides (tables, counters):
 * the top surface continues into merged sides; the front (and legs) only show where
 * the south neighbour differs.
 */
function furniture(e: number, top: Ramp, front: Ramp, y0: number, topRows: number, frontRows: number): Bitmap {
  const b = canvas(S, S);
  const l = has(e, EDGE_W) ? 1 : 0;
  const r = has(e, EDGE_E) ? S - 2 : S - 1;
  const w = r - l + 1;
  const openN = !has(e, EDGE_N);
  const openS = !has(e, EDGE_S);
  const surfTop = openN ? 0 : y0;
  const surfEnd = openS ? S : y0 + topRows; // exclusive
  rect(b, l, surfTop, w, surfEnd - surfTop, top.light);
  for (let x = l; x <= r; x++) if (hash(x, 3, 17) < 0.2) dot(b, x, y0 + 3 + (x % 3), top.base);
  if (!openN) {
    rect(b, l, y0, w, 1, top.deep);
    rect(b, l, y0 + 1, w, 1, top.hi);
  }
  let bottom = S - 1;
  if (!openS) {
    rect(b, l, surfEnd - 1, w, 1, top.base);
    rect(b, l, surfEnd, w, frontRows, front.mid);
    rect(b, l, surfEnd, w, 1, front.light);
    rect(b, l, surfEnd + frontRows, w, 1, front.deep);
    bottom = surfEnd + frontRows;
  }
  if (has(e, EDGE_W)) rect(b, 0, surfTop, 1, bottom - surfTop + 1, top.deep);
  if (has(e, EDGE_E)) rect(b, S - 1, surfTop, 1, bottom - surfTop + 1, top.deep);
  if (has(e, EDGE_W)) rect(b, 1, surfTop + (openN ? 0 : 1), 1, surfEnd - surfTop - (openN ? 0 : 1), top.hi);
  return b;
}

function table(e: number): Bitmap[] {
  const b = furniture(e, WOOD, WOOD, 1, 10, 2);
  if (has(e, EDGE_S)) {
    const legs = ['dk', 'dk', 'oo'];
    const pal = { d: WOOD.dark, k: WOOD.deep, o: WOOD.deep };
    if (has(e, EDGE_W)) stamp(b, legs, pal, 1, 14);
    if (has(e, EDGE_E)) stamp(b, legs, pal, S - 3, 14);
  }
  return [b];
}

const COUNTER_TOP: Ramp = { hi: '#ffffff', light: '#f4f0e4', base: '#dcd4c0', mid: '#c4b8a0', dark: '#a09478', deep: '#6c6050' };
const COUNTER_FRONT: Ramp = { hi: INDOOR.tealLight, light: INDOOR.tealLight, base: INDOOR.teal, mid: INDOOR.teal, dark: INDOOR.tealDark, deep: INDOOR.tealDeep };

function counter(e: number): Bitmap[] {
  const b = furniture(e, COUNTER_TOP, COUNTER_FRONT, 1, 6, 8);
  if (has(e, EDGE_S)) {
    // recessed front panel
    const l = has(e, EDGE_W) ? 3 : 2;
    const r = has(e, EDGE_E) ? S - 4 : S - 3;
    rect(b, l, 9, r - l + 1, 1, INDOOR.tealDark);
    rect(b, l, 10, 1, 4, INDOOR.tealDark);
    rect(b, l + 1, 13, r - l, 1, INDOOR.tealLight);
    rect(b, r, 10, 1, 4, INDOOR.tealLight);
    rect(b, l + 1, 10, r - l - 1, 3, INDOOR.tealMid);
  }
  return [b];
}

function healMachine(): Bitmap[] {
  const pal: Pal = {
    o: INDOOR.tealDeep, w: '#fcfcfc', g: STONE.light, s: STONE.base, t: INDOOR.teal, T: INDOOR.tealDark,
    a: '#d8f4f8', A: '#90c8d8', e: '#78e088', E: '#38a058', H: '#f0fff4',
  };
  return [stampRows([
    '................',
    '....oooooooo....',
    '...oaaHaaaaAo...',
    '..oaHeEaHeEaAo..',
    '..oaeEEaeEEaAo..',
    '..oAaaHeEaaAAo..',
    '...oAAeEEAAAo...',
    '.oooooooooooooo.',
    'owwwwwwwwwwwwwgo',
    'owttttttttttttso',
    'owTTTTTTTTTTTTso',
    'owwwwwwwwwwwwwso',
    'owwgggwwHHwwggso',
    'owggggggggggggso',
    'ossssssssssssss.',
    '.oooooooooooooo.',
  ], pal)];
}

function pc(): Bitmap[] {
  const pal: Pal = {
    o: INDOOR.metalDeep, g: INDOOR.metal, m: INDOOR.metalMid, d: INDOOR.metalDark, S: INDOOR.screen, H: INDOOR.screenHi,
    D: INDOOR.screenDark, w: WOOD.light, W: WOOD.mid, k: WOOD.deep, h: WOOD.hi,
  };
  return [stampRows([
    '................',
    '..oooooooooooo..',
    '..oggggggggggmo.',
    '..ogDDDDDDDDdmo.',
    '..ogDHSSSSSSdmo.',
    '..ogDSHHSHHSdmo.',
    '..ogDSSSSSSSdmo.',
    '..ogDSHHHSHSdmo.',
    '..ogddddddddddo.',
    '..oommmmmmmmmoo.',
    'kkkkkkooookkkkkk',
    'khhhhhhhhhhhhhhk',
    'kwwogogogogowwWk',
    'kwwoooooooooowWk',
    'kWWWWWWWWWWWWWWk',
    'kkkkkkkkkkkkkkkk',
  ], pal)];
}

function bed(): Bitmap[] {
  const pal: Pal = {
    o: WOOD.deep, h: WOOD.hi, l: WOOD.light, m: WOOD.mid, d: WOOD.dark, s: '#f4f4f8', S: '#d0d4e4', p: '#ffffff', P: '#c8cce0',
    B: '#a0c4fc', b: '#5c8ce4', q: '#7ca4f4', k: '#3c64b8',
  };
  return [stampRows([
    '.oooooooooooooo.',
    'ohhhhhhhhhhhhhlo',
    'ollllllllllllldo',
    'oddddddddddddddo',
    'olsppppppppppSdo',
    'olspppppppppPSdo',
    'olsPPPPPPPPPPSdo',
    'olBBBBBBBBBBBBdo',
    'olkkkkkkkkkkkkdo',
    'olbbqbbbqbbbqbdo',
    'olbqqqbqqqbqqqdo',
    'olbbqbbbqbbbqkdo',
    'olbbbbbbbbbbbkdo',
    'olkkkkkkkkkkkkdo',
    'ohllllllllllllmo',
    '.oooooooooooooo.',
  ], pal)];
}

function plant(): Bitmap[] {
  const b = canvas(S, S);
  blobs(b, [
    { cx: 8, cy: 3.8, rx: 3.4, ry: 3.4 },
    { cx: 4.6, cy: 6.4, rx: 3.6, ry: 3.2 },
    { cx: 11.4, cy: 6.4, rx: 3.6, ry: 3.2 },
    { cx: 8, cy: 8, rx: 4, ry: 3 },
  ], TREE, TREE.outline);
  stamp(b, [
    'oooooooooo',
    'ohhlllllmo',
    '.olllllmo.',
    '.ollllmmo.',
    '.olmmmmdo.',
    '..oooooo..',
  ], { o: '#6c2c18', h: '#f8a880', l: '#e07850', m: '#b85838', d: '#8c3c24' }, 3, 10);
  return [b];
}

function stairs(): Bitmap[] {
  const b = canvas(S, S, INDOOR.trimDark);
  const steps = [
    { y: 1, top: WOOD.mid, front: WOOD.dark },
    { y: 5, top: WOOD.base, front: WOOD.mid },
    { y: 9, top: WOOD.light, front: WOOD.base },
    { y: 13, top: WOOD.hi, front: WOOD.light },
  ];
  rect(b, 0, 0, S, 1, '#000000');
  for (const s of steps) {
    rect(b, 1, s.y, S - 2, 2, s.top);
    rect(b, 1, s.y + 2, S - 2, 1, s.front);
    rect(b, 1, s.y + 3, S - 2, 1, WOOD.deep);
  }
  rect(b, 0, 0, 1, S, WOOD.deep);
  rect(b, S - 1, 0, 1, S, WOOD.deep);
  return [b];
}

/** Polished slabs; quarter inlays in every corner join into diamonds where four slabs meet. */
function hallFloor(): Bitmap[] {
  const b = canvas(S, S, INDOOR.hall);
  for (let i = 0; i < 7; i++) dot(b, 9 + i, 3 + (i >> 1), INDOOR.hallMid); // marble vein
  for (let i = 0; i < 5; i++) dot(b, 2 + i, 12 - (i >> 1), INDOOR.hallMid);
  rect(b, 0, 0, S, 1, INDOOR.hallHi);
  rect(b, 0, 0, 1, S, INDOOR.hallHi);
  rect(b, 0, S - 1, S, 1, INDOOR.hallLine);
  rect(b, S - 1, 0, 1, S, INDOOR.hallLine);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.min(...[0, S].flatMap((cx) => [0, S].map((cy) => Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy))));
      if (d < 2) dot(b, x, y, INDOOR.carpetGold);
      else if (d < 4) dot(b, x, y, INDOOR.hallInlay);
      else if (d < 5) dot(b, x, y, INDOOR.hallLine);
    }
  return [b];
}

function statue(): Bitmap[] {
  const pal: Pal = { o: STONE.deep, h: STONE.hi, l: STONE.light, b: STONE.base, m: STONE.mid, d: STONE.dark };
  return [stampRows([
    '...o........o...',
    '...oo......oo...',
    '...oho....olo...',
    '...ohlooooolmo..',
    '...ohlllllllmo..',
    '...oldllllldmo..',
    '....ollllllmo...',
    '....oolllmmoo...',
    '...ohhlllllmmo..',
    '..ohhllllllmmmo.',
    '..olllllllmmmdo.',
    'oooooooooooooooo',
    'ohhhhhhhhhhhhhlo',
    'olllllllllllllmo',
    'ommmmmmmmmmmmmdo',
    'oooooooooooooooo',
  ], pal)];
}

function labMachine(): Bitmap[] {
  const pal: Pal = {
    o: INDOOR.metalDeep, g: INDOOR.metal, m: INDOOR.metalMid, d: INDOOR.metalDark, h: '#f0f0f8', S: INDOOR.screen,
    H: INDOOR.screenHi, D: INDOOR.screenDark, r: '#f04848', y: '#f8d040', G: '#60e080', t: '#98d8f0', T: '#5ca8d8',
  };
  return [stampRows([
    '...oo......oo...',
    '..otTo....otTo..',
    '..otTo....otTo..',
    'oooooooooooooooo',
    'ohhhhhhhhhhhhhgo',
    'ohgDDDDDDDggrgmo',
    'ohgDHSSSSDgyGymo',
    'ohgDSHSHSDggggmo',
    'ohgDSSSSSDgoogmo',
    'ohgDDDDDDDgoogmo',
    'ohggggggggggggmo',
    'ohgmmmmmmmmmmgmo',
    'ohgmdmdmdmdmmgmo',
    'ohgggggggggggmmo',
    'ommmmmmmmmmmmmmo',
    'oooooooooooooooo',
  ], pal)];
}

function door(e: number): Bitmap[] {
  const b = wallBase(e);
  stamp(b, [
    'oooooooooooo',
    'oDDDDDDDDDDo',
    'oDhhhhhhhhmo',
    'oDhlllllllmo',
    'oDhlbbbbblmo',
    'oDhlbbbbblmo',
    'oDhlllllllmo',
    'oDhllllllymo',
    'oDhlbbbbblmo',
    'oDhlbbbbblmo',
    'oDhlllllllmo',
    'oDhmmmmmmmmo',
    'oooooooooooo',
  ], { o: WOOD.deep, D: WOOD.dark, h: WOOD.hi, l: WOOD.light, b: WOOD.base, m: WOOD.mid, y: '#f8d040' }, 2, 3);
  return [b];
}

function flame(): Bitmap[] {
  const pedestal = (b: Bitmap) =>
    stamp(b, [
      '.oooooooooooooo.',
      'ohhhhhhhhhhhhhlo',
      '.ollllllllllmmo.',
      '..ommmmmmmmmdo..',
      '....olllmmdo....',
      '...oolllmmddo...',
      '..ohhllllmmmdo..'.slice(0, 16),
    ].map((r) => r.padEnd(16, '.')), { o: STONE.deep, h: STONE.hi, l: STONE.light, m: STONE.mid, d: STONE.dark }, 0, 9);
  return [0, 1, 2, 3].map((f) => {
    const b = canvas(S, S);
    const H = 10;
    for (let y = 0; y < H; y++) {
      const v = (y + 1) / H; // 0 at tip → 1 at base
      const sway = Math.sin(y * 0.7 + (f * Math.PI) / 2) * 1.4 * (1 - v);
      const half = 5.2 * Math.sqrt(v) * (0.9 + 0.1 * Math.sin(f * 1.7 + y));
      for (let x = 0; x < S; x++) {
        const d = Math.abs(x + 0.5 - 8 - sway) / half;
        if (d > 1) continue;
        let col: string = FLAME.outer;
        if (d < 0.35 && v > 0.45) col = FLAME.core;
        else if (d < 0.6 && v > 0.3) col = FLAME.inner;
        else if (d < 0.85) col = FLAME.mid;
        if (v < 0.25) col = d < 0.5 ? FLAME.outer : FLAME.rose;
        if (d > 0.85 && v > 0.5) col = FLAME.rose;
        dot(b, x, y, col);
      }
    }
    // sparks
    const sparks: readonly (readonly [number, number])[] = [[3, 3], [12, 1], [4, 0], [11, 4]];
    const [sx, sy] = sparks[f]!;
    dot(b, sx, sy, FLAME.inner);
    pedestal(b);
    return b;
  });
}

function voidTile(): Bitmap[] {
  return [canvas(S, S, '#000000')];
}

const BUILDERS: Record<TileId, (e: number) => readonly Bitmap[]> = {
  grass,
  tallgrass: () => [tallgrassArt()],
  path,
  flowers,
  tree,
  water,
  bridge,
  sand,
  fence,
  rock,
  ledge,
  cliff,
  sign,
  snow,
  snow_grass: () => [recolor(tallgrassArt(), FROST_MAP)],
  ice_rock: iceRock,
  cave_wall: caveWall,
  cave_floor: caveFloor,
  cave_entrance: (e) => caveEntrance(e),
  wall,
  wall_window: wallWindow,
  shelf,
  floor_wood: floorWood,
  floor_tile: floorTile,
  carpet,
  mat,
  table,
  counter,
  heal_machine: healMachine,
  pc,
  bed,
  plant,
  stairs,
  void: voidTile,
  hall_floor: hallFloor,
  statue,
  lab_machine: labMachine,
  door,
  flame,
};
