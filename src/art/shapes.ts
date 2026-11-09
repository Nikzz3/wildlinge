/**
 * Creature shape DSL: a creature is a list of parts (ellipses, rounded rects, polygons, thick
 * curves, small pixel patches) in a 48×48 coordinate space. `renderCreature` rasterizes them
 * to pixel art at any size without anti-aliasing, then
 *   1. shades every part in 3 tones (light from the top-left, normals estimated from the
 *      part's own silhouette, so circles become spheres and long shapes cylinders),
 *   2. draws contour lines where a part overlaps earlier parts,
 *   3. adds a 1px outer outline in a darkened hue of the adjacent fill.
 * Front = authored layout (faces left), back = mirrored, face parts removed, back-only parts
 * added, bigger and sunk to the bottom edge; icon = whole creature fitted into 24×24.
 * See docs/CREATURE-ART.md for the authoring guide.
 */
import { type Bitmap, createBitmap, parseColor, type Rgba, setPixel } from '../core/bitmap';

export type CreatureView = 'front' | 'back' | 'icon';
export type Pt = readonly [number, number];

// ---------------------------------------------------------------------------
// Shapes (48×48 space; x right, y down)
// ---------------------------------------------------------------------------

export type Shape =
  | { readonly k: 'ellipse'; readonly c: Pt; readonly rx: number; readonly ry: number; readonly rot: number }
  | { readonly k: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly r: number }
  | { readonly k: 'poly'; readonly pts: readonly Pt[] }
  /** Thick polyline; `w` = widths spread evenly along its length (linear in between). */
  | { readonly k: 'stroke'; readonly pts: readonly Pt[]; readonly w: readonly number[] };

/** Ellipse centered at (cx, cy), rotated by `rot` degrees (clockwise). */
export const ell = (cx: number, cy: number, rx: number, ry = rx, rot = 0): Shape => ({ k: 'ellipse', c: [cx, cy], rx, ry, rot });
export const circ = (cx: number, cy: number, r: number): Shape => ell(cx, cy, r, r);
/** Rectangle with top-left (x, y), optional corner radius. */
export const rect = (x: number, y: number, w: number, h: number, r = 0): Shape => ({ k: 'rect', x, y, w, h, r });
export const poly = (...pts: Pt[]): Shape => ({ k: 'poly', pts });
/** Width of a stroke: constant, or a profile spread evenly along it ([start, end] = taper, [a, b, c] = bulge…). */
export type Width = number | readonly number[];
/** Straight thick polyline. */
export const line = (w: Width, ...pts: Pt[]): Shape => ({ k: 'stroke', pts, w: typeof w === 'number' ? [w] : w });
/** Smooth thick curve through all points (Catmull-Rom). */
export const curve = (w: Width, ...pts: Pt[]): Shape => ({ k: 'stroke', pts: smooth(pts), w: typeof w === 'number' ? [w] : w });

/** Circles spaced `step` apart along a smooth path, radius `r` (constant or profile): fluffy edges (moss, clouds, fur). */
export function beads(r: Width, step: number, ...pts: Pt[]): Shape[] {
  const path = smooth(pts);
  const radii = typeof r === 'number' ? [r] : r;
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1]! + Math.hypot(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]));
  const total = lens[lens.length - 1]!;
  const n = Math.max(1, Math.round(total / step));
  const out: Shape[] = [];
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    let i = 1;
    while (i < path.length - 1 && lens[i]! < d) i++;
    const [a, b] = [path[i - 1]!, path[i]!];
    const seg = lens[i]! - lens[i - 1]!;
    const t = seg === 0 ? 0 : (d - lens[i - 1]!) / seg;
    out.push(circ(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, widthAt(radii, total === 0 ? 0 : d / total)));
  }
  return out;
}

