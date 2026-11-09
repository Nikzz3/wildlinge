import { type Bitmap, createBitmap, parseColor, setPixel } from '../../src/core/bitmap';
import { FONT } from '../../src/art/font';

/** Renders text with FONT into a bitmap (Node-side, for sheets). */
export function renderText(text: string, color = '#383838', bg = '#f8f8f0'): Bitmap {
  const lines = text.split('\n');
  const width = (line: string) =>
    [...line].reduce((w, ch) => w + (ch === ' ' ? FONT.spaceWidth : (FONT.glyphs[ch]?.w ?? 5)) + FONT.spacing, 0);
  const w = Math.max(...lines.map(width)) + 4;
  const h = lines.length * 16 + 4;
  const out = createBitmap(w, h);
  const bgc = parseColor(bg);
  const fg = parseColor(color);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) setPixel(out, x, y, bgc);
  lines.forEach((line, li) => {
    let x = 2;
    for (const ch of line) {
      if (ch === ' ') {
        x += FONT.spaceWidth + FONT.spacing;
        continue;
      }
      const g = FONT.glyphs[ch];
      if (!g) {
        x += 5 + FONT.spacing;
        continue;
      }
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') setPixel(out, x + rx, 2 + li * 16 + 2 + ry, fg);
      });
      x += g.w + FONT.spacing;
    }
  });
  return out;
}
