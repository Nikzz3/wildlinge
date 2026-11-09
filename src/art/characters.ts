/**
 * Overworld character sprites (16×16), trainer battle portraits (48×56 busts) and the full-body
 * intro figures of the player and the rival (48×64) and Professorin Arven (48×70).
 *
 * Everything is drawn on char canvases and colored through a per-character palette.
 * 'o' marks an outline pixel; its color is derived from the darkest neighbouring fill
 * (same hue, darkened), so palette swaps keep matching outlines.
 *
 * Sprites are stacked from row-grid layers: body template (adult, dress, child, elder, big,
 * coat, cloak) + face + hair/hat overlays + extras (backpack, scarf, apron, ...). Grid rows may
 * contain spaces (ignored) to group columns in fours. Symmetric grids (front/back views) are
 * written as 8-wide left halves and mirrored by `sym()`: an uppercase letter is the main color
 * on the left and its shade on the right, which gives the top-left light source for free.
 *
 * Portraits are built from simple shapes (ellipses, polygons), cel-shaded, then outlined: hand-made
 * functions for the story characters and leaders, parametric busts (torso + hair + hat + details)
 * for everyone else, so every trainer portrait shares the same 1px pixel scale.
 */
import { type Bitmap, createBitmap, flipX, parseColor, type Rgba, scaleNearest, setPixel } from '../core/bitmap';
import type { CharSpriteId, Dir } from '../core/types';

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

type Grid = readonly string[];

/** Main color char → shade char (used for the mirrored half of symmetric grids). */
const SHADE: Readonly<Record<string, string>> = { s: 't', h: 'i', c: 'd', a: 'b', m: 'n', p: 'q', y: 'z', k: 'l' };

const isUpper = (ch: string) => ch >= 'A' && ch <= 'Z';

/** Full-width grid; spaces are ignored. Throws if a row is not `w` wide. */
function g(w: number, rows: Grid): Grid {
  return rows.map((raw, y) => {
    const row = raw.replaceAll(' ', '');
    if (row.length !== w) throw new Error(`characters: row ${y} has length ${row.length}, expected ${w}: "${raw}"`);
    return row;
  });
}

/** Mirrors half rows into full rows. Uppercase = main color on the left, shade on the right. */
function sym(half: Grid): Grid {
  const w = half[0]?.replaceAll(' ', '').length ?? 0;
  return g(w, half).map((row) => {
    const left = [...row].map((ch) => (isUpper(ch) ? ch.toLowerCase() : ch)).join('');
    const right = [...row]
      .reverse()
      .map((ch) => (isUpper(ch) ? (SHADE[ch.toLowerCase()] ?? ch.toLowerCase()) : ch))
      .join('');
    return left + right;
  });
}

function mirror(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse().join(''));
}

function remap(grid: Grid, map: Readonly<Record<string, string>>): Grid {
  return grid.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

interface Layer {
  grid: Grid;
  x?: number;
  y?: number;
}

/** Stacks layers onto a w×h char canvas. '.' is transparent, '_' erases. */
function compose(w: number, h: number, layers: readonly Layer[]): string[][] {
  const canvas = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (const { grid, x = 0, y = 0 } of layers) {
    grid.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx++) {
        const ch = row[gx]!;
        const cy = y + gy;
        const cx = x + gx;
        if (ch === '.' || cy < 0 || cy >= h || cx < 0 || cx >= w) continue;
        canvas[cy]![cx] = ch === '_' ? '.' : ch;
      }
    });
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

type Palette = Readonly<Record<string, string>>;

function luminance([r, g, b]: Rgba): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Outline color for a fill: same hue, much darker, slightly cooled. */
function outlineFor(c: Rgba): Rgba {
  const k = Math.min(0.42, 58 / Math.max(1, luminance(c)));
  const f = (v: number, add: number) => Math.round(Math.min(255, v * k + add));
  return [f(c[0], 8), f(c[1], 6), f(c[2], 16), 255];
}

/** Chars never used as an outline source (eyes, fixed dark pixels). */
const NO_OUTLINE_SOURCE = new Set(['.', 'o', 'e', '#']);
const ORTHO: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIAG: readonly [number, number][] = [[1, -1], [1, 1], [-1, 1], [-1, -1]];

/** Converts a char canvas to a bitmap; resolves 'o' outline pixels from neighbouring fills. */
function paint(canvas: readonly (readonly string[])[], pal: Palette): Bitmap {
  const h = canvas.length;
  const w = canvas[0]?.length ?? 0;
  const out = createBitmap(w, h);
  const color = (ch: string): Rgba => {
    const hex = pal[ch];
    if (hex === undefined) throw new Error(`characters: char "${ch}" not in palette`);
    return parseColor(hex);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = canvas[y]![x]!;
      if (ch === '.') continue;
      if (ch !== 'o') {
        setPixel(out, x, y, color(ch));
        continue;
      }
      let best: Rgba | null = null;
      for (const ring of [ORTHO, DIAG]) {
        for (const [dx, dy] of ring) {
          const n = canvas[y + dy]?.[x + dx];
          if (n === undefined || NO_OUTLINE_SOURCE.has(n)) continue;
          const c = color(n);
          if (c[3] < 255) continue;
          if (!best || luminance(c) < luminance(best)) best = c;
        }
        if (best) break;
      }
      setPixel(out, x, y, best ? outlineFor(best) : color('#'));
    }
  return out;
}

// ---------------------------------------------------------------------------
// Palette slots
//   s/t skin, e eyes, w white, h/i/j hair (main/shade/light), c/d/r hat (main/shade/band),
//   a/b top, m/n accent, p/q legs, f shoes, k/l pack, x strap, y/z coat, u shirt under coat,
//   g glass/emblem, # fallback dark outline
// ---------------------------------------------------------------------------

const BASE_PAL: Palette = {
  '#': '#282038',
  s: '#f8d0a8', t: '#e0a070', e: '#283050', w: '#f8f8f8',
  h: '#805838', i: '#5c3c24', j: '#a87850',
  c: '#d04040', d: '#a02828', r: '#f8f8f8',
  a: '#5888d8', b: '#3c60a8',
  m: '#e8c040', n: '#b88c20',
  p: '#505870', q: '#383e54',
  f: '#604838',
  k: '#a07048', l: '#785030', x: '#604030',
  y: '#f0f0f0', z: '#c0c8d0', u: '#5888d8',
  g: '#a0e0f0',
};

// ---------------------------------------------------------------------------
// Heads (9 rows from headY). Face base + hair/hat overlays. Views: down, up, right.
// ---------------------------------------------------------------------------

type View = 'down' | 'up' | 'right';
type Views = Readonly<Record<View, Grid>>;

const FACE: Views = {
  down: sym([
    '.... .ooo',
    '...o oSss',
    '..oS ssss',
    '..oS ssss',
    '..oS ssss',
    '..oS sess',
    '..oS sess',
    '...o Ssss',
    '.... oooo',
  ]),
  up: sym([
    '.... .ooo',
    '...o oSss',
    '..oS ssss',
    '..oS ssss',
    '..oS ssss',
    '..oS ssss',
    '..oS ssss',
    '...o Ssss',
    '.... oooo',
  ]),
  right: g(16, [
    '.... .ooo ooo. ....',
    '...o osss ssso o...',
    '..os ssss ssss so..',
    '..os ssss ssss so..',
    '..os ssss ssss so..',
    '..os ssss ssse so..',
    '..os ssss ssse sso.',
    '...o ssss ssss to..',
    '.... oooo oooo ....',
  ]),
};

const HEADS = {
  short: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhsh',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jhhh hhhh ho..',
      '..oh hhhh hhhh io..',
      '..oh hhhh hhhs io..',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },
  spiky: {
    down: g(16, [
      '.... o..o o..o ....',
      '...o hooh hooh o...',
      '..oh jhhh hhhh ho..',
      '.ohh hhhh hhhh hio.',
      '..oh hshh hhsh io..',
      '..oh .... .... io..',
    ]),
    up: g(16, [
      '.... o..o o..o ....',
      '...o hooh hooh o...',
      '..oh jhhh hhhh ho..',
      '.ohh hhhh hhhh hio.',
      '..oh hhhh hhhh io..',
      '.ohh hhhh hhhh hio.',
      '..oh hhhh hhhh io..',
      '...o hhhh hhhi o...',
    ]),
    right: g(16, [
      '.... .o.. o..o ....',
      '...o ohoo hooh o...',
      '..oh hhhh hhhh ho..',
      '.ohj hhhh hhhh ho..',
      'ohhh hhhh hhhh io..',
      '.ohh hhhh hhsh io..',
      'ohhh hhhh .... ....',
      '.ooh hhh. .... ....',
    ]),
  },
  beanie: {
    down: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccc',
      '..oC cccc',
      '..or drdr',
      '..oH ....',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccc',
      '..oC cccc',
      '..or drdr',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o occc ccco o...',
      '..oc cccc cccc co..',
      '.odc cccc cccc co..',
      '.odr drdr drdr do..',
      '.ooh hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },

  bunlong: {
    down: sym([
      '.... ..oo',
      '...o oojh',
      '..oh hoii',
      '..oH hhoo',
      '..oH hhss',
      '..oH ....',
      '.oHH ....',
      '.ohh ....',
      '.ohh ....',
      '.oho ....',
      '..o. ....',
    ]),
    up: sym([
      '.... ..oo',
      '...o oojh',
      '..oh hohh',
      '..oH hhoo',
      '..oH hhhh',
      '..oH hhhh',
      '.oHH hhhh',
      '.ohH hhhh',
      '.ohH hhhh',
      '.ohh hhhh',
      '..oo oooo',
    ]),
    right: g(16, [
      '.oo. .ooo ooo. ....',
      'ojho ohhh hhho o...',
      'ohhi ohhh hhhh ho..',
      '.ooh hhhh hhhh io..',
      '..oh hhhh hhss so..',
      '..oh hhhh .... ....',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '..oh hhho .... ....',
      '..oh hho. .... ....',
      '...o oo.. .... ....',
    ]),
  },

  bun: {
    down: sym([
      '.... ..oo',
      '...o oojh',
      '..oh hoii',
      '..oH hhoo',
      '..oH hsss',
      '..oH ....',
    ]),
    up: sym([
      '.... ..oo',
      '...o oojh',
      '..oh hohh',
      '..oH hhoo',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.oo. .ooo ooo. ....',
      'ojho ohhh hhho o...',
      'ohhi ohhh hhhh ho..',
      '.ooh hhhh hhhh so..',
      '..oh hhhh hsss so..',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },

  ponytail: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhhs',
      '..oH ....',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhm',
      '..oH hhoh',
      '...o Hhoh',
      '.... ..oh',
      '.... ...o',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jhhh hhhh ho..',
      '..oh hhhh hhhh io..',
      'oomh hhhh hhhs io..',
      'ohho hhhh .... ....',
      'ohho hhh. .... ....',
      'ohio hh.. .... ....',
      '.ohi o... .... ....',
      '..oo .... .... ....',
    ]),
  },
  long: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhsh',
      '..oH ....',
      '.oHH ....',
      '.ohh ....',
      '.ohh ....',
      '.oho ....',
      '..o. ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '.oHH hhhh',
      '.ohH hhhh',
      '.ohH hhhh',
      '.ohh hhhh',
      '..oo oooo',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jhhh hhhh ho..',
      '..oh hhhh hhhh io..',
      '..oh hhhh hhhs io..',
      '..oh hhhh .... ....',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '..oh hhho .... ....',
      '..oh hho. .... ....',
      '...o oo.. .... ....',
    ]),
  },
  pigtails: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '.omH hhhh',
      'omMH hhsh',
      'ohHo ....',
      'ohHo ....',
      '.oo. ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '.omH hhhh',
      'omMH hhhh',
      'ohHH hhhh',
      'ohHH hhhh',
      '.oo. Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jhhh hhhh ho..',
      '.omh hhhh hhhh io..',
      'ommh hhhh hhsh io..',
      'ohho hhhh .... ....',
      'ohho hhh. .... ....',
      '.oo. hh.. .... ....',
    ]),
  },

  bald: {
    down: sym([
      '.... .ooo',
      '...o oSws',
      '..oS ssss',
      '..oS ssss',
      '..oH shss',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o oSws',
      '..oS ssss',
      '..oS ssss',
      '..oS ssss',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o osws ssso o...',
      '..os ssss ssss so..',
      '..os ssss ssss so..',
      '..oh hsss sshh so..',
      '..oh hhst .... ....',
      '..oh hhs. .... ....',
      '...o hs.. .... ....',
    ]),
  },
  cap: {
    down: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccr',
      '..oC cccc',
      '.oDd dddd',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccc',
      '..oC cccc',
      '..oC ccdd',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o occc ccco o...',
      '..oc cccc cccc co..',
      '..oc cccc ccrc co..',
      '..oh hccc dddd dddo',
      '..oh hhhh oooo ooo.',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },
  bucket: {
    down: sym([
      '.... .ooo',
      '...o oCcc',
      '..or rrrr',
      'oDdd dddd',
      '.ooo oooo',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o oCcc',
      '..or rrrr',
      'oDdd dddd',
      '.ooo oooo',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o occc ccco o...',
      '..or rrrr rrrr ro..',
      'oddd dddd dddd dddo',
      '.ooo oooo oooo ooo.',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },
  ranger: {
    down: sym([
      '.... ..oo',
      '.... oCcc',
      '...o Cccc',
      '.oor rrrr',
      'oDdd dddd',
      '.ooo oooo',
    ]),
    up: sym([
      '.... ..oo',
      '.... oCcc',
      '...o Cccc',
      '.oor rrrr',
      'oDdd dddd',
      '.ooo oooo',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... ..oo oo.. ....',
      '.... occc cccc o...',
      '...o cccc cccc co..',
      '.oor rrrr rrrr rooo',
      'oddd dddd dddd dddo',
      '.ooh hhhh oooo ooo.',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },
  guard: {
    down: sym([
      '.... oooo',
      '..oo CCcc',
      '.oCc cccc',
      '..or rrrm',
      '..oe eeee',
      '..oH ....',
    ]),
    up: sym([
      '.... oooo',
      '..oo CCcc',
      '.oCc cccc',
      '..or rrrr',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... oooo ooo. ....',
      '..oo cccc ccco o...',
      '.occ cccc cccc co..',
      '..or rrrr rrrr mo..',
      '..oh hhhh eeee eeo.',
      '..oh hhhh oooo oo..',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },

  goggles: {
    down: sym([
      '.... ....',
      '.... ....',
      '..om mmmm',
      '..om wgmm',
      '.... oo..',
    ]),
    up: sym([
      '.... ....',
      '.... ....',
      '..om mmmm',
      '..oM mmmm',
    ]),
    right: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '..om mmmm mmmm mo..',
      '..om mmmm mmwg mo..',
      '.... .... .ooo o...',
    ]),
  },

  hood: {
    down: sym([
      '.... .ooo',
      '...o oYyy',
      '..oY yyyy',
      '.oYy yyyy',
      '.oYy mmmm',
      '.oYm ....',
      '.oYm ....',
      '.oYm kkkk',
      '.oYy oooo',
    ]),
    up: sym([
      '.... .ooo',
      '...o oYyy',
      '..oY yyyy',
      '.oYy yyyy',
      '.oYy yyyy',
      '.oYy yyyy',
      '.oYy yyyy',
      '.oYy yyyy',
      '.oYy yyyy',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o oyyy yyyo o...',
      '..oy yyyy yyyy yo..',
      '.oyy yyyy yyyy yo..',
      '.oyy yyyy ymmm mo..',
      '.oyy yyyy m... ....',
      '.oyy yyyy m... ....',
      '.oyy yyyy mkkk ko..',
      '.oyy yyyy oooo o...',
    ]),
  },

  slick: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '.ohH hhhh',
      'ohhH hiss',
      '.oHH ....',
      'ohio ....',
      '.oHo ....',
      'ohio ....',
      '.oHo ....',
      '..o. ....',
    ]),
    up: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jjhh hhhh ho..',
      '.ohj hhhh hhhh hio.',
      'ohhh hhhh hhhh hhio',
      '.ohh hihh hhih hio.',
      'ohhh hihh hhih hhio',
      '.ohh ihhh hhhi hio.',
      'ohhh ihhh hhhi hhio',
      '.ohi hhhh hhhh iio.',
      '..oh hohh hioh io..',
      '...o o.oo oo.o o...',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj jhho o...',
      '.ooh jhhh hhhh ho..',
      'ohhh hhhh hhhh so..',
      '.ohh hhhh hhis so..',
      'oohi hhhh .... ....',
      'ohhh ihhh .... ....',
      '.ohi hhh. .... ....',
      'ohhh iho. .... ....',
      '.ohi ho.. .... ....',
      'oohh o... .... ....',
      '..oo .... .... ....',
    ]),
  },
  headband: {
    down: sym([
      '.... o..o',
      '...o hooh',
      '..oh jhhh',
      '..or rrrr',
      '..oH hshh',
      '..oH ....',
    ]),
    up: sym([
      '.... o..o',
      '...o hooh',
      '..oh jhhh',
      '..or rrrr',
      '..oH hhrr',
      '..oH hhor',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .o.. o.o. ....',
      '...o ohoo hohh o...',
      '..oh jhhh hhhh ho..',
      '.oor rrrr rrrr ro..',
      'orro hhhh hhsh io..',
      '.oro hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },
  sailor: {
    down: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccc',
      '..or rrrr',
      '..oH hhsh',
      '..oH ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o oCcc',
      '..oC cccc',
      '..or rrrr',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '...o Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o occc ccco o...',
      '..oc cccc cccc co..',
      '..or rrrr rrrr ro..',
      '..oh hhhh hhhs io..',
      '..oh hhhh .... ....',
      '..oh hhh. .... ....',
      '...o hh.. .... ....',
    ]),
  },

  furhood: {
    down: sym([
      '.... oooo',
      '..oo CcCc',
      '.oCc cccc',
      '.oCc cccc',
      '.oCc hhhh',
      '.oCo ....',
      '.oCo ....',
      '.oCo ....',
      '..oo oooo',
    ]),
    up: g(16, [
      '.... oooo oooo ....',
      '..oo cdcc cdcc oo..',
      '.occ cccc cccc ddo.',
      '.occ cdcc ccdc cdo.',
      '.occ cccc cccc cdo.',
      '.odc cccd cccc cdo.',
      '.occ cccc cdcc cdo.',
      '.ocd cccc cccc ddo.',
      '..od cdcc ccdc do..',
    ]),
    right: g(16, [
      '.... oooo oo.. ....',
      '..oo cdcc dcoo ....',
      '.occ cccc cccc o...',
      '.occ cccc cccc co..',
      '.occ cccc hhhh co..',
      '.occ ccco .... ....',
      '.occ ccco .... ....',
      '.occ ccco .... ....',
      '..oc cccc oooo o...',
    ]),
  },
  bob: {
    down: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hsss',
      '..oH ....',
      '.oHH ....',
      '..oo ....',
    ]),
    up: sym([
      '.... .ooo',
      '...o ohjh',
      '..oh jhhh',
      '..oH hhhh',
      '..oH hhhh',
      '..oH hhhh',
      '.oHH hhhh',
      '..oo Hhhh',
    ]),
    right: g(16, [
      '.... .ooo ooo. ....',
      '...o ohjj hhho o...',
      '..oh jhhh hhhh ho..',
      '..oh hhhh hhhh io..',
      '..oh hhhh hsss so..',
      '..oh hhhh .... ....',
      '.ohh hhh. .... ....',
      '..oo oo.. .... ....',
    ]),
  },

  /** Heilstation hairband with the green leaf emblem. */
  hairband: {
    down: sym([
      '.... ....',
      '.... ....',
      '..oc cccg',
    ]),
    up: sym([
      '.... ....',
      '.... ....',
      '..oc cccc',
    ]),
    right: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '..oc cccc cccg co..',
    ]),
  },
  glasses: {
    down: sym([
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... vg.v',
    ]),
    up: sym(['.... ....']),
    right: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... vvvg v...',
    ]),
  },
  beard: {
    down: sym([
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '..oH ....',
      '..oH hhhh',
      '...o Hhhh',
      '.... oooo',
    ]),
    up: sym([
      '.... ....',
    ]),
    right: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... ...h .... ....',
      '...o hhhh hhhh ho..',
      '.... ohhh hhhh o...',
      '.... .ooo ooo. ....',
    ]),
  },
  mustache: {
    down: sym([
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... ....',
      '.... .hhh',
    ]),
    up: sym(['.... ....']),
    right: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... ..hh h...',
    ]),
  },
} satisfies Record<string, Views>;