function smooth(pts: readonly Pt[]): Pt[] {
  if (pts.length < 3) return [...pts];
  const out: Pt[] = [];
  const p = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    for (let j = 0; j < 8; j++) {
      const t = j / 8;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

// ---------------------------------------------------------------------------
// Parts & creature definitions
// ---------------------------------------------------------------------------

interface PartFlags {
  /** Face detail (eyes, mouth, belly marks…): hidden in the back view. */
  readonly face?: boolean;
  /** Only drawn in the back view. */
  readonly backOnly?: boolean;
  /** Small detail: hidden in the icon. */
  readonly detail?: boolean;
  /** Only drawn in the icon. */
  readonly iconOnly?: boolean;
}

export interface ShapePart extends PartFlags {
  /** Color: a key of the creature's `pal` or '#rrggbb'. */
  readonly c: string;
  /** One shape, or several shaded as one volume. */
  readonly s: Shape | readonly Shape[];
  /** Shapes cut out of `s`. */
  readonly cut?: Shape | readonly Shape[];
  /** Surface marking: paints only over already painted pixels and keeps their shading tone. No contour unless `line: true`. */
  readonly mark?: boolean;
  /** Single tone, no shading (eyes, glow, sparks). */
  readonly flat?: boolean;
  /** One tone darker (far-side legs, parts in the shade). */
  readonly dim?: boolean;
  /** Contour line where this part overlaps earlier parts. Default: true (false for marks). */
  readonly line?: boolean;
  /** Contributes to the outer outline. Default: true. */
  readonly outline?: boolean;
}

export interface PixelPart extends PartFlags {
  /** Explicit pixel rows at front-view scale (1 char = 1 px); '.' = transparent. */
  readonly px: readonly string[];
  /** Rows used below 3/4 scale (icons); default: the big rows, downsampled. */
  readonly small?: readonly string[];
  /** Top-left corner in 48×48 space. */
  readonly at: Pt;
  /** Char → color (palette key or '#hex'). */
  readonly pal: Readonly<Record<string, string>>;
  /** Contributes to the outer outline. Default: false. */
  readonly outline?: boolean;
}

export type Part = ShapePart | PixelPart;

/** A base color, or an explicit ramp [light, base, shade] / [light, base, shade, outline]. */
export type Swatch = string | readonly [string, string, string] | readonly [string, string, string, string];

export interface CreatureDef {
  /** Named colors used by the parts. */
  readonly pal: Readonly<Record<string, Swatch>>;
  /** Back to front. */
  readonly parts: readonly Part[];
  /** Back view: extra scale (default 1 → 64/48 of the front) and pixel offsets of the placement. */
  readonly back?: { readonly scale?: number; readonly dx?: number; readonly dy?: number };
  /** Icon: crop box [x0, y0, x1, y1] in 48×48 space (default: the whole creature). */
  readonly icon?: { readonly box?: readonly [number, number, number, number] };
}

/** Definitions per species id. */
export type CreatureDefs = Readonly<Record<string, CreatureDef>>;

/** Shorthand for a pixel patch. */
export const pixels = (at: Pt, pal: Readonly<Record<string, string>>, px: readonly string[], extra: Omit<PixelPart, 'px' | 'at' | 'pal'> = {}): PixelPart => ({
  at, pal, px, ...extra,
});

// ---------------------------------------------------------------------------
// Color ramps
// ---------------------------------------------------------------------------

/** [light, base, shade, outline] */
type Ramp = readonly [Rgba, Rgba, Rgba, Rgba];

const mul = ([r, g, b]: Rgba, [fr, fg, fb]: readonly [number, number, number]): Rgba => [
  Math.round(r * fr), Math.round(g * fg), Math.round(b * fb), 255,
];
const mix = ([r, g, b]: Rgba, [tr, tg, tb]: readonly [number, number, number], f: number): Rgba => [
  Math.round(r + (tr - r) * f), Math.round(g + (tg - g) * f), Math.round(b + (tb - b) * f), 255,
];

/** Derives light/shade/outline tones: warm highlights, cool (blue-shifted) shadows. */
export function rampOf(sw: Swatch): Ramp {
  if (typeof sw !== 'string') {
    const [hi, base, lo, ln] = sw;
    const baseC = parseColor(base);
    return [parseColor(hi), baseC, parseColor(lo), ln ? parseColor(ln) : mul(baseC, [0.36, 0.37, 0.46])];
  }
  const base = parseColor(sw);
  // Light colors get a gentler shade so white fur stays white instead of turning grey.
  const lum = (0.3 * base[0] + 0.59 * base[1] + 0.11 * base[2]) / 255;
  const k = 0.74 + 0.12 * Math.max(0, lum - 0.6) / 0.4;
  return [mix(base, [255, 250, 226], 0.3), base, mul(base, [k, k + 0.02, k + 0.1]), mul(base, [0.36, 0.37, 0.46])];
}

// ---------------------------------------------------------------------------
// Rasterizer
// ---------------------------------------------------------------------------

/** Light direction (toward the light): from the top-left, slightly more from the top. */
const LIGHT = (() => {
  const v = [-0.6, -0.8, 0.95];
  const n = Math.hypot(v[0]!, v[1]!, v[2]!);
  return { x: v[0]! / n, y: v[1]! / n, z: v[2]! / n };
})();
/** Brightness thresholds for the 3 tones. */
const HI = 0.9;
const LO = 0.42;

const BOX = 48;
const MARGIN = 2;

interface Canvas {
  readonly w: number;
  readonly h: number;
  /** Output pixel → 48-space. */
  readonly s: number;
  readonly mirror: boolean;
}

const toSpace = (cv: Canvas, x: number, y: number): Pt => {
  const X = (x + 0.5) / cv.s - MARGIN / cv.s;
  const Y = (y + 0.5) / cv.s - MARGIN / cv.s;
  return [cv.mirror ? BOX - X : X, Y];
};

function inside(sh: Shape, X: number, Y: number): boolean {
  switch (sh.k) {
    case 'ellipse': {
      const dx = X - sh.c[0];
      const dy = Y - sh.c[1];
      const a = (sh.rot * Math.PI) / 180;
      const u = dx * Math.cos(a) + dy * Math.sin(a);
      const v = -dx * Math.sin(a) + dy * Math.cos(a);
      return (u / sh.rx) ** 2 + (v / sh.ry) ** 2 <= 1 + 1e-9;
    }
    case 'rect': {
      const r = Math.min(sh.r, sh.w / 2, sh.h / 2);
      const qx = Math.abs(X - (sh.x + sh.w / 2)) - (sh.w / 2 - r);
      const qy = Math.abs(Y - (sh.y + sh.h / 2)) - (sh.h / 2 - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= r + 1e-9;
    }
    case 'poly': {
      let hit = false;
      const pts = sh.pts;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i]!;
        const [xj, yj] = pts[j]!;
        if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    }
    case 'stroke':
      return strokeHit(sh, X, Y);
  }
}

/** Stroke width at fraction f (0..1) of its length. */
function widthAt(w: readonly number[], f: number): number {
  if (w.length === 1) return w[0]!;
  const t = f * (w.length - 1);
  const i = Math.min(w.length - 2, Math.floor(t));
  return w[i]! + (w[i + 1]! - w[i]!) * (t - i);
}

function strokeHit(sh: Extract<Shape, { k: 'stroke' }>, X: number, Y: number): boolean {
  const pts = sh.pts;
  if (pts.length === 1) return Math.hypot(X - pts[0]![0], Y - pts[0]![1]) <= Math.max(widthAt(sh.w, 0) / 2, 0.5);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  let along = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const len = Math.hypot(bx - ax, by - ay);
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((X - ax) * (bx - ax) + (Y - ay) * (by - ay)) / (len * len)));
    const d = Math.hypot(X - (ax + (bx - ax) * t), Y - (ay + (by - ay) * t));
    const f = total === 0 ? 0 : (along + len * t) / total;
    const w = widthAt(sh.w, f);
    if (d <= Math.max(w / 2, 0.5) + 1e-9) return true;
    along += len;
  }
  return false;
}

