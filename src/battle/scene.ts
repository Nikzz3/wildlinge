/**
 * Battle scene: visual state + rendering + frame-driven async primitives (tween / wait / menus).
 * It knows nothing about battle rules; ui/playback.ts animates engine events on it and
 * ui/controller.ts drives the prompt loop.
 */
import { creatureSprite, crystalThrowIcon, playerBackPortrait, trainerPortrait } from '../art';
import type { Bitmap } from '../core/bitmap';
import type { BattleSetup, GameContext, Gfx, Scene, Side } from '../core/contracts';
import { createRng, type Rng } from '../core/rng';
import type { Creature, MoveSlot } from '../core/types';
import { displayName, expProgress, maxHp } from '../creature';
import { TextBox } from '../engine/ui';
import { fmt } from '../state';
import { backdrop, platform, platformPos } from './ui/backdrop';
import type { Effect } from './ui/effects';
import { drawEnemyHud, drawLevelUp, drawPartyBalls, drawPlayerHud, type LevelUpView, type ShadowMon } from './ui/hud';
import { ANCHOR, BOX_Y } from './ui/layout';
import { drawBottom, navigateGrid } from './ui/menus';

export interface MonView {
  /** Species on the field, null = empty. */
  species: string | null;
  dx: number;
  dy: number;
  /** Grows from the platform (bottom-center anchored). */
  scale: number;
  alpha: number;
  tint: string | null;
  /** Blink toggle. */
  hidden: boolean;
  /** Pixels sunk below the ground line (faint). */
  sink: number;
}

export interface TrainerView {
  bitmap: Bitmap;
  dx: number;
  visible: boolean;
}

export type BottomMode =
  | { kind: 'empty' }
  | { kind: 'message' }
  | { kind: 'command'; name: string }
  | { kind: 'moves'; moves: readonly MoveSlot[] };

interface Task {
  /** Returns true when done (it resolves its own promise). */
  step(): boolean;
  /** The step threw: reject the task's promise. */
  fail(err: unknown): void;
}

/** Extra frames an auto-advancing battle message stays up (TextBox closes it 30 frames after it is shown). */
const AUTO_MSG_EXTRA = 15;

function snapshot(c: Creature): ShadowMon {
  return { name: displayName(c), species: c.species, level: c.level, hp: c.hp, maxHp: maxHp(c), status: c.status, exp: c.exp };
}

/** '#rrggbb' + alpha 0..1 → '#rrggbbaa'. */
function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return color.slice(0, 7) + a.toString(16).padStart(2, '0');
}

function freshMon(): MonView {
  return { species: null, dx: 0, dy: 0, scale: 1, alpha: 1, tint: null, hidden: false, sink: 0 };
}

export class BattleScene implements Scene {
  readonly name = 'battle';
  /** Visual-only randomness (seeded once from g.rng so the battle itself stays reproducible). */
  readonly fxRng: Rng;
  /** state.options.battleAnims */
  readonly anims: boolean;
  readonly box = new TextBox({ style: 'dark' });
  bottom: BottomMode = { kind: 'empty' };
  readonly mons: Record<Side, MonView> = { player: freshMon(), enemy: freshMon() };
  readonly hud: Record<Side, { visible: boolean; dx: number }> = {
    player: { visible: false, dx: 0 },
    enemy: { visible: false, dx: 0 },
  };
  /** Party / setup.enemy index shown on each side. */
  readonly active: Record<Side, number | null> = { player: null, enemy: null };
  shadows: Record<Side, ShadowMon[]>;
  /** Animated HP numbers / bars. */
  readonly hpShown: Record<Side, number> = { player: 0, enemy: 0 };
  /** Animated total exp of the active player creature. */
  expShown = 0;
  /** Where the running exp fill is heading (it pauses at each level-up window). */
  expTarget = 0;
  readonly trainers: Record<Side, TrainerView | null>;
  /** Horizontal offset of a whole side (intro slide-in). */
  readonly layerDx: Record<Side, number> = { player: 0, enemy: 0 };
  /** Party indicator rows (trainer battle intro), hidden per side at that side's first send-out. */
  readonly balls: { visible: Record<Side, boolean>; dx: number } = { visible: { player: false, enemy: false }, dx: 0 };
  /** Thrown crystal; itemId picks its color (send-outs use the plain Fangkristall). */
  crystal: { x: number; y: number; tint: string | null; itemId: string } | null = null;
  /** The message box shows the "press A" arrow (final confirmation before the battle closes). */
  awaitingA = false;
  effects: Effect[] = [];
  readonly flash = { color: '#ffffff', alpha: 0 };
  /** 1 = screen covered by black bars (opening), 0 = open. */
  cover = 1;
  levelUp: LevelUpView | null = null;
  cmdCursor = 0;
  moveCursor = 0;
  private tasks: Task[] = [];
  private shakeLeft = 0;
  private shakeAmp = 0;
  private enterResolve: (() => void) | null = null;
  /** Resolves once the scene is on the stack. */
  readonly entered: Promise<void>;