type HeadId = keyof typeof HEADS;

// ---------------------------------------------------------------------------
// Bodies (rows from bodyY to 15). Frames: down/up [stand, stepA] (stepB = mirrored stepA),
// right [stand, stepA, stepB]. The up view reuses the down grids with BACK_REMAP.
// ---------------------------------------------------------------------------

interface BodyDef {
  headY: number;
  bodyY: number;
  /** Horizontal head offset in the right view (hunched elders lean forward). */
  headDxRight?: number;
  down: readonly [Grid, Grid];
  up?: readonly [Grid, Grid];
  right: readonly [Grid, Grid, Grid];
}

/** Front-only details that become plain coat/top from behind. */
const BACK_REMAP: Readonly<Record<string, string>> = { u: 'y' };

const BODIES = {
  adult: {
    headY: 0,
    bodyY: 8,
    down: [
      sym([
        '...o oooo',
        '...o Aaaa',
        '..oa oaaa',
        '..os oaaa',
        '...o Pppp',
        '.... oPpo',
        '.... offo',
        '.... .oo.',
      ]),
      g(16, [
        '...o oooo oooo o...',
        '...o aaaa aaaa bo..',
        '..oa oaaa aaao bo..',
        '..os oaaa aaao to..',
        '...o pppp pppp qo..',
        '.... oppo offq o...',
        '.... offo .oo. ....',
        '.... .oo. .... ....',
      ]),
    ],
    right: [
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '.... oaob baao ....',
        '.... oaos taao ....',
        '.... oppp pppo ....',
        '.... .opp pqo. ....',
        '.... .fff ffo. ....',
        '.... ..oo oo.. ....',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '...o bboa aaao ....',
        '...o stoa aaao ....',
        '.... oppp pppo ....',
        '...o pppo oppp o...',
        '...o ffo. .off fo..',
        '...o oo.. ..oo oo..',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '.... oaao bbao ....',
        '.... oaao bsto ....',
        '.... oppp pppo ....',
        '.... oppo oppo ....',
        '...o ffo. offo ....',
        '...o oo.. .ooo o...',
      ]),
    ],
  },
  dress: {
    headY: 0,
    bodyY: 8,
    down: [
      sym([
        '...o oooo',
        '...o Aaaa',
        '..oa oaaa',
        '..os oaaa',
        '...o Pppp',
        '..oP pppp',
        '...o oSoo',
        '.... ofo.',
      ]),
      g(16, [
        '...o oooo oooo o...',
        '...o aaaa aaaa bo..',
        '..oa oaaa aaao bo..',
        '..os oaaa aaao to..',
        '...o pppp pppp qo..',
        '..op pppp pppp qqo.',
        '...o osoo oooo o...',
        '.... ofo. .... ....',
      ]),
    ],
    right: [
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '.... oaob baao ....',
        '.... oaos taao ....',
        '.... oppp pppo ....',
        '...o pppp pppq o...',
        '.... oooo sooo ....',
        '.... ...o ffo. ....',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '...o bboa aaao ....',
        '...o stoa aaao ....',
        '.... oppp pppo ....',
        '...o pppp pppq o...',
        '...o osoo ooso o...',
        '...o ffo. .off o...',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa aaao ....',
        '.... oaao bbao ....',
        '.... oaao bsto ....',
        '.... oppp pppo ....',
        '...o pppp pppq o...',
        '.... oso. oso. ....',
        '...o ffo. offo ....',
      ]),
    ],
  },
  child: {
    headY: 2,
    bodyY: 10,
    down: [
      sym([
        '...o oooo',
        '...o Aaaa',
        '..os oaaa',
        '...o Pppp',
        '.... oSso',
        '.... offo',
      ]),
      g(16, [
        '...o oooo oooo o...',
        '...o aaaa aaaa bo..',
        '..os oaaa aaao to..',
        '...o pppp pppp qo..',
        '.... osso ooff o...',
        '.... offo .... ....',
      ]),
    ],
    right: [
      g(16, [
        '.... oooo oooo ....',
        '.... oaab aaao ....',
        '.... oaas aaao ....',
        '.... oppp pppo ....',
        '.... .oss so.. ....',
        '.... .off ffo. ....',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... obaa aaao ....',
        '.... osaa aaao ....',
        '.... oppp pppo ....',
        '...o sso. osso ....',
        '...o ffo. .off o...',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oaaa baao ....',
        '.... oaaa saao ....',
        '.... oppp pppo ....',
        '.... osso sso. ....',
        '...o ffo. offo ....',
      ]),
    ],
  },
  elder: {
    headY: 1,
    bodyY: 9,
    headDxRight: 1,
    down: [
      sym([
        '...o oooo',
        '..oa oaaa',
        '..os oaaa',
        '...o Pppp',
        '.... oPpo',
        '.... offo',
        '.... .oo.',
      ]),
      g(16, [
        '...o oooo oooo o...',
        '..oa oaaa aaao bo..',
        '..os oaaa aaao to..',
        '...o pppp pppp qo..',
        '.... oppo offq o...',
        '.... offo .oo. ....',
        '.... .oo. .... ....',
      ]),
    ],
    right: [
      g(16, [
        '.... .ooo oooo ....',
        '.... oaaa aabo o...',
        '.... oaaa abss o...',
        '.... oppp ppol o...',
        '.... .opp qo.l ....',
        '.... .fff fo.l ....',
        '.... ..oo oo.o ....',
      ]),
      g(16, [
        '.... .ooo oooo ....',
        '.... oaaa aabo o...',
        '.... oaaa abss o...',
        '.... oppp ppol o...',
        '...o ppoo ppol ....',
        '...o ffo. offl ....',
        '...o oo.. .ooo ....',
      ]),
      g(16, [
        '.... .ooo oooo ....',
        '.... oaaa aabo o...',
        '.... oaaa abss o...',
        '.... oppp ppol o...',
        '.... oppo pqol ....',
        '...o ffo. ffol ....',
        '...o oo.. ooo. ....',
      ]),
    ],
  },
  big: {
    headY: 0,
    bodyY: 8,
    down: [
      sym([
        '..oo oooo',
        '..oA aaaa',
        '.oao aaaa',
        '.oso aaaa',
        '..oP pppp',
        '...o Ppo.',
        '..of ffo.',
        '..oo oo..',
      ]),
      g(16, [
        '..oo oooo oooo oo..',
        '..oa aaaa aaaa abo.',
        '.oao aaaa aaaa obo.',
        '.oso aaaa aaaa oto.',
        '..op pppp pppp pqo.',
        '...o ppo. offf fo..',
        '..of ffo. .ooo o...',
        '..oo oo.. .... ....',
      ]),
    ],
    right: [
      g(16, [
        '.... oooo oooo o...',
        '...o aaaa aaaa o...',
        '...o aaab baaa o...',
        '...o aaas baaa o...',
        '...o pppp pppp o...',
        '.... oppp ppqo ....',
        '.... ffff fffo ....',
        '.... oooo oooo ....',
      ]),
      g(16, [
        '.... oooo oooo o...',
        '...o aaaa aaaa o...',
        '...o abba aaaa o...',
        '...o absa aaaa o...',
        '...o pppp pppp o...',
        '..op ppoo oppp po..',
        '..of ffo. offf fo..',
        '..oo oo.. .ooo oo..',
      ]),
      g(16, [
        '.... oooo oooo o...',
        '...o aaaa aaaa o...',
        '...o aaaa bbaa o...',
        '...o aaaa bsba o...',
        '...o pppp pppp o...',
        '.... oppo oppo ....',
        '...o fffo ffff o...',
        '...o ooo. oooo o...',
      ]),
    ],
  },
  coat: {
    headY: 0,
    bodyY: 8,
    down: [
      sym([
        '...o oooo',
        '...o Yyuu',
        '..oy oYyu',
        '..os oYyu',
        '...o Yyyu',
        '...o Yyyo',
        '.... oPpo',
        '.... offo',
      ]),
      g(16, [
        '...o oooo oooo o...',
        '...o yyuu uuyy zo..',
        '..oy oyyu uyyo zo..',
        '..os oyyu uyyo to..',
        '...o yyyu uyyy zo..',
        '...o yyyo oyyy zo..',
        '.... oppo offq o...',
        '.... offo .oo. ....',
      ]),
    ],
    right: [
      g(16, [
        '.... oooo oooo ....',
        '.... oyyy yuuo ....',
        '.... oyyz zyuo ....',
        '.... oyys zyuo ....',
        '.... oyyy yyyo ....',
        '.... oyyy yyzo ....',
        '.... .opp po.. ....',
        '.... .fff ffo. ....',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oyyy yuuo ....',
        '.... ozzy yyuo ....',
        '.... ozsy yyuo ....',
        '.... oyyy yyyo ....',
        '...o yyyy yyyz o...',
        '...o ppo. .opp o...',
        '...o ffo. .off fo..',
      ]),
      g(16, [
        '.... oooo oooo ....',
        '.... oyyy yuuo ....',
        '.... oyyy zzuo ....',
        '.... oyyy zszo ....',
        '.... oyyy yyyo ....',
        '.... oyyy yyzo ....',
        '.... oppo oppo ....',
        '...o ffo. offo ....',
      ]),
    ],
  },

  cloak: {
    headY: 0,
    bodyY: 8,
    down: [
      sym([
        '..oo oooo',
        '..oY yyyy',
        '.oYo yyyy',
        '.oYo yyyy',
        '.oko yyyy',
        '.oYy yyyy',
        '.oMm mmmm',
        '..oo oooo',
      ]),
      g(16, [
        '..oo oooo oooo oo..',
        '..oy yyyy yyyy zo..',
        '.oyo yyyy yyyy ozo.',
        '.oko yyyy yyyy ozo.',
        '.oyo yyyy yyyy oko.',
        '.oyy yyyy yyyy zzo.',
        '.omm mmmm mmmm mno.',
        '..of fooo oooo oo..',
      ]),
    ],
    right: [
      g(16, [
        '...o oooo oooo ....',
        '..oy yyyy yyyo ....',
        '..oy yyyo zyyo ....',
        '..oy yyyo zyyo ....',
        '..oy yyyo kyyo ....',
        '..oy yyyy yyyz o...',
        '..om mmmm mmmn o...',
        '...o oooo oooo ....',
      ]),
      g(16, [
        '...o oooo oooo ....',
        '..oy yyyy yyyo ....',
        '..oy yyoz yyyo ....',
        '..oy yyoz yyyo ....',
        '..oy yyok yyyo ....',
        '..oy yyyy yyyy zo..',
        '..om mmmm mmmm no..',
        '..of fooo oooo ffo.',
      ]),
      g(16, [
        '...o oooo oooo ....',
        '..oy yyyy yyyo ....',
        '..oy yyyy ozyo ....',
        '..oy yyyy ozyo ....',
        '..oy yyyy okyo ....',
        '..oy yyyy yyyz o...',
        '..om mmmm mmmn o...',
        '...o ooof fooo ....',
      ]),
    ],
  },
} satisfies Record<string, BodyDef>;

