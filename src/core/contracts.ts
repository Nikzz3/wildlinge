/** Interfaces between engine, UI, audio, overworld, world scripts and battle. */
import type { Bitmap } from './bitmap';
import type { Rng } from './rng';
import type { TileId } from './tiles-meta';
import type {
  BattleBg, BattleOutcome, BattleStat, BuildingStyle, CharSpriteId, Creature, Dir, JingleId, MusicId, SaveData,
  SfxId, Stats, StatusId, TrainerDef,
} from './types';

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select';

export interface Input {
  /** Button is currently held down. */
  held(b: Button): boolean;
  /** Button went down this frame. */
  pressed(b: Button): boolean;
  /** pressed() or auto-repeat while held (after 18 frames, every 5) — use for menu cursors. */
  repeat(b: Button): boolean;
  /** Currently held direction (most recently pressed wins) or null. */
  heldDir(): Dir | null;
  /** Clears all edge states (call after closing a menu so the closing press doesn't leak). */
  consume(): void;
}

export interface TextOpts {
  color?: string;
  /** Shadow color (drawn 1px right and 1px down). null = no shadow. Default: light shadow. */
  shadow?: string | null;
  align?: 'left' | 'center' | 'right';
}

export interface DrawOpts {
  flipX?: boolean;
  /** 0..1 */
  alpha?: number;
  /** Integer-ish scale factor (nearest neighbour). */
  scale?: number;
  /** Source rectangle within the bitmap. */
  src?: { x: number; y: number; w: number; h: number };
  /** Draw every opaque pixel in this color (silhouette / flash effects). */
  tint?: string;
}

export interface Gfx {
  readonly width: number; // 240
  readonly height: number; // 160
  /** Height of one text line in pixels (16). Glyphs are ~11px tall incl. descenders. */
  readonly lineHeight: number;
  clear(color: string): void;
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
  /** 1px rectangle outline. */
  strokeRect(x: number, y: number, w: number, h: number, color: string): void;
  drawBitmap(b: Bitmap, x: number, y: number, opts?: DrawOpts): void;
  /** Single line of text; (x, y) is the top-left of the line box. Text may contain umlauts. */
  drawText(text: string, x: number, y: number, opts?: TextOpts): void;
  measureText(text: string): number;
  /** Greedy word wrap into lines no wider than maxWidth. Respects '\n'. */
  wrapText(text: string, maxWidth: number): string[];
  /** Standard framed window (see style guide). 'dark' = dark fill for battle/command boxes. */
  drawWindow(x: number, y: number, w: number, h: number, style?: 'light' | 'dark'): void;
  /** Horizontal bar: background track + filled fraction (0..1) in color. */
  drawBar(x: number, y: number, w: number, h: number, frac: number, color: string, track?: string): void;
  /** HP bar color by fraction: green > 50%, yellow > 20%, red otherwise. */
  hpColor(frac: number): string;
  /** Fills the whole screen with color at alpha (fades, flashes). */
  overlay(color: string, alpha: number): void;
  /** Runs fn with a translated origin (camera / shake). Nested calls accumulate. */
  translated(dx: number, dy: number, fn: () => void): void;
  /** Runs fn clipped to the rectangle. */
  clipped(x: number, y: number, w: number, h: number, fn: () => void): void;
}

export interface Scene {
  /** Debug name, e.g. 'overworld', 'battle', 'message'. */
  readonly name: string;
  /** If true, the scene below is rendered first (dialogs, menus over the world). */
  readonly overlay?: boolean;
  /** Called at 60 Hz, only for the top scene. */
  update(g: GameContext): void;
  render(gfx: Gfx, g: GameContext): void;
  onEnter?(g: GameContext): void;
  /** Called when a scene above this one was removed and this is the top again. */
  onResume?(g: GameContext): void;
  onExit?(g: GameContext): void;
  /** True while the scene is at rest and the game may autosave (asked only when it is the only scene). */
  canAutosave?(): boolean;
}

