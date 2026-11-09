/** Procedural battle backdrops (sky / scenery / ground bands) and ground platforms per BattleBg. */
import { type Bitmap, createBitmap, parseColor, setPixel } from '../../core/bitmap';
import type { Side } from '../../core/contracts';
import { createRng, type Rng } from '../../core/rng';
import type { BattleBg } from '../../core/types';
import { FIELD_H, PLATFORM } from './layout';

const W = 240;

class Painter {
  readonly bitmap: Bitmap;
  constructor(w: number, h: number) {
    this.bitmap = createBitmap(w, h);
  }

  px(x: number, y: number, color: string): void {
    setPixel(this.bitmap, Math.round(x), Math.round(y), parseColor(color));
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    for (let yy = Math.max(0, y); yy < Math.min(this.bitmap.h, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(this.bitmap.w, x + w); xx++) this.px(xx, yy, color);
  }

  /** Horizontal bands: [color, height] from top to bottom starting at y. */
  bands(y: number, list: readonly (readonly [string, number])[]): number {
    for (const [color, h] of list) {
      this.rect(0, y, W, h, color);
      y += h;
    }
    return y;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      this.rect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1, color);
    }
  }

  /** Mountain range silhouette: fills from a ridge line (heights by x) down to `base`. */
  ridge(base: number, height: (x: number) => number, color: string, cap?: { color: string; depth: number }): void {
    for (let x = 0; x < W; x++) {
      const top = Math.round(base - height(x));
      this.rect(x, top, 1, base - top, color);
      if (cap) this.rect(x, top, 1, Math.min(cap.depth, base - top), cap.color);
    }
  }

  /** Scattered texture pixels in a region. */
  speckle(rng: Rng, x: number, y: number, w: number, h: number, count: number, colors: readonly string[]): void {
    for (let i = 0; i < count; i++) this.px(x + rng.int(0, w - 1), y + rng.int(0, h - 1), rng.pick(colors));
  }

  /** Small grass tuft ("v" of 3 pixels). */
  tuft(x: number, y: number, color: string): void {
    this.px(x, y, color);
    this.px(x - 1, y - 1, color);
    this.px(x + 1, y - 1, color);
    this.px(x, y - 2, color);
  }
}

/** Peaks as a sum of triangles. */
function peaks(list: readonly (readonly [number, number, number])[]): (x: number) => number {
  return (x) => Math.max(0, ...list.map(([cx, h, slope]) => h - Math.abs(x - cx) * slope));
}

function cloud(p: Painter, x: number, y: number, w: number): void {
  p.ellipse(x, y + 2, w, 3, '#e8f4fc');
  p.ellipse(x - w / 3, y, w / 2, 3, '#ffffff');
  p.ellipse(x + w / 4, y - 1, w / 2, 4, '#ffffff');
}

function paintGrass(p: Painter, rng: Rng): void {
  p.bands(0, [['#80c0f0', 12], ['#98ccf2', 10], ['#b0d8f6', 10], ['#c8e4f8', 10], ['#dceef8', 8]]);
  cloud(p, 40, 12, 18);
  cloud(p, 132, 20, 14);
  cloud(p, 210, 8, 12);
  p.ridge(50, peaks([[30, 26, 0.9], [92, 34, 0.8], [150, 22, 0.9], [205, 30, 0.7]]), '#90a8cc', { color: '#f0f4fc', depth: 5 });
  p.ridge(56, (x) => 8 + Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5, '#6cac5c');
  p.bands(54, [['#98d070', 14], ['#8cc864', 18], ['#80bc58', 26]]);
  for (let i = 0; i < 70; i++) p.tuft(rng.int(2, W - 3), rng.int(60, FIELD_H - 1), rng.pick(['#68a848', '#70b050', '#b0e088']));
}

function paintForest(p: Painter, rng: Rng): void {
  p.bands(0, [['#20402c', 16], ['#284c30', 14], ['#305834', 14], ['#3c6838', 12]]);
  // canopy leaf clusters
  for (let i = 0; i < 60; i++) p.ellipse(rng.int(0, W), rng.int(0, 30), rng.int(4, 10), rng.int(2, 5), rng.pick(['#2c5434', '#386440', '#24482c']));
  // trunks
  for (let x = 6; x < W; x += rng.int(22, 34)) {
    const w = rng.int(5, 9);
    p.rect(x, 18, w, 40, '#4a3424');
    p.rect(x, 18, 1, 40, '#64482c');
    p.rect(x + w - 1, 18, 1, 40, '#382818');
  }
  for (let i = 0; i < 20; i++) p.ellipse(rng.int(0, W), rng.int(10, 26), rng.int(6, 12), rng.int(3, 5), rng.pick(['#3c7040', '#447844']));
  p.bands(56, [['#5c8c3c', 12], ['#588838', 20], ['#4c7c30', 24]]);
  for (let i = 0; i < 60; i++) p.tuft(rng.int(2, W - 3), rng.int(60, FIELD_H - 1), rng.pick(['#3c6828', '#78a850']));
  p.speckle(rng, 0, 58, W, 54, 80, ['#6c9c48', '#446c2c']);
}

