/**
 * Move animations: physical = lunge + impact, special = projectile/beam + impact, status = aura.
 * Every type has its own impact signature (flames, splash, leaves, lightning, rocks, gusts, shards,
 * sludge, spirit rings, slashes, rays, star burst).
 */
import type { Side } from '../../core/contracts';
import type { MoveDef, TypeId } from '../../core/types';
import { getMove } from '../../data';
import type { BattleScene } from '../scene';
import { beam, bolt, type Point, Particle, type ParticleOpts, pulse, rays, type Shape } from './effects';
import { centerOf } from './layout';

interface TypeFx {
  /** light → dark */
  colors: readonly [string, string, string];
  shape: Shape;
}

const TYPE_FX: Record<TypeId, TypeFx> = {
  normal: { colors: ['#ffffff', '#f0e8d0', '#a8a090'], shape: 'star' },
  fire: { colors: ['#fff8a0', '#f89030', '#c03018'], shape: 'flame' },
  water: { colors: ['#e8f8ff', '#58a8f0', '#2860b0'], shape: 'bubble' },
  plant: { colors: ['#c8f080', '#58b048', '#2c7028'], shape: 'leaf' },
  spark: { colors: ['#ffffc0', '#f8d830', '#a08010'], shape: 'spark' },
  earth: { colors: ['#e0b878', '#b08040', '#684820'], shape: 'rock' },
  wind: { colors: ['#ffffff', '#c8f0f8', '#78b8d8'], shape: 'streak' },
  frost: { colors: ['#ffffff', '#b8f0f8', '#58a8d0'], shape: 'shard' },
  toxic: { colors: ['#e8b0f8', '#a050b0', '#582868'], shape: 'blob' },
  spirit: { colors: ['#d8c8ff', '#7868b8', '#302858'], shape: 'ring' },
  metal: { colors: ['#ffffff', '#c8d0d8', '#607080'], shape: 'slash' },
  light: { colors: ['#ffffff', '#fff0a0', '#e8c850'], shape: 'star' },
};

const PROJECTILE_SIZE: Partial<Record<Shape, number>> = { flame: 3.5, bubble: 2.5, leaf: 3, rock: 3, streak: 2, shard: 4, blob: 3, ring: 2, star: 3 };

const other = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');

function spawn(s: BattleScene, opts: ParticleOpts): void {
  s.add(new Particle(opts));
}

function rand(s: BattleScene, min: number, max: number): number {
  return min + s.fxRng.next() * (max - min);
}

/** Status moves aimed at the user (self stat boosts, heals). */
function targetsSelf(move: MoveDef): boolean {
  const effects = move.effects ?? [];
  return effects.length > 0 && effects.every((e) => e.kind === 'heal' || (e.kind === 'stat' && e.who === 'self'));
}

export async function playMoveFx(s: BattleScene, side: Side, moveId: string): Promise<void> {
  let move: MoveDef;
  try {
    move = getMove(moveId);
  } catch {
    return;
  }
  const foe = other(side);
  if (move.category === 'status') {
    await aura(s, targetsSelf(move) ? side : foe, move.type);
  } else if (move.category === 'physical') {
    await lunge(s, side);
    await impact(s, foe, move.type, false);
  } else {
    await projectile(s, side, foe, move.type);
    await impact(s, foe, move.type, true);
  }
}

async function lunge(s: BattleScene, side: Side): Promise<void> {
  const m = s.mons[side];
  const [dx, dy] = side === 'player' ? [16, -6] : [-16, 6];
  await s.tween(s.dur(6), (t) => {
    m.dx = dx * t;
    m.dy = dy * t;
  });
  await s.tween(s.dur(8), (t) => {
    m.dx = dx * (1 - t);
    m.dy = dy * (1 - t);
  });
}

