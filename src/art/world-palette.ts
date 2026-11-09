/**
 * Shared palette + tiny pixel helpers for world art (tiles, buildings).
 * Ramps go from highlight to deepest shade; light comes from the top-left.
 */
import { type Bitmap, bitmapFromRows, blit, createBitmap, getPixel, parseColor, type Rgba, setPixel } from '../core/bitmap';

export const GRASS = { hi: '#c0f090', light: '#98e070', base: '#78c850', mid: '#58a840', dark: '#408830', deep: '#2c6030', deepest: '#1c4020' } as const;
/** Foliage: cooler and deeper than ground grass so trees separate from it. */
export const TREE = { hi: '#a0dc78', light: '#70bc50', base: '#509c40', mid: '#3c8038', dark: '#2c6430', deep: '#204c28', outline: '#163420' } as const;
export const PATH = { hi: '#f8e8c0', light: '#f0d8a0', base: '#e0c088', mid: '#c8a470', dark: '#a88458', deep: '#806040' } as const;
export const SAND = { hi: '#fffae0', light: '#f8f0c8', base: '#f0e0a8', mid: '#e0cc88', dark: '#c8b070', deep: '#a08c58' } as const;
export const WATER = { foam: '#f0fcff', hi: '#b8e8ff', light: '#80c4f8', base: '#5c9cec', mid: '#4884d8', dark: '#3468b8', deep: '#284c90' } as const;
export const SNOW = { white: '#ffffff', base: '#f0f4fc', mid: '#dce6f6', dark: '#b8c8e4', deep: '#8ca0c8' } as const;
export const ICE = { hi: '#ffffff', light: '#d8f8ff', base: '#a8e0f4', mid: '#78c4e8', dark: '#4c98c8', deep: '#306c98' } as const;
export const WOOD = { hi: '#f0c888', light: '#d8a868', base: '#c08850', mid: '#a06c3c', dark: '#7c4c2c', deep: '#58331c' } as const;
export const STONE = { hi: '#f8f8f0', light: '#dcdcd4', base: '#bcbcb4', mid: '#9c9c96', dark: '#76767a', deep: '#54545c' } as const;
/** Warm alpine rock for cliffs and cave mouths. */
export const ROCK = { hi: '#e8dcc0', light: '#cab898', base: '#ac9a7c', mid: '#8e7c64', dark: '#6c5c4c', deep: '#4a3e36' } as const;
export const CAVE = { light: '#bca484', base: '#a48c6c', mid: '#8a7256', dark: '#6c5842', deep: '#4c3e30', deepest: '#2e261e' } as const;
export const FLOWER = { red: '#f05860', redDark: '#b83040', yellow: '#f8d840', yellowDark: '#d8a020', white: '#fcfcf8', whiteShade: '#c8d0e0', blue: '#6c8cf8', blueDark: '#3c58c0' } as const;
export const FLAME = { core: '#fffce0', inner: '#ffe068', mid: '#ffa040', outer: '#f06040', rose: '#e83c78', deep: '#a82858' } as const;
export const INDOOR = {
  wallHi: '#fcf6e4', wall: '#f0e4c8', wallMid: '#dccaa4', wallDark: '#bca684',
  trim: '#9c6c48', trimDark: '#6c4630', trimHi: '#c8946a',
  floorHi: '#f2d0a0', floor: '#e0b480', floorMid: '#cc9c6c', floorDark: '#a87a50',
  tileA: '#fafaf2', tileB: '#c8d8ec', tileLine: '#a4b4cc', tileShade: '#e4e8ec',
  carpet: '#d0484c', carpetMid: '#b03440', carpetDark: '#882430', carpetGold: '#f0c048', carpetGoldDark: '#c08c28',
  hall: '#dfe2ec', hallMid: '#c4cadc', hallDark: '#9ea6c0', hallLine: '#848ca8', hallHi: '#f8f8ff', hallInlay: '#5c6c9c',
  glass: '#a8dcf8', glassDark: '#70acdc', glassHi: '#f0faff',
  teal: '#40b0a8', tealMid: '#38a098', tealDark: '#287c78', tealDeep: '#1c5450', tealLight: '#88dcd0',
  metal: '#c8ccd8', metalMid: '#a0a4b4', metalDark: '#6c7084', metalDeep: '#484c5c',
  screen: '#48d0b8', screenHi: '#b8fff0', screenDark: '#208878',
  black: '#101010',
} as const;
/** Translucent cast shadow; blends with whatever ground lies underneath (see blendDot). */
export const SHADOW = '#1c284c60';

// ---------------------------------------------------------------------------
// Pixel helpers (only for bitmaps the caller is still building)
// ---------------------------------------------------------------------------

export function canvas(w: number, h: number, fill?: string): Bitmap {
  const b = createBitmap(w, h);
  if (fill) rect(b, 0, 0, w, h, fill);
  return b;
}

export function copyBitmap(src: Bitmap): Bitmap {
  const out = createBitmap(src.w, src.h);
  out.data.set(src.data);
  return out;
}

export function dot(b: Bitmap, x: number, y: number, color: string): void {
  setPixel(b, x, y, parseColor(color));
}

/** Like dot, but coordinates wrap around (for seamless textures). */
export function dotWrap(b: Bitmap, x: number, y: number, color: string): void {
  setPixel(b, ((x % b.w) + b.w) % b.w, ((y % b.h) + b.h) % b.h, parseColor(color));
}

export function rect(b: Bitmap, x: number, y: number, w: number, h: number, color: string): void {
  const c = parseColor(color);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPixel(b, i, j, c);
}

/** Alpha-composites `color` (may be translucent, e.g. SHADOW) over the pixel at (x, y). */
export function blendDot(b: Bitmap, x: number, y: number, color: string): void {
  blendRgba(b, x, y, parseColor(color));
}

/** Alpha-composites src over dst (same size), honouring translucent pixels such as SHADOW. */
export function compositeOver(dst: Bitmap, src: Bitmap): void {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) blendRgba(dst, x, y, getPixel(src, x, y));
}

function blendRgba(b: Bitmap, x: number, y: number, [r, g, bl, a]: Rgba): void {
  if (a === 0 || x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const [dr, dg, db, da] = getPixel(b, x, y);
  const sa = a / 255;
  const dA = (da / 255) * (1 - sa);
  const oa = sa + dA;
  const mix = (s: number, d: number) => Math.round((s * sa + d * dA) / oa);
  setPixel(b, x, y, [mix(r, dr), mix(g, dg), mix(bl, db), Math.round(oa * 255)]);
}

export function clearPixel(b: Bitmap, x: number, y: number): void {
  setPixel(b, x, y, [0, 0, 0, 0]);
}

/** Draws row-art (see bitmapFromRows) at (x, y). '.' stays transparent unless the palette maps it. */
export function stamp(b: Bitmap, rows: readonly string[], pal: Readonly<Record<string, string>>, x: number, y: number): void {
  blit(b, bitmapFromRows(rows, pal), x, y);
}

/** Deterministic 0..1 noise per integer coordinate. */
export function hash(x: number, y: number, seed = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
