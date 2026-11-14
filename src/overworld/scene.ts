/**
 * The overworld scene: map state, player control, NPC behaviour, step events and the script queue.
 * Everything that takes time (talks, warps, battles, trainer approaches) runs as a queued async task;
 * player input is blocked while a task runs or is pending. Drawing lives in render.ts.
 */
import type { GameContext, Gfx, MapDef, NpcDef, Scene, ScriptContext } from '../core/contracts';
import { TILE_META, type TileId } from '../core/tiles-meta';
import type { Dir, MusicId, SfxId } from '../core/types';
import { getFlag, trainerFlag } from '../state';
import { openStartMenu } from '../ui/screens';
import { MAPS, START } from '../world';
import { Actor, JUMP_FRAMES, Npc, RUN_FRAMES, WALK_FRAMES } from './actor';
import { pickUp, readSign, talkTo, trainerApproach, usePc, wildEncounter } from './events';
import { mapModel, type Exit, type MapModel } from './map-model';
import { BANNER_FRAMES, type Banner, drawOverworld } from './render';
import { connectionLanding, DIR_DELTA, DIRS, rollEncounter, sightDistance } from './rules';
import { createScriptContext, ScriptAbort } from './script';

/** Frames a freshly turned player waits before walking (tap = turn in place). */
const TURN_DELAY = 6;
const BUMP_SFX_EVERY = 24;
const DOOR_FADE = 16;
const EDGE_FADE = 8;

type Task = () => Promise<void>;
type GroundItem = NonNullable<MapDef['items']>[number];

export class OverworldScene implements Scene {
  readonly name = 'overworld';
  map!: MapDef;
  model!: MapModel;
  readonly player = new Actor('player', 0, 0, 'down');
  npcs: Npc[] = [];
  readonly ctx: ScriptContext;
  /** Area-name popup (outdoor maps only). */
  banner: Banner | null = null;
  /** Renders a black screen instead of the world (blackout). */
  curtain = false;
  private lastAreaName: string | null = null;
  /** Music set by a script (id null = silence) until the queue drains; null = map music. */
  private musicOverride: { id: MusicId | null } | null = null;
  /** START/A pressed during a step, handled when the step completes. */
  private pendingButton: 'start' | 'a' | null = null;
  private queue: Task[] = [];
  private running = false;
  private alive = false;
  private turnDelay = 0;
  private bumpCooldown = 0;

  constructor(readonly g: GameContext) {
    this.ctx = createScriptContext(this);
  }

  /** A script/transition is running or pending: no player control, no NPC idle moves. */
  get busy(): boolean {
    return this.running || this.queue.length > 0;
  }

  // --- scene lifecycle ------------------------------------------------------

  onEnter(): void {
    this.alive = true;
    const p = this.g.state.player;
    const pos = MAPS[p.mapId] ? p : START;
    this.loadMap(pos.mapId, pos.x, pos.y, pos.facing);
    this.entered();
  }

  onResume(): void {
    this.playMapMusic();
  }

  onExit(): void {
    this.alive = false;
    this.queue = [];
  }

  canAutosave(): boolean {
    return this.alive && !this.busy && !this.curtain && !this.player.moving;
  }

  update(): void {
    const stepped = this.player.update();
    let trainerStepped = false;
    for (const n of this.npcs) if (n.update() && n.def.trainer) trainerStepped = true;
    if (this.banner && this.g.frame - this.banner.start >= BANNER_FRAMES) this.banner = null;
    if (this.bumpCooldown > 0) this.bumpCooldown--;
    if (stepped) this.onPlayerStep();
    if (this.busy) {
      this.player.bumping = false;
      this.pendingButton = null;
      return;
    }
    if (trainerStepped && this.trainerCheck()) return;
    this.updateNpcs();
    this.handleInput(stepped);
  }

  render(gfx: Gfx, g: GameContext): void {
    drawOverworld(gfx, this, g.frame);
  }

  // --- map loading ----------------------------------------------------------

  loadMap(mapId: string, x: number, y: number, facing: Dir): void {
    const def = MAPS[mapId];
    if (!def) throw new Error(`Unknown map "${mapId}"`);
    this.map = def;
    this.model = mapModel(def);
    this.banner = null;
    this.player.place(x, y, facing);
    for (const n of this.npcs) n.stopPath();
    this.npcs = [];
    this.refreshNpcs();
    this.syncState();
    this.playMapMusic();
  }

