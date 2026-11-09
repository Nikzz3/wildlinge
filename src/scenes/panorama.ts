/**
 * Alpine panorama at dusk ("Alpenglühen"): dithered sky, stars, layered mountain ranges lit from the
 * west, the Gipfelhorn with the pulsing Alpenglut, drifting clouds, snow and embers.
 * Static layers are pre-rendered bitmaps; everything animated is derived from the frame counter.
 */
import { type Bitmap, createBitmap, parseColor, setPixel } from '../core/bitmap';
import type { Gfx } from '../core/contracts';
import { fillDisc, gradientBitmap, hash01, lazy, sparkle, withAlpha } from './fx';

const W = 240;
const H = 160;

/** Summit of the Gipfelhorn and the center of the Alpenglut halo. */
export const SUMMIT = { x: 120, y: 96 } as const;
const GLOW_CENTER = { x: 120, y: 74 } as const;
/** Color of the dark foreground hills. */
export const FOREGROUND = '#1a1030';

interface Peak {
  x: number;
  top: number;
  /** Half width at y = top + 50, left and right. */
  wl: number;
  wr: number;
  /** Snow cap depth in pixels. */
  snow: number;
  /** Ridge lean in px per row (negative = leans left). */
  skew?: number;
}

interface RangeColors {
  lit: string;
  shade: string;
  snowLit: string;
  snowShade: string;
  crag: string;
}

function paintRange(peaks: readonly Peak[], c: RangeColors, seed: number): Bitmap {
  const b = createBitmap(W, H);
  const lit = parseColor(c.lit);
  const shade = parseColor(c.shade);
  const snowLit = parseColor(c.snowLit);
  const snowShade = parseColor(c.snowShade);
  const crag = parseColor(c.crag);
  peaks.forEach((p, i) => {
    const s = seed * 1000 + i * 97;
    for (let y = Math.max(0, p.top); y < H; y++) {
      const d = y - p.top;
      const jl = Math.round((hash01(s + Math.floor(y / 3)) - 0.5) * 2.4);
      const jr = Math.round((hash01(s + 500 + Math.floor(y / 3)) - 0.5) * 2.4);
      const left = Math.round(p.x - (p.wl * d) / 50) + jl;
      const right = Math.round(p.x + (p.wr * d) / 50) + jr;
      const ridge = p.x + Math.round((p.skew ?? 0) * d + Math.sin(y * 0.4 + i) * 1.2);
      for (let x = Math.max(0, left); x <= Math.min(W - 1, right); x++) {
        const gully = hash01(s + 9000 + Math.floor(x / 2)) < 0.22 ? 7 : 0;
        const snowLine = p.snow + gully + Math.round((hash01(s + 3000 + Math.floor(x / 2)) - 0.5) * 6);
        const isLit = x < ridge;
        const isSnow = d < snowLine;
        let col = isSnow ? (isLit ? snowLit : snowShade) : isLit ? lit : shade;
        if (!isSnow && hash01(s + x * 131 + y * 17) < 0.035) col = crag;
        setPixel(b, x, y, col);
      }
    }
  });
  return b;
}

const sky = lazy(() =>
  gradientBitmap(W, 124, [
    '#121230', '#1a1a40', '#262252', '#3a2860', '#58306c', '#80386e', '#a8486c', '#d06462', '#ec8c60', '#f8b868',
  ]),
);

const farRange = lazy(() =>
  paintRange(
    [
      { x: -4, top: 104, wl: 44, wr: 44, snow: 7 },
      { x: 34, top: 98, wl: 38, wr: 42, snow: 8 },
      { x: 72, top: 108, wl: 34, wr: 38, snow: 6 },
      { x: 168, top: 106, wl: 36, wr: 34, snow: 7 },
      { x: 204, top: 97, wl: 38, wr: 36, snow: 9 },
      { x: 244, top: 105, wl: 36, wr: 40, snow: 7 },
    ],
    { lit: '#b2647c', shade: '#8a5276', snowLit: '#f6c4b0', snowShade: '#cc98aa', crag: '#9c5a7a' },
    1,
  ),
);

const mainPeak = lazy(() =>
  paintRange(
    [{ x: SUMMIT.x, top: SUMMIT.y, wl: 52, wr: 62, snow: 20, skew: 0.16 }],
    { lit: '#9a4262', shade: '#562a5a', snowLit: '#ffd8b4', snowShade: '#b67a9a', crag: '#6c3058' },
    2,
  ),
);