function bounds(sh: Shape): readonly [number, number, number, number] {
  switch (sh.k) {
    case 'ellipse': {
      const r = Math.max(sh.rx, sh.ry);
      return [sh.c[0] - r, sh.c[1] - r, sh.c[0] + r, sh.c[1] + r];
    }
    case 'rect':
      return [sh.x, sh.y, sh.x + sh.w, sh.y + sh.h];
    case 'poly':
    case 'stroke': {
      const pad = sh.k === 'stroke' ? Math.max(...sh.w, 1) / 2 : 0;
      const xs = sh.pts.map((p) => p[0]);
      const ys = sh.pts.map((p) => p[1]);
      return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
    }
  }
}

const list = <T>(v: T | readonly T[] | undefined): readonly T[] =>
  v === undefined ? [] : Array.isArray(v) ? (v as readonly T[]) : [v as T];

/** Pixel mask of a union of shapes minus cuts. */
function rasterize(cv: Canvas, shapes: readonly Shape[], cuts: readonly Shape[]): Uint8Array {
  const m = new Uint8Array(cv.w * cv.h);
  for (const sh of shapes) {
    const [x0, y0, x1, y1] = bounds(sh);
    const px = (X: number) => (cv.mirror ? BOX - X : X) * cv.s + MARGIN;
    const [ax, bx] = [px(x0), px(x1)].sort((a, b) => a - b) as [number, number];
    const xs = Math.max(0, Math.floor(ax) - 1);
    const xe = Math.min(cv.w - 1, Math.ceil(bx) + 1);
    const ys = Math.max(0, Math.floor(y0 * cv.s + MARGIN) - 1);
    const ye = Math.min(cv.h - 1, Math.ceil(y1 * cv.s + MARGIN) + 1);
    for (let y = ys; y <= ye; y++)
      for (let x = xs; x <= xe; x++) {
        const i = y * cv.w + x;
        if (m[i]) continue;
        const [X, Y] = toSpace(cv, x, y);
        if (inside(sh, X, Y)) m[i] = 1;
      }
  }
  if (cuts.length)
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      const [X, Y] = toSpace(cv, i % cv.w, Math.floor(i / cv.w));
      if (cuts.some((c) => inside(c, X, Y))) m[i] = 0;
    }
  return m;
}