  /** Call after a map became visible: area banner, onEnter script, trainer check. */
  entered(): void {
    if (this.map.kind !== 'indoor') {
      if (this.map.name !== this.lastAreaName) this.banner = { text: this.map.name, start: this.g.frame };
      this.lastAreaName = this.map.name;
    }
    const onEnter = this.map.onEnter;
    if (onEnter) this.enqueue(() => onEnter(this.ctx));
    else this.trainerCheck();
  }

  /** Fade transition to another map (warps, doors, connections, scripts). */
  async transition(mapId: string, x: number, y: number, facing: Dir, frames = DOOR_FADE, sfx?: SfxId): Promise<void> {
    if (!MAPS[mapId]) throw new Error(`${this.map.id}: warp to unknown map "${mapId}"`);
    if (sfx) this.g.audio.playSfx(sfx);
    await this.g.fadeOut(frames);
    this.loadMap(mapId, x, y, facing);
    await this.g.fadeIn(frames);
    this.entered();
  }

  refreshNpcs(): void {
    const s = this.g.state;
    const existing = new Map(this.npcs.map((n) => [n.id, n]));
    this.npcs = (this.map.npcs ?? [])
      .filter((d: NpcDef) => d.visible?.(s) ?? true)
      .map((d) => existing.get(d.id) ?? this.spawnNpc(d));
    // hidden NPCs: end their scripted walks so scripts awaiting moveNpc continue
    for (const n of existing.values()) if (!this.npcs.includes(n)) n.stopPath();
  }

  private spawnNpc(def: NpcDef): Npc {
    const n = new Npc(def);
    n.timer = this.g.rng.int(30, 120);
    return n;
  }

  /** Copies the player's map position into the save state. */
  syncState(): void {
    const s = this.g.state.player;
    s.mapId = this.map.id;
    s.x = this.player.x;
    s.y = this.player.y;
    s.facing = this.player.facing;
  }

  // --- music ----------------------------------------------------------------

  /** Script music (null = silence) lasts until the queue drains. */
  setMusicOverride(id: MusicId | null): void {
    this.musicOverride = { id };
    this.g.audio.playMusic(id);
  }

  private playMapMusic(): void {
    const id = this.musicOverride ? this.musicOverride.id : this.map.music;
    if (this.g.audio.currentMusic() !== id) this.g.audio.playMusic(id);
  }

  // --- script queue -----------------------------------------------------------

  enqueue(task: Task): void {
    this.queue.push(task);
    this.pump();
  }

  private pump(): void {
    if (this.running || !this.alive) return;
    const task = this.queue.shift();
    if (!task) return;
    this.running = true;
    this.player.bumping = false;
    Promise.resolve()
      .then(task)
      .catch((err: unknown) => {
        if (err instanceof ScriptAbort) return;
        console.error(err);
        // Surface to the game's error reporter (unhandledrejection) without stopping the overworld.
        void Promise.reject(err);
      })
      .finally(() => {
        this.running = false;
        if (this.queue.length) this.pump();
        else this.drained();
      });
  }

  private drained(): void {
    if (!this.alive) return;
    this.refreshNpcs();
    if (this.musicOverride) {
      this.musicOverride = null;
      this.playMapMusic();
    }
    this.trainerCheck();
  }

  // --- queries ----------------------------------------------------------------

  findNpc(id: string): Npc | null {
    return this.npcs.find((n) => n.id === id) ?? null;
  }

  npcAt(x: number, y: number): Npc | null {
    return this.npcs.find((n) => n.occupies(x, y)) ?? null;
  }

  itemAt(x: number, y: number): GroundItem | null {
    const s = this.g.state;
    return this.map.items?.find((i) => i.x === x && i.y === y && !getFlag(s, i.flag)) ?? null;
  }

  private blockedForPlayer(x: number, y: number): boolean {
    return this.model.isSolid(x, y) || this.npcAt(x, y) !== null || this.itemAt(x, y) !== null;
  }

