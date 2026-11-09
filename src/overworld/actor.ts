/** A character on the map (player or NPC): tile position, facing, step animation, scripted paths, emotes. */
import type { NpcDef } from '../core/contracts';
import type { CharSpriteId, Dir } from '../core/types';
import { DIR_DELTA } from './rules';

export const TILE = 16;
export const WALK_FRAMES = 16;
export const RUN_FRAMES = 8;
/** A ledge hop covers 2 tiles. */
export const JUMP_FRAMES = 32;
const JUMP_HEIGHT = 10;
export const EMOTE_FRAMES = 40;

export type EmoteKind = 'exclaim' | 'question' | 'heart';

/** One scripted move: `tiles` > 1 is a ledge hop. */
export interface PathStep {
  dir: Dir;
  frames: number;
  tiles: number;
}

/** Sprites that never turn to face the player. */
const OBJECT_SPRITES: ReadonlySet<CharSpriteId> = new Set<CharSpriteId>(['item_ball', 'crystal', 'boulder', 'legend']);

export function isObjectSprite(id: CharSpriteId): boolean {
  return OBJECT_SPRITES.has(id);
}

export class Actor {
  /** Logical tile. While moving this is already the destination (reserved). */
  x: number;
  y: number;
  facing: Dir;
  fromX: number;
  fromY: number;
  private t = 0;
  private dur = 0;
  jumping = false;
  /** Alternates step A / step B. */
  private parity = false;
  /** Walking in place against an obstacle (player only). */
  bumping = false;
  emote: { kind: EmoteKind; frames: number } | null = null;
  private path: PathStep[] = [];
  private pathDone: (() => void) | null = null;

  constructor(
    readonly sprite: CharSpriteId,
    x: number,
    y: number,
    facing: Dir,
  ) {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    this.facing = facing;
  }

  get moving(): boolean {
    return this.dur > 0;
  }

  /** Moving or still walking a scripted path. */
  get busy(): boolean {
    return this.moving || this.path.length > 0 || this.pathDone !== null;
  }

  /** Teleports (warps, map loads). Ends any scripted walk (its promise resolves) and emote. */
  place(x: number, y: number, facing?: Dir): void {
    this.x = this.fromX = x;
    this.y = this.fromY = y;
    if (facing) this.facing = facing;
    this.dur = this.t = 0;
    this.jumping = false;
    this.bumping = false;
    this.emote = null;
    this.stopPath();
  }

  /** Drops the rest of a scripted walk and resolves its promise. */
  stopPath(): void {
    this.path = [];
    const done = this.pathDone;
    this.pathDone = null;
    done?.();
  }

  startMove(dir: Dir, frames: number, tiles = 1): void {
    const { dx, dy } = DIR_DELTA[dir];
    this.facing = dir;
    this.fromX = this.x;
    this.fromY = this.y;
    this.x += dx * tiles;
    this.y += dy * tiles;
    this.t = 0;
    this.dur = frames;
    this.jumping = tiles > 1;
    this.parity = !this.parity;
    this.bumping = false;
  }

  /** Scripted walk (no collision checks). Resolves when the whole path is walked. */
  walkPath(dirs: readonly Dir[], frames = WALK_FRAMES): Promise<void> {
    return this.followPath(dirs.map((dir) => ({ dir, frames, tiles: 1 })));
  }

  /** Scripted moves incl. ledge hops (no collision checks). Resolves when all steps are done. */
  followPath(steps: readonly PathStep[]): Promise<void> {
    this.stopPath();
    this.path = [...steps];
    return new Promise((resolve) => {
      this.pathDone = resolve;
      if (!this.moving) this.nextPathStep();
    });
  }

  /**
   * Advances one frame. Returns true on the frame a free (non-scripted) move completes.
   * Scripted path steps chain seamlessly and resolve their promise at the end.
   */
  update(): boolean {
    if (this.emote && --this.emote.frames <= 0) this.emote = null;
    if (!this.moving) return false;
    if (++this.t < this.dur) return false;
    this.dur = this.t = 0;
    this.jumping = false;
    this.fromX = this.x;
    this.fromY = this.y;
    if (this.pathDone) {
      this.nextPathStep();
      return false;
    }
    return true;
  }

  private nextPathStep(): void {
    const step = this.path.shift();
    if (step) this.startMove(step.dir, step.frames, step.tiles);
    else this.stopPath();
  }

  /** Occupies (x, y): either its tile or, while moving, the tile it comes from. */
  occupies(x: number, y: number): boolean {
    return (this.x === x && this.y === y) || (this.moving && this.fromX === x && this.fromY === y);
  }

  /** Top-left pixel of the actor's tile cell in map space (interpolated while moving). */
  pixelX(): number {
    return this.moving ? (this.fromX + ((this.x - this.fromX) * this.t) / this.dur) * TILE : this.x * TILE;
  }

  pixelY(): number {
    return this.moving ? (this.fromY + ((this.y - this.fromY) * this.t) / this.dur) * TILE : this.y * TILE;
  }

  /** Height above the ground during a ledge hop. */
  lift(): number {
    return this.jumping ? Math.round(Math.sin((Math.PI * this.t) / this.dur) * JUMP_HEIGHT) : 0;
  }

  /** Walk-cycle frame: 0 stand, 1 step A, 2 step B. */
  frame(clock: number): 0 | 1 | 2 {
    const step = (p: boolean): 1 | 2 => (p ? 1 : 2);
    if (this.moving) return this.t / this.dur < 0.5 && !this.jumping ? step(this.parity) : 0;
    if (this.bumping) return ([1, 0, 2, 0] as const)[Math.floor(clock / 10) % 4]!;
    return 0;
  }
}

/** An NPC instance on the current map. */
export class Npc extends Actor {
  /** Frames until the next idle action (turn / wander). */
  timer: number;

  constructor(readonly def: NpcDef) {
    super(def.sprite, def.x, def.y, def.facing);
    this.timer = 60;
  }

  get id(): string {
    return this.def.id;
  }

  get isObject(): boolean {
    return isObjectSprite(this.def.sprite);
  }
}