export interface GameContext {
  readonly input: Input;
  readonly audio: AudioApi;
  readonly ui: UiApi;
  readonly rng: Rng;
  /** Frames since boot. */
  readonly frame: number;
  /** ?test=1 — instant text, fixed seed, short transitions. */
  readonly testMode: boolean;
  /** The live save state. Replaced on new game / load. */
  state: SaveData;
  push(scene: Scene): void;
  /** Removes the given scene (default: the top scene). */
  pop(scene?: Scene): void;
  replace(scene: Scene): void;
  /** Clears the stack and pushes scene. */
  reset(scene: Scene): void;
  /** Read-only view of the stack (bottom → top). */
  readonly stack: readonly Scene[];
  /**
   * Pushes the scene created by `make` and resolves with the value passed to `close`.
   * `close` also removes the scene. This is how every modal UI is built.
   */
  open<T>(make: (close: (result: T) => void) => Scene): Promise<T>;
  /** Fade the whole screen to `color` (default black). Stays covered until fadeIn(). */
  fadeOut(frames?: number, color?: string): Promise<void>;
  fadeIn(frames?: number): Promise<void>;
  /** Resolves after n frames (counted by the main loop, independent of scenes). */
  wait(frames: number): Promise<void>;
  /** Persist state to disk/localStorage. */
  save(): void;
  hasSave(): boolean;
  /** Loads the save into `state`; returns false if none. */
  load(): boolean;
  /** The stored save as JSON, for copying it to another machine (null if there is none). */
  exportSave(): string | null;
  /** Replaces the stored save with an imported one and loads it into `state`. False if writing failed. */
  importSave(data: SaveData): boolean;
}

// ---------------------------------------------------------------------------
// UI (engine/ui.ts) — modal helpers available as g.ui
// ---------------------------------------------------------------------------

export interface MessageOpts {
  /** Do not wait for A on the last page; resolve once the text is fully shown (+ short pause). */
  auto?: boolean;
}

export interface MenuOpts {
  x?: number;
  y?: number;
  /** Fixed width; default auto from the longest option. */
  width?: number;
  initial?: number;
  /** Value returned when B is pressed. Default -1. Use null to make the menu non-cancelable. */
  cancel?: number | null;
}

export interface UiApi {
  /** Bottom dialog box with typewriter text, auto-wrap and paging (2 lines/page; '\n' forces a break; '\f' forces a new page). Substitutes {PLAYER}/{RIVAL}. */
  message(text: string, opts?: MessageOpts): Promise<void>;
  /** Shows text in the dialog box, then a choice menu above its right side. Returns the index (cancel → opts.cancel ?? last index). */
  ask(text: string, options: readonly string[], opts?: MenuOpts): Promise<number>;
  /** Ja/Nein. B = Nein. */
  confirm(text: string): Promise<boolean>;
  /** A free-standing vertical menu. */
  menu(options: readonly string[], opts?: MenuOpts): Promise<number>;
  /** Quantity selector 1..max (up/down ±1, left/right ±10). Shows total price if unitPrice given. null = canceled. */
  quantity(max: number, opts?: { unitPrice?: number; x?: number; y?: number }): Promise<number | null>;
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export interface AudioApi {
  /** Starts a looping track. No-op if the same track is already playing. null = silence. */
  playMusic(id: MusicId | null): void;
  currentMusic(): MusicId | null;
  /** Plays a short jingle, pausing the music; music resumes afterwards. Resolves when finished. */
  playJingle(id: JingleId): Promise<void>;
  playSfx(id: SfxId): void;
  /** Procedural creature cry derived from the species id. */
  playCry(speciesId: string, opts?: { pitch?: number; faint?: boolean }): void;
  setVolumes(music: number, sfx: number): void;
  /** Resume the AudioContext; call on the first user gesture. */
  unlock(): void;
}

// ---------------------------------------------------------------------------
// World / maps (src/world) and scripting (src/overworld)
// ---------------------------------------------------------------------------

export type Script = (ctx: ScriptContext) => Promise<void>;
export type Cond = (s: SaveData) => boolean;

export interface NpcDef {
  /** Unique within the map. */
  id: string;
  x: number;
  y: number;
  facing: Dir;
  sprite: CharSpriteId;
  /** 'wander' walks randomly within 2 tiles of its origin, 'turn' looks around. Default 'static'. */
  movement?: 'static' | 'wander' | 'turn';
  /** Simple dialog when no onTalk script is given (multiple strings = multiple messages). */
  text?: string | readonly string[];
  onTalk?: Script;
  /** Line-of-sight trainer. Defeated flag is `trainer:<trainerId>`. */
  trainer?: { id: string; sight: number };
  /** NPC exists only while this returns true (evaluated on map load and after scripts). */
  visible?: Cond;
}

export interface WarpDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  /** Facing after arrival; default keeps the current facing. */
  facing?: Dir;
}

export interface BuildingDef {
  /** Top-left tile of the footprint. */
  x: number;
  y: number;
  /** Footprint size in tiles (w ≥ 3, h ≥ 3). Whole footprint is solid except the door tile. */
  w: number;
  h: number;
  style: BuildingStyle;
  /** Door on the bottom row at column x + dx; entering warps to `to` at (tx, ty). */
  door: { dx: number; to: string; tx: number; ty: number };
}

export interface MapConnection {
  map: string;
  /** Coordinate shift along the shared edge: targetX = x + offset (north/south) or targetY = y + offset (east/west). */
  offset: number;
}