async function projectile(s: BattleScene, from: Side, to: Side, type: TypeId): Promise<void> {
  const a = centerOf(from);
  const b = centerOf(to);
  const fx = TYPE_FX[type];
  if (type === 'spark') {
    s.add(bolt(s.fxRng, a, b, 18, [fx.colors[0], fx.colors[1]]));
    await s.wait(s.dur(18));
    return;
  }
  if (type === 'light') {
    s.add(beam(a, b, 24, fx.colors));
    await s.wait(s.dur(20));
    return;
  }
  const travel = 14;
  const count = 10;
  const arc = type === 'earth' || type === 'toxic';
  const gravity = arc ? 0.35 : 0;
  // normal specials are sound waves: growing rings
  const shape: Shape = type === 'normal' ? 'ring' : fx.shape;
  for (let i = 0; i < count; i++) {
    const wob = type === 'spirit' || type === 'wind' ? rand(s, -0.6, 0.6) : 0;
    spawn(s, {
      x: a.x + rand(s, -4, 4),
      y: a.y + rand(s, -4, 4),
      vx: (b.x - a.x) / travel,
      vy: (b.y - a.y) / travel - (gravity * travel) / 2 + wob,
      ay: gravity,
      life: travel,
      delay: i * 2,
      size: PROJECTILE_SIZE[shape] ?? 2.5,
      grow: shape === 'ring' ? 0.25 : 0,
      colors: [fx.colors[0], fx.colors[1]],
      dark: fx.colors[2],
      shape,
    });
  }
  await s.wait(s.dur(travel + count * 2 - 4));
}

async function impact(s: BattleScene, side: Side, type: TypeId, big: boolean): Promise<void> {
  const c = centerOf(side);
  const fx = TYPE_FX[type];
  const n = big ? 14 : 9;
  const [light, mid, dark] = fx.colors;
  switch (type) {
    case 'normal':
      s.add(pulse(c, 4, 22, 12, light));
      burst(s, c, n, 'star', [light, mid], dark, 2.5);
      break;
    case 'fire':
      for (let i = 0; i < n + 4; i++)
        spawn(s, {
          x: c.x + rand(s, -18, 18), y: c.y + rand(s, -4, 16), vy: -rand(s, 0.6, 1.4),
          life: Math.round(rand(s, 16, 26)), delay: Math.round(rand(s, 0, 10)), size: rand(s, 2, 3.5),
          colors: [light, mid, dark], dark: dark, shape: 'flame', flicker: true,
        });
      void tintPulse(s, side, mid);
      break;
    case 'water':
      for (let i = 0; i < n; i++)
        spawn(s, {
          x: c.x + rand(s, -6, 6), y: c.y + 6, vx: rand(s, -2, 2), vy: -rand(s, 1.5, 3.2), ay: 0.22,
          life: 22, size: 2, colors: [light, mid], shape: 'dot', delay: Math.round(rand(s, 0, 4)),
        });
      for (let i = 0; i < 5; i++)
        spawn(s, {
          x: c.x + rand(s, -16, 16), y: c.y + rand(s, -4, 14), vy: -0.7, life: 24, size: rand(s, 1.5, 3),
          colors: [light], shape: 'bubble', delay: Math.round(rand(s, 0, 10)),
        });
      s.add(pulse(c, 6, 26, 14, mid, 0.5));
      break;
    case 'plant':
      for (let i = 0; i < n; i++)
        spawn(s, {
          x: c.x, y: c.y, life: 26, size: 3, colors: [light, mid], dark, shape: 'leaf',
          orbit: { r: 30, angle: (i / n) * Math.PI * 2, speed: 0.22, dr: -1, squash: 0.6 },
        });
      burst(s, c, 6, 'leaf', [light, mid], dark, 2, 22);
      break;
    case 'spark':
      for (let i = 0; i < (big ? 3 : 2); i++)
        s.add(bolt(s.fxRng, { x: c.x + rand(s, -12, 12), y: 0 }, { x: c.x + rand(s, -8, 8), y: c.y + 10 }, 12, [light, mid], i * 6));
      burst(s, c, n, 'spark', [light, mid], dark, 2, 6);
      void s.flashScreen('#fff8c0', 0.35, s.dur(10));
      break;
    case 'earth':
      for (let i = 0; i < n; i++)
        spawn(s, {
          x: c.x + rand(s, -22, 22), y: c.y - 46 - rand(s, 0, 16), vy: 3, ay: 0.25, life: 14,
          delay: Math.round(rand(s, 0, 8)), size: rand(s, 2, 3.5), colors: [mid], dark, shape: 'rock',
        });
      burst(s, { x: c.x, y: c.y + 16 }, 10, 'dot', [light, mid], dark, 1.8, 14);
      s.shake(s.dur(18), 2);
      break;
    case 'wind': {
      const dir = side === 'enemy' ? 1 : -1;
      for (let i = 0; i < n; i++)
        spawn(s, {
          x: c.x - dir * 40, y: c.y + rand(s, -18, 18), vx: dir * rand(s, 4, 6), life: 18,
          delay: Math.round(rand(s, 0, 10)), size: rand(s, 2, 3), colors: [light, mid], dark, shape: 'streak',
        });
      for (let i = 0; i < 8; i++)
        spawn(s, {
          x: c.x, y: c.y, life: 24, size: 1.5, colors: [light, dark], shape: 'dot',
          orbit: { r: 10 + i * 2, angle: i, speed: 0.4, squash: 0.5 },
        });
      break;
    }
    case 'frost':
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawn(s, {
          x: c.x + Math.cos(a) * 36, y: c.y + Math.sin(a) * 26, vx: -Math.cos(a) * 2.2, vy: -Math.sin(a) * 1.6,
          life: 15, size: 3, colors: [light, mid], dark, shape: 'shard',
        });
      }
      burst(s, c, 8, 'flake', [light, mid], dark, 1.6, 14);
      void s.flashScreen('#e0f8ff', 0.3, s.dur(14));
      break;
    case 'toxic':
      for (let i = 0; i < n; i++)
        spawn(s, {
          x: c.x + rand(s, -18, 18), y: c.y + rand(s, 0, 16), vy: -rand(s, 0.5, 1.3), life: 22,
          delay: Math.round(rand(s, 0, 12)), size: rand(s, 1.5, 3), colors: [light, mid], dark, shape: 'blob',
        });
      void tintPulse(s, side, mid);
      break;
    case 'spirit':
      for (let i = 0; i < 3; i++) s.add(pulse(c, 34, 3, 14, i % 2 ? light : mid, 0.8, i * 6));
      for (let i = 0; i < 6; i++)
        spawn(s, {
          x: c.x, y: c.y, life: 28, size: 1.5, colors: [light, mid], shape: 'dot', flicker: true,
          orbit: { r: 22, angle: i, speed: 0.18, dr: -0.4, squash: 0.7 },
        });
      void s.flashScreen(dark, 0.4, s.dur(28));
      break;
    case 'metal':
      for (let i = 0; i < 3; i++)
        spawn(s, {
          x: c.x + (i - 1) * 10, y: c.y + (i - 1) * 3, life: 8, delay: i * 4, size: 3, colors: [light, mid], shape: 'slash',
        });
      burst(s, c, 6, 'star', [light, mid], dark, 2, 10);
      break;
    case 'light':
      s.add(rays(c, 12, 30, 20, mid));
      burst(s, c, n, 'star', [light, mid], dark, 2);
      void s.flashScreen('#ffffff', 0.5, s.dur(16));
      break;
  }
  await s.wait(s.dur(big ? 26 : 20));
}