/** Offsets sorted by distance, for nearest-outside-pixel searches. */
const OFFSETS: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  const R = 40;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if ((dx || dy) && dx * dx + dy * dy <= R * R) out.push([dx, dy, Math.hypot(dx, dy)]);
  return out.sort((a, b) => a[2] - b[2]);
})();

/**
 * Tone per pixel of a mask (0 light, 1 base, 2 shade). The surface normal is estimated from the
 * silhouette: it tilts toward the nearest edge, more the closer the pixel is to that edge
 * relative to the shape's thickness there (sphere for circles, cylinder for strokes).
 */
function shadeMask(cv: Canvas, m: Uint8Array): Uint8Array {
  const { w, h } = cv;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const dist = new Float32Array(w * h);
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    let d = 41;
    for (const [dx, dy, r] of OFFSETS)
      if (!on(x + dx, y + dy)) {
        d = r;
        break;
      }
    dist[i] = d;
  }
  const D = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? dist[y * w + x]! : 0);
  const tone = new Uint8Array(w * h).fill(1);
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    // Sobel gradient of the distance field points inward; the outward normal is its negation.
    const gx = D(x + 1, y - 1) + 2 * D(x + 1, y) + D(x + 1, y + 1) - D(x - 1, y - 1) - 2 * D(x - 1, y) - D(x - 1, y + 1);
    const gy = D(x - 1, y + 1) + 2 * D(x, y + 1) + D(x + 1, y + 1) - D(x - 1, y - 1) - 2 * D(x, y - 1) - D(x + 1, y - 1);
    const gl = Math.hypot(gx, gy);
    let b = LIGHT.z;
    if (gl > 1e-6) {
      const nx = -gx / gl;
      const ny = -gy / gl;
      const near = dist[i]! - 0.5;
      let far = 0;
      while (far < 80 && on(Math.round(x - nx * (far + 0.5)), Math.round(y - ny * (far + 0.5)))) far += 0.5;
      const chord = Math.max(1, near + far + 0.5);
      const u = Math.max(0, Math.min(1, 1 - (2 * near) / chord));
      b = u * (nx * LIGHT.x + ny * LIGHT.y) + Math.sqrt(1 - u * u) * LIGHT.z;
    }
    tone[i] = b > HI ? 0 : b < LO ? 2 : 1;
  }
  return despeckle(cv, m, tone);
}