function paintCave(p: Painter, rng: Rng): void {
  p.bands(0, [['#241e2c', 14], ['#2c2636', 14], ['#342c40', 14], ['#3c3448', 14]]);
  for (let i = 0; i < 40; i++) p.ellipse(rng.int(0, W), rng.int(4, 54), rng.int(4, 12), rng.int(2, 5), rng.pick(['#302838', '#40384c', '#2a2432']));
  // stalactites
  for (let x = 4; x < W; x += rng.int(14, 26)) {
    const h = rng.int(8, 22);
    const w = rng.int(3, 6);
    for (let y = 0; y < h; y++) p.rect(x - Math.round(w * (1 - y / h)), y, Math.max(1, Math.round(2 * w * (1 - y / h))), 1, '#4a4258');
  }
  p.bands(56, [['#4c4454', 10], ['#544c5c', 20], ['#5c5464', 26]]);
  p.speckle(rng, 0, 58, W, 54, 140, ['#6c6474', '#403848', '#787080']);
  for (let i = 0; i < 6; i++) p.px(rng.int(0, W), rng.int(4, 50), '#a8e0f0'); // glimmer
}

function paintWater(p: Painter, rng: Rng): void {
  p.bands(0, [['#80c0f0', 12], ['#98ccf2', 10], ['#b0d8f6', 10], ['#c8e4f8', 8]]);
  cloud(p, 60, 10, 16);
  cloud(p, 180, 16, 14);
  p.ridge(40, peaks([[50, 22, 0.7], [140, 28, 0.8], [220, 20, 0.6]]), '#98b0d0', { color: '#f0f4fc', depth: 4 });
  // far shore with conifers
  p.rect(0, 38, W, 6, '#3c6c50');
  for (let x = 0; x < W; x += rng.int(4, 8)) {
    const h = rng.int(4, 9);
    for (let y = 0; y < h; y++) p.rect(x - Math.floor(y / 3), 38 - h + y, 1 + Math.floor(y / 3) * 2, 1, '#2c5840');
  }
  p.bands(44, [['#3c88cc', 6], ['#4494d4', 12], ['#4ca0dc', 22], ['#58ace4', 34]]);
  for (let i = 0; i < 70; i++) {
    const y = rng.int(46, FIELD_H - 2);
    const w = 2 + Math.round((y - 44) / 10);
    p.rect(rng.int(0, W - w), y, w, 1, rng.pick(['#a8d8f8', '#80c0f0']));
  }
}

function paintIndoor(p: Painter, rng: Rng): void {
  p.rect(0, 0, W, 58, '#e8d8b8');
  for (let x = 0; x < W; x += 12) p.rect(x, 0, 4, 58, '#e0ceac');
  p.rect(0, 54, W, 3, '#c8a878');
  p.rect(0, 57, W, 10, '#a87850');
  p.rect(0, 57, W, 1, '#c89060');
  p.rect(0, 66, W, 1, '#784c30');
  for (let y = 67; y < FIELD_H; y += 8) {
    p.rect(0, y, W, 8, y % 16 === 3 ? '#c89868' : '#c0905e');
    p.rect(0, y + 7, W, 1, '#a07448');
    for (let x = rng.int(0, 30); x < W; x += rng.int(30, 60)) p.rect(x, y, 1, 7, '#a07448');
  }
  // window
  p.rect(150, 10, 44, 30, '#785030');
  p.rect(152, 12, 40, 26, '#a8d8f8');
  p.rect(171, 12, 2, 26, '#785030');
  p.rect(152, 24, 40, 2, '#785030');
}

function paintHall(p: Painter, rng: Rng): void {
  p.bands(0, [['#3c4858', 20], ['#445064', 20], ['#4c5a70', 18]]);
  for (let x = 10; x < W; x += 46) {
    p.rect(x, 0, 16, 58, '#7888a0');
    p.rect(x, 0, 3, 58, '#98a8bc');
    p.rect(x + 13, 0, 3, 58, '#5c6880');
    p.rect(x - 2, 50, 20, 8, '#8898b0');
  }
  for (let y = 58; y < FIELD_H; y += 9)
    for (let x = 0; x < W; x += 16) p.rect(x + ((y - 58) / 9 % 2 === 0 ? 0 : 8), y, 8, 9, '#98a0b0');
  p.rect(0, 58, W, 1, '#606878');
  p.speckle(rng, 0, 59, W, 53, 40, ['#c0c8d0']);
}

