/** Pure helpers for creature instances. No DOM, no game context. */
import type { Rng } from '../core/rng';
import type { Creature, Growth, ItemDef, MoveSlot, Stats, StatusId } from '../core/types';
import { STATUS_NAMES } from '../core/types';
import { getMove, getSpecies } from '../data';

export const MAX_LEVEL = 100;

/** hp = (2B+IV)·L/100 + L + 10; others = (2B+IV)·L/100 + 5. */
export function calcStats(c: Pick<Creature, 'species' | 'level' | 'ivs'>): Stats {
  const base = getSpecies(c.species).base;
  const stat = (b: number, iv: number) => Math.floor(((2 * b + iv) * c.level) / 100);
  return {
    hp: stat(base.hp, c.ivs.hp) + c.level + 10,
    atk: stat(base.atk, c.ivs.atk) + 5,
    def: stat(base.def, c.ivs.def) + 5,
    mag: stat(base.mag, c.ivs.mag) + 5,
    res: stat(base.res, c.ivs.res) + 5,
    spd: stat(base.spd, c.ivs.spd) + 5,
  };
}

export function maxHp(c: Creature): number {
  return calcStats(c).hp;
}

/** Total exp needed to be at `level`. */
export function expForLevel(growth: Growth, level: number): number {
  if (level <= 1) return 0;
  const cube = level ** 3;
  if (growth === 'fast') return Math.floor((cube * 4) / 5);
  if (growth === 'slow') return Math.floor((cube * 5) / 4);
  return cube;
}

export function levelForExp(growth: Growth, exp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && expForLevel(growth, level + 1) <= exp) level++;
  return level;
}

/** Progress 0..1 towards the next level (for EXP bars). */
export function expProgress(c: Creature): number {
  const growth = getSpecies(c.species).growth;
  if (c.level >= MAX_LEVEL) return 1;
  const lo = expForLevel(growth, c.level);
  const hi = expForLevel(growth, c.level + 1);
  return Math.max(0, Math.min(1, (c.exp - lo) / (hi - lo)));
}

/** The up-to-4 most recent distinct moves learnable at or below `level`. */
export function defaultMoves(speciesId: string, level: number): string[] {
  const moves: string[] = [];
  for (const e of getSpecies(speciesId).learnset) {
    if (e.level > level) break;
    const i = moves.indexOf(e.move);
    if (i >= 0) moves.splice(i, 1);
    moves.push(e.move);
  }
  return moves.slice(-4);
}

/** Moves the species learns exactly at `level`. */
export function movesLearnedAt(speciesId: string, level: number): string[] {
  return getSpecies(speciesId)
    .learnset.filter((e) => e.level === level)
    .map((e) => e.move);
}

export function moveSlot(moveId: string): MoveSlot {
  return { id: moveId, pp: getMove(moveId).pp };
}

export interface CreateOpts {
  moves?: readonly string[];
  nickname?: string | null;
  metAt?: string;
  uid?: number;
}

export function createCreature(speciesId: string, level: number, rng: Rng, opts: CreateOpts = {}): Creature {
  const species = getSpecies(speciesId);
  const ivs: Stats = {
    hp: rng.int(0, 15), atk: rng.int(0, 15), def: rng.int(0, 15),
    mag: rng.int(0, 15), res: rng.int(0, 15), spd: rng.int(0, 15),
  };
  const c: Creature = {
    uid: opts.uid ?? rng.int(1, 2 ** 31 - 1),
    species: speciesId,
    nickname: opts.nickname ?? null,
    level,
    exp: expForLevel(species.growth, level),
    hp: 1,
    status: null,
    statusTurns: 0,
    ivs,
    moves: (opts.moves ?? defaultMoves(speciesId, level)).map(moveSlot),
    metAt: opts.metAt ?? '',
    metLevel: level,
  };
  c.hp = maxHp(c);
  return c;
}

export function displayName(c: Creature): string {
  return c.nickname ?? getSpecies(c.species).name;
}

export function isFainted(c: Creature): boolean {
  return c.hp <= 0;
}

export function healCreature(c: Creature): void {
  c.hp = maxHp(c);
  c.status = null;
  c.statusTurns = 0;
  for (const m of c.moves) m.pp = getMove(m.id).pp;
}