type BodyId = keyof typeof BODIES;

// ---------------------------------------------------------------------------
// Extras drawn over the body (y relative to the sprite top)
// ---------------------------------------------------------------------------

/** Frostmantel emblem: a six-armed snowflake, used as-is on cloaks (1×) and portraits. */
const FLAKE: Grid = ['..w..', 'w.w.w', '.www.', 'w.w.w', '..w..'];

interface ExtraDef {
  views: Views;
  /** Draw before the head (e.g. things behind the head in the front view). */
  under?: Partial<Record<View, boolean>>;
}

const EXTRAS = {
  pack: {
    views: {
      down: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... .x..',
        '.... .x..',
      ]),
      up: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... oooo',
        '...o Kkkk',
        '...o Klll',
        '...o Kkxk',
        '.... oooo',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '..oo o.x. .... ....',
        '.okk ko.x .... ....',
        '.okl lo.. .... ....',
        '.okk lo.. .... ....',
        '..oo o... .... ....',
      ]),
    },
  },
  bigpack: {
    views: {
      down: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.ooo ....',
        'omMo ....',
        'oKko ....',
        'oKko ....',
        'oKko ....',
        '.oo. ....',
      ]),
      up: sym([
        '.... ....',
        '.... ....',
        '.ooo oooo',
        'omMm mmmm',
        'omMm mmmm',
        '.ooo oooo',
        '..oK kkkk',
        '..oK kkkk',
        '..oK kkkk',
        '..oK llll',
        '..oK kkxk',
        '..oK kkkk',
        '...o oooo',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.ooo o... .... ....',
        'ommm no.. .... ....',
        'ommm no.. .... ....',
        '.ooo o... .... ....',
        'okkk o... .... ....',
        'okkk o... .... ....',
        'okkl ox.. .... ....',
        'okkl o.x. .... ....',
        'okkk o... .... ....',
        'okkl o... .... ....',
        '.ooo .... .... ....',
      ]),
    },
    under: { down: true },
  },
  scarf: {
    views: {
      down: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '...o oooo oooo o...',
        '..om mmmm mmmm no..',
        '...o oooo omno o...',
        '.... .... omno ....',
        '.... .... .oo. ....',
      ]),
      up: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '...o oooo oooo o...',
        '..om mmmm mmmm no..',
        '...o oomm nooo o...',
        '.... .omn o... ....',
        '.... .omn o... ....',
        '.... ..oo .... ....',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... oooo oooo ....',
        '.ooo mmmm mmmo ....',
        'omnn oooo ooo. ....',
        '.oo. .... .... ....',
      ]),
    },
  },
  apron: {
    views: {
      down: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... .m..',
        '.... .Mmm',
        '.... .Mmg',
        '.... .Mmm',
      ]),
      up: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... .m..',
        '.... ..m.',
        '.... .omm',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .m.. ....',
        '.... .... mmm. ....',
        '.... .... mmm. ....',
        '.... .... .mmo ....',
      ]),
    },
  },
  tie: {
    views: {
      down: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ..mM',
        '.... ...M',
      ]),
      up: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ..mM',
        '.... ...M',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... ..m. ....',
        '.... .... ..n. ....',
      ]),
    },
  },

  /** Heilstation uniform: white collar and the green leaf emblem on the chest. */
  leaf: {
    views: {
      down: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... ..ww ww.. ....',
        '.... .... .g.. ....',
      ]),
      up: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... ..ww ww.. ....',
      ]),
      right: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... .... www. ....',
      ]),
    },
  },
  /** Fishing rod carried over the shoulder. */
  rod: {
    views: {
      down: g(16, [
        '.... .... .... ...x',
        '.... .... .... ...x',
        '.... .... .... ...x',
        '.... .... .... ...x',
        '.... .... .... ..x.',
        '.... .... .... ..x.',
        '.... .... .... ..x.',
        '.... .... .... ..x.',
        '.... .... .... .x..',
        '.... .... .... .x..',
        '.... .... .... x...',
      ]),
      up: g(16, [
        'x... .... .... ....',
        'x... .... .... ....',
        'x... .... .... ....',
        'x... .... .... ....',
        '.x.. .... .... ....',
        '.x.. .... .... ....',
        '.x.. .... .... ....',
        '.x.. .... .... ....',
        '..x. .... .... ....',
        '..x. .... .... ....',
        '...x .... .... ....',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        'x... .... .... ....',
        'x... .... .... ....',
        '.x.. .... .... ....',
        '.x.. .... .... ....',
        '..x. .... .... ....',
        '...x .... .... ....',
        '.... x... .... ....',
        '.... .x.. .... ....',
      ]),
    },
    under: { down: true, up: false, right: true },
  },
  /** Hi-vis yoke across the shoulders of a work jacket. */
  yoke: {
    views: {
      down: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... mmmm mmmn ....',
      ]),
      up: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... mmmm mmmn ....',
      ]),
      right: g(16, [
        ...Array.from({ length: 9 }, () => '.... .... .... ....'),
        '.... .mmm mmn. ....',
      ]),
    },
  },
  /** Frostmantel emblem on the chest. */
  flake: {
    views: {
      down: [...Array.from({ length: 9 }, () => '.'.repeat(16)), ...FLAKE.map((row) => `.....${row}......`)],
      up: [],
      right: [],
    },
  },
  collar: {
    views: {
      down: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.o.. ....',
        'omo. ....',
        'omYo ....',
        'omYy oooo',
        '.omY yyyy',
      ]),
      up: sym([
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.... ....',
        '.o.. ....',
        'omoo oooo',
        'omYy yyyy',
        'omYy yyyy',
        '.oYy yyyy',
      ]),
      right: g(16, [
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.... .... .... ....',
        '.o.. .... .... ....',
        'omo. .... .... ....',
        'omyo .... .... ....',
        'omyy oooo oooo ....',
        '.omy yyyy yyyo ....',
      ]),
    },
    under: { down: true, up: true, right: true },
  },
} satisfies Record<string, ExtraDef>;

type ExtraId = keyof typeof EXTRAS;

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------

interface CharDef {
  body: BodyId;
  /** Head overlays, drawn in order over the face. */
  head: readonly HeadId[];
  extras?: readonly ExtraId[];
  pal: Palette;
}

type PersonId = Exclude<CharSpriteId, ObjectId>;
type ObjectId = 'item_ball' | 'crystal' | 'legend' | 'boulder';

const SKIN_TAN = { s: '#e8b888', t: '#c88858' };
const SKIN_DARK = { s: '#c89068', t: '#a06c48' };
const SKIN_PALE = { s: '#f8e0c8', t: '#e0b090' };

const CAST: Readonly<Record<PersonId, CharDef>> = {
  player: {
    body: 'adult', head: ['short', 'beanie'], extras: ['pack'],
    pal: {
      c: '#48b048', d: '#2c8038', r: '#2c8038',
      h: '#6c4428', i: '#4c2c18', j: '#8c5c38',
      a: '#f08830', b: '#c05c20', p: '#384870', q: '#283458', f: '#503830',
      k: '#e8c048', l: '#b88c28', x: '#806020',
    },
  },
  rival: {
    body: 'adult', head: ['spiky'], extras: ['scarf'],
    pal: {
      h: '#3848a0', i: '#283070', j: '#5870c8',
      a: '#383840', b: '#24242c', m: '#e03838', n: '#a02028',
      p: '#5c5868', q: '#403c4c', f: '#302830',
    },
  },
  prof: {
    body: 'coat', head: ['bunlong', 'glasses'],
    pal: {
      v: '#b89878',
      h: '#d8c898', i: '#a89870', j: '#f0e8c0',
      y: '#f8f8f8', z: '#c8d0e0', u: '#7858a8',
      p: '#5c4c6c', q: '#443850', f: '#5c4038',
    },
  },
  mom: {
    body: 'dress', head: ['ponytail'], extras: ['apron'],
    pal: {
      h: '#9c5830', i: '#703c20', j: '#c07848', m: '#f8f0e0', n: '#d8d0c0', g: '#f8f0e0',
      a: '#e87890', b: '#c05870', p: '#c06880', q: '#984c64', f: '#704050',
    },
  },
  nurse: {
    body: 'dress', head: ['bob', 'hairband'], extras: ['leaf'],
    pal: {
      h: '#7c4428', i: '#582c18', j: '#a06038',
      c: '#f8f8f8', d: '#d0d8e0', g: '#48b050',
      a: '#38a8a0', b: '#287c78', p: '#2c9088', q: '#206c68', f: '#f0f0f0',
    },
  },
  clerk: {
    body: 'adult', head: ['short'], extras: ['apron'],
    pal: {
      h: '#403840', i: '#282028', j: '#605860',
      a: '#e8e0d0', b: '#b8b0a0', m: '#3878d0', n: '#2858a0', g: '#3878d0',
      p: '#504848', q: '#383030',
    },
  },
  boy: {
    body: 'adult', head: ['short', 'cap'],
    pal: {
      c: '#3878d8', d: '#2850a0', r: '#f8f8f8',
      h: '#3c2c20', i: '#281c14', j: '#5c4430',
      a: '#f8f8f0', b: '#c8c8c0', p: '#4870b0', q: '#305080',
      ...SKIN_TAN,
    },
  },
  girl: {
    body: 'dress', head: ['pigtails'],
    pal: {
      h: '#e8a040', i: '#b87428', j: '#f8c870', m: '#e04878', n: '#b02c58',
      a: '#f8f8f0', b: '#d0d0c8', p: '#e05888', q: '#b03c68', f: '#a03050',
    },
  },
  man: {
    body: 'coat', head: ['short', 'mustache'],
    pal: {
      h: '#4c3424', i: '#34221a', j: '#6c4c34',
      y: '#a06838', z: '#784c28', u: '#e8e0c8', p: '#4c4c58', q: '#363640', f: '#3c2c24',
    },
  },
  woman: {
    body: 'dress', head: ['long'],
    pal: {
      h: '#a03838', i: '#702428', j: '#c85850',
      a: '#f0c040', b: '#c09020', p: '#6888d0', q: '#4c68a8', f: '#604040',
    },
  },
  oldman: {
    body: 'elder', head: ['bald', 'mustache'],
    pal: {
      h: '#e0e0e0', i: '#a8a8b0', j: '#f8f8f8',
      a: '#8c7058', b: '#6c5440', p: '#585460', q: '#403c48',
    },
  },
  oldwoman: {
    body: 'elder', head: ['bun'],
    pal: {
      h: '#d0d0d8', i: '#9898a8', j: '#f0f0f0',
      a: '#9070b0', b: '#6c5088', p: '#7c6890', q: '#5c4c70', f: '#504050',
    },
  },
  kid: {
    body: 'child', head: ['short'],
    pal: {
      h: '#e8b040', i: '#b88028', j: '#f8d878',
      a: '#e04848', b: '#b02c30', p: '#3870c0', q: '#28508c',
    },
  },
  hiker: {
    body: 'big', head: ['short', 'cap', 'beard'], extras: ['bigpack'],
    pal: {
      c: '#c06830', d: '#904820', r: '#f0c040',
      h: '#5c3820', i: '#402410', j: '#7c5030',
      a: '#b04838', b: '#843028', p: '#6c6040', q: '#504830', f: '#503828',
      k: '#58784c', l: '#405838', m: '#c8a060', n: '#987848', x: '#403020',
      ...SKIN_TAN,
    },
  },
  fisher: {
    body: 'adult', head: ['short', 'bucket'], extras: ['rod'],
    pal: {
      c: '#f0c838', d: '#c89c20', r: '#c89c20',
      h: '#5c4430', i: '#402c1c', j: '#7c6040',
      a: '#e05838', b: '#b03c28', p: '#4c6890', q: '#384c6c', f: '#3c3c44', x: '#4c4048',
      ...SKIN_TAN,
    },
  },
  scientist: {
    body: 'coat', head: ['short', 'goggles'],
    pal: {
      h: '#686070', i: '#484050', j: '#8c8494',
      m: '#686c78', n: '#484c58', g: '#78d8f0',
      y: '#f0f4f8', z: '#c0c8d8', u: '#40a0a0', p: '#404858', q: '#2c3240',
    },
  },
  ranger: {
    body: 'adult', head: ['short', 'ranger'], extras: ['tie'],
    pal: {
      c: '#a88850', d: '#806430', r: '#48803c',
      h: '#5c3820', i: '#402410', j: '#7c5030',
      a: '#58a050', b: '#3c7838', m: '#e8c040', n: '#b88c20',
      p: '#806848', q: '#5c4c34', f: '#4c3428',
      ...SKIN_TAN,
    },
  },
  guard: {
    body: 'adult', head: ['short', 'guard'],
    pal: {
      c: '#304880', d: '#203060', r: '#202840', m: '#f0c840', e: '#283050',
      h: '#3c3030', i: '#281c1c', j: '#5c4848',
      a: '#3c5898', b: '#283c70', p: '#283c70', q: '#1c2850', f: '#202028',
    },
  },
  grunt: {
    body: 'cloak', head: ['hood'], extras: ['flake'],
    pal: {
      y: '#5874a8', z: '#405888', m: '#e0f0ff', n: '#a8c4e0', k: '#28304c', f: '#202840',
    },
  },
  boss: {
    body: 'cloak', head: ['slick'], extras: ['collar', 'flake'],
    pal: {
      h: '#f0f0f8', i: '#b0b8d0', j: '#ffffff', e: '#2c4c90',
      y: '#2c3c7c', z: '#1c2858', m: '#e0ecf8', n: '#a0b4d0', k: '#a0b4d0', f: '#141c38',
      ...SKIN_PALE,
    },
  },
  leader_earth: {
    body: 'adult', head: ['short', 'headband'],
    pal: {
      h: '#4c3020', i: '#341e10', j: '#6c4830', r: '#d86830',
      a: '#6c8038', b: '#4c5c28', p: '#7c5434', q: '#5c3c24', f: '#3c2818',
      ...SKIN_DARK,
    },
  },
  leader_water: {
    body: 'dress', head: ['bob', 'sailor'], extras: ['tie'],
    pal: {
      c: '#f8f8f8', d: '#c8d0e0', r: '#2860c0',
      h: '#2c6888', i: '#1c4864', j: '#4888a8',
      a: '#f8f8f8', b: '#c8d0e0', m: '#d84040', n: '#a02830',
      p: '#2850a0', q: '#1c3878', f: '#203050',
    },
  },
  leader_spark: {
    body: 'adult', head: ['spiky', 'goggles'], extras: ['yoke'],
    pal: {
      h: '#f08838', i: '#c05c20', j: '#f8b060',
      m: '#f8d030', n: '#c8a018', g: '#70c8f0',
      a: '#38343c', b: '#24222a', p: '#6c5848', q: '#4c3c30', f: '#282428',
    },
  },
  leader_frost: {
    body: 'coat', head: ['long', 'furhood'], extras: ['scarf'],
    pal: {
      h: '#c8d8f0', i: '#98a8c8', j: '#e8f0f8', c: '#f8f8f8', d: '#c8d4e4',
      y: '#4c78c8', z: '#3458a0', u: '#f0f4f8', p: '#2c4478', q: '#203464', f: '#283c68',
      m: '#e04040', n: '#a82830',
      ...SKIN_PALE,
    },
  },
};