/** Pixels whose tone matches none of their in-part neighbours take the most common neighbour tone. */
function despeckle(cv: Canvas, m: Uint8Array, tone: Uint8Array): Uint8Array {
  const out = tone.slice();
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % cv.w;
    const counts = [0, 0, 0];
    let same = 0;
    for (const j of [x > 0 ? i - 1 : -1, x < cv.w - 1 ? i + 1 : -1, i - cv.w, i + cv.w]) {
      if (j < 0 || j >= m.length || !m[j]) continue;
      counts[tone[j]!]!++;
      if (tone[j] === tone[i]) same++;
    }
    if (same === 0 && counts[0]! + counts[1]! + counts[2]! >= 2) out[i] = counts.indexOf(Math.max(...counts));
  }
  return out;
}

interface Painted {
  readonly cv: Canvas;
  /** Index into ramps, -1 = empty. */
  readonly ramp: Int16Array;
  readonly tone: Uint8Array;
  /** Index of the part that painted the pixel, -1 = empty. */
  readonly owner: Int16Array;
  /** Structural part the pixel belongs to (marks and patches belong to the part below). */
  readonly host: Int16Array;
}

function isPixelPart(p: Part): p is PixelPart {
  return 'px' in p;
}

const visible = (p: Part, view: CreatureView): boolean =>
  !(view === 'back' && p.face) && !(view !== 'back' && p.backOnly) && !(view === 'icon' && p.detail) && !(view !== 'icon' && p.iconOnly);

function paintParts(def: CreatureDef, parts: readonly Part[], cv: Canvas): { painted: Painted; ramps: Ramp[] } {
  const n = cv.w * cv.h;
  const painted: Painted = {
    cv,
    ramp: new Int16Array(n).fill(-1),
    tone: new Uint8Array(n),
    owner: new Int16Array(n).fill(-1),
    host: new Int16Array(n).fill(-1),
  };
  const ramps: Ramp[] = [];
  const rampIds = new Map<string, number>();
  const rampFor = (color: string): number => {
    let id = rampIds.get(color);
    if (id === undefined) {
      id = ramps.length;
      ramps.push(rampOf(def.pal[color] ?? color));
      rampIds.set(color, id);
    }
    return id;
  };

  parts.forEach((part, pi) => {
    if (isPixelPart(part)) {
      paintPixels(painted, part, pi, rampFor);
      return;
    }
    const mask = rasterize(cv, list(part.s), list(part.cut));
    if (part.mark) for (let i = 0; i < n; i++) if (painted.ramp[i]! < 0) mask[i] = 0;
    if (!part.mark && !mask.some((v) => v === 1)) {
      // Tiny parts never vanish completely: paint the pixel under the first shape's center.
      const [x0, y0, x1, y1] = bounds(list(part.s)[0]!);
      const cx = ((x0 + x1) / 2) * cv.s + MARGIN;
      const x = Math.floor(cv.mirror ? cv.w - cx : cx);
      const y = Math.floor(((y0 + y1) / 2) * cv.s + MARGIN);
      if (x >= 0 && y >= 0 && x < cv.w && y < cv.h) mask[y * cv.w + x] = 1;
    }
    const own = part.flat || part.mark ? null : shadeMask(cv, mask);
    const rid = rampFor(part.c);
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      let t = part.flat ? 1 : part.mark ? painted.tone[i]! : (own?.[i] ?? 1);
      if (part.dim) t = Math.min(2, t + 1);
      painted.tone[i] = t;
      painted.ramp[i] = rid;
      painted.owner[i] = pi;
      painted.host[i] = part.mark && part.line !== true ? painted.host[i]! : pi;
    }
  });
  return { painted, ramps };
}

