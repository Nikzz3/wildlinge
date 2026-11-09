import { type Bitmap, blit, createBitmap, parseColor, setPixel } from '../../src/core/bitmap';

/** Lays bitmaps out in a grid with padding on a background color. */
export function sheet(items: readonly Bitmap[], cols: number, pad = 2, bg = '#506070'): Bitmap {
  const cw = Math.max(1, ...items.map((b) => b.w));
  const ch = Math.max(1, ...items.map((b) => b.h));
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const out = createBitmap(cols * (cw + pad) + pad, rows * (ch + pad) + pad);
  const c = parseColor(bg);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) setPixel(out, x, y, c);
  items.forEach((b, i) => blit(out, b, pad + (i % cols) * (cw + pad), pad + Math.floor(i / cols) * (ch + pad)));
  return out;
}