function personCanvas(def: CharDef, view: View, frame: 0 | 1 | 2): string[][] {
  const body: BodyDef = BODIES[def.body];
  let bodyGrid: Grid;
  if (view === 'right') bodyGrid = body.right[frame];
  else {
    const frames = body[view] ?? [remap(body.down[0], BACK_REMAP), remap(body.down[1], BACK_REMAP)];
    bodyGrid = frame === 0 ? frames[0] : frame === 1 ? frames[1] : mirror(frames[1]);
  }
  const hx = view === 'right' ? (body.headDxRight ?? 0) : 0;
  const extras = (def.extras ?? []).map((id): [ExtraDef, Layer] => {
    const extra: ExtraDef = EXTRAS[id];
    return [extra, { grid: extra.views[view], y: body.headY }];
  });
  return compose(16, 16, [
    { grid: bodyGrid, y: body.bodyY },
    ...extras.filter(([e]) => e.under?.[view]).map(([, l]) => l),
    { grid: FACE[view], x: hx, y: body.headY },
    ...def.head.map((id) => ({ grid: HEADS[id][view], x: hx, y: body.headY })),
    ...extras.filter(([e]) => !e.under?.[view]).map(([, l]) => l),
  ]);
}

// ---------------------------------------------------------------------------
// Objects (16×16, same frame for every direction)
// ---------------------------------------------------------------------------

/** Teal like the Fangkristall icon (icons.ts GEM_TEAL), a bit deeper so it reads on snow. */
const GEM = { w: '#ffffff', h: '#a0f0e8', L: '#48c8c8', M: '#1c8c98', D: '#106070' };
/** Gold glint (warm accent, visible on snow and ice too). */
const GLINT = { y: '#f8c030', '*': '#fff8d0' };
/** Lindglut, the Alpenglut guardian (ROSTER #044): flame orange to alpenglow pink, golden ray mane. */
const LINDGLUT = {
  m: '#f06828', n: '#c84820', e: '#a03018', y: '#ffd050', l: '#fff4c0', p: '#f8a8c8', q: '#e07898', k: '#402018',
};

const OBJECTS: Readonly<Record<ObjectId, { grid: Grid; pal: Palette }>> = {
  item_ball: {
    grid: g(16, [
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .... .... ....',
      '.... .ooo oyo. ....',
      '.... owhh hy*y ....',
      '...o whhL LLyM o...',
      '...o MMMM MDDD o...',
      '.... oMMM DDDo ....',
      '.... .ooo ooo. ....',
      '.... .sss sss. ....',
      '.... .... .... ....',
      '.... .... .... ....',
    ]),
    pal: { ...GEM, ...GLINT, s: '#10302050' },
  },
  crystal: {
    grid: g(16, [
      '.... ...o o... ....',
      '.... ..ow Lo.. ..y.',
      '.... .owh LLo. .y*y',
      '..y. owhh LLLo ..y.',
      '.y*y ohhh LLDo ....',
      '..y. ohhh LLDo ....',
      '.... oMMM MDDo ....',
      '.... oMMM MDDo ....',
      '.... .oMM DDo. ....',
      '...o oooM Dooo o...',
      '..ok kkoo ookk lo..',
      '..ol llll llll lo..',
      '...o oaaa aabo o...',
      '.... oaaa aabo ....',
      '...o kkkk kkkl o...',
      '...o oooo oooo o...',
    ]),
    pal: { ...GEM, ...GLINT, k: '#d8dce8', l: '#9ca4b8', a: '#b8c0d0', b: '#8890a8' },
  },
  legend: {
    grid: g(16, [
      '.... l... ...l ....',
      '...o yo.y y.oy o...',
      '.y.o myoy yoym o.y.',
      '..yo mmmm mmmm oy..',
      'yyom mmmm mmmm moyy',
      '..om kmmm mmmk mo..',
      'yyol lmmp pmml loyy',
      '..yo llmm mmll oy..',
      '.y.. ooll lloo ..y.',
      '.... .omm mno. ....',
      '...o mmmm mmno ....',
      '..om lmpm lnoo ..l.',
      '..om pmo. .... .yl.',
      '..op pmoo oooo omy.',
      '...o qppp pppq qno.',
      '.... oooo oooo oo..',
    ]),
    pal: LINDGLUT,
  },
  boulder: {
    grid: g(16, [
      '.... .... .... ....',
      '.... .ooo ooo. ....',
      '...o owwh haao o...',
      '..ow whhh haaa mo..',
      '.owh hhhh aaca amo.',
      '.owh hhha aaca mmo.',
      'ohhh haaa acma mmmo',
      'ohhh aaaa amma mmmo',
      'ohaa aaaa aaam mmdo',
      'ohaa caaa aamm mmdo',
      'oaaa acaa ammm mddo',
      '.oam mcma mmmm ddo.',
      '.oam mmmm mmmd ddo.',
      '..om mmmm dddd do..',
      '...o dddd dddd o...',
      '.... oooo oooo ....',
    ]),
    pal: { w: '#e8dcc0', h: '#cab898', a: '#ac9a7c', m: '#8e7c64', d: '#6c5c4c', c: '#5a4c40' },
  },
};

const isObject = (id: CharSpriteId): id is ObjectId => id in OBJECTS;

// ---------------------------------------------------------------------------
// Portraits (48×56 busts, bottom-aligned)
// Drawn from simple shapes on a char canvas, cel-shaded (light from the top-left),
// outlined and painted like the sprites. Eyes, brows and mouths are small stamps.
// ---------------------------------------------------------------------------

const PW = 48;
const PH = 56;

type Canvas = string[][];
type Shape = (x: number, y: number) => boolean;
type Pt = readonly [number, number];

const ell = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const box = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
function poly(...pts: Pt[]): Shape {
  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!;
      const [xj, yj] = pts[j]!;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}
/** Shape plus its mirror image around the portrait's vertical center line. */
const mir = (s: Shape): Shape => (x, y) => s(x, y) || s(PW - 1 - x, y);
const any = (...ss: Shape[]): Shape => (x, y) => ss.some((s) => s(x, y));
const minus = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && !b(x, y);
const both = (a: Shape, b: Shape): Shape => (x, y) => a(x, y) && b(x, y);

const dims = (c: Canvas): readonly [number, number] => [c[0]?.length ?? 0, c.length];

function fill(c: Canvas, s: Shape, ch: string, only?: string): void {
  const [w, h] = dims(c);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (s(x, y) && (only === undefined || only.includes(c[y]![x]!))) c[y]![x] = ch;
}

function stamp(c: Canvas, rows: Grid, x: number, y: number): void {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch !== '.' && c[y + dy]?.[x + dx] !== undefined) c[y + dy]![x + dx] = ch;
    });
  });
}

const at = (c: Canvas, x: number, y: number): string => c[y]?.[x] ?? '';

/** Straight line of `ch`, optionally only over chars in `only`; `mirrored` also draws its mirror image. */
function line(c: Canvas, [x0, y0]: Pt, [x1, y1]: Pt, ch: string, only?: string, mirrored = false): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    for (const px of mirrored ? [x, PW - 1 - x] : [x])
      if (c[y]?.[px] !== undefined && (only === undefined || only.includes(c[y]![px]!))) c[y]![px] = ch;
  }
}

/**
 * Cel shading, light from the top-left: pixels of `ch` within `depth` of the region's
 * right edge (or 1px above its bottom edge) become `dark`; pixels on its top/left edge
 * become `light`. Chars in `group` count as the same region.
 */
function shade(c: Canvas, ch: string, dark: string, light: string | null = null, depth = 2, group = ch + dark + (light ?? '')): void {
  const [w, h] = dims(c);
  const src = c.map((r) => [...r]);
  const same = (x: number, y: number) => x < 0 || x >= w || y < 0 || y >= h || group.includes(src[y]![x]!);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (src[y]![x] !== ch) continue;
      let isDark = !same(x, y + 1);
      for (let d = 1; d <= depth && !isDark; d++) isDark = !same(x + d, y);
      if (isDark) c[y]![x] = dark;
      else if (light && (!same(x - 1, y) || !same(x, y - 1))) c[y]![x] = light;
    }
}

/** `target` pixels just below/right of `caster` pixels fall into shadow. */
function castShadow(c: Canvas, caster: string, target: string, shadow: string, dist = 1): void {
  const [w, h] = dims(c);
  const src = c.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!target.includes(src[y]![x]!)) continue;
      for (let d = 1; d <= dist; d++)
        if (caster.includes(src[y - d]?.[x] ?? '') || caster.includes(src[y - d]?.[x - d] ?? '')) c[y]![x] = shadow;
    }
}

/** Pixels in `inner` touching a pixel in `outer` become outline. */
function edge(c: Canvas, inner: string, outer: string): void {
  const [w, h] = dims(c);
  const src = c.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inner.includes(src[y]![x]!)) continue;
      if (ORTHO.some(([dx, dy]) => outer.includes(src[y + dy]?.[x + dx] ?? '\u0000'))) c[y]![x] = 'o';
    }
}

/** 1px outline around the whole silhouette. */
function outlineAll(c: Canvas): void {
  const [w, h] = dims(c);
  const src = c.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (src[y]![x] !== '.') continue;
      if (ORTHO.some(([dx, dy]) => { const n = src[y + dy]?.[x + dx]; return n !== undefined && n !== '.' && n !== 'o'; })) c[y]![x] = 'o';
    }
}

// Base bust: shoulders, neck, egg-shaped head (short lower face, jaw narrows), ears.
const HEAD: Shape = (x, y) => {
  const yy = y + 0.5 - 17.5;
  const dy = yy / (yy < 0 ? 12.5 : 11.5);
  if (Math.abs(dy) > 1) return false;
  let hw = 10 * Math.sqrt(1 - dy * dy);
  if (dy > 0) hw *= 1 - 0.25 * dy;
  return Math.abs(x + 0.5 - 24) <= hw;
};
const EARS = mir(ell(14, 20.5, 1.8, 3.2));
const NECK = box(20, 24, 27, 42);
const below = (s: Shape, d: number): Shape => (x, y) => s(x, y - d);
/** Rounded shoulders of half-width `hw`: full width from `top + 11` down, curving up to the collar at `top`. */
function shoulders(hw = 22, top = 33): Shape {
  return (x, y) => {
    if (y < top) return false;
    const w = y >= top + 11 ? hw : hw * Math.sqrt(1 - ((top + 11 - y) / 11.5) ** 2);
    return Math.abs(x + 0.5 - 24) <= w;
  };
}
const SHOULDERS = shoulders();

/** Eye stamps: [left, right]; left eye at x=17, right at x=27 (5-wide stamps start one column further out). */
const EYES = {
  m: [['kkkk', 'kwek', 'keek'], ['kkkk', 'kwek', 'keek']],
  f: [['kkkkk', '.kwek', '.keek'], ['kkkkk', 'kwek.', 'keek.']],
  /** Larger, rounder eyes (children, Professorin Arven). */
  big: [['.kkk', 'kwek', 'keek', '.ee.'], ['kkk.', 'kwek', 'keek', '.ee.']],
  bigf: [['kkkkk', '.kwek', '.keek', '..ee.'], ['kkkkk', 'kwek.', 'keek.', '.ee..']],
  /** Hard stare: white towards the temple, iris towards the nose. */
  glare: [['kkkkk', 'wweek', '.kkk.'], ['kkkkk', 'keeww', '.kkk.']],
  narrow: [['kkkk', 'keek'], ['kkkk', 'keek']],
  calm: [['.kkkk', 'kkeek', '..ee.'], ['kkkk.', 'keekk', '.ee..']],
} satisfies Record<string, readonly [Grid, Grid]>;
type EyeId = keyof typeof EYES;

/** Brow stamps for the left eye (mirrored for the right). */
const BROWS = {
  flat: ['.kkkk', 'k....'],
  stern: ['kk...', '.kkkk'],
  /** Steep frown down to the nose. */
  angry: ['kk...', '.kkk.', '...kk'],
  kind: ['..kkk', 'kk...'],
  thick: ['kkkkk', 'kkkk.'],
} satisfies Record<string, Grid>;
type BrowId = keyof typeof BROWS;

