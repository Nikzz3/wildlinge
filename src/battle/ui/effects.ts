/** Pixel drawing helpers and short-lived visual effects (particles, bolts, beams, rings) for battle animations. */
import type { Gfx } from '../../core/contracts';
import type { Rng } from '../../core/rng';

export interface Point {
  x: number;
  y: number;
}

/** Something drawn on the battle field for a while. update() returns false when it is finished. */
export interface Effect {
  update(): boolean;
  render(gfx: Gfx): void;
}

// ---------------------------------------------------------------------------
// Pixel primitives
// ---------------------------------------------------------------------------

function disc(gfx: Gfx, cx: number, cy: number, r: number, color: string): void {
  const rr = Math.max(0, Math.round(r));
  for (let dy = -rr; dy <= rr; dy++) {
    const w = Math.round(Math.sqrt(rr * rr - dy * dy));
    gfx.fillRect(cx - w, cy + dy, w * 2 + 1, 1, color);
  }
}

export function ring(gfx: Gfx, cx: number, cy: number, r: number, color: string, squash = 1): void {
  const steps = Math.max(8, Math.round(r * 6));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    gfx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * squash), 1, 1, color);
  }
}

export function line(gfx: Gfx, x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const off = Math.floor(thick / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    gfx.fillRect(Math.round(x0 + (x1 - x0) * t) - off, Math.round(y0 + (y1 - y0) * t) - off, thick, thick, color);
  }
}

export type Shape =
  | 'dot' | 'spark' | 'star' | 'flame' | 'bubble' | 'leaf' | 'flake' | 'rock' | 'streak' | 'ring' | 'blob' | 'shard'
  | 'slash' | 'zzz';