/** Species this creature should evolve into now, if any. */
export function evolutionTarget(c: Creature): string | null {
  const evo = getSpecies(c.species).evolves;
  return evo && c.level >= evo.level ? evo.to : null;
}

/** Changes species in place; HP grows by the max-HP difference. */
export function evolve(c: Creature, to: string): void {
  const before = maxHp(c);
  c.species = to;
  c.hp = Math.max(1, c.hp + maxHp(c) - before);
}

/**
 * Sets level (and exp to the level minimum if exp is lower); HP grows by the max-HP difference.
 * Returns stats before/after for level-up popups.
 */
export function setLevel(c: Creature, level: number): { before: Stats; after: Stats } {
  const before = calcStats(c);
  c.level = Math.min(MAX_LEVEL, level);
  c.exp = Math.max(c.exp, expForLevel(getSpecies(c.species).growth, c.level));
  const after = calcStats(c);
  if (c.hp > 0) c.hp += after.hp - before.hp;
  return { before, after };
}

/** Adds a move if there is a free slot. Returns false if already known or 4 moves known. */
export function tryAddMove(c: Creature, moveId: string): boolean {
  if (c.moves.some((m) => m.id === moveId) || c.moves.length >= 4) return false;
  c.moves.push(moveSlot(moveId));
  return true;
}

export function replaceMove(c: Creature, index: number, moveId: string): void {
  c.moves[index] = moveSlot(moveId);
}

export interface ItemResult {
  ok: boolean;
  /** German feedback, e.g. "Flammo wurde um 20 LP geheilt." or "Es hätte keine Wirkung." */
  text: string;
}

const NO_EFFECT: ItemResult = { ok: false, text: 'Es hätte keine Wirkung.' };

/**
 * Applies a field/battle consumable (heal, cure, restore, revive, pp, candy) to a creature.
 * Does not touch the bag. Crystals, repels and key items return ok=false.
 * 'candy' only raises the level; the caller handles new moves and evolution.
 */
export function useItemOn(c: Creature, item: ItemDef): ItemResult {
  const name = displayName(c);
  const max = maxHp(c);
  const use = item.use;
  const cures = (s: StatusId | 'all') => c.status !== null && (s === 'all' || s === c.status);
  switch (use.kind) {
    case 'heal': {
      if (c.hp <= 0 || c.hp >= max) return NO_EFFECT;
      const before = c.hp;
      c.hp = use.hp === 'full' ? max : Math.min(max, c.hp + use.hp);
      return { ok: true, text: `${name} wurde um ${c.hp - before} LP geheilt.` };
    }
    case 'cure': {
      if (c.hp <= 0 || !cures(use.status)) return NO_EFFECT;
      const status = c.status!;
      c.status = null;
      c.statusTurns = 0;
      return { ok: true, text: `${name} ist nicht mehr von ${STATUS_NAMES[status]} betroffen.` };
    }
    case 'restore': {
      if (c.hp <= 0 || (c.hp >= max && c.status === null)) return NO_EFFECT;
      c.hp = max;
      c.status = null;
      c.statusTurns = 0;
      return { ok: true, text: `${name} ist wieder topfit!` };
    }
    case 'revive': {
      if (c.hp > 0) return NO_EFFECT;
      c.hp = Math.max(1, Math.floor(max * use.fraction));
      c.status = null;
      c.statusTurns = 0;
      return { ok: true, text: `${name} ist wieder kampfbereit!` };
    }
    case 'pp': {
      const missing = c.moves.some((m) => m.pp < getMove(m.id).pp);
      if (!missing) return NO_EFFECT;
      for (const m of c.moves) {
        const cap = getMove(m.id).pp;
        m.pp = use.amount === 'full' ? cap : Math.min(cap, m.pp + use.amount);
      }
      return { ok: true, text: `Die EN von ${name} wurden aufgefüllt.` };
    }
    case 'candy': {
      if (c.level >= MAX_LEVEL || c.hp <= 0) return NO_EFFECT;
      setLevel(c, c.level + 1);
      return { ok: true, text: `${name} erreicht Level ${c.level}!` };
    }
    default:
      return NO_EFFECT;
  }
}