function paintSnow(p: Painter, rng: Rng): void {
  p.bands(0, [['#a8c0e4', 12], ['#b8cce8', 12], ['#c8d8f0', 12], ['#d8e4f4', 12]]);
  p.ridge(52, peaks([[20, 30, 0.8], [80, 40, 0.7], [160, 34, 0.9], [225, 38, 0.8]]), '#c8d8ec', { color: '#ffffff', depth: 12 });
  p.ridge(58, (x) => 6 + Math.sin(x / 19) * 3, '#e8f0f8');
  p.bands(56, [['#f0f6fc', 16], ['#e8f0f8', 18], ['#e0eaf6', 22]]);
  p.speckle(rng, 0, 58, W, 54, 90, ['#c8d8ec', '#ffffff']);
  p.speckle(rng, 0, 0, W, 54, 50, ['#ffffff']);
}

function paintSummit(p: Painter, rng: Rng): void {
  p.bands(0, [['#382c58', 10], ['#583868', 8], ['#7c4470', 8], ['#a85470', 8], ['#d06c68', 8], ['#ec9068', 6], ['#f8b870', 6]]);
  p.speckle(rng, 0, 0, W, 16, 18, ['#f8f0d0']);
  p.ridge(54, peaks([[40, 30, 1.1], [120, 44, 0.9], [200, 32, 1.0]]), '#4c3850', { color: '#f09888', depth: 2 });
  p.ridge(58, peaks([[0, 12, 0.3], [90, 10, 0.25], [170, 14, 0.3], [240, 10, 0.3]]), '#3c2c44');
  p.bands(56, [['#8c7468', 14], ['#806a5e', 18], ['#745e54', 24]]);
  p.speckle(rng, 0, 58, W, 54, 120, ['#9c8478', '#64504a', '#f0f0f8']);
}

const PAINT: Record<BattleBg, (p: Painter, rng: Rng) => void> = {
  grass: paintGrass, forest: paintForest, cave: paintCave, water: paintWater,
  indoor: paintIndoor, hall: paintHall, snow: paintSnow, summit: paintSummit,
};

/** [top, mid, rim] platform colors. */
const PLATFORM_COLORS: Record<BattleBg, readonly [string, string, string]> = {
  grass: ['#b0e088', '#90c868', '#5c9840'],
  forest: ['#88b058', '#6c9840', '#3c6828'],
  cave: ['#8c8494', '#706878', '#484050'],
  water: ['#a8d8f8', '#78b8e8', '#3878b8'],
  indoor: ['#d87060', '#b85048', '#803030'],
  hall: ['#e0e4ec', '#c0c8d4', '#687080'],
  snow: ['#ffffff', '#e0ecf8', '#98b0c8'],
  summit: ['#b8a098', '#988078', '#5c4844'],
};

/** Any pixel left transparent takes the color of the pixel above (so scenery layers never leave gaps). */
function fillHoles(b: Bitmap): void {
  for (let y = 1; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4;
      if (b.data[i + 3] !== 0) continue;
      b.data.copyWithin(i, i - b.w * 4, i - b.w * 4 + 4);
    }
}

const backdrops = new Map<BattleBg, Bitmap>();
const platforms = new Map<string, Bitmap>();

/** 240×112 field background. Deterministic per bg. */
export function backdrop(bg: BattleBg): Bitmap {
  let b = backdrops.get(bg);
  if (!b) {
    const p = new Painter(W, FIELD_H);
    PAINT[bg](p, createRng(bg.length * 7919 + bg.charCodeAt(0)));
    fillHoles(p.bitmap);
    b = p.bitmap;
    backdrops.set(bg, b);
  }
  return b;
}

/** Elliptic ground platform; drawn centered on PLATFORM[side]. */
export function platform(bg: BattleBg, side: Side): Bitmap {
  const key = `${bg}:${side}`;
  let b = platforms.get(key);
  if (!b) {
    const { rx, ry } = PLATFORM[side];
    const [top, mid, rim] = PLATFORM_COLORS[bg];
    const p = new Painter(rx * 2 + 1, ry * 2 + 3);
    const rng = createRng(rx * 31 + bg.length);
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d > 1) continue;
        let color = d > 0.82 ? rim : y < -ry * 0.15 ? top : mid;
        if (d < 0.6 && rng.chance(0.05)) color = rng.pick([rim, top]);
        p.px(x + rx, y + ry, color);
      }
    // thicker rim at the bottom edge for depth
    for (let x = -rx; x <= rx; x++) {
      const y = Math.round(ry * Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx))));
      p.px(x + rx, y + ry + 1, rim);
      if (Math.abs(x) < rx * 0.8) p.px(x + rx, y + ry + 2, rim);
    }
    b = p.bitmap;
    platforms.set(key, b);
  }
  return b;
}

/** Top-left position for drawing platform(bg, side). */
export function platformPos(side: Side): { x: number; y: number } {
  const p = PLATFORM[side];
  return { x: p.cx - p.rx, y: p.cy - p.ry };
}