/** Draws one particle shape centered at (x, y). */
function drawShape(gfx: Gfx, shape: Shape, x: number, y: number, size: number, color: string, dark: string): void {
  const s = Math.max(1, Math.round(size));
  x = Math.round(x);
  y = Math.round(y);
  switch (shape) {
    case 'dot':
      gfx.fillRect(x - Math.floor(s / 2), y - Math.floor(s / 2), s, s, color);
      return;
    case 'spark':
      gfx.fillRect(x - s, y, s * 2 + 1, 1, color);
      gfx.fillRect(x, y - s, 1, s * 2 + 1, color);
      return;
    case 'star':
      gfx.fillRect(x - s, y, s * 2 + 1, 1, color);
      gfx.fillRect(x, y - s, 1, s * 2 + 1, color);
      gfx.fillRect(x - 1, y - 1, 3, 3, color);
      return;
    case 'flame':
      gfx.fillRect(x - s, y - s, s * 2, s * 2, dark);
      gfx.fillRect(x - s + 1, y - s, s * 2 - 2, s * 2 - 1, color);
      gfx.fillRect(x - Math.max(1, s - 1), y - s * 2, Math.max(2, s * 2 - 2), s, color);
      gfx.fillRect(x - 1, y - s * 2 - Math.ceil(s / 2), 2, Math.ceil(s / 2), color);
      return;
    case 'bubble':
      ring(gfx, x, y, s + 1, color);
      gfx.fillRect(x - Math.ceil(s / 2), y - Math.ceil(s / 2), 1, 1, '#ffffff');
      return;
    case 'leaf':
      gfx.fillRect(x - s, y, s * 2 + 1, 1, color);
      gfx.fillRect(x - Math.max(0, s - 1), y - 1, Math.max(1, s * 2 - 1), 3, color);
      gfx.fillRect(x - s, y, s * 2, 1, dark);
      return;
    case 'flake':
      gfx.fillRect(x - s, y, s * 2 + 1, 1, color);
      gfx.fillRect(x, y - s, 1, s * 2 + 1, color);
      for (let i = 1; i <= Math.max(1, s - 1); i++) {
        gfx.fillRect(x - i, y - i, 1, 1, color);
        gfx.fillRect(x + i, y + i, 1, 1, color);
        gfx.fillRect(x - i, y + i, 1, 1, color);
        gfx.fillRect(x + i, y - i, 1, 1, color);
      }
      return;
    case 'rock':
      gfx.fillRect(x - s, y - s + 1, s * 2, s * 2 - 1, dark);
      gfx.fillRect(x - s + 1, y - s, s * 2 - 1, s * 2 - 1, color);
      gfx.fillRect(x - s + 1, y - s, Math.max(1, s - 1), 1, '#ffffff');
      return;
    case 'streak':
      gfx.fillRect(x - s * 3, y, s * 6, 1, color);
      gfx.fillRect(x - s * 2, y - 1, s * 4, 1, dark);
      gfx.fillRect(x - s, y + 1, s * 3, 1, color);
      return;
    case 'ring':
      ring(gfx, x, y, s, color);
      ring(gfx, x, y, s + 1, dark);
      return;
    case 'blob':
      disc(gfx, x, y, s, dark);
      disc(gfx, x, y - 1, Math.max(1, s - 1), color);
      gfx.fillRect(x - 1, y - s + 1, 1, 1, '#ffffff');
      return;
    case 'shard':
      line(gfx, x - s, y + s, x + s, y - s, dark, 2);
      line(gfx, x - s, y + s, x + s, y - s, color, 1);
      return;
    case 'slash':
      line(gfx, x - s * 2, y - s * 2, x + s * 2, y + s * 2, color, 2);
      line(gfx, x - s * 2 + 1, y - s * 2, x + s * 2, y + s * 2 - 1, '#ffffff', 1);
      return;
    case 'zzz':
      gfx.drawText('z', x - 3, y - 8, { color, shadow: dark });
      return;
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export interface ParticleOpts {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  /** Acceleration per frame. */
  ax?: number;
  ay?: number;
  /** Velocity multiplier per frame (1 = none). */
  drag?: number;
  life: number;
  /** Frames before it appears. */
  delay?: number;
  size: number;
  /** Size change per frame. */
  grow?: number;
  /** Colors over the lifetime (first → last). */
  colors: readonly string[];
  dark?: string;
  shape: Shape;
  /** Skip every other frame for a flickering look. */
  flicker?: boolean;
  /** Orbit around (x, y): radius and angular speed; position is computed from these. */
  orbit?: { r: number; angle: number; speed: number; dr?: number; squash?: number };
}

export class Particle implements Effect {
  private age = 0;
  constructor(private readonly p: ParticleOpts) {}

  update(): boolean {
    const p = this.p;
    this.age++;
    if (this.age <= (p.delay ?? 0)) return true;
    if (p.orbit) {
      p.orbit.angle += p.orbit.speed;
      p.orbit.r = Math.max(0, p.orbit.r + (p.orbit.dr ?? 0));
    }
    p.vx = ((p.vx ?? 0) + (p.ax ?? 0)) * (p.drag ?? 1);
    p.vy = ((p.vy ?? 0) + (p.ay ?? 0)) * (p.drag ?? 1);
    p.x += p.vx;
    p.y += p.vy;
    p.size = Math.max(0.5, p.size + (p.grow ?? 0));
    return this.age < p.life + (p.delay ?? 0);
  }

  render(gfx: Gfx): void {
    const p = this.p;
    const t = this.age - (p.delay ?? 0);
    if (t <= 0) return;
    if (p.flicker && t % 4 >= 2) return;
    const color = p.colors[Math.min(p.colors.length - 1, Math.floor((t / p.life) * p.colors.length))]!;
    let { x, y } = p;
    if (p.orbit) {
      x += Math.cos(p.orbit.angle) * p.orbit.r;
      y += Math.sin(p.orbit.angle) * p.orbit.r * (p.orbit.squash ?? 1);
    }
    drawShape(gfx, p.shape, x, y, p.size, color, p.dark ?? color);
  }
}

// ---------------------------------------------------------------------------
// Other effects
// ---------------------------------------------------------------------------

/** Generic timed effect: draw(gfx, t 0..1, frame). */
class Timed implements Effect {
  private frame = 0;
  constructor(
    private readonly frames: number,
    private readonly draw: (gfx: Gfx, t: number, frame: number) => void,
    private readonly delay = 0,
  ) {}

  update(): boolean {
    this.frame++;
    return this.frame < this.frames + this.delay;
  }

  render(gfx: Gfx): void {
    const f = this.frame - this.delay;
    if (f < 0) return;
    this.draw(gfx, Math.min(1, f / Math.max(1, this.frames)), f);
  }
}

/** Jagged lightning from a to b (re-rolled every few frames). */
export function bolt(rng: Rng, a: Point, b: Point, frames: number, colors: readonly [string, string], delay = 0): Effect {
  let points: Point[] = [];
  const roll = () => {
    const n = 6;
    points = [a];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      points.push({ x: a.x + (b.x - a.x) * t + rng.int(-6, 6), y: a.y + (b.y - a.y) * t + rng.int(-3, 3) });
    }
    points.push(b);
  };
  roll();
  return new Timed(
    frames,
    (gfx, _t, f) => {
      if (f % 3 === 0) roll();
      if (f % 6 >= 4) return;
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1]!;
        const q = points[i]!;
        line(gfx, p.x, p.y, q.x, q.y, colors[1], 3);
        line(gfx, p.x, p.y, q.x, q.y, colors[0], 1);
      }
    },
    delay,
  );
}

