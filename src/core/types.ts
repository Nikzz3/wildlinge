/** Core data model shared by all modules. Pure types + small constant tables. */

export type Dir = 'up' | 'down' | 'left' | 'right';

// ---------------------------------------------------------------------------
// Types, stats, status
// ---------------------------------------------------------------------------

export const TYPE_IDS = [
  'normal', 'fire', 'water', 'plant', 'spark', 'earth', 'wind', 'frost', 'toxic', 'spirit', 'metal', 'light',
] as const;
export type TypeId = (typeof TYPE_IDS)[number];

export const TYPE_NAMES: Record<TypeId, string> = {
  normal: 'Normal', fire: 'Feuer', water: 'Wasser', plant: 'Pflanze', spark: 'Blitz', earth: 'Erde',
  wind: 'Wind', frost: 'Frost', toxic: 'Gift', spirit: 'Geist', metal: 'Metall', light: 'Licht',
};

/** Badge colors for type labels in UI. */
export const TYPE_COLORS: Record<TypeId, string> = {
  normal: '#a8a090', fire: '#e86030', water: '#3890e0', plant: '#58b048', spark: '#e8c020', earth: '#b08040',
  wind: '#88c8e0', frost: '#90d8e8', toxic: '#a050b0', spirit: '#6858a0', metal: '#8898a8', light: '#f0d878',
};

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
}
export type StatId = keyof Stats;

export const STAT_LABELS: Record<StatId, string> = { hp: 'LP', atk: 'ANG', def: 'VER', mag: 'MAG', res: 'RES', spd: 'TEM' };

/** Stats that can be raised/lowered in battle (stages -6..+6). 'acc' = accuracy. */
export type BattleStat = 'atk' | 'def' | 'mag' | 'res' | 'spd' | 'acc';
export const BATTLE_STAT_NAMES: Record<BattleStat, string> = {
  atk: 'Angriff', def: 'Verteidigung', mag: 'Magie', res: 'Resistenz', spd: 'Tempo', acc: 'Genauigkeit',
};

export type StatusId = 'burn' | 'poison' | 'paralysis' | 'sleep';
export const STATUS_NAMES: Record<StatusId, string> = { burn: 'Brand', poison: 'Gift', paralysis: 'Paralyse', sleep: 'Schlaf' };
/** 3-letter labels for HUDs. */
export const STATUS_SHORT: Record<StatusId, string> = { burn: 'BRA', poison: 'GIF', paralysis: 'PAR', sleep: 'SLF' };

export type Growth = 'fast' | 'medium' | 'slow';

// ---------------------------------------------------------------------------
// Static game data (src/data)
// ---------------------------------------------------------------------------

export type MoveCategory = 'physical' | 'special' | 'status';

export type MoveEffect =
  /** Inflict status on the target (foe) with chance 0..100. */
  | { kind: 'status'; status: StatusId; chance: number }
  /** Change a stat stage of 'self' or 'foe' with chance 0..100. */
  | { kind: 'stat'; who: 'self' | 'foe'; stat: BattleStat; stages: number; chance: number }
  /** Heal the user by fraction of max HP. */
  | { kind: 'heal'; fraction: number }
  /** Heal the user by fraction of damage dealt. */
  | { kind: 'drain'; fraction: number }
  /** User takes fraction of damage dealt. */
  | { kind: 'recoil'; fraction: number }
  /** Target flinches (skips its move this turn if it hasn't moved yet), chance 0..100. */
  | { kind: 'flinch'; chance: number };

export interface MoveDef {
  id: string;
  /** German display name, max 12 characters. */
  name: string;
  type: TypeId;
  category: MoveCategory;
  /** 0 for status moves. */
  power: number;
  /** 1..100; 0 means "never misses". */
  accuracy: number;
  pp: number;
  /** Default 0. Higher goes first. */
  priority?: number;
  highCrit?: boolean;
  /** Hits between min and max times (inclusive). */
  multiHit?: [number, number];
  effects?: MoveEffect[];
  /** German one-line description (max ~60 chars) for the summary screen. */
  desc: string;
}

export interface LearnsetEntry {
  level: number;
  move: string;
}

export interface SpeciesDef {
  id: string;
  /** German display name, max 10 characters. */
  name: string;
  dexNo: number;
  types: readonly [TypeId] | readonly [TypeId, TypeId];
  base: Stats;
  /** Experience yield base (40..300). */
  baseExp: number;
  /** 3..255; higher is easier to catch. */
  catchRate: number;
  growth: Growth;
  /** Sorted by level. Level 1 entries are starting moves. */
  learnset: readonly LearnsetEntry[];
  evolves?: { to: string; level: number };
  dex: {
    /** e.g. "Funken-Wildling" */
    category: string;
    heightM: number;
    weightKg: number;
    /** German, 2–3 sentences, max ~140 chars. */
    text: string;
  };
}

export type ItemPocket = 'items' | 'crystals' | 'key';

export type ItemUse =
  | { kind: 'heal'; hp: number | 'full' }
  | { kind: 'cure'; status: StatusId | 'all' }
  | { kind: 'restore' } // full HP + cure status
  | { kind: 'revive'; fraction: number }
  | { kind: 'pp'; amount: number | 'full' } // restores EN of all moves
  | { kind: 'crystal'; rate: number } // capture multiplier (1, 1.5, 2, 255 = always)
  | { kind: 'repel'; steps: number }
  | { kind: 'candy' } // +1 level
  | { kind: 'none' };

