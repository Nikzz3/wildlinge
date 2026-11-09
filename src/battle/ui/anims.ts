/** Animations for battle events (intro, send-out, damage, status, stats, faint, exp, level-up, capture). */
import type { BattleEvent, Side } from '../../core/contracts';
import type { BattleStat, StatusId } from '../../core/types';
import { expForLevel, MAX_LEVEL } from '../../creature';
import { getSpecies } from '../../data';
import type { BattleScene } from '../scene';
import { chevrons, Particle, type Point, pulse, type Shape } from './effects';
import { STATUS_COLORS } from './hud';
import { ANCHOR, centerOf, SPRITE_SIZE, spriteBox } from './layout';
import { tintPulse } from './move-fx';

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

function sparkles(s: BattleScene, at: Point, n: number, colors: readonly string[], spread = 2.4, shape: Shape = 'star'): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    s.add(new Particle({
      x: at.x, y: at.y, vx: Math.cos(a) * spread, vy: Math.sin(a) * spread, drag: 0.88, life: 18, size: 2, colors, shape,
    }));
  }
}

// --- intro ---------------------------------------------------------------------

/** Opening: black bars open while both sides slide in; trainer battles show the party indicators. */
export async function intro(s: BattleScene): Promise<void> {
  if (s.setup.kind === 'wild') s.mons.enemy.species = s.setup.enemy.find((c) => c.hp > 0)?.species ?? null;
  s.layerDx.enemy = -240;
  s.layerDx.player = 240;
  await Promise.all([
    s.tween(s.dur(16), (t) => (s.cover = 1 - t)),
    s.tween(s.dur(s.anims ? 50 : 24), (t) => {
      const k = 1 - easeOut(t);
      s.layerDx.enemy = -240 * k;
      s.layerDx.player = 240 * k;
    }),
  ]);
  if (s.setup.kind === 'trainer') {
    s.balls.visible.player = true;
    s.balls.visible.enemy = true;
    await s.tween(s.dur(12), (t) => (s.balls.dx = 130 * (1 - easeOut(t))));
    return;
  }
  // Wild: the creature is already standing there — cry and show its HUD before "Ein wildes … erscheint!".
  const index = s.setup.enemy.findIndex((c) => c.hp > 0);
  const shadow = s.shadows.enemy[index];
  if (!shadow) return;
  s.active.enemy = index;
  s.hpShown.enemy = shadow.hp;
  s.g.audio.playCry(shadow.species);
  await hudIn(s, 'enemy');
}

// --- HUD slides --------------------------------------------------------------------

async function hudIn(s: BattleScene, side: Side): Promise<void> {
  const hud = s.hud[side];
  hud.visible = true;
  const from = side === 'enemy' ? -130 : 130;
  await s.tween(s.dur(10), (t) => (hud.dx = from * (1 - easeOut(t))));
}

async function hudOut(s: BattleScene, side: Side): Promise<void> {
  const hud = s.hud[side];
  const to = side === 'enemy' ? -130 : 130;
  await s.tween(s.dur(8), (t) => (hud.dx = to * t));
  hud.visible = false;
  hud.dx = 0;
}

// --- send-out / withdraw -------------------------------------------------------------

/** Crystal arc (12×12 icon) from a to b. */
async function tossCrystal(s: BattleScene, a: Point, b: Point, frames: number, height: number, itemId = 'crystal'): Promise<void> {
  const c = { x: a.x, y: a.y, tint: null, itemId };
  s.crystal = c;
  await s.tween(frames, (t) => {
    c.x = a.x + (b.x - a.x) * t;
    c.y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * height;
  });
}

export async function sendOut(s: BattleScene, side: Side, index: number): Promise<void> {
  const shadow = s.shadows[side][index];
  if (!shadow) return;
  const m = s.mons[side];
  if (s.active[side] === index && m.species === shadow.species) return; // wild intro already showed it
  s.active[side] = index;
  s.hpShown[side] = shadow.hp;
  if (side === 'player') s.expShown = shadow.exp;
  s.balls.visible[side] = false;

  const trainer = s.trainers[side];
  const leaving = trainer?.visible
    ? s.tween(s.dur(20), (t) => (trainer.dx = (side === 'enemy' ? 110 : -110) * t)).then(() => {
        trainer.visible = false;
      })
    : Promise.resolve();

  const ground = { x: ANCHOR[side].x, y: ANCHOR[side].y - (side === 'enemy' ? 8 : 20) };
  if (s.anims) {
    s.g.audio.playSfx('throw');
    const from = side === 'player' ? { x: 30, y: 96 } : { x: ground.x + 30, y: ground.y - 30 };
    await tossCrystal(s, from, ground, s.dur(16), side === 'player' ? 30 : 12);
  }
  s.crystal = null;
  Object.assign(m, { species: shadow.species, dx: 0, dy: 0, alpha: 1, sink: 0, hidden: false });
  if (s.anims) {
    sparkles(s, ground, 10, ['#ffffff', '#b8f0f8']);
    s.add(pulse(ground, 4, 20, 10, '#ffffff', 0.6));
    m.tint = '#ffffff';
    await s.tween(s.dur(12), (t) => (m.scale = 0.1 + 0.9 * easeOut(t)));
    await s.wait(s.dur(4));
  }
  m.scale = 1;
  m.tint = null;
  s.g.audio.playCry(shadow.species);
  await leaving;
  await hudIn(s, side);
}