const MOUTHS = {
  smile: ['x....x', '.xxxx.'],
  grin: ['xxxxxx', 'xwwwwx', '.xxxx.'],
  flat: ['.xxxx.'],
  smirk: ['.....x', '.xxxx.'],
  soft: ['.xxxx.', '..rr..'],
  open: ['.xxxx.', '.xrrx.', '..xx..'],
} satisfies Record<string, Grid>;
type MouthId = keyof typeof MOUTHS;

const P_BASE: Palette = {
  '#': '#282038', s: '#f8d0a8', t: '#e0a070', v: '#fff0d8', T: '#c07c58', x: '#a85840', r: '#e89080',
  w: '#ffffff', k: '#30283c', e: '#5c4030',
};
const P_SKIN_TAN = { s: '#e8b888', t: '#c88858', v: '#f8d4a8', T: '#a86c44' };
const P_SKIN_DARK = { s: '#c89068', t: '#a06c48', v: '#e0ac80', T: '#7c4c30', x: '#703c28' };
const P_SKIN_PALE = { s: '#f8e0c8', t: '#e0b090', v: '#fff4e8', T: '#c89070' };

interface Face {
  eyes: EyeId;
  brows: BrowId;
  mouth: MouthId;
  /** Brow color char (default 'k'). */
  browCh?: string;
}

function blankCanvas(w = PW, h = PH): Canvas {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
}

/** Draws neck, head and face details (call after the torso, before front hair). */
function drawHead(c: Canvas, face: Face): void {
  fill(c, NECK, 't', '.');
  fill(c, HEAD, 's');
  fill(c, EARS, 's');
  shade(c, 's', 't', 'v', 1, 'stv');
  fill(c, box(0, 22, PW - 1, PH - 1), 's', 'v');
  // The jaw casts a shadow onto the neck so chin and neck read apart.
  fill(c, both(NECK, minus(below(HEAD, 2), HEAD)), 'T', 'st');
  const [l, r] = EYES[face.eyes];
  stamp(c, l, l[0]!.length > 4 ? 16 : 17, 18);
  stamp(c, r, 27, 18);
  const brow = BROWS[face.brows].map((row) => row.replaceAll('k', face.browCh ?? 'k'));
  stamp(c, brow, 16, 15);
  stamp(c, mirror(brow), 27, 15);
  c[22]![24] = 't';
  c[23]![24] = 't';
  stamp(c, MOUTHS[face.mouth], 21, 25);
}

function finish(c: Canvas, pal: Palette, edges: readonly [string, string][] = []): Bitmap {
  for (const [inner, outer] of edges) edge(c, inner, outer);
  outlineAll(c);
  return paint(c, { ...P_BASE, ...pal });
}

const HAIR_EDGE: [string, string] = ['hij', 'stvTwkexr'];

/** Hair cap down to the brow line, shared by most hairstyles. */
const HAIR_CAP = both(ell(24, 12.5, 12, 9.5), box(0, 0, 47, 14));
const SIDEBURNS = mir(box(13, 12, 15, 19));

function shadeHair(c: Canvas, castOn = 'sv'): void {
  shade(c, 'h', 'i', 'j', 2, 'hij');
  castShadow(c, 'hij', castOn, 't');
}

/** Hair bun sunk into the top of the hair mass, with a shaded crease where it meets the hair. */
const BUN = ell(24, 3.5, 6.5, 3.8);
function drawBun(c: Canvas): void {
  fill(c, BUN, 'h');
}
function bunCrease(c: Canvas): void {
  fill(c, minus(BUN, below(BUN, -1)), 'i', 'hj');
  fill(c, poly([19, 1], [23, 0.5], [20, 3]), 'j', 'h');
}

function portraitRival(): Bitmap {
  const c = blankCanvas();
  // Jacket with an open front over a light shirt.
  fill(c, SHOULDERS, 'a');
  fill(c, box(20, 36, 27, 55), 'c', 'a');
  shade(c, 'a', 'b', null, 3);
  drawHead(c, { eyes: 'm', brows: 'stern', mouth: 'smirk', browCh: 'i' });
  // Spiky hair: cap, sideburns, spikes, bangs.
  fill(c, both(ell(24, 13, 12.5, 10.5), box(0, 0, 47, 14)), 'h');
  fill(c, SIDEBURNS, 'h');
  for (const spike of [
    poly([14, 9], [20, 4], [7, 0]), poly([19, 5], [27, 3], [21, -2]), poly([26, 3], [32, 6], [35, -1]),
    poly([32, 5], [37, 13], [44, 4]), poly([11, 9], [13, 16], [4, 9]), poly([35, 12], [36, 20], [43, 17]),
    poly([12, 15], [13, 22], [6, 21]),
  ]) fill(c, spike, 'h');
  for (const bang of [
    poly([13, 12], [20, 12], [15, 19]), poly([18, 12], [25, 12], [21, 18]), poly([23, 12], [30, 12], [27, 18]),
    poly([28, 12], [35, 12], [33, 19]),
  ]) fill(c, bang, 'h');
  fill(c, poly([16, 6], [22, 4], [17, 9]), 'j');
  fill(c, poly([24, 4], [29, 4], [25, 7]), 'j');
  shadeHair(c);
  // Red scarf with a tail over the right shoulder.
  fill(c, ell(24, 34.5, 9.5, 3.5), 'm');
  fill(c, poly([28, 35], [34, 35], [37, 50], [31, 52]), 'm');
  shade(c, 'm', 'n', null, 2);
  return finish(c, {
    h: '#3848a0', i: '#283070', j: '#6880d8', e: '#8c3828',
    a: '#3c3c48', b: '#28283a', c: '#e0e0e8', m: '#e03838', n: '#a02028',
  }, [HAIR_EDGE, ['mn', 'abcstT'], ['c', 'ab']]);
}

function portraitProf(): Bitmap {
  const c = blankCanvas();
  fill(c, box(14, 22, 33, 34), 'h');
  // Lab coat over a purple shirt, pen in the pocket.
  fill(c, SHOULDERS, 'y');
  fill(c, poly([18, 34], [29, 34], [24, 50]), 'c', 'y');
  shade(c, 'y', 'z', null, 3);
  shade(c, 'c', 'd', null, 1);
  fill(c, box(32, 44, 35, 44), 'z', 'yz');
  fill(c, box(33, 41, 33, 44), 'g', 'yz');
  drawHead(c, { eyes: 'bigf', brows: 'kind', mouth: 'soft', browCh: 'i' });
  // Parted bangs, locks falling over the shoulders, a high bun sitting in the hair mass.
  fill(c, both(ell(24, 12.5, 11.5, 9.5), box(0, 0, 47, 13)), 'h');
  drawBun(c);
  fill(c, mir(poly([12, 10], [17, 11], [17, 22], [16, 30], [18, 38], [16, 41], [14, 38], [12, 42], [10, 37], [9, 30], [10, 20])), 'h');
  fill(c, mir(poly([13, 11], [24, 8], [24, 10], [17, 16], [15, 19])), 'h');
  shade(c, 'h', 'i', 'j', 2, 'hij');
  fill(c, poly([14, 8], [22, 5.5], [22.5, 7], [15, 10]), 'j', 'h');
  bunCrease(c);
  line(c, [13, 22], [11, 36], 'i', 'h', true);
  line(c, [15, 26], [15, 38], 'i', 'h', true);
  castShadow(c, 'hij', 'sv', 't');
  // Thin light-gold round glasses.
  fill(c, minus(box(15, 17, 21, 22), box(16, 18, 20, 21)), 'g', 'stv');
  fill(c, minus(box(26, 17, 32, 22), box(27, 18, 31, 21)), 'g', 'stv');
  fill(c, box(22, 18, 25, 18), 'g', 'stv');
  return finish(c, {
    s: '#f8d4b0', t: '#ecb894', v: '#fff4e4', T: '#d89c78', x: '#c06850', r: '#f0a090',
    h: '#d8c898', i: '#a89468', j: '#f4ecc8', e: '#3c8058', g: '#c8a070',
    y: '#f8f8f8', z: '#c8d0e0', c: '#7858a8', d: '#58407c',
  }, [HAIR_EDGE, ['c', 'yz'], ['hij', 'yz']]);
}

function portraitGrunt(): Bitmap {
  const c = blankCanvas();
  const hood = any(ell(24, 18, 15, 16.5), poly([9, 26], [39, 26], [44, 42], [4, 42]));
  const opening = ell(24, 21, 9.5, 10);
  fill(c, SHOULDERS, 'y');
  fill(c, hood, 'y');
  shade(c, 'y', 'z', null, 3);
  stamp(c, FLAKE, 22, 44);
  drawHead(c, { eyes: 'glare', brows: 'angry', mouth: 'flat' });
  // Hood cut back around the face opening; its inner rim is in shadow.
  fill(c, minus(any(hood, box(10, 26, 38, 33)), opening), 'y', 'stvTkexr');
  fill(c, minus(ell(24, 21, 10.5, 11), opening), 'z', 'y');
  castShadow(c, 'yz', 'sv', 't', 2);
  // Mask over nose and mouth.
  fill(c, both(opening, box(0, 23, 47, 33)), 'm');
  fill(c, both(opening, box(0, 27, 47, 27)), 'n');
  return finish(c, {
    y: '#5874a8', z: '#405888', w: '#f0f8ff', m: '#28304c', n: '#1c2238', e: '#3c5888',
  }, [['mn', 'stvT']]);
}

function portraitBoss(): Bitmap {
  const c = blankCanvas();
  // Swept-back hair fanning out behind the head in ice-shard spikes.
  for (const spike of [
    poly([14, 8], [4, 12], [12, 16]), poly([12, 14], [1, 22], [12, 22]), poly([12, 20], [2, 32], [14, 28]),
    poly([14, 26], [5, 40], [17, 32]),
  ]) fill(c, mir(spike), 'h');
  fill(c, SHOULDERS, 'y');
  fill(c, mir(poly([2, 44], [8, 38], [16, 40], [14, 47])), 'y');
  shade(c, 'y', 'z', null, 3);
  drawHead(c, { eyes: 'narrow', brows: 'stern', mouth: 'flat', browCh: 'i' });
  // Widow's peak, strands framing the face.
  fill(c, both(ell(24, 12, 11.5, 8.5), box(0, 0, 47, 11)), 'h');
  fill(c, poly([19, 10], [24, 15], [29, 10]), 'h');
  fill(c, mir(poly([12, 9], [17, 10], [16, 22], [14, 30], [12, 24])), 'h');
  shade(c, 'h', 'i', 'j', 2, 'hij');
  fill(c, poly([15, 7], [23, 4.5], [23, 6], [16, 9]), 'j', 'h');
  line(c, [14, 12], [13, 24], 'i', 'h', true);
  castShadow(c, 'hij', 'sv', 't');
  // High collar rising beside the jaw, white trim, snowflake clasp.
  fill(c, mir(poly([5, 42], [11, 22], [18, 28], [19, 44])), 'y');
  fill(c, mir(poly([11, 22], [12, 21.5], [19.5, 27], [19.5, 29], [18, 28])), 'm');
  fill(c, mir(box(19, 38, 21, 40)), 'm', 'yt');
  shade(c, 'y', 'z', null, 2);
  stamp(c, FLAKE, 22, 37);
  return finish(c, {
    h: '#f0f0f8', i: '#a8b4d0', j: '#ffffff', e: '#3c70c0', ...P_SKIN_PALE,
    y: '#2c3c7c', z: '#1c2858', m: '#e0ecf8', w: '#f0f8ff',
  }, [HAIR_EDGE, ['yz', 'hij'], ['m', 'yz']]);
}

function portraitEarth(): Bitmap {
  const c = blankCanvas();
  // Olive work vest with leather straps over a rust shirt collar.
  fill(c, SHOULDERS, 'a');
  fill(c, mir(poly([17, 33], [24, 36], [24, 39], [19, 39])), 'u', 'a');
  fill(c, mir(box(13, 39, 17, 55)), 'c', 'a');
  shade(c, 'a', 'b', null, 3);
  shade(c, 'u', 'n', null, 1);
  shade(c, 'c', 'd', null, 1);
  drawHead(c, { eyes: 'm', brows: 'thick', mouth: 'grin', browCh: 'i' });
  // Short messy hair with an orange headband knotted at the side.
  fill(c, both(ell(24, 12.5, 12, 9.5), box(0, 0, 47, 14)), 'h');
  fill(c, SIDEBURNS, 'h');
  for (const tuft of [poly([14, 8], [19, 4], [10, 2]), poly([20, 4], [27, 3], [23, -1]), poly([28, 4], [34, 8], [37, 1])]) fill(c, tuft, 'h');
  for (const bang of [poly([15, 13], [22, 13], [17, 17]), poly([26, 13], [33, 13], [31, 17])]) fill(c, bang, 'h');
  fill(c, poly([16, 6], [22, 4], [17, 9]), 'j');
  shade(c, 'h', 'i', 'j', 2, 'hij');
  fill(c, both(box(12, 10, 35, 12), ell(24, 13, 12.5, 11)), 'r');
  fill(c, poly([12, 10], [5, 7], [6, 12], [12, 12]), 'r');
  fill(c, poly([12, 11], [4, 15], [7, 17], [12, 12]), 'r');
  shade(c, 'r', 'q', null, 1);
  castShadow(c, 'hijrq', 'sv', 't');
  return finish(c, {
    ...P_SKIN_DARK, r: '#e07838', q: '#b05020',
    h: '#4c3020', i: '#341e10', j: '#6c4830', e: '#4c3020',
    a: '#6c8038', b: '#4c5c28', u: '#c05838', n: '#903c28', c: '#7c5434', d: '#5c3c24',
  }, [HAIR_EDGE, ['rq', 'hijstvT'], ['cd', 'ab'], ['un', 'ab']]);
}