const sideRange = lazy(() =>
  paintRange(
    [
      { x: 6, top: 112, wl: 50, wr: 46, snow: 7 },
      { x: 52, top: 126, wl: 40, wr: 44, snow: 5 },
      { x: 192, top: 122, wl: 44, wr: 48, snow: 6 },
      { x: 238, top: 110, wl: 44, wr: 40, snow: 7 },
    ],
    { lit: '#6a305a', shade: '#40204a', snowLit: '#e8a8a0', snowShade: '#8a5c88', crag: '#4c2450' },
    3,
  ),
);

/** Dark foreground hills with pines and a faint rim light. */
const foreground = lazy(() => {
  const b = createBitmap(W, H);
  const body = parseColor(FOREGROUND);
  const rim = parseColor('#4a2858');
  const ground = (x: number) => Math.round(142 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1));
  const top = new Array<number>(W).fill(H);
  for (let x = 0; x < W; x++) top[x] = ground(x);
  for (let x = 4; x < W; x += 7 + Math.floor(hash01(x) * 8)) {
    const height = 7 + Math.floor(hash01(x + 77) * 9);
    const baseY = ground(x) + 2;
    for (let dy = 0; dy < height; dy++) {
      const hw = Math.floor((dy % 4) / 1.5 + dy / 3.2);
      for (let dx = -hw; dx <= hw; dx++) {
        const px = x + dx;
        if (px >= 0 && px < W) top[px] = Math.min(top[px]!, baseY - height + dy);
      }
    }
  }
  for (let x = 0; x < W; x++) for (let y = top[x]!; y < H; y++) setPixel(b, x, y, y === top[x] ? rim : body);
  return b;
});

/** Soft cloud bank lit from below by the sunset: puffy top, flat bottom. */
function cloudBitmap(w: number, h: number, seed: number): Bitmap {
  const b = createBitmap(w, h);
  const body = parseColor('#a8608a');
  const lit = parseColor('#f4a890');
  const dark = parseColor('#86527e');
  const floor = h - 3;
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const taper = Math.sin((Math.PI * (i + 0.5)) / 5);
    return { cx: (w * (i + 0.5)) / 5 + (hash01(seed + i) - 0.5) * 4, r: (h - 3) * (0.35 + 0.65 * taper) * (0.75 + hash01(seed + 20 + i) * 0.25) };
  });
  const inside = (x: number, y: number) => y <= floor && blobs.some((o) => ((x - o.cx) / (o.r * 1.3)) ** 2 + ((y - floor) / o.r) ** 2 <= 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const color = y >= floor - 1 || !inside(x, y + 3) ? lit : !inside(x, y - 2) || !inside(x - 2, y) ? dark : body;
      setPixel(b, x, y, color);
    }
  return b;
}

const clouds = lazy(() => [cloudBitmap(52, 16, 1), cloudBitmap(38, 13, 2), cloudBitmap(64, 18, 3)]);

export interface PanoramaOpts {
  /** Brightness of the Alpenglut (1 = title, >1 = ending). */
  glow?: number;
}

/** Sky, stars, glow, far range, clouds, the Gipfelhorn with embers and the side ranges. Draw a creature on the summit afterwards. */
export function drawPanoramaBack(gfx: Gfx, frame: number, opts: PanoramaOpts = {}): void {
  const glow = opts.glow ?? 1;
  gfx.drawBitmap(sky(), 0, 0);
  for (let i = 0; i < 34; i++) {
    const x = Math.floor(hash01(i * 3 + 1) * W);
    const y = Math.floor(hash01(i * 3 + 2) ** 1.6 * 62);
    const tw = Math.sin(frame / 18 + i * 1.7);
    const color = tw > 0.6 ? '#fff8e8' : tw > -0.3 ? '#b8b0d0' : '#6c6490';
    if (i % 9 === 0 && tw > 0.6) sparkle(gfx, x, y, 1, '#a8a0c8', '#fff8e8');
    else gfx.fillRect(x, y, 1, 1, color);
  }
  drawGlow(gfx, frame, glow);
  gfx.drawBitmap(farRange(), 0, 0);
  clouds().forEach((c, i) => {
    const speed = 0.06 + i * 0.03;
    const span = W + c.w;
    const x = ((i * 97 + frame * speed) % span) - c.w;
    gfx.drawBitmap(c, Math.round(x), 64 + i * 9);
  });
  gfx.drawBitmap(mainPeak(), 0, 0);
  // the summit itself catches the glow
  const pulse = 0.5 + 0.5 * Math.sin(frame / 22);
  gfx.fillRect(SUMMIT.x - 1, SUMMIT.y, 3, 1, withAlpha('#fff4c0', 0.6 + 0.4 * pulse));
  drawEmbers(gfx, frame, Math.round(18 * glow));
  gfx.drawBitmap(sideRange(), 0, 0);
}