  private npcCanEnter(x: number, y: number): boolean {
    return !this.blockedForPlayer(x, y) && !this.player.occupies(x, y) && this.model.exitAt(x, y) === null;
  }

  // --- player control ---------------------------------------------------------

  private handleInput(continuing: boolean): void {
    const input = this.g.input;
    const p = this.player;
    if (input.pressed('start')) this.pendingButton = 'start';
    else if (input.pressed('a') && this.pendingButton !== 'start') this.pendingButton = 'a';
    if (p.moving) return;
    const button = this.pendingButton;
    this.pendingButton = null;
    if (button === 'start') {
      p.bumping = false;
      this.g.audio.playSfx('menu_open');
      this.enqueue(() => openStartMenu(this.g));
      return;
    }
    if (button === 'a' && this.interact()) return;
    const dir = input.heldDir();
    if (!dir) {
      p.bumping = false;
      this.turnDelay = 0;
      return;
    }
    if (dir !== p.facing && !continuing && !p.bumping) {
      p.facing = dir;
      this.turnDelay = TURN_DELAY;
      this.syncState();
      return;
    }
    if (this.turnDelay > 0) {
      this.turnDelay--;
      return;
    }
    this.tryMove(dir, input.held('b'));
  }

  private tryMove(dir: Dir, run: boolean): void {
    const p = this.player;
    const { dx, dy } = DIR_DELTA[dir];
    const nx = p.x + dx;
    const ny = p.y + dy;
    p.facing = dir;
    if (!this.model.inBounds(nx, ny)) {
      if (!this.tryConnection(dir)) this.bump();
      return;
    }
    if (dir === 'down' && this.model.isLedge(nx, ny)) {
      if (this.blockedForPlayer(p.x, p.y + 2)) this.bump();
      else {
        p.startMove('down', JUMP_FRAMES, 2);
        this.g.audio.playSfx('ledge');
      }
      return;
    }
    if (this.blockedForPlayer(nx, ny)) {
      this.bump();
      return;
    }
    p.startMove(dir, run ? RUN_FRAMES : WALK_FRAMES);
  }

  private bump(): void {
    this.player.bumping = true;
    this.syncState();
    if (this.bumpCooldown > 0) return;
    this.g.audio.playSfx('bump');
    this.bumpCooldown = BUMP_SFX_EVERY;
  }

  private tryConnection(dir: Dir): boolean {
    const conn = this.map.connections?.[dir];
    const target = conn ? MAPS[conn.map] : undefined;
    if (!conn || !target) return false;
    const p = this.player;
    const land = connectionLanding(dir, p.x, p.y, conn, mapModel(target));
    if (!this.landingFree(target, land.x, land.y)) return false;
    this.enqueue(() => this.transition(target.id, land.x, land.y, dir, EDGE_FADE));
    return true;
  }

  /** Walkable and not taken by a visible NPC or an untaken ground item of the (not yet loaded) target map. */
  private landingFree(target: MapDef, x: number, y: number): boolean {
    const s = this.g.state;
    if (mapModel(target).isSolid(x, y)) return false;
    const npc = target.npcs?.some((n) => n.x === x && n.y === y && (n.visible?.(s) ?? true));
    const item = target.items?.some((i) => i.x === x && i.y === y && !getFlag(s, i.flag));
    return !npc && !item;
  }

  /** A in front of something. Returns true if something was triggered. */
  private interact(): boolean {
    const p = this.player;
    const { dx, dy } = DIR_DELTA[p.facing];
    const fx = p.x + dx;
    const fy = p.y + dy;
    const front: TileId | null = this.model.tile(fx, fy);
    let npc = this.npcAt(fx, fy);
    if (!npc && front && TILE_META[front].counter) npc = this.npcAt(fx + dx, fy + dy);
    if (npc) {
      if (npc.moving) return false;
      const target = npc;
      this.enqueue(() => talkTo(this, target));
      return true;
    }
    const item = this.itemAt(fx, fy);
    if (item) {
      this.enqueue(() => pickUp(this, item));
      return true;
    }
    const sign = this.map.signs?.find((s) => s.x === fx && s.y === fy);
    if (sign) {
      this.enqueue(() => readSign(this, sign.text));
      return true;
    }
    const s = this.g.state;
    const hidden = this.map.hiddenItems?.find((h) => h.x === fx && h.y === fy && !getFlag(s, h.flag));
    if (hidden) {
      this.enqueue(() => pickUp(this, hidden));
      return true;
    }
    if (front === 'pc') {
      this.enqueue(() => usePc(this));
      return true;
    }
    return false;
  }

