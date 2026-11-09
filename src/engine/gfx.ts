import type { Bitmap } from '../core/bitmap';
import { parseColor } from '../core/bitmap';
import type { DrawOpts, Gfx, TextOpts } from '../core/contracts';
import { GLYPH_OFFSET_Y, LINE_HEIGHT, charAdvance, glyphFor, measureText, wrapText } from './text';

export const SCREEN_W = 240;
export const SCREEN_H = 160;

export const COLORS = {
  text: '#383838',
  textShadow: '#d0d0c8',
  textLight: '#f8f8f8',
  textLightShadow: '#203038',
  windowFill: '#f8f8f0',
  windowFrame: '#285860',
  windowInner: '#88c0b8',
  darkFill: '#283840',
  darkFrame: '#101820',
  darkInner: '#5888a0',
  barTrack: '#405048',
} as const;

type Surface = HTMLCanvasElement;

function makeSurface(w: number, h: number): Surface {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const surfaceCache = new WeakMap<Bitmap, Surface>();
const tintCache = new WeakMap<Bitmap, Map<string, Surface>>();

function toSurface(b: Bitmap, tint?: string): Surface {
  if (!tint) {
    let s = surfaceCache.get(b);
    if (!s) {
      s = makeSurface(b.w, b.h);
      const ctx = s.getContext('2d')!;
      const img = ctx.createImageData(b.w, b.h);
      img.data.set(b.data);
      ctx.putImageData(img, 0, 0);
      surfaceCache.set(b, s);
    }
    return s;
  }
  let byColor = tintCache.get(b);
  if (!byColor) tintCache.set(b, (byColor = new Map()));
  let s = byColor.get(tint);
  if (!s) {
    s = makeSurface(b.w, b.h);
    const ctx = s.getContext('2d')!;
    const img = ctx.createImageData(b.w, b.h);
    const [r, g, bl] = parseColor(tint);
    for (let i = 0; i < b.data.length; i += 4) {
      if (b.data[i + 3]! === 0) continue;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = bl;
      img.data[i + 3] = b.data[i + 3]!;
    }
    ctx.putImageData(img, 0, 0);
    byColor.set(tint, s);
  }
  return s;
}

/** Glyph surfaces per (char, color). */
const glyphCache = new Map<string, Surface | null>();

function glyphSurface(ch: string, color: string): Surface | null {
  const key = ch + '\u0000' + color;
  if (glyphCache.has(key)) return glyphCache.get(key)!;
  const g = glyphFor(ch);
  let s: Surface | null = null;
  if (g && g.w > 0) {
    s = makeSurface(g.w, g.rows.length);
    const ctx = s.getContext('2d')!;
    ctx.fillStyle = color;
    g.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(x, y, 1, 1);
    });
  }
  glyphCache.set(key, s);
  return s;
}

export class CanvasGfx implements Gfx {
  readonly width = SCREEN_W;
  readonly height = SCREEN_H;
  readonly lineHeight = LINE_HEIGHT;

  constructor(private readonly ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }

  clear(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  strokeRect(x: number, y: number, w: number, h: number, color: string): void {
    this.fillRect(x, y, w, 1, color);
    this.fillRect(x, y + h - 1, w, 1, color);
    this.fillRect(x, y, 1, h, color);
    this.fillRect(x + w - 1, y, 1, h, color);
  }

  drawBitmap(b: Bitmap, x: number, y: number, opts: DrawOpts = {}): void {
    const surface = toSurface(b, opts.tint);
    const src = opts.src ?? { x: 0, y: 0, w: b.w, h: b.h };
    const scale = opts.scale ?? 1;
    const dw = Math.round(src.w * scale);
    const dh = Math.round(src.h * scale);
    const ctx = this.ctx;
    const alpha = opts.alpha ?? 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (opts.flipX) {
      ctx.translate(rx + dw, ry);
      ctx.scale(-1, 1);
      ctx.drawImage(surface, src.x, src.y, src.w, src.h, 0, 0, dw, dh);
    } else {
      ctx.drawImage(surface, src.x, src.y, src.w, src.h, rx, ry, dw, dh);
    }
    ctx.restore();
  }

  drawText(text: string, x: number, y: number, opts: TextOpts = {}): void {
    const color = opts.color ?? COLORS.text;
    const shadow = opts.shadow === undefined ? COLORS.textShadow : opts.shadow;
    let cx = Math.round(x);
    if (opts.align === 'center') cx -= Math.floor(measureText(text) / 2);
    else if (opts.align === 'right') cx -= measureText(text);
    const cy = Math.round(y) + GLYPH_OFFSET_Y;
    for (const ch of text) {
      if (ch !== ' ') {
        if (shadow) {
          const s = glyphSurface(ch, shadow);
          if (s) this.ctx.drawImage(s, cx + 1, cy + 1);
        }
        const g = glyphSurface(ch, color);
        if (g) this.ctx.drawImage(g, cx, cy);
      }
      cx += charAdvance(ch);
    }
  }

  measureText(text: string): number {
    return measureText(text);
  }

  wrapText(text: string, maxWidth: number): string[] {
    return wrapText(text, maxWidth);
  }

  drawWindow(x: number, y: number, w: number, h: number, style: 'light' | 'dark' = 'light'): void {
    const [frame, inner, fill] =
      style === 'light'
        ? [COLORS.windowFrame, COLORS.windowInner, COLORS.windowFill]
        : [COLORS.darkFrame, COLORS.darkInner, COLORS.darkFill];
    // rounded outer frame (corners cut by 1px)
    this.fillRect(x + 1, y, w - 2, h, frame);
    this.fillRect(x, y + 1, w, h - 2, frame);
    // inner light line
    this.fillRect(x + 2, y + 2, w - 4, h - 4, inner);
    // fill
    this.fillRect(x + 3, y + 3, w - 6, h - 6, fill);
  }

  drawBar(x: number, y: number, w: number, h: number, frac: number, color: string, track: string = COLORS.barTrack): void {
    this.fillRect(x, y, w, h, track);
    const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (fw > 0) this.fillRect(x, y, fw, h, color);
  }

  hpColor(frac: number): string {
    if (frac > 0.5) return '#48c850';
    if (frac > 0.2) return '#f0b820';
    return '#e83828';
  }

  overlay(color: string, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
  }

  translated(dx: number, dy: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.translate(Math.round(dx), Math.round(dy));
    try {
      fn();
    } finally {
      this.ctx.restore();
    }
  }

  clipped(x: number, y: number, w: number, h: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
    try {
      fn();
    } finally {
      this.ctx.restore();
    }
  }
}