/** Foreground hills and drifting snow. */
export function drawPanoramaFront(gfx: Gfx, frame: number): void {
  gfx.drawBitmap(foreground(), 0, 0);
  drawSnow(gfx, frame);
}

/** Pulsing halo of the Alpenglut around GLOW_CENTER. */
function drawGlow(gfx: Gfx, frame: number, strength = 1): void {
  const pulse = Math.sin(frame / 22);
  const r = (24 + pulse * 2.5) * Math.min(1.25, strength);
  const a = Math.min(1, 0.85 + 0.15 * pulse) * Math.min(1.3, strength);
  const { x, y } = GLOW_CENTER;
  fillDisc(gfx, x, y, r * 2.1, withAlpha('#f06040', 0.1 * a));
  fillDisc(gfx, x, y, r * 1.6, withAlpha('#f87848', 0.16 * a));
  fillDisc(gfx, x, y, r * 1.15, withAlpha('#ffa058', 0.24 * a));
  fillDisc(gfx, x, y, r * 0.75, withAlpha('#ffd088', 0.32 * a));
  fillDisc(gfx, x, y, r * 0.4, withAlpha('#fff4d0', 0.4 * a));
}

function drawEmbers(gfx: Gfx, frame: number, count: number): void {
  const life = 120;
  for (let i = 0; i < count; i++) {
    const age = (frame + Math.floor(hash01(i + 400) * life)) % life;
    const t = age / life;
    const x = SUMMIT.x + (hash01(i + 500) - 0.5) * 34 + Math.sin(age / 11 + i) * 4;
    const y = SUMMIT.y + 4 - age * (0.45 + hash01(i + 600) * 0.3);
    const color = t < 0.3 ? '#fff0a0' : t < 0.65 ? '#ffa040' : '#d05030';
    gfx.fillRect(Math.round(x), Math.round(y), 1, 1, withAlpha(color, 1 - t * 0.8));
  }
}

function drawSnow(gfx: Gfx, frame: number): void {
  for (let i = 0; i < 36; i++) {
    const speed = 0.18 + hash01(i + 700) * 0.22;
    const y = ((hash01(i + 800) * (H + 10) + frame * speed) % (H + 10)) - 5;
    const x = ((hash01(i + 900) * (W + 20) + frame * speed * 0.6 + Math.sin(frame / 40 + i) * 5) % (W + 20)) - 10;
    const near = i % 5 === 0;
    gfx.fillRect(Math.round(x), Math.round(y), near ? 2 : 1, near ? 2 : 1, withAlpha('#f8f0ff', near ? 0.9 : 0.6));
  }
}

/** The distant mountain range alone (e.g. as a pale silhouette on other backdrops). */
export function farRangeBitmap(): Bitmap {
  return farRange();
}

const FLAME_LAYERS = [
  { color: '#e04818', width: 1, height: 1 },
  { color: '#ff9830', width: 0.66, height: 0.8 },
  { color: '#fff0b0', width: 0.32, height: 0.55 },
] as const;

/** Flickering pixel flame (the Alpenglut itself) standing on (x, baseY). */
export function drawFlame(gfx: Gfx, x: number, baseY: number, size: number, frame: number): void {
  const maxW = 9 * size;
  const height = 28 * size;
  for (const layer of FLAME_LAYERS) {
    const h = Math.round(height * layer.height * (0.92 + 0.08 * Math.sin(frame / 5)));
    for (let r = 0; r < h; r++) {
      const q = r / h;
      const swell = q < 0.25 ? 0.65 + 1.4 * q : 1;
      const flicker = 0.85 + 0.15 * Math.sin(frame / 4 + r * 0.5);
      const hw = Math.round(maxW * layer.width * (1 - q) ** 0.85 * swell * flicker);
      const sway = Math.round(Math.sin(frame / 7 + r * 0.3) * q * 3 * size);
      gfx.fillRect(Math.round(x) + sway - hw, Math.round(baseY) - r, hw * 2 + 1, 1, layer.color);
    }
  }
}