export async function withdraw(s: BattleScene, side: Side): Promise<void> {
  const m = s.mons[side];
  m.tint = '#f8a0a0';
  await s.tween(s.dur(12), (t) => (m.scale = 1 - t));
  m.species = null;
  m.tint = null;
  m.scale = 1;
  await hudOut(s, side);
  s.active[side] = null;
}

// --- damage / status / stats ---------------------------------------------------------

/** A missed move: the target hops aside and back. */
export async function dodge(s: BattleScene, side: Side): Promise<void> {
  s.g.audio.playSfx('miss');
  const m = s.mons[side];
  if (!s.anims) return s.wait(s.dur(8));
  const away = side === 'enemy' ? 10 : -10;
  await s.tween(s.dur(6), (t) => (m.dx = away * easeOut(t)));
  await s.tween(s.dur(8), (t) => (m.dx = away * (1 - t)));
  m.dx = 0;
}

/** Damage: sfx by effectiveness, shake on crits / super effective, target blinks. Heal: sparkles. */
async function hitOrHeal(s: BattleScene, ev: Extract<BattleEvent, { t: 'hp' }>): Promise<void> {
  const audio = s.g.audio;
  if (ev.to > ev.from) {
    audio.playSfx('heal_hp');
    if (s.anims) sparkles(s, centerOf(ev.side), 8, ['#ffffff', '#88f0a0'], 1.6);
    return;
  }
  const eff = ev.effectiveness ?? 1;
  audio.playSfx(eff > 1 ? 'hit_super' : eff < 1 ? 'hit_weak' : 'hit');
  if (ev.crit || eff > 1) s.shake(s.dur(16), ev.crit && eff > 1 ? 3 : 2);
  const m = s.mons[ev.side];
  for (let i = 0; i < 4; i++) {
    m.hidden = true;
    await s.wait(s.dur(3));
    m.hidden = false;
    await s.wait(s.dur(3));
  }
}

/** quiet: no sound / blink (HP gained by a level-up). The bar drains or fills; player numbers count. */
export async function hpChange(s: BattleScene, ev: Extract<BattleEvent, { t: 'hp' }>, quiet = false): Promise<void> {
  const side = ev.side;
  if (!quiet && ev.to !== ev.from) await hitOrHeal(s, ev);
  const frames = Math.max(6, Math.min(48, Math.round((Math.abs(ev.to - ev.from) / Math.max(1, ev.max)) * 60)));
  await s.tween(s.dur(frames), (t) => (s.hpShown[side] = ev.from + (ev.to - ev.from) * t));
  const shadow = s.shown(side);
  if (shadow) {
    shadow.hp = ev.to;
    shadow.maxHp = ev.max;
  }
}

const STATUS_FX: Record<StatusId, Shape> = { burn: 'flame', poison: 'blob', paralysis: 'spark', sleep: 'zzz' };

export async function statusChange(s: BattleScene, side: Side, status: StatusId | null): Promise<void> {
  const shadow = s.shown(side);
  if (shadow) shadow.status = status;
  if (!status) return;
  s.g.audio.playSfx('status');
  if (!s.anims) return;
  const c = centerOf(side);
  const color = STATUS_COLORS[status];
  for (let i = 0; i < 6; i++)
    s.add(new Particle({
      x: c.x - 16 + i * 6 + s.fxRng.int(-2, 2), y: c.y + s.fxRng.int(-4, 12), vy: -0.8, life: 22, delay: i * 3,
      size: 2, colors: ['#ffffff', color], dark: color, shape: STATUS_FX[status], flicker: status === 'paralysis',
    }));
  await tintPulse(s, side, color);
  await s.wait(s.dur(10));
}

export async function statChange(s: BattleScene, side: Side, _stat: BattleStat, stages: number): Promise<void> {
  if (stages === 0) return;
  const up = stages > 0;
  s.g.audio.playSfx(up ? 'stat_up' : 'stat_down');
  if (!s.anims) return;
  s.add(chevrons(spriteBox(side), up, 30, up ? ['#a8d8ff', '#5890f0'] : ['#ffb0a0', '#e05040']));
  await s.wait(s.dur(32));
}