function paintPixels(pt: Painted, part: PixelPart, pi: number, rampFor: (c: string) => number): void {
  const { cv } = pt;
  const rows = cv.s < 0.75 ? (part.small ?? downsample(part.px, cv.s)) : part.px;
  const srcW = part.px[0]?.length ?? 0;
  const w = rows[0]?.length ?? 0;
  // Keep the patch centered on the same 48-space point at every scale.
  const cx48 = cv.mirror ? BOX - (part.at[0] + srcW / 2) : part.at[0] + srcW / 2;
  const x0 = Math.round(cx48 * cv.s + MARGIN - w / 2);
  const y0 = Math.round((part.at[1] + part.px.length / 2) * cv.s + MARGIN - rows.length / 2);
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < w; dx++) {
      const ch = row[cv.mirror ? w - 1 - dx : dx]!;
      if (ch === '.') continue;
      const color = part.pal[ch];
      if (color === undefined) throw new Error(`pixel patch: char "${ch}" not in pal`);
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
      const i = y * cv.w + x;
      pt.ramp[i] = rampFor(color);
      pt.tone[i] = 1;
      pt.owner[i] = pi;
      if (pt.host[i]! < 0) pt.host[i] = pi;
    }
  });
}

/** Block-majority downsampling of pixel rows (keeps small eyes solid instead of dotted). */
function downsample(rows: readonly string[], s: number): string[] {
  const sh = rows.length;
  const sw = rows[0]?.length ?? 0;
  const h = Math.max(1, Math.round(sh * s));
  const w = Math.max(1, Math.round(sw * s));
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      const counts = new Map<string, number>();
      const [y0, y1] = [Math.floor((y * sh) / h), Math.max(Math.floor((y * sh) / h) + 1, Math.floor(((y + 1) * sh) / h))];
      const [x0, x1] = [Math.floor((x * sw) / w), Math.max(Math.floor((x * sw) / w) + 1, Math.floor(((x + 1) * sw) / w))];
      for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
        const ch = rows[sy]?.[sx] ?? '.';
        counts.set(ch, (counts.get(ch) ?? 0) + (ch === '.' ? 0.9 : 1));
      }
      let best = '.';
      for (const [ch, n] of counts) if (n > (counts.get(best) ?? 0)) best = ch;
      r += best;
    }
    out.push(r);
  }
  return out;
}

const ORTHO: readonly Pt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Contours, outer outline and final colors. */
function compose(parts: readonly Part[], { painted, ramps }: { painted: Painted; ramps: Ramp[] }): Bitmap {
  const { cv, ramp, tone, owner, host } = painted;
  const out = createBitmap(cv.w, cv.h);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < cv.w && y < cv.h ? y * cv.w + x : -1);
  const drawsLine = (pi: number) => {
    const p = parts[pi];
    return p !== undefined && !isPixelPart(p) && (p.line ?? !p.mark);
  };
  const drawsOutline = (pi: number) => {
    const p = parts[pi];
    return p !== undefined && (isPixelPart(p) ? p.outline === true : p.outline !== false);
  };
  for (let y = 0; y < cv.h; y++)
    for (let x = 0; x < cv.w; x++) {
      const i = y * cv.w + x;
      if (ramp[i]! >= 0) {
        // Contour on the rear part where a later structural part begins.
        let front = -1;
        for (const [dx, dy] of ORTHO) {
          const j = at(x + dx, y + dy);
          if (j >= 0 && ramp[j]! >= 0 && host[j]! > host[i]! && host[j]! > front && drawsLine(host[j]!)) front = host[j]!;
        }
        if (front >= 0) {
          const j = ORTHO.map(([dx, dy]) => at(x + dx, y + dy)).find((k) => k >= 0 && host[k] === front)!;
          setPixel(out, x, y, ramps[ramp[j]!]![3]);
        } else setPixel(out, x, y, ramps[ramp[i]!]![tone[i]!]!);
        continue;
      }
      // Outer outline: darkened hue of the front-most neighbouring fill.
      let best = -1;
      for (const [dx, dy] of ORTHO) {
        const j = at(x + dx, y + dy);
        if (j >= 0 && ramp[j]! >= 0 && drawsOutline(owner[j]!) && (best < 0 || owner[j]! > owner[best]!)) best = j;
      }
      if (best >= 0) setPixel(out, x, y, ramps[ramp[best]!]![3]);
    }
  return out;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function renderAt(def: CreatureDef, view: CreatureView, s: number, mirror: boolean): Bitmap {
  const size = Math.ceil(BOX * s) + 2 * MARGIN;
  const cv: Canvas = { w: size, h: size, s, mirror };
  const parts = def.parts.filter((p) => visible(p, view));
  return compose(parts, paintParts(def, parts, cv));
}