export interface EncounterSlot {
  species: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

export interface EncounterTable {
  /** Probability per step on an encounter tile (0.05..0.2). */
  rate: number;
  slots: readonly EncounterSlot[];
}

export interface MapDef {
  id: string;
  /** German display name shown in the area popup, e.g. "Moosbach", "Pfad 1". */
  name: string;
  kind: 'town' | 'route' | 'indoor' | 'cave';
  music: MusicId;
  battleBg: BattleBg;
  /** Rows of legend characters; all rows have equal length. */
  tiles: readonly string[];
  /** Extra/overriding legend entries for this map. */
  legend?: Readonly<Record<string, TileId>>;
  /** Tile drawn outside the map. */
  border: TileId;
  /** Tile drawn beneath objects/buildings and used as underlay for transparent tiles. Default 'grass' outdoors, 'floor_wood' indoors. */
  baseTile?: TileId;
  warps?: readonly WarpDef[];
  buildings?: readonly BuildingDef[];
  connections?: Partial<Record<Dir, MapConnection>>;
  npcs?: readonly NpcDef[];
  signs?: readonly { x: number; y: number; text: string }[];
  /** Step triggers. Rectangle defaults to 1×1. */
  triggers?: readonly { x: number; y: number; w?: number; h?: number; when?: Cond; script: Script }[];
  /** Visible pickups. `flag` is set when taken. */
  items?: readonly { x: number; y: number; item: string; qty?: number; flag: string }[];
  /** Hidden pickups found by pressing A while facing the tile. */
  hiddenItems?: readonly { x: number; y: number; item: string; qty?: number; flag: string }[];
  encounters?: { grass?: EncounterTable; cave?: EncounterTable };
  /** Runs every time the map is entered (after the fade-in). */
  onEnter?: Script;
  /** Interior is a Heilstation: talking to the nurse sets lastHeal here. */
  isHealCenter?: boolean;
}

export interface ScriptContext {
  readonly g: GameContext;
  readonly state: SaveData;
  readonly mapId: string;
  say(text: string): Promise<void>;
  ask(text: string, options: readonly string[]): Promise<number>;
  confirm(text: string): Promise<boolean>;
  flag(name: string): boolean;
  setFlag(name: string, value?: boolean): void;
  /** Gives an item with a message + jingle ("{PLAYER} erhält 3× Heiltrank!"). */
  giveItem(itemId: string, qty?: number): Promise<void>;
  takeItem(itemId: string, qty?: number): boolean;
  hasItem(itemId: string, qty?: number): boolean;
  /** Creates a creature and adds it to party (or box), marks Lexikon caught, message + jingle, optional nickname prompt. */
  giveCreature(speciesId: string, level: number, opts?: { nickname?: boolean; moves?: string[] }): Promise<void>;
  giveMoney(amount: number): void;
  takeMoney(amount: number): boolean;
  giveBadge(badgeId: string, label: string): Promise<void>;
  /** Heal party with fade + jingle and set lastHeal to the current map position. */
  heal(): Promise<void>;
  /** Trainer battle. Returns true if the player won. On loss without allowLoss: blackout and the script aborts. */
  battle(trainerId: string, opts?: { allowLoss?: boolean }): Promise<boolean>;
  /** Static wild encounter (e.g. legendary). */
  wildBattle(speciesId: string, level: number, opts?: { canRun?: boolean; music?: MusicId }): Promise<BattleOutcome>;
  /** Warp with fade. */
  warp(mapId: string, x: number, y: number, facing?: Dir): Promise<void>;
  /** Walk an NPC along a path, e.g. 'UULLD' (U/D/L/R). Resolves when done. */
  moveNpc(npcId: string, path: string): Promise<void>;
  movePlayer(path: string): Promise<void>;
  faceNpc(npcId: string, dir: Dir): void;
  /** Turns the NPC to face the player. */
  npcFacePlayer(npcId: string): void;
  facePlayer(dir: Dir): void;
  /** Re-evaluates NpcDef.visible for all NPCs (call after changing flags). */
  refreshNpcs(): void;
  /** Shows an emote bubble above an NPC or the player for ~40 frames. */
  emote(target: string | 'player', kind: 'exclaim' | 'question' | 'heart'): Promise<void>;
  wait(frames: number): Promise<void>;
  playMusic(id: MusicId | null): void;
  playSfx(id: SfxId): void;
  jingle(id: JingleId): Promise<void>;
  shop(itemIds: readonly string[]): Promise<void>;
  pc(): Promise<void>;
  /** Plays the ending and credits, then returns to the title screen. */
  credits(): Promise<void>;
  readonly player: { readonly x: number; readonly y: number; readonly facing: Dir };
  npcPos(npcId: string): { x: number; y: number; facing: Dir } | null;
}

// ---------------------------------------------------------------------------
// Battle (src/battle)
// ---------------------------------------------------------------------------

export interface BattleSetup {
  kind: 'wild' | 'trainer';
  /** Enemy party (created by the caller). Wild battles: exactly one. */
  enemy: Creature[];
  trainer?: TrainerDef;
  /** Losing does not cause a blackout (scripted rival battle). */
  allowLoss?: boolean;
  /** Default true for wild, false for trainer. */
  canRun?: boolean;
  background: BattleBg;
  /** Override music; default by kind/trainer. */
  music?: MusicId;
}

export type Side = 'player' | 'enemy';

/** Events emitted by the pure battle engine and animated by the battle scene, in order. */
export type BattleEvent =
  | { t: 'msg'; text: string }
  /** A creature enters the field. partyIndex refers to state.party (player) or setup.enemy (enemy). */
  | { t: 'sendOut'; side: Side; partyIndex: number }
  | { t: 'withdraw'; side: Side }
  /** Attacker uses a move — play its animation (after the "X setzt Y ein!" msg). miss: it missed (dodge + miss sfx, no hit). */
  | { t: 'move'; side: Side; moveId: string; miss?: boolean }
  /** HP of `side` changes from → to. effectiveness: 0, 0.25, 0.5, 1, 2, 4 (only on move damage). */
  | { t: 'hp'; side: Side; from: number; to: number; max: number; effectiveness?: number; crit?: boolean }
  | { t: 'status'; side: Side; status: StatusId | null }
  | { t: 'stat'; side: Side; stat: BattleStat; stages: number }
  | { t: 'faint'; side: Side }
  /** Player creature exp changes (absolute totals). A 'levelUp' follows if a level threshold was crossed. */
  | { t: 'exp'; partyIndex: number; from: number; to: number }
  | { t: 'levelUp'; partyIndex: number; level: number; before: Stats; after: Stats }
  | { t: 'throw'; itemId: string; shakes: 0 | 1 | 2 | 3; caught: boolean }
  | { t: 'money'; amount: number }
  | { t: 'end'; outcome: BattleOutcome };

export type PlayerAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; partyIndex: number }
  /** partyIndex = target for healing items; omitted for crystals. */
  | { kind: 'item'; itemId: string; partyIndex?: number }
  | { kind: 'run' };