export interface ItemDef {
  id: string;
  /** German, max 14 characters. */
  name: string;
  pocket: ItemPocket;
  /** Buy price in Fr.; sell price is half. 0 = cannot be sold/bought. */
  price: number;
  desc: string;
  use: ItemUse;
  /** Where the item can be used from the bag. */
  usable: 'field' | 'battle' | 'both' | 'never';
}

export interface TrainerMon {
  species: string;
  level: number;
  /** Optional explicit moves; default = last 4 learnset moves at that level. */
  moves?: string[];
}

export interface TrainerDef {
  id: string;
  /** Class label shown before the name, e.g. "Wanderer", "Hüterin", "Frostmantel". */
  className: string;
  name: string;
  sprite: CharSpriteId;
  party: TrainerMon[];
  /** Prize money in Fr. */
  reward: number;
  /** Said in the overworld before battle. */
  intro: string;
  /** Shown in battle when defeated. */
  defeat: string;
  /** Said in the overworld when talked to after being defeated. */
  after: string;
  ai: 'basic' | 'smart';
  music?: MusicId;
  /** Healing items the trainer may use once each when its creature is low (any AI). */
  items?: string[];
}

// ---------------------------------------------------------------------------
// Runtime state (saved)
// ---------------------------------------------------------------------------

export interface MoveSlot {
  id: string;
  pp: number;
}

export interface Creature {
  uid: number;
  species: string;
  nickname: string | null;
  level: number;
  /** Total experience points. */
  exp: number;
  /** Current HP. 0 = fainted. */
  hp: number;
  status: StatusId | null;
  /** Remaining sleep turns while status === 'sleep'. */
  statusTurns: number;
  /** Individual values 0..15 per stat. */
  ivs: Stats;
  moves: MoveSlot[];
  /** Map display name where it was obtained. */
  metAt: string;
  metLevel: number;
}

export interface Position {
  mapId: string;
  x: number;
  y: number;
  facing: Dir;
}

export interface Options {
  textSpeed: 'slow' | 'normal' | 'fast';
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  battleAnims: boolean;
}

export interface SaveData {
  version: 1;
  playerName: string;
  rivalName: string;
  /** Selected starter species id ('' before choosing). */
  starter: string;
  player: Position;
  /** Where the player respawns after losing (set when healing at a Heilstation / at home). */
  lastHeal: Position;
  money: number;
  playFrames: number;
  party: Creature[];
  box: Creature[];
  /** itemId → quantity (> 0). */
  bag: Record<string, number>;
  dexSeen: string[];
  dexCaught: string[];
  badges: string[];
  flags: Record<string, boolean>;
  vars: Record<string, number>;
  repelSteps: number;
  nextUid: number;
  options: Options;
}

// ---------------------------------------------------------------------------
// Audio ids
// ---------------------------------------------------------------------------

export const MUSIC_IDS = [
  'title', 'intro', 'home', 'town', 'city', 'route', 'route_mountain', 'forest', 'cave', 'lab', 'center', 'hall',
  'villain', 'rival', 'battle_wild', 'battle_trainer', 'battle_leader', 'battle_rival', 'battle_boss',
  'battle_legend', 'victory_wild', 'victory_trainer', 'victory_leader', 'summit', 'credits', 'evolution',
] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

export const JINGLE_IDS = ['heal', 'level_up', 'caught', 'badge', 'item', 'evolved', 'fanfare'] as const;
export type JingleId = (typeof JINGLE_IDS)[number];

export const SFX_IDS = [
  'cursor', 'confirm', 'cancel', 'bump', 'door', 'stairs', 'save', 'menu_open', 'exclaim', 'encounter', 'hit',
  'hit_super', 'hit_weak', 'miss', 'faint', 'throw', 'shake', 'catch_fail', 'run', 'exp_fill', 'stat_up',
  'stat_down', 'status', 'heal_hp', 'buy', 'ledge', 'text', 'grass',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

// ---------------------------------------------------------------------------
// Art ids
// ---------------------------------------------------------------------------

export const CHAR_SPRITE_IDS = [
  'player', 'rival', 'prof', 'mom', 'nurse', 'clerk', 'boy', 'girl', 'man', 'woman', 'oldman', 'oldwoman', 'kid',
  'hiker', 'fisher', 'scientist', 'ranger', 'guard', 'grunt', 'boss', 'leader_earth', 'leader_water',
  'leader_spark', 'leader_frost',
  // static objects (same frame for every direction)
  'item_ball', 'crystal', 'legend', 'boulder',
] as const;
export type CharSpriteId = (typeof CHAR_SPRITE_IDS)[number];

export const BUILDING_STYLES = ['house_red', 'house_blue', 'house_green', 'heal', 'shop', 'lab', 'hall'] as const;
export type BuildingStyle = (typeof BUILDING_STYLES)[number];

export const BATTLE_BGS = ['grass', 'forest', 'cave', 'water', 'indoor', 'hall', 'snow', 'summit'] as const;
export type BattleBg = (typeof BATTLE_BGS)[number];

export type BattleOutcome = 'win' | 'lose' | 'run' | 'caught';