/** Beam from a to b that extends, holds and thins out. */
export function beam(a: Point, b: Point, frames: number, colors: readonly [string, string, string]): Effect {
  return new Timed(frames, (gfx, t, f) => {
    const reach = Math.min(1, t * 3);
    const thick = t < 0.7 ? 5 : Math.max(1, Math.round(5 * (1 - (t - 0.7) / 0.3)));
    const ex = a.x + (b.x - a.x) * reach;
    const ey = a.y + (b.y - a.y) * reach;
    const wobble = f % 4 < 2 ? 0 : 1;
    line(gfx, a.x, a.y, ex, ey, colors[2], thick + 2 + wobble);
    line(gfx, a.x, a.y, ex, ey, colors[1], thick);
    line(gfx, a.x, a.y, ex, ey, colors[0], Math.max(1, thick - 3));
  });
}

/** Expanding (or contracting) ring. */
export function pulse(at: Point, from: number, to: number, frames: number, color: string, squash = 1, delay = 0): Effect {
  return new Timed(frames, (gfx, t) => ring(gfx, at.x, at.y, from + (to - from) * t, color, squash), delay);
}

/** Rays radiating from a point. */
export function rays(at: Point, count: number, len: number, frames: number, color: string, delay = 0): Effect {
  return new Timed(
    frames,
    (gfx, t) => {
      const r0 = 6 + t * len * 0.6;
      const r1 = r0 + len * (1 - t * 0.5);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + t * 0.6;
        line(gfx, at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0, at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1, color);
      }
    },
    delay,
  );
}

/** Stat change chevrons sweeping over a sprite box (up = rising). */
export function chevrons(box: { x: number; y: number; w: number; h: number }, up: boolean, frames: number, colors: readonly [string, string]): Effect {
  const dir = up ? -1 : 1;
  return new Timed(frames, (gfx, t, f) => {
    if (t > 0.75 && f % 2 === 0) return;
    const travel = (f * 2) % 16;
    let i = 0;
    for (let row = 0; row < box.h; row += 16) {
      const y = up ? box.y + box.h - row - travel : box.y + row + travel;
      for (let x = box.x + 6; x < box.x + box.w - 10; x += 14) {
        const color = colors[i++ % 2]!;
        // a "^" (rising) or "v" (falling) chevron
        line(gfx, x, y, x + 4, y + 4 * dir, color, 2);
        line(gfx, x + 4, y + 4 * dir, x + 8, y, color, 2);
      }
    }
  });
}