export async function faint(s: BattleScene, side: Side): Promise<void> {
  const m = s.mons[side];
  const shadow = s.shown(side);
  if (shadow) s.g.audio.playCry(shadow.species, { faint: true });
  await s.wait(s.dur(16));
  s.g.audio.playSfx('faint');
  const depth = SPRITE_SIZE[side];
  await s.tween(s.dur(18), (t) => {
    m.sink = depth * t * t;
    m.alpha = 1 - 0.5 * t;
  });
  Object.assign(m, { species: null, sink: 0, alpha: 1 });
  await hudOut(s, side);
}

// --- exp / level-up ------------------------------------------------------------------

async function fillExp(s: BattleScene): Promise<void> {
  const shadow = s.shown('player');
  if (!shadow || shadow.level >= MAX_LEVEL) return;
  const growth = getSpecies(shadow.species).growth;
  const lo = expForLevel(growth, shadow.level);
  const hi = expForLevel(growth, shadow.level + 1);
  const from = s.expShown;
  const to = Math.min(s.expTarget, hi);
  if (to <= from) return;
  s.g.audio.playSfx('exp_fill');
  const frames = Math.max(6, Math.min(60, Math.round(((to - from) / Math.max(1, hi - lo)) * 60)));
  await s.tween(s.dur(frames), (t) => (s.expShown = from + (to - from) * t));
}

export async function expGain(s: BattleScene, ev: Extract<BattleEvent, { t: 'exp' }>): Promise<void> {
  const shadow = s.shadows.player[ev.partyIndex];
  if (!shadow) return;
  shadow.exp = ev.to;
  if (ev.partyIndex !== s.active.player) return;
  s.expTarget = ev.to;
  s.expShown = Math.max(s.expShown, ev.from);
  await fillExp(s);
}

/** New level on the HUD + jingle; the exp bar wraps. The engine sends the HP gain as its own 'hp' event and
 * playback opens the stats window after the level message. */
export async function levelUp(s: BattleScene, ev: Extract<BattleEvent, { t: 'levelUp' }>): Promise<void> {
  const shadow = s.shadows.player[ev.partyIndex];
  if (shadow) {
    shadow.level = ev.level;
    shadow.maxHp = ev.after.hp;
  }
  void s.g.audio.playJingle('level_up');
  if (ev.partyIndex === s.active.player) await fillExp(s);
}

// --- capture ---------------------------------------------------------------------------

export async function throwCrystal(s: BattleScene, ev: Extract<BattleEvent, { t: 'throw' }>): Promise<void> {
  const m = s.mons.enemy;
  const c = centerOf('enemy');
  const rest = { x: ANCHOR.enemy.x, y: ANCHOR.enemy.y - 11 };
  s.g.audio.playSfx('throw');
  if (s.anims) await tossCrystal(s, { x: 24, y: 104 }, { x: c.x, y: c.y - 6 }, s.dur(24), 40, ev.itemId);
  else s.crystal = { x: c.x, y: c.y - 6, tint: null, itemId: ev.itemId };

  // absorbed in a flash
  m.tint = '#ffffff';
  if (s.anims) {
    s.add(pulse({ x: c.x, y: c.y - 6 }, 4, 24, 10, '#ffffff'));
    void s.flashScreen('#ffffff', 0.5, s.dur(10));
  }
  await s.tween(s.dur(12), (t) => (m.scale = 1 - t));
  m.hidden = true;

  // drops onto the platform with a small bounce
  const crystal = s.crystal;
  if (crystal) {
    const top = crystal.y;
    await s.tween(s.dur(14), (t) => {
      const bounce = t < 0.7 ? t / 0.7 : 1 - Math.sin(((t - 0.7) / 0.3) * Math.PI) * 0.15;
      crystal.y = top + (rest.y - top) * bounce;
    });
    crystal.y = rest.y;
  }
  await s.wait(s.dur(16));

  for (let i = 0; i < ev.shakes; i++) {
    s.g.audio.playSfx('shake');
    await s.tween(s.dur(16), (t) => {
      if (crystal) crystal.x = rest.x + Math.round(Math.sin(t * Math.PI * 2) * 3);
    });
    await s.wait(s.dur(18));
  }

  if (ev.caught) {
    if (crystal) crystal.tint = '#8890a0';
    sparkles(s, { x: rest.x, y: rest.y - 4 }, 8, ['#fff8c0', '#f8d830']);
    void s.g.audio.playJingle('caught'); // plays under the "… wurde gefangen!" message
    await s.wait(s.dur(24));
    return;
  }
  s.g.audio.playSfx('catch_fail');
  s.crystal = null;
  sparkles(s, rest, 10, ['#ffffff', '#b8f0f8']);
  m.hidden = false;
  await s.tween(s.dur(10), (t) => (m.scale = t));
  m.scale = 1;
  m.tint = null;
}

// --- trainer ------------------------------------------------------------------------------

/** Defeated trainer slides back in for the closing words. */
export async function trainerReturn(s: BattleScene): Promise<void> {
  const t = s.trainers.enemy;
  if (!t) return;
  t.visible = true;
  await s.tween(s.dur(20), (k) => (t.dx = 110 * (1 - easeOut(k))));
}