function portraitWater(): Bitmap {
  const c = blankCanvas();
  fill(c, box(15, 22, 32, 31), 'h');
  fill(c, SHOULDERS, 'a');
  shade(c, 'a', 'b', null, 3);
  // Sailor collar with white stripes and a red neckerchief.
  fill(c, poly([5, 46], [16, 36], [24, 48], [31, 36], [42, 46], [44, 50], [3, 50]), 'm');
  fill(c, poly([7, 46.5], [16, 38], [16, 39], [8.5, 46.5]), 'w', 'm');
  fill(c, poly([40, 46.5], [31, 38], [31, 39], [38.5, 46.5]), 'w', 'm');
  shade(c, 'm', 'n', null, 2);
  fill(c, poly([20, 44], [28, 44], [24, 49]), 'p');
  fill(c, poly([22, 48], [26, 48], [27, 54], [21, 54]), 'p');
  shade(c, 'p', 'q', null, 1);
  drawHead(c, { eyes: 'f', brows: 'kind', mouth: 'smile', browCh: 'i' });
  // Bob curling in at the chin, side-swept bangs, white sailor cap with a blue band.
  fill(c, both(ell(24, 13, 12, 9.5), box(0, 0, 47, 14)), 'h');
  fill(c, mir(poly([12, 10], [16, 12], [16, 21], [15, 26], [12, 29], [8, 30], [10, 27], [11, 24], [10, 16])), 'h');
  fill(c, poly([13, 12], [30, 10], [19, 16], [16, 19]), 'h');
  fill(c, poly([28, 12], [35, 13], [33, 18]), 'h');
  shadeHair(c);
  line(c, [13, 17], [12, 25], 'i', 'h', true);
  fill(c, ell(25, 6, 11, 5.5), 'c');
  fill(c, both(ell(25, 6, 11, 5.5), box(0, 8, 47, 10)), 'l');
  shade(c, 'c', 'd', null, 2);
  stamp(c, ['rr'], 18, 22);
  stamp(c, ['rr'], 28, 22);
  return finish(c, {
    h: '#2c7894', i: '#1c5470', j: '#50a0bc', e: '#2c78a8', r: '#f4b0a0', l: '#2c58b0',
    a: '#f8f8f8', b: '#c8d0e0', m: '#2c58b0', n: '#1c3c84', p: '#d84040', q: '#a02830',
    c: '#f8f8f8', d: '#c8d0e0',
  }, [HAIR_EDGE, ['mn', 'ab'], ['pq', 'mnab'], ['cdl', 'hij']]);
}

function portraitSpark(): Bitmap {
  const c = blankCanvas();
  // Black work jacket with a hazard-striped yellow yoke.
  fill(c, SHOULDERS, 'a');
  fill(c, both(SHOULDERS, box(0, 0, 47, 39)), 'm');
  for (let x = -8; x < PW; x += 6) line(c, [x, 39], [x + 6, 33], 'l', 'm');
  fill(c, mir(poly([17, 33], [24, 37], [24, 40], [18, 38])), 'c', 'aml');
  shade(c, 'a', 'b', null, 3);
  shade(c, 'm', 'n', null, 1);
  drawHead(c, { eyes: 'm', brows: 'flat', mouth: 'grin', browCh: 'i' });
  // Flame-like spiky hair.
  fill(c, both(ell(24, 13, 12.5, 10.5), box(0, 0, 47, 14)), 'h');
  fill(c, SIDEBURNS, 'h');
  for (const spike of [
    poly([12, 10], [18, 4], [8, -1]), poly([18, 5], [24, 2], [17, -2]), poly([23, 3], [30, 3], [28, -3]),
    poly([29, 4], [35, 9], [39, -1]), poly([34, 8], [37, 15], [44, 9]), poly([11, 12], [12, 18], [5, 13]),
  ]) fill(c, spike, 'h');
  for (const bang of [poly([14, 13], [21, 13], [16, 18]), poly([20, 13], [27, 13], [24, 17]), poly([27, 13], [34, 13], [32, 18])]) fill(c, bang, 'h');
  shade(c, 'h', 'i', 'j', 2, 'hij');
  // Yellow goggles pushed up onto the hair.
  fill(c, both(box(11, 8, 36, 10), ell(24, 12, 13.5, 11)), 'l');
  fill(c, mir(ell(18.5, 9.5, 4, 3.5)), 'm');
  fill(c, mir(ell(18.5, 9.5, 2.5, 2)), 'g');
  shade(c, 'm', 'n', null, 1);
  stamp(c, ['w.', '.w'], 17, 8);
  stamp(c, ['w.', '.w'], 28, 8);
  castShadow(c, 'hijlmn', 'sv', 't');
  stamp(c, ['uu'], 30, 23);
  return finish(c, {
    h: '#f08838', i: '#c05820', j: '#f8b868', e: '#4c6898',
    a: '#38343c', b: '#24222a', c: '#58545c', m: '#f8d030', n: '#c89c18', g: '#78c8f0', l: '#302c34', u: '#b08878',
  }, [HAIR_EDGE, ['mn', 'hijl'], ['l', 'hij'], ['c', 'abmnl']]);
}

function portraitFrost(): Bitmap {
  const c = blankCanvas();
  const hood = any(ell(24, 19, 16, 18), poly([8, 28], [40, 28], [44, 42], [4, 42]));
  fill(c, hood, 'c');
  fill(c, SHOULDERS, 'y');
  shade(c, 'y', 'z', null, 3);
  drawHead(c, { eyes: 'calm', brows: 'kind', mouth: 'soft', browCh: 'i' });
  // Silver hair inside the hood.
  fill(c, both(ell(24, 13, 11.5, 9.5), box(0, 0, 47, 14)), 'h');
  fill(c, mir(poly([12, 11], [17, 12], [17, 24], [14, 34], [11, 26])), 'h');
  fill(c, poly([14, 12], [26, 11], [17, 18]), 'h');
  fill(c, poly([25, 12], [34, 12], [32, 17]), 'h');
  shadeHair(c);
  // Fur rim around the face and a fur placket down the closed coat.
  const rim = minus(ell(24, 19, 16, 18), ell(24, 20, 12.5, 14.5));
  fill(c, rim, 'c');
  fill(c, box(22, 38, 26, 55), 'c', 'yz');
  shade(c, 'c', 'd', null, 2);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (at(c, x, y) === 'c' && (x * 3 + y * 5) % 11 === 0) c[y]![x] = 'd';
  // Warm accent: a thick knitted red scarf wrapped high, both short ends tucked to her right.
  fill(c, ell(24, 35, 11.5, 4.5), 'm');
  fill(c, poly([12, 35], [19, 36], [18, 45], [11, 44]), 'm');
  fill(c, poly([11, 44], [18, 45], [18, 46], [11, 45]), 'w', 'm');
  fill(c, any(box(0, 33, 47, 33), box(0, 37, 47, 37)), 'n', 'm');
  shade(c, 'm', 'n', null, 1);
  return finish(c, {
    ...P_SKIN_PALE, e: '#4890c8',
    h: '#c8d8f0', i: '#90a4c8', j: '#eef4fc', c: '#f8f8f8', d: '#c8d4e4', y: '#4c78c8', z: '#3458a0', u: '#f0f4f8',
    m: '#e04040', n: '#a82830', w: '#f8e8e0',
  }, [HAIR_EDGE, ['cd', 'hijstvT'], ['cd', 'yz'], ['mnw', 'cdyz']]);
}

// ---------------------------------------------------------------------------
// Parametric busts for everyone else: torso + head + hair + hat + per-class details.
// Palette slots: a/b top, u shirt/collar, h/i/j hair, c/d/l hat (main/shade/band),
// m/n accent (apron, scarf, vest), p/q straps/props, g lens/emblem.
// ---------------------------------------------------------------------------

type TopStyle = 'tee' | 'collar' | 'jacket' | 'coat' | 'uniform';
type HairStyle = 'short' | 'messy' | 'long' | 'ponytail' | 'pigtails' | 'bob' | 'bun' | 'bald';
type HatStyle = 'cap' | 'bucket' | 'ranger' | 'guard' | 'beanie' | 'band' | 'goggles';

interface BustDef {
  top: TopStyle;
  hair: HairStyle;
  hat?: HatStyle;
  face: Face;
  /** Narrow, lower shoulders. */
  child?: boolean;
  /** Details drawn last (beards, aprons, straps, props). */
  extra?: (c: Canvas) => void;
  pal: Palette;
}

function drawTop(c: Canvas, style: TopStyle, child: boolean): void {
  const top = child ? 34 : 33;
  fill(c, child ? shoulders(17, top) : SHOULDERS, 'a');
  switch (style) {
    case 'tee':
      fill(c, ell(24, top, 5, 3.5), '.', 'a');
      fill(c, minus(ell(24, top, 6.5, 5), ell(24, top, 5, 3.5)), 'u', 'a');
      break;
    case 'collar':
      fill(c, poly([20, top - 1], [28, top - 1], [24, top + 6]), '.', 'a');
      fill(c, mir(poly([16, top], [21, top - 1], [24, top + 6], [19, top + 5])), 'u', 'a');
      break;
    case 'jacket':
      fill(c, box(20, top + 1, 27, 55), 'u', 'a');
      fill(c, mir(poly([17, top], [21, top + 1], [21, top + 8], [19, top + 11])), 'n', 'a');
      break;
    case 'coat':
      fill(c, poly([18, top + 1], [29, top + 1], [24, top + 17]), 'u', 'a');
      break;
    case 'uniform':
      fill(c, box(19, top - 1, 28, top + 2), 'a');
      for (const y of [41, 46, 51]) fill(c, box(23, y, 24, y), 'g', 'a');
      fill(c, mir(box(4, 41, 10, 42)), 'g', 'a');
      break;
  }
  shade(c, 'a', 'b', null, 3);
  shade(c, 'u', 'z', null, 1);
}

function drawHair(c: Canvas, style: HairStyle): void {
  const bangs = (): void => {
    for (const b of [poly([14, 12], [21, 12], [16, 17]), poly([20, 12], [27, 12], [24, 16]), poly([27, 12], [34, 12], [32, 17])]) fill(c, b, 'h');
  };
  const parted = (): void => fill(c, mir(poly([13, 11], [24, 8], [24, 10], [17, 16], [15, 19])), 'h');
  if (style !== 'bald' && style !== 'bun') fill(c, HAIR_CAP, 'h');
  switch (style) {
    case 'short':
      fill(c, SIDEBURNS, 'h');
      bangs();
      break;
    case 'messy':
      fill(c, SIDEBURNS, 'h');
      for (const t of [poly([17, 5], [22, 3], [16, 0]), poly([22, 4], [27, 3], [25, -1])]) fill(c, t, 'h');
      bangs();
      break;
    case 'long':
      fill(c, mir(poly([12, 10], [17, 11], [17, 22], [16, 30], [18, 40], [15, 43], [12, 40], [9, 33], [10, 20])), 'h');
      parted();
      break;
    case 'ponytail':
      fill(c, SIDEBURNS, 'h');
      parted();
      fill(c, poly([33, 13], [38, 17], [38, 30], [35, 44], [31, 38], [34, 28], [34, 20]), 'h');
      break;
    case 'pigtails':
      fill(c, SIDEBURNS, 'h');
      bangs();
      fill(c, mir(poly([12, 13], [8, 16], [4, 28], [6, 36], [9, 32], [13, 22])), 'h');
      break;
    case 'bob':
      fill(c, mir(poly([12, 10], [16, 12], [16, 21], [15, 26], [12, 29], [9, 29], [10, 24], [10, 16])), 'h');
      fill(c, poly([13, 12], [30, 10], [19, 16], [16, 19]), 'h');
      fill(c, poly([28, 12], [35, 13], [33, 18]), 'h');
      break;
    case 'bun':
      // Pulled back from a rounded hairline into the bun.
      fill(c, minus(HAIR_CAP, ell(24, 15.5, 8.5, 6.5)), 'h');
      fill(c, mir(poly([12, 9], [16, 11], [16, 19], [13, 21], [11, 15])), 'h');
      drawBun(c);
      break;
    case 'bald':
      fill(c, mir(poly([12, 13], [16, 14], [16, 21], [13, 23], [11, 18])), 'h');
      fill(c, ell(20.5, 8.5, 2.5, 1.5), 'v', 's');
      break;
  }
  shade(c, 'h', 'i', 'j', 2, 'hij');
  if (style !== 'bald') fill(c, poly([15, 8], [22, 4.5], [22.5, 6], [16, 10]), 'j', 'h');
  if (style === 'bun') {
    bunCrease(c);
    line(c, [24, 9], [24, 8], 'i', 'h');
    line(c, [19, 10], [21, 7], 'i', 'h', true);
    line(c, [15, 13], [17, 8], 'i', 'h', true);
  }
  if (style === 'long' || style === 'bob') line(c, [13, 17], [12, 26], 'i', 'h', true);
  if (style === 'long') line(c, [15, 27], [14, 39], 'i', 'h', true);
  castShadow(c, 'hij', 'sv', 't');
}

function drawHat(c: Canvas, style: HatStyle): void {
  switch (style) {
    case 'cap':
      fill(c, both(ell(24, 11, 12.5, 9), box(0, 0, 47, 11)), 'c');
      fill(c, box(22, 5, 25, 7), 'l', 'c');
      fill(c, ell(24, 12.5, 13.5, 2.5), 'd');
      break;
    case 'bucket':
      fill(c, both(ell(24, 10.5, 11, 8.5), box(0, 0, 47, 12)), 'c');
      fill(c, box(13, 9, 35, 10), 'l', 'c');
      fill(c, poly([12, 11], [36, 11], [41, 16], [7, 16]), 'c');
      break;
    case 'ranger':
      fill(c, poly([14, 12], [16, 3], [22, 1], [24, 3], [26, 1], [32, 3], [34, 12]), 'c');
      fill(c, box(14, 9, 34, 11), 'l', 'c');
      fill(c, ell(24, 12.5, 22, 2.8), 'c');
      break;
    case 'guard':
      fill(c, poly([11, 10], [14, 3], [34, 3], [37, 10]), 'c');
      fill(c, box(13, 9, 35, 11), 'l');
      fill(c, poly([14, 12], [34, 12], [31, 15], [17, 15]), 'd');
      stamp(c, ['.m.', 'mmm', 'mmm'], 23, 5);
      break;
    case 'beanie':
      fill(c, both(ell(24, 12, 12.5, 10.5), box(0, 0, 47, 14)), 'c');
      fill(c, both(ell(24, 12, 12.5, 10.5), box(0, 10, 47, 14)), 'l');
      for (let x = 12; x < 37; x += 2) line(c, [x, 10], [x, 14], 'd', 'l');
      break;
    case 'band':
      // Drawn in the collar color 'u' so the thin band is not edged into an outline.
      fill(c, both(minus(ell(24, 16.5, 12.6, 10.5), ell(24, 18.5, 12.6, 10.5)), box(0, 0, 47, 12)), 'u', 'hij');
      stamp(c, ['..g', '.gg', 'gg.'], 23, 5);
      break;
    case 'goggles':
      fill(c, both(box(11, 8, 36, 10), ell(24, 12, 13.5, 11)), 'l');
      fill(c, mir(ell(18.5, 9.5, 4, 3.5)), 'c');
      fill(c, mir(ell(18.5, 9.5, 2.5, 2)), 'g');
      stamp(c, ['w.', '.w'], 17, 8);
      stamp(c, ['w.', '.w'], 28, 8);
      break;
  }
  shade(c, 'c', 'd', null, style === 'ranger' || style === 'bucket' ? 2 : 1);
  castShadow(c, 'cdl', 'sv', 't', 2);
}

