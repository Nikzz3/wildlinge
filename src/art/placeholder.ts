import { type Bitmap, createBitmap, parseColor, setPixel } from '../core/bitmap';

/** Solid box with a 1px dark border — stand-in until real art exists. */
export function placeholder(w: number, h: number, color = '#ff00ff'): Bitmap {
  const b = createBitmap(w, h);
  const fill = parseColor(color);
  const edge = parseColor('#202020');
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) setPixel(b, x, y, x === 0 || y === 0 || x === w - 1 || y === h - 1 ? edge : fill);
  return b;
}