  // --- step events ------------------------------------------------------------

  private onPlayerStep(): void {
    const p = this.player;
    const s = this.g.state;
    this.syncState();
    const exit = this.model.exitAt(p.x, p.y);
    if (exit) {
      this.enqueue(() => this.useExit(exit));
      return;
    }
    const tile = this.model.tile(p.x, p.y);
    if (!tile) return;
    if (TILE_META[tile].tall) this.g.audio.playSfx('grass');
    const repelEnded = this.repelStep();
    const trigger = this.map.triggers?.find(
      (t) => p.x >= t.x && p.x < t.x + (t.w ?? 1) && p.y >= t.y && p.y < t.y + (t.h ?? 1) && (t.when?.(s) ?? true),
    );
    if (trigger) {
      this.enqueue(() => trigger.script(this.ctx));
      return;
    }
    if (this.trainerCheck() || repelEnded) return;
    this.encounterCheck(tile);
  }

  private useExit(exit: Exit): Promise<void> {
    const sfx = this.model.tile(exit.x, exit.y) === 'stairs' ? 'stairs' : 'door';
    return this.transition(exit.to, exit.tx, exit.ty, exit.facing ?? this.player.facing, DOOR_FADE, sfx);
  }

  /** Counts down an active repel; returns true on the step it runs out (message queued). */
  private repelStep(): boolean {
    const s = this.g.state;
    if (s.repelSteps <= 0) return false;
    s.repelSteps--;
    if (s.repelSteps > 0) return false;
    // neutral wording: both Arvenduft and Arvenessenz set repelSteps
    this.enqueue(() => this.g.ui.message('Der Schutzduft ist verflogen.'));
    return true;
  }

  private encounterCheck(tile: TileId): void {
    const kind = TILE_META[tile].encounter;
    const table = kind ? this.map.encounters?.[kind] : undefined;
    const s = this.g.state;
    const lead = s.party[0];
    if (!table || !lead) return;
    const pick = rollEncounter(table, this.g.rng, s.repelSteps > 0 ? lead.level : null);
    if (pick) this.enqueue(() => wildEncounter(this, pick.species, pick.level));
  }

  /** Starts the approach of the first undefeated trainer that sees the player. */
  private trainerCheck(): boolean {
    const s = this.g.state;
    const p = this.player;
    if (this.busy || p.moving || s.party.length === 0) return false;
    for (const n of this.npcs) {
      const tr = n.def.trainer;
      if (!tr || n.busy || getFlag(s, trainerFlag(tr.id))) continue;
      const blocked = (x: number, y: number) =>
        this.model.blocksSight(x, y, n.facing) || this.npcAt(x, y) !== null || this.itemAt(x, y) !== null;
      const dist = sightDistance(n, tr.sight, p, blocked);
      if (dist === null) continue;
      this.enqueue(() => trainerApproach(this, n, dist));
      return true;
    }
    return false;
  }

  // --- NPC idle behaviour -------------------------------------------------------

  private updateNpcs(): void {
    let turned = false;
    for (const n of this.npcs) {
      const mode = n.def.movement ?? 'static';
      if (mode === 'static' || n.busy || --n.timer > 0) continue;
      n.timer = this.g.rng.int(60, 180);
      const dir = this.g.rng.pick(DIRS);
      if (mode === 'turn') {
        turned ||= n.facing !== dir && n.def.trainer !== undefined;
        n.facing = dir;
        continue;
      }
      const { dx, dy } = DIR_DELTA[dir];
      const nx = n.x + dx;
      const ny = n.y + dy;
      const nearHome = Math.abs(nx - n.def.x) <= 2 && Math.abs(ny - n.def.y) <= 2;
      if (nearHome && this.npcCanEnter(nx, ny)) n.startMove(dir, WALK_FRAMES);
      else n.facing = dir;
    }
    if (turned) this.trainerCheck();
  }
}