/** Particles flying outward from a point. */
function burst(s: BattleScene, at: Point, n: number, shape: Shape, colors: readonly string[], dark: string, speed: number, delay = 0): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(s, -0.3, 0.3);
    const v = rand(s, speed * 0.6, speed);
    spawn(s, {
      x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, life: 16, delay, size: 2, colors, dark, shape,
    });
  }
}

/** Status-move aura: tinted pulses + sparkles rising around the target. */
async function aura(s: BattleScene, side: Side, type: TypeId): Promise<void> {
  const c = centerOf(side);
  const [light, mid, dark] = TYPE_FX[type].colors;
  for (let i = 0; i < 12; i++)
    spawn(s, {
      x: c.x + rand(s, -22, 22), y: c.y + rand(s, -6, 22), vy: -rand(s, 0.6, 1.2), life: 22,
      delay: Math.round(rand(s, 0, 16)), size: rand(s, 1.5, 2.5), colors: [light, mid], dark, shape: 'star', flicker: true,
    });
  s.add(pulse({ x: c.x, y: c.y + 16 }, 6, 30, 18, mid, 0.35));
  await tintPulse(s, side, mid);
  await s.wait(s.dur(10));
}

/** Two short color flashes on a sprite. */
export async function tintPulse(s: BattleScene, side: Side, color: string): Promise<void> {
  const m = s.mons[side];
  for (let i = 0; i < 2; i++) {
    m.tint = color;
    await s.wait(s.dur(5));
    m.tint = null;
    await s.wait(s.dur(5));
  }
}
