/** Chunky block-letter logo ("WILDLINGE", "ENDE") built in code: gradient face, extrusion and outline. */
import { type Bitmap, bitmapFromRows, createBitmap, getPixel, parseColor, setPixel } from '../core/bitmap';
import type { Gfx } from '../core/contracts';
import { gradientBitmap, lazy } from './fx';

/** 8-row block letters with 2px strokes (only the letters the game needs). */
const LETTERS: Readonly<Record<string, readonly string[]>> = {
  W: ['##....##', '##....##', '##....##', '##.##.##', '##.##.##', '########', '###..###', '##....##'],
  I: ['##', '##', '##', '##', '##', '##', '##', '##'],
  L: ['##....', '##....', '##....', '##....', '##....', '##....', '######', '######'],
  D: ['#####..', '######.', '##..###', '##...##', '##...##', '##..###', '######.', '#####..'],
  N: ['##...##', '###..##', '####.##', '#######', '##.####', '##..###', '##...##', '##...##'],
  G: ['.#####.', '#######', '##...##', '##.....', '##..###', '##...##', '#######', '.#####.'],
  E: ['######', '######', '##....', '#####.', '#####.', '##....', '######', '######'],
};

const ROWS = 8;
/** Extrusion depth in screen pixels. */
const DEPTH = 3;

/** Gold face gradient (top → bottom), edge highlights, extrusion and outline. */
const PALETTE = {
  face: ['#fff8d0', '#ffe478', '#f8b440', '#f07830', '#d84828'],
  highlight: '#fffff0',
  lowlight: '#a83028',
  extrude: '#7c2040',
  outline: '#1e0818',
} as const;

export interface LogoLetter {
  /** Letter with outline and extrusion. */
  full: Bitmap;
  /** Only the letter face (for shine / flash effects), aligned with `full`. */
  face: Bitmap;
  /** Offset of the bitmap inside the word. */
  x: number;
}

export interface LogoWord {
  letters: LogoLetter[];
  w: number;
  h: number;
}

function letterBitmaps(rows: readonly string[], scale: number): Omit<LogoLetter, 'x'> {
  const lw = rows[0]!.length * scale;
  const lh = ROWS * scale;
  const w = lw + 2;
  const h = lh + DEPTH + 2;
  const ink = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= lw || y >= lh) return false;
    return rows[Math.floor(y / scale)]![Math.floor(x / scale)] === '#';
  };
  const solid = (x: number, y: number): boolean => {
    for (let d = 0; d <= DEPTH; d++) if (ink(x, y - d)) return true;
    return false;
  };
  const grad = gradientBitmap(1, lh, PALETTE.face, 0.5);
  const full = createBitmap(w, h);
  const face = createBitmap(w, h);
  const hl = parseColor(PALETTE.highlight);
  const ll = parseColor(PALETTE.lowlight);
  const ex = parseColor(PALETTE.extrude);
  const ol = parseColor(PALETTE.outline);
  const white = parseColor('#ffffff');
  for (let y = -1; y < lh + DEPTH + 1; y++)
    for (let x = -1; x < lw + 1; x++) {
      const px = x + 1;
      const py = y + 1;
      if (ink(x, y)) {
        const top = !ink(x, y - 1);
        const bottom = !ink(x, y + 1);
        setPixel(full, px, py, top ? hl : bottom ? ll : getPixel(grad, 0, y));
        setPixel(face, px, py, white);
      } else if (solid(x, y)) setPixel(full, px, py, ex);
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) setPixel(full, px, py, ol);
    }
  return { full, face };
}

/** Builds a word from block letters; spaces/unknown letters leave a gap. */
function blockWord(word: string, scale: number): LogoWord {
  const letters: LogoLetter[] = [];
  let x = 0;
  for (const ch of word) {
    const rows = LETTERS[ch];
    if (!rows) {
      x += 4 * scale;
      continue;
    }
    letters.push({ ...letterBitmaps(rows, scale), x });
    x += (rows[0]!.length + 1) * scale;
  }
  return { letters, w: x - scale + 2, h: ROWS * scale + DEPTH + 2 };
}

export const titleLogo = lazy(() => blockWord('WILDLINGE', 3));
export const endLogo = lazy(() => blockWord('ENDE', 3));

/** Draws a word with its top-left at (x, y). */
export function drawWord(gfx: Gfx, word: LogoWord, x: number, y: number): void {
  for (const l of word.letters) gfx.drawBitmap(l.full, x + l.x, y);
}

/** A narrow white shine band over the letter faces at word-relative column `shineX`. */
export function drawShine(gfx: Gfx, word: LogoWord, x: number, y: number, shineX: number): void {
  gfx.clipped(x + shineX, y, 5, word.h, () => {
    for (const l of word.letters) gfx.drawBitmap(l.face, x + l.x, y, { alpha: 0.7 });
  });
}

/** 7×7 "©" sign (the font has none). */
export const copyrightSign = lazy(() =>
  bitmapFromRows(['..###..', '.#...#.', '#.###.#', '#.#...#', '#.###.#', '.#...#.', '..###..'], { '#': '#ffffff' }),
);