function bust(def: BustDef): () => Bitmap {
  return () => {
    const c = blankCanvas();
    if (def.hair === 'long') fill(c, box(14, 22, 33, 34), 'h');
    drawTop(c, def.top, def.child ?? false);
    drawHead(c, def.face);
    drawHair(c, def.hair);
    if (def.hat) drawHat(c, def.hat);
    def.extra?.(c);
    return finish(c, def.pal, [HAIR_EDGE, ['cdl', 'hijstvT'], ['u', 'ab'], ['mn', 'abu'], ['pq', 'abumn']]);
  };
}

/** Mustache over the upper lip (hair color). */
const mustache = (c: Canvas): void => stamp(c, ['..hhhhhh..', '.hhhiihhh.', '.h......h.'], 19, 23);

/** Apron bib with neck straps in the accent color. */
function apron(c: Canvas): void {
  fill(c, poly([16, 41], [31, 41], [33, 55], [14, 55]), 'm');
  line(c, [17, 41], [19, 34], 'm', 'abu', true);
  shade(c, 'm', 'n', null, 2);
}

/** Backpack shoulder straps. */
function straps(c: Canvas): void {
  fill(c, mir(poly([11, 36], [15, 35], [16, 55], [12, 55])), 'p');
  fill(c, mir(box(12, 46, 15, 47)), 'q', 'p');
  shade(c, 'p', 'q', null, 1);
}

const BUSTS: Partial<Record<CharSpriteId, BustDef>> = {
  player: {
    top: 'jacket', hair: 'short', hat: 'beanie', face: { eyes: 'm', brows: 'flat', mouth: 'smile', browCh: 'i' },
    extra: straps,
    pal: {
      c: '#48b048', d: '#2c8038', l: '#3c9840', h: '#6c4428', i: '#4c2c18', j: '#8c5c38',
      a: '#f08830', b: '#c05c20', u: '#384870', z: '#283458', n: '#c05c20', p: '#e8c048', q: '#b88c28',
    },
  },
  mom: {
    top: 'collar', hair: 'ponytail', face: { eyes: 'f', brows: 'kind', mouth: 'smile', browCh: 'i' },
    extra: apron,
    pal: {
      h: '#9c5830', i: '#703c20', j: '#c07848', a: '#e87890', b: '#c05870', u: '#f8f0e0', z: '#d8d0c0',
      m: '#f8f0e0', n: '#d8d0c0',
    },
  },
  nurse: {
    top: 'collar', hair: 'bob', hat: 'band', face: { eyes: 'f', brows: 'kind', mouth: 'smile', browCh: 'i' },
    extra: (c) => {
      stamp(c, ['..g', '.gg', 'gg.'], 31, 44);
    },
    pal: {
      h: '#7c4428', i: '#582c18', j: '#a06038', c: '#f8f8f8', d: '#d0d8e0', l: '#f8f8f8', g: '#48b050',
      a: '#38a8a0', b: '#287c78', u: '#f8f8f8', z: '#d0d8e0',
    },
  },
  clerk: {
    top: 'collar', hair: 'short', face: { eyes: 'm', brows: 'flat', mouth: 'smile', browCh: 'i' },
    extra: apron,
    pal: {
      h: '#403840', i: '#282028', j: '#605860', a: '#e8e0d0', b: '#b8b0a0', u: '#f8f8f8', z: '#d0d0d0',
      m: '#3878d0', n: '#2858a0',
    },
  },
  boy: {
    top: 'tee', hair: 'short', hat: 'cap', face: { eyes: 'm', brows: 'flat', mouth: 'grin', browCh: 'i' },
    pal: {
      ...P_SKIN_TAN, c: '#3878d8', d: '#2850a0', l: '#f8f8f8', h: '#3c2c20', i: '#281c14', j: '#5c4430',
      a: '#f8f8f0', b: '#c8c8c0', u: '#4870b0', z: '#305080',
    },
  },
  girl: {
    top: 'collar', hair: 'pigtails', face: { eyes: 'f', brows: 'kind', mouth: 'open', browCh: 'i' },
    extra: (c) => fill(c, mir(box(9, 15, 12, 17)), 'm', 'hij'),
    pal: {
      h: '#e8a040', i: '#b87428', j: '#f8c870', a: '#e05888', b: '#b03c68', u: '#f8f8f0', z: '#d0d0c8',
      m: '#e04878', n: '#b02c58',
    },
  },
  man: {
    top: 'jacket', hair: 'short', face: { eyes: 'm', brows: 'thick', mouth: 'flat', browCh: 'i' },
    extra: mustache,
    pal: {
      h: '#4c3424', i: '#34221a', j: '#6c4c34', a: '#a06838', b: '#784c28', n: '#784c28', u: '#e8e0c8', z: '#c0b8a0',
    },
  },
  woman: {
    top: 'tee', hair: 'long', face: { eyes: 'f', brows: 'kind', mouth: 'soft', browCh: 'i' },
    pal: {
      h: '#a03838', i: '#702428', j: '#c85850', a: '#f0c040', b: '#c09020', u: '#c09020', z: '#987018',
    },
  },
  oldman: {
    top: 'jacket', hair: 'bald', face: { eyes: 'calm', brows: 'thick', mouth: 'flat', browCh: 'h' },
    extra: (c) => {
      mustache(c);
      line(c, [19, 11], [28, 11], 't', 's');
      line(c, [20, 13], [27, 13], 't', 's');
    },
    pal: {
      h: '#e0e0e0', i: '#a8a8b0', j: '#f8f8f8', a: '#8c7058', b: '#6c5440', n: '#6c5440', u: '#e8e0d0', z: '#c0b8a8',
    },
  },
  oldwoman: {
    top: 'collar', hair: 'bun', face: { eyes: 'calm', brows: 'kind', mouth: 'smile', browCh: 'i' },
    extra: (c) => {
      // Knitted shawl over the shoulders.
      fill(c, both(shoulders(23, 34), box(0, 0, 47, 44)), 'm', 'abu');
      fill(c, poly([20, 42], [28, 42], [24, 50]), 'm', 'ab');
      shade(c, 'm', 'n', null, 2);
    },
    pal: {
      h: '#d0d0d8', i: '#9898a8', j: '#f0f0f0', a: '#9070b0', b: '#6c5088', u: '#f0e8f0', z: '#c8c0d0',
      m: '#c8a0d0', n: '#9878a8',
    },
  },
  kid: {
    top: 'tee', hair: 'messy', child: true, face: { eyes: 'big', brows: 'flat', mouth: 'grin', browCh: 'i' },
    extra: (c) => {
      for (const [x, y] of [[18, 23], [20, 22], [29, 22], [31, 23]] as const) c[y]![x] = 't';
    },
    pal: {
      h: '#e8b040', i: '#b88028', j: '#f8d878', a: '#e04848', b: '#b02c30', u: '#f8f8f0', z: '#d0d0c8',
    },
  },
  hiker: {
    top: 'collar', hair: 'short', hat: 'cap', face: { eyes: 'm', brows: 'thick', mouth: 'grin', browCh: 'i' },
    extra: (c) => {
      fill(c, minus(both(any(ell(24, 23, 10, 9), ell(24, 29, 7, 5)), box(0, 21, 47, 40)), box(20, 24, 27, 27)), 'h', 'stvTx');
      shade(c, 'h', 'i', null, 1, 'hi');
      stamp(c, MOUTHS.grin, 21, 25);
      straps(c);
    },
    pal: {
      ...P_SKIN_TAN, c: '#c06830', d: '#904820', l: '#f0c040', h: '#5c3820', i: '#402410', j: '#7c5030',
      a: '#b04838', b: '#843028', u: '#e8d8b0', z: '#c0b088', p: '#58784c', q: '#405838',
    },
  },
  fisher: {
    top: 'jacket', hair: 'short', hat: 'bucket', face: { eyes: 'm', brows: 'flat', mouth: 'smirk', browCh: 'i' },
    extra: (c) => {
      // Fishing rod over the right shoulder, buckles on the life vest.
      line(c, [36, 55], [45, 4], 'p');
      line(c, [37, 55], [46, 4], 'q');
      fill(c, box(35, 44, 39, 47), 'p');
      for (const y of [42, 49]) fill(c, mir(box(17, y, 19, y + 1)), 'm', 'a');
    },
    pal: {
      ...P_SKIN_TAN, c: '#f0c838', d: '#c89c20', l: '#c89c20', h: '#5c4430', i: '#402c1c', j: '#7c6040',
      a: '#e05838', b: '#b03c28', n: '#b03c28', u: '#4c6890', z: '#384c6c', m: '#f8e080', p: '#5c5060', q: '#3c3440',
    },
  },
  scientist: {
    top: 'coat', hair: 'short', hat: 'goggles', face: { eyes: 'm', brows: 'flat', mouth: 'flat', browCh: 'i' },
    pal: {
      h: '#686070', i: '#484050', j: '#8c8494', c: '#686c78', d: '#484c58', l: '#383c48', g: '#78d8f0',
      a: '#f0f4f8', b: '#c0c8d8', u: '#40a0a0', z: '#2c7878',
    },
  },
  ranger: {
    top: 'collar', hair: 'short', hat: 'ranger', face: { eyes: 'm', brows: 'thick', mouth: 'smile', browCh: 'i' },
    extra: (c) => {
      fill(c, poly([19, 35], [29, 35], [24, 42]), 'm');
      fill(c, box(23, 35, 25, 37), 'n');
      stamp(c, ['.g.', 'ggg', 'g.g'], 32, 42);
    },
    pal: {
      ...P_SKIN_TAN, c: '#a88850', d: '#806430', l: '#48803c', h: '#5c3820', i: '#402410', j: '#7c5030',
      a: '#58a050', b: '#3c7838', u: '#58a050', z: '#3c7838', m: '#e8c040', n: '#b88c20', g: '#f0d060',
    },
  },
  guard: {
    top: 'uniform', hair: 'short', hat: 'guard', face: { eyes: 'm', brows: 'stern', mouth: 'flat', browCh: 'i' },
    pal: {
      c: '#304880', d: '#202840', l: '#202840', m: '#f0c840', g: '#f0c840', h: '#3c3030', i: '#281c1c', j: '#5c4848',
      a: '#3c5898', b: '#283c70',
    },
  },
};

