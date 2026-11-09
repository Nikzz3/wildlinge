/** Small drawing / timing helpers shared by the meta scenes (title, intro, evolution, credits). */
import { type Bitmap, createBitmap, parseColor, setPixel } from '../core/bitmap';
import type { GameContext, Gfx } from '../core/contracts';

/** Deterministic 0..1 value for an integer (visual patterns only — not game randomness). */
export function hash01(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Smoothstep easing. */
export const ease = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
export const easeOut = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

/** '#rrggbb' + alpha 0..1 → '#rrggbbaa' (canvas fill style). */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.round(clamp01(alpha) * 255);
  return `${color.slice(0, 7)}${a.toString(16).padStart(2, '0')}`;
}

/** Filled ellipse via scanlines (pixel-crisp). */
export function fillEllipse(gfx: Gfx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  if (rx <= 0 || ry <= 0) return;
  const r = Math.ceil(ry);
  for (let dy = -r; dy <= r; dy++) {
    const k = 1 - (dy * dy) / (ry * ry);
    if (k < 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    gfx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1, color);
  }
}

export function fillDisc(gfx: Gfx, cx: number, cy: number, r: number, color: string): void {
  fillEllipse(gfx, cx, cy, r, r, color);
}

/** Four-point sparkle: size 0 = single pixel, 1 = plus, 2+ = long star. */
export function sparkle(gfx: Gfx, x: number, y: number, size: number, color: string, core = '#ffffff'): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (size >= 1) {
    gfx.fillRect(px - size, py, size * 2 + 1, 1, color);
    gfx.fillRect(px, py - size, 1, size * 2 + 1, color);
  }
  gfx.fillRect(px, py, 1, 1, core);
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Ordered-dither threshold 0..1 for a pixel. */
function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
}

/**
 * Vertical gradient through `stops` as a bitmap: solid bands with a dithered seam
 * (classic handheld look). `soft` = share of each band that dithers into the next.
 */
export function gradientBitmap(w: number, h: number, stops: readonly string[], soft = 0.45): Bitmap {
  const b = createBitmap(w, h);
  const colors = stops.map(parseColor);
  const bands = Math.max(1, colors.length - 1);
  for (let y = 0; y < h; y++) {
    const f = (y / Math.max(1, h - 1)) * bands;
    const i = Math.min(bands - 1, Math.floor(f));
    const d = (f - i - (1 - soft)) / soft;
    for (let x = 0; x < w; x++) setPixel(b, x, y, colors[d > bayer(x, y) ? i + 1 : i]!);
  }
  return b;
}

/** Lazily built, cached value (bitmaps are built on first use, not at import time). */
export function lazy<T>(make: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= make());
}

/** Runs fn(progress 0..1] once per frame for `frames` frames. */
export async function tween(g: GameContext, frames: number, fn: (t: number) => void): Promise<void> {
  const n = Math.max(1, Math.round(frames));
  for (let i = 1; i <= n; i++) {
    fn(i / n);
    await g.wait(1);
  }
}

/** Draws a bitmap centered on (cx, cy) at a (possibly fractional) scale. */
export function drawCentered(
  gfx: Gfx,
  b: Bitmap,
  cx: number,
  cy: number,
  opts: { scale?: number; alpha?: number; tint?: string } = {},
): void {
  const s = opts.scale ?? 1;
  gfx.drawBitmap(b, Math.round(cx - (b.w * s) / 2), Math.round(cy - (b.h * s) / 2), opts);
}

/** Draws a bitmap with its bottom center at (cx, bottom). */
export function drawBottom(
  gfx: Gfx,
  b: Bitmap,
  cx: number,
  bottom: number,
  opts: { scale?: number; alpha?: number; tint?: string; flipX?: boolean } = {},
): void {
  const s = opts.scale ?? 1;
  gfx.drawBitmap(b, Math.round(cx - (b.w * s) / 2), Math.round(bottom - b.h * s), opts);
}