/** Bounding box of opaque pixels: [x0, y0, x1, y1] (inclusive), or null if empty. */
export function opaqueBounds(b: Bitmap): readonly [number, number, number, number] | null {
  let x0 = b.w;
  let y0 = b.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++)
      if (b.data[(y * b.w + x) * 4 + 3]! > 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

/** Copies the rectangle [sx, sy, w, h] of src into a new size×size bitmap at (dx, dy). */
function place(src: Bitmap, sx: number, sy: number, w: number, h: number, size: number, dx: number, dy: number): Bitmap {
  const out = createBitmap(size, size);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
      const i = ((sy + y) * src.w + sx + x) * 4;
      if (src.data[i + 3]! === 0) continue;
      setPixel(out, tx, ty, [src.data[i]!, src.data[i + 1]!, src.data[i + 2]!, src.data[i + 3]!]);
    }
  return out;
}

/** Renders a creature: front 48×48, back 64×64, icon 24×24 (transparent background). */
export function renderCreature(def: CreatureDef, view: CreatureView): Bitmap {
  if (view === 'front') {
    const full = renderAt(def, 'front', 1, false);
    return place(full, MARGIN, MARGIN, BOX, BOX, BOX, 0, 0);
  }
  if (view === 'back') {
    const size = 64;
    const full = renderAt(def, 'back', (size / BOX) * (def.back?.scale ?? 1), true);
    const bb = opaqueBounds(full);
    if (!bb) return createBitmap(size, size);
    const [x0, y0, x1, y1] = bb;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    // Sunk below the bottom edge like a creature seen from behind over the text box.
    const sink = Math.round(h * 0.1) + (def.back?.dy ?? 0);
    const top = Math.max(0, size + sink - h);
    return place(full, x0, y0, w, h, size, Math.round((size - w) / 2) + (def.back?.dx ?? 0), top);
  }
  const size = 24;
  const ref = renderAt(def, 'icon', 1, false);
  const box = def.icon?.box;
  const bb = box ? ([box[0] + MARGIN, box[1] + MARGIN, box[2] + MARGIN, box[3] + MARGIN] as const) : opaqueBounds(ref);
  if (!bb) return createBitmap(size, size);
  const s = Math.min(1, (size - 3) / Math.max(bb[2] - bb[0] - 1, bb[3] - bb[1] - 1, 1));
  const full = renderAt(def, 'icon', s, false);
  const fb = box
    ? ([Math.floor((box[0]) * s) + MARGIN - 1, Math.floor(box[1] * s) + MARGIN - 1, Math.ceil(box[2] * s) + MARGIN, Math.ceil(box[3] * s) + MARGIN] as const)
    : opaqueBounds(full);
  if (!fb) return createBitmap(size, size);
  const w = fb[2] - fb[0] + 1;
  const h = fb[3] - fb[1] + 1;
  return place(full, fb[0], fb[1], w, h, size, Math.round((size - w) / 2), Math.round((size - h) / 2));
}