  constructor(
    readonly g: GameContext,
    readonly setup: BattleSetup,
  ) {
    this.fxRng = createRng(g.rng.int(1, 2 ** 31 - 2));
    this.anims = g.state.options.battleAnims;
    this.shadows = { player: g.state.party.map(snapshot), enemy: setup.enemy.map(snapshot) };
    this.trainers = {
      player: { bitmap: playerBackPortrait(), dx: 0, visible: true },
      enemy: setup.trainer ? { bitmap: trainerPortrait(setup.trainer.sprite), dx: 0, visible: true } : null,
    };
    this.entered = new Promise((resolve) => (this.enterResolve = resolve));
  }

  onEnter(): void {
    this.enterResolve?.();
  }

  // --- timing primitives ---------------------------------------------------

  /** Frames scaled for test mode (very short animations). */
  dur(frames: number): number {
    return this.g.testMode ? Math.max(1, Math.round(frames / 8)) : frames;
  }

  /** Runs step once per frame until it returns a value. A throwing step rejects the promise. */
  until<T>(step: () => T | undefined): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push({
        step: () => {
          const r = step();
          if (r === undefined) return false;
          resolve(r);
          return true;
        },
        fail: reject,
      });
    });
  }

  /** Calls fn(t) with t from 0 to 1 over `frames` frames (frames already scaled by the caller). */
  tween(frames: number, fn: (t: number) => void): Promise<void> {
    const n = Math.max(1, Math.round(frames));
    let i = 0;
    fn(0);
    return this.until(() => {
      i++;
      fn(Math.min(1, i / n));
      return i >= n ? true : undefined;
    }).then(() => undefined);
  }

  wait(frames: number): Promise<void> {
    return this.tween(frames, () => {});
  }

  waitForA(): Promise<void> {
    const input = this.g.input;
    return this.until(() => (input.pressed('a') || input.pressed('b') ? true : undefined)).then(() => {
      this.g.audio.playSfx('confirm');
    });
  }

  add(effect: Effect): void {
    this.effects.push(effect);
  }

  shake(frames: number, amp = 2): void {
    if (!this.anims) return;
    this.shakeLeft = Math.max(this.shakeLeft, frames);
    this.shakeAmp = amp;
  }

  async flashScreen(color: string, alpha: number, frames: number): Promise<void> {
    this.flash.color = color;
    await this.tween(frames, (t) => (this.flash.alpha = alpha * (1 - t)));
    this.flash.alpha = 0;
  }

  // --- text & menus ----------------------------------------------------------

  /** Battle message. Auto-advances ~45 frames after it is fully shown unless waitForA; A skips ahead. */
  async say(text: string, waitForA: boolean): Promise<void> {
    this.bottom = { kind: 'message' };
    this.box.show(fmt(this.g.state, text), !waitForA);
    const input = this.g.input;
    let skipped = false;
    await this.until(() => {
      if (!waitForA && this.box.lastPageShown && input.pressed('a')) {
        skipped = true;
        this.box.finished = true;
      } else this.box.update(this.g);
      return this.box.finished ? true : undefined;
    });
    if (waitForA || skipped || this.g.testMode) return;
    let n = 0;
    await this.until(() => (++n >= AUTO_MSG_EXTRA || input.pressed('a') ? true : undefined));
  }

  /** Keeps the last message up with the "press A" arrow until A/B. */
  async confirmMessage(): Promise<void> {
    this.awaitingA = true;
    await this.waitForA();
    this.awaitingA = false;
  }

  /** KAMPF / BEUTEL / TEAM / FLUCHT → 0..3. */
  chooseCommand(name: string): Promise<number> {
    this.bottom = { kind: 'command', name };
    const input = this.g.input;
    return this.until(() => {
      this.cmdCursor = navigateGrid(this.g, this.cmdCursor, 4);
      if (input.pressed('a')) {
        this.g.audio.playSfx('confirm');
        return this.cmdCursor;
      }
      return undefined;
    });
  }

  /** Move index, or null on B. */
  chooseMove(moves: readonly MoveSlot[]): Promise<number | null> {
    this.bottom = { kind: 'moves', moves };
    this.moveCursor = Math.min(this.moveCursor, moves.length - 1);
    const input = this.g.input;
    return this.until<number | null>(() => {
      this.moveCursor = navigateGrid(this.g, this.moveCursor, moves.length);
      if (input.pressed('a')) {
        this.g.audio.playSfx('confirm');
        return this.moveCursor;
      }
      if (input.pressed('b')) {
        this.g.audio.playSfx('cancel');
        return null;
      }
      return undefined;
    });
  }

  async showLevelUp(view: Omit<LevelUpView, 'phase'>): Promise<void> {
    this.levelUp = { ...view, phase: 'delta' };
    await this.waitForA();
    this.levelUp = { ...view, phase: 'total' };
    await this.waitForA();
    this.levelUp = null;
  }

  // --- shadow state ------------------------------------------------------------

  /** Re-reads every creature (call when no events are pending, i.e. at prompts). */
  syncShadows(): void {
    this.shadows = { player: this.g.state.party.map(snapshot), enemy: this.setup.enemy.map(snapshot) };
    for (const side of ['player', 'enemy'] as const) {
      const m = this.shown(side);
      if (m) this.hpShown[side] = m.hp;
    }
    const p = this.shown('player');
    if (p) this.expShown = p.exp;
  }

  /** Shadow of the creature currently shown on a side. */
  shown(side: Side): ShadowMon | null {
    const i = this.active[side];
    return i === null ? null : (this.shadows[side][i] ?? null);
  }

  expFrac(): number {
    const i = this.active.player;
    const c = i === null ? undefined : this.g.state.party[i];
    const m = this.shown('player');
    if (!c || !m) return 0;
    return expProgress({ ...c, species: m.species, level: m.level, exp: this.expShown });
  }

  // --- Scene -------------------------------------------------------------------

  update(): void {
    const running = this.tasks;
    this.tasks = [];
    const left = running.filter((t) => {
      try {
        return !t.step();
      } catch (err) {
        t.fail(err);
        return false;
      }
    });
    this.tasks = [...left, ...this.tasks];
    this.effects = this.effects.filter((e) => e.update());
    if (this.shakeLeft > 0) this.shakeLeft--;
  }

  render(gfx: Gfx, g: GameContext): void {
    gfx.drawBitmap(backdrop(this.setup.background), 0, 0);
    const shaking = this.shakeLeft > 0;
    const sx = shaking ? (this.shakeLeft % 4 < 2 ? -this.shakeAmp : this.shakeAmp) : 0;
    const sy = shaking && this.shakeLeft % 3 === 0 ? 1 : 0;
    gfx.translated(sx, sy, () => {
      this.drawSide(gfx, 'enemy');
      this.drawSide(gfx, 'player');
      if (this.crystal) {
        const c = this.crystal;
        gfx.drawBitmap(crystalThrowIcon(c.itemId), c.x - 6, c.y - 6, { tint: c.tint ?? undefined });
      }
      for (const e of this.effects) e.render(gfx);
      this.drawHuds(gfx);
    });
    drawBottom(gfx, g, this);
    if (this.levelUp) drawLevelUp(gfx, this.levelUp);
    if (this.flash.alpha > 0) gfx.fillRect(0, 0, 240, BOX_Y, withAlpha(this.flash.color, this.flash.alpha));
    if (this.cover > 0) {
      const h = Math.round(80 * this.cover);
      gfx.fillRect(0, 0, 240, h, '#000000');
      gfx.fillRect(0, 160 - h, 240, h, '#000000');
    }
  }

  private drawSide(gfx: Gfx, side: Side): void {
    const dx = this.layerDx[side];
    const pp = platformPos(side);
    gfx.drawBitmap(platform(this.setup.background, side), pp.x + dx, pp.y);
    const a = ANCHOR[side];
    const t = this.trainers[side];
    if (t?.visible) gfx.drawBitmap(t.bitmap, a.x - t.bitmap.w / 2 + dx + t.dx, a.y - t.bitmap.h);
    const m = this.mons[side];
    if (!m.species || m.hidden || m.alpha <= 0 || m.scale <= 0) return;
    const sprite = creatureSprite(m.species, side === 'enemy' ? 'front' : 'back');
    const w = sprite.w * m.scale;
    const h = sprite.h * m.scale;
    const x = a.x - w / 2 + dx + m.dx;
    const y = a.y - h + m.dy + m.sink;
    const ground = side === 'enemy' ? a.y + 2 : BOX_Y;
    gfx.clipped(0, 0, 240, ground, () =>
      gfx.drawBitmap(sprite, x, y, { scale: m.scale, alpha: m.alpha, tint: m.tint ?? undefined }),
    );
  }

  private drawHuds(gfx: Gfx): void {
    const enemy = this.shown('enemy');
    if (enemy && this.hud.enemy.visible) drawEnemyHud(gfx, enemy, this.hpShown.enemy, this.hud.enemy.dx);
    const player = this.shown('player');
    if (player && this.hud.player.visible) drawPlayerHud(gfx, player, this.hpShown.player, this.expFrac(), this.hud.player.dx);
    if (this.balls.visible.enemy) drawPartyBalls(gfx, 'enemy', this.shadows.enemy, -this.balls.dx);
    if (this.balls.visible.player) drawPartyBalls(gfx, 'player', this.shadows.player, this.balls.dx);
  }
}