export type BattlePrompt =
  | { kind: 'action' }
  /** Active player creature fainted; choose a healthy replacement. */
  | { kind: 'switch' }
  /** Creature at partyIndex wants to learn moveId but knows 4 moves: forget index 0..3 or null to skip. */
  | { kind: 'learn'; partyIndex: number; moveId: string }
  | { kind: 'done'; outcome: BattleOutcome };

export interface BattleEngine {
  readonly setup: BattleSetup;
  /** Index into state.party of the active player creature. */
  readonly playerActive: number;
  /** Index into setup.enemy of the active enemy creature. */
  readonly enemyActive: number;
  readonly prompt: BattlePrompt;
  /** Uids of player creatures that gained a level during this battle (evolution candidates). */
  readonly leveledUp: ReadonlySet<number>;
  /** Current stat stages of a side's active creature. */
  stages(side: Side): Readonly<Record<BattleStat, number>>;
  /** Intro events (appearance / trainer sends out / player sends out). Call once. */
  start(): BattleEvent[];
  /** Returns a German reason if the action is not allowed right now (e.g. "Keine EN mehr!"), else null. */
  validate(action: PlayerAction): string | null;
  /** prompt.kind === 'action'. Resolves a full turn (or until the next prompt). */
  act(action: PlayerAction): BattleEvent[];
  /** prompt.kind === 'switch'. */
  switchTo(partyIndex: number): BattleEvent[];
  /** prompt.kind === 'learn'. */
  learn(forgetIndex: number | null): BattleEvent[];
}

// ---------------------------------------------------------------------------
// Font (src/art/font.ts → engine text rendering)
// ---------------------------------------------------------------------------

export interface FontGlyph {
  /** Advance width in pixels (without spacing). */
  w: number;
  /** FontDef.height rows of '#' (ink) and '.' (empty); each row has length w. */
  rows: readonly string[];
}

export interface FontDef {
  /** Rows per glyph (cap height + descender), e.g. 12. */
  height: number;
  /** Pixels between glyphs. */
  spacing: number;
  /** Advance width of ' '. */
  spaceWidth: number;
  /** Must cover printable ASCII, ÄÖÜäöüß, é, and the symbols '…', '▶', '▼', '×', '♪'. */
  glyphs: Readonly<Record<string, FontGlyph>>;
}
