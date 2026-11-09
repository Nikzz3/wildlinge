/** Immutable-by-convention RGBA image. Pure data: usable in Node (sheets, tests) and browser. */
export interface Bitmap {
  readonly w: number;
  readonly h: number;
  /** RGBA bytes, row-major, length w*h*4. Never mutate after the bitmap is handed out. */
  readonly data: Uint8ClampedArray;
}

export type Rgba = readonly [number, number, number, number];

export function createBitmap(w: number, h: number): Bitmap {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

const colorCache = new Map<string, Rgba>();

/** Parses '#rgb', '#rrggbb', '#rrggbbaa' or 'transparent'. Throws on anything else. */
export function parseColor(color: string): Rgba {
  const cached = colorCache.get(color);
  if (cached) return cached;
  let out: Rgba;
  if (color === 'transparent') out = [0, 0, 0, 0];
  else if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [r, g, b] = [1, 2, 3].map((i) => parseInt(color[i]! + color[i]!, 16)) as [number, number, number];
    out = [r, g, b, 255];
  } else if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(color)) {
    const n = (i: number) => parseInt(color.slice(i, i + 2), 16);
    out = [n(1), n(3), n(5), color.length === 9 ? n(7) : 255];
  } else throw new Error(`Invalid color "${color}"`);
  colorCache.set(color, out);
  return out;
}

export function toHex([r, g, b]: Rgba): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds a bitmap from text rows. Each character is looked up in `palette`
 * ('#rrggbb' colors). '.' is transparent unless the palette defines it.
 * Throws if rows have different lengths or a character is missing from the palette.
 */
export function bitmapFromRows(rows: readonly string[], palette: Readonly<Record<string, string>>): Bitmap {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const b = createBitmap(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`bitmapFromRows: row ${y} has length ${row.length}, expected ${w}: "${row}"`);
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      const color = palette[ch] ?? (ch === '.' ? 'transparent' : undefined);
      if (color === undefined) throw new Error(`bitmapFromRows: char "${ch}" (row ${y}) not in palette`);
      setPixel(b, x, y, parseColor(color));
    }
  });
  return b;
}

export function getPixel(b: Bitmap, x: number, y: number): Rgba {
  const i = (y * b.w + x) * 4;
  return [b.data[i]!, b.data[i + 1]!, b.data[i + 2]!, b.data[i + 3]!];
}

/** Only for building a bitmap you just created. */
export function setPixel(b: Bitmap, x: number, y: number, [r, g, bl, a]: Rgba): void {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
  const i = (y * b.w + x) * 4;
  b.data[i] = r;
  b.data[i + 1] = g;
  b.data[i + 2] = bl;
  b.data[i + 3] = a;
}

export function flipX(src: Bitmap): Bitmap {
  const out = createBitmap(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) setPixel(out, src.w - 1 - x, y, getPixel(src, x, y));
  return out;
}

export function scaleNearest(src: Bitmap, factor: number): Bitmap {
  const out = createBitmap(Math.round(src.w * factor), Math.round(src.h * factor));
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) setPixel(out, x, y, getPixel(src, Math.floor(x / factor), Math.floor(y / factor)));
  return out;
}

/** Replaces exact colors (hex → hex). Useful for palette swaps. */
export function recolor(src: Bitmap, map: Readonly<Record<string, string>>): Bitmap {
  const lookup = new Map<string, Rgba>();
  for (const [from, to] of Object.entries(map)) lookup.set(toHex(parseColor(from)), parseColor(to));
  const out = createBitmap(src.w, src.h);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const p = getPixel(src, x, y);
      setPixel(out, x, y, p[3] === 0 ? p : (lookup.get(toHex(p)) ?? p));
    }
  return out;
}

/** Draws src onto dst (which must be freshly created / owned by the caller). Opaque pixels overwrite. */
export function blit(dst: Bitmap, src: Bitmap, dx: number, dy: number): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const p = getPixel(src, x, y);
      if (p[3] > 0) setPixel(dst, dx + x, dy + y, p);
    }
}

export function crop(src: Bitmap, sx: number, sy: number, w: number, h: number): Bitmap {
  const out = createBitmap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sx + x < src.w && sy + y < src.h) setPixel(out, x, y, getPixel(src, sx + x, sy + y));
  return out;
}