const PORTRAITS: Partial<Record<CharSpriteId, () => Bitmap>> = {
  rival: portraitRival,
  prof: portraitProf,
  grunt: portraitGrunt,
  boss: portraitBoss,
  leader_earth: portraitEarth,
  leader_water: portraitWater,
  leader_spark: portraitSpark,
  leader_frost: portraitFrost,
  ...Object.fromEntries(Object.entries(BUSTS).map(([id, def]) => [id, bust(def)])),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const frameCache = new Map<string, Bitmap>();

function cached(key: string, make: () => Bitmap): Bitmap {
  let b = frameCache.get(key);
  if (!b) {
    b = make();
    frameCache.set(key, b);
  }
  return b;
}

/** 16×16 overworld frame. frame: 0 = standing, 1 = step A, 2 = step B. Objects ignore dir/frame. */
export function charFrame(id: CharSpriteId, dir: Dir, frame: 0 | 1 | 2): Bitmap {
  if (isObject(id)) {
    const obj = OBJECTS[id];
    return cached(id, () => paint(compose(16, 16, [{ grid: obj.grid }]), { ...BASE_PAL, ...obj.pal }));
  }
  if (dir === 'left') return cached(`${id}:left:${frame}`, () => flipX(charFrame(id, 'right', frame)));
  const def = CAST[id];
  return cached(`${id}:${dir}:${frame}`, () => paint(personCanvas(def, dir, frame), { ...BASE_PAL, ...def.pal }));
}

/** The player seen from behind (battle intro, 48×56 like the portraits): beanie, hair, orange jacket, backpack. */
export function playerBackPortrait(): Bitmap {
  return cached('portrait:player:back', () => {
    const c = blankCanvas();
    // Jacket with the collar of the navy shirt peeking out.
    fill(c, SHOULDERS, 'a');
    fill(c, ell(24, 33.5, 6.5, 2.5), 'u', 'a');
    shade(c, 'a', 'b', null, 3);
    // Back of the head: hair down to the nape, ears at the sides.
    fill(c, NECK, 't', '.');
    fill(c, EARS, 's');
    fill(c, HEAD, 'h');
    fill(c, both(HEAD, box(0, 27, 47, 31)), 's', 'h');
    for (const tuft of [poly([16, 24], [20, 24], [18, 29]), poly([21, 25], [27, 25], [24, 30]), poly([28, 24], [32, 24], [30, 29])]) fill(c, tuft, 'h');
    shade(c, 's', 't', 'v', 1, 'stv');
    shade(c, 'h', 'i', 'j', 2, 'hij');
    fill(c, poly([16, 16], [22, 15], [17, 19]), 'j', 'h');
    line(c, [24, 16], [24, 24], 'i', 'h');
    castShadow(c, 'hij', 'sv', 't');
    drawHat(c, 'beanie');
    // Backpack with a flap, straps over the shoulders.
    fill(c, mir(poly([13, 35], [17, 34], [17, 41], [13, 42])), 'p', 'abu');
    fill(c, poly([14, 40], [34, 40], [35, 55], [13, 55]), 'p');
    fill(c, poly([14, 40], [34, 40], [33, 46], [15, 46]), 'q');
    fill(c, box(22, 45, 26, 47), 'g');
    fill(c, box(18, 49, 30, 55), 'q', 'p');
    shade(c, 'p', 'q', null, 1, 'p');
    return finish(c, {
      c: '#48b048', d: '#2c8038', l: '#3c9840', h: '#6c4428', i: '#4c2c18', j: '#8c5c38',
      a: '#f08830', b: '#c05c20', u: '#384870', z: '#283458', p: '#e8c048', q: '#b88c28', g: '#806020',
    }, [HAIR_EDGE, ['cdl', 'hijstvT'], ['pqg', 'abu'], ['u', 'ab']]);
  });
}

// ---------------------------------------------------------------------------
// Intro figures (48×64, full body, front view): Professorin Arven and the player and the rival she
// introduces. Same shapes, cel shading and 1px scale as the portraits.
// ---------------------------------------------------------------------------

const FIG_H = 64;

/** Egg-shaped head (top y 5.5, chin y 21.5), narrower at the jaw. */
const FIG_HEAD: Shape = (x, y) => {
  const yy = y + 0.5 - 14;
  const dy = yy / (yy < 0 ? 8.5 : 7.5);
  if (Math.abs(dy) > 1) return false;
  let hw = 7.4 * Math.sqrt(1 - dy * dy);
  if (dy > 0) hw *= 1 - 0.3 * dy;
  return Math.abs(x + 0.5 - 24) <= hw;
};
const FIG_EARS = mir(ell(16.5, 15, 1.4, 2.1));
const FIG_NECK = box(22, 19, 25, 24);
const FIG_TORSO = mir(poly([15, 25], [19, 23], [24, 23], [24, 43], [15.5, 43], [14.5, 29]));
/** Sleeve hanging at the left side (`mirrored` for the right), its cuff rows and the hand below. */
const FIG_ARM = poly([14, 24.5], [17.5, 26], [17.5, 32], [17, 39.5], [13.5, 39.5], [12.8, 32], [12.3, 27.5]);
const FIG_HAND = ell(15.3, 41.3, 1.9, 2.1);
const mirrored = (s: Shape): Shape => (x, y) => s(PW - 1 - x, y);
const FIG_LEGS = mir(poly([17, 42.5], [24, 42.5], [24, 46], [22.6, 58], [17.8, 58]));
const FIG_SHOES = mir(poly([16.5, 57.5], [23, 57.5], [23.3, 62], [15.5, 62], [15.5, 59.5]));
/** Small anime eyes: lash row, highlight + iris (light from the top-left on both eyes). */
const FIG_EYE = ['kk', 'we', 'ee'];

/** Legs 'n', shoes 'f' and an open jacket 'a' over a shirt 'u'. */
function figureBody(c: Canvas): void {
  fill(c, FIG_LEGS, 'n');
  fill(c, both(FIG_LEGS, (x) => x === 23 || x === 24), 'N');
  shade(c, 'n', 'N', null, 1);
  fill(c, FIG_SHOES, 'f');
  fill(c, box(0, 61, 47, 61), 'F', 'f');
  fill(c, FIG_TORSO, 'a');
  fill(c, mir(poly([21, 23], [24, 23], [24, 43], [21.5, 43])), 'u');
  shade(c, 'a', 'b', null, 2);
  shade(c, 'u', 'z', null, 1);
}

/** Sleeves 'A' with cuffs 'B' and hands 'g' (skin without the face highlight); outlined against the torso. */
function figureArms(c: Canvas, arms: Shape, cuffs: Shape, hands: Shape): void {
  fill(c, arms, 'A');
  fill(c, both(arms, cuffs), 'B');
  shade(c, 'A', 'B', null, 1, 'AB');
  fill(c, hands, 'g');
  shade(c, 'g', 't', null, 1, 'gt');
}

/** Neck, head, ears, eyes, nose and mouth. */
function figureHead(c: Canvas, mouth: Grid): void {
  fill(c, FIG_NECK, 't');
  fill(c, FIG_HEAD, 's');
  fill(c, FIG_EARS, 's');
  shade(c, 's', 't', 'v', 1, 'stv');
  fill(c, both(FIG_NECK, minus((x, y) => FIG_HEAD(x, y - 2), FIG_HEAD)), 'T', 'st');
  stamp(c, FIG_EYE, 19, 14);
  stamp(c, FIG_EYE, 27, 14);
  c[17]![23] = 't';
  stamp(c, mouth, 22, 19);
}

function playerFigure(): Bitmap {
  const c = blankCanvas(PW, FIG_H);
  figureBody(c);
  fill(c, mir(poly([18.5, 22.5], [21.5, 22.5], [22, 26], [20, 27])), 'b');
  fill(c, mir(poly([17, 24], [19.5, 23.5], [20, 38], [17.5, 38])), 'p');
  fill(c, mir(box(17, 32, 19, 33)), 'q', 'p');
  // right hand grips the backpack strap, left arm hangs loose
  const upper = poly([14, 24.5], [17.5, 26], [17, 32], [14.5, 34], [12.3, 30], [12.3, 27.5]);
  const forearm = poly([12.5, 31], [16.5, 31], [19.5, 28.5], [20.5, 31.5], [17, 35.5], [13.5, 35.5]);
  figureArms(
    c,
    any(upper, forearm, mirrored(FIG_ARM)),
    any(poly([18, 29], [19.5, 28], [20.8, 31], [19.2, 32]), mirrored(box(0, 38, 47, 39))),
    any(ell(20.5, 29.5, 1.9, 1.9), mirrored(FIG_HAND)),
  );
  figureHead(c, ['x..x', '.xx.']);
  // short hair under the beanie: fringe and sideburns
  fill(c, mir(box(17, 11, 17, 15)), 'h');
  for (const b of [poly([17.5, 11], [22, 11], [18.5, 14]), poly([21, 11], [26.5, 11], [23.5, 13]), poly([25.5, 11], [30.5, 11], [29.5, 14])]) fill(c, b, 'h');
  shade(c, 'h', 'i', 'j', 1, 'hij');
  castShadow(c, 'hij', 'sv', 't');
  const cap = ell(24, 11.5, 8.6, 9.5);
  fill(c, both(cap, box(0, 0, 47, 11)), 'c');
  fill(c, both(cap, box(0, 9, 47, 11)), 'l');
  for (let x = 16; x < 33; x += 2) line(c, [x, 9], [x, 11], 'd', 'l');
  shade(c, 'c', 'd', null, 1);
  castShadow(c, 'cdl', 'sv', 't');
  edge(c, 'AB', 'abpqu');
  return finish(c, {
    c: '#48b048', d: '#2c8038', l: '#3c9840', h: '#6c4428', i: '#4c2c18', j: '#8c5c38', g: P_BASE.s!,
    a: '#f08830', b: '#c05c20', A: '#f08830', B: '#c05c20', u: '#384870', z: '#283458', p: '#e8c048', q: '#b88c28',
    n: '#384870', N: '#283458', f: '#503830', F: '#382420',
  }, [['cdl', 'hijstvT'], ['pq', 'abu'], ['u', 'ab']]);
}

function rivalFigure(): Bitmap {
  const c = blankCanvas(PW, FIG_H);
  figureBody(c);
  // hands in the jacket pockets: sleeves bent at the elbow, cuffs at the hips
  const arm = poly([14, 24.5], [17.5, 26], [17.5, 31], [18.8, 38], [15.8, 39.5], [12.6, 32], [12.3, 27.5]);
  figureArms(c, any(arm, mirrored(arm)), mir(poly([15.2, 37.5], [18.6, 36.5], [18.8, 38], [15.8, 39.5])), () => false);
  fill(c, mir(box(16, 40, 18, 40)), 'b', 'a');
  figureHead(c, ['...x', '.xx.']);
  stamp(c, ['ii.'], 18, 13);
  stamp(c, ['.ii'], 27, 13);
  // spiky hair: cap, spikes, bangs, highlights
  fill(c, both(ell(24, 11.5, 8.6, 8.5), box(0, 0, 47, 11)), 'h');
  fill(c, mir(box(17, 11, 17, 15)), 'h');
  for (const spike of [
    poly([17, 8], [21, 4], [12, 1]), poly([20.5, 5], [26, 3.5], [21.5, 0.5]), poly([25.5, 4], [30, 6], [32.5, 0.5]),
    poly([29.5, 6], [33, 11.5], [38, 4.5]), poly([16, 9], [17.5, 13.5], [10, 9.5]), poly([31.5, 10.5], [32, 15.5], [37, 13.5]),
    poly([16.5, 13], [17.5, 17], [12.5, 16.5]),
  ]) fill(c, spike, 'h');
  for (const bang of [poly([17, 11], [21.5, 11], [18.5, 15.5]), poly([20.5, 11], [25.5, 11], [22.5, 14.5]), poly([24.5, 11], [29.5, 11], [27.5, 14.5]), poly([28, 11], [31.5, 11], [30.5, 15.5])]) fill(c, bang, 'h');
  shade(c, 'h', 'i', null, 1, 'hi');
  fill(c, poly([18, 6], [22, 4.5], [19, 8]), 'j', 'hi');
  fill(c, poly([22.5, 4], [25.5, 4], [23, 6]), 'j', 'hi');
  castShadow(c, 'hij', 'sv', 't');
  // red scarf, its tail hanging over the chest
  fill(c, ell(24, 23.5, 6.2, 2.4), 'm');
  fill(c, poly([26, 24], [29.5, 24], [31, 34.5], [27.8, 35.5]), 'm');
  shade(c, 'm', 'M', null, 1);
  return finish(c, {
    h: '#3848a0', i: '#283070', j: '#6880d8', e: '#8c3828', g: P_BASE.s!,
    a: '#3c3c48', b: '#28283a', A: '#3c3c48', B: '#28283a', u: '#e0e0e8', z: '#b8b8c8', m: '#e03838', M: '#a02028',
    n: '#5c5868', N: '#403c4c', f: '#302830', F: '#201820',
  }, [['hij', 'stvT'], ['mM', 'abuzstT'], ['u', 'ab']]);
}

/** Arven is a grown-up: a taller canvas, longer legs, same head and pixel scale. */
const PROF_FIG_H = 70;

/**
 * Professorin Arven (48×70): high bun, long pale-blonde hair over the shoulders, round gold glasses,
 * knee-length lab coat open over a purple shirt, a clipboard in her left hand.
 */
function profFigure(): Bitmap {
  const c = blankCanvas(PW, PROF_FIG_H);
  // long hair falling down her back
  fill(c, poly([15.5, 12], [32.5, 12], [33.5, 31], [31, 34], [17, 34], [14.5, 31]), 'h');
  // trousers and shoes below the coat
  const legs = mir(poly([18, 40], [24, 40], [24, 48], [22.6, 63], [18.6, 63]));
  fill(c, legs, 'n');
  fill(c, both(legs, (x) => x === 23 || x === 24), 'N');
  shade(c, 'n', 'N', null, 1);
  fill(c, mir(poly([17.5, 62.5], [23, 62.5], [23.3, 67], [16, 67], [16, 64.5])), 'f');
  fill(c, box(0, 66, 47, 66), 'F', 'f');
  // knee-length lab coat, open over a purple shirt and flaring apart below the waist
  const coat = mir(poly([15, 25], [19, 23], [24, 23], [24, 55], [13.5, 55], [14.2, 40], [14.5, 30]));
  const opening = mir(poly([20.5, 23], [24, 23], [24, 56], [20.5, 56], [22.5, 41]));
  fill(c, minus(coat, opening), 'y');
  fill(c, both(opening, box(0, 0, 47, 40)), 'u');
  shade(c, 'y', 'z', null, 2);
  shade(c, 'u', 'U', null, 1);
  // chest pocket with a pen, hip pockets
  line(c, [27, 31], [30, 31], 'z', 'y');
  stamp(c, ['M', 'M'], 28, 29);
  line(c, [15, 46], [18, 46], 'z', 'y');
  line(c, [29, 46], [32, 46], 'z', 'yz');
  // sleeves hanging at her sides
  figureArms(c, any(FIG_ARM, mirrored(FIG_ARM)), box(0, 38, 47, 39), any(FIG_HAND, mirrored(FIG_HAND)));
  edge(c, 'AB', 'yzu');
  // clipboard held in her left hand
  fill(c, box(30, 41, 36, 50), 'k');
  fill(c, box(31, 42, 35, 49), 'p');
  for (const y of [44, 46, 48]) line(c, [31, y], [y === 48 ? 33 : 34, y], 'q', 'p');
  fill(c, box(32, 40, 34, 41), 'G');
  fill(c, mirrored(FIG_HAND), 'g');
  shade(c, 'g', 't', null, 1, 'gt');
  shade(c, 'k', 'K', null, 1);
  // head, then hair: a cap with parted bangs, a high bun, long locks over the shoulders
  figureHead(c, ['x..x', '.xx.']);
  fill(c, both(ell(24, 11.5, 8.4, 8.2), box(0, 0, 47, 10)), 'h');
  const bun = ell(24, 3, 4.4, 2.9);
  fill(c, bun, 'h');
  fill(c, mir(poly([16, 9], [24, 7.5], [24, 9.5], [20.5, 11.5], [17.5, 15])), 'h');
  // middle parting: a small notch in the fringe
  fill(c, box(22, 10, 25, 10), 's', 'h');
  fill(c, box(23, 9, 24, 9), 's', 'h');
  fill(c, mir(poly([15.5, 9.5], [18, 11], [18, 20], [17.6, 27], [18.6, 33], [16.5, 35.5], [15, 31], [14.5, 22], [15, 14])), 'h');
  shade(c, 'h', 'i', 'j', 1, 'hij');
  fill(c, poly([17.5, 7.5], [22, 5.8], [22.5, 6.8], [18.5, 9]), 'j', 'h');
  fill(c, ell(22.5, 1.8, 1.8, 0.9), 'j', 'h');
  // the bun sits in the hair mass: shaded crease along its lower edge
  fill(c, minus(bun, (x, y) => bun(x, y + 1)), 'i', 'hj');
  line(c, [16, 15], [16, 29], 'i', 'h', true);
  castShadow(c, 'hij', 'sv', 't');
  // thin gold round glasses (the lash row of the eye stamp is the top of the rim)
  for (const x0 of [18, 26]) {
    line(c, [x0, 14], [x0, 16], 'm', 'stv');
    line(c, [x0 + 3, 14], [x0 + 3, 16], 'm', 'stv');
    line(c, [x0 + 1, 17], [x0 + 2, 17], 'm', 'stv');
  }
  line(c, [22, 14], [25, 14], 'm', 'stv');
  return finish(c, {
    s: '#f8d4b0', t: '#ecb894', v: '#fff4e4', T: '#d89c78', x: '#c06850', r: '#f0a090', g: '#f8d4b0',
    h: '#d8c898', i: '#a89468', j: '#f4ecc8', e: '#3c8058', m: '#c8a070', M: '#7858a8',
    y: '#f8f8f8', z: '#c8d0e0', A: '#f8f8f8', B: '#c8d0e0', u: '#7858a8', U: '#58407c',
    n: '#5c4c6c', N: '#443850', f: '#5c4038', F: '#3c2820',
    k: '#a07048', K: '#785030', p: '#f4f0e4', q: '#b8b4c8', G: '#8890a0',
  }, [['hij', 'stvTyzABu'], ['u', 'yz'], ['kK', 'yzAB']]);
}

/** Full-body front view for the new-game intro (48×64; Arven 48×70; bottom-aligned). */
export function introFigure(id: 'player' | 'rival' | 'prof'): Bitmap {
  return cached(`figure:${id}`, () => (id === 'player' ? playerFigure() : id === 'rival' ? rivalFigure() : profFigure()));
}

/** Larger portrait used in trainer battle intros (48×56, bottom-aligned). Objects fall back to a 3× upscale. */
export function trainerPortrait(id: CharSpriteId): Bitmap {
  return cached(`portrait:${id}`, () => {
    const made = PORTRAITS[id];
    if (made) return made();
    return scaleNearest(charFrame(id, 'down', 0), 3);
  });
}
